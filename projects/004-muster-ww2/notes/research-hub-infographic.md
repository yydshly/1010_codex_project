# Muster 一图总览 · 制作与来源记录

研究汇总日期：2026-10-12。最终使用本地原生图文排版，直接嵌入十张已有实际运行截图；本图是研究信息图，不是新的应用运行截图。各阶段原始截图继续保留，便于核对画面。

交付为 [高清 PNG](../assets/research-hub-overview.png) 和 [可编辑 SVG](../assets/research-hub-overview-source.svg)，尺寸均为 **3840 × 4886**。原始 PNG 未重绘；SVG 内的十个嵌入图与对应源文件保持相同二进制内容，排版只改变显示尺寸。

内置 imagegen 在五张参考图请求下连续两次返回网络错误，未获得生成图；一次更早的六张输入请求因最多五张的限制而被拒绝。没有调用 CLI / API 回退，也没有把失败结果标为成图。最终采用代码原生信息图，以保持长篇中文、统计数字与实拍一致。

## 内容范围

总图整理九个模块：资源、上游能力、底层原理、本地营地与动作声音、陆空协同与机场任务、使用场景、对现有项目的价值、扩展路线、验证与边界。状态分别标明“上游已有”“本地已实现”“后续建议”。

- 74 个公开程序化资产，类别合计与国家合计均为 74。
- 源库使用 TypeScript 建模、Three.js 渲染和配置约束，不属于 AI 文生 3D。
- 营地、动作与声音、战斗和任务由本地扩展；机场轻松模式已实际通关。
- 樱花街接入、多人、真实物理、骨骼蒙皮、GLB 导出和性能改造仍为建议或待开发工作。
- 原始证据以 [完整研究笔记](research.md)、[机场记录](airport-defense.md)、[协同记录](combined-arms.md)、[动作与声音记录](fieldcamp-realism.md) 为准。

## 实际截图输入

| 顺序 | 原始文件 | 使用角色 |
| --- | --- | --- |
| 1 | [cover.png](../assets/cover.png) | 原版展柜在本地复现，默认 280 个实例 |
| 2 | [fieldcamp-overview.png](../assets/fieldcamp-overview.png) | 已有素材组成的营地，26 个实例 |
| 3 | [fieldcamp-realism-convoy.png](../assets/fieldcamp-realism-convoy.png) | 动作与声音阶段，履带、车轮和巡逻 |
| 4 | [battle-combined-combat.png](../assets/battle-combined-combat.png) | 陆空协同自由演习 |
| 5 | [airport-wave-two.png](../assets/airport-wave-two.png) | 四阶段机场任务，小队指挥与第二波防守 |
| 6 | [panzer-fitted.png](../assets/panzer-fitted.png) | 六视图质量审查与参照人 |
| 7 | [fieldcamp-realism-gear-down.png](../assets/fieldcamp-realism-gear-down.png) | 进场时起落架展开 |
| 8 | [fieldcamp-realism-gear-up.png](../assets/fieldcamp-realism-gear-up.png) | 巡航时起落架收起 |
| 9 | [fieldcamp-realism-patrol.png](../assets/fieldcamp-realism-patrol.png) | 士兵巡逻与程序化步态 |
| 10 | [airport-supply-loaded.png](../assets/airport-supply-loaded.png) | 吉普实际装载两箱补给 |

十张输入均已逐一查看。原生排版不会新增或重绘画面主体，实际过程仍应通过原始 PNG、报告与可玩的应用回查。表格按研究链条列出，最终图的窗口按模块摆放。

## 排版与复现

原生排版源码：[render-overview.mjs](../web/scripts/render-overview.mjs)。脚本使用当前项目已有的 puppeteer-core 和本机 Edge，构建 HTML 布局、导出自包含 SVG，再截取完整排版为 PNG。它不修改输入截图。

```powershell
cd projects/004-muster-ww2/web
node scripts/render-overview.mjs
npm.cmd run build
```

再次运行排版命令会更新本轮的同名 PNG / SVG。截图与字体解码完成后再输出；九个模块和十个截图全部加载且无横向溢出。SVG 的中文字体依赖查看环境，本轮 Windows Edge 渲染固定在 PNG 中。

## 本轮实际验证

- [总图原始验收报告](research-hub-infographic-results.json)：六项检查通过，包含最终尺寸、九模块 / 十图加载、SVG 实际渲染无裁切或横向溢出、十张截图二进制一致、生产资源字节一致、首页加载下载与窄屏。
- 实际点击首页图片可打开 3840 × 4886 原图；PNG 与 SVG 均可独立访问。
- `npm.cmd run verify:hub -- --light` 六项资料与网页流程通过，包含全文读取、媒体、全部入口、实际音频与 390px 布局；[网页原始报告](research-hub-content-results.json) 保留本轮细节。
- `npm.cmd run build` 与根 `npm.cmd run check` 通过。原有完整 3D 首页验收报告保持原样；本轮未重复游戏规则或完整战局测试。

## 上游与授权

- 上游：[Kenton-GMI/muster-ww2](https://github.com/Kenton-GMI/muster-ww2)。
- 固定版本：[7d2fa86ebc3b999eaf085831cdcd5dccefea63d4](https://github.com/Kenton-GMI/muster-ww2/tree/7d2fa86ebc3b999eaf085831cdcd5dccefea63d4)。
- MIT，保留 Kenton Wang 版权；依赖、字体与本地扩展说明见 [授权记录](../web/THIRD_PARTY.md)。
- 汇总日期不表示重新运行了此前所有游戏验收；新的成图和网页接入另行验证。

## imagegen 尝试提示词（未成图）

模式：内置 imagegen；未调用 CLI / API 回退。下面是进入两次网络失败请求的提示词，保留用于记录原始排版意图；最终成图由上方原生脚本生成，包含十张原图，不与这份五张参考图提示词混淆。

```text
Use case: infographic-diagram, with compositing of actual application screenshots.
Asset type: one comprehensive Chinese research infographic for the Muster project and its website.

Create ONE finished, high-resolution portrait infographic, approximately 2160×3840, with crisp legible simplified Chinese typography. It must be a thoughtful research map, not a marketing ad. Warm ivory background, deep olive headings, muted sand cards, cyan for locally implemented extensions, neutral gray for future work. Balanced spacious grid, thin connecting arrows, restrained technical icons, clear visual hierarchy. A coherent single image with nine numbered modules. Dense but readable; prioritize all the content below, and don't replace factual text with decorative filler. Keep text sufficiently large for full-resolution reading. No gradients that obscure text.

The six input images are actual screenshots to be used as supporting INSERTS, in this exact order:
Image 1 cover.png = upstream archive UI locally reproduced, the full default military model display. Insert as "原版展柜 · 本地复现".
Image 2 panzer-fitted.png = actual Panzer six-view quality review with reference person. Insert as "六视图审查 · 实测".
Image 3 fieldcamp-overview.png = our actual editable miniature camp. Insert as "本地营地 · 26 个实例".
Image 4 fieldcamp-realism-convoy.png = our actual wheel, track and patrol demonstration. Insert as "动作与声音 · 本地扩展".
Image 5 battle-combined-combat.png = actual combined arms game. Insert as "陆空协同 · 本地扩展".
Image 6 airport-wave-two.png = actual airport defense mission. Insert as "机场保卫战 · 本地可玩".
Preserve the screenshot scenes and their 3D subjects accurately in framed image windows; crop empty margins or tiny UI text only for composition. Do not repaint them as photorealistic WWII history, invent vehicles, claim generated backgrounds are real screenshots, or mix up input roles. Their existing small UI text need not be legible when reduced; all new explanatory labels must be crisp. Use all six screenshots in six reasonably sized windows, placed next to the corresponding explanation. Image 1 and 2 share the upper upstream resources band. Image 3 and 4 share the local camp band; Image 5 and 6 share the game band. Each window needs its caption and state marker. New explanatory typography and line icons may sit around them, never cover important scene subjects.

Main title, verbatim:
"MUSTER"
"从程序化模型，到可玩的协同任务"
Subtitle:
"库的能力、资源、底层原理、实际探索与复用价值"
Definition callout:
"核心定位：代码生成的二战 3D 资产库 + 配置展柜 + 场景编辑系统"
"不是 AI 文生 3D，也不是扫描模型合集。新资产仍需编写建模函数。"
State legend exactly:
"上游已有"  "本地已实现"  "后续建议"

MODULE 01 — "资源｜74 个公开资产 · 7 类 · 6 国"
Compact category data with exact counts:
"步兵 12｜武器 14｜装备 16｜车辆 7｜装甲 15｜火炮 5｜飞机 5"
Country row:
"德国 20｜苏联 18｜美国 16｜英国 16｜日本 3｜意大利 1"
Supporting statements:
"TypeScript 资产定义、程序化几何与材质、配置项、资料卡和来源记录"
"默认展柜 280 个实例，上限 300；这是显示设置，不能当作性能承诺。"
Place actual archive screenshot Image 1 here.

MODULE 02 — "能力｜让素材可配置、可组织、可审查" with "上游已有" badge
"按国家、类别、关键词检索；查看资料与来源"
"装备、材质与姿态配置；兼容约束避免错误组合"
"数量、编队、间距、整组与单体偏移；拖动、旋转、复制"
"撤销 / 重做；本机保存布局与相机"
"六视图 + 1.80 米参照人，检查比例、外形与贴地"
Place Image 2 here; label six-view review as locally executed inspection, not a second upstream game.

MODULE 03 — "原理｜从资产协议到可见场景"
A clear connected pipeline of labeled steps:
"AssetDef 资产协议 → 配置与约束 → 几何 / 人体 → 合并与缓存 → Three.js 渲染 → 编辑与保存"
Small explanatory lines:
"机械：圆角盒、旋转体、挤出、放样与重复部件"
"人体：SDF + Surface Nets 生成网格，IK 调整姿态"
"材质：程序化噪声、三平面 PBR、边缘磨损"
"画面：光照、阴影、N8AO 环境遮蔽、SMAA 抗锯齿"
"合并减少小部件开销；最终场景并非全部 GPU 实例化"

MODULE 04 — "我们的探索①｜素材 → 营地 → 动作与声音" with "本地已实现" badge
Place Image 3 and Image 4 side by side, clearly framed.
"8 类原素材、26 个实例：2 飞机 / 5 车辆 / 2 火炮 / 17 人员"
"新增机场、道路、机库、帐篷、树木、沙袋与补给道具"
"模型配置、编队编辑、本机保存、布局 JSON 导入 / 导出"
"90 秒循环：车辆行驶、士兵巡逻、飞机滑行 → 起飞 → 巡航 → 降落"
"车轮与逐节履带转动、两段腿 IK 步态、螺旋桨、起落架与舱门"
"Web Audio 合成发动机和脚步声；暂停同时冻结动作与声音"
"可重播、倍速、拖动时间轴、跟随飞机"

MODULE 05 — "我们的探索②｜陆空协同 → 机场保卫战" with "本地已实现" badge
Place Image 5 and Image 6 side by side, clearly framed.
Two columns of concise exact content:
Left title "自由演习 · 3 分钟"
"谢尔曼 / M18 / 吉普三车切换"
"步兵交火、飞机空袭、装填与耐久"
"A* 寻路、连续碰撞、掩体与视线"
"占领通信区或击退对手；暂停同步停声"
Right title "机场保卫战 · 6 分钟 / 4 阶段"
"侦察 → 部署与补给 → 两波防守 → 恢复机场"
"两班步兵：移动 / 驻守 / 跟随"
"吉普共享视野、真实装卸 2 箱补给"
"有限弹药、阵地减伤、2 次有限空袭"
"送达物资并由步兵警戒，构成单位协作"
Supporting strip:
"规则电脑与任务状态机；轻松模式已实际通关。不是大模型指挥官。"
"研究首页已连接 5 个真实应用、8 个页面及完整笔记、截图、音频与报告。"

MODULE 06 — "使用场景｜已有原型支撑，可继续验证"
Six compact usage labels, with simple line icons:
"数字博物馆 / 军事教学"
"收藏陈列与场景规划"
"装备展示 / 产品配置器"
"通用主题场景搭建工具"
"单人游戏 / 协同任务原型"
"资产质量与比例审查"
One scope line:
"应用方向基于架构与原型判断；教学、商业和用户收益仍需验证。"

MODULE 07 — "对你的价值｜把这次探索变成下一次起点"
Three strong, concrete value statements:
"内容资产：已有军事素材与场景模板，能快速组合新关卡与展示"
"工程资产：统一资产接口、配置兼容规则、编队偏移与编辑存档"
"研究资产：来源、版本、六视图和实际运行证据，帮助判断能否复用"
Specific personalized statement:
"樱花街 / 小镇搭建器可借鉴资产接入与成组编辑，保留原有三渲二风格；尚未实际接入。"

MODULE 08 — "扩展路线｜先完善任务，再提取通用系统"
Three visually distinct sequential roadmap tiers, all "后续建议", not completed:
"近期玩法" — "伤员救援、稀缺补给、支线目标、敌方波次配置"
"通用工具" — "任务 / 关卡编辑器；独立资产协议、配置器、编队与质量审查工具"
"深入工程" — "LOD、真正 GPU 实例化、生成缓存、GLB 导出、骨骼蒙皮与物理、多人同步"
Additional line:
"性能与复用需逐项验证；在线发布尚未完成。"

MODULE 09 — "验证与边界｜让画面与结论对应"
"本地构建与实际浏览器验收已通过；机场 14 项、协同 18 项规则测试通过"
"微缩概念场景，尺寸近似；没有真实飞行物理或完整骨骼系统"
"全资产 / 全配置、真实手机、低端设备、标准模式完整通关仍待验证"

Footer provenance in legible small print:
"来源：github.com/Kenton-GMI/muster-ww2"
"固定版本：7d2fa86 · MIT · Kenton Wang"
"研究汇总：2026-10-12｜本地可运行，尚未部署"
"本图为生成式排版总览；效果窗口依据已有实际截图，原始截图另存。"

Constraints: Include all nine modules and all six actual screenshot inserts. Keep Chinese technically accurate and every number consistent. Do not add additional capabilities, fictional performance measurements, deployment URLs or unsupported "AI" abilities. No QR codes, no patriotic slogans, no dramatic combat illustration backgrounds, no generated fake screenshots, no text watermarks. Readable professional research-poster layout.
```

