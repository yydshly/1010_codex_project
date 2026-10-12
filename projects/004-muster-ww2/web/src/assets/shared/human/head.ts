/**
 * Head & neck: a restrained, believable adult male face (collector-figure style).
 *
 * HEAD-LOCAL FRAME: origin at the midpoint between the ear canals (porion), the Frankfurt
 * horizontal is the local XZ plane, +Z forward (face), +Y up, +X = the man's left.
 * Landmarks (m, mid-sagittal unless noted):
 *   vertex (skull) y 0.128 (+4 mm hair)      glabella (0, 0.037, 0.095)     nasion (0, 0.026, 0.089)
 *   eyes (+-0.032, 0.0155, 0.071), r 12 mm    nose tip (0, -0.021, 0.118)    subnasale (0, -0.035, 0.1)
 *   stomion (0, -0.0552, 0.1)                 mouth corners x +-0.025        pogonion (0, -0.088, 0.097)
 *   menton y -0.104                           head breadth 0.152 (+hair 0.156), length 0.197 (+hair 0.2)
 *   bizygomatic 0.142, bigonial 0.112, ears x +-0.07 (top y 0.03, lobe y -0.035)
 *
 * CONSTRUCTION. One mirror-symmetric SDF (evaluated at |x|, so the face is exactly symmetric):
 * large, smoothly blended masses (cranium, forehead, midface, dental arch, jaw, chin, neck) give
 * a clean base form; features are soft primitives with moderate blends (brow ridge, cheekbones,
 * nose with alae and nostrils, lips meeting in a soft crease, lids over the eyeballs, ears with
 * helix/antihelix/concha/lobe) and a few smooth displacements (philtrum, mentolabial sulcus, lid
 * crease). No feature is narrower than ~2 mesh cells, so the mesh has no broken edges. Short
 * military haircut: a thin raised hair shell (4 mm on top, 1 mm on the clipped sides) that fades
 * out over the hairline, plus a soft colour transition. Meshed at 2.4 mm, decimated to 18k tris,
 * cached. Skin tone variation (hair, brows, lids, lips, beard shadow) is painted with vertex
 * colours that MULTIPLY the skin material (use a material with vertexColors: true).
 */
import * as THREE from 'three';
import { meshSDF } from './mesh';
import { simplify } from './simplify';
import { clamp, sstep, smin, smax, pchip, type SDF } from './sdfx';

/** The head mesh's neck ends this far below the porion (hidden inside the collar). */
export const HEAD_NECK_CUT = 0.18;

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const D2R = Math.PI / 180;

/** Eye centres (head-local, left eye at +x) and eyeball radius. */
export const EYE = { x: 0.032, y: 0.0155, z: 0.07, r: 0.012 };

/** Head landmarks for fitting headgear (head-local). */
export const HEAD_DIMS = {
  /** Top of the hair (m above the porion). */
  crownY: 0.132,
  crownZ: -0.008,
  /** Breadth and length including the hair (m). */
  width: 0.156,
  length: 0.2,
  /** Brow ridge / glabella. */
  glabella: [0, 0.037, 0.095] as [number, number, number],
  /** Back of the head (opisthocranion). */
  occiput: [0, 0.035, -0.105] as [number, number, number],
  /** Centre of the head in plan (z) at the hat-band level. */
  centreZ: -0.006,
  /** Liner-band plane for headgear: centre (y, z), forward tilt (deg, + = front higher), circumference (m). */
  band: { y: 0.058, z: -0.006, tilt: 8, circumference: 0.575 },
};

// ------------------------------------------------------------------ fast local primitives

/** Ellipsoid distance (gradient-normalised approximation). */
function ell(px: number, py: number, pz: number, a: number, b: number, c: number): number {
  const ia = 1 / a, ib = 1 / b, ic = 1 / c;
  const x = px * ia, y = py * ib, z = pz * ic;
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt(x * x * ia * ia + y * y * ib * ib + z * z * ic * ic);
  const m = a < b ? (a < c ? a : c) : b < c ? b : c;
  if (k1 < 1e-12) return -m;
  // inside, the approximation over-estimates the depth (up to -max radius near the centre of a thin
  // ellipsoid), which would let the mesher skip blocks that contain surface: clamp to the true bound
  const d = (k0 * (k0 - 1)) / k1;
  return d < -m ? -m : d;
}

/** Exact round cone between a and b with radii ra, rb (a,b as tuples). */
function rcone(px: number, py: number, pz: number, a: number[], b: number[], ra: number, rb: number): number {
  const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
  const yv = pax * bax + pay * bay + paz * baz, z_ = yv - l2;
  const qx = pax * l2 - bax * yv, qy = pay * l2 - bay * yv, qz = paz * l2 - baz * yv;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = yv * yv * l2, z2 = z_ * z_ * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z_) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
  if (Math.sign(yv) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
  return (Math.sqrt(x2 * a2 * il2) + yv * rr) * il2 - ra;
}

const gauss = (t: number) => Math.exp(-t * t);

/** Rotation helper: returns a function mapping a local offset (u,v,w) basis. */
interface Basis { u: THREE.Vector3; v: THREE.Vector3; w: THREE.Vector3 }

// ------------------------------------------------------------------ ears

/**
 * Ear frame (left ear, x > 0): origin on the head surface just behind the tragus, u = up along
 * the ear (tilted back 14 deg), v = backwards along the ear, w = the ear's lateral normal
 * (outwards and a little forwards: the back edge of the ear stands off the head).
 */
const EAR = (() => {
  const o = V(0.069, 0.001, -0.014);
  const flare = 24 * D2R, tilt = 14 * D2R;
  const w = V(Math.cos(flare), 0, Math.sin(flare));
  const u = V(0, Math.cos(tilt), -Math.sin(tilt));
  u.addScaledVector(w, -u.dot(w)).normalize();
  const v = new THREE.Vector3().crossVectors(w, u).normalize(); // points backwards
  if (v.z > 0) v.negate();
  return { o, basis: { u, v, w } as Basis };
})();

function earSDF(x: number, y: number, z: number): number {
  const { o, basis } = EAR;
  const dx = x - o.x, dy = y - o.y, dz = z - o.z;
  const u = dx * basis.u.x + dy * basis.u.y + dz * basis.u.z;
  const v = dx * basis.v.x + dy * basis.v.y + dz * basis.v.z;
  const w = dx * basis.w.x + dy * basis.w.y + dz * basis.w.z;
  // pinna disc: the front edge (v < 0) sits on the head, the helix curls at the back/top edge
  const cu = 0.004, cv = 0.0125, cw = 0.0035;
  let d = ell(u - cu, v - cv, w - cw, 0.0305, 0.0175, 0.0058);
  // lobe: soft, fleshy, a little thicker
  d = smin(d, ell(u + 0.0215, v - 0.0085, w - 0.0038, 0.0088, 0.0092, 0.0052), 0.004);
  // scapha / fossa: shallow dish inside the helix rim on the lateral face
  const dish = ell(u - 0.008, v - 0.0135, w - 0.0092, 0.0215, 0.0118, 0.0052);
  d = smax(d, -dish, 0.0022);
  // concha: the deeper bowl in front of the antihelix, opening towards the ear canal
  const concha = ell(u + 0.004, v - 0.0065, w - 0.0072, 0.0115, 0.0082, 0.0062);
  d = smax(d, -concha, 0.0026);
  // helix rim thickening (rolled edge) along the back and top
  const rimR = Math.sqrt(((u - cu) / 0.0292) ** 2 + ((v - cv) / 0.0166) ** 2);
  const rim = gauss((rimR - 0.93) / 0.07) * sstep(-0.006, 0.004, u - cu + 0.35 * (v - cv)) * 0.0011;
  d -= rim;
  // tragus: small flap in front of the concha
  d = smin(d, ell(u + 0.004, v + 0.0004, w - 0.006, 0.0045, 0.0034, 0.0028), 0.0022);
  return d;
}

// ------------------------------------------------------------------ eyes & lids

/** Almond aperture (2D, in the eye's front plane): negative inside the opening. */
function aperture(u: number, v: number): number {
  // u: medial(-) .. lateral(+), v: up. The outer corner sits a little higher.
  const hw = 0.0132;
  const t = clamp(u / hw, -1, 1);
  const tilt = 0.0014 * t;
  const open = Math.pow(Math.max(0, 1 - t * t), 0.72);
  const up = 0.0031 * open + tilt + 0.0001;
  const lo = -0.0039 * open * (1 - 0.18 * t) + tilt * 0.6 - 0.0004;
  return Math.max(v - up, lo - v, Math.abs(u) - hw);
}

// ------------------------------------------------------------------ hairline

/** Hairline height as a function of the plan angle from the front (deg, 0 = front, 90 = side). */
const hairlineY = pchip(
  [0, 16, 28, 38, 46, 56, 64, 72, 84, 98, 112, 130, 155, 180],
  [0.094, 0.092, 0.087, 0.079, 0.068, 0.044, 0.02, 0.022, 0.032, 0.031, 0.012, -0.018, -0.038, -0.044],
);

/** 0..1 hair coverage and 0..1 "top" (longer hair) weight at a head-local point. */
function hairAt(x: number, y: number, z: number): { hair: number; top: number } {
  const ax = Math.abs(x);
  const phi = Math.atan2(ax, z + 0.012) / D2R; // 0 front .. 180 back
  const yl = hairlineY(phi);
  let hair = sstep(yl - 0.0035, yl + 0.0065, y);
  // keep the ear itself bare
  const eu = y - 0.0, ez = z + 0.018;
  if (ax > 0.064) hair *= sstep(0.029, 0.036, Math.sqrt(eu * eu * 0.8 + ez * ez));
  const top = sstep(0.045, 0.1, y) * (1 - 0.3 * sstep(0.05, 0.072, ax));
  return { hair, top };
}

/** Hair shell thickness (m): 4 mm on top, 1 mm clipped sides/back, fading over the hairline. */
function hairThickness(x: number, y: number, z: number): number {
  const h = hairAt(x, y, z);
  return h.hair * (0.0011 + 0.0031 * h.top);
}

// ------------------------------------------------------------------ the head field

/** Head & neck SDF in head-local space (mirror symmetric). */
export function headSDF(): SDF {
  const E = EYE;
  const eyeC = [E.x, E.y, E.z];
  const lidR = E.r + 0.0025;
  return (xx, y, z) => {
    const x = xx < 0 ? -xx : xx;
    // ---- cranium (back) + forehead
    let d = ell(x, y - 0.03, z + 0.012, 0.0755, 0.098, 0.095);
    d = smin(d, ell(x, y - 0.058, z - 0.047, 0.052, 0.05, 0.047), 0.026);
    // ---- neck (slightly wider than deep), sternomastoids, larynx
    {
      const nk = rcone(x / 1.04, y, z, [0, -0.04, -0.014], [0, -0.21, -0.009], 0.0505, 0.0565) * 0.98;
      d = smin(d, nk, 0.034);
      if (y < 0.012) {
        const scm = rcone(x, y, z, [0.049, -0.03, -0.03], [0.016, -0.19, 0.036], 0.0105, 0.008);
        d = smin(d, scm, 0.016);
        const lar = ell(x, y + 0.127, z - 0.036, 0.008, 0.012, 0.008);
        d = smin(d, lar, 0.012);
      }
    }
    // ---- midface, dental arch, jaw, chin
    if (z > -0.07) {
      d = smin(d, ell(x, y + 0.014, z - 0.042, 0.0585, 0.054, 0.05), 0.026);
      d = smin(d, ell(x, y + 0.05, z - 0.071, 0.031, 0.026, 0.0225), 0.018);
      // jaw mass + mandible (ramus -> gonion -> body): a defined but soft jaw line
      d = smin(d, ell(x, y + 0.066, z - 0.038, 0.049, 0.035, 0.049), 0.028);
      const ramus = rcone(x, y, z, [0.051, -0.022, -0.006], [0.0515, -0.0715, 0.002], 0.0092, 0.0098);
      const body = rcone(x, y, z, [0.0515, -0.0715, 0.002], [0.018, -0.0955, 0.07], 0.0098, 0.0098);
      d = smin(d, Math.min(ramus, body), 0.022);
      // chin boss
      d = smin(d, ell(x, y + 0.087, z - 0.0785, 0.0195, 0.0162, 0.0165), 0.014);
      // cheekbones: malar eminence + a soft zygomatic arch back to the ear
      if (x > 0.01) {
        d = smin(d, ell(x - 0.045, y - 0.0, z - 0.0615, 0.0145, 0.0105, 0.0128), 0.018);
        d = smin(d, rcone(x, y, z, [0.052, 0.003, 0.05], [0.062, 0.005, 0.012], 0.0048, 0.0044), 0.02);
      }
      // soft nasolabial fullness
      d = smin(d, ell(x - 0.034, y + 0.033, z - 0.0715, 0.0145, 0.019, 0.0095), 0.018);
    }
    // ---- brow ridge (medial bar, lateral part sweeping back)
    if (z > 0.035 && y > 0.0 && y < 0.075) {
      const yb = 0.0362 - 2.2 * x * x - (x > 0.03 ? 0.25 * (x - 0.03) : 0);
      const lat = gauss(x / 0.05) * (0.5 + 0.5 * gauss((x - 0.025) / 0.0125));
      const w = gauss((y - yb) / 0.0078) * lat * sstep(0.04, 0.07, z);
      if (w > 1e-4) d -= 0.0052 * w;
    }
    // ---- eye sockets, lids
    if (x > 0.003 && x < 0.066 && y > -0.016 && y < 0.05 && z > 0.045) {
      const sock = ell(x - 0.0325, y - 0.0162, z - 0.0868, 0.0192, 0.0128, 0.0152);
      d = smax(d, -sock, 0.0085);
      const ex = x - eyeC[0], ey = y - eyeC[1], ez = z - eyeC[2];
      const ball = Math.sqrt(ex * ex + ey * ey + ez * ez) - lidR;
      if (ball < 0.012) {
        const ap = aperture(ex, ey);
        let lid = smax(ball, -ap, 0.001);
        lid = smax(lid, -(ez + 0.002), 0.002);
        d = smin(d, lid, 0.0024);
      }
      // upper lid crease (soft groove)
      const cr = gauss((y - (eyeC[1] + 0.0084 - 14 * (x - eyeC[0]) ** 2)) / 0.0017) * gauss((x - eyeC[0] - 0.001) / 0.0125);
      if (z > 0.07) d += 0.0006 * cr;
    }
    // ---- nose
    if (x < 0.034 && y > -0.05 && y < 0.052 && z > 0.066) {
      let n = rcone(x, y, z, [0, 0.033, 0.0858], [0, -0.008, 0.1056], 0.0053, 0.0067);
      n = smin(n, ell(x, y + 0.0205, z - 0.1082, 0.0084, 0.0083, 0.0092), 0.0058);
      n = smin(n, ell(x, y + 0.013, z - 0.0935, 0.0116, 0.0185, 0.0114), 0.006);
      n = smin(n, rcone(x, y, z, [0, -0.025, 0.1082], [0, -0.0342, 0.0996], 0.0043, 0.0039), 0.004);
      // alae, smoothly joined to the tip
      n = smin(n, ell(x - 0.0104, y + 0.0276, z - 0.0942, 0.0058, 0.0058, 0.0078), 0.0065);
      // nose-to-face blend: soft along the bridge, a crisper alar crease at the base
      const kn = 0.0042 + 0.0048 * sstep(-0.024, -0.008, y);
      d = smin(d, n, kn);
      // nostrils (shallow, on the underside)
      const nos = ell(x - 0.0063, y + 0.0326, z - 0.1018, 0.0034, 0.002, 0.005);
      d = smax(d, -nos, 0.0017);
    }
    // ---- mouth
    if (x < 0.046 && y > -0.1 && y < -0.026 && z > 0.066) {
      const x2 = x * x;
      // upper lip: thinner, cupid's bow on the upper border, corners lower; follows the dental arch
      const ryU = 0.0041 + 0.0006 * gauss((x - 0.0055) / 0.0035);
      const up = ell(x, y + 0.0495 + 5 * x2 - (ryU - 0.0041), z - 0.0958 + 22 * x2, 0.0252, ryU, 0.0048);
      // lower lip: fuller, corners rising
      const lo = ell(x, y + 0.0612 - 6 * x2, z - 0.0938 + 22 * x2, 0.0222, 0.0052, 0.0058);
      // (the bend warps distances: divide by the warp's gradient so the field stays Lipschitz)
      const lips = smin(up, lo, 0.0014) / Math.sqrt(1 + 1936 * x2);
      d = smin(d, lips, 0.0058);
      // philtrum groove, mouth-corner dimples, mentolabial sulcus
      d += 0.0008 * gauss(x / 0.0034) * sstep(-0.0475, -0.0435, y) * sstep(-0.033, -0.037, y);
      d += 0.0006 * gauss(Math.sqrt((x - 0.0262) ** 2 + (y + 0.0556) ** 2 + (z - 0.0885) ** 2) / 0.0045);
      d += 0.0013 * gauss((y + 0.0735) / 0.0042) * gauss(x / 0.017) * sstep(0.08, 0.09, z);
    }
    // ---- ears
    if (x > 0.055 && y > -0.05 && y < 0.05 && z < 0.02 && z > -0.06) {
      d = smin(d, earSDF(x, y, z), 0.0038);
    }
    // ---- short hair shell
    if (y > -0.06) {
      const ad = d < 0 ? -d : d;
      if (ad < 0.018) d -= hairThickness(x, y, z) * (1 - sstep(0.008, 0.018, ad));
    }
    // ---- neck cut (inside the collar)
    return smax(d, -(y + HEAD_NECK_CUT), 0.004);
  };
}

// ------------------------------------------------------------------ vertex colours

const SKIN_REF = new THREE.Color(0xc9967a); // the M.skin default; kept for the skinFactor export
function factor(hex: number): THREE.Color {
  const c = new THREE.Color(hex);
  return new THREE.Color(c.r / SKIN_REF.r, c.g / SKIN_REF.g, c.b / SKIN_REF.b);
}

/** Cheap deterministic per-point hash in [0, 1) (fine mottling of hair / brows). */
function hash3(x: number, y: number, z: number): number {
  const h = Math.sin(x * 12989.8 + y * 78233.1 + z * 37719.3) * 43758.5453;
  return h - Math.floor(h);
}

/** Paint vertex colours (multipliers of the skin albedo) onto the head mesh. */
function paintHead(g: THREE.BufferGeometry, skinHex: number, hairHex: number) {
  const skin = new THREE.Color(skinHex);
  const hair = new THREE.Color(hairHex);
  const rel = (c: THREE.Color) => new THREE.Color(c.r / skin.r, c.g / skin.g, c.b / skin.b);
  const hairF = rel(hair);
  const cropF = rel(skin.clone().multiplyScalar(0.92).lerp(hair, 0.5));
  const stubbleF = rel(skin.clone().lerp(new THREE.Color(0x6f6966), 0.2));
  const lipF = rel(skin.clone().lerp(new THREE.Color(0xa0645a), 0.4).multiplyScalar(0.95));
  const lipLineF = rel(skin.clone().lerp(new THREE.Color(0x5a3a32), 0.55));
  const warmF = rel(skin.clone().lerp(new THREE.Color(0xc98474), 0.3));
  const browF = rel(hair.clone().multiplyScalar(0.9).lerp(skin, 0.1));
  const lashF = rel(hair.clone().multiplyScalar(0.8));
  const lidF = rel(skin.clone().multiplyScalar(0.9).lerp(new THREE.Color(0x9a6f63), 0.15));
  const darkF = rel(skin.clone().multiplyScalar(0.45));
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const E = EYE;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ax = Math.abs(x);
    c.setRGB(1, 1, 1);
    // warmth: cheeks, nose, ears
    const cheek = gauss((ax - 0.043) / 0.018) * gauss((y + 0.018) / 0.018) * sstep(0.05, 0.07, z);
    const nose = gauss(x / 0.012) * gauss((y + 0.016) / 0.014) * sstep(0.1, 0.112, z);
    const ear = ax > 0.068 && z < 0.01 && z > -0.045 && y > -0.045 && y < 0.04 ? 1 : 0;
    c.lerp(warmF, clamp(cheek * 0.55 + nose * 0.5 + ear * 0.45, 0, 1));
    // beard shadow: lower cheeks, jaw, chin, upper lip, under the jaw
    const jawZone = sstep(-0.018, -0.042, y) * sstep(-0.01, 0.012, z) * (y > -0.125 ? 1 : sstep(-0.15, -0.125, y));
    const upperLip = gauss(x / 0.02) * gauss((y + 0.041) / 0.0055) * sstep(0.092, 0.1, z);
    const notLips = 1 - gauss(x / 0.022) * gauss((y + 0.055) / 0.0105) * sstep(0.088, 0.094, z);
    const cheekCut = ax > 0.03 ? sstep(-0.012, -0.04, y + 0.25 * (ax - 0.03)) : 1;
    const beard = clamp((jawZone * cheekCut + upperLip * 0.8) * notLips * (ax < 0.062 ? 1 : 0.4), 0, 1);
    c.lerp(stubbleF, beard * 0.85);
    // lips + the line between them
    const lip = gauss(x / 0.02) * gauss((y + 0.0555) / 0.0095) * sstep(0.09, 0.096, z);
    c.lerp(lipF, clamp(lip * 1.15, 0, 1));
    const line = gauss(x / 0.021) * gauss((y + 0.05485 - 0.5 * x * x) / 0.0011) * sstep(0.093, 0.097, z);
    c.lerp(lipLineF, clamp(line * 1.1, 0, 1));
    // lids / sockets slightly darker, lash line on the upper lid margin
    const lx = ax - E.x, ly = y - E.y;
    const lid = gauss(lx / 0.016) * gauss((ly - 0.002) / 0.011) * sstep(0.072, 0.08, z);
    c.lerp(lidF, clamp(lid * 0.7, 0, 1));
    const apUp = 0.0031 * Math.pow(Math.max(0, 1 - (lx / 0.0132) ** 2), 0.72) + 0.0014 * clamp(lx / 0.0132, -1, 1);
    const lash = gauss((ly - apUp - 0.0006) / 0.0011) * gauss(lx / 0.012) * sstep(0.078, 0.083, z);
    c.lerp(lashF, clamp(lash * 0.85, 0, 1));
    // eyebrows (soft, denser medially)
    const bx = ax - 0.0315;
    const browY = 0.0405 - 5 * bx * bx + 0.0012 * gauss((bx + 0.004) / 0.01);
    const bh = 0.0036 - 0.0016 * sstep(-0.012, 0.02, bx);
    const brow = sstep(0.0205, 0.0165, Math.abs(bx)) * sstep(bh + 0.0015, bh - 0.0003, Math.abs(y - browY)) * sstep(0.072, 0.08, z) * sstep(0.0105, 0.0145, ax);
    c.lerp(browF, clamp(brow * (0.98 - 0.3 * sstep(-0.005, 0.02, bx)) * (0.85 + 0.15 * hash3(x, y, z)), 0, 1));
    // nostrils and ear canal
    const nos = gauss((ax - 0.0063) / 0.0032) * gauss((y + 0.0325) / 0.0022) * sstep(0.096, 0.1, z);
    c.lerp(darkF, clamp(nos * 0.8, 0, 1));
    // hair: close-cropped sides show skin through; the top is dense
    const h = hairAt(x, y, z);
    if (h.hair > 0) {
      const n = hash3(x, y, z);
      const tgt = cropF.clone().lerp(hairF, clamp(h.top * (0.85 + 0.3 * n), 0, 1)).multiplyScalar(0.9 + 0.2 * n);
      c.lerp(tgt, clamp(h.hair * (0.72 + 0.28 * h.top) * (0.9 + 0.2 * n), 0, 1));
    }
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

// ------------------------------------------------------------------ meshing (cached)

let baseGeo: THREE.BufferGeometry | null = null;
const headCache = new Map<string, THREE.BufferGeometry>();

/** Statistics of the head build (ms, triangles). */
export const headStats = { meshMs: 0, simplifyMs: 0, tris: 0 };

function headBase(cell = 0.0024, budget = 18000): THREE.BufferGeometry {
  if (baseGeo) return baseGeo;
  const t0 = performance.now();
  const g = meshSDF(headSDF(), { min: [-0.098, -HEAD_NECK_CUT - 0.006, -0.116], max: [0.098, 0.139, 0.126] }, cell, { project: 2, lipschitz: 1.35 });
  const t1 = performance.now();
  baseGeo = simplify(g, budget, { maxError: 0.00025, maxFlipDeg: 40 });
  headStats.meshMs = t1 - t0;
  headStats.simplifyMs = performance.now() - t1;
  headStats.tris = baseGeo.index ? baseGeo.index.count / 3 : 0;
  return baseGeo;
}

/**
 * Head geometry (head-local), vertex-painted for the given skin and hair colours (the colours are
 * multipliers relative to `skinHex`, so use a skin material of that colour with vertexColors).
 * The mesh is built once and shared; each (skin, hair) pair gets its own colour attribute.
 */
export function headGeometry(skinHex = 0xc9967a, hairHex = 0x3a2c22): THREE.BufferGeometry {
  const key = `${skinHex}|${hairHex}`;
  let g = headCache.get(key);
  if (!g) {
    const base = headBase();
    g = new THREE.BufferGeometry();
    g.setAttribute('position', base.attributes.position);
    g.setAttribute('normal', base.attributes.normal);
    g.setIndex(base.index);
    paintHead(g, skinHex, hairHex);
    headCache.set(key, g);
  }
  return g;
}

let eyeGeo: THREE.BufferGeometry | null = null;
/** Eyeball geometry centred at the origin, iris towards +Z, vertex coloured (use a white material). */
export function eyeGeometry(): THREE.BufferGeometry {
  if (eyeGeo) return eyeGeo;
  const g = new THREE.SphereGeometry(EYE.r, 32, 22);
  g.rotateX(Math.PI / 2); // poles on +-Z
  // a slight corneal bulge
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getZ(i) / EYE.r;
    if (z > 0.8) {
      const k = 1 + 0.06 * sstep(0.8, 1, z);
      pos.setXYZ(i, pos.getX(i), pos.getY(i), pos.getZ(i) * k);
    }
  }
  g.computeVertexNormals();
  const col = new Float32Array(pos.count * 3);
  const sclera = new THREE.Color(0xb8a996), iris = new THREE.Color(0x4a3f33), irisOut = new THREE.Color(0x2e271f), pupil = new THREE.Color(0x0c0a09);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const z = clamp(pos.getZ(i) / (EYE.r * 1.06), -1, 1);
    const ang = Math.acos(z) / D2R; // 0 at the front pole
    if (ang < 11) c.copy(pupil);
    else if (ang < 30) c.copy(iris).lerp(pupil, sstep(16, 11, ang) * 0.4).lerp(irisOut, sstep(24, 30, ang) * 0.7);
    else c.copy(sclera).lerp(irisOut, sstep(35, 30, ang) * 0.5).multiplyScalar(0.92 + 0.08 * sstep(40, 70, ang));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  eyeGeo = g;
  return g;
}

export { factor as skinFactor };
