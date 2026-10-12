/**
 * Carried items that are not simple belt pouches:
 *  - breadBag():  M31 bread bag (Brotbeutel), canvas with a full front flap, two leather-tabbed
 *                 D-rings on the flap for the canteen / mess tin, two canvas belt loops with
 *                 steel hooks. Authored flat in the belt-local frame (see pouches.ts) and wrapped.
 *  - gasMaskCanister(): M38 fluted steel canister (about 26 cm long, 11.4 cm diameter) with its
 *                 hinged lid, spring latch and strap loops. Rigid; axis along +Y (lid up),
 *                 back of the canister on z = 0, origin at the middle of the back line.
 *  - messTin():   M31 mess tin (Kochgeschirr) - kidney-section pot with lid and wire bail.
 *                 Rigid; +Y up, back (concave side) on z = 0, origin at the back centre.
 *  - zeltbahnRoll(): Zeltbahn 31 rolled tight, splinter pattern, along +X, centred.
 *  - beltBuckle(): enlisted belt buckle (steel, painted) with a plain raised roundel (no emblem).
 */
import { THREE, G, group, part } from '../../../../core/kit';
import { roundEnds, dRing, frameBuckle } from '../../gear/util';
import { F, pillow, dome, placeY, roundRect, loftZF } from '../geo';
import { beltLoop } from './pouches';
import { U } from '../palette';

type V3 = [number, number, number];

// ------------------------------------------------------------------ bread bag

export const BREAD_BAG = { w: 0.27, h: 0.215, d: 0.06, yTop: 0.012 };

/** Returns the bag plus the flap D-ring positions (belt-local) for hanging the canteen. */
export function breadBag(): { obj: THREE.Group; rings: THREE.Vector3[]; front: number } {
  const can = U.canvas();
  const lea = U.belt();
  const hw = U.hardware();
  const { w, h, d, yTop } = BREAD_BAG;
  const parts: THREE.Object3D[] = [];
  const yc = yTop - h / 2;
  const back = 0.001;
  // body: soft, fuller at the bottom
  const body = pillow(w, h, d, 0.018, 0.012, 4);
  {
    const pos = body.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const t = THREE.MathUtils.clamp((v.y / (h / 2) + 1) / 2, 0, 1); // 0 bottom .. 1 top
      const front = THREE.MathUtils.clamp((v.z / (d / 2) + 1) / 2, 0, 1);
      v.z -= front * 0.018 * t * t; // flatter towards the top (hangs from the belt)
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  parts.push(part(body, can, { p: [0, yc, back + d / 2] }));
  // flap: covers the whole front, slightly larger, rounded lower corners, soft drape
  const zf = back + d + 0.012; // front bulge
  const fp: V3[] = [
    [0, yTop - 0.004, back + 0.006],
    [0, yTop + 0.004, back + 0.022],
    [0, yTop + 0.001, back + d * 0.75],
    [0, yTop - 0.03, zf - 0.006],
    [0, yTop - 0.1, zf + 0.0015],
    [0, yTop - 0.16, zf + 0.0012],
    [0, yTop - h + 0.018, zf - 0.004],
  ];
  const fn: V3[] = [[0, 1, -0.3], [0, 1, 0.1], [0, 0.7, 0.7], [0, 0.25, 1], [0, 0, 1], [0, 0, 1], [0, -0.3, 1]];
  parts.push(part(F.sheet(fp, fn, roundEnds(w / 2 + 0.003, 0, 0.035), 0.0028, { across: 10, samples: 26, bulge: 0.004 }), can));
  // flap hem stitching line (a raised welt close to the edge)
  // leather-tabbed D-rings on the flap (canteen hooks here)
  const rings: THREE.Vector3[] = [];
  for (const sx of [-1, 1]) {
    const x = sx * 0.075;
    const tab: V3[] = [[x, yTop - 0.022, zf - 0.0045], [x, yTop - 0.04, zf - 0.0012], [x, yTop - 0.056, zf + 0.0005]];
    parts.push(part(F.sheet(tab, [[0, 0.3, 1], [0, 0.1, 1], [0, 0, 1]], roundEnds(0.009, 0.004, 0.004), 0.0022, { across: 2, samples: 8 }), lea));
    const dr = dRing(0.024, 0.016, 0.0019);
    parts.push(part(dr, hw, { p: [x, yTop - 0.056, zf + 0.0035] }));
    parts.push(part(placeY(dome(0.0028, 0.0018, 10), [x, yTop - 0.031, zf + 0.0002], [0, 0.2, 1]), hw));
    rings.push(new THREE.Vector3(x, yTop - 0.056 - 0.016, zf + 0.0035));
  }
  // canvas belt loops with steel hooks (hook over the belt top)
  for (const sx of [-1, 1]) {
    const x = sx * 0.085;
    parts.push(part(beltLoop(x, 0.036, 0.0022, yTop - 0.008, -0.034), can));
    const hk: V3[] = [[x, 0.018, 0.001], [x, 0.03, 0.0], [x, 0.031, -0.004], [x, 0.022, -0.0068]];
    parts.push(part(F.tube(hk, 0.0017, 6, 12), hw));
  }
  // bottom seam welt
  parts.push(part(F.tube([[-w / 2 + 0.02, yTop - h + 0.003, back + 0.02], [0, yTop - h - 0.0005, back + d * 0.6], [w / 2 - 0.02, yTop - h + 0.003, back + 0.02]], 0.0022, 6, 20), can));
  const obj = group(parts);
  obj.name = 'bread-bag';
  return { obj, rings, front: zf };
}

// ------------------------------------------------------------------ gas-mask canister

export const CANISTER = { L: 0.262, R: 0.057, lid: 0.052 };

export function gasMaskCanister(): { obj: THREE.Group; top: THREE.Vector3; bottom: THREE.Vector3 } {
  const steel = U.greySteel();
  const hw = U.hardware();
  const web = U.webbing();
  const { L, R, lid } = CANISTER;
  const parts: THREE.Object3D[] = [];
  // body profile with horizontal flutes (y from 0 at the bottom to L - lid)
  const prof: [number, number][] = [[0, 0], [R - 0.012, 0], [R - 0.004, 0.002], [R, 0.008]];
  const yb = 0.012, ye = L - lid - 0.012;
  const nR = 9;
  for (let i = 0; i <= nR * 4; i++) {
    const y = yb + ((ye - yb) * i) / (nR * 4);
    const ph = (i % 4) / 4;
    const r = R - 0.0028 * (0.5 - 0.5 * Math.cos(ph * Math.PI * 2));
    prof.push([r, y]);
  }
  prof.push([R, L - lid - 0.004], [R - 0.0022, L - lid - 0.0015], [R - 0.0022, L - lid + 0.002]);
  const body = F.lathe(prof, 40, 30);
  // lid: slightly larger skirt with a rolled edge, domed top
  const lp: [number, number][] = [[R + 0.0016, L - lid - 0.0005], [R + 0.0024, L - lid + 0.002], [R + 0.002, L - lid + 0.01], [R + 0.0012, L - 0.012], [R - 0.003, L - 0.004], [R - 0.018, L - 0.0005], [0, L]];
  const lidG = F.lathe(lp, 40, 35);
  // orientation: canister axis +Y, the back line (touching the body) on z = 0
  const o = group([part(body, steel), part(lidG, steel)], { p: [0, -L / 2, R] });
  parts.push(o);
  // hinge on the back side of the lid, spring latch on the front
  parts.push(part(G.rbox(0.03, 0.014, 0.006, 0.002, 2), steel, { p: [0, L / 2 - lid + 0.006, -0.0005] }));
  parts.push(part(G.rod([-0.016, L / 2 - lid + 0.001, 0.0005], [0.016, L / 2 - lid + 0.001, 0.0005], 0.0025, 10), steel));
  parts.push(part(G.rbox(0.016, 0.036, 0.004, 0.0015, 2), hw, { p: [0, L / 2 - lid - 0.004, 2 * R + 0.0028] }));
  parts.push(part(G.rbox(0.02, 0.008, 0.007, 0.002, 2), hw, { p: [0, L / 2 - lid + 0.014, 2 * R + 0.004] }));
  // strap loops (sheet-steel brackets): top one on the lid side, bottom one on the base
  const top = new THREE.Vector3(0, L / 2 - lid - 0.02, -0.002);
  const bottom = new THREE.Vector3(0, -L / 2 + 0.03, -0.002);
  for (const p of [top, bottom]) {
    const br = frameBuckle(0.024, 0.008, 0.0016, false);
    br.rotateX(Math.PI / 2);
    parts.push(part(br, hw, { p: [p.x - R * 0.72, p.y, R * 0.3], r: [0, -55, 0] }));
  }
  // short webbing stub on the bottom loop (hooks to the belt)
  void web;
  const obj = group(parts);
  obj.name = 'gasmask-canister';
  return { obj, top, bottom };
}

// ------------------------------------------------------------------ mess tin

export const MESS_TIN = { w: 0.165, h: 0.155, d: 0.092 };

export function messTin(): THREE.Group {
  const paint = U.olivePaint();
  const hw = U.hardware();
  const { w, h, d } = MESS_TIN;
  // kidney section: flat/concave back, round front, via a loft of rounded rings
  const ring = (hwid: number, dep: number, n = 40): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      const x = hwid * Math.sign(c) * Math.pow(Math.abs(c), 0.72);
      let z = (dep / 2) * Math.sign(s) * Math.pow(Math.abs(s), 0.85);
      if (s < 0) z *= 1 - 0.28 * (1 - (x / hwid) ** 2); // concave back (towards the body)
      pts.push([x, -z]); // ring y -> world -z after the rotation below: concave side ends up at the back
    }
    return pts;
  };
  // pot body along +Y: loftZ builds along Z, so build then rotate
  const secs = [
    { z: 0, ring: ring(w / 2 - 0.008, d - 0.014) },
    { z: 0.004, ring: ring(w / 2 - 0.002, d - 0.004) },
    { z: 0.012, ring: ring(w / 2, d) },
    { z: h - 0.05, ring: ring(w / 2, d) },
    { z: h - 0.048, ring: ring(w / 2 - 0.0025, d - 0.005) },
  ];
  const pot = loftZF(secs, true, 40);
  pot.rotateX(-Math.PI / 2);
  const lidS = [
    { z: h - 0.05, ring: ring(w / 2 + 0.0012, d + 0.0024) },
    { z: h - 0.047, ring: ring(w / 2 + 0.002, d + 0.004) },
    { z: h - 0.006, ring: ring(w / 2 + 0.0015, d + 0.003) },
    { z: h, ring: ring(w / 2 - 0.006, d - 0.01) },
  ];
  const lid = loftZF(lidS, true, 40);
  lid.rotateX(-Math.PI / 2);
  const parts: THREE.Object3D[] = [part(pot, paint), part(lid, paint)];
  // lid handle (folding strap handle) and bail ears
  parts.push(part(G.rbox(0.07, 0.004, 0.018, 0.0015, 2), paint, { p: [0, h - 0.004, 0.012], r: [0, 0, 0] }));
  for (const sx of [-1, 1]) {
    parts.push(part(G.rbox(0.008, 0.016, 0.01, 0.002, 2), paint, { p: [sx * (w / 2 + 0.002), h - 0.07, 0] }));
    parts.push(part(G.rod([sx * (w / 2 + 0.004), h - 0.068, 0], [sx * (w / 2 + 0.004), h - 0.068, 0.004], 0.0022, 8), hw));
  }
  // wire bail folded down around the front
  const bail: V3[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI;
    bail.push([-(w / 2 + 0.005) * Math.cos(a), h - 0.068 - 0.05 * Math.sin(a) * 0.4, (d / 2 + 0.004) * Math.sin(a)]);
  }
  parts.push(part(F.tube(bail, 0.0018, 6, 48), hw));
  // shift so the back (concave) sits on z = 0: the back extreme is at -d/2
  const g = group(parts, { p: [0, -h / 2, d / 2] });
  const out = group([g]);
  out.name = 'mess-tin';
  return out;
}

// ------------------------------------------------------------------ zeltbahn roll

export function zeltbahnRoll(len = 0.34, r = 0.05): THREE.Group {
  const zb = U.zeltbahn();
  const parts: THREE.Object3D[] = [];
  // rolled cloth: a slightly irregular cylinder with visible spiral edge at the ends
  const prof: [number, number][] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = -len / 2 + len * t;
    const bulge = 1 - 0.1 * (2 * t - 1) ** 4;
    prof.push([r * bulge, x]);
  }
  const body = F.lathe([[0, -len / 2], ...prof.map(([rr, x]) => [rr, x] as [number, number]), [0, len / 2]], 36, 60);
  // spiral end faces: a thin raised spiral line
  body.rotateZ(Math.PI / 2);
  parts.push(part(body, zb));
  for (const sx of [-1, 1]) {
    const sp: V3[] = [];
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 2 * 3.2;
      const rr = r * (0.12 + 0.85 * (i / 60));
      sp.push([sx * (len / 2 * 0.9975), Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    parts.push(part(F.tube(sp, 0.0016, 5, 120), zb));
  }
  const g = group(parts);
  g.name = 'zeltbahn-roll';
  return g;
}

// ------------------------------------------------------------------ belt buckle

export function beltBuckle(): THREE.Group {
  const paint = U.buckle();
  const hw = U.hardware();
  const lea = U.belt();
  const w = 0.064, h = 0.049, t = 0.0032;
  const parts: THREE.Object3D[] = [];
  // slightly convex plate with rolled edge
  const plate = F.extrude(roundRect(w, h, 0.0055, 5), t, 0.0012, 8, 2);
  {
    const pos = plate.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      v.z += 0.0022 * (1 - (v.x / (w / 2)) ** 2);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  parts.push(part(F.extrude(roundRect(w, h, 0.0055, 5), 0.0008, 0.0002), paint, { p: [0, 0, 0.0004] }));
  parts.push(part(plate, paint, { p: [0, 0, t / 2 + 0.0006] }));
  // raised plain roundel with a rim (no emblem is depicted)
  const zf = t + 0.0028;
  parts.push(part(placeY(F.lathe([[0, 0.0009], [0.0145, 0.0009], [0.016, 0.0016], [0.0172, 0.0016], [0.0182, 0.0004], [0.0185, 0]], 40, 40), [0, 0, zf - 0.0004], [0, 0, 1]), paint));
  // the belt end tab showing behind the buckle's right side and the keeper claw
  parts.push(part(G.rbox(0.03, 0.044, 0.004, 0.0015, 2), lea, { p: [w / 2 - 0.004, 0, -0.0012] }));
  parts.push(part(G.rbox(0.006, 0.05, 0.004, 0.0015, 2), hw, { p: [-w / 2 + 0.002, 0, 0.0005] }));
  const g = group(parts);
  g.name = 'belt-buckle';
  return g;
}

export const _dome = dome;
