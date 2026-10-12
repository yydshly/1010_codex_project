/**
 * Road wheels of the Type 82: 5.25-16 cross-country tyres on pressed-steel disc wheels with
 * drop-centre rims (TM E9-803 tabulated data), domed hub caps, brake drums and backing plates,
 * and (rear) the final-reduction gear housings in the wheel hubs (15:21 spur gears, 1.4:1).
 *
 * Wheel-local frame: axle along +X, outboard face towards +X, centre at the origin.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, type V3, latheX, merge, clampGround } from './util';

// ------------------------------------------------------------------ tyre
/** Carcass profile (r, axial) from the inboard bead over the crown to the outboard bead. */
function carcassProfile(): V2[] {
  const half: V2[] = [
    [0.2045, 0.0355],
    [0.2125, 0.0445],
    [0.2235, 0.0505],
    [0.2395, 0.0588],
    [0.2585, 0.0648],
    [0.2785, 0.0674],
    [0.2975, 0.0666],
    [0.3125, 0.0628],
    [0.3235, 0.0566],
    [0.3305, 0.0492],
    [0.3342, 0.0405],
    [0.3356, 0.028],
    [0.3362, 0.014],
    [0.3364, 0.0],
  ];
  const inb = half.map(([r, a]) => [r, -a] as V2);
  const outb = half.slice(0, -1).reverse();
  return [...inb, ...outb];
}

/** Sidewall rib rings (moulded bead above the rim line). */
function sidewallRibs(): THREE.BufferGeometry {
  const gs: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const g = G.torus(0.2265, 0.0022, 6, 72);
    g.rotateY(Math.PI / 2);
    g.translate(s * 0.0525, 0, 0);
    gs.push(g);
  }
  return merge(gs);
}

/**
 * Cross-country tread: two rows of slanted lugs, staggered by half a pitch, forming an open
 * chevron (self-cleaning cross-country pattern typical of wartime 5.25-16 tyres).
 */
function treadLugs(pitches = 34): THREE.BufferGeometry {
  const lug = G.rbox(0.05, 0.016, 0.027, 0.004, 1);
  const base = lug.index ? lug.toNonIndexed() : lug;
  const gs: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const tmp = new THREE.Matrix4();
  for (let k = 0; k < pitches; k++) {
    for (const side of [1, -1]) {
      const th = ((k + (side > 0 ? 0 : 0.5) + 0.25) / pitches) * Math.PI * 2;
      m.makeRotationX(th);
      m.multiply(tmp.makeTranslation(side * 0.0265, D.lugR - 0.008, 0));
      m.multiply(tmp.makeRotationY(side * G.deg(22)));
      gs.push(base.clone().applyMatrix4(m));
    }
  }
  return merge(gs);
}

let tyreCache: THREE.BufferGeometry | null = null;
/** Complete tyre (carcass + lugs + ribs) in the wheel-local frame. */
export function tyreGeo(): THREE.BufferGeometry {
  if (!tyreCache) tyreCache = merge([latheX(carcassProfile(), 72, 35), treadLugs(), sidewallRibs()]);
  return tyreCache.clone();
}

// ------------------------------------------------------------------ wheel (rim, disc, cap)
/** Closed rim section: 16 x 3.00D drop-centre rim (outer skin, then inner skin back). */
function rimGeo(): THREE.BufferGeometry {
  const outer: V2[] = [
    [0.2215, -0.0445],
    [0.2175, -0.0428],
    [0.2082, -0.0412],
    [0.2035, -0.0355],
    [0.2032, -0.024],
    [0.1985, -0.0175],
    [0.1862, -0.0118],
    [0.1838, -0.004],
    [0.1838, 0.009],
    [0.1868, 0.0165],
    [0.1995, 0.0225],
    [0.2032, 0.0265],
    [0.2035, 0.0355],
    [0.2082, 0.0412],
    [0.2175, 0.0428],
    [0.2215, 0.0445],
  ];
  const th = 0.0028;
  const inner = outer.map(([r, a]) => [r - th, a] as V2).reverse();
  // close through rounded lips
  const prof: V2[] = [...outer, [0.2232, 0.0452 - 0.0035], ...inner, [0.2232, -0.0452 + 0.0035], outer[0]];
  return latheX(prof, 72, 50);
}

/** Pressed wheel disc: welded in the well, pressed stiffening ring, flat mounting face. */
function discGeo(): THREE.BufferGeometry {
  const front: V2[] = [
    [0.1812, 0.0035],
    [0.172, 0.0072],
    [0.158, 0.0135],
    [0.1455, 0.0215],
    [0.1375, 0.0245],
    [0.1295, 0.0232],
    [0.1215, 0.0192],
    [0.112, 0.0178],
    [0.06, 0.0178],
    [0.036, 0.0178],
  ];
  const th = 0.003;
  const back = front.map(([r, a]) => [r, a - th] as V2).reverse();
  return latheX([...front, ...back, front[0]], 64, 40);
}

/** Domed hub cap (plain), clipped over the wheel-nut circle. */
function capGeo(): THREE.BufferGeometry {
  const prof: V2[] = [
    [0.1145, 0.0182],
    [0.1188, 0.0205],
    [0.1196, 0.0238],
    [0.1172, 0.0272],
    [0.1112, 0.0316],
    [0.1022, 0.0402],
    [0.0892, 0.0502],
    [0.0722, 0.0592],
    [0.0522, 0.0656],
    [0.0302, 0.0694],
    [0.0, 0.0708],
  ];
  return latheX(prof, 64, 30);
}

/** Brake drum + backing plate (inboard of the disc). */
function drumGeo(): THREE.BufferGeometry {
  const prof: V2[] = [
    [0.0, -0.0205],
    [0.1, -0.0205],
    [0.114, -0.026],
    [0.1165, -0.034],
    [0.1165, -0.086],
    [0.121, -0.089],
    [0.127, -0.092],
    [0.127, -0.1],
    [0.06, -0.106],
    [0.0, -0.106],
  ].reverse() as V2[];
  return latheX(prof, 48, 35);
}

// ------------------------------------------------------------------ assembly
export interface WheelPlacement {
  /** wheel centre */
  c: V3;
  /** +1: outboard face towards +X (left side), -1: towards -X (right side) */
  side: 1 | -1;
  rear?: boolean;
  /** extra rotation of the wheel about its axle (deg), to vary the lug/valve phase */
  spin?: number;
  /** flatten the tyre on the ground (road wheels) */
  grounded?: boolean;
}

function frameMatrix(w: WheelPlacement): THREE.Matrix4 {
  const m = new THREE.Matrix4().makeTranslation(w.c[0], w.c[1], w.c[2]);
  if (w.side < 0) m.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
  m.multiply(new THREE.Matrix4().makeRotationX(G.deg(w.spin ?? 0)));
  return m;
}

/** A complete road wheel, placed (and optionally flattened at the contact patch). */
export function roadWheel(w: WheelPlacement): THREE.Object3D {
  const m = frameMatrix(w);
  const tyre = tyreGeo().applyMatrix4(m);
  if (w.grounded) clampGround(tyre, 0);
  const wheelParts: THREE.BufferGeometry[] = [rimGeo(), discGeo(), capGeo()];
  // five wheel-nut bosses under the cap edge are hidden; valve stem through the disc
  const valve = G.rod([0.004, 0.171, 0.0], [0.03, 0.176, 0.0], 0.0032, 8);
  const out: THREE.Object3D[] = [part(tyre, P.rubber())];
  const wg = merge(wheelParts).applyMatrix4(m);
  out.push(part(wg, P.bodyLow()));
  out.push(part(valve.applyMatrix4(m), P.darkSteel()));
  out.push(part(drumGeo().applyMatrix4(m), P.chassis()));
  if (w.rear) out.push(...reductionHousing(w));
  return group(out);
}

/**
 * Final-reduction gear housing on the inboard side of a rear wheel: a two-lobed casting
 * (driving pinion above the wheel centre, driven gear on the axle), eight studs.
 */
function reductionHousing(w: WheelPlacement): THREE.Object3D[] {
  const dy = 0.081; // centre distance of the 15/21-tooth gears (approx.)
  const r1 = 0.084, r2 = 0.064;
  const pts = hull2([...circle(0, 0, r1, 40), ...circle(0, dy, r2, 40)]);
  const m0 = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0));
  const slabX = (outline: V2[], depth: number, bevel: number, x: number) => {
    const g = G.extrude(G.shape(outline), depth, bevel, 6, 2);
    g.applyMatrix4(m0);
    G.flipWinding(g);
    g.translate(x, 0, 0);
    return g;
  };
  const body = slabX(pts, 0.06, 0.012, -0.139);
  const flange = slabX(pts.map(([x, y]) => [x * 1.07, (y - dy / 2) * 1.07 + dy / 2] as V2), 0.008, 0.002, -0.128);
  // eight nuts on the split-line flange, facing outboard
  const nuts: THREE.BufferGeometry[] = [];
  const nut = G.boltHead(0.011, 0.006);
  nut.rotateZ(-Math.PI / 2); // +Y -> +X
  const ring = hull2([...circle(0, 0, r1 * 0.99, 40), ...circle(0, dy, r2 * 0.99, 40)]);
  for (let i = 0; i < 8; i++) {
    const q = ring[Math.floor((i / 8) * ring.length)];
    nuts.push(nut.clone().translate(-0.124, q[1], q[0]));
  }
  // cover boss where the swing-axle tube enters (at the driving pinion)
  const boss = G.cyl(0.05, 0.056, 0.03, 32);
  boss.rotateZ(Math.PI / 2);
  boss.translate(-0.182, dy, 0);
  const m = frameMatrix({ ...w, spin: 0 });
  const g = merge([body, flange, ...nuts, boss]).applyMatrix4(m);
  return [part(g, P.chassis())];
}

function circle(cx: number, cy: number, r: number, n: number): V2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as V2;
  });
}

/** Convex hull (Andrew's monotone chain), counter-clockwise. */
export function hull2(points: V2[]): V2[] {
  const p = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: V2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: V2[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** A spare wheel (tyre, rim, disc, hub cap) placed by an arbitrary wheel-local -> world matrix. */
export function spareWheel(m: THREE.Matrix4): THREE.Object3D[] {
  return [
    part(tyreGeo().applyMatrix4(m), P.rubber()),
    part(merge([rimGeo(), discGeo(), capGeo()]).applyMatrix4(m), P.bodyLow()),
    part(G.rod([0.004, 0.171, 0.0], [0.03, 0.176, 0.0], 0.0032, 8).applyMatrix4(m), P.darkSteel()),
  ];
}

/** The four road wheels on the ground. */
export function buildRoadWheels(): THREE.Group {
  const y = D.axleY;
  return group([
    roadWheel({ c: [D.xFW, y, D.zFA], side: 1, spin: 0, grounded: true }),
    roadWheel({ c: [-D.xFW, y, D.zFA], side: -1, spin: 5, grounded: true }),
    roadWheel({ c: [D.xRW, y, D.zRA], side: 1, rear: true, spin: 3, grounded: true }),
    roadWheel({ c: [-D.xRW, y, D.zRA], side: -1, rear: true, spin: 8, grounded: true }),
  ]);
}
