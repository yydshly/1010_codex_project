import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { parseLyrics } from '../shared/lyrics';
import { validateProject,defaultCharacter, type Project } from '../shared/project';
import { ruleShots } from '../shared/planner';
import { move } from '../shared/motion';
import { plan } from '../server/planning';
function fixture():Project {const p:Project={schemaVersion:'1.0.0',title:'测试短片',durationSec:15,seed:42,styleId:'watercolor_storybook',resolution:'720p',fps:24,character:{...defaultCharacter},audio:{assetId:'12345678-1234-4234-8234-123456789012',name:'音乐',duration:30,sourceStartSec:0,bpm:120,beatOffsetSec:0},lyrics:parseLyrics('走进花园\n星光落在心里\n快乐一起跳舞','txt',15),shots:[],planner:'rules',story:'出发与谢幕'};p.shots=ruleShots(p);return p;}
test('纯文本按长度估计完整时间，并明确来源',()=>{const ls=parseLyrics('一\n四个文字','txt',15);assert.equal(ls[0].start,0);assert.equal(ls.at(-1)!.end,15);assert.equal(ls[0].timingSource,'estimated');});
test('LRC 多时间标签、小数与选段坐标',()=>{const ls=parseLyrics('[00:10.00][00:15.25]第一句\n[00:20.50]第二句','lrc',15,12);assert.deepEqual(ls.map(l=>[l.start,l.end]),[[0,3.25],[3.25,8.5],[8.5,15]]);});
test('LRC offset 以毫秒作用于原音乐',()=>{const ls=parseLyrics('[offset:500]\n[00:00.00]第一句\n[00:05.00]第二句','lrc',15);assert.equal(ls[0].start,.5);assert.equal(ls[0].end,5.5);});
test('SRT 在片段边界裁切并拒绝重叠',()=>{const ls=parseLyrics('1\n00:00:08,000 --> 00:00:13,000\n你好\n\n2\n00:00:14,000 --> 00:00:18,000\n世界','srt',15,10);assert.deepEqual(ls.map(l=>[l.start,l.end]),[[0,3],[4,8]]);assert.throws(()=>parseLyrics('1\n00:00:01,000 --> 00:00:08,000\n甲\n\n2\n00:00:06,000 --> 00:00:09,000\n乙','srt',15),/重叠/);});
test('无时间歌词、片段外歌词和过长歌词给出明确错误',()=>{assert.throws(()=>parseLyrics('无效内容','lrc',15),/未找到/);assert.throws(()=>parseLyrics('[00:40.00]未来','lrc',15),/没有歌词/);assert.throws(()=>parseLyrics('长'.repeat(301),'txt',15),/300/);});
test('15～30 秒、多 BPM 与偏移下分镜均连续有效',()=>{for(const durationSec of [15,17,30])for(const bpm of [40,88,220])for(const offset of [-5,.21,5]){const p=fixture();p.durationSec=durationSec;p.audio.bpm=bpm;p.audio.beatOffsetSec=offset;p.shots=ruleShots(p);assert.doesNotThrow(()=>validateProject(p));}});
test('音乐越界、镜头空隙、歌词引用、未知模板和非法外观被拒绝',()=>{
  for(const mutate of [(p:Project)=>{p.audio.sourceStartSec=20;},(p:Project)=>{p.shots[1].start+=.3;},(p:Project)=>{p.shots[1].lyricIds=['missing'];},(p:Project)=>{(p.shots[1] as unknown as {templateId:string}).templateId='javascript';},(p:Project)=>{p.character.bodyColor='url(remote)';}]){const p=fixture();mutate(p);assert.throws(()=>validateProject(p));}
});
test('所有节拍动作是时间纯函数且返回有限值',()=>{for(const style of ['idle','wave','walk','bounce','hop','sway']){const a=move(style,1.3,88,.21);assert.deepEqual(a,move(style,1.3,88,.21));assert.ok(Object.values(a).every(Number.isFinite));}});
test('模型未配置时失败，不冒充规则成功',async()=>{const saved=process.env.MV_API_KEY;delete process.env.MV_API_KEY;try{const {shots,planner,story,...p}=fixture();await assert.rejects(plan({...p,mode:'model'}),/尚未配置/);}finally{if(saved)process.env.MV_API_KEY=saved;}});
test('模型协议修复无效 JSON，保持上传素材与输出规格不变（本地模拟服务）',async()=>{
  let calls=0;const original={url:process.env.MV_API_BASE_URL,key:process.env.MV_API_KEY,model:process.env.MV_MODEL};const p=fixture();
  const server=createServer(async(req,res)=>{let b='';for await(const chunk of req)b+=chunk;const body=JSON.parse(b);assert.equal(body.response_format.type,'json_object');calls++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:calls===1?'not JSON':JSON.stringify({story:'模型模拟',shots:p.shots})}}]}));});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address() as {port:number};process.env.MV_API_BASE_URL=`http://127.0.0.1:${address.port}/v1`;process.env.MV_API_KEY='test-only';process.env.MV_MODEL='test-only';
  try{const {shots,planner,story,...base}=p;const result=await plan({...base,mode:'model'});assert.equal(calls,2);assert.equal(result.planner,'model');assert.deepEqual(result.audio,p.audio);assert.deepEqual(result.character,p.character);assert.equal(result.durationSec,15);}finally{for(const [name,val]of Object.entries({MV_API_BASE_URL:original.url,MV_API_KEY:original.key,MV_MODEL:original.model})){if(val===undefined)delete process.env[name];else process.env[name]=val;}await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
