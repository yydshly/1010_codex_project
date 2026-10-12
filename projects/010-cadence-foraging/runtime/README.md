# 真实 Cadence 运行引擎

`uv.lock` 固定 NumPy、测试依赖与 Cadence Git commit。源码版本 `19bee92756d1842176ad30b1cd01edbfbfa3f14c`，包版本 `0.80.0`；采用 CPU 后端，不依赖 Torch。

```powershell
# 在 runtime 目录
uv sync --locked --python 3.12
uv run --locked python server.py
```

在 `../web/` 预先完成 `npm.cmd ci` 和 `npm.cmd run build`，然后打开 `http://127.0.0.1:8190/`（四店）或 `http://127.0.0.1:8190/route.html`（街区线索）。服务仅监听回环地址，默认端口 8190，支持 `--port`；改端口后需相应修改 Vite 代理地址。

## 决策顺序

初始化先发出一个未决动作。每轮环境执行该动作、计算真实奖励，再向同一控制器交回反馈并取得下一动作。Cadence 调用真实 `brain.live(observation, reward=[reward])`，奖励总是对应已执行动作。迁移只改变环境，不向控制器发送位置或阶段通知。

`experiment.py` 负责协议及三个控制器，`server.py` 是标准库 HTTP 服务，`evaluate.py` 运行同一协议并保存每轮原始数据。一次 `/step` 可以包含 1–32 轮；后端仍逐轮结算，不跳过学习。

`route_experiment.py` 新增两次岔口动作与两个 wait 的协议。每趟四个环境时刻：街区 transition → 巷口动作执行（未收到结果）→ 途中 wait → 抵达 wait + 终点 transition。终点 `done=True` 清理临时轨迹，保留脑与学到的参数；Q 不跨趟自举。迁移在新一趟开始时生效，避免改写进行中路线的评分。路线枚举规则和 12 值 Q 表各自锁存公开路牌，不接收隐藏地图。

## API

| 方法与路径 | 参数 / 用途 |
| --- | --- |
| `GET /api/health` | 真实引擎标识及固定 commit |
| `POST /api/sessions` | `seed` 0–99999，默认 7；`scenario` 默认 `direct`，可选 `route`；返回会话与初始快照 |
| 原场景参数 | `phase_length` 100–300，默认 200；三阶段共 600 轮，手动最多 1000 轮 |
| 新场景参数 | `phase_length` 40–200 的偶数，默认 120；`cue_mode` 为 `brief`/`visible`，`reward_mode` 为 `sparse`/`waypoints`；默认 360 趟，手动最多 600 趟 |
| `POST /api/sessions/{id}/step` | `count` 1–32，`request_id`；原场景按轮，新场景按环境时刻推进，不跳过中间反馈 |
| `POST /api/sessions/{id}/move` | `target` 0–3，`request_id`；原场景为店铺编号，新场景为樱花路线编号；保留控制器，途中排队 |
| `POST /api/fishing` | `seed` 0–99999，默认 7；`mode` 为 `inertia`/`independent`，返回真实模型、冷启动指标与 48 条留出鱼快照 |
| `POST /api/fishing/{id}/train` | `count` 1–16，默认 8；`request_id`；最多累计 192 批，返回真实更新报告和冻结参数后的留出预测/误差/连续碰撞结果 |

立即重试相同 `request_id` 与参数不会再结算；只保存最近一次请求，不能把它当作无限历史去重。参数不合法为 400，会话不存在为 404，真实引擎失败为 500。服务器串行处理实验、保留最多 16 个内存会话，重启不保留状态。

## 复现实验和检查

```powershell
uv run --locked python evaluate.py --seeds 7 41 42 43 --phase-length 200 --out ../notes/evaluation-results.json
uv run --locked python evaluate_routes.py --out ../notes/route-evaluation-results.json
uv run --locked python inspect_algorithm.py
uv run --locked python evaluate_fish.py
uv run --locked python record_fish_ep.py
uv run --locked python -m pytest -q --tb=short
```

评估输出包括参数、固定上游、Python/NumPy 版本、实验脚本 SHA256、2400 行行动历史、最终状态和恢复指标。反馈耗时为本机计时，不含 HTTP、绘图、场景动画，也不代表物理电能。

本次 27 项测试实际通过，包含原 11 项和新场景的延迟结算、wait 不更新参数/不替换动作、整条路线与真实奖励核对、迁移排队、单线索阶段、路牌锁存、终点不跨趟自举、API 与输入边界。新场景评估的三个运行源文件 SHA256 在 Web 构建前强制核对，防止沿用过期结果。

算法可视化新增后共 **33 项测试通过**。`server.py` 的街区会话使用 `algorithm_trace.TracedRouteExperiment`，在原协议之上记录最近 96 帧的自由／扰动态、动作、资格与实际参数差；离线评估仍使用未修改的 `RouteExperiment`。四种条件的原实现与带记录实现保持完全相等的行动、参数、记忆和随机状态。API 新增 `algorithm` 字段，本次记录导出包含内部帧。观察记录的开销计入实时耗时，不与原离线时间直接比较。

`inspect_algorithm.py` 不修改控制器配置和协议，只记录实际安装版本、源码位置／SHA256、工厂解析参数以及一趟四时刻运行。它断言等待区间的图、Critic、联想记忆参数和待奖动作不变，终点只结算一次，并检查短暂线索下相同岔口的原始观察键重合。输出为 `../notes/algorithm-inspection.json`，属于机制诊断，不增加性能评估运行数。

[原场景验证](../notes/verification.md) · [新场景研究](../notes/route-research.md) · [新场景验证](../notes/route-verification.md) · [算法与实现](../notes/algorithm-implementation.md)

捕鱼 `fish_experiment.py` 使用真实 `TemporalPatchNet(4,8,24)`，从位置差构造 7×4 输入、用不同训练鱼的未来位移监督，测试前每条鱼归零隐藏状态；不使用奖励或 Q-learning。训练与测试随机种子分开；测试评估不更新参数。新增 9 项测试后共 **42 项实际通过**，覆盖前缀隔离、真实更新与损失、基线/测试路径不变、逐点误差/分母复算、两帧之间碰撞、API 去重与非法输入。

捕鱼会话单独保留最多 8 个；立即重复最后一次相同训练请求不会重复学习，不支持任意历史请求去重。构建前校验 `fish_experiment.py`、`evaluate_fish.py` 的 SHA256。两条件四种子共 8 次完整评估见 [捕鱼研究](../notes/fish-research.md)。

`record_fish_ep.py` 从种子 7 的有惯性训练池取固定第 1 条轨迹，在独立冷启动模型执行一次 `observe`，批量为 1。保存返回的 free / plus / minus、局部梯度、EP 方向和参数前后值，再从零边界用 `imagine` 作不传 target 的新参数重算，输出 `../notes/fish-ep-sample.json`。这不是主捕鱼会话的训练记录，原批量 8 的协议不变，也不是留出性能实验。网页单步读取该已执行记录，不需要新增 API 或服务重启；构建会核对记录器与捕鱼源码哈希。

单样本数字新增 6 项测试后共 **48 项实际通过**：与未加记录的真实 `observe()` 逐项相等、正负局部量和参数更新公式、A/B/C 三项独立有限差分、历史与标签隔离、已保存 JSON 与新计算相等、Newton 首步复算与完整实际隐藏路径相等。Newton 诊断使用旧参数克隆，只读复算求解方向，没有改写上游求解器或学习结果。当前样本正负各接受一步；页面不据此宣称所有样本都只需一步。

理解汇总新增 `parameter_probe` 独立核验：从旧参数快照取四个副本，只将 C[2,0] 分别减 0.001、保持原值、加 0.001、改至本次 EP 新值；其他参数和零边界固定，`imagine()` 不传 target，外部评分才读取标签。保存每次完整 7×24 输出与损失，区分“只改一项”与实际 288 项一起更新。新增一项独立因果递推核对全部四次输出、损失、中心差与解析梯度；当前 **49 项测试实际通过**。原正负教学、实际更新、主捕鱼协议与正式评估结果保持原值。
