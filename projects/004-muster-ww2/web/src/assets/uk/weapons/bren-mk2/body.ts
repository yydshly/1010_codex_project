/**
 * Bren Mk II body group (B-frame, see dims.ts): the milled steel body with its flat sides, the raised
 * rear-sight bed and the magazine housing with the top magazine opening; the Mk II leaf backsight on
 * the LEFT of the body (ladder leaf raised, aperture slide); the magazine catch with its thumb loop
 * behind the magazine; the magazine-opening cover slid forward (serrated thumb piece); the right-side
 * cocking-handle slot with the slide and the fixed (non-folding) Mk II cocking handle at the front of
 * its travel; the trigger group with the walnut pistol grip, trigger guard, trigger and the change lever
 * (left side); the ejection-opening cover underneath; the barrel nut with its handle (left); and the
 * lower frame (gas-cylinder casing) under the barrel with its vent holes and the front tripod lug.
 */
import { THREE, G, part, decal } from '../../../../core/kit';
import { V, RAD, cylX, cylZ, latheX, latheZ, plateZY, plateXZ, roundRect, stadium, circle2D, extrudeZ, screwParts, placeAlong, spaced, basis, type V2 } from '../common/geo';
import type { UkwMats } from '../common/materials';
import { BR } from './dims';
import { tessellate, gridBox } from './util';

/** Pistol-grip frame: top centre, down axis and forward direction (B-frame). */
export function gripFrame() {
  const g = BR.grip;
  const r = g.rakeDeg * RAD;
  const down = V(0, -Math.cos(r), -Math.sin(r));
  const fwd = V(0, -Math.sin(r), Math.cos(r));
  const top = V(0, g.top + 0.004, (g.zRearTop + g.zFrontTop) / 2);
  return { top, down, fwd, len: (g.top + 0.004 - g.bot) / Math.cos(r) };
}

/** Pistol-grip section at distance w below its top: half width (x), half length (fore-aft), centre shift. */
function gripSec(w: number, len: number): { hx: number; hz: number; dz: number } {
  const f = w / len;
  const hx = 0.0138 + 0.0017 * f;
  const hz = 0.0262 + 0.0018 * f;
  // front swells a little below the guard, back is straight
  const dz = 0.0008 * Math.sin(Math.PI * Math.min(1, f * 1.4));
  return { hx, hz, dz };
}

function superRect(hx: number, hz: number, e: number, n: number, dz = 0): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    pts.push([hx * Math.sign(c) * Math.pow(Math.abs(c), 2 / e), dz + hz * Math.sign(s) * Math.pow(Math.abs(s), 2 / e)]);
  }
  return pts;
}

export function buildBody(m: UkwMats, hi: boolean): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const b = BR.body;
  const seg = hi ? 32 : 20;

  // ================= body: core slab + right side plate with the cocking-handle slot
  {
    const sl = BR.slot;
    const xr = -b.hw + sl.depth; // slot bottom (right side)
    // core slab (grid faces) + the right-hand wall built round the cocking-handle slot
    out.push(part(gridBox([xr, b.bot, b.z0], [b.hw, b.top, b.z1], 0.009), m.black));
    const x0 = -b.hw, x1 = xr;
    out.push(part(gridBox([x0, sl.y1, b.z0], [x1, b.top, b.z1], 0.009), m.black));
    out.push(part(gridBox([x0, b.bot, b.z0], [x1, sl.y0, b.z1], 0.009), m.black));
    out.push(part(gridBox([x0, sl.y0, b.z0], [x1, sl.y1, sl.z0], 0.009), m.black));
    out.push(part(gridBox([x0, sl.y0, sl.z1], [x1, sl.y1, b.z1], 0.009), m.black));
    // small chamfer strips along the top edges of the body
    for (const sx of [-1, 1]) {
      const e = G.box(0.0022, 0.0022, b.z1 - b.z0);
      e.rotateZ(Math.PI / 4);
      out.push(part(e, m.black, { p: [sx * (b.hw - 0.0006), b.top - 0.0006, (b.z0 + b.z1) / 2] }));
    }
    // slot bottom (dark) and the slide that closes the slot behind the handle
    out.push(part(G.box(0.0008, sl.y1 - sl.y0 - 0.001, sl.z1 - sl.z0 - 0.002), m.recess, { p: [xr - 0.0003, (sl.y0 + sl.y1) / 2, (sl.z0 + sl.z1) / 2] }));
    out.push(part(G.rbox(0.0028, 0.0074, BR.handleZ - 0.006 - (sl.z0 + 0.003), 0.0008, 1), m.blued, { p: [xr - 0.0017, (sl.y0 + sl.y1) / 2, (BR.handleZ - 0.006 + sl.z0 + 0.003) / 2] }));
    // shallow milled grooves along both sides
    out.push(part(G.box(0.0008, 0.0012, b.z1 - b.z0 - 0.02), m.recess, { p: [-b.hw - 0.0001, -0.0205, (b.z0 + b.z1) / 2] }));
    out.push(part(G.box(0.0008, 0.0012, b.z1 - b.z0 - 0.02), m.recess, { p: [b.hw + 0.0001, -0.0205, (b.z0 + b.z1) / 2] }));
    out.push(part(G.box(0.0008, 0.0012, b.z1 - b.z0 - 0.06), m.recess, { p: [b.hw + 0.0001, -0.0445, (b.z0 + b.z1) / 2 + 0.02] }));
    // body pin at the rear, both sides
    for (const sx of [-1, 1]) {
      out.push(part(cylX(0.0042, 0, 0.0012, 18, 0.0004), m.blued, { p: [sx > 0 ? b.hw : -b.hw - 0.0012, -0.008, 0.2475] }));
    }
    // stamped marking on the right side of the body
    out.push(
      decal('bren-mk2-stamp', 0.06, 0.0085, (c, w, h) => {
        c.clearRect(0, 0, w, h);
        c.fillStyle = '#56585b';
        c.font = `600 ${Math.round(h * 0.78)}px "Arial Narrow", Arial, sans-serif`;
        c.textBaseline = 'middle';
        c.textAlign = 'center';
        c.fillText('B R E N   M k  I I', w / 2, h * 0.54);
      }, { p: [-b.hw - 0.00025, -0.0075, 0.336], r: [0, -90, 0] }, 512),
    );
    // rear face plate (butt-group face) with its chamfer
    out.push(part(G.rbox(2 * b.hw - 0.002, 0.018, 0.003, 0.001, 1), m.black, { p: [0, -0.004, b.z0 - 0.0012] }));
  }

  // ================= raised rear-sight bed and magazine housing
  {
    const rt = BR.rearTop;
    out.push(part(gridBox([-rt.hw, b.top - 0.001, rt.z0], [rt.hw, rt.y, rt.z1], 0.009), m.black));
    const h = BR.housing, o = BR.opening;
    // rear part with the magazine opening (real opening, dark interior)
    const yb = b.top - 0.001;
    out.push(part(gridBox([-h.hw, yb, h.z0], [h.hw, h.y, o.z0], 0.009), m.black));
    out.push(part(gridBox([-h.hw, yb, o.z1], [h.hw, h.y, h.zStep], 0.009), m.black));
    for (const sx of [-1, 1]) out.push(part(gridBox(sx > 0 ? [o.hw, yb, o.z0] : [-h.hw, yb, o.z0], sx > 0 ? [h.hw, h.y, o.z1] : [-o.hw, h.y, o.z1], 0.009), m.black));
    // chamfers along the top edges of the housing
    for (const sx of [-1, 1]) {
      const e = G.box(0.002, 0.002, h.zStep - h.z0);
      e.rotateZ(Math.PI / 4);
      out.push(part(e, m.black, { p: [sx * (h.hw - 0.0005), h.y - 0.0005, (h.z0 + h.zStep) / 2] }));
    }
    out.push(part(G.box(2 * o.hw - 0.001, 0.002, o.z1 - o.z0 - 0.001), m.recess, { p: [0, b.top + 0.0015, (o.z0 + o.z1) / 2] }));
    // front part (lower top) carrying the magazine-opening cover guides
    const hf = h.yFront - b.top + 0.001;
    out.push(part(gridBox([-h.hw, b.top - 0.001, h.zStep], [h.hw, h.yFront, h.z1], 0.009), m.black));
    void hf;
    // step face chamfer between the two top levels
    out.push(part(G.rbox(2 * h.hw - 0.004, h.y - h.yFront, 0.004, 0.0012, 1), m.black, { p: [0, (h.y + h.yFront) / 2, h.zStep + 0.001] }));
    // cover guide rails along the top edges of the front part
    for (const sx of [-1, 1]) out.push(part(G.rbox(0.003, 0.0028, h.z1 - h.zStep, 0.0008, 1), m.black, { p: [sx * (h.hw - 0.0015), h.yFront + 0.0012, (h.zStep + h.z1) / 2] }));
    // lip at the rear of the opening where the magazine rear rests
    out.push(part(G.rbox(2 * o.hw + 0.004, 0.0022, 0.004, 0.0008, 1), m.black, { p: [0, h.y + 0.0008, o.z0 - 0.003] }));
  }

  // ================= magazine-opening cover, slid forward (open), serrated thumb piece
  {
    const z0 = 0.519, z1 = 0.612, y0 = BR.housing.yFront + 0.0002, t = 0.0034, hw = 0.0125, x = -0.0035;
    const side: V2[] = [
      [z0, y0],
      [z1 - 0.004, y0],
      [z1, y0 + 0.0015],
      [z1, y0 + t],
      [z0 + 0.018, y0 + t],
      [z0 + 0.008, y0 + t + 0.0085],
      [z0 + 0.004, y0 + t + 0.0085],
      [z0, y0 + t - 0.0005],
    ];
    out.push(part(tessellate(plateZY(side, 2 * hw, [], 0.0007), 0.008), m.black, { p: [x, 0, 0] }));
    // serrations across the thumb piece and the cover top
    const ridge = G.box(2 * hw - 0.003, 0.0012, 0.0012);
    for (const z of spaced(0.53, 0.604, 11)) out.push(part(ridge.clone(), m.black, { p: [x, y0 + t + 0.0004, z] }));
  }

  // ================= Mk II leaf backsight on the left of the body (leaf raised, slide low)
  {
    const z = BR.rearSightZ, x = BR.sightX, yb = BR.rearTop.y;
    // base block on the left edge of the bed + hinge knuckles
    out.push(part(G.rbox(0.021, 0.0068, 0.022, 0.0012, 1), m.black, { p: [x - 0.004, yb + 0.0032, z] }));
    out.push(part(cylX(0.0032, x - 0.0105, x + 0.0105, 16, 0.0004), m.blued, { p: [0, yb + 0.0075, z] }));
    // ladder leaf: two rails, bottom bar, top bar with the knob
    const top = 0.0915, rw = 0.0027, rd = 0.0034, gap = 0.0052;
    for (const sx of [-1, 1]) out.push(part(G.rbox(rw, top - yb - 0.008, rd, 0.0006, 1), m.blued, { p: [x + sx * gap, (top + yb + 0.008) / 2, z] }));
    out.push(part(G.rbox(2 * gap + rw, 0.005, rd, 0.0008, 1), m.blued, { p: [x, yb + 0.0095, z] }));
    out.push(part(G.rbox(2 * gap + rw + 0.001, 0.0045, rd + 0.0006, 0.001, 1), m.blued, { p: [x, top, z] }));
    out.push(part(G.cyl(0.0036, 0.0036, 0.0042, 18), m.blued, { p: [x, top + 0.0043, z] }));
    out.push(part(G.cyl(0.0039, 0.0039, 0.0012, 18), m.blued, { p: [x, top + 0.0068, z] }));
    // range graduations on the rear face of the right rail
    const tick = G.box(0.0016, 0.0004, 0.0003);
    for (let i = 0; i < 16; i++) {
      const y = yb + 0.016 + i * 0.0043;
      const long = i % 2 === 0;
      out.push(part(tick.clone().scale(long ? 1 : 0.6, 1, 1), m.marks, { p: [x - gap - (long ? 0 : 0.0003), y, z - rd / 2 - 0.0001] }));
    }
    // aperture slide round the rails with its catch on the right
    const sy = 0.047;
    out.push(part(extrudeZ(roundRect(x, sy, 2 * gap + rw + 0.0034, 0.0098, 0.0014, 2), [circle2D(x, sy, 0.0048, 20)], z - 0.0034, z + 0.0034, 0.0005), m.blued));
    out.push(part(extrudeZ(circle2D(x, sy, 0.0048, 20), [circle2D(x, sy, 0.00075, 12)], z - 0.0009, z + 0.0009, 0.0002), m.blued));
    out.push(part(G.rbox(0.0045, 0.0055, 0.0048, 0.0012, 1), m.blued, { p: [x - gap - 0.0048, sy, z] }));
    out.push(part(cylX(0.0024, x - gap - 0.0098, x - gap - 0.0068, 12), m.blued, { p: [0, sy, z] }));
  }

  // ================= magazine catch behind the magazine (lever with the thumb loop)
  {
    const z = BR.opening.z0 - 0.009, y = BR.housing.y;
    out.push(part(G.rbox(0.012, 0.005, 0.009, 0.0012, 1), m.black, { p: [0.003, y + 0.0022, z] }));
    const P = [V(0.003, y + 0.004, z), V(0.003, y + 0.013, z + 0.002), V(0.003, y + 0.021, z + 0.0055)];
    out.push(part(G.strap(P, 0.0065, 0.0024, V(0, 0, -1), { samples: 12 }), m.blued));
    const loop = G.torus(0.0052, 0.0015, 8, 22);
    loop.rotateY(Math.PI / 2);
    out.push(part(loop, m.blued, { p: [0.003, y + 0.0272, z + 0.0068] }));
  }

  // ================= fixed Mk II cocking handle (right side, forward)
  {
    const sl = BR.slot;
    const y = (sl.y0 + sl.y1) / 2, z = BR.handleZ, xr = -b.hw + sl.depth;
    out.push(part(G.rbox(0.004, 0.0098, 0.012, 0.0012, 1), m.blued, { p: [xr - 0.002, y, z] }));
    out.push(part(cylX(0.0043, -b.hw - 0.0105, xr - 0.003, 16, 0.0005), m.blued, { p: [0, y, z] }));
    // knob: turned grip with two grooves and a domed end, pointing to the right
    const prof: V2[] = [
      [0, 0],
      [0.0062, 0],
      [0.0068, 0.0012],
      [0.0068, 0.0085],
      [0.006, 0.0092],
      [0.006, 0.0104],
      [0.0072, 0.0112],
      [0.0074, 0.0205],
      [0.0066, 0.0214],
      [0.0066, 0.0226],
      [0.0074, 0.0234],
      [0.0074, 0.0292],
      [0.0066, 0.0318],
      [0.0044, 0.0336],
      [0, 0.0341],
    ];
    const knob = latheX(prof, hi ? 24 : 16, 40);
    knob.scale(-1, 1, 1);
    knob.translate(-b.hw - 0.0102, y, z);
    // mirroring flips winding
    G.flipWinding(knob);
    out.push(part(knob, m.blued));
  }

  // ================= trigger group, pistol grip, guard, trigger, change lever
  {
    const tg = BR.trigGroup;
    const prof: V2[] = [
      [tg.z0, b.bot + 0.002],
      [tg.z0, tg.bot + 0.004],
      [tg.z0 + 0.005, tg.bot],
      [tg.z1 - 0.012, tg.bot],
      [tg.z1 - 0.003, tg.bot + 0.003],
      [tg.z1, tg.bot + 0.008],
      [tg.z1, b.bot + 0.002],
    ];
    out.push(part(tessellate(plateZY(prof, 2 * tg.hw, [], 0.0015), 0.01), m.black));
    // pins through the trigger group
    for (const [z, y] of [
      [0.274, -0.0615],
      [0.386, -0.0615],
      [0.357, -0.064],
    ] as V2[]) out.push(part(cylX(0.0024, -tg.hw - 0.0008, tg.hw + 0.0008, 14, 0.0004), m.blued, { p: [0, y, z] }));

    // walnut pistol grip (lofted along its raked axis) with a steel top cap
    const gf = gripFrame();
    const n = hi ? 40 : 24;
    const L = gf.len;
    const ws = [...spaced(0, L - 0.008, hi ? 10 : 6), L - 0.005, L - 0.0028, L - 0.0012, L - 0.0003];
    const secs = ws.map((w) => {
      const s = gripSec(Math.min(w, L - 0.008), L);
      const k = w > L - 0.008 ? Math.cos(Math.asin(Math.min(1, (w - (L - 0.008)) / 0.0082))) : 1;
      const shrink = 1 - (1 - k) * 0.55;
      return { z: w, ring: superRect(s.hx * shrink, s.hz * shrink, 2.9, n, s.dz) };
    });
    const gg = G.loftZ(secs, true, 45);
    gg.applyMatrix4(basis(V(1, 0, 0), gf.fwd, gf.down, gf.top));
    out.push(part(gg, m.walnut));
    const cap = G.loftZ(
      [0, 0.0055, 0.0085].map((w) => ({ z: w, ring: superRect(0.0151 - (w > 0.006 ? 0.0004 : 0), 0.0281 - (w > 0.006 ? 0.0004 : 0), 3.2, 32) })),
      true,
      45,
    );
    cap.applyMatrix4(basis(V(1, 0, 0), gf.fwd, gf.down, gf.top.clone().addScaledVector(gf.down, 0.0035)));
    out.push(part(cap, m.black));
    // grip screw through the left side
    const [head, slot] = screwParts(0.0038, 0.0012, 20);
    const sp = gf.top.clone().addScaledVector(gf.down, 0.05).add(V(0.0152, 0, 0));
    out.push(part(placeAlong(head, sp, V(1, 0, 0)), m.blued), part(placeAlong(slot, sp, V(1, 0, 0), 70), m.recess));

    // trigger guard: round loop from the front of the trigger group to the top of the grip
    const gd = BR.guard;
    const loop = [
      V(0, tg.bot + 0.001, gd.z1),
      V(0, -0.086, gd.z1 + 0.0005),
      V(0, -0.097, gd.z1 - 0.005),
      V(0, gd.bot, (gd.z0 + gd.z1) / 2 + 0.004),
      V(0, -0.1, gd.z0 + 0.007),
      V(0, -0.091, gd.z0 + 0.0015),
      V(0, -0.082, gd.z0 - 0.0005),
    ];
    const c = V(0, -0.085, (gd.z0 + gd.z1) / 2);
    const Nn = loop.map((p) => p.clone().sub(c).setX(0).normalize());
    out.push(part(G.strap(loop, 0.0085, 0.003, Nn, { samples: 44 }), m.black));
    // trigger blade
    const tz = BR.triggerZ;
    const tp = [V(0, tg.bot + 0.002, tz + 0.001), V(0, -0.078, tz + 0.0004), V(0, -0.0855, tz - 0.0016), V(0, -0.0905, tz - 0.0052)];
    out.push(part(G.strap(tp, 0.0058, 0.0036, V(0, 0, 1), { samples: 20 }), m.blued));
    out.push(part(G.box(0.0044, 0.0005, 0.012), m.recess, { p: [0, tg.bot - 0.0002, tz + 0.002] }));

    // change lever on the left side above the grip: boss + arm pointing forward and down
    const cz = BR.changeLeverZ, cy = -0.061;
    out.push(part(cylX(0.0066, tg.hw - 0.0004, tg.hw + 0.0024, 22, 0.0005), m.blued, { p: [0, cy, cz] }));
    const ang = -32 * RAD;
    const arm: V2[] = [];
    const la = 0.026;
    const pts: V2[] = [
      [-0.0042, -0.004],
      [la, -0.0026],
      [la + 0.0035, 0],
      [la, 0.0034],
      [-0.0042, 0.004],
    ];
    for (const [u, v] of pts) arm.push([cz + u * Math.cos(ang) - v * Math.sin(ang), cy + u * Math.sin(ang) + v * Math.cos(ang)]);
    out.push(part(plateZY(arm, 0.0022, [], 0.0005), m.blued, { p: [tg.hw + 0.0035, 0, 0] }));
    // thumb ridge at the end of the arm
    const ez = cz + la * Math.cos(ang), ey = cy + la * Math.sin(ang);
    out.push(part(cylX(0.0022, tg.hw + 0.0035, tg.hw + 0.0068, 12), m.blued, { p: [0, ey, ez] }));
    // index marks (A / R) on the left side
    out.push(part(G.box(0.0004, 0.0008, 0.0035), m.marks, { p: [tg.hw + 0.0002, cy - 0.0105, cz + 0.004] }));
    out.push(part(G.box(0.0004, 0.0035, 0.0008), m.marks, { p: [tg.hw + 0.0002, cy + 0.009, cz - 0.004] }));
  }

  // ================= ejection-opening cover under the body
  {
    const z0 = 0.405, z1 = 0.52;
    out.push(part(G.rbox(0.031, 0.0022, z1 - z0, 0.0008, 1), m.black, { p: [0, b.bot - 0.0009, (z0 + z1) / 2] }));
    out.push(part(cylX(0.0028, -0.012, 0.012, 14), m.blued, { p: [0, b.bot - 0.0025, z1 - 0.002] }));
    out.push(part(G.rbox(0.008, 0.004, 0.006, 0.001, 1), m.blued, { p: [0, b.bot - 0.0028, z0 + 0.004] }));
    // seam round the cover
    out.push(part(G.box(0.033, 0.0005, 0.0006), m.recess, { p: [0, b.bot - 0.0002, z0 - 0.0004] }));
  }

  // ================= barrel nut with its handle on the left
  {
    const nut = BR.nut;
    const prof: V2[] = [
      [0.0152, nut.z0],
      [nut.r - 0.0006, nut.z0],
      [nut.r, nut.z0 + 0.0008],
      [nut.r, nut.z1 - 0.0008],
      [nut.r - 0.0008, nut.z1],
      [0.0152, nut.z1],
    ];
    out.push(part(latheZ(prof, seg, 40), m.black));
    // handle: flat lever down the left side of the lower frame, rounded thumb end
    const lz = (nut.z0 + nut.z1) / 2 + 0.002;
    const lever: V2[] = [
      [lz - 0.0065, 0.004],
      [lz + 0.0065, 0.004],
      [lz + 0.0055, -0.042],
      [lz + 0.0075, -0.056],
      [lz + 0.006, -0.0645],
      [lz, -0.0668],
      [lz - 0.006, -0.0645],
      [lz - 0.0075, -0.056],
      [lz - 0.0055, -0.042],
    ];
    out.push(part(plateZY(lever, 0.0036, [], 0.0008), m.black, { p: [BR.frame.hw + 0.0024, 0, 0] }));
  }

  // ================= lower frame (gas-cylinder casing) with the vent holes, front tripod lug
  {
    const f = BR.frame;
    const outline: V2[] = [
      [f.z0 - 0.002, f.bot],
      [f.z1 - 0.006, f.bot],
      [f.z1, f.bot + 0.005],
      [f.z1, f.top - 0.003],
      [f.z1 - 0.004, f.top],
      [f.z0 - 0.002, f.top],
    ];
    const holes: V2[][] = [];
    for (const y of [-0.0335, -0.041]) for (let i = 0; i < 5; i++) holes.push(circle2D(0.7295 + i * 0.0072, y, 0.0021, 12));
    // core + 2 mm side walls carrying the real vent holes; dark piston space behind the walls
    const wt = 0.002;
    const zc = f.z1 - 0.007; // start of the chamfered nose
    out.push(part(gridBox([-(f.hw - wt), f.bot, f.z0 - 0.002], [f.hw - wt, f.top, zc], 0.009), m.black));
    // chamfered nose of the casing
    const nose: V2[] = [
      [zc - 0.001, f.bot],
      [f.z1 - 0.006, f.bot],
      [f.z1, f.bot + 0.005],
      [f.z1, f.top - 0.003],
      [f.z1 - 0.004, f.top],
      [zc - 0.001, f.top],
    ];
    out.push(part(plateZY(nose, 2 * f.hw, [], 0.0006), m.black));
    const hz0 = 0.7235, hz1 = 0.7645;
    for (const sx of [-1, 1]) {
      const xa = sx > 0 ? f.hw - wt : -f.hw, xb = sx > 0 ? f.hw : -f.hw + wt;
      out.push(part(gridBox([xa, f.bot, f.z0 - 0.002], [xb, f.top, hz0], 0.009), m.black));
      out.push(part(gridBox([xa, f.bot, hz1], [xb, f.top, zc], 0.009), m.black));
      const panel: V2[] = [
        [hz0, f.bot],
        [hz1, f.bot],
        [hz1, f.top],
        [hz0, f.top],
      ];
      out.push(part(plateZY(panel, wt, holes, 0.0002), m.black, { p: [sx * (f.hw - wt / 2), 0, 0] }));
      out.push(part(G.box(0.0002, 0.016, 0.042), m.recess, { p: [sx * (f.hw - wt - 0.0002), -0.0372, 0.744] }));
    }
    // flats / milled step along the upper edge of the frame
    for (const sx of [-1, 1]) out.push(part(G.box(0.0006, 0.001, f.z1 - f.z0 - 0.02), m.recess, { p: [sx * (f.hw + 0.0001), f.top - 0.0065, (f.z0 + f.z1) / 2] }));
    // front tripod lug with its eye
    const lz = BR.tripodLugZ;
    const lug: V2[] = [
      [lz - 0.014, f.bot + 0.001],
      [lz + 0.014, f.bot + 0.001],
      [lz + 0.0085, f.bot - 0.012],
      [lz + 0.004, f.bot - 0.0175],
      [lz - 0.004, f.bot - 0.0175],
      [lz - 0.0085, f.bot - 0.012],
    ];
    out.push(part(plateZY(lug, 0.0082, [circle2D(lz, f.bot - 0.0095, 0.0036, 16)], 0.0008), m.black));
    // gas cylinder tube ahead of the frame
    out.push(part(cylZ(BR.gasR, f.z1 - 0.004, BR.sleeve.z0 + 0.002, seg, 0.0005), m.black, { p: [0, BR.gasY, 0] }));
  }
  return out;
}
