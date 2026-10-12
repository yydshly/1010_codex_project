/**
 * Shared display furniture for loose pieces, so every standalone weapon / equipment item
 * is presented the same way (consistent collection look) and never half-buried in the soil.
 *
 *  - weaponStand(weapon): low dark-walnut base with two blackened-steel uprights and
 *    felt-lined cradles under the weapon's rest points. The weapon lies level, left side up
 *    towards the viewer (+X side visible from the default 3/4 view).
 *  - itemPlinth(object): small low hardwood block the item rests on.
 *
 * Returned groups follow the asset convention: origin on the ground (y = 0), +Z forward.
 */
import { THREE, M, G, part, group } from '../../core/kit';
import type { WeaponModel } from './contracts';

const walnut = () => M.plainWood(0x3b2a1e, [0, 0, 1], { roughness: 0.5, wear: 0.05, dust: 0 });
const blackSteel = () => M.gunSteel({ color: 0x1c1c1d, wear: 0.1, roughness: 0.45 });
const felt = () => M.cotton(0x2e3a2c, { detail: 'knit', detailSize: 0.006, dust: 0, cavity: 0.2 });

export interface StandOptions {
  /** Height of the weapon's lowest rest point above the ground (m). Default 0.14. */
  height?: number;
  /** Extra base length beyond the rest points (m). */
  overhang?: number;
  /** Show the sling (if the weapon has one). Default true. */
  sling?: boolean;
  /** Sling slack on the stand (m). Default 0.03 (runs close under the weapon). */
  slingSlack?: number;
}

/**
 * Put a weapon on a display stand. The weapon's bore axis ends up along +Z at rest height.
 * Rest points should be on the underside of the weapon; the two outermost are used.
 */
export function weaponStand(weapon: WeaponModel, opts: StandOptions = {}): THREE.Group {
  const lift = opts.height ?? 0.14;
  const pts = [...weapon.restPoints].sort((a, b) => a.z - b.z);
  const rear = pts[0], front = pts[pts.length - 1];
  // Level the weapon so both rest points sit at the same height.
  const dz = front.z - rear.z || 1e-3;
  const pitch = Math.atan2(front.y - rear.y, dz);
  const w = weapon.object.clone(true);
  const holder = new THREE.Group();
  holder.add(w);
  holder.rotation.x = pitch; // rotate so rest points are level
  holder.updateMatrixWorld(true);
  if (weapon.sling && opts.sling !== false) {
    // world "down" expressed in weapon-local space; a short slack keeps the strap close under the weapon
    const gLocal = new THREE.Vector3(0, -1, 0).applyQuaternion(holder.quaternion.clone().invert());
    holder.add(weapon.sling.build(gLocal, opts.slingSlack ?? 0.03));
  }
  const r0 = rear.clone().applyMatrix4(holder.matrixWorld);
  const r1 = front.clone().applyMatrix4(holder.matrixWorld);
  const midZ = (r0.z + r1.z) / 2;
  const cradleTop = lift + 0.035; // base 0.035 thick
  holder.position.set(-r0.x, cradleTop - r0.y, -midZ);

  const span = Math.abs(r1.z - r0.z);
  const baseL = Math.max(0.22, span + 2 * (opts.overhang ?? 0.06));
  const baseW = 0.13;
  const parts: THREE.Object3D[] = [];
  parts.push(part(G.rbox(baseW, 0.035, baseL, 0.008, 3), walnut(), { p: [0, 0.0175, 0] }));
  // bevelled top moulding
  parts.push(part(G.rbox(baseW - 0.02, 0.006, baseL - 0.02, 0.003, 2), walnut(), { p: [0, 0.036, 0] }));
  for (const zc of [r0.z - midZ, r1.z - midZ]) {
    const h = cradleTop - 0.035 - 0.012;
    parts.push(part(G.rod([0, 0.035, zc], [0, 0.035 + h, zc], 0.006, 16), blackSteel()));
    parts.push(part(G.cyl(0.014, 0.016, 0.004, 24), blackSteel(), { p: [0, 0.038, zc] }));
    // U cradle with felt lining
    const cr = G.torus(0.022, 0.0045, 10, 24, Math.PI);
    cr.rotateZ(Math.PI); // U opening upwards, in the XY plane (across the weapon's Z axis)
    parts.push(part(cr, blackSteel(), { p: [0, cradleTop + 0.01, zc] }));
    const pad = G.torus(0.0185, 0.003, 8, 20, Math.PI);
    pad.rotateZ(Math.PI);
    parts.push(part(pad, felt(), { p: [0, cradleTop + 0.013, zc] }));
  }
  const g = group([...parts, holder]);
  g.name = `${weapon.id}-on-stand`;
  return g;
}

/** Rest an item on a small, low hardwood block. The item's lowest point meets the block top. */
export function itemPlinth(item: THREE.Object3D, pad = 0.03, height = 0.025): THREE.Group {
  const b = new THREE.Box3().setFromObject(item, true);
  const size = b.getSize(new THREE.Vector3());
  const c = b.getCenter(new THREE.Vector3());
  const w = size.x + pad * 2, l = size.z + pad * 2;
  const holder = new THREE.Group();
  holder.add(item);
  holder.position.set(-c.x, height - b.min.y, -c.z);
  const blk = part(G.rbox(w, height, l, 0.005, 3), walnut(), { p: [0, height / 2, 0] });
  const g = group([blk, holder]);
  g.name = `${item.name || 'item'}-on-plinth`;
  return g;
}
