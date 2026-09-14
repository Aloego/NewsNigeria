/**
 * News Nigeria Admin & CMS Client Script (admin.js)
 * Provides comprehensive story publishing, published story editing,
 * unpublishing, RSS source management, and draft moderation.
 */

const categories = [
  'News',
  'National',
  'Politics',
  'Business',
  'Economy',
  'Technology',
  'Health',
  'Education',
  'Sports',
  'Entertainment',
  'Environment',
  'Agriculture',
  'Community',
  'Crime & Security',
];

const adminKeyInput = document.getElementById('global-admin-key');
const refreshAllBtn = document.getElementById('refresh-all-btn');

// Published Stories Elements
const loadPublishedBtn = document.getElementById('load-published-button');
const publishedFeedback = document.getElementById('published-stories-feedback');
const publishedList = document.getElementById('published-stories-list');

// Review Queue / Drafts Elements
const loadDraftsBtn = document.getElementById('load-drafts-button');
const draftsFeedback = document.getElementById('drafts-feedback');
const reviewQueueList = document.getElementById('review-queue-list');

// Sources Elements
const loadSourcesBtn = document.getElementById('load-sources-button');
const checkAllSourcesBtn = document.getElementById('check-all-sources-button');
const sourcesFeedback = document.getElementById('sources-feedback');
const sourcesList = document.getElementById('sources-list');
const addSourceForm = document.getElementById('add-source-form');
const addSourceFeedback = document.getElementById('add-source-feedback');

// Publish Form Elements
const publishForm = document.getElementById('publish-story-form');
const publishFeedback = document.getElementById('publish-story-feedback');

function getAdminKey() {
  return adminKeyInput?.value.trim() || 'newsnigeria-admin';
}

function requireAdminKey(targetFeedbackElement) {
  const key = getAdminKey();
  if (key) return key;

  if (targetFeedbackElement) {
    targetFeedbackElement.textContent = 'Admin key is required to perform this action.';
    targetFeedbackElement.className = 'admin-feedback error';
  }
  adminKeyInput?.focus();
  return null;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error('API server returned unexpected response. Check server connection.');
  }

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || `Request failed with status ${response.status}`);
  }
  return result;
}

function setFeedback(element, message, type = 'info') {
  if (!element) return;
  element.textContent = message;
  element.className = `admin-feedback ${type}`;
}

// ============================================================================
// 1. MANAGE PUBLISHED STORIES
// ============================================================================

async function loadPublishedStories() {
  const adminKey = requireAdminKey(publishedFeedback);
  if (!adminKey || !publishedList) return;

  publishedList.textContent = 'Loading published stories from database…';
  setFeedback(publishedFeedback, '');

  try {
    const stories = await requestJson('/api/admin/stories?status=published', {
      headers: { 'x-admin-key': adminKey },
    });

    publishedList.replaceChildren();
    if (!stories.length) {
      publishedList.textContent = 'No published stories found in the database.';
      return;
    }

    publishedList.append(...stories.map(createPublishedStoryCard));
    setFeedback(publishedFeedback, `Loaded ${stories.length} published story / stories.`, 'success');
  } catch (error) {
    publishedList.textContent = 'Unable to load published stories.';
    setFeedback(publishedFeedback, error.message || 'Unable to load published stories.', 'error');
  }
}

function createPublishedStoryCard(story) {
  const card = document.createElement('article');
  card.className = 'review-card published-card';
  card.id = `published-story-${story.id}`;

  const editForm = document.createElement('form');
  editForm.className = 'review-form';

  // Header status banner inside card
  const cardHeader = document.createElement('div');
  cardHeader.style.display = 'flex';
  cardHeader.style.justifyContent = 'space-between';
  cardHeader.style.alignItems = 'center';
  cardHeader.style.flexWrap = 'wrap';
  cardHeader.style.gap = '8px';
  cardHeader.style.paddingBottom = '8px';
  cardHeader.style.borderBottom = '1px solid var(--color-border)';

  const badges = document.createElement('div');
  badges.style.display = 'flex';
  badges.style.gap = '6px';
  badges.style.alignItems = 'center';
  badges.innerHTML = `
    <span style="background:#087634; color:#fff; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:3px;">LIVE</span>
    <span id="badge-featured-${story.id}" style="background:#d97706; color:#fff; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:3px; display:${story.is_featured ? 'inline-block' : 'none'};">FEATURED</span>
    <span id="badge-breaking-${story.id}" style="background:#b42318; color:#fff; font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:3px; display:${story.is_breaking ? 'inline-block' : 'none'};">BREAKING</span>
    <span style="font-size:0.8125rem; color:var(--color-text-muted);">ID #${story.id} • Published ${new Date(story.published_at).toLocaleDateString('en-NG')}</span>
  `;

  const viewLink = document.createElement('a');
  viewLink.href = `/article.html?id=${story.id}`;
  viewLink.target = '_blank';
  viewLink.rel = 'noopener noreferrer';
  viewLink.className = 'admin-back-link';
  viewLink.style.margin = '0';
  viewLink.style.fontSize = '0.8125rem';
  viewLink.textContent = 'View Reader Page ↗';

  cardHeader.append(badges, viewLink);

  // Form Fields
  const title = document.createElement('input');
  title.name = 'title';
  title.value = story.title;
  title.required = true;

  const excerpt = document.createElement('textarea');
  excerpt.name = 'excerpt';
  excerpt.rows = 3;
  excerpt.value = story.excerpt;
  excerpt.required = true;

  const category = document.createElement('select');
  category.name = 'category';
  categories.forEach((val) => {
    const opt = new Option(val, val, false, val.toLowerCase() === (story.category || '').toLowerCase());
    category.add(opt);
  });
  if (!category.value) category.add(new Option(story.category, story.category, true, true), 0);

  const source = document.createElement('input');
  source.name = 'source';
  source.value = story.source || 'News Nigeria';
  source.required = true;

  const sourceUrl = document.createElement('input');
  sourceUrl.name = 'sourceUrl';
  sourceUrl.type = 'url';
  sourceUrl.placeholder = 'https://example.com/story';
  sourceUrl.value = story.source_url || '';

  const imageUrl = document.createElement('input');
  imageUrl.name = 'imageUrl';
  imageUrl.type = 'url';
  imageUrl.placeholder = 'https://example.com/image.jpg';
  imageUrl.value = story.image_url || '';

  const isFeatured = document.createElement('input');
  isFeatured.name = 'isFeatured';
  isFeatured.type = 'checkbox';
  isFeatured.checked = Boolean(story.is_featured);

  const isBreaking = document.createElement('input');
  isBreaking.name = 'isBreaking';
  isBreaking.type = 'checkbox';
  isBreaking.checked = Boolean(story.is_breaking);

  editForm.append(
    cardHeader,
    createFormField('Headline', title),
    createFormField('Summary / Excerpt', excerpt),
    createFormField('Category', category),
    createFormField('Source / Author', source),
    createFormField('Original Link (if external)', sourceUrl),
    createFormField('Image Link (optional)', imageUrl),
    createFormField('Lead placement', isFeatured, 'Feature in homepage lead area'),
    createFormField('Breaking ticker placement', isBreaking, 'Show in breaking-news ticker')
  );

  // Action Buttons
  const actions = document.createElement('div');
  actions.className = 'review-actions';
  actions.style.marginTop = '12px';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'submit';
  saveBtn.className = 'admin-submit';
  saveBtn.textContent = 'Save Changes';

  const unpublishBtn = document.createElement('button');
  unpublishBtn.type = 'button';
  unpublishBtn.className = 'review-reject-button';
  unpublishBtn.style.color = '#b45309';
  unpublishBtn.style.borderColor = '#d97706';
  unpublishBtn.textContent = 'Unpublish Story (Move to Draft)';

  const cardFeedback = document.createElement('p');
  cardFeedback.className = 'admin-feedback';
  cardFeedback.style.width = '100%';
  cardFeedback.style.margin = '6px 0 0';

  actions.append(saveBtn, unpublishBtn);
  editForm.append(actions, cardFeedback);

  // Handle Save edits (keeps status = 'published')
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const adminKey = requireAdminKey(cardFeedback);
    if (!adminKey || !editForm.reportValidity()) return;

    saveBtn.disabled = true;
    setFeedback(cardFeedback, 'Saving updates…');

    try {
      const updatedStory = await requestJson(`/api/stories/${story.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          title: title.value.trim(),
          excerpt: excerpt.value.trim(),
          category: category.value,
          source: source.value.trim(),
          source_url: sourceUrl.value.trim() || null,
          image_url: imageUrl.value.trim() || null,
          is_featured: isFeatured.checked,
          is_breaking: isBreaking.checked,
          status: 'published',
        }),
      });

      // Update badges
      const featBadge = document.getElementById(`badge-featured-${story.id}`);
      if (featBadge) featBadge.style.display = updatedStory.is_featured ? 'inline-block' : 'none';
      const brkBadge = document.getElementById(`badge-breaking-${story.id}`);
      if (brkBadge) brkBadge.style.display = updatedStory.is_breaking ? 'inline-block' : 'none';

      setFeedback(cardFeedback, 'Changes saved successfully to live story.', 'success');
      setTimeout(() => setFeedback(cardFeedback, ''), 4000);
    } catch (err) {
      setFeedback(cardFeedback, err.message || 'Failed to update story.', 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Handle Unpublish (moves status = 'draft')
  unpublishBtn.addEventListener('click', async () => {
    if (!window.confirm(`Unpublish "${story.title}"?\n\nThis will remove the story from the live homepage and return it to the drafts review queue.`)) {
      return;
    }

    const adminKey = requireAdminKey(cardFeedback);
    if (!adminKey) return;

    unpublishBtn.disabled = true;
    setFeedback(cardFeedback, 'Unpublishing story…');

    try {
      await requestJson(`/api/stories/${story.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          title: title.value.trim(),
          excerpt: excerpt.value.trim(),
          category: category.value,
          source: source.value.trim(),
          source_url: sourceUrl.value.trim() || null,
          image_url: imageUrl.value.trim() || null,
          is_featured: false,
          is_breaking: false,
          status: 'draft',
        }),
      });

      card.remove();
      setFeedback(
        publishedFeedback,
        `"${story.title}" was unpublished and moved back to the review queue.`,
        'success'
      );
      loadDrafts(); // Refresh drafts queue immediately
    } catch (err) {
      setFeedback(cardFeedback, err.message || 'Failed to unpublish story.', 'error');
      unpublishBtn.disabled = false;
    }
  });

  card.append(editForm);
  return card;
}

// ============================================================================
// 2. REVIEW QUEUE (DRAFTS)
// ============================================================================

async function loadDrafts() {
  const adminKey = requireAdminKey(draftsFeedback);
  if (!adminKey || !reviewQueueList) return;

  reviewQueueList.textContent = 'Loading drafts from review queue…';
  setFeedback(draftsFeedback, '');

  try {
    const stories = await requestJson('/api/admin/stories?status=draft', {
      headers: { 'x-admin-key': adminKey },
    });

    reviewQueueList.replaceChildren();
    if (!stories.length) {
      reviewQueueList.textContent = 'There are no stories waiting for review.';
      return;
    }

    reviewQueueList.append(...stories.map(createReviewCard));
    setFeedback(draftsFeedback, `Loaded ${stories.length} draft story / stories for review.`, 'success');
  } catch (error) {
    reviewQueueList.textContent = 'Unable to load drafts.';
    setFeedback(draftsFeedback, error.message || 'Unable to load drafts.', 'error');
  }
}

function createReviewCard(story) {
  const card = document.createElement('article');
  card.className = 'review-card';

  const reviewForm = document.createElement('form');
  reviewForm.className = 'review-form';

  const title = document.createElement('input');
  title.name = 'title';
  title.value = story.title;
  title.required = true;

  const excerpt = document.createElement('textarea');
  excerpt.name = 'excerpt';
  excerpt.rows = 3;
  excerpt.value = story.excerpt;
  excerpt.required = true;

  const category = document.createElement('select');
  category.name = 'category';
  categories.forEach((val) => {
    const opt = new Option(val, val, false, val.toLowerCase() === (story.category || '').toLowerCase());
    category.add(opt);
  });
  if (!category.value) category.add(new Option(story.category, story.category, true, true), 0);

  const source = document.createElement('input');
  source.name = 'source';
  source.value = story.source;
  source.required = true;

  const sourceUrl = document.createElement('input');
  sourceUrl.name = 'sourceUrl';
  sourceUrl.type = 'url';
  sourceUrl.value = story.source_url || '';

  const imageUrl = document.createElement('input');
  imageUrl.name = 'imageUrl';
  imageUrl.type = 'url';
  imageUrl.value = story.image_url || '';

  const isFeatured = document.createElement('input');
  isFeatured.name = 'isFeatured';
  isFeatured.type = 'checkbox';
  isFeatured.checked = Boolean(story.is_featured);

  const isBreaking = document.createElement('input');
  isBreaking.name = 'isBreaking';
  isBreaking.type = 'checkbox';
  isBreaking.checked = Boolean(story.is_breaking);

  reviewForm.append(
    createFormField('Headline', title),
    createFormField('Summary', excerpt),
    createFormField('Category', category),
    createFormField('Source', source),
    createFormField('Original link', sourceUrl),
    createFormField('Image link', imageUrl),
    createFormField('Feature in lead area', isFeatured),
    createFormField('Show in breaking ticker', isBreaking)
  );

  const actions = document.createElement('div');
  actions.className = 'review-actions';

  const approve = document.createElement('button');
  approve.type = 'submit';
  approve.className = 'admin-submit';
  approve.textContent = 'Approve & Publish';

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'admin-secondary-button';
  save.textContent = 'Save Draft Edits';

  const reject = document.createElement('button');
  reject.type = 'button';
  reject.className = 'review-reject-button';
  reject.textContent = 'Reject & Delete';

  actions.append(approve, save, reject);
  reviewForm.append(actions);

  const update = async (status) => {
    const adminKey = requireAdminKey(draftsFeedback);
    if (!adminKey || !reviewForm.reportValidity()) return;

    await requestJson(`/api/stories/${story.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({
        title: title.value.trim(),
        excerpt: excerpt.value.trim(),
        category: category.value,
        source: source.value.trim(),
        source_url: sourceUrl.value.trim() || null,
        image_url: imageUrl.value.trim() || null,
        is_featured: isFeatured.checked,
        is_breaking: isBreaking.checked,
        status,
      }),
    });

    card.remove();
    setFeedback(
      draftsFeedback,
      status === 'published' ? 'Story approved and published to live site!' : 'Draft edits saved.',
      'success'
    );
    if (status === 'published') {
      loadPublishedStories();
    }
    if (!reviewQueueList.children.length) {
      reviewQueueList.textContent = 'There are no stories waiting for review.';
    }
  };

  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await update('published');
    } catch (error) {
      setFeedback(draftsFeedback, error.message, 'error');
    }
  });

  save.addEventListener('click', async () => {
    try {
      await update('draft');
    } catch (error) {
      setFeedback(draftsFeedback, error.message, 'error');
    }
  });

  reject.addEventListener('click', async () => {
    if (!window.confirm('Reject and permanently remove this draft?')) return;
    const adminKey = requireAdminKey(draftsFeedback);
    if (!adminKey) return;

    try {
      const response = await fetch(`/api/stories/${story.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const result = contentType.includes('application/json') ? await response.json() : null;
        throw new Error(result?.error || 'Unable to delete draft.');
      }
      card.remove();
      setFeedback(draftsFeedback, 'Draft removed from review queue.', 'success');
      if (!reviewQueueList.children.length) {
        reviewQueueList.textContent = 'There are no stories waiting for review.';
      }
    } catch (error) {
      setFeedback(draftsFeedback, error.message, 'error');
    }
  });

  card.append(reviewForm);
  return card;
}

function createFormField(labelText, fieldElement, checkboxLabel = '') {
  const label = document.createElement('label');
  if (fieldElement.type === 'checkbox') {
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '8px';
    label.append(fieldElement);
    const textNode = document.createTextNode(` ${checkboxLabel || labelText}`);
    label.append(textNode);
  } else {
    label.textContent = labelText;
    label.append(fieldElement);
  }
  return label;
}

// ============================================================================
// 3. RSS SOURCE MANAGEMENT
// ============================================================================

async function loadSources() {
  const adminKey = requireAdminKey(sourcesFeedback);
  if (!adminKey || !sourcesList) return;

  sourcesList.textContent = 'Loading configured feed sources…';
  setFeedback(sourcesFeedback, '');

  try {
    const sources = await requestJson('/api/admin/sources', {
      headers: { 'x-admin-key': adminKey },
    });

    sourcesList.replaceChildren();
    if (!sources.length) {
      sourcesList.textContent = 'No feed sources configured.';
      return;
    }

    sourcesList.append(...sources.map(createSourceCard));
  } catch (err) {
    sourcesList.textContent = 'Unable to load feed sources.';
    setFeedback(sourcesFeedback, err.message || 'Unable to load feed sources.', 'error');
  }
}

function createSourceCard(source) {
  const card = document.createElement('div');
  card.className = 'review-card';
  card.style.display = 'grid';
  card.style.gap = '10px';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'flex-start';
  header.style.flexWrap = 'wrap';
  header.style.gap = '10px';

  const titleWrap = document.createElement('div');
  titleWrap.innerHTML = `
    <h3 style="margin:0; font-size:1.05rem; display:flex; align-items:center; gap:8px;">
      ${source.name}
      <span style="background:${source.is_active ? '#f0fdf4' : '#fef2f2'}; color:${source.is_active ? '#15803d' : '#b91c1c'}; border:1px solid ${source.is_active ? '#86efac' : '#fca5a5'}; font-size:0.75rem; padding:2px 8px; border-radius:4px; font-weight:700;">
        ${source.is_active ? 'ACTIVE' : 'DISABLED'}
      </span>
    </h3>
    <p style="margin:4px 0 0; font-size:0.8125rem; color:var(--color-text-muted);">
      Slug: <code>${source.id}</code> • Default category: <strong>${source.default_category}</strong>
    </p>
    <p style="margin:4px 0 0; font-size:0.8125rem; color:var(--color-text-muted); word-break:break-all;">
      Feed: <a href="${source.feed_url}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);">${source.feed_url}</a>
    </p>
  `;

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.gap = '8px';
  actions.style.flexWrap = 'wrap';

  const importNowBtn = document.createElement('button');
  importNowBtn.type = 'button';
  importNowBtn.className = 'admin-secondary-button';
  importNowBtn.textContent = 'Check for new stories';
  importNowBtn.disabled = !source.is_active;

  const toggleActiveBtn = document.createElement('button');
  toggleActiveBtn.type = 'button';
  toggleActiveBtn.className = 'admin-secondary-button';
  toggleActiveBtn.style.color = source.is_active ? '#b45309' : '#15803d';
  toggleActiveBtn.textContent = source.is_active ? 'Disable source' : 'Enable source';

  actions.append(importNowBtn, toggleActiveBtn);
  header.append(titleWrap, actions);
  card.append(header);

  // Trigger single feed check
  importNowBtn.addEventListener('click', async () => {
    const adminKey = requireAdminKey(sourcesFeedback);
    if (!adminKey) return;

    importNowBtn.disabled = true;
    setFeedback(sourcesFeedback, `Checking ${source.name} for new headlines…`);

    try {
      const res = await requestJson(`/api/imports/${source.id}`, {
        method: 'POST',
        headers: { 'x-admin-key': adminKey },
      });
      setFeedback(
        sourcesFeedback,
        `✓ ${source.name}: ${res.imported} new draft(s) imported to review queue (${res.skipped} skipped).`,
        'success'
      );
      loadDrafts(); // Refresh queue
    } catch (err) {
      setFeedback(sourcesFeedback, err.message, 'error');
    } finally {
      importNowBtn.disabled = false;
    }
  });

  // Toggle active/disabled status
  toggleActiveBtn.addEventListener('click', async () => {
    const adminKey = requireAdminKey(sourcesFeedback);
    if (!adminKey) return;

    toggleActiveBtn.disabled = true;
    try {
      await requestJson(`/api/admin/sources/${source.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ is_active: !source.is_active }),
      });
      setFeedback(
        sourcesFeedback,
        `Source "${source.name}" is now ${!source.is_active ? 'Active' : 'Disabled'}.`,
        'success'
      );
      loadSources();
    } catch (err) {
      setFeedback(sourcesFeedback, err.message, 'error');
      toggleActiveBtn.disabled = false;
    }
  });

  return card;
}

// Check all active sources now
checkAllSourcesBtn?.addEventListener('click', async () => {
  const adminKey = requireAdminKey(sourcesFeedback);
  if (!adminKey) return;

  checkAllSourcesBtn.disabled = true;
  setFeedback(sourcesFeedback, 'Checking all active feeds in background…');

  try {
    const summary = await requestJson('/api/imports/check-all', {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
    });

    setFeedback(
      sourcesFeedback,
      `✓ Completed checking ${summary.checked} active source(s): ${summary.imported} new draft(s) imported, ${summary.skipped} skipped.${summary.errors.length ? ` (${summary.errors.length} source warning)` : ''}`,
      'success'
    );
    loadDrafts();
  } catch (err) {
    setFeedback(sourcesFeedback, err.message || 'Batch check failed.', 'error');
  } finally {
    checkAllSourcesBtn.disabled = false;
  }
});

// Add new feed source
addSourceForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const adminKey = requireAdminKey(addSourceFeedback);
  if (!adminKey) return;

  const data = new FormData(addSourceForm);
  const submitBtn = addSourceForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  setFeedback(addSourceFeedback, 'Adding source…');

  try {
    const newSource = await requestJson('/api/admin/sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({
        id: data.get('sourceId'),
        name: data.get('sourceName'),
        feed_url: data.get('sourceFeedUrl'),
        default_category: data.get('sourceCategory'),
        is_active: data.get('sourceIsActive') === 'on',
      }),
    });

    setFeedback(addSourceFeedback, `Feed source "${newSource.name}" added successfully!`, 'success');
    addSourceForm.reset();
    loadSources();
  } catch (err) {
    setFeedback(addSourceFeedback, err.message || 'Failed to add feed source.', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

// ============================================================================
// 4. PUBLISH ORIGINAL STORY FORM
// ============================================================================

publishForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const adminKey = requireAdminKey(publishFeedback);
  if (!adminKey) return;

  const formData = new FormData(publishForm);
  const submitButton = publishForm.querySelector('button[type="submit"]');

  setFeedback(publishFeedback, 'Saving story…');
  submitButton.disabled = true;

  try {
    const status = formData.get('status');
    const result = await requestJson('/api/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({
        title: formData.get('title'),
        excerpt: formData.get('excerpt'),
        category: formData.get('category'),
        source: formData.get('source'),
        source_url: formData.get('sourceUrl'),
        image_url: formData.get('imageUrl'),
        story_type: formData.get('storyType'),
        status: status,
        is_featured: formData.get('isFeatured') === 'on',
        is_breaking: formData.get('isBreaking') === 'on',
      }),
    });

    setFeedback(
      publishFeedback,
      result.status === 'published'
        ? `✓ Story published live! (ID: ${result.id}). View it on the front page or article reader.`
        : `✓ Saved as draft (ID: ${result.id}). Available in the review queue.`,
      'success'
    );

    publishForm.reset();
    if (publishForm.elements.source) {
      publishForm.elements.source.value = 'News Nigeria';
    }

    if (status === 'published') {
      loadPublishedStories();
    } else {
      loadDrafts();
    }
  } catch (error) {
    setFeedback(publishFeedback, error.message || 'Unable to save story.', 'error');
  } finally {
    submitButton.disabled = false;
  }
});

// ============================================================================
// 5. EVENT LISTENERS & INITIALIZATION
// ============================================================================

loadPublishedBtn?.addEventListener('click', loadPublishedStories);
loadDraftsBtn?.addEventListener('click', loadDrafts);
loadSourcesBtn?.addEventListener('click', loadSources);

refreshAllBtn?.addEventListener('click', () => {
  loadPublishedStories();
  loadDrafts();
  loadSources();
});

// Auto-load all panels on initial page boot
document.addEventListener('DOMContentLoaded', () => {
  loadPublishedStories();
  loadDrafts();
  loadSources();
});
