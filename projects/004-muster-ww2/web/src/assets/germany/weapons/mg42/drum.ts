/**
 * 50-round belt drum (Gurttrommel 34) hooked onto the left (feed) side of the feed tray, with a short
 * stub of the linked belt (7.92 x 57 mm rounds, bullets forward) entering the tray. B-frame (util.ts).
 * The drum's axis is parallel to the bore: the belt is coiled with the rounds lying along +Z.
 */
import { THREE, G, part } from '../../../../core/kit';
import type { Mg42Mats } from './materials';
import { D } from './dims';
import { latheZ, cylX, type V2 } from './util';

const C = { x: D.drumX, y: D.drumY - 0.002 };
const R = 0.054;
const Z0 = D.drumZ - 0.044, Z1 = D.drumZ + 0.044;
/** belt mouth box (x0..x1, y0..y1) at the top inner corner */
const MOUTH = { x0: 0.058, x1: 0.079, y0: -0.012, y1: 0.0205 };
/** open belt throat between two lips, from the mouth to the tray edge */
const THROAT_X0 = 0.0455;
export const BELT_Y = 0.0118;
export const CASE_Z0 = D.trayRear - 0.0005;

function drumOutline(n = 120): V2[] {
  const smax = (a: number, b: number, k: number) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.max(a, b) + (h * h * k) / 4;
  };
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const dx = Math.cos(th), dy = Math.sin(th);
    // ray / box slab intersection (far hit)
    let tmin = -Infinity, tmax = Infinity;
    for (const [o, d, a, b] of [[C.x, dx, MOUTH.x0, MOUTH.x1], [C.y, dy, MOUTH.y0, MOUTH.y1]] as const) {
      if (Math.abs(d) < 1e-9) {
        if (o < a || o > b) tmax = -1;
      } else {
        const t0 = (a - o) / d, t1 = (b - o) / d;
        tmin = Math.max(tmin, Math.min(t0, t1));
        tmax = Math.min(tmax, Math.max(t0, t1));
      }
    }
    const rb = tmax > Math.max(0, tmin) ? tmax : 0;
    const r = smax(R, rb, 0.008);
    pts.push([C.x + dx * r, C.y + dy * r]);
  }
  return pts;
}

/** 7.92 x 57 round along +Z, case head at z = 0: [case, bullet] geometries. */
export function cartridge(seg = 16): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const caseG = latheZ(
    [
      [0, 0],
      [0.0053, 0],
      [0.006, 0.0006],
      [0.006, 0.0012],
      [0.005, 0.0017],
      [0.005, 0.0026],
      [0.0059, 0.0032],
      [0.0056, 0.047],
      [0.0048, 0.0515],
      [0.0045, 0.052],
      [0.0045, 0.057],
      [0.004, 0.057],
    ],
    seg,
    30,
  );
  const bullet = latheZ(
    [
      [0, 0.0566],
      [0.0041, 0.0566],
      [0.0041, 0.062],
      [0.0037, 0.0675],
      [0.0029, 0.0728],
      [0.0018, 0.0774],
      [0.0007, 0.0801],
      [0, 0.0806],
    ],
    seg,
    60,
  );
  return [caseG, bullet];
}

export function buildDrum(mats: Mg42Mats, detail: 'high' | 'low' = 'high'): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const outline = drumOutline(detail === 'high' ? 120 : 64);
  const sh = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const body = new THREE.ExtrudeGeometry(sh, { depth: Z1 - Z0 - 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelOffset: -0.003, bevelSegments: 3, curveSegments: 4 });
  body.translate(0, 0, Z0 + 0.003);
  out.push(part(G.crease(body, 40), mats.drum));
  // pressed stiffening beads on both faces
  for (const [zf, s] of [[Z0, -1], [Z1, 1]] as const) {
    const bead = latheZ([[0.03, 0], [0.0312, 0.0009], [0.0395, 0.0009], [0.0405, 0]], 64, 40);
    out.push(part(bead, mats.drum, { p: [C.x, C.y, zf], s: [1, 1, s] }));
    // centre boss (belt reel axle)
    out.push(part(latheZ([[0, 0], [0.0085, 0], [0.0085, 0.0012], [0.0065, 0.002], [0, 0.002]], 32, 40), mats.drum, { p: [C.x, C.y, zf], s: [1, 1, s] }));
  }
  // lid hinge along the lower outer edge, lid seam, spring latch on the outer side
  const hingeA = -0.95;
  const hx = C.x + (R + 0.0022) * Math.cos(hingeA), hy = C.y + (R + 0.0022) * Math.sin(hingeA);
  const hinge = new THREE.CylinderGeometry(0.0034, 0.0034, Z1 - Z0 - 0.008, 16);
  hinge.rotateX(Math.PI / 2);
  out.push(part(hinge, mats.drum, { p: [hx, hy, (Z0 + Z1) / 2] }));
  const la = 0.42;
  const lx = C.x + R * Math.cos(la), ly = C.y + R * Math.sin(la);
  // the latch is painted with the drum (bare steel here read as a white label under the key light)
  out.push(part(G.rbox(0.005, 0.02, 0.014, 0.0016, 2), mats.drum, { p: [lx + 0.0015, ly, (Z0 + Z1) / 2], r: [0, 0, (la * 180) / Math.PI] }));
  out.push(part(G.rbox(0.004, 0.006, 0.02, 0.0014, 2), mats.drum, { p: [lx + 0.0035, ly - 0.009, (Z0 + Z1) / 2], r: [0, 0, (la * 180) / Math.PI] }));
  // folding carrying handle (wire bail) lying on the top of the drum
  const top = C.y + R;
  const bail = [
    new THREE.Vector3(C.x + 0.012, top - 0.005, Z0 + 0.004),
    new THREE.Vector3(C.x + 0.016, top + 0.0035, Z0 + 0.012),
    new THREE.Vector3(C.x + 0.018, top + 0.0045, D.drumZ),
    new THREE.Vector3(C.x + 0.016, top + 0.0035, Z1 - 0.012),
    new THREE.Vector3(C.x + 0.012, top - 0.005, Z1 - 0.004),
  ];
  out.push(part(G.tube(bail, 0.0022, 10, 48), mats.hardware));
  for (const z of [Z0 + 0.003, Z1 - 0.003]) out.push(part(G.rbox(0.008, 0.009, 0.004, 0.0014, 2), mats.drum, { p: [C.x + 0.012, top - 0.004, z] }));
  // open belt throat: upper and lower lips running to the tray edge, dark back wall
  const lipW = MOUTH.x0 - THROAT_X0 + 0.004;
  out.push(part(G.rbox(lipW, 0.0021, Z1 - Z0 - 0.004, 0.0008, 2), mats.drum, { p: [THROAT_X0 + lipW / 2 - 0.0005, 0.0194, D.drumZ] }));
  out.push(part(G.rbox(lipW, 0.0021, Z1 - Z0 - 0.004, 0.0008, 2), mats.drum, { p: [THROAT_X0 + lipW / 2 - 0.0005, 0.0042, D.drumZ] }));
  out.push(part(G.rbox(0.0008, 0.0135, Z1 - Z0 - 0.01, 0.0003, 1), mats.dark, { p: [MOUTH.x0 - 0.0003, BELT_Y, D.drumZ] }));
  // mounting hook over the feed tray's left edge
  out.push(part(G.rbox(0.014, 0.0022, 0.03, 0.0008, 2), mats.hardware, { p: [0.0492, 0.0012, D.drumZ] }));
  out.push(part(G.rbox(0.0022, 0.0052, 0.03, 0.0008, 2), mats.hardware, { p: [0.0436, 0.0034, D.drumZ] }));

  // ---- belt stub: two rounds and their links between the mouth and the feed tray
  const [caseG, bulletG] = cartridge(detail === 'high' ? 18 : 12);
  const band = latheZ([[0.0061, 0], [0.0066, 0.0003], [0.0066, 0.0105], [0.0061, 0.0108]], 18, 40);
  const xs = [0.0512, 0.0372];
  for (const x of xs) {
    out.push(part(caseG, mats.brass, { p: [x, BELT_Y, CASE_Z0] }));
    out.push(part(bulletG, mats.bullet, { p: [x, BELT_Y, CASE_Z0] }));
    for (const zb of [0.012, 0.034]) out.push(part(band, mats.link, { p: [x, BELT_Y, CASE_Z0 + zb] }));
  }
  // link hinge coils joining the rounds (under the belt), and the start of the next link in the mouth
  for (const zb of [0.017, 0.039]) {
    out.push(part(cylX(0.0016, 0.03, 10), mats.link, { p: [(xs[0] + xs[1]) / 2 + 0.004, BELT_Y - 0.0058, CASE_Z0 + zb] }));
  }
  return out;
}
