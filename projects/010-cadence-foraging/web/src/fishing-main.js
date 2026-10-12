import './fishing-style.css';
import './hub-style.css';
import evidence from './fish-results.json';

const keys = ['cadence', 'velocity', 'acceleration'];
const names = {cadence: 'Cadence', velocity: '匀速预测', acceleration: '匀加速度预测'};
const colors = {cadence: '#b898ff', velocity: '#ffd18c', acceleration: '#73dce3'};
const modes = {inertia: '有惯性的随机运动', independent: '每一步独立随机变向'};
const $ = id => document.getElementById(id);
const f = (v, digits = 1) => Number(v).toFixed(digits);
document.querySelector('#app').innerHTML = `
<header><strong>CADENCE / 010 · 运动预测实验</strong><nav aria-label="站点导航"><a href="./index.html">研究首页</a><a href="./guide.html">理解指南</a><a href="./applications.html">能力与业务</a><a href="./index.html#experiment">四店觅食</a><a href="./route.html#algorithm">街区与算法</a><a href="#principle">预测原理</a><a href="./index.html#resources">全部资料</a></nav></header>
<main><div class="intro"><div><div class="eyebrow">Only the past · Predict the future</div><h1>鱼会往哪里游？</h1><p>给预测器看 0.4 秒历史位置，再预测未来 1.2 秒。鱼会随机转弯、加速；看 Cadence 经过训练后学到什么，以及简单运动公式什么时候更好用。</p></div><span class="tag">真实 TemporalPatchNet · CPU</span></div>
<div class="guide-callout">看懂这个实验：<a href="./applications.html#scenarios">捕鱼之外的 14 个场景与业务</a><a href="./fish-ep.html#ep-contrast-animation">为什么两侧相减？八幕动画</a><a href="./fish-ep.html#ep-player">一条鱼的 EP · 实际数字单步</a><a href="./fish-ep.html#ep-understanding">正负扰动与相减理由 · 汇总</a><a href="./guide.html#prediction">预测、训练与回放的区别</a><a href="./guide.html#ep">EP 原理</a><a href="./guide.html#drone">不规则运动与无人机</a><a href="./guide.html#glossary">技术词典</a></div>
<div class="settings"><label>运动条件 <select id="mode"><option value="inertia">有惯性 · 转弯与加速相关</option><option value="independent">独立随机 · 每步重新变向</option></select></label><label>种子 <input id="seed" type="number" min="0" max="99999" value="7"></label><button id="reset">新建 / 重置模型</button><span class="status" id="status" role="status" aria-live="polite">连接真实引擎…</span></div>
<div id="error" class="error" hidden role="alert"></div>
<div class="grid"><section class="pond-card" aria-label="预测轨迹和射击回放"><div class="pond-top"><div><h2 id="case-title">留出鱼 #01 / 48</h2><p>先观察，后射击。三条预测在观察截止处同时冻结。</p></div><select id="focus" aria-label="突出显示预测器"><option value="all">同时对照</option><option value="cadence">Cadence</option><option value="velocity">匀速</option><option value="acceleration">匀加速度</option></select></div><div class="canvas-wrap"><canvas id="pond" aria-label="历史位置、预测轨迹、实际轨迹和三种预测器的子弹"></canvas><span class="water-label" id="water-label">观察截止：t = 0.40 s · 虚线 = 预测 · 实线 = 实际</span></div><div class="legend"><span><i class="swatch" style="background:#fff"></i>已揭示实际轨迹</span>${keys.map(k => `<span><i class="swatch" style="background:${colors[k]}"></i>${names[k]}</span>`).join('')}<span>○ 预测落点 · ✦ 命中</span></div><div class="playback"><button id="play" class="primary">播放未来 / 射击</button><button id="step">前进一帧</button><button id="replay">回到观察截止</button><button id="previous">← 上一条鱼</button><button id="next">下一条鱼 →</button><div class="scrub"><label for="frame">回放时间</label><input id="frame" type="range" min="0" max="32" step="1" value="8"><output id="time">观察截止 0.40 s</output></div></div><div class="pond-note" id="shot-status">回放只揭示已记录的未来；不会再次学习。子弹按真实飞行时间、鱼与子弹半径结算。</div></section>
<aside class="panel"><div class="eyebrow">Learn from other fish</div><h2 style="margin-top:7px">先让它学习，再看预测</h2><p>192 条训练鱼，与当前 48 条测试鱼分开。只用已经采集完的训练轨迹教它，测试时冻结参数。</p><div class="train-buttons"><button id="train-step">训练 8 批</button><button id="train-all" class="primary">训练至 192 批</button><button id="stop" hidden>停止训练</button></div><div class="numbers"><span><strong id="batch">0</strong> / 192 批</span><span><strong id="updates">0</strong> 次更新</span></div><div class="progress"><i id="progress" style="width:0%"></i></div><p class="small">学习曲线 · 同一批测试鱼的平均轨迹误差（越低越好）</p><svg id="curve" class="curve" viewBox="0 0 280 135" aria-label="Cadence 学习前后误差曲线"></svg><div id="improvement" class="small">未训练：随机初始化，尚未学到运动。</div><div id="loss" class="loss">288 个真实参数 · A/B/C 三个矩阵<br>等待第一次训练更新。</div></aside></div>
<div class="holdout"><div><h2>同一批 48 条未参与训练的鱼</h2><p id="metric-note">所有预测器看相同的九个历史位置；每条鱼各发一颗子弹。</p></div><button id="export">导出本次 JSON</button></div>
<div class="metric-grid">${keys.map(k => `<article class="metric"><h3><i style="background:${colors[k]}"></i>${names[k]}</h3><div><span id="ade-${k}" class="big">—</span><span class="unit">px 平均误差</span></div><div class="rows"><span>1.2 s 误差 <b id="fde-${k}">—</b></span><span>命中 <b id="hit-${k}">—</b></span></div></article>`).join('')}</div>
<div class="lower"><section class="panel"><h2>预测得越远，还能信多少？</h2><p>48 条鱼在各预测时长的平均位置误差；不是置信区间。</p><svg id="horizons" class="chart" viewBox="0 0 540 190" aria-label="三种预测器随预测时长变化的误差"></svg></section><section class="panel"><h2 id="meaning-title">这条鱼有什么能学的？</h2><p id="meaning"></p><div class="loss" id="current-error">播放未来后，显示当前鱼的实际预测误差。</div><p class="small">轨迹误差与命中率衡量不同事情。射击通常在约 0.4 秒后遇到鱼；1.2 秒的预测更准，未必更容易命中。</p></section></div>
<section class="panel explain" id="principle"><div class="eyebrow">What actually learns</div><h2 style="margin-top:8px">本次是监督时序预测：用未来位置做训练答案</h2><p>不是上一页的奖励学习。Cadence 的 TemporalPatchNet 用带状态的神经网络拟合历史 → 未来位移；匀速、匀加速度直接套运动公式，不训练。</p><div class="flow"><div><strong>① 只看历史位置</strong><p>9 个位置，间隔 0.05 s。用位置差计算速度与加速度，得到 7 × 4 个输入数；不读取模拟器真实速度、随机数或未来位置。</p></div><div><strong>② 带状态地读历史</strong><p>hₜ = A tanh(hₜ₋₁) + B uₜ<br>yₜ = C tanh(hₜ)<br>8 个隐藏单元，24 个输出数：12 个未来时点的 x/y 位移。</p></div><div><strong>③ 用真实答案教它</strong><p>训练轨迹采集后，拿真实未来位移计算平方误差。自由与正负扰动序列作 EP 对比，更新 A/B/C；回溯检查训练损失，失败则拒绝更新。</p></div><div><strong>④ 冻结后预测 / 射击</strong><p>测试鱼每次从零隐藏状态读自己的历史，输出未来点。求子弹与预测轨迹的相遇方向，再用实际鱼轨迹做连续碰撞检测。</p></div></div><p class="small">匀速：p̂(t) = p₀ + v₀t；匀加速度：再加 ½a₀t²。这里 v₀/a₀ 都由相同历史位置差得到。模型输入和训练目标做尺度归一化；每批 8 条轨迹，在 7 个历史截止点同时监督。回放实际未来是显示层数据，不进入预测器。</p><details><summary>检查当前输入、训练更新和数据隔离</summary><pre id="audit">连接中…</pre></details></section>
<section class="panel explain"><h2>四个种子的实测结果</h2><p>种子 7、41、42、43，每种条件 192 条留出鱼；Cadence 训练 192 批，公式基线不训练。下表是本机已运行的数据；此数据用于开发观察，尚不是独立确认集。</p><div class="table-wrap"><table><thead><tr><th>条件</th><th>预测器</th><th>平均误差 px</th><th>1.2 s 误差 px</th><th>实际命中</th></tr></thead><tbody id="evidence"></tbody></table></div><p class="small" id="evidence-note"></p></section>
<div class="footer">Cadence 0.80.0 · 固定上游 19bee92756d1842176ad30b1cd01edbfbfa3f14c · GPL-3.0<br>本机 Python 真实计算；没有外部模型 API。命中率取决于鱼半径 13 px、子弹半径 4 px、子弹速度 700 px/s、炮台位置与预测时长，不等同于真实商业游戏效果。</div></main>`;

let state, coldCases, busy = false, running = false, autoTrain = false, caseIndex = 0, frame = 8, lastFrame = 0;
const canvas = $('pond'), ctx = canvas.getContext('2d');
let pendingRequest = null;
$('meaning').insertAdjacentHTML('afterend', '<p class="small" id="reference"></p>');
async function post(url, body) {
  const response = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
function controls() {
  for (const id of ['mode', 'seed', 'reset', 'train-step', 'train-all']) $(id).disabled = busy || autoTrain;
  $('train-step').disabled ||= !state || state.finished;
  $('train-all').disabled ||= !state || state.finished;
  $('stop').hidden = !autoTrain;
  for (const id of ['play', 'step', 'replay', 'previous', 'next', 'frame', 'export']) $(id).disabled = !state || busy;
  $('play').textContent = running ? '暂停回放' : '播放未来 / 射击';
}
function failure(error) { $('error').hidden = false; $('error').textContent = `运行失败：${error.message}。可重试原批次；没有替换为模拟模型。`; $('status').textContent = '真实引擎请求失败'; }
async function reset() {
  autoTrain = running = false; busy = true; controls(); $('error').hidden = true; $('status').textContent = '初始化真实模型与测试鱼…';
  try {
    const seed = Number($('seed').value);
    if (!Number.isInteger(seed) || seed < 0 || seed > 99999 || $('seed').value === '') throw new Error('种子须为 0–99999 的整数');
    state = await post('/api/fishing', {seed, mode: $('mode').value});
    coldCases = state.cases; pendingRequest = null; caseIndex = 0; frame = 8; render();
  } catch (error) { failure(error); } finally { busy = false; controls(); }
}
async function trainBatch() {
  busy = true; running = false; controls(); $('error').hidden = true; $('status').textContent = '真实 EP 训练中…';
  try {
    pendingRequest ||= {count: 8, request_id: crypto.randomUUID()};
    state = await post(`/api/fishing/${state.session}/train`, pendingRequest);
    pendingRequest = null; frame = 8; render();
    return true;
  } catch (error) { failure(error); return false; } finally { busy = false; controls(); }
}
function polyline(points) { return points.map(p => p.map(v => f(v, 2)).join(',')).join(' '); }
function chart(id, series, maxX, maxY, width, height, xLabel, logScale = false) {
  const left = 37, top = 12, plotW = width - 52, plotH = height - 45;
  const scale = ([x,y]) => [left + x / maxX * plotW, top + (1 - (logScale ? Math.log1p(y) / Math.log1p(maxY) : y / maxY)) * plotH];
  const grid = [0, .5, 1].map(r => `<line x1="${left}" x2="${width-15}" y1="${top+(1-r)*plotH}" y2="${top+(1-r)*plotH}" stroke="#e2eae4"/><text x="${left-7}" y="${top+(1-r)*plotH+4}" text-anchor="end">${f(logScale ? Math.expm1(r*Math.log1p(maxY)) : maxY*r, 0)}</text>`).join('');
  const paths = series.map(s => `<polyline points="${polyline(s.points.map(scale))}" fill="none" stroke="${s.color}" stroke-width="2.5" ${s.dash ? 'stroke-dasharray="4 4"' : ''}/>${s.points.length === 1 ? `<circle cx="${scale(s.points[0])[0]}" cy="${scale(s.points[0])[1]}" r="3" fill="${s.color}"/>` : ''}`).join('');
  $(id).innerHTML = `<g font-family="system-ui" font-size="10" fill="#7e9496">${grid}${paths}<text x="${left}" y="${height-12}">0</text><text x="${width-15}" y="${height-12}" text-anchor="end">${xLabel}</text></g>`;
}
function render() {
  $('status').textContent = `${modes[state.mode]} · 真实引擎就绪`;
  $('batch').textContent = state.batches; $('updates').textContent = state.updates;
  $('progress').style.width = `${state.batches / 192 * 100}%`;
  for (const k of keys) {
    const m = state.metrics[k];
    $(`ade-${k}`).textContent = f(m.ade); $(`fde-${k}`).textContent = f(m.fde);
    $(`hit-${k}`).textContent = `${m.hits}/48 · ${f(m.hit_rate*100)}%`;
  }
  const maxCurve = Math.max(1, ...state.curve.map(p => p.ade)) * 1.12;
  chart('curve', [{points: state.curve.map(p => [p.batches, p.ade]), color: '#9773d5'}],192,maxCurve,280,135,'192 批');
  $('improvement').textContent = `Cadence：未训练 ${f(state.cold_metrics.ade)} → 当前 ${f(state.metrics.cadence.ade)} px。${state.batches ? '曲线下降表示它在其他鱼上学到的模式能用于这些留出鱼。' : '先训练，再与简单公式对照。'}`;
  const l = state.last_training;
  $('loss').innerHTML = l ? `最近批次损失 ${f(l.initial_loss,5)} → ${f(l.final_loss,5)}<br>更新${l.updated ? '已接受' : '被拒绝'} · 参数${l.parameter_changed ? '确已改变' : '未改变'} · 步长 ${f(l.accepted_rate || 0,3)}<br>训练累计 ${f(state.training_ms/1000,2)} s · 测试预测 ${f(state.predict_ms_per_clip,3)} ms/鱼<br>288 参数 · SHA ${state.parameter_sha256.slice(0,12)}…` : '288 个真实参数 · A/B/C 三个矩阵<br>随机初始化；尚未训练。';
  const horizonSeries = keys.map(k => ({color:{cadence:'#9773d5',velocity:'#b18039',acceleration:'#358f9b'}[k],points:state.config.horizons.map((h,i) => [h*state.config.dt,state.cases.reduce((sum,c) => sum+c.errors[k][i],0)/48])}));
  chart('horizons',horizonSeries,1.2,Math.max(1,...horizonSeries.flatMap(s=>s.points.map(p=>p[1])))*1.12,540,190,'未来 1.2 s',state.mode === 'independent');
  $('horizons').previousElementSibling.textContent = `48 条鱼在各预测时长的平均位置误差。${state.mode === 'independent' ? '纵轴为对数刻度，展开低误差区域；数字仍是 px。' : '纵轴为线性刻度，单位 px。'}这不是置信区间。`;
  $('meaning').textContent = state.mode === 'inertia' ? '随机加速度有惯性：刚才的速度、转弯趋势，对接下来仍有信息。Cadence 可以学习“趋势还会持续多久、何时该收缩预测”；它学的是这些统计联系，不能知道下一次随机扰动。短时射击时，匀加速度也可能已经足够好。' : '每 0.05 秒方向与速度都独立重新抽签，历史不能告诉你下一次抽到什么。Cadence 能学习平均位移接近零，避免把刚才的随机动作持续外推；误差下降也不表示它猜到了真实随机转弯。未来的单次位置仍然不确定。';
  const reference = state.metrics.stationary;
  $('reference').textContent = `零位移校验（始终预测当前位置，无需训练）：平均误差 ${f(reference.ade)} px，命中 ${reference.hits}/48。${state.mode === 'independent' ? '此条件下条件均值就是当前位置；先与这个简单答案比，再判断学习的价值。' : '有持续运动时，停在原地的预测会落后于鱼。'}`;
  renderCase(); controls();
}
function renderCase() {
  if (!state) return;
  const c = state.cases[caseIndex], elapsed = Math.max(0,(frame-8)*.05);
  $('case-title').textContent = `留出鱼 #${String(caseIndex+1).padStart(2,'0')} / 48`;
  $('frame').value = frame; $('time').textContent = `${frame <= 8 ? '观察' : '未来'} ${f(frame*.05,2)} s`;
  $('water-label').textContent = `观察截止 t = 0.40 s · ${frame <= 8 ? '历史位置逐点出现' : `正在揭示未来 +${f(elapsed,2)} s`}`;
  $('shot-status').textContent = frame <= 8 ? '在 t = 0.40 s 同时发射。三种子弹分别在相同鱼的独立副本中结算；回放不会重复学习。' : keys.map(k => `${names[k]}：${c.shots[k].hit_time !== null && elapsed >= c.shots[k].hit_time ? `已命中 +${f(c.shots[k].hit_time,2)} s` : frame === 32 ? '未命中' : '飞行中'}`).join(' · ');
  const horizonIndex = frame >= 10 ? Math.min(11,Math.floor((frame-10)/2)) : -1;
  $('current-error').textContent = horizonIndex < 0 ? '实际未来尚未揭示。图上圆点是预测落点，不是鱼已经到达的位置。' : `当前鱼 · 未来 +${f((horizonIndex+1)*.1)} s 的实际位置误差：${keys.map(k=>`${names[k]} ${f(c.errors[k][horizonIndex])} px`).join(' / ')}`;
  $('audit').textContent = JSON.stringify({engine:state.provenance.engine, seed:state.seed, mode:state.mode,
    observed_positions:c.positions.slice(0,9), input_cutoff_seconds:.4, future_horizons_seconds:state.config.horizons.map(h=>h*.05),
    input_features:'位置差 → 数值速度 /170、数值加速度 /400；7×4；无模拟器隐状态',
    training_pool:192,test_pool:48,train_test_disjoint:!state.provenance.training_seeds.some(s=>state.provenance.test_seeds.includes(s)),
    last_training:state.last_training,parameter_sha256:state.parameter_sha256,current_fish_seed:c.seed,
    current_shots:c.shots,replay:'固定参数/预测快照；不是边测试边学习'},null,2);
  draw();
}
function draw() {
  if (!state) return;
  const width = canvas.clientWidth, height = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1,2);
  if (canvas.width !== Math.round(width*dpr) || canvas.height !== Math.round(height*dpr)) {canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
  ctx.setTransform(width/1000*dpr,0,0,height/600*dpr,0,0); ctx.clearRect(0,0,1000,600);
  const gradient = ctx.createLinearGradient(0,0,0,600);gradient.addColorStop(0,'#102f3a');gradient.addColorStop(1,'#1a4652');ctx.fillStyle=gradient;ctx.fillRect(0,0,1000,600);
  ctx.strokeStyle='#88b4bb12';ctx.lineWidth=1;
  for(let x=0;x<=1000;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,600);ctx.stroke();}
  for(let y=0;y<=600;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1000,y);ctx.stroke();}
  for(let i=0;i<10;i++){ctx.fillStyle='#95cdd018';ctx.beginPath();ctx.arc((i*137+31)%1000,(i*89+20)%560,2+i%3,0,Math.PI*2);ctx.fill();}
  const c=state.cases[caseIndex], origin=c.positions[8], visible=keys.filter(k=>$('focus').value==='all'||$('focus').value===k);
  const path=(points,color,dash=[],line=2)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=line;ctx.setLineDash(dash);ctx.stroke();ctx.setLineDash([]);};
  if(frame>=8){
    if(state.batches && visible.includes('cadence')) path([origin,...coldCases[caseIndex].forecasts.cadence],'#b898ff35',[2,8]);
    for(const k of visible){path([origin,...c.forecasts[k]],colors[k],[7,7],2.4);c.forecasts[k].forEach((p,i)=>{ctx.beginPath();ctx.arc(...p,i===11?5:2.3,0,Math.PI*2);ctx.strokeStyle=colors[k];ctx.lineWidth=1.5;ctx.stroke();});}
    ctx.beginPath();ctx.arc(...origin,9,0,Math.PI*2);ctx.strokeStyle='#d9e5d4';ctx.lineWidth=2;ctx.stroke();ctx.font='13px system-ui';ctx.fillStyle='#bdd8d1';ctx.fillText('观察截止',origin[0]+15,origin[1]-12);
  }
  path(c.positions.slice(0,Math.min(frame+1,9)),'#adc5cc',[],2);
  if(frame>8)path(c.positions.slice(8,frame+1),'#ffffff',[],3);
  c.positions.slice(0,Math.min(frame+1,9)).forEach(p=>{ctx.beginPath();ctx.arc(...p,2.6,0,Math.PI*2);ctx.fillStyle='#e1ebea';ctx.fill();});
  const fish=c.positions[frame], prev=c.positions[Math.max(0,frame-1)], angle=Math.atan2(fish[1]-prev[1],fish[0]-prev[0]);
  ctx.save();ctx.translate(...fish);ctx.rotate(angle);ctx.fillStyle='#b6e9dc';ctx.beginPath();ctx.moveTo(-11,0);ctx.lineTo(-24,-10);ctx.lineTo(-24,10);ctx.closePath();ctx.fill();ctx.beginPath();ctx.ellipse(0,0,16,9,0,0,Math.PI*2);ctx.fillStyle='#e0f6cf';ctx.fill();ctx.beginPath();ctx.arc(9,-3,2,0,Math.PI*2);ctx.fillStyle='#183c44';ctx.fill();ctx.restore();
  const gun=state.config.gun;
  if(frame>=8){const t=(frame-8)*.05;
    for(const k of visible){const s=c.shots[k],hit=s.hit_time!==null&&t>=s.hit_time, travel=hit?s.hit_time:t;
      const bullet=gun.map((v,i)=>v+s.direction[i]*700*travel);
      ctx.globalAlpha=.3;path([gun,s.aim],colors[k],[3,12],1);ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(...s.aim,7,0,Math.PI*2);ctx.strokeStyle=colors[k];ctx.lineWidth=1.5;ctx.stroke();
      if(t>0){ctx.beginPath();ctx.arc(...bullet,hit?15:4,0,Math.PI*2);ctx.fillStyle=colors[k];hit?ctx.stroke():ctx.fill();if(hit){ctx.font='23px system-ui';ctx.fillText('✦',bullet[0]-9,bullet[1]+8);}}
    }
  }
  ctx.fillStyle='#abc8c1';ctx.beginPath();ctx.arc(...gun,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#183f49';ctx.fillRect(gun[0]-5,gun[1]-24,10,20);ctx.font='12px system-ui';ctx.fillStyle='#9bbbbf';ctx.fillText('炮台 · 700 px/s',gun[0]+25,gun[1]+5);
  if(state.batches){ctx.fillStyle='#94b5bc';ctx.font='12px system-ui';ctx.fillText('浅紫细线：同一条鱼的未训练 Cadence 预测',24,572);}
  if(visible.some(k=>c.forecasts[k].some(p=>p[0]<0||p[0]>1000||p[1]<0||p[1]>600))){ctx.fillStyle='#d9c9a0';ctx.font='12px system-ui';ctx.fillText('部分预测超出视野；误差仍按完整轨迹计算',24,550);}
}
for(const mode of Object.keys(modes))for(const k of keys){const m=evidence.aggregate[mode][k];$('evidence').insertAdjacentHTML('beforeend',`<tr><td>${modes[mode]}</td><td>${names[k]}</td><td>${f(m.ade)}</td><td>${f(m.fde)}</td><td>${m.hits}/${m.shots} · ${f(m.hit_rate*100)}%</td></tr>`);}
for(const mode of Object.keys(modes)){const m=evidence.aggregate[mode].stationary;$('evidence').insertAdjacentHTML('beforeend',`<tr><td>${modes[mode]}</td><td>零位移校验 · 无需训练</td><td>${f(m.ade)}</td><td>${f(m.fde)}</td><td>${m.hits}/${m.shots} · ${f(m.hit_rate*100)}%</td></tr>`);}
$('evidence-note').textContent = Object.keys(modes).map(mode=>`${modes[mode]}：Cadence 未训练平均误差 ${f(evidence.aggregate[mode].cold_cadence.ade)} → 训练后 ${f(evidence.aggregate[mode].cadence.ade)} px`).join('；')+'。保留全部种子；不表示 Cadence 在所有鱼类运动上胜出。';
$('reset').onclick=reset; $('mode').onchange=reset;
$('train-step').onclick=()=>trainBatch();
$('train-all').onclick=async()=>{autoTrain=true;controls();while(autoTrain&&!state.finished){if(!await trainBatch())break;await new Promise(resolve=>setTimeout(resolve,0));}autoTrain=false;controls();};
$('stop').onclick=()=>{autoTrain=false;controls();};
$('play').onclick=()=>{if(frame>=32)frame=8;running=!running;lastFrame=performance.now();controls();renderCase();};
$('step').onclick=()=>{running=false;frame=Math.min(32,frame+1);controls();renderCase();};
$('replay').onclick=()=>{running=false;frame=8;controls();renderCase();};
$('next').onclick=()=>{running=false;caseIndex=(caseIndex+1)%48;frame=8;controls();renderCase();};
$('previous').onclick=()=>{running=false;caseIndex=(caseIndex+47)%48;frame=8;controls();renderCase();};
$('frame').oninput=()=>{running=false;frame=Number($('frame').value);controls();renderCase();};
$('focus').onchange=draw;
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({...state,viewer:{caseIndex,frame},cold_cases:coldCases},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`fish-${state.mode}-seed-${state.seed}-${state.batches}b.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
new ResizeObserver(draw).observe(canvas);
function animate(now){if(running&&state&&now-lastFrame>=200){frame=Math.min(32,frame+1);lastFrame=now;renderCase();if(frame===32){running=false;controls();}}requestAnimationFrame(animate);}requestAnimationFrame(animate);
controls(); reset();
