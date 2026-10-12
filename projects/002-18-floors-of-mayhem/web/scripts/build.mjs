import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gallery } from '../src/content.js';
import { renderResearch, renderSummary } from './research-page.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const dist = path.join(root, 'dist');
export async function build() {
  await mkdir(path.join(dist, 'media'), { recursive: true });
  for (const name of ['index.html', 'style.css', 'app.js', 'content.js', 'research.css', 'research.js', 'research-content.js']) await copyFile(path.join(root, 'src', name), path.join(dist, name));
  await writeFile(path.join(dist, 'research.html'), renderResearch(), 'utf8');
  await writeFile(path.join(dist, 'research-summary.md'), renderSummary(), 'utf8');
  const media = new Set([...gallery.flatMap((item) => [item.image, item.poster].filter(Boolean)), 'research-overview.png','research-overview.svg','research-guide.webp','ai-battle.png','ai-battle-step.json','ai-battle-realtime.json','ai-town-decisions.png','neon-openai-dynamic-log.png','neon-rift-combat.png']);
  for (const name of media) await copyFile(path.join(root, '..', 'assets', name), path.join(dist, 'media', name));
  for (const name of ['ai-battle.md', 'research.md', 'reuse-roadmap.md', 'verification.md', 'showcase.md', 'publication-verification.json', 'UPSTREAM_ASSET_CREDITS.md', 'UPSTREAM_LICENSE.txt']) await copyFile(path.join(root, '..', 'notes', name), path.join(dist, name));
  const credits = await readFile(path.join(root, '..', 'THIRD_PARTY.md'), 'utf8');
  await writeFile(path.join(dist, 'THIRD_PARTY.md'), credits.replaceAll('(notes/', '(').replaceAll('assets/', 'media/'), 'utf8');
  await cp(path.join(root, '..', 'references'), path.join(dist, 'references'), { recursive: true });
  await writeFile(path.join(dist, 'runtime.json'), JSON.stringify({ gameUrl: null }) + '\n', 'utf8');
  console.log('展示页已构建：' + dist);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
