import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas } from '@napi-rs/canvas';
import { drawScene, upgradeScene, locateTime } from '../public/composition.js';
import { validateScene } from '../lib/editor.mjs';

test('场景迁移保留旁白与媒体，编辑坐标和时长通过白名单保存',()=>{
  const old={id:'s1',title:'标题',body:'正文',narration:'口播',imagePrompt:'插画',image:'photo.png',audio:'voice.mp3',audioDuration:8,duration:8.6,voiceEvidence:{text:'口播'}};
  const edited=upgradeScene(structuredClone(old));edited.elements.find(e=>e.id==='title').x=120;edited.timing.duration=12;
  const saved=validateScene(edited,old,new Map([['photo.png',{type:'image',file:'photo.png'}]]));
  assert.equal(saved.audio,'voice.mp3');assert.equal(saved.elements.find(e=>e.id==='title').x,120);assert.equal(saved.timing.duration,12);
  assert.throws(()=>validateScene({...edited,elements:[{...edited.elements[0],x:1900}]},old,new Map()),/画布/);
  assert.throws(()=>validateScene({...edited,timing:{...edited.timing,duration:NaN}},old,new Map()),/时间轴/);
  assert.throws(()=>validateScene({...edited,mainAsset:'../../secret'},old,new Map()),/不可用/);
});
test('共用画布渲染实际遵循对象位置、层级、颜色、隐藏和背景',()=>{
  const c=createCanvas(1920,1080),ctx=c.getContext('2d');
  const s={background:'#ffffff',elements:[{id:'a',type:'shape',x:20,y:30,w:100,h:100,color:'#ff0000'},{id:'b',type:'shape',x:70,y:30,w:100,h:100,color:'#0000ff'}]};
  drawScene(ctx,s,new Map());assert.deepEqual([...ctx.getImageData(80,40,1,1).data],[0,0,255,255]);
  s.elements[1].hidden=true;drawScene(ctx,s,new Map());assert.deepEqual([...ctx.getImageData(80,40,1,1).data],[255,0,0,255]);
  s.elements[0].x=300;drawScene(ctx,s,new Map());assert.deepEqual([...ctx.getImageData(80,40,1,1).data],[255,255,255,255]);
});
test('播放头使用编辑时长跨场景定位，不依赖旧自动音频时长',()=>{
  const scenes=[{duration:8,timing:{duration:5}},{duration:8,timing:{duration:9}}];
  assert.deepEqual(locateTime(scenes,6),{index:1,start:5,local:1});
  assert.deepEqual(locateTime(scenes,5),{index:1,start:5,local:0});
});
