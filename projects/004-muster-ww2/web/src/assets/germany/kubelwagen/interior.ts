/**
 * Open cockpit of the Type 82: two separate front seats on tubular frames, rear bench over the
 * equipment space, loose wooden floor gratings, central tunnel with gear lever, parking-brake
 * lever and choke, floor-hinged pedals, steering column and three-spoke wheel, and the
 * instrument panel below the windscreen. Control layout after TM E9-803 section IV
 * (speedometer centre, warning lights left, switches right, fuse boxes at each end).
 */
import { THREE, G, part, group, decal } from '../../../core/kit';
import { D } from './dims';
import { P } from './palette';
import { type V3, merge } from './util';

const HW = D.halfW;
const FLOOR = D.floorTop;

// ------------------------------------------------------------------ upholstery
/**
 * Upholstered cushion: rounded slab (w along X, h thickness along Y, d along Z) with a
 * crowned top and pleats (channels along Z) on the +Y face, border left flat.
 */
export function cushionGeo(
  w: number,
  h: number,
  d: number,
  o: { r?: number; crown?: number; pitch?: number; pleat?: number; border?: number; seg?: number } = {},
): THREE.BufferGeometry {
  const seg = o.seg ?? 0.011;
  const sx = Math.max(8, Math.round(w / seg)), sz = Math.max(8, Math.round(d / seg)), sy = 4;
  const src = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
  src.deleteAttribute('uv');
  src.deleteAttribute('normal');
  const g = G.mergeVertices(src, 1e-6);
  const r = Math.min(o.r ?? 0.03, h * 0.49);
  const hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3(), c = new THREE.Vector3();
  const pitch = o.pitch ?? 0.07, pleat = o.pleat ?? 0.006, border = o.border ?? 0.045, crown = o.crown ?? 0.012;
  const nP = Math.max(1, Math.round((w - 2 * border) / pitch));
  const pw = (w - 2 * border) / nP;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(THREE.MathUtils.clamp(v.x, -hw, hw), THREE.MathUtils.clamp(v.y, -hh, hh), THREE.MathUtils.clamp(v.z, -hd, hd));
    const dl = v.clone().sub(c);
    if (dl.lengthSq() > 1e-14) dl.normalize().multiplyScalar(r);
    v.copy(c).add(dl);
    const top = THREE.MathUtils.clamp(v.y / (h / 2), 0, 1) ** 3;
    if (top > 0) {
      const ux = v.x / (w / 2), uz = v.z / (d / 2);
      v.y += crown * Math.max(0, 1 - ux * ux) * Math.max(0, 1 - uz * uz) * top;
      const ex = THREE.MathUtils.clamp((w / 2 - border - Math.abs(v.x)) / 0.02 + 1, 0, 1);
      const ez = THREE.MathUtils.clamp((d / 2 - border * 0.8 - Math.abs(v.z)) / 0.02 + 1, 0, 1);
      const ph = (v.x + w / 2 - border) / pw;
      const roll = Math.abs(Math.sin(Math.PI * ph)) ** 0.55;
      v.y -= pleat * (1 - roll) * ex * ez * top;
      // border seam: a soft groove just inside the edge
      const bx = Math.abs(Math.abs(v.x) - (w / 2 - border)), bz = Math.abs(Math.abs(v.z) - (d / 2 - border * 0.8));
      const seam = Math.max(Math.exp(-((bx / 0.006) ** 2)) * ez, Math.exp(-((bz / 0.006) ** 2)) * ex);
      v.y -= pleat * 0.7 * seam * top;
    }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Welt (piping) along the top edge of a cushion built by cushionGeo. */
function weltGeo(w: number, h: number, d: number, r: number): THREE.BufferGeometry {
  const x = w / 2 - r * 0.32, z = d / 2 - r * 0.32, y = h / 2 - r * 0.32;
  const q = 0.03;
  const pts: V3[] = [
    [x - q, y, z],
    [-x + q, y, z],
    [-x, y, z - q],
    [-x, y, -z + q],
    [-x + q, y, -z],
    [x - q, y, -z],
    [x, y, -z + q],
    [x, y, z - q],
  ];
  return G.tube(pts, 0.0048, 6, 160, true);
}

function placeGeo(g: THREE.BufferGeometry, p: V3, rDeg: V3): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(...p),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(G.deg(rDeg[0]), G.deg(rDeg[1]), G.deg(rDeg[2]))),
    new THREE.Vector3(1, 1, 1),
  );
  return g.applyMatrix4(m);
}

function localToWorld(p: V3, rDeg: V3, l: V3): V3 {
  const v = new THREE.Vector3(...l).applyEuler(new THREE.Euler(G.deg(rDeg[0]), G.deg(rDeg[1]), G.deg(rDeg[2])));
  return [v.x + p[0], v.y + p[1], v.z + p[2]];
}

// ------------------------------------------------------------------ seats
function frontSeat(xc: number, cloth: THREE.BufferGeometry[], frame: THREE.BufferGeometry[], steel: THREE.BufferGeometry[]) {
  const cw = 0.44, ch = 0.1, cd = 0.42, cr = 0.032;
  const cp: V3 = [xc, 0.474, 0.31];
  const crr: V3 = [-4, 0, 0];
  cloth.push(placeGeo(cushionGeo(cw, ch, cd, { r: cr, crown: 0.014, pitch: 0.075 }), cp, crr));
  cloth.push(placeGeo(weltGeo(cw, ch, cd, cr), cp, crr));
  // backrest
  const bw = 0.42, bh = 0.075, bd = 0.42, br = 0.028;
  const bp: V3 = [xc, 0.722, 0.078];
  const brr: V3 = [78, 0, 0];
  cloth.push(placeGeo(cushionGeo(bw, bh, bd, { r: br, crown: 0.01, pitch: 0.075 }), bp, brr));
  cloth.push(placeGeo(weltGeo(bw, bh, bd, br), bp, brr));
  // tubular frame under the cushion
  const yF = 0.418, x0 = xc - 0.2, x1 = xc + 0.2, z0 = 0.12, z1 = 0.5;
  frame.push(G.tube([[x0, yF, z0], [x0, yF, z1 - 0.03], [x0 + 0.03, yF, z1], [x1 - 0.03, yF, z1], [x1, yF, z1 - 0.03], [x1, yF, z0 + 0.03], [x1 - 0.03, yF, z0], [x0 + 0.03, yF, z0]], 0.011, 8, 120, true));
  // legs to the floor runners, runners on the grating, clamp brackets
  for (const x of [xc - 0.17, xc + 0.17]) {
    for (const z of [0.16, 0.46]) frame.push(G.rod([x, 0.345, z], [x + Math.sign(x - xc) * 0.03, yF, z + (z < 0.3 ? -0.03 : 0.03)], 0.01, 10));
    steel.push(G.rbox(0.03, 0.012, 0.46, 0.003, 1).translate(x, 0.339, 0.31));
    for (const z of [0.1, 0.52]) steel.push(G.rbox(0.05, 0.016, 0.03, 0.003, 1).translate(x, 0.34, z));
  }
  // backrest frame: inverted U behind the backrest, hinged to the seat frame
  const L = (l: V3) => localToWorld(bp, brr, l);
  const yb = -bh / 2 - 0.012;
  frame.push(
    G.tube(
      [L([0.195, yb, 0.2]), L([0.195, yb, -0.15]), L([0.17, yb, -0.2]), L([0.08, yb, -0.215]), L([-0.08, yb, -0.215]), L([-0.17, yb, -0.2]), L([-0.195, yb, -0.15]), L([-0.195, yb, 0.2])],
      0.011,
      8,
      120,
    ),
  );
  for (const s of [1, -1]) {
    const a = L([s * 0.195, yb, 0.2]);
    frame.push(G.rod(a, [xc + s * 0.2, yF, z0], 0.011, 10));
    steel.push(G.cyl(0.016, 0.016, 0.03, 12).rotateZ(Math.PI / 2).translate(xc + s * 0.2, yF + 0.004, z0 + 0.004));
  }
}

function rearSeat(cloth: THREE.BufferGeometry[], paint: THREE.BufferGeometry[]) {
  const cw = 1.5, ch = 0.11, cd = 0.4, cr = 0.034;
  const cp: V3 = [0, 0.478, -0.575];
  const crr: V3 = [-3, 0, 0];
  cloth.push(placeGeo(cushionGeo(cw, ch, cd, { r: cr, crown: 0.012, pitch: 0.08, seg: 0.013 }), cp, crr));
  cloth.push(placeGeo(weltGeo(cw, ch, cd, cr), cp, crr));
  const bp: V3 = [0, 0.716, -0.712];
  const brr: V3 = [80, 0, 0];
  const bw = 1.5, bh = 0.08, bd = 0.4, br = 0.03;
  cloth.push(placeGeo(cushionGeo(bw, bh, bd, { r: br, crown: 0.01, pitch: 0.08, seg: 0.013 }), bp, brr));
  cloth.push(placeGeo(weltGeo(bw, bh, bd, br), bp, brr));
  // seat base: front panel of the equipment space with a pressed bead, side flanges
  paint.push(G.rbox(2 * (HW - 0.006), 0.125, 0.012, 0.004, 1).translate(0, FLOOR + 0.0625, -0.37));
  paint.push(G.rbox(1.3, 0.012, 0.012, 0.004, 1).translate(0, FLOOR + 0.07, -0.362));
  for (const s of [1, -1]) paint.push(G.rbox(0.03, 0.012, 0.4, 0.003, 1).translate(s * 0.765, 0.42, -0.575));
}

// ------------------------------------------------------------------ floor
function gratings(slats: THREE.BufferGeometry[], battens: THREE.BufferGeometry[]) {
  const panel = (xa: number, xb: number, za: number, zb: number) => {
    const sw = 0.036, gap = 0.0125;
    const n = Math.floor((xb - xa + gap) / (sw + gap));
    const used = n * sw + (n - 1) * gap;
    const x0 = (xa + xb) / 2 - used / 2 + sw / 2;
    for (let i = 0; i < n; i++) slats.push(G.rbox(sw, 0.012, zb - za, 0.003, 1).translate(x0 + i * (sw + gap), FLOOR + 0.021, (za + zb) / 2));
    for (const z of [za + 0.05, (za + zb) / 2, zb - 0.05]) battens.push(G.rbox(xb - xa - 0.01, 0.015, 0.034, 0.003, 1).translate((xa + xb) / 2, FLOOR + 0.0075, z));
  };
  for (const s of [1, -1]) {
    const xa = s > 0 ? 0.115 : -0.765, xb = s > 0 ? 0.765 : -0.115;
    panel(xa, xb, -0.02, 0.845);
    panel(xa, xb, -0.355, -0.06);
  }
}

// ------------------------------------------------------------------ controls
function steering(bake: THREE.BufferGeometry[], paint: THREE.BufferGeometry[], steel: THREE.BufferGeometry[]) {
  const xd = 0.37;
  const hub = new THREE.Vector3(xd, 0.925, 0.575);
  const dir = new THREE.Vector3(0, -0.5, 0.866); // towards the dash
  // column jacket from the dash to the wheel, flange at the dash
  const dashPt = hub.clone().addScaledVector(dir, (0.8 - hub.z) / dir.z);
  paint.push(G.rod(hub.clone().addScaledVector(dir, 0.05), dashPt.clone().addScaledVector(dir, 0.01), 0.021, 16));
  paint.push(G.cyl(0.04, 0.04, 0.006, 20).rotateX(Math.PI / 2).translate(dashPt.x, dashPt.y, 0.797));
  steel.push(G.rod(hub, hub.clone().addScaledVector(dir, 0.05), 0.012, 12));
  // wheel in its own frame: X across, Y up in the wheel plane, Z towards the driver
  const n = dir.clone().negate();
  const e1 = new THREE.Vector3(-1, 0, 0);
  const e2 = n.clone().cross(e1).normalize();
  if (e2.y < 0) e2.negate();
  const m = new THREE.Matrix4().makeBasis(e1, e2, n).setPosition(hub);
  const R = 0.19;
  const wheel: THREE.BufferGeometry[] = [];
  wheel.push(G.torus(R, 0.0115, 12, 96));
  // three spokes (T layout), dished towards the column
  for (const a of [0, Math.PI, -Math.PI / 2]) {
    const c = Math.cos(a), s = Math.sin(a);
    const pts: V3[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const rr = 0.032 + (R - 0.036) * t;
      pts.push([c * rr, s * rr, -0.035 * (1 - t) ** 1.5]);
    }
    wheel.push(G.strap(pts, 0.026, 0.007, [0, 0, 1]));
  }
  wheel.push(G.cyl(0.036, 0.04, 0.03, 24).rotateX(Math.PI / 2).translate(0, 0, -0.03));
  wheel.push(G.lathe([[0.0, 0.0], [0.03, 0.0], [0.031, 0.004], [0.026, 0.012], [0.012, 0.017], [0.0, 0.018]], 24, 40).rotateX(Math.PI / 2).translate(0, 0, -0.018));
  bake.push(merge(wheel).applyMatrix4(m));
}

function pedalsAndLevers(bake: THREE.BufferGeometry[], steel: THREE.BufferGeometry[], rubber: THREE.BufferGeometry[], paint: THREE.BufferGeometry[]) {
  // pedal shaft from the tunnel side, clutch and brake pedals hinged at the floor
  steel.push(G.rod([0.09, 0.352, 0.805], [0.49, 0.352, 0.805], 0.011, 12));
  paint.push(G.rbox(0.04, 0.05, 0.05, 0.008, 1).translate(0.49, 0.345, 0.805));
  for (const x of [0.46, 0.35]) {
    steel.push(G.rbox(0.03, 0.03, 0.03, 0.006, 1).translate(x, 0.352, 0.805));
    const top: V3 = [x, 0.47, 0.738];
    steel.push(G.rod([x, 0.352, 0.805], top, 0.0085, 10));
    // pad with rubber tread facing the foot
    const pad = G.rbox(0.058, 0.085, 0.014, 0.004, 1);
    pad.rotateX(G.deg(28));
    pad.translate(top[0], top[1] + 0.01, top[2] - 0.006);
    rubber.push(pad);
  }
  // accelerator: roller pedal, hinged at the heel
  const acc = G.rbox(0.05, 0.008, 0.15, 0.003, 1);
  acc.rotateX(G.deg(-38));
  acc.translate(0.235, 0.39, 0.765);
  steel.push(acc);
  bake.push(G.cyl(0.013, 0.013, 0.045, 14).rotateZ(Math.PI / 2).translate(0.235, 0.343, 0.705));
  // foot dimmer switch on the toe board slope
  steel.push(G.cyl(0.018, 0.02, 0.012, 14).rotateX(G.deg(-60)).translate(0.6, 0.35, 0.845));
  // gear lever: rubber boot, bent lever, black knob
  rubber.push(G.lathe([[0.045, 0], [0.04, 0.012], [0.03, 0.02], [0.034, 0.028], [0.022, 0.036], [0.025, 0.044], [0.012, 0.055], [0.009, 0.06]], 20, 50).translate(0, 0.405, 0.43));
  steel.push(G.tube([[0, 0.45, 0.43], [0, 0.6, 0.415], [0.004, 0.7, 0.385], [0.008, 0.745, 0.365]], 0.0072, 8, 24));
  bake.push(new THREE.SphereGeometry(0.021, 18, 12).scale(1, 0.92, 1).translate(0.008, 0.762, 0.36));
  // parking brake: toothed segment + lever resting horizontally on the tunnel, grip, button
  paint.push(G.rbox(0.012, 0.05, 0.08, 0.004, 1).translate(0.022, 0.42, 0.245));
  paint.push(G.rbox(0.012, 0.05, 0.08, 0.004, 1).translate(-0.022, 0.42, 0.245));
  steel.push(G.rbox(0.026, 0.024, 0.3, 0.008, 2).translate(0, 0.428, 0.12));
  rubber.push(G.cyl(0.017, 0.017, 0.11, 16).rotateX(Math.PI / 2).translate(0, 0.43, -0.02));
  steel.push(G.cyl(0.008, 0.008, 0.016, 10).rotateX(Math.PI / 2).translate(0, 0.43, -0.082));
  steel.push(G.cyl(0.008, 0.008, 0.05, 10).rotateZ(Math.PI / 2).translate(0, 0.42, 0.265));
  // choke pull knob to the right of the gear lever
  paint.push(G.rbox(0.03, 0.03, 0.02, 0.004, 1).translate(-0.07, 0.416, 0.49));
  steel.push(G.rod([-0.07, 0.42, 0.49], [-0.07, 0.448, 0.49], 0.004, 8));
  bake.push(G.cyl(0.011, 0.011, 0.012, 14).translate(-0.07, 0.454, 0.49));
}

/** Speedometer dial (0-100 km/h in 20 km/h steps, TM E9-803 par. 9c). */
function speedoDial(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, R = w * 0.49;
  ctx.fillStyle = '#141414';
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  ctx.strokeStyle = '#e9e4d6';
  ctx.fillStyle = '#e9e4d6';
  for (let i = 0; i <= 20; i++) {
    const a = a0 + ((a1 - a0) * i) / 20;
    const major = i % 4 === 0;
    const r0 = R * (major ? 0.72 : 0.8), r1 = R * 0.9;
    ctx.lineWidth = w * (major ? 0.016 : 0.008);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
    if (major) {
      ctx.font = `bold ${Math.round(w * 0.1)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String((i / 4) * 20), cx + Math.cos(a) * R * 0.52, cy + Math.sin(a) * R * 0.52);
    }
  }
  ctx.font = `${Math.round(w * 0.075)}px Arial, sans-serif`;
  ctx.fillText('km/h', cx, cy + R * 0.42);
  // needle at rest
  ctx.strokeStyle = '#e9e4d6';
  ctx.lineWidth = w * 0.02;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a0 + 0.05) * R * 0.62, cy + Math.sin(a0 + 0.05) * R * 0.62);
  ctx.stroke();
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.045, 0, Math.PI * 2);
  ctx.fill();
}

function dashboard(paint: THREE.BufferGeometry[], black: THREE.BufferGeometry[], steel: THREE.BufferGeometry[], bake: THREE.BufferGeometry[], glass: THREE.BufferGeometry[], red: THREE.BufferGeometry[]): THREE.Object3D[] {
  const zf = 0.8; // cabin-side face of the dash
  const out: THREE.Object3D[] = [];
  // instrument panel plate, bolted at each end (TM par. 115)
  const plate = G.extrude(G.shape([[-0.64, 0.728], [0.64, 0.728], [0.64, 0.905], [-0.64, 0.905]], 0.018), 0.004, 0.0012, 4, 1);
  plate.translate(0, 0, zf - 0.002);
  paint.push(plate);
  for (const x of [-0.615, 0.615]) steel.push(G.boltHead(0.013, 0.006).rotateX(-Math.PI / 2).translate(x, 0.816, zf - 0.004));
  // bezel helper (ring + glass + back)
  const bezel = (x: number, y: number, r: number, lens: 'glass' | 'red' | 'black') => {
    paint.push(G.lathe([[r * 0.82, 0], [r * 1.12, 0], [r * 1.14, 0.004], [r * 1.02, 0.009], [r * 0.9, 0.01], [r * 0.86, 0.006]], 32, 40).rotateX(-Math.PI / 2).translate(x, y, zf - 0.004));
    const lensG = G.cyl(r * 0.88, r * 0.88, 0.003, 32).rotateX(Math.PI / 2).translate(x, y, zf - 0.009);
    if (lens === 'glass') glass.push(lensG);
    else if (lens === 'red') red.push(lensG);
    else black.push(lensG);
    black.push(G.cyl(r * 0.9, r * 0.9, 0.006, 24).rotateX(Math.PI / 2).translate(x, y, zf - 0.001));
  };
  // speedometer in the centre, dial as a decal behind the glass
  bezel(0, 0.818, 0.056, 'glass');
  out.push(decal('kubel-speedo', 0.098, 0.098, speedoDial, { p: [0, 0.818, zf - 0.0058], r: [0, 180, 0] }, 256));
  // warning lights left (ammeter red above, oil pressure below), indicators right
  bezel(0.125, 0.848, 0.013, 'red');
  bezel(0.125, 0.79, 0.013, 'glass');
  bezel(-0.125, 0.848, 0.013, 'glass');
  bezel(-0.125, 0.79, 0.013, 'red');
  // switches: light switch + multiple switch (right), ignition (lower centre), starter, lamp socket, dash-light switch (left)
  const knob = (x: number, y: number, r = 0.012, len = 0.018) => {
    steel.push(G.cyl(r * 0.5, r * 0.5, len * 0.5 + 0.004, 10).rotateX(Math.PI / 2).translate(x, y, zf - 0.004 - (len * 0.5 + 0.004) / 2));
    bake.push(G.lathe([[0, 0], [r, 0], [r, len * 0.7], [r * 0.8, len], [0, len]], 16, 40).rotateX(-Math.PI / 2).translate(x, y, zf - 0.006 - len * 0.5));
  };
  knob(-0.125, 0.752);
  knob(-0.19, 0.752);
  knob(0.52, 0.752, 0.01);
  knob(0.34, 0.752, 0.009);
  steel.push(G.cyl(0.014, 0.016, 0.01, 18).rotateX(Math.PI / 2).translate(0.43, 0.752, zf - 0.006));
  black.push(G.cyl(0.007, 0.007, 0.012, 12).rotateX(Math.PI / 2).translate(0.43, 0.752, zf - 0.009));
  // ignition lock with key
  steel.push(G.cyl(0.016, 0.018, 0.012, 18).rotateX(Math.PI / 2).translate(0, 0.752, zf - 0.008));
  steel.push(G.rbox(0.004, 0.024, 0.016, 0.0015, 1).translate(0, 0.752, zf - 0.02));
  steel.push(G.cyl(0.012, 0.012, 0.003, 16).rotateZ(Math.PI / 2).translate(0, 0.772, zf - 0.024));
  // direction-signal switch (extreme right, top): lever on a round base
  steel.push(G.cyl(0.017, 0.017, 0.01, 16).rotateX(Math.PI / 2).translate(-0.5, 0.87, zf - 0.008));
  bake.push(G.rbox(0.012, 0.04, 0.012, 0.004, 1).translate(-0.5, 0.87, zf - 0.02));
  // fuse boxes at each end
  for (const x of [0.555, -0.555]) {
    black.push(G.rbox(0.075, 0.05, 0.026, 0.005, 2).translate(x, 0.82, zf - 0.017));
    steel.push(G.rbox(0.05, 0.004, 0.02, 0.0015, 1).translate(x, 0.846, zf - 0.017));
  }
  // box for papers and hand lamp, front left (TM par. 116c)
  paint.push(G.rbox(0.22, 0.1, 0.1, 0.008, 2).translate(0.64, 0.645, zf - 0.03));
  paint.push(G.rbox(0.2, 0.006, 0.004, 0.002, 1).translate(0.64, 0.67, zf - 0.082));
  steel.push(G.rbox(0.05, 0.012, 0.012, 0.004, 1).translate(0.64, 0.64, zf - 0.086));
  return out;
}

export function buildInterior(): THREE.Group {
  const cloth: THREE.BufferGeometry[] = [];
  const frame: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const paint: THREE.BufferGeometry[] = [];
  const bake: THREE.BufferGeometry[] = [];
  const rubber: THREE.BufferGeometry[] = [];
  const black: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const red: THREE.BufferGeometry[] = [];
  const slats: THREE.BufferGeometry[] = [];
  const battens: THREE.BufferGeometry[] = [];
  frontSeat(0.37, cloth, frame, steel);
  frontSeat(-0.37, cloth, frame, steel);
  rearSeat(cloth, paint);
  gratings(slats, battens);
  steering(bake, paint, steel);
  pedalsAndLevers(bake, steel, rubber, paint);
  const decals = dashboard(paint, black, steel, bake, glass, red);
  // central tunnel inside the cockpit
  const tunnel = G.rbox(0.19, 0.1, 1.655, 0.04, 3).translate(0, FLOOR + 0.05, 0.03);
  const out: THREE.Object3D[] = [
    part(merge(cloth), P.seatCloth()),
    part(merge([...frame, ...paint]), P.body()),
    part(merge(steel), P.darkSteel()),
    part(merge(bake), P.bakelite()),
    part(merge(rubber), P.rubber()),
    part(merge(black), P.black()),
    part(merge(glass), P.glass()),
    part(merge(red), P.redLens()),
    part(merge(slats), P.ashZ()),
    part(merge(battens), P.ash()),
    part(tunnel, P.chassis()),
    ...decals,
  ];
  return group(out);
}
