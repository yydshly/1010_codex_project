import test from 'node:test';
import assert from 'node:assert/strict';
import { createEffectsController } from '../adapters/upstream-effects.js';
import { patchUpstreamMain } from '../scripts/patch-upstream.mjs';
function fixture(lensflare = true) {
  const profile = { groundReflection: true, carSurfaceRain: true, bloom: true, lensflare };
  const world = {
    rain: { params: { enabled: true }, setEnabled(value) { this.params.enabled = value; } },
    ground: { uniforms: { reflectionEnabled: { value: 1 }, reflectionStrength: { value: .08 }, rippleAmount: { value: 1 } },
      setReflectionEnabled(value) { this.uniforms.reflectionEnabled.value = Number(value); }, setRippleAmount(value) { this.uniforms.rippleAmount.value = value; } },
    carSurfaceRain: { uniforms: { uIntensity: { value: 1 }, uNormalStrength: { value: .25 }, uGlassNormalStrength: { value: .7 } },
      setEnabled(value) { this.uniforms.uIntensity.value = Number(value); },
      syncProximity({ rainEnabled, fade = 1 }) { this.uniforms.uIntensity.value = profile.carSurfaceRain && rainEnabled ? fade : 0; return this.uniforms.uIntensity.value > 0; } },
  };
  const pipeline = { bloom: true, flare: lensflare, perf: {} };
  pipeline.perf.setBloomEnabled = value => { pipeline.bloom = value; };
  pipeline.perf.setLensflareEnabled = value => { pipeline.flare = value; };
  return { profile, world, pipeline, control: createEffectsController({ world, pipeline, profile }) };
}
test('水珠单项观察不被每帧的降雨状态覆盖，仍保留距离淡出', () => {
  const f = fixture(); f.control.isolate('droplets');
  assert.equal(f.world.rain.params.enabled, false); assert.equal(f.world.ground.uniforms.rippleAmount.value, 0);
  f.world.carSurfaceRain.syncProximity({ rainEnabled: false, fade: .6 }); assert.equal(f.world.carSurfaceRain.uniforms.uIntensity.value, .6);
  assert.equal(f.world.carSurfaceRain.uniforms.uNormalStrength.value, .15);
  f.control.setEffect('droplets', false); f.world.carSurfaceRain.syncProximity({ rainEnabled: true });
  assert.equal(f.world.carSurfaceRain.uniforms.uIntensity.value, 0);
  assert.equal(f.world.carSurfaceRain.uniforms.uNormalStrength.value, 0); assert.equal(f.world.carSurfaceRain.uniforms.uGlassNormalStrength.value, 0);
  f.control.setEffect('droplets', true); f.world.carSurfaceRain.syncProximity({ rainEnabled: true, fade: 0 }); assert.equal(f.world.carSurfaceRain.uniforms.uIntensity.value, 0);
});
test('反射开关同步材质与更新预算，强度拒绝无效值并限制范围', () => {
  const f = fixture(); f.control.setEffect('reflection', false);
  assert.equal(f.profile.groundReflection, false); assert.equal(f.world.ground.uniforms.reflectionEnabled.value, 0);
  f.control.setReflectionStrength(.24); assert.equal(f.world.ground.uniforms.reflectionStrength.value, .24);
  f.control.setReflectionStrength(NaN); assert.equal(f.world.ground.uniforms.reflectionStrength.value, .24);
  f.control.setReflectionStrength(2); assert.equal(f.world.ground.uniforms.reflectionStrength.value, .4);
});
test('辉光同时关闭 Bloom 与光晕，重新打开遵守原设备预算', () => {
  for (const budget of [true, false]) {
    const f = fixture(budget); f.control.setEffect('bloom', false);
    assert.equal(f.pipeline.bloom, false); assert.equal(f.pipeline.flare, false);
    f.control.setEffect('bloom', true); assert.equal(f.pipeline.bloom, true); assert.equal(f.pipeline.flare, budget);
  }
});
test('清理控制桥后恢复原库的水珠与降雨联动', () => {
  const f = fixture(); f.control.dispose(); f.world.carSurfaceRain.syncProximity({ rainEnabled: false });
  assert.equal(f.world.carSurfaceRain.uniforms.uIntensity.value, 0); assert.equal(f.world.carSurfaceRain.uniforms.uGlassNormalStrength.value, .7);
});
test('固定源码接入可重复执行，缺失或重复锚点明确失败', () => {
  const input = 'const loader = createLoaderOverlay();\n  await introFlow.run();';
  const output = patchUpstreamMain(input); assert.match(output, /connectResearchPanel\(\{ world/);
  assert.equal(patchUpstreamMain(output), output);
  assert.throws(() => patchUpstreamMain('const loader = createLoaderOverlay();'), /锚点不匹配/);
  assert.throws(() => patchUpstreamMain(input + '\n  await introFlow.run();'), /锚点不匹配/);
});
