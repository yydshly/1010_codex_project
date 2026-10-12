// 原创控制桥：调用固定上游的公开 setter / uniform，不复制其水珠着色器。
export function createEffectsController({ world, pipeline, profile }) {
  const available = {
    rain: typeof world.rain?.setEnabled === 'function',
    reflection: typeof world.ground?.setReflectionEnabled === 'function',
    droplets: typeof world.carSurfaceRain?.syncProximity === 'function',
    bloom: typeof pipeline.perf?.setBloomEnabled === 'function',
  };
  const lensflareBudget = Boolean(profile.lensflare);
  const nativeProximity = world.carSurfaceRain?.syncProximity;
  const rainUniforms = world.carSurfaceRain?.uniforms;
  const baseNormalStrengths = ['uNormalStrength', 'uGlassNormalStrength'].map(key => ({ node: rainUniforms?.[key], value: rainUniforms?.[key]?.value }));
  function syncDropletNormals() {
    const intensity = profile.carSurfaceRain ? rainUniforms?.uIntensity?.value ?? 1 : 0;
    // 固定上游的 CarDrops 掩码没有用强度约束法线；材质强度归零时还会残留凸起。
    for (const { node, value } of baseNormalStrengths) if (node) { node.value = value * intensity; node.needsUpdate = true; }
  }
  // 上游每帧把雨开关传给车身材质。研究面板让表面水珠独立于空中降雨，保留距离淡出。
  if (available.droplets) world.carSurfaceRain.syncProximity = function (options) {
    const active = nativeProximity.call(this, { ...options, rainEnabled: Boolean(profile.carSurfaceRain) });
    syncDropletNormals(); return active;
  };
  function getState() {
    return {
      rain: Boolean(world.rain?.params?.enabled),
      reflection: Boolean(profile.groundReflection && world.ground?.uniforms?.reflectionEnabled?.value > .5),
      droplets: Boolean(available.droplets && profile.carSurfaceRain), bloom: Boolean(available.bloom && profile.bloom),
    };
  }
  function setEffect(key, enabled) {
    if (!available[key]) return false;
    const value = Boolean(enabled);
    if (key === 'rain') {
      world.rain.setEnabled(value); world.ground?.setRippleAmount?.(value ? 1 : 0);
    } else if (key === 'reflection') {
      profile.groundReflection = value; world.ground.setReflectionEnabled(value);
    } else if (key === 'droplets') {
      profile.carSurfaceRain = value; world.carSurfaceRain.setEnabled(value); syncDropletNormals();
    } else if (key === 'bloom') {
      profile.bloom = value; profile.lensflare = value && lensflareBudget;
      pipeline.perf.setBloomEnabled(value); pipeline.perf.setLensflareEnabled?.(profile.lensflare);
    }
    return true;
  }
  function setAll(enabled) { for (const key of Object.keys(available)) setEffect(key, enabled); }
  function isolate(key) { for (const name of Object.keys(available)) setEffect(name, name === key); }
  function setReflectionStrength(value) {
    const number = Number(value); const node = world.ground?.uniforms?.reflectionStrength;
    if (!node || !Number.isFinite(number)) return;
    node.value = Math.max(0, Math.min(.4, number)); node.needsUpdate = true;
  }
  return { available, getState, setEffect, setAll, isolate, setReflectionStrength,
    dispose() {
      if (available.droplets) world.carSurfaceRain.syncProximity = nativeProximity;
      for (const { node, value } of baseNormalStrengths) if (node) { node.value = value; node.needsUpdate = true; }
    },
  };
}
