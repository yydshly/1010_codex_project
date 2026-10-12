# 011 · 三维交互理解观察台 Web

无第三方依赖的 HTML、CSS、原生 JavaScript 展示页。图片引用作者公开页面仓库的固定版本，视频引用原站；柜门与抽屉是自有 SVG 几何示意，无模型推理。

完整研究入口为 `research.html`：九主题36段、11模块、五阶段扩展、原图缩放和13份原文阅读下载。`index.html` 保留原观察台，两页互相导航。统一内容源在 `../notes/research-summary.json`，维护时运行 `npm.cmd run research:sync`，然后同步根目录索引。

## 运行与构建

需要 Node.js 22 或更新版本，无须先安装依赖：

```powershell
cd projects/011-segment-snap/web
npm.cmd run dev
```

本地入口：`http://127.0.0.1:5191/`。

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run publication:check
npm.cmd run preview
```

构建输出为 `web/dist/`，构建预览为 `http://127.0.0.1:5192/`。预览服务器还支持发布子目录 `http://127.0.0.1:5192/1010_codex_project/011-segment-snap/`；页面资源采用相对路径。[正式研究网页](https://yydshly.github.io/1010_codex_project/011-segment-snap/research.html) 已通过 GitHub Pages 部署；实际验收见 [发布记录](../notes/publication.md)。

可在运行前设置 `$env:PORT = '5211'`。若默认端口被其他项目占用，选择空闲端口，不停止其他项目。本次构建预览实际使用 5211，默认 5192 已被其他进程占用。服务器只绑定 `127.0.0.1`；不需要凭据或环境密钥。

## 文件职责

| 文件 | 职责 |
| --- | --- |
| `index.html` / `styles.css` | 中文内容、来源标注与响应式布局 |
| `app.js` | 场景切换、外部图片加载状态与视频弹窗 |
| `lab.js` | 原创点云几何、把手位置规则与运动示意 |
| `data/evidence.json` | 固定版本、来源、指标和验证边界 |
| `scripts/serve.mjs` | 本地服务器，开发时将项目 `assets/` 映射到 `/assets/` |
| `scripts/build.mjs` | 白名单复制两页资源、原图与13份原资料，生成发布记录和逐文件 SHA-256 清单 |
| `scripts/check.mjs` | 本地引用与证据标注检查 |
| `research.html` / `research.css` / `research.js` | 完整理解、检索、展开、引导图缩放、原文阅读 |
| `scripts/research-sync.mjs` | 从统一数据同步网页、完整摘要和011登记详细描述 |
| `scripts/publication-check.mjs` | 原图固定哈希、全部资源、原文及跨页锚点检查 |

场景切换有加载状态，失败提供原站入口。视频由用户播放，关闭弹窗暂停。原理动画不自动播放，并遵循减少动态效果偏好。

页面增加推荐观看顺序、三个模型职责、几何铰链选择的三步说明与应用扩展方向。原理入口为 `/#method`，交互示意为 `/#lab`，应用价值为 `/#value`。

当前主线是原理与价值研究：`/#essence` 展示操作语义、关系消歧与学习和约束的分工；应用部分优先讨论已有程序化场景的对象、动作和反馈接口。模型安装与复现不在当前范围，作者结果与本地示意仍分别标注。

`/#overview` 展示一张八部分完整研究总图，可展开、收起、查看高清 PNG 和下载 SVG。总图采用已有实际截图与确定性流程绘图，生成方法见 [工具说明](../tools/README.md)，无需安装模型或 Sharp 就能查看。

## 内容与边界

更新版本或指标时，同步核对来源数据、页面、子项目 README 和笔记，不将作者数字标为本机实测。原始作者图片与视频外部引用；研究总图包含已保存网页截图中的作者预测裁切，保留其归属；MIT 方法图原样保留。

滑杆 `0–90°` 和 `0–60 cm` 是展示参数，不是模型输出或设备实际范围。无数据上传、GPU 推理、碰撞或机器人控制。无网络时说明与本地示意仍可使用，外部素材可能不可用。

- [项目说明](../README.md)
- [本地验证](../notes/verification.md)
- [正式发布与线上验证](../notes/publication.md)
- [来源与授权](../THIRD_PARTY.md)
- [部署约定](../../../docs/web-deployment.md)
