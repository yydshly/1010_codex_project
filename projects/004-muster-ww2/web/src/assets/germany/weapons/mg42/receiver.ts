/**
 * MG 42 receiver group (B-frame): stamped receiver body with riveted bolt guides, rear end cap,
 * top-hinged feed cover with its latch, feed tray, cocking handle on the right, trigger housing
 * with push-through safety, large stamped trigger guard, trigger, and the pistol grip with
 * Bakelite panels.
 */
import { THREE, G, part, group } from '../../../../core/kit';
import type { Mg42Mats } from './materials';
import { D } from './dims';
import { cylX, cylZ, latheZ, panel, rad, roundRect, slottedScrew, v, warp, type V2 } from './util';

/** Pistol grip axis (B-frame): top point and unit direction pointing DOWN the grip. */
export const GRIP_TOP = new THREE.Vector3(0, D.gripTopY, D.gripTopZ);
export const GRIP_DOWN = new THREE.Vector3(0, -Math.cos(rad(D.gripRake)), -Math.sin(rad(D.gripRake)));
/** Point on the grip axis at distance s from the top. */
export const gripAt = (s: number) => GRIP_TOP.clone().addScaledVector(GRIP_DOWN, s);

/** Side-view outline of the grip in grip-local (z forward, y up; y = 0 at the top). */
const GRIP_OUTLINE: V2[] = [
  [0.0205, 0.006],
  [0.0215, -0.02],
  [0.021, -0.05],
  [0.0195, -0.08],
  [0.0172, -0.098],
  [0.0125, -0.108],
  [0.004, -0.1115],
  [-0.006, -0.1115],
  [-0.0145, -0.1085],
  [-0.0198, -0.1015],
  [-0.0222, -0.085],
  [-0.0236, -0.058],
  [-0.023, -0.03],
  [-0.0212, -0.008],
  [-0.021, 0.006],
];

function gripLocalToB(g: THREE.Object3D): THREE.Object3D {
  // grip-local +Y is along the grip axis (up); rotate so the bottom sweeps back by the rake
  return group([g], { p: [GRIP_TOP.x, GRIP_TOP.y, GRIP_TOP.z], r: [D.gripRake, 0, 0] });
}

export function buildPistolGrip(mats: Mg42Mats): THREE.Object3D {
  const parts: THREE.Object3D[] = [];
  // steel frame (front strap, back strap, bottom) - narrower than the panels
  parts.push(part(panel(GRIP_OUTLINE, [], 0.0215, 'zy', 0.0022, 2), mats.phos));
  // Bakelite panels: inset outline, domed outward, with a raised border
  const inset: V2[] = GRIP_OUTLINE.filter(([, y]) => y < 0.004).map(([z, y]) => [z * 0.84 - 0.0005, Math.max(-0.1035, y * 0.95 - 0.004)]);
  inset.push([0.017, -0.004], [-0.018, -0.004]);
  for (const s of [1, -1]) {
    const g = panel(inset, [], 0.0052, 'zy', 0.0019, 2);
    warp(g, (p) => {
      const u = p.z / 0.021, w = (p.y + 0.055) / 0.055;
      const dome = Math.max(0, 1 - u * u) * Math.max(0, 1 - w * w * 0.6);
      if (p.x > 0) p.x += 0.0016 * dome;
    });
    g.computeVertexNormals();
    parts.push(part(G.crease(g, 45), mats.gripPanel, { p: [s * 0.0112, 0, 0], s: [s, 1, 1] }));
    // panel screw
    parts.push(slottedScrew(0.0031, 0.0012, mats.blued, mats.dark, { p: [s * 0.0152, -0.056, -0.001], r: [0, 0, -90 * s] }, 70));
  }
  // lanyard / bottom plate
  parts.push(part(G.rbox(0.0205, 0.003, 0.03, 0.0012, 2), mats.phos, { p: [0, -0.1112, -0.001] }));
  return gripLocalToB(group(parts));
}

export function buildReceiver(mats: Mg42Mats): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const recLen = D.recFront - D.recRear;
  const recH = D.recTop - D.recBot;
  const recCy = (D.recTop + D.recBot) / 2;
  const recCz = (D.recFront + D.recRear) / 2;

  // rear end cap (Bodenstueck) with its locking ring
  out.push(
    part(
      latheZ([
        [0, D.capRear],
        [0.021, D.capRear],
        [0.0232, D.capRear + 0.002],
        [0.0232, D.capFront - 0.012],
        [0.0242, D.capFront - 0.01],
        [0.0242, D.capFront - 0.004],
        [0.0236, D.capFront],
        [0, D.capFront],
      ], 40, 35),
      mats.phos,
      { p: [0, D.capY, 0] },
    ),
  );
  // stock catch button under the end cap
  out.push(part(G.rbox(0.012, 0.007, 0.012, 0.0025, 2), mats.blued, { p: [0, D.capY - 0.026, D.capFront - 0.008] }));

  // receiver body: stamped box
  out.push(part(G.rbox(D.recW, recH, recLen, 0.0055, 3), mats.phos, { p: [0, recCy, recCz] }));
  // rear top: rounded shoulder behind the feed cover
  out.push(part(G.rbox(D.recW - 0.004, 0.006, 0.07, 0.0028, 2), mats.phos, { p: [0, D.recTop + 0.001, D.recRear + 0.036] }));
  // pressed reinforcing ribs and riveted bolt guides on both sides
  for (const s of [1, -1]) {
    out.push(part(G.rbox(0.002, 0.008, 0.25, 0.0009, 2), mats.phos, { p: [s * (D.recW / 2 + 0.0005), -0.021, 0.46] }));
    const rv: { p: THREE.Vector3; n: THREE.Vector3 }[] = [];
    for (let i = 0; i < 7; i++) rv.push({ p: v(s * (D.recW / 2 + 0.0014), -0.021, 0.345 + i * 0.037), n: v(s, 0, 0) });
    for (let i = 0; i < 3; i++) rv.push({ p: v(s * (D.recW / 2), -0.031 + i * 0.019, D.recFront - 0.007), n: v(s, 0, 0) });
    rv.push({ p: v(s * (D.recW / 2), 0.009, D.recRear + 0.012), n: v(s, 0, 0) });
    out.push(part(G.scatter(G.rivetHead(0.0022), rv), mats.phos));
  }
  // receiver front face step onto the jacket: small collar
  out.push(part(panel(roundRect(0, 0, D.recW + 0.001, recH + 0.001, 0.006, 4), [roundRect(0, 0, 0.044, 0.048, 0.01, 4)], 0.004, 'xy', 0.0008), mats.phos, { p: [0, recCy, D.recFront - 0.0015] }));

  // ejection port cover on the underside (spring flap) and its hinge
  out.push(part(G.rbox(0.03, 0.0014, 0.056, 0.0006, 1), mats.phos, { p: [0, D.recBot - 0.0006, D.feedZ + 0.004] }));
  out.push(part(cylX(0.0022, 0.032, 10), mats.blued, { p: [0, D.recBot - 0.0012, D.feedZ - 0.025] }));
  // centre bipod holder lug (the bipod can also be fitted here)
  out.push(part(G.rbox(0.03, 0.009, 0.022, 0.002, 2), mats.phos, { p: [0, D.jY - D.jH / 2 - 0.004, D.jRear + 0.022] }));
  out.push(part(cylX(0.0024, 0.034, 10), mats.blued, { p: [0, D.jY - D.jH / 2 - 0.005, D.jRear + 0.022] }));

  // ---- feed cover (Deckel) ----
  const coverSecs: [number, number][] = [
    [D.coverRear, 0.014],
    [D.coverRear + 0.008, 0.021],
    [0.37, 0.025],
    [0.46, 0.026],
    [0.495, 0.031],
    [0.515, 0.035],
    [0.583, 0.0355],
    [0.595, 0.03],
    [D.coverFront, 0.022],
  ];
  const cy0 = 0.013;
  const cover = G.loftZ(
    coverSecs.map(([z, h], i) => ({
      z,
      ring: G.superRing(0.027 - (i === 0 ? 0.002 : 0), h, 36, 2.3, h, 0.004),
      dy: cy0,
    })),
    true,
    55,
  );
  out.push(part(cover, mats.phos));
  // cover spine rib and pressed side lines
  out.push(part(G.rbox(0.009, 0.003, 0.135, 0.0012, 2), mats.phos, { p: [0, cy0 + 0.0258, 0.415] }));
  for (const s of [1, -1]) {
    out.push(part(G.rbox(0.0016, 0.004, 0.2, 0.0007, 1), mats.phos, { p: [s * 0.0268, cy0 + 0.002, 0.47] }));
  }
  // feed-lever pivot rivet on top of the cover
  out.push(part(latheZ([[0, 0], [0.0052, 0], [0.0052, 0.0012], [0.0036, 0.0022], [0, 0.0024]], 20), mats.blued, { p: [0, cy0 + 0.0352, 0.548], r: [-90, 0, 0] }));
  // front hinge knuckles and pin
  for (const s of [1, -1]) out.push(part(cylX(0.0046, 0.012, 16), mats.phos, { p: [s * 0.0235, 0.028, D.coverFront - 0.004] }));
  out.push(part(cylX(0.0022, 0.0615, 10), mats.blued, { p: [0, 0.028, D.coverFront - 0.004] }));
  // cover latch at the rear: spring catch block with a ribbed thumb piece
  out.push(part(G.rbox(0.03, 0.013, 0.018, 0.003, 2), mats.phos, { p: [0, D.recTop + 0.007, D.coverRear - 0.004] }));
  for (let i = 0; i < 4; i++) {
    out.push(part(G.rbox(0.022, 0.0015, 0.0016, 0.0005, 1), mats.blued, { p: [0, D.recTop + 0.0142, D.coverRear - 0.0105 + i * 0.0035] }));
  }

  // ---- feed tray (belt enters on the left, leaves on the right) ----
  const trayLen = D.trayFront - D.trayRear;
  const trayCz = (D.trayFront + D.trayRear) / 2;
  // left shelf with raised outer belt guide
  out.push(part(G.rbox(0.03, 0.0035, trayLen, 0.0012, 2), mats.phos, { p: [0.036, 0.004, trayCz] }));
  // low outer lip (the belt passes over it) and the cartridge stop behind the case heads
  out.push(part(G.rbox(0.003, 0.0034, trayLen, 0.0012, 2), mats.phos, { p: [0.0505, 0.0048, trayCz] }));
  out.push(part(G.rbox(0.028, 0.009, 0.003, 0.001, 1), mats.phos, { p: [0.037, 0.0095, D.trayRear - 0.0035] }));
  // right exit shelf
  out.push(part(G.rbox(0.022, 0.0035, trayLen, 0.0012, 2), mats.phos, { p: [-0.032, 0.004, trayCz] }));
  out.push(part(G.rbox(0.003, 0.009, trayLen, 0.0012, 2), mats.phos, { p: [-0.0425, 0.0075, trayCz] }));
  // tray side walls below the cover (belt channel openings in dark)
  for (const s of [1, -1]) {
    out.push(part(G.box(0.001, 0.009, trayLen - 0.006), mats.dark, { p: [s * 0.0253, 0.0095, trayCz] }));
  }

  // ---- cocking handle (right side): slot and stamped handle, forward position ----
  out.push(part(G.box(0.0012, 0.0065, 0.2), mats.dark, { p: [-D.recW / 2 - 0.0002, -0.004, 0.47] }));
  const ch: V2[] = [
    [0, -0.005],
    [0.018, -0.005],
    [0.024, -0.003],
    [0.03, -0.0055],
    [0.032, 0.0],
    [0.03, 0.0055],
    [0.024, 0.003],
    [0.018, 0.005],
    [0, 0.005],
  ];
  const handle = panel(ch, [], 0.012, 'xy', 0.0022, 2);
  out.push(part(handle, mats.phos, { p: [-D.recW / 2 + 0.002, -0.004, 0.566], s: [-1, 1, 1] }));
  out.push(part(cylZ(0.0038, 0.02, 12), mats.blued, { p: [-D.recW / 2 - 0.0005, -0.004, 0.566] }));

  // ---- trigger housing (Griffstueck) ----
  const hLen = D.housingFront - D.housingRear;
  const hTop = D.recBot + 0.003;
  const hH = hTop - D.housingBot;
  out.push(part(G.rbox(0.03, hH, hLen, 0.005, 3), mats.phos, { p: [0, (hTop + D.housingBot) / 2, (D.housingFront + D.housingRear) / 2] }));
  // housing retaining pins with heads
  for (const z of [D.housingRear + 0.014, D.housingFront - 0.012]) {
    out.push(part(cylX(0.0021, 0.034, 10), mats.blued, { p: [0, D.recBot - 0.004, z] }));
    for (const s of [1, -1]) out.push(part(cylX(0.0036, 0.0016, 14), mats.blued, { p: [s * 0.0158, D.recBot - 0.004, z] }));
  }
  // push-through safety button (Sicherung)
  out.push(part(cylX(0.0046, 0.036, 16), mats.blued, { p: [0, -0.0555, 0.337] }));
  for (const s of [1, -1]) {
    out.push(part(G.torus(0.0052, 0.0009, 6, 18), mats.phos, { p: [s * 0.0151, -0.0555, 0.337], r: [0, 90, 0] }));
  }

  // ---- trigger guard: stamped strap loop ----
  const guardPts: THREE.Vector3[] = [
    v(0, D.housingBot + 0.001, 0.334),
    v(0, -0.083, 0.3355),
    v(0, -0.0955, 0.344),
    v(0, -0.0985, 0.366),
    v(0, -0.0935, 0.391),
    v(0, -0.08, 0.4015),
    v(0, D.housingBot + 0.001, 0.4035),
  ];
  const gc = v(0, -0.08, 0.368);
  const guardN = guardPts.map((p) => p.clone().sub(gc).setX(0).normalize());
  out.push(part(G.strap(guardPts, 0.012, 0.0032, guardN, { samples: 40 }), mats.phos));
  // trigger blade
  const trigPts = [v(0, D.housingBot + 0.004, 0.374), v(0, -0.077, 0.3735), v(0, -0.0855, 0.3695), v(0, -0.0895, 0.363)];
  const trigN = trigPts.map(() => v(0, 0, 1));
  out.push(part(G.strap(trigPts, 0.0075, 0.0045, trigN, { samples: 16 }), mats.blued));

  // pistol grip
  out.push(buildPistolGrip(mats));
  return out;
}
