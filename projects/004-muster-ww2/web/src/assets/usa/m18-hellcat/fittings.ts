/**
 * External fittings of the M18: headlights with brush guards and a blackout marker lamp on the glacis,
 * tail lights with guards, pioneer tools in clamps on the sloped hull sides (axe, shovel, mattock and
 * crowbar), the rear stowage rack with an optional rolled tarpaulin and jerrycans, and the optional
 * white stars on the hull sides.
 */
import { THREE, G, part, group, decal } from '../../../core/kit';
import type { Pal } from './palette';
import { H } from './dims';
import { glacis, sideX, SIDE_N } from './hull';
import { onSurface, latheX, latheZ, rb, prism, bentRod, merge, type P3 } from './util';

/* ------------------------------------------------------------------------ lights */
function headlight(P: Pal): THREE.Object3D {
  // lamp pointing +Z (hull forward); origin at the lamp centre
  const ps: THREE.Object3D[] = [];
  ps.push(part(latheZ([[0.0, -0.08], [0.05, -0.08], [0.078, -0.055], [0.086, -0.01], [0.086, 0.035], [0.08, 0.042]], 28, 40), P.paint));
  ps.push(part(latheZ([[0.0, 0.028], [0.076, 0.03], [0.076, 0.035], [0.0, 0.038]], 28, 60), P.glass));
  ps.push(part(latheZ([[0.0, -0.02], [0.074, 0.01], [0.074, 0.02], [0.0, 0.02]], 24, 60), P.toolSteel));
  ps.push(part(G.torus(0.082, 0.007, 6, 28), P.paint, { p: [0, 0, 0.04] }));
  // blackout marker lamp on top
  ps.push(part(rb(0.07, 0.045, 0.06, 0.01), P.paint, { p: [0, 0.11, 0.0] }));
  ps.push(part(G.box(0.04, 0.008, 0.004), P.red, { p: [0, 0.112, 0.031] }));
  ps.push(part(G.cyl(0.012, 0.012, 0.03, 8), P.paint, { p: [0, 0.08, 0] }));
  return group(ps);
}

/** Flat-bar hoop guard welded to a plate, arching over a fitting (plate-local: +Y normal). */
function hoopGuard(P: Pal, w: number, h: number, depth: number): THREE.Object3D {
  const pts: THREE.Vector3[] = [];
  const nrm: THREE.Vector3[] = [];
  const n = 14;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI;
    pts.push(new THREE.Vector3((Math.cos(a) * w) / 2, Math.sin(a) * h, 0));
    nrm.push(new THREE.Vector3(Math.cos(a), Math.sin(a) * (w / 2 / h), 0).normalize());
  }
  const bar = G.strap(pts, 0.035, 0.008, nrm, { smooth: false });
  const ps: THREE.Object3D[] = [];
  for (const z of [-depth / 2, depth / 2]) ps.push(part(bar, P.sheet, { p: [0, 0, z] }));
  ps.push(part(G.rbox(0.035, 0.008, depth + 0.035, 0.003, 1), P.sheet, { p: [0, h + 0.002, 0] }));
  for (const s of [-1, 1]) ps.push(part(G.rbox(0.05, 0.01, depth + 0.05, 0.003, 1), P.sheet, { p: [(s * w) / 2, 0.004, 0] }));
  return group(ps);
}

function front(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const g = glacis;
  for (const sx of [-1, 1]) {
    const a = sx * 1.02, b = g.len - 0.3;
    // lamp on a socket bracket standing off the plate, guard over it
    const pos = new THREE.Vector3(...g.at(a, b, 0.16));
    const hl = headlight(P);
    hl.position.copy(pos);
    out.push(hl);
    const foot = new THREE.Vector3(...g.at(a, b, 0.0));
    out.push(part(G.rod(foot, pos.clone().add(new THREE.Vector3(0, -0.07, -0.02)), 0.018, 10), P.paint));
    out.push(onSurface([part(rb(0.1, 0.025, 0.12, 0.008), P.cast, { p: [0, 0.012, 0] })], g.at(a, b), [1, 0, 0], g.n));
    out.push(onSurface([hoopGuard(P, 0.3, 0.3, 0.24)], g.at(a, b + 0.02), [1, 0, 0], g.n));
  }
  return out;
}

function tailLight(P: Pal): THREE.Object3D {
  // lamp facing +Z in its local frame
  return group([
    part(rb(0.14, 0.1, 0.06, 0.012), P.paint, { p: [0, 0, 0.03] }),
    part(G.box(0.05, 0.03, 0.004), P.red, { p: [-0.03, 0.02, 0.061] }),
    part(G.box(0.05, 0.03, 0.004), P.red, { p: [0.03, 0.02, 0.061] }),
    part(G.box(0.1, 0.012, 0.004), P.glass, { p: [0, -0.025, 0.061] }),
  ]);
}

/* ------------------------------------------------------------------------ tools */
function clamp(P: Pal, w: number): THREE.Object3D {
  return group([
    part(rb(w, 0.012, 0.035, 0.004), P.sheet, { p: [0, 0.006, 0] }),
    part(G.tube([[-w / 2 + 0.01, 0.01, 0], [-w / 2 + 0.01, 0.055, 0], [w / 2 - 0.01, 0.055, 0], [w / 2 - 0.01, 0.01, 0]], 0.006, 6, 20), P.sheet),
    part(rb(0.025, 0.012, 0.03, 0.004), P.toolSteel, { p: [w / 2 - 0.01, 0.06, 0] }),
  ]);
}

function axe(P: Pal): THREE.Object3D {
  return group([
    part(G.rod([0, 0.025, -0.4], [0, 0.025, 0.38], 0.016, 10, 0.018), P.wood),
    part(prism([[-0.06, -0.025], [0.1, -0.05], [0.12, 0.0], [0.1, 0.05], [-0.06, 0.025]], 0.04, 'xz', 0.006), P.toolSteel, { p: [0.02, 0.025, 0.4], r: [0, 90, 0] }),
    group([clamp(P, 0.08)], { p: [0, 0, -0.25] }),
    group([clamp(P, 0.1)], { p: [0, 0, 0.3] }),
  ]);
}

function shovel(P: Pal): THREE.Object3D {
  return group([
    part(G.rod([0, 0.025, -0.45], [0, 0.025, 0.2], 0.017, 10), P.wood),
    part(G.tube([[-0.06, 0.025, -0.45], [-0.06, 0.025, -0.52], [0.0, 0.025, -0.56], [0.06, 0.025, -0.52], [0.06, 0.025, -0.45]], 0.012, 8, 24), P.wood),
    part(G.rod([0, 0.025, 0.18], [0, 0.03, 0.3], 0.022, 10), P.toolSteel),
    part(prism([[-0.12, 0.0], [0.12, 0.0], [0.13, 0.2], [0.07, 0.3], [0.0, 0.33], [-0.07, 0.3], [-0.13, 0.2]], 0.006, 'xz', 0.002), P.sheet, { p: [0, 0.03, 0.29] }),
    part(G.rod([0, 0.034, 0.3], [0, 0.034, 0.5], 0.008, 8, 0.004), P.sheet),
    group([clamp(P, 0.08)], { p: [0, 0, -0.2] }),
    group([clamp(P, 0.28)], { p: [0, 0, 0.45] }),
  ]);
}

function mattock(P: Pal): THREE.Object3D {
  return group([
    part(G.rod([0, 0.03, -0.45], [0, 0.03, 0.4], 0.02, 10, 0.028), P.wood),
    // pick-mattock head stowed separately alongside the handle
    part(prism([[-0.022, -0.3], [0.022, -0.3], [0.03, -0.05], [0.03, 0.05], [0.02, 0.26], [0.0, 0.3], [-0.02, 0.26], [-0.03, 0.05], [-0.03, -0.05]], 0.04, 'xz', 0.006), P.toolSteel, { p: [-0.1, 0.022, 0.05] }),
    part(G.cyl(0.042, 0.042, 0.06, 14), P.toolSteel, { p: [-0.1, 0.03, 0.05] }),
    part(G.cyl(0.026, 0.026, 0.062, 12), P.void, { p: [-0.1, 0.031, 0.05] }),
    group([clamp(P, 0.08)], { p: [0, 0, -0.3] }),
    group([clamp(P, 0.08)], { p: [0, 0, 0.2] }),
  ]);
}

function crowbar(P: Pal, L: number): THREE.Object3D {
  return group([
    part(G.rod([0, 0.02, -L / 2], [0, 0.02, L / 2 - 0.08], 0.016, 8), P.toolSteel),
    part(G.rod([0, 0.02, L / 2 - 0.08], [0, 0.012, L / 2], 0.016, 8, 0.004), P.toolSteel),
    part(G.rod([0, 0.02, -L / 2], [0, 0.03, -L / 2 - 0.04], 0.016, 8, 0.006), P.toolSteel),
    group([clamp(P, 0.06)], { p: [0, 0, -L * 0.35] }),
    group([clamp(P, 0.06)], { p: [0, 0, L * 0.35] }),
  ]);
}

function tools(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // tool placement on the sloped side plate: `y` height on the plate, z along the hull
  const put = (sx: number, o: THREE.Object3D, y: number, z: number) => {
    const n: P3 = [sx * SIDE_N[0], SIDE_N[1], 0];
    out.push(onSurface([o], [sx * sideX(y), y, z], [n[1], -n[0], 0], n));
  };
  put(1, shovel(P), 1.13, -1.55);
  put(1, axe(P), 1.33, -1.75);
  put(-1, mattock(P), 1.16, -1.6);
  put(-1, crowbar(P, 1.3), 1.34, -1.7);
  return out;
}

/* ------------------------------------------------------------------------ rear stowage */
function tarpRoll(P: Pal, L: number, r: number): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  const prof: [number, number][] = [[0.0, -L / 2], [r * 0.8, -L / 2], [r * 0.95, -L / 2 + 0.012], [r, -L / 2 + 0.04]];
  const n = 14;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const bulge = 1 + 0.035 * Math.sin(t * Math.PI * 4 + 0.6) * Math.sin(t * Math.PI);
    prof.push([r * bulge, -L / 2 + 0.04 + (L - 0.08) * t]);
  }
  prof.push([r, L / 2 - 0.04], [r * 0.95, L / 2 - 0.012], [r * 0.8, L / 2], [0.0, L / 2]);
  const roll = latheX(prof, 28, 50);
  roll.scale(1, 0.9, 1);
  ps.push(part(roll, P.canvas));
  for (const x of [-L * 0.34, 0, L * 0.34]) {
    ps.push(part(latheX([[r * 0.97, -0.019], [r + 0.005, -0.019], [r + 0.005, 0.019], [r * 0.97, 0.019]], 28, 60), P.canvas, { p: [x, 0, 0], s: [1, 0.9, 1] }));
    ps.push(part(rb(0.045, 0.01, 0.034, 0.003), P.toolSteel, { p: [x, r * 0.9 + 0.006, -0.01] }));
  }
  return group(ps);
}

function jerrycan(P: Pal): THREE.Object3D {
  // 5 gal can standing on y = 0, broad faces along X
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.rbox(0.165, 0.46, 0.34, 0.02, 2), P.paint, { p: [0, 0.23, 0] }));
  // pressed X on the faces
  for (const sx of [-1, 1]) for (const a of [1, -1]) {
    ps.push(part(G.rbox(0.008, 0.36, 0.02, 0.003, 1), P.paint, { p: [sx * 0.084, 0.22, 0], r: [a * 38, 0, 0] }));
  }
  for (const z of [-0.08, 0, 0.08]) ps.push(part(G.cyl(0.012, 0.012, 0.05, 8), P.paint, { p: [0, 0.475, z], r: [0, 0, 90] }));
  ps.push(part(rb(0.04, 0.03, 0.22, 0.006), P.paint, { p: [0, 0.495, 0] }));
  ps.push(part(G.cyl(0.028, 0.028, 0.04, 14), P.toolSteel, { p: [0, 0.47, 0.13], r: [-35, 0, 0] }));
  return group(ps);
}

function rear(P: Pal, stowage: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z = H.rearZ;
  // tail lights with guards at the top corners of the rear plate
  for (const sx of [-1, 1]) {
    const tl = tailLight(P);
    tl.position.set(sx * 1.08, 1.33, z - 0.001);
    tl.rotation.y = Math.PI;
    out.push(tl);
    out.push(onSurface([hoopGuard(P, 0.2, 0.13, 0.12)], [sx * 1.08, 1.3, z], [-1, 0, 0], [0, 0, -1]));
  }
  // stowage rack across the rear plate top: angle-iron cradle arms with a front bar
  const w = 1.7;
  const bars: THREE.BufferGeometry[] = [];
  const xs = [-w / 2, -w / 6, w / 6, w / 2];
  for (const x of xs) bars.push(bentRod([[x, 1.42, z], [x, 1.42, z - 0.2], [x, 1.6, z - 0.21]], 0.012, 0.03, 6));
  bars.push(G.rod([-w / 2, 1.6, z - 0.21], [w / 2, 1.6, z - 0.21], 0.012, 8));
  bars.push(G.rod([-w / 2, 1.42, z - 0.2], [w / 2, 1.42, z - 0.2], 0.012, 8));
  out.push(part(merge(bars), P.sheet));
  for (const x of xs) out.push(part(rb(0.05, 0.05, 0.012, 0.004), P.sheet, { p: [x, 1.42, z - 0.006] }));
  if (stowage) {
    out.push(group([tarpRoll(P, 1.6, 0.09)], { p: [0, 1.5, z - 0.105] }));
    // two jerrycans in holders on the lower rear plate
    for (const sx of [-1, 1]) {
      const x = sx * 0.72;
      out.push(group([jerrycan(P)], { p: [x, 0.84, z - 0.1], r: [0, 90, 0] }));
      out.push(part(rb(0.4, 0.012, 0.2, 0.004), P.sheet, { p: [x, 0.834, z - 0.1] }));
      out.push(part(G.tube([[x - 0.2, 1.1, z], [x - 0.2, 1.1, z - 0.19], [x + 0.2, 1.1, z - 0.19], [x + 0.2, 1.1, z]], 0.008, 6, 24), P.sheet));
      out.push(part(prism([[0, 0], [0.19, 0], [0.19, 0.03], [0, 0.26]], 0.01, 'zy', 0.002), P.sheet, { p: [x - 0.195, 0.834, z - 0.19], r: [0, 0, 0] }));
    }
  }
  return out;
}

/* ------------------------------------------------------------------------ markings */
function star(key: string): (ctx: CanvasRenderingContext2D, w: number, h: number) => void {
  return (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = w * 0.48, r = R * 0.382;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? R : r;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#d9d6c8';
    ctx.fill();
    let seed = key.length * 131 + 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    ctx.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 240; i++) {
      const x = rnd() * w, y = rnd() * h, s = 1 + rnd() * 3.5;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(77,75,51,0.85)' : 'rgba(140,128,100,0.35)';
      ctx.fillRect(x, y, s, s * (0.5 + rnd()));
    }
    const gr = ctx.createLinearGradient(0, h * 0.4, 0, h);
    gr.addColorStop(0, 'rgba(150,135,105,0)');
    gr.addColorStop(1, 'rgba(150,135,105,0.35)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  };
}

function stars(): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const d = 0.4, y = 1.22, zc = -0.2;
  for (const sx of [-1, 1]) {
    const n = new THREE.Vector3(sx * SIDE_N[0], SIDE_N[1], 0);
    const X = new THREE.Vector3(0, 0, -sx);
    const Y = new THREE.Vector3().crossVectors(n, X);
    const m = decal('m18-star', d, d, star('m18-star'), {}, 256);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, n));
    m.position.set(sx * sideX(y), y, zc).addScaledVector(n, 0.003);
    out.push(m);
  }
  return out;
}

export interface FittingOpts {
  stowage: boolean;
  star: boolean;
}

export function fittings(P: Pal, o: FittingOpts): THREE.Group {
  const parts: THREE.Object3D[] = [...front(P), ...tools(P), ...rear(P, o.stowage)];
  if (o.star) parts.push(...stars());
  return group(parts, { name: 'fittings' });
}
