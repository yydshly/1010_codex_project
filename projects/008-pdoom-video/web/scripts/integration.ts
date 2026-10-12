import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir,readdir,unlink } from 'node:fs/promises';
import path from 'node:path';
import { command,ffmpeg,probe } from '../server/media';
import type { Project } from '../shared/project';
const origin=process.env.MV_TEST_ORIGIN||'http://127.0.0.1:4318';await mkdir('../out',{recursive:true});
async function request(url:string,body?:unknown){const r=await fetch(origin+url,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const j=await r.json();if(!r.ok)throw new Error(j.error);return j;}
async function wait(id:string,status:string,timeout=180000){const start=Date.now();for(;;){const j=await request(`/api/jobs/${id}`);if(j.status===status)return j;if(j.status==='failed')throw new Error(j.error);if(Date.now()-start>timeout)throw new Error(`等待 ${status} 超时`);await new Promise(r=>setTimeout(r,500));}}
await command(ffmpeg(),['-v','error','-y','-i','public/demo.wav','-c:a','libmp3lame','-b:a','192k','../out/demo.mp3']);
const form=new FormData();form.append('audio',new Blob([await readFile('../out/demo.mp3')]),'demo.mp3');const asset=await fetch(origin+'/api/assets',{method:'POST',body:form}).then(r=>r.json());assert.ok(asset.id);
const srt='1\n00:00:00,000 --> 00:00:08,000\n我们穿过花园，跟着晨风出发\n\n2\n00:00:08,000 --> 00:00:15,000\n让梦想的星光，慢慢落在手上\n\n3\n00:00:15,000 --> 00:00:22,000\n把所有的快乐，唱给远方的你\n\n4\n00:00:22,000 --> 00:00:30,000\n挥挥手，下一次再相遇';
const lyrics=(await request('/api/lyrics',{text:srt,format:'srt',duration:30,sourceStart:0})).lyrics;
const base=JSON.parse(await readFile('../examples/local-demo-project.json','utf8')) as Project;
const {shots,planner,story,...input}=base;const project=await request('/api/storyboards',{...input,title:'星光旅行 · 素描版',durationSec:30,resolution:'1080p',styleId:'ink_sketch',character:{...base.character,name:'小墨',bodyColor:'#7BA78E',bodyRatio:1.2,eyeSize:1.3,hat:'star'},audio:{assetId:asset.id,name:asset.name,duration:asset.duration,sourceStartSec:0,bpm:88,beatOffsetSec:.21},lyrics,mode:'rules'});
const job=await request('/api/renders',project);await wait(job.id,'rendering');
// 等待部分帧写入后取消，确认资源清理与帧复用；删除一帧，验证续跑会重画。
let partial:any;for(let i=0;i<60;i++){partial=await request(`/api/jobs/${job.id}`);if(partial.frames>=12)break;await new Promise(r=>setTimeout(r,300));}assert.ok(partial.frames>=12);
await request(`/api/jobs/${job.id}/cancel`,{});await wait(job.id,'cancelled');await new Promise(r=>setTimeout(r,1500));
const frames=path.join('data/jobs',job.id,'frames');const before=await readFile(path.join(frames,'000000.jpg'));await unlink(path.join(frames,'000003.jpg'));
let retried:any;for(let i=0;i<8;i++){try{retried=await request(`/api/jobs/${job.id}/retry`,{});break;}catch(e){if(!String(e).includes('清理'))throw e;await new Promise(r=>setTimeout(r,1000));}}assert.equal(retried.id,job.id);
const complete=await wait(job.id,'complete');assert.deepEqual(await readFile(path.join(frames,'000000.jpg')),before);assert.ok((await readdir(frames)).includes('000003.jpg'));
const output=path.resolve('../out/local-demo-30s-ink.mp4');const video=await fetch(origin+complete.download).then(r=>r.arrayBuffer());await writeFile(output,new Uint8Array(video));const meta=await probe(output);assert.equal(meta.streams.find(s=>s.codec_type==='video')!.width,1920);assert.equal(meta.streams.find(s=>s.codec_type==='video')!.nb_frames,'720');assert.equal(Number(meta.format.duration),30);
const invalid=await fetch(origin+'/api/renders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...project,audio:{...project.audio,sourceStartSec:10}})});assert.equal(invalid.status,400);
// 改角色、画风、选段和分镜快照均不能命中旧作业。
const changed=await request('/api/renders',{...project,character:{...project.character,bodyColor:'#CD865B'},styleId:'flat_cartoon'});assert.notEqual(changed.id,job.id);await request(`/api/jobs/${changed.id}/cancel`,{});
const report={date:new Date().toISOString(),jobId:job.id,mp3Upload:true,srtImport:true,cancelAfterFrames:partial.frames,resumeSameJob:true,missingFrameRegenerated:true,unchangedFrameRetained:true,changedProjectNewJob:true,rejectOutOfRange:true,output:'out/local-demo-30s-ink.mp4',elapsedMs:complete.elapsedMs,media:meta};await writeFile('../notes/local-tool-integration.json',JSON.stringify(report,null,2));console.log(JSON.stringify({jobId:job.id,frames:complete.frames,duration:meta.format.duration,elapsedMs:complete.elapsedMs,cancelResume:true}));
