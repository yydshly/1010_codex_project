/**
 * Studio: renderer, camera, photographic lighting, environment, ground and
 * post-processing, shared by the app, the review harness and the thumbnail renderer
 * so every view of a model uses the same light.
 *
 * Renders on demand only: call `invalidate()` after any change. Nothing animates by itself.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { N8AOPass } from 'n8ao';
import { setMaxAnisotropy } from './materials/textures';
import { buildGround, type GroundMode, type GroundHandle } from './stage/ground';
import { createLighting, LIGHT_DIR } from './stage/lighting';

export { LIGHT_DIR };

export interface StudioOptions {
  canvas?: HTMLCanvasElement;
  ground?: GroundMode;
  /** Screen-space ambient occlusion (contact shading). Default true. */
  ao?: boolean;
  preserveDrawingBuffer?: boolean;
  pixelRatio?: number;
  width?: number;
  height?: number;
}

export class Studio {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** Put models here. */
  readonly content = new THREE.Group();
  /** Overlays (selection markers, placement ghosts) that should not cast shadows. */
  readonly overlay = new THREE.Group();
  readonly key: THREE.DirectionalLight;
  readonly fill: THREE.DirectionalLight;
  readonly rim: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly ground: GroundHandle;
  private composer: EffectComposer | null = null;
  private ao: N8AOPass | null = null;
  private smaa: SMAAPass | null = null;
  private dirty = true;
  private raf = 0;
  private listeners: (() => void)[] = [];
  width: number;
  height: number;

  constructor(opts: StudioOptions = {}) {
    this.width = opts.width ?? 800;
    this.height = opts.height ?? 600;
    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: true,
      preserveDrawingBuffer: opts.preserveDrawingBuffer ?? false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(opts.pixelRatio ?? Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());

    this.camera = new THREE.PerspectiveCamera(35, this.width / this.height, 0.05, 1500);
    this.camera.position.set(14, 8, 18);

    const rig = createLighting(this.renderer, this.scene);
    this.key = rig.key;
    this.fill = rig.fill;
    this.rim = rig.rim;
    this.hemi = rig.hemi;
    this.renderer.toneMappingExposure = rig.exposure;

    this.scene.add(this.content, this.overlay);
    this.ground = buildGround(opts.ground ?? 'plinth');
    this.scene.add(this.ground.object);
    this.scene.background = this.ground.background;

    if (opts.ao !== false) this.setupPost();
    this.fitShadows(new THREE.Vector3(0, 0, 0), 12);
  }

  private setupPost() {
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(this.width, this.height);
    // N8AO renders the scene itself (replaces RenderPass) and adds soft contact occlusion.
    this.ao = new N8AOPass(this.scene, this.camera, size.x, size.y);
    this.ao.configuration.gammaCorrection = false;
    this.ao.configuration.transparencyAware = true;
    this.ao.configuration.aoRadius = 0.5;
    this.ao.configuration.distanceFalloff = 1.0;
    this.ao.configuration.intensity = 2.2;
    this.ao.setQualityMode('High');
    this.composer.addPass(this.ao);
    this.smaa = new SMAAPass();
    this.composer.addPass(this.smaa);
    this.composer.addPass(new OutputPass());
  }

  setSize(w: number, h: number) {
    this.width = Math.max(1, Math.floor(w));
    this.height = Math.max(1, Math.floor(h));
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(this.width, this.height);
    }
    this.invalidate();
  }

  /**
   * Keep shadows crisp at every zoom level: centre the key light's shadow frustum on
   * what the camera looks at, sized to the viewing distance.
   */
  fitShadows(center: THREE.Vector3, radius: number) {
    const r = THREE.MathUtils.clamp(radius, 2.5, 90);
    const cam = this.key.shadow.camera as THREE.OrthographicCamera;
    cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r;
    cam.near = 0.5;
    cam.far = 400;
    // snap the centre to shadow texels to avoid shimmering while panning
    const texel = (2 * r) / this.key.shadow.mapSize.x;
    const c = center.clone();
    c.x = Math.round(c.x / texel) * texel;
    c.z = Math.round(c.z / texel) * texel;
    this.key.target.position.copy(c);
    this.key.position.copy(c).addScaledVector(LIGHT_DIR, 150);
    this.key.shadow.normalBias = texel * 1.2;
    cam.updateProjectionMatrix();
    this.key.shadow.needsUpdate = true;
    this.invalidate();
  }

  /** Adapt AO radius and near plane to the viewing distance. */
  adaptToDistance(distance: number) {
    const near = THREE.MathUtils.clamp(distance * 0.01, 0.01, 1.0);
    if (Math.abs(this.camera.near - near) / near > 0.05) {
      this.camera.near = near;
      this.camera.far = Math.max(600, distance * 12);
      this.camera.updateProjectionMatrix();
    }
    if (this.ao) this.ao.configuration.aoRadius = THREE.MathUtils.clamp(distance * 0.045, 0.05, 2.5);
  }

  /** Frame an object's bounding sphere from yaw/pitch (degrees). */
  frame(object: THREE.Object3D | THREE.Box3, yaw = 35, pitch = 22, fit = 1.0): { target: THREE.Vector3; distance: number } {
    const box = object instanceof THREE.Box3 ? object : new THREE.Box3().setFromObject(object, true);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const center = box.getCenter(new THREE.Vector3());
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const tY = Math.tan(vfov / 2) * 0.9, tX = tY * this.camera.aspect;
    const y = THREE.MathUtils.degToRad(yaw), p = THREE.MathUtils.degToRad(pitch);
    const dir = new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
    // Fit the 8 box corners tightly: for each corner, the distance at which it projects inside the frame.
    const fwd = dir.clone().negate();
    const worldUp = Math.abs(dir.y) > 0.99 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(fwd, worldUp).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    let dist = 0;
    for (let i = 0; i < 8; i++) {
      const c = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(center);
      const along = c.dot(dir);
      dist = Math.max(dist, Math.abs(c.dot(right)) / tX + along, Math.abs(c.dot(up)) / tY + along);
    }
    dist = Math.max(dist * fit, 0.05);
    this.camera.up.copy(worldUp);
    this.camera.position.copy(center).addScaledVector(dir, dist);
    this.camera.lookAt(center);
    this.adaptToDistance(dist);
    this.fitShadows(center, Math.max(sphere.radius * 1.6, dist * 0.6));
    this.invalidate();
    return { target: center.clone(), distance: dist };
  }

  invalidate() {
    this.dirty = true;
  }

  /** Render resolution scale (1 = CSS pixels). Use higher values for still frames. */
  setPixelRatio(r: number) {
    if (Math.abs(this.renderer.getPixelRatio() - r) < 1e-3) return;
    this.renderer.setPixelRatio(r);
    this.setSize(this.width, this.height);
  }

  /** AO strength (0 disables). */
  setAOIntensity(v: number) {
    if (this.ao) this.ao.configuration.intensity = v;
    this.invalidate();
  }

  onAfterRender(fn: () => void) {
    this.listeners.push(fn);
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
    this.dirty = false;
    for (const l of this.listeners) l();
  }

  /** Start the on-demand loop (renders only when invalidated). `tick` runs every frame (for damping). */
  start(tick?: () => boolean | void) {
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const changed = tick?.();
      if (changed) this.dirty = true;
      if (this.dirty) this.render();
    };
    loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }
}
