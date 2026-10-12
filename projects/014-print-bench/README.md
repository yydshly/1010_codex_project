# 014 · print-bench · Issue 驱动的 3D 模型自动化

完整中文研究网页与既有总图涵盖：上游真实模型效果、Issue→代理→建模工具→检查→PR 的职责分工、已合并案例与本机几何复现、比直接对话省下的工作、现有项目适用场景、Codex 接入和后续扩展。

核心理解：**远端代码仓库 + 自动化触发 + AI 修改源码 + 工具生成与验证 + PR 交付**。Issue 是需求入口；自动化的增量价值是把已有编辑能力组织成后台可重复、可追踪的交付流程。

| 项目资料 | 内容 |
| --- | --- |
| 固定编号 | `014` |
| 上游 | [shaiss/print-bench](https://github.com/shaiss/print-bench) |
| 固定研究版本 | [`74b1f94de6ff536cc29ae233ee9929d3249caa85`](https://github.com/shaiss/print-bench/tree/74b1f94de6ff536cc29ae233ee9929d3249caa85) |
| 研究日期 | 2026-10-11 源码核验与局部复现；2026-10-12 图稿与资料整理 |
| 上游许可证 | 第一方树 CC-BY-SA-4.0；BOSL2 为 BSD-2-Clause，NopSCADlib 为 GPL-3.0；[完整上游声明](licenses/UPSTREAM-CC-BY-SA-4.0.txt) |
| 验证范围 | 上游 Issue / PR / Actions 公开证据，本机 OpenSCAD 最小几何复现；不是本仓库远端全链路运行 |
| 自动化接入 | 尚未接入本仓库，没有新增远端任务、模型凭据或 PR 工作流 |
| 在线演示 | 本项目尚未部署 |

## 中文研究网页

网页提供九主题31段完整摘要、九组固定源码模块、六步职责切换、真实修复案例、适用判断、现有项目候选流程、Codex扩展、23项资料页内阅读和下载。

- [完整中文摘要](notes/research-summary.md)
- [网页运行与交付](web/README.md)
- [发布范围与实测](notes/publication.md)

网页正在准备发布，实际线上版本以发布记录为准；AI修改模型流程尚未接入。

## 一张图

![Issue 驱动的 3D 自动化研究总览](assets/research-overview.png)

- [高清 PNG](assets/research-overview.png)：3600 × 10169，约 3.4 MB，适合放大阅读。
- [可编辑 SVG](assets/research-overview.svg)：文字为矢量、八张原图完整嵌入，来源链接可点击。
- [内容数据](notes/overview-content.json)：可独立修改中文文案。
- [排版脚本](scripts/render-overview.mjs)、[导出清单与图片哈希](assets/overview-export.json)。

八张图包括两张上游模型预览、两张本机孔洞修改前后复现和四张现有项目实拍。颜色区分上游材料、本机证据和待接入方案。原 X 视频作者与项目源码仍未确认，**不把 print-bench 认定为原帖项目**。

## 关键发现

1. 已查版本按小时或手动运行，通过 Python 从 `autonomy-ok` 队列选择一项任务；新 Issue 并不全部立即触发。仓库配置与运行变量共同控制启停。
2. 代理执行 `/ship-issue N`：认领、冻结验收、建分支、改源码、预检与范围审计、开草稿 PR。当前配置使用 Claude Code Action 的框架，从 Z.AI GLM 开始并配置后续模型链；框架与模型供应商是不同层。
3. OpenSCAD 与渲染、几何、网格、试切片工具生成和检查实际资产。GitHub 保存、排队、执行和审查；Pages 是可选的静态展示。
4. [Issue #398](https://github.com/shaiss/print-bench/issues/398) 与 [PR #424](https://github.com/shaiss/print-bench/pull/424) 是真实修复案例。本机最小测试件确认孔顶从 −Z 翻转为 +Z；详见[复现](experiments/teardrop/README.md)。
5. 004 模型素材维护、009 字幕格式修复优先级较高；008 导出回归、013 适配器与配置兼容也有价值，均为待接入方案。固定参数与实验先用脚本；风格、剧情与手感继续对话。
6. [官方 Codex Action](https://learn.chatgpt.com/docs/github-action) 可替换代理，但建模环境、凭据、验收和 PR 步骤仍需自行组织。本项目仅提供方案。

## 图稿重新生成

排版使用本项目资源，不改来源图片像素；裁切与标注由 SVG 展示布局完成。Node.js 22+，需要 `sharp` 和 `@napi-rs/canvas`，可使用 Codex 已提供的运行时包。中文采用系统微软雅黑；其他系统需提供同名字体或修改脚本的字体注册与 SVG 字体。

在根目录执行：

```powershell
$env:CODEX_NODE_MODULES = 'C:\Users\yun68\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
node projects/014-print-bench/scripts/render-overview.mjs
node projects/014-print-bench/scripts/render-overview.mjs --check
python projects/014-print-bench/experiments/teardrop/measure-stl.py
npm.cmd run catalog:sync
npm.cmd run check
```

`CODEX_NODE_MODULES` 是本机包位置，可通过 Codex 工作区依赖工具查询，不是通用安装路径。检查命令核对文字宽度、原图存在性、SVG/PNG 哈希和尺寸。实际结果见[制作与验证记录](notes/infographic.md)。

## 资料

- [研究与来源索引](notes/README.md)
- [原理、价值与证据](notes/research.md)
- [几何复现](experiments/teardrop/README.md)
- [图片来源与授权](assets/README.md)
- [新增材料的授权范围](licenses/ARTIFACT-LICENSE.md)
- [Web 预留说明](web/README.md)
- [总项目索引](../../README.md)
