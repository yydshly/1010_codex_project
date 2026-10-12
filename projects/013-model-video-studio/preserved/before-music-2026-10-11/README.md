# 013 · 映序 · 多模型视频工作台

已实际跑通的原创本机视频编辑工作台：独立模型接入、可拖拽的画布对象、真实时间轴、素材库与 MP4 导出。参考 Google Vids 的编辑器交互；Google Vids 是闭源产品，没有可复制的“源库”。本项目没有引入 Google 源码或素材。

## 直接看结果

- 本机工作台：[http://127.0.0.1:4323](http://127.0.0.1:4323)，启动方法见下方。
- [控制面编辑后的成片](assets/control-plane/final.mp4)：67.354 秒，1080p；包含画布文字编辑、时间调整和导入的视频素材。
- [经典版入口](http://127.0.0.1:4323/classic)、[升级前快照说明](preserved/README.md)：原有源码、实际项目与成片保留，57 个文件逐项校验哈希一致。
- [人工修改后的成片](assets/demo/final.mp4)：中文画面＋中文配音，65.321 秒，1920×1080，H.264 / AAC。
- [AI 初稿视频](assets/demo/ai-draft.mp4)：62.021 秒，保留修改前的文案。
- [原始分镜](assets/demo/ai-draft.json)、[可重新编辑的项目](assets/demo/project.json)、[调用与导出验证记录](assets/demo/verification.json)。

![新版控制面实拍](assets/control-plane/editor.jpg)

## 控制面能做什么

| 区域 | 已实现并接入真实保存与导出 |
| --- | --- |
| 画布 | 选择文字、图片、形状；拖动位置与缩放；字体大小、颜色、字重、对齐、透明度；添加、复制、删除对象 |
| 图层 | 上移／下移、显示／隐藏、锁定／解锁，预览与导出使用同一套场景排版代码 |
| 时间轴 | 按真实时长展示缩略图；播放、定位；拖动排序与时长；添加、复制、删除、分割场景；撤销／重做 |
| 配音 | 从真实 PCM 解码绘制波形；音频入点、延迟、音量、静音；口播修改检查；MiniMax 等独立模型重新配音 |
| 素材 | 图片、MP4/WebM、MP3/WAV/M4A 导入；图片加入画布；视频入点裁剪、画布定位与文字覆盖；本地音频替换旁白 |
| 交付 | 本机保存、项目副本、1080p MP4 导出、历史版本播放和下载；原有三路模型连接保留 |

本次在浏览器中实际验证拖动、缩放、时间轴排序、边缘调整时长、分割、撤销重做、保存重载、视频导入、导出播放与下载。详见 [控制面验证记录](assets/control-plane/verification.json) 和 [实现与边界](notes/control-plane.md)。

## 剧情规划与模型预留接口

顶部 **剧情与镜头** 新增故事梗概、角色库与逐镜头规划，可编辑叙事目的、地点、动作、情绪、运镜、台词和提示词。角色可以指定参考图片与独立音色。新增的视频、口型模型配置默认均为“待配置”。

生成任务支持保存请求快照、下载JSON、异步适配器提交／轮询、结果预览和应用到场景；无模型时可关联外部视频，明确标为“手工导入”。角色或镜头变化会使旧请求过期。当前已验证接口合同与手工结果流转，**没有生成新的AI口型或动态视频**。

选择本机项目“映序 · 剧情与模型接入示例”可查看准备好的分镜和任务；[沿用现有素材的回归成片](assets/production/final.mp4) 为67.354秒1080p。原始成片与快照继续保留。

[接入协议与使用说明](notes/generation-adapters.md) · [本轮验证](assets/production/verification.json)

## 这次哪些由 AI 完成

| 环节 | 实际执行 | 人工处理 |
| --- | --- | --- |
| 文案 | 本机官方 Codex CLI 的 `gpt-5.6-sol` 生成六页标题、要点、中文口播、图片提示词 | 修订开场标题和要点；把“拖动排序”修正为实际的前移、后移按钮；修正不自然的分辨率口播 |
| 图片 | 在 Codex 对话中使用内置 Imagegen，独立生成六张纸艺插画 | 将真实生成图导入工作台；统一视频排版 |
| 配音 | MiniMax `speech-2.8-hd`，`Chinese (Mandarin)_Warm_Girl` 音色，真实调用六次 | 改动两段口播后再调用两次，其他四段继续复用 |
| 合成 | 本机 FFmpeg 自动依据实际音频时长编排，生成淡入淡出、文字画面、H.264/AAC 文件 | 审核成片、修正页码与进度条排版，重新导出 |

图片工具没有返回底层模型名称，记录中保留工具来源，没有推测模型标识。完整图片提示词见 [图片来源记录](assets/demo/image-provenance.json)。

## 运行

环境实测：Windows、Node.js 22.15.0、FFmpeg 6.1.3。中文字体使用系统微软雅黑。`@napi-rs/canvas` 固定为已验证的 0.1.80。

```powershell
cd F:/codex_project/1010_codex_project/projects/013-model-video-studio/web
npm.cmd ci
npm.cmd start
```

打开本机地址后，没有本机项目时会从 `assets/demo`、`assets/control-plane` 与 `assets/production` 载入实际作品和剧情规划示例。之后的项目存放于 `web/.local/projects`，不会提交到 Git。启动默认读取 `F:/codex_project/.env.minimax`，可通过 `STUDIO_MINIMAX_ENV` 更换位置；不向浏览器返回 API 密钥。

模型和 FFmpeg 配置详见 [Web 应用说明](web/README.md)。

## 能力与边界

- 支持 Codex 文案、OpenAI 兼容 Chat/Images/Speech、MiniMax 原生图片与配音协议；每一路独立填写地址、模型、密钥与音色。
- Codex 文案由官方 CLI 管理登录，适用于这个本机应用。聊天里的内置图片工具没有网页可调用接口，当前使用“生成后导入”；配置图片 API 后，网页中的完整生成流程才可自动包含图片。
- 已实测的线上模型调用是 Codex 文案、内置 Imagegen 与 MiniMax 配音。其他兼容接口完成本机 HTTP 合同测试，未逐一验证所有第三方服务；协议不同的服务需要增加适配器。
- 当前是场景式视频编辑器，每个场景最多60个画布对象、一个视频画面和一条旁白轨道；最多24个场景，每段1至120秒。视频原声静音，源视频用完后保持最后一帧；视频对象目前为矩形裁切。
- 尚未实现背景音乐混音、复杂多轨剪辑、关键帧动画、字幕逐词对齐、实时协作、录屏或真实动态视频／口型模型推理；已预留自定义适配接口，实际效果待模型接入验证。字幕是可编辑的场景口播文字块。
- AI 默认生成六场景、约75秒的中文介绍；可在时间轴里手动修改时长。原有成片约65秒，新控制面成片约67秒。末场景视频素材是对已有插画做程序化缓慢放大，用于验证视频导入，并非新调用动态视频模型。
- 未部署，服务仅监听本机。没有公开地址。接口失败会报告错误，保留已完成素材，不用占位视频冒充结果。

## 验证与来源

2026-10-11 实际完成：浏览器修改分镜、模型设置提交、播放成片、下载 MP4；下载文件 SHA-256 与成品一致；两份交付视频完成 FFmpeg 整段解码并验证轨道。子项目 `npm.cmd run check` 验证语法、接口地址与凭据隔离、三路 HTTP 协议和服务错误。

- 产品参考：[Google Vids](https://workspace.google.com/products/vids/)，研究时间 2026-10-11；闭源 SaaS，无可固定的上游 tag/commit。Google 品牌与资源未引入。
- Codex 接入：[官方 App Server 文档](https://developers.openai.com/codex/app-server)，CLI 管理认证，不读取或导出其 OAuth 凭据。本地桥接代码改编自仓库项目001。
- MiniMax：[HTTP 配音文档](https://platform.minimax.io/docs/api-reference/speech-t2a-http)、[图片 API 文档](https://platform.minimax.io/docs/api-reference/image-generation-t2i)。
- Node 依赖 `@napi-rs/canvas`：0.1.80，MIT；FFmpeg 是本机已有工具，本项目没有打包分发其二进制。其许可证取决于对应构建，本机版本包含 GPL 组件。

[实验与架构记录](notes/README.md) · [总项目索引](../../README.md)
