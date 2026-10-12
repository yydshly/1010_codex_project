/**
 * Signed-distance-field modelling + Surface Nets mesher, for organic forms
 * (bodies, cloth, boots, sandbags, cushions, helmets liners, ...).
 *
 *   const f = S.smin(S.capsule([0,0,0],[0,0.4,0],0.06), S.sphere([0,0.45,0],0.08), 0.03);
 *   const geo = sdfMesh(f, { min:[-0.2,-0.1,-0.2], max:[0.2,0.6,0.2] }, 0.005);
 *
 * Distances are in metres. Primitives are Lipschitz-1 (or close), which lets the
 * mesher skip empty space quickly. Displacement adds detail but keep amplitude small.
 */
import * as THREE from 'three';

export type SDF = (x: number, y: number, z: number) => number;
type P3 = [number, number, number];

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

export const S = {
  sphere(c: P3, r: number): SDF {
    const [cx, cy, cz] = c;
    return (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r;
  },
  /** Approximate ellipsoid (good near the surface). */
  ellipsoid(c: P3, rad: P3): SDF {
    const [cx, cy, cz] = c, [a, b, d] = rad;
    return (x, y, z) => {
      const px = (x - cx) / a, py = (y - cy) / b, pz = (z - cz) / d;
      const k0 = Math.hypot(px, py, pz);
      const k1 = Math.hypot(px / a, py / b, pz / d);
      return k1 === 0 ? -Math.min(a, b, d) : (k0 * (k0 - 1)) / k1;
    };
  },
  capsule(a: P3, b: P3, r: number): SDF {
    const [ax, ay, az] = a;
    const bx = b[0] - ax, by = b[1] - ay, bz = b[2] - az;
    const bb = bx * bx + by * by + bz * bz || 1e-12;
    return (x, y, z) => {
      const px = x - ax, py = y - ay, pz = z - az;
      const h = clamp((px * bx + py * by + pz * bz) / bb, 0, 1);
      return Math.hypot(px - bx * h, py - by * h, pz - bz * h) - r;
    };
  },
  /** Cone-capsule with radius r1 at a and r2 at b (exact "round cone"). */
  roundCone(a: P3, b: P3, r1: number, r2: number): SDF {
    const [ax, ay, az] = a;
    const bax = b[0] - ax, bay = b[1] - ay, baz = b[2] - az;
    const l2 = bax * bax + bay * bay + baz * baz;
    const rr = r1 - r2;
    const a2 = l2 - rr * rr;
    const il2 = 1 / l2;
    return (x, y, z) => {
      const pax = x - ax, pay = y - ay, paz = z - az;
      const yv = pax * bax + pay * bay + paz * baz;
      const z_ = yv - l2;
      const qx = pax * l2 - bax * yv, qy = pay * l2 - bay * yv, qz = paz * l2 - baz * yv;
      const x2 = qx * qx + qy * qy + qz * qz;
      const y2 = yv * yv * l2;
      const z2 = z_ * z_ * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(z_) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(yv) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - r1;
    };
  },
  /** Rounded box, centre c, half extents h, corner radius r, optional rotation (Euler XYZ radians). */
  box(c: P3, h: P3, r = 0, rot?: P3): SDF {
    const [cx, cy, cz] = c;
    const hx = h[0] - r, hy = h[1] - r, hz = h[2] - r;
    const m = rot ? new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rot)).invert().elements : null;
    return (x, y, z) => {
      let px = x - cx, py = y - cy, pz = z - cz;
      if (m) {
        const tx = m[0] * px + m[4] * py + m[8] * pz;
        const ty = m[1] * px + m[5] * py + m[9] * pz;
        const tz = m[2] * px + m[6] * py + m[10] * pz;
        px = tx; py = ty; pz = tz;
      }
      const qx = Math.abs(px) - hx, qy = Math.abs(py) - hy, qz = Math.abs(pz) - hz;
      const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0));
      return out + Math.min(Math.max(qx, qy, qz), 0) - r;
    };
  },
  /** Capped cylinder between a and b with radius r and edge rounding re. */
  cylinder(a: P3, b: P3, r: number, re = 0): SDF {
    const [ax, ay, az] = a;
    const bax = b[0] - ax, bay = b[1] - ay, baz = b[2] - az;
    const baba = bax * bax + bay * bay + baz * baz;
    const len = Math.sqrt(baba);
    const ux = bax / len, uy = bay / len, uz = baz / len;
    return (x, y, z) => {
      const px = x - ax, py = y - ay, pz = z - az;
      const t = px * ux + py * uy + pz * uz;
      const rx = px - ux * t, ry = py - uy * t, rz = pz - uz * t;
      const dr = Math.hypot(rx, ry, rz) - (r - re);
      const dh = Math.abs(t - len / 2) - (len / 2 - re);
      return Math.min(Math.max(dr, dh), 0) + Math.hypot(Math.max(dr, 0), Math.max(dh, 0)) - re;
    };
  },
  torus(c: P3, R: number, r: number, axis: 'x' | 'y' | 'z' = 'y'): SDF {
    const [cx, cy, cz] = c;
    return (x, y, z) => {
      const px = x - cx, py = y - cy, pz = z - cz;
      let a: number, b: number, h: number;
      if (axis === 'y') { a = px; b = pz; h = py; }
      else if (axis === 'x') { a = py; b = pz; h = px; }
      else { a = px; b = py; h = pz; }
      return Math.hypot(Math.hypot(a, b) - R, h) - r;
    };
  },
  /** Half-space: points with dot(p - o, n) > 0 are outside. */
  plane(o: P3, n: P3): SDF {
    const l = Math.hypot(...n);
    const nx = n[0] / l, ny = n[1] / l, nz = n[2] / l;
    return (x, y, z) => (x - o[0]) * nx + (y - o[1]) * ny + (z - o[2]) * nz;
  },

  union(...fs: SDF[]): SDF {
    return (x, y, z) => {
      let d = Infinity;
      for (const f of fs) { const v = f(x, y, z); if (v < d) d = v; }
      return d;
    };
  },
  /** Polynomial smooth union, k = blend radius (m). */
  smin(a: SDF, b: SDF, k: number): SDF {
    return (x, y, z) => smin(a(x, y, z), b(x, y, z), k);
  },
  sminAll(fs: SDF[], k: number): SDF {
    return (x, y, z) => {
      let d = fs[0](x, y, z);
      for (let i = 1; i < fs.length; i++) d = smin(d, fs[i](x, y, z), k);
      return d;
    };
  },
  subtract(a: SDF, b: SDF): SDF {
    return (x, y, z) => Math.max(a(x, y, z), -b(x, y, z));
  },
  /** Smooth subtraction of b from a. */
  ssub(a: SDF, b: SDF, k: number): SDF {
    return (x, y, z) => -smin(-a(x, y, z), b(x, y, z), k);
  },
  intersect(a: SDF, b: SDF): SDF {
    return (x, y, z) => Math.max(a(x, y, z), b(x, y, z));
  },
  sintersect(a: SDF, b: SDF, k: number): SDF {
    return (x, y, z) => -smin(-a(x, y, z), -b(x, y, z), k);
  },
  /** Grow/shrink a shape by d (positive = thicker). */
  offset(a: SDF, d: number): SDF {
    return (x, y, z) => a(x, y, z) - d;
  },
  /** Hollow shell of thickness t centred on the original surface. */
  shell(a: SDF, t: number): SDF {
    return (x, y, z) => Math.abs(a(x, y, z)) - t / 2;
  },
  /** Add a displacement field (keep |disp| small relative to the cell size x 4). */
  displace(a: SDF, disp: (x: number, y: number, z: number) => number): SDF {
    return (x, y, z) => a(x, y, z) + disp(x, y, z);
  },
  /** Apply an inverse transform to the domain (for rotating/placing parts). */
  transform(a: SDF, matrix: THREE.Matrix4): SDF {
    const m = matrix.clone().invert().elements;
    return (x, y, z) => a(
      m[0] * x + m[4] * y + m[8] * z + m[12],
      m[1] * x + m[5] * y + m[9] * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14],
    );
  },
  /** Mirror across the YZ plane (x -> |x|): model one side, get both. */
  mirrorX(a: SDF): SDF {
    return (x, y, z) => a(Math.abs(x), y, z);
  },
  /** Bound an expensive SDF by a cheap one: outside `bound` by more than `margin`, return the bound. */
  bounded(a: SDF, bound: SDF, margin = 0.02): SDF {
    return (x, y, z) => {
      const b = bound(x, y, z);
      return b > margin ? b : a(x, y, z);
    };
  },
};

export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export interface SdfMeshOptions {
  /** Newton projection iterations onto the zero surface (0-3). Default 2. */
  project?: number;
  /** Skip empty space in blocks of this many cells (default 4). */
  block?: number;
  /** Lipschitz safety factor for skipping (>1 if displacement is used). Default 1.3. */
  lipschitz?: number;
}

/**
 * Surface Nets mesher. Returns an indexed geometry with accurate normals from the SDF gradient.
 * Cell size controls detail: 0.003 m for faces/hands, 0.006-0.01 m for bodies & cloth.
 */
export function sdfMesh(
  f: SDF,
  bounds: { min: P3; max: P3 },
  cell: number,
  opts: SdfMeshOptions = {},
): THREE.BufferGeometry {
  const [x0, y0, z0] = bounds.min;
  const nx = Math.ceil((bounds.max[0] - x0) / cell) + 1;
  const ny = Math.ceil((bounds.max[1] - y0) / cell) + 1;
  const nz = Math.ceil((bounds.max[2] - z0) / cell) + 1;
  const N = nx * ny * nz;
  if (N > 60_000_000) throw new Error(`sdfMesh grid too large (${nx}x${ny}x${nz}); increase cell size or split the part`);
  const field = new Float32Array(N);
  const B = opts.block ?? 4;
  const L = opts.lipschitz ?? 1.3;
  const idx = (i: number, j: number, k: number) => i + nx * (j + ny * k);

  // Block-wise evaluation with empty-space skipping.
  const halfDiag = (Math.sqrt(3) * B * cell) / 2;
  for (let bk = 0; bk < nz; bk += B) {
    for (let bj = 0; bj < ny; bj += B) {
      for (let bi = 0; bi < nx; bi += B) {
        const ie = Math.min(bi + B, nx - 1), je = Math.min(bj + B, ny - 1), ke = Math.min(bk + B, nz - 1);
        const cx = x0 + ((bi + ie) / 2) * cell, cy = y0 + ((bj + je) / 2) * cell, cz = z0 + ((bk + ke) / 2) * cell;
        const dc = f(cx, cy, cz);
        const skip = Math.abs(dc) > halfDiag * L + cell;
        for (let k = bk; k <= ke; k++) {
          for (let j = bj; j <= je; j++) {
            for (let i = bi; i <= ie; i++) {
              const id = idx(i, j, k);
              if (skip) field[id] = dc;
              else field[id] = f(x0 + i * cell, y0 + j * cell, z0 + k * cell);
            }
          }
        }
      }
    }
  }

  // Vertex per surface cell.
  const cellIndex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (i: number, j: number, k: number) => i + (nx - 1) * (j + (ny - 1) * k);
  const positions: number[] = [];
  const corner = new Float32Array(8);
  const EDGES = [
    [0, 1], [2, 3], [4, 5], [6, 7], // x edges
    [0, 2], [1, 3], [4, 6], [5, 7], // y edges
    [0, 4], [1, 5], [2, 6], [3, 7], // z edges
  ];
  const COff = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const v = field[idx(i + COff[c][0], j + COff[c][1], k + COff[c][2])];
          corner[c] = v;
          if (v < 0) mask |= 1 << c;
        }
        if (mask === 0 || mask === 255) continue;
        let sx = 0, sy = 0, sz = 0, cnt = 0;
        for (const [a, b] of EDGES) {
          const va = corner[a], vb = corner[b];
          if ((va < 0) === (vb < 0)) continue;
          const t = va / (va - vb);
          sx += COff[a][0] + (COff[b][0] - COff[a][0]) * t;
          sy += COff[a][1] + (COff[b][1] - COff[a][1]) * t;
          sz += COff[a][2] + (COff[b][2] - COff[a][2]) * t;
          cnt++;
        }
        cellIndex[cidx(i, j, k)] = positions.length / 3;
        positions.push(x0 + (i + sx / cnt) * cell, y0 + (j + sy / cnt) * cell, z0 + (k + sz / cnt) * cell);
      }
    }
  }

  // Quads across each sign-changing grid edge.
  const indices: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) indices.push(a, c, b, a, d, c);
    else indices.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const v0 = field[idx(i, j, k)], v1 = field[idx(i + 1, j, k)];
        if ((v0 < 0) === (v1 < 0)) continue;
        quad(cellIndex[cidx(i, j - 1, k - 1)], cellIndex[cidx(i, j, k - 1)], cellIndex[cidx(i, j, k)], cellIndex[cidx(i, j - 1, k)], v0 < 0);
      }
    }
  }
  for (let k = 1; k < nz - 1; k++) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const v0 = field[idx(i, j, k)], v1 = field[idx(i, j + 1, k)];
        if ((v0 < 0) === (v1 < 0)) continue;
        quad(cellIndex[cidx(i - 1, j, k - 1)], cellIndex[cidx(i - 1, j, k)], cellIndex[cidx(i, j, k)], cellIndex[cidx(i, j, k - 1)], v0 < 0);
      }
    }
  }
  for (let k = 0; k < nz - 1; k++) {
    for (let j = 1; j < ny - 1; j++) {
      for (let i = 1; i < nx - 1; i++) {
        const v0 = field[idx(i, j, k)], v1 = field[idx(i, j, k + 1)];
        if ((v0 < 0) === (v1 < 0)) continue;
        quad(cellIndex[cidx(i - 1, j - 1, k)], cellIndex[cidx(i, j - 1, k)], cellIndex[cidx(i, j, k)], cellIndex[cidx(i - 1, j, k)], v0 < 0);
      }
    }
  }

  // Project vertices onto the surface & compute gradient normals.
  const nv = positions.length / 3;
  const pos = new Float32Array(positions);
  const nrm = new Float32Array(nv * 3);
  const h = cell * 0.25;
  const iters = opts.project ?? 2;
  for (let v = 0; v < nv; v++) {
    let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let gx = 0, gy = 0, gz = 1;
    for (let it = 0; it <= iters; it++) {
      gx = f(x + h, y, z) - f(x - h, y, z);
      gy = f(x, y + h, z) - f(x, y - h, z);
      gz = f(x, y, z + h) - f(x, y, z - h);
      const gl = Math.hypot(gx, gy, gz) || 1;
      gx /= gl; gy /= gl; gz /= gl;
      if (it === iters) break;
      const d = f(x, y, z);
      const step = clamp(d, -cell * 0.6, cell * 0.6);
      x -= gx * step; y -= gy * step; z -= gz * step;
    }
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
    nrm[v * 3] = gx; nrm[v * 3 + 1] = gy; nrm[v * 3 + 2] = gz;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(indices, 1) : new THREE.Uint16BufferAttribute(indices, 1));
  return g;
}
