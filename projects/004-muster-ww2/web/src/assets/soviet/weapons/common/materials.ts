/**
 * Soviet small-arms material palette (Mosin-Nagant M1891/30, PPSh-41, DP-27).
 * Every entry is memoised by the material library: same call = same material = one draw call.
 *
 *  blued      machined, hot-blued steel (barrels, receivers, sights, bands, screws)
 *  stamped    sheet-steel stampings with a slightly rougher black finish (PPSh receiver/jacket, drum, guards)
 *  bright     steel left "in the white" (Mosin bolt, polished working surfaces)
 *  internal   near-black bores and deep openings
 *  birch*     shellac/oil finished birch stocks (reddish brown), grain along +Z (weapon bore axis);
 *             the DP-27 butt uses its own palette entry (dp27/materials.ts)
 *  canvas     khaki cotton webbing slings
 *  leather    brown leather (Mosin dog collars, tabs)
 */
import { M } from '../../../../core/kit';

const GRAIN: [number, number, number] = [0, 0, 1];

export const SUW = {
  blued: () =>
    M.gunSteel({
      color: 0x1d2024,
      roughness: 0.34,
      roughVar: 0.2,
      colorVar: 0.06,
      varScale: 18,
      wear: 0.32,
      wearColor: 0x8a8d90,
      wearRoughness: 0.26,
      cavity: 0.35,
      dust: 0,
      name: 'su-w-blued',
    }),
  stamped: () =>
    M.gunSteel({
      color: 0x202226,
      roughness: 0.44,
      roughVar: 0.22,
      colorVar: 0.07,
      varScale: 11,
      detail: 'fine',
      detailSize: 0.014,
      detailStrength: 0.12,
      wear: 0.3,
      wearColor: 0x7f8285,
      wearRoughness: 0.3,
      cavity: 0.4,
      dust: 0,
      name: 'su-w-stamped',
    }),
  bright: () =>
    M.steel({
      color: 0x86888a,
      roughness: 0.27,
      metalness: 0.96,
      colorVar: 0.05,
      varScale: 30,
      roughVar: 0.12,
      bump: 0.01,
      bumpScale: 400,
      wear: 0.12,
      wearColor: 0xb0b2b4,
      dust: 0,
      cavity: 0.5,
      name: 'su-w-bright',
    }),
  internal: () => M.gunSteel({ color: 0x0c0d0f, roughness: 0.62, wear: 0, cavity: 0.2, dust: 0, name: 'su-w-internal' }),
  /** Mosin 91/30 wartime birch stock, reddish shellac. */
  birchMosin: () =>
    M.wood(0x4d2517, 0x230e06, GRAIN, {
      roughness: 0.5,
      colorVar: 0.11,
      detailStrength: 0.14,
      clearcoat: 0.16,
      clearcoatRoughness: 0.45,
      wear: 0.14,
      wearColor: 0x76492c,
      dust: 0,
      wood: { axis: GRAIN, dark: 0x230e06, ringFreq: 160, figure: 0.55 },
      name: 'su-w-birch-mosin',
    }),
  /** PPSh-41 birch stock: darker, redder oil/shellac finish. */
  birchPpsh: () =>
    M.wood(0x482114, 0x1f0b05, GRAIN, {
      roughness: 0.5,
      colorVar: 0.11,
      detailStrength: 0.16,
      clearcoat: 0.14,
      clearcoatRoughness: 0.4,
      wear: 0.14,
      wearColor: 0x8c5a36,
      dust: 0,
      name: 'su-w-birch-ppsh',
    }),
  canvas: () =>
    M.canvas(0x6b6547, {
      detailSize: 0.011,
      detailStrength: 0.95,
      wear: 0.12,
      dust: 0.06,
      dustHeight: 0.05,
      name: 'su-w-canvas',
    }),
  leather: () =>
    M.leather(0x4c2e19, { roughness: 0.55, detailSize: 0.026, detailStrength: 0.5, wear: 0.3, wearColor: 0x7a5234, dust: 0, name: 'su-w-leather' }),
  /** Stitching thread on slings. */
  thread: () => M.cotton(0x9a9270, { detail: 'fine', detailSize: 0.006, detailStrength: 0.3, dust: 0, cavity: 0.1, name: 'su-w-thread' }),
};
