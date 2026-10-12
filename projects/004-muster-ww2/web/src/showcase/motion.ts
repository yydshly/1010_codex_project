/** 本地新增的演示层：确定性路径、统一时钟和顶点步态，不写入布置 Store。 */
import * as THREE from 'three';
import { SceneController, type RenderedInstance } from '../app/scene';
import { compileOffThread } from '../app/compile';
import { ASSET_TO_BODY, BODY_TO_ASSET } from '../assets/usa/p51d/frame';
import type { AssetDef, AssetConfig } from '../core/types';
import { buildMotionTemplate, MechanicalRig } from './rig';
import { CampAudio } from './audio';

export const CYCLE_SECONDS = 90;
const TAU = Math.PI * 2;
const smooth = (t: number) => t * t * (3 - 2 * t);
const points = (p: number[][]) => p.map(([x, y, z]) => new THREE.Vector3(x, y, z));
function loop(p: number[][]) { return new THREE.CatmullRomCurve3(points(p), true, 'centripetal'); }
// 同一组点用于铺设可见道路和实际车辆轨迹。
export const JEEP_ROAD = loop([[-14, 0, 5], [2, 0, 5], [5, 0, 8], [5, 0, 11], [2, 0, 14], [-13, 0, 14], [-16, 0, 11], [-16, 0, 8]]);
export const ARMOR_ROAD = loop([[13, 0, -5], [27, 0, -5], [29, 0, -3], [27, 0, -1], [13, 0, -1], [11, 0, -3]]);
export const PATROL_PATH = loop([[12, 0, 7], [22, 0, 7], [24, 0, 9], [24, 0, 11], [22, 0, 13], [12, 0, 13], [10, 0, 11], [10, 0, 9]]);

interface FlightSegment { start: number; end: number; label: string; path: THREE.CatmullRomCurve3; flying: boolean; endHeading?: number }
const segment = (start: number, end: number, label: string, p: number[][], flying = false, endHeading?: number): FlightSegment =>
  ({ start, end, label, path: new THREE.CatmullRomCurve3(points(p), false, 'centripetal'), flying, endHeading });
const FLIGHT: FlightSegment[] = [
  segment(0, 8, '离开停机位', [[-25.5, 0, -8], [-26, 0, -5], [-33, 0, -5], [-38, 0, -8]]),
  segment(8, 18, '滑行至跑道', [[-38, 0, -8], [-38, 0, -20], [-38, 0, -32], [-36, 0, -36]]),
  segment(18, 26, '加速 · 离地', [[-36, 0, -36], [-26, 0, -36], [-12, 0, -36], [2, 4, -36]], true),
  segment(26, 36, '爬升', [[2, 4, -36], [19, 12, -34], [35, 19, -18]], true),
  segment(36, 50, '空中巡航', [[35, 19, -18], [31, 23, 9], [-2, 25, 24], [-38, 21, 11], [-62, 14, -36], [-57, 14, -36]], true),
  segment(50, 62, '进场 · 着陆', [[-57, 14, -36], [-45, 7, -36], [-33, 2, -36], [-25, 0, -36]], true),
  segment(62, 69, '着陆滑跑', [[-25, 0, -36], [-17, 0, -36], [-8, 0, -36]]),
  segment(69, 77, '脱离跑道', [[-8, 0, -36], [-5, 0, -33], [-10, 0, -31], [-32, 0, -32], [-38, 0, -29]]),
  segment(77, 86, '滑行归位', [[-38, 0, -29], [-38, 0, -13], [-34, 0, -8], [-25.5, 0, -8]], false, 0),
  segment(86, 90, '停机待命', [[-25.5, 0, -8], [-25.5, 0, -8.001]], false, 0),
];
function flightPosition(time: number) {
  const s = FLIGHT.find(s => time < s.end) ?? FLIGHT.at(-1)!;
  let u = THREE.MathUtils.clamp((time - s.start) / (s.end - s.start), 0, 1);
  if (s.start === 18) u *= u; // 加速滑跑。
  if (s.start === 62) u = 1 - (1 - u) ** 2; // 接地后减速。
  const p = s.path.getPointAt(u); p.y = Math.max(0, p.y);
  return p;
}

// 支撑期脚掌相对地面停留，摆动期抬脚；用两段腿的解析 IK 弯膝。
const DECLARATIONS = `
uniform float campPhase;
uniform float campStride;
uniform mat4 campBody;
uniform mat4 campAsset;
vec2 campFoot(float phase) {
  float u = fract(phase / 6.28318530718);
  float swing = clamp((u - 0.62) / 0.38, 0.0, 1.0);
  float z = u < 0.62 ? campStride * (0.5 - u / 0.62) : campStride * (-0.5 + swing * swing * (3.0 - 2.0 * swing));
  return vec2(0.07 + 0.11 * sin(swing * 3.14159265), z);
}
vec3 campDeform(vec3 p) {
#ifdef CAMP_WALK
#ifndef CAMP_RIGID
  if (p.y < 0.94) {
    float phase = campPhase + (p.x < 0.0 ? 3.14159265 : 0.0);
    vec2 foot = campFoot(phase);
    vec2 hip = vec2(0.82, 0.0), delta = foot - hip;
    float d = max(0.001, length(delta));
    float along = (0.42 * 0.42 - 0.38 * 0.38 + d * d) / (2.0 * d);
    vec2 knee = hip + delta * along / d + vec2(delta.y, -delta.x) / d * sqrt(max(0.0, 0.42 * 0.42 - along * along));
    float angle = p.y > 0.45 ? atan(-knee.y, hip.x - knee.x) : atan(knee.y - foot.y, knee.x - foot.x);
    vec2 origin = p.y > 0.45 ? vec2(0.87, 0.0) : vec2(0.45, 0.0);
    vec2 target = p.y > 0.45 ? hip : knee;
    vec2 q = p.yz - origin;
    vec2 leg = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * q + target;
    // 鞋底保持水平，摆动末段轻微先落后跟；不拉伸整只靴子。
    float shoe = 1.0 - smoothstep(0.12, 0.22, p.y);
    leg = mix(leg, vec2(p.y + foot.x - 0.07, p.z + foot.y), shoe);
    p.yz = mix(p.yz, leg, 1.0 - smoothstep(0.84, 0.94, p.y));
  }
#endif
  float upper = smoothstep(0.8, 1.18, p.y);
#ifdef CAMP_RIGID
  upper = 1.0;
#endif
  float sway = sin(campPhase) * 0.012 * upper;
  p.xz = mat2(cos(sway), sin(sway), -sin(sway), cos(sway)) * p.xz;
  p.y += upper * (-0.045 + 0.008 * cos(campPhase * 2.0));
#else
  vec3 b = (campBody * vec4(p, 1.0)).xyz;
  if (b.z > -0.72 && b.z < -0.28 && length(b.xy) > 0.395) {
    float c = cos(campPhase), s = sin(campPhase);
    b.xy = mat2(c, s, -s, c) * b.xy;
    p = (campAsset * vec4(b, 1.0)).xyz;
  }
#endif
  return p;
}
vec3 campNormal(vec3 n, vec3 p) {
#ifdef CAMP_WALK
  // 数值 Jacobian 也修正靴子、膝盖和上身的法线，不沿用静态照明。
  vec3 tangent = normalize(cross(n, abs(n.y) < 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0)));
  vec3 bitangent = cross(n, tangent);
  vec3 centre = campDeform(p);
  n = normalize(cross(campDeform(p + tangent * 0.001) - centre, campDeform(p + bitangent * 0.001) - centre));
#else
  vec3 b = (campBody * vec4(p, 1.0)).xyz;
  if (b.z > -0.72 && b.z < -0.28 && length(b.xy) > 0.395) {
    n = (campBody * vec4(n, 0.0)).xyz;
    n.xy = mat2(cos(campPhase), sin(campPhase), -sin(campPhase), cos(campPhase)) * n.xy;
    n = (campAsset * vec4(n, 0.0)).xyz;
  }
#endif
  return n;
}
`;
const GAIT_SECONDS = 1;
export function footPose(phase: number, stride: number) {
  const u = ((phase / TAU) % 1 + 1) % 1, swing = THREE.MathUtils.clamp((u - 0.62) / 0.38, 0, 1);
  return { stance: u < 0.62, z: u < 0.62 ? stride * (0.5 - u / 0.62) : stride * (-0.5 + smooth(swing)), lift: 0.11 * Math.sin(swing * Math.PI) };
}
export function gearRetraction(time: number) {
  if (time < 27) return 0;
  if (time < 31) return smooth((time - 27) / 4);
  if (time < 51) return 1;
  if (time < 55) return 1 - smooth((time - 51) / 4);
  return 0;
}
// 从路径的切线积分出连续转向角，跨过 ±π 时车轮不会跳转。
const turnTables = new Map<THREE.CatmullRomCurve3, number[]>();
function turning(path: THREE.CatmullRomCurve3, u: number) {
  let table = turnTables.get(path);
  if (!table) {
    table = []; let previous = 0;
    for (let i = 0; i <= 512; i++) {
      const t = path.getTangentAt((i % 512) / 512), h = Math.atan2(t.x, t.z);
      previous = i ? previous + Math.atan2(Math.sin(h - previous), Math.cos(h - previous)) : h;
      table.push(previous);
    }
    turnTables.set(path, table);
  }
  const turns = Math.floor(u), f = (u - turns) * 512, i = Math.min(511, Math.floor(f));
  return turns * (table[512] - table[0]) + THREE.MathUtils.lerp(table[i], table[i + 1], f - i) - table[0];
}

interface Actor extends RenderedInstance {
  kind: 'jeep' | 'armor' | 'patrol' | 'aircraft';
  index: number;
  total: number;
  phase: { value: number };
  cleanup: (() => void)[];
  rig?: MechanicalRig;
  gear: { value: number };
  stride: { value: number };
  distance: number;
  turn: number;
  throttle: number;
  heading: number;
  pitch: number;
  bank: number;
}
function animateMaterial(actor: Pick<Actor, 'model' | 'kind' | 'phase' | 'stride' | 'gear' | 'cleanup'>) {
  actor.model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const original = object.material, oldDepth = object.customDepthMaterial;
    object.geometry.computeBoundingBox();
    const rigid = (Array.isArray(original) ? original : [original]).some(m => /gunSteel|wood|steel/i.test(m.name)) && (object.geometry.boundingBox?.max.y ?? 2) > 0.9;
    const wrap = (source: THREE.Material) => {
      const material = source.clone(), prior = source.onBeforeCompile, key = source.customProgramCacheKey();
      // Three 的标准材质 clone 会重置 defines；保留上游程序化布料、涂装与金属分支。
      if ((source as THREE.MeshStandardMaterial).defines) (material as THREE.MeshStandardMaterial).defines = { ...(source as THREE.MeshStandardMaterial).defines };
      material.onBeforeCompile = (shader, renderer) => {
        prior.call(material, shader, renderer);
        shader.uniforms.campPhase = actor.phase;
        shader.uniforms.campStride = actor.stride;
        shader.uniforms.campGear = actor.gear;
        if (actor.kind === 'aircraft') {
          shader.fragmentShader = 'uniform float campGear;\n' + shader.fragmentShader.replace('if (lower && by < -0.35)', 'if (lower && by < -0.35 && campGear < 0.99)');
        }
        shader.uniforms.campBody = { value: ASSET_TO_BODY };
        shader.uniforms.campAsset = { value: BODY_TO_ASSET };
        shader.vertexShader = (actor.kind === 'patrol' ? '#define CAMP_WALK\n' + (rigid ? '#define CAMP_RIGID\n' : '') : '') + DECLARATIONS + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = campDeform(transformed);');
        shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = campNormal(objectNormal, position);');
      };
      material.customProgramCacheKey = () => key + '|camp-v2-' + actor.kind + '-' + rigid;
      return material;
    };
    const materials = (Array.isArray(original) ? original : [original]).map(wrap);
    const depthSource = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    const depth = wrap(depthSource); depthSource.dispose();
    object.material = Array.isArray(original) ? materials : materials[0]; object.customDepthMaterial = depth;
    actor.cleanup.push(() => { object.material = original; object.customDepthMaterial = oldDepth; materials.forEach(m => m.dispose()); depth.dispose(); });
  });
}

/** 复用营地的步态、螺旋桨和阴影变形；每个战斗实例拥有独立 uniforms。 */
export function proceduralMotion(model: THREE.Group, kind: 'patrol' | 'aircraft') {
  const actor = { model, kind, phase: { value: 0 }, stride: { value: 0 }, gear: { value: 0 }, cleanup: [] as (() => void)[] };
  animateMaterial(actor);
  return { phase: actor.phase, stride: actor.stride, gear: actor.gear, dispose: () => actor.cleanup.forEach(f => f()) };
}

export class CampMotion {
  active = false;
  playing = false;
  preparing = false;
  time = 0;
  speed = 1;
  onChange: () => void = () => undefined;
  private lastNow: number | null = null;
  private actors: Actor[] = [];
  readonly audio = new CampAudio();
  private uiAt = 0;
  private cycles = 0;
  private templates = new Map<string, THREE.Group>();
  constructor(private scene: SceneController, private asset: (instance: RenderedInstance) => { def: AssetDef; config: AssetConfig }) {
    this.audio.onChange = () => this.onChange();
  }

  async enter() {
    if (this.preparing || this.active) return;
    this.preparing = true; this.onChange();
    try {
      const instances = this.scene.renderedInstances();
      const categories: [Actor['kind'], string[]][] = [
        ['jeep', ['us-willys-mb']], ['armor', ['us-m4a3-sherman', 'us-m18-hellcat']],
        ['patrol', ['us-rifleman']], ['aircraft', ['us-p51d']],
      ];
      for (const [kind, ids] of categories) {
        const members = instances.filter(i => ids.includes(i.assetId));
        for (const [index, i] of members.entries()) {
          const actor: Actor = { ...i, kind, index, total: members.length, phase: { value: 0 }, cleanup: [], heading: 0, pitch: 0, bank: 0, gear: { value: 0 }, stride: { value: PATROL_PATH.getLength() / 45 * GAIT_SECONDS * 0.62 }, distance: 0, turn: 0, throttle: 0 };
          if (kind !== 'patrol') {
            const { def, config } = this.asset(i), key = def.id + JSON.stringify(config);
            let template = this.templates.get(key);
            if (!template) { template = await buildMotionTemplate(def, config); this.templates.set(key, template); }
            const model = template.clone(true), visible = i.model.visible;
            i.model.visible = false; i.root.add(model); actor.model = model;
            actor.rig = new MechanicalRig(model, def.id);
            actor.cleanup.push(() => { model.removeFromParent(); i.model.visible = visible; });
          }
          if (kind === 'patrol' || kind === 'aircraft') animateMaterial(actor);
          this.actors.push(actor);
        }
      }
      this.active = true; this.time = 0; this.apply();
      await compileOffThread(this.scene.studio);
      this.scene.onAnimate = this.tick;
      this.play();
    } catch (error) { this.exit(); throw error; }
    finally { this.preparing = false; this.onChange(); }
  }

  play() { if (!this.active) return; if (document.hidden) { this.pause(); return; } this.playing = true; this.lastNow = null; this.audio.play(); this.scene.requestRender(); this.onChange(); }
  pause() { this.audio.pause(); this.playing = false; this.lastNow = null; this.scene.requestRender(); this.onChange(); }
  seek(time: number) { if (!this.active) return; this.pause(); this.cycles = 0; this.time = THREE.MathUtils.clamp(time, 0, CYCLE_SECONDS); this.apply(); this.scene.requestRender(); this.onChange(); }
  setSpeed(speed: number) { if ([0.5, 1, 2].includes(speed)) { this.speed = speed; this.lastNow = null; this.audio.reset(); this.onChange(); } }
  restart() { this.seek(0); this.play(); }
  exit() {
    this.audio.exit();
    this.playing = false; this.active = false; this.lastNow = null; this.time = 0; this.cycles = 0; this.scene.onAnimate = null;
    for (const a of this.actors) a.cleanup.forEach(f => f());
    this.actors = [];
    const geos = new Set<THREE.BufferGeometry>();
    this.templates.forEach(t => t.traverse(o => { if (o instanceof THREE.Mesh) geos.add(o.geometry); }));
    geos.forEach(g => g.dispose()); this.templates.clear(); this.scene.sync(); this.onChange();
  }
  private tick = (now: number) => {
    if (!this.playing || !this.active) return false;
    // 后台标签页自动暂停；下一次继续从此刻运行，不累计隐藏时长。
    if (document.hidden) { this.pause(); return false; }
    if (this.lastNow !== null) {
      const elapsed = this.time + (now - this.lastNow) / 1000 * this.speed;
      this.cycles += Math.floor(elapsed / CYCLE_SECONDS); this.time = elapsed % CYCLE_SECONDS;
    }
    this.lastNow = now; this.apply();
    this.audio.update(this.actors.map(a => ({ kind: a.kind, index: a.index, position: a.root.position, phase: a.phase.value, throttle: a.throttle })), this.scene.studio.camera, this.speed);
    if (now - this.uiAt > 100) { this.uiAt = now; this.onChange(); }
    return true;
  };
  private apply() {
    for (const a of this.actors) {
      a.pitch = 0; a.bank = 0; a.gear.value = 0;
      if (a.kind === 'aircraft') {
        a.phase.value = this.time * TAU * 7;
        a.throttle = a.index === 0 ? (this.time >= 18 && this.time < 50 ? 1 : 0.35) : 0.12;
        a.gear.value = a.index === 0 ? gearRetraction(this.time) : 0;
        a.rig?.update(0, 0, a.gear.value);
        if (a.index !== 0) continue; // 一架执行完整起降，另一架留在停机位，避免跑道交叉。
        const s = FLIGHT.find(s => this.time < s.end) ?? FLIGHT.at(-1)!;
        const u = THREE.MathUtils.clamp((this.time - s.start) / (s.end - s.start), 0, 1);
        const pos = flightPosition(this.time);
        const tangent = flightPosition(Math.min(90, this.time + 0.2)).sub(flightPosition(Math.max(0, this.time - 0.2))).normalize();
        a.root.position.copy(pos); a.heading = Math.atan2(tangent.x, tangent.z);
        if (s.start === 86) a.heading = 0;
        else if (s.endHeading !== undefined) {
          const v = smooth(THREE.MathUtils.clamp((u - 0.65) / 0.35, 0, 1));
          a.heading += Math.atan2(Math.sin(s.endHeading - a.heading), Math.cos(s.endHeading - a.heading)) * v;
        }
        if (s.flying && pos.y > 0.03) {
          // 原资产是机尾低的停机姿态；抵消 10° 基础仰角，再跟随轨迹俯仰。
          const airborne = smooth(Math.min(1, pos.y / 2));
          a.pitch = (THREE.MathUtils.degToRad(10) - Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z))) * airborne;
          const ahead = s.path.getTangentAt(Math.min(1, u + 0.035));
          const turn = Math.atan2(tangent.z * ahead.x - tangent.x * ahead.z, tangent.x * ahead.x + tangent.z * ahead.z);
          a.bank = THREE.MathUtils.clamp(-turn * 1.3, -0.32, 0.32) * airborne;
        }
      } else {
        const path = a.kind === 'jeep' ? JEEP_ROAD : a.kind === 'armor' ? ARMOR_ROAD : PATROL_PATH;
        // 地面循环时长整除总周期，使 90→0 秒接缝处没有位置跳跃。
        const period = a.kind === 'jeep' ? 30 : 45;
        const progress = (this.time + this.cycles * CYCLE_SECONDS) / period + a.index / a.total;
        const u = progress % 1;
        a.distance = path.getLength() * (this.time + this.cycles * CYCLE_SECONDS) / period;
        a.turn = turning(path, progress) - turning(path, a.index / a.total);
        a.throttle = 0.55 + 0.12 * Math.sin(this.time * 1.2 + a.index);
        a.rig?.update(a.distance, a.turn, 0);
        a.root.position.copy(path.getPointAt(u));
        const tangent = path.getTangentAt(u); a.heading = Math.atan2(tangent.x, tangent.z);
        if (a.kind === 'patrol') {
          a.phase.value = this.time * TAU / GAIT_SECONDS + a.index * 0.7;
          a.root.position.y = 0;
        }
      }
      if (a.kind === 'jeep') a.root.position.y = 0.016;
      a.root.quaternion.setFromEuler(new THREE.Euler(a.pitch, a.heading, a.bank, 'YXZ'));
      a.root.updateMatrixWorld(true);
    }
  }
  getState() {
    const phase = (FLIGHT.find(s => this.time < s.end) ?? FLIGHT.at(-1)!).label;
    return { active: this.active, playing: this.playing, preparing: this.preparing, time: this.time, duration: CYCLE_SECONDS, speed: this.speed, phase, audio: this.audio.getState(),
      actors: this.actors.map(a => ({ groupId: a.groupId, slot: a.slot, assetId: a.assetId, kind: a.kind,
        position: a.root.position.toArray(), quaternion: a.root.quaternion.toArray(), gaitOrPropeller: a.phase.value, gearRetraction: a.gear.value, distance: a.distance, turn: a.turn,
        joints: a.rig?.getState() ?? null, feet: a.kind === 'patrol' ? [footPose(a.phase.value, a.stride.value), footPose(a.phase.value + Math.PI, a.stride.value)] : null })) };
  }
}
