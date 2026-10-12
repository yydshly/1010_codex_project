/**
 * Cromwell Mk IV turret: a flat-sided box of armour plates bolted to a welded inner structure (the
 * large bolt bosses of the outer plates show on the front, sides and rear), external mantlet with the
 * 75 mm OQF Mk V, the co-axial Besa and the gunner's sight aperture; roof with the all-round vision
 * cupola (eight episcopes, two-piece hatch) on the right, the loader's two-piece hatch on the left,
 * gunner's and loader's periscopes, the 2-inch bomb thrower, a ventilator cover, aerial bases and
 * lifting eyes; stowage bins on both turret sides.
 *
 * Turret-local frame: origin at the turret-ring centre on the underside of the turret body,
 * +Z forward, +X = the tank's left.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { T } from './dims';
import type { Pal } from './palette';
import { slab, boss, row, rb, merge, latheZ } from './util';
import { periscope } from './hull';

const { xW, zF, zR, h } = T;
const tFr = 0.076, tSd = 0.06, tRe = 0.05, tRf = 0.02;

/* ---------------------------------- body ------------------------------------------------- */

function body(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const top = h - tRf;
  const xo = xW + 0.006;
  // front plate overlaps the sides; sides run back to the rear plate
  out.push(part(slab([[-xo, 0, zF], [xo, 0, zF], [xo, top, zF], [-xo, top, zF]], tFr, [0, 0, 1], 0.01), P.paint));
  for (const sx of [-1, 1]) {
    out.push(part(slab([[sx * xW, 0, zR + tRe], [sx * xW, 0, zF - tFr], [sx * xW, top, zF - tFr], [sx * xW, top, zR + tRe]], tSd, [sx, 0, 0], 0.008), P.paint));
  }
  out.push(part(slab([[-xo, 0, zR], [-xo, top, zR], [xo, top, zR], [xo, 0, zR]], tRe, [0, 0, -1], 0.008), P.paint));
  // roof plate, a little proud all round, and the floor under the bustle
  out.push(part(slab([[-xo - 0.004, h, zR - 0.004], [xo + 0.004, h, zR - 0.004], [xo + 0.004, h, zF + 0.004], [-xo - 0.004, h, zF + 0.004]], tRf, [0, 1, 0], 0.005), P.paint));
  out.push(part(slab([[-xW + 0.01, 0, zR + 0.01], [-xW + 0.01, 0, zF - 0.01], [xW - 0.01, 0, zF - 0.01], [xW - 0.01, 0, zR + 0.01]], 0.02, [0, -1, 0], 0.004), P.paint));

  // large armour-bolt bosses
  const bs = boss(0.026, 0.016, 12);
  const pl: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  // front plate: rows above and below the mantlet, and outer columns
  pl.push(...row([-0.8, top - 0.06, zF], [0.8, top - 0.06, zF], [0, 0, 1], 7));
  pl.push(...row([-0.8, 0.07, zF], [0.8, 0.07, zF], [0, 0, 1], 7));
  for (const sx of [-1, 1]) pl.push(...row([sx * 0.8, 0.24, zF], [sx * 0.8, 0.46, zF], [0, 0, 1], 2));
  // side plates: three rows along the front half (the bins cover the rear half), two rows below the bins
  for (const sx of [-1, 1]) {
    for (const y of [0.1, 0.37, top - 0.07]) pl.push(...row([sx * xW, y, zF - tFr - 0.08], [sx * xW, y, 0.1], [sx, 0, 0], 3));
    pl.push(...row([sx * xW, 0.08, -0.08], [sx * xW, 0.08, zR + tRe + 0.06], [sx, 0, 0], 4));
    pl.push(...row([sx * xW, top - 0.05, -0.08], [sx * xW, top - 0.05, zR + tRe + 0.06], [sx, 0, 0], 4));
  }
  // rear plate
  pl.push(...row([-0.78, top - 0.07, zR], [0.78, top - 0.07, zR], [0, 0, -1], 6));
  pl.push(...row([-0.78, 0.09, zR], [0.78, 0.09, zR], [0, 0, -1], 6));
  out.push(part(G.scatter(bs, pl), P.cast));
  // roof edge rivets
  const sm = boss(0.012, 0.007, 8);
  const pr: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (const sx of [-1, 1]) pr.push(...row([sx * (xo - 0.03), h, zF - 0.05], [sx * (xo - 0.03), h, zR + 0.05], [0, 1, 0], 14));
  pr.push(...row([-xo + 0.09, h, zF - 0.03], [xo - 0.09, h, zF - 0.03], [0, 1, 0], 12));
  pr.push(...row([-xo + 0.09, h, zR + 0.03], [xo - 0.09, h, zR + 0.03], [0, 1, 0], 12));
  out.push(part(G.scatter(sm, pr), P.cast));
  return out;
}

/* ------------------------------------- gun -------------------------------------------------- */

function gunAndMantlet(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y0 = T.trunY;
  const mD = 0.15; // mantlet depth
  const zM = zF + mD; // mantlet front face
  // external mantlet: thick rounded rectangle, bevelled edges
  const mw = 0.9, mh = 0.46;
  const mg = G.extrude(G.shape([[-mw / 2, -mh / 2], [mw / 2, -mh / 2], [mw / 2, mh / 2], [-mw / 2, mh / 2]], 0.08), mD, 0.022, 8, 2);
  out.push(part(mg, P.cast, { p: [0, y0, zF + mD / 2] }));
  // mantlet face bolts
  const mb: { p: G.V3; n: G.V3; spin: number }[] = [];
  for (const [x, y] of [[-0.36, 0.15], [0.36, 0.15], [-0.36, -0.15], [0.36, -0.15], [-0.12, -0.17], [0.12, -0.17]] as [number, number][]) mb.push({ p: [x, y0 + y, zM], n: [0, 0, 1], spin: x * 10 });
  out.push(part(G.scatter(G.boltHead(0.03, 0.013), mb), P.cast));
  // gun collar (armoured sleeve) on the mantlet
  out.push(part(latheZ([[0.0, 0.0], [0.13, 0.0], [0.128, 0.03], [0.105, 0.05], [0.098, 0.13], [0.105, 0.14], [0.105, 0.16], [0.094, 0.172], [0.0, 0.172]], 40, 40), P.cast, { p: [0, y0, zM - 0.01] }));
  // 75 mm barrel with the muzzle counterweight; hollow muzzle
  const zb = zM + 0.15, zm = T.muzzleZ;
  const barrel = latheZ(
    [
      [0.0, zb],
      [0.062, zb],
      [0.06, zb + 0.08],
      [0.055, zb + 0.3],
      [0.049, zm - 0.24],
      [0.049, zm - 0.2],
      [0.057, zm - 0.18],
      [0.058, zm - 0.02],
      [0.054, zm],
      [0.0375, zm],
      [0.0375, zm - 0.35],
      [0.0, zm - 0.35],
    ],
    36,
    30,
  );
  out.push(part(barrel, P.paint, { p: [0, y0, 0] }));
  // co-axial Besa (left of the gun) in its armoured sleeve
  const bx = 0.25, by = y0 + 0.01;
  out.push(part(latheZ([[0.0, 0.0], [0.045, 0.0], [0.045, 0.02], [0.036, 0.034], [0.034, 0.07], [0.0, 0.07]], 20, 40), P.cast, { p: [bx, by, zM - 0.005] }));
  out.push(part(latheZ([[0.0, 0.0], [0.017, 0.0], [0.017, 0.1], [0.0, 0.1]], 14, 40), P.gun, { p: [bx, by, zM + 0.06] }));
  out.push(part(latheZ([[0.011, 0.0], [0.022, 0.0], [0.024, 0.02], [0.024, 0.045], [0.011, 0.045]], 14, 40), P.gun, { p: [bx, by, zM + 0.155] }));
  out.push(part(G.cyl(0.011, 0.011, 0.004, 10), P.void, { p: [bx, by, zM + 0.199], r: [90, 0, 0] }));
  // gunner's sight aperture (right of the gun) with its hood
  out.push(part(G.box(0.05, 0.036, 0.01), P.void, { p: [-0.22, y0 + 0.07, zM + 0.002] }));
  out.push(part(G.box(0.04, 0.026, 0.004), P.vision, { p: [-0.22, y0 + 0.07, zM + 0.004] }));
  out.push(part(rb(0.1, 0.02, 0.05, 0.006), P.cast, { p: [-0.22, y0 + 0.105, zM + 0.018] }));
  return out;
}

/* ---------------------------------- roof fittings ------------------------------------------ */

/** All-round vision cupola: base on y = 0. */
function cupola(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(
    part(
      G.lathe([[0.0, 0.0], [0.395, 0.0], [0.395, 0.022], [0.37, 0.034], [0.35, 0.04], [0.345, 0.1], [0.352, 0.108], [0.352, 0.122], [0.34, 0.13], [0.27, 0.13], [0.27, 0.118], [0.0, 0.118]], 56, 40),
      P.cast,
    ),
  );
  // bolts round the base flange
  ps.push(part(G.scatter(G.boltHead(0.018, 0.008), Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2 + 0.1;
    return { p: [Math.sin(a) * 0.375, 0.022, Math.cos(a) * 0.375] as G.V3, spin: a };
  })), P.cast));
  // eight episcopes with armoured heads
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const s = Math.sin(a), c = Math.cos(a);
    const at = (r: number, y: number): G.V3 => [s * r, y, c * r];
    const ry = (a * 180) / Math.PI;
    ps.push(part(rb(0.12, 0.065, 0.06, 0.01), P.cast, { p: at(0.36, 0.075), r: [0, ry, 0] }));
    ps.push(part(G.box(0.096, 0.038, 0.004), P.void, { p: at(0.3915, 0.072), r: [0, ry, 0] }));
    ps.push(part(G.box(0.088, 0.03, 0.004), P.vision, { p: at(0.3935, 0.072), r: [0, ry, 0] }));
    ps.push(part(rb(0.14, 0.014, 0.05, 0.004), P.cast, { p: at(0.378, 0.112), r: [-8, ry, 0] }));
  }
  // two-piece hatch, halves hinged on the outer edges, visible parting gap
  for (const sx of [-1, 1]) {
    const half = G.lathe([[0.0, 0.146], [0.2, 0.144], [0.255, 0.138], [0.265, 0.13], [0.265, 0.118], [0.0, 0.118]], 24, 45, sx > 0 ? 0 : Math.PI, Math.PI);
    ps.push(part(half, P.cast, { p: [sx * 0.006, 0, 0] }));
    // stiffening lip along the parting edge (closes the cut face of the half dome)
    ps.push(part(rb(0.016, 0.034, 0.5, 0.005), P.cast, { p: [sx * 0.014, 0.134, 0] }));
    for (const z of [-0.11, 0.11]) {
      ps.push(part(G.cyl(0.02, 0.02, 0.07, 12), P.cast, { p: [sx * 0.285, 0.135, z], r: [90, 0, 0] }));
      ps.push(part(rb(0.06, 0.016, 0.055, 0.005), P.cast, { p: [sx * 0.25, 0.145, z] }));
    }
    ps.push(part(G.tube([[sx * 0.07, 0.146, -0.07], [sx * 0.085, 0.18, -0.06], [sx * 0.085, 0.18, 0.06], [sx * 0.07, 0.146, 0.07]], 0.008, 6, 20), P.paint));
  }
  return group(ps);
}

/** Loader's two-piece hatch lying on y = 0. */
function loaderHatch(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const W = 0.5, L = 0.5, t = 0.026;
  ps.push(part(G.plate([[-W / 2 - 0.035, -L / 2 - 0.035], [W / 2 + 0.035, -L / 2 - 0.035], [W / 2 + 0.035, L / 2 + 0.035], [-W / 2 - 0.035, L / 2 + 0.035]], 0.016, 'xz', 0.004, 0.06), P.paint, { p: [0, 0.008, 0] }));
  for (const sx of [-1, 1]) {
    const hl: G.V2[] = [[0, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [0, L / 2]];
    ps.push(part(G.plate(hl.map(([x, z]) => [sx * x, z] as G.V2), t, 'xz', 0.005, 0.03), P.paint, { p: [sx * 0.003, 0.016 + t / 2, 0] }));
    for (const z of [-0.14, 0.14]) {
      ps.push(part(G.cyl(0.02, 0.02, 0.07, 12), P.paint, { p: [sx * (W / 2 + 0.03), 0.034, z], r: [90, 0, 0] }));
      ps.push(part(rb(0.06, 0.014, 0.05, 0.004), P.paint, { p: [sx * (W / 2 - 0.005), 0.047, z] }));
    }
    ps.push(part(G.tube([[sx * 0.1, 0.042, -0.07], [sx * 0.11, 0.075, -0.05], [sx * 0.11, 0.075, 0.05], [sx * 0.1, 0.042, 0.07]], 0.008, 6, 20), P.paint));
  }
  return group(ps);
}

/** 2-inch bomb thrower: tube angled forward through the roof; base on y = 0. */
function bombThrower(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.0, 0.0], [0.085, 0.0], [0.085, 0.02], [0.075, 0.03], [0.0, 0.03]], 24, 40), P.cast));
  const dir = new THREE.Vector3(0, Math.cos((45 * Math.PI) / 180), Math.sin((45 * Math.PI) / 180));
  const a = new THREE.Vector3(0, 0.02, 0), b = a.clone().addScaledVector(dir, 0.16);
  ps.push(part(G.rod(a, b, 0.036, 18), P.cast));
  ps.push(part(G.rod(b, b.clone().addScaledVector(dir, 0.02), 0.042, 18), P.cast));
  ps.push(part(G.rod(b.clone().addScaledVector(dir, 0.019), b.clone().addScaledVector(dir, 0.022), 0.028, 14), P.void));
  return group(ps);
}

function ventCover(P: Pal): THREE.Object3D {
  return group([
    part(G.lathe([[0.0, 0.0], [0.13, 0.0], [0.13, 0.014], [0.105, 0.024], [0.1, 0.05], [0.0, 0.05]], 32, 40), P.cast),
    part(G.lathe([[0.0, 0.1], [0.07, 0.096], [0.12, 0.082], [0.15, 0.065], [0.155, 0.055], [0.0, 0.055]], 32, 50), P.cast),
    ...[0, 1, 2, 3].map((k) => {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      return part(rb(0.02, 0.03, 0.03, 0.005), P.cast, { p: [Math.sin(a) * 0.1, 0.055, Math.cos(a) * 0.1], r: [0, (a * 180) / Math.PI, 0] });
    }),
  ]);
}

function aerialBase(P: Pal): THREE.Object3D {
  return group([
    part(G.lathe([[0.0, 0.0], [0.065, 0.0], [0.065, 0.015], [0.05, 0.022], [0.0, 0.022]], 20, 40), P.cast),
    part(G.lathe([[0.0, 0.022], [0.032, 0.022], [0.028, 0.09], [0.02, 0.11], [0.0, 0.11]], 16, 40), P.black),
    part(G.cyl(0.006, 0.006, 0.08, 8), P.gun, { p: [0, 0.15, 0] }),
  ]);
}

function liftingEye(P: Pal): THREE.Object3D {
  return group([
    part(rb(0.03, 0.02, 0.09, 0.006), P.cast, { p: [0, 0.01, 0] }),
    part(G.torus(0.034, 0.011, 8, 16), P.cast, { p: [0, 0.042, 0], r: [0, 90, 0] }),
  ]);
}

/* ------------------------------------ side bins -------------------------------------------- */

/** Turret-side stowage bin for the tank's left (+X) side; back face on x = 0, facing +X. */
function sideBin(P: Pal, len: number, dep: number, ht: number): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.rbox(dep, ht, len, 0.012, 2), P.sheet, { p: [dep / 2, 0, 0] }));
  // lid (overlapping the top edge), hinged along the turret side
  ps.push(part(G.rbox(dep + 0.016, 0.026, len + 0.02, 0.008, 2), P.sheet, { p: [dep / 2 + 0.008, ht / 2 + 0.006, 0] }));
  ps.push(part(G.cyl(0.011, 0.011, len - 0.08, 10), P.sheet, { p: [0.012, ht / 2 + 0.012, 0], r: [90, 0, 0] }));
  // pressed stiffening swages on the outer face
  const sw: THREE.BufferGeometry[] = [];
  for (const y of [-ht * 0.22, ht * 0.12]) {
    const g = G.rbox(0.012, 0.03, len - 0.1, 0.006, 1);
    g.translate(dep + 0.001, y, 0);
    sw.push(g);
  }
  ps.push(part(merge(sw), P.sheet));
  // two hasps with staples
  for (const z of [-len * 0.3, len * 0.3]) {
    ps.push(part(rb(0.012, 0.075, 0.034, 0.003), P.sheet, { p: [dep + 0.012, ht / 2 - 0.03, z] }));
    ps.push(part(G.torus(0.012, 0.004, 6, 12), P.gun, { p: [dep + 0.02, ht / 2 - 0.07, z], r: [0, 90, 0] }));
  }
  // support brackets to the turret side
  for (const z of [-len * 0.36, len * 0.36]) {
    ps.push(part(G.plate([[0, 0], [dep - 0.02, 0], [0, -0.14]], 0.012, 'xy', 0.003), P.sheet, { p: [0, -ht / 2, z] }));
    ps.push(part(rb(0.012, 0.16, 0.05, 0.003), P.sheet, { p: [0.006, -ht / 2 - 0.05, z] }));
  }
  return group(ps);
}

export function turret(P: Pal): THREE.Group {
  const out: THREE.Object3D[] = [...body(P), ...gunAndMantlet(P)];
  const cup = cupola(P);
  cup.position.set(-0.42, h, -0.34);
  const lh = loaderHatch(P);
  lh.position.set(0.4, h, -0.32);
  const pg = periscope(P);
  pg.position.set(-0.46, h, 0.46);
  const pl = periscope(P);
  pl.position.set(0.3, h, 0.42);
  const bt = bombThrower(P);
  bt.position.set(0.6, h, 0.58);
  const vc = ventCover(P);
  vc.position.set(-0.02, h, 0.12);
  out.push(cup, lh, pg, pl, bt, vc);
  for (const [x, z] of [[0.52, -0.86], [-0.02, -0.86]] as [number, number][]) {
    const a = aerialBase(P);
    a.position.set(x, h, z);
    out.push(a);
  }
  for (const [x, z] of [[0.8, 0.72], [-0.8, 0.72], [0.8, -0.9], [-0.8, -0.9]] as [number, number][]) {
    const e = liftingEye(P);
    e.position.set(x, h, z);
    out.push(e);
  }
  // stowage bins on both turret sides (rear half)
  const binLen = 0.92, binDep = 0.26, binH = 0.4;
  for (const sx of [-1, 1]) {
    const b = sideBin(P, binLen, binDep, binH);
    b.position.set(sx * xW, 0.42, -0.5);
    if (sx < 0) b.scale.x = -1;
    out.push(b);
  }
  return group(out, { name: 'turret' });
}
