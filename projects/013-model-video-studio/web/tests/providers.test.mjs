import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateConfig, publicConfig, generateText, generateImage, generateVoice } from '../lib/providers.mjs';

test('模型配置支持本机 HTTP，自定义远程接口强制 HTTPS，拒绝 URL 内嵌密钥', () => {
  assert.equal(validateConfig({provider:'openai',baseUrl:'http://127.0.0.1:8000/v1',model:'local'},'text').model,'local');
  for(const baseUrl of ['http://external.test','https://name:password@external.test','https://external.test/?key=secret','file:///etc/passwd'])
    assert.throws(()=>validateConfig({provider:'openai',baseUrl,model:'custom'},'image'));
  assert.throws(()=>validateConfig({provider:'invented'},'voice'));
  assert.throws(()=>validateConfig({provider:'openai',baseUrl:'https://example.test',model:'a',apiKey:'a\r\nb'},'voice'));
});
test('公开配置不返回 API 密钥，各角色独立保留模型与音色', () => {
  const value=publicConfig({text:{model:'text-a',apiKey:'PRIVATE'},image:{model:'image-b',apiKey:'PRIVATE2'},voice:{model:'speech-c',voice:'voice-id',apiKey:''}});
  assert.ok(!JSON.stringify(value).includes('PRIVATE'));
  assert.equal(value.text.keyConfigured,true); assert.equal(value.voice.keyConfigured,false); assert.equal(value.voice.voice,'voice-id');
});
test('真实 HTTP 协议适配：三路独立模型、根地址和/v1、图片base64、二进制语音',async t=>{
  const calls=[],dir=await mkdtemp(path.join(os.tmpdir(),'studio-contract-'));
  const server=http.createServer(async(req,res)=>{
    let raw='';for await(const b of req)raw+=b;const body=JSON.parse(raw);calls.push({path:req.url,body,authorization:req.headers.authorization});
    if(req.url==='/v1/chat/completions') res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({title:'测试',scenes:[1,2,3].map(()=>({title:'标题',body:'要点',narration:'口播',imagePrompt:'picture'}))})}}]}));
    else if(req.url==='/v1/images/generations') res.end(JSON.stringify({data:[{b64_json:Buffer.alloc(300,7).toString('base64')}]}));
    else if(req.url==='/v1/audio/speech') res.end(Buffer.alloc(1000,4));
    else if(req.url==='/v1/t2a_v2')res.end(JSON.stringify({base_resp:{status_code:1008}}));
    else {res.statusCode=404;res.end('{}');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});});
  const baseUrl='http://127.0.0.1:'+server.address().port;
  const result=await generateText({provider:'openai',model:'text-own',baseUrl:baseUrl+'/v1',apiKey:'key-text'},null,'介绍工作台');
  assert.equal(result.draft.scenes.length,3);
  await generateImage({provider:'openai',model:'image-own',baseUrl,apiKey:'key-image'},'scene',path.join(dir,'image.png'));
  await generateVoice({provider:'openai',model:'voice-own',voice:'custom',baseUrl,apiKey:'key-voice'},'中文口播',path.join(dir,'voice.mp3'));
  assert.deepEqual(calls.slice(0,3).map(c=>c.body.model),['text-own','image-own','voice-own']);
  assert.deepEqual(calls.slice(0,3).map(c=>c.authorization),['Bearer key-text','Bearer key-image','Bearer key-voice']);
  assert.equal((await readFile(path.join(dir,'voice.mp3'))).length,1000);
  await assert.rejects(generateVoice({provider:'minimax',model:'voice-own',baseUrl},'口播',path.join(dir,'fail.mp3')),/1008/);
});
