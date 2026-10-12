/**
 * SU-76M fighting compartment: the open-topped casemate of thin welded plates (front plate 25 deg
 * with the gun embrasure, sides sloped ~20 deg and cut down towards the rear, late-production higher
 * rear plate with a door and two pistol ports), and a simplified interior - floor, engine bulkhead,
 * ammunition racks on the sponson floors and in the rear corner, crew seats, the stowed DT machine
 * gun and a rolled tarpaulin.
 *
 * Hull frame: +Z forward, +X = the vehicle's left, y = 0 ground (see dims.ts).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { H, C, frontZ, sideX, FRONT_N, SIDE_N, GD } from './dims';
import type { Pal } from './palette';
import { slab, merge, latheZ, weldBead, type P3 } from './util';

const { yF, yR, xL, zRear, yB } = H;

/** Planar slab with holes: outer face polygon + hole polygons (3D, coplanar), extruded inward by t. */
function slabHoles(outer: P3[], holes: P3[][], t: number, outward: P3, bevel = 0.004): THREE.BufferGeometry {
  const V = (p: P3) => new THREE.Vector3(p[0], p[1], p[2]);
  const n = V(outward).normalize();
  const o = V(outer[0]);
  const e = V(outer[1]).sub(o);
  const u = e.sub(n.clone().multiplyScalar(e.dot(n))).normalize();
  const v = new THREE.Vector3().crossVectors(n, u);
  const to2 = (p: P3): G.V2 => {
    const d = V(p).sub(o);
    return [d.dot(u), d.dot(v)];
  };
  const ccw = (pts: G.V2[], want: boolean) => {
    const cw = THREE.ShapeUtils.isClockWise(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    return cw === want ? pts.slice().reverse() : pts;
  };
  const outer2 = ccw(outer.map(to2), true);
  const holes2 = holes.map((h) => ccw(h.map(to2), false));
  const g = G.extrude(G.shape(outer2, 0, holes2), t, bevel, 6, 1);
  g.translate(0, 0, -t / 2);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, n).setPosition(o));
  return g;
}

/* ------------------------------------------ plates ------------------------------------------ */

function plates(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const yT = C.yTop;
  const fp = (x: number, y: number): P3 => [x, y, frontZ(y)];
  // front plate: full width down to the guards outside the hull, down to the roof over the hull
  const outer: P3[] = [
    fp(sideX(yF), yF), fp(sideX(yT), yT), fp(-sideX(yT), yT), fp(-sideX(yF), yF),
    fp(-xL, yF), fp(-xL, yR), fp(xL, yR), fp(xL, yF),
  ];
  // gun embrasure (covered by the moving shield)
  const by = GD.trunY + GD.boreAbove;
  const up = [0, Math.cos((25 * Math.PI) / 180), -Math.sin((25 * Math.PI) / 180)];
  const e = (x: number, s: number): P3 => [x, by + up[1] * s, frontZ(by) + up[2] * s];
  const hole: P3[] = [e(-0.3, -0.27), e(0.3, -0.27), e(0.3, 0.24), e(-0.3, 0.24)];
  out.push(part(slabHoles(outer, [hole], C.tFront, FRONT_N, 0.005), P.paint));
  // side plates (sloped inwards), cut down towards the rear
  const sideProf: [number, number][] = [
    [frontZ(yF), yF], [frontZ(yT), yT], [C.zTopR, yT], [C.zCutR, C.yRearTop], [zRear, C.yRearTop], [zRear, yF],
  ];
  for (const sx of [-1, 1]) {
    out.push(part(slab(sideProf.map(([z, y]) => [sx * sideX(y), y, z] as P3), C.tSide, SIDE_N(sx), 0.003), P.paint));
    // top edge stiffener strip
    const a: P3 = [sx * (sideX(yT) - 0.006), yT + 0.004, frontZ(yT) - 0.02];
    const b: P3 = [sx * (sideX(yT) - 0.006), yT + 0.004, C.zTopR];
    out.push(part(G.rod(a, b, 0.008, 6), P.paint));
  }
  // rear plate (late type: higher, with a door and two pistol ports)
  const yRT = C.yRearTop;
  out.push(part(slab([[sideX(yF), yF, zRear], [sideX(yRT), yRT, zRear], [-sideX(yRT), yRT, zRear], [-sideX(yF), yF, zRear]], C.tRear, [0, 0, -1], 0.003), P.paint));
  // welds along the corners
  const welds: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    welds.push(weldBead([[sx * (sideX(yF) - 0.004), yF + 0.004, frontZ(yF) - 0.006], [sx * (sideX(yT) - 0.004), yT - 0.004, frontZ(yT) - 0.006]], 0.005));
    welds.push(weldBead([[sx * (sideX(yF) - 0.004), yF + 0.004, zRear + 0.004], [sx * (sideX(yRT) - 0.004), yRT - 0.004, zRear + 0.004]], 0.005));
    welds.push(weldBead([[sx * (sideX(yF) + 0.002), yF + 0.003, frontZ(yF) - 0.02], [sx * (sideX(yF) + 0.002), yF + 0.003, zRear + 0.02]], 0.005));
  }
  welds.push(weldBead([[-xL + 0.01, yR + 0.004, frontZ(yR) + 0.004], [xL - 0.01, yR + 0.004, frontZ(yR) + 0.004]], 0.005));
  out.push(part(merge(welds), P.paint));
  return out;
}

function rearFittings(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const z = zRear - C.tRear / 2;
  // door: plate proud of the rear plate, hinges on the right (-X), handle and lock
  const dw = 0.62, y0 = yF + 0.07, y1 = C.yRearTop - 0.07;
  const dz = zRear - 0.008;
  out.push(part(G.rbox(dw, y1 - y0, 0.012, 0.005, 1), P.paint, { p: [0, (y0 + y1) / 2, dz] }));
  for (const y of [y0 + 0.12, y1 - 0.12]) {
    out.push(part(G.cyl(0.018, 0.018, 0.1, 12), P.paint, { p: [-dw / 2 - 0.012, y, dz - 0.004] }));
    out.push(part(G.rbox(0.12, 0.05, 0.008, 0.003, 1), P.paint, { p: [-dw / 2 + 0.05, y, dz - 0.009] }));
  }
  out.push(part(G.tube([[dw / 2 - 0.06, (y0 + y1) / 2 - 0.08, dz - 0.006], [dw / 2 - 0.06, (y0 + y1) / 2 - 0.06, dz - 0.05], [dw / 2 - 0.06, (y0 + y1) / 2 + 0.06, dz - 0.05], [dw / 2 - 0.06, (y0 + y1) / 2 + 0.08, dz - 0.006]], 0.009, 8), P.paint));
  // pistol ports: round swivelling covers either side of the door
  for (const sx of [-1, 1]) {
    const x = sx * 0.62, y = 1.36;
    out.push(part(latheZ([[0.0, 0.0], [0.065, 0.0], [0.065, -0.012], [0.055, -0.02], [0.0, -0.02]], 24, 40), P.paint, { p: [x, y, z - 0.006] }));
    out.push(part(G.boltHead(0.02, 0.012), P.paint, { p: [x, y + 0.08, z - 0.006], r: [-90, 0, 0] }));
  }
  // tow hooks on the hull rear plate
  for (const sx of [-1, 1]) {
    out.push(part(G.rbox(0.1, 0.12, 0.025, 0.008, 1), P.cast, { p: [sx * 0.6, 0.6, zRear - 0.02] }));
    out.push(part(G.torus(0.045, 0.014, 8, 18), P.cast, { p: [sx * 0.6, 0.56, zRear - 0.06], r: [90, 0, 0] }));
  }
  // marker lamp above the right track
  out.push(part(G.rbox(0.09, 0.06, 0.06, 0.012, 1), P.paint, { p: [-1.05, yF + 0.2, zRear - 0.04] }));
  return out;
}

/* ------------------------------------------ interior ----------------------------------------- */

const FLOOR = yB + 0.035;

/** 76 mm fixed round lying along +Z (base at z = 0). */
function roundGeos(): { cs: THREE.BufferGeometry; pr: THREE.BufferGeometry } {
  const cs = latheZ([[0.0, 0.0], [0.05, 0.0], [0.05, 0.008], [0.044, 0.012], [0.045, 0.34], [0.041, 0.37], [0.04, 0.385], [0.0, 0.385]], 18, 40);
  const pr = latheZ([[0.0, 0.37], [0.038, 0.37], [0.0381, 0.47], [0.036, 0.54], [0.028, 0.6], [0.016, 0.64], [0.009, 0.66], [0.0, 0.665]], 18, 40);
  return { cs, pr };
}

function ammoRacks(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const { cs, pr } = roundGeos();
  const caseG: THREE.BufferGeometry[] = [];
  const projG: THREE.BufferGeometry[] = [];
  const addRound = (m: THREE.Matrix4) => {
    caseG.push(cs.clone().applyMatrix4(m));
    projG.push(pr.clone().applyMatrix4(m));
  };
  // horizontal racks on both sponson floors: two layers of three rounds, noses forward
  for (const sx of [-1, 1]) {
    for (const z0 of [-0.95, -1.75]) {
      for (let layer = 0; layer < 2; layer++) {
        for (let i = 0; i < 3; i++) {
          const x = sx * (xL + 0.075 + i * 0.095 - layer * 0.03);
          const y = yF + 0.055 + layer * 0.095;
          addRound(new THREE.Matrix4().makeTranslation(x, y, z0));
        }
      }
      // rack frames: end boards with the round seats, and a strap
      for (const dz of [0.08, 0.5]) {
        out.push(part(G.rbox(0.26, 0.2, 0.02, 0.004, 1), P.paint, { p: [sx * (xL + 0.135), yF + 0.1, z0 + dz] }));
      }
      out.push(part(G.rbox(0.25, 0.012, 0.03, 0.003, 1), P.canvas, { p: [sx * (xL + 0.13), yF + 0.21, z0 + 0.3] }));
    }
  }
  // vertical rack in the right rear corner: rounds standing nose-up
  const rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      const m = new THREE.Matrix4().makeTranslation(-0.86 + j * 0.1, FLOOR + 0.02, -2.18 + i * 0.1).multiply(rot);
      addRound(m);
    }
  }
  out.push(part(G.rbox(0.24, 0.02, 0.45, 0.004, 1), P.paint, { p: [-0.81, FLOOR + 0.01, -2.03] }));
  out.push(part(G.rbox(0.24, 0.02, 0.45, 0.004, 1), P.paint, { p: [-0.81, FLOOR + 0.45, -2.03] }));
  out.push(part(G.rbox(0.02, 0.46, 0.02, 0.004, 1), P.paint, { p: [-0.68, FLOOR + 0.23, -1.81] }));
  out.push(part(merge(caseG), P.brass));
  out.push(part(merge(projG), P.bore));
  return out;
}

function seat(P: Pal, h: number): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.cyl(0.022, 0.022, h - 0.05, 10), P.paint, { p: [0, (h - 0.05) / 2, 0] }));
  ps.push(part(G.rbox(0.18, 0.012, 0.18, 0.004, 1), P.paint, { p: [0, 0.006, 0] }));
  ps.push(part(G.rbox(0.3, 0.02, 0.26, 0.006, 1), P.paint, { p: [0, h - 0.04, 0] }));
  ps.push(part(G.rbox(0.3, 0.05, 0.26, 0.02, 2), P.canvas, { p: [0, h - 0.005, 0] }));
  return group(ps);
}

/** DT machine gun stowed on brackets (lying along +Z, pan magazine on top). */
function dt(P: Pal): THREE.Object3D {
  const ps: THREE.Object3D[] = [];
  ps.push(part(G.rbox(0.07, 0.08, 0.32, 0.008, 1), P.bore, { p: [0, 0, 0] }));
  ps.push(part(G.cyl(0.024, 0.024, 0.5, 14), P.bore, { p: [0, 0.01, 0.4], r: [90, 0, 0] }));
  ps.push(part(G.cyl(0.011, 0.011, 0.12, 10), P.bore, { p: [0, 0.01, 0.7], r: [90, 0, 0] }));
  ps.push(part(G.cyl(0.13, 0.13, 0.04, 28), P.bore, { p: [0, 0.07, 0.02] }));
  ps.push(part(G.cyl(0.03, 0.03, 0.045, 14), P.bore, { p: [0, 0.07, 0.02] }));
  ps.push(part(G.rbox(0.05, 0.1, 0.28, 0.01, 1), P.bore, { p: [0, -0.02, -0.3] }));
  ps.push(part(G.rbox(0.03, 0.09, 0.05, 0.008, 1), P.wood, { p: [0, -0.07, -0.08] }));
  return group(ps);
}

function interior(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const zB = frontZ(yR) - 0.03;
  // floor (tread plate) and the engine / fighting compartment bulkhead
  out.push(part(G.rbox(2 * xL - 0.04, 0.012, zB - zRear - 0.03, 0.003, 1), P.paint, { p: [0, FLOOR - 0.006, (zB + zRear) / 2] }));
  out.push(part(slab([[-xL + 0.016, FLOOR, zB], [xL - 0.016, FLOOR, zB], [xL - 0.016, yR - 0.01, zB], [-xL + 0.016, yR - 0.01, zB]], 0.015, [0, 0, -1], 0.003), P.paint));
  // bulkhead access panel and radiator housing on the right (engine side)
  out.push(part(G.rbox(0.5, 0.4, 0.012, 0.004, 1), P.paint, { p: [-0.5, 0.85, zB - 0.02] }));
  out.push(part(G.rbox(0.4, 0.3, 0.012, 0.004, 1), P.paint, { p: [0.45, 0.75, zB - 0.02] }));
  // crew seats: gunner (left), loader (right), commander (right rear)
  const s1 = seat(P, 0.6);
  s1.position.set(0.5, FLOOR, -0.78);
  out.push(s1);
  const s2 = seat(P, 0.55);
  s2.position.set(-0.5, FLOOR, -1.2);
  out.push(s2);
  const s3 = seat(P, 0.62);
  s3.position.set(-0.35, FLOOR, -1.85);
  out.push(s3);
  // DT stowed on the left side wall, on two brackets
  const m = dt(P);
  const yDT = 1.22;
  const xDT = sideX(yDT) - 0.2;
  m.position.set(xDT, yDT, -1.45);
  out.push(m);
  for (const z of [-1.6, -1.3]) {
    const xw = sideX(yDT - 0.05) - 0.012;
    out.push(part(G.rbox(xw - xDT, 0.03, 0.03, 0.004, 1), P.paint, { p: [(xw + xDT) / 2, yDT - 0.05, z] }));
  }
  // PPSh drum magazine box and a stowage box on the left sponson at the front
  out.push(part(G.rbox(0.28, 0.2, 0.3, 0.008, 1), P.paint, { p: [xL + 0.15, yF + 0.1, 0.05] }));
  out.push(part(G.rbox(0.3, 0.012, 0.32, 0.004, 1), P.paint, { p: [xL + 0.15, yF + 0.206, 0.05] }));
  out.push(part(G.rbox(0.26, 0.24, 0.3, 0.008, 1), P.paint, { p: [-(xL + 0.14), yF + 0.12, -0.15] }));
  out.push(...ammoRacks(P));
  return out;
}

/** Rolled tarpaulin tied along the top of the left side plate (outside), towards the rear. */
function tarp(P: Pal): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const y = C.yTop - 0.18;
  const x = sideX(y) + 0.085;
  const z0 = -1.25, z1 = 0.0;
  out.push(part(latheZ([[0.0, z0], [0.07, z0], [0.085, z0 + 0.03], [0.085, z1 - 0.03], [0.07, z1], [0.0, z1]], 18, 30), P.canvas, { p: [x, y, 0] }));
  for (const z of [z0 + 0.2, z1 - 0.2]) {
    out.push(part(G.torus(0.088, 0.008, 6, 20), P.canvas, { p: [x, y, z] }));
    out.push(part(G.rbox(0.012, 0.14, 0.02, 0.004, 1), P.canvas, { p: [x - 0.08, y + 0.1, z] }));
  }
  return out;
}

export function casemate(P: Pal, withTarp: boolean): THREE.Group {
  return group([...plates(P), ...rearFittings(P), ...interior(P), ...(withTarp ? tarp(P) : [])], { name: 'casemate' });
}

export { FLOOR };
