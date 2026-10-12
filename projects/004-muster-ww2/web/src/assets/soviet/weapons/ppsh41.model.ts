/**
 * PPSh-41 (7.62 x 25 mm Tokarev) submachine gun - shared weapon model.
 *
 * STABLE EXPORT (used by the standalone catalog entry and by the soldier builders):
 *
 *   import { buildPpsh41 } from '../soviet/weapons/ppsh41.model';   // path relative to your module
 *   const smg = buildPpsh41({ magazine: 'drum' });                   // -> WeaponModel (shared/contracts.ts)
 *
 *   Ppsh41Options
 *     magazine: 'drum' (default, 71-round drum) | 'box' (35-round curved box magazine)
 *
 * Depicts a later-production gun with the L-type flip rear sight (100 / 200 m leaves), hooded front
 * sight, stamped perforated barrel jacket ending in the slanted compensator plate, hinged receiver,
 * sliding safety catch on the cocking handle, fire selector inside the trigger guard, magazine catch
 * behind the magazine well, birch stock with a hinged butt-plate trap, sling swivels on the left.
 *
 * Weapon-local frame (contract): bore along +Z (muzzle +Z), sights +Y, weapon's left side +X.
 * ORIGIN = trigger-hand grip centre: centre of the stock wrist section 308 mm forward of the butt plate
 * (58 mm behind the trigger face), ~40 mm below the bore axis. Real scale (m): overall 0.843, barrel 0.269.
 *
 *   grips.trigger  wrist of the stock (no pistol grip): axis along the wrist (forward, rising), palm on the
 *                  right side (-X), radius 18 mm, length 80 mm.
 *   grips.support  drum: the common hold under the front-lower edge of the drum (axis along the drum edge,
 *                  forward and slightly up; palm under the drum), radius 31 mm (half the drum thickness).
 *                  box: the upper part of the box magazine (axis up the magazine, palm on its left-rear face).
 *   shoulder       centre of the butt plate.
 *   muzzle         bullet hole in the compensator plate (the barrel's own muzzle is 10 mm behind it).
 *   sling          front = D loop of the swivel on the receiver's left side, rear = D loop of the swivel on
 *                  the left of the butt. sling.build(gravityLocal, slack) returns the canvas sling; it is NOT
 *                  part of `object`.
 *   restPoints     [stock underside just behind the trigger guard, underside of the barrel jacket].
 *   sockets        'trigger', 'boltHandle', 'magazine' (drum centre / box top), 'muzzle'.
 */
import { THREE, group, part } from '../../../core/kit';
import type { WeaponModel, Grip } from '../../shared/contracts';
import { U, GRIP, DRUM, JACKET_R, stockTop, stockBot } from './ppsh41/dims';
import {
  stockGeo, stockSection, buttPlate, receiver, jacket, rearSight, lowerParts, drum, boxMagazine, boxFrame, swivels, slingPoints, ppshSling,
} from './ppsh41/parts';
import { SUW } from './common/materials';

export interface Ppsh41Options {
  magazine?: 'drum' | 'box';
}

export const PPSH_41 = { length: 0.843, barrel: 0.269, frame: GRIP };

const MM = 0.001;
const L = (x: number, y: number, u: number) => new THREE.Vector3(x * MM, (y - GRIP.y0) * MM, (u - GRIP.u0) * MM);
const toLocal = (p: THREE.Vector3) => p.clone().sub(new THREE.Vector3(0, GRIP.y0 * MM, GRIP.u0 * MM));

/** Stock cross-section at station u (mm), weapon-local metres. */
export function ppshSectionLocal(u: number): [number, number][] {
  return stockSection(u).map(([x, y]) => [x * MM, (y - GRIP.y0) * MM]);
}

/** Barrel-jacket cross-section (weapon-local metres). */
export function ppshJacketSectionLocal(): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    out.push([JACKET_R * Math.cos(a) * MM, (JACKET_R * Math.sin(a) - GRIP.y0) * MM]);
  }
  return out;
}

export function buildPpsh41(opts: Ppsh41Options = {}): WeaponModel {
  const withDrum = opts.magazine !== 'box';
  const parts: THREE.Object3D[] = [
    part(stockGeo(), SUW.birchPpsh()),
    ...buttPlate(),
    ...receiver(),
    ...jacket(),
    ...rearSight(),
    ...lowerParts(),
    ...swivels(),
    ...(withDrum ? drum() : boxMagazine()),
  ];
  const inner = group(parts, { p: [0, -GRIP.y0 * MM, -GRIP.u0 * MM], name: 'ppsh41-parts' });
  const object = group([inner], { name: withDrum ? 'ppsh41-drum' : 'ppsh41-box' });

  const mid = (u: number) => (stockTop(u) + stockBot(u)) / 2;
  const tAxis = new THREE.Vector3(0, mid(328) - mid(288), 40).normalize();
  const tPalm = new THREE.Vector3(-1, 0.25, 0);
  tPalm.addScaledVector(tAxis, -tPalm.dot(tAxis)).normalize();
  const trigger: Grip = { position: new THREE.Vector3(), axis: tAxis, palm: tPalm, radius: 0.018, length: 0.08 };

  let support: Grip;
  let magSocket: THREE.Vector3;
  if (withDrum) {
    const th = (-70 * Math.PI) / 180;
    const rimU = DRUM.u + DRUM.R * Math.cos(th), rimY = DRUM.y + DRUM.R * Math.sin(th);
    const r = 31;
    support = {
      position: L(3, rimY - r * Math.sin(th), rimU - r * Math.cos(th)),
      axis: new THREE.Vector3(0, Math.cos(th), -Math.sin(th)).normalize(),
      palm: new THREE.Vector3(0, Math.sin(th), Math.cos(th)).normalize(),
      radius: r * MM,
      length: 0.07,
    };
    magSocket = L(0, DRUM.y, DRUM.u);
  } else {
    const f = boxFrame(0.3);
    const axis = f.T.clone().negate().normalize();
    const palm = new THREE.Vector3(0.85, 0, -0.5);
    palm.addScaledVector(axis, -palm.dot(axis)).normalize();
    support = { position: toLocal(f.p), axis, palm, radius: 0.017, length: 0.08 };
    magSocket = toLocal(boxFrame(0).p);
  }

  const sp = slingPoints();
  return {
    id: 'su-ppsh41',
    object,
    grips: { trigger, support },
    shoulder: L(0, mid(4), 0),
    muzzle: L(0, 0, 829),
    sling: {
      front: toLocal(sp.front),
      rear: toLocal(sp.rear),
      build(gravityLocal: THREE.Vector3, slack = 0.12) {
        return group([ppshSling(gravityLocal, slack, withDrum)], { p: [0, -GRIP.y0 * MM, -GRIP.u0 * MM], name: 'ppsh41-sling' });
      },
    },
    length: PPSH_41.length,
    restPoints: [L(0, stockBot(330), 330), L(0, -JACKET_R, 780)],
    sockets: {
      trigger: new THREE.Matrix4().makeTranslation(...L(0, -52, U.trigger).toArray()),
      boltHandle: new THREE.Matrix4().makeTranslation(...L(-36, 0, 474).toArray()),
      magazine: new THREE.Matrix4().makeTranslation(...magSocket.toArray()),
      muzzle: new THREE.Matrix4().makeTranslation(...L(0, 0, 829).toArray()),
    },
  };
}
