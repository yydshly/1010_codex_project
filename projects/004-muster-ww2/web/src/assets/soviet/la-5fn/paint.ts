/**
 * La-5FN paint & materials (1943-44 VVS fighter scheme).
 *
 * The airframe skin uses the core UV-free surface shader, extended here (own shader chunk, no core
 * edits) with a position-based paint layer evaluated in the aircraft BODY frame:
 *  - upper surfaces: AMT-11 grey-blue with soft-edged sprayed AMT-12 dark grey patches,
 *  - lower surfaces: AMT-7 light blue, demarcation low on the fuselage sides,
 *  - restrained panel lines (box-filtered so they never shimmer), exhaust staining,
 *  - open wheel wells and leg slots in the lower wing skin (discard; liners are modelled).
 * The pattern is a generic sprayed two-tone scheme, not a copy of a specific factory template.
 * National markings are separate conforming decals (markings.ts).
 */
import * as THREE from 'three';
import { M } from '../../../core/kit';
import { surface } from '../../../core/materials/surface';
import { ASSET_TO_BODY, WG, DIM } from './frame';

export const AMT = {
  c11: 0x6c7c86,
  c12: 0x474c52,
  c7: 0x8fa6b6,
  interior: 0x5b5f58,
  red: 0xa8231c,
  white: 0xecebe4,
};

const U = {
  uLaInv: { value: ASSET_TO_BODY.clone() },
  uC11: { value: new THREE.Color(AMT.c11) },
  uC12: { value: new THREE.Color(AMT.c12) },
  uC7: { value: new THREE.Color(AMT.c7) },
  uCSoot: { value: new THREE.Color(0x2a2724) },
  /** wheel well x, s, r, slot half width */
  uWell: { value: new THREE.Vector4(WG.well.x, WG.well.s, WG.well.r, WG.well.slotHalf) },
  /** planform: le0, leK, te0, teK */
  uPlan: { value: new THREE.Vector4(WG.le0, WG.leK, WG.te0, WG.teK) },
  /** leg slot: pivot x, pivot s */
  uPiv: { value: new THREE.Vector2(DIM.pivot.x, DIM.pivot.s) },
  uSlot: { value: WG.slotX0 },
  uSlat: { value: new THREE.Vector2(WG.slat0, WG.slat1) },
};

const PARS = /* glsl */ `
uniform mat4 uLaInv;
uniform vec3 uC11, uC12, uC7, uCSoot;
uniform vec4 uWell, uPlan;
uniform vec2 uPiv, uSlat;
uniform float uSlot;
float laStep(float d) { float w = max(fwidth(d), 1e-6); return clamp(d / w + 0.5, 0.0, 1.0); }
float laLine(float d, float w) {
  float fw = max(fwidth(d), 1e-6);
  float a = abs(d);
  float lo = max(a - 0.5 * fw, -w), hi = min(a + 0.5 * fw, w);
  return clamp((hi - lo) / fw, 0.0, 1.0);
}
float laBox(vec2 p, vec2 h) { vec2 q = abs(p) - h; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
// sprayed AMT-12 patches over AMT-11 (soft but defined edges); p in body metres
vec3 laCamo(vec3 p) {
  vec3 q = p * vec3(0.55, 0.55, 0.42) + 0.35 * vec3(srfFbm(p * 0.9 + 3.0), srfFbm(p * 0.9 + 11.0), srfFbm(p * 0.9 + 17.0));
  float n = srfFbm(q + vec3(1.7, 4.2, 9.1)) + 0.03 * (srfNoise(p * 24.0) - 0.5);
  float m = smoothstep(0.5 - 0.022, 0.5 + 0.022, n);
  return mix(uC11, uC12, m);
}
`;

const MAIN = /* glsl */ `
#ifdef LA_SKIN
{
  vec3 bp = (uLaInv * vec4(vSrfPos, 1.0)).xyz;
  vec3 bn = normalize(mat3(uLaInv) * normalize(vSrfNrm));
  float bs = -bp.z;
  float bx = bp.x;
  float by = bp.y;
  float ax = abs(bx);
  vec3 col = uC7;
  float pl = 0.0;
  const float LW = 0.0009;
  vec3 camo = laCamo(bp);
#ifdef LA_FUSE
  // demarcation: slightly wavy line low on the fuselage sides, following the wing root
  float wave = 0.03 * sin(bs * 2.3) + 0.04 * (srfFbm(vec3(bs * 1.3, 0.0, 2.0)) - 0.5);
  float dem = mix(-0.34, -0.2, smoothstep(4.4, 7.5, bs)) + wave;
  float up = smoothstep(dem - 0.012, dem + 0.012, by);
  col = mix(uC7, camo, up);
  // exhaust staining behind the side stubs, fanning out along the heat plate and wing root
  if (bs > 1.35 && bs < 4.4 && ax > 0.2) {
    float yc = -0.12 - 0.05 * (bs - 1.4);
    float w = 0.09 + 0.08 * (bs - 1.4);
    float st = (1.0 - smoothstep(w * 0.45, w, abs(by - yc))) * (1.0 - smoothstep(2.1, 4.2, bs)) * smoothstep(1.35, 1.55, bs);
    float streak = 0.6 + 0.4 * srfNoise(vec3(bs * 3.0, by * 55.0, bx * 5.0));
    col = mix(col, uCSoot, clamp(st * streak * 0.55, 0.0, 0.7));
  }
  // panel lines: cowling rings and access panels
  pl = max(pl, laLine(bs - 0.9, LW));
  pl = max(pl, laLine(bs - 1.34, LW));
  if (bs > 0.5 && bs < 1.34 && abs(bn.x) > 0.55) pl = max(pl, laLine(by - 0.02, LW));
  pl = max(pl, laLine(bs - 2.02, LW));
  if (bs > 2.02 && bs < 3.02 && by > 0.3) {
    // gun-bay cover ahead of the windscreen
    pl = max(pl, laLine(ax - 0.3, LW));
    pl = max(pl, laLine(bs - 2.95, LW) * step(ax, 0.3));
  }
  // cowl fastener heads along the cowling joints
  if (bs > 0.55 && bs < 1.3 && abs(bn.x) > 0.4) {
    float k = fract((bs - 0.55) / 0.12) - 0.5;
    float d1 = length(vec2(k * 0.12, by - 0.02));
    pl = max(pl, 0.6 * laStep(0.006 - d1));
  }
  if (bs > 4.3) {
    // wooden monocoque rear fuselage: few joints, a hand-hold / hatch on the port side
    pl = max(pl, laLine(bs - 6.9, LW) * 0.7);
    if (bx > 0.0 && abs(bn.x) > 0.5) {
      float h = laBox(vec2(bs - 5.25, by - 0.05), vec2(0.18, 0.14)) - 0.02;
      pl = max(pl, laLine(h, LW));
    }
  }
#endif
#ifdef LA_WING
  bool lower = bn.y < 0.02;
  // wheel wells and leg slots: open on the lower surface
  if (lower && ax > 0.2 && ax < 1.7 && bs > 2.0 && bs < 3.1 && by < -0.2) {
    if (ax > uSlot && ax < uPiv.x + 0.06 && abs(bs - uPiv.y) < uWell.w) discard;
    // closed inner wheel-well door outline
    vec2 q = vec2(ax - uWell.x, bs - uWell.y);
    float dd = laBox(q, vec2(uWell.z - 0.03, uWell.z - 0.03)) - 0.03;
    pl = max(pl, laLine(dd, LW) * step(0.12, ax));
  }
  float le = uPlan.x + uPlan.y * ax, te = uPlan.z - uPlan.w * ax, ch = te - le;
  float u = (bs - le) / max(ch, 0.05);
  // upper colours wrap a few cm round the leading edge
  col = mix(uC7, camo, lower ? step(u, 0.012) : 1.0);
  // flaps (inner) and ailerons (outer)
  if (ax > 0.55) {
    float hinge = le + 0.76 * ch;
    pl = max(pl, laLine(bs - hinge, LW) * step(0.0, bs - le - 0.3) * step(ax, 4.45));
    if (bs > hinge && ax < 4.45) {
      pl = max(pl, laLine(ax - 0.55, LW));
      pl = max(pl, laLine(ax - 2.45, LW));
      pl = max(pl, laLine(ax - 4.45, LW));
    }
  }
  // leading-edge slats on the outer panels
  if (ax > uSlat.x - 0.02 && ax < uSlat.y + 0.02 && u < 0.2) {
    pl = max(pl, laLine(u - 0.16, LW * 1.2 / max(ch, 0.3)) * step(uSlat.x, ax) * step(ax, uSlat.y));
    if (u < 0.16) { pl = max(pl, laLine(ax - uSlat.x, LW)); pl = max(pl, laLine(ax - uSlat.y, LW)); }
  }
  // centre section / outer panel joint and the fuselage fillet line
  pl = max(pl, laLine(ax - 1.62, LW) * step(bs, le + 0.76 * ch));
  pl = max(pl, laLine(ax - 0.5, LW) * step(bs, le + 0.9 * ch));
  // wing-root walkway: slightly rubbed paint (port)
  if (!lower && bx > 0.5 && bx < 1.0 && u > 0.4 && u < 0.9) {
    float rub = smoothstep(0.55, 0.85, srfFbm(bp * 18.0)) * 0.45;
    col = mix(col, col * 1.16 + vec3(0.02), rub);
  }
#endif
#ifdef LA_TAIL
  bool fin = abs(bn.x) > 0.6;
  if (fin) {
    col = camo;
    if (by < 0.2) col = mix(uC7, camo, smoothstep(0.1, 0.14, by));
  } else {
    col = bn.y > 0.0 ? camo : uC7;
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
    roughness: 0.62,
    metalness: 0,
    colorVar: 0.06,
    varScale: 1.8,
    roughVar: 0.16,
    detail: 'fine',
    detailSize: 0.07,
    detailStrength: 0.2,
    wear: 0.18,
    wearColor: 0x8a8f92,
    wearMetalness: 0.7,
    wearRoughness: 0.4,
    dust: 0.12,
    dustHeight: 0.7,
    dustColor: 0x968b77,
    cavity: 0.3,
    name: 'la5fn-skin-' + mode.toLowerCase(),
  });
  const mat = m;
  const base = mat.onBeforeCompile;
  mat.defines = { ...(mat.defines ?? {}), LA_SKIN: '', ['LA_' + mode]: '' };
  mat.customProgramCacheKey = () => 'srf-v3-la5fn-' + mode;
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
  /** AMT-7 light blue (gear legs, covers, wheel hubs, lower parts) */
  amt7: () => M.paint(AMT.c7, { roughness: 0.6, wear: 0.24, wearColor: 0x8a8f92, wearMetalness: 0.7, dust: 0.25, dustHeight: 0.8, name: 'la5fn-amt7' }),
  /** AMT-12 dark grey (spinner, intake) */
  amt12: () => M.paint(AMT.c12, { roughness: 0.58, wear: 0.2, wearColor: 0x80847f, wearMetalness: 0.6, dust: 0.08, colorVar: 0.05, name: 'la5fn-amt12' }),
  interior: () =>
    M.paint(AMT.interior, { roughness: 0.66, wear: 0.28, wearColor: 0x7d8083, wearMetalness: 0.8, dust: 0.06, colorVar: 0.06, name: 'la5fn-interior' }),
  frame: () => M.paint(AMT.c11, { roughness: 0.58, wear: 0.08, colorVar: 0.03, detailStrength: 0.12, dust: 0.02, cavity: 0.2, name: 'la5fn-canopy-frame' }),
  black: () => M.paint(0x1a1b1b, { roughness: 0.52, wear: 0.16, wearColor: 0x5c5e60, dust: 0.03, name: 'la5fn-black' }),
  blade: () => M.paint(0x1c1d1c, { roughness: 0.5, wear: 0.2, wearColor: 0x6e7072, dust: 0.06, dustHeight: 1.0, name: 'la5fn-blade' }),
  rubber: () => M.rubber({ roughness: 0.86, dust: 0.18, dustHeight: 0.12, colorVar: 0.04 }),
  oleo: () => M.steel({ color: 0x9a9da0, roughness: 0.2, metalness: 1, wear: 0, dust: 0.05, bump: 0, colorVar: 0.03 }),
  steel: () => M.steel({ color: 0x55585b, roughness: 0.45, wear: 0.35, dust: 0.15 }),
  heat: () => M.steel({ color: 0x6a6660, roughness: 0.55, metalness: 0.8, wear: 0.3, dust: 0.1, colorVar: 0.12, name: 'la5fn-heatplate' }),
  gun: () => M.gunSteel({ color: 0x242628, wear: 0.3 }),
  engine: () => M.steel({ color: 0x3a3c3c, roughness: 0.5, metalness: 0.7, wear: 0.25, dust: 0.08, bump: 0, name: 'la5fn-engine' }),
  exhaust: () =>
    M.surface({
      color: 0x4a3a2e,
      roughness: 0.82,
      metalness: 0.4,
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
      name: 'la5fn-exhaust',
    }),
  glass: () => M.glass({ tint: 0xe6eef0, opacity: 0.14, roughness: 0.03 }),
  armourGlass: () => M.glass({ tint: 0xc6ddd2, opacity: 0.22, roughness: 0.05 }),
  wire: () => M.steel({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.5, wear: 0, dust: 0, name: 'la5fn-wire' }),
  lens: () => {
    const key = 'la5fn-lens';
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

/** Five-pointed star outline (canvas coords), centre cx, cy, outer radius R. */
function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  const r = R * 0.382; // regular pentagram inner radius
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? R : r;
    const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Red star with a white border and a thin red outline (the style ordered in 1943); the star
 * fills the square canvas, tip up.
 */
export function drawStar(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.53, R = w * 0.5;
  const red = '#' + new THREE.Color(AMT.red).getHexString();
  const white = '#' + new THREE.Color(AMT.white).getHexString();
  starPath(ctx, cx, cy, R * 0.985);
  ctx.fillStyle = red;
  ctx.fill();
  starPath(ctx, cx, cy, R * 0.93);
  ctx.fillStyle = white;
  ctx.fill();
  starPath(ctx, cx, cy, R * 0.72);
  ctx.fillStyle = red;
  ctx.fill();
}
