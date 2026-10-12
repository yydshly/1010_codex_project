# 来源、改动与授权

研究版本：[ektogamat/threejs-conference @ 8cc20593b2270e2ce832e7b7b44356705daddec4](https://github.com/ektogamat/threejs-conference/tree/8cc20593b2270e2ce832e7b7b44356705daddec4)，核对日期 2026-10-11。

## 实际引入的上游代码

Copyright (c) 2026 Anderson Mancini and Sunag。MIT 原文保存在 [licenses/threejs-conference-MIT.txt](licenses/threejs-conference-MIT.txt)。

| 上游文件 | 本地文件 | 改动 |
| --- | --- | --- |
| `src/world/weather/createCollisionHeight.js` | `modules/rain-kit/internal/height.js` | 保留高度 / 坐标算法；改为实例预算、强制初帧、异常恢复渲染状态 |
| `src/world/weather/createCollisionRain.js` | `modules/rain-kit/internal/rain.js` | 原创水花替代图片；delta 积分、局部雨区、高楼再生、偏移缩小、GPU 回读、容量约束与计算节点释放 |
| `src/tsl/rainRipples.js` | `modules/rain-kit/internal/ripples.js` | 保留算法，增加完整出处 |
| `src/world/ground/createGround.js` | `modules/rain-kit/ground.js` | 原创程序纹理；镜像 / 裁剪 / 混合保留；实例预算、贴图所有权、异常恢复与对象参数 |
| `src/controls/createWalkControls.js` | `modules/rain-kit/walk.js` | 保留探测 / 滑行 / 速度 / FOV / 蹲下；桌面拖动、无锁定输入、失焦清理、路缘选择、独立设备检测与步长限制 |
| `src/world/bvh.js` | `modules/rain-kit/bvh.js` | 保留 BVH 安装与构建，增加出处注释 |

旧 `src/upstream/`、`src/effects/` 和 `src/controls/` 路径是兼容转接，实现统一由模块包维护。包内保留 MIT 原文；独立中文说明与逐项来源见 [Rain Kit PROVENANCE](modules/rain-kit/PROVENANCE.md)。包不含原城市素材或独立授权的复杂水珠；本地 tgz 只打包模块源码、示例和说明。

发布代码不是完整上游检出。原创实验不包含作者城市、Quadra、音乐、HDR、视频和摄影纹理。为了本机完整体验，固定原库下载到了忽略的 `vendor/`；该服务会使用原素材，未把素材复制到跟踪的 `web/public/` 或研究台构建中，也未推断其属于 MIT。

## 原库本机运行适配

`scripts/upstream.mjs` 固定下载 commit `8cc2059…`，记录 `vendor/SOURCE.json`。调整 Vite 8.3.4、localhost HTTP / 5195，省略部署 CLI 与 SSL 插件安装。兼容模块包括：原视频经 CanvasTexture 12 FPS 上传、此处的 BVH 控制器改编、鼠标锁定失败时的拖动提示，以及原创中文操作说明与返回研究台入口。模型、原 TSL 水珠、烟雾、云、飞行器与后处理保留。

完整体验中的 `public/` 素材与原 `surfaceRain.js` 仍受各自授权约束。副本用于本机研究，没有公开部署或声称允许再分发；下载脚本与兼容代码可以记录，素材继续忽略。

新增 `adapters/upstream-shell.js` / `.css` 和 `upstream-effects.js` 为原创中文面板和控制桥。`scripts/patch-upstream.mjs` 在固定 `src/main.js` 接入真实 `world`、`pipeline`、相机和性能配置。控制桥包装 `syncProximity`，使水珠独立于降雨，并把车漆 / 玻璃法线强度按有效水珠强度缩放；关闭或距离淡出时消除原来残留的法线扰动。没有复制或改写 CC 授权的水珠图案到跟踪目录，也没有新增渲染通道。

## 原创实验的水珠图案

上游 `surfaceRain.js` 改编自 [rocksdanister/rain](https://github.com/rocksdanister/rain)。其 [LICENSE](https://github.com/rocksdanister/rain/blob/threejs/LICENSE) 指明 Creative Commons Attribution-NonCommercial-ShareAlike 3.0，并记录 BigWings / Martijn Steinrucken 的 Heartfelt 来源。

原创实验 **未复制** `surfaceRain.js`、`MovingDropLayer`、`CarDrops` 或 `rainGlass.js`。`modules/rain-kit/droplets.js` 独立编写椭圆掩码与周期滑动，提供 UV、材质和强度参数，并修正 TSL 颜色节点；`src/effects/droplets.js` 保留旧参数转接。完整原库副本保留原图案及其原授权。

## 本地原创内容

原创实验的街道、雨棚、车辆、招牌、纹理、水花、页面与中文说明由本地代码创建。原库的 `public/` 资源只在忽略目录内下载与运行。

## 运行依赖

- [Three.js](https://github.com/mrdoob/three.js)：MIT；使用节点材质、WebGPU renderer、OrbitControls、RoundedBoxGeometry 与 Bloom。
- [Vite](https://github.com/vitejs/vite)：MIT；仅用于本地开发与静态构建。
- [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)：MIT；行人碰撞的加速射线查询。
- [GSAP](https://github.com/greensock/GSAP)：仅在原库独立依赖中安装，遵循其自身许可证。

本地原创代码尚未另行指定发布许可证；不将上游 MIT 自动解释为覆盖整个研究仓库。
