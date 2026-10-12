# 005 · 桃源 · 豁然开朗

研究《桃花源记》如何成为可漫游、可暂停与回看的三维长卷。本地研究台提供桃花林、初极狭、豁然开朗三个导览入口，并保留上游全篇播放器与自由探索。

| 项目资料 | 内容 |
| --- | --- |
| 固定编号 | `005` |
| 上游仓库 | [JimLiu/taohuayuan](https://github.com/JimLiu/taohuayuan) |
| 固定研究版本 | [`61567657a5cffd64461d8e00c5907540b733f8dc`](https://github.com/JimLiu/taohuayuan/tree/61567657a5cffd64461d8e00c5907540b733f8dc) |
| 研究日期 | 2026-10-11 |
| 上游许可证 | 未找到整体源码许可证；模型与音频分开记录，见 [来源说明](THIRD_PARTY.md) |
| 研究状态 | 研究中；三段入口、播放控制与自由看景已在本地浏览器验证 |
| 在线研究页 | [完整中文研究与总览图](https://yydshly.github.io/1010_codex_project/005-taohuayuan/research.html)，已部署并验证；原版三维复现仍仅供本地学习 |

## 为什么研究

它把程序化自然场景、文学解释、镜头编排和预录朗读连接起来。值得提取的经验是“统一叙事时间线”：每一幕都有原文、空间位置、镜头和环境状态，读者可以随文推进，也可以暂停、回看和自由探索。

对现有的 001 研究街与小镇搭建器，最直接的延伸是参观路线与内容讲解。后续已在 001 实现街口、商店、阅读亭的一分钟中文导览，见 [001 导览记录](../001-sakura-crossing/notes/tour.md)；小镇搭建器的路线编辑仍未实现。

## 一张图理解桃源

[高清中文研究总览 PNG](assets/research-overview.png) · [可编辑 SVG](assets/research-overview.svg) · [中文内容数据](notes/overview-content.json) · [截图来源与生成清单](assets/research-overview-manifest.json)

2026-10-12 汇总固定研究版本，覆盖原版效果、底层原理、可复用能力、001 实际扩展、使用场景、扩展路线、对研究集的价值与实测边界。图内嵌入 8 张真实截图，明确区分源库已有、本地已实现与未来计划；MiniMax 语音讲解属于 001 本地扩展。PNG 为 4000 × 16308 像素，SVG 的文字与布局可继续编辑，截图已经内嵌。生成方法见 [截图说明](assets/README.md#总览图与复现)。

<details>
<summary>展开中文研究总览图</summary>

![桃源研究总览：原版效果、时间线原理、001 扩展、复用价值与后续方向](assets/research-overview.png)

</details>

## 完整网页与摘要

网页使用上面的既有引导图，展开能力、模块、原理、效果、场景、价值、复用、扩展、证据与发布九个维度。提供高清图缩放、真实截图对照、源码位置、15 项资料搜索与页内阅读，并链接既有 001 在线中文导览。全部 39 段摘要共用 [中文数据源](notes/research-summary.json)，同步到 [完整摘要笔记](notes/research-summary.md) 和根项目登记表，不截断正文。

公开构建使用 `web/dist-public/`，只包含自有静态研究页、图像、中文笔记与固定的 001 证据快照。`web/dist/` 的原版三维演示继续用于个人本地复现。发布状态和线上检查见 [发布验证记录](notes/publication-verification.json)。

在 `web/` 执行 `npm.cmd run build:research`、`npm.cmd run publication:check` 和 `npm.cmd run preview:research` 可在本机检查静态手册。发布前执行 `npm.cmd run research:sync` 后回根目录运行 `npm.cmd run catalog:sync`；构建和资料校验见 [Web 说明](web/README.md)。

## 本地演示

从仓库根目录执行：

```powershell
cd projects/005-taohuayuan/web
npm.cmd run dev
```

打开终端打印的 `http://127.0.0.1:5195/`。首次启动需要 Git、Node.js 22+、npm，以及访问 GitHub 和 npm 的网络；脚本自动取得固定版本并安装、构建。准备完成后再次启动使用本机缓存。端口占用时可以运行 `npm.cmd run dev -- --port=5196`。

三个入口分别从第 3 幕“逢林”、第 9 幕“极狭”和第 10 幕“开朗”开始，之后继续原版后续章节。点击“自由看景”停留在对应景致；点击“全篇导览”从篇首播放。场景内也可切换目录、朗读、字幕、画质与逐章慢读。

“豁然开朗”入口从洞口前的暗处开始，需要几秒走向田野；刚进入时画面较暗是这一幕的设计。鼠标拖动环顾；使用 WASD 前先点击三维画面获得键盘焦点。进入全屏后，按 Esc 返回研究台。

这是个人本地研究用途的上游复现。源码与模型下载到 `web/.cache/upstream/`，产物在缓存和 `web/dist/`，均被 Git 忽略；没有把未明确授权的上游源码、人物和朗读文件作为研究集源码提交。

## 实现范围

- 上游原有：场景几何、自然动画、人物、朗读、28 幕导演、原文播放器、十处景致与漫游。
- 本地新增：中文研究台、三个章节直达入口、外部暂停/继续与自由看景、固定版本获取与缓存、本地音频分段服务器、中文笔记。
- 本地调整：仅在缓存内把构建依赖 `source-map-js` 覆盖到 `1.2.2`；没有改动场景源码、模型或朗读。
- 尚未实现：任意文章自动生成世界、通用镜头编辑器、用户账号、云端进度、多人同步与原版三维公开发布。

## 本地实测截图

![豁然开朗之后的田野与村落](assets/reveal-desktop.jpg)

![桃林导览与暂停播放器](assets/forest-desktop.jpg)

![初极狭的真实山洞](assets/cave-desktop.jpg)

暗处起步的转场截图见 [reveal-before.jpg](assets/reveal-before.jpg)。这些是本机渲染画面，场景来源为上游。真实手机、低性能 GPU 与 Safari/Firefox 尚未验证。

## 研究材料

- [中文研究笔记：能力、效果、原理、场景、扩展与价值](notes/research.md)
- [网页九维完整摘要](notes/research-summary.md)
- [网页摘要数据源](notes/research-summary.json)
- [网页发布与验证记录](notes/publication-verification.json)
- [实验记录：环境、运行验证与限制](notes/experiment.md)
- [上游与本地复现来源](notes/provenance.json)
- [代码、模型与音频来源说明](THIRD_PARTY.md)
- [Web 安装、构建与复现](web/README.md)
- [截图说明](assets/README.md)
- [总项目索引](../../README.md)
