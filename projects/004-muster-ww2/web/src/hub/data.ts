export const source = {
  url: 'https://github.com/Kenton-GMI/muster-ww2',
  commit: '7d2fa86ebc3b999eaf085831cdcd5dccefea63d4',
};
export const experiences = [
  { id: 'camp', title: '动态营地', subtitle: '从素材到场景', href: './camp.html', image: 'fieldcamp-realism-convoy.png',
    tag: '26 实例 · 90 秒循环', doc: 'notes/fieldcamp-realism.md',
    text: '车辆运输、步兵巡逻、P-51 起降。近看车轮、履带、步态、起落架与同步声音，再切回场景布置。',
    steps: ['点击「开始动态演示」，用空格暂停 / 继续。', '拖动时间轴：27–31 秒收起落架，51–55 秒放下；勾选跟随飞机。', '点击「返回布置」，配置装备、编队、拖动模型，导出自己的布局。'],
  },
  { id: 'airport', title: '机场保卫战', subtitle: '把单位连成任务', href: './airport.html', image: 'airport-wave-two.png',
    tag: '4 阶段 · 6 分钟', doc: 'notes/airport-defense.md',
    text: '吉普侦察与送补给，两班步兵守阵地，装甲挡住两波进攻，P-51 提供有限空袭，最后恢复机场。',
    steps: ['先用吉普到 N / E 黄圈停车 2 秒；可先到 D 按 E 装两箱补给。', '用「部署路口 / 北侧」指挥两班，送首箱至 HQ；切换装甲抵挡两波进攻。', '送第二箱至 HQ，用「警戒机场」守住 8 秒。P 暂停 / 继续，F 呼叫有限空袭。'],
  },
  { id: 'battle', title: '协同自由演习', subtitle: '快速体验交火', href: './battle.html', image: 'battle-combined-combat.png',
    tag: '三车切换 · 陆空协同', doc: 'notes/combined-arms.md',
    text: '与友军步兵争夺通信区，对抗红队装甲、步兵和空袭。全歼对手，或无争夺占领 20 秒。',
    steps: ['WASD 驾驶，鼠标瞄准，左键 / 空格射击。', '1 / 2 / 3 切换谢尔曼、M18、吉普；车辆各自保留耐久与位置。', 'F 标记空袭，避开红色预警；P / Esc 暂停。支持轻松 / 标准模式。'],
  },
  { id: 'archive', title: '74 条模型资料库', subtitle: '回到上游能力', href: './archive.html', image: 'cover.png',
    tag: '7 类素材 · 可配置展柜', doc: 'notes/research.md',
    text: '按国家、类别与关键词查找真实程序化资产。选择配置、改变数量与编队，查看资料及来源。',
    steps: ['在 Library 搜索 Panzer 或按国家 / 类别筛选；默认展台呈现 280 个实例。', '点击模型，在 Inspector 调整装备和数量，拖动 / 旋转并撤销。', '布局与相机保存在本机浏览器。营地和展柜使用不同存储键。'],
  },
  { id: 'harness', title: '六视图模型审查', subtitle: '核对模型与比例', href: './harness.html?asset=germany/panzer-iv-h&ref=1', image: 'panzer-fitted.png',
    tag: '6 个角度 · 1.80 米参照', doc: 'web/docs/ASSET_GUIDE.md',
    text: '观察四号坦克的轮廓、顶面、底面接触与相对尺寸。对照侧裙开关，理解配置如何真正改变几何。',
    steps: ['默认审查四号坦克；在参数栏可切换营地的谢尔曼、吉普、P-51 与步兵。', '对照六视图与 1.80 米参照人物；打开大图检查细节。', '页面支持 asset / config / views / ref 参数；原始截图与统计在效果档案中。'],
  },
] as const;
export const questions = [
  { q: '它的能力是什么？', a: '把 TypeScript 程序化模型组织成统一资产库：检索、资料卡、参数配置、兼容约束、编队、场景编辑和本机保存。公开目录有 74 条；新模型需要开发者编写构建函数。', doc: 'notes/research.md' },
  { q: '实际效果是什么？', a: '上游呈现有材质、阴影和接触暗部的微缩展柜。本地扩展把 8 类素材组成 26 实例营地，加入可动部件与声音，再发展成陆空协同演习和四阶段机场任务。', doc: 'notes/fieldcamp.md' },
  { q: '底层原理是什么？', a: '资产定义 → 配置约束 → 机械几何 / SDF 人体 → 材质合并与缓存 → Three.js 渲染。动态层再拆出部件、计算路径与腿部 IK；游戏层用规则、寻路、视野、资源和任务状态机驱动。', doc: 'notes/fieldcamp-realism.md' },
  { q: '适合哪些场景？', a: '数字博物馆、教学、收藏陈列、产品配置器、主题场景搭建和游戏原型。可配置资产与来源记录适合内容长期扩充；不同产品还需各自的素材、内容和交互。', doc: 'notes/research.md' },
  { q: '还能如何扩展？', a: '先完善关卡、任务与单位分工，再提取通用资产协议与审查工具；按目标设备补充 LOD、实例化、生成调度。编辑器、GLB 导出、多人同步和真实物理仍是后续方向。', doc: 'notes/airport-defense.md' },
  { q: '对我们的价值是什么？', a: '已有“素材 → 场景 → 动作 → 协同任务”的可运行样本。对樱花街可复用资产接口、配置规则、组内偏移和审查流程；视觉风格与几何预算需要重新适配，复用尚未实际接入。', doc: 'notes/research.md' },
];
export const principles = [
  { title: '统一资产协议', text: 'AssetDef 组织资料、占地、options、constrain、build 与 provenance。自动注册后，同一配置器和编辑器服务不同资产。', doc: 'web/docs/ASSET_GUIDE.md', demo: 'archive' },
  { title: '几何、人体与材质', text: '机械体由圆角盒、挤出、放样和重复部件组成；SDF + Surface Nets 生成共享人体。程序化噪声与三向投影表现表面。', doc: 'notes/research.md', demo: 'harness' },
  { title: '编队与可恢复编辑', text: '稳定槽位 + 单体偏移保留组内调整；历史快照负责撤销重做，localStorage 保存布局与镜头。文件导入先校验后替换。', doc: 'notes/fieldcamp.md', demo: 'camp' },
  { title: '动作与同步声音', text: '统一时间驱动车辆路径、轮距、逐节履带、腿部 IK 和起落架。落脚触发脚步声，暂停冻结时间并停掉音频。', doc: 'notes/fieldcamp-realism.md', demo: 'camp' },
  { title: '规则战斗与寻路', text: '车辆与炮弹碰撞、A* 导航、步兵交火、空袭重力轨迹和范围伤害共同组成规则电脑对战，未接入大模型决策。', doc: 'notes/combined-arms.md', demo: 'battle' },
  { title: '任务、视野与补给', text: '侦察与部署开放防守阶段；友军共享当前视野；补给补充存活单位的耐久与弹药；两波后由补给和警戒共同完成任务。', doc: 'notes/airport-defense.md', demo: 'airport' },
];
export const comparisons = [
  { title: '配置真正改变模型', before: 'panzer-fitted.png', after: 'panzer-removed.png', labels: ['侧裙保留', '侧裙拆除'], doc: 'notes/experiment.md', text: '同一资产与六视图，配置改变构建出的几何。' },
  { title: '飞机起落架与舱门联动', before: 'fieldcamp-realism-gear-down.png', after: 'fieldcamp-realism-gear-up.png', labels: ['起落架放下', '起落架收起'], doc: 'notes/fieldcamp-realism.md', text: '来自真实营地程序化动作，首页可拖动时间轴核对。' },
  { title: '协同形成完整任务', before: 'airport-supply-loaded.png', after: 'airport-victory.png', labels: ['吉普实际装货', '完成四阶段任务'], doc: 'notes/airport-defense.md', text: '真实键鼠验收完成轻松模式一局；标准模式完整通关仍待实测。' },
];
export const roadmap = [
  { state: '已实现', title: '可玩的协同任务', text: '小队移动 / 驻守 / 跟随，侦察、两箱补给、有限弹药与空袭、两波防守、机场恢复。', doc: 'notes/airport-defense.md' },
  { state: '下一步建议', title: '增加任务深度', text: '伤员撤离、补给库存与路线威胁、分支目标、敌方波次配置和关卡编辑。需要明确单位职责与新的胜负测试。', doc: 'notes/airport-defense.md' },
  { state: '下一步建议', title: '提取可复用工具', text: '泛化资产协议、配置约束、编队 / 偏移和六视图审查，为樱花街等场景提供组件接入方式。尚未完成跨项目接入。', doc: 'notes/research.md' },
  { state: '待验证', title: '性能与真实设备', text: 'LOD、真正 GPU 实例化、后台生成与缓存预算；逐项审查全部模型配置，并在真实手机与低性能设备测量。', doc: 'notes/experiment.md' },
  { state: '后续方向', title: '导出、物理与多人', text: 'GLB 导出、碰撞与飞行物理、完整蒙皮动画、多人状态同步；模型不是工程 CAD，可打印性与生产精度需另行验证。', doc: 'notes/research.md' },
];

