// 原创椭圆掩码与周期滑动，不包含上游独立授权的 surfaceRain 图案。
import * as THREE from 'three/webgpu';
import { Fn, color as tslColor, dot, float, floor, fract, mix, normalMap, sin, smoothstep, uniform, uv, vec2, vec3 } from 'three/tsl';
import { clampFinite, positive } from './internal/parameters.js';

export function createDropletMaterial({ color = '#9bb9aa', glass = false, uvChannel = 0,
  repeat = [32, 20], speed = .45, amount = 1, normalStrength = .5,
  metalness = glass ? .2 : .65, roughness = glass ? .17 : .34 } = {}) {
  if (!Number.isInteger(uvChannel) || uvChannel < 0 || uvChannel > 3) throw new RangeError('uvChannel 应为 0–3');
  positive(repeat[0], 'repeat[0]'); positive(repeat[1], 'repeat[1]');
  const material = new THREE.MeshPhysicalNodeMaterial({ color, metalness: clampFinite(metalness, 0, 1),
    roughness: clampFinite(roughness, 0, 1), clearcoat: 1, clearcoatRoughness: .1 });
  const clock = uniform(0); const intensity = uniform(clampFinite(amount, 0, 1));
  const rate = uniform(clampFinite(speed, 0, 4));
  const strength = uniform(clampFinite(normalStrength, 0, 2));
  const hash = Fn(([p]) => fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453)));
  const mask = Fn(([p]) => {
    const grid = p.mul(vec2(...repeat)).toVar(); grid.y.addAssign(clock.mul(rate));
    const cell = floor(grid); const seed = hash(cell); const local = fract(grid).sub(vec2(.5, .5));
    const center = vec2(seed.sub(.5).mul(.44), hash(cell.add(9)).sub(.5).mul(.4));
    const d = local.sub(center).div(vec2(.14, .22));
    return smoothstep(float(1), float(.1), dot(d, d)).mul(smoothstep(float(.15), float(.55), seed));
  });
  const p = uv(uvChannel); const m = mask(p);
  const dx = mask(p.add(vec2(.002, 0))).sub(m); const dy = mask(p.add(vec2(0, .002))).sub(m);
  material.normalNode = normalMap(vec3(dx.mul(intensity).mul(strength).add(.5), dy.mul(intensity).mul(strength).add(.5), 1));
  material.roughnessNode = mix(float(clampFinite(roughness, 0, 1)), float(.06), m.mul(intensity));
  const base = tslColor(new THREE.Color(color)); material.colorNode = mix(base, base.mul(1.4), m.mul(intensity).mul(.3));
  let enabled = true; let desiredAmount = intensity.value; let disposed = false;
  return {
    material, uniforms: { time: clock, amount: intensity, speed: rate, normalStrength: strength },
    getState: () => ({ enabled: enabled && !disposed, amount: intensity.value, speed: rate.value }),
    update(delta) { if (!disposed && enabled) clock.value += clampFinite(delta, 0, .05); },
    setEnabled(value) { if (disposed) return; enabled = Boolean(value); intensity.value = enabled ? desiredAmount : 0; },
    setAmount(value) { desiredAmount = clampFinite(value, 0, 1); intensity.value = enabled && !disposed ? desiredAmount : 0; },
    setSpeed(value) { rate.value = clampFinite(value, 0, 4); },
    dispose() { if (!disposed) { disposed = true; intensity.value = 0; material.dispose(); } },
  };
}
