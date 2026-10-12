# 011 · 网页发布与验收

日期：2026-10-12。用户明确要求整理理解到网页、部署并提交远端。本轮沿用既有 GitHub Pages 站点，目标路径为 `011-segment-snap/research.html`；原观察台保留在同目录 `index.html`。

## 公开内容

九主题36段完整理解、11组职责模块、三模型与几何规则、作者指标和实际截图、训练与推理区别、应用及个人项目价值、五阶段扩展。使用已有 `research-overview.png` / `.svg` 作为引导，不重新生成或修改图像。原页面交互、来源、许可证、研究笔记与原始记录保留；13份资料原样打包，可页内阅读或下载。

公开内容是静态研究与原创原理示意；没有部署上游 GPU 模型、数据上传或机器人控制。跨项目动作接口和 NPC 开门取物属于规划，未接入。作者原始媒体仍外部引用，已保存截图及总图中的作者内容继续保留原归属。

## 构建流程

在 `web/` 执行：

```powershell
npm.cmd run research:sync
npm.cmd run check
npm.cmd run build
npm.cmd run publication:check
```

在根目录执行 `npm.cmd run catalog:sync`、`npm.cmd run check` 和 `npm.cmd run site:assemble`。GitHub Actions 使用同样的子项目检查；CI不下载模型、不训练、不生成引导图。

构建采用逐文件白名单与 SHA-256 清单，保护引导图、原文和资源完整性。部署状态、正式 HTTPS 以及逐文件验收通过后，才把实际地址登记到 `projects.json`。历史图稿与笔记中的未部署保留制作时状态。

## 当前验收

首次内容版本 [`d141f0e`](https://github.com/yydshly/1010_codex_project/commit/d141f0e6dab3f76c3736c042f92c2936cc52d58b) 已推送 main；[GitHub Actions 38268786874](https://github.com/yydshly/1010_codex_project/actions/runs/38268786874) 的 build 与 deploy 均成功。正式入口为 [完整研究](https://yydshly.github.io/1010_codex_project/011-segment-snap/research.html) 和 [原观察台](https://yydshly.github.io/1010_codex_project/011-segment-snap/index.html)。验收后登记状态为 `demo-ready`，演示地址指向完整研究。

32项公开文件的 HTTP 200、字节大小和 SHA-256 与发布清单全部一致；包含原 PNG/SVG、13份资料、双页代码及发布清单。既有总图的 PNG SHA-256 为 `51851e5dd02140a973f5095956c03b0c99e5926ee9088741b56328d2e3a11106`，SVG 为 `c63ca99da1611df5b885292376ad36815126f2396f638c44710c9b8a6873f912`，均未改写。初次线上核对发现原观察台样式有一处换行字节差异，已统一本项目样式换行后重新构建并通过；上游图、引导图与原始证据未改动。站点首页及12个实际发布项目入口均返回 HTTP 200，首页含011入口。

正式网页实际浏览器验证：九主题36段与11模块、总图载入和缩放、全部收起和展开、关键词检索与清空恢复、完整摘要页内阅读（6,216字符且包含末尾内容）；390 × 844视口无页面横向溢出。原观察台验证左把手选择右侧铰链、柜门展示到90°、关闭引导及无把手的中心回退、抽屉展示到60 cm、复位；观察台无捕获到的控制台错误。截图见 `assets/publication-desktop.jpg`、`publication-mobile.jpg` 和 `publication-lab.jpg`。

结构化记录见 [publication-verification.json](publication-verification.json)、[publication-http.json](publication-http.json) 与 [publication-routes.json](publication-routes.json)。记录分别保存首轮验收与最终发布文件检查的时间、版本和范围；不把记录提交版本自动当作部署版本。

窄屏为浏览器视口验证，未测试真实手机。浏览器原生下载辅助操作超时，未据此宣称下载保存成功；同一公开下载资源的HTTP、完整大小和哈希已核验。原作者外部媒体不是静态文件完整性清单的一部分，继续保留原站入口。没有下载或运行上游模型，也没有跨项目动作接入与机器人执行。
