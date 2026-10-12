/**
 * Fitting helpers built on the shared fitting API (src/assets/shared/human/fit.ts):
 *
 *  - beltLine(): the belt centre line with an arc-length parametrisation. s = 0 at the front
 *    centre; s grows towards the soldier's LEFT (front -> left -> back -> right), which is the
 *    +x direction of a belt item's local frame (x along the belt, y up, z out of the body).
 *    Optional bulges push the belt out where something is tucked behind it.
 *  - wrapOnBelt(): bends an item authored flat in the belt-local frame (y = 0 on the belt centre
 *    line, z = 0 on the belt's OUTER face) around the waist, then lets each column of the item
 *    swing out below the belt until it rests on the body (no gap, no intersection). Leather
 *    pouches and canvas bags follow the waist like the real ones.
 *  - strapOn(): a strap path over any field (cloth + pockets + other straps), like fit.strapPath.
 *  - Obstacle fields: rounded boxes in a frame, flat strap bands, and their union.
 */
import * as THREE from 'three';
import type { Fit } from '../../shared/human/fit';
import { gradient, type SDF } from '../../shared/human/sdfx';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

// ------------------------------------------------------------------ fields

/** Push p along the gradient until f(p) = target. */
export function projectTo(f: SDF, p: THREE.Vector3, target: number, iters = 10): THREE.Vector3 {
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

/** Union of fields (negative inside). */
export function union(fields: SDF[]): SDF {
  const fs = fields.filter(Boolean);
  if (fs.length === 1) return fs[0];
  return (x, y, z) => {
    let d = Infinity;
    for (const f of fs) {
      const v = f(x, y, z);
      if (v < d) d = v;
    }
    return d;
  };
}

/** Rounded box in a frame (matrix: local -> asset), centre c and half extents h (local). */
export function boxField(m: THREE.Matrix4, c: [number, number, number], h: [number, number, number], r = 0.003): SDF {
  const inv = m.clone().invert();
  const e = inv.elements;
  const bound = Math.hypot(h[0], h[1], h[2]) + 0.05;
  const wc = V(...c).applyMatrix4(m);
  return (x, y, z) => {
    const dx0 = x - wc.x, dy0 = y - wc.y, dz0 = z - wc.z;
    const dd = Math.sqrt(dx0 * dx0 + dy0 * dy0 + dz0 * dz0);
    if (dd > bound) return dd - bound + 0.05;
    const lx = e[0] * x + e[4] * y + e[8] * z + e[12] - c[0];
    const ly = e[1] * x + e[5] * y + e[9] * z + e[13] - c[1];
    const lz = e[2] * x + e[6] * y + e[10] * z + e[14] - c[2];
    const qx = Math.abs(lx) - h[0] + r, qy = Math.abs(ly) - h[1] + r, qz = Math.abs(lz) - h[2] + r;
    const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
    return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - r;
  };
}

/** A laid strap (centre line + normals) as an obstacle: flat band of width w and thickness t. */
export function bandField(pts: THREE.Vector3[], nrm: THREE.Vector3[], w: number, t: number): SDF {
  const n = pts.length;
  const segs: { a: THREE.Vector3; d: THREE.Vector3; len: number; nz: THREE.Vector3; bx: THREE.Vector3 }[] = [];
  const box = new THREE.Box3();
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = b.clone().sub(a);
    const len = d.length();
    if (len < 1e-6) continue;
    d.divideScalar(len);
    const nz = nrm[i].clone().add(nrm[i + 1]).normalize();
    nz.addScaledVector(d, -nz.dot(d)).normalize();
    const bx = new THREE.Vector3().crossVectors(nz, d);
    segs.push({ a, d, len, nz, bx });
    box.expandByPoint(a).expandByPoint(b);
  }
  box.expandByScalar(w + 0.02);
  const hw = w / 2, ht = t / 2;
  return (x, y, z) => {
    if (x < box.min.x || y < box.min.y || z < box.min.z || x > box.max.x || y > box.max.y || z > box.max.z) return 0.02;
    let best = Infinity;
    for (const s of segs) {
      const px = x - s.a.x, py = y - s.a.y, pz = z - s.a.z;
      const u = px * s.d.x + py * s.d.y + pz * s.d.z;
      if (u < -0.02 || u > s.len + 0.02) continue;
      const v = px * s.bx.x + py * s.bx.y + pz * s.bx.z;
      const h = px * s.nz.x + py * s.nz.y + pz * s.nz.z;
      const qu = Math.max(-u, u - s.len, 0);
      const qv = Math.abs(v) - hw, qh = Math.abs(h) - ht;
      const ov = Math.max(qv, 0), oh = Math.max(qh, 0);
      const d = Math.sqrt(qu * qu + ov * ov + oh * oh) + Math.min(Math.max(qv, qh), 0);
      if (d < best) best = d;
    }
    return best === Infinity ? 0.02 : best;
  };
}

// ------------------------------------------------------------------ belt line

export interface BeltSample {
  /** Belt centre line point (mid-thickness). */
  p: THREE.Vector3;
  /** Outward normal (horizontal in the trunk frame). */
  n: THREE.Vector3;
  /** Tangent, towards +s. */
  t: THREE.Vector3;
  /** Up (belt band width direction). */
  u: THREE.Vector3;
}

export interface BeltLine {
  /** Circumference (m). */
  L: number;
  width: number;
  thickness: number;
  height: number;
  up: THREE.Vector3;
  /** Sample at arc position s (wraps). */
  at(s: number): BeltSample;
  /** Arc position of a trunk angle (deg, 0 = front, +90 = left), in (-L/2, L/2]. */
  sAt(angle: number): number;
  /** Centre line points / normals (closed loop) for G.strap. */
  points: THREE.Vector3[];
  normals: THREE.Vector3[];
  /** Local frame on the OUTER face at s (x along +s, y up, z out). */
  frameAt(s: number, out?: number): THREE.Matrix4;
}

export interface Bulge {
  /** Arc position of the bulge centre. */
  s: number;
  /** Outward offset at the centre (m). */
  h: number;
  /** Half width of the raised part (m); it blends out over another `blend` m. */
  w: number;
  blend?: number;
}

export function beltLine(fit: Fit, opts: { height?: number; samples?: number; bulges?: Bulge[] } = {}): BeltLine {
  const height = opts.height ?? fit.belt.height;
  const N = opts.samples ?? 192;
  const bp = fit.beltPath(height, 0, N);
  const up = fit.trunkUp(height).normalize();
  const pts = bp.points.map((p) => p.clone());
  // arc lengths from the front centre (index 0 = angle 0)
  const cum = (P: THREE.Vector3[]) => {
    const c = [0];
    for (let i = 1; i <= N; i++) c.push(c[i - 1] + P[i % N].distanceTo(P[i - 1]));
    return c;
  };
  let arc = cum(pts);
  const bulges = opts.bulges ?? [];
  if (bulges.length) {
    const L0 = arc[N];
    const off = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      let s = arc[i];
      if (s > L0 / 2) s -= L0;
      for (const b of bulges) {
        let ds = Math.abs(s - b.s);
        if (ds > L0 / 2) ds = L0 - ds;
        const bl = b.blend ?? 0.03;
        const k = ds <= b.w ? 1 : ds >= b.w + bl ? 0 : 0.5 + 0.5 * Math.cos(((ds - b.w) / bl) * Math.PI);
        off[i] = Math.max(off[i], b.h * k);
      }
    }
    for (let i = 0; i < N; i++) pts[i].addScaledVector(bp.normals[i], off[i]);
    arc = cum(pts);
  }
  const L = arc[N];
  const tangents: THREE.Vector3[] = [], normals: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const t = pts[(i + 1) % N].clone().sub(pts[(i - 1 + N) % N]).normalize();
    const n = new THREE.Vector3().crossVectors(t, up).normalize();
    if (n.dot(bp.normals[i]) < 0) n.negate();
    tangents.push(t);
    normals.push(n);
  }
  const at = (s0: number): BeltSample => {
    let s = s0 % L;
    if (s < 0) s += L;
    // binary search the segment
    let lo = 0, hi = N;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (arc[mid] <= s) lo = mid; else hi = mid;
    }
    const i0 = lo % N, i1 = (lo + 1) % N;
    const a = (s - arc[lo]) / Math.max(1e-9, arc[lo + 1] - arc[lo]);
    // Catmull-Rom position for a smooth curve, linear normals
    const pm = pts[(i0 - 1 + N) % N], p0 = pts[i0], p1 = pts[i1], p2 = pts[(i1 + 1) % N];
    const a2 = a * a, a3 = a2 * a;
    const p = V(
      0.5 * (2 * p0.x + (-pm.x + p1.x) * a + (2 * pm.x - 5 * p0.x + 4 * p1.x - p2.x) * a2 + (-pm.x + 3 * p0.x - 3 * p1.x + p2.x) * a3),
      0.5 * (2 * p0.y + (-pm.y + p1.y) * a + (2 * pm.y - 5 * p0.y + 4 * p1.y - p2.y) * a2 + (-pm.y + 3 * p0.y - 3 * p1.y + p2.y) * a3),
      0.5 * (2 * p0.z + (-pm.z + p1.z) * a + (2 * pm.z - 5 * p0.z + 4 * p1.z - p2.z) * a2 + (-pm.z + 3 * p0.z - 3 * p1.z + p2.z) * a3),
    );
    const n = normals[i0].clone().lerp(normals[i1], a).normalize();
    const t = tangents[i0].clone().lerp(tangents[i1], a).normalize();
    const u = new THREE.Vector3().crossVectors(n, t).normalize();
    // re-orthogonalise n against t
    n.crossVectors(t, u).normalize();
    return { p, n, t, u };
  };
  const sAt = (angle: number) => {
    const a = ((angle % 360) + 360) % 360;
    const fi = (a / 360) * N;
    const i = Math.floor(fi), f = fi - i;
    let s = arc[i] + (arc[Math.min(N, i + 1)] - arc[i]) * f;
    if (s > L / 2) s -= L;
    return s;
  };
  const frameAt = (s: number, out = 0) => {
    const b = at(s);
    const o = b.p.clone().addScaledVector(b.n, bp.spec.thickness / 2 + out);
    return new THREE.Matrix4().makeBasis(b.t, b.u, b.n).setPosition(o);
  };
  return { L, width: bp.spec.width, thickness: bp.spec.thickness, height, up, at, sAt, points: pts, normals, frameAt };
}

// ------------------------------------------------------------------ wrapping belt items

export interface WrapOptions {
  /** Arc position of the item's local x = 0. */
  s0: number;
  /** Surface the item rests on (negative inside). */
  field: SDF;
  /** Clearance kept from the field (m), default 0.0006. */
  gap?: number;
  /** Let the part below the pivot swing out to rest on the body (default true). */
  swing?: boolean;
  /** Local y of the swing pivot (default: the belt's top edge). */
  pivot?: number;
  /** Local z of the item's back face (default 0 = on the belt's outer face). */
  back?: number;
  /** Extra outward offset of the whole item (m). */
  lift?: number;
  /** Mirror the item along its local x (winding is fixed). */
  mirror?: boolean;
  /** Extra swing (deg) added to every column (e.g. the bottom kicked out by the item's fill). */
  kick?: number;
}

export interface Wrapped {
  object: THREE.Group;
  /** Map a local point (item frame) to asset space. */
  map(x: number, y: number, z: number): THREE.Vector3;
  /** Local frame (x along the belt, y up the item, z out) at a local point, asset space. */
  frame(x: number, y: number, z?: number): THREE.Matrix4;
}

export function wrapOnBelt(obj: THREE.Object3D, line: BeltLine, o: WrapOptions): Wrapped {
  const gap = o.gap ?? 0.0006;
  const pivot = o.pivot ?? line.width / 2;
  const back = o.back ?? 0;
  const lift = o.lift ?? 0;
  const base = line.thickness / 2 + lift;
  const mir = o.mirror ? -1 : 1;
  obj.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(obj);
  if (o.mirror) { const a = -bb.max.x, b = -bb.min.x; bb.min.x = a; bb.max.x = b; }
  const x0 = bb.min.x, x1 = bb.max.x;
  const nc = Math.max(3, Math.ceil((x1 - x0) / 0.01) + 1);
  const cols: { x: number; dz: number; th: number }[] = [];
  const f = o.field;
  const q = V();
  const pointAt = (b: BeltSample, y: number, z: number, dz: number, th: number, out: THREE.Vector3) => {
    const c = Math.cos(th), s = Math.sin(th);
    out.copy(b.p).addScaledVector(b.n, base + dz);
    if (y >= pivot || th === 0) return out.addScaledVector(b.u, y).addScaledVector(b.n, z);
    // rotate (u, n) about t by th: bottom outwards
    const dy = y - pivot;
    out.addScaledVector(b.u, pivot);
    out.addScaledVector(b.u, dy * c + z * s).addScaledVector(b.n, -dy * s + z * c);
    return out;
  };
  for (let k = 0; k < nc; k++) {
    const x = x0 + ((x1 - x0) * k) / (nc - 1);
    const b = line.at(o.s0 + x);
    // push-out for the part above the pivot
    let dz = 0;
    for (let it = 0; it < 2; it++) {
      let need = 0;
      for (let y = Math.max(pivot, bb.min.y); y <= bb.max.y + 1e-6; y += 0.005) {
        pointAt(b, y, back, dz, 0, q);
        const d = f(q.x, q.y, q.z);
        if (gap - d > need) need = gap - d;
      }
      dz += need;
      if (need < 1e-5) break;
    }
    let th = (o.kick ?? 0) * D2R;
    if (o.swing !== false && bb.min.y < pivot) {
      const worst = (a: number) => {
        let pen = 0;
        for (let y = bb.min.y; y < pivot; y += 0.008) {
          pointAt(b, y, back, dz, a, q);
          const d = f(q.x, q.y, q.z);
          if (gap - d > pen) pen = gap - d;
        }
        return pen;
      };
      if (worst(th) > 0) {
        let lo = th, hi = 50 * D2R;
        if (worst(hi) > 0) lo = hi;
        else for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (worst(mid) > 0) lo = mid; else hi = mid; }
        th = hi;
      }
    }
    cols.push({ x, dz, th });
  }
  // smooth: max filter then box blur (a leather/canvas item does not kink)
  const smooth = (key: 'dz' | 'th', r: number) => {
    const raw = cols.map((c) => c[key]);
    const mx = raw.map((_, i) => Math.max(...raw.slice(Math.max(0, i - r), Math.min(raw.length, i + r + 1))));
    for (let i = 0; i < cols.length; i++) {
      let s = 0, n = 0;
      for (let j = Math.max(0, i - r); j <= Math.min(cols.length - 1, i + r); j++) { s += mx[j]; n++; }
      cols[i][key] = Math.max(raw[i], s / n);
    }
  };
  smooth('dz', 2);
  smooth('th', 3);
  const colAt = (x: number) => {
    const fi = THREE.MathUtils.clamp(((x - x0) / Math.max(1e-6, x1 - x0)) * (nc - 1), 0, nc - 1);
    const i = Math.min(nc - 2, Math.floor(fi)), a = fi - i;
    return { dz: cols[i].dz * (1 - a) + cols[i + 1].dz * a, th: cols[i].th * (1 - a) + cols[i + 1].th * a };
  };
  // map / frame take coordinates in the item's authored frame (mirrored like the geometry)
  const map = (x0: number, y: number, z: number, out = V()) => {
    const x = x0 * mir;
    const b = line.at(o.s0 + x);
    const cc = colAt(x);
    return pointAt(b, y, z, cc.dz, cc.th, out);
  };
  const frame = (x0: number, y: number, z = 0) => {
    const x = x0 * mir;
    const b = line.at(o.s0 + x);
    const cc = colAt(x);
    const p = pointAt(b, y, z, cc.dz, cc.th, V());
    let u = b.u.clone(), n = b.n.clone();
    if (y < pivot && cc.th) {
      const c = Math.cos(cc.th), s = Math.sin(cc.th);
      u = b.u.clone().multiplyScalar(c).addScaledVector(b.n, -s);
      n = b.n.clone().multiplyScalar(c).addScaledVector(b.u, s);
    }
    const t = new THREE.Vector3().crossVectors(u, n).normalize();
    return new THREE.Matrix4().makeBasis(t, u, n).setPosition(p);
  };
  // deform every mesh
  const out = new THREE.Group();
  const v = V(), nn = V();
  obj.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.matrixWorld);
    if (!g.attributes.normal) g.computeVertexNormals();
    const pos = g.attributes.position as THREE.BufferAttribute;
    const nor = g.attributes.normal as THREE.BufferAttribute;
    const P = V();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      nn.fromBufferAttribute(nor, i);
      v.x *= mir;
      nn.x *= mir;
      const b = line.at(o.s0 + v.x);
      const cc = colAt(v.x);
      pointAt(b, v.y, v.z, cc.dz, cc.th, P);
      let u = b.u, n = b.n;
      if (v.y < pivot && cc.th) {
        const co = Math.cos(cc.th), si = Math.sin(cc.th);
        u = b.u.clone().multiplyScalar(co).addScaledVector(b.n, -si);
        n = b.n.clone().multiplyScalar(co).addScaledVector(b.u, si);
      }
      const t = new THREE.Vector3().crossVectors(u, n);
      pos.setXYZ(i, P.x, P.y, P.z);
      const w = t.multiplyScalar(nn.x).addScaledVector(u, nn.y).addScaledVector(n, nn.z).normalize();
      nor.setXYZ(i, w.x, w.y, w.z);
    }
    if (o.mirror) {
      if (g.index) {
        const ix = g.index.array as Uint16Array | Uint32Array;
        for (let k = 0; k < ix.length; k += 3) { const tmp = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = tmp; }
        g.index.needsUpdate = true;
      } else {
        for (const name of Object.keys(g.attributes)) {
          const at = g.attributes[name] as THREE.BufferAttribute;
          const is = at.itemSize, arr = at.array as Float32Array;
          for (let k = 0; k < at.count; k += 3) for (let c = 0; c < is; c++) {
            const a = (k + 1) * is + c, b = (k + 2) * is + c;
            const tmp = arr[a]; arr[a] = arr[b]; arr[b] = tmp;
          }
        }
      }
    }
    g.computeBoundingBox();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mesh.material);
    m.name = mesh.name;
    out.add(m);
  });
  out.name = obj.name;
  return { object: out, map: (x, y, z) => map(x, y, z), frame };
}

// ------------------------------------------------------------------ straps over a custom field

export interface StrapLine {
  points: THREE.Vector3[];
  normals: THREE.Vector3[];
  tangents: THREE.Vector3[];
}

/**
 * Strap path over `f` at `offset` (strap centre above the surface). Control points are joined by a
 * centripetal Catmull-Rom curve, projected onto the offset surface, then relaxed (taut: bridges
 * hollows, never enters the field). `pin` keeps the first/last points where they are.
 */
export function strapOn(f: SDF, control: THREE.Vector3[], offset: number, opts: { tension?: number; step?: number; pinStart?: boolean; pinEnd?: boolean; normalHint?: THREE.Vector3 } = {}): StrapLine {
  const curve = new THREE.CatmullRomCurve3(control.map((p) => p.clone()), false, 'centripetal');
  const len = curve.getLength();
  const n = Math.max(8, Math.ceil(len / (opts.step ?? 0.01)));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) pts.push(curve.getPointAt(i / n));
  const N = pts.length;
  const fixed = (i: number) => (i === 0 && opts.pinStart) || (i === N - 1 && opts.pinEnd);
  for (let i = 0; i < N; i++) if (!fixed(i)) projectTo(f, pts[i], offset, 12);
  const iters = Math.round(40 * (opts.tension ?? 0.5));
  for (let it = 0; it < iters; it++) {
    for (let i = 1; i < N - 1; i++) {
      const m = pts[i - 1].clone().add(pts[i + 1]).multiplyScalar(0.5);
      const p = pts[i].lerp(m, 0.5);
      if (f(p.x, p.y, p.z) < offset) projectTo(f, p, offset, 6);
    }
  }
  const normals: THREE.Vector3[] = [], tangents: THREE.Vector3[] = [];
  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    let nn = gradient(f, p.x, p.y, p.z, 0.002);
    if (!(nn.lengthSq() > 0.5) && opts.normalHint) nn = opts.normalHint.clone();
    nn.addScaledVector(t, -nn.dot(t)).normalize();
    normals.push(nn);
    tangents.push(t);
  }
  // smooth the normals a little (avoids twist from small field features)
  for (let it = 0; it < 2; it++) {
    const prev = normals.map((q) => q.clone());
    for (let i = 1; i < N - 1; i++) {
      normals[i].copy(prev[i - 1]).add(prev[i]).add(prev[i]).add(prev[i + 1]);
      normals[i].addScaledVector(tangents[i], -normals[i].dot(tangents[i])).normalize();
    }
  }
  return { points: pts, normals, tangents };
}

/** Trim a strap line to the arc interval [a, b] (m from the start; negative b = from the end). */
export function trimLine(l: StrapLine, a: number, b: number): StrapLine {
  const cum = [0];
  for (let i = 1; i < l.points.length; i++) cum.push(cum[i - 1] + l.points[i].distanceTo(l.points[i - 1]));
  const L = cum[cum.length - 1];
  const s0 = Math.max(0, a), s1 = b < 0 ? L + b : Math.min(L, b);
  const out: StrapLine = { points: [], normals: [], tangents: [] };
  const sample = (s: number) => {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
    out.points.push(l.points[i - 1].clone().lerp(l.points[i], t));
    out.normals.push(l.normals[i - 1].clone().lerp(l.normals[i], t).normalize());
    out.tangents.push(l.tangents[i - 1].clone().lerp(l.tangents[i], t).normalize());
  };
  sample(s0);
  for (let i = 0; i < cum.length; i++) if (cum[i] > s0 + 1e-4 && cum[i] < s1 - 1e-4) {
    out.points.push(l.points[i].clone());
    out.normals.push(l.normals[i].clone());
    out.tangents.push(l.tangents[i].clone());
  }
  sample(s1);
  return out;
}

/** Point + frame at arc length s along a strap line (x across, y along, z out). */
export function lineFrame(l: StrapLine, s: number): THREE.Matrix4 {
  const cum = [0];
  for (let i = 1; i < l.points.length; i++) cum.push(cum[i - 1] + l.points[i].distanceTo(l.points[i - 1]));
  const L = cum[cum.length - 1];
  const ss = s < 0 ? L + s : s;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < ss) i++;
  const t = (ss - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
  const p = l.points[i - 1].clone().lerp(l.points[i], t);
  const n = l.normals[i - 1].clone().lerp(l.normals[i], t).normalize();
  const y = l.tangents[i - 1].clone().lerp(l.tangents[i], t).normalize();
  const x = new THREE.Vector3().crossVectors(y, n).normalize();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(p);
}

export function lineLength(l: StrapLine): number {
  let L = 0;
  for (let i = 1; i < l.points.length; i++) L += l.points[i].distanceTo(l.points[i - 1]);
  return L;
}
