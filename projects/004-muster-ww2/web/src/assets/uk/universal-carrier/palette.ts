/**
 * Universal Carrier material palette. Materials are memoised by the library: one palette = one draw
 * call per material after baking. Unique names keep them apart from other assets' materials.
 */
import { M } from '../../../core/kit';

/** British S.C.C. No. 15 olive drab (from April 1944), as it reads in the studio light. */
export const SCC15 = 0x4e4a33;

const paintOpts = {
  roughness: 0.66,
  wear: 0.27,
  wearMetalness: 0.45,
  wearColor: 0x3a3832,
  wearRoughness: 0.46,
  dust: 0.22,
  dustHeight: 0.95,
  dustColor: 0x8e826b,
  colorVar: 0.075,
  varScale: 1.8,
  cavity: 0.45,
} as const;

export function pal() {
  return {
    /** rolled armour plate, painted (hull, cab, engine housing) */
    paint: M.paint(SCC15, { ...paintOpts, detailSize: 0.07, detailStrength: 0.26, name: 'ucar-paint' }),
    /** thin sheet steel (track guards, bins, floor plates), a little more worn */
    sheet: M.paint(SCC15, { ...paintOpts, wear: 0.36, detailSize: 0.05, detailStrength: 0.2, name: 'ucar-sheet' }),
    /** cast / forged parts: bogie brackets, hubs, sprocket, hooks */
    cast: M.castPaint(SCC15, { ...paintOpts, roughness: 0.72, detailSize: 0.2, detailStrength: 0.32, name: 'ucar-cast' }),
    /** cast manganese-steel track links and springs: bare, dusty, polished at the edges */
    track: M.steel({
      color: 0x3f3a35,
      roughness: 0.72,
      metalness: 0.66,
      colorVar: 0.14,
      varScale: 9,
      wear: 0.55,
      wearColor: 0x8a857d,
      dust: 0.5,
      dustHeight: 0.75,
      dustColor: 0x857862,
      bump: 0.08,
      bumpScale: 140,
      cavity: 0.5,
      name: 'ucar-track',
    }),
    /** solid rubber tyres */
    rubber: M.rubber({ color: 0x1f1e1c, roughness: 0.9, dust: 0.42, dustHeight: 0.7, name: 'ucar-rubber' }),
    /** black-painted parts: steering wheel, lamp bodies, instrument bezels, knobs */
    black: M.paint(0x201f1d, { roughness: 0.5, wear: 0.22, wearColor: 0x56534d, dust: 0.1, dustHeight: 0.6, name: 'ucar-black' }),
    /** seat cushions: dark brown leathercloth */
    seat: M.leather(0x3b2d22, { roughness: 0.62, wear: 0.3, dust: 0.12, dustHeight: 0.9, name: 'ucar-seat' }),
    /** canvas: seat backs' webbing, tarpaulin roll, bin straps */
    canvas: M.canvas(0x6a6447, { dust: 0.2, dustHeight: 1.0, dustColor: 0x8f836b, name: 'ucar-canvas' }),
    /** bare worn steel: levers, pedals, pins, hitch jaw, shackles */
    steel: M.steel({ color: 0x57534d, roughness: 0.48, metalness: 0.85, wear: 0.4, wearColor: 0x8e8a83, dust: 0.12, name: 'ucar-steel' }),
    /** coil springs: dark spring steel, lightly oiled */
    spring: M.steel({ color: 0x2f2d2a, roughness: 0.5, metalness: 0.75, wear: 0.3, dust: 0.3, dustHeight: 0.8, name: 'ucar-spring' }),
    /** lamp lenses and gauge glasses */
    glass: M.glass({ tint: 0xb9c5c0, opacity: 0.32, roughness: 0.06 }),
    /** tail lamp lens */
    red: M.glass({ tint: 0x8a1a12, opacity: 0.78, roughness: 0.12 }),
    /** lamp reflectors, gauge faces' bright rims */
    bright: M.steel({ color: 0x7a7872, roughness: 0.34, metalness: 1, wear: 0.1, dust: 0.04, bump: 0.02, name: 'ucar-bright' }),
    /** gauge dials (off-white enamel) */
    dial: M.paint(0xd9d2bd, { roughness: 0.45, wear: 0, dust: 0.05, cavity: 0.2, colorVar: 0.02, name: 'ucar-dial' }),
    /** dark voids: slots, bores, louvre wells, openings */
    void: M.surface({ color: 0x0d0d0c, roughness: 0.92, metalness: 0, name: 'ucar-void' }),
  };
}
export type Pal = ReturnType<typeof pal>;
