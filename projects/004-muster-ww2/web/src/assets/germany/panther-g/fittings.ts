/**
 * External fittings of the Panther Ausf. G hull: a tow cable on each upper side plate, the gun
 * cleaning-rod tube on the left side, shovel, sledgehammer and axe on the right side, the jack on
 * the rear deck edge, the Bosch headlight on the left of the glacis, and restrained Balkenkreuz
 * markings (no unit or turret numbers).
 */
import { THREE, G, part, group, mirrorX, decal } from '../../../core/kit';
import type { Palette } from './materials';
import { H } from './dims';
import { onSide, onGlacis, onRear } from './hull';
import { rb, nut, rope, latheZ, type V2 } from './util';

// ------------------------------------------------------------------ helpers
/** Strap clamp over a round item of radius r lying along local X at height yc above a base at 0. */
function clamp(pal: Palette, x: number, r: number, zc: number): THREE.Object3D[] {
  return [
    part(rb(0.03, 0.022, zc + 0.004, 0.003), pal.sheet, { p: [x, r + 0.014, zc / 2] }),
    part(rb(0.03, 0.022, zc + 0.004, 0.003), pal.sheet, { p: [x, -r - 0.014, zc / 2] }),
    part(G.torus(r + 0.006, 0.0045, 6, 14, Math.PI), pal.gun, { p: [x, 0, zc], r: [0, 90, 90] }),
  ];
}

// ------------------------------------------------------------------ side plates
function towCable(pal: Palette): THREE.Object3D[] {
  // local frame of onSide: x = rearwards, y = up the slope, z = outward
  const r = 0.016, zc = 0.03;
  const x0 = -1.55, x1 = 2.35;
  const out: THREE.Object3D[] = [part(rope([[x0 + 0.1, 0, zc], [(x0 + x1) / 2, 0, zc], [x1 - 0.1, 0, zc]], r, 0.07), pal.rope)];
  for (const [xe, d] of [[x0, 1], [x1, -1]] as V2[]) {
    out.push(part(G.torus(0.05, r * 0.95, 8, 22), pal.rope, { p: [xe + d * 0.02, 0, zc], s: [1, 0.8, 1] }));
    out.push(part(G.cyl(r + 0.008, r + 0.008, 0.07, 14), pal.gun, { p: [xe + d * 0.1, 0, zc], r: [0, 0, 90] }));
    out.push(part(G.cyl(0.013, 0.013, 0.05, 10), pal.sheet, { p: [xe + d * 0.02, 0.03, 0.025], r: [90, 0, 0] }));
  }
  for (const x of [-0.8, 0.4, 1.5]) out.push(...clamp(pal, x, r, zc));
  return out;
}

function leftSide(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  out.push(onSide(towCable(pal), 0, 1.36));
  // gun cleaning-rod tube with end caps and brackets
  const tube: THREE.Object3D[] = [];
  const zc = 0.065, r = 0.05;
  tube.push(part(G.cyl(r, r, 2.3, 24), pal.sheet, { p: [0.4, 0, zc], r: [0, 0, 90] }));
  for (const x of [-0.75, 1.55]) tube.push(part(G.cyl(r + 0.006, r + 0.006, 0.05, 24), pal.sheet, { p: [x, 0, zc], r: [0, 0, 90] }));
  tube.push(part(nut(0.03, 0.012), pal.gun, { p: [1.575, 0, zc], r: [0, 0, -90] }));
  for (const x of [-0.4, 0.4, 1.2]) tube.push(...clamp(pal, x, r, zc));
  out.push(onSide(tube, 0, 1.69));
  return out;
}

function rightSide(pal: Palette): THREE.Object3D[] {
  // built on the left frame, then mirrored to the right side of the hull
  const out: THREE.Object3D[] = [];
  out.push(onSide(towCable(pal), 0, 1.36));
  const k: THREE.Object3D[] = [];
  // shovel: blade forward (local -x), handle rearwards
  const blade: V2[] = [[0, -0.1], [0.17, -0.1], [0.24, -0.06], [0.27, 0], [0.24, 0.06], [0.17, 0.1], [0, 0.1]];
  const sh = [
    part(G.plate(blade, 0.004, 'xy', 0.0012, 0.02), pal.toolSteel, { p: [0.36, 0, 0.01] }),
    part(rb(0.14, 0.045, 0.012, 0.004), pal.toolSteel, { p: [0.33, 0, 0.012] }),
    part(G.cyl(0.02, 0.017, 0.1, 14), pal.toolSteel, { p: [0.27, 0, 0.02], r: [0, 0, 90] }),
    part(G.cyl(0.017, 0.017, 0.66, 12), pal.wood, { p: [-0.1, 0, 0.02], r: [0, 0, 90] }),
    part(G.tube([[-0.43, 0, 0.02], [-0.47, 0.05, 0.02], [-0.56, 0.05, 0.02], [-0.59, 0, 0.02], [-0.56, -0.05, 0.02], [-0.47, -0.05, 0.02], [-0.43, 0, 0.02]], 0.011, 8, 24), pal.wood),
    ...clamp(pal, 0.08, 0.017, 0.02),
    ...clamp(pal, -0.3, 0.017, 0.02),
  ];
  k.push(group(sh, { p: [0.3, 0, 0], r: [0, 0, 180] }));
  // sledgehammer
  const sl = [
    part(G.cyl(0.016, 0.014, 0.8, 12), pal.wood, { p: [0, 0, 0.022], r: [0, 0, 90] }),
    part(rb(0.15, 0.055, 0.055, 0.008), pal.toolSteel, { p: [0.45, 0, 0.03] }),
    ...clamp(pal, 0.25, 0.016, 0.022),
    ...clamp(pal, -0.25, 0.016, 0.022),
  ];
  k.push(group(sl, { p: [-1.5, 0, 0] }));
  // axe
  const head: V2[] = [[-0.03, -0.035], [0.03, -0.035], [0.05, -0.02], [0.11, -0.055], [0.13, 0.0], [0.11, 0.055], [0.05, 0.02], [0.03, 0.035], [-0.03, 0.035], [-0.05, 0]];
  const ax = [
    part(G.plate(head, 0.03, 'xy', 0.004), pal.toolSteel, { p: [0.36, 0, 0.022], r: [0, 0, 90] }),
    part(G.cyl(0.017, 0.014, 0.72, 12), pal.wood, { p: [0, 0, 0.022], r: [0, 0, 90] }),
    ...clamp(pal, 0.2, 0.017, 0.022),
    ...clamp(pal, -0.22, 0.016, 0.022),
  ];
  k.push(group(ax, { p: [-0.3, 0, 0] }));
  out.push(onSide(k, 0, 1.68));
  return [mirrorX(group(out), false)];
}

// ------------------------------------------------------------------ glacis headlight
function headlight(pal: Palette): THREE.Object3D {
  const k: THREE.Object3D[] = [
    part(rb(0.12, 0.1, 0.014, 0.004), pal.paint, { p: [0, 0, 0.007] }),
    part(G.cyl(0.018, 0.022, 0.07, 12), pal.black, { p: [0, 0.0, 0.05], r: [90, 0, 0] }),
  ];
  // lamp body: faces forward (+Z global) - built in a sub-group undoing the glacis tilt
  const lamp = group(
    [
      part(latheZ([[0, -0.07], [0.05, -0.07], [0.075, -0.045], [0.084, -0.01], [0.084, 0.03], [0.08, 0.034], [0, 0.034]], 28, 35), pal.black),
      part(G.cyl(0.078, 0.078, 0.008, 28), pal.glass, { p: [0, 0, 0.034], r: [90, 0, 0] }),
      part(G.cyl(0.084, 0.084, 0.01, 28), pal.black, { p: [0, 0, 0.042], r: [90, 0, 0] }),
      part(rb(0.085, 0.012, 0.004, 0.001), pal.glass, { p: [0, 0, 0.048] }),
      part(rb(0.11, 0.02, 0.022, 0.005), pal.black, { p: [0, 0.018, 0.052] }),
    ],
    { p: [0, 0.07, 0.12], r: [55, 0, 0] },
  );
  k.push(lamp);
  return onGlacis(k, 1.0, 1.8);
}

// ------------------------------------------------------------------ rear deck jack
function jack(pal: Palette): THREE.Object3D[] {
  const y = H.roof;
  const z = -2.66;
  return [
    part(G.cyl(0.07, 0.07, 0.32, 20), pal.black, { p: [-0.3, y + 0.08, z], r: [0, 0, 90] }),
    part(G.cyl(0.055, 0.055, 0.1, 16), pal.black, { p: [-0.51, y + 0.08, z], r: [0, 0, 90] }),
    part(rb(0.2, 0.03, 0.14, 0.006), pal.black, { p: [-0.08, y + 0.08, z] }),
    ...[-0.4, -0.16].flatMap((x) => [
      part(rb(0.03, 0.02, 0.18, 0.004), pal.sheet, { p: [x, y + 0.01, z] }),
      part(G.torus(0.078, 0.006, 6, 20, Math.PI), pal.sheet, { p: [x, y + 0.01, z], r: [0, 90, 0] }),
    ]),
  ];
}

// ------------------------------------------------------------------ markings
function drawCross(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const a = w * 0.3, b = w * 0.16;
  ctx.fillStyle = '#e9e5da';
  ctx.fillRect(0, (h - a) / 2, w, a);
  ctx.fillRect((w - a) / 2, 0, a, h);
  ctx.fillStyle = '#151515';
  ctx.fillRect(0, (h - b) / 2, w, b);
  ctx.fillRect((w - b) / 2, 0, b, h);
}

function markings(): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const left = onSide([decal('panther-balkenkreuz', 0.3, 0.3, drawCross, { p: [0, 0, 0.004] })], -2.02, 1.56);
  out.push(mirrorX(left));
  out.push(onRear([decal('panther-balkenkreuz', 0.2, 0.2, drawCross, { p: [0, -0.02, 0.284] })], 1.02, 1.42));
  return out;
}

/** All hull fittings. */
export function fittings(pal: Palette): THREE.Group {
  const out: THREE.Object3D[] = [];
  out.push(...leftSide(pal));
  out.push(...rightSide(pal));
  out.push(headlight(pal));
  out.push(...jack(pal));
  out.push(...markings());
  return group(out);
}
