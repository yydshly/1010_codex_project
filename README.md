# GitHub 项目研究集

记录最近遇到的优秀 GitHub 项目：为什么值得研究、如何运行、关键实现，以及可复用的经验。这里是研究总入口，完整笔记、实验代码和截图放在对应子项目中。

> 子项目按固定编号持续收录，研究进度和演示入口随条目更新。

## 从这里开始

- **浏览研究**：从下方项目索引进入子项目，阅读摘要、运行说明和研究笔记。
- **新增项目**：阅读 [研究流程](docs/research-workflow.md)，或直接使用下方创建命令。
- **访问演示**：索引中填写演示链接后即可访问；多个 Web 的路径约定见 [部署说明](docs/web-deployment.md)。

<!-- PROJECTS:START -->
## 项目索引

已收录 **0** 个项目，按固定编号升序展示。

暂无研究条目。第一个项目将分配编号 `001`。

<!-- PROJECTS:END -->

## 新增一个研究项目

需要 Node.js 22 或更新版本，无需安装第三方依赖。在仓库根目录执行：

```bash
node scripts/new-project.mjs --slug example-repo --name "项目名称" --source "https://github.com/owner/repo" --summary "一句话说明值得研究的原因"
```

命令会分配下一个编号，创建 `projects/001-example-repo/` 等目录，写入登记表并更新本页。`example-repo` 是用法示例，尚未作为真实项目收录。

也可通过 `npm run project:new -- ...` 调用；Windows PowerShell 下用 `npm.cmd run project:new -- ...`，确保参数原样传入。

随后补充子项目 README 和笔记，把截图放入该项目的 `assets/`，在 [projects.json](projects.json) 中填写图片与演示链接：

```bash
npm run catalog:sync
npm run check
```

## 目录约定

```text
1010_codex_project/
├── README.md                 # 对外入口：编号索引、摘要、截图、演示链接
├── projects.json             # 项目登记表，编号决定展示顺序
├── projects/                 # 001-slug、002-slug……各自独立研究
├── templates/project/        # 新子项目模板
├── docs/                     # 研究规范与 Web 部署说明
├── scripts/                  # 创建项目、同步索引、检查一致性
└── .github/workflows/        # 自动检查目录、索引与图片引用
```

子项目从 `001` 起递增，目录名采用 `编号-英文短名`。编号分配后保持不变，归档项目保留原编号；按编号升序展示，不因研究进度改变顺序。

## 维护方式

根 README 的项目索引和图片预览由 `projects.json` 生成。手动修改摘要、状态、图片或演示入口时，编辑登记表，再运行 `npm run catalog:sync`；详细研究内容直接编辑子项目文件。

保留上游仓库链接与研究时的版本记录。引入上游源码、图片或资源时遵守该项目许可证并保留必要声明；具体要求见 [研究流程](docs/research-workflow.md)。
