/**
 * Bren Mk II palette: the shared UK small-arms palette (common/materials.ts) with the Bren's own darker,
 * browner oiled walnut for the butt, pistol grip and carrying-handle grip (wartime Brens show a deep
 * brown walnut rather than the lighter beech of the rifles), and an evener black finish for the body.
 */
import { M } from '../../../../core/kit';
import { ukwMaterials, type UkwMats } from '../common/materials';

const GRAIN: [number, number, number] = [0, 0, 1];

export const brenWalnut = () =>
  M.wood(0x2f190c, 0x120703, GRAIN, {
    roughness: 0.56,
    colorVar: 0.12,
    varScale: 6,
    roughVar: 0.1,
    wear: 0.2,
    wearColor: 0x5e3a1f,
    clearcoat: 0.1,
    clearcoatRoughness: 0.5,
    dust: 0.04,
    dustHeight: 0.05,
    detail: 'wood',
    detailSize: 0.07,
    detailStrength: 0.22,
    wood: { axis: GRAIN, dark: 0x160904, ringFreq: 95, figure: 0.95 },
    name: 'uk-w-bren-walnut',
  });

/** Black-finished machined steel of the Bren body, barrel and fittings (evener than the shared black). */
export const brenBlack = () =>
  M.gunSteel({
    color: 0x1e1f21,
    roughness: 0.47,
    roughVar: 0.07,
    metalness: 0.62,
    colorVar: 0.03,
    varScale: 24,
    detail: 'fine',
    detailSize: 0.012,
    detailStrength: 0.08,
    wear: 0.3,
    wearColor: 0x7e8184,
    wearRoughness: 0.3,
    cavity: 0.4,
    dust: 0.02,
    dustHeight: 0.05,
    name: 'uk-w-bren-black',
  });

/** Black-painted sheet steel of the magazine (satin paint: flat faces must not mirror the sky). */
export const brenMagPaint = () =>
  M.gunSteel({
    color: 0x1b1c1e,
    roughness: 0.66,
    roughVar: 0.1,
    metalness: 0.32,
    colorVar: 0.05,
    varScale: 12,
    detail: 'fine',
    detailSize: 0.014,
    detailStrength: 0.12,
    wear: 0.38,
    wearColor: 0x74777a,
    wearMetalness: 0.9,
    wearRoughness: 0.34,
    cavity: 0.42,
    dust: 0.03,
    dustHeight: 0.05,
    name: 'uk-w-bren-mag',
  });

/** Shared UK palette with the Bren walnut, body black and magazine paint in place of the generic ones. */
export function brenMaterials(): UkwMats {
  const m = ukwMaterials();
  return { ...m, walnut: brenWalnut() as UkwMats['walnut'], black: brenBlack() as UkwMats['black'], stamped: brenMagPaint() as UkwMats['stamped'] };
}
