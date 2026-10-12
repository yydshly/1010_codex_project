/**
 * MG 42 butt stock (Schulterstuetze): moulded Bakelite (or beech) with the deep, curved butt
 * and the strong concave curve under the front for the gunner's left hand, a steel butt cap
 * with the stock screw, and the steel front ferrule that locks onto the receiver end cap.
 * B-frame (see util.ts).
 */
import { THREE, G, part } from '../../../../core/kit';
import type { Mg42Mats } from './materials';
import { D } from './dims';
import { cylX, latheZ, slottedScrew, warp, type V2 } from './util';

/** [z, top y, bottom y, width, super-ellipse exponent] */
const PROFILE: [number, number, number, number, number][] = [
  [0.004, -0.006, -0.15, 0.044, 3.0],
  [0.02, -0.0055, -0.1495, 0.045, 3.0],
  [0.05, -0.004, -0.147, 0.0455, 2.9],
  [0.08, -0.0025, -0.1395, 0.0455, 2.8],
  [0.11, -0.001, -0.1245, 0.0445, 2.7],
  [0.14, 0.0012, -0.1035, 0.0435, 2.6],
  [0.17, 0.0042, -0.0815, 0.043, 2.5],
  [0.2, 0.0082, -0.0615, 0.0438, 2.4],
  [0.224, 0.0125, -0.0445, 0.0462, 2.2],
  [0.243, 0.0172, -0.0302, 0.0478, 2.0],
];

/** Depth of the concave butt (heel and toe project rearwards by this much). */
export const BUTT_CURVE = 0.009;
export const BUTT_TOP = -0.006;
export const BUTT_BOTTOM = -0.15;
const BUTT_MID = (BUTT_TOP + BUTT_BOTTOM) / 2;
const BUTT_HALF = (BUTT_TOP - BUTT_BOTTOM) / 2;

/** z offset of the concave butt face at height y (0 at heel/toe, BUTT_CURVE at the middle). */
function buttCurve(y: number): number {
  const s = Math.min(1, Math.abs((y - BUTT_MID) / BUTT_HALF));
  return BUTT_CURVE * (1 - s * s);
}

export function buildStock(mats: Mg42Mats): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const sections = PROFILE.map(([z, top, bot, w, e]) => {
    const hh = (top - bot) / 2;
    return { z, ring: G.superRing(w / 2, hh, 40, e), dy: (top + bot) / 2 };
  });
  const body = G.loftZ(sections, true, 50);
  // concave butt: pull the rear face forward in the middle; fade out over 40 mm
  warp(body, (p) => {
    const f = Math.max(0, 1 - (p.z - 0.004) / 0.04);
    p.z += buttCurve(p.y) * f;
  });
  body.computeVertexNormals();
  out.push(part(G.crease(body, 50), mats.stock));

  // steel butt cap following the concave face, with a short rim onto the stock
  const capRing: V2[] = G.superRing(0.0232, BUTT_HALF + 0.0012, 40, 3.0).map(([x, y]) => [x, y + BUTT_MID]);
  const capSecs = [
    { z: 0.0, ring: capRing.map(([x, y]) => [x * 0.93, BUTT_MID + (y - BUTT_MID) * 0.97] as V2) },
    { z: 0.0012, ring: capRing },
    { z: 0.0062, ring: capRing },
  ];
  const cap = G.loftZ(capSecs, true, 60);
  warp(cap, (p) => {
    p.z += buttCurve(p.y);
  });
  cap.computeVertexNormals();
  out.push(part(G.crease(cap, 50), mats.phos));
  // stock screw through the cap (later pattern) and two small cap screws
  const midZ = buttCurve(BUTT_MID);
  out.push(slottedScrew(0.0052, 0.0022, mats.blued, mats.dark, { p: [0, BUTT_MID, midZ + 0.0002], r: [-90, 0, 0] }, 35));
  // (the upper cap screw sits under the folded shoulder rest)
  for (const y of [BUTT_BOTTOM + 0.018]) {
    out.push(slottedScrew(0.0032, 0.0014, mats.blued, mats.dark, { p: [0, y, buttCurve(y) + 0.0002], r: [-90, 0, 0] }, y > BUTT_MID ? 80 : 10));
  }

  // folding shoulder rest (Schulterstuetze): stamped flap hinged across the top of the butt cap,
  // folded down against the upper part of the concave butt face
  {
    const hingeY = BUTT_TOP - 0.0012, hingeZ = -0.0032;
    out.push(part(cylX(0.0034, 0.028, 16), mats.phos, { p: [0, hingeY, hingeZ] }));
    out.push(part(cylX(0.0016, 0.0335, 10), mats.blued, { p: [0, hingeY, hingeZ] }));
    for (const s of [1, -1]) out.push(part(cylX(0.0027, 0.0012, 14), mats.blued, { p: [s * 0.0172, hingeY, hingeZ] }));
    const flap = new THREE.BoxGeometry(0.037, 0.05, 0.0026, 1, 12, 1);
    flap.translate(0, hingeY - 0.0035 - 0.025, 0);
    warp(flap, (p) => {
      // rounded lower corners and a pressed centre rib, following the concave butt face
      const u = Math.abs(p.x) / 0.0185, v = (hingeY - 0.0035 - p.y) / 0.05;
      if (v > 0.8) p.x *= 1 - 0.35 * ((v - 0.8) / 0.2) ** 2;
      p.z += buttCurve(p.y) - 0.0014 - (p.z < 0 ? 0.0009 * Math.max(0, 1 - u * 3) : 0);
    });
    flap.computeVertexNormals();
    out.push(part(flap, mats.phos));
  }

  // front ferrule (steel socket with bayonet lugs) that locks onto the receiver end cap
  const fer = latheZ(
    [
      [0, D.capRear - 0.012],
      [0.0236, D.capRear - 0.012],
      [0.0246, D.capRear - 0.009],
      [0.0246, D.capRear + 0.001],
      [0.0252, D.capRear + 0.003],
      [0.0252, D.capRear + 0.011],
      [0.0238, D.capRear + 0.014],
      [0, D.capRear + 0.014],
    ],
    40,
    35,
  );
  out.push(part(fer, mats.phos, { p: [0, D.capY, 0] }));
  // grip grooves around the ferrule (turned by hand to remove the stock)
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    out.push(
      part(G.rbox(0.0018, 0.0014, 0.007, 0.0005, 1), mats.phos, {
        p: [Math.cos(a) * 0.0253, D.capY + Math.sin(a) * 0.0253, D.capRear + 0.007],
        r: [0, 0, (a * 180) / Math.PI],
      }),
    );
  }
  return out;
}

/** Lowest rear point (toe) of the stock, B-frame. */
export const STOCK_TOE = new THREE.Vector3(0, BUTT_BOTTOM, 0.004);
/** Centre of the butt plate (shoulder contact), B-frame. */
export const BUTT_CENTRE = new THREE.Vector3(0, BUTT_MID, BUTT_CURVE);
