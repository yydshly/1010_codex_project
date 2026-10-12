# 映序 Studio · Web 应用

原生 HTML/CSS/JavaScript 前端＋Node HTTP 后端＋Canvas 排版＋FFmpeg 导出；所有依赖位于本子项目。

```powershell
npm.cmd ci
npm.cmd start
```

本机地址 `http://127.0.0.1:4323`。没有单独打包步骤。验证运行 `npm.cmd run check`。

## 使用顺序

1. 点击齿轮，分别配置文案、图片和配音。
2. 新建视频，填写主题，生成 AI 分镜。
3. 图片 API 模式会自动生成素材与成片；导入模式先上传每个场景的图片，再点击“生成配音与成片”。
4. 修改标题、要点、口播、图片提示词，用前移／后移调整排序。保存后可独立重新生成图片或配音。
5. 口播改变后必须重新配音，导出接口也会检查。导出区保留版本，可播放和下载。

## 模型协议

| 角色 | 协议 | 后端实际请求 |
| --- | --- | --- |
| 文案 | 本机 Codex | 官方 CLI `app-server --listen stdio://`，`thread/start`、`turn/start`、JSON schema；复用 CLI 登录，禁止工具调用 |
| 文案 | OpenAI 兼容 Chat | `POST /v1/chat/completions`，`model/messages/max_tokens`；返回 `choices[0].message.content` 中的分镜 JSON |
| 图片 | 导入 | 本机上传有效图片；这次使用 Codex 内置 Imagegen 生成后导入 |
| 图片 | OpenAI 兼容 Images | `POST /v1/images/generations`，`model/prompt/size/n`；支持 `data[0].b64_json` 或 HTTPS `url` |
| 图片 | MiniMax | `POST /v1/image_generation`，`model/prompt/aspect_ratio/response_format/n`；使用 `image_base64` |
| 配音 | OpenAI 兼容 Speech | `POST /v1/audio/speech`，`model/input/voice/response_format`；返回 MP3 二进制 |
| 配音 | MiniMax | `POST /v1/t2a_v2`，`voice_setting/audio_setting`；返回十六进制 MP3 |

兼容接口填写服务根地址或者以 `/v1` 结尾的地址，系统避免重复拼接 `/v1`。本地模型可填写 `http://127.0.0.1:端口` 或 `localhost`；远程服务使用 HTTPS。异步任务型图片服务、Anthropic 原生协议、非上述格式的 TTS 服务需要另外写适配器。

## 本机配置

服务器从进程环境读取设置；`.env.example` 是参考模板，不会自动加载。

| 环境变量 | 默认值／含义 |
| --- | --- |
| `STUDIO_PORT` | 4323，仅绑定127.0.0.1 |
| `STUDIO_MINIMAX_ENV` | `F:/codex_project/.env.minimax`；文件内读取 `MINIMAX_API_KEY`、`MINIMAX_API_BASE` |
| `STUDIO_CODEX_CLI` | `%APPDATA%/npm/node_modules/@openai/codex/bin/codex.js`，需已登录 |
| `STUDIO_FFMPEG` | `ffmpeg`，需在PATH中，或填写完整exe路径 |
| `STUDIO_FFPROBE` | `ffprobe`，需在PATH中，或填写完整exe路径 |
| `STUDIO_FONT` | 可选中文字体路径；默认Windows微软雅黑，Linux尝试Noto Sans CJK |

前端只接收 `keyConfigured`，不接收密钥。网页填写的密钥和模型配置仅保留在服务器进程内存，重启需重新填写；已有 MiniMax 配置可自动读取。修改接口地址时清除上一地址的密钥，避免发送给新的服务。模型调用超时会显示失败，已完成素材保留，失败任务不自动重试计费。

## 文件与导出

- 项目数据：`.local/projects/<UUID>/project.json`。
- 原始生成：`ai-draft.json`，不因人工修改而覆盖。
- 素材：按场景保存图片与MP3，附模型、时间、音频文本、trace ID及SHA-256。
- 导出：`export-r<revision>.mp4`，1920×1080，30fps，H.264 + AAC，faststart。
- 单场景时长来自ffprobe真实测量，加0.55秒缓冲。音频延迟0.2秒，画面淡入淡出0.3秒。
- MP4服务器支持HTTP Range，可播放、拖动进度、下载。只允许本机Host及Origin，不提供跨站API。

`assets/demo` 是这次实跑的可搬移样例；没有本机项目时自动载入。要保留自己的作品，请备份 `.local/projects`。当前仅支持预设的中文短片流程，最多12个可保留场景；没有复杂剪辑或协作。

[返回项目说明](../README.md)