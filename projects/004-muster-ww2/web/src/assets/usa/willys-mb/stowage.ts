/**
 * Willys MB stowage: pioneer tools on the body left side (single-bit axe with its blade in a
 * sheath welded to the tub, D-handle round-point shovel; brackets and webbing straps), the
 * 5-gallon fuel can in its bracket on the rear panel (driver's side), the spare wheel on its
 * carrier (passenger's side), and the canvas top folded on the two top bows, which are folded
 * back onto rests at the rear panel.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, type V3, merge, xf, box, cylX, latheZ, bentRod, pipe, rrect } from './util';
import { buildWheel } from './wheel';

type Geo = THREE.BufferGeometry;
const XS = D.bodyX; // outer face of the tub side

/* ------------------------------------------------------------------ pioneer tools */

function axe(): { wood: Geo[]; tool: Geo[]; paint: Geo[]; web: Geo[]; steel: Geo[] } {
  const wood: Geo[] = [];
  const tool: Geo[] = [];
  const paint: Geo[] = [];
  const web: Geo[] = [];
  const steel: Geo[] = [];
  const x = XS + 0.03, y = 0.705, zh = 0.3;
  // handle: slightly oval hickory, swelling to the knob at the rear end
  const h = latheZ(
    [
      [0, -0.345],
      [0.014, -0.343],
      [0.019, -0.33],
      [0.018, -0.31],
      [0.0145, -0.28],
      [0.0135, -0.1],
      [0.0145, 0.2],
      [0.0155, 0.33],
      [0.0145, 0.37],
      [0, 0.372],
    ],
    18,
    40,
  );
  h.scale(0.82, 1, 1);
  wood.push(xf(h, [x, y, 0]));
  // head: poll + eye (thick) and the flaring bit (thin), edge down into the sheath
  const upper: V2[] = [
    [-0.028, 0.045],
    [0.028, 0.045],
    [0.031, 0.0],
    [0.024, -0.03],
    [-0.024, -0.03],
    [-0.031, 0.0],
  ];
  const bit: V2[] = [
    [-0.024, -0.028],
    [0.024, -0.028],
    [0.046, -0.074],
    [0.05, -0.085],
    [-0.05, -0.085],
    [-0.046, -0.074],
  ];
  const mk = (o: V2[], th: number) => {
    const g = G.extrude(G.shape(o), th, 0.002, 4, 1);
    // extrude along local Z -> world X; outline (u, v) -> (z, y)
    g.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    G.flipWinding(g);
    g.translate(x - 0.004, y, zh);
    return g;
  };
  tool.push(mk(upper, 0.032), mk(bit, 0.014));
  // sheath welded to the tub over the bit
  const sh = { y0: 0.61, y1: 0.668, z0: zh - 0.062, z1: zh + 0.062 };
  paint.push(box(0.004, sh.y1 - sh.y0, sh.z1 - sh.z0, [XS + 0.002, (sh.y0 + sh.y1) / 2, zh], 0.0015));
  paint.push(box(0.03, 0.004, sh.z1 - sh.z0, [XS + 0.017, sh.y0 + 0.002, zh], 0.0015));
  paint.push(box(0.004, sh.y1 - sh.y0, sh.z1 - sh.z0, [XS + 0.032, (sh.y0 + sh.y1) / 2, zh], 0.0015));
  for (const dz of [-1, 1]) paint.push(box(0.03, sh.y1 - sh.y0, 0.004, [XS + 0.017, (sh.y0 + sh.y1) / 2, zh + dz * (sh.z1 - sh.z0) / 2], 0.0015));
  // handle bracket with a strap through footman loops
  const zb = -0.22;
  paint.push(box(0.004, 0.06, 0.045, [XS + 0.002, y, zb], 0.0015));
  paint.push(box(0.034, 0.008, 0.035, [XS + 0.019, y - 0.02, zb], 0.002));
  web.push(strapAround(x, y, zb, 0.021, 0.016));
  for (const dy of [0.034, -0.034]) steel.push(bentRod([[XS, y + dy, zb - 0.018], [XS + 0.006, y + dy, zb - 0.012], [XS + 0.006, y + dy, zb + 0.012], [XS, y + dy, zb + 0.018]], 0.0025, 0.004));
  return { wood, tool, paint, web, steel };
}

/** A webbing strap around a handle (axis Z) and back to the tub side. */
function strapAround(x: number, y: number, z: number, ry: number, rx: number): Geo {
  const pts: V3[] = [];
  const nrm: V3[] = [];
  pts.push([XS + 0.003, y + ry + 0.012, z]);
  nrm.push([0, 1, 0]);
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 - (i / 10) * Math.PI;
    pts.push([x + Math.cos(a) * (rx + 0.003), y + Math.sin(a) * (ry + 0.003), z]);
    nrm.push([Math.cos(a), Math.sin(a), 0]);
  }
  pts.push([XS + 0.003, y - ry - 0.012, z]);
  nrm.push([0, -1, 0]);
  return G.strap(pts, 0.025, 0.003, nrm, { smooth: false });
}

function shovel(): { wood: Geo[]; tool: Geo[]; paint: Geo[]; web: Geo[]; steel: Geo[] } {
  const wood: Geo[] = [];
  const tool: Geo[] = [];
  const paint: Geo[] = [];
  const web: Geo[] = [];
  const steel: Geo[] = [];
  const x = XS + 0.026, y = 0.585;
  // shaft (ash) from the D-grip back to the blade socket
  wood.push(G.rod([x, y, 0.405], [x, y, -0.105], 0.0165, 16));
  // D-grip: two tines diverging to the cross grip
  for (const s of [1, -1]) wood.push(bentRod([[x, y + s * 0.012, 0.4], [x, y + s * 0.046, 0.47], [x, y + s * 0.046, 0.505]], 0.0085, 0.04, 10));
  wood.push(xf(G.cyl(0.0145, 0.0145, 0.1, 16), [x, y, 0.515]));
  tool.push(latheZ([[0.0185, 0], [0.019, 0.02], [0.018, 0.04], [0, 0.041]], 16, 40).translate(x, y, 0.378));
  for (const s of [1, -1]) tool.push(box(0.018, 0.012, 0.022, [x, y + s * 0.048, 0.505], 0.004));
  // steel socket and the round-point blade, slightly dished
  tool.push(xf(G.cyl(0.021, 0.017, 0.07, 16), [x, y, -0.14], [90, 0, 0]));
  const hw = 0.095;
  const zs = -0.172, zm = -0.37, ze = -0.475;
  const outline: V2[] = [[zs, -0.028], [zs - 0.01, -hw * 0.96], [zs - 0.03, -hw], [zm, -hw]];
  for (let i = 1; i < 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * Math.PI;
    outline.push([zm - (zm - ze) * Math.cos(a), hw * Math.sin(a)]);
  }
  outline.push([zm, hw], [zs - 0.03, hw], [zs - 0.01, hw * 0.96], [zs, 0.028]);
  const blade = G.extrude(G.shape(outline), 0.004, 0.0012, 4, 1);
  blade.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
  G.flipWinding(blade);
  const pa = blade.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pa.count; i++) {
    const v = pa.getY(i) / hw;
    pa.setX(i, pa.getX(i) + XS + 0.006 + 0.014 * Math.max(0, 1 - v * v));
    pa.setY(i, pa.getY(i) + y);
  }
  blade.computeVertexNormals();
  tool.push(blade);
  // blade tip clip and shaft bracket with strap
  paint.push(box(0.004, 0.05, 0.05, [XS + 0.002, y, -0.44], 0.0015));
  paint.push(box(0.028, 0.012, 0.04, [XS + 0.016, y - 0.028, -0.44], 0.002));
  paint.push(box(0.028, 0.012, 0.04, [XS + 0.016, y + 0.028, -0.44], 0.002));
  paint.push(box(0.004, 0.055, 0.045, [XS + 0.002, y, 0.12], 0.0015));
  paint.push(box(0.03, 0.008, 0.035, [XS + 0.017, y - 0.021, 0.12], 0.002));
  web.push(strapAround(x, y, 0.12, 0.02, 0.019));
  web.push(strapAround(x - 0.004, y, -0.44, 0.03, 0.02));
  return { wood, tool, paint, web, steel };
}

/* ------------------------------------------------------------------ fuel can */

function jerrycan(): { paint: Geo[]; steel: Geo[]; web: Geo[]; chassis: Geo[] } {
  const paint: Geo[] = [];
  const steel: Geo[] = [];
  const web: Geo[] = [];
  const chassis: Geo[] = [];
  const W = 0.345, H = 0.47, T = 0.165;
  const cx = D.jerry.x, y0 = 0.522;
  const cz = D.zRear - 0.008 - T / 2;
  const cy = y0 + H / 2;
  paint.push(box(W, H, T, [cx, cy, cz], 0.02));
  // raised X pressings on both broad faces
  const ang = (Math.atan2(H - 0.06, W - 0.06) * 180) / Math.PI;
  const diag = Math.hypot(W - 0.06, H - 0.06);
  for (const s of [1, -1]) {
    const zf = cz + s * (T / 2 + 0.001);
    for (const a of [ang, -ang]) paint.push(box(diag, 0.03, 0.006, [cx, cy, zf], 0.003, [0, 0, a]));
    paint.push(box(W - 0.02, 0.012, 0.004, [cx, cy + H / 2 - 0.035, zf], 0.002));
  }
  // welded seam around the edge at mid-thickness
  const seam = rrect(-W / 2 - 0.001, -H / 2 - 0.001, W / 2 + 0.001, H / 2 + 0.001, [0.02, 0.02, 0.02, 0.02], 4).map(([x, yy]) => new THREE.Vector3(cx + x, cy + yy, cz));
  paint.push(pipe([...seam, seam[0]], 0.0035, 6, true));
  // three carrying handles across the top
  const yt = y0 + H;
  for (const dx of [-0.075, 0, 0.075]) {
    steel.push(bentRod([[cx + dx, yt - 0.004, cz - 0.05], [cx + dx, yt + 0.028, cz - 0.04], [cx + dx, yt + 0.028, cz + 0.04], [cx + dx, yt - 0.004, cz + 0.05]], 0.0065, 0.012));
  }
  // spout with screw cap on the outer top corner, chained
  paint.push(xf(G.cyl(0.024, 0.026, 0.03, 20), [cx + W / 2 - 0.05, yt + 0.01, cz], [0, 0, -20]));
  paint.push(xf(latheZ([[0, 0], [0.029, 0], [0.03, 0.004], [0.03, 0.02], [0.026, 0.024], [0, 0.025]], 24, 40), [cx + W / 2 - 0.044, yt + 0.024, cz], [-90, 0, -20]));
  // bracket: tray under the can, front lip, side guides, gussets to the rear panel
  const zp = D.zRear;
  chassis.push(box(W + 0.03, 0.005, T + 0.02, [cx, y0 - 0.0025, cz - 0.004], 0.0015));
  chassis.push(box(W + 0.03, 0.035, 0.005, [cx, y0 + 0.012, cz - T / 2 - 0.012], 0.0015));
  for (const s of [1, -1]) {
    chassis.push(box(0.005, 0.3, 0.03, [cx + s * (W / 2 + 0.006), y0 + 0.15, zp - 0.015], 0.0015));
    chassis.push(box(0.005, 0.07, T, [cx + s * (W / 2 + 0.006), y0 + 0.03, cz], 0.0015));
    chassis.push(box(0.03, 0.06, 0.012, [cx + s * 0.1, y0 - 0.03, zp - 0.006], 0.002));
  }
  // strap round the can with a buckle on the rear face
  const yS = cy + 0.08;
  const ring = rrect(-W / 2 - 0.004, -T / 2 - 0.004, W / 2 + 0.004, T / 2 + 0.006, [0.018, 0.018, 0.018, 0.018], 4);
  const pts: V3[] = ring.map(([x, zz]) => [cx + x, yS, cz + zz]);
  const nrm: V3[] = ring.map(([x, zz]) => {
    const l = Math.hypot(x / W, zz / T) || 1;
    return [x / W / l, 0, zz / T / l];
  });
  web.push(G.strap(pts, 0.03, 0.003, nrm, { closed: true, smooth: false }));
  steel.push(box(0.04, 0.036, 0.006, [cx - 0.06, yS, cz - T / 2 - 0.008], 0.002));
  return { paint, steel, web, chassis };
}

/* ------------------------------------------------------------------ spare wheel */

const SPARE_Z = -1.566;

function spareCarrier(): Geo[] {
  const zr = D.zRear;
  const { x, y } = D.spare;
  const g: Geo[] = [];
  g.push(box(0.2, 0.2, 0.008, [x, y, zr - 0.004], 0.003));
  const face = SPARE_Z + 0.001;
  const len = zr - 0.008 - face;
  g.push(xf(G.cyl(0.045, 0.06, len, 24), [x, y, zr - 0.008 - len / 2], [-90, 0, 0]));
  for (const s of [1, -1]) g.push(bentRod([[x + s * 0.085, y - 0.075, zr - 0.006], [x + s * 0.03, y - 0.02, face + 0.02]], 0.008, 0.01));
  const bolts: { p: V3; n: V3 }[] = [];
  for (const [dx, dy] of [[-0.08, -0.08], [0.08, -0.08], [0.08, 0.08], [-0.08, 0.08]]) bolts.push({ p: [x + dx, y + dy, zr - 0.008], n: [0, 0, -1] });
  g.push(G.scatter(G.boltHead(0.014, 0.006), bolts));
  return g;
}

/* ------------------------------------------------------------------ folded top */

const TOP = { x: 0.69, zc: -1.355, hz: 0.108, y0: 1.022, hy: 0.068 };

function bundleRing(x: number, n = 40): V2[] {
  // section in (z, y); irregular folds, flat underside where it rests on the bows
  const u = x / TOP.x;
  const end = 1 - 0.22 * Math.pow(Math.abs(u), 8);
  const a = TOP.hz * end, b = TOP.hy * end;
  const yc = TOP.y0 + TOP.hy;
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const c = Math.cos(th), s = Math.sin(th);
    const e = 2 / 2.6;
    let r = 1 + 0.06 * Math.sin(3 * th + 0.7 + x * 2.3) + 0.04 * Math.sin(5 * th + x * 8.0) + 0.025 * Math.sin(x * 21 + th * 2);
    if (s < 0) r *= 1 - 0.1 * Math.abs(s);
    const z = TOP.zc + a * r * Math.sign(c) * Math.pow(Math.abs(c), e);
    let y = yc + b * r * Math.sign(s) * Math.pow(Math.abs(s), e) - 0.012 * (1 - u * u) * Math.max(0, s);
    y = Math.max(y, TOP.y0);
    pts.push([-z, y]);
  }
  return pts;
}

function foldedTop(): { canvas: Geo; web: Geo[]; steel: Geo[]; paint: Geo[]; rubber: Geo[] } {
  const secs: { z: number; ring: V2[] }[] = [];
  const N = 30;
  for (let i = 0; i <= N; i++) {
    const x = -TOP.x + (2 * TOP.x * i) / N;
    secs.push({ z: x, ring: bundleRing(x) });
  }
  const canvas = G.loftZ(secs, true, 50);
  canvas.rotateY(Math.PI / 2);
  // webbing straps around the bundle
  const web: Geo[] = [];
  const steel: Geo[] = [];
  for (const x of [-0.36, 0.36]) {
    const ring = bundleRing(x, 48);
    let cz = 0, cy = 0;
    for (const [zz, yy] of ring) {
      cz += zz;
      cy += yy;
    }
    cz /= ring.length;
    cy /= ring.length;
    const pts: THREE.Vector3[] = [];
    const nrm: THREE.Vector3[] = [];
    for (const [zz, yy] of ring) {
      const dz = zz - cz, dy = yy - cy;
      const l = Math.hypot(dz, dy) || 1;
      pts.push(new THREE.Vector3(x, yy + (dy / l) * 0.004, -(zz + (dz / l) * 0.004)));
      nrm.push(new THREE.Vector3(0, dy / l, -dz / l));
    }
    web.push(G.strap(pts, 0.032, 0.003, nrm, { closed: true, smooth: false }));
    const top = pts.reduce((m, p) => (p.y > m.y ? p : m), pts[0]);
    steel.push(box(0.04, 0.006, 0.03, [x, top.y + 0.003, top.z - 0.03], 0.002));
  }
  // two top bows folded back from their pivots on the tub sides onto the rests at the rear
  const paint: Geo[] = [];
  const rubber: Geo[] = [];
  const zp = -0.6, yp = 0.925;
  const xin = D.bodyX - D.t;
  const bows: [number, number][] = [
    [0.694, 1.012],
    [0.668, 1.036],
  ];
  const zcb = -1.435;
  for (const [xb, yb] of bows) {
    paint.push(
      bentRod(
        [
          [xb, yp, zp],
          [xb, yb, zcb + 0.03],
          [xb - 0.03, yb, zcb],
          [-xb + 0.03, yb, zcb],
          [-xb, yb, zcb + 0.03],
          [-xb, yp, zp],
        ],
        0.012,
        0.05,
        10,
      ),
    );
  }
  for (const s of [1, -1]) {
    // pivot bracket on the inside of the tub side, shared pin
    paint.push(box(0.006, 0.07, 0.07, [s * (xin - 0.003), yp, zp], 0.002));
    steel.push(cylX(0.009, 0.055, [s * (xin - 0.03), yp, zp], 12));
    steel.push(xf(G.boltHead(0.02, 0.008), [s * (xin - 0.058), yp, zp], [0, 0, s * 90]));
    // bow rest on the rear panel: bracket up from the panel, rubber cradle under the bows
    const xr = s * 0.52;
    paint.push(box(0.03, 0.07, 0.006, [xr, 0.95, D.zRear + D.t + 0.003], 0.002));
    paint.push(bentRod([[xr, 0.975, D.zRear + D.t + 0.006], [xr, 0.99, zcb - 0.004]], 0.007, 0.01));
    rubber.push(box(0.05, 0.012, 0.035, [xr, 0.994, zcb], 0.004));
  }
  return { canvas, web, steel, paint, rubber };
}

/* ------------------------------------------------------------------ assembly */

export function buildStowage(): THREE.Object3D {
  const wood: Geo[] = [];
  const tool: Geo[] = [];
  const paint: Geo[] = [];
  const web: Geo[] = [];
  const steel: Geo[] = [];
  const chassis: Geo[] = [];
  const rubber: Geo[] = [];
  for (const t of [axe(), shovel()]) {
    wood.push(...t.wood);
    tool.push(...t.tool);
    paint.push(...t.paint);
    web.push(...t.web);
    steel.push(...t.steel);
  }
  const jc = jerrycan();
  paint.push(...jc.paint);
  steel.push(...jc.steel);
  web.push(...jc.web);
  chassis.push(...jc.chassis, ...spareCarrier());
  const ft = foldedTop();
  web.push(...ft.web);
  steel.push(...ft.steel);
  paint.push(...ft.paint);
  rubber.push(...ft.rubber);
  const spare = buildWheel('spare', 40);
  spare.position.set(D.spare.x, D.spare.y, SPARE_Z);
  spare.rotation.y = Math.PI / 2; // outer face towards the rear
  return group([
    part(merge(wood), P.wood()),
    part(merge(tool), P.tool()),
    part(merge(paint), P.body()),
    part(merge(web), P.web()),
    part(merge(steel), P.steel()),
    part(merge(chassis), P.chassis()),
    part(merge(rubber), P.rubber()),
    part(ft.canvas, P.canvas()),
    spare,
  ]);
}

