/**
 * Web straps built ALONG PATHS supplied by the infantry author (who fits them to the body with
 * fit.strapPath), with their hardware:
 *   buildWebStrapAlong(o)          generic web strap: width profile, adjusting buckles with the
 *                                  doubled strap end, D-rings, and a wire hook at either end that
 *                                  goes into a belt eyelet.
 *   buildM1936SuspendersAlong(o)   M1936 belt suspenders ("X" suspenders): two straps, each from its
 *                                  front hook over the shoulder to the rear hook, crossing and
 *                                  sewn together between the shoulder blades; adjusting buckle and
 *                                  a D-ring (musette bag hooks) on each front strap.
 *   buildHaversackStrapsAlong(o)   the M1928 haversack's two shoulder straps, from the haversack's
 *                                  strap stubs (GearPiece.strapAnchors) over the shoulders to the
 *                                  cartridge belt's top eyelets; adjusting buckle on the chest.
 *
 * Paths: `points` = strap centre line (mid-thickness), `normals` = outward face normals (away from
 * the body), both in the caller's frame (e.g. fit.strapPath(control, offset).points / .normals with
 * offset = thickness / 2 + ~0.0008).
 * Hooks: pass the eyelet frame the hook goes into (BeltRig.top[name], or a slot of a belt built
 * elsewhere: origin = eyelet centre on the belt's outer face, +Y up, +Z out) - the builder bends
 * the last ~4 cm of the strap to arrive vertically at the hook's loop. `true` = a free hook hanging
 * from the path end (review / display). The hook's loop bar sits 0.036 above the eyelet.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { US, type WebShade } from './palette';
import { merge, sheet, barBuckle, boxX, stitches, wireFrame, orientZ, US_LOD } from './parts';

export interface StrapPath {
  points: THREE.Vector3[];
  normals: THREE.Vector3[];
}

export interface WebStrapOptions extends StrapPath {
  /** Width (m) or width profile over the arc length. Default 0.032. */
  width?: number | ((s: number, L: number) => number);
  thickness?: number;
  shade?: WebShade;
  /** Wire hook at the path START / END into this eyelet frame, or a free hook (`true`). */
  hookStart?: THREE.Matrix4 | boolean;
  hookEnd?: THREE.Matrix4 | boolean;
  /** Adjusting buckles at these arc-length fractions (doubled end runs towards the path start). */
  buckles?: number[];
  /** D-rings on the outer face at these fractions. */
  dRings?: number[];
  /** Stitch rows along both edges (sewn straps; woven web has none). Default false. */
  edgeStitch?: boolean;
  name?: string;
}

/** Hook data (eyelet frame, m): loop bar height above the eyelet, wire radius. */
export const US_HOOK = { loopY: 0.036, r: 0.0016, beltT: 0.0035 };

/** The wire hook in its eyelet frame: rectangular loop for the strap, shank, hook through the eyelet. */
export function hookGeometry(): THREE.BufferGeometry {
  const { loopY, r, beltT } = US_HOOK;
  const loop = wireFrame(0.026, 0.013, r, 0.003, 24, 5);
  loop.translate(0, loopY - 0.0065 + r, 0.004);
  const shank = G.tube(
    [
      [0, loopY - 0.013 + r, 0.004],
      [0, 0.015, 0.0036],
      [0, 0.0055, 0.0028],
      [0, 0.0012, 0.0014],
      [0, -0.0002, -0.0015],
      [0, -0.0022, -beltT - r - 0.0003],
      [0, -0.008, -beltT - r - 0.0006],
      [0, -0.017, -beltT - r - 0.0004],
    ],
    r,
    5,
    22,
  );
  const cap = new THREE.SphereGeometry(r, 6, 4).translate(0, -0.017, -beltT - r - 0.0004);
  // flattened plate where the shank joins the loop (pressed steel on the M1936 hooks)
  const plate = G.box(0.008, 0.012, 0.0022);
  plate.translate(0, loopY - 0.019, 0.0038);
  return merge([loop, shank, cap.toNonIndexed(), plate]);
}

/** D-ring (flat, in the XY plane, straight side at y = 0 towards -Y) of wire radius r, width w. */
function dRingGeometry(w = 0.03, h = 0.022, r = 0.0018): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const hw = w / 2 - r;
  // the curved side from +X over the top to -X, then the straight side back
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * Math.PI;
    pts.push(new THREE.Vector3(Math.cos(a) * hw, Math.sin(a) * (h - 2 * r), 0));
  }
  for (const f of [-0.5, 0, 0.5]) pts.push(new THREE.Vector3(f * hw, 0, 0));
  const c = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  return new THREE.TubeGeometry(c, 24, r, 5, true);
}

interface Frame3 {
  p: THREE.Vector3;
  T: THREE.Vector3;
  N: THREE.Vector3;
  B: THREE.Vector3;
}

function resampleStrap(pts: THREE.Vector3[], nrm: THREE.Vector3[], step = 0.008) {
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const cn = new THREE.CatmullRomCurve3(nrm.map((n) => n.clone().normalize()), false, 'centripetal');
  const L = c.getLength();
  const n = Math.max(4, Math.ceil(L / (step * (US_LOD.low ? 1.6 : 1))));
  const P: THREE.Vector3[] = [], N: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    P.push(c.getPointAt(u));
    N.push(cn.getPoint(c.getUtoTmapping(u, 0)).normalize());
  }
  return { P, N, L };
}

/** Frame at arc fraction f of a sampled path. */
function frameOf(P: THREE.Vector3[], N: THREE.Vector3[], f: number): Frame3 {
  const k = Math.min(P.length - 2, Math.max(0, Math.floor(f * (P.length - 1))));
  const t = f * (P.length - 1) - k;
  const p = P[k].clone().lerp(P[k + 1], Math.min(1, Math.max(0, t)));
  const T = P[k + 1].clone().sub(P[k]).normalize();
  const n = N[k].clone().lerp(N[k + 1], t).normalize();
  const Nn = n.addScaledVector(T, -n.dot(T)).normalize();
  return { p, T, N: Nn, B: T.clone().cross(Nn).normalize() };
}

/** Matrix placing flat-authored hardware (X across the strap, Y along it, Z out) at a frame. */
function onStrap(f: Frame3, z: number): THREE.Matrix4 {
  const X = f.B.clone().negate(), Y = f.T.clone(), Z = f.N.clone();
  if (X.clone().cross(Y).dot(Z) < 0) X.negate();
  return new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(f.p.clone().addScaledVector(f.N, z));
}

/** A free hook frame at a path end: the hook hangs on along the path's direction. */
function freeHookFrame(P: THREE.Vector3[], N: THREE.Vector3[], atEnd: boolean): THREE.Matrix4 {
  const i = atEnd ? P.length - 1 : 0, j = atEnd ? P.length - 2 : 1;
  const dir = P[i].clone().sub(P[j]).normalize(); // continuing direction
  const Z = N[i].clone().addScaledVector(dir, -N[i].dot(dir)).normalize();
  const Y = dir.clone().negate();
  const X = Y.clone().cross(Z).normalize();
  const o = P[i].clone().addScaledVector(dir, US_HOOK.loopY + 0.002).addScaledVector(Z, -0.0045);
  return new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(o);
}

/**
 * The hook pivots in its eyelet: turn the eyelet frame about its Z axis (through the eyelet) so
 * the hook points up the strap (clamped to +-70 deg). Returns the rotated frame.
 */
function pivotHook(P: THREE.Vector3[], E: THREE.Matrix4, atEnd: boolean): THREE.Matrix4 {
  const o = new THREE.Vector3().setFromMatrixPosition(E);
  const inv = E.clone().invert();
  // a point on the strap ~7 cm from the hook, in eyelet-frame coordinates
  let q = P[atEnd ? P.length - 1 : 0];
  const order = atEnd ? P.map((_, i) => P.length - 1 - i) : P.map((_, i) => i);
  for (const i of order) {
    if (P[i].distanceTo(o) > 0.075) {
      q = P[i];
      break;
    }
  }
  const l = q.clone().applyMatrix4(inv);
  const ang = THREE.MathUtils.clamp(Math.atan2(-l.x, Math.max(1e-4, l.y)), -1.2, 1.2);
  return E.clone().multiply(new THREE.Matrix4().makeRotationZ(ang));
}

/** Bend the path end so the strap arrives along the hook's axis (-Y of the pivoted frame) at its loop. */
function bendToHook(P: THREE.Vector3[], N: THREE.Vector3[], E: THREE.Matrix4, atEnd: boolean) {
  const loopTop = new THREE.Vector3(0, US_HOOK.loopY + 0.0028, 0.0058).applyMatrix4(E);
  const up = new THREE.Vector3(0, 1, 0).transformDirection(E);
  const out = new THREE.Vector3(0, 0, 1).transformDirection(E);
  const order = atEnd ? P.map((_, i) => P.length - 1 - i) : P.map((_, i) => i);
  // cut the path where it passes closest to the loop
  let best = 0, bd = Infinity;
  for (let k = 0; k < Math.min(order.length - 2, 60); k++) {
    const d = P[order[k]].distanceTo(loopTop);
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  const keep = order.slice(best + 1).reverse(); // indices from the far end towards the hook
  const P2 = keep.map((i) => P[i].clone()), N2 = keep.map((i) => N[i].clone());
  // blend the last 80 mm onto the approach line above the loop (smooth, no kink)
  const L = 0.08;
  let acc = 0;
  for (let k = P2.length - 1; k > 0 && acc < L; k--) {
    acc += P2[k].distanceTo(P2[k - 1]);
    const w = 1 - Math.min(1, acc / L);
    const target = loopTop.clone().addScaledVector(up, acc);
    P2[k - 1].lerp(target, w * w * (3 - 2 * w));
    N2[k - 1].lerp(out, w * w * (3 - 2 * w)).normalize();
  }
  P2.push(loopTop.clone());
  N2.push(out.clone());
  if (!atEnd) {
    P2.reverse();
    N2.reverse();
  }
  P.length = 0;
  N.length = 0;
  P.push(...P2);
  N.push(...N2);
}

export function buildWebStrapAlong(o: WebStrapOptions): THREE.Group {
  const shade = o.shade ?? 'od7';
  const web = US.web(shade), thread = US.thread();
  const t = o.thickness ?? 0.0028;
  let { P, N } = resampleStrap(o.points, o.normals);
  const hooks: THREE.Matrix4[] = [];
  const endFrame = (h: THREE.Matrix4 | boolean | undefined, atEnd: boolean) => (h === true ? freeHookFrame(P, N, atEnd) : h instanceof THREE.Matrix4 ? h : null);
  const e0 = endFrame(o.hookStart, false), e1 = endFrame(o.hookEnd, true);
  const hs = e0 && o.hookStart !== true ? pivotHook(P, e0, false) : e0;
  const he = e1 && o.hookEnd !== true ? pivotHook(P, e1, true) : e1;
  if (hs) {
    bendToHook(P, N, hs, false);
    hooks.push(hs);
  }
  if (he) {
    bendToHook(P, N, he, true);
    hooks.push(he);
  }
  ({ P, N } = resampleStrap(P, N, 0.007));
  const arc: number[] = [0];
  for (let i = 1; i < P.length; i++) arc.push(arc[i - 1] + P[i].distanceTo(P[i - 1]));
  const L = arc[arc.length - 1];
  const wF = typeof o.width === 'function' ? o.width : () => (o.width as number | undefined) ?? 0.032;
  const parts: THREE.Object3D[] = [];
  parts.push(part(sheet(P, N, (_tt, s) => wF(s, L) / 2, t, { across: 2, samples: P.length - 1 }), web, { name: o.name ? `strap:${o.name}` : 'strap' }));
  const metal: THREE.BufferGeometry[] = [], webG: THREE.BufferGeometry[] = [], st: THREE.BufferGeometry[] = [];
  const fAt = (s: number) => frameOf(P, N, Math.min(1, Math.max(0, s / L)));
  // hooks and the strap ends folded round their loop bars
  for (const [E, atEnd] of [
    [hs, false],
    [he, true],
  ] as [THREE.Matrix4 | null, boolean][]) {
    if (!E) continue;
    metal.push(hookGeometry().applyMatrix4(E));
    // the last few cm of the strap run straight up the hook's axis (bendToHook), so the doubled
    // end is a flat tab in the hook frame: it wraps the loop bar and is box-stitched on the strap
    const s0 = atEnd ? L : 0;
    const w0 = wF(s0, L);
    const y0 = US_HOOK.loopY + 0.0028, z0 = 0.0058;
    const tab = G.rbox(w0 - 0.0016, 0.03, t * 0.9, Math.min(0.0009, t * 0.4), 1);
    tab.translate(0, y0 + 0.015, z0 + t * 0.95);
    webG.push(tab.applyMatrix4(E));
    const wrapBar = G.cyl(t * 0.95, t * 0.95, w0 - 0.0016, 10);
    wrapBar.rotateZ(Math.PI / 2);
    wrapBar.translate(0, y0 - 0.0004, z0 + t * 0.45);
    webG.push(wrapBar.applyMatrix4(E));
    const ex = new THREE.Vector3(0, 0, 1).transformDirection(E), ey = new THREE.Vector3(0, 1, 0).transformDirection(E);
    st.push(boxX(new THREE.Vector3(0, y0 + 0.017, z0 + t * 1.45 + 0.0002).applyMatrix4(E), w0 - 0.008, 0.016, ex, ey));
  }
  // adjusting buckles with the doubled strap end running back towards the path start
  for (const fr of o.buckles ?? []) {
    const s = fr * L;
    const f = fAt(s);
    const w = wF(s, L);
    metal.push(barBuckle(w + 0.005, 0.02, 0.0028, 0.0016, true).applyMatrix4(onStrap(f, t / 2 + 0.0004)));
    const q: THREE.Vector3[] = [], qn: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const fi = fAt(s - 0.004 - i * 0.0065);
      q.push(fi.p.clone().addScaledVector(fi.N, t + 0.0003));
      qn.push(fi.N);
    }
    webG.push(sheet(q, qn, (_tt, ss, LL) => (w / 2 - 0.0012) * (ss > LL - 0.012 ? 0.55 + 0.45 * Math.sqrt((LL - ss) / 0.012) : 1), t * 0.9, { across: 2, samples: 14 }));
    // metal tip on the loose end
    const ft = fAt(s - 0.066);
    const tip = G.rbox(w - 0.004, 0.012, 0.0032, 0.0012, 1).applyMatrix4(onStrap(ft, t + 0.0003));
    metal.push(tip);
  }
  // D-rings on a sewn web tab
  for (const fr of o.dRings ?? []) {
    const f = fAt(fr * L);
    const w = wF(fr * L, L);
    const m = onStrap(f, t / 2 + 0.0022);
    const ring = dRingGeometry(w * 0.85, 0.022, 0.0017);
    ring.translate(0, -0.004, 0);
    metal.push(ring.applyMatrix4(m));
    const tab = G.rbox(w - 0.004, 0.014, 0.0022, 0.0009, 1);
    tab.translate(0, -0.001, -0.0008);
    webG.push(tab.applyMatrix4(m));
    st.push(boxX(new THREE.Vector3(0, 0.001, 0.0005).applyMatrix4(m), w - 0.01, 0.008, f.N, f.T));
  }
  // edge stitching along the strap (both edges), inset 2.5 mm
  const rows: THREE.Vector3[][] = [[], []];
  for (let i = 0; o.edgeStitch && i < P.length; i += 1) {
    const f = frameOf(P, N, i / (P.length - 1));
    const hw = wF(arc[i], L) / 2 - 0.0028;
    rows[0].push(f.p.clone().addScaledVector(f.B, hw).addScaledVector(f.N, t / 2 + 0.0001));
    rows[1].push(f.p.clone().addScaledVector(f.B, -hw).addScaledVector(f.N, t / 2 + 0.0001));
  }
  for (const r of rows) if (r.length > 1) st.push(stitches(r, { len: 0.0036, gap: 0.0026, r: 0.00042 }));
  if (webG.length) parts.push(part(merge(webG), web));
  if (metal.length) parts.push(part(merge(metal), US.blackMetal()));
  parts.push(part(merge(st), thread));
  const g = group(parts);
  g.name = o.name ?? 'us-web-strap';
  return g;
}

// ---------------------------------------------------------------------------------------------
// M1936 suspenders
// ---------------------------------------------------------------------------------------------

export interface SuspendersOptions {
  /** The wearer's left / right strap: from the FRONT belt end, over the shoulder, to the REAR end. */
  left: StrapPath;
  right: StrapPath;
  /** Eyelet frames (or free hooks) for [left, right] front and rear ends. Default: free hooks. */
  frontHooks?: [THREE.Matrix4 | boolean, THREE.Matrix4 | boolean];
  rearHooks?: [THREE.Matrix4 | boolean, THREE.Matrix4 | boolean];
  shade?: WebShade;
}

/** Width profile: 0.032 at the front and rear ends, 0.044 over the shoulders. */
const suspenderWidth = (s: number, L: number) => {
  const u = s / L;
  const k = THREE.MathUtils.smoothstep(u, 0.16, 0.3) * (1 - THREE.MathUtils.smoothstep(u, 0.58, 0.72));
  return 0.032 + 0.012 * k;
};

/** Closest points between two polylines: [i, j, distance]. */
function closest(a: THREE.Vector3[], b: THREE.Vector3[]): [number, number, number] {
  let bi = 0, bj = 0, bd = Infinity;
  for (let i = 0; i < a.length; i++)
    for (let j = 0; j < b.length; j++) {
      const d = a[i].distanceToSquared(b[j]);
      if (d < bd) {
        bd = d;
        bi = i;
        bj = j;
      }
    }
  return [bi, bj, Math.sqrt(bd)];
}

export function buildM1936SuspendersAlong(o: SuspendersOptions): THREE.Group {
  const t = 0.0028;
  // resample, then lift the right strap over the left one where they cross at the back
  const Ls = resampleStrap(o.left.points, o.left.normals, 0.006);
  const Rs = resampleStrap(o.right.points, o.right.normals, 0.006);
  const [ci, cj, cd] = closest(Ls.P, Rs.P);
  const crossing = cd < 0.03;
  if (crossing) {
    for (let j = 0; j < Rs.P.length; j++) {
      const d = Rs.P[j].distanceTo(Rs.P[cj]);
      const w = 1 - THREE.MathUtils.smoothstep(d, 0.03, 0.09);
      Rs.P[j].addScaledVector(Rs.N[j], (t + 0.0005) * w);
    }
  }
  const parts: THREE.Object3D[] = [];
  const hooksF = o.frontHooks ?? [true, true], hooksR = o.rearHooks ?? [true, true];
  parts.push(
    buildWebStrapAlong({ points: Ls.P, normals: Ls.N, width: suspenderWidth, thickness: t, shade: o.shade, hookStart: hooksF[0], hookEnd: hooksR[0], buckles: [0.13], dRings: [0.25], name: 'm1936-suspender-l' }),
    buildWebStrapAlong({ points: Rs.P, normals: Rs.N, width: suspenderWidth, thickness: t, shade: o.shade, hookStart: hooksF[1], hookEnd: hooksR[1], buckles: [0.13], dRings: [0.25], name: 'm1936-suspender-r' }),
  );
  if (crossing) {
    // the crossing is sewn through both straps: a box-X on the upper strap
    const p = Rs.P[cj].clone(), n = Rs.N[cj].clone();
    const T = Rs.P[Math.min(Rs.P.length - 1, cj + 1)].clone().sub(Rs.P[Math.max(0, cj - 1)]).normalize();
    parts.push(part(boxX(p.addScaledVector(n, t / 2 + 0.0002), 0.03, 0.03, n, T), US.thread()));
  }
  void ci;
  const g = group(parts);
  g.name = 'us-m1936-suspenders';
  return g;
}

// ---------------------------------------------------------------------------------------------
// M1928 haversack shoulder straps
// ---------------------------------------------------------------------------------------------

export interface HaversackStrapsOptions {
  /** Paths from the haversack's strap stub ends (strapAnchors[0] / [1]) over the shoulders to the belt. */
  left: StrapPath;
  right: StrapPath;
  /** Eyelet frames (BeltRig.top['L2'] ...) for [left, right], or free hooks. Default: free hooks. */
  hooks?: [THREE.Matrix4 | boolean, THREE.Matrix4 | boolean];
  shade?: WebShade;
}

/** Width: 0.048 from the pack over the shoulder, narrowing to 0.03 on the chest (adjusting part). */
const haversackStrapWidth = (s: number, L: number) => 0.03 + 0.018 * (1 - THREE.MathUtils.smoothstep(s / L, 0.45, 0.62));

export function buildHaversackStrapsAlong(o: HaversackStrapsOptions): THREE.Group {
  const hooks = o.hooks ?? [true, true];
  const g = group([
    buildWebStrapAlong({ ...o.left, width: haversackStrapWidth, thickness: 0.0028, shade: o.shade, hookEnd: hooks[0], buckles: [0.74], name: 'm1928-shoulder-strap-l' }),
    buildWebStrapAlong({ ...o.right, width: haversackStrapWidth, thickness: 0.0028, shade: o.shade, hookEnd: hooks[1], buckles: [0.74], name: 'm1928-shoulder-strap-r' }),
  ]);
  g.name = 'us-m1928-shoulder-straps';
  return g;
}

/** A single free-standing hook in its eyelet frame (e.g. the haversack belt strap end). */
export function buildBeltHook(): THREE.Mesh {
  return part(hookGeometry(), US.blackMetal(), { name: 'us-belt-hook' });
}

void orientZ;
