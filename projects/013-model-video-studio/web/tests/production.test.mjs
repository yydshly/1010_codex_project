import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { validateConfig, publicConfig } from '../lib/providers.mjs';
import { validateProduction, prepareTask, blockers, taskIsStale, runAdapter } from '../lib/production.mjs';

function project(){return {story:{logline:'认识视频工作台'},characters:[{id:'host',name:'讲解员',description:'白色上衣',reference:'host.png',voice:'voice-a'}],scenes:[{id:'s1',title:'介绍',narration:'你好',imagePrompt:'studio',image:'image.png',audio:'voice.mp3',voiceEvidence:{text:'你好'},timing:{duration:6,audioIn:1,delay:.2,volume:.8},shot:{mode:'lipsync',characterIds:['host'],speakerId:'host',action:'讲解产品',camera:'中景'}}]};}
test('角色与镜头的引用必须来自当前项目，旧项目可以无损升级',()=>{
  const p=project(),files=new Map([['host.png',{type:'image'}]]);
  const result=validateProduction(p,p.scenes,files);assert.equal(result.characters[0].voice,'voice-a');
  const old=[{title:'旧场景',narration:'原旁白'}];validateProduction({},old,new Map());assert.equal(old[0].narration,'原旁白');assert.equal(old[0].shot.mode,'illustration');
  assert.throws(()=>validateProduction(p,p.scenes,new Map()),/参考图/);
  p.scenes[0].shot.speakerId='unknown';assert.throws(()=>validateProduction(p,p.scenes,files),/配音角色/);
});
test('预留接口默认为待配置；口型任务检查配音、台词和人物素材',()=>{
  const p=project(),task=prepareTask(p,p.scenes[0],'lipsync');
  assert.equal(task.request.referenceImage,'host.png');assert.equal(task.request.audio,'voice.mp3');assert.equal(task.state,'prepared');
  assert.deepEqual(blockers(task.request,{provider:'disabled'}),['模型待配置']);
  const config=validateConfig({provider:'studio',model:'custom-mouth',baseUrl:'http://127.0.0.1:9000/studio/v1',apiKey:'PRIVATE'},'lipsync');
  assert.deepEqual(blockers(task.request,config),[]);assert.ok(!JSON.stringify(publicConfig({lipsync:config})).includes('PRIVATE'));
  task.request.audioText='旧台词';assert.match(blockers(task.request,config).join(''),/重新配音/);
  task.request.audio=null;task.request.referenceImage=null;task.request.referenceVideo=null;assert.equal(blockers(task.request,config).length,3);
});
test('提交快照保持不变，角色或镜头修改会使旧请求过期',()=>{
  const p=project(),task=prepareTask(p,p.scenes[0],'video');
  // Stored requests are snapshots, not aliases of mutable project records.
  p.characters[0].description='黑色外套';
  assert.equal(task.request.characters[0].description,'白色上衣');assert.equal(taskIsStale(task,p),true);
});
test('自定义任务协议真实HTTP提交、轮询、凭据隔离与失败响应（非真实模型）',async t=>{
  const calls=[];let poll=0;
  const server=http.createServer(async(req,res)=>{
    calls.push({method:req.method,path:req.url,key:req.headers.authorization});
    if(req.method==='POST'){let raw='';for await(const b of req)raw+=b;const body=JSON.parse(raw);if(body.model==='fail'){res.end(JSON.stringify({status:'failed',error:'PRIVATE upstream detail'}));return;}assert.equal(body.kind,'video');assert.equal(body.model,'my-video');assert.equal(body.media[0].id,'host.png');res.end(JSON.stringify({id:'external-123',status:'queued'}));}
    else {poll++;res.end(JSON.stringify(poll===1?{id:'external-123',status:'running'}:{status:'succeeded',output:{video_base64:Buffer.alloc(1024,7).toString('base64')}}));}
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const c={provider:'studio',model:'my-video',baseUrl:'http://127.0.0.1:'+server.address().port+'/studio/v1',apiKey:'video-only'},p=project(),task=prepareTask(p,p.scenes[0],'video');
  const bytes=await runAdapter(c,task,[{id:'host.png',dataBase64:'AA=='}],()=>{},{pollMs:1});
  assert.equal(bytes.length,1024);assert.deepEqual(calls.map(c=>c.path),['/studio/v1/tasks','/studio/v1/tasks/external-123','/studio/v1/tasks/external-123']);assert.ok(calls.every(c=>c.key==='Bearer video-only'));
  await assert.rejects(runAdapter({provider:'disabled'},task,[],()=>{}),/待配置/);
  await assert.rejects(runAdapter({...c,model:'fail'},task,[],()=>{}),e=>e.message.includes('模型任务失败')&&!e.message.includes('PRIVATE'));
});
