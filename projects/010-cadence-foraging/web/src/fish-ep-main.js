import './fishing-style.css';
import './fish-ep-style.css';
import { renderExplanation } from './fish-ep-explainer.js';
import { initContrastAnimation } from './fish-ep-contrast-animation.js';

const $ = id => document.getElementById(id);
const labels = ['① 输入', '② 自由态', '③ 算误差', '④ 正扰动', '⑤ 负扰动', '⑥ 学习方向', '⑦ 改参数', '⑧ 重算'];
const titles = ['把位置记录变成网络输入', '不给答案，让旧参数自己算', '拿旧记录的真实后续作比较', '轻轻往答案方向改变活动', '从同一起点，算反方向的活动变化', '比较两条教学路径，得到怎么改参数', '试一次参数更新，误差下降才提交', '拿掉答案，同样输入，用新参数再预测'];
let data, step = 0, timer, contrastPlayer;
const num = (value, digits = 10) => {
  if (!Number.isFinite(value)) return '—';
  return value !== 0 && Math.abs(value) < 1e-6 ? value.toExponential(8) : value.toFixed(digits);
};
const px = value => num(value, 6);
const pair = values => '(' + values.map(px).join(', ') + ')';
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const vector = values => '[' + values.map(v => num(v, 8)).join(', ') + ']';
const table = (heads, rows) => '<div class="ep-table-wrap"><table><thead><tr>' + heads.map(h=>'<th>'+h+'</th>').join('') + '</tr></thead><tbody>' + rows.map(r=>'<tr>'+r.map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('') + '</tbody></table></div>';
const equation = text => '<div class="ep-equation">' + text + '</div>';
const clarify = text => '<p class="ep-clarify">' + text + '</p>';
const cards = entries => '<div class="ep-number-grid">' + entries.map(([label,value])=>'<div class="ep-number-card"><small>'+label+'</small><strong>'+value+'</strong></div>').join('')+'</div>';
function selection() {
  const t = Number($('ep-time').value), horizon = Number($('ep-horizon').value);
  const axis = Number($('ep-axis').value), neuron = Number($('ep-neuron').value);
  const port = horizon * 2 + axis, cutoff = data.input.cutoff_steps[t];
  const origin = data.training_positions[cutoff];
  const truth = data.training_positions[cutoff + data.config.horizons[horizon]];
  return {t,horizon,axis,neuron,port,cutoff,origin,truth,seconds:cutoff*.05,future:data.config.horizons[horizon]*.05};
}
function point(phase, s) {
  const output = data.phases[phase].output[s.t];
  return s.origin.map((value,i)=>value+output[s.horizon*2+i]*data.config.displacement_scale);
}
function distance(a,b) {return Math.hypot(a[0]-b[0],a[1]-b[1]);}
function oldNew(s) {
  const p = data.parameters;
  return {before:p.before.C[s.port][s.neuron], after:p.after.C[s.port][s.neuron],
    delta:p.ep_delta.C[s.port][s.neuron], change:p.actual_change.C[s.port][s.neuron],
    gp:p.local_gradients.plus.C[s.port][s.neuron], gm:p.local_gradients.minus.C[s.port][s.neuron]};
}
function hiddenRows(s, phases) {
  return Array.from({length:8},(_,k)=>[k, ...phases.flatMap(name=>[num(data.phases[name].hidden[s.t][k]),num(data.phases[name].activity[s.t][k])])]);
}
function phaseContent(name,s) {
  const phase = data.phases[name], free = data.phases.free, sign = name==='plus'?1:-1;
  const beta = sign*data.update.beta, b = beta / (7*24);
  const natural = dot(data.parameters.before.C[s.port],phase.activity[s.t]);
  const probe = phase.first_newton_step;
  return clarify('本阶段执行：固定输入、零初始边界与旧 A/B/C，求 E + ('+num(beta,3)+')×L 的活动平衡。跟踪权重 C['+s.port+','+s.neuron+'] 仍为 '+num(data.parameters.before.C[s.port][s.neuron],13)+'。')+cards([
    ['教学输出换算成位置 · 不是无答案预测',pair(point(name,s))],
    ['相对自由输出的像素变化',pair(point(name,s).map((v,i)=>v-point('free',s)[i]))],
    ['隐藏预激活 h['+s.neuron+']',num(phase.hidden[s.t][s.neuron])],
    ['活动变化 a'+(sign>0?'⁺':'⁻')+' − a⁰',num(phase.activity[s.t][s.neuron]-free.activity[s.t][s.neuron])]
  ])+equation('β = '+num(beta)+'；b = β / (7 × 24) = '+num(b)+'\n' +
    'C['+s.port+',:] · a = '+num(natural)+'\n' +
    '目标位移 z = '+num(data.targets[s.t][s.port])+'\n'+
    '教学输出 y = (C·a + b×z) / (1+b)\n'+
    '           = '+num(phase.output[s.t][s.port])+'\n'+
    'r = y − C·a = '+num(phase.output_defect[s.t][s.port]))+
    '<div class="ep-inline-explain"><h3>这条输出公式是怎样来的？</h3><p>q=C·a 是八个当前活动的加权读出，z 是训练答案，y 是待求解输出。给定活动后，输出同时受内部一致性与教学作用约束。</p>'+
    equation('F(y)=½(y−q)² + b×½(y−z)²\n'+
      '对 y 求斜率为零：(y−q)+b(y−z)=0\n'+
      '解出 y=(q+bz)/(1+b)\n'+
      '代入：('+num(natural,13)+' + ('+num(b,16)+')×('+num(data.targets[s.t][s.port],13)+'))\n'+
      '      / (1+('+num(b,16)+')) = '+num(phase.output[s.t][s.port],13))+
    '<p>活动也会随全路径求解改变，所以这里的 q 使用当前教学活动，不是直接用自由态 q 替代。</p><a href="#ep-nudge">查看完整扰动推导 ↓</a></div>'+
    (probe ? equation('隐藏活动怎样变出来？第 1 步 Newton 方程的诊断复算：\n'+
      '自由起点的隐藏梯度 ∇hF['+s.neuron+'] = '+num(probe.gradient[s.t][s.neuron])+'\n'+
      '56 个隐藏坐标耦合求解 H·Δh = −∇hF\n'+
      '得到 Δh['+s.neuron+'] = '+num(probe.direction[s.t][s.neuron])+'\n'+
      '接受的状态步长 = '+num(probe.step_size)+'；阻尼 = '+num(probe.damping)+'\n'+
      'h新 = '+num(free.hidden[s.t][s.neuron])+' + '+num(probe.step_size)+' × ('+num(probe.direction[s.t][s.neuron])+')\n'+
      '     = '+num(phase.hidden[s.t][s.neuron])+'\n'+
      '复算完整路径与实际返回路径逐元素相同 = '+(probe.matches_actual_final_path?'是':'否')) : '')+
    table(['隐藏单元','h⁰','a⁰','h'+(sign>0?'⁺':'⁻'),'a'+(sign>0?'⁺':'⁻')],hiddenRows(s,['free',name]))+
    cards([['全路径教学损失 L',num(phase.loss)],['求解后的内部残差',num(phase.residual)]])+
    equation('求解目标 E + ('+num(beta)+') × L = '+num(phase.objective)+'\n' +
      '实际 Newton 步数 = '+phase.iterations+'；收敛 = '+(phase.converged?'是':'否')+'\n'+
      'A / B / C 此时仍全部使用旧参数。')+
    clarify('β 控制教学作用，b 是分摊到 7×24 个输出上的系数。两条路径均从同一旧参数自由路径开始，初始隐藏边界都是零。改变活动不是修改参数。');
}
function content(s) {
  const free = data.phases.free, after = data.phases.after, tracked = oldNew(s);
  const prediction = point('free',s), newPrediction = point('after',s);
  if (step===0) {
    const v = data.input.velocities[s.t+1], a = data.input.accelerations[s.t];
    const p=data.training_positions, last=s.cutoff;
    $('ep-step-meaning').textContent = '鱼的位置是外部记录；网络并不读取模拟器的真实速度。我们用相邻位置差计算速度和加速度，再缩放为输入。它要读完 7 个输入时刻，才能作 0.40 秒截止的预测。';
    return cards([['此刻的位置 p',pair(s.origin)],['这一时刻的 4 个输入 u',vector(data.input.features[s.t])]])+
      equation('vₓ = ('+px(p[last][0])+' − '+px(p[last-1][0])+') / 0.05 = '+px(v[0])+' px/s\n'+
      'vᵧ = ('+px(p[last][1])+' − '+px(p[last-1][1])+') / 0.05 = '+px(v[1])+' px/s\n'+
      'a = (本次速度 − 上次速度) / 0.05 = '+pair(a)+' px/s²\n'+
      'u = [vₓ/170, vᵧ/170, aₓ/400, aᵧ/400]\n'+
      '  = '+vector(data.input.features[s.t]))+
      table(['时间 s','x 位置 px','y 位置 px'],data.input.positions.map((p,i)=>[num(i*.05,2),px(p[0]),px(p[1])]))+
      table(['时间 s','vₓ/170','vᵧ/170','aₓ/400','aᵧ/400'],data.input.features.map((u,i)=>[num((i+2)*.05,2),...u.map(v=>num(v,8))]))+
      clarify('初始隐藏状态是 8 个零。以上是预测输入；旧轨迹的后续位置另作训练答案，不混进这些特征。');
  }
  if (step===1) {
    const activity = free.activity[s.t], previous = s.t ? free.activity[s.t-1] : data.input.boundary;
    const fromHistory=dot(data.parameters.before.A[s.neuron],previous), fromInput=dot(data.parameters.before.B[s.neuron],data.input.features[s.t]);
    $('ep-step-meaning').textContent = '同样的旧参数，按历史顺序计算隐藏状态，再读出未来位移。这里完全不给答案。隐藏单元 0 只是一个内部数值通道，没有人为指定成“转弯”或“速度”。';
    return cards([['自由预测的位置',pair(prediction)],['输出位移 · 归一化数值',vector(free.output[s.t].slice(s.horizon*2,s.horizon*2+2))]])+
      equation('h['+s.neuron+'] = A['+s.neuron+',:]·上次活动 + B['+s.neuron+',:]·本次输入\n'+
      '      = '+num(fromHistory)+' + '+num(fromInput)+' = '+num(free.hidden[s.t][s.neuron])+'\n'+
      'a['+s.neuron+'] = tanh(h['+s.neuron+']) = '+num(activity[s.neuron])+'\n'+
      'y['+s.port+'] = C['+s.port+',:]·a = '+num(free.output[s.t][s.port])+'\n'+
      '位置 = 此刻位置 + 位移 × 150')+
      table(['k','C['+s.port+',k]','活动 a[k]','该连接贡献 C×a'],activity.map((a,k)=>[k,num(data.parameters.before.C[s.port][k]),num(a),num(data.parameters.before.C[s.port][k]*a)]))+
      cards([['自由态内部残差',num(free.residual)],['自由求解步数',String(free.iterations)]])+
      clarify('该时序模型的自由态通过因果递推直接得到，所以 Newton 步数为 0。内部残差接近 0 只说明计算符合自己的参数，不能说明位置预测正确。参数仍未改变。');
  }
  if (step===2) {
    const target=data.targets[s.t], error=prediction.map((v,i)=>v-s.truth[i]), coordinate=free.output[s.t][s.port]-target[s.port];
    $('ep-step-meaning').textContent = '这是一条已经采集完的训练轨迹，所以教学程序知道后来真的发生了什么。先比较自由预测和真实后续，算出误差；算误差本身仍没有修改参数。';
    return cards([['真实位置 · 旧记录中的答案',pair(s.truth)],['自由预测 − 真实位置',pair(error)+' px'],['该点的位置误差',px(distance(prediction,s.truth))+' px'],['整条样本的训练损失',num(free.loss)]])+
      equation('真实归一化位移 z = (真实位置 − 此刻位置) / 150\n'+
      '                    = '+vector(target.slice(s.horizon*2,s.horizon*2+2))+'\n'+
      '跟踪输出的误差 y − z = '+num(coordinate)+'\n'+
      '这一个输出的 ½误差² = '+num(.5*coordinate*coordinate)+'\n'+
      '整体 L = ½ × 所有 7×24 个输出的平均平方误差\n'+
      '       = '+num(free.loss))+
      clarify('22 像素这类距离与整体训练损失不是同一个单位。此处用真实后续位置做监督，没有命中奖励、Q 表或资格迹。');
  }
  if (step===3 || step===4) {
    $('ep-step-meaning').textContent = step===3
      ? '保持输入和旧参数，给输出误差加一个很小的正教学作用。Newton 求解让整条隐藏路径重新自洽；因此隐藏活动和输出都略有变化。它是在试探参数应怎样学习。'
      : '再次使用相同输入、相同旧参数、相同自由起点，把教学作用符号反过来。它提供另一侧的变化，用于与正扰动作对比；不是先正扰动再把那条路径继续往回拉。';
    return phaseContent(step===3?'plus':'minus',s);
  }
  if (step===5) {
    const exact = data.phases.free.output.reduce((sum,row,t)=>
      sum+(row[s.port]-data.targets[t][s.port])*data.phases.free.activity[t][s.neuron],0)/(7*24);
    const rows = Array.from({length:7},(_,t)=>{
      const plus=data.phases.plus, minus=data.phases.minus;
      const rp=plus.output_defect[t][s.port], rm=minus.output_defect[t][s.port];
      const ap=plus.activity[t][s.neuron], am=minus.activity[t][s.neuron];
      return [num((t+2)*.05,2),num(rp),num(ap),num(-rp*ap),num(rm),num(am),num(-rm*am)];
    });
    $('ep-step-meaning').textContent = '我们只跟踪一个读出权重。每个时刻把“输出与模型读出的不一致 r”乘以隐藏活动，取负号；将 7 个时刻加起来，再比较正负两种响应。这样得到这个参数的调整方向。';
    return '<span class="ep-current-tag">跟踪 C['+s.port+','+s.neuron+'] · 隐藏单元 '+s.neuron+' → 未来位移输出 '+s.port+'</span>'+
      equation('每个时刻的局部量 = −r × a\n'+
      'r = 教学输出 y − C·a；它不同于位置预测误差 y − z。\n'+
      'g⁺ = 7 个时刻局部量之和 = '+num(tracked.gp,13)+'\n'+
      'g⁻ = 7 个时刻局部量之和 = '+num(tracked.gm,13)+'\n'+
      'δC = (g⁺ − g⁻) / (2β)\n'+
      '   = ('+num(tracked.gp,13)+' − '+num(tracked.gm,13)+') / '+num(2*data.update.beta)+'\n'+
      '   = '+num(tracked.delta,13))+
      table(['时间 s','r⁺','a⁺','−r⁺a⁺','r⁻','a⁻','−r⁻a⁻'],rows)+
      '<div class="ep-inline-explain"><h3>为什么相减能知道权重该怎么改？</h3><p>固定当前活动与输出时，权重增加 dw，q 增加 a×dw，r=y−q 减少 a×dw。因此内部平方代价 ½r² 的局部导数为 −r×a。教学作用让这条局部导数包含预测误差的信息。</p>'+
      equation('由 y=(q+bz)/(1+b)：r=b(z−q)/(1+b)\n'+
        '所以 gβ=Σ₇[−r×a]=β/(168+β)×Σ₇[(qβ−z)×aβ]\n'+
        '小扰动时，gβ≈β×损失斜率 G\n'+
        '正侧≈+βG；负侧≈−βG；差≈2βG\n'+
        '所以 G≈(g⁺−g⁻)/(2β)\n\n'+
        '本连接从自由态公式直接求的 G = '+num(exact,13)+'\n'+
        'EP 实际估计 = '+num(tracked.delta,13))+
      '<p>这里相减的是局部导数，除以 2β 去掉教学作用的尺度。小 β、同一平滑稳定分支与足够精确的求解是成立条件。</p><a href="#ep-gradient">完整推导 ↓</a> · <a href="#ep-check">用直接改权重的独立复算核对 ↓</a></div>'+
      clarify('C 在 7 个时刻共用同一个参数，更新方向会综合这 7 处响应。所选时刻帮助看预测，不会让更新只看该时刻。A、B 也各自用残差与前一活动／输入形成类似局部量。此阶段参数还没改。');
  }
  if (step===6) {
    $('ep-step-meaning').textContent = '学习率决定沿这个方向走多远。库先用候选新参数作一次无答案重算，确认这条训练样本的整体损失下降，才提交更新。改变并保留的是 A、B、C 参数。';
    return cards([['C['+s.port+','+s.neuron+'] 原值',num(tracked.before,13)],['实际改变量 ΔC',num(tracked.change,13)],['提交后的新值',num(tracked.after,13)],['实际接受的学习率',num(data.update.accepted_rate)]])+
      equation('新参数 = 旧参数 − 学习率 × EP 方向\n'+
      'C新 = '+num(tracked.before,13)+' − '+num(data.update.accepted_rate)+' × ('+num(tracked.delta,13)+')\n'+
      '    = '+num(tracked.after,13)+'\n'+
      '实际改变量 = C新 − C旧 = '+num(tracked.change,13)+'\n'+
      '更新前整体损失 = '+num(data.update.initial_loss)+'\n'+
      '候选新参数损失 = '+num(data.update.final_loss)+'\n'+
      '候选参数重算次数 = '+data.update.replay_calls+'；更新已接受 = '+(data.update.updated?'是':'否'))+
      table(['矩阵','实际变化的参数个数','变化的整体大小 ‖Δ‖'],['A','B','C'].map(k=>[k,data.parameters.actual_change[k].flat().filter(v=>v!==0).length,num(data.update.change_norms[k])]))+
      clarify('这次共有 '+data.update.changed_count+' 个参数同时改变，不能把最后的预测改善全归因于这一项 C。损失回溯只检查当前训练样本，不保证新鱼表现。');
  }
  $('ep-step-meaning').textContent = '再次只给同一段历史输入，从相同零隐藏边界开始。不给真实未来、不加正负扰动，用刚刚保留的新参数作自由预测。能留下来影响下一次回答的，是参数变化。';
  return cards([['旧参数自由预测',pair(prediction)],['新参数无答案预测',pair(newPrediction)],['旧位置误差',px(distance(prediction,s.truth))+' px'],['新位置误差',px(distance(newPrediction,s.truth))+' px']])+
    equation('调用 imagine(同一输入, state=零边界)，没有 target。\n'+
      '新隐藏活动 a['+s.neuron+'] = '+num(after.activity[s.t][s.neuron])+'\n'+
      '新位移输出 y['+s.port+'] = '+num(after.output[s.t][s.port])+'\n'+
      '新位置 = '+pair(s.origin)+' + '+vector(after.output[s.t].slice(s.horizon*2,s.horizon*2+2))+' × 150\n'+
      '       = '+pair(newPrediction)+'\n'+
      '整体损失 '+num(free.loss)+' → '+num(after.loss))+
    clarify('这是重新检查同一条训练鱼，模型确实没有再读取答案；评分层仍用旧记录来算误差。它没有证明未见鱼更准，且选择其他时刻可能看到某个点没有改善。主捕鱼页才提供不同鱼的留出对照。');
}
function draw(s) {
  const svg=$('ep-track'), free=data.phases.free.output[s.t];
  const history=data.training_positions.slice(0,s.cutoff+1);
  const actual=data.training_positions.slice(s.cutoff,s.cutoff+25);
  const oldPath=[s.origin,...Array.from({length:12},(_,i)=>s.origin.map((p,k)=>p+free[i*2+k]*150))];
  const phase=step===3?'plus':step===4?'minus':step===7?'after':'free';
  const output=data.phases[phase].output[s.t];
  const current=[s.origin,...Array.from({length:12},(_,i)=>s.origin.map((p,k)=>p+output[i*2+k]*150))];
  const points=[...history,...(step>=1?oldPath:[]),...(step>=2?actual:[]),...(step>=3?current:[])];
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const minX=Math.min(...xs)-10,maxX=Math.max(...xs)+10,minY=Math.min(...ys)-10,maxY=Math.max(...ys)+10;
  const scale=Math.min(394/(maxX-minX),235/(maxY-minY));
  const transform=p=>[230+(p[0]-(minX+maxX)/2)*scale,145+(p[1]-(minY+maxY)/2)*scale];
  const path=(ps,color,dash='')=>'<polyline points="'+ps.map(p=>transform(p).join(',')).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2.4" '+(dash?'stroke-dasharray="'+dash+'"':'')+'/>';
  const marker=(p,color,r=5)=>{const q=transform(p);return '<circle cx="'+q[0]+'" cy="'+q[1]+'" r="'+r+'" fill="'+color+'" stroke="#173845" stroke-width="2"/>';};
  svg.innerHTML='<rect width="460" height="315" fill="#173845"/>'+path(history,'#9cb4bf')+
    (step>=2?path(actual,'#fff'):'')+(step>=1?path(oldPath,'#b898ff','6 6'):'')+
    (step>=3?path(current,'#73dce3','3 4'):'')+
    marker(s.origin,'#a7cead',6)+(step>=2?marker(s.truth,'#fff',6):'')+
    (step>=1?marker(point('free',s),'#b898ff',5):'')+
    (step>=3?marker(point(phase,s),'#73dce3',4):'')+
    '<g fill="#acc8cc" font-family="system-ui" font-size="11"><text x="14" y="19">查看时刻 '+num(s.seconds,2)+' s · 未来 +'+num(s.future,2)+' s</text><text x="14" y="296">训练旧记录 · 位置 px · 比例随视野适配</text></g>';
}
function comparison(s) {
  const phases=[];
  if(step>=1)phases.push(['free','旧自由态']);
  if(step>=3)phases.push(['plus','正扰动']);
  if(step>=4)phases.push(['minus','负扰动']);
  if(step>=7)phases.push(['after','新自由态']);
  $('ep-phase-comparison').innerHTML=phases.length?table(['阶段','x px','y px','位置误差 px'],phases.map(([name,title])=>{
    const p=point(name,s);return [title,px(p[0]),px(p[1]),step>=2?px(distance(p,s.truth)):'等到第③步比较'];
  })):'<p>第①步只检查输入，模型还未在播放器中展开输出。</p>';
}
function renderAudit(s) {
  $('ep-input-audit').innerHTML='<h3>输入 7×4，目标 7×24 · 初始隐藏边界全零</h3>'+table(['时刻 s','u₀','u₁','u₂','u₃'],data.input.features.map((u,i)=>[num((i+2)*.05,2),...u.map(v=>num(v))]));
  $('ep-hidden-audit').innerHTML='<h3>当前查看时刻的全部隐藏预激活与活动</h3>'+table(['单元','h⁰','a⁰','h⁺','a⁺','h⁻','a⁻','h新','a新'],hiddenRows(s,['free','plus','minus','after']));
  $('ep-output-audit').innerHTML='<h3>该时刻全部 24 个输出 · 位移除以 150</h3>'+table(['输出','目标','自由态','正扰动','负扰动','新自由态'],Array.from({length:24},(_,j)=>[j+' · +'+num((Math.floor(j/2)+1)*.1,1)+'s '+(j%2?'y':'x'),num(data.targets[s.t][j]),...['free','plus','minus','after'].map(k=>num(data.phases[k].output[s.t][j]))]));
  const rows=[];
  for(const key of ['A','B','C']) data.parameters.before[key].forEach((row,i)=>row.forEach((old,j)=>{
    rows.push([key+'['+i+','+j+']',num(old),num(data.parameters.ep_delta[key][i][j]),num(data.parameters.actual_change[key][i][j]),num(data.parameters.after[key][i][j])]);
  }));
  $('ep-parameter-audit').innerHTML='<h3>全部 288 个参数的实际更新</h3>'+table(['参数','旧值','EP 方向 δ','实际变化 Δ','新值'],rows);
}
function render() {
  const s=selection();
  $('ep-step-tag').textContent='步骤 '+(step+1)+' / 8 · '+(step<6?'参数尚未提交更新':step===6?'提交一次真实更新':'新参数自由预测');
  $('ep-step-title').textContent=titles[step];
  $('ep-step-count').textContent=(step+1)+' / 8';
  $('ep-back').disabled=step===0;
  $('ep-forward').disabled=step===7;
  for(const button of document.querySelectorAll('[data-ep-stage]'))button.setAttribute('aria-pressed',String(Number(button.dataset.epStage)===step));
  document.querySelector('.ep-view-note').textContent='当前看 '+num(s.seconds,2)+' 秒截止、未来 +'+num(s.future,2)+' 秒；跟踪 C['+s.port+','+s.neuron+']（隐藏单元 '+s.neuron+' → '+(s.axis?'y':'x')+' 位移输出）。选择器只改变查看位置，训练仍综合 7 个时刻、24 个输出；编号从 0 开始。';
  $('ep-current-numbers').innerHTML=content(s);
  draw(s); comparison(s); renderAudit(s);
}
function stop() {clearInterval(timer);timer=undefined;$('ep-autoplay').textContent='自动讲解';}
function move(value) {stop();step=Math.max(0,Math.min(7,value));render();}
function validate(value) {
  if(value.schema!=='cadence-fish-ep-sample/1'||!value.update.updated||value.config.batch!==1)throw new Error('记录类型或更新结果不匹配');
  for(const name of ['free','plus','minus','after']) {
    const p=value.phases[name];
    if(!p.converged||p.hidden.length!==7||p.output.length!==7||p.output.some(r=>r.length!==24||r.some(x=>!Number.isFinite(x))))throw new Error('真实阶段数据不完整');
  }
  if(value.parameter_probe?.parameter!=='C[2,0]'||value.parameter_probe.trials.length!==4)throw new Error('独立权重核验记录缺失');
}
try {
  const response=await fetch('./research/notes/fish-ep-sample.json');
  if(!response.ok)throw new Error('HTTP '+response.status);
  data=await response.json();validate(data);
  $('ep-provenance').textContent='固定样本：模型种子 '+data.model_seed+' · 有惯性训练鱼 #'+(data.sample_index+1)+' · 轨迹种子 '+data.trajectory_seed+' · Cadence '+data.provenance.package_version;
  $('ep-stage-buttons').innerHTML=labels.map((title,i)=>'<button data-ep-stage="'+i+'" aria-pressed="'+(i===0)+'">'+title+'</button>').join('');
  $('ep-time').innerHTML=Array.from({length:7},(_,i)=>'<option value="'+i+'" '+(i===6?'selected':'')+'>'+num((i+2)*.05,2)+' 秒</option>').join('');
  $('ep-horizon').innerHTML=Array.from({length:12},(_,i)=>'<option value="'+i+'" '+(i===1?'selected':'')+'>未来 +'+num((i+1)*.1,1)+' 秒</option>').join('');
  $('ep-neuron').innerHTML=Array.from({length:8},(_,i)=>'<option value="'+i+'">隐藏单元 '+i+'</option>').join('');
  for(const button of document.querySelectorAll('[data-ep-stage]'))button.onclick=()=>move(Number(button.dataset.epStage));
  $('ep-back').onclick=()=>move(step-1);$('ep-forward').onclick=()=>move(step+1);
  for(const id of ['ep-time','ep-horizon','ep-axis','ep-neuron'])$(id).onchange=()=>{stop();render();};
  $('ep-autoplay').onclick=()=>{
    contrastPlayer?.stop();
    if(timer){stop();return;}
    if(step===7)step=0;
    $('ep-autoplay').textContent='暂停讲解';render();
    timer=setInterval(()=>{step++;render();if(step===7)stop();},6000);
  };
  window.addEventListener('pagehide',stop);
  $('ep-player').hidden=false;render();renderExplanation(data);
  contrastPlayer=initContrastAnimation(data,{onPlay:stop});
  for(const button of document.querySelectorAll('[data-ep-example-stage]'))button.onclick=()=>{
    $('ep-time').value='6';$('ep-horizon').value='1';$('ep-axis').value='0';$('ep-neuron').value='0';
    move(Number(button.dataset.epExampleStage));location.hash='ep-player';$('ep-player').scrollIntoView({block:'start'});
  };
  const anchor=document.getElementById(location.hash.slice(1));
  if(anchor)anchor.scrollIntoView({block:'start'});
} catch(error) {
  $('ep-error').hidden=false;$('ep-error').textContent='无法展开实际数字：'+error.message+'。请生成 record_fish_ep.py 的记录后重新构建。';
}

