# 来源与许可证记录

## Cadence

- 上游：[muellerberndt/cadence](https://github.com/muellerberndt/cadence)。
- 固定版本：`19bee92756d1842176ad30b1cd01edbfbfa3f14c`，包版本 `0.80.0`。
- GPL-3.0 原文：[licenses/cadence-GPL-3.0.txt](licenses/cadence-GPL-3.0.txt)。
- 通过 `runtime/pyproject.toml` 的 Git 固定依赖安装，`uv.lock` 保留源码来源与解析结果；未把上游仓库或虚拟环境纳入项目文件。
- 本地 `runtime/experiment.py` 与 `runtime/route_experiment.py` 调用 `Brain.compose`、`live`、`wait` 与状态读取接口；不是对算法的 JavaScript 重写。两场景的环境、规则与 Q 基线为本地编写，研究中对架构的描述引用该 commit 下的官方文档和代码。
- `runtime/fish_experiment.py` 调用同一固定版本的 `TemporalPatchNet.observe/imagine` 做监督时序回归。鱼运动环境、差分输入、运动基线、拦截与碰撞、本地 Canvas2D 表现为本地编写，无下载鱼素材或字体。

- `web/applications.html` 与 `web/src/capabilities-data.js` 的模块描述核对同一 commit 的 contracts、learning、reward、temporal、memory、record-patch、belief、interaction 与 api 文档，并链接原文。业务设计是本项目的应用推断，未引入新的上游业务代码或素材；中文笔记由共享研究内容生成。

## Sakura Crossing 渲染片段

来源：[Kenton-GMI/sakura-crossing](https://github.com/Kenton-GMI/sakura-crossing)，固定版本 `de01898e89c7f6ab3fad93fa802f0f5ac66fbd81`，版权 `Copyright (c) 2026 Kenton Wang`，MIT 原文：[licenses/sakura-crossing-MIT.txt](licenses/sakura-crossing-MIT.txt)。通过研究集 001 已调整的本地版本复用。

| 本地文件 | 原始来源 | 本地调整 |
| --- | --- | --- |
| `web/src/rendering/toon.js` | `src/core/toon.js` | 保留分段光照与冷色暗部，沿用 001 对 Three.js r180 的兼容调整；更新来源注释 |
| `web/src/rendering/palette.js` | `src/core/palette.js` | 使用 001 选取的少量基础颜色与本地扩展色 |

四家店、几何 NPC、樱花布局、控制台、奖励环境及比较逻辑为本地编写，没有引入上游完整世界、音乐、角色模型或宣传截图。招牌由 Canvas 与系统字体绘制，无下载字体资源。

## 其他依赖

Three.js `0.180.0`、Vite `8.3.4` 由 `web/package-lock.json` 固定；NumPy `2.5.3`、pytest `9.1.1` 由 `runtime/uv.lock` 固定。依赖包自带许可证按其分发内容保留。

本地新写代码与笔记未另行指定统一许可证。上述来源与许可证分别描述引入内容，不作为整个研究集的统一授权。
