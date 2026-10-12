/**
 * M1 bayonet (US, 1943-45: 10-inch blade, new manufacture with the fuller stopping short of the
 * point, black plastic grips) in the M7 scabbard (OD plastic body, OD steel throat with its M1910
 * type double-hook wire hanger).
 *
 * Data (m): blade 0.245 (9 5/8 in), overall 0.359 (14 1/8 in); crossguard with the muzzle ring on
 * the spine side; hilt 0.114 (guard 0.006, grip 0.09, pommel 0.018); M7 scabbard 0.286 (11 1/4 in).
 *
 * MODEL frame (buildM1BayonetModel / buildM7Scabbard): origin at the centre of the crossguard's
 * lower face (= the scabbard throat top when sheathed), blade along -Y (point down), blade width
 * along X with the SPINE and muzzle ring towards +X and the edge towards -X, flat sides facing +-Z.
 *
 * WORN frame (buildM1Bayonet -> GearPiece, mount 'belt-left'): the scabbard hangs by its wire
 * hanger from a pair of belt eyelets. ORIGIN = midpoint of the two eyelets the hooks pass through
 * (hooks at x = +-0.025, y = 0), z = 0 = outer face of the belt; the hilt stands up in front of the
 * belt (grip clear of the belt face and the hooks), the scabbard hangs below. Ring side = +X.
 * `slotY` = the model-frame origin (crossguard) height in the worn frame.
 * On the M1923 belt the hilt rises in front of a pocket: hang it from a slot under a pocket and push
 * it out by the pocket depth (about 0.03 m) or hang it from the haversack's 'bayonet' slot.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { US } from './palette';
import { merge, m1910Hanger, latheZ, paramSurface, smoothstep, lerp } from './parts';

export const M1_BAYONET = {
  bladeL: 0.245,
  bladeW: 0.0235,
  spineT: 0.0052,
  guardT: 0.006,
  gripL: 0.09,
  pommelL: 0.018,
  scabbardL: 0.286,
  throatL: 0.036,
  /** Hanger: drop from the hooks to the U through the throat bracket. */
  hangerDrop: 0.046,
  /** z of the scabbard centre plane in the worn frame. */
  zc: 0.0128,
};

// ---------------------------------------------------------------------------------------------
// Blade
// ---------------------------------------------------------------------------------------------

/** Blade edges (x) at the fraction v of the length from the guard: [edge (-X), spine (+X)]. */
function bladeEdges(v: number): [number, number] {
  const B = M1_BAYONET;
  const W = B.bladeW * lerp(1, 0.93, smoothstep(0.1, 0.8, v));
  const tipX = 0.0035;
  // the edge sweeps up to the point over the last 17 %, the spine clips down over the last 27 % (false edge)
  const ke = smoothstep(0.83, 1, v), ks = smoothstep(0.73, 1, v);
  const e = lerp(-W / 2, tipX, Math.pow(ke, 1.6));
  const s = lerp(W / 2, tipX, ks);
  return [e, Math.max(e + 1e-4, s)];
}

function buildBlade(): THREE.BufferGeometry {
  const B = M1_BAYONET;
  const NU = 26; // samples across one face
  const fn = (face: number) => (u: number, v: number) => {
    // u 0..1 from the spine to the edge on face +1 (+Z) / -1
    const [xe, xs] = bladeEdges(v);
    const x = lerp(xs, xe, u);
    const w = xs - xe;
    const a = (x - xe) / Math.max(w, 1e-5); // 0 at the edge, 1 at the spine
    const tipK = 1 - smoothstep(0.82, 1, v) * 0.85;
    const T = B.spineT * lerp(1, 0.7, smoothstep(0.2, 0.9, v)) * tipK;
    // flat grind from the edge to 45 % of the width, flat faces above it
    let h = lerp(0.00025, T / 2, smoothstep(0, 0.45, a));
    // fuller: from 0.03 below the guard to 0.075 short of the point, centred at 62 % towards the spine
    const vf0 = 0.03 / B.bladeL, vf1 = 1 - 0.075 / B.bladeL;
    const fk = smoothstep(vf0, vf0 + 0.03, v) * (1 - smoothstep(vf1 - 0.06, vf1, v));
    const fu = (a - 0.64) / 0.2;
    if (Math.abs(fu) < 1) h -= 0.0011 * fk * Math.sqrt(1 - fu * fu);
    // ricasso: a flat, slightly thicker section next to the guard
    return new THREE.Vector3(x, -v * B.bladeL, face * Math.max(h, 0.0002));
  };
  const nv = 48;
  const top = paramSurface(fn(1), NU, nv);
  const bot = paramSurface(fn(-1), NU, nv, false, true);
  // spine strip (flat back of the blade) joining the two faces at u = 0
  const spine = paramSurface(
    (u, v) => {
      const p = fn(1)(0, v), q = fn(-1)(0, v);
      return p.lerp(q, u);
    },
    2,
    nv,
    false,
    true,
  );
  const edge = paramSurface(
    (u, v) => {
      const p = fn(1)(1, v), q = fn(-1)(1, v);
      return p.lerp(q, u);
    },
    1,
    nv,
  );
  return merge([top, bot, spine, edge]);
}

// ---------------------------------------------------------------------------------------------
// Hilt
// ---------------------------------------------------------------------------------------------

/** Grip section half extents (X, Z) at height t (0 guard .. 1 pommel). */
function gripHalf(t: number): [number, number] {
  const swell = Math.sin(Math.PI * Math.min(1, t * 1.05)) * 0.0009;
  return [0.0118 + swell * 0.6, 0.0092 + swell];
}

function buildHilt(): THREE.Object3D[] {
  const B = M1_BAYONET;
  const steel = US.parkerized(), plastic = US.blackPlastic();
  const out: THREE.Object3D[] = [];
  const steelParts: THREE.BufferGeometry[] = [];
  // crossguard: flat bar from the edge-side quillon to the muzzle ring on the spine side
  const gy = B.guardT / 2;
  const bar = G.extrude(
    [
      [-0.0165, -0.0045],
      [-0.0135, -0.0062],
      [0.022, -0.0062],
      [0.022, 0.0062],
      [-0.0135, 0.0062],
      [-0.0165, 0.0045],
    ],
    B.guardT,
    0.0008,
  );
  bar.rotateX(-Math.PI / 2); // extrusion along +Y
  steelParts.push(bar);
  // muzzle ring (axis along Y, i.e. parallel to the blade)
  const ring = latheZ(
    [
      [0.0079, 0],
      [0.0104, 0],
      [0.0108, 0.0012],
      [0.0108, 0.0068],
      [0.0104, 0.008],
      [0.0079, 0.008],
    ],
    28,
    40,
  );
  ring.rotateX(-Math.PI / 2);
  ring.translate(0.031, -0.001, 0);
  steelParts.push(ring);
  // tang between the grip scales, visible along the spine and the belly
  const gl = B.gripL;
  const tang = G.rbox(0.0232, gl, 0.0046, 0.0008, 1);
  tang.translate(0, B.guardT + gl / 2, 0);
  steelParts.push(tang);
  // pommel with the bayonet-stud T-slot on the spine side and the latch button on the +Z face
  const py0 = B.guardT + gl;
  const pom = G.rbox(0.0262, B.pommelL, 0.0205, 0.0055, 3);
  pom.translate(0.0006, py0 + B.pommelL / 2, 0);
  steelParts.push(pom);
  const lip = G.rbox(0.0244, 0.0022, 0.019, 0.0008, 1);
  lip.translate(0.0006, py0 + 0.0011, 0);
  steelParts.push(lip);
  const btn = latheZ(
    [
      [0, 0.0019],
      [0.0024, 0.0017],
      [0.0031, 0.0009],
      [0.0032, 0],
      [0, 0],
    ],
    14,
    50,
  );
  btn.translate(0.004, py0 + 0.0075, 0.0102);
  steelParts.push(btn);
  // latch lever along the spine side of the grip, into the pommel
  const lever = G.rbox(0.0028, 0.026, 0.006, 0.001, 1);
  lever.translate(0.0128, py0 - 0.006, 0);
  steelParts.push(lever);
  out.push(part(merge(steelParts), steel, { name: 'hilt-steel' }));
  // dark slot for the bayonet stud in the pommel (spine side, open at the top)
  const slot = G.rbox(0.0018, 0.013, 0.0092, 0.0006, 1);
  slot.translate(0.0124, py0 + B.pommelL - 0.0062, 0);
  out.push(part(slot, US.eyeletHole()));
  // grip scales: rounded, lengthwise grooves, a screw through the middle
  const scales: THREE.BufferGeometry[] = [];
  for (const sz of [1, -1]) {
    const surf = paramSurface(
      (u, v) => {
        const t = v;
        const [hx, hz] = gripHalf(t);
        const a = (u * 2 - 1) * (Math.PI / 2); // across the scale, edges landing on the tang
        // moulded lengthwise grooves (narrow, evenly spaced across the scale)
        const groove = 0.0005 * THREE.MathUtils.smoothstep(Math.abs(Math.sin(a * 5.5)), 0.72, 1) * (1 - THREE.MathUtils.smoothstep(Math.abs(a), 1.25, 1.5));
        const endK = smoothstep(0, 0.05, t) * (1 - smoothstep(0.95, 1, t));
        const x = Math.sin(a) * hx;
        const z = sz * (0.0023 + Math.cos(a) * (hz - 0.0023) * (0.35 + 0.65 * endK) - groove * Math.cos(a));
        return new THREE.Vector3(x, B.guardT + t * (gl - 0.0006), z);
      },
      44,
      22,
      false,
      sz < 0,
    );
    scales.push(surf);
  }
  out.push(part(merge(scales), plastic, { name: 'grips' }));
  const screws: THREE.BufferGeometry[] = [];
  for (const sz of [1, -1]) {
    const head = latheZ(
      [
        [0, 0.0011],
        [0.0026, 0.001],
        [0.0036, 0.0005],
        [0.0037, 0],
        [0, 0],
      ],
      16,
      50,
    );
    if (sz < 0) head.rotateY(Math.PI);
    head.translate(0, B.guardT + gl * 0.46, sz * 0.0098);
    screws.push(head);
  }
  out.push(part(merge(screws), steel));
  // screw slot on the +Z head
  const ss = G.rbox(0.0056, 0.0007, 0.0006, 0.0002, 1);
  ss.translate(0, B.guardT + gl * 0.46, 0.0107);
  out.push(part(ss, US.eyeletHole()));
  return out;
}

/** The bayonet alone (model frame, see header). */
export function buildM1BayonetModel(): THREE.Group {
  const g = group([part(buildBlade(), US.bladeSteel(), { name: 'blade' }), ...buildHilt()]);
  g.name = 'us-m1-bayonet';
  return g;
}

// ---------------------------------------------------------------------------------------------
// M7 scabbard
// ---------------------------------------------------------------------------------------------

/** Scabbard section half extents (X, Z) and centre x at depth y (0 = throat top, negative down). */
function scabbardSection(y: number): { hx: number; hz: number; cx: number } {
  const B = M1_BAYONET;
  const v = Math.min(1, Math.max(0, -y / B.scabbardL));
  const hx = lerp(0.0188, 0.0118, smoothstep(0.1, 0.95, v));
  const hz = lerp(0.0079, 0.0058, smoothstep(0.1, 0.95, v));
  return { hx, hz, cx: 0.0012 * smoothstep(0.3, 1, v) };
}

export function buildM7Scabbard(): { object: THREE.Group; bracketY: number; wire: THREE.Vector3 } {
  const B = M1_BAYONET;
  const L = B.scabbardL, tl = B.throatL;
  const nu = 36;
  // superelliptic lens section with a raised centre rib on both faces
  const ringPt = (y: number, u: number, grow = 0) => {
    const { hx, hz, cx } = scabbardSection(y);
    const a = u * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const e = 2.6;
    const x = hx * Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
    let z = hz * Math.sign(s) * Math.pow(Math.abs(s), 1.15);
    z += Math.sign(s) * 0.0007 * Math.exp(-((x / 0.004) ** 2)) * smoothstep(-tl - 0.004, -tl - 0.02, y);
    return new THREE.Vector3(cx + x * (1 + grow), y, z * (1 + grow) + Math.sign(s) * grow * 0.002);
  };
  // body: throat bottom to the rounded tip (poles close the tip)
  const yb0 = -tl + 0.002, yTip = -L;
  const body = paramSurface(
    (u, v) => {
      const y = lerp(yb0, yTip + 0.012, v);
      const p = ringPt(y, u);
      // round the last 12 mm to the tip
      if (v > 0.999) return p;
      return p;
    },
    nu,
    44,
    true,
  );
  // rounded tip cap: shrink rings down to a point
  const tip = paramSurface(
    (u, v) => {
      const k = Math.cos((v * Math.PI) / 2);
      const p = ringPt(yTip + 0.012, u);
      const cx = scabbardSection(yTip).cx;
      return new THREE.Vector3(cx + (p.x - cx) * k, yTip + 0.012 - 0.012 * Math.sin((v * Math.PI) / 2), p.z * Math.sqrt(k));
    },
    nu,
    8,
    true,
  );
  const parts: THREE.Object3D[] = [part(merge([body, tip]), US.odPlastic(), { name: 'scabbard' })];
  // steel throat: a sleeve round the top of the body, rolled top lip, spring plate with two rivets
  const throat = paramSurface((u, v) => ringPt(lerp(0.0005, -tl, v), u, 0.08), nu, 6, true);
  const lipR = paramSurface(
    (u, v) => {
      const p = ringPt(0, u, 0.08 + 0.05 * Math.sin(v * Math.PI));
      p.y = 0.0005 - 0.003 * v;
      return p;
    },
    nu,
    4,
    true,
  );
  const top = new THREE.ShapeGeometry(
    new THREE.Shape(Array.from({ length: nu }, (_, i) => {
      const p = ringPt(0, i / nu, 0.08);
      return new THREE.Vector2(p.x, -p.z);
    })),
  );
  top.rotateX(-Math.PI / 2);
  top.translate(0, 0.0005, 0);
  const steel: THREE.BufferGeometry[] = [throat, lipR];
  const spring = G.rbox(0.013, 0.024, 0.0012, 0.0005, 1);
  spring.translate(0.001, -0.016, ringPt(-0.016, 0.25, 0.08).z + 0.0005);
  steel.push(spring);
  for (const y of [-0.0085, -0.0235]) {
    const r = latheZ([[0, 0.0009], [0.0014, 0.0007], [0.0018, 0], [0, 0]], 10, 50);
    r.translate(0.001, y, ringPt(y, 0.25, 0.08).z + 0.0011);
    steel.push(r);
  }
  // hanger bracket on the back (-Z) face: a strap loop standing off the throat
  const bracketY = -0.013;
  const zb = ringPt(bracketY, 0.75, 0.08).z; // back surface (negative z)
  const loop = G.tube(
    [
      [-0.0115, bracketY + 0.006, zb + 0.0004],
      [-0.0112, bracketY + 0.0005, zb - 0.0052],
      [0, bracketY - 0.0004, zb - 0.006],
      [0.0112, bracketY + 0.0005, zb - 0.0052],
      [0.0115, bracketY + 0.006, zb + 0.0004],
    ],
    0.0012,
    6,
    24,
  );
  steel.push(loop);
  const plate = G.rbox(0.028, 0.012, 0.0012, 0.0005, 1);
  plate.translate(0, bracketY + 0.006, zb - 0.0002);
  steel.push(plate);
  parts.push(part(merge(steel), US.odSteel(), { name: 'throat' }));
  parts.push(part(top, US.eyeletHole()));
  const object = group(parts);
  object.name = 'us-m7-scabbard';
  // the hanger wire passes between the loop and the throat: its centre (model frame)
  return { object, bracketY, wire: new THREE.Vector3(0, bracketY + 0.0012, zb - 0.0024) };
}

// ---------------------------------------------------------------------------------------------
// Worn piece
// ---------------------------------------------------------------------------------------------

export interface M1BayonetOptions {
  /** Include the wire hanger (default true). */
  hanger?: boolean;
  /** Bayonet sheathed (default) or the empty scabbard. */
  bayonet?: boolean;
}

/** M1 bayonet in the M7 scabbard, worn frame (see header). */
export function buildM1Bayonet(o: M1BayonetOptions = {}): GearPiece & { slotY: number } {
  const B = M1_BAYONET;
  const sc = buildM7Scabbard();
  // sheathed: only the hilt shows, the blade (hidden in the body) is left out
  const inner: THREE.Object3D[] = [sc.object];
  if (o.bayonet !== false) inner.push(...buildHilt());
  const model = group(inner);
  // model -> worn: the hanger U (drop below the hooks, legs 2.1 mm in front of the belt face)
  // passes between the throat and its bracket loop
  const zLegs = 0.0015 + 0.0006;
  const slotY = -B.hangerDrop - 0.0005 - sc.wire.y;
  model.position.set(0, slotY, zLegs - sc.wire.z);
  const parts: THREE.Object3D[] = [model];
  if (o.hanger !== false) parts.push(part(m1910Hanger({ spacing: 0.05, drop: B.hangerDrop, r: 0.0015 }), US.wire(), { name: 'hanger' }));
  const object = group(parts);
  object.name = 'us-m1-bayonet-m7';
  const b = new THREE.Box3().setFromObject(object, true);
  const size = b.getSize(new THREE.Vector3());
  return {
    id: 'us-m1-bayonet-m7',
    name: 'M1 bayonet in M7 scabbard',
    object,
    mount: 'belt-left',
    size: { w: size.x, h: size.y, d: b.max.z },
    slotY,
  };
}
