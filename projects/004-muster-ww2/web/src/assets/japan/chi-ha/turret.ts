/**
 * Original Chi-Ha turret (57 mm Type 97 tank gun): small two-man riveted turret with sloping,
 * curved sides and a rear bustle, commander's cupola with vision slits and a split hatch, the
 * gunner's two-leaf roof hatch to its left, rounded gun mantlet with the short 57 mm gun, side vision
 * ports, the rear ball-mounted 7.7 mm MG and the horseshoe ("hachimaki") radio antenna on stand-offs.
 *
 * Turret frame: origin at the turret ring centre on the hull roof, +Z forward, +X the tank's left.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { T } from './dims';
import type { Pal } from './palette';
import { rb, merge, rivet, latheZ } from './util';

const h = T.h;
const y0 = 0.03; // body starts above the race guard ring

/** outward plan radius at height y */
const rad = (y: number) => T.rBase + ((T.rTop - T.rBase) * (y - y0)) / (h - y0);
/** point on the outer wall at plan angle th (0 = +Z, +90 deg = +X) and height y, pushed out by `off` */
export function wall(th: number, y: number, off = 0): THREE.Vector3 {
  const r = rad(y) + off;
  const c = Math.cos(th), s = Math.sin(th);
  const z = c >= 0 ? r * c : (r + T.bustle) * c;
  return new THREE.Vector3(r * s, y, z);
}
/** outward wall normal (numerical) */
export function wallN(th: number, y: number): THREE.Vector3 {
  const e = 1e-3;
  const dT = wall(th + e, y).sub(wall(th - e, y));
  const dY = wall(th, y + e).sub(wall(th, y - e));
  const n = new THREE.Vector3().crossVectors(dT, dY).normalize();
  const p = wall(th, y);
  if (n.dot(new THREE.Vector3(p.x, 0, p.z)) < 0) n.negate();
  return n;
}

/** place an object modelled facing +Y (lying on y = 0) on the wall at (th, y); local +X along the wall tangent */
function onWall(obj: THREE.Object3D, th: number, y: number): THREE.Object3D {
  const N = wallN(th, y);
  const U = wall(th + 1e-3, y).sub(wall(th - 1e-3, y)).normalize().negate();
  const W = new THREE.Vector3().crossVectors(U, N);
  const g = new THREE.Group();
  g.add(obj);
  new THREE.Matrix4().makeBasis(U, N, W).setPosition(wall(th, y)).decompose(g.position, g.quaternion, g.scale);
  return g;
}

const RING = 72;
function body(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const ring = (y: number, off: number): G.V2[] => {
    const pts: G.V2[] = [];
    for (let i = 0; i < RING; i++) {
      const p = wall((i / RING) * Math.PI * 2, y, off);
      pts.push([p.x, -p.z]);
    }
    return pts;
  };
  const g = G.loftZ(
    [
      { z: y0, ring: ring(y0, -0.012) },
      { z: y0 + 0.012, ring: ring(y0 + 0.012, 0) },
      { z: h - 0.014, ring: ring(h - 0.014, 0) },
      { z: h, ring: ring(h, -0.014) },
    ],
    true,
    30,
  );
  g.rotateX(-Math.PI / 2);
  out.push(part(g, P.paint));
  // race guard ring under the turret
  out.push(part(G.lathe([[0.56, 0], [0.62, 0], [0.625, 0.012], [0.62, y0 + 0.004], [0.56, y0 + 0.004]], 64, 40), P.paint));
  // rivets: base and roof-edge rows, vertical seams, roof perimeter
  const rp: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  const perim = (y: number, pitch: number) => {
    const L = 2 * Math.PI * rad(y) + 2 * T.bustle;
    const n = Math.round(L / pitch);
    for (let i = 0; i < n; i++) {
      const th = (i / n) * Math.PI * 2;
      rp.push({ p: wall(th, y), n: wallN(th, y), spin: i });
    }
  };
  perim(y0 + 0.04, 0.085);
  perim(h - 0.045, 0.085);
  for (const deg of [-62, 62, -128, 128, 180]) {
    const th = (deg * Math.PI) / 180;
    for (let y = y0 + 0.11; y < h - 0.1; y += 0.075) rp.push({ p: wall(th, y), n: wallN(th, y), spin: y * 30 });
  }
  const nr = Math.round((2 * Math.PI * (T.rTop - 0.04)) / 0.09);
  for (let i = 0; i < nr; i++) {
    const th = (i / nr) * Math.PI * 2;
    const p = wall(th, h, -0.045);
    rp.push({ p: new THREE.Vector3(p.x, h, p.z), n: new THREE.Vector3(0, 1, 0), spin: i });
  }
  out.push(part(G.scatter(rivet(), rp), P.paint));
  return out;
}

/* ------------------------------------------------------------------ gun & mantlet */

function gun(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const gy = T.gunY, zc = 0.36, Rm = 0.29, half = (48 * Math.PI) / 180;
  // mantlet: vertical cylinder segment in plan, bevelled, extruded over its height
  const plan: G.V2[] = [];
  const n = 20;
  for (let i = 0; i <= n; i++) {
    const a = -half + (2 * half * i) / n;
    plan.push([Math.sin(a) * Rm, -(zc + Math.cos(a) * Rm)]);
  }
  plan.push([Math.sin(half) * Rm, -0.46]);
  plan.push([-Math.sin(half) * Rm, -0.46]);
  const mh = 0.3;
  const mg = G.extrude(G.shape(plan.reverse()), mh, 0.012, 6, 2);
  mg.rotateX(-Math.PI / 2);
  mg.translate(0, gy, 0);
  out.push(part(mg, P.cast));
  const zf = zc + Rm; // mantlet front
  // rivets / bolts round the mantlet face
  const rp: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (const yy of [gy - mh / 2 + 0.035, gy + mh / 2 - 0.035]) {
    for (let i = 0; i < 9; i++) {
      const a = -half * 0.85 + (1.7 * half * i) / 8;
      rp.push({ p: new THREE.Vector3(Math.sin(a) * Rm, yy, zc + Math.cos(a) * Rm), n: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), spin: i });
    }
  }
  out.push(part(G.scatter(rivet(), rp), P.cast));
  // gun sleeve with its collar, then the barrel
  out.push(part(latheZ([[0.0, zf - 0.03], [0.1, zf - 0.03], [0.1, zf + 0.015], [0.085, zf + 0.03], [0.072, zf + 0.035], [0.072, zf + 0.2], [0.064, zf + 0.215], [0.0, zf + 0.215]], 32, 35), P.cast, { p: [0, gy, 0] }));
  const zt = T.gunZ + T.barrel;
  out.push(
    part(
      latheZ(
        [
          [0.0, zf + 0.2],
          [0.047, zf + 0.2],
          [0.045, zf + 0.5],
          [0.041, zt - 0.05],
          [0.047, zt - 0.045],
          [0.047, zt - 0.004],
          [0.043, zt],
          [0.02, zt],
          [0.02, zt - 0.08],
          [0.0, zt - 0.08],
        ],
        32,
        35,
      ),
      P.paint,
      { p: [0, gy, 0] },
    ),
  );
  out.push(part(G.cyl(0.02, 0.02, 0.004, 16), P.void, { p: [0, gy, zt - 0.075], r: [90, 0, 0] }));
  // sight aperture (left of the gun) with its hood
  out.push(part(rb(0.05, 0.05, 0.02, 0.006), P.void, { p: [0.15, gy + 0.07, zc + Math.cos(0.52) * Rm - 0.004] }));
  out.push(part(rb(0.1, 0.02, 0.06, 0.006), P.cast, { p: [0.15, gy + 0.11, zc + Math.cos(0.52) * Rm + 0.012], r: [0, -30, 0] }));
  return out;
}

/* ------------------------------------------------------------------ roof fittings */

function cupola(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const r0 = 0.2, r1 = 0.185, ch = 0.19;
  ps.push(part(G.lathe([[0.0, 0], [r0 + 0.02, 0], [r0 + 0.02, 0.02], [r0, 0.03], [r1, ch], [r1 - 0.012, ch + 0.01], [0.0, ch + 0.01]], 48, 35), P.paint));
  // vision slits all round with a brow over each
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    const s = Math.sin(a), c = Math.cos(a);
    const r = (r0 + r1) / 2;
    ps.push(part(G.box(0.1, 0.018, 0.02), P.void, { p: [s * (r - 0.005), 0.115, c * (r - 0.005)], r: [0, (a * 180) / Math.PI, 0] }));
    ps.push(part(rb(0.13, 0.014, 0.03, 0.004), P.paint, { p: [s * (r + 0.008), 0.138, c * (r + 0.008)], r: [0, (a * 180) / Math.PI, 0] }));
  }
  // split hatch: two half discs with hinges across the middle
  for (const s of [-1, 1]) {
    const shape: G.V2[] = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI;
      shape.push([Math.cos(a) * (r1 - 0.02), Math.sin(a) * (r1 - 0.02)]);
    }
    const g = G.extrude(G.shape(shape), 0.022, 0.006, 4, 1);
    g.rotateX(-Math.PI / 2);
    if (s < 0) g.rotateY(Math.PI);
    g.translate(0, ch + 0.012, 0);
    ps.push(part(g, P.paint));
    ps.push(part(G.cyl(0.014, 0.014, 0.06, 10), P.paint, { p: [s * 0.08, ch + 0.028, 0.0], r: [0, 0, 90] }));
    ps.push(part(G.tube([[s * -0.03, ch + 0.034, s * -0.1], [s * -0.03, ch + 0.06, s * -0.1], [s * 0.03, ch + 0.06, s * -0.1], [s * 0.03, ch + 0.034, s * -0.1]], 0.006, 6), P.paint));
  }
  // periscope / pistol-port boss on one leaf
  ps.push(part(G.cyl(0.035, 0.04, 0.03, 16), P.paint, { p: [0.0, ch + 0.045, 0.09] }));
  const rp: { p: THREE.Vector3; n: THREE.Vector3; spin: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    rp.push({ p: new THREE.Vector3(Math.sin(a) * (r0 + 0.008), 0.02, Math.cos(a) * (r0 + 0.008)), n: new THREE.Vector3(0, 1, 0), spin: a });
  }
  ps.push(part(G.scatter(rivet(), rp), P.paint));
  return group(ps);
}

function gunnerHatch(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const W = 0.3, L = 0.36;
  ps.push(part(rb(W + 0.05, 0.02, L + 0.05, 0.008), P.paint, { p: [0, 0.01, 0] }));
  for (const s of [-1, 1]) {
    ps.push(part(rb(W / 2 - 0.006, 0.022, L, 0.008), P.paint, { p: [s * (W / 4), 0.031, 0] }));
    ps.push(part(G.cyl(0.013, 0.013, 0.08, 10), P.paint, { p: [s * (W / 2 + 0.018), 0.03, 0.1], r: [90, 0, 0] }));
    ps.push(part(G.cyl(0.013, 0.013, 0.08, 10), P.paint, { p: [s * (W / 2 + 0.018), 0.03, -0.1], r: [90, 0, 0] }));
    ps.push(part(G.tube([[s * 0.04, 0.04, -0.05], [s * 0.04, 0.065, -0.04], [s * 0.04, 0.065, 0.04], [s * 0.04, 0.04, 0.05]], 0.006, 6), P.paint));
  }
  return group(ps);
}

function visionPort(P: Pal): THREE.Object3D {
  return group([
    part(rb(0.2, 0.018, 0.1, 0.006), P.paint, { p: [0, 0.009, 0] }),
    part(rb(0.15, 0.028, 0.055, 0.008), P.paint, { p: [0, 0.03, 0] }),
    part(G.box(0.1, 0.01, 0.01), P.void, { p: [0, 0.043, 0] }),
  ]);
}

function rearMG(P: Pal): THREE.Object3D {
  // +Y out of the wall
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.lathe([[0.13, 0], [0.125, 0.018], [0.105, 0.04], [0.09, 0.045], [0.085, 0.035]], 28, 40), P.cast));
  ps.push(part(G.lathe([[0.0, -0.01], [0.08, -0.01], [0.088, 0.03], [0.078, 0.065], [0.048, 0.09], [0.0, 0.095]], 24, 60), P.cast));
  ps.push(part(G.rod([0, 0.06, 0], [0, 0.2, 0], 0.027, 14), P.cast));
  ps.push(part(G.rod([0, 0.2, 0], [0, 0.32, 0], 0.018, 12), P.gun));
  ps.push(part(G.rod([0, 0.31, 0], [0, 0.322, 0], 0.0065, 8), P.void));
  return group(ps);
}

/* ------------------------------------------------------------------ antenna */

function antenna(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const ya = h - 0.035, off = 0.13;
  const a0 = (-150 * Math.PI) / 180, a1 = (150 * Math.PI) / 180;
  const pts: THREE.Vector3[] = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const th = a0 + ((a1 - a0) * i) / n;
    const w = wall(th, ya, 0);
    const nn = wallN(th, ya);
    nn.y = 0;
    nn.normalize();
    pts.push(w.addScaledVector(nn, off));
  }
  out.push(part(G.tube(pts, 0.011, 8, 120), P.paint));
  // end caps
  for (const p of [pts[0], pts[pts.length - 1]]) out.push(part(new THREE.SphereGeometry(0.014, 10, 6), P.paint, { p: [p.x, p.y, p.z] }));
  // stand-offs with insulator blocks
  const st: THREE.BufferGeometry[] = [];
  const ins: THREE.BufferGeometry[] = [];
  for (const deg of [-138, -95, -48, 0, 48, 95, 138]) {
    const th = (deg * Math.PI) / 180;
    const w = wall(th, ya - 0.01);
    const nn = wallN(th, ya);
    nn.y = 0;
    nn.normalize();
    const e = w.clone().addScaledVector(nn, off - 0.012);
    st.push(G.rod(w.clone().addScaledVector(nn, -0.005), e, 0.008, 8));
    const b = G.cyl(0.02, 0.02, 0.04, 10);
    b.rotateX(Math.PI / 2);
    b.lookAt(nn);
    const m = w.clone().addScaledVector(nn, off * 0.55);
    b.translate(m.x, m.y, m.z);
    ins.push(b);
    const f = rb(0.05, 0.05, 0.012, 0.004);
    f.lookAt(nn);
    const q = w.clone().addScaledVector(nn, 0.004);
    f.translate(q.x, q.y, q.z);
    st.push(f);
  }
  out.push(part(merge(st), P.paint));
  out.push(part(merge(ins), P.black));
  // lead-in: from the rear end down to the insulated entry on the bustle
  const e = pts[0];
  const w = wall(a0, ya - 0.1, 0.01);
  out.push(part(G.tube([e, e.clone().lerp(w, 0.5).add(new THREE.Vector3(0, -0.02, 0)), w], 0.006, 6, 16), P.black));
  out.push(part(G.cyl(0.022, 0.026, 0.03, 12), P.black, { p: [w.x, w.y, w.z] }));
  return out;
}

export function turret(P: Pal, withAntenna = true): THREE.Group {
  const out: THREE.Object3D[] = [...body(P), ...gun(P), ...(withAntenna ? antenna(P) : [])];
  out.push(group([cupola(P)], { p: [-0.14, h, -0.08] }));
  out.push(group([gunnerHatch(P)], { p: [0.27, h, 0.04] }));
  for (const deg of [-88, 88]) out.push(onWall(visionPort(P), (deg * Math.PI) / 180, 0.3));
  out.push(onWall(rearMG(P), (212 * Math.PI) / 180, 0.26));
  // pistol port plug on the left rear
  out.push(onWall(group([part(G.cyl(0.045, 0.05, 0.03, 18), P.paint, { p: [0, 0.015, 0] }), part(G.cyl(0.018, 0.018, 0.02, 10), P.paint, { p: [0, 0.035, 0] })]), (140 * Math.PI) / 180, 0.26));
  return group(out, { name: 'turret' });
}

