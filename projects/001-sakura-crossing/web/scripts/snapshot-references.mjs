import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../../', import.meta.url));
const projects = path.dirname(project);
const destination = path.join(project, 'references');
const data = JSON.parse(fs.readFileSync(path.join(project, 'notes/research-hub.json'), 'utf8'));
const images = ['upstream-controls', 'desktop', 'modules-minimal', 'modules-gpu-check', 'reflection-off', 'reflection-on', 'modules-droplets-off', 'modules-droplets-on', 'upstream-bloom-off'];
const paths = [...new Set([
  ...data.documents.filter(item => item.project === '012').map(item => item.path),
  ...images.map(name => `012-threejs-conference/assets/${name}.jpg`),
  '012-threejs-conference/README.md',
  '005-taohuayuan/README.md',
])];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
if (process.argv.includes('--check')) {
  const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json'), 'utf8'));
  for (const relative of paths) {
    const record = manifest.files.find(item => item.path === relative);
    const bytes = fs.readFileSync(path.join(destination, relative));
    if (!record || digest(bytes) !== record.sha256) throw new Error(`引用快照不一致：${relative}`);
  }
  console.log(`引用快照检查通过：${paths.length} 个必要文件。`);
} else {
  const files = paths.map(relative => {
    const original = fs.readFileSync(path.join(projects, relative));
    // Match the repository's eol=lf policy so Linux CI verifies the same bytes.
    const bytes = /\.(md|json)$/.test(relative)
      ? Buffer.from(original.toString('utf8').replace(/\r\n/g, '\n').trimEnd() + '\n')
      : original;
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
    return { path: relative, bytes: bytes.length, sha256: digest(bytes), originalSha256: digest(original) };
  });
  fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify({
    schemaVersion: 1, capturedAt: '2026-10-12',
    purpose: '仅发布 001 所需的跨项目说明、证据与实拍；不包含其他子项目应用。',
    sources: data.sources, files,
  }, null, 2) + '\n');
  console.log(`已保存 ${files.length} 个必要引用快照。`);
}
