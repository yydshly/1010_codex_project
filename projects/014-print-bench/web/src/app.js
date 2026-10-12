
const data = JSON.parse(document.getElementById('pageData').textContent);
const steps = [...document.querySelectorAll('.step')];
function activateStep(index) {
  steps.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  const step=data.pipeline[index];
  document.getElementById('stepTitle').textContent=String(index+1).padStart(2,'0')+' · '+step.title;
  document.getElementById('stepText').textContent=step.text;
  document.getElementById('stepOwner').textContent=step.owner+' · '+step.detail;
}
steps.forEach((button,i)=>button.addEventListener('click',()=>activateStep(i)));
const choice=document.getElementById('taskKind');
choice.addEventListener('change',()=>{
  const item=data.decision.find(x=>x.id===choice.value);
  document.getElementById('decisionResult').textContent=item.result;
  document.getElementById('decisionReason').textContent=item.reason;
});
const posterDialog=document.getElementById('posterDialog');
const zoom=document.getElementById('posterZoom'), poster=document.getElementById('fullPoster');
function applyZoom(){poster.style.width=zoom.value+'%';document.getElementById('zoomValue').textContent=zoom.value+'%';}
document.querySelectorAll('[data-poster]').forEach(button=>button.addEventListener('click',()=>{
  posterDialog.showModal();zoom.value='100';applyZoom();document.querySelector('.poster-canvas').scrollTo(0,0);
}));
zoom.addEventListener('input',applyZoom);
document.getElementById('resetZoom').addEventListener('click',()=>{zoom.value='100';applyZoom();});
document.getElementById('closePoster').addEventListener('click',()=>posterDialog.close());
posterDialog.addEventListener('click',event=>{if(event.target===posterDialog)posterDialog.close();});
const reader=document.getElementById('documentDialog');
let readerVersion=0;
document.querySelectorAll('[data-read]').forEach(button=>button.addEventListener('click',async()=>{
  const version=++readerVersion;
  document.getElementById('documentTitle').textContent=button.dataset.title;
  const link=document.getElementById('downloadDocument');link.href=button.dataset.read;link.download='';
  document.getElementById('documentText').textContent='正在读取原文…';reader.showModal();
  try{
    const response=await fetch(button.dataset.read);
    if(!response.ok)throw new Error('HTTP '+response.status);
    const body=await response.text();
    if(version!==readerVersion||!reader.open)return;
    document.getElementById('documentText').textContent=body;
  }catch(error){if(version===readerVersion&&reader.open)document.getElementById('documentText').textContent='读取失败：'+error.message+'。可用下载链接直接打开资料。';}
}));
document.getElementById('closeDocument').addEventListener('click',()=>reader.close());
reader.addEventListener('close',()=>readerVersion++);
reader.addEventListener('click',event=>{if(event.target===reader)reader.close();});
const search=document.getElementById('searchInput'), sections=[...document.querySelectorAll('.summary-section')], docs=[...document.querySelectorAll('.doc')];
let group='all';
function filterContent(){
  const q=search.value.trim().toLocaleLowerCase();
  let count=0,docCount=0;
  for(const section of sections){const match=!q||section.textContent.toLocaleLowerCase().includes(q);section.hidden=!match;if(match)count++;}
  for(const doc of docs){const match=(group==='all'||doc.dataset.group===group)&&(!q||doc.textContent.toLocaleLowerCase().includes(q));doc.hidden=!match;if(match)docCount++;}
  document.getElementById('searchStatus').textContent=q?'找到 '+count+' 个摘要主题、'+docCount+' 项资料':'完整摘要 '+sections.length+' 个主题 · '+data.paragraphs+' 段正文';
  document.getElementById('summaryEmpty').hidden=count>0;
  document.getElementById('docsEmpty').hidden=docCount>0;
  document.getElementById('clearSearch').hidden=!q;
}
search.addEventListener('input',filterContent);
document.getElementById('clearSearch').addEventListener('click',()=>{search.value='';filterContent();search.focus();});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  group=button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));filterContent();
}));
const nav=[...document.querySelectorAll('.toc a')];
if('IntersectionObserver'in window){
  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(x=>x.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
    if(visible[0])for(const a of nav)a.setAttribute('aria-current',String(a.hash==='#'+visible[0].target.id));
  },{rootMargin:'-110px 0px -55% 0px',threshold:0});
  document.querySelectorAll('main > section[id]').forEach(section=>observer.observe(section));
}
filterContent();
