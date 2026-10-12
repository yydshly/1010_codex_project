# 樱花小街觅食实验 Web

Three.js `0.180.0` + Vite `8.3.4`，中文控制台与程序化街景。实际决策由相邻 `runtime/` 内的 Python 处理，前端展示响应；没有用 JavaScript 模拟 Cadence。

## 静态研究与真实计算回放

`npm.cmd run build:public` 生成独立 `dist-public/`：`research.html`（`index.html`同页）、`replay.html`、`guide.html`、`applications.html`与`fish-ep.html`。九主题36段摘要、既有总图、12组机制和14个场景完整保留；回放直接读取原JSON，不调用`/api`。既有本机导航在发布产物中映射到相应回放，原资料字节不变。

运行 `npm.cmd run check` 和 `npm.cmd run publication:check` 校验语法、各项SHA-256、源码资源同一性和页面路径；EP数值测试与原结果来源核验在构建前执行。`scripts/sync-catalog-entry.mjs` 从同一摘要同步010登记项，之后在根执行 `npm.cmd run catalog:sync`。实时训练、手动奖励位置变化和原3D场景不随Pages发布，仍使用下面的Python服务。

## 本地成品

```powershell
# 在 web 目录
npm.cmd ci
npm.cmd run build
Set-Location ../runtime
uv sync --locked --python 3.12
uv run --locked python server.py
```

打开 `http://127.0.0.1:8190/`（研究首页与四店即时奖励）、`http://127.0.0.1:8190/guide.html`（中文理解指南）、`http://127.0.0.1:8190/route.html`（街区线索与多步奖励，`#algorithm` 为真实算法播放器）或 `http://127.0.0.1:8190/fishing.html`（捕鱼预测）。Python 同时提供 `web/dist` 和 `/api`。需要 Node ≥22.12、Python ≥3.12；建议按实测使用 Python 3.12。无环境变量或外部 API Key。构建前生成路线与捕鱼实测表，校验各运行源文件哈希，并生成完整研究资源目录。

## 开发

先在 `runtime/` 启动 Python 服务，再在另一个终端：

```powershell
# web 目录
npm.cmd run dev
```

开发地址 `http://127.0.0.1:5190/`，Vite 把 `/api` 代理到 `8190`。`npm.cmd run preview` 使用 `5191`，也需要 Python 服务。修改 Markdown 下载内容后须重新构建；生产模式修改代码后重新构建并刷新页面。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `src/street.js` | 四家店、樱花、食物光圈、三位 NPC 及行动表现 |
| `src/main.js` | 顺序 API 请求、实验控制、真实历史曲线与下载 |
| `route.html`、`src/route-main.js` | 新场景条件、真实分步行动/等待、单线索迁移、分类成绩及完整记录导出 |
| `src/algorithm-player.js`、`src/algorithm-style.css` | 最近 96 个真实算法帧的单步播放、自由／扰动态、资格热图、连接前后值、工作轨迹及基线结算 |
| `scripts/sync-route-results.mjs` | 从离线结果生成 `src/route-results.json`，强制匹配运行代码 SHA256 |
| `src/rendering/` | 从 001 项目复用的上游 MIT 渲染片段 |
| `src/style.css`、`src/route-style.css` | 中文界面、窄屏堆叠、六条件表与减少动态效果支持 |
| `fishing.html`、`src/fishing-main.js`、`src/fishing-style.css` | Canvas2D 捕鱼历史/预测/实际轨迹、真实训练控制、射击与单步回放、两种条件及四种子结果 |
| `scripts/sync-fish-results.mjs` | 从完整捕鱼评估生成 `src/fish-results.json`，校验实验与评估源码 SHA256 |
| `guide.html`、`src/guide-main.js`、`src/guide-style.css` | 13 章中文理解指南、EP 教学分步、无人机输入条件与术语检索；概念交互不发模型请求 |
| `fish-ep.html`、`src/fish-ep-main.js`、`src/fish-ep-style.css` | 一条真实训练鱼的 8 步数字播放器，逐项跟踪自由态、正负扰动、局部量、参数更新与无答案重算；支持查看全部 288 项参数 |
| `scripts/check-ep-sample.mjs` | 核对单样本记录与运行源码 SHA256，拒绝把过期计算接入网页 |
| `src/fish-ep-explainer.js` | 九章固定样本数字汇总：符号、扰动、状态求解、七次局部导数、梯度、独立权重复算与真正更新；读取同一真实记录 |
| `src/fish-ep-contrast-animation.js`、`.css` | 同一条鱼的八幕教学动画、播放／暂停／重播、响应式 SVG；说明各自除回 β 后取平均的意义 |
| `src/fish-ep-contrast-model.js`、`scripts/fish-ep-animation.test.mjs` | 从原记录整理固定 C[2,0] 数字，独立检查教学输出、局部误差联系、有符号系数平均及权重／损失方向 |
| `src/fish-ep-beta-bridge.js` | 第⑤幕七小步：平方展开、输出平衡、内部差、局部导数、β 因子分解、两个近似与七刻求和；所有算术使用原真实端点 |
| `src/hub.js`、`src/hub-style.css` | 首页全部演示、章节入口、实测汇总与共享导航／资料样式 |
| `src/resources.js`、`scripts/sync-resources.mjs` | 原文件资源目录、SHA256、类型与关键词筛选、原文查看和下载；大数据按需读取 |
| `vite.config.js` | 六 HTML 构建入口、相对资源路径与本地 API 代理 |

在 1× 下每次行走对应一次行动；8× / 32× 每批只动画最后一次行动。曲线始终保留完整历史。各控制器使用各自环境副本，食物位置不会直接传给控制器。

新场景速度单位为环境时刻，8× 相当于两趟一批；只有抵达才增长完成趟数与曲线。最近 30 趟总体命中率与每类路牌最近 20 次成绩分开显示。公开观察由实际位置和线索生成，目标光圈只给观众看；线索与反馈条件切换会新建会话，搬家保留学习。

`route.html#algorithm` 提供独立的算法帧播放器。已记录帧前后回看不发 API 请求；到最新帧才请求一个新的环境时刻，再逐帧展开。它与整体加速播放互斥。切换自由态、+β、−β 查看真实保存状态；热图展示 C、E 或 Δw，点击格子／输入编号检查连接并标出两端。参数更新使用 Python 返回的真实前后数组，不由前端模拟。详细数据来源、窗口与验证见 [算法可视化说明](../notes/algorithm-visualization.md)。

## 当前边界

首页资料库默认显示研究笔记，可选择全部／实验数据／项目说明／代码与配置／截图／许可证。构建生成 `public/research/` 与 `src/research-resources.json`，两者被忽略、不作为手工维护源；修改笔记、运行源码或截图后需要重新构建。原文预览通过 textContent 显示，不执行资源 HTML 或代码。指南中的 EP 与无人机说明没有网络训练调用；真实捕鱼 EP 过程请进入 `fish-ep.html#ep-player`，NPC 的动作、资格迹与延迟奖励过程仍在街区算法播放器。

捕鱼 EP 页读取固定的一次真实 `observe()` 记录，不调用或重置在线捕鱼会话。8 步按顺序展示历史输入、自由态、训练答案与误差、正扰动、负扰动、局部量对比、参数更新及不传答案的重算。预测截止点、未来时长、x/y 和神经元均可切换；可展开全部输入、状态、输出、288 项参数和下载完整 JSON。Newton 活动步由原参数快照只读重算并核对实际终态；它与学习率控制的参数更新分开显示。

`fish-ep.html#ep-understanding` 新增九章讨论汇总：符号、正负扰动操作、Newton 活动求解、七时刻局部导数、相减理由、独立权重核验、真正更新、能力与用法、十个常见疑问。沿用固定 C[2,0] 样本，不随上方选择器改变；六个“回到”按钮恢复默认样本并切至对应步骤。四次仅改一个权重的真实 Python 复算与完整更新并列展示，中心差、解析梯度和 EP 梯度相互核对。首页、指南和捕鱼页均有直达入口；研究笔记与完整记录可下载。

`fish-ep.html#ep-contrast-animation` 提供独立八幕动画，重点是“g 如何包含预测差”与“两个有符号 β 还原后的估计取平均”。控制只回看当前固定记录；图形插值不是求解器轨迹，不产生新训练结果。正负响应使用局部放大，局部导数使用 10⁻⁶ 单位；SVG 按实际容器宽度重绘。自动逐幕在 10 s 或重点幕 14 s 后推进，到第八幕停止；支持暂停、上一／下一幕与重播，减少动态效果偏好会取消图形运动。与原数字播放器的自动播放互斥。七项数值测试可单独执行 `npm.cmd run test:ep-animation`，生产构建也会执行。

`#ep-beta-bridge` 直达⑤.1；第⑤幕含七个小步骤，每小步 14 s。上一／下一按钮优先在小步间移动，⑤.7 再前进才进入⑥；从⑥后退回到⑤.7。七个按钮可直接点选小步；重播保持当前小步。控制栏在推导中保持可见，阅读长公式时可直接前进。⑤.1 从平方展开解释 Gₜ；⑤.2 至⑤.5 保留等式；⑤.6 展示 N/(N+β) 接近 1、教学态乘积接近自由态这两项近似与 0.0223445% 数值差；⑤.7 才求和得到 G。C 的推导依赖自由隐藏活动不依赖 C，A/B 仍需一般 EP 推导。

捕鱼页每批真实训练 8 次，训练与回放分开。一次预测读取历史前缀，输出 12 个未来点；绘图和实际鱼轨迹不修改预测。默认未来回放放慢 4 倍，可暂停、单步、换鱼。评估固定 48 条留出鱼，参数冻结；完整轨迹可导出，不支持导入恢复。捕鱼页独立包约 27 kB，不加载街景 Three.js。

接口出错时展示实际错误，不补造行动。单服务最多保留 16 个会话，较早会话可能被回收；同一会话请求顺序处理。刷新新建实验，未实现导入续跑。

此版本依赖持续运行的 Python 服务，单独把静态构建发布到 GitHub Pages 不能运行真实 Cadence。公开托管尚未实施；需要同时规划后端、会话隔离和资源限制，再遵循 [部署约定](../../../docs/web-deployment.md)。

已通过五 HTML 入口生产构建及实际浏览器操作。汇总首页、中文指南、街区、捕鱼与 EP 数字页均检查了 390×844 浏览器视口，页面无横向溢出；研究首页与理解指南见原验证记录，EP 八步、29 个选择项、288 行参数和下载哈希见 [捕鱼验证记录](../notes/fish-verification.md)。共享 Three.js/街景包约 527 kB，Vite 有体积提示；真实手机与低性能硬件尚未验证。

九章汇总额外实际检查了全部章节链接、六个回到播放器按钮、十个问答和三个进阶折叠说明，以及首页／指南／捕鱼的跨页入口。1280×720 和 390×844 断点均无整页横向溢出；窄屏数字表在容器内滚动。修正共享说明入口的行内换行点击区域后重新构建，实际点击确认可达。

八幕动画实际检查 1280×900、390×844、320×844 三个断点的全部阶段；各图的文字均未超出 SVG，页面没有横向溢出。播放、暂停、逐幕、重播、七次贡献展开和两个播放器自动播放互斥已操作验证，见 [捕鱼验证记录](../notes/fish-verification.md)。动画图形和数字都可在暂停时检查；目前没有旁白、视频导出或新的求解器中间帧。

[返回项目说明](../README.md) · [验证记录](../notes/verification.md) · [来源清单](../THIRD_PARTY.md)

## 能力与业务地图

`applications.html` / `src/applications-main.js` / `src/applications-style.css` 为九章详细地图；`src/capabilities-data.js` 保存 12 组机制、14 个场景和证据分级的共享内容。`scripts/sync-capabilities.mjs` 在 prebuild 检查内容 ID、机制引用和必要字段，并生成 `../notes/capabilities-scenarios.md`；随后资料脚本复制原文及 SHA256。

场景可按任务筛选、全文关键词检索、逐步切换五步闭环并展开全部设计；`#scene-drone` 等场景锚点会自动恢复选择并展开对应说明。交互不发 API、不训练模型，不输出模拟的业务成绩。新页已加入首页、指南、街区、捕鱼与 EP 导航，原五页仍保留。详情验证记录见 `../notes/capabilities-verification.md`。

## 中文研究总图

`applications.html#research-map` 展示 `assets/cadence-understanding-map.png`，并提供高清原图、可点击截图的 SVG 与来源说明；首页有独立入口。`scripts/build-understanding-map.py` 使用 Pillow 和中文字体生成同一张图的两种格式；不发模型请求，独立于普通 Web build。修改冻结证据或排版后先执行生成器，再运行网页构建。`notes/understanding-map-source.json` 保留截图裁取、源文件与输出哈希；资料库新增“图解”分类。
