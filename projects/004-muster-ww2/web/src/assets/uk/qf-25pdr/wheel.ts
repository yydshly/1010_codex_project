/**
 * QF 25-pounder carriage wheel: 9.00-16 pneumatic tyre with a cross-country bar tread on a
 * pressed-steel dished disc wheel (well-base rim, stiffening bead, eight studs), a large hub cap
 * that stands out beyond the tyre (width over the hubs 2.13 m), and the brake drum + backing
 * plate on the inner side.
 *
 * Local frame: wheel centre at the origin, axle along X, the OUTER face towards +X.
 * The tyre is flattened onto the support plane y = -D.axleY (contact patch).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { latheX, flattenBelow, merge, xf, cylX, type V2, type V3 } from './util';

function tyreGeometry(seg: number): THREE.BufferGeometry {
  const R = D.tyreR - 0.011; // carcass crown; tread bars add the last 11 mm
  const hw = D.tyreW / 2;
  const rb = D.rimR;
  // cross-section (radius, x): bead at the rim flange, balloon sidewall bulging past the rim,
  // widest point ~45 % up the section, rounded crown
  const rc = rb + 0.085;
  const ar = R - rc;
  const prof: V2[] = [
    [rb + 0.004, -hw * 0.7],
    [rb + 0.02, -hw * 0.8],
    [rb + 0.048, -hw * 0.95],
  ];
  const N = 26;
  const e = 2 / 2.6;
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI / 2 + (i / N) * Math.PI;
    const s = Math.sin(a), c = Math.cos(a);
    prof.push([rc + ar * Math.pow(Math.abs(c), e), hw * Math.sign(s) * Math.pow(Math.abs(s), e)]);
  }
  prof.push([rb + 0.048, hw * 0.95], [rb + 0.02, hw * 0.8], [rb + 0.004, hw * 0.7]);
  return latheX(prof, seg, 50);
}

function treadGeometry(pitches: number): THREE.BufferGeometry {
  // Directional cross-country bars: each bar runs from a shoulder towards the crown at an angle,
  // alternate sides offset by half a pitch, a narrow centre band left between them.
  const parts: THREE.BufferGeometry[] = [];
  const R = D.tyreR - 0.011;
  const bar = G.rbox(0.082, 0.015, 0.03, 0.0045, 1);
  const shoulder = G.rbox(0.016, 0.03, 0.028, 0.005, 1);
  for (let i = 0; i < pitches; i++) {
    for (const side of [-1, 1]) {
      const a = ((i + (side > 0 ? 0.5 : 0)) / pitches) * Math.PI * 2;
      const deg = (a * 180) / Math.PI;
      const b = bar.clone();
      xf(b, [0, 0, 0], [0, side * 24, 0]);
      xf(b, [side * 0.05, R + 0.003, 0]);
      xf(b, [0, 0, 0], [deg, 0, 0]);
      parts.push(b);
      const sh = shoulder.clone();
      xf(sh, [side * 0.1, R - 0.018, 0.004], [0, 0, side * -26]);
      xf(sh, [0, 0, 0], [deg, 0, 0]);
      parts.push(sh);
    }
  }
  return merge(parts);
}

export interface WheelOpts {
  detail: 'high' | 'low';
  /** Rotation of the disc/hub about the axle (deg); the tyre stays flattened on the support. */
  spin?: number;
}

/** One complete wheel (outer face towards +X). */
export function buildWheel(opts: WheelOpts): THREE.Group {
  const hi = opts.detail === 'high';
  const seg = hi ? 80 : 44;
  const groundY = -D.axleY;
  const out: THREE.Object3D[] = [];

  const tyre = tyreGeometry(seg);
  flattenBelow(tyre, groundY);
  out.push(part(tyre, P.rubber()));
  const tread = treadGeometry(hi ? 34 : 24);
  flattenBelow(tread, groundY);
  out.push(part(tread, P.rubber()));

  const rot: THREE.Object3D[] = [];
  const rr = D.rimR;
  // --- well-base rim with flanges and bead seats
  const rimProf: V2[] = [
    [rr + 0.02, -0.098],
    [rr + 0.022, -0.09],
    [rr + 0.002, -0.084],
    [rr, -0.05],
    [rr - 0.03, -0.036],
    [rr - 0.03, 0.036],
    [rr, 0.05],
    [rr + 0.002, 0.084],
    [rr + 0.022, 0.09],
    [rr + 0.02, 0.098],
    [rr + 0.013, 0.098],
    [rr - 0.005, 0.086],
    [rr - 0.007, 0.054],
    [rr - 0.036, 0.04],
    [rr - 0.036, -0.04],
    [rr - 0.007, -0.054],
    [rr - 0.005, -0.086],
    [rr + 0.013, -0.098],
    [rr + 0.02, -0.098],
  ];
  rot.push(part(latheX(rimProf, seg, 35), P.paint()));

  // --- pressed disc: welded to the rim well, dished outwards to the hub flat, with a
  // stiffening bead and a ring of pressed dimples round the hub flat
  const discProf: V2[] = [
    [rr - 0.033, 0.01],
    [0.162, 0.016],
    [0.156, 0.02],
    [0.13, 0.046],
    [0.12, 0.056],
    [0.11, 0.058],
    [0.068, 0.058],
    [0.068, 0.051],
    [0.108, 0.051],
    [0.116, 0.049],
    [0.126, 0.04],
    [0.152, 0.013],
    [0.16, 0.007],
    [rr - 0.035, 0.003],
    [rr - 0.033, 0.01],
  ];
  rot.push(part(latheX(discProf, seg, 28), P.paint()));
  // pressed bead round the hub flat
  rot.push(part(G.torus(0.1, 0.0045, 8, hi ? 56 : 32), P.paint(), { p: [0.058, 0, 0], r: [0, 90, 0], s: [1, 1, 0.7] }));
  // drain / ventilation holes in the dished cone (dark recesses)
  const holes: { p: V3; n: V3 }[] = [];
  const s2 = Math.SQRT1_2;
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    const r = 0.143;
    holes.push({ p: [0.0335, Math.cos(a) * r, Math.sin(a) * r], n: [s2, Math.cos(a) * s2, Math.sin(a) * s2] });
  }
  rot.push(part(G.scatter(G.cyl(0.0115, 0.0115, 0.003, 16), holes), P.bore()));

  // --- hub: flange behind the disc flat, eight studs + nuts, hub cap standing proud of the tyre
  const face = 0.058;
  const capOut = D.hubX - D.wheelX;
  const hub: V2[] = [
    [0, face - 0.02],
    [0.066, face - 0.02],
    [0.066, face + 0.004],
    [0.07, face + 0.004],
    [0.07, face + 0.014],
    [0.064, face + 0.02],
    [0.058, face + 0.03],
    [0.058, capOut - 0.035],
    [0.054, capOut - 0.018],
    [0.044, capOut - 0.006],
    [0.028, capOut],
    [0, capOut],
  ];
  rot.push(part(latheX(hub, hi ? 44 : 26, 30), P.cast()));
  rot.push(part(G.torus(0.059, 0.004, 8, 36), P.cast(), { p: [face + 0.04, 0, 0], r: [0, 90, 0] }));
  const nuts: { p: V3; n: V3; spin: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    nuts.push({ p: [face, Math.cos(a) * 0.092, Math.sin(a) * 0.092], n: [1, 0, 0], spin: i * 0.35 });
  }
  rot.push(part(G.scatter(G.boltHead(0.026, 0.016), nuts), P.paint()));
  rot.push(part(G.scatter(G.cyl(0.006, 0.007, 0.01, 10), nuts.map((n) => ({ p: [face + 0.022, n.p[1], n.p[2]] as V3, n: [1, 0, 0] as V3 }))), P.bright()));
  // grease nipple and cap hex
  rot.push(part(G.boltHead(0.02, 0.008), P.cast(), { p: [capOut, 0, 0], r: [0, 0, -90] }));

  // --- brake drum and backing plate on the inner side
  const drum: V2[] = [
    [0.07, -0.1],
    [0.16, -0.1],
    [0.182, -0.094],
    [0.182, -0.012],
    [0.176, -0.006],
    [0.075, -0.006],
  ];
  rot.push(part(latheX(drum, hi ? 56 : 30, 35), P.cast()));
  for (const x of [-0.08, -0.06, -0.04]) rot.push(part(G.torus(0.182, 0.0035, 6, hi ? 56 : 30), P.cast(), { p: [x, 0, 0], r: [0, 90, 0] }));
  out.push(group(rot, { r: [opts.spin ?? 0, 0, 0] }));

  // backing plate (does not turn) and hub bearing housing
  out.push(part(latheX([[0.06, -0.128], [0.19, -0.124], [0.19, -0.11], [0.172, -0.106], [0.06, -0.108]], hi ? 56 : 30, 35), P.paint()));
  out.push(part(cylX(0.062, -0.17, -0.12, 28, 0.004), P.cast()));
  out.push(
    part(
      G.scatter(
        G.boltHead(0.014, 0.007),
        Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return { p: [-0.128, Math.cos(a) * 0.1, Math.sin(a) * 0.1] as V3, n: [-1, 0, 0] as V3 };
        }),
      ),
      P.cast(),
    ),
  );
  return group(out, { name: 'wheel' });
}
