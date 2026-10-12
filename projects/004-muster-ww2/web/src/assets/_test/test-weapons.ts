/**
 * Simple test weapons implementing the shared WeaponModel contract (src/assets/shared/contracts.ts),
 * used to exercise the human base system's grips and poses. Not catalog models.
 *
 *  - testRifle(): bolt-action rifle with Kar98k-like proportions (1.11 m). Grips: trigger = wrist of
 *    the stock (axis forward, palm on the right side), support = fore-end at the balance (palm under).
 *  - testSmg(): MP 40-like submachine gun (0.83 m, extended stock). Grips: trigger = raked pistol
 *    grip, support = magazine housing (vertical, palm on its left-rear face).
 *
 * Weapon-local frame: bore +Z, sights +Y, weapon's left +X, origin = trigger grip centre.
 */
import { THREE, M, G, part, group } from '../../core/kit';
import type { WeaponModel, Grip } from '../shared/contracts';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const steel = () => M.gunSteel({ wear: 0.35 });
const wood = () => M.wood(0x6b4424, 0x331f10, [0, 0, 1], { wear: 0.25 });
const sling = () => M.leather(0x4a3220, { roughness: 0.62 });

/** Leather sling hanging between two attachment points along gravity (weapon-local). */
export function hangingSling(front: THREE.Vector3, rear: THREE.Vector3, gravity: THREE.Vector3, slack: number, side: THREE.Vector3, width = 0.024): THREE.Object3D {
  const g = gravity.clone().normalize();
  const L = front.distanceTo(rear);
  const sag = Math.sqrt((3 * L * Math.max(slack, 0.001)) / 8);
  const n = 24;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(front.clone().lerp(rear, t).addScaledVector(g, sag * 4 * t * (1 - t)));
  }
  const normals = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    const tan = b.clone().sub(a).normalize();
    return new THREE.Vector3().crossVectors(tan, side).normalize();
  });
  const geo = G.strap(pts, width, 0.0032, normals, { smooth: false });
  return part(geo, sling(), { name: 'sling' });
}

export function testRifle(): WeaponModel {
  const boreY = 0.038;
  const P: THREE.Object3D[] = [];
  // stock: loft from butt to nose cap (superellipse sections, asymmetric)
  const secs: [number, number, number, number][] = [
    // z, half-width, half-height, centre y
    [-0.36, 0.021, 0.064, -0.03],
    [-0.3, 0.022, 0.062, -0.028],
    [-0.16, 0.02, 0.046, -0.014],
    [-0.07, 0.018, 0.029, -0.004],
    [0.0, 0.0165, 0.021, 0.0],
    [0.045, 0.02, 0.028, 0.01],
    [0.1, 0.024, 0.035, 0.016],
    [0.28, 0.024, 0.03, 0.022],
    [0.45, 0.021, 0.024, 0.025],
    [0.59, 0.016, 0.018, 0.03],
  ];
  P.push(part(G.loftZ(secs.map(([z, a, b, dy]) => ({ z, ring: G.superRing(a, b, 28, 2.6), dy }))), wood(), { name: 'stock' }));
  // butt plate
  P.push(part(G.rbox(0.044, 0.13, 0.006, 0.003), steel(), { p: [0, -0.03, -0.362] }));
  // receiver, bolt, bolt handle
  P.push(part(G.rod([0, boreY, 0.04], [0, boreY, 0.285], 0.0165, 20), steel()));
  P.push(part(G.rod([0, boreY + 0.004, -0.02], [0, boreY + 0.004, 0.06], 0.0095, 14), steel()));
  P.push(part(G.rod([-0.008, boreY, 0.075], [-0.048, boreY - 0.03, 0.062], 0.0042, 10), steel()));
  P.push(part(new THREE.SphereGeometry(0.0105, 14, 10), steel(), { p: [-0.05, boreY - 0.033, 0.061] }));
  // barrel, bands, sights
  P.push(part(G.rod([0, boreY, 0.285], [0, boreY, 0.75], 0.0108, 18, 0.0086), steel()));
  for (const [z, r] of [[0.42, 0.031], [0.575, 0.024]] as const) {
    P.push(part(G.rod([0, 0.026, z - 0.011], [0, 0.026, z + 0.011], r, 22), steel()));
  }
  P.push(part(G.rbox(0.004, 0.014, 0.012, 0.0015), steel(), { p: [0, boreY + 0.016, 0.735] }));
  P.push(part(G.rbox(0.03, 0.012, 0.06, 0.004), steel(), { p: [0, boreY + 0.012, 0.3] }));
  // trigger guard + magazine floor plate
  const tg = G.torus(0.017, 0.0028, 8, 20, Math.PI);
  tg.rotateY(Math.PI / 2);
  tg.rotateX(Math.PI);
  P.push(part(tg, steel(), { p: [0, -0.012, 0.075] }));
  P.push(part(G.rbox(0.022, 0.006, 0.09, 0.002), steel(), { p: [0, -0.012, 0.14] }));
  // swivels
  P.push(part(G.torus(0.009, 0.0022, 6, 14), steel(), { p: [0.024, 0.02, 0.42], r: [0, 90, 0] }));
  P.push(part(G.rbox(0.028, 0.004, 0.03, 0.0015), steel(), { p: [0, -0.066, -0.2] }));
  const object = group([group(P, { name: 'test-rifle' })]);
  object.name = 'test-rifle';

  const trigger: Grip = { position: v(0, 0, 0), axis: v(0, 0, 1), palm: v(-1, 0.25, 0).normalize(), radius: 0.0195, length: 0.08 };
  const support: Grip = { position: v(0, 0.02, 0.25), axis: v(0, 0, 1), palm: v(0, -1, 0), radius: 0.027, length: 0.12 };
  const front = v(0.024, 0.012, 0.42), rear = v(0, -0.068, -0.2);
  return {
    id: 'test-rifle',
    object,
    grips: { trigger, support },
    shoulder: v(0, -0.03, -0.365),
    muzzle: v(0, boreY, 0.75),
    sling: { front, rear, build: (gl: THREE.Vector3, slack = 0.12) => hangingSling(front, rear, gl, slack, v(1, 0, 0)) },
    length: 1.115,
    restPoints: [v(0, -0.094, -0.3), v(0, -0.004, 0.5)],
  };
}

/**
 * Light machine gun with MG 34/42-like proportions (1.22 m): pistol grip, butt stock, perforated
 * barrel jacket and a folded bipod under the jacket. Grips: trigger = raked pistol grip,
 * support = the folded bipod legs under the jacket (axis forward, palm under).
 */
export function testLmg(): WeaponModel {
  const boreY = 0.075;
  const rake = (17 * Math.PI) / 180;
  const up = v(0, Math.cos(rake), Math.sin(rake));
  const P: THREE.Object3D[] = [];
  const grip = M.surface({ color: 0x2f2620, roughness: 0.5, name: 'test-bakelite' });
  // receiver box, feed cover, barrel jacket, barrel, muzzle
  P.push(part(G.rbox(0.05, 0.06, 0.34, 0.006), steel(), { p: [0, boreY - 0.005, 0.06] }));
  P.push(part(G.rbox(0.058, 0.02, 0.2, 0.005), steel(), { p: [0, boreY + 0.032, 0.09] }));
  P.push(part(G.rod([0, boreY, 0.23], [0, boreY, 0.66], 0.022, 20), steel()));
  P.push(part(G.rod([0, boreY, 0.66], [0, boreY, 0.8], 0.0095, 14), steel()));
  P.push(part(G.rod([0, boreY, 0.8], [0, boreY, 0.83], 0.016, 14), steel()));
  // butt stock
  const secs: [number, number, number, number][] = [
    [-0.44, 0.02, 0.07, -0.01], [-0.36, 0.021, 0.068, -0.005], [-0.2, 0.02, 0.045, 0.03], [-0.1, 0.022, 0.03, 0.05],
  ];
  P.push(part(G.loftZ(secs.map(([z, a, b, dy]) => ({ z, ring: G.superRing(a, b, 24, 2.6), dy }))), grip, { name: 'stock' }));
  // pistol grip + trigger guard
  const pg = part(G.rbox(0.03, 0.11, 0.042, 0.01), grip, { p: [0, 0, 0] });
  pg.rotation.x = -rake;
  P.push(pg);
  // folded bipod (two legs under the jacket)
  for (const x of [0.012, -0.012]) P.push(part(G.rod([x, boreY - 0.028, 0.62], [x, boreY - 0.03, 0.3], 0.006, 10), steel()));
  P.push(part(G.rbox(0.04, 0.012, 0.03, 0.004), steel(), { p: [0, boreY - 0.022, 0.62] }));
  const object = group([group(P, { name: 'test-lmg' })]);
  object.name = 'test-lmg';
  const palmT = v(-0.8, 0, -0.6);
  palmT.addScaledVector(up, -palmT.dot(up)).normalize();
  const trigger: Grip = { position: v(0, 0, 0), axis: up.clone(), palm: palmT, radius: 0.0185, length: 0.1 };
  const support: Grip = { position: v(0, boreY - 0.03, 0.4), axis: v(0, 0, 1), palm: v(0.3, -1, 0).normalize(), radius: 0.016, length: 0.1 };
  const front = v(-0.024, boreY, 0.5), rear = v(-0.022, 0.03, -0.3);
  return {
    id: 'test-lmg',
    object,
    grips: { trigger, support },
    shoulder: v(0, 0.02, -0.44),
    muzzle: v(0, boreY, 0.83),
    sling: { front, rear, build: (gl: THREE.Vector3, slack = 0.12) => hangingSling(front, rear, gl, slack, v(1, 0, 0), 0.026) },
    length: 1.27,
    restPoints: [v(0, -0.03, -0.3), v(0, boreY - 0.04, 0.5)],
  };
}

export function testSmg(): WeaponModel {
  const boreY = 0.091;
  const rake = (14 * Math.PI) / 180;
  const up = v(0, Math.cos(rake), Math.sin(rake));
  const P: THREE.Object3D[] = [];
  // receiver tube, barrel, muzzle nut
  P.push(part(G.rod([0, boreY, -0.09], [0, boreY, 0.3], 0.0185, 22), steel()));
  P.push(part(G.rod([0, boreY, 0.3], [0, boreY, 0.54], 0.0095, 16), steel()));
  P.push(part(G.rod([0, boreY, 0.54], [0, boreY, 0.555], 0.012, 16), steel()));
  // lower housing and pistol grip (bakelite-like)
  const grip = M.surface({ color: 0x3a2a20, roughness: 0.45, name: 'test-bakelite' });
  P.push(part(G.rbox(0.026, 0.028, 0.3, 0.004), steel(), { p: [0, 0.058, 0.12] }));
  const pg = part(G.rbox(0.029, 0.105, 0.04, 0.009), grip, { p: [0, 0.0, 0.0] });
  pg.rotation.x = -rake;
  P.push(pg);
  // magazine housing + magazine
  P.push(part(G.rbox(0.03, 0.07, 0.034, 0.003), steel(), { p: [0, 0.035, 0.27] }));
  P.push(part(G.rbox(0.022, 0.2, 0.03, 0.003), steel(), { p: [0, -0.1, 0.27] }));
  // folding stock (two struts + butt plate)
  P.push(part(G.rod([0.012, 0.05, -0.02], [0.012, 0.05, -0.37], 0.005, 10), steel()));
  P.push(part(G.rod([-0.012, 0.05, -0.02], [-0.012, 0.05, -0.37], 0.005, 10), steel()));
  P.push(part(G.rbox(0.035, 0.1, 0.008, 0.004), steel(), { p: [0, 0.03, -0.375] }));
  const object = group([group(P, { name: 'test-smg' })]);
  object.name = 'test-smg';
  const palmT = v(-0.8, 0, -0.6);
  palmT.addScaledVector(up, -palmT.dot(up)).normalize();
  const trigger: Grip = { position: v(0, 0, 0), axis: up.clone(), palm: palmT, radius: 0.0175, length: 0.095 };
  const support: Grip = { position: v(0, 0.03, 0.27), axis: v(0, 1, 0), palm: v(0.8, 0, -0.6).normalize(), radius: 0.019, length: 0.07 };
  const front = v(-0.02, boreY - 0.012, 0.4), rear = v(-0.013, 0.05, -0.02);
  return {
    id: 'test-smg',
    object,
    grips: { trigger, support },
    shoulder: v(0, 0.03, -0.38),
    muzzle: v(0, boreY, 0.555),
    sling: { front, rear, build: (gl: THREE.Vector3, slack = 0.12) => hangingSling(front, rear, gl, slack, v(1, 0, 0), 0.02) },
    length: 0.935,
    restPoints: [v(0, 0.044, -0.02), v(0, 0.08, 0.5)],
  };
}
