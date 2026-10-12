/**
 * Frog, bayonet, W.E. Patt. '37 (No. 4 pattern) with the Bayonet No. 4 Mk II in its No. 4 Mk I
 * scabbard - worn on the LEFT side of the belt (battle order).
 *
 *  - Frog: a web belt loop (the frog's top folded round the 2 1/4-in. belt and sewn), below it a
 *    short tongue with a stitched buttonhole for the scabbard's frog stud, and a web loop the
 *    scabbard passes through. Edges and loops box-stitched.
 *  - Scabbard No. 4 Mk I: black-painted steel tube, round, tapering, with a mouthpiece and a
 *    ball-ended chape; a flat frog stud near the mouth on the frog side.
 *  - Bayonet No. 4 Mk II: the plain round spike (8 in.) is inside the scabbard; the socket with its
 *    locking ring and spring catch stands above the mouth. The bayonet model is the Lee-Enfield
 *    author's (src/assets/uk/weapons/lee-enfield-no4/bayonet.ts, imported read-only) so the
 *    loose and the fixed bayonet match.
 *
 * Gear frame (mount 'belt-left'): ORIGIN on the belt's OUTER face at belt mid-height, +Z away
 * from the body, +Y up; the belt occupies y = -0.0285..0.0285, z = -0.0034..0; the loop's back
 * layer lies behind the belt (z < -0.0034, hidden). The scabbard hangs vertically, point down,
 * in front of the tongue; its mouth 0.03 m below the belt centre.
 */
import { THREE, G, part, group } from '../../../core/kit';
import type { GearPiece } from '../../shared/contracts';
import { UK } from './palette';
import { BELT37 } from './belt';
import { stitches, merge, boxX, taperedSheet, smoothstep } from './helpers';
import { buildNo4Bayonet, NO4_BAYONET } from '../weapons/lee-enfield-no4/bayonet';
import { ukwMaterials } from '../weapons/common/materials';

export const NO4_SCABBARD = {
  /** Length mouth to chape tip, radius at the mouth / near the tip. */
  length: 0.213,
  rMouth: 0.0108,
  rTip: 0.0074,
};

const FT = 0.0021; // frog webbing
const LW = 0.05; // frog width (belt loop)

export interface FrogOptions {
  /** Include the bayonet and scabbard (default true); false = the empty frog. */
  bayonet?: boolean;
}

export function buildBayonetFrog37(opts: FrogOptions = {}): GearPiece {
  const withBayonet = opts.bayonet ?? true;
  const BW = BELT37.width, BT = BELT37.t;
  const web = UK.webStrap(), thread = UK.thread();
  const parts: THREE.Object3D[] = [];
  const st: THREE.BufferGeometry[] = [];

  // scabbard axis (vertical) in front of the tongue
  const scZ = 0.0035 + FT + NO4_SCABBARD.rMouth + 0.0006;
  const yMouth = -0.03;

  // ---- belt loop + tongue: one folded strip ----
  {
    const zf = FT / 2 + 0.0003; // front layer centre
    const zb = -BT - FT / 2 - 0.0003; // back layer centre (behind the belt)
    const top = BW / 2 + FT / 2 + 0.0006;
    const bot = -BW / 2 - FT / 2 - 0.0006;
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const push = (y: number, z: number, n: [number, number, number]) => {
      pts.push(new THREE.Vector3(0, y, z));
      nrm.push(new THREE.Vector3(...n).normalize());
    };
    // back layer from its sewn end below the belt, up behind the belt
    push(bot - 0.012, zb + 0.0015, [0, 0, -1]);
    push(bot + 0.004, zb, [0, 0, -1]);
    push(top - 0.004, zb, [0, 0, -1]);
    // over the top edge
    const rc = (zf - zb) / 2, cz = (zf + zb) / 2;
    for (let k = 1; k < 6; k++) {
      const a = Math.PI - (k / 6) * Math.PI;
      push(top - 0.004 + Math.sin(a) * rc * 1.1, cz + Math.cos(a) * rc, [0, Math.sin(a), Math.cos(a)]);
    }
    // down the front of the belt, then the tongue below it
    push(top - 0.004, zf, [0, 0, 1]);
    push(0, zf, [0, 0, 1]);
    push(bot, zf + 0.0002, [0, 0, 1]);
    push(bot - 0.012, zf + 0.0008, [0, 0, 1]);
    push(yMouth - 0.03, zf + 0.001, [0, 0, 1]);
    push(yMouth - 0.064, zf + 0.001, [0, 0, 1]);
    // the tongue narrows a little below the belt loop and ends rounded
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const Ltot = curve.getLength();
    let sBelow = Ltot * 0.7;
    for (let i = 200; i >= 0; i--) {
      if (curve.getPointAt(i / 200).y > bot - 0.004) { sBelow = (i / 200) * Ltot; break; }
    }
    const hwF = (t: number) => {
      const sArc = t * Ltot;
      let w = LW / 2 - 0.004 * smoothstep(sBelow, sBelow + 0.02, sArc);
      const rc = 0.008, d = Ltot - sArc;
      if (d < rc) w = Math.min(w, w - rc + Math.sqrt(Math.max(0, rc * rc - (rc - d) ** 2)));
      return Math.max(0.0005, w);
    };
    parts.push(part(taperedSheet(pts, nrm, hwF, FT, { samples: 90 }), web, { name: 'frog' }));
    // the back layer is sewn to the tongue below the belt: a short bridge closing the loop
    parts.push(part(G.strap([new THREE.Vector3(0, bot - 0.012, zb + 0.0015), new THREE.Vector3(0, bot - 0.02, (zb + zf) / 2), new THREE.Vector3(0, bot - 0.026, zf - FT)], LW, FT, [0, 0, -1], { samples: 8 }), web));
    // stitching: box stitch below the belt (loop closure), edge rows on the tongue
    st.push(boxX(0, bot - 0.02, LW - 0.012, 0.014, zf + FT / 2 + 0.0012));
    for (const sg of [-1, 1]) {
      st.push(stitches([new THREE.Vector3(sg * (LW / 2 - 0.003), top - 0.006, zf + FT / 2 + 0.0002), new THREE.Vector3(sg * (LW / 2 - 0.003), bot - 0.004, zf + FT / 2 + 0.0004), new THREE.Vector3(sg * (LW / 2 - 0.007), bot - 0.026, zf + FT / 2 + 0.0008), new THREE.Vector3(sg * (LW / 2 - 0.007), yMouth - 0.058, zf + FT / 2 + 0.0012)], { len: 0.0032, gap: 0.0019, r: 0.00045 }));
    }
    // stitched buttonhole for the frog stud (an oval ring of stitches)
    const bh: THREE.Vector3[] = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      bh.push(new THREE.Vector3(Math.cos(a) * 0.0024, yMouth - 0.022 + Math.sin(a) * 0.0065, zf + FT / 2 + 0.0011));
    }
    st.push(stitches(bh, { len: 0.0012, gap: 0.0006, r: 0.00042 }));
  }

  // ---- scabbard loop: a web band round the scabbard, sewn to the tongue ----
  const loopY = yMouth - 0.05;
  {
    const r = NO4_SCABBARD.rMouth - 0.0008 + FT / 2 + 0.0003;
    const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
    const zt = FT / 2 + 0.0003 + FT + 0.0003; // lies on the tongue's front face
    const N = 22;
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
      let x = Math.cos(a) * (r + 0.0006), z = scZ + Math.sin(a) * r;
      if (z < zt) z = zt; // flattened where it lies on the tongue
      if (Math.sin(a) < -0.6) x *= 1.25;
      pts.push(new THREE.Vector3(x, loopY, z));
      nrm.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    // make it a band along Y: strap with width along Y needs the path in the XZ plane
    parts.push(part(G.strap(pts, 0.024, FT, nrm, { closed: true, samples: 44 }), web));
    for (const dy of [-0.0085, 0.0085]) {
      const sp: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const a = -0.2 + (i / 16) * (Math.PI + 0.4);
        sp.push(new THREE.Vector3(Math.cos(a) * (r + FT / 2 + 0.0003), loopY + dy, scZ + Math.sin(a) * (r + FT / 2 + 0.0003)));
      }
      st.push(stitches(sp, { len: 0.003, gap: 0.0018, r: 0.00042 }));
    }
  }
  parts.push(part(merge(st), thread));

  // ---- scabbard + bayonet ----
  if (withBayonet) {
    const { length: SL, rMouth: R0, rTip: R1 } = NO4_SCABBARD;
    const paint = UK.scabbard();
    // lathe along +Y then flipped so the mouth is at the top
    const prof: [number, number][] = [
      [0.0072, 0.0015],
      [R0 + 0.0012, 0.0012],
      [R0 + 0.0014, -0.0008],
      [R0 + 0.0014, -0.009],
      [R0 + 0.0004, -0.0102],
      [R0, -0.0115],
      [R0 - 0.0004, -0.05],
      [R1 + 0.0006, -SL + 0.03],
      [R1, -SL + 0.014],
      [R1 + 0.0012, -SL + 0.009],
      [R1 + 0.0015, -SL + 0.004],
      [R1 * 0.75, -SL + 0.0006],
      [0, -SL],
    ];
    const sc = G.lathe(prof.slice().reverse(), 32, 40); // bottom -> top (outward faces)
    sc.translate(0, yMouth, scZ);
    parts.push(part(sc, paint, { name: 'scabbard' }));
    // frog stud on the back of the scabbard, through the buttonhole
    const stud = G.lathe([[0, 0], [0.0032, 0], [0.0032, 0.0014], [0.0046, 0.0019], [0.0046, 0.0029], [0.0038, 0.0034], [0, 0.0034]], 16, 40);
    stud.rotateX(-Math.PI / 2); // axis +Y -> -Z (towards the tongue)
    stud.scale(1, 1.6, 1);
    stud.translate(0, yMouth - 0.022, scZ - R0 + 0.0008);
    parts.push(part(stud, paint));
    // bayonet: weapon-local +Z (point) -> -Y; the socket front seats on the mouthpiece
    const bay = buildNo4Bayonet(ukwMaterials(), true);
    const holder = group([bay]);
    holder.rotation.x = Math.PI / 2;
    holder.position.set(0, yMouth + 0.0015 + NO4_BAYONET.socketFront, scZ);
    // spring catch towards the wearer's rear (gear -X is the rear side on the left hip)
    const turn = group([holder]);
    parts.push(turn);
  }

  const object = group(parts);
  object.name = 'uk-bayonet-frog-37';
  const size = new THREE.Box3().setFromObject(object, true).getSize(new THREE.Vector3());
  return {
    id: 'uk-bayonet-frog-37',
    name: withBayonet ? 'Bayonet No. 4 Mk II in scabbard, Patt. 37 frog' : 'Frog, bayonet, Patt. 37',
    object,
    mount: 'belt-left',
    size: { w: size.x, h: size.y, d: size.z },
    belt: { loopWidth: BW },
  };
}
