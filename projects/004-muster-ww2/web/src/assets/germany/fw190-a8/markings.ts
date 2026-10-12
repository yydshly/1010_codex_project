/**
 * Fw 190 A-8 national markings: Balkenkreuz decals on the fuselage sides and the upper and lower
 * wings. Each decal() quad is re-meshed as a fine grid that follows the curved skin 2.5 mm off the
 * surface. No swastika is applied to the fin (deliberate omission).
 */
import * as THREE from 'three';
import { decal } from '../../../core/kit';
import { B, WG, fuseX, fuseNormal, planform } from './frame';
import { wingPt } from './wing';

/** Balkenkreuz: black cross, white corner brackets, thin black outline. */
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
  plus(wb + ww + wo, A, '#151515');
  plus(wb + ww, A - wo, '#e6e4dc');
  plus(wb, A, '#151515');
}

const KEY = 'fw190-a8-balkenkreuz';
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
  // fuselage sides, between the cockpit and the tail
  const fs = 6.25, fy = 0.07, fsize = 0.64;
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
  const wax = WG.cross, wsize = 0.9;
  const { le: le0, te: te0 } = planform(wax);
  const sc = le0 + 0.45 * (te0 - le0);
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
