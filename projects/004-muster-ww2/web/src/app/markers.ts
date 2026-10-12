/**
 * Low-key selection feedback and the placement ghost.
 *
 * Ground markers are flat quads with a signed-distance rounded rectangle drawn at a constant
 * on-screen width (fwidth), so the outline stays a thin, crisp line at every zoom level.
 * Models are never tinted. The ghost is a translucent copy of the real model: a depth
 * pre-pass keeps only its front surfaces, so it reads as a clean preview silhouette.
 */
import * as THREE from 'three';

export type MarkerState = 'selected' | 'context' | 'hover' | 'ghost';

const STYLE: Record<MarkerState, { line: number; fill: number; width: number }> = {
  selected: { line: 0.72, fill: 0.055, width: 1.5 },
  context: { line: 0.3, fill: 0.0, width: 1.2 },
  hover: { line: 0.38, fill: 0.025, width: 1.3 },
  ghost: { line: 0.85, fill: 0.08, width: 1.5 },
};

/** Shared: marker line width scales with the render pixel ratio. */
export const markerPixelRatio = { value: 1 };
const COLOR = new THREE.Color(0xe8d3a8);

const vert = /* glsl */ `
varying vec2 vP;
void main() {
  vP = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const frag = /* glsl */ `
uniform vec3 uColor;
uniform float uLine;
uniform float uFill;
uniform float uWidth;
uniform float uPx;
uniform vec2 uHalf;
uniform float uRadius;
varying vec2 vP;
float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
  float d = sdRoundRect(vP, uHalf, uRadius);
  float fw = max(fwidth(d), 1e-6);
  float px = abs(d) / fw;
  float hw = 0.5 * uWidth * uPx;
  float line = 1.0 - smoothstep(hw - 0.5, hw + 0.8, px);
  float inside = 1.0 - smoothstep(-0.8, 0.8, d / fw);
  float a = max(line * uLine, inside * uFill);
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}`;

interface Dims {
  hw: number;
  hl: number;
  r: number;
  quadW: number;
  quadL: number;
}

function dims(w: number, l: number): Dims {
  const pad = THREE.MathUtils.clamp(0.09 * Math.max(w, l), 0.06, 0.5);
  const hw = w / 2 + pad, hl = l / 2 + pad;
  const r = Math.min(Math.min(hw, hl) * 0.22, 0.45);
  const margin = 0.25 * Math.max(hw, hl) + 0.12;
  return { hw, hl, r, quadW: 2 * (hw + margin), quadL: 2 * (hl + margin) };
}

const geoCache = new Map<string, THREE.BufferGeometry>();
const matCache = new Map<string, THREE.ShaderMaterial>();
const fpKey = (w: number, l: number) => `${w.toFixed(3)}x${l.toFixed(3)}`;

function markerGeometry(w: number, l: number): THREE.BufferGeometry {
  const k = fpKey(w, l);
  let g = geoCache.get(k);
  if (!g) {
    const d = dims(w, l);
    g = new THREE.PlaneGeometry(d.quadW, d.quadL).rotateX(-Math.PI / 2);
    geoCache.set(k, g);
  }
  return g;
}

function markerMaterial(w: number, l: number, state: MarkerState): THREE.ShaderMaterial {
  const k = fpKey(w, l) + '|' + state;
  let m = matCache.get(k);
  if (!m) {
    const d = dims(w, l);
    const s = STYLE[state];
    m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: {
        uColor: { value: COLOR },
        uLine: { value: s.line },
        uFill: { value: s.fill },
        uWidth: { value: s.width },
        uPx: markerPixelRatio,
        uHalf: { value: new THREE.Vector2(d.hw, d.hl) },
        uRadius: { value: d.r },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
    matCache.set(k, m);
  }
  return m;
}

/** A ground marker for a footprint (hidden until given a state). Not pickable, no shadows. */
export function createMarker(w: number, l: number): THREE.Mesh {
  const mesh = new THREE.Mesh(markerGeometry(w, l), markerMaterial(w, l, 'selected'));
  mesh.position.y = 0.006;
  mesh.renderOrder = 5;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.visible = false;
  mesh.userData = { kind: 'marker', w, l, state: null };
  mesh.raycast = () => undefined;
  return mesh;
}

export function setMarkerState(mesh: THREE.Mesh, state: MarkerState | null) {
  if (mesh.userData.state === state) return;
  mesh.userData.state = state;
  mesh.visible = !!state;
  if (state) mesh.material = markerMaterial(mesh.userData.w as number, mesh.userData.l as number, state);
}

// ---------------------------------------------------------------- ghost

const depthOnly = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true });
const ghostMats = new Map<THREE.Material, THREE.Material>();
const WARM = new THREE.Color(0xf1e8d6);

function ghostMaterial(src: THREE.Material): THREE.Material {
  let m = ghostMats.get(src);
  if (!m) {
    const s = src as THREE.MeshStandardMaterial;
    const base = s.color ? s.color.clone() : new THREE.Color(0x9a9080);
    m = new THREE.MeshStandardMaterial({
      color: base.lerp(WARM, 0.3),
      roughness: 0.75,
      metalness: 0,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      depthFunc: THREE.LessEqualDepth,
      side: s.side ?? THREE.FrontSide,
      vertexColors: !!s.vertexColors,
      emissive: new THREE.Color(0x1d1810),
    });
    ghostMats.set(src, m);
  }
  return m;
}

/** Translucent preview of a baked template (shares geometry; never casts shadows). */
export function makeGhost(template: THREE.Object3D): THREE.Object3D {
  const root = template.clone();
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  for (const m of meshes) {
    const src = Array.isArray(m.material) ? m.material[0] : m.material;
    m.material = ghostMaterial(src);
    m.castShadow = false;
    m.receiveShadow = false;
    m.renderOrder = 901;
    const d = new THREE.Mesh(m.geometry, depthOnly);
    d.position.copy(m.position);
    d.quaternion.copy(m.quaternion);
    d.scale.copy(m.scale);
    d.renderOrder = 900;
    d.castShadow = false;
    m.parent?.add(d);
  }
  root.traverse((o) => {
    o.raycast = () => undefined;
  });
  return root;
}
