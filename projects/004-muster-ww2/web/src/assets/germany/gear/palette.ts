/**
 * Material palette for German (Heer, 1943-44) field gear. Materials are memoised by the
 * library, so these functions can be called freely; same call = same draw call.
 * Dust is kept light: loose items rest near the ground, where heavy dust would grey them out.
 */
import { M } from '../../../core/kit';

type Axis = [number, number, number];
const DUST = { dust: 0.05, dustHeight: 0.3, dustColor: 0x7a7060 };

export const P = {
  /** Helmet: factory dull field grey with rough (aluminium-oxide grit) texture. */
  helmet: () =>
    M.paint(0x3d423a, {
      roughness: 0.82,
      roughVar: 0.1,
      detail: 'cast',
      detailSize: 0.018,
      detailStrength: 0.55,
      colorVar: 0.06,
      varScale: 6,
      wear: 0.32,
      wearColor: 0x2e2e2c,
      wearMetalness: 0.6,
      wearRoughness: 0.5,
      cavity: 0.5,
      ...DUST,
      name: 'de-gear-helmet-paint',
    }),
  /** Field-grey painted sheet steel (grenade head, gas-mask canister). Smoother than the helmet. */
  greySteel: () =>
    M.paint(0x565a50, {
      roughness: 0.66,
      detail: 'fine',
      detailSize: 0.03,
      detailStrength: 0.25,
      wear: 0.3,
      wearColor: 0x3a3936,
      ...DUST,
      name: 'de-gear-grey-steel',
    }),
  /** Dark olive-grey painted mess tin. */
  olivePaint: () =>
    M.paint(0x4f5043, {
      roughness: 0.6,
      detail: 'fine',
      detailSize: 0.03,
      detailStrength: 0.25,
      wear: 0.35,
      wearColor: 0x9ea0a0,
      wearMetalness: 0.9,
      wearRoughness: 0.35,
      ...DUST,
      name: 'de-gear-olive-paint',
    }),
  /** Black semi-gloss paint (bayonet scabbard, cup, shovel blade). */
  blackPaint: () =>
    M.paint(0x1d1d1c, {
      roughness: 0.44,
      detail: 'fine',
      detailSize: 0.06,
      detailStrength: 0.06,
      wear: 0.4,
      wearColor: 0x6d6e6f,
      wearMetalness: 0.95,
      wearRoughness: 0.3,
      ...DUST,
      name: 'de-gear-black-paint',
    }),
  /** Blackened leather (pouches, straps, frog, holster), pebble-grain wartime finish. */
  blackLeather: () =>
    M.leather(0x201d1a, {
      roughness: 0.52,
      detailSize: 0.02,
      detailStrength: 0.7,
      wear: 0.25,
      wearColor: 0x4a3c30,
      ...DUST,
      name: 'de-gear-black-leather',
    }),
  /** Natural brown leather (helmet liner, canteen harness). */
  brownLeather: () =>
    M.leather(0x3b2a1c, {
      roughness: 0.63,
      detailSize: 0.018,
      detailStrength: 0.7,
      wear: 0.12,
      ...DUST,
      name: 'de-gear-brown-leather',
    }),
  /** Pressed-board (Presstoff) carrier, black, slightly duller than leather. */
  presstoff: () =>
    M.leather(0x1f1d1b, {
      roughness: 0.64,
      detail: 'leather',
      detailSize: 0.05,
      detailStrength: 0.35,
      wear: 0.22,
      wearColor: 0x4c4036,
      ...DUST,
      name: 'de-gear-presstoff',
    }),
  /** Olive / field-grey cotton canvas (bread bag, MP 40 pouches). */
  canvas: () =>
    M.canvas(0x6f6c52, {
      detailSize: 0.012,
      detailStrength: 0.9,
      ...DUST,
      name: 'de-gear-canvas',
    }),
  /** Webbing tape (A-frame straps): denser weave, a little darker. */
  webbing: () => M.canvas(0x64624a, { detailSize: 0.008, detailStrength: 1.0, ...DUST, name: 'de-gear-webbing' }),
  /**
   * Brown wool felt (canteen cover): fine, even matted-fibre surface (no weave, no coarse bump),
   * soft mottling and a gentle fuzzy sheen.
   */
  felt: () =>
    M.wool(0x47362a, {
      detail: 'fine',
      detailSize: 0.032,
      detailStrength: 0.38,
      colorVar: 0.09,
      varScale: 32,
      roughVar: 0.06,
      roughness: 0.97,
      sheen: 0.25,
      sheenRoughness: 0.7,
      cavity: 0.4,
      ...DUST,
      name: 'de-gear-felt',
    }),
  /** Thread for visible stitching. */
  thread: () => M.cotton(0x3a3529, { detailStrength: 0.2, dust: 0, sheen: 0.1, cavity: 0, name: 'de-gear-thread' }),
  /** Dull zinc-plated / painted steel hardware (buckles, D-rings, hooks, rivets). */
  hardware: () =>
    M.steel({ color: 0x55544f, roughness: 0.5, metalness: 0.7, wear: 0.4, bump: 0.02, ...DUST, name: 'de-gear-hardware' }),
  /** Aluminium fittings (liner band, press studs). */
  alu: () => M.aluminium({ roughness: 0.5, colorVar: 0.08, name: 'de-gear-alu' }),
  /** Blued steel (bayonet pommel, crossguard). */
  blued: () => M.gunSteel({ wear: 0.35, name: 'de-gear-blued' }),
  /** Bare worn steel (grenade cap and ferrule). */
  bareSteel: () => M.steel({ color: 0x4d4b47, roughness: 0.55, wear: 0.5, ...DUST, name: 'de-gear-bare-steel' }),
  /** Beech / hardwood handle (grenade, shovel). Grain axis in the asset's object space. */
  handleWood: (axis: Axis = [0, 1, 0]) =>
    M.wood(0x735536, 0x3f2c1a, axis, { roughness: 0.64, clearcoat: 0.06, wear: 0.3, ...DUST }),
  /** Reddish-brown phenolic (Bakelite) bayonet grips / canteen cap. */
  bakelite: () =>
    M.surface({
      color: 0x4a2618,
      roughness: 0.35,
      metalness: 0,
      colorVar: 0.12,
      varScale: 30,
      roughVar: 0.1,
      detail: 'fine',
      detailSize: 0.02,
      detailStrength: 0.2,
      wear: 0.2,
      wearColor: 0x6e3c24,
      wearMetalness: 0,
      wearRoughness: 0.3,
      clearcoat: 0.3,
      clearcoatRoughness: 0.3,
      cavity: 0.35,
      name: 'de-gear-bakelite',
    }),
  /** Cord (liner drawstring). */
  cord: () => M.cotton(0x3e3326, { detail: 'twill', detailSize: 0.004, dust: 0, name: 'de-gear-cord' }),
};
