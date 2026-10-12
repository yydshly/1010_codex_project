/**
 * Hidden review asset for the US weapon models: shows a weapon in its own WEAPON-LOCAL frame (bore +Z,
 * top +Y, weapon's left +X, origin = trigger-grip centre) lifted so that the origin sits at y = 1.0,
 * with the metadata soldier builders rely on drawn as markers:
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
import { buildM1Garand } from '../usa/weapons/m1-garand.model';
import { buildThompsonM1A1 } from '../usa/weapons/thompson-m1a1.model';
import { buildBarM1918A2 } from '../usa/weapons/bar-m1918a2.model';

const LIFT = 1.0;

const mk = (c: number) => M.paint(c, { roughness: 0.45, wear: 0, dust: 0, colorVar: 0, cavity: 0, name: `usa-grip-marker-${c.toString(16)}` });

function ball(p: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  return part(new THREE.SphereGeometry(r, 16, 10), mat, { p: p.clone() });
}

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
  const tail = g.position.clone().addScaledVector(ax, -len / 2 - 0.015);
  const head = g.position.clone().addScaledVector(ax, len / 2 + 0.02);
  out.push(part(G.rod(tail, head, 0.0012, 8), mat));
  const cone = new THREE.ConeGeometry(0.0045, 0.014, 12);
  cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), ax));
  cone.translate(head.x + ax.x * 0.007, head.y + ax.y * 0.007, head.z + ax.z * 0.007);
  out.push(part(cone, mat));
  const pn = g.palm.clone().normalize();
  const s0 = g.position.clone().addScaledVector(pn, g.radius);
  const s1 = g.position.clone().addScaledVector(pn, g.radius + 0.035);
  out.push(part(G.rod(s0, s1, 0.0016, 8), mat));
  out.push(ball(s1, 0.0045, mat));
  out.push(ball(g.position, 0.0028, mat));
  return out;
}

async function buildWeapon(id: string): Promise<WeaponModel> {
  switch (id) {
    case 'thompson':
      return buildThompsonM1A1({ magazine: '30' });
    case 'thompson-nomag':
      return buildThompsonM1A1({ magazine: 'none' });
    case 'bar':
      return buildBarM1918A2({ bipod: 'folded' });
    case 'bar-deployed':
      return buildBarM1918A2({ bipod: 'deployed' });
    case 'bar-nobipod':
      return buildBarM1918A2({ bipod: 'none' });
    default:
      return buildM1Garand();
  }
}

const def: AssetDef = {
  id: 'test-usa-weapon-grips',
  name: 'US Weapon Grip Review',
  subtitle: 'Internal test',
  faction: 'usa',
  category: 'Weapons',
  countAs: 'looseEquipment',
  summary: 'Internal review of US weapon grip, shoulder, muzzle, sling and rest metadata in the weapon-local frame.',
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
      default: 'm1-garand',
      choices: [
        { id: 'm1-garand', label: 'M1 Garand' },
        { id: 'thompson', label: 'Thompson M1A1' },
        { id: 'thompson-nomag', label: 'Thompson M1A1, no magazine' },
        { id: 'bar', label: 'BAR M1918A2' },
        { id: 'bar-deployed', label: 'BAR M1918A2, bipod deployed' },
        { id: 'bar-nobipod', label: 'BAR M1918A2, bipod removed' },
      ],
    },
    { kind: 'toggle', id: 'sling', label: 'Sling', default: false, note: 'Sling hanging under gravity' },
    { kind: 'select', id: 'gravity', label: 'Gravity', default: 'down', choices: [
      { id: 'down', label: 'Down (-Y)' },
      { id: 'muzzle-up', label: 'Muzzle up (-Z)' },
      { id: 'left-down', label: 'Left side down (-X)' },
    ] },
  ],
  provenance: {
    method: 'Procedurally modelled in TypeScript for this project',
    author: 'Project team',
    license: 'Project-owned',
    textures: 'Procedural (generated in code)',
    references: [],
  },
  async build(config) {
    const w = await buildWeapon(String(config.weapon ?? 'm1-garand'));
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
    if (config.sling === true && w.sling) {
      const gv = config.gravity === 'muzzle-up' ? new THREE.Vector3(0, 0, -1) : config.gravity === 'left-down' ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, -1, 0);
      holder.add(w.sling.build(gv, 0.12));
    }
    return group([holder]);
  },
};
export default def;
