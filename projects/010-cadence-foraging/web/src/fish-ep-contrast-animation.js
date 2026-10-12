import { buildContrastStory } from './fish-ep-contrast-model.js';
import { betaBridgeLabels, createBetaBridgeChapters } from './fish-ep-beta-bridge.js';
import './fish-ep-contrast-animation.css';

const labels = ['① 看错误', '② +β 教学', '③ −β 教学', '④ 局部导数', '⑤ 还原尺度', '⑥ 两侧平均', '⑦ 改权重', '⑧ 独立核验'];
const fixed = (v, digits = 13) => Number(v).toFixed(digits);
const signed = (v, digits = 6) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(digits);
const equation = value => '<pre class="ep-contrast-math">' + value + '</pre>';
const table = (headers, rows) => '<div class="ep-table-wrap"><table><thead><tr>' + headers.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map(row => '<tr>' + row.map(v => '<td>' + v + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';

export function initContrastAnimation(record, {onPlay = () => {}} = {}) {
  const root = document.getElementById('ep-contrast-animation');
  const story = buildContrastStory(record), {free, plus, minus} = story.phases;
  const $ = suffix => root.querySelector('[data-contrast="' + suffix + '"]');
  let step = location.hash === '#ep-beta-bridge' ? 4 : 0, bridgeStep = 0, timer, playing = false, lastWidth = 0;
  const bridgeChapters = createBetaBridgeChapters(story);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const chapters = [
    {
      title: '先知道：增加这条权重，会把 x 往哪推？',
      text: '旧预测偏左。当前活动 a₀ 是正数，读出中这一项是 w×a₀。因此只增加这条 C 权重，读出 q 会增加，预测 x 就向右。这条连接的正确方向应当是“增加”。下面检查 EP 能否得到同样的方向。',
      math: () => '自由读出 q⁰ = ' + fixed(free.q) + '\n真实位移 z = ' + fixed(story.z) + '\n预测差 q⁰−z = ' + fixed(free.q-story.z) + '\na₀⁰ = ' + fixed(free.a) + ' > 0\n\n局部增加 w → q 增加 a₀×dw → x 向右',
      takeaway: '答案尚未进入自由预测。这里先用已知旧轨迹，判断这条读出连接的合理方向。'
    },
    {
      title: '正教学让输出稍微靠近答案，产生一个小内部差',
      text: '保持旧权重和输入，用 E+0.003L 重新求活动。教学输出 y 与旧 C 读出 q 不再完全相同。这个差 r 由训练答案带来，不是随机噪声。',
      math: () => 'β = +0.003；b = β/' + story.count + '\na₀⁺ = ' + fixed(plus.a) + '\nq⁺ = ' + fixed(plus.q) + '\ny⁺ = (q⁺+b×z)/(1+b) = ' + fixed(plus.y) + '\nr⁺ = y⁺−q⁺ = ' + signed(plus.r,16) + '\n\n教学 x = ' + fixed(plus.x,6) + ' px\n相对自由态 ' + signed(plus.x-free.x,6) + ' px',
      takeaway: '此时只改本次活动，w 仍为 ' + fixed(story.weight) + '。图中把千分之几像素的响应放大。'
    },
    {
      title: '负教学从同一自由起点，给出另一侧的小响应',
      text: '另取同样的旧参数、相同输入与自由起点，用 E−0.003L 求活动。教学符号反过来，内部差 r 也反向。这不是把正教学接着倒放。',
      math: () => 'β = −0.003；b = β/' + story.count + '\na₀⁻ = ' + fixed(minus.a) + '\nq⁻ = ' + fixed(minus.q) + '\ny⁻ = (q⁻+b×z)/(1+b) = ' + fixed(minus.y) + '\nr⁻ = y⁻−q⁻ = ' + signed(minus.r,16) + '\n\n教学 x = ' + fixed(minus.x,6) + ' px\n相对自由态 ' + signed(minus.x-free.x,6) + ' px',
      takeaway: '两边都是旧权重。现在有两份带着相反教学符号的活动记录。'
    },
    {
      title: '把内部差变成“这条权重受到多大作用”',
      text: '固定当前 y、a，w 增加一点，q 增加 a×dw，r=y−q 就减少 a×dw。因此内部代价 ½r² 对 w 的局部导数是 −r×a。七个时刻共用这一权重，要把七次贡献相加。',
      math: () => '0.40 s 的正侧贡献：\n−r⁺×a⁺ = ' + fixed(plus.terms[6],16) + '\n0.40 s 的负侧贡献：\n−r⁻×a⁻ = ' + fixed(minus.terms[6],16) + '\n\n七次相加：\ng⁺ = ' + fixed(plus.g,16) + '\ng⁻ = ' + fixed(minus.g,16),
      takeaway: '这两个 g 是内部代价 E 的局部导数。还需要下一步，才能解释它们与预测损失 L 的关系。',
      extra: () => '<details><summary>展开七个时刻的贡献</summary>' + table(['时刻 s','正侧 −r×a','负侧 −r×a'],plus.terms.map((v,k)=>[fixed((k+2)*.05,2),fixed(v,16),fixed(minus.terms[k],16)])) + '</details>'
    },
    bridgeChapters[0],
    {
      title: '两边相减，其实是把两个斜率估计取平均',
      text: '正侧除以 +β，负侧除以 −β，再平均。负分母带出的负号，恰好让式子变成 (g⁺−g⁻)/(2β)。相减不会凭空知道答案；答案先进入活动和 r，局部导数才带上误差信息。',
      math: () => 'G_EP = ½×[g⁺/(+β) + g⁻/(−β)]\n     = (g⁺−g⁻)/(2β)\n\n= ½×[' + fixed(story.positiveEstimate) + '\n      + (' + fixed(story.negativeEstimate) + ')]\n= ' + fixed(story.slope) + '\n\n等价地：\n(' + fixed(plus.g,16) + '\n − ' + fixed(minus.g,16) + ') / 0.006\n= ' + fixed(story.slope),
      takeaway: '图的横轴是教学系数 β，纵轴是局部导数 g。这里的响应斜率近似等于预测损失对权重的斜率；这个联系来自⑤的推导，不能对任意两个数随便相减。'
    },
    {
      title: '负斜率表示：增加 w，附近的预测损失会降低',
      text: '梯度下降沿斜率反方向走。这里 G 为负，减去 rate×G 就让 w 增加，符合①的直观方向。β 控制教学响应的大小；rate 控制真正改权重的距离。',
      math: () => 'w新 = w旧 − rate×G_EP\n= ' + fixed(story.weight) + '\n − 5×(' + fixed(story.slope) + ')\n= ' + fixed(story.newWeight) + '\n\n实际增加 ' + fixed(story.change) + '\n旧 w、新 w 都仍为负；\n“增加”是变得没那么负。',
      takeaway: '方向正确也可能走过头。本例用候选参数重新预测，训练损失通过回溯检查后才提交。'
    },
    {
      title: '换一种方法验证：真的只改 w，损失往哪走？',
      text: '取旧参数副本，只把这条 w 减 0.001、保持原值、加 0.001，分别不给答案作预测，再由外部评分。w 增加时，真实复算的损失降低。这是独立验证；它与②③只改变活动的教学计算不同。',
      math: () => 'L(w−0.001) = ' + fixed(story.probes[0].loss,16) + '\nL(w)        = ' + fixed(story.probes[1].loss,16) + '\nL(w+0.001) = ' + fixed(story.probes[2].loss,16) + '\n\n直接权重中心差 = ' + fixed(record.parameter_probe.finite_difference) + '\nEP 活动对比估计 = ' + fixed(story.slope),
      takeaway: '只更新这一个 w：本点 x=' + fixed(story.probes[3].x,6) + '，误差 ' + fixed(story.probes[3].error,6) + ' px。实际同时更新 288 项：x=' + fixed(story.allX,6) + '，误差 ' + fixed(story.allError,6) + ' px。两种效果必须分开。',
      extra: () => '<p>这里验证的是同一训练鱼的局部方向。这个 C 的自由输出对 w 为线性，平方损失为二次式；任意网络不一定有同样精度。一般 EP 还需要平滑稳定分支、小 β 与足够精确的活动求解。</p><a href="#ep-gradient">一般 EP 的理由与条件 ↓</a> · <a href="#ep-check">四次独立复算的完整表 ↓</a>'
    }
  ];
  const activeChapter = () => step === 4 ? bridgeChapters[bridgeStep] : chapters[step];

  // All labels retain endpoint values. Motion connects or magnifies recorded
  // endpoints; its interpolated screen coordinates are not solver iterations.
  const colors = {free:'#607b83',plus:'#216f9d',minus:'#a74872',ink:'#173b45',line:'#b9cec7'};
  function text(x,y,value,anchor='start',color=colors.ink,size=12) {
    return '<text x="'+x+'" y="'+y+'" text-anchor="'+anchor+'" fill="'+color+'" font-size="'+size+'">'+value+'</text>';
  }
  function line(x1,y1,x2,y2,color=colors.line,animated=false) {
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="2" '+(animated?'class="ep-contrast-draw" pathLength="1"':'')+'/>';
  }
  function dot(x,y,color,from) {
    return '<circle cx="'+x+'" cy="'+y+'" r="6" fill="'+color+'">'+
      (from!==undefined&&!motion.matches?'<animate attributeName="cx" from="'+from+'" to="'+x+'" dur="1.5s" fill="freeze"/>':'')+'</circle>';
  }
  function draw() {
    const width=Math.max(260,Math.round($('figure').getBoundingClientRect().width));
    lastWidth=width;
    const height=340, left=52, right=width-28;
    let marks='', caption='';
    if(step===0) {
      const x=v=>left+(v-(free.x-1))/(story.truth[0]-free.x+2)*(right-left);
      marks=text(20,30,'自由预测与训练旧记录的真实 x（px）')+line(left,155,right,155)+
        dot(x(free.x),155,colors.free)+dot(x(story.truth[0]),155,colors.ink)+
        text(left,88,'自由预测', 'start',colors.free)+text(left,111,fixed(free.x,6),'start',colors.free)+
        text(right,215,'真实旧记录','end')+text(right,236,fixed(story.truth[0],6),'end')+
        line(x(free.x),176,x(story.truth[0]),176,colors.ink,true)+
        text(width/2,286,'预测偏左 '+fixed(story.truth[0]-free.x,6)+' px','middle');
      caption='先沿 x 轴看方向。这里展示 x 差，完整二维距离仍由评分层计算。';
    } else if(step===1||step===2) {
      const lo=minus.x-.001,hi=plus.x+.001,x=v=>left+(v-lo)/(hi-lo)*(right-left);
      marks=text(20,30,'教学 x 局部放大（px）')+line(x(free.x),52,x(free.x),244);
      for(const [name,y,title] of [['free',90,'自由态'],['plus',155,'+β 正教学'],['minus',220,'−β 负教学']]) {
        const phase=story.phases[name];
        if(name==='minus'&&step===1)continue;
        marks+=text(20,y-23,title+'：'+fixed(phase.x,6),'start',colors[name])+line(left,y,right,y)+
          line(x(free.x),y,x(phase.x),y,colors[name],true)+dot(x(phase.x),y,colors[name],name==='free'?undefined:x(free.x));
      }
      marks+=text(20,281,'答案 x='+fixed(story.truth[0],6))+
        text(20,303,'在放大范围之外；两边仍用同一旧权重。');
      caption='点从自由输出移向已记录的教学端点。屏幕上的插值只用于讲解，不是 Newton 迭代记录。';
    } else if(step===3) {
      const center=width/2,unit=(width/2-27)/1.1;
      marks=text(20,30,'七次局部贡献累计为 g（单位：10⁻⁶）')+line(center,58,center,240);
      for(const [phase,name,y,color] of [[plus,'g⁺',115,colors.plus],[minus,'g⁻',210,colors.minus]]) {
        let sum=0;
        phase.terms.forEach((v,k)=>{
          const start=center+sum*1e6*unit;sum+=v;
          const end=center+sum*1e6*unit;
          marks+='<rect x="'+Math.min(start,end)+'" y="'+(y-8)+'" width="'+Math.abs(end-start)+'" height="16" fill="'+color+'" opacity="'+(.45+k*.07)+'" class="ep-contrast-segment" style="animation-delay:'+k*120+'ms;transform-origin:'+(v<0?'right':'left')+' center"/>';
        });
        marks+=text(20,y-27,name+' = '+signed(phase.g*1e6,6)+' ×10⁻⁶','start',color);
      }
      marks+=text(center,265,'0','middle')+text(20,292,'每一段是一刻的 −r×a；旧权重尚未改变。');
      caption='正侧累计为负，负侧累计为正。暂时只得到 E 的两次局部导数。';
    } else if(step===4) {
      const Gt=story.focusSlope, pf=plus.rows[story.t];
      const frames=[
        [['权重 w 增加 dw','q 增加 a×dw'],['平方损失差 ÷ dw','e×a/N + a²×dw/(2N)'],['让 dw 趋近 0','第二项消失'],['一刻的损失斜率 Gₜ',fixed(Gt,16)]],
        [['内部希望 y=q','教学希望 y=z'],['两股作用相抵','(y−q)+b(y−z)=0'],['解出教学输出 y⁺',fixed(plus.y,16)],['于是 r⁺=y⁺−q⁺',signed(plus.r,16)]],
        [['把 y 的公式代入 r','(q+bz)/(1+b)−q'],['通分，q 抵消','r = b(z−q)/(1+b)'],['预测差 z−q⁺',fixed(-pf.error,13)],['乘教学强度得到 r⁺',signed(plus.r,16)]],
        [['内部局部导数','gₜβ = −r×a'],['代入 r，翻转误差符号','gₜβ = b/(1+b)×(q−z)×a'],['误差乘活动 e⁺×a⁺',fixed(pf.product,13)],['实际局部导数 gₜ⁺',fixed(plus.terms[story.t],16)]],
        [['提出教学系数 β','0.003'],['校正因子 N/(N+β)',fixed(plus.factor,13)],['教学态误差×活动/N',fixed(pf.errorActivityOverN,16)],['三个因子相乘 = gₜ⁺',fixed(plus.terms[story.t],16)]],
        [['校正因子接近 1',fixed(plus.factor,13)+' ≈ 1'],['教学态乘积接近自由态','误差与活动只改变一点'],['若直接用 β×Gₜ',fixed(story.beta*Gt,16)],['实际 gₜ⁺（差约0.0223%）',fixed(plus.terms[story.t],16)]],
        [['七个时刻共享一条权重','G = G₀ + … + G₆'],['自由损失合计斜率 G',fixed(story.exact,16)],['乘以 +β=0.003',fixed(story.beta*story.exact,16)],['实际七刻合计 g⁺',fixed(plus.g,16)]]
      ];
      marks=text(width/2,26,'第⑤幕 · 小步 '+(bridgeStep+1)+'/7','middle',colors.ink,14);
      frames[bridgeStep].forEach(([label,value],k)=>{
        const y=48+k*68;
        marks+='<g class="ep-bridge-card" style="animation-delay:'+k*260+'ms"><rect x="14" y="'+y+'" width="'+(width-28)+'" height="55" rx="8" fill="'+(k===3?'#dfece3':'#fff')+'" stroke="'+colors.line+'"/>'+
          text(width/2,y+18,label,'middle',colors.ink,12)+text(width/2,y+41,value,'middle',k===3?colors.plus:colors.ink,13)+'</g>';
        if(k<3) {
          marks+=line(width/2,y+56,width/2,y+67,colors.plus,true);
          if(!motion.matches)marks+='<circle cx="'+width/2+'" cy="'+(y+56)+'" r="2.5" fill="'+colors.plus+'"><animate attributeName="cy" from="'+(y+56)+'" to="'+(y+67)+'" dur="0.65s" begin="'+(k*.26+.3)+'s" fill="freeze"/></circle>';
        }
      });
      caption=bridgeStep===5?'只有⑤.6把两个接近的量替换，使用近似号。前五小步都是等式；正侧数值均对应同一时刻。':bridgeStep===6?'从单时刻 Gₜ、gₜ 汇总到七时刻 G、g。随后才进入第⑥幕的两侧平均。':'逐格展示代入与化简。框中是同一记录的数字或明确标出的算术结果；运动只表示推导顺序。';
    } else if(step===5) {
      const x=v=>left+(v+.004)/.008*(right-left),y=v=>260-(v*1e6+1.2)/2.4*195;
      marks=text(20,28,'教学响应 g（10⁻⁶）随 β 的变化')+line(left,65,left,260)+line(left,y(0),right,y(0));
      for(const tick of [-1,0,1])marks+=text(left-9,y(tick/1e6)+4,String(tick),'end');
      for(const v of [-.003,0,.003])marks+=text(x(v),286,signed(v,3),'middle');
      marks+=line(x(-story.beta),y(minus.g),x(story.beta),y(plus.g),colors.ink,true)+
        dot(x(-story.beta),y(minus.g),colors.minus)+dot(x(0),y(0),colors.free)+dot(x(story.beta),y(plus.g),colors.plus)+
        text(x(-story.beta)+8,y(minus.g)-13,'g⁻ = '+signed(minus.g*1e6,6),'start',colors.minus)+
        text(x(story.beta)-8,y(plus.g)+22,'g⁺ = '+signed(plus.g*1e6,6),'end',colors.plus)+
        text(width/2,319,'横轴 β；两端响应之差 ÷ 0.006','middle');
      caption='连线向右下方：响应斜率为负。⑤解释了它为何近似等于损失对权重的斜率。';
    } else if(step===6) {
      marks=text(20,30,'真正改的是持久权重 C[2,0]')+
        text(20,82,'旧值')+text(20,108,fixed(story.weight),'start',colors.free,15)+
        line(35,159,right-10,159,colors.ink,true)+dot(35,159,colors.free)+dot(right-10,159,colors.ink,35)+
        text(right,208,'新值','end')+text(right,234,fixed(story.newWeight),'end',colors.ink,15)+
        text(width/2,282,'减去负斜率 → 权重增加','middle',colors.ink,15)+
        text(width/2,310,'增量 '+signed(story.change,13),'middle');
      caption='这里只看这一项的更新。真实 observe 同时更新 A/B/C 的 288 项。';
    } else {
      const rows=story.probes,lo=rows[0].weight-.0002,hi=rows[3].weight+.0002;
      const x=v=>left+(v-lo)/(hi-lo)*(right-left);
      const y=v=>260-((v-story.initialLoss)*1e6+.65)/1.05*195;
      marks=text(20,28,'独立改权重：损失变化（×10⁻⁶）')+line(left,65,left,260)+line(left,y(story.initialLoss),right,y(story.initialLoss));
      for(const tick of [-.5,0,.3])marks+=text(left-9,y(story.initialLoss+tick/1e6)+4,String(tick),'end');
      marks+='<polyline points="'+rows.map(p=>x(p.weight)+','+y(p.loss)).join(' ')+'" fill="none" stroke="'+colors.ink+'" stroke-width="2" pathLength="1" class="ep-contrast-draw"/>';
      rows.forEach((p,k)=>{marks+=dot(x(p.weight),y(p.loss),k===1?colors.free:colors.ink)+text(x(p.weight),y(p.loss)+(k===2?-13:23),String(k+1),'middle');});
      marks+=text(left,286,'w 减少','start')+text(right,286,'w 增加','end')+
        text(width/2,306,'1 减0.001 · 2 旧值','middle',colors.ink,12)+
        text(width/2,326,'3 加0.001 · 4 EP新值','middle',colors.ink,12);
      caption='四个点均为独立 Python 实际复算，折线只连接结果。图中没有混入 288 项一起更新的损失。';
    }
    $('figure').innerHTML='<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+activeChapter().title+'"><title>'+activeChapter().title+'</title><g font-family="system-ui,sans-serif">'+marks+'</g></svg>';
    if(root.classList.contains('ep-contrast-paused'))$('figure').querySelector('svg').pauseAnimations();
    $('caption').textContent=caption;
  }
  function render() {
    root.classList.remove('ep-contrast-paused');
    root.classList.toggle('ep-bridge-active',step===4);
    const chapter=activeChapter();
    $('title').textContent=chapter.title;
    $('text').textContent=chapter.text;
    $('math').innerHTML=equation(chapter.math());
    $('takeaway').textContent=chapter.takeaway;
    $('extra').innerHTML=chapter.extra?.()||'';
    $('position').textContent=step===4?'第⑤幕 · 小步 '+(bridgeStep+1)+'/7':(step+1)+' / 8';
    $('bridge').hidden=step!==4;
    for(const button of root.querySelectorAll('[data-bridge-step]'))button.setAttribute('aria-pressed',String(Number(button.dataset.bridgeStep)===bridgeStep));
    $('previous').textContent=step===4&&bridgeStep>0?'← 上一小步':'← 上一幕';
    $('next').textContent=step===4&&bridgeStep<6?'下一小步 →':'下一幕 →';
    $('previous').disabled=step===0;$('next').disabled=step===7;
    for(const button of root.querySelectorAll('[data-contrast-stage]'))button.setAttribute('aria-pressed',String(Number(button.dataset.contrastStage)===step));
    $('play').textContent=playing?'暂停动画':'播放整段动画';
    $('progress').style.animation='none';
    if(playing)requestAnimationFrame(()=>{if(playing)$('progress').style.animation='ep-contrast-progress '+duration()+'ms linear forwards';});
    draw();
  }
  function duration() {return step===4||step===5?14000:10000;}
  function stop(freeze=true) {
    clearTimeout(timer);playing=false;$('play').textContent='播放整段动画';$('progress').style.animationPlayState='paused';
    root.classList.toggle('ep-contrast-paused',Boolean(freeze));
    if(freeze)$('figure').querySelector('svg')?.pauseAnimations();
  }
  function advance(direction) {
    if(step===4&&((direction>0&&bridgeStep<6)||(direction<0&&bridgeStep>0)))bridgeStep+=direction;
    else {step=Math.max(0,Math.min(7,step+direction));bridgeStep=direction<0&&step===4?6:0;}
  }
  function queue() {clearTimeout(timer);timer=setTimeout(()=>{if(!playing)return;advance(1);render();if(step===7)stop(false);else queue();},duration());}
  function move(index) {stop();step=Math.max(0,Math.min(7,index));bridgeStep=0;render();}
  $('stages').innerHTML=labels.map((label,index)=>'<button type="button" data-contrast-stage="'+index+'" aria-pressed="'+(index===0)+'">'+label+'</button>').join('');
  for(const button of root.querySelectorAll('[data-contrast-stage]'))button.onclick=()=>move(Number(button.dataset.contrastStage));
  $('bridge').innerHTML='<p><strong>第⑤幕拆成七小步：</strong>先弄懂一刻的 Gₜ，再看它怎样进入 gₜβ；最后才加七刻。每格都能点选。</p><div class="ep-bridge-stages" role="group" aria-label="第⑤幕七步推导">'+betaBridgeLabels.map((label,index)=>'<button type="button" data-bridge-step="'+index+'">'+label+'</button>').join('')+'</div>';
  for(const button of root.querySelectorAll('[data-bridge-step]'))button.onclick=()=>{stop();bridgeStep=Number(button.dataset.bridgeStep);render();};
  $('previous').onclick=()=>{stop();advance(-1);render();};$('next').onclick=()=>{stop();advance(1);render();};
  $('replay').onclick=()=>{stop();render();};
  $('play').onclick=()=>{
    if(playing){stop();return;}
    onPlay();if(step===7){step=0;bridgeStep=0;}playing=true;render();queue();
  };
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  motion.addEventListener('change',draw);
  window.addEventListener('hashchange',()=>{if(location.hash==='#ep-beta-bridge')move(4);});
  for(const link of document.querySelectorAll('a[href="#ep-beta-bridge"]'))link.addEventListener('click',()=>move(4));
  root.hidden=false;render();
  new ResizeObserver(()=>{if(Math.round($('figure').getBoundingClientRect().width)!==lastWidth)draw();}).observe($('figure'));
  return {stop};
}
