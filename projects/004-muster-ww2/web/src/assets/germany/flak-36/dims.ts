/**
 * Key layout numbers for the 8.8 cm Flak 36 model (metres). Raw frame: origin on the ground under
 * the pedestal axis, +Y up, +Z towards the muzzle, +X = the gun's left (fuze-setter side),
 * -X = its right (layers' side). The assembler re-centres the model on its plan bounds.
 *
 * Reference values (see provenance in flak-36.asset.ts):
 *   barrel 4.93 m (L/56), firing height (bore, emplaced, 0 deg) 1.60 m, width with the side
 *   outriggers raised 2.305 m, travel length 7.62 m, elevation -3..+85 deg, recoil 1050-700 mm,
 *   shield 1.95 m wide x 1.75 m high (10 mm front plate, 6 mm side plates 75 mm wide at the top
 *   and 560 mm at the bottom).
 * The cross-platform span is not published in the sources used; ~5.2 x 5.0 m over the jack pads
 * is estimated from photographs (side arms roughly as long as the raised outriggers are tall).
 */

/** Displayed barrel elevation (deg) for each option. */
export const ELEVATIONS = { low: 5, aa: 20 } as const;

export const D = {
  // ---- cross platform (Kreuzlafette 36)
  /** Levelling-jack foot pads. */
  padR: 0.17,
  padT: 0.035,
  /** Central box: square plan, half size, bottom/top. */
  boxHalf: 0.62,
  boxBot: 0.15,
  boxTop: 0.47,
  /** Fore-aft beam: half width, top, bottom at the centre and at the ends. */
  beamHalfW: 0.135,
  beamTop: 0.45,
  beamBotC: 0.17,
  beamBotE: 0.27,
  beamEnd: 2.62,
  jackZ: 2.47,
  /** Side outriggers: hinge x, outer end x, jack x, half width (along Z). */
  sideHingeX: 0.64,
  sideEnd: 2.5,
  sideJackX: 2.35,
  sideHalfW: 0.115,
  sideTopR: 0.43,
  sideTopE: 0.37,
  sideBotR: 0.19,
  sideBotE: 0.27,
  // ---- pedestal and upper carriage
  pedBase: 0.47,
  pedTop: 0.93,
  ringTop: 0.97,
  deckTop: 1.01,
  deckR: 0.49,
  /** Upper-carriage side walls: outer face x, thickness, rear/front ends at the deck. */
  cheekX: 0.315,
  cheekT: 0.03,
  cheekZ0: -0.95,
  cheekZ1: 0.55,
  // ---- ordnance (barrel frame: origin on the trunnion axis, bore at y = boreOff)
  trunY: 1.45,
  trunZ: -0.35,
  boreOff: 0.15,
  /** Breech ring rear face, breech ring front face, muzzle (4.93 m overall). */
  breechZ: -0.75,
  ringFront: -0.4,
  muzzleZ: 4.18,
  /** Cradle (houses the recoil brake under the barrel): half width, bottom, rear, front. */
  cradleHalfW: 0.16,
  cradleBot: -0.3,
  cradleZ0: -0.3,
  cradleZ1: 1.95,
  /** Recuperator above the barrel (barrel frame y, radius). */
  recY: 0.36,
  recR: 0.075,
  // ---- equilibrators: lower pivot (world, on the upper carriage) and upper pivot (barrel frame)
  eqX: 0.46,
  eqLowY: 1.07,
  eqLowZ: 0.45,
  eqUpY: 0.1,
  eqUpZ: 0.83,
  eqR: 0.105,
  // ---- shield (front plate plane z, bottom, top, half width, open-topped barrel slot)
  shieldZ: 0.86,
  shieldBot: 0.62,
  shieldTop: 2.37,
  shieldHalfW: 0.975,
  slotHalfW: 0.24,
  slotBot: 1.1,
};

/** Barrel-frame point (y, z) -> raw-frame (y, z) at elevation `deg`. */
export function toWorld(y: number, z: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return [D.trunY + z * s + y * c, D.trunZ + z * c - y * s];
}
