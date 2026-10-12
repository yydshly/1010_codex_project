/**
 * MP 40 material palette. Memoised by the library: same call = same material = one draw call.
 *  - blued: machined / turned parts (barrel, nut, sights, bolt handle, pins)
 *  - stamped: sheet-steel parts (receiver tube, lower housing, magazine housing, magazine, stock)
 *  - bright: the bolt seen through the ejection port and cocking slot
 *  - internal: dark internals (recoil-spring tubes, bore)
 *  - phenolic: reddish-brown moulded phenolic resin (grip plates, lower receiver cover, resting bar)
 *  - leather / leatherLine: the dark-brown sling and its impressed border lines
 */
import { M } from '../../../../core/kit';

export const MAT = {
  blued: () =>
    M.gunSteel({
      color: 0x1e2125,
      roughness: 0.46,
      metalness: 0.8,
      roughVar: 0.14,
      colorVar: 0.06,
      varScale: 16,
      wear: 0.24,
      wearColor: 0x5c5f62,
      wearRoughness: 0.26,
      cavity: 0.35,
      name: 'de-mp40-blued',
    }),
  stamped: () =>
    M.gunSteel({
      color: 0x212327,
      roughness: 0.53,
      metalness: 0.78,
      roughVar: 0.05,
      colorVar: 0.03,
      varScale: 7,
      wear: 0.24,
      wearColor: 0x5e6164,
      wearRoughness: 0.3,
      cavity: 0.4,
      name: 'de-mp40-stamped',
    }),
  bright: () =>
    M.steel({
      color: 0x77787a,
      roughness: 0.3,
      metalness: 0.95,
      colorVar: 0.06,
      varScale: 30,
      bump: 0.015,
      wear: 0.15,
      wearColor: 0xa6a7a8,
      dust: 0,
      cavity: 0.5,
      name: 'de-mp40-bright',
    }),
  internal: () =>
    M.gunSteel({ color: 0x131416, roughness: 0.55, wear: 0.05, cavity: 0.5, name: 'de-mp40-internal' }),
  phenolic: () =>
    M.surface({
      color: 0x221210,
      roughness: 0.4,
      metalness: 0,
      colorVar: 0.08,
      varScale: 30,
      roughVar: 0.18,
      detail: 'fine',
      detailSize: 0.02,
      detailStrength: 0.05,
      wear: 0.28,
      wearColor: 0x5a2c1a,
      wearMetalness: 0,
      wearRoughness: 0.3,
      cavity: 0.45,
      dust: 0.04,
      dustHeight: 0.05,
      clearcoat: 0.22,
      clearcoatRoughness: 0.5,
      name: 'de-mp40-phenolic',
    }),
  leather: () =>
    M.leather(0x1c110b, {
      roughness: 0.58,
      detailSize: 0.018,
      detailStrength: 0.3,
      wear: 0.16,
      wearColor: 0x3a2515,
      name: 'de-mp40-sling',
    }),
  leatherLine: () =>
    M.leather(0x1f130b, { roughness: 0.7, wear: 0, detailStrength: 0.3, cavity: 0.2, name: 'de-mp40-sling-line' }),
};
