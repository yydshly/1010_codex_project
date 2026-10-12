import test from 'node:test';
import assert from 'node:assert/strict';
import { createDirector } from './town-director.mjs';
import { createGame, rulesPlan } from '../src/game/engine.mjs';
const response=p=>({text:JSON.stringify(p),model:'test-provider',ms:1,usage:{in:1,out:1}});
test('非法指令拒绝后只纠正一次，并读取新的状态',async()=>{
  const g=createGame('correction','codex'),inputs=[];
  const plan=createDirector({minimumInterval:0,availability:()=>({available:true}),decide:async(_mode,_system,prompt)=>{
    inputs.push(JSON.parse(prompt));const p=rulesPlan(g);
    if(inputs.length===1){p.companion={task:'fetch',goal:'west',say:'错误测试'};g.actors.player.x=4;}
    return response(p);
  }});
  await plan(g,'阿澄去领油');assert.equal(inputs.length,2);assert.equal(g.calls,2);
  assert.equal(g.decisions[0].status,'failed');assert(g.decisions[0].raw.includes('错误测试'));
  assert.equal(g.decisions[1].status,'applied');assert.equal(inputs[1].actors.player.x,4);
  assert(inputs[1].playerRequest.includes('领油任务必须指向杂货铺'));assert.equal(g.pending,false);assert.equal(g.error,'');
});
test('两次都非法则停止，不无限重试；达到额度不再请求',async()=>{
  const g=createGame('invalid','codex');let calls=0;
  const plan=createDirector({minimumInterval:0,availability:()=>({available:true}),decide:async()=>{calls++;return response({});}});
  await plan(g);assert.equal(calls,2);assert.equal(g.decisions.at(-1).status,'failed');assert.equal(g.pending,false);
  g.calls=10;await assert.rejects(()=>plan(g),/10轮/);assert.equal(calls,2);
});
test('并发请求阻止；网络错误不触发格式纠正',async()=>{
  const g=createGame('busy','codex');let release;
  const plan=createDirector({minimumInterval:0,availability:()=>({available:true}),decide:()=>new Promise(resolve=>{release=resolve;})});
  const first=plan(g);await assert.rejects(()=>plan(g),/仍在思考/);release(response(rulesPlan(g)));await first;
  const fail=createDirector({minimumInterval:0,availability:()=>({available:true}),decide:async()=>{throw new Error('测试网络失败');}});
  const h=createGame('network','codex');await fail(h);assert.equal(h.calls,1);assert.equal(h.error,'测试网络失败');
});
