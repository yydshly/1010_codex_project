/**
 * US Army (1944) infantry field gear: rigid GearPiece builders, web belts and straps built along
 * body paths, and their mount frames. Materials: OD shade No. 7 cotton duck / web by default
 * (`shade: 'od3'` for the earlier khaki-like shade), blackened brass / steel fittings, bright wire
 * M1910 hangers (palette.ts).
 *
 * Gear-local frame (src/assets/shared/contracts.ts): +Z away from the body, +Y up when worn, the
 * face that touches the body/belt lies on z = 0, origin at the attachment point.
 *
 * HEAD
 *  buildM1Helmet({ chinstrap })          'head' - origin at the head-opening centre on the liner
 *                                         band plane, +Z brow (helmet.ts; buildM1Chinstrap for a worn strap).
 *
 * BELTS (belts.ts) - built along the waist: rig = buildM1923BeltAlong({ path, normals, inset })
 *  path/normals = fit.beltPath(h).points/.normals (front centre first), inset = fit.belt.thickness / 2.
 *  buildM1923BeltAlong     cartridge belt, 10 pockets (5 + 5), lift-the-dot flaps; slots L1..L5 /
 *                          R1..R5 (eyelet pair under each pocket), top L1..L4 / R1..R4 + 'rear'.
 *  buildM1937BarBeltAlong  BAR belt, 6 pockets of 2 magazines; slots 'rear-L' / 'rear-R' on the
 *                          narrow rear section, top L1, L2 (between pockets), L3 (behind), 'rear'.
 *  buildM1936PistolBeltAlong  pistol belt (squad leader): eyelets every 25 mm along both edges;
 *                          slots L1.. / R1.., top L1.. / R1..; loopMount(d) for belt-loop pouches.
 *  BeltRig: { object, length, slots, top, frameAt(d, y), frameAtAngle(deg, y), loopMount(d) } -
 *  every frame: origin on the belt's outer face, +X along the belt, +Y up, +Z out, caller's frame.
 *
 * ITEMS HANGING FROM BELT EYELETS (M1910 double-hook wire hanger; worn frame: origin = midpoint of
 * the eyelet pair, hooks at x = +-0.025, z = 0 = belt outer face) - place with
 * `obj.applyMatrix4(rig.slots.R5)` (optionally times a small outward push / swing, see rigs.ts):
 *  buildM1910Canteen()          'belt-rear-right'  canteen, cup, felt-lined cover   0.155 x 0.211 x 0.112
 *  buildFirstAidPouch()         'belt-front-right' M1942 first-aid pouch            0.146 x 0.148 x 0.050
 *  buildM1943EntrenchingTool()  'belt-left'        M1943 folding tool in carrier    0.175 x 0.471 x 0.081
 *  buildM1Bayonet()             'belt-left'        M1 bayonet (10 in) in M7 scabbard 0.068 x 0.400 x 0.025
 *                               (on the M1923 the hilt rises in front of a pocket: push out ~0.03 m,
 *                               or hang it from the haversack's 'bayonet' slot)
 *
 * BELT-LOOP POUCH (origin = loop centre at belt mid-height, loop on the body z 0..0.0025, belt behind
 * the pouch z 0.0025..0.0065) - place with rig.loopMount(d):
 *  buildThompsonPouch()         'belt-front-left'  3-cell pouch for 30-round Thompson magazines,
 *                                                  one flap, lift-the-dot, 4 in web loop   0.112 x 0.232 x 0.058
 *
 * BACK
 *  buildM1928Haversack(o)       'back' - M1928 haversack + pack carrier + meat can pouch, 0.233 x 0.762 x 0.161;
 *                               origin = top centre of the back panel; strapAnchors [+X shoulder strap
 *                               stub, -X stub, belt strap stub] + strapDirs; slots 'bayonet' (wearer's
 *                               left side face, push out by BAYONET_CLEAR) and 'etool' (outer face,
 *                               push out by ETOOL_CLEAR).
 *
 * STRAPS (straps.ts) - built along fit.strapPath paths, hooks into BeltRig.top eyelets:
 *  buildHaversackStrapsAlong({ left, right, hooks })   the M1928's shoulder straps (from the stubs
 *                               over the shoulders to the belt's top eyelets, e.g. top.L2 / top.R2).
 *  buildM1936SuspendersAlong({ left, right, frontHooks, rearHooks })  M1936 "X" suspenders (with the
 *                               pistol belt or BAR belt): each strap front hook -> shoulder -> rear hook,
 *                               crossing sewn between the shoulder blades; buckle + D-ring in front.
 *  buildWebStrapAlong(o)        generic strap with buckles / D-rings / hooks; buildBeltHook() one hook.
 *  (The M1928 haversack's own shoulder straps replace the suspenders - riflemen with the haversack
 *  wear no M1936 suspenders.)
 *
 * LOOSE
 *  buildMk2Grenade()            Mk 2 fragmentation grenade (grenade.ts).
 *
 * Worked examples on a mock torso: rigs.ts (rifleman, BAR gunner, squad leader).
 *
 * DETAIL: every builder honours withUSGearDetail('low', () => build...()) - same parts, mesh
 * resolutions x0.6 and wider stitch spacing - for pieces worn on soldiers (180k budget for figure,
 * weapon and gear). Triangles (high / low) are logged by the review sheet (config stats / low).
 */
import type { GearPiece } from '../../shared/contracts';
import { buildM1Helmet } from './helmet';
import { buildMk2Grenade } from './grenade';
import { buildM1910Canteen } from './canteen';
import { buildM1943EntrenchingTool } from './etool';
import { buildM1923Belt, buildM1937BarBelt, buildM1936PistolBelt } from './belts';
import { buildM1Bayonet } from './bayonet';
import { buildM1928Haversack } from './haversack';
import { rigRifleman, rigBarGunner, rigSquadLeader, suspendersLaidOut } from './rigs';
import { buildM1923Pocket, buildM1937BarPocket, buildThompsonPouch, buildFirstAidPouch } from './pouches';

export { buildM1Helmet, buildM1Chinstrap, m1RestPose, M1_FIT } from './helmet';
export type { M1HelmetOptions, ChinstrapMode } from './helmet';
export { buildMk2Grenade } from './grenade';
export { buildM1910Canteen, buildCanteenBody, buildCanteenCup, buildCanteenCover, M1910 } from './canteen';
export type { CanteenMetal, CoverOptions, M1910CanteenOptions } from './canteen';
export { buildM1943EntrenchingTool, buildM1943Tool, buildM1943Carrier, M1943 } from './etool';
export type { ToolState, M1943ToolOptions, M1943CarrierOptions } from './etool';
export {
  buildM1923BeltAlong,
  buildM1937BarBeltAlong,
  buildM1936PistolBeltAlong,
  buildM1923Belt,
  buildM1937BarBelt,
  buildM1936PistolBelt,
  defaultWaistPath,
  fastenerParts,
  US_BELT,
  US_FASTENER,
  M1923_BELT,
  M1937_BELT,
} from './belts';
export type { BeltPathOptions, BeltRig } from './belts';
export { buildM1923Pocket, buildM1937BarPocket, buildThompsonPouch, buildFirstAidPouch, buildPouch, POCKET_M1923, POCKET_M1937, THOMPSON_POUCH, FIRST_AID_POUCH, US_LOOP } from './pouches';
export type { PouchSpec } from './pouches';
export { buildM1Bayonet, buildM1BayonetModel, buildM7Scabbard, M1_BAYONET } from './bayonet';
export type { M1BayonetOptions } from './bayonet';
export { buildM1928Haversack, M1928, ETOOL_CLEAR, BAYONET_CLEAR } from './haversack';
export type { M1928HaversackOptions } from './haversack';
export { buildWebStrapAlong, buildM1936SuspendersAlong, buildHaversackStrapsAlong, buildBeltHook, hookGeometry, US_HOOK } from './straps';
export type { StrapPath, WebStrapOptions, SuspendersOptions, HaversackStrapsOptions } from './straps';
export { rigRifleman, rigBarGunner, rigSquadLeader, suspendersLaidOut } from './rigs';
export { US, type WebShade } from './palette';
export { withUSGearDetail, US_LOD } from './parts';

export interface GearEntry {
  key: string;
  doc: string;
  build: () => GearPiece;
  /** Review layout only: lay the piece flat (rotate -90 deg about X) on the board. */
  layFlat?: boolean;
  /** Worked example (several pieces on a mock torso), shown by the 'rigs' layout, not in 'all'. */
  demo?: boolean;
}

/** Every piece with a default configuration (used by the hidden review asset). */
export const US_GEAR: GearEntry[] = [
  { key: 'helmet', doc: 'M1 steel helmet, chinstrap open (worn frame)', build: () => buildM1Helmet({ chinstrap: 'open' }) },
  { key: 'mk2', doc: 'Mk 2 fragmentation grenade with M10A3 fuze', build: buildMk2Grenade },
  { key: 'canteen', doc: 'M1910 canteen in felt-lined cover with M1910 hanger (worn frame)', build: () => buildM1910Canteen() },
  { key: 'etool', doc: 'M1943 entrenching tool in its carrier (worn frame)', build: () => buildM1943EntrenchingTool() },
  { key: 'bayonet', doc: 'M1 bayonet in the M7 scabbard with wire hanger (worn frame)', build: () => buildM1Bayonet() },
  { key: 'firstaid', doc: 'M1942 first-aid pouch with M1910 hanger (worn frame)', build: () => buildFirstAidPouch() },
  { key: 'thompson', doc: 'Thompson 3-cell 30-round magazine pouch with belt loop (worn frame)', build: () => buildThompsonPouch() },
  { key: 'pocket', doc: 'One M1923 cartridge-belt pocket (flat, as on the belt panel)', build: () => buildM1923Pocket() },
  { key: 'barpocket', doc: 'One M1937 BAR-belt pocket (flat)', build: () => buildM1937BarPocket() },
  { key: 'haversack', doc: 'M1928 haversack with pack carrier and meat can pouch (worn frame)', build: () => buildM1928Haversack() },
  { key: 'm1923', doc: 'M1923 cartridge belt on the default waist loop', build: () => buildM1923Belt() },
  { key: 'm1937', doc: 'M1937 BAR magazine belt on the default waist loop', build: () => buildM1937BarBelt() },
  { key: 'm1936', doc: 'M1936 pistol belt on the default waist loop', build: () => buildM1936PistolBelt() },
  { key: 'suspenders', doc: 'M1936 suspenders laid out flat', build: suspendersLaidOut },
  { key: 'rig-rifleman', doc: 'Demo: rifleman rig on a mock torso', build: rigRifleman, demo: true },
  { key: 'rig-bar', doc: 'Demo: BAR gunner rig on a mock torso', build: rigBarGunner, demo: true },
  { key: 'rig-sl', doc: 'Demo: squad leader rig on a mock torso', build: rigSquadLeader, demo: true },
];
