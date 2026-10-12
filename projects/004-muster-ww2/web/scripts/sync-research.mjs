/**
 * 构建网页资料包：保持研究源文件为唯一来源，dev/build 前自动复制并生成完整清单。
 * 不扫描依赖、构建产物或临时截图；不修改笔记、报告和原图。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const project = fileURLToPath(new URL('../../', import.meta.url));
const output = path.join(project, 'web/public/research');
const read = relative => fs.readFileSync(path.join(project, relative));
const exists = relative => fs.existsSync(path.join(project, relative));
const walk = dir => fs.readdirSync(path.join(project, dir), { withFileTypes: true })
  .flatMap(entry => entry.isDirectory() ? walk(dir + '/' + entry.name) : [dir + '/' + entry.name]);
const files = [...new Set([
  'README.md', 'web/README.md', 'web/UPSTREAM_README.md', 'web/THIRD_PARTY.md', 'web/LICENSE',
  ...walk('notes'), ...walk('assets'), ...walk('web/docs'), ...walk('web/licenses'),
  'web/src/assets/shared/human/README.md',
])].filter(relative => exists(relative) && (/\.(md|json|png|jpg|jpeg|webp|svg|wav|txt)$/i.test(relative) || relative === 'web/LICENSE')).sort();
const imageNotes = read('assets/README.md').toString('utf8');
const stage = p => p.includes('publication') ? '线上发布' : p.includes('airport-') ? '机场任务'
  : p.includes('combined-arms') || /battle-(airstrike|combined|infantry|jeep|enemy)/.test(p) ? '协同演习'
  : p.includes('battle-') ? '初版对战'
  : p.includes('fieldcamp-realism') ? '动作与声音'
  : p.includes('fieldcamp-motion') ? '动态营地'
  : p.includes('fieldcamp') ? '营地搭建'
  : p.includes('research-hub') ? '研究总入口' : '模型与来源';
const kind = p => /\.(png|jpg|jpeg|webp|svg)$/i.test(p) ? 'image'
  : /\.wav$/i.test(p) ? 'audio' : /\.json$/i.test(p) ? 'report' : 'document';
const items = files.map(relative => {
  const bytes = read(relative), type = kind(relative), name = path.basename(relative);
  let title = name, summary = '', date = null, passed = null, checks = null;
  if (type === 'document') title = bytes.toString('utf8').match(/^#\s+(.+)$/m)?.[1] ?? name;
  if (type === 'image') {
    const row = imageNotes.split(/\r?\n/).find(line => line.startsWith('|') && line.includes(name));
    summary = row?.split('|').slice(2).map(cell => cell.trim()).filter(Boolean).join(' · ').replace(/[\[\]`]/g, '').trim() ?? '';
    title = summary || name;
  }
  if (type === 'report') {
    const data = JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
    date = data.date ?? data.finished ?? null; passed = typeof data.passed === 'boolean' ? data.passed : null;
    checks = Array.isArray(data.checks) ? data.checks.length : Array.isArray(data.tests) ? data.tests.length : null;
  }
  const target = path.join(output, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target) || !fs.readFileSync(target).equals(bytes)) fs.writeFileSync(target, bytes);
  return { path: relative, url: 'research/' + relative, name, title, summary, type, stage: stage(relative),
    bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), date, passed, checks };
});
const counts = Object.fromEntries(['document', 'image', 'audio', 'report'].map(type => [type, items.filter(i => i.type === type).length]));
const manifest = {
  project: '004-muster-ww2', source: 'https://github.com/Kenton-GMI/muster-ww2',
  commit: '7d2fa86ebc3b999eaf085831cdcd5dccefea63d4', license: 'MIT', counts,
  scope: ['项目 README', 'notes 全部研究笔记与 JSON', 'assets 全部图片、音频与布局', 'Web 说明、上游说明、来源与许可证', '上游 docs 全部规范与 briefs', '共享人体说明'],
  items,
};
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('网页资料包同步完成：' + Object.entries(counts).map(([type, count]) => type + ' ' + count).join(' / '));

