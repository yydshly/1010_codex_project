import { copyFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const dist = path.join(root, 'dist');
export async function build() {
  if (dist !== path.join(root, 'dist')) throw new Error('无效构建目录');
  await rm(dist, {recursive:true,force:true});
  await mkdir(path.join(dist, 'media'), { recursive: true });
  await mkdir(path.join(dist, 'docs'), { recursive: true });
  await mkdir(path.join(dist, 'licenses'), { recursive: true });
  await mkdir(path.join(dist, 'assets'), { recursive: true });
  await mkdir(path.join(dist, 'experiments'), { recursive: true });
  for (const file of ['index.html', 'style.css', 'app.js', 'content.js']) await copyFile(path.join(root, 'src', file), path.join(dist, file));
  for (const file of ['landscape.svg', 'favicon.svg']) await copyFile(path.join(root, '..', 'assets', file), path.join(dist, 'media', file));
  for (const file of ['understanding-summary.md', 'understanding-summary.json', 'research.md', 'reuse-roadmap.md', 'verification.md', 'download-testing.md', 'sources.json', 'README.md']) await copyFile(path.join(root, '..', 'notes', file), path.join(dist, 'docs', file));
  for (const file of ['controlled-results.json', 'media-verification.json', 'image-anchor.jpeg', 'video-range.mp4', 'voice-range.ogg', 'voice-mismatch.ogg']) await copyFile(path.join(root, '..', 'experiments', 'results', file), path.join(dist, 'experiments', file));
  await copyFile(path.join(root, '..', 'experiments', 'upstream', 'telegram-media-downloader.user.js'), path.join(dist, 'experiments', 'telegram-media-downloader.user.js'));
  for (const file of ['understanding-summary-20261012.png', 'understanding-summary-20261012.json', 'render-understanding-summary.py', 'README.md', 'browser-verification.json', 'showcase-desktop.jpg', 'showcase-full.jpg', 'showcase-mobile.jpg', 'showcase-mobile-full.jpg', 'research-overview.png', 'research-value.png', 'research-mobile.png', 'research-full.png']) await copyFile(path.join(root, '..', 'assets', file), path.join(dist, 'assets', file));
  await copyFile(path.join(root, '..', 'THIRD_PARTY.md'), path.join(dist, 'THIRD_PARTY.md'));
  await copyFile(path.join(root, '..', 'licenses', 'UPSTREAM-GPL-3.0.txt'), path.join(dist, 'licenses', 'UPSTREAM-GPL-3.0.txt'));
  await copyFile(path.join(dist, 'index.html'), path.join(dist, 'research.html'));
  await copyFile(path.join(root, '..', 'README.md'), path.join(dist, 'docs', 'project-README.md'));
  console.log(`展示页已构建：${dist}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
