/*
  Kimikea Connect Apps Script HTML patch
  Purpose: add owner actions directly to the My Page "自分の投稿" cards.

  Apply this to the Apps Script HTML that currently contains:
  - renderMyPageTab(tab = 'profile')
  - renderMyPageStyleCard(post, label = '投稿')
  - window.__myPageStyleCardClickBound

  This file is not loaded by GitHub Pages. It is a precise patch reference for
  the Apps Script-delivered My Page screen that is visible on iPhone.
*/

const KIMIKEA_STYLEBOOK_PUBLIC_URL =
  'https://boss-team1129.github.io/TEAM-corporation/kimikea-connect/stylebook/';

function myPageStylebookUrl(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      query.set(key, String(value).trim());
    }
  });
  return `${KIMIKEA_STYLEBOOK_PUBLIC_URL}?${query.toString()}`;
}

function openMyPageStyleEdit(postId) {
  const userId = currentMemberUserId();
  window.location.href = myPageStylebookUrl({
    view: 'edit',
    id: postId,
    userId,
    returnTo: 'mine',
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
      userId,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (!data.ok) throw new Error(data.message || '削除できませんでした');
      state.myPageStylebook.posts = (state.myPageStylebook.posts || [])
        .filter((post) => String(stylePostId(post) || '').trim() !== normalizedPostId);
      renderMyPageTab('posts');
    })
    .catch((error) => {
      alert(getErrorMessage(error) || '削除できませんでした。');
    });
}

function renderMyPageStyleCard(post, label = '投稿') {
  const postId = stylePostId(post);
  const imageUrl = firstStyleImage(post);
  const salonName = post.salonName || post.shopName || 'サロン名未設定';
  const staffName = post.staffName || post.authorName || '担当者未設定';
  const status = post.status === 'draft' || post.isPublished === false ? '下書き' : '公開';
  const isOwnerPost = label === '自分の投稿';
  const ownerActions = isOwnerPost ? `
    <span class="mypage-style-owner-actions" data-owner-actions="1">
      <button type="button" onclick="event.preventDefault(); event.stopPropagation(); openMyPageStyleEdit('${escapeHtml(postId)}');">編集</button>
      <button type="button" onclick="event.preventDefault(); event.stopPropagation(); deleteMyPageStylePost('${escapeHtml(postId)}');">削除</button>
    </span>
  ` : '';

  return `
    <article class="mypage-list-card mypage-style-card"
      data-post-id="${escapeHtml(postId)}"
      data-owner-card="${isOwnerPost ? '1' : '0'}">
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

/*
  In renderMyPageTab('posts'), add OWNER VIEW v3 at the top of the posts content:

  target.innerHTML = `
    <div class="mypage-owner-version">OWNER VIEW v3</div>
    ...
  `;

  Also remove the old per-card click listener in the posts tab:
  target.querySelectorAll('.mypage-style-card[data-post-id]').forEach(...)

  Update the global card click handler so normal/saved cards can still open detail,
  while owner action buttons do not trigger detail navigation:

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-owner-actions="1"]')) return;
    const card = e.target.closest('.mypage-style-card[data-post-id]');
    if (!card) return;
    const postId = card.getAttribute('data-post-id');
    if (!postId) return;
    openStylebookDetail(postId);
  }, true);
*/
