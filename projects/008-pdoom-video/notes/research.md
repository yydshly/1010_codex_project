# PDoomVideo 能力研究

PDoomVideo 把分镜、角色表演、绘画风格和视频输出组织成可修改的代码。适合研究统一角色的短片制作，以及如何把创作步骤拆成工具模块。

## 定位与能力

上游是《I'm Upping My P(doom)》音乐 MV 的源码。作者说明在 Claude Code 中经历两轮生成，模型编写了分镜和代码；这是作者对制作过程的描述，仓库没有可独立重放的模型调用日志或通用生成服务。[上游 README](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/README.md)

现有动画运行时执行 JavaScript，无需实时语言模型。主角、研究员、道具、九章场景、歌词时间表、镜头运动和输出脚本已经实现。歌曲为固定 `assets/pdoom.mp3`，歌词按起止时间编排；更换素材还需要重新设计剧情和场景。

| 能力 | 已有实现 | 边界 |
| --- | --- | --- |
| 角色 | 颜色、表情、动作、帽子、形变和手持物 | 没有任意图片自动绑定服务 |
| 音乐 | 预设节拍驱动动作，编码时合成歌曲 | 没有自动节拍或音乐段落分析 |
| 歌词 | 时间表显示与高亮 | 按字符长度估算进度，未做声学逐词对齐 |
| 分镜 | 逐镜头计划和对应场景函数 | 没有面向任意歌曲的分镜 API |
| 图片 | PNG 单帧、JPEG 联系表 | 联系表缩小不降低内部画布分辨率 |
| 视频 | 片段 MP4、并行帧序列、已有帧续跑 | 单曲脚本需要抽出素材、时长和作业配置 |

歌词边界见 [lyrics.js](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/src/lyrics.js) 和 [timeline.js](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/src/timeline.js)。原项目 `npm test` 是默认失败占位脚本，不能视为有效测试覆盖。[package.json](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/package.json)

## 视觉效果

画面有水彩晕染、墨线轮廓、纸纹、柔和配色和夸张卡通表演。主角在实验室、舞台、道路和数据中心等场景保持同一形象，通过表情、服装、动作与大小变化承担剧情。九帧联系表验证了选定时刻的静态画面；0.5 秒短片验证了图像和音频编码链路。[实测图像](../assets/upstream-contact-sheet.jpg)

分镜通过同一角色逐步变大、同一舞台不断升级，以及动作承接切换来保持连续叙事；最后回到剧场谢幕。完整运动观感参考 [作者成片](https://www.youtube.com/watch?v=8j-hR4fJywU)。本地抽样不足以证明全部镜头的运动质量或全片音画同步。[分镜来源](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/STORYBOARD.md)

## 模块与数据流

| 模块 | 职责 |
| --- | --- |
| `studio.html` | 加载绘画库和场景，提供时间拖动界面 |
| `src/core.js` | 几何、笔刷封装、插值、相机、纸纹和画面合成 |
| `src/clawd.js`、`src/cast.js` | 主角与研究员的绘制和动作 |
| `src/props.js` | 舞台、温度计、打气筒等共享道具 |
| `src/lyrics.js` | 歌词的起止秒数 |
| `src/timeline.js` | 选择章节与镜头，添加转场、歌词和剧情道具 |
| `src/ch/` | 九章场景，私有辅助函数通过 IIFE 隔离 |
| `render.mjs` | Puppeteer 驱动无头 Chrome，获取帧并调用 ffmpeg |

给定时间 `t`，时间轴选定场景，场景计算角色、相机和道具状态，绘画层生成画面，Chrome 返回图片，最后由 ffmpeg 编码并合成歌曲。[渲染驱动](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/render.mjs)

## 实现原理

**按时间计算状态。** 镜头接收全局时间、镜头内时间和时长，关键帧通过插值与缓动计算位置、缩放、旋转。设计要求画面不依赖上一帧，可以随机访问和乱序分配帧。同一环境下可重复计算是设计目标，跨浏览器、显卡的像素级一致性尚未验证。[时间轴实现](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/src/timeline.js)

**统一角色参数。** `clawd(x, y, u, options)` 接收位置、尺度、身体形变、手臂角度、眼睛、嘴型和配饰。同一绘制函数在多镜头复用，角色身份由几何和颜色配置维持，动作由时间函数驱动。[角色实现](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/src/clawd.js)

**节拍与手绘抖动。** 核心设定为 88 BPM、首拍偏移 0.21 秒，动作使用拍位与衰减脉冲。随机种子按 `floor(t × 12)` 更新，让线条每秒改变 12 次，形体运动仍随时间计算。纸纹和暗角叠加到画面上。[核心实现](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/src/core.js)

**自然笔刷。** p5.brush 提供笔刷、水彩填充和排线，项目封装成 `paint()` 与 `inkLine()`；角色平涂保持清晰，背景和阴影使用水彩。画布使用 WebGL，主要表达仍是二维卡通几何。[p5.brush 官方说明](https://github.com/acamposuribe/p5.brush)

**离线输出。** Chrome 调用 `window.renderAt(t)` 得到图片，ffmpeg 输出 H.264 视频与 AAC 音频。多个 worker 是多个页面分配帧任务，仍共享显卡与内存，不保证线性加速。

## 场景与项目价值

| 场景 | 合适的用法 | 需要补足 |
| --- | --- | --- |
| 技术科普 | 用角色解释训练、优化、反馈等抽象过程 | 中文排版、讲解模板、旁白时间轴 |
| 品牌角色 | 统一形象持续制作系列短片 | 自有角色、动作库与品牌样式 |
| 音乐内容 | 按歌词和节拍组织剧情 | 音乐分析、歌词校时、镜头编辑 |
| 动态绘本 | 连续角色和统一风格叙事 | 长片段节奏、更多角色与互动 |
| 项目展示 | 把研究成果变成短视频 | 研究摘要转讲解脚本和镜头提纲 |

对本研究集，直接价值是增加研究内容的动态表达：樱花街可讲解程序化搭建，像素游戏可展示 AI 观察与操作，模型展柜可生成资产介绍。首个验证样片建议选 20～30 秒、一个自有主角、三个有因果关系的镜头；传播或商业收益没有实测数据。

## 通用基础库与工程限制

[ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase/tree/0ac8bf2b31942376cb6b8c4074715595d512acd2) 抽出了时长、BPM、偏移、通用镜头注册和外部音频参数，并提供角色视角、情绪与检查工具。它有明确 MIT 原文，更适合承接工具实现；本项目已核对源码，未运行其 demo。任意角色、三种画风、JSON 分镜、上传服务和任务管理仍需新增。

本机水彩镜头抽样从 0.548 到 15.295 秒不等，不能原样当作普通网页的实时动画。预览应使用缓存、简化绘制或较低内部分辨率；正式输出使用完整效果。原始坐标固定为 1920×1080，竖屏必须重排构图，歌词按空格分词也需要中文适配。

续跑只检查已有帧是否存在及其大小，工具必须将素材、分镜、角色、画风、分辨率、fps、种子和渲染器版本纳入缓存标识，并在编码前核对帧连续性。字体从 Google Fonts 加载，离线工具宜固定为本地、有授权的中文字体。详见 [实施方案](mv-tool-plan.md)。
