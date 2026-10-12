/**
 * Surface Nets mesher tuned for the human system (bodies, cloth, faces, hands).
 *
 * Differences from core/geo/sdf.ts `sdfMesh`:
 *  - triangles are emitted with OUTWARD winding (the core one is inside-out),
 *  - two-level band evaluation: 4-cell blocks, then 2-cell sub-blocks, skipped with a conservative
 *    Lipschitz test; only cells inside active sub-blocks are scanned,
 *  - vertices are (optionally) projected onto the surface with a 4-sample tetrahedral gradient,
 *  - quads are split along the shorter diagonal,
 *  - optional per-vertex colour callback and vertex filter (drop hidden faces),
 *  - scratch buffers are pooled and the per-block work lives in small module-level functions
 *    (big nested loops in one function trigger V8 OSR deopt storms).
 *
 * `meshSDF(f, bounds, cell, opts)` returns an indexed BufferGeometry with position + normal
 * (+ color). Use ~2.5-3 mm cells for faces/hands, 4-8 mm for cloth and bodies.
 */
import * as THREE from 'three';
import type { SDF } from './sdfx';

type P3 = [number, number, number];

export interface MeshOptions {
  /** Newton projection steps onto the zero surface (0-3). Default 1. */
  project?: number;
  /** Lipschitz safety factor of the field (>1 if displacement is used). Default 1.25. */
  lipschitz?: number;
  /** Per-vertex colour (linear RGB 0..1), given the final position and normal. */
  color?: (x: number, y: number, z: number, nx: number, ny: number, nz: number, out: [number, number, number]) => void;
  /** Drop vertices (and their faces) for which this returns false. */
  keep?: (x: number, y: number, z: number) => boolean;
}

/** Statistics of the last meshing call (for profiling). */
export const meshStats = { evals: 0, verts: 0, ms: 0 };

// ---------------------------------------------------------------- pooled scratch buffers
let poolF32 = new Float32Array(0);
let poolI32 = new Int32Array(0);
let poolU8 = new Uint8Array(0);
const scratchF32 = (n: number) => { if (poolF32.length < n) poolF32 = new Float32Array(Math.ceil(n * 1.25)); return poolF32; };
const scratchI32 = (n: number) => { if (poolI32.length < n) poolI32 = new Int32Array(Math.ceil(n * 1.25)); return poolI32; };
const scratchU8 = (n: number) => { if (poolU8.length < n) poolU8 = new Uint8Array(Math.ceil(n * 1.25)); poolU8.fill(0, 0, n); return poolU8; };

// ---------------------------------------------------------------- mesher state (module level)
let F: SDF = () => 1;
let field = poolF32;
let active = poolU8;
let cellVert = poolI32;
let NX = 0, NY = 0, NZ = 0, SXY = 0, NSX = 0, NSY = 0, CNX = 0, CNY = 0, CNZ = 0;
let X0 = 0, Y0 = 0, Z0 = 0, CELL = 0, THR_S = 0;
let EVALS = 0;
let pos = new Float32Array(0);
let NV = 0;
let idx = new Uint32Array(0);
let NI = 0;
let dropped: Uint8Array | null = null;

function fill(i0: number, i1: number, j0: number, j1: number, k0: number, k1: number, v: number) {
  for (let k = k0; k < k1; k++) for (let j = j0; j < j1; j++) {
    const row = j * NX + k * SXY;
    for (let i = i0; i < i1; i++) field[row + i] = v;
  }
}

function evalSub(si: number, si1: number, sj: number, sj1: number, sk: number, sk1: number) {
  const f = F, c = CELL;
  const ds = f(X0 + ((si + si1 - 1) / 2) * c, Y0 + ((sj + sj1 - 1) / 2) * c, Z0 + ((sk + sk1 - 1) / 2) * c);
  EVALS++;
  if (ds > THR_S || ds < -THR_S) { fill(si, si1, sj, sj1, sk, sk1, ds); return; }
  active[(si >> 1) + NSX * ((sj >> 1) + NSY * (sk >> 1))] = 1;
  for (let k = sk; k < sk1; k++) {
    const z = Z0 + k * c;
    for (let j = sj; j < sj1; j++) {
      const y = Y0 + j * c;
      const row = j * NX + k * SXY;
      for (let i = si; i < si1; i++) field[row + i] = f(X0 + i * c, y, z);
    }
  }
  EVALS += (sk1 - sk) * (sj1 - sj) * (si1 - si);
}

function evalBlock(i0: number, i1: number, j0: number, j1: number, k0: number, k1: number, thrB: number) {
  const c = CELL;
  const dc = F(X0 + ((i0 + i1 - 1) / 2) * c, Y0 + ((j0 + j1 - 1) / 2) * c, Z0 + ((k0 + k1 - 1) / 2) * c);
  EVALS++;
  if (dc > thrB || dc < -thrB) { fill(i0, i1, j0, j1, k0, k1, dc); return; }
  for (let sk = k0; sk < k1; sk += 2) {
    const sk1 = sk + 2 < k1 ? sk + 2 : k1;
    for (let sj = j0; sj < j1; sj += 2) {
      const sj1 = sj + 2 < j1 ? sj + 2 : j1;
      for (let si = i0; si < i1; si += 2) evalSub(si, si + 2 < i1 ? si + 2 : i1, sj, sj1, sk, sk1);
    }
  }
}

const corner = new Float32Array(8);
function makeVertex(i: number, j: number, k: number) {
  const id = i + j * NX + k * SXY;
  const c = corner;
  c[0] = field[id]; c[1] = field[id + 1]; c[2] = field[id + NX]; c[3] = field[id + NX + 1];
  c[4] = field[id + SXY]; c[5] = field[id + SXY + 1]; c[6] = field[id + SXY + NX]; c[7] = field[id + SXY + NX + 1];
  let mask = 0;
  for (let q = 0; q < 8; q++) if (c[q] < 0) mask |= 1 << q;
  if (mask === 0 || mask === 255) return;
  let sx = 0, sy = 0, sz = 0, cnt = 0;
  // x edges (0,1) (2,3) (4,5) (6,7)
  for (let a = 0; a < 8; a += 2) {
    const va = c[a], vb = c[a + 1];
    if ((va < 0) !== (vb < 0)) { sx += va / (va - vb); sy += (a & 2) ? 1 : 0; sz += (a & 4) ? 1 : 0; cnt++; }
  }
  // y edges (0,2) (1,3) (4,6) (5,7)
  for (let e = 0; e < 4; e++) {
    const a = e < 2 ? e : e + 2;
    const va = c[a], vb = c[a + 2];
    if ((va < 0) !== (vb < 0)) { sx += (a & 1) ? 1 : 0; sy += va / (va - vb); sz += (a & 4) ? 1 : 0; cnt++; }
  }
  // z edges (0,4) (1,5) (2,6) (3,7)
  for (let a = 0; a < 4; a++) {
    const va = c[a], vb = c[a + 4];
    if ((va < 0) !== (vb < 0)) { sx += (a & 1) ? 1 : 0; sy += (a & 2) ? 1 : 0; sz += va / (va - vb); cnt++; }
  }
  if (NV * 3 + 3 > pos.length) {
    const np = new Float32Array(Math.max(4096 * 3, pos.length * 2));
    np.set(pos);
    pos = np;
  }
  pos[NV * 3] = X0 + (i + sx / cnt) * CELL;
  pos[NV * 3 + 1] = Y0 + (j + sy / cnt) * CELL;
  pos[NV * 3 + 2] = Z0 + (k + sz / cnt) * CELL;
  cellVert[i + CNX * (j + CNY * k)] = NV++;
}

function vertsInSub(bi: number, bj: number, bk: number) {
  const k1 = Math.min(bk * 2 + 2, CNZ), j1 = Math.min(bj * 2 + 2, CNY), i1 = Math.min(bi * 2 + 2, CNX);
  for (let k = bk * 2; k < k1; k++) for (let j = bj * 2; j < j1; j++) for (let i = bi * 2; i < i1; i++) makeVertex(i, j, k);
}

function d2(a: number, b: number) {
  const dx = pos[a * 3] - pos[b * 3], dy = pos[a * 3 + 1] - pos[b * 3 + 1], dz = pos[a * 3 + 2] - pos[b * 3 + 2];
  return dx * dx + dy * dy + dz * dz;
}

function quad(a: number, b: number, c: number, d: number, inside: boolean) {
  if (a < 0 || b < 0 || c < 0 || d < 0) return;
  if (dropped !== null && (dropped[a] || dropped[b] || dropped[c] || dropped[d])) return;
  if (NI + 6 > idx.length) {
    const n2 = new Uint32Array(Math.max(8192, idx.length * 2));
    n2.set(idx);
    idx = n2;
  }
  // (a,b,c,d) is counter-clockwise around the +axis; outward = +axis when the low corner is inside
  const alt = d2(b, d) < d2(a, c);
  if (inside) {
    if (alt) { idx[NI++] = a; idx[NI++] = b; idx[NI++] = d; idx[NI++] = b; idx[NI++] = c; idx[NI++] = d; }
    else { idx[NI++] = a; idx[NI++] = b; idx[NI++] = c; idx[NI++] = a; idx[NI++] = c; idx[NI++] = d; }
  } else {
    if (alt) { idx[NI++] = a; idx[NI++] = d; idx[NI++] = b; idx[NI++] = b; idx[NI++] = d; idx[NI++] = c; }
    else { idx[NI++] = a; idx[NI++] = c; idx[NI++] = b; idx[NI++] = a; idx[NI++] = d; idx[NI++] = c; }
  }
}

function CV(i: number, j: number, k: number) {
  return cellVert[i + CNX * (j + CNY * k)];
}

function facesInSub(bi: number, bj: number, bk: number) {
  const k1 = Math.min(bk * 2 + 2, CNZ), j1 = Math.min(bj * 2 + 2, CNY), i1 = Math.min(bi * 2 + 2, CNX);
  for (let k = bk * 2; k < k1; k++) for (let j = bj * 2; j < j1; j++) for (let i = bi * 2; i < i1; i++) {
    const id = i + j * NX + k * SXY;
    const in0 = field[id] < 0;
    if (j > 0 && k > 0 && in0 !== (field[id + 1] < 0)) quad(CV(i, j - 1, k - 1), CV(i, j, k - 1), CV(i, j, k), CV(i, j - 1, k), in0);
    if (i > 0 && k > 0 && in0 !== (field[id + NX] < 0)) quad(CV(i - 1, j, k - 1), CV(i - 1, j, k), CV(i, j, k), CV(i, j, k - 1), in0);
    if (i > 0 && j > 0 && in0 !== (field[id + SXY] < 0)) quad(CV(i - 1, j - 1, k), CV(i, j - 1, k), CV(i, j, k), CV(i - 1, j, k), in0);
  }
}

const gv = [0, 0, 0];
/** Tetrahedral gradient at (x,y,z) into gv; returns the field estimate there. */
function grad(x: number, y: number, z: number, h: number) {
  const f = F;
  const a = f(x + h, y - h, z - h), b = f(x - h, y - h, z + h), c = f(x - h, y + h, z - h), d = f(x + h, y + h, z + h);
  EVALS += 4;
  const gx = a - b - c + d, gy = -a - b + c + d, gz = -a + b - c + d;
  const l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
  gv[0] = gx / l; gv[1] = gy / l; gv[2] = gz / l;
  return (a + b + c + d) * 0.25;
}

function projectVertex(v: number, iters: number, h: number, maxStep: number, nrm: Float32Array) {
  let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
  let d = grad(x, y, z, h);
  for (let it = 0; it < iters; it++) {
    const step = d > maxStep ? maxStep : d < -maxStep ? -maxStep : d;
    x -= gv[0] * step; y -= gv[1] * step; z -= gv[2] * step;
    d = grad(x, y, z, h);
  }
  pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
  nrm[v * 3] = gv[0]; nrm[v * 3 + 1] = gv[1]; nrm[v * 3 + 2] = gv[2];
}

function evalAll(thrB: number) {
  for (let k0 = 0; k0 < NZ; k0 += 4) {
    const k1 = Math.min(k0 + 4, NZ);
    for (let j0 = 0; j0 < NY; j0 += 4) {
      const j1 = Math.min(j0 + 4, NY);
      for (let i0 = 0; i0 < NX; i0 += 4) evalBlock(i0, Math.min(i0 + 4, NX), j0, j1, k0, k1, thrB);
    }
  }
}

function sweep(nsz: number, faces: boolean) {
  for (let bk = 0; bk < nsz; bk++) for (let bj = 0; bj < NSY; bj++) for (let bi = 0; bi < NSX; bi++) {
    if (!active[bi + NSX * (bj + NSY * bk)]) continue;
    if (faces) facesInSub(bi, bj, bk);
    else vertsInSub(bi, bj, bk);
  }
}

export function meshSDF(f: SDF, bounds: { min: P3; max: P3 }, cell: number, opts: MeshOptions = {}): THREE.BufferGeometry {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  F = f;
  EVALS = 0;
  X0 = bounds.min[0]; Y0 = bounds.min[1]; Z0 = bounds.min[2];
  CELL = cell;
  NX = Math.max(2, Math.ceil((bounds.max[0] - X0) / cell) + 1);
  NY = Math.max(2, Math.ceil((bounds.max[1] - Y0) / cell) + 1);
  NZ = Math.max(2, Math.ceil((bounds.max[2] - Z0) / cell) + 1);
  const N = NX * NY * NZ;
  if (N > 40_000_000) throw new Error(`meshSDF grid too large (${NX}x${NY}x${NZ})`);
  field = scratchF32(N);
  SXY = NX * NY;
  const L = opts.lipschitz ?? 1.25;
  // A (sub)block is skipped only if no cell touching it can contain the surface.
  const thrB = L * Math.sqrt(3) * 2.5 * cell;
  THR_S = L * Math.sqrt(3) * 1.5 * cell;
  NSX = Math.ceil(NX / 2); NSY = Math.ceil(NY / 2);
  const nsz = Math.ceil(NZ / 2);
  active = scratchU8(NSX * NSY * nsz);
  evalAll(thrB);

  // vertices
  CNX = NX - 1; CNY = NY - 1; CNZ = NZ - 1;
  const nc = CNX * CNY * CNZ;
  cellVert = scratchI32(nc);
  cellVert.fill(-1, 0, nc);
  NV = 0;
  if (pos.length < 4096 * 3) pos = new Float32Array(4096 * 3);
  sweep(nsz, false);

  // projection, normals, filter
  const nrm = new Float32Array(NV * 3);
  const iters = opts.project ?? 1;
  for (let v = 0; v < NV; v++) projectVertex(v, iters, cell * 0.2, cell * 0.6, nrm);
  const keep = opts.keep;
  dropped = null;
  if (keep) {
    const dr = new Uint8Array(NV);
    for (let v = 0; v < NV; v++) if (!keep(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])) dr[v] = 1;
    dropped = dr;
  }

  // faces
  NI = 0;
  if (idx.length < NV * 6) idx = new Uint32Array(NV * 6 + 64);
  sweep(nsz, true);

  const geo = new THREE.BufferGeometry();
  const P = pos.slice(0, NV * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  if (opts.color) {
    const col = new Float32Array(NV * 3);
    const out: [number, number, number] = [1, 1, 1];
    for (let v = 0; v < NV; v++) {
      opts.color(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2], out);
      col[v * 3] = out[0]; col[v * 3 + 1] = out[1]; col[v * 3 + 2] = out[2];
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  const ia = idx.slice(0, NI);
  geo.setIndex(NV > 65535 ? new THREE.BufferAttribute(ia, 1) : new THREE.BufferAttribute(Uint16Array.from(ia), 1));
  meshStats.evals = EVALS;
  meshStats.verts = NV;
  meshStats.ms = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  F = () => 1; // release the closure
  dropped = null;
  return geo;
}

/** Number of triangles of an indexed geometry. */
export function triCount(g: THREE.BufferGeometry): number {
  return g.index ? g.index.count / 3 : g.attributes.position.count / 3;
}

/**
 * Flip the winding if most faces disagree with the stored normals (safety net for geometry
 * from other meshers). Returns the same geometry.
 */
export function orientOutward(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const ix = g.index;
  if (!ix) return g;
  const p = g.attributes.position, n = g.attributes.normal;
  const a = ix.array as Uint16Array | Uint32Array;
  const A = new THREE.Vector3(), Bv = new THREE.Vector3(), C = new THREE.Vector3(), Nn = new THREE.Vector3();
  let score = 0;
  const step = Math.max(3, Math.floor(a.length / 3 / 2000) * 3);
  for (let t = 0; t + 2 < a.length; t += step) {
    A.fromBufferAttribute(p, a[t]);
    Bv.fromBufferAttribute(p, a[t + 1]).sub(A);
    C.fromBufferAttribute(p, a[t + 2]).sub(A);
    Bv.cross(C);
    Nn.fromBufferAttribute(n, a[t]);
    score += Math.sign(Bv.dot(Nn));
  }
  if (score < 0) {
    for (let i = 0; i + 2 < a.length; i += 3) {
      const tmp = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = tmp;
    }
    ix.needsUpdate = true;
  }
  return g;
}
