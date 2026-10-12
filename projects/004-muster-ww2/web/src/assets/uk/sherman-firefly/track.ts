/**
 * Track run solver + individually modelled T48 rubber-chevron shoes (double pin, 16 9/16 in wide,
 * 6 in pitch, 83 shoes per side on the M4A4) with cast end connectors carrying the outside guide horns.
 *
 * The run is solved in the side plane (z, y): bottom straight under the road wheels, wraps round the
 * front and rear road wheels, the idler and the sprocket, and a lightly sagging upper run over the three
 * return rollers. The idler (the track tensioner) is placed so that exactly 83 shoes close the loop.
 * The loop points are the JOINTS (end-connector centres); each shoe lies between two joints.
 */
import { THREE, G } from '../../../core/kit';
import { TRACK, WHEEL, BOGIE, ROLLER, SPROCKET, IDLER } from './dims';
import { merge, nut, prism, roundedRing, type P2 } from './util';

interface Circle { c: P2; r: number; top?: boolean }

const SAG_K = 0.011; // mid-span sag (m) per m^2 of free span on the upper run

export interface TrackLayout {
  idlerZ: number;
  /** joint positions (z, y) along the loop, clockwise seen from +X */
  joints: P2[];
  /** shoe-centre angle on the sprocket (atan2(y, z) about its centre) for tooth phasing */
  sprocketPhase: number;
}

function tangent(a: Circle, b: Circle): [P2, P2] {
  const dz = b.c[0] - a.c[0], dy = b.c[1] - a.c[1];
  const L = Math.hypot(dz, dy);
  const u: P2 = [dz / L, dy / L];
  const up: P2 = [-u[1], u[0]];
  const al = (a.r - b.r) / L;
  const be = Math.sqrt(Math.max(0, 1 - al * al));
  const n: P2 = [al * u[0] + be * up[0], al * u[1] + be * up[1]];
  return [
    [a.c[0] + a.r * n[0], a.c[1] + a.r * n[1]],
    [b.c[0] + b.r * n[0], b.c[1] + b.r * n[1]],
  ];
}

function loop(idlerZ: number): { pts: P2[]; len: number } {
  const wr = WHEEL.y - TRACK.pinY;
  const zF = BOGIE.z[0] + BOGIE.half, zR = BOGIE.z[BOGIE.z.length - 1] - BOGIE.half;
  const wF: Circle = { c: [zF, WHEEL.y], r: wr };
  const wR: Circle = { c: [zR, WHEEL.y], r: wr };
  const idl: Circle = { c: [idlerZ, IDLER.y], r: IDLER.r + TRACK.inner };
  const rr = BOGIE.z.map((z) => z + ROLLER.dz).sort((a, b) => a - b).map((z): Circle => ({ c: [z, ROLLER.y], r: ROLLER.r + TRACK.inner, top: true }));
  const spr: Circle = { c: [SPROCKET.z, SPROCKET.y], r: SPROCKET.pitchR };
  const seq: Circle[] = [wF, wR, idl, ...rr, spr];
  const n = seq.length;
  const outs: P2[] = [], ins: P2[] = [];
  for (let i = 0; i < n; i++) {
    const [pa, pb] = tangent(seq[i], seq[(i + 1) % n]);
    outs[i] = pa;
    ins[(i + 1) % n] = pb;
  }
  const pts: P2[] = [];
  const step = 0.004;
  for (let i = 0; i < n; i++) {
    const C = seq[i];
    const a0 = Math.atan2(ins[i][1] - C.c[1], ins[i][0] - C.c[0]);
    const a1 = Math.atan2(outs[i][1] - C.c[1], outs[i][0] - C.c[0]);
    let d = a0 - a1;
    while (d < 0) d += Math.PI * 2;
    while (d >= Math.PI * 2) d -= Math.PI * 2;
    if (C.top && d > Math.PI) d = 0;
    const na = Math.max(1, Math.ceil((d * C.r) / step));
    for (let k = 0; k < na; k++) {
      const a = a0 - (d * k) / na;
      pts.push([C.c[0] + C.r * Math.cos(a), C.c[1] + C.r * Math.sin(a)]);
    }
    const A = outs[i], B = ins[(i + 1) % n];
    const span = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const upper = C === idl || !!C.top;
    const sag = upper ? SAG_K * span * span : 0;
    const ns = Math.max(1, Math.ceil(span / step));
    const tz = (B[0] - A[0]) / span, ty = (B[1] - A[1]) / span;
    const nz = -ty, ny = tz;
    for (let k = 0; k < ns; k++) {
      const s = k / ns;
      const h = sag * 4 * s * (1 - s);
      pts.push([A[0] + (B[0] - A[0]) * s - nz * h, A[1] + (B[1] - A[1]) * s - ny * h]);
    }
  }
  let len = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return { pts, len };
}

let cached: TrackLayout | null = null;

export function trackLayout(): TrackLayout {
  if (cached) return cached;
  // the joints form a polygon of chords; the polygon is slightly shorter than the smooth loop
  // round the wheels, so aim the smooth loop a little longer than links * pitch
  const target = TRACK.links * TRACK.pitch * 1.0035;
  let lo = IDLER.z + 0.3, hi = IDLER.z - 0.3;
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    if (loop(mid).len > target) hi = mid;
    else lo = mid;
  }
  const idlerZ = (lo + hi) / 2;
  const { pts } = loop(idlerZ);
  const cum: number[] = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[cum.length - 1];
  const stepL = total / TRACK.links;
  const at = (s: number): P2 => {
    s = ((s % total) + total) % total;
    let lo2 = 0, hi2 = cum.length - 1;
    while (hi2 - lo2 > 1) {
      const m = (lo2 + hi2) >> 1;
      if (cum[m] <= s) lo2 = m;
      else hi2 = m;
    }
    const a = pts[lo2], b = pts[(lo2 + 1) % pts.length];
    const t = (s - cum[lo2]) / Math.max(1e-9, cum[lo2 + 1] - cum[lo2]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const joints: P2[] = [];
  const s0 = stepL * 0.21;
  for (let i = 0; i < TRACK.links; i++) joints.push(at(s0 + i * stepL));
  // shoe-centre angle nearest the sprocket's pitch circle top-front
  const c: P2 = [SPROCKET.z, SPROCKET.y];
  let best = 1e9, ang = 0;
  for (let i = 0; i < joints.length; i++) {
    const a = joints[i], b = joints[(i + 1) % joints.length];
    const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.abs(Math.hypot(m[0] - c[0], m[1] - c[1]) - SPROCKET.pitchR * Math.cos(Math.PI / SPROCKET.teeth));
    if (d < best) {
      best = d;
      ang = Math.atan2(m[1] - c[1], m[0] - c[0]);
    }
  }
  cached = { idlerZ, joints, sprocketPhase: ang };
  return cached;
}

/* ------------------------------------------------------------------------------------------ */

/** Rounded rectangle outline (CCW) with few points per corner, for small repeated parts. */
function rrect(a0: number, b0: number, a1: number, b1: number, r: number): G.V2[] {
  return roundedRing([[a0, b0], [a1, b0], [a1, b1], [a0, b1]], [r, r, r, r], 3, 0);
}

/**
 * One shoe in link-local space: X across the track, Z along the pitch (joints at z = +/-pitch/2),
 * Y towards the wheels (inner side), pin line at y = 0. Returns geometry per material.
 */
export function shoeGeometries(): { rubber: THREE.BufferGeometry; steel: THREE.BufferGeometry } {
  const rub: THREE.BufferGeometry[] = [];
  const st: THREE.BufferGeometry[] = [];
  const pinZ = 0.045;
  // inner running pad (road wheels run here, between the guide horn lanes)
  const inner = prism(rrect(-0.064, 0.012, 0.064, TRACK.inner, 0.012), 0.3, 'zy', 0.005);
  rub.push(inner);
  // outer tread base and chevron bars (apex forward on the ground run)
  const outer = prism(rrect(-0.066, -0.041, 0.066, -0.012, 0.01), 0.336, 'zy', 0.005);
  rub.push(outer);
  const bar = (sx: number) => {
    // parallelogram in plan (x, z): from the centre to the edge, swept back
    const w = 0.034, x0 = 0.004 * sx, x1 = 0.162 * sx, zc0 = 0.026, zc1 = -0.03;
    const pts: G.V2[] = sx > 0
      ? [[x0, zc0 - w / 2], [x1, zc1 - w / 2], [x1, zc1 + w / 2], [x0, zc0 + w / 2]]
      : [[x0, zc0 + w / 2], [x1, zc1 + w / 2], [x1, zc1 - w / 2], [x0, zc0 - w / 2]];
    const g = prism(pts, TRACK.outer - 0.038, 'xz', 0.003);
    g.translate(0, -TRACK.outer + (TRACK.outer - 0.038) / 2, 0);
    return g;
  };
  rub.push(bar(1), bar(-1));
  // binocular steel link body: two pin tubes joined by a web, visible at the sides
  for (const z of [-pinZ, pinZ]) {
    const t = new THREE.CylinderGeometry(0.021, 0.021, 0.344, 8, 1);
    t.rotateZ(Math.PI / 2);
    t.translate(0, 0, z);
    st.push(t);
  }
  st.push(new THREE.BoxGeometry(0.34, 0.022, 2 * pinZ));
  return { rubber: G.crease(merge(rub), 40), steel: G.crease(merge(st), 40) };
}

/**
 * One end-connector pair at a joint (joint-local: same axes as a shoe, centred on the joint).
 * Cast connectors with integral guide horns, wedge nut underneath, pin ends on the outer face.
 */
export function connectorGeometries(): { steel: THREE.BufferGeometry } {
  const st: THREE.BufferGeometry[] = [];
  const hw = TRACK.width / 2;
  for (const sx of [1, -1]) {
    const x0 = 0.171, x1 = hw - 0.002;
    const xc = sx * (x0 + x1) / 2;
    // connector body (side outline in z, y), rounded ends round the two pins
    const body = prism([
      [-0.052, -0.02], [-0.04, -0.028], [0.04, -0.028], [0.052, -0.02],
      [0.056, 0.004], [0.046, 0.024], [-0.046, 0.024], [-0.056, 0.004],
    ], x1 - x0, 'zy', 0.004);
    body.translate(xc, 0, 0);
    st.push(body);
    // guide horn rising towards the wheels, slightly inboard
    const horn = prism([
      [-0.034, 0.02], [0.034, 0.02], [0.018, 0.064], [0.009, 0.078], [-0.009, 0.078], [-0.018, 0.064],
    ], 0.024, 'zy', 0.004);
    horn.translate(sx * (x0 + 0.017), 0, 0);
    st.push(horn);
    // wedge-bolt nut on the ground side and the pin ends on the outer face
    const n = nut(0.026, 0.011);
    n.rotateX(Math.PI);
    n.translate(xc, -0.028, 0);
    st.push(n);
    for (const z of [-0.031, 0.031]) {
      const pe = new THREE.CylinderGeometry(0.014, 0.014, 0.006, 6, 1);
      pe.rotateZ(Math.PI / 2);
      pe.translate(sx * (x1 + 0.002), 0, z);
      st.push(pe);
    }
  }
  return { steel: G.crease(merge(st), 40) };
}

function frame(t: THREE.Vector3, pos: THREE.Vector3): THREE.Matrix4 {
  const inward = new THREE.Vector3(0, -t.z, t.y);
  const X = new THREE.Vector3(1, 0, 0);
  const Z = new THREE.Vector3().crossVectors(X, inward);
  return new THREE.Matrix4().makeBasis(X, inward, Z).setPosition(pos);
}

/** Shoe transforms (for the left track at x). */
export function shoeMatrices(layout: TrackLayout, x: number): THREE.Matrix4[] {
  const J = layout.joints, n = J.length;
  const out: THREE.Matrix4[] = [];
  for (let i = 0; i < n; i++) {
    const a = J[i], b = J[(i + 1) % n];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const t = new THREE.Vector3(0, (b[1] - a[1]) / l, (b[0] - a[0]) / l);
    out.push(frame(t, new THREE.Vector3(x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2)));
  }
  return out;
}

/** Connector transforms at the joints (direction averaged over the two neighbouring shoes). */
export function connectorMatrices(layout: TrackLayout, x: number): THREE.Matrix4[] {
  const J = layout.joints, n = J.length;
  const out: THREE.Matrix4[] = [];
  for (let i = 0; i < n; i++) {
    const p = J[(i - 1 + n) % n], c = J[i], q = J[(i + 1) % n];
    const dz = q[0] - p[0], dy = q[1] - p[1];
    const l = Math.hypot(dz, dy);
    out.push(frame(new THREE.Vector3(0, dy / l, dz / l), new THREE.Vector3(x, c[1], c[0])));
  }
  return out;
}
