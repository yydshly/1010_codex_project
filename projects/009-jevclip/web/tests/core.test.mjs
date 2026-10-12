import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInput, segmentCues, evaluate, excerpts, markdownReport, matchesFocus, where } from '../src/core.mjs';
import { sampleCues } from '../src/sample.mjs';

test('SRT: BOM, CRLF, multiline, formatting tags and decimal timestamps', () => {
  const result = parseInput('\uFEFF1\r\n00:00:01,250 --> 00:00:04,500\r\n<i>模型</i>\r\n原理。\r\n', 'a.srt');
  assert.equal(result.cues[0].start, 1.25); assert.equal(result.cues[0].end, 4.5); assert.equal(result.cues[0].text, '模型 原理。');
});
test('WebVTT skips header and notes and accepts settings', () => {
  const result = parseInput('WEBVTT\n\nNOTE private note\nignored\n\n00:01.000 --> 00:03.000 align:start\nhello\n', 'a.vtt');
  assert.equal(result.cues.length, 1); assert.equal(result.cues[0].text, 'hello');
});
test('whisper.cpp offsets are milliseconds', () => {
  const result = parseInput(JSON.stringify({ transcription: [{ offsets: { from: 1000, to: 3000 }, text: '模型方法' }] }), 'a.json');
  assert.equal(result.cues[0].start, 1); assert.equal(result.cues[0].end, 3);
});
test('JSON subtitles sort chronologically and reject invalid intervals', () => {
  assert.equal(parseInput('[{"start":5,"end":7,"text":"later"},{"start":1,"end":2,"text":"first"}]', 'a.json').cues[0].text, 'first');
  assert.throws(() => parseInput('[{"start":5,"end":4,"text":"wrong"}]', 'a.json'), /时间无效/);
  assert.throws(() => parseInput('{broken', 'a.json'), /JSON 格式错误/);
});
test('empty subtitles and invalid timestamps do not yield fabricated content', () => {
  assert.throws(() => parseInput('', 'a.srt'), /文件为空/);
  assert.throws(() => parseInput('some text', 'a.srt'), /没有找到/);
  assert.throws(() => parseInput('1\nhello --> goodbye\ntext', 'a.srt'), /无效字幕时间/);
});
test('a plain script has paragraph positions and no video timestamps', () => {
  const result = parseInput('# 研究\n\n方法步骤。\n\n数据结果。', 'a.md');
  assert.equal(result.timed, false); assert.equal(result.cues[1].start, null); assert.equal(where(result.cues[1]), '¶2');
  assert.deepEqual(segmentCues(result.cues), result.cues);
});
test('start-only timestamp text is explicitly marked estimated', () => {
  const result = parseInput('0:00\nfirst\n0:12\nsecond', 'a.txt');
  assert.equal(result.cues[0].end, 12); assert.equal(result.cues[1].estimated, true);
});
test('partly missing timestamps and invalid seconds are rejected', () => {
  assert.throws(() => parseInput('[{"start":null,"end":5,"text":"wrong"}]', 'a.json'), /时间无效/);
  assert.throws(() => parseInput('1\n00:00:75,000 --> 00:02:00,000\nwrong', 'a.srt'), /时间无效/);
});
test('segmenting never splits a cue and retains all text', () => {
  const input = Array.from({ length: 6 }, (_, i) => ({ id: `S${i + 1}`, start: i * 5, end: i * 5 + 5, text: `句${i + 1}。` }));
  const result = segmentCues(input);
  assert.equal(result.length, 2); assert.equal(result[0].end, 20); assert.equal(result[1].start, 20);
  for (const cue of input) assert.ok(result.some(segment => segment.text.includes(cue.text)));
});
test('focus uses OR matching, named keyword groups and case insensitive custom terms', () => {
  assert.ok(matchesFocus('GPU 配置和运行', ['gpu'])); assert.ok(matchesFocus('导入字幕', ['方法步骤']));
  assert.ok(matchesFocus('算法解释', ['方法步骤', '底层原理'])); assert.equal(matchesFocus('随便聊天', ['性能']), false);
});
test('sample local filter retains eight segments and produces exact source excerpts', () => {
  const rows = evaluate(sampleCues); const points = excerpts(rows);
  assert.equal(rows.filter(row => row.keep).length, 8); assert.equal(points.length, 8);
  for (const point of points) assert.ok(point.source.text.includes(point.text));
});
test('manual keep and drop override automatic focus and filler decisions', () => {
  const rows = evaluate(sampleCues, { focus: ['nonexistent'], overrides: { S1: true, S4: false } });
  assert.equal(rows[0].keep, true); assert.equal(rows[0].reason, '人工保留'); assert.equal(rows[3].keep, false);
});
test('Jevclip results preserve actual verdicts, scores and undetermined state', () => {
  const result = parseInput(JSON.stringify({ segments: [{ id: 'S7', start: 0, end: 3, text: '实测结果', keep: true, kind: 'evidence', value: 0.8, reasons: [] }, { id: 'S8', start: 4, end: 7, text: 'unknown', keep: null, status: 'error' }] }), 'segments.json');
  const rows = evaluate(result.cues); assert.equal(rows[0].verdict.value, 0.8); assert.equal(rows[1].keep, null);
  assert.equal(excerpts(rows).length, 1); assert.equal(segmentCues(result.cues).length, 2);
});
test('duplicate upstream IDs and mixed time domains are rejected', () => {
  assert.throws(() => parseInput(JSON.stringify({ segments: [{ id: 'S1', start: 0, end: 2, text: 'a', keep: true }, { id: 'S1', start: 2, end: 4, text: 'b', keep: true }] }), 'a.json'), /编号不能重复/);
  assert.throws(() => parseInput('[{"start":null,"end":null,"text":"a"},{"start":1,"end":2,"text":"b"}]', 'a.json'), /不能混用/);
});
test('export includes provenance, citations, original text and human decisions', () => {
  const rows = evaluate(sampleCues, { overrides: { S3: false } }); const markdown = markdownReport('test', rows, []);
  assert.ok(markdown.includes('未调用生成模型')); assert.ok(markdown.includes('[00:20–00:40] (S2)'));
  assert.ok(markdown.includes('人工舍弃')); assert.ok(markdown.includes(sampleCues[2].text));
});
