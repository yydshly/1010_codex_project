# 来源与授权

## 研究对象

- 上游：https://github.com/cclank/jevclip
- 固定版本：`3d4b13f6ecbb7f56cf212c5040b4b4e19d83967a`
- 包版本：`0.1.1`；开发状态 Alpha。
- 许可证：MIT，版权 `Copyright (c) 2026 jevclip contributors`。
- [许可证副本](licenses/UPSTREAM-MIT.txt)。上游代码供源码分析与独立测试使用，未将其 Python 源码复制入本项目。

## 本地实现和素材

`web/src/` 是受上游工作流启发的原创浏览器实现，采用关键词规则和原文摘录，不声称复现 Jev 模型。`assets/demo.mp4`、`assets/demo.srt`、`web/src/sample.mjs` 为原创合成演示材料，无真人、无第三方视频或配音。素材生成脚本在 `web/scripts/`。

网页使用系统字体，没有 CDN 字体、图标库或分析服务。生成合成视频时用到本机 Pillow、ffmpeg 和系统中文字体，仅用于构建自有素材，不分发这些工具或字体文件。

本仓库尚未为自有研究文字与代码统一指定许可证。MIT 适用于上游，不自动覆盖本项目原创部分。
