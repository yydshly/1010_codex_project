
import {readFile,mkdir,writeFile,copyFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
export const web=fileURLToPath(new URL('../',import.meta.url));
export const project=path.resolve(web,'..');
export const dist=path.join(web,'dist');
const E=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const documents=[
 ['完整研究摘要','notes/research-summary.md','notes'],['研究摘要数据','notes/research-summary.json','notes'],
 ['原理、价值与证据','notes/research.md','notes'],['图稿制作与验收','notes/infographic.md','notes'],
 ['图稿中文内容','notes/overview-content.json','notes'],['研究资料索引','notes/README.md','notes'],
 ['本机图稿验收记录','notes/verification.json','experiments'],['图稿排版测量','notes/overview-layout.json','experiments'],
 ['孔洞最小复现说明','experiments/teardrop/README.md','experiments'],
 ['STL 几何测量','experiments/teardrop/geometry-measurements.json','experiments'],
 ['固定上游源码核对','experiments/teardrop/source-verification.json','experiments'],
 ['STL 测量脚本','experiments/teardrop/measure-stl.py','experiments'],
 ['修改前共享模块','experiments/teardrop/before/printability.scad','experiments'],
 ['修改后共享模块','experiments/teardrop/after/printability.scad','experiments'],
 ['修改前最小测试件','experiments/teardrop/before/case.scad','experiments'],
 ['修改后最小测试件','experiments/teardrop/after/case.scad','experiments'],
 ['修改前 STL','experiments/teardrop/before/case.stl','experiments'],
 ['修改后 STL','experiments/teardrop/after/case.stl','experiments'],
 ['图片来源与授权','assets/README.md','source'],['图稿导出与哈希','assets/overview-export.json','source'],
 ['上游完整许可证','licenses/UPSTREAM-CC-BY-SA-4.0.txt','source'],
 ['本图新增材料许可','licenses/ARTIFACT-LICENSE.md','source'],
 ['Muster 上游 MIT','licenses/MUSTER-MIT.txt','source']
];
export const images=[
 'assets/source/nuggs-den-hero.png','assets/source/nuggs-den-cutaway.png','assets/source/pip-piano-hinge-hero.png',
 'assets/local/teardrop-before.png','assets/local/teardrop-after.png',
 'assets/extensions/muster-fieldcamp.png','assets/extensions/jevclip-workbench.jpg','assets/extensions/paper-mv.png','assets/extensions/yingxu-overview.jpg',
 'assets/research-overview.png','assets/research-overview.svg','assets/overview-preview.png'
];
const head=(n,title,intro)=>'<div class="section-head"><span class="number">'+n+'</span><h2>'+E(title)+'</h2></div>'+(intro?'<p class="intro">'+E(intro)+'</p>':'');
function docMarkup([title,file,group]){
 const binary=/\.stl$/.test(file);
 return '<article class="doc" data-group="'+group+'"><strong>'+E(title)+'</strong><small>'+E(file)+'</small><div class="doc-actions">'+(!binary?'<button type="button" class="read-doc" data-read="./'+file+'" data-title="'+E(title)+'">阅读原文</button>':'')+'<a href="./'+file+'" download>下载'+(binary?'模型':'资料')+'</a></div></article>';
}
export async function build(){
 const data=JSON.parse(await readFile(path.join(project,'notes/research-summary.json'),'utf8'));
 const original=JSON.parse(await readFile(path.join(project,'notes/overview-content.json'),'utf8'));
 const measures=JSON.parse(await readFile(path.join(project,'experiments/teardrop/geometry-measurements.json'),'utf8'));
 const start='<section class="section" id="',close='</section>';
 let html='<section id="overview" class="hero"><div><p class="eyebrow">RESEARCH / '+E(data.date)+' / PRINT-BENCH</p><h1>从一句需求，<br>到可审查的模型改动。</h1><p class="lead">模型如何被修改，和工作如何被自动化，是理解这类项目的两条线。</p><p class="thesis">'+E(data.thesis)+'</p><p>源库能力、真实证据和使用价值放在一起看：哪些已经核验，哪些只是适用方案，什么时候比直接对话更省事。</p><div class="actions"><a class="button primary" href="#workflow">先看它如何执行</a><button class="button" data-poster type="button">放大完整总图</button><a class="button" href="#complete-summary">阅读完整摘要</a></div><div class="badges"><span class="badge source">固定上游源码</span><span class="badge">本机几何复现</span><span class="badge planned">自动化待接入</span></div></div><div class="poster-preview"><button class="poster-thumb" type="button" data-poster aria-label="放大完整理解总图"><img src="./assets/overview-preview.png" width="1200" height="3390" alt="我们生成的理解总图；点击可查看完整高清图"></button><div class="poster-caption"><strong>从总图进入研究</strong><span>完整长图可放大与下载</span></div></div></section>';
 html+='<div class="notice">原 X 视频的作者与源码尚未确认；这里用已核验的 print-bench 说明类似流程。公开的是研究网页，AI 修改模型工作流尚未接入。引导图保留制作时的原始内容。</div>';
 html+=start+'effects">'+head('01','能力与实际效果','原库以参数化 CAD 为基础，交付的不只是预览，而是模型源码、生成资产和可审查改动。')+'<div class="grid two">';
 for(const effect of original.effects)html+='<article class="card"><span class="badge source">上游仓库发布图</span><h3 style="margin-top:15px">'+E(effect.title)+'</h3><img src="./assets/'+effect.file+'" loading="lazy" alt="'+E(effect.caption)+'"><p>'+E(effect.note)+'</p><p class="caption">'+E(effect.caption)+'；不是本机整件产品复现。</p></article>';
 html+='</div><div class="output-strip">'+data.tools.map(x=>'<div><b>'+E(x.label)+'</b><span>'+E(x.text)+'</span></div>').join('')+'</div>'+close;
 html+=start+'workflow">'+head('02','六步执行链：每一环分别由谁负责？','选择步骤查看职责。GitHub 提供存储与执行环境；AI 决定如何修改；工具生成和检查实际几何。')+'<div class="steps">';
 original.pipeline.forEach((step,i)=>{html+='<button type="button" class="step" aria-pressed="'+(i===0)+'" aria-controls="stepDetail"><span>STEP '+String(i+1).padStart(2,'0')+'</span><strong>'+E(step.title)+'</strong><small>'+E(step.owner)+'</small></button>';});
 html+='</div><div class="step-detail" id="stepDetail" aria-live="polite"><h3 id="stepTitle">01 · '+E(original.pipeline[0].title)+'</h3><p id="stepText">'+E(original.pipeline[0].text)+'</p><small id="stepOwner">'+E(original.pipeline[0].owner+' · '+original.pipeline[0].detail)+'</small></div><p class="feedback">失败可修复 → 返回代理；超限、冲突或需求不清 → 停止并请求人判断。已查版本按小时或手动运行，经过 autonomy-ok 筛选，每次挑一项；不是每个新 Issue 都立即执行。</p>'+close;
 html+=start+'module-map">'+head('03','源码地图：九个模块与固定版本','从具体文件看职责，避免把代理、语言模型、GitHub 和建模工具混为同一个东西。')+'<div class="module-map">';
 for(const module of data.modules){const url=data.upstream+'/'+(module.type||'blob')+'/'+data.revision+'/'+module.path;html+='<article class="card"><h3>'+E(module.title)+'</h3><p>'+E(module.role)+'</p><a href="'+E(url)+'" target="_blank" rel="noreferrer">'+E(module.path)+' ↗</a>'+(module.extra?'<br><a href="'+data.upstream+'/blob/'+data.revision+'/'+module.extra+'" target="_blank" rel="noreferrer">'+E(module.extra)+' ↗</a>':'')+'</article>';}
 html+='</div>'+close;
 html+=start+'case">'+head('04','真实案例：把水滴孔尖顶翻到上方','Issue #398 提出方向错误，PR #424 修正共享模块并同步铰链；2026-08-29 合并。以下两张图片是本机最小测试件的实际渲染。')+'<div class="grid two">';
 for(const [i,type]of ['before','after'].entries())html+='<article class="card"><span class="badge">本机复现 · '+(i?'修改后':'修改前')+'</span><h3 style="margin-top:15px">'+(i?'孔顶朝 +Z':'孔顶误朝 −Z')+'</h3><img src="./assets/local/teardrop-'+type+'.png" loading="lazy" alt="'+(i?'修改后孔顶向上':'修改前孔顶向下')+'"><p><code class="code">'+E(i?original.case.after:original.case.before)+'</code></p></article>';
 html+='</div><table class="measure"><caption>同一最小测试件的 STL 孔壁顶点测量</caption><thead><tr><th>测量项</th><th>修改前</th><th>修改后</th></tr></thead><tbody><tr><td>最小 Z / mm</td><td>'+measures[0].bore_z_min_mm+'</td><td>'+measures[1].bore_z_min_mm+'</td></tr><tr><td>最大 Z / mm</td><td>'+measures[0].bore_z_max_mm+'</td><td>'+measures[1].bore_z_max_mm+'</td></tr><tr><td>STL 三角面 / 唯一顶点</td><td>256 / 128</td><td>256 / 128</td></tr></tbody></table><div class="case-links">'+original.links.filter(x=>/398|424|331|几何/.test(x.label)).map(x=>'<a href="'+E(x.url)+'" target="_blank" rel="noreferrer">'+E(x.label)+' ↗</a>').join('')+'<button class="read-doc" data-read="./experiments/teardrop/README.md" data-title="本机最小复现说明">查看实验原文</button></div><p class="feedback">'+E(original.case.boundary)+'完整代理日志未取得；公开运行注释、PR 和本机几何测量分别作为证据。</p>'+close;
 html+=start+'value">'+head('05','自动化的价值：省下重复组织与跟进','直接对话也能改模型、测试和优化。自动化的增量是把这些能力组织成固定的后台交付流程。')+'<div class="grid two">'+original.values.map(x=>'<article class="card"><h3>'+E(x.title)+'</h3><p>'+E(x.text)+'</p></article>').join('')+'</div><div class="grid three" style="margin-top:20px">'+original.comparison.map(x=>'<article class="card"><h3>'+E(x.title)+'</h3><p>'+E(x.text)+'</p></article>').join('')+'</div>'+close;
 html+=start+'scenarios">'+head('06','先选任务，再选自动化方式','目标是否清楚、结果能否验收、同类工作是否重复，比“能不能加 AI”更有助于判断。')+'<div class="decision"><div><label for="taskKind">你准备做哪一类任务？</label><select id="taskKind">'+data.decision.map(x=>'<option value="'+x.id+'">'+E(x.label)+'</option>').join('')+'</select></div><div aria-live="polite"><h3 id="decisionResult">'+E(data.decision[0].result)+'</h3><p id="decisionReason">'+E(data.decision[0].reason)+'</p></div></div><p class="caption">这是固定规则的研究判断工具，不调用模型，也不代表已经运行这些流程。</p>'+close;
 html+=start+'extensions">'+head('07','对现有项目的用途与扩展方向','从小范围、可验证、常出现的维护开始。四张图都是已有项目实拍，建议的 Issue 工作流均待接入。')+'<div class="grid two">';
 for(const item of original.extensions){html+='<article class="card extension"><span class="badge">已有项目实拍</span> <span class="badge planned">'+E(item.priority)+'</span><h3 style="margin-top:15px">'+E(item.title)+'</h3><img src="./assets/'+item.file+'" loading="lazy" alt="'+E(item.title)+'已有工作台或场景截图"><p class="issue">候选 Issue：'+E(item.issue)+'</p><p>'+E(item.flow)+'</p><p style="color:var(--teal)">'+E(item.save)+'</p></article>';}
 html+='</div><p class="feedback">'+E(original.otherExtensions)+'</p><article class="card" style="margin-top:22px"><span class="badge planned">可行方案 · 尚未接入</span><h3 style="margin-top:15px">'+E(original.codex.title)+'</h3><p><strong>'+E(original.codex.chain)+'</strong></p><p>'+E(original.codex.text)+'</p><a href="https://learn.chatgpt.com/docs/github-action" target="_blank" rel="noreferrer">查看 Codex 官方 Action 文档 ↗</a></article><div class="grid three" style="margin-top:20px">'+original.roadmap.map(x=>'<article class="card"><h3>'+E(x.title)+'</h3><p>'+E(x.text)+'</p></article>').join('')+'</div>'+close;
 html+=start+'complete-summary">'+head('08','九主题完整摘要','31 段研究正文完整保留。可搜索主题或资料，也可下载摘要和原始数据。')+'<div class="search-row"><label class="skip" for="searchInput">检索完整摘要与资料</label><input id="searchInput" type="search" placeholder="检索：模块、原理、价值、Codex、打印、字幕…" aria-label="检索完整摘要与资料"><button class="button" id="clearSearch" hidden>清除</button></div><p id="searchStatus" aria-live="polite">完整摘要 9 个主题 · 31 段正文</p>';
 for(const section of data.sections)html+='<article class="summary-section" id="summary-'+section.id+'"><h3>'+E(section.title)+'</h3>'+section.body.map(p=>'<p>'+E(p)+'</p>').join('')+'</article>';
 html+='<p class="empty" id="summaryEmpty" hidden>没有找到相关主题。可以缩短关键词或清除检索。</p><div class="actions"><a class="button" href="./notes/research-summary.md" download>下载完整摘要</a><a class="button" href="./notes/research-summary.json" download>下载结构化数据</a></div>'+close;
 html+=start+'library">'+head('09','原始资料、固定来源与验证边界','摘要帮助形成理解；下面保留完整笔记、模型测试件、STL、测量、图稿数据和许可证，供深入阅读与复验。')+'<div class="docs-toolbar" aria-label="资料分类">'+[['all','全部资料'],['notes','研究笔记'],['experiments','实验与模型'],['source','来源与许可']].map(([id,label])=>'<button type="button" class="filter" data-filter="'+id+'" aria-pressed="'+(id==='all')+'">'+label+'</button>').join('')+'</div><div class="doc-list">'+documents.map(docMarkup).join('')+'</div><p id="docsEmpty" class="empty" hidden>当前分类没有匹配资料。</p><div class="source-box" style="margin-top:25px"><p><strong>固定上游版本</strong> <a href="'+data.upstream+'/tree/'+data.revision+'" target="_blank" rel="noreferrer">'+E(data.revision)+'</a></p><p>print-bench 贡献者 · CC BY-SA 4.0；BOSL2 与 NopSCADlib 保留各自许可。图稿编排与新增研究材料采用 CC BY-SA 4.0，现有项目截图按各自来源说明处理。</p><p>原帖源码未确认。本机只验证一个具体几何变化，未做实物打印或自有仓库远端全链路；不以绿色 CI 保证全部设计质量。</p></div>'+close;
 html+='<div class="quote">'+E(original.takeaway)+'</div><footer class="footer"><p>研究集 014 · '+E(data.date)+' · 公开静态研究与证据；模型后端、凭据和自动修改工作流未公开或接入。</p><p><a href="./assets/research-overview.png" download>高清引导图</a> · <a href="./assets/research-overview.svg" download>可编辑 SVG</a> · <a href="./notes/research-summary.md" download>完整中文摘要</a> · <a href="https://github.com/yydshly/1010_codex_project/tree/main/projects/014-print-bench" target="_blank" rel="noreferrer">研究源码与材料 ↗</a></p></footer><noscript><p class="noscript">正文与下载链接可直接阅读。总图放大、步骤切换、资料弹窗和搜索需要启用 JavaScript。</p></noscript>';
 const template=await readFile(path.join(web,'src/index.html'),'utf8');
 const pageData={pipeline:original.pipeline,decision:data.decision,paragraphs:data.sections.reduce((n,s)=>n+s.body.length,0)};
 const result=template.replace('{{CONTENT}}',html).replace('{{DATA}}',JSON.stringify(pageData).replaceAll('<','\\u003c'));
 if(dist!==path.join(project,'web','dist'))throw new Error('构建路径无效');
 await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
 await writeFile(path.join(dist,'index.html'),result);await writeFile(path.join(dist,'research.html'),result);
 for(const f of ['app.js','style.css'])await copyFile(path.join(web,'src',f),path.join(dist,f));
 for(const file of [...documents.map(x=>x[1]),...images]){
   const target=path.join(dist,file);await mkdir(path.dirname(target),{recursive:true});await copyFile(path.join(project,file),target);
 }
 console.log('已构建 print-bench 研究页：'+data.sections.length+' 主题、'+pageData.paragraphs+' 段、'+data.modules.length+' 模块、'+documents.length+' 项原始资料。');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
