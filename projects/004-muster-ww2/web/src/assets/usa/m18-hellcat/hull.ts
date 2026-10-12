/**
 * M18 welded hull: rolled plates with thickness - the 45 deg lower nose carrying the bolted
 * transmission access cover and final drive housings, the shallow upper glacis spanning the full width,
 * the inward-sloped upper side plates over the tracks, sponson floors, the roof with the 69 in turret
 * ring, drivers' hatches with periscopes, the engine deck (access doors, rear air grille, filler caps),
 * rear plate and belly, and weld beads.
 *
 * Frame: +Z forward, +X = the vehicle's left, y = 0 ground.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Pal } from './palette';
import { H, TURRET, SPROCKET } from './dims';
import { slab, roundedRing, latheX, boltRingX, nut, rb, uHandle, merge, circlePts, prism, D, type P2, type P3 } from './util';

const { xLow, xSideLow: xSL, xSideTop: xST, roof, sponson: ySp, belly } = H;

/** Upper side plate: x at height y (outer face). */
export const sideX = (y: number) => xSL - ((y - ySp) * (xSL - xST)) / (roof - ySp);
const SIDE_A = Math.atan2(xSL - xST, roof - ySp); // from vertical
/** outward normal of the left upper side plate */
export const SIDE_N: P3 = [Math.cos(SIDE_A), Math.sin(SIDE_A), 0];

const GL_A = Math.atan2(H.noseZ - H.glacisTopZ, roof - H.noseY); // from vertical
/** Glacis frame: a across (x), b measured DOWN the plate from its top edge, off along the normal. */
export const glacis = {
  n: [0, Math.sin(GL_A), Math.cos(GL_A)] as P3,
  len: Math.hypot(H.noseZ - H.glacisTopZ, roof - H.noseY),
  at: (a: number, b: number, off = 0): P3 => [
    a,
    roof - b * Math.cos(GL_A) + off * Math.sin(GL_A),
    H.glacisTopZ + b * Math.sin(GL_A) + off * Math.cos(GL_A),
  ],
};
const NOSE_A = Math.atan2(H.noseZ - H.bellyFrontZ, H.noseY - belly); // lower nose plate from vertical

/** Plate with a list of polygon holes, lying in XZ (thickness along Y, top face at y = 0). */
function deckPlate(outline: P2[], holes: P2[][], t: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(outline[0][0], outline[0][1]);
  for (const p of outline.slice(1)) s.lineTo(p[0], p[1]);
  s.closePath();
  for (const h of holes) {
    const p = new THREE.Path();
    p.moveTo(h[0][0], h[0][1]);
    for (const q of h.slice(1)) p.lineTo(q[0], q[1]);
    p.closePath();
    s.holes.push(p);
  }
  const g = G.extrude(s, t, 0.003, 1, 1);
  const m = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  g.applyMatrix4(m);
  G.flipWinding(g);
  g.translate(0, -t / 2, 0);
  return g;
}

/* ------------------------------------------------------------------------------ armour */
function armour(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const t = H.tPlate;
  // upper glacis, full width over the sponsons
  out.push(part(slab([[-xSL, H.noseY, H.noseZ], [xSL, H.noseY, H.noseZ], [xST, roof, H.glacisTopZ], [-xST, roof, H.glacisTopZ]], t, glacis.n, 0.005), P.paint));
  // lower nose plate (45 deg) between the tracks
  const nn = new THREE.Vector3(0, -(H.noseZ - H.bellyFrontZ), H.noseY - belly).normalize();
  out.push(part(slab([[-xLow, belly, H.bellyFrontZ], [xLow, belly, H.bellyFrontZ], [xLow, H.noseY, H.noseZ], [-xLow, H.noseY, H.noseZ]], t, [nn.x, nn.y, nn.z], 0.005), P.paint));
  for (const sx of [-1, 1]) {
    // upper side plates, sloped inwards
    out.push(part(slab([[sx * xSL, ySp, H.rearZ], [sx * xSL, ySp, H.noseZ - 0.004], [sx * xST, roof, H.glacisTopZ - 0.004], [sx * xST, roof, H.rearZ]], H.tSide, [sx * SIDE_N[0], SIDE_N[1], 0], 0.005), P.paint));
    // lower side plates between the tracks
    out.push(part(slab([[sx * xLow, belly, H.bellyRearZ], [sx * xLow, belly, H.bellyFrontZ], [sx * xLow, H.noseY, H.noseZ - 0.004], [sx * xLow, H.noseY, H.rearZ], [sx * xLow, H.rearLowY, H.rearZ]], H.tSide, [sx, 0, 0], 0.005), P.paint));
    // sponson floor over the track
    out.push(part(slab([[sx * (xLow - 0.005), ySp, H.rearZ + 0.004], [sx * (xSL - 0.004), ySp, H.rearZ + 0.004], [sx * (xSL - 0.004), ySp, H.noseZ - 0.01], [sx * (xLow - 0.005), ySp, H.noseZ - 0.01]], 0.01, [0, -1, 0], 0.003), P.paint));
  }
  // rear plate (vertical, full width above the sponson line, hull width below)
  out.push(part(slab([[-xSL, ySp, H.rearZ], [xSL, ySp, H.rearZ], [xST, roof, H.rearZ], [-xST, roof, H.rearZ]], t, [0, 0, -1], 0.005), P.paint));
  out.push(part(slab([[-xLow, H.rearLowY, H.rearZ], [xLow, H.rearLowY, H.rearZ], [xLow, ySp + 0.005, H.rearZ], [-xLow, ySp + 0.005, H.rearZ]], t, [0, 0, -1], 0.005), P.paint));
  const rn = new THREE.Vector3(0, -(H.bellyRearZ - H.rearZ), -(H.rearLowY - belly)).normalize();
  out.push(part(slab([[-xLow, H.rearLowY, H.rearZ], [-xLow, belly, H.bellyRearZ], [xLow, belly, H.bellyRearZ], [xLow, H.rearLowY, H.rearZ]], t, [rn.x, rn.y, rn.z], 0.005), P.paint));
  // belly
  out.push(part(slab([[-xLow, belly, H.bellyRearZ], [xLow, belly, H.bellyRearZ], [xLow, belly, H.bellyFrontZ], [-xLow, belly, H.bellyFrontZ]], t, [0, -1, 0], 0.004), P.paint));
  // roof / engine deck with the turret ring opening
  const ring = circlePts(TURRET.ringR - 0.02, 64, 0, TURRET.z, true);
  out.push(part(deckPlate([[-xST + 0.004, H.rearZ + 0.004], [xST - 0.004, H.rearZ + 0.004], [xST - 0.004, H.glacisTopZ - 0.004], [-xST + 0.004, H.glacisTopZ - 0.004]].map(([x, z]) => [x, z] as P2), [ring], H.tRoof), P.paint, { p: [0, roof, 0] }));
  // turret race ring flange round the opening
  out.push(part(latheX([[TURRET.ringR - 0.03, -0.012], [TURRET.ringR + 0.05, -0.012], [TURRET.ringR + 0.05, 0.012], [TURRET.ringR - 0.03, 0.012]], 64, 40), P.paint, { p: [0, roof + 0.005, TURRET.z], r: [0, 0, 90] }));

  // weld beads along the main joints
  const w: THREE.BufferGeometry[] = [];
  const bead = (pts: P3[], r = 0.0065) => w.push(G.weld(pts, r));
  for (const sx of [-1, 1]) {
    bead([[sx * (xSL + 0.001), ySp + 0.004, H.noseZ - 0.01], [sx * (xST + 0.001), roof - 0.004, H.glacisTopZ - 0.004]]);
    bead([[sx * (xSL + 0.001), ySp + 0.004, H.rearZ - 0.002], [sx * (xST + 0.001), roof - 0.004, H.rearZ - 0.002]]);
    bead([[sx * (xST - 0.004), roof + 0.003, H.glacisTopZ - 0.02], [sx * (xST - 0.004), roof + 0.003, H.rearZ + 0.01]], 0.0055);
    bead([[sx * (xSL - 0.003), ySp - 0.003, H.rearZ + 0.02], [sx * (xSL - 0.003), ySp - 0.003, H.noseZ - 0.03]], 0.005);
    bead([[sx * (xLow + 0.002), belly + 0.01, H.bellyFrontZ - 0.002], [sx * (xLow + 0.002), H.noseY - 0.01, H.noseZ - 0.012]], 0.006);
  }
  bead([[-xST + 0.02, roof + 0.004, H.glacisTopZ - 0.004], [xST - 0.02, roof + 0.004, H.glacisTopZ - 0.004]], 0.0065);
  bead([[-xSL + 0.02, H.noseY + 0.004, H.noseZ + 0.001], [xSL - 0.02, H.noseY + 0.004, H.noseZ + 0.001]], 0.007);
  bead([[-xST + 0.02, roof + 0.003, H.rearZ + 0.004], [xST - 0.02, roof + 0.003, H.rearZ + 0.004]], 0.0055);
  out.push(part(merge(w), P.paint));
  return out;
}

/* ------------------------------------------------------------------------------ nose */
function noseFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const n = new THREE.Vector3(0, -(H.noseZ - H.bellyFrontZ), H.noseY - belly).normalize();
  const L = Math.hypot(H.noseZ - H.bellyFrontZ, H.noseY - belly);
  const down = new THREE.Vector3(0, belly - H.noseY, H.bellyFrontZ - H.noseZ).normalize();
  const at = (x: number, b: number, off: number) => new THREE.Vector3(x, H.noseY, H.noseZ).addScaledVector(down, b).addScaledVector(n, off);
  const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), n, new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), n)));
  // bolted transmission access cover (raised plate) with its bolt row
  const cover = group([part(G.rbox(1.5, 0.018, L - 0.16, 0.008, 1), P.paint)]);
  cover.quaternion.copy(q);
  cover.position.copy(at(0, L / 2 - 0.02, 0.009));
  out.push(cover);
  const bolts: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (let i = 0; i <= 14; i++) {
    const x = -0.72 + (i / 14) * 1.44;
    bolts.push({ p: at(x, 0.1, 0.017), n }, { p: at(x, L - 0.14, 0.017), n });
  }
  for (let i = 1; i < 6; i++) for (const x of [-0.72, 0.72]) bolts.push({ p: at(x, 0.1 + (i / 6) * (L - 0.24), 0.017), n });
  out.push(part(G.scatter(nut(0.024, 0.009), bolts), P.paint));
  // lifting eyes on the cover
  for (const x of [-0.3, 0.3]) {
    const e = group([part(G.torus(0.035, 0.01, 8, 18, Math.PI), P.cast, { p: [0, 0.0, 0], r: [0, 0, 0] })]);
    e.quaternion.copy(q);
    e.position.copy(at(x, L * 0.45, 0.018));
    out.push(e);
  }
  // towing shackles on cast clevises near the bottom of the nose
  for (const x of [-0.6, 0.6]) {
    const p = at(x, L - 0.2, 0.0);
    const cl = group([
      part(rb(0.14, 0.1, 0.12, 0.015), P.cast, { p: [0, 0, 0.04] }),
      part(G.cyl(0.018, 0.018, 0.18, 10), P.toolSteel, { p: [0, 0.0, 0.11], r: [0, 0, 90] }),
      part(G.torus(0.055, 0.02, 10, 22, Math.PI * 1.2), P.toolSteel, { p: [0, -0.045, 0.14], r: [0, 90, 0] }),
    ]);
    cl.position.copy(p);
    cl.rotation.x = -(NOSE_A - Math.PI / 4) * 0.5;
    out.push(cl);
  }
  // final drive housings round the sprocket hubs, bolted to the lower hull sides
  for (const sx of [-1, 1]) {
    out.push(part(G.cyl(0.19, 0.2, 0.07, 36), P.cast, { p: [sx * (xLow + 0.035), SPROCKET.y, SPROCKET.z], r: [0, 0, 90] }));
    out.push(part(G.scatter(nut(0.022, 0.009), boltRingX(0.17, 12, sx * (xLow + 0.07), sx > 0 ? 1 : -1, 0.2)), P.cast, { p: [0, SPROCKET.y, SPROCKET.z] }));
  }
  return out;
}

/* ------------------------------------------------------------------------------ roof */
function periscope(P: Pal): THREE.Object3D {
  // M6 periscope in its rotating holder with a sheet guard; local +Y up, looking +Z
  return group([
    part(G.cyl(0.075, 0.08, 0.03, 24), P.cast, { p: [0, 0.015, 0] }),
    part(rb(0.07, 0.09, 0.15, 0.008), P.gun, { p: [0, 0.07, 0] }),
    part(G.box(0.055, 0.045, 0.004), P.vision, { p: [0, 0.085, 0.076] }),
    part(G.box(0.055, 0.004, 0.06), P.gun, { p: [0, 0.117, 0.05] }),
    part(G.tube([[-0.07, 0.0, 0.07], [-0.07, 0.13, 0.08], [0.07, 0.13, 0.08], [0.07, 0.0, 0.07]], 0.007, 6, 24), P.sheet),
  ]);
}

function driverHatch(P: Pal, sx: number): THREE.Object3D {
  // closed hatch, hinged on its outboard edge; local: +Y up, origin at the hatch centre on the roof
  const ps: THREE.Object3D[] = [];
  const lid = roundedRing([[-0.26, -0.24], [0.26, -0.24], [0.26, 0.24], [-0.26, 0.24]], [0.05, 0.05, 0.05, 0.05], 4, 1);
  ps.push(part(prism(lid, 0.025, 'xz', 0.006), P.paint, { p: [0, 0.014, 0] }));
  ps.push(part(prism(roundedRing([[-0.28, -0.26], [0.28, -0.26], [0.28, 0.26], [-0.28, 0.26]], [0.06, 0.06, 0.06, 0.06], 4, 1), 0.012, 'xz', 0.003), P.paint, { p: [0, 0.004, 0] }));
  // hinges on the outboard edge
  for (const z of [-0.15, 0.15]) {
    ps.push(part(G.cyl(0.022, 0.022, 0.09, 12), P.paint, { p: [sx * 0.275, 0.028, z], r: [90, 0, 0] }));
    ps.push(part(rb(0.07, 0.014, 0.08, 0.004), P.paint, { p: [sx * 0.235, 0.03, z] }));
  }
  ps.push(part(uHandle(0.12, 0.035, 0.008), P.paint, { p: [-sx * 0.15, 0.026, 0] }));
  // periscope in the hatch lid
  ps.push(group([periscope(P)], { p: [0, 0.026, 0.09] }));
  return group(ps);
}

function roofFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const hz = 1.3;
  for (const sx of [-1, 1]) out.push(group([driverHatch(P, sx)], { p: [sx * 0.46, roof, hz] }));
  // ventilator between the hatches
  out.push(part(G.cyl(0.1, 0.11, 0.05, 24), P.paint, { p: [0, roof + 0.025, hz + 0.1] }));
  out.push(part(latheX([[0.0, 0.0], [0.11, 0.0], [0.105, 0.02], [0.06, 0.04], [0.0, 0.045]], 24, 40), P.paint, { p: [0, roof + 0.05, hz + 0.1], r: [0, 0, 90] }));
  // lifting eyes at the roof corners
  for (const sx of [-1, 1]) for (const z of [1.62, -2.5]) {
    out.push(part(G.lathe([[0.0, 0.0], [0.05, 0.0], [0.045, 0.02], [0.025, 0.03], [0.0, 0.03]], 16, 40), P.cast, { p: [sx * 1.1, roof, z] }));
    out.push(part(G.torus(0.035, 0.011, 8, 18), P.cast, { p: [sx * 1.1, roof + 0.05, z], r: [0, 90, 0] }));
  }
  return out;
}

/* ------------------------------------------------------------------------------ engine deck */
function engineDeck(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = roof;
  // two engine access doors (raised plates) with hinges on the centre line and lifting handles
  for (const sx of [-1, 1]) {
    const x0 = sx * 0.06, x1 = sx * 0.86;
    const cx = (x0 + x1) / 2;
    out.push(part(G.rbox(0.8, 0.016, 0.64, 0.006, 1), P.paint, { p: [cx, y + 0.008, -1.66] }));
    for (const z of [-1.45, -1.87]) {
      out.push(part(G.cyl(0.018, 0.018, 0.1, 10), P.paint, { p: [sx * 0.05, y + 0.02, z], r: [90, 0, 0] }));
      out.push(part(rb(0.1, 0.01, 0.07, 0.003), P.paint, { p: [sx * 0.11, y + 0.02, z] }));
    }
    out.push(part(uHandle(0.14, 0.04, 0.009), P.paint, { p: [sx * 0.7, y + 0.016, -1.66], r: [0, 90, 0] }));
    // fuel filler cap with its splash ring, outboard
    out.push(part(G.cyl(0.085, 0.09, 0.02, 24), P.paint, { p: [sx * 1.06, y + 0.01, -1.55] }));
    out.push(part(G.cyl(0.06, 0.065, 0.035, 20), P.cast, { p: [sx * 1.06, y + 0.035, -1.55] }));
    out.push(part(rb(0.07, 0.015, 0.02, 0.004), P.cast, { p: [sx * 1.06, y + 0.058, -1.55] }));
  }
  // rear air grille across the deck: frame, longitudinal slats and the dark well beneath
  const gz0 = -2.05, gz1 = -2.56, gw = 1.02;
  const gzc = (gz0 + gz1) / 2, gl = gz0 - gz1;
  out.push(part(G.box(2 * gw - 0.04, 0.01, gl - 0.04), P.void, { p: [0, y - 0.03, gzc] }));
  for (const sx of [-1, 1]) out.push(part(rb(0.05, 0.035, gl, 0.006), P.paint, { p: [sx * gw, y + 0.017, gzc] }));
  for (const z of [gz0, gz1]) out.push(part(rb(2 * gw + 0.05, 0.035, 0.05, 0.006), P.paint, { p: [0, y + 0.017, z] }));
  out.push(part(rb(0.05, 0.035, gl, 0.006), P.paint, { p: [0, y + 0.017, gzc] }));
  const slats: THREE.BufferGeometry[] = [];
  const nS = 30;
  for (let i = 0; i < nS; i++) {
    const x = -gw + 0.05 + (i / (nS - 1)) * (2 * gw - 0.1);
    if (Math.abs(x) < 0.035) continue;
    const s = G.box(0.007, 0.04, gl - 0.05);
    s.rotateZ(28 * D);
    s.translate(x, y + 0.004, gzc);
    slats.push(s);
  }
  out.push(part(merge(slats), P.sheet));
  // grille hinge brackets and lift handles
  for (const sx of [-1, 1]) out.push(part(uHandle(0.12, 0.04, 0.008), P.paint, { p: [sx * 0.5, y + 0.034, gz1 + 0.06] }));
  return out;
}

/* ------------------------------------------------------------------------------ rear plate */
function rearFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z = H.rearZ;
  // engine access plate on the lower rear with bolts
  out.push(part(rb(1.3, 0.34, 0.02, 0.008), P.paint, { p: [0, 0.86, z - 0.01] }));
  const bolts: G.V3[] = [];
  for (let i = 0; i <= 10; i++) bolts.push([-0.62 + i * 0.124, 0.71, z - 0.02], [-0.62 + i * 0.124, 1.01, z - 0.02]);
  out.push(part(G.scatter(nut(0.022, 0.008), bolts.map((p) => ({ p, n: [0, 0, -1] as G.V3 }))), P.paint));
  // exhaust outlets with heat-darkened pipes turning down
  for (const sx of [-1, 1]) {
    const x = sx * 0.42;
    out.push(part(G.cyl(0.1, 0.1, 0.025, 24), P.exhaust, { p: [x, 1.2, z - 0.012], r: [90, 0, 0] }));
    out.push(part(G.tube([[x, 1.2, z - 0.015], [x, 1.2, z - 0.06], [x, 1.15, z - 0.1], [x, 1.05, z - 0.11]], 0.06, 16, 24), P.exhaust));
    out.push(part(G.cyl(0.05, 0.05, 0.01, 16), P.void, { p: [x, 1.045, z - 0.11] }));
    // guard hoop round each outlet
    out.push(part(G.tube([[x - 0.1, 1.3, z], [x - 0.1, 1.3, z - 0.17], [x - 0.1, 1.0, z - 0.17], [x + 0.1, 1.0, z - 0.17], [x + 0.1, 1.3, z - 0.17], [x + 0.1, 1.3, z]], 0.009, 6, 60), P.sheet));
  }
  // towing pintle and lugs
  out.push(part(rb(0.22, 0.16, 0.05, 0.015), P.cast, { p: [0, 0.62, z - 0.02] }));
  out.push(part(prism([[0, -0.03], [0.13, -0.03], [0.18, 0.02], [0.14, 0.07], [0.1, 0.03], [0, 0.04]], 0.07, 'zy', 0.01), P.cast, { p: [0, 0.6, z - 0.03], r: [0, 180, 0] }));
  out.push(part(G.torus(0.05, 0.016, 8, 20, Math.PI * 1.3), P.toolSteel, { p: [0, 0.63, z - 0.15], r: [0, 90, 0] }));
  for (const sx of [-1, 1]) {
    out.push(part(prism([[0, -0.05], [0.1, -0.04], [0.14, 0.0], [0.1, 0.05], [0, 0.06]], 0.07, 'zy', 0.012), P.cast, { p: [sx * 0.72, 0.6, z - 0.005], r: [0, 180, 0] }));
    out.push(part(G.cyl(0.028, 0.028, 0.075, 14), P.void, { p: [sx * 0.72, 0.605, z - 0.085], r: [0, 0, 90] }));
  }
  return out;
}

export function hull(P: Pal): THREE.Group {
  return group([...armour(P), ...noseFittings(P), ...roofFittings(P), ...engineDeck(P), ...rearFittings(P)], { name: 'hull' });
}
