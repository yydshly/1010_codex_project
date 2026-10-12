/**
 * External fittings of the Pz.Kpfw. IV Ausf. H hull: Schuerzen hanger rails with brackets and
 * the six 5 mm skirt plates per side (optional), pioneer tools in clamps on the track guards,
 * spare track links on the nose plate rack, Bosch headlight, antenna base on the rear deck
 * (moved there on the H when skirts were introduced), and restrained Balkenkreuz markings.
 */
import { THREE, G, part, group, mirrorX, decal } from '../../../core/kit';
import type { Palette } from './materials';
import { H, W, P } from './dims';
import { linkGeometries } from './track';
import { rb, cbox, nut, scatterN, merge, basisGroup, type V2 } from './util';

/** Schuerzen plates: 6 per side, top edge just under the roof line. */
export const SKIRT = { x: 1.628, t: 0.006, y0: 0.66, y1: 1.62, z0: 2.36, len: 0.8, gap: 0.014, n: 6 };

function plateSpan(i: number): V2 {
  const a = SKIRT.z0 - i * (SKIRT.len + SKIRT.gap);
  return [a, a - SKIRT.len];
}

// ------------------------------------------------------------------ Schuerzen
function skirtRail(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const zf = SKIRT.z0, zr = plateSpan(SKIRT.n - 1)[1];
  const xr = SKIRT.x - SKIRT.t / 2 - 0.006;
  // angle-section rail: vertical web + top flange
  out.push(part(rb(0.01, 0.06, zf - zr, 0.002), pal.sheet, { p: [xr, 1.595, (zf + zr) / 2] }));
  out.push(part(rb(0.045, 0.008, zf - zr, 0.002), pal.sheet, { p: [xr - 0.018, 1.621, (zf + zr) / 2] }));
  // brackets from the superstructure side, with diagonal braces
  const x0 = W.upper;
  for (const z of [1.72, 0.82, -0.08, -0.98, -1.88, -2.44]) {
    const len = xr - x0;
    out.push(part(rb(len, 0.05, 0.012, 0.003), pal.sheet, { p: [x0 + len / 2, 1.595, z] }));
    out.push(part(G.rod([x0 + 0.004, 1.34, z], [xr - 0.02, 1.575, z], 0.011, 8), pal.sheet));
    out.push(part(rb(0.012, 0.09, 0.06, 0.003), pal.sheet, { p: [x0 + 0.006, 1.58, z] }));
    out.push(part(rb(0.012, 0.06, 0.05, 0.003), pal.sheet, { p: [x0 + 0.006, 1.34, z] }));
  }
  // front support strut from the rail end down to the track guard
  out.push(part(G.rod([xr - 0.01, 1.58, zf - 0.08], [1.36, H.fender + 0.004, zf - 0.18], 0.012, 8), pal.sheet));
  out.push(part(rb(0.07, 0.01, 0.07, 0.003), pal.sheet, { p: [1.36, H.fender + 0.005, zf - 0.18] }));
  return out;
}

function skirtPlates(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const { x, t, y0, y1 } = SKIRT;
  for (let i = 0; i < SKIRT.n; i++) {
    const [a, b] = plateSpan(i);
    let outline: V2[] = [[b, y0], [a, y0], [a, y1], [b, y1]];
    if (i === 0) outline = [[b, y0], [a - 0.26, y0], [a, y0 + 0.34], [a, y1], [b, y1]];
    if (i === SKIRT.n - 1) outline = [[b + 0.22, y0], [a, y0], [a, y1], [b, y1], [b, y0 + 0.3]];
    out.push(part(G.plate(outline, t, 'zy', 0.0015, 0.01), pal.sheet, { p: [x, 0, 0] }));
    // hanger hooks over the top edge and the stiffening fold at the top
    for (const f of [0.22, 0.78]) {
      const z = a + (b - a) * f;
      out.push(part(rb(0.022, 0.05, 0.04, 0.004), pal.sheet, { p: [x + t / 2 + 0.006, y1 - 0.012, z] }));
      out.push(part(rb(0.03, 0.012, 0.04, 0.003), pal.sheet, { p: [x - 0.006, y1 + 0.004, z] }));
    }
  }
  return out;
}

// ------------------------------------------------------------------ tools
/** Clamp: two posts on the guard and a strap over a handle of radius r lying along Z at height yc. */
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
  // blade lying flat, tip forward
  const blade: V2[] = [[-0.11, 0], [0.11, 0], [0.11, 0.17], [0.07, 0.25], [0, 0.28], [-0.07, 0.25], [-0.11, 0.17]];
  out.push(part(G.plate(blade, 0.004, 'xz', 0.0012, 0.02), pal.toolSteel, { p: [0, H.fender + 0.004, 0] }));
  out.push(part(rb(0.05, 0.012, 0.16, 0.004), pal.toolSteel, { p: [0, H.fender + 0.01, 0.06] }));
  out.push(part(G.cyl(0.021, 0.018, 0.12, 14), pal.toolSteel, { p: [0, y, -0.06], r: [90, 0, 0] }));
  out.push(part(G.cyl(0.017, 0.017, 0.72, 12), pal.wood, { p: [0, y, -0.48], r: [90, 0, 0] }));
  // D grip
  out.push(part(G.tube([[0, y, -0.83], [0.05, y, -0.87], [0.05, y, -0.96], [0, y, -0.99], [-0.05, y, -0.96], [-0.05, y, -0.87], [0, y, -0.83]], 0.011, 8, 24, false), pal.wood));
  out.push(...clamp(pal, 0, -0.25, 0.017, y), ...clamp(pal, 0, -0.7, 0.017, y));
  return out;
}

function axe(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.fender + 0.02;
  const head: V2[] = [[-0.03, -0.035], [0.03, -0.035], [0.05, -0.02], [0.1, -0.05], [0.12, 0.0], [0.1, 0.05], [0.05, 0.02], [0.03, 0.035], [-0.03, 0.035], [-0.05, 0]];
  out.push(part(G.plate(head, 0.03, 'xz', 0.004), pal.toolSteel, { p: [0, y, 0] }));
  out.push(part(G.cyl(0.016, 0.013, 0.62, 12), pal.wood, { p: [0, y, -0.34], r: [90, 0, 0], s: [1, 1, 1.25] }));
  out.push(...clamp(pal, 0, -0.14, 0.016, y), ...clamp(pal, 0, -0.52, 0.015, y));
  return out;
}

function crowbar(pal: Palette): THREE.Object3D[] {
  const y = H.fender + 0.02;
  return [
    part(G.tube([[0, y, 0.72], [0, y, -0.62], [0, y + 0.012, -0.68], [0, y + 0.04, -0.71]], 0.014, 8, 20), pal.toolSteel),
    part(rb(0.028, 0.01, 0.08, 0.003), pal.toolSteel, { p: [0, y - 0.004, 0.75] }),
    ...clamp(pal, 0, 0.45, 0.014, y),
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

function cleaningRods(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.fender + 0.018;
  for (const [dx, dy] of [[-0.013, 0], [0.013, 0], [0, 0.022]] as V2[])
    out.push(part(G.cyl(0.012, 0.012, 1.9, 10), pal.wood, { p: [dx, y + dy, 0], r: [90, 0, 0] }));
  // brass joints between the rod sections
  for (const z of [-0.32, 0.32])
    for (const [dx, dy] of [[-0.013, 0], [0.013, 0], [0, 0.022]] as V2[])
      out.push(part(G.cyl(0.0135, 0.0135, 0.03, 10), pal.gun, { p: [dx, y + dy, z], r: [90, 0, 0] }));
  for (const z of [-0.75, 0, 0.75]) out.push(...clamp(pal, 0, z, 0.03, y + 0.01));
  return out;
}

function starterCrank(pal: Palette): THREE.Object3D[] {
  const y = H.fender + 0.02;
  return [
    part(G.tube([[0, y, 0.3], [0, y, -0.2], [-0.02, y, -0.24], [-0.16, y, -0.24], [-0.18, y, -0.28], [-0.18, y, -0.4]], 0.013, 8, 30), pal.toolSteel),
    part(G.cyl(0.02, 0.02, 0.07, 10), pal.toolSteel, { p: [0, y, 0.31], r: [90, 0, 0] }),
    ...clamp(pal, 0, 0.05, 0.013, y),
  ];
}

function tools(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // left guard (+X, driver's side)
  out.push(group(spade(pal), { p: [1.3, 0, 1.55] }));
  out.push(group(axe(pal), { p: [1.18, 0, 0.35] }));
  out.push(group(crowbar(pal), { p: [1.36, 0, -0.35] }));
  out.push(group(wireCutter(pal), { p: [1.17, 0, -0.95] }));
  // right guard (-X)
  out.push(group(cleaningRods(pal), { p: [-1.3, 0, 0.45] }));
  out.push(group(starterCrank(pal), { p: [-1.2, 0, -1.25] }));
  // jack block (wood) with its strap
  out.push(part(rb(0.26, 0.1, 0.2, 0.01), pal.wood, { p: [-1.26, H.fender + 0.05, -1.95] }));
  out.push(part(rb(0.28, 0.006, 0.03, 0.002), pal.gun, { p: [-1.26, H.fender + 0.103, -1.95] }));
  return out;
}

// ------------------------------------------------------------------ spare track links on the nose plate
function spareLinks(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const A = P.noseBottom, B = P.noseTop;
  const dz = B[0] - A[0], dy = B[1] - A[1];
  const l = Math.hypot(dz, dy);
  const u = new THREE.Vector3(0, dy / l, dz / l); // up the nose plate
  const n = new THREE.Vector3(0, -dz / l, dy / l); // outward normal (forward, slightly up)
  if (n.z < 0) n.negate();
  const xl = u.clone(), yl = n.clone().negate(), zl = new THREE.Vector3().crossVectors(xl, yl);
  const g = linkGeometries();
  const steel: THREE.BufferGeometry[] = [], bright: THREE.BufferGeometry[] = [];
  const count = 10;
  const sc = 0.25; // along the plate from its bottom edge to the link centre line
  const mid = new THREE.Vector3(0, A[1] + u.y * sc, A[0] + u.z * sc);
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * 0.121;
    const p = mid.clone().setX(x).addScaledVector(n, 0.082);
    const m = new THREE.Matrix4().makeBasis(xl, yl, zl).setPosition(p);
    steel.push(g.steel.clone().applyMatrix4(m));
    bright.push(g.bright.clone().applyMatrix4(m));
  }
  out.push(part(merge(steel), pal.exhaust), part(merge(bright), pal.exhaust));
  // rack: end brackets welded to the plate and a retaining bar across the link faces
  const hw = (count / 2) * 0.121 + 0.03;
  for (const s of [1, -1]) {
    const kids = [part(rb(0.02, 0.36, 0.11, 0.004), pal.paint, { p: [0, 0, 0.055] })];
    out.push(basisGroup(kids, mid.clone().setX(s * hw), new THREE.Vector3(1, 0, 0), u, n));
  }
  const barKids = [
    part(rb(2 * hw + 0.02, 0.04, 0.012, 0.003), pal.paint, { p: [0, 0.02, 0.112] }),
    part(scatterN(nut(0.024, 0.012), [[hw, 0.02, 0.118], [-hw, 0.02, 0.118]], [0, 0, 1]), pal.gun),
  ];
  out.push(basisGroup(barKids, mid, new THREE.Vector3(1, 0, 0), u, n));
  return out;
}

// ------------------------------------------------------------------ lights and antenna
function headlight(pal: Palette): THREE.Object3D[] {
  // Bosch blackout headlight on the left track guard, on a short pedestal
  const x = 1.2, z = 2.3, y = H.fender;
  return [
    part(rb(0.07, 0.012, 0.07, 0.003), pal.sheet, { p: [x, y + 0.006, z] }),
    part(G.cyl(0.013, 0.016, 0.08, 10), pal.sheet, { p: [x, y + 0.05, z] }),
    part(G.lathe([[0, -0.06], [0.05, -0.06], [0.07, -0.04], [0.078, -0.01], [0.078, 0.03], [0.074, 0.034], [0, 0.034]], 24, 35), pal.black, { p: [x, y + 0.155, z], r: [90, 0, 0] }),
    // blackout cover with the horizontal slit
    part(G.cyl(0.078, 0.078, 0.012, 24), pal.black, { p: [x, y + 0.155, z + 0.04], r: [90, 0, 0] }),
    part(cbox(0.08, 0.012, 0.004, 0.001), pal.glass, { p: [x, y + 0.155, z + 0.047] }),
    part(rb(0.1, 0.018, 0.02, 0.005), pal.black, { p: [x, y + 0.172, z + 0.05] }),
    // cable conduit to the superstructure
    part(G.tube([[x, y + 0.1, z - 0.06], [x - 0.05, y + 0.02, z - 0.16], [W.upper + 0.02, y + 0.012, z - 0.3]], 0.006, 6, 12), pal.black),
  ];
}

function antennaBase(pal: Palette): THREE.Object3D[] {
  const x = -0.93, z = -2.26, y = H.roof;
  return [
    part(G.cyl(0.075, 0.08, 0.02, 24), pal.paint, { p: [x, y + 0.01, z] }),
    part(G.lathe([[0, 0], [0.05, 0], [0.055, 0.02], [0.045, 0.1], [0.03, 0.12], [0, 0.12]], 20, 35), pal.black, { p: [x, y + 0.02, z] }),
    part(G.cyl(0.018, 0.022, 0.06, 12), pal.gun, { p: [x, y + 0.17, z] }),
    part(G.cyl(0.005, 0.006, 0.12, 8), pal.gun, { p: [x, y + 0.26, z] }),
    // armoured cover ring around the insulator
    part(G.cyl(0.07, 0.07, 0.07, 24, true), pal.paint, { p: [x, y + 0.055, z] }),
  ];
}

// ------------------------------------------------------------------ belly
function belly(pal: Palette): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = H.belly;
  // bolted inspection covers under the transmission and the engine, drain plug covers
  for (const [z, w, l] of [[1.55, 0.62, 0.42], [-1.45, 0.7, 0.55]] as G.V3[]) {
    out.push(part(rb(w, 0.014, l, 0.004), pal.paint, { p: [0, y - 0.006, z] }));
    const bolts: G.V3[] = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4 - 0.5;
      bolts.push([t * (w - 0.06), y - 0.013, z + l / 2 - 0.03], [t * (w - 0.06), y - 0.013, z - l / 2 + 0.03]);
    }
    out.push(part(scatterN(nut(0.022, 0.008), bolts, [0, -1, 0]), pal.paint));
  }
  for (const [x, z] of [[0.45, 0.6], [-0.45, 0.6], [0.35, -0.55], [-0.35, -2.0]] as V2[]) {
    out.push(part(G.cyl(0.07, 0.075, 0.014, 20), pal.paint, { p: [x, y - 0.006, z] }));
    out.push(part(nut(0.035, 0.012), pal.paint, { p: [x, y - 0.012, z], r: [180, 0, 0] }));
  }
  return out;
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
  const s = 0.4;
  if (skirtsOn) {
    const [a, b] = plateSpan(2);
    const z = (a + b) / 2;
    const xo = SKIRT.x + SKIRT.t / 2 + 0.002;
    out.push(decal('pz4-balkenkreuz', s, s, drawCross, { p: [xo, 1.2, z], r: [0, 90, 0] }));
    out.push(decal('pz4-balkenkreuz', s, s, drawCross, { p: [-xo, 1.2, z], r: [0, -90, 0] }));
  } else {
    const xo = W.upper + 0.003;
    out.push(decal('pz4-balkenkreuz', 0.34, 0.34, drawCross, { p: [xo, 1.33, -0.35], r: [0, 90, 0] }));
    out.push(decal('pz4-balkenkreuz', 0.34, 0.34, drawCross, { p: [-xo, 1.33, -0.35], r: [0, -90, 0] }));
  }
  // rear: on the upper rear plate, right of centre
  const zb = P.rearLowTop[0], zt = P.rearUpTop[0];
  const y = 1.36;
  const zr = zb + ((y - H.fender) / (P.rearUpTop[1] - H.fender)) * (zt - zb) - 0.004;
  const tilt = (Math.atan2(zt - zb, P.rearUpTop[1] - H.fender) * 180) / Math.PI;
  out.push(decal('pz4-balkenkreuz', 0.28, 0.28, drawCross, { p: [-0.52, y, zr], r: [tilt, 180, 0] }));
  return out;
}

/** All hull fittings. */
export function fittings(pal: Palette, skirtsOn: boolean): THREE.Group {
  const out: THREE.Object3D[] = [];
  const side: THREE.Object3D[] = [...skirtRail(pal)];
  if (skirtsOn) side.push(...skirtPlates(pal));
  out.push(mirrorX(group(side)));
  out.push(...tools(pal));
  out.push(...spareLinks(pal));
  out.push(...headlight(pal));
  out.push(...antennaBase(pal));
  out.push(...belly(pal));
  out.push(...markings(skirtsOn));
  return group(out);
}
