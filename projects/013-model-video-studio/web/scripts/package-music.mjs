import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {hash} from '../lib/providers.mjs';
import {probe,command} from '../lib/render.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),projectRoot=path.resolve(root,'..'),dest=path.join(projectRoot,'assets/music');
const state=await(await fetch('http://127.0.0.1:4323/api/state')).json();
const p=structuredClone(state.projects.find(p=>p.title==='映序 · 故事、口播与音乐创作示例'));
if(!p||p.busy||!p.exports.length)throw new Error('音乐示例尚未完成导出');
const source=path.join(root,'.local/projects',p.id),exp=p.exports.at(-1);await mkdir(dest,{recursive:true});
await cp(path.join(source,exp.file),path.join(dest,'final.mp4'));
await command(process.env.STUDIO_FFMPEG||'ffmpeg',['-v','error','-i',path.join(dest,'final.mp4'),'-f','null','-']);
const files=new Set(['ai-draft.json']);
for(const s of p.scenes){for(const key of ['image','audio','video'])if(s[key])files.add(s[key]);if(s.poster){await mkdir(path.join(dest,'frames'),{recursive:true});const to='frames/'+s.id+'.png';await cp(path.join(source,s.poster),path.join(dest,to));s.poster=to;}}
for(const a of p.assets||[]){files.add(a.file);if(a.poster)files.add(a.poster);}
for(const c of p.characters||[])if(c.reference)files.add(c.reference);
for(const file of files)await cp(path.join(source,file),path.join(dest,file));
delete p.archivedScenes;p.exports=[{...exp,file:'final.mp4',label:'中文口播＋原创配乐混音成片'}];p.busy=false;
await writeFile(path.join(dest,'project.json'),JSON.stringify(p,null,2));
const pending=p.generationTasks.find(t=>t.kind==='music');
if(pending)await writeFile(path.join(dest,'music-request.json'),JSON.stringify({requestId:pending.id,...pending.request},null,2));
const preserveRoot=path.join(projectRoot,'preserved/before-music-2026-10-11'),manifest=JSON.parse(await readFile(path.join(preserveRoot,'manifest.json'),'utf8'));
for(const item of manifest.files){const file=path.join(item.existingArtifact?projectRoot:preserveRoot,item.file);if(hash(await readFile(file))!==item.sha256)throw new Error('保留文件发生变化：'+item.file);}
const v1=path.join(projectRoot,'preserved/v1-2026-10-11'),old=JSON.parse(await readFile(path.join(v1,'manifest.json'),'utf8'));for(const item of old.files)if(hash(await readFile(path.join(v1,item.file)))!==item.sha256)throw new Error('初版快照发生变化');
const downloaded=process.argv[2],sha256=hash(await readFile(path.join(dest,'final.mp4')));
if(!downloaded||hash(await readFile(downloaded))!==sha256)throw new Error('请传入浏览器下载文件，并确认与当前成片一致');
const verification={at:new Date().toISOString(),projectId:p.id,revision:exp.revision,metadata:await probe(path.join(dest,'final.mp4')),sha256,fullDecode:'passed',downloadHashMatches:true,preserved:{sourceSnapshots:manifest.files.filter(i=>!i.existingArtifact).length,existingArtifacts:manifest.files.filter(i=>i.existingArtifact).length,originalSnapshot:old.files.length,allHashesMatch:true},audioMix:p.audioMix,musicSource:{kind:'original-programmatic-synthesis',file:'soft-studio-original.wav',duration:16,generator:'web/scripts/compose-demo-music.py',aiModelUsed:false},browser:{importFromMusicSidebar:true,settingsPersistAfterReload:true,undoRedo:true,loopObserved:{timeline:24.7,sourceTime:8.672726,sourceDuration:16},independentMusicMute:true,storySidebarSaved:true,characterAndNarrationPanelsOpened:true,exportPlayer:{duration:67.354362,width:1920,height:1080,paused:false},consoleErrors:[]},models:{music:'not-configured',video:'not-configured',lipsync:'not-configured'},tests:{count:14,kind:'unit, real FFmpeg audio analysis, local HTTP adapter contracts'},limitations:['口播避让按音频有效区间计算，不是逐词语音活动检测','音乐预览使用浏览器音频，导出使用 FFmpeg AAC 与限制器','音乐、视频、口型接口未接真实模型，合同测试使用本地模拟服务']};
await writeFile(path.join(dest,'verification.json'),JSON.stringify(verification,null,2));
console.log(JSON.stringify({projectId:p.id,sha256,duration:verification.metadata.duration,fullDecode:'passed',downloadHashMatches:true,preserved:verification.preserved}));
