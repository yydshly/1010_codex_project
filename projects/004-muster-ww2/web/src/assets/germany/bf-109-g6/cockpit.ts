/**
 * Bf 109 G-6 cockpit and canopy (BODY frame).
 *
 * Canopy: the standard framed G-6 canopy of 1943 - flat armoured-glass windscreen front panel,
 * starboard-hinged hood (pentagonal section: vertical lower side panes, sloping upper panes,
 * flat top divided by a cross bar) and the fixed rear glazing that tapers into the spine.
 * The hood carries the armoured-glass head rest known as the "Galland-Panzer".
 * Interior: RLM 66 tub, instrument panel (decal), Revi gunsight, seat with harness, control
 * column, throttle quadrant and the large trim / flap hand wheels on the port wall.
 */
import * as THREE from 'three';
import { part, group, decal } from '../../../core/kit';
import { frameBar, polyGeo, gridGeo, lerp, roundedBox } from './geom';
import { B } from './frame';
import { skin, P } from './paint';
import { CK, sillY, fuseX, fuseYTop, openingHalfWidth } from './fuselage';

const V3 = THREE.Vector3;

// ------------------------------------------------------------- canopy key points
const hoodPts = (s: number, sx: number) => {
  const t = (s - CK.sH0) / (CK.sH1 - CK.sH0);
  const y3 = sillY(s);
  return {
    h3: B(sx * 0.3, y3, s),
    h2: B(sx * 0.292, y3 + 0.18, s),
    h1: B(sx * 0.15, lerp(0.735, 0.728, t), s),
  };
};
const FB = (sx: number) => B(sx * 0.15, fuseYTop(CK.sW, 0.15) + 0.001, CK.sW);
const FT = (sx: number) => B(sx * 0.132, 0.712, 2.878);
const rearEnd = (sx: number) => ({
  e3: B(sx * 0.1, 0.556, CK.sR1),
  e2: B(sx * 0.094, 0.574, CK.sR1),
  e1: B(sx * 0.058, 0.59, CK.sR1),
});

/** Frame bar with an interior-grey liner on its inner face. */
function frame(a: THREE.Vector3, b: THREE.Vector3, out: THREE.Vector3, w = 0.028, h = 0.016, ext = 0.012): THREE.Object3D[] {
  const o = out.clone().normalize();
  const a1 = a.clone().addScaledVector(o, 0.004), b1 = b.clone().addScaledVector(o, 0.004);
  const a2 = a.clone().addScaledVector(o, -0.006), b2 = b.clone().addScaledVector(o, -0.006);
  return [
    part(frameBar(a1, b1, w, h, o, ext, 0.004), P.frame()),
    part(frameBar(a2, b2, w * 0.92, 0.006, o, ext * 0.8, 0.002), P.interior()),
  ];
}

/** Outward direction for a bar along a->b lying on a surface around the canopy axis. */
function outFrom(p: THREE.Vector3, axisY = 0.35): THREE.Vector3 {
  return new V3(p.x, p.y - axisY, 0).normalize();
}

function glassPane(pts: THREE.Vector3[], mat = P.glass()): THREE.Object3D {
  return part(polyGeo(pts), mat);
}

function canopy(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const glass = P.glass();
  // --- windscreen
  const fbL = FB(1), fbR = FB(-1), ftL = FT(1), ftR = FT(-1);
  // armoured front panel: a thick slab set into the frame
  {
    const n = new V3().crossVectors(fbR.clone().sub(fbL), ftL.clone().sub(fbL)).normalize();
    if (n.z < 0) n.negate();
    const inset = (p: THREE.Vector3, q: THREE.Vector3) => p.clone().lerp(q, 0.0);
    const quad = [inset(fbL, ftR), inset(fbR, ftL), inset(ftR, fbL), inset(ftL, fbR)];
    const thick = 0.04;
    const front = quad.map((p) => p.clone().addScaledVector(n, 0.004));
    const back = quad.map((p) => p.clone().addScaledVector(n, -thick));
    out.push(glassPane(front, P.armourGlass()));
    out.push(glassPane(back, P.armourGlass()));
    // slab edges
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      out.push(glassPane([front[k], front[k2], back[k2], back[k]], P.armourGlass()));
    }
  }
  const h0L = hoodPts(CK.sH0, 1), h0R = hoodPts(CK.sH0, -1);
  const h1L = hoodPts(CK.sH1, 1), h1R = hoodPts(CK.sH1, -1);
  for (const [fb, ft, h] of [
    [fbL, ftL, h0L],
    [fbR, ftR, h0R],
  ] as const) {
    out.push(glassPane([fb, h.h3, h.h2, h.h1, ft], glass));
  }
  // windscreen top plate
  out.push(part(polyGeo([ftL.clone().add(new V3(0, 0.004, 0)), h0L.h1.clone().add(new V3(0, 0.004, 0)), h0R.h1.clone().add(new V3(0, 0.004, 0)), ftR.clone().add(new V3(0, 0.004, 0))]), P.frame()));
  // windscreen frames
  const fwdOut = new V3(0, 0.7, 0.7);
  out.push(...frame(fbL, fbR, new V3(0, 1, 0.3), 0.034, 0.018));
  out.push(...frame(ftL, ftR, fwdOut, 0.034, 0.018));
  for (const sx of [1, -1]) {
    const fb = FB(sx), ft = FT(sx), h = sx > 0 ? h0L : h0R;
    out.push(...frame(fb, ft, new V3(sx, 0.4, 0.5), 0.036, 0.02));
    out.push(...frame(ft, h.h1, new V3(sx * 0.4, 1, 0), 0.03, 0.018));
    // bottom edge of the side pane, following the skin
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 4; k++) {
      const s = lerp(CK.sW + 0.005, CK.sH0, k / 4);
      const x = openingHalfWidth(s);
      pts.push(B(sx * x, fuseYTop(s, x) + 0.004, s));
    }
    for (let k = 0; k < 4; k++) out.push(...frame(pts[k], pts[k + 1], new V3(sx * 0.6, 1, 0), 0.036, 0.014, 0.006));
  }
  // --- hood
  const bow = (s: number) => {
    const L = hoodPts(s, 1), R = hoodPts(s, -1);
    const chain = [L.h3, L.h2, L.h1, R.h1, R.h2, R.h3];
    const res: THREE.Object3D[] = [];
    for (let k = 0; k < chain.length - 1; k++) {
      const m = chain[k].clone().add(chain[k + 1]).multiplyScalar(0.5);
      res.push(...frame(chain[k], chain[k + 1], outFrom(m), 0.032, 0.018, 0.012));
    }
    return res;
  };
  out.push(...bow(CK.sH0), ...bow(CK.sH1));
  for (const sx of [1, -1]) {
    const f = sx > 0 ? h0L : h0R, r = sx > 0 ? h1L : h1R;
    out.push(glassPane([f.h3, r.h3, r.h2, f.h2], glass));
    out.push(glassPane([f.h2, r.h2, r.h1, f.h1], glass));
    out.push(...frame(f.h3, r.h3, new V3(sx, -0.15, 0), 0.042, 0.02, 0.0));
    out.push(...frame(f.h2, r.h2, new V3(sx, 0.55, 0), 0.026, 0.016, 0.0));
    out.push(...frame(f.h1, r.h1, new V3(sx * 0.55, 1, 0), 0.028, 0.016, 0.0));
  }
  out.push(glassPane([h0L.h1, h0R.h1, h1R.h1, h1L.h1], glass));
  const sm = (CK.sH0 + CK.sH1) / 2;
  out.push(...frame(hoodPts(sm, 1).h1, hoodPts(sm, -1).h1, new V3(0, 1, 0), 0.026, 0.014, 0.01));
  // hinges on the starboard sill, latch lever on the port side
  for (const s of [3.0, 3.27, 3.54]) {
    const p = hoodPts(s, -1).h3.clone().add(new V3(-0.016, -0.004, 0));
    const g = new THREE.CylinderGeometry(0.009, 0.009, 0.06, 10);
    g.rotateX(Math.PI / 2);
    g.translate(p.x, p.y, p.z);
    out.push(part(g, P.steel()));
  }
  {
    const p = hoodPts(3.3, 1).h2.clone().add(new V3(0.02, -0.03, 0));
    out.push(part(frameBar(p, p.clone().add(new V3(0.004, -0.05, 0.05)), 0.012, 0.012, new V3(1, 0, 0), 0.005, 0.005), P.black()));
  }
  // --- fixed rear glazing
  const eL = rearEnd(1), eR = rearEnd(-1);
  const sect = (t: number) => {
    const L = [h1L.h3.clone().lerp(eL.e3, t), h1L.h2.clone().lerp(eL.e2, t), h1L.h1.clone().lerp(eL.e1, t)];
    const R = [h1R.h3.clone().lerp(eR.e3, t), h1R.h2.clone().lerp(eR.e2, t), h1R.h1.clone().lerp(eR.e1, t)];
    return [L[0], L[1], L[2], R[2], R[1], R[0]];
  };
  const rows = [0, 0.33, 0.66, 1].map((t) => sect(t));
  out.push(part(gridGeo(rows, { closedU: false }), glass));
  for (const sx of [1, -1]) {
    const h = sx > 0 ? h1L : h1R, e = sx > 0 ? eL : eR;
    out.push(...frame(h.h3, e.e3, new V3(sx, 0.2, 0), 0.04, 0.018, 0.0));
    out.push(...frame(h.h1, e.e1, new V3(sx * 0.5, 1, 0), 0.026, 0.014, 0.0));
  }
  const endChain = [eL.e3, eL.e2, eL.e1, eR.e1, eR.e2, eR.e3];
  for (let k = 0; k < endChain.length - 1; k++) {
    const m = endChain[k].clone().add(endChain[k + 1]).multiplyScalar(0.5);
    out.push(...frame(endChain[k], endChain[k + 1], outFrom(m, 0.5), 0.03, 0.016, 0.01));
  }
  return group(out);
}

/** Armoured-glass head rest on the hood rear ("Galland-Panzer"). */
function gallandPanzer(): THREE.Object3D {
  const s = CK.sH1 - 0.05;
  const y0 = sillY(s) + 0.02;
  const H = 0.27, W = 0.2, rr = 0.075;
  const outline = (hw: number, h: number, r: number) => {
    const sh = new THREE.Shape();
    sh.moveTo(-hw, 0);
    sh.lineTo(hw, 0);
    sh.lineTo(hw, h - r);
    sh.quadraticCurveTo(hw, h, hw - r, h);
    sh.lineTo(-hw + r, h);
    sh.quadraticCurveTo(-hw, h, -hw, h - r);
    sh.lineTo(-hw, 0);
    return sh;
  };
  const glassShape = outline(W, H, rr);
  const g = new THREE.ExtrudeGeometry(glassShape, { depth: 0.05, bevelEnabled: false, curveSegments: 8 });
  const frameShape = outline(W + 0.018, H + 0.018, rr + 0.018);
  frameShape.holes.push(outline(W - 0.004, H - 0.004, rr - 0.004) as unknown as THREE.Path);
  const f = new THREE.ExtrudeGeometry(frameShape, { depth: 0.062, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1, curveSegments: 8 });
  f.translate(0, -0.009, -0.006);
  const m = new THREE.Matrix4().compose(
    B(0, y0, s + 0.03),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-8 * (Math.PI / 180), 0, 0)),
    new THREE.Vector3(1, 1, 1),
  );
  g.applyMatrix4(m);
  f.applyMatrix4(m);
  return group([part(g, P.armourGlass()), part(f, P.gun())]);
}

// ------------------------------------------------------------- instrument panel decal
function drawPanel(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#2f3233';
  ctx.fillRect(0, 0, w, h);
  // split between upper (flight) and lower (engine) panels
  ctx.fillStyle = '#26292a';
  ctx.fillRect(0, h * 0.58, w, h * 0.42);
  ctx.strokeStyle = '#1a1c1d';
  ctx.lineWidth = w * 0.006;
  ctx.strokeRect(w * 0.01, h * 0.02, w * 0.98, h * 0.54);
  const dial = (cx: number, cy: number, r: number, ticks = 10, sweep = 1.6) => {
    ctx.fillStyle = '#5a5d5e';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#101112';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8d4c6';
    ctx.lineWidth = Math.max(1, r * 0.05);
    for (let k = 0; k <= ticks; k++) {
      const a = Math.PI * 0.75 + (k / ticks) * Math.PI * sweep;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78);
      ctx.lineTo(cx + Math.cos(a) * r * 0.93, cy + Math.sin(a) * r * 0.93);
      ctx.stroke();
    }
    const a = Math.PI * (0.9 + ((cx * 7 + cy * 3) % 10) * 0.1);
    ctx.lineWidth = Math.max(1, r * 0.07);
    ctx.strokeStyle = '#e8e2cf';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * 0.72, cy + Math.sin(a) * r * 0.72);
    ctx.stroke();
  };
  const u = w / 100;
  dial(18 * u, 17 * u, 8.5 * u);
  dial(38 * u, 15 * u, 7 * u);
  dial(56 * u, 15 * u, 7 * u, 8, 2);
  dial(74 * u, 15 * u, 7 * u);
  dial(90 * u, 17 * u, 6 * u);
  dial(28 * u, 33 * u, 6.5 * u);
  dial(47 * u, 33 * u, 6.5 * u, 12, 2);
  dial(66 * u, 33 * u, 6.5 * u);
  dial(84 * u, 34 * u, 5.5 * u);
  dial(16 * u, 49 * u, 5 * u);
  dial(34 * u, 50 * u, 5 * u);
  dial(52 * u, 50 * u, 5 * u);
  dial(70 * u, 50 * u, 5 * u);
  dial(86 * u, 50 * u, 4.5 * u);
  // switches / placards
  ctx.fillStyle = '#b9b3a2';
  for (let k = 0; k < 6; k++) ctx.fillRect((12 + k * 13) * u, 58 * u, 3.5 * u, 1.6 * u);
}

function panel(): THREE.Object3D {
  const s = 2.765;
  const out: THREE.Object3D[] = [];
  // panel plate fitted between the walls
  const top = 0.39, bot = 0.03;
  // panel plate following the inside of the skin
  const sh = new THREE.Shape();
  const N = 10;
  for (let k = 0; k <= N; k++) {
    const y = lerp(bot, top, k / N);
    const x = fuseX(s, y) - 0.025;
    if (k === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  for (let k = N; k >= 0; k--) sh.lineTo(-(fuseX(s, lerp(bot, top, k / N)) - 0.025), lerp(bot, top, k / N));
  const pg = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false });
  pg.translate(0, 0, -s - 0.006);
  out.push(part(pg, P.interior()));
  const d = decal('bf109-g6-panel', 0.4, 0.27, drawPanel, { p: B(0, 0.195, s + 0.0015), r: [0, 180, 0] }, 512);
  out.push(d);
  // coaming (leather padded) under the windscreen base
  out.push(part(roundedBox(0.3, 0.028, 0.11, 0.012), P.leather(), { p: B(0, 0.395, s - 0.06) }));
  // Revi 16B reflector sight on the panel centre line
  out.push(part(roundedBox(0.075, 0.075, 0.13, 0.008), P.black(), { p: B(0, 0.455, s - 0.05) }));
  out.push(part(roundedBox(0.055, 0.03, 0.04, 0.006), P.black(), { p: B(0, 0.505, s - 0.02) }));
  const refl = new THREE.PlaneGeometry(0.068, 0.07);
  refl.rotateX(-40 * (Math.PI / 180));
  refl.translate(0, 0.56, -(s - 0.015));
  out.push(part(refl, P.glass()));
  // dark lower bulkhead / footwell
  const fw = fuseX(2.64, -0.1) - 0.02;
  out.push(part(roundedBox(fw * 2, 0.34, 0.01, 0.003), P.interior(), { p: B(0, -0.12, 2.64) }));
  return group(out);
}

// ------------------------------------------------------------- tub & fittings
function tub(): THREE.Object3D {
  const rows: THREE.Vector3[][] = [];
  const s0 = 2.64, s1 = 3.62;
  const floor = -0.26;
  const nWall = 10;
  for (let i = 0; i <= 16; i++) {
    const s = lerp(s0, s1, i / 16);
    const topY = s < CK.sH0 ? fuseYTop(s, openingHalfWidth(s)) - 0.01 : sillY(s) - 0.012;
    const ring: THREE.Vector3[] = [];
    for (let k = 0; k <= nWall; k++) {
      const y = lerp(topY, floor, k / nWall);
      ring.push(B(fuseX(s, y) - 0.014, y, s));
    }
    for (let k = nWall; k >= 0; k--) {
      const y = lerp(topY, floor, k / nWall);
      ring.push(B(-(fuseX(s, y) - 0.014), y, s));
    }
    rows.push(ring);
  }
  const g = gridGeo(rows, { closedU: false });
  // gridGeo orients away from the ring centroid (outwards) - we need the inside
  const idx = g.index!.array as Uint32Array | Uint16Array;
  for (let k = 0; k < idx.length; k += 3) {
    const t = idx[k + 1];
    idx[k + 1] = idx[k + 2];
    idx[k + 2] = t;
  }
  g.computeVertexNormals();
  // rear bulkhead behind the seat, up to the sill
  const sb = s1;
  const yTop = sillY(sb) - 0.01;
  const sh = new THREE.Shape();
  const N = 12;
  for (let k = 0; k <= N; k++) {
    const y = lerp(floor, yTop, k / N);
    const x = fuseX(sb, y) - 0.016;
    if (k === 0) sh.moveTo(x, y);
    else sh.lineTo(x, y);
  }
  for (let k = N; k >= 0; k--) {
    const y = lerp(floor, yTop, k / N);
    sh.lineTo(-(fuseX(sb, y) - 0.016), y);
  }
  const bulk = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false });
  bulk.translate(0, 0, -sb - 0.006);
  return group([part(g, P.interior()), part(bulk, P.interior())]);
}

function seat(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const I = P.interior();
  const tilt = 14 * (Math.PI / 180);
  // seat pan and bucket sides
  out.push(part(roundedBox(0.36, 0.022, 0.3, 0.008), I, { p: B(0, -0.11, 3.32) }));
  for (const sx of [1, -1]) out.push(part(roundedBox(0.02, 0.1, 0.3, 0.006), I, { p: B(sx * 0.18, -0.07, 3.32) }));
  // seat back (tilted), with side flanges
  const back = group(
    [
      part(roundedBox(0.37, 0.46, 0.02, 0.008), I, { p: [0, 0.23, 0] }),
      part(roundedBox(0.02, 0.44, 0.07, 0.006), I, { p: [0.18, 0.22, 0.03] }),
      part(roundedBox(0.02, 0.44, 0.07, 0.006), I, { p: [-0.18, 0.22, 0.03] }),
      // back armour plate behind the seat
      part(roundedBox(0.4, 0.5, 0.01, 0.003), P.gun(), { p: [0, 0.25, -0.03] }),
    ],
    { p: B(0, -0.11, 3.49), r: [-(tilt * 180) / Math.PI, 0, 0] },
  );
  out.push(back);
  // harness: shoulder straps over the top of the back, lap belts on the pan
  const H = P.harness();
  // point on the tilted seat back: ly up the back, lz off its front face
  const onBack = (x: number, ly: number, lz: number) =>
    B(x, -0.11 + ly * Math.cos(tilt) + lz * Math.sin(tilt), 3.49 + ly * Math.sin(tilt) - lz * Math.cos(tilt));
  const topOfBack = (x: number) => onBack(x, 0.465, 0.0);
  const backN = new V3(0, Math.sin(tilt), Math.cos(tilt));
  for (const sx of [1, -1]) {
    const a = onBack(sx * 0.07, 0.47, -0.04);
    const a2 = onBack(sx * 0.07, 0.475, 0.004);
    const b = onBack(sx * 0.075, 0.43, 0.014);
    const c = onBack(sx * 0.075, 0.06, 0.014);
    const d = B(sx * 0.07, -0.094, 3.42);
    const e = B(sx * 0.062, -0.094, 3.27);
    out.push(part(frameBar(a, a2, 0.042, 0.003, new V3(0, 1, 0), 0.004, 0.0012), H));
    out.push(part(frameBar(a2, b, 0.042, 0.003, backN, 0.004, 0.0012), H));
    out.push(part(frameBar(b, c, 0.042, 0.003, backN, 0.004, 0.0012), H));
    out.push(part(frameBar(c, d, 0.042, 0.003, new V3(0, 1, 0.3), 0.004, 0.0012), H));
    out.push(part(frameBar(d, e, 0.042, 0.003, new V3(0, 1, 0), 0.004, 0.0012), H));
    // lap belt from the bucket side
    const e1 = B(sx * 0.17, -0.058, 3.37);
    const f = B(sx * 0.05, -0.093, 3.3);
    out.push(part(frameBar(e1, f, 0.042, 0.003, new V3(0, 1, 0.2), 0.004, 0.0012), H));
    out.push(part(roundedBox(0.04, 0.008, 0.035, 0.003), P.steel(), { p: f.clone().add(new V3(-sx * 0.01, 0.004, 0)) }));
  }
  // over-the-top guide of the shoulder straps
  out.push(part(roundedBox(0.2, 0.02, 0.03, 0.006), P.steel(), { p: topOfBack(0).add(new V3(0, -0.005, 0)) }));
  return group(out);
}

function controls(): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  // control column with boot and KG grip
  const base = B(0, -0.255, 3.02), top = B(0, 0.04, 3.1);
  out.push(part(frameBar(base, top, 0.024, 0.024, new V3(0, 0, 1), 0, 0.011), P.black()));
  const boot = new THREE.CylinderGeometry(0.02, 0.055, 0.1, 16);
  boot.translate(base.x, base.y + 0.05, base.z);
  out.push(part(boot, P.leather()));
  const gripDir = top.clone().sub(base).normalize();
  const grip = top.clone().addScaledVector(gripDir, 0.055);
  out.push(part(frameBar(top, grip.clone().addScaledVector(gripDir, 0.02), 0.034, 0.048, new V3(0, 0, 1), 0, 0.012), P.black()));
  // throttle quadrant on the port wall
  const tq = B(fuseX(3.02, 0.12) - 0.05, 0.1, 3.02);
  out.push(part(roundedBox(0.035, 0.06, 0.17, 0.006), P.interior(), { p: tq }));
  const lvTop = tq.clone().add(new V3(-0.02, 0.1, -0.05));
  out.push(part(frameBar(tq.clone().add(new V3(-0.018, 0.02, 0)), lvTop, 0.012, 0.012, new V3(1, 0, 0), 0, 0.005), P.steel()));
  out.push(part(new THREE.SphereGeometry(0.02, 12, 8), P.black(), { p: lvTop }));
  // trim and flap hand wheels on the port wall beside the seat
  const wx = fuseX(3.3, -0.06) - 0.05;
  for (const [r, dx] of [
    [0.125, 0.0],
    [0.09, -0.028],
  ] as const) {
    const t = new THREE.TorusGeometry(r, 0.011, 8, 40);
    t.rotateY(Math.PI / 2);
    t.translate(wx + dx, -0.05, -3.3);
    out.push(part(t, P.black()));
    // spokes
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      const p0 = new V3(wx + dx, -0.05, -3.3);
      const p1 = p0.clone().add(new V3(0, Math.cos(a) * r, Math.sin(a) * r));
      out.push(part(frameBar(p0, p1, 0.008, 0.006, new V3(1, 0, 0), 0, 0.002), P.black()));
    }
  }
  const hub = new THREE.CylinderGeometry(0.02, 0.02, 0.06, 12);
  hub.rotateZ(Math.PI / 2);
  hub.translate(wx - 0.01, -0.05, -3.3);
  out.push(part(hub, P.steel()));
  // starboard: oxygen regulator box with a small gauge
  const ox = B(-(fuseX(3.1, 0.05) - 0.05), 0.06, 3.1);
  out.push(part(roundedBox(0.05, 0.12, 0.11, 0.008), P.interior(), { p: ox }));
  const gauge = new THREE.CylinderGeometry(0.022, 0.022, 0.01, 16);
  gauge.rotateZ(Math.PI / 2);
  gauge.translate(ox.x + 0.028, ox.y + 0.02, ox.z);
  out.push(part(gauge, P.black()));
  // floor plate
  const fl = new THREE.PlaneGeometry(0.5, 1.0);
  fl.rotateX(-Math.PI / 2);
  fl.translate(0, -0.255, -3.12);
  out.push(part(fl, P.interior()));
  return group(out);
}

export function buildCockpit(): THREE.Object3D {
  return group([canopy(), gallandPanzer(), panel(), tub(), seat(), controls()]);
}
