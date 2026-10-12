// Teaching readback of the fixed real record. No browser-side training.
const $ = id => document.getElementById(id);
const n = (x, digits = 13) => Number(x).toFixed(digits);
const table = (headers, rows) => '<div class="ep-table-wrap"><table><thead><tr>' + headers.map(x=>'<th>'+x+'</th>').join('') + '</tr></thead><tbody>' + rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('') + '</tbody></table></div>';
const formula = text => '<div class="ep-equation">' + text + '</div>';
export function renderExplanation(data) {
  const t=6, j=2, i=0, beta=data.update.beta, count=7*24;
  const free=data.phases.free, plus=data.phases.plus, minus=data.phases.minus;
  const origin=data.training_positions[8], truth=data.training_positions[12], z=data.targets[t][j];
  const q = phase => data.parameters.before.C[j].reduce((sum,w,k)=>sum+w*phase.activity[t][k],0);
  const weight=data.parameters.before.C[j][i], delta=data.parameters.ep_delta.C[j][i];
  const gp=data.parameters.local_gradients.plus.C[j][i], gm=data.parameters.local_gradients.minus.C[j][i];
  const probe=data.parameter_probe;
  $('ep-fixed-context').textContent='以下固定看：0.40 秒截止 → 未来 +0.20 秒的 x 位移 → 隐藏单元 0 → C[2,0]。上方选择器只改变播放器；这里始终保持同一个例子。';
  $('ep-term-numbers').innerHTML=table(['符号','这里的意思','本样本的实际数'],[
    ['w','隐藏单元 0 到这个输出的权重',n(weight)],
    ['h / a','隐藏预激活；活动 a=tanh(h)','自由态 h='+n(free.hidden[t][i],10)+'；a='+n(free.activity[t][i],10)],
    ['q','8 个活动用旧 C 加权相加的读出','自由态 '+n(q(free))],
    ['z','训练记录给出的真实位移 / 150',n(z)],
    ['y','求解后的输出；自由态 y=q','正扰动 '+n(plus.output[t][j])],
    ['r=y−q','输出与模型读出的内部差','正扰动 '+n(plus.output_defect[t][j],16)],
    ['y−z','输出与真实训练答案的预测差','自由态 '+n(free.output[t][j]-z)],
    ['β / rate','教学作用强度 / 权重更新步长',n(beta,3)+' / '+n(data.update.accepted_rate,1)]
  ])+formula('真实 x 位移 z = ('+n(truth[0],6)+' − '+n(origin[0],6)+') / 150\n'+
    '             = '+n(z)+'\nq 是 8 项 C×a 的和，不只是 w×a₀。');
  $('ep-nudge-numbers').innerHTML=formula('自由态：求 E 最小\n正扰动：求 E + '+n(beta,3)+' × L 最小\n负扰动：求 E − '+n(beta,3)+' × L 最小\n'+
    '168 = 7 个历史时刻 × 24 个输出；b = β / 168\n'+
    '正侧 b = '+n(beta/count,16)+'；负侧 b = '+n(-beta/count,16))+
    table(['阶段','活动 a₀','旧权重读出 q','求解输出 y','r=y−q'],[
      ['自由态',n(free.activity[t][i]),n(q(free)),n(free.output[t][j]),n(free.output_defect[t][j],16)],
      ['正扰动',n(plus.activity[t][i]),n(q(plus)),n(plus.output[t][j]),n(plus.output_defect[t][j],16)],
      ['负扰动',n(minus.activity[t][i]),n(q(minus)),n(minus.output[t][j]),n(minus.output_defect[t][j],16)]
    ])+formula('给定当前活动，单个输出的目标：\nF(y)=½(y−q)² + b×½(y−z)²\n'+
      '让它对 y 的斜率为 0：(y−q)+b(y−z)=0\n所以 y=(q+bz)/(1+b)\n\n'+
      '正侧实际代入：\ny=('+n(q(plus))+' + '+n(beta/count,16)+'×('+n(z)+'))\n'+
      '  / (1+'+n(beta/count,16)+')\n = '+n(plus.output[t][j]));
  $('ep-state-numbers').innerHTML=table(['Newton 活动步','正侧','负侧'],[
    ['自由起点的隐藏梯度（不是权重梯度）',n(plus.first_newton_step.gradient[t][i],16),n(minus.first_newton_step.gradient[t][i],16)],
    ['联立求解得到的 Δh₀',n(plus.first_newton_step.direction[t][i],16),n(minus.first_newton_step.direction[t][i],16)],
    ['接受的活动步长',n(plus.first_newton_step.step_size,1),n(minus.first_newton_step.step_size,1)],
    ['最终 h₀',n(plus.hidden[t][i]),n(minus.hidden[t][i])],
    ['a₀=tanh(h₀)',n(plus.activity[t][i]),n(minus.activity[t][i])],
    ['完整路径复算与真实返回相同',plus.first_newton_step.matches_actual_final_path?'是':'否',minus.first_newton_step.matches_actual_final_path?'是':'否']
  ])+formula('正侧 h₀ = '+n(free.hidden[t][i])+' + '+n(plus.first_newton_step.direction[t][i])+'\n'+
    '        = '+n(plus.hidden[t][i])+'\n活动 a₀ = tanh(h₀) = '+n(plus.activity[t][i])+'\n'+
    '该样本正负各接受 1 步；56 个隐藏坐标共同求解 HΔh=−∇hF。');
  $('ep-local-numbers').innerHTML=formula('正侧本时刻 g = −r×a\n = −('+n(plus.output_defect[t][j],16)+')×'+n(plus.activity[t][i])+'\n = '+n(-plus.output_defect[t][j]*plus.activity[t][i],16)+'\n\n'+
    '负侧本时刻 g = −('+n(minus.output_defect[t][j],16)+')×'+n(minus.activity[t][i])+'\n = '+n(-minus.output_defect[t][j]*minus.activity[t][i],16))+
    table(['历史时刻 s','正侧 −r×a','负侧 −r×a'],Array.from({length:7},(_,k)=>[
      n((k+2)*.05,2),n(-plus.output_defect[k][j]*plus.activity[k][i],16),n(-minus.output_defect[k][j]*minus.activity[k][i],16)
    ]).concat([['七次相加',n(gp,16),n(gm,16)]]));
  $('ep-gradient-numbers').innerHTML=formula('g⁺ = '+n(gp,16)+'\ng⁻ = '+n(gm,16)+'\n'+
    'G_EP = (g⁺−g⁻)/(2β)\n = ('+n(gp,16)+' − '+n(gm,16)+') / '+n(2*beta,3)+'\n = '+n(delta,13)+'\n\n'+
    '用自由态的损失公式直接求这条 C 权重的斜率：\n'+
    'G_exact = Σ₇[(q⁰−z)×a⁰] / 168 = '+n(probe.exact_free_loss_gradient,13)+'\n'+
    '两者绝对差 = '+Math.abs(delta-probe.exact_free_loss_gradient).toExponential(8));
  const names={minus_weight:'只把 w 减 0.001',old_weight:'旧参数基准',plus_weight:'只把 w 加 0.001',only_ep_weight:'只改这一项到 EP 新值'};
  const rows=probe.trials.map(trial=>[
    names[trial.label],n(trial.weight),n(trial.loss,16),
    n(origin[0]+trial.output[t][j]*150,6),
    n(Math.hypot(...origin.map((v,k)=>v+trial.output[t][j+k]*150-truth[k])),6)
  ]);
  rows.push(['真实 EP：288 项一起更新',n(data.parameters.after.C[j][i]),n(data.update.final_loss,16),
    n(origin[0]+data.phases.after.output[t][j]*150,6),
    n(Math.hypot(...origin.map((v,k)=>v+data.phases.after.output[t][j+k]*150-truth[k])),6)]);
  $('ep-probe-numbers').innerHTML=table(['独立复算条件','w','整体损失 L','预测 x px','该点距离 px'],rows)+
    formula('直接改变权重的数值斜率：\n'+
      '[L(w+0.001)−L(w−0.001)] / 0.002\n'+
      '= ('+n(probe.trials[2].loss,16)+' − '+n(probe.trials[0].loss,16)+') / 0.002\n'+
      '= '+n(probe.finite_difference,13)+'\n'+
      'EP 活动对比估计 = '+n(delta,13));
  $('ep-update-numbers').innerHTML=formula('w新 = w旧 − rate×G_EP\n'+
    '    = '+n(weight)+' − '+n(data.update.accepted_rate,1)+'×('+n(delta,13)+')\n'+
    '    = '+n(data.parameters.after.C[j][i])+'\n'+
    '实际增量 = '+n(data.parameters.actual_change.C[j][i])+'\n\n'+
    '整体损失：'+n(data.update.initial_loss,13)+' → '+n(data.update.final_loss,13)+'\n'+
    '实际回溯尝试 '+data.update.replay_calls+' 次；β 减半 '+data.update.contrast_halvings+' 次；更新接受 = 是\n'+
    '正负活动的非对称比值 = '+n(data.update.contrast_asymmetry,13));
}
