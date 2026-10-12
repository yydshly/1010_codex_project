import './research-style.css';
import summary from '../../notes/research-summary.json';
import { algorithms } from './capabilities-data.js';
import { mountResources } from './resources.js';
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const host = document.getElementById('summary-sections');
function render() {
  const q = document.getElementById('summary-search').value.trim().toLowerCase();
  const sections = summary.sections.filter(s=>`${s.title} ${s.body.join(' ')}`.toLowerCase().includes(q));
  host.innerHTML = sections.map((s,i)=>`<article class="summary-article" id="summary-${s.id}"><span class="eyebrow">${String(summary.sections.indexOf(s)+1).padStart(2,'0')}</span><h3>${escape(s.title)}</h3>${s.body.map(p=>`<p>${escape(p)}</p>`).join('')}</article>`).join('');
  document.getElementById('summary-count').textContent = `${sections.length} / 9 主题 · 全部${summary.sections.reduce((n,s)=>n+s.body.length,0)}段正文保留`;
}
document.getElementById('summary-search').addEventListener('input',render); render();
document.getElementById('mechanism-list').innerHTML = algorithms.map(a=>`<details><summary>${escape(a.name)}</summary><p>${escape(a.role)}</p><p>${escape(a.essence)}</p><p><strong>模块：</strong>${escape(a.modules)}</p><p><strong>适用：</strong>${escape(a.fit)}</p><p><strong>限制：</strong>${escape(a.limit)}</p><a href="./applications.html#algorithms">完整机制与源码引用 →</a></details>`).join('');
mountResources();
const dialog=document.getElementById('map-dialog'), opener=document.getElementById('map-open');
opener.addEventListener('click',()=>dialog.showModal());
document.getElementById('map-preview').addEventListener('click',e=>{e.preventDefault();dialog.showModal();});
document.getElementById('map-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>opener.focus());
document.getElementById('map-width').addEventListener('input',e=>{document.getElementById('map-large').style.width=`${e.target.value}px`;document.getElementById('map-size').textContent=`${e.target.value} px`;});
