# 多个 Web 的部署约定

当前只初始化研究仓库，尚未启用 GitHub Pages，也没有真实演示项目。后续按具体子项目的技术栈添加构建和部署流程。

## 一个站点，多个项目路径

GitHub Pages 为每个仓库提供一个项目站点，并托管静态 HTML、CSS 和 JavaScript。多个 Web 可以各自构建，再汇总到同一份站点产物的不同子目录。[GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

本仓库预计使用以下路径；这些地址是规划，目前不能作为已上线链接：

```text
https://yydshly.github.io/1010_codex_project/
├── 001-example-repo/
├── 002-another-repo/
└── ...
```

部署产物的建议布局：

```text
_site/
├── index.html                  # 演示导航页
├── 001-example-repo/            # 来自该项目 web 的构建产物
│   └── index.html
└── 002-another-repo/
    └── index.html
```

目录使用与子项目相同的 `编号-slug`，保持路径稳定。根 README 的研究索引指向源码目录；`demo` 字段单独记录上线后的访问地址。

## 子项目需要准备什么

1. 在 `projects/编号-slug/web/` 管理应用代码、依赖、锁文件与构建说明。
2. 让静态构建产物支持 `/1010_codex_project/编号-slug/` 这个基础路径，验证 JS、CSS 和图片都能加载。
3. 如果使用单页路由，优先选择 hash 路由，或明确处理 GitHub Pages 的直接访问与刷新行为。
4. 部署时将每个应用的静态产物复制到 `_site/编号-slug/`，再统一发布 `_site/`。
5. 验证线上页面与资源后，将实际 HTTPS 地址填入登记表的 `demo`，再同步根 README。

纯静态应用适合 GitHub Pages。需要数据库、服务端 API 或常驻进程的项目需独立后端或其他托管平台，登记表同样可以指向该演示地址。

## 启用部署时的步骤

首次部署时在仓库 **Settings → Pages** 中选择 **GitHub Actions**，再根据真实项目添加工作流：分别安装依赖和构建 → 汇总站点 → 上传 Pages 产物 → 部署。[GitHub 官方自定义工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

仓库初始化只包含目录检查工作流，不自动发布空站点。等第一个可运行 Web 确定后，再补充与它匹配的部署配置。
