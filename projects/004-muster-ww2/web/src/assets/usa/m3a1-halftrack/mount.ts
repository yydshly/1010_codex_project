/**
 * M49 machine-gun ring mount "pulpit" of the M3A1 over the right front seat: armoured circular
 * shield band on four tubular posts from the cab floor, ring race with the traversing carriage and
 * cradle carrying the .50 cal Browning M2 HB (gun model shared read-only with the M4A3 asset).
 */
import { THREE, G, part, group } from '../../../core/kit';
import { D } from './dims';
import type { Pal } from './palette';
import { merge, box } from '../willys-mb/util';
import { m2hb } from '../m4a3-sherman/mg';
import type { Pal as ShermanPal } from '../m4a3-sherman/palette';

export function ringMount(P: Pal): THREE.Object3D {
  const R = D.ring;
  const cx = R.x, cz = R.z;
  const y0 = 1.965, y1 = R.top - 0.07; // shield band
  const paint: THREE.BufferGeometry[] = [], gun: THREE.BufferGeometry[] = [];
  // shield band: open cylinder with thickness and rolled lower edge
  const band = G.lathe(
    [
      [R.r - 0.008, y0 + 0.006],
      [R.r - 0.002, y0],
      [R.r, y0 + 0.006],
      [R.r, y1],
      [R.r - 0.008, y1],
    ],
    64,
    40,
  );
  const bandIn = G.lathe(
    [
      [R.r - 0.008, y1],
      [R.r - 0.008, y0 + 0.006],
    ],
    64,
    40,
  );
  paint.push(band.translate(cx, 0, cz), bandIn.translate(cx, 0, cz));
  // vertical bolt strips on the band
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const g = box(0.03, y1 - y0 - 0.02, 0.008, [0, 0, 0], 0.002);
    g.rotateY(-a + Math.PI / 2);
    g.translate(cx + Math.cos(a) * (R.r + 0.003), (y0 + y1) / 2, cz + Math.sin(a) * (R.r + 0.003));
    paint.push(g);
  }
  // ring race (box-section ring) on top of the band
  const race = G.lathe(
    [
      [R.r - 0.05, y1],
      [R.r + 0.012, y1],
      [R.r + 0.012, R.top - 0.02],
      [R.r - 0.02, R.top],
      [R.r - 0.05, R.top],
    ],
    72,
    40,
  );
  gun.push(race.translate(cx, 0, cz));
  gun.push(G.lathe([[R.r - 0.05, R.top], [R.r - 0.05, y1]], 72, 40).translate(cx, 0, cz));
  // tubular posts from the floor to the race, with knee braces to the band
  const postR = R.r - 0.04;
  for (const deg of [45, 135, 180, 270]) {
    const a = G.deg(deg);
    const px = cx + Math.cos(a) * postR, pz = cz + Math.sin(a) * postR;
    paint.push(G.cyl(0.024, 0.024, y1 - D.floorY, 12).translate(px, (y1 + D.floorY) / 2, pz));
    paint.push(G.cyl(0.05, 0.055, 0.012, 14).translate(px, D.floorY + 0.006, pz));
    paint.push(box(0.05, 0.1, 0.05, [px, y1 - 0.05, pz], 0.006));
  }
  // traversing carriage on the race at the front with the pintle cradle
  const ca = G.deg(90);
  const kx = cx + Math.cos(ca) * (R.r - 0.02), kz = cz + Math.sin(ca) * (R.r - 0.02);
  gun.push(box(0.26, 0.05, 0.12, [kx, R.top + 0.02, kz], 0.008));
  for (const s of [1, -1]) gun.push(G.cyl(0.025, 0.025, 0.03, 12).rotateZ(Math.PI / 2).translate(kx + s * 0.1, R.top - 0.005, kz + 0.04));
  gun.push(G.cyl(0.035, 0.04, 0.075, 14).translate(kx, R.top + 0.08, kz - 0.02));
  const kids: THREE.Object3D[] = [part(merge(paint), P.paint), part(merge(gun), P.gun)];
  // .50 cal M2 HB on the cradle, pointing ahead
  const mgPal = { gun: P.gun, void: P.void, rubber: P.black, paint: P.paint, toolSteel: P.steel, cast: P.chassis } as unknown as ShermanPal;
  const mg = m2hb(mgPal);
  mg.position.set(kx, R.top + 0.13, kz - 0.02);
  kids.push(mg);
  return group(kids);
}
