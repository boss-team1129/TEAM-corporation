# Kimikea Connect Apps Script Index.html 最小置き換えパッチ

このファイルは、本番 Apps Script の `Index.html` にある実使用コードだけを置き換えるための手順です。`Code.gs` 全文や `Index.html` 全文の置き換えは不要です。

## 1. `openStylebookDetail` からカードクリック処理までを置き換え

### 検索する開始位置

```js
function openStylebookDetail(postId)
```

### 削除する範囲

`function openStylebookDetail(postId) { ... }` から、次のブロックの末尾までを削除します。

```js
if (!window.__myPageStyleCardClickBound) {
  ...
}
```

### 貼り付ける完成コード

```js
const KIMIKEA_STYLEBOOK_PUBLIC_URL =
  'https://boss-team1129.github.io/TEAM-corporation/kimikea-connect/stylebook/';

function buildMyPageStylebookUrl(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      query.set(key, String(value).trim());
    }
  });
  return `${KIMIKEA_STYLEBOOK_PUBLIC_URL}?${query.toString()}`;
}

function openStylebookDetail(postId) {
  const normalizedPostId = String(postId || '').trim();
  if (!normalizedPostId) return;

  window.location.href = buildMyPageStylebookUrl({
    view: 'detail',
    id: normalizedPostId
  });
}

function openStylebookMine() {
  const userId = currentMemberUserId();
  window.location.href = buildMyPageStylebookUrl({
    view: 'mine',
    userId
  });
}

function openMyPageStyleEdit(postId) {
  const normalizedPostId = String(postId || '').trim();
  if (!normalizedPostId) return;

  const userId = currentMemberUserId();
  window.location.href = buildMyPageStylebookUrl({
    view: 'edit',
    id: normalizedPostId,
    userId,
    returnTo: 'mine'
  });
}

function deleteMyPageStylePost(postId) {
  const normalizedPostId = String(postId || '').trim();
  if (!normalizedPostId) return;

  const ok = window.confirm('この投稿を削除しますか？');
  if (!ok) return;

  const userId = currentMemberUserId();

  fetch(STYLEBOOK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      api: 'deleteStylebookPost',
      postId: normalizedPostId,
      userId
    })
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.ok) {
        throw new Error(data.message || '削除できませんでした');
      }

      state.myPageStylebook.posts = (state.myPageStylebook.posts || [])
        .filter((post) => String(stylePostId(post) || '').trim() !== normalizedPostId);

      renderMyPageTab('posts');
    })
    .catch((error) => {
      alert(getErrorMessage(error) || '削除できませんでした。');
    });
}

function renderMyPageStyleCard(post, label = '投稿', showOwnerActions = false) {
  const postId = stylePostId(post);
  const imageUrl = firstStyleImage(post);
  const salonName = post.salonName || post.shopName || 'サロン名未設定';
  const staffName = post.staffName || post.authorName || '担当者未設定';
  const status = post.status === 'draft' || post.isPublished === false ? '下書き' : '公開';
  const ownerActions = showOwnerActions ? `
    <span class="mypage-style-owner-actions" data-owner-actions="1">
      <button type="button" onclick="event.preventDefault(); event.stopPropagation(); openMyPageStyleEdit('${escapeHtml(postId)}');">編集</button>
      <button type="button" onclick="event.preventDefault(); event.stopPropagation(); deleteMyPageStylePost('${escapeHtml(postId)}');">削除</button>
    </span>
  ` : '';

  return `
    <article class="mypage-list-card mypage-style-card"
      data-post-id="${escapeHtml(postId)}"
      data-owner-card="${showOwnerActions ? '1' : '0'}">
      <span class="mypage-style-thumb">
        ${imageUrl
          ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(post.title || salonName)}" loading="lazy" decoding="async">`
          : '<span class="history-empty">画像なし</span>'}
      </span>
      <span class="mypage-style-body">
        <header><strong>${escapeHtml(post.title || label)}</strong><span>${escapeHtml(status)}</span></header>
        <small>${escapeHtml(salonName)} / ${escapeHtml(staffName)}</small>
        <small>${escapeHtml(post.createdAt || post.updatedAt || '')}</small>
        ${ownerActions}
      </span>
    </article>
  `;
}

if (!window.__myPageStyleCardClickBound) {
  window.__myPageStyleCardClickBound = true;

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-owner-actions="1"]')) return;

    const card = e.target.closest('.mypage-style-card[data-post-id]');
    if (!card) return;

    e.preventDefault();
    e.stopPropagation();

    const postId = card.getAttribute('data-post-id');
    if (!postId) return;

    openStylebookDetail(postId);
  }, true);
}
```

## 2. `renderMyPageTab('posts')` の投稿カード生成部分を変更

### 検索するコード

```js
const cards = book.posts.map((post) => renderMyPageStyleCard(post, '自分の投稿')).join('');
```

### 置き換えるコード

```js
const cards = book.posts.map((post) => renderMyPageStyleCard(post, '自分の投稿', true)).join('');
```

### 同じ `posts` ブロック内で削除するコード

以下のクリックリスナーは、上の共通 click handler と重複するため削除します。

```js
target.querySelectorAll('.mypage-style-card[data-post-id]').forEach((card) => {
  card.addEventListener('click', () => {
    const postId = card.getAttribute('data-post-id');
    if (!postId) return;
    openStylebookDetail(postId);
  });
});
```

## 3. 保存したスタイル側は変更しない

保存したスタイル側は、次のままにします。

```js
const cards = book.savedPosts.map((post) => renderMyPageStyleCard(post, '保存したスタイル')).join('');
```

第3引数を渡さないため、編集・削除は表示されません。

## 4. CSSを追加

`Index.html` 内の `<style>` に以下を追加します。

```css
.mypage-style-owner-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.mypage-style-owner-actions button {
  min-height: 38px;
  border: 1px solid rgba(189, 147, 64, .28);
  border-radius: 999px;
  background: rgba(255, 255, 255, .94);
  color: #7a5a1f;
  font-weight: 900;
}

.mypage-style-owner-actions button:last-child {
  border-color: rgba(154, 69, 69, .28);
  background: #fff2f0;
  color: #9a4545;
}
```

