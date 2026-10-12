/**
 * GAZ-67B body: open tub with flat sides, door cut-outs and rolled (tube-beaded) edges, rear
 * wall with the spare wheel carrier, scuttle and firewall, round-shouldered bonnet with the
 * rear "air vent" scoops and centre hinge, radiator shell with the wartime welded grille of
 * vertical bars, flat front wings with turned-down outer fronts, headlamps on the wing
 * shelves, running boards, box-section rear wings with wheelhouses, bumper and tow hooks.
 */
import { THREE, G, part, group, mirrorX } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import {
  type V2,
  type V3,
  slab,
  sideSlab,
  flatSlab,
  frontSlab,
  rect,
  rrect,
  spline2,
  pipe,
  bentRod,
  merge,
  xf,
  box,
  cylX,
  cylZ,
  latheZ,
  arc2,
  offset2,
} from './util';

const t = D.t;

/** Bonnet / radiator-shell cross-section: vertical sides rounding into a flattish crown. */
export function arch(hw: number, y0: number, y1: number, n = 30, e = 4): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI;
    const c = Math.cos(a), s = Math.sin(a);
    pts.push([hw * Math.sign(c) * Math.pow(Math.abs(c), 2 / e), y0 + (y1 - y0) * Math.pow(s, 2 / e)]);
  }
  return pts;
}

/** Height of the bonnet's outer surface at lateral offset x. */
export function bonnetY(x: number): number {
  const a = Math.min(1, Math.abs(x) / D.bonnetX);
  // invert the superellipse (e = 4): |x/hw|^4 + |(y-y0)/h|^4 = 1
  return D.wingY + (D.top - D.wingY) * Math.pow(Math.max(0, 1 - a * a * a * a), 0.25);
}

/** Side cut-out edge (z, y) from the windscreen post back to the rear seat. */
export function cutout(): V2[] {
  return spline2(
    [
      [0.472, D.top],
      [0.447, 0.955],
      [0.41, 0.872],
      [0.357, 0.778],
      [0.29, 0.703],
      [0.205, 0.657],
      [0.1, 0.639],
      [-0.05, 0.634],
      [-0.24, 0.636],
      [-0.365, 0.653],
      [-0.455, 0.7],
      [-0.52, 0.78],
      [-0.566, 0.87],
      [-0.598, 0.95],
      [-0.618, D.top],
    ],
    72,
  );
}

const zc = D.zRear + D.cornerR; // where the rear corner radius starts
const WZ0 = -0.5, WZ1 = -1.3; // rear wheel-arch opening in the tub side

/* ------------------------------------------------------------------ tub */

function tubSide(): THREE.BufferGeometry[] {
  const cut = cutout();
  const archTop = D.rwingY - t - 0.001;
  const outline: V2[] = [
    [D.zFire, D.bodyBot],
    [D.zFire, D.top],
    ...cut,
    [zc, D.top],
    [zc, D.bodyBot],
    [WZ1, D.bodyBot],
    ...arc2(WZ1 + 0.05, archTop - 0.05, 0.05, Math.PI, Math.PI / 2, 5),
    ...arc2(WZ0 - 0.05, archTop - 0.05, 0.05, Math.PI / 2, 0, 5),
    [WZ0, D.bodyBot],
  ];
  return [sideSlab(outline, t, D.bodyX - t / 2)];
}

/** Rear U: both rear corners (plan radius) and the rear wall, one extrusion. */
function tubRear(): THREE.BufferGeometry {
  const R = D.cornerR;
  const cx = D.bodyX - R, cz = D.zRear + R;
  const outer: V2[] = [
    ...arc2(cx, cz, R, 0, -Math.PI / 2, 8),
    ...arc2(-cx, cz, R, -Math.PI / 2, -Math.PI, 8),
  ];
  const inner: V2[] = [
    ...arc2(cx, cz, R - t, 0, -Math.PI / 2, 8),
    ...arc2(-cx, cz, R - t, -Math.PI / 2, -Math.PI, 8),
  ].reverse();
  return flatSlab([...outer, ...inner], D.top - D.bodyBot, (D.top + D.bodyBot) / 2, { bevel: 0.0007 });
}

/** Rolled bead along the whole tub top edge incl. the cut-outs and the rear wall. */
function topBead(): THREE.BufferGeometry {
  const r = 0.0085;
  const path2: V2[] = [[D.zFire, D.top], ...cutout(), [zc, D.top]];
  // densify straight runs so the Catmull-Rom tube follows the corners exactly
  const dense: V2[] = [];
  for (let i = 0; i < path2.length - 1; i++) {
    const a = path2[i], b = path2[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.06));
    for (let k = 0; k < n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  dense.push(path2[path2.length - 1]);
  const off = offset2(dense, 0.004);
  const xs = D.bodyX - t / 2;
  const left = off.map(([z, y]) => new THREE.Vector3(xs, y, z));
  const R = D.cornerR - t / 2;
  const cx = D.bodyX - D.cornerR, cz = D.zRear + D.cornerR;
  const yb = D.top - 0.004;
  const rear: THREE.Vector3[] = [];
  for (const [x, z] of arc2(cx, cz, R, 0, -Math.PI / 2, 8).slice(1)) rear.push(new THREE.Vector3(x, yb, z));
  const nr = 12;
  for (let k = 1; k < nr; k++) rear.push(new THREE.Vector3(cx - (2 * cx * k) / nr, yb, cz - R));
  for (const [x, z] of arc2(-cx, cz, R, -Math.PI / 2, -Math.PI, 8)) rear.push(new THREE.Vector3(x, yb, z));
  const right = left.map((p) => new THREE.Vector3(-p.x, p.y, p.z)).reverse();
  const pts = [...left, ...rear, ...right.slice(1)];
  const tube = pipe(pts, r, 8);
  const caps = [left[0], right[right.length - 1]].map((p) => {
    const s = new THREE.SphereGeometry(r, 8, 5);
    s.translate(p.x, p.y, p.z);
    return s;
  });
  return merge([tube, ...caps]);
}

function tub(): THREE.Object3D {
  const body: THREE.BufferGeometry[] = [];
  const side = tubSide();
  body.push(...side);
  body.push(...side.map((g) => xf(g.clone(), [0, 0, 0], [0, 0, 0], [-1, 1, 1])));
  body.push(tubRear());
  body.push(topBead());
  // floor
  body.push(flatSlab(rect(-D.bodyX + t, D.zRear + t, D.bodyX - t, D.zFire - t), 0.003, D.floorY - 0.0015));
  // firewall with the tunnel notch
  body.push(
    frontSlab(
      [
        [-D.bodyX + t, D.floorY],
        [-0.155, D.floorY],
        [-0.155, 0.705],
        [0.155, 0.705],
        [0.155, D.floorY],
        [D.bodyX - t, D.floorY],
        [D.bodyX - t, D.top - t],
        [-D.bodyX + t, D.top - t],
      ],
      t,
      D.zFire - t / 2,
    ),
  );
  // firewall below the floor at the sides (wheel-well rear walls)
  for (const s of [1, -1]) body.push(frontSlab(rect(s > 0 ? 0.36 : -D.bodyX + t, D.bodyBot, s > 0 ? D.bodyX - t : -0.36, D.floorY), t, D.zFire - t / 2));
  // scuttle top
  body.push(flatSlab(rect(-D.bodyX, D.zWs - 0.012, D.bodyX, D.zFire), t, D.top - t / 2));
  // instrument panel + lower flange
  body.push(frontSlab(rect(-D.bodyX + t, 0.83, D.bodyX - t, D.top - t), t, D.zDash + t / 2));
  body.push(flatSlab(rect(-D.bodyX + t, D.zDash, D.bodyX - t, D.zDash + 0.035), t, 0.83 + t / 2));
  // toe board
  const tbA: V3 = [0, D.floorY, 0.52];
  const tbDir = new THREE.Vector3(0, 0.7 - D.floorY, D.zFire - 0.52);
  const tbL = tbDir.length();
  body.push(slab(rect(-D.bodyX + t, 0, D.bodyX - t, tbL), 0.003, tbA, [1, 0, 0], [0, tbDir.y, tbDir.z]));
  // transmission tunnel (pressed cover)
  body.push(
    slab(
      [
        [D.zFire - t, D.floorY - 0.002],
        [D.zFire - t, 0.705],
        [0.3, 0.7],
        [0.14, 0.675],
        [0.05, D.floorY - 0.002],
      ],
      0.3,
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      { bevel: 0.012 },
    ),
  );
  // tunnel inspection plate
  body.push(box(0.2, 0.004, 0.16, [0, 0.7045, 0.43], 0.002, [-1.2, 0, 0]));
  // rear wheelhouses inside the tub
  for (const s of [1, -1]) {
    const x0 = 0.52 * s;
    const hw: THREE.BufferGeometry[] = [
      sideSlab(rect(WZ1, D.floorY, WZ0, D.rwingY), t, x0 - (s * t) / 2),
      frontSlab(rect(Math.min(x0, s * D.bodyX), D.floorY, Math.max(x0, s * D.bodyX), D.rwingY), t, WZ0 - t / 2),
      frontSlab(rect(Math.min(x0, s * D.bodyX), D.floorY, Math.max(x0, s * D.bodyX), D.rwingY), t, WZ1 + t / 2),
      flatSlab(rect(Math.min(x0, s * D.bodyX), WZ1, Math.max(x0, s * D.bodyX), WZ0), t, D.rwingY - t / 2),
    ];
    body.push(...hw);
  }
  // pressed stiffening beads on the floor (visible in the footwells)
  const beads: THREE.BufferGeometry[] = [];
  for (const x of [-0.46, -0.24, 0.24, 0.46]) beads.push(xf(G.cyl(0.009, 0.009, 0.36, 8, true), [x, D.floorY - 0.004, 0.24], [90, 0, 0], [1, 1, 0.45]));
  for (const x of [-0.3, -0.1, 0.1, 0.3]) beads.push(xf(G.cyl(0.009, 0.009, 0.16, 8, true), [x, D.floorY - 0.004, -0.52], [90, 0, 0], [1, 1, 0.45]));
  body.push(...beads);
  return part(merge(body), P.body());
}

/* ------------------------------------------------------------------ bonnet & front */

function bonnet(): THREE.Object3D {
  const hw = D.bonnetX;
  const outer = arch(hw, D.wingY, D.top);
  const inner = arch(hw - t, D.wingY, D.top - t).reverse();
  const len = D.zNose - 0.003 - D.zFire;
  const shell = frontSlab([...outer, ...inner], len, D.zFire + len / 2, { bevel: 0.0007 });
  // rolled front edge
  const edge = arch(hw + 0.0015, D.wingY + 0.002, D.top + 0.0015, 40).map(([x, y]) => new THREE.Vector3(x, y, D.zNose - 0.007));
  const bead = pipe(edge, 0.0065, 8);
  // centre hinge with knuckles
  const hinge: THREE.BufferGeometry[] = [cylZ(0.0045, len - 0.02, [0, D.top + 0.002, D.zFire + len / 2], 10)];
  for (let i = 0; i < 8; i++) hinge.push(cylZ(0.0062, 0.05, [0, D.top + 0.002, D.zFire + 0.07 + i * 0.105], 10));
  // latches on the bonnet sides
  const latch: THREE.BufferGeometry[] = [];
  for (const s of [1, -1])
    for (const z of [0.86, 1.34]) {
      latch.push(box(0.012, 0.055, 0.024, [s * (hw + 0.005), D.wingY + 0.045, z], 0.003));
      latch.push(box(0.018, 0.014, 0.03, [s * (hw + 0.008), D.wingY + 0.075, z], 0.003));
    }
  // rear "air vents": small forward-pointing scoops open to the rear
  const scoop: number[] = [], mouth: number[] = [];
  const L = 0.085, W = 0.055, H = 0.02;
  const put = (arr: number[], ...vs: THREE.Vector3[]) => vs.forEach((v) => arr.push(v.x, v.y, v.z));
  for (const x of [-0.2, -0.075, 0.075, 0.2]) {
    const z0 = 0.735;
    const y0 = bonnetY(x);
    const slope = (bonnetY(x + 0.01) - bonnetY(x - 0.01)) / 0.02;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.atan(slope)));
    const tr = (vx: number, vy: number, vz: number) => new THREE.Vector3(vx, vy, vz).applyQuaternion(q).add(new THREE.Vector3(x, y0 - 0.001, z0));
    const A = tr(0, 0, L), BL = tr(-W / 2, 0, 0), BR = tr(W / 2, 0, 0), T = tr(0, H, 0.004);
    put(scoop, A, T, BL, A, BR, T);
    put(mouth, BL, T, BR);
  }
  const mk = (arr: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    return g;
  };
  return group([
    part(merge([shell, bead, ...hinge, ...latch, mk(scoop)]), P.body()),
    part(mk(mouth), P.black()),
  ]);
}

/** Radiator shell with the wartime welded grille (vertical flat bars), radiator core, badge. */
function nose(): THREE.Object3D {
  const hw = D.bonnetX;
  const z = D.zNose;
  const gx = 0.225, gy0 = 0.515, gy1 = 0.94, gr = 0.075;
  const hole = rrect(-gx, gy0, gx, gy1, [0.02, 0.02, gr, gr], 8);
  const outline: V2[] = [[hw - 0.001, 0.47], ...arch(hw - 0.001, D.wingY, D.top - 0.0015), [-hw + 0.001, 0.47]];
  const panel = frontSlab(outline, 0.003, z, { holes: [hole] });
  const surround = frontSlab(rrect(-gx - 0.022, gy0 - 0.022, gx + 0.022, gy1 + 0.02, [0.03, 0.03, gr + 0.02, gr + 0.02], 8), 0.006, z + 0.0045, {
    holes: [hole],
    bevel: 0.0018,
  });
  // vertical bars following the rounded top of the opening
  const bars: THREE.BufferGeometry[] = [];
  const n = 15;
  for (let i = 0; i < n; i++) {
    const x = -0.21 + (i * 0.42) / (n - 1);
    const ax = Math.abs(x) - (gx - gr);
    const top = ax > 0 ? gy1 - gr + Math.sqrt(Math.max(0, gr * gr - ax * ax)) : gy1;
    const h = top - gy0 + 0.004;
    bars.push(box(0.0065, h, 0.036, [x, gy0 + h / 2 - 0.002, z - 0.016], 0.0015));
  }
  // horizontal carrier strips behind the bars
  for (const y of [0.6, 0.84]) bars.push(box(0.44, 0.014, 0.005, [0, y, z - 0.036], 0.0015));
  // oval maker's badge above the grille
  const badge = xf(G.cyl(0.032, 0.032, 0.005, 28), [0, 0.977, z + 0.003], [90, 0, 0], [1, 1, 0.44]);
  // radiator core behind the grille
  const core = box(0.48, 0.44, 0.05, [0, 0.728, z - 0.075], 0.006);
  return group([part(merge([panel, surround, ...bars, badge]), P.body()), part(core, P.black())]);
}

function headlamp(): THREE.Object3D {
  const bowl = latheZ(
    [
      [0, -0.12],
      [0.032, -0.117],
      [0.066, -0.101],
      [0.089, -0.075],
      [0.099, -0.04],
      [0.1, -0.006],
      [0.1045, -0.001],
      [0.1055, 0.012],
      [0.1, 0.0175],
      [0.091, 0.0175],
      [0.089, 0.008],
    ],
    40,
    35,
  );
  const lens = latheZ(
    [
      [0.0905, 0.011],
      [0.075, 0.017],
      [0.045, 0.0215],
      [0, 0.0235],
    ],
    40,
    60,
  );
  const refl = latheZ(
    [
      [0.089, 0.004],
      [0.072, -0.018],
      [0.048, -0.052],
      [0.024, -0.08],
      [0, -0.092],
    ],
    36,
    60,
  );
  const bulb = new THREE.SphereGeometry(0.012, 10, 8);
  bulb.translate(0, 0, -0.045);
  // pedestal and pivot bolt
  const ped = merge([
    xf(G.cyl(0.014, 0.018, 0.02, 14), [0, -0.107, -0.045]),
    box(0.05, 0.006, 0.05, [0, -0.117, -0.045], 0.002),
  ]);
  return group([
    part(bowl, P.body()),
    part(ped, P.body()),
    part(lens, P.glass()),
    part(bulb, P.glass()),
    part(refl, P.reflector()),
  ]);
}

/** Front wing (vehicle's left, +X): shelf, flat top, turned-down outer front, rear slope, lip, apron. */
function frontWing(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const y = D.wingY;
  const X0 = D.bonnetX, XS = D.shelfX, XW = D.wingX, zB = D.wingBendZ;
  out.push(
    flatSlab(
      [
        [X0, D.zFire],
        [X0, D.zNose],
        [XS, D.zNose],
        [XS, zB],
        [XW, zB],
        [XW, D.zWs],
        [D.bodyX, D.zWs],
        [D.bodyX, D.zFire],
      ],
      t,
      y - t / 2,
    ),
  );
  // turned-down outer front
  const fz = 1.575, fy = 0.62;
  const fdir = new THREE.Vector3(0, fy - y, fz - zB);
  const fL = fdir.length();
  out.push(slab(rect(XS, 0, XW - 0.0, fL), t, [0, y - t / 2, zB], [1, 0, 0], [0, fdir.y, fdir.z]));
  // gusset closing the step between shelf and turned-down part
  const yN = y - ((D.zNose - zB) * (y - fy)) / (fz - zB);
  out.push(sideSlab([[zB, y], [D.zNose, y], [D.zNose, yN]], t, XS));
  // rear slope down to the running board
  const rz = 0.28;
  const rdir = new THREE.Vector3(0, D.runY - y, rz - D.zWs);
  out.push(slab(rect(D.bodyX, 0, XW, rdir.length()), t, [0, y - t / 2, D.zWs], [1, 0, 0], [0, rdir.y, rdir.z]));
  // outer lip along the whole outer edge
  const edge: V2[] = [
    [rz, D.runY],
    [D.zWs, y],
    [zB - 0.03, y],
    [zB, y - 0.004],
    [fz, fy],
  ];
  const lip = [...edge, ...edge.map(([a, b]) => [a, b - 0.042] as V2).reverse()];
  out.push(sideSlab(lip, t, XW - t / 2));
  // apron beside the grille (carries the headlamp shelf)
  out.push(
    frontSlab(
      [
        [X0, 0.47],
        [0.465, 0.47],
        [XS, 0.6],
        [XS, y],
        [X0, y],
      ],
      t,
      D.zNose - 0.004,
    ),
  );
  // inner splash wall between engine bay and wheel well
  out.push(sideSlab(rect(D.zFire, 0.47, D.zNose - 0.006, y - t), t, X0 - t / 2));
  // bolt heads along the wing-to-apron seam
  const bolts: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 4; i++) bolts.push({ p: [X0 + 0.02, y, 0.8 + i * 0.22], n: [0, 1, 0] });
  out.push(G.scatter(G.boltHead(0.013, 0.005), bolts));
  return out;
}

function runningBoard(): THREE.BufferGeometry[] {
  return [
    flatSlab(rect(D.bodyX, -0.28, D.wingX, 0.28), 0.004, D.runY - 0.002),
    sideSlab(rect(-0.28, D.runY - 0.035, 0.28, D.runY), 0.003, D.wingX - 0.0015),
  ];
}

/** Rear wing (left): flat top, sloped front, outer lip, closed rear end. */
function rearWing(): THREE.BufferGeometry[] {
  const y = D.rwingY;
  const out: THREE.BufferGeometry[] = [];
  out.push(flatSlab(rect(D.bodyX, D.zRear, D.wingX, -0.45), t, y - t / 2));
  const dir = new THREE.Vector3(0, D.runY - y, -0.28 + 0.45);
  out.push(slab(rect(D.bodyX, 0, D.wingX, dir.length()), t, [0, y - t / 2, -0.45], [1, 0, 0], [0, dir.y, dir.z]));
  const edge: V2[] = [
    [-0.28, D.runY],
    [-0.45, y],
    [D.zRear + t, y],
  ];
  const lip = [...edge, ...edge.map(([a, b]) => [a, b - 0.048] as V2).reverse()];
  out.push(sideSlab(lip, t, D.wingX - t / 2));
  out.push(frontSlab(rect(D.bodyX, 0.52, D.wingX, y), t, D.zRear + t / 2));
  return out;
}

function handles(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  const x = D.bodyX;
  // grab handle behind the cut-out
  out.push(bentRod([[x, 0.945, -0.745], [x + 0.036, 0.945, -0.765], [x + 0.036, 0.945, -0.9], [x, 0.945, -0.92]], 0.0075, 0.016));
  for (const z of [-0.745, -0.92]) out.push(box(0.006, 0.034, 0.03, [x + 0.003, 0.945, z], 0.002));
  // lifting handle on the rear wing end
  const zr = D.zRear;
  out.push(bentRod([[0.7, 0.62, zr], [0.712, 0.62, zr - 0.036], [0.788, 0.62, zr - 0.036], [0.8, 0.62, zr]], 0.0075, 0.016));
  for (const xx of [0.7, 0.8]) out.push(box(0.03, 0.034, 0.006, [xx, 0.62, zr - 0.003], 0.002));
  return out;
}

function bumper(): THREE.Object3D {
  const z = D.zFront;
  const y0 = 0.4, y1 = 0.5, d = 0.055, th = 0.005;
  const prof: V2[] = [
    [z, y0],
    [z, y1],
    [z - d, y1],
    [z - d, y1 - th],
    [z - th, y1 - th],
    [z - th, y0 + th],
    [z - d, y0 + th],
    [z - d, y0],
  ];
  const beam = slab(prof, 1.36, [0, 0, 0], [0, 0, 1], [0, 1, 0], { bevel: 0.002 });
  const bolts: { p: V3; n: V3 }[] = [];
  for (const s of [1, -1]) for (const yy of [0.425, 0.475]) bolts.push({ p: [s * D.frameX, yy, z], n: [0, 0, 1] });
  const hooks: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const x = s * 0.27;
    hooks.push(bentRod([[x, y1 - 0.01, z - 0.03], [x, y1 + 0.02, z - 0.022], [x, y1 + 0.055, z - 0.016], [x, y1 + 0.08, z - 0.036], [x, y1 + 0.068, z - 0.062]], 0.011, 0.02, 10));
    hooks.push(box(0.05, 0.012, 0.05, [x, y1 + 0.004, z - 0.027], 0.002));
  }
  return part(merge([beam, G.scatter(G.boltHead(0.02, 0.009), bolts), ...hooks]), P.chassis());
}

/* ------------------------------------------------------------------ windscreen */

export function windscreen(): THREE.Object3D {
  const z = D.zWs, X = D.wsX, yb = D.wsBot, yt = D.wsTop;
  const frame: THREE.BufferGeometry[] = [];
  frame.push(bentRod([[-X, yb + 0.012, z], [-X, yt, z], [X, yt, z], [X, yb + 0.012, z]], 0.0125, 0.035, 10));
  frame.push(box(2 * X + 0.02, 0.026, 0.032, [0, yb + 0.006, z], 0.004));
  frame.push(box(0.024, yt - yb - 0.02, 0.018, [0, (yb + yt) / 2, z], 0.004));
  // hinges on the scuttle
  for (const s of [1, -1]) {
    frame.push(cylX(0.011, 0.06, [s * (X - 0.05), yb - 0.004, z], 14));
    frame.push(box(0.07, 0.006, 0.05, [s * (X - 0.05), D.top + 0.002, z - 0.004], 0.002));
    // side quadrant stay with wing nut
    frame.push(box(0.007, 0.13, 0.022, [s * (X + 0.016), yb + 0.05, z + 0.012], 0.002, [-12, 0, 0]));
    frame.push(xf(G.cyl(0.011, 0.011, 0.012, 12), [s * (X + 0.024), yb + 0.085, z + 0.02], [0, 0, 90]));
  }
  const glass: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    const x0 = s > 0 ? 0.01 : -X + 0.006, x1 = s > 0 ? X - 0.006 : -0.01;
    glass.push(frontSlab(rect(x0, yb + 0.016, x1, yt - 0.006), 0.005, z, { bevel: 0.001 }));
  }
  // vacuum wiper (driver's side): motor inside, arm and blade outside
  const wx = 0.3;
  const wiper: THREE.BufferGeometry[] = [];
  const blade: THREE.BufferGeometry[] = [];
  wiper.push(box(0.075, 0.045, 0.04, [wx, yt - 0.03, z - 0.032], 0.008));
  wiper.push(cylZ(0.006, 0.05, [wx, yt - 0.018, z + 0.004], 10));
  const tilt = 14;
  const aL = 0.235;
  const py = yt - 0.018;
  const ax = wx + Math.sin(G.deg(tilt)) * aL, ay = py - Math.cos(G.deg(tilt)) * aL;
  wiper.push(box(0.009, aL, 0.005, [(wx + ax) / 2, (py + ay) / 2, z + 0.03], 0.0015, [0, 0, tilt]));
  const bx = ax - Math.sin(G.deg(tilt)) * 0.06, by = ay + Math.cos(G.deg(tilt)) * 0.06;
  blade.push(box(0.006, 0.2, 0.01, [bx, by, z + 0.012], 0.002, [0, 0, tilt]));
  wiper.push(box(0.01, 0.2, 0.006, [bx, by, z + 0.02], 0.0015, [0, 0, tilt]));
  return group([part(merge(frame), P.body()), part(merge(glass), P.glass()), part(merge(wiper), P.black()), part(merge(blade), P.rubber())]);
}

/** Driver's rear-view mirror on a stalk at the left scuttle corner. */
function mirror(): THREE.Object3D {
  const z = D.zWs - 0.02;
  const stalk = bentRod([[D.bodyX - 0.01, D.top + 0.004, z + 0.02], [D.bodyX + 0.02, D.top + 0.06, z + 0.01], [0.74, 1.19, z]], 0.0065, 0.04);
  const base = box(0.04, 0.008, 0.05, [D.bodyX - 0.012, D.top + 0.004, z + 0.02], 0.002);
  const head = latheZ([
    [0, 0.0],
    [0.05, 0.0],
    [0.055, 0.006],
    [0.055, 0.016],
    [0.03, 0.026],
    [0, 0.028],
  ], 28, 40);
  xf(head, [0.765, 1.215, z - 0.012]);
  const glassG = xf(G.cyl(0.049, 0.049, 0.002, 28), [0.765, 1.215, z - 0.011], [90, 0, 0]);
  return group([part(merge([stalk, base, head]), P.black()), part(glassG, P.reflector())]);
}

/* ------------------------------------------------------------------ rear fittings */

function tailLamp(): THREE.Object3D {
  const x = -0.4, y = 0.8, z = D.zRear;
  const bodyG = merge([
    xf(latheZ([[0, 0], [0.045, 0], [0.047, 0.004], [0.047, 0.03], [0.043, 0.034], [0, 0.034]], 28, 40), [x, y, z], [0, 180, 0]),
    box(0.06, 0.012, 0.03, [x, y - 0.05, z - 0.012], 0.002),
  ]);
  const lens = xf(latheZ([[0, 0], [0.036, 0], [0.036, 0.004], [0.028, 0.011], [0, 0.014]], 24, 50), [x, y, z - 0.033], [0, 180, 0]);
  return group([part(bodyG, P.black()), part(lens, P.redLens())]);
}

/** Spare wheel carrier on the rear wall (vehicle's left). Returns the wheel centre too. */
export const SPARE = { x: 0.33, y: 0.92, z: -1.586 };
function spareCarrier(): THREE.Object3D {
  const zr = D.zRear;
  const g: THREE.BufferGeometry[] = [];
  g.push(box(0.2, 0.2, 0.008, [SPARE.x, SPARE.y, zr - 0.004], 0.003));
  // tapered stub from the wall to the wheel's mounting face
  // the spare faces rearwards (local +X -> world -Z); disc centre inner face at local x = 0.032
  const face = SPARE.z - 0.032;
  const len = zr - 0.008 - face;
  g.push(xf(G.cyl(0.042, 0.06, len, 24), [SPARE.x, SPARE.y, zr - 0.008 - len / 2], [-90, 0, 0]));
  // diagonal braces
  for (const s of [1, -1]) g.push(bentRod([[SPARE.x + s * 0.085, SPARE.y - 0.07, zr - 0.006], [SPARE.x + s * 0.03, SPARE.y - 0.02, face + 0.03]], 0.008, 0.01));
  const bolts: { p: V3; n: V3 }[] = [];
  for (const [dx, dy] of [[-0.08, -0.08], [0.08, -0.08], [0.08, 0.08], [-0.08, 0.08]]) bolts.push({ p: [SPARE.x + dx, SPARE.y + dy, zr - 0.008], n: [0, 0, -1] });
  g.push(G.scatter(G.boltHead(0.014, 0.006), bolts));
  return part(merge(g), P.chassis());
}

/* ------------------------------------------------------------------ folded top */

function bundleRing(x: number, n = 36): V2[] {
  // section in (z, y); irregular folds, flattened where it rests on the rear body
  const zc0 = -1.325, yc = 1.088;
  const u = x / 0.63;
  const end = 1 - 0.28 * Math.pow(Math.abs(u), 6);
  const a = 0.122 * end, b = 0.086 * end;
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    const c = Math.cos(th), s = Math.sin(th);
    const e = 2 / 2.4;
    let r = 1 + 0.07 * Math.sin(3 * th + 0.8 + x * 2.1) + 0.045 * Math.sin(5 * th + x * 9.0) + 0.03 * Math.sin(x * 23 + th * 2);
    if (s < 0) r *= 1 - 0.12 * Math.abs(s);
    const z = zc0 + a * r * Math.sign(c) * Math.pow(Math.abs(c), e);
    let y = yc - 0.01 * Math.cos(u * Math.PI * 0.5) + b * r * Math.sign(s) * Math.pow(Math.abs(s), e);
    y = Math.max(y, D.top + 0.006);
    pts.push([-z, y]);
  }
  return pts;
}

function foldedTop(): THREE.Object3D {
  const secs: { z: number; ring: V2[] }[] = [];
  const N = 26;
  for (let i = 0; i <= N; i++) {
    const x = -0.625 + (1.25 * i) / N;
    secs.push({ z: x, ring: bundleRing(x) });
  }
  const bundle = G.loftZ(secs, true, 50);
  bundle.rotateY(Math.PI / 2);
  // leather straps around the bundle
  const straps: THREE.BufferGeometry[] = [];
  const buckles: THREE.BufferGeometry[] = [];
  for (const x of [-0.34, 0.34]) {
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
    straps.push(G.strap(pts, 0.03, 0.004, nrm, { closed: true, smooth: false }));
    const top = pts.reduce((m, p) => (p.y > m.y ? p : m), pts[0]);
    buckles.push(box(0.036, 0.006, 0.03, [x, top.y + 0.004, top.z - 0.03], 0.002));
  }
  // folded bow: legs from the pivots on the tub sides, crossbar under the bundle
  const bow: THREE.BufferGeometry[] = [];
  for (const s of [1, -1]) {
    bow.push(box(0.006, 0.05, 0.06, [s * (D.bodyX - t - 0.003), 0.965, -0.96], 0.002));
    bow.push(xf(G.boltHead(0.018, 0.008), [s * (D.bodyX - t - 0.006), 0.965, -0.96], [0, 0, s * 90]));
  }
  bow.push(bentRod([[0.625, 0.975, -0.96], [0.615, 1.022, -1.22], [0.55, 1.03, -1.28], [-0.55, 1.03, -1.28], [-0.615, 1.022, -1.22], [-0.625, 0.975, -0.96]], 0.011, 0.05));
  return group([part(bundle, P.canvas()), part(merge(straps), P.strap()), part(merge(buckles), P.steel()), part(merge(bow), P.body())]);
}

/* ------------------------------------------------------------------ assembly */

export function buildBody(): THREE.Object3D {
  const left: THREE.BufferGeometry[] = [...frontWing(), ...runningBoard(), ...rearWing(), ...handles()];
  const leftG = merge(left);
  const bodySym = group([part(leftG, P.body())]);
  // running-board outriggers (under the boards)
  const rig: THREE.BufferGeometry[] = [];
  for (const z of [0.16, -0.16]) rig.push(box(D.wingX - 0.05 - (D.frameX + 0.03), 0.035, 0.03, [(D.wingX - 0.05 + D.frameX + 0.03) / 2, D.runY - 0.024, z], 0.003));
  const lampL = headlamp();
  lampL.position.set(0.435, 0.9, 1.49);
  // headlamp tie bar across the grille
  const tie = bentRod([[-0.4, 0.862, 1.47], [-0.36, 0.862, 1.556], [0.36, 0.862, 1.556], [0.4, 0.862, 1.47]], 0.006, 0.03);
  // fuel filler on the scuttle (main tank ahead of the windscreen)
  const filler = merge([
    cylZ(0.036, 0.012, [0, 0, 0], 24),
    box(0.05, 0.01, 0.012, [0, 0, 0.012], 0.003),
  ]);
  xf(filler, [-0.42, D.top + 0.006, 0.585], [90, 0, 0]);
  return group([
    tub(),
    bonnet(),
    nose(),
    mirrorX(bodySym),
    mirrorX(group([part(merge(rig), P.chassis())])),
    mirrorX(lampL),
    part(merge([tie, filler]), P.body()),
    bumper(),
    windscreen(),
    mirror(),
    tailLamp(),
    spareCarrier(),
    foldedTop(),
  ]);
}
