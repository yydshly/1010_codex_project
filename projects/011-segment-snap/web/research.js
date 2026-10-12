const topics = [...document.querySelectorAll('.topic')];
const search = document.querySelector('#research-search');
const searchable = [...document.querySelectorAll('.searchable')];
const status = document.querySelector('#search-status');
function filterResearch() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const element of searchable) {
    const match = !query || element.textContent.toLocaleLowerCase().includes(query);
    element.hidden = !match;
    if (match) { visible++; if (query && element.matches('.topic')) element.open = true; }
  }
  status.textContent = query ? `找到 ${visible} 组相关内容；清空检索恢复全部。` : '全部内容可见';
}
search.addEventListener('input', filterResearch);
document.querySelector('#clear-search').addEventListener('click', () => { search.value=''; filterResearch(); search.focus(); });
document.querySelector('#expand-all').addEventListener('click', () => topics.forEach(topic => topic.open=true));
document.querySelector('#collapse-all').addEventListener('click', () => topics.forEach(topic => topic.open=false));

const guide = document.querySelector('#guide-dialog');
const image = document.querySelector('#guide-full');
const viewport = document.querySelector('#guide-viewport');
const output = document.querySelector('#zoom-value');
let scale = 0.2;
function setScale(value) {
  scale = Math.max(0.05, Math.min(1.5, value));
  image.style.width = `${3600 * scale}px`;
  image.style.height = 'auto';
  output.value = `${Math.round(scale * 100)}%`;
}
function fitGuide() {
  setScale(Math.min((viewport.clientWidth-32)/3600, (viewport.clientHeight-24)/5000));
  viewport.scrollTo(0,0);
}
document.querySelectorAll('[data-open-guide]').forEach(button => button.addEventListener('click', () => { guide.showModal(); fitGuide(); }));
document.querySelector('#zoom-in').addEventListener('click', () => setScale(scale*1.5));
document.querySelector('#zoom-out').addEventListener('click', () => setScale(scale/1.5));
document.querySelector('#zoom-fit').addEventListener('click', fitGuide);
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));

const documentDialog = document.querySelector('#document-dialog');
const documentStatus = document.querySelector('#document-status');
const documentContent = document.querySelector('#document-content');
const documentDownload = document.querySelector('#document-download');
let library;
let requestVersion = 0;
document.querySelectorAll('[data-read]').forEach(button => button.addEventListener('click', async () => {
  const version = ++requestVersion;
  documentDialog.showModal();
  documentContent.textContent = '';
  documentStatus.textContent = '正在读取原始资料…';
  documentDownload.hidden = true;
  try {
    if (!library) {
      const response = await fetch('./data/library.json');
      if (!response.ok) throw new Error('资料目录不可用');
      library = await response.json();
    }
    if (version !== requestVersion || !documentDialog.open) return;
    const file = library[Number(button.dataset.read)];
    document.querySelector('#document-title').textContent = file.title;
    documentDownload.href = `./${file.url}`;
    documentDownload.hidden = false;
    const response = await fetch(`./${file.url}`);
    if (!response.ok) throw new Error(`资料请求返回 ${response.status}`);
    const content = await response.text();
    if (version !== requestVersion || !documentDialog.open) return;
    documentContent.textContent = content;
    documentStatus.textContent = `${file.source} · ${content.length.toLocaleString()} 字符，完整原文`;
  } catch (error) {
    if (version !== requestVersion || !documentDialog.open) return;
    documentStatus.textContent = `资料暂未加载：${error.message}。可稍后重试或使用下载入口。`;
  }
}));
documentDialog.addEventListener('close', () => { requestVersion++; });
