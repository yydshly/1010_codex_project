/** 协同战斗边界，浏览器另验实际键鼠和模型。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { battleModule } from './battle-module.mjs';
const { Battle, COVERS, GOAL, LIMIT, VEHICLES, segmentBox, segmentCircle, findPath } = battleModule;
const report = { date: new Date().toISOString(), checks: [], passed: false };
const idle = { throttle: 0, steer: 0, aim: { x: 19, z: 9 }, fire: false };
const advance = (g, seconds, input = idle) => { for (let i = 0; i < Math.ceil(seconds * 60); i++) g.update(1 / 60, input); };
const check = (name, fn) => { const detail = fn(); report.checks.push({ name, passed: true, detail }); console.log('通过：' + name); };
const quiet = g => { g.infantry = []; g.units.filter(u => u.team === 'red').forEach(u => u.reload = 1000); g.nextEnemyRaid = 1000; };
check('连续碰撞与A*路线整段避障', () => {
  assert.equal(segmentBox({ x: -10, z: 0 }, { x: 10, z: 0 }, { x: 0, z: 0, w: 0.2, d: 3 }), 0.495);
  assert.equal(segmentCircle({ x: -10, z: 0 }, { x: 10, z: 0 }, { x: 0, z: 0 }, 1), 0.45);
  const start = { x: 19.86, z: -8.03 }, route = findPath(start, { x: 5, z: 4 }), points = [start, ...route]; assert.ok(route.length > 2);
  for (let i = 1; i < points.length; i++) assert.ok(!COVERS.some(c => segmentBox(points[i - 1], points[i], c, 2.85) !== null));
});
check('三车不同速度/装填/耐久；切换保留状态且禁止接管红队', () => {
  const g = new Battle(); g.start(); advance(g, 0.8, { ...idle, throttle: 1, fire: true }); const before = { ...g.player };
  assert.ok(before.distance > 1 && before.reload > 0); assert.equal(g.switchVehicle(1), false); assert.equal(g.switchVehicle(4), true);
  assert.equal(g.player.kind, 'hellcat'); assert.deepEqual(g.units[0], { ...before, speed: 0, brain: '留守掩护' });
  assert.equal(g.switchVehicle(0), true); assert.equal(g.player.hp, before.hp); assert.equal(g.player.reload, before.reload); assert.equal(g.player.x, before.x);
  assert.ok(VEHICLES.jeep.speed > VEHICLES.hellcat.speed && VEHICLES.hellcat.speed > VEHICLES.sherman.speed);
});
check('吉普可驾驶并呼叫空袭，无虚构主炮；失效车辆禁止选择', () => {
  const g = new Battle(); quiet(g); g.units = g.units.filter(u => u.id === 5); g.selectedId = 5; g.start();
  advance(g, 1, { ...idle, throttle: 1, fire: true }); assert.ok(g.player.distance > 3); assert.equal(g.shells.length, 0);
  assert.ok(g.callAirstrike(GOAL)); g.player.hp = 0; assert.equal(g.switchVehicle(5), false);
});
check('车辆不穿掩体/边界；枪管伸入墙体不能越墙开火', () => {
  const g = new Battle(); quiet(g); g.units = [g.player]; const c = COVERS[0]; Object.assign(g.player, { x: c.x - c.w / 2 - 3, z: c.z, heading: Math.PI / 2, aim: Math.PI / 2 });
  g.start(); advance(g, 2, { ...idle, throttle: 1, fire: true, aim: { x: 20, z: c.z } }); assert.ok(g.player.x <= c.x - c.w / 2 - 2.7 + 1e-8); assert.ok(g.history.some(e => e.kind === 'blocked'));
  g.player.x = 29.3; g.player.z = 5; g.player.speed = 7.5; const d = g.player.distance; advance(g, 1, { ...idle, throttle: 1 }); assert.ok(Math.abs(g.player.distance - d) < 1e-6);
});
check('步兵自主交火/扣血/退出，战果计入步兵', () => {
  const g = new Battle(); g.units = [g.player]; g.player.x = -25; g.player.z = 14; g.nextEnemyRaid = 1000;
  g.infantry = [g.infantry[0], g.infantry[4]]; Object.assign(g.infantry[0], { x: 0, z: 6 }); Object.assign(g.infantry[1], { x: 8, z: 6 });
  g.start(); advance(g, 6); assert.ok(g.history.some(e => e.kind === 'rifle' && e.unit === 100)); assert.ok(g.history.some(e => e.kind === 'rifle' && e.unit === 104));
  assert.ok(g.history.some(e => e.kind === 'hit' && e.target >= 100)); assert.equal(g.infantryKills, 1); return { infantry: g.infantry };
});
check('步枪对装甲伤害小，对无装甲吉普伤害较大', () => {
  const run = kind => { const g = new Battle(); g.units = [g.player]; g.player.kind = kind; Object.assign(g.player, { x: 0, z: 10 }); g.infantry = [g.infantry[4]]; Object.assign(g.infantry[0], { x: 8, z: 10, heading: -Math.PI / 2 }); g.nextEnemyRaid = 1000; g.start(); advance(g, 2); return 220 - g.player.hp; };
  const tank = run('sherman'), jeep = run('jeep'); assert.ok(tank > 0 && jeep > tank * 3); return { tank, jeep };
});
check('步兵行走推进步态相位，不穿掩体', () => {
  const g = new Battle(); g.units = [g.player]; Object.assign(g.player, { x: -25, z: 14 }); g.infantry = [g.infantry[4]]; Object.assign(g.infantry[0], { x: 18, z: -6 }); g.nextEnemyRaid = 1000;
  g.start(); advance(g, 4); const u = g.infantry[0]; assert.ok(u.distance > 2 && u.phase > 0); assert.ok(!COVERS.some(c => segmentBox(u, u, c, 0.3) !== null)); return u;
});
check('空袭先预警，投3枚重力炸弹；有范围伤害且无友伤', () => {
  const g = new Battle(); quiet(g); g.units = g.units.filter(u => u.id < 2); Object.assign(g.player, { x: 0, z: 9 }); Object.assign(g.units[1], { x: 19, z: 9, speed: 0 });
  g.start(); assert.ok(g.callAirstrike({ x: 19, z: 9 })); assert.equal(g.callAirstrike(GOAL), false);
  advance(g, 3.3); assert.equal(g.bombs.length, 0); assert.equal(g.units[1].hp, 80);
  advance(g, 0.7); assert.equal(g.bombs.length, 3); const high = g.bombs[0].y; advance(g, 0.3); assert.ok(g.bombs[0].y < high);
  const hp = g.player.hp; advance(g, 2); assert.equal(g.history.filter(e => e.kind === 'bomb').length, 3); assert.ok(g.units[1].hp < 80); assert.equal(g.player.hp, hp); assert.ok(g.history.some(e => e.kind === 'hit' && e.unit === -1 && e.target === 1));
  assert.ok(g.history.filter(e => e.kind === 'bomb').every(e => Math.hypot(e.x - 19, e.z - 9) < 5));
  return { enemyHP: g.units[1].hp, bombs: g.history.filter(e => e.kind === 'bomb') };
});
check('红队自动空袭有预警，落弹能伤害蓝队', () => {
  const g = new Battle(); g.infantry = []; g.units = [g.player]; g.start(); g.nextEnemyRaid = 0.1;
  advance(g, 0.2); assert.ok(g.airstrikes.some(r => r.team === 'red')); const hp = g.player.hp;
  advance(g, 6); assert.ok(g.player.hp < hp); assert.ok(g.history.some(e => e.kind === 'airstrike' && e.unit === -1)); return { remainingHP: g.player.hp };
});
check('暂停冻结步兵/飞机/炸弹/冷却和全部模拟；禁止换车或空袭', () => {
  const g = new Battle(); g.start(); g.callAirstrike(GOAL); advance(g, 4); g.pause(); const a = g.snapshot(); advance(g, 20, { ...idle, fire: true });
  assert.equal(g.switchVehicle(4), false); assert.equal(g.callAirstrike(GOAL), false); assert.deepEqual(g.snapshot(), a); g.start(); advance(g, 0.1); assert.ok(g.time > a.time);
});
check('当前车退出自动接管幸存车辆，全部蓝车退出才失败', () => {
  const g = new Battle(); quiet(g); g.start(); g.player.hp = 0; advance(g, 0.02); assert.equal(g.selectedId, 4); assert.equal(g.status, 'running');
  g.units.filter(u => u.team === 'blue').forEach(u => u.hp = 0); advance(g, 0.02); assert.equal(g.status, 'lost');
});
check('红方步兵阻止占领，离开衰减，清空后20秒获胜', () => {
  const g = new Battle(); g.units = [g.player]; g.infantry = [g.infantry[4]]; Object.assign(g.player, { x: GOAL.x, z: GOAL.z }); Object.assign(g.infantry[0], { x: 8, z: 6, reload: 1000 }); g.nextEnemyRaid = 1000;
  g.start(); advance(g, 2); assert.equal(g.contested, true); assert.equal(g.captured, 0); g.infantry[0].hp = 0; advance(g, 3); assert.ok(g.captured > 2.9);
  g.player.x = -12; advance(g, 2); assert.ok(g.captured < 2.1); Object.assign(g.player, { x: GOAL.x, z: GOAL.z }); advance(g, 21); assert.equal(g.status, 'won'); assert.equal(g.captured, 20);
});
check('仅退出3辆装甲不能全歼获胜，6名步兵也退出才胜利', () => {
  const g = new Battle(); g.start(); g.kills = 3; advance(g, 0.02); assert.equal(g.status, 'running'); g.infantryKills = 6; advance(g, 0.02); assert.equal(g.status, 'won');
});
check('超时失败，重开清空协同状态，恢复6车10步兵', () => {
  const g = new Battle(); quiet(g); g.units = [g.player]; g.start(); advance(g, LIMIT + 1); assert.equal(g.status, 'lost'); g.reset();
  assert.equal(g.status, 'ready'); assert.equal(g.time, 0); assert.equal(g.player.hp, 220); assert.equal(g.units.length, 6); assert.equal(g.infantry.length, 10);
  assert.equal(g.airstrikes.length, 0); assert.equal(g.bombs.length, 0); assert.equal(g.shells.length, 0); assert.equal(g.history.length, 0); assert.equal(g.airCooldown, 0);
});
check('空袭碎片跨实体掩体衰减，开阔地伤害更大', () => {
  const g = new Battle(); g.units = [g.player]; Object.assign(g.player, { x: -25, z: 14 }); g.infantry = [g.infantry[4], g.infantry[5]];
  Object.assign(g.infantry[0], { x: -6, z: 0, reload: 100 }); Object.assign(g.infantry[1], { x: -9.9, z: 1.92, reload: 100 }); g.nextEnemyRaid = 1000;
  g.start(); g.bombs = [{ id: 50, raid: 0, team: 'blue', x: -9.9, z: -3, y: 0, vy: 0, vz: 0 }]; advance(g, 0.02);
  const shielded = 36 - g.infantry[0].hp, exposed = 36 - g.infantry[1].hp; assert.ok(shielded > 0 && exposed > shielded * 2); return { shielded, exposed };
});
check('友军车辆位于蓝队落弹中心仍无友伤；空袭冷却全队共享', () => {
  const g = new Battle(); g.infantry = []; g.units = g.units.filter(u => u.team === 'blue'); g.nextEnemyRaid = 1000; g.start();
  const hp = g.player.hp; g.bombs = [{ id: 50, raid: 0, team: 'blue', x: g.player.x, z: g.player.z, y: 0, vy: 0, vz: 0 }]; advance(g, 0.02); assert.equal(g.player.hp, hp);
  assert.ok(g.callAirstrike(GOAL)); g.switchVehicle(4); assert.equal(g.callAirstrike(GOAL), false); advance(g, 24.1); assert.ok(g.callAirstrike(GOAL));
});
check('空袭锁定旧坐标，预警后真实驾驶驶离能避开全部炸弹', () => {
  const g = new Battle(); g.units = [g.player]; g.infantry = []; g.nextEnemyRaid = 0.1; g.start(); advance(g, 0.2);
  const mark = { x: g.airstrikes[0].x, z: g.airstrikes[0].z }, hp = g.player.hp;
  advance(g, 6, { ...idle, throttle: 1 }); assert.equal(g.history.filter(e => e.kind === 'bomb').length, 3);
  assert.equal(g.player.hp, hp); assert.ok(Math.hypot(g.player.x - mark.x, g.player.z - mark.z) > 10);
  assert.equal(g.airstrikes[0].x, mark.x); assert.equal(g.airstrikes[0].z, mark.z); return { mark, player: g.player };
});
check('标准模式真实规则电脑能击败不操作的蓝队全部三车，含自动接管与空袭', () => {
  const g = new Battle(); g.reset('standard'); g.start(); advance(g, 120);
  assert.equal(g.status, 'lost'); assert.ok(g.units.filter(u => u.team === 'blue').every(u => u.hp === 0));
  assert.ok(g.history.some(e => e.kind === 'switch' && e.unit === 4)); assert.ok(g.history.some(e => e.kind === 'switch' && e.unit === 5));
  assert.ok(g.history.some(e => e.kind === 'airstrike' && e.unit === -1)); return { time: g.time, selectedId: g.selectedId, vehicles: g.units };
});
report.passed = true; if(!process.argv.includes('--no-report')) fs.writeFileSync(new URL('../../notes/combined-arms-unit-results.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(`${report.checks.length} 项协同规则验证通过。`);
