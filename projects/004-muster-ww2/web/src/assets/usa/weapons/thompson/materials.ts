/** Thompson M1A1 material set (see common/materials.ts for the finishes). */
import { USW } from '../common/materials';

export function thompsonMaterials() {
  return {
    walnut: USW.walnutThompson(),
    park: USW.park(),
    parkDark: USW.parkDark(),
    blued: USW.blued(),
    /** magazine: blued / black-oxide stamped steel */
    mag: USW.blued(),
    bright: USW.bright(),
    recess: USW.recess(),
    web: USW.web(),
    blackened: USW.blackened(),
    thread: USW.thread(),
  };
}

export type ThompsonMats = ReturnType<typeof thompsonMaterials>;
