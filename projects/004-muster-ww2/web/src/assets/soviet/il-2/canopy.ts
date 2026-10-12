/**
 * Il-2 canopy (body frame): flat armoured windscreen with side panes, sliding pilot's hood,
 * painted bridge over the rear tank, the gunner's glazed hood (open at the rear) with the
 * 12.7 mm UBT on its pivot mount, frames, sill rails and hood slide rails.
 */
import * as THREE from 'three';
import { G, part, group } from '../../../core/kit';
import { Grid, V, lerp, linspace, pane, bar } from './geo';
import { sillAt, archAt, SEC } from './shape';
import { D } from './dims';
import type { Palette } from './paint';

const FRAME_W = 0.034;
const FRAME_T = 0.014;

/** Crown height of the canopy line along s. */
function crown(s: number): number {
  const c = D.canopy;
  if (s <= c.hood1) return lerp(1.09, 1.105, (s - c.ws1) / (c.hood1 - c.ws1));
  if (s <= c.bridge1) return lerp(1.08, 1.03, (s - c.hood1) / (c.bridge1 - c.hood1));
  return lerp(1.01, 0.9, (s - c.bridge1) / (c.gun1 - c.bridge1));
}
const TOPW = 0.25;

/** Grid lofted through canopy arches at stations ss (arches may be slightly lifted). */
function archGrid(ss: number[], lift = 0): Grid {
  const P = ss.map((s) => archAt(s, crown(s) + lift, TOPW).map((p) => p.clone().add(V(0, 0, 0))));
  return new Grid(P, false, (i, j) => P[i][j].clone().sub(V(0, 0.5, -ss[i])));
}

/** Outward offset of a hoop (for frames that sit on the glass). */
function hoop(s: number, off = 0.004): THREE.Vector3[] {
  const pts = archAt(s, crown(s), TOPW);
  const c = V(0, 0.55, -s);
  return pts.map((p) => p.clone().add(p.clone().sub(c).setZ(0).normalize().multiplyScalar(off)));
}

function frameAlong(pts: THREE.Vector3[], normals: THREE.Vector3[], mat: THREE.Material, w = FRAME_W, t = FRAME_T) {
  return part(G.strap(pts, w, t, normals, { smooth: false }), mat);
}

export function buildCanopy(pal: Palette): THREE.Object3D {
  const c = D.canopy;
  const out: THREE.Object3D[] = [];

  // ---- sliding hood (glass) and gunner hood (glass)
  const hoodS = linspace(c.ws1, c.hood1, 9);
  const hoodG = archGrid(hoodS);
  out.push(part(hoodG.sheet(0, hoodS.length - 1), pal.glass, { name: 'hood-glass' }));
  const gunS = linspace(c.bridge1, c.gun1, 8);
  const gunG = archGrid(gunS);
  out.push(part(gunG.sheet(0, gunS.length - 1), pal.glass, { name: 'gunner-glass' }));

  // ---- bridge (painted metal fairing over the rear tank and armour)
  const brS = linspace(c.hood1, c.bridge1, 6);
  const brG = archGrid(brS, 0.002);
  out.push(part(brG.sheet(0, brS.length - 1), pal.top, { name: 'bridge' }));

  // ---- hoops (frames) across the glazing
  const hoopAt = (s: number, w = FRAME_W) => {
    const pts = hoop(s, 0.003);
    const c0 = V(0, 0.55, -s);
    const nrm = pts.map((p) => p.clone().sub(c0).setZ(0).normalize());
    return frameAlong(pts, nrm, pal.top, w);
  };
  for (const s of [c.ws1, 3.76, 4.09, c.hood1, c.bridge1, 5.08, 5.35, c.gun1]) out.push(hoopAt(s));

  // ---- longitudinal frames: upper shoulder rails and the hood/glass lower rails
  const rail = (j: number, s0: number, s1: number, n = 8, off = 0.004) => {
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    for (const s of linspace(s0, s1, n)) {
      const arch = archAt(s, crown(s), TOPW);
      const p = arch[j];
      const cc = V(0, 0.55, -s);
      const nn = p.clone().sub(cc).setZ(0).normalize();
      pts.push(p.clone().addScaledVector(nn, off));
      nrm.push(nn);
    }
    return frameAlong(pts, nrm, pal.top, 0.028, 0.012);
  };
  const nA = 17;
  for (const j of [5, nA - 6]) {
    out.push(rail(j, c.ws1, c.hood1));
    out.push(rail(j, c.bridge1, c.gun1));
  }
  // top centre bar of the gunner hood
  out.push(rail(8, c.bridge1, c.gun1, 6));

  // ---- sill rails (cover the cockpit rim) and hood slide rails on the fuselage sides
  for (const side of [1, -1]) {
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    for (const s of linspace(D.cockpit.s0, D.cockpit.s1, 16)) {
      const p = sillAt(s);
      pts.push(V(p.x * side, p.y + 0.004, p.z));
      nrm.push(V(0.35 * side, 1, 0).normalize());
    }
    out.push(part(G.strap(pts, 0.05, 0.022, nrm), pal.top));
    const sp: THREE.Vector3[] = [], sn: THREE.Vector3[] = [];
    for (const s of linspace(3.45, 5.2, 10)) {
      const p = sillAt(s);
      const yc = SEC.yc(s);
      const d = V(p.x, p.y - yc, 0).normalize();
      sp.push(V((p.x + d.x * 0.012) * side, p.y - 0.045, p.z));
      sn.push(V(d.x * side, 0.2, 0).normalize());
    }
    out.push(part(G.strap(sp, 0.018, 0.012, sn), pal.dark));
  }

  out.push(windscreen(pal));
  out.push(ubt(pal));
  return group(out, { name: 'canopy' });
}

/** Flat armoured front panel + side panes lofted to the hood front hoop. */
function windscreen(pal: Palette): THREE.Object3D {
  const c = D.canopy;
  const out: THREE.Object3D[] = [];
  const s0 = c.ws0 + 0.02, s1 = c.ws1;
  const yb = SEC.top(s0) - 0.01;
  const front = archAt(s1, crown(s1), TOPW);
  const nA = front.length; // 17
  const jc = 6; // hoop index where the flat front pane meets the side pane (port)
  const TL = front[jc].clone();
  const TR = front[nA - 1 - jc].clone();
  const BL = V(TL.x + 0.01, yb, -s0);
  const BR = V(-BL.x, yb, -s0);
  // armoured front pane (thick glass), set 2 cm inside the frame line
  const inset = V(0, -0.01, -0.012);
  out.push(part(pane([BL, BR, TR, TL].map((p) => p.clone().add(inset)), 0.05), pal.armourGlass, { name: 'armour-glass' }));

  // side panes: ruled surface between the front edge (sill->BL->TL) and the hoop side (sill->TL')
  for (const side of [1, -1]) {
    const nV = 10;
    const sill0 = sillAt(c.ws0);
    const frontEdge = (v: number) => {
      if (v < 0.5) {
        const k = v / 0.5;
        // along the decking end arch from the sill up to BL
        const a = k * (Math.PI / 2) * 0.72;
        const x = lerp(sill0.x, BL.x, Math.sin(a) / Math.sin((Math.PI / 2) * 0.72));
        const y = lerp(sill0.y, BL.y, Math.sin(a) / Math.sin((Math.PI / 2) * 0.72));
        return V(x, y, lerp(-c.ws0, -s0, k));
      }
      return BL.clone().lerp(TL, (v - 0.5) / 0.5);
    };
    const rearEdge = (v: number) => {
      const f = v * jc;
      const j0 = Math.floor(f), j1 = Math.min(jc, j0 + 1);
      return front[j0].clone().lerp(front[j1], f - j0);
    };
    const P: THREE.Vector3[][] = [];
    for (let i = 0; i <= nV; i++) {
      const v = i / nV;
      const a = frontEdge(v), b = rearEdge(v);
      P.push([a, a.clone().lerp(b, 0.5), b].map((p) => V(p.x * side, p.y, p.z)));
    }
    const g = new Grid(P, false, (i, j) => P[i][j].clone().sub(V(0, 0.6, -3.3)));
    out.push(part(g.sheet(0, nV, 0, 2), pal.glass));
  }
  // frames: front pane posts, base bar, top bar
  const up = V(0, 1, 0);
  const postN = (a: THREE.Vector3, b: THREE.Vector3) => b.clone().sub(a).cross(V(1, 0, 0)).normalize().negate();
  out.push(part(bar(BL, TL, FRAME_W, FRAME_T + 0.01, postN(BL, TL)), pal.top));
  out.push(part(bar(BR, TR, FRAME_W, FRAME_T + 0.01, postN(BR, TR)), pal.top));
  out.push(part(bar(BL.clone().add(V(0.02, 0, 0)), BR.clone().add(V(-0.02, 0, 0)), 0.035, 0.04, up), pal.top));
  // side base bars along the decking end arch
  for (const side of [1, -1]) {
    const sill0 = sillAt(c.ws0);
    const a = V(sill0.x * side, sill0.y + 0.01, -c.ws0 - 0.01);
    const b = V(BL.x * side, BL.y, -s0);
    out.push(part(bar(a, b, 0.03, 0.03, V(0.4 * side, 1, 0)), pal.top));
  }
  return group(out, { name: 'windscreen' });
}

/** 12.7 mm UBT on the gunner's pivot mount, pointing aft and slightly up. */
function ubt(pal: Palette): THREE.Object3D {
  const g: THREE.Object3D[] = [];
  // local frame: +z = muzzle, +y = top, origin = trunnion
  g.push(part(G.rbox(0.085, 0.115, 0.42, 0.012), pal.gun, { p: [0, 0.02, -0.02] }));
  g.push(part(G.rbox(0.07, 0.03, 0.3, 0.008), pal.gun, { p: [0, 0.09, -0.04] })); // top cover
  g.push(part(G.cyl(0.027, 0.027, 0.16, 16), pal.gun, { p: [0, 0.02, 0.26], r: [90, 0, 0] })); // barrel nut
  g.push(part(G.cyl(0.0165, 0.0175, 0.74, 14), pal.gun, { p: [0, 0.02, 0.71], r: [90, 0, 0] })); // barrel
  g.push(part(G.lathe([[0.0, 0], [0.019, 0], [0.024, 0.02], [0.027, 0.085], [0.022, 0.09], [0.012, 0.09]], 16), pal.gun, {
    p: [0, 0.02, 1.07], r: [90, 0, 0],
  })); // flash hider
  // ring-and-bead sight
  g.push(part(G.torus(0.045, 0.0025, 6, 28), pal.gun, { p: [0, 0.14, 0.22] }));
  g.push(part(G.rod([0, 0.075, 0.22], [0, 0.097, 0.22], 0.004, 6), pal.gun));
  g.push(part(G.rod([0, 0.035, 0.98], [0, 0.07, 0.98], 0.003, 6), pal.gun));
  // spade grips at the rear
  for (const sx of [0.06, -0.06]) {
    g.push(part(G.rod([sx, -0.06, -0.26], [sx, 0.07, -0.29], 0.014, 10), pal.leather));
  }
  g.push(part(G.rod([0.075, 0.07, -0.29], [-0.075, 0.07, -0.29], 0.009, 8), pal.gun));
  g.push(part(G.rod([0.075, -0.06, -0.26], [-0.075, -0.06, -0.26], 0.009, 8), pal.gun));
  // ammunition box (port side) and feed chute
  g.push(part(G.rbox(0.11, 0.17, 0.25, 0.008), pal.interior, { p: [0.12, -0.05, 0.0] }));
  g.push(part(G.rbox(0.07, 0.025, 0.1, 0.006), pal.dark, { p: [0.07, 0.05, 0.02], r: [0, 0, 25] }));
  // yoke
  g.push(part(G.rbox(0.13, 0.02, 0.06, 0.005), pal.gun, { p: [0, -0.055, 0] }));
  for (const sx of [0.058, -0.058]) g.push(part(G.rbox(0.012, 0.09, 0.05, 0.003), pal.gun, { p: [sx, -0.01, 0] }));

  const elev = 16;
  const pivot = V(0, 0.735, -5.5);
  // gun aims aft: rotate 180 deg about Y, then elevate
  const gun = group(g, { p: [pivot.x, pivot.y, pivot.z], r: [elev, 180, 0] });
  const mount: THREE.Object3D[] = [gun];
  // mount post from the gunner floor + pivot head
  mount.push(part(G.cyl(0.03, 0.036, 0.97, 14), pal.interior, { p: [0, 0.2, -5.47] }));
  mount.push(part(G.cyl(0.05, 0.05, 0.06, 16), pal.gun, { p: [0, 0.68, -5.47] }));
  mount.push(part(G.cyl(0.09, 0.09, 0.02, 20), pal.interior, { p: [0, -0.29, -5.47] }));
  return group(mount, { name: 'ubt' });
}
