/**
 * M1943 folding entrenching tool (US Army, 1943-45) and its M1943 carrier.
 *
 * Tool: square-ended steel blade (approx. 152 x 203 mm) with a pressed centre rib, hinged to a
 * one-piece wooden handle (approx. 410 mm) through a steel ferrule and fork; a large locking nut on
 * the ferrule clamps the blade knuckle straight (shovel), at 90 degrees (pick/hoe) or folded back
 * along the handle for carrying. Overall approx. 710 mm extended, 530 mm folded. OD paint.
 * Carrier (1944 pattern): OD cotton duck pouch over the folded blade with bound edges, a top flap with
 * a lift-the-dot fastener, the M1910 wire hanger on the back and three pairs of eyelets to set its
 * height; the handle runs down the back of the pouch and projects below it.
 *
 * TOOL frame (buildM1943Tool): origin on the hinge bolt axis (along X), the handle runs down -Y.
 *   'extended': blade above the hinge along +Y (its plane offset to +Z, hollow face towards -Z);
 *   'folded': blade folded down along the handle on the -Z side, hollow face towards the handle.
 *
 * WORN frame (buildM1943EntrenchingTool -> GearPiece, mount 'belt-left' or 'belt-rear-left'):
 *   carrier hanging from the belt by its M1910 hanger. ORIGIN = midpoint of the two belt eyelets
 *   the hooks go through (hooks at x = +-0.025, y = 0), z = 0 = outer face of the belt; the carrier's
 *   back (handle side) against the body, the blade side outwards (+Z), handle hanging down.
 */
import { THREE, G, part, group, smin } from '../../../core/kit';
import type { SDF } from '../../../core/geo/sdf';
import type { GearPiece } from '../../shared/contracts';
import { US, type WebShade } from './palette';
import { stitches, merge, liftTheDot, m1910Hanger, orientZ, grommet, smoothstep, sheet, boxX } from './parts';
import { projectedBox, drape, drapeEdge, roundedEnd, roundRect2D, snoise, projectTo, normalAt } from './soft';

export const M1943 = {
  bladeW: 0.152,
  bladeL: 0.203,
  /** Blade top edge distance from the hinge axis (along the blade). */
  bladeGap: 0.03,
  /** Blade plane offset from the hinge axis. */
  zB: 0.0275,
  handleL: 0.41,
  handleR: 0.0158,
  ferruleY0: -0.012,
  ferruleY1: -0.088,
  nutR: 0.0235,
};

const HW = M1943.bladeW / 2;
const DISH = 0.0075;
const dish = (x: number) => DISH * (x / HW) ** 2;

/** Blade half width at distance d from the blade top edge (0..L): straight sides, rounded lower corners. */
function bladeHalfW(d: number): number {
  const L = M1943.bladeL, rc = 0.024;
  if (d < L - rc) return HW;
  const k = d - (L - rc);
  return HW - rc + Math.sqrt(Math.max(0, rc * rc - k * k));
}

/**
 * Blade plate in its own frame: top edge (shoulders) at y = 0, tip at y = -L, width along X,
 * concave (hollow) face towards +Z, centre rib pressed out towards -Z (the back).
 */
function bladeGeometry(): THREE.BufferGeometry {
  const L = M1943.bladeL, t = 0.0021;
  const ds: number[] = [];
  for (let i = 0; i <= 20; i++) ds.push(L * (i / 20));
  const NU = 18;
  const rib = (x: number, d: number) => {
    // pressed stiffening rib down the centre, fading out towards the tip
    const across = Math.max(0, 1 - (x / 0.016) ** 2);
    return -0.0032 * Math.sqrt(across) * (1 - smoothstep(0.07, 0.125, d));
  };
  const pos: number[] = [];
  const W = NU + 1;
  for (const side of [1, -1])
    for (const d of ds) {
      const hw = bladeHalfW(d);
      for (let j = 0; j <= NU; j++) {
        const u = -1 + (2 * j) / NU;
        const x = u * hw;
        const edgeThin = 1 - 0.5 * smoothstep(0.85, 1, Math.abs(u)) - 0.4 * smoothstep(L - 0.02, L, d);
        pos.push(x, -d, dish(x) + rib(x, d) + side * (t / 2) * edgeThin);
      }
    }
  const R = ds.length;
  const off = R * W;
  const idx: number[] = [];
  for (let i = 0; i < R - 1; i++)
    for (let j = 0; j < NU; j++) {
      const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
      idx.push(a, c, b, b, c, d);
      idx.push(off + a, off + b, off + c, off + b, off + d, off + c);
    }
  const wall = (ia: number, ib: number) => idx.push(ia, ib, off + ia, ib, off + ib, off + ia);
  for (let i = 0; i < R - 1; i++) {
    wall((i + 1) * W + NU, i * W + NU);
    wall(i * W, (i + 1) * W);
  }
  for (let j = 0; j < NU; j++) {
    wall(j, j + 1);
    wall((R - 1) * W + j + 1, (R - 1) * W + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const ng = G.crease(g, 50);
  G.ensureOutward(ng);
  return ng;
}

export type ToolState = 'extended' | 'folded';

export interface M1943ToolOptions {
  state?: ToolState;
}

/** The tool alone (tool frame, see file header). */
export function buildM1943Tool(o: M1943ToolOptions = {}): THREE.Group {
  const state = o.state ?? 'folded';
  const { zB, bladeGap, handleL, handleR: HR, ferruleY0: F0, ferruleY1: F1, nutR } = M1943;
  const steel = US.odSteel();
  const parts: THREE.Object3D[] = [];
  // --- handle: wood, painted, slight swell, rounded end
  const yEnd = F1 - handleL + 0.06;
  const hp: [number, number][] = [
    [0, yEnd],
    [HR * 0.62, yEnd + 0.0012],
    [HR * 0.9, yEnd + 0.005],
    [HR * 1.02, yEnd + 0.014],
    [HR * 1.04, yEnd + 0.06],
    [HR * 1.0, F1 + 0.05],
    [HR * 0.97, F1 + 0.004],
    [HR * 0.97, F1 + 0.012],
  ];
  parts.push(part(G.lathe(hp, 24, 40), US.handlePaint(), { name: 'handle' }));
  // --- ferrule: steel tube over the handle top, crimp ring, rivet; fork ears at the top
  const fr = G.lathe(
    [
      [HR + 0.0004, F1],
      [HR + 0.0016, F1 + 0.002],
      [HR + 0.0016, F1 + 0.012],
      [HR + 0.0028, F1 + 0.014],
      [HR + 0.0028, F1 + 0.019],
      [HR + 0.0016, F1 + 0.021],
      [HR + 0.0016, F0 - 0.012],
      [HR + 0.0006, F0 - 0.006],
      [0.009, F0],
      [0, F0],
    ],
    28,
    40,
  );
  const ferrule: THREE.BufferGeometry[] = [fr];
  ferrule.push(G.rivetHead(0.0028).rotateX(Math.PI / 2).translate(0, F1 + 0.03, HR + 0.0016));
  ferrule.push(G.rivetHead(0.0028).rotateX(-Math.PI / 2).translate(0, F1 + 0.03, -HR - 0.0016));
  for (const sx of [-1, 1]) {
    const ear = G.extrude(
      [
        [-0.011, -0.004],
        [0.011, -0.004],
        [0.011, 0.001],
        [0.0085, 0.008],
        [0, 0.0115],
        [-0.0085, 0.008],
        [-0.011, 0.001],
      ],
      0.004,
      0.0008,
    );
    ear.rotateY(Math.PI / 2); // plate in the YZ plane
    ear.translate(sx * 0.0085, F0 - 0.0015, 0);
    ferrule.push(ear);
  }
  // hinge bolt with heads
  ferrule.push(G.rod([-0.0125, 0, 0], [0.0125, 0, 0], 0.0034, 12));
  ferrule.push(G.cyl(0.0062, 0.0062, 0.0028, 6).rotateZ(Math.PI / 2).translate(0.0125, 0, 0));
  ferrule.push(G.cyl(0.0058, 0.0058, 0.0024, 16).rotateZ(Math.PI / 2).translate(-0.0122, 0, 0));
  parts.push(part(merge(ferrule), steel, { name: 'ferrule' }));
  // --- locking nut: large, with eight grip lugs
  const nutY = F0 - 0.026;
  const nut: THREE.BufferGeometry[] = [
    G.lathe(
      [
        [HR + 0.0018, nutY - 0.011],
        [nutR - 0.003, nutY - 0.011],
        [nutR - 0.0015, nutY - 0.009],
        [nutR - 0.0015, nutY + 0.009],
        [nutR - 0.003, nutY + 0.011],
        [HR + 0.0018, nutY + 0.011],
      ],
      32,
      40,
    ),
  ];
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const lug = G.rbox(0.005, 0.02, 0.0042, 0.0012, 1);
    lug.translate(0, 0, nutR - 0.0012);
    lug.rotateY(a);
    lug.translate(0, nutY, 0);
    nut.push(lug);
  }
  parts.push(part(merge(nut), steel, { name: 'nut' }));

  // --- blade with its knuckle (tang) and back socket plate, in the extended pose, then folded
  const bladeParts: THREE.Object3D[] = [];
  const blade = bladeGeometry();
  // blade frame -> extended pose: top edge at y = bladeGap, tip at +Y, hollow face towards -Z (the handle side)
  blade.rotateZ(Math.PI); // tip to +Y, x mirrored
  blade.rotateY(Math.PI); // hollow face to -Z, x restored
  blade.translate(0, bladeGap + 0.0005, zB);
  bladeParts.push(part(blade, US.bladePaint(), { name: 'blade' }));
  // knuckle between the fork ears with locking teeth, and the tang to the blade's back
  const kn: THREE.BufferGeometry[] = [];
  const disc = G.cyl(0.0125, 0.0125, 0.0125, 20).rotateZ(Math.PI / 2);
  kn.push(disc);
  for (let k = -2; k <= 2; k++) {
    const a = Math.PI + (k * Math.PI) / 8;
    const tooth = G.rbox(0.0118, 0.004, 0.004, 0.001, 1);
    tooth.translate(0, Math.cos(a) * 0.0125, Math.sin(a) * 0.0125);
    kn.push(tooth);
  }
  const tangPts = [
    new THREE.Vector3(0, 0.004, 0.006),
    new THREE.Vector3(0, 0.014, 0.014),
    new THREE.Vector3(0, 0.024, zB + 0.004),
    new THREE.Vector3(0, bladeGap + 0.004, zB + 0.0042),
    new THREE.Vector3(0, bladeGap + 0.05, zB + 0.0052),
  ];
  kn.push(sheet(tangPts, tangPts.map(() => new THREE.Vector3(0, -0.4, 1)), 0.0105, 0.0055, { across: 3, samples: 24 }));
  // socket plate riveted to the blade back (tapered), with three rivets
  const plate = G.extrude(
    [
      [-0.022, 0],
      [0.022, 0],
      [0.012, 0.075],
      [0, 0.082],
      [-0.012, 0.075],
    ],
    0.0022,
    0.0007,
  );
  plate.translate(0, bladeGap + 0.002, zB + 0.0032 + 0.0011);
  kn.push(plate);
  for (const [x, y] of [[-0.012, 0.012], [0.012, 0.012], [0, 0.06]] as [number, number][])
    kn.push(G.rivetHead(0.0026).rotateX(Math.PI / 2).translate(x, bladeGap + y, zB + 0.0032 + 0.0022));
  bladeParts.push(part(merge(kn), steel, { name: 'knuckle' }));
  const bl = group(bladeParts);
  if (state === 'folded') bl.rotation.x = Math.PI; // fold back over the hinge: blade down along the handle, on -Z
  parts.push(bl);
  const g = group(parts);
  g.name = `us-m1943-tool-${state}`;
  return g;
}

// ---------------------------------------------------------------------------------------------
// Carrier
// ---------------------------------------------------------------------------------------------

/** Carrier outline (tool frame, folded tool): x half width, top / bottom y. */
const CAR = { hw: 0.086, yTop: 0.028, yBot: -0.246, t: 0.0016 };

export interface M1943CarrierOptions {
  shade?: WebShade;
  /** Include the folded tool (default true). */
  tool?: boolean;
  /** Include the M1910 hanger (default true). */
  hanger?: boolean;
}

/**
 * The carrier (with the folded tool) in the TOOL frame: blade side = -Z (outer face), handle / back
 * side = +Z. Returns the group and the hanger hook point (eyelet midpoint for the worn frame).
 */
export function buildM1943Carrier(o: M1943CarrierOptions = {}): { object: THREE.Group; hooks: THREE.Vector3; backZ: number } {
  const shade = o.shade ?? 'od7';
  const canvas = US.canvas(shade), tape = US.tape(shade), thread = US.thread();
  const { zB, handleR: HR } = M1943;
  const { hw, yTop, yBot } = CAR;
  const parts: THREE.Object3D[] = [];
  const yc = (yTop + yBot) / 2, hh = (yTop - yBot) / 2;
  const out2 = roundRect2D(0, yc, hw, hh, { tl: 0.014, tr: 0.014, bl: 0.024, br: 0.024 });
  // thin pouch round the blade (blade plane at z = -zB, dished towards the handle)
  const zPf = -zB - 0.0075, zPb = -zB + 0.0105;
  const pouch: SDF = (x, y, z) => {
    const e = out2(x, y);
    const zc = (zPf + zPb) / 2 + dish(Math.min(Math.abs(x), HW)) * 0.8, hd = (zPb - zPf) / 2;
    const dz = Math.abs(z - zc) - hd;
    const r = 0.005;
    return Math.hypot(Math.max(e + r, 0), Math.max(dz + r, 0)) + Math.min(Math.max(e + r, dz + r), 0) - r;
  };
  // ridge over the handle on the back, and the hinge / nut bulge at the top
  const ridge: SDF = (x, y, z) => {
    const yy = Math.min(Math.max(y, yBot + 0.004), -0.02);
    return Math.hypot(x * 0.8, y - yy, z - 0.002) - (HR + 0.0055);
  };
  const nutB: SDF = (x, y, z) => {
    const yy = Math.min(Math.max(y, -0.05), -0.004);
    return Math.hypot(x * 0.92, y - yy, (z + 0.002) * 1.0) - (M1943.nutR + 0.004);
  };
  const clip = (x: number, y: number) => out2(x, y) + 0.0005;
  const body: SDF = (x, y, z) => {
    const d = smin(smin(pouch(x, y, z), ridge(x, y, z), 0.016), nutB(x, y, z), 0.02);
    return Math.max(d, clip(x, y)) + 0.0006 * snoise(x * 26, y * 20, z * 26, 13) + 0.0003 * snoise(x * 70, y * 60, z * 70, 5);
  };
  const cz = -zB * 0.5 + 0.004;
  parts.push(part(projectedBox(body, { centre: [0, yc, cz], half: [hw, hh, 0.028], n: [18, 26, 8], edge: 0.6 }), canvas, { name: 'carrier' }));
  // bound edge round the sides and bottom (front and back panels sewn together)
  const edge: THREE.Vector3[] = [];
  const zSeam = (zPf + zPb) / 2 + 0.001;
  const addEdge = (x: number, y: number) => edge.push(new THREE.Vector3(x, y, zSeam + dish(Math.min(Math.abs(x), HW)) * 0.8));
  const ins = 0.0012;
  addEdge(-hw + ins, yTop - 0.03);
  for (let i = 0; i <= 8; i++) addEdge(-hw + ins, yTop - 0.03 - ((yTop - 0.03 - (yBot + 0.024)) * i) / 8);
  for (let i = 1; i <= 6; i++) {
    const a = Math.PI + (i / 6) * (Math.PI / 2);
    addEdge(-hw + 0.024 + Math.cos(a) * (0.024 - ins), yBot + 0.024 + Math.sin(a) * (0.024 - ins));
  }
  // bottom edge: sewn either side of the handle opening
  const bottomSeg = (x0: number, x1: number) => {
    for (let i = 0; i <= 4; i++) addEdge(x0 + ((x1 - x0) * i) / 4, yBot + ins);
  };
  bottomSeg(-hw + 0.024, -0.028);
  const edge2: THREE.Vector3[] = [];
  const addEdge2 = (x: number, y: number) => edge2.push(new THREE.Vector3(x, y, zSeam + dish(Math.min(Math.abs(x), HW)) * 0.8));
  for (let i = 0; i <= 4; i++) addEdge2(0.028 + ((hw - 0.024 - 0.028) * i) / 4, yBot + ins);
  for (let i = 1; i <= 6; i++) {
    const a = 1.5 * Math.PI + (i / 6) * (Math.PI / 2);
    addEdge2(hw - 0.024 + Math.cos(a) * (0.024 - ins), yBot + 0.024 + Math.sin(a) * (0.024 - ins));
  }
  for (let i = 1; i <= 8; i++) addEdge2(hw - ins, yBot + 0.024 + ((yTop - 0.03 - (yBot + 0.024)) * i) / 8);
  parts.push(part(G.tube(edge, 0.0026, 4, 60), tape), part(G.tube(edge2, 0.0026, 4, 60), tape));
  // stitch rows inside the binding on the outer (blade) face
  const sp: THREE.Vector3[] = [];
  for (let i = 0; i <= 30; i++) {
    const y = yTop - 0.035 - ((yTop - 0.035 - (yBot + 0.03)) * i) / 30;
    sp.push(projectTo(body, new THREE.Vector3(-hw + 0.007, y, zPf - 0.002), 0.00025));
  }
  const sp2 = sp.map((p) => new THREE.Vector3(-p.x, p.y, p.z));
  parts.push(part(merge([stitches(sp, { len: 0.0032, gap: 0.002, r: 0.0005 }), stitches(sp2, { len: 0.0032, gap: 0.002, r: 0.0005 })]), thread));

  // --- top flap: from the back, over the hinge and nut, down the blade face; lift-the-dot
  const fl = drape(body, {
    path: [
      [yTop - 0.045, 0.028],
      [yTop - 0.012, 0.03],
      [yTop + 0.006, 0.016],
      [yTop + 0.012, -0.004],
      [yTop + 0.006, -zB * 0.8],
      [yTop - 0.012, zPf - 0.002],
      [yTop - 0.045, zPf - 0.004],
      [yTop - 0.078, zPf - 0.004],
    ],
    halfWidth: roundedEnd(hw - 0.004, 0.02),
    gap: 0.0006,
    t: 0.003,
    nu: 12,
    nv: 30,
    lift: (u, s) => 0.0006 * (1 + snoise(u * 2.2, s * 35, 4.1, 17)),
  });
  parts.push(part(fl.geometry, canvas));
  // flap binding (flat tape round the free end and sides)
  const w = hw - 0.004 - 0.001;
  const per = drapeEdge(fl, hw - 0.004, 0.02, fl.sAtY(yTop) * 0.4, -0.0015, 0.001, 8);
  parts.push(part(sheet(per, per.map((q) => normalAt(body, q)), 0.003, 0.0042, { across: 2, samples: 70 }), tape));
  const fs: THREE.Vector3[] = [];
  for (let i = 0; i <= 14; i++) fs.push(fl.at(-(w - 0.0045) + (2 * (w - 0.0045) * i) / 14, fl.L - 0.009, 0.00015));
  parts.push(part(stitches(fs, { len: 0.0032, gap: 0.002, r: 0.0005 }), thread));
  const lp = fl.at(0, fl.L - 0.02, 0.0001);
  parts.push(part(orientZ(liftTheDot(), lp, normalAt(body, lp)), US.blackMetal()));

  // --- back: three pairs of eyelets for the hanger, hanger in the top pair on a web reinforcement
  const zBk = (y: number, x: number) => projectTo(body, new THREE.Vector3(x, y, 0.04), 0).z;
  const eyes: THREE.BufferGeometry[] = [], holes: THREE.BufferGeometry[] = [];
  const eyeYs = [yTop - 0.05, yTop - 0.075, yTop - 0.1];
  const web = US.web(shade);
  // reinforcing web strip sewn on the back, carrying the eyelets
  const stripPts = [yTop - 0.036, yTop - 0.114].map((y) => new THREE.Vector3(0, y, zBk(y, 0) + 0.0012));
  const sN = new THREE.Vector3(0, 0, 1);
  parts.push(part(sheet(stripPts, [sN, sN], 0.032, 0.0022, { across: 4, samples: 12 }), web));
  for (const y of eyeYs)
    for (const sx of [-1, 1]) {
      const p = new THREE.Vector3(sx * 0.02, y, zBk(y, sx * 0.02) + 0.0024);
      const { ring, hole } = grommet(0.0046, 0.0023, 0.0012);
      eyes.push(orientZ(ring, p, sN));
      holes.push(orientZ(hole, p, sN));
    }
  parts.push(part(merge(eyes), US.blackMetal()), part(merge(holes), US.blackMetal()));
  parts.push(part(boxX(new THREE.Vector3(0, yTop - 0.04, zBk(yTop - 0.04, 0) + 0.0024), 0.056, 0.006, sN), thread));
  // M1910 hanger: its U bottom passes through the top pair of eyelets (behind the strip between them)
  const drop = 0.05;
  const zU = zBk(eyeYs[0], 0) + 0.0024 + 0.0021;
  const hooks = new THREE.Vector3(0, eyeYs[0] + drop, zU - 0.0021);
  if (o.hanger !== false) {
    const hg = m1910Hanger({ spacing: 0.05, drop, r: 0.0015 });
    // hooks point towards the body (+Z in this frame): mirror the hanger's z
    hg.scale(1, 1, -1);
    hg.translate(hooks.x, hooks.y, hooks.z + 0.0042);
    parts.push(part(hg, US.wire(), { name: 'hanger' }));
  }
  if (o.tool !== false) parts.push(buildM1943Tool({ state: 'folded' }));
  const object = group(parts);
  object.name = 'us-m1943-carrier';
  const box = new THREE.Box3().setFromObject(object, true);
  return { object, hooks, backZ: box.max.z };
}

/** The carried tool in its carrier, worn frame (see file header). */
export function buildM1943EntrenchingTool(o: M1943CarrierOptions = {}): GearPiece {
  const car = buildM1943Carrier(o);
  // tool frame -> worn frame: turn 180 deg about Y (blade side outwards = +Z), hooks at the origin
  const inner = car.object;
  const holder = group([inner]);
  holder.rotation.y = Math.PI;
  const h = car.hooks.clone();
  // after the rotation the hook point is at (-h.x, h.y, -h.z); the belt face (where the hooks pass
  // through the eyelets) lies 4.2 mm behind it in the tool frame -> z = 0 in the worn frame
  holder.position.set(h.x, -h.y, h.z + 0.0042);
  const object = group([holder]);
  object.name = 'us-m1943-entrenching-tool';
  const b = new THREE.Box3().setFromObject(object, true);
  const size = b.getSize(new THREE.Vector3());
  return {
    id: 'us-m1943-entrenching-tool',
    name: 'M1943 entrenching tool in carrier',
    object,
    mount: 'belt-left',
    size: { w: size.x, h: size.y, d: b.max.z },
  };
}
