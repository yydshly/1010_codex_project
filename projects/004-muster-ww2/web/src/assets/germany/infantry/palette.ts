/**
 * Materials for the German (Heer, 1943-44) infantry kit.
 *
 * Draw calls = distinct materials, so the kit deliberately SHARES materials with the uniform
 * (same M.* arguments as the shared uniform builder -> the same memoised material) and with the
 * German gear palette (germany/gear/palette.ts): black leather, hardware, canvas, painted steel.
 * Only the Zeltbahn camouflage, the collar-patch bars and the cockade red are kit-specific.
 */
import { M } from '../../../core/kit';
import type * as THREE from 'three';
import { clothMaterial } from '../../shared/human/uniform';
import { P } from '../gear/palette';
import { DE_M40 } from './uniform';

export const U = {
  /** Field tunic wool (the uniform's own material). */
  tunic: () => clothMaterial(DE_M40.tunic.cloth),
  /** Trouser wool (the uniform's own material). */
  trousers: () => clothMaterial(DE_M40.trousers.cloth),
  /** Black leather: belt, Y-straps, K98 pouches, holster, tool pouch, straps. */
  belt: () => P.blackLeather(),
  holster: () => P.blackLeather(),
  /** Painted field-grey buttons / buckle: identical to the uniform's button material. */
  button: () => {
    const c = DE_M40.tunic.buttons?.color ?? 0x585a4e;
    return M.paint(c, { roughness: 0.42, metalness: 0.35, wear: 0.4, dust: 0.08, cavity: 0.2, name: 'button-' + c });
  },
  buckle: () => U.button(),
  /** Steel hardware (hooks, D-rings, buckles). */
  hardware: () => P.hardware(),
  /** Canvas and webbing (bread bag, MP 40 pouches, A-frame, gas-mask sling). */
  canvas: () => P.canvas(),
  webbing: () => P.canvas(),
  /** Field-grey painted sheet steel (gas-mask canister, mess tin). */
  greySteel: () => P.greySteel(),
  olivePaint: () => P.greySteel(),
  /** Tunic shoulder-strap piping (white): identical to the uniform's piping material. */
  piping: () => {
    const c = DE_M40.tunic.shoulderStraps?.piping ?? 0xc9c5b2;
    return M.wool(c, { detailSize: 0.006, name: 'piping-' + c });
  },
  /** Woven collar-patch bars (Litzen): mouse-grey. */
  litzen: () =>
    M.cotton(0x8e8f86, { detail: 'twill', detailSize: 0.0025, detailStrength: 0.9, sheen: 0.5, colorVar: 0.04, dust: 0, cavity: 0.5, name: 'de-inf-litzen' }),
  /** Zeltbahn cotton duck, splinter-pattern printed (muted). */
  zeltbahn: () =>
    M.canvas(0x7b765a, {
      detailSize: 0.01,
      detailStrength: 0.7,
      colorVar: 0.05,
      camo: { colors: [0x4e5a3c, 0x6d5a40], scale: 9, coverage: [0.42, 0.28], softness: 0.02, seed: 7 },
      dust: 0.08,
      dustHeight: 0.4,
      dustColor: 0x857a66,
      name: 'de-inf-zeltbahn',
    }),
  /** Cockade colours: black (leather), white (piping cloth), red (own). */
  cockadeBlack: () => P.blackLeather(),
  cockadeWhite: () => U.piping(),
  cockadeRed: () => M.cotton(0x7a2a22, { detailStrength: 0.3, dust: 0, sheen: 0.3, cavity: 0.2, name: 'de-inf-cockade-red' }),
};

/**
 * Gear-palette materials that are too small to justify their own draw call on a soldier are
 * swapped for a close equivalent (thread/cord -> black leather, aluminium/blued/bare steel ->
 * hardware, Bakelite -> black paint, pressed board -> black leather).
 */
export function consolidate(root: THREE.Object3D): void {
  const map = new Map<THREE.Material, THREE.Material>([
    [P.thread(), P.blackLeather()],
    [P.cord(), P.blackLeather()],
    [P.alu(), P.hardware()],
    [P.blued(), P.hardware()],
    [P.bareSteel(), P.hardware()],
    [P.bakelite(), P.blackPaint()],
    [P.presstoff(), P.blackLeather()],
  ]);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const r = map.get(m.material as THREE.Material);
    if (r) m.material = r;
  });
}
