import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const workspace=path.resolve(project,'../..');
const argument=process.argv.indexOf('--checkout');
if(argument<0||!process.argv[argument+1]) throw new Error('请传入已从最新远端准备的 --checkout 绝对路径。');
const checkout=path.resolve(process.argv[argument+1]);
if(checkout===workspace||!fs.existsSync(path.join(checkout,'.git'))) throw new Error('发布检出必须是独立 Git 工作树。');
const entry=JSON.parse(fs.readFileSync(path.join(workspace,'projects.json'),'utf8')).projects.find(p=>p.id===11&&p.slug==='segment-snap');
if(!entry) throw new Error('本地011登记不存在。');
const target=path.join(checkout,'projects/011-segment-snap');
fs.cpSync(project,target,{recursive:true,filter:file=>!['dist','node_modules','vendor','.cache'].includes(path.basename(file))});
const catalogPath=path.join(checkout,'projects.json');
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
const existing=catalog.projects.findIndex(p=>p.id===11);
if(existing>=0&&catalog.projects[existing].slug!=='segment-snap') throw new Error('远端011编号冲突。');
if(existing>=0) catalog.projects[existing]=entry; else catalog.projects.push(entry);
catalog.projects.sort((a,b)=>a.id-b.id);
fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
const article='<article><h2><a href="./011-segment-snap/research.html">011 · Segment–Snap：从三维扫描到操作理解</a></h2><a href="./011-segment-snap/research.html"><img src="./011-segment-snap/assets/research-overview-preview.png" alt="Segment–Snap作者效果、门抽屉示意、能力原理、个人价值和扩展理解总图" width="280" loading="lazy" style="max-width:100%;height:260px;object-fit:cover;object-position:top"></a><p>既有总图引导，九主题36段完整理解、11组模块、三个学习模型与固定几何语义规则、作者AP和已验证门抽屉示意、训练推理分工、使用场景、个人项目价值、五阶段扩展及13份原始资料。网页提供研究和自有交互，GPU模型未运行，跨项目动作接口与机器人执行未接入。</p><a href="./011-segment-snap/index.html#lab">操作柜门与抽屉原理示意 →</a></article>';
for (const base of [workspace,checkout]) {
  const workflow=path.join(base,'.github/workflows/pages.yml');
  let yaml=fs.readFileSync(workflow,'utf8');
  if(!yaml.includes("'projects/011-segment-snap/**'")) yaml=yaml.replace("      - 'projects/010-cadence-foraging/**'","      - 'projects/010-cadence-foraging/**'\n      - 'projects/011-segment-snap/**'");
  if(!yaml.includes('working-directory: projects/011-segment-snap/web')) yaml=yaml.replace('      - run: npm run site:assemble','      - name: Build and verify Segment-Snap research and illustrative interactions\n        run: npm run research:sync && npm run check && npm run build && npm run publication:check\n        working-directory: projects/011-segment-snap/web\n      - run: npm run site:assemble');
  fs.writeFileSync(workflow,yaml);
  const assembler=path.join(base,'scripts/assemble-site.mjs');
  let script=fs.readFileSync(assembler,'utf8');
  if(!script.includes("'011-segment-snap'")) script=script.replace("'010-cadence-foraging',","'010-cadence-foraging', '011-segment-snap',");
  if(!script.includes('011 · Segment–Snap')) script=script.replace('<article><h2><a href="./014-print-bench/research.html">',article+'<article><h2><a href="./014-print-bench/research.html">');
  fs.writeFileSync(assembler,script);
  const doc=path.join(base,'docs/web-deployment.md');
  let description=fs.readFileSync(doc,'utf8');
  if(!description.includes('011 Segment–Snap 研究发布接入')) description += '\n\n## 2026-10-12 · 011 Segment–Snap 研究发布接入\n\n011沿用既有3600×5000理解总图，原PNG/SVG不改，统一九主题36段完整摘要、11组职责模块、三个学习预测器与固定几何语义规则、作者AP和本地门抽屉示意、训练推理分工、使用场景、个人价值及五阶段扩展。13份原始资料可页内阅读和下载；两页互相导航。\n\n固定路径为 `011-segment-snap/research.html`，原观察台为同目录 `index.html`。子项目执行 `npm run research:sync`、`npm run check`、`npm run build`、`npm run publication:check`；根目录同步登记、检查并组装。32项静态文件含逐文件SHA-256清单，CI不生成图、不下载模型、不训练。现有11个项目发布路径保留。\n\n仅发布静态研究与自有几何交互，不部署上游GPU推理、数据上传或机器人执行。旧图及笔记保留阶段状态；正式HTTPS与资源验收通过后才登记实际demo。实际部署及验证见011的 `notes/publication-verification.json`。\n';
  fs.writeFileSync(doc,description);
}
console.log(`已将011及其发布入口准备到 ${checkout}；其他项目源码未复制。`);
