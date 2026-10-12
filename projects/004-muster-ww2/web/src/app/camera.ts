/**
 * Camera rig: OrbitControls with damping (orbit / zoom-to-cursor / ground-plane pan),
 * zoom range 0.35 m - 160 m, never below the ground, target clamped to the display area,
 * plus short eased tweens for Focus Selection / Reset View. Frames are driven by the scene's
 * on-demand loop: update() reports whether the camera moved this frame.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLINTH } from '../core/stage/ground';
import type { CameraView } from './types';

const D2R = Math.PI / 180;
export const MIN_DISTANCE = 0.35;
export const MAX_DISTANCE = 160;
const MAX_POLAR = 87 * D2R;
const MIN_POLAR = 0.02;

export const DEFAULT_VIEW: CameraView = { target: [0, 0.3, 0], distance: 58, yaw: 36, pitch: 24 };

/**
 * Distance at which boxes fit the view from yaw/pitch around `center` (same corner fit as
 * Studio.frame, but over every box's own corners, so sparse layouts frame tightly).
 */
export function fitDistance(boxes: THREE.Box3 | THREE.Box3[], yaw: number, pitch: number, cam: THREE.PerspectiveCamera, fit = 1, center?: THREE.Vector3): number {
  const list = Array.isArray(boxes) ? boxes : [boxes];
  if (!center) {
    const u = new THREE.Box3();
    for (const b of list) u.union(b);
    center = u.getCenter(new THREE.Vector3());
  }
  const tY = Math.tan((cam.fov * D2R) / 2) * 0.9, tX = tY * cam.aspect;
  const y = yaw * D2R, p = pitch * D2R;
  const dir = new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
  const fwd = dir.clone().negate();
  const worldUp = Math.abs(dir.y) > 0.99 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(fwd, worldUp).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  let dist = 0;
  const c = new THREE.Vector3();
  for (const box of list) {
    for (let i = 0; i < 8; i++) {
      c.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(center);
      const along = c.dot(dir);
      dist = Math.max(dist, Math.abs(c.dot(right)) / tX + along, Math.abs(c.dot(up)) / tY + along);
    }
  }
  return Math.max(dist * fit, MIN_DISTANCE);
}

/**
 * Target + distance that frame the boxes from yaw/pitch with the composition centred in the
 * picture. A plain box-centre target leaves perspective compositions off-centre (the near
 * edge looms large, the far edge shrinks), so the target is slid along the ground - sideways
 * and towards/away from the viewer, never up or down - until the projected bounds are centred,
 * refitting the distance each time.
 */
export function solveFrame(boxes: THREE.Box3[], yaw: number, pitch: number, cam: THREE.PerspectiveCamera, fit = 1): { center: THREE.Vector3; distance: number } {
  const u = new THREE.Box3();
  for (const b of boxes) u.union(b);
  const center = u.getCenter(new THREE.Vector3());
  const y = yaw * D2R, p = pitch * D2R;
  const dir = new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
  const fwd = dir.clone().negate();
  const worldUp = Math.abs(dir.y) > 0.99 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(fwd, worldUp).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  const flat = new THREE.Vector3(Math.sin(y), 0, Math.cos(y));
  const tY = Math.tan((cam.fov * D2R) / 2), tX = tY * cam.aspect;
  const corners: THREE.Vector3[] = [];
  for (const b of boxes) {
    for (let i = 0; i < 8; i++) corners.push(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
  }
  let dist = fitDistance(boxes, yaw, pitch, cam, fit, center);
  const eye = new THREE.Vector3(), v = new THREE.Vector3();
  for (let it = 0; it < 6; it++) {
    eye.copy(center).addScaledVector(dir, dist);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const c of corners) {
      v.copy(c).sub(eye);
      const z = Math.max(1e-3, v.dot(fwd));
      const sx = v.dot(right) / (z * tX), sy = v.dot(up) / (z * tY);
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    }
    const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
    if (Math.abs(mx) < 0.004 && Math.abs(my) < 0.004) break;
    center.addScaledVector(right, THREE.MathUtils.clamp(mx * dist * tX, -dist, dist));
    center.addScaledVector(flat, THREE.MathUtils.clamp((-my * dist * tY) / Math.max(Math.sin(p), 0.2), -dist, dist));
    dist = fitDistance(boxes, yaw, pitch, cam, fit, center);
  }
  return { center, distance: dist };
}

interface Tween {
  t0: number;
  dur: number;
  fromT: THREE.Vector3;
  toT: THREE.Vector3;
  r0: number;
  r1: number;
  th0: number;
  th1: number;
  ph0: number;
  ph1: number;
}

export class CameraRig {
  readonly controls: OrbitControls;
  onEnd: () => void = () => {};
  private tween: Tween | null = null;
  private pointerActive = false;
  private sph = new THREE.Spherical();

  constructor(readonly camera: THREE.PerspectiveCamera, dom: HTMLElement, private onChange: () => void) {
    const c = new OrbitControls(camera, dom);
    c.enableDamping = true;
    c.dampingFactor = 0.085;
    c.minDistance = MIN_DISTANCE;
    c.maxDistance = MAX_DISTANCE;
    c.maxPolarAngle = MAX_POLAR;
    c.minPolarAngle = MIN_POLAR;
    c.zoomToCursor = true;
    c.screenSpacePanning = false;
    c.rotateSpeed = 0.55;
    c.panSpeed = 0.9;
    c.zoomSpeed = 1.1;
    c.addEventListener('change', () => this.onChange());
    c.addEventListener('start', () => {
      this.pointerActive = true;
      this.tween = null;
      this.onChange();
    });
    c.addEventListener('end', () => {
      this.pointerActive = false;
      this.onEnd();
    });
    this.controls = c;
  }

  /** User gesture or tween in progress. */
  get active(): boolean {
    return this.pointerActive || !!this.tween;
  }

  get target(): THREE.Vector3 {
    return this.controls.target;
  }

  get distance(): number {
    return this.camera.position.distanceTo(this.controls.target);
  }

  getView(): CameraView {
    const t = this.controls.target;
    this.sph.setFromVector3(this.camera.position.clone().sub(t));
    const r = (v: number, k = 1000) => Math.round(v * k) / k;
    return {
      target: [r(t.x), r(t.y), r(t.z)],
      distance: r(this.sph.radius),
      yaw: r((((this.sph.theta / D2R) % 360) + 360) % 360, 100),
      pitch: r(90 - this.sph.phi / D2R, 100),
    };
  }

  setView(v: CameraView, animate = false, duration = 650) {
    const target = new THREE.Vector3(v.target[0], v.target[1], v.target[2]);
    this.clampPoint(target);
    const r = THREE.MathUtils.clamp(v.distance, MIN_DISTANCE, MAX_DISTANCE);
    const phi = THREE.MathUtils.clamp((90 - v.pitch) * D2R, MIN_POLAR, MAX_POLAR);
    const theta = v.yaw * D2R;
    this.killDamping();
    if (animate) {
      const s = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
      let dTh = theta - s.theta;
      dTh = ((((dTh + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
      this.tween = {
        t0: performance.now(),
        dur: duration,
        fromT: this.controls.target.clone(),
        toT: target,
        r0: s.radius,
        r1: r,
        th0: s.theta,
        th1: s.theta + dTh,
        ph0: s.phi,
        ph1: phi,
      };
    } else {
      this.tween = null;
      this.controls.target.copy(target);
      this.camera.position.setFromSpherical(new THREE.Spherical(r, phi, theta)).add(target);
      this.camera.lookAt(target);
      this.controls.update();
    }
    this.onChange();
  }

  /** Frame boxes (one per model), keeping the current viewing angle unless yaw/pitch are given. */
  frameBoxes(boxes: THREE.Box3[], opts: { yaw?: number; pitch?: number; fit?: number; animate?: boolean; minDistance?: number } = {}) {
    const u = new THREE.Box3();
    for (const b of boxes) u.union(b);
    if (u.isEmpty()) return;
    const cur = this.getView();
    const yaw = opts.yaw ?? cur.yaw;
    const pitch = opts.pitch ?? THREE.MathUtils.clamp(cur.pitch, 8, 62);
    const f = solveFrame(boxes, yaw, pitch, this.camera, opts.fit ?? 1.12);
    const c = f.center;
    const d = Math.max(f.distance, opts.minDistance ?? 0.9);
    this.setView({ target: [c.x, c.y, c.z], distance: d, yaw, pitch }, opts.animate ?? true);
  }

  cancelTween() {
    this.tween = null;
  }

  /** Advance tween + damping; returns true when the camera moved this frame. */
  update(now: number): boolean {
    let moved = false;
    if (this.tween) {
      const tw = this.tween;
      const t = THREE.MathUtils.clamp((now - tw.t0) / tw.dur, 0, 1);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      this.controls.target.lerpVectors(tw.fromT, tw.toT, e);
      const r = Math.exp(THREE.MathUtils.lerp(Math.log(tw.r0), Math.log(tw.r1), e));
      const s = new THREE.Spherical(r, THREE.MathUtils.lerp(tw.ph0, tw.ph1, e), THREE.MathUtils.lerp(tw.th0, tw.th1, e));
      this.camera.position.setFromSpherical(s).add(this.controls.target);
      this.camera.lookAt(this.controls.target);
      moved = true;
      if (t >= 1) this.tween = null;
    }
    if (this.controls.update()) moved = true;
    if (this.clamp()) moved = true;
    return moved;
  }

  private killDamping() {
    const d = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = d;
  }

  private clampPoint(p: THREE.Vector3): boolean {
    const { x: lx, y: ly, z: lz } = this.targetLimits;
    const x = THREE.MathUtils.clamp(p.x, -lx, lx), y = THREE.MathUtils.clamp(p.y, 0, ly), z = THREE.MathUtils.clamp(p.z, -lz, lz);
    const changed = x !== p.x || y !== p.y || z !== p.z;
    p.set(x, y, z);
    return changed;
  }

  /** Default display limits; a larger local scene may extend its camera targets. */
  targetLimits = { x: PLINTH.w / 2 + 3, y: 14, z: PLINTH.l / 2 + 3 };

  private clamp(): boolean {
    const t = this.controls.target;
    const before = t.clone();
    let changed = false;
    if (this.clampPoint(t)) {
      this.camera.position.add(t.clone().sub(before));
      changed = true;
    }
    if (this.camera.position.y < 0.03) {
      this.camera.position.y = 0.03;
      this.camera.lookAt(t);
      changed = true;
    }
    return changed;
  }
}
