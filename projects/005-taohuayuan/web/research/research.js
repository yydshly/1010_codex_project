const $ = s => document.querySelector(s);
const guide = $('#overview-dialog'), reader = $('#reader-dialog'), image = $('#full-overview');
let scale = 100, requestId = 0;
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const documents = await fetch('./documents.json').then(r=>{if(!r.ok)throw new Error('资料目录加载失败');return r.json();}).catch(()=>[]);
const docs = new Map(documents.map(d=>[d.path,d]));
function openDialog(dialog) { if (!dialog.open) dialog.showModal(); document.body.style.overflow='hidden'; }
for (const dialog of [guide,reader]) dialog.addEventListener('close',()=>{if(!guide.open&&!reader.open)document.body.style.overflow='';if(dialog===reader)requestId++;});
document.querySelectorAll('[data-open-overview]').forEach(button=>button.addEventListener('click',()=>{if(!image.src)image.src=image.dataset.src;scale=100;image.style.width='100%';$('#zoom-status').textContent='100%';openDialog(guide);}));
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>$('#'+button.dataset.close).close()));
document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{scale=button.dataset.zoom==='fit'?100:Math.max(50,Math.min(300,scale+(button.dataset.zoom==='in'?25:-25)));image.style.width=scale+'%';$('#zoom-status').textContent=scale+'%';}));
function inline(value,path) {
  return escape(value).replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,label,url)=>{
    const decoded=url.replaceAll('&amp;','&');
    if (/^(?:https?:|\.\.?\/|[a-zA-Z0-9_-])/.test(decoded)&&!/^javascript:/i.test(decoded)) {
      const sourcePath=path.startsWith('references/001-sakura-crossing/')?path.slice('references/'.length):'005-taohuayuan/'+path;
      const target=/^https?:\/\//i.test(decoded)?decoded:new URL(decoded,'https://github.com/yydshly/1010_codex_project/blob/main/projects/'+sourcePath).href;
      return `<a href="${escape(target)}" target="_blank" rel="noopener">${label}</a>`;
    }
    return label;
  }).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
}
function markdown(source,path) {
  const lines=source.split(/\r?\n/), out=[];
  for(let i=0;i<lines.length;i++) {
    const line=lines[i];
    if(line.startsWith('```')) { const block=[];while(++i<lines.length&&!lines[i].startsWith('```'))block.push(lines[i]);out.push('<pre><code>'+escape(block.join('\n'))+'</code></pre>');continue; }
    if(/^\|/.test(line)) { const rows=[];while(i<lines.length&&/^\|/.test(lines[i])){if(!/^\|[\s:|-]+\|$/.test(lines[i]))rows.push(lines[i].replace(/^\||\|$/g,'').split('|'));i++;}i--;out.push('<div class="table-wrap"><table>'+rows.map((row,j)=>'<tr>'+row.map(cell=>`<${j?'td':'th'}>${inline(cell.trim(),path)}</${j?'td':'th'}>`).join('')+'</tr>').join('')+'</table></div>');continue; }
    const heading=line.match(/^(#{1,4})\s+(.+)$/);
    if(heading){out.push(`<h${heading[1].length}>${inline(heading[2],path)}</h${heading[1].length}>`);continue;}
    if(!line.trim())continue;
    if(/^\s*[-*]\s/.test(line)){out.push('<p>• '+inline(line.replace(/^\s*[-*]\s/,''),path)+'</p>');continue;}
    out.push('<p>'+inline(line,path)+'</p>');
  }
  return out.join('\n');
}
async function readDocument(path) {
  const doc=docs.get(path);
  const id=++requestId;
  $('#reader-title').textContent=doc?.title||'研究资料';
  $('#reader-category').textContent=doc?.category||'原始记录';
  $('#reader-path').textContent=path;
  const url=doc?.url||'./materials/'+path;
  $('#reader-download').href=url;
  $('#reader-content').textContent='正在读取资料…';
  openDialog(reader);
  try {
    const response=await fetch(url);if(!response.ok)throw new Error('HTTP '+response.status);
    const value=await response.text();if(id!==requestId||!reader.open)return;
    $('#reader-content').innerHTML=path.endsWith('.json')?'<pre>'+escape(JSON.stringify(JSON.parse(value),null,2))+'</pre>':markdown(value,path);
    $('#reader-content').scrollTop=0;
  }catch(error){if(id===requestId&&reader.open)$('#reader-content').textContent='资料读取失败：'+error.message+'。可点击上方链接下载原文件。';}
}
document.querySelectorAll('[data-document]').forEach(button=>button.addEventListener('click',()=>readDocument(button.dataset.document)));
const items=[...document.querySelectorAll('.document')];
function filterDocs(){const query=$('#doc-search').value.toLocaleLowerCase().trim();let count=0;for(const item of items){item.hidden=!item.dataset.search.toLocaleLowerCase().includes(query);if(!item.hidden)count++;}$('#doc-count').textContent=`${count} / ${items.length} 项资料${count?'':' · 没有匹配项，请换个关键词'}`;}
$('#doc-search').addEventListener('input',filterDocs);filterDocs();
$('#copy-command').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#local-command').textContent);$('#copy-status').textContent='命令已复制';}catch{$('#copy-status').textContent='未能自动复制，可选中上方命令复制。';}});
