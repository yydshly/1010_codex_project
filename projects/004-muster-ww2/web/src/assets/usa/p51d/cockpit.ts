/**
 * P-51D cockpit and canopy (BODY frame).
 *
 * Windscreen: flat bullet-resistant centre panel (thick armour glass) in a metal frame, with two
 * curved side panels. Sliding "bubble" hood: one-piece blown glazing on a light metal frame
 * (bottom rails, front and rear bows). Interior in dull dark green: side walls, instrument panel
 * (painted dial faces), K-14 gyro gunsight (P-51D-20-NA), seat with harness, armour plate and
 * head pad, control column, throttle quadrant, radio shelf behind the pilot.
 */
import * as THREE from 'three';
import { part, group, decal } from '../../../core/kit';
import { gridGeo, lerp, curve, bar, polyGeo, roundedBox, smooth } from './geom';
import { B } from './frame';
import { P } from './paint';
import { CK, cutY, fuseX } from './fuselage';

const V3 = THREE.Vector3;

// ------------------------------------------------------------- key lines
const FB = (sx: number) => B(sx * 0.165, cutY(CK.sW) + 0.004, CK.sW);
const FT = (sx: number) => B(sx * 0.142, 0.892, 3.575);
const canTop = curve([[3.62, 0.9], [3.8, 0.955], [4.05, 0.99], [4.3, 0.996], [4.55, 0.978], [4.75, 0.93], [4.92, 0.84], [5.03, 0.735], [5.12, 0.63]]);
const NEX = 2.35;
/** Point on the canopy bubble section at s; phi 0 = port base, PI/2 = top, PI = starboard base. */
function canPt(s: number, phi: number, grow = 0): THREE.Vector3 {
  const yb = cutY(s) + 0.002;
  const xb = fuseX(s, yb) + 0.004;
  const yt = Math.max(canTop(s), yb + 0.004);
  const c = Math.cos(phi), sn = Math.sin(phi);
  const bul = 0.02 * Math.pow(Math.max(0, sn), 0.6) * (1 - sn) * 4 * smooth(4.9, 4.5, s);
  const x = (xb + bul) * Math.sign(c) * Math.pow(Math.abs(c), 2 / NEX);
  const y = yb + (yt - yb) * Math.pow(Math.max(0, sn), 2 / NEX);
  const p = B(x, y, s);
  if (grow) {
    const n = new V3(x, (y - yb) * 0.8, 0).normalize();
    p.addScaledVector(n, grow);
  }
  return p;
}
/** phi on the front bow where the windscreen top meets it */
const PHI_TOP = (() => {
  let best = 0, err = 1e9;
  for (let k = 0; k <= 400; k++) {
    const ph = (k / 400) * (Math.PI / 2);
    const e = Math.abs(canPt(CK.sS, ph).x - 0.142);
    if (e < err) {
      err = e;
      best = ph;
    }
  }
  return best;
})();

function frameAlong(pts: THREE.Vector3[], w: number, h: number, outOf: (p: THREE.Vector3) => THREE.Vector3, mat = P.bare()): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  for (let k = 0; k < pts.length - 1; k++) {
    const m = pts[k].clone().add(pts[k + 1]).multiplyScalar(0.5);
    out.push(part(bar(pts[k], pts[k + 1], w, h, outOf(m), 0.004, 0.003), mat));
  }
  return out;
}
const radial = (p: THREE.Vector3) => new V3(p.x, p.y - 0.45, 0).normalize();

/** Coons patch from four boundary curves (same parameter directions). */
function coons(bottom: (u: number) => THREE.Vector3, top: (u: number) => THREE.Vector3, left: (v: number) => THREE.Vector3, right: (v: number) => THREE.Vector3, nu: number, nv: number): THREE.BufferGeometry {
  const rows: THREE.Vector3[][] = [];
  const b0 = bottom(0), b1 = bottom(1), t0 = top(0), t1 = top(1);
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    const r: THREE.Vector3[] = [];
    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      const p = bottom(u).multiplyScalar(1 - v).add(top(u).multiplyScalar(v));
      p.add(left(v).multiplyScalar(1 - u)).add(right(v).multiplyScalar(u));
      p.sub(b0.clone().multiplyScalar((1 - u) * (1 - v))).sub(b1.clone().multiplyScalar(u * (1 - v)));
      p.sub(t0.clone().multiplyScalar((1 - u) * v)).sub(t1.clone().multiplyScalar(u * v));
      r.push(p);
    }
    rows.push(r);
  }
  return gridGeo(rows, { closedU: false });
}

function windscreen(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  // armoured centre panel: thick slab set into the frame
  const fbL = FB(1), fbR = FB(-1), ftL = FT(1), ftR = FT(-1);
  const n = new V3().crossVectors(fbR.clone().sub(fbL), ftL.clone().sub(fbL)).normalize();
  if (n.z < 0) n.negate();
  const quad = [fbL, fbR, ftR, ftL];
  const front = quad.map((p) => p.clone().addScaledVector(n, 0.004));
  const back = quad.map((p) => p.clone().addScaledVector(n, -0.036));
  out.push(part(polyGeo(front), P.armourGlass()), part(polyGeo(back), P.armourGlass()));
  for (let k = 0; k < 4; k++) {
    const k2 = (k + 1) % 4;
    out.push(part(polyGeo([front[k], front[k2], back[k2], back[k]]), P.armourGlass()));
  }
  // side panels (plexiglass), bottom following the skin cut, rear on the canopy front bow
  for (const sx of [1, -1]) {
    const bottom = (u: number) => {
      const s = lerp(CK.sW, CK.sS, u);
      const y = cutY(s) + 0.003;
      return B(sx * (fuseX(s, y) + 0.002), y, s);
    };
    const bowAt = (v: number) => {
      const ph = lerp(0, PHI_TOP, v);
      const p = canPt(CK.sS, sx > 0 ? ph : Math.PI - ph);
      return p;
    };
    const left = (v: number) => FB(sx).lerp(FT(sx), v);
    const top = (u: number) => FT(sx).lerp(bowAt(1), u);
    out.push(part(coons(bottom, top, left, bowAt, 10, 10), P.glass()));
  }
  // frame: posts, top and base bars of the centre panel; front bow of the side panels
  const up = new V3(0, 0.6, 0.8);
  out.push(part(bar(fbL, ftL, 0.032, 0.03, n, 0.01), P.bare()));
  out.push(part(bar(fbR, ftR, 0.032, 0.03, n, 0.01), P.bare()));
  out.push(part(bar(ftL, ftR, 0.032, 0.03, up, 0.014), P.bare()));
  out.push(part(bar(fbL.clone().addScaledVector(n, -0.01), fbR.clone().addScaledVector(n, -0.01), 0.04, 0.03, new V3(0, 1, 0), 0.014), P.bare()));
  for (const sx of [1, -1]) {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 8; k++) {
      const ph = lerp(0, PHI_TOP, k / 8);
      pts.push(canPt(CK.sS - 0.01, sx > 0 ? ph : Math.PI - ph));
    }
    out.push(...frameAlong(pts, 0.03, 0.026, radial));
    out.push(part(bar(FT(sx), pts[pts.length - 1], 0.028, 0.026, new V3(0, 1, 0), 0.01), P.bare()));
    // skin-side base rail of the side panel
    const base: THREE.Vector3[] = [];
    for (let k = 0; k <= 5; k++) {
      const s = lerp(CK.sW, CK.sS, k / 5);
      const y = cutY(s) + 0.006;
      base.push(B(sx * (fuseX(s, y) + 0.006), y, s));
    }
    out.push(...frameAlong(base, 0.03, 0.014, () => new V3(sx, 1, 0).normalize()));
  }
  return group(out);
}

function hood(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const st: number[] = [];
  for (let k = 0; k <= 30; k++) st.push(lerp(CK.sS, CK.sE - 0.005, k / 30));
  const NP = 40;
  const rows = st.map((s) => {
    const r: THREE.Vector3[] = [];
    for (let j = 0; j <= NP; j++) r.push(canPt(s, (j / NP) * Math.PI));
    return r;
  });
  out.push(part(gridGeo(rows, { closedU: false }), P.glass()));
  // bottom rails of the hood (both sides) and the front / rear bows
  for (const sx of [1, -1]) {
    const pts = st.filter((_, i) => i % 3 === 0).map((s) => canPt(s, sx > 0 ? 0.035 : Math.PI - 0.035, 0.004));
    out.push(...frameAlong(pts, 0.05, 0.016, (p) => new V3(Math.sign(p.x), 0.25, 0).normalize()));
  }
  const bow = (s: number, w: number) => {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 16; k++) pts.push(canPt(s, (k / 16) * Math.PI, 0.004));
    return frameAlong(pts, w, 0.016, radial);
  };
  out.push(...bow(CK.sS + 0.012, 0.034));
  // rear frame: a metal cap closing the aft end of the bubble
  const rearS = 5.0;
  out.push(...bow(rearS, 0.05));
  {
    const rr: THREE.Vector3[][] = [];
    for (const s of [rearS, lerp(rearS, CK.sE, 0.5), CK.sE - 0.004]) {
      const r: THREE.Vector3[] = [];
      for (let j = 0; j <= 24; j++) r.push(canPt(s, (j / 24) * Math.PI, 0.003));
      rr.push(r);
    }
    out.push(part(gridGeo(rr, { closedU: false }), P.bare()));
  }
  // canopy handle (port side) and the sliding-hood rails on the fuselage
  const hp = canPt(4.0, 0.12, 0.012);
  out.push(part(roundedBox(0.02, 0.03, 0.08, 0.006), P.black(), { p: hp }));
  for (const sx of [1, -1]) {
    const a = B(sx * (fuseX(4.2, 0.425) + 0.004), 0.425, 4.2), b = B(sx * (fuseX(5.25, 0.5) + 0.004), 0.5, 5.25);
    out.push(part(bar(a, b, 0.012, 0.02, new V3(sx, 0.2, 0), 0, 0.004), P.bare()));
  }
  return group(out);
}

// ------------------------------------------------------------- interior
function drawPanel(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#1f2120';
  ctx.fillRect(0, 0, w, h);
  const dial = (cx: number, cy: number, r: number, ticks = 10) => {
    ctx.fillStyle = '#3a3c3b';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0e0f0f';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d6d2c4';
    ctx.lineWidth = Math.max(1, r * 0.05);
    for (let k = 0; k <= ticks; k++) {
      const a = Math.PI * 0.75 + (k / ticks) * Math.PI * 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
      ctx.lineTo(cx + Math.cos(a) * r * 0.93, cy + Math.sin(a) * r * 0.93);
      ctx.stroke();
    }
    const a = Math.PI * (0.9 + ((cx * 7 + cy * 3) % 10) * 0.1);
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.strokeStyle = '#ebe5d0';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7);
    ctx.stroke();
  };
  const u = w / 100;
  for (const [x, y, r] of [
    [22, 22, 8], [42, 20, 8], [62, 20, 8], [80, 22, 7], [30, 42, 7], [50, 42, 8], [70, 42, 7], [18, 60, 6], [38, 62, 6], [58, 62, 6], [78, 60, 6],
  ]) dial(x * u, y * u * (h / w) * (100 / 70), r * u);
  ctx.fillStyle = '#b5ae9c';
  for (let k = 0; k < 7; k++) ctx.fillRect((14 + k * 11) * u, h * 0.9, 3.5 * u, 1.6 * u);
}

function interior(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const I = P.interior();
  // side walls just inside the skin, from the opening edge down to the floor
  const floor = -0.3;
  const s0 = 3.42, s1 = 5.08;
  const rows: THREE.Vector3[][] = [];
  for (let i = 0; i <= 22; i++) {
    const s = lerp(s0, s1, i / 22);
    const topY = cutY(s) - 0.008;
    const r: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const y = lerp(topY, floor, k / 10);
      r.push(B(fuseX(s, y) - 0.012, y, s));
    }
    for (let k = 10; k >= 0; k--) {
      const y = lerp(topY, floor, k / 10);
      r.push(B(-(fuseX(s, y) - 0.012), y, s));
    }
    rows.push(r);
  }
  out.push(part(gridGeo(rows, { closedU: false, inward: true }), I));
  // bulkheads: firewall side (under the panel) and aft of the radio bay
  const bulk = (s: number, yTop: number) => {
    const sh = new THREE.Shape();
    const N = 12;
    for (let k = 0; k <= N; k++) {
      const y = lerp(floor - 0.01, yTop, k / N);
      const x = fuseX(s, y) - 0.014;
      if (k === 0) sh.moveTo(x, y);
      else sh.lineTo(x, y);
    }
    for (let k = N; k >= 0; k--) {
      const y = lerp(floor - 0.01, yTop, k / N);
      sh.lineTo(-(fuseX(s, y) - 0.014), y);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false });
    g.translate(0, 0, -s - 0.006);
    return part(g, I);
  };
  out.push(bulk(3.43, 0.5));
  out.push(bulk(5.07, cutY(5.07) - 0.01));
  // floor
  const fl = new THREE.PlaneGeometry(0.62, s1 - s0);
  fl.rotateX(-Math.PI / 2);
  fl.translate(0, floor, -(s0 + s1) / 2);
  out.push(part(fl, I));
  // instrument panel + coaming + K-14 gunsight
  const ps = 3.47;
  const pg = roundedBox(0.66, 0.34, 0.014, 0.004);
  pg.translate(0, 0.3, -ps);
  out.push(part(pg, P.black()));
  out.push(decal('p51d-panel', 0.56, 0.3, drawPanel, { p: B(0, 0.3, ps - 0.0085) }, 512));
  out.push(part(roundedBox(0.52, 0.045, 0.16, 0.018), P.leather(), { p: B(0, 0.49, ps - 0.03) }));
  out.push(part(roundedBox(0.1, 0.12, 0.2, 0.012), P.black(), { p: B(0, 0.57, ps - 0.06) }));
  out.push(part(roundedBox(0.07, 0.05, 0.08, 0.01), P.black(), { p: B(0, 0.65, ps - 0.02) }));
  const refl = new THREE.PlaneGeometry(0.09, 0.08);
  refl.rotateX(-35 * (Math.PI / 180));
  refl.translate(0, 0.705, -(ps - 0.02));
  out.push(part(refl, P.glass()));
  // seat, armour plate with head pad, harness
  const seatS = 4.38;
  out.push(part(roundedBox(0.4, 0.03, 0.36, 0.01), I, { p: B(0, -0.12, seatS) }));
  for (const sx of [1, -1]) out.push(part(roundedBox(0.025, 0.14, 0.36, 0.008), I, { p: B(sx * 0.2, -0.06, seatS) }));
  const tilt = 12;
  out.push(
    group(
      [
        part(roundedBox(0.4, 0.5, 0.025, 0.01), I, { p: [0, 0.25, 0] }),
        part(roundedBox(0.44, 0.78, 0.014, 0.005), P.gun(), { p: [0, 0.4, -0.03] }),
        part(roundedBox(0.2, 0.13, 0.06, 0.03), P.leather(), { p: [0, 0.74, 0.02] }),
        part(roundedBox(0.045, 0.52, 0.004, 0.0015), P.harness(), { p: [0.07, 0.3, 0.016] }),
        part(roundedBox(0.045, 0.52, 0.004, 0.0015), P.harness(), { p: [-0.07, 0.3, 0.016] }),
      ],
      { p: B(0, -0.11, seatS + 0.17), r: [-tilt, 0, 0] },
    ),
  );
  for (const sx of [1, -1]) {
    out.push(part(bar(B(sx * 0.19, -0.07, seatS + 0.05), B(sx * 0.05, -0.1, seatS - 0.1), 0.045, 0.004, new V3(0, 1, 0.2), 0, 0.0015), P.harness()));
  }
  // control column
  const cb = B(0, floor + 0.01, 3.95), ctop = B(0, 0.1, 4.02);
  out.push(part(bar(cb, ctop, 0.026, 0.026, new V3(0, 0, 1), 0, 0.012), P.black()));
  out.push(part(roundedBox(0.04, 0.1, 0.05, 0.015), P.black(), { p: ctop.clone().add(new V3(0, 0.05, 0)) }));
  const boot = new THREE.CylinderGeometry(0.03, 0.07, 0.1, 16);
  boot.translate(cb.x, cb.y + 0.05, cb.z);
  out.push(part(boot, P.leather()));
  // throttle quadrant on the port wall
  const tq = B(fuseX(3.9, 0.15) - 0.06, 0.15, 3.9);
  out.push(part(roundedBox(0.05, 0.07, 0.24, 0.008), I, { p: tq }));
  const lv = tq.clone().add(new V3(-0.02, 0.12, -0.04));
  out.push(part(bar(tq.clone().add(new V3(-0.02, 0.03, 0)), lv, 0.012, 0.012, new V3(1, 0, 0), 0, 0.005), P.steel()));
  out.push(part(new THREE.SphereGeometry(0.022, 12, 8), P.black(), { p: lv }));
  // radio shelf and SCR-522 set behind the armour
  out.push(part(roundedBox(0.62, 0.02, 0.4, 0.006), I, { p: B(0, 0.28, 4.84) }));
  out.push(part(roundedBox(0.34, 0.2, 0.3, 0.012), P.black(), { p: B(0.06, 0.39, 4.84) }));
  out.push(part(roundedBox(0.16, 0.12, 0.22, 0.01), I, { p: B(-0.2, 0.35, 4.86) }));
  return group(out);
}

export function buildCockpit(): THREE.Object3D {
  return group([windscreen(), hood(), interior()]);
}
