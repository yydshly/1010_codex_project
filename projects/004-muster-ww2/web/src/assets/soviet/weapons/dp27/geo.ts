/**
 * DP-27 geometry helpers (owned by the DP-27 asset; free for reuse by reading, not a shared API).
 *
 *  - perforatedTube(): a thin-walled cylinder with real stadium-shaped slots, built from a 2D
 *    triangulation that is conformingly refined (no T-junctions) and wrapped onto the cylinder,
 *    so the wall stays truly round and the slot walls are real geometry.
 *  - latheZ(): lathe around the +Z (bore) axis from an [r, z] profile.
 *  - slottedScrew(): slotted screw head (two D-shaped halves) with its axis along +Y.
 *  - smooth 1D interpolation for profile curves.
 */
import { THREE, G } from '../../../../core/kit';
import { TessellateModifier } from 'three/addons/modifiers/TessellateModifier.js';

export type P2 = [number, number];

/** Catmull-Rom style interpolation through sorted [x, y] keys (clamped at the ends). */
export function curve(keys: P2[]): (x: number) => number {
  const n = keys.length;
  return (x: number) => {
    if (x <= keys[0][0]) return keys[0][1];
    if (x >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0;
    while (i < n - 2 && x > keys[i + 1][0]) i++;
    const [x0, y0] = keys[i], [x1, y1] = keys[i + 1];
    const t = (x - x0) / (x1 - x0);
    const ym = i > 0 ? keys[i - 1] : keys[i];
    const yp = i + 2 < n ? keys[i + 2] : keys[i + 1];
    // tangents (finite differences, scaled to the local interval), monotone-limited
    let m0 = i > 0 ? ((y1 - ym[1]) / (x1 - ym[0])) * (x1 - x0) : y1 - y0;
    let m1 = i + 2 < n ? ((yp[1] - y0) / (yp[0] - x0)) * (x1 - x0) : y1 - y0;
    const d = y1 - y0;
    if (d === 0 || Math.sign(m0) !== Math.sign(d)) m0 = Math.sign(m0) === Math.sign(d) ? m0 : 0;
    if (d === 0 || Math.sign(m1) !== Math.sign(d)) m1 = Math.sign(m1) === Math.sign(d) ? m1 : 0;
    if (d !== 0) {
      m0 = Math.min(Math.abs(m0), 3 * Math.abs(d)) * Math.sign(d);
      m1 = Math.min(Math.abs(m1), 3 * Math.abs(d)) * Math.sign(d);
    }
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
  };
}

/** Lathe around +Z from [r, z] points. Trace the solid's section counter-clockwise (solid on the left). */
export function latheZ(profile: P2[], seg = 40, creaseDeg = 40): THREE.BufferGeometry {
  const g = G.lathe(profile.map(([r, z]) => [r, z] as P2), seg, creaseDeg);
  g.rotateX(Math.PI / 2);
  return g;
}

/**
 * Rounded-rectangle section ring (CCW seen from +Z) with separate top/bottom corner radii and
 * extra points along the flat sides, so lofted flats carry interior vertices (baked edge wear stays
 * on the rounded corners instead of smearing across the faces). Always returns the same point count.
 */
export function rectRing(hw: number, yTop: number, yBot: number, rTop: number, rBot: number, nArc = 4, nFlat = 3): P2[] {
  const h = yTop - yBot;
  const rt = Math.max(1e-5, Math.min(rTop, hw * 0.98, h * 0.49));
  const rb = Math.max(1e-5, Math.min(rBot, hw * 0.98, h * 0.49));
  const pts: P2[] = [];
  const arc = (cx: number, cy: number, r: number, a0: number) => {
    for (let i = 0; i <= nArc; i++) {
      const a = a0 + (i / nArc) * (Math.PI / 2);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  const flat = (x0: number, y0: number, x1: number, y1: number) => {
    for (let i = 1; i <= nFlat; i++) {
      const t = i / (nFlat + 1);
      pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  };
  arc(hw - rb, yBot + rb, rb, -Math.PI / 2); // bottom-right corner (x>0 = +X)
  flat(hw, yBot + rb, hw, yTop - rt);
  arc(hw - rt, yTop - rt, rt, 0);
  flat(hw - rt, yTop, -hw + rt, yTop);
  arc(-hw + rt, yTop - rt, rt, Math.PI / 2);
  flat(-hw, yTop - rt, -hw, yBot + rb);
  arc(-hw + rb, yBot + rb, rb, Math.PI);
  flat(-hw + rb, yBot, hw - rb, yBot);
  return pts;
}

/** Stadium (slot) outline centred at (cu, cv): straight sides along v, rounded ends. CCW. */
export function stadium(cu: number, cv: number, width: number, length: number, arcSeg = 7): P2[] {
  const r = width / 2;
  const half = Math.max(0, length / 2 - r);
  const pts: P2[] = [];
  for (let i = 0; i <= arcSeg; i++) {
    const a = Math.PI + (i / arcSeg) * Math.PI; // bottom cap: pi..2pi
    pts.push([cu + r * Math.cos(a), cv - half + r * Math.sin(a)]);
  }
  for (let i = 0; i <= arcSeg; i++) {
    const a = (i / arcSeg) * Math.PI; // top cap: 0..pi
    pts.push([cu + r * Math.cos(a), cv + half + r * Math.sin(a)]);
  }
  return pts;
}

const signedArea = (pts: P2[]) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
};

/**
 * Thin-walled tube along +Z (axis at x = y = 0) with holes cut through its wall.
 * Holes are outlines in unrolled coordinates (u, z) where u = theta * rMid and theta is measured
 * from the BOTTOM (-Y) towards +X (the weapon's left): theta = pi is the top.
 * du = maximum arc length of a triangle edge around the tube (controls roundness).
 */
function sliceTris(verts: number[], tris: number[], axis: 0 | 1, step: number, origin: number): number[] {
  const other = 1 - axis;
  const ekey = (a: number, b: number) => (a < b ? a * 1048576 + b : b * 1048576 + a);
  const cross = new Map<string, number>();
  const eps = 1e-9;
  const co = (p: number) => verts[p * 2 + axis] - origin;
  const edgePoints = (a: number, b: number): number[] => {
    const ua = co(a), ub = co(b);
    const lo = Math.min(ua, ub), hi = Math.max(ua, ub);
    const kmin = Math.floor(lo / step + 1e-6) + 1, kmax = Math.ceil(hi / step - 1e-6) - 1;
    const pts: number[] = [];
    for (let k = kmin; k <= kmax; k++) {
      const uk = k * step;
      if (uk <= lo + eps || uk >= hi - eps) continue;
      const key = ekey(a, b) + '|' + k;
      let id = cross.get(key);
      if (id === undefined) {
        const t = (uk - ua) / (ub - ua);
        id = verts.length / 2;
        const o = verts[a * 2 + other] + t * (verts[b * 2 + other] - verts[a * 2 + other]);
        if (axis === 0) verts.push(uk + origin, o);
        else verts.push(o, uk + origin);
        cross.set(key, id);
      }
      pts.push(id);
    }
    const sg = Math.sign(ub - ua);
    pts.sort((p, q) => (co(p) - ua) * sg - (co(q) - ua) * sg);
    return pts;
  };
  const out: number[] = [];
  for (let i = 0; i < tris.length; i += 3) {
    const tri = [tris[i], tris[i + 1], tris[i + 2]];
    const poly: number[] = [];
    for (let e = 0; e < 3; e++) {
      poly.push(tri[e]);
      poly.push(...edgePoints(tri[e], tri[(e + 1) % 3]));
    }
    if (poly.length === 3) {
      out.push(...tri);
      continue;
    }
    const us = poly.map(co);
    const umin = Math.min(...us), umax = Math.max(...us);
    const k0 = Math.floor(umin / step + 1e-6), k1 = Math.ceil(umax / step - 1e-6);
    for (let k = k0; k < k1; k++) {
      const uL = k * step - eps, uR = (k + 1) * step + eps;
      const piece = poly.filter((p) => co(p) >= uL && co(p) <= uR);
      if (piece.length < 3) continue;
      for (let j = 1; j + 1 < piece.length; j++) {
        const a = piece[0], b = piece[j], c = piece[j + 1];
        const ar = (verts[b * 2] - verts[a * 2]) * (verts[c * 2 + 1] - verts[a * 2 + 1]) - (verts[c * 2] - verts[a * 2]) * (verts[b * 2 + 1] - verts[a * 2 + 1]);
        if (Math.abs(ar) > 1e-16) out.push(a, b, c);
      }
    }
  }
  return out;
}

/**
 * Split large flat faces into small ones (edges <= maxEdge). Every new vertex lies on an original
 * planar triangle, so T-junctions cannot open cracks; it keeps baked edge wear/cavity values from
 * being smeared across big caps (ExtrudeGeometry caps, shape faces).
 */
export function densify(g: THREE.BufferGeometry, maxEdge: number): THREE.BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g;
  const out = new TessellateModifier(maxEdge, 10).modify(src);
  out.deleteAttribute('uv');
  return out;
}

export function perforatedTube(rMid: number, t: number, z0: number, z1: number, holes: P2[][], du = 0.0022, dv = 0.006): { outer: THREE.BufferGeometry; inner: THREE.BufferGeometry } {
  const C = 2 * Math.PI * rMid;
  // contour, pre-split along u so the end rings are round
  const nU = Math.max(8, Math.ceil(C / du));
  const contour: P2[] = [];
  for (let i = 0; i < nU; i++) contour.push([(i / nU) * C, z0]);
  contour.push([C, z0]);
  contour.push([C, z1]);
  for (let i = nU - 1; i >= 1; i--) contour.push([(i / nU) * C, z1]);
  contour.push([0, z1]);
  // THREE's triangulator wants CCW contour & CW holes (it fixes them internally for ExtrudeGeometry only)
  const cont = signedArea(contour) < 0 ? [...contour].reverse() : contour;
  const hs = holes.map((h) => (signedArea(h) > 0 ? [...h].reverse() : h));
  const faces = THREE.ShapeUtils.triangulateShape(
    cont.map(([u, v]) => new THREE.Vector2(u, v)),
    hs.map((h) => h.map(([u, v]) => new THREE.Vector2(u, v))),
  );
  const verts: number[] = [];
  for (const [u, v] of cont) verts.push(u, v);
  for (const h of hs) for (const [u, v] of h) verts.push(u, v);
  let tris: number[] = [];
  for (const f of faces) {
    const [a, b, c] = f;
    const ar = (verts[b * 2] - verts[a * 2]) * (verts[c * 2 + 1] - verts[a * 2 + 1]) - (verts[c * 2] - verts[a * 2]) * (verts[b * 2 + 1] - verts[a * 2 + 1]);
    if (Math.abs(ar) < 1e-14) continue;
    if (ar > 0) tris.push(a, b, c);
    else tris.push(a, c, b);
  }
  // conforming refinement: slice every triangle by the lines u = k * C / nU, then by v = z0 + k * dv.
  // Crossing points on an edge are shared by both triangles using it (keyed by edge + line), so there
  // are no T-junctions; the small cells also keep baked edge wear local to the real slot rims.
  tris = sliceTris(verts, tris, 0, C / nU, 0);
  tris = sliceTris(verts, tris, 1, dv, z0);
  const nv = verts.length / 2;
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [], idxIn: number[] = [];
  const ro = rMid + t / 2, ri = rMid - t / 2;
  const put = (u: number, v: number, r: number, sgn: number) => {
    const th = u / rMid;
    const s = Math.sin(th), c = -Math.cos(th);
    pos.push(r * s, r * c, v);
    nrm.push(sgn * s, sgn * c, 0);
  };
  for (let i = 0; i < nv; i++) put(verts[i * 2], verts[i * 2 + 1], ro, 1);
  for (let i = 0; i < nv; i++) put(verts[i * 2], verts[i * 2 + 1], ri, -1);
  for (let i = 0; i < tris.length; i += 3) {
    idx.push(tris[i], tris[i + 1], tris[i + 2]);
    idxIn.push(nv + tris[i], nv + tris[i + 2], nv + tris[i + 1]);
  }
  // walls on boundary edges (hole rims and tube ends), skipping the u = 0 / u = C seam
  const count = new Map<number, number>();
  const ekey = (a: number, b: number) => (a < b ? a * 1048576 + b : b * 1048576 + a);
  for (let i = 0; i < tris.length; i += 3)
    for (let e = 0; e < 3; e++) {
      const k = ekey(tris[i + e], tris[i + ((e + 1) % 3)]);
      count.set(k, (count.get(k) ?? 0) + 1);
    }
  const eps = 1e-7;
  for (let i = 0; i < tris.length; i += 3)
    for (let e = 0; e < 3; e++) {
      const a = tris[i + e], b = tris[i + ((e + 1) % 3)];
      if (count.get(ekey(a, b)) !== 1) continue;
      const ua = verts[a * 2], ub = verts[b * 2];
      if ((Math.abs(ua) < eps && Math.abs(ub) < eps) || (Math.abs(ua - C) < eps && Math.abs(ub - C) < eps)) continue;
      const base = pos.length / 3;
      const pa = [a, b];
      const quad: number[][] = [];
      for (const [vi, r] of [[pa[0], ro], [pa[1], ro], [pa[1], ri], [pa[0], ri]] as [number, number][]) {
        const th = verts[vi * 2] / rMid;
        quad.push([r * Math.sin(th), -r * Math.cos(th), verts[vi * 2 + 1]]);
      }
      // outward direction of the wall: to the right of a->b in (u, v) (interior is on the left of a CCW triangle)
      const du2 = ub - ua, dv2 = verts[b * 2 + 1] - verts[a * 2 + 1];
      const mu = (ua + ub) / 2, thm = mu / rMid;
      const tang = [Math.cos(thm), Math.sin(thm), 0];
      const outDir = [tang[0] * dv2, tang[1] * dv2, -du2];
      const e1 = [quad[1][0] - quad[0][0], quad[1][1] - quad[0][1], quad[1][2] - quad[0][2]];
      const e2 = [quad[3][0] - quad[0][0], quad[3][1] - quad[0][1], quad[3][2] - quad[0][2]];
      const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
      const flip = n[0] * outDir[0] + n[1] * outDir[1] + n[2] * outDir[2] < 0;
      const ln = Math.hypot(outDir[0], outDir[1], outDir[2]) || 1;
      for (const q of quad) {
        pos.push(q[0], q[1], q[2]);
        nrm.push(outDir[0] / ln, outDir[1] / ln, outDir[2] / ln);
      }
      if (!flip) idx.push(base, base + 1, base + 3, base + 1, base + 2, base + 3);
      else idx.push(base, base + 3, base + 1, base + 1, base + 3, base + 2);
    }
  const mk = (ix: number[]) => {
    // compact to the used vertices
    const remap = new Map<number, number>();
    const P: number[] = [], Nn: number[] = [], I: number[] = [];
    for (const v of ix) {
      let r = remap.get(v);
      if (r === undefined) {
        r = P.length / 3;
        remap.set(v, r);
        P.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
        Nn.push(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]);
      }
      I.push(r);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
    g.setIndex(I);
    return g;
  };
  return { outer: mk(idx), inner: mk(idxIn) };
}

/** Slotted screw head, axis +Y, base at y = 0. */
export function slottedScrew(r: number, h: number, slot = r * 0.28, seg = 6): THREE.BufferGeometry {
  const half = (sign: number): P2[] => {
    const x0 = slot / 2;
    const a0 = Math.acos(Math.min(0.999, x0 / r));
    const pts: P2[] = [];
    for (let i = 0; i <= seg; i++) {
      const a = -a0 + (i / seg) * 2 * a0;
      pts.push([sign * r * Math.cos(a), r * Math.sin(a) * sign]);
    }
    return pts;
  };
  const b = Math.min(h * 0.45, r * 0.35);
  const mk = (sgn: number) => {
    const s = G.shape(half(sgn));
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-5, h - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b * 0.9, bevelOffset: -b * 0.9, bevelSegments: 1, curveSegments: 2 });
    return g;
  };
  const g = G.mergeGeometries([mk(1).toNonIndexed(), mk(-1).toNonIndexed()])!;
  // extrude along +Z from 0..h (plus bevels); rotate so +Z -> +Y
  g.rotateX(-Math.PI / 2);
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox!.min.y, 0);
  return G.crease(g, 35);
}

/** Orthonormal frame helper: rotation that maps +Y to `dir`. */
export function alignY(dir: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
}
