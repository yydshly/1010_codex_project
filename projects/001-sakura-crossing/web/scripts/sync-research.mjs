import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const projectsRoot = path.dirname(projectRoot);
const repoRoot = path.dirname(projectsRoot);
const notesPath = path.join(projectRoot, 'notes', 'research-hub.json');
const outputPath = path.join(projectRoot, 'notes', 'research-summary.md');
const data = JSON.parse(fs.readFileSync(notesPath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, 'projects.json'), 'utf8'));
const errors = [];
const requireFile = (relative, root = projectsRoot) => {
  const snapshot = path.join(projectRoot, 'references', relative);
  const file = root === projectsRoot && relative.startsWith('012-') ? snapshot : path.join(root, relative);
  if (!fs.existsSync(file)) errors.push(`文件不存在：${relative}`);
};
if (!Array.isArray(data.executiveSummary) || data.executiveSummary.length !== 6) errors.push('完整摘要必须包含六个分区。');
const summarySections = data.executiveSummary.map(item => ({title:item.title, body:item.paragraphs}));
if (JSON.stringify(registry.projects.find(item => item.id === 1)?.summarySections) !== JSON.stringify(summarySections)) errors.push('根登记表的分区摘要与研究内容不一致。');
for (const key of ['entries', 'comparisons', 'principles', 'documents']) {
  const ids = data[key].map(item => item.id);
  if (new Set(ids).size !== ids.length) errors.push(`${key} 中的 ID 重复`);
}
const entries = new Set(data.entries.map(item => item.id));
const principles = new Set(data.principles.map(item => item.id));
const documents = new Set(data.documents.map(item => item.id));
const imagePath = reference => reference.replace(/^001\//, '001-sakura-crossing/assets/').replace(/^012\//, '012-threejs-conference/assets/');
for (const item of data.entries) {
  requireFile(imagePath(item.image));
  if (item.href.startsWith('./')) requireFile(item.href.split('#')[0].slice(2), path.join(projectRoot, 'web'));
  else if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(item.href)) errors.push(`演示地址应为实际本地入口：${item.href}`);
  if (item.publicHref) {
    if (!/^\.\.\/\d{3}-[a-z0-9-]+\/[a-z-]+\.html$/.test(item.publicHref)) errors.push(`公开入口路径错误：${item.publicHref}`);
    const [slug, page] = item.publicHref.slice(3).split('/');
    requireFile(page, path.join(projectsRoot, slug, 'web'));
  }
}
for (const item of data.comparisons) {
  requireFile(imagePath(item.before)); requireFile(imagePath(item.after));
  if (!entries.has(item.entry) || !principles.has(item.principle)) errors.push(`对照引用无效：${item.id}`);
}
for (const item of data.principles) {
  if (!entries.has(item.entry) || !documents.has(item.doc)) errors.push(`原理引用无效：${item.id}`);
}
for (const item of data.evidence) if (!documents.has(item.doc)) errors.push(`证据引用无效：${item.type}`);
for (const item of data.documents) requireFile(item.path);
for (const source of data.sources) if (!/^[0-9a-f]{40}$/.test(source.commit)) errors.push(`来源 commit 无效：${source.name}`);
for (const project of registry.projects) requireFile(`${String(project.id).padStart(3, '0')}-${project.slug}/README.md`);
requireFile('web/packages/research-rain-kit-0.1.0.tgz', projectRoot);
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

const note = id => data.documents.find(doc => doc.id === id);
const reference = id => `[${note(id).title}](${note(id).project === '012' ? '../references/' : '../../'}${note(id).path})`;
const table = (headers, rows) => [
  `| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map(row => `| ${row.map(cell => String(cell).replace(/\|/g, '\\|').replace(/\n/g, '<br>')).join(' | ')} |`),
].join('\n');
const lines = [
  '# 场景研究统一汇总', '',
  '> 此文件由 `web/scripts/sync-research.mjs` 根据 `notes/research-hub.json` 生成。请修改数据后运行 `npm run research:sync`，不要手动改写生成文件。', '',
  `更新：${data.updatedAt}。${data.scope}`, '',
  `统一入口：[场景研究手册](../web/research.html)。本机启动后访问 http://127.0.0.1:5188/research.html；静态体验可由 GitHub Pages 托管，模型游戏和 012 独立演示需本机服务。`, '',
  '## 完整摘要：能力、模块、原理、场景、价值与扩展', '',
  ...data.executiveSummary.flatMap(item => [`### ${item.title}`, '', ...item.paragraphs.flatMap(text => [text, ''])]),
  '## 1. 我们的核心理解', '', data.conclusion, '',
  ...data.questions.flatMap(item => [`### ${item.q}`, '', item.a, '']),
  '## 2. 完整体验入口', '',
  ...data.entries.flatMap(item => [
    `### ${item.title}`, '', `${item.subtitle}。${item.status}；${item.renderer}。`, '', item.description, '',
    `观察：${item.observe}`, '',
    `入口：${item.href}。${item.service}；${item.href.startsWith('./') && item.id !== 'sakura-game' ? '可静态发布的体验' : '需要本机服务，不在本次静态发布范围内'}。`, '',
    '```powershell', `cd projects/${item.project === '012' ? '012-threejs-conference' : '001-sakura-crossing'}/web`, item.command, '```', '',
  ]),
  '## 3. 真实效果对照', '',
  ...data.comparisons.flatMap(item => [`### ${item.label}`, '', item.title, '', item.text, '', `截图类型：${item.kind}。${item.beforeLabel} / ${item.afterLabel}。`, '']),
  '## 4. 技术底层与可复用价值', '',
  '更新顺序：宿主场景与输入 → 相机和世界矩阵 → 高度图 / GPU 雨滴 → 材质时间与镜像反射 → 宿主最终渲染。观察与漫游控制器互斥。', '',
  ...data.principles.flatMap(item => [
    `### ${item.name}`, '', `**${item.summary}**`, '', `计算路径：${item.tag}`, '',
    ...item.steps.map((step, index) => `${index + 1}. ${step}`), '',
    `观察方法：${item.observe}`, '', `复用价值：${item.value}`, '', `边界与成本：${item.limit}`, '', `详见：${reference(item.doc)}。`, '',
  ]),
  '## 5. 跨项目接入与资源所有权', '',
  '实际接入：001 原场景 / 动画风格 + 012 Rain Kit 天气、湿地与漫游 → 晴雨樱花街。水珠在独立最小场景中体验。', '',
  table(['层', '负责', '可沿用', '边界'], data.ownership.map(item => [item.layer, item.owns, item.reuse, item.boundary])), '',
  ...data.modules.flatMap(item => [`### ${item.name}`, '', `\`${item.api}\``, '', `配置：${item.options}`, '', `接口：${item.methods}`, '', `宿主提供：${item.host}`, '', `成本：${item.cost}`, '']),
  '### 接入步骤', '', ...data.reuseSteps.map((step, index) => `${index + 1}. ${step}`), '',
  `最小宿主、完整参数、源码出处：${reference('kit-start')}、${reference('kit-api')}、${reference('kit-license')}。`, '',
  '@research/rain-kit 0.1.0 为 private / UNLICENSED 的本地研究包，没有发布到公共 npm。固定 Three.js 0.185.1 / three-mesh-bvh 0.9.13；天气与节点材质需要节点渲染器，传统 WebGLRenderer 项目要先适配。', '',
  '## 6. 验证依据与结论边界', '',
  ...data.evidence.flatMap(item => [`### ${item.type}`, '', item.result, '', `证据：${item.proof}`, '', `限制：${item.limit}`, '', `记录：${reference(item.doc)}。`, '']),
  '## 7. 扩展顺序', '',
  ...data.roadmap.flatMap(item => [`### ${item.state} · ${item.title}`, '', ...item.items.map(text => `- ${text}`), '']),
  '七种产品用途的完整数据与待补能力见产品方向笔记；旧方向研究保留当时阶段，本汇总补充后来的 AI、天气与漫游进展。', '',
  '## 8. 全部中文资料', '',
  ...data.documents.map(doc => `- ${doc.project} / ${doc.category}：${reference(doc.id)}`), '',
  '## 9. 仓库其他研究项目', '',
  ...registry.projects.flatMap(project => [`- ${String(project.id).padStart(3, '0')} [${project.name}](../../${String(project.id).padStart(3, '0')}-${project.slug}/README.md)：${project.summary}`]), '',
  '## 10. 上游与许可证', '',
  ...data.sources.flatMap(source => [`### ${source.name}`, '', `[研究时的源码](${source.url}/tree/${source.commit}) · commit \`${source.commit}\``, '', source.role, '', source.license, '']),
  '原完整城市的模型、贴图、音视频与水珠来源分别核对授权。本地模块重新编写水珠近似效果，不把原 CC BY-NC-SA shader 当作 MIT 打包。上游研究、实际复现、本地原创和后续方案在页面分别注明。', '',
];
const output = `${lines.join('\n').trim()}\n`;
if (process.argv.includes('--check')) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== output) {
    console.error('研究汇总已过期，请执行 npm run research:sync。'); process.exit(1);
  }
  console.log(`研究汇总完整性通过：${data.entries.length} 个入口，${data.principles.length} 项原理，${data.documents.length} 份资料，${registry.projects.length} 个子项目。`);
} else {
  fs.writeFileSync(outputPath, output, 'utf8');
  console.log(`已生成 ${path.relative(repoRoot, outputPath)}。`);
}
