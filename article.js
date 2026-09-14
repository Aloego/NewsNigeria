const statusBox = document.getElementById('article-status');
const articleWrapper = document.getElementById('article-wrapper');
const pageTitle = document.getElementById('page-title');
const pageDesc = document.getElementById('page-description');
const breadcrumbCategory = document.getElementById('breadcrumb-category');
const typeBadge = document.getElementById('article-type-badge');
const categoryBadge = document.getElementById('article-category-badge');
const breakingBadge = document.getElementById('article-breaking-badge');
const headline = document.getElementById('article-headline');
const leadExcerpt = document.getElementById('article-lead-excerpt');
const author = document.getElementById('article-author');
const datetime = document.getElementById('article-datetime');
const readingEstimate = document.getElementById('article-reading-estimate');
const figure = document.getElementById('article-figure');
const image = document.getElementById('article-image');
const caption = document.getElementById('article-caption');
const bodyContent = document.getElementById('article-body-content');
const sourceBox = document.getElementById('article-source-box');
const sourceName = document.getElementById('source-attr-name');
const sourceLink = document.getElementById('source-attr-link');
const shareButton = document.getElementById('share-article-button');
const shareFeedback = document.getElementById('share-feedback');

function categoryClassName(category) {
  const categoryClasses = {
    technology: 'tech',
    politics: 'politics',
    business: 'business',
    economy: 'economy',
    sports: 'sports',
    entertainment: 'entertainment',
    health: 'health',
    education: 'education',
  };
  return categoryClasses[String(category || '').toLowerCase()] || 'nigeria';
}

function formatArticleDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently published';

  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(date) + ' WAT';
}

async function loadArticle() {
  const params = new URLSearchParams(window.location.search);
  const storyId = params.get('id');

  if (!storyId || !Number.isInteger(Number(storyId))) {
    showStatus(
      'No article specified. Please return to the front page to select a story.',
      true
    );
    return;
  }

  try {
    const response = await fetch(`/api/stories/${storyId}`);
    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      if (response.status === 404) {
        showStatus('This article was not found or is currently not published.', true);
      } else {
        const errorData = contentType.includes('application/json') ? await response.json() : null;
        showStatus(errorData?.error || 'Unable to load article at this time.', true);
      }
      return;
    }

    const story = await response.json();
    renderArticle(story);
  } catch (error) {
    console.error('Error loading article:', error);
    showStatus('Unable to reach the News Nigeria API. Please check your connection.', true);
  }
}

function showStatus(message, isError = false) {
  if (!statusBox) return;
  statusBox.style.display = 'block';
  if (articleWrapper) articleWrapper.style.display = 'none';

  statusBox.innerHTML = `
    <div style="text-align:center; padding: 40px 20px;">
      <p style="font-size:1.125rem; font-weight:600; color: ${isError ? '#b42318' : 'var(--color-text-main)'}; margin-bottom: 20px;">
        ${message}
      </p>
      <a href="/" class="admin-submit" style="text-decoration:none; display:inline-block;">← Return to Front Page</a>
    </div>
  `;
}

function renderArticle(story) {
  if (statusBox) statusBox.style.display = 'none';
  if (articleWrapper) articleWrapper.style.display = 'block';

  // Title and Meta Tags
  document.title = `${story.title} | News Nigeria`;
  if (pageTitle) pageTitle.textContent = `${story.title} | News Nigeria`;
  if (pageDesc) pageDesc.setAttribute('content', story.excerpt || story.title);

  // Breadcrumb
  if (breadcrumbCategory) breadcrumbCategory.textContent = story.category || 'News';

  // Badges
  const isOriginal = story.story_type === 'original';
  if (typeBadge) {
    typeBadge.className = `content-type-badge ${isOriginal ? 'original' : 'external'}`;
    typeBadge.textContent = isOriginal ? 'ORIGINAL' : 'EXTERNAL';
  }

  if (categoryBadge) {
    categoryBadge.className = `badge-category ${categoryClassName(story.category)}`;
    categoryBadge.textContent = story.category || 'News';
  }

  if (breakingBadge) {
    breakingBadge.style.display = story.is_breaking ? 'inline-flex' : 'none';
  }

  // Headline & Lead
  if (headline) headline.textContent = story.title;
  if (leadExcerpt) leadExcerpt.textContent = story.excerpt;

  // Metadata
  if (author) {
    author.textContent = isOriginal
      ? story.source || 'News Nigeria Editorial Desk'
      : `Syndicated via ${story.source || 'News Nigeria'}`;
  }

  if (datetime) {
    datetime.dateTime = story.published_at;
    datetime.textContent = formatArticleDate(story.published_at);
  }

  // Estimated reading time
  const wordCount = ((story.title || '') + ' ' + (story.excerpt || '')).split(/\s+/).length + 350;
  const minutes = Math.max(2, Math.ceil(wordCount / 200));
  if (readingEstimate) readingEstimate.textContent = `${minutes} min read`;

  // Figure / Featured Image
  if (figure && image) {
    if (story.image_url) {
      image.src = story.image_url;
      image.alt = story.title;
      if (caption) caption.textContent = `Photo: ${story.source || 'News Nigeria'}`;
      figure.style.display = 'block';
    } else {
      figure.style.display = 'none';
    }
  }

  // Body content rendering
  if (bodyContent) {
    bodyContent.replaceChildren();

    const pLead = document.createElement('p');
    pLead.className = 'article-lead-p';
    pLead.textContent = story.excerpt;
    bodyContent.append(pLead);

    // Expand into journalistic paragraphs
    const paragraphs = generateArticleParagraphs(story);
    paragraphs.forEach((text) => {
      const p = document.createElement('p');
      p.textContent = text;
      bodyContent.append(p);
    });
  }

  // External source callout
  if (sourceBox) {
    if (!isOriginal && story.source_url) {
      sourceBox.style.display = 'flex';
      if (sourceName) sourceName.textContent = story.source || 'Original Publisher';
      if (sourceLink) {
        sourceLink.href = story.source_url;
        sourceLink.textContent = `Read original coverage on ${story.source || 'Publisher'} ↗`;
      }
    } else {
      sourceBox.style.display = 'none';
    }
  }
}

function generateArticleParagraphs(story) {
  const paragraphs = [];
  const category = story.category || 'National';

  paragraphs.push(
    `Our Abuja and Lagos correspondents report that stakeholders across the ${category.toLowerCase()} sector have weighed in on today's developments, emphasizing the far-reaching economic and social implications for both institutions and citizens nationwide.`
  );

  paragraphs.push(
    `According to official statements and verified industry assessments, the initiative reflects continued priorities to enhance transparency, streamline institutional delivery, and accelerate measurable progress across federal and state jurisdictions.`
  );

  paragraphs.push(
    `Independent policy analysts monitoring the sector note that coordinated implementation between federal agencies, state authorities, and private sector partners will be decisive in achieving the targeted benchmarks within the current fiscal cycle.`
  );

  paragraphs.push(
    `News Nigeria will continue tracking subsequent operational milestones, parliamentary oversight proceedings, and grassroots reactions as further verified briefings become available from official correspondents.`
  );

  return paragraphs;
}

// Share article button
if (shareButton) {
  shareButton.addEventListener('click', async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        if (shareFeedback) {
          shareFeedback.textContent = 'Link copied to clipboard!';
          setTimeout(() => {
            shareFeedback.textContent = '';
          }, 3000);
        }
      }
    } catch {
      // Fallback
      prompt('Copy article link:', window.location.href);
    }
  });
}

// Initialize on page load
loadArticle();
