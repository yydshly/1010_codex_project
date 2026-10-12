const q=s=>document.querySelector(s);
const qa=s=>[...document.querySelectorAll(s)];
const data=await fetch('./research-data.json').then(r=>{if(!r.ok)throw Error('研究数据加载失败');return r.json()});
qa('[data-step]').forEach(b=>b.addEventListener('click',()=>{
 const i=Number(b.dataset.step),s=data.pipeline[i];
 qa('[data-step]').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',String(active))});
 q('#stepTitle').textContent=s.title;q('#stepText').textContent=s.text;q('#stepOwner').textContent=s.owner;
}));
qa('[data-style]').forEach(b=>b.addEventListener('click',()=>{
 const s=data.styles[Number(b.dataset.style)];qa('[data-style]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});
 q('#styleImage').src='./'+s.file;q('#styleImage').alt=s.title+'实际画布';q('#styleDescription').textContent=s.description;
}));
const poster=q('#posterDialog');
let zoom=1;
function updateZoom(){q('#posterFull').style.width=Math.round(1024*zoom)+'px';q('#zoomLabel').textContent=Math.round(zoom*100)+'%';q('#zoomOut').disabled=zoom<=.25;q('#zoomIn').disabled=zoom>=2.5}
qa('[data-poster]').forEach(b=>b.addEventListener('click',()=>{zoom=Math.min(1,Math.max(.25,(window.innerWidth*.88-40)/1024));updateZoom();poster.showModal()}));
q('#zoomIn').addEventListener('click',()=>{zoom=Math.min(2.5,Math.round((zoom+.25)*100)/100);updateZoom()});
q('#zoomOut').addEventListener('click',()=>{zoom=Math.max(.25,Math.round((zoom-.25)*100)/100);updateZoom()});
qa('.dialog-close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
qa('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
const docDialog=q('#documentDialog');let readRequest;
qa('[data-doc]').forEach(b=>b.addEventListener('click',async()=>{
 readRequest?.abort();const c=new AbortController();readRequest=c;
 q('#documentTitle').textContent=b.dataset.title;q('#documentText').textContent='正在读取原始资料…';docDialog.showModal();
 try{const r=await fetch(b.dataset.doc,{signal:c.signal});if(!r.ok)throw Error('资料读取失败：HTTP '+r.status);const t=await r.text();if(readRequest===c)q('#documentText').textContent=t;}
 catch(e){if(e.name!=='AbortError')q('#documentText').textContent=e.message}
}));
docDialog.addEventListener('close',()=>readRequest?.abort());
let category='全部';
const summaries=qa('.summary-section'),docs=qa('.document');
function filter(){
 const needle=q('#researchSearch').value.trim().toLocaleLowerCase();
 let count=0;for(const s of summaries){const match=!needle||s.textContent.toLocaleLowerCase().includes(needle);s.hidden=!match;if(match)count++}
 let docCount=0;for(const d of docs){const match=(category==='全部'||d.dataset.group===category)&&(!needle||d.textContent.toLocaleLowerCase().includes(needle));d.hidden=!match;if(match)docCount++}
 q('#searchStatus').textContent=needle?'找到 '+count+' 个摘要主题与 '+docCount+' 份资料':'9 个主题 · 完整正文与 '+docCount+' 份资料';
 q('#summaryEmpty').hidden=count!==0;q('#docEmpty').hidden=docCount!==0;q('#clearSearch').hidden=!needle;
}
q('#researchSearch').addEventListener('input',filter);
q('#clearSearch').addEventListener('click',()=>{q('#researchSearch').value='';filter();q('#researchSearch').focus()});
qa('[data-filter]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.filter;qa('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});filter()}));
q('#copyCommand').addEventListener('click',async()=>{
 const b=q('#copyCommand');try{await navigator.clipboard.writeText(q('#runCommand').textContent);b.textContent='已复制启动命令';}catch{b.textContent='请选择上方命令复制';}
});
