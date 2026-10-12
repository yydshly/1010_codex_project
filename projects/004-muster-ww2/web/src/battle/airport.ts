import type { Battle, Infantry, Point } from './game';

/** 原创任务配置，坐标沿用既有营地；与渲染无关。 */
export const AIRPORT = {
  limit: 360, headquarters: { x: -11, z: 2, radius: 5 }, depot: { x: -20, z: 12, radius: 4 },
  recon: [{ id: 'north', name: '北侧来袭通道', x: 3, z: -11, radius: 5 }, { id: 'east', name: '东侧来袭通道', x: 24, z: 6, radius: 5 }],
  posts: [{ id: 'alpha', name: '一班 · 路口阵地', x: 3, z: 8, radius: 4 }, { id: 'bravo', name: '二班 · 北侧阵地', x: 3, z: -10, radius: 4 }],
  phases: ['吉普侦察', '部署与补给', '机场防守', '恢复运行'],
} as const;
export type Order = 'hold' | 'move' | 'follow';
export const VISION = { jeep: 32, armor: 28, infantry: 24 } as const;
export interface Squad { id: string; name: string; members: number[]; order: Order; target: Point }
export class AirportMission {
  phase = 0; phaseAt = 0; integrity = 100; cargo = 0; deliveries = 0; headquartersDeliveries = 0;
  charges = 0; wave = 0; nextWaveAt = 0; secure = 0; selectedSquad = 'alpha'; failure = '';
  recon = AIRPORT.recon.map(p => ({ ...p, progress: 0, done: false }));
  squads: Squad[] = [
    { id: 'alpha', name: '一班', members: [100, 101], order: 'hold', target: { x: -7, z: 8 } },
    { id: 'bravo', name: '二班', members: [102, 103], order: 'hold', target: { x: -7, z: 11 } },
  ];
  seen = new Map<number, Point & { time: number }>();
  private range(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.z - b.z); }
  initialize(game: Battle) {
    const starts = [{ id: 0, x: -12, z: 10 }, { id: 4, x: -19, z: 17 }, { id: 5, x: -19, z: 6 }];
    game.selectedId = 5; game.nextEnemyRaid = Infinity;
    for (const u of game.units) {
      const start = starts.find(s => s.id === u.id); if (start) Object.assign(u, start, { heading: Math.PI / 2, aim: Math.PI / 2 });
      else u.hp = 0;
      u.ammo = u.kind === 'jeep' ? 0 : 18;
      if (u.team === 'blue') u.brain = u.id === 5 ? '玩家' : '留守掩护';
    }
    for (const u of game.infantry) { u.ammo = 30; if (u.team === 'red') u.hp = 0; else u.hp = u.maxHp = game.difficulty === 'casual' ? 75 : 55; }
    game.infantry.filter(u => u.team === 'blue').forEach((u, i) => { u.x = -7 + (i % 2) * 1.5; u.z = i < 2 ? 8 : 11; });
  }
  get squad() { return this.squads.find(s => s.id === this.selectedSquad)!; }
  select(id: string) { if (!this.squads.some(s => s.id === id)) return false; this.selectedSquad = id; return true; }
  command(game: Battle, order: Order, target: Point) {
    if (game.status !== 'running' || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return false;
    const members = game.infantry.filter(u => this.squad.members.includes(u.id) && u.hp > 0); if (!members.length) return false;
    this.squad.order = order;
    this.squad.target = order === 'hold' ? { x: members.reduce((s, u) => s + u.x, 0) / members.length, z: members.reduce((s, u) => s + u.z, 0) / members.length } : { ...target };
    game.notify('command', `${this.squad.name}：${order === 'move' ? '移动到标记点' : order === 'follow' ? '跟随当前驾驶车辆' : '就地驻守'}`, this.squad.target);
    return true;
  }
  target(u: Infantry, game: Battle): Point {
    const squad = this.squads.find(s => s.members.includes(u.id))!;
    const i = squad.members.indexOf(u.id), dx = i ? 0.8 : -0.8;
    if (squad.order === 'follow') {
      const p = game.player, h = p.heading;
      return { x: p.x - Math.sin(h) * 4.5 + Math.cos(h) * dx * 2, z: p.z - Math.cos(h) * 4.5 - Math.sin(h) * dx * 2 };
    }
    return { x: squad.target.x + dx, z: squad.target.z };
  }
  visible(game: Battle, target: Point) {
    return game.combatants.some(u => u.team === 'blue' && u.hp > 0 && this.range(u, target) <= ('kind' in u ? u.kind === 'jeep' ? VISION.jeep : VISION.armor : VISION.infantry) && game.lineClear(u, target));
  }
  canAirstrike(game: Battle, target: Point) { return this.phase >= 2 && this.charges > 0 && this.visible(game, target); }
  protectedPost(u: Infantry) { return u.team === 'blue' && u.speed < 0.2 && AIRPORT.posts.some(p => this.range(u, p) <= p.radius); }
  interact(game: Battle) {
    if (game.status !== 'running' || game.player.kind !== 'jeep' || game.player.hp <= 0) return false;
    if (Math.abs(game.player.speed) > 1.5) { game.notify('supply', '请先停车，再装卸补给', game.player); return false; }
    if (this.range(game.player, AIRPORT.depot) <= AIRPORT.depot.radius) {
      if (this.cargo === 2) return false;
      this.cargo = 2; game.notify('supply', '吉普已装载 2 箱补给 · 前往机场或蓝色阵地', game.player); return true;
    }
    const hq = this.range(game.player, AIRPORT.headquarters) <= AIRPORT.headquarters.radius;
    const post = AIRPORT.posts.find(p => this.range(game.player, p) <= p.radius);
    if (!this.cargo || (!hq && !post)) return false;
    this.cargo--; this.deliveries++;
    if (hq) { this.headquartersDeliveries++; this.integrity = Math.min(100, this.integrity + 20); }
    const restored: number[] = [];
    for (const u of game.combatants) if (u.team === 'blue' && u.hp > 0 && this.range(u, game.player) <= 12) {
      u.hp = Math.min(u.maxHp, u.hp + ('kind' in u ? 70 : 22)); u.ammo = 'kind' in u ? u.kind === 'jeep' ? 0 : 18 : 30; restored.push(u.id);
    }
    game.notify('supply', `${hq ? '机场' : post!.name}收到补给 · 修复与补弹 ${restored.length} 个单位`, game.player); return true;
  }
  interactionHint(game: Battle) {
    if (game.player.kind !== 'jeep') return '切换吉普 3 · 装货与送货 E';
    if (this.range(game.player, AIRPORT.depot) <= AIRPORT.depot.radius) return Math.abs(game.player.speed) > 1.5 ? '停车后按 E 装货' : `装货 E · ${this.cargo} / 2 箱`;
    if (this.cargo && [AIRPORT.headquarters, ...AIRPORT.posts].some(p => this.range(game.player, p) <= p.radius)) return Math.abs(game.player.speed) > 1.5 ? '停车后按 E 卸货' : '卸货 E · 修复附近友军与补弹';
    return this.cargo ? `已载 ${this.cargo} 箱 · 送到机场 / 蓝色阵地` : '前往补给站 D · 按 E 装载';
  }
  private enter(game: Battle, phase: number) {
    this.phase = phase; this.phaseAt = game.time;
    game.notify('mission', `阶段 ${phase + 1} / 4 · ${AIRPORT.phases[phase]}`, AIRPORT.headquarters);
  }
  private spawn(game: Battle) {
    this.wave++; this.nextWaveAt = 0;
    const north = this.wave === 2;
    const cars = north ? [[20, -11], [28, -7], [27, 7]] : [[24, 7], [28, -11]];
    game.units.filter(u => u.team === 'red').forEach((u, i) => {
      u.hp = cars[i] ? (game.difficulty === 'casual' ? 65 : 95) : 0; u.maxHp = u.hp || 65;
      if (cars[i]) Object.assign(u, { x: cars[i][0], z: cars[i][1], heading: -Math.PI / 2, aim: -Math.PI / 2, speed: 0, reload: 5 + i * 1.2, stuck: 0 });
    });
    game.infantry.filter(u => u.team === 'red').forEach((u, i) => {
      u.hp = i < (north ? 6 : 4) ? 30 : 0; u.maxHp = 30; u.x = north ? 9 + i * 2 : 22 + (i % 2) * 2; u.z = north ? -15 : 4 + Math.floor(i / 2) * 3; u.reload = 2 + i * 0.3; u.speed = 0;
    });
    game.clearRoutes(); game.nextEnemyRaid = game.time + (north ? 17 : 26);
    game.notify('mission', `第 ${this.wave} / 2 波来袭 · ${cars.length} 辆装甲、${north ? 6 : 4} 名步兵`, AIRPORT.headquarters);
  }
  step(game: Battle, dt: number) {
    for (const u of game.combatants) if (u.team === 'red' && u.hp > 0 && this.visible(game, u)) this.seen.set(u.id, { x: u.x, z: u.z, time: game.time });
    if (this.phase === 0) {
      const jeep = game.units.find(u => u.id === 5)!;
      for (const p of this.recon) if (!p.done) {
        if (game.selectedId === 5 && jeep.hp > 0 && this.range(jeep, p) <= p.radius && Math.abs(jeep.speed) < 2) p.progress += dt;
        else p.progress = Math.max(0, p.progress - dt);
        if (p.progress >= 2) { p.done = true; game.notify('recon', `${p.name}已侦察 · 来袭方向已标明`, p); }
      }
      if (this.recon.every(p => p.done)) this.enter(game, 1);
    } else if (this.phase === 1) {
      const deployed = AIRPORT.posts.every(p => game.infantry.some(u => u.hp > 0 && this.squads.find(s => s.id === p.id)!.members.includes(u.id) && this.range(u, p) <= p.radius));
      if (deployed && this.headquartersDeliveries >= 1) { this.enter(game, 2); this.charges = 2; this.spawn(game); }
    } else if (this.phase === 2) {
      const invaders = game.combatants.filter(u => u.hp > 0 && u.team === 'red' && this.range(u, AIRPORT.headquarters) <= AIRPORT.headquarters.radius + 1);
      game.contested = invaders.length > 0; if (game.contested) this.integrity = Math.max(0, this.integrity - dt * (game.difficulty === 'casual' ? 4 : 7));
      const live = game.combatants.some(u => u.team === 'red' && u.hp > 0);
      if (!live) {
        game.nextEnemyRaid = Infinity;
        if (this.wave === 2 && !game.bombs.length && !game.airstrikes.some(r => r.team === 'red')) this.enter(game, 3);
        else if (this.wave === 1 && !this.nextWaveAt) { this.nextWaveAt = game.time + 10; game.notify('mission', '第一波已击退 · 10 秒后第二波，及时送补给', AIRPORT.headquarters); }
        else if (this.wave === 1 && game.time >= this.nextWaveAt) this.spawn(game);
      }
    } else {
      const guard = game.infantry.some(u => u.team === 'blue' && u.hp > 0 && this.range(u, AIRPORT.headquarters) <= AIRPORT.headquarters.radius);
      game.contested = false;
      if (guard && this.headquartersDeliveries >= 2) this.secure = Math.min(8, this.secure + dt); else this.secure = 0;
    }
    if (game.time >= AIRPORT.limit) this.failure = '任务时间耗尽';
    else if (this.integrity <= 0) this.failure = '机场通信站已失守';
    else if (!game.infantry.some(u => u.team === 'blue' && u.hp > 0)) this.failure = '两个步兵小队均失去行动能力';
    else if (game.units.find(u => u.id === 5)!.hp <= 0 && (this.phase < 2 || this.headquartersDeliveries < 2)) this.failure = '补给吉普失效，任务补给无法完成';
    return this.failure ? 'lost' : this.secure >= 8 ? 'won' : null;
  }
  snapshot() { return { phase: this.phase, phaseAt: this.phaseAt, integrity: this.integrity, cargo: this.cargo, deliveries: this.deliveries, headquartersDeliveries: this.headquartersDeliveries, charges: this.charges, wave: this.wave, nextWaveAt: this.nextWaveAt, secure: this.secure, selectedSquad: this.selectedSquad, failure: this.failure, recon: this.recon.map(p => ({ ...p })), squads: this.squads.map(s => ({ ...s, members: [...s.members], target: { ...s.target } })), seen: [...this.seen].map(([id, p]) => ({ id, ...p })) }; }
}
