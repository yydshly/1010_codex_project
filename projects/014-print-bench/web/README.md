# print-bench 完整中文研究网页

本项目用既有理解总图引导阅读，保留九主题31段完整摘要、九组固定源码模块、真实 Issue / PR 证据与本机孔洞复现、直接对话比较、任务判断、现有项目候选流程、Codex 与更多工具扩展，以及23项原始资料。公开版是静态阅读，不调用模型或执行建模代理。

## 本地运行

Node.js 22+，没有额外运行依赖，不需要安装第三方 npm 包。从本目录执行：

```powershell
npm.cmd run research:sync
npm.cmd run check
npm.cmd run build
npm.cmd run publication:check
npm.cmd run preview:path
```

本地地址：`http://127.0.0.1:5194/1010_codex_project/014-print-bench/research.html`。直接开发预览用 `npm.cmd run dev`，端口5193。构建生成 `dist/`；`index.html` 与 `research.html` 同页。

## 内容与交互

- 总图弹窗支持40%～220%缩放、适合宽度、高清 PNG 和可编辑 SVG 下载；原图不重新生成。
- 六个步骤切换对应职责；九组模块链接固定在研究 commit。
- 两张孔洞图和测量表是实际本机最小复现，保留原文件与源码版本。
- 四类任务的判断工具用固定规则，不调用 AI。
- 九主题正文默认完整展示；搜索过滤相关主题和资料。
- 资料可以分类、页内阅读和下载；STL 仅下载，阅读文本用 textContent 显示。
- 原 X 项目尚未确认；候选自动化流程未接入；图中制作阶段状态由网页当前说明补充。

完整摘要的数据来源是 `../notes/research-summary.json`；同步脚本同时生成 Markdown 与根登记表摘要。图稿数据与原图保留原始字节。本项目 `.gitattributes` 避免跨系统换行转换破坏来源与线上哈希核验。

## 构建与发布

构建白名单39项资源，包含 HTML/CSS/JS、摘要、笔记、许可证、原图、共享模块、测试件与 STL。发布检查核对全文、模块数量、所有内部链接、资料原始字节以及既有图稿 SHA-256，生成 `publication-manifest.json`。不打包本机配置、凭据或运行服务。

GitHub Pages 固定路径为 `014-print-bench/research.html`。工作流新增014独立检查和构建；根组装器保留其他已发布路径。线上确认成功后才填写根登记表演示地址。

`npm.cmd run publication:verify -- --url <真实HTTPS目录> --commit <部署commit> --run <Actions编号>` 按清单逐文件核对HTTP、大小与SHA-256。实际发布状态与浏览器证据见 `../notes/publication-verification.json`。

[返回项目说明](../README.md)
