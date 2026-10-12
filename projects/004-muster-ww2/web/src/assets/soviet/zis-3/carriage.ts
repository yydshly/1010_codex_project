/**
 * Lower carriage of the ZiS-3 (shared with the ZiS-2 design): welded front box carrying the
 * combat pivot, straight I-section axle with cylindrical ends housing the suspension spring
 * columns, crank arms and stub axles, the two road wheels, trail hinge lugs, and the lower
 * hinged shield hanging in front of the axle.
 *
 * Construction frame (see dims.ts): axle on X at z = 0, ground y = 0, +Z muzzle, +X gun's left.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { buildWheel } from './wheel';
import { cylX } from './util';

type V3 = [number, number, number];

export const BOX = { x: 0.3, y0: 0.34, y1: 0.55, z0: -0.3, z1: 0.12 };
/** Pivot (combat pin) top face height; the upper carriage sits on it. */
export const PIVOT_TOP = BOX.y1 + 0.022;

function frontBox(): THREE.Object3D[] {
  const o: THREE.Object3D[] = [];
  const w = BOX.x * 2, h = BOX.y1 - BOX.y0, l = BOX.z1 - BOX.z0;
  const cz = (BOX.z0 + BOX.z1) / 2, cy = (BOX.y0 + BOX.y1) / 2;
  // main box, slightly narrower at the bottom (side plates with a chamfer)
  const side: [number, number][] = [
    [BOX.z0, BOX.y0 + 0.05],
    [BOX.z0 + 0.06, BOX.y0],
    [BOX.z1 - 0.07, BOX.y0],
    [BOX.z1, BOX.y0 + 0.06],
    [BOX.z1, BOX.y1],
    [BOX.z0, BOX.y1],
  ];
  o.push(part(G.plate(side, w - 0.02, 'zy', 0.006), P.paint(), { p: [0, 0, 0] }));
  // top plate (overhangs slightly) and bottom plate
  o.push(part(G.rbox(w, 0.014, l + 0.02, 0.004, 2), P.paint(), { p: [0, BOX.y1 - 0.007, cz] }));
  o.push(part(G.rbox(w - 0.06, 0.012, l - 0.14, 0.004, 2), P.paint(), { p: [0, BOX.y0 + 0.004, cz - 0.005] }));
  // side reinforcing flanges (welded edge strips)
  for (const sx of [1, -1]) {
    o.push(part(G.rbox(0.012, h - 0.03, 0.05, 0.003, 1), P.paint(), { p: [sx * (BOX.x - 0.004), cy + 0.01, BOX.z1 - 0.03] }));
    o.push(part(G.rbox(0.012, h - 0.06, 0.05, 0.003, 1), P.paint(), { p: [sx * (BOX.x - 0.004), cy, BOX.z0 + 0.06] }));
  }
  // pivot ring / bearing race on the top plate
  o.push(part(G.cyl(0.2, 0.205, 0.016, 64), P.cast(), { p: [0, BOX.y1 + 0.008, -0.03] }));
  o.push(part(G.cyl(0.07, 0.075, 0.03, 32), P.cast(), { p: [0, BOX.y1 + 0.012, -0.03] }));
  // bolt ring round the pivot race
  const bolts = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return { p: [Math.cos(a) * 0.215, BOX.y1, -0.03 + Math.sin(a) * 0.215] as V3 };
  });
  o.push(part(G.scatter(G.boltHead(0.018, 0.008), bolts), P.cast()));
  // weld seams along the top edges
  for (const sx of [1, -1]) {
    o.push(part(G.weld([[sx * (BOX.x - 0.012), BOX.y1 - 0.016, BOX.z0 + 0.01], [sx * (BOX.x - 0.012), BOX.y1 - 0.016, BOX.z1 - 0.01]], 0.0035), P.paint()));
  }
  // traverse screw bracket on the rear face (left of centre, the gunner's side)
  o.push(part(G.rbox(0.16, 0.08, 0.05, 0.008, 2), P.cast(), { p: [0.1, BOX.y1 - 0.05, BOX.z0 - 0.02] }));
  o.push(part(G.cyl(0.028, 0.028, 0.14, 20), P.cast(), { p: [0.1, BOX.y1 - 0.05, BOX.z0 - 0.045], r: [0, 0, 90] }));
  return o;
}

function hingeLugs(): THREE.Object3D[] {
  // Trail hinge: upper and lower lug plates projecting rearwards from the box, vertical pin.
  const o: THREE.Object3D[] = [];
  const x = D.hingeX, z = D.hingeZ;
  for (const y of [D.hingeY + 0.085, D.hingeY - 0.085]) {
    const lug: [number, number][] = [
      [x - 0.09, BOX.z0 + 0.04],
      [x + 0.05, BOX.z0 + 0.04],
      [x + 0.075, z],
      [x + 0.05, z - 0.06],
      [x - 0.04, z - 0.07],
      [x - 0.09, z - 0.02],
    ];
    o.push(part(G.plate(lug, 0.022, 'xz', 0.004, 0.01), P.cast(), { p: [0, y, 0] }));
  }
  // pin with heads
  o.push(part(G.cyl(0.024, 0.024, 0.23, 20), P.bright(), { p: [x, D.hingeY, z] }));
  o.push(part(G.cyl(0.034, 0.034, 0.012, 20), P.cast(), { p: [x, D.hingeY + 0.102, z] }));
  o.push(part(G.cyl(0.03, 0.03, 0.01, 6), P.cast(), { p: [x, D.hingeY - 0.1, z] }));
  // gusset under the lower lug
  o.push(part(G.plate([[BOX.z0 + 0.02, 0], [BOX.z0 - 0.07, 0], [BOX.z0 + 0.02, -0.07]], 0.014, 'zy', 0.003), P.paint(), { p: [x - 0.01, D.hingeY - 0.094, 0] }));
  return o;
}

function axleEnd(): THREE.Object3D[] {
  // Left axle end (+X); mirrored for the right.
  const o: THREE.Object3D[] = [];
  const y = D.axleY;
  const x0 = BOX.x - 0.02, x1 = 0.5;
  // I-section beam: two flanges + web
  o.push(part(G.rbox(x1 - x0, 0.012, 0.085, 0.003, 1), P.paint(), { p: [(x0 + x1) / 2, y + 0.055, 0] }));
  o.push(part(G.rbox(x1 - x0, 0.012, 0.085, 0.003, 1), P.paint(), { p: [(x0 + x1) / 2, y - 0.055, 0] }));
  o.push(part(G.rbox(x1 - x0, 0.1, 0.014, 0.002, 1), P.paint(), { p: [(x0 + x1) / 2, y, 0] }));
  // cylindrical end: spring column housing (vertical)
  const cx = 0.53, cz = -0.02;
  o.push(part(G.lathe([[0, -0.14], [0.052, -0.14], [0.056, -0.132], [0.056, 0.13], [0.062, 0.135], [0.062, 0.15], [0.04, 0.156], [0, 0.158]], 32, 35), P.paint(), { p: [cx, y, cz] }));
  // column cap bolts
  o.push(part(G.scatter(G.boltHead(0.014, 0.006), Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return { p: [cx + Math.cos(a) * 0.05, y + 0.15, cz + Math.sin(a) * 0.05] as V3 };
  })), P.paint()));
  // beam-to-column joint collar
  o.push(part(G.rbox(0.05, 0.13, 0.1, 0.01, 2), P.cast(), { p: [x1 - 0.005, y, 0] }));
  // crank arm from the column foot outwards/rearwards to the stub axle
  const armY = y - 0.02;
  o.push(part(G.rbox(0.06, 0.07, 0.19, 0.012, 2), P.cast(), { p: [cx + 0.03, armY - 0.07, cz + 0.02], r: [-18, 0, 0] }));
  // stub axle into the wheel hub
  o.push(part(cylX(0.036, cx + 0.03, D.wheelX - 0.125, 24, 0.003), P.cast(), { p: [0, y, 0] }));
  // hemispherical rubber buffer above the arm
  o.push(part(new THREE.SphereGeometry(0.026, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), P.rubber(), { p: [cx + 0.03, armY - 0.035, cz + 0.07], r: [180, 0, 0] }));
  o.push(part(G.rbox(0.05, 0.012, 0.05, 0.003, 1), P.paint(), { p: [cx + 0.03, armY - 0.029, cz + 0.07] }));
  return o;
}

function lowerShield(): THREE.Object3D[] {
  // Lower hinged shield: 5 mm plate hanging from two hinges on the front of the box.
  const o: THREE.Object3D[] = [];
  const z = BOX.z1 + 0.045;
  const top = 0.565, bot = 0.2, hw = 0.55;
  const outline: [number, number][] = [
    [-hw, bot + 0.06],
    [-hw + 0.08, bot],
    [hw - 0.08, bot],
    [hw, bot + 0.06],
    [hw, top],
    [-hw, top],
  ];
  o.push(part(G.plate(outline, D.shieldT, 'xy', 0.0015), P.paint(), { p: [0, 0, z] }));
  // stiffening angle along the top edge (behind) and bottom lip
  o.push(part(G.rbox(hw * 2 - 0.04, 0.035, 0.005, 0.0015, 1), P.paint(), { p: [0, top - 0.025, z - 0.005] }));
  o.push(part(G.rbox(hw * 2 - 0.04, 0.005, 0.03, 0.0015, 1), P.paint(), { p: [0, top - 0.045, z - 0.019] }));
  o.push(part(G.rbox(hw * 2 - 0.2, 0.005, 0.022, 0.0015, 1), P.paint(), { p: [0, bot + 0.004, z - 0.013] }));
  // hinges: knuckles on the box front
  for (const sx of [1, -1]) {
    const hx = sx * 0.36;
    o.push(part(G.cyl(0.013, 0.013, 0.1, 16), P.paint(), { p: [hx, top - 0.012, z - 0.016], r: [0, 0, 90] }));
    o.push(part(G.rbox(0.03, 0.05, 0.05, 0.004, 1), P.paint(), { p: [hx - sx * 0.065, top - 0.02, z - 0.035] }));
    o.push(part(G.rbox(0.03, 0.05, 0.05, 0.004, 1), P.paint(), { p: [hx + sx * 0.065, top - 0.02, z - 0.035] }));
    o.push(part(G.cyl(0.006, 0.006, 0.17, 10), P.bright(), { p: [hx, top - 0.012, z - 0.016], r: [0, 0, 90] }));
    // hinge leaf bolted to the plate
    o.push(part(G.rbox(0.09, 0.07, 0.006, 0.002, 1), P.paint(), { p: [hx, top - 0.05, z - 0.0055] }));
    o.push(part(G.scatter(G.boltHead(0.014, 0.005), [
      { p: [hx - 0.03, top - 0.07, z + 0.0025], n: [0, 0, 1] },
      { p: [hx + 0.03, top - 0.07, z + 0.0025], n: [0, 0, 1] },
    ]), P.paint()));
    // brackets from the box to the hinge
    o.push(part(G.rbox(0.03, 0.05, z - BOX.z1 - 0.01, 0.004, 1), P.paint(), { p: [hx - sx * 0.065, top - 0.045, (BOX.z1 + z) / 2 - 0.02] }));
    o.push(part(G.rbox(0.03, 0.05, z - BOX.z1 - 0.01, 0.004, 1), P.paint(), { p: [hx + sx * 0.065, top - 0.045, (BOX.z1 + z) / 2 - 0.02] }));
  }
  // bolt row across the front face (stiffener attachment)
  o.push(part(G.scatter(G.boltHead(0.012, 0.004), G.along([-hw + 0.06, top - 0.022, z + 0.0025], [hw - 0.06, top - 0.022, z + 0.0025], 12).map((p) => ({ p, n: [0, 0, 1] as V3 }))), P.paint()));
  return o;
}

export function buildLowerCarriage(detail: 'high' | 'low'): THREE.Group {
  const parts: THREE.Object3D[] = [];
  parts.push(...frontBox());
  parts.push(mirrorX(group(hingeLugs())));
  parts.push(mirrorX(group(axleEnd())));
  parts.push(...lowerShield());
  // wheels (left, and a mirrored right wheel turned to a different rotation)
  const wl = buildWheel({ detail, spin: 28 });
  wl.position.set(D.wheelX, D.axleY, 0);
  parts.push(wl);
  const wr = buildWheel({ detail, spin: -64 });
  wr.position.set(D.wheelX, D.axleY, 0);
  const holder = group([wr]);
  holder.scale.x = -1;
  parts.push(holder);
  return group(parts, { name: 'lower-carriage' });
}
