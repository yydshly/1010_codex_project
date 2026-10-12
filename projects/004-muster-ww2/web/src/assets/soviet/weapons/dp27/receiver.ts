/**
 * DP-27 receiver group (D-frame, see layout.ts): machined receiver box, cocking-handle slot and
 * handle on the right (shown at the rear: the gun fires from an open bolt), barrel lock lever, pins,
 * lower front lug that takes the guide tube, ejection port underneath, the collar that holds the
 * barrel casing, and the sector rear sight with its leaf, slider, notch plate and protective ears.
 */
import { THREE, G, part } from '../../../../core/kit';
import { DP } from './layout';
import { rectRing, slottedScrew, type P2 } from './geo';
import { dpMat } from './materials';
import { sidePlate, frontPlate, cylX, latheZ, ringProfile } from '../common/geo';

export function buildReceiver(): THREE.Object3D[] {
  const blued = dpMat.blued();
  const dark = dpMat.void();
  const parts: THREE.Object3D[] = [];
  const hw = DP.rcvHW;

  // --- receiver box: rounded top edges, tighter bottom edges; intermediate stations keep wear local ---
  {
    const secs: { z: number; ring: P2[] }[] = [];
    const zs = [DP.rcvRear, DP.rcvRear + 0.0025];
    for (let z = DP.rcvRear + 0.02; z < DP.rcvFront - 0.01; z += 0.03) zs.push(z);
    zs.push(DP.rcvFront - 0.0025, DP.rcvFront);
    zs.forEach((z, i) => {
      const edge = i === 0 || i === zs.length - 1 ? 0.0012 : 0;
      secs.push({ z, ring: rectRing(hw - edge, DP.rcvTop - edge, DP.rcvBot + edge, 0.0065 - edge * 0.5, 0.0028, 5, 4) });
    });
    parts.push(part(G.loftZ(secs, true, 50), blued));
  }

  // --- right side (-X): cocking-handle slot with its lips, and the handle at the rear ---
  {
    const y = -0.0105, z0 = 0.318, z1 = 0.488;
    parts.push(part(G.box(0.0012, 0.0052, z1 - z0), dark, { p: [-hw - 0.0002, y, (z0 + z1) / 2] }));
    for (const s of [-1, 1]) parts.push(part(G.rbox(0.0014, 0.0013, z1 - z0 + 0.004, 0.0005, 1), blued, { p: [-hw - 0.0004, y + s * 0.0033, (z0 + z1) / 2] }));
    const hz = 0.341;
    parts.push(part(G.rbox(0.0125, 0.0056, 0.0105, 0.0016, 2), blued, { p: [-hw - 0.0055, y, hz] }));
    parts.push(part(G.rbox(0.0085, 0.0092, 0.0145, 0.0034, 2), blued, { p: [-hw - 0.0142, y + 0.0004, hz - 0.0012] }));
  }

  // --- barrel lock lever (right side, front) and pins ---
  parts.push(
    part(
      sidePlate([[0.574, 0.006], [0.586, 0.006], [0.588, 0.0], [0.586, -0.017], [0.578, -0.019], [0.574, -0.012]], 0.0034, -hw - 0.0014, 0.0007),
      blued,
    ),
  );
  parts.push(part(cylX(0.0036, -hw - 0.0034, -hw + 0.001, 16, 0.0005), blued, { p: [0, 0.0015, 0.58] }));
  for (const [z, y] of [[0.323, 0.009], [0.452, 0.012], [0.548, 0.012]] as [number, number][]) {
    parts.push(part(cylX(0.0022, -hw - 0.0005, hw + 0.0005, 12, 0.0003), blued, { p: [0, y, z] }));
  }

  // --- lower front lug (takes the guide tube and the casing), ejection port behind it ---
  parts.push(part(sidePlate([[0.548, DP.rcvBot + 0.001], [DP.rcvFront + 0.004, DP.rcvBot + 0.001], [DP.rcvFront + 0.004, -0.0355], [0.6, -0.0405], [0.556, -0.0405], [0.548, -0.034]], 0.026, 0, 0.0012), blued));
  parts.push(part(G.box(0.012, 0.0012, 0.044), dark, { p: [0, DP.rcvBot - 0.0001, 0.522] }));
  for (const s of [-1, 1]) parts.push(part(G.rbox(0.0014, 0.0014, 0.048, 0.0005, 1), blued, { p: [s * 0.0068, DP.rcvBot - 0.0004, 0.522] }));

  // --- collar at the receiver front that holds the casing ---
  parts.push(part(latheZ(ringProfile(DP.casingR - 0.0004, 0.0246, DP.rcvFront - 0.004, DP.rcvFront + 0.012, 0.0009), 40), blued));

  parts.push(...rearSight());
  return parts;
}

/** Sector rear sight on the receiver top, behind the pan: base, leaf, slider, notch plate, ears. */
function rearSight(): THREE.Object3D[] {
  const blued = dpMat.blued();
  const dark = dpMat.void();
  const parts: THREE.Object3D[] = [];
  const top = DP.rcvTop;
  const z0 = DP.sightRear, z1 = DP.sightFront;
  // base block
  parts.push(
    part(
      sidePlate([[z0, top - 0.001], [z1, top - 0.001], [z1, top + 0.004], [z1 - 0.006, top + 0.0095], [z0 + 0.002, top + 0.0095], [z0, top + 0.0075]], 0.024, 0, 0.0012),
      blued,
    ),
  );
  // screws holding the base
  for (const z of [z0 + 0.03, z1 - 0.012]) parts.push(part(slottedScrew(0.0026, 0.0007, 0.0007), blued, { p: [0, top + 0.0093, z], r: [0, 25, 0] }));
  // leaf lying on the base (hinged at the front), graduated top
  const ly = top + 0.0095;
  parts.push(part(G.rbox(0.0128, 0.0042, z1 - z0 - 0.02, 0.0012, 2), blued, { p: [0, ly + 0.0021, (z0 + z1) / 2 + 0.004] }));
  for (let i = 0; i < 13; i++) {
    const z = z0 + 0.022 + i * 0.0055;
    parts.push(part(G.box(0.0132, 0.0005, i % 2 === 0 ? 0.0009 : 0.0006), dark, { p: [0, ly + 0.0042, z] }));
  }
  // hinge knuckle at the front of the leaf
  parts.push(part(cylX(0.003, -0.0072, 0.0072, 14, 0.0004), blued, { p: [0, ly + 0.0022, z1 - 0.008] }));
  // slider with its two spring latches
  const sz = z0 + 0.043;
  parts.push(part(G.rbox(0.0172, 0.0078, 0.0125, 0.0014, 2), blued, { p: [0, ly + 0.0023, sz] }));
  for (const s of [-1, 1]) parts.push(part(G.rbox(0.0026, 0.0046, 0.0066, 0.0009, 1), blued, { p: [s * 0.0097, ly + 0.0024, sz] }));
  // notch plate at the rear end of the leaf, U notch in the top edge
  const notch: P2[] = [
    [-0.0085, 0],
    [0.0085, 0],
    [0.0085, 0.0185],
    [0.0072, 0.0205],
    [0.0014, 0.0205],
    [0.0012, 0.0168],
    [0.0, 0.016],
    [-0.0012, 0.0168],
    [-0.0014, 0.0205],
    [-0.0072, 0.0205],
    [-0.0085, 0.0185],
  ];
  parts.push(part(frontPlate(notch, 0.0042, z0 + 0.0115, 0.0005), blued, { p: [0, ly + 0.0005, 0] }));
  // protective ears either side of the notch plate
  const ear: P2[] = [
    [z0, top - 0.0005],
    [z0 + 0.03, top - 0.0005],
    [z0 + 0.03, top + 0.0095],
    [z0 + 0.021, top + 0.0215],
    [z0 + 0.0135, top + 0.0318],
    [z0 + 0.0065, top + 0.0322],
    [z0 + 0.0012, top + 0.0292],
    [z0, top + 0.024],
  ];
  for (const s of [-1, 1]) parts.push(part(sidePlate(ear, 0.0024, s * 0.0118, 0.0006), blued));
  return parts;
}

/** Pan (magazine) position helper: D-frame translation of the pan-local origin. */
export const PAN_ORIGIN = new THREE.Vector3(0, DP.panY, DP.panZ);
