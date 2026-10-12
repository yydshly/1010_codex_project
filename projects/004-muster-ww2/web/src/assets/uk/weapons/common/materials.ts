/**
 * United Kingdom small-arms material palette (Rifle No. 4 Mk I, Sten Mk II, Bren Mk II).
 * Every entry is memoised by the material library: same call = same material = one draw call.
 *
 *  beech / beechGuard  oiled beech furniture of a wartime No. 4 rifle (grain along +Z); the handguards
 *                      are separate pieces with a slightly different tone so the joints read
 *  walnut              oiled walnut Bren butt and pistol grip
 *  black               black-finished (phosphated + enamelled) machined steel: receivers, barrels, bands,
 *                      sights, trigger guards
 *  blued               smoother hot-blued small parts (sight leaves, screws, Bren body)
 *  stamped             black-painted sheet-steel stampings (Sten body tube, trigger housing, magazines,
 *                      skeleton butt), slightly rougher and more worn
 *  bright              steel "in the white" (No. 4 bolt, Sten cocking handle)
 *  brass               brass butt plate and web-sling fittings
 *  recess              near-black bores, slots and deep openings
 *  web                 British khaki cotton webbing (slings)
 */
import { M } from '../../../../core/kit';

const GRAIN: [number, number, number] = [0, 0, 1];

export const UKW = {
  beech: () =>
    M.wood(0x5f3b22, 0x40261a, GRAIN, {
      roughness: 0.52,
      colorVar: 0.08,
      varScale: 8,
      wear: 0.22,
      wearColor: 0x9a6a40,
      clearcoat: 0.16,
      clearcoatRoughness: 0.45,
      dust: 0.04,
      dustHeight: 0.05,
      detail: 'fine',
      detailSize: 0.016,
      detailStrength: 0.09,
      wood: { axis: GRAIN, dark: 0x442817, ringFreq: 120, figure: 0.8 },
      name: 'uk-w-beech',
    }),
  beechGuard: () =>
    M.wood(0x65402a, 0x44291a, GRAIN, {
      roughness: 0.54,
      colorVar: 0.08,
      varScale: 9,
      wear: 0.26,
      wearColor: 0xa0714a,
      clearcoat: 0.14,
      clearcoatRoughness: 0.48,
      detail: 'fine',
      detailSize: 0.016,
      detailStrength: 0.09,
      wood: { axis: GRAIN, dark: 0x4a2c1b, ringFreq: 130, figure: 0.75 },
      name: 'uk-w-beech-guard',
    }),
  walnut: () =>
    M.wood(0x4a2a17, 0x1d0e06, GRAIN, {
      roughness: 0.5,
      colorVar: 0.09,
      varScale: 7,
      wear: 0.24,
      wearColor: 0x7c5230,
      clearcoat: 0.2,
      clearcoatRoughness: 0.42,
      dust: 0.04,
      dustHeight: 0.05,
      detail: 'fine',
      detailSize: 0.022,
      detailStrength: 0.07,
      wood: { axis: GRAIN, dark: 0x2a160a, ringFreq: 150, figure: 0.85 },
      name: 'uk-w-walnut',
    }),
  black: () =>
    M.gunSteel({
      color: 0x1c1d1f,
      roughness: 0.5,
      roughVar: 0.18,
      metalness: 0.62,
      colorVar: 0.05,
      varScale: 16,
      detail: 'fine',
      detailSize: 0.012,
      detailStrength: 0.1,
      wear: 0.3,
      wearColor: 0x7d8083,
      wearRoughness: 0.3,
      cavity: 0.38,
      dust: 0.03,
      dustHeight: 0.05,
      name: 'uk-w-black',
    }),
  blued: () =>
    M.gunSteel({
      color: 0x202328,
      roughness: 0.38,
      roughVar: 0.18,
      colorVar: 0.05,
      varScale: 18,
      wear: 0.34,
      wearColor: 0x8a8d90,
      wearRoughness: 0.26,
      cavity: 0.36,
      dust: 0.02,
      dustHeight: 0.05,
      name: 'uk-w-blued',
    }),
  stamped: () =>
    M.gunSteel({
      color: 0x1e1f21,
      roughness: 0.58,
      roughVar: 0.22,
      metalness: 0.5,
      colorVar: 0.07,
      varScale: 10,
      detail: 'fine',
      detailSize: 0.014,
      detailStrength: 0.14,
      wear: 0.36,
      wearColor: 0x75787b,
      wearRoughness: 0.32,
      cavity: 0.42,
      dust: 0.04,
      dustHeight: 0.05,
      name: 'uk-w-stamped',
    }),
  bright: () =>
    M.steel({
      color: 0x8a8c8e,
      roughness: 0.28,
      metalness: 0.95,
      colorVar: 0.05,
      varScale: 28,
      roughVar: 0.12,
      bump: 0.01,
      bumpScale: 400,
      wear: 0.12,
      wearColor: 0xb2b4b6,
      dust: 0,
      cavity: 0.5,
      name: 'uk-w-bright',
    }),
  brass: () =>
    M.brass({
      color: 0x76603c,
      roughness: 0.55,
      colorVar: 0.12,
      varScale: 14,
      wear: 0.3,
      wearColor: 0xb39460,
      wearMetalness: 1,
      wearRoughness: 0.25,
      cavity: 0.5,
      name: 'uk-w-brass',
    }),
  recess: () => M.surface({ color: 0x0b0b0c, roughness: 0.72, metalness: 0.3, colorVar: 0.02, cavity: 0, name: 'uk-w-recess' }),
  web: () =>
    M.canvas(0x6e6749, {
      detailSize: 0.009,
      detailStrength: 0.9,
      colorVar: 0.08,
      wear: 0.14,
      dust: 0.06,
      dustHeight: 0.05,
      name: 'uk-w-web',
    }),
  /** Marking-white for range graduations on sight leaves. */
  marks: () => M.surface({ color: 0x9a9a92, roughness: 0.6, metalness: 0.2, colorVar: 0.03, cavity: 0, name: 'uk-w-marks' }),
};

export type UkwMats = { [K in keyof typeof UKW]: ReturnType<(typeof UKW)[K]> };

/** Resolve the whole palette once (materials are memoised anyway). */
export function ukwMaterials(): UkwMats {
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(UKW) as (keyof typeof UKW)[]) out[k] = UKW[k]();
  return out as UkwMats;
}
