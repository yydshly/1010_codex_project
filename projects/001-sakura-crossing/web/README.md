# 春日研究街 · 三渲二业务场景演示

## 统一研究手册

先打开 `http://127.0.0.1:5188/research.html`（`npm.cmd run dev:weather`）。新入口为普通网页，初始不启动三维渲染；实拍对照、全部入口、技术原理、模块分工、产品价值、验证边界与完整资料统一接入。页内实时场景一次加载一个，结束或切换时卸载 iframe；晴雨页在不可见时停止帧更新并清空移动输入。

`research.html` / `src/hub/` 使用 `../notes/research-hub.json`，同时读取产品方向数据、历史性能记录和根 `projects.json`。27 份资料和 13 个项目 README 作为构建资源打包，阅读时按需请求，生产目录无需其他开发服务也能读取。跨项目演示链接仍需 012 的 5192/5195 服务和 AI 游戏 5197 服务，不构建或发布这些独立应用。

```powershell
npm.cmd run research:sync   # 数据 → 完整中文汇总 Markdown
npm.cmd run research:check  # 文件、引用、版本、子项目 README 与生成内容一致
npm.cmd run build           # prebuild 同时运行研究内容检查
```

各已有页面补上汇总入口。最小接入代码使用包内 `createMinimalExample`；原场景、模块算法、本地新增实现和素材许可分别保留说明。核对过程见 [统一入口验证说明](../notes/research-hub-validation.md)。

一个独立运行的 Three.js 网页：完整研究街景＋效果图鉴＋真实研究资料。保留上游的分段光照、冷紫暗部、屏幕空间描线、少量外壳描边、调色与 FXAA。模型和纹理由代码生成。

![当前完整街景网页](../assets/business-cover.jpg)

业务流程：告示牌看效果 → 研究商店开门 → 阅读资料 → 本机收藏 → 阅读亭回看或取消收藏。目前只有 1 个实际研究项目，卡片为该项目的能力与产品价值、渲染原理、实验与验证三个章节。

## 晴雨漫游：实际复用 Rain Kit

`weather.html` 把项目 012 的同一个本地安装包接到原樱花街，保留三渲二美术；原主页顶部增加“晴雨漫游”入口。

```powershell
npm.cmd ci
npm.cmd run dev:weather
```

打开 `http://127.0.0.1:5188/weather.html`。原开发服务 5180 也能打开同一页面；5188 为本次独立体验端口，避免占用已运行的研究街。支持 WebGPU 的 Chromium 浏览器可直接体验。晴雨预设、雨滴/涟漪、湿地反射、倒影强度、动画描线与春日调色均可操作；地点按钮进入漫游，Esc 退出。

依赖安装包保存在 `packages/research-rain-kit-0.1.0.tgz`，无需启动或安装项目 012。Three.js 升级并固定到模块要求的 `0.185.1`；原 WebGL 页面仍使用原渲染管线，阴影枚举换成 r185 支持的 `PCFShadowMap`。新增 GPU 材质转换与后处理在 `src/weather/toon-adapter.js`，街景几何仍共用 `src/scene/street.js`。`src/weather/collision.js` 提供此街区的静态墙体，`main.js` 只承担宿主组装与中文控制。

生产构建包含 `dist/weather.html`；运行 `npm.cmd run test:weather` 验证安装包摘要、WebGL / WebGPU 共享核心、原 toon 补丁和街区碰撞。完整实测、来源与可复用边界见 [weather-reuse.md](../notes/weather-reuse.md)。

## 安装与启动

需要 Node.js 22.12 或更新版本；本次使用 Node.js 22.15.0。无环境变量、后端、在线素材或账号要求。

从总仓库根目录进入本项目：

```powershell
cd projects/001-sakura-crossing/web
npm.cmd ci
npm.cmd run dev
```

开发地址为 `http://127.0.0.1:5180/`。端口被占用时会明确失败，不自动切换。macOS/Linux 可以将 `npm.cmd` 改为 `npm`。

技术实验入口为 `http://127.0.0.1:5180/lab.html`，三种场景共用同一组组件，可调整风格、切换 10/50/100 栋建筑、采集和导出性能数据。顶部按钮切换场景，右侧控制风格，页面下方记录一次采样。完整指标定义与验证见 [技术实验记录](../notes/lab.md)。

生产构建与本地预览：

```powershell
npm.cmd run build
npm.cmd run preview
```

生产预览地址为 `http://127.0.0.1:5181/`。关闭终端或按 Ctrl+C 会停止服务器。不能直接双击 `index.html` 运行源码，ES 模块需要 HTTP 服务。

构建输出 `dist/index.html`、`dist/lab.html`、`dist/directions.html`、`dist/builder.html` 和 `dist/overview.html`。技术实验的布局与统计检查命令为 `npm.cmd run test:lab`，搭建器模型、存储与资源检查为 `npm.cmd run test:builder`。构建前自动检查产品方向数据、生成笔记与总览图的一致性。

能力理解与产品方向入口为 `http://127.0.0.1:5180/directions.html`。研究街首页和实验页均已接入；可筛选七种方向、查看待补能力与最小方案、跳转已有视觉场景，并下载中文笔记和 JSON。方向的锚点可直接复制，例如 `directions.html#exploration-game`。

## 研究总览图

`http://127.0.0.1:5180/overview.html` 汇总当前阶段的研究，支持适应宽度、1.5×/2× 放大阅读，下载高清 PNG 与 SVG 源图。SVG 为 1920 × 4474，PNG 为 3840 × 8948，内嵌图片，不依赖在线图片服务。总览内区分上游发布图、本地实拍与 AI 概念配景，原图来源见 [图片说明](../assets/README.md#第六阶段-研究总览图)。

文字内容在 `notes/overview-content.json`，插画生成提示词在 `notes/overview-imagegen-prompt.txt`。`scripts/render-overview.mjs` 使用 Node 内置模块生成 SVG；PNG 导出需要提供可用的 `sharp` 模块路径，本次使用桌面工作区自带依赖，没有新增项目依赖。维护时修改内容数据后生成 SVG 与 PNG，再检查同步：

```powershell
npm.cmd run overview:svg
node scripts/render-overview.mjs --png --sharp-module '<absolute-path-to-node_modules/sharp>'
npm.cmd run overview:check
npm.cmd run build
```

`overview:svg` 仅更新矢量图，内容修改后必须重新导出 PNG。`overview:check` 检查参考笔记存在、内容与 SVG 一致、PNG/SVG 摘要与导出尺寸匹配，已加入构建前检查。网页资源经 Vite `?url&no-inline` 导入，开发与生产子目录均使用构建提供的实际链接。

本次浏览器检查：默认桌面 SVG 正常显示，136 个文字块无横向溢出和面板裁切，放大到 150% 再恢复有效。生产子目录中的旧页入口、SVG 显示、PNG/SVG 实际下载均通过验证；下载文件 SHA-256 与源文件一致。预览服务补充 SVG 的 `image/svg+xml` 类型。390 × 844 仿真下页面没有横向溢出，放大到 200% 后可在图框内横向阅读，再恢复适应宽度；未验证真实触屏硬件。全页实拍见 [overview-browser.jpg](../assets/overview-browser.jpg)。完整图片与代码可作为后续项目研究总览的排版参考；更新组件结构时需相应调整生成器。

## 小镇搭建器

访问 `http://127.0.0.1:5180/builder.html`，研究街、技术实验和理解与扩展页均有入口。添加房屋、树木或道路后自动选中；编辑模式在画布拖动，或用对象清单、坐标、X/Z 按钮移动。每格 1 米，物件限制在 40 × 40 米地面内，最多 60 个。可旋转 90°、删除、撤销和重做。方向键移动，Delete 删除，Ctrl+Z/Shift+Ctrl+Z/Ctrl+Y 管理历史，Esc 取消当前拖动。

切换“环顾小镇”操作镜头与缩放，默认保留分段光照、冷色暗部、描线与调色；可选樱花或林间配色。“保存小镇”写入当前浏览器本机存档，刷新恢复；“重新加载”回到上次保存，刚才的修改可撤销找回。导出 `sakura-town.json` 备份，导入先校验再替换，导入后需手动保存。错误文件不会改变当前小镇。

存储键为 `sakura-town-builder:save:v1`，不同端口和浏览器之间不会自动同步，可用 JSON 搬运。数据格式为 `sakura-town` v1，独立于 lab 测量配置和产品方向描述数据。格式与扩展方法见 [搭建器笔记](../notes/builder.md)。当前允许重叠，没有自动路网、地形编辑、外部模型导入或在线分享；真实触屏设备尚未验证。

`src/builder/model.js` 管理配置、编辑、校验、历史与存储，`world.js` 复用 lab 场景组件并维护拾取代理，`main.js` 管理输入与渲染，`style.css` 管理布局。移动更新已有对象组，删除、主题或类型变化时释放相应资源。

## 一分钟镜头导览

首页街景下方提供 60 秒中文语音与字幕导览：街口告示牌 → 研究商店 → 阅读亭。点击开始后播放本地 MiniMax 讲解音频，相机、字幕与店门状态都从 `HTMLAudioElement.currentTime` 取时间。缓冲或暂停时镜头不会继续跑，讲解声音可静音。

点击暂停/继续可以停下阅读。进度条和章节入口跳到选定时间并暂停，回到街口会恢复关闭的店门，跳到商店会恢复开启状态。自由探索保留当前镜头位置与观察目标，直接拖动或滚轮也会接管；“回到初见”恢复原来的街景全貌。导览结束、打开内容面板、离开街景或切到后台的处理见 [导览记录](../notes/tour.md)。

`src/tour/route.js` 定义路线与状态机，`narration.json` 保存六段中文讲解稿，`audio/subtitles.json` 保存 MiniMax 返回并映射到 60 秒路线的字幕时间戳。`narrator.js` 管理播放、暂停、进度和异步播放竞态；`director.js` 管理相机所有权、入口过渡与界面。运行 `npm.cmd run test:tour` 检查媒体时钟、暂停、回看、自由探索、迟到的播放请求、加载失败、音频摘要与字幕一致性，以及镜头路径。系统减少动态时使用每站固定镜头，真实系统设置分支仍待验证。

音频由 MiniMax `speech-2.8-hd` / `Chinese (Mandarin)_Warm_Girl`（温暖少女）真实生成，MP3 约 961 kB；体验时只播放本地资源，没有运行时 TTS 或密钥。它借鉴桃源的时间线组织思路，没有复制桃源源码或素材，不增加 npm 依赖。

重新生成语音需要本机 `MINIMAX_API_KEY`，可用 `STREET_MINIMAX_ENV` 指定外部配置文件；本机默认入口为 `F:/codex_project/.env.minimax`，同时支持进程环境变量 `MINIMAX_API_KEY` / `MINIMAX_API_BASE`。准备 Node 22 和 PATH 中的 FFmpeg / FFprobe 后执行 `npm.cmd run voice:generate`。脚本逐段调用官方 HTTPS 接口，缓存命中时复用原音频；换讲解稿会产生新的 MiniMax 调用。使用 API 额度，密钥只在本机脚本读取。原始 WAV 与 API 字幕缓存在忽略的 `.cache/tour-voice/`，成品与字幕在 `src/tour/audio/`，脱敏生成记录在 `../notes/tour-voice-generation.json`。改稿或换音色后重新生成并运行 `test:tour`、`build`。

## 研究街操作

| 操作 | 效果 |
| --- | --- |
| 鼠标拖动场景 | 环顾小街，镜头角度有边界 |
| 滚轮 | 靠近或远离，镜头距离有边界 |
| 触屏单指拖动、双指缩放 | 使用 OrbitControls 的触摸控制；真实触屏设备尚未测试 |
| 点击店面、研究商店标签或“开门，逛研究商店” | 卷帘门开启、店灯亮起，展示三个研究章节 |
| 无面板打开时按 E | 关门；再次按 E 开门并浏览资料 |
| 点击效果告示牌或街口入口 | 滚动到效果图鉴，用实拍截图对比完整效果、关闭描线、关闭调色 |
| 点击阅读亭或“我的收藏” | 查看本机清单，可阅读或取消收藏；空清单提供商店入口 |
| 阅读资料、收藏按钮 | 在阅读面板显示真实 Markdown 笔记，收藏同步到卡片、计数与阅读亭灯光 |
| 刷新页面 | 本机收藏保留，镜头与本次体验进度重新开始 |
| 阅读面板中的下载链接 | 下载仓库的完整原笔记；渲染原理和价值章节共享同一份研究原文 |
| Esc 或面板右上角关闭 | 关闭阅读面板，回到网页 |
| 描线开关 | 同时切换屏幕描线与店面外壳描边 |
| 色彩开关 | 切换风格化调色，始终保留正确的 sRGB 输出 |
| 回到初见 | 恢复当前屏幕比例下的初始镜头 |

采用轨道镜头，不依赖鼠标锁定。默认有樱花飘落；用户启用系统“减少动态效果”时，花瓣静止，卷帘门直接切换终态。该系统设置分支已实现，尚未做独立浏览器仿真测试。

## 文件职责

```text
src/
├── main.js                 # 灯光、镜头、输入、动画与 UI 状态
├── business.js             # 商店、阅读面板、收藏与页面入口
├── content.js              # 原笔记、实拍截图与安全 Markdown 阅读器
├── style.css               # 桌面与窄屏界面
├── scene/street.js         # 街道、商店、樱花、天空和 Canvas 纹理
├── lab/
│   ├── main.js             # 场景切换、参数、店门交互和采样导出
│   ├── configs.js          # 三种布局与可复现的组件参数
│   ├── components.js       # 共用组件、实例批次和场景资源释放
│   ├── metrics.js          # 帧间隔、P95 和 CPU 提交统计
│   └── style.css           # 技术实验页与窄屏布局
└── rendering/
    ├── palette.js          # 精简配色
    ├── toon.js             # 分段光照与冷色暗部
    ├── post.js             # 描线、调色、色彩转换与 FXAA
    └── outline.js          # 反向外壳描边
```

研究渲染时先修改 `rendering/`，改造视觉内容时先修改 `scene/street.js`，业务路径在 `business.js`。`content.js` 直接打包项目的真实笔记与旧实验截图，不请求外部内容服务。早期 WebGL 实验使用 Three.js r180；当前依赖固定为 0.185.1，与 Rain Kit 接入版本一致。toon shader 补丁依赖 shader chunk，升级依赖仍需重新检查画面和控制台。

收藏使用键 `sakura-research-lane:collection:v1`，只保存三个已知章节 ID，读取时过滤未知 ID。无法访问浏览器存储时显示临时收藏提示。页面离开街景区域后暂停其绘制；减少动态效果、后台暂停与存储不可用分支仍待独立测试。

## 子目录与部署

`vite.config.js` 使用相对基础路径 `./`，构建资源可以放在规划的 `/1010_codex_project/001-sakura-crossing/` 下。可用本地服务器验证这个路径：

```powershell
npm.cmd run build
npm.cmd run preview:path
```

地址：`http://127.0.0.1:5182/1010_codex_project/001-sakura-crossing/`。该命令只在本机提供静态文件，不执行部署。端口固定为 5182。

同一子目录下的 `lab.html` 是技术实验页，`directions.html` 是理解与扩展页；页面资源、相互入口、下载与许可证链接均使用相对地址。

2026-10-12 已按 [Web 部署约定](../../../docs/web-deployment.md) 发布到 GitHub Pages，根登记表 `demo` 已填写实际验证的 [HTTPS 研究入口](https://yydshly.github.io/1010_codex_project/001-sakura-crossing/research.html)。静态场景与资料在线可用，模型 API 和 012 独立应用仍需本机服务。

## 产品方向内容的复用

统一数据源为 [notes/product-directions.json](../notes/product-directions.json)，内容协议 `schemaVersion: 1`。页面直接读取 JSON，`scripts/sync-directions.mjs` 从同一数据生成 [中文笔记](../notes/product-directions.md)。请修改 JSON 后运行：

```powershell
npm.cmd run content:sync
npm.cmd run content:check
npm.cmd run build
```

| 字段 | 维护约定 |
| --- | --- |
| `schemaVersion`、`updatedAt`、`source` | 保留内容协议版本、实际更新日期、上游固定 commit 与许可证范围 |
| `understanding` | 定位、原理、价值与现有能力边界；随实际完成情况更新 |
| `capabilities` | 用稳定 ID 记录本地已有能力，`evidence` 指向同目录的实际验证笔记 |
| `directions` | 每项包含稳定 `id`、目标用户、问题、流程、基础 `reuse`、缺口 `additions`、最小方案 `mvp`、完成条件 `validation` 与限制 |
| `priority` | `first` 优先探索、`next` 按需求推进、`later` 后期探索；这是推进判断，不是市场评级 |
| `scene`、可选 `demo` | 场景为 `street`、`forest`、`square`；`demo` 仅允许已实现的 `builder.html` 入口 |
| `reuse`、`recommendation`、`references` | 分层复用、接入步骤、推进顺序与具体来源范围 |

新增方向保留已有 ID，并给新方向分配新 ID。网页筛选数量由数据计算；首页摘要沿用同一数据中的研究小镇、搭建器与游戏方向。`content:check` 校验方向与能力 ID、能力引用、场景关联、验证笔记存在和生成笔记同步状态；`prebuild` 自动执行。

运行模块：`src/directions/catalog.js` 提供共同内容和首页摘要，`src/directions/main.js` 负责说明页、筛选、方向选择与 URL 状态，`src/directions/style.css` 负责响应式布局。下载使用构建生成的真实文件，子目录下仍可访问。

产品方向 JSON 是研究描述协议，与技术实验的测量配置、搭建器的运行存档分开；它不能导入搭建器。搭建器已有自己的校验与 JSON 导入，跨页面统一业务动作与持久化接口仍属后续扩展，具体边界见笔记。

## 验证与来源

第一阶段结果见 [实验记录](../notes/experiment.md)，完整业务流程见 [业务场景记录](../notes/business.md)，理解与扩展页的筛选、导航、下载和响应式结果见 [产品方向页验证](../notes/product-directions-validation.md)。Vite 构建有 Three.js 单块约 545 kB 的体积提示；这不是构建失败，仍需要在目标设备上评估加载和运行性能。

上游版本与引入文件见 [THIRD_PARTY.md](THIRD_PARTY.md)，MIT 原文见 [licenses/sakura-crossing-MIT.txt](licenses/sakura-crossing-MIT.txt)。未引入上游音乐。

## AI 小镇游戏

`game.html` 为「樱街守灯夜」，与原研究街、搭建器及导览共存。完整服务：

```powershell
npm.cmd run build
npm.cmd run game
```

打开 `http://127.0.0.1:5197/game.html`。普通 Vite 开发/预览服务不提供模型 API。操作为点击街道 / WASD 移动、E 点灯或领油、Q 摇铃；右侧自然语言命令会改变模型策略。`npm.cmd run test:game` 验证游戏规则，设计和限制见 [AI 小镇说明](../notes/ai-town.md)。

## 完整摘要与静态发布 · 2026-10-12

研究手册首屏采用已生成总览图，新增能力、模块、原理、场景、个人价值与扩展六组摘要、18 个独立段落；原理、模块 API、七方向、27 份资料与证据继续保留。摘要源为 notes/research-hub.json 的 executiveSummary，根登记表的 summarySections 同步使用它，构建前检查两处一致。

必要引用保存在 references/，清单包含 22 个文件与 SHA-256。完整仓库更新原资料后运行 npm run references:sync；独立克隆只需 references:check。发布构建不要求另外 12 个研究项目存在。

GitHub Pages 仅发布本项目静态内容；线上过滤 localhost 体验选项，AI 游戏页显示本机启动说明并关闭模型/开局按钮。模型服务与 012 独立应用仍在本机运行。部署工作流、产物与实际地址管理见根部署说明。

本次发布构建已实际验证：六组摘要、引导图显示与放大入口、资料阅读、搜索和完整摘要下载；390×844 仿真下摘要没有横向溢出。搭建器、导览、天气与游戏检查通过。真实触屏设备仍待验证。

已验证在线地址：[完整研究与体验](https://yydshly.github.io/1010_codex_project/001-sakura-crossing/research.html)。网页引导图由原 PNG 缩放压缩为 WebP，原 PNG/SVG 均保留；重新导出原图后运行 `node scripts/optimize-guide.mjs --sharp-module <sharp-module-path>`，再执行 `npm run guide:check`。该检查已纳入构建。
