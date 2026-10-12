# 映序 Studio · Web 应用

原生 HTML/CSS/JavaScript 前端＋Node HTTP 后端＋浏览器/Node共用Canvas排版＋FFmpeg导出；所有依赖位于本子项目。新版控制面在根路径，旧表单工作台保留于 `/classic`。

```powershell
npm.cmd ci
npm.cmd start
```

本机地址 `http://127.0.0.1:4323`。没有单独打包步骤。验证运行 `npm.cmd run check`。

## 使用顺序

1. 点击“模型连接”，分别配置文案、图片和配音；视频与口型新增独立配置，默认“待配置”。
2. 新建视频，填写主题，生成 AI 分镜。
3. 图片API模式可自动生成素材与成片；导入模式通过“素材”上传图片。选中画面素材后点击库中图片可替换；选中文字或画布时导入图片会新增图片对象。上传视频会替换当前场景的主画面。
4. 在画布中选中、拖动、缩放对象，用右侧属性调整文字、尺寸、颜色和层级；图层面板可以隐藏、锁定对象。
5. 底部时间轴可以播放、定位、拖排、分割、调时长。右侧“场景”设置旁白入点、延迟、音量、静音与转场。图层和时间轴编辑可以撤销／重做；Ctrl+S保存。
6. 口播改变后重新配音，导出接口检查对应文本。导出弹窗保存各版本，可播放、下载。创建副本可以保留原项目继续编辑。

## 剧情与镜头

顶部“剧情与镜头”包含分镜规划、角色设定与生成任务。先保存故事和人物设定，选择镜头制作方式，再准备请求。未配置模型时仍可下载请求或把素材库视频关联为手工结果；有结果后审核并应用，最后沿用主编辑器导出。

视频与口型使用本平台定义的 `studio-generation/v1` 异步适配器协议，服务需实现 `POST {baseUrl}/tasks` 与 `GET {baseUrl}/tasks/{id}`。原厂API需单独映射，详见 [完整接口说明](../notes/generation-adapters.md)。当前只完成受控HTTP测试，真实模型待配置。

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
- 初始场景时长来自ffprobe测量，加入缓冲；新版可以手动编辑时长，保存到30fps时间格。默认音频延迟0.2秒，画面淡入淡出0.3秒，可改为直接切换。
- 新版场景含 `elements`、`background` 和 `timing`。共享 `public/composition.js` 完成预览与导出排版。导出时将尚未迁移的旧场景保存为新版对象，经典版仍可按旧流程使用。
- 新接口：项目 `copy` 创建副本，`assets` 导入本地媒体，`waveform` 返回实际PCM的峰值数据。项目更新支持场景新增、删除、排序、复制与对象编辑；仍使用revision拒绝覆盖过期版本。
- 每场景一个视频对象与一条旁白。视频原声静音；超过视频源长度保持最后一帧。音频按选定入点和场景时长裁切，超出的旁白会截断，属性面板有提示。
- MP4服务器支持HTTP Range，可播放、拖动进度、下载。只允许本机Host及Origin，不提供跨站API。

`assets/demo` 保留初版样例，`assets/control-plane` 是新版可搬移样例；没有本机项目时一同载入。要保留自己的作品，请备份 `.local/projects`。每项目最多24个场景，每场景1–120秒、最多60个对象；没有复杂多轨混音、关键帧或协作。图像生成功能的本机API边界未改变，聊天中的Codex图片仍通过导入进入网页。

[返回项目说明](../README.md)
