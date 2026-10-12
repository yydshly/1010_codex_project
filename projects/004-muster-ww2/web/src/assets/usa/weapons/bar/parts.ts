/**
 * BAR M1918A2 parts except the bipod and the sling (B-frame, see dims.ts):
 *  - receiver: one lofted, flat-sided block whose rear end slopes down onto the comb of the butt;
 *    rear-sight section 3 mm lower than the front section; charging-handle slot and handle (bolt
 *    forward) on the left, ejection port dust cover on the right, milled side lines, pins, front collar
 *  - trigger housing under the rear half with the rate-of-fire change lever (S / F / A) on the left,
 *    trigger guard, trigger, magazine release button and the flared A2 magazine guides
 *  - magazine well opening and the 20-round magazine (blued)
 *  - barrel, gas cylinder tube, gas cylinder bracket with clamp screw, gas regulator
 *  - walnut hand guard (finger groove each side, through bolt) with the steel heat shield on top
 *  - front sling-swivel band on the gas cylinder tube just ahead of the hand guard
 *  - hooded front sight (side light ports), tubular flash hider with the inner cone
 *  - rear sight: base, protective ears, raised leaf with aperture slide, windage knob on the right
 *  - walnut butt stock with the steel butt plate, the hinged shoulder rest (folded), butt screw,
 *    rear sling-swivel plate and lug
 *  - sling swivels (pins and loops)
 */
import { THREE, G, part, decal } from '../../../../core/kit';
import { V, latheZ, cylX, cylZ, extrudeZ, plateZY, plateXZ, roundRect, circle2D, screwParts, placeAlong, knurledKnob, stations, warp, smoothstep, clamp, type V2 } from '../common/geo';
import { swivelLoop, circlesUnion } from '../common/parts';
import { BD, BSTOCK, BHG, BBARREL, barrelR } from './dims';
import type { BarMats } from './materials';

/** Swivels shared with the sling builder. */
export const BSWIVELS = {
  front: { pin: V(0, BD.gasY - BD.gasR - 0.0062, BD.frontSwivelZ), dir: V(0, -1, 0.12).normalize(), reach: 0.0205 },
  rear: { pin: V(0, BSTOCK.at(BD.rearSwivelZ).yBot - 0.0068, BD.rearSwivelZ), dir: V(0, 0.04, 1).normalize(), reach: 0.0205 },
  innerW: 0.0335,
  wire: 0.002,
};
export const bSwivelBar = (s: { pin: THREE.Vector3; dir: THREE.Vector3; reach: number }) => s.pin.clone().addScaledVector(s.dir, s.reach);

/** Rounded-rectangle section (CCW) with separate top / bottom corner radii. */
export function box2D(hw: number, yBot: number, yTop: number, rTop: number, rBot: number, n = 5): V2[] {
  const pts: V2[] = [];
  const arc = (cx: number, cy: number, r: number, a0: number) => {
    for (let i = 0; i <= n; i++) {
      const a = ((a0 + (90 * i) / n) * Math.PI) / 180;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  arc(hw - rBot, yBot + rBot, rBot, -90);
  arc(hw - rTop, yTop - rTop, rTop, 0);
  arc(-hw + rTop, yTop - rTop, rTop, 90);
  arc(-hw + rBot, yBot + rBot, rBot, 180);
  return pts;
}

/**
 * box2D with the straight edges subdivided into a fixed number of segments (sides `ns`, top and bottom
 * `nt`), so lofted blocks keep short triangles (edge wear and shading stay local) and every ring of a
 * loft has the same point count.
 */
export function box2Dsub(hw: number, yBot: number, yTop: number, rTop: number, rBot: number, n = 5, ns = 8, nt = 6): V2[] {
  const arcs: V2[][] = [];
  const arc = (cx: number, cy: number, r: number, a0: number) => {
    const a: V2[] = [];
    for (let i = 0; i <= n; i++) {
      const t = ((a0 + (90 * i) / n) * Math.PI) / 180;
      a.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
    }
    arcs.push(a);
  };
  arc(hw - rBot, yBot + rBot, rBot, -90);
  arc(hw - rTop, yTop - rTop, rTop, 0);
  arc(-hw + rTop, yTop - rTop, rTop, 90);
  arc(-hw + rBot, yBot + rBot, rBot, 180);
  const pts: V2[] = [];
  const segs = [ns, nt, ns, nt];
  for (let k = 0; k < 4; k++) {
    const a = arcs[k], b = arcs[(k + 1) % 4];
    pts.push(...a);
    const p0 = a[a.length - 1], p1 = b[0];
    for (let i = 1; i < segs[k]; i++) {
      const t = i / segs[k];
      pts.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]);
    }
  }
  return pts;
}

/** Top of the receiver at z (rear slope, rear-sight section, front section). */
export function rcvTopAt(z: number): number {
  if (z <= BD.slopeZ1) {
    const t = clamp((z - BD.rcvRear) / (BD.slopeZ1 - BD.rcvRear), 0, 1);
    return BD.slopeY0 + (BD.rcvTopRear - BD.slopeY0) * (0.5 - 0.5 * Math.cos(Math.PI * t));
  }
  return BD.rcvTopRear + (BD.rcvTop - BD.rcvTopRear) * smoothstep(BD.rcvStepZ - 0.0004, BD.rcvStepZ + 0.0004, z);
}

/** Bottom of the receiver at z (over the trigger housing / magazine well and front section). */
export const rcvBotAt = (z: number) => BD.rcvBot + (BD.wellBot - BD.rcvBot) * smoothstep(BD.thFront - 0.0004, BD.thFront + 0.0008, z);

export function buildBarParts(m: BarMats, withMag: boolean, detail: 'high' | 'low' = 'high'): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const hi = detail === 'high';
  const [scHead, scSlot] = screwParts(0.0034, 0.0012, 25);
  const screw = (p: THREE.Vector3, n: THREE.Vector3, spin = 25, s = 1, mat: THREE.Material = m.park) => {
    const h = scHead.clone().scale(s, s, s), sl = scSlot.clone().scale(s, s, s);
    out.push(part(placeAlong(h, p, n), mat), part(placeAlong(sl, p, n, spin), m.recess));
  };
  const pin = (x: number, y: number, z: number, r = 0.0019, mat: THREE.Material = m.bright) => out.push(part(cylX(r, 0.0008, 12), mat, { p: [x, y, z] }));

  // ---------------- receiver (lofted block)
  {
    const zs: number[] = [];
    for (let z = BD.rcvRear; z < BD.slopeZ1; z += 0.0025) zs.push(z);
    zs.push(BD.slopeZ1, 0.36, 0.39, BD.rcvStepZ - 0.004, BD.rcvStepZ - 0.0004, BD.rcvStepZ + 0.0004, BD.rcvStepZ + 0.004);
    zs.push(BD.thFront - 0.003, BD.thFront - 0.0004, BD.thFront + 0.0008, BD.magZ0 + 0.0002, BD.magZ0 + 0.004, 0.47, 0.5, 0.53, 0.56, BD.rcvFront - 0.0014, BD.rcvFront);
    zs.sort((a, b) => a - b);
    for (let i = zs.length - 1; i > 0; i--) if (zs[i] - zs[i - 1] < 0.0003) zs.splice(i, 1);
    const secs = zs.map((z) => {
      const f = z >= BD.rcvFront - 1e-6 ? 0.0012 : 0;
      const yt = rcvTopAt(z) - f, yb = rcvBotAt(z) + f;
      const rT = Math.min(0.0052, (yt - yb) / 3);
      return { z, ring: box2Dsub(BD.rcvHW - f, yb, yt, rT, 0.0016, 6, 14, 8) };
    });
    out.push(part(G.loftZ(secs, true, 42), m.park));
    // milled lines along the upper sides and a flat along the lower edge of the front section
    for (const sx of [1, -1]) {
      out.push(part(G.box(0.0005, 0.0009, BD.rcvFront - BD.slopeZ1 - 0.02), m.recess, { p: [sx * (BD.rcvHW + 0.0001), 0.0112, (BD.rcvFront + BD.slopeZ1) / 2 + 0.006] }));
      out.push(part(G.box(0.0005, 0.0008, BD.rcvFront - BD.magZ0 - 0.012), m.recess, { p: [sx * (BD.rcvHW + 0.0001), BD.wellBot + 0.0072, (BD.rcvFront + BD.magZ0) / 2] }));
    }
    // front collar round the barrel shank
    out.push(part(latheZ([[0.0148, BD.rcvFront - 0.001], [0.0169, BD.rcvFront - 0.001], [0.0172, BD.rcvFront + 0.0008], [0.0168, BD.rcvFront + 0.0042], [0.0148, BD.rcvFront + 0.0048]], 40, 35), m.parkDark));
  }

  // left: charging-handle slot and handle (bolt forward)
  {
    const x = BD.rcvHW + 0.0001;
    const y = -0.0015;
    const z0 = 0.378, z1 = 0.566;
    out.push(part(G.box(0.0006, 0.0066, z1 - z0), m.recess, { p: [x, y, (z0 + z1) / 2] }));
    for (const dy of [-0.0041, 0.0041]) out.push(part(G.rbox(0.0008, 0.0014, z1 - z0 + 0.002, 0.0004, 1), m.park, { p: [x + 0.0002, y + dy, (z0 + z1) / 2] }));
    const hz = z1 - 0.0085;
    out.push(part(G.rbox(0.012, 0.0062, 0.0112, 0.0014, 2), m.parkDark, { p: [x + 0.006, y, hz] }));
    const top: V2[] = [[x + 0.009, hz - 0.0075], [x + 0.0205, hz - 0.0082], [x + 0.0232, hz - 0.004], [x + 0.0232, hz + 0.004], [x + 0.0205, hz + 0.0082], [x + 0.009, hz + 0.0075]];
    out.push(part(plateXZ(top, 0.0132, [], 0.0016), m.parkDark, { p: [0, y, 0] }));
    for (let i = 0; i < 4; i++) out.push(part(G.box(0.0009, 0.0138, 0.0009), m.parkDark, { p: [x + 0.0234, y, hz - 0.0045 + i * 0.003] }));
    // hold-open / bolt-guide pins on the left
    pin(BD.rcvHW + 0.0003, -0.02, 0.36, 0.0017, m.parkDark);
    pin(BD.rcvHW + 0.0003, -0.024, 0.556, 0.0017, m.parkDark);
  }
  // right: ejection port with its spring dust cover (closed), hinged along the lower edge
  {
    const x = -BD.rcvHW;
    const cz = 0.497, cy = 0.0062, cl = 0.066, ch = 0.0205;
    out.push(part(plateZY(roundRect(cz, cy, cl + 0.0022, ch + 0.0022, 0.0024, 3), 0.0004, [], 0.0001), m.recess, { p: [x - 0.0002, 0, 0] }));
    out.push(part(plateZY(roundRect(cz, cy, cl, ch, 0.002, 3), 0.0012, [], 0.0004), m.parkDark, { p: [x - 0.0008, 0, 0] }));
    // pressed stiffening rib and the lip at the rear
    out.push(part(G.rbox(0.0006, 0.0022, cl - 0.016, 0.0003, 1), m.parkDark, { p: [x - 0.0016, cy + 0.0035, cz] }));
    out.push(part(G.rbox(0.0024, 0.0054, 0.0048, 0.0008, 1), m.parkDark, { p: [x - 0.0016, cy + 0.0012, cz - cl / 2 + 0.0038] }));
    out.push(part(cylZ(0.0014, cl + 0.006, 12), m.parkDark, { p: [x - 0.0006, cy - ch / 2 - 0.0012, cz] }));
    pin(-BD.rcvHW - 0.0003, -0.024, 0.356);
    pin(-BD.rcvHW - 0.0003, -0.024, 0.556);
    pin(-BD.rcvHW - 0.0003, 0.012, 0.556, 0.0015, m.parkDark);
  }

  // ---------------- trigger housing, change lever, guard, trigger, magazine release, A2 guides
  {
    out.push(part(extrudeZ(box2D(BD.thHW, BD.thBot, BD.rcvBot + 0.002, 0.001, 0.003), [], BD.thRear, BD.thFront, 0.0013, 4), m.park));
    for (const sx of [1, -1]) {
      out.push(part(G.box(0.0004, 0.0007, BD.thFront - BD.thRear - 0.004), m.recess, { p: [sx * (BD.thHW + 0.0001), BD.rcvBot - 0.0006, (BD.thRear + BD.thFront) / 2] }));
      for (const z of [0.318, 0.366]) pin(sx * (BD.thHW + 0.0003), -0.0555, z, 0.0018, sx > 0 ? m.bright : m.parkDark);
    }
    // rate-of-fire change lever (left side, above the front of the trigger guard): boss, lever with
    // thumb piece, three positions S (safe) - F (slow automatic) - A (fast automatic)
    const sz = 0.402, sy = -0.0525, sx0 = BD.thHW;
    out.push(part(cylX(0.0062, 0.0018, 24), m.park, { p: [sx0 + 0.0009, sy, sz] }));
    const a = (125 * Math.PI) / 180; // lever pointing up and back, at S (safe) as displayed
    const len = 0.019;
    const tip = [sz + Math.cos(a) * len, sy + Math.sin(a) * len];
    const nx = -Math.sin(a), ny = Math.cos(a);
    const lev: V2[] = [[sz - nx * 0.0048, sy - ny * 0.0048], [tip[0] - nx * 0.003, tip[1] - ny * 0.003], [tip[0] + nx * 0.003, tip[1] + ny * 0.003], [sz + nx * 0.0048, sy + ny * 0.0048]];
    out.push(part(plateZY(lev, 0.0018, [], 0.0005), m.parkDark, { p: [sx0 + 0.0027, 0, 0] }));
    const kn = knurledKnob(0.0038, 0.0034, hi ? 12 : 8, 0.0003, 0.0004);
    kn.rotateZ(-Math.PI / 2);
    out.push(part(kn, m.parkDark, { p: [sx0 + 0.0036, tip[1], tip[0]] }));
    out.push(part(cylX(0.0019, 0.0022, 12), m.bright, { p: [sx0 + 0.0038, sy, sz] }));
    if (hi) {
      // stamped position letters on the housing round the lever (S forward-down, F up, A up and back)
      const S = 0.03;
      out.push(
        decal(
          'bar-selector-letters',
          S,
          S,
          (ctx, w, h) => {
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#a3a59e';
            ctx.font = `bold ${Math.round(h * 0.11)}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // canvas x = weapon +Z (decal faces +X, so +Z runs to the left in the canvas); y down
            const put = (txt: string, deg: number) => {
              const r = 0.385 * w;
              const ang = (deg * Math.PI) / 180;
              const zz = Math.cos(ang) * r, yy = Math.sin(ang) * r;
              ctx.fillText(txt, w / 2 - zz, h / 2 - yy);
            };
            put('S', 125);
            put('F', 80);
            put('A', 35);
          },
          { p: [sx0 + 0.0003, sy, sz], r: [0, 90, 0] },
          256,
        ),
      );
    }
    // trigger guard
    const tb = BD.thBot, gb = BD.guardBot, gf = BD.guardFront, gr = BD.guardRear;
    const P: [number, number][] = [
      [gf, tb + 0.0015],
      [gf - 0.0015, tb - 0.011],
      [gf - 0.0085, tb - 0.0228],
      [gf - 0.021, gb + 0.0014],
      [gf - 0.04, gb],
      [gr + 0.021, gb + 0.0008],
      [gr + 0.0075, tb - 0.0238],
      [gr + 0.0012, tb - 0.0128],
      [gr, tb + 0.0015],
    ];
    const pts = P.map(([z, y]) => V(0, y, z));
    const c = V(0, tb - 0.0125, (gr + gf) / 2);
    out.push(part(G.strap(pts, 0.0104, 0.0036, pts.map((p) => p.clone().sub(c).setX(0).normalize()), { samples: 60 }), m.park));
    // trigger
    const tz = BD.triggerZ;
    const tp = [V(0, tb + 0.001, tz + 0.004), V(0, tb - 0.0072, tz + 0.001), V(0, tb - 0.0138, tz - 0.0005), V(0, tb - 0.0198, tz - 0.0002), V(0, tb - 0.0236, tz + 0.0015)];
    out.push(part(G.strap(tp, 0.0068, 0.0038, V(0, 0, 1), { samples: 30 }), m.parkDark));
    // magazine release button in the front of the guard bow
    out.push(part(cylZ(0.0026, 0.0052, 16), m.parkDark, { p: [0, tb - 0.0062, gf - 0.0032] }));
    out.push(part(cylZ(0.0019, 0.0012, 14), m.bright, { p: [0, tb - 0.0062, gf - 0.0062] }));
    // A2 magazine guides: wing-shaped plates either side of the rear of the magazine, flared out
    const flare = (5 * Math.PI) / 180, gx = 0.0176, gt = 0.0017;
    const guideX = (y: number) => gx + (BD.rcvBot - y) * Math.tan(flare);
    for (const sx of [1, -1]) {
      const gp: V2[] = [[0.417, BD.rcvBot - 0.0005], [0.4495, BD.rcvBot - 0.0005], [0.4515, -0.0705], [0.4465, -0.0838], [0.428, -0.0862], [0.4172, -0.0735]];
      const g = plateZY(gp, gt, [], 0.0005);
      g.translate(0, -BD.rcvBot, 0);
      g.rotateZ(sx * flare);
      g.translate(sx * gx, BD.rcvBot, 0);
      out.push(part(g, m.park));
      // rivet heads holding each guide
      for (const [zz, yy] of [[0.4228, -0.0445], [0.4228, -0.0585]] as const) {
        out.push(part(new THREE.SphereGeometry(0.0016, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), m.park, { p: [sx * (guideX(yy) + gt / 2 - 0.0002), yy, zz], r: [0, 0, sx * -90], s: [1, 0.45, 1] }));
      }
    }
  }

  // ---------------- magazine well opening and magazine (20-round)
  {
    const mz = (BD.magZ0 + BD.magZ1) / 2, ml = BD.magZ1 - BD.magZ0;
    const outer = roundRect(0, mz, 2 * BD.magHW + 0.003, ml + 0.003, 0.0035, 4);
    const inner = roundRect(0, mz, 2 * BD.magHW + 0.0002, ml + 0.0002, 0.0034, 4);
    out.push(part(plateXZ(outer, 0.0006, withMag ? [inner] : [], 0.0001), m.recess, { p: [0, BD.wellBot - 0.0001, 0] }));
    if (withMag) {
      const y0 = BD.magTop, y1 = BD.magBot;
      const sec = roundRect(0, mz, 2 * BD.magHW, ml, 0.0036, 4);
      out.push(part(plateXZ(sec, y0 - y1 - 0.004, [], 0.0008), m.mag, { p: [0, (y0 + y1 + 0.004) / 2, 0] }));
      // floor plate with the retaining flange and the plate catch at the rear
      const fp = roundRect(0, mz, 2 * BD.magHW + 0.0028, ml + 0.004, 0.004, 4);
      out.push(part(plateXZ(fp, 0.0042, [], 0.0013), m.mag, { p: [0, y1 + 0.0015, 0] }));
      out.push(part(G.rbox(0.012, 0.0036, 0.0028, 0.0008, 1), m.mag, { p: [0, y1 + 0.004, BD.magZ0 - 0.0006] }));
      // pressed stiffening ribs along the sides, the spot-welded seam line at the rear
      for (const sx of [1, -1]) {
        for (const y of [-0.086, -0.124]) out.push(part(G.rbox(0.0009, 0.0036, ml - 0.02, 0.0004, 1), m.mag, { p: [sx * (BD.magHW - 0.0001), y, mz] }));
        out.push(part(G.rbox(0.0009, 0.012, ml - 0.03, 0.0004, 1), m.mag, { p: [sx * (BD.magHW - 0.0002), -0.155, mz] }));
      }
      out.push(part(G.box(0.0014, y0 - y1 - 0.016, 0.0004), m.recess, { p: [0, (y0 + y1) / 2 - 0.004, BD.magZ0 - 0.0001] }));
    }
  }

  // ---------------- barrel, gas cylinder tube, bracket + regulator
  {
    const prof: V2[] = [[0, BD.breechZ], ...BBARREL.filter(([z]) => z > BD.breechZ).map(([z, r]) => [r, z] as V2), [0, BD.muzzleZ]];
    prof.splice(1, 0, [BBARREL[0][1], BD.breechZ]);
    out.push(part(latheZ(prof, hi ? 36 : 22, 30), m.park));
    out.push(part(G.rod([0, BD.gasY, BD.rcvFront - 0.004], [0, BD.gasY, BD.gasBlockZ0 + 0.002], BD.gasR, 24), m.park));
    const blk = circlesUnion([[0, 0, barrelR(BD.gasBlockZ0) + 0.003], [0, BD.gasY, BD.gasR + 0.0032]], 0, -0.012, 56, 0.005);
    out.push(part(extrudeZ(blk, [], BD.gasBlockZ0, BD.gasBlockZ1, 0.0012, 4), m.parkDark));
    // split line and clamp screw on the left of the bracket
    out.push(part(G.box(0.0006, 0.0008, BD.gasBlockZ1 - BD.gasBlockZ0 + 0.0004), m.recess, { p: [0.0128, -0.0122, (BD.gasBlockZ0 + BD.gasBlockZ1) / 2] }));
    screw(V(0.0125, -0.0145, (BD.gasBlockZ0 + BD.gasBlockZ1) / 2), V(1, 0, 0), 30, 0.9);
    // regulator: knurled ring + slotted plug at the front of the gas cylinder
    const rz = BD.gasBlockZ1;
    const kn = knurledKnob(0.0096, 0.011, hi ? 24 : 14, 0.0004, 0.0006);
    kn.rotateX(Math.PI / 2);
    out.push(part(kn, m.park, { p: [0, BD.gasY, rz] }));
    out.push(part(latheZ([[0, rz + 0.011], [0.0068, rz + 0.011], [0.0068, rz + 0.0145], [0.0055, rz + 0.0158], [0, rz + 0.0158]], 24, 35), m.park, { p: [0, BD.gasY, 0] }));
    out.push(part(G.box(0.0104, 0.0014, 0.0014), m.recess, { p: [0, BD.gasY, rz + 0.0156] }));
    // three port index marks on the regulator ring
    for (const d of [-40, 0, 40]) {
      const r = (d * Math.PI) / 180;
      out.push(part(G.box(0.0012, 0.0006, 0.004), m.bright, { p: [Math.sin(r) * 0.0097, BD.gasY + Math.cos(r) * 0.0097, rz + 0.0055], r: [0, 0, -d] }));
    }
  }

  // ---------------- hand guard (walnut): deep, flat sides, finger groove each side, heat shield on top
  {
    const zs = stations(BD.hgRear, BD.hgFront, (z) => (z < 0.59 || z > 0.765 ? 0.0025 : 0.008));
    const hg = BHG.loft(zs, hi ? 96 : 56, 50);
    const gz0 = 0.604, gz1 = 0.758, gy = -0.0532, gh = 0.0074, gd = 0.0024;
    warp(hg, (p) => {
      const ax = Math.abs(p.x);
      if (ax < 0.012) return;
      const fz = smoothstep(gz0, gz0 + 0.012, p.z) * (1 - smoothstep(gz1 - 0.012, gz1, p.z));
      const u = (p.y - gy) / gh;
      if (Math.abs(u) >= 1 || fz <= 0) return;
      const d = gd * fz * (0.5 + 0.5 * Math.cos(Math.PI * u));
      p.x = Math.sign(p.x) * (ax - d);
    });
    out.push(part(hg, m.walnutHg));
    const sh = BHG.shell(BD.hgRear + 0.003, BD.hgFront - 0.012, () => Math.PI / 2 - 0.95, () => Math.PI / 2 + 0.95, 0.0011, 0.0003, 14, 12);
    out.push(part(sh, m.parkDark));
    // shield rivets
    for (const sx of [1, -1]) {
      for (const z of [0.592, 0.765]) {
        const s = BHG.surf(z, sx > 0 ? 0.62 : Math.PI - 0.62, 0.0009);
        const r = part(new THREE.SphereGeometry(0.0015, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), m.parkDark, { s: [1, 0.45, 1] });
        r.position.copy(s.p);
        r.quaternion.setFromUnitVectors(V(0, 1, 0), s.n);
        out.push(r);
      }
    }
    // through bolt with a round head on the right and a slotted nut on the left
    const bz = 0.684, by = -0.0355;
    for (const sx of [1, -1]) {
      const x = sx * BHG.sideX(bz, by);
      out.push(part(cylX(0.0052, 0.0016, 22), m.parkDark, { p: [x + sx * 0.0004, by, bz] }));
      out.push(part(latheZ([[0.0044, -0.0001], [0.0044, 0.0008], [0.0034, 0.0022], [0, 0.0026]], 20, 40).rotateY((sx * Math.PI) / 2), m.parkDark, { p: [x + sx * 0.0012, by, bz] }));
      if (sx > 0) out.push(part(G.box(0.0006, 0.0072, 0.0012), m.recess, { p: [x + 0.0037, by, bz] }));
    }
  }

  // ---------------- front sling swivel band on the gas cylinder tube
  {
    const z = BD.frontSwivelZ;
    out.push(part(latheZ([[BD.gasR, z - 0.0055], [BD.gasR + 0.0019, z - 0.0055], [BD.gasR + 0.0024, z - 0.004], [BD.gasR + 0.0024, z + 0.004], [BD.gasR + 0.0019, z + 0.0055], [BD.gasR, z + 0.0055]], 28, 35), m.parkDark, { p: [0, BD.gasY, 0] }));
    const lug: V2[] = [[z - 0.0055, BD.gasY - BD.gasR], [z + 0.0055, BD.gasY - BD.gasR], [z + 0.004, BD.gasY - BD.gasR - 0.0095], [z - 0.004, BD.gasY - BD.gasR - 0.0095]];
    out.push(part(plateZY(lug, 0.0074, [], 0.0007), m.parkDark));
  }

  // ---------------- front sight with hood (sheet-steel hood with a light port in each side)
  {
    const fz = BD.frontSightZ;
    const br = barrelR(fz);
    out.push(part(latheZ([[br, fz - 0.0085], [br + 0.0022, fz - 0.008], [br + 0.0024, fz - 0.0065], [br + 0.0024, fz + 0.0065], [br + 0.0022, fz + 0.008], [br, fz + 0.0085]], 36, 35), m.park));
    const baseY = br + 0.0035;
    const Ro = 0.0114, t = 0.0009, yc = 0.0322, yb = baseY - 0.001, hl = 0.0148;
    {
      // saddle block on the band: flat top, sides flush with the hood, bottom following the band
      const rb = br + 0.0018;
      const sad: V2[] = [[Ro, baseY + 0.0033], [-Ro, baseY + 0.0033]];
      const a0 = Math.acos(Ro / rb);
      for (let i = 0; i <= 16; i++) {
        const a = Math.PI - a0 - ((Math.PI - 2 * a0) * i) / 16;
        sad.push([rb * Math.cos(a), rb * Math.sin(a)]);
      }
      out.push(part(extrudeZ(sad, [], fz - 0.0082, fz + 0.0082, 0.0007, 4), m.park));
    }
    // dovetail with the blade
    out.push(part(G.rbox(0.0082, 0.0026, 0.009, 0.0005, 1), m.parkDark, { p: [0, baseY + 0.0042, fz] }));
    const blade: V2[] = [[fz - 0.0036, baseY + 0.005], [fz + 0.0036, baseY + 0.005], [fz + 0.0022, 0.031], [fz + 0.0008, BD.sightY], [fz - 0.0008, BD.sightY], [fz - 0.0022, 0.031]];
    out.push(part(plateZY(blade, 0.0019, [], 0.0003), m.park));
    // hood: two side walls (with ports) and a round top
    const side: V2[] = [[fz - hl / 2, yb], [fz + hl / 2, yb], [fz + hl / 2, yc], [fz - hl / 2, yc]];
    const port = circle2D(0.0034, 18, fz, (yb + yc) / 2 + 0.0035);
    for (const sx of [1, -1]) out.push(part(plateZY(side, t, [port], 0.0002), m.parkDark, { p: [sx * (Ro - t / 2), 0, 0] }));
    const arch: V2[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = (Math.PI * i) / 20;
      arch.push([Ro * Math.cos(a), yc + Ro * Math.sin(a)]);
    }
    for (let i = 20; i >= 0; i--) {
      const a = (Math.PI * i) / 20;
      arch.push([(Ro - t) * Math.cos(a), yc + (Ro - t) * Math.sin(a)]);
    }
    out.push(part(extrudeZ(arch, [], fz - hl / 2, fz + hl / 2, 0.0002, 6), m.parkDark));
    // clip rivets holding the hood to the saddle
    for (const sx of [1, -1]) out.push(part(cylX(0.0014, 0.0008, 10), m.parkDark, { p: [sx * (Ro + 0.0002), yb + 0.0022, fz] }));
  }

  // ---------------- tubular flash hider with the inner cone
  {
    const fh: V2[] = [
      [0.0094, BD.muzzleZ - 0.001],
      [0.0131, BD.muzzleZ - 0.001],
      [0.0136, BD.muzzleZ + 0.002],
      [0.0136, BD.fhFront - 0.011],
      [0.0145, BD.fhFront - 0.0025],
      [0.0143, BD.fhFront],
      [0.0125, BD.fhFront],
      [0.0115, BD.fhFront - 0.01],
      [0.0068, BD.muzzleZ + 0.012],
      [0.0048, BD.muzzleZ + 0.004],
      [0, BD.muzzleZ + 0.004],
    ];
    out.push(part(latheZ(fh, hi ? 44 : 24, 35), m.park));
    out.push(part(cylZ(0.0047, 0.0006, 16), m.recess, { p: [0, 0, BD.muzzleZ + 0.0046] }));
    // wrench flats near the rear of the hider
    for (const sx of [1, -1]) out.push(part(G.box(0.0008, 0.0062, 0.011), m.parkDark, { p: [sx * 0.0134, 0, BD.muzzleZ + 0.013] }));
  }

  // ---------------- rear sight: base, protective ears, raised leaf + slide, windage knob (right)
  {
    const y0 = BD.rcvTopRear;
    const z0 = BD.slopeZ1 + 0.001, z1 = 0.398;
    out.push(part(G.rbox(0.0232, 0.0036, z1 - z0, 0.0012, 2), m.park, { p: [0, y0 + 0.0016, (z0 + z1) / 2] }));
    // windage yoke carrying the leaf (sits on the base between the ears)
    out.push(part(G.rbox(0.0168, 0.0042, 0.024, 0.001, 2), m.parkDark, { p: [0, y0 + 0.0052, BD.rearSightZ + 0.004] }));
    const ear: V2[] = [[z0, y0 + 0.0028], [z1 - 0.002, y0 + 0.0028], [z1, y0 + 0.0052], [0.377, y0 + 0.0102], [0.36, y0 + 0.0178], [0.347, y0 + 0.0208], [z0 + 0.002, y0 + 0.0208], [z0, y0 + 0.018]];
    for (const sx of [1, -1]) out.push(part(plateZY(ear, 0.0024, [], 0.0006), m.park, { p: [sx * 0.0105, 0, 0] }));
    // leaf (raised) with the slide and aperture on the line of sight
    const rz = BD.rearSightZ;
    const leaf: V2[] = [[0.0056, y0 + 0.0068], [0.0056, BD.sightY + 0.0066], [0.0044, BD.sightY + 0.0078], [-0.0044, BD.sightY + 0.0078], [-0.0056, BD.sightY + 0.0066], [-0.0056, y0 + 0.0068]];
    const win = roundRect(0, (BD.sightY + y0) / 2 + 0.0035, 0.0048, BD.sightY - y0 - 0.004, 0.0015, 3);
    out.push(part(extrudeZ(leaf, [win], rz - 0.0011, rz + 0.0011, 0.0003, 4), m.park));
    // graduation lines on the leaf
    if (hi) for (let i = 0; i < 5; i++) out.push(part(G.box(0.0022, 0.0003, 0.0003), m.bright, { p: [0.0044, y0 + 0.011 + i * 0.0038, rz + 0.0012] }));
    const slide = roundRect(0, BD.sightY, 0.0122, 0.0076, 0.0015, 3);
    out.push(part(extrudeZ(slide, [circle2D(0.0009, 14, 0, BD.sightY)], rz - 0.0028, rz + 0.0028, 0.0005, 4), m.parkDark));
    out.push(part(cylX(0.0016, 0.0036, 10), m.parkDark, { p: [0.0079, BD.sightY, rz] }));
    // leaf hinge pin across the yoke
    out.push(part(cylX(0.0018, 0.0182, 12), m.bright, { p: [0, y0 + 0.0066, rz] }));
    // windage knob on the right side at the rear, windage index on the rear face
    const wk = knurledKnob(0.0056, 0.0042, hi ? 18 : 10, 0.0003, 0.0004);
    wk.rotateZ(Math.PI / 2);
    out.push(part(wk, m.park, { p: [-0.0118, y0 + 0.0048, z0 + 0.0072] }));
    out.push(part(cylX(0.0016, 0.0018, 10), m.bright, { p: [-0.0162, y0 + 0.0048, z0 + 0.0072] }));
    if (hi) for (let i = -2; i <= 2; i++) out.push(part(G.box(0.0003, 0.0018, 0.0003), m.bright, { p: [i * 0.0022, y0 + 0.0048, z0 - 0.0002] }));
  }

  // ---------------- butt stock, butt plate with hinged shoulder rest (folded), rear swivel base
  {
    const zs = stations(BSTOCK.z0, BSTOCK.z1, (z) => (z > 0.2 ? 0.006 : z < 0.03 ? 0.008 : 0.018));
    out.push(part(BSTOCK.loft(zs, hi ? 80 : 50, 50), m.walnut));
    const bz = BSTOCK.z0;
    const rim = G.loftZ(
      [
        { z: bz + 0.005, ring: BSTOCK.ringAt(bz + 0.005, 80, 0.0002) },
        { z: bz + 0.004, ring: BSTOCK.ringAt(bz + 0.004, 80, 0.0011) },
        { z: bz - 0.0008, ring: BSTOCK.ringAt(bz, 80, 0.0012) },
        { z: bz - 0.003, ring: BSTOCK.ringAt(bz, 80, 0.0003) },
        { z: bz - 0.0038, ring: BSTOCK.ringAt(bz, 80, -0.0016) },
      ],
      true,
      45,
    );
    out.push(part(rim, m.park));
    // the plate itself (solid face over the whole butt end)
    out.push(part(extrudeZ(BSTOCK.ringAt(bz, 80, -0.0006), [], bz - 0.0036, bz + 0.0006, 0.0004, 4), m.park));
    const s0 = BSTOCK.at(bz);
    // hinged shoulder rest folded down over the upper half of the butt plate, hinge at the heel
    const hy = s0.yTop - 0.0035;
    const rl = 0.05;
    const rest: V2[] = [[0.0162, hy], [0.0162, hy - rl + 0.006], [0.0115, hy - rl], [-0.0115, hy - rl], [-0.0162, hy - rl + 0.006], [-0.0162, hy]];
    out.push(part(extrudeZ(rest, [], bz - 0.0064, bz - 0.0036, 0.0006, 4), m.park));
    // pressed rib down the rest and the thumb lip at its lower end
    out.push(part(G.rbox(0.008, rl - 0.016, 0.0009, 0.0003, 1), m.park, { p: [0, hy - rl / 2 + 0.002, bz - 0.0066] }));
    out.push(part(G.rbox(0.014, 0.0024, 0.0018, 0.0006, 1), m.parkDark, { p: [0, hy - rl + 0.0012, bz - 0.0072] }));
    // hinge knuckle and pin at the heel, hinge ears on the butt plate
    out.push(part(cylX(0.0029, 0.0302, 18), m.park, { p: [0, hy + 0.0008, bz - 0.0046] }));
    out.push(part(cylX(0.0013, 0.0402, 10), m.bright, { p: [0, hy + 0.0008, bz - 0.0046] }));
    for (const sx of [1, -1]) out.push(part(G.rbox(0.0034, 0.0094, 0.0066, 0.001, 2), m.park, { p: [sx * 0.0186, hy - 0.001, bz - 0.0026] }));
    // butt plate screw below the rest
    const [h, sl] = screwParts(0.0035, 0.0011, 0);
    const p = V(0, s0.yTop + (s0.yBot - s0.yTop) * 0.8, bz - 0.0036);
    out.push(part(placeAlong(h, p, V(0, 0, -1)), m.park), part(placeAlong(sl, p, V(0, 0, -1), 70), m.recess));
    // rear swivel base plate + lug
    const s = BSWIVELS.rear;
    out.push(part(BSTOCK.shell(s.pin.z - 0.012, s.pin.z + 0.02, () => (3 * Math.PI) / 2 - 0.3, () => (3 * Math.PI) / 2 + 0.3, 0.0017, 0.0004, 6, 6), m.park));
    const yb = BSTOCK.at(s.pin.z).yBot;
    const lug: V2[] = [[s.pin.z - 0.0055, yb + 0.002], [s.pin.z + 0.0065, yb + 0.004], [s.pin.z + 0.004, yb - 0.0092], [s.pin.z - 0.004, yb - 0.0092]];
    out.push(part(plateZY(lug, 0.0074, [], 0.0007), m.park));
    for (const [dz, spin] of [[-0.008, 30], [0.015, 80]] as const) {
      const zz = s.pin.z + dz;
      screw(V(0, BSTOCK.at(zz).yBot - 0.0016, zz), V(0, -1, 0), spin, 0.8);
    }
  }

  // ---------------- sling swivel pins and loops
  for (const s of [BSWIVELS.front, BSWIVELS.rear]) {
    out.push(part(cylX(0.0016, 0.0098, 10), m.blued, { p: s.pin.toArray() as [number, number, number] }));
    for (const sx of [1, -1]) out.push(part(cylX(0.0025, 0.0008, 12), m.blued, { p: [sx * 0.0051, s.pin.y, s.pin.z] }));
    out.push(swivelLoop(s.pin, s.dir, BSWIVELS.innerW, s.reach, BSWIVELS.wire, m.park).mesh);
  }
  return out;
}
