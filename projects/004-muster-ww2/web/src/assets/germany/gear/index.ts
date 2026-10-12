/**
 * German (Heer, 1943-44) field gear - rigid carried items as reusable GearPieces.
 * See each module for the gear-local frame; all follow src/assets/shared/contracts.ts.
 */
import type { GearPiece } from '../../shared/contracts';
import { buildM40Helmet } from './helmet';
import { buildStickGrenade } from './grenade';
import { buildCanteen } from './canteen';
import { buildEntrenchingTool } from './shovel';

export { buildM40Helmet, helmetRestPose, shellPoint } from './helmet';
export type { HelmetOptions } from './helmet';
export { buildStickGrenade, buildStickGrenadeAxial, M24 } from './grenade';
export { buildCanteen } from './canteen';
export { buildEntrenchingTool } from './shovel';
export type { EntrenchingToolOptions } from './shovel';

/** Every piece with default options (used by the review sheet). */
export const GERMAN_GEAR: Record<string, () => GearPiece> = {
  helmet: () => buildM40Helmet(),
  grenade: () => buildStickGrenade(),
  canteen: () => buildCanteen(),
  shovel: () => buildEntrenchingTool(),
};
