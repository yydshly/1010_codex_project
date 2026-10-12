import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { algorithms, scenarios, families, statuses, understanding, sources, revision, upstream } from '../src/capabilities-data.js';

const ids = new Set(algorithms.map(item => item.id));
if (ids.size !== algorithms.length || new Set(scenarios.map(item => item.id)).size !== scenarios.length) throw new Error('Duplicate research ID');
for (const a of algorithms) for (const ref of a.refs) if (!sources[ref]) throw new Error(`Unknown reference: ${ref}`);
for (const scene of scenarios) {
  if (!families[scene.family] || !statuses[scene.status] || scene.steps.length !== 5) throw new Error(`Incomplete scene: ${scene.id}`);
  for (const id of scene.algorithms) if (!ids.has(id)) throw new Error(`Unknown mechanism: ${id}`);
  for (const field of ['name', 'question', 'input', 'output', 'feedback', 'value', 'baseline', 'risk', 'prototype', 'evidence']) if (!scene[field]) throw new Error(`Missing ${scene.id}.${field}`);
}
const refLinks = refs => refs.map(key => `[${sources[key][0]}](${upstream}${sources[key][1]})`).join(' · ');
const fieldNames = [['input', '输入'], ['output', '输出'], ['feedback', '反馈'], ['value', '可能价值'], ['baseline', '简单对照'], ['risk', '失败边界'], ['prototype', '最小验证'], ['evidence', '证据状态']];
let note = `# Cadence 能力、算法、场景与业务理解汇总\n\n研究日期：2026-10-12。固定 Cadence 0.80.0，commit ${revision}，上游 GPL-3.0；来源见项目 THIRD_PARTY.md。\n\n对应网页：[能力与业务地图](http://127.0.0.1:8190/applications.html)。本文件由 web/src/capabilities-data.js 与 web/scripts/sync-capabilities.mjs 在构建时生成，核心算法与场景文字和网页共用同一内容源；修改内容源后重建，避免手工修改生成内容。\n\n本轮是研究汇总与网页扩充，没有重新运行准确度实验。五步闭环属于说明交互，不调用模型、不生成结果。三个已有本地场景与其他候选业务分开。\n\n## 1. 我们理解了什么\n\n`;
for (const [title, content] of understanding) note += `### ${title}\n\n${content}\n\n`;
note += '四类任务：预测 / 判断、动作 / 奖励、记忆 / 回查、动作后果 / 规划。监督输入真实答案；奖励输入执行后的评价；记忆接真实字段；规划要先有可靠后果模型、可控输入和明确目标。\n\n## 2. 核心算法与机制\n\n这些分组可组合，不是互斥产品，也不是把全部导出接口逐项称为独立算法。\n\n';
for (const [i, a] of algorithms.entries()) note += `### ${i + 1}. ${a.name}\n\n- 所属层次：${a.role}。模块：${a.modules}。\n- 本质：${a.essence}\n- 例子：${a.example}\n- 适用：${a.fit}\n- 边界：${a.limit}\n- 公式 / 实现：${a.math}\n\n来源：${refLinks(a.refs)}。\n\n`;
note += '辅助与高级方向包括 Arousal、保存恢复、TemporalMemory、Steered / Life / Governor、观察者及多 Patch 端口组合；各自契约不同，本页没有逐一运行验证。学习率、β、衰减、阻尼和求解预算是配置 / 数值策略，不自动提供新信息或语义能力。\n\n## 3. 场景和业务设计\n\n以下价值与最小原型为本项目应用推断。候选不是已实现业务，上游示例不是本机成绩。\n\n';
for (const [i, s] of scenarios.entries()) {
  note += `### ${i + 1}. ${s.name}\n\n任务：${families[s.family]}。状态：**${statuses[s.status]}**。\n\n${s.question}\n\n机制：${s.algorithms.map(id => algorithms.find(a => a.id === id).name).join('；')}。\n\n`;
  for (const [key, label] of fieldNames) note += `- ${label}：${s[key]}\n`;
  note += '\n五步闭环：\n\n';
  for (const [j, step] of s.steps.entries()) note += `${j + 1}. ${step}\n`;
  if (s.link) note += `\n[${s.linkText}](http://127.0.0.1:8190/${s.link.replace('./', '')})\n`;
  note += '\n';
}
note += `## 4. 业务组合与外部方法\n\n- 捕鱼是预测器 + 几何弹道 / 碰撞；命中不是靠奖励训练射击策略。若加 Brain 选射击时机，须另做实验。\n- 宠物是应用提供需求、动作与评价 + 学习选择。动作差异不能直接推定更好的体验或理解情绪。\n- 模拟机器人先监督学习真实动作后果，再规划候选控制。训练改参数，规划改输入，执行后测量才能判断效果。\n- 异常线索是正常预测 + 应用算偏差、校准阈值与独立确认；预测误差不等于故障。\n- LLM 可在外部承担文字理解、任务拆解与工具参数；Cadence 可承担一个数值预测或有限动作模块。本站未实现该组合。\n\n本地已有规则 / Q-learning / 匀速 / 匀加速度 / 零位移对照。以下仅讨论，没有全部接入：上下文 bandit、Kalman / EKF / UKF、IMM、粒子滤波、GRU / LSTM、多候选预测、物理模型加学习偏差、PID / MPC。精确事实优先日志或数据库；未来独立随机变化不会因为换一个模型就能唯一预测。参见[方法地图](http://127.0.0.1:8190/guide.html#alternatives)。\n\n## 5. 效果与证据\n\n四店 4 种子共 2400 轮，Cadence 86.71%，规则 99.33%，Q-learning 88.00%；阶段末 50 轮 Cadence 平均 100%。街区每主条件 1440 趟，街口线索 + 终点奖励 40.56%，持续 + 终点 71.94%，街口 + 途中 74.31%，持续 + 途中 75.21%；没有测出总体优势，关闭 Trace 对照也没有证明其收益。\n\n捕鱼每条件 192 条留出鱼，有惯性 Cadence 平均误差 75.57→17.72 px，匀速 21.34、匀加速度 20.25；命中 189/192，而匀加速度 190/192。独立随机时 Cadence 19.27 px，零位移 18.60 px。一条训练鱼的全部参数更新后某点误差 22.31→8.84 px，只说明那次训练，不替代新鱼评估。固定配置结果属于开发研究，未做独立确认或统计显著性结论。\n\n完整数据与检查见 verification.md、route-verification.md、fish-verification.md，以及同目录原始评估 JSON。本轮未改参数、训练记录或成绩。\n\n## 6. 实际接入\n\n1. 定义最小任务、输出、成功指标与延迟预算。\n2. 声明每个输入的含义、单位、时间、尺度与缺测方式。只输入当时可知信息；全零不是自动的“未知”。\n3. 对齐真实答案或已执行动作的奖励、回合与结果 ID，晚到反馈只结算一次。教学 / 想象不写成事实。\n4. 建立同输入、同反馈、同动作、同数据划分与预算的简单基线。\n5. 选独立模块并读其契约。监督序列可选 TemporalPatchNet，有限动作可选 Brain；Records / RecordPatchNet / BeliefPatch 需另设字段和端口。\n6. 检查输入形状、有限值、phase.converged、report.updated 或相应模块返回。失败尝试不能计为已接受更新。\n7. 按独立对象 / 轨迹 / 会话 / 设备留出，测新任务、恢复速度、旧知识与总计算。续跑要保存完整组成，而非只一张参数表。本站尚未实现会话恢复导入。\n\n接口骨架见 guide.html#usage 与 applications.html#integration；完整可运行代码在 runtime/experiment.py、route_experiment.py、fish_experiment.py。当前 Python 本机服务提供页面与模型，不调用外部 LLM API；没有公开部署。\n\n## 7. 扩展优先级\n\n1. 已有场景加时长、线索、未见组合，测同一模型条件切换后的恢复与保留。\n2. 加已发操作、物理基线 / 偏差修正及记忆消融，确认哪个信息或机制贡献收益。\n3. 设计多分支 / 范围输出，测覆盖与校准；当前捕鱼不具备概率预测。\n4. 导入独立无人机或设备日志，或小型宠物模拟，先离线对照。\n5. 一维后果学习与规划，再扩到更复杂受控环境；预测成本与实际执行成功分别评分。\n6. 冲突事件、干扰、恢复与存档一致性，测真实长期保留。\n\n直接研究价值是能检查学习如何发生并接受强基线对照；尚未证明通用性能、低功耗或商业收益。\n\n上下文 bandit 的外部原理参考：[Vowpal Wabbit 官方教程](https://vowpalwabbit.org/docs/vowpal_wabbit/python/latest/tutorials/python_Contextual_bandits_and_Vowpal_Wabbit.html)。它在情境下选择有限动作，只观察已选动作的结果；本项目没有实现此对照。\n\n## 8. 固定来源\n\n`;
for (const [key] of Object.entries(sources)) note += `- ${refLinks([key])}\n`;
await writeFile(resolve(import.meta.dirname, '../../notes/capabilities-scenarios.md'), note);
console.log(`Capabilities research: ${algorithms.length} mechanism groups, ${scenarios.length} scene designs; shared Markdown synchronized.`);
