/**
 * Geometry helpers shared by the Soviet small-arms modules (metres, weapon "bore frame":
 * +Z towards the muzzle, +Y up, +X = weapon's left). Angles around the bore are measured from +X
 * towards +Y (90 deg = top, 180 deg = right side, 270 deg = bottom).
 */
import { THREE, G } from '../../../../core/kit';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export type V2 = [number, number];
export type V3 = [number, number, number];
export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const D2R = Math.PI / 180;

/** Lathe around +Z from [radius, z] points (z increasing = outward facing). a0/a1 in degrees from +X to +Y. */
export function latheZ(profile: V2[], seg = 32, creaseDeg = 40, a0 = 0, a1 = 360): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg, (a0 + 90) * D2R, (a1 - a0) * D2R);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Lathe around +X from [radius, x] points. */
export function latheX(profile: V2[], seg = 24, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, creaseDeg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Closed rectangular ring profile (for latheZ / latheX): ri..ro between z0..z1 with chamfers. */
export function ringProfile(ri: number, ro: number, z0: number, z1: number, ch = 0.0004): V2[] {
  const c = Math.min(ch, (ro - ri) / 3, (z1 - z0) / 3);
  return [
    [ri, z0 + c], [ri + c, z0], [ro - c, z0], [ro, z0 + c], [ro, z1 - c], [ro - c, z1], [ri + c, z1], [ri, z1 - c], [ri, z0 + c],
  ];
}

/** Hollow tube along Z. */
export function tubeZ(ro: number, ri: number, z0: number, z1: number, seg = 32, ch = 0.0004): THREE.BufferGeometry {
  return latheZ(ringProfile(ri, ro, z0, z1, ch), seg, 35);
}

/** Solid cylinder along Z with chamfered ends. */
export function cylZ(r: number, z0: number, z1: number, seg = 24, ch = 0.0004): THREE.BufferGeometry {
  const c = Math.min(ch, r / 2, (z1 - z0) / 3);
  return latheZ([[0, z0], [r - c, z0], [r, z0 + c], [r, z1 - c], [r - c, z1], [0, z1]], seg, 35);
}

/** Solid cylinder along X centred at (x0..x1) with chamfers. */
export function cylX(r: number, x0: number, x1: number, seg = 16, ch = 0.0003): THREE.BufferGeometry {
  const c = Math.min(ch, r / 2, (x1 - x0) / 3);
  return latheX([[0, x0], [r - c, x0], [r, x0 + c], [r, x1 - c], [r - c, x1], [0, x1]], seg, 35);
}

/** Side-view outline [z, y] extruded along X by t, centred at x. */
export function sidePlate(outline: V2[], t: number, x = 0, bevel = 0.0004, corner = 0): THREE.BufferGeometry {
  const g = G.plate(outline, t, 'zy', bevel, corner);
  if (x) g.translate(x, 0, 0);
  return g;
}

/** Top-view outline [x, z] extruded along Y by t, centred at y. */
export function topPlate(outline: V2[], t: number, y = 0, bevel = 0.0004, corner = 0): THREE.BufferGeometry {
  const g = G.plate(outline, t, 'xz', bevel, corner);
  if (y) g.translate(0, y, 0);
  return g;
}

/** Front-view outline [x, y] extruded along Z by depth, centred at z. */
export function frontPlate(outline: V2[], depth: number, z = 0, bevel = 0.0004, corner = 0): THREE.BufferGeometry {
  const g = G.extrude(G.shape(outline, corner), depth, bevel);
  if (z) g.translate(0, 0, z);
  return g;
}

/** Rotate a geometry so its +Y points along n (then spin about n) and move it to p. */
export function orient(g: THREE.BufferGeometry, p: THREE.Vector3 | V3, n: THREE.Vector3 | V3 = [0, 1, 0], spin = 0): THREE.BufferGeometry {
  const P = Array.isArray(p) ? v3(...p) : p;
  const N = (Array.isArray(n) ? v3(...n) : n.clone()).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), N);
  if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(v3(0, 1, 0), spin));
  g.applyQuaternion(q);
  g.translate(P.x, P.y, P.z);
  return g;
}

/** Rounded rectangle outline (CCW) centred at (cx, cy). */
export function rrectPts(w: number, h: number, r: number, cx = 0, cy = 0, seg = 4): V2[] {
  const rr = Math.min(r, w / 2 - 1e-6, h / 2 - 1e-6);
  const pts: V2[] = [];
  const corners: [number, number, number][] = [
    [cx + w / 2 - rr, cy - h / 2 + rr, -90],
    [cx + w / 2 - rr, cy + h / 2 - rr, 0],
    [cx - w / 2 + rr, cy + h / 2 - rr, 90],
    [cx - w / 2 + rr, cy - h / 2 + rr, 180],
  ];
  for (const [x, y, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = (a0 + (90 * i) / seg) * D2R;
      pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]);
    }
  }
  return pts;
}

/** Slotted screw head along +Y (base at y = 0): domed head + dark slot insert. */
export function screwHead(r: number, h: number, slotW = r * 0.28): { head: THREE.BufferGeometry; slot: THREE.BufferGeometry } {
  const head = G.lathe([[0, 0], [r, 0], [r, h * 0.35], [r * 0.82, h * 0.8], [r * 0.45, h], [0, h * 1.02]], 16, 50);
  const slot = G.box(r * 1.9, h * 0.55, slotW);
  slot.translate(0, h * 0.78, 0);
  return { head, slot };
}

// ------------------------------------------------------------------------------------------------
// Perforated tube: a sheet-metal tube (outer radius R, wall t) with real-depth holes.

export interface PerfHole {
  /** Centre angle (rad, from +X towards +Y) and centre z (m). */
  phi: number;
  z: number;
  /** Signed distance in the unrolled outer surface (s = arc length along +phi, z), centred on the hole (m). */
  sdf: (s: number, z: number) => number;
}

export const holeStadium = (w: number, h: number) => {
  const r = w / 2, hl = Math.max(0, h / 2 - r);
  return (s: number, z: number) => Math.hypot(s, Math.max(0, Math.abs(z) - hl)) - r;
};
export const holeCircle = (d: number) => (s: number, z: number) => Math.hypot(s, z) - d / 2;
export const holeRRect = (w: number, h: number, r: number) => (s: number, z: number) => {
  const qx = Math.abs(s) - w / 2 + r, qz = Math.abs(z) - h / 2 + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
};

export interface PerfTubeOpts {
  R: number;
  t: number;
  /** Column breakpoints (rad), increasing. A full tube spans exactly 2 PI. */
  phis: number[];
  /** Per-column z breakpoints (m), increasing (one array per column, or one shared array). */
  rows: number[][] | number[];
  /** Lattice spacing (m) for vertical tile edges and its origin; every breakpoint is snapped to it. */
  dz: number;
  z0?: number;
  /** Samples per tile edge along phi (default 4). */
  nPhi?: number;
  holes?: PerfHole[];
  caps?: boolean;
  /** Radius of the inner surface is R - t; set false to skip it (only for tubes never seen from inside). */
  inner?: boolean;
}

/**
 * Conforming tile mesher: the tube is divided into (phi, z) tiles; a tile holds at most one hole
 * and is meshed as an annulus between its boundary (sampled identically on shared edges) and the
 * hole outline, so the outer surface, the inner surface and the radial hole walls join without cracks.
 */
export function perfTube(o: PerfTubeOpts): THREE.BufferGeometry {
  const R = o.R, Ri = o.R - o.t, nPhi = o.nPhi ?? 4;
  const z0 = o.z0 ?? 0, dz = o.dz;
  const TWO_PI = Math.PI * 2;
  const phis = o.phis;
  const nCol = phis.length - 1;
  const closed = Math.abs(phis[nCol] - phis[0] - TWO_PI) < 1e-6;
  const snap = (z: number) => z0 + Math.round((z - z0) / dz) * dz;
  const rowsOf = (j: number): number[] => {
    const r = o.rows as (number[] | number)[];
    const arr = (Array.isArray(r[0]) ? (r as number[][])[j] : (r as number[])).map(snap);
    return arr;
  };
  const lat = (za: number, zb: number) => {
    const k0 = Math.round((za - z0) / dz), k1 = Math.round((zb - z0) / dz);
    const out: number[] = [];
    for (let k = k0; k <= k1; k++) out.push(z0 + k * dz);
    return out;
  };
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const addV = (x: number, y: number, z: number, n: THREE.Vector3) => {
    pos.push(x, y, z);
    nor.push(n.x, n.y, n.z);
    return pos.length / 3 - 1;
  };
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), fn = new THREE.Vector3(), ns = new THREE.Vector3();
  const tri = (a: number, b: number, c: number) => {
    ab.set(pos[b * 3] - pos[a * 3], pos[b * 3 + 1] - pos[a * 3 + 1], pos[b * 3 + 2] - pos[a * 3 + 2]);
    ac.set(pos[c * 3] - pos[a * 3], pos[c * 3 + 1] - pos[a * 3 + 1], pos[c * 3 + 2] - pos[a * 3 + 2]);
    fn.crossVectors(ab, ac);
    ns.set(nor[a * 3] + nor[b * 3] + nor[c * 3], nor[a * 3 + 1] + nor[b * 3 + 1] + nor[c * 3 + 1], nor[a * 3 + 2] + nor[b * 3 + 2] + nor[c * 3 + 2]);
    if (fn.dot(ns) >= 0) idx.push(a, b, c);
    else idx.push(a, c, b);
  };
  const quad = (a: number, b: number, c: number, d: number) => {
    tri(a, b, c);
    tri(a, c, d);
  };
  const radial = (phi: number, s: number) => new THREE.Vector3(Math.cos(phi) * s, Math.sin(phi) * s, 0);
  const surfV = (phi: number, z: number, outer: boolean) => {
    const r = outer ? R : Ri;
    return addV(r * Math.cos(phi), r * Math.sin(phi), z, radial(phi, outer ? 1 : -1));
  };
  const norm = (a: number, ref: number) => {
    let d = a - ref;
    while (d > Math.PI) d -= TWO_PI;
    while (d < -Math.PI) d += TWO_PI;
    return d;
  };
  const holes = o.holes ?? [];
  const surfaces = o.inner === false ? [true] : [true, false];

  for (let j = 0; j < nCol; j++) {
    const pA = phis[j], pB = phis[j + 1];
    const rows = rowsOf(j);
    for (let i = 0; i < rows.length - 1; i++) {
      const za = rows[i], zb = rows[i + 1];
      const L = lat(za, zb);
      const pc = (pA + pB) / 2;
      const hole = holes.find((h) => {
        const d = norm(h.phi, pc);
        return Math.abs(d) < (pB - pA) / 2 && h.z > za && h.z < zb;
      });
      if (!hole) {
        // solid tile: structured grid
        for (const outer of surfaces) {
          const grid: number[][] = [];
          for (let a = 0; a <= nPhi; a++) {
            const phi = pA + ((pB - pA) * a) / nPhi;
            grid.push(L.map((z) => surfV(phi, z, outer)));
          }
          for (let a = 0; a < nPhi; a++) for (let b = 0; b < L.length - 1; b++) quad(grid[a][b], grid[a + 1][b], grid[a + 1][b + 1], grid[a][b + 1]);
        }
        continue;
      }
      // boundary ring (CCW in phi/z)
      const ring: [number, number][] = [];
      for (let a = 0; a < nPhi; a++) ring.push([pA + ((pB - pA) * a) / nPhi, za]);
      for (let b = 0; b < L.length - 1; b++) ring.push([pB, L[b]]);
      for (let a = 0; a < nPhi; a++) ring.push([pB - ((pB - pA) * a) / nPhi, zb]);
      for (let b = L.length - 1; b > 0; b--) ring.push([pA, L[b]]);
      const hphi = pc + norm(hole.phi, pc);
      // hole outline by bisection along the spokes
      const outline = ring.map(([phi, z]) => {
        const ds = (phi - hphi) * R, dzz = z - hole.z;
        const len = Math.hypot(ds, dzz);
        const us = ds / len, uz = dzz / len;
        let lo = 0, hi = len;
        for (let it = 0; it < 30; it++) {
          const m = (lo + hi) / 2;
          if (hole.sdf(us * m, uz * m) < 0) lo = m;
          else hi = m;
        }
        const rho = (lo + hi) / 2;
        const s = us * rho, zz = uz * rho;
        const e = 1e-5;
        const gs = hole.sdf(s + e, zz) - hole.sdf(s - e, zz), gz = hole.sdf(s, zz + e) - hole.sdf(s, zz - e);
        const gl = Math.hypot(gs, gz) || 1;
        return { phi: hphi + s / R, z: hole.z + zz, gs: gs / gl, gz: gz / gl };
      });
      const n = ring.length;
      for (const outer of surfaces) {
        const bv = ring.map(([phi, z]) => surfV(phi, z, outer));
        const hv = outline.map((h) => surfV(h.phi, h.z, outer));
        for (let k = 0; k < n; k++) quad(bv[k], bv[(k + 1) % n], hv[(k + 1) % n], hv[k]);
      }
      // wall (faces into the hole)
      const wall = (h: (typeof outline)[number], r: number) => {
        const ePhi = new THREE.Vector3(-Math.sin(h.phi), Math.cos(h.phi), 0);
        const nn = ePhi.multiplyScalar(-h.gs).add(new THREE.Vector3(0, 0, -h.gz)).normalize();
        return addV(r * Math.cos(h.phi), r * Math.sin(h.phi), h.z, nn);
      };
      const wo = outline.map((h) => wall(h, R));
      const wi = outline.map((h) => wall(h, o.inner === false ? R - o.t : Ri));
      for (let k = 0; k < n; k++) quad(wo[k], wo[(k + 1) % n], wi[(k + 1) % n], wi[k]);
    }
    // end caps of this column
    if (o.caps !== false) {
      for (const [z, sgn] of [[rows[0], -1], [rows[rows.length - 1], 1]] as [number, number][]) {
        const nz = new THREE.Vector3(0, 0, sgn);
        const outerV: number[] = [], innerV: number[] = [];
        for (let a = 0; a <= nPhi; a++) {
          const phi = pA + ((pB - pA) * a) / nPhi;
          outerV.push(addV(R * Math.cos(phi), R * Math.sin(phi), z, nz));
          innerV.push(addV(Ri * Math.cos(phi), Ri * Math.sin(phi), z, nz));
        }
        for (let a = 0; a < nPhi; a++) quad(outerV[a], outerV[a + 1], innerV[a + 1], innerV[a]);
      }
    }
  }
  // side caps of an open sector
  if (!closed) {
    for (const [j, phi, sgn] of [[0, phis[0], -1], [nCol - 1, phis[nCol], 1]] as [number, number, number][]) {
      const rows = rowsOf(j);
      const L = lat(rows[0], rows[rows.length - 1]);
      const nn = new THREE.Vector3(-Math.sin(phi) * sgn, Math.cos(phi) * sgn, 0);
      const ov = L.map((z) => addV(R * Math.cos(phi), R * Math.sin(phi), z, nn));
      const iv = L.map((z) => addV(Ri * Math.cos(phi), Ri * Math.sin(phi), z, nn));
      for (let b = 0; b < L.length - 1; b++) quad(ov[b], ov[b + 1], iv[b + 1], iv[b]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return mergeVertices(g, 1e-7);
}

/** Evenly spaced breakpoints from a to b (inclusive) with n intervals. */
export function spaced(a: number, b: number, n: number): number[] {
  return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
}

// ------------------------------------------------------------------------------------------------
// Misc

/** Monotone piecewise-linear lookup through [x, y] points (clamped). */
export function lerpTable(pts: V2[]): (x: number) => number {
  return (x: number) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        const t = (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
        return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
      }
    }
    return pts[pts.length - 1][1];
  };
}

/** Loft sections given as [x, y] rings (metres) at z stations. */
export function loftRings(stations: { z: number; ring: V2[] }[], caps = true, creaseDeg = 60): THREE.BufferGeometry {
  return G.loftZ(stations.map((s) => ({ z: s.z, ring: s.ring })), caps, creaseDeg);
}

/**
 * Closed super-ellipse-ish section ring with independent top/bottom half heights and half widths,
 * n points starting at the top centre and running towards -X (consistent point order for lofts).
 */
export function sectionRing(n: number, hwTop: number, hwBot: number, yTop: number, yBot: number, eTop = 2.6, eBot = 2.6, yMid?: number): V2[] {
  const ym = yMid ?? (yTop + yBot) / 2;
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.PI / 2 + (i / n) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const up = s >= 0;
    const e = up ? eTop : eBot;
    const cx = Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
    const sy = Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
    const hw = up ? hwTop : hwBot;
    const y = up ? ym + sy * (yTop - ym) : ym + sy * (ym - yBot);
    pts.push([cx * hw, y]);
  }
  return pts;
}
