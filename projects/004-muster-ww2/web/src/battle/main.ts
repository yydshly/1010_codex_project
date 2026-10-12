import './style.css';
import * as THREE from 'three';
import { Studio } from '../core/studio';
import { loadAssetByPath, getModel } from '../core/registry';
import { defaultConfig } from '../core/types';
import { buildMotionTemplate, MechanicalRig } from '../showcase/rig';
import { bake } from '../core/bake';
import { proceduralMotion, footPose } from '../showcase/motion';
import { CampAudio } from '../showcase/audio';
import { Battle, COVERS, GOAL, BOUNDS, LIMIT, VEHICLES, AIR_WARNING_RADIUS, dist, angleDelta, type Point } from './game';
import { buildBattleWorld, BattleEffects } from './world';
import { AIRPORT, type Order } from './airport';

const airportMode = location.pathname.endsWith('/airport.html');

document.querySelector('#app')!.innerHTML = `
<header><a class="brand" href="./"><b>M</b><span>MUSTER<small>ASSET → PLAY / 004</small></span></a><h1>前线演习</h1><nav class="links"><a href="./">研究首页 ↗</a><a href="./camp.html">动态营地 ↗</a><a href="./archive.html">模型资料库 ↗</a></nav></header>
<main class="stage"><canvas id="battle-canvas" aria-label="营地装甲对战：WASD 驾驶，鼠标瞄准，左键射击" tabindex="0"></canvas></main>
<div class="top-hud"><section class="mission"><div class="eyebrow">OPERATION / FIELD STATION</div><strong>A · 夺取通信区</strong><p>击退红队装甲与步兵，或占领通信区 20 秒。<br>三车切换 · 步兵协同 · P-51 空袭支援。</p><div class="capture-row"><span id="zone-state">进入黄色圆圈开始占领</span><span id="capture">0 / 20 秒</span></div><div class="meter"><i id="capture-fill"></i></div></section><div class="clock"><div><span>演习剩余</span><strong id="clock">03:00</strong></div><div class="counter"><span>红队装甲</span><strong id="kills">0 / 3</strong></div></div></div>
<div class="map-wrap"><canvas class="minimap" id="minimap" width="256" height="192" aria-label="小地图：蓝色为玩家，红色为对手，黄色为通信区"></canvas><div class="map-caption"><span>蓝 / 友军　白圈 / 驾驶　红 / 对手</span></div></div>
<aside class="log"><div class="eyebrow">RADIO / 演习电台</div><div id="log"><p>蓝队战车准备就绪。</p><p>红队采用规则电脑控制。</p></div></aside><section class="support" aria-label="协同战斗"><div class="eyebrow">COMBINED ARMS / 协同战斗</div><div id="infantry-status">步兵 · 蓝 4 / 红 6</div><button id="airstrike" disabled>空袭 F · 鼠标指定落点</button><p id="air-status">P-51 待命 · 标记后约 5 秒落弹</p><div id="raid-alert" hidden role="status">红队空袭预警 · 离开红色标记区</div></section>
<div class="hint-chip" id="hint">WASD 驾驶 · 鼠标瞄准 · 按住左键连续射击</div><div class="target-label" id="target-label">鼠标指向目标</div><div class="damage" id="damage"></div>
<div class="touch-pad" aria-label="触控驾驶"><button class="forward" data-key="KeyW" aria-label="前进">▲</button><button data-key="KeyA" aria-label="左转">◀</button><button data-key="KeyS" aria-label="倒车">▼</button><button data-key="KeyD" aria-label="右转">▶</button><button class="fire" id="touch-fire">开火 · 点地图瞄准</button></div>
<footer class="bottom"><section class="status-panel"><div class="eyebrow">BLUE / 你的驾驶席</div><div class="vehicle-name"><strong id="vehicle-name">M4A3 · 谢尔曼</strong><span id="weapon-name">75 mm</span></div><div class="hp"><div class="stat"><span>装甲耐久</span><output id="hp">220 / 220</output></div><div class="meter"><i id="hp-fill"></i></div></div><div class="reload"><div class="stat"><span id="reload-label">主炮就绪</span><output id="reload">1.35 秒装填</output></div><div class="meter"><i id="reload-fill"></i></div></div></section><section class="vehicle-picker" aria-label="切换驾驶车辆"><button data-vehicle="0"><kbd>1</kbd>谢尔曼<small>装甲 / 75 mm</small><span></span></button><button data-vehicle="4"><kbd>2</kbd>M18<small>机动 / 76 mm</small><span></span></button><button data-vehicle="5"><kbd>3</kbd>吉普<small>侦察 / 无武装</small><span></span></button></section><div class="keys"><div><kbd>W S</kbd>前进 / 倒车　<kbd>A D</kbd>转动车体</div><div><kbd>鼠标</kbd>瞄准　<kbd>左键 / 空格</kbd>开火</div><div><kbd>P / Esc</kbd>暂停　<kbd>C</kbd>俯瞰　滚轮缩放</div></div><div class="command-bar"><label><input type="checkbox" id="sound" checked>声音</label><input type="range" id="volume" min="0" max="100" value="35" aria-label="声音音量"><button id="camera">俯瞰 C</button><button id="pause" disabled>暂停 P</button><button id="restart" disabled>重开</button></div></footer>
<div class="veil" id="veil"><section class="card" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="eyebrow" id="dialog-eyebrow">COMBINED ARMS / LOCAL PLAY</div><h2 id="dialog-title">营地争夺演习</h2><p id="dialog-description">接管蓝队三辆车，与步兵一起争夺营地。红队的 3 辆 M18 与 6 名步兵会争夺通信区，飞机也会发起空袭。按 1/2/3 接管蓝队车辆；鼠标指定落点，按 F 呼叫 P-51。</p><div class="briefing"><div><strong>陆空协同</strong>三车 / 步兵 / 空袭</div><div><strong>03:00</strong>单局限时</div><div><strong>两条胜路</strong>全歼 / 占领</div></div><label class="mode-label" id="mode-row">演习强度<select id="difficulty"><option value="casual">轻松 · 首次驾驶</option><option value="standard">标准 · 提高挑战</option></select></label><p id="result-line" hidden></p><button class="primary" id="start" disabled>正在构建真实模型…</button><button class="secondary" id="dialog-restart" hidden>重新开始</button><p class="footnote" id="footnote">WASD 驾驶 · 鼠标瞄准 · 左键开火<br>1/2/3 切车 · F 空袭 · P 暂停<br>同一营地的虚构红蓝演习；本地单人玩法。</p><p id="loading-error" hidden></p></section></div>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id)! as T;
if (airportMode) {
  document.body.classList.add('airport'); document.querySelector('header h1')!.textContent = '机场保卫战';
  document.querySelector('header .links')!.insertAdjacentHTML('afterbegin', '<a href="./battle.html">自由演习 ↗</a>');
  document.querySelector('.mission')!.innerHTML = `<div class="eyebrow">OPERATION / AIRFIELD DEFENCE</div><strong id="mission-title">01 · 吉普侦察</strong><div class="phase-strip">${AIRPORT.phases.map((p, i) => `<span data-phase="${i}">${i + 1} ${p}</span>`).join('')}</div><p id="mission-objective"></p><div class="capture-row"><span id="zone-state"></span><span id="capture"></span></div><div class="meter"><i id="capture-fill"></i></div>`;
  document.querySelector('.clock span')!.textContent = '任务剩余';
  document.querySelector('.clock .counter span')!.textContent = '防守波次';
  document.querySelector('.briefing')!.innerHTML = '<div><strong>四段任务</strong>侦察 / 部署 / 防守 / 恢复</div><div><strong>06:00</strong>任务限时</div><div><strong>两班协同</strong>命令 / 补给 / 空袭</div>';
  el('footnote').innerHTML = 'WASD 驾驶 · 1/2/3 切车 · E 装卸补给<br>4/5 选小队 · 右键 / G 移动 · H 驻守 · J 跟随<br>F 有限空袭 · P 暂停；本地虚构演习。';
  document.querySelector('.support')!.insertAdjacentHTML('beforebegin', `<section class="airport-panel" aria-label="步兵小队指挥与补给"><div class="eyebrow">SQUAD COMMAND / 小队指挥</div><div class="squad-picker"><button data-squad="alpha">4 · 一班<span></span></button><button data-squad="bravo">5 · 二班<span></span></button></div><div class="squad-actions"><button data-order="move">移动 G</button><button data-order="hold">驻守 H</button><button data-order="follow">跟随 J</button></div><p id="squad-state"></p><div class="post-actions"><button data-post="alpha">部署路口</button><button data-post="bravo">部署北侧</button><button id="guard-hq">警戒机场</button></div><div class="supply-row"><span id="cargo-status">补给 0 / 2 箱</span><button id="interact">装卸 E</button></div><p id="supply-hint"></p></section>`);
  document.querySelector('.support .eyebrow')!.textContent = 'AIR SUPPORT / 空中支援';
} else document.querySelector('header .links')!.insertAdjacentHTML('afterbegin', '<a href="./airport.html">机场保卫战 ↗</a>');
const canvas = el<HTMLCanvasElement>('battle-canvas');
const game = new Battle(airportMode ? 'airport' : 'skirmish'), audio = new CampAudio(), effects = new BattleEffects();
const studio = new Studio({ canvas, ground: 'none', ao: true, pixelRatio: Math.min(devicePixelRatio, 1.5), width: innerWidth, height: innerHeight });
// N8AO / SMAA 包含多个渲染 pass；统计整帧，不能只读最后一个全屏三角形。
studio.renderer.info.autoReset = false;
const world = buildBattleWorld(airportMode); studio.content.add(world.root, effects.root); studio.fitShadows(new THREE.Vector3(0, 0, -8), 60);
const visuals: { root: THREE.Group; rig: MechanicalRig; ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; badge: THREE.Sprite; texture: THREE.CanvasTexture; hp: number }[] = [];
const soldiers: { root: THREE.Group; motion: ReturnType<typeof proceduralMotion>; ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> }[] = [];
const planes: { root: THREE.Group; rig: MechanicalRig; motion: ReturnType<typeof proceduralMotion>; team: 'blue' | 'red'; active: boolean }[] = [];
const cargoBoxes: THREE.Mesh[] = [];
const warnings = new Map<number, THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>>();
const keys = new Set<string>(); let firing = false, overview = false, ready = false, last = performance.now(), accumulator = 0, hudClock = 0, damage = 0;
let zoom = 61, pointer: Point = { x: 19, z: 9 }, cursor = new THREE.Vector2(), hasPointer = false, dialogState = '';
let awaitingOrder = false;
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), cameraTarget = new THREE.Vector3();
const reticleMaterial = new THREE.MeshBasicMaterial({ color: '#f2da88', transparent: true, opacity: 0.95, depthWrite: false });
const reticle = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.46, 32).rotateX(-Math.PI / 2), reticleMaterial); studio.overlay.add(reticle);
const aimLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: '#e5d699', dashSize: 0.6, gapSize: 0.4, transparent: true, opacity: 0.3, depthWrite: false })); studio.overlay.add(aimLine);
const map = el<HTMLCanvasElement>('minimap'), mapCtx = map.getContext('2d')!;
const formatter = (sec: number) => `${Math.floor(sec / 60).toString().padStart(2, '0')}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
const clearControls = () => { keys.clear(); firing = false; };

function updateCamera(immediate = false) {
  const p = game.player, portrait = innerWidth < 540;
  const target = new THREE.Vector3(overview ? 0 : THREE.MathUtils.clamp(p.x * (portrait ? 1 : 0.5), portrait ? -28 : -12, portrait ? 28 : 12), 1, overview ? -5 : THREE.MathUtils.clamp(p.z * (portrait ? 1 : 0.5), portrait ? -19 : -8, portrait ? 19 : 8));
  if (immediate) cameraTarget.copy(target); else cameraTarget.lerp(target, 0.09);
  const d = overview ? Math.max(zoom, 76) * (portrait ? 3.2 : 1) : zoom;
  studio.camera.position.copy(cameraTarget).add(new THREE.Vector3(0, d * 0.78, d * 0.62)); studio.camera.lookAt(cameraTarget); studio.camera.updateMatrixWorld(); studio.adaptToDistance(d);
}
function aimFromPointer() {
  if (!hasPointer) return;
  ray.setFromCamera(cursor, studio.camera); if (ray.ray.intersectPlane(plane, hit)) pointer = { x: THREE.MathUtils.clamp(hit.x, -40, 40), z: THREE.MathUtils.clamp(hit.z, -32, 32) };
}
function drawBadge(i: number) {
  const v = visuals[i], u = game.units[i], c = v.texture.image as HTMLCanvasElement, ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = u.team === 'red' ? '#6d3930ee' : '#254744ee'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f0eada'; ctx.fillText(u.hp > 0 ? `${u.team === 'red' ? 'R' + u.id : 'B' + (u.id === 0 ? 1 : u.id - 2)} · ${u.hp}` : '退出演习', c.width / 2, 31);
  ctx.fillStyle = '#a5c388'; ctx.fillRect(8, 40, (c.width - 16) * u.hp / u.maxHp, 4); v.texture.needsUpdate = true; v.hp = u.hp;
}
function syncModels() {
  cargoBoxes.forEach((b,i)=>b.visible=!!game.mission&&game.mission.cargo>i);
  game.units.forEach((u, i) => {
    const v = visuals[i]; if (!v) return;
    v.root.visible = !game.mission || u.team === 'blue' || (u.hp > 0 && game.mission.visible(game, u));
    v.root.position.set(u.x, 0, u.z); v.root.rotation.y = u.heading; v.rig.update(u.distance, u.turn, 0); v.rig.aim(angleDelta(u.aim, u.heading));
    v.ring.material.color.set(u.hp <= 0 ? '#6f7563' : u.team === 'red' ? '#da8464' : '#6ccac9');
    v.ring.scale.setScalar(u.id === game.selectedId ? 1.22 : 1); v.ring.material.opacity = u.id === game.selectedId ? 1 : 0.5;
    v.badge.quaternion.copy(studio.camera.quaternion); if (v.hp !== u.hp) drawBadge(i);
  });
  game.infantry.forEach((u, i) => {
    const v = soldiers[i]; if (!v) return;
    v.root.visible = u.hp > 0 && (!game.mission || u.team === 'blue' || game.mission.visible(game, u)); v.root.position.set(u.x, 0, u.z); v.root.rotation.y = u.heading;
    v.motion.phase.value = u.phase; v.motion.stride.value = u.speed > 0.1 ? 0.62 : 0;
    const selected = game.mission?.squad.members.includes(u.id);
    v.ring.scale.setScalar(selected ? 1.4 : 1); v.ring.material.color.set(u.team === 'blue' ? selected ? '#f3dc8e' : '#6ccac9' : '#f0a079');
  });
  for (const v of planes) {
    const raid = game.airstrikes.find(r => r.team === v.team); v.active = !!raid; v.root.visible = !!raid;
    if (!raid) continue;
    const direction = raid.team === 'blue' ? 1 : -1;
    v.root.position.set(raid.x, 14 + Math.max(0, raid.age - 5) * 2.5, raid.z + direction * (raid.age - 4.62) * 25);
    v.root.rotation.set(Math.PI / 18 - (raid.age > 5 ? 0.1 : 0), direction === 1 ? 0 : Math.PI, raid.age > 6 ? direction * 0.15 : 0, 'YXZ');
    v.motion.phase.value = raid.age * Math.PI * 2 * 9; v.motion.gear.value = 1; v.rig.update(0, 0, 1);
  }
  const active = new Set(game.airstrikes.map(r => r.id));
  warnings.forEach((v, id) => { if (!active.has(id)) { v.removeFromParent(); v.geometry.dispose(); v.material.dispose(); warnings.delete(id); } });
  for (const r of game.airstrikes) {
    let mark = warnings.get(r.id);
    if (!mark) { mark = new THREE.Mesh(new THREE.RingGeometry(AIR_WARNING_RADIUS - 0.15, AIR_WARNING_RADIUS, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: r.team === 'blue' ? '#72d7df' : '#ff6b48', transparent: true, depthWrite: false })); studio.overlay.add(mark); warnings.set(r.id, mark); }
    mark.position.set(r.x, 0.11, r.z); mark.material.opacity = r.age < 6 ? 0.6 + 0.35 * Math.sin(r.age * 9) : 0.15;
  }
  reticle.position.set(pointer.x, 0.09, pointer.z); reticleMaterial.color.set(game.lineClear(game.player, pointer) ? '#eed28d' : '#d98062');
  const labelPoint = reticle.position.clone().project(studio.camera);
  el('target-label').style.left = `${THREE.MathUtils.clamp((labelPoint.x + 1) * innerWidth / 2, 30, innerWidth - 30)}px`;
  el('target-label').style.top = `${THREE.MathUtils.clamp((1 - labelPoint.y) * innerHeight / 2 - 24, 100, innerHeight - 200)}px`;
  const p = game.player, aim = p.aim, positions = aimLine.geometry.getAttribute('position') as THREE.BufferAttribute;
  positions.setXYZ(0, p.x, 0.08, p.z); positions.setXYZ(1, p.x + Math.sin(aim) * 12, 0.08, p.z + Math.cos(aim) * 12); positions.needsUpdate = true; aimLine.computeLineDistances(); aimLine.geometry.computeBoundingSphere();
  reticle.visible = aimLine.visible = game.status === 'running' || game.status === 'paused';
}
function paintMap() {
  const ctx = mapCtx, sx = map.width / 72, sz = map.height / 50;
  const x = (p: number) => (p + 36) * sx, z = (p: number) => (p + 25) * sz;
  ctx.clearRect(0, 0, map.width, map.height); ctx.fillStyle = '#29382b'; ctx.fillRect(0, 0, map.width, map.height);
  ctx.strokeStyle = '#667151'; ctx.lineWidth = 1; ctx.strokeRect(x(-BOUNDS.x), z(-BOUNDS.z), BOUNDS.x * 2 * sx, BOUNDS.z * 2 * sz);
  ctx.fillStyle = '#667151'; COVERS.forEach(c => ctx.fillRect(x(c.x - c.w / 2), z(c.z - c.d / 2), c.w * sx, c.d * sz));
  const goal = game.mission ? AIRPORT.headquarters : GOAL;
  ctx.fillStyle = '#c4b57722'; ctx.strokeStyle = game.contested ? '#cf8b6e' : '#c4b577'; ctx.beginPath(); ctx.ellipse(x(goal.x), z(goal.z), goal.radius * sx, goal.radius * sz, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#e4d499'; ctx.fillText(game.mission?'HQ':'A', x(goal.x) - 4, z(goal.z) + 4);
  game.units.filter(u => !game.mission || (u.hp > 0 && (u.team === 'blue' || game.mission.visible(game, u)))).forEach(u => { ctx.save(); ctx.translate(x(u.x), z(u.z)); ctx.rotate(-u.heading); ctx.fillStyle = u.hp <= 0 ? '#78806b' : u.team === 'red' ? '#f2a07e' : '#83dfdc'; ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(-4, -4); ctx.lineTo(4, -4); ctx.closePath(); ctx.fill(); ctx.restore(); });  game.infantry.filter(u => u.hp > 0 && (!game.mission || u.team === 'blue' || game.mission.visible(game, u))).forEach(u => { ctx.fillStyle = u.team === 'blue' ? '#9ddacd' : '#ffae83'; ctx.beginPath(); ctx.arc(x(u.x), z(u.z), 2, 0, Math.PI * 2); ctx.fill(); });
  if (game.mission) {
    for (const p of [AIRPORT.depot, AIRPORT.headquarters, ...game.mission.recon, ...AIRPORT.posts]) {
      ctx.strokeStyle = 'done' in p ? p.done ? '#8ec9a2' : '#e7c97d' : '#85cec6'; ctx.beginPath(); ctx.arc(x(p.x), z(p.z), 5, 0, Math.PI * 2); ctx.stroke();
    }
    for (const s of game.mission.squads) { ctx.strokeStyle = '#f0d483'; ctx.beginPath(); ctx.moveTo(x(s.target.x)-3,z(s.target.z));ctx.lineTo(x(s.target.x)+3,z(s.target.z));ctx.moveTo(x(s.target.x),z(s.target.z)-3);ctx.lineTo(x(s.target.x),z(s.target.z)+3);ctx.stroke(); }
    ctx.font = '10px sans-serif';ctx.fillStyle = '#e7dcad';ctx.fillText('D',x(AIRPORT.depot.x)-3,z(AIRPORT.depot.z)-8);ctx.fillText('HQ',x(AIRPORT.headquarters.x)-7,z(AIRPORT.headquarters.z)-8);
  }
  game.airstrikes.forEach(r => { ctx.strokeStyle = r.team === 'blue' ? '#80e2e7' : '#ff704b'; ctx.beginPath(); ctx.ellipse(x(r.x), z(r.z), AIR_WARNING_RADIUS * sx, AIR_WARNING_RADIUS * sz, 0, 0, Math.PI * 2); ctx.stroke(); });
  const p = game.player; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x(p.x), z(p.z), 9, 0, Math.PI * 2); ctx.stroke();

}
function showDialog() {
  const state = game.status;
  if (state === dialogState) return; dialogState = state;
  el('veil').hidden = state === 'running'; el('mode-row').hidden = state !== 'ready'; el('result-line').hidden = state !== 'won' && state !== 'lost';
  el('dialog-restart').hidden = !['paused', 'won', 'lost'].includes(state);
  el('dialog-restart').textContent = state === 'paused' ? '重新开始' : '返回演习准备';
  el<HTMLButtonElement>('pause').disabled = !ready || !['running', 'paused'].includes(state);
  el<HTMLButtonElement>('restart').disabled = !ready; el('pause').textContent = state === 'paused' ? '继续 P' : '暂停 P';
  const won = state === 'won', lost = state === 'lost';
  el('dialog-title').textContent = state === 'ready' ? '营地争夺演习' : state === 'paused' ? '演习已暂停' : won ? '演习胜利' : '演习结束';
  el('dialog-eyebrow').textContent = won ? 'MISSION COMPLETE / BLUE TEAM' : lost ? 'EXERCISE OVER / TRY AGAIN' : state === 'paused' ? 'PAUSED / ALL SYSTEMS HELD' : 'COMBINED ARMS / LOCAL PLAY';
  el('dialog-description').textContent = state === 'paused' ? '车辆、步兵、飞机、炸弹、装填与占领计时已暂停，声音也已停止。继续后从当前战况接着进行。' : won ? (game.captured < GOAL.seconds ? '红队装甲与步兵已全部退出演习。蓝队取得营地控制权。' : '通信区已连续控制 20 秒。蓝队完成任务。') : lost ? (game.player.hp <= 0 ? '蓝队的三辆车已全部失去行动能力。利用掩体掩护步兵，并及时避开红队空袭标记。' : '三分钟演习时间已到。下一局尝试主动接近通信区。') : '接管蓝队三辆车，与步兵一起争夺营地。红队的 3 辆 M18 与 6 名步兵会争夺通信区，飞机也会发起空袭。按 1/2/3 接管蓝队车辆；鼠标指定落点，按 F 呼叫 P-51。';
  el('result-line').textContent = `用时 ${formatter(game.time)} · 红队退出 ${game.kills} / 3 · 步兵退出 ${game.infantryKills} / 6 · 剩余耐久 ${game.player.hp}`;
  el('start').textContent = !ready ? '正在构建真实模型…' : state === 'paused' ? '继续演习' : won || lost ? '再战一局' : '进入演习 →';
  if (game.mission) {
    el('dialog-title').textContent = state === 'ready' ? '机场保卫战' : state === 'paused' ? '任务已暂停' : won ? '机场保卫成功' : '任务未完成';
    el('dialog-description').textContent = state === 'ready' ? '先驾驶吉普到两个黄色侦察点，停车观察 2 秒。按 4/5 选步兵小队，用部署按钮或右键下令；在 D 补给站按 E 装货，送至 HQ 或阵地。部署完成后抵挡两波进攻，最后送第二箱机场补给并派步兵警戒 HQ。' : state === 'paused' ? '任务阶段、小队命令、弹药、车辆、士兵、飞机和声音均已暂停。继续后从当前战况接着进行。' : won ? '两波进攻已被击退，补给送达，步兵完成机场警戒。机场恢复运行。' : `${game.mission.failure}。利用小队掩护吉普，及时补弹并避开空袭。`;
    el('start').textContent = !ready ? '正在构建真实模型…' : state === 'paused' ? '继续任务' : won || lost ? '重新挑战' : '开始侦察 →';
    el('result-line').textContent = `用时 ${formatter(game.time)} · 机场 ${Math.ceil(game.mission.integrity)}% · 击退 ${game.mission.wave} 波 · 送达 ${game.mission.deliveries} 箱`;
  }
}
function updateHUD() {
  const p = game.player, profile = VEHICLES[p.kind];
  el('vehicle-name').textContent = profile.name; el('weapon-name').textContent = profile.weapon;
  document.querySelectorAll<HTMLButtonElement>('[data-vehicle]').forEach(b => { const u = game.units.find(u => u.id === +b.dataset.vehicle!)!; b.disabled = !ready || u.hp <= 0 || !['ready', 'running'].includes(game.status); b.classList.toggle('selected', u.id === game.selectedId); b.setAttribute('aria-pressed', String(u.id === game.selectedId)); b.querySelector('span')!.textContent = u.hp > 0 ? `${u.hp} / ${u.maxHp}` : '退出演习'; });
  el('infantry-status').textContent = `步兵 · 蓝 ${game.infantry.filter(u => u.team === 'blue' && u.hp > 0).length} / 4　红 ${game.infantry.filter(u => u.team === 'red' && u.hp > 0).length} / 6`;
  el<HTMLButtonElement>('airstrike').disabled = game.status !== 'running' || game.airCooldown > 0;
  el('airstrike').textContent = game.airCooldown > 0 ? `空袭冷却 · ${Math.ceil(game.airCooldown)} 秒` : '空袭 F · 鼠标指定落点';
  el('air-status').textContent = game.airstrikes.some(r => r.team === 'blue') ? 'P-51 执行空袭 · 蓝圈为投弹区' : 'P-51 待命 · 标记后约 5 秒落弹';
  el('raid-alert').hidden = !game.airstrikes.some(r => r.team === 'red' && r.age < 6);
  el('clock').textContent = formatter(Math.max(0, Math.ceil(LIMIT - game.time))); el('kills').textContent = `${game.kills} / 3`;
  el('hp').textContent = `${p.hp} / ${p.maxHp}`; el('hp-fill').style.width = `${p.hp / p.maxHp * 100}%`;
  el('reload-label').textContent = p.kind === 'jeep' ? '侦察车辆 · F 呼叫空袭' : p.reload > 0 ? '主炮装填中' : '主炮就绪'; el('reload').textContent = profile.reload ? p.reload > 0 ? `${p.reload.toFixed(1)} 秒` : `${profile.reload.toFixed(2)} 秒装填` : '无武装'; el('reload-fill').style.width = `${(profile.reload ? 1 - p.reload / profile.reload : 0) * 100}%`;
  el('capture').textContent = `${game.captured.toFixed(1)} / 20 秒`; el('capture-fill').style.width = `${game.captured / GOAL.seconds * 100}%`;
  const inside = dist(p, GOAL) <= GOAL.radius;
  el('zone-state').textContent = game.contested ? '红队在区内 · 占领受阻' : inside ? '蓝队正在占领' : '进入黄色圆圈开始占领';
  el('hint').textContent = game.contested ? '先击退区内的红队，才能继续占领' : inside ? '守住通信区，或击败全部红队' : game.time < 8 ? 'WASD 驾驶 · 鼠标瞄准 · 按住左键连续射击' : '善用掩体 · 装填间隙移动 · 小地图显示对手位置';
  const desired = Math.atan2(pointer.x - p.x, pointer.z - p.z);
  el('target-label').textContent = p.kind === 'jeep' ? '鼠标指向落点 · F 空袭' : !game.lineClear(p, pointer) ? '射线被掩体阻挡' : Math.abs(angleDelta(desired, p.aim)) > 0.08 ? '炮塔转动中' : p.reload > 0 ? '装填中' : '主炮就绪';
  if (game.mission) updateAirportHUD();
  paintMap(); showDialog();
}
function updateAirportHUD() {
  const m = game.mission!, running = game.status === 'running';
  el('mission-title').textContent = `0${m.phase + 1} · ${AIRPORT.phases[m.phase]}`;
  document.querySelectorAll<HTMLElement>('[data-phase]').forEach(e => { e.classList.toggle('active', +e.dataset.phase! === m.phase); e.classList.toggle('done', +e.dataset.phase! < m.phase); });
  const posts = AIRPORT.posts.map(p => ({ ...p, ready: game.infantry.some(u => u.hp > 0 && m.squads.find(s => s.id === p.id)!.members.includes(u.id) && dist(u, p) <= p.radius) }));
  el('mission-objective').textContent = m.phase === 0 ? '驾驶吉普到 N / E 黄色侦察点，停车观察 2 秒。' : m.phase === 1 ? '一班部署路口，二班部署北侧；吉普将一箱补给送至 HQ。' : m.phase === 2 ? `守住机场，击退两波进攻。${m.nextWaveAt ? '下一波即将抵达，抓紧补给。' : '侦察单位揭示敌人，F 可呼叫有限空袭。'}` : '向 HQ 送第二箱补给，派任一小队警戒机场 8 秒。';
  el('zone-state').textContent = m.phase === 0 ? m.recon.map(p => `${p.id === 'north' ? 'N' : 'E'} ${p.done ? '✓' : p.progress.toFixed(1) + '/2s'}`).join(' · ') : m.phase === 1 ? `路口 ${posts[0].ready ? '✓' : '待部署'} · 北侧 ${posts[1].ready ? '✓' : '待部署'} · HQ补给 ${m.headquartersDeliveries ? '✓' : '待送达'}` : m.phase === 2 ? `机场 ${Math.ceil(m.integrity)}% · ${game.contested ? '敌军侵入！' : '通信正常'}` : `HQ补给 ${m.headquartersDeliveries}/2 · 警戒 ${m.secure.toFixed(1)}/8s`;
  const progress = m.phase === 0 ? m.recon.reduce((s,p)=>s+Math.min(2,p.progress),0)/4 : m.phase === 1 ? (posts.filter(p=>p.ready).length + Number(m.headquartersDeliveries > 0))/3 : m.phase === 2 ? m.integrity/100 : m.secure/8;
  el('capture').textContent = `${Math.round(progress * 100)}%`; el('capture-fill').style.width = `${progress * 100}%`;
  el('clock').textContent = formatter(Math.max(0,Math.ceil(AIRPORT.limit - game.time)));el('kills').textContent = `${m.wave} / 2`;
  document.querySelectorAll<HTMLButtonElement>('[data-squad]').forEach(b => { const s=m.squads.find(s=>s.id===b.dataset.squad)!;b.classList.toggle('selected',s.id===m.selectedSquad);b.setAttribute('aria-pressed',String(s.id===m.selectedSquad));b.disabled=!running;b.querySelector('span')!.textContent=`${game.infantry.filter(u=>s.members.includes(u.id)&&u.hp>0).length}/2 人`; });
  document.querySelectorAll<HTMLButtonElement>('[data-order],[data-post],#guard-hq,#interact').forEach(b=>b.disabled=!running);
  const live=game.infantry.filter(u=>m.squad.members.includes(u.id)&&u.hp>0);
  el('squad-state').textContent=awaitingOrder ? `${m.squad.name}：点击地面指定移动位置` : `${m.squad.name} · ${live.some(u=>m.protectedPost(u))?'阵地防护':m.squad.order==='follow'?'跟随当前车辆':m.squad.order==='hold'?'就地驻守':'执行移动'} · 弹药 ${live.reduce((s,u)=>s+u.ammo,0)}`;
  el('cargo-status').textContent=`补给 ${m.cargo}/2 箱 · 已送 ${m.deliveries}`;el('supply-hint').textContent=m.interactionHint(game);
  el('infantry-status').textContent=`蓝队步兵 ${game.infantry.filter(u=>u.team==='blue'&&u.hp>0).length}/4 · 敌军 ${game.combatants.filter(u=>u.team==='red'&&u.hp>0).length}`;
  el<HTMLButtonElement>('airstrike').disabled=!running||game.airCooldown>0||!m.canAirstrike(game,pointer);
  el('airstrike').textContent=m.phase<2?'空袭 · 部署完成后开放':game.airCooldown>0?`空袭冷却 ${Math.ceil(game.airCooldown)}s · 余 ${m.charges}`:`空袭 F · 剩余 ${m.charges} 次`;
  el('air-status').textContent=m.phase>=2&&!m.visible(game,pointer)?'目标未被友军发现 · 先侦察':'目标需在友军视野内 · 约 5 秒落弹';
  el('reload-label').textContent=game.player.kind==='jeep'?'吉普 · 侦察 / 运送补给':game.player.ammo<=0?'弹药耗尽 · 吉普送补给':`主炮 ${game.player.ammo}/18 发 · ${game.player.reload>0?'装填中':'就绪'}`;
  if(game.player.kind==='jeep')el('weapon-name').textContent='侦察 / 补给';
  el('hint').textContent=awaitingOrder?'点击地面：给选中小队下达移动命令':m.interactionHint(game);
  el('target-label').textContent=awaitingOrder?'点击下令':`右键：${m.squad.name}移动 · ${game.player.kind==='jeep'?'吉普无武装':'左键开火'}`;
}
function processEvents() {
  for (const e of game.drain()) {
    const position = new THREE.Vector3(e.x, e.y ?? 1.4, e.z);
    if (e.kind === 'shot' || e.kind === 'rifle') {
      const muzzle = e.kind === 'shot' ? visuals.find((_, i) => game.units[i].id === e.unit)?.rig.muzzle() ?? position : position;
      effects.burst(muzzle.x, muzzle.y, muzzle.z, false, true); audio.effect(e.kind, muzzle);
    } else if (e.kind === 'hit' || e.kind === 'blocked') {
      effects.burst(e.x, position.y, e.z, false); audio.effect('hit', position); if (e.target === game.selectedId) damage = 0.8;
    } else if (e.kind === 'bomb' || (e.kind === 'destroyed' && e.unit < 100)) {
      effects.burst(e.x, 0.5, e.z, true); audio.effect('destroyed', new THREE.Vector3(e.x, 0.5, e.z));
    }
  }
  el('log').innerHTML = game.history.filter(e => !['shot', 'rifle', 'blocked'].includes(e.kind)).slice(-4).map(e => `<p><time>${formatter(e.time)}</time>${e.text}</p>`).join('') || '<p>三辆车分别保留自己的耐久与装填。</p><p>蓝队步兵自主交火，红队空袭有预警。</p>';
}
function switchVehicle(id: number) { if (game.switchVehicle(id)) { clearControls(); hasPointer = false; pointer = { x: game.player.x + Math.sin(game.player.aim) * 15, z: game.player.z + Math.cos(game.player.aim) * 15 }; updateCamera(true); processEvents(); updateHUD(); canvas.focus({ preventScroll: true }); } }
function callAirstrike() { aimFromPointer(); if (game.callAirstrike(pointer)) { processEvents(); updateHUD(); canvas.focus({ preventScroll: true }); } }
function orderSquad(order: Order) { aimFromPointer(); if (game.commandSquad(order, pointer)) { awaitingOrder = false; processEvents(); updateHUD(); canvas.focus({ preventScroll: true }); } }
function interact() { game.interact(); processEvents(); updateHUD(); canvas.focus({ preventScroll: true }); }

function pause() { if (game.status !== 'running') return; game.pause(); clearControls(); audio.pause(); accumulator = 0; updateHUD(); }
function resume() { if (document.hidden || !ready) return; game.start(); audio.play(); last = performance.now(); accumulator = 0; updateHUD(); canvas.focus({ preventScroll: true }); }
function restart() { clearControls(); awaitingOrder=false; game.reset(el<HTMLSelectElement>('difficulty').value as 'casual' | 'standard'); audio.reset(); audio.pause(); effects.reset(); damage = 0; hasPointer = false; pointer = { x: 19, z: 9 }; cameraTarget.set(game.player.x, 1, game.player.z); overview = false; el('camera').textContent = '俯瞰 C'; updateCamera(true); syncModels(); processEvents(); updateHUD(); }
function toggleCamera() { overview = !overview; el('camera').textContent = overview ? '跟随 C' : '俯瞰 C'; updateCamera(true); }
el('start').addEventListener('click', () => { if (['won', 'lost'].includes(game.status)) restart(); resume(); });
el('restart').addEventListener('click', restart); el('dialog-restart').addEventListener('click', restart);
el('pause').addEventListener('click', () => game.status === 'running' ? pause() : resume()); el('camera').addEventListener('click', toggleCamera);
el('sound').addEventListener('change', () => audio.setEnabled(el<HTMLInputElement>('sound').checked)); el('volume').addEventListener('input', () => audio.setVolume(+el<HTMLInputElement>('volume').value / 100));
el('difficulty').addEventListener('change', restart);
el('airstrike').addEventListener('click', callAirstrike);
document.querySelectorAll<HTMLButtonElement>('[data-vehicle]').forEach(b => b.addEventListener('click', () => switchVehicle(+b.dataset.vehicle!)));
if (airportMode) {
  document.querySelectorAll<HTMLButtonElement>('[data-squad]').forEach(b=>b.addEventListener('click',()=>{game.mission!.select(b.dataset.squad!);awaitingOrder=false;updateHUD();canvas.focus();}));
  document.querySelectorAll<HTMLButtonElement>('[data-order]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.order==='move'){awaitingOrder=true;updateHUD();canvas.focus();}else orderSquad(b.dataset.order as Order);}));
  document.querySelectorAll<HTMLButtonElement>('[data-post]').forEach(b=>b.addEventListener('click',()=>{const p=AIRPORT.posts.find(p=>p.id===b.dataset.post)!;game.mission!.select(p.id);game.commandSquad('move',p);awaitingOrder=false;processEvents();updateHUD();canvas.focus();}));
  el('guard-hq').addEventListener('click',()=>{game.commandSquad('move',AIRPORT.headquarters);awaitingOrder=false;processEvents();updateHUD();canvas.focus();});
  el('interact').addEventListener('click',interact);
}
window.addEventListener('keydown', e => {
  if ((e.target as HTMLElement).matches('input,select')) return;
  if (airportMode && ['KeyE','KeyG','KeyH','KeyJ','Digit4','Digit5'].includes(e.code)) {
    e.preventDefault();if(e.repeat||game.status!=='running')return;
    if(e.code==='KeyE')interact();else if(e.code==='Digit4'||e.code==='Digit5'){game.mission!.select(e.code==='Digit4'?'alpha':'bravo');awaitingOrder=false;updateHUD();}
    else orderSquad(e.code==='KeyG'?'move':e.code==='KeyH'?'hold':'follow');return;
  }
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'KeyP', 'Escape', 'KeyC', 'KeyF', 'Digit1', 'Digit2', 'Digit3'].includes(e.code)) e.preventDefault();
  if (!e.repeat && ['KeyP', 'Escape'].includes(e.code)) { if (game.status === 'running') pause(); else if (game.status === 'paused') resume(); return; }
  if (!e.repeat && e.code === 'KeyC') toggleCamera();
  if (!e.repeat && e.code === 'KeyF') { callAirstrike(); return; }
  if (!e.repeat && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { switchVehicle([0, 4, 5][+e.code.slice(-1) - 1]); return; }
  if (game.status === 'running') keys.add(e.code);
});
window.addEventListener('keyup', e => keys.delete(e.code)); window.addEventListener('blur', () => { clearControls(); pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); cursor.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); hasPointer = true; });
canvas.addEventListener('pointerdown', e => { if (game.status !== 'running' || ![0,2].includes(e.button)) return; canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId); const r = canvas.getBoundingClientRect(); cursor.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); hasPointer = true; if(game.mission&&(awaitingOrder||e.button===2)){orderSquad('move');return;}if(e.button===0&&e.pointerType === 'mouse') firing = true; });
window.addEventListener('pointerup', () => { firing = false; keys.delete('Space'); }); canvas.addEventListener('pointercancel', clearControls);
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = THREE.MathUtils.clamp(zoom + e.deltaY * 0.02, 38, 85); updateCamera(true); }, { passive: false });
document.querySelectorAll<HTMLButtonElement>('[data-key],#touch-fire').forEach(b => {
  const key = b.dataset.key ?? 'Space'; b.addEventListener('pointerdown', e => { e.preventDefault(); if (game.status === 'running') { b.setPointerCapture(e.pointerId); keys.add(key); } });
  for (const evt of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(evt, () => keys.delete(key));
});
window.addEventListener('resize', () => { studio.setSize(innerWidth, innerHeight); updateCamera(true); });

async function boot() {
  try {
    const templates = new Map<string, { template: THREE.Group; assetId: string }>();
    for (const path of ['usa/m4a3-sherman', 'usa/m18-hellcat', 'usa/willys-mb']) {
      const def = await loadAssetByPath(path); templates.set(path, { template: await buildMotionTemplate(def, defaultConfig(def)), assetId: def.id });
    }
    for (const u of game.units) {
      const path = u.kind === 'sherman' ? 'usa/m4a3-sherman' : u.kind === 'hellcat' ? 'usa/m18-hellcat' : 'usa/willys-mb';
      const { template, assetId } = templates.get(path)!, root = new THREE.Group(), model = template.clone(true); root.add(model);
      const rig = new MechanicalRig(model, assetId); studio.content.add(root);
      if(airportMode&&u.kind==='jeep')for(let i=0;i<2;i++){const box=new THREE.Mesh(new THREE.BoxGeometry(.52,.4,.52),new THREE.MeshStandardMaterial({color:'#aa9563',roughness:.9}));box.position.set(i? .29:-.29,1.15,-.6);box.castShadow=true;root.add(box);cargoBoxes.push(box);}
      const r = u.kind === 'jeep' ? 1.3 : 2.15;
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.08, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: u.team === 'red' ? '#da8464' : '#6ccac9', transparent: true, opacity: 0.75, depthWrite: false })); ring.position.y = 0.045; root.add(ring);
      const c = document.createElement('canvas'); c.width = 192; c.height = 50; const texture = new THREE.CanvasTexture(c);
      const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true, transparent: true })); badge.scale.set(4.7, 1.22, 1); badge.position.y = u.kind === 'jeep' ? 2.4 : 4; root.add(badge);
      visuals.push({ root, rig, ring, badge, texture, hp: -1 });
    }
    const soldierDef = await loadAssetByPath('usa/rifleman');
    const raw = await soldierDef.build({ ...defaultConfig(soldierDef), pose: 'aim-rifle' }, { detail: 'low' });
    const muzzle = raw.userData.battleMuzzle as number[]; if (muzzle) game.infantryMuzzle = { x: muzzle[0], y: muzzle[1], z: muzzle[2] };
    const template = bake(raw).group;
    for (const u of game.infantry) {
      const root = new THREE.Group(), model = template.clone(true); root.add(model); studio.content.add(root);
      const motion = proceduralMotion(model, 'patrol');
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.49, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: u.team === 'blue' ? '#6ccac9' : '#ef9874', transparent: true, opacity: 0.85 })); ring.position.y = 0.06; root.add(ring); soldiers.push({ root, motion, ring });
    }
    const def = await loadAssetByPath('usa/p51d'), model = await getModel(def);
    const parked = model.template.clone(true); parked.position.set(-25.5, 0, -7); studio.content.add(parked);
    const flight = await buildMotionTemplate(def, defaultConfig(def));
    for (const team of ['blue', 'red'] as const) {
      const root = new THREE.Group(), model = flight.clone(true); root.add(model); studio.content.add(root);
      const motion = proceduralMotion(model, 'aircraft'), rig = new MechanicalRig(model, def.id); motion.gear.value = 1; rig.update(0, 0, 1);
      planes.push({ root, rig, motion, team, active: false });
    }
    updateCamera(true); syncModels(); await studio.renderer.compileAsync(studio.scene, studio.camera);
    ready = true; el<HTMLButtonElement>('start').disabled = false; dialogState = ''; updateHUD();
    (window as unknown as { __battleReady: boolean }).__battleReady = true;
  } catch (e) { el('loading-error').hidden = false; el('loading-error').textContent = `模型构建失败：${String(e)}。请刷新重试。`; el('start').textContent = '模型构建失败'; console.error(e); }
}
updateCamera(true); updateHUD();
studio.start(() => {
  studio.renderer.info.reset();
  const now = performance.now(), elapsed = Math.min(0.15, (now - last) / 1000); last = now;
  updateCamera(); aimFromPointer();
  if (ready && game.status === 'running') {
    const selectedAtFrame = game.selectedId;
    accumulator += elapsed;
    while (accumulator >= 1 / 60 && game.status === 'running') {
      game.update(1 / 60, { throttle: Number(keys.has('KeyW')) - Number(keys.has('KeyS')), steer: Number(keys.has('KeyA')) - Number(keys.has('KeyD')), aim: pointer, fire: firing || keys.has('Space') }); accumulator -= 1 / 60;
    }
    if (game.selectedId !== selectedAtFrame) { clearControls(); hasPointer = false; pointer = { x: game.player.x + Math.sin(game.player.aim) * 15, z: game.player.z + Math.cos(game.player.aim) * 15 }; updateCamera(true); }
    processEvents(); effects.update(elapsed, game.shells, game.bombs); damage = Math.max(0, damage - elapsed * 1.3);
    audio.update([
      ...game.units.map(u => ({ kind: u.kind === 'jeep' ? 'jeep' : 'armor', index: u.id, position: new THREE.Vector3(u.x, 0, u.z), phase: 0, throttle: Math.abs(u.speed) / VEHICLES[u.kind].speed, alive: u.hp > 0 })),
      ...planes.map((p, i) => ({ kind: 'aircraft', index: i, position: p.root.position.clone(), phase: p.motion.phase.value, throttle: 0.9, alive: p.active })),
      ...game.infantry.map(u => ({ kind: 'patrol', index: u.id, position: new THREE.Vector3(u.x, 0, u.z), phase: u.phase, throttle: 0, alive: u.hp > 0 })),
    ], studio.camera, 1);

    if (game.status !== 'running') { clearControls(); audio.pause(); accumulator = 0; updateHUD(); }
  }
  syncModels(); world.update(game.captured, game.contested, game.mission); el('damage').style.opacity = String(damage);
  hudClock += elapsed; if (hudClock > 0.1) { updateHUD(); hudClock = 0; }
  return true;
});
// 只读验收接口；不提供无敌、改血量、传送或替代用户输入的接口。
(window as unknown as { __battle: unknown }).__battle = {
  getState: () => ({ ...game.snapshot(), ready, audio: audio.getState(), effects: effects.getState(), aimPoint: { ...pointer }, overview,
    soldierModels: soldiers.map((v, i) => ({ id: game.infantry[i].id, position: v.root.position.toArray(), heading: v.root.rotation.y, visible: v.root.visible, phase: v.motion.phase.value, stride: v.motion.stride.value, feet: [footPose(v.motion.phase.value, v.motion.stride.value), footPose(v.motion.phase.value + Math.PI, v.motion.stride.value)] })),
    aircraftModels: planes.map(v => ({ team: v.team, active: v.active, position: v.root.position.toArray(), quaternion: v.root.quaternion.toArray(), phase: v.motion.phase.value, joints: v.rig.getState() })),
    models: visuals.map(v => ({ position: v.root.position.toArray(), heading: v.root.rotation.y, joints: v.rig.getState(), muzzle: v.rig.muzzle().toArray() })),
    cargoModels: cargoBoxes.map(b=>({visible:b.visible,position:b.position.toArray()})), render: { calls: studio.renderer.info.render.calls, triangles: studio.renderer.info.render.triangles }, size: [innerWidth, innerHeight] }),
  project: (x: number, z: number, y = 0) => { const p = new THREE.Vector3(x, y, z).project(studio.camera); return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 }; },
};
void boot();

// 首页控制复用原有暂停 / 恢复，不修改战况；同源且必须来自父页面。
window.addEventListener('message', event => {
  if (window.parent === window || event.source !== window.parent || event.origin !== location.origin || event.data?.type !== 'muster-hub') return;
  if (event.data.action === 'pause') pause();
  if (event.data.action === 'resume' && game.status === 'paused') resume();
  window.parent.postMessage({ type: 'muster-hub-status', ready, active: ['running', 'paused'].includes(game.status), playing: game.status === 'running' }, location.origin);
});



if (window.parent !== window) document.querySelectorAll<HTMLAnchorElement>('header a, nav a').forEach(a => { a.target = '_top'; });

