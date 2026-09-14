import 'dotenv/config';
import express from 'express';
import pg from 'pg';
import { XMLParser } from 'fast-xml-parser';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3001);
const rssSources = {
  punch: {
    name: 'Punch Newspapers',
    feedUrl: 'https://rss.punchng.com/v1/category/latest_news',
    defaultCategory: 'News',
  },
  businessday: {
    name: 'BusinessDay Nigeria',
    feedUrl: 'https://businessday.ng/feed/',
    defaultCategory: 'Business',
  },
  thisday: {
    name: 'THISDAY',
    feedUrl: 'https://www.thisdaylive.com/feed',
    defaultCategory: 'News',
  },
  lindaikeji: {
    name: "Linda Ikeji's Blog",
    feedUrl: 'https://www.lindaikejisblog.com/feed',
    defaultCategory: 'Entertainment',
  },
};

if (!process.env.DB_PASSWORD) {
  console.warn('DB_PASSWORD is not set. Add it to your .env file before requesting /api/stories.');
}

if (!process.env.ADMIN_API_KEY) {
  console.warn('ADMIN_API_KEY is not set. Story publishing is disabled until it is added to .env.');
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'newsnigeria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function prepareDatabase() {
  await pool.query(`
    ALTER TABLE stories
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS is_breaking BOOLEAN NOT NULL DEFAULT FALSE
  `);
}

app.use(express.json());

app.get('/api/stories', async (_request, response) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, title, excerpt, category, source, source_url, image_url,
             story_type, status, is_featured, is_breaking, published_at
      FROM stories
      WHERE status = 'published'
      ORDER BY published_at DESC
    `);

    response.json(rows);
  } catch (error) {
    console.error('Unable to load published stories:', error);
    response.status(500).json({ error: 'Unable to load published stories.' });
  }
});

function hasValidAdminKey(request) {
  return Boolean(process.env.ADMIN_API_KEY) && request.get('x-admin-key') === process.env.ADMIN_API_KEY;
}

function requireAdmin(request, response) {
  if (!process.env.ADMIN_API_KEY) {
    response.status(503).json({ error: 'Admin access is not configured.' });
    return false;
  }
  if (!hasValidAdminKey(request)) {
    response.status(401).json({ error: 'Invalid admin key.' });
    return false;
  }
  return true;
}

function rssText(value) {
  if (Array.isArray(value)) return rssText(value[0]);
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (value && typeof value === 'object') return rssText(value['#text'] || value['__cdata'] || value['@_term'] || '');
  return '';
}

function rssLink(value) {
  const links = Array.isArray(value) ? value : [value];
  const preferredLink = links.find((link) => link?.['@_rel'] === 'alternate') || links[0];
  if (preferredLink && typeof preferredLink === 'object') return preferredLink['@_href'] || '';
  return rssText(preferredLink);
}

function cleanRssExcerpt(value, fallback) {
  return rssText(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s*read more\s*.*$/is, '')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
}

function rssImageUrl(item) {
  const enclosureUrl = item.enclosure?.['@_url'];
  if (enclosureUrl) return enclosureUrl;

  const imageMatch = rssText(item.description).match(/<img[^>]+src=["']([^"']+)["']/i);
  return imageMatch?.[1] || null;
}

app.post('/api/stories', async (request, response) => {
  if (!requireAdmin(request, response)) return;

  const {
    title,
    excerpt,
    category,
    source,
    source_url: sourceUrl,
    image_url: imageUrl,
    story_type: storyType = 'original',
    status = 'published',
    is_featured: isFeatured = false,
    is_breaking: isBreaking = false,
  } = request.body;

  if (!title?.trim() || !excerpt?.trim() || !category?.trim() || !source?.trim()) {
    return response.status(400).json({
      error: 'Title, excerpt, category, and source are required.',
    });
  }

  if (!['original', 'external'].includes(storyType) || !['draft', 'published'].includes(status)) {
    return response.status(400).json({ error: 'Invalid story type or status.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO stories
        (title, excerpt, category, source, source_url, image_url, story_type, status, is_featured, is_breaking, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       RETURNING id, title, excerpt, category, source, source_url, image_url,
                 story_type, status, is_featured, is_breaking, published_at`,
      [
        title.trim(),
        excerpt.trim(),
        category.trim(),
        source.trim(),
        sourceUrl?.trim() || null,
        imageUrl?.trim() || null,
        storyType,
        status,
        Boolean(isFeatured),
        Boolean(isBreaking),
      ],
    );

    response.status(201).json(rows[0]);
  } catch (error) {
    console.error('Unable to publish story:', error);
    response.status(500).json({ error: 'Unable to publish story.' });
  }
});

app.get('/api/admin/sources', (request, response) => {
  if (!requireAdmin(request, response)) return;
  response.json(Object.entries(rssSources).map(([id, source]) => ({ id, name: source.name })));
});

app.get('/api/admin/stories', async (request, response) => {
  if (!requireAdmin(request, response)) return;

  const status = request.query.status === 'published' ? 'published' : 'draft';
  try {
    const { rows } = await pool.query(
      `SELECT id, title, excerpt, category, source, source_url, image_url,
              story_type, status, is_featured, is_breaking, published_at
       FROM stories WHERE status = $1 ORDER BY published_at DESC`,
      [status],
    );
    response.json(rows);
  } catch (error) {
    console.error('Unable to load admin stories:', error);
    response.status(500).json({ error: 'Unable to load stories for review.' });
  }
});

app.patch('/api/stories/:id', async (request, response) => {
  if (!requireAdmin(request, response)) return;

  const storyId = Number(request.params.id);
  const { title, excerpt, category, source, source_url: sourceUrl, image_url: imageUrl, status, is_featured: isFeatured = false, is_breaking: isBreaking = false } = request.body;
  if (!Number.isInteger(storyId) || !title?.trim() || !excerpt?.trim() || !category?.trim() || !source?.trim()) {
    return response.status(400).json({ error: 'A complete story is required.' });
  }
  if (!['draft', 'published'].includes(status)) {
    return response.status(400).json({ error: 'Invalid story status.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE stories SET title = $1, excerpt = $2, category = $3, source = $4,
       source_url = $5, image_url = $6, status = $7, is_featured = $8, is_breaking = $9
       WHERE id = $10
       RETURNING id, title, excerpt, category, source, source_url, image_url, story_type, status, is_featured, is_breaking, published_at`,
      [title.trim(), excerpt.trim(), category.trim(), source.trim(), sourceUrl?.trim() || null, imageUrl?.trim() || null, status, Boolean(isFeatured), Boolean(isBreaking), storyId],
    );
    if (!rows[0]) return response.status(404).json({ error: 'Story not found.' });
    response.json(rows[0]);
  } catch (error) {
    console.error('Unable to update story:', error);
    response.status(500).json({ error: 'Unable to update story.' });
  }
});

app.delete('/api/stories/:id', async (request, response) => {
  if (!requireAdmin(request, response)) return;
  const storyId = Number(request.params.id);
  if (!Number.isInteger(storyId)) return response.status(400).json({ error: 'Invalid story.' });

  try {
    const result = await pool.query('DELETE FROM stories WHERE id = $1 AND status = $2', [storyId, 'draft']);
    if (!result.rowCount) return response.status(404).json({ error: 'Draft not found.' });
    response.status(204).end();
  } catch (error) {
    console.error('Unable to reject draft:', error);
    response.status(500).json({ error: 'Unable to reject draft.' });
  }
});

app.post('/api/imports/:sourceId', async (request, response) => {
  if (!requireAdmin(request, response)) return;
  const source = rssSources[request.params.sourceId];
  if (!source) return response.status(404).json({ error: 'Unknown RSS source.' });

  try {
    const feedResponse = await fetch(source.feedUrl, {
      headers: { 'User-Agent': 'NewsNigeria RSS importer' },
    });
    if (!feedResponse.ok) {
      throw new Error(`Punch RSS returned ${feedResponse.status}`);
    }

    const feedXml = await feedResponse.text();
    const parsedFeed = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      trimValues: true,
    }).parse(feedXml);
    const feedItems = parsedFeed?.rss?.channel?.item || parsedFeed?.feed?.entry || [];
    const items = Array.isArray(feedItems) ? feedItems : [feedItems];
    let imported = 0;
    let skipped = 0;

    for (const item of items.slice(0, 10)) {
      const sourceUrl = rssLink(item.link);
      const title = rssText(item.title);
      if (!sourceUrl || !title) {
        skipped += 1;
        continue;
      }

      const existingStory = await pool.query(
        'SELECT id FROM stories WHERE source_url = $1 LIMIT 1',
        [sourceUrl],
      );
      if (existingStory.rowCount) {
        skipped += 1;
        continue;
      }

      const excerpt = cleanRssExcerpt(item.description || item.summary || item.content, `Read the full story at ${source.name}.`);
      const publishedAt = new Date(item.pubDate || item.published || item.updated);

      await pool.query(
        `INSERT INTO stories
          (title, excerpt, category, source, source_url, image_url, story_type, status, is_featured, is_breaking, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'external', 'draft', FALSE, FALSE, $7)`,
        [
          title,
          excerpt,
          rssText(item.category) || source.defaultCategory,
          source.name,
          sourceUrl,
          rssImageUrl(item),
          Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
        ],
      );
      imported += 1;
    }

    response.json({ imported, skipped, source: source.name, status: 'draft' });
  } catch (error) {
    console.error(`Unable to import ${source.name} stories:`, error);
    response.status(502).json({ error: `Unable to import stories from ${source.name} right now.` });
  }
});

prepareDatabase()
  .then(() => app.listen(port, () => {
    console.log(`NewsNigeria API listening at http://localhost:${port}`);
  }))
  .catch((error) => {
    console.error('Unable to prepare NewsNigeria database:', error);
    process.exitCode = 1;
  });
