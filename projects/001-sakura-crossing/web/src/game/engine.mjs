// Original local game rules. Models select only the bounded actions below.
export const PLACES = {
  shop: { x: -10, z: -3.3, name: '柚子杂货铺' },
  west: { x: -7, z: 2, name: '西街花灯' },
  plaza: { x: 0, z: -3, name: '广场花灯' },
  east: { x: 7, z: 2, name: '东街花灯' },
  player: { x: 0, z: 9, name: '你的位置' },
};
export const BUILDINGS = [
  { x: -10, z: -7.5, width: 5.5, depth: 5 }, { x: 10, z: -7.5, width: 5, depth: 5 },
  { x: -10, z: 10, width: 5, depth: 4 }, { x: 10, z: 10, width: 5, depth: 4 },
];
const goals = ['shop', 'west', 'plaza', 'east', 'player'];
const tasks = ['fetch', 'repair', 'guard', 'follow', 'wait'];
const speech = { type: 'string', maxLength: 150 };
const assignmentChoice = (allowedTasks,allowedGoals) => ({ type:'object',additionalProperties:false,properties:{
  goal:{enum:allowedGoals},task:{enum:allowedTasks},say:speech,
},required:['goal','task','say'] });
const assignment = { anyOf:[assignmentChoice(['fetch'],['shop']),assignmentChoice(['follow'],['player']),
  assignmentChoice(['repair','guard'],['west','plaza','east']),assignmentChoice(['wait'],goals)] };
export const townSchema = { type: 'object', additionalProperties: false, properties: {
  title: speech, why: speech,
  coach: { type: 'object', additionalProperties: false, properties: { goal: { enum: goals }, advice: speech }, required: ['goal', 'advice'] },
  companion: assignment, shopkeeper: assignment, guard: assignment,
  rivals: { type: 'object', additionalProperties: false, properties: { goal: { enum: ['west', 'plaza', 'east'] }, tactic: { enum: ['steal', 'distract', 'retreat'] }, say: speech }, required: ['goal', 'tactic', 'say'] },
  director: { type: 'object', additionalProperties: false, properties: { weather: { enum: ['calm', 'gust', 'mist', 'fireflies'] }, duration: { type: 'integer', minimum: 12, maximum: 35 }, announcement: speech }, required: ['weather', 'duration', 'announcement'] },
}, required: ['title', 'why', 'coach', 'companion', 'shopkeeper', 'guard', 'rivals', 'director'] };
export const SYSTEM = `你是温暖的3D小镇游戏「樱街守灯夜」的场景导演。只输出符合schema的JSON，所有台词和建议用简洁中文。你同时扮演教练、队友阿澄、店主柚子、巡街人晴、纸灵和天气导演，分工彼此协调。根据玩家实际走位、物资、花灯与最近行动调整；优先执行玩家明确的分工请求。你的选择会改变真实角色走路、领油、修灯、守灯以及天气。动作能力：fetch在shop领取2份油，repair走到west/plaza/east消耗1油、2.2秒点灯，无油会先去shop；guard走到目标守卫并阻止纸灵；follow跟随玩家；wait原地等待。柚子也能离店送油修灯，晴也能修灯，所有居民油不足均可补给。player目标仅用于follow。纸灵steal会去指定花灯尝试偷油，distract会在目标周围盘旋，retreat会退到街口；不要总让纸灵退却。gust减慢移动并让未被守护的亮灯缓慢损油；mist降能见度；fireflies显示萤火。天气有持续时间。教练只提示玩家下一步，不自动操控玩家。三灯同时点亮并守住20秒即获胜，240秒未完成失败。根据局势保持可玩、可理解，不无故抢走玩家全部工作。why只是面向玩家的一句话依据，不输出内部推理。`;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clone = value => structuredClone(value);
export function walkable(x, z) {
  return Number.isFinite(x) && Number.isFinite(z) && Math.abs(x) <= 14.5 && Math.abs(z) <= 12.7
    && !BUILDINGS.some(b => Math.abs(x - b.x) < b.width / 2 + .45 && Math.abs(z - b.z) < b.depth / 2 + .45);
}
export function route(from, to) {
  if (!walkable(to.x, to.z)) return [];
  const key = (x, z) => `${x},${z}`;
  const grid = a => ({ x: Math.max(-14,Math.min(14,Math.round(a.x))), z: Math.max(-12,Math.min(12,Math.round(a.z))) });
  const start = grid(from), end = grid(to);
  const queue = [{ ...start, cost: 0, score: distance(start, end) }], seen = new Map([[key(start.x, start.z), 0]]), parent = new Map();
  let found;
  while (queue.length && seen.size < 1000) {
    queue.sort((a, b) => a.score - b.score); const n = queue.shift();
    if (n.x === end.x && n.z === end.z) { found = n; break; }
    for (const [dx, dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x = n.x + dx, z = n.z + dz, k = key(x, z), cost = n.cost + 1;
      if (!walkable(x, z) || cost >= (seen.get(k) ?? Infinity)) continue;
      seen.set(k, cost); parent.set(k, n); queue.push({ x, z, cost, score: cost + distance({ x, z }, end) });
    }
  }
  if (!found) return [];
  const points = [{ x: to.x, z: to.z }]; let n = found;
  while (n && !(n.x === start.x && n.z === start.z)) { points.unshift({ x: n.x, z: n.z }); n = parent.get(key(n.x, n.z)); }
  return points;
}
function actor(id, name, x, z, oil) { return { id, name, x, z, oil, task: 'wait', goal: 'plaza', path: [], job: null, say: '', actions: 0 }; }
export function createGame(id, mode = 'rules') {
  return { id, mode, phase: 'ready', paused: false, time: 0, stable: 0, supply: 30, calls: 0, nextPlan: 0, pending: false, error: '',
    actors: { player: actor('player', '你', 0, 9, 2), companion: actor('companion', '阿澄', -1.2, 7.5, 1), shopkeeper: actor('shopkeeper', '柚子', -10, -3.3, 2), guard: actor('guard', '晴', 1.2, -1, 1) },
    lanterns: ['west','plaza','east'].map(id => ({ id, ...PLACES[id], charge: 0, progress: 0 })),
    spirits: [{ id: 'paper1', x: -13, z: 0, cooldown: 10 }, { id: 'paper2', x: 13, z: 0, cooldown: 17 }],
    rivals: { goal: 'west', tactic: 'steal', say: '悄悄借一点灯油……' },
    weather: { kind: 'calm', until: 0, announcement: '花灯节马上开始' }, coach: { goal: 'west', advice: '你先去西街点灯，阿澄会照看东街。' },
    journal: [], decisions: [], telemetry: [], startedAt: new Date().toISOString(), lastRequestAt: 0, lastTickAt: Date.now(),
  };
}
export function log(g, who, text, type = 'action') {
  g.journal.push({ time: +g.time.toFixed(1), who, text, type }); g.journal = g.journal.slice(-180);
}
function destination(g, goal) { return goal === 'player' ? g.actors.player : PLACES[goal]; }
function setPath(g, a, goal) { const target = destination(g, goal); a.path = route(a, target); a.goal = goal; }
export function movePlayer(g, x, z) {
  if (g.phase !== 'playing' || g.paused || !walkable(x, z)) return false;
  const a = g.actors.player; a.job = null; a.path = route(a, { x, z });
  log(g, '你', `走向 (${x.toFixed(1)}, ${z.toFixed(1)})`, 'move'); return true;
}
function beginRepair(g, a, lamp) {
  if (a.oil < 1) { log(g, a.name, '灯油用完了，先到杂货铺领油'); return false; }
  if (lamp.charge >= 2.8) { log(g, a.name, `${lamp.name}已经亮着`); return false; }
  a.job = { lamp: lamp.id, remaining: 2.2 }; a.path = []; log(g, a.name, `正在点亮${lamp.name}`); return true;
}
function fetchOil(g, a) {
  const count = Math.min(2, 4 - a.oil, g.supply); if (count <= 0) return false;
  a.oil += count; g.supply -= count; a.actions++; log(g, a.name, `从杂货铺领取${count}份灯油`); return true;
}
export function interact(g, target) {
  if (g.phase !== 'playing' || g.paused) return false;
  const a = g.actors.player, place = PLACES[target];
  if (!place || target === 'player') return false;
  if (distance(a, place) > 2) { log(g, '你', `还太远，走近${place.name}再按 E`); return false; }
  if (target === 'shop') return fetchOil(g, a);
  return beginRepair(g, a, g.lanterns.find(l => l.id === target));
}
export function ward(g) {
  if (g.phase !== 'playing' || g.paused || g.time < (g.wardUntil || 0)) return false;
  g.wardUntil = g.time + 8; g.wardAt = { ...g.actors.player, time: g.time };
  let count = 0; for (const spirit of g.spirits) if (distance(spirit, g.actors.player) < 5) { spirit.cooldown = 8; spirit.x = spirit.x < 0 ? -13 : 13; spirit.z = 0; count++; }
  log(g, '你', `摇铃驱散了${count}只纸灵`); return true;
}
export function validatePlan(p) {
  if (!p || typeof p !== 'object') throw new Error('模型没有返回策略对象');
  const checkText = value => typeof value === 'string' && value.length <= 150;
  if (![p.title,p.why,p.coach?.advice,p.rivals?.say,p.director?.announcement].every(checkText) || !goals.includes(p.coach?.goal)) throw new Error('模型策略中的文字或教练目标不合法');
  for (const role of ['companion','shopkeeper','guard']) {
    const a = p[role]; if (!a || !goals.includes(a.goal) || !tasks.includes(a.task) || !checkText(a.say)) throw new Error(`${role} 的角色指令不合法`);
    if (['repair','guard'].includes(a.task) && !['west','plaza','east'].includes(a.goal)) throw new Error(`${role} 的任务地点不匹配`);
    if (a.task === 'fetch' && a.goal !== 'shop') throw new Error('领油任务必须指向杂货铺');
    if (a.task === 'follow' && a.goal !== 'player') throw new Error('跟随任务必须指向玩家');
  }
  if (!['west','plaza','east'].includes(p.rivals?.goal) || !['steal','distract','retreat'].includes(p.rivals?.tactic)) throw new Error('纸灵指令不合法');
  if (!['calm','gust','mist','fireflies'].includes(p.director?.weather) || !Number.isInteger(p.director.duration) || p.director.duration < 12 || p.director.duration > 35) throw new Error('天气指令不合法');
  return clone(p);
}
export function applyPlan(g, input, source = 'rules') {
  const p = validatePlan(input); g.coach = p.coach; g.rivals = p.rivals;
  g.weather = { kind: p.director.weather, until: g.time + p.director.duration, announcement: p.director.announcement };
  for (const id of ['companion','shopkeeper','guard']) {
    const a = g.actors[id], next = p[id]; a.task = next.task; a.say = next.say; a.fetched = false; a.returnGoal = null;
    // Finish an already-started repair rather than waste the player's resources.
    if (a.job) { a.afterJob = next; } else setPath(g, a, next.goal);
    log(g, a.name, next.say, 'dialogue');
  }
  log(g, source === 'rules' ? '规则调度' : 'AI 导演', `${p.title} · ${p.why}`, 'decision');
  log(g, '场景', p.director.announcement, 'weather');
  return { appliedAt: +g.time.toFixed(2), assignments: Object.fromEntries(['companion','shopkeeper','guard'].map(id => [id, { task: g.actors[id].task, goal: p[id].goal }])), rivals: clone(g.rivals), weather: clone(g.weather), coach: clone(g.coach) };
}
export function rulesPlan(g) {
  const unlit = g.lanterns.find(l => l.charge < 1)?.id || 'plaza';
  return { title: '固定巡街分工', why: '规则按未点亮花灯的固定顺序分工，不理解你的自然语言。',
    coach: { goal: unlit, advice: `前往${PLACES[unlit].name}，按 E 点灯。` },
    companion: { goal: 'east', task: 'repair', say: '我固定负责东街。' },
    shopkeeper: { goal: 'shop', task: 'wait', say: '来店里就可以领油。' },
    guard: { goal: 'plaza', task: 'guard', say: '我一直守着广场。' },
    rivals: { goal: 'west', tactic: 'steal', say: '固定去西街偷油。' },
    director: { weather: 'calm', duration: 35, announcement: '规则模式：天气始终平静。' },
  };
}
function walk(a, target, speed, dt) {
  const d = distance(a, target); if (d < .05) return true;
  const step = Math.min(d, speed * dt); a.x += (target.x - a.x) / d * step; a.z += (target.z - a.z) / d * step; return step === d;
}
export function tick(g, dt) {
  if (g.phase !== 'playing' || g.paused) return;
  dt = Math.min(.25, Math.max(0, dt)); g.time += dt;
  if (g.weather.until <= g.time && g.weather.kind !== 'calm') { g.weather.kind = 'calm'; log(g, '场景', '天气恢复平静', 'weather'); }
  const speed = g.weather.kind === 'gust' ? 2.5 : 3.3;
  for (const a of Object.values(g.actors)) {
    if (a.job) {
      const lamp = g.lanterns.find(l => l.id === a.job.lamp);
      a.job.remaining -= dt; lamp.progress = 1 - Math.max(0, a.job.remaining) / 2.2;
      if (a.job.remaining <= 0) {
        if (a.oil && lamp.charge < 2.8) { a.oil--; lamp.charge = 3; a.actions++; log(g, a.name, `点亮${lamp.name}，消耗1份油`); }
        lamp.progress = 0; a.job = null;
        if (a.afterJob) { a.task = a.afterJob.task; setPath(g,a,a.afterJob.goal); a.afterJob = null; }
      } continue;
    }
    if (a.id !== 'player' && a.task === 'follow' && distance(a,g.actors.player) > 2.3 && !a.path.length) setPath(g,a,'player');
    if (a.path.length) { if (walk(a,a.path[0],speed,dt)) a.path.shift(); continue; }
    if (a.id === 'player' || a.task === 'wait' || a.task === 'guard' || a.task === 'follow') continue;
    if (a.task === 'fetch') { if (distance(a,PLACES.shop) < 1.5 && !a.fetched) { fetchOil(g,a); a.fetched = true; } continue; }
    if (a.task === 'repair') {
      const lamp = g.lanterns.find(l => l.id === a.goal);
      if (!lamp) continue;
      if (a.oil < 1) { a.returnGoal = a.goal; setPath(g,a,'shop'); }
      else if (lamp.charge < 1) beginRepair(g,a,lamp);
    }
  }
  // An automatic supply detour preserves the repair destination.
  for (const a of Object.values(g.actors)) if (a.returnGoal && distance(a,PLACES.shop) < 1.5) {
    fetchOil(g,a); setPath(g,a,a.returnGoal); a.returnGoal = null;
  }
  for (const s of g.spirits) {
    s.cooldown = Math.max(0, s.cooldown - dt);
    if (s.cooldown > 0 || g.rivals.tactic === 'retreat') { walk(s,{ x:s.id === 'paper1' ? -13 : 13,z:0 },2,dt); continue; }
    const lamp = g.lanterns.find(l => l.id === g.rivals.goal);
    const offset = s.id === 'paper1' ? -1 : 1;
    const target = g.rivals.tactic === 'distract' ? { x:lamp.x + Math.cos(g.time * .7 + offset)*3,z:lamp.z+Math.sin(g.time*.7+offset)*3 } : lamp;
    const protectedBy = Object.values(g.actors).find(a => a.task === 'guard' && distance(a,lamp)<2.5);
    if (protectedBy && distance(s,lamp)<4) { s.cooldown = 9; log(g,protectedBy.name,`守住${lamp.name}，纸灵退开`); continue; }
    walk(s,target,1.5,dt);
    if (g.rivals.tactic === 'steal' && distance(s,lamp)<.8 && lamp.charge>0) {
      lamp.charge = Math.max(0,lamp.charge-1); s.cooldown=15; log(g,'纸灵',`偷走${lamp.name}一份灯油`);
    }
  }
  if (g.weather.kind === 'gust') for (const lamp of g.lanterns) {
    if (!Object.values(g.actors).some(a => a.task === 'guard' && distance(a,lamp)<2.5)) lamp.charge=Math.max(0,lamp.charge-dt*.018);
  }
  g.stable = g.lanterns.every(l=>l.charge>0) ? g.stable+dt : 0;
  g.telemetry.push({ time:+g.time.toFixed(1), x:+g.actors.player.x.toFixed(2), z:+g.actors.player.z.toFixed(2), oil:g.actors.player.oil });
  g.telemetry = g.telemetry.filter(t=>g.time-t.time<15);
  if (g.stable >= 20) { g.phase='won'; log(g,'小镇','三街花灯齐亮，守灯成功，花灯节开幕！','result'); }
  else if (g.time>=240) { g.phase='lost'; log(g,'小镇','花灯节延期了。再试一次分工吧。','result'); }
}
export function observation(g, request='') {
  return { time:+g.time.toFixed(1), phase:g.phase, playerRequest:request, stableSeconds:+g.stable.toFixed(1), supply:g.supply,
    actors:Object.fromEntries(Object.entries(g.actors).map(([id,a])=>[id,{ name:a.name,x:+a.x.toFixed(1),z:+a.z.toFixed(1),oil:a.oil,task:a.task,goal:a.goal,repairing:a.job?.lamp||null }])),
    lanterns:clone(g.lanterns), rivals:clone(g.rivals), weather:clone(g.weather), recentActions:g.journal.filter(e=>g.time-e.time<25).slice(-24), playerMovement:g.telemetry.filter((_,i)=>i%10===0),
    memory:g.decisions.slice(-2).map(d=>({ title:d.plan?.title,playerRequest:d.input?.playerRequest,appliedAt:d.application?.appliedAt })) };
}
export function publicState(g) {
  const state=clone(g); delete state.lastTickAt; delete state.controller; delete state.wardAt?.path;
  return state;
}
