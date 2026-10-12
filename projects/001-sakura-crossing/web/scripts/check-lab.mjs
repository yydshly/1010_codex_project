import assert from 'node:assert/strict';
import { SCENES, createConfig } from '../src/lab/configs.js';
import { FrameMetrics, summarize } from '../src/lab/metrics.js';

let layouts = 0;
for (const id of Object.keys(SCENES)) for (const count of [10, 50, 100]) for (const seed of [0, 2411, 999999]) {
  const c = createConfig(id, count, seed);
  assert.deepEqual(c, createConfig(id, count, seed), '相同种子必须可复现');
  assert.equal(c.buildings.length, count);
  assert.equal(c.buildings.filter((b) => b.shop).length, 1);
  assert.equal(new Set(c.buildings.map((b) => b.id)).size, count);
  const bounds = c.buildings.map((b) => {
    const cos = Math.abs(Math.cos(b.rotation)), sin = Math.abs(Math.sin(b.rotation));
    const halfX = (b.width + .6) / 2 * cos + (b.depth + .6) / 2 * sin;
    const halfZ = (b.width + .6) / 2 * sin + (b.depth + .6) / 2 * cos;
    assert.ok(Math.abs(b.x) + halfX <= c.width / 2 && Math.abs(b.z) + halfZ <= c.depth / 2, '屋顶必须位于地面范围内');
    return { x: b.x, z: b.z, halfX, halfZ };
  });
  for (let i = 0; i < bounds.length; i++) for (let j = i + 1; j < bounds.length; j++) {
    const a = bounds[i], b = bounds[j];
    assert.ok(Math.abs(a.x - b.x) >= a.halfX + b.halfX || Math.abs(a.z - b.z) >= a.halfZ + b.halfZ, '建筑屋顶包围盒不能相交');
  }
  layouts++;
}
assert.throws(() => createConfig('unknown'));
assert.throws(() => createConfig('street', 20));
assert.throws(() => createConfig('street', 10, -1));
assert.throws(() => createConfig('street', 10, 1.1));
assert.throws(() => createConfig('street', 10, 1000000));
assert.notDeepEqual(createConfig('forest', 10, 0).buildings, createConfig('forest', 10, 2411).buildings);
assert.equal(summarize([]), null);
const s = summarize([10, 10, 10, 10, 60], [1, 2, 3, 4, 5]);
assert.equal(s.fps, 50); assert.equal(s.medianMs, 10); assert.equal(s.p95Ms, 60); assert.equal(s.cpuSubmitMs, 3);
const rolling = new FrameMetrics();
for (let i = 0; i < 300; i++) rolling.frame(i * 20, 2);
assert.equal(rolling.summary.frames, 240); assert.equal(rolling.summary.fps, 50);
rolling.reset(); assert.equal(rolling.frame(10000, 2), null); assert.equal(rolling.summary, null);
console.log(`技术实验检查通过：${layouts} 组布局的数量、复现、屋顶边界与避让；帧统计与窗口重置。`);
