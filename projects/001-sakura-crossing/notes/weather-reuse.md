# 樱花小街 × Rain Kit：晴雨漫游接入

2026-10-11。本地接入与浏览器操作已验证；当前尚未部署。

体验入口：启动 `web/` 后访问 `weather.html`。同一条程序化樱花街，支持晴雨预设、独立雨滴与湿地反射开关、倒影强度、描线和调色对照，以及第一人称漫游。地点按钮可到街口、商店屋檐、阅读亭；WASD / 方向键移动，拖动转头，Shift 快走，C 蹲下，Esc 返回。触屏可拖动视角、按住屏幕方向按钮；真实触屏设备尚未验证。

## 实际复用

直接安装项目 012 已生成的 `@research/rain-kit@0.1.0` tgz，保存于本项目 `web/packages/`，不是复制演示页面或访问另一个开发服务。Three.js 固定为 `0.185.1`，three-mesh-bvh 为 `0.9.13`；`npm ci` 可以独立安装本项目。

```js
import { createWeather, createWetGround, createWalkControls } from '@research/rain-kit';
import { buildModelBvh } from '@research/rain-kit/bvh';
// 主机提供 renderer（await init）、scene、camera 和自己的地面/碰撞体。
const weather = await createWeather({ scene, renderer, camera, enabled: false });
const wet = createWetGround({ scene, y: .027, reflectionStrength: .55, textures });
const walk = createWalkControls({ camera, domElement: canvas, model: streetRoot,
  colliders: [collisionRoot], ground: originalGround });
// 每帧：先移动/更新矩阵 → 天气计算 → 倒影 → 主场景后处理。
```

完整实现见 `web/src/weather/main.js`；这段示意需要宿主变量，并非可直接单文件运行。独立最小场景仍见项目 012 的 `minimal.html` 和包内示例。

## 保留三渲二

街景由原 `src/scene/street.js` 的 `buildStreet()` 构建：建筑、树、花瓣、标线、招牌纹理、配色和店门动画全部共用。新增 `toon-adapter.js` 将原色阶与冷紫暗部计算、外壳描边、深度二阶差分描线和调色翻译为 TSL；原有 WebGL 页面继续保留原渲染方式。GPU 页的渲染实现不同，目标是保持相同美术语言，不主张逐像素等价。

道路顶面为 .025 米；湿地面位于 .027 米，大小为 34 × 5.3 米，标线在 .031/.032 米处，湿地不盖掉标线和台阶。传入道路原色贴图、平坦法线与固定粗糙度，避免把樱花街改成写实黑色柏油。倒影半分辨率、每两帧更新一次；涟漪扭曲量降低，配合动画风格。

晴天预设停止 GPU 雨滴、高度图更新与涟漪，隐藏湿地面并停止倒影；雨天开启雨滴和湿地并稍调光照。之后可以独立开启湿地或关闭雨滴，模拟雨后晴天，也可单独下雨而不加倒影。描线与调色在两种天气中均默认保留。

## 地面与碰撞

共享漫游模块接收原街景可见几何作地面探测。`collision.js` 为商店、背景建筑、告示牌、树干、花箱、亭柱、长椅和街区边界建立简化静态盒体，并通过包内 `buildModelBvh()` 加速墙体射线。商店内部是展示贴图，墙体阻止穿入；阅读亭可进入，长椅与立柱有碰撞。

高度图隐藏天空、碰撞代理；读取原街景表面。它只记录每个 XZ 上最高的表面，属于 2.5D 遮雨，不能完整模拟多层露台、洞穴和强横风。涟漪与水花为循环着色器动画，不是每一颗雨滴的真实流体计算。湿地为单平面反射，不支持任意曲面、屏幕上的水珠或完整水体物理。

## 来源与许可

- 樱花三渲二方法：Kenton-GMI/sakura-crossing，`de01898e89c7f6ab3fad93fa802f0f5ac66fbd81`，MIT，Copyright 2026 Kenton Wang。
- 天气、反射、漫游：项目 012 提取的包，上游 ektogamat/threejs-conference，`8cc20593b2270e2ce832e7b7b44356705daddec4`，MIT，Copyright 2026 Anderson Mancini and Sunag。
- 包的原创水珠模块属于本地研究代码，包整体 `UNLICENSED`，并不自动把所有本地实现重新授权为 MIT；此页没有使用水珠材质。来源细节和 MIT 原文保存在包内 PROVENANCE.md 与 licenses/。
- 原项目音乐未引入。全部新增场景素材使用原项目程序化几何与画布纹理。

## 验证

- `npm run test:weather`：4 项通过。检查 tgz 固定 SHA-256、WebGL/WebGPU 的 Mesh 核心实例一致、r185 原 toon 暗部补丁匹配；实际 BVH raycast 阻止穿店墙，踏上 7 cm 台阶，蹲下保持脚底，关闭控制停止输入，亭前入口保持畅通。
- 原 `test:lab`、`test:builder`、`test:tour` 通过；`test:game` 11 项通过。此处是本地规则、控制与导演测试，没有重新请求 AI 服务。
- 浏览器实际 WebGPU 渲染：晴雨预设切换、雨线/涟漪与倒影独立开关有效，关闭雨保留湿地成立；无运行错误。动画描线、春日调色保持开启。
- WASD 实测：街口按 W 1.5 秒，从 `(-5.90, 1.70, 5.65)` 移动到约 `(-4.68, 1.67, 1.72)`；后续继续前进沿树干侧面绕过。商店屋檐处按 S 3 秒，位置从 `(1.80, 1.76, .65)` 停在 `(1.80, 1.74, .23)`，墙前止步。C 蹲下与恢复有效，Esc 返回原观察视角。
- 阅读亭传送到 `(8.60, 2.01, -1.25)`，脚底在原亭底板 `.36` 米；390 × 844 仿真按住屏幕“向前走”800 ms，移动到约 `(7.25, 1.76, .49)`，跨出亭台阶。按住按钮只验证桌面仿真输入，真实触屏设备仍未验证。
- 390 × 844：文档宽 375（含浏览器竖滚动条后的内容区）、视口 390，无横向溢出；控件全部可达，返回桌面后已清除视口覆盖。
- 截图：`weather-sunny.jpg`、`weather-rainy.jpg`、`weather-walk.jpg`、`weather-mobile.jpg`。均为本地浏览器真实截图。
- `npm run build` 通过，`dist/weather.html` 实际从生产子目录 `/1010_codex_project/001-sakura-crossing/` 加载并运行 GPU 雨滴和倒影；原研究街在该构建中正常呈现，无运行错误。r185 的阴影弃用提示已通过改用 `PCFShadowMap` 解决。
- 实测倒影强度范围 0% → 120% → 55%；描线和调色可关闭/恢复。效果对照见 `weather-reflection-zero.jpg`、`weather-reflection-strong.jpg` 与 `weather-style-off.jpg`。
- 构建按渲染后端分块：共享 Three/WebGL 块约 636 kB、WebGPU 块约 649 kB（压缩前），Vite 有超过 500 kB 的体积提示，构建正常；没有承诺低性能设备预算。
- 根 `npm run catalog:sync` 与 `npm run check` 通过：13 个项目，编号、目录、图片与根 README 一致。

高度图碰撞与 GPU 回读的底层验证沿用项目 012 的提取记录；本页没有执行新的粒子 buffer 回读，不把截图当作新的逐滴物理证明。移动设备性能、长时间 GPU 内存和真实在线部署仍未验证。
