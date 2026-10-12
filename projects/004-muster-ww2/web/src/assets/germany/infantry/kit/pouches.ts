/**
 * Belt pouches, authored FLAT in a belt-local frame and wrapped around the waist by
 * fit.wrapOnBody():
 *   x along the belt (+x towards +arc), y up (y = 0 on the belt centre line, belt 5 cm wide),
 *   z out of the body (z = 0 on the belt's outer face; belt loops pass behind it, z < 0).
 *
 *  - k98Pouch():   Patronentasche 1911 pattern, three leather cells (2 x 5-round clips each),
 *                  each with its own flap and a closing tongue over a stud, D-ring at the top
 *                  back for the Y-strap hook, two belt loops.
 *  - mp40Pouch():  canvas pouch with three magazine cells (one 32-round magazine each), canvas
 *                  flaps closed by leather tabs over studs, leather belt loops, D-ring.
 *  - p38Holster(): black leather hard-shell pistol holster, worn at the left front.
 *  - toolPouch():  small black leather MG tool pouch with flap and strap.
 * Dimensions are estimated from surviving examples in reference photos; see the asset notes.
 */
import { THREE, group, part } from '../../../../core/kit';
import { roundEnds, pointedEnd, dRing, frameBuckle } from '../../gear/util';
import { F, pillow, dome, placeY, merge, roundRect } from '../geo';
import { U } from '../palette';

type V3 = [number, number, number];
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Belt loop (leather/canvas) wrapping the belt: from the item back at the top, behind the belt, back at the bottom. */
export function beltLoop(x: number, w: number, t: number, yTop = 0.03, yBot = -0.03): THREE.BufferGeometry {
  const pts: V3[] = [
    [x, yTop, 0.0006],
    [x, 0.0272, -0.0008],
    [x, 0.0262, -0.0045],
    [x, 0.012, -0.0058],
    [x, -0.012, -0.0058],
    [x, -0.0262, -0.0045],
    [x, -0.0272, -0.0008],
    [x, yBot, 0.0006],
  ];
  const nrm: V3[] = [[0, 0, 1], [0, 1, 0.3], [0, 1, 0], [0, 0, -1], [0, 0, -1], [0, -1, 0], [0, -1, 0.3], [0, 0, 1]];
  return F.sheet(pts, nrm, w / 2, t, { across: 2, samples: 22 });
}

// ------------------------------------------------------------------ K98 cartridge pouch

export function k98Pouch(): THREE.Group {
  const lea = U.belt();
  const hw = U.hardware();
  const parts: THREE.Object3D[] = [];
  const cw = 0.061, gap = 0.0035, n = 3;
  const total = n * cw + (n - 1) * gap;
  const yTop = 0.031, yBot = -0.057, h = yTop - yBot, yc = (yTop + yBot) / 2;
  const back = 0.0032, depth = 0.034;
  // backing panel
  parts.push(part(F.extrude(roundRect(total + 0.004, h + 0.004, 0.006), back, 0.0009), lea, { p: [0, yc, back / 2] }));
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (cw + gap);
    // cell body (leather box, slightly filled)
    parts.push(part(pillow(cw, h - 0.004, depth, 0.0075, 0.0026, 3), lea, { p: [x, yc - 0.002, back + depth / 2] }));
    const zf = back + depth + 0.0022; // front surface at the bulge
    // flap over the top and down the front
    const fp: V3[] = [
      [x, yTop - 0.004, back + 0.004],
      [x, yTop + 0.0045, back + 0.01],
      [x, yTop + 0.0055, back + depth * 0.55],
      [x, yTop + 0.001, zf - 0.0005],
      [x, yTop - 0.012, zf + 0.0009],
      [x, yTop - 0.03, zf + 0.001],
    ];
    const fn: V3[] = [[0, 1, -0.2], [0, 1, 0], [0, 1, 0.2], [0, 0.5, 1], [0, 0, 1], [0, 0, 1]];
    parts.push(part(F.sheet(fp, fn, roundEnds(cw / 2 + 0.0012, 0, 0.011), 0.0024, { across: 4, samples: 18, bulge: 0.0008 }), lea));
    // closing tongue down to the stud
    const tp: V3[] = [[x, yTop - 0.026, zf + 0.0018], [x, yTop - 0.045, zf + 0.0012], [x, yBot + 0.026, zf + 0.0005]];
    parts.push(part(F.sheet(tp, [0, 0, 1], pointedEnd(0.0068, 0.012), 0.0021, { across: 2, samples: 10 }), lea));
    parts.push(part(placeY(dome(0.0036, 0.0024, 12), [x, yBot + 0.031, zf + 0.0019], [0, 0, 1]), hw));
    // side seam welts
    for (const sx of [-1, 1]) parts.push(part(F.tube([[x + sx * (cw / 2 - 0.0012), yBot + 0.006, back + 0.004], [x + sx * (cw / 2 - 0.0008), yc, back + depth * 0.6], [x + sx * (cw / 2 - 0.0012), yTop - 0.006, back + 0.004]], 0.0011, 5, 10), lea));
  }
  // D-ring on a tab at the top of the back (Y-strap hook)
  const dr = dRing(0.022, 0.014, 0.0017);
  dr.rotateZ(Math.PI);
  parts.push(part(dr, hw, { p: [0, yTop + 0.006, 0.0012] }));
  parts.push(part(F.extrude(roundRect(0.026, 0.02, 0.004), 0.0022, 0.0006), lea, { p: [0, yTop + 0.001, 0.0005] }));
  // belt loops
  for (const sx of [-1, 1]) parts.push(part(beltLoop(sx * 0.058, 0.026, 0.0017, yTop - 0.004, -0.034), lea));
  const g = group(parts);
  g.name = 'k98-pouch';
  return g;
}

// ------------------------------------------------------------------ MP 40 magazine pouch

export function mp40Pouch(opts: { loader?: boolean } = {}): THREE.Group {
  const can = U.canvas();
  const lea = U.belt();
  const hw = U.hardware();
  const parts: THREE.Object3D[] = [];
  const cw = 0.047, gap = 0.0025, n = 3;
  const total = n * cw + (n - 1) * gap;
  const yTop = 0.035, yBot = -0.238, h = yTop - yBot, yc = (yTop + yBot) / 2;
  const back = 0.0028, depth = 0.03;
  parts.push(part(F.extrude(roundRect(total + 0.004, h, 0.006), back, 0.0008), can, { p: [0, yc, back / 2] }));
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * (cw + gap);
    parts.push(part(pillow(cw, h - 0.012, depth, 0.008, 0.002, 3), can, { p: [x, yc - 0.004, back + depth / 2] }));
    const zf = back + depth + 0.0016;
    const fp: V3[] = [
      [x, yTop - 0.012, back + 0.004],
      [x, yTop + 0.001, back + 0.009],
      [x, yTop + 0.0016, back + depth * 0.5],
      [x, yTop - 0.004, zf],
      [x, yTop - 0.02, zf + 0.0012],
      [x, yTop - 0.05, zf + 0.0012],
    ];
    const fn: V3[] = [[0, 1, -0.2], [0, 1, 0], [0, 1, 0.2], [0, 0.5, 1], [0, 0, 1], [0, 0, 1]];
    parts.push(part(F.sheet(fp, fn, roundEnds(cw / 2 + 0.001, 0, 0.008), 0.0022, { across: 4, samples: 18, bulge: 0.0006 }), can));
    // leather tab riveted to the flap, closing over a stud
    const tp: V3[] = [[x, yTop - 0.038, zf + 0.0026], [x, yTop - 0.062, zf + 0.0018], [x, yTop - 0.084, zf + 0.0008]];
    parts.push(part(F.sheet(tp, [0, 0, 1], roundEnds(0.0062, 0.002, 0.006), 0.002, { across: 2, samples: 10 }), lea));
    parts.push(part(placeY(dome(0.003, 0.002, 10), [x, yTop - 0.041, zf + 0.0036], [0, 0, 1]), hw));
    parts.push(part(placeY(dome(0.0034, 0.0022, 12), [x, yTop - 0.079, zf + 0.0022], [0, 0, 1]), hw));
    // cell seams
    for (const sx of [-1, 1]) parts.push(part(F.tube([[x + sx * (cw / 2 - 0.001), yBot + 0.01, back + 0.004], [x + sx * (cw / 2 - 0.0006), yc, back + depth * 0.6], [x + sx * (cw / 2 - 0.001), yTop - 0.014, back + 0.004]], 0.001, 5, 12), can));
  }
  if (opts.loader) {
    // small pocket for the magazine loader on the outer face of the left pouch (flapped)
    const x = (1 - (n - 1) / 2) * (cw + gap) + cw * 0.5 + 0.004;
    void x;
  }
  const dr = dRing(0.02, 0.013, 0.0016);
  dr.rotateZ(Math.PI);
  parts.push(part(dr, hw, { p: [0, yTop + 0.005, 0.0012] }));
  parts.push(part(F.extrude(roundRect(0.024, 0.02, 0.004), 0.002, 0.0006), lea, { p: [0, yTop, 0.0005] }));
  for (const sx of [-1, 1]) parts.push(part(beltLoop(sx * (total / 2 - 0.016), 0.024, 0.0017, yTop - 0.006, -0.036), lea));
  const g = group(parts);
  g.name = 'mp40-pouch';
  return g;
}

// ------------------------------------------------------------------ P38 holster

/** Hard-shell holster, authored with the grip end at +x (towards the front when worn on the left). */
export function p38Holster(): THREE.Group {
  const lea = U.holster();
  const hw = U.hardware();
  const parts: THREE.Object3D[] = [];
  // body profile (x along the pistol, y up); muzzle end down-back
  const body: [number, number][] = [
    [0.075, 0.018], [0.068, 0.032], [0.02, 0.034], [-0.05, 0.02], [-0.095, 0.004], [-0.1, -0.012], [-0.09, -0.03], [-0.03, -0.042],
    [0.03, -0.052], [0.07, -0.062], [0.085, -0.05], [0.086, 0.0],
  ];
  const t = 0.036, back = 0.004;
  const bg = F.extrude(body, t, 0.009, 10, 3);
  parts.push(part(bg, lea, { p: [0, 0, back + t / 2] }));
  // flap over the grip end with a rounded point, closing strap down to a stud
  const flap: [number, number][] = [[0.09, 0.036], [0.02, 0.038], [0.006, 0.02], [0.03, -0.012], [0.07, -0.02], [0.094, -0.004]];
  parts.push(part(F.extrude(flap, 0.0035, 0.0012, 10, 2), lea, { p: [0, 0.002, back + t + 0.0012] }));
  const strap: V3[] = [[0.05, -0.012, back + t + 0.003], [0.05, -0.032, back + t + 0.0015], [0.05, -0.05, back + t - 0.002]];
  parts.push(part(F.sheet(strap, [0, 0, 1], roundEnds(0.0065, 0, 0.006), 0.0022, { across: 2, samples: 10 }), lea));
  parts.push(part(placeY(dome(0.0038, 0.0025, 12), [0.05, -0.045, back + t + 0.0004], [0, 0, 1]), hw));
  // spare magazine pocket on the front of the body
  parts.push(part(F.extrude(roundRect(0.032, 0.05, 0.006), 0.012, 0.004), lea, { p: [-0.035, -0.012, back + t + 0.004], r: [0, 0, 18] }));
  parts.push(part(F.extrude(roundRect(0.034, 0.02, 0.006), 0.003, 0.001), lea, { p: [-0.031, 0.006, back + t + 0.0105], r: [0, 0, 18] }));
  // belt loop tab on the back
  parts.push(part(beltLoop(0.02, 0.05, 0.0019, 0.03, -0.03), lea));
  parts.push(part(F.extrude(roundRect(0.06, 0.064, 0.008), back, 0.001), lea, { p: [0.02, 0.0, back / 2] }));
  const g = group(parts);
  g.name = 'p38-holster';
  return g;
}

// ------------------------------------------------------------------ MG tool pouch

export function toolPouch(): THREE.Group {
  const lea = U.holster();
  const hw = U.hardware();
  const parts: THREE.Object3D[] = [];
  const w = 0.13, h = 0.085, d = 0.036, yTop = 0.028, back = 0.003;
  const yc = yTop - h / 2;
  parts.push(part(pillow(w, h, d, 0.008, 0.002, 3), lea, { p: [0, yc, back + d / 2] }));
  const zf = back + d + 0.0012;
  const fp: V3[] = [[0, yTop - 0.003, back + 0.004], [0, yTop + 0.004, back + 0.012], [0, yTop + 0.004, back + d * 0.6], [0, yTop - 0.002, zf], [0, yTop - 0.03, zf + 0.001]];
  parts.push(part(F.sheet(fp, [[0, 1, 0], [0, 1, 0], [0, 1, 0.3], [0, 0.4, 1], [0, 0, 1]], roundEnds(w / 2 + 0.001, 0, 0.012), 0.0026, { across: 6, samples: 18 }), lea));
  // strap + frame buckle
  const sp: V3[] = [[0, yTop - 0.02, zf + 0.0028], [0, yTop - 0.05, zf + 0.0018], [0, yc - h / 2 + 0.01, zf - 0.001]];
  parts.push(part(F.sheet(sp, [0, 0, 1], 0.008, 0.0022, { across: 2, samples: 10 }), lea));
  const bk = frameBuckle(0.018, 0.012, 0.0012, true);
  parts.push(part(bk, hw, { p: [0, yTop - 0.052, zf + 0.0035] }));
  for (const sx of [-1, 1]) parts.push(part(beltLoop(sx * 0.04, 0.022, 0.0017, yTop - 0.004, -0.03), lea));
  // D-ring on a tab at the top of the back (Y-strap hook)
  const dr = dRing(0.02, 0.013, 0.0016);
  dr.rotateZ(Math.PI);
  parts.push(part(dr, hw, { p: [0, yTop + 0.007, 0.0012] }));
  parts.push(part(F.extrude(roundRect(0.024, 0.02, 0.004), 0.002, 0.0006), lea, { p: [0, yTop + 0.001, 0.0005] }));
  const g = group(parts);
  g.name = 'mg-tool-pouch';
  return g;
}

export const _v = V;
export const _merge = merge;
