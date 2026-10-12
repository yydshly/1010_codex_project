/**
 * MG 42 barrel jacket group (B-frame): perforated sheet-steel jacket (oval cooling slots on the
 * left, top and bottom; the long barrel-change opening on the right with the hinged barrel catch
 * at its rear), barrel visible inside, front nose with the recoil booster and flash-hider cone,
 * tangent rear sight with folding AA peep, folding front sight, front bipod holder and the
 * sling hook eye.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import type { Mg42Mats } from './materials';
import { D } from './dims';
import { cylX, cylZ, latheZ, panel, roundRect, stadium, v, type V2 } from './util';

const J = {
  top: D.jY + D.jH / 2,
  bot: D.jY - D.jH / 2,
  flatH: D.jH - 2 * D.jR,
  flatW: D.jW - 2 * D.jR,
};
export const JACKET = J;

export function buildJacket(mats: Mg42Mats, detail: 'high' | 'low' = 'high'): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const e = 0.0007; // panels reach into the corner strips so seams are hidden
  const len = D.jFront - D.jRear;
  const cz = (D.jFront + D.jRear) / 2;
  const nh = detail === 'high' ? 8 : 4;

  // --- side panels (thickness along X) ---
  const sideOutline: V2[] = [
    [D.jRear, D.jY - J.flatH / 2 - e],
    [D.jFront, D.jY - J.flatH / 2 - e],
    [D.jFront, D.jY + J.flatH / 2 + e],
    [D.jRear, D.jY + J.flatH / 2 + e],
  ];
  const leftHoles: V2[][] = [];
  for (let i = 0; i < 8; i++) leftHoles.push(stadium(0.642 + i * 0.0545, D.jY, 0.036, 0.0165, nh));
  out.push(part(panel(sideOutline, leftHoles, D.jT, 'zy', 0.00045), mats.phos, { p: [D.jW / 2 - D.jT / 2, 0, 0] }));
  // right side: the long barrel-change opening
  const slot = stadium(0.709, D.jY, 0.184, 0.0225, nh + 2);
  out.push(part(panel(sideOutline, [slot], D.jT, 'zy', 0.00045), mats.phos, { p: [-D.jW / 2 + D.jT / 2, 0, 0] }));

  // --- top and bottom panels (thickness along Y) ---
  const tbOutline: V2[] = [
    [-J.flatW / 2 - e, D.jRear],
    [J.flatW / 2 + e, D.jRear],
    [J.flatW / 2 + e, D.jFront],
    [-J.flatW / 2 - e, D.jFront],
  ];
  const topHoles: V2[][] = [];
  for (let i = 0; i < 7; i++) topHoles.push(stadium(0, 0.722 + i * 0.0495, 0.0105, 0.027, nh));
  out.push(part(panel(tbOutline, topHoles, D.jT, 'xz', 0.00045), mats.phos, { p: [0, J.top - D.jT / 2, 0] }));
  const botHoles: V2[][] = [];
  for (let i = 0; i < 8; i++) botHoles.push(stadium(0, 0.652 + i * 0.0505, 0.0105, 0.027, nh));
  out.push(part(panel(tbOutline, botHoles, D.jT, 'xz', 0.00045), mats.phos, { p: [0, J.bot + D.jT / 2, 0] }));

  // --- rounded corner strips (annulus quarter sectors extruded along Z) ---
  const seg = detail === 'high' ? 9 : 5;
  for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const) {
    const a0 = Math.atan2(sy, sx) - Math.PI / 4;
    const pts: V2[] = [];
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([D.jR * Math.cos(a), D.jR * Math.sin(a)]);
    }
    for (let i = seg; i >= 0; i--) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([(D.jR - D.jT) * Math.cos(a), (D.jR - D.jT) * Math.sin(a)]);
    }
    const g = G.extrude(pts, len, 0);
    out.push(part(g, mats.phos, { p: [sx * (D.jW / 2 - D.jR), D.jY + sy * (D.jH / 2 - D.jR), cz] }));
  }

  // --- jacket nose (front closure) blending the square section into the round booster seat ---
  const n = 36;
  const noseSecs = [
    { z: D.jFront - 0.006, ring: G.superRing(D.jW / 2 + 0.0008, D.jH / 2 + 0.0008, n, 4.2), dy: D.jY },
    { z: D.jFront + 0.001, ring: G.superRing(D.jW / 2 + 0.0008, D.jH / 2 + 0.0008, n, 4.2), dy: D.jY },
    { z: D.jFront + 0.006, ring: G.superRing(0.0232, 0.0246, n, 3.0), dy: D.jY * 0.5 },
    { z: D.jFront + 0.01, ring: G.superRing(0.0218, 0.0218, n, 2.0), dy: 0 },
  ];
  out.push(part(G.loftZ(noseSecs, true, 50), mats.phos));
  // rivets: jacket to receiver and at the nose
  const rv: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
  for (const s of [1, -1]) {
    rv.push({ p: v(s * (D.jW / 2), D.jY + 0.008, D.jRear + 0.009), n: v(s, 0, 0) });
    rv.push({ p: v(s * (D.jW / 2), D.jY - 0.008, D.jRear + 0.009), n: v(s, 0, 0) });
    rv.push({ p: v(s * (D.jW / 2), D.jY, D.jFront - 0.014), n: v(s, 0, 0) });
  }
  out.push(part(G.scatter(G.rivetHead(0.002), rv), mats.phos));

  // --- barrel (visible through the slots) with its front bearing ---
  const barrel = latheZ(
    [
      [0, D.breech],
      [0.0148, D.breech],
      [0.0148, D.breech + 0.05],
      [0.0132, D.breech + 0.075],
      [0.0125, D.breech + 0.16],
      [0.0112, D.muzzle - 0.18],
      [0.0106, D.muzzle - 0.01],
      [0.0098, D.muzzle],
      [0, D.muzzle],
    ],
    detail === 'high' ? 28 : 16,
    30,
  );
  out.push(part(barrel, mats.blued));
  // locking-piece lugs at the breech end, seen through the opening
  out.push(part(G.rbox(0.03, 0.012, 0.02, 0.002, 2), mats.blued, { p: [0, 0, D.breech + 0.008] }));
  // inner muzzle bearing ring
  out.push(part(latheZ([[0.0106, D.jFront - 0.02], [0.019, D.jFront - 0.02], [0.019, D.jFront], [0.0106, D.jFront]], 24), mats.blued));

  // --- recoil booster (Rueckstossverstaerker) with flash-hider cone ---
  const boost = latheZ(
    [
      [0, D.jFront + 0.008],
      [0.0214, D.jFront + 0.008],
      [0.0222, D.jFront + 0.011],
      [0.0222, D.jFront + 0.022],
      [0.0203, D.jFront + 0.024],
      [0.0198, D.jFront + 0.026],
      [0.0198, 1.16],
      [0.0209, 1.1625],
      [0.0209, 1.1715],
      [0.0176, 1.175],
      [0.0172, 1.179],
      [0.0238, 1.2125],
      [0.0246, 1.2165],
      [0.0244, D.length],
      [0.0214, D.length],
      [0.0204, 1.2165],
      [0.0098, 1.188],
      [0.0056, 1.186],
      [0.0056, 1.178],
      [0, 1.178],
    ],
    detail === 'high' ? 40 : 20,
    32,
  );
  out.push(part(boost, mats.phos));
  // spanner notches around the locking ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    out.push(
      part(G.box(0.0019, 0.0022, 0.0105), mats.dark, {
        p: [Math.cos(a) * 0.02145, Math.sin(a) * 0.02145, D.jFront + 0.0165],
        r: [0, 0, (a * 180) / Math.PI],
      }),
    );
  }
  // dark muzzle cap bore
  out.push(part(cylZ(0.0046, 0.004, 16), mats.dark, { p: [0, 0, 1.1838] }));

  // --- barrel catch (Laufhalter) at the rear of the right-side opening ---
  const catchOutline: V2[] = [
    [0.0, -0.013],
    [0.074, -0.0115],
    [0.082, -0.006],
    [0.083, 0.006],
    [0.074, 0.0115],
    [0.0, 0.013],
  ];
  const catchG = panel(catchOutline, [], 0.0024, 'zy', 0.0007, 1);
  // slight outward bow so it clears the jacket skin
  const cat = part(catchG, mats.phos, { p: [-D.jW / 2 - 0.0014, D.jY, D.jRear + 0.012] });
  out.push(cat);
  out.push(part(new THREE.CylinderGeometry(0.0042, 0.0042, 0.03, 14), mats.phos, { p: [-D.jW / 2 - 0.0012, D.jY, D.jRear + 0.011] }));
  out.push(part(new THREE.CylinderGeometry(0.0021, 0.0021, 0.034, 10), mats.blued, { p: [-D.jW / 2 - 0.0012, D.jY, D.jRear + 0.011] }));
  // finger tab at the front of the catch
  out.push(part(G.rbox(0.008, 0.022, 0.006, 0.002, 2), mats.phos, { p: [-D.jW / 2 - 0.005, D.jY, D.jRear + 0.093], r: [0, -18, 0] }));

  // --- rear sight (Schiebevisier) ---
  out.push(...buildRearSight(mats));
  // --- front sight (folding post) ---
  out.push(...buildFrontSight(mats));
  // --- front bipod holder ---
  const holder = panel(
    roundRect(0, 0, D.jW + 0.0046, D.jH + 0.0046, D.jR + 0.002, 5),
    [roundRect(0, 0, D.jW + 0.0002, D.jH + 0.0002, D.jR, 5)],
    0.024,
    'xy',
    0.0009,
  );
  out.push(part(holder, mats.phos, { p: [0, D.jY, D.bipodZ] }));
  // holder lower lug with its latch spring
  out.push(part(G.rbox(0.03, 0.009, 0.024, 0.002, 2), mats.phos, { p: [0, J.bot - 0.0055, D.bipodZ] }));
  // --- sling hook eye under the jacket, just behind the bipod holder ---
  out.push(part(G.rbox(0.014, 0.003, 0.016, 0.001, 1), mats.phos, { p: [0, J.bot - 0.0012, D.slingEyeZ] }));
  const eye = G.torus(0.0052, 0.0013, 8, 18, Math.PI);
  eye.rotateZ(Math.PI);
  out.push(part(eye, mats.blued, { p: [0, J.bot - 0.002, D.slingEyeZ], r: [0, 90, 0] }));
  return out;
}

/** Point where the sling front hook engages the eye (B-frame). */
export const SLING_EYE = new THREE.Vector3(0, D.jY - D.jH / 2 - 0.0072, D.slingEyeZ);

function buildRearSight(mats: Mg42Mats): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y0 = J.top;
  const hingeZ = D.rsFront - 0.007;
  const hingeY = y0 + 0.009;
  const rearZ = D.notchZ - 0.004;
  const leafRise = 0.0125; // leaf raised to its lowest (200 m) setting
  const leafAng = Math.atan2(leafRise, hingeZ - rearZ);
  // base plate riveted to the jacket top
  out.push(part(G.rbox(0.021, 0.0028, D.rsFront - D.rsRear, 0.001, 2), mats.phos, { p: [0, y0 + 0.0012, (D.rsFront + D.rsRear) / 2] }));
  out.push(part(G.scatter(G.rivetHead(0.0018), [
    { p: v(0.0065, y0 + 0.0026, D.rsRear + 0.008) },
    { p: v(-0.0065, y0 + 0.0026, D.rsRear + 0.008) },
    { p: v(0.0065, y0 + 0.0026, D.rsFront - 0.02) },
    { p: v(-0.0065, y0 + 0.0026, D.rsFront - 0.02) },
  ]), mats.phos));
  // side walls with the curved ramp top (the slider rides on it)
  const wall: V2[] = [];
  const nW = 10;
  wall.push([D.rsRear + 0.002, y0 + 0.002]);
  wall.push([D.rsFront - 0.001, y0 + 0.002]);
  wall.push([D.rsFront - 0.001, hingeY + 0.004]);
  const tanA = Math.tan(leafAng);
  for (let i = 0; i <= nW; i++) {
    const t = i / nW;
    const z = hingeZ - 0.004 - t * (hingeZ - 0.004 - D.rsRear - 0.004);
    // ramp just under the leaf; the range slider rides on it
    const y = hingeY + (hingeZ - z) * tanA - 0.0036 - 0.0012 * Math.sin(Math.PI * t);
    wall.push([z, y]);
  }
  for (const s of [1, -1]) {
    out.push(part(G.plate(wall, 0.0018, 'zy', 0.0006), mats.phos, { p: [s * 0.0094, 0, 0] }));
  }
  // hinge pin with heads
  out.push(part(cylX(0.0017, 0.0235, 10), mats.blued, { p: [0, hingeY, hingeZ] }));
  for (const s of [1, -1]) out.push(part(cylX(0.0028, 0.0012, 12), mats.blued, { p: [s * 0.0112, hingeY, hingeZ] }));
  // leaf: hinged at the front, notch plate at the rear
  const leaf = new THREE.Group();
  const leafLen = hingeZ - rearZ;
  leaf.add(part(G.rbox(0.0145, 0.0026, leafLen + 0.004, 0.0009, 2), mats.blued, { p: [0, 0, -leafLen / 2] }));
  // notch plate (V notch)
  const notch: V2[] = [
    [-0.0082, 0],
    [0.0082, 0],
    [0.0082, 0.0118],
    [0.0021, 0.0118],
    [0, 0.0094],
    [-0.0021, 0.0118],
    [-0.0082, 0.0118],
  ];
  leaf.add(part(G.plate(notch, 0.0026, 'xy', 0.0005), mats.blued, { p: [0, 0.0006, -(hingeZ - D.notchZ) / Math.cos(leafAng)], r: [-(leafAng * 180) / Math.PI, 0, 0] }));
  // range slider with knurled thumb buttons
  const sl = new THREE.Group();
  sl.add(part(G.rbox(0.0186, 0.0058, 0.011, 0.0012, 2), mats.phos));
  for (const s of [1, -1]) {
    sl.add(part(cylX(0.0038, 0.004, 14), mats.blued, { p: [s * 0.0112, -0.0004, 0] }));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      sl.add(part(G.box(0.004, 0.0009, 0.0009), mats.blued, { p: [s * 0.0112, -0.0004 + Math.sin(a) * 0.0038, Math.cos(a) * 0.0038], r: [(a * 180) / Math.PI, 0, 0] }));
    }
  }
  sl.position.set(0, -0.0004, -leafLen * 0.62);
  leaf.add(sl);
  // range graduations on the leaf top (2 .. 20 = 200 .. 2000 m)
  for (let i = 0; i < 10; i++) {
    const z = -leafLen * 0.2 - i * 0.0052;
    if (Math.abs(z + leafLen * 0.62) < 0.007) continue;
    leaf.add(part(G.box(i % 2 === 0 ? 0.008 : 0.0045, 0.0003, 0.0006), mats.hardware, { p: [0.0026, 0.00135, z] }));
  }
  leaf.position.set(0, hingeY, hingeZ);
  leaf.rotation.x = leafAng; // rear end up
  out.push(leaf);

  // folding anti-aircraft rear peep, hinged on the base, folded forward along the left wall
  const aa = new THREE.Group();
  aa.add(part(G.rbox(0.0016, 0.0072, 0.036, 0.0006, 1), mats.phos, { p: [0, 0, 0.018] }));
  const ring = G.torus(0.0042, 0.0012, 8, 20);
  aa.add(part(ring, mats.phos, { p: [0, 0.0005, 0.039], r: [0, 90, 0] }));
  aa.add(part(cylX(0.0024, 0.004, 10), mats.blued, { p: [-0.001, 0, 0] }));
  aa.position.set(0.0114, y0 + 0.0072, D.rsRear + 0.006);
  out.push(aa);
  return out;
}

function buildFrontSight(mats: Mg42Mats): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y0 = J.top;
  const z = D.fsZ;
  // stamped base with hinge ears
  out.push(part(G.rbox(0.021, 0.003, 0.03, 0.001, 2), mats.phos, { p: [0, y0 + 0.0012, z + 0.002] }));
  const ear: V2[] = [
    [-0.011, 0],
    [0.011, 0],
    [0.009, 0.006],
    [0.004, 0.0105],
    [-0.004, 0.0105],
    [-0.009, 0.006],
  ];
  for (const s of [1, -1]) out.push(part(G.plate(ear, 0.0018, 'zy', 0.0005), mats.phos, { p: [s * 0.0056, y0 + 0.0025, z] }));
  out.push(part(cylX(0.0016, 0.0145, 10), mats.blued, { p: [0, y0 + 0.0085, z] }));
  // folding post with the inverted-V blade; tip on the sight line
  const postH = D.sightY - (y0 + 0.0085);
  const post: V2[] = [
    [-0.0042, -0.0035],
    [0.0042, -0.0035],
    [0.0042, postH * 0.55],
    [0.0024, postH * 0.8],
    [0.0006, postH - 0.0002],
    [0, postH],
    [-0.0006, postH - 0.0002],
    [-0.0024, postH * 0.8],
    [-0.0042, postH * 0.55],
  ];
  out.push(part(G.plate(post, 0.0034, 'zy', 0.0006), mats.blued, { p: [0, y0 + 0.0085, z], r: [0, 90, 0] }));
  // detent spring plunger in front of the post
  out.push(part(new THREE.CylinderGeometry(0.0022, 0.0022, 0.005, 12), mats.blued, { p: [0, y0 + 0.004, z + 0.011] }));
  out.push(part(G.scatter(G.rivetHead(0.0017), [
    { p: v(0.0065, y0 + 0.0027, z + 0.013) },
    { p: v(-0.0065, y0 + 0.0027, z + 0.013) },
    { p: v(0.0065, y0 + 0.0027, z - 0.009) },
    { p: v(-0.0065, y0 + 0.0027, z - 0.009) },
  ]), mats.phos));
  return out;
}

/** Group helper so callers can transform the jacket as one piece if needed. */
export function jacketGroup(mats: Mg42Mats, detail: 'high' | 'low' = 'high'): THREE.Group {
  return group(buildJacket(mats, detail));
}
