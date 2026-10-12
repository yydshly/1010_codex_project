# 006 · Telegram Media Downloader · 媒体观察台 Web 应用

原生 HTML/CSS/JavaScript 中文展示页，无第三方运行依赖。需要 Node.js 22+，无需环境变量、Telegram 登录、API 密钥或用户脚本管理器。

## 启动

在此目录执行：

```powershell
npm.cmd run dev
```

本机访问 `http://127.0.0.1:5186/`。服务器只绑定本机地址。源文件改变后重新运行 `npm.cmd run build` 并刷新浏览器；没有热更新。

## 检查与构建

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run preview
```

构建产物在 `dist/`，普通预览端口 5187。构建复制网页、原创 SVG、研究笔记与许可证；上游下载器不作为运行依赖。

```powershell
npm.cmd run preview:path
```

子路径预览：`http://127.0.0.1:5188/1010_codex_project/006-telegram-media-downloader/`。资源、脚本和笔记均使用相对 URL，未来可将 `dist/` 放入该子路径。当前尚未部署。

## 交互范围

- 切换图片、视频/GIF、语音和 Stories；对比原页面与脚本介入后的保存入口示意。
- 切换 WebK/WebA，观察主线语音入口差异。
- 展示保存过程、视频分段进度、异常与停止示意，不请求或写入真实媒体。
- 点击五步原理、四种场景，展开实现证据、边界与应用价值。
- 展开扩展阶段和可靠性问题；查看中文笔记、上游来源与许可证。
- 八章导航涵盖六问速览、输出特点、两条保存路径、使用说明、需求价值判断、模块架构和验证矩阵。
- 调整 Range 分段位置、切换 206 / 200 / 起点不匹配，观察字节示意；不发送网络请求。
- 选择偶尔保存、持续研究或工具开发目标，查看收益、投入和继续投入的依据；这是研究判断，非效率测量。
- 五阶段扩展分别说明前提、产物和验收标准；常见疑问可逐条展开。

顶部风景、波形、大小、时长、字节范围和保存流程仍为自有示意。新增受控实验区提供实际 JPEG、MP4 与正常 / 截断 OGG，可播放和下载，加载实际 JSON 请求与哈希记录；也提供原样固定版上游脚本供手动下载。实验区的素材没有上传 Telegram，页面没有账号连接、正在运行的上游下载器、批量归档或 AI 服务。默认不自动播放。

实际构建和浏览器验证结果见 [验证记录](../notes/verification.md)。

- [多 Web 部署约定](../../../docs/web-deployment.md)
- [返回项目说明](../README.md)


## 完整研究发布（2026-10-12）

首页沿用既有理解总图，可原图下载及100%～300%缩放。九主题27段摘要与九组逻辑模块从 `notes/understanding-summary.json` 载入；由 `npm run research:sync` 生成完整中文 Markdown，也可加 `--catalog` 更新根006登记。保留原交互和受控实验，真实 Telegram 下载未实测且不再继续执行。

发布命令：`npm run research:sync` → `npm run check` → `npm run build` → `npm run publication:check`。公开文件为 `dist/research.html` 和同页 `index.html`；检查相对资源、总图尺寸、摘要数量、固定源码哈希，并生成 `publication-manifest.json`。固定目录 `/1010_codex_project/006-telegram-media-downloader/`，通过 `npm run preview:path` 本机复验；线上状态以 `notes/publication-verification.json` 为准。静态页不执行用户脚本或连接账号，CI不登录 Telegram。
