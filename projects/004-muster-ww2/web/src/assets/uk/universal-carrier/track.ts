/**
 * Track run solver + individually modelled carrier track links (narrow cast skeleton links with twin
 * guide horns, single pin, 167 links per side).
 *
 * The run is solved in the side plane (z, y): bottom straight under the three road wheels, rising to
 * the front idler and the rear sprocket, and a lightly sagging upper run that rests on the tops of the
 * road wheels (the Universal Carrier has no return rollers). The idler is the tensioner: it is moved
 * along z so that exactly 167 links of the given pitch close the loop. Loop points are the JOINTS
 * (pin centres); each link lies between two joints.
 */
import { THREE, G } from '../../../core/kit';
import { TRACK, WHEEL, SPROCKET, IDLER } from './dims';
import { merge, prism, rrect, type P2 } from './util';

interface Circle { c: P2; r: number; top?: boolean }

const SAG_K = 0.012; // mid-span sag (m) per m^2 of free span on the upper run

export interface TrackLayout {
  idlerZ: number;
  joints: P2[];
  /** angles (atan2(y - cy, z - cz)) of link centres on the sprocket that carry a tooth */
  toothAngles: number[];
  meanChord: number;
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
  const wr = WHEEL.r + TRACK.inner - 0.003;
  const [zF, zM, zR] = WHEEL.z;
  const wF: Circle = { c: [zF, WHEEL.y], r: wr };
  const wR: Circle = { c: [zR, WHEEL.y], r: wr };
  const spr: Circle = { c: [SPROCKET.z, SPROCKET.y], r: SPROCKET.pitchR };
  const tops: Circle[] = [zR, zM, zF].map((z): Circle => ({ c: [z, WHEEL.y], r: WHEEL.r + TRACK.inner, top: true }));
  const idl: Circle = { c: [idlerZ, IDLER.y], r: IDLER.r + TRACK.inner };
  // bottom run going -z (front to rear), up round the sprocket, top run going +z, down round the idler
  const seq: Circle[] = [wF, wR, spr, ...tops, idl];
  const n = seq.length;
  const outs: P2[] = [], ins: P2[] = [];
  for (let i = 0; i < n; i++) {
    const [pa, pb] = tangent(seq[i], seq[(i + 1) % n]);
    outs[i] = pa;
    ins[(i + 1) % n] = pb;
  }
  const pts: P2[] = [];
  const step = 0.003;
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
    const upper = C === spr || !!C.top;
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

function place(pts: P2[], links: number, phase: number): P2[] {
  const cum: number[] = [0];
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[cum.length - 1];
  const stepL = total / links;
  const at = (s: number): P2 => {
    s = ((s % total) + total) % total;
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cum[m] <= s) lo = m;
      else hi = m;
    }
    const a = pts[lo], b = pts[(lo + 1) % pts.length];
    const t = (s - cum[lo]) / Math.max(1e-9, cum[lo + 1] - cum[lo]);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  const joints: P2[] = [];
  for (let i = 0; i < links; i++) joints.push(at(phase * stepL + i * stepL));
  return joints;
}

function meanChord(j: P2[]): number {
  let s = 0;
  for (let i = 0; i < j.length; i++) {
    const a = j[i], b = j[(i + 1) % j.length];
    s += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return s / j.length;
}

let cached: TrackLayout | null = null;

export function trackLayout(): TrackLayout {
  if (cached) return cached;
  let factor = 1.002;
  let idlerZ = IDLER.z;
  let joints: P2[] = [];
  for (let outer = 0; outer < 3; outer++) {
    const target = TRACK.links * TRACK.pitch * factor;
    let lo = IDLER.z - 0.25, hi = IDLER.z + 0.25;
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) / 2;
      if (loop(mid).len > target) hi = mid;
      else lo = mid;
    }
    idlerZ = (lo + hi) / 2;
    joints = place(loop(idlerZ).pts, TRACK.links, 0.37);
    factor *= TRACK.pitch / meanChord(joints);
  }
  // link centres riding on the sprocket: every second one carries a tooth
  const c: P2 = [SPROCKET.z, SPROCKET.y];
  const onSpr: { a: number; i: number }[] = [];
  for (let i = 0; i < joints.length; i++) {
    const a = joints[i], b = joints[(i + 1) % joints.length];
    const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.abs(Math.hypot(m[0] - c[0], m[1] - c[1]) - SPROCKET.pitchR * Math.cos(Math.PI / 30));
    if (d < 0.002) onSpr.push({ a: Math.atan2(m[1] - c[1], m[0] - c[0]), i });
  }
  let base = 0;
  if (onSpr.length) base = onSpr[0].a;
  const toothAngles: number[] = [];
  const pa = (Math.PI * 2) / SPROCKET.teeth;
  for (let k = 0; k < SPROCKET.teeth; k++) toothAngles.push(base + k * pa);
  cached = { idlerZ, joints, toothAngles, meanChord: meanChord(joints) };
  return cached;
}

/* ------------------------------------------------------------------------------------------ */

/**
 * One link in link-local space: X across the track, Z along the pitch (joints at z = +/-pitch/2),
 * Y towards the wheels (inner side), pin line at y = 0.
 * Cast skeleton link: body plate with a central tooth window, two knuckles at the front joint and two
 * (interleaving) at the rear joint, one transverse grouser on the ground face, twin guide horns, pin.
 */
export function linkGeometry(): THREE.BufferGeometry {
  const p = TRACK.pitch;
  const hw = TRACK.width / 2;
  const parts: THREE.BufferGeometry[] = [];
  const yIn = TRACK.inner, yBody0 = -0.008;
  // body plate (plan outline in x, z) with the tooth window between the horns
  const body = prism(
    rrect(-hw + 0.004, -p / 2 + 0.009, hw - 0.004, p / 2 - 0.009, 0.004, 1),
    yIn - yBody0,
    'xz',
    0,
    [rrect(-0.028, -0.008, 0.028, 0.008, 0.004, 1).reverse()],
  );
  body.translate(0, (yIn + yBody0) / 2, 0);
  parts.push(body);
  // knuckles round the pins (front pair outboard, rear pair inboard: they interleave)
  const kn = (x0: number, x1: number, z: number) => {
    const c = new THREE.CylinderGeometry(0.0092, 0.0092, x1 - x0, 6, 1);
    c.rotateZ(Math.PI / 2);
    c.translate((x0 + x1) / 2, 0.0005, z);
    parts.push(c);
  };
  for (const s of [1, -1]) {
    kn(s > 0 ? 0.078 : -hw + 0.004, s > 0 ? hw - 0.004 : -0.078, p / 2);
    kn(s > 0 ? 0.034 : -0.076, s > 0 ? 0.076 : -0.034, -p / 2);
  }
  // pin head on the outer side of the track (+X in link space)
  const head = new THREE.CylinderGeometry(0.0068, 0.0068, 0.004, 6, 1);
  head.rotateZ(Math.PI / 2);
  head.translate(hw + 0.002, 0.0005, p / 2);
  parts.push(head);
  // grouser: transverse bar under the ground face, bevelled
  const gr = prism([[-0.009, yBody0 + 0.001], [0.009, yBody0 + 0.001], [0.005, -TRACK.outer], [-0.005, -TRACK.outer]], TRACK.width - 0.02, 'zy', 0);
  parts.push(gr);
  // twin guide horns rising towards the wheels
  for (const s of [1, -1]) {
    const horn = prism(
      [[-0.014, yIn - 0.002], [0.014, yIn - 0.002], [0.006, yIn + TRACK.hornH - 0.004], [0.0, yIn + TRACK.hornH], [-0.006, yIn + TRACK.hornH - 0.004]],
      0.012,
      'zy',
      0,
    );
    horn.translate(s * TRACK.hornX, 0, 0);
    parts.push(horn);
  }
  return G.crease(merge(parts), 40);
}

function frame(t: THREE.Vector3, pos: THREE.Vector3): THREE.Matrix4 {
  const inward = new THREE.Vector3(0, -t.z, t.y);
  const X = new THREE.Vector3(1, 0, 0);
  const Z = new THREE.Vector3().crossVectors(X, inward);
  return new THREE.Matrix4().makeBasis(X, inward, Z).setPosition(pos);
}

/**
 * Link transforms for a track at centre x. The loop runs clockwise seen from +X (bottom run towards -Z),
 * so the tangent points backwards on the ground; the link frame's Z axis is flipped to keep +Z of the
 * link along the loop direction and +Y towards the wheels. `outerSign` puts the pin heads outboard.
 */
export function linkMatrices(layout: TrackLayout, x: number): THREE.Matrix4[] {
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
