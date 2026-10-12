/**
 * Track run solver + individually modelled T69 shoes (centre guide, single pin, rubber bushed steel,
 * 12 in wide, 129 mm pitch, 83 shoes per side) with their pins and end nuts.
 *
 * The run is solved in the side plane (z, y): bottom straight under the five road wheels, wraps round
 * the front and rear road wheels, the rear idler and the front sprocket, with a lightly sagging upper
 * run over the four return rollers. The idler is placed so that exactly 83 shoes close the loop.
 * The loop points are the JOINTS (pin centres); each shoe lies between two joints.
 */
import { THREE, G } from '../../../core/kit';
import { TRACK, WHEEL, ROLLER, SPROCKET, IDLER } from './dims';
import { merge, nut, prism, roundedRing, type P2 } from './util';

interface Circle { c: P2; r: number; top?: boolean }

const SAG_K = 0.012; // mid-span sag (m) per m^2 of free span on the upper run

export interface TrackLayout {
  idlerZ: number;
  /** joint positions (z, y) along the loop, clockwise seen from +X */
  joints: P2[];
  /** shoe-centre angle on the sprocket (atan2(y, z) about its centre) for tooth phasing */
  sprocketPhase: number;
  /** same for the toothed idler */
  idlerPhase: number;
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
  const zF = WHEEL.z[0], zR = WHEEL.z[WHEEL.z.length - 1];
  const wF: Circle = { c: [zF, WHEEL.y], r: wr };
  const wR: Circle = { c: [zR, WHEEL.y], r: wr };
  const idl: Circle = { c: [idlerZ, IDLER.y], r: IDLER.r + TRACK.inner };
  const rr = [...ROLLER.z].sort((a, b) => a - b).map((z): Circle => ({ c: [z, ROLLER.y], r: ROLLER.r + TRACK.inner, top: true }));
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

function phaseAt(joints: P2[], c: P2, r: number, teeth: number): number {
  let best = 1e9, ang = 0;
  for (let i = 0; i < joints.length; i++) {
    const a = joints[i], b = joints[(i + 1) % joints.length];
    const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.abs(Math.hypot(m[0] - c[0], m[1] - c[1]) - r * Math.cos(Math.PI / teeth));
    if (d < best) {
      best = d;
      ang = Math.atan2(m[1] - c[1], m[0] - c[0]);
    }
  }
  return ang;
}

let cached: TrackLayout | null = null;

export function trackLayout(): TrackLayout {
  if (cached) return cached;
  // the joints form a polygon of chords, slightly shorter than the smooth loop
  const target = TRACK.links * TRACK.pitch * 1.003;
  let lo = IDLER.z + 0.35, hi = IDLER.z - 0.35;
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
  const s0 = stepL * 0.37;
  for (let i = 0; i < TRACK.links; i++) joints.push(at(s0 + i * stepL));
  cached = {
    idlerZ,
    joints,
    sprocketPhase: phaseAt(joints, [SPROCKET.z, SPROCKET.y], SPROCKET.pitchR, SPROCKET.teeth),
    idlerPhase: phaseAt(joints, [idlerZ, IDLER.y], IDLER.r + TRACK.inner, IDLER.teeth),
  };
  return cached;
}

/* ------------------------------------------------------------------------------------------ */

/**
 * One T69 shoe in link-local space: X across the track, Z along the pitch (joints at z = +/-pitch/2),
 * Y towards the wheels (inner side), pin line at y = 0. Steel plate with two parallel grousers on the
 * ground side, interleaved hinge knuckles at both joints and the centre guide horn on the inner side.
 */
export function shoeGeometry(): THREE.BufferGeometry {
  const st: THREE.BufferGeometry[] = [];
  const hp = TRACK.pitch / 2;
  const w = TRACK.width;
  // plate (the road wheels run on its inner face at y = +inner)
  const plate = prism(roundedRing([[-0.046, -0.014], [0.046, -0.014], [0.046, TRACK.inner], [-0.046, TRACK.inner]], [0.006, 0.006, 0.004, 0.004], 2, 0), w, 'zy', 0.004);
  st.push(plate);
  // two parallel grousers, tapered, reaching the ground at y = -pinY
  for (const z of [-0.026, 0.026]) {
    const g = prism([[-0.013, -0.012], [0.013, -0.012], [0.007, -TRACK.pinY], [-0.007, -TRACK.pinY]], w - 0.012, 'zy', 0.0025);
    g.translate(0, 0, z);
    st.push(g);
  }
  // hinge knuckles round the pins: 3 segments at the front joint, 2 at the rear (they interleave)
  const segF: [number, number][] = [[-0.15, -0.098], [-0.03, 0.03], [0.098, 0.15]];
  const segR: [number, number][] = [[-0.094, -0.034], [0.034, 0.094]];
  const knuckle = (x0: number, x1: number, z: number) => {
    const c = new THREE.CylinderGeometry(0.0165, 0.0165, x1 - x0, 10, 1);
    c.rotateZ(Math.PI / 2);
    c.translate((x0 + x1) / 2, 0, z);
    st.push(c);
    // web joining the knuckle to the plate
    const web = new THREE.BoxGeometry(x1 - x0, 0.022, 0.03);
    web.translate((x0 + x1) / 2, -0.002, z - Math.sign(z) * 0.018);
    st.push(web);
  };
  for (const [a, b] of segF) knuckle(a, b, hp);
  for (const [a, b] of segR) knuckle(a, b, -hp);
  // centre guide horn
  const horn = prism([[-0.034, TRACK.inner - 0.002], [0.034, TRACK.inner - 0.002], [0.02, 0.066], [0.011, 0.076], [-0.011, 0.076], [-0.02, 0.066]], 0.036, 'zy', 0.004);
  st.push(horn);
  return G.crease(merge(st), 40);
}

/** Track pin at a joint, with a nut on each end (joint-local: same axes as a shoe). */
export function pinGeometry(): THREE.BufferGeometry {
  const st: THREE.BufferGeometry[] = [];
  const L = TRACK.pinWidth - 0.02;
  const p = new THREE.CylinderGeometry(0.0095, 0.0095, L, 8, 1);
  p.rotateZ(Math.PI / 2);
  st.push(p);
  for (const s of [1, -1]) {
    const n = nut(0.026, 0.01);
    n.rotateZ(s > 0 ? -Math.PI / 2 : Math.PI / 2);
    n.translate(s * (L / 2 - 0.01), 0, 0);
    st.push(n);
  }
  return G.crease(merge(st), 40);
}

function frame(t: THREE.Vector3, pos: THREE.Vector3): THREE.Matrix4 {
  const inward = new THREE.Vector3(0, -t.z, t.y);
  const X = new THREE.Vector3(1, 0, 0);
  const Z = new THREE.Vector3().crossVectors(X, inward);
  return new THREE.Matrix4().makeBasis(X, inward, Z).setPosition(pos);
}

/** Shoe transforms (for the track at x). */
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

/** Pin transforms at the joints (direction averaged over the two neighbouring shoes). */
export function pinMatrices(layout: TrackLayout, x: number): THREE.Matrix4[] {
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
