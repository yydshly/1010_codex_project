/** Neutral 1.80 m scale figure for proportion checks in the harness (not a catalog asset). */
import * as THREE from 'three';

export function scaleFigure(): THREE.Group {
  const mat = new THREE.MeshStandardMaterial({ color: 0xb9b4ab, roughness: 0.7 });
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, x: number, y: number, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  };
  add(new THREE.CapsuleGeometry(0.065, 0.78, 6, 16), 0.1, 0.46);
  add(new THREE.CapsuleGeometry(0.065, 0.78, 6, 16), -0.1, 0.46);
  add(new THREE.CapsuleGeometry(0.17, 0.42, 8, 20), 0, 1.2);
  add(new THREE.CapsuleGeometry(0.045, 0.62, 6, 12), 0.25, 1.12);
  add(new THREE.CapsuleGeometry(0.045, 0.62, 6, 12), -0.25, 1.12);
  add(new THREE.SphereGeometry(0.105, 24, 16), 0, 1.69);
  g.name = 'scale-figure-1.80m';
  return g;
}
