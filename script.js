/**
 * NEWS NIGERIA - Core Frontend JavaScript (script.js)
 * Clean, modular, beginner-friendly vanilla JS for UI interactions.
 */

document.addEventListener('DOMContentLoaded', () => {
  initLiveDate();
  initMobileNavigation();
  initSearchToggle();
  initBreakingTicker();
  initNewsletterForm();
  initBackToTop();
  initSampleStoryLinks();
  initLatestStories();
});

/**
 * Loads published stories from the local Express API into the existing
 * Latest News section. The page layout remains unchanged.
 */
async function initLatestStories() {
  const storiesList = document.getElementById('latest-stories-list');
  if (!storiesList) return;

  const loadingStatus = createStoryStatus('Loading latest stories…');
  storiesList.prepend(loadingStatus);

  try {
    const response = await fetch('/api/stories');
    if (!response.ok) {
      throw new Error(`Stories request failed with status ${response.status}`);
    }

    const stories = await response.json();
    if (!Array.isArray(stories) || stories.length === 0) {
      loadingStatus.textContent = 'No new published stories yet. Check back soon.';
      return;
    }

    loadingStatus.remove();
    storiesList.prepend(...stories.map(createStoryCard));
    populateHomepageSections(stories);
  } catch (error) {
    console.error('Unable to load latest stories:', error);
    loadingStatus.textContent = 'Live stories are temporarily unavailable. Please try again shortly.';
  } finally {
    storiesList.setAttribute('aria-busy', 'false');
  }
}

function populateHomepageSections(stories) {
  const featuredStories = stories.filter((story) => story.is_featured);
  if (featuredStories[0]) {
    const leadStory = document.getElementById('main-lead-story');
    leadStory?.replaceWith(createLeadStoryCard(featuredStories[0]));
    prependStories('lead-secondary-stories', featuredStories.slice(1, 4), createLeadSecondaryStoryCard);
  }

  const breakingStories = stories.filter((story) => story.is_breaking);
  if (breakingStories.length > 0) {
    setDynamicBreakingTicker(breakingStories);
  } else if (stories[0]) {
    updateBreakingHeadline(stories[0]);
  }

  const originalStories = stories.filter((story) => story.story_type === 'original').slice(0, 3);
  prependStories('original-stories-grid', originalStories, createFeatureStoryCard);

  prependStoriesForCategories('nigeria', stories, ['news', 'national', 'nigeria', 'community', 'crime & security']);
  prependStoriesForCategories('politics', stories, ['politics']);
  prependStoriesForCategories('entertainment', stories, ['entertainment']);
  prependStoriesForCategories('sports', stories, ['sports']);

  const businessTechnologyStories = stories
    .filter((story) => ['business', 'economy', 'technology', 'agriculture'].includes(normalizeCategory(story.category)))
    .slice(0, 3);
  prependStories('business-technology-grid', businessTechnologyStories, createMediumStoryCard);
}

function createLeadStoryCard(story) {
  const article = createBaseStoryCard(story, 'news-card card-large lead-story-card');
  article.id = 'main-lead-story';
  article.querySelector('.card-content').insertBefore(createStoryExcerpt(story), article.querySelector('.story-meta'));
  return article;
}

function createLeadSecondaryStoryCard(story) {
  return createBaseStoryCard(story, 'news-card lead-secondary-item');
}

function updateBreakingHeadline(story) {
  const headline = document.getElementById('breaking-headline-text');
  if (!headline) return;
  headline.textContent = story.title;
  headline.href = story.story_type === 'external' && story.source_url ? story.source_url : `article.html?id=${story.id}`;
  if (story.story_type === 'external' && story.source_url) {
    headline.target = '_blank';
    headline.rel = 'noopener noreferrer';
  } else {
    headline.removeAttribute('target');
    headline.removeAttribute('rel');
  }
}

function prependStoriesForCategories(sectionName, stories, allowedCategories) {
  const section = document.querySelector(`[data-story-section="${sectionName}"]`);
  if (!section) return;
  const matchingStories = stories
    .filter((story) => allowedCategories.includes(normalizeCategory(story.category)))
    .slice(0, 2);
  const header = section.querySelector('.section-header-wrap');
  if (!header || !matchingStories.length) return;
  [...matchingStories].reverse().forEach((story) => {
    header.insertAdjacentElement('afterend', createMediumStoryCard(story));
  });
}

function prependStories(target, stories, cardCreator) {
  const container = typeof target === 'string' ? document.getElementById(target) : target;
  if (!container || !stories.length) return;
  container.prepend(...stories.map(cardCreator));
}

function normalizeCategory(category) {
  return String(category || '').trim().toLowerCase();
}

function createMediumStoryCard(story) {
  const article = createBaseStoryCard(story, 'news-card card-medium');
  article.querySelector('.card-content').insertBefore(createStoryExcerpt(story), article.querySelector('.story-meta'));
  return article;
}

function createFeatureStoryCard(story) {
  const article = createBaseStoryCard(story, 'news-card original-card');
  article.querySelector('.card-content').insertBefore(createStoryExcerpt(story), article.querySelector('.story-meta'));
  return article;
}

function createStoryExcerpt(story) {
  const excerpt = document.createElement('p');
  excerpt.className = 'card-excerpt';
  excerpt.textContent = story.excerpt || '';
  return excerpt;
}

function createStoryStatus(message) {
  const messageElement = document.createElement('p');
  messageElement.className = 'stories-api-status';
  messageElement.textContent = message;
  return messageElement;
}

function createStoryCard(story) {
  return createBaseStoryCard(story, 'news-card card-small-horizontal');
}

function createBaseStoryCard(story, cardClassName) {
  const article = document.createElement('article');
  article.className = cardClassName;

  const imageWrap = document.createElement('div');
  imageWrap.className = 'card-image-wrap';
  if (story.image_url) {
    const image = document.createElement('img');
    image.src = story.image_url;
    image.alt = story.title || 'News story image';
    image.loading = 'lazy';
    imageWrap.append(image);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'story-image-placeholder';
    placeholder.textContent = 'NEWS NIGERIA';
    imageWrap.append(placeholder);
  }

  const content = document.createElement('div');
  content.className = 'card-content';

  const labels = document.createElement('div');
  const typeBadge = document.createElement('span');
  const isOriginal = story.story_type === 'original';
  typeBadge.className = `content-type-badge ${isOriginal ? 'original' : 'external'}`;
  typeBadge.textContent = isOriginal ? 'ORIGINAL' : 'EXTERNAL';

  const category = document.createElement('span');
  category.className = `badge-category ${categoryClassName(story.category)}`;
  category.textContent = story.category || 'NEWS';
  labels.append(typeBadge, category);

  const headline = document.createElement('h3');
  headline.className = 'card-headline';
  const link = document.createElement('a');
  link.href = !isOriginal && story.source_url ? story.source_url : `article.html?id=${story.id}`;
  link.textContent = story.title || 'Untitled story';
  if (!isOriginal && story.source_url) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  headline.append(link);

  const meta = document.createElement('div');
  meta.className = 'story-meta';
  const source = document.createElement('span');
  source.className = isOriginal ? 'story-author' : 'story-source';
  source.textContent = isOriginal ? `By ${story.source || 'News Nigeria'}` : `SOURCE: ${story.source || 'News Nigeria'}`;

  const divider = document.createElement('span');
  divider.className = 'story-meta-divider';
  divider.textContent = '•';

  const publishedAt = document.createElement('time');
  publishedAt.dateTime = story.published_at || '';
  publishedAt.textContent = formatStoryDate(story.published_at);
  meta.append(source, divider, publishedAt);

  content.append(labels, headline, meta);
  article.append(imageWrap, content);
  return article;
}

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

function formatStoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently published';

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Lagos',
  }).format(date);
}

/**
 * 1. Live Date Initialization
 * Formats current date for Nigeria (West Africa Time) in the utility bar.
 */
function initLiveDate() {
  const dateElement = document.getElementById('current-date');
  if (!dateElement) return;

  try {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Africa/Lagos'
    };
    const now = new Date();
    dateElement.textContent = now.toLocaleDateString('en-NG', options) + ' • Lagos / Abuja (WAT)';
  } catch (e) {
    // Fallback if timezone not supported
    dateElement.textContent = 'Thursday, September 10, 2026 • West Africa Time';
  }
}

/**
 * 2. Mobile Navigation Drawer Toggle
 * Handles opening, closing, overlay clicks, and Esc key accessibility.
 */
function initMobileNavigation() {
  const hamburgerBtn = document.getElementById('hamburger-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('mobile-backdrop');
  const closeBtn = document.getElementById('mobile-drawer-close');

  if (!hamburgerBtn || !drawer || !backdrop) return;

  function openMenu() {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // prevent background scrolling
  }

  function closeMenu() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburgerBtn.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', closeMenu);

  // Close when pressing Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) {
      closeMenu();
    }
  });

  // Close drawer if link is clicked
  const mobileLinks = drawer.querySelectorAll('.mobile-nav-link');
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });
}

/**
 * 3. Search Bar Toggle & Placeholder Submission
 */
function initSearchToggle() {
  const searchBtn = document.getElementById('search-toggle-btn');
  const searchOverlay = document.getElementById('search-overlay');
  const searchInput = document.getElementById('search-input');
  const searchForm = document.getElementById('header-search-form');

  if (!searchBtn || !searchOverlay) return;

  searchBtn.addEventListener('click', () => {
    const isOpen = searchOverlay.classList.toggle('active');
    searchBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    if (isOpen && searchInput) {
      searchInput.focus();
    }
  });

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput ? searchInput.value.trim() : '';
      if (query) {
        showToast(`Search placeholder: Searching for "${query}" across News Nigeria archives.`);
      } else {
        showToast('Please enter keywords to search.');
      }
    });
  }
}

/**
 * 4. Breaking News Ticker Controls & Auto-cycling
 */
let dynamicTickerItems = [
  { text: 'Federal Government announces updated monetary and trade incentives to boost non-oil exports across geopolitical zones', href: 'article.html?id=1', isExternal: false, category: 'ECONOMY' },
  { text: 'National Assembly plenary enters final deliberations on state police framework and electoral reforms', href: 'article.html?id=5', isExternal: false, category: 'POLITICS' },
  { text: 'Lagos-Ibadan rail freight corridor records 40% cargo throughput increase in Q3 2026', href: 'article.html?id=3', isExternal: false, category: 'INFRASTRUCTURE' },
  { text: 'Nigeria Super Eagles squad opens training camp in Uyo ahead of continental qualifiers', href: 'article.html?id=7', isExternal: false, category: 'SPORTS' },
  { text: 'Tech hubs in Lagos, Abuja, and Enugu announce joint ₦10B seed accelerator for green energy startups', href: 'article.html?id=4', isExternal: false, category: 'TECHNOLOGY' }
];

let tickerIndex = 0;
let tickerIsPaused = false;
let tickerTextElement = null;

function setDynamicBreakingTicker(breakingStories) {
  if (!Array.isArray(breakingStories) || breakingStories.length === 0) return;
  dynamicTickerItems = breakingStories.map((story) => ({
    text: story.title,
    href: story.story_type === 'external' && story.source_url ? story.source_url : `article.html?id=${story.id}`,
    isExternal: story.story_type === 'external' && Boolean(story.source_url),
    category: String(story.category || 'BREAKING').toUpperCase(),
  }));
  tickerIndex = 0;
  if (tickerTextElement) {
    applyTickerItem(0);
  }
}

function applyTickerItem(index) {
  if (!tickerTextElement || dynamicTickerItems.length === 0) return;
  tickerIndex = (index + dynamicTickerItems.length) % dynamicTickerItems.length;
  const item = dynamicTickerItems[tickerIndex];

  tickerTextElement.style.opacity = '0';
  setTimeout(() => {
    tickerTextElement.textContent = item.text;
    tickerTextElement.href = item.href;
    if (item.isExternal) {
      tickerTextElement.target = '_blank';
      tickerTextElement.rel = 'noopener noreferrer';
    } else {
      tickerTextElement.removeAttribute('target');
      tickerTextElement.removeAttribute('rel');
    }
    tickerTextElement.style.opacity = '1';
  }, 150);
}

function initBreakingTicker() {
  tickerTextElement = document.getElementById('breaking-headline-text');
  const prevBtn = document.getElementById('breaking-prev-btn');
  const nextBtn = document.getElementById('breaking-next-btn');
  const pauseBtn = document.getElementById('breaking-pause-btn');

  if (!tickerTextElement) return;

  applyTickerItem(0);

  if (nextBtn) {
    nextBtn.addEventListener('click', () => applyTickerItem(tickerIndex + 1));
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', () => applyTickerItem(tickerIndex - 1));
  }
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      tickerIsPaused = !tickerIsPaused;
      pauseBtn.setAttribute('aria-label', tickerIsPaused ? 'Play Ticker' : 'Pause Ticker');
      pauseBtn.innerHTML = tickerIsPaused ? '▶' : '⏸';
    });
  }

  // Auto cycle every 6 seconds if not paused
  setInterval(() => {
    if (!tickerIsPaused) {
      applyTickerItem(tickerIndex + 1);
    }
  }, 6000);
}

/**
 * 5. Newsletter Signup Placeholder Form
 */
function initNewsletterForm() {
  const form = document.getElementById('newsletter-form');
  const emailInput = document.getElementById('newsletter-email');
  const feedback = document.getElementById('newsletter-feedback');

  if (!form || !emailInput || !feedback) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();

    if (!email || !email.includes('@')) {
      feedback.textContent = 'Please enter a valid email address.';
      feedback.className = 'newsletter-feedback show';
      feedback.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
      feedback.style.borderColor = '#ef4444';
      feedback.style.color = '#fca5a5';
      return;
    }

    // Required specification feedback
    feedback.textContent = 'Newsletter signup will be available soon. Thank you for your interest in News Nigeria!';
    feedback.className = 'newsletter-feedback show info';
    emailInput.value = '';

    setTimeout(() => {
      feedback.className = 'newsletter-feedback';
    }, 6000);
  });
}

/**
 * 6. Smooth Scroll to Top
 */
function initBackToTop() {
  const backToTopBtn = document.getElementById('back-to-top');
  if (!backToTopBtn) return;

  backToTopBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/**
 * 7. Sample Story Link Guidance
 * For original stories, ensure real navigation to article reader.
 */
function initSampleStoryLinks() {
  const allCards = document.querySelectorAll('a[data-story-type]');

  allCards.forEach(link => {
    const storyType = link.getAttribute('data-story-type');
    const href = link.getAttribute('href');

    // Ensure original links open a real article page
    if (storyType === 'original' && (!href || href === '#' || href === 'article.html')) {
      link.setAttribute('href', 'article.html?id=1');
    }

    link.addEventListener('click', (e) => {
      const currentHref = link.getAttribute('href');
      const headline = link.getAttribute('data-headline') || 'Story';
      const source = link.getAttribute('data-source') || '';

      if (storyType === 'original') {
        // Allow direct navigation to the article page
        return;
      } else if (storyType === 'external') {
        if (!currentHref || currentHref === '#') {
          e.preventDefault();
          showToast(`[EXTERNAL NEWS] Sourced from ${source}: "${headline}". Opening publisher partner feed.`);
        }
      }
    });
  });
}

/**
 * Minimal Toast Notification Helper
 */
function showToast(message) {
  let toast = document.getElementById('ui-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ui-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.maxWidth = '380px';
    toast.style.backgroundColor = '#0f172a';
    toast.style.color = '#ffffff';
    toast.style.padding = '12px 18px';
    toast.style.borderRadius = '6px';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
    toast.style.fontSize = '0.875rem';
    toast.style.lineHeight = '1.4';
    toast.style.zIndex = '9999';
    toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    toast.style.borderLeft = '4px solid #006633';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateY(0)';

  clearTimeout(toast.timeoutId);
  toast.timeoutId = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
  }, 4500);
}
