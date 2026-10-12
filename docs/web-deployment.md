# Web 部署与发布范围

## 2026-10-12 · 014 print-bench 研究发布接入

014以既有总图引导，提供九主题31段完整摘要、九组固定源码模块、六步执行分工、Issue #398 / PR #424 与本机孔洞复现、对话比较、场景判断、现有项目用途和Codex扩展。23项原始资料可读可下载；图稿和原文件完整保留，39项静态资源逐文件SHA-256登记。

在014的web目录运行 `npm run research:sync`、`npm run check`、`npm run build` 与 `npm run publication:check`；根运行 `npm run catalog:sync`、`npm run check`。Pages工作流增加014构建和路径，根组装器保留既有发布内容。固定路径 `014-print-bench/research.html`；线上验收通过后才登记演示地址，实际结果见014的发布记录。

公开静态研究，不接入模型、建模后台或Issue自动改代码；CI不重新生成引导图。原X视频源码未确认，不把print-bench视为原帖项目。

已实际发布[014完整中文研究](https://yydshly.github.io/1010_codex_project/014-print-bench/research.html)，首次Actions 38244822695成功。39项资源HTTP、大小和SHA-256全部一致；线上确认九主题31段、九模块、原文阅读、任务判断、总图缩放下载与窄屏布局。记录和实拍保留在014的 notes/publication-verification.json。


## 2026-10-12 · 006 Telegram 媒体研究发布接入

沿用既有 3840×2880 理解总图，在首页提供放大与下载，统一九主题27段完整摘要及九组固定源码职责。覆盖能力与 WebK/WebA 差异、原有效果、双路径与 Range/Blob 原理、账号和网页及脚本分工、用途、个人价值、五阶段扩展、来源许可与验证边界。保留原观察台交互、12项受控实验和正常/截断媒体；用户已取消继续真实 Telegram 下载实测。

固定路径为 `006-telegram-media-downloader/research.html`，`index.html` 为同页别名；公开静态研究网页，不执行下载器或连接 Telegram。无后台、登录、模型或第三方运行依赖。执行子项目 `npm run research:sync`、`npm run check`、`npm run build`、`npm run publication:check`，再执行根 `npm run catalog:sync`、`npm run check` 与 `npm run site:assemble`。38项静态资源由逐文件 SHA-256 清单记录，CI不生成总图、不操作 Telegram 账号。上游原样脚本和 GPL-3.0 保留。

已实际发布 [006 完整中文研究](https://yydshly.github.io/1010_codex_project/006-telegram-media-downloader/research.html)，首次 Actions 38241355803 成功。38项资源的 HTTP、大小与 SHA-256 全部一致；线上确认九主题27段、九组模块、12项实验记录、总图放大与摘要展开，并保留桌面与窄屏实拍。实际版本、浏览器和逐文件验收见006的 `notes/publication-verification.json`；已确认后登记项目演示地址。既有001、002、004、005、007和013发布路径保留。

## 2026-10-12 · 007 / 013 视频工作台研究

沿用既有研究总图，新增九维完整摘要、六份实际成片、章节与混音对照、12项能力、七个模块、六路模型协议及48份资料。公开版独立生成到两个项目的 `web/dist-public/`，固定路径为 `007-google-vids/research.html` 与 `013-model-video-studio/research.html`。Google原始制作对照与官方样片拆解保留为 `actual.html`、`official.html`。

在013的web目录运行 `npm ci`、`npm run check`、`npm run build:research` 和 `npm run publication:check`，再运行根 `npm run catalog:sync`、`npm run check`、`npm run site:assemble`。CI运行相同发布检查并准备FFmpeg与中文字体。白名单打包134项文件（007 79项、013 55项），逐项保留SHA-256；资料与模型能力交叉引用校验通过。

公开页只读，不上传本机运行目录、密钥、个人配置或Codex认证。创作工作台源码与研究资料提交远端；真实模型调用、编辑保存、渲染仍在本机。已实际发布 [Google Vids 研究](https://yydshly.github.io/1010_codex_project/007-google-vids/research.html) 与 [映序研究](https://yydshly.github.io/1010_codex_project/013-model-video-studio/research.html)，首次部署 Actions 38236351667 成功。线上已打开原始成片、资料与引导图下载；项目索引已登记地址。精确版本、逐文件哈希及后续复验记录见013的 `notes/publication-verification.json`。


## 2026-10-12 · 005 静态研究发布接入

005 使用已有桃源理解总图作为引导，增加九维完整摘要、原版真实效果对照、模块位置、统一时间线图、001 已有导览入口和 15 项资料页内阅读。共用 `notes/research-summary.json` 同步网页、完整摘要笔记和根索引；所有 39 段正文保留。

公开产物单独放在 `projects/005-taohuayuan/web/dist-public/`。在其 web 目录运行 `npm ci`、`npm run research:sync`、`npm test`、`npm run build:research` 和 `npm run publication:check`，再在根运行 `npm run site:assemble`。005 的原版三维缓存、人物与朗读不随静态研究页发布，CI 不下载上游。既有 001、002、004 路径继续保留。

已实际发布 [005 完整中文研究手册](https://yydshly.github.io/1010_codex_project/005-taohuayuan/research.html)，首次部署 [Actions 38232072056](https://github.com/yydshly/1010_codex_project/actions/runs/38232072056) 成功。34 项初次发布资源逐文件核对 HTTPS、SHA-256 与已提交源文件一致；线上确认九维 39 段摘要、高清图缩放、Markdown/JSON 资料阅读、搜索和 001 导览导航，保留桌面与窄屏实拍。实际版本和范围以 005 的 `notes/publication-verification.json` 为准。引导图和旧笔记保留其制作时状态，不将历史记录改写为新实测。

## 2026-10-12 · 004 发布接入

本轮为 `004-muster-ww2/` 新增独立构建与资料打包，继续保留 001、002 路径。首页采用既有中文理解总图，发布完整摘要、五个实际应用、八个页面及全部笔记、图片、音频、布局和报告。机场与演习是浏览器内规则电脑玩法，无服务器、账号或模型密钥。

在 004 的 web 目录执行 `npm ci`、`npm run test:battle`、`npm run test:airport`、`npm run build`、`npm run publication:check`。Pages 工作流增加其路径和步骤，根组装器新增固定项目目录及首页入口。预生成 PNG/SVG 随资料发布，CI 不生成图片。

已实际发布 [004 完整研究与体验](https://yydshly.github.io/1010_codex_project/004-muster-ww2/)。成功 Actions 38220631396；八页面和137项资料逐文件哈希一致，五个实际应用等11项浏览器验收通过。线上实拍与续验记录已保留，实际版本、地址及范围记录在 `projects/004-muster-ww2/notes/publication-verification.json`。验证后才登记公开演示地址。图及旧笔记保留制作时状态。

## 2026-10-12 · 002 已发布并验证

首次部署 Actions 38217076338 成功；HTTPS 页面、3840×14460 总图及原始资料已实际核对，记录见 002 的 `notes/publication-verification.json`。

在既有 GitHub Pages 站点新增 `002-18-floors-of-mayhem/research.html`，保留 001 路径。站点首页改为两个研究入口。002 原效果页位于同目录 `index.html`；图像、中文资料与必要跨项目证据快照由其独立构建复制。

002 构建无额外依赖：在 `projects/002-18-floors-of-mayhem/web` 执行 `npm run check`、`npm test`、`npm run references:check`、`npm run guide:check`、`npm run build`、`npm run publication:check`；之后根 `npm run site:assemble` 组装 001 与 002。Actions 增加 002 路径触发及校验步骤。

仅部署静态研究、效果与保存的真实记录；3182/3183 游戏房间、模型调用、官方 Codex 登录和 MiniMax 外部配置不部署。002 引用 003/001 的必要文本、JSON 与截图为固定快照，不要求公开 003 应用或其他未提交研究。

以下为首次 001 发布记录，保持其阶段和证据。后续真实部署状态以各项目 `notes/publication-verification.json` 为准。

2026-10-12 为 001 樱花小街配置 GitHub Pages。GitHub Actions 已成功部署，线上页面和引导图已实际打开；验证记录见 001 的 notes/publication-verification.json。

## 一个站点，稳定项目路径

仓库站点入口为 `https://yydshly.github.io/1010_codex_project/`，001 放在 `001-sakura-crossing/`，首页导航到 `research.html`。本次仅发布 001 静态应用和必要引用资料，不发布其他子项目应用。

```text
_site/
├── index.html
└── 001-sakura-crossing/
    ├── research.html           # 完整摘要、引导图、研究手册
    ├── index.html              # 研究街、内容收藏与中文导览
    ├── lab.html                # 三场景风格和性能实验
    ├── builder.html            # 小镇编辑与本机存档
    ├── weather.html            # WebGPU 晴雨漫游
    ├── directions.html         # 七种产品方向
    └── overview.html           # 高清总览图与下载
```

## 构建与自动部署

在根目录执行 `npm run check`，在 `projects/001-sakura-crossing/web/` 执行 `npm ci` 与 `npm run build`，最后回到根执行 `npm run site:assemble`。应用使用相对基础路径 `./`；所有生产资源由 Vite 打包到同一子目录，跨项目说明和截图使用 `references/` 中的快照，不依赖其他项目的开发服务器。

`.github/workflows/pages.yml` 在 main 的相关内容更新或手动触发时构建 `_site/`，上传 Pages 产物并部署。Actions 版本固定到核验过的 commit。仓库 Pages 构建来源使用 GitHub Actions。首次启用、发布状态与成功 URL 通过 GitHub API/Actions 核验；只有实际线上检查通过后，才将真实 HTTPS 地址写入 `projects.json.demo` 并同步根 README。

## 在线与本机体验

在线提供完整研究摘要、引导图、真实效果对照、笔记与证据阅读、模块下载和 001 的静态场景。收藏和搭建器存档存于当前浏览器，换域名或浏览器不自动同步，可用 JSON 备份。

天气页需要支持 WebGPU 的浏览器与合适设备；普通研究阅读不要求加载三维场景。手机真机和长时性能尚未验证。

AI 守灯游戏使用本机 `town-server.mjs`、官方 CLI 登录或本机模型配置，不包含公开模型 API；012 原城市、技术台和 GPU 现场仍需各自的本机服务。在线手册以说明、截图和原始记录呈现这些入口，避免把 localhost 当成公开演示地址。静态发布不上传密钥、用户存档或本机配置。

## 资料与依据

[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [GitHub Pages REST API](https://docs.github.com/en/rest/pages/pages)

实际发布和线上检查记录保留在 001 笔记中。后续增加项目时继续沿用固定编号路径，并为其增加独立构建、来源授权和验证记录。
