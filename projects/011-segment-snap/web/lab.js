// Original, deterministic presentation geometry. No model, checkpoint or learned inference.
export function initializeLab() {
  const model = document.querySelector('#lab-model');
  const objectButtons = [...document.querySelectorAll('[data-object]')];
  const layerButtons = [...document.querySelectorAll('[data-layer]')];
  const handleSide = document.querySelector('#handle-side');
  const guidance = document.querySelector('#handle-guidance');
  const range = document.querySelector('#motion-range');
  const output = document.querySelector('#motion-output');
  const play = document.querySelector('#play-motion');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const state = { object: 'door', layer: 'motion', value: 0 };
  let animation = 0;
  let playing = false;

  const yaw = .58, pitch = .32, scale = 112;
  function project([x, y, z]) {
    return [420 + (x * Math.cos(yaw) - z * Math.sin(yaw)) * scale,
      440 - (y * Math.cos(pitch) - (x * Math.sin(yaw) + z * Math.cos(yaw)) * Math.sin(pitch)) * scale];
  }
  function line(a, b, stroke, width = 1, dash = '') {
    const p = project(a), q = project(b);
    return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${stroke}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  }
  function circle(point, fill, radius = 1.6, opacity = 1) {
    const [cx, cy] = project(point);
    return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius}" fill="${fill}" opacity="${opacity}"/>`;
  }
  function polygon(points, fill, stroke = '', opacity = 1) {
    return `<polygon points="${points.map(point => project(point).map(v => v.toFixed(1)).join(',')).join(' ')}" fill="${fill}" ${stroke ? `stroke="${stroke}"` : ''} opacity="${opacity}"/>`;
  }
  function label(point, text, color, dx = 15, dy = 0) {
    const [x, y] = project(point);
    return `<line x1="${x}" y1="${y}" x2="${x + dx * .8}" y2="${y + dy}" stroke="${color}" opacity=".5"/><text x="${x + dx}" y="${y + dy}" fill="${color}" font-size="13" font-family="Segoe UI,Microsoft YaHei,sans-serif">${text}</text>`;
  }
  function pivotX() {
    if (!guidance.checked || handleSide.value === 'none') return 0;
    return handleSide.value === 'right' ? -.9 : .9;
  }
  function move(point) {
    const [x, y, z] = point;
    if (state.object === 'drawer') return [x, y, z + state.value / 100];
    const hinge = pivotX();
    const direction = hinge > 0 ? 1 : -1;
    const angle = direction * state.value * Math.PI / 180;
    return [hinge + (x - hinge) * Math.cos(angle), y, z - (x - hinge) * Math.sin(angle)];
  }
  function stop() {
    cancelAnimationFrame(animation);
    playing = false;
    play.innerHTML = '播放运动 <span aria-hidden="true">▷</span>';
  }
  function updateControls() {
    const door = state.object === 'door';
    objectButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.object === state.object)));
    layerButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.layer === state.layer)));
    document.querySelector('#door-options').hidden = !door;
    range.max = door ? '90' : '60';
    range.value = String(Math.round(state.value));
    output.value = `${Math.round(state.value)}${door ? '°' : ' cm'}`;
    document.querySelector('#motion-label').textContent = door ? '柜门开启角度' : '抽屉展示行程';
    document.querySelector('#lab-object-name').textContent = door ? '柜门 / ROTATION' : '抽屉 / TRANSLATION';
    document.querySelector('#lab-state').textContent = `${String(Math.round(state.value)).padStart(2, '0')}${door ? '°' : ' cm'}`;
    model.setAttribute('aria-label', `${door ? '旋转柜门' : '平移抽屉'}的${{input:'输入点云',parts:'部件分割',motion:'运动参数',handles:'操作把手'}[state.layer]}原理示意`);
    let explanation = '';
    if (!door) explanation = '平移方向采用抽屉前表面的法线。把手说明操作区域，不参与旋转铰链选择。';
    else if (!guidance.checked) explanation = '关闭把手引导：原点放在部件中心，示意柜门绕中心转动。这个位置通常不是实际铰链。';
    else if (handleSide.value === 'none') explanation = '没有检测到附近把手时，规则回退到部件中心。缺失线索会影响铰链定位。';
    else explanation = `把手在${handleSide.value === 'right' ? '右' : '左'}侧，选择更远的${handleSide.value === 'right' ? '左' : '右'}侧候选铰链。旋转轴采用竖直方向。`;
    const prefix = { input: '输入层：坐标、颜色与法线提供场景信息。', parts: '分割层：彩色点表示同一个可动部件。', motion: '', handles: '把手层：橙色点标出操作区域。' }[state.layer];
    document.querySelector('#lab-explanation').textContent = `${prefix}${explanation}`;
    document.querySelector('.lab-legend').hidden = state.layer === 'input';
  }
  function draw() {
    const door = state.object === 'door';
    const bottom = door ? .1 : .85, top = door ? 2.8 : 1.85;
    const minX = -.9, maxX = .9, frontZ = .5;
    let svg = '<defs><radialGradient id="labGlow"><stop offset="0" stop-color="#294c3d" stop-opacity=".7"/><stop offset="1" stop-color="#132b2a" stop-opacity="0"/></radialGradient></defs><ellipse cx="420" cy="345" rx="310" ry="220" fill="url(#labGlow)"/>';
    for (let i = -5; i <= 5; i++) {
      svg += line([i * .65, 0, -3.3], [i * .65, 0, 3.3], '#416052', .6);
      svg += line([-3.3, 0, i * .65], [3.3, 0, i * .65], '#416052', .6);
    }
    // Context cabinet, fixed while the movable surface changes.
    const box = [[-1.02,0,-.65],[1.02,0,-.65],[1.02,2.93,-.65],[-1.02,2.93,-.65],[-1.02,0,.48],[1.02,0,.48],[1.02,2.93,.48],[-1.02,2.93,.48]];
    svg += polygon([box[0],box[1],box[2],box[3]], '#688c6e', '', .07);
    svg += polygon([box[1],box[5],box[6],box[2]], '#78957a', '', .08);
    [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]].forEach(([a,b]) => { svg += line(box[a],box[b],'#65846f',1); });
    for (let x = -1; x <= 1.001; x += .10) for (let y = .05; y <= 2.9; y += .13) svg += circle([x,y,-.65], '#79937e', .7, .28);
    const corners = [[minX,bottom,frontZ],[maxX,bottom,frontZ],[maxX,top,frontZ],[minX,top,frontZ]].map(move);
    const partColor = state.layer === 'input' ? '#b69b75' : state.layer === 'handles' ? '#668e78' : '#9eddba';
    svg += polygon(corners, partColor, partColor, state.layer === 'handles' ? .055 : .10);
    const pointRows = door ? 37 : 17;
    for (let ix = 0; ix <= 27; ix++) for (let iy = 0; iy <= pointRows; iy++) {
      const jitter = Math.sin(ix * 13.1 + iy * 7.7) * .008;
      svg += circle(move([minX + ix / 27 * 1.8 + jitter, bottom + iy / pointRows * (top - bottom), frontZ]), partColor, state.layer === 'input' ? 1.4 : 1.7, .62 + ((ix + iy) % 4) * .08);
    }
    if (!door) {
      const backCorners = corners.map(point => [point[0],point[1],point[2]-.55]);
      svg += polygon([corners[2],corners[3],backCorners[3],backCorners[2]], '#92b99a', '#86af90', .12);
      svg += polygon([corners[0],corners[3],backCorners[3],backCorners[0]], '#789980', '#86af90', .15);
    }
    const showHandles = state.layer === 'handles' || state.layer === 'motion';
    const hasHandle = !door || handleSide.value !== 'none';
    let handlePoint;
    if (hasHandle) {
      const hx = door ? (handleSide.value === 'left' ? -.70 : .70) : 0;
      const hy = door ? 1.48 : 1.36;
      handlePoint = move([hx,hy,.555]);
      for (let i = 0; i < 17; i++) {
        const offset = (i / 16 - .5) * .27;
        for (let j = -1; j <= 1; j++) svg += circle(move([door ? hx + j*.018 : hx + offset, door ? hy + offset : hy + j*.018, .555]), showHandles ? '#f1a86f' : '#c4b795', showHandles ? 2.1 : 1.4, .97);
      }
      if (state.layer === 'handles') svg += label(handlePoint,'操作把手','#f1b484',28,-14);
    }
    if (state.layer === 'parts') svg += label(move([.8,top-.3,frontZ]),door ? '可动柜门' : '可动抽屉','#b6e6c5',35,-5);
    if (state.layer === 'motion') {
      if (door) {
        const hx = pivotX();
        svg += line([hx,-.17,.5],[hx,3.12,.5],'#ba97ee',2.2,'7 5');
        svg += circle([hx,1.45,.5],'#c7aff4',5);
        svg += label([hx,3.04,.5],'竖直旋转轴','#c7aff4',18,-4);
        const foot = project([hx,1.45,.5]);
        svg += `<circle cx="${foot[0]}" cy="${foot[1]}" r="12" fill="none" stroke="#ba97ee" stroke-width=".8" opacity=".6"/>`;
        if (handlePoint) svg += label(handlePoint,'把手线索','#f1b484',28,-3);
      } else {
        const a = [0,1.34,-.40], b = [0,1.34,1.75];
        svg += line(a,b,'#57cdb4',2.3,'7 5');
        svg += circle([0,1.34,.5+state.value/100],'#72dfc5',4);
        const end = project(b), prev = project([0,1.34,1.60]);
        const angle = Math.atan2(end[1]-prev[1],end[0]-prev[0]);
        svg += `<path d="M${end[0]-10*Math.cos(angle-.5)},${end[1]-10*Math.sin(angle-.5)} L${end[0]},${end[1]} L${end[0]-10*Math.cos(angle+.5)},${end[1]-10*Math.sin(angle+.5)}" fill="none" stroke="#57cdb4" stroke-width="2"/>`;
        svg += label(b,'表面法线 / 平移轴','#79dfc5',-148,24);
      }
    }
    model.innerHTML = svg;
    updateControls();
  }
  objectButtons.forEach(button => button.addEventListener('click', () => { stop(); state.object = button.dataset.object; state.value = 0; draw(); }));
  layerButtons.forEach(button => button.addEventListener('click', () => { state.layer = button.dataset.layer; draw(); }));
  handleSide.addEventListener('change', () => { stop(); state.value = 0; draw(); });
  guidance.addEventListener('change', () => { stop(); state.value = 0; draw(); });
  range.addEventListener('input', () => { stop(); state.value = Number(range.value); draw(); });
  document.querySelector('#reset-motion').addEventListener('click', () => { stop(); state.object = 'door'; state.layer = 'motion'; state.value = 0; handleSide.value = 'right'; guidance.checked = true; draw(); });
  play.addEventListener('click', () => {
    if (playing) { stop(); return; }
    const maximum = state.object === 'door' ? 90 : 60;
    if (reducedMotion.matches) { state.value = maximum; draw(); return; }
    if (state.value >= maximum) state.value = 0;
    const initial = state.value;
    const start = performance.now();
    let lastFrame = 0;
    playing = true;
    play.innerHTML = '暂停运动 <span aria-hidden="true">Ⅱ</span>';
    function frame(now) {
      if (now - lastFrame >= 32) {
        const progress = Math.min((now - start) / 1800, 1);
        state.value = initial + (maximum - initial) * (.5 - Math.cos(progress * Math.PI) / 2);
        draw();
        lastFrame = now;
        if (progress === 1) { stop(); return; }
      }
      animation = requestAnimationFrame(frame);
    }
    animation = requestAnimationFrame(frame);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  draw();
}
