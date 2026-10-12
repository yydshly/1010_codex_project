# 来源、改动与授权

研究时间 2026-10-11，上游 [ektogamat/threejs-conference](https://github.com/ektogamat/threejs-conference/tree/8cc20593b2270e2ce832e7b7b44356705daddec4)，固定 commit `8cc20593b2270e2ce832e7b7b44356705daddec4`。

Copyright (c) 2026 Anderson Mancini and Sunag。引入的上游算法 / 控制代码按 MIT 改编，原文保存在 [licenses/threejs-conference-MIT.txt](licenses/threejs-conference-MIT.txt)。

| 上游路径 | 包内路径 | 本地改动 |
| --- | --- | --- |
| `src/world/weather/createCollisionHeight.js` | `internal/height.js` | 实例预算、强制初帧、异常恢复宿主渲染状态 |
| `src/world/weather/createCollisionRain.js` | `internal/rain.js` | 原创水花、delta 积分、高楼再生、相机偏移 5 米、容量约束、计算节点释放 |
| `src/world/ground/createGround.js` | `ground.js` | 实例预算、原创程序纹理、纹理借用与所有权、异常恢复、公开对象参数 |
| `src/tsl/rainRipples.js` | `internal/ripples.js` | 保留算法与出处 |
| `src/controls/createWalkControls.js` | `walk.js` | 桌面拖动、无锁定输入、失焦清理、路缘选择修正、自含触屏检测、步长与输入限制 |
| `src/world/bvh.js` | `bvh.js` | 保留 BVH 安装与构建 |

原创内容为 weather 控制组合、参数工具、纹理和水花生成、`droplets.js` 的椭圆水珠、示例场景和中文说明。本地原创部分尚未指定公开发布许可证，因此 package.json 保持 `UNLICENSED` / `private`；不把上游 MIT 自动扩展为整个包的许可。

模块包不包含原城市、Quadra、音乐、HDR、视频、摄影纹理和独立授权的 `surfaceRain.js / rainGlass.js`。原库复杂水珠来自 rocksdanister / BigWings，涉及 CC BY-NC-SA 3.0，该代码继续只在忽略的 vendor 本机副本中运行，没有复制进此包。

运行 peer dependencies：Three.js 0.185.1、three-mesh-bvh 0.9.13，均遵循各自 MIT。打包不包含 node_modules 或 vendor；本地包可安装在其他子项目中，当前没有 npm 发布或公开部署。
