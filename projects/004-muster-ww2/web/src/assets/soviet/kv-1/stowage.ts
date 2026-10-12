/**
 * External stowage on the track guards and upper hull sides (late 1941, Chelyabinsk): five cylindrical
 * 160-litre external fuel tanks on saddles with tensioned straps (two on the left guard, three on the
 * right), the ZIP (tools and spares) boxes on the front of both guards, the tow cable on the left
 * side plate, the shovel and the crowbar on the right. Right-side items are built in the left-side
 * frame and mirrored by the caller.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H } from './dims';
import type { Pal } from './palette';
import { surfaceFrame, applyFrame, xf, type P3 } from './util';

/** outer face of the bolted applique plate on the upper hull side */
const XS = H.xSp + 0.025;
const N: P3 = [1, 0, 0];
/** object modelled lying on y = 0 (local +X = hull +Z) placed on the left side plate at (y, z) */
function onSide(obj: THREE.Object3D, y: number, z: number, off = 0): THREE.Object3D {
  return applyFrame(group([obj]), surfaceFrame([XS + off, y, z], [0, 0, 1], N));
}

/* ------------------------------------------------------------------------------------------ */

/** 160-litre external tank: radius, length, centre x, gap to the guard */
export const TANK = { r: 0.18, L: 1.55, x: XS + 0.18 + 0.012, gap: 0.035 };
const TANK_Z3 = [-2.46, -0.86, 0.74];
const TANK_Z2 = [-2.46, -0.86];

function fuelTank(P: Pal): THREE.Object3D {
  const { r, L } = TANK;
  const ps: THREE.Object3D[] = [];
  const e = 0.05;
  const shell = G.lathe(
    [
      [0.0, -L / 2], [r * 0.57, -L / 2 + 0.002], [r * 0.83, -L / 2 + 0.012], [r - 0.006, -L / 2 + 0.03], [r + 0.006, -L / 2 + e - 0.008], [r + 0.006, -L / 2 + e],
      [r, -L / 2 + e + 0.006], [r, L / 2 - e - 0.006], [r + 0.006, L / 2 - e], [r + 0.006, L / 2 - e + 0.008], [r - 0.006, L / 2 - 0.03],
      [r * 0.83, L / 2 - 0.012], [r * 0.57, L / 2 - 0.002], [0.0, L / 2],
    ],
    40,
    35,
  );
  shell.rotateX(Math.PI / 2);
  ps.push(part(shell, P.paint));
  for (const z of [-L / 6, L / 6]) ps.push(part(G.torus(r + 0.001, 0.007, 6, 40), P.paint, { p: [0, 0, z] }));
  // filler cap on the upper side of the rear end, drain plug below
  ps.push(part(G.lathe([[0.0, 0.0], [0.045, 0.0], [0.045, 0.02], [0.036, 0.03], [0.012, 0.032], [0.012, 0.045], [0.0, 0.045]], 18, 40), P.paint, { p: [0, 0.1, -L / 2 + 0.002], r: [-90, 0, 0] }));
  ps.push(part(G.cyl(0.018, 0.018, 0.016, 6), P.paint, { p: [0, -0.12, -L / 2 - 0.002], r: [90, 0, 0] }));
  return group(ps);
}

function fuelTankInstall(P: Pal, z: number, fitted: boolean): THREE.Object3D {
  const { r, x, gap } = TANK;
  const ps: THREE.Object3D[] = [];
  const cy = H.yF + gap + r;
  if (fitted) {
    const t = fuelTank(P);
    t.position.set(x, cy, z);
    ps.push(t);
  }
  for (const dz of [-0.45, 0.45]) {
    // saddle on the guard (curved top following the shell)
    const hw = r - 0.03;
    const outline: G.V2[] = [[-hw, 0], [hw, 0]];
    for (let i = 0; i <= 12; i++) {
      const u = hw - (i / 12) * 2 * hw;
      outline.push([u, cy - H.yF - Math.sqrt((r + 0.004) ** 2 - u * u)]);
    }
    const g = G.extrude(outline, 0.05, 0.004, 4, 1);
    g.translate(x, H.yF, z + dz);
    ps.push(part(g, P.paint));
    // bracket from the saddle to the side plate
    ps.push(part(G.rbox(x - hw - XS + 0.004, 0.05, 0.05, 0.006, 1), P.paint, { p: [(XS + x - hw) / 2, H.yF + 0.025, z + dz] }));
    if (!fitted) continue;
    // steel strap over the shell with the tensioner on the outer side
    const band: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = -0.35 + (i / 20) * (Math.PI + 0.7);
      band.push(new THREE.Vector3(x + Math.cos(a) * (r + 0.006), cy + Math.sin(a) * (r + 0.006), z + dz));
    }
    ps.push(part(G.strap(band, 0.035, 0.004, band.map((p) => new THREE.Vector3(p.x - x, p.y - cy, 0)), { smooth: false }), P.paint));
    ps.push(part(G.rbox(0.03, 0.06, 0.04, 0.006, 1), P.paint, { p: [x + r + 0.02, cy - r * 0.55, z + dz] }));
    ps.push(part(G.rod([x + r + 0.02, cy - r * 0.75, z + dz], [x + r + 0.02, cy - r * 0.2, z + dz], 0.007, 8), P.bright));
    // strap anchor on the side plate
    ps.push(part(G.rbox(0.03, 0.05, 0.06, 0.006, 1), P.paint, { p: [XS + 0.015, cy + 0.06, z + dz] }));
  }
  return group(ps);
}

function zipBox(P: Pal, L: number, Hh: number, W: number): THREE.Object3D {
  // box standing on the guard: L along Z, height Hh, depth W across (X); origin at its base centre
  const ps: THREE.Object3D[] = [];
  const by = 0.02;
  ps.push(part(G.rbox(W, Hh - 0.03, L, 0.012, 2), P.paint, { p: [0, by + (Hh - 0.03) / 2, 0] }));
  ps.push(part(G.rbox(W + 0.016, 0.028, L + 0.016, 0.008, 2), P.paint, { p: [0, by + Hh - 0.016, 0] }));
  ps.push(part(G.rbox(W - 0.08, 0.008, L - 0.14, 0.004, 1), P.paint, { p: [0, by + Hh + 0.001, 0] }));
  for (const z of [-L * 0.32, 0, L * 0.32]) {
    ps.push(part(G.cyl(0.012, 0.012, 0.09, 10), P.paint, { p: [-W / 2 - 0.01, by + Hh - 0.014, z], r: [90, 0, 0] }));
  }
  for (const z of [-L * 0.3, L * 0.3]) {
    ps.push(part(G.rbox(0.012, 0.07, 0.04, 0.004, 1), P.paint, { p: [W / 2 + 0.012, by + Hh - 0.05, z] }));
    ps.push(part(G.torus(0.012, 0.004, 5, 10), P.paint, { p: [W / 2 + 0.018, by + Hh - 0.1, z], r: [0, 90, 0] }));
  }
  for (const z of [-L / 2 + 0.08, L / 2 - 0.08]) ps.push(part(G.rbox(W + 0.03, by + 0.004, 0.06, 0.004, 1), P.paint, { p: [0, (by + 0.004) / 2, z] }));
  return group(ps);
}

function towCable(P: Pal, z0: number, z1: number, y: number): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const r = 0.015;
  const pts: THREE.Vector3[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sag = Math.abs(Math.sin(t * Math.PI * 3)) * 0.012;
    pts.push(new THREE.Vector3(XS + r + 0.002, y - sag, z0 + (z1 - z0) * t));
  }
  ps.push(part(G.tube(pts, r, 8, 140), P.cable));
  for (const [z, dir] of [[z0, Math.sign(z0 - z1)], [z1, Math.sign(z1 - z0)]] as [number, number][]) {
    const eye = part(G.torus(0.05, 0.014, 8, 22), P.cable, { p: [XS + r + 0.002, y, z + dir * 0.06], r: [0, 90, 0] });
    ps.push(eye);
    ps.push(part(G.rod([XS + r + 0.002, y, z - dir * 0.02], [XS + r + 0.002, y, z + dir * 0.02], r * 1.5, 10), P.cable));
    ps.push(onSide(group([
      part(G.rbox(0.05, 0.02, 0.08, 0.005, 1), P.paint, { p: [0, 0.01, 0] }),
      part(G.torus(0.03, 0.01, 6, 14, Math.PI), P.paint, { p: [0, 0.02, 0], r: [0, 90, 0] }),
    ]), y, z + dir * 0.06));
  }
  for (const t of [0.33, 0.66]) {
    const z = z0 + (z1 - z0) * t;
    ps.push(onSide(group([
      part(G.rbox(0.035, 0.012, 0.06, 0.004, 1), P.paint, { p: [0, r * 2 + 0.008, 0] }),
      ...[-0.03, 0.03].map((e) => part(G.rbox(0.035, r * 2 + 0.012, 0.01, 0.003, 1), P.paint, { p: [0, (r * 2 + 0.012) / 2, e] })),
    ]), y, z));
  }
  return group(ps);
}

function shovel(P: Pal): THREE.Object3D {
  // lying on y = 0, handle along local +X, blade at -X
  const ps: THREE.Object3D[] = [];
  const blade: G.V2[] = [[-0.12, 0], [0.12, 0], [0.12, 0.2], [0.07, 0.25], [0.0, 0.27], [-0.07, 0.25], [-0.12, 0.2]];
  const b = G.plate(blade, 0.004, 'xz', 0.0015);
  b.rotateY(Math.PI / 2);
  ps.push(part(xf(b, [-0.2, 0.012, 0]), P.paint));
  ps.push(part(G.rod([-0.2, 0.014, 0], [-0.05, 0.022, 0], 0.02, 10), P.paint));
  ps.push(part(G.rod([-0.05, 0.022, 0], [0.72, 0.025, 0], 0.018, 10), P.wood));
  ps.push(part(G.rod([0.72, 0.025, 0], [0.8, 0.025, 0], 0.02, 10), P.wood));
  for (const x of [0.02, 0.55]) {
    ps.push(part(G.rbox(0.04, 0.012, 0.07, 0.003, 1), P.paint, { p: [x, 0.048, 0] }));
    for (const e of [-0.032, 0.032]) ps.push(part(G.rbox(0.04, 0.045, 0.008, 0.002, 1), P.paint, { p: [x, 0.024, e] }));
  }
  return group(ps);
}

function crowbar(P: Pal, L: number): THREE.Object3D {
  // lying on y = 0 along local X, centred
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.rod([-L / 2 + 0.1, 0.02, 0], [L / 2 - 0.08, 0.02, 0], 0.017, 8), P.paint));
  ps.push(part(G.rod([L / 2 - 0.08, 0.02, 0], [L / 2, 0.012, 0], 0.017, 8, 0.006), P.bright));
  ps.push(part(G.rod([-L / 2 + 0.1, 0.02, 0], [-L / 2 + 0.02, 0.03, 0], 0.017, 8, 0.01), P.bright));
  for (const x of [-L * 0.3, L * 0.3]) {
    ps.push(part(G.rbox(0.04, 0.012, 0.06, 0.003, 1), P.paint, { p: [x, 0.044, 0] }));
    for (const e of [-0.03, 0.03]) ps.push(part(G.rbox(0.04, 0.044, 0.008, 0.002, 1), P.paint, { p: [x, 0.022, e] }));
  }
  return group(ps);
}

/* ------------------------------------------------------------------------------------------ */

function leftSide(P: Pal, tanks: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const z of TANK_Z2) out.push(fuelTankInstall(P, z, tanks));
  const box = zipBox(P, 1.3, 0.34, 0.26);
  box.position.set(XS + 0.14, H.yF, 1.95);
  out.push(box);
  out.push(towCable(P, -2.5, 1.9, 1.67));
  out.push(onSide(shovel(P), 1.42, 0.35));
  return out;
}

/** Right-side stowage, built in the left frame and mirrored by the caller. */
function rightSide(P: Pal, tanks: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (const z of TANK_Z3) out.push(fuelTankInstall(P, z, tanks));
  const box = zipBox(P, 1.0, 0.34, 0.26);
  box.position.set(XS + 0.14, H.yF, 2.2);
  out.push(box);
  out.push(onSide(crowbar(P, 1.5), 1.64, 0.2));
  return out;
}

export function stowage(P: Pal, tanks = true): THREE.Group {
  const right = group(rightSide(P, tanks));
  right.scale.x = -1;
  return group([...leftSide(P, tanks), right], { name: 'stowage' });
}
