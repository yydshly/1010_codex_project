/**
 * Mosin-Nagant M1891/30 (7.62 x 54 mmR) bolt-action rifle, round receiver - shared weapon model.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by the soldier builders):
 *
 *   import { buildMosin9130 } from '../soviet/weapons/mosin-9130.model';   // path relative to your module
 *   const rifle = buildMosin9130({ bayonet: 'fixed' });                       // -> WeaponModel (shared/contracts.ts)
 *
 *   Mosin9130Options
 *     bayonet: 'none' (default) | 'fixed'   M1891/30 socket bayonet (cruciform spike, blade right of the muzzle)
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, weapon's left side +X.
 * ORIGIN = trigger-hand grip centre: centre of the stock wrist section 290 mm forward of the butt plate
 * (53 mm behind the trigger face), 40.8 mm below the bore axis.
 * Real scale (m): overall 1.232 (1.662 with bayonet), barrel 0.730, butt plate at z = -0.290.
 *
 *   grips.trigger  wrist of the stock: axis along the wrist centreline (forward, rising ~15 deg), palm on the
 *                  right side of the wrist (-X), radius 19.5 mm, length 90 mm.
 *   grips.support  fore-end at the finger grooves, 400 mm ahead of the wrist grip (GRIP_SUPPORT_U = 690 mm
 *                  from the butt, 38 mm ahead of the rear-sight base): axis +Z, palm under the fore-end (-Y),
 *                  radius 21.5 mm, length 120 mm.
 *   shoulder       centre of the steel butt plate.
 *   muzzle         muzzle crown centre (the bayonet does not move it).
 *   sling          front = leather dog-collar loop through the fore-end slot (left side), rear = dog-collar loop
 *                  through the butt slot (left side). sling.build(gravityLocal, slack) returns the canvas sling
 *                  with both leather dog collars; it is NOT part of `object`.
 *   restPoints     [underside of the wrist behind the trigger-guard tang, underside of the fore-end] (true surface).
 *   sockets        'trigger' (trigger face), 'boltHandle' (knob centre), 'muzzle', 'bayonetTip' (only when fixed).
 *
 * Parts are authored in a bore frame (mm stations along the bore from the butt, see mosin-9130/dims.ts)
 * and shifted so that the grip centre is the origin.
 */
import { THREE, group, part } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { U, GRIP, stockTop, stockBot, hgTop } from './mosin-9130/dims';
import {
  stockGeo, handguardGeo, barrelParts, rearSight, frontSight, bands, cleaningRod, receiver, bolt,
  magazineAndGuard, buttPlate, slotHardware, bayonet, mosinSling, slingPoints, stockSection,
} from './mosin-9130/parts';
import { SUW } from './common/materials';

export interface Mosin9130Options {
  bayonet?: 'none' | 'fixed';
}

/** Design station (mm from the butt plate) of the support-hand grip on the fore-end. */
export const GRIP_SUPPORT_U = 690;

export const MOSIN_9130 = {
  length: 1.232,
  lengthWithBayonet: 1.6615,
  barrel: 0.73,
  /** Grip-frame offset: bore-frame point (x, y, u) mm -> local ((x), (y - y0), (u - u0)) / 1000. */
  frame: GRIP,
};

const MM = 0.001;
const L = (x: number, y: number, u: number) => new THREE.Vector3(x * MM, (y - GRIP.y0) * MM, (u - GRIP.u0) * MM);
const toLocal = (p: THREE.Vector3) => p.clone().sub(new THREE.Vector3(0, GRIP.y0 * MM, GRIP.u0 * MM));

/** Stock cross-section at design station u, in weapon-local metres ([x, y] pairs). */
export function mosinSectionLocal(u: number): [number, number][] {
  return stockSection(u).map(([x, y]) => [x * MM, (y - GRIP.y0) * MM]);
}

export function buildMosin9130(opts: Mosin9130Options = {}): WeaponModel {
  const fixed = opts.bayonet === 'fixed';
  const wood = SUW.birchMosin();
  const parts: THREE.Object3D[] = [
    part(stockGeo(), wood),
    part(handguardGeo(), wood),
    ...barrelParts(),
    ...rearSight(),
    ...frontSight(),
    ...bands(),
    ...cleaningRod(),
    ...receiver(),
    ...bolt(),
    ...magazineAndGuard(),
    ...buttPlate(),
    ...slotHardware(),
  ];
  if (fixed) parts.push(...bayonet());
  const inner = group(parts, { p: [0, -GRIP.y0 * MM, -GRIP.u0 * MM], name: 'mosin-9130-parts' });
  const object = group([inner], { name: fixed ? 'mosin-9130-bayonet' : 'mosin-9130' });

  // grips
  const mid = (u: number) => (stockTop(u) + stockBot(u)) / 2;
  const tAxis = new THREE.Vector3(0, mid(310) - mid(270), 40).normalize();
  const tPalm = new THREE.Vector3(-1, 0.25, 0);
  tPalm.addScaledVector(tAxis, -tPalm.dot(tAxis)).normalize();
  const trigger: Grip = { position: new THREE.Vector3(0, 0, 0), axis: tAxis, palm: tPalm, radius: 0.0195, length: 0.09 };
  const su = GRIP_SUPPORT_U;
  const support: Grip = {
    position: L(0, (stockBot(su) + hgTop(su)) / 2, su),
    axis: new THREE.Vector3(0, 0, 1),
    palm: new THREE.Vector3(0, -1, 0),
    radius: 0.0215,
    length: 0.12,
  };

  const sp = slingPoints();
  const sockets: Record<string, THREE.Matrix4> = {
    trigger: new THREE.Matrix4().makeTranslation(...L(0, -60, 346).toArray()),
    boltHandle: new THREE.Matrix4().makeTranslation(...L(-54.5, -8.3, 371).toArray()),
    muzzle: new THREE.Matrix4().makeTranslation(...L(0, 0, U.muzzle).toArray()),
  };
  if (fixed) sockets.bayonetTip = new THREE.Matrix4().makeTranslation(...L(-21.5, -5, 1661.5).toArray());

  return {
    id: 'su-mosin-9130',
    object,
    grips: { trigger, support },
    shoulder: L(0, (stockTop(0) + stockBot(0)) / 2, 0),
    muzzle: L(0, 0, U.muzzle),
    sling: {
      front: toLocal(sp.front),
      rear: toLocal(sp.rear),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        const s = mosinSling(gravityLocal, slack);
        return group([s], { p: [0, -GRIP.y0 * MM, -GRIP.u0 * MM], name: 'mosin-9130-sling' });
      },
    },
    length: fixed ? MOSIN_9130.lengthWithBayonet : MOSIN_9130.length,
    restPoints: [L(0, stockBot(262), 262), L(0, stockBot(985), 985)],
    sockets,
  };
}
