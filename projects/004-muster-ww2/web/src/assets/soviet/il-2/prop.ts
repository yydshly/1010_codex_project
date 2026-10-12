/**
 * Il-2 propeller (body frame): pointed spinner and three variable-pitch blades
 * (3.6 m diameter), parked static with one blade near the top.
 */
import * as THREE from 'three';
import { G, part, group } from '../../../core/kit';
import { Grid, V, lerp, curve, smooth, linspace, naca, camberLine, cosSpace, DEG } from './geo';
import { D } from './dims';
import type { Palette } from './paint';

const spinR = (h: number) => {
  // radius at distance h aft of the tip
  const u = 1 - h / D.spinner.len;
  return D.spinner.r * Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, u), 1.7)), 0.85);
};

function spinner(pal: Palette): THREE.Object3D {
  const L = D.spinner.len;
  const prof: [number, number][] = [[0, 0]];
  for (const u of linspace(0, 1, 28)) prof.push([u >= 1 ? 0 : spinR((1 - u) * L), u * L]);
  prof[1][0] = Math.max(prof[1][0], 0.0005);
  const out: THREE.Object3D[] = [part(G.lathe(prof, 40, 50), pal.green, { p: [0, 0, -L], r: [90, 0, 0] })];
  out.push(part(G.cyl(D.spinner.r + 0.004, D.spinner.r + 0.004, 0.028, 40), pal.green, { p: [0, 0, -(L - 0.012)], r: [90, 0, 0] }));
  return group(out, { name: 'spinner' });
}

/**
 * One blade along +Y (radial), prop plane z = 0. The leading edge leads towards -X and sits
 * forward (+Z) of the trailing edge (tractor pitch); the cambered face looks forward.
 */
function blade(): THREE.BufferGeometry {
  const Rt = D.prop.r;
  const chord = curve([[0.2, 0.12], [0.4, 0.2], [0.75, 0.29], [1.2, 0.275], [1.6, 0.23], [1.72, 0.2]]);
  const tcf = curve([[0.2, 1.0], [0.42, 0.34], [0.7, 0.18], [1.1, 0.11], [1.75, 0.07]]);
  const beta = curve([[0.2, 52], [0.5, 42], [0.9, 30], [1.4, 22], [1.8, 18]]);
  const radii = [...linspace(0.2, 1.6, 24), ...linspace(0, 1, 9).map((k) => 1.6 + (Rt - 1.6) * Math.sin((k * Math.PI) / 2)).slice(1)];
  const nF = 15;
  const fr = cosSpace(nF);
  const pts: [number, number][] = [];
  for (let k = nF - 1; k >= 0; k--) pts.push([fr[k], 1]);
  for (let k = 1; k < nF - 1; k++) pts.push([fr[k], -1]);
  const n = pts.length;
  const P: THREE.Vector3[][] = radii.map((r) => {
    const tipK = r > 1.62 ? Math.sqrt(Math.max(0, 1 - ((r - 1.62) / (Rt - 1.62)) ** 2)) : 1;
    const c = chord(Math.min(r, 1.72)) * tipK;
    const t = tcf(r);
    const b = beta(r) * DEG;
    const w = smooth(0.34, 0.56, r);
    const cb = Math.cos(b), sb = Math.sin(b);
    return pts.map(([f, side], idx) => {
      const a = (f - 0.35) * c;
      const h = (camberLine(0.03, 0.4, f) + side * naca(t, f)) * c;
      const ang = (idx / n) * Math.PI * 2;
      const A = lerp(0.056 * Math.cos(ang), a, w), H = lerp(0.056 * Math.sin(ang), h, w);
      return V(A * cb + H * sb, r, -A * sb + H * cb);
    });
  });
  const g = new Grid(P, true, (i, j) => P[i][j].clone().setY(0));
  return g.sheet(0, radii.length - 1, 0, n - 1);
}

export function buildProp(pal: Palette): THREE.Object3D {
  const out: THREE.Object3D[] = [spinner(pal)];
  const bg = blade();
  const phase = 8; // degrees from vertical
  const collarR = spinR(D.prop.plane);
  for (let k = 0; k < 3; k++) {
    const rz = phase + k * 120;
    out.push(part(bg, pal.blade, { p: [0, 0, -D.prop.plane], r: [0, 0, rz] }));
    // blade root collar where the shank leaves the spinner
    const a = (rz + 90) * DEG;
    const dir = V(Math.cos(a), Math.sin(a), 0);
    const p = dir.clone().multiplyScalar(collarR - 0.012).add(V(0, 0, -D.prop.plane));
    const m = new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), dir), V(1, 1, 1));
    out.push(part(G.cyl(0.07, 0.078, 0.05, 20).applyMatrix4(m), pal.green));
  }
  return group(out, { name: 'prop' });
}
