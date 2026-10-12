/**
 * Belt and Y-straps (Koppel and Koppeltraggestell 39), fitted over the uniform.
 *
 *  - Belt: 45 mm black leather waist belt along the belt line (worn on the tunic's belt hooks),
 *    riding over anything tucked behind it; buckle at the front centre.
 *  - Y-straps: two black leather front straps from the D-rings on the back of the belt pouches
 *    (or hooked straight onto the belt), each with a length-adjusting frame buckle and a brown
 *    leather reinforcing tab with a steel D-ring below the collar bone; over the shoulders (under
 *    the tunic's shoulder straps) to the back, where they meet a steel ring between the shoulder
 *    blades; a single rear strap runs from the ring down to the belt and hooks under it. Steel
 *    D-rings on the rear of the shoulder straps take the upper hooks of the assault pack.
 */
import * as THREE from 'three';
import { M, part } from '../../../core/kit';
import type { Fit } from '../../shared/human/fit';
import type { SDF } from '../../shared/human/sdfx';
import { dRing, frameBuckle, roundEnds, pointedEnd } from '../gear/util';
import { F, merge } from './geo';
import { U } from './palette';
import { beltBuckle } from './kit/bags';
import { strapOn, bandField, lineFrame, lineLength, trimLine, type BeltLine, type StrapLine } from './wrap';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export const STRAP = { w: 0.024, t: 0.0028, off: 0.0017 };

const brownLeather = () =>
  M.leather(0x4a3424, { roughness: 0.55, detailSize: 0.02, detailStrength: 0.6, wear: 0.3, wearColor: 0x6a5039, dust: 0.05, dustHeight: 0.4, name: 'de-inf-brown-leather' });

/** Strap geometry along a line (flat leather band with optional shaped ends). */
export function strapGeo(l: StrapLine, w: number, t: number, hw?: (t: number, s: number, L: number) => number): THREE.BufferGeometry {
  return F.sheet(l.points, l.normals, hw ?? w / 2, t, { across: 2, samples: Math.max(4, l.points.length - 1) });
}

/** Place a +Y-up geometry in a strap frame at arc s (x across, y along, z out) with local offsets. */
function atFrame(g: THREE.BufferGeometry, m: THREE.Matrix4, off: [number, number, number] = [0, 0, 0], rotZ = 0): THREE.BufferGeometry {
  const out = g.clone();
  if (rotZ) out.rotateZ(rotZ);
  out.translate(off[0], off[1], off[2]);
  out.applyMatrix4(m);
  return out;
}

/** Turn a strap frame 180 deg about its normal if its y axis points down (so hanging parts hang). */
function upright(m: THREE.Matrix4, up: THREE.Vector3): THREE.Matrix4 {
  const y = new THREE.Vector3().setFromMatrixColumn(m, 1);
  return y.dot(up) < 0 ? m.clone().multiply(new THREE.Matrix4().makeRotationZ(Math.PI)) : m;
}

// ------------------------------------------------------------------ belt

export function beltParts(line: BeltLine): THREE.Object3D[] {
  const lea = U.belt();
  const geo = F.strap(line.points, line.width, line.thickness, line.normals, { closed: true, smooth: false });
  const out: THREE.Object3D[] = [part(geo, lea, { name: 'belt' })];
  const bk = beltBuckle();
  bk.applyMatrix4(line.frameAt(0));
  bk.name = 'belt-buckle';
  out.push(bk);
  return out;
}

// ------------------------------------------------------------------ hardware

/** Wire hook (strap end -> engages a ring/D-ring below it). Local: strap end at origin, y up the strap, z out. */
function hookGeo(): THREE.BufferGeometry {
  const pts: [number, number, number][] = [[0, 0.004, 0.0012], [0, -0.006, 0.0022], [0, -0.014, 0.0015], [0, -0.019, -0.0015], [0, -0.016, -0.0048], [0, -0.01, -0.0052]];
  const g = F.tube(pts, 0.0018, 6, 16);
  // the flat plate riveted to the strap end
  const plate = F.extrude([[-0.007, -0.004], [0.007, -0.004], [0.007, 0.01], [-0.007, 0.01]], 0.0012, 0.0004, 2, 1);
  plate.translate(0, 0, 0.0016);
  return merge([g, plate]);
}

/** Belt hook for the rear strap: goes over the belt's top edge and down behind it. Local: belt outer face at the top edge = origin, y up, z out. */
function beltHookGeo(): THREE.BufferGeometry {
  const pts: [number, number, number][] = [[0, 0.012, 0.0022], [0, 0.002, 0.0026], [0, 0.0045, -0.001], [0, 0.0035, -0.0052], [0, -0.012, -0.0058], [0, -0.022, -0.0052]];
  return F.tube(pts, 0.0019, 6, 18);
}

// ------------------------------------------------------------------ Y-straps

export interface YStrapSpec {
  fit: Fit;
  line: BeltLine;
  /** Surface the straps lie on (cloth + pockets). */
  field: SDF;
  /** Where each front strap hooks: a D-ring (asset space) or null = hook over the belt at the strap's natural position. */
  front: { l: THREE.Vector3 | null; r: THREE.Vector3 | null };
}

export interface YStraps {
  objects: THREE.Object3D[];
  /** Obstacle field of all strap bands (for items laid over them). */
  bands: SDF;
  /** D-rings on the rear of the shoulder straps (assault-pack hooks), asset space. */
  rearRings: { l: THREE.Vector3; r: THREE.Vector3 };
  /** Junction ring centre on the back. */
  junction: THREE.Vector3;
  /** Strap centre lines (for other straps to cross). */
  lines: StrapLine[];
}

export function buildYStraps(spec: YStrapSpec): YStraps {
  const { fit, line, field } = spec;
  const lea = U.belt();
  const hw = U.hardware();
  const brown = brownLeather();
  const objects: THREE.Object3D[] = [];
  const lines: StrapLine[] = [];
  const bandsF: SDF[] = [];
  const up = fit.trunkUp(1.3);
  const front = (x: number, y: number) => fit.surfacePoint({ from: V(x, y, 0.6), dir: V(0, 0, -1) }).position;
  const back = (x: number, y: number) => fit.surfacePoint({ from: V(x, y, -0.6), dir: V(0, 0, 1) }).position;
  // junction ring on the back between the shoulder blades
  const jHit = fit.surfacePoint({ angle: 180, height: 1.3 });
  const ringR = 0.017;
  const junction = jHit.position.clone().addScaledVector(jHit.normal, 0.0035);
  const jx = new THREE.Vector3().crossVectors(up, jHit.normal).normalize(); // soldier's right on the back
  const rearRings = { l: V(), r: V() };
  const belt180 = line.frameAt(line.sAt(180));
  const beltTopBack = V().setFromMatrixPosition(belt180).addScaledVector(line.up, line.width / 2);

  for (const sd of [1, -1] as const) {
    const key = sd > 0 ? 'l' : 'r';
    const ring = spec.front[key];
    // lower end: the hook engages the pouch D-ring, or the top of the belt
    let start: THREE.Vector3;
    if (ring) start = ring.clone().addScaledVector(up, 0.019);
    else {
      const s = line.sAt(sd * 24);
      start = V().setFromMatrixPosition(line.frameAt(s)).addScaledVector(line.up, line.width / 2 + 0.019);
    }
    const x0 = start.x;
    const ctrl = [
      start,
      front(x0 * 0.7 + sd * 0.097 * 0.3, 1.13),
      front(sd * 0.098, 1.25),
      front(sd * 0.1, 1.37),
      fit.surfacePoint({ angle: sd * 62, height: 1.47, elevation: 52 }).position,
      back(sd * 0.1, 1.42),
      back(sd * 0.068, 1.355),
      junction.clone().addScaledVector(jx, -sd * (ringR + 0.004)).addScaledVector(up, 0.004),
    ];
    const l = strapOn(field, ctrl, STRAP.off, { tension: 0.55, step: 0.008, pinStart: true, pinEnd: true });
    lines.push(l);
    const L = lineLength(l);
    // lower tongue (narrower, below the adjusting buckle), main strap above
    const sBuckle = 0.11;
    const tongue = trimLine(l, 0, sBuckle + 0.012);
    const main = trimLine(l, sBuckle - 0.004, L);
    objects.push(part(strapGeo(tongue, 0.018, 0.0026, pointedEnd(0.009, 0.001)), lea, { name: `y-strap-tongue-${key}` }));
    objects.push(part(strapGeo(main, STRAP.w, STRAP.t, roundEnds(STRAP.w / 2, 0.004, 0.006)), lea, { name: `y-strap-${key}` }));
    bandsF.push(bandField(l.points, l.normals, STRAP.w, STRAP.t + 2 * STRAP.off));
    // hook at the lower end
    const mh = lineFrame(l, 0.004);
    objects.push(part(atFrame(hookGeo(), mh, [0, 0, 0.0005]), hw));
    // adjusting frame buckle
    const mb = lineFrame(l, sBuckle);
    const bk = frameBuckle(0.026, 0.02, 0.0013, true);
    objects.push(part(atFrame(bk, mb, [0, 0, 0.0028]), hw));
    // keeper loop above the buckle
    objects.push(part(atFrame(F.extrude([[-0.0145, -0.004], [0.0145, -0.004], [0.0145, 0.004], [-0.0145, 0.004]], 0.0016, 0.0005, 2, 1), lineFrame(l, sBuckle + 0.028), [0, 0, 0.0014]), lea));
    // brown reinforcing tab with a D-ring below the collar bone (front)
    const sTab = (() => {
      // arc length of the point closest to height 1.39 on the front
      let best = 0, bd = 1e9, acc = 0;
      for (let i = 1; i < l.points.length; i++) {
        acc += l.points[i].distanceTo(l.points[i - 1]);
        if (l.points[i].z < 0) break;
        const d = Math.abs(l.points[i].y - 1.39 * fit.s);
        if (d < bd) { bd = d; best = acc; }
      }
      return best;
    })();
    const tab = trimLine(l, sTab - 0.035, sTab + 0.035);
    objects.push(part(strapGeo(tab, 0.03, 0.002, pointedEnd(0.015, 0.02)), brown));
    {
      // the tab is laid with its point downwards: rebuild it reversed so the point is at the bottom
      const mt = upright(lineFrame(l, sTab - 0.034), up);
      const dr = dRing(0.024, 0.016, 0.0018);
      objects.push(part(atFrame(dr, mt, [0, -0.002, 0.0048]), hw));
    }
    // rear D-ring for the assault pack's upper hooks (back of the shoulder strap)
    {
      let sR = 0, acc = 0, bd = 1e9;
      for (let i = 1; i < l.points.length; i++) {
        acc += l.points[i].distanceTo(l.points[i - 1]);
        if (l.points[i].z > 0) continue;
        const d = Math.abs(l.points[i].y - 1.415 * fit.s);
        if (d < bd) { bd = d; sR = acc; }
      }
      const mr = upright(lineFrame(l, sR), up);
      const dr = dRing(0.022, 0.014, 0.0017);
      objects.push(part(atFrame(F.extrude([[-0.012, -0.012], [0.012, -0.012], [0.012, 0.01], [-0.012, 0.01]], 0.0016, 0.0005, 2, 1), mr, [0, 0, 0.0028]), lea));
      objects.push(part(atFrame(dr, mr, [0, -0.012, 0.0046]), hw));
      const rp = V(0, -0.024, 0.0046).applyMatrix4(mr);
      rearRings[key].copy(rp);
    }
  }
  // junction ring
  {
    const tor = new THREE.TorusGeometry(ringR, 0.0026, 8, 32);
    const m = new THREE.Matrix4().makeBasis(jx, up.clone().addScaledVector(jHit.normal, -up.dot(jHit.normal)).normalize(), jHit.normal).setPosition(junction.clone().addScaledVector(jHit.normal, 0.0012));
    tor.applyMatrix4(m);
    objects.push(part(tor, hw));
  }
  // rear strap: ring -> belt, hook under the belt
  {
    const top = junction.clone().addScaledVector(up, -(ringR + 0.004));
    const ctrl = [top, back(0, 1.2), back(0, 1.11), beltTopBack.clone().addScaledVector(line.up, 0.014)];
    const l = strapOn(field, ctrl, STRAP.off, { tension: 0.6, step: 0.008, pinStart: true, pinEnd: false });
    lines.push(l);
    objects.push(part(strapGeo(l, 0.028, STRAP.t, roundEnds(0.014, 0.006, 0.004)), lea, { name: 'y-strap-rear' }));
    bandsF.push(bandField(l.points, l.normals, 0.028, STRAP.t + 2 * STRAP.off));
    // the strap loops through the ring: short folded end
    const mt = lineFrame(l, 0.003);
    objects.push(part(atFrame(F.extrude([[-0.014, -0.018], [0.014, -0.018], [0.014, 0.0], [-0.014, 0.0]], 0.0018, 0.0006, 2, 1), mt, [0, 0.0, 0.0028]), lea));
    // hook under the belt at the centre back
    const hb = belt180.clone().multiply(new THREE.Matrix4().makeTranslation(0, line.width / 2, 0));
    objects.push(part(beltHookGeo().applyMatrix4(hb), hw));
    // buckle for length adjustment
    const mb = lineFrame(l, lineLength(l) * 0.55);
    objects.push(part(atFrame(frameBuckle(0.03, 0.02, 0.0013, true), mb, [0, 0, 0.0028]), hw));
  }
  const bands: SDF = (x, y, z) => {
    let d = Infinity;
    for (const f of bandsF) { const v = f(x, y, z); if (v < d) d = v; }
    return d;
  };
  return { objects, bands, rearRings, junction, lines };
}
