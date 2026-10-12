/**
 * Il-2 fuselage (body frame): armoured forward hull + wooden rear monocoque as one lofted skin,
 * split into the upper (camouflage) and lower (light blue) paint, with an open cockpit, engraved
 * armour-panel joints, radiator / oil-cooler intakes, exhaust stubs, cockpit interior and the
 * fuselage stars.
 */
import * as THREE from 'three';
import { G, part, group, mirrorX } from '../../../core/kit';
import { Grid, V, uniq, linspace, cap, pane, conformDecal } from './geo';
import { SEC, secAt, ringPoint, T_SILL, type Section } from './shape';
import { D } from './dims';
import { drawStar, type Palette } from './paint';

const GROOVE = 0.0016;
const STATION_GROOVES = [1.03, 1.72, 2.42, 4.82, 8.6];
const LONG_GROOVES = [
  { t: 20, s0: 0.95, s1: 2.98 },
  { t: 160, s0: 0.95, s1: 2.98 },
  { t: 66, s0: 1.03, s1: 2.98 },
  { t: 114, s0: 1.03, s1: 2.98 },
];

/** Ring parameter list for station s, plus fixed indices of the key angles. */
function ringAngles(s: number) {
  const tD = SEC.tD(s);
  const d = 0.5;
  const segs: [number, number][] = [
    [-90, 14], [tD, 8], [20 - d, 1], [20, 1], [20 + d, 6], [T_SILL, 5], [66 - d, 1], [66, 1], [66 + d, 6],
    [90, 6], [114 - d, 1], [114, 1], [114 + d, 5], [180 - T_SILL, 6], [160 - d, 1], [160, 1], [160 + d, 8],
    [180 - tD, 14], [270, 0],
  ];
  const angles: number[] = [];
  const at: Record<string, number> = {};
  for (let k = 0; k < segs.length - 1; k++) {
    const [a, n] = segs[k];
    const b = segs[k + 1][0];
    at[String(k)] = angles.length;
    for (let i = 0; i < n; i++) angles.push(a + ((b - a) * i) / n);
  }
  return { angles, dL: at['1'], sillL: at['5'], sillR: at['13'], dR: at['17'], grooveCols: [at['3'], at['15'], at['7'], at['11']] };
}

/** Station list with exact key stations and engraved-joint triplets. */
function stations(): { S: number[]; grooveRows: Set<number> } {
  const keys = [D.cockpit.s0, D.cockpit.s1, D.canopy.ws1, D.canopy.hood1, D.canopy.bridge1, D.canopy.gun1];
  const base = [...linspace(0.76, 1.3, 12), ...linspace(1.35, 10.95, 97), ...linspace(11.0, 11.3, 6)].filter(
    (s) => !STATION_GROOVES.some((g) => Math.abs(s - g) < 0.012) && !keys.some((k) => Math.abs(s - k) < 0.02),
  );
  const tri: number[] = [];
  for (const g of STATION_GROOVES) tri.push(g - 0.004, g, g + 0.004);
  const S = uniq([...base, ...keys, ...tri], 1e-5);
  const grooveRows = new Set<number>();
  S.forEach((s, i) => {
    if (STATION_GROOVES.some((g) => Math.abs(s - g) < 1e-6)) grooveRows.add(i);
  });
  return { S, grooveRows };
}

export interface FuselageOut {
  object: THREE.Object3D;
  /** station index lookup for other modules */
  S: number[];
}

/** Port-side surface point + outward normal at station s and height y (for decals). */
export function sidePoint(s: number, y: number): { p: THREE.Vector3; n: THREE.Vector3 } {
  const sec = secAt(s);
  let lo = -80, hi = 80;
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2;
    if (ringPoint(sec, m).y < y) lo = m;
    else hi = m;
  }
  const t = (lo + hi) / 2;
  const p = ringPoint(sec, t);
  const dt = ringPoint(sec, t + 0.5).sub(ringPoint(sec, t - 0.5));
  const ds = ringPoint(secAt(s + 0.01), t).sub(ringPoint(secAt(s - 0.01), t));
  const n = new THREE.Vector3().crossVectors(ds, dt).normalize();
  if (n.x < 0) n.negate();
  return { p, n };
}

function insetSec(sec: Section, d: number): Section {
  return { ...sec, hw: sec.hw - d, top: sec.top - d, bot: sec.bot + d };
}

export function buildFuselage(pal: Palette): FuselageOut {
  const { S, grooveRows } = stations();
  const rings = S.map((s) => ringAngles(s));
  const R0 = rings[0];
  const P = S.map((s, i) => {
    const sec = secAt(s);
    return rings[i].angles.map((t) => ringPoint(sec, t));
  });
  const grid = new Grid(P, true, (i, j) => {
    const s = S[i];
    return P[i][j].clone().sub(V(0, SEC.yc(s), -s));
  });
  const longCols = R0.grooveCols;
  grid.engrave((i, j) => {
    const s = S[i];
    if (grooveRows.has(i)) return GROOVE;
    for (let k = 0; k < LONG_GROOVES.length; k++) {
      const g = LONG_GROOVES[k];
      if (j === longCols[k] && s >= g.s0 && s <= g.s1) return GROOVE;
    }
    return 0;
  });

  const last = S.length - 1;
  const iC0 = S.findIndex((s) => Math.abs(s - D.cockpit.s0) < 1e-6);
  const iC1 = S.findIndex((s) => Math.abs(s - D.cockpit.s1) < 1e-6);
  const parts: THREE.Object3D[] = [];
  // painted skin
  parts.push(part(grid.sheet(0, last, R0.dR, R0.dL), pal.bottom, { name: 'fus-lower' }));
  parts.push(part(grid.sheet(0, last, R0.dL, R0.sillL), pal.top, { name: 'fus-side-l' }));
  parts.push(part(grid.sheet(0, last, R0.sillR, R0.dR), pal.top, { name: 'fus-side-r' }));
  parts.push(part(grid.sheet(0, iC0, R0.sillL, R0.sillR), pal.top, { name: 'fus-top-front' }));
  parts.push(part(grid.sheet(iC1, last, R0.sillL, R0.sillR), pal.top, { name: 'fus-top-rear' }));
  // tail-cone end and the dark face behind the spinner
  parts.push(part(cap(P[last], V(0, 0, -1)), pal.bottom));
  parts.push(part(cap(P[0].map((p) => p.clone().add(V(0, 0, -0.004))), V(0, 0, 1)), pal.dark));

  parts.push(cockpit(pal, S));
  parts.push(intakes(pal));
  parts.push(exhausts(pal));
  parts.push(...fuselageStars());
  return { object: group(parts, { name: 'fuselage' }), S };
}

/** Cockpit tub: inner walls, floors, bulkheads, seats, stick, panel, sight, gunner fittings. */
function cockpit(pal: Palette, S: number[]): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const s0 = D.cockpit.s0, s1 = D.cockpit.s1;
  const rows = S.filter((s) => s >= s0 - 1e-6 && s <= s1 + 1e-6);
  // inner walls (both sides), facing inwards
  for (const side of [1, -1]) {
    const angs = side > 0 ? linspace(-30, T_SILL, 14) : linspace(180 - T_SILL, 210, 14);
    const P = rows.map((s) => {
      const sec = insetSec(secAt(s), 0.018);
      return angs.map((t) => ringPoint(sec, t));
    });
    const g = new Grid(P, false, (i, j) => P[i][j].clone().sub(V(0, SEC.yc(rows[i]), -rows[i])));
    out.push(part(g.sheet(0, rows.length - 1, 0, angs.length - 1, true), pal.interior));
  }
  // sill lips (skin thickness between outer skin and inner wall), covered by canopy rails
  // floors
  const floor = (a: number, b: number, y: number) =>
    part(G.rbox(0.96, 0.02, b - a, 0.004), pal.interior, { p: [0, y, -(a + b) / 2] });
  out.push(floor(3.12, 4.42, -0.4));
  out.push(floor(4.8, s1, -0.3));

  // bulkheads following the fuselage section up to an arch (port half built, then mirrored)
  const bulk = (s: number, floorY: number, archTop: number | null, mat: THREE.Material, t = 0.012) => {
    const sec = insetSec(secAt(s), 0.02);
    const half: THREE.Vector3[] = [];
    const wall = linspace(-28, T_SILL, 12).map((a) => ringPoint(sec, a));
    half.push(V(0, floorY, 0), V(wall[0].x, floorY, 0));
    for (const p of wall) if (p.y > floorY + 0.005) half.push(V(p.x, p.y, 0));
    const sl = half[half.length - 1];
    if (archTop !== null) {
      for (let k = 1; k <= 6; k++) {
        const a = (k / 6) * (Math.PI / 2);
        half.push(V(sl.x * Math.cos(a), sl.y + (archTop - sl.y) * Math.sin(a), 0));
      }
    } else {
      for (const a of linspace(T_SILL, 90, 7).slice(1)) {
        const p = ringPoint(sec, a);
        half.push(V(p.x, p.y, 0));
      }
    }
    // half runs keel-centre -> port wall -> crown centre; mirror the inner points for starboard
    const stbd = half.slice(1, -1).reverse().map((p) => V(-p.x, p.y, 0));
    const outline = [...half, ...stbd];
    const g = pane(outline.map((p) => V(p.x, p.y, -s)), t, V(0, 0, 1));
    return part(g, mat);
  };
  out.push(bulk(3.1, -0.4, null, pal.interior)); // firewall ahead of the panel
  out.push(bulk(4.43, -0.4, 1.065, pal.interior, 0.014)); // pilot's rear armour bulkhead
  out.push(bulk(4.79, -0.3, 1.02, pal.interior)); // gunner's front bulkhead
  out.push(bulk(s1 - 0.004, -0.3, null, pal.interior)); // rear bulkhead under the decking

  // instrument panel (black board with dials as a decal)
  const panelS = 3.27;
  out.push(part(G.rbox(0.62, 0.34, 0.02, 0.01), pal.dark, { p: [0, 0.35, -panelS] }));
  out.push(instrumentDecal(panelS + 0.0102));
  // coaming over the panel
  out.push(part(G.rbox(0.66, 0.035, 0.16, 0.012), pal.interior, { p: [0, 0.535, -(panelS - 0.05)] }));
  // PBP-1 type reflector sight on the coaming
  const sight = group([
    part(G.rbox(0.07, 0.08, 0.15, 0.008), pal.dark, { p: [0, 0.04, 0] }),
    part(G.cyl(0.028, 0.028, 0.05, 16), pal.dark, { p: [0, 0.03, 0.09], r: [90, 0, 0] }),
    part(G.rbox(0.075, 0.07, 0.003, 0.001), pal.glass, { p: [0, 0.115, -0.02], r: [-40, 0, 0] }),
  ], { p: [0, 0.555, -(panelS - 0.04)] });
  out.push(sight);
  // control stick with ring grip
  out.push(part(G.rod([0, -0.38, -3.78], [0, 0.02, -3.74], 0.016, 10), pal.dark));
  out.push(part(G.torus(0.045, 0.01, 8, 20), pal.dark, { p: [0, 0.07, -3.74] }));
  out.push(part(G.cyl(0.05, 0.05, 0.05, 14), pal.leather, { p: [0, -0.37, -3.78] }));
  // rudder pedals
  for (const sx of [0.14, -0.14]) out.push(part(G.rbox(0.09, 0.14, 0.03, 0.006), pal.dark, { p: [sx, -0.28, -3.36], r: [20, 0, 0] }));
  // pilot seat: pan, back and parachute cushion
  out.push(part(G.rbox(0.42, 0.04, 0.4, 0.01), pal.interior, { p: [0, -0.15, -4.12] }));
  out.push(part(G.rbox(0.42, 0.55, 0.04, 0.01), pal.interior, { p: [0, 0.12, -4.36], r: [-12, 0, 0] }));
  out.push(part(G.rbox(0.38, 0.09, 0.36, 0.035), pal.leather, { p: [0, -0.085, -4.1] }));
  out.push(part(G.rbox(0.36, 0.3, 0.06, 0.025), pal.leather, { p: [0, 0.18, -4.32], r: [-12, 0, 0] }));
  // head armour behind the pilot
  const ha: THREE.Vector3[] = [];
  for (let k = 0; k <= 10; k++) {
    const a = (k / 10) * Math.PI;
    ha.push(V(0.2 * Math.cos(a), 0.86 + 0.12 * Math.sin(a), -4.415));
  }
  ha.push(V(-0.2, 0.5, -4.415), V(0.2, 0.5, -4.415));
  out.push(part(pane(ha, 0.014, V(0, 0, 1)), pal.interior));

  // gunner: strap seat, side ammunition box
  out.push(part(G.rbox(0.5, 0.012, 0.18, 0.004), pal.leather, { p: [0, 0.05, -5.22] }));
  out.push(part(G.rbox(0.04, 0.3, 0.04, 0.005), pal.interior, { p: [0.27, -0.1, -5.22] }));
  out.push(part(G.rbox(0.04, 0.3, 0.04, 0.005), pal.interior, { p: [-0.27, -0.1, -5.22] }));
  return group(out, { name: 'cockpit' });
}

function instrumentDecal(s: number): THREE.Mesh {
  const w = 0.6, h = 0.32;
  const draw = (ctx: CanvasRenderingContext2D, W: number, H: number) => {
    ctx.fillStyle = '#161716';
    ctx.fillRect(0, 0, W, H);
    const dial = (x: number, y: number, r: number) => {
      ctx.fillStyle = '#0b0b0b';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = r * 0.12;
      ctx.stroke();
      ctx.strokeStyle = '#d8d4c4';
      ctx.lineWidth = Math.max(1, r * 0.05);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
        ctx.lineTo(x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86);
        ctx.stroke();
      }
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(x, y);
      const a = ((x * 7 + y * 3) % 6.28);
      ctx.lineTo(x + Math.cos(a) * r * 0.65, y + Math.sin(a) * r * 0.65);
      ctx.stroke();
    };
    const u = W / 12;
    const rows = [
      [2, 4.5, 7.5, 10],
      [1.3, 3.6, 6, 8.4, 10.7],
    ];
    rows[0].forEach((x) => dial(x * u, H * 0.3, u * 0.85));
    rows[1].forEach((x) => dial(x * u, H * 0.72, u * 0.75));
  };
  return conformDecal('su-il2-panel', h / w, draw, (u, v) => ({ p: V((0.5 - u) * w, 0.35 + (v - 0.5) * h, -s), n: V(0, 0, -1) }), 1, 1, 0.0005, 512);
}

/** Top radiator intake behind the spinner and the chin oil-cooler intake. */
function intakes(pal: Palette): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  // --- top radiator intake: lip frame + fairing + shutter
  const lip = (w: number, h: number, wi: number, hi: number, r: number, depth: number) => {
    const o: [number, number][] = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    const hole: [number, number][] = [[-wi / 2, -hi / 2], [wi / 2, -hi / 2], [wi / 2, hi / 2], [-wi / 2, hi / 2]];
    return G.extrude(G.shape(o, r, [hole]), depth, 0.006);
  };
  type Sec = { z: number; ring: [number, number][]; dy: number };
  const topY = 0.438, topS = 0.83;
  out.push(part(lip(0.44, 0.15, 0.37, 0.095, 0.05, 0.06), pal.top, { p: [0, topY, -topS], r: [-6, 0, 0] }));
  const fair: Sec[] = [];
  for (const [s, top, hw] of [
    [0.84, 0.512, 0.22], [0.95, 0.518, 0.218], [1.1, 0.527, 0.212], [1.25, 0.535, 0.2], [1.42, 0.545, 0.17],
  ] as [number, number, number][]) {
    const bot = 0.28, half = (top - bot) / 2;
    fair.push({ z: -s, ring: G.superRing(hw, half, 28, 3.2), dy: (top + bot) / 2 });
  }
  out.push(part(G.loftZ(fair, false, 60), pal.top));
  out.push(part(G.rbox(0.38, 0.1, 0.01, 0.004), pal.dark, { p: [0, topY, -(topS + 0.05)], r: [-6, 0, 0] }));
  for (const dy of [-0.025, 0, 0.025]) out.push(part(G.rbox(0.37, 0.008, 0.03, 0.003), pal.interior, { p: [0, topY + dy, -(topS + 0.03)], r: [-30, 0, 0] }));
  out.push(part(G.rbox(0.012, 0.095, 0.035, 0.003), pal.interior, { p: [0, topY, -(topS + 0.03)] }));

  // --- chin oil-cooler intake
  const cy = -0.452, cs = 0.93;
  out.push(part(lip(0.34, 0.13, 0.27, 0.075, 0.045, 0.06), pal.bottom, { p: [0, cy, -cs], r: [12, 0, 0] }));
  const chin: Sec[] = [];
  for (const [s, bot, hw] of [
    [0.95, -0.522, 0.172], [1.1, -0.585, 0.17], [1.35, -0.665, 0.16], [1.6, -0.722, 0.14], [1.85, -0.765, 0.1],
  ] as [number, number, number][]) {
    const top = -0.25;
    chin.push({ z: -s, ring: G.superRing(hw, (top - bot) / 2, 24, 3.0), dy: (top + bot) / 2 });
  }
  out.push(part(G.loftZ(chin, false, 60), pal.bottom));
  out.push(part(G.rbox(0.27, 0.08, 0.01, 0.004), pal.dark, { p: [0, cy, -(cs + 0.05)], r: [12, 0, 0] }));
  for (const dx of [-0.07, 0, 0.07]) out.push(part(G.rbox(0.008, 0.075, 0.03, 0.003), pal.interior, { p: [dx, cy, -(cs + 0.03)], r: [12, 0, 0] }));
  return group(out, { name: 'intakes' });
}

/** Six short exhaust stubs per side along the engine. */
function exhausts(pal: Palette): THREE.Object3D {
  const out: THREE.Object3D[] = [];
  const o: [number, number][] = [];
  const hole: [number, number][] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    o.push([0.038 * Math.cos(a), 0.024 * Math.sin(a)]);
    hole.push([0.031 * Math.cos(-a), 0.017 * Math.sin(-a)]);
  }
  const sh = G.shape(o, 0);
  const hp = new THREE.Path();
  hp.setFromPoints(hole.map(([x, y]) => new THREE.Vector2(x, y)));
  sh.holes.push(hp);
  const stubGeo = G.extrude(sh, 0.11, 0.003);
  const plug = G.cyl(0.03, 0.03, 0.004, 12);
  plug.scale(1, 1, 0.58);
  for (let k = 0; k < 6; k++) {
    const s = 1.02 + k * 0.19;
    const { p, n } = sidePoint(s, 0.16);
    // stub axis: outwards, swept aft (aft = +s = -z in the body frame) and slightly down
    const zAx = n.clone().multiplyScalar(0.82).add(V(0, -0.08, -0.52)).normalize();
    const yAx = V(0, 1, 0).sub(zAx.clone().multiplyScalar(zAx.y)).normalize();
    const xAx = new THREE.Vector3().crossVectors(yAx, zAx);
    // extrusion is centred on its length: centre it 0.05 m out so ~2 cm stays buried
    const m = new THREE.Matrix4().makeBasis(xAx, yAx, zAx).setPosition(p.clone().addScaledVector(zAx, 0.035));
    out.push(part(stubGeo.clone().applyMatrix4(m), pal.exhaust));
    // dark plug inside each pipe (cylinder axis = local Y -> stub axis)
    const pm = new THREE.Matrix4().makeBasis(xAx, zAx, yAx.clone().negate()).setPosition(p.clone().addScaledVector(zAx, 0.0));
    out.push(part(plug.clone().applyMatrix4(pm), pal.dark));
  }
  return mirrorX(group(out, { name: 'exhausts' }));
}

/** Stars on both fuselage sides (red, white border, thin red outline). */
function fuselageStars(): THREE.Object3D[] {
  const size = 0.84, sc = 7.75, yc = -0.03;
  const out: THREE.Object3D[] = [];
  for (const side of [1, -1]) {
    const m = conformDecal(
      'su-il2-star',
      1,
      drawStar,
      (u, v) => {
        const s = sc + (u - 0.5) * size * side;
        const { p, n } = sidePoint(s, yc + (v - 0.5) * size);
        return { p: V(p.x * side, p.y, p.z), n: V(n.x * side, n.y, n.z) };
      },
      18,
      18,
      0.0025,
      512,
    );
    out.push(m);
  }
  return out;
}

