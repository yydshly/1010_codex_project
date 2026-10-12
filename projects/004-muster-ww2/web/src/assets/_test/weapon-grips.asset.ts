/**
 * Hidden review asset: shows a weapon model in its own WEAPON-LOCAL frame (bore +Z, top +Y, weapon's
 * left +X, origin = trigger-grip centre) lifted so that the origin sits at y = 1.0, with the metadata
 * that soldier builders rely on drawn as markers:
 *
 *   trigger grip  cyan cage (cylinder of grip.radius x grip.length along grip.axis), cone tip on the
 *                 +axis end (thumb / index side), rod + ball along grip.palm from the surface
 *   support grip  the same in orange
 *   shoulder      green ball          muzzle        red ball
 *   sling points  yellow balls        rest points   white balls
 *
 * The weapon deliberately floats (review only; minY is not 0). Not shown in the library.
 */
import { THREE, M, G, part, group } from '../../core/kit';
import type { AssetDef } from '../../core/types';
import type { WeaponModel, Grip } from '../shared/contracts';
import { buildKar98k } from '../germany/weapons/kar98k.model';
import { buildMp40 } from '../germany/weapons/mp40.model';
import { buildMg42 } from '../germany/weapons/mg42.model';
import { buildMosin9130 } from '../soviet/weapons/mosin-9130.model';
import { buildPpsh41 } from '../soviet/weapons/ppsh41.model';
import { buildDp27 } from '../soviet/weapons/dp27.model';

const LIFT = 1.0;

const mk = (c: number) => M.paint(c, { roughness: 0.45, wear: 0, dust: 0, colorVar: 0, cavity: 0, name: `grip-marker-${c.toString(16)}` });

function ball(p: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  return part(new THREE.SphereGeometry(r, 16, 10), mat, { p: p.clone() });
}

/** Cage of the gripped cylinder, the axis arrow and the palm indicator. */
function gripMarker(g: Grip, mat: THREE.Material): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const ax = g.axis.clone().normalize();
  const len = g.length ?? 0.08;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), ax);
  const e1 = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
  const e2 = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
  for (const t of [-0.5, 0, 0.5]) {
    const ring = G.torus(g.radius, 0.0009, 6, 40);
    ring.applyQuaternion(q);
    const c = g.position.clone().addScaledVector(ax, t * len);
    ring.translate(c.x, c.y, c.z);
    out.push(part(ring, mat));
  }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const off = e1.clone().multiplyScalar(Math.cos(a) * g.radius).addScaledVector(e2, Math.sin(a) * g.radius);
    const a0 = g.position.clone().add(off).addScaledVector(ax, -len / 2);
    const a1 = g.position.clone().add(off).addScaledVector(ax, len / 2);
    out.push(part(G.rod(a0, a1, 0.0006, 5), mat));
  }
  // axis arrow through the centre, cone on the +axis end
  const tail = g.position.clone().addScaledVector(ax, -len / 2 - 0.015);
  const head = g.position.clone().addScaledVector(ax, len / 2 + 0.02);
  out.push(part(G.rod(tail, head, 0.0012, 8), mat));
  const cone = new THREE.ConeGeometry(0.0045, 0.014, 12);
  cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ax));
  cone.translate(head.x + ax.x * 0.007, head.y + ax.y * 0.007, head.z + ax.z * 0.007);
  out.push(part(cone, mat));
  // palm: from the gripped surface outwards
  const pn = g.palm.clone().normalize();
  const s0 = g.position.clone().addScaledVector(pn, g.radius);
  const s1 = g.position.clone().addScaledVector(pn, g.radius + 0.035);
  out.push(part(G.rod(s0, s1, 0.0016, 8), mat));
  out.push(ball(s1, 0.0045, mat));
  out.push(ball(g.position, 0.0028, mat));
  return out;
}

function buildWeapon(id: string): WeaponModel {
  switch (id) {
    case 'kar98k':
      return buildKar98k();
    case 'mp40':
      return buildMp40();
    case 'mp40-folded':
      return buildMp40({ stock: 'folded' });
    case 'mg42':
      return buildMg42();
    case 'mg42-deployed':
      return buildMg42({ bipod: 'deployed' });
    case 'mosin':
      return buildMosin9130();
    case 'ppsh':
      return buildPpsh41();
    case 'ppsh-box':
      return buildPpsh41({ magazine: 'box' });
    case 'dp27-deployed':
      return buildDp27({ bipod: 'deployed' });
    default:
      return buildDp27();
  }
}

const def: AssetDef = {
  id: 'test-weapon-grips',
  name: 'Weapon Grip Review',
  subtitle: 'Internal test',
  faction: 'germany',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary: 'Internal review of weapon grip, shoulder, muzzle, sling and rest metadata in the weapon-local frame.',
  facts: [],
  status: 'available',
  hidden: true,
  footprint: { w: 0.4, l: 1.4 },
  spacing: { default: 1.6, min: 1, max: 4 },
  maxQuantity: 2,
  options: [
    {
      kind: 'select',
      id: 'weapon',
      label: 'Weapon',
      default: 'dp27',
      choices: [
        { id: 'kar98k', label: 'Kar98k' },
        { id: 'mp40', label: 'MP 40' },
        { id: 'mp40-folded', label: 'MP 40, stock folded' },
        { id: 'mg42', label: 'MG 42' },
        { id: 'mg42-deployed', label: 'MG 42, bipod deployed' },
        { id: 'mosin', label: 'Mosin-Nagant M1891/30' },
        { id: 'ppsh', label: 'PPSh-41, drum' },
        { id: 'ppsh-box', label: 'PPSh-41, box magazine' },
        { id: 'dp27', label: 'DP-27' },
        { id: 'dp27-deployed', label: 'DP-27, bipod deployed' },
      ],
    },
    { kind: 'toggle', id: 'sling', label: 'Sling', default: false, note: 'Sling hanging under gravity (-Y), slack 0.12 m' },
  ],
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project',
    author: 'Project team',
    license: 'Project-owned',
    textures: 'Procedural (generated in code)',
    references: [],
  },
  build(config) {
    const w = buildWeapon(String(config.weapon ?? 'dp27'));
    const cyan = mk(0x19c3e6), orange = mk(0xf07a1e), green = mk(0x3cc84a), red = mk(0xe0282a), yellow = mk(0xf0d020), white = mk(0xf2f2f2);
    const markers: THREE.Object3D[] = [
      ...gripMarker(w.grips.trigger, cyan),
      ...gripMarker(w.grips.support, orange),
      ball(w.muzzle, 0.006, red),
    ];
    if (w.shoulder) markers.push(ball(w.shoulder, 0.006, green));
    if (w.sling) markers.push(ball(w.sling.front, 0.0045, yellow), ball(w.sling.rear, 0.0045, yellow));
    for (const r of w.restPoints) markers.push(ball(r, 0.004, white));
    const holder = group([w.object, ...markers], { p: [0, LIFT, 0], name: `${w.id}-grip-review` });
    if (config.sling === true && w.sling) holder.add(w.sling.build(new THREE.Vector3(0, -1, 0), 0.12));
    return group([holder]);
  },
};
export default def;
