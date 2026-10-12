import { gallery, modes, agentSteps } from './content.js';

const $ = (selector) => document.querySelector(selector);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let selectedGallery = gallery[0];
let motionPlaying = false;
let currentStep = 0;
let gameUrl = null;

function makeButton(label, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function syncImageDialog() {
  $('#dialog-image').src = $('#gallery-image').src;
  $('#dialog-image').alt = selectedGallery.alt;
  $('#image-dialog-title').textContent = selectedGallery.title;
  $('#dialog-image-source').textContent = selectedGallery.source;
}

function paintGallery() {
  const item = selectedGallery;
  const filename = item.poster && !motionPlaying ? item.poster : item.image;
  $('#gallery-image').src = './media/' + filename;
  $('#gallery-image').alt = item.poster && !motionPlaying ? '动态预览已停止，显示 Boss 静态画面' : item.alt;
  $('#gallery-tag').textContent = item.tag;
  $('#gallery-title').textContent = item.title;
  $('#gallery-source').textContent = item.source + (item.poster && !motionPlaying ? ' · 当前为静态替代画面' : '');
  $('#gallery-description').textContent = item.description;
  $('#motion-toggle').hidden = !item.poster;
  $('#motion-toggle').textContent = motionPlaying ? '停止动态' : '播放动态';
  for (const button of $('#gallery-selector').children) button.setAttribute('aria-pressed', String(button.dataset.id === item.id));
  if ($('#image-dialog').open) syncImageDialog();
}

function selectGallery(item, explicitPlay = false) {
  selectedGallery = item;
  motionPlaying = !!item.poster && (explicitPlay || !reducedMotion.matches);
  paintGallery();
}

gallery.forEach((item) => {
  const button = makeButton(item.label, () => selectGallery(item));
  button.dataset.id = item.id;
  button.setAttribute('aria-pressed', String(item.id === selectedGallery.id));
  $('#gallery-selector').append(button);
});
$('#show-motion').addEventListener('click', () => {
  selectGallery(gallery.find((item) => item.id === 'motion'), true);
  $('#effects').scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
});
$('#motion-toggle').addEventListener('click', () => { motionPlaying = !motionPlaying; paintGallery(); });
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { motionPlaying = false; paintGallery(); } });
$('#expand-image').addEventListener('click', () => { syncImageDialog(); $('#image-dialog').showModal(); });

function selectMode(mode) {
  for (const button of $('#mode-list').children) button.setAttribute('aria-pressed', String(button.dataset.id === mode.id));
  const detail = $('#mode-detail');
  detail.replaceChildren();
  const title = document.createElement('h3');
  title.textContent = mode.headline;
  const description = document.createElement('p');
  description.textContent = mode.description;
  const chips = document.createElement('div');
  chips.className = 'chips';
  for (const text of mode.chips) { const chip = document.createElement('span'); chip.textContent = text; chips.append(chip); }
  const loop = document.createElement('div');
  loop.className = 'mode-loop';
  mode.loop.forEach((text, index) => {
    if (index) { const arrow = document.createElement('i'); arrow.textContent = '→'; arrow.setAttribute('aria-hidden', 'true'); loop.append(arrow); }
    const label = document.createElement('span'); label.textContent = text; loop.append(label);
  });
  const note = document.createElement('p'); note.className = 'mode-note'; note.textContent = mode.note;
  detail.append(title, description, chips, loop, note);
}

modes.forEach((mode) => {
  const button = makeButton('', () => selectMode(mode));
  button.dataset.id = mode.id;
  const label = document.createElement('span');
  const number = document.createElement('span'); number.textContent = mode.number;
  label.append(number, document.createTextNode(mode.label));
  const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
  button.append(label, arrow);
  $('#mode-list').append(button);
});
selectMode(modes[0]);

function selectAgentStep(index) {
  currentStep = index;
  const step = agentSteps[index];
  $('#agent-role').textContent = step.role;
  $('#agent-title').textContent = step.title;
  $('#agent-body').textContent = step.body;
  $('#agent-example-label').textContent = step.label;
  $('#agent-example').textContent = step.example;
  $('#next-step').textContent = index === agentSteps.length - 1 ? '从头看 ↻' : '下一步 →';
  [...$('#agent-steps').children].forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  [...$('.signal-track').children].forEach((segment, i) => segment.classList.toggle('active', i <= index));
}
agentSteps.forEach((step, index) => {
  const button = makeButton('', () => selectAgentStep(index));
  const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
  button.append(number, document.createTextNode(step.name));
  $('#agent-steps').append(button);
});
$('#next-step').addEventListener('click', () => selectAgentStep((currentStep + 1) % agentSteps.length));
selectAgentStep(0);

for (const button of document.querySelectorAll('[data-close]')) {
  button.addEventListener('click', () => document.getElementById(button.dataset.close).close());
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', (event) => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  } });
}
$('#image-dialog').addEventListener('close', () => $('#dialog-image').removeAttribute('src'));
$('#play-dialog').addEventListener('close', () => { $('#game-frame').src = 'about:blank'; });
$('#local-play').addEventListener('click', () => {
  if (!gameUrl) return;
  $('#game-frame').src = gameUrl;
  $('#game-new-tab').href = gameUrl;
  $('#play-dialog').showModal();
});

// Local preview adds this endpoint; the static artifact has no game service URL.
fetch('./runtime.json', { signal: AbortSignal.timeout(4000) })
  .then((response) => response.ok ? response.json() : null)
  .then((runtime) => {
    if (runtime?.battleUrl) { const battle = new URL(runtime.battleUrl); if (battle.hostname === '127.0.0.1' && battle.protocol === 'http:') { $('#battle-link').href = battle.href; $('#battle-link').hidden = false; } }
    const url = runtime?.gameUrl ? new URL(runtime.gameUrl) : null;
    if (url && ['127.0.0.1', 'localhost'].includes(url.hostname) && url.protocol === 'http:') {
      gameUrl = url.href; $('#local-play').hidden = false;
    }
  }).catch(() => {});
