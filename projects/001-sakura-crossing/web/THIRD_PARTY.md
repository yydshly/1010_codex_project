# 上游来源与许可证

## 晴雨漫游新增来源（2026-10-11）

`src/weather/main.js` 直接导入项目 012 提取的 `@research/rain-kit@0.1.0`，本地 tgz 保存在 `packages/`，SHA-256 为 `e72613d271757f8b17c641fd61cdec3f8085bd9a79304ba8990d88a489008643`。天气、地面反射、漫游与 BVH 源于 [ektogamat/threejs-conference](https://github.com/ektogamat/threejs-conference)，固定 commit `8cc20593b2270e2ce832e7b7b44356705daddec4`，Copyright (c) 2026 Anderson Mancini and Sunag，MIT；原文与细节保存在安装包内 `licenses/threejs-conference-MIT.txt` 和 `PROVENANCE.md`，本研究集说明见 [012 来源记录](../../012-threejs-conference/web/THIRD_PARTY.md)。没有引入原雨夜街区模型或贴图。

`src/weather/toon-adapter.js` 将本项目原有三渲二色阶/冷色暗部、外壳描线与深度二阶差分/调色翻译成 TSL，继续保留 Kenton Wang 的 MIT 来源。`collision.js`、晴雨 UI、道路适配与接入代码为本地编写。场景复用原本地 `buildStreet()`，没有引入外部素材。

Rain Kit 包内还包含本地原创水珠算法，包整体标记 `UNLICENSED`，不代表将所有本地文件重新授权为 MIT；本页未使用水珠材质。Three.js `0.185.1` 与 three-mesh-bvh `0.9.13` 为 npm 依赖，各自保留包内许可证。

## 原樱花三渲二来源

本地实验参考 [Kenton-GMI/sakura-crossing](https://github.com/Kenton-GMI/sakura-crossing)，固定研究版本为 `de01898e89c7f6ab3fad93fa802f0f5ac66fbd81`，研究日期为 2026-10-10。

| 本地文件 | 上游文件 | 本地调整 |
| --- | --- | --- |
| `src/rendering/toon.js` | `src/core/toon.js` | 保留色阶与冷色暗部；移除 Three.js r180 不支持的 `MeshToonMaterial.flatShading` 参数，平面法线由场景几何生成；技术实验新增补丁匹配诊断 |
| `src/rendering/post.js` | `src/core/post.js` | 保留深度二阶差分描线、调色、FXAA；新增有效的调色开关，关掉调色仍执行 linear → sRGB；内部像素预算减为 260 万；技术实验新增实时风格参数接口 |
| `src/rendering/outline.js` | `src/core/outline.js` | 保留反向外壳描边方法；仅在少量店面边框和实验招牌上使用；释放材质时移除分辨率更新引用 |
| `src/rendering/palette.js` | `src/core/palette.js` | 选取少量基础颜色，补充本地场景颜色 |

上述引入代码适用上游 MIT 许可证，原始版权声明为 `Copyright (c) 2026 Kenton Wang`。完整原文保留在 [licenses/sakura-crossing-MIT.txt](licenses/sakura-crossing-MIT.txt)，使用、修改或分发这些代码时应一并保留。

本地新写的场景、控制、界面和中文研究笔记未另行指定许可证；总研究集也未统一指定许可证。上述 MIT 声明不能自动扩展为整个研究集的授权。

能力理解、七种产品方案与扩展描述由本研究独立整理，新增页面沿用本地实验截图，不引入新的外部模型或音乐。WorkAdventure 官方文档仅作空间交互产品形态参考，未引入其代码或资源。

运行演示未引入上游 `public/audio/` 音乐或完整世界模型。第六阶段研究总览另外保存了固定上游版本的 README 发布图，具体来源见下方。本地场景纹理通过 Canvas2D 生成，樱花、云与建筑由几何体组合。招牌使用系统字体，不下载或分发字体文件。

第二阶段新增的 `src/business.js`、`src/content.js`、告示牌、阅读亭、背景建筑、网页结构与收藏流程均为本地编写。网页效果图鉴只使用第一阶段本地实拍图片；研究章节直接引用本项目 Markdown 文件，构建时打包原文与下载文件。没有增加第三方场景模型或截图素材。

第三阶段新增 `lab.html`、`src/lab/`、`scripts/check-lab.mjs`，共用组件、布局配置、风格工作台与性能采样均为本地编写。房屋、树木、水景与道具通过基础几何生成，店铺招牌通过 Canvas2D 和系统字体生成，没有新增第三方模型、图片或字体。

第五阶段新增 `builder.html`、`src/builder/` 和 `scripts/check-builder.mjs`，编辑模型、拾取、拖动、历史、本机存档、JSON 校验与界面均由本地编写，继续复用本地 lab 场景组件与上述渲染代码。组件生成器增加可关闭地面/花瓣及独立路径朝向的选项，默认行为保持供实验页使用。没有新增外部模型、图片、音乐或字体，搭建器图片为本地网页实拍。

第六阶段的研究总览保留上游作者发布图的原文件：`assets/upstream-crossing.jpg` 对应固定 commit 下 `docs/hero-1-crossing.jpg`，`assets/upstream-shopping-street.jpg` 对应 `docs/hero-2-shotengai.jpg`。来源为 [上游固定版本](https://github.com/Kenton-GMI/sakura-crossing/tree/de01898e89c7f6ab3fad93fa802f0f5ac66fbd81)，作者 Kenton Wang；仓库许可证原文继续保留。图中明确标为上游发布效果，不作为本地漫游实测证据，第二张仅作补充存档。图中本地画面来自本项目实拍的场景局部。

`assets/overview-banner.png` 是内置 ImageGen 按上游和本地风格参考生成的概念插画，不是运行截图；提示词保留在 `notes/overview-imagegen-prompt.txt`。总览文字、排版、生成脚本与查看页为本地编写，没有引入外部模型、音乐或字体文件。SVG 使用本机中文字体，PNG 是本次实际栅格导出。

依赖：Three.js `0.180.0`、Vite `8.3.4`，均通过 npm 安装并由 `package-lock.json` 固定；各包许可证随其分发内容保留。固定 Three.js 版本是因为着色器补丁依赖其 shader chunk 文本，升级时需要检查补丁和画面是否仍有效。

2026-10-11 新增一分钟中文镜头导览：`src/tour/`、`scripts/check-tour.mjs`、中文字幕和界面均为本地编写。思路参考 [JimLiu/taohuayuan](https://github.com/JimLiu/taohuayuan/tree/61567657a5cffd64461d8e00c5907540b733f8dc) 的章节、镜头与统一故事时钟，固定研究版本 `61567657a5cffd64461d8e00c5907540b733f8dc`；未引入其源码、模型、录音或纹理。新增截图来自本地研究街实际渲染。

同日新增 `src/tour/audio/tour-zh.mp3`：由 MiniMax 官方 API `speech-2.8-hd` 使用系统音色 `Chinese (Mandarin)_Warm_Girl`（温暖少女）真实生成。六段讲解稿为本研究原创，没有克隆人物声音；字幕取自同次 API 返回。原始音频补静音后串接为 60 秒路线，详细请求、trace ID、时间戳和 SHA-256 见 [语音生成记录](../notes/tour-voice-generation.json)。素材属于 AI 合成讲解，不是上游录音；适用 MiniMax 服务条款与用户账户授权，本研究未额外授予公共素材许可，不能套用上游 MIT 声明。生成脚本只在本机读取配置，网页播放不调用 MiniMax，不包含密钥。

2026-10-11 新增 `game.html`、`src/game/` 和 `scripts/town-server.mjs`：守灯规则、人物、花灯、纸灵、萤火和 UI 均为本地编写，复用本项目组件库与上文标注的渲染模块。`scripts/town-providers.mjs` 改编自研究集项目 003 的本地模型桥接代码，使用官方 Codex CLI 协议，不复制认证令牌；MiniMax 请求为官方 HTTPS API。新增模型输出与运行截图明确作为本地验证材料，未引入外部游戏角色、音乐或字体。
