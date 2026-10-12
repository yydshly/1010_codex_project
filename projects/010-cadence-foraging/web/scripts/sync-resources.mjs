import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, dirname, extname } from 'node:path';
import { createHash } from 'node:crypto';

const project = resolve(import.meta.dirname, '../..');
const web = resolve(project, 'web');
const labels = {
  'notes/research.md': '能力、效果、原理、场景、扩展与价值',
  'notes/capabilities-scenarios.md': '完整理解汇总：12 组算法与机制、14 个场景与业务设计',
  'notes/understanding-map.md': '一张研究总图：能力、算法作用、真实效果、扩展与价值',
  'notes/understanding-map-source.json': '研究总图来源：原截图裁取、数据和输出 SHA256',
  'assets/cadence-understanding-map.png': 'Cadence 中文研究总图 · 3200×6700 高清图片',
  'assets/cadence-understanding-map.svg': 'Cadence 中文研究总图 · 可放大、截图可点击的 SVG',
  'notes/capabilities-verification.md': '能力与业务地图的实际网页验证',
  'notes/capabilities-browser-verification.json': '能力地图：70 步、筛选检索、响应式与入口的浏览器凭据',
  'assets/capabilities-overview-desktop.jpg': '四类能力与任务反馈：能力地图实拍',
  'assets/capabilities-explorer-desktop.jpg': '无人机操作响应候选：五步闭环桌面实拍',
  'assets/capabilities-loop-mobile.jpg': '无人机候选的真实反馈说明：390 像素实拍',
  'notes/algorithm-implementation.md': 'NPC 底层算法与实际源码调用链',
  'notes/algorithm-visualization.md': '真实算法单步播放器说明',
  'notes/fish-research.md': '捕鱼预测：算法、数据与适用边界',
  'notes/fish-ep-sample.json': '一条训练鱼的真实 EP 自由态、正负扰动与参数更新',
  'notes/route-research.md': '街区线索与多步奖励研究',
  'notes/verification.md': '四店实验与研究汇总网页验证记录',
  'notes/route-verification.md': '街区实验验证记录',
  'notes/fish-verification.md': '捕鱼实验验证记录',
  'notes/README.md': '研究笔记与证据索引',
  'README.md': '项目说明与本机运行',
  'THIRD_PARTY.md': '来源与许可证说明',
  'runtime/README.md': 'Python 引擎、API 与复现命令',
  'web/README.md': '网页开发与构建说明',
  'assets/README.md': '实拍截图说明',
  'notes/pre-algorithm-completed-session.json': '历史会话：算法记录器接入前',
  'notes/earlier-odor-receipt.json.gz': '前期气味反转探索凭据（单独证据）',
};
const files = [];
async function collect(directory, category, accepts) {
  for (const entry of await readdir(resolve(project, directory), { withFileTypes: true })) {
    if (entry.isFile() && accepts(entry.name)) files.push({ path: `${directory}/${entry.name}`, category });
  }
}
await collect('notes', '研究笔记', n => n.endsWith('.md'));
await collect('notes', '实验数据', n => n.endsWith('.json') || n.endsWith('.gz'));
await collect('assets', '截图', n => /\.(jpg|png|svg)$/.test(n));
for (const item of files) if (item.path.startsWith('assets/cadence-understanding-map.')) item.category = '图解';
await collect('licenses', '许可证', n => n.endsWith('.txt'));
await collect('runtime', '代码与配置', n => /\.(py|toml|lock)$/.test(n));
for (const dir of ['web/src', 'web/src/rendering', 'web/scripts']) {
  await collect(dir, '代码与配置', n => /\.(js|css|mjs|py)$/.test(n));
}
for (const path of ['README.md', 'THIRD_PARTY.md', 'runtime/README.md', 'web/README.md', 'assets/README.md']) {
  files.push({ path, category: '项目说明' });
}
for (const path of ['web/index.html', 'web/route.html', 'web/fishing.html', 'web/fish-ep.html', 'web/guide.html', 'web/applications.html', 'web/research.html', 'web/replay.html', 'web/vite.config.js', 'web/package.json', 'web/package-lock.json']) {
  files.push({ path, category: '代码与配置' });
}
const resources = [];
for (const entry of files.sort((a, b) => a.path.localeCompare(b.path))) {
  const source = resolve(project, entry.path);
  if (relative(project, source).startsWith('..')) throw new Error(`Resource outside project: ${entry.path}`);
  const data = await readFile(source);
  const destination = resolve(web, 'public/research', entry.path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, data);
  const text = extname(source) === '.md' ? data.toString('utf8') : '';
  resources.push({
    ...entry, title: labels[entry.path] || text.match(/^#\s+(.+)/m)?.[1] || entry.path.split('/').at(-1),
    href: `./research/${entry.path}`, bytes: data.length,
    sha256: createHash('sha256').update(data).digest('hex'),
    viewable: !/\.(gz|jpg|png|svg)$/.test(source),
  });
}
await writeFile(resolve(web, 'src/research-resources.json'), JSON.stringify(resources, null, 2) + '\n');
console.log(`Research resources: ${resources.length} files, ${(resources.reduce((n, f) => n + f.bytes, 0) / 1048576).toFixed(1)} MiB; loaded only on demand.`);
