/**
 * German Army (Heer) field uniform, 1943-44, as a shared-human-base UniformSpec, plus the collar
 * patches (Litzen) that the spec does not cover.
 *
 * M40 field tunic (Feldbluse M40): field-grey wool, field-grey fold-down collar (the M36 had a
 * dark bottle-green collar), five-button front, four box-pleated patch pockets with scalloped,
 * buttoned flaps, field-grey shoulder straps with white (infantry) piping, internal belt hooks
 * (the belt is worn at the hook height). The M41 differed mainly in its six-button front and the
 * M43 in unpleated pockets with straight flaps, so five buttons + pleats + scalloped flaps = M40.
 * Field-grey wool trousers tucked into black leather marching boots (Marschstiefel), which
 * remained standard front-line issue through 1943-44 alongside ankle boots with gaiters.
 */
import * as THREE from 'three';
import { M } from '../../../core/kit';
import { clothMaterial, type UniformSpec } from '../../shared/human/uniform';
import type { Frame } from '../../shared/human/sdfx';
import type { SoldierBuild } from '../../shared/human/soldier';
import { F, roundRect } from './geo';

/** Belt centre height (m, 1.76 m reference figure barefoot). */
export const BELT_H = 1.03;
/** Pocket sizes used by the spec (also used to build strap / pouch obstacles). */
export const POCKETS = {
  chest: { w: 0.115, h: 0.135, y: 1.29, x: 0.095, flap: 0.052 },
  skirt: { w: 0.165, h: 0.17, y: 0.9, x: 0.118, flap: 0.064 },
};

const WOOL = { detail: 'twill' as const, detailSize: 0.009, detailStrength: 0.75, colorVar: 0.05, varScale: 5, sheen: 0.45, cavity: 0.5, dustColor: 0x857a66 };

export const DE_M40: UniformSpec = {
  id: 'de-heer-m40-v3',
  tunic: {
    cloth: { kind: 'wool', color: 0x5a5c4a, mat: { ...WOOL, dust: 0.1, dustHeight: 0.9 } },
    thickness: 0.0035,
    hem: 0.8,
    flare: 0.08,
    belt: { height: BELT_H, gather: 1 },
    collar: { style: 'turndown', height: 0.034, fall: 0.046 },
    front: { style: 'full', buttons: 5 },
    pockets: [
      { at: 'chest', side: 'both', x: POCKETS.chest.x, y: POCKETS.chest.y, w: POCKETS.chest.w, h: POCKETS.chest.h, pleat: true, flap: { h: POCKETS.chest.flap, shape: 'scalloped', button: true } },
      { at: 'skirt', side: 'both', x: POCKETS.skirt.x, y: POCKETS.skirt.y, w: POCKETS.skirt.w, h: POCKETS.skirt.h, pleat: true, flap: { h: POCKETS.skirt.flap, shape: 'scalloped', button: true } },
    ],
    shoulderStraps: { style: 'strap', piping: 0xc9c5b2, button: true },
    cuff: { back: 0.012, buttons: 0 },
    buttons: { color: 0x585a4e, metal: true, diameter: 0.019, small: 0.016 },
    seams: true,
  },
  trousers: { cloth: { kind: 'wool', color: 0x57594b, mat: { ...WOOL, colorVar: 0.06, dust: 0.22, dustHeight: 0.75 } }, cut: 'straight', bottoms: 'tucked', fullness: 0 },
  footwear: { style: 'jackboot', leather: 0x1c1a18, sole: 0x19140f, shaft: 0.35, creases: true, heel: 0.026 },
  legwear: null,
  skin: { tone: 0xc39279, hair: 0x3b2c20 },
};

// ------------------------------------------------------------------ collar patches (Litzen)

const litzenMats = () => ({
  // backing: the trouser cloth (dark field grey), bars: mouse-grey weave (same args as U.litzen)
  backing: clothMaterial(DE_M40.trousers.cloth),
  bar: M.cotton(0x8e8f86, { detail: 'twill', detailSize: 0.0025, detailStrength: 0.9, sheen: 0.5, colorVar: 0.04, dust: 0, cavity: 0.5, name: 'de-inf-litzen' }),
});

/**
 * Enlisted collar patches: a dark green backing with two woven mouse-grey bars ("Doppellitzen"),
 * each bar split lengthwise by a dark centre stripe; laid along the collar fall at the uniform's
 * `collar-l/r` anchors and bent to the collar's curvature around the neck.
 */
export function collarPatches(sol: SoldierBuild): THREE.Object3D[] {
  const an = sol.uniform.anchors as Record<string, Frame>;
  const L = an['collar-l'], R = an['collar-r'];
  if (!L || !R) return [];
  // collar radius about the neck axis from the two anchors (normals meet near the axis)
  const centre = (() => {
    const p1 = L.o, n1 = L.z, p2 = R.o, n2 = R.z;
    // closest points between the two normal lines
    const w0 = p1.clone().sub(p2);
    const a = n1.dot(n1), b = n1.dot(n2), c = n2.dot(n2), d = n1.dot(w0), e = n2.dot(w0);
    const den = a * c - b * b;
    const t1 = den > 1e-6 ? (b * e - c * d) / den : -0.06;
    const t2 = den > 1e-6 ? (a * e - b * d) / den : -0.06;
    return p1.clone().addScaledVector(n1, t1).add(p2.clone().addScaledVector(n2, t2)).multiplyScalar(0.5);
  })();
  const mats = litzenMats();
  const out: THREE.Object3D[] = [];
  for (const [side, fr] of [['l', L], ['r', R]] as const) {
    const radius = THREE.MathUtils.clamp(fr.o.clone().sub(centre).dot(fr.z), 0.05, 0.12);
    const pw = 0.046, ph = 0.027;
    const parts: { g: THREE.BufferGeometry; m: THREE.Material }[] = [];
    parts.push({ g: F.extrude(roundRect(pw, ph, 0.004, 4), 0.0011, 0.00035, 6, 1), m: mats.backing });
    for (const yb of [-0.0068, 0.0068]) {
      for (const yy of [-0.0022, 0.0022]) {
        parts.push({ g: F.extrude(roundRect(pw - 0.006, 0.0034, 0.0014, 3), 0.0011, 0.0004, 4, 1).translate(0.001, yb + yy, 0.0011), m: mats.bar });
      }
    }
    // bend around the collar axis (frame y): x along the collar, z outward. The right patch is
    // the left one turned 180 deg about its normal (keeps the winding; the design is symmetric).
    const grp = new THREE.Group();
    const flip = side === 'l' ? 1 : -1;
    for (const { g, m } of parts) {
      const geo = g.clone();
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const nor = geo.attributes.normal as THREE.BufferAttribute;
      const v = new THREE.Vector3(), n = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        n.fromBufferAttribute(nor, i);
        const u = v.x * flip + 0.005 * flip, y = v.y * flip, z = v.z + 0.0008;
        const nu = n.x * flip, ny = n.y * flip;
        const ang = u / radius;
        const c = Math.cos(ang), s = Math.sin(ang);
        pos.setXYZ(i, s * (radius + z), y, c * (radius + z) - radius);
        nor.setXYZ(i, nu * c + n.z * s, ny, -nu * s + n.z * c);
      }
      const mesh = new THREE.Mesh(geo, m);
      grp.add(mesh);
    }
    const mtx = new THREE.Matrix4().makeBasis(fr.x, fr.y, fr.z).setPosition(fr.o);
    grp.applyMatrix4(mtx);
    grp.name = `litzen-${side}`;
    out.push(grp);
  }
  return out;
}
