/**
 * Road wheel of the M2A1 carriage: 9.00-20 combat tyre (military non-directional bar tread) on a
 * combat-type divided rim, the two rim halves bolted together through the outer ring of the
 * pressed disc; six round ventilation holes, 8-stud hub with a domed hub cap, brake drum and
 * backing plate behind the disc (hand-operated parking brakes on the M2A1 carriage).
 *
 * Local frame: wheel centre at the origin, axle along X, OUTER face towards +X.
 * The ground is at y = -D.axleY; the tyre is flattened onto it (contact patch).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { latheX, circlePts, flattenBelow, merge, xf, cylX, type V2, type V3 } from './util';

/** Carcass cross-section: point (x across, r radial) at parameter a (rad, 0 = crown centre). */
const CARC = { R: D.tyreR - 0.011, rc: D.rimR + 0.1, e: 2 / 3.2 };
function carcass(a: number): [number, number] {
  const hw = D.tyreW / 2;
  const s = Math.sin(a), c = Math.cos(a);
  return [hw * Math.sign(s) * Math.pow(Math.abs(s), CARC.e), CARC.rc + (CARC.R - CARC.rc) * Math.pow(Math.abs(c), CARC.e)];
}

function tyreGeometry(seg: number): THREE.BufferGeometry {
  const hw = D.tyreW / 2;
  const rb = D.rimR;
  // cross-section (radius, x): inner bead round the crown to the outer bead. Bias-ply military
  // tyre: tall rounded sidewalls, fairly flat crown.
  const prof: V2[] = [
    [rb - 0.004, -hw * 0.74],
    [rb + 0.014, -hw * 0.8],
    [rb + 0.045, -hw * 0.94],
  ];
  const N = 30;
  for (let i = 0; i <= N; i++) {
    const [x, r] = carcass(-Math.PI / 2 + (i / N) * Math.PI);
    prof.push([r, x]);
  }
  prof.push([rb + 0.045, hw * 0.94], [rb + 0.014, hw * 0.8], [rb - 0.004, hw * 0.74]);
  return latheX(prof, seg, 50);
}

/** Sidewall bead ring (moulded rim-guard line) - thin torus on each sidewall. */
function sidewallRibs(seg: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const sx of [1, -1]) {
    const t = G.torus(D.rimR + 0.058, 0.004, 6, seg);
    t.rotateY(Math.PI / 2);
    t.translate(sx * (D.tyreW / 2 - 0.009), 0, 0);
    parts.push(t);
  }
  return merge(parts);
}

function treadGeometry(pitches: number): THREE.BufferGeometry {
  // Non-directional military bar tread: bars running from each shoulder in past the centre line,
  // alternating side to side. Each bar is swept along the carcass profile so it hugs the crown
  // and wraps down the shoulder.
  const parts: THREE.BufferGeometry[] = [];
  const h = 0.011, w = 0.03;
  const bar = (side: number): THREE.BufferGeometry => {
    const pts: V3[] = [];
    const nrm: V3[] = [];
    const a0 = -0.2, a1 = 1.05, n = 9;
    for (let i = 0; i <= n; i++) {
      const a = side * (a0 + ((a1 - a0) * i) / n);
      const [x, r] = carcass(a);
      const [x2, r2] = carcass(a + side * 0.01);
      // outward normal in the (x, r) plane
      let nx = r2 - r, nr = -(x2 - x);
      if (nr < 0 || (Math.abs(nr) < 1e-6 && nx * x < 0)) { nx = -nx; nr = -nr; }
      const l = Math.hypot(nx, nr);
      nx /= l; nr /= l;
      pts.push([x + nx * (h / 2 - 0.002), r + nr * (h / 2 - 0.002), 0]);
      nrm.push([nx, nr, 0]);
    }
    const g = G.strap(pts, w, h, nrm, { smooth: false });
    g.rotateY(side * 8 * (Math.PI / 180));
    return g;
  };
  const bars = [bar(1), bar(-1)];
  for (let i = 0; i < pitches; i++) {
    for (const side of [-1, 1]) {
      const a = ((i + (side > 0 ? 0.5 : 0)) / pitches) * Math.PI * 2;
      const b = bars[side > 0 ? 0 : 1].clone();
      xf(b, [0, 0, 0], [(a * 180) / Math.PI, 0, 0]);
      parts.push(b);
    }
  }
  return merge(parts);
}

/** Pressed disc flat with six round ventilation holes (YZ plane, thickness along X). */
function discGeometry(): THREE.BufferGeometry {
  const outer = circlePts(0, 0, 0.215, 80);
  const holes: V2[][] = [circlePts(0, 0, 0.066, 28)];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    holes.push(circlePts(Math.cos(a) * 0.148, Math.sin(a) * 0.148, 0.03, 22));
  }
  const sh = G.shape(outer, 0, []);
  for (const h of holes) {
    const p = new THREE.Path();
    p.moveTo(h[h.length - 1][0], h[h.length - 1][1]);
    for (let i = h.length - 2; i >= 0; i--) p.lineTo(h[i][0], h[i][1]);
    p.closePath();
    sh.holes.push(p);
  }
  const g = G.extrude(sh, 0.007, 0.002, 8, 2);
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
  const seg = hi ? 80 : 44;
  const groundY = -D.axleY;
  const out: THREE.Object3D[] = [];

  // --- tyre carcass + tread + sidewall ribs, flattened onto the ground
  const tyre = tyreGeometry(seg);
  flattenBelow(tyre, groundY);
  out.push(part(tyre, P.rubber()));
  const tread = treadGeometry(hi ? 30 : 22);
  flattenBelow(tread, groundY);
  out.push(part(tread, P.rubber()));
  if (hi) out.push(part(sidewallRibs(seg), P.rubber()));

  const rot: THREE.Object3D[] = [];
  const rb = D.rimR;
  // --- divided (combat) rim: two flanged halves; the join ring sits on the outer half
  const rimProf: V2[] = [
    [rb + 0.02, -0.098],
    [rb + 0.022, -0.09],
    [rb - 0.002, -0.084],
    [rb - 0.004, -0.02],
    [rb - 0.004, 0.02],
    [rb - 0.002, 0.084],
    [rb + 0.022, 0.09],
    [rb + 0.02, 0.098],
    [rb + 0.012, 0.098],
    [rb - 0.01, 0.088],
    [rb - 0.012, 0.02],
    [rb - 0.012, -0.02],
    [rb - 0.01, -0.088],
    [rb + 0.012, -0.098],
    [rb + 0.02, -0.098],
  ];
  rot.push(part(latheX(rimProf, seg, 35), P.paint()));
  // conical flange from the rim well in to the disc's bolting ring (outer face)
  const dX = 0.06; // disc plane (outer face) x
  const cone: V2[] = [
    [rb - 0.012, 0.02],
    [rb - 0.012, 0.03],
    [0.232, dX - 0.004],
    [0.214, dX - 0.004],
    [0.214, dX - 0.011],
    [0.23, dX - 0.011],
    [rb - 0.02, 0.022],
    [rb - 0.012, 0.02],
  ];
  rot.push(part(latheX(cone, seg, 30), P.paint()));
  // bolting ring: flat ring carrying the 16 rim bolts, slightly proud of the disc
  rot.push(part(latheX([[0.188, dX - 0.004], [0.236, dX - 0.004], [0.236, dX + 0.004], [0.188, dX + 0.004], [0.188, dX - 0.004]], seg, 40), P.paint()));
  const rimBolts: { p: V3; n: V3; spin: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    rimBolts.push({ p: [dX + 0.004, Math.cos(a) * 0.213, Math.sin(a) * 0.213], n: [1, 0, 0], spin: i * 0.37 });
  }
  rot.push(part(G.scatter(G.boltHead(0.019, 0.01), rimBolts), P.cast()));
  // pressed disc (dished: the flat sits in the disc plane, a pressed bead round the holes)
  rot.push(part(discGeometry(), P.paint(), { p: [dX - 0.0035, 0, 0] }));
  rot.push(part(G.torus(0.105, 0.006, 8, 56), P.paint(), { p: [dX, 0, 0], r: [0, 90, 0] }));
  rot.push(part(G.torus(0.19, 0.005, 8, 64), P.paint(), { p: [dX, 0, 0], r: [0, 90, 0] }));

  // --- hub: flange, 8 studs + nuts, domed hub cap reaching the hub-cap line
  const capEnd = D.hubCapX - D.wheelX;
  const hub: V2[] = [
    [0, dX - 0.03],
    [0.068, dX - 0.03],
    [0.068, dX + 0.006],
    [0.058, dX + 0.012],
    [0.058, dX + 0.05],
    [0.062, dX + 0.056],
    [0.062, dX + 0.066],
    [0.056, dX + 0.072],
    [0.05, capEnd - 0.03],
    [0.04, capEnd - 0.012],
    [0.024, capEnd - 0.002],
    [0, capEnd],
  ];
  rot.push(part(latheX(hub, hi ? 40 : 24, 30), P.cast()));
  const nuts: { p: V3; n: V3; spin: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    nuts.push({ p: [dX + 0.0035, Math.cos(a) * 0.086, Math.sin(a) * 0.086], n: [1, 0, 0], spin: i * 0.5 });
  }
  rot.push(part(G.scatter(G.boltHead(0.026, 0.016), nuts), P.cast()));
  rot.push(part(G.scatter(G.cyl(0.0065, 0.0075, 0.01, 10), nuts.map((n) => ({ p: [dX + 0.025, n.p[1], n.p[2]] as V3, n: [1, 0, 0] as V3 }))), P.bright()));
  // hub-cap wrench hex and lubrication fitting
  rot.push(part(G.cyl(0.03, 0.03, 0.012, 6), P.cast(), { p: [dX + 0.062, 0, 0], r: [0, 0, -90] }));
  rot.push(part(G.cyl(0.005, 0.006, 0.012, 8), P.bright(), { p: [capEnd + 0.004, 0, 0], r: [0, 0, -90] }));

  // --- brake drum and backing plate behind the disc (visible through the holes)
  const drum: V2[] = [
    [0.07, -0.07],
    [0.178, -0.064],
    [0.182, -0.058],
    [0.182, dX - 0.016],
    [0.176, dX - 0.01],
    [0.07, dX - 0.01],
  ];
  rot.push(part(latheX(drum, hi ? 48 : 28, 35), P.cast()));
  for (const x of [-0.035, -0.01, 0.015]) rot.push(part(G.torus(0.182, 0.0032, 6, 48), P.cast(), { p: [x, 0, 0], r: [0, 90, 0] }));
  out.push(group(rot, { r: [opts.spin ?? 0, 0, 0] }));

  // backing plate (does not turn), bolted to the spindle flange; brake cam lever housing
  out.push(part(latheX([[0.05, -0.085], [0.19, -0.085], [0.19, -0.072], [0.182, -0.068], [0.05, -0.068], [0.05, -0.085]], hi ? 48 : 28, 35), P.cast()));
  out.push(part(G.scatter(G.boltHead(0.014, 0.007), Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    return { p: [-0.085, Math.cos(a) * 0.12, Math.sin(a) * 0.12] as V3, n: [-1, 0, 0] as V3 };
  })), P.cast()));
  out.push(part(cylX(0.058, -0.16, -0.08, 28, 0.004), P.cast()));
  out.push(part(G.rbox(0.04, 0.05, 0.06, 0.008, 1), P.cast(), { p: [-0.1, 0.13, -0.09] }));
  out.push(part(cylX(0.011, -0.2, -0.085, 12, 0.002), P.bright(), { p: [0, 0.13, -0.09] }));
  return group(out, { name: 'wheel' });
}
