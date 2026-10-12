/**
 * Field kit fitted to a posed Red Army soldier (shared/human buildSoldier + the Soviet gear pieces):
 * waist belt with the open-frame buckle, ammunition pouches that follow the weapon, grenade pouch
 * (left hip), MPL-50 shovel in its cover (right hip), glass flask in its cover at the right rear hip
 * on a strap over the left shoulder, veshmeshok on the back with its strap over both shoulders and
 * under the arms, skatka (rolled greatcoat) over the left shoulder with the tie at the right hip,
 * and the SSh-40 helmet (worn chinstrap) or the pilotka.
 *
 * Everything is placed with the fitting API (belt path, mount frames, head frame) and straps are
 * draped over the body AND over whatever lies beneath them (belt, pouches, other straps), so
 * nothing floats and nothing cuts through the uniform or other gear.
 *
 * Triangle budget: the gear pieces are decimated once per session (quadric decimation, <= 0.5 mm
 * error; boundaries and creases kept) so a fully equipped soldier stays within the soldier budget.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { G, M } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { remapWoodGrain, type SoldierBuild } from '../../shared/human/soldier';
import { headSDF } from '../../shared/human/head';
import { clothMaterial } from '../../shared/human/uniform';
import { simplify } from '../../shared/human/simplify';
import { raycast, type SDF } from '../../shared/human/sdfx';
import type { BeltPath } from '../../shared/human/fit';
import {
  buildSSh40Helmet,
  buildSSh40Chinstrap,
  SSH40_FIT,
  buildM1937CartridgePouch,
  buildPPShDrumPouch,
  buildPPShBoxPouch,
  buildGrenadePouch,
  buildSovietCanteen,
  buildVeshmeshok,
  buildSkatkaAlong,
  buildEnlistedBuckle,
  buildMPL50Gear,
  SU_BELT,
} from '../gear';
import { SU } from '../gear/palette';
import { pilotkaGeometry } from './pilotka';
import { TUNIC_CLOTH } from './uniform';
import { union, boxField, ellipsoidField, beltField, beltAngleAtArc, drape } from './drape';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

export type Ammo = 'rifle' | 'drum' | 'box' | 'none';

export interface KitSpec {
  headgear: 'helmet' | 'pilotka';
  ammo: Ammo;
  grenades: boolean;
  shovel: boolean;
  canteen: boolean;
  veshmeshok: boolean;
  skatka: boolean;
  /** Per-soldier variation seed (greatcoat roll lumps). */
  seed?: number;
}

/** Where the kit goes (angles in the fitting convention: 0 = front, +90 = the soldier's left). */
export const LAYOUT = {
  /** Arc length from the front centre to the centre of each front pouch (m). */
  frontPouchArc: 0.118,
  drumAngle: -58,
  grenadeAngle: 100,
  shovelAngle: -112,
  /** Roll of the shovel about the outward axis (deg, - = handle towards the back). */
  shovelRoll: -8,
  canteen: { angle: -146, height: 0.94 },
  pack: { height: 1.41 },
  skatkaTie: { angle: -134, height: 0.99 },
  /** x of the strap centre lines where they cross the shoulders (m, +X = left). */
  shoulderX: { flask: 0.128, pack: 0.106, skatka: 0.15 },
};

/**
 * Sewing thread (stitch rows, ~1 mm) is left off the worn pieces: invisible at figure viewing
 * distances, and it would take ~15% of the soldier's triangle budget. The loose display pieces keep it.
 */
const DROP = new Set([SU.thread().name, SU.threadDark().name]);

/** Triangle targets and decimation tolerance (m) for the worn gear pieces. */
const LEAN: Record<string, [number, number]> = {
  buckle: [2400, 0.0003],
  m1937: [3800, 0.0008],
  drum: [5000, 0.0009],
  box: [3000, 0.0008],
  grenades: [3600, 0.0009],
  mpl50: [5600, 0.0009],
  flask: [4400, 0.0009],
  veshmeshok: [5600, 0.0011],
  helmet: [6400, 0.0005],
  skatka: [6500, 0.0013],
};

/**
 * Near-identical small-part materials merged into the main ones on the worn pieces (fewer draw
 * calls per soldier): flask cover cloth -> pouch canvas, drawstring cord / helmet chinstrap webbing
 * -> strap canvas, helmet liner oilcloth -> leather, liner rivet backs -> dark steel.
 */
const REMAP = new Map<string, THREE.Material>([
  [SU.cloth().name, SU.canvas()],
  [SU.cord().name, SU.canvasStrap()],
  [SU.webbing().name, SU.canvasStrap()],
  [SU.linerOilcloth().name, SU.leather()],
  [M.steel().name, SU.darkSteel()],
]);
function remapMaterials(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const r = REMAP.get((m.material as THREE.Material).name);
    if (r) m.material = r;
  });
}

// ------------------------------------------------------------------ decimation

function trisOf(g: THREE.BufferGeometry): number {
  return (g.index ? g.index.count : g.attributes.position.count) / 3;
}

/** Decimate every mesh under `obj` in proportion so the whole object has about `target` triangles. */
export function leanObject(obj: THREE.Object3D, target: number, maxError = 0.0005): void {
  const meshes: THREE.Mesh[] = [];
  const drop: THREE.Object3D[] = [];
  let total = 0;
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    if (DROP.has((m.material as THREE.Material).name)) {
      drop.push(m);
      return;
    }
    meshes.push(m);
    total += trisOf(m.geometry);
  });
  for (const d of drop) d.removeFromParent();
  if (total <= target) return;
  const ratio = target / total;
  for (const m of meshes) {
    const n = trisOf(m.geometry);
    if (n < 400) continue;
    let g = m.geometry;
    if (!g.index) {
      const c = new THREE.BufferGeometry();
      c.setAttribute('position', g.attributes.position);
      if (g.attributes.normal) c.setAttribute('normal', g.attributes.normal);
      if (g.attributes.color) c.setAttribute('color', g.attributes.color);
      g = mergeVertices(c, 1e-5);
    }
    m.geometry = simplify(g, Math.max(160, Math.round(n * ratio)), { maxError });
  }
}

// ------------------------------------------------------------------ gear piece cache

const pieces = new Map<string, GearPiece>();
function piece(key: string, make: () => GearPiece): GearPiece {
  let p = pieces.get(key);
  if (!p) {
    p = make();
    const obj = p.object.clone(true);
    const ln = LEAN[key];
    if (ln) leanObject(obj, ln[0], ln[1]);
    remapMaterials(obj);
    obj.updateMatrixWorld(true);
    p = { ...p, object: obj };
    pieces.set(key, p);
  }
  return p;
}
const boxes = new Map<string, THREE.Box3>();
function localBox(p: GearPiece): THREE.Box3 {
  let b = boxes.get(p.id);
  if (!b) {
    b = new THREE.Box3().setFromObject(p.object, true);
    boxes.set(p.id, b);
  }
  return b;
}

/**
 * Back-face footprints [x0, x1, y0, y1] (gear-local) where the bounding box is a poor fit: the
 * MPL-50 is a wide cover on top and a thin handle below it.
 */
const FOOTPRINT: Record<string, [number, number, number, number][]> = {
  'su-mpl50-in-cover': [
    [-0.075, 0.075, -0.14, 0.05],
    [0, 0, -0.44, -0.14],
  ],
};

/** Belt items: gear z = 0 is the loop on the body; the belt outer face is at z = 0.0065. */
const BELT_SHIFT = new THREE.Matrix4().makeTranslation(0, 0, -(SU_BELT.loopT + SU_BELT.beltT));

function place(p: GearPiece, m: THREE.Matrix4, name = p.id): THREE.Group {
  const holder = new THREE.Group();
  holder.name = `gear:${name}`;
  holder.add(p.object.clone(true));
  holder.applyMatrix4(m);
  remapWoodGrain(holder, m);
  return holder;
}

/**
 * Belt mount (same rules as fit.mountFrame for belt items, on a belt path computed once): the
 * piece's back face (gear z = belt outer face) sits on the belt at `angle`; the part below the belt
 * swings out until it rests on the body; then it is pushed out until the whole back face clears.
 */
function beltMount(belt: BeltPath, f: SDF, p: GearPiece, angle: number, roll = 0, gap = 0.0006): THREE.Matrix4 {
  const base = belt.frameAt(angle);
  if (roll) base.multiply(new THREE.Matrix4().makeRotationZ(roll * D2R));
  const b = localBox(p);
  const samples: THREE.Vector3[] = [];
  const grid = (x0: number, x1: number, y0: number, y1: number, nx = 6, ny = 6) => {
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) samples.push(V(x0 + ((x1 - x0) * i) / nx, y0 + ((y1 - y0) * j) / ny, 0));
  };
  const fp = FOOTPRINT[p.id];
  if (fp) for (const r of fp) grid(r[0], r[1], r[2], r[3], r[0] === r[1] ? 0 : 6);
  else grid(b.min.x, b.max.x, b.min.y, b.max.y);
  const w = V();
  const worst = (m: THREE.Matrix4, below: boolean) => {
    let pen = 0;
    for (const q of samples) {
      if (below && q.y > -0.005) continue;
      w.copy(q).applyMatrix4(m);
      const d = f(w.x, w.y, w.z) - gap;
      if (-d > pen) pen = -d;
    }
    return pen;
  };
  const tilted = (a: number) => base.clone().multiply(new THREE.Matrix4().makeRotationX(-a));
  let m = base;
  if (worst(base, true) > 0) {
    let lo = 0, hi = 45 * D2R;
    if (worst(tilted(hi), true) > 0) lo = hi;
    else for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (worst(tilted(mid), true) > 0) lo = mid; else hi = mid; }
    m = tilted(hi);
  }
  const pen = worst(m, false);
  if (pen > 0) m = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, pen + 1e-4));
  return m.clone().multiply(BELT_SHIFT);
}

/** A strap band as a field (nearest sample, box section) so other straps can lie over it. */
function strapField(points: THREE.Vector3[], normals: THREE.Vector3[], width: number, thickness: number): SDF {
  const n = points.length;
  const tang = points.map((_p, i) => points[Math.min(n - 1, i + 1)].clone().sub(points[Math.max(0, i - 1)]).normalize());
  const side = normals.map((nn, i) => new THREE.Vector3().crossVectors(tang[i], nn).normalize());
  const box = new THREE.Box3().setFromPoints(points).expandByScalar(width + 0.05);
  const hw = width / 2, ht = thickness / 2;
  return (x, y, z) => {
    // outside the (expanded) bounds: distance to the bounds is a lower bound with a sensible gradient
    const ox0 = Math.max(box.min.x - x, 0, x - box.max.x), oy0 = Math.max(box.min.y - y, 0, y - box.max.y), oz0 = Math.max(box.min.z - z, 0, z - box.max.z);
    if (ox0 > 0 || oy0 > 0 || oz0 > 0) return Math.sqrt(ox0 * ox0 + oy0 * oy0 + oz0 * oz0) + 0.05;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const d = (x - p.x) ** 2 + (y - p.y) ** 2 + (z - p.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    const p = points[best], nn = normals[best], s = side[best];
    const rx = x - p.x, ry = y - p.y, rz = z - p.z;
    const qa = Math.abs(rx * s.x + ry * s.y + rz * s.z) - hw;
    const qb = Math.abs(rx * nn.x + ry * nn.y + rz * nn.z) - ht;
    const oa = Math.max(qa, 0), ob = Math.max(qb, 0);
    return Math.sqrt(oa * oa + ob * ob) + Math.min(Math.max(qa, qb), 0);
  };
}

function strapMesh(points: THREE.Vector3[], normals: THREE.Vector3[], width: number, thickness: number, mat: THREE.Material, name: string): THREE.Mesh {
  const geo = G.strap(points, width, thickness, normals, { smooth: false });
  const m = new THREE.Mesh(geo, mat);
  m.name = `strap:${name}`;
  return m;
}

// ------------------------------------------------------------------ headgear

function grad(f: SDF, p: THREE.Vector3, h = 0.0008): THREE.Vector3 {
  return V(f(p.x + h, p.y, p.z) - f(p.x - h, p.y, p.z), f(p.x, p.y + h, p.z) - f(p.x, p.y - h, p.z), f(p.x, p.y, p.z + h) - f(p.x, p.y, p.z - h)).normalize();
}

let headField: SDF | null = null;

function helmet(sol: SoldierBuild): THREE.Object3D[] {
  const hf = sol.fit.headFrame({ tilt: -2, lift: -0.008 });
  const h = piece('helmet', () => buildSSh40Helmet({ chinstrap: 'none' }));
  const out: THREE.Object3D[] = [place(h, hf.band, 'ssh40')];
  // worn chinstrap: from the left D-ring, down the cheek, under the chin, up to the right D-ring
  const toHead = hf.head.clone().invert().multiply(hf.band); // helmet-local -> head-local
  const toHelmet = toHead.clone().invert();
  const f = (headField ??= headSDF());
  const off = 0.0014;
  const onSkin = (p: THREE.Vector3) => {
    for (let i = 0; i < 12; i++) {
      const d = f(p.x, p.y, p.z) - off;
      if (Math.abs(d) < 2e-5) break;
      p.addScaledVector(grad(f, p), -d);
    }
    return p;
  };
  const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
  const side = (s: number) => [
    [0.064 * s, -0.03, 0.028],
    [0.057 * s, -0.065, 0.04],
    [0.041 * s, -0.092, 0.052],
  ];
  const mid: number[][] = [...side(1), [0, -0.107, 0.058], ...side(-1).reverse()];
  pts.push(SSH40_FIT.dRings[0].clone());
  nrm.push(V(1, 0, 0));
  for (const [x, y, z] of mid) {
    const p = onSkin(V(x, y, z));
    const n = grad(f, p);
    pts.push(p.applyMatrix4(toHelmet));
    nrm.push(n.transformDirection(toHelmet));
  }
  pts.push(SSH40_FIT.dRings[1].clone());
  nrm.push(V(-1, 0, 0));
  const strap = buildSSh40Chinstrap(pts, nrm, 0.72);
  remapMaterials(strap);
  const holder = new THREE.Group();
  holder.name = 'gear:ssh40-chinstrap';
  holder.add(strap);
  holder.applyMatrix4(hf.band);
  out.push(holder);
  return out;
}

function pilotka(sol: SoldierBuild): THREE.Object3D[] {
  const hf = sol.fit.headFrame();
  const g = pilotkaGeometry();
  const cap = new THREE.Mesh(g.cap, clothMaterial(TUNIC_CLOTH));
  cap.name = 'gear:pilotka';
  cap.applyMatrix4(hf.head);
  const star = new THREE.Mesh(g.star, M.paint(0x9e1a1c, { roughness: 0.3, clearcoat: 0.6, wear: 0.15, wearColor: 0xb08d57, wearMetalness: 1, name: 'su-star-enamel' }));
  star.name = 'gear:pilotka-star';
  star.applyMatrix4(hf.head);
  return [cap, star];
}

// ------------------------------------------------------------------ the kit

export function fitKit(sol: SoldierBuild, k: KitSpec): THREE.Object3D[] {
  const fit = sol.fit;
  const out: THREE.Object3D[] = [];
  const torso = fit.field('torso');
  const fields: SDF[] = [torso];
  const up = V(0, 1, 0);
  // shoulder boards (stiff, 5 mm, button at the collar end): straps over the shoulders ride on them
  for (const side of ['l', 'r']) {
    const fr = sol.uniform.anchors[`shoulder-strap-${side}`];
    if (!fr) continue;
    const m = new THREE.Matrix4().makeBasis(fr.x, fr.y, fr.z).setPosition(fr.o);
    fields.push(boxField(m, new THREE.Box3(V(-0.034, -0.074, -0.012), V(0.034, 0.074, 0.0098)), 0.003));
  }
  const sp = (angle: number, height: number) => fit.surfacePoint({ angle, height }).position;
  /** Top of the shoulder at x (asset space), found by a ray from above. */
  const shoulderTop = (x: number) => {
    const z = fit.axisPoint(1.46).z;
    return fit.surfacePoint({ from: V(x, 1.9, z), dir: V(0, -1, 0) }).position;
  };

  // ---- belt + buckle
  const belt = fit.beltPath();
  const bw = fit.belt.width, bt = fit.belt.thickness;
  const beltGeo = G.strap(belt.points, bw, bt, belt.normals, { closed: true, smooth: false });
  const beltMesh = new THREE.Mesh(beltGeo, SU.leather());
  beltMesh.name = 'belt';
  out.push(beltMesh);
  const beltF = beltField(belt, fit.trunkUp(fit.belt.height), bw, bt + 0.001);
  fields.push(beltF);
  out.push(place(piece('buckle', buildEnlistedBuckle), belt.frameAt(0), 'buckle'));

  const onBelt = (p: GearPiece, angle: number, name: string, roll = 0) => {
    const m = beltMount(belt, torso, p, angle, roll);
    out.push(place(p, m, name));
    fields.push(boxField(m, localBox(p), 0.008));
    return m;
  };

  // ---- ammunition (follows the weapon)
  const aL = beltAngleAtArc(belt, LAYOUT.frontPouchArc), aR = beltAngleAtArc(belt, -LAYOUT.frontPouchArc);
  if (k.ammo === 'rifle') {
    const p = piece('m1937', buildM1937CartridgePouch);
    onBelt(p, aL, 'm1937-l');
    onBelt(p, aR, 'm1937-r');
  } else if (k.ammo === 'drum') {
    onBelt(piece('drum', buildPPShDrumPouch), LAYOUT.drumAngle, 'ppsh-drum-pouch');
  } else if (k.ammo === 'box') {
    const p = piece('box', buildPPShBoxPouch);
    onBelt(p, aL, 'ppsh-box-pouch-l');
    onBelt(p, aR, 'ppsh-box-pouch-r');
  }
  if (k.grenades) onBelt(piece('grenades', buildGrenadePouch), LAYOUT.grenadeAngle, 'grenade-pouch');
  if (k.shovel) onBelt(piece('mpl50', () => buildMPL50Gear()), LAYOUT.shovelAngle, 'mpl50', LAYOUT.shovelRoll);

  const strapMat = SU.canvasStrap();

  // ---- flask on the right rear hip, strap over the left shoulder
  if (k.canteen) {
    const c = piece('flask', () => buildSovietCanteen({ strap: 'stubs' }));
    const m = fit.mountFrame('hip', { piece: c, angle: LAYOUT.canteen.angle, height: LAYOUT.canteen.height });
    out.push(place(c, m, 'flask'));
    fields.push(boxField(m, localBox(c), 0.01));
    const a = (c.strapAnchors ?? []).map((p) => p.clone().applyMatrix4(m));
    const xs = V(1, 0, 0).transformDirection(m);
    if (a.length === 2) {
      const [front, rear] = a;
      const ctrl = [
        front,
        front.clone().addScaledVector(up, 0.05),
        sp(-118, 1.12),
        sp(-66, 1.25),
        sp(-14, 1.34),
        sp(34, 1.42),
        shoulderTop(LAYOUT.shoulderX.flask),
        sp(132, 1.4),
        sp(174, 1.28),
        sp(-156, 1.13),
        rear.clone().addScaledVector(up, 0.05),
        rear,
      ];
      const W = 0.022, T = 0.0022;
      const d = drape(union(fields), ctrl, T / 2 + 0.0008, { pin: true, tension: 0.55, step: 0.016, endNormals: [xs.clone(), xs.clone().negate()], blend: 0.06 });
      out.push(strapMesh(d.points, d.normals, W, T, strapMat, 'flask'));
      fields.push(strapField(d.points, d.normals, W, T + 0.001));
    }
  }

  // ---- veshmeshok on the back
  if (k.veshmeshok) {
    const v = piece('veshmeshok', buildVeshmeshok);
    const m = fit.mountFrame('back', { piece: v, height: LAYOUT.pack.height });
    out.push(place(v, m, 'veshmeshok'));
    const an = (v.strapAnchors ?? []).map((p) => p.clone().applyMatrix4(m));
    if (an.length === 4) {
      const base = union(fields);
      const legs: SDF[] = [];
      for (const s of [1, -1]) {
        // s = +1: gear +X = the wearer's right (-X in asset space)
        const top = s > 0 ? an[0] : an[1], end = s > 0 ? an[2] : an[3];
        const a = (deg: number) => -s * deg;
        const ctrl = [top, shoulderTop(-s * LAYOUT.shoulderX.pack), sp(a(38), 1.38), sp(a(50), 1.27), sp(a(90), 1.2), sp(a(126), 1.12), end];
        const d = drape(base, ctrl, 0.0042 / 2 + 0.0008, { pin: true, tension: 0.6, step: 0.016 });
        out.push(strapMesh(d.points, d.normals, 0.032, 0.0042, strapMat, `veshmeshok-${s > 0 ? 'r' : 'l'}`));
        legs.push(strapField(d.points, d.normals, 0.032, 0.0052));
      }
      fields.push(...legs);
    }
    // the sack is rounded: an ellipsoid round its body (without the gathered neck)
    const b = localBox(v);
    const c = V((b.min.x + b.max.x) / 2, b.min.y + 0.16, (b.min.z + b.max.z) / 2);
    fields.push(ellipsoidField(m, c, V((b.max.x - b.min.x) / 2 + 0.004, 0.17, (b.max.z - b.min.z) / 2 + 0.004)));
  }

  // ---- skatka: a ring in the sash plane through the top of the left shoulder and the right hip.
  // Control points: exits of rays from inside the trunk (torso + belt only: smooth, no gear), then
  // draped over everything it lies on (belt gear, flask strap) at the roll radius.
  if (k.skatka) {
    const D = 0.1;
    const smooth = union([torso, beltF]);
    const S = shoulderTop(LAYOUT.shoulderX.skatka);
    const H = sp(LAYOUT.skatkaTie.angle, LAYOUT.skatkaTie.height);
    const e1 = S.clone().sub(H).normalize();
    const e2 = V(0, 0, 1).addScaledVector(e1, -e1.z).normalize();
    const C = S.clone().add(H).multiplyScalar(0.5);
    const ax = fit.axisPoint(C.y);
    C.x = ax.x * 0.5 + C.x * 0.5;
    C.z = ax.z;
    const ctrl: THREE.Vector3[] = [];
    const N = 24;
    for (let i = 0; i < N; i++) {
      const th = Math.PI + (i / N) * Math.PI * 2;
      const dir = e1.clone().multiplyScalar(Math.cos(th)).addScaledVector(e2, Math.sin(th));
      ctrl.push(raycast(smooth, C, dir, 0.6) ?? C.clone().addScaledVector(dir, 0.15));
    }
    const d = drape(union(fields), ctrl, D / 2 + 0.002, { closed: true, tension: 0.6, step: 0.02 });
    const sk = buildSkatkaAlong(d.points, { diameter: D, seed: k.seed ?? 3 });
    leanObject(sk.object, LEAN.skatka[0], LEAN.skatka[1]);
    sk.object.name = 'gear:skatka';
    out.push(sk.object);
  }

  // ---- headgear
  out.push(...(k.headgear === 'helmet' ? helmet(sol) : pilotka(sol)));
  return out;
}
