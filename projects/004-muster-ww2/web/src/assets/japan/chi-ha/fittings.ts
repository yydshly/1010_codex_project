/**
 * Chi-Ha external fittings: sheet-steel track guards (front and rear extensions and the narrow
 * strip along the superstructure) with support brackets, headlamps, the two exhaust silencers on the
 * rear guards with perforated heat shields and their pipes from the hull side, and pioneer tools
 * (shovel, pick, crowbar) and the tow cable clamped to the superstructure sides.
 *
 * Hull frame: +Z forward, +X = the tank's left, y = 0 ground.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H } from './dims';
import type { Pal } from './palette';
import { rb, latheZ, rivet, type P3 } from './util';

const { xSide: xS, xGuard: xG, xGuardIn: xI, yGuard: yG } = H;
const tG = 0.005;

/* ------------------------------------------------------------------ guards */

function guard(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // plan outline (x, z) of the left guard: front and rear sections full track width, narrow strip between
  const outline: G.V2[] = [
    [xI, H.zGuardF - 0.1],
    [xG, H.zGuardF - 0.1],
    [xG, H.zGuardR + 0.06],
    [xI, H.zGuardR + 0.06],
    [xI, H.zRearBot],
    [xS, H.zRearBot],
    [xS, H.zFrontBot],
    [xI, H.zFrontBot],
  ];
  const g = G.plate(outline, tG, 'xz', 0.0015);
  g.translate(0, yG - tG / 2, 0);
  out.push(part(g, P.sheet));
  // front and rear lips bent down at an angle
  for (const [z, dir] of [[H.zGuardF - 0.1, 1], [H.zGuardR + 0.06, -1]] as [number, number][]) {
    const len = 0.13;
    const lip = rb(xG - xI, tG, len, 0.002);
    lip.rotateX((dir * 35 * Math.PI) / 180);
    lip.translate((xG + xI) / 2, yG - Math.sin((35 * Math.PI) / 180) * len / 2 - 0.002, z + dir * Math.cos((35 * Math.PI) / 180) * len / 2);
    out.push(part(lip, P.sheet));
  }
  // rolled outer edge along the full length
  out.push(part(G.cyl(0.007, 0.007, H.zGuardF - 0.1 - H.zGuardR - 0.06, 8), P.sheet, { p: [xG - 0.004, yG - 0.006, (H.zGuardF - 0.1 + H.zGuardR + 0.06) / 2], r: [90, 0, 0] }));
  // triangular support brackets under the front and rear extensions, rivet row on the strip
  for (const z of [H.zFrontBot + 0.2, H.zRearBot - 0.07]) {
    const br = G.plate([[0, 0], [0.16, 0], [0, -0.1]], 0.008, 'xy', 0.002);
    br.rotateY(Math.PI / 2);
    out.push(part(br, P.sheet, { p: [xI + 0.02, yG - tG, z] }));
  }
  const rp: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  G.along([xG - 0.035, yG, H.zFrontBot - 0.1], [xG - 0.035, yG, H.zRearBot + 0.1], 36).forEach((p, i) => rp.push({ p, n: new THREE.Vector3(0, 1, 0), spin: i }));
  out.push(part(G.scatter(rivet(), rp), P.sheet));
  return out;
}

/* ------------------------------------------------------------------ lamps */

function headlamp(P: Pal): THREE.Object3D {
  // lamp on a short post, pointing +Z; origin at the foot of the post
  const ps: THREE.Object3D[] = [];
  const cy = 0.14;
  ps.push(part(latheZ([[0.0, -0.07], [0.05, -0.07], [0.07, -0.04], [0.075, 0.0], [0.075, 0.03], [0.07, 0.034]], 28, 40), P.paint, { p: [0, cy, 0] }));
  ps.push(part(latheZ([[0.0, 0.02], [0.066, 0.024], [0.066, 0.028], [0.0, 0.032]], 28, 60), P.glass, { p: [0, cy, 0] }));
  ps.push(part(latheZ([[0.0, -0.02], [0.064, 0.0], [0.064, 0.012], [0.0, 0.012]], 24, 60), P.bright, { p: [0, cy, 0] }));
  ps.push(part(G.torus(0.072, 0.007, 6, 28), P.paint, { p: [0, cy, 0.033] }));
  ps.push(part(G.cyl(0.018, 0.022, cy - 0.06, 10), P.paint, { p: [0, (cy - 0.06) / 2, -0.01] }));
  ps.push(part(G.cyl(0.04, 0.045, 0.012, 14), P.paint, { p: [0, 0.006, -0.01] }));
  return group(ps);
}

/* ------------------------------------------------------------------ exhaust */

function silencer(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x = xS + 0.068, r = 0.064, y = yG + r + 0.035;
  const z0 = -2.42, z1 = -1.26;
  out.push(part(latheZ([[0.0, z0], [r - 0.02, z0], [r, z0 + 0.03], [r, z1 - 0.03], [r - 0.02, z1], [0.0, z1]], 28, 35), P.exhaust, { p: [x, y, 0] }));
  // tail pipe out of the rear end, turned down
  out.push(part(G.tube([[x, y - 0.01, z0 + 0.02], [x, y - 0.012, z0 - 0.08], [x + 0.005, y - 0.05, z0 - 0.14]], 0.022, 10, 16), P.exhaust));
  out.push(part(G.cyl(0.017, 0.017, 0.01, 12), P.void, { p: [x + 0.005, y - 0.06, z0 - 0.15], r: [40, 0, 0] }));
  // inlet pipe from the hull side into the front end
  out.push(part(G.tube([[xS - 0.01, y + 0.01, z1 + 0.2], [x - 0.03, y + 0.01, z1 + 0.19], [x, y + 0.005, z1 + 0.1], [x, y, z1 - 0.04]], 0.028, 10, 24), P.exhaust));
  out.push(part(G.cyl(0.05, 0.05, 0.02, 16), P.paint, { p: [xS + 0.009, y + 0.01, z1 + 0.2], r: [0, 0, 90] }));
  // perforated heat shield: curved sheet over the top and outboard side, perforations as dark dots
  const sr = r + 0.022;
  const a0 = -0.15 * Math.PI, a1 = 0.62 * Math.PI; // angle from +Y towards +X
  const sh: G.V2[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    sh.push([Math.sin(a) * sr, Math.cos(a) * sr]);
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n;
    sh.push([Math.sin(a) * (sr + 0.004), Math.cos(a) * (sr + 0.004)]);
  }
  const zs0 = z0 + 0.06, zs1 = z1 - 0.06;
  const shield = G.extrude(G.shape(sh), zs1 - zs0, 0.0012, 1, 1);
  shield.translate(x, y, (zs0 + zs1) / 2);
  out.push(part(shield, P.sheet));
  const holes: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  const hole = new THREE.CylinderGeometry(0.011, 0.011, 0.002, 8);
  for (let zi = 0; zi < 16; zi++) {
    const z = zs0 + 0.06 + ((zs1 - zs0 - 0.12) * zi) / 15;
    for (let k = 0; k < 5; k++) {
      const a = a0 + 0.12 + ((a1 - a0 - 0.24) * (k + (zi % 2) * 0.5)) / 5;
      const nn = new THREE.Vector3(Math.sin(a), Math.cos(a), 0);
      holes.push({ p: new THREE.Vector3(x, y, z).addScaledVector(nn, sr + 0.0045), n: nn, spin: 0 });
    }
  }
  out.push(part(G.scatter(hole, holes), P.void));
  // mounting straps from the hull side
  for (const z of [z0 + 0.2, z1 - 0.2]) {
    const pts: P3[] = [];
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 - 0.2 + ((Math.PI + 0.4) * i) / 10;
      pts.push([x + Math.cos(a) * (r + 0.006), y + Math.sin(a) * (r + 0.006), z]);
    }
    out.push(part(G.strap(pts, 0.03, 0.005, [0, 0, 1], { smooth: false }), P.paint));
    out.push(part(rb(0.02, 0.1, 0.04, 0.004), P.paint, { p: [xS + 0.01, y, z] }));
  }
  return out;
}

/* ------------------------------------------------------------------ tools */

function shovel(P: Pal): THREE.Object3D {
  // lying along Z (blade at -Z), flat face +X
  const ps: THREE.Object3D[] = [];
  const blade = G.plate([[0, -0.11], [0, 0.11], [-0.2, 0.11], [-0.27, 0.07], [-0.3, 0.0], [-0.27, -0.07], [-0.2, -0.11]], 0.006, 'zy', 0.002);
  ps.push(part(blade, P.sheet, { p: [-0.012, 0, -0.4] }));
  ps.push(part(G.cyl(0.018, 0.018, 0.1, 10), P.toolSteel, { p: [0, 0, -0.38], r: [90, 0, 0] }));
  ps.push(part(G.cyl(0.018, 0.018, 0.62, 10), P.wood, { p: [0, 0, 0.0], r: [90, 0, 0] }));
  ps.push(part(G.tube([[0, 0, 0.3], [0, 0.07, 0.36], [0, 0.07, 0.42], [0, -0.07, 0.42], [0, -0.07, 0.36], [0, 0, 0.3]], 0.012, 6, 30), P.wood));
  return group(ps);
}

function pick(P: Pal): THREE.Object3D {
  // handle along Z, head across Y at the -Z end
  return group([
    part(G.cyl(0.02, 0.024, 0.86, 10), P.wood, { r: [90, 0, 0] }),
    part(G.tube([[0, -0.23, -0.41], [0, -0.1, -0.44], [0, 0, -0.45], [0, 0.1, -0.44], [0, 0.23, -0.41]], 0.017, 8, 20), P.toolSteel),
    part(rb(0.05, 0.06, 0.06, 0.008), P.toolSteel, { p: [0, 0, -0.44] }),
  ]);
}

function clamp(P: Pal): THREE.Object3D {
  // bracket standing off the side plate (+X out), strap across
  return group([
    part(rb(0.045, 0.1, 0.035, 0.004), P.paint, { p: [0.022, 0, 0] }),
    part(rb(0.012, 0.11, 0.03, 0.003), P.paint, { p: [0.068, 0, 0] }),
  ]);
}

function tools(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // left side: shovel and pick on clamps
  const sh = shovel(P);
  sh.position.set(xS + 0.05, 1.38, 0.72);
  out.push(sh);
  for (const z of [0.52, 1.02]) out.push(group([clamp(P)], { p: [xS, 1.38, z] }));
  const pk = pick(P);
  pk.position.set(xS + 0.05, 1.2, 0.3);
  out.push(pk);
  for (const z of [0.05, 0.55]) out.push(group([clamp(P)], { p: [xS, 1.2, z] }));
  // right side: crowbar and the tow cable
  const bar = group([
    part(G.cyl(0.016, 0.016, 1.3, 10), P.toolSteel, { r: [90, 0, 0] }),
    part(rb(0.04, 0.012, 0.08, 0.003), P.toolSteel, { p: [0, 0.0, 0.68], r: [20, 0, 0] }),
  ]);
  bar.position.set(-xS - 0.05, 1.36, 0.6);
  out.push(bar);
  for (const z of [0.2, 1.0]) out.push(group([clamp(P)], { p: [-xS, 1.36, z], s: [-1, 1, 1] }));
  // tow cable: two runs with eyes at both ends, held by the clamps
  const cz0 = -0.2, cz1 = 1.4;
  for (const [yy, dz] of [[1.18, 0], [1.24, 0.03]] as [number, number][]) {
    out.push(part(G.tube([[-xS - 0.045, yy, cz0 + dz], [-xS - 0.05, yy + 0.004, (cz0 + cz1) / 2], [-xS - 0.045, yy, cz1 - dz]], 0.013, 8, 40), P.cable));
  }
  for (const z of [cz0 - 0.05, cz1 + 0.05]) {
    out.push(part(G.torus(0.04, 0.012, 8, 18), P.cable, { p: [-xS - 0.045, 1.21, z], r: [0, 90, 0] }));
  }
  for (const z of [0.0, 0.8]) out.push(group([clamp(P)], { p: [-xS, 1.21, z], s: [-1, 1.1, 1] }));
  return out;
}

export function fittings(P: Pal): THREE.Group {
  const left: THREE.Object3D[] = [...guard(P), ...silencer(P)];
  const both = group(left);
  const mir = both.clone(true);
  mir.scale.x = -1;
  const out: THREE.Object3D[] = [both, mir, ...tools(P)];
  // headlamps on the front guards
  for (const sx of [-1, 1]) out.push(group([headlamp(P)], { p: [sx * 0.97, yG, H.zFrontBot + 0.22] }));
  return group(out, { name: 'fittings' });
}

