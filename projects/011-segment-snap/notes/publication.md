# 011 · 网页发布与验收

日期：2026-10-12。用户明确要求整理理解到网页、部署并提交远端。本轮沿用既有 GitHub Pages 站点，目标路径为 `011-segment-snap/research.html`；原观察台保留在同目录 `index.html`。

## 公开内容

九主题36段完整理解、11组职责模块、三模型与几何规则、作者指标和实际截图、训练与推理区别、应用及个人项目价值、五阶段扩展。使用已有 `research-overview.png` / `.svg` 作为引导，不重新生成或修改图像。原页面交互、来源、许可证、研究笔记与原始记录保留；13份资料原样打包，可页内阅读或下载。

公开内容是静态研究与原创原理示意；没有部署上游 GPU 模型、数据上传或机器人控制。跨项目动作接口和 NPC 开门取物属于规划，未接入。作者原始媒体仍外部引用，已保存截图及总图中的作者内容继续保留原归属。

## 构建流程

在 `web/` 执行：

```powershell
npm.cmd run research:sync
npm.cmd run check
npm.cmd run build
npm.cmd run publication:check
```

在根目录执行 `npm.cmd run catalog:sync`、`npm.cmd run check` 和 `npm.cmd run site:assemble`。GitHub Actions 使用同样的子项目检查；CI不下载模型、不训练、不生成引导图。

构建采用逐文件白名单与 SHA-256 清单，保护引导图、原文和资源完整性。部署状态、正式 HTTPS 以及逐文件验收通过后，才把实际地址登记到 `projects.json`。历史图稿与笔记中的未部署保留制作时状态。

## 当前验收

网页、完整摘要和登记详细描述已生成。正式部署及线上验收正在进行；完成后在本文件和 `publication-verification.json` 保存实际版本、Actions、地址、资源与浏览器范围。不得将产物生成等同于已部署，也不得将网页运行等同于上游算法推理。
