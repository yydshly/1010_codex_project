/**
 * Willys MB interior: driver's seat over the fuel-tank housing and passenger's seat over the
 * tool compartment (pressed-steel boxes, canvas-covered cushions, tubular back frames with
 * canvas back cushions), rear bench on a pan across the wheel housings, three-spoke steering
 * wheel on the 45-degree column with its dash bracket, instrument cluster (speedometer with
 * fuel, ammeter, oil and temperature gauges), switches, data plates, hand-brake T-handle,
 * clutch / brake / accelerator pedals, gear lever and the two transfer-case levers.
 */
import { THREE, G, part, group, decal } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V3, merge, xf, box, bentRod, cylZ, frontSlab, sideSlab, flatSlab, rect, cushionGeo, frame } from './util';

type Geo = THREE.BufferGeometry;

/* ------------------------------------------------------------------ seats */

const SEAT_TOP = 0.755; // top of the seat boxes
const SEAT_Z0 = -0.02, SEAT_Z1 = -0.46;

function frontSeat(xc: number, paint: Geo[], cloth: Geo[], steel: Geo[]) {
  const w = 0.42;
  const x0 = xc - w / 2, x1 = xc + w / 2;
  const t = D.t;
  // pressed-steel box (fuel tank housing / tool compartment)
  paint.push(frontSlab(rect(x0, D.floorY, x1, SEAT_TOP), t, SEAT_Z0));
  paint.push(frontSlab(rect(x0, D.floorY, x1, SEAT_TOP), t, SEAT_Z1));
  paint.push(sideSlab(rect(SEAT_Z1, D.floorY, SEAT_Z0, SEAT_TOP), t, x0));
  paint.push(sideSlab(rect(SEAT_Z1, D.floorY, SEAT_Z0, SEAT_TOP), t, x1));
  paint.push(flatSlab(rect(x0, SEAT_Z1, x1, SEAT_Z0), t, SEAT_TOP));
  // rolled front edge of the box top and a pressed rib on its face
  paint.push(xf(G.cyl(0.006, 0.006, w, 8), [xc, SEAT_TOP - 0.004, SEAT_Z0 + 0.002], [0, 0, 90]));
  paint.push(box(w - 0.08, 0.012, 0.005, [xc, (D.floorY + SEAT_TOP) / 2, SEAT_Z0 + 0.003], 0.003));
  // cushion (canvas duck over springs) with a sat-in hollow
  const cu = cushionGeo(0.44, 0.085, 0.43, { r: 0.03, crown: 0.012, sag: 0.008, border: 0.035 });
  cloth.push(xf(cu, [xc, SEAT_TOP + 0.043, (SEAT_Z0 + SEAT_Z1) / 2 - 0.005], [-2, 0, 0]));
  // back: tubular frame + canvas cushion, reclined 10 deg
  const tilt = G.deg(10);
  const up = new THREE.Vector3(0, Math.cos(tilt), -Math.sin(tilt));
  const n = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt));
  const B0 = new THREE.Vector3(xc, SEAT_TOP + 0.03, SEAT_Z1 + 0.02);
  const at = (s: number, h: number, dx = 0) => B0.clone().addScaledVector(up, s).addScaledVector(n, h).add(new THREE.Vector3(dx, 0, 0));
  const bc = cushionGeo(0.41, 0.06, 0.33, { r: 0.025, crown: 0.01, border: 0.03 });
  const m = frame(at(0.235, 0.0), [1, 0, 0], n);
  bc.applyMatrix4(m);
  cloth.push(bc);
  const fr = (s: number) => at(s, -0.042);
  const L = 0.42;
  for (const sx of [1, -1]) {
    const p0 = fr(-0.03).add(new THREE.Vector3(sx * 0.2, 0, 0));
    const p1 = fr(L - 0.03).add(new THREE.Vector3(sx * 0.2, 0, 0));
    steel.push(bentRod([[p0.x, p0.y, p0.z], [p1.x, p1.y, p1.z], [xc + sx * 0.12, p1.y + 0.02, p1.z - 0.003]], 0.011, 0.04));
    // pivot bracket on the side of the box
    paint.push(box(0.006, 0.06, 0.05, [xc + sx * (w / 2 + 0.004), SEAT_TOP - 0.02, SEAT_Z1 + 0.03], 0.002));
  }
  const tA = fr(L - 0.03), tB = fr(0.04);
  steel.push(G.rod([xc - 0.12, tA.y + 0.02, tA.z - 0.003], [xc + 0.12, tA.y + 0.02, tA.z - 0.003], 0.011, 10));
  steel.push(G.rod([xc - 0.2, tB.y, tB.z], [xc + 0.2, tB.y, tB.z], 0.009, 10));
}

function rearSeat(paint: Geo[], cloth: Geo[], steel: Geo[]) {
  const t = D.t;
  const zf = -0.93, zb = D.zRear + t;
  const yPan = 0.795;
  // riser between the wheel housings, pan across them
  paint.push(frontSlab(rect(-0.505, D.floorY, 0.505, yPan), t, zf));
  paint.push(flatSlab(rect(-0.64, zb, 0.64, zf), t, yPan));
  paint.push(xf(G.cyl(0.006, 0.006, 1.28, 8), [0, yPan - 0.004, zf + 0.002], [0, 0, 90]));
  // support angles on the rear panel
  for (const x of [-0.45, 0, 0.45]) paint.push(box(0.04, 0.05, 0.03, [x, yPan - 0.028, zb + 0.015], 0.003));
  const cu = cushionGeo(1.2, 0.085, 0.44, { r: 0.03, crown: 0.012, sag: 0.004, border: 0.035 });
  cloth.push(xf(cu, [0, yPan + 0.045, -1.17], [-2, 0, 0]));
  // back cushion leaning on the rear panel
  const bc = cushionGeo(1.14, 0.055, 0.145, { r: 0.022, crown: 0.006, border: 0.025 });
  const n = new THREE.Vector3(0, Math.sin(G.deg(8)), Math.cos(G.deg(8)));
  bc.applyMatrix4(frame([0, yPan + 0.12, zb + 0.032], [1, 0, 0], n));
  cloth.push(bc);
  // hand crank hung from a clamp on the inside of the rear panel (TM: tool locations)
  steel.push(bentRod([[0.62, 0.9, zb + 0.02], [0.62, 0.66, zb + 0.02], [0.62, 0.66, zb + 0.13]], 0.009, 0.02));
  paint.push(box(0.03, 0.03, 0.02, [0.62, 0.9, zb + 0.01], 0.003));
}

/* ------------------------------------------------------------------ steering */

export const STEER = { c: new THREE.Vector3(0.36, 1.12, 0.195), ang: 45 };

function steering(bake: Geo[], black: Geo[], paint: Geo[], steel: Geo[]) {
  const c = STEER.c;
  const a = G.deg(STEER.ang);
  const d = new THREE.Vector3(0, -Math.sin(a), Math.cos(a)); // column, down and forward
  const yv = new THREE.Vector3(0, Math.cos(a), Math.sin(a)); // wheel plane "up"
  const m = frame(c, [1, 0, 0], yv); // local Z = d
  const R = 0.219;
  const loc: Geo[] = [];
  const rim = G.torus(R, 0.0125, 12, 72);
  loc.push(rim);
  // three spokes (3, 9 and 6 o'clock), flat section, dished towards the column
  for (const ang of [0, 180, 270]) {
    const r = G.deg(ang);
    const p0: V3 = [Math.cos(r) * 0.035, Math.sin(r) * 0.035, 0.035];
    const p1: V3 = [Math.cos(r) * (R - 0.008), Math.sin(r) * (R - 0.008), 0.0];
    const sp = G.rod(p0, p1, 0.0065, 8);
    sp.scale(1, 1, 1);
    loc.push(sp);
  }
  bake.push(...loc.map((g) => g.applyMatrix4(m)));
  // hub + horn button
  const hub = merge([cylZ(0.04, 0.05, [0, 0, 0.04], 24), cylZ(0.028, 0.012, [0, 0, 0.012], 20)]);
  bake.push(hub.applyMatrix4(m));
  steel.push(cylZ(0.02, 0.006, [0, 0, 0.004], 18).applyMatrix4(m));
  // column from the hub, below the instrument panel and through the toe board
  const end = c.clone().addScaledVector(d, 0.66);
  black.push(G.rod(c.clone().addScaledVector(d, 0.065), end, 0.019, 14));
  black.push(G.rod(c.clone().addScaledVector(d, 0.065), c.clone().addScaledVector(d, 0.2), 0.024, 14));
  // column bracket under the instrument panel
  const zb = D.zDash - 0.01;
  const sb = (zb - c.z) / d.z;
  const pb = c.clone().addScaledVector(d, sb);
  paint.push(box(0.07, D.dashBot - pb.y + 0.01, 0.012, [pb.x, (D.dashBot + pb.y) / 2, zb], 0.002));
  paint.push(xf(G.torus(0.022, 0.005, 6, 20), [pb.x, pb.y, pb.z], [STEER.ang - 90, 0, 0]));
  // floor seal plate where the column passes the toe board
  const tb = c.clone().addScaledVector(d, 0.52);
  paint.push(xf(G.cyl(0.04, 0.04, 0.006, 18), [tb.x, tb.y + 0.004, tb.z], [-37, 0, 0]));
}

/* ------------------------------------------------------------------ dash */

function dialDraw(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#141412';
  ctx.fillRect(0, 0, w, h);
  const dial = (cx: number, cy: number, r: number, ticks: number, sweep: number, needle: number) => {
    ctx.fillStyle = '#1b1b19';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9d3c0';
    ctx.lineWidth = Math.max(1, r * 0.04);
    const a0 = Math.PI * 0.5 + (Math.PI * 2 - sweep) / 2;
    for (let i = 0; i <= ticks; i++) {
      const a = a0 + (sweep * i) / ticks;
      const r0 = i % 2 === 0 ? r * 0.72 : r * 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 0.9);
      ctx.stroke();
    }
    ctx.strokeStyle = '#e8e2cf';
    ctx.lineWidth = Math.max(1.5, r * 0.06);
    const an = a0 + sweep * needle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(an) * r * 0.66, cy + Math.sin(an) * r * 0.66);
    ctx.stroke();
    ctx.fillStyle = '#2b2b28';
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
  };
  // layout mirrors DASH (decal spans x 0.03..0.37, y 0.868..0.962 in the asset)
  const sx = w / 0.34, sy = h / 0.094;
  const P2 = (x: number, y: number): [number, number] => [(0.37 - x) * sx, (0.962 - y) * sy];
  const [scx, scy] = P2(DASH.speedo[0], DASH.speedo[1]);
  dial(scx, scy, DASH.speedo[2] * sx * 0.92, 12, Math.PI * 1.5, 0.02);
  ctx.fillStyle = '#d9d3c0';
  ctx.font = `${Math.round(DASH.speedo[2] * sx * 0.22)}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('MPH', scx, scy + DASH.speedo[2] * sx * 0.45);
  for (const [x, y, r] of DASH.small) {
    const [cx, cy] = P2(x, y);
    dial(cx, cy, r * sx * 0.9, 4, Math.PI * 0.9, 0.5);
  }
}

const DASH = {
  speedo: [0.2, 0.915, 0.042] as [number, number, number],
  small: [
    [0.085, 0.938, 0.02],
    [0.085, 0.892, 0.02],
    [0.315, 0.938, 0.02],
    [0.315, 0.892, 0.02],
  ] as [number, number, number][],
};

function dash(paint: Geo[], black: Geo[], steel: Geo[], bake: Geo[], glass: Geo[]): THREE.Object3D[] {
  const zf = D.zDash; // cockpit face of the panel
  // cluster plate
  paint.push(box(0.35, 0.098, 0.004, [0.2, 0.915, zf - 0.002], 0.003));
  const bezel = (x: number, y: number, r: number) => {
    const g = G.lathe([[r * 0.86, 0], [r * 1.14, 0], [r * 1.16, 0.004], [r * 1.04, 0.009], [r * 0.92, 0.01], [r * 0.88, 0.006]], 32, 40);
    g.rotateX(-Math.PI / 2);
    g.translate(x, y, zf - 0.004);
    steel.push(g);
    glass.push(cylZ(r * 0.9, 0.002, [x, y, zf - 0.0085], 32));
  };
  bezel(DASH.speedo[0], DASH.speedo[1], DASH.speedo[2]);
  for (const [x, y, r] of DASH.small) bezel(x, y, r);
  const decals = [decal('willys-dash-dials', 0.34, 0.094, dialDraw, { p: [0.2, 0.915, zf - 0.0045], r: [0, 180, 0] }, 512)];
  // switches: light switch, ignition, choke, throttle, panel light
  const knob = (x: number, y: number, r = 0.011, len = 0.02) => {
    steel.push(cylZ(r * 0.45, len * 0.6, [x, y, zf - (len * 0.6) / 2], 10));
    bake.push(xf(G.lathe([[0, 0], [r, 0], [r, len * 0.6], [r * 0.8, len], [0, len]], 16, 40), [x, y, zf - len * 0.6 - 0.002], [-90, 0, 0]));
  };
  knob(0.45, 0.9);
  knob(0.52, 0.9, 0.009);
  knob(-0.05, 0.875, 0.009, 0.03);
  knob(-0.12, 0.875, 0.009, 0.03);
  // ignition switch with lever
  steel.push(cylZ(0.016, 0.01, [-0.02, 0.935, zf - 0.005], 18));
  bake.push(box(0.008, 0.026, 0.01, [-0.02, 0.935, zf - 0.014], 0.003));
  // data plates (caution / shift / name plates), plain with raised borders
  for (const [x, y, w, h] of [[-0.1, 0.937, 0.075, 0.042], [-0.1, 0.892, 0.075, 0.03], [0.585, 0.925, 0.07, 0.05]] as [number, number, number, number][]) {
    black.push(box(w, h, 0.002, [x, y, zf - 0.0015], 0.001));
    steel.push(box(w + 0.006, h + 0.006, 0.0012, [x, y, zf - 0.0008], 0.0005));
    const rv: { p: V3; n: V3 }[] = [];
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) rv.push({ p: [x + dx * (w / 2 - 0.005), y + dy * (h / 2 - 0.005), zf - 0.003], n: [0, 0, -1] });
    steel.push(G.scatter(G.rivetHead(0.0022), rv));
  }
  // hand-brake T-handle under the centre of the panel
  steel.push(G.rod([0.0, D.dashBot - 0.015, zf + 0.02], [0.0, D.dashBot - 0.015, zf - 0.07], 0.006, 10));
  bake.push(xf(G.cyl(0.011, 0.011, 0.1, 14), [0, D.dashBot - 0.015, zf - 0.075], [0, 0, 90]));
  paint.push(box(0.05, 0.03, 0.03, [0.0, D.dashBot - 0.012, zf + 0.02], 0.004));
  return decals;
}

/* ------------------------------------------------------------------ pedals & levers */

function controls(bake: Geo[], black: Geo[], steel: Geo[], rubber: Geo[]) {
  // toe board plane: y = floorY + (z - 0.395) * slope
  const slope = (0.81 - D.floorY) / (0.643 - 0.395);
  const tbY = (z: number) => D.floorY + (z - 0.395) * slope;
  for (const x of [0.46, 0.3]) {
    const z0 = 0.54;
    black.push(bentRod([[x, tbY(z0) - 0.01, z0], [x, tbY(z0) + 0.03, z0 - 0.035], [x, tbY(z0) + 0.06, z0 - 0.05]], 0.009, 0.02));
    // ribbed pedal pad
    black.push(box(0.07, 0.01, 0.05, [x, tbY(z0) + 0.066, z0 - 0.052], 0.003, [-55, 0, 0]));
    for (let k = -1; k <= 1; k++) black.push(box(0.064, 0.004, 0.005, [x, tbY(z0) + 0.071 + k * 0.012 * 0.57, z0 - 0.049 - k * 0.012 * 0.82], 0.0015, [-55, 0, 0]));
    rubber.push(xf(G.cyl(0.02, 0.028, 0.02, 14), [x, tbY(z0) + 0.003, z0], [-37, 0, 0]));
  }
  // accelerator pedal hinged on the toe board, starter button to its right
  black.push(box(0.045, 0.008, 0.1, [0.19, tbY(0.5) + 0.016, 0.5], 0.003, [-37, 0, 0]));
  steel.push(xf(G.cyl(0.007, 0.007, 0.02, 10), [0.19, tbY(0.455) + 0.01, 0.455], [0, 0, 90]));
  bake.push(xf(G.cyl(0.013, 0.013, 0.022, 14), [0.1, tbY(0.47) + 0.011, 0.47], [-37, 0, 0]));
  // dimmer switch left of the clutch
  steel.push(xf(G.cyl(0.012, 0.016, 0.02, 14), [0.58, tbY(0.47) + 0.01, 0.47], [-37, 0, 0]));
  // gear lever and the two transfer-case levers through the tunnel, with rubber boots
  const tunY = D.floorY + 0.098;
  const levers: [V3, V3, number][] = [
    [[0.0, tunY, 0.43], [0.02, 1.02, 0.31], 0.021],
    [[-0.085, tunY, 0.27], [-0.1, 0.93, 0.2], 0.017],
    [[-0.13, tunY, 0.27], [-0.155, 0.92, 0.21], 0.017],
  ];
  for (const [a, b, kr] of levers) {
    black.push(bentRod([a, [a[0], a[1] + 0.1, a[2] - 0.015], b], 0.0075, 0.06));
    const k = new THREE.SphereGeometry(kr, 16, 12);
    k.translate(b[0], b[1], b[2]);
    bake.push(k);
    rubber.push(xf(G.cyl(0.012, 0.034, 0.045, 14), [a[0], a[1] + 0.02, a[2]]));
  }
}

export function buildInterior(): THREE.Object3D {
  const paint: Geo[] = [];
  const cloth: Geo[] = [];
  const steel: Geo[] = [];
  const black: Geo[] = [];
  const bake: Geo[] = [];
  const glass: Geo[] = [];
  const rubber: Geo[] = [];
  frontSeat(0.35, paint, cloth, steel);
  frontSeat(-0.35, paint, cloth, steel);
  rearSeat(paint, cloth, steel);
  steering(bake, black, paint, steel);
  const decals = dash(paint, black, steel, bake, glass);
  controls(bake, black, steel, rubber);
  return group([
    part(merge(paint), P.body()),
    part(merge(cloth), P.seat()),
    part(merge(steel), P.steel()),
    part(merge(black), P.black()),
    part(merge(bake), P.bakelite()),
    part(merge(glass), P.gaugeGlass()),
    part(merge(rubber), P.rubber()),
    ...decals,
  ]);
}
