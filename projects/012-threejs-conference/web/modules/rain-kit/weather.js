import { createCollisionHeight } from './internal/height.js';
import { createCollisionRain, RAIN_LAYER } from './internal/rain.js';
import { clampFinite, positive } from './internal/parameters.js';

/** 宿主提供已初始化的 renderer / scene / camera；模块管理自己的雨和高度图。 */
export async function createWeather({ scene, renderer, camera, capacity = 5000, count = 3000,
  enabled = true, height: heightOptions = {}, rain: rainOptions = {}, hideObjects = [] } = {}) {
  if (!scene?.isScene || !renderer?.compute || !camera?.isCamera) throw new TypeError('createWeather 需要 scene、已初始化的 WebGPURenderer 和 camera');
  capacity = Math.round(clampFinite(capacity, 500, 5000));
  count = Math.round(clampFinite(count, 500, capacity));
  const area = rainOptions.rainArea ?? { width: 35, height: 35 };
  positive(area.width, 'rainArea.width'); positive(area.height, 'rainArea.height');
  const height = createCollisionHeight({ scene, renderer, width: 80, height: 80, cameraHeight: 60, depth: 90, ...heightOptions });
  if (area.width + 10 > height.collision.width || area.height + 10 > height.collision.height) {
    height.dispose(); throw new RangeError('高度图宽 / 高至少比雨区大 10 米');
  }
  const originalLayer = camera.layers.isEnabled(RAIN_LAYER);
  let rain;
  try {
    height.update({ camera, hideObjects, force: true });
    rain = await createCollisionRain({ scene, renderer, collisionHeight: height, camera, count: capacity, rainArea: area });
    rain.setDropCount(count);
    rain.setOpacity(clampFinite(rainOptions.opacity ?? .42, 0, 1));
    rain.setIntensity(clampFinite(rainOptions.intensity ?? .85, 0, 1));
    rain.setFallSpeed(clampFinite(rainOptions.fallSpeed ?? .28, .01, 2));
    rain.setSplashOpacity(clampFinite(rainOptions.splashOpacity ?? .3, 0, 1));
    rain.setSplashSize(clampFinite(rainOptions.splashSize ?? 1.5, .1, 5));
    rain.setEnabled(enabled);
  } catch (error) {
    rain?.dispose(); height.dispose(); if (!originalLayer) camera.layers.disable(RAIN_LAYER); throw error;
  }
  let disposed = false;
  return {
    rain, height, group: rain.group, capacity,
    getState: () => ({ enabled: !disposed && rain.params.enabled, count: rain.params.count, intensity: rain.params.intensity, capacity }),
    setEnabled: value => { if (!disposed) rain.setEnabled(value); },
    setIntensity: value => { if (!disposed) rain.setIntensity(clampFinite(value, 0, 1)); },
    setDropCount: value => { if (!disposed) rain.setDropCount(value); },
    update(delta, { hideObjects: extra = [] } = {}) {
      if (disposed || !rain.params.enabled) return;
      height.update({ camera, hideObjects: [...new Set([rain.group, ...hideObjects, ...extra])] });
      rain.update(delta, camera);
    },
    dispose() {
      if (disposed) return; disposed = true;
      rain.dispose(); height.dispose(); if (!originalLayer) camera.layers.disable(RAIN_LAYER);
    },
  };
}
