import './minimal.css';
import { createMinimalExample } from '../modules/rain-kit/examples/minimal.js';
import { bindResearchLinks } from './platform/researchLinks.js';
bindResearchLinks();
const canvas = document.querySelector('#minimal-canvas');
const controls = document.querySelector('#module-controls');
const lifecycle = document.querySelector('#lifecycle');
let app;
function report(state) {
  document.querySelector('#backend').textContent = `${state.backend} · 实时渲染`;
  document.querySelector('#minimal-state').textContent = state.mounted ? '四个模块已接入 · 可独立控制' : '模块已释放 · 宿主模型与灯光保留';
  document.body.dataset.modules = state.mounted ? 'attached' : 'disposed';
  document.querySelector('#runtime').textContent = `效果对象 ${state.effectGroups} / 2\n雨滴 ${state.weather?.enabled ? state.weather.count : 0} / ${state.weather?.capacity ?? 0}\n水珠有效强度 ${Math.round((state.droplets?.amount ?? 0) * 100)}%\nX ${state.position[0].toFixed(2)}  Y ${state.position[1].toFixed(2)}  Z ${state.position[2].toFixed(2)}`;
  for (const [key, value] of Object.entries({ weather: Boolean(state.weather?.enabled), ground: Boolean(state.ground), droplets: Boolean(state.droplets?.enabled), walk: state.walking }))
    document.querySelector(`#minimal-${key}`).checked = value;
  controls.disabled = !state.mounted;
  document.querySelector('#scene-hint').textContent = state.walking ? 'WASD 移动 · Shift 快走 · C 蹲下 · 拖动环顾' : '选择机位观察 · 开启漫游后 WASD 移动、拖动环顾';
}
try {
  app = await createMinimalExample({ canvas, onState: report });
  const resize = () => { const r = document.querySelector('#stage').getBoundingClientRect(); app.resize(r.width, r.height); };
  const observer = new ResizeObserver(resize); observer.observe(document.querySelector('#stage')); resize();
  document.querySelector('#minimal-loading').hidden = true; controls.disabled = false; lifecycle.disabled = false;
  document.querySelectorAll('[data-effect]').forEach(input => input.addEventListener('change', () => {
    app.setEffect(input.dataset.effect, input.checked); canvas.focus({ preventScroll: true });
  }));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { app.setView(button.dataset.view); canvas.focus({ preventScroll: true }); }));
  document.querySelector('#minimal-count').addEventListener('input', event => {
    app.modules?.weather.setDropCount(Number(event.target.value)); document.querySelector('#minimal-count-output').value = `${event.target.value} / 2000`;
  });
  lifecycle.addEventListener('click', async () => {
    lifecycle.disabled = true;
    try {
      if (app.modules) { app.unmount(); lifecycle.textContent = '重新接入四个模块'; }
      else { await app.mount(); lifecycle.textContent = '释放四个模块'; document.querySelector('#minimal-count').value = '1500'; document.querySelector('#minimal-count-output').value = '1500 / 2000'; }
      canvas.focus({ preventScroll: true });
    } catch (error) { document.querySelector('#minimal-state').textContent = `重新接入失败：${error.message}`; console.error(error); }
    finally { lifecycle.disabled = false; }
  });
  window.addEventListener('pagehide', () => { observer.disconnect(); app.dispose(); }, { once: true });
} catch (error) {
  document.querySelector('#minimal-loading').textContent = `初始化失败：${error.message}`;
  document.querySelector('#minimal-state').textContent = '当前浏览器未能完成此示例初始化'; console.error(error);
}
document.querySelector('#copy-code').addEventListener('click', async event => {
  try { await navigator.clipboard.writeText(document.querySelector('#integration-code').textContent); event.target.textContent = '已复制'; }
  catch { event.target.textContent = '复制失败，请手动选取代码'; }
});
