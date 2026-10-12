// Product descriptions are authored once in JSON; this generates the portable research note.
import { readFile, writeFile, access } from 'node:fs/promises';
import { SCENES } from '../src/lab/configs.js';

const dataUrl = new URL('../../notes/product-directions.json', import.meta.url);
const noteUrl = new URL('../../notes/product-directions.md', import.meta.url);
const data = JSON.parse(await readFile(dataUrl, 'utf8'));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const requireFields = (item, fields, label) => fields.forEach((field) => assert(nonempty(item[field]), `${label} 缺少 ${field}`));
assert(data.schemaVersion === 1, '不支持的内容协议版本');
requireFields(data, ['title', 'updatedAt', 'summary'], '内容');
assert(/^[a-f0-9]{40}$/.test(data.source.commit), '来源 commit 必须固定');
const capabilityIds = new Set(data.capabilities.map((item) => item.id));
assert(capabilityIds.size === data.capabilities.length, '能力 ID 重复');
for (const item of data.capabilities) {
  requireFields(item, ['id', 'title', 'detail', 'evidence'], '能力');
  assert(/^[a-z-]+\.md$/.test(item.evidence), '验证记录必须是同目录笔记');
  await access(new URL('../../notes/' + item.evidence, import.meta.url));
}
const directionIds = new Set(data.directions.map((item) => item.id));
assert(directionIds.size === data.directions.length, '方向 ID 重复');
for (const id of ['research-town', 'scene-builder', 'exploration-game']) assert(directionIds.has(id), '首页摘要关联的稳定方向 ID 缺失');
for (const item of data.directions) {
  requireFields(item, ['id', 'title', 'category', 'priority', 'effort', 'stage', 'scene', 'audience', 'problem', 'scenario', 'mvp', 'constraint'], '方向');
  assert(/^[a-z-]+$/.test(item.id), '方向 ID 必须是稳定的英文短名');
  assert(['first', 'next', 'later'].includes(item.priority), '推进顺序无效');
  assert(SCENES[item.scene], '关联场景不存在');
  if (item.demo) { assert(item.demo === 'builder.html', '演示入口须为已实现的搭建器'); await access(new URL('../' + item.demo, import.meta.url)); }
  for (const key of ['loop', 'validation']) assert(item[key]?.length >= 2 && item[key].every(nonempty), `${item.id} 缺少 ${key}`);
  assert(item.reuse?.length > 0 && item.reuse.every((id) => capabilityIds.has(id)), '复用能力不存在');
  assert(item.additions?.length > 0, '需要说明待补能力');
  item.additions.forEach((addition) => requireFields(addition, ['title', 'detail'], '待补能力'));
}
const priority = { first: '优先探索', next: '按需求推进', later: '后期探索' };
const lines = [`# ${data.title}`, '', data.summary, '', `更新日期：${data.updatedAt}。内容协议版本：${data.schemaVersion}。`, '',
  `上游：[Sakura Crossing](${data.source.repository})，固定版本 [${data.source.commit}](${data.source.repository}/tree/${data.source.commit})。`, '', data.source.license, '', data.source.scope, '',
  '## 能力理解', '', `**${data.understanding.position}。** ${data.understanding.explanation}`, ''];
for (const item of data.understanding.mechanism) lines.push(`- **${item.title}：**${item.text}`);
lines.push('', '## 产品价值', '');
for (const item of data.understanding.value) lines.push(`### ${item.title}`, '', item.text, '');
lines.push('## 本地已有能力', '', '| 能力 | 当前实现 | 验证记录 |', '| --- | --- | --- |');
for (const item of data.capabilities) lines.push(`| ${item.title} | ${item.detail} | [记录](${item.evidence}) |`);
lines.push('', data.understanding.boundary, '', '## 可扩展产品方向', '');
for (const item of data.directions) {
  lines.push(`### ${item.title}`, '', `${item.category}；${priority[item.priority]}；工程范围：${item.effort}。${item.stage}。`, '',
    `**目标用户：**${item.audience}。`, '', `**用户问题：**${item.problem}`, '', item.scenario, '',
    `**用户流程：**${item.loop.join(' → ')}。`, '', `**现有基础：**${item.reuse.map((id) => data.capabilities.find((entry) => entry.id === id).title).join('、')}。`, '', '**需要新增：**', '');
  item.additions.forEach((addition) => lines.push(`- **${addition.title}：**${addition.detail}`));
  lines.push('', `**最小方案：**${item.mvp}`, '', '**完成条件：**', '');
  item.validation.forEach((text) => lines.push(`- ${text}`));
  if (item.demo) lines.push('', `已实现演示：[最小小镇搭建器](../web/${item.demo})；操作与验证见 [搭建器记录](builder.md)。`);
  lines.push('', `**适用条件：**${item.constraint}`, '', `关联视觉：[${SCENES[item.scene].name}](../web/lab.html#${item.scene})。${item.demo ? '完整扩展方案见上述缺口，最小搭建器已有独立入口。' : '这是现有场景实验，不代表该产品已经实现。'}`, '');
}
lines.push('## 推进顺序', '', data.recommendation.basis, '');
data.recommendation.items.forEach((item) => lines.push(`### ${item.title}`, '', item.text, ''));
lines.push('## 分层复用', '', data.reuse.principle, '');
data.reuse.layers.forEach((item) => lines.push(`### ${item.title}`, '', `当前：${item.now}`, '', `扩展：${item.next}`, ''));
lines.push('## 新场景接入步骤', '');
data.reuse.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`));
lines.push('', '## AI 辅助扩展', '', data.reuse.ai, '', '## 内容数据的维护与复用', '', data.reuse.dataContract, '',
  '数据源：[product-directions.json](product-directions.json)。在 `web/` 下运行：', '', '```powershell', 'npm.cmd run content:sync', 'npm.cmd run content:check', 'npm.cmd run build', '```', '',
  '`content:check` 校验稳定 ID、能力引用、场景关联、必要描述与笔记同步状态；构建前自动运行。新增方向应保留已有 ID，为新方向分配新 ID。场景跳转仅使用已有的 `street`、`forest`、`square`。', '',
  '维护协议与实现说明见 [复用说明](../web/README.md#产品方向内容的复用)。本笔记由 JSON 生成，请修改数据源后同步。', '', '## 来源与参考', '');
data.references.forEach((item) => lines.push(`- [${item.title}](${item.url})：${item.scope}`));
lines.push('', '[返回研究笔记索引](README.md)', '');
const markdown = lines.join('\n');
if (process.argv.includes('--check')) {
  assert((await readFile(noteUrl, 'utf8')).replaceAll('\r\n', '\n') === markdown, '产品笔记未同步，请运行 npm run content:sync');
  console.log(`内容检查通过：${data.capabilities.length} 项能力、${data.directions.length} 个方向；引用、场景和笔记一致。`);
} else {
  await writeFile(noteUrl, markdown, 'utf8');
  console.log('已从产品方向 JSON 同步中文研究笔记。');
}
