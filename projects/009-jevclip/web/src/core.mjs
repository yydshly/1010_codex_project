// Original browser implementation inspired by jevclip; no model call is made here.
export const KINDS = { insight: '观点结论', evidence: '数据实测', method: '方法步骤', explain: '概念讲解', story: '经历叙述', smalltalk: '寒暄过渡', promo: '推广求关注', filler: '空话废话' };
export const FOCUS_GROUPS = {
  '方法步骤': ['方法', '步骤', '流程', '配置', '导入', '设置', '第一步', '第二步', '第三步'],
  '实测数据': ['实测', '数据', '耗时', '延迟', '准确率', '测试'],
  '底层原理': ['原理', '架构', '概率', '模型', '算法'],
};
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600), m = Math.floor(total / 60) % 60, s = total % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
export function timestamp(value) {
  if (typeof value === 'number') return value;
  const parts = String(value).replace(',', '.').split(':').map(Number);
  if (parts.some(p => !Number.isFinite(p) || p < 0) || parts.length < 2 || parts.length > 3 || parts.at(-1) >= 60 || parts.length === 3 && parts[1] >= 60) return NaN;
  return parts.reduce((total, p) => total * 60 + p, 0);
}
export function where(cue) {
  return cue.start === null ? `¶${cue.paragraphs?.join('–') || 1}` : `${formatTime(cue.start)}–${formatTime(cue.end)}`;
}
function cleanText(value) {
  if (typeof value !== 'string') throw new Error('每个字幕片段都需要 text 字符串');
  return value.replace(/<\/?(?:b|i|u|c|v|ruby|rt)(?:[ .][^>]*)?>/gi, '').replace(/\{\\[^}]*\}/g, '').trim();
}
function normalize(rows, upstream = false) {
  if (!rows.length) throw new Error('没有找到有效字幕或文字段落');
  if (rows.length > 5000) throw new Error('最多支持 5,000 条字幕，请拆分文件后导入');
  const normalized = rows.map((row, index) => {
    const text = cleanText(row.text);
    if (!text) throw new Error(`第 ${index + 1} 条字幕为空`);
    const untimed = row.start === null && row.end === null;
    if (!untimed && (row.start === null || row.end === null)) throw new Error(`第 ${index + 1} 条字幕的起止时间无效`);
    const start = untimed ? null : Number(row.start), end = untimed ? null : Number(row.end);
    if (!untimed && (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start)) throw new Error(`第 ${index + 1} 条字幕的起止时间无效`);
    return { id: upstream ? String(row.id || `S${index + 1}`) : `S${index + 1}`, start, end, text,
      paragraphs: untimed ? (row.paragraphs || [index + 1]) : null,
      estimated: Boolean(row.estimated),
      ...(upstream ? { verdict: { keep: typeof row.keep === 'boolean' ? row.keep : null, kind: row.kind || 'explain', reasons: Array.isArray(row.reasons) ? row.reasons.map(String) : [], value: typeof row.value === 'number' ? row.value : null } } : {}),
    };
  });
  if (new Set(normalized.map(row => row.id)).size !== normalized.length) throw new Error('片段编号不能重复');
  if (normalized.some(row => row.start === null) && normalized.some(row => row.start !== null)) throw new Error('不能混用时间字幕和无时间文字稿');
  if (normalized[0].start !== null) normalized.sort((a, b) => a.start - b.start);
  return { cues: normalized, timed: normalized[0].start !== null, upstream };
}
export function parseInput(input, filename = 'transcript.srt') {
  const text = String(input).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!text) throw new Error('文件为空，请选择包含字幕或文字稿的文件');
  if (/\.json$/i.test(filename) || /^[\[{]/.test(text) && !/^\[\d+:/.test(text)) {
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('JSON 格式错误，请检查括号、引号和逗号'); }
    const upstream = !Array.isArray(data) && Array.isArray(data.segments) && data.segments.some(row => 'keep' in row);
    const rows = Array.isArray(data) ? data : data.segments || data.transcription;
    if (!Array.isArray(rows)) throw new Error('JSON 需要字幕数组、segments 或 whisper.cpp transcription 字段');
    return normalize(rows.map(row => {
      if (!row || typeof row !== 'object') throw new Error('JSON 的每一项必须是字幕对象');
      if (row.offsets) return { ...row, start: row.offsets.from / 1000, end: row.offsets.to / 1000 };
      if (row.timestamps) return { ...row, start: timestamp(row.timestamps.from), end: timestamp(row.timestamps.to) };
      return row;
    }), upstream);
  }
  if (text.includes('-->') || /\.(srt|vtt)$/i.test(filename)) {
    const rows = [];
    for (const block of text.split(/\n\s*\n/)) {
      if (/^(WEBVTT|NOTE|STYLE|REGION)(?:\s|$)/.test(block)) continue;
      const lines = block.split('\n');
      const index = lines.findIndex(line => line.includes('-->'));
      if (index < 0) continue;
      const match = lines[index].match(/(\d{1,3}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*-->\s*(\d{1,3}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)/);
      if (!match) throw new Error('发现无效字幕时间行，请使用 SRT 或 WebVTT 时间格式');
      rows.push({ start: timestamp(match[1]), end: timestamp(match[2]), text: lines.slice(index + 1).join(' ') });
    }
    return normalize(rows);
  }
  const entries = [];
  let pending = null;
  for (const line of text.split('\n')) {
    const match = line.match(/^\s*[\[(]?((?:\d{1,3}:)?\d{1,3}:\d{2}(?:[.,]\d{1,3})?)[\])]?(?:\s*[-–—:]\s*|\s+|$)(.*)$/);
    if (match) { pending = { start: timestamp(match[1]), text: match[2] }; entries.push(pending); }
    else if (pending && line.trim()) pending.text += ` ${line.trim()}`;
  }
  if (entries.length) return normalize(entries.map((row, i) => ({ ...row, end: entries[i + 1]?.start ?? row.start + 10, estimated: true })));
  const paragraphs = text.includes('\n\n') ? text.split(/\n\s*\n/) : text.split('\n');
  return normalize(paragraphs.filter(p => p.trim()).map((p, i) => ({ text: p.replace(/^#{1,6}\s+/gm, ''), start: null, end: null, paragraphs: [i + 1] })));
}
export function segmentCues(cues, target = 20) {
  if (!cues.length || cues[0].start === null || cues.some(c => c.verdict)) return cues;
  const groups = [];
  let current;
  for (const cue of cues) {
    if (!current || (current.end - current.start >= target && (cue.start - current.end >= 0.5 || /[。！？.!?]$/.test(current.text))) || cue.start - current.end >= 3 || cue.end - current.start > 60) {
      current = { ...cue, id: `S${groups.length + 1}` }; groups.push(current);
    } else { current.end = Math.max(current.end, cue.end); current.text += ` ${cue.text}`; current.estimated ||= cue.estimated; }
  }
  return groups;
}
const junkRules = [
  ['promo', /点赞|关注我的|订阅|投币|购买链接|优惠码|赞助商|带货/],
  ['smalltalk', /^(大家好|各位好|欢迎来到|今天先聊聊|感谢大家收看|下期再见)/],
  ['filler', /努力就会成功|坚持就是胜利|相信自己|总而言之加油/],
];
export function classify(text) {
  for (const [kind, regex] of junkRules) { const hit = text.match(regex); if (hit) return { kind, junk: true, reason: `命中${KINDS[kind]}关键词「${hit[0]}」` }; }
  if (/步骤|方法|流程|首先|第[一二三四五六七八九十]步|导入|设置|配置/.test(text)) return { kind: 'method', junk: false, reason: '未命中寒暄与推广关键词' };
  if (/实测|数据|\d+(?:\.\d+)?\s*(?:%|秒|分钟|条|倍|GB|MB)/i.test(text)) return { kind: 'evidence', junk: false, reason: '未命中寒暄与推广关键词' };
  if (/原理|架构|概率|算法|概念/.test(text)) return { kind: 'explain', junk: false, reason: '未命中寒暄与推广关键词' };
  return { kind: 'insight', junk: false, reason: '未命中寒暄与推广关键词' };
}
export function matchesFocus(text, focus) {
  return !focus.length || focus.some(item => (FOCUS_GROUPS[item] || [item]).some(word => text.toLocaleLowerCase().includes(word.toLocaleLowerCase())));
}
export function evaluate(cues, { focus = [], hideFiller = true, overrides = {} } = {}) {
  return cues.map(cue => {
    const local = classify(cue.text);
    const related = matchesFocus(cue.text, focus);
    let keep = cue.verdict ? cue.verdict.keep : !hideFiller || !local.junk;
    let reason = cue.verdict ? cue.verdict.reasons.join('；') || (keep === null ? '上游尚未判断，请人工核对' : keep ? 'Jevclip 判为保留' : 'Jevclip 判为舍弃') : hideFiller ? local.reason : '已关闭寒暄与推广过滤';
    if (!related) { keep = false; reason = '未命中当前关注点关键词'; }
    if (Object.hasOwn(overrides, cue.id)) { keep = Boolean(overrides[cue.id]); reason = keep ? '人工保留' : '人工舍弃'; }
    return { ...cue, keep, related, kind: cue.verdict?.kind || local.kind, reason };
  });
}
export function excerpts(rows, focus = []) {
  return rows.filter(row => row.keep === true).map(row => {
    const sentences = row.text.match(/[^。！？.!?]+[。！？.!?]?/g) || [row.text];
    const sentence = focus.length ? sentences.find(s => matchesFocus(s, focus)) || sentences[0] : sentences[0];
    return { id: row.id, kind: row.kind, text: sentence.trim().slice(0, 150) + (sentence.trim().length > 150 ? '…' : ''), source: row };
  });
}
export function markdownReport(title, rows, focus, source = '本地规则筛选') {
  return [`# ${title}`, '', `分析方式：${source}；摘要为原文摘录，未调用生成模型。`, `关注点：${focus.join('、') || '全部内容'}`, '', '## 摘要与依据', '',
    ...excerpts(rows, focus).map(point => `- ${point.text} [${where(point.source)}] (${point.id})`), '', '## 完整时间线', '',
    ...rows.flatMap(row => [`### ${row.id} · ${where(row)} · ${row.keep === null ? '未判断' : row.keep ? '保留' : '舍弃'}`, '', `类型：${KINDS[row.kind] || row.kind}；理由：${row.reason}`, '', row.text, '']),
  ].join('\n');
}
