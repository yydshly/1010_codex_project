import { ARTICLES, EFFECTS, LICENSE, renderMarkdown } from './content.js';

const STORAGE_KEY = 'sakura-research-lane:collection:v1';
const ids = new Set(ARTICLES.map((article) => article.id));

export function setupBusiness() {
  const dialog = document.querySelector('#research-dialog');
  const content = document.querySelector('#dialog-content');
  const kicker = document.querySelector('#dialog-kicker');
  const toast = document.querySelector('#toast');
  let world;
  let saved = new Set(), persistent = true, toastTimer;
  let panel = 'shop', returnPanel = 'shop', shopVisited = false;
  const read = new Set();
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(value)) saved = new Set(value.filter((id) => ids.has(id)));
  } catch { persistent = false; }

  function notify(message) {
    toast.textContent = message; toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
    const feedback = dialog.querySelector('#dialog-feedback');
    if (feedback) feedback.textContent = message;
  }
  function sync() {
    document.querySelector('#collection-count').textContent = saved.size;
    document.querySelector('#collection-summary').textContent = saved.size ? '已有 ' + saved.size + ' 份资料，随时回来阅读' : '收藏一份值得回看的研究';
    document.querySelectorAll('[data-save]').forEach((button) => {
      const article = ARTICLES.find((entry) => entry.id === button.dataset.save);
      const checked = saved.has(article.id);
      button.setAttribute('aria-pressed', String(checked));
      button.textContent = checked ? '✓ 已收藏' : '+ 收藏';
      button.setAttribute('aria-label', (checked ? '取消收藏：' : '收藏：') + article.title);
    });
    document.querySelector('#journey-progress').textContent = shopVisited && read.size && saved.size ? '已浏览、阅读并收藏' : read.size ? '已阅读 ' + read.size + ' 个章节' : shopVisited ? '已进入研究商店' : '尚未开始';
    world?.setCollection(saved.size > 0);
  }
  function cards(entries) {
    return entries.map((article) => '<article class="research-card"><div class="card-art"><img src="' + article.image + '" alt="' + article.tag + '：本地最小演示实拍" loading="lazy" /><span>' + article.tag + '</span></div><div class="card-copy"><span class="mini-label">SAKURA CROSSING / ' + article.number + '</span><h3>' + article.title + '</h3><p>' + article.description + '</p><div class="card-actions"><button data-read="' + article.id + '">阅读资料 ↗</button><button class="save-button" data-save="' + article.id + '" aria-pressed="false">+ 收藏</button></div></div></article>').join('');
  }
  function footer(action, label) {
    return '<div class="dialog-footer"><span id="dialog-feedback" role="status" aria-live="polite">' + (persistent ? '收藏仅保存在此浏览器，可随时取消。' : '浏览器存储不可用，收藏仅在本次页面中保留。') + '</span><button data-action="' + action + '">' + label + ' ↗</button></div>';
  }
  function show(k, markup) {
    document.dispatchEvent(new Event('street:content-open'));
    kicker.textContent = k; content.innerHTML = markup;
    if (!dialog.open) { dialog.showModal(); document.body.style.overflow = 'hidden'; }
    dialog.scrollTop = 0;
    const title = document.querySelector('#dialog-title');
    title.tabIndex = -1; title.focus({ preventScroll: true }); sync();
  }
  function openShop() {
    panel = 'shop'; shopVisited = true;
    world?.openShop();
    document.querySelector('#shop-status').textContent = '店门已开启，欢迎浏览 3 份研究资料';
    show('02 / THE RESEARCH SHOP', '<h2 id="dialog-title">欢迎光临，研究商店。</h2><p class="dialog-intro">店内收录 1 个真实项目：Sakura Crossing。三个章节分别回答“有什么价值、如何实现、验证了什么”。选一份阅读，把值得回看的内容收藏起来。</p><div class="store-cards">' + cards(ARTICLES) + '</div>' + footer('collection', '去阅读亭看收藏'));
  }
  function openCollection() {
    panel = 'collection';
    const entries = ARTICLES.filter((article) => saved.has(article.id));
    const markup = entries.length ? '<div class="store-cards">' + cards(entries) + '</div>' : '<div class="empty-collection"><span aria-hidden="true">❀</span><h3>口袋里，还留着一点空位。</h3><p>去研究商店读一份资料，点击“收藏”，<br />这里就会成为你下次回看的入口。</p><button class="primary-button" data-action="shop">去商店找灵感 <span>↗</span></button></div>';
    show('03 / YOUR READING PAVILION', '<h2 id="dialog-title">留给下次的灵感。</h2><p class="dialog-intro">' + (entries.length ? '本机收藏 · ' + entries.length + ' 份资料。阅读、取消收藏，都可以在这里完成。' : '你还没有收藏资料。这里会保存你带走的研究。') + '</p>' + markup + footer('shop', '继续逛研究商店'));
  }
  function openArticle(id) {
    const article = ARTICLES.find((entry) => entry.id === id);
    if (!article) return;
    if (panel !== 'reader') returnPanel = panel === 'collection' ? 'collection' : 'shop';
    panel = 'reader'; read.add(id);
    show('SAKURA CROSSING / ' + article.tag, '<h2 id="dialog-title">' + article.title + '</h2><div class="reader-toolbar"><button class="text-link" data-action="' + returnPanel + '">← 返回' + (returnPanel === 'collection' ? '收藏' : '商店') + '</button><button class="save-button" data-save="' + id + '" aria-pressed="false">+ 收藏</button><a href="' + article.source + '" download="' + article.filename + '">下载完整原笔记 ↓</a></div><article class="reader-body">' + renderMarkdown(article.body) + '</article>' + footer('collection', '查看我的收藏'));
  }
  function toggleSaved(id) {
    if (!ids.has(id)) return;
    const removing = saved.has(id);
    removing ? saved.delete(id) : saved.add(id);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...saved])); persistent = true; }
    catch { persistent = false; }
    if (panel === 'collection' && dialog.open) openCollection();
    sync();
    notify(removing ? '已取消收藏' : persistent ? '已收藏，刷新后仍可在本机查看' : '已临时收藏，浏览器存储不可用');
  }
  function chooseImage(id) {
    const effect = EFFECTS[id]; if (!effect) return;
    document.querySelector('#effect-image').src = effect.image;
    document.querySelector('#effect-image').alt = effect.caption;
    for (const field of ['caption', 'kicker', 'title', 'description']) document.querySelector('#effect-' + field).textContent = effect[field];
    document.querySelectorAll('[data-image]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.image === id)));
  }
  function close() { if (dialog.open) dialog.close(); }
  dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
  document.querySelector('#dialog-close').addEventListener('click', close);
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) close();
  });
  function action(name) {
    if (name === 'shop') openShop();
    else if (name === 'collection') openCollection();
    else if (name === 'effects') { close(); document.querySelector('#effects').scrollIntoView(); }
    else if (name === 'compare') { close(); document.querySelector('#experience').scrollIntoView(); document.querySelector('#ink-toggle').focus({ preventScroll: true }); }
    else if (name === 'license') {
      panel = 'license';
      show('SOURCE & LICENSE / de01898', '<h2 id="dialog-title">' + LICENSE.title + '</h2><div class="reader-toolbar"><a href="' + LICENSE.source + '" download="' + LICENSE.filename + '">下载来源说明 ↓</a></div><article class="reader-body">' + renderMarkdown(LICENSE.body) + '</article>');
    }
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.action) action(button.dataset.action);
    else if (button.dataset.read) openArticle(button.dataset.read);
    else if (button.dataset.save) toggleSaved(button.dataset.save);
    else if (button.dataset.image) chooseImage(button.dataset.image);
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    try { const value = JSON.parse(event.newValue || '[]'); saved = new Set(Array.isArray(value) ? value.filter((id) => ids.has(id)) : []); }
    catch { return; }
    if (panel === 'collection' && dialog.open) openCollection(); else sync();
  });
  document.querySelector('#research-cards').innerHTML = cards(ARTICLES);
  chooseImage('full'); sync();
  return { action, isDialogOpen: () => dialog.open, bindWorld(value) { world = value; sync(); } };
}
