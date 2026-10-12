# 截图与来源

截图于 2026-10-11 由本机研究台真实浏览器采集，均为 JPEG。不使用生成图冒充截图。

| 文件 | 内容 |
| --- | --- |
| [forest-desktop.jpg](forest-desktop.jpg) | 桃林导览与暂停状态 |
| [cave-desktop.jpg](cave-desktop.jpg) | 第九幕“极狭”，真实山洞 |
| [reveal-before.jpg](reveal-before.jpg) | 第十幕开始，尚在洞口暗处 |
| [reveal-desktop.jpg](reveal-desktop.jpg) | 走出洞口后的田野、村落与暂停状态；总览图背景及原版效果素材 |
| [preview-desktop.jpg](preview-desktop.jpg) | 构建产物预览，第十一幕 01:40 的字幕、田野与暂停状态 |

`reveal-before.jpg` 与 `reveal-desktop.jpg` 是同一次实际导览的前后画面，后者位于第十一幕“平旷”；不是同一时刻的开关对照。当前只采集桌面窗口，手机与真机未验证。

三维场景、人物与原版播放器来自上游 `61567657a5cffd64461d8e00c5907540b733f8dc`，外围中文研究台为本地新增。来源与使用范围见 [THIRD_PARTY.md](../THIRD_PARTY.md)。

## 总览图与复现

- [research-overview.png](research-overview.png)：4000 × 16308 像素的中文研究总览，覆盖 8 个主题。
- [research-overview.svg](research-overview.svg)：2000 × 8154 的可编辑矢量源，照片内嵌，中文文字保留为文字对象。
- [research-overview-manifest.json](research-overview-manifest.json)：固定版本、截图原文件与 SHA-256、001 图片复制校验、布局边界和产物摘要。
- [overview-content.json](../notes/overview-content.json)：中文内容源；[生成脚本](../web/scripts/render-overview.mjs)根据内容进行分段排版。
- [overview-verification.json](../notes/overview-verification.json)：实际字体测量 231 行无宽度溢出，PNG 完整解码、尺寸与边界检查通过，并逐段查看全部 8 个主题。

图中源库、本地实现和未来方向用三种颜色标注。原版三段、揭示前后与 001 的路线、语音版完成画面均来自本机实拍；只裁切和等比缩放，没有生成图替代场景。截图时间为 2026-10-11，总览编写于 2026-10-12。总图依据已有固定版本研究及实验记录，没有声称重新验证最新上游、完整全篇、真实手机或学习效果。

从本项目 `web/` 目录生成 SVG（零新增 npm 依赖）：

```powershell
npm.cmd run overview:render
```

SVG 使用微软雅黑；其他系统需安装对应中文字体或调整生成脚本中的字体族。PNG 额外需要 Sharp，传入已经安装的包路径：

```powershell
npm.cmd run overview:render -- --png --sharp-module C:/Users/yun68/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp
```

上面的 Sharp 路径是本机实际使用的运行环境，其他电脑应替换为自己的路径。修改内容后应重新生成 PNG；先生成 SVG 会更新清单中的 SVG 摘要，已有 PNG 需额外导出才能一起更新。

网页使用 `research-guide.webp` 作为同一总览图的轻量缩略预览；高清 PNG 与 SVG 保持原图不变。`effect-0.webp`、`effect-1.webp`、`effect-2.webp`、`effect-before.webp` 和 `extension-complete.webp` 按总览内容源的同一裁切坐标从真实截图生成，只用于排版。重新生成运行 `web/` 的 `npm.cmd run media:prepare -- --sharp-module <Sharp 包绝对路径>`；CI 使用已提交文件。

## 001 扩展效果参考

为让 005 的图文材料可以独立查看，下列文件从 001 复制到 `references/`，字节保持一致，来源路径和摘要写入生成清单：

| 当前文件 | 原始来源 | 实际状态 |
| --- | --- | --- |
| [001-tour-street.jpg](references/001-tour-street.jpg) | `001-sakura-crossing/assets/tour-street.jpg` | 街口，前一次字幕版路线实拍 |
| [001-tour-shop.jpg](references/001-tour-shop.jpg) | `001-sakura-crossing/assets/tour-shop.jpg` | 商店，前一次字幕版路线实拍 |
| [001-tour-voice-pavilion.jpg](references/001-tour-voice-pavilion.jpg) | `001-sakura-crossing/assets/tour-voice-pavilion.jpg` | MiniMax 语音版阅读亭实拍 |
| [001-tour-voice-complete.jpg](references/001-tour-voice-complete.jpg) | `001-sakura-crossing/assets/tour-voice-complete.jpg` | 语音版生产预览自然顺播完整 60 秒 |

001 美术与场景依据 `Kenton-GMI/sakura-crossing` 固定版本 `de01898e89c7f6ab3fad93fa802f0f5ac66fbd81`；引入代码保留 MIT 声明，上游音乐未引入。路线、讲解与同步逻辑为本地新增，复用桃源的组织方法，没有复制桃源源码、人物或朗读。详见 [001 导览记录](../../001-sakura-crossing/notes/tour.md)与 [001 来源说明](../../001-sakura-crossing/web/THIRD_PARTY.md)。截图不会扩大原素材授权范围。
