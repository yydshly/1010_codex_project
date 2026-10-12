/**
 * Material palette for the QF 25-pounder. Materials are memoised by the library, so every call
 * returns the same instances and parts sharing a finish merge into one draw call at bake time.
 */
import { M } from '../../../core/kit';

/** SCC No. 15 olive drab (British standard from 1944), as tuned for the scene. */
export const SCC15 = 0x4c4832;

const dust = { dust: 0.22, dustHeight: 0.7, dustColor: 0x8c806a };

export const P = {
  /** Painted fabricated steel: trail, saddle, shield, wheels, cradle casing. */
  paint: () =>
    M.paint(SCC15, {
      roughness: 0.66,
      wear: 0.28,
      wearColor: 0x3a3832,
      ...dust,
      colorVar: 0.07,
      varScale: 1.8,
      detailSize: 0.07,
      detailStrength: 0.26,
      name: 'q25-paint',
    }),
  /** Painted castings / forgings: saddle bearings, hubs, gear housings, trail end. */
  cast: () =>
    M.castPaint(SCC15, {
      roughness: 0.7,
      wear: 0.32,
      wearColor: 0x3a3832,
      detailSize: 0.18,
      detailStrength: 0.28,
      ...dust,
      name: 'q25-cast',
    }),
  /** Barrel, breech ring and counterweight: smoother machined surfaces under the paint. */
  barrel: () =>
    M.paint(0x4a4631, {
      roughness: 0.56,
      roughVar: 0.1,
      wear: 0.26,
      wearColor: 0x383733,
      dust: 0.1,
      dustHeight: 0.6,
      dustColor: 0x8c806a,
      colorVar: 0.06,
      varScale: 3,
      detailStrength: 0.16,
      name: 'q25-barrel',
    }),
  /** Muzzle brake: same paint, heat-darkened and sooty round the ports. */
  scorched: () =>
    M.paint(0x3d3b2e, {
      roughness: 0.74,
      wear: 0.42,
      wearColor: 0x2a2927,
      colorVar: 0.18,
      varScale: 12,
      dust: 0.04,
      cavity: 0.7,
      name: 'q25-scorched',
    }),
  /** Spade and trail end: scuffed and earth-stained. */
  spade: () =>
    M.paint(SCC15, {
      roughness: 0.76,
      wear: 0.5,
      wearColor: 0x45423d,
      dust: 0.34,
      dustHeight: 0.25,
      dustColor: 0x7d705c,
      colorVar: 0.1,
      varScale: 3,
      name: 'q25-spade',
    }),
  /** Firing platform: painted plate, trodden and dusty, worn bright where the tyres roll. */
  platform: () =>
    M.paint(0x423f2b, {
      roughness: 0.74,
      wear: 0.34,
      wearColor: 0x4a4843,
      dust: 0.08,
      dustHeight: 0.06,
      dustColor: 0x85786a,
      colorVar: 0.12,
      varScale: 2.4,
      detailSize: 0.05,
      detailStrength: 0.3,
      name: 'q25-platform',
    }),
  /** Bore and chamber: dark sooty steel. */
  bore: () => M.gunSteel({ color: 0x1a1a1a, roughness: 0.66, metalness: 0.5, wear: 0.05, cavity: 0.2, name: 'q25-bore' }),
  /** Breech block and machined faces: blued steel with oil sheen. */
  block: () => M.gunSteel({ color: 0x33363a, roughness: 0.4, metalness: 0.8, wear: 0.35, wearColor: 0x7c7f82, name: 'q25-block' }),
  /** Bright working steel: pins, piston rods, handles, shafts. */
  bright: () =>
    M.steel({ color: 0x605e5a, roughness: 0.42, metalness: 0.85, wear: 0.3, dust: 0.08, bump: 0.02, bumpScale: 220, name: 'q25-bright' }),
  /** 9.00-16 pneumatic tyres. */
  rubber: () => M.rubber({ color: 0x1f1f1e, roughness: 0.88, dust: 0.45, dustHeight: 0.5, dustColor: 0x8a7d69, name: 'q25-rubber' }),
  /** Optics bodies: black enamel. */
  optic: () =>
    M.paint(0x1d1e1c, { roughness: 0.46, wear: 0.3, wearColor: 0x5a5b5e, wearMetalness: 0.8, dust: 0.06, colorVar: 0.04, name: 'q25-optic' }),
  /** Lens glass. */
  glass: () => M.glass({ tint: 0xa9bcc0, opacity: 0.34, roughness: 0.03 }),
  /** Brass: scale bands, range drum, data plate. */
  brass: () => M.brass({ color: 0x9b7d45, roughness: 0.42, colorVar: 0.1 }),
  /** Leather sight cases on the shield. */
  leather: () => M.leather(0x3d291a, { wear: 0.3, dust: 0.12, name: 'q25-leather' }),
};
