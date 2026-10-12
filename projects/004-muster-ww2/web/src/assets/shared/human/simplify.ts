/**
 * Quadric-error-metric mesh decimation (Garland & Heckbert) with half-edge collapses.
 *
 * Surface Nets meshes are uniformly dense (~3 triangles per cell^2 of surface); flat and gently
 * curved areas (backs, thighs, boot shafts) need far fewer triangles than creases, folds and faces.
 * `simplify(geo, target)` collapses edges in order of geometric error until `target` triangles
 * remain. Collapses keep one endpoint (vertices stay exactly on the SDF surface, so the stored
 * gradient normals and colours remain valid), reject normal flips and non-manifold links, and
 * never move boundary vertices.
 */
import * as THREE from 'three';

export interface SimplifyOptions {
  /** Stop early when the cheapest collapse exceeds this error (metres). Default 0.0015. */
  maxError?: number;
  /** Reject collapses that rotate a face normal by more than this (degrees). Default 60. */
  maxFlipDeg?: number;
}

/** Decimate an indexed geometry to about `targetTris` triangles. Returns a new geometry. */
export function simplify(geo: THREE.BufferGeometry, targetTris: number, opts: SimplifyOptions = {}): THREE.BufferGeometry {
  const idxAttr = geo.index;
  if (!idxAttr) return geo;
  const F0 = idxAttr.count / 3;
  if (F0 <= targetTris) return geo;
  const posA = geo.attributes.position.array as Float32Array;
  const nV = geo.attributes.position.count;
  const P = new Float64Array(nV * 3);
  for (let i = 0; i < nV * 3; i++) P[i] = posA[i];
  const F = new Int32Array(idxAttr.array as ArrayLike<number>);
  const maxErr2 = (opts.maxError ?? 0.0015) ** 2;
  const cosFlip = Math.cos(((opts.maxFlipDeg ?? 60) * Math.PI) / 180);

  // vertex -> incident faces
  const deg = new Int32Array(nV);
  for (let i = 0; i < F.length; i++) deg[F[i]]++;
  const vf: number[][] = new Array(nV);
  for (let v = 0; v < nV; v++) vf[v] = [];
  for (let f = 0; f < F0; f++) {
    const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
    if (a === b || b === c || a === c) { F[f * 3] = -1; continue; }
    vf[a].push(f); vf[b].push(f); vf[c].push(f);
  }
  let live = 0;
  for (let f = 0; f < F0; f++) if (F[f * 3] >= 0) live++;

  // quadrics (area weighted plane quadrics)
  const Q = new Float64Array(nV * 10);
  const faceN = (f: number, out: number[]) => {
    const a = F[f * 3] * 3, b = F[f * 3 + 1] * 3, c = F[f * 3 + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    out[0] = uy * vz - uz * vy; out[1] = uz * vx - ux * vz; out[2] = ux * vy - uy * vx;
    return Math.sqrt(out[0] * out[0] + out[1] * out[1] + out[2] * out[2]);
  };
  const tn = [0, 0, 0];
  for (let f = 0; f < F0; f++) {
    if (F[f * 3] < 0) continue;
    const l = faceN(f, tn);
    if (l < 1e-18) continue;
    const nx = tn[0] / l, ny = tn[1] / l, nz = tn[2] / l;
    const a0 = F[f * 3] * 3;
    const d = -(nx * P[a0] + ny * P[a0 + 1] + nz * P[a0 + 2]);
    const w = l * 0.5;
    for (let s = 0; s < 3; s++) {
      const q = F[f * 3 + s] * 10;
      Q[q] += w * nx * nx; Q[q + 1] += w * nx * ny; Q[q + 2] += w * nx * nz; Q[q + 3] += w * nx * d;
      Q[q + 4] += w * ny * ny; Q[q + 5] += w * ny * nz; Q[q + 6] += w * ny * d;
      Q[q + 7] += w * nz * nz; Q[q + 8] += w * nz * d; Q[q + 9] += w * d * d;
    }
  }
  // area of the vertex neighbourhood, to turn quadric error into a distance^2
  const area = new Float64Array(nV);
  for (let v = 0; v < nV; v++) {
    const q = v * 10;
    area[v] = Q[q] + Q[q + 4] + Q[q + 7]; // sum of weights (n.n = 1)
  }

  // boundary vertices are locked
  const locked = new Uint8Array(nV);
  {
    // sort undirected edge keys; an edge not shared by exactly two faces is a boundary edge
    const keys = new Float64Array(F0 * 3);
    let nk = 0;
    for (let f = 0; f < F0; f++) {
      if (F[f * 3] < 0) continue;
      for (let s = 0; s < 3; s++) {
        const a = F[f * 3 + s], b = F[f * 3 + ((s + 1) % 3)];
        keys[nk++] = a < b ? a * nV + b : b * nV + a;
      }
    }
    const ks = keys.subarray(0, nk).sort();
    for (let i = 0; i < nk; ) {
      let j = i + 1;
      while (j < nk && ks[j] === ks[i]) j++;
      if (j - i !== 2) { const k = ks[i]; locked[Math.floor(k / nV)] = 1; locked[k % nV] = 1; }
      i = j;
    }
  }

  const err = (q0: number, q1: number, x: number, y: number, z: number) =>
    (Q[q0] + Q[q1]) * x * x + 2 * (Q[q0 + 1] + Q[q1 + 1]) * x * y + 2 * (Q[q0 + 2] + Q[q1 + 2]) * x * z + 2 * (Q[q0 + 3] + Q[q1 + 3]) * x +
    (Q[q0 + 4] + Q[q1 + 4]) * y * y + 2 * (Q[q0 + 5] + Q[q1 + 5]) * y * z + 2 * (Q[q0 + 6] + Q[q1 + 6]) * y +
    (Q[q0 + 7] + Q[q1 + 7]) * z * z + 2 * (Q[q0 + 8] + Q[q1 + 8]) * z + (Q[q0 + 9] + Q[q1 + 9]);

  // binary min-heap of candidate collapses (from -> to), lazily invalidated by vertex stamps
  let hcap = 1 << 16;
  let hCost = new Float64Array(hcap), hFrom = new Int32Array(hcap), hTo = new Int32Array(hcap), hSf = new Int32Array(hcap), hSt = new Int32Array(hcap);
  let hn = 0;
  const stamp = new Int32Array(nV);
  const swap = (i: number, j: number) => {
    let t = hCost[i]; hCost[i] = hCost[j]; hCost[j] = t;
    let u = hFrom[i]; hFrom[i] = hFrom[j]; hFrom[j] = u;
    u = hTo[i]; hTo[i] = hTo[j]; hTo[j] = u;
    u = hSf[i]; hSf[i] = hSf[j]; hSf[j] = u;
    u = hSt[i]; hSt[i] = hSt[j]; hSt[j] = u;
    void t;
  };
  const push = (cost: number, from: number, to: number) => {
    // sift up with a hole (moves instead of swaps)
    if (hn >= hcap) {
      hcap *= 2;
      const c2 = new Float64Array(hcap); c2.set(hCost); hCost = c2;
      const f2 = new Int32Array(hcap); f2.set(hFrom); hFrom = f2;
      const t2 = new Int32Array(hcap); t2.set(hTo); hTo = t2;
      const s2 = new Int32Array(hcap); s2.set(hSf); hSf = s2;
      const s3 = new Int32Array(hcap); s3.set(hSt); hSt = s3;
    }
    let i = hn++;
    const sf = stamp[from], st = stamp[to];
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hCost[p] <= cost) break;
      hCost[i] = hCost[p]; hFrom[i] = hFrom[p]; hTo[i] = hTo[p]; hSf[i] = hSf[p]; hSt[i] = hSt[p];
      i = p;
    }
    hCost[i] = cost; hFrom[i] = from; hTo[i] = to; hSf[i] = sf; hSt[i] = st;
  };
  const pop = () => {
    hn--;
    if (hn <= 0) return;
    // sift the last element down from the root with a hole
    const c = hCost[hn], f = hFrom[hn], t = hTo[hn], sf = hSf[hn], st = hSt[hn];
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      if (l >= hn) break;
      const r = l + 1;
      const m = r < hn && hCost[r] < hCost[l] ? r : l;
      if (hCost[m] >= c) break;
      hCost[i] = hCost[m]; hFrom[i] = hFrom[m]; hTo[i] = hTo[m]; hSf[i] = hSf[m]; hSt[i] = hSt[m];
      i = m;
    }
    hCost[i] = c; hFrom[i] = f; hTo[i] = t; hSf[i] = sf; hSt[i] = st;
  };
  void swap;
  const consider = (a: number, b: number) => {
    const la = locked[a], lb = locked[b];
    if (la && lb) return;
    const qa = a * 10, qb = b * 10;
    // collapse a -> b (keep b) costs err at P[b]; b -> a at P[a]
    const cab = la ? Infinity : err(qa, qb, P[b * 3], P[b * 3 + 1], P[b * 3 + 2]);
    const cba = lb ? Infinity : err(qa, qb, P[a * 3], P[a * 3 + 1], P[a * 3 + 2]);
    const norm = 1 / Math.max(1e-12, area[a] + area[b]);
    const c = (cab <= cba ? cab : cba) * norm;
    if (c > maxErr2) return; // would never be collapsed
    if (cab <= cba) push(Math.max(0, c), a, b);
    else push(Math.max(0, c), b, a);
  };
  // initial candidates: each edge once
  for (let f = 0; f < F0; f++) {
    if (F[f * 3] < 0) continue;
    for (let s = 0; s < 3; s++) {
      const a = F[f * 3 + s], b = F[f * 3 + ((s + 1) % 3)];
      if (a < b) consider(a, b);
      else {
        // only consider from the face where a < b, unless the twin face does not exist (boundary)
        continue;
      }
    }
  }

  const mark = new Int32Array(nV).fill(-1);
  let markId = 0;
  const n0 = [0, 0, 0], n1 = [0, 0, 0];
  const neighbours: number[] = [];

  while (live > targetTris && hn > 0) {
    const cost = hCost[0], u = hFrom[0], v = hTo[0], su = hSf[0], sv = hSt[0];
    pop();
    if (stamp[u] !== su || stamp[v] !== sv) continue;
    if (cost > maxErr2) break;
    const fu = vf[u], fv = vf[v];
    if (!fu.length || !fv.length) continue;
    // link condition: common neighbours of u and v must equal the opposite vertices of shared faces
    markId++;
    for (const f of fu) for (let s = 0; s < 3; s++) { const w = F[f * 3 + s]; if (w !== u) mark[w] = markId; }
    if (mark[v] !== markId) continue; // not an edge any more
    let common = 0, shared = 0;
    const seen = markId + 1;
    for (const f of fv) {
      let hasU = false;
      for (let s = 0; s < 3; s++) if (F[f * 3 + s] === u) hasU = true;
      if (hasU) shared++;
      for (let s = 0; s < 3; s++) {
        const w = F[f * 3 + s];
        if (w !== v && w !== u && mark[w] === markId) { mark[w] = seen; common++; }
      }
    }
    markId++;
    if (common !== shared || shared === 0) continue;
    // flip / degeneracy test for faces of u that survive
    let ok = true;
    const bx = P[v * 3], by = P[v * 3 + 1], bz = P[v * 3 + 2];
    for (const f of fu) {
      const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
      if (a === v || b === v || c === v) continue;
      const l0 = faceN(f, n0);
      const s = a === u ? 0 : b === u ? 1 : 2;
      const ux0 = P[u * 3], uy0 = P[u * 3 + 1], uz0 = P[u * 3 + 2];
      P[u * 3] = bx; P[u * 3 + 1] = by; P[u * 3 + 2] = bz;
      const l1 = faceN(f, n1);
      P[u * 3] = ux0; P[u * 3 + 1] = uy0; P[u * 3 + 2] = uz0;
      void s;
      if (l1 < 1e-14 || (n0[0] * n1[0] + n0[1] * n1[1] + n0[2] * n1[2]) < cosFlip * l0 * l1) { ok = false; break; }
    }
    if (!ok) continue;
    // apply: remove shared faces, re-point the others to v (in place, no allocation)
    let wr = 0;
    for (let q = 0; q < fv.length; q++) {
      const f = fv[q];
      if (F[f * 3] < 0) continue;
      const a = F[f * 3], b = F[f * 3 + 1], c = F[f * 3 + 2];
      if (a === u || b === u || c === u) {
        const w = a !== u && a !== v ? a : b !== u && b !== v ? b : c;
        const lw = vf[w];
        const at = lw.indexOf(f);
        if (at >= 0) { lw[at] = lw[lw.length - 1]; lw.pop(); }
        F[f * 3] = F[f * 3 + 1] = F[f * 3 + 2] = -1;
        live--;
      } else fv[wr++] = f;
    }
    fv.length = wr;
    for (let q = 0; q < fu.length; q++) {
      const f = fu[q];
      if (F[f * 3] < 0) continue;
      if (F[f * 3] === u) F[f * 3] = v; else if (F[f * 3 + 1] === u) F[f * 3 + 1] = v; else if (F[f * 3 + 2] === u) F[f * 3 + 2] = v;
      fv.push(f);
    }
    const merged = fv;
    vf[u] = [];
    for (let k = 0; k < 10; k++) Q[v * 10 + k] += Q[u * 10 + k];
    area[v] += area[u];
    stamp[u]++;
    stamp[v]++;
    // re-evaluate edges around v
    neighbours.length = 0;
    markId++;
    for (const f of merged) for (let s = 0; s < 3; s++) {
      const w = F[f * 3 + s];
      if (w !== v && mark[w] !== markId) { mark[w] = markId; neighbours.push(w); }
    }
    // only edges incident to v changed cost (its quadric grew); entries of u/v are stale by stamp
    for (const w of neighbours) consider(v, w);
  }

  // compact
  const remap = new Int32Array(nV).fill(-1);
  let nv2 = 0;
  const outIdx: number[] = [];
  for (let f = 0; f < F0; f++) {
    if (F[f * 3] < 0) continue;
    for (let s = 0; s < 3; s++) {
      const v = F[f * 3 + s];
      if (remap[v] < 0) remap[v] = nv2++;
      outIdx.push(remap[v]);
    }
  }
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(geo.attributes)) {
    const src = geo.attributes[name] as THREE.BufferAttribute;
    const isz = src.itemSize;
    const arr = new Float32Array(nv2 * isz);
    const sa = src.array as ArrayLike<number>;
    for (let v = 0; v < nV; v++) {
      const r = remap[v];
      if (r < 0) continue;
      for (let k = 0; k < isz; k++) arr[r * isz + k] = sa[v * isz + k];
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, isz));
  }
  out.setIndex(nv2 > 65535 ? new THREE.BufferAttribute(Uint32Array.from(outIdx), 1) : new THREE.BufferAttribute(Uint16Array.from(outIdx), 1));
  return out;
}
