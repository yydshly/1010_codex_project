/**
 * Firing platform No. 9 (for Carriage 25-pr Mk I): a circular steel platform on which the gun
 * is towed; the wheels stand on its flat deck and roll round it when the trail is swung, so the
 * gun can be traversed through 360 degrees. Deck plate on radial channel spokes, bevelled rim
 * (the wheels ride up it), central hub, lashing eyes for the hooks that hold it under the trail
 * on the move, and toe plates round the edge (shown resting on the display surface).
 *
 * Local frame: centre on the ground (y = 0), deck top at y = D.platTop.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { cylY, type V2, type V3 } from './util';

export function buildPlatform(hi: boolean): THREE.Group {
  const o: THREE.Object3D[] = [];
  const seg = hi ? 128 : 64;
  const R = D.platR, H = D.platTop;
  const rDeck = R - 0.05;
  const mat = P.platform();
  // deck plate
  o.push(part(cylY(rDeck, H - 0.01, H, seg, 0.002), mat));
  // bevelled rim ring (angle section): ramp from the ground up to the deck edge, skirt below
  const rim: V2[] = [
    [rDeck - 0.03, H - 0.012],
    [rDeck - 0.03, H - 0.001],
    [rDeck + 0.004, H - 0.001],
    [R, 0.014],
    [R, 0.0],
    [R - 0.012, 0.0],
    [R - 0.012, 0.012],
    [rDeck - 0.014, H - 0.016],
    [rDeck - 0.03, H - 0.012],
  ];
  o.push(part(G.lathe(rim, seg, 30), mat));
  // inner skirt ring under the deck edge, resting on the ground
  o.push(part(G.lathe([[rDeck - 0.03, 0], [rDeck - 0.018, 0], [rDeck - 0.018, H - 0.01], [rDeck - 0.03, H - 0.01], [rDeck - 0.03, 0]], seg, 30), mat));
  // radial channel spokes under the deck (visible from low angles through the rim gaps)
  const nSp = 12;
  // spokes offset half a pitch so no rivet row runs under the tyre contact patches (x axis)
  const sp = (i: number) => ((i + 0.5) / nSp) * Math.PI * 2;
  for (let i = 0; i < nSp; i++) {
    const a = sp(i);
    const L = rDeck - 0.03 - 0.2;
    const g = G.rbox(0.06, H - 0.01, L, 0.004, 1);
    g.rotateY(a);
    const rm = 0.2 + L / 2;
    o.push(part(g, mat, { p: [Math.sin(a) * rm, (H - 0.01) / 2, Math.cos(a) * rm] }));
  }
  // flush rivet rows over the spokes and a seam ring on the deck
  const rv: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < nSp; i++) {
    const a = sp(i);
    for (let k = 0; k < 9; k++) {
      const r = 0.26 + k * 0.095;
      rv.push({ p: [Math.sin(a) * r, H, Math.cos(a) * r], n: [0, 1, 0] });
    }
  }
  o.push(part(G.scatter(G.rivetHead(0.007), rv), mat));
  o.push(part(G.torus(0.62, 0.003, 4, seg), mat, { p: [0, H, 0], r: [90, 0, 0] }));
  // central hub: boss, cap and bolts
  o.push(part(cylY(0.2, 0.0, H, 48, 0.003), mat));
  o.push(part(G.lathe([[0, H], [0.15, H], [0.155, H + 0.006], [0.15, H + 0.022], [0.09, H + 0.028], [0.07, H + 0.04], [0, H + 0.04]], 48, 35), P.cast()));
  o.push(part(G.scatter(G.boltHead(0.02, 0.008), Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    return { p: [Math.cos(a) * 0.12, H + 0.018, Math.sin(a) * 0.12] as V3 };
  })), P.cast()));
  // lashing eyes on the deck (hooks hold the platform under the trail when travelling)
  for (const a of [Math.PI * 0.75, Math.PI * 1.25]) {
    const r = 0.5;
    const e = G.torus(0.026, 0.008, 8, 20, Math.PI);
    o.push(part(e, P.cast(), { p: [Math.sin(a) * r, H, Math.cos(a) * r], r: [0, (a * 180) / Math.PI + 90, 0] }));
    o.push(part(G.rbox(0.07, 0.008, 0.03, 0.003, 1), P.cast(), { p: [Math.sin(a) * r, H + 0.004, Math.cos(a) * r], r: [0, (a * 180) / Math.PI + 90, 0] }));
  }
  // toe plates round the edge: triangular teeth lying on the ground with a stiffening rib
  const nT = 8;
  for (let i = 0; i < nT; i++) {
    const a = ((i + 0.5) / nT) * Math.PI * 2;
    const tooth: V2[] = [[-0.05, 0], [0.05, 0], [0.03, 0.06], [-0.03, 0.06]];
    const g = G.plate(tooth, 0.012, 'xz', 0.003);
    g.translate(0, 0.006, 0);
    const t = group([part(g, mat, { p: [0, 0, 0] }), part(G.plate([[0, 0.0], [0.06, 0.0], [0, 0.035]], 0.012, 'zy', 0.003), mat, { p: [0, 0, 0] })], {
      p: [Math.sin(a) * (R - 0.02), 0, Math.cos(a) * (R - 0.02)],
      r: [0, (a * 180) / Math.PI, 0],
    });
    o.push(t);
  }
  return group(o, { name: 'platform' });
}
