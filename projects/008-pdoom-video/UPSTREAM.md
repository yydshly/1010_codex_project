# 上游版本与素材来源

本子项目保存研究资料与本地 MV 工具。工具仅复用 MIT 基础库的节拍动作公式；PDoomVideo 的歌曲、品牌角色和场景代码未纳入工具。完整上游下载副本应放在已忽略的 `vendor/` 下。

| 来源 | 固定版本 | 授权记录 | 用途 |
| --- | --- | --- | --- |
| [JohnHeibel/PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) | `fa546a38092e75f2b079e6a86d6abc54dd525d17` | package.json 标注 ISC，固定文件树未见独立 LICENSE | 能力分析、源码抽样、研究图像和短片验证 |
| [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) | `0ac8bf2b31942376cb6b8c4074715595d512acd2` | MIT，Copyright (c) 2026 John Heibel；完整原文保存在 [工具声明](web/THIRD_PARTY_NOTICES.md) | `src/clawd.js` 的六种 `move()` 动作改编到 `web/shared/motion.ts`；改为显式参数和 TypeScript，去除 p5 全局依赖 |
| [p5.brush](https://github.com/acamposuribe/p5.brush) | 上游实验使用 PDoomVideo 锁文件；本地最小工具未引入 | 官方仓库有 MIT 说明 | 上游水彩、笔刷和排线原理研究 |

PDoomVideo 的 ISC 元数据不能替歌曲、品牌角色或字体声明授权。上游 README 将歌曲指向 [原歌曲视频](https://www.youtube.com/watch?v=uEB5E67vcPA)，歌词解释指向 [Osmarks 页面](https://docs.osmarks.net/hypha/p(doom)_song_objectively_correct_interpretation)。本研究未验证这些素材可供商业再发行。

`assets/upstream-contact-sheet.jpg` 是 2026-10-10 在固定 PDoomVideo 源码上用 `render.mjs --sheet` 实际生成的九帧联系表，2026-10-11 收录，未改动像素。场景与角色来自 John Heibel 发布的项目，作为效果研究记录保留；本项目不为图像附加新的许可声明。短片保存在忽略的 `out/`，未作为音乐成品发布。

本地工具使用新增的参数化角色、Canvas 场景、程序纹理与原创合成示例伴奏。没有复制原歌曲、歌词或 Clawd 品牌素材。音乐生成源码在 `web/scripts/demo.ts`，示范歌词在 `web/tests/demo.lrc`；示例不包含人声。工具截图与成片抽帧来源见 [素材记录](assets/README.md)。

## 资料入口

- [PDoomVideo 动画指南](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/ANIMATION_GUIDE.md)
- [PDoomVideo 分镜](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/STORYBOARD.md)
- [PDoomVideo 渲染驱动](https://github.com/JohnHeibel/PDoomVideo/blob/fa546a38092e75f2b079e6a86d6abc54dd525d17/render.mjs)
- [ClaudeAnimationBase 配置](https://github.com/JohnHeibel/ClaudeAnimationBase/blob/0ac8bf2b31942376cb6b8c4074715595d512acd2/src/config.js)
- [ClaudeAnimationBase 渲染驱动](https://github.com/JohnHeibel/ClaudeAnimationBase/blob/0ac8bf2b31942376cb6b8c4074715595d512acd2/render.mjs)
- [librosa 0.11.0 节拍检测](https://librosa.org/doc/0.11.0/generated/librosa.beat.beat_track.html)，后续分析候选
- [WhisperX 官方仓库](https://github.com/m-bain/whisperX)，后续对齐候选
- [ffprobe 官方文档](https://ffmpeg.org/ffprobe.html)，媒体探测与核验参考
