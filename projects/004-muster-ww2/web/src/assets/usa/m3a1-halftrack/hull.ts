/**
 * M3A1 armoured body: bolted 1/4 in side, rear and cab plates, floor, cab doors with fold-down
 * upper visor flaps, windscreen with its lowered armour cover (two vision slits and visors), armoured
 * engine hood with the louvred radiator shutter armour, front fenders, headlamps with brush guards,
 * external mine racks with M1A1 mines, side stowage racks with bedrolls, rear door, tail lamps and
 * the restrained white stars.
 */
import { THREE, G, part, group, decal } from '../../../core/kit';
import { D } from './dims';
import type { Pal } from './palette';
import {
  type V2,
  type V3,
  merge,
  xf,
  slab,
  sideSlab,
  frontSlab,
  flatSlab,
  rect,
  spline2,
  band,
  bentRod,
  box,
  cylX,
  cylY,
  latheZ,
} from '../willys-mb/util';

const W = D.W, T = D.t;
const zRP = D.zRearPlate;

type Bins = { paint: THREE.BufferGeometry[]; steel: THREE.BufferGeometry[]; void: THREE.BufferGeometry[]; black: THREE.BufferGeometry[]; glass: THREE.BufferGeometry[]; red: THREE.BufferGeometry[]; reflector: THREE.BufferGeometry[]; mine: THREE.BufferGeometry[]; canvas: THREE.BufferGeometry[]; chassis: THREE.BufferGeometry[] };

const bolt = () => G.boltHead(0.022, 0.009);

function boltRow(b: Bins, a: V3, c: V3, n: number, nrm: V3) {
  b.paint.push(G.scatter(bolt(), G.along(a, c, n).map((p) => ({ p, n: nrm }))));
}

/* ------------------------------------------------------------------ body plates */

function plates(b: Bins) {
  for (const s of [1, -1]) {
    const x = s * (W - T / 2);
    // side plate: one continuous armour line from the cab front to the rear plate
    b.paint.push(sideSlab(rect(zRP, D.bodyBot, D.zCab, D.top), T, x, { bevel: 0.002 }));
    // bolt rows: bottom edge, rear corner, cab front edge and the mid plate joint
    const xo = s * W;
    boltRow(b, [xo, D.bodyBot + 0.035, zRP + 0.08], [xo, D.bodyBot + 0.035, D.zCab - 0.06], 26, [s, 0, 0]);
    boltRow(b, [xo, D.bodyBot + 0.1, zRP + 0.035], [xo, D.top - 0.06, zRP + 0.035], 8, [s, 0, 0]);
    boltRow(b, [xo, 1.12, D.zCab - 0.025], [xo, D.top - 0.06, D.zCab - 0.025], 6, [s, 0, 0]);
    boltRow(b, [xo, 1.02, -1.35], [xo, D.top - 0.07, -1.35], 7, [s, 0, 0]);
    // joint strap over the mid plate joint
    b.paint.push(box(0.006, D.top - D.bodyBot - 0.12, 0.07, [s * (W + 0.003), (D.top + D.bodyBot) / 2 + 0.04, -1.35], 0.002));
  }
  // rear plate with the door opening framed by the door itself
  b.paint.push(frontSlab(rect(-W, D.bodyBot, W, D.top), T, zRP + T / 2, { bevel: 0.002 }));
  boltRow(b, [W - 0.035, D.bodyBot + 0.08, zRP], [W - 0.035, D.top - 0.06, zRP], 8, [0, 0, -1]);
  boltRow(b, [-W + 0.035, D.bodyBot + 0.08, zRP], [-W + 0.035, D.top - 0.06, zRP], 8, [0, 0, -1]);
  // floor
  b.paint.push(flatSlab(rect(-W + T, zRP + T, W - T, D.zCab - T), 0.008, D.floorY - 0.004));
  // floor stiffening ribs in the aisle
  for (const x of [-0.3, 0.3]) b.paint.push(box(0.04, 0.012, 2.6, [x, D.floorY + 0.006, -1.5], 0.004));
  // firewall / cab front plate (below the windscreen)
  b.paint.push(frontSlab(rect(-W, 0.94, W, 1.56), T, D.zCab + T / 2, { bevel: 0.002 }));
  // side cowl plates closing the cab front outside the hood down to the fender
  for (const s of [1, -1]) {
    b.paint.push(box(T, 0.62, 0.05, [s * (W - T / 2), 1.25, D.zCab + 0.02], 0.002));
  }
  // top edge caps (thin rolled strip along the side and rear tops)
  for (const s of [1, -1]) b.paint.push(box(0.022, 0.012, D.zCab - zRP, [s * (W - 0.011), D.top + 0.004, (D.zCab + zRP) / 2], 0.003));
  b.paint.push(box(2 * W, 0.012, 0.022, [0, D.top + 0.004, zRP + 0.011], 0.003));
}

/* ------------------------------------------------------------------ cab doors */

function doors(b: Bins) {
  const z0 = D.zDoorR, z1 = D.zDoorF;
  const flapY = 1.6;
  for (const s of [1, -1]) {
    const x = s * (W + 0.0045);
    // lower door leaf and upper visor flap (hinged at its bottom edge, shown closed)
    b.paint.push(sideSlab(rect(z0, 0.9, z1, flapY - 0.006), 0.008, x, { bevel: 0.002 }));
    b.paint.push(sideSlab(rect(z0 + 0.01, flapY, z1 - 0.01, D.top - 0.02), 0.008, x, { bevel: 0.002 }));
    // flap hinge knuckles along the bottom of the upper flap
    for (const z of [z0 + 0.12, (z0 + z1) / 2, z1 - 0.12]) b.steel.push(G.cyl(0.011, 0.011, 0.1, 10).rotateX(Math.PI / 2).translate(s * (W + 0.012), flapY - 0.003, z));
    // vision slit in the flap with a small hood above it
    b.void.push(box(0.006, 0.022, 0.22, [s * (W + 0.009), 1.78, (z0 + z1) / 2 + 0.06], 0.002));
    b.paint.push(box(0.03, 0.01, 0.3, [s * (W + 0.02), 1.815, (z0 + z1) / 2 + 0.06], 0.003));
    // door hinges at the front edge
    for (const y of [1.05, 1.45]) b.steel.push(cylY(0.014, 0.14, [s * (W + 0.014), y, z1 - 0.01], 10));
    // handle and latch
    b.steel.push(bentRod([[s * (W + 0.009), 1.33, z0 + 0.1], [s * (W + 0.045), 1.33, z0 + 0.13], [s * (W + 0.045), 1.33, z0 + 0.25], [s * (W + 0.009), 1.33, z0 + 0.28]], 0.009, 0.015, 8));
    // bolts round the door leaf
    boltRow(b, [s * (W + 0.0085), 0.94, z0 + 0.04], [s * (W + 0.0085), 0.94, z1 - 0.04], 6, [s, 0, 0]);
    // step below the door
    b.paint.push(box(0.16, 0.012, 0.36, [s * (W - 0.02), 0.8, (z0 + z1) / 2 + 0.05], 0.003));
    b.paint.push(box(0.012, 0.05, 0.3, [s * (W - 0.1), 0.83, (z0 + z1) / 2 + 0.05], 0.003));
  }
}

/* ------------------------------------------------------------------ windscreen */

function windscreen(b: Bins) {
  const z = D.zCab;
  const y0 = 1.56, y1 = 1.95;
  // frame and glass behind the armour cover (visible from inside and above)
  const fz = z - 0.03;
  b.paint.push(box(2 * W - 0.04, 0.03, 0.04, [0, y0 + 0.015, fz], 0.004));
  b.paint.push(box(2 * W - 0.04, 0.03, 0.04, [0, y1 - 0.03, fz], 0.004));
  for (const x of [-W + 0.035, 0, W - 0.035]) b.paint.push(box(0.035, y1 - y0 - 0.03, 0.04, [x, (y0 + y1) / 2 - 0.008, fz], 0.004));
  for (const s of [1, -1]) b.glass.push(box(W - 0.06, y1 - y0 - 0.08, 0.006, [s * (W / 2), (y0 + y1) / 2 - 0.008, fz], 0.001));
  // armour cover (1/2 in), hinged along its top edge, lowered over the glass
  const cz = z + 0.012;
  b.paint.push(frontSlab(rect(-W + 0.01, y0, W - 0.01, y1), 0.013, cz, { bevel: 0.003 }));
  // hinge along the top
  b.steel.push(cylX(0.013, 2 * W - 0.1, [0, y1 + 0.005, cz - 0.004], 12));
  for (const x of [-0.7, -0.25, 0.25, 0.7]) b.paint.push(box(0.1, 0.05, 0.02, [x, y1 - 0.01, cz + 0.012], 0.004));
  // two vision slits with their visors propped slightly open
  for (const s of [1, -1]) {
    const xc = s * 0.47;
    b.void.push(box(0.3, 0.024, 0.006, [xc, 1.79, cz + 0.007], 0.002));
    b.paint.push(box(0.34, 0.012, 0.012, [xc, 1.765, cz + 0.012], 0.003));
    // visor plate hinged above the slit
    const vis = box(0.36, 0.075, 0.01, [0, -0.0375, 0], 0.003);
    xf(vis, [xc, 1.84, cz + 0.013], [-18, 0, 0]);
    b.paint.push(vis);
    b.steel.push(cylX(0.008, 0.36, [xc, 1.84, cz + 0.012], 8));
  }
  // bolts along the lower edge
  boltRow(b, [-W + 0.08, y0 + 0.03, cz + 0.007], [W - 0.08, y0 + 0.03, cz + 0.007], 10, [0, 0, 1]);
  // adjusting arms at the ends
  for (const s of [1, -1]) b.steel.push(G.rod([s * (W - 0.04), y1 - 0.02, cz + 0.01], [s * (W - 0.04), 1.62, z + 0.06], 0.009, 8));
}

/* ------------------------------------------------------------------ hood, radiator armour */

function hood(b: Bins) {
  const zr = D.zRad, zc = D.zCab + T;
  const L = zr - zc;
  const yt = 1.5;
  // top plate (two leaves with a centre hinge) and sloped side plates
  b.paint.push(flatSlab(rect(-D.hoodTopX, zc, D.hoodTopX, zr), T, yt - T / 2, { bevel: 0.002 }));
  b.steel.push(cylZ2(0.01, L - 0.1, [0, yt + 0.004, (zr + zc) / 2]));
  for (const s of [1, -1]) {
    const dx = D.hoodBotX - D.hoodTopX, dy = yt - D.hoodBot;
    const len = Math.hypot(dx, dy);
    b.paint.push(slab(rect(0, 0, L, len), T, [s * D.hoodBotX, D.hoodBot, zr], [0, 0, -1], [-s * dx, dy, 0], { bevel: 0.002 }));
    // hinge along the top edge of each side door
    b.steel.push(cylZ2(0.011, L - 0.12, [s * (D.hoodTopX + 0.004), yt - 0.004, (zr + zc) / 2]));
    // lift handles
    b.steel.push(bentRod([[s * (D.hoodBotX - 0.012), 1.2, zr - 0.35], [s * (D.hoodBotX + 0.02), 1.2, zr - 0.38], [s * (D.hoodBotX + 0.02), 1.2, zr - 0.52], [s * (D.hoodBotX - 0.012), 1.2, zr - 0.55]], 0.008, 0.012, 8));
    // bolt row along the bottom edge
    boltRow(b, [s * (D.hoodBotX - 0.004), D.hoodBot + 0.03, zr - 0.06], [s * (D.hoodBotX - 0.004), D.hoodBot + 0.03, zc + 0.06], 9, [s, 0.2, 0]);
  }
  // hood top bolts and hold-down latches at the front
  for (const s of [1, -1]) b.steel.push(box(0.04, 0.02, 0.07, [s * 0.3, yt + 0.008, zr - 0.06], 0.004));

  // radiator armour: trapezoid plate with a louvred opening
  const y0 = 0.82;
  const out: V2[] = [
    [-D.hoodBotX - 0.02, y0],
    [D.hoodBotX + 0.02, y0],
    [D.hoodBotX, D.hoodBot],
    [D.hoodTopX, yt],
    [-D.hoodTopX, yt],
    [-D.hoodBotX, D.hoodBot],
  ];
  const hole: V2[] = [
    [-0.37, 0.93],
    [-0.37, 1.42],
    [0.37, 1.42],
    [0.37, 0.93],
  ];
  b.paint.push(slab(out, 0.012, [0, 0, zr - 0.006], [1, 0, 0], [0, 1, 0], { holes: [hole], bevel: 0.003 }));
  boltRow(b, [-0.46, 0.87, zr + 0.001], [0.46, 0.87, zr + 0.001], 9, [0, 0, 1]);
  boltRow(b, [-0.41, 1.46, zr + 0.001], [0.41, 1.46, zr + 0.001], 8, [0, 0, 1]);
  // vertical shutter louvres (shown open), radiator core behind
  const nL = 13;
  for (let i = 0; i < nL; i++) {
    const x = -0.37 + (0.74 * (i + 0.5)) / nL;
    const g = box(0.052, 0.49, 0.006, [0, 0, 0], 0.002);
    xf(g, [x, 1.175, zr - 0.02], [0, 35, 0]);
    b.paint.push(g);
  }
  b.paint.push(box(0.012, 0.5, 0.05, [0, 1.175, zr - 0.02], 0.003));
  b.void.push(box(0.74, 0.49, 0.01, [0, 1.175, zr - 0.07], 0.002));
  // radiator core side plates (hidden depth)
  for (const s of [1, -1]) b.paint.push(box(0.012, 0.5, 0.08, [s * 0.375, 1.175, zr - 0.045], 0.003));
  // lower apron under the radiator between the frame horns
  b.paint.push(box(0.9, 0.012, 0.18, [0, y0 + 0.006, zr - 0.08], 0.003));
}

function cylZ2(r: number, len: number, p: V3) {
  const g = G.cyl(r, r, len, 10);
  g.rotateX(Math.PI / 2);
  g.translate(p[0], p[1], p[2]);
  return g;
}

/* ------------------------------------------------------------------ fenders, lamps */

function fenders(b: Bins) {
  const path = spline2(
    [
      [D.zCab + 0.012, 0.93],
      [1.16, 1.05],
      [1.4, D.wingY],
      [2.1, D.wingY],
      [2.27, 1.03],
      [D.zWingF, 0.9],
    ],
    40,
  );
  const w = D.wingX1 - D.wingX0;
  for (const s of [1, -1]) {
    const xc = s * (D.wingX0 + w / 2);
    b.paint.push(sideSlab(band(path, 0.005), w, xc));
    // rolled outer edge bead
    b.paint.push(
      G.tube(
        path.map(([z, y]) => [s * (D.wingX1 - 0.004), y - 0.004, z] as V3),
        0.007,
        6,
        80,
      ),
    );
    // headlamp with its brush guard
    const lx = s * 0.74, lz = 2.03, ly = 1.21;
    b.paint.push(cylY(0.02, 0.1, [lx, D.wingY + 0.05, lz - 0.02], 10));
    b.paint.push(box(0.1, 0.012, 0.1, [lx, D.wingY + 0.006, lz - 0.02], 0.003));
    const shell = latheZ([[0.0, -0.1], [0.05, -0.095], [0.085, -0.06], [0.1, 0.0], [0.1, 0.04], [0.094, 0.05], [0.0, 0.05]], 28, 40);
    shell.translate(lx, ly, lz);
    b.paint.push(shell);
    b.reflector.push(latheZ([[0.0, 0.02], [0.088, 0.045], [0.0, 0.045]], 28, 40).translate(lx, ly, lz));
    b.glass.push(latheZ([[0.0, 0.046], [0.089, 0.046], [0.086, 0.052], [0.05, 0.06], [0.0, 0.062]], 28, 40).translate(lx, ly, lz));
    b.paint.push(G.torus(0.094, 0.008, 6, 28).translate(lx, ly, lz + 0.05));
    // brush guard: three hoops over the lamp front, tied by a cross bar
    const zr0 = lz - 0.12, zf = lz + 0.12, yt = ly + 0.13;
    for (const dx of [-0.085, 0, 0.085]) {
      b.paint.push(
        bentRod(
          [
            [lx + dx, D.wingY + 0.003, zr0],
            [lx + dx, yt, zr0 + 0.02],
            [lx + dx, yt, zf - 0.02],
            [lx + dx, D.wingY + 0.003, zf],
          ],
          0.008,
          0.05,
          8,
        ),
      );
    }
    b.paint.push(G.rod([lx - 0.1, ly, zf - 0.0], [lx + 0.1, ly, zf - 0.0], 0.008, 8));
    b.paint.push(G.rod([lx - 0.1, yt - 0.01, lz], [lx + 0.1, yt - 0.01, lz], 0.008, 8));
    // blackout marker lamp on the fender front
    const mx = s * 0.9;
    b.paint.push(box(0.06, 0.05, 0.05, [mx, D.wingY + 0.03, 2.2], 0.006));
    b.black.push(box(0.04, 0.012, 0.006, [mx, D.wingY + 0.034, 2.226], 0.002));
  }
}

/* ------------------------------------------------------------------ mine racks, stowage racks */

function mineRacks(b: Bins) {
  const n = 12, pitch = 0.212;
  const z0 = -0.14, z1 = z0 - n * pitch;
  const y0 = 0.9;
  for (const s of [1, -1]) {
    const xo = s * W;
    // tray and end plates
    b.paint.push(box(0.125, 0.008, z0 - z1 + 0.02, [s * (W + 0.064), y0, (z0 + z1) / 2], 0.002));
    for (const z of [z0 + 0.01, z1 - 0.01]) b.paint.push(box(0.125, 0.26, 0.008, [s * (W + 0.064), y0 + 0.13, z], 0.002));
    // retaining bars and dividers
    for (const y of [y0 + 0.07, y0 + 0.2]) b.paint.push(G.rod([s * (W + 0.122), y, z0 + 0.01], [s * (W + 0.122), y, z1 - 0.01], 0.008, 8));
    for (let i = 1; i < n; i++) {
      const z = z0 - i * pitch;
      b.paint.push(box(0.1, 0.012, 0.006, [s * (W + 0.055), y0 + 0.012, z], 0.002));
      b.paint.push(G.rod([s * (W + 0.005), y0 + 0.2, z], [s * (W + 0.122), y0 + 0.2, z], 0.005, 6));
    }
    // brackets to the hull side
    for (const z of [z0 - 0.3, (z0 + z1) / 2, z1 + 0.3]) b.paint.push(box(0.012, 0.1, 0.05, [s * (W + 0.006), y0 - 0.04, z], 0.002));
    for (const z of [z0 - 0.3, (z0 + z1) / 2, z1 + 0.3]) b.paint.push(box(0.12, 0.012, 0.04, [s * (W + 0.064), y0 - 0.012, z], 0.002));
    // M1A1 anti-tank mines standing on edge, fuze well facing out
    for (let i = 0; i < n; i++) {
      const z = z0 - (i + 0.5) * pitch;
      const m = G.lathe(
        [
          [0.0, -0.043],
          [0.092, -0.043],
          [0.1, -0.03],
          [0.1, 0.028],
          [0.086, 0.04],
          [0.04, 0.043],
          [0.03, 0.052],
          [0.0, 0.052],
        ],
        24,
        40,
      );
      m.rotateZ((-s * Math.PI) / 2);
      m.translate(xo + s * 0.058, y0 + 0.004 + 0.1, z);
      b.mine.push(m);
      // carrying handle
      b.steel.push(G.torus(0.02, 0.004, 4, 10, Math.PI).rotateY(Math.PI / 2).translate(xo + s * 0.058, y0 + 0.2, z));
    }
  }
}

function stowRacks(b: Bins) {
  const z0 = -1.55, z1 = zRP + 0.12;
  for (const s of [1, -1]) {
    const xb = s * (W + 0.07), xo = s * (W + 0.118);
    b.paint.push(G.rod([xb, 1.5, z0], [xb, 1.5, z1], 0.012, 8));
    b.paint.push(G.rod([xo, 1.66, z0], [xo, 1.66, z1], 0.012, 8));
    for (const z of [z0, (z0 + z1) / 2, z1]) {
      b.paint.push(bentRod([[s * W, 1.5, z], [xb, 1.5, z], [xo, 1.66, z], [s * W, 1.78, z]], 0.011, 0.02, 8));
      b.paint.push(box(0.01, 0.06, 0.05, [s * (W + 0.004), 1.5, z], 0.002));
      b.paint.push(box(0.01, 0.06, 0.05, [s * (W + 0.004), 1.78, z], 0.002));
    }
    // two rolled bedrolls / shelter halves strapped in the rack
    const zs = [(z0 + (z0 + z1) / 2) / 2, ((z0 + z1) / 2 + z1) / 2];
    for (const zc of zs) {
      const len = Math.abs(z1 - z0) / 2 - 0.08;
      const roll = G.cyl(0.066, 0.066, len, 20);
      roll.rotateX(Math.PI / 2);
      // slight irregular squash
      roll.scale(0.95, 1.05, 1);
      roll.translate(s * (W + 0.068), 1.582, zc);
      b.canvas.push(roll);
      for (const dz of [-len * 0.3, len * 0.3]) b.chassis.push(G.torus(0.069, 0.004, 4, 20).translate(s * (W + 0.068), 1.582, zc + dz));
    }
  }
}

/* ------------------------------------------------------------------ rear */

function rear(b: Bins) {
  const z = zRP;
  // rear door (hinged on the left side)
  const x0 = -0.33, x1 = 0.33, y0 = 0.9, y1 = D.top - 0.05;
  b.paint.push(frontSlab(rect(x0, y0, x1, y1), 0.008, z - 0.004, { bevel: 0.002 }));
  for (const y of [1.05, 1.5]) b.steel.push(cylY(0.015, 0.16, [x1 + 0.012, y, z - 0.012], 10));
  b.steel.push(bentRod([[x0 + 0.06, 1.35, z - 0.008], [x0 + 0.06, 1.38, z - 0.045], [x0 + 0.06, 1.5, z - 0.045], [x0 + 0.06, 1.53, z - 0.008]], 0.009, 0.015, 8));
  b.void.push(box(0.2, 0.022, 0.006, [0, 1.62, z - 0.009], 0.002));
  boltRow(b, [x0 + 0.03, y0 + 0.04, z - 0.008], [x1 - 0.03, y0 + 0.04, z - 0.008], 6, [0, 0, -1]);
  // grab handles and tail lamps
  for (const s of [1, -1]) {
    b.steel.push(bentRod([[s * 0.55, D.top - 0.08, z], [s * 0.55, D.top - 0.08, z - 0.05], [s * 0.75, D.top - 0.08, z - 0.05], [s * 0.75, D.top - 0.08, z]], 0.01, 0.015, 8));
    const tx = s * 0.8;
    b.paint.push(box(0.12, 0.12, 0.06, [tx, 1.02, z - 0.03], 0.01));
    b.red.push(box(0.07, 0.035, 0.008, [tx, 1.045, z - 0.062], 0.002));
    b.black.push(box(0.07, 0.03, 0.008, [tx, 0.995, z - 0.062], 0.002));
    // stubby lamp guard
    b.paint.push(bentRod([[tx - 0.08, 0.96, z], [tx - 0.08, 0.96, z - 0.09], [tx + 0.08, 0.96, z - 0.09], [tx + 0.08, 0.96, z]], 0.007, 0.02, 6));
  }
}

/* ------------------------------------------------------------------ markings */

function starDraw(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2 + h * 0.02, R = w * 0.48, r = R * 0.382;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? R : r;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = '#d4d1c2';
  ctx.fill();
  let seed = 9173;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 320; i++) {
    const x = rnd() * w, y = rnd() * h, s = 1 + rnd() * 3.5;
    ctx.fillStyle = rnd() < 0.55 ? 'rgba(76,74,50,0.8)' : 'rgba(140,128,100,0.35)';
    ctx.fillRect(x, y, s, s * (0.5 + rnd()));
  }
  ctx.fillStyle = 'rgba(150,138,110,0.28)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

function stars(): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const d = 0.5;
  out.push(decal('m3a1-star', d, d, starDraw, { p: [0, 1.5 + 0.0025, (D.zRad + D.zCab) / 2 + 0.05], r: [-90, 0, 0] }, 256));
  const ds = 0.42;
  for (const s of [1, -1]) out.push(decal('m3a1-star', ds, ds, starDraw, { p: [s * (W + 0.0025), 1.62, -0.72], r: [0, s * 90, 0] }, 256));
  return out;
}

/* ------------------------------------------------------------------ assembly */

export function hull(P: Pal): THREE.Object3D {
  const b: Bins = { paint: [], steel: [], void: [], black: [], glass: [], red: [], reflector: [], mine: [], canvas: [], chassis: [] };
  plates(b);
  doors(b);
  windscreen(b);
  hood(b);
  fenders(b);
  mineRacks(b);
  stowRacks(b);
  rear(b);
  const kids: THREE.Object3D[] = [];
  const add = (gs: THREE.BufferGeometry[], m: THREE.Material) => {
    if (gs.length) kids.push(part(merge(gs), m));
  };
  add(b.paint, P.paint);
  add(b.steel, P.steel);
  add(b.void, P.void);
  add(b.black, P.black);
  add(b.glass, P.glass);
  add(b.red, P.red);
  add(b.reflector, P.reflector);
  add(b.mine, P.mine);
  add(b.canvas, P.canvas);
  add(b.chassis, P.chassis);
  kids.push(...stars());
  return group(kids);
}
