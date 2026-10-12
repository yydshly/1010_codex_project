/**
 * M13/40 hull: bolted lower hull between the tracks with the rounded (single-piece cast)
 * transmission cover, the full-width fighting-compartment superstructure (sloped side plates,
 * left-side crew door, driver's visor + hyposcope on the left of the front plate, twin Breda 38
 * spherical mount in its small casemate on the right), the narrower engine compartment with its
 * two large inspection hatches, the rear radiator grille, fuel cap, and the short front mudguards
 * plus the rear mudguards alongside the engine compartment.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { H } from './dims';
import type { Pal } from './palette';
import { sideBody, taperBody, bentSheet, rb, bolt, row, cylX, cylZ, merge, faceTo, type P2, type P3, D } from './util';

/** superstructure half width at the top of the side plates */
export const SUP_TOP = 0.925;
/** superstructure half width at height y */
export const supW = (y: number) => H.xSup - ((H.xSup - SUP_TOP) * (y - H.yGuard)) / (H.yRoof - H.yGuard);
/** superstructure front plate z at height y */
export const frontZ = (y: number) => H.zFrontBot - ((H.zFrontBot - H.zFrontTop) * (y - H.yGuard)) / (H.yRoof - H.yGuard);
/** engine deck height at z */
export const deckY = (z: number) => H.yDeck + ((H.yDeckRear - H.yDeck) * (z - H.zStep)) / (H.zDeckRear - H.zStep);

const aF = Math.atan2(H.zFrontBot - H.zFrontTop, H.yRoof - H.yGuard);
/** front plate outward normal */
export const NF: P3 = [0, Math.sin(aF), Math.cos(aF)];
const aS = Math.atan2(H.xSup - SUP_TOP, H.yRoof - H.yGuard);
/** left side plate outward normal */
export const NSL: P3 = [Math.cos(aS), Math.sin(aS), 0];
/** upper rear plate outward normal */
const aR = Math.atan2(H.yDeckRear - H.yRearKnee, H.zDeckRear - H.zRear);
export const NR: P3 = [0, Math.cos(aR), -Math.sin(aR)];

/** point on the front plate at (x, y), pushed out by d */
export const onFront = (x: number, y: number, d = 0): P3 => [x, y + NF[1] * d, frontZ(y) + NF[2] * d];
/** point on the left side plate at (y, z), pushed out by d */
export const onSide = (y: number, z: number, d = 0): P3 => [supW(y) + NSL[0] * d, y + NSL[1] * d, z];

function bolts(pts: THREE.Vector3[], n: P3, r = 0.011): THREE.BufferGeometry {
  const N = new THREE.Vector3(...n).normalize();
  return G.scatter(
    bolt(r, r * 0.62),
    pts.map((p, i) => ({ p: p.clone().addScaledVector(N, -0.001), n: N, spin: i * 0.7 })),
  );
}
const pts = (a: P3, b: P3, n: number) => G.along(a, b, n);

/* ------------------------------------------------------------------------------------------ */

function lowerHull(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const lower: P2[] = [
    [H.zBellyR, H.belly],
    [H.zBellyF, H.belly],
    [H.zNose, H.yNoseLow],
    [H.zNose, H.yNoseTop],
    [1.45, H.yNoseTop],
    [1.45, H.yGuard],
    [H.zLowRear, H.yGuard],
    [H.zLowRear, H.yLowRearBot],
  ];
  out.push(part(sideBody(lower, -H.xLow, H.xLow, 0.01), P.paint));
  // rounded single-piece transmission cover: quarter ellipse nose, then the shallow glacis
  const cz = 2.03, cy = H.yNoseTop, rz = H.zNose - cz, ry = 0.25;
  const cover: P2[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    cover.push([cz + Math.cos(a) * rz, cy + Math.sin(a) * ry]);
  }
  cover.push([frontZ(H.yGlacisTop) - 0.004, H.yGlacisTop], [1.45, H.yGlacisTop], [1.45, H.yNoseTop]);
  out.push(part(sideBody(cover, -H.xLow + 0.004, H.xLow - 0.004, 0.012), P.cast));
  // cover flange bolts: along the nose and along both sides
  const bl: THREE.BufferGeometry[] = [];
  bl.push(bolts(pts([-0.7, H.yNoseTop - 0.035, H.zNose], [0.7, H.yNoseTop - 0.035, H.zNose], 13), [0, 0, 1], 0.012));
  for (const sx of [1, -1]) {
    const x = sx * (H.xLow + 0.0);
    const list: THREE.Vector3[] = [];
    for (let i = 1; i < 12; i += 2) {
      const a = (i / 12) * (Math.PI / 2);
      list.push(new THREE.Vector3(x, cy + Math.sin(a) * (ry - 0.035), cz + Math.cos(a) * (rz - 0.035)));
    }
    list.push(new THREE.Vector3(x, 1.07, 1.85), new THREE.Vector3(x, 1.075, 1.7));
    bl.push(bolts(list, [sx, 0, 0], 0.011));
  }
  // lower front plate rows, belly edge rows are hidden; lower rear plate edges
  const nLow = new THREE.Vector3(0, -(H.zNose - H.zBellyF), H.yNoseLow - H.belly).normalize();
  bl.push(
    bolts(
      pts([-0.72, H.yNoseLow - 0.03, H.zNose - 0.03], [0.72, H.yNoseLow - 0.03, H.zNose - 0.03], 11).map((p) => p.addScaledVector(nLow, 0.0)),
      [0, nLow.y, nLow.z],
      0.011,
    ),
  );
  bl.push(bolts(pts([-0.74, 0.66, H.zLowRear], [0.74, 0.66, H.zLowRear], 12), [0, 0, -1], 0.011));
  out.push(part(merge(bl), P.cast));
  return out;
}

/* ------------------------------------------------------------------------------------------ */

function superstructure(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const sup: P2[] = [
    [H.zFrontBot, H.yGuard],
    [H.zFrontTop, H.yRoof],
    [H.zStep, H.yRoof],
    [H.zStep, H.yGuard],
  ];
  out.push(part(taperBody(sup, H.xSup, SUP_TOP, H.yGuard, H.yRoof, 0.01), P.paint));

  // ---- bolt rows (plates bolted to the internal frame)
  const bl: THREE.BufferGeometry[] = [];
  const yT = H.yRoof - 0.028, yB = H.yGuard + 0.03;
  // front plate: top row, both side edges, sponson bottoms, seam line above the transmission cover
  bl.push(bolts(pts(onFront(-SUP_TOP + 0.04, yT), onFront(SUP_TOP - 0.04, yT), 19), NF));
  for (const sx of [1, -1]) {
    const e: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) {
      const y = yB + ((yT - yB) * i) / 7;
      e.push(new THREE.Vector3(...onFront(sx * (supW(y) - 0.035), y)));
    }
    bl.push(bolts(e, NF));
    bl.push(bolts(pts(onFront(sx * 0.84, yB), onFront(sx * (H.xSup - 0.05), yB), 3), NF));
  }
  bl.push(bolts(pts(onFront(-0.76, H.yGlacisTop + 0.035), onFront(0.76, H.yGlacisTop + 0.035), 15), NF));
  // sides: top, bottom, front edge, rear edge and a vertical frame line (both sides)
  const side: THREE.BufferGeometry[] = [];
  const sideRow = (a: P2, b: P2, n: number) => {
    const list: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const y = a[1] + (b[1] - a[1]) * t, z = a[0] + (b[0] - a[0]) * t;
      list.push(new THREE.Vector3(...onSide(y, z)));
    }
    side.push(bolts(list, NSL));
  };
  sideRow([frontZ(yT) - 0.04, yT], [H.zStep + 0.035, yT], 17);
  sideRow([frontZ(yB) - 0.04, yB], [H.zStep + 0.035, yB], 17);
  sideRow([frontZ(yB + 0.06) - 0.035, yB + 0.06], [frontZ(yT - 0.06) - 0.035, yT - 0.06], 6);
  sideRow([H.zStep + 0.035, yB + 0.06], [H.zStep + 0.035, yT - 0.06], 6);
  const sideG = merge(side);
  bl.push(sideG);
  const sideR = sideG.clone();
  sideR.scale(-1, 1, 1);
  G.flipWinding(sideR);
  bl.push(sideR);
  // roof: edges
  for (const sx of [1, -1]) bl.push(bolts(pts([sx * (SUP_TOP - 0.035), H.yRoof, H.zFrontTop - 0.04], [sx * (SUP_TOP - 0.035), H.yRoof, H.zStep + 0.035], 17), [0, 1, 0]));
  bl.push(bolts(pts([-SUP_TOP + 0.08, H.yRoof, H.zFrontTop - 0.035], [SUP_TOP - 0.08, H.yRoof, H.zFrontTop - 0.035], 15), [0, 1, 0]));
  bl.push(bolts(pts([-SUP_TOP + 0.08, H.yRoof, H.zStep + 0.035], [SUP_TOP - 0.08, H.yRoof, H.zStep + 0.035], 15), [0, 1, 0]));
  // rear wall (outer panels beside the engine compartment)
  for (const sx of [1, -1]) {
    bl.push(bolts(pts([sx * (H.xEng + 0.04), yB, H.zStep], [sx * (H.xEng + 0.04), yT, H.zStep], 7), [0, 0, -1]));
  }
  out.push(part(merge(bl), P.paint));

  // ---- driver's visor (left) and hyposcope above it
  const vx = 0.44, vy = 1.42;
  const visor = group([
    part(rb(0.4, 0.15, 0.05, 0.012), P.cast, { p: [0, 0, 0.02] }),
    part(rb(0.3, 0.075, 0.03, 0.008), P.cast, { p: [0, 0.012, 0.05] }),
    part(G.box(0.24, 0.016, 0.012), P.void, { p: [0, 0.012, 0.062] }),
    part(G.scatter(bolt(0.01, 0.006), [[-0.17, 0.05], [0.17, 0.05], [-0.17, -0.05], [0.17, -0.05]].map(([x, y]) => ({ p: new THREE.Vector3(x, y, 0.044), n: new THREE.Vector3(0, 0, 1) }))), P.cast),
    // opening lever on the left edge
    part(G.rod([0.2, -0.02, 0.03], [0.26, -0.07, 0.03], 0.008, 8), P.cast),
    part(G.cyl(0.013, 0.013, 0.02, 10), P.cast, { p: [0.2, -0.02, 0.03], r: [90, 0, 0] }),
  ]);
  out.push(faceTo(visor, onFront(vx, vy), NF));
  const hypo = group([
    part(rb(0.16, 0.08, 0.13, 0.012), P.cast),
    part(G.box(0.1, 0.022, 0.01), P.vision, { p: [0, 0.008, 0.066] }),
    part(rb(0.13, 0.012, 0.03, 0.004), P.cast, { p: [0, 0.03, 0.075] }),
  ]);
  hypo.position.set(vx, H.yRoof + 0.04, H.zFrontTop - 0.1);
  out.push(hypo);

  // ---- twin Breda 38 spherical mount in its small casemate (right)
  const mx = -0.43, my = 1.37;
  const cas = group([
    part(rb(0.38, 0.32, 0.1, 0.016), P.cast, { p: [0, 0, 0.04] }),
    part(G.scatter(bolt(0.011, 0.007), [
      [-0.16, 0.13], [0, 0.135], [0.16, 0.13], [-0.16, -0.13], [0, -0.135], [0.16, -0.13], [-0.17, 0], [0.17, 0],
    ].map(([x, y]) => ({ p: new THREE.Vector3(x, y, 0.089), n: new THREE.Vector3(0, 0, 1) }))), P.cast),
  ]);
  out.push(faceTo(cas, onFront(mx, my), NF));
  const ballC = new THREE.Vector3(...onFront(mx, my, 0.07));
  out.push(part(new THREE.SphereGeometry(0.105, 24, 16), P.cast, { p: ballC }));
  // armoured collar around the ball opening
  const collar = G.torus(0.106, 0.016, 8, 32);
  const col = part(collar, P.cast);
  faceTo(col, onFront(mx, my, 0.1), NF);
  out.push(col);
  // two barrels side by side (horizontal), with the slotted flash hiders
  const bar: THREE.BufferGeometry[] = [], barV: THREE.BufferGeometry[] = [];
  for (const dx of [0.042, -0.042]) {
    const z0 = ballC.z + 0.06;
    bar.push(cylZ(0.026, 0.07, 16, z0 + 0.035).translate(mx + dx, ballC.y - 0.01, 0));
    bar.push(cylZ(0.0125, 0.28, 12, z0 + 0.07 + 0.14).translate(mx + dx, ballC.y - 0.01, 0));
    const fh = G.lathe([[0.0, 0], [0.019, 0], [0.019, 0.004], [0.016, 0.06], [0.0125, 0.06]], 12, 30);
    fh.rotateX(Math.PI / 2);
    fh.translate(mx + dx, ballC.y - 0.01, z0 + 0.34);
    bar.push(fh);
    barV.push(cylZ(0.0045, 0.004, 8, z0 + 0.401).translate(mx + dx, ballC.y - 0.01, 0));
  }
  out.push(part(merge(bar), P.gun));
  out.push(part(merge(barV), P.void));

  // ---- crew door on the left side, with hinges on its front edge and a pistol port
  const dz0 = -0.24, dz1 = 0.42, dy0 = 1.12, dy1 = 1.56;
  const dw = dz1 - dz0, dh = dy1 - dy0;
  const door = group([
    part(rb(dw, dh, 0.022, 0.012), P.paint, { p: [0, 0, 0.011] }),
    part(
      G.scatter(
        bolt(0.01, 0.006),
        [
          ...G.along([-dw / 2 + 0.03, dh / 2 - 0.03, 0], [dw / 2 - 0.03, dh / 2 - 0.03, 0], 9),
          ...G.along([-dw / 2 + 0.03, -dh / 2 + 0.03, 0], [dw / 2 - 0.03, -dh / 2 + 0.03, 0], 9),
        ].map((p) => ({ p: new THREE.Vector3(p.x, p.y, 0.021), n: new THREE.Vector3(0, 0, 1) })),
      ),
      P.paint,
    ),
    // pistol port: round shutter plate with a pivot boss
    part(G.cyl(0.065, 0.068, 0.018, 24), P.cast, { p: [0.04, 0.02, 0.03], r: [90, 0, 0] }),
    part(G.cyl(0.018, 0.018, 0.02, 12), P.cast, { p: [0.04, 0.02, 0.045], r: [90, 0, 0] }),
    // handle
    part(G.tube([[-0.2, -0.06, 0.022], [-0.2, -0.06, 0.05], [-0.2, 0.04, 0.05], [-0.2, 0.04, 0.022]], 0.008, 8, 16), P.cast),
  ]);
  // local +X of faceTo on the left side points to -Z: door local x runs rear->front reversed
  out.push(faceTo(door, onSide((dy0 + dy1) / 2, (dz0 + dz1) / 2, 0.002), NSL));
  // hinges on the front edge
  for (const y of [dy0 + 0.07, dy1 - 0.07]) {
    const p = onSide(y, dz1 + 0.012, 0.028);
    out.push(part(G.cyl(0.02, 0.02, 0.1, 12), P.cast, { p, r: [0, 0, aS / D] }));
    out.push(part(rb(0.012, 0.07, 0.08, 0.004), P.cast, { p: onSide(y, dz1 + 0.05, 0.008), r: [0, 0, aS / D] }));
  }

  // ---- pistol ports in the rear wall panels beside the engine compartment
  for (const sx of [1, -1]) {
    const pp = group([
      part(G.cyl(0.055, 0.058, 0.016, 24), P.cast, { r: [90, 0, 0] }),
      part(G.cyl(0.016, 0.016, 0.018, 12), P.cast, { p: [0, 0, 0.012], r: [90, 0, 0] }),
    ]);
    pp.position.set(sx * 0.935, 1.3, H.zStep - 0.008);
    pp.rotation.y = Math.PI;
    out.push(pp);
  }
  return out;
}

/* ------------------------------------------------------------------------------------------ */

function engineCompartment(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const eng: P2[] = [
    [H.zStep + 0.02, H.yGuard],
    [H.zStep + 0.02, H.yDeck],
    [H.zDeckRear, H.yDeckRear],
    [H.zRear, H.yRearKnee],
    [H.zRear, H.yGuard],
  ];
  out.push(part(sideBody(eng, -H.xEng, H.xEng, 0.01), P.paint));
  const bl: THREE.BufferGeometry[] = [];
  for (const sx of [1, -1]) {
    // side plate top & bottom rows
    bl.push(bolts(pts([sx * H.xEng, deckY(-0.45) - 0.03, -0.45], [sx * H.xEng, deckY(-2.0) - 0.03, -2.0], 15), [sx, 0, 0]));
    // deck edge rows
    bl.push(bolts(pts([sx * (H.xEng - 0.035), deckY(-0.45), -0.45], [sx * (H.xEng - 0.035), deckY(-2.0), -2.0], 15), [0, 1, 0]));
  }
  // rear knee (lower rear plate top) row
  bl.push(bolts(pts([-0.78, H.yRearKnee - 0.03, H.zRear], [0.78, H.yRearKnee - 0.03, H.zRear], 13), [0, 0, -1]));
  out.push(part(merge(bl), P.paint));

  // ---- two large inspection hatches (hinged on their outer edges)
  const hz0 = -0.55, hz1 = -1.55, hw = 0.66;
  for (const sx of [1, -1]) {
    const cx = sx * (0.03 + hw / 2);
    const cz = (hz0 + hz1) / 2;
    const y = deckY(cz) + 0.009;
    const hl = hz0 - hz1;
    const hatch: THREE.Object3D[] = [
      part(rb(hw, 0.018, hl, 0.008), P.sheet, { p: [cx, y, cz] }),
      // stiffening ribs
      part(rb(0.04, 0.014, hl - 0.12, 0.005), P.sheet, { p: [cx, y + 0.015, cz] }),
      part(rb(hw - 0.12, 0.014, 0.04, 0.005), P.sheet, { p: [cx, y + 0.015, cz] }),
      // handle near the inner edge
      part(G.tube([[cx - sx * (hw / 2 - 0.05), y + 0.008, cz - 0.08], [cx - sx * (hw / 2 - 0.05), y + 0.045, cz - 0.06], [cx - sx * (hw / 2 - 0.05), y + 0.045, cz + 0.06], [cx - sx * (hw / 2 - 0.05), y + 0.008, cz + 0.08]], 0.008, 8, 20), P.cast),
    ];
    // hinges on the outer edge
    for (const z of [hz0 - 0.15, cz, hz1 + 0.15]) {
      hatch.push(part(cylZ(0.018, 0.1, 12, z), P.cast, { p: [sx * (0.03 + hw + 0.015), deckY(z) + 0.02, 0] }));
      hatch.push(part(rb(0.07, 0.012, 0.08, 0.004), P.cast, { p: [sx * (0.03 + hw - 0.02), deckY(z) + 0.022, z] }));
    }
    out.push(...hatch);
    // perimeter bolts
    out.push(
      part(
        bolts(
          [...pts([cx - hw / 2 + 0.03, y + 0.009, hz0 - 0.03], [cx + hw / 2 - 0.03, y + 0.009, hz0 - 0.03], 7), ...pts([cx - hw / 2 + 0.03, y + 0.009, hz1 + 0.03], [cx + hw / 2 - 0.03, y + 0.009, hz1 + 0.03], 7)],
          [0, 1, 0],
          0.009,
        ),
        P.sheet,
      ),
    );
  }
  // centre strip between the hatches
  out.push(part(rb(0.05, 0.014, 1.02, 0.004), P.paint, { p: [0, deckY(-1.05) + 0.006, -1.05] }));

  // ---- fuel cap on the rear deck
  out.push(part(G.cyl(0.075, 0.08, 0.026, 24), P.cast, { p: [0, deckY(-1.82) + 0.013, -1.82] }));
  out.push(part(G.cyl(0.05, 0.05, 0.012, 20), P.cast, { p: [0, deckY(-1.82) + 0.032, -1.82] }));
  out.push(part(rb(0.04, 0.02, 0.05, 0.004), P.cast, { p: [0, deckY(-1.82) + 0.03, -1.73] }));

  // ---- radiator grille on the upper rear plate: frame, dark well and angled horizontal slats
  const len = Math.hypot(H.zDeckRear - H.zRear, H.yDeckRear - H.yRearKnee);
  const mid: P3 = [0, (H.yDeckRear + H.yRearKnee) / 2, (H.zDeckRear + H.zRear) / 2];
  const gw = 1.3, gh = len - 0.1;
  const slats: THREE.Object3D[] = [];
  const nS = 9;
  for (let i = 0; i < nS; i++) {
    const yy = -gh / 2 + 0.03 + ((gh - 0.06) * i) / (nS - 1);
    slats.push(part(rb(gw - 0.03, 0.012, 0.05, 0.003), P.sheet, { p: [0, yy, 0.004], r: [-40, 0, 0] }));
  }
  const grille = group([
    part(G.box(gw, gh, 0.01), P.void, { p: [0, 0, -0.004] }),
    // frame
    part(rb(gw + 0.06, 0.03, 0.03, 0.006), P.sheet, { p: [0, gh / 2 + 0.005, 0.012] }),
    part(rb(gw + 0.06, 0.03, 0.03, 0.006), P.sheet, { p: [0, -gh / 2 - 0.005, 0.012] }),
    part(rb(0.03, gh + 0.04, 0.03, 0.006), P.sheet, { p: [gw / 2 + 0.015, 0, 0.012] }),
    part(rb(0.03, gh + 0.04, 0.03, 0.006), P.sheet, { p: [-gw / 2 - 0.015, 0, 0.012] }),
    part(rb(0.025, gh, 0.025, 0.005), P.sheet, { p: [0, 0, 0.012] }),
    ...slats,
  ]);
  out.push(faceTo(grille, mid, NR));
  return out;
}

/* ------------------------------------------------------------------------------------------ */

function mudguards(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const side: THREE.Object3D[] = [];
  const x0 = H.xEng, x1 = H.xGuard;
  // rear guard alongside the engine compartment: flat plate, outer lip and support brackets
  const rz0 = H.zStep + 0.02, rz1 = -2.3;
  side.push(part(rb(x1 - x0, 0.007, rz0 - rz1, 0.003), P.sheet, { p: [(x0 + x1) / 2, H.yGuard + 0.0035, (rz0 + rz1) / 2] }));
  side.push(part(rb(0.007, 0.05, rz0 - rz1, 0.003), P.sheet, { p: [x1 - 0.0035, H.yGuard - 0.022, (rz0 + rz1) / 2] }));
  side.push(part(rb(x1 - x0, 0.05, 0.007, 0.003), P.sheet, { p: [(x0 + x1) / 2, H.yGuard - 0.022, rz1 + 0.0035] }));
  for (const z of [-0.9, -1.75]) {
    const gus = G.plate([[0, 0], [x1 - x0 - 0.02, 0], [0, -0.12]], 0.008, 'xy', 0.002);
    side.push(part(gus, P.sheet, { p: [x0, H.yGuard, z] }));
  }
  // front guard: flat over the sponson front, curving down over the sprocket
  const path: P2[] = [
    [H.zFrontBot + 0.002, H.yGuard + 0.006],
    [2.08, H.yGuard + 0.006],
    [2.22, H.yGuard - 0.004],
    [2.34, H.yGuard - 0.032],
    [2.46, H.yGuard - 0.09],
  ];
  side.push(part(bentSheet(path, 0.007, 0.81, x1, 0.002), P.sheet));
  side.push(part(bentSheet(path.map(([z, y]): P2 => [z, y - 0.007]), 0.035, x1 - 0.007, x1, 0.002), P.sheet));
  // bolts along the rear guard inner edge
  side.push(part(bolts(pts([x0 + 0.03, H.yGuard + 0.007, rz0 - 0.08], [x0 + 0.03, H.yGuard + 0.007, rz1 + 0.05], 14), [0, 1, 0], 0.009), P.sheet));
  out.push(mirrorX(group(side)));
  return out;
}

/* ------------------------------------------------------------------------------------------ */

export function hull(P: Pal): THREE.Group {
  return group([...lowerHull(P), ...superstructure(P), ...engineCompartment(P), ...mudguards(P)], { name: 'hull' });
}

export { cylX };
