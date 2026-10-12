/**
 * External fittings of the StuG III Ausf. G: Schuerzen hanger rail with brackets and the five
 * 5 mm skirt plates per side (optional), pioneer tools in clamps on the rear track guards, two
 * spare road wheels on the left rear guard, spare track links on the nose plate rack, Bosch
 * headlight, jack block, and restrained Balkenkreuz markings.
 */
import { THREE, G, part, group, mirrorX, decal } from '../../../core/kit';
import type { Palette } from './materials';
import { H, W, P } from './dims';
import { linkGeometries } from './track';
import { spareWheel } from './running-gear';
import { panX, panFrontZ } from './casemate';
import { rb, nut, scatterN, merge, basisGroup, cbox, type V2 } from './util';

/** Schuerzen plates: 5 per side. */
export const SKIRT = { x: 1.55, t: 0.006, y0: 0.62, y1: 1.5, z0: 2.1, len: 0.88, gap: 0.012, n: 5 };

function plateSpan(i: number): V2 {
  const a = SKIRT.z0 - i * (SKIRT.len + SKIRT.gap);
  return [a, a - SKIRT.len];
}

// ------------------------------------------------------------------ Schuerzen
function skirtRail(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const zf = SKIRT.z0, zr = plateSpan(SKIRT.n - 1)[1];
  const xr = SKIRT.x - SKIRT.t / 2 - 0.006;
  const yr = SKIRT.y1 - 0.025;
  // angle-section rail: vertical web + top flange
  out.push(part(rb(0.01, 0.06, zf - zr, 0.002), pal.sheet, { p: [xr, yr, (zf + zr) / 2] }));
  out.push(part(rb(0.045, 0.008, zf - zr, 0.002), pal.sheet, { p: [xr - 0.018, yr + 0.026, (zf + zr) / 2] }));
  // brackets from the pannier / engine compartment sides, with diagonal braces to the guard
  for (const z of [1.5, 0.55, -0.4, -1.3, -2.25]) {
    const x0 = z > -0.6 ? panX(yr) : W.engine;
    const len = xr - x0;
    out.push(part(rb(len, 0.05, 0.012, 0.003), pal.sheet, { p: [x0 + len / 2, yr, z] }));
    out.push(part(rb(0.012, 0.09, 0.06, 0.003), pal.sheet, { p: [x0 + 0.006, yr - 0.015, z] }));
    out.push(part(G.rod([W.fender - 0.03, H.fender + 0.004, z], [xr - 0.015, yr - 0.02, z], 0.011, 8), pal.sheet));
    out.push(part(rb(0.05, 0.01, 0.05, 0.003), pal.sheet, { p: [W.fender - 0.03, H.fender + 0.005, z] }));
  }
  // front support strut from the rail end down to the track guard
  out.push(part(G.rod([xr - 0.01, yr - 0.02, zf - 0.06], [W.fender - 0.04, H.fender + 0.004, zf - 0.2], 0.012, 8), pal.sheet));
  return out;
}

function skirtPlates(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const { x, t, y0, y1 } = SKIRT;
  for (let i = 0; i < SKIRT.n; i++) {
    const [a, b] = plateSpan(i);
    let outline: V2[] = [[b, y0], [a, y0], [a, y1], [b, y1]];
    if (i === 0) outline = [[b, y0], [a - 0.3, y0], [a, y0 + 0.36], [a, y1], [b, y1]];
    if (i === SKIRT.n - 1) outline = [[b + 0.24, y0], [a, y0], [a, y1], [b, y1], [b, y0 + 0.3]];
    out.push(part(G.plate(outline, t, 'zy', 0.0015, 0.01), pal.sheet, { p: [x, 0, 0] }));
    for (const f of [0.22, 0.78]) {
      const z = a + (b - a) * f;
      out.push(part(rb(0.022, 0.05, 0.04, 0.004), pal.sheet, { p: [x + t / 2 + 0.006, y1 - 0.012, z] }));
      out.push(part(rb(0.03, 0.012, 0.04, 0.003), pal.sheet, { p: [x - 0.006, y1 + 0.004, z] }));
    }
  }
  return out;
}

// ------------------------------------------------------------------ tools
function clamp(pal: Palette, x: number, z: number, r: number, yc: number): THREE.Object3D[] {
  const y0 = H.fender;
  return [
    part(rb(0.022, yc - y0 + 0.004, 0.028, 0.003), pal.sheet, { p: [x + r + 0.014, (y0 + yc) / 2, z] }),
    part(rb(0.022, yc - y0 + 0.004, 0.028, 0.003), pal.sheet, { p: [x - r - 0.014, (y0 + yc) / 2, z] }),
    part(G.torus(r + 0.006, 0.0045, 6, 14, Math.PI), pal.gun, { p: [x, yc, z] }),
    part(rb(0.02, 0.012, 0.03, 0.003), pal.gun, { p: [x + r + 0.02, yc + 0.004, z] }),
  ];
}

function spade(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.fender + 0.022;
  const blade: V2[] = [[-0.11, 0], [0.11, 0], [0.11, 0.17], [0.07, 0.25], [0, 0.28], [-0.07, 0.25], [-0.11, 0.17]];
  out.push(part(G.plate(blade, 0.004, 'xz', 0.0012, 0.02), pal.toolSteel, { p: [0, H.fender + 0.004, 0] }));
  out.push(part(rb(0.05, 0.012, 0.16, 0.004), pal.toolSteel, { p: [0, H.fender + 0.01, 0.06] }));
  out.push(part(G.cyl(0.021, 0.018, 0.12, 14), pal.toolSteel, { p: [0, y, -0.06], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.017, 0.017, 0.62, 12), pal.wood, { p: [0, y, -0.43], r: [90, 0, 0] }));
  out.push(part(G.tube([[0, y, -0.73], [0.05, y, -0.77], [0.05, y, -0.86], [0, y, -0.89], [-0.05, y, -0.86], [-0.05, y, -0.77], [0, y, -0.73]], 0.011, 8, 24, false), pal.wood));
  out.push(...clamp(pal, 0, -0.25, 0.017, y), ...clamp(pal, 0, -0.62, 0.017, y));
  return out;
}

function axe(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.fender + 0.02;
  const head: V2[] = [[-0.03, -0.035], [0.03, -0.035], [0.05, -0.02], [0.1, -0.05], [0.12, 0.0], [0.1, 0.05], [0.05, 0.02], [0.03, 0.035], [-0.03, 0.035], [-0.05, 0]];
  out.push(part(G.plate(head, 0.03, 'xz', 0.004), pal.toolSteel, { p: [0, y, 0], r: [0, 180, 0] }));
  out.push(part(G.cyl(0.016, 0.013, 0.62, 12), pal.wood, { p: [0, y, -0.34], r: [90, 0, 0], s: [1, 1, 1.25] }));
  out.push(...clamp(pal, 0, -0.14, 0.016, y), ...clamp(pal, 0, -0.52, 0.015, y));
  return out;
}

function crowbar(pal: Palette): THREE.Object3D[] {
  const y = H.fender + 0.02;
  return [
    part(G.tube([[0, y, 0.62], [0, y, -0.62], [0, y + 0.012, -0.68], [0, y + 0.04, -0.71]], 0.014, 8, 20), pal.toolSteel),
    part(rb(0.028, 0.01, 0.08, 0.003), pal.toolSteel, { p: [0, y - 0.004, 0.65] }),
    ...clamp(pal, 0, 0.4, 0.014, y),
    ...clamp(pal, 0, -0.4, 0.014, y),
  ];
}

function wireCutter(pal: Palette): THREE.Object3D[] {
  const y = H.fender + 0.02;
  return [
    part(G.tube([[0.012, y, 0.1], [0.018, y, -0.2], [0.02, y, -0.5]], 0.011, 8, 12), pal.toolSteel),
    part(G.tube([[-0.012, y, 0.1], [-0.018, y, -0.2], [-0.02, y, -0.5]], 0.011, 8, 12), pal.toolSteel),
    part(rb(0.07, 0.024, 0.13, 0.008), pal.toolSteel, { p: [0, y, 0.16] }),
    part(G.cyl(0.02, 0.02, 0.032, 12), pal.gun, { p: [0, y, 0.1] }),
    ...clamp(pal, 0, -0.3, 0.03, y),
  ];
}

function tools(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // left rear guard (+X): axe ahead of the spare wheels
  out.push(group(axe(pal), { p: [1.33, 0, -0.78] }));
  // right rear guard (-X): spade, crowbar, wire cutters
  out.push(group(spade(pal), { p: [-1.36, 0, -0.72] }));
  out.push(group(crowbar(pal), { p: [-1.24, 0, -1.55] }));
  out.push(group(wireCutter(pal), { p: [-1.4, 0, -1.9] }));
  // jack block (wood) with its strap, right rear corner of the guard
  out.push(part(rb(0.22, 0.09, 0.18, 0.01), pal.wood, { p: [-1.33, H.fender + 0.045, -2.42] }));
  out.push(part(rb(0.24, 0.006, 0.03, 0.002), pal.gun, { p: [-1.33, H.fender + 0.093, -2.42] }));
  return out;
}

// ------------------------------------------------------------------ spare road wheels (left rear guard)
function spareWheels(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z = -2.02, y = H.fender + 0.275;
  // two single discs on a spindle bracket against the engine compartment side
  out.push(group([spareWheel(pal)], { p: [W.engine + 0.06, y, z], s: [-1, 1, 1] }));
  out.push(group([spareWheel(pal)], { p: [W.engine + 0.165, y, z] }));
  out.push(part(G.cyl(0.03, 0.03, 0.3, 14), pal.gun, { p: [W.engine + 0.13, y, z], r: [0, 0, 90] }));
  out.push(part(nut(0.05, 0.02), pal.gun, { p: [W.engine + 0.26, y, z], r: [0, 0, -90] }));
  out.push(part(rb(0.012, 0.16, 0.16, 0.004), pal.paint, { p: [W.engine + 0.006, y, z] }));
  // chock under the tyres
  out.push(part(rb(0.24, 0.03, 0.2, 0.006), pal.sheet, { p: [W.engine + 0.12, H.fender + 0.012, z] }));
  return out;
}

// ------------------------------------------------------------------ spare track links on the nose plate
function spareLinks(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const A = P.noseBottom, B = P.noseTop;
  const dz = B[0] - A[0], dy = B[1] - A[1];
  const l = Math.hypot(dz, dy);
  const u = new THREE.Vector3(0, dy / l, dz / l);
  const n = new THREE.Vector3(0, -dz / l, dy / l);
  if (n.z < 0) n.negate();
  const xl = u.clone(), yl = n.clone().negate(), zl = new THREE.Vector3().crossVectors(xl, yl);
  const g = linkGeometries();
  const steel: THREE.BufferGeometry[] = [], bright: THREE.BufferGeometry[] = [];
  const count = 9;
  const mid = new THREE.Vector3(0, A[1] + u.y * 0.2, A[0] + u.z * 0.2);
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * 0.121;
    const p = mid.clone().setX(x).addScaledVector(n, 0.082);
    const m = new THREE.Matrix4().makeBasis(xl, yl, zl).setPosition(p);
    steel.push(g.steel.clone().applyMatrix4(m));
    bright.push(g.bright.clone().applyMatrix4(m));
  }
  out.push(part(merge(steel), pal.black), part(merge(bright), pal.track));
  const hw = (count / 2) * 0.121 + 0.03;
  for (const s of [1, -1]) {
    out.push(basisGroup([part(rb(0.02, 0.34, 0.11, 0.004), pal.paint, { p: [0, 0, 0.055] })], mid.clone().setX(s * hw), new THREE.Vector3(1, 0, 0), u, n));
  }
  out.push(
    basisGroup(
      [part(rb(2 * hw + 0.02, 0.04, 0.012, 0.003), pal.paint, { p: [0, 0.02, 0.112] }), part(scatterN(nut(0.024, 0.012), [[hw, 0.02, 0.118], [-hw, 0.02, 0.118]], [0, 0, 1]), pal.gun)],
      mid,
      new THREE.Vector3(1, 0, 0),
      u,
      n,
    ),
  );
  return out;
}

// ------------------------------------------------------------------ headlight
function headlight(pal: Palette): THREE.Object3D[] {
  const x = 1.22, z = 2.3, y = H.fender;
  return [
    part(rb(0.07, 0.012, 0.07, 0.003), pal.sheet, { p: [x, y + 0.006, z] }),
    part(G.cyl(0.013, 0.016, 0.08, 10), pal.sheet, { p: [x, y + 0.05, z] }),
    part(G.lathe([[0, -0.06], [0.05, -0.06], [0.07, -0.04], [0.078, -0.01], [0.078, 0.03], [0.074, 0.034], [0, 0.034]], 24, 35), pal.black, { p: [x, y + 0.155, z], r: [90, 0, 0] }),
    part(G.cyl(0.078, 0.078, 0.012, 24), pal.black, { p: [x, y + 0.155, z + 0.04], r: [90, 0, 0] }),
    part(cbox(0.08, 0.012, 0.004, 0.001), pal.glass, { p: [x, y + 0.155, z + 0.047] }),
    part(rb(0.1, 0.018, 0.02, 0.005), pal.black, { p: [x, y + 0.172, z + 0.05] }),
    part(G.tube([[x, y + 0.1, z - 0.06], [x - 0.02, y + 0.02, z - 0.16], [x - 0.05, y + 0.012, panFrontZ(H.fender) + 0.02]], 0.006, 6, 12), pal.black),
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

function markings(skirtsOn: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  if (skirtsOn) {
    const [a, b] = plateSpan(2);
    const z = (a + b) / 2;
    const xo = SKIRT.x + SKIRT.t / 2 + 0.002;
    out.push(decal('stug-balkenkreuz', 0.4, 0.4, drawCross, { p: [xo, 1.08, z], r: [0, 90, 0] }));
    out.push(decal('stug-balkenkreuz', 0.4, 0.4, drawCross, { p: [-xo, 1.08, z], r: [0, -90, 0] }));
  } else {
    // on the sloped pannier sides
    const y = 1.5;
    const tilt = (Math.atan2(W.panBase - W.panTop, H.roof - H.fender) * 180) / Math.PI;
    for (const s of [1, -1]) {
      out.push(decal('stug-balkenkreuz', 0.36, 0.36, drawCross, { p: [s * (panX(y) + 0.003), y, 0.55], r: [0, s * 90, 0] }));
      out[out.length - 1].rotateX((-tilt * Math.PI) / 180);
    }
  }
  // rear: on the upper rear plate, left of centre
  const [zt, yt] = P.deckRear, [zb, yb] = P.rearUpBottom;
  const y = 1.25;
  const zr = zb + ((y - yb) / (yt - yb)) * (zt - zb) - 0.004;
  const tilt = (Math.atan2(zt - zb, yt - yb) * 180) / Math.PI;
  out.push(decal('stug-balkenkreuz', 0.26, 0.26, drawCross, { p: [0.62, y, zr], r: [tilt, 180, 0] }));
  return out;
}

/** All hull fittings. */
export function fittings(pal: Palette, skirtsOn: boolean): THREE.Group {
  const out: THREE.Object3D[] = [];
  const side: THREE.Object3D[] = [...skirtRail(pal)];
  if (skirtsOn) side.push(...skirtPlates(pal));
  out.push(mirrorX(group(side)));
  out.push(...tools(pal));
  out.push(...spareWheels(pal));
  out.push(...spareLinks(pal));
  out.push(...headlight(pal));
  out.push(...markings(skirtsOn));
  return group(out);
}
