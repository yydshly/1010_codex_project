# Google Vids 实际制作记录

日期：2026-10-11。用户选择：Google Vids 入门，中文画面 + 英文 AI 配音，目标约 60–90 秒。

## 已完成的交付

| 版本 | 原生 Vids | MP4 | 实测时长 | 场景 |
| --- | --- | --- | --- | --- |
| AI 初稿 | [01 AI 初稿](https://docs.google.com/videos/d/1oyHS23x97Ps3gZJxRa-GLx9pk-n8vRcvj8ErHmu8Ctg/edit?usp=drivesdk) | [ai-draft.mp4](../assets/actual-production/ai-draft.mp4) | 117.957 秒 | 14 |
| 编辑版 | [02 人工修改](https://docs.google.com/videos/d/111u7W3yD5GgeR5QY-mbmcco0uleep6OlMLEcqgJaH4Y/edit?usp=drivesdk) | [edited-final.mp4](../assets/actual-production/edited-final.mp4) | 69.033 秒 | 7 |

两份 MP4 均由 Google Vids 生成与渲染导出：H.264，1920×1080，30 fps；AAC，44.1 kHz，双声道；另含可选英文字幕轨。初稿 10,670,095 字节，成品 5,999,262 字节。导出后没有本地剪辑、重新配音或重新编码；仅提取封面帧作展示。完整元数据和 SHA-256 见 [export-metadata.json](export-metadata.json)。

## 实际生成过程

1. 在已登录的 Google Vids 新建独立视频，进入 File → Storyboard。
2. 提交 [实际提示词](production-prompt.txt)：约 75 秒、六个主题场景、中文画面、英文 AI 旁白。没有使用用户原有文件作参考。
3. AI 将标题与说明拆成十二项，完整保留 [AI 大纲](ai-outline.txt) 和 [截图](../assets/actual-production/01-ai-outline.jpg)，没有人工重写大纲。
4. 人工选择官方绿白几何设计模板，点击 Create the draft video。
5. 实际生成十四个场景、117.9 秒的初稿，含中文文字、英文脚本、Nyla（Soft, higher pitch）AI 配音、素材库片段、背景音乐和转场。

[观察记录](generation-observation.json) 从点击创建到第一次观察到完成约 94 秒，包含界面检查延迟，只代表这一次观察，不是服务端性能或稳定性基准。初稿超出指定时长与场景数，部分内容重复，最后还有空白场景。

## 在 Vids 中实际完成的编辑

复制初稿为独立 Vids 文件后，由我操作编辑器完成：

- 删除原第 14 场景空白结尾，删除原第 7–12 场景重复介绍；保留原第 1–6 场景及第 13 场景结尾，最终七个场景、69.0 秒。
- 删除场景后，相关旁白仍残留在结尾附近。逐项删除六段重复配音，保留七段英文 AI 旁白，清除这些重复音轨的重叠。
- 在原有文字对象上改写六处中文标题，保留模板字体、布局、转场和辅助文字。
- 预览完整 1:09 视频，实际播放到结尾停止；导出 MP4 并完整解码检查。

| 成品场景 | AI 原文 | 修改后 |
| --- | --- | --- |
| 2 | 从想法到成品 | 从想法到可编辑初稿 |
| 3 | 先明确目标 | 明确受众、用途与材料 |
| 4 | AI 辅助生成初稿 | AI 先出初稿 |
| 5 | 你来完成最终编辑 | 你来核对与编辑 |
| 6 | AI 配音与导出 | 英文 AI 配音与导出 |
| 7（原 13） | 你的创作，由你掌控 | AI 起草，你来把关 |

[标题修改明细](applied-title-edits.json) · [编辑器截图](../assets/actual-production/04-edited-video.jpg) · [成品画面概览](../assets/actual-production/edited-contact-sheet.jpg) · [实际 AI 英文脚本](final-ai-narration.txt)。

旁白脚本与声音沿用 AI 初稿，没有人工重写或真人录音。主题、受众、语言、目标时长与模板由人工选择；大纲、标题、脚本、场景组织和英文配音由 Vids AI 生成；剪辑去重、标题纠正、音轨清理由人工操作。

## 素材、字幕与验证边界

编辑器标注片段来自 Getty Images，背景音乐来自 Shutterstock，是 Vids 推荐选入的素材，不是所有画面都由 AI 新生成。本次未使用 AI 人物或 Veo 片段。

导出的可选英文字幕有少量转录错误，例如 reins → rains、Human-led → Human lead、Once satisfied → One satisfied。[edited-captions.vtt](../assets/actual-production/edited-captions.vtt) 是原样提取的证据，并未人工校对。这份字幕没有烧录进中文画面；如果启用字幕发布，需要逐句纠错。

本轮核对了脚本、音轨时间线、实际播放进度、导出帧及完整媒体解码，没有声称已完整审听音色与发音。没有测量积分扣减或进行多账号、多轮生成测试。

浏览器“下载 MP4”显示导出完成，但自动化会话没有拿到下载事件。最终通过已连接 Google Drive 对两份原生 Vids 流式导出 video/mp4，并保存至本项目；没有本地拼接视频来替代 Vids 成果，没有保存临时下载凭证。

未改动用户原有 Vids 文件，未改变分享权限或发布到 YouTube。两份新建视频维持私有权限；观看页仅本机运行，尚未部署。

