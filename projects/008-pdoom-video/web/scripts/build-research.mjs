import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

export const web=fileURLToPath(new URL('../',import.meta.url));
export const project=path.resolve(web,'..');
export const dist=path.join(web,'dist-public');
export const documents=[
 ['提交与交付摘要','notes/submission-summary.md','研究'],
 ['完整中文研究摘要','notes/research-summary.md','研究'],
 ['摘要与模块数据','notes/research-summary.json','研究'],
 ['源库能力与原理','notes/research.md','研究'],
 ['MV 工具实施方案','notes/mv-tool-plan.md','研究'],
 ['本地实现与实测','notes/local-tool.md','验证'],
 ['上游实验记录','notes/experiment.md','验证'],
 ['上游九帧与短片数据','notes/verification-results.json','验证'],
 ['15 秒浏览器验证','notes/local-tool-verification.json','验证'],
 ['30 秒集成验证','notes/local-tool-integration.json','验证'],
 ['分镜协议与校验','notes/storyboard-contract.md','研究'],
 ['人工设计分镜示例','examples/storyboard.example.json','研究'],
 ['实际本地工程快照','examples/local-demo-project.json','验证'],
 ['总览图说明与提示词','notes/overview-poster.md','图与来源'],
 ['原始图片与视频来源','assets/README.md','图与来源'],
 ['上游版本与素材授权','UPSTREAM.md','图与来源'],
 ['完整 MIT 动作声明','web/THIRD_PARTY_NOTICES.md','图与来源'],
 ['本地安装与实际 API','web/README.md','工具'],
 ['原创示例伴奏源码','web/scripts/demo.ts','工具'],
 ['示范歌词','web/tests/demo.lrc','工具'],
 ['项目与研究资料入口','README.md','研究'],
 ['研究资料索引','notes/README.md','研究']
];
export const assets=[
 'assets/pdoom-mv-overview.png','assets/upstream-contact-sheet.jpg',
 'assets/local-mv-contact-sheet.jpg','assets/mv-studio-cover.png',
 'assets/mv-studio-desktop.png','assets/mv-studio-complete.png','assets/mv-studio-mobile.png',
 'assets/mv-style-ink.png','assets/mv-style-flat.png',
 'assets/local-demo-15s.mp4','assets/local-demo-30s-ink.mp4'
];
const E=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const section=(id,n,title,intro)=>'<section class="section" id="'+id+'"><div class="section-title"><span>'+n+'</span><div><h2>'+E(title)+'</h2><p>'+E(intro)+'</p></div></div>';
const card=(title,text)=>'<article class="card"><h3>'+E(title)+'</h3><p>'+E(text)+'</p></article>';
const summaryParagraph=(text,label)=>'<p><strong class="paragraph-label">'+E(label)+'</strong>'+E(text)+'</p>';
const rootSource='https://github.com/yydshly/1010_codex_project/blob/main/projects/008-pdoom-video/web/';
const close='</section>';
export async function build(){
 const data=JSON.parse(await fs.readFile(path.join(project,'notes/research-summary.json'),'utf8'));
 // This output is isolated from the local app's Vite dist and runtime data.
 if(dist!==path.join(project,'web','dist-public'))throw Error('发布目录不合法');
 await fs.mkdir(dist,{recursive:true});
 // An explicit file whitelist prevents local uploads and credentials from entering the site.
 const published=[];
 async function put(file,bytes){const to=path.join(dist,file);await fs.mkdir(path.dirname(to),{recursive:true});await fs.writeFile(to,bytes);published.push({path:file,bytes:Buffer.byteLength(bytes),sha256:createHash('sha256').update(bytes).digest('hex')});}
 let h='<section class="hero" id="overview"><div class="hero-copy"><p class="eyebrow">008 / PDOOMVIDEO → 纸间 MV</p><h1>让自己的角色，<br>成为音乐的主角。</h1><p class="lead">从一支编排好的角色 MV，走向可调整、可复用的创作工具。</p><p>'+E(data.thesis)+'</p><div class="hero-actions"><a class="button primary" href="#effects">观看实际效果 <span>↗</span></a><a class="button" href="#complete-summary">阅读完整理解</a><button class="text-button" type="button" data-poster>放大引导图 ↗</button></div><div class="hero-facts"><div><strong>9 章</strong><span>源库固定歌曲剧情</span></div><div><strong>15 / 30 秒</strong><span>本地实测成片</span></div><div><strong>3 种</strong><span>本地预设画风</span></div></div><p class="hero-note">音乐提供节奏，分镜决定演什么，时间函数让角色动起来。</p></div><figure class="poster"><button type="button" data-poster aria-label="放大我们已生成的研究总览图"><img src="./assets/pdoom-mv-overview.png" width="1024" height="1536" alt="已生成的中文总览图：源库原效果、本地探索、底层原理、价值和扩展路线"></button><figcaption>沿用已有总览图 · 1024 × 1536 原文件<br><a href="./assets/pdoom-mv-overview.png" download>下载引导图</a></figcaption></figure></section>';
 h+='<div class="scope"><span class="status source">源库作品</span><span>固定歌曲、预写场景</span><span class="status verified">本地已验证</span><span>参数化工具与两支成片</span><span class="status planned">产品目标</span><span>自动音乐理解与丰富剧情</span></div>';
 h+=section('effects','01','先看画面，再看能力','原作与我们的工具分别保留实际证据。总览图用于引导，下面的截图与 MP4 才是具体效果。');
 h+='<div class="effect-grid"><article class="source-effect"><span class="status source">上游源码原始渲染</span><h3>九章叙事里的同一位主角</h3><img class="contact" src="./assets/upstream-contact-sheet.jpg" width="1440" height="810" loading="lazy" alt="上游固定源码的九个时刻：实验室、剧场、健身房、神经网络、数据中心和谢幕"><p>Clawd、研究员、道具、镜头与水彩墨线共同承担剧情。歌曲、歌词时间和章节已写入代码；换歌需要重新编排。</p><p class="caption">本机验证：九帧抽样＋0.5 秒编码片段；完整原片未在本机渲染。</p><a class="inline-link" href="https://www.youtube.com/watch?v=8j-hR4fJywU" target="_blank" rel="noreferrer">观看作者完整作品 ↗</a></article><article class="local-effect"><span class="status verified">本地真实成片</span><h3>纸间 MV · 15 秒水彩短片</h3><video id="video15" controls playsinline preload="metadata" poster="./assets/local-mv-contact-sheet.jpg" src="./assets/local-demo-15s.mp4"></video><div class="video-meta"><span>1280×720</span><span>24 fps / 360 帧</span><span>H.264＋AAC</span></div><p>实际浏览器流程：WAV／LRC → 主角「小桃」与帽子 → 规则草案与手动修改 → 音乐预览 → 导出与完整解码。</p><a class="inline-link" href="./assets/local-demo-15s.mp4" download>下载 15 秒成片 ↗</a></article></div>';
 h+='<div class="second-film"><div><span class="status verified">本地真实成片</span><h3>30 秒 · 墨线素描与续跑验证</h3><p>MP3／SRT，主角「小墨」，手动 88 BPM 与 0.21 秒首拍偏移。任务取消后保留已有帧，继续时补回缺失帧，最终输出 1080p、720 帧。</p><p class="caption">两支影片使用原创合成伴奏，没有人声。媒体规格和完整解码均通过；不是声学歌词对齐或唱歌口型的证据。</p><a href="./assets/local-demo-30s-ink.mp4" class="inline-link" download>下载 30 秒成片 ↗</a></div><video id="video30" controls playsinline preload="metadata" poster="./assets/mv-style-ink.png" src="./assets/local-demo-30s-ink.mp4"></video></div>'+close;
 h+=section('comparison','02','能力比较：作品、工具与目标','把原库具备的能力、本地新增能力和待扩展方向放在同一张表中，方便判断可以直接使用什么。');
 h+='<div class="table-wrap"><table><thead><tr><th>能力</th><th><span class="status source">源库</span></th><th><span class="status verified">本地探索</span></th><th><span class="status planned">可扩展</span></th></tr></thead><tbody>'+data.capabilities.map(x=>'<tr><th>'+E(x.title)+'</th><td>'+E(x.source)+'</td><td>'+E(x.local)+'</td><td>'+E(x.next)+'</td></tr>').join('')+'</tbody></table></div><aside class="callout"><strong>当前自动分镜：手动 BPM ＋ 歌词关键词规则。</strong><p>不会自动分析音频情绪、节拍或歌曲结构。真实模型适配器已实现，尚未配置与实测；任意图片角色绑定、准确唱词对齐和演唱口型仍待补齐。</p></aside>'+close;
 h+=section('workflow','03','底层执行链：每个模块分别做什么？','选择步骤查看职责。创作规划决定剧情，确定性执行器负责画面，编码工具负责最终成片。');
 h+='<div class="pipeline" role="group" aria-label="本地 MV 六步执行链">'+data.pipeline.map((x,i)=>'<button class="step'+(i===0?' active':'')+'" data-step="'+i+'" type="button" aria-pressed="'+(i===0)+'"><span>0'+(i+1)+'</span><strong>'+E(x.title)+'</strong><small>'+E(x.owner)+'</small></button>').join('')+'</div><div id="stepDetail" class="step-detail" aria-live="polite"><span id="stepOwner">'+E(data.pipeline[0].owner)+'</span><h3 id="stepTitle">'+E(data.pipeline[0].title)+'</h3><p id="stepText">'+E(data.pipeline[0].text)+'</p></div>';
 h+='<div class="principles">'+card('时间驱动画面','全局 t 选镜头，局部 t 算角色、道具、相机与转场；尽量不依赖上一帧，可以拖动、重画与续跑。')+card('节拍驱动动作','拍位＝(t − offset) × BPM ÷ 60。正弦、脉冲与形变组织摆动、跳跃、挥手；当前节拍参数手动输入。')+card('风格来自绘制','源库 p5.js / p5.brush 组织自然笔刷、墨线与纸纹；本地 Canvas 2D 用不同填充、排线和描边。')+card('AI 与程序分工','原版 AI 辅助写分镜与代码；本地可选模型输出受约束 JSON。动画运行执行程序，模型不逐帧绘图。')+'</div>';
 h+='<div class="formula"><span>本地已验证</span><code>帧 → t = frame / 24 → 角色与镜头 → Chrome → ffmpeg → MP4</code><p>输出验收：尺寸、fps、帧数、音视频时长＋完整解码。源库线条每秒抖动 12 次，和 24 fps 输出是不同概念。</p></div>'+close;
 h+=section('modules','04','九组模块：从源码找到复用位置','保留固定上游提交链接和我们的对应实现，便于从理解继续进入代码。');
 h+='<div class="module-grid">'+data.modules.map((m,i)=>'<article class="module"><span class="module-number">0'+(i+1)+'</span><h3>'+E(m.title)+'</h3><p>'+E(m.role)+'</p><div><small>源库</small><a href="'+data.upstream+'/'+(m.type||'blob')+'/'+data.revision+'/'+m.source+'" target="_blank" rel="noreferrer">'+E(m.source)+' ↗</a>'+(m.extra?'<a href="'+data.upstream+'/blob/'+data.revision+'/'+m.extra+'" target="_blank" rel="noreferrer">'+E(m.extra)+' ↗</a>':'')+'</div><div><small>本地</small><a href="'+rootSource+m.local+'" target="_blank" rel="noreferrer">'+E(m.local)+' ↗</a>'+(m.localExtra?'<a href="'+rootSource+m.localExtra+'" target="_blank" rel="noreferrer">'+E(m.localExtra)+' ↗</a>':'')+'</div></article>').join('')+'</div>'+close;
 h+=section('studio','05','纸间 MV：本地工具已经可以怎么用？','参数化主角、音乐歌词、三种画风、分镜编辑、音乐同步预览与成片导出。');
 h+='<div class="studio-layout"><div><img src="./assets/mv-studio-desktop.png" loading="lazy" alt="纸间 MV 实际本地工具全页截图：角色参数、音乐、预览、分镜和导出"></div><div class="studio-copy"><span class="status verified">完整本地闭环</span><h3>把一个主角，编排成一支短片。</h3><ol><li>设置名字、配色、比例、眼睛、头饰与情绪。</li><li>上传 MP3／WAV，选取 15～30 秒并导入歌词。</li><li>选择画风、BPM 和首拍偏移，生成规则草案。</li><li>修改场景、动作、镜头与字幕，随音乐预览。</li><li>保存工程，导出 720p／1080p MP4。</li></ol><p>支持草稿恢复、JSON 导入导出、任务进度、取消和继续。当前一个主角、六类场景、六动作、五情绪、三个镜头运动。</p><a class="button" href="#run-local">查看本地启动方法</a></div></div>';
 h+='<div class="style-switch"><div class="style-controls" role="group" aria-label="查看真实画风"><h3>三种画风，真实画布对照</h3>'+data.styles.map((s,i)=>'<button class="style-button'+(i===0?' active':'')+'" data-style="'+i+'" aria-pressed="'+(i===0)+'" type="button">'+E(s.title)+'</button>').join('')+'<p id="styleDescription">'+E(data.styles[0].description)+'</p></div><img id="styleImage" src="./'+data.styles[0].file+'" loading="lazy" alt="'+E(data.styles[0].title)+'实际效果"></div>'+close;
 h+=section('value','06','价值与意义：让角色和创作流程持续复用','角色积累视觉身份，分镜保存创作意图，模块保留工程方法，让完成的一次作品成为下一次创作的起点。');
 h+='<div class="value-grid">'+card('自有 IP 与系列内容','让同一主角持续出现在不同歌曲、故事与介绍中，积累自己的视觉身份、动作、场景和画风。')+card('可检查、可修改','分镜、时间、动作与镜头是明确的数据；模型只提出计划，用户可以调整，程序执行和验证输出。')+card('研究与技术表达','可规划为项目介绍与科普短片，用角色解释搭建、观察、决策和输出；具体内容迁移目前尚未实现。')+card('创作资产与工程起点','可复用歌词解析、角色协议、模板动作、作业与验收。模板表达有限，下一阶段用实际内容检验改进。')+'</div><div class="use-cases"><strong>适用方向</strong><span>音乐片段</span><span>技术科普</span><span>研究介绍</span><span>动态绘本</span><span>品牌故事</span><span>活动祝福</span></div><p class="caption">效率、传播、教学与商业收益尚无实测对照。先验证一位主角、15～30 秒、有因果关系的镜头，再增加复杂度。</p>'+close;
 h+=section('roadmap','07','可扩展方向：让音乐参与真正的创作','最终目标：定制角色 → 上传歌曲（歌词可选）→ 选择画风 → 音乐理解与剧情编排 → 调整预览 → 导出专属 MV。');
 h+='<div class="roadmap">'+data.roadmap.map((r,i)=>'<article><span class="status planned">规划 · '+(i+1)+'</span><h3>'+E(r.phase)+'</h3><ul>'+r.items.map(t=>'<li>'+E(t)+'</li>').join('')+'</ul><p>'+E(r.criterion)+'</p></article>').join('')+'</div><p class="caption">生成式视频作为独立后端探索，不能从当前 Canvas 工具推断为已经拥有。音频分析、角色绑定和口型分别需要数据、算法和验收方法。</p>'+close;
 h+=section('complete-summary','08','九主题完整摘要','完整正文与结构化数据共用同一来源。检索主题、模块或资料，不省略关键原理与能力边界。');
 h+='<div class="search"><label for="researchSearch">检索理解与资料</label><input id="researchSearch" type="search" placeholder="例如：节拍、角色、AI、价值、口型、缓存" autocomplete="off"><button id="clearSearch" type="button" class="text-button" hidden>清除</button></div><p id="searchStatus" class="caption" aria-live="polite">9 个主题 · '+data.sections.reduce((n,s)=>n+s.body.length,0)+' 段正文</p><div class="summaries">'+data.sections.map(s=>'<details class="summary-section" open id="summary-'+s.id+'"><summary><h3>'+E(s.title)+'</h3><span>'+s.body.length+' 段</span></summary><div>'+s.body.map((t,i)=>summaryParagraph(t,s.labels[i])).join('')+'</div></details>').join('')+'</div><p id="summaryEmpty" hidden>没有找到相关内容，可缩短关键词或清除检索。</p><div class="hero-actions"><a class="button" href="./notes/research-summary.md" download>下载完整摘要</a><a class="button" href="./notes/research-summary.json" download>下载结构化数据</a></div>'+close;
 h+=section('library','09','原始资料、来源与验证证据','保留研究笔记、工程示例、媒体验证、原图说明与 MIT 原文。点击阅读原文，或下载继续研究。');
 h+='<div class="doc-filters" role="group" aria-label="资料分类">'+['全部','研究','验证','图与来源','工具'].map((f,i)=>'<button class="filter'+(i===0?' active':'')+'" type="button" data-filter="'+E(f)+'" aria-pressed="'+(i===0)+'">'+E(f)+'</button>').join('')+'</div><div class="documents">'+documents.map(([t,f,g])=>'<article class="document" data-group="'+E(g)+'"><span>'+E(g)+'</span><h3>'+E(t)+'</h3><small>'+E(f)+'</small><div><button class="text-button" data-doc="./'+f+'" data-title="'+E(t)+'" type="button">阅读原文 ↗</button><a href="./'+f+'" download>下载</a></div></article>').join('')+'</div><p id="docEmpty" hidden>当前分类或关键词没有匹配资料。</p>'+close;
 h+=section('run-local','10','在本机继续创作','公开页用于阅读研究、查看证据和播放成片。上传、模型请求与编码需要运行仓库里的本地服务。');
 h+='<div class="run-grid"><div><h3>启动本地最小工具</h3><pre><code id="runCommand">git clone https://github.com/yydshly/1010_codex_project.git\ncd 1010_codex_project/projects/008-pdoom-video/web\nnpm ci\nnpm run dev</code></pre><button class="text-button" id="copyCommand" type="button">复制启动命令</button><p>打开终端显示的 <code>http://127.0.0.1:4318</code>。需要 Node.js 22+、Chrome/Edge、ffmpeg 与 ffprobe；载入内置示例即可复现短片。</p></div><div><h3>模型与部署边界</h3><p>本地默认规则模式，不需要模型密钥。真实模型使用服务端兼容协议与环境配置，仅发送歌词和角色参数，失败会明确报错。真实模型未配置实测。</p><p>静态站点不执行音乐上传、Chrome 逐帧或 ffmpeg 编码。云端创作需要另建服务、作业队列和素材存储，并验证多用户与成本。</p><a href="https://github.com/yydshly/1010_codex_project/tree/main/projects/008-pdoom-video" target="_blank" rel="noreferrer" class="button">完整源码与本地工具 ↗</a></div></div>'+close;
 h+='<section class="credits"><h2>固定来源与阅读方式</h2><p><a href="'+data.upstream+'/tree/'+data.revision+'" target="_blank" rel="noreferrer">PDoomVideo @ '+data.revision.slice(0,7)+' ↗</a> · <a href="'+data.base+'/tree/'+data.baseRevision+'" target="_blank" rel="noreferrer">ClaudeAnimationBase @ '+data.baseRevision.slice(0,7)+' ↗</a></p><p>PDoomVideo 的 package.json 标注 ISC，未发现独立 LICENSE；基础库明确为 MIT。上游角色与音乐归相关权利人。我们的角色、场景、伴奏为新增内容，动作公式保留 MIT 声明。</p><p>引导图为生成式排版，保留原文件与制作时文字；精确效果以原始截图和实际 MP4 为准。网页发布状态以在线验收记录为准。</p><p class="caption">研究与整理：'+data.date+' · 源库 → 本地验证 → 可实施方案</p></section>';
 const template=await fs.readFile(path.join(web,'research/research.html'),'utf8');
 const html=template.replace('<!--CONTENT-->',h).replaceAll('@@DESCRIPTION@@',E(data.summary));
 await put('research.html',html);await put('index.html',html);
 await put('research.css',await fs.readFile(path.join(web,'research/style.css')));
 await put('research.js',await fs.readFile(path.join(web,'research/app.js')));
 await put('research-data.json',JSON.stringify({pipeline:data.pipeline,styles:data.styles},null,2));
 await put('favicon.svg',await fs.readFile(path.join(web,'public/favicon.svg')));
 for(const [title,file] of documents)await put(file,await fs.readFile(path.join(project,file)));
 for(const file of assets)await put(file,await fs.readFile(path.join(project,file)));
 const manifest={date:data.date,scope:'008-pdoom-video 静态研究；不包含本机运行数据或创作后台',files:published.sort((a,b)=>a.path.localeCompare(b.path))};
 await fs.writeFile(path.join(dist,'publication-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('008 研究网页：'+data.sections.length+' 个主题 / '+data.sections.reduce((n,s)=>n+s.body.length,0)+' 段正文 / '+documents.length+' 份原始资料 / '+published.length+' 项文件。');
 return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url))await build();
