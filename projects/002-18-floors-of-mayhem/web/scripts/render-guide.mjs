// New project-002 infographic, following the earlier paper/green overview style.
// Text and real screenshots are composed as a deterministic SVG, not AI image synthesis.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { research as r } from '../src/research-content.js';
import { escape as e } from './research-page.mjs';
const asset = name => fileURLToPath(new URL('../../assets/'+name,import.meta.url));
const hash = s => createHash('sha256').update(s).digest('hex');
const W=1920,M=56,G=24,inner=W-M*2,C={paper:'#f7f4eb',ink:'#2c4036',muted:'#64756a',line:'#d8ddcf',card:'#fffdf7',green:'#476d56'};
const elements=[];let y=65;
const rect=(x,y,w,h,fill=C.card)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${fill}" stroke="${C.line}"/>`;
function wrap(value,width,size){const measure=s=>[...s].reduce((n,c)=>n+(c.charCodeAt(0)>255?1:.57),0);const tokens=String(value).match(/[A-Za-z0-9_./:+×→-]+|\s+|[^\x00-\x7F]|./g)||[];const lines=[];let line='';for(const token of tokens){if(line&&measure(line+token)*size>width*.97){lines.push(line.trimEnd());line=token.trimStart();}else line+=token;}if(line)lines.push(line.trimEnd());return lines;}
function text(s,x,y,w,size=25,color=C.ink,weight=400){const lines=wrap(s,w,size);return{svg:`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}">${lines.map((line,i)=>`<tspan x="${x}" dy="${i?size*1.5:0}">${e(line)}</tspan>`).join('')}</text>`,height:lines.length*size*1.5};}
function push(s,x,yy,w,size=25,color=C.ink,weight=400){const t=text(s,x,yy,w,size,color,weight);elements.push(t.svg);return t.height;}
function section(n,title,note){elements.push(`<line x1="${M}" y1="${y}" x2="${W-M}" y2="${y}" stroke="${C.line}" stroke-width="2"/>`);y+=50;elements.push(`<circle cx="${M+20}" cy="${y-10}" r="20" fill="${C.green}"/>`);push(n,M+7,y-3,40,20,'white',600);push(title,M+54,y,inner-60,34,C.ink,600);y+=40;if(note)y+=push(note,M+54,y,inner-60,22,C.muted);y+=22;}
function row(items,columns=3){const cw=(inner-G*(columns-1))/columns;for(let i=0;i<items.length;i+=columns){const batch=items.slice(i,i+columns);const boxes=batch.map(([title,...body],j)=>{const x=M+j*(cw+G);let yy=y+42;const parts=[];const add=(s,size=24,color=C.ink,weight=400)=>{const t=text(s,x+24,yy,cw-48,size,color,weight);parts.push(t.svg);yy+=t.height+15;};add(title,28,C.ink,600);body.forEach((s,k)=>add(s,24,k===body.length-1?C.muted:C.ink));return{x,height:yy-y+9,body:parts.join('')};});const h=Math.max(...boxes.map(b=>b.height));boxes.forEach(b=>elements.push(rect(b.x,y,cw,h),b.body));y+=h+G;}}
const uri=name=>{const bytes=fs.readFileSync(asset(name));const mime=bytes[0]===0xff&&bytes[1]===0xd8?'jpeg':'png';return 'data:image/'+mime+';base64,'+bytes.toString('base64');};
async function screenshotRow(items){const cw=(inner-G*(items.length-1))/items.length;const imageH=cw*9/16;let max=0;const cards=items.map(([title,name,caption],i)=>{const x=M+i*(cw+G);let yy=y+39;const parts=[text(title,x+20,yy,cw-40,26,C.ink,600).svg];yy+=26;parts.push(`<image href="${uri(name)}" x="${x+14}" y="${yy}" width="${cw-28}" height="${imageH}" preserveAspectRatio="xMidYMid meet"/>`);yy+=imageH+30;const t=text(caption,x+20,yy,cw-40,22,C.muted);parts.push(t.svg);max=Math.max(max,yy+t.height-y+12);return{x,body:parts.join('')};});cards.forEach(c=>elements.push(rect(c.x,y,cw,max),c.body));y+=max+G;}
push('002 / 研究汇总 · 2026-10-12',M,y,inner,24,C.muted,500);y+=70;
push('18 Floors of Mayhem',M,y,inner,66,C.ink,700);y+=62;
push('从游戏玩法，到 AI 驱动的可行动世界',M,y,inner,38,C.ink,600);y+=58;
y+=push(r.conclusion,M,y,inner,28,C.ink,500)+22;
row([['原库 / 已实现','像素游戏、规则与房间、模型选手。','以固定源码、上游测试和本地运行核对。'],['我们的扩展 / 已验证','模型观察室、机甲动态战术、樱街守灯夜。','独立实现；不当作上游自带能力。'],['下一步 / 研究方向','任务内容、关系记忆、编辑器、云端与多人。','没有实现的功能不以效果图代替验证。']]);
section('01','原库的能力与真实画面','Canvas 2D 像素冒险；三维画面来自我们后来设计的独立扩展。');
await screenshotRow([['作者资料 · 妖王平台战','upstream-boss.png','上游作者截图；不是我们本次通关证据。'],['本地运行 · 大厅与角色','lobby.png','本机实际大厅；角色、章节和玩法入口。'],['真实模型 · 对战观察室','ai-battle.png','MiniMax、OpenAI、CPU；决策、按键与落地记录。']]);
row([['玩法闭环','程序地图 → 下落机关 → 补给与技能 → 精英 / Boss → 战利品与结算。','“81 难”是九章各九条配置；共有九个章末 Boss。'],['参与方式','单人、规则电脑、朋友房间、双人协作、乱斗、限时竞速与观战。','12 玩家房间上限；6 个 AI 配置席位。'],['模型能力','状态 / 可选画面观察；选择落点与道具；人格、计划、日志与复盘。','Boss 主要由规则控制；提示词记忆不训练权重。']]);
section('02','八类模块：渲染、规则、房间和模型各管什么','可复用的是分工与接口，不能把不同游戏的坐标、素材和任务直接互换。');
row(r.modules,4);
section('03','底层原理：观察 → 决策 → 校验 → 行动 → 反馈','模型做较慢的策略选择；连续运动、命中、物资消耗和胜负由确定性规则裁定。');
row(r.loop.map((s,i)=>['0'+(i+1)+' / '+s.name,s.owner,s.text]),5);
row([['原游戏引擎','纯数据状态；约 1/60 秒固定步长；种子地图；900×680 逻辑画布与低分辨率背景。','图像和粒子表现规则结果，不决定碰撞。'],['房间与执行','WebSocket 发按键；服务端判定；Node / Worker 共用 Room；本地执行器修正目标。','模型等待、过期或非法时由规则接管。'],['记录与记忆','保留输入、输出、应用时刻、实际行动、耗时、Token 与结果；赛后总结入下局提示。','理由是公开说明；不是内部推理或权重训练。']]);
section('04','我们实际做出的产品效果','从原游戏参考，扩展到玩家行为驱动的指挥，再扩展到能听懂分工的小镇。');
await screenshotRow([['原创 3D · 霓虹机甲动作','neon-rift-combat.png','真实机甲场景：移动、射击、冲刺、脉冲与敌军战术。'],['OpenAI · 战斗中调整','neon-openai-dynamic-log.png','两次有效动态命令；敌机的目标和推进发生变化。'],['樱街守灯夜 · 分工与 NPC','ai-town-decisions.png','真实小镇实拍：伙伴、NPC、纸灵、环境与共同目标。']]);
row(r.cases.map(c=>[c.name,c.text,...c.facts]));
section('05','AI 可扮演六种角色：从说话到行动','小镇通过一次模型调用统一分工；不是六个独立智能体，也不是通用开放世界。');
row(r.roles,3);
section('06','使用场景与对你的价值','每个方向都要落实一个用户任务，并补足内容、状态与验收指标。');
row(r.scenarios,3);
row([['开发资产','观察与命令协议、规则 / 表现分离、本地执行器、事件和记录。','开发 AI 辅助与游戏运行 AI 分开看。'],['体验资产','战术教练、队伍分工、可行动 NPC 与环境变化，让场景有目标和结果。','画面质感仍依靠美术、渲染与动作设计。'],['研究资产','规则基线 + 模型决策 + 实际行动证据；失败、延迟和非法命令同样可回查。','一次获胜不证明更强、更有趣或商业收益。']]);
section('07','可扩展方向：先把一个闭环做扎实','已实现与未来方向分开；本次整理到此即可，不把路线写成已有能力。');
row(r.roadmap.map(([status,title,body,accept])=>[status+' / '+title,body,accept]),4);
section('08','验证边界、来源与复用约束','196 项是 10 月 10 日上游测试记录；模型耗时是有限实测样本。');
row([['模型不是逐帧遥控','原像素实时局 8 条落点回复均过期。小镇 MiniMax 第二轮非法地点被拒绝。','限额、超时、时效校验、错误保留与规则接管必需。'],['网页与本机服务','公开网页展示研究、效果与原始记录；真实房间和模型桥接仍在本机。','没有公开平台登录或 MiniMax 密钥，也没有通用 AI 生成地图。'],['还需要验证','稳定胜率、教学效果、真实成本、跨局记忆收益、手机真机性能、公网压力。','源码 MIT 不自动覆盖图像、角色、音乐、字体和视频。']]);
y+=15;y+=push('上游：andyhuo520/18-floors-of-mayhem · commit 99d7215966762a13b17b54d36f9ae3e3b96f98df · 源码 MIT',M,y,inner,21,C.muted)+10;
y+=push('视觉扩展参考 Sakura Crossing：de01898e89c7f6ab3fad93fa802f0f5ac66fbd81；机甲为原创。证据：ai-battle / openai-dynamic / ai-town 实测记录。',M,y,inner,21,C.muted)+10;
y+=push('总图根据研究数据排版，嵌入六张已有画面；矢量 SVG、高清 PNG、网页文字和来源说明一并保留。',M,y,inner,21,C.muted)+25;
const H=Math.ceil(y);
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"><title>项目 002 · 游戏玩法与 AI 接入完整研究总图</title><desc>能力、八类模块、五步原理、六张真实效果、三类实测、六种角色、场景、价值、扩展和边界。</desc><style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}</style><rect width="${W}" height="${H}" fill="${C.paper}"/>${elements.join('\n')}</svg>`;
if(process.argv.includes('--check')){
 if(fs.readFileSync(asset('research-overview.svg'),'utf8')!==svg)throw new Error('总图 SVG 已过期。');
 const record=JSON.parse(fs.readFileSync(asset('guide-export.json'),'utf8'));
 if(record.svgSha256!==hash(svg)||record.pngSha256!==hash(fs.readFileSync(asset('research-overview.png')))||record.webpSha256!==hash(fs.readFileSync(asset('research-guide.webp'))))throw new Error('引导图产物与记录不一致。');
 console.log(`总图一致：${record.width}×${record.height}，含 6 张已有画面。`);
}else{
 fs.writeFileSync(asset('research-overview.svg'),svg);
 const idx=process.argv.indexOf('--sharp-module');
 if(idx<0)throw new Error('请提供 --sharp-module 指定已有 sharp，不新增运行依赖。');
 const sharp=createRequire(import.meta.url)(process.argv[idx+1]);
 const png=await sharp(Buffer.from(svg),{density:144,limitInputPixels:120e6}).png({compressionLevel:9}).toBuffer();
 const webp=await sharp(png).resize({width:1280}).webp({quality:88}).toBuffer();
 fs.writeFileSync(asset('research-overview.png'),png);fs.writeFileSync(asset('research-guide.webp'),webp);
 fs.writeFileSync(asset('guide-export.json'),JSON.stringify({date:r.updated,width:W*2,height:H*2,svgSha256:hash(svg),pngSha256:hash(png),webpSha256:hash(webp),operation:'根据本项目研究重新排版总图；嵌入已有真实截图，未合成或改画运行效果。'},null,2)+'\n');
 console.log(`总图导出：${W*2}×${H*2}。`);
}
