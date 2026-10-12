/**
 * MPL-50 small infantry shovel (Soviet "malaya pekhotnaya lopata"): 500 mm overall, flat steel
 * blade approx. 150 x 180 mm with sharpened lower edges, unpainted hardwood handle held in the
 * blade socket by front and back straps with rivets and a crimp ring (wartime pattern),
 * carried in a khaki canvas cover on the waist belt.
 *
 * Shovel-local frame (used by `buildMPL50Shovel`): blade tip at the origin, handle along +Y,
 * the concave (front) face of the blade towards +Z, width along X.
 */
import { THREE, G, sdfMesh, part, group, valueNoise3 } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import type { SDF } from '../../../core/geo/sdf';
import { SU } from './palette';
import { stitches, beltLoop, wireFrame, smoothstep } from './helpers';

export const MPL50 = {
  length: 0.5,
  bladeW: 0.15,
  bladeL: 0.18,
  handleR: 0.0152,
};
const HW = MPL50.bladeW / 2;
const BL = MPL50.bladeL;
const DISH = 0.009; // depth of the blade's transverse curvature at the edges
const dish = (x: number) => DISH * (x / HW) ** 2;

/** Blade half-width at height y (0 = tip, BL = shoulders). */
function bladeHalfW(y: number): number {
  if (y <= 0) return 0.0015;
  if (y >= 0.09) return HW;
  return Math.max(0.0015, HW * Math.pow(Math.sin((Math.PI / 2) * (y / 0.09)), 0.72));
}

/** Tessellated, dished blade plate (front, back and edge walls). */
function bladeGeometry(): THREE.BufferGeometry {
  const t = 0.0021;
  const ys: number[] = [];
  for (let i = 0; i <= 22; i++) ys.push(0.09 * (i / 22) ** 1.4);
  for (let i = 1; i <= 12; i++) ys.push(0.09 + (BL - 0.09) * (i / 12));
  const NU = 24;
  const pos: number[] = [], idx: number[] = [];
  const R = ys.length, W = NU + 1;
  const pt = (y: number, u: number, side: number) => {
    const hw = bladeHalfW(y);
    // round the two top corners slightly
    const cr = 0.006;
    let x = u * hw;
    let yy = y;
    if (y > BL - cr && Math.abs(x) > hw - cr) {
      const dx = Math.abs(x) - (hw - cr), dy = y - (BL - cr);
      const d = Math.hypot(dx, dy);
      if (d > cr) {
        x = Math.sign(x) * (hw - cr + (dx / d) * cr);
        yy = BL - cr + (dy / d) * cr;
      }
    }
    const edgeThin = 1 - 0.55 * smoothstep(0.8, 1, Math.abs(u)) * (y < 0.1 ? 1 : 0.3);
    return [x, yy, dish(x) + side * (t / 2) * edgeThin];
  };
  for (const side of [1, -1]) {
    for (const y of ys) for (let j = 0; j <= NU; j++) pos.push(...pt(y, -1 + (2 * j) / NU, side));
  }
  const off = R * W;
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < NU; j++) {
    const a = i * W + j, b = a + 1, c = a + W, d = c + 1;
    idx.push(a, b, c, b, d, c);
    idx.push(off + a, off + c, off + b, off + b, off + c, off + d);
  }
  // edge walls: left (j = 0), right (j = NU), top (i = R-1)
  const wall = (ia: number, ib: number) => idx.push(ia, off + ia, ib, ib, off + ia, off + ib);
  for (let i = 0; i < R - 1; i++) {
    wall(i * W + NU, (i + 1) * W + NU);
    wall((i + 1) * W, i * W);
  }
  for (let j = 0; j < NU; j++) wall((R - 1) * W + j + 1, (R - 1) * W + j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const ng = G.crease(g, 50);
  G.ensureOutward(ng);
  return ng;
}

export interface ShovelOptions {
  /** Wood grain direction of the handle in the FINAL asset space (default: along Y). */
  grainAxis?: [number, number, number];
}

/** The bare shovel in shovel-local space (tip at origin, handle +Y). */
export function buildMPL50Shovel(o: ShovelOptions = {}): THREE.Group {
  const paint = SU.bladePaint();
  const parts: THREE.Object3D[] = [part(bladeGeometry(), paint, { name: 'blade' })];
  const hr = MPL50.handleR;
  // pressed stiffening rib running down the front face from the socket
  const rib = G.lathe([[0.0001, 0], [0.006, 0.012], [0.0095, 0.04], [0.0115, 0.075], [0.0001, 0.075]], 20, 60, -Math.PI / 2, Math.PI);
  rib.scale(1, 1, 0.35);
  parts.push(part(rib, paint, { p: [0, BL - 0.075 - 0.02, 0.0008] }));
  // socket sleeve: tapered sheet sleeve around the handle end at the blade top
  const sock = G.lathe([[hr + 0.0005, 0], [hr + 0.0028, 0.018], [hr + 0.0032, 0.04], [hr + 0.0025, 0.046], [hr + 0.0005, 0.047]], 28, 50);
  parts.push(part(sock, paint, { p: [0, BL - 0.035, 0] }));
  // front & back straps: curved sheet straps hugging the handle, riveted through
  const strapTop = BL + 0.14;
  const st = 0.0021;
  for (const sz of [1, -1]) {
    const half = 0.62; // half angle (rad) of the strap around the handle
    const phi0 = (sz > 0 ? 0 : Math.PI) - half;
    const prof: G.V2[] = [
      [hr + 0.0028, BL - 0.03],
      [hr + 0.0028 + st, BL - 0.03],
      [hr + st + 0.0002, BL + 0.01],
      [hr + st, strapTop - 0.006],
      [hr + st * 0.5, strapTop],
      [hr - 0.0003, strapTop],
      [hr - 0.0003, BL + 0.01],
      [hr + 0.0028, BL - 0.03],
    ];
    const s = G.lathe(prof, 12, 40, phi0, half * 2);
    s.scale(1.06, 1, 0.94);
    parts.push(part(s, paint));
    // strap side edges (close the arc section)
    for (const e of [phi0, phi0 + half * 2]) {
      const edge = G.lathe(prof, 1, 40, e - 0.001, 0.002);
      edge.scale(1.06, 1, 0.94);
      parts.push(part(edge, paint));
    }
    const rivets = [BL + 0.03, BL + 0.075, BL + 0.12].map((y) => ({ p: new THREE.Vector3(0, y, sz * (hr * 0.94 + st)), n: new THREE.Vector3(0, 0, sz) }));
    parts.push(part(G.scatter(G.rivetHead(0.0034), rivets), SU.darkSteel()));
  }
  // crimp ring near the end of the straps
  parts.push(part(G.lathe([[hr + 0.0006, 0], [hr + 0.0036, 0.0008], [hr + 0.0042, 0.004], [hr + 0.0036, 0.0072], [hr + 0.0006, 0.008]], 28, 50), paint, { p: [0, strapTop - 0.028, 0] }));
  // wooden handle, slightly swelled towards the end with a rounded butt
  const L = MPL50.length;
  const hp: G.V2[] = [[0, BL - 0.03], [hr - 0.0005, BL - 0.03], [hr, BL], [hr - 0.0004, BL + 0.16], [hr + 0.0006, L - 0.06], [hr + 0.0012, L - 0.02], [hr * 0.85, L - 0.004], [hr * 0.45, L], [0, L]];
  const handle = G.lathe(hp, 28, 60);
  handle.scale(1.06, 1, 0.94); // slightly oval grip
  parts.push(part(handle, SU.handleWood(o.grainAxis ?? [0, 1, 0]), { name: 'handle' }));
  const g = group(parts);
  g.name = 'mpl50-shovel';
  return g;
}

/** Signed distance to the blade outline expanded by `grow` (2D, x/y in shovel-local space). */
function outline2D(grow: number): (x: number, y: number) => number {
  const poly: [number, number][] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const y = BL * (i / N);
    poly.push([bladeHalfW(y), y]);
  }
  const top = BL + 0.028;
  poly.push([HW, top]);
  poly.push([-HW, top]);
  for (let i = N; i >= 0; i--) {
    const y = BL * (i / N);
    poly.push([-bladeHalfW(y), y]);
  }
  return (x, y) => {
    let d = Infinity, sgn = 1;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      const ex = xi - xj, ey = yi - yj, wx = x - xj, wy = y - yj;
      const h = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
      d = Math.min(d, Math.hypot(wx - ex * h, wy - ey * h));
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) sgn = -sgn;
    }
    return sgn * d - grow;
  };
}

export interface CoverOptions {
  /** 'fitted' = shovel inside (full shape, strap closed); 'empty' = flattened, strap open. */
  state?: 'fitted' | 'empty';
  cell?: number;
}

/** Canvas cover in shovel-local space (the blade occupies it). */
export function buildMPL50Cover(o: CoverOptions = {}): THREE.Group {
  const fitted = (o.state ?? 'fitted') === 'fitted';
  const grow = 0.0075;
  const d2 = outline2D(grow);
  const topY = BL + 0.028;
  const f: SDF = (x, y, z) => {
    const e = d2(x, y); // < 0 inside
    const zc = z - dish(Math.max(-HW, Math.min(HW, x))) * (fitted ? 1 : 0.4);
    let half = fitted ? 0.0042 : 0.0022;
    if (fitted) {
      // socket & rib bulge on the front face near the top centre, handle bulge at the mouth
      const rib = Math.exp(-((x / 0.012) ** 2)) * smoothstep(BL - 0.1, BL - 0.04, y);
      const mouth = Math.max(0, 1 - (x / (MPL50.handleR + 0.006)) ** 2) ** 0.5 * smoothstep(BL - 0.05, BL - 0.015, y);
      half = Math.max(half + rib * 0.004, (MPL50.handleR + 0.0048) * mouth);
    }
    // seam flange: panels come together near the outline
    const inset = -e;
    const lens = Math.min(1, Math.max(0, (inset - 0.001) / 0.024));
    const h = 0.0013 + (half - 0.0013) * (1 - (1 - lens) ** 2.2) + 0.00035 * (valueNoise3(x * 90, y * 90, 3, 5) - 0.5) + 0.0006 * (valueNoise3(x * 25, y * 25, 7, 9) - 0.5) * lens;
    const dz = Math.abs(zc) - h;
    const r = 0.0012;
    const qx = Math.max(e + r, 0), qz = Math.max(dz + r, 0);
    let dist = Math.hypot(qx, qz) + Math.min(Math.max(e + r, dz + r), 0) - r;
    // open mouth at the top: hollow the inside near the top edge so the opening reads
    if (fitted) {
      const hole = Math.hypot(x / 1.06, z / 0.94) - (MPL50.handleR + 0.0006);
      dist = Math.max(dist, -Math.max(hole, topY - 0.002 - y) + 0.0);
      dist = Math.max(dist, y - topY);
    }
    return dist;
  };
  const cell = o.cell ?? 0.0036;
  const geo = sdfMesh(f, { min: [-HW - 0.015, -0.012, -0.03], max: [HW + 0.015, topY + 0.004, 0.035] }, cell, { lipschitz: 1.6 });
  const parts: THREE.Object3D[] = [part(geo, SU.canvas(), { name: 'cover' })];
  // stitch rows on both faces along the seam flange
  const pts: THREE.Vector3[] = [];
  const N = 70;
  for (let i = 0; i <= N; i++) {
    const y = (topY - 0.004) * (i / N);
    const hw = (y > BL ? HW : bladeHalfW(y)) + grow - 0.0038;
    pts.push(new THREE.Vector3(Math.max(0.001, hw), y + (i === 0 ? 0.004 : 0), 0));
  }
  const edge = [...pts.slice().reverse().map((p) => new THREE.Vector3(-p.x, p.y, 0)), ...pts];
  for (const sz of [1, -1]) {
    const e = edge.map((p) => new THREE.Vector3(p.x, p.y, sz * 0.0021 + dish(Math.max(-HW, Math.min(HW, p.x))) * (fitted ? 1 : 0.4)));
    parts.push(part(stitches(e, { len: 0.0035, gap: 0.002, r: 0.0006 }), SU.thread()));
  }
  // retention strap: from the back panel over the handle to a buckle on the front
  const strapMat = SU.canvasStrap();
  const hr = MPL50.handleR + 0.0045;
  const sy = topY + (fitted ? 0.004 : -0.002);
  if (fitted) {
    const ring: THREE.Vector3[] = [];
    const nr: THREE.Vector3[] = [];
    for (let k = 0; k <= 16; k++) {
      const a = Math.PI / 2 + 0.3 + (k / 16) * Math.PI * 1.85;
      ring.push(new THREE.Vector3(Math.sin(a) * hr * 1.06, sy, Math.cos(a) * hr * 0.94));
      nr.push(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)));
    }
    parts.push(part(G.strap(ring, 0.017, 0.0024, nr, { samples: 48 }), strapMat));
    const b = wireFrame(0.022, 0.024, 0.0012, 0.003);
    parts.push(part(b, SU.darkSteel(), { p: [hr * 1.06 + 0.0022, sy, 0.0045], r: [90, 90, 0] }));
    // strap tail down the front panel
    parts.push(part(G.strap([[hr * 1.06 + 0.0012, sy, 0.0075], [hr * 1.06 + 0.004, sy - 0.006, 0.0095], [0.03, sy - 0.02, 0.0085]], 0.016, 0.0022, [0.3, 0.1, 1], { samples: 16 }), strapMat));
  } else {
    parts.push(part(G.strap([[0, topY - 0.02, -0.0035], [0, topY + 0.004, -0.0046], [0, topY + 0.03, -0.006], [0.006, topY + 0.06, -0.006]], 0.017, 0.0024, [0, 0, -1], { samples: 24 }), strapMat));
    const b = wireFrame(0.022, 0.024, 0.0012, 0.003);
    parts.push(part(b, SU.darkSteel(), { p: [0, topY - 0.012, 0.004], r: [0, 0, 90] }));
  }
  const g = group(parts);
  g.name = 'mpl50-cover';
  return g;
}

/**
 * Gear piece: shovel in its cover, worn on the waist belt with the blade UP and the handle
 * hanging down. Origin = belt-loop centre (belt mid-height), the loop lies on z = 0.
 */
export function buildMPL50Gear(o: ShovelOptions = {}): GearPiece {
  const shovel = buildMPL50Shovel({ grainAxis: o.grainAxis ?? [0, 1, 0] });
  const cover = buildMPL50Cover({ state: 'fitted' });
  const inner = group([shovel, cover]);
  // blade up: rotate 180 deg about Z (handle -> -Y)
  inner.rotation.z = Math.PI;
  const loopTopY = 0.028, loopBotY = -0.028;
  const zBack = 0.0065;
  // cover tip ends ~0.045 above the belt centre; cover back face (-Z) sits on the belt
  inner.position.set(0, 0.045 + 0.0075, zBack + 0.0042 + 0.0012);
  const loop = part(beltLoop(0, loopTopY, loopBotY, zBack, 0.04), SU.canvasStrap());
  const st = part(
    G.mergeGeometries([
      stitches([[-0.018, loopTopY - 0.002, zBack - 0.0004], [0.018, loopTopY - 0.002, zBack - 0.0004]]),
      stitches([[-0.018, loopBotY + 0.002, zBack - 0.0004], [0.018, loopBotY + 0.002, zBack - 0.0004]]),
    ])!,
    SU.thread(),
  );
  const obj = group([inner, loop, st]);
  obj.name = 'mpl50-in-cover';
  return {
    id: 'su-mpl50-in-cover',
    name: 'MPL-50 shovel in canvas cover',
    object: obj,
    mount: 'belt-right',
    size: { w: 0.165, h: 0.52, d: 0.045 },
    belt: { loopWidth: 0.05 },
  };
}
