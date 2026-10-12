/**
 * Il-2 geometry helpers: interpolation, structured grids with seamless normals and engraved
 * panel lines, flat panes, bars and conformal (surface-following) decals.
 * Only used by the Il-2 asset (src/assets/soviet/il-2*).
 */
import * as THREE from 'three';
import { M, canvasTexture } from '../../../core/kit';

export type P2 = [number, number];
export const DEG = Math.PI / 180;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Monotone cubic (Fritsch-Carlson) interpolation through keys [x, y], x ascending. Clamped outside. */
export function curve(keys: P2[]): (x: number) => number {
  const n = keys.length;
  const xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  const d: number[] = [];
  const m: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i], b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

export function linspace(a: number, b: number, n: number): number[] {
  if (n <= 1) return [a];
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

/** Sorted unique merge of number lists (values closer than eps collapse). */
export function uniq(values: number[], eps = 1e-6): number[] {
  const s = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of s) if (!out.length || v - out[out.length - 1] > eps) out.push(v);
  return out;
}

/**
 * Structured quad grid P[i][j] (i = stations, j = around/along the section).
 * Normals come from central differences over the WHOLE grid, so sheets cut from it
 * (e.g. an upper painted skin and a lower painted skin) shade without seams.
 */
export class Grid {
  P: THREE.Vector3[][];
  N: THREE.Vector3[][] = [];
  sign = 1;
  constructor(
    P: THREE.Vector3[][],
    public closedJ: boolean,
    private hint: (i: number, j: number) => THREE.Vector3,
  ) {
    this.P = P;
    this.normals(true);
  }

  get ni() {
    return this.P.length;
  }
  get nj() {
    return this.P[0].length;
  }

  private normals(decideSign: boolean) {
    const { P, closedJ } = this;
    const ni = P.length, nj = P[0].length;
    const N: THREE.Vector3[][] = [];
    const du = new THREE.Vector3(), dv = new THREE.Vector3();
    for (let i = 0; i < ni; i++) {
      const row: THREE.Vector3[] = [];
      const ia = Math.max(0, i - 1), ib = Math.min(ni - 1, i + 1);
      for (let j = 0; j < nj; j++) {
        let ja: number, jb: number;
        if (closedJ) {
          ja = (j - 1 + nj) % nj;
          jb = (j + 1) % nj;
        } else {
          ja = Math.max(0, j - 1);
          jb = Math.min(nj - 1, j + 1);
        }
        du.subVectors(P[ib][j], P[ia][j]);
        dv.subVectors(P[i][jb], P[i][ja]);
        const n = new THREE.Vector3().crossVectors(du, dv);
        row.push(n.lengthSq() < 1e-18 ? n.set(0, 0, 0) : n.normalize());
      }
      N.push(row);
    }
    // degenerate points (collapsed tips): borrow the nearest valid normal along i
    for (let i = 0; i < ni; i++)
      for (let j = 0; j < nj; j++) {
        if (N[i][j].lengthSq() > 0.5) continue;
        for (let k = 1; k < ni; k++) {
          const a = i - k >= 0 ? N[i - k][j] : null, b = i + k < ni ? N[i + k][j] : null;
          const src = a && a.lengthSq() > 0.5 ? a : b && b.lengthSq() > 0.5 ? b : null;
          if (src) {
            N[i][j].copy(src);
            break;
          }
        }
      }
    if (decideSign) {
      let score = 0;
      const stepI = Math.max(1, Math.floor(ni / 24)), stepJ = Math.max(1, Math.floor(nj / 24));
      for (let i = 0; i < ni; i += stepI) for (let j = 0; j < nj; j += stepJ) score += Math.sign(N[i][j].dot(this.hint(i, j)));
      this.sign = score < 0 ? -1 : 1;
    }
    if (this.sign < 0) for (const r of N) for (const n of r) n.negate();
    this.N = N;
  }

  /** Push points inwards (against the normal) by depth(i, j) metres, then refresh normals. */
  engrave(depth: (i: number, j: number) => number) {
    let any = false;
    for (let i = 0; i < this.ni; i++)
      for (let j = 0; j < this.nj; j++) {
        const d = depth(i, j);
        if (d > 0) {
          this.P[i][j].addScaledVector(this.N[i][j], -d);
          any = true;
        }
      }
    if (any) this.normals(false);
  }

  /**
   * Sub-sheet rows i0..i1 and columns j0..j1 (inclusive). With closedJ, j1 < j0 wraps around.
   * flip = true reverses the facing (for inner walls seen from inside).
   */
  sheet(i0: number, i1: number, j0 = 0, j1 = this.nj - 1, flip = false): THREE.BufferGeometry {
    const cols: number[] = [];
    if (this.closedJ && j1 < j0) {
      for (let j = j0; j < this.nj; j++) cols.push(j);
      for (let j = 0; j <= j1; j++) cols.push(j);
    } else for (let j = j0; j <= j1; j++) cols.push(j);
    const rows: number[] = [];
    for (let i = i0; i <= i1; i++) rows.push(i);
    const nr = rows.length, nc = cols.length;
    const pos = new Float32Array(nr * nc * 3), nor = new Float32Array(nr * nc * 3);
    let k = 0;
    const fs = flip ? -1 : 1;
    for (const i of rows)
      for (const j of cols) {
        const p = this.P[i][j], n = this.N[i][j];
        pos[k] = p.x; pos[k + 1] = p.y; pos[k + 2] = p.z;
        nor[k] = n.x * fs; nor[k + 1] = n.y * fs; nor[k + 2] = n.z * fs;
        k += 3;
      }
    const idx: number[] = [];
    const flipW = (this.sign < 0) !== flip;
    for (let a = 0; a < nr - 1; a++)
      for (let b = 0; b < nc - 1; b++) {
        const p00 = a * nc + b, p10 = (a + 1) * nc + b, p11 = (a + 1) * nc + b + 1, p01 = a * nc + b + 1;
        if (!flipW) idx.push(p00, p10, p01, p10, p11, p01);
        else idx.push(p00, p01, p10, p10, p01, p11);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  }
}

/** Fan cap over a closed ring of points (normal chosen to face `out`). */
export function cap(ring: THREE.Vector3[], out: THREE.Vector3): THREE.BufferGeometry {
  const c = new THREE.Vector3();
  for (const p of ring) c.add(p);
  c.multiplyScalar(1 / ring.length);
  const pos: number[] = [];
  const n = out.clone().normalize();
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const fn = b.clone().sub(a).cross(c.clone().sub(a));
    if (fn.dot(n) >= 0) pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    else pos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const nn: number[] = [];
  for (let i = 0; i < pos.length / 3; i++) nn.push(n.x, n.y, n.z);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
  return g;
}

/** Flat slab from a planar polygon of 3D points, thickness t along its normal (centred). */
export function pane(pts: THREE.Vector3[], t: number, outward?: THREE.Vector3): THREE.BufferGeometry {
  const c = new THREE.Vector3();
  for (const p of pts) c.add(p);
  c.multiplyScalar(1 / pts.length);
  let n = new THREE.Vector3();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i].clone().sub(c), b = pts[(i + 1) % pts.length].clone().sub(c);
    n.add(a.cross(b));
  }
  n.normalize();
  if (outward && n.dot(outward) < 0) n = n.negate();
  const half = n.clone().multiplyScalar(t / 2);
  const top = pts.map((p) => p.clone().add(half));
  const bot = pts.map((p) => p.clone().sub(half));
  const pos: number[] = [];
  const push = (v: THREE.Vector3) => pos.push(v.x, v.y, v.z);
  const tri = (a: THREE.Vector3, b: THREE.Vector3, d: THREE.Vector3, want: THREE.Vector3) => {
    const fn = b.clone().sub(a).cross(d.clone().sub(a));
    if (fn.dot(want) >= 0) {
      push(a); push(b); push(d);
    } else {
      push(a); push(d); push(b);
    }
  };
  const ct = c.clone().add(half), cb = c.clone().sub(half);
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    tri(top[i], top[j], ct, n);
    tri(bot[i], bot[j], cb, n.clone().negate());
    const side = pts[i].clone().add(pts[j]).multiplyScalar(0.5).sub(c).normalize();
    tri(top[i], bot[i], bot[j], side);
    tri(top[i], bot[j], top[j], side);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Rounded rectangular bar from a to b (w across, h along `up`). */
export function bar(a: THREE.Vector3, b: THREE.Vector3, w: number, h: number, up: THREE.Vector3, r = 0.003): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const rr = Math.max(0.0002, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, len / 2 - 1e-4));
  const geo = new RoundedBoxGeometry(w, h, len, 2, rr);
  const zAxis = b.clone().sub(a).normalize();
  const yAxis = up.clone().sub(zAxis.clone().multiplyScalar(up.dot(zAxis))).normalize();
  const xAxis = new THREE.Vector3().crossVectors(yAxis, zAxis).normalize();
  const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
  m.setPosition(a.clone().add(b).multiplyScalar(0.5));
  geo.applyMatrix4(m);
  return geo;
}

/** Matrix that maps local +Y to dir and puts the origin at p (optional spin about the axis). */
export function alignY(p: THREE.Vector3, dir: THREE.Vector3, spin = 0): THREE.Matrix4 {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
  return new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
}

/** Matrix from explicit axes and origin. */
export function basis(p: THREE.Vector3, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeBasis(x.clone().normalize(), y.clone().normalize(), z.clone().normalize());
  m.setPosition(p);
  return m;
}

/** NACA 4-digit half thickness (fraction of chord) at chord fraction u. */
export function naca(t: number, u: number): number {
  u = clamp(u, 0, 1);
  return 5 * t * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
}
/** NACA mean camber line (fraction of chord). */
export function camberLine(m: number, p: number, u: number): number {
  if (m <= 0) return 0;
  u = clamp(u, 0, 1);
  return u < p ? (m / (p * p)) * (2 * p * u - u * u) : (m / ((1 - p) ** 2)) * (1 - 2 * p + 2 * p * u - u * u);
}

/** Cosine-spaced fractions 0..1 (dense at both ends). */
export function cosSpace(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (1 - Math.cos((i / (n - 1)) * Math.PI)) / 2);
}

/**
 * Surface-following decal: an nu x nv grid mapped through `map(u, v)` (u, v in 0..1, v = up
 * in the image), lifted `lift` metres along the returned normal. Uses the kit decal material.
 */
export function conformDecal(
  key: string,
  aspect: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  map: (u: number, v: number) => { p: THREE.Vector3; n: THREE.Vector3 },
  nu = 14,
  nv = 14,
  lift = 0.0025,
  px = 512,
): THREE.Mesh {
  const tex = canvasTexture(px, aspect, draw);
  const mat = M.decal(tex, { key });
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let b = 0; b <= nv; b++)
    for (let a = 0; a <= nu; a++) {
      const u = a / nu, v = b / nv;
      const { p, n } = map(u, v);
      const q = p.clone().addScaledVector(n, lift);
      pos.push(q.x, q.y, q.z);
      nor.push(n.x, n.y, n.z);
      uv.push(u, v);
    }
  for (let b = 0; b < nv; b++)
    for (let a = 0; a < nu; a++) {
      const p00 = b * (nu + 1) + a, p10 = p00 + 1, p01 = p00 + nu + 1, p11 = p01 + 1;
      idx.push(p00, p10, p11, p00, p11, p01);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // make the winding agree with the supplied normal
  const a0 = new THREE.Vector3(pos[0], pos[1], pos[2]);
  const a1 = new THREE.Vector3(pos[3], pos[4], pos[5]);
  const a2 = new THREE.Vector3(pos[(nu + 2) * 3], pos[(nu + 2) * 3 + 1], pos[(nu + 2) * 3 + 2]);
  const fn = a1.clone().sub(a0).cross(a2.clone().sub(a0));
  if (fn.dot(new THREE.Vector3(nor[0], nor[1], nor[2])) < 0) {
    const ia = g.index!.array as Uint16Array | Uint32Array;
    for (let i = 0; i < ia.length; i += 3) {
      const t = ia[i + 1];
      ia[i + 1] = ia[i + 2];
      ia[i + 2] = t;
    }
  }
  const mesh = new THREE.Mesh(g, mat);
  mesh.userData.noEdge = true;
  return mesh;
}
