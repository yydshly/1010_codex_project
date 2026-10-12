const upstream = 'https://github.com/ektogamat/threejs-conference/blob/8cc20593b2270e2ce832e7b7b44356705daddec4/';

export const views = {
  street: { position: [3.2, 3.1, 12], target: [-.7, 3, -17], label: '01 / 霓虹街巷', title: '雨落有处，霓虹有影。', caption: '雨滴读取屋顶高度，湿地映出招牌与建筑。' },
  roof: { position: [2, 8.5, 5], target: [-4.6, 3.4, -3.5], label: '02 / 屋顶落雨', title: '雨棚上方，是另一层地面。', caption: '打开高度图，看看雨棚怎样进入碰撞查询。' },
  ground: { position: [4.4, .85, 6.8], target: [-2, 1, -13], label: '03 / 湿地倒影', title: '霓虹，也落在脚下。', caption: '关闭湿地反射，对照镜像相机带来的颜色与空间感。' },
  surface: { position: [2.1, 3.4, -.2], target: [-.7, 1.35, -3.8], label: '04 / 车身水珠', title: '水珠改变光，而非几何。', caption: '本地简化水珠材质；掩码驱动法线与粗糙度。' },
};

export const principles = {
  rain: {
    title: '把碰撞，留在 GPU 上。',
    paragraphs: ['正交相机俯视附近场景，材质把世界位置写进半浮点纹理。雨滴将自己的 XZ 转成 UV，读取纹理中的 Y，得到这一列最高的表面。', '计算着色器并行移动粒子。当雨滴低于表面高度，就重新生成到上方。最近邻采样避免把屋顶边缘的高度混成斜坡。'],
    code: 'height = texture(heightMap, worldXZ_to_UV).y\nposition += velocity × delta\nif position.y < height + epsilon:\n    respawn_above_surface()\n// 随后批量绘制朝向镜头的雨丝',
    note: '本地高度图为 384 × 384，每两帧更新；绘制数量可调。水花使用原创图集，并独立循环。',
    source: 'docs/techniques/collision-rain.md',
  },
  reflection: {
    title: '再看一次世界，得到倒影。',
    paragraphs: ['把主相机的位置和视线沿地面镜像，再将场景渲染到半分辨率纹理。渲染时隐藏地面自身，并裁掉地面以下的内容。', '地面采样这张纹理，按粗糙度控制强度。涟漪同时扰动表面法线与倒影 UV，形成轻微晃动。当前版本采用平面反射。'],
    code: 'mirrorCamera = reflect(camera, groundPlane)\nreflectionRT = render(scene, mirrorCamera)\nwetness = 1 - roughness\nreflection = sample(reflectionRT, warpedUV)\nemissive += reflection × wetness × strength',
    note: '半分辨率、隔帧更新都能降低成本。它适合平坦湿地；弯曲表面需要其他反射方法。',
    source: 'docs/techniques/wet-ground.md',
  },
  material: {
    title: '用光照，读出一颗水珠。',
    paragraphs: ['在第二套 UV 上计算水珠掩码，再分别采样邻近位置。相邻样本的差形成法线扰动，让光照产生水珠的凸起感。', '掩码还把粗糙度混向较低值，让水珠更光滑。UV0 可以继续承载底色纹理。这里使用原创圆珠与周期滑动，展示同类材质原理。'],
    code: 'mask = dropPattern(UV1, time)\ndx = dropPattern(UV1 + εx, time) - mask\ndy = dropPattern(UV1 + εy, time) - mask\nnormal = perturbNormal(dx, dy)\nroughness = mix(base, wet, mask)',
    note: '上游滑落图案源自 rocksdanister/rain，另含 CC BY-NC-SA 3.0 条款，本页未复制该图案代码。',
    source: 'docs/techniques/car-surface-rain.md',
  },
  stack: {
    title: 'JavaScript 组织，GPU 执行。',
    paragraphs: ['Three.js 管理相机、几何与资源。TSL 用 JavaScript 节点表达材质、计算和后处理，再由节点系统生成 GPU 程序。WebGPU 提供渲染和并行计算能力。', '一帧先更新高度图，再更新雨滴；接着渲染地面倒影，最后输出主场景与辉光。保持数据先生产、后采样，避免读取旧纹理或让雨滴成为假碰撞面。'],
    code: 'camera → height texture → rain compute\n       → surface time → mirror render\n       → scene pass → Bloom → color grade\n\n// 高频动画留在 GPU；DOM 展示说明与控制',
    note: '完整上游还包含 BVH 漫游、视频招牌、GTAO 与音效。本页集中验证渲染核心。',
    source: 'src/runtime/createRenderLoop.js',
  },
};

export function renderPrinciple(key) {
  const p = principles[key];
  const area = document.querySelector('#principle-content');
  area.replaceChildren();
  const heading = document.createElement('h3'); heading.textContent = p.title; area.append(heading);
  for (const text of p.paragraphs) { const node = document.createElement('p'); node.textContent = text; area.append(node); }
  const pre = document.createElement('pre'); pre.textContent = p.code; area.append(pre);
  const note = document.createElement('p'); note.textContent = p.note; area.append(note);
  const link = document.createElement('a'); link.href = upstream + p.source; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = '查看对应上游实现 ↗'; area.append(link);
  area.setAttribute('aria-labelledby', `tab-${key}`);
  document.querySelectorAll('[data-principle]').forEach(button => {
    const selected = button.dataset.principle === key;
    button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
  });
}
