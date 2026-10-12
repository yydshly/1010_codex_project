import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/battle/game.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { Battle, COVERS, GOAL, RELOAD, LIMIT, VEHICLE_RADIUS, segmentBox, segmentCircle, dist, findPath } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));
const report = { date: new Date().toISOString(), checks: [], passed: false };
const idle = { throttle: 0, steer: 0, aim: { x: 19, z: 9 }, fire: false };
const advance = (g, seconds, input = idle) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60, input); };
const check = (name, fn) => { const detail = fn(); report.checks.push({ name, passed: true, detail }); console.log('通过：' + name); };
check('连续碰撞：高速弹丸穿越细掩体与圆形战车仍可命中', () => {
  const c = { x: 0, z: 0, w: 0.2, d: 3 }; assert.equal(segmentBox({ x: -10, z: 0 }, { x: 10, z: 0 }, c), 0.495);
  assert.equal(segmentBox({ x: -10, z: 4 }, { x: 10, z: 4 }, c), null);
  assert.equal(segmentCircle({ x: -10, z: 0 }, { x: 10, z: 0 }, { x: 0, z: 0 }, 1), 0.45);
});
check('玩家加速、倒车、转向；暂停冻结完整模拟状态', () => {
  const g = new Battle(); g.start(); advance(g, 1, { ...idle, throttle: 1, steer: 0.4 }); assert.ok(g.player.distance > 3); assert.ok(g.player.turn > 0);
  advance(g, 2, { ...idle, throttle: -1 }); assert.ok(g.player.speed < 0);
  g.pause(); const before = g.snapshot(); advance(g, 10, { ...idle, fire: true }); assert.deepEqual(g.snapshot(), before); g.start(); advance(g, 0.2); assert.ok(g.time > before.time);
});
check('掩体与边界阻挡车辆；接触边界不会继续累加虚假行驶路程', () => {
  const g = new Battle(); g.units = [g.player]; const c = COVERS[0]; g.player.x = c.x - c.w / 2 - 3; g.player.z = c.z; g.player.heading = Math.PI / 2;
  g.start(); advance(g, 2, { ...idle, throttle: 1 }); assert.ok(g.player.x <= c.x - c.w / 2 - VEHICLE_RADIUS + 1e-8);
  g.player.x = 32 - VEHICLE_RADIUS; g.player.z = 5; g.player.speed = 7.5; const d = g.player.distance; advance(g, 1, { ...idle, throttle: 1 }); assert.ok(g.player.x <= 32 - VEHICLE_RADIUS); assert.ok(Math.abs(g.player.distance - d) < 1e-6);
});
check('炮弹先碰到掩体；枪管伸入掩体也不能越墙开火', () => {
  const g = new Battle(); g.units = g.units.slice(0, 2); const c = COVERS[0];
  Object.assign(g.player, { x: c.x - 6, z: c.z, aim: Math.PI / 2 }); Object.assign(g.units[1], { x: c.x + 6, z: c.z, reload: 100 });
  g.start(); advance(g, 0.5, { ...idle, aim: g.units[1], fire: true }); assert.equal(g.units[1].hp, 80); assert.ok(g.history.some(e => e.kind === 'blocked'));
  g.player.x = c.x - c.w / 2 - 1.66; g.player.reload = 0; advance(g, 0.02, { ...idle, aim: g.units[1], fire: true }); assert.equal(g.shells.length, 0);
});
check('命中扣血、装填限速；两发退出一辆对手并计算战果', () => {
  const g = new Battle(); g.units = g.units.slice(0, 2); Object.assign(g.units[1], { x: 8, z: 10, reload: 100 }); g.start(); advance(g, 0.7, { ...idle, aim: { x: 8, z: 10 }, fire: true });
  assert.equal(g.units[1].hp, 40); assert.equal(g.history.filter(e => e.kind === 'shot' && e.unit === 0).length, 1);
  advance(g, RELOAD, { ...idle, aim: { x: 8, z: 10 }, fire: true }); assert.equal(g.units[1].hp, 0); assert.equal(g.kills, 1);
});
check('电脑主动行驶、转动炮塔并开火；标准演习会实际击败不操作的玩家', () => {
  const g = new Battle(); g.reset('standard'); g.start(); const p = g.units[1].x; advance(g, 5); assert.notEqual(g.units[1].x, p); assert.ok(g.history.some(e => e.kind === 'shot' && e.unit > 0));
  advance(g, 100); assert.equal(g.status, 'lost'); assert.equal(g.player.hp, 0); return { time: g.time, enemyHits: g.history.filter(e => e.kind === 'hit' && e.target === 0).length };
});
check('网格寻路绕过掩体，不在已到达的拐角重复停留', () => {
  const start = { x: 19.86, z: -8.03 }, goal = { x: 5, z: 4 }, route = findPath(start, goal);
  assert.ok(route.length > 2); assert.deepEqual(route.at(-1), goal);
  const points = [start, ...route]; for (let i = 1; i < points.length; i++) assert.ok(!COVERS.some(c => segmentBox(points[i - 1], points[i], c, VEHICLE_RADIUS + 0.15) !== null));
  const g = new Battle(); g.start(); advance(g, 30); assert.ok(g.units[2].distance > 12); assert.ok(g.history.some(e => e.kind === 'shot' && e.unit === 2));
  return { route, travelled: g.units[2].distance };
});
check('通信区有对手时暂停占领；离开缓慢衰减；无人争夺20秒获胜', () => {
  const g = new Battle(); Object.assign(g.player, GOAL); g.units.slice(1).forEach(u => Object.assign(u, { hp: 0 })); g.start(); advance(g, 5); assert.ok(g.captured > 4.9);
  Object.assign(g.units[1], { x: GOAL.x + 3, z: GOAL.z, hp: 80, reload: 100 }); advance(g, 1); assert.ok(g.contested); assert.ok(g.captured < 5.1);
  g.units[1].hp = 0; g.player.x = -12; advance(g, 2); assert.ok(g.captured < 4.1);
  Object.assign(g.player, { x: GOAL.x, z: GOAL.z }); advance(g, 21); assert.equal(g.status, 'won'); assert.equal(g.captured, 20);
});
check('时间耗尽失败；重开清除弹丸、战果、计时并恢复血量', () => {
  const g = new Battle(); g.units.slice(1).forEach(u => { u.hp = 0; }); g.start(); advance(g, LIMIT + 1); assert.equal(g.status, 'lost');
  g.reset(); assert.equal(g.status, 'ready'); assert.equal(g.player.hp, 220); assert.equal(g.time, 0); assert.equal(g.kills, 0); assert.equal(g.shells.length, 0); assert.equal(g.history.length, 0); assert.equal(g.units.length, 4);
});
report.passed = true; fs.writeFileSync(new URL('../../notes/battle-unit-results.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
console.log(`${report.checks.length} 项模拟验证通过。`);
