import './research.css';
import data from '../../notes/research-summary.json';
import guideUrl from '../../assets/scene-map-guide.webp?url&no-inline';
import summaryUrl from '../../notes/research-summary.md?url&no-inline';
import { bindResearchLinks } from './platform/researchLinks.js';
const images=import.meta.glob('../../assets/{upstream-controls,desktop,modules-minimal}.jpg',{eager:true,query:'?url&no-inline',import:'default'});
const weatherUrl=new URL('../../../001-sakura-crossing/assets/hub-rainy.jpg',import.meta.url).href;
const documents=import.meta.glob(['../../notes/*.{md,json}','../modules/rain-kit/*.md','../THIRD_PARTY.md'],{eager:true,query:'?url&no-inline',import:'default'});
const $=selector=>document.querySelector(selector);
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
bindResearchLinks();$('#guide').src=guideUrl;$('#summary-download').href=summaryUrl;
function renderSummary(){
 const query=$('#summary-search').value.trim().toLowerCase(),items=data.sections.filter(item=>`${item.title} ${item.paragraphs.join(' ')}`.toLowerCase().includes(query));
 $('#summaries').innerHTML=items.map(item=>`<article class="summary-card" id="summary-${item.id}"><span class="number">${String(data.sections.indexOf(item)+1).padStart(2,'0')}</span><h3>${escape(item.title)}</h3>${item.paragraphs.map(p=>`<p>${escape(p)}</p>`).join('')}</article>`).join('');
 $('#summary-result').textContent=`显示 ${items.length} / ${data.sections.length} 个主题；完整正文 ${data.sections.reduce((n,item)=>n+item.paragraphs.length,0)} 段。`;
 $('#empty').hidden=items.length>0;
}
$('#summary-search').addEventListener('input',renderSummary);renderSummary();
const effects=[
 ['固定原城市','upstream-controls','上游城市本机实拍；中文四效果面板为本地新增。原素材仅本机，公开页保留实拍与原始验收。'],
 ['原创雨夜研究台','desktop','代码生成街区与车辆；独立开关雨滴、镜像、水珠与辉光，进入第一人称看屋檐与湿地。'],
 ['独立模块消费者','modules-minimal','四模块最小例子，无原城市素材；统一更新/开关/释放接口，同一份 tgz 有独立安装记录。'],
 ['跨项目雨天樱花街',null,'真实接入同一 Rain Kit，保持色阶、冷紫暗部、描线与调色；天气、湿地、漫游已迁移。']
];
$('#effect-grid').innerHTML=effects.map(([title,file,caption])=>`<article><img src="${escape(file?images[`../../assets/${file}.jpg`]:weatherUrl)}" alt="${escape(title)}实际截图" loading="lazy"><div class="caption"><h3>${escape(title)}</h3><p>${escape(caption)}</p></div></article>`).join('');
$('#module-body').innerHTML=data.modules.map(item=>`<tr><td>${escape(item.name)}<code>${escape(item.api)}</code></td><td>${escape(item.input)}</td><td>${escape(item.output)}</td><td>${escape(item.state)}</td></tr>`).join('');
const titles={'API.md':'Rain Kit · 完整中文 API','README.md':'模块接入 / 快速说明','PROVENANCE.md':'逐项代码来源与授权','THIRD_PARTY.md':'完整第三方授权说明','research.md':'源库能力与技术研究','research-summary.md':'完整研究摘要','research-summary.json':'完整研究摘要数据','module-extraction.md':'模块提取与独立验收','upstream-controls.md':'原库中文面板实测','walk-upgrade.md':'漫游升级与碰撞实测','experiment.md':'初次运行与实验记录'};
const titleFor=path=>path==='../../notes/README.md'?'研究资料索引':titles[path.split('/').pop()]||path.split('/').pop();
$('#documents').innerHTML=Object.entries(documents).map(([path,url])=>{const name=path.split('/').pop();return`<article class="document"><button data-document="${escape(path)}">${escape(titleFor(path))}</button><small>${escape(path)}</small><a href="${escape(url)}" download>下载原始文件 ↓</a></article>`;}).join('');
let request=0;
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-document]');if(!button)return;
 const path=button.dataset.document,url=documents[path];if(!url)return;
 const current=++request;$('#reader-title').textContent=titleFor(path);$('#reader-download').href=url;$('#reader-text').textContent='正在读取原文…';if(!$('#reader').open)$('#reader').showModal();
 try{const response=await fetch(url);if(!response.ok)throw Error('read');const value=await response.text();if(current===request)$('#reader-text').textContent=path.endsWith('.json')?JSON.stringify(JSON.parse(value),null,2):value;}
 catch{if(current===request)$('#reader-text').textContent='原文读取失败，请重新打开或通过下载链接查看。';}
});
$('#reader-close').addEventListener('click',()=>{$('#reader').close();request++;});$('#reader').addEventListener('close',()=>{request++;});
