/**
 * ZiS-3 road wheel: GAZ-AA pattern 6.50-20 tyre (sponge-filled GK type, outwardly a treaded
 * truck tyre) on the gun's own pressed-steel disc with two windows, 5-stud GAZ-AA type hub,
 * hub cap and brake drum behind the disc.
 *
 * Local frame: wheel centre at the origin, axle along X, the OUTER face towards +X.
 * The ground is at y = -D.axleY; the tyre is flattened onto it (contact patch).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { latheX, circlePts, flattenBelow, merge, xf, cylX } from './util';

type V2 = [number, number];

function tyreGeometry(seg: number): THREE.BufferGeometry {
  const R = D.tyreR - 0.009; // carcass crown; tread blocks add the last 9 mm
  const hw = D.tyreW / 2;
  const rb = D.rimR;
  // cross-section (radius, x) from the inner bead round the outside to the outer bead
  // widest point ~45 % up the sidewall, flattish crown (superellipse), beads tucked into the rim
  const rc = rb + 0.07;
  const ar = R - rc;
  const prof: V2[] = [
    [rb - 0.004, -hw * 0.76],
    [rb + 0.012, -hw * 0.83],
    [rb + 0.036, -hw * 0.95],
  ];
  const N = 24;
  const e = 2 / 2.8;
  for (let i = 0; i <= N; i++) {
    const a = -Math.PI / 2 + (i / N) * Math.PI; // -90..90 deg
    const s = Math.sin(a), c = Math.cos(a);
    prof.push([rc + ar * Math.pow(Math.abs(c), e), hw * Math.sign(s) * Math.pow(Math.abs(s), e)]);
  }
  prof.push([rb + 0.036, hw * 0.95], [rb + 0.012, hw * 0.83], [rb - 0.004, hw * 0.76]);
  return latheX(prof, seg, 50);
}

function treadGeometry(pitches: number): THREE.BufferGeometry {
  // Staggered transverse lugs from each shoulder towards the crown (period truck pattern),
  // low (8 mm) so the silhouette stays a tyre, not a mud-terrain toy.
  const parts: THREE.BufferGeometry[] = [];
  const R = D.tyreR - 0.009;
  const lug = G.rbox(0.056, 0.014, 0.024, 0.0035, 1);
  const shoulder = G.rbox(0.014, 0.024, 0.022, 0.004, 1);
  for (let i = 0; i < pitches; i++) {
    for (const side of [-1, 1]) {
      const a = ((i + (side > 0 ? 0.5 : 0)) / pitches) * Math.PI * 2;
      const deg = (a * 180) / Math.PI;
      const b = lug.clone();
      xf(b, [0, 0, 0], [0, side * 12, 0]);
      xf(b, [side * 0.034, R + 0.002, 0]);
      xf(b, [0, 0, 0], [deg, 0, 0]);
      parts.push(b);
      const sh = shoulder.clone();
      xf(sh, [side * 0.068, R - 0.016, 0], [0, 0, side * -22]);
      xf(sh, [0, 0, 0], [deg, 0, 0]);
      parts.push(sh);
    }
  }
  return merge(parts);
}

/** Annular sector with semicircular ends ("kidney" window), centred on angle `base`. */
function kidney(base: number, halfArc: number, r0: number, r1: number): V2[] {
  const pts: V2[] = [];
  const a0 = base - halfArc, a1 = base + halfArc;
  const n = 16, nc = 8;
  const rm = (r0 + r1) / 2, rr = (r1 - r0) / 2;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([Math.cos(a) * r1, Math.sin(a) * r1]);
  }
  const cap = (a: number, sgn: number) => {
    const ux = Math.cos(a), uy = Math.sin(a), tx = -Math.sin(a), ty = Math.cos(a);
    const cx = ux * rm, cy = uy * rm;
    for (let i = 1; i < nc; i++) {
      const th = (i / nc) * Math.PI;
      const c = Math.cos(th), s = Math.sin(th);
      pts.push([cx + sgn * rr * (c * ux + s * tx), cy + sgn * rr * (c * uy + s * ty)]);
    }
  };
  cap(a1, 1);
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push([Math.cos(a) * r0, Math.sin(a) * r0]);
  }
  cap(a0, -1);
  return pts;
}

/** Pressed disc with two windows (flat annulus part). Built in the YZ plane, thickness along X. */
function discGeometry(): THREE.BufferGeometry {
  const outer = circlePts(0, 0, 0.205, 72);
  const holes: V2[][] = [circlePts(0, 0, 0.052, 24)];
  // two kidney-shaped windows, opposite each other
  for (const base of [Math.PI / 2, -Math.PI / 2]) {
    holes.push(kidney(base, 0.62, 0.118, 0.178));
  }
  const sh = G.shape(outer, 0, []);
  for (const h of holes) {
    const p = new THREE.Path();
    p.moveTo(h[0][0], h[0][1]);
    for (let i = 1; i < h.length; i++) p.lineTo(h[i][0], h[i][1]);
    p.closePath();
    sh.holes.push(p);
  }
  const g = G.extrude(sh, 0.006, 0.0018, 8, 2);
  g.rotateY(Math.PI / 2); // extrusion Z -> X
  return g;
}

export interface WheelOpts {
  detail: 'high' | 'low';
  /** Rotation of the disc/hub about the axle (deg); the tyre stays flattened on the ground. */
  spin?: number;
}

/** One complete road wheel (outer face towards +X). */
export function buildWheel(opts: WheelOpts): THREE.Group {
  const hi = opts.detail === 'high';
  const seg = hi ? 72 : 40;
  const groundY = -D.axleY;
  const out: THREE.Object3D[] = [];

  // --- tyre carcass + tread, flattened onto the ground
  const tyre = tyreGeometry(seg);
  flattenBelow(tyre, groundY);
  out.push(part(tyre, P.rubber()));
  const tread = treadGeometry(hi ? 46 : 30);
  flattenBelow(tread, groundY);
  out.push(part(tread, P.rubber()));

  const rot: THREE.Object3D[] = [];
  // --- rim: well-base with side flanges (x = across the wheel)
  const rimProf: V2[] = [
    [D.rimR + 0.016, -0.074],
    [D.rimR + 0.018, -0.068],
    [D.rimR - 0.002, -0.062],
    [D.rimR - 0.004, -0.03],
    [D.rimR - 0.026, -0.018],
    [D.rimR - 0.026, 0.018],
    [D.rimR - 0.004, 0.03],
    [D.rimR - 0.002, 0.062],
    [D.rimR + 0.018, 0.068],
    [D.rimR + 0.016, 0.074],
    // inner surface back
    [D.rimR + 0.01, 0.074],
    [D.rimR - 0.008, 0.064],
    [D.rimR - 0.01, 0.034],
    [D.rimR - 0.032, 0.022],
    [D.rimR - 0.032, -0.022],
    [D.rimR - 0.01, -0.034],
    [D.rimR - 0.008, -0.064],
    [D.rimR + 0.01, -0.074],
    [D.rimR + 0.016, -0.074],
  ];
  rot.push(part(latheX(rimProf, seg, 35), P.paint()));

  // --- disc: conical outer ring from the rim well to the flat, then the windowed flat
  const discX = 0.03;
  const cone: V2[] = [
    [0.2, discX - 0.009],
    [0.21, discX - 0.01],
    [D.rimR - 0.03, -0.002],
    [D.rimR - 0.03, 0.006],
    [0.212, discX - 0.003],
    [0.2, discX - 0.003],
    [0.2, discX - 0.009],
  ];
  rot.push(part(latheX(cone, seg, 30), P.paint()));
  rot.push(part(discGeometry(), P.paint(), { p: [discX - 0.006, 0, 0] }));
  // pressed stiffening bead round the hub flat
  rot.push(part(G.torus(0.098, 0.006, 8, 48), P.paint(), { p: [discX, 0, 0], r: [0, 90, 0] }));

  // --- hub: flange, 5 studs + nuts on a GAZ-AA type bolt circle, centre boss and hub cap
  const face = discX - 0.003; // outer face of the disc flat
  const hub: V2[] = [
    [0, -0.01],
    [0.09, -0.01],
    [0.09, face - 0.006],
    [0.05, face - 0.006],
    [0.05, face + 0.03],
    [0.047, face + 0.036],
    [0.047, face + 0.046],
    [0.041, face + 0.056],
    [0.025, face + 0.064],
    [0, face + 0.066],
  ];
  rot.push(part(latheX(hub, hi ? 40 : 24, 30), P.cast()));
  // hub cap seating ring
  rot.push(part(G.torus(0.048, 0.0035, 8, 32), P.cast(), { p: [face + 0.034, 0, 0], r: [0, 90, 0] }));
  const nutG = G.boltHead(0.024, 0.014);
  const nuts: { p: [number, number, number]; n: [number, number, number]; spin: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    nuts.push({ p: [face, Math.cos(a) * 0.075, Math.sin(a) * 0.075], n: [1, 0, 0], spin: i * 0.4 });
  }
  rot.push(part(G.scatter(nutG, nuts), P.paint()));
  // stud ends proud of the nuts
  const studs = nuts.map((n) => ({ p: [face + 0.02, n.p[1], n.p[2]] as [number, number, number], n: [1, 0, 0] as [number, number, number] }));
  rot.push(part(G.scatter(G.cyl(0.0055, 0.0065, 0.008, 10), studs), P.bright()));
  // lubrication plug on the cap
  rot.push(part(G.boltHead(0.014, 0.006), P.cast(), { p: [face + 0.065, 0, 0], r: [0, 0, -90] }));

  // --- brake drum and backing plate behind the disc (visible through the windows)
  const drum: V2[] = [
    [0, -0.075],
    [0.07, -0.07],
    [0.1, -0.058],
    [0.176, -0.056],
    [0.176, -0.05],
    [0.172, -0.045],
    [0.172, discX - 0.012],
    [0.168, discX - 0.008],
    [0.06, discX - 0.008],
  ];
  rot.push(part(latheX(drum, hi ? 48 : 28, 35), P.cast()));
  // cooling ribs on the drum
  for (const x of [-0.03, -0.015, 0.0]) rot.push(part(G.torus(0.173, 0.003, 6, 48), P.cast(), { p: [x, 0, 0], r: [0, 90, 0] }));
  // inner hub bearing housing
  rot.push(part(cylX(0.055, -0.13, -0.07, 28, 0.004), P.cast()));
  rot.push(part(G.scatter(G.boltHead(0.014, 0.007), Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return { p: [-0.064, Math.cos(a) * 0.085, Math.sin(a) * 0.085] as [number, number, number], n: [-1, 0, 0] as [number, number, number] };
  })), P.cast()));

  out.push(group(rot, { r: [opts.spin ?? 0, 0, 0] }));
  return group(out, { name: 'wheel' });
}
