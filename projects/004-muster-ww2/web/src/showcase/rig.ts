/** 从上游构建函数提取真实部件；普通资料库仍使用原来的整体 bake。 */
import * as THREE from 'three';
import { bake, computeEdgeAttribute } from '../core/bake';
import type { AssetDef, AssetConfig } from '../core/types';
import { dirToAsset } from '../assets/usa/p51d/frame';
import { trackLayout as shermanLayout } from '../assets/usa/m4a3-sherman/track';
import { TRACK as SHERMAN } from '../assets/usa/m4a3-sherman/dims';
import { trackLayout as hellcatLayout } from '../assets/usa/m18-hellcat/track';
import { TRACK as HELLCAT } from '../assets/usa/m18-hellcat/dims';

interface JointData { kind: string; pivot?: number[]; radius?: number; angle?: number; front?: boolean; muzzle?: number[] }
export async function buildMotionTemplate(def: AssetDef, config: AssetConfig) {
  const raw = await def.build(config, { detail: 'high' });
  raw.updateMatrixWorld(true);
  const parts: { node: THREE.Object3D; data: JointData; matrix: THREE.Matrix4 }[] = [];
  raw.traverse(node => { if (node.userData.campMotion) parts.push({ node, data: node.userData.campMotion, matrix: node.matrixWorld.clone() }); });
  const root = new THREE.Group();
  for (const { node, data, matrix } of parts) {
    node.removeFromParent(); matrix.decompose(node.position, node.quaternion, node.scale);
    if (data.kind === 'track') {
      // 保留上游的逐节 InstancedMesh，避免把数百节履带扩成独立 draw call。
      node.traverse(o => {
        if (!(o instanceof THREE.InstancedMesh)) return;
        o.geometry = o.geometry.clone();
        if (o.geometry.index) computeEdgeAttribute(o.geometry);
        o.instanceMatrix.setUsage(THREE.DynamicDrawUsage); o.castShadow = true; o.receiveShadow = true;
        o.frustumCulled = false;
      });
      root.add(node); continue;
    }
    const holder = new THREE.Group(); holder.add(node);
    const baked = bake(holder).group;
    const pivot = new THREE.Vector3().fromArray(data.pivot ?? [0, 0, 0]).applyMatrix4(matrix);
    const joint = new THREE.Group(); joint.position.copy(pivot); baked.position.copy(pivot).negate();
    joint.userData.campMotion = { ...data, pivot: pivot.toArray() }; joint.add(baked); root.add(joint);
  }
  root.add(bake(raw).group); root.name = 'camp-rig-' + def.id;
  return root;
}

export class MechanicalRig {
  private wheels: { node: THREE.Object3D; data: JointData; angle: number }[] = [];
  private gear: { node: THREE.Object3D; data: JointData; angle: number }[] = [];
  private turrets: { node: THREE.Object3D; data: JointData }[] = [];
  private tracks: { node: THREE.InstancedMesh; connector: boolean }[] = [];
  private layout: number[][] = [];
  private pitch = 1;
  private matrix = new THREE.Matrix4();
  private axis = new THREE.Vector3(1, 0, 0);
  private inward = new THREE.Vector3();
  private along = new THREE.Vector3();
  private pos = new THREE.Vector3();
  private gearAxis = dirToAsset(new THREE.Vector3(0, 0, 1)).normalize();
  constructor(readonly root: THREE.Group, readonly assetId: string) {
    if (assetId.includes('sherman')) { this.layout = shermanLayout().joints; this.pitch = SHERMAN.pitch; }
    if (assetId.includes('hellcat')) { this.layout = hellcatLayout().joints; this.pitch = HELLCAT.pitch; }
    root.traverse(node => {
      const data = node.userData.campMotion as JointData | undefined;
      if (data?.kind === 'wheel') this.wheels.push({ node, data, angle: 0 });
      else if (data?.kind === 'turret') this.turrets.push({ node, data });
      else if (data && data.kind !== 'track') this.gear.push({ node, data, angle: 0 });
      if (data?.kind === 'track') node.children.forEach((child, i) => {
        if (child instanceof THREE.InstancedMesh) this.tracks.push({ node: child, connector: assetId.includes('sherman') ? i === 2 : i === 1 });
      });
    });
  }
  update(distance: number, turn: number, retracted: number) {
    for (const w of this.wheels) {
      // 转弯时外侧履带 / 车轮走得更远，内侧更慢。
      const sideDistance = distance - w.node.position.x * turn;
      w.angle = sideDistance / w.data.radius!;
      w.node.quaternion.setFromAxisAngle(this.axis, w.angle);
    }
    for (const g of this.gear) {
      const tail = g.data.kind.startsWith('tail');
      const sign = tail ? 1 : Math.sign(g.node.position.x);
      // 舱门后于支柱合拢；展开时先打开，给支柱留出空间。
      const progress = g.data.kind.includes('door') ? Math.max(0, (retracted - 0.65) / 0.35) : retracted;
      g.angle = (g.data.angle ?? 0) * sign * progress;
      g.node.quaternion.setFromAxisAngle(g.data.kind === 'tail-gear' ? this.axis : this.gearAxis, g.angle);
      g.node.visible = !g.data.kind.includes('gear') || retracted < 0.995;
    }
    for (const track of this.tracks) {
      // mirrorX 的左右两条履带保留独立实例缓冲。
      const side = Math.sign(track.node.parent!.scale.x);
      const width = this.assetId.includes('sherman') ? SHERMAN.x : HELLCAT.x;
      const offset = (distance - width * side * turn) / this.pitch;
      const n = this.layout.length;
      const at = (i: number) => {
        const u = ((i + offset) % n + n) % n, k = Math.floor(u), t = u - k;
        const a = this.layout[k], b = this.layout[(k + 1) % n];
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      };
      for (let i = 0; i < track.node.count; i++) {
        const a = at(track.connector ? i - 1 : i), b = at(i + 1), c = at(i);
        this.along.set(0, b[1] - a[1], b[0] - a[0]).normalize();
        this.inward.set(0, -this.along.z, this.along.y);
        this.pos.set(width, track.connector ? c[1] : (a[1] + b[1]) / 2, track.connector ? c[0] : (a[0] + b[0]) / 2);
        // 上游 link-local +Z 与沿闭环的行进切线相反，保持右手坐标与正行列式。
        this.matrix.makeBasis(this.axis, this.inward, this.along.negate()).setPosition(this.pos);
        track.node.setMatrixAt(i, this.matrix);
      }
      track.node.instanceMatrix.needsUpdate = true;
    }
  }
  aim(angle: number) { this.turrets.forEach(t => { t.node.rotation.y = angle; }); }
  muzzle() {
    const t = this.turrets[0];
    return t ? t.node.localToWorld(new THREE.Vector3().fromArray(t.data.muzzle ?? [0, 0.3, 3])) : this.root.localToWorld(new THREE.Vector3(0, 2, 3));
  }
  getState() {
    return { wheels: this.wheels.map(w => ({ angle: w.angle, pivot: w.node.position.toArray(), quaternion: w.node.quaternion.toArray() })),
      gear: this.gear.map(g => ({ kind: g.data.kind, angle: g.angle, visible: g.node.visible, quaternion: g.node.quaternion.toArray() })),
      turrets: this.turrets.map(t => ({ angle: t.node.rotation.y, pivot: t.node.position.toArray() })),
      tracks: this.tracks.map(t => { t.node.getMatrixAt(0, this.matrix); return { count: t.node.count, connector: t.connector, matrix0: this.matrix.toArray() }; }) };
  }
}
