import './algorithm-style.css';

const TITLES = { input: '观察输入', neural: '神经活动', choice: '动作选择', eligibility: '待奖资格',
  travel: '执行与等待', wait: '等待新观察', reward: '实际奖励', credit: '累积资格',
  update: '参数更新', terminal: '终点清理', baseline: '基线对照' };
const COPY = {
  input: '公开观察、工作轨迹和联想记忆共同形成输入。路牌、位置属于观察；正确路线没有传给 Brain。',
  neural: '反馈通路反复传递活动，达到合格自由态后才读出动作。下方是实际求解结果；稳定不代表选对路线。',
  choice: '唤醒时按 softmax 概率抽样；平静时取最强动作。概率最大的动作也可能没有被抽中。',
  eligibility: '以实际选中的动作做 +β / −β 扰动，保存两种状态。此时奖励尚未到达；C 是本次参与记录，E 是此前已积累的资格。',
  travel: '巷口动作已经执行，终点结果还未知。本时刻没有调用 live，没有凭空加入零奖励。',
  wait: 'wait 接收新观察并更新活动轨迹；原动作、连接资格、价值参数和联想记忆保持。等待不额外消耗一个 TD 步。',
  reward: '这份结果属于此前发出的动作。Brain 将实际奖励和原价值预测比较，判断结果比预计更好还是更差。',
  credit: '实际反馈到达，旧资格乘 γλ，再加本次连接对比。终点奖励因此可以同时影响街口和巷口选择。',
  update: '用截断后的 TD 误差调制资格，再应用学习掩码、连接绑定和上限。这里列的是实际参数前后差，零误差也会得到零更新。',
  terminal: '本趟资格和工作轨迹清理，图权重、Critic 与联想记录保留。随后处理下一趟路牌，继续同一个 Brain。',
  baseline: '规则明确锁存路牌，失败后轮换候选路线；Q 锁存路牌并更新一个表项。等待时两者也不进行奖励更新。',
};
const FEATURES = ['樱花', '灯笼', '广场', '巷口', '西街', '东街', '途中', '抵达'];
const GROUPS = [['sensory', '感觉区', 'S'], ['association', '联想区', 'H'], ['prefrontal', '前额区', 'P'], ['motor', '动作区', 'M']];
const number = value => value === null || value === undefined ? '—' : Math.abs(value) < .0001 && value !== 0 ? value.toExponential(2) : value.toFixed(4);
const maxAbs = values => Math.max(0, ...(values || []).map(Math.abs));
const length = values => Math.sqrt((values || []).reduce((s, v) => s + v * v, 0));
const hue = (value, peak) => value === 0 ? '#edf0e8' : value > 0
  ? `rgba(36,125,117,${.14 + .86 * Math.min(1, Math.abs(value) / (peak || 1))})`
  : `rgba(203,124,121,${.14 + .86 * Math.min(1, Math.abs(value) / (peak || 1))})`;

export function createAlgorithmPlayer(root, { advance, onPlay, onPause, canAdvance }) {
  root.innerHTML = `<div class="section-heading"><div><p class="eyebrow">INSIDE THE REAL BRAIN / STEP BY STEP</p><h2>一次选择，是怎样学进去的？</h2></div><span class="algorithm-badge">真实计算快照</span></div>
    <p class="algorithm-intro">从观察到奖励更新，逐帧看同一个 Cadence。回看不会再次学习；到最新帧后，「下一算法步」才推进一个环境时刻。</p>
    <div class="algorithm-toolbar"><button id="algorithm-prev" class="secondary">← 上一帧</button><button id="algorithm-next" class="primary">下一算法步 →</button><button id="algorithm-play" class="secondary">▶ 逐步播放</button><button id="algorithm-rewind" class="text-button">回看片段</button><label>每帧<select id="algorithm-speed" aria-label="算法播放间隔"><option value="1600" selected>1.6 秒</option><option value="800">0.8 秒</option><option value="3000">3 秒</option></select></label></div>
    <div class="algorithm-scrub"><input id="algorithm-range" type="range" min="0" max="0" value="0" aria-label="算法帧时间轴"/><span id="algorithm-position">等待真实帧</span></div>
    <div class="algorithm-track" id="algorithm-track" aria-label="算法流程"></div>
    <div class="algorithm-stage"><div><span class="eyebrow" id="algorithm-context"></span><h3 id="algorithm-title">连接真实记录器…</h3><p id="algorithm-explanation" role="status"></p></div><div class="algorithm-key-numbers" id="algorithm-key-numbers"></div></div>
    <div class="algorithm-grid"><article class="algorithm-box"><div class="chart-title"><h3>观察 → 神经活动 → 动作</h3><span id="algorithm-sweeps"></span></div><div id="algorithm-observation" class="algorithm-observation"></div><div class="algorithm-flow">感觉 8 <b>→</b> 联想 16 <b>⇄</b> 动作 2 <small>工作轨迹 → 前额 16 → 联想</small></div><div class="algorithm-phase"><span>神经活动</span><button data-phase="free" aria-pressed="true">自由态</button><button data-phase="plus" aria-pressed="false">+β 扰动</button><button data-phase="minus" aria-pressed="false">−β 扰动</button></div><div id="algorithm-neurons" class="algorithm-neurons"></div><p class="algorithm-legend">青 = 正值 · 粉 = 负值 · 各组按本帧峰值着色；数字是实际活动。</p><div id="algorithm-action" class="algorithm-action"></div></article>
    <article class="algorithm-box"><div class="chart-title"><h3>连接资格与实际更新</h3><span>450 条有向连接</span></div><div class="algorithm-metrics"><button data-metric="contrast">本次对比 C</button><button data-metric="eligibility" aria-pressed="true">累积资格 E</button><button data-metric="weight_delta">权重变化 Δw</button></div><canvas id="algorithm-heatmap" width="600" height="240" role="img" aria-label="450 条连接的真实资格或权重变化热图"></canvas><p id="algorithm-heat-caption" class="algorithm-legend"></p><div class="algorithm-edge-select"><label>检查连接 <input id="algorithm-edge" type="number" min="0" max="449" value="0" aria-label="连接编号"/></label><button id="algorithm-peak" class="text-button">查看峰值连接</button><span id="algorithm-edge-name"></span></div><div id="algorithm-edge-details" class="algorithm-edge-details"></div><div id="algorithm-formula" class="algorithm-formula"></div><div id="algorithm-parameter-summary" class="algorithm-parameter-summary"></div></article></div>
    <div class="algorithm-bottom"><article class="algorithm-box"><div class="chart-title"><h3>工作轨迹：保留什么历史？</h3><span id="algorithm-working-norm"></span></div><div id="algorithm-working" class="algorithm-working"></div><p class="algorithm-legend">16 维活动轨迹，不是明确锁存的路牌。wait 可改变它，资格 E 保持。</p></article><article class="algorithm-box"><div class="chart-title"><h3>规则与 Q 的最近结算</h3><span>各自收到实际结果</span></div><div id="algorithm-baseline" class="algorithm-baseline"></div></article></div>
    <details class="algorithm-source"><summary>公式、实现入口与当前帧原始数据</summary><p>活动：v ← v + dt·(输入 + Ws + b − v)；资格：E ← γλE + C；Actor：Δw ≈ η·clip(δ, −1, 1)·E。当前 γ=0.9、λ=0.8、η=0.1、β=0.1。Critic 使用 modulated 信号；联想矩阵另按实际动作奖励更新。</p><p>自由态及 ±β 态来自原求解结果，帧间播放不重演每次内部迭代。只保留最近 96 帧；完整环境行动仍在本次记录中。实时控制器耗时包含记录开销，离线基准表保持原测量。</p><p><a id="algorithm-notes" href="#">下载完整中文原理笔记 ↓</a> · <a href="https://github.com/muellerberndt/cadence/blob/19bee92756d1842176ad30b1cd01edbfbfa3f14c/src/cadence/plasticity.py#L442" target="_blank" rel="noreferrer">固定版本算法源码 ↗</a></p><pre id="algorithm-raw"></pre></details>`;
  const $ = id => root.querySelector(`#algorithm-${id}`);
  let trace = null, index = 0, running = false, busy = false, timer = null;
  let phase = 'free', metric = 'eligibility', edge = 0, manualEdge = false, renderedId = null;
  const frame = () => trace?.frames[index];
  const name = id => { for (const [key, , prefix] of GROUPS) { const i = trace.topology.populations[key].indexOf(id); if (i >= 0) return `${prefix}${i}`; } return String(id); };

  function buttons() {
    const ready = Boolean(frame());
    $('prev').disabled = !ready || busy || index === 0;
    $('next').disabled = !ready || busy || index === trace.frames.length - 1 && !canAdvance();
    $('play').disabled = !ready || busy && !running || index === trace.frames.length - 1 && !canAdvance() && !running;
    $('rewind').disabled = !ready || busy;
    $('range').disabled = !ready || busy;
    $('play').textContent = running ? 'Ⅱ 暂停逐步播放' : '▶ 逐步播放';
  }
  function pause() { running = false; clearTimeout(timer); buttons(); onPause?.(); }
  async function next() {
    if (busy || !frame()) return false;
    if (index < trace.frames.length - 1) index++;
    else {
      if (!canAdvance()) return false;
      const id = frame().id;
      await advance();
      const position = trace.frames.findIndex(f => f.id === id);
      if (position < 0 || position >= trace.frames.length - 1) return false;
      index = position + 1;
    }
    phase = 'free'; render(); return true;
  }
  async function loop() {
    if (!running) return;
    if (!await next()) { pause(); return; }
    if (running) timer = setTimeout(loop, Number($('speed').value));
  }
  $('play').addEventListener('click', () => { if (running) pause(); else { running = true; onPlay(); buttons(); loop(); } });
  $('next').addEventListener('click', () => { pause(); next(); });
  $('prev').addEventListener('click', () => { pause(); index = Math.max(0, index - 1); phase = 'free'; render(); });
  $('rewind').addEventListener('click', () => { pause(); index = 0; phase = 'free'; render(); });
  $('range').addEventListener('input', () => { pause(); index = Number($('range').value); phase = 'free'; render(); });
  root.querySelectorAll('[data-phase]').forEach(button => button.addEventListener('click', () => { phase = button.dataset.phase; render(); }));
  root.querySelectorAll('[data-metric]').forEach(button => button.addEventListener('click', () => { metric = button.dataset.metric; render(); }));
  $('edge').addEventListener('input', () => { if ($('edge').value === '') return; edge = Math.max(0, Math.min(449, Math.trunc(Number($('edge').value)))); manualEdge = true; render(); });
  $('peak').addEventListener('click', () => { manualEdge = false; render(); });
  $('heatmap').addEventListener('click', event => {
    const rect = $('heatmap').getBoundingClientRect();
    edge = Math.min(449, Math.max(0, Math.floor((event.clientY - rect.top) / rect.height * 15) * 30 + Math.floor((event.clientX - rect.left) / rect.width * 30)));
    manualEdge = true; render();
  });

  function render() {
    const f = frame(); buttons();
    if (!f) { $('explanation').textContent = '等待后端提供真实算法帧。'; return; }
    if (renderedId !== f.id) { metric = f.kind === 'eligibility' ? 'contrast' : f.kind === 'update' ? 'weight_delta' : 'eligibility'; renderedId = f.id; }
    $('context').textContent = `环境时刻 ${f.tick} · 第 ${f.episode} 趟 · 算法帧 #${f.id}`;
    $('title').textContent = f.label;
    $('explanation').textContent = COPY[f.kind] + (f.kind === 'reward' && !f.learned ? ' 当前是平静动作：没有采样资格，只检测结果偏差，不进行 Actor 更新。' : '');
    $('position').textContent = `${index + 1} / ${trace.frames.length} 帧${trace.total_frames > trace.limit ? ' · 最近片段' : ''}`;
    $('range').max = trace.frames.length - 1; $('range').value = index;
    const stages = [['input', '观察'], ['neural', '活动'], ['choice', '选择'], ['eligibility', '资格'], ['wait', '等待'], ['reward', '奖励'], ['update', '更新']];
    const active = ['credit', 'terminal'].includes(f.kind) ? f.kind === 'credit' ? 'eligibility' : 'update' : f.kind === 'travel' ? 'wait' : f.kind;
    $('track').innerHTML = stages.map(([key, title]) => `<span class="${key === active ? 'active' : ''}">${title}</span>`).join('');
    $('key-numbers').innerHTML = `<div><small>结果归属</small><b>${f.decision_id ? `D${f.decision_id}` : '准备下一动作'}</b></div><div><small>累积资格 ‖E‖</small><b>${number(f.eligibility_norm)}</b></div><div><small>TD 误差 δ</small><b>${number(f.td_error)}</b></div><div><small>实际奖励</small><b>${number(f.reward)}</b></div>`;
    $('observation').innerHTML = (f.observation || []).map((v, i) => `<span class="${v ? 'on' : ''}"><b>${v}</b>${FEATURES[i]}</span>`).join('') || '<span>此帧沿用待奖动作的观察</span>';
    $('sweeps').textContent = f.sweeps ? `实际求解 ${f.sweeps} 步` : f.plus_steps ? `±β 各 ${f.plus_steps} / ${f.minus_steps} 步` : TITLES[f.kind];
    root.querySelectorAll('[data-phase]').forEach(button => { button.disabled = button.dataset.phase !== 'free' && !f[button.dataset.phase]; button.setAttribute('aria-pressed', String(button.dataset.phase === phase)); });
    const activity = phase === 'free' ? f.activity : f[phase] || f.activity;
    $('neurons').innerHTML = GROUPS.map(([key, label, prefix]) => {
      const indices = trace.topology.populations[key], peak = maxAbs(indices.map(i => activity[i]));
      return `<div class="algorithm-region"><div><b>${label} ${indices.length}</b><small>峰值 ${number(peak)}</small></div><div class="algorithm-cells">${indices.map((i, j) => `<span data-neuron="${i}" title="神经元 ${i} · ${prefix}${j} · ${activity[i]}" style="--cell:${hue(activity[i], peak * 2)}"><small>${prefix}${j}</small><b>${number(activity[i])}</b></span>`).join('')}</div></div>`;
    }).join('');
    const actionNames = f.action_space === 'street' ? ['西街', '东街'] : ['北巷', '南巷'];
    $('action').innerHTML = f.probabilities ? `<b>${f.greedy ? '贪心' : '抽样'}结果：${actionNames[f.action]} · D${f.decision_id}</b>${f.probabilities.map((p, i) => `<div class="algorithm-prob"><span>${actionNames[i]} ${i === f.action ? '✓' : ''}</span><i style="--prob:${p * 100}%"></i><b>${(p * 100).toFixed(2)}%</b></div>`).join('')}` : `<b>${['input', 'neural'].includes(f.kind) ? '本帧展示输入／自由态，还未展示动作读出。' : f.kind === 'terminal' ? '上一趟结算完成，随后发出下一趟动作。' : `对应动作：${actionNames[f.action]}${f.decision_id ? ` · D${f.decision_id}` : ''}`}</b>`;
    if (!f[metric]) metric = f.kind === 'eligibility' ? 'contrast' : f.kind === 'update' ? 'weight_delta' : 'eligibility';
    root.querySelectorAll('[data-metric]').forEach(button => { button.disabled = !f[button.dataset.metric]; button.setAttribute('aria-pressed', String(button.dataset.metric === metric)); });
    const values = f[metric] || f.eligibility, peak = maxAbs(values);
    if (!manualEdge) edge = values.reduce((best, v, i) => Math.abs(v) > Math.abs(values[best]) ? i : best, 0);
    $('edge').value = edge;
    const canvas = $('heatmap'), ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 600, 240);
    values.forEach((v, i) => { const x = i % 30 * 20, y = Math.floor(i / 30) * 16; ctx.fillStyle = hue(v, peak); ctx.fillRect(x + 1, y + 1, 18, 14); });
    ctx.strokeStyle = '#253d38'; ctx.lineWidth = 2; ctx.strokeRect(edge % 30 * 20 + 1, Math.floor(edge / 30) * 16 + 1, 18, 14);
    $('heat-caption').textContent = `${metric === 'contrast' ? '待奖对比 C' : metric === 'weight_delta' ? '实际改变量 Δw' : '已累积资格 E'} · 峰值 ${number(peak)} · 正负分色，自适应缩放 · 点击格子检查连接`;
    const pre = trace.topology.pre[edge], post = trace.topology.post[edge];
    root.querySelectorAll('[data-neuron]').forEach(cell => cell.classList.toggle('connected', [pre, post].includes(Number(cell.dataset.neuron))));
    $('edge-name').textContent = `#${edge} · ${name(pre)} → ${name(post)}`;
    $('edge-details').innerHTML = `<span>本次 C <b>${number(f.contrast?.[edge])}</b></span><span>累积 E <b>${number(f.eligibility[edge])}</b></span><span>实际 Δw <b>${number(f.weight_delta?.[edge])}</b></span>${f.weights_before ? `<span>更新前 <b>${number(f.weights_before[edge])}</b></span><span>更新后 <b>${number(f.weights_after[edge])}</b></span>` : ''}`;
    $('formula').textContent = f.kind === 'credit' ? `E = 0.72 × ${number(f.old_eligibility[edge])} + ${number(f.contrast[edge])} = ${number(f.eligibility[edge])}` : f.kind === 'update' ? `请求 Δw = 0.1 × ${number(f.modulation)} × ${number(f.eligibility[edge])}；实际应用 ${number(f.weight_delta[edge])}` : f.kind === 'eligibility' ? 'C = (s⁺前·s⁺后 − s⁻前·s⁻后) / (2β)；保存扰动状态，等真实反馈再累积。' : f.kind === 'wait' || f.kind === 'travel' ? '结果未知 → 不学习，E 不衰减，待奖 ID 不替换。' : '资格回答“哪些连接参与选择”，TD 误差回答“结果比预计好还是差”。';
    $('parameter-summary').innerHTML = f.kind === 'update' ? `<b>${f.changed_weights} / 450 条连接发生变化</b><span>最大 |Δw| ${number(f.max_weight_delta)} · 偏置 ‖Δb‖ ${number(length(f.bias_delta))}</span><span>Critic ‖Δθ‖ ${number(length(f.critic_delta))} · 联想矩阵 ‖ΔC‖ ${number(length(f.memory_delta))}</span>` : f.kind === 'reward' ? `<b>${f.learned ? '这次结果进入 Actor–Critic 学习' : '平静结果：Actor–Critic 不更新'}</b><span>原价值 ${number(f.value_before)} · 预测误差大小 ${number(f.td_error_abs)}</span>` : f.kind === 'wait' ? '<b>图参数、Critic 和联想记忆保持不变</b>' : '<span>参数更新将在实际反馈帧中展示。</span>';
    $('working-norm').textContent = `‖c‖ ${number(length(f.working_trace))}`;
    const workPeak = maxAbs(f.working_trace);
    $('working').innerHTML = f.working_trace.map((v, i) => `<span style="--cell:${hue(v, workPeak * 2)}" title="c${i}=${v}"><small>c${i}</small><b>${number(v)}</b></span>`).join('');
    const comparisonFrame = trace.frames.slice(0, index + 1).reverse().find(row => row.comparison);
    const comparison = comparisonFrame?.comparison;
    $('baseline').innerHTML = comparison ? `<p>最近基线结算：环境时刻 ${comparisonFrame.tick}${comparisonFrame.tick < f.tick ? '；当前时刻的基线尚未播放到结算帧。' : ''}</p><p><b class="r">规则记路</b> · 锁存${comparison.rule.remembered_cue ? '灯笼' : '樱花'}路牌<br>两类候选路线：${comparison.rule.before.join(' / ')} → ${comparison.rule.after.join(' / ')}</p><p><b class="q">Q-learning</b> · 状态 [路牌 ${comparison.q.state[0]}, 位置 ${comparison.q.state[1]}]<br>${comparison.q.updated ? `表项 ${number(comparison.q.before)} → ${number(comparison.q.after)}，ΔQ=${number(comparison.q.delta)}` : '本时刻没有实际反馈，Q 表保持'}</p>` : '<p>第一个环境时刻结算后展示基线的真实表项变化。规则与 Q 明确锁存路牌，Cadence 使用活动轨迹。</p>';
    $('raw').textContent = JSON.stringify({ config: trace.config, ...f }, null, 2);
  }
  return {
    get playing() { return running; }, pause,
    setBusy(value) { busy = value; buttons(); },
    setTrace(value, { reset = false, follow = false } = {}) {
      const owned = frame()?.id; trace = value;
      if (!trace) { render(); return; }
      if (reset) { pause(); index = 0; phase = 'free'; manualEdge = false; renderedId = null; }
      else if (follow) index = trace.frames.length - 1;
      else index = Math.max(0, trace.frames.findIndex(f => f.id === owned));
      render();
    },
  };
}
