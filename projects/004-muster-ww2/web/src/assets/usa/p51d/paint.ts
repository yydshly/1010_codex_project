/**
 * P-51D paint & materials. Finish modelled: late-1944 USAAF factory natural metal
 * (bare aluminium fuselage and tail with panel-to-panel tone variation), wings puttied and
 * painted in aluminium lacquer (as on production P-51Ds, for laminar flow), bare-metal flaps
 * and ailerons, olive drab anti-glare panel ahead of the windscreen, fabric rudder doped silver.
 *
 * The skin materials extend the core UV-free surface shader (own chunk, no core edits) with a
 * position-based layer evaluated in the BODY frame: panel tones, restrained panel lines, anti-glare
 * panel, exhaust staining, and the open wheel wells / leg bays in the lower wing (discarded;
 * liners are modelled).
 */
import * as THREE from 'three';
import { M } from '../../../core/kit';
import { surface } from '../../../core/materials/surface';
import { ASSET_TO_BODY } from './frame';
import { WING, WELL, SLOT, CTRL } from './planform';

export const COL = {
  metal: 0xa3a7ab,
  silver: 0x83878b,
  od: 0x4a4a32,
  interior: 0x40473a,
  soot: 0x2e2b28,
};

const U = {
  uPmInv: { value: ASSET_TO_BODY.clone() },
  uCOD: { value: new THREE.Color(COL.od) },
  uCSoot: { value: new THREE.Color(COL.soot) },
  uCSilver: { value: new THREE.Color(COL.silver) },
};

const f = (v: number) => v.toFixed(5);
const PARS = /* glsl */ `
uniform mat4 uPmInv;
uniform vec3 uCOD, uCSoot, uCSilver;
float pmStep(float d) { float w = max(fwidth(d), 1e-6); return clamp(d / w + 0.5, 0.0, 1.0); }
float pmLine(float d, float w) {
  float fw = max(fwidth(d), 1e-6);
  float a = abs(d);
  float lo = max(a - 0.5 * fw, -w), hi = min(a + 0.5 * fw, w);
  return clamp((hi - lo) / fw, 0.0, 1.0);
}
float pmHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pmSdBox(vec2 p, vec2 h) { vec2 q = abs(p) - h; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
float pmChord(float ax) { return ${f(WING.cr)} - ${f((WING.cr - WING.ct) / WING.semi)} * ax; }
float pmLE(float ax) { return ${f(WING.s30)} - 0.3 * pmChord(ax); }
float pmTE(float ax) { return ${f(WING.s30)} + 0.7 * pmChord(ax); }
`;

const MAIN = /* glsl */ `
float pmRough = -1.0;
float pmMetal = -1.0;
#ifdef PM_SKIN
{
  vec3 bp = (uPmInv * vec4(vSrfPos, 1.0)).xyz;
  vec3 bn = normalize(mat3(uPmInv) * normalize(vSrfNrm));
  float bs = -bp.z, bx = bp.x, by = bp.y, ax = abs(bx);
  vec3 col = diffuseColor.rgb;
  float pl = 0.0;
  const float LW = 0.0008;
  float tone = 0.0;
#ifdef PM_FUSE
  // panel ids along the fuselage (frames) and a horizontal split
  float fr = 0.0;
  fr += step(1.32, bs) + step(1.86, bs) + step(2.44, bs) + step(3.3, bs) + step(5.02, bs) + step(5.92, bs) + step(6.95, bs) + step(7.95, bs) + step(8.7, bs);
  float hz = step(0.1, by) + step(-0.36, by);
  tone = pmHash(vec2(fr, hz + 3.0 * step(0.0, bx))) - 0.5;
  if (bs < 0.9) tone = 0.25;
  pl = max(pl, pmLine(bs - 1.32, LW));
  pl = max(pl, pmLine(bs - 1.86, LW));
  pl = max(pl, pmLine(bs - 2.44, LW));
  if (bs > 0.9 && bs < 2.44) pl = max(pl, pmLine(by - 0.1, LW) * step(0.4, abs(bn.x)));
  if (bs > 0.9 && bs < 2.44) pl = max(pl, pmLine(by + 0.36, LW) * step(0.3, abs(bn.x)));
  if (bs > 5.0) {
    pl = max(pl, pmLine(bs - 5.92, LW));
    pl = max(pl, pmLine(bs - 6.95, LW));
    pl = max(pl, pmLine(bs - 7.95, LW));
    pl = max(pl, pmLine(bs - 8.7, LW));
    if (bn.y > 0.7 && bs < 7.9) pl = max(pl, pmLine(bx, LW));
    // radio / battery access hatch, port side
    if (bx > 0.0 && abs(bn.x) > 0.5) pl = max(pl, pmLine(pmSdBox(vec2(bs - 6.35, by - 0.12), vec2(0.22, 0.14)) - 0.02, LW));
  }
  // cowling fastener rows
  if (bs > 0.95 && bs < 2.4 && abs(bn.x) > 0.4) {
    float k = fract((bs - 0.95) / 0.11) - 0.5;
    float d1 = length(vec2(k * 0.11, by - 0.085));
    float d2 = length(vec2(k * 0.11, by + 0.345));
    pl = max(pl, 0.5 * pmStep(0.0045 - min(d1, d2)));
  }
  // exhaust staining along the sides behind the stacks
  if (bs > 1.5 && bs < 5.0 && ax > 0.2) {
    float yc = 0.02 - 0.03 * (bs - 1.5);
    float w = 0.05 + 0.06 * (bs - 1.5);
    float st = (1.0 - smoothstep(w * 0.3, w, abs(by - yc))) * (1.0 - smoothstep(2.2, 4.8, bs)) * smoothstep(1.5, 2.1, bs);
    float streak = 0.55 + 0.45 * srfNoise(vec3(bs * 3.0, by * 50.0, bx * 5.0));
    col = mix(col, uCSoot, clamp(st * streak * 0.5, 0.0, 0.6));
  }
  // fabric-covered rudder, doped silver
  bool rudder = bs > 9.2 + 0.08 * max(by, 0.0) && by > -0.13 && ax < 0.12;
  // olive drab anti-glare panel: top of the nose, spinner back to the windscreen
  float odEdge = mix(0.2, 0.3, smoothstep(0.9, 3.3, bs));
  float od = pmStep(by - odEdge) * pmStep(3.34 - bs) * pmStep(bs - 0.9) * step(0.0, bn.y + 0.35);
  col *= 1.0 + 0.07 * tone;
  pmRough = 0.38 + 0.1 * tone;
  pmMetal = 0.9;
  if (rudder) { col = uCSilver; pmRough = 0.56; pmMetal = 0.3; pl *= 0.0; }
  col = mix(col, uCOD, od);
  pmRough = mix(pmRough, 0.72, od);
  pmMetal = mix(pmMetal, 0.0, od);
#endif
#ifdef PM_WING
  bool lower = bn.y < 0.0;
  pmRough = 0.56;
  pmMetal = 0.3;
  if (bs < 7.5) {
  // wheel wells and leg bays: open on the lower surface of the centre section
  if (lower && by < -0.35) {
    vec2 q = vec2(ax - ${f(WELL.ax)}, bs - ${f(WELL.s)});
    if (dot(q, q) < ${f(WELL.r * WELL.r)}) discard;
    if (ax > ${f(SLOT.ax0)} && ax < ${f(SLOT.ax1)} && bs > ${f(SLOT.s0)} && bs < ${f(SLOT.s1)}) discard;
  }
  float le = pmLE(ax), te = pmTE(ax), ch = te - le;
  float u = (bs - le) / max(ch, 0.05);
  // aluminium lacquer over puttied skin; bare metal flaps, ailerons and gun-bay doors
  bool ctrl = u > ${f(CTRL.hinge)} && ax > ${f(CTRL.flap0)} && ax < ${f(CTRL.ail1)};
  if (ctrl) {
    tone = pmHash(vec2(floor(ax / 1.4), lower ? 1.0 : 0.0)) - 0.5;
    col = col * 1.12 * (1.0 + 0.05 * tone);
    pmRough = 0.46;
    pmMetal = 0.7;
  }
  if (ax > ${f(CTRL.flap0)} && ax < ${f(CTRL.ail1)}) {
    float hinge = le + ${f(CTRL.hinge)} * ch;
    pl = max(pl, pmLine(bs - hinge, LW) * step(bs, te + 0.01));
    if (bs > hinge) {
      pl = max(pl, pmLine(ax - ${f(CTRL.flap1)}, LW));
      pl = max(pl, pmLine(ax - ${f(CTRL.ail0)}, LW));
      pl = max(pl, pmLine(ax - ${f(CTRL.ail1)}, LW));
      pl = max(pl, pmLine(ax - 1.75, LW));
      if (ax > 3.9 && ax < 4.5) pl = max(pl, pmLine(bs - (te - 0.09), LW));
      if (bs > te - 0.09) { pl = max(pl, pmLine(ax - 3.9, LW)); pl = max(pl, pmLine(ax - 4.5, LW)); }
    }
  }
  if (!lower && ax > 2.3 && ax < 3.2) {
    float g = pmSdBox(vec2(ax - 2.73, u - 0.32), vec2(0.37, 0.2));
    pl = max(pl, pmLine(g * ch, LW) * (lower ? 0.0 : 1.0));
  }
  if (lower) {
    // ammunition / access panels and fuel tank doors
    float p1 = pmSdBox(vec2(ax - 2.73, (u - 0.34) * ch), vec2(0.36, 0.22)) - 0.01;
    float p2 = pmSdBox(vec2(ax - 1.28, (u - 0.42) * ch), vec2(0.3, 0.3)) - 0.02;
    pl = max(pl, pmLine(p1, LW));
    pl = max(pl, pmLine(p2, LW));
  }
  pl = max(pl, pmLine(ax - 0.44, LW) * step(u, 0.95) * step(0.0, u));
  }
#endif
  diffuseColor.rgb = col * (1.0 - 0.45 * pl);
}
#endif
`;

const ROUGH = /* glsl */ `
if (pmRough >= 0.0) roughnessFactor = pmRough;
`;
const METAL = /* glsl */ `
if (pmMetal >= 0.0) metalnessFactor = pmMetal;
`;

type Mode = 'FUSE' | 'WING';
const skinCache = new Map<Mode, THREE.MeshStandardMaterial>();

/** Airframe skin material: natural metal fuselage / tail, or silver-lacquered wing. */
export function skin(mode: Mode): THREE.MeshStandardMaterial {
  let m = skinCache.get(mode);
  if (m) return m;
  m = surface({
    color: mode === 'FUSE' ? COL.metal : COL.silver,
    roughness: 0.35,
    metalness: 0.9,
    colorVar: 0.05,
    varScale: 2.5,
    roughVar: 0.18,
    detail: 'fine',
    detailSize: 0.08,
    detailStrength: 0.06,
    wear: 0.12,
    wearColor: 0xc6c8ca,
    wearMetalness: 1,
    wearRoughness: 0.25,
    dust: 0.03,
    dustHeight: 0.4,
    dustColor: 0x8a8378,
    cavity: 0.3,
    name: 'p51d-skin-' + mode.toLowerCase(),
  });
  const mat = m;
  const base = mat.onBeforeCompile;
  mat.defines = { ...(mat.defines ?? {}), PM_SKIN: '', ['PM_' + mode]: '' };
  mat.customProgramCacheKey = () => 'srf-v1-p51d-' + mode;
  mat.onBeforeCompile = (shader, renderer) => {
    base.call(mat, shader, renderer);
    Object.assign(shader.uniforms, U);
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', PARS + '\nvoid main() {')
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + MAIN)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + ROUGH)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + METAL);
  };
  skinCache.set(mode, mat);
  return mat;
}

const lensCache = new Map<string, THREE.MeshPhysicalMaterial>();

/** Plain palette (memoised by the core library). */
export const P = {
  bare: () => M.aluminium({ color: 0xaeb2b5, roughness: 0.34, metalness: 0.9, wear: 0.1, dust: 0.18, dustHeight: 0.6 }),
  silver: () => M.paint(COL.silver, { roughness: 0.48, metalness: 0.55, wear: 0.15, wearColor: 0xc4c6c8, wearMetalness: 1, dust: 0.25, dustHeight: 0.6 }),
  well: () => M.aluminium({ color: 0x9a9d98, roughness: 0.5, metalness: 0.7, wear: 0.05, dust: 0.2, dustHeight: 0.6, cavity: 0.5, name: 'p51d-well' }),
  oleo: () => M.steel({ color: 0xb0b3b6, roughness: 0.16, metalness: 1, wear: 0, dust: 0.04, bump: 0, colorVar: 0.02 }),
  steel: () => M.steel({ color: 0x5a5d60, roughness: 0.45, wear: 0.3, dust: 0.12 }),
  gun: () => M.gunSteel({ color: 0x222426, wear: 0.2 }),
  rubber: () => M.rubber({ roughness: 0.86, dust: 0.2, dustHeight: 0.12, colorVar: 0.04 }),
  black: () => M.paint(0x19191a, { roughness: 0.55, wear: 0.15, dust: 0.02 }),
  /** vertex-coloured paint (propeller blades black with yellow tips, placards) */
  vpaint: () => M.paint(0xffffff, { vertexColors: true, roughness: 0.52, wear: 0.2, wearColor: 0x9a9ea2, wearMetalness: 0.9, dust: 0.06, colorVar: 0.04, name: 'p51d-vpaint' }),
  interior: () => M.paint(COL.interior, { roughness: 0.68, wear: 0.22, wearColor: 0x8a8d8f, wearMetalness: 0.8, dust: 0.05, colorVar: 0.06, name: 'p51d-interior' }),
  leather: () => M.leather(0x3b2a1c, { roughness: 0.6 }),
  harness: () => M.canvas(0x9a8f74, { dust: 0.04, wear: 0.1 }),
  exhaust: () =>
    M.surface({
      color: 0x3a3532,
      roughness: 0.82,
      metalness: 0.4,
      colorVar: 0.22,
      varScale: 30,
      roughVar: 0.1,
      bump: 0.2,
      bumpScale: 260,
      wear: 0.35,
      wearColor: 0x6a5f55,
      wearMetalness: 0.6,
      wearRoughness: 0.6,
      cavity: 0.5,
      name: 'p51d-exhaust',
    }),
  matrix: () => M.steel({ color: 0x2c2d2b, roughness: 0.6, metalness: 0.6, wear: 0.05, dust: 0.05, bump: 0 }),
  glass: () => M.glass({ tint: 0xe8eff1, opacity: 0.13, roughness: 0.03 }),
  armourGlass: () => M.glass({ tint: 0xbcd6cc, opacity: 0.24, roughness: 0.05 }),
  lens: () => {
    const key = 'p51d-lens';
    let m = lensCache.get(key);
    if (!m) {
      m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.08, metalness: 0, transparent: true, opacity: 0.85, clearcoat: 1, clearcoatRoughness: 0.05 });
      m.name = key;
      m.userData.noShadow = true;
      lensCache.set(key, m);
    }
    return m;
  },
};
