/** 本地规则模拟：米 / 秒，固定步长；不依赖渲染、网络或大模型。 */
import { AIRPORT, AirportMission, type Order } from './airport';
export interface Point { x: number; z: number }
export interface Cover extends Point { id: string; w: number; d: number; h: number; label: string }
export const COVERS: Cover[] = [
  { id: 'supply', x: -7, z: -3, w: 5, d: 3, h: 2.6, label: '补给箱' },
  { id: 'revetment', x: 13, z: -3, w: 5, d: 3, h: 2.6, label: '混凝土掩体' },
  { id: 'crates', x: -4, z: 17, w: 5, d: 2, h: 2.4, label: '补给箱' },
  { id: 'hangar', x: -24, z: -19, w: 12, d: 7, h: 5, label: '机库' },
  { id: 'tent-n', x: -8, z: -20, w: 6, d: 5, h: 3, label: '指挥帐篷' },
  { id: 'tent-s', x: 20, z: 19, w: 7, d: 6, h: 3, label: '营帐' },
  { id: 'tent-e', x: 30, z: 18, w: 6, d: 7, h: 3, label: '营帐' },
  { id: 'aircraft', x: -25.5, z: -7, w: 11.3, d: 10, h: 3.5, label: '停机区' },
];
export const GOAL = { x: 5, z: 6, radius: 5, seconds: 20 };
export const BOUNDS = { x: 32, z: 22 };
export const VEHICLE_RADIUS = 2.7;
export const RELOAD = 1.35;
export const LIMIT = 180;
export type Status = 'ready' | 'running' | 'paused' | 'won' | 'lost';
export type Team = 'blue' | 'red';
export type VehicleKind = 'sherman' | 'hellcat' | 'jeep';
export const VEHICLES = {
  sherman: { name: 'M4A3 · 谢尔曼', weapon: '75 mm', speed: 7.5, turn: 1.65, radius: 2.7, reload: 1.35, damage: 40, muzzle: 2.93, height: 2.2352, hp: 220 },
  hellcat: { name: 'M18 · 地狱猫', weapon: '76 mm', speed: 10, turn: 1.9, radius: 2.7, reload: 1.65, damage: 48, muzzle: 3.95, height: 1.81, hp: 150 },
  jeep: { name: 'Willys · 侦察吉普', weapon: '侦察 / 空袭', speed: 13, turn: 2.2, radius: 1.35, reload: 0, damage: 0, muzzle: 0, height: 1.3, hp: 90 },
} as const;
export interface Unit extends Point {
  id: number; team: Team; kind: VehicleKind; hp: number; maxHp: number; heading: number; aim: number;
  speed: number; distance: number; turn: number; reload: number; brain: string; stuck: number; assistReadyAt: number; ammo: number;
}
export interface Infantry extends Point {
  id: number; team: Team; hp: number; maxHp: number; heading: number; reload: number; distance: number;
  speed: number; phase: number; firing: number; brain: string; ammo: number;
}
export interface Shell extends Point { id: number; owner: number; team: Team; weapon: 'cannon' | 'rifle'; y: number; damage: number; vx: number; vz: number; life: number }
export interface Airstrike extends Point { id: number; team: Team; age: number; dropped: number }
export interface Bomb extends Point { id: number; raid: number; team: Team; y: number; vy: number; vz: number }
export const AIR_COOLDOWN = 24;
export const AIR_RADIUS = 5;
export const AIR_WARNING_RADIUS = 10;
export interface Input { throttle: number; steer: number; aim: Point; fire: boolean }
export interface BattleEvent extends Point { kind: 'shot' | 'rifle' | 'hit' | 'blocked' | 'destroyed' | 'airstrike' | 'bomb' | 'switch' | 'won' | 'lost' | 'command' | 'mission' | 'supply' | 'recon'; unit: number; target?: number; y?: number; time: number; text: string }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const toward = (a: number, b: number, max: number) => a + clamp(angleDelta(b, a), -max, max);
export const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
/** Slab intersection and continuous circle intersection avoid fast shells tunnelling. */
export function segmentBox(a: Point, b: Point, c: Cover, expand = 0): number | null {
  let near = 0, far = 1;
  for (const axis of ['x', 'z'] as const) {
    const extent = (axis === 'x' ? c.w : c.d) / 2 + expand, v = b[axis] - a[axis];
    const lo = c[axis] - extent, hi = c[axis] + extent;
    if (Math.abs(v) < 1e-9) { if (a[axis] < lo || a[axis] > hi) return null; }
    else { const t0 = (lo - a[axis]) / v, t1 = (hi - a[axis]) / v; near = Math.max(near, Math.min(t0, t1)); far = Math.min(far, Math.max(t0, t1)); if (near > far) return null; }
  }
  return near;
}
export function segmentCircle(a: Point, b: Point, c: Point, radius: number): number | null {
  const dx = b.x - a.x, dz = b.z - a.z, ox = a.x - c.x, oz = a.z - c.z;
  const A = dx * dx + dz * dz, C = ox * ox + oz * oz - radius * radius;
  if (C <= 0) return 0;
  if (A < 1e-12) return null;
  const B = 2 * (ox * dx + oz * dz), D = B * B - 4 * A * C;
  if (D < 0) return null;
  const t = (-B - Math.sqrt(D)) / (2 * A); return t >= 0 && t <= 1 ? t : null;
}
const grids = new Map<number, Map<string, Point>>();
function grid(radius: number) {
  if (grids.has(radius)) return grids.get(radius)!;
  const nodes = new Map<string, Point>();
  for (let x = -30; x <= 30; x += 2) for (let z = -20; z <= 20; z += 2) {
    const p = { x, z }; if (!COVERS.some(c => segmentBox(p, p, c, radius + 0.3) !== null)) nodes.set(`${x},${z}`, p);
  }
  grids.set(radius, nodes); return nodes;
}
const navigable = (a: Point, b: Point, radius = VEHICLE_RADIUS) => !COVERS.some(c => segmentBox(a, b, c, radius + 0.15) !== null);
/** Small A* grid; test the entire edge to prevent diagonal corner cutting. */
export function findPath(start: Point, goal: Point, radius = VEHICLE_RADIUS): Point[] {
  const GRID = grid(radius), clear = (a: Point, b: Point) => navigable(a, b, radius);
  const nodes = [...GRID.entries()];
  const nearest = (p: Point) => nodes.filter(([, n]) => clear(p, n)).sort((a, b) => dist(p, a[1]) - dist(p, b[1]))[0];
  const first = nearest(start), end = nearest(goal); if (!first || !end) return [];
  const open = new Set([first[0]]), closed = new Set<string>(), cost = new Map([[first[0], 0]]), parent = new Map<string, string>();
  while (open.size) {
    const key = [...open].sort((a, b) => cost.get(a)! + dist(GRID.get(a)!, end[1]) - cost.get(b)! - dist(GRID.get(b)!, end[1]))[0];
    if (key === end[0]) { const result: Point[] = [goal]; let step: string | undefined = key; while (step) { result.unshift(GRID.get(step)!); step = parent.get(step); } return result; }
    open.delete(key); closed.add(key); const p = GRID.get(key)!;
    for (const dx of [-2, 0, 2]) for (const dz of [-2, 0, 2]) {
      if (!dx && !dz) continue; const id = `${p.x + dx},${p.z + dz}`, q = GRID.get(id);
      if (!q || closed.has(id) || !clear(p, q)) continue;
      const next = cost.get(key)! + dist(p, q); if (next >= (cost.get(id) ?? Infinity)) continue;
      cost.set(id, next); parent.set(id, key); open.add(id);
    }
  }
  return [];
}
export class Battle {
  status: Status = 'ready'; time = 0; captured = 0; contested = false; kills = 0; infantryKills = 0;
  selectedId = 0; airCooldown = 0; nextEnemyRaid = 22;
  units: Unit[] = []; infantry: Infantry[] = []; shells: Shell[] = []; airstrikes: Airstrike[] = []; bombs: Bomb[] = [];
  events: BattleEvent[] = []; history: BattleEvent[] = [];
  infantryMuzzle = { x: -0.13, y: 1.4, z: 0.9 };
  difficulty: 'casual' | 'standard' = 'casual'; private nextShell = 0; private nextRaid = 0;
  mission: AirportMission | null = null;
  private routes = new Map<number, { path: Point[]; target: Point; until: number }>();
  constructor(readonly mode: 'skirmish' | 'airport' = 'skirmish') { this.reset(); }
  get player() { return this.units.find(u => u.id === this.selectedId) ?? this.units[0]; }
  get combatants(): (Unit | Infantry)[] { return [...this.units, ...this.infantry]; }
  reset(difficulty = this.difficulty) {
    this.difficulty = difficulty; this.status = 'ready'; this.time = 0; this.captured = 0; this.contested = false;
    this.kills = this.infantryKills = this.selectedId = this.airCooldown = this.nextShell = this.nextRaid = 0;
    this.nextEnemyRaid = difficulty === 'casual' ? 22 : 16;
    this.shells = []; this.bombs = []; this.airstrikes = []; this.events = []; this.history = []; this.routes.clear();
    const starts: [number, Team, VehicleKind, number, number][] = [
      [0, 'blue', 'sherman', -12, 10], [1, 'red', 'hellcat', 19, 9], [2, 'red', 'hellcat', 24, -9], [3, 'red', 'hellcat', 8, -13],
      [4, 'blue', 'hellcat', -18, 14], [5, 'blue', 'jeep', -20, 7],
    ];
    this.units = starts.map(([id, team, kind, x, z]) => {
      const hp = team === 'red' ? 80 : Math.round(VEHICLES[kind].hp * (difficulty === 'casual' ? 1 : 0.65));
      return { id, team, kind, x, z, hp, maxHp: hp, heading: team === 'blue' ? Math.PI / 2 : -Math.PI / 2,
        aim: team === 'blue' ? Math.PI / 2 : -Math.PI / 2, speed: 0, distance: 0, turn: 0,
        reload: team === 'red' ? 4 + id * 0.8 : 0, brain: id === 0 ? '玩家' : team === 'blue' ? '留守掩护' : '争夺通信区', stuck: 0, assistReadyAt: 0, ammo: 18 };
    });
    const blue = [[-5, 5], [-5, 8], [-9, 5], [-9, 8]], red = [[8, 6], [11, 8], [14, 7], [16, 11], [16, 14], [11, 13]];
    this.infantry = [...blue, ...red].map(([x, z], i) => ({ id: 100 + i, team: i < 4 ? 'blue' : 'red', x, z,
      hp: i < 4 ? 45 : 36, maxHp: i < 4 ? 45 : 36, heading: i < 4 ? Math.PI / 2 : -Math.PI / 2,
      reload: 0.7 + i * 0.17, distance: 0, speed: 0, phase: i * Math.PI, firing: 0, brain: '接近通信区', ammo: 30 }));
    this.mission = this.mode === 'airport' ? new AirportMission() : null; this.mission?.initialize(this);
  }
  clearRoutes() { this.routes.clear(); }
  notify(kind: 'command' | 'mission' | 'supply' | 'recon', text: string, point: Point) { this.emit({ kind, text, x: point.x, z: point.z, unit: this.selectedId }); }
  commandSquad(order: Order, target: Point) {
    const p = { x: clamp(target.x, -31, 31), z: clamp(target.z, -21, 21) };
    // 鼠标点到实体掩体时，将命令落点投到最近的可通行边缘。
    for (const c of COVERS) if (segmentBox(p, p, c, 1.3) !== null) {
      const candidates = [{ x: c.x - c.w / 2 - 1.5, z: p.z }, { x: c.x + c.w / 2 + 1.5, z: p.z }, { x: p.x, z: c.z - c.d / 2 - 1.5 }, { x: p.x, z: c.z + c.d / 2 + 1.5 }];
      Object.assign(p, candidates.sort((a, b) => dist(a, p) - dist(b, p))[0]);
    }
    return this.mission?.command(this, order, p) ?? false;
  }
  interact() { return this.mission?.interact(this) ?? false; }
  start() { if (this.status === 'ready' || this.status === 'paused') this.status = 'running'; }
  pause() { if (this.status === 'running') this.status = 'paused'; }
  switchVehicle(id: number) {
    if (!['running', 'ready'].includes(this.status)) return false;
    const next = this.units.find(u => u.id === id && u.team === 'blue' && u.hp > 0);
    if (!next || id === this.selectedId) return false;
    this.player.brain = '留守掩护'; this.player.speed = 0; this.selectedId = id; next.brain = '玩家';
    this.emit({ kind: 'switch', unit: id, x: next.x, z: next.z, text: `接管 ${VEHICLES[next.kind].name} · 保留车辆状态` }); return true;
  }
  callAirstrike(target: Point, team: Team = 'blue') {
    if (this.status !== 'running' || (team === 'blue' && this.airCooldown > 0)) return false;
    if (!Number.isFinite(target.x) || !Number.isFinite(target.z)) return false;
    if (team === 'blue' && this.mission && !this.mission.canAirstrike(this, target)) return false;
    const p = { x: clamp(target.x, -BOUNDS.x, BOUNDS.x), z: clamp(target.z, -BOUNDS.z, BOUNDS.z) };
    this.airstrikes.push({ ...p, id: this.nextRaid++, team, age: 0, dropped: 0 });
    if (team === 'blue') { this.airCooldown = AIR_COOLDOWN; if (this.mission) this.mission.charges--; }
    this.emit({ kind: 'airstrike', unit: team === 'blue' ? this.selectedId : -1, ...p,
      text: team === 'blue' ? '蓝队 P-51 已接收坐标 · 5 秒后炸弹落地' : '红队空袭预警！离开红色标记区' }); return true;
  }
  private emit(e: Omit<BattleEvent, 'time'>) {
    const event = { ...e, time: this.time }; this.events.push(event); this.history.push(event);
    if (this.history.length > 180) this.history.shift();
  }
  lineClear(a: Point, b: Point) { return !COVERS.some(c => segmentBox(a, b, c) !== null); }
  private move(u: Unit, throttle: number, steer: number, dt: number) {
    const profile = VEHICLES[u.kind], target = throttle * (u.team === 'red' ? 4 : profile.speed);
    u.speed += clamp(target - u.speed, -9 * dt, 9 * dt);
    const turn = steer * (u.team === 'red' ? 1.1 : profile.turn) * dt; u.heading += turn; u.turn += turn;
    const ox = u.x, oz = u.z, step = u.speed * dt, radius = profile.radius;
    u.x += Math.sin(u.heading) * step; u.z += Math.cos(u.heading) * step;
    for (let pass = 0; pass < 3; pass++) for (const c of COVERS) {
      const nx = clamp(u.x, c.x - c.w / 2, c.x + c.w / 2), nz = clamp(u.z, c.z - c.d / 2, c.z + c.d / 2);
      let dx = u.x - nx, dz = u.z - nz, d = Math.hypot(dx, dz); if (d >= radius) continue;
      if (d < 1e-8) { u.x = ox; u.z = oz; u.speed = 0; continue; }
      dx /= d; dz /= d; u.x += dx * (radius - d); u.z += dz * (radius - d);
    }
    u.x = clamp(u.x, -BOUNDS.x + radius, BOUNDS.x - radius); u.z = clamp(u.z, -BOUNDS.z + radius, BOUNDS.z - radius);
    for (const other of this.units) if (other !== u && other.hp > 0) {
      const d = dist(u, other), min = radius + VEHICLES[other.kind].radius;
      if (d < min) { const a = d > 1e-8 ? Math.atan2(u.x - other.x, u.z - other.z) : u.heading + Math.PI; u.x = other.x + Math.sin(a) * min; u.z = other.z + Math.cos(a) * min; }
    }
    const travel = Math.hypot(u.x - ox, u.z - oz); u.distance += travel * Math.sign(u.speed);
    u.stuck = Math.abs(step) > 0.02 && travel < Math.abs(step) * 0.3 ? u.stuck + dt : Math.max(0, u.stuck - dt);
  }
  private shoot(u: Unit | Infantry) {
    if (u.reload > 0 || u.hp <= 0 || (this.mission && u.team === 'blue' && u.ammo <= 0)) return;
    const vehicle = 'kind' in u, p = vehicle ? VEHICLES[u.kind] : null; if (p?.damage === 0) return;
    if (this.mission && u.team === 'blue') u.ammo--;
    const angle = vehicle ? u.aim : u.heading, local = vehicle ? { x: 0, z: p!.muzzle, y: p!.height } : this.infantryMuzzle;
    const start = { x: u.x + Math.sin(angle) * local.z + Math.cos(angle) * local.x,
      z: u.z + Math.cos(angle) * local.z - Math.sin(angle) * local.x };
    u.reload = vehicle ? (u.team === 'red' ? this.difficulty === 'casual' ? 4.8 : 3.3 : p!.reload) : 1.1 + (u.id % 3) * 0.15;
    if (!vehicle) u.firing = 0.18;
    const damage = vehicle ? u.team === 'red' ? this.difficulty === 'casual' ? 9 : 18 : p!.damage : 12;
    this.emit({ kind: vehicle ? 'shot' : 'rifle', unit: u.id, y: local.y, ...start,
      text: vehicle ? `${u.team === 'blue' ? '蓝' : '红'}队 ${VEHICLES[(u as Unit).kind].name} 开火` : `${u.team === 'blue' ? '蓝' : '红'}队步兵交火` });
    const obstacle = COVERS.map(c => ({ c, t: segmentBox(u, start, c) })).filter(i => i.t !== null).sort((a, b) => a.t! - b.t!)[0];
    if (obstacle) { this.emit({ kind: 'blocked', unit: u.id, x: u.x + (start.x - u.x) * obstacle.t!, z: u.z + (start.z - u.z) * obstacle.t!, text: '射击被掩体阻挡' }); return; }
    this.shells.push({ id: this.nextShell++, owner: u.id, team: u.team, weapon: vehicle ? 'cannon' : 'rifle', y: local.y,
      damage, ...start, vx: Math.sin(angle) * (vehicle ? 65 : 90), vz: Math.cos(angle) * (vehicle ? 65 : 90), life: vehicle ? 1.5 : 0.3 });
  }
  private hit(victim: Unit | Infantry, amount: number, owner: number, point: Point, bomb = false) {
    const protection = this.mission && !('kind' in victim) && this.mission.protectedPost(victim) ? 0.6 : 1;
    const damage = Math.max(1, Math.round(amount * protection)); victim.hp = Math.max(0, victim.hp - damage);
    this.emit({ kind: 'hit', unit: owner, target: victim.id, x: point.x, z: point.z, y: 'kind' in victim ? 1.7 : 1.1,
      text: `${victim.team === 'blue' ? '蓝' : '红'}队${'kind' in victim ? '车辆' : '步兵'}受${bomb ? '空袭' : '击'} · −${damage}` });
    if (!victim.hp) {
      victim.speed = 0; if (victim.team === 'red') { if ('kind' in victim) this.kills++; else this.infantryKills++; }
      this.emit({ kind: 'destroyed', unit: victim.id, x: victim.x, z: victim.z, text: `${victim.team === 'blue' ? '蓝' : '红'}队${'kind' in victim ? VEHICLES[victim.kind].name : '步兵'}退出演习` });
    }
  }
  private vehicleAI(u: Unit, dt: number) {
    const enemies = this.combatants.filter(v => v.team !== u.team && v.hp > 0 && (!this.mission || u.team === 'red' || this.mission.visible(this, v)));
    const targetUnit = enemies.filter(v => this.lineClear(u, v)).sort((a, b) => dist(u, a) - dist(u, b))[0] ?? enemies[0];
    if (!targetUnit) return;
    const visible = this.lineClear(u, targetUnit), distance = dist(u, targetUnit);
    const goal = this.mission ? AIRPORT.headquarters : GOAL;
    let target: Point = u.team === 'blue' || (visible && distance < 21) ? { x: u.x, z: u.z } : { x: goal.x + (u.id - 2) * (this.mission ? 3 : 5), z: goal.z - (this.mission ? 0 : 2) };
    if (u.team === 'red' && !visible && distance < 22) target = { x: targetUnit.x + (u.id % 2 ? 7 : -7), z: targetUnit.z - 6 };
    const blocking = !navigable(u, target);
    if (blocking) {
      let route = this.routes.get(u.id);
      if (!route || this.time > route.until || dist(route.target, target) > 3) { route = { path: findPath(u, target), target: { ...target }, until: this.time + 1 }; this.routes.set(u.id, route); }
      const waypoint = [...route.path].reverse().find(p => navigable(u, p) && dist(u, p) > 0.4); if (waypoint) target = waypoint;
    }
    const bearing = dist(u, target) > 0.5 ? Math.atan2(target.x - u.x, target.z - u.z) : u.heading, error = angleDelta(bearing, u.heading);
    const throttle = u.team === 'red' && dist(u, target) > (blocking ? 0.5 : 1) ? (u.stuck > 0.8 ? -0.65 : Math.abs(error) < 1 ? 0.8 : 0.15) : 0;
    this.move(u, throttle, u.team === 'red' ? clamp(error * 1.8, -1, 1) : 0, dt);
    const aim = Math.atan2(targetUnit.x - u.x, targetUnit.z - u.z); u.aim = toward(u.aim, aim, 1.7 * dt);
    u.brain = u.team === 'blue' ? '自主掩护' : visible && distance < 43 ? '瞄准交战' : blocking ? '绕行掩体' : '争夺通信区';
    if (visible && distance < 43 && Math.abs(angleDelta(u.aim, aim)) < 0.065 && u.reload <= 0 && (u.team === 'red' || this.time >= u.assistReadyAt)) { this.shoot(u); if (u.team === 'blue') u.assistReadyAt = this.time + 4.2; }
  }
  private infantryAI(u: Infantry, dt: number) {
    u.reload = Math.max(0, u.reload - dt); u.firing = Math.max(0, u.firing - dt);
    // 优先压制对方步兵；步枪可以伤害车辆，但对装甲只产生少量伤害。
    const enemies = this.combatants.filter(v => v.hp > 0 && v.team !== u.team && dist(u, v) < 24 && this.lineClear(u, v) && (!this.mission || u.team === 'red' || this.mission.visible(this, v)));
    enemies.sort((a, b) => Number('kind' in a) - Number('kind' in b) || dist(u, a) - dist(u, b));
    const enemy = enemies[0], ordered = !!this.mission && u.team === 'blue', goal = this.mission ? AIRPORT.headquarters : GOAL;
    let target: Point = ordered ? this.mission!.target(u, this) : { x: goal.x + (u.id % 3 - 1) * 1.7, z: goal.z + (u.id % 2 ? 2 : -2) };
    if (!ordered && enemy && dist(u, enemy) < 17) target = u;
    if (ordered && !navigable(u, target, 0.35)) {
      let route = this.routes.get(u.id);
      if (!route || this.time > route.until || dist(route.target, target) > 2) { route = { path: findPath(u, target, 0.35), target: { ...target }, until: this.time + 1.5 }; this.routes.set(u.id, route); }
      const next = [...route.path].reverse().find(p => navigable(u, p, 0.35) && dist(u, p) > 0.5); if (next) target = next;
    }
    const bearing = enemy && (!ordered || dist(u, target) <= 0.7) && dist(u, enemy) < 17 ? Math.atan2(enemy.x - u.x, enemy.z - u.z) : Math.atan2(target.x - u.x, target.z - u.z);
    u.heading = toward(u.heading, bearing, 4 * dt);
    let vx = Math.sin(u.heading), vz = Math.cos(u.heading), speed = dist(u, target) > (ordered ? 0.7 : 0.6) ? 1.55 : 0;
    // 小半径绕障候选；步兵可通过战车无法穿过的窄处，整段检测避免穿箱子。
    const blocked = (x: number, z: number) => COVERS.some(c => segmentBox(u, { x, z }, c, 0.35) !== null);
    if (speed && blocked(u.x + vx * 0.8, u.z + vz * 0.8)) {
      const turn = [Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2].find(a => !blocked(u.x + Math.sin(u.heading + a) * 0.8, u.z + Math.cos(u.heading + a) * 0.8));
      if (turn === undefined) speed = 0; else { u.heading += turn; vx = Math.sin(u.heading); vz = Math.cos(u.heading); }
    }
    const ox = u.x, oz = u.z; if (!blocked(u.x + vx * speed * dt, u.z + vz * speed * dt)) { u.x += vx * speed * dt; u.z += vz * speed * dt; }
    for (const v of this.units) if (v.hp > 0 && dist(u, v) < VEHICLES[v.kind].radius + 0.4) {
      const a = Math.atan2(u.x - v.x, u.z - v.z), r = VEHICLES[v.kind].radius + 0.4;
      const x = v.x + Math.sin(a) * r, z = v.z + Math.cos(a) * r;
      if (!blocked(x, z)) { u.x = x; u.z = z; }
    }
    u.x = clamp(u.x, -31.5, 31.5); u.z = clamp(u.z, -21.5, 21.5);
    u.speed = dist(u, { x: ox, z: oz }) / dt; u.distance += u.speed * dt;
    if (u.speed > 0.1) u.phase += dt * Math.PI * 2 * Math.min(1.5, u.speed / 1.2);
    u.brain = ordered ? `${this.mission!.squads.find(s => s.members.includes(u.id))!.name} · ${u.speed > 0.2 ? '执行移动' : enemy ? '驻守交火' : '驻守'}` : enemy && dist(u, enemy) < 17 ? '步兵交火' : '接近通信区';
    if (enemy && u.speed < 0.2 && Math.abs(angleDelta(bearing, u.heading)) < 0.08) this.shoot(u);
  }
  private updateAir(dt: number) {
    this.airCooldown = Math.max(0, this.airCooldown - dt);
    if (this.time >= this.nextEnemyRaid) { this.callAirstrike(this.player, 'red'); this.nextEnemyRaid += this.difficulty === 'casual' ? 32 : 24; }
    for (const raid of this.airstrikes) {
      raid.age += dt;
      while (raid.dropped < 3 && raid.age >= 3.4 + raid.dropped * 0.15) {
        const n = raid.dropped++, direction = raid.team === 'blue' ? 1 : -1;
        this.bombs.push({ id: this.nextShell++, raid: raid.id, team: raid.team, x: raid.x + (n - 1) * 2.4,
          z: raid.z + direction * (-28.75 + n * 3.75), y: 16.2, vy: 0, vz: direction * 14 });
      }
    }
    this.airstrikes = this.airstrikes.filter(r => r.age < 9);
    this.bombs = this.bombs.filter(b => {
      b.vy -= 9.8 * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      if (b.y > 0) return true;
      this.emit({ kind: 'bomb', unit: -1, x: b.x, z: b.z, y: 0.1, text: `${b.team === 'blue' ? '蓝' : '红'}队炸弹落地` });
      for (const v of this.combatants) if (v.hp > 0 && v.team !== b.team && dist(v, b) <= AIR_RADIUS) {
        const cover = !this.lineClear(b, v) ? 0.25 : 1, base = b.team === 'red' ? this.difficulty === 'casual' ? 30 : 48 : 65;
        this.hit(v, base * (1 - dist(v, b) / (AIR_RADIUS * 1.5)) * cover, -1, v, true);
      }
      return false;
    });
  }
  update(dt: number, input: Input) {
    if (this.status !== 'running') return; dt = clamp(dt, 0, 1 / 30); if (!dt) return; this.time += dt;
    for (const u of this.units) if (u.hp > 0) {
      u.reload = Math.max(0, u.reload - dt);
      if (u.id === this.selectedId) { u.aim = toward(u.aim, Math.atan2(input.aim.x - u.x, input.aim.z - u.z), 2.4 * dt); this.move(u, input.throttle, input.steer, dt); if (input.fire) this.shoot(u); }
      else this.vehicleAI(u, dt);
    }
    for (const u of this.infantry) if (u.hp > 0) this.infantryAI(u, dt);
    this.shells = this.shells.filter(s => {
      const next = { x: s.x + s.vx * dt, z: s.z + s.vz * dt }; let nearest = 2, victim: Unit | Infantry | undefined;
      for (const c of COVERS) { const t = segmentBox(s, next, c); if (t !== null && t < nearest) { nearest = t; victim = undefined; } }
      for (const u of this.combatants) if (u.hp > 0 && u.team !== s.team) {
        const t = segmentCircle(s, next, u, 'kind' in u ? u.kind === 'jeep' ? 0.9 : 1.65 : 0.4);
        if (t !== null && t < nearest) { nearest = t; victim = u; }
      }
      if (nearest <= 1) {
        const impact = { x: s.x + (next.x - s.x) * nearest, z: s.z + (next.z - s.z) * nearest };
        if (victim) {
          this.hit(victim, s.damage * (s.weapon === 'rifle' && 'kind' in victim ? victim.kind === 'jeep' ? 0.5 : 0.08 : 1), s.owner, impact);
          // 主炮小范围溅射能清理密集步兵；掩体依然挡住碎片。
          if (s.weapon === 'cannon') for (const soldier of this.infantry) if (soldier !== victim && soldier.hp > 0 && soldier.team !== s.team && dist(soldier, impact) < 2.5 && this.lineClear(impact, soldier)) this.hit(soldier, 25, s.owner, soldier);
        } else this.emit({ kind: 'blocked', unit: s.owner, ...impact, y: s.y, text: '射击被掩体阻挡' });
        return false;
      }
      Object.assign(s, next); s.life -= dt; return s.life > 0 && Math.abs(s.x) < 50 && Math.abs(s.z) < 42;
    });
    this.updateAir(dt);
    if (this.player.hp <= 0) {
      const next = this.units.find(u => u.team === 'blue' && u.hp > 0);
      if (next) this.switchVehicle(next.id);
    }
    if (this.mission) {
      const outcome = this.mission.step(this, dt);
      if (!this.units.some(u => u.team === 'blue' && u.hp > 0)) { this.mission.failure = '蓝队全部车辆失去行动能力'; this.finish(false); }
      else if (outcome) this.finish(outcome === 'won');
      return;
    }
    const inZone = dist(this.player, GOAL) <= GOAL.radius;
    this.contested = this.combatants.some(u => u.team === 'red' && u.hp > 0 && dist(u, GOAL) <= GOAL.radius + ('kind' in u ? VEHICLES[u.kind].radius : 0.4));
    if (inZone && !this.contested && this.player.hp > 0) this.captured = Math.min(GOAL.seconds, this.captured + dt);
    else if (!inZone) this.captured = Math.max(0, this.captured - dt * 0.5);
    if (!this.units.some(u => u.team === 'blue' && u.hp > 0) || this.time >= LIMIT) this.finish(false);
    else if ((this.kills === 3 && this.infantryKills === 6) || this.captured >= GOAL.seconds) this.finish(true);
  }
  private finish(won: boolean) {
    this.status = won ? 'won' : 'lost'; this.shells = []; this.bombs = [];
    this.emit({ kind: won ? 'won' : 'lost', unit: this.selectedId, x: this.player.x, z: this.player.z,
      text: this.mission ? won ? '机场补给与警戒恢复，任务完成！' : this.mission.failure : won ? this.captured >= GOAL.seconds ? '通信区占领完成，演习胜利！' : '红队装甲与步兵全部退出，演习胜利！' : this.time >= LIMIT ? '演习时间耗尽' : '蓝队全部车辆失去行动能力' });
  }
  drain() { const events = this.events; this.events = []; return events; }
  snapshot() { return { mode: this.mode, mission: this.mission?.snapshot() ?? null, status: this.status, difficulty: this.difficulty, time: this.time, captured: this.captured, contested: this.contested,
    kills: this.kills, infantryKills: this.infantryKills, selectedId: this.selectedId, airCooldown: this.airCooldown, nextEnemyRaid: this.nextEnemyRaid,
    units: this.units.map(u => ({ ...u })), infantry: this.infantry.map(u => ({ ...u })), shells: this.shells.map(s => ({ ...s })),
    airstrikes: this.airstrikes.map(s => ({ ...s })), bombs: this.bombs.map(s => ({ ...s })), history: this.history.map(e => ({ ...e })) }; }
}
