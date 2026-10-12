/**
 * Fitting API: where gear, belts and straps go on a clothed, posed soldier.
 *
 * All positions are ASSET SPACE (metres, +Y up, +Z forward, +X = the soldier's left, origin on
 * the ground between the feet). Heights passed to this API use the same convention as a
 * UniformSpec: metres above the ground for the 1.76 m reference figure standing barefoot (e.g. the
 * belt at 1.03). They are converted to the soldier's REST TRUNK space, so they follow the pose
 * (pelvis tilt, spine bend) and scale with stature.
 *
 * Angles around the trunk: 0 = centre front, +90 = the soldier's LEFT side (+X), -90 = right side,
 * 180 = centre back. They are measured in the trunk's own horizontal plane at that height.
 *
 * Surfaces:
 *  - 'torso'   : tunic torso + skirt + trousers (no sleeves / arms)  -> belts, straps, pouches, packs
 *  - 'clothed' : everything worn incl. sleeves                        -> clearance tests
 *  - 'body'    : the bare body                                        -> garment authors
 */
import * as THREE from 'three';
import type { GearMount, GearPiece } from '../contracts';
import type { BodyModel } from './body';
import { gradient, raycast, sstep, type SDF } from './sdfx';
import type { Skeleton } from './skeleton';
import type { UniformFields } from './uniform';
import { HEAD_DIMS } from './head';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;
const HIP_REST = 0.903;

export interface SurfaceHit {
  /** Point on the surface (asset space). */
  position: THREE.Vector3;
  /** Outward unit normal. */
  normal: THREE.Vector3;
}

/** A query for `surfacePoint`. */
export type SurfaceQuery =
  /** Nearest surface point to a seed point (asset space). */
  | THREE.Vector3
  /** First hit of a ray (asset space). The origin should be inside the body (or outside, aiming at it). */
  | { from: THREE.Vector3; dir: THREE.Vector3 }
  /** Around the trunk: a ray from the trunk axis at `height` towards `angle` (deg, 0 = front, +90 = left). */
  | { angle: number; height: number; /** tilt of the ray above the horizontal plane (deg) */ elevation?: number };

export type FitLayer = 'torso' | 'clothed' | 'body';

export interface BeltSpec {
  /** Belt centre height (m, reference figure barefoot). Default: the uniform's belt, else 1.03. */
  height: number;
  /** Belt width (m). Default 0.045. */
  width: number;
  /** Leather thickness (m). Default 0.004. */
  thickness: number;
}

/** A closed path around the torso (belt) or an open path over it (strap). */
export interface SurfacePath {
  /** Centre line of the band (asset space). For belts: closed loop, first point not repeated. */
  points: THREE.Vector3[];
  /** Outward unit normals (band surface normal), one per point. */
  normals: THREE.Vector3[];
  /** Unit tangents along the path. */
  tangents: THREE.Vector3[];
  closed: boolean;
}

/** A belt path with helpers. */
export interface BeltPath extends SurfacePath {
  spec: BeltSpec;
  /** Frame on the belt's OUTER face at `angle` (deg): origin on the outer face at the belt centre line, z outward, y up. */
  frameAt(angle: number): THREE.Matrix4;
}

export interface MountOptions {
  /** Gear piece (its object's bounding box defines the back-face footprint). */
  piece?: GearPiece;
  /** Or the footprint directly: x from -w/2..w/2, y from `top - h`..`top`, where top defaults to 0.25 h. */
  size?: { w: number; h: number; top?: number };
  /** Angle around the trunk (deg). Default per mount (see MOUNT_DEFAULTS). */
  angle?: number;
  /** Height (m, reference figure). Default per mount; belt mounts use the belt height. */
  height?: number;
  /** Extra gap between the back face and the surface (m), default 0.0005. */
  gap?: number;
  /** Rotation about the outward axis (deg, + = counter-clockwise seen from outside). */
  roll?: number;
  /** Allow the piece to swing outwards at the bottom to rest on the body (belt / hip items), default true. */
  swing?: boolean;
  /** Fit against this layer (default 'torso'). */
  layer?: FitLayer;
}

/** Default placement per mount (angle deg around the trunk, height m on the reference figure or 'belt'). */
export const MOUNT_DEFAULTS: Record<Exclude<GearMount, 'head'>, { angle: number; height: number | 'belt'; belt: boolean }> = {
  'belt-front-left': { angle: 34, height: 'belt', belt: true },
  'belt-front-right': { angle: -34, height: 'belt', belt: true },
  'belt-left': { angle: 88, height: 'belt', belt: true },
  'belt-right': { angle: -88, height: 'belt', belt: true },
  'belt-rear-left': { angle: 132, height: 'belt', belt: true },
  'belt-rear-right': { angle: -132, height: 'belt', belt: true },
  'belt-rear': { angle: 180, height: 'belt', belt: true },
  back: { angle: 180, height: 1.3, belt: false },
  'shoulder-strap': { angle: 22, height: 1.3, belt: false },
  chest: { angle: 0, height: 1.3, belt: false },
  hip: { angle: -118, height: 0.93, belt: false },
};

export interface HeadFit {
  /** Head-local -> asset space (head.ts frame: origin between the ear canals, +Z face, +Y up). */
  head: THREE.Matrix4;
  /**
   * Headgear frame (gear brief convention): origin at the centre of the head opening on the
   * liner-band plane, +Z forward (brow side), +Y up the head. Put a helmet/cap object here.
   */
  band: THREE.Matrix4;
  /** Top of the hair (asset space). */
  crown: THREE.Vector3;
  /** Brow line centre on the forehead (asset space). */
  brow: THREE.Vector3;
  /** Head dimensions (m): breadth incl. hair, length incl. hair, crown height above the band plane, band circumference. */
  dims: { width: number; length: number; crownAboveBand: number; bandCircumference: number };
}

export interface Fit {
  sk: Skeleton;
  body: BodyModel;
  fields: UniformFields;
  /** Stature scale (stature / 1.76). */
  s: number;
  belt: BeltSpec;
  /** Field of a layer (negative inside). */
  field(layer?: FitLayer): SDF;
  /** Rest trunk height of a reference height (m). */
  restY(height: number): number;
  /** Trunk axis point (asset space) at a reference height. */
  axisPoint(height: number): THREE.Vector3;
  /** World direction of a trunk angle (deg) at a reference height. */
  trunkDir(angle: number, height: number, elevation?: number): THREE.Vector3;
  /** Trunk up direction at a reference height. */
  trunkUp(height: number): THREE.Vector3;
  surfacePoint(q: SurfaceQuery, layer?: FitLayer): SurfaceHit;
  beltPath(height?: number, outwardOffset?: number, samples?: number): BeltPath;
  strapPath(control: THREE.Vector3[], offset?: number, opts?: { samples?: number; layer?: FitLayer; tension?: number; closed?: boolean }): SurfacePath;
  mountFrame(mount: GearMount, opts?: MountOptions): THREE.Matrix4;
  headFrame(opts?: { tilt?: number; lift?: number }): HeadFit;
}

// ------------------------------------------------------------------ implementation

function projectOut(f: SDF, p: THREE.Vector3, target: number, iters = 10): THREE.Vector3 {
  const n = V();
  for (let i = 0; i < iters; i++) {
    const d = f(p.x, p.y, p.z);
    const e = target - d;
    if (Math.abs(e) < 2e-5) break;
    gradient(f, p.x, p.y, p.z, 0.0008, n);
    p.addScaledVector(n, e);
  }
  return p;
}

function footprintOf(opts: MountOptions): { x0: number; x1: number; y0: number; y1: number } {
  if (opts.piece) {
    const b = new THREE.Box3().setFromObject(opts.piece.object);
    if (!b.isEmpty()) return { x0: b.min.x, x1: b.max.x, y0: b.min.y, y1: b.max.y };
    const sz = opts.piece.size;
    return { x0: -sz.w / 2, x1: sz.w / 2, y0: -0.75 * sz.h, y1: 0.25 * sz.h };
  }
  if (opts.size) {
    const top = opts.size.top ?? 0.25 * opts.size.h;
    return { x0: -opts.size.w / 2, x1: opts.size.w / 2, y0: top - opts.size.h, y1: top };
  }
  return { x0: -0.02, x1: 0.02, y0: -0.02, y1: 0.02 };
}

/**
 * Create the fitting helpers for a soldier (normally obtained from `buildSoldier(...).fit`).
 * `belt` overrides the belt spec (defaults: the uniform's belt height, 45 mm wide, 4 mm thick).
 */
export function createFit(bm: BodyModel, fields: UniformFields, belt: Partial<BeltSpec> = {}): Fit {
  const sk = bm.sk, s = sk.s;
  const beltSpec: BeltSpec = {
    height: belt.height ?? (fields.beltRest !== null ? fields.beltRest / s + HIP_REST : 1.03),
    width: belt.width ?? 0.045,
    thickness: belt.thickness ?? 0.004,
  };
  const torso: SDF = (x, y, z) => Math.min(fields.tunicTorso(x, y, z), fields.trousers(x, y, z));
  const field = (layer: FitLayer = 'torso'): SDF => (layer === 'clothed' ? fields.clothed : layer === 'body' ? bm.full : torso);
  const restY = (h: number) => (h - HIP_REST) * s;
  // trunk axis in rest space: centre of the trunk section (z of the widest point)
  const axisRest = (h: number) => {
    const y = restY(h);
    // walk the trunk loft table for the section centre
    const t = bm.trunkLoft;
    const fi = Math.min(Math.max((y - t.y0) / t.dy, 0), t.n - 1.001);
    const i = fi | 0, a = fi - i;
    const zm = t.rows[i * 4 + 1] * (1 - a) + t.rows[i * 4 + 5] * a;
    return V(0, y, zm);
  };
  const axisPoint = (h: number) => bm.space.toWorld(axisRest(h));
  const trunkDir = (angle: number, h: number, elev = 0) => {
    const a = angle * D2R, e = elev * D2R;
    return bm.space.dirToWorld(V(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)), restY(h));
  };
  const trunkUp = (h: number) => bm.space.dirToWorld(V(0, 1, 0), restY(h));

  const surfacePoint = (q: SurfaceQuery, layer: FitLayer = 'torso'): SurfaceHit => {
    const f = field(layer);
    let p: THREE.Vector3 | null = null;
    if (q instanceof THREE.Vector3) {
      p = projectOut(f, q.clone(), 0, 16);
    } else if ('from' in q) {
      p = raycast(f, q.from, q.dir, 1.5);
      if (!p) p = projectOut(f, q.from.clone(), 0, 16);
    } else {
      const o = axisPoint(q.height);
      const d = trunkDir(q.angle, q.height, q.elevation ?? 0);
      // start outside and march inwards (robust against internal surfaces)
      const start = o.clone().addScaledVector(d, 0.45 * s);
      p = raycast(f, start, d.clone().negate(), 0.45 * s) ?? projectOut(f, o.clone().addScaledVector(d, 0.15 * s), 0, 16);
    }
    const n = gradient(f, p.x, p.y, p.z, 0.0015);
    return { position: p, normal: n };
  };

  // ---- belt
  const beltPath = (height = beltSpec.height, outwardOffset = 0, samples = 96): BeltPath => {
    const spec = { ...beltSpec, height };
    const f = torso;
    const up = trunkUp(height);
    const hw = spec.width / 2;
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const radial: number[] = [];
    const dirs: THREE.Vector3[] = [];
    const o = axisPoint(height);
    for (let i = 0; i < samples; i++) {
      const ang = (i / samples) * 360;
      const d = trunkDir(ang, height);
      dirs.push(d);
      // the band must clear the cloth over its whole width: take the most protruding point
      let rmax = 0;
      for (const dv of [-hw, -hw * 0.5, 0, hw * 0.5, hw]) {
        const oo = o.clone().addScaledVector(up, dv);
        const start = oo.clone().addScaledVector(d, 0.4 * s);
        const hit = raycast(f, start, d.clone().negate(), 0.4 * s);
        const r = hit ? hit.clone().sub(oo).dot(d) : 0.15 * s;
        if (r > rmax) rmax = r;
      }
      radial.push(rmax);
    }
    // smooth the radius a little (a belt is stiff) and never let it dip inside the cloth
    const sm = radial.slice();
    for (let it = 0; it < 3; it++) {
      const prev = sm.slice();
      for (let i = 0; i < samples; i++) {
        const a = prev[(i - 1 + samples) % samples], b = prev[(i + 1) % samples];
        sm[i] = Math.max(radial[i], 0.25 * a + 0.5 * prev[i] + 0.25 * b);
      }
    }
    for (let i = 0; i < samples; i++) {
      pts.push(o.clone().addScaledVector(dirs[i], sm[i] + spec.thickness / 2 + outwardOffset));
    }
    const tangents: THREE.Vector3[] = [];
    for (let i = 0; i < samples; i++) {
      const t = pts[(i + 1) % samples].clone().sub(pts[(i - 1 + samples) % samples]).normalize();
      tangents.push(t);
      nrm.push(new THREE.Vector3().crossVectors(t, up).normalize().multiplyScalar(1));
      if (nrm[i].dot(dirs[i]) < 0) nrm[i].negate();
    }
    const frameAt = (angle: number) => {
      const a = ((angle % 360) + 360) % 360;
      const fi = (a / 360) * samples;
      const i0 = Math.floor(fi) % samples, i1 = (i0 + 1) % samples, t = fi - Math.floor(fi);
      const p = pts[i0].clone().lerp(pts[i1], t);
      const n = nrm[i0].clone().lerp(nrm[i1], t).normalize();
      p.addScaledVector(n, spec.thickness / 2);
      const y = up.clone().addScaledVector(n, -up.dot(n)).normalize();
      const x = new THREE.Vector3().crossVectors(y, n);
      return new THREE.Matrix4().makeBasis(x, y, n).setPosition(p);
    };
    return { points: pts, normals: nrm, tangents, closed: true, spec, frameAt };
  };

  // ---- straps
  const strapPath = (control: THREE.Vector3[], offset = 0.002, opts: { samples?: number; layer?: FitLayer; tension?: number; closed?: boolean } = {}): SurfacePath => {
    const f = field(opts.layer ?? 'torso');
    const closed = opts.closed ?? false;
    const curve = new THREE.CatmullRomCurve3(control.map((p) => p.clone()), closed, 'centripetal');
    const len = curve.getLength();
    const n = opts.samples ?? Math.max(12, Math.ceil(len / 0.012));
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= (closed ? n - 1 : n); i++) pts.push(curve.getPointAt(i / n));
    const N = pts.length;
    // project onto the surface at `offset`, then relax (a strap under tension bridges hollows)
    for (const p of pts) projectOut(f, p, offset, 12);
    const tension = opts.tension ?? 0.5;
    const iters = Math.round(40 * tension);
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < N; i++) {
        if (!closed && (i === 0 || i === N - 1)) continue;
        const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N];
        const m = a.clone().add(b).multiplyScalar(0.5);
        const p = pts[i].lerp(m, 0.5);
        const d = f(p.x, p.y, p.z);
        if (d < offset) projectOut(f, p, offset, 6);
      }
    }
    const normals: THREE.Vector3[] = [], tangents: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      const nn = gradient(f, p.x, p.y, p.z, 0.002);
      const a = pts[closed ? (i - 1 + N) % N : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % N : Math.min(N - 1, i + 1)];
      const t = b.clone().sub(a).normalize();
      nn.addScaledVector(t, -nn.dot(t)).normalize();
      normals.push(nn);
      tangents.push(t);
    }
    return { points: pts, normals, tangents, closed };
  };

  // ---- rigid mounts
  const mountFrame = (mount: GearMount, opts: MountOptions = {}): THREE.Matrix4 => {
    if (mount === 'head') return headFrame().band;
    const def = MOUNT_DEFAULTS[mount];
    const angle = opts.angle ?? def.angle;
    const height = opts.height ?? (def.height === 'belt' ? beltSpec.height : def.height);
    const gap = opts.gap ?? 0.0005;
    const f = field(opts.layer ?? 'torso');
    let base: THREE.Matrix4;
    if (def.belt && opts.height === undefined) {
      base = beltPath(beltSpec.height).frameAt(angle);
    } else {
      const hit = surfacePoint({ angle, height }, opts.layer ?? 'torso');
      const nz = hit.normal.clone();
      // keep belt-like items upright: blend the normal towards the horizontal trunk direction
      const up = trunkUp(height);
      const y = up.clone().addScaledVector(nz, -up.dot(nz)).normalize();
      const x = new THREE.Vector3().crossVectors(y, nz);
      base = new THREE.Matrix4().makeBasis(x, y, nz).setPosition(hit.position);
    }
    if (opts.roll) base.multiply(new THREE.Matrix4().makeRotationZ(opts.roll * D2R));
    // footprint samples on the back face (z = 0)
    const fp = footprintOf(opts);
    const samples: THREE.Vector3[] = [];
    for (let j = 0; j <= 6; j++) for (let i = 0; i <= 6; i++) {
      samples.push(V(fp.x0 + ((fp.x1 - fp.x0) * i) / 6, fp.y0 + ((fp.y1 - fp.y0) * j) / 6, 0));
    }
    const worst = (m: THREE.Matrix4, below: boolean) => {
      let pen = 0;
      const w = V();
      for (const q of samples) {
        if (below && q.y > -0.005) continue;
        w.copy(q).applyMatrix4(m);
        const d = f(w.x, w.y, w.z) - gap;
        if (-d > pen) pen = -d;
      }
      return pen;
    };
    let m = base.clone();
    const swing = opts.swing ?? (def.belt || mount === 'hip');
    if (swing) {
      // tilt the bottom outwards (about the local x axis through the origin) until it clears
      let lo = 0, hi = 45 * D2R;
      const tilted = (a: number) => base.clone().multiply(new THREE.Matrix4().makeRotationX(-a));
      if (worst(tilted(0), true) > 0) {
        if (worst(tilted(hi), true) > 0) lo = hi;
        else for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (worst(tilted(mid), true) > 0) lo = mid; else hi = mid; }
        m = tilted(lo === hi ? hi : hi);
      }
    }
    // push out along the local z until the whole back face clears the surface
    const pen = worst(m, false);
    if (pen > 0) m.multiply(new THREE.Matrix4().makeTranslation(0, 0, pen + 1e-4));
    return m;
  };

  // ---- head
  const headFrame = (opts: { tilt?: number; lift?: number } = {}): HeadFit => {
    const H = sk.head;
    const head = new THREE.Matrix4().makeBasis(H.x, H.y, H.z).setPosition(H.o);
    const b = HEAD_DIMS.band;
    const local = new THREE.Matrix4().makeRotationX(-(b.tilt + (opts.tilt ?? 0)) * D2R);
    local.setPosition(0, b.y + (opts.lift ?? 0), b.z);
    const band = head.clone().multiply(local);
    const crown = V(0, HEAD_DIMS.crownY, HEAD_DIMS.crownZ).applyMatrix4(head);
    const brow = V(...HEAD_DIMS.glabella).applyMatrix4(head);
    return {
      head,
      band,
      crown,
      brow,
      dims: {
        width: HEAD_DIMS.width,
        length: HEAD_DIMS.length,
        crownAboveBand: HEAD_DIMS.crownY - b.y,
        bandCircumference: b.circumference,
      },
    };
  };

  void sstep;
  return { sk, body: bm, fields, s, belt: beltSpec, field, restY, axisPoint, trunkDir, trunkUp, surfacePoint, beltPath, strapPath, mountFrame, headFrame };
}
