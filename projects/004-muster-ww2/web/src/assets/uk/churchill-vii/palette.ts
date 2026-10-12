/**
 * Churchill Mk VII palette: the British S.C.C. No. 15 olive drab set shared with the Cromwell
 * (imported read-only; materials are memoised, so the same paint reads identically on both tanks),
 * with a darker, less polished steel for the heavy cast Churchill track links.
 */
import { M } from '../../../core/kit';
import { pal as cromwellPal } from '../cromwell/palette';

export { SCC15 } from '../cromwell/palette';

export function pal() {
  return {
    ...cromwellPal(),
    /** cast manganese-steel track links: dark, dusty, only lightly polished on the edges */
    track: M.steel({
      color: 0x36322d,
      roughness: 0.8,
      metalness: 0.6,
      colorVar: 0.12,
      varScale: 7,
      wear: 0.3,
      wearColor: 0x5c5851,
      dust: 0.45,
      dustHeight: 0.9,
      dustColor: 0x7d715c,
      bump: 0.08,
      bumpScale: 110,
      cavity: 0.55,
      name: 'chur-track',
    }),
  };
}
export type Pal = ReturnType<typeof pal>;
