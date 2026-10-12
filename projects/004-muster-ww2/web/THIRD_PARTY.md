# 上游来源、授权与本地改动

## 来源

- 上游：[Kenton-GMI/muster-ww2](https://github.com/Kenton-GMI/muster-ww2)
- 固定 commit：[`7d2fa86ebc3b999eaf085831cdcd5dccefea63d4`](https://github.com/Kenton-GMI/muster-ww2/tree/7d2fa86ebc3b999eaf085831cdcd5dccefea63d4)
- commit 日期：2026-09-23；该版本未使用 tag。
- 初次研究：2026-10-10；引入、修复和整理：2026-10-11。
- 源码通过固定 commit 的 `git archive` 导出，没有引入上游 `.git`、依赖目录或历史构建产物。

## 授权

上游源码为 MIT，版权 `Copyright (c) 2026 Kenton Wang`。完整许可证保留在 [LICENSE](LICENSE)。模型及表面纹理由项目代码生成；各资产的 `provenance` 保留尺寸、外观和历史事实的参考来源与简化说明，见 [来源记录](docs/PROVENANCE.md)。这些模型属于展示与学习材料，不作为工程精度或史实完整性的保证。

依赖由本子项目的 `package.json` 和锁文件独立管理。Three.js、Vite 为 MIT，TypeScript 与 Puppeteer 为 Apache-2.0；Inter 字体为 OFL-1.1，不能把字体授权归为上游 MIT。依赖包内保留各自声明；前端运行依赖的许可证另收录于 `licenses/`。

本轮安装的 n8ao 2.0.1 存在声明差异：包的 `package.json` 写 ISC，随包 `LICENSE` 文件为 CC0 1.0。两份原文分别保留为 `licenses/n8ao-package.json` 与 `licenses/n8ao-LICENSE.txt`，这里不把它统一写成 MIT，也不自行解释该差异。

## 本地改动

1. `src/assets/japan/ha-go/hull.ts`：将 `armour(P: Pal, ...)` 内坐标辅助函数的同名 `P` 改为 `bayPoint`，并更新调用。保留原函数计算与材质引用，消除 TS2300 和随后发生的 TS2349。
2. `vite.config.ts`：相对资源路径；开发端口 5199、预览端口 5198，均仅监听本机且使用严格端口。
3. `scripts/verify.mjs` 和 `package.json`：新增真实浏览器验收与截图记录命令，不增加依赖。
4. `scripts/provenance.mjs`：新增 `--base`，支持从生产预览读取资产元数据；按脚本重新生成 `docs/PROVENANCE.md`。
5. 上游 README 保存为 `UPSTREAM_README.md`；中文说明、研究笔记和本轮实际截图由本地新增。
6. `src/showcase/`：本地原创的野战营地布局、环境构件与中文界面，复用原有美军素材、模型缓存、米制编队、场景渲染、交互和编辑历史；没有引入外部网格或图片材质。
7. 早期默认 `index.html` 切换为营地；研究汇总增量后首页改为研究总入口，营地保留为 `camp.html`，原版入口继续为 `archive.html`。构建保留所有入口，相关验收指向独立营地路径。
8. `src/app/store.ts`：增加可选保存键参数，默认键与原版行为保持兼容；营地使用独立保存键。`scripts/verify-camp.mjs` 新增真实 UI 与导入导出、刷新恢复验收。
9. `src/showcase/motion.ts`：新增统一时钟、车辆路径、巡逻顶点步态、P-51D 桨叶旋转与起降轨迹；动作只控制渲染实例，不修改保存布局；后续为上游机械构建函数补充可动部件标记。环境增加示意跑道和与动作共用的道路曲线。
10. `src/app/scene.ts` 提供可选动画回调和渲染实例接口；`interaction.ts` 提供编辑开关，`camera.ts` 提供可扩展的镜头目标范围，默认原版行为保持兼容。`scripts/verify-motion.mjs` 新增动作、暂停、恢复与实景截图验收。

11. `src/showcase/rig.ts` 与 Willys、M4A3、M18、P-51D 的构建辅助源码：增加 `campMotion` 关节标记，演示时独立烘焙车轮、逐节实例化履带、起落架与舱门，普通展柜保持整体合并。`motion.ts` 增加支撑 / 摆动两段腿 IK、法线修正和连续滚动路程。
12. `src/showcase/audio.ts`：Web Audio 发动机与碎石脚步合成、空间距离衰减、静音 / 音量、暂停音频上下文和清理。`scripts/verify-realism.mjs` 新增真实 UI、关节与音频采样验收，并录制应用实际输出的 WAV；没有引入外部声音素材或新依赖。

13. `src/battle/` 与 `battle.html`：本地原创装甲对战规则、A* 网格寻路、连续弹丸碰撞、红蓝目标、界面与特效，复用已有谢尔曼 / M18 / P-51D、机械关节与 Studio 渲染；为两个战车的资产构建函数增加炮塔标记，`rig.ts` 提供独立炮塔转向与炮口坐标。`audio.ts` 增加同一音频链路的炮声、撞击与爆破合成。新增规则与真实浏览器战局 / 占领验收，无新依赖。

已增加本地路径动画、程序化步态与独立战斗规则，没有增加新的军事装备模型或云端保存。步态不是上游已有的完整骨骼动画，起降不是飞行物理模拟。Ha-Go 的辅助源码参与 TypeScript 检查，但这个版本没有对应公开的 `.asset.ts` 入口；修复构建不等同于完成一个可选的 Ha-Go 模型。

本地修改与验证记录见 [构建修复说明](../notes/build-fix.md)、[初次实验记录](../notes/experiment.md) 和 [营地场景实验](../notes/fieldcamp.md) 和 [对战开发记录](../notes/battle-game.md)。

14. 协同对战增量：`src/battle/` 新增步兵行为、连续步枪弹道、不同车辆属性和驾驶席接管、预警空袭/重力炸弹/范围伤害；使用已有 Willys、美军步兵和 P-51D，没有引入外部网格。`shared/human/poses.ts`、`usa/infantry/soldier.ts` 增加本地持枪瞄准姿态，仍由上游人体与双臂 IK 构建，保留原默认姿态；`showcase/motion.ts` 提供复用独立动作 uniforms，`audio.ts` 增加步枪合成音。没有新依赖。当前记录见 [协同玩法开发与验收](../notes/combined-arms.md)。

15. 机场任务增量：airport.html 与 src/battle/airport.ts 新增本地原创的小队命令、共享视野、吉普装卸补给、有限弹药、两波进攻与四阶段结算；现有模型、动画和声音继续复用。新增机场标记、货箱与中文界面，保留自由演习入口。无新依赖、外部网格或录音；记录见 [机场保卫战](../notes/airport-defense.md)。

16. 网页研究汇总增量：src/hub/、research.html、evidence.html 和 scripts/sync-research.mjs 为本地原创界面、资料包与安全Markdown子集阅读器，沿用现有字体。首页嵌入既有应用，camp.html保留营地；同源父页面仅能暂停、恢复和读取状态。所有源文档、图片、录音及JSON按目录自动复制，清单保留SHA-256。展柜品牌和六视图导航可返回首页，六视图画布增加响应式尺寸。新增scripts/verify-hub.mjs真实入口、全文、媒体、内嵌交互与窄屏验收，无新增依赖或外部素材。

18. 2026-10-12 发布整理：新增九维完整摘要、首页总图引导、便携发布校验和 GitHub Pages 构建接入。锁文件将构建依赖 source-map-js 更新到 1.2.2；本次 `npm audit` 返回 0 项。总图 PNG/SVG 保持原始文件，未重新生成。
