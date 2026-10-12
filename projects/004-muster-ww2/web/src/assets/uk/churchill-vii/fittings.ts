/**
 * External fittings of the Churchill Mk VII: full-length track guards over the top runs, the
 * louvred side air-intake boxes on the guards alongside the engine compartment, the engine deck
 * louvres and access plates, spare track links across the nose, pioneer tools in clamps on the
 * guards.
 *
 * Hull frame: +Z forward, +X = the tank's left, y = 0 ground.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { H, R } from './dims';
import type { Pal } from './palette';
import { linkGeometry } from './track';
import { rb, row, merge, onPlate } from '../cromwell/util';
import { louvre } from '../cromwell/hull';

const { xH, yG, xG, zGF, zGR, yR } = H;
const gt = 0.006;

/* ------------------------------------------------------------------ guards (left) */

function guardLeft(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const w = xG - xH;
  const L = zGF - zGR, zc = (zGF + zGR) / 2;
  out.push(part(G.box(w, gt, L), P.sheet, { p: [xH + w / 2, yG - gt / 2, zc] }));
  // rolled outer edge with a short down-turned lip
  out.push(part(G.cyl(0.01, 0.01, L, 8), P.sheet, { p: [xG - 0.01, yG - 0.006, zc], r: [90, 0, 0] }));
  out.push(part(G.box(0.005, 0.03, L), P.sheet, { p: [xG - 0.003, yG - 0.02, zc] }));
  // angle strip on the hull side where fitted
  out.push(part(rb(0.012, 0.03, zGF - 0.35 - (H.zRr + 0.02), 0.003), P.sheet, { p: [xH + 0.006, yG + 0.013, (zGF - 0.35 + H.zRr + 0.02) / 2] }));
  // guard stays down to the pannier top between the links' paths (inner edge)
  const st: THREE.BufferGeometry[] = [];
  for (const z of [2.6, 1.3, 0.0, -1.3, -2.6]) st.push(rb(0.02, yG - gt - 1.47, 0.04, 0.004).translate(xH + 0.012, (yG - gt + 1.47) / 2, z));
  out.push(part(merge(st), P.sheet));
  return out;
}

/* ------------------------------------------------------------------ side air intakes (left) */

function airIntakeLeft(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x0 = xH, x1 = 1.52, z0 = -0.42, z1 = -1.72, y0 = yG, y1 = yR + 0.26;
  const w = x1 - x0, l = z0 - z1, ht = y1 - y0;
  // box: top, front (sloped), rear, inner is the hull side
  const shape: G.V2[] = [
    [z1, y0],
    [z0, y0],
    [z0 + 0.0, y1 - 0.12],
    [z0 - 0.14, y1],
    [z1, y1],
  ];
  const sideG = G.plate(shape, 0.012, 'zy', 0.003);
  out.push(part(sideG, P.paint, { p: [x1 - 0.006, 0, 0] }));
  out.push(part(rb(w, 0.02, l - 0.14, 0.005), P.paint, { p: [x0 + w / 2, y1 - 0.01, (z1 + z0 - 0.14) / 2] }));
  const sl = Math.hypot(0.14, 0.12);
  out.push(part(G.box(w, 0.02, sl), P.paint, { p: [x0 + w / 2, y1 - 0.06 - 0.005, z0 - 0.07], r: [(-Math.atan2(0.12, 0.14) * 180) / Math.PI, 0, 0] }));
  out.push(part(G.box(w, y1 - 0.12 - y0, 0.02), P.paint, { p: [x0 + w / 2, (y0 + y1 - 0.12) / 2, z0 - 0.01] }));
  out.push(part(G.box(w, ht, 0.02), P.paint, { p: [x0 + w / 2, y0 + ht / 2, z1 + 0.01] }));
  // louvre panel on the outer face, slats angled down
  const lv = louvre(P, ht - 0.1, l - 0.3, 7, false, 40);
  out.push(onPlate(lv, [x1, y0 + (ht - 0.04) / 2, (z0 + z1) / 2 - 0.06], [0, 1, 0], [1, 0, 0]));
  // bolts along the top edge
  out.push(part(G.scatter(G.boltHead(0.018, 0.008), row([x0 + 0.05, y1, z1 + 0.05], [x0 + 0.05, y1, z0 - 0.2], [0, 1, 0], 8)), P.paint));
  return out;
}

/* ------------------------------------------------------------------ engine deck */

function engineDeck(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = yR;
  // engine access louvres, side by side
  for (const sx of [-1, 1]) {
    const lv = louvre(P, 0.78, 1.25, 16, true);
    lv.position.set(sx * 0.46, y, -1.45);
    out.push(lv);
  }
  // hinged access plates ahead of them with bolted edges and lifting handles
  for (const sx of [-1, 1]) {
    const xc = sx * 0.46;
    out.push(part(G.plate([[-0.4, -0.3], [0.4, -0.3], [0.4, 0.3], [-0.4, 0.3]], 0.024, 'xz', 0.005, 0.02), P.paint, { p: [xc, y + 0.012, -0.48] }));
    out.push(part(G.scatter(G.boltHead(0.022, 0.009), [
      ...row([xc - 0.37, y + 0.024, -0.21], [xc + 0.37, y + 0.024, -0.21], [0, 1, 0], 6),
      ...row([xc - 0.37, y + 0.024, -0.75], [xc + 0.37, y + 0.024, -0.75], [0, 1, 0], 6),
    ]), P.paint));
    out.push(part(G.tube([[xc - 0.07, y + 0.024, -0.5], [xc - 0.06, y + 0.07, -0.5], [xc + 0.06, y + 0.07, -0.5], [xc + 0.07, y + 0.024, -0.5]], 0.01, 6, 16), P.paint));
  }
  // rear radiator louvre across the deck
  const rl = louvre(P, 1.8, 0.9, 10, true, 30);
  rl.position.set(0, y, -2.55);
  out.push(rl);
  return out;
}

/* ------------------------------------------------------------------ nose spare links */

function spareLinks(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const { yB, yF, zBF, zF } = H;
  const dy = yF - yB, dz = zF - zBF;
  const L = Math.hypot(dy, dz);
  const n = new THREE.Vector3(0, -dz, dy).normalize();
  const up = new THREE.Vector3(0, dy, dz).normalize();
  const lg = linkGeometry();
  const X = new THREE.Vector3(1, 0, 0);
  const Zd = up.clone().negate();
  const off = 0.04 + R.t / 2 + R.cleat + 0.004;
  const at = (x: number, s: number, o: number) => new THREE.Vector3(x, yB + (dy * s) / L, zBF + (dz * s) / L).addScaledVector(n, o);
  for (const x of [-0.6, 0, 0.6]) {
    for (const s of [0.36, 0.36 + R.pitch]) {
      const m = part(lg, P.track);
      new THREE.Matrix4().makeBasis(X, n, Zd).setPosition(at(x, s, off)).decompose(m.position, m.quaternion, m.scale);
      out.push(m);
    }
  }
  // retaining bar across the links
  const bar = at(0, 0.36 + R.pitch / 2, off + R.t / 2 + R.horn + 0.016);
  out.push(part(G.rod(bar.clone().setX(-0.92), bar.clone().setX(0.92), 0.014, 10), P.sheet));
  for (const sx of [-1, 1]) out.push(part(G.rod(at(sx * 0.92, 0.36 + R.pitch / 2, 0.035), bar.clone().setX(sx * 0.92), 0.018, 10), P.sheet));
  return out;
}

/* ------------------------------------------------------------------ tools */

function clamp(P: Pal, x: number, z: number, r: number, yc: number): THREE.Object3D[] {
  return [
    part(rb(0.02, yc - yG + 0.004, 0.026, 0.003), P.sheet, { p: [x + r + 0.013, (yG + yc) / 2, z] }),
    part(rb(0.02, yc - yG + 0.004, 0.026, 0.003), P.sheet, { p: [x - r - 0.013, (yG + yc) / 2, z] }),
    part(G.torus(r + 0.005, 0.0045, 6, 14, Math.PI), P.gun, { p: [x, yc, z] }),
  ];
}

function shovel(P: Pal): THREE.Object3D[] {
  const y = yG + 0.022;
  const blade: G.V2[] = [[-0.12, 0], [0.12, 0], [0.12, 0.2], [0.08, 0.27], [0, 0.3], [-0.08, 0.27], [-0.12, 0.2]];
  return [
    part(G.plate(blade, 0.004, 'xz', 0.0012, 0.02), P.toolSteel, { p: [0, yG + 0.004, 0] }),
    part(G.cyl(0.02, 0.017, 0.12, 12), P.toolSteel, { p: [0, y, -0.06], r: [90, 0, 0] }),
    part(G.cyl(0.017, 0.017, 0.62, 10), P.wood, { p: [0, y, -0.43], r: [90, 0, 0] }),
    part(G.tube([[0, y, -0.73], [0.05, y, -0.77], [0.05, y, -0.86], [0, y, -0.89], [-0.05, y, -0.86], [-0.05, y, -0.77], [0, y, -0.73]], 0.011, 6, 20), P.wood),
    ...clamp(P, 0, -0.22, 0.017, y),
    ...clamp(P, 0, -0.62, 0.017, y),
  ];
}

function crowbar(P: Pal): THREE.Object3D[] {
  const y = yG + 0.02;
  return [
    part(G.tube([[0, y, 0.7], [0, y, -0.6], [0, y + 0.012, -0.66], [0, y + 0.04, -0.69]], 0.014, 8, 20), P.toolSteel),
    ...clamp(P, 0, 0.42, 0.014, y),
    ...clamp(P, 0, -0.38, 0.014, y),
  ];
}

function sledge(P: Pal): THREE.Object3D[] {
  const y = yG + 0.026;
  return [
    part(G.cyl(0.018, 0.015, 0.8, 10), P.wood, { p: [0, y, -0.4], r: [90, 0, 0] }),
    part(rb(0.2, 0.06, 0.07, 0.01), P.toolSteel, { p: [0, y + 0.004, 0.03] }),
    ...clamp(P, 0, -0.3, 0.018, y),
    ...clamp(P, 0, -0.66, 0.016, y),
  ];
}

function tools(P: Pal): THREE.Object3D[] {
  return [
    group(shovel(P), { p: [1.38, 0, 2.9] }),
    group(sledge(P), { p: [1.2, 0, 2.2] }),
    group(crowbar(P), { p: [-1.35, 0, 2.3] }),
  ];
}

export function fittings(P: Pal): THREE.Group {
  const left = group([...guardLeft(P), ...airIntakeLeft(P)]);
  return group([mirrorX(left), ...engineDeck(P), ...spareLinks(P), ...tools(P)], { name: 'fittings' });
}
