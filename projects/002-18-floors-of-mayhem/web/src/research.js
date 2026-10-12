import { research } from './research-content.js';
const $ = s => document.querySelector(s);
let step = 0;
function selectStep(i) {
 step = i; const s = research.loop[i];
 $('#step-owner').textContent=s.owner; $('#step-name').textContent=s.name; $('#step-text').textContent=s.text; $('#step-example').textContent=s.example;
 document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===i)));
}
document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>selectStep(Number(b.dataset.step))));
$('#next-step').addEventListener('click',()=>selectStep((step+1)%research.loop.length));
document.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('[data-case]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));
 document.querySelectorAll('[data-case-id]').forEach(a=>a.hidden=b.dataset.case!=='all'&&a.dataset.caseId!==b.dataset.case);
}));
$('#doc-search').addEventListener('input',e=>{
 let n=0; const q=e.target.value.trim().toLowerCase();
 document.querySelectorAll('[data-search]').forEach(a=>{a.hidden=!a.dataset.search.toLowerCase().includes(q);if(!a.hidden)n++;});
 $('#doc-count').textContent=`${n} 份资料`;
});
document.querySelectorAll('[data-image]').forEach(b=>b.addEventListener('click',e=>{
 e.preventDefault(); $('#image-title').textContent=b.dataset.title; $('#dialog-image').src=b.dataset.image; $('#dialog-image').alt=b.dataset.title; $('#image-download').href=b.dataset.image; $('#image-dialog').showModal();
}));
let readId=0;
document.querySelectorAll('[data-doc]').forEach(b=>b.addEventListener('click',async()=>{
 const id=++readId; $('#doc-title').textContent=b.dataset.title; $('#doc-body').textContent='正在加载原文…'; $('#doc-download').href='./'+b.dataset.doc; $('#doc-dialog').showModal();
 try {const response=await fetch('./'+b.dataset.doc,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error();const text=await response.text();if(id===readId)$('#doc-body').textContent=text;}
 catch {if(id===readId)$('#doc-body').textContent='资料未能加载，请重试或使用下载链接。';}
}));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
$('#doc-dialog').addEventListener('close',()=>{readId++;});
