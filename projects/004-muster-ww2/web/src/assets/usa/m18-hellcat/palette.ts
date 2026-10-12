/**
 * M18 material palette. Materials are memoised by the library: one palette = one draw call per material
 * after baking. US Army Olive Drab (No. 9 lusterless enamel) as it reads in the studio.
 */
import { M } from '../../../core/kit';

/** Olive Drab, slightly faded and dusty. */
export const OD = 0x4d4b33;

const base = {
  roughness: 0.68,
  colorVar: 0.07,
  varScale: 1.5,
  wear: 0.24,
  wearColor: 0x3b3935,
  wearMetalness: 0.5,
  wearRoughness: 0.48,
  dust: 0.22,
  dustHeight: 1.0,
  dustColor: 0x8f836b,
  cavity: 0.45,
} as const;

export function pal() {
  return {
    /** rolled armour plate, painted */
    paint: M.paint(OD, { ...base, detailSize: 0.07, detailStrength: 0.28, name: 'm18-paint' }),
    /** cast parts: gun shield, final drive housings, wheel hubs, suspension arms */
    cast: M.castPaint(OD, { ...base, roughness: 0.72, detailSize: 0.3, detailStrength: 0.22, name: 'm18-cast' }),
    /** thin sheet metal (fenders, guards, racks, boxes): a touch more worn */
    sheet: M.paint(OD, { ...base, wear: 0.34, detailSize: 0.05, detailStrength: 0.18, name: 'm18-sheet' }),
    /** turret interior: same olive drab, less dust, a little lighter from the open top */
    inner: M.paint(0x5a583f, { ...base, dust: 0.1, wear: 0.18, detailSize: 0.06, detailStrength: 0.2, name: 'm18-inner' }),
    /** T69 steel track shoes and pins */
    track: M.steel({
      color: 0x46413b,
      roughness: 0.72,
      metalness: 0.65,
      colorVar: 0.16,
      varScale: 7,
      wear: 0.5,
      wearColor: 0x88837b,
      dust: 0.45,
      dustHeight: 1.1,
      dustColor: 0x8a7d67,
      cavity: 0.55,
      bump: 0.07,
      bumpScale: 110,
      name: 'm18-track',
    }),
    /** worn bright steel (guide horn and sprocket tooth faces, grouser tips) */
    bright: M.steel({ color: 0x6f6b64, roughness: 0.42, metalness: 0.9, wear: 0.3, dust: 0.2, dustHeight: 0.4, name: 'm18-bright' }),
    /** road wheel and return roller tyres, dusty */
    rubber: M.rubber({ color: 0x1f1e1c, roughness: 0.9, dust: 0.45, dustHeight: 1.1, dustColor: 0x8a7d69, name: 'm18-rubber' }),
    /** gun tube details, machine gun, breech: blackened steel */
    gun: M.gunSteel({ color: 0x2a2b2b, roughness: 0.46, wear: 0.16, wearColor: 0x5c5f61, name: 'm18-gun' }),
    /** tool handles */
    wood: M.wood(0x7d6242, 0x463322, [0, 0, 1], { roughness: 0.64, clearcoat: 0, wear: 0.3, dust: 0.18, name: 'm18-wood' }),
    /** clear lenses (headlights) */
    glass: M.glass({ tint: 0xc7d3cf, opacity: 0.3, roughness: 0.05 }),
    /** periscope heads: darker, reflective */
    vision: M.glass({ tint: 0x33403d, opacity: 0.6, roughness: 0.03 }),
    /** red tail-light lenses */
    red: M.glass({ tint: 0x8a1a12, opacity: 0.75, roughness: 0.12 }),
    /** dark voids: bores, openings, grille wells */
    void: M.surface({ color: 0x0e0e0d, roughness: 0.92, metalness: 0, name: 'm18-void' }),
    /** exhaust outlets: heat-darkened steel */
    exhaust: M.steel({
      color: 0x3a2e26,
      roughness: 0.85,
      metalness: 0.35,
      colorVar: 0.2,
      varScale: 9,
      wear: 0.2,
      wearColor: 0x6b4a33,
      dust: 0.1,
      bump: 0.12,
      bumpScale: 110,
      name: 'm18-exhaust',
    }),
    /** tool heads, shackles, pins: bare steel */
    toolSteel: M.steel({ color: 0x4d4b46, roughness: 0.55, metalness: 0.8, wear: 0.35, wearColor: 0x75716a, dust: 0.14, name: 'm18-toolsteel' }),
    /** tarpaulin, bedrolls, seat cushions: olive drab cotton duck */
    canvas: M.canvas(0x5d5a42, { dust: 0.22, dustHeight: 0.9, dustColor: 0x8f836b, name: 'm18-canvas' }),
    /** 76 mm cartridge cases */
    brass: M.brass({ roughness: 0.38, wear: 0.1, name: 'm18-brass' }),
  };
}
export type Pal = ReturnType<typeof pal>;
