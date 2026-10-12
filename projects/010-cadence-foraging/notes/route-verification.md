# 街区线索与多步奖励：实际验证记录

日期：2026-10-11。固定 Cadence `19bee92756d1842176ad30b1cd01edbfbfa3f14c` / `0.80.0`，Windows 本机 Python 3.12.13、NumPy 2.5.3、CPU。结论与配置见 [研究笔记](route-research.md)。

## 真实数据路径

用户切换线索与奖励条件／前进一步 → Web POST → Python `RouteExperiment` 执行实际动作、wait 与奖励 → 真实 Cadence、规则、Q 更新 → API 返回完整历史与内部状态 → 页面曲线、分类成绩、三维行走与 JSON 导出。

没有 JavaScript Cadence 替代逻辑，没有云模型凭据。会话最多 16 个、仅内存保存；失效会话显示错误。只监听 `127.0.0.1:8190`，尚未公开部署。

## 离线评估

运行 `evaluate_routes.py --out ../notes/route-evaluation-results.json`，6 条件 × 4 种子 × 360 趟，24 次均完成，退出码 0。原始凭据 [route-evaluation-results.json](route-evaluation-results.json) 包含所有 8640 趟完整终点记录、配置、最终状态与三个运行源文件的 SHA256。

Web `prebuild` 校验原始凭据的代码哈希，再生成六条件摘要；最终构建输出实际提示「24 次实验，6 种条件」。报告数值来自全部种子，不筛选成功运行。

## 浏览器与原始结果核对

在实际桌面浏览器操作两个完整 360 趟实验（32×），每次保留 1440 个环境时刻：

| 条件，种子 7 | Cadence 命中 / 奖励 | 规则命中 / 奖励 | Q 命中 / 奖励 |
| --- | ---: | ---: | ---: |
| 街口线索 + 终点 | 141 / 86.25 | 353 / 351.25 | 292 / 275.00 |
| 街口线索 + 途中反馈 | 257 / 287.25 | 353 / 421.65 | 313 / 365.65 |

不同条件累计奖励定义不同，上表仅用于核对各次运行，算法比较使用终点命中率。所有 360 趟的路线、线索、目标、终点命中及合计奖励与对应离线结果逐行相等。

两份导出还包含每个环境时刻的原始 8 维观察、下一观察、待奖状态、操作种类与实际奖励。各次真实 Cadence 均调用 720 次 wait，Q 均更新 720 次。核对脚本验证两次执行动作组成最终路线、等待没有反馈、终点只结算一次，以及各控制器最终累计数据一致。

- [终点奖励导出](browser-route-brief-sparse-seed-7-360.json)
- [途中反馈导出](browser-route-brief-waypoints-seed-7-360.json)
- [可回查的哈希和核对凭据](route-browser-verification.json)

在 `runtime/` 可重新核对：

```powershell
uv run --locked python verify_route_receipts.py --browser ../notes/browser-route-brief-sparse-seed-7-360.json ../notes/browser-route-brief-waypoints-seed-7-360.json
```

## 分步与交互验证

实际点击「前进一步」：第一步 1 次奖励更新、0 wait；第二步更新计数不变、0 wait；第三步更新不变、1 wait；第四步 2 次更新、2 wait，完成 1 趟。奖励未到时没有让 actor 提前学习零反馈。该计数来自种子 7 初始唤醒阶段，后续 Cadence 可以在平静模式减少学习，不能把更新次数强行等同于所有 transition 次数。

持续线索模式在巷口仍显示路牌值，短暂模式变为两个零。切换条件回到 0 趟并新建会话，画面说明随条件改变。途中搬家显示「迁移已排队」，当前趟按旧映射结算，新一趟才生效；恢复按钮也遵循同一规则。手动模式显示自动切换关闭，原状态继续。

种子 −1 显示真实输入错误；恢复为 7 后可新建并完整运行。开始、暂停、继续、结束后禁止继续推进、导出均已操作核对。原四店入口仍能新建真实引擎并前进一步，再导航回新场景。

## 自动化检查与构建

`python -m pytest -q --tb=short`：**27 passed in 4.11s**，包含原 11 项和新增 16 项参数化用例。覆盖实际延迟归属、等待不替换未决动作/不更新参数、Q 终点不自举、路线评分、迁移状态保留与排队、单线索阶段、线索平衡、相同 Q 锁存行为及 API 错误边界。

双入口 `npm.cmd run build` 实际成功。共享 Three.js/街景 JS 约 528 kB，保留 Vite 超过 500 kB 的体积提示；这不是运行失败。初始化、HTTP、绘图与动画不计入离线控制器耗时。

## 截图与未验证范围

默认桌面浏览器面板的完整途中反馈结果见 [route-desktop-complete.jpg](../assets/route-desktop-complete.jpg)，稀疏奖励结果见 [route-sparse-complete.jpg](../assets/route-sparse-complete.jpg)。窄屏截图及说明见 [截图清单](../assets/README.md)。

390×844 视口实际验证：页面内容宽 375，表格容器宽 337、内容宽 650，横向滚动仅在表格内部；开始／暂停、前进一步均可使用，完成第 1 趟后保存整页。恢复默认 782×871 面板继续跑完整实验。最终版本浏览器控制台 error/warn 查询为空，API 会话创建 201、step/move 返回 200。

交付检查实际通过：`npm.cmd run catalog:sync` 同步 12 个项目，`npm.cmd run check` 输出「检查通过：12 个项目，编号、目录、图片与根 README 一致」。项目 010 登记新场景实拍预览，`demo` 仍为 `null`；没有公开部署。

未验证：真实手机硬件、低性能设备、公开部署、长延迟、连续障碍导航、更多线索泛化、存档导入或独立确认集。本记录不把可运行闭环推导成 Cadence 的一般优势。
