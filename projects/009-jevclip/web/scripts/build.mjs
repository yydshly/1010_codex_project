import { cp, mkdir, readdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { renderResearchPage } from './research-page.mjs';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const project = path.dirname(root);
export const dist = path.join(root, 'dist');
export const assets = ['README.md','demo.mp4','demo.srt','showcase-desktop.jpg','showcase-mobile.jpg','source-review.jpg','principles-desktop.jpg','principles-mobile.jpg','jevclip-overview-2026-10-12.png','jevclip-overview-2026-10-12.svg'];
export const documents = ['README.md','THIRD_PARTY.md','licenses/UPSTREAM-MIT.txt','web/README.md','scripts/render-overview.py','notes/README.md','notes/research.md','notes/verification.md','notes/sources.json','notes/upstream-test-output.txt','notes/browser-verification.json','notes/sample-export.md','notes/infographic.md','notes/infographic-prompt.md','notes/research-summary.json','notes/research-summary.md'];
export async function filesBelow(directory) {
  const files = [];
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    const file = path.join(directory,entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(file));
    else if (entry.isFile()) files.push(file);
    else throw new Error('发布目录不接受符号链接：' + file);
  }
  return files.sort();
}
async function copyRelative(relative,destination) {
  const source = path.join(project,relative);
  const target = path.join(dist,destination);
  if (!target.startsWith(dist + path.sep)) throw new Error('发布路径越界');
  await mkdir(path.dirname(target),{recursive:true});
  await cp(source,target);
}
export async function build() {
  if (path.resolve(dist) !== path.join(root,'dist') || !dist.startsWith(root + path.sep)) throw new Error('构建输出路径不合法');
  await rm(dist,{recursive:true,force:true});
  await mkdir(dist,{recursive:true});
  await cp(path.join(root,'src'),dist,{recursive:true});
  for (const asset of assets) await copyRelative('assets/' + asset,'research/assets/' + asset);
  for (const doc of documents) await copyRelative(doc,'research/' + doc);
  for (const optional of ['assets/research-desktop.png','assets/research-mobile.png','assets/research-live-desktop.png','assets/research-live-mobile.png','notes/publication-verification.json','notes/publication-resource-verification.json']) {
    try { await stat(path.join(project,optional)); await copyRelative(optional,'research/' + optional); }
    catch (error) { if(error.code !== 'ENOENT') throw error; }
  }
  await copyRelative('assets/demo.mp4','demo.mp4');
  const data = JSON.parse(await readFile(path.join(project,'notes/research-summary.json'),'utf8'));
  await writeFile(path.join(dist,'research.html'),renderResearchPage(data));
  const files = [];
  for (const file of await filesBelow(dist)) {
    const bytes = await readFile(file);
    files.push({path:path.relative(dist,file).split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
  await writeFile(path.join(dist,'publication-manifest.json'),JSON.stringify({project:'009-jevclip',date:data.date,upstreamRevision:data.revision,guideImage:data.poster,sections:data.sections.length,paragraphs:data.sections.reduce((n,s)=>n+s.body.length,0),files},null,2)+'\n');
  console.log('构建完成：' + dist + '；' + files.length + ' 项资源，原图、原文和演示素材按白名单保留。');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
