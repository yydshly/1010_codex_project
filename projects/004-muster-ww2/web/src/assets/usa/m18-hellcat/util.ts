/** Small modelling helpers for the M18 (kept local to this asset; adapted from the M4A3 helpers). */
import { THREE, G, group } from '../../../core/kit';

export type P2 = [number, number];
export type P3 = [number, number, number];
const V = (p: P3) => new THREE.Vector3(p[0], p[1], p[2]);
export const D = Math.PI / 180;

/**
 * Planar slab: `outer` is the OUTER face polygon (3D, coplanar), `outward` its outward normal.
 * Extruded inward by `t` with a bevel on its edges.
 */
export function slab(outer: P3[], t: number, outward: P3, bevel = 0.005, corner = 0): THREE.BufferGeometry {
  const n = V(outward).normalize();
  const o = V(outer[0]);
  const e = V(outer[1]).sub(o);
  const u = e.sub(n.clone().multiplyScalar(e.dot(n))).normalize();
  const v = new THREE.Vector3().crossVectors(n, u);
  let pts: G.V2[] = outer.map((p) => {
    const d = V(p).sub(o);
    return [d.dot(u), d.dot(v)];
  });
  if (THREE.ShapeUtils.isClockWise(pts.map(([x, y]) => new THREE.Vector2(x, y)))) pts = pts.reverse();
  const g = G.extrude(G.shape(pts, corner), t, bevel, 6, 1);
  g.translate(0, 0, -t / 2);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, n).setPosition(o));
  return g;
}

/** Local frame on a surface: origin o, in-plane axis u, outward normal n (+Y along n, +X along u). */
export function surfaceFrame(o: P3, u: P3, n: P3): THREE.Matrix4 {
  const N = V(n).normalize();
  const U = V(u).sub(N.clone().multiplyScalar(V(u).dot(N))).normalize();
  const W = new THREE.Vector3().crossVectors(U, N);
  return new THREE.Matrix4().makeBasis(U, N, W).setPosition(V(o));
}

/** Wrap objects in a group placed on a surface frame. */
export function onSurface(objs: THREE.Object3D[], o: P3, u: P3, n: P3): THREE.Group {
  const g = group(objs);
  surfaceFrame(o, u, n).decompose(g.position, g.quaternion, g.scale);
  return g;
}

/** Convex polygon with rounded corners, sampled with a FIXED number of points. CCW. */
export function roundedRing(corners: P2[], radii: number[], perCorner = 5, perEdge = 2): P2[] {
  const n = corners.length;
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = corners[(i - 1 + n) % n], b = corners[i], c = corners[(i + 1) % n];
    const ab = [b[0] - a[0], b[1] - a[1]], bc = [c[0] - b[0], c[1] - b[1]];
    const lab = Math.hypot(ab[0], ab[1]) || 1e-6, lbc = Math.hypot(bc[0], bc[1]) || 1e-6;
    const r = Math.min(radii[i], lab * 0.45, lbc * 0.45);
    const p1: P2 = [b[0] - (ab[0] / lab) * r, b[1] - (ab[1] / lab) * r];
    const p2: P2 = [b[0] + (bc[0] / lbc) * r, b[1] + (bc[1] / lbc) * r];
    for (let k = 0; k < perCorner; k++) {
      const t = perCorner === 1 ? 0.5 : k / (perCorner - 1);
      out.push([
        (1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * b[0] + t * t * p2[0],
        (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * b[1] + t * t * p2[1],
      ]);
    }
    const nx = corners[(i + 1) % n], nn = corners[(i + 2) % n];
    const e1 = [nx[0] - b[0], nx[1] - b[1]];
    const le = Math.hypot(e1[0], e1[1]) || 1e-6;
    const rNext = Math.min(radii[(i + 1) % n], le * 0.45, Math.hypot(nn[0] - nx[0], nn[1] - nx[1]) * 0.45);
    const q2: P2 = [nx[0] - (e1[0] / le) * rNext, nx[1] - (e1[1] / le) * rNext];
    for (let k = 1; k <= perEdge; k++) {
      const t = k / (perEdge + 1);
      out.push([p2[0] + (q2[0] - p2[0]) * t, p2[1] + (q2[1] - p2[1]) * t]);
    }
  }
  return out;
}

/** Rounded box with a single rounding segment. */
export function rb(w: number, h: number, d: number, r = 0.006): THREE.BufferGeometry {
  return G.rbox(w, h, d, r, 1);
}

/** Lathe profile [r, axial] around +Y turned so the axis is +X. */
export function latheX(profile: P2[], seg = 36, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Lathe profile [r, axial] around +Z (axial + -> +Z). */
export function latheZ(profile: P2[], seg = 32, crease = 40): THREE.BufferGeometry {
  const g = G.lathe(profile, seg, crease);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Bolt ring placements around the X axis at axial position x. */
export function boltRingX(r: number, n: number, x: number, dir: 1 | -1 = 1, phase = 0): { p: THREE.Vector3; n: THREE.Vector3 }[] {
  const out: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    out.push({ p: new THREE.Vector3(x, Math.sin(a) * r, Math.cos(a) * r), n: new THREE.Vector3(dir, 0, 0) });
  }
  return out;
}

let nutGeo: THREE.BufferGeometry | null = null;
/** Plain hex nut / bolt head, +Y up, base at y = 0. */
export function nut(size = 0.02, height = 0.009): THREE.BufferGeometry {
  if (!nutGeo) {
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1);
    g.translate(0, 0.5, 0);
    nutGeo = G.crease(g, 30);
  }
  const g = nutGeo.clone();
  g.scale(size, height, size);
  return g;
}

/** Convex outline (CCW) around several circles (cast levers, brackets, arms). */
export function hullOutline(circles: { c: P2; r: number }[], seg = 10): P2[] {
  const pts: P2[] = [];
  for (const k of circles)
    for (let i = 0; i < seg * 2; i++) {
      const a = (i / (seg * 2)) * Math.PI * 2;
      pts.push([k.c[0] + Math.cos(a) * k.r, k.c[1] + Math.sin(a) * k.r]);
    }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P2[] = [], upper: P2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Circle points; clockwise when cw (for extrude holes). */
export function circlePts(r: number, n: number, cx = 0, cy = 0, cw = false): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((cw ? -i : i) / n) * Math.PI * 2;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
}

/** Merge geometries (indexed or not). */
export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return G.mergeGeometries(list.map((p) => (p.index ? p.toNonIndexed() : p)))!;
}

/** Bent-bar handle (U shape) standing on y = 0, span along X. */
export function uHandle(span: number, h: number, r = 0.008, seg = 6): THREE.BufferGeometry {
  const a = span / 2;
  return G.tube(
    [
      [-a, -0.004, 0],
      [-a, h * 0.7, 0],
      [-a + 0.02, h, 0],
      [a - 0.02, h, 0],
      [a, h * 0.7, 0],
      [a, -0.004, 0],
    ],
    r,
    seg,
    40,
  );
}

/** Pipe/rod through points with small fillets at the bends. */
export function bentRod(points: P3[], r: number, fillet = 0.02, seg = 8): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const P = points.map(V);
  for (let i = 0; i < P.length; i++) {
    if (i === 0 || i === P.length - 1) {
      pts.push(P[i]);
      continue;
    }
    const a = P[i - 1], b = P[i], c = P[i + 1];
    const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
    const f1 = Math.min(fillet, d1.length() * 0.45), f2 = Math.min(fillet, d2.length() * 0.45);
    pts.push(b.clone().addScaledVector(d1.normalize(), -f1));
    pts.push(b.clone().addScaledVector(d1, -f1 * 0.3).addScaledVector(d2.clone().normalize(), f2 * 0.3));
    pts.push(b.clone().addScaledVector(d2.normalize(), f2));
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  return new THREE.TubeGeometry(curve, Math.max(12, pts.length * 6), r, seg, false);
}

/**
 * Light prism (single bevel segment): outline in 2D, thickness t, plane 'xy' (thickness along Z),
 * 'zy' (outline x -> Z, thickness along X) or 'xz' (outline y -> Z, thickness along Y). Centred.
 */
export function prism(outline: P2[], t: number, plane: 'xy' | 'zy' | 'xz' = 'zy', bevel = 0.003): THREE.BufferGeometry {
  const g = G.extrude(G.shape(outline), t, bevel, 1, 1);
  if (plane === 'xy') return g;
  const m = new THREE.Matrix4();
  if (plane === 'zy') m.set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  else m.set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  G.flipWinding(g);
  return g;
}

/**
 * Closed thick-walled band (open-topped turret walls, boxes without lids): `outerLow`/`outerTop` and
 * `innerLow`/`innerTop` are rings of equal point count (3D). Produces the outer wall, the top rim, the
 * inner wall and the bottom rim with explicitly oriented faces, then creased normals.
 */
export function wallBand(outerLow: P3[], outerTop: P3[], innerTop: P3[], innerLow: P3[], creaseDeg = 32): THREE.BufferGeometry {
  const pos: number[] = [];
  const n = outerLow.length;
  const c = new THREE.Vector3();
  for (const p of outerLow) c.add(V(p));
  c.multiplyScalar(1 / n);
  const tri = (a: THREE.Vector3, b: THREE.Vector3, d: THREE.Vector3, want: THREE.Vector3) => {
    const nn = new THREE.Vector3().crossVectors(b.clone().sub(a), d.clone().sub(a));
    if (nn.dot(want) < 0) pos.push(a.x, a.y, a.z, d.x, d.y, d.z, b.x, b.y, b.z);
    else pos.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z);
  };
  const strip = (A: P3[], B: P3[], mode: 'out' | 'in' | 'up' | 'down') => {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a0 = V(A[i]), a1 = V(A[j]), b0 = V(B[i]), b1 = V(B[j]);
      const mid = a0.clone().add(a1).add(b0).add(b1).multiplyScalar(0.25);
      let want: THREE.Vector3;
      if (mode === 'up') want = new THREE.Vector3(0, 1, 0);
      else if (mode === 'down') want = new THREE.Vector3(0, -1, 0);
      else {
        want = mid.clone().sub(c);
        want.y = 0;
        if (mode === 'in') want.negate();
      }
      tri(a0, a1, b1, want);
      tri(a0, b1, b0, want);
    }
  };
  strip(outerLow, outerTop, 'out');
  strip(outerTop, innerTop, 'up');
  strip(innerTop, innerLow, 'in');
  strip(innerLow, outerLow, 'down');
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return G.crease(g, creaseDeg);
}
