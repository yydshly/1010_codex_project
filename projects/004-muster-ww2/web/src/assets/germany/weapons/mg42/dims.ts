/**
 * MG 42 key dimensions in the B-frame (metres): z forward from the butt plate (0) to the
 * flash-hider face (1.22), y = 0 on the bore axis, +x = weapon's left.
 *
 * Verified anchors: overall length 1,220 mm, barrel 530 mm, sight radius 430 mm
 * (rear-sight notch to front-sight blade). Everything else is proportioned from photographs.
 */
export const D = {
  length: 1.22,

  // butt stock (Schulterstuetze)
  stockFront: 0.25,
  // rear end cap of the receiver (Bodenstueck) the stock screws onto
  capRear: 0.236,
  capFront: 0.274,
  capR: 0.0232,
  capY: -0.006,

  // receiver (Gehaeuse) body
  recRear: 0.266,
  recFront: 0.602,
  recW: 0.05,
  recTop: 0.021,
  recBot: -0.04,

  // feed cover (Deckel) and feed tray (Zufuehrerunterteil)
  coverRear: 0.334,
  coverFront: 0.602,
  trayRear: 0.515,
  trayFront: 0.594,
  feedZ: 0.556,

  // trigger housing (Griffstueck) and pistol grip
  housingRear: 0.286,
  housingFront: 0.41,
  housingBot: -0.069,
  gripTopZ: 0.318,
  gripTopY: -0.064,
  gripRake: 17, // degrees, bottom swept back
  gripLen: 0.112,

  // barrel jacket (Mantel)
  jRear: 0.602,
  jFront: 1.098,
  jW: 0.046,
  jH: 0.05,
  jY: 0.002,
  jR: 0.0105,
  jT: 0.0018,

  // barrel: 530 mm from chamber to muzzle
  breech: 0.6,
  muzzle: 1.13,

  // sights: 430 mm radius
  rsRear: 0.605,
  rsFront: 0.694,
  notchZ: 0.614,
  fsZ: 1.044,
  sightY: 0.058,

  // bipod front holder and sling hook eye
  bipodZ: 1.079,
  slingEyeZ: 1.052,

  // 50-round belt drum (Gurttrommel 34), axis parallel to the bore, on the left (feed) side
  drumZ: 0.556,
  drumLen: 0.09,
  drumR: 0.056,
  drumX: 0.089,
  drumY: -0.043,
};
