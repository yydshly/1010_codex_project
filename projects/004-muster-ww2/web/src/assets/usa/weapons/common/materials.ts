/**
 * US small-arms material palette (M1 Garand, Thompson M1A1, BAR M1918A2).
 * Every entry is memoised by the material library: same call = same material = one draw call.
 *
 *  park       Parkerized (manganese phosphate) steel: matte, fine crystalline, grey with a slight
 *             green cast - receivers, barrels, gas cylinders, bands, trigger guards, bipods
 *  parkDark   a darker phosphate batch (small parts made by other contractors), so neighbouring
 *             parts of one weapon do not read as one casting
 *  checker    Parkerized butt-plate face with fine checkering (detail map, no geometry)
 *  blued      hot-blued / black-oxide steel: smoother and darker blue-black - springs, screws, pins,
 *             magazines where stated
 *  bright     polished working surfaces (bolt faces, muzzle crown)
 *  recess     near-black openings, bores and slots
 *  walnut*    oil-finished black walnut stocks, grain along +Z (the bore axis); a separate tone per
 *             weapon and a slightly different one for separate handguards
 *  leather    russet-brown M1907 sling leather
 *  web        olive-drab cotton webbing (web slings)
 *  brass      darkened brass sling hooks / D-rings
 *  blackened  blackened steel sling hardware
 */
import { M } from '../../../../core/kit';

const GRAIN: [number, number, number] = [0, 0, 1];

export const USW = {
  park: () =>
    M.gunSteel({
      color: 0x4a4e47,
      roughness: 0.66,
      metalness: 0.5,
      roughVar: 0.14,
      colorVar: 0.07,
      varScale: 16,
      detail: 'fine',
      detailSize: 0.007,
      detailStrength: 0.22,
      wear: 0.28,
      wearColor: 0x7d807b,
      wearMetalness: 0.9,
      wearRoughness: 0.4,
      cavity: 0.38,
      dust: 0.03,
      dustHeight: 0.05,
      name: 'us-w-park',
    }),
  parkDark: () =>
    M.gunSteel({
      color: 0x3a3d38,
      roughness: 0.64,
      metalness: 0.52,
      roughVar: 0.14,
      colorVar: 0.07,
      varScale: 16,
      detail: 'fine',
      detailSize: 0.007,
      detailStrength: 0.22,
      wear: 0.3,
      wearColor: 0x74776f,
      wearMetalness: 0.9,
      wearRoughness: 0.4,
      cavity: 0.4,
      dust: 0.03,
      dustHeight: 0.05,
      name: 'us-w-park-dark',
    }),
  checker: () =>
    M.gunSteel({
      color: 0x42463f,
      roughness: 0.72,
      metalness: 0.45,
      colorVar: 0.05,
      varScale: 16,
      detail: 'knit',
      detailSize: 0.0042,
      detailStrength: 1.5,
      wear: 0.35,
      wearColor: 0x7d807b,
      wearMetalness: 0.9,
      wearRoughness: 0.4,
      cavity: 0.45,
      dust: 0,
      name: 'us-w-checker',
    }),
  blued: () =>
    M.gunSteel({
      color: 0x1b1e23,
      roughness: 0.34,
      metalness: 0.86,
      roughVar: 0.18,
      colorVar: 0.05,
      varScale: 18,
      wear: 0.3,
      wearColor: 0x8a8d90,
      wearRoughness: 0.26,
      cavity: 0.35,
      dust: 0,
      name: 'us-w-blued',
    }),
  bright: () =>
    M.steel({
      color: 0x8b8d8e,
      roughness: 0.28,
      metalness: 0.95,
      colorVar: 0.05,
      varScale: 30,
      roughVar: 0.12,
      bump: 0.01,
      bumpScale: 400,
      wear: 0.1,
      wearColor: 0xb0b2b4,
      dust: 0,
      cavity: 0.5,
      name: 'us-w-bright',
    }),
  recess: () => M.surface({ color: 0x0b0b0c, roughness: 0.75, metalness: 0.3, colorVar: 0.02, cavity: 0, name: 'us-w-recess' }),
  /** M1 Garand: warm, medium-dark oiled walnut. */
  walnutGarand: () =>
    M.wood(0x4a2b18, 0x1c0e06, GRAIN, {
      roughness: 0.52,
      colorVar: 0.1,
      varScale: 7,
      wear: 0.05,
      wearColor: 0x5e3b22,
      clearcoat: 0.18,
      clearcoatRoughness: 0.45,
      dust: 0.04,
      dustHeight: 0.05,
      detail: 'fine',
      detailSize: 0.022,
      detailStrength: 0.07,
      wood: { axis: GRAIN, dark: 0x27150a, ringFreq: 140, figure: 0.8 },
      name: 'us-w-walnut-garand',
    }),
  /** M1 Garand handguards: a slightly lighter, redder piece (typical mixed wood). */
  walnutGarandHg: () =>
    M.wood(0x54321d, 0x220f07, GRAIN, {
      roughness: 0.54,
      colorVar: 0.09,
      varScale: 8,
      wear: 0.06,
      wearColor: 0x66412a,
      clearcoat: 0.16,
      clearcoatRoughness: 0.45,
      dust: 0.04,
      dustHeight: 0.05,
      detail: 'fine',
      detailSize: 0.022,
      detailStrength: 0.07,
      wood: { axis: GRAIN, dark: 0x2c170b, ringFreq: 160, figure: 0.75 },
      name: 'us-w-walnut-garand-hg',
    }),
  /** Thompson M1A1: darker walnut stock, grip and fore-grip. */
  walnutThompson: () =>
    M.wood(0x4c2c19, 0x1d0e07, GRAIN, {
      roughness: 0.5,
      colorVar: 0.1,
      varScale: 8,
      wear: 0.05,
      wearColor: 0x5e3a24,
      clearcoat: 0.2,
      clearcoatRoughness: 0.42,
      dust: 0.03,
      dustHeight: 0.05,
      detail: 'fine',
      detailSize: 0.02,
      detailStrength: 0.07,
      wood: { axis: GRAIN, dark: 0x27140a, ringFreq: 150, figure: 0.8 },
      name: 'us-w-walnut-thompson',
    }),
  /** BAR M1918A2: walnut butt and fore-end, a lighter oil finish. */
  walnutBar: () =>
    M.wood(0x603a22, 0x26130a, GRAIN, {
      roughness: 0.54,
      colorVar: 0.1,
      varScale: 7,
      wear: 0.05,
      wearColor: 0x74492c,
      clearcoat: 0.14,
      clearcoatRoughness: 0.48,
      dust: 0.04,
      dustHeight: 0.05,
      detail: 'fine',
      detailSize: 0.022,
      detailStrength: 0.07,
      wood: { axis: GRAIN, dark: 0x331b0c, ringFreq: 135, figure: 0.85 },
      name: 'us-w-walnut-bar',
    }),
  leather: () =>
    M.leather(0x5a3821, {
      roughness: 0.58,
      detailSize: 0.03,
      detailStrength: 0.5,
      wear: 0.3,
      wearColor: 0x8a5e3a,
      dust: 0,
      name: 'us-w-leather',
    }),
  web: () =>
    M.canvas(0x575539, {
      detailSize: 0.012,
      detailStrength: 0.95,
      wear: 0.12,
      dust: 0.05,
      dustHeight: 0.05,
      name: 'us-w-web',
    }),
  brass: () => M.brass({ color: 0x8c6d3a, roughness: 0.46, colorVar: 0.1, wear: 0.3, wearColor: 0xc7a261, cavity: 0.5, name: 'us-w-brass' }),
  blackened: () =>
    M.gunSteel({ color: 0x25262a, roughness: 0.48, metalness: 0.75, wear: 0.35, wearColor: 0x7c7e81, dust: 0, name: 'us-w-blackened' }),
  thread: () => M.cotton(0x77704f, { detail: 'fine', detailSize: 0.006, detailStrength: 0.3, dust: 0, cavity: 0.1, name: 'us-w-thread' }),
};
