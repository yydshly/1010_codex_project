/**
 * Bf 109 G-6 paint & materials.
 *
 * The airframe skin uses the core UV-free surface shader, extended here (own shader chunk, no core
 * edits) with a position-based paint layer evaluated in the aircraft BODY frame:
 *  - RLM 74/75 hard-edged splinter on upper surfaces, RLM 76 lower surfaces,
 *  - soft RLM 74/75/02 mottle on the fuselage sides and fin,
 *  - restrained panel lines (box-filtered so they never shimmer),
 *  - light exhaust staining, RLM 66 decking under the fixed rear glazing,
 *  - open wheel wells and leg slots in the lower wing skin (discard; liners are modelled).
 * National markings are separate conforming decals (see markings.ts). No swastika is applied
 * to the fin (deliberate omission).
 */
import * as THREE from 'three';
import { M } from '../../../core/kit';
import { surface } from '../../../core/materials/surface';
import { ASSET_TO_BODY } from './frame';

export const RLM = {
  c74: 0x3d4441,
  c75: 0x56555b,
  c76: 0xa9b5b8,
  c02: 0x7a7b69,
  c70: 0x2e3429,
  c66: 0x383a3a,
};

const U = {
  uBfInv: { value: ASSET_TO_BODY.clone() },
  uC74: { value: new THREE.Color(RLM.c74) },
  uC75: { value: new THREE.Color(RLM.c75) },
  uC76: { value: new THREE.Color(RLM.c76) },
  uC02: { value: new THREE.Color(RLM.c02) },
  uCBlack: { value: new THREE.Color(0x151515) },
  uCWhite: { value: new THREE.Color(0xe4e2da) },
  uCSoot: { value: new THREE.Color(0x2a2724) },
  uC66: { value: new THREE.Color(RLM.c66) },
};

const PARS = /* glsl */ `
uniform mat4 uBfInv;
uniform vec3 uC74, uC75, uC76, uC02, uCBlack, uCWhite, uCSoot, uC66;
// 1 where d > 0, anti-aliased
float bfStep(float d) { float w = max(fwidth(d), 1e-6); return clamp(d / w + 0.5, 0.0, 1.0); }
// box-filtered line of half-width w at d = 0 (coverage of the pixel footprint)
float bfLine(float d, float w) {
  float fw = max(fwidth(d), 1e-6);
  float a = abs(d);
  float lo = max(a - 0.5 * fw, -w), hi = min(a + 0.5 * fw, w);
  return clamp((hi - lo) / fw, 0.0, 1.0);
}
float bfSdBox(vec2 p, vec2 h) { vec2 q = abs(p) - h; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
// splinter parity of a set of straight boundaries s = a + b * x
float bfPar(float l) { return bfStep(l); }
vec3 bfSplinter(float t) { return mix(uC74, uC75, t); }
// soft sprayed mottle of RLM 02 / 75 / 74 over RLM 76; cover 0..1
vec3 bfMottle(vec3 bp, float cover) {
  float n1 = srfFbm(bp * 3.3 + vec3(3.1, 1.7, 8.3)) + 0.08 * (srfNoise(bp * 17.0) - 0.5);
  float n2 = srfFbm(bp * 3.7 + vec3(11.7, 5.2, 1.3)) + 0.08 * (srfNoise(bp * 19.0 + 4.0) - 0.5);
  float n3 = srfFbm(bp * 2.9 + vec3(4.4, 9.1, 2.2)) + 0.07 * (srfNoise(bp * 15.0 + 9.0) - 0.5);
  float t = mix(0.66, 0.52, cover);
  float w = 0.06;
  float m1 = smoothstep(t - w, t + w, n1);
  float m2 = smoothstep(t + 0.01 - w, t + 0.01 + w, n2);
  float m3 = smoothstep(t + 0.03 - w, t + 0.03 + w, n3);
  vec3 c = uC76;
  c = mix(c, uC02, m3 * 0.7 * step(0.001, cover));
  c = mix(c, uC75, m2 * 0.8 * step(0.001, cover));
  c = mix(c, uC74, m1 * 0.82 * step(0.001, cover));
  return c;
}
// wing planform (body frame, |x|)
float bfLE(float ax) { return 2.10 + 0.0739 * ax; }
float bfTE(float ax) { return 4.20 - 0.126 * ax; }
`;

const MAIN = /* glsl */ `
#ifdef BF_SKIN
{
  vec3 bp = (uBfInv * vec4(vSrfPos, 1.0)).xyz;
  vec3 bn = normalize(mat3(uBfInv) * normalize(vSrfNrm));
  float bs = -bp.z;
  float bx = bp.x;
  float by = bp.y;
  float ax = abs(bx);
  vec3 col = uC76;
  float pl = 0.0;
  const float LW = 0.0009;
#ifdef BF_FUSE
  // upper-surface splinter (spine and cowling top), soft sprayed demarcation to the sides
  float sp = 0.0;
  sp += bfPar(bs - (1.55 + 0.9 * bx));
  sp += bfPar(bs - (5.25 - 0.7 * bx));
  sp += bfPar(bs - (6.85 + 0.6 * bx));
  sp += bfPar(bs - (8.25 - 0.5 * bx));
  float spl = mod(floor(sp + 0.5), 2.0);
  // soft edges between splinter colours are sharp: use the AA'd fractional part
  float spf = fract(sp);
  spl = mod(floor(sp), 2.0);
  vec3 upperC = mix(bfSplinter(spl), bfSplinter(1.0 - spl), spf);
  float dn = srfFbm(bp * 7.0 + vec3(2.0, 7.0, 1.0)) - 0.5;
  float topMask = smoothstep(0.33, 0.47, bn.y + dn * 0.2);
  // mottle on the sides
  float cover = smoothstep(-0.25, 0.45, bn.y) * smoothstep(0.62, 1.3, bs);
  vec3 sideC = bfMottle(bp, cover);
  col = mix(sideC, upperC, topMask);
  // gun troughs on the upper cowling
  if (bs > 0.63 && bs < 1.30 && bn.y > 0.5) {
    float tr = bfStep(0.026 - abs(ax - 0.085)) * bfStep(1.28 - bs);
    col = mix(col, uCSoot * 0.9, tr);
  }
  // exhaust staining behind the stacks
  if (bs > 0.9 && bs < 4.2 && ax > 0.2) {
    float yc = -0.19 + 0.025 * (bs - 1.0);
    float w = 0.05 + 0.05 * (bs - 1.0);
    float st = (1.0 - smoothstep(w * 0.4, w, abs(by - yc))) * (1.0 - smoothstep(1.4, 4.1, bs)) * smoothstep(0.9, 1.1, bs);
    float streak = 0.6 + 0.4 * srfNoise(vec3(bs * 3.0, by * 60.0, bx * 5.0));
    col = mix(col, uCSoot, clamp(st * streak * 0.55, 0.0, 0.7));
  }
  // interior-grey decking under the fixed rear glazing
  if (bs > 3.59 && bs < 4.075 && by > 0.3) {
    float xg = mix(0.30, 0.10, clamp((bs - 3.6) / 0.46, 0.0, 1.0));
    col = mix(col, uC66, bfStep(xg - 0.004 - ax));
  }
  // lifting-tube openings (rear fuselage)
  if (abs(bn.x) > 0.5) col = mix(col, uCSoot * 0.4, bfStep(0.021 - length(vec2(bs - 7.42, by - 0.17))));
  // panel lines
  pl = max(pl, bfLine(bs - 0.625, LW));
  if (by > -0.45) pl = max(pl, bfLine(bs - 2.44, LW));
  if (bs > 0.63 && bs < 2.44) {
    if (bn.y > 0.2) pl = max(pl, bfLine(ax - 0.262, LW));
    pl = max(pl, bfLine(by + 0.36, LW) * step(0.5, abs(bn.x)));
  }
  if (bs > 4.05) {
    pl = max(pl, bfLine(bs - 4.32, LW));
    pl = max(pl, bfLine(bs - 4.98, LW));
    pl = max(pl, bfLine(bs - 6.42, LW));
    pl = max(pl, bfLine(bs - 7.05, LW));
    pl = max(pl, bfLine(bs - 7.66, LW));
    pl = max(pl, bfLine(bs - 8.28, LW));
    if (bn.y > 0.6) pl = max(pl, bfLine(bx, LW));
    if (bn.y < -0.6) pl = max(pl, bfLine(bx, LW));
    // radio hatch, port side
    if (bx > 0.0 && abs(bn.x) > 0.4) {
      float h = bfSdBox(vec2(bs - 4.66, by - 0.24), vec2(0.20, 0.16)) - 0.02;
      pl = max(pl, bfLine(h, LW));
    }
    // first-aid hatch, port side
    if (bx > 0.0 && abs(bn.x) > 0.4) {
      float h2 = bfSdBox(vec2(bs - 6.72, by - 0.27), vec2(0.10, 0.08)) - 0.012;
      pl = max(pl, bfLine(h2, LW));
    }
  }
  // cowling fastener heads (small dots along the panel joints)
  if (bs > 0.7 && bs < 2.4 && abs(bn.x) > 0.5) {
    float k = fract((bs - 0.7) / 0.16) - 0.5;
    float dot1 = length(vec2(k * 0.16, by + 0.335));
    float dot2 = length(vec2(k * 0.16, by - 0.155));
    pl = max(pl, 0.6 * bfStep(0.006 - min(dot1, dot2)));
  }
#endif
#ifdef BF_WING
  bool lower = bn.y < 0.02;
  // wheel wells and leg slots: open on the lower surface
  if (lower && ax > 0.4 && ax < 1.85 && bs > 2.1 && bs < 3.1 && by < -0.25) {
    vec2 q = vec2((ax - 1.36) / 0.345, (bs - 2.68) / 0.345);
    if (dot(q, q) < 1.0) discard;
    if (ax > 0.52 && ax < 1.08 && abs(bs - 2.455) < 0.075) discard;
  }
  float le = bfLE(ax), te = bfTE(ax), ch = te - le;
  float u = (bs - le) / max(ch, 0.05);
  if (!lower) {
    float sp = 0.0;
    if (bx > 0.0) {
      sp += bfPar(bs - (2.0 + 1.6 * (bx - 0.6)));
      sp += bfPar((4.2 - 1.5 * (bx - 2.2)) - bs);
      sp += bfPar(bs - (2.3 + 1.4 * (bx - 3.9)));
    } else {
      sp += bfPar((1.9 - 1.5 * (ax - 1.1)) - bs);
      sp += bfPar(bs - (2.2 + 1.7 * (ax - 2.3)));
      sp += bfPar((4.3 - 1.3 * (ax - 3.3)) - bs);
      sp += bfPar(bs - (2.1 + 1.6 * (ax - 4.45)));
    }
    float spl = mod(floor(sp), 2.0);
    col = mix(bfSplinter(spl), bfSplinter(1.0 - spl), fract(sp));
  }
  // panel lines: flap / aileron hinge line and ends
  if (ax > 0.42 && ax < 4.52) {
    float hinge = le + 0.745 * ch;
    pl = max(pl, bfLine(bs - hinge, LW) * step(0.0, bs - le - 0.3));
    if (bs > hinge) {
      pl = max(pl, bfLine(ax - 2.95, LW));
      pl = max(pl, bfLine(ax - 4.50, LW));
      pl = max(pl, bfLine(ax - 1.55, LW));
      // aileron trim tab
      if (ax > 3.30 && ax < 3.74) pl = max(pl, bfLine(bs - (te - 0.075), LW));
      if (bs > te - 0.075) { pl = max(pl, bfLine(ax - 3.30, LW)); pl = max(pl, bfLine(ax - 3.74, LW)); }
    }
  }
  pl = max(pl, bfLine(ax - 0.43, LW) * step(bs, le + 0.9 * ch));
  // spar line and a few access panels
  if (lower) {
    float p1 = bfSdBox(vec2(ax - 2.25, bs - (le + 0.30 * ch)), vec2(0.16, 0.11)) - 0.015;
    float p2 = bfSdBox(vec2(ax - 3.55, bs - (le + 0.55 * ch)), vec2(0.12, 0.08)) - 0.012;
    pl = max(pl, bfLine(p1, LW));
    pl = max(pl, bfLine(p2, LW));
  } else {
    float p3 = bfSdBox(vec2(ax - 2.05, bs - (le + 0.56 * ch)), vec2(0.14, 0.10)) - 0.015;
    pl = max(pl, bfLine(p3, LW));
  }
  // wing-root walkway wear (port, upper) - a little rubbed paint
  if (!lower && bx > 0.4 && bx < 0.95 && u > 0.25 && u < 0.85) {
    float rub = smoothstep(0.55, 0.85, srfFbm(bp * 18.0)) * 0.5;
    col = mix(col, col * 1.18 + vec3(0.02), rub);
  }
#endif
#ifdef BF_TAIL
  bool fin = abs(bn.x) > 0.6;
  if (fin) {
    col = bfMottle(bp, mix(0.25, 0.5, smoothstep(0.3, 0.9, by)));
    // rudder trim tab and fin access panel
    if (by > 0.30 && by < 0.46) pl = max(pl, bfLine(bs - 8.905, LW) * step(8.905, bs + 0.001));
    if (bs > 8.905) { pl = max(pl, bfLine(by - 0.30, LW)); pl = max(pl, bfLine(by - 0.46, LW)); }
    if (bs < 8.57) pl = max(pl, bfLine(bfSdBox(vec2(bs - 8.05, by - 0.52), vec2(0.07, 0.05)) - 0.01, LW));
  } else {
    bool low = bn.y < 0.0;
    if (!low) {
      float sp = bfPar(bs - (8.25 - 0.35 * bx));
      col = mix(uC74, uC75, sp);
    }
    // elevator trim tab
    float te = 8.82 - 0.10 * abs(bx);
    if (abs(bx) > 0.45 && abs(bx) < 0.80) pl = max(pl, bfLine(bs - (te - 0.07), LW) * step(te - 0.07, bs + 0.001));
    if (bs > te - 0.07) { pl = max(pl, bfLine(abs(bx) - 0.45, LW)); pl = max(pl, bfLine(abs(bx) - 0.80, LW)); }
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
    roughness: 0.58,
    metalness: 0,
    colorVar: 0.06,
    varScale: 1.8,
    roughVar: 0.16,
    detail: 'fine',
    detailSize: 0.07,
    detailStrength: 0.22,
    wear: 0.2,
    wearColor: 0x8f9396,
    wearMetalness: 0.85,
    wearRoughness: 0.34,
    dust: 0.12,
    dustHeight: 0.7,
    dustColor: 0x968b77,
    cavity: 0.3,
    name: 'bf109-skin-' + mode.toLowerCase(),
  });
  const mat = m;
  const base = mat.onBeforeCompile;
  mat.defines = { ...(mat.defines ?? {}), BF_SKIN: '', ['BF_' + mode]: '' };
  mat.customProgramCacheKey = () => 'srf-v1-bf109g6-' + mode;
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

/** Plain palette (memoised by the core library). */
export const P = {
  rlm74: () => M.paint(RLM.c74, { roughness: 0.58, wear: 0.25, wearColor: 0x8f9396, wearMetalness: 0.85, dust: 0.08 }),
  rlm76: () => M.paint(RLM.c76, { roughness: 0.58, wear: 0.22, wearColor: 0x8f9396, wearMetalness: 0.85, dust: 0.2, dustHeight: 0.8 }),
  rlm02: () => M.paint(RLM.c02, { roughness: 0.62, wear: 0.3, wearColor: 0x8f9396, wearMetalness: 0.85, dust: 0.3, dustHeight: 0.8 }),
  rlm66: () => M.paint(RLM.c66, { roughness: 0.62, wear: 0.3, wearColor: 0x77797b, wearMetalness: 0.8, dust: 0.05 }),
  rlm70: () => M.paint(RLM.c70, { roughness: 0.55, wear: 0.18, wearColor: 0x8a8d90, wearMetalness: 0.85, dust: 0.08, colorVar: 0.05 }),
  rubber: () => M.rubber({ roughness: 0.86, dust: 0.18, dustHeight: 0.12, colorVar: 0.04 }),
  oleo: () => M.steel({ color: 0x9a9da0, roughness: 0.2, metalness: 1, wear: 0, dust: 0.05, bump: 0, colorVar: 0.03 }),
  steel: () => M.steel({ color: 0x55585b, roughness: 0.45, wear: 0.35, dust: 0.15 }),
  gun: () => M.gunSteel({ color: 0x242628, wear: 0.3 }),
  exhaust: () =>
    M.surface({
      color: 0x4a4341,
      roughness: 0.85,
      metalness: 0.35,
      colorVar: 0.22,
      varScale: 30,
      roughVar: 0.1,
      bump: 0.2,
      bumpScale: 260,
      wear: 0.4,
      wearColor: 0x7a6e62,
      wearMetalness: 0.6,
      wearRoughness: 0.6,
      cavity: 0.5,
      name: 'bf109-exhaust',
    }),
  matrix: () => M.steel({ color: 0x2a2b2a, roughness: 0.6, metalness: 0.6, wear: 0.1, dust: 0.1, bump: 0 }),
  glass: () => M.glass({ tint: 0xe6eef0, opacity: 0.14, roughness: 0.03 }),
  armourGlass: () => M.glass({ tint: 0xc6ddd2, opacity: 0.16, roughness: 0.05 }),
  wire: () => M.steel({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.5, wear: 0, dust: 0 }),
  leather: () => M.leather(0x3a2a1e, { roughness: 0.6 }),
  canvas: () => M.canvas(0x8a7f67, { dust: 0.05 }),
  navRed: () => M.glass({ tint: 0xd02818, opacity: 0.8, roughness: 0.1 }),
  navGreen: () => M.glass({ tint: 0x1c9a3c, opacity: 0.8, roughness: 0.1 }),
  navClear: () => M.glass({ tint: 0xf4f0e6, opacity: 0.5, roughness: 0.05 }),
  black: () => M.paint(0x1b1c1c, { roughness: 0.5, wear: 0.2, dust: 0 }),
  frame: () => M.paint(RLM.c74, { roughness: 0.56, wear: 0.06, colorVar: 0.03, detailStrength: 0.12, dust: 0.02, cavity: 0.2, name: 'bf109-canopy-frame' }),
  insulator: () => M.paint(0xd9d2c0, { roughness: 0.35, wear: 0.05, dust: 0.1, colorVar: 0.03 }),
  interior: () =>
    M.paint(RLM.c66, { roughness: 0.66, wear: 0.28, wearColor: 0x7d8083, wearMetalness: 0.8, dust: 0.06, colorVar: 0.06, name: 'bf109-interior' }),
  harness: () => M.canvas(0x857e6c, { dust: 0.04, wear: 0.1 }),
  hub: () => M.paint(RLM.c76, { roughness: 0.5, wear: 0.3, wearColor: 0x8f9396, wearMetalness: 0.85, dust: 0.35, dustHeight: 0.5 }),
  lens: () => {
    const key = 'bf109-lens';
    let m = lensCache.get(key);
    if (!m) {
      m = new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.08,
        metalness: 0,
        transparent: true,
        opacity: 0.82,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      });
      m.name = key;
      m.userData.noShadow = true;
      lensCache.set(key, m);
    }
    return m;
  },
};
const lensCache = new Map<string, THREE.MeshPhysicalMaterial>();
