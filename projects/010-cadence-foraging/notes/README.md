# 中文研究与实验记录

固定上游 Cadence `19bee92756d1842176ad30b1cd01edbfbfa3f14c`，包版本 `0.80.0`。本机实验日期 2026-10-11；能力与业务汇总更新于 2026-10-12。

统一网页入口：[研究首页](http://127.0.0.1:8190/) · [13 章中文理解指南](http://127.0.0.1:8190/guide.html) · [一条鱼的 EP 实际数字](http://127.0.0.1:8190/fish-ep.html#ep-player) · [全部资料检索与下载](http://127.0.0.1:8190/#resources)。指南源文件为 [guide.html](../web/guide.html)，整理本轮对 EP、强化／监督学习、术语、其他算法、不规则运动与无人机的讨论。指南内的四步 EP 属于概念示意，独立捕鱼 EP 页则读取真实训练记录；无人机仍属于建模分析。

- [一张研究总图](understanding-map.md)：四类能力、12 组机制作用、9 张原实拍、既有结果、14 场景、扩展与价值；有高清 PNG、SVG 与来源凭据。
- [能力、算法与业务完整汇总](capabilities-scenarios.md)：四类任务、12 组核心机制、14 个场景、输入／输出／反馈、基线与失败边界、接入和扩展；与网页共享内容源，构建生成。
- [能力地图网页验证](capabilities-verification.md)：构建、浏览器交互、入口／资源与窄屏检查；业务候选未新增实测。
- [研究笔记](research.md)：六个问题、原理、默认与高级引擎的边界、来源和实验参数。
- [捕鱼预测研究](fish-research.md)：真实 TemporalPatchNet 的监督时序预测、历史位置输入、两种随机运动、运动公式与零位移校验、拦截碰撞及价值判断。
- [捕鱼 EP 单样本原始数字](fish-ep-sample.json)：固定种子 7 的第 1 条训练鱼，包含 9 个历史位置、全部 7×4 输入、7×24 标签、自由／正负扰动态、Newton 活动调整、288 项参数的更新和不传标签的重算；生成器为 [record_fish_ep.py](../runtime/record_fish_ep.py)。这是一次 batch=1 的机制说明，不替代留出评估。
- [EP 九章理解汇总](http://127.0.0.1:8190/fish-ep.html#ep-understanding)：整理正负扰动、局部导数和相减理由；原始 JSON 的 parameter_probe 保留独立权重 ±0.001 的真实输出与损失，以及只改 C[2,0] 的对照。详细推导也在 [捕鱼研究笔记](fish-research.md) 末尾。
- [两侧相减的八幕动画](http://127.0.0.1:8190/fish-ep.html#ep-contrast-animation)：从预测误差进入局部导数，讲到有符号 β 还原、两次斜率平均、参数更新与独立方向核验；真实数字与讲解用图形运动分开。
- [捕鱼完整评估](fish-evaluation-results.json)：两条件 × 四种子，冷启动与 192 批训练后的全部轨迹、预测、误差、射击结果和来源哈希。
- [捕鱼验证记录](fish-verification.md)：Python/API、生产构建、真实浏览器学习与回放、导出核对和响应式边界。
- [捕鱼浏览器核对](fish-browser-verification.json) 与 [两条件原始导出](browser-fish-inertia-seed-7.json)：两个浏览器会话全部 48 条鱼均与离线预测、误差、碰撞和参数完全一致；另一条件为 [独立随机导出](browser-fish-independent-seed-7.json)。
- [底层原理、算法与实现](algorithm-implementation.md)：从当前 NPC 追到固定源码，拆解神经图、EP 局部对比、Actor–Critic、两类记忆、唤醒与延迟反馈，附接入示例和源码行号。
- [算法诊断凭据](algorithm-inspection.json)：实际解析参数、42 神经元／450 连接、源码 SHA256、一趟真实等待与参数变化、短暂线索记忆键重合检查。
- [算法单步可视化](algorithm-visualization.md)：真实观察、自由／扰动态、动作、资格、等待与参数更新的播放方式、数据来源和验证边界。
- [算法浏览器凭据](algorithm-browser-verification.json) 与 [可见原始帧](algorithm-browser-frames.json)：逐帧回看、正负活动显示和实际参数更新核对。
- [验证记录](verification.md)：四种子结果、恢复定义、真实浏览器流程和未验证范围。
- [完整评估 JSON](evaluation-results.json)：四种子 × 600 轮，包含配置、实验脚本哈希、所有行动及最终内部状态。
- [真实浏览器导出](browser-seed-7-600.json)：种子 7 的 600 轮网页会话，与离线行动历史逐轮相同。
- [新场景研究笔记](route-research.md)：街区线索、两次岔口选择、等待与终点奖励；24 次对照、工作轨迹消融及算法选择边界。
- [新场景验证](route-verification.md)：逐步等待、完整两条件浏览器核对、迁移排队、响应式与运行记录。
- [新场景完整评估](route-evaluation-results.json)：6 条件 × 4 种子 × 360 趟，包含全部终点记录、配置与源文件 SHA256。
- [街口线索 + 终点浏览器导出](browser-route-brief-sparse-seed-7-360.json) 与 [街口线索 + 途中浏览器导出](browser-route-brief-waypoints-seed-7-360.json)：每种保留 1440 个实际环境时刻与完整公开观察。
- [浏览器核对凭据](route-browser-verification.json)：浏览器与离线历史相等、逐步奖励归属、文件哈希与最终结果。

`verification.md` 中的本地表格来自上述 JSON。上游发布报告和前期探索属于单独证据，不能混作本项目的 600 轮统计。

新场景不支持 Cadence 的总体优势；短暂线索与稀疏奖励还暴露了不稳定和旧线索失误。后续研究更多线索与未见组合、长延迟、连续导航和存档恢复，继续保留强规则及适当的有记忆学习基线。

[项目说明](../README.md) · [运行方法](../runtime/README.md)
