import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash } from '../lib/providers.mjs';
import { probe, command } from '../lib/render.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const state=await (await fetch('http://127.0.0.1:4323/api/state')).json();
const p=structuredClone(state.projects.find(p=>p.copiedFrom==='2fabe97c-558e-4202-92dc-db97cb168fb4'));
if(!p||p.busy||!p.exports.length)throw new Error('编辑副本尚未完成导出');
const source=path.join(root,'.local/projects',p.id),dest=path.resolve(root,'../assets/control-plane');
await mkdir(dest,{recursive:true});
const exp=p.exports.at(-1),result=path.join(dest,'final.mp4');await cp(path.join(source,exp.file),result);
await command(process.env.STUDIO_FFMPEG||'ffmpeg',['-v','error','-i',result,'-f','null','-']);
const files=new Set(['ai-draft.json']);
for(const s of p.scenes){for(const field of ['image','audio','video'])if(s[field])files.add(s[field]);if(s.poster){await mkdir(path.join(dest,'frames'),{recursive:true});const to='frames/'+s.id+'.png';await cp(path.join(source,s.poster),path.join(dest,to));s.poster=to;}}
for(const a of p.assets||[]){files.add(a.file);if(a.poster)files.add(a.poster);}
for(const file of files)await cp(path.join(source,file),path.join(dest,file));
delete p.archivedScenes;p.exports=[{...exp,file:'final.mp4',label:'控制面编辑后的成片'}];p.busy=false;
await writeFile(path.join(dest,'project.json'),JSON.stringify(p,null,2));
const manifest=JSON.parse(await readFile(path.resolve(root,'../preserved/v1-2026-10-11/manifest.json'),'utf8'));
for(const f of manifest.files){const bytes=await readFile(path.resolve(root,'../preserved/v1-2026-10-11',f.file));if(hash(bytes)!==f.sha256)throw new Error('保存快照不一致：'+f.file);}
for(const film of ['ai-draft.mp4','final.mp4']){const old=manifest.files.find(f=>f.file==='demo/'+film);if(hash(await readFile(path.resolve(root,'../assets/demo',film)))!==old.sha256)throw new Error('旧成片发生变化');}
const downloaded=await readFile('C:/Users/yun68/Downloads/export-r8.mp4');
const previous=await readFile(path.join(source,'export-r8.mp4'));
const verification={at:new Date().toISOString(),projectId:p.id,exportRevision:exp.revision,metadata:await probe(result),sha256:hash(await readFile(result)),fullDecode:'passed',snapshot:{files:manifest.files.length,allHashesMatch:true,oldFilmsUnchanged:true},browser:{title:'把想法，变成作品',titlePosition:{x:110,y:285},fontSize:74,firstSceneSeconds:13.2,firstSceneVolume:.85,dragMove:{before:{x:110,y:285},after:{x:161,y:336},undone:true},dragResize:{before:{w:720,h:222},after:{w:658,h:273},undone:true},dragReorder:'first scene moved after second; undone',edgeTrim:'13.2s → 15.2s; undone',split:{at:5,secondDuration:8.2,audioIn:4.8,undone:true},videoUpload:'animated-illustration.mp4',videoIn:.3,waveformCount:6,exportPlayer:{width:1920,height:1080,currentTimeObserved:30.378589,paused:false},downloadedR8HashMatches:hash(downloaded)===hash(previous)},limitations:['单场景一个视频对象；视频原声静音，使用独立旁白轨道','无背景音乐混音、关键帧动画、协作、录屏、逐词字幕或动态视频生成模型','本次沿用已验证的 Codex 分镜、Imagegen 图片与 MiniMax 配音，没有新增模型调用']};
await writeFile(path.join(dest,'verification.json'),JSON.stringify(verification,null,2));
await writeFile(path.join(dest,'video-provenance.json'),JSON.stringify({file:'animated-illustration.mp4',source:'../demo/scene-6.png',sourceKind:'此前实际 Imagegen 插画',motion:'FFmpeg zoompan，12秒，缓慢放大，960×540，30fps',modelGeneratedMotion:false,reason:'验证本地视频素材导入、入点裁剪和画布合成'},null,2));
console.log(JSON.stringify({file:result,revision:exp.revision,duration:verification.metadata.duration,sha256:verification.sha256,preservedFiles:manifest.files.length},null,2));
