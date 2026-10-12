# 深渊观察室 · 中文游戏研究展示页

先看真实效果，再理解玩法、AI 原理和扩展价值。采用原生 HTML、CSS 与 ES Modules，无第三方运行依赖；Node.js 22 或更高版本用于构建和本机服务。

## 完整研究手册

2026-10-12 新增 `research.html`，作为公开研究主入口；`index.html` 保留原效果展示。新增六类摘要、八类模块、AI 五步、三组实测、六种角色方向、场景/价值/路线、问答和资料阅读。支持案例筛选、资料搜索、原文弹窗、图片放大与 PNG/SVG/JSON 下载。静态发布不调用模型，不包含房间后端或凭据。

总图以确定性 SVG 排版，嵌入六张已有画面，导出高清 PNG 与网页 WebP。数据源 `src/research-content.js` 同步网页、文字摘要、总图及根索引摘要；跨项目材料固定为 `references/` 快照，避免部署依赖未提交的其他应用。

验证命令：`npm.cmd run check`、`npm.cmd test`、`npm.cmd run references:check`、`npm.cmd run guide:check`、`npm.cmd run build`、`npm.cmd run publication:check`。维护研究数据后需重新生成 `notes/research-summary.md` 和图像；图像导出工具 `scripts/render-guide.mjs --sharp-module <已有 sharp 的绝对路径>` 不增加前端依赖。

## 已实现

- 六类画面：妖王战、游玩 GIF、角色技能、大厅、AI 配置与短局结算；逐项注明来源。
- 动态预览播放与暂停，遵守系统减少动态偏好；图片弹窗支持关闭按钮与 Escape。
- 四种玩法切换：下落冒险、朋友联机、双人协作、模型对战。
- 观察、决策、执行、反馈、复盘五步交互；示例明确标记未调用模型。
- 街区任务、共享房间、可行动 NPC 三条扩展路线，以及研究笔记下载。
- 本机原游戏入口：识别已启动的 3182 服务后，可在弹窗或新窗口进入。
- 桌面与手机响应布局、相对路径资源，适配仓库子路径。

## 启动展示页

在本目录执行，无需安装依赖：

```powershell
npm.cmd run dev
```

打开 `http://127.0.0.1:5182/`。启动时构建一次；修改源码后重新执行构建并刷新，或重启服务。服务只监听本机回环地址。

希望在页面内试玩时，先在另一个终端启动未修改的上游：

```powershell
cd projects/002-18-floors-of-mayhem/vendor/upstream
$env:PORT = '3182'
npm.cmd start
```

上例从总仓库根目录切换；首次获取、安装依赖和固定版本见 [项目 README](../README.md)。服务就绪后刷新展示页，出现「进入本机试玩」。展示页不接收 API key。新增加的本机观察室由服务端读取已授权的 MiniMax 配置，并复用已登录 Codex 的 OpenAI；原游戏自己的模型配置仍单独管理。

## 检查与静态产物

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run preview
```

`dist/` 包含展示页、六份效果素材、研究与来源文件，忽略提交。`preview` 地址为 `http://127.0.0.1:5183/`。静态产物的 `runtime.json` 默认没有原游戏地址；本机预览服务单独探测原游戏 `/health`。部署静态展示页并不会部署游戏房间或模型调用服务。

子路径检查：

```powershell
npm.cmd run preview:path
```

打开 `http://127.0.0.1:5184/1010_codex_project/002-18-floors-of-mayhem/`。该路径本次已实际验证，当前未发布到公网。

## 结构与证据

`src/content.js` 管理画面、玩法和 AI 说明；`src/app.js` 管理交互；`scripts/build.mjs` 复制素材与研究文件；`scripts/serve.mjs` 提供本机预览与游戏服务探测。

- [展示页验证与截图](../notes/showcase.md)
- [上游测试与验证边界](../notes/verification.md)
- [来源与素材授权](../THIRD_PARTY.md)
- [多 Web 部署约定](../../../docs/web-deployment.md)
- [返回项目说明](../README.md)

部署尚未启用，登记表 `demo` 保持 `null`。真实模型决策与执行已验证，模型胜率、完整通关和公网联机待验证；三条产品扩展路线尚未实现。

## 真实 AI 对战观察室

在本目录执行 `npm.cmd run battle`，访问 `http://127.0.0.1:3183/`。启动器会复用或启动原游戏 3182 服务。默认回放本次实测，点击开始才调用真实接口。MiniMax 使用用户指定的本机配置文件；OpenAI 通过已安装且登录的 Codex CLI App Server 接入。没有新增前端依赖或写入密钥。

支持 MiniMax / OpenAI / 普通 CPU、稳健与道具策略、全房暂停的逐步观察、不暂停的实时对照、按键与落地证据、回放和战报导出。逐步模式每模型 4 次请求，实时模式 12 次；每请求最长 35 秒，停止或淘汰取消后续请求。详见 [实测与局限](../notes/ai-battle.md)。

`npm.cmd test` 运行本次新增的 6 项验证，不调用付费模型。观察室是独立的本机 Node 服务，未包含在静态展示页部署中。
