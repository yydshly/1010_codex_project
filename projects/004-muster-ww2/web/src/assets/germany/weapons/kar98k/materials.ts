/**
 * Kar98k material palette (memoised by the kit: one draw call per material after baking).
 *  - walnut / handguard: oiled walnut, grain along the stock (+Z); the handguard is a separate,
 *    slightly lighter piece so the joint reads
 *  - blued: blued machined steel (barrel, receiver, bands, sights, trigger guard, butt plate)
 *  - bright: the bolt body and handle, left "in the white" (polished steel)
 *  - dark: recesses (screw slots, bore, openings)
 *  - leather / sling steel: the issue leather sling and its fittings
 */
import { M } from '../../../../core/kit';

export function k98Materials() {
  return {
    walnut: M.wood(0x4e2e1a, 0x1c0e06, [0, 0, 1], {
      roughness: 0.5,
      colorVar: 0.09,
      varScale: 7,
      wear: 0.26,
      wearColor: 0x80552f,
      clearcoat: 0.22,
      clearcoatRoughness: 0.42,
      dust: 0.05,
      dustHeight: 0.05,
      // isotropic micro detail only: the core wood detail map streaks across the grain on side faces
      detail: 'fine',
      detailSize: 0.022,
      detailStrength: 0.07,
      wood: { axis: [0, 0, 1], dark: 0x2c190c, ringFreq: 150, figure: 0.85 },
      name: 'k98-walnut',
    }),
    handguard: M.wood(0x573520, 0x201008, [0, 0, 1], {
      roughness: 0.52,
      colorVar: 0.08,
      varScale: 8,
      wear: 0.3,
      wearColor: 0x86593a,
      clearcoat: 0.2,
      clearcoatRoughness: 0.45,
      detail: 'fine',
      detailSize: 0.022,
      detailStrength: 0.07,
      wood: { axis: [0, 0, 1], dark: 0x331d0f, ringFreq: 165, figure: 0.8 },
      name: 'k98-handguard',
    }),
    blued: M.gunSteel({
      color: 0x22252a,
      roughness: 0.4,
      roughVar: 0.2,
      colorVar: 0.05,
      varScale: 18,
      wear: 0.36,
      wearColor: 0x888b8e,
      wearRoughness: 0.27,
      cavity: 0.38,
      dust: 0.04,
      dustHeight: 0.05,
      name: 'k98-blued',
    }),
    bright: M.steel({
      color: 0x8e8f90,
      roughness: 0.27,
      metalness: 0.95,
      colorVar: 0.05,
      varScale: 26,
      bump: 0.01,
      wear: 0.12,
      wearColor: 0xb4b5b6,
      dust: 0,
      cavity: 0.5,
      name: 'k98-bolt-bright',
    }),
    dark: M.surface({ color: 0x0b0b0c, roughness: 0.72, metalness: 0.3, colorVar: 0.02, cavity: 0, name: 'k98-recess' }),
    leather: M.leather(0x261a14, {
      roughness: 0.6,
      detailSize: 0.03,
      detailStrength: 0.55,
      wear: 0.3,
      wearColor: 0x4a3324,
      name: 'k98-sling-leather',
    }),
    slingSteel: M.gunSteel({ color: 0x1f2124, roughness: 0.42, metalness: 0.8, wear: 0.35, wearColor: 0x77797c, name: 'k98-sling-steel' }),
  };
}

export type K98Mats = ReturnType<typeof k98Materials>;
