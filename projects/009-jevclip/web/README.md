# 片刻 · 视频研究助手

原创静态应用。HTML、CSS、原生 ES Modules，Node.js 22+ 构建和预览，无第三方 npm 依赖。

页面顶部的“原理与能力”说明默认展开，用原生 `details` 展示字幕切段、Jev 判断、代码取舍及视频/摘要两条输出流程。对照表区分上游库和演示当前能力；“继续体验”通过页面锚点回到工作台，不修改研究数据。

## 完整研究入口

`research.html` 为新的研究首页，使用既有 2400 × 7397 全景图，提供九主题32段完整正文、九组源码职责、两条输出、能力对照、个人价值与路线。支持全图放大 / 下载、中文检索、15份资料页内阅读与原文件下载。`index.html` 保留原工作台，研究首页与工作台相互导航。

内容单一来源为 `../notes/research-summary.json`。每次修改后在本目录执行 `npm.cmd run research:sync`，再在根目录运行 `npm.cmd run catalog:sync`。既有图、笔记、示例、许可证通过白名单复制到 `dist/research/`，保持字节一致；构建生成带大小与 SHA-256 的 `publication-manifest.json`。

```powershell
npm.cmd run research:sync
npm.cmd run check
npm.cmd test
npm.cmd run build
npm.cmd run publication:check
npm.cmd run preview -- --port 5299 --base /1010_codex_project/009-jevclip/
```

固定公开路径为 `009-jevclip/research.html` 和 `009-jevclip/index.html`，发布状态以实际线上验收记录为准。GitHub Pages CI 不生成图片、不调用真实模型；无需 Python、FFmpeg 或 API 密钥即可构建此静态研究与工作台。

已实际发布 [完整中文研究](https://yydshly.github.io/1010_codex_project/009-jevclip/research.html) 和 [字幕工作台](https://yydshly.github.io/1010_codex_project/009-jevclip/index.html#research-workbench)。首次部署 Actions 38257207227 成功，39项资源逐文件 HTTP、大小、SHA-256 与实际部署 commit 源文件一致，既有九个公开入口保持 HTTP 200；结果保存在 `../notes/publication-verification.json` 与 `publication-resource-verification.json`。

重新验收正式部署：`npm.cmd run publication:verify -- --commit <实际部署的完整SHA>`。验证器读取线上清单并逐文件比对部署源文件，不接受本机预览地址或虚构版本；会追加历史验收记录，不改写上游效果。

## 命令

```powershell
npm.cmd run dev        # 构建并监听 127.0.0.1:5199
npm.cmd test           # Node 内置测试
npm.cmd run build      # 复制应用、演示视频和研究文档到 dist/
npm.cmd run preview    # 直接预览已有 dist/
```

其他端口：`npm.cmd run dev -- --port 5209`。

子路径：`npm.cmd run preview -- --port 5200 --base /1010_codex_project/009-jevclip/`。JS、CSS、图标、视频、文档均用相对 URL。构建不修改根登记表，也不部署。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `src/index.html` / `style.css` | 页面语义结构、三栏工作台和手机布局 |
| `src/core.mjs` | 解析、切段、关注点、取舍、原句摘录与 Markdown |
| `src/app.mjs` | 文件事件、视图同步、视频定位、本机恢复与导出 |
| `src/sample.mjs` | 原创合成示例的 10 个字幕片段 |
| `scripts/build.mjs` / `serve.mjs` | 构建和 HTTP 预览；支持 HEAD、Range、子路径 |
| `scripts/make-demo.mjs` / `make_demo.py` | 原创无配音示例的生成脚本 |
| `tests/core.test.mjs` / `fixtures/` | 数据测试和浏览器夹具；含模拟上游格式 |

## 数据与边界

字幕解析为 `{id,start,end,text,paragraphs,estimated}`。无时间稿 `start/end` 为 `null`，不伪造视频时间。上游已判断 JSON 带 `verdict`，保存 `keep/kind/value/reasons`；`keep:null` 表示未判断。

`evaluate()` 组合原始判断、关注点和人工取舍，人工优先。预设关注点是可查看的关键词组，自定义关注点按不区分大小写的子串匹配，多个关注点任一匹配。普通字幕仅用本地规则，不输出伪造概率。

`excerpts()` 从保留段提取原句。点击引用展开原文，清空隐藏该片段的搜索/过滤，定位时间线和视频。当前没有生成式改写、语音转写、画面识别或视频剪辑后端。

字幕与取舍存在 `localStorage`；Blob 视频只存在当前页面。刷新需重新关联视频。打开内置示例会替换当前研究材料，建议先导出；失败导入保留原材料。

支持 UTF-8 SRT、VTT、通用数组 JSON、whisper.cpp、Jevclip `segments.json`、TXT/MD，最多 5 MB / 5,000 条字幕。仅含起点的文字稿会标记终点推定。字幕里的 HTML 当作文字展示，不执行。

## 重新生成示例

日常运行不需要 Python/ffmpeg。生成自有视频时才需要 Python、Pillow、ffmpeg 和中文字体：

```powershell
node scripts/make-demo.mjs
```

默认字体 `C:/Windows/Fonts/msyh.ttc`，其他系统用 `JEVCLIP_DEMO_FONT` 指定字体。不分发工具或字体，不下载第三方视频。

## 验证

[验证记录](../notes/verification.md)、[实际导出](../notes/sample-export.md)、[来源说明](../THIRD_PARTY.md)。当前未部署，也未完成真实模型效果实验。
