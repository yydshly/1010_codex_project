/**
 * Track run solver + individually modelled Kgs 63/725/130 links (early pattern, no chevrons).
 *
 * The run is solved in the side plane (z, y): bottom straight under the road wheels, wraps round
 * the first/last road wheel, the idler and the drive sprocket, and a slack upper run resting on
 * the tops of the road wheels (the Tiger has no return rollers). The idler position (the real
 * track tensioner) is solved so that exactly TRACK.links links close the loop.
 */
import { THREE, G } from '../../../core/kit';
import { TRACK, WHEEL, STATION_Z, SPROCKET, IDLER, PLANE } from './dims';
import { cbox, merge, type V2 } from './util';

type P2 = [number, number];
interface Circle { c: P2; r: number; top?: boolean }

const SAG_K = 0.03; // mid-span sag (m) per m^2 of free span on the upper run

export interface TrackLayout {
  idlerZ: number;
  /** pin positions (z, y) along the loop */
  pins: P2[];
  length: number;
  /** angle (rad, atan2(y, z) around the sprocket centre) of one link centre on the sprocket */
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
  const off = TRACK.innerY - TRACK.pinY;
  const wr = WHEEL.y - TRACK.pinY;
  const w1: Circle = { c: [STATION_Z[0], WHEEL.y], r: wr };
  const w8: Circle = { c: [STATION_Z[7], WHEEL.y], r: wr };
  const idl: Circle = { c: [idlerZ, IDLER.y], r: IDLER.r + off };
  const tops = [...STATION_Z].sort((a, b) => a - b).map((z): Circle => ({ c: [z, WHEEL.y], r: WHEEL.r + off, top: true }));
  const spr: Circle = { c: [SPROCKET.z, SPROCKET.y], r: SPROCKET.pitchR };
  const seq: Circle[] = [w1, w8, idl, ...tops, spr];
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
  const target = TRACK.links * TRACK.pitch;
  let lo = IDLER.z + 0.4, hi = IDLER.z - 0.4;
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
  const pins: P2[] = [];
  const s0 = stepL * 0.41;
  for (let i = 0; i < TRACK.links; i++) pins.push(at(s0 + i * stepL));
  // link-centre angle on the sprocket for tooth phasing
  const c: P2 = [SPROCKET.z, SPROCKET.y];
  const rr = SPROCKET.pitchR * Math.cos(Math.PI / SPROCKET.teeth);
  let best = 1e9, ang = 0;
  for (let i = 0; i < pins.length; i++) {
    const a = pins[i], b = pins[(i + 1) % pins.length];
    const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const d = Math.abs(Math.hypot(m[0] - c[0], m[1] - c[1]) - rr);
    if (d < best) {
      best = d;
      ang = Math.atan2(m[1] - c[1], m[0] - c[0]);
    }
  }
  cached = { idlerZ, pins, length: total, sprocketPhase: ang };
  return cached;
}

/** Extruded (z, y) outline with holes, thickness t along X (like G.plate 'zy'). */
function plateZY(outline: V2[], holes: V2[][], t: number, bevel: number): THREE.BufferGeometry {
  const g = G.extrude(G.shape(outline, 0, holes), t, bevel, 1, 1);
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  G.flipWinding(g);
  return g;
}

/** Extruded (x, z) outline with holes, thickness t along Y. */
function plateXZ(outline: V2[], holes: V2[][], t: number, bevel: number): THREE.BufferGeometry {
  const g = G.extrude(G.shape(outline, 0, holes), t, bevel, 1, 1);
  g.applyMatrix4(new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1));
  G.flipWinding(g);
  return g;
}

/** Sprocket tooth windows in the link, offsets from the track centre (+ outwards). */
export const WINDOW_X = [PLANE.mid + 0.075, PLANE.mid - 0.075];

/**
 * One track link in link-local space: X across the track (+X = outer edge), Z along the pitch
 * (pins at z = +/-0.065, pin line at y = 0), +Y towards the wheels (inner side).
 */
export function linkGeometries(): { steel: THREE.BufferGeometry; bright: THREE.BufferGeometry } {
  const hw = TRACK.width / 2;
  const top = TRACK.innerY - TRACK.pinY; // running surface
  const parts: THREE.BufferGeometry[] = [];
  // shoe plate with the two sprocket windows
  const win = (cx: number): V2[] => [
    [cx - 0.019, 0.028],
    [cx + 0.019, 0.028],
    [cx + 0.019, -0.028],
    [cx - 0.019, -0.028],
  ];
  const shoe = plateXZ(
    [
      [-hw + 0.004, -0.05],
      [hw - 0.004, -0.05],
      [hw, -0.044],
      [hw, 0.044],
      [hw - 0.004, 0.05],
      [-hw + 0.004, 0.05],
      [-hw, 0.044],
      [-hw, -0.044],
    ],
    WINDOW_X.map(win),
    0.032,
    0.003,
  );
  shoe.translate(0, top - 0.008 - 0.016, 0);
  parts.push(shoe);
  // ground side: transverse bar and the shallow trapezoid partitions of the early pattern
  const gy = -TRACK.pinY; // ground plane in link space
  parts.push(cbox(0.66, 0.012, 0.026, 0.002).translate(0, gy + 0.006, 0.0));
  for (const x of [-0.29, 0.0, 0.29]) parts.push(cbox(0.03, 0.011, 0.086, 0.002).translate(x, gy + 0.0055, 0));
  // running pads on the inner face (wheel paths)
  const pad = (x0: number, x1: number) => cbox(x1 - x0, 0.008, 0.084, 0.002).translate((x0 + x1) / 2, top - 0.004, 0);
  parts.push(pad(0.045, 0.352), pad(-0.148, -0.057), pad(-0.352, -0.252));
  // hinge knuckles (front set / rear set interleave with the neighbouring link)
  const kn = (x0: number, x1: number, z: number) => {
    const g = new THREE.CylinderGeometry(0.021, 0.021, x1 - x0, 7, 1);
    g.rotateZ(Math.PI / 2);
    g.translate((x0 + x1) / 2, 0, z);
    return g;
  };
  for (const [a, b] of [[-hw, -0.292], [-0.214, -0.142], [-0.064, 0.006], [0.086, 0.158], [0.236, 0.308]]) parts.push(kn(a, b, 0.065));
  for (const [a, b] of [[-0.286, -0.22], [-0.136, -0.07], [0.012, 0.08], [0.164, 0.23], [0.314, hw]]) parts.push(kn(a, b, -0.065));
  const steel = merge(parts);

  const br: THREE.BufferGeometry[] = [];
  // two hollow guide horns (polished by the wheel discs)
  const hornO: V2[] = [[-0.046, top - 0.004], [0.046, top - 0.004], [0.02, top + 0.1], [-0.02, top + 0.1]];
  const hornH: V2[] = [[-0.022, top + 0.022], [-0.009, top + 0.078], [0.009, top + 0.078], [0.022, top + 0.022]];
  for (const x of [PLANE.hornA, PLANE.hornB]) {
    const h = plateZY(hornO, [hornH], 0.032, 0.004);
    h.translate(x, 0, 0);
    br.push(h);
  }
  // pin with head (outer side) and retaining ring (inner side)
  const pin = new THREE.CylinderGeometry(0.014, 0.014, TRACK.width + 0.01, 6, 1);
  pin.rotateZ(Math.PI / 2);
  pin.translate(0.0, 0, 0.065);
  br.push(pin);
  const head = new THREE.CylinderGeometry(0.019, 0.019, 0.008, 8, 1);
  head.rotateZ(Math.PI / 2);
  head.translate(hw + 0.006, 0, 0.065);
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
    const t = new THREE.Vector3(0, ty / l, tz / l);
    const inward = new THREE.Vector3(0, -t.z, t.y);
    const X = new THREE.Vector3(1, 0, 0);
    const Z = new THREE.Vector3().crossVectors(X, inward);
    const m = new THREE.Matrix4().makeBasis(X, inward, Z);
    m.setPosition(x, (a[1] + b[1]) / 2, (a[0] + b[0]) / 2);
    out.push(m);
  }
  return out;
}
