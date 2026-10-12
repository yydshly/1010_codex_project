# Web 部署与发布范围

2026-10-12 为 001 樱花小街配置 GitHub Pages。GitHub Actions 已成功部署，线上页面和引导图已实际打开；验证记录见 001 的 notes/publication-verification.json。

## 一个站点，稳定项目路径

仓库站点入口为 `https://yydshly.github.io/1010_codex_project/`，001 放在 `001-sakura-crossing/`，首页导航到 `research.html`。本次仅发布 001 静态应用和必要引用资料，不发布其他子项目应用。

```text
_site/
├── index.html
└── 001-sakura-crossing/
    ├── research.html           # 完整摘要、引导图、研究手册
    ├── index.html              # 研究街、内容收藏与中文导览
    ├── lab.html                # 三场景风格和性能实验
    ├── builder.html            # 小镇编辑与本机存档
    ├── weather.html            # WebGPU 晴雨漫游
    ├── directions.html         # 七种产品方向
    └── overview.html           # 高清总览图与下载
```

## 构建与自动部署

在根目录执行 `npm run check`，在 `projects/001-sakura-crossing/web/` 执行 `npm ci` 与 `npm run build`，最后回到根执行 `npm run site:assemble`。应用使用相对基础路径 `./`；所有生产资源由 Vite 打包到同一子目录，跨项目说明和截图使用 `references/` 中的快照，不依赖其他项目的开发服务器。

`.github/workflows/pages.yml` 在 main 的相关内容更新或手动触发时构建 `_site/`，上传 Pages 产物并部署。Actions 版本固定到核验过的 commit。仓库 Pages 构建来源使用 GitHub Actions。首次启用、发布状态与成功 URL 通过 GitHub API/Actions 核验；只有实际线上检查通过后，才将真实 HTTPS 地址写入 `projects.json.demo` 并同步根 README。

## 在线与本机体验

在线提供完整研究摘要、引导图、真实效果对照、笔记与证据阅读、模块下载和 001 的静态场景。收藏和搭建器存档存于当前浏览器，换域名或浏览器不自动同步，可用 JSON 备份。

天气页需要支持 WebGPU 的浏览器与合适设备；普通研究阅读不要求加载三维场景。手机真机和长时性能尚未验证。

AI 守灯游戏使用本机 `town-server.mjs`、官方 CLI 登录或本机模型配置，不包含公开模型 API；012 原城市、技术台和 GPU 现场仍需各自的本机服务。在线手册以说明、截图和原始记录呈现这些入口，避免把 localhost 当成公开演示地址。静态发布不上传密钥、用户存档或本机配置。

## 资料与依据

[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) · [GitHub Pages REST API](https://docs.github.com/en/rest/pages/pages)

实际发布和线上检查记录保留在 001 笔记中。后续增加项目时继续沿用固定编号路径，并为其增加独立构建、来源授权和验证记录。
