# 011 · 图片与素材

| 文件 | 内容与来源 |
| --- | --- |
| `research-overview.png` | 2026-10-12 中文总图，3600 × 5000；八部分覆盖效果、能力、原理、本质、价值、个人项目建议、扩展与验证边界；嵌入以下三张实际截图 |
| `research-overview.svg` | 同一总图的矢量版，正文和流程可缩放，三张截图为内嵌位图 |
| `research-overview-preview.png` | 同一总图的 1440 像素宽预览，不是另一份研究结论 |
| `research-overview-layout.json` | 总图尺寸、日期、截图来源与各行文字位置，用于排版检查 |
| `showcase-desktop.png` | 本地浏览器实际截图：能力说明与作者场景 01 的预测。原图外部加载，不是本机模型推理 |
| `lab-door.png` | 本地浏览器截图：把手在左、估计铰链在右的柜门；自有几何，无模型推理 |
| `lab-drawer.png` | 本地浏览器截图：抽屉平移与表面法线，60 cm 是展示参数 |
| `showcase-mobile.png` | 本地窄屏浏览器截图，是视口验证，不是真实手机测试 |
| `author-video.png` | 本地播放器实际播放作者 73 秒视频的截图，媒体为原站外部引用 |
| `publication-desktop.jpg` | 正式 GitHub Pages 完整研究首页的实际浏览器截图，包含原总图与中文引导 |
| `publication-mobile.jpg` | 正式研究网页 390 × 844 窄屏视口的实际截图，无页面横向溢出；不是真实手机测试 |
| `publication-lab.jpg` | 正式观察台的实际浏览器截图，抽屉滑杆到 60 cm，显示平移轴与说明；不是模型预测 |
| `upstream-teaser.svg` | 原样引入上游 `docs/assets/teaser.svg`，固定 commit `67ccf8765a9c409ad400ae4d6ed151f9449c8ed9`，MIT 文档图 |
| `UPSTREAM-LICENSE.txt` | 上游许可证完整原文，与原始方法图保留 |

本地截图实际验证见 [验证记录](../notes/verification.md)，正式网页截图见 [发布记录](../notes/publication.md)。观察台原始作者图片与视频仍通过外部地址引用，未下载原始媒体文件。网页截图及总图中的裁切包含已显示的作者预测，保留原归属；权利说明见 [THIRD_PARTY.md](../THIRD_PARTY.md)。

总图由 [生成脚本](../tools/build-overview.mjs) 用原生 SVG 文字、流程箭头与已有截图合成，再用 Sharp 导出 PNG；中文与指标是确定性排版。旧浏览器截图虽然使用 `.png` 文件名，内容实际是 JPEG，生成脚本按字节判断媒体类型，不改写原始记录。新总图与预览均为实际 PNG。
