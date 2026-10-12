/**
 * PaK 40 road wheel: early full-disc pressed-steel wheel with an impressed eight-spoke pattern,
 * solid rubber tyre on a flanged rim, eight wheel nuts and a hub cap.
 *
 * Local frame: wheel centre at the origin, axle along X, OUTER face towards +X.
 * The ground is at y = -WHEEL_Y; the tyre is flattened onto it (contact patch).
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { Palette } from './palette';
import { TYRE_R, WHEEL_Y } from './layout';
import { latheX, cylX, bolts, flattenBelow, frame, mergeAll, v3, type V2 } from './util';

const RIM_R = 0.371;

function tyre(seg: number): THREE.BufferGeometry {
  const R = TYRE_R;
  const prof: V2[] = [
    [RIM_R + 0.001, -0.066],
    [RIM_R + 0.008, -0.071],
    [0.392, -0.0735],
    [0.414, -0.0745],
    [0.428, -0.0725],
    [0.437, -0.066],
    [R - 0.0015, -0.054],
    [R, -0.036],
    [R, 0.036],
    [R - 0.0015, 0.054],
    [0.437, 0.066],
    [0.428, 0.0725],
    [0.414, 0.0745],
    [0.392, 0.0735],
    [RIM_R + 0.008, 0.071],
    [RIM_R + 0.001, 0.066],
    [RIM_R + 0.001, -0.066],
  ];
  const g = latheX(prof, seg, 50);
  // contact patch a hair above the ground plane so float rounding never reports minY < 0
  flattenBelow(g, -WHEEL_Y + 2e-6);
  return g;
}

/** Flanged rim band under the tyre. */
function rim(seg: number): THREE.BufferGeometry {
  const prof: V2[] = [
    [0.356, -0.079],
    [0.384, -0.079],
    [0.388, -0.0765],
    [0.388, -0.0725],
    [0.384, -0.0695],
    [RIM_R, -0.0695],
    [RIM_R, 0.0695],
    [0.384, 0.0695],
    [0.388, 0.0725],
    [0.388, 0.0765],
    [0.384, 0.079],
    [0.356, 0.079],
    [0.356, -0.079],
  ];
  return latheX(prof, seg, 35);
}

/** Pressed disc: welded into the rim, dished outwards to the hub flange. */
function disc(seg: number): THREE.BufferGeometry {
  const t = 0.005;
  // outer face (r, x) from the hub to the rim
  const face: V2[] = [
    [0.1, 0.034],
    [0.118, 0.033],
    [0.13, 0.028],
    [0.32, 0.016],
    [0.338, 0.012],
    [0.35, 0.004],
    [0.358, -0.004],
  ];
  const prof: V2[] = [];
  for (const [r, x] of face) prof.push([r, x - t]); // inner face, hub -> rim (normal -X)
  for (let i = face.length - 1; i >= 0; i--) prof.push(face[i]); // outer face, rim -> hub (normal +X)
  prof.push([face[0][0], face[0][1] - t]);
  return latheX(prof, seg, 30);
}

/** Impressed spokes: eight raised, tapering ribs on the disc face. */
function spokes(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const r0 = 0.125, r1 = 0.33;
  const sh = G.shape([[r0, -0.014], [r1, -0.024], [r1 + 0.008, 0], [r1, 0.024], [r0, 0.014], [r0 - 0.004, 0]], 0.006);
  const xAt = (r: number) => 0.028 + ((r - 0.13) * (0.016 - 0.028)) / (0.32 - 0.13);
  const tilt = Math.atan2(xAt(r0) - xAt(r1), r1 - r0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const g = G.extrude(sh, 0.014, 0.0055, 6, 2);
    const rad = v3(0, Math.cos(a), Math.sin(a));
    const tan = v3(0, -Math.sin(a), Math.cos(a));
    // tilt the rib to follow the dished face
    const u = rad.clone().multiplyScalar(Math.cos(tilt)).add(v3(-Math.sin(tilt), 0, 0));
    const w = u.clone().cross(tan).normalize();
    // rib mid-plane on the (linearly dished) disc face: x(r) = xAt(0) - r * slope
    frame(g, u, tan, w, v3(xAt(0), 0, 0));
    parts.push(g);
  }
  return mergeAll(parts);
}

function hub(seg: number): THREE.BufferGeometry {
  // inner hub barrel, flange against the disc, domed hub cap with a hexagonal end
  const prof: V2[] = [
    [0, -0.1],
    [0.052, -0.1],
    [0.056, -0.096],
    [0.066, -0.06],
    [0.078, -0.03],
    [0.098, -0.02],
    [0.1, -0.012],
    [0.1, 0.029],
    [0.096, 0.036],
    [0.07, 0.038],
    [0.066, 0.042],
    [0.062, 0.05],
    [0.062, 0.088],
    [0.058, 0.094],
    [0.05, 0.1],
    [0.03, 0.104],
    [0, 0.105],
  ];
  return latheX(prof, seg, 30);
}

/** One complete wheel (outer face +X). */
export function wheel(P: Palette, hi: boolean): THREE.Group {
  const seg = hi ? 96 : 48;
  const out: THREE.Object3D[] = [];
  out.push(part(tyre(seg), P.rubber));
  out.push(part(rim(seg), P.paint));
  out.push(part(disc(seg), P.paint));
  out.push(part(spokes(), P.paint));
  out.push(part(hub(hi ? 40 : 24), P.paint));
  // wheel nuts between the spokes, on the hub flange
  const nuts: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    nuts.push(v3(0.038, Math.cos(a) * 0.083, Math.sin(a) * 0.083));
  }
  out.push(part(bolts(nuts, [1, 0, 0], 0.02, 0.011), P.paint));
  // hexagonal lubricator plug on the cap
  out.push(part(cylX(0.016, 0.104, 0.114, 6, 0, 0, 0.002), P.steel));
  // valve-less solid tyre: moulded bead ring on the outer sidewall
  out.push(part(G.torus(0.402, 0.0035, 6, seg), P.rubber, { p: [0.074, 0, 0], r: [0, 90, 0] }));
  return group(out);
}
