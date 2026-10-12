/**
 * Type 99 rifle woodwork and the fittings seated on it (R-frame, see dims.ts):
 *  - the stock (butt, straight wrist, fore-end with the barrel channel under the handguard),
 *  - the separate LOWER BUTT PIECE of the two-piece stock: the belly of the butt is a second piece of
 *    wood spliced on along a near-horizontal joint from under the wrist to the butt plate (its grain set
 *    at another angle to strengthen the toe); modelled as its own loft with a slightly different tone,
 *  - upper handguard from the rear sight to the upper band,
 *  - cupped steel butt plate with two screws, left-side butt swivel plate, reinforcing tangs of the
 *    upper band.
 */
import { THREE, G, part } from '../../../../core/kit';
import { Profile, V, stations, screwParts, placeAlong, type V2, type Sec } from '../common/geo';
import { RD, STOCK, spliceY, hgCrown } from './dims';
import type { JpwMats } from '../common/materials';

/** Handguard ring at z: crescent over the barrel whose base sits in the stock channel. Fixed count. */
export function hgRing(z: number, grow = 0, n = 40): V2[] {
  const s = STOCK.at(z);
  const hw = s.hw * 0.9 + grow;
  const crown = hgCrown(z) + grow;
  const yb = -0.0045 - grow;
  const e = 2.3;
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI;
    const c = Math.cos(t), sn = Math.sin(t);
    pts.push([hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / e), yb + (crown - yb) * Math.pow(sn, 2 / e)]);
  }
  pts.push([-hw * 0.6, yb - 0.0006], [hw * 0.6, yb - 0.0006]);
  return pts;
}

/** Section of stock + handguard together (for the bands), as a Sec. */
export function bandSec(z: number, grow: number): Sec {
  const s = STOCK.at(z);
  return { hw: s.hw + grow, yTop: hgCrown(z) + grow, ySplit: s.ySplit, yBot: s.yBot - grow, eTop: 2.4, eBot: s.eBot, dx: 0 };
}

/** Ring parameters where the lower half of a section crosses height y (right side, left side). */
function lowerCross(s: Sec, y: number): [number, number] {
  const solve = (lo: number, hi: number, rising: boolean) => {
    for (let i = 0; i < 48; i++) {
      const mid = (lo + hi) / 2;
      const py = Profile.point(s, mid)[1];
      if ((py > y) === rising) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  };
  // right lower quadrant: t in [pi, 3pi/2], y falls; left lower: [3pi/2, 2pi], y rises
  const tR = solve(Math.PI, 1.5 * Math.PI, false);
  const tL = solve(1.5 * Math.PI, 2 * Math.PI, true);
  return [tR, tL];
}

/** Ring of the lower butt piece at z (the part of the section below the splice), grown by `grow`. */
function lowerPieceRing(z: number, grow: number, n = 36): V2[] {
  const s = STOCK.at(z);
  const ys = spliceY(z);
  const [tR, tL] = lowerCross(s, ys);
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = tR + ((tL - tR) * i) / (n - 1);
    const [x, y] = Profile.point(s, t), [nx, ny] = Profile.normal(s, t);
    pts.push([x + nx * grow, Math.min(ys - 0.0002, y + ny * grow)]);
  }
  // inner (hidden) face just above the splice
  pts.push([pts[n - 1][0] * 0.5, ys + 0.002], [pts[0][0] * 0.5, ys + 0.002]);
  return pts;
}

/** z where the splice line leaves the belly (front end of the lower piece). */
export function spliceFront(): number {
  for (let z = -0.3; z < -0.2; z += 0.0005) {
    if (STOCK.at(z).yBot > spliceY(z) - 0.0015) return z;
  }
  return -0.25;
}

export function buildWood(m: JpwMats, hi = true): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const nRing = hi ? 72 : 44;
  // ---------------- stock
  const st = stations(STOCK.z0, RD.stockFront, (z) => {
    if (z < -0.42) return 0.012;
    if (z < -0.16) return 0.007;
    if (z < -0.03) return 0.02;
    if (z < 0.1) return 0.01;
    return 0.03;
  });
  out.push(part(STOCK.loft(st, nRing, 50), m.chestnut));

  // ---------------- lower butt piece (two-piece stock)
  {
    const zf = spliceFront();
    const zs = stations(RD.woodButtZ, zf, (z) => (z > zf - 0.03 ? 0.004 : 0.012));
    const secs = zs.map((z) => ({ z, ring: lowerPieceRing(z, 0.00035, hi ? 36 : 24) }));
    out.push(part(G.loftZ(secs, true, 50), m.chestnutB));
    // the glue line: a hair-thin dark seam along both sides
    const seam = (side: 1 | -1) => {
      const pts: THREE.Vector3[] = [];
      for (const z of stations(RD.woodButtZ + 0.001, zf - 0.004, () => 0.01)) {
        const ys = spliceY(z);
        pts.push(V(side * (STOCK.sideX(z, ys) + 0.0002), ys, z));
      }
      return part(G.tube(pts, 0.00035, 4, pts.length * 2), m.recess);
    };
    out.push(seam(1), seam(-1));
  }

  // ---------------- upper handguard
  {
    const zs = stations(RD.hgRear, RD.hgFront, () => 0.02);
    const secs = zs.map((z) => ({ z, ring: hgRing(z) }));
    secs[0] = { z: RD.hgRear, ring: hgRing(RD.hgRear, -0.0014) };
    secs.splice(1, 0, { z: RD.hgRear + 0.0018, ring: hgRing(RD.hgRear + 0.0018) });
    out.push(part(G.loftZ(secs, true, 50), m.chestnutHg));
  }

  // ---------------- cupped steel butt plate (wraps round the heel and toe) + two screws
  {
    const bz = RD.woodButtZ;
    const ring = (z: number, d: number) => STOCK.ringAt(z, nRing, d);
    const plate = G.loftZ(
      [
        { z: bz + 0.0042, ring: ring(bz + 0.0042, 0.0002) },
        { z: bz + 0.0034, ring: ring(bz + 0.0034, 0.0011) },
        { z: bz + 0.0004, ring: ring(bz, 0.0013) },
        { z: RD.buttZ + 0.0012, ring: ring(bz, 0.0008) },
        { z: RD.buttZ, ring: ring(bz, -0.0012) },
      ],
      true,
      45,
    );
    out.push(part(plate, m.bluedDark));
    const [head, slot] = screwParts(0.0034, 0.001, 0);
    for (const [y, spin] of [[-0.05, 20], [-0.132, 75]] as const) {
      const p = V(0, y, RD.buttZ + 0.0002);
      out.push(part(placeAlong(head, p, V(0, 0, -1)), m.bluedDark), part(placeAlong(slot, p, V(0, 0, -1), spin), m.recess));
    }
  }

  // ---------------- butt swivel plate on the LEFT side of the butt (two screws)
  {
    const z = RD.rearSwivelZ;
    const ym = STOCK.at(z).ySplit + 0.002;
    const ta = (zz: number) => STOCK.tAtY(zz, ym - 0.008);
    const tb = (zz: number) => STOCK.tAtY(zz, ym + 0.008);
    out.push(part(STOCK.shell(z - 0.03, z + 0.022, ta, tb, 0.0016, 0.0004, 8, 6), m.bluedDark));
    const [head, slot] = screwParts(0.0028, 0.0009, 0);
    for (const [dz, spin] of [[-0.022, 30], [0.014, 80]] as const) {
      const zz = z + dz;
      const p = V(STOCK.sideX(zz, ym) + 0.0012, ym, zz);
      out.push(part(placeAlong(head, p, V(1, 0, 0)), m.bluedDark), part(placeAlong(slot, p, V(1, 0, 0), spin), m.recess));
    }
  }

  // ---------------- reinforcing tangs of the upper band (both sides of the fore-end)
  for (const left of [true, false]) {
    const ta = (zz: number) => STOCK.tAtY(zz, -0.017, left);
    const tb = (zz: number) => STOCK.tAtY(zz, -0.006, left);
    const g = STOCK.shell(RD.upperBand0 - 0.03, RD.upperBand0 + 0.002, left ? ta : tb, left ? tb : ta, 0.0012, 0.0003, 6, 5);
    out.push(part(g, m.blued));
  }
  return out;
}
