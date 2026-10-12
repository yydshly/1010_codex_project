import { readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve(import.meta.dirname,'..'), inputs = process.argv.slice(2);
const base='http://127.0.0.1:4323';
const state=await (await fetch(base+'/api/state')).json(), p=state.projects[0];
if(inputs.length !== p.scenes.length) throw new Error('需要每个场景对应一张图片');
const source=path.join(root,'../assets/generated');await mkdir(source,{recursive:true});
const records=[];
for(let i=0;i<inputs.length;i++){
  const bytes=await readFile(inputs[i]);
  await copyFile(inputs[i],path.join(source,`scene-${i+1}.png`));
  const res=await fetch(`${base}/api/projects/${p.id}/image?scene=${p.scenes[i].id}`,{method:'POST',headers:{'Content-Type':'image/png'},body:bytes});
  if(!res.ok) throw new Error(await res.text());
  records.push({sceneId:p.scenes[i].id,provider:'Codex 内置 Imagegen 工具',model:'由工具选择，未返回模型标识',source:inputs[i],file:`scene-${i+1}.png`,prompt:p.scenes[i].imagePrompt});
}
await writeFile(path.join(source,'provenance.json'),JSON.stringify({generatedAt:new Date().toISOString(),records},null,2));
const job=await (await fetch(`${base}/api/projects/${p.id}/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();console.log(JSON.stringify(job));
