/**
 * Contracts between asset modules that are built by different authors:
 *  - weapon models (used both on soldiers and as loose display pieces)
 *  - rigid gear pieces (pouches, canteens, helmets, ... fitted to soldiers by the infantry modules)
 */
import type * as THREE from 'three';

/**
 * A place where a hand holds the weapon. All vectors are in WEAPON-LOCAL space.
 * The gripped section is approximated by a cylinder segment.
 */
export interface Grip {
  /** Centre of the gripped section (where the centre of the palm/fist wraps around). */
  position: THREE.Vector3;
  /**
   * Unit axis of the gripped section, pointing towards the side where the thumb and index
   * finger lie: UP along a pistol grip; FORWARD (towards the muzzle) along a rifle wrist,
   * handguard, barrel jacket or drum magazine edge.
   */
  axis: THREE.Vector3;
  /** Unit vector from the grip centre towards where the palm rests on the surface. */
  palm: THREE.Vector3;
  /** Approximate radius of the gripped section (m), so fingers wrap outside it. */
  radius: number;
  /** Optional: length of the grippable section along `axis` (m). */
  length?: number;
}

/**
 * Weapon-local frame: bore axis along +Z (muzzle towards +Z), sights / top towards +Y,
 * weapon's left side towards +X. ORIGIN = trigger-hand grip centre (grips.trigger.position = 0,0,0).
 */
export interface WeaponModel {
  id: string;
  /** The un-baked, authored weapon (the soldier/stand builders bake the final object). */
  object: THREE.Group;
  grips: {
    /** Firing (right) hand: pistol grip or wrist of the stock. */
    trigger: Grip;
    /** Supporting (left) hand: handguard, barrel jacket, magazine well, bipod/jacket, etc. */
    support: Grip;
  };
  /** Centre of the butt plate / shoulder contact (if the weapon has a stock). */
  shoulder?: THREE.Vector3;
  muzzle: THREE.Vector3;
  /** Sling attachment points (swivels / slots), if the weapon has a sling. */
  sling?: {
    front: THREE.Vector3;
    rear: THREE.Vector3;
    /**
     * Build the sling (leather/canvas strap) hanging naturally between the attachment points
     * for a given gravity direction expressed in WEAPON-LOCAL space (unit vector), so it hangs
     * correctly whatever pose the weapon is in. `slack` in metres of extra length (default ~0.12).
     * The weapon's `object` does NOT include the sling; callers add the result of this builder.
     */
    build(gravityLocal: THREE.Vector3, slack?: number): THREE.Object3D;
  };
  /** Overall length (m). */
  length: number;
  /**
   * Two or more points on the UNDERSIDE of the weapon where it can rest on a display cradle
   * (weapon-local). Used by the shared display stand.
   */
  restPoints: THREE.Vector3[];
  /** Optional named sub-transforms (e.g. 'magazine', 'bipod') for pose-specific tweaks. */
  sockets?: Record<string, THREE.Matrix4>;
}

/** Where a rigid gear piece goes on the body. The infantry modules decide the exact fit. */
export type GearMount =
  | 'head'
  | 'belt-front-left'
  | 'belt-front-right'
  | 'belt-left'
  | 'belt-right'
  | 'belt-rear'
  | 'belt-rear-left'
  | 'belt-rear-right'
  | 'back'
  | 'shoulder-strap'
  | 'chest'
  | 'hip';

/**
 * Rigid gear piece in GEAR-LOCAL space:
 *  +Z points AWAY from the body (outwards), +Y is up when worn, the back face that touches
 *  the body/belt lies in the plane z = 0, and the origin is the attachment point
 *  (e.g. the belt-loop centre for a belt item, the top of the head opening for a helmet).
 */
export interface GearPiece {
  id: string;
  name: string;
  object: THREE.Group;
  mount: GearMount;
  /** Bounding size (m) when worn: w along X, h along Y, d along Z (protrusion from the body). */
  size: { w: number; h: number; d: number };
  /** For belt items: the belt height relative to the origin and the belt width the loops accept. */
  belt?: { loopWidth: number };
  /** Optional strap anchor points (gear-local) for straps the infantry module draws to the body. */
  strapAnchors?: THREE.Vector3[];
}
