/**
 * Japanese small-arms material palette (Type 99 rifle, Type 99 light machine gun).
 * Every entry is memoised by the material library: same call = same material = one draw call.
 *
 *  blued      hot-blued steel, blue-black, satin - barrels, receivers, bands, guards
 *  bluedDark  a darker, duller blued batch (small parts, bolt shroud, magazine), so neighbouring
 *             parts do not read as one casting
 *  bright     polished working surfaces (bolt body "in the white", bolt faces, muzzle crown)
 *  recess     near-black openings, bores and slots
 *  chestnut   Japanese chestnut / elm-type stock wood with a reddish-brown shellac finish; grain +Z
 *  chestnutB  the separate lower butt piece of the two-piece stock (grain set at another angle, a
 *             slightly different tone)
 *  chestnutHg upper handguard (separate piece, slightly lighter)
 *  gripWood   the LMG pistol grip and butt (plainer, darker oil finish)
 *  leather    brown leather sling
 *  canvas     khaki canvas sling (LMG)
 *  blackened  blackened steel sling hardware / enamel-finished butt plate
 */
import { M } from '../../../../core/kit';

const GRAIN: [number, number, number] = [0, 0, 1];

export const JPW = {
  blued: () =>
    M.gunSteel({
      color: 0x1d2027,
      roughness: 0.38,
      metalness: 0.82,
      roughVar: 0.16,
      colorVar: 0.06,
      varScale: 16,
      detail: 'fine',
      detailSize: 0.006,
      detailStrength: 0.12,
      wear: 0.34,
      wearColor: 0x80838a,
      wearMetalness: 0.95,
      wearRoughness: 0.3,
      cavity: 0.36,
      dust: 0.02,
      dustHeight: 0.05,
      name: 'jp-w-blued',
    }),
  bluedDark: () =>
    M.gunSteel({
      color: 0x17191d,
      roughness: 0.46,
      metalness: 0.78,
      roughVar: 0.16,
      colorVar: 0.06,
      varScale: 16,
      detail: 'fine',
      detailSize: 0.006,
      detailStrength: 0.14,
      wear: 0.3,
      wearColor: 0x74777c,
      wearMetalness: 0.95,
      wearRoughness: 0.32,
      cavity: 0.4,
      dust: 0.02,
      dustHeight: 0.05,
      name: 'jp-w-blued-dark',
    }),
  bright: () =>
    M.steel({
      color: 0x8a8c8e,
      roughness: 0.3,
      metalness: 0.95,
      colorVar: 0.06,
      varScale: 30,
      roughVar: 0.12,
      bump: 0.01,
      bumpScale: 400,
      wear: 0.1,
      wearColor: 0xb0b2b4,
      dust: 0,
      cavity: 0.5,
      name: 'jp-w-bright',
    }),
  recess: () => M.surface({ color: 0x0b0b0c, roughness: 0.75, metalness: 0.3, colorVar: 0.02, cavity: 0, name: 'jp-w-recess' }),
  chestnut: () =>
    M.wood(0x4c2512, 0x1e0c04, GRAIN, {
      roughness: 0.5,
      colorVar: 0.1,
      varScale: 7,
      wear: 0.07,
      wearColor: 0x8a5530,
      clearcoat: 0.2,
      clearcoatRoughness: 0.42,
      dust: 0.04,
      dustHeight: 0.05,
      detail: 'fine',
      detailSize: 0.02,
      detailStrength: 0.08,
      wood: { axis: GRAIN, dark: 0x2c1205, ringFreq: 150, figure: 0.75 },
      name: 'jp-w-chestnut',
    }),
  chestnutB: () =>
    M.wood(0x46210f, 0x1b0a03, [0, 0.28, 0.96], {
      roughness: 0.52,
      colorVar: 0.1,
      varScale: 7,
      wear: 0.08,
      wearColor: 0x84512e,
      clearcoat: 0.18,
      clearcoatRoughness: 0.44,
      dust: 0.04,
      dustHeight: 0.05,
      detail: 'fine',
      detailSize: 0.02,
      detailStrength: 0.08,
      wood: { axis: [0, 0.28, 0.96], dark: 0x281005, ringFreq: 160, figure: 0.75 },
      name: 'jp-w-chestnut-b',
    }),
  chestnutHg: () =>
    M.wood(0x532a15, 0x210e05, GRAIN, {
      roughness: 0.52,
      colorVar: 0.1,
      varScale: 8,
      wear: 0.08,
      wearColor: 0x925c34,
      clearcoat: 0.16,
      clearcoatRoughness: 0.45,
      dust: 0.04,
      dustHeight: 0.05,
      detail: 'fine',
      detailSize: 0.02,
      detailStrength: 0.08,
      wood: { axis: GRAIN, dark: 0x311507, ringFreq: 170, figure: 0.75 },
      name: 'jp-w-chestnut-hg',
    }),
  gripWood: () =>
    M.wood(0x553018, 0x1f0e05, GRAIN, {
      roughness: 0.56,
      colorVar: 0.1,
      varScale: 7,
      wear: 0.08,
      wearColor: 0x77492a,
      clearcoat: 0.1,
      clearcoatRoughness: 0.5,
      dust: 0.05,
      dustHeight: 0.05,
      detail: 'fine',
      detailSize: 0.02,
      detailStrength: 0.08,
      wood: { axis: GRAIN, dark: 0x2a1407, ringFreq: 120, figure: 0.85 },
      name: 'jp-w-grip-wood',
    }),
  leather: () =>
    M.leather(0x2e1c10, {
      roughness: 0.6,
      detailSize: 0.03,
      detailStrength: 0.5,
      wear: 0.22,
      wearColor: 0x5e3e26,
      dust: 0,
      name: 'jp-w-leather',
    }),
  canvas: () =>
    M.canvas(0x5f5639, {
      detailSize: 0.012,
      detailStrength: 0.9,
      wear: 0.12,
      dust: 0.05,
      dustHeight: 0.05,
      name: 'jp-w-canvas',
    }),
  blackened: () =>
    M.gunSteel({ color: 0x232427, roughness: 0.5, metalness: 0.72, wear: 0.35, wearColor: 0x7c7e81, dust: 0, name: 'jp-w-blackened' }),
};

export type JpwMats = { [K in keyof typeof JPW]: ReturnType<(typeof JPW)[K]> };

export function jpwMaterials(): JpwMats {
  const out = {} as Record<string, unknown>;
  for (const k of Object.keys(JPW) as (keyof typeof JPW)[]) out[k] = JPW[k]();
  return out as JpwMats;
}
