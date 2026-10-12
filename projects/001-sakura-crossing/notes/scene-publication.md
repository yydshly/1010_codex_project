# 联合场景研究与雨夜原创体验 · 发布记录

任务日期：2026-10-12。用户明确要求网页部署与提交远端。本次沿用现有 GitHub Pages 站点，固定 001/012 路径，保留其他已发布项目。

## 本次内容

- 001 使用已生成联合全图的轻量预览作首屏引导；原始 3840 × 20042 PNG 与 1920 × 10021 SVG 保持字节不变，可缩放与下载。
- 六组 34 段联合摘要全面说明两条源库能力、职责模块、GPU/三渲二/交互原理、使用场景、个人价值、宿主责任与扩展；13 个入口、30 份资料保持完整。
- 012 新增九主题 36 段中文研究页，原城市场景实拍、原创雨夜、四模块最小消费者与晴雨樱花街对照、四 API 表、原文阅读和下载均保留。
- 公开 012 原创研究台 `index.html`、`minimal.html` 和 `verification.html`；联合手册按域名提供正确的在线跨项目入口。原库完整城市及独立授权素材仅本机，公开页面不会尝试连接访问者的 localhost；AI 后端不公开。
- 站点首页、项目摘要、Pages 工作流与固定路径组装加入 012，CI 不重新生成图或下载原城市。

## 复用与来源

模块固定 Three.js 0.185.1 / three-mesh-bvh 0.9.13，真实包 SHA-256 仍为 `e72613d271757f8b17c641fd61cdec3f8085bd9a79304ba8990d88a489008643`。源库两个 commit、MIT 原文、独立水珠许可及本地 private / UNLICENSED 边界保留；截图、GPU回读、模型记录与本轮网页验收分开。

## 发布状态

已实际发布 [联合研究手册](https://yydshly.github.io/1010_codex_project/001-sakura-crossing/research.html)、[完整引导图](https://yydshly.github.io/1010_codex_project/001-sakura-crossing/scene-map.html)、[雨夜完整研究](https://yydshly.github.io/1010_codex_project/012-threejs-conference/research.html)、[原创实时体验](https://yydshly.github.io/1010_codex_project/012-threejs-conference/index.html)、[四模块最小接入](https://yydshly.github.io/1010_codex_project/012-threejs-conference/minimal.html) 与 [GPU现场](https://yydshly.github.io/1010_codex_project/012-threejs-conference/verification.html)。首次提交 `9016bef7ac61e58ffde220cf6aaf23fb7aec93bd`，[Actions 38272909139](https://github.com/yydshly/1010_codex_project/actions/runs/38272909139) 的构建和部署均成功。

真实HTTPS已验证完整摘要、跨项目入口、检索、16份原文及API、四张效果图、SVG加载与PNG下载、WebGPU雨夜、雨/反射开关、2.2m第一人称移动、模块释放/重新接入，以及有棚/无棚/恢复三个GPU状态。原PNG/SVG/tgz摘要保持不变。173项初次发布资源中172项HTTP/大小/SHA-256完全一致；清单的46项记录内容一致，平台排序差异已修复并将随验收后发布再次核对。

完整结果见 [网页验收JSON](publication-scene-verification.json)、[逐资源记录](publication-scene-resources.json) 和 [真实GPU结果](../../012-threejs-conference/notes/publication-gpu-online.json)。本轮验收为1280×720桌面，未据此声称手机真机或长期性能通过；图内历史制作状态保留，当前发布范围以网页及本记录为准。
