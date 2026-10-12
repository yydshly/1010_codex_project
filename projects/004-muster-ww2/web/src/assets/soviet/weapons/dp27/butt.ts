/**
 * DP-27 butt stock and trigger group (D-frame, see layout.ts):
 * birch butt with the deep lower lobe and the long wrist, steel butt plate, screw cap on the comb,
 * rear sling swivel on the left side, the receiver's rear tang with the stock screw, trigger frame,
 * trigger guard, trigger and the automatic (grip) safety lever behind the guard.
 */
import { THREE, G, part } from '../../../../core/kit';
import { DP, stockRing, stockTop, stockHW } from './layout';
import { slottedScrew, type P2 } from './geo';
import { dpMat } from './materials';
import { sidePlate, frontPlate, cylX, latheX } from '../common/geo';

/** Side-view loop (outline with one hole) extruded along X by t, centred on x = 0. */
export function sideLoop(outer: P2[], inner: P2[], t: number, bevel: number): THREE.BufferGeometry {
  const g = G.extrude(G.shape(outer, 0, [inner]), t, bevel, 6, 1);
  g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  G.flipWinding(g);
  return g;
}

/** Stations along the stock: dense around the lobe so its steep front and rear read cleanly. */
function stockStations(): number[] {
  const zs: number[] = [];
  const push = (a: number, b: number, n: number) => {
    for (let i = 0; i < n; i++) zs.push(a + ((b - a) * i) / n);
  };
  push(DP.buttPlateT, 0.05, 6);
  push(0.05, 0.1, 12);
  push(0.1, 0.13, 4);
  push(0.13, 0.165, 14);
  push(0.165, DP.stockFront, 14);
  zs.push(DP.stockFront);
  return zs;
}

export function buildButt(): THREE.Object3D[] {
  const wood = dpMat.wood();
  const blued = dpMat.blued();
  const parts: THREE.Object3D[] = [];

  // --- wooden butt (lofted sections) ---
  const secs = stockStations().map((z) => ({ z, ring: stockRing(z) }));
  parts.push(part(G.loftZ(secs, true, 50), wood));

  // --- steel butt plate over the rear face ---
  const plateOutline = stockRing(0.0, 0.0004);
  parts.push(part(frontPlate(plateOutline, DP.buttPlateT, DP.buttPlateT / 2, 0.0009), blued));
  for (const y of [-0.004, -0.066]) {
    parts.push(part(slottedScrew(0.0036, 0.0011, 0.0009), blued, { p: [0, y, 0.0002], r: [-90, y < -0.03 ? 70 : 20, 0] }));
  }

  // --- screw cap on the comb ---
  {
    const z = 0.054, y = stockTop(z) - 0.0006;
    parts.push(part(G.lathe([[0, 0], [0.0074, 0], [0.0074, 0.0011], [0.0062, 0.0017], [0, 0.0017]], 24, 40), blued, { p: [0, y, z] }));
    parts.push(part(G.lathe([[0, 0], [0.0052, 0], [0.0052, 0.0032], [0.0046, 0.0041], [0, 0.0043]], 20, 40), blued, { p: [0, y + 0.0015, z] }));
    parts.push(part(G.box(0.0105, 0.0014, 0.0013), dpMat.void(), { p: [0, y + 0.0052, z], r: [0, 35, 0] }));
  }

  // --- rear sling swivel base, left side of the butt (the D-ring is part of the sling) ---
  {
    const z = DP.swivelRearZ, y = DP.swivelRearY, x = stockHW(z);
    const esc = G.extrude(G.shape(ovalPts(0.013, 0.0085, 20)), 0.0012, 0.0004, 6, 1);
    esc.rotateY(Math.PI / 2);
    parts.push(part(esc, blued, { p: [x + 0.0002, y, z] }));
    parts.push(part(cylX(0.0036, x, x + 0.0022, 16, 0.0005), blued, { p: [0, y, z] }));
    parts.push(part(cylX(0.0016, x + 0.002, x + 0.007, 10, 0.0002), dpMat.bare(), { p: [0, y, z] }));
    parts.push(part(latheX([[0, x + 0.0068], [0.0028, x + 0.0068], [0.0028, x + 0.0076], [0.002, x + 0.0084], [0, x + 0.0085]], 12), dpMat.bare(), { p: [0, y, z] }));
    for (const dz of [-0.0085, 0.0085]) parts.push(part(slottedScrew(0.0017, 0.0006, 0.0005), blued, { p: [x + 0.0012, y, z + dz], r: [0, 0, -90] }));
  }

  // --- receiver rear: tang over the wrist + the sloped rear end (narrow, the width of the wrist) ---
  {
    const t0 = stockTop(DP.tangRear), t1 = stockTop(0.262), t2 = stockTop(DP.stockFront);
    const outline: P2[] = [
      [DP.tangRear, -0.0165],
      [DP.tangRear, t0 + 0.0026],
      [0.262, t1 + 0.0027],
      [0.276, t2 + 0.0031],
      [0.282, 0.0022],
      [0.2955, 0.0165],
      [0.3005, 0.0218],
      [0.305, 0.0238],
      [0.307, 0.0238],
      [0.307, -0.021],
      [0.278, -0.021],
      [0.2745, -0.0175],
    ];
    const hw = stockHW(0.25) + 0.0008;
    parts.push(part(sidePlate(outline, hw * 2, 0, 0.0011), blued));
    // stock connecting screw through the tang cheeks: slotted head on the right, round end on the left
    parts.push(part(slottedScrew(0.0048, 0.0014, 0.0011), blued, { p: [-hw, DP.screwY, DP.screwZ], r: [0, 0, 90] }));
    parts.push(part(G.lathe([[0, 0], [0.0036, 0], [0.0034, 0.0006], [0.002, 0.0011], [0, 0.0012]], 16, 40), blued, { p: [hw, DP.screwY, DP.screwZ], r: [0, 0, -90] }));
  }

  // --- trigger frame (bottom of the receiver) ---
  {
    const outline: P2[] = [
      [0.2712, -0.024],
      [0.2712, -0.017],
      [0.279, -0.017],
      [0.2815, -0.02],
      [DP.frameFront, -0.02],
      [DP.frameFront, -0.0285],
      [DP.frameFront - 0.004, DP.frameBot],
      [0.3, DP.frameBot],
      [0.2885, -0.0362],
      [0.2795, -0.0405],
      [0.2738, -0.0434],
      [0.2712, -0.041],
    ];
    parts.push(part(sidePlate(outline, DP.frameHW * 2, 0, 0.0012), blued));
    // frame pins
    for (const [z, y] of [[0.31, -0.027], [0.482, -0.026]] as [number, number][]) {
      parts.push(part(cylX(0.0021, -DP.frameHW - 0.0004, DP.frameHW + 0.0004, 12, 0.0003), blued, { p: [0, y, z] }));
    }
  }

  // --- trigger guard: flat steel loop ---
  {
    const outer: P2[] = [
      [0.3195, -0.032],
      [0.3175, -0.0445],
      [0.3215, -0.0525],
      [0.3315, -0.0572],
      [0.3585, -0.0578],
      [0.378, -0.0552],
      [0.3875, -0.0478],
      [0.3915, -0.038],
      [0.3915, -0.032],
    ];
    const inner: P2[] = [
      [0.3245, -0.032],
      [0.3228, -0.0435],
      [0.3258, -0.0497],
      [0.3335, -0.0537],
      [0.3575, -0.0543],
      [0.3752, -0.0522],
      [0.3832, -0.0462],
      [0.3862, -0.0375],
      [0.3862, -0.032],
    ];
    parts.push(part(sideLoop(outer, inner, 0.0085, 0.0009), blued));
  }

  // --- trigger ---
  parts.push(
    part(
      sidePlate(
        [
          [0.3428, -0.0322],
          [0.3488, -0.0322],
          [0.3497, -0.0385],
          [0.3478, -0.0455],
          [0.3438, -0.0506],
          [0.3408, -0.0502],
          [0.3432, -0.0448],
          [0.3441, -0.0385],
        ],
        0.0055,
        0,
        0.0007,
      ),
      blued,
    ),
  );

  // --- automatic safety lever at the wrist, behind the guard ---
  parts.push(
    part(
      sidePlate(
        [
          [0.2965, -0.0322],
          [0.3155, -0.0322],
          [0.3145, -0.0372],
          [0.3075, -0.0412],
          [0.2995, -0.0408],
          [0.2958, -0.0372],
        ],
        0.0105,
        0,
        0.0011,
      ),
      blued,
    ),
  );
  return parts;
}

function ovalPts(a: number, b: number, n: number): P2[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return [a * Math.cos(t), b * Math.sin(t)] as P2;
  });
}
