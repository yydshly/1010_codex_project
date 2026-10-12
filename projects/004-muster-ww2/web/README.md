# 004 · Muster 本地研究与体验网页

从 [Kenton-GMI/muster-ww2](https://github.com/Kenton-GMI/muster-ww2) 的固定 commit `7d2fa86ebc3b999eaf085831cdcd5dccefea63d4` 引入。保留上游程序化模型、展柜界面与模型审查工具，修复 TypeScript 构建错误，增加浏览器验收脚本与相对资源路径。

这是本地可运行的上游衍生演示。默认首页为中文研究与体验总入口；“1944 野战机场与集结营地”保留为 `camp.html`，原版英文展柜移至 `archive.html`；机场保卫战任务为 `airport.html`，协同自由演习为 `battle.html`。中文能力分析、操作说明与实测结果位于项目 README 和 `../notes/`；本次加入完整静态发布，线上状态见 `../notes/publication-verification.json`。

## 安装与启动

需要 Node.js 22.12 或更新版本、支持 WebGL 2 的桌面浏览器。本轮使用 Node.js 22.15.0、npm 10.9.2。运行时无服务端 API、账号、密钥或环境变量要求。

从研究集根目录执行：

```powershell
cd projects/004-muster-ww2/web
npm.cmd ci
npm.cmd run dev
```

打开 `http://127.0.0.1:5199/` 进入研究首页，`/camp.html` 进入营地，`http://127.0.0.1:5199/archive.html` 进入原版展柜。首次进入会用代码实际构建模型，需等待准备完成。营地预设有 26 个模型，原版默认展台有 280 个模型并在后台生成缩略图；加载时间依电脑与浏览器而变。

生产构建与预览：

```powershell
npm.cmd run build
npm.cmd run preview
```

打开 `http://127.0.0.1:5198/`。两种服务器都只监听本机，端口被占用时会明确报错。保持相应终端运行；结束时按 Ctrl+C。不能双击 `dist/index.html` 代替 HTTP 服务。

## 中文操作指引

### 研究首页与完整资料

首页有第一次访问路线、六问理解、五个真实体验、截图对照、实际声音采样、原理、应用与扩展路线。`research.html`提供全文阅读器和目录搜索；`evidence.html`提供全部截图、阶段过滤、原始JSON报告和下载。资料与图片的相对引用会映射到网页，不要求浏览器访问项目目录外的文件。

每次只加载一个内嵌应用，切换会重新开始；可独立打开或全屏使用。启动演示后首页按钮可暂停 / 继续，滚离体验区或切到后台也会暂停，返回后手动继续。声音跟随同一暂停链路。营地和展柜的浏览器布局仍独立保存。

```powershell
npm.cmd run research:sync
npm.cmd run verify:hub
npm.cmd run verify:hub -- --prefix --light
```

`dev`与`build`自动执行同步，无需单独运行第一条。生成的`public/research/`已忽略，由项目README、notes、assets、上游docs/briefs、共享人体说明和许可证重建；不扫描依赖或临时产物。清单含来源路径、文件大小、SHA-256、阶段和报告原始状态。浏览器原文面板显示完整文字，下载文件保留原始字节。自带安全Markdown子集阅读器，原文HTML不执行；Mermaid原文以代码保留，首页提供可视数据流。

完整验收覆盖五个内嵌应用；`--prefix --light`在计划子目录挂载生产文件，复验入口、资料、全文、录音与窄屏，不重复生成3D模型。报告分别保存为`../notes/research-hub-browser-results.json`与`../notes/research-hub-subpath-results.json`。

`--light`也可以单独运行，复验网页资料并更新首页、正文与图库截图；另存为`../notes/research-hub-content-results.json`，保留完整内嵌验收报告。新增截图或报告后再次构建，资料包就会纳入这些新文件。

### 野战营地（camp.html）

1. 左侧选择全景、停机、装甲、人员、炮位，镜头与选中模型组同步切换；镜头导览每 8.5 秒切换分区，可随时暂停，操作画布也会停止导览。
2. 点击模型选组，再点选中组可选单体；拖动模型移动，双击聚焦。右侧下拉框也能选组。
3. 右侧编辑数量、队形、间距和转向；装备控件会调用原版模型的约束、构建、缓存与场景同步流程。为保持紧凑演示，飞机数量上限为 2，普通模型组为 4，步兵班为 20；完整资产上限可在原展柜使用。
4. Q / E 转动当前选组或单体，F 聚焦，Ctrl+Z 撤销、Ctrl+Shift+Z 重做。控件输入时不会拦截快捷键。
5. 切换晴日 / 傍晚光线，俯视场地，收起画面说明。滑块放开后提交一次编辑。
6. 浏览器以 `muster.fieldcamp.v1` 保存布局与镜头，与原版 `muster.display.v3-grand-review` 分开。刷新恢复；光线与导览播放状态不会保存。
7. 导出 JSON、恢复初始布置、撤销、导入 JSON 都可实际使用。导入在临时 Store 中校验并预先构建，再替换当前布局；仅接受此营地导出的格式，最多 60 个模型。环境构件固定，布局文件只包含模型与相机。
8. 点击画布上方“开始动态演示”：车辆沿道路循环、士兵巡逻，一架 P-51D 完成 90 秒起降循环。再次点击或按空格暂停 / 继续；拖动时间轴会暂停在指定阶段。可重播、切换 0.5× / 1× / 2×，勾选“跟随飞机”。切到后台时自动暂停，返回后手动继续。
9. 动态演示期间可查看镜头，模型编辑暂时锁定；点击“返回布置”恢复所有模型的编辑位置和朝向。播放状态、时间和动态坐标不会写入布局，刷新后进入静态编辑模式。导出始终保存编辑布局。

声音从首次点击开始启用，可勾选 / 取消“发动机 / 脚步声”并调节音量。暂停、拖动时间轴、切到后台或返回布置都会一起停声，继续后恢复；脚步随落脚发声，发动机随距离衰减。

本地新增环境和动作是微缩展示：车辆沿预定路径移动，车轮按路程转动、履带逐节循环；士兵有支撑期、抬脚、弯膝和轻微上身摆动；飞机按分段轨迹改变高度、俯仰和侧倾，现有桨叶旋转，27–31 秒收起、51–55 秒放下起落架。营地演示的音效由 Web Audio 合成，演示尚无碰撞、真实飞行或驾驶物理；新增 92 米示意跑道的长度不代表 P-51D 真实起降需求。移动端只有响应式布局与桌面浏览器窄屏验证，未作真实手机性能承诺。

### 机场保卫战（airport.html）

新增完整任务入口为 `http://127.0.0.1:5198/airport.html`（开发端口5199）：吉普侦察 → 小队部署与首箱机场补给 → 两波防守 → 第二箱补给与步兵警戒恢复运行。6分钟任务限时，使用同一套模型和声音。下述 `/battle.html` 保留原自由演习。

机场任务额外操作：**4 / 5 选小队，右键 / G 移动，H 驻守，J 跟随当前车辆，E 装卸补给**。面板「移动」按钮先点击，再点地面下令；「部署路口 / 北侧」直接给对应班下达移动命令，「警戒机场」派当前选中班前往HQ。吉普在D补给站停车装2箱，HQ或蓝色阵地停车卸1箱，恢复12米内存活友军的耐久与弹药。主炮18发、步枪30发，只有补给能补弹。空袭在部署完成后开放，限2次且需要友军当前视野；F冷却仍为24秒。任务、弹药、侦察和声音随P暂停。完整规则见 [机场任务说明](../notes/airport-defense.md)。

```powershell
npm.cmd run test:airport
npm.cmd run verify:airport
npm.cmd run verify:airport -- --mobile-only
```

报告为 `../notes/airport-unit-results.json` 与 `../notes/airport-browser-results.json`。浏览器脚本通过真实键鼠完成侦察、装卸、下令和整局战斗；仅使用只读状态做断言。

### 协同自由演习（battle.html）

打开 `http://127.0.0.1:5198/battle.html`（开发端口5199）。等待模型构建，选择轻松 / 标准，点击「进入演习」。现在是三辆可接管车辆、蓝队4名步兵、红队3辆 M18 与6名步兵的协同演习；双方 P-51 会执行空袭。

| 操作 | 效果 |
| --- | --- |
| WASD | 前进 / 倒车、转动车体 |
| 鼠标，左键 / 空格 | 独立炮塔瞄准、持续射击 |
| 1 / 2 / 3，或底部车辆卡 | 接管谢尔曼 / M18 / Willys，位置、血量和装填各自保留 |
| F，或「空袭」按钮 | 以当前鼠标地面落点呼叫 P-51；约5秒落弹，24秒全队共享冷却 |
| P / Esc | 暂停 / 继续，飞机、步兵、炸弹和声音一起冻结 |
| C，滚轮 | 俯瞰 / 跟随、缩放 |

谢尔曼耐久较高，M18机动更快、主炮伤害更高但较脆，吉普最快但无武装，适合绕行侦察和呼叫空袭。未接管的友军装甲车原地自主掩护；当前车失效会自动接管幸存车辆。步兵自主选择目标、交火、移动并阻止对方占领，步枪对装甲只产生少量伤害。红队空袭会提前显示红圈，落点锁定后可驶离避让。

3分钟内击退红队全部3辆装甲与6名步兵，或驾驶当前车辆在无对手争夺的 A 区占领20秒获胜；蓝队3辆车均失效或超时失败。掩体阻挡车辆、枪弹与爆炸碎片，空袭经过掩体衰减；这场演习关闭友军伤害。

所有发动机、脚步、枪炮与爆炸经过同一声音控制；暂停、切到后台或窗口失焦一起停声。重开清空空袭、战果与计时。窄屏可点车辆卡切换、用方向 / 开火按钮，点地面确定落点后按「空袭」。当前为浏览器内单人对规则电脑，未接入联网对战。

```powershell
npm.cmd run test:battle
npm.cmd run verify:battle
npm.cmd run verify:battle -- --mobile-only
npm.cmd run verify:subpath -- --report ../notes/combined-arms-subpath-results.json
```

当前验收对应 [协同玩法记录](../notes/combined-arms.md)。[初版装甲演习记录](../notes/battle-game.md) 与 `*-armour-baseline.mjs` / 旧占领脚本保留历史证据，适用于增强前的规则；当前命令以本节为准。

### 原版展柜（archive.html）

1. 左侧 Library 可按国家、类别和关键词筛选；筛选只影响清单，已摆放的模型保持原样。
2. 卡片的 Details 显示参数、建模来源和简化说明。Add to Ground 后，在展台上点击放置；Q/E 旋转预览，Esc 取消。
3. 点击模型选中一组，再次点击可选中组内单个模型；拖动改变位置。
4. 右侧 Equipment 修改当前资产提供的配置。Quantity 设置数量，Formation 选择 Single / Line / Grid；Spacing 和 Columns 控制间距、列数。
5. Duplicate 复制，Remove 删除，Focus Selection 聚焦，Reset Layout 清除单个模型的手工偏移。左键环绕镜头、右键平移、滚轮缩放。
6. Ctrl+Z 撤销，Ctrl+Shift+Z 重做，Q/E 旋转，Ctrl+D 复制，Delete 删除，F 聚焦，H 隐藏或显示界面。
7. 布局和镜头自动存入当前来源的浏览器 `localStorage`，刷新恢复。端口、浏览器或域名不同会使用不同存储；没有云同步。Demo Display 恢复默认大展台，Clear Ground 清空，均可撤销。

公开条目为 74，展台总上限为 300；每种资产还有独立的组数量上限。数量上限是应用约束，不代表所有设备在该数量下都能流畅显示。

## 浏览器验收

先启动上面的生产预览，在另一个终端进入同一 `web/` 目录：

```powershell
npm.cmd run verify
```

脚本使用本机 Edge 或 Chrome 的独立临时配置，验证目录、默认展台、搜索、鼠标选中、配置、数量、编队、撤销重做、拖动、旋转、复制、删除和刷新恢复。默认报告及截图放入被忽略的 `.snaps/`，不会改变日常浏览器的布局。找不到浏览器时可把 `BROWSER_PATH` 指向其可执行文件；这是工具设置，应用本身不需要环境变量。

本轮验收材料的生成命令：

```powershell
npm.cmd run verify -- --screenshots ../assets --report ../notes/verification-results.json
```

检查开发服务器时增加 `--base http://127.0.0.1:5199`。实际记录见 [实验记录](../notes/experiment.md)，不能用测试脚本存在来替代测试通过。

营地验收另执行：

```powershell
npm.cmd run verify:camp
npm.cmd run verify:motion
npm.cmd run verify:realism
```

测试完整 UI → 模型配置 / 编队 → 实际渲染 → 导出 / 导入 → localStorage → 刷新恢复，截图写入 `../assets/fieldcamp-*.png`，报告写入 `../notes/fieldcamp-results.json`。使用独立浏览器；当前原版验收 `verify` 和 `snap --app` 自动进入 `archive.html`。详见 [营地实验记录](../notes/fieldcamp.md)。

`verify:motion` 通过真实控件验证位移、转向、统一暂停与继续、起降阶段、跟随镜头、倍速、循环接缝、重播、编辑布局恢复、刷新和窄屏控制。动作报告写入 `../notes/fieldcamp-motion-results.json`，实际截图为 `fieldcamp-motion-*.png`。详见 [动作实验记录](../notes/fieldcamp-motion.md)。

`verify:realism` 检查实际车轮四元数、逐节履带实例矩阵、起落架 / 舱门姿态、支撑脚相对速度、音频采样与暂停时钟、音量开关、后台自动暂停、退出恢复和窄屏控制。生产截图、实际输出的 WAV 音频与报告见 [动作与声音增强记录](../notes/fieldcamp-realism.md)。

## 模型审查截图

保持开发或预览服务器运行。例如在生产预览上生成带 1.80 米比例人物的六视图：

```powershell
node scripts/snap.mjs germany/panzer-iv-h --base http://127.0.0.1:5198 --ref --w 1600 --h 1000 --out ../assets/panzer-fitted.png
node scripts/snap.mjs germany/panzer-iv-h --base http://127.0.0.1:5198 --config '{"schuerzen":"removed"}' --ref --w 1600 --h 1000 --out ../assets/panzer-removed.png
```

工具输出三角形数、合并后的材质绘制数量、包围盒、最低点、生成与合并耗时。耗时仅属于该次浏览器运行，没有进行重复统计或硬件基准。

直接访问审查器：`http://127.0.0.1:5198/harness.html?asset=germany/panzer-iv-h&ref=1`。新增资产前阅读 [上游建模规范](docs/ASSET_GUIDE.md) 和 [资产来源记录](docs/PROVENANCE.md)。来源记录由资产元数据生成：

```powershell
node scripts/provenance.mjs --base http://127.0.0.1:5198
```

## 目录与变更

- `src/core/`：几何、SDF、材质、模型合并、资产注册、摄影棚渲染。
- `src/assets/`：模型与资料，`*.asset.ts` 自动注册；包含隐藏的内部审查资产。
- `src/app/`：编辑状态、编队、交互、缩略图、界面和默认展台。
- `src/showcase/`：本地新增营地编排、环境与中文交互；复用原版 Catalog / Store / Actions / SceneController / Interaction。
- `archive.html`：原版展柜入口，`index.html` 为研究与体验总入口，营地为 `camp.html`。
- `src/harness/`、`harness.html`：单模型多视图审查。
- `scripts/verify.mjs`：本地新增的生产页面验收。
- `UPSTREAM_README.md`：引入时的上游 README 原文，数值可能滞后。
- `THIRD_PARTY.md`、`LICENSE`：来源、授权与本地改动。

Vite 的 `base: './'` 使构建资源使用相对路径，为子目录托管准备。执行 `npm.cmd run verify:subpath` 会把 `dist/` 临时挂载到本机随机端口的计划子目录，实际检查资源和模型，完成后关闭服务器。实际结果见实验记录；没有配置或执行线上部署，登记表 `demo` 仍为 `null`。

[返回项目说明](../README.md)



