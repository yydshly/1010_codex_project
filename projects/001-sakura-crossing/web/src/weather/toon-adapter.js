// TSL translation of this project's MIT cel/outline/post pipeline.
// Original: Kenton-GMI/sakura-crossing @ de01898, Copyright 2026 Kenton Wang.
// Geometry, palette, ramps and sign textures remain shared with the WebGL street.
import * as THREE from 'three/webgpu';
import { cameraProjectionMatrix, color, diffuseColor, float, max, mix,
  normalGeometry, normalView, pass, perspectiveDepthToViewZ, positionLocal,
  positionView, smoothstep, texture, uniform, uv, vec2, vec3, vec4, viewportSize } from 'three/tsl';
import { PAL } from '../rendering/palette.js';

class TintedToonLighting extends THREE.LightingModel {
  constructor(material) { super(); this.material = material; }
  direct({ lightDirection, lightColor, reflectedLight }) {
    const coord = vec2(normalGeometry.dot(lightDirection).mul(.5).add(.5), 0);
    const band = texture(this.material.gradientMap, coord).r;
    const tint = color(this.material.userData.celTint);
    const irradiance = band.mul(mix(tint, vec3(1), band)).mul(lightColor);
    reflectedLight.directDiffuse.addAssign(irradiance.mul(diffuseColor.rgb).mul(1 / Math.PI));
  }
  indirect(builder) {
    const { ambientOcclusion, irradiance, reflectedLight } = builder.context;
    reflectedLight.indirectDiffuse.addAssign(irradiance.mul(diffuseColor.rgb).mul(1 / Math.PI));
    reflectedLight.indirectDiffuse.mulAssign(ambientOcclusion);
  }
}
class TintedToonMaterial extends THREE.MeshToonNodeMaterial {
  setupLightingModel() { return new TintedToonLighting(this); }
}

export function adaptStreetMaterials(root) {
  const cache = new Map(), animated = [], shells = [];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const source = mesh.material;
    if (source.isMeshToonMaterial) {
      let target = cache.get(source);
      if (!target) {
        target = new TintedToonMaterial({ color: source.color, gradientMap: source.gradientMap,
          map: source.map, alphaMap: source.alphaMap, transparent: source.transparent,
          opacity: source.opacity, alphaTest: source.alphaTest, side: source.side,
          depthWrite: source.depthWrite, fog: source.fog, vertexColors: source.vertexColors,
          emissive: source.emissive, emissiveIntensity: source.emissiveIntensity });
        target.userData.celTint = source.userData.shadowTint?.value ?? new THREE.Color(0x6c5f8c);
        cache.set(source, target); animated.push([source, target]);
      }
      mesh.material = target;
    } else if (source.isShaderMaterial && source.uniforms.uThickness) {
      const target = new THREE.MeshBasicNodeMaterial({ color: source.uniforms.uColor.value,
        side: THREE.BackSide, fog: false, opacity: source.uniforms.uOpacity.value,
        transparent: source.transparent });
      const clip = cameraProjectionMatrix.mul(vec4(positionView, 1));
      const clipNormal = cameraProjectionMatrix.mul(vec4(normalView, 0)).xyz.normalize();
      const aspect = vec2(viewportSize.y.div(viewportSize.x), 1);
      target.vertexNode = vec4(clip.xy.add(clipNormal.xy.mul(aspect)
        .mul(source.uniforms.uThickness.value * .5).mul(clip.w)), clip.zw);
      mesh.material = target; cache.set(source, target); shells.push(mesh);
    } else if (source.isShaderMaterial) {
      // The only other shader in buildSky is the painted sky gradient.
      const target = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
      target.colorNode = mix(vec3(.83, .85, .91), vec3(.54, .70, .80),
        smoothstep(-.05, .65, positionLocal.normalize().y));
      mesh.material = target; cache.set(source, target);
    }
  });
  return {
    update() { for (const [source, target] of animated) target.emissiveIntensity = source.emissiveIntensity; },
    setInk(enabled) { for (const mesh of shells) mesh.visible = enabled; },
    dispose() { for (const material of cache.values()) material.dispose(); },
  };
}

export function createToonPipeline(renderer, scene, camera) {
  const scenePass = pass(scene, camera);
  const coord = uv(), sceneColor = scenePass.getTextureNode('output');
  const depth = scenePass.getTextureNode('depth');
  const texel = uniform(new THREE.Vector2());
  const inkEnabled = uniform(1), gradeEnabled = uniform(1);
  const near = uniform(camera.near), far = uniform(camera.far);
  const linearDepth = at => perspectiveDepthToViewZ(depth.sample(at).r, near, far).negate();
  const dc = linearDepth(coord).max(.001), t = texel.mul(1.35);
  const sx = linearDepth(coord.sub(vec2(t.x, 0))).add(linearDepth(coord.add(vec2(t.x, 0)))).sub(dc.mul(2)).div(dc);
  const sy = linearDepth(coord.sub(vec2(0, t.y))).add(linearDepth(coord.add(vec2(0, t.y)))).sub(dc.mul(2)).div(dc);
  const convex = sx.max(0).add(sy.max(0));
  const concave = sx.negate().max(0).add(sy.negate().max(0));
  const edge = max(smoothstep(.0042 * .32, .0042, convex),
    smoothstep(.026, .026 * 3.4, concave).mul(.42))
    .mul(smoothstep(40, 98, dc).oneMinus()).mul(inkEnabled).clamp(0, 1);
  const original = sceneColor.sample(coord).rgb;
  const line = mix(color(PAL.ink), original.mul(.42), .22);
  const inked = mix(original, line, edge);
  const luma = inked.dot(vec3(.2126, .7152, .0722));
  const k = smoothstep(.02, .55, luma);
  const split = inked.mul(mix(color(0xada8d0), color(0xfff7e8), k))
    .add(vec3(.05, .05 * .45, 0).mul(luma).mul(.35)).add(float(.032).mul(k.oneMinus()));
  const saturated = mix(vec3(luma), split, 1.12);
  const radius = coord.sub(.5).length().mul(1.42).clamp(0, 1);
  const graded = saturated.mul(float(1).sub(radius.pow(2.6).mul(.15)));
  const pipeline = new THREE.RenderPipeline(renderer);
  // RenderPipeline performs linear → sRGB even when grade is disabled.
  pipeline.outputNode = vec4(mix(inked, graded, gradeEnabled).max(0), 1);
  return { render: () => pipeline.render(),
    resize(w, h) { texel.value.set(1 / w, 1 / h); },
    setInk(value) { inkEnabled.value = value ? 1 : 0; },
    setGrade(value) { gradeEnabled.value = value ? 1 : 0; },
    dispose() { pipeline.dispose(); scenePass.dispose(); },
  };
}
