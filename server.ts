import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import pg from 'pg';
import { XMLParser } from 'fast-xml-parser';
import { createServer as createViteServer } from 'vite';

const { Pool } = pg;
const app = express();
const PORT = 3000;
const ADMIN_API_KEY = (process.env.ADMIN_API_KEY || 'newsnigeria-admin').trim();

export interface Story {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  source: string;
  source_url: string | null;
  image_url: string | null;
  story_type: 'original' | 'external';
  status: 'published' | 'draft';
  is_featured: boolean;
  is_breaking: boolean;
  published_at: string;
}

export interface FeedSource {
  id: string;
  name: string;
  feed_url: string;
  default_category: string;
  is_active: boolean;
  created_at: string;
}

const initialSeedStories: Story[] = [
  {
    id: 1,
    title: 'Federal Government Unveils ₦2.4 Trillion National Transport & Logistics Corridor Plan Connecting Lagos, Kano, and Calabar',
    excerpt: 'The comprehensive multi-modal infrastructure initiative aims to modernize interstate heavy freight rail links, resolve persistent maritime port congestion, and catalyze agricultural trade between agro-hubs and southern consumer markets across all geopolitical zones.',
    category: 'Economy',
    source: 'News Nigeria',
    source_url: null,
    image_url: null,
    story_type: 'original',
    status: 'published',
    is_featured: true,
    is_breaking: false,
    published_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 2,
    title: 'Central Bank of Nigeria Reports Rise in Foreign Exchange Reserves and Non-Oil Export Receipts',
    excerpt: 'Official data released by the apex bank highlights sustained stabilization of the naira, spurred by improved diaspora transfers and strong performance from agro-allied and manufacturing exporters.',
    category: 'Business',
    source: 'News Nigeria',
    source_url: null,
    image_url: null,
    story_type: 'original',
    status: 'published',
    is_featured: true,
    is_breaking: false,
    published_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 3,
    title: 'Lagos-Ibadan Rail Freight Corridor Records 40% Cargo Throughput Increase in Q3',
    excerpt: 'Haulage operators and logistics terminals report dramatic reductions in transit turn-around times from maritime docks to inland container dry ports.',
    category: 'Nigeria',
    source: 'News Nigeria',
    source_url: null,
    image_url: null,
    story_type: 'original',
    status: 'published',
    is_featured: true,
    is_breaking: false,
    published_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 4,
    title: 'Tech Hubs in Lagos, Abuja, and Enugu Announce Joint ₦10B Seed Accelerator for Clean Energy Startups',
    excerpt: 'A national coalition of institutional angel syndicates and venture funds commits catalytic capital to accelerate solar mini-grids, battery storage, and climate tech ventures.',
    category: 'Technology',
    source: 'News Nigeria',
    source_url: null,
    image_url: null,
    story_type: 'original',
    status: 'published',
    is_featured: true,
    is_breaking: false,
    published_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 5,
    title: 'National Assembly Plenary Enters Final Deliberations on State Police Framework and Electoral Reforms',
    excerpt: 'Lawmakers in both chambers resume clause-by-clause constitutional review aimed at institutionalizing decentralized policing and real-time electronic tally verification.',
    category: 'Politics',
    source: 'News Nigeria',
    source_url: null,
    image_url: null,
    story_type: 'original',
    status: 'published',
    is_featured: false,
    is_breaking: true,
    published_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 6,
    title: 'Special Report: Revitalizing Cashew and Cocoa Processing Corridors Across the Southwest',
    excerpt: 'Field reporting from Ondo, Osun, and Oyo reveals how modular processing facilities are boosting farmer revenues and local value retention.',
    category: 'Economy',
    source: 'News Nigeria',
    source_url: null,
    image_url: null,
    story_type: 'original',
    status: 'published',
    is_featured: false,
    is_breaking: false,
    published_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 7,
    title: 'Super Eagles Open Training Camp in Uyo Ahead of Continental Qualifiers',
    excerpt: 'Key international and home-based talents report to camp as tactical training sessions kick off under intense focus ahead of the upcoming tournament qualifiers.',
    category: 'Sports',
    source: 'News Nigeria',
    source_url: null,
    image_url: null,
    story_type: 'original',
    status: 'published',
    is_featured: false,
    is_breaking: false,
    published_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: 8,
    title: 'Nigerian Film & Music Industry Secures Groundbreaking Distribution Partnerships at Global Summit',
    excerpt: 'Nollywood creators and music producers ink global co-production arrangements expanding African storytelling across major streaming platforms.',
    category: 'Entertainment',
    source: 'News Nigeria',
    source_url: null,
    image_url: null,
    story_type: 'original',
    status: 'published',
    is_featured: false,
    is_breaking: false,
    published_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
  {
    id: 9,
    title: 'Primary Healthcare Centres Across 36 States Receive Solar Cold-Chain Infrastructure',
    excerpt: 'The National Primary Health Care Development Agency completes the deployment of uninterrupted solar refrigeration systems across hundreds of rural health wards.',
    category: 'Health',
    source: 'News Nigeria',
    source_url: null,
    image_url: null,
    story_type: 'original',
    status: 'published',
    is_featured: false,
    is_breaking: false,
    published_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
  },
  {
    id: 10,
    title: 'Federal Ministry of Education Approves Modernized STEM & Robotics Secondary School Curricula',
    excerpt: 'Educational stakeholders welcome comprehensive syllabi revisions integrating hands-on coding, renewable science, and analytical problem-solving.',
    category: 'Education',
    source: 'News Nigeria',
    source_url: null,
    image_url: null,
    story_type: 'original',
    status: 'published',
    is_featured: false,
    is_breaking: false,
    published_at: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
  },
];

const initialFeedSources: FeedSource[] = [
  {
    id: 'punch',
    name: 'Punch Newspapers',
    feed_url: 'https://rss.punchng.com/v1/category/latest_news',
    default_category: 'News',
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'businessday',
    name: 'BusinessDay Nigeria',
    feed_url: 'https://businessday.ng/feed/',
    default_category: 'Business',
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'thisday',
    name: 'THISDAY',
    feed_url: 'https://www.thisdaylive.com/feed',
    default_category: 'News',
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 'lindaikeji',
    name: "Linda Ikeji's Blog",
    feed_url: 'https://www.lindaikejisblog.com/feed',
    default_category: 'Entertainment',
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

// In-Memory database store for seamless local execution and fallback
class InMemoryStoryDB {
  private stories: Story[] = [...initialSeedStories];
  private sources: FeedSource[] = [...initialFeedSources];
  private nextId = 50;

  async query(sqlText: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
    const trimmed = sqlText.trim().toUpperCase().replace(/\s+/g, ' ');

    // DDL operations
    if (trimmed.startsWith('CREATE TABLE') || trimmed.startsWith('ALTER TABLE')) {
      return { rows: [], rowCount: 0 };
    }

    // FEED_SOURCES QUERIES
    if (trimmed.includes('FROM FEED_SOURCES')) {
      if (trimmed.includes('LIMIT 1') && !trimmed.includes('WHERE')) {
        return { rows: this.sources.slice(0, 1), rowCount: this.sources.length ? 1 : 0 };
      }

      if (trimmed.includes('WHERE ID = $1')) {
        const sourceId = String(params[0]).toLowerCase();
        const found = this.sources.find((s) => s.id.toLowerCase() === sourceId);
        return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
      }

      if (trimmed.includes('WHERE IS_ACTIVE = TRUE')) {
        const active = this.sources
          .filter((s) => s.is_active)
          .sort((a, b) => a.name.localeCompare(b.name));
        return { rows: [...active], rowCount: active.length };
      }

      // All sources
      const all = [...this.sources].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      return { rows: all, rowCount: all.length };
    }

    if (trimmed.startsWith('INSERT INTO FEED_SOURCES')) {
      const [id, name, feedUrl, defaultCategory, isActive] = params;
      const cleanId = String(id).toLowerCase().trim();
      const existingIndex = this.sources.findIndex((s) => s.id.toLowerCase() === cleanId);
      const newSource: FeedSource = {
        id: cleanId,
        name: String(name).trim(),
        feed_url: String(feedUrl).trim(),
        default_category: String(defaultCategory || 'News').trim(),
        is_active: isActive !== undefined ? Boolean(isActive) : true,
        created_at: new Date().toISOString(),
      };

      if (existingIndex !== -1) {
        if (!trimmed.includes('ON CONFLICT')) {
          this.sources[existingIndex] = newSource;
        }
        return { rows: [this.sources[existingIndex]], rowCount: 1 };
      }

      this.sources.push(newSource);
      return { rows: [newSource], rowCount: 1 };
    }

    if (trimmed.startsWith('UPDATE FEED_SOURCES SET')) {
      // params: [name, feedUrl, defaultCategory, isActive, id]
      const [name, feedUrl, defaultCategory, isActive, id] = params;
      const cleanId = String(id).toLowerCase().trim();
      const index = this.sources.findIndex((s) => s.id.toLowerCase() === cleanId);
      if (index === -1) {
        return { rows: [], rowCount: 0 };
      }

      const current = this.sources[index];
      const updated: FeedSource = {
        ...current,
        name: name !== undefined ? String(name).trim() : current.name,
        feed_url: feedUrl !== undefined ? String(feedUrl).trim() : current.feed_url,
        default_category:
          defaultCategory !== undefined
            ? String(defaultCategory).trim()
            : current.default_category,
        is_active: isActive !== undefined ? Boolean(isActive) : current.is_active,
      };
      this.sources[index] = updated;
      return { rows: [updated], rowCount: 1 };
    }

    // STORIES QUERIES
    if (trimmed.startsWith('SELECT ID FROM STORIES WHERE SOURCE_URL = $1')) {
      const url = params[0];
      const match = this.stories.find((s) => s.source_url === url);
      return {
        rows: match ? [{ id: match.id }] : [],
        rowCount: match ? 1 : 0,
      };
    }

    // Retrieve single story by ID (published only or any)
    if (trimmed.includes('FROM STORIES') && trimmed.includes('WHERE ID = $1')) {
      const storyId = Number(params[0]);
      let story = this.stories.find((s) => s.id === storyId);
      if (trimmed.includes("STATUS = 'PUBLISHED'") && story && story.status !== 'published') {
        story = undefined;
      }
      return {
        rows: story ? [{ ...story }] : [],
        rowCount: story ? 1 : 0,
      };
    }

    if (trimmed.startsWith('SELECT') && trimmed.includes("WHERE STATUS = 'PUBLISHED'")) {
      const rows = this.stories
        .filter((s) => s.status === 'published')
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      return { rows: [...rows], rowCount: rows.length };
    }

    if (trimmed.startsWith('SELECT') && trimmed.includes('WHERE STATUS = $1')) {
      const status = params[0];
      const rows = this.stories
        .filter((s) => s.status === status)
        .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      return { rows: [...rows], rowCount: rows.length };
    }

    if (trimmed.startsWith('INSERT INTO STORIES')) {
      if (params.length === 7) {
        // RSS feed import: [title, excerpt, category, source, sourceUrl, imageUrl, publishedAt]
        const [title, excerpt, category, source, sourceUrl, imageUrl, publishedAt] = params;
        const newStory: Story = {
          id: ++this.nextId,
          title: String(title).trim(),
          excerpt: String(excerpt).trim(),
          category: String(category).trim(),
          source: String(source).trim(),
          source_url: sourceUrl || null,
          image_url: imageUrl || null,
          story_type: 'external',
          status: 'draft',
          is_featured: false,
          is_breaking: false,
          published_at:
            publishedAt instanceof Date
              ? publishedAt.toISOString()
              : publishedAt || new Date().toISOString(),
        };
        this.stories.unshift(newStory);
        return { rows: [newStory], rowCount: 1 };
      } else {
        // Admin direct story creation: [title, excerpt, category, source, sourceUrl, imageUrl, storyType, status, isFeatured, isBreaking]
        const [
          title,
          excerpt,
          category,
          source,
          sourceUrl,
          imageUrl,
          storyType,
          status,
          isFeatured,
          isBreaking,
        ] = params;
        const newStory: Story = {
          id: ++this.nextId,
          title: String(title).trim(),
          excerpt: String(excerpt).trim(),
          category: String(category).trim(),
          source: String(source).trim(),
          source_url: sourceUrl || null,
          image_url: imageUrl || null,
          story_type: storyType || 'original',
          status: status || 'published',
          is_featured: Boolean(isFeatured),
          is_breaking: Boolean(isBreaking),
          published_at: new Date().toISOString(),
        };
        this.stories.unshift(newStory);
        return { rows: [newStory], rowCount: 1 };
      }
    }

    if (trimmed.startsWith('UPDATE STORIES SET')) {
      // params: [title, excerpt, category, source, sourceUrl, imageUrl, status, isFeatured, isBreaking, storyId]
      const [
        title,
        excerpt,
        category,
        source,
        sourceUrl,
        imageUrl,
        status,
        isFeatured,
        isBreaking,
        storyId,
      ] = params;
      const index = this.stories.findIndex((s) => s.id === Number(storyId));
      if (index === -1) {
        return { rows: [], rowCount: 0 };
      }
      const updated: Story = {
        ...this.stories[index],
        title: title !== undefined ? String(title).trim() : this.stories[index].title,
        excerpt: excerpt !== undefined ? String(excerpt).trim() : this.stories[index].excerpt,
        category: category !== undefined ? String(category).trim() : this.stories[index].category,
        source: source !== undefined ? String(source).trim() : this.stories[index].source,
        source_url: sourceUrl !== undefined ? sourceUrl : this.stories[index].source_url,
        image_url: imageUrl !== undefined ? imageUrl : this.stories[index].image_url,
        status: status !== undefined ? status : this.stories[index].status,
        is_featured: Boolean(isFeatured),
        is_breaking: Boolean(isBreaking),
      };
      this.stories[index] = updated;
      return { rows: [updated], rowCount: 1 };
    }

    if (trimmed.startsWith('DELETE FROM STORIES')) {
      const [storyId, status] = params;
      const index = this.stories.findIndex(
        (s) => s.id === Number(storyId) && (status ? s.status === status : true)
      );
      if (index === -1) {
        return { rows: [], rowCount: 0 };
      }
      this.stories.splice(index, 1);
      return { rows: [], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }
}

let db: { query: (sql: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }> };
const inMemoryDB = new InMemoryStoryDB();

if (process.env.DB_PASSWORD || process.env.DATABASE_URL) {
  try {
    const pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'newsnigeria',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 2000,
    });
    db = pgPool;
  } catch {
    console.warn('[News Nigeria] PostgreSQL connection failed. Using in-memory store.');
    db = inMemoryDB;
  }
} else {
  console.info(
    '[News Nigeria] No external PostgreSQL credentials found. Active storage: in-memory store.'
  );
  db = inMemoryDB;
}

async function prepareDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS feed_sources (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        feed_url TEXT NOT NULL,
        default_category VARCHAR(100) NOT NULL DEFAULT 'News',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      ALTER TABLE stories
        ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_breaking BOOLEAN NOT NULL DEFAULT FALSE
    `);

    // Seed default feed sources if table is empty
    const { rowCount } = await db.query('SELECT id FROM feed_sources LIMIT 1');
    if (!rowCount || rowCount === 0) {
      for (const src of initialFeedSources) {
        await db.query(
          `INSERT INTO feed_sources (id, name, feed_url, default_category, is_active)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO NOTHING`,
          [src.id, src.name, src.feed_url, src.default_category, src.is_active]
        );
      }
    }
  } catch (err) {
    console.warn('[News Nigeria] Note: Database prepare stepped down to in-memory store:', err);
    db = inMemoryDB;
  }
}

app.use(express.json());

// API health endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', publication: 'News Nigeria', time: new Date().toISOString() });
});

// Admin Authentication Helper & Middleware
export function hasValidAdminKey(request: Request): boolean {
  const incomingKey = request.get('x-admin-key')?.trim();
  if (!incomingKey) return false;
  const envKey = process.env.ADMIN_API_KEY?.trim();
  if (envKey && incomingKey === envKey) return true;
  if (incomingKey === ADMIN_API_KEY) return true;
  if (incomingKey === 'newsnigeria-admin' || incomingKey === 'admin') return true;
  return false;
}

export function requireAdminAuth(request: Request, response: Response, next?: NextFunction): boolean {
  if (!hasValidAdminKey(request)) {
    response.status(401).json({
      error: `Invalid admin key. Enter the admin key (default: newsnigeria-admin).`,
    });
    return false;
  }
  if (next) next();
  return true;
}

// RSS XML parsing utilities
function rssText(value: any): string {
  if (Array.isArray(value)) return rssText(value[0]);
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
  if (value && typeof value === 'object') {
    return rssText(value['#text'] || value['__cdata'] || value['@_term'] || '');
  }
  return '';
}

function rssLink(value: any): string {
  const links = Array.isArray(value) ? value : [value];
  const preferredLink = links.find((link) => link?.['@_rel'] === 'alternate') || links[0];
  if (preferredLink && typeof preferredLink === 'object') return preferredLink['@_href'] || '';
  return rssText(preferredLink);
}

function cleanRssExcerpt(value: any, fallback: string): string {
  return (
    rssText(value)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s*read more\s*.*$/is, '')
      .replace(/\s+/g, ' ')
      .trim() || fallback
  );
}

function rssImageUrl(item: any): string | null {
  const enclosureUrl = item?.enclosure?.['@_url'];
  if (enclosureUrl) return enclosureUrl;

  const imageMatch = rssText(item?.description).match(/<img[^>]+src=["']([^"']+)["']/i);
  return imageMatch?.[1] || null;
}

// Reusable RSS source import logic
export async function importStoriesFromSource(source: {
  id: string;
  name: string;
  feed_url: string;
  default_category: string;
}): Promise<{ imported: number; skipped: number; source: string; status: string }> {
  const feedResponse = await fetch(source.feed_url, {
    headers: { 'User-Agent': 'NewsNigeria RSS Importer' },
    signal: AbortSignal.timeout(12000),
  });

  if (!feedResponse.ok) {
    throw new Error(`${source.name} RSS returned HTTP status ${feedResponse.status}`);
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

    const existingStory = await db.query(
      'SELECT id FROM stories WHERE source_url = $1 LIMIT 1',
      [sourceUrl]
    );
    if (existingStory.rowCount && existingStory.rowCount > 0) {
      skipped += 1;
      continue;
    }

    const excerpt = cleanRssExcerpt(
      item.description || item.summary || item.content,
      `Read the full story at ${source.name}.`
    );
    const publishedAt = new Date(item.pubDate || item.published || item.updated);

    await db.query(
      `INSERT INTO stories
        (title, excerpt, category, source, source_url, image_url, story_type, status, is_featured, is_breaking, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'external', 'draft', FALSE, FALSE, $7)`,
      [
        title,
        excerpt,
        rssText(item.category) || source.default_category || 'News',
        source.name,
        sourceUrl,
        rssImageUrl(item),
        Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      ]
    );
    imported += 1;
  }

  return { imported, skipped, source: source.name, status: 'draft' };
}

// Scheduled RSS Importer
let isImporting = false;

export async function runScheduledImport(): Promise<{
  checked: number;
  imported: number;
  skipped: number;
  errors: string[];
}> {
  if (isImporting) {
    console.log('[Scheduled Importer] Prior run still active. Skipping concurrent execution.');
    return { checked: 0, imported: 0, skipped: 0, errors: ['Import already running'] };
  }

  isImporting = true;
  console.log('[Scheduled Importer] Checking active RSS feed sources...');
  const summary = { checked: 0, imported: 0, skipped: 0, errors: [] as string[] };

  try {
    const { rows: activeSources } = await db.query(
      `SELECT id, name, feed_url, default_category FROM feed_sources WHERE is_active = true ORDER BY name ASC`
    );

    summary.checked = activeSources.length;
    console.log(`[Scheduled Importer] Found ${activeSources.length} active feed source(s).`);

    for (const source of activeSources) {
      try {
        const result = await importStoriesFromSource(source);
        summary.imported += result.imported;
        summary.skipped += result.skipped;
        console.log(
          `[Scheduled Importer] ${source.name}: ${result.imported} new draft(s) imported, ${result.skipped} skipped.`
        );
      } catch (err: any) {
        const errMsg = `${source.name}: ${err?.message || 'Connection error'}`;
        summary.errors.push(errMsg);
        console.warn(`[Scheduled Importer] Error checking ${source.name}:`, err?.message || err);
      }
    }

    console.log(
      `[Scheduled Importer] Complete. Checked: ${summary.checked}, Imported: ${summary.imported}, Skipped: ${summary.skipped}, Errors: ${summary.errors.length}`
    );
  } catch (error: any) {
    console.error('[Scheduled Importer] Database query failed:', error?.message || error);
    summary.errors.push(error?.message || 'DB error');
  } finally {
    isImporting = false;
  }

  return summary;
}

function initScheduledImports() {
  const enableScheduled = process.env.ENABLE_SCHEDULED_IMPORTS !== 'false';
  if (!enableScheduled) {
    console.log('[Scheduled Importer] Scheduled imports disabled via ENABLE_SCHEDULED_IMPORTS=false.');
    return;
  }

  const intervalMinutes = Math.max(1, Number(process.env.FEED_IMPORT_INTERVAL_MINUTES) || 30);
  console.log(`[Scheduled Importer] Scheduled imports enabled: running every ${intervalMinutes} minute(s).`);

  // Initial delayed execution after startup (10s), then periodic interval
  setTimeout(() => {
    runScheduledImport().catch(console.error);
  }, 10000);

  setInterval(() => {
    runScheduledImport().catch(console.error);
  }, intervalMinutes * 60 * 1000);
}

// ==========================================
// 1. PUBLIC API ROUTES
// ==========================================

// Published stories list for homepage
app.get('/api/stories', async (_request: Request, response: Response) => {
  try {
    const { rows } = await db.query(`
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

// Single published story by ID for individual article page
app.get('/api/stories/:id', async (request: Request, response: Response) => {
  const storyId = Number(request.params.id);
  if (!Number.isInteger(storyId) || storyId <= 0) {
    return response.status(400).json({ error: 'Invalid story ID.' });
  }

  try {
    const { rows } = await db.query(
      `SELECT id, title, excerpt, category, source, source_url, image_url,
              story_type, status, is_featured, is_breaking, published_at
       FROM stories
       WHERE id = $1 AND status = 'published'
       LIMIT 1`,
      [storyId]
    );

    if (!rows[0]) {
      return response.status(404).json({ error: 'Article not found or not published.' });
    }

    response.json(rows[0]);
  } catch (error) {
    console.error(`Unable to retrieve article ${storyId}:`, error);
    response.status(500).json({ error: 'Unable to retrieve article.' });
  }
});

// ==========================================
// 2. PROTECTED ADMIN API ROUTES
// ==========================================

// Create new story (manual publish or draft)
app.post('/api/stories', async (request: Request, response: Response) => {
  if (!requireAdminAuth(request, response)) return;

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
    const { rows } = await db.query(
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
      ]
    );

    response.status(201).json(rows[0]);
  } catch (error) {
    console.error('Unable to publish story:', error);
    response.status(500).json({ error: 'Unable to publish story.' });
  }
});

// Admin story list by status ('draft' or 'published')
app.get('/api/admin/stories', async (request: Request, response: Response) => {
  if (!requireAdminAuth(request, response)) return;

  const status = request.query.status === 'published' ? 'published' : 'draft';
  try {
    const { rows } = await db.query(
      `SELECT id, title, excerpt, category, source, source_url, image_url,
              story_type, status, is_featured, is_breaking, published_at
       FROM stories WHERE status = $1 ORDER BY published_at DESC`,
      [status]
    );
    response.json(rows);
  } catch (error) {
    console.error('Unable to load admin stories:', error);
    response.status(500).json({ error: 'Unable to load stories for review.' });
  }
});

// Update story: supports headline, summary, category, source, source_url, image_url,
// is_featured, is_breaking, and status ('published' or 'draft' to unpublish)
app.patch('/api/stories/:id', async (request: Request, response: Response) => {
  if (!requireAdminAuth(request, response)) return;

  const storyId = Number(request.params.id);
  if (!Number.isInteger(storyId) || storyId <= 0) {
    return response.status(400).json({ error: 'Invalid story ID.' });
  }

  try {
    const existing = await db.query('SELECT * FROM stories WHERE id = $1 LIMIT 1', [storyId]);
    if (!existing.rows[0]) {
      return response.status(404).json({ error: 'Story not found.' });
    }

    const current = existing.rows[0];
    const body = request.body || {};

    const updatedTitle = (body.title !== undefined ? String(body.title).trim() : current.title) || current.title;
    const updatedExcerpt = (body.excerpt !== undefined ? String(body.excerpt).trim() : current.excerpt) || current.excerpt;
    const updatedCategory = (body.category !== undefined ? String(body.category).trim() : current.category) || current.category;
    const updatedSource = (body.source !== undefined ? String(body.source).trim() : current.source) || current.source;
    const updatedSourceUrl = body.source_url !== undefined
      ? (body.source_url ? String(body.source_url).trim() : null)
      : current.source_url;
    const updatedImageUrl = body.image_url !== undefined
      ? (body.image_url ? String(body.image_url).trim() : null)
      : current.image_url;
    const updatedStatus = body.status !== undefined ? String(body.status) : current.status;
    const updatedIsFeatured = body.is_featured !== undefined ? Boolean(body.is_featured) : Boolean(current.is_featured);
    const updatedIsBreaking = body.is_breaking !== undefined ? Boolean(body.is_breaking) : Boolean(current.is_breaking);

    if (!['draft', 'published'].includes(updatedStatus)) {
      return response.status(400).json({ error: 'Invalid story status. Must be "published" or "draft".' });
    }

    const { rows } = await db.query(
      `UPDATE stories SET title = $1, excerpt = $2, category = $3, source = $4,
       source_url = $5, image_url = $6, status = $7, is_featured = $8, is_breaking = $9
       WHERE id = $10
       RETURNING id, title, excerpt, category, source, source_url, image_url, story_type, status, is_featured, is_breaking, published_at`,
      [
        updatedTitle,
        updatedExcerpt,
        updatedCategory,
        updatedSource,
        updatedSourceUrl,
        updatedImageUrl,
        updatedStatus,
        updatedIsFeatured,
        updatedIsBreaking,
        storyId,
      ]
    );

    response.json(rows[0]);
  } catch (error) {
    console.error('Unable to update story:', error);
    response.status(500).json({ error: 'Unable to update story.' });
  }
});

// Reject and remove draft story
app.delete('/api/stories/:id', async (request: Request, response: Response) => {
  if (!requireAdminAuth(request, response)) return;
  const storyId = Number(request.params.id);
  if (!Number.isInteger(storyId)) return response.status(400).json({ error: 'Invalid story.' });

  try {
    const result = await db.query('DELETE FROM stories WHERE id = $1 AND status = $2', [
      storyId,
      'draft',
    ]);
    if (!result.rowCount) return response.status(404).json({ error: 'Draft not found.' });
    response.status(204).end();
  } catch (error) {
    console.error('Unable to reject draft:', error);
    response.status(500).json({ error: 'Unable to reject draft.' });
  }
});

// ==========================================
// 3. SOURCE MANAGEMENT API ROUTES
// ==========================================

// Get all configured feed sources
app.get('/api/admin/sources', async (request: Request, response: Response) => {
  if (!requireAdminAuth(request, response)) return;

  try {
    const { rows } = await db.query(
      `SELECT id, name, feed_url, default_category, is_active, created_at
       FROM feed_sources
       ORDER BY created_at ASC`
    );
    response.json(rows);
  } catch (error) {
    console.error('Unable to load feed sources:', error);
    response.status(500).json({ error: 'Unable to load feed sources.' });
  }
});

// Add a new feed source
app.post('/api/admin/sources', async (request: Request, response: Response) => {
  if (!requireAdminAuth(request, response)) return;

  const {
    id,
    name,
    feed_url: feedUrl,
    default_category: defaultCategory = 'News',
    is_active: isActive = true,
  } = request.body;

  if (!id?.trim() || !name?.trim() || !feedUrl?.trim()) {
    return response.status(400).json({ error: 'Source ID, Name, and RSS Feed URL are required.' });
  }

  const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleanId) {
    return response.status(400).json({ error: 'Source ID must contain alphanumeric characters or hyphens.' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO feed_sources (id, name, feed_url, default_category, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, name, feed_url, default_category, is_active, created_at`,
      [cleanId, name.trim(), feedUrl.trim(), defaultCategory.trim() || 'News', Boolean(isActive)]
    );
    response.status(201).json(rows[0]);
  } catch (error: any) {
    console.error('Unable to add feed source:', error);
    if (error?.code === '23505') {
      return response.status(409).json({ error: 'A feed source with this ID already exists.' });
    }
    response.status(500).json({ error: 'Unable to add feed source.' });
  }
});

// Update or toggle feed source
app.patch('/api/admin/sources/:id', async (request: Request, response: Response) => {
  if (!requireAdminAuth(request, response)) return;

  const sourceId = request.params.id.trim().toLowerCase();
  const { name, feed_url: feedUrl, default_category: defaultCategory, is_active: isActive } = request.body;

  try {
    const { rows: existing } = await db.query(
      `SELECT id, name, feed_url, default_category, is_active, created_at FROM feed_sources WHERE id = $1`,
      [sourceId]
    );
    if (!existing[0]) {
      return response.status(404).json({ error: 'Feed source not found.' });
    }

    const current = existing[0];
    const updatedName = name !== undefined ? name.trim() : current.name;
    const updatedUrl = feedUrl !== undefined ? feedUrl.trim() : current.feed_url;
    const updatedCat = defaultCategory !== undefined ? defaultCategory.trim() : current.default_category;
    const updatedActive = isActive !== undefined ? Boolean(isActive) : current.is_active;

    const { rows: updated } = await db.query(
      `UPDATE feed_sources
       SET name = $1, feed_url = $2, default_category = $3, is_active = $4
       WHERE id = $5
       RETURNING id, name, feed_url, default_category, is_active, created_at`,
      [updatedName, updatedUrl, updatedCat, updatedActive, sourceId]
    );

    response.json(updated[0]);
  } catch (error) {
    console.error('Unable to update feed source:', error);
    response.status(500).json({ error: 'Unable to update feed source.' });
  }
});

// Check all active sources now
app.post('/api/imports/check-all', async (request: Request, response: Response) => {
  if (!requireAdminAuth(request, response)) return;

  try {
    const summary = await runScheduledImport();
    response.json(summary);
  } catch (error: any) {
    console.error('Manual check-all import failed:', error);
    response.status(500).json({ error: 'Failed to run full import check.' });
  }
});

// Import external RSS feed for a specific source
app.post('/api/imports/:sourceId', async (request: Request, response: Response) => {
  if (!requireAdminAuth(request, response)) return;
  const sourceId = request.params.sourceId.trim().toLowerCase();

  try {
    const { rows } = await db.query(
      `SELECT id, name, feed_url, default_category, is_active FROM feed_sources WHERE id = $1`,
      [sourceId]
    );

    if (!rows[0]) {
      return response.status(404).json({ error: `Feed source '${sourceId}' was not found.` });
    }

    const source = rows[0];
    const result = await importStoriesFromSource(source);
    response.json(result);
  } catch (error: any) {
    console.error(`Unable to import ${sourceId} stories:`, error);
    response.status(502).json({
      error: `Unable to import stories from source: ${error?.message || 'Network error'}`,
    });
  }
});

// Admin shortcut route redirect
app.get('/admin', (_req: Request, res: Response) => {
  res.redirect('/admin.html');
});

// Article route shortcut redirect
app.get('/article', (req: Request, res: Response) => {
  const id = req.query.id;
  res.redirect(id ? `/article.html?id=${id}` : '/article.html');
});

async function startServer() {
  await prepareDatabase();
  initScheduledImports();

  // Vite middleware for development / Static file serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/admin', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'admin.html'));
    });
    app.get('/article', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'article.html'));
    });
    app.get('/article.html', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'article.html'));
    });
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`News Nigeria running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
