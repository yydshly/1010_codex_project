import { initializeLab } from './lab.js';

initializeLab();

const sceneImage = document.querySelector('#scene-image');
const fallback = document.querySelector('#scene-fallback');
const loading = document.querySelector('#scene-loading');
const sceneSelect = document.querySelector('#scene-select');
const viewButtons = [...document.querySelectorAll('[data-view]')];
let selectedView = 'ours';
let evidence;

function showLoadedScene() { loading.hidden = true; fallback.hidden = true; sceneImage.hidden = false; }
function showFailedScene() { loading.hidden = true; fallback.hidden = false; sceneImage.hidden = true; }
sceneImage.addEventListener('load', showLoadedScene);
sceneImage.addEventListener('error', showFailedScene);
// A cached image may finish before this module attaches its handlers.
if (sceneImage.complete) {
  if (sceneImage.naturalWidth > 0) showLoadedScene();
  else showFailedScene();
}

function updateScene() {
  if (!evidence) return;
  const scene = evidence.scenes[Number(sceneSelect.value)];
  const viewLabels = { cloud: 'RGB 输入', ours: '模型预测与运动轴', gt_axes: '真实标注与运动轴' };
  sceneImage.alt = `作者公开的${scene.label}：${viewLabels[selectedView]}`;
  fallback.hidden = true;
  const url = `${evidence.authorPage.mediaBase}comparison/${scene.id}-${selectedView}.png`;
  if (sceneImage.src !== url) {
    sceneImage.hidden = false;
    loading.hidden = false;
    sceneImage.src = url;
  }
  document.querySelector('#scene-id').textContent = scene.id;
  document.querySelector('#scene-description').textContent = scene.description;
  document.querySelector('.scene-overlay').hidden = selectedView === 'cloud';
  for (const button of viewButtons) button.setAttribute('aria-pressed', String(button.dataset.view === selectedView));
}

try {
  const response = await fetch('./data/evidence.json');
  if (!response.ok) throw new Error(`Evidence HTTP ${response.status}`);
  evidence = await response.json();
  updateScene();
} catch (error) {
  document.querySelector('#scene-description').textContent = '来源记录暂未加载。当前图为作者公开的场景 01 预测，可通过原站查看。';
  sceneSelect.disabled = true;
  viewButtons.forEach(button => { button.disabled = true; });
  console.error('来源记录加载失败', error);
}

sceneSelect.addEventListener('change', updateScene);
viewButtons.forEach(button => button.addEventListener('click', () => { selectedView = button.dataset.view; updateScene(); }));

const dialog = document.querySelector('#video-dialog');
const video = document.querySelector('#author-video');
const videoError = document.querySelector('#video-error');
document.querySelector('#open-video').addEventListener('click', () => {
  videoError.hidden = true;
  dialog.showModal();
  video.load();
});
document.querySelector('#close-video').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { video.pause(); });
video.addEventListener('error', () => { videoError.hidden = false; });
video.querySelector('source').addEventListener('error', () => { videoError.hidden = false; });

// Inline failures remain distinguishable from an absent library prediction.
document.querySelectorAll('.hinge-comparison img').forEach(img => {
  img.addEventListener('error', () => {
    const message = document.createElement('p');
    message.className = 'figure-caveat';
    message.textContent = '外部图片暂未加载，请通过作者效果页查看原始对照。';
    img.replaceWith(message);
  }, { once: true });
});
