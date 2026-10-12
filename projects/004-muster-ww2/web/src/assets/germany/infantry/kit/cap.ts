/**
 * M43 field cap (Einheitsfeldmuetze M43): field-grey wool, flat-topped crown, cloth-covered peak,
 * and a curtain (the fold-down side and neck flap) turned up around the sides and back and
 * closed at the front with two small buttons. National cockade only (the national eagle is not
 * depicted in this archive).
 *
 * Built in the headgear frame of the shared fitting API (fit.headFrame().band): origin at the
 * centre of the head opening on the liner-band plane, +Z forward, +Y up the head, +X left.
 * The head there is ~0.156 m wide and ~0.2 m long incl. hair; the crown is 0.074 m above the band.
 */
import { THREE, group, part } from '../../../../core/kit';
import { F, loftZF, buttonGeo, placeY, fineCrease } from '../geo';
import { U } from '../palette';

type V2 = [number, number];

/** Oval ring (x = half width a, forward = half length b) centred at forward offset c; returned as loft ring points (x, -forward). */
function oval(a: number, b: number, c = 0, n = 48, flatBack = 0): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = a * Math.sin(t);
    let f = b * Math.cos(t);
    if (f < 0) f *= 1 - flatBack;
    pts.push([x, -(f + c)]);
  }
  return pts;
}

export function fieldCap(): THREE.Group {
  const wool = U.tunic();
  const parts: THREE.Object3D[] = [];
  // crown: rings stacked up the head (loft z = height above the band)
  const secs = [
    { z: -0.004, ring: oval(0.0822, 0.1045, 0.001) },
    { z: 0.03, ring: oval(0.0836, 0.1065, 0.001) },
    { z: 0.062, ring: oval(0.0852, 0.1085, 0.002) },
    { z: 0.079, ring: oval(0.0848, 0.1082, 0.002) },
    { z: 0.0855, ring: oval(0.0805, 0.1035, 0.002) },
    { z: 0.0885, ring: oval(0.068, 0.091, 0.002) },
    { z: 0.0898, ring: oval(0.035, 0.05, 0.002) },
  ];
  const crown = loftZF(secs, true, 50);
  crown.rotateX(-Math.PI / 2);
  parts.push(part(crown, wool));
  // top seam welt (the top panel is sewn to the side panels)
  {
    const ring = oval(0.0838, 0.1068, 0.002, 64).map(([x, y]) => new THREE.Vector3(x, 0.0808, y * -1));
    parts.push(part(F.tube([...ring, ring[0]], 0.0012, 5, 128, true), wool));
  }
  // curtain: turned-up flap around the sides and back, open at the front, two buttons
  {
    const n = 64;
    const top = 0.047, bot = -0.004, off = 0.0032;
    const rows: THREE.Vector3[][] = [];
    const tMax = Math.PI * 0.995; // from the front centre round the back to the front centre
    for (let j = 0; j <= 8; j++) {
      const v = j / 8;
      const row: THREE.Vector3[] = [];
      for (let i = 0; i <= n; i++) {
        const u = -tMax + (2 * tMax * i) / n; // around, 0 = back
        const t = Math.PI + u;
        const a = 0.0822 + off + 0.0014 * v, b = 0.1045 + off + 0.0014 * v;
        const fwd = Math.abs(u) / tMax; // 1 at the front ends
        // the front ends rise into a shallow V towards the buttons
        const yTop = top + 0.006 * fwd * fwd;
        const y = bot + (yTop - bot) * v;
        row.push(new THREE.Vector3(a * Math.sin(t), y, b * Math.cos(t) + 0.001));
      }
      rows.push(row);
    }
    // build as a thin shell: outer grid + inner grid + edges
    const pos: number[] = [];
    const idx: number[] = [];
    const cols = n + 1;
    const th = 0.0026;
    const layer = (inward: number) => {
      const base = pos.length / 3;
      for (const row of rows) for (const p of row) {
        const r = Math.hypot(p.x, p.z);
        const k = (r - inward) / r;
        pos.push(p.x * k, p.y, p.z * k);
      }
      return base;
    };
    const o = layer(0), inn = layer(th);
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < n; i++) {
      const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      idx.push(o + a, o + b, o + d, o + a, o + d, o + c);
      idx.push(inn + a, inn + d, inn + b, inn + a, inn + c, inn + d);
    }
    const J = rows.length - 1;
    for (let i = 0; i < n; i++) {
      // top and bottom rims
      idx.push(o + J * cols + i, o + J * cols + i + 1, inn + J * cols + i + 1, o + J * cols + i, inn + J * cols + i + 1, inn + J * cols + i);
      idx.push(o + i, inn + i + 1, o + i + 1, o + i, inn + i, inn + i + 1);
    }
    for (let j = 0; j < J; j++) {
      // the two front edges
      for (const i of [0, n]) {
        const a = j * cols + i, c = a + cols;
        if (i === n) idx.push(o + a, inn + c, o + c, o + a, inn + a, inn + c);
        else idx.push(o + a, o + c, inn + c, o + a, inn + c, inn + a);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    parts.push(part(fineCrease(g, 50), wool));
    // two small buttons one above the other at the front closure
    const btn = buttonGeo(0.0125, 0.0034);
    const fz = 0.1045 + off + 0.001 + 0.0008;
    for (const y of [0.0125, 0.033]) parts.push(part(placeY(btn, [0, y, fz], [0, 0.05, 1]), U.button()));
  }
  // peak: cloth-covered, stiff, sloping down
  {
    const outline: V2[] = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = Math.PI * (i / n);
      outline.push([Math.cos(t) * 0.07, Math.sin(t) * 0.058]);
    }
    for (let i = n; i >= 0; i--) {
      const t = Math.PI * (i / n);
      outline.push([Math.cos(t) * 0.066, Math.sin(t) * 0.006]);
    }
    const g = F.extrude(outline, 0.0036, 0.0013, 6, 2);
    // extrude is in XY (thickness along Z); lay it in XZ, forward = +Z
    g.rotateX(Math.PI / 2);
    g.rotateX(0.36);
    g.translate(0, -0.001, 0.098);
    parts.push(part(g, wool));
  }
  // national cockade (black-white-red woven roundel) on the crown front
  {
    const fz = 0.1097;
    const disc = (r: number, h: number) => F.lathe([[0, h], [r * 0.9, h], [r, h * 0.5], [r, 0], [0, 0]], 28, 50);
    const m = [
      U.cockadeBlack(),
      U.cockadeWhite(),
      U.cockadeRed(),
    ];
    const rs = [0.0082, 0.0058, 0.0033];
    rs.forEach((r, i) => parts.push(part(placeY(disc(r, 0.0011 + i * 0.0005), [0, 0.057, fz], [0, -0.09, 1]), m[i])));
  }
  const g = group(parts);
  g.name = 'm43-cap';
  return g;
}
