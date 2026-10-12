/**
 * P-51D wing, BODY frame, port side (mirrored for starboard; side-specific fittings separate).
 * Laminar-flow sections, straight taper, D-model root extension, rounded tips, 5 deg dihedral.
 * Underneath: open main wheel well and leg bay (liners modelled, skin opened by the shader).
 * Leading edge: three .50 cal gun ports per wing. Wingtip navigation lights; pitot mast and the
 * three identification lights under the starboard wing.
 */
import * as THREE from 'three';
import { part, group, G } from '../../../core/kit';
import { gridGeo, lerp, cosSpace, bar, cylAB, tint } from './geom';
import { B } from './frame';
import { skin, P } from './paint';
import { WING, WELL, SLOT, GUNS, planform, wingPt, wingSurfY } from './planform';

const NU = 46;
const US = cosSpace(NU);

function ring(ax: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let k = NU - 1; k >= 0; k--) pts.push(wingPt(ax, US[k], true));
  for (let k = 1; k < NU; k++) pts.push(wingPt(ax, US[k], false));
  return pts;
}

function stations(): number[] {
  const out: number[] = [];
  for (let ax = 0; ax < WING.roundAx - 0.01; ax += 0.09) out.push(ax);
  for (const a of [WING.extAx - 0.1, WING.extAx - 0.05, WING.extAx, WING.extAx + 0.05, WING.extAx + 0.1]) out.push(a);
  const K = 18;
  for (let k = 0; k <= K; k++) out.push(WING.roundAx + (WING.semi - WING.roundAx) * Math.sin((Math.PI / 2) * (k / K) * 0.995));
  return [...new Set(out.map((v) => Math.round(v * 1e4) / 1e4))].sort((a, b) => a - b);
}

function wingSkin(): THREE.BufferGeometry {
  const rows = stations().map((ax) => ring(ax));
  return G.crease(gridGeo(rows, { capEnd: true }), 40);
}

/** Wheel well (cylindrical liner + roof) and leg bay channel. */
function wellLiner(): THREE.Object3D {
  const N = 56;
  let roofY = Infinity;
  const lower: THREE.Vector3[] = [];
  for (let k = 0; k <= N; k++) {
    const a = (k / N) * Math.PI * 2;
    const ax = WELL.ax + (WELL.r + 0.002) * Math.cos(a), s = WELL.s + (WELL.r + 0.002) * Math.sin(a);
    roofY = Math.min(roofY, wingSurfY(ax, s, true) - 0.04);
    lower.push(B(ax, wingSurfY(ax, s, false) + 0.004, s));
  }
  const upper = lower.map((p) => new THREE.Vector3(p.x, roofY, p.z));
  const wall = gridGeo([lower, upper], { closedU: false, inward: true });
  const roof = new THREE.CircleGeometry(WELL.r + 0.004, 56);
  roof.rotateX(Math.PI / 2);
  roof.translate(WELL.ax, roofY, -WELL.s);
  // leg bay: open-bottom channel from the well out to the pivot
  const { ax0, ax1, s0, s1 } = SLOT;
  const bay: THREE.Object3D[] = [];
  const depth = 0.17;
  const nb = 10;
  const rowsF: THREE.Vector3[][] = [], rowsB: THREE.Vector3[][] = [];
  for (let i = 0; i <= nb; i++) {
    const ax = lerp(ax0 - 0.12, ax1, i / nb);
    const yF = wingSurfY(ax, s0, false), yB = wingSurfY(ax, s1, false);
    rowsF.push([B(ax, yF + 0.003, s0), B(ax, yF + depth, s0)]);
    rowsB.push([B(ax, yB + 0.003, s1), B(ax, yB + depth, s1)]);
  }
  const t = (r: THREE.Vector3[][]) => r[0].map((_, j) => r.map((row) => row[j]));
  bay.push(part(gridGeo(t(rowsF), { closedU: false }), P.well()));
  bay.push(part(gridGeo(t(rowsB), { closedU: false }), P.well()));
  const top: THREE.Vector3[][] = [];
  for (let i = 0; i <= nb; i++) {
    const ax = lerp(ax0 - 0.12, ax1, i / nb);
    top.push([B(ax, wingSurfY(ax, s0, false) + depth, s0), B(ax, wingSurfY(ax, s1, false) + depth, s1)]);
  }
  bay.push(part(gridGeo(top, { closedU: false }), P.well()));
  const endY0 = wingSurfY(ax1, s0, false), endY1 = wingSurfY(ax1, s1, false);
  const endG = new THREE.PlaneGeometry(s1 - s0, depth);
  endG.rotateY(Math.PI / 2);
  endG.translate(ax1, (endY0 + endY1) / 2 + depth / 2, -(s0 + s1) / 2);
  bay.push(part(endG, P.well()));
  // double-sided liners (the grid orientation of the open strips is arbitrary)
  const wellMat = P.well();
  wellMat.side = THREE.DoubleSide;
  // a few stiffening ribs in the well roof
  const ribs: THREE.Object3D[] = [];
  for (const d of [-0.16, 0, 0.16]) {
    const a = B(WELL.ax - 0.33, roofY - 0.012, WELL.s + d), b = B(WELL.ax + 0.33, roofY - 0.012, WELL.s + d);
    const len = Math.sqrt(Math.max(0, WELL.r * WELL.r - d * d)) - 0.02;
    a.x = WELL.ax - len;
    b.x = WELL.ax + len;
    ribs.push(part(bar(a, b, 0.012, 0.03, new THREE.Vector3(0, 1, 0), 0, 0.003), P.well()));
  }
  // landing light in the well roof (P-51D)
  const lamp = new THREE.SphereGeometry(0.07, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  lamp.rotateX(Math.PI);
  lamp.translate(WELL.ax + 0.12, roofY + 0.005, -(WELL.s - 0.18));
  return group([part(wall, wellMat), part(roof, wellMat), ...bay, ...ribs, part(tint(lamp, 0xe8e4d8), P.lens() as unknown as THREE.Material)]);
}

/** Three gun ports in the leading edge. */
function gunPorts(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  for (const ax of GUNS) {
    const { le } = planform(ax);
    const le0 = wingPt(ax, 0, true);
    const y = le0.y - 0.01;
    const tip = B(ax, y, le - 0.012);
    const back = B(ax, y, le + 0.06);
    out.push(part(cylAB(back, tip, 0.021, 0.021, 20), P.gun()));
    const bore = new THREE.CircleGeometry(0.0125, 16);
    bore.translate(tip.x, tip.y, tip.z + 0.0006);
    out.push(part(bore, P.black()));
  }
  return group(out);
}

/** Wingtip navigation light (red port / green starboard). */
export function navLight(side: 1 | -1): THREE.Object3D {
  const ax = WING.semi - 0.1;
  const p = wingPt(ax, 0.25, true, side);
  const q = wingPt(ax, 0.25, false, side);
  const g = new THREE.SphereGeometry(1, 20, 12);
  g.scale(0.03, 0.022, 0.06);
  g.translate(p.x + side * 0.02, (p.y + q.y) / 2, p.z);
  return part(tint(g, side > 0 ? 0xc8261a : 0x1f9a44), P.lens() as unknown as THREE.Material);
}

/** Starboard-wing fittings: pitot mast and the three identification lights (body frame, x < 0). */
export function starboardFittings(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  // pitot
  const ax = 4.45;
  const { le } = planform(ax);
  const root = wingPt(ax, 0.1, false, -1);
  const low = root.clone().add(new THREE.Vector3(0, -0.11, 0.03));
  const tip = new THREE.Vector3(root.x, low.y, -(le - 0.2));
  out.push(part(bar(root.clone().add(new THREE.Vector3(0, 0.015, 0)), low, 0.012, 0.045, new THREE.Vector3(0, 0, 1), 0, 0.005), P.bare()));
  out.push(part(cylAB(low.clone().add(new THREE.Vector3(0, 0, -0.03)), tip, 0.009, 0.009, 14), P.bare()));
  out.push(part(cylAB(tip, tip.clone().add(new THREE.Vector3(0, 0, 0.045)), 0.009, 0.004, 14), P.bare()));
  // identification lights: red, green, amber
  const cols = [0xc8261a, 0x1f9a44, 0xd8a020];
  cols.forEach((c, i) => {
    const a = 3.9 + i * 0.16;
    const { le: l, te } = planform(a);
    const s = l + 0.55 * (te - l);
    const y = wingSurfY(a, s, false);
    const g = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    g.rotateX(Math.PI);
    g.scale(0.028, 0.014, 0.028);
    g.translate(-a, y + 0.004, -s);
    out.push(part(tint(g, c), P.lens() as unknown as THREE.Material));
  });
  return group(out);
}

export function buildWingPort(): THREE.Object3D {
  return group([part(wingSkin(), skin('WING')), wellLiner(), gunPorts()]);
}
