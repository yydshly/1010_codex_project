/**
 * Baking: turns an asset's authored hierarchy (hundreds of small meshes) into a
 * compact render-ready group — one merged mesh per material — and writes the
 * `aEdge` attribute (x = convex edge sharpness, y = concave crease) used by
 * surface materials for edge wear and cavity darkening.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface BakeStats {
  triangles: number;
  drawCalls: number;
  materials: number;
  bounds: THREE.Box3;
  /** Lowest vertex Y — should be 0 for grounded assets. */
  minY: number;
  bakeMs: number;
}

const KEEP_ATTRS = ['position', 'normal', 'uv'];

function prepare(src: THREE.BufferGeometry, matrix: THREE.Matrix4): THREE.BufferGeometry {
  let g = src.clone();
  for (const name of Object.keys(g.attributes)) {
    if (!KEEP_ATTRS.includes(name) && name !== 'color') g.deleteAttribute(name);
  }
  g.morphAttributes = {};
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  }
  g.applyMatrix4(matrix);
  if (matrix.determinant() < 0) {
    // mirrored: restore outward winding
    if (!g.index) g = indexed(g);
    const a = g.index!.array as Uint32Array | Uint16Array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
  }
  if (!g.index) g = indexed(g);
  // Normalise index type to Uint32 so merges of mixed sizes work
  const ia = g.index!.array;
  if (!(ia instanceof Uint32Array)) g.setIndex(new THREE.Uint32BufferAttribute(Uint32Array.from(ia), 1));
  return g;
}

function indexed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.attributes.position.count;
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

/**
 * Per-vertex convex/concave edge factors from local geometry.
 * Welds by position so split-normal hard edges are detected, measures the max angle
 * between incident face normals and the averaged normal, plus a curvature estimate.
 */
export function computeEdgeAttribute(g: THREE.BufferGeometry): void {
  const pos = g.attributes.position.array as Float32Array;
  const index = g.index!.array as Uint32Array;
  const nV = g.attributes.position.count;
  const q = 1e4; // 0.1 mm weld
  const weldOf = new Int32Array(nV);
  const map = new Map<string, number>();
  let nW = 0;
  for (let v = 0; v < nV; v++) {
    const key = Math.round(pos[v * 3] * q) + ',' + Math.round(pos[v * 3 + 1] * q) + ',' + Math.round(pos[v * 3 + 2] * q);
    let w = map.get(key);
    if (w === undefined) {
      w = nW++;
      map.set(key, w);
    }
    weldOf[v] = w;
  }
  const wp = new Float32Array(nW * 3);
  for (let v = 0; v < nV; v++) {
    const w = weldOf[v];
    wp[w * 3] = pos[v * 3]; wp[w * 3 + 1] = pos[v * 3 + 1]; wp[w * 3 + 2] = pos[v * 3 + 2];
  }
  const nT = index.length / 3;
  const fn = new Float32Array(nT * 3);
  const fc = new Float32Array(nT * 3);
  const avgN = new Float32Array(nW * 3);
  for (let t = 0; t < nT; t++) {
    const a = index[t * 3], b = index[t * 3 + 1], c = index[t * 3 + 2];
    const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
    const e1x = pos[b * 3] - ax, e1y = pos[b * 3 + 1] - ay, e1z = pos[b * 3 + 2] - az;
    const e2x = pos[c * 3] - ax, e2y = pos[c * 3 + 1] - ay, e2z = pos[c * 3 + 2] - az;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const area2 = Math.hypot(nx, ny, nz);
    if (area2 < 1e-14) continue;
    for (const v of [a, b, c]) {
      const w = weldOf[v];
      avgN[w * 3] += nx; avgN[w * 3 + 1] += ny; avgN[w * 3 + 2] += nz; // area weighted
    }
    nx /= area2; ny /= area2; nz /= area2;
    fn[t * 3] = nx; fn[t * 3 + 1] = ny; fn[t * 3 + 2] = nz;
    fc[t * 3] = ax + (e1x + e2x) / 3;
    fc[t * 3 + 1] = ay + (e1y + e2y) / 3;
    fc[t * 3 + 2] = az + (e1z + e2z) / 3;
  }
  for (let w = 0; w < nW; w++) {
    const l = Math.hypot(avgN[w * 3], avgN[w * 3 + 1], avgN[w * 3 + 2]) || 1;
    avgN[w * 3] /= l; avgN[w * 3 + 1] /= l; avgN[w * 3 + 2] /= l;
  }
  const maxAng = new Float32Array(nW);
  const curvSum = new Float32Array(nW);
  const convSum = new Float32Array(nW);
  const cnt = new Uint16Array(nW);
  for (let t = 0; t < nT; t++) {
    const fx = fn[t * 3], fy = fn[t * 3 + 1], fz = fn[t * 3 + 2];
    if (fx === 0 && fy === 0 && fz === 0) continue;
    for (let s = 0; s < 3; s++) {
      const w = weldOf[index[t * 3 + s]];
      const Nx = avgN[w * 3], Ny = avgN[w * 3 + 1], Nz = avgN[w * 3 + 2];
      const ang = Math.acos(Math.max(-1, Math.min(1, fx * Nx + fy * Ny + fz * Nz)));
      if (ang > maxAng[w]) maxAng[w] = ang;
      const dx = fc[t * 3] - wp[w * 3], dy = fc[t * 3 + 1] - wp[w * 3 + 1], dz = fc[t * 3 + 2] - wp[w * 3 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > 1e-14) {
        const dot = dx * Nx + dy * Ny + dz * Nz;
        curvSum[w] += (-2 * dot) / d2; // ~ 1/R, positive when convex
        convSum[w] += -dot / Math.sqrt(d2);
      }
      if (cnt[w] < 65535) cnt[w]++;
    }
  }
  const edge = new Float32Array(nV * 2);
  const ss = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const A0 = (18 * Math.PI) / 180, A1 = (45 * Math.PI) / 180;
  for (let v = 0; v < nV; v++) {
    const w = weldOf[v];
    const c = cnt[w] || 1;
    const kappa = curvSum[w] / c; // 1/m
    const convex = convSum[w] >= 0;
    const angF = ss(A0, A1, maxAng[w]);
    const convexK = ss(60, 180, kappa);
    const concaveK = ss(30, 150, -kappa);
    edge[v * 2] = Math.max(convex ? angF : 0, convexK);
    edge[v * 2 + 1] = Math.max(convex ? 0 : angF, concaveK);
  }
  g.setAttribute('aEdge', new THREE.BufferAttribute(edge, 2));
}

export interface BakeOptions {
  /** Skip edge computation (e.g. for very dense SDF meshes where it adds little). */
  edges?: boolean;
}

/**
 * Bake an authored object into merged meshes (one per material).
 * Objects with `userData.noBake = true` are kept as-is (cloned) and not merged.
 */
export function bake(root: THREE.Object3D, opts: BakeOptions = {}): { group: THREE.Group; stats: BakeStats } {
  const t0 = performance.now();
  root.updateMatrixWorld(true);
  const rootInv = root.matrixWorld.clone().invert();
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const keep: THREE.Object3D[] = [];
  const noEdge = new Set<THREE.Material>();

  root.traverse((o) => {
    if (o.userData.noBake) {
      keep.push(o);
      return;
    }
    const mesh = o as THREE.Mesh;
    if (!(mesh as THREE.Mesh).isMesh || !mesh.visible) return;
    if (hasNoBakeAncestor(o, root)) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const rel = new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld);
    const inst = (mesh as THREE.InstancedMesh).isInstancedMesh ? (mesh as THREE.InstancedMesh) : null;
    const matrices: THREE.Matrix4[] = [];
    if (inst) {
      const m = new THREE.Matrix4();
      for (let i = 0; i < inst.count; i++) {
        inst.getMatrixAt(i, m);
        matrices.push(new THREE.Matrix4().multiplyMatrices(rel, m));
      }
    } else matrices.push(rel);
    if (mesh.userData.noEdge) mats.forEach((m) => noEdge.add(m));
    for (const mtx of matrices) {
      if (mats.length === 1 || !mesh.geometry.groups.length) {
        const g = prepare(mesh.geometry, mtx);
        push(byMat, mats[0], g);
      } else {
        for (const grp of mesh.geometry.groups) {
          const sub = subGeometry(mesh.geometry, grp.start, grp.count);
          push(byMat, mats[grp.materialIndex ?? 0], prepare(sub, mtx));
        }
      }
    }
  });

  const group = new THREE.Group();
  group.name = root.name || 'baked';
  let triangles = 0;
  for (const [mat, geos] of byMat) {
    const hasColor = geos.some((g) => g.attributes.color);
    if (hasColor) {
      for (const g of geos) {
        if (!g.attributes.color) {
          const c = new Float32Array(g.attributes.position.count * 3).fill(1);
          g.setAttribute('color', new THREE.BufferAttribute(c, 3));
        } else if ((g.attributes.color as THREE.BufferAttribute).itemSize !== 3) {
          const src = g.attributes.color as THREE.BufferAttribute;
          const c = new Float32Array(src.count * 3);
          for (let i = 0; i < src.count; i++) { c[i * 3] = src.getX(i); c[i * 3 + 1] = src.getY(i); c[i * 3 + 2] = src.getZ(i); }
          g.setAttribute('color', new THREE.BufferAttribute(c, 3));
        }
      }
    }
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) throw new Error(`bake: failed to merge geometries for material ${mat.name}`);
    if (opts.edges !== false && !noEdge.has(mat)) computeEdgeAttribute(merged);
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = mat.name;
    const noShadow = !!mat.userData.noShadow;
    mesh.castShadow = !noShadow;
    mesh.receiveShadow = true;
    if ((mat as THREE.MeshStandardMaterial).transparent) mesh.renderOrder = 2;
    group.add(mesh);
    triangles += merged.index ? merged.index.count / 3 : merged.attributes.position.count / 3;
  }
  for (const k of keep) {
    const c = k.clone(true);
    const rel = new THREE.Matrix4().multiplyMatrices(rootInv, k.matrixWorld);
    rel.decompose(c.position, c.quaternion, c.scale);
    group.add(c);
  }

  const bounds = new THREE.Box3().setFromObject(group);
  let minY = Infinity;
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position;
    m.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
      if (v.y < minY) minY = v.y;
    }
  });
  return {
    group,
    stats: {
      triangles: Math.round(triangles),
      drawCalls: group.children.length,
      materials: byMat.size,
      bounds,
      minY,
      bakeMs: performance.now() - t0,
    },
  };
}

function hasNoBakeAncestor(o: THREE.Object3D, root: THREE.Object3D): boolean {
  let p = o.parent;
  while (p && p !== root) {
    if (p.userData.noBake) return true;
    p = p.parent;
  }
  return false;
}

function push(map: Map<THREE.Material, THREE.BufferGeometry[]>, m: THREE.Material, g: THREE.BufferGeometry) {
  let a = map.get(m);
  if (!a) map.set(m, (a = []));
  a.push(g);
}

function subGeometry(g: THREE.BufferGeometry, start: number, count: number): THREE.BufferGeometry {
  const src = g.index ? g : indexed(g.clone());
  const out = new THREE.BufferGeometry();
  for (const name of Object.keys(src.attributes)) out.setAttribute(name, src.attributes[name]);
  const ia = src.index!.array;
  out.setIndex(new THREE.Uint32BufferAttribute(Uint32Array.from(ia.slice(start, start + count)), 1));
  return out;
}
