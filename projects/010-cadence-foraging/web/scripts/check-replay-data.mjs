import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const read=async name=>JSON.parse(await fs.readFile(new URL(`../../notes/${name}.json`,import.meta.url),'utf8'));
const f=await read('fish-evaluation-results');
assert.equal(f.runs.length,8);
for(const r of f.runs){for(const phase of ['cold','trained']){const s=r[phase];assert.equal(s.cases.length,48);for(const k of ['cadence','velocity','acceleration','stationary']){
 let total=0,hits=0;
 for(const c of s.cases){assert.equal(c.positions.length,33);assert.equal(c.forecasts[k].length,12);assert.equal(c.errors[k].length,12);
  c.forecasts[k].forEach((p,i)=>{const truth=c.positions[8+s.config.horizons[i]],e=Math.hypot(p[0]-truth[0],p[1]-truth[1]);assert.ok(Math.abs(e-c.errors[k][i])<1e-8,'预测与误差不一致');total+=e;});if(c.shots[k].hit)hits++;
 }assert.ok(Math.abs(total/(48*12)-s.metrics[k].ade)<1e-8);assert.equal(hits,s.metrics[k].hits);
 } }assert.deepEqual(r.cold.cases.map(c=>c.positions),r.trained.cases.map(c=>c.positions),'冷启动与训练后不是同一批留出鱼');}
const shops=await read('evaluation-results');assert.equal(shops.lives.length,4);for(const r of shops.lives){assert.equal(r.history.length,600);for(const k of ['cadence','rule','q'])assert.equal(r.history.reduce((n,h)=>n+h.hits[k],0),r.controllers[k].hits);}
const routes=await read('route-evaluation-results');assert.equal(routes.lives.length,24);for(const r of routes.lives){assert.equal(r.history.length,360);for(const k of ['cadence','rule','q'])assert.equal(r.history.reduce((n,h)=>n+h.hits[k],0),r.controllers[k].hits);}
const a=await read('algorithm-browser-frames');assert.equal(a.frames.length,28);for(const f of a.frames){assert.equal(f.activity.length,42);assert.equal(f.eligibility.length,450);if(f.weights_before){assert.equal(f.weights_after.length,450);assert.equal(f.weight_delta.length,450);f.weights_before.forEach((w,i)=>assert.ok(Math.abs(f.weights_after[i]-w-f.weight_delta[i])<1e-12));}}
console.log('回放数据检查通过：2400轮/8640趟，8次运行冷/热同鱼、误差与命中逐项核对，28帧资格及权重差一致。');
