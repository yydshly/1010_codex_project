const topics = [...document.querySelectorAll('[data-topic]')];
const input = document.querySelector('#research-search');
const status = document.querySelector('#search-status');
function filterTopics() {
  const query = input.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const topic of topics) {
    topic.hidden = Boolean(query && !topic.textContent.toLocaleLowerCase().includes(query));
    if (!topic.hidden) visible++;
    const link = document.querySelector('.toc a[href="#' + topic.id + '"]');
    if (link) link.hidden = topic.hidden;
  }
  status.textContent = query ? '匹配 ' + visible + ' / ' + topics.length + ' 个主题' : '显示全部 ' + topics.length + ' 个主题';
  document.querySelector('#no-results').hidden = visible !== 0;
}
input.addEventListener('input', filterTopics);
document.querySelector('#clear-search').addEventListener('click', () => {input.value='';filterTopics();input.focus();});
const poster = document.querySelector('#poster-dialog');
document.querySelector('#open-poster').addEventListener('click', () => poster.showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
const resource = document.querySelector('#resource-dialog');
let requestNumber = 0;
document.querySelectorAll('[data-resource]').forEach(button => button.addEventListener('click', async () => {
  const ticket = ++requestNumber;
  const url = new URL(button.dataset.resource, location.href);
  const output = document.querySelector('#resource-text');
  document.querySelector('#resource-title').textContent = button.dataset.title;
  document.querySelector('#resource-download').href = url.href;
  output.textContent = '正在读取完整原文…';
  resource.showModal();
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const content = await response.text();
    if (ticket === requestNumber) output.textContent = content;
  } catch (error) {
    if (ticket === requestNumber) output.textContent = '无法读取资料：' + error.message + '。可使用原文件链接重试。';
  }
}));
