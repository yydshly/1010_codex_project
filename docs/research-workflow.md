# 研究流程与索引约定

## 1. 创建条目

在仓库根目录执行（示例项目不会自动收录）：

```bash
node scripts/new-project.mjs --slug example-repo --name "项目名称" --source "https://github.com/owner/repo" --summary "值得研究的原因" --tags "前端,可视化"
```

`slug` 使用小写英文、数字和单连字符。命令从已登记的最大编号加一，创建目录与研究模板，同时更新根 README。重复短名、错误的上游地址以及已有目录会拒绝创建。

也支持 `npm run project:new -- ...`；Windows PowerShell 下使用 `npm.cmd run project:new -- ...`，避免参数被 PowerShell 的 npm 包装脚本处理。

编号是项目的固定身份，也是根索引的展示顺序。`001`、`002`、`003` 按数值排序，登记表数组的书写顺序不会改变展示顺序。不复用已归档编号；日常归档应修改状态并保留条目。

## 2. 登记表字段

`projects.json` 的 `version` 当前为 `1`，`projects` 是条目数组。

| 字段 | 说明 |
| --- | --- |
| `id` | 正整数编号，由创建命令分配；目录显示至少三位 |
| `slug` | 全仓库唯一的英文短名；目录由编号和短名自动确定 |
| `name` | 项目展示名称 |
| `summary` | 根 README 展示的一句话研究摘要 |
| `source` | 上游 GitHub 仓库 URL |
| `status` | `planned` 待研究、`researching` 研究中、`demo-ready` 演示可用、`archived` 已归档 |
| `tags` | 分类标签数组，例如 `["前端", "可视化"]` |
| `cover` | 无截图时为 `null`；有截图时填写图片路径与说明 |
| `demo` | 未部署时为 `null`；部署后填写实际可访问的 HTTPS URL |

图片配置示例（必须先把真实截图放入该路径）：

```json
"cover": {
  "path": "projects/001-example-repo/assets/cover.png",
  "alt": "主界面截图：左侧项目导航，右侧显示交互式图表"
}
```

路径相对仓库根目录，使用 `/`，图片限于本项目 `assets/` 下的 PNG、JPEG、WebP、GIF 或 SVG。根 README 会显示图片并附上 `alt` 描述。多张截图和详细说明放在子项目 README 中。

## 3. 开展研究

在子项目 README 中补全值得研究的原因、上游 tag/commit、许可证、复现步骤与阶段结论。在 `notes/` 记录架构分析、实验过程、问题和解决办法。区分上游原有功能、本地验证结果与自己的改动；没有验证的内容标记为待验证。

引入上游代码和图片前核对许可证，保留要求的 LICENSE、版权与归属声明。总仓库当前未统一指定许可证；子项目记录各自来源与适用授权，后续再选择自有内容的许可证。

Web 应用放在本项目 `web/`，自行维护 `package.json`、锁文件与构建命令。根目录只管理目录工具，不统一约束所有子项目的技术栈。

## 4. 更新对外入口

编辑登记表中的摘要、状态、图片或演示地址，然后运行：

```bash
npm run catalog:sync
npm run check
```

检查会验证编号与短名唯一性、目录一致性、截图存在性和根 README 是否与登记表同步。GitHub Actions 在 push 和 pull request 时运行相同检查。

## 5. 归档

把状态改成 `archived`，在子项目 README 写明归档原因。保留编号、来源、目录与已有研究记录；演示停用时将 `demo` 改回 `null`。不要删除条目后让后续创建命令复用历史编号。
