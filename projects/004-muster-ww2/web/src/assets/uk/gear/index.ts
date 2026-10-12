/**
 * British Army (1944) field gear as reusable GearPiece builders: the Mk II steel helmet, the
 * No. 36M grenade and the 1937-pattern web equipment (khaki cotton webbing, lightly blancoed
 * khaki green, stamped brass fittings).
 *
 * Gear-local frame (src/assets/shared/contracts.ts): +Z away from the body, +Y up when worn, the
 * face that touches the body/belt lies on z = 0, origin at the attachment point.
 * BELT ITEMS (pouches, frog): origin on the belt's OUTER face at belt mid-height; the 57 mm x
 * 3.4 mm belt (BELT37) lies behind them in y = -0.0285..0.0285, z = -0.0034..0 - which is exactly
 * where fit.mountFrame puts the origin for belt mounts. Hooks / loop backs that pass behind the
 * belt sit at z < 0 and are hidden between belt and tunic. Build the soldier's belt with
 * buildSoldier({ belt: { width: BELT37.width, thickness: BELT37.t } }).
 *
 *  buildMk2Helmet({ chinstrap })     head - origin at the head-opening centre on the liner-band
 *                                    plane (= bowl/brim junction), +Z = brow. 'open' | 'none' |
 *                                    'laid' (display). MK2_FIT: band half axes, crown / pad heights,
 *                                    rim drops, lug hook points; buildMk2Chinstrap(path, outward)
 *                                    draws a worn strap along a path (e.g. under the chin).
 *  buildNo36Grenade()                loose (origin = base plug bottom, +Y up) - 61 x 95 mm.
 *  buildWaistBelt37({ points, normals })
 *                                    the whole belt along a CLOSED centre-line path starting at the
 *                                    front buckle and running towards the wearer's left (e.g.
 *                                    fit.beltPath(): pass its points/normals); result in the path's
 *                                    space. Hook-and-loop brass buckle, slides, end tabs, two angled
 *                                    rear brace buckles (strapAnchors = their top bars, left first).
 *                                    No path = display oval waist 0.34 x 0.26 m.
 *  buildBasicPouch37({ side })       belt-front-left ('l') / belt-front-right ('r'), worn in pairs.
 *                                    Mk III, two Bren magazines each; 0.13 w x 0.28 h (incl. the
 *                                    buckle) x 0.08 d. strapAnchors = [brace window of the top-back
 *                                    buckle, L-strap hook window above it]. The box rises from the
 *                                    belt up the chest: mountFrame's swing only tests its bottom
 *                                    27 mm, then pushes it out until the back clears the tunic.
 *  belt37FrameAt(f, opts)            Matrix4 on the belt's outer face at arc fraction f (0 = buckle,
 *                                    towards the wearer's left) - lays items on the display belt.
 *  buildBrace37(path, { shoulder })  one brace (1 in. ends, 2 in. over the shoulder, brass tips)
 *                                    along a strap path (points + outward normals, e.g.
 *                                    fit.strapPath(...)); path start = the pouch end.
 *  buildBracePair37({ left, right }) both braces; the left one's cross-over loop is placed round the
 *                                    right one where the paths cross. buildBraces37() = display X.
 *  buildLStrap37({ shoulder, underArm })
 *                                    one L-strap for the small pack in battle order; both paths
 *                                    start at the brass corner hook (hooked into the pouch buckle's
 *                                    upper window), end at the pack's top / base buckle.
 *                                    buildLStraps37() = display pair laid flat.
 *  buildWebStrap37(path, { width, tips })
 *                                    any plain 1-in. web strap with brass tips.
 *  buildHaversack37()                back - small pack, origin = centre of its back face (the back
 *                                    straps lie on z = 0..0.004); 0.29 w x 0.26 h x 0.10 d.
 *                                    strapAnchors = [top buckle +X, top -X, base +X, base -X]
 *                                    (+X = wearer's right once turned 180 deg onto the back).
 *  buildWaterBottle37({ pose })      hip (RIGHT hip, hanging from the brace end) - Mk VII bottle in
 *                                    the skeleton carrier. Origin = midpoint of the two buckle top
 *                                    bars the brace end passes through (strapAnchors). 'display' =
 *                                    standing, chapes hanging.
 *  buildEntrenchingTool37({ state }) belt-rear - the head in its web carrier worn at the back of
 *                                    the belt, hanging from the crossed brace ends through its two
 *                                    top buckles (strapAnchors, origin between them; the carrier's
 *                                    back face on z = 0 lies over the belt); Helve Mk II (bayonet
 *                                    adapter end) across the front in its loop and strap; gear +X =
 *                                    wearer's right once turned onto the back. 'assembled' = the
 *                                    tool put together (head frame).
 *  buildBayonetFrog37({ bayonet })   belt-left - web frog with the No. 4 Mk II spike bayonet in its
 *                                    No. 4 Mk I scabbard, hanging vertically, point down (0.05 w x
 *                                    0.3 h x 0.03 d).
 */
import type { GearPiece } from '../../shared/contracts';
import { buildMk2Helmet } from './mk2helmet';
import { buildNo36Grenade } from './mills';
import { buildWaterBottle37 } from './waterbottle';
import { buildEntrenchingTool37 } from './etool';
import { buildWaistBelt37 } from './belt';
import { buildBasicPouch37 } from './pouch';
import { buildBraces37, buildLStraps37 } from './braces';
import { buildHaversack37 } from './haversack';
import { buildBayonetFrog37 } from './frog';

export { buildMk2Helmet, buildMk2Chinstrap, MK2_FIT, mk2RestY } from './mk2helmet';
export type { Mk2HelmetOptions, ChinstrapMode } from './mk2helmet';
export { buildNo36Grenade, millsR } from './mills';
export { buildWaterBottle37, MK7_BOTTLE, feltPoint } from './waterbottle';
export type { WaterBottle37Options, BottlePose } from './waterbottle';
export { buildEntrenchingTool37, buildEtoolHead, buildEtoolHelve, buildEtoolAssembled, ETOOL } from './etool';
export type { EtoolOptions } from './etool';
export { buildWaistBelt37, belt37ClosureGeometry, belt37FrameAt, BELT37 } from './belt';
export type { Belt37Options } from './belt';
export { buildBasicPouch37, BASIC_POUCH } from './pouch';
export type { BasicPouchOptions } from './pouch';
export { buildBrace37, buildBracePair37, buildBraces37, buildLStrap37, buildLStraps37, buildWebStrap37, BRACE37 } from './braces';
export type { StrapPath, Brace37Options, WebStrapOptions } from './braces';
export { buildHaversack37, HAVERSACK37 } from './haversack';
export { buildBayonetFrog37, NO4_SCABBARD } from './frog';
export type { FrogOptions } from './frog';
export { UK as UK_GEAR_MATERIALS } from './palette';

export interface GearEntry {
  key: string;
  doc: string;
  build: () => GearPiece;
  /** Review layout only: lay the piece flat (rotate -90 deg about X) on the board. */
  layFlat?: boolean;
}

/** Every piece with a default configuration (used by the hidden review asset). */
export const UK_GEAR: GearEntry[] = [
  { key: 'helmet', doc: 'Mk II steel helmet, display pose (chinstrap laid out)', build: () => buildMk2Helmet({ chinstrap: 'laid' }) },
  { key: 'helmet-open', doc: 'Mk II steel helmet, chinstrap hanging open', build: () => buildMk2Helmet({ chinstrap: 'open' }) },
  { key: 'no36', doc: 'No. 36M Mk I grenade (Mills bomb)', build: buildNo36Grenade },
  { key: 'pouch-l', doc: 'Basic pouch Mk III, left (belt-front-left)', build: () => buildBasicPouch37({ side: 'l' }) },
  { key: 'pouch-r', doc: 'Basic pouch Mk III, right (belt-front-right)', build: () => buildBasicPouch37({ side: 'r' }) },
  { key: 'bottle', doc: 'Mk VII water bottle in 1937-pattern skeleton carrier (worn: right hip)', build: () => buildWaterBottle37() },
  { key: 'bottle-display', doc: 'Water bottle, display pose (standing)', build: () => buildWaterBottle37({ pose: 'display' }) },
  { key: 'frog', doc: 'Bayonet No. 4 Mk II in scabbard, 1937-pattern frog (belt-left)', build: () => buildBayonetFrog37() },
  { key: 'haversack', doc: 'Haversack (small pack), battle order on the back', build: buildHaversack37 },
  { key: 'etool', doc: 'Entrenching tool Patt. 37: head in web carrier, helve in its loops (worn: rear)', build: () => buildEntrenchingTool37() },
  { key: 'etool-assembled', doc: 'Entrenching tool assembled (head on helve)', build: () => buildEntrenchingTool37({ state: 'assembled' }) },
  { key: 'belt', doc: 'Waist belt Patt. 37 (default oval waist)', build: () => buildWaistBelt37() },
  { key: 'lstraps', doc: 'L-straps (pair), laid flat', build: buildLStraps37 },
  { key: 'braces', doc: 'Braces (pair), laid flat in an X with the cross-over loop', build: buildBraces37 },
];
