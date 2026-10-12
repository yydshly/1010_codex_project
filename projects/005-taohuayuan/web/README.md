# 005 · 桃源本地研究台

用原生 HTML/CSS/JavaScript 编写中文体验入口，嵌入固定版本的上游生产构建。准备阶段需要网络，准备完成后全部运行资源来自本机。

## 运行与构建

需要 Node.js 22+、npm、Git，浏览器需要 WebGL 2 与 DecompressionStream。建议新版 Chrome/Edge。无需账号、环境变量或 API Key。

```powershell
npm.cmd run dev
```

首次自动完成固定版本下载、缓存内依赖安装和上游构建；随后在 `http://127.0.0.1:5195/` 启动研究台。`http://127.0.0.1:5195/experience/` 可独立打开原版页面。保持终端运行，按 Ctrl+C 停止。端口占用时运行 `npm.cmd run dev -- --port=5196`。

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

测试验证音频 Range、HEAD、错误范围、缺失文件与目录边界。构建将自有研究台、上游产物、中文笔记汇总到 `dist/`；预览只使用 `dist/`，不下载或重新构建。不能双击 HTML 打开，模型与模块脚本需要 HTTP 服务。

研究台本身没有 npm 运行依赖，锁文件记录零依赖项目；Three.js 与 Vite 由上游缓存内清单和锁文件管理。

## 研究总览图

`npm.cmd run overview:render` 根据 `../notes/overview-content.json` 与真实截图生成可编辑 SVG，保存在 `../assets/`。PNG 导出另传 `--png --sharp-module <Sharp 包绝对路径>`；[完整说明](../assets/README.md#总览图与复现)记录字体、截图来源和本机命令。总览图是独立研究材料，不改动三维播放器。

## 来源、缓存与连接层

`upstream.json` 固定仓库、完整 commit 和唯一构建依赖覆盖。`.cache/prepared.json` 记录完成版本；版本未变时复用构建。首次获取为稀疏克隆，仅展开 `src/`、`tools/` 与根文件，不取得素材原件与录屏。

缓存内增加 npm override：`source-map-js: 1.2.2`，处理研究时发现的间接构建依赖问题。场景代码、人物、录音保持固定 commit 的原件。审计与构建实测见 [实验记录](../notes/experiment.md)。

连接层使用固定版本页面上的诊断对象 `window.__t`，调用导演的 `start`、`togglePause`、`stop` 和漫游的 `placeNow`。它不是上游承诺的稳定 SDK；升级版本需重新核对接口。所有调用在本机同源 iframe 内进行。

## 故障处理

- 网络下载或安装失败：确认 GitHub/npm 连接后再次运行 `npm.cmd run prepare:demo`。失败不会写入成功标记。
- 端口占用：使用 `--port=5196` 指定新端口，不终止其他项目的进程。
- 音频无声：点击三维画面或导览入口允许播放，检查原版“朗读”开关。出现“音频文件无法加载”时，重新打开原版“朗读”；本次生产预览通过这一操作恢复了播放状态，见实验记录。
- WebGL 错误：检查硬件加速，换支持 WebGL 2 的浏览器。
- 需要重新准备：停止本项目服务器，把本项目 `web/.cache/` 改名为备份，再运行 `npm.cmd run prepare:demo`。不要处理其他项目缓存。

## 使用边界

`dist/` 包含上游代码、人物与朗读，当前只供个人本地学习。两个人物需在公开前替换，音频与整体源码需明确授权；见 [来源说明](../THIRD_PARTY.md)。这一构建不接入公开部署。

## 静态研究手册与发布

本项目另建独立发布入口，不调用 `prepare.mjs`、不下载桃源源码与素材。页面以既有总览图引导，九维摘要、原版实拍对照、001 已有在线体验入口与 15 项资料可直接阅读。

```powershell
npm.cmd run research:sync
npm.cmd run build:research
npm.cmd run publication:check
npm.cmd run preview:research
```

`research:sync` 用 `../notes/research-summary.json` 更新摘要笔记和根 `projects.json` 的 005 条目；随后需在根运行 `npm.cmd run catalog:sync`。`build:research` 只写入 `dist-public/`，`publication:check` 核对 39 段摘要、所有本地引用、引导图尺寸、资料原文件与 SHA-256，并检查不含上游三维产物。

预览默认端口 5197。单项目预览只提供 005，001 链接需在根站点组装或公开站点验证。Pages 工作流新增 005 的零依赖构建与检查，根组装器将 `dist-public/` 放到 `005-taohuayuan/`，保留既有 001、002、004 页面。

缩略预览与截图裁切从原文件生成，不是新效果。重新生成需本机 Sharp：`npm.cmd run media:prepare -- --sharp-module <Sharp 包绝对路径>`。CI 直接使用已经提交的图像。001 三份必要资料保存在 `../references/001-sakura-crossing/notes/`；原路径和内容保持可回查。

浏览器实测、HTTPS 状态、部署 commit 与资源哈希以 [发布记录](../notes/publication-verification.json)为准。旧图和旧实验笔记的未部署状态保留为其制作阶段记录。
