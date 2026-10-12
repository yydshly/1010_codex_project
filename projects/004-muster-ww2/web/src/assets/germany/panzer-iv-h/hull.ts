/**
 * Hull of the Pz.Kpfw. IV Ausf. H: welded lower hull and superstructure from plates with real
 * thickness, 80 mm nose and driver's front plates, glacis with brake access hatches, driver's
 * visor and bow MG ball mount, roof hatches, engine deck hatches, side cooling louvres,
 * fenders, rear plate with muffler, auxiliary exhaust, starter port and tow fittings.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import type { Palette } from './materials';
import { H, W, P } from './dims';
import { cbox, rb, nut, latheX, hullOutline, scatterN, merge, circlePts, type V2 } from './util';

/** Cross-section quad of a plate whose outer face runs A->B, thickness t along the unit normal n. */
function sect(A: V2, B: V2, t: number, n: V2): V2[] {
  return [A, B, [B[0] + n[0] * t, B[1] + n[1] * t], [A[0] + n[0] * t, A[1] + n[1] * t]];
}
/** Unit normal of segment A->B pointing to the side of point `towards`. */
function nrm(A: V2, B: V2, towards: V2): V2 {
  const dz = B[0] - A[0], dy = B[1] - A[1];
  const l = Math.hypot(dz, dy);
  let n: V2 = [-dy / l, dz / l];
  const mz = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  if ((towards[0] - mz) * n[0] + (towards[1] - my) * n[1] < 0) n = [-n[0], -n[1]];
  return n;
}
const lerp2 = (A: V2, B: V2, t: number): V2 => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
/** Prism with a (z, y) cross-section spanning x0..x1. */
function prism(outline: V2[], x0: number, x1: number, mat: THREE.Material, bevel = 0.004): THREE.Mesh {
  return part(G.plate(outline, x1 - x0, 'zy', bevel), mat, { p: [(x0 + x1) / 2, 0, 0] });
}
/** Weld bead along a polyline, light (5-sided). */
function bead(pts: G.V3[], r = 0.0065): THREE.BufferGeometry {
  const P3 = pts.map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(P3, false, 'centripetal');
  const len = curve.getLength();
  const segs = Math.max(6, Math.round(len / 0.014));
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

export interface HullOut {
  object: THREE.Group;
}

export function hull(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const paint = pal.paint;
  const inner = [0, 0.9] as V2; // a point inside the hull cross-section

  const xl = W.lower, xu = W.upper;
  const tS = 0.03; // side plates
  // ------------------------------------------------------------------ lower hull
  const noseN = nrm(P.noseBottom, P.noseTop, inner);
  const glacisN = nrm(P.noseTop, P.glacisTop, inner);
  // point where the glacis drops below the fender line
  const tG = (H.fender - 0.006 - P.noseTop[1]) / (P.glacisTop[1] - P.noseTop[1]);
  const gF = lerp2(P.noseTop, P.glacisTop, tG);
  const driverBottom: V2 = [P.glacisTop[0] + ((P.glacisTop[1] - H.fender) / (P.driverTop[1] - P.glacisTop[1])) * (P.glacisTop[0] - P.driverTop[0]), H.fender];
  const drvN = nrm(driverBottom, P.driverTop, [0, 1.4]);
  // lower hull side plates (outer face at x = +/-W.lower); they rise along the glacis to close it
  const sideOutline: V2[] = [
    P.bellyFront,
    P.noseBottom,
    P.noseTop,
    P.glacisTop,
    [P.glacisTop[0], H.fender - 0.006],
    [P.rearLowTop[0], H.fender - 0.006],
    P.rearLowBottom,
    P.bellyRear,
  ];
  out.push(mirrorX(prism(sideOutline, xl - tS, xl, paint)));
  void gF;
  // floor: flat belly plus the sloped front and rear bottom plates
  out.push(prism(sect(P.bellyRear, P.bellyFront, 0.02, [0, 1]), -xl, xl, paint));
  out.push(prism(sect(P.bellyFront, P.noseBottom, 0.02, nrm(P.bellyFront, P.noseBottom, inner)), -xl, xl, paint));
  out.push(prism(sect(P.rearLowBottom, P.bellyRear, 0.02, nrm(P.rearLowBottom, P.bellyRear, inner)), -xl, xl, paint));
  // 80 mm nose plate between the side plates
  out.push(prism(sect(P.noseBottom, P.noseTop, 0.08, noseN), -(xl - tS), xl - tS, paint, 0.006));
  // glacis
  out.push(prism(sect(P.noseTop, P.glacisTop, 0.025, glacisN), -(xl - tS), xl - tS, paint, 0.004));
  // lower rear plate between the side plates
  const rearN = nrm(P.rearLowBottom, [P.rearLowTop[0], H.fender], inner);
  out.push(prism(sect(P.rearLowBottom, [P.rearLowTop[0], H.fender - 0.006], 0.02, rearN), -(xl - tS), xl - tS, paint));

  // ------------------------------------------------------------------ superstructure
  const tF = 0.08;
  const drvBack: V2[] = [
    [driverBottom[0] + drvN[0] * tF, driverBottom[1] + drvN[1] * tF],
    [P.driverTop[0] + drvN[0] * tF, P.driverTop[1] + drvN[1] * tF],
  ];
  // driver's front plate across the full superstructure width
  out.push(prism(sect(driverBottom, P.driverTop, tF, drvN), -xu, xu, paint, 0.006));
  // upper rear plate
  const rearUpBottom: V2 = [P.rearLowTop[0], H.fender];
  const rearUpN = nrm(rearUpBottom, P.rearUpTop, [0, 1.4]);
  out.push(prism(sect(rearUpBottom, P.rearUpTop, 0.02, rearUpN), -xu, xu, paint));
  const rearUpIn: V2[] = [
    [rearUpBottom[0] + rearUpN[0] * 0.02, rearUpBottom[1]],
    [P.rearUpTop[0] + rearUpN[0] * 0.02, P.rearUpTop[1]],
  ];
  // superstructure side plates
  const roofT = 0.016;
  const supSide: V2[] = [
    [rearUpIn[0][0], H.fender],
    [drvBack[0][0], H.fender],
    [drvBack[1][0], H.roof - roofT],
    [rearUpIn[1][0], H.roof - roofT],
  ];
  out.push(mirrorX(prism(supSide, xu - tS, xu, paint)));
  // roof: front section, fighting compartment, engine deck (separate plates, visible seams)
  const roofZ0 = P.driverTop[0] + drvN[0] * tF + 0.002, roofZ3 = P.rearUpTop[0] + rearUpN[0] * 0.02 - 0.002;
  const roofPlate = (z0: number, z1: number) =>
    part(rb(2 * xu, roofT, z0 - z1 - 0.004, 0.003), paint, { p: [0, H.roof - roofT / 2, (z0 + z1) / 2] });
  out.push(roofPlate(roofZ0, 1.06), roofPlate(1.06, -0.66), roofPlate(-0.66, roofZ3));
  // pannier floor = fender inner part is added with the fenders

  // ------------------------------------------------------------------ welds (visible seams)
  const beads: THREE.BufferGeometry[] = [];
  const along = (A: V2, B: V2, x: number, n: V2, off = 0.004, trim = 0.01): G.V3[] => {
    const dz = B[0] - A[0], dy = B[1] - A[1];
    const l = Math.hypot(dz, dy);
    const t0 = trim / l;
    const a2 = lerp2(A, B, t0), b2 = lerp2(A, B, 1 - t0);
    return [
      [x, a2[1] - n[1] * off, a2[0] - n[0] * off],
      [x, b2[1] - n[1] * off, b2[0] - n[0] * off],
    ];
  };
  for (const s of [1, -1]) {
    const xi = s * (xl - tS - 0.002);
    beads.push(bead(along(P.noseBottom, P.noseTop, xi, noseN)));
    beads.push(bead(along(P.noseTop, P.glacisTop, xi, glacisN)));
    // superstructure side to front plate (outer corner)
    beads.push(bead([[s * (xu + 0.002), H.fender + 0.012, drvBack[0][0] - 0.004], [s * (xu + 0.002), H.roof - 0.024, drvBack[1][0] - 0.004]]));
    // superstructure side to roof
    beads.push(bead([[s * (xu - 0.001), H.roof - roofT - 0.003, roofZ0 - 0.02], [s * (xu - 0.001), H.roof - roofT - 0.003, roofZ3 + 0.02]], 0.005));
    // superstructure side to fender / pannier floor
    beads.push(bead([[s * (xu + 0.004), H.fender + 0.004, drvBack[0][0] - 0.02], [s * (xu + 0.004), H.fender + 0.004, rearUpIn[0][0] + 0.02]], 0.005));
    // lower hull side to nose and glacis front edges
    beads.push(bead(along(P.bellyFront, P.noseBottom, s * (xl - 0.004), nrm(P.bellyFront, P.noseBottom, inner), 0.004, 0.03)));
  }
  // nose to glacis, glacis to driver's plate (across)
  const ng = lerp2(P.noseTop, P.noseTop, 0);
  beads.push(bead([[-(xl - tS), ng[1] + 0.008, ng[0] + 0.004], [xl - tS, ng[1] + 0.008, ng[0] + 0.004]]));
  beads.push(bead([[-(xl - tS), P.glacisTop[1] + 0.006, P.glacisTop[0] + 0.01], [xl - tS, P.glacisTop[1] + 0.006, P.glacisTop[0] + 0.01]]));
  out.push(part(merge(beads), paint));

  out.push(frontFittings(pal, { glacisN, drvN, driverBottom }));
  out.push(roofFittings(pal));
  out.push(fenders(pal));
  out.push(rearFittings(pal, rearN));
  return group(out);
}

// ------------------------------------------------------------------ front
function frontFittings(pal: Palette, f: { glacisN: V2; drvN: V2; driverBottom: V2 }): THREE.Group {
  const out: THREE.Object3D[] = [];
  const { glacisN, drvN, driverBottom } = f;
  // --- two brake access hatches on the glacis, hinged at their front edge
  const gDir: V2 = [P.glacisTop[0] - P.noseTop[0], P.glacisTop[1] - P.noseTop[1]];
  const gLen = Math.hypot(gDir[0], gDir[1]);
  const gAng = Math.atan2(gDir[1], -gDir[0]); // slope angle (rises towards -Z)
  const onGlacis = (u: number, x: number, h: number): THREE.Vector3 => {
    const pz = P.noseTop[0] + (gDir[0] * u) / gLen - glacisN[0] * h;
    const py = P.noseTop[1] + (gDir[1] * u) / gLen - glacisN[1] * h;
    return new THREE.Vector3(x, py, pz);
  };
  const tilt: G.V3 = [(gAng * 180) / Math.PI, 0, 0];
  for (const s of [1, -1]) {
    const x = s * 0.4;
    const c = onGlacis(0.3, x, 0.011);
    const hatch = group(
      [
        part(rb(0.56, 0.022, 0.36, 0.01), pal.paint),
        // raised stiffening lip around the hatch edge
        part(rb(0.5, 0.008, 0.3, 0.004), pal.paint, { p: [0, 0.014, 0] }),
        part(rb(0.14, 0.012, 0.03, 0.004), pal.paint, { p: [0, 0.02, -0.08] }),
        part(scatterN(nut(0.022, 0.008), [[-0.25, 0.011, -0.15], [0.25, 0.011, -0.15], [-0.25, 0.011, 0.15], [0.25, 0.011, 0.15]], [0, 1, 0]), pal.paint),
      ],
      { p: c, r: tilt },
    );
    out.push(hatch);
    // hinge knuckles at the nose side of the hatch
    const hc = onGlacis(0.08, x, 0.018);
    for (const dx of [-0.18, 0.18]) out.push(part(G.cyl(0.016, 0.016, 0.1, 14), pal.paint, { p: [x + dx, hc.y, hc.z], r: [0, 0, 90] }));
    // brake cooling air cowl
    const cc = onGlacis(0.42, x - s * 0.13, 0.03);
    out.push(part(rb(0.16, 0.04, 0.12, 0.012), pal.paint, { p: cc, r: tilt }));
    out.push(part(cbox(0.13, 0.012, 0.02, 0.002), pal.dark, { p: onGlacis(0.345, x - s * 0.13, 0.03), r: tilt }));
  }

  // --- driver's visor (Fahrersehklappe 80) on the left, ball mount on the right
  const drvDir: V2 = [P.driverTop[0] - driverBottom[0], P.driverTop[1] - driverBottom[1]];
  const dL = Math.hypot(drvDir[0], drvDir[1]);
  const lean = (Math.atan2(-drvDir[0], drvDir[1]) * 180) / Math.PI; // plate leans back
  const onFront = (y: number, x: number, h: number): THREE.Vector3 => {
    const u = (y - driverBottom[1]) / (drvDir[1] / dL);
    return new THREE.Vector3(x, driverBottom[1] + (drvDir[1] * u) / dL - drvN[1] * h, driverBottom[0] + (drvDir[0] * u) / dL - drvN[0] * h);
  };
  const vx = 0.44;
  const visor = group(
    [
      part(rb(0.3, 0.13, 0.05, 0.012), pal.cast, { p: [0, 0, 0.025] }),
      part(rb(0.24, 0.07, 0.03, 0.01), pal.cast, { p: [0, -0.005, 0.06] }),
      part(cbox(0.18, 0.012, 0.012, 0.001), pal.dark, { p: [0, 0.012, 0.072] }),
      part(G.cyl(0.018, 0.018, 0.34, 14), pal.cast, { p: [0, 0.06, 0.03], r: [0, 0, 90] }),
      // rain guard above the visor
      part(rb(0.36, 0.012, 0.06, 0.004), pal.paint, { p: [0, 0.1, 0.03], r: [-12, 0, 0] }),
      part(scatterN(nut(0.018, 0.008), [[-0.12, -0.04, 0.05], [0.12, -0.04, 0.05]], [0, 0, 1]), pal.cast),
    ],
    { p: onFront(1.47, vx, 0), r: [-lean, 0, 0] },
  );
  out.push(visor);
  // Kugelblende 50 with MG 34
  const bm = onFront(1.44, -0.44, 0);
  const ball = group(
    [
      part(latheX([[0.155, 0.0], [0.155, 0.03], [0.145, 0.05], [0.115, 0.06], [0.11, 0.075]], 36, 40), pal.cast, { r: [0, -90, 0] }),
      part(new THREE.SphereGeometry(0.105, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), pal.cast, { p: [0, 0, 0.04], r: [90, 0, 0] }),
      part(G.cyl(0.03, 0.034, 0.05, 18), pal.cast, { p: [0, 0, 0.16], r: [90, 0, 0] }),
      // perforated MG 34 barrel jacket
      part(G.cyl(0.019, 0.019, 0.2, 14), pal.gun, { p: [0, 0, 0.27], r: [90, 0, 0] }),
      part(G.scatter(G.cyl(0.0048, 0.0048, 0.004, 6), [0.2, 0.24, 0.28, 0.32].flatMap((z) => [
        { p: [0.0175, 0, z] as G.V3, n: [1, 0, 0] as G.V3 },
        { p: [-0.0175, 0, z] as G.V3, n: [-1, 0, 0] as G.V3 },
        { p: [0, 0.0175, z] as G.V3, n: [0, 1, 0] as G.V3 },
      ])), pal.dark),
      part(G.cyl(0.009, 0.012, 0.04, 12), pal.gun, { p: [0, 0, 0.385], r: [90, 0, 0] }),
      part(G.cyl(0.005, 0.005, 0.005, 8), pal.dark, { p: [0, 0, 0.404], r: [90, 0, 0] }),
    ],
    { p: bm, r: [-lean, 0, 0] },
  );
  out.push(ball);
  // bolts along the top edge of the driver's plate (roof attachment)
  const topBolts: G.V3[] = [];
  for (let i = 0; i < 9; i++) topBolts.push([-0.92 + i * 0.23, H.roof + 0.0, P.driverTop[0] - 0.04]);
  out.push(part(scatterN(nut(0.02, 0.008), topBolts, [0, 1, 0]), pal.paint));

  // --- front tow brackets with shackles
  for (const s of [1, -1]) {
    const x = s * (W.lower - 0.1);
    const br = hullOutline([
      { c: [0, 0], r: 0.075 },
      { c: [-0.22, 0.05], r: 0.08 },
      { c: [-0.2, -0.04], r: 0.06 },
    ]);
    const hole = G.shape(br, 0, [circlePts(0.028, 14)]);
    const g = G.extrude(hole, 0.04, 0.006);
    const m = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1);
    g.applyMatrix4(m);
    G.flipWinding(g);
    out.push(part(g, pal.paint, { p: [x, 0.6, P.noseBottom[0] + 0.1] }));
    // shackle (clevis) through the eye
    const clev = G.torus(0.045, 0.013, 8, 20, Math.PI);
    out.push(part(clev, pal.gun, { p: [x, 0.56, P.noseBottom[0] + 0.12], r: [0, 90, 180] }));
    out.push(part(G.cyl(0.013, 0.013, 0.08, 10), pal.gun, { p: [x, 0.6, P.noseBottom[0] + 0.12], r: [0, 0, 90] }));
  }
  // lifting eyes on the nose plate top edge
  for (const s of [1, -1]) {
    const e = G.torus(0.035, 0.011, 8, 16, Math.PI);
    out.push(part(e, pal.paint, { p: [s * 0.62, P.noseTop[1] + 0.005, P.noseTop[0] - 0.05], r: [0, 90, 0] }));
  }
  return group(out);
}

// ------------------------------------------------------------------ roof and engine deck
function hatchLid(pal: Palette, w: number, l: number, hingeSide: 1 | -1, handle = true): THREE.Group {
  const parts: THREE.Object3D[] = [];
  parts.push(part(rb(w, 0.018, l, 0.008), pal.paint, { p: [0, 0.009, 0] }));
  parts.push(part(rb(w - 0.06, 0.006, l - 0.06, 0.003), pal.paint, { p: [0, 0.02, 0] }));
  // hinges on one long side
  for (const dz of [-l * 0.3, l * 0.3]) {
    parts.push(part(G.cyl(0.017, 0.017, 0.09, 14), pal.paint, { p: [hingeSide * (w / 2 + 0.012), 0.017, dz], r: [90, 0, 0] }));
    parts.push(part(cbox(0.07, 0.012, 0.06, 0.002), pal.paint, { p: [hingeSide * (w / 2 - 0.02), 0.022, dz] }));
  }
  if (handle) {
    parts.push(part(G.tube([[-hingeSide * (w / 2 - 0.06), 0.02, -0.07], [-hingeSide * (w / 2 - 0.035), 0.055, -0.04], [-hingeSide * (w / 2 - 0.035), 0.055, 0.04], [-hingeSide * (w / 2 - 0.06), 0.02, 0.07]], 0.008, 8, 20), pal.paint));
  }
  return group(parts);
}

function roofFittings(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const y = H.roof;
  // driver's and radio operator's hatches (hinged at their outer edge)
  out.push(group([hatchLid(pal, 0.5, 0.44, 1)], { p: [0.47, y, 1.5] }));
  out.push(group([hatchLid(pal, 0.5, 0.44, -1)], { p: [-0.47, y, 1.5] }));
  // hatch frames welded into the roof
  for (const s of [1, -1]) out.push(part(rb(0.55, 0.008, 0.49, 0.004), pal.paint, { p: [s * 0.47, y + 0.002, 1.5] }));
  // turret race ring (between hull roof and turret base)
  out.push(part(G.cyl(0.87, 0.87, 0.02, 64, true), pal.dark, { p: [0.0665, y + 0.008, 0.25] }));
  // engine deck: two large engine hatches
  for (const s of [1, -1]) {
    out.push(group([hatchLid(pal, 0.56, 0.9, s as 1 | -1)], { p: [s * 0.3, y, -1.55] }));
    // round ventilator cover on each hatch
    out.push(part(G.cyl(0.075, 0.085, 0.035, 24), pal.paint, { p: [s * 0.3, y + 0.04, -1.8] }));
    out.push(part(G.cyl(0.05, 0.05, 0.012, 20), pal.paint, { p: [s * 0.3, y + 0.062, -1.8] }));
  }
  // radiator filler hatches along the deck sides
  for (const s of [1, -1]) {
    out.push(group([hatchLid(pal, 0.26, 0.5, s as 1 | -1, false)], { p: [s * 0.82, y, -1.1] }));
    out.push(part(G.cyl(0.045, 0.045, 0.03, 18), pal.paint, { p: [s * 0.82, y + 0.035, -2.1] }));
    out.push(part(G.cyl(0.03, 0.03, 0.012, 14), pal.paint, { p: [s * 0.82, y + 0.056, -2.1] }));
  }
  // grilled air intakes at the rear of the engine deck (armoured louvre boxes)
  for (const s of [1, -1]) {
    const cx = s * 0.52, cz = -2.33;
    out.push(part(rb(0.62, 0.03, 0.3, 0.008), pal.paint, { p: [cx, y + 0.015, cz] }));
    out.push(part(cbox(0.56, 0.02, 0.24, 0.001), pal.dark, { p: [cx, y + 0.025, cz] }));
    for (let i = 0; i < 9; i++) {
      out.push(part(cbox(0.012, 0.03, 0.26, 0.002), pal.paint, { p: [cx - 0.26 + i * 0.065, y + 0.036, cz], r: [0, 0, 25] }));
    }
  }
  // engine compartment side louvres on the superstructure (air intake left, outlet right)
  for (const s of [1, -1]) {
    const x = s * (W.upper + 0.004);
    out.push(part(rb(0.02, 0.3, 0.8, 0.006), pal.paint, { p: [x, 1.42, -1.75] }));
    out.push(part(cbox(0.008, 0.24, 0.72, 0.001), pal.dark, { p: [x + s * 0.008, 1.42, -1.75] }));
    for (let i = 0; i < 11; i++) {
      out.push(part(cbox(0.03, 0.012, 0.74, 0.002), pal.paint, { p: [x + s * 0.016, 1.315 + i * 0.021, -1.75], r: [-s * 0, 0, s * 35] }));
    }
  }
  // lifting eyes on the roof corners
  for (const [lx, lz] of [[0.9, 1.75], [-0.9, 1.75], [0.9, -2.45], [-0.9, -2.45]] as V2[]) {
    const e = G.torus(0.035, 0.01, 8, 16, Math.PI);
    out.push(part(e, pal.paint, { p: [lx, y, lz], r: [0, 90, 0] }));
  }
  return group(out);
}

// ------------------------------------------------------------------ fenders
function fenders(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  const t = 0.005, y = H.fender;
  const x0 = W.lower, x1 = W.fender;
  const zf = 2.6, zr = -2.7;
  const left: THREE.Object3D[] = [];
  // main fender / pannier floor
  left.push(part(G.box(x1 - x0, t, zf - zr), pal.sheet, { p: [(x0 + x1) / 2, y - t / 2, (zf + zr) / 2] }));
  // outer edge lip (bent down)
  left.push(part(G.box(0.004, 0.03, zf - zr), pal.sheet, { p: [x1 - 0.002, y - 0.015, (zf + zr) / 2] }));
  // hinged front section angled down over the sprocket
  const fl = 0.27, fa = 22;
  left.push(
    group(
      [
        part(G.box(x1 - x0 - 0.04, t, fl), pal.sheet, { p: [0, -t / 2, fl / 2] }),
        part(G.box(0.004, 0.03, fl), pal.sheet, { p: [(x1 - x0 - 0.04) / 2 - 0.002, -0.015, fl / 2] }),
        part(G.box(x1 - x0 - 0.04, 0.03, 0.004), pal.sheet, { p: [0, -0.015, fl - 0.002] }),
      ],
      { p: [(x0 + 0.04 + x1) / 2, y, zf + 0.004], r: [fa, 0, 0] },
    ),
  );
  left.push(part(G.cyl(0.011, 0.011, x1 - x0 - 0.06, 12), pal.sheet, { p: [(x0 + x1) / 2 + 0.02, y - 0.004, zf], r: [0, 0, 90] }));
  // rear mudflap
  const rl = 0.2;
  left.push(
    group(
      [
        part(G.box(x1 - x0 - 0.04, t, rl), pal.sheet, { p: [0, -t / 2, -rl / 2] }),
        part(G.box(0.004, 0.03, rl), pal.sheet, { p: [(x1 - x0 - 0.04) / 2 - 0.002, -0.015, -rl / 2] }),
      ],
      { p: [(x0 + 0.04 + x1) / 2, y, zr - 0.004], r: [-30, 0, 0] },
    ),
  );
  // support gussets under the fender (from lower hull side)
  for (const z of [2.15, 1.05, 0.05, -1.0, -2.05]) {
    const gus = G.plate([[0, 0], [0.085, 0], [0, -0.09]], 0.008, 'xy', 0.002);
    left.push(part(gus, pal.sheet, { p: [x0, y - t, z] }));
  }
  // fender edge rivets
  const rv: G.V3[] = [];
  for (let z = zr + 0.1; z < zf; z += 0.25) rv.push([x1 - 0.012, y, z]);
  left.push(part(scatterN(G.rivetHead(0.005), rv, [0, 1, 0]), pal.sheet));
  out.push(mirrorX(group(left)));
  return group(out);
}

// ------------------------------------------------------------------ rear
function rearFittings(pal: Palette, rearN: V2): THREE.Group {
  const out: THREE.Object3D[] = [];
  const zPlate = (y: number) => P.rearLowBottom[0] + ((y - P.rearLowBottom[1]) / (P.rearLowTop[1] - P.rearLowBottom[1])) * (P.rearLowTop[0] - P.rearLowBottom[0]);
  // --- main muffler, horizontal on the lower rear plate
  const my = 0.83, mr = 0.14;
  const mz = zPlate(my) - mr - 0.035;
  const mx0 = -0.5, mx1 = 0.42;
  const muffler = latheX(
    [
      [0.0, 0.0],
      [0.1, 0.0],
      [0.13, 0.012],
      [mr, 0.035],
      [mr, mx1 - mx0 - 0.035],
      [0.13, mx1 - mx0 - 0.012],
      [0.1, mx1 - mx0],
      [0.0, mx1 - mx0],
    ],
    36,
    30,
  );
  out.push(part(muffler, pal.exhaust, { p: [mx0, my, mz] }));
  // seam rings and mounting straps
  for (const x of [mx0 + 0.035, mx1 - 0.035]) out.push(part(G.cyl(mr + 0.006, mr + 0.006, 0.014, 36), pal.exhaust, { p: [x, my, mz], r: [0, 0, 90] }));
  for (const x of [mx0 + 0.2, mx1 - 0.2]) {
    out.push(part(G.torus(mr + 0.006, 0.007, 6, 36), pal.gun, { p: [x, my, mz], r: [0, 90, 0] }));
    out.push(part(rb(0.04, 0.16, 0.06, 0.006), pal.paint, { p: [x, my, mz + mr + 0.02] }));
  }
  // inlet pipes from the hull and the tail pipe
  out.push(part(G.tube([[mx0 + 0.25, 1.0, zPlate(1.0) + 0.01], [mx0 + 0.25, 0.99, zPlate(1.0) - 0.08], [mx0 + 0.25, my + 0.1, mz + 0.02]], 0.04, 12, 16), pal.exhaust));
  out.push(part(G.tube([[mx1 - 0.25, 1.0, zPlate(1.0) + 0.01], [mx1 - 0.25, 0.99, zPlate(1.0) - 0.08], [mx1 - 0.25, my + 0.1, mz + 0.02]], 0.04, 12, 16), pal.exhaust));
  out.push(part(G.tube([[mx1 - 0.08, my - 0.12, mz], [mx1 - 0.06, my - 0.2, mz - 0.03], [mx1 - 0.02, my - 0.23, mz - 0.1]], 0.032, 12, 12), pal.exhaust));
  out.push(part(G.cyl(0.026, 0.026, 0.01, 12), pal.dark, { p: [mx1 - 0.02, my - 0.232, mz - 0.13], r: [90, 0, 0] }));
  // --- auxiliary generator muffler (small, left)
  const ax = 0.66, ay = 0.8, az = zPlate(0.8) - 0.07;
  out.push(part(latheX([[0, 0], [0.045, 0], [0.055, 0.02], [0.055, 0.26], [0.045, 0.28], [0, 0.28]], 24, 30), pal.exhaust, { p: [ax - 0.14, ay, az] }));
  out.push(part(G.tube([[ax, 0.98, zPlate(0.98) + 0.01], [ax, 0.95, az], [ax, ay + 0.05, az]], 0.018, 10, 10), pal.exhaust));
  for (const x of [ax - 0.08, ax + 0.08]) out.push(part(rb(0.025, 0.1, 0.07, 0.004), pal.paint, { p: [x, ay, az + 0.04] }));
  // --- inertia starter port with hinged cover
  out.push(part(G.cyl(0.07, 0.07, 0.02, 24), pal.paint, { p: [0.0, 0.66, zPlate(0.66) - 0.01], r: [90 - 6, 0, 0] }));
  out.push(part(G.cyl(0.02, 0.02, 0.03, 12), pal.paint, { p: [0.0, 0.66, zPlate(0.66) - 0.025], r: [90, 0, 0] }));
  // --- tow coupling (jaw) at the bottom centre
  const jz = zPlate(0.6) - 0.02;
  out.push(part(rb(0.26, 0.16, 0.04, 0.01), pal.paint, { p: [0, 0.62, jz] }));
  for (const s of [1, -1]) out.push(part(rb(0.03, 0.12, 0.14, 0.008), pal.paint, { p: [s * 0.05, 0.6, jz - 0.08] }));
  out.push(part(G.cyl(0.016, 0.016, 0.18, 12), pal.gun, { p: [0, 0.6, jz - 0.12], r: [0, 0, 90] }));
  out.push(part(G.cyl(0.02, 0.02, 0.02, 12), pal.gun, { p: [0, 0.68, jz - 0.12] }));
  // --- rear tow eyes: extensions of the lower hull sides
  for (const s of [1, -1]) {
    const eye = hullOutline([{ c: [0, 0], r: 0.075 }, { c: [0.14, 0.1], r: 0.07 }, { c: [0.16, -0.06], r: 0.05 }]);
    const sh = G.shape(eye, 0, [circlePts(0.028, 14)]);
    const g = G.extrude(sh, 0.035, 0.006);
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    G.flipWinding(g);
    out.push(part(g, pal.paint, { p: [s * (W.lower - 0.05), 0.62, P.rearLowBottom[0] - 0.06], r: [0, 180, 0] }));
  }
  // --- track tensioner housings at the rear corners
  for (const s of [1, -1]) {
    out.push(part(G.cyl(0.05, 0.05, 0.12, 18), pal.cast, { p: [s * (W.lower - 0.08), 0.78, zPlate(0.78) - 0.05], r: [90, 0, 0] }));
    out.push(part(nut(0.05, 0.03), pal.gun, { p: [s * (W.lower - 0.08), 0.78, zPlate(0.78) - 0.11], r: [-90, 0, 0] }));
  }
  // bolts along the rear plate top edge
  const rb2: G.V3[] = [];
  for (let i = 0; i < 8; i++) rb2.push([-0.77 + i * 0.22, 1.02, zPlate(1.02) - 0.004]);
  out.push(part(G.scatter(nut(0.02, 0.008), rb2.map((p) => ({ p, n: [rearN[0] * 0, 0, -1] as G.V3 }))), pal.paint));
  // tail / convoy light on the left rear
  const zUp = P.rearLowTop[0] + ((1.2 - H.fender) / (P.rearUpTop[1] - H.fender)) * (P.rearUpTop[0] - P.rearLowTop[0]);
  out.push(part(rb(0.1, 0.07, 0.05, 0.01), pal.black, { p: [0.72, 1.2, zUp - 0.024] }));
  // Notek convoy lamp: four small windows in a row and the stop light above
  for (const dx of [-0.03, -0.012, 0.012, 0.03]) out.push(part(cbox(0.012, 0.018, 0.006, 0.001), pal.glass, { p: [0.72 + dx, 1.194, zUp - 0.05] }));
  out.push(part(cbox(0.05, 0.01, 0.006, 0.001), pal.glass, { p: [0.72, 1.222, zUp - 0.05] }));
  out.push(part(rb(0.012, 0.09, 0.03, 0.003), pal.paint, { p: [0.66, 1.2, zUp - 0.015] }));
  return group(out);
}
