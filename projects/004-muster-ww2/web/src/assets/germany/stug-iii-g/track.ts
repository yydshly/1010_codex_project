/**
 * Track run solver + individually modelled Kgs 61/400/120 style links for the StuG III Ausf. G
 * (Panzer III running gear).
 *
 * The run is solved in the side plane (z, y): bottom straight under the road wheels, wraps
 * around the first/last road wheel, idler and drive sprocket, a slightly sagging upper run over
 * the three return rollers. The idler position (the real track tensioner) is solved so that
 * exactly TRACK.links links close the loop.
 */
import { THREE, G } from '../../../core/kit';
import { TRACK, WHEEL, WHEEL_Z, RETURN_ROLLER, SPROCKET, IDLER } from './dims';
import { cbox, merge } from './util';

type P2 = [number, number];
interface Circle { c: P2; r: number; top?: boolean }

const SAG_K = 0.03; // mid-span sag (m) per m^2 of free span on the upper run

export interface TrackLayout {
  idlerZ: number;
  /** pin positions (z, y) along the loop, clockwise seen from +X */
  pins: P2[];
  /** loop length */
  length: number;
  /** angle (rad, atan2(y, z) around the sprocket centre) of one link centre on the sprocket */
  sprocketPhase: number;
  idlerPhase: number;
}

function tangent(a: Circle, b: Circle): [P2, P2] {
  const dz = b.c[0] - a.c[0], dy = b.c[1] - a.c[1];
  const L = Math.hypot(dz, dy);
  const u: P2 = [dz / L, dy / L];
  const up: P2 = [-u[1], u[0]]; // left perpendicular
  const al = (a.r - b.r) / L;
  const be = Math.sqrt(Math.max(0, 1 - al * al));
  const n: P2 = [al * u[0] + be * up[0], al * u[1] + be * up[1]];
  return [
    [a.c[0] + a.r * n[0], a.c[1] + a.r * n[1]],
    [b.c[0] + b.r * n[0], b.c[1] + b.r * n[1]],
  ];
}

function loop(idlerZ: number): { pts: P2[]; len: number } {
  const off = TRACK.innerY - TRACK.pinY; // pin line sits this far outside the running surface
  const wr = WHEEL.y - TRACK.pinY;
  const w1: Circle = { c: [WHEEL_Z[0], WHEEL.y], r: wr };
  const w8: Circle = { c: [WHEEL_Z[WHEEL_Z.length - 1], WHEEL.y], r: wr };
  const idl: Circle = { c: [idlerZ, IDLER.y], r: IDLER.r + off };
  const rr = [...RETURN_ROLLER.z].sort((a, b) => a - b).map((z): Circle => ({ c: [z, RETURN_ROLLER.y], r: RETURN_ROLLER.r + off, top: true }));
  const spr: Circle = { c: [SPROCKET.z, SPROCKET.y], r: SPROCKET.pitchR };
  const seq: Circle[] = [w1, w8, idl, ...rr, spr];
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
    // clockwise arc from ins[i] to outs[i]
    const a0 = Math.atan2(ins[i][1] - C.c[1], ins[i][0] - C.c[0]);
    const a1 = Math.atan2(outs[i][1] - C.c[1], outs[i][0] - C.c[0]);
    let d = a0 - a1;
    while (d < 0) d += Math.PI * 2;
    while (d >= Math.PI * 2) d -= Math.PI * 2;
    if (C.top && d > Math.PI) d = 0; // roller not touching (should not happen)
    const na = Math.max(1, Math.ceil((d * C.r) / step));
    for (let k = 0; k < na; k++) {
      const a = a0 - (d * k) / na;
      pts.push([C.c[0] + C.r * Math.cos(a), C.c[1] + C.r * Math.sin(a)]);
    }
    // straight / sagging span to the next circle
    const A = outs[i], B = ins[(i + 1) % n];
    const span = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const upper = C === idl || !!C.top;
    const sag = upper ? SAG_K * span * span : 0;
    const ns = Math.max(1, Math.ceil(span / step));
    const tz = (B[0] - A[0]) / span, ty = (B[1] - A[1]) / span;
    const nz = -ty, ny = tz; // left normal = outward
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
  const target = TRACK.links * TRACK.pitch;
  // loop length grows as the idler moves back; bisection on the idler position
  let lo = IDLER.z + 0.35, hi = IDLER.z - 0.35;
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    if (loop(mid).len > target) hi = mid;
    else lo = mid;
  }
  const idlerZ = (lo + hi) / 2;
  const { pts } = loop(idlerZ);
  // cumulative lengths
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
  // start so that a pin sits under the middle of the bottom run (looks orderly)
  const pins: P2[] = [];
  const s0 = stepL * 0.37;
  for (let i = 0; i < TRACK.links; i++) pins.push(at(s0 + i * stepL));
  // link centre angles on sprocket / idler for tooth phasing
  const phaseOn = (c: P2, r: number) => {
    let best = 1e9, ang = 0;
    for (let i = 0; i < pins.length; i++) {
      const a = pins[i], b = pins[(i + 1) % pins.length];
      const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const d = Math.abs(Math.hypot(m[0] - c[0], m[1] - c[1]) - r);
      if (d < best) {
        best = d;
        ang = Math.atan2(m[1] - c[1], m[0] - c[0]);
      }
    }
    return ang;
  };
  cached = {
    idlerZ,
    pins,
    length: total,
    sprocketPhase: phaseOn([SPROCKET.z, SPROCKET.y], SPROCKET.pitchR * Math.cos(Math.PI / SPROCKET.teeth)),
    idlerPhase: phaseOn([idlerZ, IDLER.y], IDLER.r),
  };
  return cached;
}

/**
 * One track link in link-local space: X across the track (width 0.40), Z along the pitch
 * (pins at z = +/-0.06, pin line at y = 0), +Y towards the wheels (inner side).
 * Returns geometries per material so they can be merged by the caller.
 */
export function linkGeometries(): { steel: THREE.BufferGeometry; bright: THREE.BufferGeometry } {
  const hw = TRACK.width / 2 - 0.003;
  const parts: THREE.BufferGeometry[] = [];
  // shoe plate with two sprocket windows either side of the guide horn
  const win = (cx: number): G.V2[] => [
    [cx - 0.015, -0.019],
    [cx + 0.015, -0.019],
    [cx + 0.015, 0.019],
    [cx - 0.015, 0.019],
  ];
  const shoeShape = G.shape(
    [
      [-hw, -0.046],
      [hw, -0.046],
      [hw, 0.046],
      [-hw, 0.046],
    ],
    0,
    [win(-0.039), win(0.039)],
  );
  const shoe = G.extrude(shoeShape, 0.016, 0.0025, 1, 1);
  shoe.rotateX(-Math.PI / 2);
  shoe.translate(0, -0.003, 0);
  parts.push(shoe);
  // ground side: transverse grouser + two short ribs (cbox: X width, Y height, Z depth)
  parts.push(cbox(0.36, 0.007, 0.028, 0.002).translate(0, -0.0135, -0.004));
  parts.push(cbox(0.05, 0.006, 0.07, 0.002).translate(0.13, -0.013, 0));
  parts.push(cbox(0.05, 0.006, 0.07, 0.002).translate(-0.13, -0.013, 0));
  // hinge knuckles (front set / rear set interleave with the neighbouring link)
  const kn = (x0: number, x1: number, z: number) => {
    const g = new THREE.CylinderGeometry(0.0155, 0.0155, x1 - x0, 8, 1);
    g.rotateZ(Math.PI / 2);
    g.translate((x0 + x1) / 2, 0, z);
    return g;
  };
  for (const [a, b] of [[-hw, -0.141], [-0.089, -0.041], [0.041, 0.089], [0.141, hw]]) parts.push(kn(a, b, 0.06));
  for (const [a, b] of [[-0.138, -0.092], [-0.037, 0.037], [0.092, 0.138]]) parts.push(kn(a, b, -0.06));
  // running pads for the road wheel tyres
  parts.push(cbox(0.11, 0.01, 0.078, 0.0025).translate(0.117, 0.009, 0));
  parts.push(cbox(0.11, 0.01, 0.078, 0.0025).translate(-0.117, 0.009, 0));
  const steel = merge(parts);

  const br: THREE.BufferGeometry[] = [];
  // guide horn (polished by the wheels)
  const horn = G.plate(
    [
      [-0.036, 0.004],
      [0.036, 0.004],
      [0.013, 0.08],
      [-0.013, 0.08],
    ],
    0.03,
    'zy',
    0.004,
  );
  br.push(horn);
  // pin with head and retaining ring
  const pin = new THREE.CylinderGeometry(0.0072, 0.0072, TRACK.width + 0.008, 6, 1);
  pin.rotateZ(Math.PI / 2);
  pin.translate(0.002, 0, 0.06);
  br.push(pin);
  const head = new THREE.CylinderGeometry(0.0115, 0.0115, 0.008, 8, 1);
  head.rotateZ(Math.PI / 2);
  head.translate(TRACK.width / 2 + 0.006, 0, 0.06);
  br.push(head);
  const bright = merge(br);
  return { steel: G.crease(steel, 40), bright: G.crease(bright, 40) };
}

/** Link transforms (world, for the left track at x = +TRACK.x). */
export function linkMatrices(layout: TrackLayout, x: number): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [];
  const pins = layout.pins;
  const n = pins.length;
  for (let i = 0; i < n; i++) {
    const a = pins[i], b = pins[(i + 1) % n];
    const tz = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tz, ty);
    // travel direction t (z,y); inward normal is the right-hand perpendicular for a CW loop
    const t = new THREE.Vector3(0, ty / l, tz / l);
    const inward = new THREE.Vector3(0, -t.z, t.y); // rotate t by -90 deg in the (z, y) plane
    const X = new THREE.Vector3(1, 0, 0);
    const Z = new THREE.Vector3().crossVectors(X, inward);
    const m = new THREE.Matrix4().makeBasis(X, inward, Z);
    m.setPosition(x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
    out.push(m);
  }
  return out;
}
