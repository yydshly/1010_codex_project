/**
 * Spitfire LF Mk IXc paint & materials.
 *
 * The airframe skin uses the core UV-free surface shader, extended here (own shader chunk, no core
 * edits) with a position-based paint layer evaluated in the aircraft BODY frame:
 *  - 1944 RAF Day Fighter Scheme: Ocean Grey / Dark Green disruptive upper surfaces (soft sprayed
 *    edge), Medium Sea Grey lower surfaces, 18 in Sky band round the rear fuselage,
 *    yellow identification strips on the outer wing leading edges,
 *  - national markings only: Type C1 fuselage roundels, Type B upper-wing and Type C under-wing
 *    roundels, 1942-pattern fin flash (painted in the shader so they follow the skin exactly),
 *  - restrained panel lines (box-filtered so they never shimmer), exhaust staining,
 *  - open wheel wells and leg slots in the lower wing skin (discard; liners are modelled).
 * No squadron codes, serials or individual letters are applied.
 */
import * as THREE from 'three';
import { M } from '../../../core/kit';
import { surface } from '../../../core/materials/surface';
import { ASSET_TO_BODY, WG, DIM, planform } from './frame';

export const RAF = {
  darkGreen: 0x3b4330,
  oceanGrey: 0x52575c,
  msg: 0x9ca3a6,
  sky: 0xbac3a4,
  yellow: 0xd8a52c,
  red: 0x9c2c28,
  white: 0xdedcd2,
  blue: 0x2c3a5e,
  interior: 0x6f7560,
};

const rs = planform(WG.roundel);
const U = {
  uSpInv: { value: ASSET_TO_BODY.clone() },
  uDG: { value: new THREE.Color(RAF.darkGreen) },
  uOG: { value: new THREE.Color(RAF.oceanGrey) },
  uMSG: { value: new THREE.Color(RAF.msg) },
  uSky: { value: new THREE.Color(RAF.sky) },
  uYel: { value: new THREE.Color(RAF.yellow) },
  uRed: { value: new THREE.Color(RAF.red) },
  uWht: { value: new THREE.Color(RAF.white) },
  uBlu: { value: new THREE.Color(RAF.blue) },
  uSoot: { value: new THREE.Color(0x2b2825) },
  /** planform: sAxis, k*c0, (1-k)*c0, semi */
  uPlan: { value: new THREE.Vector4(WG.sAxis, WG.k * WG.c0, (1 - WG.k) * WG.c0, DIM.semi) },
  /** wheel well x, s, r, slot half width */
  uWell: { value: new THREE.Vector4(WG.well.x, WG.well.s, WG.well.r, WG.well.slotHalf) },
  /** wing roundel centre (ax, s) */
  uWRnd: { value: new THREE.Vector2(WG.roundel, (rs.le + rs.te) / 2) },
};

const PARS = /* glsl */ `
uniform mat4 uSpInv;
uniform vec3 uDG, uOG, uMSG, uSky, uYel, uRed, uWht, uBlu, uSoot;
uniform vec4 uPlan, uWell;
uniform vec2 uWRnd;
float spStep(float d) { float w = max(fwidth(d), 1e-6); return clamp(d / w + 0.5, 0.0, 1.0); }
float spSoft(float d, float soft) { float w = max(fwidth(d), soft); return clamp(d / w + 0.5, 0.0, 1.0); }
float spLine(float d, float w) {
  float fw = max(fwidth(d), 1e-6);
  float a = abs(d);
  float lo = max(a - 0.5 * fw, -w), hi = min(a + 0.5 * fw, w);
  return clamp((hi - lo) / fw, 0.0, 1.0);
}
float spBox(vec2 p, vec2 h) { vec2 q = abs(p) - h; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
// disruptive camouflage mask: 1 = Dark Green, 0 = Ocean Grey (large, softly sprayed patches)
float spCamo(vec3 bp) {
  vec3 w = vec3(srfNoise(bp * 0.75 + vec3(11.0, 3.0, 7.0)), srfNoise(bp * 0.75 + vec3(23.0, 17.0, 5.0)), srfNoise(bp * 0.75 + vec3(31.0, 29.0, 13.0))) - 0.5;
  vec3 q = bp * vec3(0.78, 0.78, 0.62) + w * 0.85;
  float n = 0.74 * srfNoise(q + vec3(5.0, 1.0, 9.0)) + 0.26 * srfNoise(q * 2.3 + vec3(2.0, 8.0, 4.0));
  return spSoft(n - 0.54, 0.018);
}
vec3 spUpper(vec3 bp) { return mix(uOG, uDG, spCamo(bp)); }
// roundel rings from the outside in: radii r.x > r.y > r.z > r.w with colours c0..c3
vec3 spRings(vec3 col, float d, vec4 r, vec3 c0, vec3 c1, vec3 c2, vec3 c3) {
  col = mix(col, c0, spStep(r.x - d));
  col = mix(col, c1, spStep(r.y - d));
  col = mix(col, c2, spStep(r.z - d));
  col = mix(col, c3, spStep(r.w - d));
  return col;
}
float spE(float ax) { return sqrt(max(0.0, 1.0 - (ax / uPlan.w) * (ax / uPlan.w))); }
`;

const MAIN = /* glsl */ `
#ifdef SP_SKIN
{
  vec3 bp = (uSpInv * vec4(vSrfPos, 1.0)).xyz;
  vec3 bn = normalize(mat3(uSpInv) * normalize(vSrfNrm));
  float bs = -bp.z;
  float bx = bp.x;
  float by = bp.y;
  float ax = abs(bx);
  vec3 col = uMSG;
  float pl = 0.0;
  const float LW = 0.0009;
#ifdef SP_FUSE
  // upper / lower demarcation (low on the sides, rising towards the tailplane)
  float dem = -0.30 - 0.05 * smoothstep(0.8, 2.4, bs);
  dem = mix(dem, -0.36, smoothstep(2.4, 3.0, bs));
  dem = mix(dem, 0.05, smoothstep(4.8, 8.3, bs));
  dem += 0.02 * (srfNoise(vec3(bs * 2.5, 1.0, bx > 0.0 ? 3.0 : 9.0)) - 0.5);
  col = mix(uMSG, spUpper(bp), spSoft(by - dem, 0.012));
  // 18 in Sky band round the rear fuselage
  col = mix(col, uSky, spStep(bs - 7.40) * spStep(7.857 - bs));
  // Type C1 fuselage roundel (36 in): yellow, blue, white, red
  if (abs(bn.x) > 0.35) {
    float d = length(vec2(bs - 5.72, by + 0.045));
    col = spRings(col, d, vec4(0.4572, 0.4064, 0.2032, 0.1524) * 0.94, uYel, uBlu, uWht, uRed);
  }
  // exhaust staining behind the stacks
  if (bs > 1.2 && bs < 3.6 && ax > 0.2) {
    float yc = 0.075 - 0.02 * (bs - 1.2);
    float w = 0.03 + 0.05 * (bs - 1.2);
    float st = (1.0 - smoothstep(w * 0.4, w, abs(by - yc))) * (1.0 - smoothstep(1.9, 3.5, bs)) * smoothstep(1.25, 1.45, bs);
    float streak = 0.6 + 0.4 * srfNoise(vec3(bs * 3.0, by * 60.0, bx * 5.0));
    col = mix(col, uSoot, clamp(st * streak * 0.5, 0.0, 0.6));
  }
  // panel lines: cowlings, fuselage frames, access door (port), belly centre line
  if (bs > 0.82 && bs < 2.56) {
    pl = max(pl, spLine(by - 0.215, LW) * step(0.4, abs(bn.x) + 0.3));
    pl = max(pl, spLine(by + 0.245, LW));
    if (bn.y > 0.75) pl = max(pl, spLine(bx, LW));
    // Dzus fasteners along the cowling joints
    float k = fract((bs - 0.86) / 0.15) - 0.5;
    float d1 = length(vec2(k * 0.15, by - 0.235)), d2 = length(vec2(k * 0.15, by + 0.225));
    if (abs(bn.x) > 0.35) pl = max(pl, 0.55 * spStep(0.0055 - min(d1, d2)));
  }
  pl = max(pl, spLine(bs - 0.845, LW));
  pl = max(pl, spLine(bs - 1.64, LW) * step(-0.24, by) * step(by, 0.215));
  pl = max(pl, spLine(bs - 2.56, LW));
  if (bs > 4.4) {
    pl = max(pl, spLine(bs - 4.80, LW));
    pl = max(pl, spLine(bs - 5.36, LW));
    pl = max(pl, spLine(bs - 6.46, LW));
    pl = max(pl, spLine(bs - 7.14, LW));
    pl = max(pl, spLine(bs - 8.02, LW));
    pl = max(pl, spLine(bs - 8.60, LW));
    if (bn.y < -0.7) pl = max(pl, spLine(bx, LW));
    // radio hatch, port
    if (bx > 0.0 && abs(bn.x) > 0.4) pl = max(pl, spLine(spBox(vec2(bs - 5.02, by - 0.17), vec2(0.13, 0.11)) - 0.015, LW));
  }
  // cockpit access door, port side
  if (bx > 0.0 && abs(bn.x) > 0.3 && bs > 3.7 && bs < 4.4) {
    pl = max(pl, spLine(spBox(vec2(bs - 4.05, by - 0.175), vec2(0.265, 0.145)) - 0.012, LW));
  }
#endif
#ifdef SP_WING
  bool lower = bn.y < 0.0;
  if (lower && by < -0.2) {
    vec2 q = vec2(ax - uWell.x, bs - uWell.y);
    if (length(q) < uWell.z) discard;
    if (ax > 0.5 && ax < uWell.x && abs(bs - uWell.y) < uWell.w) discard;
  }
  float e = spE(ax);
  float le = uPlan.x - uPlan.y * e, te = uPlan.x + uPlan.z * e;
  float ch = max(te - le, 0.02);
  float u = (bs - le) / ch;
  col = lower ? uMSG : spUpper(bp);
  // yellow identification strip on the outer leading edge
  if (ax > 2.5 && ax < 5.3) col = mix(col, uYel, spStep(0.05 - u) * spStep(ax - 2.5));
  // roundels: Type B above (56 in), Type C below (32 in)
  float dr = length(vec2(ax - uWRnd.x, bs - uWRnd.y));
  if (!lower) col = spRings(col, dr, vec4(0.711, 0.711, 0.2845, 0.2845), uBlu, uBlu, uRed, uRed);
  else col = spRings(col, dr, vec4(0.4064, 0.4064, 0.2032, 0.1524), uBlu, uBlu, uWht, uRed);
  // panel lines: ailerons, split flaps (below), gun-bay doors (above), root joint
  if (ax > 3.1 && ax < 5.05) {
    float h = le + 0.77 * ch;
    pl = max(pl, spLine(bs - h, LW));
    if (bs > h) { pl = max(pl, spLine(ax - 3.1, LW)); pl = max(pl, spLine(ax - 5.05, LW)); }
  }
  if (lower && ax > 0.42 && ax < 2.9) {
    float h = le + 0.8 * ch;
    pl = max(pl, spLine(bs - h, LW));
    if (bs > h) pl = max(pl, spLine(ax - 2.9, LW));
  }
  if (!lower) {
    float gb = spBox(vec2(ax - 2.2, bs - (le + 0.36 * ch)), vec2(0.26, 0.22)) - 0.015;
    float mb = spBox(vec2(ax - 3.08, bs - (le + 0.3 * ch)), vec2(0.22, 0.16)) - 0.012;
    pl = max(pl, spLine(gb, LW));
    pl = max(pl, spLine(mb, LW));
  }
  pl = max(pl, spLine(ax - 0.44, LW) * step(bs, te - 0.05));
  pl = max(pl, spLine(bs - (le + 0.25 * ch), LW * 0.8) * 0.6 * step(ax, 5.0));
#endif
#ifdef SP_TAIL
  bool side = abs(bn.x) > 0.55;
  if (side) {
    col = spUpper(bp);
    // fin flash (24 in high, red 11 in / white 2 in / blue 11 in) on the fixed fin
    if (by > 0.29 && by < 0.8996 && bs < 9.055) {
      float f0 = 9.055 - 0.6096;
      vec3 fc = mix(uRed, uWht, spStep(bs - (f0 + 0.2794)));
      fc = mix(fc, uBlu, spStep(bs - (f0 + 0.3302)));
      col = mix(col, fc, spStep(bs - f0) * spStep(by - 0.29) * spStep(0.8996 - by));
    }
    // rudder trim tab
    if (bs > 9.2 && by > 0.05 && by < 0.42) pl = max(pl, spLine(bs - 9.32, LW) * step(9.32, bs));
    if (bs > 9.32) { pl = max(pl, spLine(by - 0.05, LW)); pl = max(pl, spLine(by - 0.42, LW)); }
  } else {
    col = bn.y > 0.0 ? spUpper(bp) : uMSG;
    if (ax > 0.5 && ax < 0.95 && bs > 9.05) pl = max(pl, spLine(bs - 9.09, LW) * step(9.09, bs));
    if (bs > 9.09) { pl = max(pl, spLine(ax - 0.5, LW)); pl = max(pl, spLine(ax - 0.95, LW)); }
  }
#endif
  diffuseColor.rgb = col * (1.0 - 0.5 * pl);
}
#endif
`;

type Mode = 'FUSE' | 'WING' | 'TAIL';
const skinCache = new Map<Mode, THREE.MeshStandardMaterial>();

/** Camouflaged airframe skin material (one per region). */
export function skin(mode: Mode): THREE.MeshStandardMaterial {
  let m = skinCache.get(mode);
  if (m) return m;
  m = surface({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0,
    colorVar: 0.05,
    varScale: 1.6,
    roughVar: 0.16,
    detail: 'fine',
    detailSize: 0.07,
    detailStrength: 0.2,
    wear: 0.18,
    wearColor: 0x8f9396,
    wearMetalness: 0.85,
    wearRoughness: 0.34,
    dust: 0.1,
    dustHeight: 0.7,
    dustColor: 0x968b77,
    cavity: 0.3,
    name: 'spit9-skin-' + mode.toLowerCase(),
  });
  const mat = m;
  const base = mat.onBeforeCompile;
  mat.defines = { ...(mat.defines ?? {}), SP_SKIN: '', ['SP_' + mode]: '' };
  mat.customProgramCacheKey = () => 'srf-v1-spit9-' + mode;
  mat.onBeforeCompile = (shader, renderer) => {
    base.call(mat, shader, renderer);
    Object.assign(shader.uniforms, U);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', PARS + '\nvoid main() {')
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + MAIN);
  };
  skinCache.set(mode, mat);
  return mat;
}

const lensCache = new Map<string, THREE.MeshPhysicalMaterial>();

/** Plain palette (memoised by the core library). */
export const P = {
  msg: () => M.paint(RAF.msg, { roughness: 0.58, wear: 0.26, wearColor: 0x8f9396, wearMetalness: 0.85, dust: 0.25, dustHeight: 0.6, name: 'spit9-msg' }),
  sky: () => M.paint(RAF.sky, { roughness: 0.55, wear: 0.15, wearColor: 0x8f9396, wearMetalness: 0.85, dust: 0.05, colorVar: 0.04, name: 'spit9-sky' }),
  frame: () => M.paint(RAF.darkGreen, { roughness: 0.58, wear: 0.08, colorVar: 0.03, dust: 0.02, cavity: 0.2, name: 'spit9-frame' }),
  interior: () => M.paint(RAF.interior, { roughness: 0.66, wear: 0.25, wearColor: 0x7d8083, wearMetalness: 0.8, dust: 0.05, colorVar: 0.06, name: 'spit9-interior' }),
  black: () => M.paint(0x1a1b1b, { roughness: 0.52, wear: 0.16, wearColor: 0x5c5e60, dust: 0.03, name: 'spit9-black' }),
  yellow: () => M.paint(RAF.yellow, { roughness: 0.5, wear: 0.12, dust: 0.03, name: 'spit9-yellow' }),
  rubber: () => M.rubber({ roughness: 0.86, dust: 0.18, dustHeight: 0.12, colorVar: 0.04 }),
  oleo: () => M.steel({ color: 0x9a9da0, roughness: 0.2, metalness: 1, wear: 0, dust: 0.05, bump: 0, colorVar: 0.03 }),
  steel: () => M.steel({ color: 0x55585b, roughness: 0.45, wear: 0.35, dust: 0.15 }),
  gun: () => M.gunSteel({ color: 0x26282a, wear: 0.3 }),
  exhaust: () =>
    M.surface({
      color: 0x3a3532,
      roughness: 0.85,
      metalness: 0.35,
      colorVar: 0.18,
      varScale: 30,
      roughVar: 0.1,
      bump: 0.2,
      bumpScale: 260,
      wear: 0.4,
      wearColor: 0x6a625a,
      wearMetalness: 0.6,
      wearRoughness: 0.6,
      cavity: 0.5,
      name: 'spit9-exhaust',
    }),
  matrix: () => M.steel({ color: 0x2a2b2a, roughness: 0.6, metalness: 0.6, wear: 0.1, dust: 0.1, bump: 0 }),
  glass: () => M.glass({ tint: 0xe6eef0, opacity: 0.14, roughness: 0.03 }),
  lens: () => {
    const key = 'spit9-lens';
    let m = lensCache.get(key);
    if (!m) {
      m = new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.85,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      });
      m.name = key;
      m.userData.noShadow = true;
      lensCache.set(key, m);
    }
    return m as THREE.Material;
  },
};
