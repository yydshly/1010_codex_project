/** M1 Garand material set (see common/materials.ts for the finishes). */
import { USW } from '../common/materials';

export function garandMaterials() {
  return {
    walnut: USW.walnutGarand(),
    walnutHg: USW.walnutGarandHg(),
    park: USW.park(),
    parkDark: USW.parkDark(),
    checker: USW.checker(),
    blued: USW.blued(),
    bright: USW.bright(),
    recess: USW.recess(),
    leather: USW.leather(),
    brass: USW.brass(),
    thread: USW.thread(),
  };
}

export type GarandMats = ReturnType<typeof garandMaterials>;
