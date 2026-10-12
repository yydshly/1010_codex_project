/**
 * US Army web belts (1944), built ALONG A WAIST PATH supplied by the infantry author:
 *   buildM1923BeltAlong(o)     M1923 dismounted cartridge belt: ten pockets (five each side of the
 *                              front fastener), each for one 8-round M1 clip, lift-the-dot flaps;
 *                              a pair of eyelets under every pocket for M1910 hangers, top-edge
 *                              eyelets between the pockets for strap hooks, adjusting buckles at the back.
 *   buildM1937BarBeltAlong(o)  M1937 BAR magazine belt: six pockets (three each side), two 20-round
 *                              magazines in each (one behind the other); hanger eyelets on the rear section.
 *   buildM1936PistolBeltAlong(o) M1936 pistol belt: plain 57 mm web with eyelets along both edges.
 * All use the male/female plate fastener at the front centre (blackened brass).
 *
 * INPUT (BeltPathOptions): `path` = closed loop on the belt centre line, in the caller's frame,
 * STARTING AT THE FRONT CENTRE; `normals` = outward unit vectors per point (default: horizontal,
 * away from the loop's centroid); `inset` = distance from the path to the belt's INSIDE face along
 * -normal (0 = the path is the inside face; pass fit.belt.thickness / 2 when passing
 * fit.beltPath(h).points). Use a belt height in buildSoldier({ belt }) that covers the pocket panel
 * (e.g. width 0.1) so the path clears the cloth over the whole panel. Band width runs along +Y
 * (the path's up), the band lies outside the inside face.
 *
 * OUTPUT (BeltRig): `object` (the belt), `length` (loop length) and mount frames in the caller's
 * frame. All frames: origin on the belt's OUTER face, +X along the belt (towards the wearer's left
 * at the front), +Y up, +Z outward = the gear-local frame of the pieces that hang there.
 *   slots[name]      M1910 hanger slots = midpoint of an eyelet pair (hooks at +-0.025 along X).
 *                    Worn frame of buildM1910Canteen / buildFirstAidPouch / buildM1943EntrenchingTool /
 *                    buildM1Bayonet: `placed.applyMatrix4(rig.slots.R5)`.
 *                    M1923: 'L1'..'L5' (wearer's left, L1 next to the fastener), 'R1'..'R5'.
 *                    M1937: 'rear-L', 'rear-R' (on the narrow rear section behind the pockets).
 *                    M1936: 'L1'.. / 'R1'.. every 0.025 m from the fastener (eyelets d and d + 0.05).
 *   top[name]        single top-edge eyelets (centre of the eyelet) for suspender / haversack hooks:
 *                    M1923 'L1'..'L4' / 'R1'..'R4' between the pockets + 'rear' (back centre);
 *                    M1937 'L1','L2' between the pockets, 'L3' behind the last pocket, + 'rear';
 *                    M1936 'L1'.. every 0.025 m.
 *   frameAt(d, y)    frame at signed arc length d from the front centre (+ = wearer's left).
 *   frameAtAngle(a, y)  same at an angle around the loop centroid (0 = front +Z, +90 = +X).
 *   loopMount(d)     frame for belt-loop pieces (buildThompsonPouch: loop behind the belt):
 *                    origin on the loop's inner face, i.e. belt inside face - loop thickness.
 *
 * Belt data (m): cartridge-belt pocket panel -0.05..+0.058 around the centre line, BAR panel
 * -0.04..+0.048, adjusting strap / pistol belt 0.057 high, web thickness 0.0035; hanger hook spacing 0.05.
 *
 * GearPiece wrappers for review: buildM1923Belt() / buildM1937BarBelt() / buildM1936PistolBelt() lay
 * the belt on a default 0.92 m waist loop (ellipse 0.165 x 0.125 m, origin at the loop centre at
 * belt mid-height, front = +Z).
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { US, type WebShade } from './palette';
import { merge, grommet, barBuckle, stitches, boxX, sheet } from './parts';
import { buildM1923Pocket, buildM1937BarPocket, POCKET_M1923, POCKET_M1937 } from './pouches';

export const US_BELT = { strapH: 0.057, t: 0.0035, hookSpacing: 0.05, loopT: 0.0025 };

export interface BeltPathOptions {
  /** Closed loop on the belt's centre line, starting at the front centre. */
  path: THREE.Vector3[];
  /** Outward unit normals per path point (default: horizontal, away from the centroid). */
  normals?: THREE.Vector3[];
  /** Distance from the path to the belt's inside face (along -normal). Default 0. */
  inset?: number;
  shade?: WebShade;
  /** Include the pockets (default true). */
  pockets?: boolean;
}

export interface BeltRig {
  object: THREE.Group;
  length: number;
  slots: Record<string, THREE.Matrix4>;
  top: Record<string, THREE.Matrix4>;
  frameAt(d: number, y?: number): THREE.Matrix4;
  frameAtAngle(deg: number, y?: number): THREE.Matrix4;
  loopMount(d: number): THREE.Matrix4;
}

interface Frame {
  p: THREE.Vector3;
  T: THREE.Vector3;
  N: THREE.Vector3;
  U: THREE.Vector3;
  X: THREE.Vector3;
}

type Curve = ReturnType<typeof beltCurve>;

/** Arc-length parametrised frames along the closed belt path (inside face). s = 0 at the front. */
function beltCurve(path: THREE.Vector3[], normals?: THREE.Vector3[], inset = 0) {
  const cen = path.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / path.length);
  const nrm = normals ? normals.map((n) => n.clone().normalize()) : path.map((p) => p.clone().sub(cen).setY(0).normalize());
  const inside = path.map((p, i) => p.clone().addScaledVector(nrm[i], -inset));
  const c = new THREE.CatmullRomCurve3(inside, true, 'centripetal');
  c.arcLengthDivisions = 400;
  const cn = new THREE.CatmullRomCurve3(nrm, true, 'centripetal');
  const L = c.getLength();
  // cache frames on a fine arc-length table (wrapping modules query it per vertex)
  const NS = Math.max(256, Math.ceil(L / 0.002));
  const tab: Frame[] = [];
  for (let i = 0; i < NS; i++) {
    const u = i / NS;
    const p = c.getPointAt(u);
    const T = c.getTangentAt(u).normalize();
    const n = cn.getPoint(c.getUtoTmapping(u, 0)).normalize();
    const N = n.sub(T.clone().multiplyScalar(n.dot(T))).normalize();
    let U = T.clone().cross(N).normalize();
    if (U.y < 0) U.negate();
    const X = U.clone().cross(N).normalize();
    tab.push({ p, T, N, U, X });
  }
  const frame = (s: number): Frame => {
    const f = ((((s / L) % 1) + 1) % 1) * NS;
    const i0 = Math.floor(f) % NS, i1 = (i0 + 1) % NS, t = f - Math.floor(f);
    const a = tab[i0], b = tab[i1];
    const N = a.N.clone().lerp(b.N, t).normalize();
    const T = a.T.clone().lerp(b.T, t).normalize();
    const U = a.U.clone().lerp(b.U, t).normalize();
    return { p: a.p.clone().lerp(b.p, t), T, N, U, X: U.clone().cross(N).normalize() };
  };
  // s increasing = +X of the local frame at the front?  (sgn maps local +X to arc direction)
  const sgn = Math.sign(tab[0].X.dot(tab[0].T)) || 1;
  /** arc length for a signed distance d from the front centre (+ = local +X side). */
  const sOf = (d: number) => (((sgn * d) % L) + L) % L;
  const sAtAngle = (deg: number) => {
    const a = (deg * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    let best = 0, bd = -Infinity;
    for (let i = 0; i < NS; i++) {
      const v = tab[i].p.clone().sub(cen).setY(0).normalize();
      const d = v.dot(dir);
      if (d > bd) {
        bd = d;
        best = i;
      }
    }
    return (best / NS) * L;
  };
  return { L, frame, sgn, sOf, sAtAngle, cen };
}

/** Frame matrix at arc length s, height y, offset z along the normal from the inside face. */
function frameMatrix(curve: Curve, s: number, y: number, z: number): THREE.Matrix4 {
  const f = curve.frame(s);
  const X = f.X.clone();
  const p = f.p.clone().addScaledVector(f.U, y).addScaledVector(f.N, z);
  return new THREE.Matrix4().makeBasis(X, f.U, f.N).setPosition(p);
}

/**
 * Bend a module (authored flat: x along the belt, y up, z out from the band's outer face) round the
 * belt: every vertex (x, y, z) goes to frame(s0 + sgn * x).p + U * y + N * (z + zOff).
 */
function wrapModule(obj: THREE.Object3D, curve: Curve, s0: number, zOff: number, out: THREE.Object3D[]) {
  obj.updateMatrixWorld(true);
  obj.traverse((m) => {
    const mesh = m as THREE.Mesh;
    if (!mesh.isMesh) return;
    const g = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    const pa = g.attributes.position as THREE.BufferAttribute;
    const na = g.attributes.normal as THREE.BufferAttribute | undefined;
    const v = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i);
      const f = curve.frame(s0 + curve.sgn * v.x);
      const q = f.p.clone().addScaledVector(f.U, v.y).addScaledVector(f.N, v.z + zOff);
      pa.setXYZ(i, q.x, q.y, q.z);
      if (na) {
        n.fromBufferAttribute(na, i);
        const r = f.X.clone().multiplyScalar(n.x).addScaledVector(f.U, n.y).addScaledVector(f.N, n.z).normalize();
        na.setXYZ(i, r.x, r.y, r.z);
      }
    }
    pa.needsUpdate = true;
    out.push(part(g, mesh.material as THREE.Material));
  });
}

/** Place a rigid (flat-authored) geometry at arc length s: x along the belt, y up, z out of the outer face. */
function placeRigid(g: THREE.BufferGeometry, curve: Curve, s: number, y = 0, z = US_BELT.t): THREE.BufferGeometry {
  return g.applyMatrix4(frameMatrix(curve, s, y, z));
}

/**
 * Web band along the path between arc lengths s0 and s1 (s1 > s0, may exceed L), with top / bottom
 * edge heights as functions of s. Rectangular section, crisp edges, explicit winding.
 */
function bandGeometry(curve: Curve, s0: number, s1: number, top: (s: number) => number, bot: (s: number) => number, t: number): THREE.BufferGeometry {
  const n = Math.max(24, Math.ceil((s1 - s0) / 0.008));
  const rows: THREE.Vector3[][] = [];
  const fr: Frame[] = [];
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n;
    const f = curve.frame(s);
    fr.push(f);
    const yb = bot(s), yt = top(s);
    rows.push([
      f.p.clone().addScaledVector(f.U, yb),
      f.p.clone().addScaledVector(f.U, yb).addScaledVector(f.N, t),
      f.p.clone().addScaledVector(f.U, yt).addScaledVector(f.N, t),
      f.p.clone().addScaledVector(f.U, yt),
    ]);
  }
  const pos: number[] = [], nrm: number[] = [], idx: number[] = [];
  // side k joins corner k -> k+1; outward direction per side: bottom (-U), outer (+N), top (+U), inner (-N)
  const outDir = (f: Frame, k: number) => (k === 0 ? f.U.clone().negate() : k === 1 ? f.N.clone() : k === 2 ? f.U.clone() : f.N.clone().negate());
  for (let k = 0; k < 4; k++) {
    const base = pos.length / 3;
    for (let i = 0; i <= n; i++) {
      const a = rows[i][k], b = rows[i][(k + 1) % 4];
      const o = outDir(fr[i], k);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      nrm.push(o.x, o.y, o.z, o.x, o.y, o.z);
    }
    for (let i = 0; i < n; i++) {
      const a = base + i * 2, b = a + 1, c = a + 3, d = a + 2;
      // orientation test on the first quad
      const pa = rows[i][k], pb = rows[i][(k + 1) % 4], pd = rows[i + 1][k];
      const fn = pb.clone().sub(pa).cross(pd.clone().sub(pa));
      if (fn.dot(outDir(fr[i], k)) > 0) idx.push(a, b, c, a, c, d);
      else idx.push(a, c, b, a, d, c);
    }
  }
  // end caps
  for (const [i, sgnT] of [
    [0, -1],
    [n, 1],
  ] as [number, number][]) {
    const base = pos.length / 3;
    const o = fr[i].T.clone().multiplyScalar(sgnT);
    for (const q of rows[i]) {
      pos.push(q.x, q.y, q.z);
      nrm.push(o.x, o.y, o.z);
    }
    const r = rows[i];
    const fn = r[1].clone().sub(r[0]).cross(r[2].clone().sub(r[0]));
    if (fn.dot(o) > 0) idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    else idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------------------------------------
// Fastener
// ---------------------------------------------------------------------------------------------

/** Fastener data (m): plates 0.02 wide either side of the centre, frame height 0.052. */
export const US_FASTENER = { half: 0.0215, h: 0.052 };

/**
 * The male/female plate fastener on the two belt ends, facing +Z, centred on the belt centre line
 * (z = 0 = the belt's outer face plane). Female: an open stamped frame on the wearer's right (-X)
 * with the right belt end folded round its outer bar; male: a plate on the left (+X) with a T-tongue
 * that lies over the female's inner bar and hooks into its opening. Returns metal and web parts.
 */
export function fastenerParts(shade: WebShade = 'od7'): THREE.Object3D[] {
  const H = US_FASTENER.h, t = 0.0016, hw = US_FASTENER.half;
  const metal: THREE.BufferGeometry[] = [];
  // female frame (-X): outer bar at x = -hw, opening between the bars
  const fem = barBuckle(0.02, H, 0.0036, t, false);
  fem.translate(-hw + 0.01, 0, -0.0006);
  metal.push(fem);
  // male plate (+X) with a pressed rim
  const plate = G.rbox(0.019, H - 0.002, t, 0.0006, 1);
  plate.translate(hw - 0.0095, 0, t / 2 - 0.0006);
  metal.push(plate);
  const rim = G.rbox(0.0145, H - 0.0105, 0.0008, 0.0004, 1);
  rim.translate(hw - 0.0105, 0, t - 0.0006 + 0.0004);
  metal.push(rim);
  // tongue: from the male plate over the gap and the female inner bar, tip turned down into the opening
  const tongue = G.extrude(
    [
      [0.006, -0.011],
      [-0.0035, -0.011],
      [-0.0045, -0.0145],
      [-0.0115, -0.0145],
      [-0.0115, 0.0145],
      [-0.0045, 0.0145],
      [-0.0035, 0.011],
      [0.006, 0.011],
    ],
    0.0014,
    0.0004,
  );
  tongue.translate(0, 0, t + 0.0001);
  metal.push(tongue);
  const tip = G.rbox(0.0016, 0.028, 0.0034, 0.0005, 1);
  tip.translate(-0.0112, 0, t * 0.5);
  metal.push(tip);
  // rivets holding the tongue on the male plate
  for (const y of [-0.006, 0.006]) {
    const r = G.cyl(0.0014, 0.0016, 0.0009, 10);
    r.rotateX(Math.PI / 2);
    r.translate(0.003, y, t + 0.0016 + 0.00045);
    metal.push(r);
  }
  // the belt ends folded round the plates' outer bars (web rolls + doubled ends, stitched)
  const web: THREE.BufferGeometry[] = [], thr: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    const roll = G.cyl(0.0029, 0.0029, H + 0.004, 12);
    roll.translate(sx * (hw + 0.0012), 0, -0.0012);
    web.push(roll);
    const tab = G.rbox(0.02, H + 0.004, 0.0024, 0.0008, 1);
    tab.translate(sx * (hw + 0.011), 0, 0.0013);
    web.push(tab);
    thr.push(boxX(new THREE.Vector3(sx * (hw + 0.012), 0, 0.0026), 0.013, H - 0.008, new THREE.Vector3(0, 0, 1)));
  }
  return [part(merge(metal), US.fastenerMetal(), { name: 'fastener' }), part(merge(web), US.web(shade)), part(merge(thr), US.thread())];
}

// ---------------------------------------------------------------------------------------------
// Generic belt
// ---------------------------------------------------------------------------------------------

interface BeltSpec {
  /** Band top / bottom as functions of d (distance from the front centre, 0..L/2). */
  top: (d: number, L: number) => number;
  bot: (d: number, L: number) => number;
  pockets?: { build: (i: number) => GearPiece; d: number[] };
  /** Bottom eyelets (d, y) on the +X side, mirrored to the -X side. */
  eyelets: [number, number][];
  /** Top eyelets (name suffix, d, y), mirrored. */
  topEyelets: [string, number, number][];
  /** Named hanger slots (name suffix, d at the pair midpoint, y), mirrored ('L'/'R' prefix). */
  slots: [string, number, number][];
  /** Rear centre eyelets: (name, y) - single eyelets at the back centre, and slots at the back centre. */
  rearTop?: number;
  /** Adjusting buckles: distance from the back centre. */
  buckleAt: number;
  panelStitch?: [number, number, number];
}

function buildBelt(o: BeltPathOptions, spec: BeltSpec, name: string): BeltRig {
  const shade = o.shade ?? 'od7';
  const curve = beltCurve(o.path, o.normals, o.inset ?? 0);
  const L = curve.L;
  const t = US_BELT.t;
  const dOf = (s: number) => {
    const u = ((s % L) + L) % L;
    return Math.min(u, L - u);
  };
  const parts: THREE.Object3D[] = [];
  const g0 = US_FASTENER.half + 0.0012;
  // web band: from the left fastener bar round the back to the right one
  parts.push(part(bandGeometry(curve, g0, L - g0, (s) => spec.top(dOf(s), L), (s) => spec.bot(dOf(s), L), t), US.web(shade), { name: 'belt' }));
  // fastener at the front centre
  const fm = frameMatrix(curve, 0, 0, t);
  for (const p of fastenerParts(shade)) {
    p.applyMatrix4(fm);
    parts.push(p);
  }
  // adjusting buckles and the doubled strap end at the back
  const metal: THREE.BufferGeometry[] = [];
  const web: THREE.BufferGeometry[] = [];
  const thr: THREE.BufferGeometry[] = [];
  for (const sd of [-1, 1]) {
    const d = L / 2 - spec.buckleAt;
    const s = curve.sOf(sd * d);
    const h = US_BELT.strapH;
    metal.push(placeRigid(barBuckle(h + 0.006, 0.017, 0.003, 0.0016, true).rotateZ(Math.PI / 2), curve, s, 0, t + 0.0022));
    // doubled strap end from the buckle towards the back centre
    const q: THREE.Vector3[] = [], qn: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) {
      const f = curve.frame(curve.sOf(sd * (d + 0.004 + i * 0.0045)));
      q.push(f.p.clone().addScaledVector(f.N, t * 1.5 + 0.0004));
      qn.push(f.N);
    }
    web.push(sheet(q, qn, h / 2 - 0.004, t * 0.8, { across: 2, samples: 16 }));
    // stitched keeper next to the buckle
    const fk = curve.frame(curve.sOf(sd * (d - 0.012)));
    thr.push(boxX(fk.p.clone().addScaledVector(fk.N, t + 0.0002), 0.012, h - 0.012, fk.N, fk.U));
  }
  parts.push(part(merge(metal), US.blackMetal()), part(merge(web), US.web(shade)));
  // stitch rows along the panel top edge
  if (spec.panelStitch) {
    const [d0, d1, y] = spec.panelStitch;
    for (const sd of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 60; i++) {
        const f = curve.frame(curve.sOf(sd * (d0 + ((d1 - d0) * i) / 60)));
        pts.push(f.p.clone().addScaledVector(f.N, t + 0.0002).addScaledVector(f.U, y));
      }
      thr.push(stitches(pts, { len: 0.0042, gap: 0.0026, r: 0.00045 }));
    }
  }
  parts.push(part(merge(thr), US.thread()));
  // eyelets
  const rings: THREE.BufferGeometry[] = [], holes: THREE.BufferGeometry[] = [];
  const eyelet = (s: number, y: number, ro = 0.0038, ri = 0.0019) => {
    const { ring, hole } = grommet(ro, ri, 0.001, 8);
    const m = frameMatrix(curve, s, y, t);
    rings.push(ring.applyMatrix4(m));
    holes.push(hole.applyMatrix4(m));
  };
  for (const [d, y] of spec.eyelets) for (const sd of [-1, 1]) eyelet(curve.sOf(sd * d), y);
  const top: Record<string, THREE.Matrix4> = {};
  for (const [nm, d, y] of spec.topEyelets)
    for (const sd of [-1, 1]) {
      const s = curve.sOf(sd * d);
      eyelet(s, y, 0.0033, 0.0016);
      top[(sd > 0 ? 'L' : 'R') + nm] = frameMatrix(curve, s, y, t);
    }
  if (spec.rearTop !== undefined) {
    const s = curve.sOf(L / 2);
    eyelet(s, spec.rearTop, 0.0033, 0.0016);
    top.rear = frameMatrix(curve, s, spec.rearTop, t);
  }
  parts.push(part(merge(rings), US.fastenerMetal()), part(merge(holes), US.eyeletHole()));
  // hanger slots: midpoint of the eyelet pair, X along the chord
  const slots: Record<string, THREE.Matrix4> = {};
  const hs = US_BELT.hookSpacing / 2;
  for (const [nm, d, y] of spec.slots)
    for (const sd of [-1, 1]) {
      const sa = curve.sOf(sd * d - hs), sb = curve.sOf(sd * d + hs);
      const pa = new THREE.Vector3().setFromMatrixPosition(frameMatrix(curve, sa, y, t));
      const pb = new THREE.Vector3().setFromMatrixPosition(frameMatrix(curve, sb, y, t));
      const f = curve.frame(curve.sOf(sd * d));
      const X = pb.clone().sub(pa).normalize();
      if (X.dot(f.X) < 0) X.negate();
      const Y = f.U.clone().addScaledVector(X, -f.U.dot(X)).normalize();
      const Z = X.clone().cross(Y).normalize();
      slots[(sd > 0 ? 'L' : 'R') + nm] = new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(pa.clone().add(pb).multiplyScalar(0.5));
    }
  // pockets
  if (spec.pockets && o.pockets !== false) {
    spec.pockets.d.forEach((d, i) => {
      for (const sd of [1, -1]) {
        const pk = spec.pockets!.build(i * 2 + (sd > 0 ? 0 : 1)).object;
        wrapModule(pk, curve, curve.sOf(sd * d), t, parts);
      }
    });
  }
  const object = group(parts);
  object.name = name;
  return {
    object,
    length: L,
    slots,
    top,
    frameAt: (d, y = 0) => frameMatrix(curve, curve.sOf(d), y, t),
    frameAtAngle: (deg, y = 0) => frameMatrix(curve, curve.sAtAngle(deg), y, t),
    loopMount: (d) => frameMatrix(curve, curve.sOf(d), 0, -US_BELT.loopT),
  };
}

/** Smooth band edge: a (near) -> b (far) between d0 and d1. */
const ramp = (d: number, d0: number, d1: number, a: number, b: number) => a + (b - a) * THREE.MathUtils.smoothstep(d, d0, d1);

// ---------------------------------------------------------------------------------------------
// M1923 cartridge belt
// ---------------------------------------------------------------------------------------------

export const M1923_BELT = { panelTop: 0.058, panelBot: -0.05, start: 0.037, eyeY: -0.0438, topEyeY: 0.0522 };

/** M1923 cartridge belt along a waist path (see file header). */
export function buildM1923BeltAlong(o: BeltPathOptions): BeltRig {
  const B = M1923_BELT, P = POCKET_M1923;
  const h = US_BELT.strapH / 2;
  const fH = US_FASTENER.h / 2 + 0.002;
  const n = 5;
  const pitch = P.pitch;
  const panelEnd = B.start + n * pitch + 0.004;
  const pocketD = Array.from({ length: n }, (_, i) => B.start + pitch * (i + 0.5));
  const eyelets: [number, number][] = [];
  const slots: [string, number, number][] = [];
  pocketD.forEach((d, i) => {
    eyelets.push([d - 0.025, B.eyeY], [d + 0.025, B.eyeY]);
    slots.push([String(i + 1), d, B.eyeY]);
  });
  const topEyelets: [string, number, number][] = [];
  for (let i = 1; i < n; i++) topEyelets.push([String(i), B.start + pitch * i, B.topEyeY]);
  let k = 0;
  const rig = buildBelt(
    o,
    {
      top: (d) => (d < B.start ? ramp(d, 0.0235, B.start - 0.001, fH, B.panelTop) : ramp(d, panelEnd, panelEnd + 0.03, B.panelTop, h)),
      bot: (d) => (d < B.start ? ramp(d, 0.0235, B.start - 0.001, -fH, B.panelBot) : ramp(d, panelEnd, panelEnd + 0.03, B.panelBot, -h)),
      pockets: { build: () => buildM1923Pocket({ shade: o.shade ?? 'od7', seed: 5 + (k++ % 7) }), d: pocketD },
      eyelets,
      topEyelets,
      slots,
      rearTop: h - 0.0062,
      buckleAt: 0.034,
      panelStitch: [B.start, panelEnd, B.panelTop - 0.0024],
    },
    'us-m1923-cartridge-belt',
  );
  return rig;
}

// ---------------------------------------------------------------------------------------------
// M1937 BAR belt
// ---------------------------------------------------------------------------------------------

export const M1937_BELT = { panelTop: 0.048, panelBot: -0.04, start: 0.035, topEyeY: 0.0437 };

/** M1937 BAR magazine belt along a waist path (see file header). */
export function buildM1937BarBeltAlong(o: BeltPathOptions): BeltRig {
  const B = M1937_BELT, P = POCKET_M1937;
  const h = US_BELT.strapH / 2;
  const fH = US_FASTENER.h / 2 + 0.002;
  const n = 3;
  const pitch = P.pitch;
  const panelEnd = B.start + n * pitch + 0.004;
  const pocketD = Array.from({ length: n }, (_, i) => B.start + pitch * (i + 0.5));
  const eyeY = -h + 0.0058;
  // hanger slots on the narrow section behind the pockets; the belt is long enough for two
  const dR = panelEnd + 0.06;
  const eyelets: [number, number][] = [
    [dR - 0.025, eyeY],
    [dR + 0.025, eyeY],
  ];
  const slots: [string, number, number][] = [['', dR, eyeY]];
  const topEyelets: [string, number, number][] = [];
  for (let i = 1; i < n; i++) topEyelets.push([String(i), B.start + pitch * i, B.topEyeY]);
  topEyelets.push([String(n), panelEnd + 0.012, h - 0.006]);
  let k = 0;
  const rig = buildBelt(
    o,
    {
      top: (d) => (d < B.start ? ramp(d, 0.0235, B.start - 0.001, fH, B.panelTop) : ramp(d, panelEnd, panelEnd + 0.03, B.panelTop, h)),
      bot: (d) => (d < B.start ? ramp(d, 0.0235, B.start - 0.001, -fH, B.panelBot) : ramp(d, panelEnd, panelEnd + 0.03, B.panelBot, -h)),
      pockets: { build: () => buildM1937BarPocket({ shade: o.shade ?? 'od7', seed: 9 + (k++ % 5) }), d: pocketD },
      eyelets,
      topEyelets,
      slots,
      rearTop: h - 0.0062,
      buckleAt: 0.034,
      panelStitch: [B.start, panelEnd, B.panelTop - 0.0024],
    },
    'us-m1937-bar-belt',
  );
  // slot names: 'L' / 'R' -> 'rear-L' / 'rear-R'
  for (const s of ['L', 'R']) {
    rig.slots[`rear-${s}`] = rig.slots[s];
    delete rig.slots[s];
  }
  return rig;
}

// ---------------------------------------------------------------------------------------------
// M1936 pistol belt
// ---------------------------------------------------------------------------------------------

/** M1936 pistol belt along a waist path: 57 mm web, eyelets every 0.025 m along both edges. */
export function buildM1936PistolBeltAlong(o: BeltPathOptions): BeltRig {
  const h = US_BELT.strapH / 2;
  const fH = US_FASTENER.h / 2 + 0.002;
  const curveL = beltCurve(o.path, o.normals, o.inset ?? 0).L;
  const eyelets: [number, number][] = [];
  const topEyelets: [string, number, number][] = [];
  const slots: [string, number, number][] = [];
  const dMax = curveL / 2 - 0.07;
  let i = 0;
  for (let d = 0.045; d < dMax; d += 0.025, i++) {
    eyelets.push([d, -h + 0.0058]);
    topEyelets.push([String(i + 1), d, h - 0.0058]);
    if (d + 0.05 < dMax) slots.push([String(i + 1), d + 0.025, -h + 0.0058]);
  }
  return buildBelt(
    o,
    {
      top: (d) => ramp(d, 0.02, 0.03, fH, h),
      bot: (d) => ramp(d, 0.02, 0.03, -fH, -h),
      eyelets,
      topEyelets,
      slots,
      buckleAt: 0.034,
    },
    'us-m1936-pistol-belt',
  );
}

/** Default waist loop for review: ellipse 0.165 x 0.125 m at y = 0, starting at the front (+Z), going round +X first. */
export function defaultWaistPath(a = 0.165, b = 0.125, n = 96): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * Math.PI * 2;
    pts.push(new THREE.Vector3(a * Math.sin(th), 0, b * Math.cos(th)));
  }
  return pts;
}

function ringPiece(rig: BeltRig, id: string, name: string, h: number): GearPiece & { rig: BeltRig } {
  const b = new THREE.Box3().setFromObject(rig.object, true);
  const sz = b.getSize(new THREE.Vector3());
  return { id, name, object: rig.object, mount: 'hip', size: { w: sz.x, h, d: sz.z }, rig };
}

/** Review wrappers: the belts on the default waist loop (origin = loop centre at belt mid-height). */
export function buildM1923Belt(o: { shade?: WebShade } = {}) {
  return ringPiece(buildM1923BeltAlong({ path: defaultWaistPath(), shade: o.shade }), 'us-m1923-cartridge-belt', 'M1923 cartridge belt', 0.108);
}
export function buildM1937BarBelt(o: { shade?: WebShade } = {}) {
  return ringPiece(buildM1937BarBeltAlong({ path: defaultWaistPath(), shade: o.shade }), 'us-m1937-bar-belt', 'M1937 BAR magazine belt', 0.15);
}
export function buildM1936PistolBelt(o: { shade?: WebShade } = {}) {
  return ringPiece(buildM1936PistolBeltAlong({ path: defaultWaistPath(), shade: o.shade }), 'us-m1936-pistol-belt', 'M1936 pistol belt', US_BELT.strapH);
}
