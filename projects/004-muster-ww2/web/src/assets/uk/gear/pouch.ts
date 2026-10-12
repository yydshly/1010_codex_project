/**
 * Pouch, basic, W.E. Patt. '37, Mk III - the pair of tall web ammunition boxes worn on the front
 * of the 1937-pattern belt, one each side of the buckle. Each holds two 30-round Bren gun
 * magazines (or 50 rounds of .303 in chargers / bandoliers, grenades, 2-in. mortar bombs, Sten
 * magazines). Construction: woven webbing box (front, gusseted sides and bottom stitched along
 * the edges, the front pushed out a little by the magazines), a box lid with triangular side
 * gussets closed by a brass press stud; at the back two brass double hooks that pass over the
 * top edge of the belt into the woven pockets on its inside, and at the top back a 1-in. brass
 * buckle "with loop" on a short web chape: the brace end passes through the lower window, the
 * hook of the L-strap (battle order) engages the narrow upper window.
 *
 * Mk III: about 1/2 in. longer than the Mk I/II so Sten magazines fit; early Mk IIIs kept the
 * press-stud lid (modelled here).
 *
 * Gear frame: ORIGIN = on the belt's OUTER face at belt mid-height (the pouch back lies on the
 * belt: z = 0 is the belt face and the pouch back), +Z away from the body, +Y up. The belt
 * (57 mm) occupies y = -0.0285..0.0285, z = -0.0034..0; the hook prongs curl over the belt top
 * edge down behind it (z < 0, hidden between belt and tunic). The pouch bottom sits 3.5 mm below
 * the belt's lower edge. strapAnchors = [brace window centre, L-strap hook (upper window)].
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { SDF } from '../../../core/geo/sdf';
import type { GearPiece } from '../../shared/contracts';
import { UK } from './palette';
import { BELT37 } from './belt';
import { slab, roundRect2D, projectedBox, drape, snoise, clamp01, sstep, projectTo, normalAt } from './soft';
import { stitches, fourBarBuckle, pressStud, placeOn, merge, boxX, patchSheet } from './helpers';

/** Basic pouch Mk III dimensions (m), gear frame. */
export const BASIC_POUCH = {
  /** Body width (X), depth (Z, back to front), bottom and top of the box (Y, belt centre = 0). */
  w: 0.13,
  d: 0.075,
  yBot: -0.032,
  yTop: 0.2,
  /** Lid drop down the front. */
  lidDrop: 0.066,
  capacity: 'Two 30-round Bren magazines',
};

export interface BasicPouchOptions {
  /** Which side of the buckle ('l' = wearer's left, belt-front-left). Only the id/mount differ. */
  side?: 'l' | 'r';
}

const WT = 0.0019; // chape webbing
const LT = 0.0026; // lid webbing
const GAP = 0.0005;

export function buildBasicPouch37(opts: BasicPouchOptions = {}): GearPiece {
  const side = opts.side ?? 'l';
  const { w: W, d: D, yBot, yTop, lidDrop } = BASIC_POUCH;
  const hw = W / 2, cy = (yTop + yBot) / 2, hh = (yTop - yBot) / 2;
  const web = UK.web(), strapMat = UK.webStrap(), thread = UK.thread(), brass = UK.brass();
  const parts: THREE.Object3D[] = [];

  // ---- the box ----
  const outline = roundRect2D(0, cy, hw, hh, { tl: 0.0035, tr: 0.0035, bl: 0.0055, br: 0.0055 });
  const zF = (x: number, y: number) => {
    const u = clamp01(Math.abs(x) / hw);
    const t = clamp01((y - yBot) / (yTop - yBot));
    // the two magazines push the front out a little, most in the middle third
    return D + 0.003 * (1 - u * u) * Math.sin(Math.PI * Math.min(1, t * 1.1));
  };
  const base = slab(outline, 0, zF, 0.0058, 0.0028);
  const body: SDF = (x, y, z) => base(x, y, z) + 0.00028 * snoise(x * 45, y * 45, z * 45, 21) + 0.0002 * snoise(x * 140, y * 20, z * 140, 3);
  parts.push(part(projectedBox(body, { centre: [0, cy, D / 2], half: [hw, hh, D / 2 + 0.002], n: [16, 28, 9], edge: 0.62 }), web, { name: 'pouch' }));

  const onBody = (x: number, y: number, z: number, lift = 0.00025) => projectTo(body, new THREE.Vector3(x, y, z), lift, 14);
  const stitchGeos: THREE.BufferGeometry[] = [];
  const row = (a: [number, number, number], b: [number, number, number], n = 36) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(onBody(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t));
    }
    stitchGeos.push(stitches(pts, { len: 0.0032, gap: 0.0019, r: 0.0005 }));
  };
  const yLid = yTop - lidDrop;
  for (const s of [1, -1]) {
    // front panel sewn to the side gussets: a row on the front near each edge, and on the side
    row([s * (hw - 0.0045), yBot + 0.0075, D + 0.004], [s * (hw - 0.0045), yLid + 0.006, D + 0.004]);
    row([s * (hw + 0.002), yBot + 0.0075, D - 0.0048], [s * (hw + 0.002), yTop - 0.03, D - 0.0048]);
    row([s * (hw + 0.002), yBot + 0.0075, 0.0042], [s * (hw + 0.002), yTop - 0.012, 0.0042]);
  }
  // bottom seam (front) and across the underside
  row([-(hw - 0.0075), yBot + 0.0045, D + 0.003], [hw - 0.0075, yBot + 0.0045, D + 0.003]);
  row([-(hw - 0.0075), yBot - 0.002, D - 0.0045], [hw - 0.0075, yBot - 0.002, D - 0.0045]);

  // ---- box lid: top + front as one draped sheet, with triangular gussets on the sides ----
  const lid = drape(body, {
    path: [
      [yTop + 0.0004, 0.0032],
      [yTop + 0.001, D * 0.5],
      [yTop - 0.0012, D - 0.0018],
      [yTop - 0.009, D + 0.001],
      [yTop - lidDrop * 0.55, D + 0.0025],
      [yLid, D + 0.0022],
    ],
    halfWidth: hw + 0.0032,
    gap: GAP,
    t: LT,
    nu: 16,
    nv: 36,
    // stiff webbing: the lower edge stands a hair off the front
    lift: (_u, s, L) => 0.0007 * sstep(L - 0.03, L, s),
  });
  parts.push(part(lid.geometry, web, { name: 'lid' }));
  // lid edge binding stitches: along the front edge and down both front corners
  {
    const sTop = lid.sAtY(yTop - 0.006);
    const pts: THREE.Vector3[] = [];
    const hx = hw - 0.002;
    for (let i = 0; i <= 10; i++) pts.push(lid.at(-hx, sTop + ((lid.L - 0.0045 - sTop) * i) / 10, 0.0002));
    for (let i = 1; i < 20; i++) pts.push(lid.at(-hx + (2 * hx * i) / 20, lid.L - 0.0045, 0.0002));
    for (let i = 10; i >= 0; i--) pts.push(lid.at(hx, sTop + ((lid.L - 0.0045 - sTop) * i) / 10, 0.0002));
    stitchGeos.push(stitches(pts, { len: 0.0032, gap: 0.0019, r: 0.0005 }));
    // hinge seam across the top near the back
    const hp: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) hp.push(lid.at(-hx + (2 * hx * i) / 20, 0.0065, 0.0002));
    stitchGeos.push(stitches(hp, { len: 0.0032, gap: 0.0019, r: 0.0005 }));
  }
  // gussets: triangular webbing sheets on the sides, folded under the lid's side edges
  const GT = 0.002;
  const gusGeos: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const R = 9, C = 8;
    const grid: THREE.Vector3[][] = [];
    const yb = yLid + 0.004;
    for (let i = 0; i < R; i++) {
      const t = i / (R - 1);
      const y = yTop + 0.0012 - (yTop + 0.0012 - yb) * t;
      const z0 = 0.004 + (D - 0.0105 - 0.004) * Math.pow(t, 0.9);
      const z1 = D + 0.0005;
      const rowPts: THREE.Vector3[] = [];
      for (let j = 0; j < C; j++) {
        const z = z0 + ((z1 - z0) * j) / (C - 1);
        const p = onBody(s * (hw + 0.002), y, z, GAP + GT / 2);
        // the gusset folds in a little along its free (sloping) edge
        rowPts.push(p.addScaledVector(new THREE.Vector3(s, 0, 0), -0.0006 * (1 - j / (C - 1)) ** 3));
      }
      grid.push(rowPts);
    }
    gusGeos.push(patchSheet(grid, GT, new THREE.Vector3(s, 0, 0)));
    // stitch row along the sloping edge
    const edge: THREE.Vector3[] = [];
    for (let i = 0; i < R; i++) {
      const p = grid[i][0].clone().lerp(grid[i][1], 0.55);
      edge.push(p.addScaledVector(new THREE.Vector3(s, 0, 0), GT / 2 + 0.0002));
    }
    stitchGeos.push(stitches(edge, { len: 0.003, gap: 0.0018, r: 0.00045 }));
  }
  parts.push(part(merge(gusGeos), web));

  // press stud on the lid
  const fittings: THREE.BufferGeometry[] = [];
  {
    const sp = lid.at(0, lid.L - 0.0135, 0);
    const n = lid.at(0, lid.L - 0.0135, 0.001).sub(sp).normalize();
    fittings.push(placeOn(pressStud(0.0056, 0.0026), sp, n, new THREE.Vector3(0, 1, 0)));
  }

  // ---- back: brace buckle on its chape (emerging at the lid hinge) ----
  const BK_W = 0.032, BK_H = 0.037;
  const bkC = new THREE.Vector3(0, yTop + 0.031, 0.0019);
  const bk = fourBarBuckle(BK_W, BK_H, 0.0029, 0.0016);
  fittings.push(bk.translate(bkC.x, bkC.y, bkC.z));
  const barY = bkC.y - BK_H / 2 + 0.00145; // lower bar centre
  const rw = 0.0008 + WT / 2 + 0.0002; // wrap radius round the bar
  const chapePts: THREE.Vector3[] = [
    new THREE.Vector3(0, yTop - 0.022, bkC.z - rw),
    new THREE.Vector3(0, yTop - 0.002, bkC.z - rw),
    new THREE.Vector3(0, barY - 0.004, bkC.z - rw),
  ];
  const chapeN: THREE.Vector3[] = [new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, -1)];
  for (let k = 0; k <= 6; k++) {
    const a = -Math.PI / 2 + (k / 6) * Math.PI;
    chapePts.push(new THREE.Vector3(0, barY + Math.cos(a) * rw * 1.05, bkC.z + Math.sin(a) * rw));
    chapeN.push(new THREE.Vector3(0, Math.cos(a), Math.sin(a)));
  }
  chapePts.push(new THREE.Vector3(0, barY - 0.004, bkC.z + rw), new THREE.Vector3(0, yTop + 0.0045, bkC.z + rw + 0.0003));
  chapeN.push(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 1));
  const chape = G.strap(chapePts, 0.025, WT, chapeN, { samples: 40 });
  parts.push(part(chape, strapMat));
  stitchGeos.push(stitches([new THREE.Vector3(-0.0105, barY - 0.0052, bkC.z + rw + WT / 2 + 0.0003), new THREE.Vector3(0.0105, barY - 0.0052, bkC.z + rw + WT / 2 + 0.0003)], { len: 0.003, gap: 0.0018, r: 0.00045 }));

  // ---- back: two brass double hooks over the belt ----
  const BW = BELT37.width, BT = BELT37.t;
  const hookGeos: THREE.BufferGeometry[] = [];
  for (const x of [-0.038, 0.038]) {
    // riveted plate on the pouch back (lies against the belt face)
    const plate = G.rbox(0.015, 0.022, 0.001, 0.0004, 1);
    plate.translate(x, 0.001, -0.0004);
    hookGeos.push(plate);
    for (const dx of [-0.0042, 0.0042]) {
      const r = 0.0011;
      const X = x + dx;
      const pts: [number, number, number][] = [
        [X, 0.009, -r - 0.0009],
        [X, BW / 2 - 0.002, -r - 0.0004],
        [X, BW / 2 + r * 1.3, -r * 0.6],
        [X, BW / 2 + r * 2.1, -BT / 2],
        [X, BW / 2 + r * 1.2, -BT - r * 0.9],
        [X, BW / 2 - 0.006, -BT - r - 0.0002],
        [X, BW / 2 - 0.016, -BT - r * 0.6],
      ];
      hookGeos.push(G.tube(pts, r, 6, 24));
    }
  }
  fittings.push(...hookGeos);
  parts.push(part(merge(fittings), brass, { name: 'brass' }));
  parts.push(part(merge(stitchGeos), thread));

  const object = group(parts);
  object.name = `uk-basic-pouch-37-${side}`;
  const box = new THREE.Box3().setFromObject(object, true);
  const size = box.getSize(new THREE.Vector3());
  void normalAt;
  return {
    id: `uk-basic-pouch-37-${side}`,
    name: `Pouch, basic, Patt. 37 Mk III (${side === 'l' ? 'left' : 'right'})`,
    object,
    mount: side === 'l' ? 'belt-front-left' : 'belt-front-right',
    size: { w: size.x, h: size.y, d: size.z },
    belt: { loopWidth: BW },
    strapAnchors: [new THREE.Vector3(0, (barY + bkC.y + 0.005) / 2, bkC.z), new THREE.Vector3(0, bkC.y + 0.0118, bkC.z)],
  };
}
