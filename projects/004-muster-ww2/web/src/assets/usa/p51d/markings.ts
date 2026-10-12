/**
 * P-51D national insignia: the 1943-47 USAAF star-and-bar with Insignia Blue border, on both
 * fuselage sides, the upper port wing and the lower starboard wing. Each decal quad is re-meshed
 * as a grid that follows the curved skin 2.5 mm off the surface. No unit codes, serials, nose art
 * or stencils are applied.
 */
import * as THREE from 'three';
import { decal } from '../../../core/kit';
import { fuseX, fuseNormal } from './fuselage';
import { planform, wingPt } from './planform';
import { B } from './frame';

/** Star-and-bar (AN-I-9b proportions): circle radius R, bars R x R/2, border R/8. */
function drawStarBar(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const R = w / (4 + 0.25);
  const cx = w / 2, cy = h / 2;
  const b = R / 8;
  const blue = '#27324f', white = '#e8e6de';
  const barTop = cy - R * Math.sin((18 * Math.PI) / 180);
  const outline = (grow: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, R + grow, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 2 * R - grow, barTop - grow, 4 * R + 2 * grow, R / 2 + 2 * grow);
  };
  ctx.fillStyle = blue;
  outline(b);
  ctx.fillStyle = white;
  ctx.fillRect(cx - 2 * R, barTop, 4 * R, R / 2);
  ctx.fillStyle = blue;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  // white five-point star, one point up
  ctx.fillStyle = white;
  ctx.beginPath();
  const ri = R * 0.382;
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? R : ri;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

const KEY = 'p51d-star-bar';
const OFF = 0.0025;

function conform(width: number, map: (px: number, py: number) => THREE.Vector3): THREE.Mesh {
  const height = (width * 2.25) / 4.25;
  const m = decal(KEY, width, height, drawStarBar, {}, 1024);
  const g = new THREE.PlaneGeometry(width, height, 40, 20);
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

export function buildMarkings(): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  // fuselage sides, between the radiator exit and the tailplane
  const fs = 7.35, fy = -0.02, fw = 1.02;
  for (const side of [1, -1]) {
    out.push(
      conform(fw, (px, py) => {
        // seen from outside, decal +x runs aft on the port side and forward on the starboard side
        const ss = fs + side * px;
        const y = fy + py;
        const x = fuseX(ss, y);
        const n = fuseNormal(ss, y);
        return B(side * x, y, ss).add(new THREE.Vector3(side * n.x, n.y, n.z).multiplyScalar(OFF));
      }),
    );
  }
  // wings: upper port, lower starboard (USAAF practice from 1942)
  const wax = 3.95, ww = 1.7;
  const mid = (ax: number) => {
    const { le, te } = planform(ax);
    return le + 0.45 * (te - le);
  };
  const sc = mid(wax);
  const wing = (side: number, upper: boolean) =>
    conform(ww, (px, py) => {
      // seen from outside (above port / below starboard) decal +x runs inboard; star points forward
      const ax = wax - px;
      const s = sc - py;
      const { le, te } = planform(ax);
      const u = (s - le) / (te - le);
      const p = wingPt(ax, u, upper, side);
      p.y += upper ? OFF : -OFF;
      return p;
    });
  out.push(wing(1, true));
  out.push(wing(-1, false));
  return out;
}
