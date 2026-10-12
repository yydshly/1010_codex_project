import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const project = fileURLToPath(new URL('../../', import.meta.url));
const projects = path.dirname(project);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const references = [
 '001-sakura-crossing/notes/ai-town.md', '001-sakura-crossing/notes/ai-town-verification.md',
 '001-sakura-crossing/notes/ai-town-openai-session.json', '001-sakura-crossing/notes/ai-town-minimax-boundary.json',
 '003-fog-harbor/README.md', '003-fog-harbor/notes/openai-dynamic-browser-2026-10-11.json'
];
const images = [
 ['001-sakura-crossing/assets/ai-town-decisions.png','ai-town-decisions.png'],
 ['003-fog-harbor/assets/neon-openai-dynamic-log.png','neon-openai-dynamic-log.png'],
 ['003-fog-harbor/assets/neon-rift-combat.png','neon-rift-combat.png']
];
if (process.argv.includes('--check')) {
 const manifest = JSON.parse(fs.readFileSync(path.join(project,'references/manifest.json'),'utf8'));
 for(const file of manifest.files) if(hash(fs.readFileSync(path.join(project,file.target)))!==file.sha256)throw new Error('引用快照改变：'+file.target);
 console.log(`引用快照通过：${manifest.files.length} 个文件。`);
} else {
 const files=[];
 for(const [source,target] of [...references.map(s=>[s,'references/'+s]),...images.map(([s,t])=>[s,'assets/'+t])]) {
  const original=fs.readFileSync(path.join(projects,source));
  const bytes=/\.(md|json)$/.test(source)?Buffer.from(original.toString('utf8').replace(/\r\n/g,'\n')):original;
  const dest=path.join(project,target);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes);
  files.push({source,target,bytes:bytes.length,sha256:hash(bytes),originalSha256:hash(original)});
 }
 fs.writeFileSync(path.join(project,'references/manifest.json'),JSON.stringify({version:1,date:'2026-10-12',purpose:'项目 002 研究所需的跨项目实拍和原始证据快照；不发布其他项目应用或模型后端。',files},null,2)+'\n');
 console.log(`已保存 ${files.length} 个引用快照。`);
}
