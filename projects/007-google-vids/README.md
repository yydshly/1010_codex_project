# 007 · Google Vids · 实际制作与成品对照

## 2026-10-12 · 公开研究网页

Google Vids 与映序完整研究已经整理为独立静态网页：九维27段完整摘要、12项能力、七个模块、六路模型、六份实际视频、章节跳转、混音对照、声音试听和48份资料。引导图沿用本次生成的总图，可放大和下载；实际成片与原始截图单独保留。

已部署并打开验证：[完整研究网页](https://yydshly.github.io/1010_codex_project/007-google-vids/research.html)。首次部署 [Actions 38236351667](https://github.com/yydshly/1010_codex_project/actions/runs/38236351667) 成功，后续版本与逐项验证记录见 [publication-verification.json](../013-model-video-studio/notes/publication-verification.json)。模型调用、密钥配置、编辑保存与 FFmpeg 渲染仍由本机工作台提供。完整摘要见 [research-summary.json](notes/research-summary.json)，公开范围见 [发布说明](../013-model-video-studio/notes/publication-scope.json)。

在项目013的 web 目录运行 `npm run build:research` 和 `npm run publication:check`，同时生成007与013的 `web/dist-public`；根目录 `npm run site:assemble` 组装全部已发布站点。


已在 Google Vids 中完成《Google Vids 入门》：**中文画面 + 英文 AI 配音**。保留 AI 初稿，再复制文件完成编辑，两个版本均已导出真实 MP4。

| 版本 | 实际结果 | 视频文件 | 可编辑源文件 |
| --- | --- | --- | --- |
| AI 初稿 | 14 场景 / 117.957 秒 | [初稿 MP4](assets/actual-production/ai-draft.mp4) | [01 AI 初稿](https://docs.google.com/videos/d/1oyHS23x97Ps3gZJxRa-GLx9pk-n8vRcvj8ErHmu8Ctg/edit?usp=drivesdk) |
| 人工修改后 | 7 场景 / 69.033 秒 | [成品 MP4](assets/actual-production/edited-final.mp4) | [02 人工修改](https://docs.google.com/videos/d/111u7W3yD5GgeR5QY-mbmcco0uleep6OlMLEcqgJaH4Y/edit?usp=drivesdk) |

两份导出均为 1080p、30 fps、H.264 视频及 AAC 英文音频。原生文件维持私有权限，访问源文件需对应账号权限。

| 项目资料 | 内容 |
| --- | --- |
| 官方产品 | [Google Vids](https://workspace.google.com/products/vids/) |
| 产品性质 | 闭源云服务；不是可安装的开源库 |
| 研究版本 | 2026-10-11 实际操作与官方文档核验；无公开 tag / commit |
| 状态 | 已完成 AI 生成、编辑、预览、两份 MP4 导出与验证 |
| 部署 | 仅本机预览，尚未部署 |

## 直接播放对照

[研究全景图：从 Google Vids 到映序](assets/research-overview.png) 汇总原有效果、本机扩展、底层流程、价值、模板方向与边界。图中小画面是基于实际截图的 AI 视觉参考，原始成片仍以下方 MP4 为准。[总图来源与提示词](../013-model-video-studio/assets/research/overview-provenance.json)。观看页新增全图预览、放大与下载入口，原视频继续保留。

在 `projects/007-google-vids/web` 运行 `npm run dev`，打开 **http://127.0.0.1:4317/actual.html**。

两份视频可播放和下载，点击七个段落可跳转成品，并查看 AI / 人工分工与实际英文脚本。视频保存在项目内，不依赖 YouTube。http://127.0.0.1:4317/ 保留官方公开样片拆解，并提供实际作品入口。

构建：在 web 目录运行 `npm run build`；预览构建产物：`node scripts/serve.mjs --dist --port 4318`。

[Web 说明](web/README.md) · [实际制作记录](notes/actual-production.md) · [验证记录](notes/verification.md) · [生成提示词](notes/production-prompt.txt)。

## 从成品看价值与限制

AI 从提示词生成大纲、中文标题、英文脚本、场景初稿和 Nyla 英文配音，并推荐素材与背景音乐，省去了从空白页面组织第一版的工作。人工选模板，然后核对内容、删重、改标题、清理音轨与控制长度。本次“人工修改”由我操作 Vids 编辑器完成。

提示词要求约 75 秒、6 个场景，实际初稿约 118 秒、14 个场景。删除重复场景后，还需清理残留旁白；自动字幕也有少量英文识别错误。初稿可继续编辑，但生成完成仍需内容与播放审核。

片段在编辑器中标为 Getty Images 素材，音乐来自 Shutterstock，由 Vids 推荐选入，不等于所有画面都是 AI 新生成。本次未生成 AI 人物或 Veo 片段；人物能力可另看 [官方实际口播样片](https://www.youtube.com/watch?v=X2G3utAQuAU&t=32s) 和原观看页。

## 官方产品边界

以下为 2026-10-11 官方规则摘要，套餐与产品更新可能改变：

- Vids 文档最长 30 分钟；单个 AI 人物片段最长 60 秒。
- 一个文档最多 50 个视频对象、50 个音频对象。
- AI 配音脚本最多 2,500 字符，官方支持语言列表当前未列中文。本次采用中文画面与英文配音。
- 免费个人账号当前每月 50 AI 积分；“Help me create”每次 5 积分，AI 配音每次 1 积分。预设 AI 人物与 AI 视频片段合计每月 6 次生成。
- 功能依赖账号套餐、地区和管理员设置。本次已验证当前账号的初稿与导出，没有实测积分扣减、多账号覆盖或连续多次生成稳定性。

来源：[时长与对象限制](https://support.google.com/docs/answer/16286470?hl=en)、[AI 人物](https://support.google.com/docs/answer/16334946)、[AI 配音](https://support.google.com/docs/answer/15070345?hl=en)、[账号与额度](https://support.google.com/docs/answer/15609411?hl=en)。

## 材料与版权

[截图与视频目录](assets/README.md) · [来源与许可](THIRD_PARTY.md) · [总索引](../../README.md)。

页面使用原生 HTML/CSS/JavaScript 与 Node.js 内置模块，无第三方代码依赖，未引入 Google 产品代码。

