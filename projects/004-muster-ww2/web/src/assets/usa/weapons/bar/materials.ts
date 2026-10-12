/**
 * BAR M1918A2 material set. Metal finishes come from common/materials.ts (shared with the Garand and
 * the Thompson, so the US arms read as one family); the walnut is the BAR's own:
 *  walnut    butt stock: oil-finished black walnut, a deep brown with a fine, restrained grain along +Z
 *  walnutHg  hand guard: a separate piece, a little redder and lighter (typical mixed wood)
 *  mag       20-round magazine: blued (black-oxide) stamped steel, darker and smoother than Parkerizing
 */
import { M } from '../../../../core/kit';
import { USW } from '../common/materials';

const GRAIN: [number, number, number] = [0, 0, 1];

const barWalnut = () =>
  M.wood(0x3f2416, 0x1a0c05, GRAIN, {
    roughness: 0.55,
    colorVar: 0.08,
    varScale: 7,
    wear: 0.06,
    wearColor: 0x6a442a,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
    dust: 0.04,
    dustHeight: 0.05,
    detail: 'fine',
    detailSize: 0.02,
    detailStrength: 0.06,
    wood: { axis: GRAIN, dark: 0x2b170c, ringFreq: 150, figure: 0.95 },
    name: 'us-w-walnut-bar-stock',
  });

const barWalnutHg = () =>
  M.wood(0x4a2a17, 0x1f0e06, GRAIN, {
    roughness: 0.56,
    colorVar: 0.08,
    varScale: 8,
    wear: 0.07,
    wearColor: 0x70472b,
    clearcoat: 0.1,
    clearcoatRoughness: 0.5,
    dust: 0.04,
    dustHeight: 0.05,
    detail: 'fine',
    detailSize: 0.02,
    detailStrength: 0.06,
    wood: { axis: GRAIN, dark: 0x2f190d, ringFreq: 170, figure: 0.9 },
    name: 'us-w-walnut-bar-hg',
  });

const barMag = () =>
  M.gunSteel({
    color: 0x212326,
    roughness: 0.6,
    metalness: 0.55,
    roughVar: 0.16,
    colorVar: 0.06,
    varScale: 14,
    detail: 'fine',
    detailSize: 0.008,
    detailStrength: 0.15,
    wear: 0.4,
    wearColor: 0x8a8d90,
    wearRoughness: 0.28,
    cavity: 0.4,
    dust: 0.02,
    name: 'us-w-bar-mag',
  });

export function barMaterials() {
  return {
    walnut: barWalnut(),
    walnutHg: barWalnutHg(),
    park: USW.park(),
    parkDark: USW.parkDark(),
    checker: USW.checker(),
    blued: USW.blued(),
    /** magazine: blued stamped steel */
    mag: barMag(),
    bright: USW.bright(),
    recess: USW.recess(),
    web: USW.web(),
    blackened: USW.blackened(),
    thread: USW.thread(),
  };
}

export type BarMats = ReturnType<typeof barMaterials>;
