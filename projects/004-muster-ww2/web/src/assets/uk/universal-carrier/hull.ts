/**
 * Universal Carrier Mk II armoured body: open-topped hull of flat plates with real thickness (sides,
 * belly, rear plate, lower and upper nose), the driver's straight front panel on the right with the
 * hinged visor (propped open), the gunner's angular bay jutting out over the upper nose on the left with
 * its raised roof and the Bren aperture, the hull sides rising at the front as the cab cheeks; the
 * central engine housing with chamfered top edges, hinged lid, side louvres and the radiator grille,
 * the divisional plates behind the crew, floor plates, riveted edge strips, the Mk II track guards with
 * support brackets and entry steps, and the rear stowage bins.
 *
 * Frame: +Z forward, +X = the vehicle's left (gunner's side), y = 0 ground.
 */
import { THREE, G } from '../../../core/kit';
import type { Pal } from './palette';
import { H, ENGINE, BREN } from './dims';
import { Bucket, slab, prism, rb, rivetRow, rivet, nut, cylX, cylZ, bentRod, surfaceFrame, rrect, type P3 } from './util';

const XS = H.xSide;
const XI = XS - H.t; // inner face of the side plates
const T = H.t;
const BAY = H.bay;

/** Point on the driver's front panel outer face at height y. */
export function cabFrontZ(y: number): number {
  return H.glacisTopZ + ((y - H.glacisTopY) / (H.cabTopY - H.glacisTopY)) * (H.cabFrontTopZ - H.glacisTopZ);
}
/** Glacis (upper nose) frame: outward normal, down-slope direction, point on the face. */
const GL_DZ = H.noseZ - H.glacisTopZ, GL_DY = H.glacisTopY - H.noseY;
const GL_L = Math.hypot(GL_DZ, GL_DY);
export const glacis = {
  n: [0, GL_DZ / GL_L, GL_DY / GL_L] as P3,
  down: [0, -GL_DY / GL_L, GL_DZ / GL_L] as P3,
  /** outer-face height at z */
  yAt: (z: number) => H.glacisTopY - ((z - H.glacisTopZ) / GL_DZ) * GL_DY,
  /** point on the outer face, s = distance down the slope from the top edge */
  at: (x: number, s: number, off = 0): P3 => [x, H.glacisTopY - (s * GL_DY) / GL_L + (off * GL_DZ) / GL_L, H.glacisTopZ + (s * GL_DZ) / GL_L + (off * GL_DY) / GL_L],
  len: GL_L,
};
function planeN(z0: number, y0: number, z1: number, y1: number): P3 {
  const dz = z1 - z0, dy = y1 - y0;
  const l = Math.hypot(dz, dy);
  return [0, -dz / l, dy / l];
}
/** outward normal of the driver's panel and its lean from vertical (degrees, negative = top back) */
export const CF_N = planeN(H.glacisTopZ, H.glacisTopY, H.cabFrontTopZ, H.cabTopY);
const CF_LEAN = (Math.atan2(H.cabFrontTopZ - H.glacisTopZ, H.cabTopY - H.glacisTopY) * 180) / Math.PI;
const cfRot = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(CF_LEAN * (Math.PI / 180), 0, 0));

/** Driver's visor opening (driver's panel) and the gun aperture (bay front face). */
export const VISOR = { x0: -0.57, x1: -0.25, y0: 1.17, y1: 1.32 };
export const SLOT = { x: BREN.x, hw: 0.03, y0: 1.21, y1: 1.39 };

/* ------------------------------------------------------------------ armour */
function armour(B: Bucket, P: Pal) {
  // side plates, rising at the front as the cab cheeks (higher on the gunner's side)
  for (const sx of [1, -1]) {
    const front: [number, number][] =
      sx > 0
        ? [
            [BAY.backZ, glacis.yAt(BAY.backZ)],
            [BAY.backZ, BAY.topY],
            [BAY.roofRearZ, BAY.topY],
          ]
        : [
            [H.glacisTopZ, H.glacisTopY],
            [H.cabFrontTopZ, H.cabTopY],
            [H.cabSideRearZ, H.cabTopY],
          ];
    const o: P3[] = (
      [
        [H.bellyRearZ, H.belly],
        [H.bellyFrontZ, H.belly],
        [H.noseZ, H.noseY],
        ...front,
        [H.cabSideDropZ, H.top],
        [H.rearZ, H.top],
        [H.rearZ, H.rearLowY],
      ] as [number, number][]
    ).map(([z, y]) => [sx * XS, y, z]);
    B.add(P.paint, slab(o, T, [sx, 0, 0], 0.003));
  }
  const X = XI;
  // belly and rear bend
  B.add(P.paint, slab([[-X, H.belly, H.bellyRearZ], [X, H.belly, H.bellyRearZ], [X, H.belly, H.bellyFrontZ], [-X, H.belly, H.bellyFrontZ]], T, [0, -1, 0], 0.003));
  B.add(P.paint, slab([[-X, H.belly, H.bellyRearZ], [X, H.belly, H.bellyRearZ], [X, H.rearLowY, H.rearZ], [-X, H.rearLowY, H.rearZ]], T, planeN(H.rearZ, H.rearLowY, H.bellyRearZ, H.belly), 0.003));
  // rear plate
  B.add(P.paint, slab([[-X, H.rearLowY, H.rearZ], [X, H.rearLowY, H.rearZ], [X, H.top, H.rearZ], [-X, H.top, H.rearZ]], T, [0, 0, -1], 0.003));
  // lower nose, upper nose (glacis), the driver's straight panel (right side and middle)
  B.add(P.paint, slab([[-X, H.belly, H.bellyFrontZ], [X, H.belly, H.bellyFrontZ], [X, H.noseY, H.noseZ], [-X, H.noseY, H.noseZ]], T + 0.001, planeN(H.bellyFrontZ, H.belly, H.noseZ, H.noseY), 0.003));
  B.add(P.paint, slab([[-X, H.noseY, H.noseZ], [X, H.noseY, H.noseZ], [X, H.glacisTopY, H.glacisTopZ], [-X, H.glacisTopY, H.glacisTopZ]], T + 0.001, glacis.n, 0.003));
  const zf = cabFrontZ;
  const xp = BAY.xInBack + 0.004;
  B.add(
    P.paint,
    slab(
      [[-X, H.glacisTopY, zf(H.glacisTopY)], [xp, H.glacisTopY, zf(H.glacisTopY)], [xp, H.cabTopY, zf(H.cabTopY)], [-X, H.cabTopY, zf(H.cabTopY)]],
      T + 0.001,
      CF_N,
      0.003,
      0,
      [[[VISOR.x0, VISOR.y0, zf(VISOR.y0)], [VISOR.x1, VISOR.y0, zf(VISOR.y0)], [VISOR.x1, VISOR.y1, zf(VISOR.y1)], [VISOR.x0, VISOR.y1, zf(VISOR.y1)]]],
    ),
  );

  // edge strips (capping along the top edges) and rivet rows
  const riv: THREE.BufferGeometry[] = [];
  const cap = (a: P3, b: P3, r = 0.0075) => B.add(P.paint, G.rod(a, b, r, 8));
  for (const sx of [1, -1]) {
    const xc = sx * (XS - 0.004);
    const riseZ = sx > 0 ? BAY.roofRearZ : H.cabSideRearZ, riseY = sx > 0 ? BAY.topY : H.cabTopY;
    cap([xc, H.top + 0.002, H.rearZ + 0.01], [xc, H.top + 0.002, H.cabSideDropZ]);
    cap([xc, H.top + 0.002, H.cabSideDropZ], [xc, riseY + 0.001, riseZ]);
    cap([xc, riseY + 0.002, riseZ], [xc, riseY + 0.002, sx > 0 ? BAY.backZ - 0.004 : H.cabFrontTopZ - 0.004]);
    // inner angle frame behind the top edge: rivets on the outer face
    riv.push(rivetRow([sx * XS, H.top - 0.028, H.rearZ + 0.05], [sx * XS, H.top - 0.028, H.cabSideDropZ - 0.02], 24, [sx, 0, 0]));
    // front edge of the side plate (joint to the driver's panel / bay) and the nose plates
    if (sx < 0) riv.push(rivetRow([sx * XS, H.glacisTopY + 0.04, zf(H.glacisTopY + 0.04) - 0.03], [sx * XS, H.cabTopY - 0.04, zf(H.cabTopY - 0.04) - 0.03], 7, [sx, 0, 0]));
    else riv.push(rivetRow([sx * XS, glacis.yAt(BAY.backZ) + 0.05, BAY.backZ - 0.03], [sx * XS, BAY.topY - 0.04, BAY.backZ - 0.03], 9, [sx, 0, 0]));
    riv.push(rivetRow([sx * XS, H.noseY + 0.035, H.noseZ - 0.075], [sx * XS, H.glacisTopY - 0.02, H.glacisTopZ - 0.05], 8, [sx, 0, 0]));
    // rear edge (joint to the rear plate), vertical frame lines (bulkhead positions)
    riv.push(rivetRow([sx * XS, H.rearLowY + 0.04, H.rearZ + 0.028], [sx * XS, H.top - 0.06, H.rearZ + 0.028], 9, [sx, 0, 0]));
    for (const z of [H.divZ - 0.01, -0.62]) riv.push(rivetRow([sx * XS, H.guardY + 0.07, z], [sx * XS, H.top - 0.06, z], 6, [sx, 0, 0]));
    // rear plate and glacis edges
    riv.push(rivetRow([sx * (XS - 0.028), H.rearLowY + 0.04, H.rearZ], [sx * (XS - 0.028), H.top - 0.04, H.rearZ], 9, [0, 0, -1]));
    riv.push(G.scatter(rivet(0.0065), [0.3, 0.42, 0.54].map((s) => ({ p: glacis.at(sx * (XS - 0.03), s), n: glacis.n }))));
  }
  riv.push(G.scatter(rivet(0.0065), [0.08, 0.2].map((s) => ({ p: glacis.at(-(XS - 0.03), s), n: glacis.n }))));
  riv.push(G.scatter(rivet(0.0065), G.along([-XS + 0.03, H.glacisTopY + 0.04, 0], [-XS + 0.03, H.cabTopY - 0.03, 0], 7).map((p) => ({ p: [p.x, p.y, zf(p.y)] as P3, n: CF_N }))));
  // driver's panel foot, top and inner edge; glacis top edge; rear plate top and bottom
  riv.push(G.scatter(rivet(0.0065), G.along([-XS + 0.06, 0, 0], [BAY.xInBack - 0.03, 0, 0], 11).map((p) => ({ p: [p.x, H.glacisTopY + 0.03, zf(H.glacisTopY + 0.03)] as P3, n: CF_N }))));
  riv.push(G.scatter(rivet(0.0065), G.along([-XS + 0.06, 0, 0], [BAY.xInBack - 0.03, 0, 0], 11).map((p) => ({ p: [p.x, H.cabTopY - 0.025, zf(H.cabTopY - 0.025)] as P3, n: CF_N }))));
  riv.push(G.scatter(rivet(0.0065), G.along([-XS + 0.06, 0, 0], [BAY.xInBack - 0.02, 0, 0], 11).map((p) => ({ p: glacis.at(p.x, 0.035), n: glacis.n }))));
  riv.push(rivetRow([-XS + 0.06, H.top - 0.028, H.rearZ], [XS - 0.06, H.top - 0.028, H.rearZ], 16, [0, 0, -1]));
  riv.push(rivetRow([-XS + 0.06, H.rearLowY + 0.03, H.rearZ], [XS - 0.06, H.rearLowY + 0.03, H.rearZ], 16, [0, 0, -1]));
  for (const g of riv) B.add(P.paint, g);
  // weld seam along the nose tip; capping strips on the driver's panel and the rear plate
  B.add(P.paint, G.weld([[-X + 0.01, H.noseY + 0.002, H.noseZ + 0.003], [X - 0.01, H.noseY + 0.002, H.noseZ + 0.003]], 0.006));
  cap([-XS + 0.004, H.cabTopY + 0.003, H.cabFrontTopZ - 0.006], [BAY.xInBack, H.cabTopY + 0.003, H.cabFrontTopZ - 0.006], 0.008);
  cap([-XS + 0.004, H.top + 0.003, H.rearZ + 0.006], [XS - 0.004, H.top + 0.003, H.rearZ + 0.006]);
}

/* ------------------------------------------------------------------ gunner's bay */
function bay(B: Bucket, P: Pal) {
  const t = 0.009;
  const yg = glacis.yAt;
  const top = BAY.topY;
  // plan corners (x, z): inner back, inner front, outer front, outer back (at the hull side)
  const ib: [number, number] = [BAY.xInBack, BAY.backZ], ifr: [number, number] = [BAY.xInFront, BAY.frontZ];
  const ofr: [number, number] = [BAY.xOutFront, BAY.frontZ], ob: [number, number] = [XI, BAY.backZ];
  const faceN = (a: [number, number], b: [number, number]): P3 => {
    // outward normal of a vertical face from a to b (plan), pointing away from the bay centre
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const l = Math.hypot(dx, dz);
    return [dz / l, 0, -dx / l];
  };
  const wall = (a: [number, number], b: [number, number], holes: P3[][] = []) => {
    let n = faceN(a, b);
    const cx = (a[0] + b[0]) / 2 - 0.4, cz = (a[1] + b[1]) / 2 - 1.5;
    if (n[0] * cx + n[2] * cz < 0) n = [-n[0], 0, -n[2]];
    B.add(P.paint, slab([[a[0], yg(a[1]) - 0.004, a[1]], [b[0], yg(b[1]) - 0.004, b[1]], [b[0], top, b[1]], [a[0], top, a[1]]], t, n, 0.0025, 0, holes));
    return n;
  };
  wall(ib, ifr);
  const fz = BAY.frontZ;
  wall(ifr, ofr, [[[SLOT.x - SLOT.hw, SLOT.y0, fz], [SLOT.x + SLOT.hw, SLOT.y0, fz], [SLOT.x + SLOT.hw, SLOT.y1, fz], [SLOT.x - SLOT.hw, SLOT.y1, fz]]]);
  wall(ofr, ob);
  // raised inner wall behind the bay (above the driver's panel), back to the roof's rear edge
  B.add(P.paint, slab([[BAY.xInBack, H.cabTopY - 0.02, BAY.backZ + 0.004], [BAY.xInBack, top, BAY.backZ + 0.004], [BAY.xInBack, top, BAY.roofRearZ], [BAY.xInBack, top - 0.1, BAY.roofRearZ], [BAY.xInBack, H.cabTopY - 0.02, BAY.roofRearZ + 0.1]], t, [-1, 0, 0], 0.0025));
  // roof: over the bay and back to the rear edge
  B.add(P.paint, slab([[BAY.xInBack, top, BAY.roofRearZ], [XI, top, BAY.roofRearZ], [XI, top, ob[1]], [ofr[0], top, ofr[1]], [ifr[0], top, ifr[1]], [ib[0], top, ib[1]]], t, [0, 1, 0], 0.0025));
  // capping on the roof rear edge, rivets along the roof edges and the bay corners
  B.add(P.paint, G.rod([BAY.xInBack, top + 0.002, BAY.roofRearZ + 0.004], [XS - 0.004, top + 0.002, BAY.roofRearZ + 0.004], 0.0075, 8));
  const rv: THREE.BufferGeometry[] = [];
  const edge = (a: [number, number], b: [number, number], n: number) => {
    const ux = b[0] - a[0], uz = b[1] - a[1];
    const l = Math.hypot(ux, uz);
    const k = 0.025 / l;
    let nx = uz / l, nz = -ux / l;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if (nx * (0.4 - mx) + nz * (1.55 - mz) < 0) { nx = -nx; nz = -nz; }
    rv.push(rivetRow([a[0] + ux * k + nx * 0.02, top, a[1] + uz * k + nz * 0.02], [b[0] - ux * k + nx * 0.02, top, b[1] - uz * k + nz * 0.02], n, [0, 1, 0], 0.006));
  };
  edge(ib, ifr, 3);
  edge(ifr, ofr, 5);
  edge(ofr, ob, 3);
  const corner = (c: [number, number], d: [number, number]) => {
    // vertical rivet row just beside a corner, on the face running from c towards d
    const ux = d[0] - c[0], uz = d[1] - c[1];
    const l = Math.hypot(ux, uz);
    const px = c[0] + (ux / l) * 0.025, pz = c[1] + (uz / l) * 0.025;
    let n = faceN(c, d);
    if (n[0] * (px - 0.4) + n[2] * (pz - 1.5) < 0) n = [-n[0], 0, -n[2]];
    rv.push(rivetRow([px + n[0] * 0.0045, yg(pz) + 0.05, pz + n[2] * 0.0045], [px + n[0] * 0.0045, top - 0.03, pz + n[2] * 0.0045], 8, n, 0.006));
  };
  corner(ifr, ofr);
  corner(ofr, ifr);
  corner(ifr, ib);
  corner(ofr, ob);
  for (const g of rv) B.add(P.paint, g);
  // weld beads along the bay's foot on the upper nose
  for (const [a, b] of [[ib, ifr], [ifr, ofr], [ofr, ob]] as [number, number][][]) {
    B.add(P.paint, G.weld([[a[0], yg(a[1]) + 0.002, a[1] + 0.004], [b[0], yg(b[1]) + 0.002, b[1] + 0.004]], 0.005));
  }
  // gun aperture: cast collar round the slot, shutter plate parked beside it in its guides
  const yc = (SLOT.y0 + SLOT.y1) / 2, hh = (SLOT.y1 - SLOT.y0) / 2;
  const cm = surfaceFrame([SLOT.x, yc, fz], [1, 0, 0], [0, 0, 1]);
  const collar = prism(rrect(-SLOT.hw - 0.024, -hh - 0.024, SLOT.hw + 0.024, hh + 0.024, 0.02, 3), 0.016, 'xz', 0.004, [rrect(-SLOT.hw, -hh, SLOT.hw, hh, 0.01, 2).reverse()]);
  collar.translate(0, 0.008, 0);
  B.add(P.cast, collar, cm);
  B.add(P.cast, G.scatter(nut(0.016, 0.007), [[-0.044, -0.1], [0.044, -0.1], [-0.044, 0.1], [0.044, 0.1]].map(([a, b]) => ({ p: new THREE.Vector3(a, 0.016, b).applyMatrix4(cm), n: new THREE.Vector3(0, 0, 1) }))));
  B.add(P.paint, rb(0.07, 0.006, 0.2, 0.002).translate(0.098, 0.004, 0), cm);
  for (const b of [-0.106, 0.106]) B.add(P.paint, rb(0.1, 0.008, 0.012, 0.002).translate(0.085, 0.006, b), cm);
  B.add(P.steel, rb(0.012, 0.018, 0.03, 0.003).translate(0.128, 0.014, 0), cm);
  // vision slit with a hood in the inner angled face
  const iv = new THREE.Vector3((ib[0] + ifr[0]) / 2, 1.36, (ib[1] + ifr[1]) / 2);
  let n = faceN(ib, ifr);
  if (n[0] > 0) n = [-n[0], 0, -n[2]];
  const vm = surfaceFrame([iv.x, iv.y, iv.z], [-n[2], 0, n[0]], n);
  B.add(P.void, rb(0.1, 0.004, 0.012, 0.001).translate(0, 0.001, 0), vm);
  B.add(P.paint, rb(0.13, 0.02, 0.008, 0.002).translate(0, 0.01, -0.012), vm);
}

/* ------------------------------------------------------------------ driver's visor */
function visor(B: Bucket, P: Pal) {
  const { x0, x1, y0, y1 } = VISOR;
  const zf = cabFrontZ;
  const hy = y1 + 0.03; // hinge line above the opening
  const off = 0.016;
  const N = new THREE.Vector3(...CF_N);
  const hp = new THREE.Vector3((x0 + x1) / 2, hy, zf(hy)).addScaledVector(N, off);
  const open = 28; // degrees, bottom edge swung forward
  const w = x1 - x0 + 0.05, h = y1 - y0 + 0.05;
  // flap: plate with a vision slit, hinge knuckles at the top
  const flap = prism(rrect(-w / 2, -h, w / 2, 0, 0.012, 2), 0.01, 'xy', 0.003, [rrect(-0.11, -h * 0.5 - 0.007, 0.11, -h * 0.5 + 0.007, 0.004, 1).reverse()]);
  const m = new THREE.Matrix4().compose(hp, new THREE.Quaternion().setFromEuler(new THREE.Euler((-open + CF_LEAN) * (Math.PI / 180), 0, 0)), new THREE.Vector3(1, 1, 1));
  B.add(P.paint, flap, m);
  // stiffening rib on the flap face and the grip
  B.add(P.paint, prism(rrect(-w / 2 + 0.02, -0.03, w / 2 - 0.02, -0.014, 0.004, 1), 0.008, 'xy', 0.002).translate(0, 0, 0.009), m);
  B.add(P.steel, bentRod([[-0.05, -h + 0.03, 0.005], [-0.05, -h + 0.03, 0.03], [0.05, -h + 0.03, 0.03], [0.05, -h + 0.03, 0.005]], 0.006, 0.008), m);
  // hinge: knuckles on the plate and on the flap, pin
  const hm = new THREE.Matrix4().compose(hp, cfRot(), new THREE.Vector3(1, 1, 1));
  for (const [xc, len, onFlap] of [[-0.12, 0.07, false], [0, 0.09, true], [0.12, 0.07, false]] as [number, number, boolean][]) {
    const k = cylX(0.012, len, 14).translate(xc, 0, 0);
    if (onFlap) B.add(P.paint, k, m);
    else {
      B.add(P.paint, k, hm);
      B.add(P.paint, rb(len, 0.03, off, 0.003).translate(xc, 0.012, -off / 2), hm);
    }
  }
  B.add(P.steel, cylX(0.005, 0.32, 8), hm);
  // stay (prop) on the inboard side holding the flap open
  const sa = new THREE.Vector3(x1 + 0.015, y0 + 0.02, zf(y0 + 0.02)).addScaledVector(N, 0.008);
  const sb = new THREE.Vector3(w / 2 - 0.02, -h + 0.04, 0.008).applyMatrix4(m);
  B.add(P.steel, G.rod(sa, sb, 0.005, 8));
  B.add(P.steel, rb(0.02, 0.03, 0.016, 0.003), new THREE.Matrix4().compose(sa, cfRot(), new THREE.Vector3(1, 1, 1)));
  // lugs on the panel that the flap closes against
  for (const xx of [x0 - 0.02, x1 + 0.02]) {
    const lp = new THREE.Vector3(xx, y0 - 0.015, zf(y0 - 0.015)).addScaledVector(N, 0.006);
    B.add(P.paint, rb(0.012, 0.04, 0.012, 0.003), new THREE.Matrix4().compose(lp, cfRot(), new THREE.Vector3(1, 1, 1)));
  }
}

/* ------------------------------------------------------------------ engine housing */
function engineHousing(B: Bucket, P: Pal) {
  const { halfW: w, topHalfW: tw, shoulderY: sy, topY: ty, frontZ: zf, rearZ: zr } = ENGINE;
  const fl = H.floor;
  const t = 0.006;
  for (const sx of [1, -1]) {
    B.add(P.paint, slab([[sx * w, fl, zr], [sx * w, fl, zf], [sx * w, sy, zf], [sx * w, sy, zr]], t, [sx, 0, 0], 0.002));
    const cn = new THREE.Vector3(sx * (ty - sy), w - tw, 0).normalize();
    // cheek with the side louvre openings (pressed hoods added below)
    const holes: P3[][] = [];
    for (let i = 0; i < 5; i++) {
      const z0 = -0.22 - i * 0.12;
      const k = 0.25, k1 = 0.72;
      const p = (kk: number, z: number): P3 => [sx * (w + (tw - w) * kk), sy + (ty - sy) * kk, z];
      holes.push([p(k, z0), p(k, z0 - 0.07), p(k1, z0 - 0.07), p(k1, z0)]);
    }
    B.add(P.paint, slab([[sx * w, sy, zr], [sx * w, sy, zf], [sx * tw, ty, zf], [sx * tw, ty, zr]], t, [cn.x, cn.y, 0], 0.002, 0, holes));
    // louvre lips over the openings (hinged along the upper edge, tilted out) + dark wells
    for (let i = 0; i < 5; i++) {
      const z0 = -0.22 - i * 0.12 - 0.035;
      const kk = 0.49;
      const pc: P3 = [sx * (w + (tw - w) * kk), sy + (ty - sy) * kk, z0];
      const fm = surfaceFrame(pc, [0, 0, 1], [cn.x, cn.y, 0]);
      // local: X along z, Y outward, Z = X x Y (down the cheek)
      const up = -0.5 * 0.47 * Math.hypot(tw - w, ty - sy);
      const lip = rb(0.074, 0.003, 0.05, 0.001);
      lip.translate(0, 0, 0.025);
      lip.rotateX(-0.45);
      lip.translate(0, 0.004, up);
      B.add(P.paint, lip, fm);
      B.add(P.void, rb(0.068, 0.004, 0.07, 0.001), fm.clone().multiply(new THREE.Matrix4().makeTranslation(0, -0.014, 0)));
    }
  }
  // front end plate facing the crew
  B.add(P.paint, slab([[-w, fl, zf], [w, fl, zf], [w, sy, zf], [tw, ty, zf], [-tw, ty, zf]], t, [0, 0, 1], 0.002));
  // top: front lid (hinged on the left edge) and the rear radiator grille frame
  const zg0 = -0.6, zg1 = zr + 0.07;
  B.add(P.paint, slab([[-tw, ty, zg0], [tw, ty, zg0], [tw, ty, zf], [-tw, ty, zf]], t, [0, 1, 0], 0.002));
  B.add(P.paint, slab([[-tw, ty, zr], [tw, ty, zr], [tw, ty, zg0], [-tw, ty, zg0]], t, [0, 1, 0], 0.002, 0, [[[-tw + 0.035, ty, zg1], [tw - 0.035, ty, zg1], [tw - 0.035, ty, zg0 - 0.035], [-tw + 0.035, ty, zg0 - 0.035]]]));
  // lid: raised panel with a lip, three hinges on the left edge, two lifting handles, latch
  B.put(P.paint, rb(tw * 2 - 0.03, 0.008, zf - zg0 - 0.03, 0.003), [0, ty + 0.004, (zf + zg0) / 2]);
  B.put(P.paint, rb(tw * 2 - 0.1, 0.006, zf - zg0 - 0.12, 0.003), [0, ty + 0.009, (zf + zg0) / 2]);
  for (const z of [zg0 + 0.12, (zf + zg0) / 2, zf - 0.12]) {
    B.put(P.paint, cylZ(0.011, 0.09, 12), [tw - 0.004, ty + 0.01, z]);
    B.put(P.paint, rb(0.03, 0.006, 0.08, 0.002), [tw - 0.022, ty + 0.011, z]);
  }
  for (const z of [zg0 + 0.2, zf - 0.2]) {
    B.add(P.steel, bentRod([[-tw + 0.05, ty + 0.01, z - 0.06], [-tw + 0.05, ty + 0.045, z - 0.05], [-tw + 0.05, ty + 0.045, z + 0.05], [-tw + 0.05, ty + 0.01, z + 0.06]], 0.006, 0.012));
    B.put(P.paint, rb(0.03, 0.006, 0.03, 0.002), [-tw + 0.05, ty + 0.011, z - 0.06]);
    B.put(P.paint, rb(0.03, 0.006, 0.03, 0.002), [-tw + 0.05, ty + 0.011, z + 0.06]);
  }
  B.put(P.steel, rb(0.04, 0.012, 0.02, 0.003), [-tw + 0.02, ty + 0.012, (zf + zg0) / 2]);
  // radiator grille: transverse louvre slats over a dark well
  B.put(P.void, G.box(tw * 2 - 0.08, 0.004, zg0 - zg1 - 0.04), [0, ty - 0.06, (zg0 + zg1) / 2]);
  const n = 20;
  const sp = (zg0 - 0.035 - zg1) / n;
  for (let i = 0; i < n; i++) {
    const z = zg1 + sp * (i + 0.5);
    B.put(P.paint, rb(tw * 2 - 0.07, 0.036, 0.004, 0.0015), [0, ty - 0.012, z], [35, 0, 0]);
  }
  for (const x of [-0.07, 0.07]) B.put(P.paint, rb(0.006, 0.03, zg0 - zg1 - 0.04, 0.002), [x, ty - 0.016, (zg0 + zg1) / 2]);
  // rivets on the housing seams
  const rv: THREE.BufferGeometry[] = [];
  for (const sx of [1, -1]) {
    rv.push(rivetRow([sx * (w + 0.003), sy - 0.02, zf - 0.03], [sx * (w + 0.003), sy - 0.02, zr + 0.03], 22, [sx, 0, 0], 0.0055));
  }
  rv.push(rivetRow([-tw + 0.015, ty + 0.003, zg0 - 0.015], [tw - 0.015, ty + 0.003, zg0 - 0.015], 8, [0, 1, 0], 0.0055));
  for (const g of rv) B.add(P.paint, g);
  // radiator filler cap on the grille frame, fuel filler on the right rear floor side
  B.put(P.paint, G.cyl(0.035, 0.035, 0.012, 20), [tw - 0.1, ty + 0.006, zr + 0.035]);
  B.put(P.black, G.cyl(0.028, 0.03, 0.024, 20), [tw - 0.1, ty + 0.02, zr + 0.035]);
}

/* ------------------------------------------------------------------ bulkheads, floors */
function interiorPlates(B: Bucket, P: Pal) {
  const fl = H.floor;
  const w = ENGINE.halfW;
  // divisional plates behind the front seats
  for (const sx of [1, -1]) {
    B.add(P.paint, slab([[sx * (w + 0.006), fl, H.divZ], [sx * XI, fl, H.divZ], [sx * XI, 0.9, H.divZ], [sx * (w + 0.006), 0.9, H.divZ]], 0.006, [0, 0, 1], 0.002));
    B.add(P.paint, G.rod([sx * (w + 0.01), 0.9, H.divZ - 0.003], [sx * (XI - 0.004), 0.9, H.divZ - 0.003], 0.006, 8));
    B.add(P.paint, rivetRow([sx * (w + 0.03), 0.87, H.divZ], [sx * (XI - 0.03), 0.87, H.divZ], 5, [0, 0, 1], 0.0055));
  }
  // floor plates (sheet) with raised anti-slip bars and countersunk screws
  const plate = (x0: number, x1: number, z0: number, z1: number) => {
    B.put(P.sheet, rb(x1 - x0, 0.008, z1 - z0, 0.002), [(x0 + x1) / 2, fl - 0.004, (z0 + z1) / 2]);
    const bars: { p: P3 }[] = [];
    for (let z = z0 + 0.05; z < z1 - 0.03; z += 0.08)
      for (let x = x0 + 0.05; x < x1 - 0.03; x += 0.1) bars.push({ p: [x + (((z - z0) / 0.08) % 2 < 1 ? 0 : 0.05), fl, z] });
    const bar = G.box(0.05, 0.004, 0.01);
    bar.translate(0, 0.002, 0);
    B.add(P.sheet, G.scatter(bar, bars.filter((b) => b.p[0] < x1 - 0.03)));
    B.add(P.sheet, G.scatter(nut(0.012, 0.002), [[x0 + 0.02, z0 + 0.02], [x1 - 0.02, z0 + 0.02], [x0 + 0.02, z1 - 0.02], [x1 - 0.02, z1 - 0.02]].map(([x, z]) => ({ p: [x, fl, z] as P3 }))));
  };
  plate(-XI + 0.003, -0.005, H.divZ + 0.01, H.bellyFrontZ - 0.02);
  plate(0.005, XI - 0.003, H.divZ + 0.01, H.bellyFrontZ - 0.02);
  for (const sx of [1, -1]) {
    const xa = sx > 0 ? w + 0.01 : -XI + 0.003, xb = sx > 0 ? XI - 0.003 : -w - 0.01;
    plate(xa, xb, 0.02, H.divZ - 0.01);
    plate(xa, xb, H.rearZ + 0.02, 0.0);
  }
}

/* ------------------------------------------------------------------ track guards + bins */
function guards(B: Bucket, P: Pal) {
  const gy = H.guardY;
  const x0 = XS, x1 = H.guardX;
  const t = 0.004;
  const zFlat = 1.5, zEnd = 1.8, yEnd = 0.545;
  for (const sx of [1, -1]) {
    const X0 = sx * x0, X1 = sx * x1;
    // flat run and the sloped front section
    B.add(P.sheet, slab([[X0, gy + t, H.rearZ], [X1, gy + t, H.rearZ], [X1, gy + t, zFlat], [X0, gy + t, zFlat]], t, [0, 1, 0], 0.0015));
    const sn = new THREE.Vector3(0, zEnd - zFlat, gy - yEnd).normalize();
    B.add(P.sheet, slab([[X0, gy + t, zFlat], [X1, gy + t, zFlat], [X1, yEnd + t, zEnd], [X0, yEnd + t, zEnd]], t, [0, sn.y, sn.z], 0.0015));
    // outer lip turned down, following both sections
    const lip = 0.038;
    B.add(P.sheet, slab([[X1, gy + t, H.rearZ], [X1, gy + t, zFlat], [X1, gy + t - lip, zFlat], [X1, gy + t - lip, H.rearZ]], t, [sx, 0, 0], 0.0015));
    B.add(P.sheet, slab([[X1, gy + t, zFlat], [X1, yEnd + t, zEnd], [X1, yEnd + t - lip, zEnd], [X1, gy + t - lip, zFlat]], t, [sx, 0, 0], 0.0015));
    // rear and front end lips
    B.add(P.sheet, slab([[X0, gy + t, H.rearZ], [X1, gy + t, H.rearZ], [X1, gy + t - lip, H.rearZ], [X0, gy + t - lip, H.rearZ]], t, [0, 0, -1], 0.0015));
    // attachment angle along the hull side, rivets
    B.put(P.sheet, rb(0.022, 0.03, H.rearZ * -1 + zFlat - 0.02, 0.003), [sx * (x0 + 0.011), gy + t + 0.015, (H.rearZ + zFlat) / 2]);
    B.add(P.sheet, rivetRow([sx * (x0 + 0.022), gy + t + 0.018, H.rearZ + 0.05], [sx * (x0 + 0.022), gy + t + 0.018, zFlat - 0.05], 26, [sx, 0, 0], 0.005));
    // support gussets under the guard (inboard of the track)
    for (const z of [-1.2, -0.38, 0.5, 1.28]) {
      B.put(P.sheet, prism([[0, 0.001], [0.055, 0.001], [0, -0.08]], 0.006, 'xy', 0.0015).rotateY(sx > 0 ? 0 : Math.PI), [sx * x0, gy, z]);
    }
    // entry step hung from the lip ahead of the stowage bin (Mk II)
    const zs = -0.74;
    B.add(P.steel, bentRod([[sx * (x1 - 0.004), gy - 0.02, zs - 0.09], [sx * (x1 + 0.002), gy - 0.11, zs - 0.08], [sx * (x1 + 0.002), gy - 0.11, zs + 0.08], [sx * (x1 - 0.004), gy - 0.02, zs + 0.09]], 0.007, 0.02));
    B.put(P.sheet, rb(0.024, 0.006, 0.17, 0.002), [sx * (x1 + 0.004), gy - 0.112, zs]);
    // stowage bin on the guard at the rear
    bin(B, P, sx);
  }
}

function bin(B: Bucket, P: Pal, sx: number) {
  const z0 = H.rearZ + 0.02, z1 = -0.99;
  const xa = XS + 0.006, xb = H.guardX - 0.012;
  const y0 = H.guardY + 0.004, y1 = 0.915;
  const xc = sx * (xa + xb) / 2, wx = xb - xa, zc = (z0 + z1) / 2, lz = z1 - z0;
  B.put(P.sheet, rb(wx, y1 - y0, lz, 0.008), [xc, (y0 + y1) / 2, zc]);
  // lid with a turned-down lip (hinged on the inboard edge)
  B.put(P.sheet, rb(wx + 0.016, 0.012, lz + 0.016, 0.004), [xc, y1 + 0.006, zc]);
  B.put(P.sheet, rb(wx - 0.05, 0.006, lz - 0.08, 0.003), [xc, y1 + 0.014, zc]);
  for (const z of [z0 + 0.12, z1 - 0.12]) {
    B.put(P.sheet, cylZ(0.009, 0.08, 10), [sx * (xa + 0.004), y1 + 0.004, z]);
  }
  // hasps and staples on the outer face, pressed swages
  for (const z of [z0 + 0.2, z1 - 0.2]) {
    B.put(P.steel, rb(0.006, 0.07, 0.032, 0.002), [sx * (xb + 0.011), y1 - 0.03, z]);
    B.put(P.steel, G.torus(0.01, 0.0028, 6, 12), [sx * (xb + 0.014), y1 - 0.075, z], [0, 90, 0]);
  }
  B.put(P.sheet, rb(0.006, 0.03, lz - 0.14, 0.003), [sx * (xb + 0.002), (y0 + y1) / 2 - 0.04, zc]);
  B.put(P.sheet, rb(0.006, 0.03, lz - 0.14, 0.003), [sx * (xb + 0.002), (y0 + y1) / 2 + 0.06, zc]);
}

export function hull(P: Pal): THREE.Group {
  const B = new Bucket();
  armour(B, P);
  bay(B, P);
  visor(B, P);
  engineHousing(B, P);
  interiorPlates(B, P);
  guards(B, P);
  return B.meshes();
}
