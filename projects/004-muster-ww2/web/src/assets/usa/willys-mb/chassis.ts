/**
 * Willys MB chassis: channel-section ladder frame with crossmembers and body mounts, front and
 * rear semi-elliptic leaf springs over solid axles (front 8 leaves / 36 1/4 in, rear 9 leaves /
 * 42 in, TM 9-803 par. 153) with hangers, shackles, U-bolts and rebound clips, direct-acting
 * tubular shock absorbers, front driving axle with closed knuckles, bellcrank steering with the
 * tie rods ahead of the axle, drag link and steering gear, rear axle, differentials offset to
 * the right, engine sump / bell housing / gearbox / transfer case, propeller shafts with
 * universal joints, exhaust and silencer along the right side, rear crossmember with the
 * pintle hook.
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V2, type V3, slab, merge, xf, box, cylX, cylY, latheX, bentRod } from './util';

const Y = D.axleY;
type Geo = THREE.BufferGeometry;

/* ------------------------------------------------------------------ frame */

function frame(): Geo[] {
  const out: Geo[] = [];
  const z0 = D.zFrameF, z1 = D.zFrameR;
  const len = z0 - z1;
  const b = D.frameBot, tp = D.frameTop, th = 0.0045;
  for (const s of [1, -1]) {
    const w = D.frameX + s * 0.025; // web (outer)
    const f = D.frameX - s * 0.025; // flange tips (inner)
    const x0 = s > 0 ? f : w, x1 = s > 0 ? w : f;
    const prof: V2[] =
      s > 0
        ? [[x1, b], [x1, tp], [x0, tp], [x0, tp - th], [x1 - th, tp - th], [x1 - th, b + th], [x0, b + th], [x0, b]]
        : [[x0, b], [x0, tp], [x1, tp], [x1, tp - th], [x0 + th, tp - th], [x0 + th, b + th], [x1, b + th], [x1, b]];
    out.push(slab(prof, len, [0, 0, z1 + len / 2], [1, 0, 0], [0, 1, 0], { bevel: 0.0012 }));
    // front end cap and gusset plate at the bumper
    out.push(box(0.05, 0.1, 0.006, [s * D.frameX, (b + tp) / 2, z0 - 0.003], 0.002));
    // body mounts (rubber-insulated blocks) between frame and floor
    for (const z of [1.33, 0.62, 0.05, -0.55, -1.1, -1.42]) out.push(box(0.07, D.floorY - 0.003 - tp, 0.07, [s * D.frameX, (tp + D.floorY - 0.003) / 2, z], 0.004));
    // rivet rows on the webs
    const rv: { p: V3; n: V3 }[] = [];
    for (let z = z1 + 0.1; z < z0 - 0.05; z += 0.22) for (const yy of [b + 0.022, tp - 0.022]) rv.push({ p: [s * (D.frameX + 0.025), yy, z], n: [s, 0, 0] });
    out.push(G.scatter(G.rivetHead(0.0065), rv));
  }
  const W = 2 * D.frameX - 0.05;
  out.push(box(W, 0.09, 0.06, [0, 0.555, 1.5], 0.005)); // front crossmember under the radiator
  out.push(box(W, 0.06, 0.05, [0, 0.572, 0.62], 0.005)); // engine rear support
  out.push(box(W, 0.06, 0.06, [0, 0.572, -0.02], 0.005)); // transmission crossmember
  out.push(box(W, 0.06, 0.05, [0, 0.572, -0.55], 0.005));
  out.push(box(W + 0.06, 0.12, 0.05, [0, 0.55, -1.44], 0.006)); // rear crossmember
  return out;
}

/* ------------------------------------------------------------------ springs */

interface SpringSpec {
  x: number;
  zc: number;
  len: number;
  leaves: number;
  camber: number;
  /** +1: shackle at the front eye, -1: shackle at the rear eye */
  shackle: 1 | -1;
}

const TH = 0.006; // leaf thickness
const SW = 0.044; // spring width (1 3/4 in)
const PAD = Y + 0.042 + 0.006; // spring seat top on the axle tube

function leafSpring(sp: SpringSpec): { steel: Geo[]; paint: Geo[] } {
  const steel: Geo[] = [];
  const paint: Geo[] = [];
  const half = sp.len / 2;
  const R = (half * half + sp.camber * sp.camber) / (2 * sp.camber);
  const mainTop = PAD + sp.leaves * TH;
  const minHalf = 0.09;
  for (let i = 0; i < sp.leaves; i++) {
    const hi = i === 0 ? half : i === 1 ? half * 0.97 : half - ((half - minHalf) * (i - 1)) / (sp.leaves - 2);
    const yc = mainTop - TH / 2 - i * TH;
    const pts: V3[] = [];
    const n = 16;
    for (let k = 0; k <= n; k++) {
      const dz = -hi + (2 * hi * k) / n;
      pts.push([sp.x, yc + (R - Math.sqrt(R * R - dz * dz)), sp.zc + dz]);
    }
    steel.push(G.strap(pts, SW, TH * 0.96, [0, 1, 0], { smooth: false }));
  }
  const yEnd = mainTop - TH / 2 + (R - Math.sqrt(R * R - half * half));
  const yEye = yEnd + 0.009;
  for (const e of [1, -1]) {
    const z = sp.zc + e * half;
    // rolled eye + bushed pin
    steel.push(cylX(0.017, SW, [sp.x, yEye, z], 16));
    steel.push(cylX(0.0085, SW + 0.075, [sp.x, yEye, z], 10));
    for (const s of [1, -1]) steel.push(xf(G.boltHead(0.02, 0.008), [sp.x + s * (SW / 2 + 0.037), yEye, z], [0, 0, -s * 90]));
    if (e === sp.shackle) {
      // shackle links from the eye pin up to the frame bracket
      const yUp = D.frameBot + 0.004;
      for (const s of [1, -1]) paint.push(box(0.007, yUp - yEye + 0.03, 0.03, [sp.x + s * (SW / 2 + 0.012), (yUp + yEye) / 2, z], 0.003));
      steel.push(cylX(0.0085, SW + 0.075, [sp.x, yUp, z], 10));
      paint.push(box(0.1, 0.024, 0.05, [sp.x, D.frameBot - 0.004, z], 0.004));
    } else {
      // fixed hanger bracket: two cheeks from the frame down to the eye
      const h = D.frameBot - yEye + 0.03;
      for (const s of [1, -1]) paint.push(box(0.007, h, 0.06, [sp.x + s * (SW / 2 + 0.012), D.frameBot - h / 2 + 0.012, z], 0.003));
      paint.push(box(SW + 0.036, 0.01, 0.07, [sp.x, D.frameBot - 0.004, z], 0.003));
    }
  }
  // rebound clips
  for (const e of [1, -1]) {
    const dz = e * half * 0.5;
    const yy = mainTop - (TH * sp.leaves) / 2 + (R - Math.sqrt(R * R - dz * dz)) - TH;
    paint.push(box(SW + 0.012, TH * (sp.leaves - 2) + 0.012, 0.018, [sp.x, yy, sp.zc + dz], 0.002));
  }
  return { steel, paint };
}

/** Spring seat, U-bolts and clamp plate where a spring sits on an axle tube. */
function springClamp(x: number, z: number, springTop: number): { steel: Geo[]; paint: Geo[] } {
  const steel: Geo[] = [];
  const paint: Geo[] = [];
  paint.push(box(0.062, 0.012, 0.11, [x, PAD - 0.006, z], 0.003));
  paint.push(box(0.1, 0.012, 0.13, [x, Y - 0.05, z], 0.003));
  paint.push(box(0.062, 0.01, 0.1, [x, springTop + 0.005, z], 0.003));
  for (const dz of [-0.052, 0.052]) {
    steel.push(bentRod([[x - 0.033, Y - 0.06, z + dz], [x - 0.033, springTop + 0.016, z + dz], [x + 0.033, springTop + 0.016, z + dz], [x + 0.033, Y - 0.06, z + dz]], 0.0065, 0.012));
    for (const s of [1, -1]) steel.push(xf(G.boltHead(0.017, 0.008), [x + s * 0.033, Y - 0.056, z + dz], [180, 0, 0]));
  }
  return { steel, paint };
}

function shock(a: V3, b: V3): { black: Geo[]; steel: Geo[] } {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A).normalize();
  const L = A.distanceTo(B);
  const bodyEnd = A.clone().addScaledVector(dir, L * 0.62);
  return {
    black: [G.rod(A.clone().addScaledVector(dir, 0.02), bodyEnd, 0.026, 16), G.rod(bodyEnd.clone().addScaledVector(dir, -0.04), bodyEnd.clone().addScaledVector(dir, 0.02), 0.029, 16)],
    steel: [G.rod(bodyEnd, B.clone().addScaledVector(dir, -0.018), 0.009, 10), cylX(0.017, 0.035, a, 12), cylX(0.017, 0.035, b, 12)],
  };
}

/* ------------------------------------------------------------------ axles */

function diffHousing(x: number, z: number, coverDir: 1 | -1): Geo[] {
  const out: Geo[] = [];
  const d = new THREE.SphereGeometry(0.127, 28, 18);
  d.scale(0.72, 1, 1.02);
  d.translate(x, Y, z);
  out.push(d);
  // bolted cover
  const cz = z + coverDir * 0.12;
  out.push(xf(latheX([[0, -0.008], [0.1, -0.008], [0.104, -0.004], [0.104, 0.004], [0.094, 0.009], [0.05, 0.014], [0, 0.015]], 32, 40), [x, Y, cz], [0, coverDir > 0 ? -90 : 90, 0]));
  const bolts: { p: V3; n: V3 }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    bolts.push({ p: [x + Math.cos(a) * 0.092, Y + Math.sin(a) * 0.092, cz + coverDir * 0.005], n: [0, 0, coverDir] });
  }
  out.push(G.scatter(G.boltHead(0.013, 0.006), bolts));
  // pinion snout towards the propeller shaft + flange yoke
  const pz = z - coverDir * 0.17;
  out.push(xf(G.cyl(0.042, 0.055, 0.12, 18), [x, Y + 0.004, z - coverDir * 0.14], [coverDir * -90, 0, 0]));
  out.push(xf(G.cyl(0.04, 0.04, 0.016, 18), [x, Y + 0.004, pz - coverDir * 0.03], [90, 0, 0]));
  return out;
}

function frontAxle(): { paint: Geo[]; steel: Geo[] } {
  const z = D.zF;
  const paint: Geo[] = [...diffHousing(-0.1, z, 1)];
  const steel: Geo[] = [];
  paint.push(cylX(0.041, 0.86, [0, Y, z], 20));
  for (const s of [1, -1]) {
    // closed steering-knuckle housing, kingpin caps, knuckle flange
    const k = new THREE.SphereGeometry(0.084, 22, 16);
    k.scale(0.8, 1, 1);
    k.translate(s * 0.46, Y, z);
    paint.push(k);
    for (const dy of [0.086, -0.086]) paint.push(cylY(0.034, 0.02, [s * 0.47, Y + dy, z], 14));
    for (const dy of [0.096, -0.096]) {
      const bl: { p: V3; n: V3 }[] = [];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        bl.push({ p: [s * 0.47 + Math.cos(a) * 0.024, Y + dy, z + Math.sin(a) * 0.024], n: [0, Math.sign(dy), 0] });
      }
      steel.push(G.scatter(G.boltHead(0.009, 0.004), bl));
    }
    paint.push(cylX(0.074, 0.02, [s * 0.515, Y, z], 24));
    paint.push(cylX(0.132, 0.005, [s * 0.527, Y, z], 36)); // brake backing plate
    // steering arm forward to the tie rod
    paint.push(bentRod([[s * 0.47, Y + 0.05, z + 0.04], [s * 0.465, 0.39, z + 0.12], [s * 0.46, 0.38, z + 0.165]], 0.012, 0.03));
    const cl = springClamp(s * D.frameX, z, PAD + 8 * TH);
    paint.push(...cl.paint);
    steel.push(...cl.steel);
  }
  // bellcrank on a pin ahead of the axle tube: lower arm to the tie rods, upper arm to the drag link
  const bx = 0.1, bz = z + 0.075;
  paint.push(box(0.05, 0.03, 0.05, [bx, Y + 0.02, z + 0.045], 0.004));
  steel.push(cylY(0.012, 0.1, [bx, 0.42, bz], 12));
  paint.push(bentRod([[bx, 0.38, bz], [bx, 0.38, z + 0.165]], 0.013, 0.02));
  paint.push(bentRod([[bx, 0.465, bz], [0.15, 0.465, z - 0.02], [0.2, 0.465, z - 0.08]], 0.013, 0.03));
  // tie rods with ball-joint ends
  for (const s of [1, -1]) {
    steel.push(G.rod([bx + s * 0.02, 0.38, z + 0.165], [s * 0.44, 0.38, z + 0.165], 0.011, 12));
    for (const x of [bx + s * 0.02, s * 0.44]) {
      const bj = new THREE.SphereGeometry(0.017, 12, 8);
      bj.translate(x, 0.38, z + 0.165);
      paint.push(bj);
    }
  }
  // drag link from the pitman arm to the bellcrank
  steel.push(G.rod([0.2, 0.465, z - 0.08], [0.3, 0.49, 0.86], 0.012, 12));
  for (const p of [[0.2, 0.465, z - 0.08], [0.3, 0.49, 0.86]] as V3[]) paint.push(box(0.04, 0.036, 0.05, p, 0.008));
  // steering gear on the inside of the left rail, pitman arm
  paint.push(box(0.1, 0.12, 0.12, [0.3, 0.63, 0.85], 0.015));
  paint.push(cylX(0.05, 0.12, [0.29, 0.6, 0.85], 20));
  paint.push(box(0.03, 0.14, 0.03, [0.3, 0.53, 0.86], 0.006));
  return { paint, steel };
}

function rearAxle(): { paint: Geo[]; steel: Geo[] } {
  const z = D.zR;
  const paint: Geo[] = [...diffHousing(-0.1, z, -1)];
  const steel: Geo[] = [];
  paint.push(cylX(0.041, 1.04, [0, Y, z], 20));
  for (const s of [1, -1]) {
    paint.push(cylX(0.06, 0.06, [s * 0.5, Y, z], 22));
    paint.push(cylX(0.132, 0.005, [s * 0.527, Y, z], 36));
    const cl = springClamp(s * D.frameX, z, PAD + 9 * TH);
    paint.push(...cl.paint);
    steel.push(...cl.steel);
  }
  return { paint, steel };
}

/* ------------------------------------------------------------------ drivetrain */

function drivetrain(): { engine: Geo[]; paint: Geo[]; exhaust: Geo[] } {
  const engine: Geo[] = [];
  engine.push(box(0.3, 0.3, 0.6, [0, 0.72, 1.07], 0.02)); // block
  engine.push(box(0.24, 0.06, 0.55, [0, 0.9, 1.07], 0.015)); // head
  engine.push(box(0.27, 0.12, 0.46, [0, 0.515, 1.08], 0.02)); // oil pan
  engine.push(xf(G.cyl(0.17, 0.2, 0.12, 28), [0, 0.64, 0.72], [90, 0, 0])); // bell housing
  engine.push(box(0.2, 0.19, 0.26, [0, 0.61, 0.52], 0.015)); // gearbox
  engine.push(box(0.26, 0.2, 0.2, [-0.06, 0.53, 0.26], 0.018)); // transfer case
  engine.push(xf(G.cyl(0.05, 0.05, 0.08, 18), [-0.1, 0.5, 0.39], [90, 0, 0]));
  engine.push(xf(G.cyl(0.05, 0.05, 0.08, 18), [-0.1, 0.5, 0.13], [90, 0, 0]));
  // engine mounts to the frame
  for (const s of [1, -1]) engine.push(box(0.2, 0.05, 0.08, [s * 0.24, 0.62, 1.25], 0.01));
  const paint: Geo[] = [];
  const shaft = (a: V3, b: V3) => {
    paint.push(G.rod(a, b, 0.024, 14));
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    for (const [p, sgn] of [[a, 1], [b, -1]] as [V3, number][]) {
      // universal joint: cross + two yokes
      for (const t of [0.01, 0.045]) {
        const y = G.rbox(0.065, 0.065, 0.022, 0.008, 1);
        y.applyQuaternion(q);
        y.translate(p[0] + dir.x * sgn * t, p[1] + dir.y * sgn * t, p[2] + dir.z * sgn * t);
        paint.push(y);
      }
    }
  };
  shaft([-0.1, 0.5, 0.33], [-0.1, Y + 0.004, D.zF - 0.25]);
  shaft([-0.1, 0.5, 0.09], [-0.1, Y + 0.004, D.zR + 0.25]);
  // exhaust: downpipe on the right of the engine, pipe along the right side, silencer, tail pipe
  const exhaust: Geo[] = [];
  exhaust.push(bentRod([[-0.16, 0.74, 1.08], [-0.2, 0.6, 1.0], [-0.22, 0.46, 0.84], [-0.25, 0.455, 0.2], [-0.26, 0.455, 0.06]], 0.021, 0.08));
  const muff = latheX([[0, -0.21], [0.045, -0.21], [0.062, -0.2], [0.066, -0.18], [0.066, 0.18], [0.062, 0.2], [0.045, 0.21], [0, 0.21]], 24, 40);
  muff.rotateY(-Math.PI / 2);
  muff.translate(-0.265, 0.455, -0.16);
  exhaust.push(muff);
  exhaust.push(bentRod([[-0.265, 0.455, -0.37], [-0.265, 0.45, -0.6], [-0.255, 0.445, -1.2], [-0.25, 0.43, -1.36]], 0.019, 0.1));
  // silencer hangers
  paint.push(box(0.012, 0.13, 0.03, [-0.3, 0.55, -0.16], 0.003));
  paint.push(box(0.012, 0.1, 0.025, [-0.29, 0.55, -1.2], 0.003));
  return { engine, paint, exhaust };
}

function pintle(): Geo[] {
  const z = D.zFrameR;
  const y = 0.533;
  return [
    box(0.18, 0.13, 0.014, [0, 0.55, z - 0.007], 0.004),
    box(0.07, 0.075, 0.07, [0, y, z - 0.05], 0.01),
    bentRod([[0, y + 0.02, z - 0.085], [0, y - 0.02, z - 0.1], [0, y - 0.03, z - 0.14], [0, y, z - 0.165], [0, y + 0.04, z - 0.15]], 0.017, 0.022, 12),
    // latch
    box(0.022, 0.05, 0.02, [0, y + 0.03, z - 0.105], 0.004, [0, 0, 0]),
  ];
}

export function buildChassis(): THREE.Object3D {
  const fa = frontAxle();
  const ra = rearAxle();
  const dt = drivetrain();
  const springsSteel: Geo[] = [];
  const springsPaint: Geo[] = [];
  for (const s of [1, -1]) {
    const f = leafSpring({ x: s * D.frameX, zc: D.zF, len: 0.921, leaves: 8, camber: 0.012, shackle: 1 });
    const r = leafSpring({ x: s * D.frameX, zc: D.zR, len: 1.067, leaves: 9, camber: 0.014, shackle: -1 });
    springsSteel.push(...f.steel, ...r.steel);
    springsPaint.push(...f.paint, ...r.paint);
  }
  const black: Geo[] = [];
  const steel: Geo[] = [...fa.steel, ...ra.steel];
  for (const s of [1, -1]) {
    const sf = shock([s * 0.42, 0.575, D.zF + 0.2], [s * 0.42, 0.395, D.zF + 0.075]);
    const sr = shock([s * 0.415, 0.575, D.zR - 0.2], [s * 0.415, 0.395, D.zR - 0.075]);
    black.push(...sf.black, ...sr.black);
    steel.push(...sf.steel, ...sr.steel);
    // upper shock brackets on the rail
    springsPaint.push(box(0.05, 0.04, 0.04, [s * 0.4, 0.575, D.zF + 0.2], 0.004));
    springsPaint.push(box(0.05, 0.04, 0.04, [s * 0.4, 0.575, D.zR - 0.2], 0.004));
  }
  return group([
    part(merge([...frame(), ...fa.paint, ...ra.paint, ...dt.paint, ...pintle(), ...springsPaint]), P.chassis()),
    part(merge(springsSteel), P.chassis()),
    part(merge(steel), P.steel()),
    part(merge(black), P.black()),
    part(merge(dt.engine), P.engine()),
    part(merge(dt.exhaust), P.exhaust()),
  ]);
}
