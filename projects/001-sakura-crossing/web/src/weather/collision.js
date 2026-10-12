import * as THREE from 'three/webgpu';
import { buildModelBvh } from '@research/rain-kit/bvh';

// Static wall proxies authored from street.js dimensions. The original visible
// geometry supplies ground probes; these proxies only constrain lateral motion.
export const wallBoxes = [
  { size: [5.6, 4, 3.8], position: [1.8, 2.16, -1.95], name: '研究商店墙体' },
  ...[[-8.5,3.8],[-2.7,3.2],[3,4.4],[8.6,3.4]].map(([x,h]) => ({ size:[4.4,h,2.5],position:[x,.16+h/2,-7.5],name:'背景建筑' })),
  { size: [.6, 3.3, .6], position: [-3.95, 1.8, -.15], name: '樱花树干' },
  { size: [2.85, 2.35, .18], position: [-8.6, 2.16, -.25], name: '告示牌' },
  ...[-1.65,1.65].flatMap(x => [.6,-2.1].map(z => ({size:[.17,2.8,.17],position:[8.6+x,1.66,-1.5+z],name:'阅读亭柱'}))),
  { size: [2.8, .85, .8], position: [8.6, .58, -2.3], name:'阅读亭长椅' },
  { size: [.95,1.45,.35],position:[9.7,1.01,-3.3],name:'书柜' },
  ...[-11.8,-6.3,5,11.6].map(x => ({size:[.9,.8,.85],position:[x,.5,-.6],name:'花箱'})),
  { size: [2.3,1,.8], position:[-3.75,.6,-2.2],name:'树下长椅' },
  ...[-11.3,11.5,-12.8,12.6].map(x => ({size:[.2,4.6,.2],position:[x,2.3,x===-11.3||x===11.5?1.2:-.8],name:'灯杆'})),
  { size: [34,2,.12],position:[0,1,7.65],name:'街边护栏' },
  ...[-16.5,16.5].map(x => ({size:[.15,4,22],position:[x,2,-1.5],name:'街区边界'})),
  { size:[34,4,.15],position:[0,2,-10],name:'街区后界' },
];
export function createStreetColliders() {
  const root = new THREE.Group(); root.name = 'SakuraWalkColliders'; root.visible = false;
  const material = new THREE.MeshBasicMaterial();
  for (const {size,position,name} of wallBoxes) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size),material);
    mesh.position.fromArray(position); mesh.name = name; root.add(mesh);
  }
  buildModelBvh(root); root.updateMatrixWorld(true);
  return { root, dispose() {
    root.removeFromParent();
    root.traverse(mesh => { mesh.geometry?.disposeBoundsTree?.(); mesh.geometry?.dispose(); });
    material.dispose();
  } };
}
