/**
 * Small geometry helpers used by the MP 40 model (owned by the MP 40 author).
 * All in metres. Nothing here depends on the MP 40 dimensions.
 */
import { THREE, G } from '../../../../core/kit';

type V2 = [number, number];

/** A rectangular opening in a tube wall, in (z, phi-degrees) space. phi: 0 = +X, 90 = +Y. */
export interface TubeHole {
  z0: number;
  z1: number;
  p0: number;
  p1: number;
}

class TriBuilder {
  pos: number[] = [];
  nrm: number[] = [];
  /** Triangle with per-vertex normals, winding fixed to agree with the normals. */
  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, na: THREE.Vector3, nb: THREE.Vector3, nc: THREE.Vector3) {
    const e1 = b.clone().sub(a), e2 = c.clone().sub(a);
    const fn = e1.cross(e2);
    const avg = na.clone().add(nb).add(nc);
    if (fn.dot(avg) < 0) {
      [b, c] = [c, b];
      [nb, nc] = [nc, nb];
    }
    for (const [p, n] of [[a, na], [b, nb], [c, nc]] as const) {
      this.pos.push(p.x, p.y, p.z);
      this.nrm.push(n.x, n.y, n.z);
    }
  }
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, na: THREE.Vector3, nb: THREE.Vector3, nc: THREE.Vector3, nd: THREE.Vector3) {
    this.tri(a, b, c, na, nb, nc);
    this.tri(a, c, d, na, nc, nd);
  }
  flatQuad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, n: THREE.Vector3) {
    this.quad(a, b, c, d, n, n, n, n);
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    return G.mergeVertices(g, 1e-7);
  }
}

/**
 * Re-crease normals at millimetre scale. The core crease() goes through three's toCreasedNormals,
 * whose position hash quantises to 1/100 of a unit (1 cm here), which averages normals across
 * neighbouring faces of small parts and shows up as faceting. Scaling x1000 first avoids that.
 */
export function fineCrease(g: THREE.BufferGeometry, creaseDeg = 40): THREE.BufferGeometry {
  const k = 1000;
  const src = g.index ? g.toNonIndexed() : g.clone();
  for (const name of Object.keys(src.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') src.deleteAttribute(name);
  src.scale(k, k, k);
  const ng = G.toCreasedNormals(src, G.deg(creaseDeg));
  ng.scale(1 / k, 1 / k, 1 / k);
  return G.mergeVertices(ng, 1e-7);
}

/** Creased-at-mm-scale versions of the kit helpers. */
export const F = {
  lathe: (profile: V2[], seg = 32, creaseDeg = 40) => fineCrease(G.lathe(profile, seg, creaseDeg), creaseDeg),
  extrude: (s: THREE.Shape | V2[], depth: number, bevel = 0.003, curveSegments = 8, bevelSegments = 2) => fineCrease(G.extrude(s, depth, bevel, curveSegments, bevelSegments), 40),
  plate: (outline: V2[], t: number, plane: 'xy' | 'zy' | 'xz' = 'zy', bevel = 0.004, cornerRadius = 0) => fineCrease(G.plate(outline, t, plane, bevel, cornerRadius), 40),
  loftZ: (sections: { z: number; ring: V2[]; dx?: number; dy?: number }[], caps = true, creaseDeg = 55) => fineCrease(G.loftZ(sections, caps, creaseDeg), creaseDeg),
  strap: (...a: Parameters<typeof G.strap>) => fineCrease(G.strap(...a), 50),
};

const uniq = (a: number[]) => [...new Set(a.map((v) => Math.round(v * 1e7) / 1e7))].sort((x, y) => x - y);

/**
 * Thick-walled tube along +Z (axis through the origin) with rectangular openings cut through the wall.
 * Real cut faces (slot walls) are generated only where an opening meets material, so there are no
 * hidden internal faces (which would confuse the edge-wear bake).
 */
export function slottedTube(rOut: number, rIn: number, z0: number, z1: number, holes: TubeHole[] = [], stepDeg = 3, phiMin = -90, capEnds = true): THREE.BufferGeometry {
  const phiMax = phiMin + 360;
  const zs = uniq([z0, z1, ...holes.flatMap((h) => [h.z0, h.z1])].filter((z) => z >= z0 && z <= z1));
  const ps = uniq([phiMin, phiMax, ...holes.flatMap((h) => [h.p0, h.p1])].filter((p) => p >= phiMin && p <= phiMax));
  const nz = zs.length - 1, np = ps.length - 1;
  const solid = (i: number, j: number): boolean => {
    if (i < 0 || i >= nz) return false;
    j = ((j % np) + np) % np;
    const zc = (zs[i] + zs[i + 1]) / 2, pc = (ps[j] + ps[j + 1]) / 2;
    return !holes.some((h) => zc > h.z0 && zc < h.z1 && pc > h.p0 && pc < h.p1);
  };
  // angular subdivision per phi interval (shared by all z intervals -> no T-junctions)
  const arcs: number[][] = [];
  for (let j = 0; j < np; j++) {
    const a = ps[j], b = ps[j + 1];
    const n = Math.max(1, Math.ceil((b - a) / stepDeg));
    arcs.push(Array.from({ length: n + 1 }, (_, k) => G.deg(a + ((b - a) * k) / n)));
  }
  const tb = new TriBuilder();
  const P = (r: number, phi: number, z: number) => new THREE.Vector3(r * Math.cos(phi), r * Math.sin(phi), z);
  const R = (phi: number, s = 1) => new THREE.Vector3(Math.cos(phi) * s, Math.sin(phi) * s, 0);
  for (let i = 0; i < nz; i++) {
    const za = zs[i], zb = zs[i + 1];
    for (let j = 0; j < np; j++) {
      if (!solid(i, j)) continue;
      const arc = arcs[j];
      for (let k = 0; k < arc.length - 1; k++) {
        const f0 = arc[k], f1 = arc[k + 1];
        // outer
        tb.quad(P(rOut, f0, za), P(rOut, f1, za), P(rOut, f1, zb), P(rOut, f0, zb), R(f0), R(f1), R(f1), R(f0));
        // inner
        tb.quad(P(rIn, f0, za), P(rIn, f0, zb), P(rIn, f1, zb), P(rIn, f1, za), R(f0, -1), R(f0, -1), R(f1, -1), R(f1, -1));
        // z caps
        const capLo = i === 0 ? capEnds : !solid(i - 1, j);
        const capHi = i === nz - 1 ? capEnds : !solid(i + 1, j);
        if (capLo) tb.flatQuad(P(rIn, f0, za), P(rOut, f0, za), P(rOut, f1, za), P(rIn, f1, za), new THREE.Vector3(0, 0, -1));
        if (capHi) tb.flatQuad(P(rIn, f0, zb), P(rOut, f0, zb), P(rOut, f1, zb), P(rIn, f1, zb), new THREE.Vector3(0, 0, 1));
      }
      // phi caps (cut faces along the length)
      if (!solid(i, j - 1)) {
        const f = arc[0];
        tb.flatQuad(P(rIn, f, za), P(rOut, f, za), P(rOut, f, zb), P(rIn, f, zb), new THREE.Vector3(Math.sin(f), -Math.cos(f), 0));
      }
      if (!solid(i, j + 1)) {
        const f = arc[arc.length - 1];
        tb.flatQuad(P(rIn, f, za), P(rOut, f, za), P(rOut, f, zb), P(rIn, f, zb), new THREE.Vector3(-Math.sin(f), Math.cos(f), 0));
      }
    }
  }
  return tb.build();
}

/** Partial thick shell of a cylinder along Z (phi in degrees, 0 = +X), with all cut faces. */
export function shellSector(rOut: number, rIn: number, z0: number, z1: number, p0: number, p1: number, stepDeg = 4): THREE.BufferGeometry {
  // build as a slotted tube whose only "hole" is everything outside [p0, p1]
  const span = p1 - p0;
  if (span >= 360) return slottedTube(rOut, rIn, z0, z1, [], stepDeg);
  return slottedTube(rOut, rIn, z0, z1, [{ z0: z0 - 1, z1: z1 + 1, p0: p1, p1: p0 + 360 }], stepDeg, p0);
}

/** Ribbed (knurled) cylinder along +Z, centred on z = 0. */
export function ribbedCyl(r: number, depth: number, h: number, ribs: number, bevel = 0.0003): THREE.BufferGeometry {
  const pts: V2[] = [];
  const n = ribs * 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const m = i % 4;
    const rr = m === 0 || m === 1 ? r : r - depth;
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  return fineCrease(G.extrude(pts, h, bevel, 1, 1), 30);
}

/** Regular polygon prism along +Z (e.g. hex nut), centred, flats top/bottom when sides is even. */
export function prismZ(acrossFlats: number, h: number, sides = 6, bevel = 0.001): THREE.BufferGeometry {
  const rc = acrossFlats / 2 / Math.cos(Math.PI / sides);
  const pts: V2[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + Math.PI / sides + Math.PI / 2;
    pts.push([Math.cos(a) * rc, Math.sin(a) * rc]);
  }
  return fineCrease(G.extrude(pts, h, bevel, 1, 2), 30);
}

/** Lathe along +Z: profile of [radius, z] points (z increasing). */
export function latheZ(profile: V2[], seg = 32, creaseDeg = 40): THREE.BufferGeometry {
  const g = F.lathe(profile, seg, creaseDeg);
  g.rotateX(Math.PI / 2); // +Y -> +Z
  return g;
}

/** Lathe along +X: profile of [radius, x] points (x increasing). */
export function latheX(profile: V2[], seg = 28, creaseDeg = 40): THREE.BufferGeometry {
  const g = F.lathe(profile, seg, creaseDeg);
  g.rotateZ(-Math.PI / 2); // +Y -> +X
  return g;
}

/** Cylinder whose faces point INWARDS (a bore / hollow interior seen from the inside), along +Z. */
export function boreZ(r: number, z0: number, z1: number, seg = 20): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, z1 - z0, seg, 1, true);
  g.rotateX(Math.PI / 2);
  g.translate(0, 0, (z0 + z1) / 2);
  G.flipWinding(g);
  const n = g.attributes.normal.array as Float32Array;
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return g;
}

/** Side-view plate (outline in (z, y)), thickness along X, centred on x = 0, with optional holes. */
export function plateZY(outline: V2[], t: number, bevel = 0.0006, holes: V2[][] = [], cornerR = 0): THREE.BufferGeometry {
  const sh = G.shape(outline, cornerR, holes);
  const g = F.extrude(sh, t, bevel, 6, 2);
  const m = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  G.flipWinding(g);
  return g;
}

/** Rounded-rectangle outline (CCW) for G.shape / extrusions. */
export function roundRect(x0: number, y0: number, x1: number, y1: number, r: number, n = 4): V2[] {
  const pts: V2[] = [];
  const corners: [number, number, number][] = [
    [x1 - r, y0 + r, -90],
    [x1 - r, y1 - r, 0],
    [x0 + r, y1 - r, 90],
    [x0 + r, y0 + r, 180],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= n; i++) {
      const a = G.deg(a0 + (90 * i) / n);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

/**
 * Cross-section of a part that cradles a tube from below (lower receiver, fore-end):
 * flat sides at +-hw, rounded bottom corners (rc) at yb, concave top following a tube of radius rT
 * centred at the origin. Fixed point count for lofting. `groove(y)` optionally indents the sides.
 */
export function cradleRing(hw: number, yb: number, rc: number, rT: number, groove?: (y: number) => number, nArc = 12, nSide = 7, nCorner = 5): V2[] {
  const pts: V2[] = [];
  const yTop = -Math.sqrt(Math.max(0, rT * rT - hw * hw));
  const side = (sgn: number, down: boolean) => {
    for (let i = 0; i < nSide; i++) {
      const t = down ? i / nSide : 1 - (i + 1) / nSide;
      const y = yTop + (yb + rc - yTop) * t;
      const gx = groove ? groove(y) : 0;
      pts.push([sgn * (hw - gx), y]);
    }
  };
  // right side going down (from top junction)
  side(1, true);
  // bottom-right corner
  for (let i = 0; i <= nCorner; i++) {
    const a = G.deg(0 - (90 * i) / nCorner);
    pts.push([hw - rc + Math.cos(a) * rc, yb + rc + Math.sin(a) * rc]);
  }
  // bottom-left corner
  for (let i = 0; i <= nCorner; i++) {
    const a = G.deg(-90 - (90 * i) / nCorner);
    pts.push([-hw + rc + Math.cos(a) * rc, yb + rc + Math.sin(a) * rc]);
  }
  // left side going up
  side(-1, false);
  // top arc between the left and right junctions along the tube underside (end points already present)
  for (let i = 1; i < nArc; i++) {
    const x = -hw + (2 * hw * i) / nArc;
    pts.push([x, -Math.sqrt(Math.max(0, rT * rT - x * x))]);
  }
  return pts;
}

/** Matrix from an orthonormal basis (columns) and an origin. */
export function basis(x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3, o: THREE.Vector3): THREE.Matrix4 {
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(o);
}

/** Place a geometry (clone) with a matrix. */
export function placed(g: THREE.BufferGeometry, m: THREE.Matrix4): THREE.BufferGeometry {
  const c = g.clone();
  c.applyMatrix4(m);
  if (m.determinant() < 0) G.flipWinding(c);
  return c;
}
