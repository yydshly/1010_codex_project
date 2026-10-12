# 实验与架构记录

研究日期：2026-10-11。本文记录初版“模型可替换＋可编辑分镜＋真实导出”的实验。后续已实现可操作的画布和时间轴，见 [控制面升级与验证](control-plane.md)。

## 数据流

创作说明 → 文案适配器 → JSON分镜 → 各场景图片与配音 → ffprobe实际时长 → Canvas排版 → FFmpeg逐场景编码、合并 → 可播放与下载的MP4。

文案、图片、配音的配置独立。开始任务时复制当前配置，避免生成过程中更改模型影响一半素材。修改口播后，音频来源文本与当前文本不一致时禁止直接导出；生成配音时只重新处理不一致或缺失的场景。

Node处理凭据和本地文件，浏览器只得到公开状态与本机素材链接。视频生成是明确的阶段流水线，不需要额外的自主代理。Codex只有结构化文案输出权限，不允许执行工具或文件操作。

## 实际实验

1. 使用官方Codex app-server模型目录默认的 `gpt-5.6-sol`，一次生成六场景中文分镜。保存AI初稿及用量，具体见 `assets/demo/ai-draft.json`。
2. 内置Imagegen工具分别生成六张纸艺插画，再通过本机图片上传接口导入。它不是本地网页可调用API；来源、输入提示词与完整增强提示词均保留。
3. MiniMax `speech-2.8-hd` 调用六次，口播音色 `Chinese (Mandarin)_Warm_Girl`，速率1.08。FFmpeg合成AI初稿，62.021秒。
4. 实际浏览器编辑场景1、5、6，保存；修正初稿错误描述及口播。重新调用场景5、6配音，未修改场景复用原始文件。修改后视频65.321秒。
5. 发现导出页码与进度条相叠，修正排版后重新导出。未重新调用任何模型。
6. 浏览器实际播放，读取到1920×1080、65.321秒，播放进度向前推进且无媒体错误。通过界面下载，SHA-256与交付MP4一致。两份交付视频完整解码无错误。

## 修复与限制

- 新安装的Canvas 0.1.100在此Windows环境读取生成的RGB PNG时报告 `Invalid SVG image`；0.1.80实际读取和导出成功，因此精确固定并保留锁文件。未声称所有平台都有同样问题。
- 轮询状态时原先每次替换所有图片节点，截图可能捕获未解码画面。改为项目状态改变时才重绘，稳定预览和表单输入。
- 通用兼容Chat、Images、Speech使用本机HTTP服务完成协议测试；未用未配置的第三方模型冒充线上实测。
- 初版没有动态视频生成、多轨混音、自动逐词字幕、拖拽时间轴或协作。这一阶段效果是六页插画介绍短片；新版已补充拖拽时间轴和本地视频导入。

## 来源

- [Google Vids](https://workspace.google.com/products/vids/)：只参考场景工作台思路，闭源产品无tag/commit，未引入素材。
- [Codex App Server](https://developers.openai.com/codex/app-server)：JSON-RPC集成，CLI认证；内部桥接参考本仓库项目001。
- [MiniMax同步配音](https://platform.minimax.io/docs/api-reference/speech-t2a-http)、[文生图](https://platform.minimax.io/docs/api-reference/image-generation-t2i)：接口契约。
- [Canvas源码](https://github.com/Brooooooklyn/canvas)：依赖0.1.80，MIT。
- [FFmpeg](https://ffmpeg.org/)：使用本机6.1.3工具，未分发二进制。
