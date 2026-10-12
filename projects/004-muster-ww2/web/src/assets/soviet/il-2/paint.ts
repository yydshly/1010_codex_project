/**
 * Il-2 palette (1943-44 standard scheme) and markings.
 *  - upper surfaces: AMT-4 green with AMT-6 black disruptive pattern (soft-edged spray)
 *  - lower surfaces: AMT-7 light blue
 *  - red star with white border and thin red outline (style ordered in 1943)
 * In-scene colours are approximations of the lacquers; tone mapping lightens slightly.
 */
import * as THREE from 'three';
import { M } from '../../../core/kit';

export const COL = {
  green: 0x4a5530,
  black: 0x1f211d,
  blue: 0x8ea3b1,
  interior: 0x5f655c,
  dark: 0x1b1c1b,
  red: 0xa8231c,
  white: 0xecebe4,
};

export function palette() {
  return {
    /** upper skin: AMT-4 green + AMT-6 black pattern */
    top: M.paint(COL.green, {
      camo: { colors: [COL.black], scale: 0.32, coverage: [0.43], softness: 0.035, seed: 7.0 },
      roughness: 0.68,
      wear: 0.18,
      wearColor: 0x6b6d69,
      wearMetalness: 0.55,
      dust: 0.12,
      dustHeight: 1.2,
      dustColor: 0x93846c,
      cavity: 0.75,
      colorVar: 0.06,
      varScale: 1.4,
      name: 'il2-top',
    }),
    /** lower skin: AMT-7 light blue */
    bottom: M.paint(COL.blue, {
      roughness: 0.66,
      wear: 0.16,
      wearColor: 0x74777a,
      wearMetalness: 0.55,
      dust: 0.22,
      dustHeight: 1.1,
      dustColor: 0x8d806b,
      cavity: 0.75,
      colorVar: 0.05,
      varScale: 1.4,
      name: 'il2-bottom',
    }),
    /** plain green parts (spinner, wheel hubs) */
    green: M.paint(COL.green, { roughness: 0.62, wear: 0.3, dust: 0.2, dustHeight: 0.6, name: 'il2-green' }),
    interior: M.paint(COL.interior, { roughness: 0.7, wear: 0.25, dust: 0.05, cavity: 0.6, name: 'il2-interior' }),
    dark: M.paint(COL.dark, { roughness: 0.55, wear: 0.15, dust: 0, cavity: 0.3, name: 'il2-dark' }),
    blade: M.paint(0x1d1e1c, { roughness: 0.5, wear: 0.22, wearColor: 0x6e7072, dust: 0.08, dustHeight: 1.0, name: 'il2-blade' }),
    rubber: M.rubber(),
    steel: M.steel({ roughness: 0.35, wear: 0.2, dust: 0.1, name: 'il2-oleo' }),
    gun: M.gunSteel(),
    exhaust: M.surface({
      color: 0x4a3a2e,
      roughness: 0.78,
      metalness: 0.45,
      colorVar: 0.2,
      varScale: 30,
      roughVar: 0.2,
      bump: 0.12,
      bumpScale: 300,
      cavity: 0.5,
      name: 'il2-exhaust',
    }),
    leather: M.leather(0x3a2a1e),
    glass: M.glass(),
    armourGlass: M.glass({ tint: 0xb9d3c6, opacity: 0.3, roughness: 0.03 }),
    navRed: M.glass({ tint: 0xd8261c, opacity: 0.8, roughness: 0.1 }),
    navGreen: M.glass({ tint: 0x2fbf4f, opacity: 0.8, roughness: 0.1 }),
  };
}
export type Palette = ReturnType<typeof palette>;

/** Five-pointed star outline (canvas coords), centre cx, cy, outer radius R. */
function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  const r = R * 0.382; // regular pentagram inner radius
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? R : r;
    const x = cx + rr * Math.cos(a), y = cy + rr * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Red star with a white border and a thin red outline; the star fills the square canvas
 * (tip up, image top = +v of the decal).
 */
export function drawStar(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.53, R = w * 0.5;
  const red = '#' + new THREE.Color(COL.red).getHexString();
  const white = '#' + new THREE.Color(COL.white).getHexString();
  // concentric regular stars have parallel edges 0.309 * (k1 - k2) * R apart,
  // so the scale steps give uniform borders (thin red outline, wider white border)
  starPath(ctx, cx, cy, R * 0.985);
  ctx.fillStyle = red;
  ctx.fill();
  starPath(ctx, cx, cy, R * 0.93);
  ctx.fillStyle = white;
  ctx.fill();
  starPath(ctx, cx, cy, R * 0.66);
  ctx.fillStyle = red;
  ctx.fill();
}
