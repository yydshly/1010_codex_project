# 上游与素材来源

核对日期：2026-10-11。

## 主仓库

- 来源：[HyoKong/Segment-Snap](https://github.com/HyoKong/Segment-Snap)
- 固定 commit：`67ccf8765a9c409ad400ae4d6ed151f9449c8ed9`
- 作者：Hanyang Kong、Xingyi Yang。
- 主仓库 MIT 原文保存为 [assets/UPSTREAM-LICENSE.txt](assets/UPSTREAM-LICENSE.txt)，含第三方评估实现与 Volt 的归属说明。
- 引入 `docs/assets/teaser.svg`，原样保存为 `assets/upstream-teaser.svg`，用于研究图示；未引入预测器代码、权重或数据。

MIT 适用于主仓库软件与随附文档。第三方实现和数据另适用提供方条款，不能因此统一视为 MIT。

## 作者效果页

- 原站：[Segment–Snap 项目页](https://hyokong.github.io/segment-snap-page/)
- 页面仓库：[HyoKong/segment-snap-page](https://github.com/HyoKong/segment-snap-page)
- 核对 commit：`f56ef799456c6b41c7d7fc4473415d240b72c2d6`
- 外部引用：两个场景的 `cloud`、`ours`、`gt_axes` 图片；`motion-before.png`、`motion-after.png`；`segment-snap-web.mp4`。

观察台中的原始图片由作者公开页面仓库的上述固定 commit 外部加载，视频由原站加载，未下载原始媒体文件。2026-10-12 制作研究总图时，内嵌了此前实际网页截图中的场景 01 预测裁切，明确标为作者公开结果。权利归原作者及对应内容权利方所有，未把主仓库 MIT 扩展成原站全部媒体的授权。固定图片版本避免内容随主分支变化，外部媒体可达性与离线可用性仍不保证。

公开预测和指标保留作者归属、有利案例选择条件、显示阈值与遗漏说明。视频动画可视化估计运动，不证明实际机器人操作。

## 本项目内容

中文说明、布局、样式、SVG 图标、点云几何与运动示意、静态服务器和构建脚本为原创。研究总图的文字、布局与流程图为本项目内容，柜门与抽屉截图来自自有示意。点云由确定性几何生成，不是上游模型输出。截图来自实际浏览器：早期本地开发验证和本轮正式 GitHub Pages 验证；截图中的作者媒体仍保留原权利与归属。

本研究集尚无统一许可证，不擅自为自有内容指定授权。[来源记录](web/data/evidence.json)
