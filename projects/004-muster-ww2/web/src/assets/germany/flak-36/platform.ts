/**
 * Cross platform (Kreuzlafette 36) in the firing position: square central box, the fixed fore-aft
 * beam (front and rear arms identical), both side outriggers lowered, a levelling jack with a round
 * foot pad at every arm end (pads on y = 0) and the bogie coupling lugs at the fore-aft ends
 * (Sonderanhaenger 202 bogies removed).
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './palette';
import { D } from './dims';
import { latheX, cylX, cylY, cylZ, bolts, v3, type V2 } from './util';

/** Levelling jack at (x, z): pad on the ground, spindle through the arm end, crank on top. */
function jack(P: Palette, x: number, z: number, armBot: number, armTop: number, crankDeg: number): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const r = D.padR, t = D.padT;
  const pad: V2[] = [
    [0, 0], [r - 0.012, 0], [r, 0.01], [r, t - 0.01], [r - 0.012, t], [0.085, t + 0.004], [0.07, t + 0.03], [0, t + 0.03],
  ];
  o.push(part(G.lathe(pad, 40, 40), P.worn, { p: [x, 0, z] }));
  // ball seat
  o.push(part(new THREE.SphereGeometry(0.042, 20, 12), P.steel, { p: [x, t + 0.045, z] }));
  // screw spindle and housing tube through the arm end
  o.push(part(cylY(0.028, t + 0.06, armTop + 0.13, 16, x, z), P.bright));
  o.push(part(cylY(0.062, armBot - 0.07, armTop + 0.05, 28, x, z, 0.006), P.cast));
  o.push(part(cylY(0.072, armBot - 0.075, armBot - 0.05, 28, x, z, 0.004), P.cast));
  o.push(part(cylY(0.072, armTop + 0.03, armTop + 0.06, 28, x, z, 0.004), P.cast));
  // crank: boss on the spindle, arm and grip
  const yT = armTop + 0.13;
  o.push(part(cylY(0.04, yT - 0.02, yT + 0.03, 20, x, z, 0.005), P.steel));
  const a = (crankDeg * Math.PI) / 180;
  const ex = x + Math.cos(a) * 0.19, ez = z + Math.sin(a) * 0.19;
  o.push(part(G.rod([x, yT + 0.01, z], [ex, yT + 0.01, ez], 0.013, 10), P.steel));
  o.push(part(G.lathe([[0, 0], [0.013, 0.002], [0.015, 0.02], [0.013, 0.085], [0.008, 0.095], [0, 0.096]], 14, 50), P.grip, { p: [ex, yT + 0.015, ez] }));
  return o;
}

/** Fore-aft beam through the central box (both arms), with top flange and end lugs. */
function foreAftBeam(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const E = D.beamEnd, w = D.beamHalfW * 2;
  const outline: V2[] = [
    [-E, D.beamBotE], [-D.boxHalf, D.beamBotC], [D.boxHalf, D.beamBotC], [E, D.beamBotE],
    [E, D.beamTop - 0.04], [E - 0.05, D.beamTop], [-E + 0.05, D.beamTop], [-E, D.beamTop - 0.04],
  ];
  o.push(part(G.plate(outline, w, 'zy', 0.008), P.paint));
  // top flange strip and bottom flange strips along the sloping underside
  o.push(part(G.rbox(w + 0.036, 0.014, 2 * E - 0.12, 0.005, 1), P.paint, { p: [0, D.beamTop + 0.006, 0] }));
  for (const s of [1, -1]) {
    const z0 = s * D.boxHalf, z1 = s * (E - 0.08);
    const y0 = D.beamBotC - 0.006, y1 = D.beamBotC + ((D.beamBotE - D.beamBotC) * (Math.abs(z1) - D.boxHalf)) / (E - D.boxHalf) - 0.006;
    const len = Math.hypot(z1 - z0, y1 - y0);
    const ang = Math.atan2(y1 - y0, Math.abs(z1 - z0));
    o.push(part(G.rbox(w + 0.03, 0.014, len, 0.005, 1), P.paint, { p: [0, (y0 + y1) / 2, (z0 + z1) / 2], r: [(-s * ang * 180) / Math.PI, 0, 0] }));
    // side stiffeners (vertical ribs)
    for (const zz of [1.1, 1.65, 2.15]) {
      const yb = D.beamBotC + ((D.beamBotE - D.beamBotC) * (zz - D.boxHalf)) / (E - D.boxHalf);
      for (const sx of [1, -1]) o.push(part(G.rbox(0.012, D.beamTop - yb - 0.01, 0.05, 0.003, 1), P.paint, { p: [sx * (D.beamHalfW + 0.006), (D.beamTop + yb) / 2, s * zz] }));
    }
    // bogie coupling lug at the arm end (the bogie is removed for firing)
    o.push(part(G.rbox(0.2, 0.12, 0.14, 0.012, 2), P.cast, { p: [0, 0.35, s * (E + 0.05)] }));
    o.push(part(cylX(0.03, -0.13, 0.13, 16, 0.35, s * (E + 0.08), 0.004), P.steel));
    // folded barrel support (travel crutch) lying on the arm top
    o.push(part(G.rbox(0.07, 0.035, 0.7, 0.008, 2), P.paint, { p: [0, D.beamTop + 0.03, s * 1.6] }));
    o.push(part(cylX(0.022, -0.06, 0.06, 14, D.beamTop + 0.03, s * 1.25, 0.003), P.steel));
  }
  return o;
}

/** One side outrigger (built on the +X side; mirrored for -X). */
function sideOutrigger(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const x0 = D.sideHingeX, x1 = D.sideEnd, w = D.sideHalfW * 2;
  const outline: V2[] = [
    [x0, D.sideBotR], [x1, D.sideBotE], [x1, D.sideTopE - 0.035], [x1 - 0.05, D.sideTopE], [x0 + 0.06, D.sideTopR], [x0, D.sideTopR - 0.04],
  ];
  o.push(part(G.plate(outline, w, 'xy', 0.008), P.paint));
  // top flange
  const len = x1 - x0 - 0.12;
  const ang = Math.atan2(D.sideTopE - D.sideTopR, x1 - x0);
  o.push(part(G.rbox(len, 0.014, w + 0.032, 0.005, 1), P.paint, { p: [(x0 + x1) / 2 + 0.01, (D.sideTopR + D.sideTopE) / 2 + 0.005, 0], r: [0, 0, (ang * 180) / Math.PI] }));
  // stiffeners
  for (const xx of [1.25, 1.8]) {
    const f = (xx - x0) / (x1 - x0);
    const yb = D.sideBotR + (D.sideBotE - D.sideBotR) * f, yt = D.sideTopR + (D.sideTopE - D.sideTopR) * f;
    for (const sz of [1, -1]) o.push(part(G.rbox(0.05, yt - yb - 0.012, 0.012, 0.003, 1), P.paint, { p: [xx, (yt + yb) / 2, sz * (D.sideHalfW + 0.006)] }));
  }
  // hinge: tube on the outrigger root, lugs on the central box, pin
  o.push(part(cylZ(0.05, -D.sideHalfW + 0.005, D.sideHalfW - 0.005, 24, x0 + 0.01, D.sideTopR - 0.05, 0.004), P.cast));
  for (const sz of [1, -1]) {
    o.push(part(G.rbox(0.07, 0.13, 0.07, 0.01, 2), P.cast, { p: [D.boxHalf + 0.02, D.sideTopR - 0.07, sz * (D.sideHalfW + 0.04)] }));
  }
  o.push(part(cylZ(0.022, -D.sideHalfW - 0.1, D.sideHalfW + 0.1, 14, x0 + 0.01, D.sideTopR - 0.05, 0.003), P.steel));
  // locking strut under the root (props the arm against the box)
  o.push(part(G.rbox(0.09, 0.06, 0.12, 0.01, 2), P.cast, { p: [D.boxHalf + 0.03, D.sideBotR + 0.02, 0] }));
  // earth-stake holder: bracket with a stowed stake along the arm side
  o.push(part(G.rbox(0.9, 0.03, 0.03, 0.008, 1), P.bright, { p: [1.65, 0.3, D.sideHalfW + 0.03] }));
  for (const xx of [1.35, 1.95]) o.push(part(G.rbox(0.04, 0.05, 0.03, 0.006, 1), P.paint, { p: [xx, 0.3, D.sideHalfW + 0.012] }));
  return o;
}

function centralBox(P: Palette): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const h = D.boxTop - D.boxBot, b = D.boxHalf * 2;
  o.push(part(G.rbox(b, h - 0.02, b, 0.03, 3), P.paint, { p: [0, D.boxBot + (h - 0.02) / 2, 0] }));
  o.push(part(G.rbox(b + 0.04, 0.022, b + 0.04, 0.008, 2), P.paint, { p: [0, D.boxTop - 0.011, 0] }));
  // bolt row round the top plate edge
  const bp: THREE.Vector3[] = [];
  for (let i = 0; i < 7; i++) {
    const t = -0.5 + (i + 0.5) * (1.0 / 7) * 1.0;
    const q = t * (b - 0.1);
    bp.push(v3(q, D.boxTop, D.boxHalf - 0.02), v3(q, D.boxTop, -D.boxHalf + 0.02), v3(D.boxHalf - 0.02, D.boxTop, q), v3(-D.boxHalf + 0.02, D.boxTop, q));
  }
  o.push(part(bolts(bp, [0, 1, 0], 0.024, 0.01), P.paint));
  // corner gussets below the top edge
  for (const sx of [1, -1]) for (const sz of [1, -1]) {
    o.push(part(G.rbox(0.05, h - 0.06, 0.05, 0.01, 1), P.paint, { p: [sx * (D.boxHalf - 0.005), D.boxBot + h / 2 - 0.01, sz * (D.boxHalf - 0.005)] }));
  }
  void latheX;
  return o;
}

export function buildPlatform(P: Palette): THREE.Group {
  const parts: THREE.Object3D[] = [...centralBox(P), ...foreAftBeam(P)];
  parts.push(mirrorX(group(sideOutrigger(P))));
  // jacks at the four arm ends (arm end bottom/top heights)
  for (const s of [1, -1]) {
    const f = (D.jackZ - D.boxHalf) / (D.beamEnd - D.boxHalf);
    const bot = D.beamBotC + (D.beamBotE - D.beamBotC) * f;
    parts.push(group(jack(P, 0, s * D.jackZ, bot, D.beamTop, s > 0 ? 35 : 215)));
  }
  for (const s of [1, -1]) {
    const f = (D.sideJackX - D.sideHingeX) / (D.sideEnd - D.sideHingeX);
    const bot = D.sideBotR + (D.sideBotE - D.sideBotR) * f;
    const top = D.sideTopR + (D.sideTopE - D.sideTopR) * f;
    parts.push(group(jack(P, s * D.sideJackX, 0, bot, top, s > 0 ? 120 : 300)));
  }
  return group(parts, { name: 'f36-platform' });
}
