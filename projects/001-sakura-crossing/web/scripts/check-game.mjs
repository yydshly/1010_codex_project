import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, route, walkable, movePlayer, interact, tick, applyPlan, rulesPlan, validatePlan, observation, ward } from '../src/game/engine.mjs';
const advance=(g,seconds)=>{for(let i=0;i<seconds*10;i++)tick(g,.1);};
const start=()=>{const g=createGame('test');applyPlan(g,rulesPlan(g));g.phase='playing';return g;};
test('房屋不可穿过，路线绕到合法地面',()=>{
  assert.equal(walkable(-10,-7.5),false);const points=route({x:-10,z:-3.3},{x:-10,z:-11});assert(points.length>10);assert(points.every(p=>walkable(p.x,p.z)));
  assert.equal(route({x:0,z:9},{x:100,z:0}).length,0);assert(route({x:0,z:0},{x:14.4,z:12.6}).length>0);
});
test('玩家实际走近、耗油点灯；暂停和准备期间不推进',()=>{
  const g=start();assert.equal(interact(g,'west'),false);movePlayer(g,-7,3);advance(g,6);assert(Math.hypot(g.actors.player.x+7,g.actors.player.z-3)<.1);
  assert(interact(g,'west'));advance(g,2.5);assert.equal(g.actors.player.oil,1);assert.equal(g.lanterns[0].charge,3);
  g.paused=true;const time=g.time;advance(g,10);assert.equal(g.time,time);assert.equal(movePlayer(g,0,0),false);
  const ready=createGame('ready');advance(ready,10);assert.equal(ready.time,0);
});
test('队友执行领油 detour 后返回指定花灯，物资守恒',()=>{
  const g=start();g.rivals.tactic='retreat';g.actors.companion.oil=0;advance(g,30);
  assert(g.journal.some(e=>e.who==='阿澄'&&e.text.includes('领取2份')));assert(g.journal.some(e=>e.who==='阿澄'&&e.text.includes('点亮东街')));
  assert.equal(g.actors.companion.oil,1);assert.equal(g.supply,28);
});
test('自然语言转换后的 follow 指令移动队友，居民 repair 也能点灯',()=>{
  const g=start(),p=rulesPlan(g);p.companion={task:'follow',goal:'player',say:'我跟着你。'};p.shopkeeper={task:'repair',goal:'plaza',say:'我去点广场灯。'};p.rivals.tactic='retreat';applyPlan(g,p,'test-model');
  movePlayer(g,7,4);advance(g,18);assert(Math.hypot(g.actors.companion.x-g.actors.player.x,g.actors.companion.z-g.actors.player.z)<2.5);
  assert(g.journal.some(e=>e.who==='柚子'&&e.text.includes('点亮广场')));assert.equal(g.actors.shopkeeper.oil,1);
});
test('纸灵会偷油，巡街守卫和玩家摇铃确实阻止它',()=>{
  const g=start();g.lanterns[0].charge=3;g.actors.companion.task='wait';g.spirits[0]={id:'paper1',x:-7,z:2,cooldown:0};g.spirits[1].cooldown=100;tick(g,.1);assert.equal(g.lanterns[0].charge,2);
  const p=rulesPlan(g);p.guard={task:'guard',goal:'west',say:'守西街'};applyPlan(g,p);advance(g,8);g.spirits[0]={id:'paper1',x:-7,z:2,cooldown:0};tick(g,.1);assert.equal(g.lanterns[0].charge,2);
  g.actors.player.x=-7;g.actors.player.z=2;assert(ward(g));assert.equal(ward(g),false);assert.equal(g.spirits[0].x,-13);
});
test('天气改变移动速度并在到期时结束',()=>{
  const calm=start(),gust=start(),p=rulesPlan(gust);p.director={weather:'gust',duration:12,announcement:'晚风'};applyPlan(gust,p);
  movePlayer(calm,0,0);movePlayer(gust,0,0);advance(calm,1);advance(gust,1);assert(calm.actors.player.z<gust.actors.player.z);
  advance(gust,12);assert.equal(gust.weather.kind,'calm');
});
test('三灯同时守住20秒胜利，失败与观察证据可导出',()=>{
  const g=start();g.rivals.tactic='retreat';g.lanterns.forEach(l=>l.charge=3);advance(g,20.5);assert.equal(g.phase,'won');
  const fail=start();fail.actors.companion.task='wait';advance(fail,241);assert.equal(fail.phase,'lost');
  assert(observation(fail,'请守灯').recentActions.length>0);assert.equal(observation(fail,'请守灯').playerRequest,'请守灯');
});
test('模型指令严格校验，地点与任务不匹配不能执行',()=>{
  const g=start(),p=rulesPlan(g);p.companion.task='follow';assert.throws(()=>validatePlan(p));
  p.companion.goal='player';assert.doesNotThrow(()=>validatePlan(p));p.director.duration=500;assert.throws(()=>applyPlan(g,p));
});
