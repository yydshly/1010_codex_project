// Arithmetic from the same recorded endpoints, not a new solver/training run.
const f = (v, digits = 13) => Number(v).toFixed(digits);
const s = (v, digits = 6) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(digits);
const table = (headers, rows) => '<div class="ep-table-wrap"><table><thead><tr>' + headers.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map(v => '<td>' + v + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
export const betaBridgeLabels = ['1 损失斜率', '2 教学平衡', '3 算内部差', '4 代入导数', '5 提出 β', '6 哪里近似', '7 七刻相加'];

export function createBetaBridgeChapters(story) {
  const {free, plus, minus} = story.phases, {t, count: N, beta, z, focusSlope: Gt} = story;
  const e0 = free.rows[t].error, ep = plus.rows[t].error;
  const loss = e0 ** 2 / (2 * N), dw = .001;
  const changedLoss = (e0 + free.a * dw) ** 2 / (2 * N);
  return [
    {
      title: '⑤.1 先弄清 Gₜ：权重加一点，平方误差怎样变？',
      text: '先只看 0.40 s 这一刻、未来 +0.20 s 的 x。q 是归一化位移读出，z 是答案，e=q−z。自由态隐藏活动不依赖这条 C 权重，因此 w 加 dw，q 就加 a×dw。Gₜ 是这个输出对整体损失斜率的贡献；还不是七刻合计的 G。',
      math: () => 'N = 7×24 = 168；单项损失 ℓ = e²/(2N)\n自由误差 e⁰ = ' + f(e0) + '\n活动 a⁰ = ' + f(free.a) + '\n\nw 加 dw → e 变成 e+a×dw\n[ℓ(w+dw)−ℓ(w)]/dw\n= [(e+a×dw)²−e²]/(2N×dw)\n= e×a/N + a²×dw/(2N)\n\ndw→0，后面那项→0：\nGₜ = e⁰×a⁰/N\n= ' + f(free.rows[t].product) + ' / 168\n= ' + f(Gt,16),
      takeaway: '平方展开就给出了“误差 × 这条权重对输出的影响 ÷ 平均数”。负号说明增加 w 会降低这一项损失。',
      extra: () => '<details><summary>用 dw=+0.001 做一次单项算术验算</summary>' + table(['计算项','实际数字'],[
        ['读出增加 a×dw',f(free.a*dw,16)],['原单项损失',f(loss,16)],['新单项损失',f(changedLoss,16)],['有限步长损失差 ÷ dw',f((changedLoss-loss)/dw,16)],['dw→0 的斜率 Gₜ',f(Gt,16)]]) + '<p>这是用旧读出与活动作的单项平方运算；不是新一次网络调用，也不是七刻合计损失。</p></details>'
    },
    {
      title: '⑤.2 教学为什么让 y 与 q 分开？',
      text: '固定当前隐藏活动，q=C×a 也固定。内部代价希望 y=q；正教学希望 y=z。这两个作用按 F=½(y−q)²+b×½(y−z)² 相加，其中 b=β/168。平衡时对 y 的两股作用相抵，得到记录中使用的输出公式。',
      math: () => 'β = +0.003；b = β/N\n  = ' + f(beta/N,17) + '\n\n输出平衡：\n(y−q) + b×(y−z) = 0\ny×(1+b) = q+b×z\ny = (q+b×z)/(1+b)\n\n代入正教学的实际活动：\nq⁺ = ' + f(plus.q) + '\nz  = ' + f(z) + '\ny⁺ = ' + f(plus.y) + '\nr⁺ = y⁺−q⁺ = ' + s(plus.r,16),
      takeaway: '答案经由教学项产生了内部差 r。自由态 b=0 时 y=q、r=0，即使预测有误差也如此。下面还有一条不用通分的最短核对。',
      extra: () => '<details><summary>最短联系：把平衡式两边直接乘 −a</summary><pre class="ep-contrast-math">r+b×(y−z) = 0\nr = −b×(y−z)\ngₜβ = −r×a = β×[(yβ−z)×aβ/N]\n\n正侧输出误差 y⁺−z = ' + f(plus.rows[t].outputError) + '\n(y⁺−z)×a⁺/N = ' + f(plus.rows[t].outputError*plus.a/N,16) + '\n乘 β=0.003 = ' + f(plus.terms[t],16) + '</pre><p>这个关系也是等式：教学产生的内部差，恰好抵消按 β 缩放的输出误差作用。自由态 y⁰=q⁰；教学输出与活动接近自由态时，括号内就接近 Gₜ。后面用 q 的公式展开，具体检查接近到什么程度。</p></details>'
    },
    {
      title: '⑤.3 把 r 写成“教学强度 × 预测差”',
      text: '现在只做通分和相减。r=y−q，把刚才的 y 公式代入，q 抵消，剩下 b×(z−q)/(1+b)。这一刻答案比读出大，所以正侧的 r 为正。',
      math: () => 'r = (q+b×z)/(1+b) − q\n  = [q+b×z−q×(1+b)]/(1+b)\n  = b×(z−q)/(1+b)\n\n正侧：z−q⁺ = ' + f(-ep) + '\nb = ' + f(beta/N,17) + '\nr⁺ = b×' + f(-ep) + '/(1+b)\n   = ' + s(plus.r,16),
      takeaway: '到这里都是等式。小小的 r 不是另造的误差，它与原来的预测差有明确比例。'
    },
    {
      title: '⑤.4 代入 gₜ=−r×a，原预测误差出现了',
      text: '内部平方代价对这条权重的局部导数是 −r×a。把 r 换成上一小步的表达式，前面的负号把 z−q 翻成 q−z。结果也有“预测误差 × 活动”；这就是它能连接到损失斜率的原因。',
      math: () => 'gₜβ = −r×a\n    = −[b×(z−q)/(1+b)]×a\n    = [b/(1+b)]×(q−z)×a\n\n正侧预测差 e⁺ = ' + f(ep) + '\n正侧活动 a⁺ = ' + f(plus.a) + '\ne⁺×a⁺ = ' + f(plus.rows[t].product) + '\ngₜ⁺ = [b/(1+b)]×(e⁺×a⁺)\n    = ' + f(plus.terms[t],16),
      takeaway: 'Gₜ 用自由态的误差与活动；gₜβ 用教学态的误差与活动，再乘一个教学系数。现在还没有作近似。'
    },
    {
      title: '⑤.5 提出 β：两种斜率的结构完全对上',
      text: '将 b=β/N 代入，再乘除一个 N。gₜβ 精确等于 β × [N/(N+β)] × [教学态误差×活动/N]。方括号里的最后一项，与⑤.1的自由损失斜率只有活动状态不同。',
      math: () => 'b/(1+b) = (β/N)/(1+β/N)\n        = β/(N+β)\n\ngₜβ = β×[N/(N+β)]×[(qβ−z)×aβ/N]\n\n正侧三个因子：\nβ = 0.003\nN/(N+β) = ' + f(plus.factor) + '\n(q⁺−z)×a⁺/N = ' + f(plus.rows[t].errorActivityOverN,16) + '\n\n三者相乘 = ' + f(plus.terms[t],16) + '\n除回 β = ' + f(plus.terms[t]/beta,16),
      takeaway: '这里仍是等式。不是先猜 g≈βG；是从输出平衡推到了 β 乘以一个接近 Gₜ 的量。'
    },
    {
      title: '⑤.6 只有这里用“≈”：两个小差别被忽略',
      text: '第一，168/(168+0.003)=0.999982143176，几乎为 1。第二，正教学的误差和活动都只改变一点，误差×活动/N 从自由态的 −0.0000541342251 变为 −0.0000541230955。用 1 和自由态替换这两项，才得到 gₜβ≈βGₜ。',
      math: () => '精确：gₜβ = β×校正因子×教学态乘积/N\n近似：gₜβ ≈ β×1×自由态乘积/N\n              = β×Gₜ\n\nβ×Gₜ = 0.003×(' + f(Gt,16) + ')\n      = ' + f(beta*Gt,16) + '\n实际 gₜ⁺ = ' + f(plus.terms[t],16) + '\n绝对差 = ' + Math.abs(plus.terms[t]-beta*Gt).toExponential(10) + '\n相对差约 ' + f(Math.abs(plus.terms[t]/(beta*Gt)-1)*100,7) + '%\n\n负侧同理（β=−0.003）：\nβ×Gₜ = ' + f(-beta*Gt,16) + '\n实际 gₜ⁻ = ' + f(minus.terms[t],16),
      takeaway: '“近似”来自校正因子接近 1、教学状态接近自由状态。本样本满足；若教学改变很大或求解不准，就不能跳过这两个差别。',
      extra: () => table(['同一时刻','自由态','正教学','负教学'],[
        ['q−z',f(e0),f(ep),f(minus.rows[t].error)],['a',f(free.a),f(plus.a),f(minus.a)],
        ['(q−z)×a/N',f(Gt,16),f(plus.rows[t].errorActivityOverN,16),f(minus.rows[t].errorActivityOverN,16)],
        ['N/(N+β)','1',f(plus.factor),f(minus.factor)]])
    },
    {
      title: '⑤.7 七个时刻相加，才得到 gβ≈βG',
      text: '刚才只证明一刻的贡献 gₜβ≈βGₜ。同一条 C[2,0] 被七个历史时刻共用，整体导数必须加七次。每一行都用同样的方法；求和后便得到之前看到的 gβ≈βG。168 始终是七刻×24个输出的平均数，不能改成 7。',
      math: () => 'G = Σ₇ Gₜ = ' + f(story.exact,16) + '\n\n正侧：\n+β×G = ' + f(beta*story.exact,16) + '\n实际 g⁺ = Σ₇ gₜ⁺\n        = ' + f(plus.g,16) + '\n\n负侧：\n−β×G = ' + f(-beta*story.exact,16) + '\n实际 g⁻ = Σ₇ gₜ⁻\n        = ' + f(minus.g,16) + '\n\n分别除回自己的 β：\n正侧 = ' + f(story.positiveEstimate) + '\n负侧 = ' + f(story.negativeEstimate),
      takeaway: '两侧都在估计同一损失斜率 G；下一幕再将它们平均。负侧 g 为正，是因为 β 为负。',
      extra: () => '<details><summary>核对七刻：β×自由斜率与实际局部导数</summary>' + table(['截止 s','自由 Gₜ','+βGₜ','实际 gₜ⁺','实际 gₜ⁻'],free.rows.map((row,k)=>[f((k+2)*.05,2),f(row.errorActivityOverN,16),f(beta*row.errorActivityOverN,16),f(plus.terms[k],16),f(minus.terms[k],16)])) + '</details><p>本段是 C 读出权重的直接推导：自由隐藏活动不依赖 C。A/B 会影响隐藏活动，需使用下方“一般 EP”的平衡响应推导。</p>'
    }
  ];
}
