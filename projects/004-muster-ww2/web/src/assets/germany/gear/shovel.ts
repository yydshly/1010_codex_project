/**
 * Entrenching tool: the straight-handled small shovel (kleines Schanzzeug) in its black
 * pressed-board (Presstoff) carrier, with the S84/98 III bayonet in its steel scabbard and
 * leather frog laid along the handle and bound by the carrier strap.
 *
 * Gear-local frame (left hip): +Z away from the body, +Y up, back of the belt loops on z = 0,
 * origin at the belt centre-line between the two carrier belt loops. The blade is up in the
 * carrier and the handle slants down towards gear +X (mount it with gear +X towards the
 * soldier's rear). The bayonet hilt rises just above the belt.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { P } from './palette';
import { sheet, stitches, frameBuckle, domeHead, placeAlong, roundEnds, planarNormals, lerp } from './util';

type V2 = [number, number];
type V3 = [number, number, number];

/** Flat plate from an XY outline (thickness along Z), light tessellation of the rounded corners. */
function flat(outline: V2[], t: number, bevel: number, corner: number): THREE.BufferGeometry {
  return G.extrude(G.shape(outline, corner), t, bevel, 2, 1);
}

export interface EntrenchingToolOptions {
  /** Include the bayonet, scabbard and frog (default true). */
  bayonet?: boolean;
  /** Handle slant from vertical, degrees (default 30). */
  slantDeg?: number;
  /** Wood grain axis in the FINAL asset's object space (default: along the handle as worn). */
  woodAxis?: [number, number, number];
}

// shovel (tool frame: blade centre at origin, handle along -Y, blade face towards +Z)
const BLADE_W = 0.145;
const BLADE_L = 0.185;
const HANDLE_L = 0.345;
const HANDLE_R = 0.0158;
// carrier
const CAR_M = 0.012; // margin around the blade
const CAR_T = 0.0032; // board thickness
const GAP = 0.0055; // blade pocket
const BLADE_Z = CAR_T + GAP / 2; // blade mid-plane from the carrier back face

/** Blade outline (tool frame, XY): square digging edge up, shoulders tapering to the neck. */
function bladeOutline(): V2[] {
  const w = BLADE_W / 2, t = BLADE_L / 2;
  return [
    [-w, t - 0.004],
    [-w + 0.004, t],
    [w - 0.004, t],
    [w, t - 0.004],
    [w, -t + 0.03],
    [w - 0.012, -t + 0.008],
    [0.03, -t - 0.004],
    [0.017, -t - 0.016],
    [-0.017, -t - 0.016],
    [-0.03, -t - 0.004],
    [-w + 0.012, -t + 0.008],
    [-w, -t + 0.03],
  ];
}
function carrierOutline(): V2[] {
  const w = BLADE_W / 2 + CAR_M, t = BLADE_L / 2 + CAR_M;
  return [
    [-w, t - 0.012],
    [-w + 0.012, t],
    [w - 0.012, t],
    [w, t - 0.012],
    [w, -t + 0.042],
    [w - 0.02, -t + 0.012],
    [0.036, -t - 0.002],
    [0.024, -t - 0.012],
    [-0.024, -t - 0.012],
    [-0.036, -t - 0.002],
    [-w + 0.02, -t + 0.012],
    [-w, -t + 0.042],
  ];
}
function inset(poly: V2[], d: number): V2[] {
  // simple inset for convex-ish outlines: move each vertex towards the centroid-ish along bisector
  const n = poly.length;
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = poly[(i - 1 + n) % n], b = poly[i], c = poly[(i + 1) % n];
    const e1 = new THREE.Vector2(b[0] - a[0], b[1] - a[1]).normalize();
    const e2 = new THREE.Vector2(c[0] - b[0], c[1] - b[1]).normalize();
    const n1 = new THREE.Vector2(-e1.y, e1.x), n2 = new THREE.Vector2(-e2.y, e2.x);
    const bis = n1.clone().add(n2).normalize();
    const k = d / Math.max(0.3, bis.dot(n1));
    out.push([b[0] + bis.x * k, b[1] + bis.y * k]);
  }
  return out;
}

/** The bare shovel in the tool frame (blade face +Z, handle along -Y). */
function buildShovel(woodAxis: V3): THREE.Group {
  const paint = P.blackPaint();
  const wood = P.handleWood(woodAxis);
  const hw = P.hardware();
  const parts: THREE.Object3D[] = [];
  // blade: 2 mm sheet with a slight dish (two layered plates: a thin raised centre panel)
  parts.push(part(flat(bladeOutline(), 0.002, 0.0006, 0.004), paint));
  parts.push(part(flat(inset(bladeOutline().slice(0, 5).concat([[BLADE_W / 2 - 0.02, -BLADE_L / 2 + 0.02], [-BLADE_W / 2 + 0.02, -BLADE_L / 2 + 0.02]]).concat(bladeOutline().slice(11)), 0.014), 0.0012, 0.0005, 0.01), paint, { p: [0, 0, -0.0011] }));
  // socket: tube around the handle end + front/back tangs, riveted
  const y0 = -BLADE_L / 2 - 0.012;
  parts.push(part(G.lathe([[0.0165, y0], [HANDLE_R + 0.0018, y0 - 0.012], [HANDLE_R + 0.0016, y0 - 0.05], [HANDLE_R + 0.0012, y0 - 0.053]], 28, 40), paint, { r: [0, 0, 0] }));
  parts.push(part(G.lathe([[0.0165, y0], [0.0165, y0 - 0.0005]], 28), paint));
  for (const sz of [1, -1]) {
    const tang = sheet(
      [
        [0, y0 - 0.045, sz * (HANDLE_R + 0.0012)],
        [0, y0 - 0.085, sz * (HANDLE_R + 0.0009)],
        [0, y0 - 0.112, sz * (HANDLE_R + 0.0006)],
      ],
      [0, 0, sz],
      roundEnds(0.009, 0, 0.008),
      0.0022,
      { across: 4, samples: 18, bulge: -0.0012 },
    );
    parts.push(part(tang, paint));
    for (const yy of [y0 - 0.064, y0 - 0.098]) parts.push(part(placeAlong(domeHead(0.0034, 0.0017, 12), [0, yy, sz * (HANDLE_R + 0.0021)], [0, 0, sz]), hw));
  }
  // straight wooden handle ending in a ball knob
  const h0 = y0 - 0.01, h1 = y0 - HANDLE_L;
  parts.push(
    part(
      G.lathe(
        [
          [0, h1 - 0.012],
          [0.009, h1 - 0.0105],
          [0.0165, h1 - 0.004],
          [0.0195, h1 + 0.006],
          [0.019, h1 + 0.016],
          [0.0145, h1 + 0.03],
          [HANDLE_R - 0.0012, h1 + 0.045],
          [HANDLE_R, h1 + 0.09],
          [HANDLE_R, h0 - 0.02],
          [HANDLE_R - 0.0006, h0],
          [0, h0],
        ].map(([r, y]) => [r, y] as V2),
        32,
        40,
      ),
      wood,
    ),
  );
  const g = group(parts);
  g.name = 'kleines-schanzzeug';
  return g;
}

/** Carrier in the tool frame: back board at z in [0, CAR_T], front frame over the blade. */
function buildCarrier(): THREE.Group {
  const board = P.presstoff();
  const thread = P.thread();
  const parts: THREE.Object3D[] = [];
  const outl = carrierOutline();
  // back board (extruded along z, 'xy' plane centred on z)
  parts.push(part(flat(outl, CAR_T, 0.0009, 0.003), board, { p: [0, 0, CAR_T / 2] }));
  // spacer rim between the boards
  const rimOuter = outl;
  const rimInner = inset(outl, 0.009);
  const rimShape = G.shape(rimOuter, 0.003, [rimInner.slice().reverse()]);
  parts.push(part(G.extrude(rimShape, GAP, 0.0006, 2, 1), board, { p: [0, 0, CAR_T + GAP / 2] }));
  // front frame with a large window showing the blade
  const win = inset(bladeOutline().slice(0, 5).concat([[BLADE_W / 2 - 0.022, -BLADE_L / 2 + 0.03], [-BLADE_W / 2 + 0.022, -BLADE_L / 2 + 0.03]]).concat(bladeOutline().slice(11)), 0.016);
  const frontShape = G.shape(outl, 0.003, [win.slice().reverse()]);
  parts.push(part(G.extrude(frontShape, CAR_T, 0.0009, 2, 1), board, { p: [0, 0, CAR_T * 1.5 + GAP] }));
  // stitching around the outer edge and around the window
  const zf = CAR_T * 2 + GAP + 0.0002;
  const ring = (poly: V2[]) => {
    const pts: V3[] = poly.map(([x, y]) => [x, y, zf]);
    pts.push(pts[0]);
    return pts;
  };
  parts.push(part(stitches(ring(inset(outl, 0.0045)), [0, 0, 1], 0.006, { w: 0.0011, h: 0.0007 }), thread));
  parts.push(part(stitches(ring(inset(win, -0.0045)), [0, 0, 1], 0.006, { w: 0.0011, h: 0.0007 }), thread));
  const g = group(parts);
  g.name = 'carrier';
  return g;
}

/**
 * S84/98 III bayonet in scabbard, in its own frame: axis along -Y (hilt up at +Y, scabbard tip
 * down), flat sides facing +/-Z, origin at the scabbard throat.
 */
function buildBayonet(): { obj: THREE.Group; scabLen: number; halfW: (s: number) => number; halfT: (s: number) => number } {
  const paint = P.blackPaint();
  const blued = P.blued();
  const grip = P.bakelite();
  const parts: THREE.Object3D[] = [];
  const L = 0.296; // scabbard length
  const halfW = (s: number) => lerp(0.0152, 0.0112, Math.min(1, s / L));
  const halfT = (s: number) => lerp(0.0068, 0.0058, Math.min(1, s / L));
  // scabbard body: lofted flattened ovals along -Y
  const secs: { z: number; ring: V2[] }[] = [];
  const N = 14;
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * (L - 0.018);
    secs.push({ z: s, ring: G.superRing(halfW(s), halfT(s), 28, 2.3) });
  }
  const body = G.loftZ(secs, true);
  // loftZ builds along +Z with ring in XY: map (x,y,z) -> (x, -z, y) so the axis runs down -Y
  const m = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  body.applyMatrix4(m);
  parts.push(part(body, paint));
  // ball drag at the tip
  parts.push(part(new THREE.SphereGeometry(0.0118, 20, 14), paint, { p: [0, -(L - 0.012), 0], s: [1, 1.1, 0.72] }));
  // throat mouthpiece band with screw
  parts.push(part(G.rbox(halfW(0) * 2 + 0.0012, 0.012, halfT(0) * 2 + 0.0012, 0.003, 2), paint, { p: [0, -0.006, 0] }));
  parts.push(part(placeAlong(domeHead(0.0022, 0.0011, 10), [halfW(0) + 0.0006, -0.006, 0], [1, 0, 0]), blued));
  // frog stud on the front face near the throat
  parts.push(part(placeAlong(G.lathe([[0, 0.004], [0.0045, 0.0038], [0.0055, 0.0022], [0.004, 0.0008], [0.0042, 0], [0, 0]], 16), [0, -0.03, halfT(0.03)], [0, 0, 1]), paint));
  // hilt: crossguard, grip scales with grooves, pommel with release button
  parts.push(part(G.rbox(0.034, 0.008, 0.019, 0.0025, 2), blued, { p: [0.002, 0.004, 0] }));
  const gh = 0.098;
  const gripShape: V2[] = [
    [-0.0142, 0.008],
    [0.0142, 0.008],
    [0.0148, 0.02],
    [0.0144, gh - 0.01],
    [0.0132, gh],
    [-0.0132, gh],
    [-0.0144, gh - 0.01],
    [-0.0148, 0.02],
  ];
  // tang (steel core visible as a thin line between the scales)
  parts.push(part(flat(gripShape, 0.0046, 0.0008, 0.002), blued));
  for (const sz of [1, -1]) {
    const scale = flat(gripShape.map(([x, y]) => [x * 0.97, y] as V2), 0.0058, 0.0022, 0.003);
    parts.push(part(scale, grip, { p: [0, 0, sz * (0.0023 + 0.0029)] }));
    // moulded grooves (raised ribs) across the grip
    for (let k = 0; k < 10; k++) {
      const y = 0.022 + k * 0.0068;
      parts.push(part(G.rbox(0.021, 0.0022, 0.0012, 0.0005, 1), grip, { p: [0, y, sz * (0.0023 + 0.0058 + 0.0002)] }));
    }
    // grip screw / bolt heads
    for (const y of [0.028, 0.072]) parts.push(part(placeAlong(domeHead(0.0034, 0.0014, 12), [0, y, sz * (0.0023 + 0.0058)], [0, 0, sz]), blued));
  }
  // pommel with mortise slot and press button
  parts.push(part(G.rbox(0.03, 0.026, 0.0185, 0.0045, 3), blued, { p: [-0.0005, gh + 0.012, 0] }));
  parts.push(part(G.rbox(0.004, 0.02, 0.0072, 0.001, 1), P.blackPaint(), { p: [-0.0145, gh + 0.012, 0] }));
  parts.push(part(placeAlong(G.cyl(0.0034, 0.0034, 0.0022, 14), [0.0149, gh + 0.009, 0], [1, 0, 0]), blued));
  const obj = group(parts);
  obj.name = 's84-98-bayonet';
  return { obj, scabLen: L, halfW, halfT };
}

export function buildEntrenchingTool(opts: EntrenchingToolOptions = {}): GearPiece {
  const withBayonet = opts.bayonet !== false;
  const slant = opts.slantDeg ?? 30;
  const a = (slant * Math.PI) / 180;
  const d = new THREE.Vector3(Math.sin(a), -Math.cos(a), 0); // handle direction in the gear frame
  const woodAxis: V3 = opts.woodAxis ?? [d.x, d.y, 0];
  const leather = P.blackLeather();
  const hw = P.hardware();
  const thread = P.thread();

  // belt loops occupy z in [0, LOOP_T]; the belt passes behind the carrier through them
  const LOOP_T = 0.0026;
  const BELT_T = 0.0045;
  const zBack = LOOP_T + BELT_T; // carrier back face
  const C = new THREE.Vector3(-0.012, -0.05, 0); // blade centre (gear XY)

  const toolParts: THREE.Object3D[] = [];
  toolParts.push(group([buildShovel(woodAxis)], { p: [0, 0, BLADE_Z] }));
  toolParts.push(buildCarrier());
  const carFront = CAR_T * 2 + GAP;

  // carrier strap: riveted to the carrier's lower front, wrapping handle (+ scabbard)
  const hz = BLADE_Z; // handle axis z in the tool frame
  const yStrap = -BLADE_L / 2 - 0.085;
  const bay = withBayonet ? buildBayonet() : null;
  const scabX = -0.03; // scabbard axis offset (beside the handle, towards the soldier's front)
  const scabZ = carFront + 0.0104; // frog sleeve rests on the carrier face
  // loop around the convex hull of the handle circle (and scabbard section)
  const loop: THREE.Vector3[] = [];
  const nrm: THREE.Vector3[] = [];
  const NL = 40;
  for (let i = 0; i < NL; i++) {
    const ph = (i / NL) * Math.PI * 2;
    const dir = new THREE.Vector2(Math.cos(ph), Math.sin(ph)); // (x, z)
    let best = -Infinity, bp = new THREE.Vector2();
    const cand: THREE.Vector2[] = [];
    // handle circle
    cand.push(new THREE.Vector2(0, hz).addScaledVector(dir, HANDLE_R));
    if (bay) {
      const sOff = yStrap; // along the scabbard (tool y); scabbard throat set below
      void sOff;
      const w = 0.0128, t = 0.0063;
      const e = new THREE.Vector2(dir.x * w, dir.y * t);
      const k = Math.sqrt((dir.x * w) ** 2 + (dir.y * t) ** 2) || 1;
      cand.push(new THREE.Vector2(scabX + (e.x * w) / k, scabZ + (e.y * t) / k));
    }
    for (const c of cand) {
      const v = c.dot(dir);
      if (v > best) {
        best = v;
        bp = c;
      }
    }
    const off = 0.0015;
    loop.push(new THREE.Vector3(bp.x + dir.x * off, yStrap, bp.y + dir.y * off));
    nrm.push(new THREE.Vector3(dir.x, 0, dir.y));
  }
  toolParts.push(part(sheet(loop, nrm, 0.0085, 0.0026, { closed: true, across: 3, samples: 72 }), leather));
  // strap root: from the carrier bottom edge down the handle front to the loop
  const rootPts: V3[] = [
    [0.0, -BLADE_L / 2 - 0.002, carFront + 0.0012],
    [0.0, -BLADE_L / 2 - 0.03, hz + HANDLE_R + 0.004],
    [0.0, yStrap + 0.012, hz + HANDLE_R + 0.0028],
    [0.0, yStrap, hz + HANDLE_R + 0.0028],
  ];
  toolParts.push(part(sheet(rootPts, [0, 0, 1], 0.0085, 0.0026, { across: 3, samples: 24 }), leather));
  toolParts.push(part(placeAlong(domeHead(0.0032, 0.0016, 12), [0, -BLADE_L / 2 - 0.0035, carFront + 0.0025], [0, 0, 1]), hw));
  toolParts.push(part(placeAlong(domeHead(0.0032, 0.0016, 12), [0, -BLADE_L / 2 + 0.006, carFront + 0.0002], [0, 0, 1]), hw));
  // buckle on the outside of the loop
  {
    let far = 0;
    for (let i = 0; i < NL; i++) if (loop[i].z > loop[far].z) far = i;
    const p = loop[far];
    const bg = frameBuckle(0.019, 0.013, 0.0012, true);
    // buckle face +Z, prong along -Y: turn so its width runs along the strap (around the loop)
    bg.rotateZ(Math.PI / 2);
    bg.translate(p.x, p.y, p.z + 0.0028);
    toolParts.push(part(bg, hw));
  }

  if (bay) {
    // bayonet: parallel to the handle, throat near the carrier's upper third
    const throatY = 0.03;
    const bObj = group([bay.obj], { p: [scabX, throatY, scabZ] });
    toolParts.push(bObj);
    // frog: leather sleeve around the scabbard below the throat + belt tab + hilt strap
    const fy0 = throatY - 0.004, fy1 = throatY - 0.074;
    const hwS = bay.halfW(0.03) + 0.0022, htS = bay.halfT(0.03) + 0.0022;
    const sleeve: THREE.Vector3[] = [], sn: THREE.Vector3[] = [];
    for (let i = 0; i < 32; i++) {
      const ph = (i / 32) * Math.PI * 2;
      const c = Math.cos(ph), s = Math.sin(ph);
      const x = hwS * Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.4);
      const z = htS * Math.sign(s) * Math.pow(Math.abs(s), 2 / 2.4);
      sleeve.push(new THREE.Vector3(scabX + x, (fy0 + fy1) / 2, scabZ + z));
      sn.push(new THREE.Vector3(c, 0, s).normalize());
    }
    toolParts.push(part(sheet(sleeve, sn, (fy0 - fy1) / 2, 0.0028, { closed: true, across: 4, samples: 26 }), leather));
    // stitched seam down the frog's front edge
    toolParts.push(
      part(
        stitches(
          [
            [scabX - hwS + 0.003, fy0 - 0.004, scabZ + htS + 0.0016],
            [scabX - hwS + 0.003, fy1 + 0.004, scabZ + htS + 0.0016],
          ],
          [0, 0, 1],
          0.005,
          { w: 0.001, h: 0.0006 },
        ),
        thread,
      ),
    );
    // belt tab: from the frog's back, up over the carrier's top edge (to the belt behind)
    const tabPts: V3[] = [
      [scabX, fy0 - 0.02, scabZ - htS - 0.0016],
      [scabX, throatY + 0.01, carFront + 0.0016],
      [scabX, BLADE_L / 2 + CAR_M - 0.004, carFront + 0.0016],
      [scabX, BLADE_L / 2 + CAR_M + 0.0022, carFront * 0.5],
      [scabX, BLADE_L / 2 + CAR_M - 0.003, -0.0016],
    ];
    toolParts.push(part(sheet(tabPts, planarNormals(tabPts, [1, 0, 0], true), 0.021, 0.0028, { across: 4, samples: 26 }), leather));
    // hilt retaining strap: from the frog front, over the grip, fastened with a press stud
    const gy = throatY + 0.03;
    const hs: V3[] = [];
    for (let i = 0; i <= 16; i++) {
      const ph = Math.PI * 0.5 + (i / 16) * Math.PI * 1.75;
      hs.push([scabX + Math.cos(ph) * 0.0185, gy + 0.006 * Math.sin(i / 3), scabZ + Math.sin(ph) * 0.0128]);
    }
    toolParts.push(part(sheet([[scabX, fy0 + 0.002, scabZ + htS + 0.0016], [scabX, gy - 0.006, scabZ + 0.0132], ...hs.slice(0, 3)], [0, 0, 1], 0.007, 0.0024, { across: 3, samples: 20 }), leather));
    const ring: V3[] = [];
    for (let i = 0; i <= 28; i++) {
      const ph = Math.PI * 0.5 - (i / 28) * Math.PI * 2 * 0.92;
      ring.push([scabX + Math.cos(ph) * 0.0182, gy, scabZ + Math.sin(ph) * 0.0128]);
    }
    const ringN = ring.map((p) => new THREE.Vector3(p[0] - scabX, 0, p[2] - scabZ).normalize());
    toolParts.push(part(sheet(ring, ringN, 0.0072, 0.0024, { across: 3, samples: 36 }), leather));
    toolParts.push(part(placeAlong(domeHead(0.0045, 0.0022, 14), [scabX, gy, scabZ + 0.0128 + 0.0014], [0, 0, 1]), hw));
  }

  // place the tool frame: rotate by the slant about Z, move blade centre to C
  const tool = group(toolParts, { r: [0, 0, slant], p: [C.x, C.y, zBack] });
  const parts: THREE.Object3D[] = [tool];

  // belt loops (gear frame, horizontal): sewn/riveted to the carrier back top and bottom
  for (const lx of [-0.047, 0.02]) {
    const pts: V3[] = [
      [lx, 0.034, zBack],
      [lx, 0.029, 0.0013],
      [lx, 0.0, 0.0013],
      [lx, -0.029, 0.0013],
      [lx, -0.034, zBack],
    ];
    parts.push(part(sheet(pts, planarNormals(pts, [1, 0, 0], true), 0.0125, LOOP_T, { across: 3, samples: 30 }), leather));
  }

  const object = group(parts);
  object.name = 'de-entrenching-tool';
  const box = new THREE.Box3().setFromObject(object, true);
  const size = box.getSize(new THREE.Vector3());
  return {
    id: 'de-entrenching-tool',
    name: 'Entrenching tool with bayonet',
    object,
    mount: 'belt-left',
    size: { w: size.x, h: size.y, d: size.z },
    belt: { loopWidth: 0.05 },
  };
}
