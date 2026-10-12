/**
 * Soviet (Red Army, 1943-44) rigid field gear as reusable GearPiece builders.
 *
 * Gear-local frame (see src/assets/shared/contracts.ts): +Z away from the body, +Y up when
 * worn, the face that touches the body/belt lies on z = 0, origin at the attachment point.
 *
 * Belt items (pouches): ORIGIN = belt-loop centre at belt mid-height. The loops lie on the body
 * in z = 0..0.0025, the 45 mm enlisted waist belt passes behind the pouch (z 0.0025..0.0065,
 * y = -0.0225..+0.0225), `belt.loopWidth` = 0.045.
 *
 *  buildSSh40Helmet({ chinstrap })  head  - origin at the head-opening centre in the liner-rivet
 *                                   plane, +Z = brow. 'open' | 'none' | 'laid' (display).
 *  buildF1Grenade()                 loose / in pouch - see f1.ts.
 *  buildMPL50Gear()                 belt-right - shovel in canvas cover, blade up.
 *  buildM1937CartridgePouch()       belt-front-left / belt-front-right (worn in pairs, one each
 *                                   side of the buckle). Leather, two compartments, strap-and-stud
 *                                   closures, D-ring at the top back = strapAnchors[0] (Y-strap hook).
 *  buildPPShDrumPouch()             belt-front-right (or left) - canvas, one 71-round drum, strap
 *                                   and frame buckle. Hangs ~0.2 m below the belt.
 *  buildPPShBoxPouch()              belt-front-right / -left (issued in pairs) - canvas, three
 *                                   35-round box magazines, wooden toggle.
 *  buildGrenadePouch()              belt-left (or rear-left) - canvas, 2 compartments (2 RGD-33 or
 *                                   4 F-1), two wooden toggles.
 *  buildSovietCanteen({ strap })    hip (right hip, carried on a strap over the left shoulder) -
 *                                   glass flask in a drawstring cloth cover. Origin = midpoint of
 *                                   the two strap attachments on the cover sides, back of the
 *                                   cover on z = 0; strapAnchors = the two strap stub ends.
 *  buildVeshmeshok()                back - duffel bag, origin = top centre of its back face at the
 *                                   neck-knot height; strapAnchors = [+X strap leg leaving the neck
 *                                   knot, -X leg, +X strap end at the bottom corner, -X end]
 *                                   (with the gear frame turned 180 deg for the back, +X = wearer's right).
 *  buildSkatka(opts) / buildSkatkaAlong(path, opts)
 *                                   shoulder-strap (over the LEFT shoulder, tie at the right hip) -
 *                                   rolled greatcoat ring; see skatka.ts for the ring frame.
 *  buildEnlistedBuckle()            belt front centre (contract has no 'belt-front' mount; declared
 *                                   'belt-front-left') - open-frame single-prong buckle sitting on
 *                                   a continuous belt (z = 0 = belt outer face).
 */
import type { GearPiece } from '../../shared/contracts';
import { buildSSh40Helmet } from './ssh40';
import { buildF1Grenade } from './f1';
import { buildMPL50Gear } from './mpl50';
import { buildM1937CartridgePouch, buildPPShDrumPouch, buildPPShBoxPouch, buildGrenadePouch } from './pouches';
import { buildSovietCanteen } from './canteen';
import { buildVeshmeshok } from './veshmeshok';
import { buildSkatka } from './skatka';
import { buildEnlistedBuckle } from './buckle';

export { buildSSh40Helmet, buildSSh40Chinstrap, SSH40_FIT } from './ssh40';
export { buildF1Grenade } from './f1';
export { buildMPL50Gear } from './mpl50';
export type { SSh40Options, ChinstrapMode } from './ssh40';
export { buildSovietCanteen, SU_FLASK } from './canteen';
export type { SovietCanteenOptions, CanteenStrap } from './canteen';
export { buildVeshmeshok, VESHMESHOK } from './veshmeshok';
export { buildSkatka, buildSkatkaAlong } from './skatka';
export type { SkatkaOptions, SkatkaRingOptions, SkatkaAlongOptions } from './skatka';
export { buildEnlistedBuckle, SU_BUCKLE } from './buckle';
export { buildM1937CartridgePouch, buildPPShDrumPouch, buildPPShBoxPouch, buildGrenadePouch, SU_BELT, M1937, PPSH_DRUM_POUCH, PPSH_BOX_POUCH, GRENADE_POUCH } from './pouches';

export interface GearEntry {
  key: string;
  doc: string;
  build: () => GearPiece;
  /** Review layout only: lay the piece flat (rotate -90 deg about X) on the board. */
  layFlat?: boolean;
}

/** Every piece with a default configuration (used by the hidden review asset). */
export const SOVIET_GEAR: GearEntry[] = [
  { key: 'helmet', doc: 'SSh-40 steel helmet, display pose (chinstrap laid out)', build: () => buildSSh40Helmet({ chinstrap: 'laid' }) },
  { key: 'f1', doc: 'F-1 hand grenade with UZRG fuze', build: buildF1Grenade },
  { key: 'mpl50', doc: 'MPL-50 shovel in its canvas cover (belt)', build: () => buildMPL50Gear() },
  { key: 'm1937', doc: 'M1937 leather cartridge pouch', build: buildM1937CartridgePouch },
  { key: 'drum', doc: 'PPSh-41 drum magazine pouch', build: buildPPShDrumPouch },
  { key: 'box', doc: 'PPSh-41 box magazine pouch', build: buildPPShBoxPouch },
  { key: 'grenades', doc: 'Grenade pouch', build: buildGrenadePouch },
  { key: 'flask', doc: 'Glass water flask in cloth cover, strap stubs', build: () => buildSovietCanteen() },
  { key: 'buckle', doc: 'Enlisted open-frame belt buckle on the belt ends', build: buildEnlistedBuckle },
  { key: 'veshmeshok', doc: 'Veshmeshok duffel backpack (pattern 1941)', build: buildVeshmeshok },
  { key: 'skatka', doc: 'Skatka - rolled greatcoat ring (laid flat for review)', build: () => buildSkatka(), layFlat: true },
];
