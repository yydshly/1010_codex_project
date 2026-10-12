/**
 * Running gear for one side (the tank's left, +X; mirrored for the right): two leaf-sprung bogie
 * units, each a carrier arm on a hull bracket with a semi-elliptic leaf spring and two rocking
 * sub-bogies carrying two double road wheels; three rubber-tyred return rollers on brackets; the
 * front drive sprocket (two toothed rings on the final-drive hub) and the rear idler on its
 * tensioner crank.
 *
 * Wheel-local frame: axle along +X (outwards), origin at the centre of the wheel PAIR.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { R, H } from './dims';
import type { Pal } from './palette';
import { WIN, type TrackSolution, linkAnglesAround } from './track';
import { latheX, ringX, rb, merge, nut, cylX } from './util';

const g0 = R.tyreGap / 2, g1 = g0 + R.tyreW; // single tyre spans x in [g0, g1] from the pair centre

/* --------------------------------- road wheel ------------------------------------------- */

let wheelCache: THREE.Group | null = null;
/** Double road wheel (two rubber-tyred pressed discs on one hub). */
export function roadWheelPair(P: Pal): THREE.Group {
  if (wheelCache) return wheelCache.clone();
  const Rt = R.wheelR, rs = Rt - 0.032;
  const tyre = latheX(
    [
      [rs, g0 + 0.002],
      [rs + 0.004, g0],
      [Rt - 0.012, g0],
      [Rt, g0 + 0.01],
      [Rt, g1 - 0.01],
      [Rt - 0.012, g1],
      [rs + 0.004, g1],
      [rs, g1 - 0.002],
      [rs, g0 + 0.002],
    ],
    28,
    35,
  );
  const disc = latheX(
    [
      [rs - 0.012, g0 + 0.004],
      [rs + 0.001, g0 + 0.004],
      [rs + 0.001, g1 - 0.002],
      [rs - 0.004, g1 + 0.004],
      [0.075, g1 - 0.012],
      [0.07, g1 - 0.004],
      [0.05, g1 + 0.004],
      [0.046, g1 + 0.03],
      [0.03, g1 + 0.036],
      [0.0, g1 + 0.037],
    ],
    24,
    30,
  );
  const innerDisc = disc.clone();
  innerDisc.scale(-1, 1, 1);
  G.flipWinding(innerDisc);
  const tyreIn = tyre.clone();
  tyreIn.scale(-1, 1, 1);
  G.flipWinding(tyreIn);
  const parts: THREE.Object3D[] = [
    part(merge([tyre, tyreIn]), P.rubber),
    part(merge([disc, innerDisc, cylX(0.05, 2 * g0 + 0.01, 16)]), P.cast),
    part(G.scatter(nut(0.014, 0.007), ringX(0.036, 6, g1 + 0.004, 1, 0.3)), P.cast),
  ];
  wheelCache = group(parts);
  return wheelCache.clone();
}

/* --------------------------------- bogie unit ------------------------------------------- */

/** Semi-elliptic leaf spring lying in the YZ plane, centre at the origin, eye centres at +/- half. */
function leafSpring(half: number, leaves = 6): THREE.BufferGeometry {
  const list: THREE.BufferGeometry[] = [];
  const t = 0.011, w = 0.075, arch = 0.05;
  for (let i = 0; i < leaves; i++) {
    const hl = half * (1 - i * 0.14);
    const n = 12;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= n; k++) {
      const z = -hl + (2 * hl * k) / n;
      const y = arch * (1 - (z / half) ** 2) + i * t;
      pts.push(new THREE.Vector3(0, y, z));
    }
    // leaf as a swept rectangle: build quads between consecutive points
    const pos: number[] = [];
    const q = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    const off = (p: THREE.Vector3, sx: number, sy: number) => new THREE.Vector3(p.x + (sx * w) / 2, p.y + sy * t, p.z);
    for (let k = 0; k < n; k++) {
      const a = pts[k], b = pts[k + 1];
      q(off(a, -1, 1), off(a, 1, 1), off(b, 1, 1), off(b, -1, 1)); // top
      q(off(a, 1, 0), off(a, -1, 0), off(b, -1, 0), off(b, 1, 0)); // bottom
      q(off(a, 1, 1), off(a, 1, 0), off(b, 1, 0), off(b, 1, 1)); // +x
      q(off(a, -1, 0), off(a, -1, 1), off(b, -1, 1), off(b, -1, 0)); // -x
    }
    const a = pts[0], b = pts[n];
    q(off(a, -1, 0), off(a, 1, 0), off(a, 1, 1), off(a, -1, 1));
    q(off(b, 1, 0), off(b, -1, 0), off(b, -1, 1), off(b, 1, 1));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    list.push(g);
  }
  // main-leaf eyes and the centre clamp band
  for (const z of [-half, half]) {
    const e = cylX(0.02, w, 10);
    e.translate(0, 0.012, z);
    list.push(e);
  }
  list.push(G.box(w + 0.02, leaves * t + 0.03, 0.06).translate(0, arch + (leaves * t) / 2, 0));
  return merge(list);
}

/**
 * One bogie unit in unit-local coordinates: origin on the track centre line (x = 0 -> R.trackX)
 * at wheel-centre height, z = unit centre.
 */
export function bogieUnit(P: Pal): THREE.Group {
  const out: THREE.Object3D[] = [];
  const wy = 0; // wheel centre height (local)
  const pivY = 0.07; // sub-bogie pivot above the wheel axles
  const xo = g1 + 0.012; // outer sub-bogie plate (outside the outer tyre)
  const xi = -(g1 + 0.012); // inner sub-bogie plate
  for (const sz of [R.subDz, -R.subDz]) {
    // wheels
    for (const wz of [R.wheelDz, -R.wheelDz]) {
      const w = roadWheelPair(P);
      w.position.set(0, wy, sz + wz);
      out.push(w);
    }
    // sub-bogie side plates (lozenge from axle to axle, rising to the pivot)
    const outline: G.V2[] = [
      [-R.wheelDz - 0.04, -0.03],
      [R.wheelDz + 0.04, -0.03],
      [R.wheelDz + 0.05, 0.02],
      [0.06, pivY + 0.05],
      [-0.06, pivY + 0.05],
      [-R.wheelDz - 0.05, 0.02],
    ];
    for (const x of [xo, xi]) {
      const g = G.plate(outline, 0.012, 'zy', 0.003);
      g.translate(x + Math.sign(x) * 0.006, wy, sz);
      out.push(part(g, P.cast));
    }
    // axle caps and pivot boss (outer face)
    for (const wz of [R.wheelDz, -R.wheelDz]) out.push(part(cylX(0.026, 0.02, 12, xo + 0.02), P.cast, { p: [0, wy, sz + wz] }));
    out.push(part(cylX(0.034, 2 * xo + 0.05, 14), P.cast, { p: [0, wy + pivY, sz] }));
    out.push(part(G.scatter(nut(0.016, 0.008), ringX(0.022, 4, xo + 0.03, 1, 0.4)), P.cast, { p: [0, wy + pivY, sz] }));
    // spring seat on the sub-bogie (the spring end rests on it)
    out.push(part(rb(0.1, 0.03, 0.08, 0.008), P.cast, { p: [0, wy + pivY + 0.06, sz] }));
    // tie between the side plates over the wheels
    out.push(part(rb(2 * xo + 0.012, 0.03, 0.05, 0.006), P.cast, { p: [0, wy + pivY + 0.03, sz] }));
  }
  // leaf spring above the unit, ends on the sub-bogie seats
  const sp = leafSpring(R.subDz - 0.02);
  out.push(part(sp, P.track, { p: [0, wy + pivY + 0.08, 0] }));
  // carrier: inner beam joining the two sub-bogie pivots, hung from the hull bracket
  const xc = xi - 0.035; // carrier beam plane (between the inner plate and the hull side)
  const beam: G.V2[] = [
    [-R.subDz - 0.05, pivY - 0.04],
    [R.subDz + 0.05, pivY - 0.04],
    [R.subDz + 0.05, pivY + 0.05],
    [0.12, pivY + 0.2],
    [-0.12, pivY + 0.2],
    [-R.subDz - 0.05, pivY + 0.05],
  ];
  const gb = G.plate(beam, 0.03, 'zy', 0.005);
  gb.translate(xc, wy, 0);
  out.push(part(gb, P.cast));
  // spring centre clamp post from the carrier up to the spring band
  out.push(part(rb(0.09, 0.12, 0.05, 0.006), P.cast, { p: [-0.09, wy + pivY + 0.2, 0] }));
  // hull bracket (bolted to the lower hull side) with the carrier pivot
  const xHull = H.xLow - R.trackX; // hull side face in unit-local x
  const bw = xc - 0.015 - xHull;
  out.push(part(rb(bw, 0.2, 0.3, 0.01), P.cast, { p: [xHull + bw / 2, wy + pivY + 0.2, 0] }));
  out.push(part(cylX(0.05, xc - xHull + 0.02, 16, (xc + xHull) / 2), P.cast, { p: [0, wy + pivY + 0.16, 0] }));
  out.push(part(G.scatter(nut(0.02, 0.009), [
    { p: new THREE.Vector3(xHull + bw, wy + pivY + 0.25, 0.1), n: new THREE.Vector3(1, 0, 0) },
    { p: new THREE.Vector3(xHull + bw, wy + pivY + 0.25, -0.1), n: new THREE.Vector3(1, 0, 0) },
    { p: new THREE.Vector3(xHull + bw, wy + pivY + 0.1, 0.11), n: new THREE.Vector3(1, 0, 0) },
    { p: new THREE.Vector3(xHull + bw, wy + pivY + 0.1, -0.11), n: new THREE.Vector3(1, 0, 0) },
  ]), P.cast));
  return group(out);
}

/* ------------------------------- return roller ---------------------------------------- */

let rollerCache: THREE.Group | null = null;
/** Return roller pair with its bracket; local origin at the roller axle centre (track centre line). */
export function returnRoller(P: Pal): THREE.Group {
  if (rollerCache) return rollerCache.clone();
  const r = R.rollerR, rs = r - 0.018;
  const tyre = latheX([[rs, g0], [r - 0.006, g0], [r, g0 + 0.006], [r, g1 - 0.006], [r - 0.006, g1], [rs, g1], [rs, g0]], 20, 35);
  const tyreIn = tyre.clone().scale(-1, 1, 1);
  G.flipWinding(tyreIn);
  const out: THREE.Object3D[] = [part(merge([tyre, tyreIn]), P.rubber)];
  out.push(part(merge([cylX(rs, g1 - g0 + 0.004, 16, (g0 + g1) / 2), cylX(rs, g1 - g0 + 0.004, 16, -(g0 + g1) / 2), cylX(0.03, 2 * g1 + 0.03, 12)]), P.cast));
  // bracket: axle arm from the hull side
  const xHull = H.xLow - R.trackX;
  out.push(part(cylX(0.024, -xHull - g1 + 0.01, 10, (xHull - g1) / 2), P.cast));
  out.push(part(rb(0.04, 0.16, 0.12, 0.008), P.cast, { p: [xHull + 0.02, 0.03, 0] }));
  out.push(part(cylX(0.02, 0.02, 10, g1 + 0.02), P.cast));
  rollerCache = group(out);
  return rollerCache.clone();
}

/* ------------------------------------ sprocket ---------------------------------------- */

/** Front drive sprocket: two toothed rings either side of the guide-horn lane on a dished hub. */
export function sprocket(P: Pal, sol: TrackSolution): THREE.Group {
  const pr = sol.sprocketR;
  const rootR = pr - 0.03;
  const tipR = pr + 0.028;
  const n = R.teeth;
  const pts: G.V2[] = [];
  // tooth profile around the ring (angle measured from +Z towards +Y, i.e. atan2(y, z))
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const half = (WIN.l * 0.8) / pr / 2;
    const step = (Math.PI * 2) / n;
    const seq: [number, number][] = [
      [a - step / 2, rootR],
      [a - half * 1.25, rootR],
      [a - half * 0.8, tipR - 0.006],
      [a - half * 0.4, tipR],
      [a + half * 0.4, tipR],
      [a + half * 0.8, tipR - 0.006],
      [a + half * 1.25, rootR],
    ];
    for (const [aa, rr] of seq) pts.push([Math.cos(aa) * rr, Math.sin(aa) * rr]);
  }
  const ringShape = G.shape(pts, 0, [
    Array.from({ length: 24 }, (_, i) => {
      const a = -(i / 24) * Math.PI * 2;
      return [Math.cos(a) * (rootR - 0.03), Math.sin(a) * (rootR - 0.03)] as G.V2;
    }),
  ]);
  const ringW = WIN.w * 0.8;
  const out: THREE.Object3D[] = [];
  for (const sx of [1, -1]) {
    const g = new THREE.ExtrudeGeometry(ringShape, { depth: ringW, bevelEnabled: false, curveSegments: 1 });
    // extrude along +Z in the (z, y) = (shape x, shape y) plane -> map shape x -> world z, shape y -> y
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    G.flipWinding(g);
    g.translate(sx * WIN.x - ringW / 2, 0, 0);
    out.push(part(G.crease(g, 40), P.cast));
  }
  // hub drum between the rings and the dished outer cover with bolts
  out.push(part(cylX(rootR - 0.02, 2 * WIN.x + ringW, 28), P.cast));
  out.push(
    part(
      latheX(
        [
          [rootR - 0.02, WIN.x + ringW / 2 - 0.004],
          [rootR - 0.03, WIN.x + ringW / 2 + 0.01],
          [0.1, WIN.x + ringW / 2 + 0.03],
          [0.06, WIN.x + ringW / 2 + 0.05],
          [0.0, WIN.x + ringW / 2 + 0.055],
        ],
        28,
        30,
      ),
      P.cast,
    ),
  );
  out.push(part(G.scatter(nut(0.016, 0.008), ringX(0.12, 8, WIN.x + ringW / 2 + 0.024, 1)), P.cast));
  // final-drive housing from the hull nose to the inner ring
  const xHull = H.xLow - R.trackX;
  out.push(part(cylX(0.11, -xHull - WIN.x - ringW / 2 + 0.01, 24, (xHull - WIN.x - ringW / 2) / 2), P.cast));
  out.push(part(cylX(0.14, 0.03, 28, xHull + 0.015), P.cast));
  out.push(part(G.scatter(nut(0.018, 0.008), ringX(0.125, 10, xHull + 0.03, 1)), P.cast));
  return group(out);
}

/** Phase angle for the sprocket so its teeth sit in the link windows. */
export function sprocketPhase(sol: TrackSolution): number {
  const ang = linkAnglesAround(sol, [R.sprocketZ, R.sprocketY], sol.sprocketR * Math.cos(Math.PI / R.teeth));
  return ang.length ? -ang[0] : 0;
}

/* ------------------------------------ idler ------------------------------------------- */

/** Rear idler: two spoked discs with a gap for the guide horns, on the tensioner crank. */
export function idler(P: Pal): THREE.Group {
  const r = R.idlerR;
  const out: THREE.Object3D[] = [];
  const rim = (sx: number) => {
    const a = 0.028, b = 0.11;
    const prof: G.V2[] = [
      [r - 0.03, a],
      [r, a],
      [r, b - 0.006],
      [r - 0.008, b],
      [r - 0.03, b],
      [r - 0.03, a],
    ];
    const g = latheX(prof, 36, 35);
    if (sx < 0) {
      g.scale(-1, 1, 1);
      G.flipWinding(g);
    }
    return g;
  };
  out.push(part(merge([rim(1), rim(-1)]), P.cast));
  // spoked discs (six lightening holes)
  for (const sx of [1, -1]) {
    const s = G.shape(
      Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return [Math.cos(a) * (r - 0.028), Math.sin(a) * (r - 0.028)] as G.V2;
      }),
      0,
      Array.from({ length: 6 }, (_, k) => {
        const c = (k / 6) * Math.PI * 2;
        return Array.from({ length: 10 }, (_, i) => {
          const a = -(i / 10) * Math.PI * 2;
          return [Math.cos(c) * 0.11 + Math.cos(a) * 0.04, Math.sin(c) * 0.11 + Math.sin(a) * 0.04] as G.V2;
        });
      }),
    );
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false, curveSegments: 1 });
    g.rotateY(Math.PI / 2);
    g.translate(sx * 0.07 - 0.006, 0, 0);
    out.push(part(G.crease(g, 40), P.cast));
  }
  out.push(part(cylX(0.05, 0.2, 20), P.cast));
  out.push(part(cylX(0.035, 0.04, 16, 0.12), P.cast));
  out.push(part(G.scatter(nut(0.015, 0.007), ringX(0.028, 6, 0.14, 1)), P.cast));
  // tensioner crank to the hull rear and the adjuster screw
  const xHull = H.xLow - R.trackX;
  out.push(part(cylX(0.045, -xHull - 0.08, 16, (xHull - 0.1) / 2), P.cast));
  out.push(part(rb(0.05, 0.2, 0.09, 0.01), P.cast, { p: [xHull + 0.03, 0.08, 0.04], r: [-20, 0, 0] }));
  out.push(part(G.rod([xHull + 0.03, 0.17, 0.08], [xHull + 0.03, 0.26, 0.34], 0.018, 10), P.gun));
  out.push(part(rb(0.06, 0.07, 0.06, 0.008), P.cast, { p: [xHull + 0.03, 0.27, 0.36] }));
  return group(out);
}

/* ------------------------------------ assembly ---------------------------------------- */

export function runningGear(P: Pal, sol: TrackSolution): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const z of R.unitZ) {
    const u = bogieUnit(P);
    u.position.set(R.trackX, R.wheelY, z);
    out.push(u);
  }
  for (const z of R.rollerZ) {
    const rr = returnRoller(P);
    rr.position.set(R.trackX, R.rollerY, z);
    out.push(rr);
  }
  const sp = sprocket(P, sol);
  sp.position.set(R.trackX, R.sprocketY, R.sprocketZ);
  sp.rotation.x = sprocketPhase(sol);
  out.push(sp);
  const id = idler(P);
  id.position.set(R.trackX, R.idlerY, R.idlerZ);
  out.push(id);
  return out;
}
