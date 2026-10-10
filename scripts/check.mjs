import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { directoryFor, ensure, loadCatalog, readmePath, root, updateReadme } from './lib.mjs';

try {
  const catalog = loadCatalog();
  const readme = readFileSync(readmePath, 'utf8');
  ensure(updateReadme(readme, catalog) === readme, '根 README 的生成区块已过期，请运行 npm run catalog:sync');
  const registered = new Set(catalog.projects.map(directoryFor));
  for (const entry of readdirSync(path.join(root, 'projects'), { withFileTypes: true })) {
    if (entry.isDirectory()) ensure(registered.has(entry.name), `未登记的子项目目录：projects/${entry.name}`);
  }
  console.log(`检查通过：${catalog.projects.length} 个项目，编号、目录、图片与根 README 一致。`);
} catch (error) {
  console.error(`检查失败：${error.message}`);
  process.exitCode = 1;
}
