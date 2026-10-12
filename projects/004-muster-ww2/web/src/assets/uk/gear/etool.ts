/**
 * Implement, entrenching, Patt. '37 - the Pattern 1908 "Sirhind" tool re-introduced in 1941 under
 * a 1937-pattern designation: a cast-steel head (pointed spade blade one side, narrow pick the
 * other, oval eye in the middle; about 298 mm long, blade 130 mm wide, eye 44 mm deep) and a
 * separate ash helve (about 417 mm, oval 38 x 30 mm, steel ferrule on the thick end) that passes
 * through the eye. The Helve Mk II (modelled) has a steel end cap on the thin end replicating the
 * No. 4 rifle's muzzle, so the spike bayonet can be fixed to use the tool as a mine prodder.
 * Head and helve are carried apart: the head inside the kidney-shaped Carrier, implement,
 * entrenching, Patt. '37 (web bag, press-stud closed, two slightly angled 1-in. chapes with
 * buckles for the brace ends), the helve across its top in a fixed web loop and under the longer
 * securing strap, which buckles on the front of the carrier.
 *
 * Tool-local frames:
 *  - head (buildEtoolHead): eye centre at the origin, helve axis along Y (the helve leaves the eye
 *    towards -Y), blade towards +X, pick towards -X, the blade width along Z.
 *  - helve (buildEtoolHelve): along X, thick (ferrule) end at +X, thin end at x = -HELVE_L.
 *
 * Gear frame (buildEntrenchingTool37, 'carried', default): the carrier worn at the BACK over the
 * buttocks, hanging from the crossed rear brace ends. +Z away from the body (front face with the
 * helve), +Y up, the carrier's back face on z = 0; ORIGIN = midpoint between the top bars of the
 * two buckles; strapAnchors = the two buckle top-bar centres (+X first). +X is the wearer's RIGHT
 * when worn on the back (the gear frame is turned 180 deg), so the ferrule end points to the
 * wearer's right.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import type { SDF } from '../../../core/geo/sdf';
import { UK } from './palette';
import { slab, projectedBox, snoise, sstep, projectTo, normalAt } from './soft';
import { stitches, gateBuckle, pressStud, brassTip, placeOn, merge, polyDist2D, roundedPoly, boxX, frameAt } from './helpers';

export const ETOOL = {
  headLength: 0.297,
  bladeW: 0.13,
  eyeDepth: 0.044,
  helveL: 0.417,
  helveA: 0.019, // half size along the tool length (38 mm)
  helveB: 0.015, // half size across (30 mm)
};

// ---------------------------------------------------------------------------------------------
// Head
// ---------------------------------------------------------------------------------------------

const EYE_A = 0.0235, EYE_B = 0.0202; // outer half axes (X, Z)
const HOLE_A = 0.0192, HOLE_B = 0.0152;
const TILT = (8 * Math.PI) / 180; // blade and pick droop towards the helve side

function ellipsePts(a: number, b: number, n: number, reverse = false): G.V2[] {
  const out: G.V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = ((reverse ? -i : i) / n) * Math.PI * 2;
    out.push([a * Math.cos(t), b * Math.sin(t)]);
  }
  return out;
}

export function buildEtoolHead(): THREE.Group {
  const mat = UK.toolHead();
  const parts: THREE.Object3D[] = [];
  // eye: oval ring, depth along Y
  const eyeShape = G.shape(ellipsePts(EYE_A, EYE_B, 40), 0, [ellipsePts(HOLE_A, HOLE_B, 32, true)]);
  const eye = G.extrude(eyeShape, ETOOL.eyeDepth, 0.0022, 10, 2);
  eye.rotateX(Math.PI / 2); // extrude axis Z -> Y ; outline (x, y) -> (x, -z)
  parts.push(part(eye, mat));
  // blade side: neck + blade plate, drooping by TILT towards -Y
  const bladeGeos: THREE.BufferGeometry[] = [];
  const hw = ETOOL.bladeW / 2;
  const x0 = 0.045, x1 = 0.149, x2 = 0.185;
  const outline: G.V2[] = [
    [x0, -hw + 0.004],
    [x1, -hw],
    [x2, 0],
    [x1, hw],
    [x0, hw - 0.004],
  ];
  const blade = G.plate(outline, 0.0032, 'xz', 0.0012, 0.004);
  bladeGeos.push(blade);
  // neck: tapering bar from the eye to the blade shoulders
  const neck = G.extrude([[EYE_A - 0.004, -0.011], [x0 + 0.004, -0.015], [x0 + 0.004, 0.015], [EYE_A - 0.004, 0.011]], 0.0105, 0.0025, 4, 2);
  neck.rotateX(-Math.PI / 2); // outline y -> z, thickness along Y
  neck.translate(0, 0.0015, 0);
  bladeGeos.push(neck);
  // stiffening swell where the neck runs into the blade
  const swell = G.rbox(0.03, 0.0055, 0.02, 0.0025, 2);
  swell.translate(x0 + 0.008, 0.0016, 0);
  bladeGeos.push(swell);
  const bl = merge(bladeGeos);
  bl.rotateZ(-TILT);
  bl.translate(0, -0.006, 0);
  parts.push(part(bl, mat));
  // pick: tapering bar with a chisel end
  const pl = 0.089;
  const prof: G.V2[] = [
    [-EYE_A + 0.005, -0.0065],
    [-EYE_A - pl + 0.006, -0.0038],
    [-EYE_A - pl, -0.0012],
    [-EYE_A - pl, 0.0012],
    [-EYE_A - pl + 0.012, 0.0036],
    [-EYE_A + 0.005, 0.0068],
  ];
  const pick = G.extrude(prof, 0.022, 0.0016, 4, 2);
  // taper the width towards the tip
  const pa = pick.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) {
    const t = Math.min(1, Math.max(0, (-pa.getX(i) - EYE_A) / pl));
    pa.setZ(i, pa.getZ(i) * (1 - 0.18 * t));
  }
  pick.computeVertexNormals();
  pick.rotateZ(TILT);
  pick.translate(0, -0.006, 0);
  parts.push(part(pick, mat));
  const g = group(parts);
  g.name = 'etool-head';
  return g;
}

// ---------------------------------------------------------------------------------------------
// Helve
// ---------------------------------------------------------------------------------------------

/** Helve along X: ferrule (thick) end at x = 0, thin end at x = -HELVE_L. */
export function buildEtoolHelve(o: { grainAxis?: [number, number, number] } = {}): THREE.Group {
  const L = ETOOL.helveL;
  const wood = UK.helveWood(o.grainAxis ?? [1, 0, 0]);
  // oval lathe along Y, then turned onto X
  // thin end turned down into the steel bayonet adapter (Helve Mk II)
  const prof: G.V2[] = [
    [0, -L + 0.004],
    [0.0104, -L + 0.004],
    [0.0106, -L + 0.022],
    [0.0132, -L + 0.026],
    [0.0148, -L + 0.04],
    [0.0158, -0.2],
    [0.0172, -0.08],
    [0.0178, -0.056],
    [0.0172, -0.0548],
    [0.0172, -0.002],
    [0.016, 0],
    [0, 0],
  ];
  const body = G.lathe(prof, 28, 40);
  body.scale(ETOOL.helveA / 0.0178, 1, ETOOL.helveB / 0.0178);
  // wrist-cord hole near the thin end
  const parts: THREE.Object3D[] = [];
  body.rotateZ(-Math.PI / 2); // +Y -> +X ... lathe y in [-L, 0] -> x in [-L, 0]
  parts.push(part(body, wood, { name: 'helve' }));
  for (const s of [1, -1]) {
    const h = G.cyl(0.0034, 0.0034, 0.0006, 16);
    h.rotateX(Math.PI / 2);
    h.translate(-L + 0.052, 0, s * (ETOOL.helveB * (0.0151 / 0.0178) + 0.0001));
    parts.push(part(h, UK.blackSteel()));
  }
  // Mk II helve: steel end cap replicating the No. 4 rifle's muzzle end, so the spike bayonet
  // can be fixed (mine prodder): a cup over the wood, a short barrel-like stub with the two
  // bayonet lugs and the locking-ring shoulder.
  {
    const adapter = G.lathe(
      [
        [0, -L - 0.034],
        [0.0068, -L - 0.034],
        [0.0086, -L - 0.0332],
        [0.009, -L - 0.031],
        [0.009, -L - 0.004],
        [0.0104, -L - 0.0025],
        [0.0126, -L - 0.0015],
        [0.0128, -L + 0.0005],
        [0.0128, -L + 0.021],
        [0.0118, -L + 0.0235],
        [0.0102, -L + 0.0235],
      ],
      28,
      40,
    );
    adapter.rotateZ(-Math.PI / 2);
    parts.push(part(adapter, UK.ferrule(), { name: 'bayonet-adapter' }));
    const lugs: THREE.BufferGeometry[] = [];
    for (const s of [1, -1]) {
      const lug = G.rbox(0.013, 0.0032, 0.0026, 0.0008, 1);
      lug.translate(-L - 0.016, s * 0.0098, 0);
      lugs.push(lug);
    }
    const muzzle = G.cyl(0.0034, 0.0034, 0.0008, 16);
    muzzle.rotateZ(Math.PI / 2);
    muzzle.translate(-L - 0.0342, 0, 0);
    parts.push(part(G.mergeGeometries(lugs)!, UK.ferrule()), part(muzzle, UK.blackSteel()));
  }
  // steel ferrule with its locking slot
  const fl = 0.055;
  const fr = 0.0182;
  const fer = G.lathe([[fr - 0.0012, -fl], [fr, -fl + 0.001], [fr, -0.0015], [fr - 0.0012, 0], [fr * 0.7, 0.0004], [fr * 0.35, 0.0007], [0, 0.0008]], 32, 40);
  fer.scale(ETOOL.helveA / 0.0178, 1, ETOOL.helveB / 0.0178);
  fer.rotateZ(-Math.PI / 2);
  parts.push(part(fer, UK.ferrule(), { name: 'ferrule' }));
  // the ferrule's U-slot (a dark notch on both flats)
  for (const s of [1, -1]) {
    const slot = G.rbox(0.03, 0.0055, 0.0008, 0.0006, 1);
    slot.translate(-0.042, 0, s * (ETOOL.helveB * (fr / 0.0178) + 0.0001));
    parts.push(part(slot, UK.blackSteel()));
  }
  const g = group(parts);
  g.name = 'etool-helve';
  return g;
}

// ---------------------------------------------------------------------------------------------
// Carrier
// ---------------------------------------------------------------------------------------------

/** Carrier outline (front view, x across, y down from the top edge at y = 0). */
const OUTLINE = roundedPoly(
  [
    [-0.1525, 0, 0.018],
    [0.1525, 0, 0.022],
    [0.1525, -0.105, 0.045],
    [0.118, -0.147, 0.03],
    [-0.02, -0.132, 0.06],
    [-0.1525, -0.094, 0.045],
  ],
  8,
);
const d2 = polyDist2D(OUTLINE);
const BACK = 0.0025; // back face z (the carrier's back panel sits on z = 0..BACK)
/** Head position inside the carrier (eye centre) and helve line on the front. */
const EYE = new THREE.Vector2(-0.018, -0.07);
const HELVE_Y = -0.017;

function carrierFront(x: number, y: number): number {
  // bag depth: thin over the blade and pick, swelling round the head's eye and neck
  const e = Math.hypot((x - EYE.x) / 0.042, (y - EYE.y) / 0.036);
  const eye = 0.027 * Math.exp(-(e ** 2) * 1.2);
  const bladeZone = sstep(0.0, 0.04, x - EYE.x) * Math.exp(-(((y - EYE.y) / 0.055) ** 4));
  const pickZone = sstep(0.0, 0.04, EYE.x - x) * Math.exp(-(((y - EYE.y) / 0.02) ** 2));
  const edge = sstep(0.0, 0.012, -d2(x, y));
  return BACK + (0.009 + 0.006 * bladeZone + 0.007 * pickZone + eye) * edge + 0.0012;
}

function carrierSDF(): SDF {
  const base = slab(d2, 0, carrierFront, 0.0045, 0.0028);
  return (x, y, z) => base(x, y, z) + 0.00035 * snoise(x * 40, y * 40, z * 40, 13);
}

export interface EtoolOptions {
  /** 'carried' (default): head in the carrier, helve in its loops. 'assembled': the tool put together (tool frame). */
  state?: 'carried' | 'assembled';
}

/** The assembled tool in the head frame: helve through the eye, ferrule end just above the head. */
export function buildEtoolAssembled(): THREE.Group {
  const head = buildEtoolHead();
  const helve = buildEtoolHelve({ grainAxis: [0, 1, 0] });
  // helve along -Y from the eye, ferrule end protruding 30 mm above the eye top
  helve.rotation.z = Math.PI / 2; // +X -> +Y
  helve.position.set(0, ETOOL.eyeDepth / 2 + 0.03, 0);
  const g = group([head, helve]);
  g.name = 'etool-assembled';
  return g;
}

export function buildEntrenchingTool37(opts: EtoolOptions = {}): GearPiece {
  if (opts.state === 'assembled') {
    const obj = buildEtoolAssembled();
    return { id: 'uk-entrenching-tool-37', name: 'Implement, entrenching, Patt. 37 (assembled)', object: obj, mount: 'belt-rear', size: { w: ETOOL.headLength, h: ETOOL.helveL, d: ETOOL.bladeW } };
  }
  const web = UK.web(), strapMat = UK.webStrap(), thread = UK.thread(), brass = UK.brass();
  const parts: THREE.Object3D[] = [];
  const f = carrierSDF();
  const body = projectedBox(f, { centre: [0, -0.072, 0.012], half: [0.155, 0.076, 0.03], n: [44, 22, 6], edge: 0.6 });
  parts.push(part(body, web, { name: 'carrier' }));
  const zAt = (x: number, y: number) => projectTo(f, new THREE.Vector3(x, y, carrierFront(x, y)), 0);

  // perimeter stitching on the front and back faces (bound edge)
  const stitchGeos: THREE.BufferGeometry[] = [];
  {
    const ins = 0.0045;
    const loop: THREE.Vector3[] = [];
    const inner = OUTLINE.map(([x, y]) => {
      // move each outline point inwards along the 2D gradient
      const e = 1e-4;
      const gx = d2(x + e, y) - d2(x - e, y), gy = d2(x, y + e) - d2(x, y - e);
      const l = Math.hypot(gx, gy) || 1;
      return [x - (gx / l) * ins, y - (gy / l) * ins] as [number, number];
    });
    for (const [x, y] of inner) loop.push(zAt(x, y).add(new THREE.Vector3(0, 0, 0.00025)));
    stitchGeos.push(stitches(loop, { len: 0.0034, gap: 0.0021, r: 0.0005, closed: true }));
    const back = inner.map(([x, y]) => new THREE.Vector3(x, y, -0.0003));
    stitchGeos.push(stitches(back, { len: 0.0034, gap: 0.0021, r: 0.0005, closed: true }));
  }

  // ---- helve across the front, ferrule end to +X, its 30 mm side against the carrier ----
  const helve = buildEtoolHelve({ grainAxis: [1, 0, 0] });
  const hy = ETOOL.helveB + 0.0012, hzr = ETOOL.helveA + 0.0012; // half sizes along Y and Z
  let zFrontAtHelve = 0;
  for (let x = -0.14; x <= 0.14; x += 0.02) zFrontAtHelve = Math.max(zFrontAtHelve, zAt(x, HELVE_Y).z);
  const hz = zFrontAtHelve + ETOOL.helveA + 0.0026;
  helve.position.set(0.2, HELVE_Y, hz);
  helve.rotation.x = Math.PI / 2; // 38 mm across the depth, 30 mm vertical
  parts.push(helve);

  const webGeos: THREE.BufferGeometry[] = [];
  const buckleGeos: THREE.BufferGeometry[] = [];
  const W1 = 0.025, WT = 0.0022;
  const anchors: THREE.Vector3[] = [];
  /** Points round the front of the helve at x, from angle a0 to a1 (0 = front, +pi/2 = top). */
  const aroundHelve = (x: number, a0: number, a1: number, n: number, pts: THREE.Vector3[], nrm: THREE.Vector3[]) => {
    for (let k = 0; k <= n; k++) {
      const a = a0 + ((a1 - a0) * k) / n;
      pts.push(new THREE.Vector3(x, HELVE_Y + Math.sin(a) * (hy + WT / 2 + 0.0003), hz + Math.cos(a) * (hzr + WT / 2 + 0.0003)));
      nrm.push(new THREE.Vector3(0, Math.sin(a) / hy, Math.cos(a) / hzr).normalize());
    }
  };
  // chapes: doubled web sewn to the back panel, rising 30 mm above the top edge to the buckles
  // (slightly angled outwards, towards the crossed brace ends they are buckled to)
  for (const cx of [-0.102, 0.075]) {
    const lean = new THREE.Matrix4().makeTranslation(cx, -0.004, 0).multiply(new THREE.Matrix4().makeRotationZ(-Math.sign(cx) * 0.2)).multiply(new THREE.Matrix4().makeTranslation(-cx, 0.004, 0));
    const L = (g: THREE.BufferGeometry) => g.applyMatrix4(lean);
    const up = [new THREE.Vector3(cx, -0.03, -WT / 2 - 0.0002), new THREE.Vector3(cx, -0.002, -WT / 2 - 0.0002), new THREE.Vector3(cx, 0.022, -WT / 2 + 0.0006), new THREE.Vector3(cx, 0.03, -WT / 2 + 0.0008)];
    webGeos.push(L(G.strap(up, W1, WT, [0, 0, -1], { samples: 12 })));
    // turn-back over the buckle's lower bar
    webGeos.push(L(G.strap([new THREE.Vector3(cx, 0.031, WT * 0.6), new THREE.Vector3(cx, 0.018, WT * 0.75), new THREE.Vector3(cx, 0.008, WT * 0.55)], W1, WT, [0, 0, 1], { samples: 8 })));
    const bk = gateBuckle(0.031, 0.02);
    bk.rotateZ(Math.PI);
    const bc = new THREE.Vector3(cx, 0.0405, 0.0003);
    buckleGeos.push(L(placeOn(bk, bc, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0))));
    anchors.push(new THREE.Vector3(cx, 0.0405 + 0.0086, 0.0003).applyMatrix4(lean));
    stitchGeos.push(L(boxX(cx, -0.014, 0.019, 0.02, -BACK - WT - 0.0004)));
    stitchGeos.push(L(stitches([new THREE.Vector3(cx - 0.009, 0.012, WT * 1.3), new THREE.Vector3(cx + 0.009, 0.012, WT * 1.3)], { len: 0.003, gap: 0.0018, r: 0.00045 })));
  }
  // fixed helve loop (left): sewn at the top edge and 60 mm down the face, arching over the helve
  {
    const cx = -0.102;
    const yb = -0.062;
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    pts.push(new THREE.Vector3(cx, 0.004, WT * 0.2), new THREE.Vector3(cx, -0.0005, zAt(cx, -0.003).z + WT / 2 + 0.0004));
    nrm.push(new THREE.Vector3(0, 1, 0.3).normalize(), new THREE.Vector3(0, 0.5, 1).normalize());
    aroundHelve(cx, Math.PI / 2 - 0.2, -Math.PI / 2 + 0.25, 10, pts, nrm);
    for (const y of [HELVE_Y - hy - 0.012, yb + 0.006, yb]) {
      const q = zAt(cx, y);
      pts.push(new THREE.Vector3(cx, y, q.z + WT / 2 + 0.0004));
      nrm.push(normalAt(f, q));
    }
    webGeos.push(G.strap(pts, W1, WT, nrm, { samples: 60 }));
    stitchGeos.push(boxX(cx, yb + 0.007, 0.019, 0.011, zAt(cx, yb + 0.007).z + WT + 0.0004));
  }
  // securing strap (right): from the top edge over the helve, down through the buckle
  let tipAt: { p: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3 } | null = null;
  {
    const cx = 0.075;
    const yBuckle = -0.064;
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    pts.push(new THREE.Vector3(cx, 0.004, WT * 0.2), new THREE.Vector3(cx, -0.0005, zAt(cx, -0.003).z + WT / 2 + 0.0004));
    nrm.push(new THREE.Vector3(0, 1, 0.3).normalize(), new THREE.Vector3(0, 0.5, 1).normalize());
    aroundHelve(cx, Math.PI / 2 - 0.2, -Math.PI / 2 + 0.3, 10, pts, nrm);
    for (const y of [HELVE_Y - hy - 0.014, yBuckle + 0.006, yBuckle - 0.006, yBuckle - 0.02, yBuckle - 0.034]) {
      const q = zAt(cx, y);
      const lift = y < yBuckle + 0.008 ? WT + 0.0016 : 0;
      pts.push(new THREE.Vector3(cx, y, q.z + WT / 2 + 0.0004 + lift));
      nrm.push(normalAt(f, q));
    }
    webGeos.push(G.strap(pts, W1, WT, nrm, { samples: 80 }));
    const L = new THREE.CatmullRomCurve3(pts, false, 'centripetal').getLength();
    tipAt = frameAt(pts, nrm, L);
    // buckle on a short tab anchored by a riveted brass plate
    const q0 = zAt(cx, yBuckle - 0.03), q1 = zAt(cx, yBuckle);
    webGeos.push(G.strap([new THREE.Vector3(cx, yBuckle - 0.03, q0.z + WT / 2 + 0.0003), new THREE.Vector3(cx, yBuckle - 0.003, q1.z + WT / 2 + 0.0003)], W1 * 0.9, WT, [0, 0, 1], { samples: 6 }));
    const bk = gateBuckle(0.031, 0.02);
    buckleGeos.push(placeOn(bk, new THREE.Vector3(cx, yBuckle, q1.z + WT * 2 + 0.0012), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)));
    const qp = zAt(cx, yBuckle - 0.022);
    const plate = G.rbox(0.021, 0.012, 0.0009, 0.0004, 1);
    plate.translate(cx, yBuckle - 0.022, qp.z + WT + 0.0009);
    buckleGeos.push(plate);
    buckleGeos.push(G.scatter(G.rivetHead(0.0019), [-0.006, 0.006].map((dx) => ({ p: new THREE.Vector3(cx + dx, yBuckle - 0.022, qp.z + WT + 0.0013), n: new THREE.Vector3(0, 0, 1) }))));
  }
  // brass tip on the securing strap's free end
  if (tipAt) {
    const tip = brassTip(W1, WT, 0.014);
    const m = (g: THREE.BufferGeometry) => placeOn(g, tipAt!.p, tipAt!.n, tipAt!.t);
    buckleGeos.push(m(tip.plate), m(tip.rivets));
  }
  // press studs: top centre and at the right end (closing the mouth)
  for (const [x, y] of [[-0.03, -0.011], [0.138, -0.06]] as [number, number][]) {
    const p = zAt(x, y);
    buckleGeos.push(placeOn(pressStud(0.0048, 0.0022), p, normalAt(f, p), new THREE.Vector3(0, 1, 0)));
  }
  parts.push(part(merge(webGeos), strapMat));
  parts.push(part(merge(stitchGeos), thread));
  parts.push(part(merge(buckleGeos), brass));

  const inner = group(parts);
  const mid = anchors[0].clone().add(anchors[1]).multiplyScalar(0.5);
  inner.position.set(-mid.x, -mid.y, 0);
  const object = group([inner]);
  object.name = 'uk-entrenching-tool-37';
  const size = new THREE.Box3().setFromObject(object, true).getSize(new THREE.Vector3());
  return {
    id: 'uk-entrenching-tool-37',
    name: 'Entrenching tool, Patt. 37, in web carrier',
    object,
    mount: 'belt-rear',
    size: { w: size.x, h: size.y, d: size.z },
    strapAnchors: anchors.map((a) => a.clone().sub(mid)),
  };
}
