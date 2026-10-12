import './style.css';
import './hub-style.css';
import './guide-style.css';

const $ = id => document.getElementById(id);
const phases = [
  ['自由计算 · 没有教学答案进入推理', '先看网络自己的回答',
    '只有历史输入。网络内部反复相互影响，计算出“2 米”的自由预测。1.5 米是旧记录中的答案，此阶段不拿答案替它回答。',
    ['历史输入', '自由活动 s⁰', '自己的预测：2 米'],
    '参数暂时不变；活动用于当前计算。'],
  ['正扰动 +β · 私有教学状态', '轻轻往答案方向牵动输出',
    '在相同历史输入和参数下，加入朝已知答案方向的轻微教学作用。输出与内部活动随之改变，记录 s⁺；它不是新的真实飞行，也不是部署时的预测。',
    ['相同输入 / 参数', '+β 教学作用', '记录活动 s⁺'],
    '改变的是教学活动，尚未提交参数更新。'],
  ['负扰动 −β · 私有教学状态', '从同一自由状态，再算反方向变化',
    '回到原来的自由状态，以相反符号的轻微扰动计算 s⁻。比较 s⁺ 与 s⁻；不是把正扰动算完后继续往回拉，也没有执行两次环境动作。',
    ['同一自由起点', '−β 教学作用', '记录活动 s⁻'],
    '两个教学阶段保持相同输入和原参数。'],
  ['局部对比 → 参数更新', '留下经验，下次仍然只给输入',
    '连接两端的活动差形成更新方向；学习率控制步幅。时序模块使用两条路径的参数导数对比，奖励路径还需要 TD 与资格迹。以后自由预测使用更新后的参数，不再传入未知答案。',
    ['正 / 负活动对比', '学习信号与更新', '下次自由预测'],
    '只有此阶段修改学习参数；不保证一次更新就准确预测 1.5 米。'],
];
let phaseIndex = 0;
function showPhase(index) {
  phaseIndex = index;
  const [label, title, description, flow, parameter] = phases[index];
  $('ep-label').textContent = label; $('ep-title').textContent = title;
  $('ep-description').textContent = description; $('ep-parameter').textContent = parameter;
  $('ep-position').textContent = (index + 1) + ' / 4';
  $('ep-previous').disabled = index === 0; $('ep-next').disabled = index === 3;
  for (const button of document.querySelectorAll('[data-ep]')) button.setAttribute('aria-pressed', String(Number(button.dataset.ep) === index));
  $('ep-flow').replaceChildren();
  flow.forEach((value, i) => {
    if (i) { const arrow = document.createElement('i'); arrow.textContent = '→'; $('ep-flow').append(arrow); }
    const span = document.createElement('span'); span.textContent = value; $('ep-flow').append(span);
  });
}
for (const button of document.querySelectorAll('[data-ep]')) button.addEventListener('click', () => showPhase(Number(button.dataset.ep)));
$('ep-previous').addEventListener('click', () => showPhase(Math.max(0, phaseIndex - 1)));
$('ep-next').addEventListener('click', () => showPhase(Math.min(3, phaseIndex + 1)));
showPhase(0);

const inputs = {
  position: ['只有历史位置', '可从位置差估计最近速度、加速度和转弯趋势。姿态、控制指令和未来操作没有提供。', '持续运动可比较匀速、匀加速度、转弯模型及学习预测器；位置噪声较大时需先评估状态估计。'],
  telemetry: ['增加姿态与速度', '可看见已经发生的倾斜和运动变化；测量噪声与时间对齐仍需处理。还没有输入摇杆意图。', '可比较带状态估计的运动模型与数据模型，检验姿态是否增加预测信息。'],
  control: ['增加已发出的摇杆与飞行模式', '可学习“这些操作如何引起后续运动”，包括响应延迟。当前操作不等于未来操作。', '可比较控制输入驱动的动力学模型、学习模型或物理加偏差修正。'],
  plan: ['增加已知航线目标', '能利用规划的方向与时序，但预定航线不等于实际执行结果，也不包含未观测扰动。', '可在给定目标与控制假设下预测实际响应，对照预定轨迹与动力学推算。'],
};
const motions = {
  smooth: ['连续变化', '这类“不规则”可能有连续的速度、加速度或曲率结构，有机会短时预测。越远越依赖后续操作。'],
  switch: ['模式切换', '可同时考虑直飞、加速、转弯并更新模型权重，IMM 是一种对照候选；不能提前确定没有提示的下一次切换。'],
  surprise: ['临时新操作', '相同历史可以接左转、右转或停止。新决定还未输入时无法确定；操作发出并可观测后，才可预测其响应。'],
  random: ['未观测的独立变化', '历史不包含下一次独立变化的信息。可以表达分支或分布，并在新测量到达后纠偏；增加算法复杂度不会补出缺失的信息。'],
};
function showDrone() {
  const input = $('drone-input').value, motion = $('drone-motion').value;
  const [title, visible, route] = inputs[input], [kind, change] = motions[motion];
  const host = $('drone-explanation'); host.replaceChildren();
  const h = document.createElement('h3'); h.textContent = title + ' · ' + kind; host.append(h);
  for (const paragraph of ['可利用的信息：' + visible, '这类变化意味着：' + change, '可比较的方法：' + route]) {
    const p = document.createElement('p'); p.textContent = paragraph; host.append(p);
  }
  const p = document.createElement('p'); p.className = 'drone-assumption';
  p.textContent = input === 'control' || input === 'plan'
    ? '必须声明：假设未来保持当前操作，或按历史操作习惯估计。当前指令和航线不能保证后续执行。方案尚未实测。'
    : '这类输入适合研究短时运动延续；它不能确定尚未发生的新操作。0.2 / 0.5 / 1 秒只是候选评估范围。方案尚未实测。';
  host.append(p);
}
$('drone-input').addEventListener('change', showDrone); $('drone-motion').addEventListener('change', showDrone); showDrone();

const terms = [
 ['观察','Observation','模型实际能接收到的数值。它可能只是环境状态的一部分；观众看到的食物光圈不是输入。'],
 ['状态','State','描述当前决策条件或内部上下文的信息。Q 的表格状态和网络的隐藏状态含义不同。'],
 ['动作','Action','系统输出的选择。环境负责把动作解释成真实行为，例如选店或转向。'],
 ['策略','Policy π','给定观察／状态时如何选择动作，可以是确定规则或概率分布。'],
 ['奖励','Reward r','已执行动作收到的反馈数值。奖励未到与奖励为零是不同情况。'],
 ['回报','Return','一段未来奖励按折扣加权的累计值。它与单次奖励不是同一量。'],
 ['Q 值','Q(s,a)','在状态 s 采取动作 a 的预计折扣回报。当前 Q 基线用表存储。'],
 ['价值估计','Value V(s)','Critic 对状态回报的估计；受表示、训练与信号调制影响。'],
 ['学习率','Learning rate / α / η','控制参数每次更新幅度。更大不必更快或更稳定。'],
 ['折扣因子','Discount γ','未来奖励的权重。γ=0 只看当前奖励；终点需要正确处理。'],
 ['探索比例','Epsilon ε','ε-greedy 中随机尝试动作的比例。本项目 Q 使用 ε=0.12。'],
 ['探索与利用','Exploration / exploitation','探索尝试未知选择；利用当前看起来更好的选择。'],
 ['贪心选择','Greedy','选择当前估计最好的动作。它依赖估计，不保证真正最优。'],
 ['TD 误差','Temporal difference δ','实际奖励加下一状态价值，与原价值估计之间的差。用于修正回报预测。'],
 ['Actor','动作选择部分','形成动作策略并选择动作。Cadence 通过神经活动与探索机制实现。'],
 ['Critic','价值评估部分','预测状态的回报，并提供奖励预测误差。不是另一个人工裁判。'],
 ['资格迹','Eligibility trace E','衰减保留近期动作的连接响应，供晚到奖励使用；不保存任意观察内容。'],
 ['迹衰减','Lambda λ','控制资格迹的保留；当前反馈步的旧资格乘 γλ，wait 不额外算一次反馈步。'],
 ['工作记忆','Working memory / Trace','近期活动留下的暂时状态，参与下次计算。它不等于长期学到的参数。'],
 ['联想记忆','Associative / SynapticMemory','用观察键读写结果联系。当前有快、慢矩阵，容量有限且可能干扰。'],
 ['神经活动','Activation s','一次内部计算中的响应值。活动变化不等于权重改变。'],
 ['权重与偏置','Weights W / bias b','网络参数：连接影响强弱与神经元的基准驱动。'],
 ['超参数','Hyperparameter','网络宽度、学习率、β、求解预算等配置，与训练改动的参数区分。'],
 ['Softmax','概率归一化','把一组动作分数变成总和为 1 的概率；概率不保证动作正确。'],
 ['温度','Temperature T','控制 softmax 的集中程度。较高通常更分散；还与活动范围有关。'],
 ['EP','Equilibrium Propagation / 平衡传播','用自由／受扰动状态对比形成局部学习方向；梯度解释有条件。'],
 ['扰动强度','Beta β','教学作用的强度。更小需要更精确求解，不能简单认为越小越好。'],
 ['自由与扰动态','Free / nudged phases','自由计算不给答案；教学扰动状态是训练中的私有计算，不能当作无答案预测。'],
 ['反向传播','Backpropagation','用链式法则沿计算图计算参数对损失的影响，获得梯度。'],
 ['梯度与优化器','Gradient / optimizer','梯度描述参数影响；梯度下降／Adam 等优化器据此执行更新。'],
 ['监督学习','Supervised learning','用输入与真实答案训练。本项目鱼的答案由旧轨迹自动构造，不需人工逐点标注。'],
 ['强化学习','Reinforcement learning','通过执行动作的实际后果学习策略；需要定义观察、动作、奖励与时间。'],
 ['在线与离线','Online / offline learning','在线随新数据更新；离线用已采集数据训练。当前鱼测试冻结参数。'],
 ['损失','Loss / MSE','训练目标的数值误差；平方误差强调大的偏差。训练损失下降不等于泛化。'],
 ['批次','Batch','一次更新处理的一组样本。重复抽样不增加独立轨迹数量。'],
 ['隐藏状态','Hidden state h','时序模型压缩近期输入形成的内部状态，不是环境的全部真实状态。'],
 ['预测编码','Predictive coding','用模型关系不一致的误差组织内部修正；Cadence 时序模块使用残差形式。'],
 ['Newton 求解','Damped Newton','借助局部曲率修正内部状态，并通过阻尼／回溯控制步长；与学习参数更新区分。'],
 ['残差与收敛','Residual / convergence','内部方程还有多少不一致、是否达到求解要求；不衡量真实预测准确度。'],
 ['数学能量','Energy','用来表达状态关系与求解目标的数学量，不等于物理耗电。'],
 ['训练回溯','Parameter backtracking','尝试参数步长，检查该训练目标是否下降；不保证未见数据效果。'],
 ['留出与泛化','Holdout / generalization','在未参与训练的轨迹上评估。开发中反复看过的留出不属于独立确认。'],
 ['平均轨迹误差','ADE','所有预测时点的位置欧氏距离平均。当前单位是场景 px。'],
 ['终点误差','FDE','最后一个预测时点的位置误差。当前鱼实验为 1.2 秒。'],
 ['命中率','Hit rate','实际碰撞成功数除以射击数；受半径、速度、炮台与时长影响。'],
 ['不确定性与多模态','Uncertainty / multimodal','多个合理未来或误差范围。单一平均轨迹会掩盖分支；概率需要校准。'],
 ['状态估计','State estimation / filtering','把测量和运动模型结合，估计当前状态；之后用模型推算未来。'],
 ['IMM','Interacting multiple model','同时运行多个运动模型，并根据新数据更新权重；不是训练一个深度网络。'],
 ['唤醒','Arousal','软件调节状态，影响 live 的探索与学习频率，不表示情绪或意识。'],
 ['规划与控制','Planning / control','规划给建议，控制执行动作。TemporalPatchNet.plan 不执行真实环境动作。'],
];
function showTerms() {
  const query = $('glossary-search').value.trim().toLowerCase();
  const filtered = terms.filter(t => t.join(' ').toLowerCase().includes(query));
  $('glossary-count').textContent = filtered.length + ' / ' + terms.length + ' 个术语';
  $('glossary-list').replaceChildren();
  for (const [title, english, meaning] of filtered) {
    const article = document.createElement('article'), h = document.createElement('h3'), small = document.createElement('small'), p = document.createElement('p');
    h.textContent = title; small.textContent = english; p.textContent = meaning; article.append(h, small, p); $('glossary-list').append(article);
  }
  if (!filtered.length) { const p = document.createElement('p'); p.textContent = '没有匹配术语，试试中文或英文关键词。'; $('glossary-list').append(p); }
}
$('glossary-search').addEventListener('input', showTerms); showTerms();
const links = [...document.querySelectorAll('.guide-toc a')];
const observer = new IntersectionObserver(entries => {
  const first = entries.filter(e => e.isIntersecting).sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
  if (first) for (const link of links) link.setAttribute('aria-current', String(link.hash === '#' + first.target.id));
}, {rootMargin: '-10% 0px -65% 0px'});
for (const section of document.querySelectorAll('.guide-section')) observer.observe(section);

