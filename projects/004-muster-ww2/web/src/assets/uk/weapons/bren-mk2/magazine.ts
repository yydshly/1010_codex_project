/**
 * Bren 30-round .303 magazine (B-frame, see dims.ts). Curved sheet-steel box (the curve follows the
 * taper of the rimmed cartridges), inserted upside down into the top of the body: the feed lips go down
 * into the opening and the floor plate faces up. Pressed stiffening panels along both flat sides, a rib
 * near the front edge, the folded floor plate with its retaining stud, the rear catch notch and the
 * front locating lug.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { V, plateZY, basis, circle2D, spaced, type V2 } from '../common/geo';
import type { UkwMats } from '../common/materials';
import { BR, magCentre } from './dims';
import { tessellate } from './util';

/** Point on the magazine side outline: u across the depth (-1 rear .. +1 front), s = arc angle (deg). */
function magPt(thDeg: number, u: number, grow = 0): V2 {
  const c = magCentre(thDeg);
  const g = BR.mag;
  // rear direction perpendicular to the centre line (in the z, y plane)
  const rz = -c.dy, ry = c.dz;
  const h = g.depth / 2 + grow;
  return [c.z - rz * u * h, c.y - ry * u * h];
}

/** Side outline between arc angles a..b, u range u0..u1 (fraction of the half depth), with a straight
 *  insertion extension below the base (ext metres along -centre direction). */
function outline(a: number, b: number, u0: number, u1: number, ext: number, grow = 0, n = 20): V2[] {
  const pts: V2[] = [];
  const c0 = magCentre(a);
  const down = (p: V2, e: number): V2 => [p[0] - c0.dz * e, p[1] - c0.dy * e];
  const ths = spaced(a, b, n);
  // rear edge (u = -1 side is the rear) going up, top across, front edge going down
  if (ext > 0) pts.push(down(magPt(a, u0, grow), ext));
  for (const t of ths) pts.push(magPt(t, u0, grow));
  for (const t of [...ths].reverse()) pts.push(magPt(t, u1, grow));
  if (ext > 0) pts.push(down(magPt(a, u1, grow), ext));
  return pts;
}

export function buildMagazine(m: UkwMats, hi: boolean): THREE.Group {
  const g = BR.mag;
  const out: THREE.Object3D[] = [];
  const n = hi ? 24 : 14;
  const t0 = g.th0, t1 = g.th1;
  // main box
  out.push(part(plateZY(outline(t0, t1, -1, 1, g.insert, 0, n), g.thick, [], 0.0016), m.stamped));
  // pressed panels on both sides (raised 0.7 mm), inset from the edges
  const panel = outline(t0 + 3.5, t1 - 2.4, -0.62, 0.5, 0, 0, n);
  const rib = outline(t0 + 2.2, t1 - 1.6, 0.7, 0.8, 0, 0, n);
  for (const sx of [-1, 1]) {
    out.push(part(plateZY(panel, 0.0016, [], 0.0006), m.stamped, { p: [sx * (g.thick / 2 - 0.0001), 0, 0] }));
    out.push(part(plateZY(rib, 0.0022, [], 0.0006), m.stamped, { p: [sx * (g.thick / 2 - 0.0001), 0, 0] }));
  }
  // folded floor plate on top (faces up), slightly larger than the box, with the retaining stud
  const ct = magCentre(t1);
  const dir = V(0, ct.dy, ct.dz);
  const xAx = V(1, 0, 0);
  const fwd = V(0, -ct.dz, ct.dy);
  const top = V(0, ct.y, ct.z);
  const M = basis(xAx, dir, fwd, top);
  const fp = tessellate(G.rbox(g.thick + 0.003, 0.0035, g.depth + 0.004, 0.0012, 2), 0.006, null);
  fp.translate(0, -0.0008, 0);
  fp.applyMatrix4(M);
  out.push(part(fp, m.stamped));
  const stud = G.cyl(0.0032, 0.0034, 0.0012, 16);
  stud.translate(0, 0.0015, -g.depth * 0.18);
  stud.applyMatrix4(M);
  out.push(part(stud, m.stamped));
  const studHole = G.cyl(0.0013, 0.0013, 0.0004, 10);
  studHole.translate(0, 0.0022, -g.depth * 0.18);
  studHole.applyMatrix4(M);
  out.push(part(studHole, m.recess));
  // front locating lug and rear catch notch at the base (just above the housing top)
  const c0 = magCentre(t0 + 0.8);
  const fr = magPt(t0 + 0.8, 1), rr = magPt(t0 + 0.8, -1);
  void c0;
  out.push(part(G.rbox(0.012, 0.006, 0.004, 0.001, 1), m.stamped, { p: [0, fr[1], fr[0] + 0.0012] }));
  out.push(part(G.box(0.014, 0.0022, 0.0012), m.recess, { p: [0, rr[1] + 0.012, rr[0] - 0.0002] }));
  // spot-weld seam line along the front and rear edges
  for (const u of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    for (const th of spaced(t0 + 1, t1 - 1, 10)) {
      const [z, y] = magPt(th, u, 0.0001);
      pts.push(V(0, y, z));
    }
    out.push(part(G.tube(pts, 0.0004, 4, 40), m.recess));
  }
  void circle2D;
  const grp = group(out, { name: 'bren-magazine' });
  grp.userData.brenPart = 'magazine';
  return grp;
}
