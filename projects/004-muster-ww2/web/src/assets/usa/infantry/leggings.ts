/**
 * Leggings, Canvas, Dismounted, M1938 over the service shoes (the shared human base only has short
 * gaiters that end INSIDE the shoe collar). The legging here is a canvas shell measured around the
 * posed shank and shoe (rays against the shared legwear / shoe meshes), so it wraps the shoe top down
 * over the instep and the heel counter, with:
 *  - the lacing on the outer side: a flap strip, a row of blackened hooks and a zig-zag lace;
 *  - the web instep strap running down both sides of the shoe to the sole at the waist of the foot.
 * The shared legwear tube (and its strap bands) is dropped by the caller.
 */
import * as THREE from 'three';
import { G, M } from '../../../core/kit';
import type { SoldierBuild } from '../../shared/human/soldier';
import type { Side } from '../../shared/human/skeleton';
import { US } from '../gear';
import { US_UNIFORM_COLORS } from './uniform';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** World-space triangles of some meshes, binned by height for fast horizontal rays. */
class TriSet {
  private bins = new Map<number, number[]>();
  private pos: number[] = [];
  constructor(meshes: THREE.Mesh[], y0: number, y1: number, private bin = 0.01) {
    const a = V(), b = V(), c = V();
    for (const m of meshes) {
      m.updateMatrixWorld(true);
      const g = m.geometry;
      const p = g.attributes.position;
      const idx = g.index;
      const n = idx ? idx.count : p.count;
      for (let i = 0; i < n; i += 3) {
        const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
        a.fromBufferAttribute(p, ia).applyMatrix4(m.matrixWorld);
        b.fromBufferAttribute(p, ib).applyMatrix4(m.matrixWorld);
        c.fromBufferAttribute(p, ic).applyMatrix4(m.matrixWorld);
        const lo = Math.min(a.y, b.y, c.y), hi = Math.max(a.y, b.y, c.y);
        if (hi < y0 || lo > y1) continue;
        const t = this.pos.length / 9;
        this.pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
        for (let k = Math.floor(lo / bin); k <= Math.floor(hi / bin); k++) {
          let l = this.bins.get(k);
          if (!l) this.bins.set(k, (l = []));
          l.push(t);
        }
      }
    }
  }
  /** Nearest hit distance along the ray (Moller-Trumbore, both faces), or null. */
  hit(o: THREE.Vector3, d: THREE.Vector3, maxT: number): number | null {
    const yA = o.y, yB = o.y + d.y * maxT;
    const k0 = Math.floor((Math.min(yA, yB) - 0.002) / this.bin), k1 = Math.floor((Math.max(yA, yB) + 0.002) / this.bin);
    const P = this.pos;
    let best: number | null = null;
    const seen = new Set<number>();
    for (let k = k0; k <= k1; k++) {
      const l = this.bins.get(k);
      if (!l) continue;
      for (const t of l) {
        if (seen.has(t)) continue;
        seen.add(t);
        const j = t * 9;
        const e1x = P[j + 3] - P[j], e1y = P[j + 4] - P[j + 1], e1z = P[j + 5] - P[j + 2];
        const e2x = P[j + 6] - P[j], e2y = P[j + 7] - P[j + 1], e2z = P[j + 8] - P[j + 2];
        const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-12) continue;
        const inv = 1 / det;
        const tx = o.x - P[j], ty = o.y - P[j + 1], tz = o.z - P[j + 2];
        const u = (tx * px + ty * py + tz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
        const v = (d.x * qx + d.y * qy + d.z * qz) * inv;
        if (v < 0 || u + v > 1) continue;
        const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (tt > 0 && tt < maxT && (best === null || tt < best)) best = tt;
      }
    }
    return best;
  }
}

const NA = 36; // around
const NV = 24; // up
const TOP = 0.29;
const T = 0.0022;

export function leggingParts(sol: SoldierBuild): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const canvas = M.canvas(US_UNIFORM_COLORS.leggings, { dust: 0.3, dustHeight: 0.25, colorVar: 0.08, name: 'us-m1938-legging' });
  const lace = US.web('od7');
  const metal = US.blackMetal();
  const byName = new Map<string, THREE.Mesh>();
  for (const c of sol.object.children) if ((c as THREE.Mesh).isMesh) byName.set(c.name, c as THREE.Mesh);
  const s = sol.pose.sk.s;
  for (const side of ['l', 'r'] as Side[]) {
    const targets = [`legwear-${side}`, `boot-${side}`, `boot-rim-${side}`, `lace-${side}`].map((n) => byName.get(n)).filter((m): m is THREE.Mesh => !!m);
    // laces are several meshes with the same name
    for (const c of sol.object.children) if (c.name === `lace-${side}` && (c as THREE.Mesh).isMesh && !targets.includes(c as THREE.Mesh)) targets.push(c as THREE.Mesh);
    const tris = new TriSet(targets, 0.03, TOP * s + 0.03);
    const L = sol.pose.sk.leg[side];
    const sh = L.knee.clone().sub(L.ankle).normalize();
    const fwd = L.foot.z.clone().addScaledVector(sh, -L.foot.z.dot(sh)).normalize();
    const lat = V(side === 'l' ? 1 : -1, 0, 0);
    lat.addScaledVector(sh, -lat.dot(sh)).addScaledVector(fwd, -lat.dot(fwd)).normalize();
    const centre = (h: number) => L.ankle.clone().addScaledVector(sh, (h - L.ankle.y) / Math.max(0.5, sh.y));
    const dir = (th: number) => fwd.clone().multiplyScalar(Math.cos(th)).addScaledVector(lat, Math.sin(th));
    // bottom edge: low over the instep and the heel, higher at the sides (ankle bones)
    const bottom = (th: number) => (0.085 + 0.017 * Math.cos(th)) * s;
    const R: number[][] = [];
    const H: number[][] = [];
    for (let j = 0; j <= NV; j++) {
      const v = j / NV;
      const vv = v * v * 0.55 + v * 0.45; // denser rings near the shoe
      const row: number[] = [], hr: number[] = [];
      for (let i = 0; i < NA; i++) {
        const th = (i / NA) * Math.PI * 2;
        const h = bottom(th) + (TOP * s - bottom(th)) * vv;
        const c = centre(h), d = dir(th);
        const o = c.clone().addScaledVector(d, 0.2);
        const t = tris.hit(o, d.clone().negate(), 0.2);
        row.push(t === null ? NaN : 0.2 - t);
        hr.push(h);
      }
      R.push(row);
      H.push(hr);
    }
    // fill misses from neighbours, dilate (covers the shoe's collar rim between rings), then smooth
    // outward only (never inside the shoe / legwear)
    for (let j = 0; j <= NV; j++) for (let i = 0; i < NA; i++) if (Number.isNaN(R[j][i])) R[j][i] = R[Math.max(0, j - 1)][i] || R[Math.min(NV, j + 1)][i] || 0.05 * s;
    {
      const prev = R.map((r) => r.slice());
      for (let j = 0; j <= NV; j++)
        for (let i = 0; i < NA; i++)
          R[j][i] = Math.max(prev[j][i], prev[Math.max(0, j - 1)][i], prev[Math.min(NV, j + 1)][i], prev[j][(i + 1) % NA], prev[j][(i + NA - 1) % NA]);
    }
    for (let it = 0; it < 3; it++) {
      const prev = R.map((r) => r.slice());
      for (let j = 0; j <= NV; j++)
        for (let i = 0; i < NA; i++) {
          const a = prev[j][(i + NA - 1) % NA], b = prev[j][(i + 1) % NA];
          const u = prev[Math.max(0, j - 1)][i], w = prev[Math.min(NV, j + 1)][i];
          R[j][i] = Math.max(prev[j][i], (a + b + u + w + prev[j][i] * 4) / 8);
        }
    }
    // a legging tapers gradually from the shoe to the calf: limit how fast the radius shrinks upwards
    for (let j = 1; j <= NV; j++) for (let i = 0; i < NA; i++) R[j][i] = Math.max(R[j][i], R[j - 1][i] - 0.25 * (H[j][i] - H[j - 1][i]));
    // shell: outer surface + inner surface + top and bottom edges
    const clr = (j: number) => 0.0014 + 0.0018 * (1 - j / NV) ** 2;
    const pos: number[] = [];
    const idx: number[] = [];
    const vtx = (j: number, i: number, inner: boolean) => {
      const th = (i / NA) * Math.PI * 2;
      const h = H[j][i];
      const r = R[j][i] + clr(j) + (inner ? -T : 0);
      const p = centre(h).addScaledVector(dir(th), r);
      pos.push(p.x, p.y, p.z);
    };
    for (const inner of [false, true]) for (let j = 0; j <= NV; j++) for (let i = 0; i < NA; i++) vtx(j, i, inner);
    const id = (inner: boolean, j: number, i: number) => (inner ? (NV + 1) * NA : 0) + j * NA + (i % NA);
    for (let j = 0; j < NV; j++)
      for (let i = 0; i < NA; i++) {
        // outer faces out: order (j,i) (j,i+1) (j+1,i+1) depends on handedness; fixed below by a normal test
        idx.push(id(false, j, i), id(false, j, i + 1), id(false, j + 1, i + 1), id(false, j, i), id(false, j + 1, i + 1), id(false, j + 1, i));
        idx.push(id(true, j, i), id(true, j + 1, i + 1), id(true, j, i + 1), id(true, j, i), id(true, j + 1, i), id(true, j + 1, i + 1));
      }
    for (const j of [0, NV])
      for (let i = 0; i < NA; i++) {
        const a = id(false, j, i), b = id(false, j, i + 1), c = id(true, j, i + 1), d = id(true, j, i);
        if (j === NV) idx.push(a, b, c, a, c, d);
        else idx.push(a, c, b, a, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    // orientation: the first outer quad's normal must point away from the axis
    {
      const P = (k: number) => V(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]);
      const a = P(id(false, 2, 0)), b = P(id(false, 2, 1)), c = P(id(false, 3, 1));
      const n = b.clone().sub(a).cross(c.clone().sub(a));
      if (n.dot(dir(0.5 * (Math.PI * 2) / NA)) < 0) {
        for (let k = 0; k < idx.length; k += 3) {
          const t = idx[k + 1];
          idx[k + 1] = idx[k + 2];
          idx[k + 2] = t;
        }
        g.setIndex(idx);
      }
    }
    g.computeVertexNormals();
    const shell = new THREE.Mesh(g, canvas);
    shell.name = `legging-${side}`;
    out.push(shell);

    // ---- lacing on the outer side: flap strip, hooks, zig-zag lace
    const thL = Math.PI / 2 - 0.12; // just forward of the side line
    const surf = (th: number, h: number, lift: number) => {
      const i0 = ((th / (Math.PI * 2)) * NA + NA) % NA;
      const ia = Math.floor(i0), ib = (ia + 1) % NA, t = i0 - ia;
      // ring index for h (rings are not level: search the column)
      let j = 0;
      while (j < NV && H[j + 1][ia] < h) j++;
      const jb = Math.min(NV, j + 1);
      const f = H[jb][ia] > H[j][ia] ? (h - H[j][ia]) / (H[jb][ia] - H[j][ia]) : 0;
      const r0 = R[j][ia] * (1 - t) + R[j][ib] * t, r1 = R[jb][ia] * (1 - t) + R[jb][ib] * t;
      const r = r0 * (1 - f) + r1 * f + clr(j) + lift;
      return centre(h).addScaledVector(dir(th), r);
    };
    const h0 = 0.105 * s, h1 = TOP * s - 0.012 * s;
    const flapPts: THREE.Vector3[] = [], flapN: THREE.Vector3[] = [];
    for (let k = 0; k <= 12; k++) {
      const h = h0 - 0.012 * s + ((h1 + 0.01 * s - h0) * k) / 12;
      flapPts.push(surf(thL - 0.07, h, 0.0009));
      flapN.push(dir(thL - 0.07));
    }
    const flap = new THREE.Mesh(G.strap(flapPts, 0.022 * s, 0.0012, flapN, { smooth: false }), canvas);
    flap.name = `legging-flap-${side}`;
    out.push(flap);
    const nH = 8;
    const hookG: THREE.BufferGeometry[] = [];
    const lacePts: THREE.Vector3[] = [];
    for (let k = 0; k < nH; k++) {
      const h = h0 + ((h1 - h0) * k) / (nH - 1);
      const pf = surf(thL + 0.1, h, 0.0022);
      const pb = surf(thL - 0.16, h + 0.012 * s, 0.0022);
      const hk = new THREE.BoxGeometry(0.005, 0.007, 0.003);
      const n = dir(thL + 0.1);
      const up = sh.clone();
      const x = new THREE.Vector3().crossVectors(up, n).normalize();
      hk.applyMatrix4(new THREE.Matrix4().makeBasis(x, up, n).setPosition(pf));
      hookG.push(hk);
      lacePts.push(pf.clone().addScaledVector(n, 0.001), pb.clone().addScaledVector(dir(thL - 0.16), 0.0008));
    }
    const hooks = new THREE.Mesh(mergeAll(hookG), metal);
    hooks.name = `legging-hooks-${side}`;
    out.push(hooks);
    const laceM = new THREE.Mesh(G.tube(lacePts.map((p) => [p.x, p.y, p.z] as [number, number, number]), 0.0011, 4, lacePts.length * 3), lace);
    laceM.name = `legging-lace-${side}`;
    out.push(laceM);

    // ---- instep strap: down both sides of the shoe to the sole at the waist of the foot
    const strapG: THREE.BufferGeometry[] = [];
    for (const sgn of [1, -1]) {
      const th = sgn > 0 ? Math.PI / 2 + 0.25 : -Math.PI / 2 - 0.25;
      const pts: THREE.Vector3[] = [], nn: THREE.Vector3[] = [];
      const hs = [bottom(th) + 0.012 * s, bottom(th) - 0.01 * s, 0.05 * s, 0.032 * s, 0.017 * s];
      let last = 0.05;
      for (const h of hs) {
        const c = centre(h), d = dir(th);
        const t = tris.hit(c.clone().addScaledVector(d, 0.2), d.clone().negate(), 0.2);
        const r = t === null ? last : 0.2 - t;
        last = r;
        pts.push(c.addScaledVector(d, r + (h > bottom(th) ? clr(0) + 0.0012 : 0.0012)));
        nn.push(d);
      }
      strapG.push(G.strap(pts, 0.016 * s, 0.0016, nn, { smooth: false }));
    }
    const strap = new THREE.Mesh(mergeAll(strapG), lace);
    strap.name = `legging-strap-${side}`;
    out.push(strap);
  }
  return out;
}

function mergeAll(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nrm: number[] = [];
  for (const g0 of gs) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return out;
}
