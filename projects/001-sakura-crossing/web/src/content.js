import cover from '../../assets/cover.jpg';
import inkOff from '../../assets/ink-off.jpg';
import gradeOff from '../../assets/grade-off.jpg';
import mobile from '../../assets/mobile.jpg';
import research from '../../notes/research.md?raw';
import experiment from '../../notes/experiment.md?raw';
import license from '../THIRD_PARTY.md?raw';
import researchFile from '../../notes/research.md?url';
import experimentFile from '../../notes/experiment.md?url';
import licenseFile from '../THIRD_PARTY.md?url';
import mit from '../licenses/sakura-crossing-MIT.txt?raw';

function section(text, start, end) {
  const from = text.indexOf(start);
  const to = end ? text.indexOf(end, from + start.length) : text.length;
  return text.slice(from, to < 0 ? text.length : to).trim();
}

export const EFFECTS = {
  full: { image: cover, caption: '最小演示实拍 · 描线与调色开启', kicker: '01 / CEL + INK + COLOUR', title: '让三维，拥有动画的笔触。', description: '少量明暗色阶勾出形体，冷紫暗部与暖色高光组织氛围，深度描线勾勒轮廓。' },
  ink: { image: inkOff, caption: '最小演示实拍 · 描线关闭，调色开启', kicker: '02 / WITHOUT INK', title: '少一层线条，多一分体积感。', description: '关闭屏幕描线与外壳描边后，色阶和阴影仍然保留。轮廓的变化说明了线条如何塑造动画背景的观感。' },
  grade: { image: gradeOff, caption: '最小演示实拍 · 描线开启，调色关闭', kicker: '03 / WITHOUT COLOUR GRADE', title: '氛围，来自统一的色彩组织。', description: '关闭风格化调色，暖色高光和冷色暗部的统一程度减弱。色彩空间转换始终保留，保证这是一组有效的对照。' },
};

export const ARTICLES = [
  { id: 'value', number: '01', tag: '能力与产品价值', title: '让一个小镇，成为内容入口', description: '它能做什么、适合什么场景，以及对研究集的复用意义。', image: cover, source: researchFile, filename: 'sakura-crossing-research.md', body: section(research, '## 定位与能力', '## 三渲二渲染原理') + '\n\n' + section(research, '## 场景和效果的使用价值', '## 本地实验选择') },
  { id: 'render', number: '02', tag: '渲染原理', title: '三维场景里的动画笔触', description: '拆解光照色阶、深度描线、冷暖调色与抗锯齿的协作。', image: inkOff, source: researchFile, filename: 'sakura-crossing-research.md', body: section(research, '## 三渲二渲染原理', '## 世界组织与球面映射') },
  { id: 'experiment', number: '03', tag: '实验与验证', title: '从一棵树，到一条研究街', description: '阅读本地实验的真实结果、效果截图与仍待验证的边界。', image: mobile, source: experimentFile, filename: 'sakura-crossing-experiment.md', body: experiment.replace(/^# .+\r?\n/, '') },
];

export const LICENSE = { title: '来源与许可证', body: license.replace(/^# .+\r?\n/, '') + '\n\n## 上游 MIT 原文\n\n```text\n' + mit + '\n```', source: licenseFile, filename: 'sakura-crossing-third-party.md' };

const escape = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

// Deliberately small reader for our repository notes. Raw HTML is escaped;
// external links accept HTTPS only, and local note links use the reader.
function inline(text) {
  const tokens = [];
  let value = text.replace(/`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g, (_, code, label, href) => {
    let html;
    if (code !== undefined) html = '<code>' + escape(code) + '</code>';
    else if (/^https:\/\//.test(href)) html = '<a href="' + escape(href) + '" target="_blank" rel="noopener noreferrer">' + escape(label) + ' ↗</a>';
    else if (/experiment\.md/.test(href)) html = '<button class="text-link" data-read="experiment">' + escape(label) + '</button>';
    else if (/research\.md/.test(href)) html = '<button class="text-link" data-read="value">' + escape(label) + '</button>';
    else if (/THIRD_PARTY\.md/.test(href)) html = '<button class="text-link" data-action="license">' + escape(label) + '</button>';
    else html = escape(label);
    tokens.push(html);
    return '\u0000' + (tokens.length - 1) + '\u0000';
  });
  value = escape(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return value.replace(/\u0000(\d+)\u0000/g, (_, id) => tokens[Number(id)]);
}

export function renderMarkdown(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const output = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const diagram = line === '```mermaid';
      const code = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      if (diagram) {
        const labels = [...code.join('\n').matchAll(/[A-Z]\[([^\]]+)\]/g)].map((match) => match[1]);
        output.push('<ol class="pipeline-diagram" aria-label="三渲二渲染流程">' + labels.map((label) => '<li>' + escape(label) + '</li>').join('') + '</ol>');
      } else output.push('<pre><code>' + escape(code.join('\n')) + '</code></pre>');
      i++; continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)/);
    if (heading) { const level = Math.max(2, heading[1].length); output.push('<h' + level + '>' + inline(heading[2]) + '</h' + level + '>'); i++; continue; }
    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[\s:|\-]+\|$/)) {
      const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
      const head = cells(line); i += 2;
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(cells(lines[i++]));
      output.push('<div class="table-scroll"><table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' + rows.map((row) => '<tr>' + row.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'); continue;
    }
    if (/^([-*]|\d+\.)\s/.test(line)) {
      const ordered = /^\d+\./.test(line), tag = ordered ? 'ol' : 'ul', items = [];
      const pattern = ordered ? /^\d+\.\s/ : /^[-*]\s/;
      while (i < lines.length && pattern.test(lines[i])) items.push('<li>' + inline(lines[i++].replace(pattern, '')) + '</li>');
      output.push('<' + tag + '>' + items.join('') + '</' + tag + '>'); continue;
    }
    output.push('<p>' + inline(line) + '</p>'); i++;
  }
  return output.join('');
}
