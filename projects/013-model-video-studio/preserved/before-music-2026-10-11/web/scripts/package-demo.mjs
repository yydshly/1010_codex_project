import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { hash } from '../lib/providers.mjs';
import { command, probe } from '../lib/render.mjs';
const web = path.resolve(import.meta.dirname,'..'), assets = path.join(web,'../assets'), dest = path.join(assets,'demo');
const state = await (await fetch('http://127.0.0.1:4323/api/state')).json();
const current = state.projects.find(p=>p.exports?.length >= 2 && p.editedAt);
if(!current || current.busy)throw new Error('需要已完成的 AI 初稿和修改版导出');
const source = path.join(web,'.local/projects',current.id), p = structuredClone(current);
p.exports = [p.exports[0],p.exports.at(-1)];
await mkdir(dest,{recursive:true});
await mkdir(path.join(dest,'frames'),{recursive:true});
for(const s of p.scenes){
  const image=s.id+'.png',audio=s.id+'.mp3',poster='frames/'+s.id+'.png';
  await copyFile(path.join(source,s.image),path.join(dest,image));
  await copyFile(path.join(source,s.audio),path.join(dest,audio));
  await copyFile(path.join(source,s.poster),path.join(dest,poster));
  s.image=image;s.audio=audio;s.poster=poster;
}
for(let i=0;i<p.exports.length;i++){
  const e=p.exports[i], file=i===0?'ai-draft.mp4':'final.mp4';
  await copyFile(path.join(source,e.file),path.join(dest,file));e.file=file;e.sha256=hash(await readFile(path.join(dest,file)));
  e.label=i===0?'AI 初稿':'人工修改后的成片';
  // Full decode catches corruption that metadata probing alone would miss.
  await command(process.env.STUDIO_FFMPEG || 'ffmpeg',['-v','error','-i',path.join(dest,file),'-f','null','-'],180000);
  e.verifiedMetadata=await probe(path.join(dest,file));
}
await copyFile(path.join(source,'ai-draft.json'),path.join(dest,'ai-draft.json'));
await writeFile(path.join(dest,'project.json'),JSON.stringify(p,null,2));
const provenance=JSON.parse(await readFile(path.join(assets,'generated/provenance.json'),'utf8'));
for(const r of provenance.records){
  r.file='demo/'+r.sceneId+'.png';
  r.fullPrompt=`Use case: stylized-concept. Asset type: one scene illustration for a polished Chinese software introduction video. Scene ${Number(r.sceneId.split('-')[1])} of a coherent visual series. Primary request: ${r.prompt}. Landscape 16:9 composition. A beautiful tactile paper sculpture / refined editorial 3D still life with soft ambient shadows, warm cream backdrop, muted lilac and sage, restrained orange highlights. Central subject with generous breathing space; no panels or collage. No actual UI screenshots, no words, no letters, no watermark.`;
}
await writeFile(path.join(dest,'image-provenance.json'),JSON.stringify(provenance,null,2));
await writeFile(path.join(dest,'verification.json'),JSON.stringify({at:new Date().toISOString(),projectId:p.id,text:p.textEvidence,voiceCalls:p.scenes.map(s=>s.voiceEvidence),exports:p.exports,manualEdits:[{scene:'scene-1',fields:['title','body']},{scene:'scene-5',fields:['body','narration'],reason:'将初稿的拖动排序修正为实际的前移、后移按钮'},{scene:'scene-6',fields:['body','narration'],reason:'将不自然的1080像素口播改为高清交付与版本比较'}],imageMode:'内置Imagegen生成六张独立图片后，通过工作台上传接口导入；没有把聊天工具伪装成网页API',decode:'两份MP4完成FFmpeg整段解码，无错误'},null,2));
console.log(JSON.stringify(p.exports.map(({file,duration,bytes,sha256})=>({file,duration,bytes,sha256})),null,2));
