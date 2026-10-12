/**
 * Willys MB body: open pressed-steel tub with the deep side cut-outs, rolled top edges, rear
 * wheel openings and wheel housings, rear panel with the combination tail lamps, lifting
 * handles, floor with pressed ribs, toe board and tunnel, cowl with the instrument panel and
 * open glove compartment; flat hood with rolled front edge, rear hinge, side catches and the
 * windscreen rest bumpers; the stamped nine-slot grille with the recessed sealed-beam headlamps
 * and the blackout marker lamps below them; flat front fenders with rolled noses, the blackout
 * driving lamp on the left fender; front bumper with tow hooks; optional hood star.
 */
import { THREE, G, part, group, decal } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import {
  type V2,
  type V3,
  slab,
  sideSlab,
  flatSlab,
  frontSlab,
  rect,
  rrect,
  circle,
  slot,
  spline2,
  pipe,
  bentRod,
  merge,
  mirrored,
  xf,
  box,
  cylX,
  cylZ,
  cylY,
  latheZ,
  arc2,
  offset2,
  band,
  densify2,
} from './util';

type Geo = THREE.BufferGeometry;
const t = D.t;

/* ------------------------------------------------------------------ profiles */

/** Side cut-out edge (z, y) from the cowl back to behind the front seats. */
export function cutout(): V2[] {
  return spline2(
    [
      [D.zDash, D.cowlY],
      [0.487, 0.935],
      [0.462, 0.874],
      [0.42, 0.818],
      [0.355, 0.782],
      [0.26, 0.764],
      [0.08, 0.758],
      [-0.12, 0.76],
      [-0.25, 0.772],
      [-0.335, 0.806],
      [-0.385, 0.858],
      [-0.41, 0.915],
      [-0.42, D.top],
    ],
    80,
  );
}

/** Rear wheel opening angles (circle centred on the rear axle, cut by the tub lower edge). */
const archA0 = Math.asin((D.bodyBot - D.axleY) / D.archR);
const archA1 = Math.PI - archA0;
const zc = D.zRear + D.cornerR; // where the rear corner radius starts

/* ------------------------------------------------------------------ tub */

function tubSide(): Geo {
  const outline: V2[] = [
    [D.zCowl, D.bodyBot],
    [D.zCowl, D.cowlY],
    ...cutout(),
    [zc, D.top],
    [zc, D.bodyBot],
    ...arc2(D.zR, D.axleY, D.archR, archA1, archA0, 36),
  ];
  return sideSlab(outline, t, D.bodyX - t / 2);
}

/** Rear U: both rear corners (plan radius) and the rear panel, one extrusion. */
function tubRear(): Geo {
  const R = D.cornerR;
  const cx = D.bodyX - R, cz = D.zRear + R;
  const outer: V2[] = [...arc2(cx, cz, R, 0, -Math.PI / 2, 8), ...arc2(-cx, cz, R, -Math.PI / 2, -Math.PI, 8)];
  const inner: V2[] = [...arc2(cx, cz, R - t, 0, -Math.PI / 2, 8), ...arc2(-cx, cz, R - t, -Math.PI / 2, -Math.PI, 8)].reverse();
  return flatSlab([...outer, ...inner], D.top - D.bodyBot, (D.top + D.bodyBot) / 2, { bevel: 0.0007 });
}

/** Rolled bead along the whole tub top edge incl. the cut-outs and the rear panel. */
function topBead(): Geo {
  const r = 0.0085;
  const dense = densify2([...cutout(), [zc, D.top]], 0.05);
  const off = offset2(dense, 0.004);
  const xs = D.bodyX - t / 2;
  const left = off.map(([z, y]) => new THREE.Vector3(xs, y, z));
  const R = D.cornerR - t / 2;
  const cx = D.bodyX - D.cornerR, cz = D.zRear + D.cornerR;
  const yb = D.top - 0.004;
  const rear: THREE.Vector3[] = [];
  for (const [x, z] of arc2(cx, cz, R, 0, -Math.PI / 2, 8).slice(1)) rear.push(new THREE.Vector3(x, yb, z));
  const nr = 14;
  for (let k = 1; k < nr; k++) rear.push(new THREE.Vector3(cx - (2 * cx * k) / nr, yb, cz - R));
  for (const [x, z] of arc2(-cx, cz, R, -Math.PI / 2, -Math.PI, 8)) rear.push(new THREE.Vector3(x, yb, z));
  const right = left.map((p) => new THREE.Vector3(-p.x, p.y, p.z)).reverse();
  const pts = [...left, ...rear, ...right.slice(1)];
  const tube = pipe(pts, r, 8);
  const caps = [left[0], right[right.length - 1]].map((p) => {
    const s = new THREE.SphereGeometry(r, 8, 5);
    s.translate(p.x, p.y, p.z);
    return s;
  });
  return merge([tube, ...caps]);
}

/** Rolled lip around the rear wheel opening (left side). */
function archLip(): Geo {
  const pts = arc2(D.zR, D.axleY, D.archR + 0.004, archA1, archA0, 40).map(([z, y]) => new THREE.Vector3(D.bodyX + 0.002, y, z));
  return pipe(pts, 0.0065, 8);
}

/** Rear wheel housing inside the tub (left): inner wall + curved top following the opening. */
function wheelHouse(): Geo[] {
  const xi = 0.505;
  const arcIn = arc2(D.zR, D.axleY, D.archR + t, archA1, archA0, 36);
  const wall = sideSlab([...arcIn], t, xi + t / 2);
  const bandOutline: V2[] = [...arc2(D.zR, D.axleY, D.archR + t, archA1, archA0, 36), ...arc2(D.zR, D.axleY, D.archR, archA0, archA1, 36)];
  const top = sideSlab(bandOutline, D.bodyX - t - xi, (D.bodyX - t + xi) / 2, { bevel: 0.0005 });
  return [wall, top];
}

function tub(): Geo[] {
  const body: Geo[] = [];
  const side = tubSide();
  body.push(side, ...mirrored([side]));
  body.push(tubRear(), topBead());
  const lip = archLip();
  body.push(lip, ...mirrored([lip]));
  const wh = wheelHouse();
  body.push(...wh, ...mirrored(wh));
  // floor, cut around the rear wheel housings
  const xo = D.bodyX - t, xi = 0.505;
  const zwf = D.zR + Math.sqrt(D.archR * D.archR - (D.floorY - D.axleY) ** 2) + 0.004;
  const zwb = D.zR - (zwf - D.zR);
  const zr0 = D.zRear + t;
  body.push(
    flatSlab(
      [
        [-xo, zr0],
        [xo, zr0],
        [xo, zwb],
        [xi, zwb],
        [xi, zwf],
        [xo, zwf],
        [xo, 0.4],
        [-xo, 0.4],
        [-xo, zwf],
        [-xi, zwf],
        [-xi, zwb],
        [-xo, zwb],
      ],
      0.003,
      D.floorY - 0.0015,
    ),
  );
  // floor underside: sills along the lower edge of the sides, interrupted by the wheel openings
  const zaf = D.zR + Math.sqrt(D.archR * D.archR - (D.floorY - 0.018 - D.axleY) ** 2) + 0.01;
  const zab = D.zR - (zaf - D.zR);
  for (const s of [1, -1]) {
    for (const [z0, z1] of [[zaf, D.zCowl - 0.01], [D.zRear + 0.01, zab]]) {
      body.push(box(0.05, 0.03, z1 - z0, [s * (D.bodyX - 0.03), D.floorY - 0.018, (z0 + z1) / 2], 0.004));
    }
  }
  // toe board up to the firewall
  const tbA: V3 = [0, D.floorY - 0.001, 0.395];
  const tbDir = new THREE.Vector3(0, 0.81 - D.floorY, 0.643 - 0.395);
  body.push(slab(rect(-D.bodyX + t, 0, D.bodyX - t, tbDir.length()), 0.003, tbA, [1, 0, 0], [0, tbDir.y, tbDir.z]));
  // firewall above the toe board (forms the cowl front face beside the hood)
  body.push(frontSlab(rect(-D.bodyX + t, 0.8, D.bodyX - t, D.cowlY - t), t, D.zCowl - t / 2));
  // tunnel over the gearbox / transfer case
  const tun = G.rbox(0.38, 0.2, 0.5, 0.06, 3);
  tun.translate(-0.01, D.floorY - 0.1 + 0.098, 0.245);
  body.push(tun);
  // pressed stiffening ribs on the floor (footwells and rear floor)
  const beads: Geo[] = [];
  for (const x of [-0.56, -0.42, -0.28, 0.28, 0.42, 0.56]) beads.push(xf(G.cyl(0.009, 0.009, 0.3, 8, true), [x, D.floorY, 0.2], [90, 0, 0], [1, 1, 0.5]));
  for (const x of [-0.36, -0.2, -0.04, 0.12, 0.28]) beads.push(xf(G.cyl(0.009, 0.009, 0.3, 8, true), [x + 0.04, D.floorY, -0.72], [90, 0, 0], [1, 1, 0.5]));
  body.push(...beads);
  // tub stiffening ridge along the side, below the cut-out (pressed swage)
  return body;
}

/* ------------------------------------------------------------------ cowl, dash */

function cowl(): { paint: Geo[]; steel: Geo[] } {
  const paint: Geo[] = [];
  const steel: Geo[] = [];
  paint.push(flatSlab(rect(-D.bodyX, D.zDash - 0.004, D.bodyX, D.zCowl), t, D.cowlY - t / 2));
  // rolled rear edge of the cowl over the instrument panel
  paint.push(cylX(0.009, 2 * D.bodyX - 0.012, [0, D.cowlY - 0.006, D.zDash - 0.002], 10));
  // instrument panel with the open glove compartment on the right
  const g0 = D.dashBot + 0.02, g1 = D.cowlY - 0.022;
  const glove = rrect(-0.46, g0, -0.2, g1, [0.012, 0.012, 0.012, 0.012], 4);
  paint.push(frontSlab(rect(-D.bodyX + t, D.dashBot, D.bodyX - t, D.cowlY - t), t, D.zDash + t / 2, { holes: [glove.slice().reverse()] }));
  // glove compartment box behind the opening
  paint.push(sideSlab(rect(D.zDash, g0, D.zDash + 0.12, g1), t, -0.46));
  paint.push(sideSlab(rect(D.zDash, g0, D.zDash + 0.12, g1), t, -0.2));
  paint.push(flatSlab(rect(-0.46, D.zDash, -0.2, D.zDash + 0.12), t, g0));
  paint.push(flatSlab(rect(-0.46, D.zDash, -0.2, D.zDash + 0.12), t, g1));
  paint.push(frontSlab(rect(-0.46, g0, -0.2, g1), t, D.zDash + 0.12));
  // rolled lower edge of the panel
  paint.push(cylX(0.007, 2 * D.bodyX - 0.012, [0, D.dashBot, D.zDash + 0.004], 10));
  // windscreen hinge brackets on the cowl top (the frame's knuckles sit on them)
  for (const s of [1, -1]) {
    paint.push(box(0.06, 0.012, 0.05, [s * 0.47, D.cowlY + 0.006, D.zWs], 0.003));
    // windscreen clamp bracket on the cowl side
    paint.push(box(0.012, 0.05, 0.05, [s * (D.bodyX + 0.006), D.cowlY - 0.03, D.zWs + 0.02], 0.003));
    steel.push(cylX(0.006, 0.03, [s * (D.bodyX + 0.014), D.cowlY - 0.03, D.zWs + 0.02], 10));
  }
  // cowl ventilator lid in the centre of the cowl top
  paint.push(box(0.36, 0.008, 0.075, [0, D.cowlY + 0.003, (D.zDash + D.zCowl) / 2 + 0.01], 0.003));
  steel.push(box(0.02, 0.006, 0.02, [0, D.cowlY + 0.009, D.zDash + 0.02], 0.002));
  return { paint, steel };
}

/* ------------------------------------------------------------------ hood */

/** Hood cross-section (x, y): vertical sides, small radius, gently crowned top. */
function hoodSection(hw: number, y0: number, y1: number, n = 12): V2[] {
  const rc = 0.03;
  const pts: V2[] = [[hw, y0]];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push([hw - rc + rc * Math.cos(a), y1 - rc + rc * Math.sin(a)]);
  }
  const m = 10;
  for (let i = 1; i < m; i++) {
    const x = hw - rc - ((2 * (hw - rc)) * i) / m;
    pts.push([x, y1 + 0.005 * (1 - (x / (hw - rc)) ** 2)]);
  }
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (i / n) * (Math.PI / 2);
    pts.push([-hw + rc + rc * Math.cos(a), y1 - rc + rc * Math.sin(a)]);
  }
  pts.push([-hw, y0]);
  return pts;
}

/** Height of the hood top at lateral offset x. */
export function hoodTop(x: number): number {
  const a = Math.min(1, Math.abs(x) / (D.hoodX - 0.03));
  return D.hoodY + 0.005 * (1 - a * a);
}

function hood(): { paint: Geo[]; steel: Geo[]; rubber: Geo[] } {
  const hw = D.hoodX;
  const z0 = D.zCowl + 0.003, z1 = D.zHoodF;
  const len = z1 - z0;
  const outer = hoodSection(hw, D.wingY + 0.002, D.hoodY);
  const inner = hoodSection(hw - t, D.wingY + 0.002, D.hoodY - t).reverse();
  const paint: Geo[] = [frontSlab([...outer, ...inner], len, z0 + len / 2, { bevel: 0.0007 })];
  const steel: Geo[] = [];
  const rubber: Geo[] = [];
  // rolled front edge
  const edge = hoodSection(hw + 0.0015, D.wingY + 0.004, D.hoodY + 0.0015, 14).map(([x, y]) => new THREE.Vector3(x, y, z1 - 0.006));
  paint.push(pipe(edge, 0.006, 8));
  // lower edge beads along the hood sides
  for (const s of [1, -1]) paint.push(cylZ(0.004, len - 0.01, [s * (hw + 0.001), D.wingY + 0.006, z0 + len / 2], 8));
  // hinge along the rear edge on the cowl
  paint.push(cylX(0.0055, 0.72, [0, D.hoodY + 0.004, z0 + 0.012], 10));
  for (let i = 0; i < 7; i++) paint.push(cylX(0.0072, 0.05, [-0.33 + i * 0.11, D.hoodY + 0.004, z0 + 0.012], 12));
  // hood side catches: hook on the hood side, sprung clamp from the fender
  for (const s of [1, -1]) {
    const z = 1.29;
    paint.push(box(0.012, 0.03, 0.04, [s * (hw + 0.006), D.wingY + 0.05, z], 0.003));
    steel.push(bentRod([[s * (hw + 0.035), D.wingY + 0.003, z], [s * (hw + 0.03), D.wingY + 0.05, z], [s * (hw + 0.013), D.wingY + 0.066, z]], 0.004, 0.012));
    steel.push(box(0.03, 0.008, 0.03, [s * (hw + 0.035), D.wingY + 0.004, z], 0.002));
  }
  // windscreen rest bumpers
  for (const s of [1, -1]) {
    rubber.push(cylY(0.018, 0.03, [s * 0.33, hoodTop(0.33) + 0.015, 0.955], 16));
    paint.push(cylY(0.024, 0.004, [s * 0.33, hoodTop(0.33) + 0.002, 0.955], 16));
  }
  return { paint, steel, rubber };
}

/* ------------------------------------------------------------------ grille & lamps */

const HL = { x: 0.335, y: 0.8, r: 0.098 }; // headlamp openings
const BO = { x: 0.335, y: 0.605 }; // blackout marker lamps

function grille(): { paint: Geo[]; black: Geo[] } {
  const z = D.zGrille;
  const hw = D.hoodX;
  const paint: Geo[] = [];
  const black: Geo[] = [];
  const outline = rrect(-hw, 0.462, hw, D.hoodY - 0.002, [0.015, 0.015, 0.035, 0.035], 6);
  const slots: V2[][] = [];
  const pitch = 0.048;
  for (let i = 0; i < 9; i++) slots.push(slot((i - 4) * pitch, 0.525, 0.925, 0.031, 6));
  const lamps = [circle(HL.x, HL.y, HL.r, 40), circle(-HL.x, HL.y, HL.r, 40)];
  const holes = [...slots, ...lamps].map((h) => h.slice().reverse());
  paint.push(frontSlab(outline, 0.003, z, { holes, bevel: 0.0008 }));
  // flange turned back around the outer edge
  const inset = rrect(-hw + 0.004, 0.466, hw - 0.004, D.hoodY - 0.006, [0.012, 0.012, 0.031, 0.031], 6);
  paint.push(frontSlab(outline, 0.03, z - 0.016, { holes: [inset.slice().reverse()], bevel: 0.0006 }));
  // pressed flanges around each slot (turned back 18 mm)
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * pitch;
    const o = slot(x, 0.525, 0.925, 0.031, 6);
    const inn = slot(x, 0.528, 0.922, 0.025, 6);
    paint.push(frontSlab(o, 0.018, z - 0.01, { holes: [inn.slice().reverse()], bevel: 0.0005 }));
  }
  // round collars behind the headlamp openings
  for (const s of [1, -1]) {
    const o = circle(s * HL.x, HL.y, HL.r + 0.003, 40);
    const inn = circle(s * HL.x, HL.y, HL.r, 40);
    paint.push(frontSlab(o, 0.028, z - 0.015, { holes: [inn.slice().reverse()], bevel: 0.0005 }));
  }
  // pressed stiffening rib across the grille below the slots
  paint.push(box(0.46, 0.012, 0.006, [0, 0.498, z + 0.002], 0.003));
  // radiator core behind the slots, with the top tank above
  black.push(box(0.45, 0.43, 0.06, [0, 0.73, z - 0.085], 0.006));
  const fins: Geo[] = [];
  for (let i = 0; i < 26; i++) fins.push(box(0.44, 0.004, 0.008, [0, 0.53 + i * 0.016, z - 0.052], 0.001));
  black.push(...fins);
  paint.push(box(0.47, 0.06, 0.07, [0, 0.96 - 0.03, z - 0.085], 0.01));
  paint.push(box(0.47, 0.05, 0.07, [0, 0.49, z - 0.085], 0.01));
  return { paint, black };
}

/** Sealed-beam headlamp in its bucket, lens just behind the grille face (axis +Z, centre origin). */
function headlamp(): { paint: Geo[]; refl: Geo[]; glass: Geo[]; black: Geo[]; steel: Geo[] } {
  const bucket = latheZ(
    [
      [0, -0.11],
      [0.032, -0.108],
      [0.062, -0.094],
      [0.083, -0.07],
      [0.092, -0.04],
      [0.093, -0.01],
      [0.093, 0.0],
    ],
    40,
    35,
  );
  const door = latheZ(
    [
      [0.083, 0.0],
      [0.095, 0.0],
      [0.096, 0.006],
      [0.093, 0.012],
      [0.085, 0.014],
      [0.082, 0.01],
    ],
    44,
    40,
  );
  const lens = latheZ(
    [
      [0.083, 0.007],
      [0.07, 0.012],
      [0.04, 0.0155],
      [0, 0.0165],
    ],
    40,
    60,
  );
  const refl = latheZ(
    [
      [0.083, 0.004],
      [0.068, -0.016],
      [0.046, -0.046],
      [0.022, -0.068],
      [0, -0.076],
    ],
    36,
    60,
  );
  // lens flutes (sealed-beam prism pattern), very subtle
  const flutes: Geo[] = [];
  for (let i = -2; i <= 2; i++) flutes.push(box(0.0016, 0.12 - Math.abs(i) * 0.016, 0.0012, [i * 0.024, 0, 0.0163 - Math.abs(i) * 0.0008], 0.0005));
  const bulb = new THREE.SphereGeometry(0.011, 10, 8);
  bulb.translate(0, 0, -0.04);
  // hinged support bracket behind (wing nut)
  const steel: Geo[] = [cylX(0.007, 0.05, [0, -0.1, -0.07], 10)];
  return {
    paint: [bucket, door, box(0.03, 0.06, 0.02, [0, -0.09, -0.07], 0.004)],
    refl: [refl],
    glass: [lens, bulb, ...flutes],
    black: [],
    steel,
  };
}

/** Blackout marker ("cat's-eye") lamp on the grille (axis +Z, base on the grille face). */
function markerLamp(): { paint: Geo[]; black: Geo[]; glass: Geo[] } {
  const body = latheZ(
    [
      [0, 0],
      [0.036, 0],
      [0.036, 0.004],
      [0.031, 0.008],
      [0.03, 0.036],
      [0.033, 0.04],
      [0.033, 0.046],
      [0, 0.046],
    ],
    32,
    35,
  );
  // hood over the upper half of the lens
  const hoodPts: V2[] = [...arc2(0, 0, 0.037, 0, Math.PI, 16), ...arc2(0, 0, 0.033, Math.PI, 0, 16)];
  const hoodG = G.extrude(G.shape(hoodPts), 0.022, 0.0008, 4, 1);
  hoodG.translate(0, 0, 0.055);
  // black lens face with the small "cat's-eye" windows
  const face = cylZ(0.027, 0.003, [0, 0, 0.0475], 28);
  const win: Geo[] = [];
  for (const x of [-0.011, 0.011]) {
    win.push(box(0.007, 0.013, 0.003, [x, 0.004, 0.0495], 0.0012));
  }
  const nut = xf(G.boltHead(0.02, 0.008), [0, 0, 0], [-90, 0, 0]);
  return { paint: [body, hoodG, nut], black: [face], glass: win };
}

/** Hooded blackout driving lamp on the left front fender. */
function driveLamp(): { paint: Geo[]; black: Geo[]; glass: Geo[]; steel: Geo[] } {
  const x = 0.62, z = 1.33;
  const yc = D.wingY + 0.11;
  const paint: Geo[] = [];
  const black: Geo[] = [];
  const glass: Geo[] = [];
  const steel: Geo[] = [];
  const bodyG = latheZ(
    [
      [0, -0.085],
      [0.03, -0.083],
      [0.052, -0.07],
      [0.064, -0.045],
      [0.068, -0.01],
      [0.068, 0.012],
      [0.072, 0.014],
      [0.072, 0.022],
      [0.066, 0.024],
    ],
    36,
    35,
  );
  paint.push(xf(bodyG, [x, yc, z]));
  // visor hood over the upper part
  const hp: V2[] = [...arc2(0, 0, 0.075, -0.25, Math.PI + 0.25, 20), ...arc2(0, 0, 0.07, Math.PI + 0.25, -0.25, 20)];
  const hv = G.extrude(G.shape(hp), 0.07, 0.001, 4, 1);
  hv.translate(x, yc, z + 0.055);
  paint.push(hv);
  // painted door with the narrow horizontal light opening in its lower half
  paint.push(cylZ(0.065, 0.004, [x, yc, z + 0.022], 36));
  black.push(box(0.086, 0.018, 0.004, [x, yc - 0.025, z + 0.025], 0.002));
  glass.push(box(0.086, 0.018, 0.003, [x, yc - 0.025, z + 0.0272], 0.0012));
  // pedestal and bracket on the fender
  paint.push(xf(G.cyl(0.016, 0.022, 0.05, 16), [x, D.wingY + 0.025, z - 0.03]));
  paint.push(box(0.07, 0.006, 0.07, [x, D.wingY + 0.003, z - 0.03], 0.002));
  paint.push(box(0.03, 0.04, 0.04, [x, yc - 0.05, z - 0.03], 0.006));
  steel.push(xf(G.boltHead(0.018, 0.008), [x, yc - 0.075, z - 0.03], [0, 0, 0]));
  return { paint, black, glass, steel };
}

/* ------------------------------------------------------------------ fenders */

/** Fender centre-line profile (z, y): flat top from the cowl, rolled nose down in front. */
function wingProfile(): V2[] {
  const r = D.wingNoseR;
  return [
    [D.zCowl, D.wingY],
    [D.wingBendZ, D.wingY],
    ...arc2(D.wingBendZ, D.wingY - r, r, Math.PI / 2, 0, 12).slice(1),
    [D.wingBendZ + r + 0.004, 0.64],
  ];
}

/** Front fender (vehicle's left, +X): top, nose, outer lip, inner splash wall. */
function frontWing(): Geo[] {
  const out: Geo[] = [];
  const prof = densify2(wingProfile(), 0.04);
  const W = D.wingX - D.hoodX;
  out.push(sideSlab(band(prof, t), W, D.hoodX + W / 2, { bevel: 0.0006 }));
  // outer lip (turned down / back along the whole outer edge)
  const lip = band(prof, 0.034);
  out.push(sideSlab(lip, t, D.wingX - t / 2));
  // rolled bead on the lip edge
  const beadPts = offset2(prof, -0.034).map(([z, y]) => new THREE.Vector3(D.wingX - 0.001, y, z));
  out.push(pipe(beadPts, 0.0045, 6));
  // inner splash wall between engine bay and wheel well
  out.push(sideSlab(rect(D.zCowl, D.frameTop, D.zGrille - 0.012, D.wingY - t), t, D.hoodX - t / 2));
  // bolts along the fender-to-splash seam
  const bolts: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 5; i++) bolts.push({ p: [D.hoodX + 0.018, D.wingY, 0.76 + i * 0.16], n: [0, 1, 0] });
  out.push(G.scatter(G.boltHead(0.012, 0.004), bolts));
  // brace from the fender nose to the grille side
  out.push(box(0.012, 0.1, 0.035, [D.hoodX + 0.008, 0.68, D.zGrille - 0.02], 0.003));
  return out;
}

/* ------------------------------------------------------------------ bumper */

function bumper(): Geo[] {
  const z = D.zFront;
  const y0 = 0.44, y1 = 0.555, d = 0.062, th = 0.006;
  const prof: V2[] = [
    [z, y0],
    [z, y1],
    [z - d, y1],
    [z - d, y1 - th],
    [z - th, y1 - th],
    [z - th, y0 + th],
    [z - d, y0 + th],
    [z - d, y0],
  ];
  const out: Geo[] = [slab(prof, 1.46, [0, 0, 0], [0, 0, 1], [0, 1, 0], { bevel: 0.002 })];
  // end caps
  for (const s of [1, -1]) out.push(box(0.006, y1 - y0, d, [s * 0.727, (y0 + y1) / 2, z - d / 2], 0.002));
  // bolts to the frame horns
  const bolts: { p: V3; n: V3 }[] = [];
  for (const s of [1, -1]) for (const yy of [0.47, 0.525]) bolts.push({ p: [s * (D.frameX + 0.01), yy, z], n: [0, 0, 1] });
  out.push(G.scatter(G.boltHead(0.02, 0.009), bolts));
  // brackets from the frame ends to the bumper
  for (const s of [1, -1]) out.push(box(0.07, 0.1, z - d - D.zFrameF + 0.004, [s * D.frameX, 0.55, (z - d + D.zFrameF) / 2], 0.003));
  // tow hooks on the bumper face, open upwards
  for (const s of [1, -1]) {
    const x = s * 0.3;
    out.push(box(0.05, 0.072, 0.014, [x, 0.498, z + 0.007], 0.004));
    out.push(bentRod([[x, 0.476, z + 0.01], [x, 0.474, z + 0.026], [x, 0.5, z + 0.04], [x, 0.542, z + 0.037], [x, 0.568, z + 0.022]], 0.011, 0.018, 10));
    for (const yy of [0.472, 0.524]) out.push(xf(G.boltHead(0.015, 0.006), [x, yy, z + 0.014], [90, 0, 0]));
  }
  return out;
}

/* ------------------------------------------------------------------ rear fittings */

/** Combination tail lamp (service lamp above, blackout lamp below) on the rear panel. */
function tailLamp(x: number, stop: boolean): { paint: Geo[]; red: Geo[]; black: Geo[] } {
  const y = 0.64, z = D.zRear;
  const paint: Geo[] = [box(0.085, 0.16, 0.045, [x, y, z - 0.0225], 0.012), box(0.1, 0.18, 0.006, [x, y, z - 0.003], 0.004)];
  const red: Geo[] = [];
  const black: Geo[] = [];
  // upper: service tail + stop lamp (round lens in a bezel)
  paint.push(xf(latheZ([[0.028, 0], [0.035, 0], [0.036, 0.005], [0.032, 0.008], [0.029, 0.006]], 28, 40), [x, y + 0.037, z - 0.045], [0, 180, 0]));
  red.push(xf(latheZ([[0, 0], [0.029, 0], [0.028, 0.004], [0.02, 0.008], [0, 0.009]], 28, 50), [x, y + 0.037, z - 0.046], [0, 180, 0]));
  // lower: blackout tail (and stop on the right) behind a masked lens
  paint.push(xf(latheZ([[0.021, 0], [0.028, 0], [0.029, 0.005], [0.025, 0.008], [0.022, 0.006]], 24, 40), [x, y - 0.04, z - 0.045], [0, 180, 0]));
  black.push(cylZ(0.022, 0.003, [x, y - 0.04, z - 0.0465], 24));
  red.push(box(0.012, 0.008, 0.003, [x - 0.008, y - 0.036, z - 0.0485], 0.001));
  red.push(box(0.012, 0.008, 0.003, [x + 0.008, y - 0.036, z - 0.0485], 0.001));
  if (stop) red.push(box(0.03, 0.004, 0.003, [x, y - 0.05, z - 0.0485], 0.001));
  return { paint, red, black };
}

function rearFittings(): { paint: Geo[]; red: Geo[]; black: Geo[]; steel: Geo[] } {
  const paint: Geo[] = [];
  const red: Geo[] = [];
  const black: Geo[] = [];
  const steel: Geo[] = [];
  for (const [x, stop] of [[0.635, false], [-0.635, true]] as [number, boolean][]) {
    const tl = tailLamp(x, stop);
    paint.push(...tl.paint);
    red.push(...tl.red);
    black.push(...tl.black);
  }
  // lifting handles on the tub sides near the rear corners
  for (const s of [1, -1]) {
    const x = s * D.bodyX;
    steel.push(bentRod([[x, 0.82, -1.24], [x + s * 0.034, 0.82, -1.26], [x + s * 0.034, 0.82, -1.38], [x, 0.82, -1.4]], 0.0085, 0.016));
    for (const z of [-1.24, -1.4]) paint.push(box(0.006, 0.034, 0.03, [x + s * 0.003, 0.82, z], 0.002));
  }
  // grab handles on the rear panel above the tail lamps
  return { paint, red, black, steel };
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
  // moderate weathering: chips and a dusty film
  let seed = 4127;
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

function hoodStar(): THREE.Object3D {
  const d = 0.44;
  return decal('willys-hood-star', d, d, starDraw, { p: [0, hoodTop(0) + 0.0022, 1.15], r: [-90, 0, 0] }, 256);
}

/* ------------------------------------------------------------------ assembly */

export interface BodyOpts {
  star: boolean;
}

export function buildBody(o: BodyOpts): THREE.Object3D {
  const paint: Geo[] = [...tub()];
  const chassis: Geo[] = [...bumper()];
  const black: Geo[] = [];
  const steel: Geo[] = [];
  const glass: Geo[] = [];
  const refl: Geo[] = [];
  const red: Geo[] = [];
  const rubber: Geo[] = [];

  const cw = cowl();
  paint.push(...cw.paint);
  steel.push(...cw.steel);
  const hd = hood();
  paint.push(...hd.paint);
  steel.push(...hd.steel);
  rubber.push(...hd.rubber);
  const gr = grille();
  paint.push(...gr.paint);
  black.push(...gr.black);
  for (const s of [1, -1]) {
    const hl = headlamp();
    const put = (g: Geo) => xf(g, [s * HL.x, HL.y, D.zGrille - 0.03]);
    paint.push(...hl.paint.map(put));
    refl.push(...hl.refl.map(put));
    glass.push(...hl.glass.map(put));
    steel.push(...hl.steel.map(put));
    const bo = markerLamp();
    const putB = (g: Geo) => xf(g, [s * BO.x, BO.y, D.zGrille + 0.0015]);
    paint.push(...bo.paint.map(putB));
    black.push(...bo.black.map(putB));
    glass.push(...bo.glass.map(putB));
  }
  const wing = frontWing();
  paint.push(...wing, ...mirrored(wing));
  const dl = driveLamp();
  paint.push(...dl.paint);
  black.push(...dl.black);
  glass.push(...dl.glass);
  steel.push(...dl.steel);
  const rf = rearFittings();
  paint.push(...rf.paint);
  red.push(...rf.red);
  black.push(...rf.black);
  steel.push(...rf.steel);

  const kids: THREE.Object3D[] = [
    part(merge(paint), P.body()),
    part(merge(chassis), P.chassis()),
    part(merge(black), P.black()),
    part(merge(steel), P.steel()),
    part(merge(glass), P.glass()),
    part(merge(refl), P.reflector()),
    part(merge(red), P.redLens()),
    part(merge(rubber), P.rubber()),
  ];
  if (o.star) kids.push(hoodStar());
  return group(kids);
}

