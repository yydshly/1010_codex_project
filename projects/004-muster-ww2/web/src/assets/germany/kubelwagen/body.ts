/**
 * Pressed-steel body shell of the Type 82: flat side panels with door openings and wheel
 * arches, front deck + sloping front panel (spare-wheel panel), rear deck + sloping engine
 * panel, rolled fillets between panels, pressed stiffening beads, rolled cockpit rim,
 * doors with inner frames and external hinges, front lid, louvred engine lid, wheel houses,
 * floor pan, bulkheads.
 *
 * Built for the LEFT half (+X) where the halves are symmetric and mirrored across X.
 */
import { THREE, G, part, group, mirrorX, decal } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import {
  type V2,
  type V3,
  type Frame,
  slab,
  slabGeo,
  filletGeo,
  beadGeo,
  tanOff,
  offsetLine,
  intersect,
  atCoord,
  arc,
  merge,
} from './util';

const t = D.t;
const HW = D.halfW;
/** height where the rear wheel arch meets the lower edge of the rear quarter */
const REAR_ARCH_Y = 0.452;

// ---------------------------------------------------------------- profile geometry (z, y)
const len2 = (a: V2, b: V2) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const unit2 = (a: V2, b: V2): V2 => {
  const l = len2(a, b);
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
};

const deckFDir = unit2(D.cowl, D.brkF); // forward-down
const faceDir = unit2(D.brkF, D.noseF); // down the spare-wheel panel
const deckRDir = unit2(D.deckR, D.brkR); // backwards
const slopeDir = unit2(D.brkR, D.tailR); // down the engine panel
const L_dF = len2(D.cowl, D.brkF);
const L_face = len2(D.brkF, D.noseF);
const L_dR = len2(D.deckR, D.brkR);
const L_slope = len2(D.brkR, D.tailR);

const ang = (a: V2, b: V2) => Math.acos(THREE.MathUtils.clamp(a[0] * b[0] + a[1] * b[1], -1, 1));
/** fillet tangent offsets at the breaks */
const offBrkF = tanOff(D.rF, ang([-deckFDir[0], -deckFDir[1]], faceDir));
const rNose = 0.025;
const offNose = tanOff(rNose, ang([-faceDir[0], -faceDir[1]], [-1, 0]));
const offBrkR = tanOff(D.rR, ang([-deckRDir[0], -deckRDir[1]], slopeDir));
const rTail = 0.015;
const offTail = tanOff(rTail, ang([-slopeDir[0], -slopeDir[1]], [1, 0]));

// offset lines (inward) in the side profile
const faceOff = offsetLine(D.brkF, D.noseF, -D.rF);
const deckFOff = offsetLine(D.cowl, D.brkF, -D.rF);
const deckROff = offsetLine(D.deckR, D.brkR, D.rR);
const slopeOff = offsetLine(D.brkR, D.tailR, D.rR);
const cornerF = intersect(faceOff, deckFOff); // (z, y) of the front corner-sphere centre
const cornerR = intersect(deckROff, slopeOff);

/** Point on a profile line at distance s from its start, as 3D at a given x. */
const onLine = (a: V2, dir: V2, s: number, x: number): V3 => [x, a[1] + dir[1] * s, a[0] + dir[0] * s];

/** Frame for a panel lying on a profile line (u = +X, v = along the line). n points outward (up / out). */
function lineFrame(a: V2, dir: V2): Frame {
  // outward normal in (z, y): rotate dir by +90deg -> (-dy, dz) gives the left normal of (z,y) vector
  const nz = -dir[1], ny = dir[0];
  // choose the one pointing up/out (positive y or, for vertical-ish panels, away from the car centre)
  const sgn = ny > 0 || (Math.abs(ny) < 1e-6 && nz * a[0] > 0) ? 1 : -1;
  return { o: [0, a[1], a[0]], u: [1, 0, 0], v: [0, dir[1], dir[0]], n: [0, ny * sgn, nz * sgn] };
}

/** Rear/front of the side panel along the slope/face offset line at height y. */
export const rearEdgeZ = (y: number) => atCoord(slopeOff, 1, y)[0];

// ---------------------------------------------------------------- side panel outline
function sideOutline(): V2[] {
  const g = D.gap;
  const pts: V2[] = [];
  const Pa = atCoord(faceOff, 1, D.noseF[1]);
  pts.push(Pa, cornerF);
  const Pc = atCoord(deckFOff, 0, D.cowl[0]);
  pts.push(Pc, [D.cowl[0], D.belt]);
  // door notches
  const fd = D.doorF, rd = D.doorR, yb = D.doorBottom - g;
  pts.push([fd[1] + g, D.belt], [fd[1] + g, yb], [fd[0] - g, yb], [fd[0] - g, D.belt]);
  pts.push([rd[1] + g, D.belt], [rd[1] + g, yb], [rd[0] - g, yb], [rd[0] - g, D.belt]);
  pts.push([D.deckR[0], D.belt], [D.deckR[0], D.belt - D.rR]);
  pts.push(cornerR);
  const Pg = atCoord(slopeOff, 1, D.tailR[1] - 0.002);
  pts.push(Pg);
  // rear arch: from y = 0.40 (behind) over the top to the sill (in front)
  const R = D.archR;
  const aRr = Math.PI - Math.asin((REAR_ARCH_Y - D.axleY) / R);
  const aRf = Math.asin((D.sillY - D.axleY) / R);
  for (const p of arc(D.zRA, D.axleY, R, aRr, aRf, 28)) pts.push(p);
  // front arch: from the sill (behind) over the top to the nose bottom (in front)
  const aFr = Math.PI - Math.asin((D.sillY - D.axleY) / R);
  const aFf = Math.asin((D.noseF[1] - D.axleY) / R);
  for (const p of arc(D.zFA, D.axleY, R, aFr, aFf, 28)) pts.push(p);
  return pts;
}

const sideFrame: Frame = { o: [HW, 0, 0], u: [0, 0, 1], v: [0, 1, 0], n: [1, 0, 0] };

// ---------------------------------------------------------------- pieces
function sidePanel(): THREE.Object3D[] {
  const paint = P.body();
  const out: THREE.Object3D[] = [slab(sideOutline(), t, sideFrame, paint, { bevel: 0.0008 })];

  // arch flange lips (slightly rolled edge along the cut-out)
  for (const [zc, a0, a1] of [
    [D.zFA, Math.PI - Math.asin((D.sillY - D.axleY) / D.archR), Math.asin((D.noseF[1] + 0.004 - D.axleY) / D.archR)],
    [D.zRA, Math.PI - Math.asin((REAR_ARCH_Y + 0.004 - D.axleY) / D.archR), Math.asin((D.sillY - D.axleY) / D.archR)],
  ] as [number, number, number][]) {
    const pts = arc(zc, D.axleY, D.archR + 0.004, a0, a1, 40).map(([z, y]) => new THREE.Vector3(HW - 0.0035, y, z));
    out.push(part(G.tube(pts, 0.0055, 8, 80), paint));
  }

  // cockpit rolled rim on the fixed side-panel pieces (B-pillar, rear quarter)
  const rim = (z0: number, z1: number) =>
    part(G.rod([HW - 0.0065, D.belt - 0.003, z0], [HW - 0.0065, D.belt - 0.003, z1], 0.0085, 14), paint);
  out.push(rim(D.doorR[1] + D.gap + 0.001, D.doorF[0] - D.gap - 0.001));
  out.push(rim(D.deckR[0] - 0.006, D.doorR[0] - D.gap - 0.001));

  // pressed beads on the rear quarter
  const bw = 0.028, bh = 0.0035;
  const zq1 = D.doorR[0] - 0.045;
  const yUp = 0.8;
  out.push(part(beadGeo([HW, yUp, zq1], [HW, yUp, rearEdgeZ(yUp) + 0.05], [1, 0, 0], bw, bh), paint));
  // short bead above the rear wheel (panel stiffener following the arch)
  const archBead = arc(D.zRA, D.axleY, D.archR + 0.07, Math.PI * 0.78, Math.PI * 0.22, 24).map(([z, y]) => new THREE.Vector3(HW, y, z));
  {
    const pts = archBead;
    const g = G.tube(pts, 0.012, 8, 60);
    g.scale(0.28, 1, 1);
    g.translate(HW * (1 - 0.28), 0, 0);
    out.push(part(g, paint));
  }
  return out;
}

/** A door (outer skin + inner frame + rolled top + beads + hinges + handle). */
function door(z0: number, z1: number, hingeAtFront: boolean): THREE.Object3D[] {
  const paint = P.body();
  const y0 = D.doorBottom, y1 = D.belt;
  const out: THREE.Object3D[] = [];
  const outline: V2[] = [
    [z0, y0 + 0.018],
    [z0 + 0.018, y0],
    [z1 - 0.018, y0],
    [z1, y0 + 0.018],
    [z1, y1],
    [z0, y1],
  ];
  out.push(slab(outline, t, sideFrame, paint, { bevel: 0.0008 }));
  // inner frame (flanged perimeter, 24 mm deep)
  const inset = 0.028;
  const inner: V2[] = [
    [z0 + inset, y0 + inset],
    [z1 - inset, y0 + inset],
    [z1 - inset, y1 - inset],
    [z0 + inset, y1 - inset],
  ];
  const ringFrame: Frame = { o: [HW - t, 0, 0], u: [0, 0, 1], v: [0, 1, 0], n: [1, 0, 0] };
  out.push(part(slabGeo(outline, 0.022, ringFrame, { holes: [inner], bevel: 0.002 }), paint));
  // inner panel face (single skin, set back) with a horizontal stiffener
  const back: Frame = { o: [HW - 0.02, 0, 0], u: [0, 0, 1], v: [0, 1, 0], n: [1, 0, 0] };
  out.push(slab(inner.map(([z, y]) => [z, y] as V2), 0.002, back, paint, { bevel: 0.0006 }));
  // rolled top edge
  out.push(part(G.rod([HW - 0.0065, y1 - 0.003, z0 + 0.001], [HW - 0.0065, y1 - 0.003, z1 - 0.001], 0.0085, 14), paint));
  out.push(part(G.rod([HW - 0.016, y1 - 0.012, z0 + 0.004], [HW - 0.016, y1 - 0.012, z1 - 0.004], 0.009, 10), paint));
  // two pressed beads
  const bw = 0.028, bh = 0.0035;
  for (const y of [0.8, 0.47]) out.push(part(beadGeo([HW, y, z0 + 0.045], [HW, y, z1 - 0.045], [1, 0, 0], bw, bh), paint));
  // exterior handle near the free edge: small lever on a round escutcheon
  const zfree = hingeAtFront ? z0 + 0.06 : z1 - 0.06;
  const yhnd = 0.865;
  out.push(part(G.cyl(0.018, 0.02, 0.006, 20), paint, { p: [HW + 0.003, yhnd, zfree], r: [0, 0, 90] }));
  out.push(part(G.cyl(0.007, 0.008, 0.014, 12), P.darkSteel(), { p: [HW + 0.009, yhnd, zfree], r: [0, 0, 90] }));
  out.push(
    part(G.rbox(0.01, 0.014, 0.075, 0.0045, 2), P.darkSteel(), {
      p: [HW + 0.0145, yhnd, zfree + (hingeAtFront ? 0.028 : -0.028)],
    }),
  );
  // interior pull handle on the inner frame
  out.push(part(G.tube([[HW - 0.028, 0.8, zfree - 0.05], [HW - 0.05, 0.8, zfree], [HW - 0.028, 0.8, zfree + 0.05]], 0.006, 8, 16), P.darkSteel()));
  // check strap (canvas) from the door frame to the centre post (inside)
  {
    const zc = hingeAtFront ? z1 - 0.035 : z0 + 0.035;
    const zb = (D.doorR[1] + D.doorF[0]) / 2;
    const ys = hingeAtFront ? 0.62 : 0.74;
    const s = G.strap(
      [
        [HW - 0.024, ys, zc],
        [HW - 0.052, ys - 0.004, (zc + zb) / 2],
        [HW - 0.056, ys, zb],
      ],
      0.026,
      0.003,
      [0, 1, 0],
    );
    out.push(part(s, P.topCanvas()));
  }
  return out;
}

/**
 * Common door hinges on the centre post (TM E9-803 par. 120: both doors of a side hang on the
 * centre post by two hinge bolts in a common hinge): knuckle on the post, a leaf onto each door.
 */
function centreHinges(): THREE.Object3D[] {
  const paint = P.body();
  const out: THREE.Object3D[] = [];
  const zh = (D.doorR[1] + D.doorF[0]) / 2;
  const rv = G.rivetHead(0.0042);
  for (const yh of [D.doorBottom + 0.1, D.belt - 0.12]) {
    // post plate, two door leaves, knuckle, bolt head on top
    out.push(part(G.rbox(0.004, 0.06, 0.05, 0.0015, 1), paint, { p: [HW + 0.002, yh, zh] }));
    for (const s of [1, -1]) {
      out.push(part(G.rbox(0.004, 0.044, 0.06, 0.0015, 1), paint, { p: [HW + 0.0035, yh + s * 0.001, zh + s * 0.05] }));
      for (const dy of [0.012, -0.012]) out.push(part(rv.clone(), paint, { p: [HW + 0.0055, yh + dy, zh + s * 0.062], r: [0, 0, -90] }));
    }
    out.push(part(G.cyl(0.0068, 0.0068, 0.066, 14), paint, { p: [HW + 0.0075, yh, zh] }));
    out.push(part(G.cyl(0.0058, 0.0058, 0.005, 6), P.darkSteel(), { p: [HW + 0.0075, yh + 0.0355, zh] }));
    out.push(part(G.cyl(0.0035, 0.0035, 0.006, 8), P.darkSteel(), { p: [HW + 0.0075, yh - 0.035, zh] }));
  }
  // inner centre post (hat section behind the outer skin, floor to rim)
  out.push(part(G.rbox(0.05, D.belt - D.floorTop - 0.012, 0.044, 0.006, 2), paint, { p: [HW - t - 0.025, (D.belt + D.floorTop) / 2 - 0.006, zh] }));
  return out;
}

/** Rolled fillets, corner spheres and deck / slope panels (left half). */
function decksAndFillets(): THREE.Object3D[] {
  const paint = P.body();
  const out: THREE.Object3D[] = [];
  const xs = HW - D.rF, xr = HW - D.rR;
  const fil = (A: V3, B: V3, d1: V3, d2: V3, r: number) => part(filletGeo(A, B, d1, d2, r, t, 10), paint);

  // ---- front deck (with lid opening) -- full width, built once (not mirrored)
  // ---- side fillets (left)
  const dnDeckF: V3 = [0, -deckFDir[0], deckFDir[1]].map((v, i) => (i === 0 ? 0 : v)) as V3; // placeholder, replaced below
  void dnDeckF;
  // inward normal of the front deck in (x, y, z): perpendicular to the deck line, pointing down
  const inDeckF: V3 = [0, -deckFDir[0], deckFDir[1]];
  // deck line dir (0, dy, dz) = (0, deckFDir[1], deckFDir[0]); normal down = (0, -dz, dy) with dz>0 -> y negative
  inDeckF[1] = -deckFDir[0];
  inDeckF[2] = deckFDir[1];
  out.push(fil(onLine(D.cowl, deckFDir, 0, HW), onLine(D.cowl, deckFDir, L_dF - offBrkF, HW), inDeckF, [-1, 0, 0], D.rF));
  // face <-> side
  const inFace: V3 = [0, -faceDir[0], faceDir[1]];
  // face dir (0, fy, fz) = (0, -0.707, 0.707): inward (down/back) = (0, -fz, fy)
  inFace[1] = -faceDir[0];
  inFace[2] = faceDir[1];
  out.push(fil(onLine(D.brkF, faceDir, offBrkF, HW), onLine(D.brkF, faceDir, L_face - offNose, HW), inFace, [-1, 0, 0], D.rF));
  // rear deck <-> side
  out.push(fil(onLine(D.deckR, deckRDir, 0, HW), onLine(D.deckR, deckRDir, L_dR - offBrkR, HW), [0, -1, 0], [-1, 0, 0], D.rR));
  // slope <-> side: slope dir (0, sy, sz) = (0, -0.59, -0.81); inward = (0, -0.81, +0.59)
  const inSlope: V3 = [0, slopeDir[0], -slopeDir[1]];
  out.push(fil(onLine(D.brkR, slopeDir, offBrkR, HW), onLine(D.brkR, slopeDir, L_slope - offTail, HW), inSlope, [-1, 0, 0], D.rR));
  // corner spheres
  out.push(part(new THREE.SphereGeometry(D.rF, 24, 16), paint, { p: [xs, cornerF[1], cornerF[0]] }));
  out.push(part(new THREE.SphereGeometry(D.rR, 24, 16), paint, { p: [xr, cornerR[1], cornerR[0]] }));
  // lower front / rear corners: rounded corner piece tangent to the side and the face (slope),
  // flat underneath where it meets the nose pan (rear apron)
  // (only the outward quadrant: +X and forward / rearward)
  const lowCorner = (r: number, x: number, y: number, z: number, front: boolean) => {
    const dome = new THREE.SphereGeometry(r, 12, 8, front ? Math.PI / 2 : Math.PI, Math.PI / 2, 0, Math.PI / 2);
    out.push(part(dome, paint, { p: [x, y, z] }));
    out.push(part(new THREE.CircleGeometry(r, 12, front ? 0 : -Math.PI / 2, Math.PI / 2), paint, { p: [x, y + 0.0006, z], r: [90, 0, 0] }));
  };
  const Pa = atCoord(faceOff, 1, D.noseF[1]);
  lowCorner(D.rF, xs, D.noseF[1], Pa[0], true);
  const Pg = atCoord(slopeOff, 1, D.tailR[1]);
  lowCorner(D.rR, xr, D.tailR[1], Pg[0], false);
  return out;
}

/** Full-width pieces (not mirrored). */
function centrePanels(): THREE.Object3D[] {
  const paint = P.body();
  const out: THREE.Object3D[] = [];
  const xs = HW - D.rF, xr = HW - D.rR;
  const g = D.gap;

  // ---- front deck with lid opening
  const fdF = lineFrame(D.cowl, deckFDir);
  const vEnd = L_dF - offBrkF;
  const lid = { x: 0.48, v0: 0.045, v1: vEnd - 0.034 };
  const lidHole: V2[] = [
    [-lid.x - g, lid.v0 - g],
    [lid.x + g, lid.v0 - g],
    [lid.x + g, lid.v1 + g],
    [-lid.x - g, lid.v1 + g],
  ];
  out.push(slab([[-xs, 0], [xs, 0], [xs, vEnd], [-xs, vEnd]], t, fdF, paint, { holes: [lidHole], corner: 0 }));
  // lid (flush) with a rolled border feel (two beads) and handle
  out.push(slab([[-lid.x, lid.v0], [lid.x, lid.v0], [lid.x, lid.v1], [-lid.x, lid.v1]], t, fdF, paint, { corner: 0.025 }));
  const fdN = new THREE.Vector3(...fdF.n);
  const fdV = new THREE.Vector3(...fdF.v);
  const onDeck = (x: number, v: number, lift = 0) =>
    new THREE.Vector3(x, fdF.o[1], fdF.o[2]).addScaledVector(fdV, v).addScaledVector(fdN, lift);
  for (const x of [-0.25, 0.25]) out.push(part(beadGeo(onDeck(x, lid.v0 + 0.07), onDeck(x, lid.v1 - 0.07), fdF.n, 0.03, 0.004), paint));
  // hidden cavity under the lid (dark) so the panel gaps read as gaps
  out.push(slab([[-lid.x - 0.02, lid.v0 - 0.02], [lid.x + 0.02, lid.v0 - 0.02], [lid.x + 0.02, lid.v1 + 0.02], [-lid.x - 0.02, lid.v1 + 0.02]], 0.004, { ...fdF, o: [0, fdF.o[1] - 0.04, fdF.o[2]] }, P.black()));
  // lid hinges (at the cowl end) and the lock handle (front end)
  for (const x of [-0.34, 0.34]) {
    const p = onDeck(x, lid.v0 - g / 2, 0.004);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
    const hk = part(G.cyl(0.006, 0.006, 0.07, 12), paint);
    hk.position.copy(p);
    hk.quaternion.copy(q);
    out.push(hk);
    const leaf1 = part(G.rbox(0.07, 0.003, 0.04, 0.001, 1), paint);
    leaf1.position.copy(onDeck(x, lid.v0 + 0.02, 0.0015));
    leaf1.rotation.x = -Math.atan2(fdF.v[1], fdF.v[2]);
    out.push(leaf1);
  }
  {
    const p = onDeck(0, lid.v1 - 0.045, 0.0);
    const esc = part(G.cyl(0.02, 0.022, 0.006, 20), paint);
    esc.position.copy(p);
    esc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fdN);
    out.push(esc);
    const knob = part(G.rbox(0.07, 0.016, 0.018, 0.006, 2), P.darkSteel());
    knob.position.copy(onDeck(0, lid.v1 - 0.045, 0.016));
    knob.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fdN);
    out.push(knob);
    const stem = part(G.cyl(0.006, 0.006, 0.014, 10), P.darkSteel());
    stem.position.copy(onDeck(0, lid.v1 - 0.045, 0.008));
    stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), fdN);
    out.push(stem);
  }
  // cowl strip (horizontal, under the windscreen) between the deck and the dash
  out.push(part(G.rbox(2 * (HW - t), t, 0.03, 0.001, 1), paint, { p: [0, D.belt - t / 2, D.cowl[0] - 0.015] }));

  // ---- break fillet (deck/face) along X
  out.push(
    part(
      filletGeo([-xs, D.brkF[1], D.brkF[0]], [xs, D.brkF[1], D.brkF[0]], [0, -deckFDir[1], -deckFDir[0]], [0, faceDir[1], faceDir[0]], D.rF, t, 8),
      paint,
    ),
  );
  // ---- spare-wheel panel (front face)
  const ff = lineFrame(D.brkF, faceDir);
  out.push(slab([[-xs, offBrkF], [xs, offBrkF], [xs, L_face - offNose], [-xs, L_face - offNose]], t, ff, paint));
  // horizontal pressed beads across the face, either side of the spare wheel
  const ffN = new THREE.Vector3(...ff.n);
  const ffV = new THREE.Vector3(...ff.v);
  const onFace = (x: number, v: number, lift = 0) =>
    new THREE.Vector3(x, ff.o[1], ff.o[2]).addScaledVector(ffV, v).addScaledVector(ffN, lift);
  for (const s of [1, -1]) {
    out.push(part(beadGeo(onFace(s * 0.42, 0.1), onFace(s * 0.42, 0.47), ff.n, 0.03, 0.004), paint));
  }
  // ---- nose fillet + nose pan
  out.push(
    part(
      filletGeo([-xs, D.noseF[1], D.noseF[0]], [xs, D.noseF[1], D.noseF[0]], [0, -faceDir[1], -faceDir[0]], [0, 0, -1], rNose, t, 8),
      paint,
    ),
  );
  const zN0 = D.noseF[0] - offNose;
  const panFrame: Frame = { o: [0, D.noseF[1], 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] };
  const wx = D.whX - 0.003;
  out.push(
    slab(
      [
        [-(HW - t), zN0],
        [-(HW - t), 1.635],
        [-wx, 1.635],
        [-wx, 1.56],
        [wx, 1.56],
        [wx, 1.635],
        [HW - t, 1.635],
        [HW - t, zN0],
      ],
      t,
      panFrame,
      paint,
    ),
  );
  // step up from the nose pan to the compartment floor
  out.push(part(G.box(2 * wx, 0.05, t), paint, { p: [0, 0.425, 1.56] }));
  // front compartment floor
  out.push(slab([[-wx, 0.86], [wx, 0.86], [wx, 1.56], [-wx, 1.56]], t, { o: [0, 0.445, 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] }, paint));

  // ---- rear deck
  const rdF = lineFrame(D.deckR, deckRDir);
  out.push(slab([[-xr, 0], [xr, 0], [xr, L_dR - offBrkR], [-xr, L_dR - offBrkR]], t, rdF, paint));
  // rear cockpit rim along the deck front edge
  out.push(part(G.rod([-(HW - 0.004), D.belt - 0.004, D.deckR[0] - 0.004], [HW - 0.004, D.belt - 0.004, D.deckR[0] - 0.004], 0.0085, 14), paint));
  // rear break fillet
  out.push(
    part(
      filletGeo([-xr, D.brkR[1], D.brkR[0]], [xr, D.brkR[1], D.brkR[0]], [0, -deckRDir[1], -deckRDir[0]], [0, slopeDir[1], slopeDir[0]], D.rR, t, 8),
      paint,
    ),
  );
  // ---- engine panel with lid opening and louvred lid
  const sf = lineFrame(D.brkR, slopeDir);
  const eLid = { x: 0.47, v0: offBrkR + 0.05, v1: 0.7 };
  const eHole: V2[] = [
    [-eLid.x - g, eLid.v0 - g],
    [eLid.x + g, eLid.v0 - g],
    [eLid.x + g, eLid.v1 + g],
    [-eLid.x - g, eLid.v1 + g],
  ];
  out.push(slab([[-xr, offBrkR], [xr, offBrkR], [xr, L_slope - offTail], [-xr, L_slope - offTail]], t, sf, paint, { holes: [eHole] }));
  // louvre slots
  const slots: V2[][] = [];
  const slotH = 0.016, slotW = 0.3;
  const rows = 6;
  const slotV = (i: number) => eLid.v0 + 0.07 + i * 0.038;
  for (const cx of [-0.215, 0.215]) {
    for (let i = 0; i < rows; i++) {
      const v = slotV(i);
      slots.push([
        [cx - slotW / 2, v],
        [cx + slotW / 2, v],
        [cx + slotW / 2, v + slotH],
        [cx - slotW / 2, v + slotH],
      ]);
    }
  }
  out.push(slab([[-eLid.x, eLid.v0], [eLid.x, eLid.v0], [eLid.x, eLid.v1], [-eLid.x, eLid.v1]], t, sf, paint, { holes: slots, corner: 0.03 }));
  // louvre hoods: thin crescent shells over each slot (open towards the ground)
  const sfN = new THREE.Vector3(...sf.n);
  const sfV = new THREE.Vector3(...sf.v);
  const onSlope = (x: number, v: number, lift = 0) =>
    new THREE.Vector3(x, sf.o[1], sf.o[2]).addScaledVector(sfV, v).addScaledVector(sfN, lift);
  {
    // crescent in (v, n): arc from the slot top edge bulging out, ending above the slot bottom
    const cres: V2[] = [];
    const nSeg = 8;
    const hOut = 0.009;
    for (let i = 0; i <= nSeg; i++) {
      const a = (i / nSeg) * (Math.PI / 2);
      cres.push([slotH * (1 - Math.cos(a)) * 1.05, hOut * Math.sin(a)]);
    }
    for (let i = nSeg; i >= 0; i--) {
      const a = (i / nSeg) * (Math.PI / 2);
      cres.push([slotH * (1 - Math.cos(a)) * 1.05 + 0.0012 * Math.sin(a), hOut * Math.sin(a) - 0.0015 * Math.cos(a) - 0.0012]);
    }
    const hoods: THREE.BufferGeometry[] = [];
    for (const cx of [-0.215, 0.215]) {
      for (let i = 0; i < rows; i++) {
        const base = G.extrude(G.shape(cres), slotW - 0.004, 0.0004, 1, 1);
        // base: x = v offset, y = lift, z = along the slot -> map to (u=z, v=x, n=y)
        const p0 = onSlope(cx, slotV(i), 0);
        const m = new THREE.Matrix4().makeBasis(sfV, sfN, new THREE.Vector3(1, 0, 0)).setPosition(p0);
        base.applyMatrix4(m);
        if (m.determinant() < 0) G.flipWinding(base);
        hoods.push(base);
      }
    }
    out.push(part(merge(hoods), paint));
  }
  // dark engine-bay backing behind the lid (engine tin), so slots and gaps read dark
  out.push(slab([[-eLid.x - 0.03, eLid.v0 - 0.03], [eLid.x + 0.03, eLid.v0 - 0.03], [eLid.x + 0.03, eLid.v1 + 0.03], [-eLid.x - 0.03, eLid.v1 + 0.03]], 0.004, { ...sf, o: [0, sf.o[1] - 0.055 * sf.n[1], sf.o[2] - 0.055 * sf.n[2]] }, P.black()));
  // engine lid hinges (top) and handle (bottom)
  for (const x of [-0.3, 0.3]) {
    const hk = part(G.cyl(0.0065, 0.0065, 0.07, 12), paint);
    hk.position.copy(onSlope(x, eLid.v0 - g / 2, 0.004));
    hk.rotation.z = Math.PI / 2;
    out.push(hk);
  }
  {
    const esc = part(G.cyl(0.02, 0.022, 0.006, 20), paint);
    esc.position.copy(onSlope(0, eLid.v1 - 0.05, 0));
    esc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sfN);
    out.push(esc);
    const handle = part(G.rbox(0.09, 0.018, 0.02, 0.007, 2), P.darkSteel());
    handle.position.copy(onSlope(0, eLid.v1 - 0.05, 0.018));
    handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sfN);
    out.push(handle);
    const stem = part(G.cyl(0.006, 0.006, 0.016, 10), P.darkSteel());
    stem.position.copy(onSlope(0, eLid.v1 - 0.05, 0.009));
    stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sfN);
    out.push(stem);
  }
  // tail fillet + rear apron
  out.push(
    part(
      filletGeo([-xr, D.tailR[1], D.tailR[0]], [xr, D.tailR[1], D.tailR[0]], [0, -slopeDir[1], -slopeDir[0]], [0, 0, 1], rTail, t, 6),
      paint,
    ),
  );
  const zA0 = D.tailR[0] + offTail;
  const apron: Frame = { o: [0, D.tailR[1], 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] };
  out.push(slab([[-(HW - t), zA0], [HW - t, zA0], [HW - t, -1.6], [-(HW - t), -1.6]], t, apron, paint));
  // closing panels under the rear quarters, from the wheel-house end to the apron
  const zArch = D.zRA - Math.sqrt(D.archR ** 2 - (REAR_ARCH_Y - D.axleY) ** 2) - 0.004;
  for (const s of [1, -1]) {
    const xa = s * D.whX, xb = s * (HW - t);
    const pts: V2[] = s > 0 ? [[xa, -1.605], [xb, -1.605], [xb, zArch], [xa, zArch]] : [[xb, -1.605], [xa, -1.605], [xa, zArch], [xb, zArch]];
    out.push(slab(pts, t, { ...apron, o: [0, REAR_ARCH_Y + 0.004, 0] }, paint));
  }

  // ---- cockpit: dash, parcel shelf, toe board, floor, tunnel, rear bulkhead
  const zd = D.cowl[0] - 0.02; // dash face
  out.push(slab([[-(HW - t), 0.7], [HW - t, 0.7], [HW - t, D.belt], [-(HW - t), D.belt]], t, { o: [0, 0, zd], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, -1] }, paint));
  out.push(part(G.rod([-(HW - 0.004), D.belt - 0.004, zd - 0.004], [HW - 0.004, D.belt - 0.004, zd - 0.004], 0.0085, 14), paint));
  out.push(slab([[-(HW - t), zd], [HW - t, zd], [HW - t, 0.86], [-(HW - t), 0.86]], t, { o: [0, 0.7, 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0] }, paint));
  out.push(slab([[-(HW - t), D.floorTop], [HW - t, D.floorTop], [HW - t, 0.7], [-(HW - t), 0.7]], t, { o: [0, 0, 0.86], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, -1] }, paint));
  // floor pan (Dunkelgrau chassis) incl. underside
  out.push(part(G.rbox(2 * (HW - t), 0.005, 0.86 + 0.92, 0.002, 1), P.chassis(), { p: [0, D.sillY + 0.0025, (0.86 - 0.92) / 2] }));
  // rear bulkhead (behind the rear seat)
  out.push(slab([[-(HW - t), D.floorTop], [HW - t, D.floorTop], [HW - t, D.belt - 0.001], [-(HW - t), D.belt - 0.001]], t, { o: [0, 0, D.deckR[0]], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] }, paint));
  return out;
}

/** Wheel houses (left) : arch shell + inner wall. */
function wheelHouses(): THREE.Object3D[] {
  const paint = P.body();
  const out: THREE.Object3D[] = [];
  const R = D.archR;
  const depth = HW - t - D.whX;
  for (const [zc, frontY, rearY] of [
    [D.zFA, D.noseF[1], D.sillY],
    [D.zRA, D.sillY, REAR_ARCH_Y],
  ] as [number, number, number][]) {
    const aFront = Math.asin((frontY - D.axleY) / R);
    const aRear = Math.PI - Math.asin((rearY - D.axleY) / R);
    const outer = arc(zc, D.axleY, R + t, aFront, aRear, 36);
    const inner = arc(zc, D.axleY, R, aRear, aFront, 36);
    const f: Frame = { o: [HW - t, 0, 0], u: [0, 0, 1], v: [0, 1, 0], n: [1, 0, 0] };
    out.push(slab([...outer, ...inner], depth, f, paint, { bevel: 0.0005 }));
    // inner wall (closes the wheel house above the suspension)
    const yCut = 0.445;
    const a0 = Math.asin((yCut - D.axleY) / (R + t));
    const wall = arc(zc, D.axleY, R + t, a0, Math.PI - a0, 36);
    out.push(slab(wall, t, { o: [D.whX, 0, 0], u: [0, 0, 1], v: [0, 1, 0], n: [1, 0, 0] }, paint));
  }
  return out;
}

/** Tyre-pressure stencils above the arches (1.4 atu front, 1.8 atu rear per TM E9-803). */
function stencils(): THREE.Object3D[] {
  const draw = (txt: string) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(236,232,220,0.92)';
    ctx.font = `bold ${Math.round(h * 0.78)}px "Arial Narrow", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, w / 2, h * 0.54);
  };
  const out: THREE.Object3D[] = [];
  const f = decal('kubel-atu-f', 0.085, 0.02, draw('1,4 at\u00fc'), { p: [HW + 0.0022, 0.735, D.zFA - 0.02], r: [0, 90, 0] }, 256);
  const r = decal('kubel-atu-r', 0.085, 0.02, draw('1,8 at\u00fc'), { p: [HW + 0.0022, 0.755, D.zRA], r: [0, 90, 0] }, 256);
  out.push(f, r);
  return out;
}

export function buildBody(): THREE.Group {
  const left = group([
    ...sidePanel(),
    ...door(D.doorF[0], D.doorF[1], false),
    ...door(D.doorR[0], D.doorR[1], true),
    ...centreHinges(),
    ...decksAndFillets(),
    ...wheelHouses(),
  ]);
  const stL = group(stencils());
  // stencils: mirrored copy must read correctly -> build right-hand ones rotated, not mirrored
  const stR = group(stencils().map((m) => {
    m.position.x = -m.position.x;
    m.rotation.y = -m.rotation.y;
    return m;
  }));
  return group([mirrorX(left), ...centrePanels(), stL, stR]);
}

export const bodyRefs = { cornerF, cornerR, faceDir, deckFDir, slopeDir, L_face, L_dF, L_slope, offBrkF, offBrkR, lineFrame };
