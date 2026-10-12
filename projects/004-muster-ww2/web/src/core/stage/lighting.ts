/**
 * Photographic studio lighting shared by every view (app, thumbnails, review harness).
 * Soft key light with contact shadows, gentle fill and rim, image-based ambient.
 * Shadows keep the dark side readable: never crush shadows to hide modelling.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** Direction TOWARDS the key light (from the scene). Key comes from front-left, high. */
export const LIGHT_DIR = new THREE.Vector3(-0.55, 0.78, 0.42).normalize();

export interface LightRig {
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  exposure: number;
}

export function createLighting(renderer: THREE.WebGLRenderer, scene: THREE.Scene): LightRig {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xfff1e0, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.bias = -0.00015;
  key.shadow.radius = 2.5;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight(0xdfe7f2, 0.55);
  fill.position.set(8, 5, -4);
  const rim = new THREE.DirectionalLight(0xfff8f0, 0.7);
  rim.position.set(2, 6, -10);
  const hemi = new THREE.HemisphereLight(0xf2eee8, 0x6b604f, 0.35);
  scene.add(fill, rim, hemi);
  return { key, fill, rim, hemi, exposure: 1.0 };
}
