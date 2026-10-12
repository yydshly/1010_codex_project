/**
 * External fittings of the Universal Carrier Mk II: headlamps with blackout hoods on brackets at the
 * top of the upper nose plate, front towing eyes on the lower nose, a bolted inspection plate, spare
 * track links clamped on the upper nose, the rear towing hitch (Mk II) on its bracket, tail lamps on the
 * rear plate.
 */
import { THREE, G } from '../../../core/kit';
import type { Pal } from './palette';
import { H, TRACK } from './dims';
import { glacis } from './hull';
import { linkGeometry } from './track';
import { Bucket, rb, cylX, cylZ, nut, latheZ, prism, surfaceFrame, bentRod, type P3 } from './util';

function headlamp(B: Bucket, P: Pal, x: number) {
  // bracket: foot plate on the upper nose, stem, lamp fork
  const s = 0.4;
  const foot = glacis.at(x, s);
  const fm = surfaceFrame(foot, [1, 0, 0], glacis.n);
  B.add(P.paint, rb(0.09, 0.012, 0.08, 0.003).translate(0, 0.006, 0), fm);
  B.add(P.paint, G.scatter(nut(0.014, 0.006), [[-0.03, -0.028], [0.03, -0.028], [-0.03, 0.028], [0.03, 0.028]].map(([a, b]) => ({ p: new THREE.Vector3(a, 0.012, b).applyMatrix4(fm), n: glacis.n }))));
  const lc: P3 = [x, foot[1] + 0.105, foot[2] + 0.06];
  B.add(P.paint, G.rod(new THREE.Vector3(foot[0], foot[1], foot[2]).addScaledVector(new THREE.Vector3(...glacis.n), 0.01), [lc[0], lc[1] - 0.075, lc[2] - 0.01], 0.012, 10));
  B.add(P.paint, bentRod([[x - 0.072, lc[1], lc[2] - 0.01], [x - 0.072, lc[1] - 0.07, lc[2] - 0.01], [x + 0.072, lc[1] - 0.07, lc[2] - 0.01], [x + 0.072, lc[1], lc[2] - 0.01]], 0.007, 0.02));
  for (const sx of [-1, 1]) B.put(P.steel, nut(0.016, 0.008), [x + sx * 0.078, lc[1], lc[2] - 0.01], [0, 0, sx > 0 ? -90 : 90]);
  // lamp body (rear shell), rim, lens and reflector, hood over the top half with a slit
  B.put(P.black, latheZ([[0.0, -0.075], [0.03, -0.074], [0.055, -0.06], [0.068, -0.035], [0.074, -0.005], [0.074, 0.02], [0.07, 0.022]], 28, 35), lc);
  B.put(P.black, latheZ([[0.068, 0.018], [0.078, 0.02], [0.08, 0.03], [0.078, 0.036], [0.066, 0.036]], 28, 40), lc);
  B.put(P.bright, latheZ([[0.0, 0.0], [0.03, 0.004], [0.062, 0.018], [0.064, 0.022]], 24, 40), lc);
  B.put(P.glass, latheZ([[0.0, 0.036], [0.04, 0.034], [0.066, 0.03]], 24, 40), lc);
  // blackout mask: disc over the lens with a horizontal slit hood
  B.put(P.black, cylZ(0.07, 0.006, 28), [lc[0], lc[1], lc[2] + 0.039]);
  B.put(P.black, rb(0.07, 0.012, 0.03, 0.003), [lc[0], lc[1] + 0.012, lc[2] + 0.055]);
  B.put(P.glass, rb(0.06, 0.008, 0.002, 0.001), [lc[0], lc[1] - 0.002, lc[2] + 0.043]);
  B.put(P.black, cylX(0.009, 0.016, 10), [x - 0.07, lc[1], lc[2] - 0.01]);
  B.put(P.black, cylX(0.009, 0.016, 10), [x + 0.07, lc[1], lc[2] - 0.01]);
  // cable into the back of the lamp and down through a gland in the plate
  B.add(P.black, G.tube([[x, lc[1] - 0.02, lc[2] - 0.07], [x + 0.02, lc[1] - 0.06, lc[2] - 0.09], [x + 0.03, foot[1] + 0.02, foot[2] - 0.03]], 0.0045, 6, 16));
  B.put(P.paint, G.cyl(0.012, 0.014, 0.02, 12), [x + 0.03, foot[1] + 0.01, foot[2] - 0.03]);
}

function towEye(B: Bucket, P: Pal, x: number) {
  // cast bracket on the lower nose with a forged eye
  const dz = H.noseZ - H.bellyFrontZ, dy = H.noseY - H.belly;
  const l = Math.hypot(dz, dy);
  const n: P3 = [0, -dz / l, dy / l];
  const t = 0.62;
  const o: P3 = [x, H.belly + dy * t, H.bellyFrontZ + dz * t];
  const fm = surfaceFrame(o, [1, 0, 0], n);
  B.add(P.cast, rb(0.1, 0.022, 0.12, 0.006).translate(0, 0.011, 0), fm);
  B.add(P.cast, prism([[-0.04, 0], [0.04, 0], [0.025, 0.07], [-0.025, 0.07]], 0.03, 'xy', 0.004).rotateX(-Math.PI / 2).translate(0, 0.02, 0), fm);
  B.add(P.cast, G.scatter(nut(0.018, 0.008), [[-0.035, -0.04], [0.035, -0.04], [-0.035, 0.04], [0.035, 0.04]].map(([a, b]) => ({ p: new THREE.Vector3(a, 0.022, b).applyMatrix4(fm), n: new THREE.Vector3(...n) }))));
  // eye: thick ring standing forward from the bracket, with a shackle pin
  const e = new THREE.Vector3(0, 0.1, 0).applyMatrix4(fm);
  B.put(P.cast, G.torus(0.04, 0.014, 10, 24), [e.x, e.y, e.z], [0, 90, 0]);
  B.put(P.steel, cylX(0.009, 0.1, 10), [e.x, e.y + 0.012, e.z]);
  B.put(P.steel, nut(0.022, 0.01), [e.x + 0.05, e.y + 0.012, e.z], [0, 0, -90]);
}

function inspectionPlate(B: Bucket, P: Pal) {
  const dz = H.noseZ - H.bellyFrontZ, dy = H.noseY - H.belly;
  const l = Math.hypot(dz, dy);
  const n: P3 = [0, -dz / l, dy / l];
  const o: P3 = [0, H.belly + dy * 0.5, H.bellyFrontZ + dz * 0.5];
  const fm = surfaceFrame(o, [1, 0, 0], n);
  B.add(P.paint, rb(0.44, 0.008, 0.16, 0.004).translate(0, 0.004, 0), fm);
  const bolts: P3[] = [];
  for (const a of [-0.2, -0.1, 0, 0.1, 0.2]) for (const b of [-0.065, 0.065]) bolts.push([a, 0.008, b]);
  B.add(P.paint, G.scatter(nut(0.016, 0.006), bolts.map((p) => ({ p: new THREE.Vector3(...p).applyMatrix4(fm), n: new THREE.Vector3(...n) }))));
}

function spareLinks(B: Bucket, P: Pal) {
  // a short length of spare track clamped in the middle of the upper nose, horns outward
  const g = linkGeometry();
  const count = 9;
  const s0 = 0.07;
  const xl = -0.3;
  for (let i = 0; i < count; i++) {
    const s = s0 + i * TRACK.pitch;
    const o = glacis.at(xl, s, TRACK.outer + 0.001);
    const fm = surfaceFrame(o, [1, 0, 0], glacis.n);
    B.add(P.track, g, fm);
  }
  // retaining bar across the links on two studs, wing nuts
  const sb = s0 + 4 * TRACK.pitch;
  const bm = surfaceFrame(glacis.at(xl, sb, TRACK.outer + TRACK.inner + 0.012), [1, 0, 0], glacis.n);
  B.add(P.paint, rb(0.34, 0.012, 0.03, 0.003), bm);
  for (const sx of [-1, 1]) {
    const st = surfaceFrame(glacis.at(xl + sx * 0.155, sb), [1, 0, 0], glacis.n);
    B.add(P.steel, G.cyl(0.007, 0.007, 0.06, 8).translate(0, 0.03, 0), st);
    B.add(P.paint, rb(0.03, 0.01, 0.03, 0.003).translate(0, 0.005, 0), st);
    B.add(P.steel, nut(0.02, 0.01).translate(0, TRACK.outer + TRACK.inner + 0.018, 0), st);
    B.add(P.steel, rb(0.04, 0.012, 0.004, 0.001).translate(0, TRACK.outer + TRACK.inner + 0.032, 0), st);
  }
}

function hitch(B: Bucket, P: Pal) {
  // towing hitch (Mk II) on a bracket in the middle of the rear plate
  const z = H.rearZ;
  const y = 0.44;
  B.put(P.cast, rb(0.26, 0.24, 0.022, 0.006), [0, y + 0.02, z - 0.011]);
  B.add(P.cast, G.scatter(nut(0.02, 0.009), [[-0.1, 0.1], [0.1, 0.1], [-0.1, -0.06], [0.1, -0.06], [0, 0.11]].map(([a, b]) => ({ p: [a, y + 0.02 + b, z - 0.022] as P3, n: [0, 0, -1] as P3 }))));
  // body with the jaw: two cheeks and a spring-loaded hook
  for (const sx of [-1, 1]) {
    B.add(P.cast, prism([[0, -0.05], [0.04, -0.045], [0.052, 0.0], [0.04, 0.045], [0, 0.05]], 0.016, 'zy', 0.003).translate(sx * 0.03, y, 0), new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, 0, z - 0.02));
  }
  const hz = z - 0.05;
  B.put(P.steel, G.torus(0.028, 0.011, 10, 20, Math.PI * 1.4), [0, y - 0.005, hz], [0, 90, 200]);
  B.put(P.steel, cylX(0.009, 0.09, 10), [0, y + 0.02, hz + 0.01]);
  B.put(P.steel, nut(0.02, 0.009), [0.047, y + 0.02, hz + 0.01], [0, 0, -90]);
  B.add(P.steel, G.rod([0, y + 0.03, hz], [0, y + 0.07, hz + 0.02], 0.006, 8));
  B.put(P.steel, G.torus(0.014, 0.004, 6, 14), [0, y + 0.084, hz + 0.024], [0, 90, 0]);
}

function tailLamp(B: Bucket, P: Pal, x: number) {
  const z = H.rearZ, y = 0.93;
  B.put(P.paint, rb(0.08, 0.01, 0.05, 0.003), [x, y - 0.052, z - 0.025]);
  B.put(P.black, rb(0.07, 0.085, 0.045, 0.01), [x, y, z - 0.03]);
  B.put(P.black, rb(0.075, 0.012, 0.03, 0.004), [x, y + 0.046, z - 0.045]);
  B.put(P.red, cylZ(0.022, 0.006, 20), [x, y + 0.012, z - 0.053]);
  B.put(P.glass, rb(0.04, 0.012, 0.004, 0.001), [x, y - 0.025, z - 0.053]);
  B.add(P.black, G.tube([[x, y - 0.03, z - 0.01], [x + 0.01, y - 0.1, z - 0.004]], 0.004, 6, 8));
}

export function fittings(P: Pal): THREE.Group {
  const B = new Bucket();
  for (const x of [-0.6, 0.6]) headlamp(B, P, x);
  for (const x of [-0.4, 0.4]) towEye(B, P, x);
  inspectionPlate(B, P);
  spareLinks(B, P);
  hitch(B, P);
  for (const x of [-0.52, 0.52]) tailLamp(B, P, x);
  return B.meshes();
}
