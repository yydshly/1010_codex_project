/**
 * Bf 109 G-6 national markings: Balkenkreuz decals (fuselage sides, upper and lower wings).
 * Each decal() quad is re-meshed as a fine grid that follows the curved skin 2.5 mm off the
 * surface, so the painted cross hugs the fuselage and wing contours. No swastika is applied.
 */
import * as THREE from 'three';
import { decal } from '../../../core/kit';
import { fuseX, fuseNormal } from './fuselage';
import { wingPt, planform } from './wing';
import { B } from './frame';

/** Balkenkreuz: black cross, white corner brackets, thin black outline (1943 style). */
export function drawBalkenkreuz(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const c = w / 2;
  const S = w * 0.97;
  const A = S / 2;
  const wb = S * 0.1, ww = S * 0.075, wo = S * 0.016;
  const plus = (half: number, len: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(c - half, c - len, 2 * half, 2 * len);
    ctx.fillRect(c - len, c - half, 2 * len, 2 * half);
  };
  plus(wb + ww + wo, A, '#141414');
  plus(wb + ww, A - wo, '#e9e7df');
  plus(wb, A, '#141414');
}

const KEY = 'bf109-g6-balkenkreuz';
const N = 28;

/** Build a decal whose grid vertices are mapped by `map(px, py)` (plane coords, metres). */
function conform(size: number, map: (px: number, py: number) => THREE.Vector3): THREE.Mesh {
  const m = decal(KEY, size, size, drawBalkenkreuz, {}, 512);
  const g = new THREE.PlaneGeometry(size, size, N, N);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = map(p.getX(i), p.getY(i));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  m.geometry.dispose();
  m.geometry = g;
  return m;
}

const OFF = 0.0025;

export function buildMarkings(): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // fuselage sides
  const fs = 5.8, fy = 0.12, fsize = 0.62;
  for (const side of [1, -1]) {
    out.push(
      conform(fsize, (px, py) => {
        const s = fs + side * px;
        const y = fy + py;
        const x = fuseX(s, y);
        const n = fuseNormal(s, y);
        return B(side * x, y, s).add(new THREE.Vector3(side * n.x, n.y, n.z).multiplyScalar(OFF));
      }),
    );
  }
  // wings (upper and lower, both sides)
  const wax = 3.3, wsize = 0.92;
  const midS = (ax: number) => {
    const { le, te } = planform(ax);
    return le + 0.47 * (te - le);
  };
  const sc = midS(wax);
  for (const side of [1, -1]) {
    for (const upper of [true, false]) {
      out.push(
        conform(wsize, (px, py) => {
          const ax = wax + side * px;
          const s = upper ? sc + py : sc - py;
          const { le, te } = planform(ax);
          const u = (s - le) / (te - le);
          const p = wingPt(ax, u, upper, side);
          p.y += upper ? OFF : -OFF;
          return p;
        }),
      );
    }
  }
  return out;
}
