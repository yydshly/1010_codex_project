/**
 * Key dimensions (metres). Verified figures from the US War Department technical manual
 * TM E9-803 "German Volkswagen" (1944), tabulated data:
 *   overall length 3,740 mm, width 1,600 mm, height 1,650 mm (top up) / 1,111 mm (top down),
 *   wheelbase 2,400 mm, tread front 1,356 mm / rear 1,360 mm, ground clearance 290 mm,
 *   tyres 5.25-16 on drop-centre rims.
 * Everything else (panel breaks, heights of decks, seat positions) is estimated from
 * photographs and kept consistent with those figures.
 */
export const D = {
  halfW: 0.8,
  /** axle positions along Z (wheelbase 2.40) */
  zFA: 1.25,
  zRA: -1.15,
  /** wheel centre X (half tread) */
  xFW: 0.678,
  xRW: 0.68,
  /** tyre: lug tip radius, carcass crown radius, section half width */
  lugR: 0.342,
  tyreR: 0.336,
  tyreHalfW: 0.0675,
  /** axle height: tyres flatten ~15 mm (tread) at the contact patch */
  axleY: 0.327,
  /** wheel-arch radius (side-panel cut-out and wheel-house shell) */
  archR: 0.385,
  /** panel thickness */
  t: 0.003,
  /** sill (lowest body edge) and floor pan */
  sillY: 0.3,
  floorTop: 0.305,
  /** beltline / cockpit rim height */
  belt: 0.93,
  /** front: cowl line (windscreen base), front-deck break, nose bottom (z, y) */
  cowl: [0.82, 0.93] as [number, number],
  brkF: [1.33, 0.81] as [number, number],
  noseF: [1.74, 0.4] as [number, number],
  /** rear: deck start (cockpit rear), deck/slope break, rear bottom (z, y) */
  deckR: [-0.8, 0.93] as [number, number],
  brkR: [-1.2, 0.93] as [number, number],
  tailR: [-1.84, 0.46] as [number, number],
  /** corner fillet radii */
  rF: 0.07,
  rR: 0.09,
  /** doors (z extents incl. gaps) */
  gap: 0.004,
  doorF: [0.09, 0.79] as [number, number],
  doorR: [-0.62, 0.03] as [number, number],
  doorBottom: 0.4,
  /** inner wheel-house wall x */
  whX: 0.555,
};
