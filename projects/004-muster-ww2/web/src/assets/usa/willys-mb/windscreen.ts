/**
 * Willys MB windscreen: outer frame hinged to the cowl, inner glass frame with a centre bar
 * holding two panes of safety glass (580 x 311 mm each), rubber seal along the lower rail,
 * hinge knuckles, two hand-operated wipers on the top rail (arm + blade outside, crank inside),
 * the driver's mirror on the left post, and the side adjusting arms to the cowl clamps.
 * Built in a hinge-local frame (hinge axis = X, frame rising along +Y, glass plane z = 0), then
 * raised (12 deg rake) or folded forward onto the hood rest bumpers.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, merge, xf, box, cylX, cylZ, rrect, latheZ, bentRod } from './util';

type Geo = THREE.BufferGeometry;

const X = D.wsX; // 0.665
const H = 0.42; // frame height
const HOLE = { x: X - 0.035, y0: 0.045, y1: H - 0.03 };

function frameGeo(): { paint: Geo[]; glass: Geo[]; rubber: Geo[]; black: Geo[]; steel: Geo[]; refl: Geo[] } {
  const paint: Geo[] = [];
  const glass: Geo[] = [];
  const rubber: Geo[] = [];
  const black: Geo[] = [];
  const steel: Geo[] = [];
  const refl: Geo[] = [];
  // outer frame (channel section read as two lips + web)
  const outer = rrect(-X, 0, X, H, [0.012, 0.012, 0.024, 0.024], 6);
  const hole = rrect(-HOLE.x, HOLE.y0, HOLE.x, HOLE.y1, [0.008, 0.008, 0.012, 0.012], 4);
  const lip = (d: number, z: number) => {
    const g = G.extrude(G.shape(outer, 0, [hole]), d, 0.0022, 6, 2);
    g.translate(0, 0, z);
    return g;
  };
  paint.push(lip(0.01, 0.009), lip(0.01, -0.009), lip(0.012, 0));
  // inner glass frame + centre bar
  const gOuter = rrect(-HOLE.x + 0.002, HOLE.y0 + 0.002, HOLE.x - 0.002, HOLE.y1 - 0.002, [0.006, 0.006, 0.01, 0.01], 4);
  const panes: V2[][] = [];
  const px0 = 0.015 + 0.016, px1 = HOLE.x - 0.016;
  const py0 = HOLE.y0 + 0.016, py1 = HOLE.y1 - 0.016;
  panes.push(rrect(px0, py0, px1, py1, [0.004, 0.004, 0.004, 0.004], 2));
  panes.push(rrect(-px1, py0, -px0, py1, [0.004, 0.004, 0.004, 0.004], 2));
  const gf = G.extrude(G.shape(gOuter, 0, panes), 0.016, 0.0016, 4, 1);
  paint.push(gf);
  // glass panes seated in the frame
  for (const pn of panes) {
    const g = G.extrude(G.shape(pn.map(([x, y]) => [x * 1.0, y] as V2)), 0.005, 0.0012, 4, 1);
    glass.push(g);
  }
  // rubber seal under the lower rail
  rubber.push(box(2 * X - 0.03, 0.016, 0.026, [0, -0.006, 0], 0.003));
  // hinge knuckles at the lower rail
  for (const s of [1, -1]) {
    paint.push(cylX(0.011, 0.06, [s * 0.47, -0.004, -0.018], 14));
    steel.push(cylX(0.005, 0.075, [s * 0.47, -0.004, -0.018], 8));
  }
  // wipers: pivot through the top rail, crank inside, arm + blade outside on the glass
  for (const s of [1, -1]) {
    const wx = s * 0.33;
    const py = H - 0.02;
    steel.push(cylZ(0.006, 0.05, [wx, py, 0.004], 10));
    black.push(box(0.05, 0.036, 0.026, [wx, py - 0.004, -0.022], 0.006));
    black.push(bentRod([[wx, py - 0.004, -0.036], [wx + s * 0.03, py - 0.004, -0.045], [wx + s * 0.03, py - 0.03, -0.048]], 0.0035, 0.008));
    const tilt = s * 16;
    const aL = 0.2;
    const ax = wx + Math.sin(G.deg(tilt)) * aL, ay = py - Math.cos(G.deg(tilt)) * aL;
    black.push(box(0.009, aL, 0.004, [(wx + ax) / 2, (py + ay) / 2, 0.027], 0.0015, [0, 0, tilt]));
    const bx = ax - Math.sin(G.deg(tilt)) * 0.07, by = ay + Math.cos(G.deg(tilt)) * 0.07;
    black.push(box(0.01, 0.23, 0.005, [bx, by, 0.021], 0.0015, [0, 0, tilt]));
    rubber.push(box(0.005, 0.225, 0.008, [bx, by, 0.0145], 0.0015, [0, 0, tilt]));
  }
  // driver's rear-view mirror clamped to the left post (faces the driver: -Z)
  const my = H * 0.62;
  black.push(box(0.018, 0.034, 0.03, [X + 0.006, my, -0.004], 0.004));
  black.push(bentRod([[X + 0.012, my, -0.01], [X + 0.035, my + 0.008, -0.022], [X + 0.058, my + 0.022, -0.03]], 0.0045, 0.015));
  const head = xf(latheZ([[0, 0], [0.036, 0], [0.039, 0.005], [0.039, 0.011], [0.022, 0.018], [0, 0.019]], 28, 40), [X + 0.064, my + 0.03, -0.034], [0, 0, 0]);
  black.push(head);
  refl.push(xf(G.cyl(0.034, 0.034, 0.002, 28), [X + 0.064, my + 0.03, -0.035], [90, 0, 0]));
  return { paint, glass, rubber, black, steel, refl };
}

export interface WindscreenOpts {
  folded: boolean;
}

/** Hinge point in the asset frame. */
const HINGE = new THREE.Vector3(0, D.cowlY + 0.013, D.zWs);

export function buildWindscreen(o: WindscreenOpts): THREE.Object3D {
  const f = frameGeo();
  // folded: the top rail rests on the hood bumpers, wiper blades just clear of the hood
  const ang = o.folded ? 86 : -D.wsRake;
  const kids: THREE.Object3D[] = [
    part(merge(f.paint), P.body()),
    part(merge(f.glass), P.glass()),
    part(merge(f.rubber), P.rubber()),
    part(merge(f.black), P.black()),
    part(merge(f.steel), P.steel()),
    part(merge(f.refl), P.reflector()),
  ];
  const ws = group(kids, { p: HINGE, r: [ang, 0, 0] });
  const out: THREE.Object3D[] = [ws];
  if (!o.folded) {
    // side adjusting arms from the frame posts down to the clamps on the cowl sides
    ws.updateMatrix();
    const paint: Geo[] = [];
    const steel: Geo[] = [];
    for (const s of [1, -1]) {
      const top = new THREE.Vector3(s * (X + 0.006), 0.12, 0).applyMatrix4(ws.matrix);
      const bot = new THREE.Vector3(s * (D.bodyX + 0.02), D.cowlY - 0.03, D.zWs + 0.02);
      const dir = bot.clone().sub(top);
      const len = dir.length();
      const bar = G.rbox(0.006, len, 0.018, 0.002, 1);
      bar.translate(0, len / 2, 0);
      bar.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
      bar.translate(top.x + s * 0.004, top.y, top.z);
      paint.push(bar);
      // pivot on the post, thumb-screw clamp at the cowl
      steel.push(cylX(0.006, 0.02, [top.x + s * 0.006, top.y, top.z], 10));
      steel.push(cylX(0.014, 0.012, [bot.x + s * 0.012, bot.y, bot.z], 14));
      steel.push(box(0.006, 0.03, 0.006, [bot.x + s * 0.02, bot.y, bot.z], 0.002));
    }
    out.push(part(merge(paint), P.body()), part(merge(steel), P.steel()));
  }
  return group(out);
}
