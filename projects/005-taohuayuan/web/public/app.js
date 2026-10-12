const frame = document.getElementById('world');
const stages = [...document.querySelectorAll('[data-scene]')];
const status = document.getElementById('status');
const play = document.getElementById('play');
const roam = document.getElementById('roam');
const whole = document.getElementById('whole');
const fullscreen = document.getElementById('fullscreen');
const scenes = {
  forest: { chapter: 2, place: 1, quote: '忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。', hint: '从“逢林”开始，看桃花、水面倒影与落英。镜头随后继续沿溪，进入山洞。' },
  cave: { chapter: 8, place: 3, quote: '便舍船，从口入。初极狭，才通人。', hint: '从“极狭”开始，在真实洞穴中向前行进，感受狭窄空间与暗部曝光。下一幕会走向光亮。' },
  reveal: { chapter: 9, place: 4, quote: '复行数十步，豁然开朗。土地平旷，屋舍俨然。', hint: '从洞口前的暗处开始，镜头随脚步打开视野，露出田野、村庄与远山。需要约几秒完成揭示。' },
};
let selected = 'forest';
let ready = false;
let pendingPlace = null;
let loadingFailed = false;

// Pinned upstream exposes this diagnostic handle. The adapter depends on that revision, not a public SDK.
function upstream() { try { return frame.contentWindow?.__t; } catch { return null; } }
function select(key) {
  selected = key;
  for (const button of stages) { const on = button.dataset.scene === key; button.classList.toggle('active', on); button.setAttribute('aria-pressed', String(on)); }
  document.getElementById('quote').textContent = scenes[key].quote;
  document.getElementById('hint').textContent = scenes[key].hint;
}
function begin(chapter) {
  const t = upstream();
  if (!ready || !t) return;
  pendingPlace = null;
  t.sound.unlock();
  t.director.start(chapter);
}
for (const button of stages) button.addEventListener('click', () => { select(button.dataset.scene); begin(scenes[selected].chapter); });
whole.addEventListener('click', () => { select('forest'); begin(0); });
play.addEventListener('click', () => upstream()?.director.togglePause());
roam.addEventListener('click', () => {
  const t = upstream();
  if (!t || !ready) return;
  pendingPlace = scenes[selected].place;
  if (t.director.active || t.director.dip) t.director.stop();
});
fullscreen.addEventListener('click', async () => {
  try { await frame.requestFullscreen(); }
  catch { status.textContent = '浏览器未允许全屏；可在独立页面打开原版体验。'; }
});

const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
setInterval(() => {
  const t = upstream();
  if (!ready) {
    const doc = frame.contentDocument;
    const fatal = doc?.getElementById('loadErr');
    if (fatal && !fatal.classList.contains('hidden')) {
      status.textContent = doc.getElementById('loadErrMsg')?.textContent || '三维场景加载失败，请刷新页面。';
      loadingFailed = true;
      return;
    }
    if (!t || doc?.getElementById('ui')?.classList.contains('hidden')) return;
    ready = true;
    loadingFailed = false;
    for (const button of [...stages, roam, whole]) button.disabled = false;
  }
  if (!t || loadingFailed) return;
  const d = t.director;
  if (pendingPlace !== null && !d.active && !d.dip) { d.roam.placeNow(pendingPlace); pendingPlace = null; }
  play.disabled = !d.active;
  play.textContent = d.paused || d.holding ? '继续导览' : '暂停导览';
  if (d.active && d.i >= 0) {
    const key = d.i < 5 ? 'forest' : d.i < 9 ? 'cave' : 'reveal';
    if (key !== selected) select(key);
    const voice = !t.sound.narrate ? '朗读关闭' : t.sound.blocked ? '点击画面开启朗读' : t.sound.voice && !t.sound.voice.paused ? '朗读中' : '朗读就绪';
    const message = `${d.paused || d.holding ? '已暂停' : '导览中'} · ${String(d.i + 1).padStart(2, '0')} / 28 · ${d.chapter.name} · ${clock(d.at)} · ${voice}`;
    if (status.textContent !== message) status.textContent = message;
  } else status.textContent = '三维场景已就绪 · 自由浏览；点击上方入口开始导览';
}, 500);
