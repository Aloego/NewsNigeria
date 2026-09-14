const form = document.getElementById('publish-story-form');
const feedback = document.getElementById('publish-story-feedback');
const importPunchButton = document.getElementById('import-punch-button');
const importBusinessDayButton = document.getElementById('import-businessday-button');
const importThisDayButton = document.getElementById('import-thisday-button');
const importLindaIkejiButton = document.getElementById('import-lindaikeji-button');
const loadDraftsButton = document.getElementById('load-drafts-button');
const reviewQueueList = document.getElementById('review-queue-list');
const categories = ['News', 'National', 'Politics', 'Business', 'Economy', 'Technology', 'Health', 'Education', 'Sports', 'Entertainment', 'Environment', 'Agriculture', 'Community', 'Crime & Security'];

function getAdminKey() {
  return form?.elements.adminKey.value.trim();
}

function requireAdminKey() {
  const adminKey = getAdminKey();
  if (adminKey) return adminKey;
  feedback.textContent = 'Enter your admin key first.';
  feedback.className = 'admin-feedback error';
  form?.elements.adminKey.focus();
  return null;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('The NewsNigeria API is unavailable. Start or restart node server.js, then try again.');
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

async function loadDrafts() {
  const adminKey = requireAdminKey();
  if (!adminKey) return;
  reviewQueueList.textContent = 'Loading drafts…';

  try {
    const stories = await requestJson('/api/admin/stories?status=draft', { headers: { 'x-admin-key': adminKey } });
    reviewQueueList.replaceChildren();
    if (!stories.length) {
      reviewQueueList.textContent = 'There are no stories waiting for review.';
      return;
    }
    reviewQueueList.append(...stories.map(createReviewCard));
  } catch (error) {
    reviewQueueList.textContent = error.message || 'Unable to load drafts.';
  }
}

function createReviewCard(story) {
  const card = document.createElement('article');
  card.className = 'review-card';
  const reviewForm = document.createElement('form');
  reviewForm.className = 'review-form';

  const title = document.createElement('input');
  title.name = 'title'; title.value = story.title; title.required = true;
  const excerpt = document.createElement('textarea');
  excerpt.name = 'excerpt'; excerpt.rows = 3; excerpt.value = story.excerpt; excerpt.required = true;
  const category = document.createElement('select');
  category.name = 'category';
  categories.forEach((value) => {
    const option = new Option(value, value, false, value === story.category);
    category.add(option);
  });
  if (!category.value) category.add(new Option(story.category, story.category, true, true), 0);
  const source = document.createElement('input');
  source.name = 'source'; source.value = story.source; source.required = true;
  const sourceUrl = document.createElement('input');
  sourceUrl.name = 'sourceUrl'; sourceUrl.type = 'url'; sourceUrl.value = story.source_url || '';
  const imageUrl = document.createElement('input');
  imageUrl.name = 'imageUrl'; imageUrl.type = 'url'; imageUrl.value = story.image_url || '';
  const isFeatured = document.createElement('input'); isFeatured.name = 'isFeatured'; isFeatured.type = 'checkbox'; isFeatured.checked = Boolean(story.is_featured);
  const isBreaking = document.createElement('input'); isBreaking.name = 'isBreaking'; isBreaking.type = 'checkbox'; isBreaking.checked = Boolean(story.is_breaking);

  reviewForm.append(
    reviewField('Headline', title), reviewField('Summary', excerpt),
    reviewField('Category', category), reviewField('Source', source),
    reviewField('Original link', sourceUrl), reviewField('Image link', imageUrl),
    reviewField('Feature in homepage lead area', isFeatured), reviewField('Show in breaking-news ticker', isBreaking),
  );

  const actions = document.createElement('div');
  actions.className = 'review-actions';
  const approve = document.createElement('button'); approve.type = 'submit'; approve.className = 'admin-submit'; approve.textContent = 'Approve & publish';
  const save = document.createElement('button'); save.type = 'button'; save.className = 'admin-secondary-button'; save.textContent = 'Save edits';
  const reject = document.createElement('button'); reject.type = 'button'; reject.className = 'review-reject-button'; reject.textContent = 'Reject';
  actions.append(approve, save, reject);
  reviewForm.append(actions);

  const update = async (status) => {
    const adminKey = requireAdminKey();
    if (!adminKey || !reviewForm.reportValidity()) return;
    const data = new FormData(reviewForm);
    const result = await requestJson(`/api/stories/${story.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
      body: JSON.stringify({ title: data.get('title'), excerpt: data.get('excerpt'), category: data.get('category'), source: data.get('source'), source_url: data.get('sourceUrl'), image_url: data.get('imageUrl'), is_featured: data.get('isFeatured') === 'on', is_breaking: data.get('isBreaking') === 'on', status }),
    });
    card.remove();
    feedback.textContent = status === 'published' ? 'Story approved and published.' : 'Draft edits saved.';
    feedback.className = 'admin-feedback success';
    if (!reviewQueueList.children.length) reviewQueueList.textContent = 'There are no stories waiting for review.';
  };
  reviewForm.addEventListener('submit', async (event) => { event.preventDefault(); try { await update('published'); } catch (error) { feedback.textContent = error.message; feedback.className = 'admin-feedback error'; } });
  save.addEventListener('click', async () => { try { await update('draft'); } catch (error) { feedback.textContent = error.message; feedback.className = 'admin-feedback error'; } });
  reject.addEventListener('click', async () => {
    if (!window.confirm('Reject and remove this draft?')) return;
    const adminKey = requireAdminKey(); if (!adminKey) return;
    try {
      const response = await fetch(`/api/stories/${story.id}`, { method: 'DELETE', headers: { 'x-admin-key': adminKey } });
      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const result = contentType.includes('application/json') ? await response.json() : null;
        throw new Error(result?.error || 'The NewsNigeria API is unavailable. Start or restart node server.js, then try again.');
      }
      card.remove(); feedback.textContent = 'Draft rejected.'; feedback.className = 'admin-feedback success';
    } catch (error) { feedback.textContent = error.message; feedback.className = 'admin-feedback error'; }
  });
  card.append(reviewForm);
  return card;
}

function reviewField(labelText, field) {
  const label = document.createElement('label');
  label.textContent = labelText;
  label.append(field);
  return label;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  const adminKey = formData.get('adminKey');

  feedback.textContent = 'Saving story…';
  feedback.className = 'admin-feedback';
  submitButton.disabled = true;

  try {
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
        status: formData.get('status'),
        is_featured: formData.get('isFeatured') === 'on',
        is_breaking: formData.get('isBreaking') === 'on',
      }),
    });

    feedback.textContent = result.status === 'published'
      ? 'Story published. It will appear in Latest News after the homepage is refreshed.'
      : 'Draft saved.';
    feedback.className = 'admin-feedback success';
    form.reset();
    form.elements.source.value = 'NewsNigeria';
  } catch (error) {
    feedback.textContent = error.message || 'Unable to save story.';
    feedback.className = 'admin-feedback error';
  } finally {
    submitButton.disabled = false;
  }
});

async function importFeed(sourceId, sourceName, button) {
  const adminKey = requireAdminKey();
  if (!adminKey) return;

  button.disabled = true;
  feedback.textContent = `Importing the latest ${sourceName} headlines…`;
  feedback.className = 'admin-feedback';

  try {
    const result = await requestJson(`/api/imports/${sourceId}`, {
      method: 'POST',
      headers: { 'x-admin-key': adminKey },
    });

    feedback.textContent = `${result.imported} ${sourceName} ${result.imported === 1 ? 'story' : 'stories'} added to the review queue; ${result.skipped} already existed or could not be read.`;
    feedback.className = 'admin-feedback success';
    loadDrafts();
  } catch (error) {
    feedback.textContent = error.message || 'Unable to import stories.';
    feedback.className = 'admin-feedback error';
  } finally {
    button.disabled = false;
  }
}

importPunchButton?.addEventListener('click', () => {
  importFeed('punch', 'Punch', importPunchButton);
});

importBusinessDayButton?.addEventListener('click', () => {
  importFeed('businessday', 'BusinessDay', importBusinessDayButton);
});

importThisDayButton?.addEventListener('click', () => {
  importFeed('thisday', 'THISDAY', importThisDayButton);
});

importLindaIkejiButton?.addEventListener('click', () => {
  importFeed('lindaikeji', "Linda Ikeji's Blog", importLindaIkejiButton);
});


loadDraftsButton?.addEventListener('click', loadDrafts);
