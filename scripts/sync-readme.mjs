import { readFileSync, writeFileSync } from 'node:fs';
import { loadCatalog, readmePath, updateReadme } from './lib.mjs';

try {
  const catalog = loadCatalog();
  const readme = readFileSync(readmePath, 'utf8');
  const updated = updateReadme(readme, catalog);
  if (updated !== readme) writeFileSync(readmePath, updated, 'utf8');
  console.log(`README 已同步：${catalog.projects.length} 个项目。`);
} catch (error) {
  console.error(`同步失败：${error.message}`);
  process.exitCode = 1;
}
