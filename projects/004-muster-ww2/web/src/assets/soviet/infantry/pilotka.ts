/**
 * Pilotka: the Red Army enlisted side cap (pattern 1935) in khaki cotton, worn with a slight tilt
 * to the right, with the small red enamel star at the front.
 *
 * Built in HEAD-LOCAL space (shared/human/head.ts: origin between the ear canals, +Y up, +Z face,
 * +X = the man's left) so it fits the shared head exactly: the two side panels form a narrow tent
 * over the crown and hug the head below, a turned-up double band (bort) runs round the lower edge,
 * and the solid cap continues a few mm inside the head surface (no gap, no thin spots).
 * The geometry is built once per session and shared (place it with `fit.headFrame().head`).
 */
import * as THREE from 'three';
import { G } from '../../../core/kit';
import { headSDF } from '../../shared/human/head';
import { meshSDF } from '../../shared/human/mesh';
import { simplify } from '../../shared/human/simplify';
import type { SDF } from '../../shared/human/sdfx';

const D2R = Math.PI / 180;

/** Cap frame relative to the head (cap-local -> head-local). */
const CAP = {
  /** Base plane centre (head-local) and the cap's tilt: roll to the right, front slightly up. */
  origin: new THREE.Vector3(0, 0.069, -0.004),
  roll: 7,
  pitch: -5,
  /** Base length (along z), crown ridge height above the base, cloth / turn-up thickness. */
  length: 0.202,
  ridge: 0.08,
  cloth: 0.0048,
  bort: 0.0026,
  /** Half width of the tent at the base (the head pushes the cloth out where it is wider). */
  halfWidth: 0.068,
};

export function capMatrix(): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeRotationZ(CAP.roll * D2R);
  m.multiply(new THREE.Matrix4().makeRotationX(CAP.pitch * D2R));
  m.setPosition(CAP.origin);
  return m;
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Cap SDF in cap-local space (see CAP). */
function capField(): SDF {
  const head = headSDF();
  const m = capMatrix();
  const e = m.elements;
  const Lh = CAP.length / 2;
  const H = CAP.ridge;
  // side outline (z, y): base y = 0, ridge y = H, ends leaning out a little towards the top,
  // rounded top corners
  const endZ = (y: number) => Lh + 0.007 * clamp01(y / H);
  const rc = 0.024;
  const side2D = (y: number, z: number) => {
    const az = Math.abs(z);
    const ez = endZ(y);
    // rounded corner between the ridge and the end
    const cz = ez - rc, cy = H - rc;
    if (az > cz && y > cy) return Math.hypot(az - cz, y - cy) - rc;
    return Math.max(az - ez, y - H);
  };
  // plan width: pointed at both ends (the panels meet in a seam)
  const wAt = (y: number, z: number) => {
    // blunt, rounded ends (the cap is opened out by the head; no thin fins at the seams)
    const u = clamp01(1 - (z / (endZ(y) + 0.004)) ** 2);
    const plan = CAP.halfWidth * Math.pow(u, 0.42);
    const rise = Math.pow(clamp01((H - y) / H), 0.5);
    return plan * rise + 0.0022;
  };
  // turn-up (bort) top edge: lowest mid-length, rising slightly to the ends
  const bortTop = (z: number) => 0.045 + 0.009 * (z / Lh) ** 2;
  return (x, y, z) => {
    const tentSide = Math.abs(x) - wAt(y, z);
    const s2 = side2D(y, z);
    const tent = Math.max(tentSide, s2);
    if (tent > 0.012 || y < -0.006) return Math.max(tent, -y, 0.004);
    // head-local point
    const hx = e[0] * x + e[4] * y + e[8] * z + e[12];
    const hy = e[1] * x + e[5] * y + e[9] * z + e[13];
    const hz = e[2] * x + e[6] * y + e[10] * z + e[14];
    const hd = head(hx, hy, hz);
    // cloth over the tent, or over the head where the head is wider than the tent
    let outer = Math.min(tent, hd - CAP.cloth);
    // turned-up band: one more layer on the lower part (sharp top edge)
    const band = Math.max(outer - CAP.bort, y - bortTop(z));
    outer = Math.min(outer, band);
    // cut at the base; the solid continues 6 mm into the head (hidden) so the cloth never thins out
    return Math.max(outer, -y, -(hd + 0.006));
  };
}

let cached: { cap: THREE.BufferGeometry; star: THREE.BufferGeometry } | null = null;

/** Five-pointed star facing +Z, centred at the origin (outer radius r). */
function starGeometry(r: number): THREE.BufferGeometry {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.4;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  const g = G.extrude(pts, 0.0016, 0.0005, 1, 1);
  g.translate(0, 0, -0.0004);
  // raised centre boss (the hammer and sickle is too small to model at this scale)
  const boss = new THREE.CylinderGeometry(r * 0.28, r * 0.34, 0.0008, 20);
  boss.rotateX(Math.PI / 2);
  boss.translate(0, 0, 0.0015);
  return G.mergeGeometries([g.index ? g.toNonIndexed() : g, boss.toNonIndexed()])!;
}

/**
 * Cap and star geometry in HEAD-LOCAL space (cached). The star sits on the front of the turn-up,
 * 0.3 mm off the cloth, facing along the cloth normal.
 */
export function pilotkaGeometry(): { cap: THREE.BufferGeometry; star: THREE.BufferGeometry } {
  if (cached) return cached;
  const f = capField();
  const Lh = CAP.length / 2 + 0.014;
  const raw = meshSDF(f, { min: [-0.095, -0.004, -Lh], max: [0.095, CAP.ridge + 0.004, Lh] }, 0.0021, { project: 0 });
  const cap = simplify(raw, 7000, { maxError: 0.0004, maxFlipDeg: 30 });
  const m = capMatrix();
  cap.applyMatrix4(m);
  cap.computeBoundingBox();
  // star: find the front surface of the turn-up on the centre line
  const y = 0.029;
  let z = CAP.length / 2 + 0.02;
  while (z > 0 && f(0, y, z) > 0) z -= 0.0002;
  const p = new THREE.Vector3(0, y, z);
  const h = 0.0006;
  const n = new THREE.Vector3(f(p.x + h, p.y, p.z) - f(p.x - h, p.y, p.z), f(p.x, p.y + h, p.z) - f(p.x, p.y - h, p.z), f(p.x, p.y, p.z + h) - f(p.x, p.y, p.z - h)).normalize();
  const star = starGeometry(0.0105);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  const sm = new THREE.Matrix4().compose(p.clone().addScaledVector(n, 0.0003), q, new THREE.Vector3(1, 1, 1));
  star.applyMatrix4(sm);
  star.applyMatrix4(m);
  cached = { cap, star };
  return cached;
}
