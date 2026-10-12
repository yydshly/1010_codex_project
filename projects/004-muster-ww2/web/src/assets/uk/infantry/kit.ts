/**
 * 1937-pattern web equipment in battle order fitted to a posed British soldier (shared/human
 * buildSoldier + the uk/gear pieces):
 *  - waist belt along the fitted belt path (buckle at the front, two angled brace buckles behind);
 *  - basic pouches Mk III either side of the buckle;
 *  - braces from the buckle at the top back of each pouch over the shoulders, crossed in the
 *    middle of the back (cross-over loop), down through the rear belt buckles; the end of the
 *    brace from the LEFT shoulder runs on to the right hip and carries the water bottle;
 *  - water bottle Mk VII in its carrier at the right hip, bayonet frog on the left hip;
 *  - optional small pack (haversack) high on the back on the L-straps (hooked into the pouch
 *    buckles, long arm over the shoulder, short arm under the arm);
 *  - Mk II steel helmet with the chinstrap worn under the chin.
 *
 * Rigid pieces are placed on the fitted surfaces (belt frames / torso) and pushed out until
 * their back faces clear everything beneath them; straps are draped over the body AND over the
 * belt, the braces and the gear they cross, so nothing floats and nothing cuts through.
 *
 * Triangle budget: the gear pieces are decimated once per session (stitching dropped - invisible
 * at figure distances) and small-part materials are merged into the main ones (fewer draws).
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { GearPiece } from '../../shared/contracts';
import { remapWoodGrain, type SoldierBuild } from '../../shared/human/soldier';
import { headSDF } from '../../shared/human/head';
import { simplify } from '../../shared/human/simplify';
import type { SDF } from '../../shared/human/sdfx';
import type { Fit } from '../../shared/human/fit';
import {
  buildMk2Helmet,
  buildMk2Chinstrap,
  MK2_FIT,
  buildWaistBelt37,
  buildBasicPouch37,
  buildBracePair37,
  buildLStrap37,
  buildHaversack37,
  buildWaterBottle37,
  buildBayonetFrog37,
  BELT37,
  BRACE37,
  UK_GEAR_MATERIALS as UK,
} from '../gear';
import { union, boxField, beltField, beltAngleAtArc, drape, strapField, type DrapeResult } from './drape';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

export interface KitSpec {
  /** Small pack on the back (battle order, on the L-straps). */
  pack: boolean;
}

/** Where the kit goes (angles: 0 = front, +90 = the soldier's left). */
export const LAYOUT = {
  /** Arc length (m) from the buckle to each basic pouch centre. */
  pouchArc: 0.09,
  frogAngle: 104,
  bottle: { angle: -116, height: 0.972 },
  pack: { height: 1.34 },
  /** x of the strap centre lines on top of the shoulders (m, +X = left). */
  shoulderX: { brace: 0.112, lstrap: 0.132 },
};

// ------------------------------------------------------------------ materials / decimation

const DROP = new Set(['uk-thread', 'uk-felt-thread', 'uk-lanyard', 'uk-fibre']);
const REMAP: Record<string, () => THREE.Material> = {
  'uk-belting': UK.webStrap,
  'uk-chin-web': UK.webStrap,
  'uk-brass-dark': UK.brass,
  'uk-helmet-rim': UK.helmetPaint,
  'uk-oilcloth': UK.rubber,
  'uk-cork': UK.felt,
  'uk-tin': UK.blackSteel,
  'uk-bayonet-steel': UK.blackSteel,
  'uk-cord': UK.webStrap,
  'uk-enamel': UK.blackSteel,
  'uk-scabbard': UK.blackSteel,
};
function remapMaterials(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const r = REMAP[(m.material as THREE.Material).name];
    if (r) m.material = r();
  });
}

function trisOf(g: THREE.BufferGeometry): number {
  return (g.index ? g.index.count : g.attributes.position.count) / 3;
}

/** Drop stitching and decimate every mesh under `obj` in proportion to about `target` triangles. */
export function leanObject(obj: THREE.Object3D, target: number, maxError = 0.0006): void {
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
  remapMaterials(obj);
  if (total <= target) return;
  const ratio = target / total;
  for (const m of meshes) {
    const n = trisOf(m.geometry);
    if (n < 300) continue;
    let g = m.geometry;
    if (!g.index) {
      const c = new THREE.BufferGeometry();
      c.setAttribute('position', g.attributes.position);
      if (g.attributes.normal) c.setAttribute('normal', g.attributes.normal);
      g = mergeVertices(c, 1e-5);
    }
    m.geometry = simplify(g, Math.max(120, Math.round(n * ratio)), { maxError });
  }
}

const LEAN: Record<string, [number, number]> = {
  pouchL: [2200, 0.001],
  pouchR: [2200, 0.001],
  haversack: [3000, 0.0012],
  bottle: [3000, 0.0012],
  frog: [1600, 0.0009],
  helmet: [4600, 0.0012],
};

const pieces = new Map<string, GearPiece>();
function piece(key: string, make: () => GearPiece): GearPiece {
  let p = pieces.get(key);
  if (!p) {
    p = make();
    const obj = p.object.clone(true);
    const ln = LEAN[key];
    leanObject(obj, ln ? ln[0] : 1e9, ln ? ln[1] : 0.0006);
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

function place(p: GearPiece, m: THREE.Matrix4, name = p.id): THREE.Group {
  const holder = new THREE.Group();
  holder.name = `gear:${name}`;
  holder.add(p.object.clone(true));
  holder.applyMatrix4(m);
  remapWoodGrain(holder, m);
  return holder;
}

/**
 * Rigid mount on a base frame (fit.mountFrame rules on a caller-supplied field): the part of the
 * back face below the origin swings out until it rests on the field, then the piece is pushed out
 * along its z until the whole back face (footprint `fp` = [x0, x1, y0, y1]) clears it by `gap`.
 */
function mountOn(base: THREE.Matrix4, fp: [number, number, number, number], f: SDF, o: { gap?: number; swing?: boolean } = {}): THREE.Matrix4 {
  const gap = o.gap ?? 0.0006;
  const [x0, x1, y0, y1] = fp;
  const samples: THREE.Vector3[] = [];
  for (let j = 0; j <= 7; j++) for (let i = 0; i <= 6; i++) samples.push(V(x0 + ((x1 - x0) * i) / 6, y0 + ((y1 - y0) * j) / 7, 0));
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
  let m = base.clone();
  if (o.swing !== false && worst(base, true) > 0) {
    let lo = 0, hi = 40 * D2R;
    if (worst(tilted(hi), true) > 0) lo = hi;
    else for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (worst(tilted(mid), true) > 0) lo = mid; else hi = mid; }
    m = tilted(hi);
  }
  const pen = worst(m, false);
  if (pen > 0) m.multiply(new THREE.Matrix4().makeTranslation(0, 0, pen + 1e-4));
  return m;
}

const fpOf = (p: GearPiece): [number, number, number, number] => {
  const b = localBox(p);
  return [b.min.x, b.max.x, b.min.y, b.max.y];
};

/** Frame on a surface point: z = the (horizontalised) normal, y = up. */
function surfaceBase(pos: THREE.Vector3, n: THREE.Vector3, up: THREE.Vector3): THREE.Matrix4 {
  const z = n.clone().addScaledVector(up, -0.6 * n.dot(up)).normalize();
  const y = up.clone().addScaledVector(z, -up.dot(z)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(pos);
}

function arcAt(points: THREE.Vector3[], target: THREE.Vector3): number {
  let best = 0, bd = Infinity, acc = 0, sAt = 0;
  for (let i = 0; i < points.length; i++) {
    if (i > 0) acc += points[i].distanceTo(points[i - 1]);
    const d = points[i].distanceToSquared(target);
    if (d < bd) { bd = d; best = i; sAt = acc; }
  }
  void best;
  return sAt;
}

/**
 * The uk/gear strap builders sample their path at s = L * i / n and hand the arc length to
 * CatmullRomCurve3.getUtoTmapping; when float rounding puts the last sample a hair beyond the
 * curve length, three.js indexes past the last point and throws. Retry with the path end pulled
 * back by a few micrometres (invisible) until the sampling stays inside.
 */
function robustStrap<T>(paths: THREE.Vector3[][], build: () => T): T {
  for (let k = 0; ; k++) {
    try {
      return build();
    } catch (e) {
      if (k >= 6) throw e;
      for (const pts of paths) {
        const n = pts.length;
        if (n < 2) continue;
        pts[n - 1].lerp(pts[n - 2], 1e-4 * (k + 1));
      }
    }
  }
}

// ------------------------------------------------------------------ helmet

function grad(f: SDF, p: THREE.Vector3, h = 0.0008): THREE.Vector3 {
  return V(f(p.x + h, p.y, p.z) - f(p.x - h, p.y, p.z), f(p.x, p.y + h, p.z) - f(p.x, p.y - h, p.z), f(p.x, p.y, p.z + h) - f(p.x, p.y, p.z - h)).normalize();
}

let headField: SDF | null = null;

function helmet(sol: SoldierBuild): THREE.Object3D[] {
  const hf = sol.fit.headFrame({ tilt: -4, lift: -0.004 });
  const h = piece('helmet', () => buildMk2Helmet({ chinstrap: 'none' }));
  const out: THREE.Object3D[] = [place(h, hf.band, 'mk2-helmet')];
  // chinstrap worn under the chin: from the left lug down the cheek, under the chin, to the right lug
  const toHead = hf.head.clone().invert().multiply(hf.band); // helmet-local -> head-local
  const toHelmet = toHead.clone().invert();
  const f = (headField ??= headSDF());
  const off = 0.0013;
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
    [0.066 * s, -0.028, 0.02],
    [0.058 * s, -0.064, 0.036],
    [0.041 * s, -0.092, 0.05],
  ];
  const mid: number[][] = [...side(1), [0, -0.106, 0.056], ...side(-1).reverse()];
  pts.push(MK2_FIT.lugs[0].clone());
  nrm.push(V(1, 0, 0));
  for (const [x, y, z] of mid) {
    const p = onSkin(V(x, y, z));
    const n = grad(f, p);
    pts.push(p.applyMatrix4(toHelmet));
    nrm.push(n.transformDirection(toHelmet));
  }
  pts.push(MK2_FIT.lugs[1].clone());
  nrm.push(V(-1, 0, 0));
  const strap = buildMk2Chinstrap(pts, nrm, 0.7);
  leanObject(strap, 900, 0.0006);
  const holder = new THREE.Group();
  holder.name = 'gear:mk2-chinstrap';
  holder.add(strap);
  holder.applyMatrix4(hf.band);
  out.push(holder);
  return out;
}

// ------------------------------------------------------------------ the kit

type Pouches = Record<'l' | 'r', { m: THREE.Matrix4; p: GearPiece }>;

/** Placement of the belt and the rigid belt gear (pouches, frog, water bottle) on a fit. */
function beltGear(fit: Fit) {
  const torso = fit.field('torso');
  const belt = fit.beltPath();
  const beltF = beltField(belt, fit.trunkUp(fit.belt.height), BELT37.width + 0.002, BELT37.t + 0.0012);
  const pouch = {} as Pouches;
  for (const s of ['l', 'r'] as const) {
    const p = piece(s === 'l' ? 'pouchL' : 'pouchR', () => buildBasicPouch37({ side: s }));
    const a = beltAngleAtArc(belt, (s === 'l' ? 1 : -1) * LAYOUT.pouchArc);
    pouch[s] = { m: mountOn(belt.frameAt(a), fpOf(p), torso), p };
  }
  const frog = piece('frog', () => buildBayonetFrog37());
  const frogM = mountOn(belt.frameAt(LAYOUT.frogAngle), fpOf(frog), torso);
  const bottle = piece('bottle', () => buildWaterBottle37());
  const h = fit.surfacePoint({ angle: LAYOUT.bottle.angle, height: LAYOUT.bottle.height });
  const bottleM = mountOn(surfaceBase(h.position, h.normal, fit.trunkUp(LAYOUT.bottle.height)), fpOf(bottle), union([torso, beltF]));
  return { belt, beltF, pouch, frog, frogM, bottle, bottleM };
}

/**
 * Weapon clearance for buildSoldier: the basic pouches and the water bottle as boxes (asset
 * space), from a fit of the same stance (the trunk does not depend on the weapon placement), so
 * a low-ready weapon passes in front of / beside the pouches instead of through them.
 */
export function kitClearance(fit: Fit): SDF {
  const g = beltGear(fit);
  const fs: SDF[] = [];
  for (const s of ['l', 'r'] as const) fs.push(boxField(g.pouch[s].m, localBox(g.pouch[s].p), 0.004));
  fs.push(boxField(g.bottleM, localBox(g.bottle), 0.008));
  return union(fs);
}

export function fitKit(sol: SoldierBuild, k: KitSpec): THREE.Object3D[] {
  const fit = sol.fit;
  const out: THREE.Object3D[] = [];
  const torso = fit.field('torso');
  const up = V(0, 1, 0);
  const sp = (angle: number, height: number) => fit.surfacePoint({ angle, height }).position;
  const shoulderTop = (x: number) => {
    const z = fit.axisPoint(1.46).z;
    return fit.surfacePoint({ from: V(x, 1.9, z), dir: V(0, -1, 0) }).position;
  };

  // ---- belt, pouches, frog, water bottle
  const G0 = beltGear(fit);
  const { belt, beltF, pouch, bottle, bottleM } = G0;
  const beltPiece = buildWaistBelt37({ points: belt.points, normals: belt.normals });
  leanObject(beltPiece.object, 4000, 0.0008);
  beltPiece.object.name = 'gear:belt';
  out.push(beltPiece.object);
  const base: SDF[] = [torso, beltF];
  const [rearL, rearR] = beltPiece.strapAnchors ?? [];
  for (const s of ['l', 'r'] as const) out.push(place(pouch[s].p, pouch[s].m, `pouch-${s}`));
  out.push(place(G0.frog, G0.frogM, 'frog'));
  out.push(place(bottle, bottleM, 'water-bottle'));
  const bA = (bottle.strapAnchors ?? []).map((q) => q.clone().applyMatrix4(bottleM));

  // ---- braces
  const T = BRACE37.t;
  const braceCtrl = (s: number): THREE.Vector3[] => {
    const side = s > 0 ? 'l' : 'r';
    const a0 = (pouch[side].p.strapAnchors ?? [V()])[0].clone().applyMatrix4(pouch[side].m);
    const ctrl = [
      a0,
      a0.clone().addScaledVector(up, 0.04),
      sp(22 * s, 1.36),
      shoulderTop(s * LAYOUT.shoulderX.brace),
      sp(155 * s, 1.38),
      sp(180, 1.235),
      sp(-160 * s, 1.13),
    ];
    const rear = s > 0 ? rearR : rearL;
    if (rear) ctrl.push(rear.clone());
    if (s > 0 && bA.length === 2) {
      // end of the left-shoulder brace: forward along the belt to the water-bottle carrier
      ctrl.push(bA[1].clone().addScaledVector(up, 0.012).lerp(rear ?? bA[1], 0.45), bA[1], bA[0], bA[0].clone().add(bA[0].clone().sub(bA[1]).setLength(0.03)));
    } else if (rear) {
      // short end below the rear buckle
      const t = sp(-150 * s, 1.0);
      ctrl.push(rear.clone().lerp(t, 0.5), t);
    }
    return ctrl;
  };
  const off = T / 2 + 0.0008;
  const dL = drape(union(base), braceCtrl(1), off, { pin: true, tension: 0.6, step: 0.014 });
  const fL = strapField(dL.points, dL.normals, 0.03, T + 0.001);
  const dR = drape(union([...base, fL]), braceCtrl(-1), off, { pin: true, tension: 0.6, step: 0.014 });
  const fR = strapField(dR.points, dR.normals, 0.03, T + 0.001);
  const shoulderRange = (d: DrapeResult, s: number): [number, number] => {
    const at = arcAt(d.points, shoulderTop(s * LAYOUT.shoulderX.brace));
    return [Math.max(0.05, at - 0.15), at + 0.17];
  };
  const braces = robustStrap([dL.points, dR.points], () => buildBracePair37({
    left: { points: dL.points, normals: dL.normals },
    right: { points: dR.points, normals: dR.normals },
    leftOptions: { shoulder: shoulderRange(dL, 1) },
    rightOptions: { shoulder: shoulderRange(dR, -1) },
  }));
  leanObject(braces, 3400, 0.0007);
  braces.name = 'gear:braces';
  out.push(braces);
  const braceF = [fL, fR];

  // ---- small pack on the L-straps
  if (k.pack) {
    const hv = piece('haversack', buildHaversack37);
    const hp = fit.surfacePoint({ angle: 180, height: LAYOUT.pack.height });
    const baseM = surfaceBase(hp.position, hp.normal, fit.trunkUp(LAYOUT.pack.height));
    const m = mountOn(baseM, fpOf(hv), union([torso, ...braceF]), { swing: false, gap: 0.0008 });
    out.push(place(hv, m, 'haversack'));
    const an = (hv.strapAnchors ?? []).map((q) => q.clone().applyMatrix4(m));
    if (an.length === 4) {
      const fld = union([...base, ...braceF]);
      for (const s of [1, -1]) {
        const side = s > 0 ? 'l' : 'r';
        const hook = (pouch[side].p.strapAnchors ?? [V(), V()])[1].clone().applyMatrix4(pouch[side].m);
        // gear +X = the wearer's right once on the back
        const top = s > 0 ? an[1] : an[0], bot = s > 0 ? an[3] : an[2];
        const shoulderC = [hook, hook.clone().addScaledVector(up, 0.035), sp(30 * s, 1.37), shoulderTop(s * LAYOUT.shoulderX.lstrap), sp(160 * s, 1.43), top];
        // the short arm leaves the hook sideways, flat on the chest, then runs under the arm
        const pm = pouch[side].m;
        const px = V(1, 0, 0).transformDirection(pm).multiplyScalar(s), pz = V(0, 0, 1).transformDirection(pm);
        const hH = hook.y - (fit.axisPoint(1.2).y - 1.2);
        const underC = [hook, hook.clone().addScaledVector(px, 0.03).addScaledVector(pz, -0.004), sp(52 * s, hH - 0.015), sp(84 * s, hH - 0.035), sp(118 * s, 1.21), sp(150 * s, 1.215), bot];
        const d1 = drape(fld, shoulderC, off + 0.0004, { pin: true, tension: 0.6, step: 0.014, endNormals: [pz, null], blend: 0.04 });
        const d2 = drape(fld, underC, off + 0.0004, { pin: true, tension: 0.6, step: 0.014, endNormals: [pz, null], blend: 0.05 });
        const ls = robustStrap([d1.points, d2.points], () => buildLStrap37({ shoulder: { points: d1.points, normals: d1.normals }, underArm: { points: d2.points, normals: d2.normals } }));
        leanObject(ls, 1100, 0.0007);
        ls.name = `gear:l-strap-${side}`;
        out.push(ls);
      }
    }
  }

  // ---- headgear
  out.push(...helmet(sol));
  return out;
}
