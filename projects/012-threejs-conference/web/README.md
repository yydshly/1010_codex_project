# 012 · Threejs-Punk · 雨夜渲染研究台 Web 应用

[统一研究手册](../../001-sakura-crossing/web/research.html)（本机 http://127.0.0.1:5188/research.html）汇总原城市、原创街区、最小例子、GPU 验证与樱花街实际复用。此页由项目 001 独立构建；012 页面新增返回入口，原城市面板适配源文件在 `adapters/upstream-shell.js`，本机固定上游副本通过原准备脚本同步。

中文实时展示：原库完整城市的中文效果控制面板、带 BVH 碰撞的第一人称漫游、原创十字街区与四观察视角；保留 GPU 高度图、导览、预设和中文技术说明。

新增 [可复用模块包](modules/rain-kit/README.md) 与 [最小接入页](http://127.0.0.1:5192/minimal.html)，天气、湿地、原创水珠和漫游可复制目录或安装本地 tgz；原研究台使用同一实现。

## 本地启动

需要 Node.js 22.12 或更新版本，以及支持 WebGPU 的浏览器。localhost / 127.0.0.1 是浏览器可信本地上下文；远程运行需要 HTTPS。兼容后端以运行时状态为准，本项目主要验证 WebGPU。

```powershell
cd F:\codex_project\1010_codex_project\projects\012-threejs-conference\web
npm.cmd ci
npm.cmd run dev
```

打开 `http://127.0.0.1:5192/`。`dev` 同时准备并启动原库 `http://127.0.0.1:5195/`。首次启动下载固定版本到 `../vendor/` 并安装其独立依赖；没有环境变量或模型 API。仅启动研究台用 `npm.cmd run dev:lab`，仅启动原库用 `npm.cmd run dev:upstream`。

```powershell
npm.cmd run build
npm.cmd run preview
```

生产预览端口 5194。Vite 使用相对资源路径，可放在规划中的 `/1010_codex_project/012-threejs-conference/` 子目录；部署仍未启用。

## 操作

- 选择四种观察视角；拖动场景环顾，滚轮缩放。
- 点击“进入第一人称漫游”；WASD 移动，Shift 快走，C 蹲下，拖动看四周，Esc 返回观察。也可按住方向按钮、切换地点或全屏体验。
- 顶部“原库完整体验”直接进入原库城市；ENTER 后按原库提示操作，左下角可返回研究台。页面切换释放当前场景。服务失败时显示真实启动提示。
- 原库的中文面板可用 P 或左下角按钮展开 / 收起；四个开关调用原库真实控制接口，点击技术名称可读原理，支持单项对照和车身 / 倒影定位。水珠独立于降雨，关闭后清除法线残留；辉光开关同时控制相关镜头光晕。
- 开关四层效果进行真实画面对照。关闭雨后水花、雨丝与地面雨纹关闭；地面湿润和独立水珠可继续观察。
- 雨滴滑块改变可见实例数量。底层缓冲分配与更新规模上限为 5000，不宣称此滑块按比例降低全部计算成本。
- “查看高度图”显示 GPU 渲染的实际高度纹理，颜色从暗到亮对应高度增加。
- 圆形播放按钮开启镜头导览，拖动或再次点击可暂停；“重置”恢复默认状态。
- 原理标签支持左右方向键、Home / End；下方可下载中文笔记。

## 模块

`modules/rain-kit/` 统一维护六个上游算法 / 控制改编及原创天气组合、纹理和水珠。`src/upstream/`、`src/controls/`、`src/effects/` 保留旧路径转接；`src/scene/` 管宿主模型与街区，`scripts/` 管双服务和打包，`adapters/` 放原库兼容代码。原库及素材放在忽略的 `vendor/`，不会复制到研究台 `dist/`。

`npm.cmd run pack:kit` 打包模块并同步中文下载文档；`npm.cmd run test:kit-consumer` 在忽略的 `.kit-smoke/` 安装实际 tgz、检查包导出并构建独立页。包只含源码、独立示例和来源声明，不含 node_modules 或原城市素材。参数与释放责任见 [中文 API](modules/rain-kit/API.md)，实测证据见 [模块提取记录](../notes/module-extraction.md)。

初版检查见 [实验记录](../notes/experiment.md)，升级体验见 [漫游升级记录](../notes/walk-upgrade.md) 与 [原库中文控制接入](../notes/upstream-controls.md)，来源见 [THIRD_PARTY](THIRD_PARTY.md)。`npm.cmd test` 验证碰撞、效果联动、法线关闭、设备光晕预算和固定源码接入。原库通过独立本机服务体验，当前尚未部署。

## GPU 碰撞验证

打开 [本地验证页](http://127.0.0.1:5192/verification.html)，点击“运行 GPU 检查”。它在简化场景中实际运行 1000 个 GPU 粒子，分别加入、移除和恢复雨棚，回读高度纹理与 GPU 位置缓冲。相同页面也会包含在生产构建中。该检查用于验证当前算法分支，不能代替完整城市、多层碰撞或实机性能测试。

- [多 Web 部署约定](../../../docs/web-deployment.md)
- [返回项目说明](../README.md)
