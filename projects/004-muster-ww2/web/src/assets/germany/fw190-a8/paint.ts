/**
 * Fw 190 A-8 paint & materials.
 *
 * The airframe skin uses the core UV-free surface shader, extended here (own shader chunk, no core
 * edits) with a position-based paint layer evaluated in the aircraft BODY frame:
 *  - RLM 74/75 hard-edged splinter on the upper surfaces, RLM 76 lower surfaces,
 *  - soft RLM 74/75/02 mottle on the fuselage sides and fin,
 *  - restrained panel lines (box-filtered so they never shimmer), exhaust staining,
 *  - open wheel wells and leg slots in the lower wing skin (discard; liners are modelled).
 * National markings are separate conforming decals (markings.ts). No swastika is applied to the
 * fin (deliberate omission).
 */
import * as THREE from 'three';
import { M } from '../../../core/kit';
import { surface } from '../../../core/materials/surface';
import { ASSET_TO_BODY, WG, DIM } from './frame';

export const RLM = {
  c74: 0x3d4441,
  c75: 0x57565c,
  c76: 0xa9b5b8,
  c02: 0x7a7b69,
  c70: 0x2b3228,
  c66: 0x383a3a,
};

const U = {
  uFwInv: { value: ASSET_TO_BODY.clone() },
  uC74: { value: new THREE.Color(RLM.c74) },
  uC75: { value: new THREE.Color(RLM.c75) },
  uC76: { value: new THREE.Color(RLM.c76) },
  uC02: { value: new THREE.Color(RLM.c02) },
  uCSoot: { value: new THREE.Color(0x2a2724) },
  /** wheel well x, s, r, slot half width */
  uWell: { value: new THREE.Vector4(WG.well.x, WG.well.s, WG.well.r, WG.well.slotHalf) },
  /** planform: le0, leK, te0, teK */
  uPlan: { value: new THREE.Vector4(WG.le0, WG.leK, WG.te0, WG.teK) },
  /** leg slot: pivot x, pivot s */
  uPiv: { value: new THREE.Vector2(DIM.pivot.x, DIM.pivot.s) },
  uSlot: { value: WG.slotX0 },
};

const PARS = /* glsl */ `
uniform mat4 uFwInv;
uniform vec3 uC74, uC75, uC76, uC02, uCSoot;
uniform vec4 uWell, uPlan;
uniform vec2 uPiv;
uniform float uSlot;
float fwStep(float d) { float w = max(fwidth(d), 1e-6); return clamp(d / w + 0.5, 0.0, 1.0); }
float fwLine(float d, float w) {
  float fw = max(fwidth(d), 1e-6);
  float a = abs(d);
  float lo = max(a - 0.5 * fw, -w), hi = min(a + 0.5 * fw, w);
  return clamp((hi - lo) / fw, 0.0, 1.0);
}
float fwBox(vec2 p, vec2 h) { vec2 q = abs(p) - h; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
vec3 fwSplinter(float t) { return mix(uC74, uC75, t); }
// soft sprayed mottle of RLM 02 / 75 / 74 over RLM 76; cover 0..1
vec3 fwMottle(vec3 bp, float cover) {
  vec3 q = bp * 4.6 + 0.45 * vec3(srfFbm(bp * 1.9 + 7.0), srfFbm(bp * 1.9 + 13.0), srfFbm(bp * 1.9 + 21.0));
  float n1 = srfFbm(q + vec3(3.1, 1.7, 8.3)) + 0.05 * (srfNoise(bp * 30.0) - 0.5);
  float n2 = srfFbm(q * 1.13 + vec3(11.7, 5.2, 1.3)) + 0.05 * (srfNoise(bp * 33.0 + 4.0) - 0.5);
  float n3 = srfFbm(q * 0.87 + vec3(4.4, 9.1, 2.2)) + 0.05 * (srfNoise(bp * 27.0 + 9.0) - 0.5);
  float t = mix(0.69, 0.56, cover);
  float w = 0.08;
  float m1 = smoothstep(t - w, t + w, n1);
  float m2 = smoothstep(t + 0.01 - w, t + 0.01 + w, n2);
  float m3 = smoothstep(t + 0.02 - w, t + 0.02 + w, n3);
  float on = step(0.001, cover);
  vec3 c = uC76;
  c = mix(c, uC02, m3 * 0.5 * on);
  c = mix(c, uC75, m2 * 0.6 * on);
  c = mix(c, uC74, m1 * 0.62 * on);
  return c;
}
`;

const MAIN = /* glsl */ `
#ifdef FW_SKIN
{
  vec3 bp = (uFwInv * vec4(vSrfPos, 1.0)).xyz;
  vec3 bn = normalize(mat3(uFwInv) * normalize(vSrfNrm));
  float bs = -bp.z;
  float bx = bp.x;
  float by = bp.y;
  float ax = abs(bx);
  vec3 col = uC76;
  float pl = 0.0;
  const float LW = 0.0009;
#ifdef FW_FUSE
  // upper-surface splinter along the spine and cowling top
  float sp = 0.0;
  sp += fwStep(bs - (1.2 + 0.8 * bx));
  sp += fwStep(bs - (3.9 - 0.9 * bx));
  sp += fwStep(bs - (6.0 + 0.7 * bx));
  sp += fwStep(bs - (7.6 - 0.6 * bx));
  float spl = mod(floor(sp), 2.0);
  vec3 upperC = mix(fwSplinter(spl), fwSplinter(1.0 - spl), fract(sp));
  float dn = srfFbm(bp * 7.0 + vec3(2.0, 7.0, 1.0)) - 0.5;
  float topMask = smoothstep(0.42, 0.56, bn.y + dn * 0.22);
  // mottle on the sides (lighter on the cowling, denser aft)
  float cover = smoothstep(-0.3, 0.45, bn.y) * mix(0.55, 1.0, smoothstep(1.6, 4.0, bs));
  vec3 sideC = fwMottle(bp, cover);
  col = mix(sideC, upperC, topMask);
  // exhaust staining behind the side outlets, fanning out along the wing root
  if (bs > 1.75 && bs < 4.6 && ax > 0.25) {
    float yc = -0.24 - 0.04 * (bs - 1.8);
    float w = 0.05 + 0.07 * (bs - 1.8);
    float st = (1.0 - smoothstep(w * 0.4, w, abs(by - yc))) * (1.0 - smoothstep(2.0, 4.5, bs)) * smoothstep(1.75, 1.95, bs);
    float streak = 0.6 + 0.4 * srfNoise(vec3(bs * 3.0, by * 55.0, bx * 5.0));
    col = mix(col, uCSoot, clamp(st * streak * 0.6, 0.0, 0.72));
  }
  // cowling gun troughs (MG 131 blast channels) on the upper cowling
  if (bs > 0.62 && bs < 1.62 && bn.y > 0.6) {
    float tr = fwStep(0.028 - abs(ax - 0.105)) * fwStep(1.6 - bs);
    col = mix(col, uCSoot * 0.8, tr);
  }
  // panel lines
  pl = max(pl, fwLine(bs - 0.86, LW));
  pl = max(pl, fwLine(bs - 1.62, LW));
  if (bs > 1.62 && bs < 1.78) {
    // cooling gills: short radial joints around the cowling rear
    float ang = atan(by, bx);
    float k = fract(ang * 18.0 / 6.2832) - 0.5;
    pl = max(pl, 0.8 * fwLine(k * 0.36, LW * 1.4));
  }
  pl = max(pl, fwLine(bs - 1.78, LW));
  if (bs > 1.78 && bs < 3.06 && by > 0.35) {
    // hinged gun cover ahead of the windscreen
    pl = max(pl, fwLine(ax - 0.33, LW));
    pl = max(pl, fwLine(bs - 3.0, LW) * step(ax, 0.33));
  }
  if (bs > 0.86 && bs < 1.62 && abs(bn.x) > 0.5) pl = max(pl, fwLine(by + 0.05, LW));
  if (bs > 4.97) {
    pl = max(pl, fwLine(bs - 5.6, LW));
    pl = max(pl, fwLine(bs - 6.35, LW));
    pl = max(pl, fwLine(bs - 7.55, LW));
    pl = max(pl, fwLine(bs - 8.2, LW));
    if (bn.y > 0.6) pl = max(pl, fwLine(bx, LW));
    if (bn.y < -0.6) pl = max(pl, fwLine(bx, LW));
    // radio access hatch (port side)
    if (bx > 0.0 && abs(bn.x) > 0.45) {
      float h = fwBox(vec2(bs - 5.95, by - 0.12), vec2(0.2, 0.17)) - 0.02;
      pl = max(pl, fwLine(h, LW));
    }
    // first-aid hatch (port side)
    if (bx > 0.0 && abs(bn.x) > 0.45) {
      float h2 = fwBox(vec2(bs - 6.95, by - 0.14), vec2(0.09, 0.075)) - 0.012;
      pl = max(pl, fwLine(h2, LW));
    }
  }
  // cowling fastener heads along the cowling joints
  if (bs > 0.9 && bs < 1.6 && abs(bn.x) > 0.4) {
    float k = fract((bs - 0.9) / 0.14) - 0.5;
    float d1 = length(vec2(k * 0.14, by + 0.035));
    pl = max(pl, 0.6 * fwStep(0.006 - d1));
  }
#endif
#ifdef FW_WING
  bool lower = bn.y < 0.02;
  // wheel wells and leg slots: open on the lower surface
  if (lower && ax > 0.3 && ax < 2.0 && bs > 1.8 && bs < 2.8 && by < -0.2) {
    if (ax > uSlot && ax < uPiv.x + 0.06 && abs(bs - uPiv.y) < uWell.w) discard;
    // closed inner wheel-well door outline
    vec2 q = vec2(ax - uWell.x, bs - uWell.y);
    float dd = fwBox(q, vec2(uWell.z - 0.02, uWell.z - 0.02)) - 0.04;
    pl = max(pl, fwLine(dd, LW) * step(0.12, ax));
  }
  float le = uPlan.x + uPlan.y * ax, te = uPlan.z - uPlan.w * ax, ch = te - le;
  float u = (bs - le) / max(ch, 0.05);
  if (!lower) {
    float sp = 0.0;
    if (bx > 0.0) {
      sp += fwStep(bs - (2.0 + 1.5 * (bx - 0.7)));
      sp += fwStep((4.0 - 1.4 * (bx - 2.3)) - bs);
      sp += fwStep(bs - (2.3 + 1.3 * (bx - 4.1)));
    } else {
      sp += fwStep((1.9 - 1.4 * (ax - 1.2)) - bs);
      sp += fwStep(bs - (2.2 + 1.6 * (ax - 2.5)));
      sp += fwStep((4.1 - 1.2 * (ax - 3.5)) - bs);
    }
    float spl = mod(floor(sp), 2.0);
    col = mix(fwSplinter(spl), fwSplinter(1.0 - spl), fract(sp));
  }
  // flap / aileron hinge line and ends
  if (ax > 0.62 && ax < 4.95) {
    float hinge = le + 0.75 * ch;
    pl = max(pl, fwLine(bs - hinge, LW) * step(0.0, bs - le - 0.3));
    if (bs > hinge) {
      pl = max(pl, fwLine(ax - 0.62, LW));
      pl = max(pl, fwLine(ax - 2.95, LW));
      pl = max(pl, fwLine(ax - 4.95, LW));
      if (ax > 3.4 && ax < 3.8) pl = max(pl, fwLine(bs - (te - 0.07), LW));
      if (bs > te - 0.07) { pl = max(pl, fwLine(ax - 3.4, LW)); pl = max(pl, fwLine(ax - 3.8, LW)); }
    }
  }
  pl = max(pl, fwLine(ax - 0.5, LW) * step(bs, le + 0.9 * ch));
  // outer cannon access panels and root gun covers
  {
    float p1 = fwBox(vec2(ax - 2.42, bs - (le + 0.34 * ch)), vec2(0.16, 0.3)) - 0.015;
    pl = max(pl, fwLine(p1, LW));
    if (!lower) {
      float p2 = fwBox(vec2(ax - 0.86, bs - (le + 0.3 * ch)), vec2(0.13, 0.36)) - 0.015;
      pl = max(pl, fwLine(p2, LW));
    } else {
      float p3 = fwBox(vec2(ax - 3.4, bs - (le + 0.45 * ch)), vec2(0.13, 0.09)) - 0.012;
      pl = max(pl, fwLine(p3, LW));
    }
  }
  // wing-root walkway: slightly rubbed paint (port)
  if (!lower && bx > 0.5 && bx < 1.05 && u > 0.35 && u < 0.9) {
    float rub = smoothstep(0.55, 0.85, srfFbm(bp * 18.0)) * 0.5;
    col = mix(col, col * 1.18 + vec3(0.02), rub);
  }
#endif
#ifdef FW_TAIL
  bool fin = abs(bn.x) > 0.6;
  if (fin) {
    col = fwMottle(bp, mix(0.3, 0.55, smoothstep(0.3, 0.9, by)));
    // rudder trim tab
    if (by > 0.36 && by < 0.58 && bs > 8.8) pl = max(pl, fwLine(bs - 8.86, LW) * step(8.86, bs + 0.001));
    if (bs > 8.86) { pl = max(pl, fwLine(by - 0.36, LW) * step(by, 0.58)); pl = max(pl, fwLine(by - 0.58, LW) * step(0.36, by)); }
  } else {
    if (bn.y > 0.0) {
      float sp = fwStep(bs - (8.25 - 0.3 * bx));
      col = mix(uC74, uC75, sp);
    }
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
    name: 'fw190-skin-' + mode.toLowerCase(),
  });
  const mat = m;
  const base = mat.onBeforeCompile;
  mat.defines = { ...(mat.defines ?? {}), FW_SKIN: '', ['FW_' + mode]: '' };
  mat.customProgramCacheKey = () => 'srf-v3-fw190a8-' + mode;
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
  rlm76: () => M.paint(RLM.c76, { roughness: 0.58, wear: 0.24, wearColor: 0x8f9396, wearMetalness: 0.85, dust: 0.22, dustHeight: 0.8, name: 'fw190-rlm76' }),
  rlm02: () => M.paint(RLM.c02, { roughness: 0.62, wear: 0.3, wearColor: 0x8f9396, wearMetalness: 0.85, dust: 0.3, dustHeight: 0.8, name: 'fw190-rlm02' }),
  rlm70: () => M.paint(RLM.c70, { roughness: 0.55, wear: 0.16, wearColor: 0x6d6a60, wearMetalness: 0.2, dust: 0.06, colorVar: 0.05, name: 'fw190-rlm70' }),
  interior: () =>
    M.paint(RLM.c66, { roughness: 0.66, wear: 0.28, wearColor: 0x7d8083, wearMetalness: 0.8, dust: 0.06, colorVar: 0.06, name: 'fw190-interior' }),
  frame: () => M.paint(RLM.c74, { roughness: 0.56, wear: 0.06, colorVar: 0.03, detailStrength: 0.12, dust: 0.02, cavity: 0.2, name: 'fw190-canopy-frame' }),
  black: () => M.paint(0x1a1b1b, { roughness: 0.52, wear: 0.16, wearColor: 0x5c5e60, dust: 0.03, name: 'fw190-black' }),
  rubber: () => M.rubber({ roughness: 0.86, dust: 0.18, dustHeight: 0.12, colorVar: 0.04 }),
  oleo: () => M.steel({ color: 0x9a9da0, roughness: 0.2, metalness: 1, wear: 0, dust: 0.05, bump: 0, colorVar: 0.03 }),
  steel: () => M.steel({ color: 0x55585b, roughness: 0.45, wear: 0.35, dust: 0.15 }),
  gun: () => M.gunSteel({ color: 0x242628, wear: 0.3 }),
  fan: () => M.steel({ color: 0x3a3c3c, roughness: 0.5, metalness: 0.7, wear: 0.25, dust: 0.08, bump: 0, name: 'fw190-fan' }),
  exhaust: () =>
    M.surface({
      color: 0x36322f,
      roughness: 0.85,
      metalness: 0.35,
      colorVar: 0.22,
      varScale: 30,
      roughVar: 0.1,
      bump: 0.2,
      bumpScale: 260,
      wear: 0.4,
      wearColor: 0x6a625a,
      wearMetalness: 0.6,
      wearRoughness: 0.6,
      cavity: 0.5,
      name: 'fw190-exhaust',
    }),
  glass: () => M.glass({ tint: 0xe6eef0, opacity: 0.14, roughness: 0.03 }),
  armourGlass: () => M.glass({ tint: 0xc6ddd2, opacity: 0.2, roughness: 0.05 }),
  wire: () => M.steel({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.5, wear: 0, dust: 0, name: 'fw190-wire' }),
  lens: () => {
    const key = 'fw190-lens';
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
