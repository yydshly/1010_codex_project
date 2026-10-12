/**
 * Panzer III based hull of the StuG III Ausf. G: welded lower hull from plates with thickness
 * (80 mm nose plate, glacis with the two brake access hatches), engine compartment with its deck
 * hatches, intake louvre covers and rear outlet grille, sloped upper rear plate, lower rear plate
 * with the transverse muffler, tow coupling, tow eyes and tensioner housings, track guards with
 * the hinged front sections, and the belly plates.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './materials';
import { H, W, P } from './dims';
import { cbox, rb, nut, latheX, hullOutline, scatterN, merge, circlePts, type V2 } from './util';

/** Cross-section quad of a plate whose outer face runs A->B, thickness t along the unit normal n. */
export function sect(A: V2, B: V2, t: number, n: V2): V2[] {
  return [A, B, [B[0] + n[0] * t, B[1] + n[1] * t], [A[0] + n[0] * t, A[1] + n[1] * t]];
}
/** Unit normal of segment A->B pointing to the side of point `towards`. */
export function nrm(A: V2, B: V2, towards: V2): V2 {
  const dz = B[0] - A[0], dy = B[1] - A[1];
  const l = Math.hypot(dz, dy);
  let n: V2 = [-dy / l, dz / l];
  const mz = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  if ((towards[0] - mz) * n[0] + (towards[1] - my) * n[1] < 0) n = [-n[0], -n[1]];
  return n;
}
export const lerp2 = (A: V2, B: V2, t: number): V2 => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
/** Prism with a (z, y) cross-section spanning x0..x1. */
export function prism(outline: V2[], x0: number, x1: number, mat: THREE.Material, bevel = 0.004): THREE.Mesh {
  return part(G.plate(outline, x1 - x0, 'zy', bevel), mat, { p: [(x0 + x1) / 2, 0, 0] });
}
/** Light weld bead along a polyline. */
export function bead(pts: G.V3[], r = 0.006): THREE.BufferGeometry {
  const P3 = pts.map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(P3, false, 'centripetal');
  const len = curve.getLength();
  const segs = Math.max(6, Math.round(len / 0.02));
  const g = new THREE.TubeGeometry(curve, segs, r, 5, false);
  const pos = g.attributes.position;
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, c);
    const s = 1 + 0.2 * Math.sin(i * 2.1);
    for (let j = 0; j <= 5; j++) {
      const k = i * 6 + j;
      v.fromBufferAttribute(pos, k).sub(c).multiplyScalar(s).add(c);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Hatch lid (w along X, l along Z) sitting on y = 0, hinged along one long side. */
export function hatchLid(pal: Palette, w: number, l: number, hingeSide: 1 | -1, handle = true): THREE.Group {
  const parts: THREE.Object3D[] = [];
  parts.push(part(rb(w, 0.018, l, 0.008), pal.paint, { p: [0, 0.009, 0] }));
  parts.push(part(rb(w - 0.06, 0.006, l - 0.06, 0.003), pal.paint, { p: [0, 0.02, 0] }));
  for (const dz of [-l * 0.3, l * 0.3]) {
    parts.push(part(G.cyl(0.017, 0.017, 0.09, 14), pal.paint, { p: [hingeSide * (w / 2 + 0.012), 0.017, dz], r: [90, 0, 0] }));
    parts.push(part(cbox(0.07, 0.012, 0.06, 0.002), pal.paint, { p: [hingeSide * (w / 2 - 0.02), 0.022, dz] }));
  }
  if (handle) {
    parts.push(part(G.tube([[-hingeSide * (w / 2 - 0.06), 0.02, -0.07], [-hingeSide * (w / 2 - 0.035), 0.055, -0.04], [-hingeSide * (w / 2 - 0.035), 0.055, 0.04], [-hingeSide * (w / 2 - 0.06), 0.02, 0.07]], 0.008, 8, 20), pal.paint));
  }
  return group(parts);
}

export function hull(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const paint = pal.paint;
  const inner = [0, 0.8] as V2;
  const xl = W.lower, xe = W.engine;
  const tS = 0.03;
  // ------------------------------------------------------------------ lower hull
  const noseN = nrm(P.noseBottom, P.noseTop, inner);
  const glacisN = nrm(P.noseTop, P.glacisTop, inner);
  const sideOutline: V2[] = [
    P.bellyFront,
    P.noseBottom,
    P.noseTop,
    P.glacisTop,
    [P.glacisTop[0], H.fender - 0.006],
    [P.rearUpBottom[0] + 0.02, H.fender - 0.006],
    P.rearLowBottom,
    P.bellyRear,
  ];
  out.push(mirrorX(prism(sideOutline, xl - tS, xl, paint)));
  out.push(prism(sect(P.bellyRear, P.bellyFront, 0.02, [0, 1]), -xl, xl, paint));
  out.push(prism(sect(P.bellyFront, P.noseBottom, 0.03, nrm(P.bellyFront, P.noseBottom, inner)), -(xl - tS), xl - tS, paint));
  out.push(prism(sect(P.rearLowBottom, P.bellyRear, 0.02, nrm(P.rearLowBottom, P.bellyRear, inner)), -(xl - tS), xl - tS, paint));
  // 80 mm nose plate, 25 mm glacis
  out.push(prism(sect(P.noseBottom, P.noseTop, 0.08, noseN), -(xl - tS), xl - tS, paint, 0.006));
  out.push(prism(sect(P.noseTop, P.glacisTop, 0.025, glacisN), -(xl - tS), xl - tS, paint, 0.004));
  // lower rear plate
  const rearLowTop: V2 = [P.rearUpBottom[0] + 0.02, H.fender];
  const rearN = nrm(P.rearLowBottom, rearLowTop, inner);
  out.push(prism(sect(P.rearLowBottom, rearLowTop, 0.025, rearN), -(xl - tS), xl - tS, paint));

  // ------------------------------------------------------------------ engine compartment
  const deckT = 0.016;
  const upRearN = nrm(P.deckRear, P.rearUpBottom, [-1.5, 1.2]);
  out.push(prism(sect(P.deckRear, P.rearUpBottom, 0.02, upRearN), -xe, xe, paint));
  const engSide: V2[] = [
    [P.caseRearZ + 0.02, H.fender],
    [P.caseRearZ + 0.02, H.deck - deckT],
    [P.deckRear[0] + upRearN[0] * 0.02 + 0.01, H.deck - deckT],
    [P.rearUpBottom[0] + upRearN[0] * 0.02, H.fender],
  ];
  out.push(mirrorX(prism(engSide, xe - 0.03, xe, paint)));
  // deck in two plates (visible seam)
  const zSeam = -1.62;
  const deckPlate = (z0: number, z1: number) => part(rb(2 * xe + 0.01, deckT, z0 - z1 - 0.004, 0.003), paint, { p: [0, H.deck - deckT / 2, (z0 + z1) / 2] });
  out.push(deckPlate(P.caseRearZ + 0.02, zSeam), deckPlate(zSeam, P.deckRear[0] - 0.004));

  // ------------------------------------------------------------------ welds
  const beads: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const xi = s * (xl - tS - 0.002);
    const along = (A: V2, B: V2, n: V2): G.V3[] => {
      const a2 = lerp2(A, B, 0.02), b2 = lerp2(A, B, 0.98);
      return [[xi, a2[1] - n[1] * 0.004, a2[0] - n[0] * 0.004], [xi, b2[1] - n[1] * 0.004, b2[0] - n[0] * 0.004]];
    };
    beads.push(bead(along(P.noseBottom, P.noseTop, noseN)));
    beads.push(bead(along(P.noseTop, P.glacisTop, glacisN)));
    // engine side to deck and to the track guard
    beads.push(bead([[s * (xe + 0.002), H.deck - 0.02, P.caseRearZ - 0.02], [s * (xe + 0.002), H.deck - 0.02, P.deckRear[0] + 0.02]], 0.005));
    beads.push(bead([[s * (xe + 0.004), H.fender + 0.004, P.caseRearZ - 0.02], [s * (xe + 0.004), H.fender + 0.004, P.rearUpBottom[0] + 0.03]], 0.005));
  }
  beads.push(bead([[-(xl - tS), P.noseTop[1] + 0.006, P.noseTop[0] - 0.004], [xl - tS, P.noseTop[1] + 0.006, P.noseTop[0] - 0.004]]));
  out.push(part(merge(beads), paint));

  out.push(glacisFittings(pal, glacisN));
  out.push(deckFittings(pal));
  out.push(fenders(pal));
  out.push(rearFittings(pal));
  out.push(belly(pal));
  return group(out);
}

// ------------------------------------------------------------------ glacis and nose
function glacisFittings(pal: Palette, glacisN: V2): THREE.Group {
  const out: THREE.Object3D[] = [];
  const gDir: V2 = [P.glacisTop[0] - P.noseTop[0], P.glacisTop[1] - P.noseTop[1]];
  const gLen = Math.hypot(gDir[0], gDir[1]);
  const gAng = Math.atan2(gDir[1], -gDir[0]);
  const onGlacis = (u: number, x: number, h: number): THREE.Vector3 =>
    new THREE.Vector3(x, P.noseTop[1] + (gDir[1] * u) / gLen - glacisN[1] * h, P.noseTop[0] + (gDir[0] * u) / gLen - glacisN[0] * h);
  const tilt: G.V3 = [(gAng * 180) / Math.PI, 0, 0];
  // two brake access hatches, hinged at their front edge
  for (const s of [1, -1]) {
    const x = s * 0.4;
    out.push(
      group(
        [
          part(rb(0.52, 0.022, 0.4, 0.01), pal.paint),
          part(rb(0.46, 0.008, 0.34, 0.004), pal.paint, { p: [0, 0.014, 0] }),
          part(rb(0.14, 0.012, 0.03, 0.004), pal.paint, { p: [0, 0.02, -0.1] }),
          part(scatterN(nut(0.022, 0.008), [[-0.23, 0.011, -0.17], [0.23, 0.011, -0.17], [-0.23, 0.011, 0.17], [0.23, 0.011, 0.17]], [0, 1, 0]), pal.paint),
        ],
        { p: onGlacis(0.3, x, 0.011), r: tilt },
      ),
    );
    const hc = onGlacis(0.07, x, 0.018);
    for (const dx of [-0.16, 0.16]) out.push(part(G.cyl(0.016, 0.016, 0.1, 14), pal.paint, { p: [x + dx, hc.y, hc.z], r: [0, 0, 90] }));
  }
  // front tow brackets with shackles, on the nose plate edges
  for (const s of [1, -1]) {
    const x = s * (W.lower - 0.1);
    const br = hullOutline([
      { c: [0, 0], r: 0.07 },
      { c: [-0.2, 0.05], r: 0.075 },
      { c: [-0.18, -0.04], r: 0.055 },
    ]);
    const g = G.extrude(G.shape(br, 0, [circlePts(0.026, 14)]), 0.04, 0.006);
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    G.flipWinding(g);
    out.push(part(g, pal.paint, { p: [x, 0.58, P.noseBottom[0] + 0.07] }));
    out.push(part(G.torus(0.042, 0.012, 8, 20, Math.PI), pal.gun, { p: [x, 0.54, P.noseBottom[0] + 0.09], r: [0, 90, 180] }));
    out.push(part(G.cyl(0.012, 0.012, 0.08, 10), pal.gun, { p: [x, 0.58, P.noseBottom[0] + 0.09], r: [0, 0, 90] }));
  }
  return group(out);
}

// ------------------------------------------------------------------ engine deck
function louvreBox(pal: Palette, w: number, l: number, n: number, ang: number): THREE.Object3D[] {
  // raised armoured frame, dark void, angled slats (w across X, l along Z), base at y = 0
  const out: THREE.Object3D[] = [];
  out.push(part(rb(w, 0.035, l, 0.008), pal.paint, { p: [0, 0.0175, 0] }));
  out.push(part(cbox(w - 0.05, 0.02, l - 0.05, 0.001), pal.dark, { p: [0, 0.03, 0] }));
  const pitch = (l - 0.06) / n;
  for (let i = 0; i < n; i++) {
    out.push(part(cbox(w - 0.05, 0.012, pitch * 1.25, 0.002), pal.paint, { p: [0, 0.04, -l / 2 + 0.03 + pitch * (i + 0.5)], r: [ang, 0, 0] }));
  }
  return out;
}

function deckFittings(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const y = H.deck;
  // two large engine access hatches, hinged at their outer edges
  for (const s of [1, -1]) {
    out.push(group([hatchLid(pal, 0.58, 0.92, s as 1 | -1)], { p: [s * 0.31, y, -1.2] }));
    out.push(part(rb(0.62, 0.008, 0.96, 0.004), pal.paint, { p: [s * 0.31, y + 0.002, -1.2] }));
  }
  // armoured air intake covers along the deck sides
  for (const s of [1, -1]) out.push(group(louvreBox(pal, 0.3, 0.9, 10, 30), { p: [s * 0.9, y, -1.2] }));
  // exhaust air outlet grille across the rear of the deck
  out.push(group(louvreBox(pal, 1.7, 0.42, 7, -35), { p: [0, y, -2.05] }));
  // filler caps ahead of the hatches
  for (const s of [1, -1]) {
    out.push(part(G.cyl(0.055, 0.06, 0.03, 20), pal.paint, { p: [s * 0.62, y + 0.015, -0.74] }));
    out.push(part(G.cyl(0.035, 0.035, 0.015, 16), pal.paint, { p: [s * 0.62, y + 0.037, -0.74] }));
  }
  // lifting eyes on the deck corners
  for (const [lx, lz] of [[1.08, -0.72], [-1.08, -0.72], [1.08, -2.28], [-1.08, -2.28]] as V2[]) {
    out.push(part(G.torus(0.035, 0.01, 8, 16, Math.PI), pal.paint, { p: [lx, y, lz], r: [0, 90, 0] }));
  }
  return group(out);
}

// ------------------------------------------------------------------ track guards
function fenders(pal: Palette): THREE.Group {
  const t = 0.005, y = H.fender;
  const x0 = W.lower, x1 = W.fender;
  const zf = 2.52, zr = -2.62;
  const left: THREE.Object3D[] = [];
  left.push(part(G.box(x1 - x0, t, zf - zr), pal.sheet, { p: [(x0 + x1) / 2, y - t / 2, (zf + zr) / 2] }));
  left.push(part(G.box(0.004, 0.03, zf - zr), pal.sheet, { p: [x1 - 0.002, y - 0.015, (zf + zr) / 2] }));
  // hinged front section angled down over the sprocket
  const fl = 0.3, fa = 24, fw = x1 - x0 - 0.03;
  left.push(
    group(
      [
        part(G.box(fw, t, fl), pal.sheet, { p: [0, -t / 2, fl / 2] }),
        part(G.box(0.004, 0.03, fl), pal.sheet, { p: [fw / 2 - 0.002, -0.015, fl / 2] }),
        part(G.box(fw, 0.03, 0.004), pal.sheet, { p: [0, -0.015, fl - 0.002] }),
      ],
      { p: [(x0 + 0.03 + x1) / 2, y, zf + 0.004], r: [fa, 0, 0] },
    ),
  );
  left.push(part(G.cyl(0.011, 0.011, fw - 0.03, 12), pal.sheet, { p: [(x0 + 0.03 + x1) / 2, y - 0.004, zf], r: [0, 0, 90] }));
  // rear mudflap
  const rl = 0.18;
  left.push(
    group(
      [part(G.box(fw, t, rl), pal.sheet, { p: [0, -t / 2, -rl / 2] }), part(G.box(0.004, 0.03, rl), pal.sheet, { p: [fw / 2 - 0.002, -0.015, -rl / 2] })],
      { p: [(x0 + 0.03 + x1) / 2, y, zr - 0.004], r: [-30, 0, 0] },
    ),
  );
  // support gussets under the guard
  for (const z of [2.1, 1.0, 0.0, -1.0, -2.0]) left.push(part(G.plate([[0, 0], [0.085, 0], [0, -0.09]], 0.008, 'xy', 0.002), pal.sheet, { p: [x0, y - t, z] }));
  const rv: G.V3[] = [];
  for (let z = zr + 0.1; z < zf; z += 0.25) rv.push([x1 - 0.012, y, z]);
  left.push(part(scatterN(G.rivetHead(0.005), rv, [0, 1, 0]), pal.sheet));
  return mirrorX(group(left));
}

// ------------------------------------------------------------------ rear
function rearFittings(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const A = P.rearLowBottom, B: V2 = [P.rearUpBottom[0] + 0.02, H.fender];
  const zPlate = (y: number) => A[0] + ((y - A[1]) / (B[1] - A[1])) * (B[0] - A[0]);
  // transverse muffler on the lower rear plate
  const my = 0.8, mr = 0.13;
  const mz = zPlate(my) - mr - 0.04;
  const mx0 = -0.55, mx1 = 0.45, L = mx1 - mx0;
  out.push(part(latheX([[0.0, 0.0], [0.09, 0.0], [0.12, 0.012], [mr, 0.035], [mr, L - 0.035], [0.12, L - 0.012], [0.09, L], [0.0, L]], 36, 30), pal.exhaust, { p: [mx0, my, mz] }));
  for (const x of [mx0 + 0.035, mx1 - 0.035]) out.push(part(G.cyl(mr + 0.006, mr + 0.006, 0.014, 36), pal.exhaust, { p: [x, my, mz], r: [0, 0, 90] }));
  for (const x of [mx0 + 0.22, mx1 - 0.22]) {
    out.push(part(G.torus(mr + 0.006, 0.007, 6, 36), pal.gun, { p: [x, my, mz], r: [0, 90, 0] }));
    out.push(part(rb(0.04, 0.14, 0.07, 0.006), pal.paint, { p: [x, my, mz + mr + 0.025] }));
  }
  // inlet pipes from the hull and the tail pipe
  for (const x of [mx0 + 0.3, mx1 - 0.3])
    out.push(part(G.tube([[x, 1.0, zPlate(1.0) + 0.01], [x, 0.99, zPlate(1.0) - 0.08], [x, my + 0.1, mz + 0.02]], 0.04, 12, 16), pal.exhaust));
  out.push(part(G.tube([[mx1 - 0.08, my - 0.11, mz], [mx1 - 0.06, my - 0.19, mz - 0.03], [mx1 - 0.02, my - 0.22, mz - 0.1]], 0.032, 12, 12), pal.exhaust));
  out.push(part(G.cyl(0.026, 0.026, 0.01, 12), pal.dark, { p: [mx1 - 0.02, my - 0.222, mz - 0.13], r: [90, 0, 0] }));
  // inertia starter port cover
  out.push(part(G.cyl(0.065, 0.065, 0.02, 24), pal.paint, { p: [0.0, 0.62, zPlate(0.62) - 0.01], r: [90, 0, 0] }));
  // tow coupling
  const jz = zPlate(0.56) - 0.02;
  out.push(part(rb(0.24, 0.14, 0.04, 0.01), pal.paint, { p: [0, 0.58, jz] }));
  for (const s of [1, -1]) out.push(part(rb(0.03, 0.11, 0.14, 0.008), pal.paint, { p: [s * 0.05, 0.57, jz - 0.08] }));
  out.push(part(G.cyl(0.016, 0.016, 0.17, 12), pal.gun, { p: [0, 0.57, jz - 0.12], r: [0, 0, 90] }));
  out.push(part(G.cyl(0.02, 0.02, 0.02, 12), pal.gun, { p: [0, 0.64, jz - 0.12] }));
  // rear tow eyes: extensions of the lower hull sides
  for (const s of [1, -1]) {
    const eye = hullOutline([{ c: [0, 0], r: 0.07 }, { c: [0.14, 0.1], r: 0.065 }, { c: [0.16, -0.06], r: 0.05 }]);
    const g = G.extrude(G.shape(eye, 0, [circlePts(0.026, 14)]), 0.035, 0.006);
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    G.flipWinding(g);
    out.push(part(g, pal.paint, { p: [s * (W.lower - 0.05), 0.6, P.rearLowBottom[0] - 0.05], r: [0, 180, 0] }));
  }
  // track tensioner housings at the rear corners
  for (const s of [1, -1]) {
    out.push(part(G.cyl(0.05, 0.05, 0.12, 18), pal.cast, { p: [s * (W.lower - 0.08), 0.76, zPlate(0.76) - 0.05], r: [90, 0, 0] }));
    out.push(part(nut(0.05, 0.03), pal.gun, { p: [s * (W.lower - 0.08), 0.76, zPlate(0.76) - 0.11], r: [-90, 0, 0] }));
  }
  // bolts along the lower rear plate top edge
  const rb2: G.V3[] = [];
  for (let i = 0; i < 8; i++) rb2.push([-0.77 + i * 0.22, 1.0, zPlate(1.0) - 0.004]);
  out.push(part(G.scatter(nut(0.02, 0.008), rb2.map((p) => ({ p, n: [0, 0, -1] as G.V3 }))), pal.paint));
  // Notek convoy lamp and tail light on the left rear guard edge
  const lz = P.rearUpBottom[0] - 0.02;
  out.push(part(rb(0.1, 0.07, 0.05, 0.01), pal.black, { p: [0.95, H.fender + 0.1, lz] }));
  for (const dx of [-0.03, -0.012, 0.012, 0.03]) out.push(part(cbox(0.012, 0.018, 0.006, 0.001), pal.glass, { p: [0.95 + dx, H.fender + 0.094, lz - 0.026] }));
  out.push(part(cbox(0.05, 0.01, 0.006, 0.001), pal.glass, { p: [0.95, H.fender + 0.122, lz - 0.026] }));
  out.push(part(rb(0.02, 0.07, 0.02, 0.004), pal.black, { p: [0.95, H.fender + 0.035, lz + 0.005] }));
  return group(out);
}

// ------------------------------------------------------------------ belly
function belly(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const y = H.belly;
  for (const [z, w, l] of [[1.5, 0.62, 0.42], [-1.4, 0.7, 0.55]] as G.V3[]) {
    out.push(part(rb(w, 0.014, l, 0.004), pal.paint, { p: [0, y - 0.006, z] }));
    const bolts: G.V3[] = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4 - 0.5;
      bolts.push([t * (w - 0.06), y - 0.013, z + l / 2 - 0.03], [t * (w - 0.06), y - 0.013, z - l / 2 + 0.03]);
    }
    out.push(part(scatterN(nut(0.022, 0.008), bolts, [0, -1, 0]), pal.paint));
  }
  // torsion bar end caps along the belly edges
  const caps: G.V3[] = [];
  for (const z of [1.73, 1.158, 0.586, 0.014, -0.558, -1.13]) caps.push([0.8, y - 0.004, z], [-0.8, y - 0.004, z - 0.06]);
  out.push(part(scatterN(G.cyl(0.05, 0.05, 0.012, 18), caps, [0, -1, 0]), pal.paint));
  return group(out);
}
