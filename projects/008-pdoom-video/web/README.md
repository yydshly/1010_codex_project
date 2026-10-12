# 纸间 MV 本地创作室

## 完整研究网页

研究网页以已有总览图为引导，保留九主题、37 段完整中文摘要、九组模块、六步执行链、原始截图、两支本地成片、三画风对照及 21 份原始资料。研究与本地创作工具分别构建：静态产物在 `dist-public/`，本地 React 工具在 `dist/`，服务端上传和编码不随静态网页运行。

```powershell
npm.cmd run research:sync
npm.cmd run build:research
npm.cmd run publication:check
npm.cmd run preview:research
```

预览使用完整 Pages 路径 `http://127.0.0.1:5198/1010_codex_project/008-pdoom-video/research.html`。`node scripts/verify-research.mjs` 检查摘要、资料原文、画风、分镜链、总图缩放、视频实际播放与桌面/窄屏布局；线上逐文件核验使用 `npm run publication:verify -- --url <实际HTTPS目录> --commit <提交> --run <Actions编号>`。只在真实线上验收后登记公开地址。

以下为本地创作工具的能力、依赖与启动方式。

可运行的本地最小工具：定制二维主角，上传音乐和歌词，选择水彩绘本、墨线素描或平涂卡通，自动编排分镜，预览并导出 15～30 秒 MP4。15 秒/720p 水彩版和 30 秒/1080p 素描版已完成输出、规格核验与完整解码。

默认自动分镜使用本地规则，不需要密钥。真实模型适配器需要单独配置，本机尚未进行真实模型实测。轻量水彩与 PDoomVideo 的 p5.brush 水彩质量不同；当前不支持图片角色绑定、自动声学节拍检测、唱词对齐或口型。

## 安装与启动

需要 Node.js 22+、Chrome/Edge、ffmpeg、ffprobe。后两者应在 PATH，或在 `.env` 指定绝对路径。依赖仅安装在本目录。

```powershell
cd F:/codex_project/1010_codex_project/projects/008-pdoom-video/web
npm.cmd ci
npm.cmd run dev
```

访问 <http://127.0.0.1:4318>。`predev` 自动生成原创 30 秒示例伴奏。点击「载入 15 秒示例」→「生成分镜」→播放预览→「导出 MV」→下载 MP4。示例包含演示歌词，音乐不含演唱。

构建后运行：

```powershell
npm.cmd run build
npm.cmd start
```

开发和构建服务使用同一个端口，一次运行其中一个。按 Ctrl+C 停止。服务只监听本机；没有部署，也没有在线演示。

## 输入与编辑

| 输入 | 实际范围 |
| --- | --- |
| 角色 | 名字、两种颜色、身体比例、眼睛大小、星形/针织帽头饰、初始心情 |
| 音乐 | MP3/WAV，15 秒～2 小时、最大 100 MB；选取 15～30 秒，手动设置 BPM 与片段首拍偏移 |
| 歌词 | TXT/LRC/SRT，文件按 UTF-8 读取；LRC/SRT 时间是原音乐时间，导入时裁切为片段时间 |
| 画风 | 轻量透明填色与纸粒、排线与墨线、实心色块与粗轮廓 |
| 分镜 | 六个场景、六个动作、五种情绪、固定/推近/平移镜头、直接切换/淡出 |
| 输出 | 16:9、24 fps、720p/1080p、H.264 视频与 AAC 音频 |

歌词不必上传，也可以粘贴。没有歌词时仍可按节拍生成分镜。纯文本按长度估计时间，界面显示来源并支持逐句校时；字幕进度条是句级时间进度，不是逐字声学对齐。修改音乐选段后，重新导入歌词并生成分镜。

分镜列表支持改变场景、动作、心情、镜头、转场、结束边界和公开叙事目的。结束边界会同步修改下一镜头开始时间。修改角色和画风可直接更新已有分镜。手工校时会保留到再次编排中。

工程自动保存在浏览器，也可下载和打开 `1.0.0` 工程 JSON。JSON 包含音频素材 ID，音频文件保存在本机；跨机器打开需要重新上传音乐。旧的 `examples/storyboard.example.json` 是设计草案，不能直接导入。

## 可选真实模型

```powershell
Copy-Item .env.example .env
```

编辑 `.env` 后重启服务：

```dotenv
MV_API_BASE_URL=https://api.openai.com/v1
MV_API_KEY=填写你的服务端密钥
MV_MODEL=填写服务实际提供的模型名称
```

接口采用 OpenAI Chat Completions 兼容协议，需要支持 JSON object 输出。地址填到 `/v1` 层级，不包含 `/chat/completions`。模型名称不预设，使用你的服务真实可用名称。选「真实模型」再生成；仅发送歌词、角色描述、画风和分镜约束，不发送音乐文件。密钥不写入工程、不传入浏览器。

模型只返回故事和镜头，角色与媒体规格保持输入值。程序校验格式、镜头时间和引用，最多修复一次；失败直接报错，不自动转为规则成功。本机已经验证未配置报错及模拟服务修复，真实服务兼容性与生成质量仍需使用实际模型验证。

其他可选配置见 [.env.example](.env.example)：`CHROME_PATH`、`FFMPEG_PATH`、`FFPROBE_PATH`、`PORT`。无头导出默认使用 `--disable-gpu`，避免本机出现的 GPU 页面/截图等待问题。预览使用当前浏览器绘制。

## 保存与导出

`data/assets/` 保存上传音乐和探测信息，`data/jobs/<id>/` 保存工程快照、进度、JPEG 帧和 `mv.mp4`。`data/` 与生成的示例 WAV 均忽略，不提交本机素材。取消任务会关闭该作业的 Chrome 或终止编码；清理完成后可继续。同一渲染版本会复用完整帧，缺帧重绘；变更配置会创建新快照。服务重启后，中断的作业显示失败，从最近导出列表可选择继续。

完成前会核对分辨率、fps、帧数、音视频时长，并对 MP4 完整解码。最终下载只对完成任务开放。更多实现、缓存边界和验证记录见 [本地工具说明](../notes/local-tool.md)。

## 检查与复现

```powershell
npm.cmd test
npm.cmd run build
```

启动服务后，在另一个终端运行：

```powershell
npm.cmd run test:e2e
npm.cmd run test:integration
```

`test:e2e` 实际操作浏览器，上传 WAV/LRC、定制角色、编辑分镜、播放并导出 15 秒样片，检查画风、草稿恢复、移动布局、确定性和缓存。`test:integration` 需先运行 E2E，使用其工程样本，转换并上传 MP3、导入 SRT、导出 30 秒/1080p 素描版，验证取消、继续、缺帧重绘及配置缓存失效。测试会生成本机素材和任务，不调用真实模型。

输出在 `../out/local-demo-15s.mp4`、`../out/local-demo-30s-ink.mp4`，验证数据在 `../notes/local-tool-*.json`。核心测试共 10 项；源码类型检查与 Vite 构建通过。构建时 Zod 的第三方 pure 注释产生 Rollup 提示，不影响输出。

## 实际 API

| 方法与路径 | 作用 |
| --- | --- |
| `GET /api/health` | Chrome、ffmpeg、ffprobe 和模型配置状态 |
| `POST /api/assets` | multipart `audio` 上传，返回 UUID 和真实时长 |
| `GET /api/assets/:id/audio` | 播放本机素材，支持浏览器范围请求 |
| `POST /api/lyrics` | `{text, format, duration, sourceStart}`，返回片段歌词 |
| `POST /api/storyboards` | 工程输入加 `mode`、`brief`，返回已校验的完整工程 |
| `POST /api/renders` | 完整 `1.0.0` 工程，返回作业信息 |
| `GET /api/jobs`、`GET /api/jobs/:id` | 历史和进度 |
| `GET /api/jobs/:id/project`、`GET /api/jobs/:id/video` | 工程快照与完成的 MP4 |
| `POST /api/jobs/:id/cancel`、`POST /api/jobs/:id/retry` | 取消与继续 |

界面与渲染器均使用本机 API；纯静态托管无法处理上传和编码。当前为本机单用户最小工具。

[源代码与 MIT 声明](THIRD_PARTY_NOTICES.md) · [实施方案](../notes/mv-tool-plan.md) · [返回项目说明](../README.md)
