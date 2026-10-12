# Issue 驱动的模型修改：能力、原理与价值

## 研究对象与结论

讨论起点是 [X 帖子](https://x.com/0xWast3/status/2108929451811557694) 的模型修改视频。原视频作者与对应源码尚未确认，不能据此断言它开源、完整可复现或使用某种具体代理。

可核验的类似工程是 [shaiss/print-bench](https://github.com/shaiss/print-bench/tree/74b1f94de6ff536cc29ae233ee9929d3249caa85)。它把参数化 CAD 源码、AI 编码代理、GitHub 自动化与建模检查组织在同一仓库。核心变化是工作流：对话中已经能完成的编辑、生成、验证，被固定为可排队、后台执行和追踪的过程。

第一方源码与设计为 CC-BY-SA-4.0，不是 MIT。第三方库有独立条款，详见[声明](../licenses/UPSTREAM-CC-BY-SA-4.0.txt)。固定研究 commit：`74b1f94de6ff536cc29ae233ee9929d3249caa85`。

## 已查源码的执行链

1. 人提交验收清楚的 Issue，把适合自主执行的条目标记为 `autonomy-ok`。
2. [backlog-burn.yml](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/.github/workflows/backlog-burn.yml) 在每小时第 17 分钟计划运行，另可手动运行。计划任务可能排队延迟，不代表准点完成。
3. [backlog-burn.conf](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/.github/backlog-burn.conf) 与仓库变量 `BACKLOG_BURN_ENABLED` 构成双开关。复制仓库不会自动获得变量和凭据。
4. [Python 选择器](https://github.com/shaiss/print-bench/tree/74b1f94de6ff536cc29ae233ee9929d3249caa85/tools/backlog-burn) 找出最旧、未领取且满足条件的一项。这个决策是可重复的策略，不由模型凭直觉决定。
5. 代理通过 [ship-issue 技能](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/.claude/skills/ship-issue/SKILL.md) 认领并写 `SHIP-LOCK`，冻结验收，建 `claude/issue-N-slug` 分支，修改源码、检查和说明，做预检与差异范围审计，开草稿 PR。
6. [render.sh](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/scripts/render.sh) 生成 STL 与固定视角预览；[check.sh](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/scripts/check.sh) 组织几何与约束检查；[gate.sh](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/scripts/gate.sh) 组织网格与 PrusaSlicer 试切片。具体设计有具体检查，不能保证自动发现全部打印问题。
7. PR 带回源码差异、预览、说明和验证，关联 Issue。维护者决定是否接受，“开 PR”不等于已经合并。

当前配置从 Z.AI GLM 开始，配置三条 GLM 链路与 Anthropic 尾部；框架是 Claude Code Action。模型供应商、代理框架和建模工具是不同角色。[模型登记表](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/.github/models/registry.conf) 可回查配置。未复制模型凭据。

另有 [design-run.yml](https://github.com/shaiss/print-bench/blob/74b1f94de6ff536cc29ae233ee9929d3249caa85/.github/workflows/design-run.yml)，每小时第 23 分钟或手动执行 `design-brief` 新设计任务。它仍依赖约束、工具、检查与迭代上限，不代表任意造型一次完成。

## 真实案例与本机验证

- [Issue #398](https://github.com/shaiss/print-bench/issues/398)：孔顶误朝 −Z，要求改为 +Z。
- [PR #424](https://github.com/shaiss/print-bench/pull/424)：修改共享孔洞旋转并同步铰链；2026-08-29 合并，分支 `claude/issue-398-teardrop-point-up`。
- [定时 Actions #331](https://github.com/shaiss/print-bench/actions/runs/32834359878)：2026-08-25 启动、状态成功。公开注释明确关联 #398，并记录成功且无遗留锁。读取了公开运行状态与关联信息，没有取得登录后完整代理日志。
- [几何 CI](https://github.com/shaiss/print-bench/actions/runs/32846525503)：公开步骤包括几何、渲染、网格/试切片和预览生成。
- PR 中几何提交 `f4f900…`、说明提交 `e11d64…` 和再生预览 `e05e66…` 分工可回查；完整对照版本见[实验](../experiments/teardrop/README.md)。

本机 OpenSCAD 2021.01 编译同一最小测试件，并测量孔壁顶点，Z 范围从 `[-4.799988, 3.0]` 变为 `[-3.0, 4.799988]` mm。实验验证真实改动的几何效果，不等于在自有仓库完整复现远端代理全过程，没有做实物打印。

## 价值与适用判断

直接对话能理解需求、改代码、生成模型、测试和优化。自动化的附加价值在于减少反复启动环境、重新交代约定、催办、手工整理截图报告、分支与任务对照等操作。代码、依赖、规范和证据留在仓库后，同类维护更容易复用。

这些收益是适用性分析，未测量本人的实际节省工时。评估看合格率、总耗时、返工、审查成本和费用，不能只看 PR 数。搭环境、写验收、处理失败和审查结果也要计入成本。

适合目标明确、可验收、反复出现的任务，例如孔位、参数约束、资产配置、字幕解析和导出回归。风格、剧情与手感仍适合边看边讨论。固定参数批处理与定时测试本来就适合脚本，无需为自动化额外加入 AI。

## 对现有项目的候选用途

以下仅为方案，尚未新增工作流：

| 项目 | 候选任务 | 需要验收 | 减少的重复工作 |
| --- | --- | --- | --- |
| 004 Muster | 比例、配置素材、旧布局兼容 | 构建、配置回归、六视图、几何统计 | 启动展台、拍图、逐项查参数 |
| 009 Jevclip 演示 | SRT/VTT/JSON 边界格式 | 失败输入、格式回归、源位置引用 | 描述坏样本和手测引用 |
| 008 纸间 MV | 导出、取消/重试、时长音轨 | 小样本视频、状态、帧数/时长/音轨 | 重复导出与查后台状态 |
| 013 映序 | 适配器、字段、项目兼容 | 契约、Schema、存档回归 | 重测字段、迁移、接入说明 |
| 003 机甲 | 非法/过期指令、规则维护 | 规则与命令回归 | 重测异常指令；手感继续对话 |
| 010 Cadence | 实验方法维护、差异分析 | 固定种子、输出、计算口径 | 确定步骤先用脚本，再按需加入 AI |

桌面账号、浏览器和图形环境不会自动出现在云端 Runner，尤其 GPU 渲染与真实模型调用需要独立准备和验证。本图没有声称这些项目已经能在云端完成上述流程。

## Codex 与扩展

[官方文档](https://learn.chatgpt.com/docs/github-action) 说明 `openai/codex-action@v1` 安装 CLI，使用 API 密钥执行 `codex exec`。可替换“代理改源码”环节；任务筛选、环境、OpenSCAD 等工具、验收与分支/PR 交付仍由工作流组织。桌面登录不自动变为 Actions API 认证；本仓库未接入。

同样结构可接 Blender Python、CadQuery、build123d、Three.js 等代码接口，扩展到场景资产、装配或动画维护。更换工具后要相应补几何、拓扑、碰撞、材质、骨骼或导出验收，不能只换模型名称便认定效果相同。

后续可完善固定相机前后对照、尺寸与装配报告、风险说明、范围检查、模板、预算、重试上限和失败转人工。凭据与权限应匹配任务范围；任意访客提交的文字不能自动成为执行授权。

当前选择：继续对话研究；当清晰、可验收的维护任务反复出现时，再接自动化。
