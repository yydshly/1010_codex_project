import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {newMusicTrack,mixOf,musicGainAt,trackPosition,trackSpan} from '../public/audio-mix.js';
import {validateMix,mixProjectAudio} from '../lib/mix.mjs';
import {command,probe} from '../lib/render.mjs';
import {prepareTask,taskIsStale,runAdapter,blockers} from '../lib/production.mjs';
const fixture=()=>{const asset={type:'audio',file:'music.wav',duration:2};return {assets:[asset],scenes:[{id:'s',duration:6,audio:'voice.wav',audioDuration:2,timing:{duration:6,delay:2,audioIn:0,volume:1}}],audioMix:{...mixOf({}),tracks:[{...newMusicTrack(asset,6,'music'),volume:.5,fadeIn:1,fadeOut:1,sourceIn:.5}]},musicBrief:'轻柔的器乐'};};
test('音乐循环入点、片尾裁切、淡入淡出与口播避让共享时间语义',()=>{
  const p=fixture(),t=p.audioMix.tracks[0];
  assert.equal(trackPosition(p,t,1.7),.7);assert.equal(trackPosition(p,t,6),null);
  assert.equal(musicGainAt(p,t,0),0);assert.equal(musicGainAt(p,t,1.5),.5);assert.equal(musicGainAt(p,t,3),.15);assert.equal(musicGainAt(p,t,5.5),.25);
  assert.ok(musicGainAt(p,t,1.9)<.5);assert.ok(musicGainAt(p,t,4.2)>.15);
  p.audioMix.narration=0;assert.equal(musicGainAt(p,t,3),.5);
  t.loop=false;assert.equal(trackSpan(p,t).duration,1.5);assert.equal(trackPosition(p,t,2),null);
  t.muted=true;assert.equal(musicGainAt(p,t,1),0);
});
test('保存拒绝项目外音频、无效数值和超量轨道',()=>{
  const p=fixture();assert.equal(validateMix(p.audioMix,p.assets).tracks.length,1);
  assert.throws(()=>validateMix(p.audioMix,[]),/项目音频/);
  assert.throws(()=>validateMix({...p.audioMix,master:NaN},p.assets),/范围/);
  assert.throws(()=>validateMix({...p.audioMix,tracks:Array(9).fill(p.audioMix.tracks[0])},p.assets),/8条/);
  p.audioMix.tracks[0].sourceIn=2;assert.throws(()=>validateMix(p.audioMix,p.assets),/入点/);
});
test('真实 FFmpeg 混音：保留视频、循环裁切源、旁白避让和片尾淡出',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'studio-mix-')),p=fixture();
  // First .5 s has a different tone. A correct trimmed loop never repeats that tone.
  await command('ffmpeg',['-y','-v','error','-f','lavfi','-i','sine=frequency=700:duration=0.5','-f','lavfi','-i','sine=frequency=220:duration=1.5','-filter_complex','[0:a][1:a]concat=n=2:v=0:a=1','-ar','48000',path.join(dir,'music.wav')]);
  await command('ffmpeg',['-y','-v','error','-f','lavfi','-i','color=c=black:s=160x90:r=30:d=6','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t','6','-c:v','libx264','-c:a','aac',path.join(dir,'input.mp4')]);
  await mixProjectAudio(p,dir,dir,path.join(dir,'input.mp4'),path.join(dir,'output.mp4'),command);
  const info=await probe(path.join(dir,'output.mp4'));assert.ok(Math.abs(info.duration-6)<.08);assert.equal(info.streams.find(s=>s.type==='video').codec,'h264');
  await command('ffmpeg',['-y','-v','error','-i',path.join(dir,'output.mp4'),'-vn','-ar','8000','-ac','1','-f','f32le',path.join(dir,'output.pcm')]);
  const b=await readFile(path.join(dir,'output.pcm')),sample=i=>b.readFloatLE(i*4),rms=(a,z)=>{let sum=0;for(let i=Math.floor(a*8000);i<Math.floor(z*8000);i++)sum+=sample(i)**2;return Math.sqrt(sum/Math.floor((z-a)*8000));};
  const clear=rms(1.1,1.5),duck=rms(2.7,3.1),tail=rms(5.7,5.9);assert.ok(duck/clear>.24&&duck/clear<.36,`duck ratio ${duck/clear}`);assert.ok(tail<clear*.4);
  const energy=f=>{let re=0,im=0;for(let i=38400;i<40000;i++){re+=sample(i)*Math.cos(2*Math.PI*f*i/8000);im+=sample(i)*Math.sin(2*Math.PI*f*i/8000);}return re*re+im*im;};
  assert.ok(energy(220)>energy(700)*100,'循环音乐必须从指定入点重复');
  p.audioMix.tracks[0].muted=true;
  await mixProjectAudio(p,dir,dir,path.join(dir,'input.mp4'),path.join(dir,'muted.mp4'),command);
  await command('ffmpeg',['-y','-v','error','-i',path.join(dir,'muted.mp4'),'-vn','-ar','8000','-ac','1','-f','f32le',path.join(dir,'muted.pcm')]);
  const silent=await readFile(path.join(dir,'muted.pcm'));for(let i=0;i<silent.length;i+=4)assert.ok(Math.abs(silent.readFloatLE(i))<.0001);
});
test('音乐预留适配器真实 HTTP 请求与音频返回契约（本地模拟服务）',async t=>{
  const p=fixture(),task=prepareTask(p,p.scenes[0],'music');assert.deepEqual(blockers(task.request,{provider:'disabled'}),['模型待配置']);
  p.scenes[0].narration='修改台词';assert.equal(taskIsStale(task,p),false);p.musicBrief='换一种风格';assert.equal(taskIsStale(task,p),true);
  const server=http.createServer(async(req,res)=>{let raw='';for await(const b of req)raw+=b;const request=JSON.parse(raw);assert.equal(request.kind,'music');assert.equal(request.outputFormat,'mp3');assert.equal(request.duration,6);res.end(JSON.stringify({status:'succeeded',output:{audio_base64:Buffer.alloc(1024,1).toString('base64')}}));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const bytes=await runAdapter({provider:'studio',model:'local-contract-test',baseUrl:'http://127.0.0.1:'+server.address().port},task,[],()=>{});assert.equal(bytes.length,1024);
});
