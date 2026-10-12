/**
 * DP 47-round pan (disc) magazine, stamped sheet steel.
 *
 * Pan-local frame: origin at the centre of the bottom plate's underside, +Y up (top cover),
 * -Z = the feed-mouth side (it points to the rear of the gun when mounted), +X = gun's left.
 * Diameter 265 mm. The rotating top cover carries the two rings of stamped recesses seen on
 * the real magazine (outer triangles, inner teardrops), a rolled bead ring around the centre
 * and the central boss with its slotted screw; a wire carrying bail lies on the cover.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import { slottedScrew, type P2 } from './geo';
import { dpMat } from './materials';

export const PAN_R = 0.1325;
/** Height of the top cover surface above the pan's underside. */
export const PAN_TOP = 0.018;

function roundedPoly(pts: P2[], r: number, seg = 3): P2[] {
  const out: P2[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const ab = [b[0] - a[0], b[1] - a[1]], bc = [c[0] - b[0], c[1] - b[1]];
    const lab = Math.hypot(ab[0], ab[1]), lbc = Math.hypot(bc[0], bc[1]);
    const rr = Math.min(r, lab / 2.2, lbc / 2.2);
    const p1: P2 = [b[0] - (ab[0] / lab) * rr, b[1] - (ab[1] / lab) * rr];
    const p2: P2 = [b[0] + (bc[0] / lbc) * rr, b[1] + (bc[1] / lbc) * rr];
    for (let k = 0; k <= seg; k++) {
      const t = k / seg;
      // quadratic Bezier p1 -> b -> p2
      const x = (1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * b[0] + t * t * p2[0];
      const y = (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * b[1] + t * t * p2[1];
      out.push([x, y]);
    }
  }
  return out;
}

/** Shape coordinates: (sx, sy) -> pan (x = sx, z = -sy) after the plate is rotated flat. */
const at = (r: number, phi: number): P2 => [r * Math.sin(phi), r * Math.cos(phi)];

function triangleRecess(phi: number, grow = 0): P2[] {
  const t: P2 = [Math.cos(phi), -Math.sin(phi)];
  const apex = at(0.1122 - grow, phi);
  const base = at(0.1238 + grow, phi);
  const hw = 0.0047 + grow;
  return roundedPoly(
    [
      apex,
      [base[0] - t[0] * hw, base[1] - t[1] * hw],
      [base[0] + t[0] * hw, base[1] + t[1] * hw],
    ],
    0.0012 + grow * 0.5,
    2,
  );
}

function teardropRecess(phi: number, grow = 0): P2[] {
  const t: P2 = [Math.cos(phi), -Math.sin(phi)];
  const d: P2 = [Math.sin(phi), Math.cos(phi)];
  const rb = 0.0026 + grow, cb = 0.0968;
  const tip = 0.0862 - grow;
  const pts: P2[] = [];
  // bulb: semicircle on the outer side, from the -t flank round to the +t flank
  const n = 6;
  const P = (along: number, across: number): P2 => [d[0] * along + t[0] * across, d[1] * along + t[1] * across];
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI; // -90..90 deg around the outward direction
    pts.push(P(cb + rb * Math.cos(a), rb * Math.sin(a)));
  }
  // tail converging to the tip (towards the centre): down the +t flank, round the tip, back up the -t flank
  const wTail = 0.0008 + grow * 0.6;
  pts.push(P(cb - 0.004, rb * 0.72));
  pts.push(P(tip, wTail));
  pts.push(P(tip - 0.0006, 0));
  pts.push(P(tip, -wTail));
  pts.push(P(cb - 0.004, -rb * 0.72));
  return pts;
}

function toPath(p: THREE.Path, pts: P2[]) {
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  p.closePath();
}

export interface PanOptions {
  /** Number of recess positions per ring (the pan holds 47 rounds). */
  positions?: number;
  /** Radial segments of the round parts. */
  seg?: number;
}

export function buildDp27Pan(opts: PanOptions = {}): THREE.Group {
  const mat = dpMat.pan();
  const seg = opts.seg ?? 88;
  const N = opts.positions ?? 47;
  const parts: THREE.Object3D[] = [];

  // --- lower shell: bottom plate + side wall with the seam where the rotating cover overlaps ---
  const shellProfile: P2[] = [
    [0.0, 0.0],
    [0.03, 0.0],
    [0.06, 0.0],
    [0.09, 0.0],
    [0.12, 0.0],
    [0.1275, 0.0006],
    [0.1308, 0.0024],
    [0.1325, 0.005],
    [0.1325, 0.0085],
    [0.1318, 0.009],
    [0.1318, 0.01],
    [0.133, 0.0106],
    [0.133, 0.016],
    [0.1323, 0.0173],
    [0.1308, 0.018],
    [0.1292, 0.0179],
    [0.1284, 0.017],
    // back down the inside (sheet thickness) so the shell is a closed solid: no self-shadowing
    [0.1312, 0.0158],
    [0.1312, 0.0045],
    [0.124, 0.0009],
    [0.0, 0.0009],
  ];
  const shell = G.lathe(shellProfile, seg, 35);
  parts.push(part(shell, mat));

  // --- top cover with stamped recesses ---
  const bailPhi = 0.49; // carrying bail at ~28 deg from the rear, towards the left
  const phis = Array.from({ length: N }, (_, k) => ((k + 0.5) / N) * Math.PI * 2);
  const recessOutlines: P2[][] = [];
  for (const phi of phis) {
    recessOutlines.push(triangleRecess(phi));
    recessOutlines.push(teardropRecess(phi));
  }
  // cover face (one surface with openings), recess walls and recess floors: a stamped look at low cost
  const depth = 0.0014;
  // The cover face is triangulated per recess sector (with extra points along the sector sides), so
  // no triangle spans the whole disc: baked edge wear stays on the recess rims instead of smearing.
  const topPos: number[] = [];
  const dPhi = (Math.PI * 2) / N;
  const radii = [0.121, 0.1165, 0.108, 0.1025, 0.0935, 0.0835, 0.074, 0.0655];
  phis.forEach((phi, k) => {
    const a0 = phi - dPhi / 2, a1 = phi + dPhi / 2;
    const cont: P2[] = [];
    for (let i = 0; i <= 3; i++) cont.push(at(0.1296, a0 + ((a1 - a0) * i) / 3));
    for (const r of radii) cont.push(at(r, a1));
    for (let i = 0; i <= 2; i++) cont.push(at(0.0576, a1 - ((a1 - a0) * i) / 2));
    for (const r of [...radii].reverse()) cont.push(at(r, a0));
    const holes = [recessOutlines[k * 2], recessOutlines[k * 2 + 1]];
    const all = [...cont, ...holes[0], ...holes[1]];
    const faces = THREE.ShapeUtils.triangulateShape(
      cont.map(([x, y]) => new THREE.Vector2(x, y)),
      holes.map((h) => h.map(([x, y]) => new THREE.Vector2(x, y))),
    );
    for (const f of faces) {
      const [p, q, r] = f.map((i) => all[i]);
      // facing +Y in pan space (x, -y): need clockwise in shape space
      const cr = (q[0] - p[0]) * (r[1] - p[1]) - (r[0] - p[0]) * (q[1] - p[1]);
      const tri = cr > 0 ? [p, q, r] : [p, r, q];
      for (const v of tri) topPos.push(v[0], PAN_TOP, -v[1]);
    }
    void k;
  });
  const top = new THREE.BufferGeometry();
  top.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3));
  top.computeVertexNormals();
  parts.push(part(top, mat));
  // underside of the cover sheet (gives the sheet thickness, keeps shadow maps clean); the recess
  // floors close the openings from above, so a plain annulus is enough
  const under = new THREE.RingGeometry(0.0576, 0.1296, seg, 1);
  under.rotateX(Math.PI / 2); // faces -Y
  under.translate(0, PAN_TOP - 0.0012 - 0.0003, 0);
  parts.push(part(under, mat));
  const wallPos: number[] = [];
  const floorShapes: THREE.Shape[] = [];
  for (const o of recessOutlines) {
    const cx = o.reduce((s, p) => s + p[0], 0) / o.length, cy = o.reduce((s, p) => s + p[1], 0) / o.length;
    // slightly sloped wall (stamped): the floor outline is inset a little
    const inset = o.map(([x, y]) => [x + (cx - x) * 0.14, y + (cy - y) * 0.14] as P2);
    for (let i = 0; i < o.length; i++) {
      const a = o[i], b = o[(i + 1) % o.length], c = inset[(i + 1) % o.length], d = inset[i];
      // shape (sx, sy) -> pan (sx, y, -sy)
      const A = [a[0], PAN_TOP, -a[1]], B = [b[0], PAN_TOP, -b[1]], Cc = [c[0], PAN_TOP - depth, -c[1]], D = [d[0], PAN_TOP - depth, -d[1]];
      // wall must face the recess centre
      const n = [(B[1] - A[1]) * (D[2] - A[2]) - (B[2] - A[2]) * (D[1] - A[1]), (B[2] - A[2]) * (D[0] - A[0]) - (B[0] - A[0]) * (D[2] - A[2]), (B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0])];
      const toC = [cx - (a[0] + b[0]) / 2, 0, -(cy - (a[1] + b[1]) / 2)];
      const ok = n[0] * toC[0] + n[2] * toC[2] > 0;
      const quad = ok ? [A, B, Cc, A, Cc, D] : [A, Cc, B, A, D, Cc];
      for (const q of quad) wallPos.push(q[0], q[1], q[2]);
    }
    const s = new THREE.Shape();
    toPath(s, inset);
    floorShapes.push(s);
  }
  const walls = new THREE.BufferGeometry();
  walls.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3));
  walls.computeVertexNormals();
  parts.push(part(walls, mat));
  const floors = new THREE.ShapeGeometry(floorShapes, 1);
  floors.rotateX(-Math.PI / 2);
  floors.translate(0, PAN_TOP - depth, 0);
  parts.push(part(floors, mat));

  // --- centre: flat disc, rolled bead ring, boss with slotted screw ---
  const centreProfile: P2[] = [
    [0.059, 0.0158],
    [0.059, 0.0168],
    [0.0582, 0.0176],
    [0.0571, 0.0185],
    [0.0553, 0.0191],
    [0.0535, 0.0184],
    [0.052, 0.0178],
    [0.043, 0.0178],
    [0.034, 0.0178],
    [0.025, 0.0178],
    [0.0175, 0.0178],
    [0.0124, 0.0178],
    [0.0119, 0.0186],
    [0.0106, 0.0198],
    [0.0086, 0.0205],
    [0.0, 0.0206],
    // closed underneath
    [0.0, 0.0162],
    [0.059, 0.0158],
  ];
  parts.push(part(G.lathe(centreProfile, 48, 40), mat));
  parts.push(part(slottedScrew(0.0052, 0.0013, 0.0012), mat, { p: [0, 0.0204, 0], r: [0, 37, 0] }));
  // small vent / index hole seen near the centre ring
  const vh = at(0.063, 3.3);
  parts.push(part(G.cyl(0.0011, 0.0011, 0.0004, 10), dpMat.void(), { p: [vh[0], PAN_TOP + 0.00005, -vh[1]] }));

  // --- feed-mouth housing on the underside, on the rear radius ---
  parts.push(part(G.rbox(0.027, 0.0112, 0.098, 0.0025, 2), mat, { p: [0, -0.0052, -0.077] }));
  // feed lips (the opening that lets the top round down into the receiver)
  parts.push(part(G.rbox(0.013, 0.0006, 0.084, 0.0002, 1), dpMat.void(), { p: [0, -0.0108, -0.08] }));
  // centre socket ring on the underside (locates the pan on the receiver)
  parts.push(part(G.lathe([[0.006, -0.0025], [0.0095, -0.0025], [0.0095, 0.0005], [0.006, 0.0005], [0.006, -0.0025]], 32), mat));

  // --- carrying bail: riveted hinge plate + triangular wire loop lying on the cover ---
  const d = new THREE.Vector3(Math.sin(bailPhi), 0, -Math.cos(bailPhi)); // outward (pan-local xz)
  const tg = new THREE.Vector3(Math.cos(bailPhi), 0, Math.sin(bailPhi)); // tangential
  const yaw = Math.atan2(d.x, d.z);
  const hp = d.clone().multiplyScalar(0.1055).setY(PAN_TOP + 0.0006);
  parts.push(part(G.rbox(0.017, 0.0012, 0.011, 0.0004, 1), mat, { p: hp.toArray() as [number, number, number], r: [0, THREE.MathUtils.radToDeg(yaw), 0] }));
  for (const s of [-1, 1]) {
    const rp = hp.clone().addScaledVector(tg, s * 0.0055).addScaledVector(d, 0.0022).setY(PAN_TOP + 0.0012);
    parts.push(part(G.rivetHead(0.0014), mat, { p: rp.toArray() as [number, number, number] }));
  }
  const barrelC = d.clone().multiplyScalar(0.1).setY(PAN_TOP + 0.0019);
  const hinge = G.rod(barrelC.clone().addScaledVector(tg, -0.0068), barrelC.clone().addScaledVector(tg, 0.0068), 0.0019, 12);
  parts.push(part(hinge, mat));
  const wy = PAN_TOP + 0.0014;
  const c0 = d.clone().multiplyScalar(0.1);
  const bail = [
    c0.clone().addScaledVector(tg, -0.0058),
    c0.clone().addScaledVector(tg, -0.0046).addScaledVector(d, -0.012),
    c0.clone().addScaledVector(d, -0.031).addScaledVector(tg, -0.0011),
    c0.clone().addScaledVector(d, -0.031).addScaledVector(tg, 0.0011),
    c0.clone().addScaledVector(tg, 0.0046).addScaledVector(d, -0.012),
    c0.clone().addScaledVector(tg, 0.0058),
  ].map((p) => p.setY(wy));
  parts.push(part(G.tube(bail, 0.0012, 6, 44, true), dpMat.bare()));

  const g = group(parts);
  g.name = 'dp27-pan';
  return g;
}
