/**
 * Opel Blitz wheels: 190-20 cross-country tyres (staggered transverse bars) on pressed-steel
 * 20 in disc wheels with eight hand holes, flat-base rims with a split side ring, wheel nuts,
 * front hub caps and rear axle-shaft flanges. Twin wheels at the rear: the two discs are dished
 * towards each other and clamped on the hub between the tyres.
 *
 * Wheel-local frame: axle along X, OUTER face towards +X, centre at the origin.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, latheX, latheLoopX, merge, xf, clampBelow, cylX } from './util';

const HW = D.tyreHW;
const RMID = 0.352; // radius of the widest point of the section
const E1 = 4.2; // crown squareness

/** Carcass surface radius at lateral offset x (superellipse crown). */
function crownAt(x: number): number {
  const a = Math.min(1, Math.abs(x) / HW);
  return RMID + (D.crownR - RMID) * Math.pow(Math.max(0, 1 - Math.pow(a, E1)), 1 / E1);
}

function carcass(seg: number): THREE.BufferGeometry {
  const rb = D.rimR;
  const prof: V2[] = [];
  const lower = (sign: number, rev: boolean) => {
    const pts: V2[] = [
      [rb - 0.004, sign * 0.062],
      [rb + 0.014, sign * 0.068],
      [rb + 0.03, sign * 0.074],
    ];
    const N = 8;
    for (let i = N; i >= 0; i--) {
      const b = (i / N) * (Math.PI / 2);
      pts.push([RMID - (RMID - 0.3) * Math.sin(b), sign * (0.08 + (HW - 0.08) * Math.cos(b))]);
    }
    return rev ? pts.reverse() : pts;
  };
  prof.push(...lower(-1, false));
  const N = 28;
  for (let i = 1; i < N; i++) {
    const a = -Math.PI / 2 + (i / N) * Math.PI;
    const s = Math.sin(a), c = Math.cos(a);
    prof.push([RMID + (D.crownR - RMID) * Math.pow(Math.abs(c), 2 / E1), HW * Math.sign(s) * Math.pow(Math.abs(s), 2 / E1)]);
  }
  prof.push(...lower(1, true));
  return latheX(prof, seg, 50);
}

/** Staggered transverse cross-country bars, two segments each so they follow the crown. */
function tread(pitches: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const phi = G.deg(14);
  const wb = 0.036; // tangential width
  const h = 0.013; // bar height
  const segs: [number, number][] = [
    [-0.012, 0.045],
    [0.045, 0.094],
  ];
  const proto = segs.map(([a0, a1]) => {
    const r0 = crownAt(a0), r1 = crownAt(a1);
    const len = Math.hypot(a1 - a0, r1 - r0);
    const tilt = Math.atan2(r1 - r0, a1 - a0);
    const off = (a0 + 0.012) * Math.tan(phi);
    const sh: V2[] = [
      [0, off],
      [len, off + len * Math.tan(phi)],
      [len, off + len * Math.tan(phi) + wb],
      [0, off + wb],
    ];
    const g = G.extrude(sh, h, 0.003, 1, 1);
    g.translate(0, -wb / 2, h / 2 - 0.004);
    // outline plane: x = lateral, y = tangential; extrude = radial -> wheel (X, Z, Y) at the top
    const m = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
    g.applyMatrix4(m);
    G.flipWinding(g);
    xf(g, [0, 0, 0], [0, 0, (tilt * 180) / Math.PI]);
    xf(g, [a0, r0, 0]);
    return g;
  });
  for (let i = 0; i < pitches; i++) {
    for (const side of [1, -1]) {
      const ang = ((i + (side > 0 ? 0 : 0.5)) / pitches) * 360;
      for (const pr of proto) {
        const g = pr.clone();
        if (side < 0) xf(g, [0, 0, 0], [0, 0, 0], [-1, 1, 1]);
        xf(g, [0, 0, 0], [ang, 0, 0]);
        parts.push(g);
      }
    }
  }
  return merge(parts);
}

/** Moulded sidewall ribs (both sides). */
function sideRibs(): THREE.BufferGeometry {
  const gs: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const g = G.torus(0.3, 0.0025, 4, 56);
    g.rotateY(Math.PI / 2);
    g.translate(s * 0.0985, 0, 0);
    gs.push(g);
  }
  return merge(gs);
}

let tyreCache: THREE.BufferGeometry | null = null;
export function tyreGeometry(): THREE.BufferGeometry {
  if (!tyreCache) tyreCache = merge([carcass(56), tread(30), sideRibs()]);
  return tyreCache;
}

/** Flat-base 20 in rim with the detachable side ring (outer) and fixed flange (inner). */
function rimGeometry(): THREE.BufferGeometry {
  const rb = D.rimR;
  const outer: V2[] = [
    [0.279, -0.074],
    [0.272, -0.079],
    [0.262, -0.074],
    [rb + 0.0005, -0.066],
    [rb + 0.0005, 0.052],
    [0.258, 0.058],
    [0.264, 0.066],
    [0.27, 0.07],
    [0.278, 0.074],
    [0.281, 0.079],
  ];
  const inner: V2[] = [
    [0.276, 0.081],
    [0.267, 0.078],
    [0.254, 0.071],
    [0.247, 0.062],
    [0.247, -0.063],
    [0.258, -0.071],
    [0.27, -0.074],
  ];
  const g = latheLoopX([...outer, ...inner], 56, 35);
  // split line of the side ring
  const ring = G.torus(0.262, 0.0022, 4, 48);
  ring.rotateY(Math.PI / 2);
  ring.translate(0.06, 0, 0);
  return merge([g, ring]);
}

/**
 * Pressed disc: centre flat at axial xc (stud circle), cone, flat annulus with eight hand
 * holes at xa, outer flange welded into the rim well.
 */
function discGeometry(xc: number, xa: number): THREE.BufferGeometry {
  const t = 0.006;
  const d = Math.sign(xc - xa) || 1;
  const centre: V2[] = [
    [0.052, xc],
    [0.118, xc],
    [0.132, xc - d * 0.006],
    [0.146, xa + d * 0.004],
    [0.152, xa],
  ];
  const cBack = centre.map(([r, x]) => [r + 0.002, x - d * t] as V2).reverse();
  const g1 = latheLoopX([...centre, ...cBack], 48, 35);
  // annulus with hand holes (flat, extruded along X)
  const holes: V2[][] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const pts: V2[] = [];
    for (let k = 0; k < 12; k++) {
      const b = (k / 12) * Math.PI * 2;
      pts.push([Math.cos(a) * 0.192 + Math.cos(b) * 0.028, Math.sin(a) * 0.192 + Math.sin(b) * 0.028]);
    }
    holes.push(pts.reverse());
  }
  const outerC: V2[] = [];
  const innerC: V2[] = [];
  for (let k = 0; k < 48; k++) {
    const b = (k / 48) * Math.PI * 2;
    outerC.push([Math.cos(b) * 0.236, Math.sin(b) * 0.236]);
    innerC.push([Math.cos(b) * 0.15, Math.sin(b) * 0.15]);
  }
  const sh = new THREE.Shape(outerC.map(([x, y]) => new THREE.Vector2(x, y)));
  sh.holes.push(new THREE.Path(innerC.reverse().map(([x, y]) => new THREE.Vector2(x, y))));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const ann = G.extrude(sh, t, 0.0012, 12, 1);
  ann.rotateY(Math.PI / 2);
  ann.translate(xa - (d * t) / 2, 0, 0);
  // rolled lips around the hand holes
  const lips: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const tr = G.torus(0.029, 0.0035, 4, 14);
    tr.rotateY(Math.PI / 2);
    tr.translate(xa + d * 0.001, Math.sin(a) * 0.192, -Math.cos(a) * 0.192);
    lips.push(tr);
  }
  // outer flange into the rim well
  const fl: V2[] = [
    [0.234, xa],
    [0.247, xa - d * 0.004],
    [0.2475, xa - d * 0.02],
  ];
  const flB = fl.map(([r, x]) => [r - 0.004, x] as V2).reverse();
  const g3 = latheLoopX([...fl, ...flB], 48, 35);
  return merge([g1, ann, g3, ...lips]);
}

export type WheelKind = 'front' | 'dualOuter' | 'dualInner' | 'spare';

/**
 * Build a wheel. `groundY` (local) flattens the tyre at the contact patch; `spin` rotates it
 * about the axle (degrees) so bar and nut patterns differ between wheels.
 */
export function buildWheel(kind: WheelKind, spin = 0, groundY?: number): THREE.Group {
  const tyre = tyreGeometry().clone();
  xf(tyre, [0, 0, 0], [spin, 0, 0]);
  if (groundY !== undefined) clampBelow(tyre, groundY);

  const dual = kind === 'dualOuter' || kind === 'dualInner';
  // disc positions (local): front/spare dished outboard; duals dished towards each other
  const xc = dual ? -0.107 : 0.05;
  const xa = dual ? -0.06 : 0.02;
  const metal: THREE.BufferGeometry[] = [rimGeometry(), discGeometry(xc, xa)];
  const hub: THREE.BufferGeometry[] = [];
  const nutX = dual ? xc + 0.006 : xc;
  if (kind !== 'dualInner') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const nut = G.boltHead(0.026, 0.014);
      nut.rotateZ(-Math.PI / 2);
      nut.translate(nutX, Math.cos(a) * 0.095, Math.sin(a) * 0.095);
      hub.push(nut);
    }
  }
  if (kind === 'front') {
    // hub barrel and domed grease cap
    hub.push(
      latheX(
        [
          [0, xc + 0.004],
          [0.07, xc + 0.004],
          [0.072, xc + 0.012],
          [0.066, xc + 0.05],
          [0.062, xc + 0.056],
          [0.05, xc + 0.058],
          [0.048, xc + 0.075],
          [0.04, xc + 0.09],
          [0.025, xc + 0.098],
          [0, xc + 0.1],
        ],
        32,
        40,
      ),
    );
    hub.push(G.torus(0.064, 0.004, 6, 32).rotateY(Math.PI / 2).translate(xc + 0.03, 0, 0));
  } else if (kind === 'dualOuter') {
    // hub with the axle-shaft flange and its studs, recessed between the twin discs
    hub.push(
      latheX(
        [
          [0, xc + 0.004],
          [0.075, xc + 0.004],
          [0.075, xc + 0.03],
          [0.1, xc + 0.034],
          [0.1, xc + 0.046],
          [0.06, xc + 0.05],
          [0.056, xc + 0.08],
          [0.045, xc + 0.096],
          [0, xc + 0.1],
        ],
        36,
        40,
      ),
    );
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2;
      const b = G.boltHead(0.017, 0.009);
      b.rotateZ(-Math.PI / 2);
      b.translate(xc + 0.046, Math.cos(a) * 0.08, Math.sin(a) * 0.08);
      hub.push(b);
    }
  } else if (kind === 'spare') {
    hub.push(cylX(0.05, 0.03, [xc + 0.018, 0, 0], 24));
  }

  const metalG = merge(metal);
  xf(metalG, [0, 0, 0], [spin, 0, 0]);
  const kids: THREE.Object3D[] = [part(tyre, P.rubber()), part(metalG, P.bodyLow())];
  if (hub.length) {
    const hubG = merge(hub);
    xf(hubG, [0, 0, 0], [spin, 0, 0]);
    kids.push(part(hubG, kind === 'front' || kind === 'spare' ? P.bodyLow() : P.chassis()));
  }
  return group(kids);
}
