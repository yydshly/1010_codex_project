import resources from './research-resources.json';

export function mountResources() {
  const host = document.getElementById('resource-library');
  if (!host) return;
  const groups = ['研究笔记', '全部', '实验数据', '项目说明', '代码与配置', '截图', '图解', '许可证'];
  host.innerHTML = `<div class="resource-tools"><label>搜索资料<input type="search" id="resource-search" placeholder="输入主题、文件名或术语"></label><label>资料类型<select id="resource-category">${groups.map(g => `<option>${g}</option>`).join('')}</select></label><span id="resource-count" role="status"></span></div><div id="resource-list"></div><dialog id="resource-dialog" aria-labelledby="resource-title"><div class="resource-dialog-head"><h3 id="resource-title"></h3><button id="resource-close">关闭全文</button></div><p id="resource-origin"></p><pre id="resource-content" tabindex="0"></pre><a id="resource-save" download>下载原文件 ↓</a></dialog>`;
  const list = document.getElementById('resource-list');
  const dialog = document.getElementById('resource-dialog');
  const close = document.getElementById('resource-close');
  let opener;
  let requestId = 0;
  const size = bytes => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
  function render() {
    const query = document.getElementById('resource-search').value.trim().toLowerCase();
    const category = document.getElementById('resource-category').value;
    const found = resources.filter(r => (category === '全部' || r.category === category) && `${r.title} ${r.path} ${r.category}`.toLowerCase().includes(query));
    document.getElementById('resource-count').textContent = `${found.length} / ${resources.length} 份资料`;
    list.replaceChildren();
    for (const item of found) {
      const row = document.createElement('article'); row.className = 'resource-row';
      const description = document.createElement('div');
      const title = document.createElement('strong'); title.textContent = item.title;
      const meta = document.createElement('small'); meta.textContent = `${item.category} · ${size(item.bytes)} · ${item.path}`;
      description.append(title, meta); row.append(description);
      const actions = document.createElement('div'); actions.className = 'resource-actions';
      if (item.viewable) {
        const button = document.createElement('button'); button.textContent = '查看全文';
        button.addEventListener('click', async () => {
          const currentRequest = ++requestId;
          opener = button;
          document.getElementById('resource-title').textContent = item.title;
          document.getElementById('resource-origin').textContent = `原文件 · ${item.path} · SHA256 ${item.sha256}`;
          const content = document.getElementById('resource-content'); content.textContent = '正在读取原文件…';
          const save = document.getElementById('resource-save'); save.href = item.href; save.download = item.path.split('/').at(-1);
          dialog.showModal(); close.focus();
          try {
            const response = await fetch(item.href);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const originalText = await response.text();
            if (currentRequest === requestId && dialog.open) content.textContent = originalText;
          } catch (error) {
            if (currentRequest === requestId && dialog.open) content.textContent = `读取失败：${error.message}。请检查构建和本机服务。`;
          }
        });
        actions.append(button);
      }
      const download = document.createElement('a'); download.href = item.href; download.download = item.path.split('/').at(-1); download.textContent = item.category === '截图' ? '打开 / 下载' : '下载 ↓';
      actions.append(download); row.append(actions); list.append(row);
    }
    if (!found.length) { const empty = document.createElement('p'); empty.textContent = '没有匹配资料，试试“fish”“算法”或选择全部类型。'; list.append(empty); }
  }
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { requestId++; opener?.focus(); });
  document.getElementById('resource-search').addEventListener('input', render);
  document.getElementById('resource-category').addEventListener('change', render);
  render();
}
