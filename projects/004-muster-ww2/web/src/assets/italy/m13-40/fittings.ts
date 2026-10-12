/**
 * M13/40 external fittings (III serie layout): tool boxes and exhaust silencers on the rear
 * mudguards, headlights on the front guards beside the superstructure, spare track links on the
 * glacis, shovel and pick on the right sponson side, the rear spare road wheel (right) and jack
 * (left), towing ring and hooks front and rear, the number plate with its tail light, and the
 * radio mast (RF1CA set) lowered along the right of the engine deck.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { H, R } from './dims';
import type { Pal } from './palette';
import { type TrackSolution, spareLinkGeometry } from './track';
import { rb, bolt, nut, cylX, cylZ, latheZ, merge, faceTo, type P3 } from './util';
import { supW, deckY } from './hull';

/* ------------------------------------------------------------------------------------------ */

function rearGuardKit(P: Pal): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const x = (H.xEng + H.xGuard) / 2 - 0.004;
  const y0 = H.yGuard + 0.007;
  // tool box: body, overlapping lid, hinges on the inner edge, two hasps on the outer face
  const bz0 = -0.47, bz1 = -1.16, bw = 0.25, bh = 0.23;
  const bl = bz0 - bz1, bzc = (bz0 + bz1) / 2;
  out.push(part(rb(bw, bh, bl, 0.008), P.sheet, { p: [x, y0 + bh / 2, bzc] }));
  out.push(part(rb(bw + 0.014, 0.022, bl + 0.014, 0.006), P.sheet, { p: [x, y0 + bh + 0.004, bzc] }));
  for (const z of [bz0 - 0.12, bz1 + 0.12]) {
    out.push(part(cylZ(0.011, 0.09, 10, z), P.sheet, { p: [x - bw / 2 - 0.004, y0 + bh + 0.006, 0] }));
    out.push(part(rb(0.012, 0.07, 0.034, 0.003), P.cast, { p: [x + bw / 2 + 0.007, y0 + bh - 0.02, z] }));
    out.push(part(G.torus(0.012, 0.0035, 6, 12), P.cast, { p: [x + bw / 2 + 0.014, y0 + bh - 0.06, z], r: [0, 90, 0] }));
  }
  // pressed stiffening swages on the outer face
  for (const z of [bzc - 0.12, bzc + 0.12]) out.push(part(rb(0.006, bh - 0.08, 0.05, 0.003), P.sheet, { p: [x + bw / 2, y0 + bh / 2 - 0.01, z] }));

  // exhaust silencer on two saddles and straps, inlet pipe from the engine compartment side
  const mr = 0.092, mz0 = -1.32, mz1 = -2.14, my = y0 + 0.03 + mr;
  const mcz = (mz0 + mz1) / 2, ml = mz0 - mz1;
  out.push(
    part(
      latheZ(
        [
          [0.0, -ml / 2],
          [mr - 0.03, -ml / 2],
          [mr - 0.006, -ml / 2 + 0.012],
          [mr, -ml / 2 + 0.03],
          [mr, ml / 2 - 0.03],
          [mr - 0.006, ml / 2 - 0.012],
          [mr - 0.03, ml / 2],
          [0.0, ml / 2],
        ],
        28,
        35,
      ),
      P.exhaust,
      { p: [x, my, mcz] },
    ),
  );
  for (const z of [mz0 - 0.14, mz1 + 0.14]) {
    out.push(part(G.torus(mr + 0.004, 0.006, 6, 32), P.sheet, { p: [x, my, z] }));
    out.push(part(rb(0.2, 0.034, 0.05, 0.005), P.sheet, { p: [x, y0 + 0.017, z] }));
  }
  const pipe = G.tube(
    [
      [H.xEng - 0.01, my + 0.02, mz0 + 0.1],
      [H.xEng + 0.05, my + 0.02, mz0 + 0.1],
      [x, my, mz0 + 0.07],
      [x, my, mz0 - 0.01],
    ],
    0.03,
    12,
    24,
  );
  out.push(part(pipe, P.exhaust));
  out.push(part(G.cyl(0.05, 0.05, 0.012, 16), P.exhaust, { p: [H.xEng + 0.004, my + 0.02, mz0 + 0.1], r: [0, 0, 90] }));
  // tail pipe out of the rear cap
  out.push(part(G.tube([[x, my - 0.02, mz1 + 0.01], [x, my - 0.03, mz1 - 0.06], [x, my - 0.06, mz1 - 0.1]], 0.024, 10, 12), P.exhaust));
  out.push(part(cylZ(0.016, 0.004, 10, 0).rotateX(0.6), P.void, { p: [x, my - 0.062, mz1 - 0.102] }));
  return group(out);
}

/* ------------------------------------------------------------------------------------------ */

function headlight(P: Pal): THREE.Group {
  const r = 0.085;
  const body = latheZ(
    [
      [0.0, -0.11],
      [0.045, -0.105],
      [0.075, -0.07],
      [r, -0.02],
      [r, 0.0],
      [r - 0.008, 0.006],
      [r - 0.012, 0.0],
    ],
    24,
    40,
  );
  const lens = latheZ([[0.0, 0.004], [r - 0.012, 0.0], [r - 0.012, -0.004], [0.0, -0.004]], 24, 60);
  return group([
    part(body, P.sheet),
    part(lens, P.glass),
    part(latheZ([[0.0, -0.02], [0.05, -0.02], [0.045, -0.035], [0, -0.035]], 16, 60), P.toolSteel),
    // yoke and post
    part(G.torus(0.09, 0.008, 6, 16, Math.PI), P.sheet, { p: [0, 0, -0.05], r: [0, 90, 180] }),
    part(G.cyl(0.014, 0.016, 0.12, 10), P.sheet, { p: [0, -0.15, -0.05] }),
    part(G.cyl(0.035, 0.04, 0.012, 14), P.sheet, { p: [0, -0.21, -0.05] }),
  ]);
}

/* ------------------------------------------------------------------------------------------ */

function spareWheel(P: Pal): THREE.Group {
  // single road wheel of the doubled pair: tyre and pressed disc, face towards +Z (local)
  const Rt = R.wheelR, rs = Rt - 0.032, w = R.tyreW;
  const tyre = latheZ(
    [
      [rs, 0.002],
      [Rt - 0.012, 0],
      [Rt, 0.01],
      [Rt, w - 0.01],
      [Rt - 0.012, w],
      [rs, w - 0.002],
      [rs, 0.002],
    ],
    28,
    35,
  );
  const disc = latheZ(
    [
      [rs + 0.001, 0.004],
      [rs + 0.001, w - 0.002],
      [rs - 0.004, w + 0.004],
      [0.075, w - 0.012],
      [0.07, w - 0.004],
      [0.05, w + 0.004],
      [0.046, w + 0.03],
      [0.0, w + 0.034],
    ],
    24,
    30,
  );
  return group([
    part(tyre, P.rubber),
    part(disc, P.cast),
    part(latheZ([[0.0, -0.06], [0.03, -0.06], [0.03, 0.01], [0.0, 0.01]], 12, 40), P.cast),
    part(G.scatter(nut(0.018, 0.009), Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      return { p: new THREE.Vector3(Math.cos(a) * 0.036, Math.sin(a) * 0.036, w + 0.004), n: new THREE.Vector3(0, 0, 1) };
    })), P.cast),
  ]);
}

function jack(P: Pal): THREE.Group {
  return group([
    part(G.cyl(0.045, 0.045, 0.26, 18), P.sheet, { p: [0, 0.02, 0] }),
    part(G.cyl(0.028, 0.028, 0.08, 12), P.toolSteel, { p: [0, 0.19, 0] }),
    part(G.cyl(0.04, 0.04, 0.02, 14), P.toolSteel, { p: [0, 0.235, 0] }),
    part(rb(0.14, 0.02, 0.12, 0.005), P.sheet, { p: [0, -0.12, 0] }),
    part(G.rod([0.045, 0.06, 0], [0.12, 0.06, 0], 0.01, 8), P.toolSteel),
  ]);
}

function towHook(P: Pal): THREE.Group {
  return group([
    part(rb(0.1, 0.08, 0.05, 0.008), P.cast, { p: [0, 0, 0.025] }),
    part(G.torus(0.035, 0.014, 8, 16, Math.PI * 1.35), P.cast, { p: [0, -0.005, 0.07], r: [0, 90, 125] }),
  ]);
}

function towRing(P: Pal): THREE.Group {
  return group([
    part(rb(0.12, 0.05, 0.05, 0.008), P.cast, { p: [0, 0, 0.025] }),
    part(G.cyl(0.013, 0.013, 0.12, 10), P.cast, { p: [0, 0, 0.05], r: [0, 0, 90] }),
    part(G.torus(0.055, 0.013, 8, 24), P.cast, { p: [0, -0.05, 0.06], r: [0, 90, 0] }),
  ]);
}

/* ------------------------------------------------------------------------------------------ */

function tools(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // on the right (-X) sponson side, stowed horizontally in clips
  const xs = (y: number, d: number) => -(supW(y) + d);
  // shovel
  const sy = 1.53;
  out.push(part(cylZ(0.017, 0.82, 12, 0.24), P.wood, { p: [xs(sy, 0.03), sy, 0] }));
  out.push(part(G.torus(0.04, 0.009, 6, 14), P.wood, { p: [xs(sy, 0.03), sy, -0.2], r: [0, 90, 0] }));
  const blade = G.shape([[-0.09, 0], [0.09, 0], [0.095, 0.2], [0.04, 0.27], [-0.04, 0.27], [-0.095, 0.2]], 0.01);
  const bg = G.extrude(blade, 0.004, 0.0015);
  out.push(part(bg, P.toolSteel, { p: [xs(sy, 0.035), sy, 0.63], r: [0, 90, 90] }));
  out.push(part(cylZ(0.024, 0.08, 12, 0.63), P.toolSteel, { p: [xs(sy, 0.03), sy, 0] }));
  // pick
  const py = 1.24;
  out.push(part(cylZ(0.02, 0.86, 12, 0.18), P.wood, { p: [xs(py, 0.03), py, 0] }));
  const head = G.tube([[0, -0.22, -0.03], [0, -0.1, 0.0], [0, 0, 0.01], [0, 0.1, 0.0], [0, 0.22, -0.03]], 0.014, 8, 24);
  out.push(part(head, P.toolSteel, { p: [xs(py, 0.03), py, 0.62] }));
  out.push(part(rb(0.05, 0.06, 0.05, 0.008), P.toolSteel, { p: [xs(py, 0.03), py, 0.62] }));
  // clips (bent straps) holding the handles to the side plate
  for (const [y, z] of [[sy, -0.05], [sy, 0.45], [py, -0.1], [py, 0.4]]) {
    const x0 = -supW(y), x1 = xs(y, 0.055);
    out.push(part(rb(Math.abs(x1 - x0), 0.012, 0.03, 0.004), P.sheet, { p: [(x0 + x1) / 2, y - 0.024, z] }));
    out.push(part(rb(0.008, 0.05, 0.03, 0.003), P.sheet, { p: [x1, y - 0.004, z] }));
  }
  return out;
}

/* ------------------------------------------------------------------------------------------ */

function spareLinks(P: Pal, sol: TrackSolution): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const { link, pin } = spareLinkGeometry(sol);
  // glacis (shallow flat part of the transmission cover): from (2.03, 1.05) to (~1.58, 1.105)
  const a = new THREE.Vector3(0, 1.05, 2.03), b = new THREE.Vector3(0, H.yGlacisTop, 1.58);
  const dir = new THREE.Vector3().subVectors(a, b).normalize(); // down the slope (forward)
  const n = new THREE.Vector3(0, dir.z, -dir.y).normalize();
  if (n.y < 0) n.negate();
  const X = new THREE.Vector3(1, 0, 0);
  const mid = a.clone().lerp(b, 0.5);
  const lift = R.plateT / 2 + R.cleat;
  for (const sx of [0.4, -0.4]) {
    for (let k = -1; k <= 1; k++) {
      const c = mid.clone().addScaledVector(dir, k * sol.pitch).addScaledVector(n, lift);
      c.x = sx;
      const m = new THREE.Mesh(link, P.track);
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, n, dir));
      m.position.copy(c);
      out.push(m);
      if (k < 1) {
        const pc = c.clone().addScaledVector(dir, sol.pitch / 2);
        out.push(part(pin, P.track, { p: pc }));
      }
    }
    // retaining bar with end brackets
    const bar0 = mid.clone().addScaledVector(n, lift + 0.03);
    out.push(part(cylX(0.009, 0.3, 8), P.sheet, { p: [sx, bar0.y, bar0.z] }));
    for (const dx of [0.155, -0.155]) {
      out.push(part(rb(0.02, 0.05, 0.03, 0.004), P.sheet, { p: [sx + dx, bar0.y - 0.02, bar0.z] }));
      out.push(part(G.scatter(bolt(0.009, 0.006), [{ p: new THREE.Vector3(sx + dx, mid.y + 0.001, mid.z + 0.03), n: new THREE.Vector3(0, 1, 0) }]), P.cast));
    }
  }
  return out;
}

/* ------------------------------------------------------------------------------------------ */

function rearFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const zr = H.zRear;
  // spare road wheel on the right, on a stub axle
  const sw = spareWheel(P);
  sw.rotation.y = Math.PI; // face rearwards
  sw.position.set(-0.4, 0.93, zr - 0.006);
  out.push(sw);
  out.push(part(rb(0.1, 0.1, 0.012, 0.005), P.cast, { p: [-0.4, 0.93, zr - 0.006] }));
  // jack on the left in two straps
  const jk = jack(P);
  jk.position.set(0.4, 0.93, zr - 0.052);
  out.push(jk);
  for (const y of [0.86, 1.0]) {
    out.push(part(rb(0.11, 0.022, 0.012, 0.004), P.sheet, { p: [0.4, y, zr - 0.099] }));
    for (const sx of [1, -1]) out.push(part(rb(0.012, 0.022, 0.1, 0.003), P.sheet, { p: [0.4 + sx * 0.052, y, zr - 0.05] }));
  }
  // towing ring (centre) and hooks (sides)
  const tr = towRing(P);
  tr.rotation.y = Math.PI;
  tr.position.set(0, 0.72, zr);
  out.push(tr);
  for (const sx of [1, -1]) {
    const th = towHook(P);
    th.rotation.y = Math.PI;
    th.position.set(sx * 0.66, 0.74, zr);
    out.push(th);
  }
  // number plate (left) with tail / brake light above it
  out.push(part(rb(0.3, 0.13, 0.008, 0.003), P.sheet, { p: [0.66, 1.08, zr - 0.02] }));
  out.push(part(rb(0.28, 0.11, 0.004, 0.002), P.plate, { p: [0.66, 1.08, zr - 0.025] }));
  out.push(part(rb(0.012, 0.03, 0.02, 0.003), P.sheet, { p: [0.66, 1.08 + 0.075, zr - 0.012] }));
  out.push(part(latheZ([[0.0, 0.0], [0.035, 0.0], [0.035, 0.04], [0.0, 0.04]], 16, 50), P.sheet, { p: [0.66, 1.18, zr - 0.04] }));
  out.push(part(latheZ([[0.0, 0.0], [0.028, 0.0], [0.028, 0.004], [0.0, 0.006]], 16, 50), P.tail, { p: [0.66, 1.18, zr - 0.044], r: [0, 180, 0] }));
  return out;
}

/* ------------------------------------------------------------------------------------------ */

function frontFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // headlights on the front guards beside the superstructure
  for (const sx of [1, -1]) {
    const hl = headlight(P);
    hl.position.set(sx * 0.975, H.yGuard + 0.007 + 0.216, 1.74);
    out.push(hl);
  }
  // towing hooks on the lower nose plate, towing ring in the centre
  const nLow = new THREE.Vector3(0, -(H.zNose - H.zBellyF), H.yNoseLow - H.belly).normalize();
  const onLow = (x: number, y: number): P3 => [x, y, H.zBellyF + ((y - H.belly) * (H.zNose - H.zBellyF)) / (H.yNoseLow - H.belly)];
  for (const sx of [1, -1]) out.push(faceTo(towHook(P), onLow(sx * 0.6, 0.63), [0, nLow.y, nLow.z]));
  out.push(faceTo(towRing(P), onLow(0, 0.62), [0, nLow.y, nLow.z]));
  return out;
}

/* ------------------------------------------------------------------------------------------ */

function antenna(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const x = -0.79, z0 = -0.3;
  out.push(part(G.cyl(0.045, 0.05, 0.02, 16), P.cast, { p: [x, H.yRoof + 0.01, z0] }));
  out.push(part(G.cyl(0.028, 0.032, 0.06, 14), P.rubber, { p: [x, H.yRoof + 0.05, z0] }));
  out.push(part(rb(0.05, 0.05, 0.06, 0.006), P.cast, { p: [x, H.yRoof + 0.09, z0] }));
  const tip = new THREE.Vector3(x, 1.63, -2.02);
  out.push(part(G.rod([x, H.yRoof + 0.095, z0], [tip.x, tip.y, tip.z], 0.0085, 8, 0.005), P.gun));
  // rest crutch on the deck edge
  const zc = -1.96;
  out.push(part(G.cyl(0.01, 0.01, 1.62 - deckY(zc) - 0.01, 8), P.sheet, { p: [x, (1.62 + deckY(zc)) / 2 - 0.006, zc] }));
  out.push(part(G.torus(0.018, 0.005, 6, 12, Math.PI), P.sheet, { p: [x, 1.63, zc], r: [0, 90, 180] }));
  out.push(part(rb(0.05, 0.01, 0.05, 0.003), P.sheet, { p: [x, deckY(zc) + 0.004, zc] }));
  return out;
}

/* ------------------------------------------------------------------------------------------ */

export function fittings(P: Pal, sol: TrackSolution, o: { links: boolean; tools: boolean }): THREE.Group {
  const kit = rearGuardKit(P);
  const list: THREE.Object3D[] = [mirrorX(kit), ...rearFittings(P), ...frontFittings(P), ...antenna(P)];
  if (o.tools) list.push(...tools(P));
  if (o.links) list.push(...spareLinks(P, sol));
  return group(list, { name: 'fittings' });
}

export { merge };
