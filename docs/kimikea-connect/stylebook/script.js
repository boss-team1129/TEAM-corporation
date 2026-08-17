const STORAGE_KEY = 'kimikea_stylebook_recipes_v2';
const STYLEBOOK_API_URL = 'https://script.google.com/macros/s/AKfycbwPJPYIHNtVXh8I1CCs7SAZT-Ow6JeHNnazz_YRrK4m_Rr_jjy7UYPJCJx19RcklLam/exec';
const urlParams = new URLSearchParams(window.location.search);

const sampleRecipes = [
  {
    id: 'sample-001',
    status: 'published',
    photo: '',
    name: 'ホワイトベージュイヤリング',
    treatmentType: 'イヤリングカラー',
    baseColor: 'ベージュブラウン',
    baseLevel: '9レベル',
    comment: '顔まわりに白っぽい透明感を出し、派手すぎず上品に見せるレシピ。',
    tags: ['初めて向け', '透明感', '職場OK'],
    difficulty: 2,
    salon: 'Kimikea Sample Salon',
    stylist: 'Mika',
    ownerId: 'sample',
    registeredAt: '2026-07-10',
    colors: [
      { category: 'ライトカラー', name: '18番', pieces: 6, swatch: '#e8dcc5' },
      { category: '原色', name: 'WHITE', pieces: 2, swatch: '#f9f8f2' }
    ],
    visual: {
      toneA: '#f3eadb',
      toneB: '#d8c5aa',
      hairBase: '#9f785b',
      accentOne: '#eee6d8',
      accentTwo: '#f9f8f2'
    }
  },
  {
    id: 'sample-002',
    status: 'published',
    photo: '',
    name: 'ナチュラルダーク長さ出し',
    treatmentType: '長さ出し',
    baseColor: 'ダークブラウン',
    baseLevel: '5レベル',
    comment: '地毛になじませて自然に長さを出す、初回提案にも使いやすいレシピ。',
    tags: ['自然仕上げ', '職場OK'],
    difficulty: 3,
    salon: 'Exteland Fuji',
    stylist: 'Kana',
    ownerId: 'sample',
    registeredAt: '2026-07-09',
    colors: [
      { category: 'ダークカラー', name: '4GB', pieces: 40, swatch: '#3a271f' }
    ],
    visual: {
      toneA: '#e9ded0',
      toneB: '#b8c9cf',
      hairBase: '#33251f',
      accentOne: '#4d382c',
      accentTwo: '#2b201b'
    }
  }
];

const state = {
  recipes: [],
  type: '',
  pieces: '',
  sort: 'new',
  search: '',
  currentPhoto: '',
  saveMode: 'published',
  currentUserRole: 'user',
  currentUserId: urlParams.get('userId') || urlParams.get('ownerId') || urlParams.get('memberId') || '',
  currentView: urlParams.get('view') || 'list',
  currentDetailId: urlParams.get('id') || '',
  manageMode: urlParams.get('manage') === '1',
  returnToDetailId: '',
  returnToView: ''
};

const recipeForm = document.getElementById('recipeForm');
const recipeId = document.getElementById('recipeId');
const recipeName = document.getElementById('recipeName');
const treatmentType = document.getElementById('treatmentType');
const baseColor = document.getElementById('baseColor');
const baseLevel = document.getElementById('baseLevel');
const salonName = document.getElementById('salonName');
const stylistName = document.getElementById('stylistName');
const comment = document.getElementById('comment');
const tagsInput = document.getElementById('tagsInput');
const difficulty = document.getElementById('difficulty');
const registeredAt = document.getElementById('registeredAt');
const photoInput = document.getElementById('photoInput');
const imagePreview = document.getElementById('imagePreview');
const colorRows = document.getElementById('colorRows');
const addColorButton = document.getElementById('addColorButton');
const totalPiecesPreview = document.getElementById('totalPiecesPreview');
const cancelEditButton = document.getElementById('cancelEditButton');
const formTitle = document.getElementById('formTitle');
const messageBox = document.getElementById('messageBox');
const draftButton = document.getElementById('draftButton');
const publishButton = document.getElementById('publishButton');
const recipeGrid = document.getElementById('recipeGrid');
const draftGrid = document.getElementById('draftGrid');
const resultCount = document.getElementById('resultCount');
const draftCount = document.getElementById('draftCount');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const resetButton = document.getElementById('resetButton');
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
const detailPanel = document.getElementById('detailPanel');
const pageSections = {
  hero: document.querySelector('.hero-card'),
  form: document.querySelector('.form-panel'),
  search: document.querySelector('.search-area'),
  resultHead: document.querySelector('.result-head'),
  grid: recipeGrid,
  draft: document.querySelector('.draft-section'),
  storage: document.querySelector('.storage-note')
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function getCurrentUserId() {
  return String(state.currentUserId || '').trim();
}

function getRecipeOwnerId(recipe) {
  return String(
    recipe?.authorId ||
    recipe?.createdByUserId ||
    recipe?.ownerId ||
    recipe?.userId ||
    recipe?.createdBy ||
    ''
  ).trim();
}

function toArrayValue(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch (error) {
    // Spreadsheet cells may contain newline/comma separated values.
  }
  return value.split(/[\n,]/).map(item => item.trim()).filter(Boolean);
}

function buildColorsFromPost(post) {
  const labels = [
    ...toArrayValue(post.colorLabels),
    ...toArrayValue(post.extensionColors),
    ...toArrayValue(post.colors),
    ...toArrayValue(post.colorCodes),
    ...toArrayValue(post.extensionColorIds)
  ].filter(Boolean);
  const count = Number(post.extensionCount || 0);
  if (!labels.length) {
    return count > 0 ? [{ category: '使用カラー', name: '登録カラー', pieces: count, swatch: '#d8c5aa' }] : [];
  }
  return labels.map((label, index) => ({
    category: '使用カラー',
    name: String(label),
    pieces: index === 0 ? count : 0,
    swatch: '#d8c5aa'
  }));
}

function normalizeStylebookPost(post) {
  const id = String(post?.id || post?.postId || post?.styleId || '').trim();
  const colors = Array.isArray(post?.colors) && post.colors.length && typeof post.colors[0] === 'object'
    ? post.colors
    : buildColorsFromPost(post || {});
  return {
    ...(post || {}),
    id,
    status: post?.status || (post?.isPublished === false ? 'draft' : 'published'),
    photo: post?.photo || post?.imageUrl || '',
    photoUrl: post?.photoUrl || post?.imageUrl || '',
    name: post?.name || post?.title || '',
    treatmentType: post?.treatmentType || post?.styleType || post?.styleTypeName || '投稿',
    baseColor: post?.baseColor || '',
    baseLevel: post?.baseLevel || '',
    comment: post?.comment || post?.description || '',
    tags: toArrayValue(post?.tags),
    salon: post?.salon || post?.salonName || post?.shopName || '',
    stylist: post?.stylist || post?.staffName || post?.authorName || '',
    ownerId: getRecipeOwnerId(post),
    registeredAt: post?.registeredAt || post?.createdAt || '',
    updatedAt: post?.updatedAt || '',
    colors
  };
}

function showMessage(messages, type = 'error') {
  const list = Array.isArray(messages) ? messages : [messages];
  messageBox.innerHTML = list.map(message => `<p>${message}</p>`).join('');
  messageBox.dataset.type = type;
  messageBox.hidden = false;
  messageBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideMessage() {
  messageBox.hidden = true;
  messageBox.innerHTML = '';
}

async function loadRecipes() {
  if (STYLEBOOK_API_URL) {
    try {
      const params = new URLSearchParams({ action: 'database', t: String(Date.now()) });
      const currentUserId = getCurrentUserId();
      if (currentUserId) params.set('userId', currentUserId);
      const response = await fetch(`${STYLEBOOK_API_URL}?${params.toString()}`);
      const data = await response.json();
      const posts = data.recipes || data.stylePosts || data.database?.stylePosts || [];
      state.recipes = posts.map(normalizeStylebookPost).filter(recipe => recipe.id);
      return;
    } catch (error) {
      showMessage('オンライン保存先に接続できませんでした。端末内のデータを表示します。');
    }
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  state.recipes = saved ? JSON.parse(saved) : sampleRecipes;
}

async function persistRecipe(recipe) {
  const existing = state.recipes.find(item => item.id === recipe.id);
  if (existing && !isOwnPostManagementContext() && !state.manageMode && !canManage(existing)) {
    throw new Error('自分の投稿だけ編集できます。');
  }

  if (STYLEBOOK_API_URL) {
    const response = await fetch(STYLEBOOK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        api: 'updateStylebookPost',
        postId: recipe.id,
        userId: getCurrentUserId(),
        post: recipe
      })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || '保存できませんでした');
    recipe.id = data.id || recipe.id;
  }

  const index = state.recipes.findIndex(item => item.id === recipe.id);
  if (index >= 0) state.recipes[index] = recipe;
  else state.recipes.unshift(recipe);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.recipes));
}

async function persistDelete(id) {
  if (STYLEBOOK_API_URL) {
    const response = await fetch(STYLEBOOK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        api: 'deleteStylebookPost',
        postId: id,
        userId: getCurrentUserId()
      })
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || '削除できませんでした');
  }
  state.recipes = state.recipes.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.recipes));
}

function getTotalPieces(recipe) {
  return (recipe.colors || []).reduce((total, color) => total + Number(color.pieces || 0), 0);
}

function matchPieceRange(total, range) {
  if (!range) return true;
  if (range === '1-4') return total >= 1 && total <= 4;
  if (range === '5-10') return total >= 5 && total <= 10;
  if (range === '11-20') return total >= 11 && total <= 20;
  if (range === '21+') return total >= 21;
  return true;
}

function recipeMatchesSearch(recipe, search) {
  if (!search) return true;
  const normalized = search.toLowerCase();
  const totalPieces = getTotalPieces(recipe);
  const text = [
    recipe.name,
    recipe.treatmentType,
    recipe.baseColor,
    recipe.baseLevel,
    recipe.comment,
    recipe.salon,
    recipe.stylist,
    `${totalPieces}本`,
    ...(recipe.tags || []),
    ...(recipe.colors || []).flatMap(color => [color.category, color.name, `${color.pieces}本`])
  ].join(' ').toLowerCase();
  return text.includes(normalized);
}

function getPublishedRecipes() {
  const filtered = state.recipes.filter(recipe => (
    recipe.status === 'published' &&
    (!state.type || recipe.treatmentType === state.type) &&
    matchPieceRange(getTotalPieces(recipe), state.pieces) &&
    recipeMatchesSearch(recipe, state.search)
  ));

  return filtered.sort((a, b) => {
    if (state.sort === 'piecesAsc') return getTotalPieces(a) - getTotalPieces(b);
    if (state.sort === 'piecesDesc') return getTotalPieces(b) - getTotalPieces(a);
    return new Date(b.registeredAt) - new Date(a.registeredAt);
  });
}

function getDraftRecipes() {
  return state.recipes
    .filter(recipe => recipe.status === 'draft')
    .sort((a, b) => new Date(b.updatedAt || b.registeredAt) - new Date(a.updatedAt || a.registeredAt));
}

function makeVisualFromColors(colors) {
  const first = colors[0]?.swatch || '#d8c5aa';
  const second = colors[1]?.swatch || first;
  return {
    toneA: '#f3eadb',
    toneB: '#d9e6e9',
    hairBase: first,
    accentOne: second,
    accentTwo: colors[2]?.swatch || second
  };
}

function renderPhoto(recipe) {
  if (recipe.photo || recipe.photoUrl) {
    return `<img src="${recipe.photo || recipe.photoUrl}" alt="${recipe.name || '施術写真'}">`;
  }
  const visual = recipe.visual || makeVisualFromColors(recipe.colors || []);
  return `
    <div
      class="recipe-photo-illustration"
      style="--tone-a: ${visual.toneA}; --tone-b: ${visual.toneB}; --hair-base: ${visual.hairBase}; --accent-one: ${visual.accentOne}; --accent-two: ${visual.accentTwo};"
      aria-label="仮画像"
    >
      <div class="hair-shape" aria-hidden="true"></div>
      <div class="face-shape" aria-hidden="true"></div>
    </div>
  `;
}

function canManage(recipe) {
  const currentUserId = getCurrentUserId();
  return Boolean(currentUserId && getRecipeOwnerId(recipe) === currentUserId);
}

function canShowManageActions() {
  return false;
}

function isOwnPostManagementView() {
  return state.currentView === 'mine';
}

function isOwnPostManagementContext() {
  return isOwnPostManagementView() || state.returnToView === 'mine';
}

function getMineRecipes() {
  const recipes = state.recipes.filter(recipe => recipe.status === 'published' || recipe.status === 'draft');
  const currentUserId = getCurrentUserId();
  if (!currentUserId) return [];
  return recipes.filter(recipe => getRecipeOwnerId(recipe) === currentUserId);
}

function renderRecipe(recipe, options = {}) {
  const totalPieces = getTotalPieces(recipe);
  const title = recipe.name || `${recipe.treatmentType || '未選択'} レシピ`;
  const colorRowsHtml = (recipe.colors || []).map(color => `
    <div class="color-row">
      <span class="swatch" style="--swatch: ${color.swatch || '#d8c5aa'};" aria-hidden="true"></span>
      <span class="color-name">
        <strong>${color.category || 'カテゴリー未選択'} ${color.name || '色未入力'}</strong>
        <span>使用本数</span>
      </span>
      <span class="piece-count">${color.pieces || 0}本</span>
    </div>
  `).join('');
  const actionButtons = options.showOwnerActions ? `
    <div class="card-actions owner-card-actions">
      <button type="button" data-action="edit" data-id="${escapeHtml(recipe.id)}">編集</button>
      <button type="button" data-action="delete" data-id="${escapeHtml(recipe.id)}">削除</button>
    </div>
  ` : '';

  return `
    <article class="recipe-card ${recipe.status === 'draft' ? 'is-draft' : ''}" data-id="${escapeHtml(recipe.id)}">
      <div class="recipe-photo">
        <span class="type-badge">${recipe.status === 'draft' ? '下書き' : recipe.treatmentType}</span>
        ${renderPhoto(recipe)}
      </div>

      <div class="recipe-body">
        <div class="recipe-title-row">
          <div>
            <p class="recipe-id">${recipe.id}</p>
            <h3>${title}</h3>
          </div>
          <span class="total-pieces">合計 ${totalPieces}本</span>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span>施術タイプ</span>
            <strong>${recipe.treatmentType || '未入力'}</strong>
          </div>
          <div class="meta-item">
            <span>ベースレベル</span>
            <strong>${recipe.baseLevel || '未入力'}</strong>
          </div>
        </div>

        <div class="color-list" aria-label="使用カラーと本数">
          ${colorRowsHtml || '<p class="impression">使用カラー未入力</p>'}
        </div>

        <p class="impression">${recipe.comment || 'コメント未入力'}</p>

        <div class="staff-row">
          <span>担当サロン：<strong>${recipe.salon || '未入力'}</strong></span>
          <span>担当者：<strong>${recipe.stylist || '未入力'}</strong></span>
          <span>登録日：<strong>${recipe.registeredAt || '未入力'}</strong></span>
        </div>

        ${actionButtons}
      </div>
    </article>
  `;
}

function setSectionVisibility(mode) {
  const isDetail = mode === 'detail';
  const isEdit = mode === 'edit';
  const isMine = mode === 'mine';
  detailPanel.hidden = !isDetail;
  pageSections.hero.hidden = isDetail || isEdit || isMine;
  pageSections.form.hidden = isDetail || isMine;
  pageSections.search.hidden = isDetail || isEdit || isMine;
  pageSections.resultHead.hidden = isDetail || isEdit;
  pageSections.grid.hidden = isDetail || isEdit;
  pageSections.draft.hidden = isDetail || isEdit || isMine;
  pageSections.storage.hidden = isDetail || isEdit || isMine;
}

function updateLocationForView(view, id = '') {
  const url = new URL(window.location.href);
  if (view === 'detail' && id) {
    url.searchParams.set('view', 'detail');
    url.searchParams.set('id', id);
    if (state.manageMode) url.searchParams.set('manage', '1');
    else url.searchParams.delete('manage');
    const currentUserId = getCurrentUserId();
    if (currentUserId) url.searchParams.set('userId', currentUserId);
  } else if (view === 'mine') {
    url.searchParams.set('view', 'mine');
    url.searchParams.delete('id');
    url.searchParams.delete('manage');
    const currentUserId = getCurrentUserId();
    if (currentUserId) url.searchParams.set('userId', currentUserId);
  } else {
    url.searchParams.delete('view');
    url.searchParams.delete('id');
    url.searchParams.delete('manage');
  }
  window.history.replaceState({}, '', url);
}

function renderDetail() {
  const recipe = state.recipes.find(item => item.id === state.currentDetailId);
  setSectionVisibility('detail');

  if (!recipe) {
    detailPanel.innerHTML = `
      <button class="detail-back-button" type="button" data-action="back-list">一覧へ戻る</button>
      <div class="empty-state">投稿が見つかりませんでした。</div>
    `;
    return;
  }

  const totalPieces = getTotalPieces(recipe);
  const title = recipe.name || `${recipe.treatmentType || '未選択'} レシピ`;
  const colorRowsHtml = (recipe.colors || []).map(color => `
    <div class="color-row">
      <span class="swatch" style="--swatch: ${escapeHtml(color.swatch || '#d8c5aa')};" aria-hidden="true"></span>
      <span class="color-name">
        <strong>${escapeHtml(color.category || 'カテゴリー未選択')} ${escapeHtml(color.name || '色未入力')}</strong>
        <span>使用本数</span>
      </span>
      <span class="piece-count">${escapeHtml(color.pieces || 0)}本</span>
    </div>
  `).join('');
  const actionButtons = canShowManageActions() ? `
    <div class="detail-actions">
      <button type="button" data-action="edit-detail" data-id="${escapeHtml(recipe.id)}">編集する</button>
      <button type="button" data-action="delete-detail" data-id="${escapeHtml(recipe.id)}">削除する</button>
    </div>
  ` : '';

  detailPanel.innerHTML = `
    <button class="detail-back-button" type="button" data-action="back-list">一覧へ戻る</button>
    <article class="detail-hero">
      <div class="recipe-photo">
        <span class="type-badge">${escapeHtml(recipe.status === 'draft' ? '下書き' : recipe.treatmentType || '投稿')}</span>
        ${renderPhoto(recipe)}
      </div>
      <div class="detail-body">
        <div>
          <p class="recipe-id">${escapeHtml(recipe.id)}</p>
          <h2>${escapeHtml(title)}</h2>
        </div>
        <div class="detail-meta">
          <div class="meta-item">
            <span>施術タイプ</span>
            <strong>${escapeHtml(recipe.treatmentType || '未入力')}</strong>
          </div>
          <div class="meta-item">
            <span>合計本数</span>
            <strong>${escapeHtml(totalPieces)}本</strong>
          </div>
          <div class="meta-item">
            <span>ベースの髪色</span>
            <strong>${escapeHtml(recipe.baseColor || '未入力')}</strong>
          </div>
          <div class="meta-item">
            <span>ベースレベル</span>
            <strong>${escapeHtml(recipe.baseLevel || '未入力')}</strong>
          </div>
        </div>
        <div class="color-list" aria-label="使用カラーと本数">
          ${colorRowsHtml || '<p class="impression">使用カラー未入力</p>'}
        </div>
        <p class="impression">${escapeHtml(recipe.comment || 'コメント未入力')}</p>
        <div class="staff-row">
          <span>担当サロン：<strong>${escapeHtml(recipe.salon || '未入力')}</strong></span>
          <span>担当者：<strong>${escapeHtml(recipe.stylist || '未入力')}</strong></span>
          <span>登録日：<strong>${escapeHtml(recipe.registeredAt || '未入力')}</strong></span>
        </div>
        ${actionButtons}
      </div>
    </article>
  `;
}

function render() {
  if (state.currentView === 'detail') {
    renderDetail();
    return;
  }

  setSectionVisibility(state.currentView === 'edit' ? 'edit' : (isOwnPostManagementView() ? 'mine' : 'list'));
  const resultTitle = document.querySelector('.result-head h2');
  const resultDescription = document.querySelector('.result-head p');

  if (isOwnPostManagementView()) {
    const mine = getMineRecipes();
    if (resultTitle) resultTitle.textContent = '自分の投稿';
    if (resultDescription) resultDescription.textContent = 'この画面に表示されている投稿だけ編集・削除できます。';
    resultCount.textContent = `${mine.length}件`;
    recipeGrid.innerHTML = mine.length
      ? mine.map(recipe => renderRecipe(recipe, { showOwnerActions: true })).join('')
      : `<div class="empty-state">${getCurrentUserId() ? '自分の投稿はまだありません。' : 'マイページの投稿履歴から開いてください。'}</div>`;
    return;
  }

  if (resultTitle) resultTitle.textContent = '公開レシピ一覧';
  if (resultDescription) resultDescription.textContent = '投稿済みのレシピが表示されます。';
  const published = getPublishedRecipes();
  const drafts = getDraftRecipes();
  resultCount.textContent = `${published.length}件`;
  draftCount.textContent = `${drafts.length}件`;
  recipeGrid.innerHTML = published.length
    ? published.map(renderRecipe).join('')
    : '<div class="empty-state">公開済みレシピはまだありません。「投稿する」で公開できます。</div>';
  draftGrid.innerHTML = drafts.length
    ? drafts.map(renderRecipe).join('')
    : '<div class="empty-state">下書きはありません。</div>';
}

function updateButtonStates() {
  filterButtons.forEach(button => {
    const key = button.dataset.filter;
    button.classList.toggle('is-selected', state[key] === button.dataset.value);
  });
}

function updateImagePreview() {
  if (!state.currentPhoto) {
    imagePreview.innerHTML = '<span>写真プレビュー</span>';
    imagePreview.classList.remove('has-image');
    return;
  }
  imagePreview.innerHTML = `<img src="${state.currentPhoto}" alt="選択した施術写真">`;
  imagePreview.classList.add('has-image');
}

function addColorRow(color = {}) {
  const row = document.createElement('div');
  row.className = 'color-input-row';
  row.innerHTML = `
    <label>
      <span>カテゴリー</span>
      <select class="color-category">
        <option value="">選択</option>
        <option ${color.category === 'ダークカラー' ? 'selected' : ''}>ダークカラー</option>
        <option ${color.category === 'ライトカラー' ? 'selected' : ''}>ライトカラー</option>
        <option ${color.category === '原色' ? 'selected' : ''}>原色</option>
      </select>
    </label>
    <label>
      <span>カラー名・番号</span>
      <input class="color-name-input" type="text" value="${color.name || ''}" placeholder="例：18番 / WHITE">
    </label>
    <label>
      <span>本数</span>
      <input class="color-pieces-input" type="number" min="1" step="1" value="${color.pieces || ''}" placeholder="6">
    </label>
    <label>
      <span>色見本</span>
      <input class="color-swatch-input" type="color" value="${color.swatch || '#d8c5aa'}">
    </label>
    <button class="remove-color-button" type="button">削除</button>
  `;
  row.querySelector('.remove-color-button').addEventListener('click', () => {
    row.remove();
    updateTotalPreview();
  });
  row.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', updateTotalPreview);
    input.addEventListener('change', updateTotalPreview);
  });
  colorRows.appendChild(row);
  updateTotalPreview();
}

function getFormColors() {
  return Array.from(colorRows.querySelectorAll('.color-input-row')).map(row => ({
    category: row.querySelector('.color-category').value,
    name: row.querySelector('.color-name-input').value.trim(),
    pieces: Number(row.querySelector('.color-pieces-input').value || 0),
    swatch: row.querySelector('.color-swatch-input').value
  })).filter(color => color.category || color.name || color.pieces > 0);
}

function getCompleteColors() {
  return getFormColors().filter(color => color.category && color.name && color.pieces > 0);
}

function updateTotalPreview() {
  const total = getFormColors().reduce((sum, color) => sum + Number(color.pieces || 0), 0);
  totalPiecesPreview.textContent = `${total}本`;
}

function clearForm(renderAfter = true) {
  const returnToView = state.returnToView;
  recipeForm.reset();
  recipeId.value = '';
  registeredAt.value = today();
  state.currentPhoto = '';
  state.returnToDetailId = '';
  state.returnToView = '';
  state.currentView = returnToView === 'mine' ? 'mine' : 'list';
  state.manageMode = false;
  colorRows.innerHTML = '';
  addColorRow();
  updateImagePreview();
  formTitle.textContent = '新規レシピ';
  publishButton.textContent = '投稿する';
  cancelEditButton.hidden = true;
  hideMessage();
  updateLocationForView(state.currentView);
  if (renderAfter) render();
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getTags() {
  return tagsInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);
}

function validatePublish() {
  const errors = [];
  const colors = getCompleteColors();
  if (!state.currentPhoto) errors.push('施術写真を選択してください。');
  if (!treatmentType.value) errors.push('施術タイプを選択してください。');
  if (!colors.length) errors.push('使用カラーと本数を1色以上入力してください。');
  if (getFormColors().length !== colors.length) errors.push('使用カラーは、カテゴリー・カラー名・本数をすべて入力してください。');
  return errors;
}

function buildRecipe(status) {
  const colors = status === 'published' ? getCompleteColors() : getFormColors();
  const id = recipeId.value || `recipe-${Date.now()}`;
  const existing = state.recipes.find(item => item.id === id);
  return {
    id,
    status,
    photo: state.currentPhoto,
    name: recipeName.value.trim(),
    treatmentType: treatmentType.value,
    baseColor: baseColor.value.trim(),
    baseLevel: baseLevel.value.trim(),
    comment: comment.value.trim(),
    tags: getTags(),
    difficulty: difficulty.value ? Number(difficulty.value) : '',
    salon: salonName.value.trim(),
    stylist: stylistName.value.trim(),
    ownerId: existing ? getRecipeOwnerId(existing) : state.currentUserId,
    registeredAt: registeredAt.value || existing?.registeredAt || today(),
    updatedAt: new Date().toISOString(),
    colors,
    visual: makeVisualFromColors(colors)
  };
}

async function saveCurrentRecipe(status) {
  hideMessage();
  if (status === 'published') {
    const errors = validatePublish();
    if (errors.length) {
      showMessage(errors);
      return;
    }
  } else {
    const hasAnyInput =
      state.currentPhoto ||
      treatmentType.value ||
      recipeName.value.trim() ||
      salonName.value.trim() ||
      stylistName.value.trim() ||
      getFormColors().length;
    if (!hasAnyInput) {
      showMessage('下書き保存する内容がありません。写真だけでも選択すると保存できます。');
      return;
    }
  }

  const isEditing = Boolean(recipeId.value);
  const recipe = buildRecipe(status);
  try {
    await persistRecipe(recipe);
    const returnToDetailId = state.returnToDetailId;
    const returnToView = state.returnToView;
    clearForm(false);
    if (returnToDetailId) {
      state.currentView = 'detail';
      state.currentDetailId = recipe.id;
      updateLocationForView('detail', recipe.id);
    } else {
      state.currentView = returnToView === 'mine' ? 'mine' : 'list';
      state.currentDetailId = '';
      updateLocationForView(state.currentView);
    }
    render();
    if (state.currentView === 'detail') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      showMessage(
        isEditing ? '変更を保存しました。一覧に反映しました。' : (status === 'published' ? '投稿しました。一覧に反映しました。' : '下書き保存しました。'),
        'success'
      );
    }
  } catch (error) {
    showMessage(error.message || '保存できませんでした。');
  }
}

function editRecipe(id) {
  const recipe = state.recipes.find(item => item.id === id);
  if (!recipe || !(isOwnPostManagementContext() || canManage(recipe) || canShowManageActions())) return;
  const wasMineView = isOwnPostManagementView();
  state.currentView = 'edit';
  state.returnToDetailId = state.currentDetailId === id ? id : '';
  state.returnToView = wasMineView ? 'mine' : '';
  setSectionVisibility('edit');
  recipeId.value = recipe.id;
  recipeName.value = recipe.name || '';
  treatmentType.value = recipe.treatmentType || '';
  baseColor.value = recipe.baseColor || '';
  baseLevel.value = recipe.baseLevel || '';
  salonName.value = recipe.salon || '';
  stylistName.value = recipe.stylist || '';
  comment.value = recipe.comment || '';
  tagsInput.value = (recipe.tags || []).join(', ');
  difficulty.value = recipe.difficulty || '';
  registeredAt.value = recipe.registeredAt || today();
  state.currentPhoto = recipe.photo || recipe.photoUrl || '';
  colorRows.innerHTML = '';
  (recipe.colors || []).forEach(color => addColorRow(color));
  if (!recipe.colors?.length) addColorRow();
  updateImagePreview();
  formTitle.textContent = recipe.status === 'draft' ? '下書き編集' : '公開レシピ編集';
  publishButton.textContent = '変更を保存';
  cancelEditButton.hidden = false;
  hideMessage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteRecipe(id) {
  const recipe = state.recipes.find(item => item.id === id);
  if (!recipe || !(isOwnPostManagementView() || canManage(recipe) || canShowManageActions())) return;
  const ok = window.confirm('この投稿を削除しますか？この操作は元に戻せません。');
  if (!ok) return;
  try {
    await persistDelete(id);
    state.currentView = isOwnPostManagementView() ? 'mine' : 'list';
    state.currentDetailId = '';
    state.returnToDetailId = '';
    state.returnToView = '';
    updateLocationForView(state.currentView);
    render();
  } catch (error) {
    showMessage(error.message || '削除できませんでした。');
  }
}

async function init() {
  registeredAt.value = today();
  addColorRow();
  await loadRecipes();
  render();
}

photoInput.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    state.currentPhoto = await resizeImage(file);
    updateImagePreview();
  } catch (error) {
    showMessage('画像を読み込めませんでした。別の写真を選択してください。');
  }
});

addColorButton.addEventListener('click', () => addColorRow());
cancelEditButton.addEventListener('click', clearForm);
draftButton.addEventListener('click', () => saveCurrentRecipe('draft'));
publishButton.addEventListener('click', () => {
  state.saveMode = 'published';
});
recipeForm.addEventListener('submit', event => {
  event.preventDefault();
  saveCurrentRecipe('published');
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    const key = button.dataset.filter;
    const value = button.dataset.value;
    state[key] = state[key] === value ? '' : value;
    updateButtonStates();
    render();
  });
});

searchInput.addEventListener('input', event => {
  state.search = event.target.value.trim();
  render();
});

sortSelect.addEventListener('change', event => {
  state.sort = event.target.value;
  render();
});

resetButton.addEventListener('click', () => {
  state.type = '';
  state.pieces = '';
  state.sort = 'new';
  state.search = '';
  searchInput.value = '';
  sortSelect.value = 'new';
  updateButtonStates();
  render();
});

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (button) {
    if (button.dataset.action === 'edit') editRecipe(button.dataset.id);
    if (button.dataset.action === 'delete') deleteRecipe(button.dataset.id);
    if (button.dataset.action === 'edit-detail') editRecipe(button.dataset.id);
    if (button.dataset.action === 'delete-detail') deleteRecipe(button.dataset.id);
    if (button.dataset.action === 'back-list') {
      state.currentView = 'list';
      state.currentDetailId = '';
      updateLocationForView('list');
      render();
    }
    return;
  }

  const card = event.target.closest('.recipe-card[data-id]');
  if (!card) return;
  state.currentView = 'detail';
  state.currentDetailId = card.dataset.id;
  updateLocationForView('detail', card.dataset.id);
  render();
});

init();
