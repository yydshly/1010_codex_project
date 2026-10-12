import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// Offline authoring only. No credentials or MiniMax requests enter the web app.
const root = fileURLToPath(new URL('../', import.meta.url));
const spec = JSON.parse(await readFile(path.join(root, 'src/tour/narration.json'), 'utf8'));
const configFile = process.env.STREET_MINIMAX_ENV || 'F:/codex_project/.env.minimax';
const config = {};
if (existsSync(configFile)) {
  for (const line of (await readFile(configFile, 'utf8')).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (match) config[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
const key = process.env.MINIMAX_API_KEY || config.MINIMAX_API_KEY;
if (!key) throw new Error('请在本机配置 MINIMAX_API_KEY，或用 STREET_MINIMAX_ENV 指定配置文件。');
const base = new URL(process.env.MINIMAX_API_BASE || config.MINIMAX_API_BASE || 'https://api.minimax.cn');
if (base.protocol !== 'https:' || !['api.minimax.cn', 'api.minimax.io', 'api.minimaxi.com'].includes(base.hostname)) {
  throw new Error('语音生成仅接受官方 MiniMax HTTPS 地址。');
}
const endpoint = `${base.origin}/v1/t2a_v2`;
const cache = path.join(root, '../.cache/tour-voice');
const output = path.join(root, 'src/tour/audio');
await mkdir(cache, { recursive: true }); await mkdir(output, { recursive: true });
const hash = (data) => createHash('sha256').update(data).digest('hex');
const run = (tool, args) => execFileSync(tool, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const probe = (file) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]).trim());
const records = [], subtitles = [], files = [];
for (const [index, segment] of spec.segments.entries()) {
  const request = {
    model: spec.model, text: segment.text, stream: false, language_boost: 'Chinese', output_format: 'hex',
    voice_setting: { voice_id: spec.voiceId, speed: spec.speed, vol: 1, pitch: 0, emotion: 'calm' },
    audio_setting: { sample_rate: 32000, format: 'wav', channel: 1 },
    subtitle_enable: true, subtitle_type: 'sentence',
  };
  const identity = hash(JSON.stringify(request));
  const raw = path.join(cache, `${index}-${identity}.wav`);
  const metadata = path.join(cache, `${index}-${identity}.json`);
  let result;
  if (existsSync(raw) && existsSync(metadata)) {
    result = JSON.parse(await readFile(metadata, 'utf8'));
  } else {
    console.log(`MiniMax 生成 ${index + 1}/${spec.segments.length}：${segment.at}–${segment.until} 秒`);
    const response = await fetch(endpoint, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(90000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const body = await response.json();
    if (!response.ok || body.base_resp?.status_code !== 0 || !body.data?.audio) {
      throw new Error(`MiniMax 合成失败：HTTP ${response.status} / code ${body.base_resp?.status_code ?? 'unknown'}`);
    }
    if (!/^(?:[a-f\d]{2})+$/i.test(body.data.audio)) throw new Error('MiniMax 音频不是有效 hex 数据');
    await writeFile(raw, Buffer.from(body.data.audio, 'hex'));
    let cues = [];
    if (body.data.subtitle_file) {
      const subtitleResponse = await fetch(body.data.subtitle_file, { signal: AbortSignal.timeout(30000) });
      if (!subtitleResponse.ok) throw new Error('MiniMax 字幕下载失败');
      cues = await subtitleResponse.json();
    }
    result = { generatedAt: new Date().toISOString(), traceId: body.trace_id, extraInfo: body.extra_info, cues };
    await writeFile(metadata, JSON.stringify(result, null, 2) + '\n');
  }
  const duration = probe(raw);
  const slot = segment.until - segment.at;
  const tempo = Math.max(1, duration / (slot - 0.28));
  if (tempo > 1.35) throw new Error(`第 ${index + 1} 段需加速过多，请缩短讲解稿再生成。`);
  const fitted = path.join(cache, `fitted-${index}.wav`);
  run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', `atempo=${tempo.toFixed(8)},apad,atrim=duration=${slot},asetpts=PTS-STARTPTS`, '-ar', '32000', '-ac', '1', fitted]);
  files.push(fitted);
  const cues = Array.isArray(result.cues) ? result.cues : [];
  // MiniMax sentence timestamps are milliseconds; transform them with the same tempo as the sound.
  if (!cues.length) throw new Error('MiniMax 未返回句级字幕，不生成未经对齐的成品。');
  for (const cue of cues) {
    if (!Number.isFinite(cue.time_begin) || !Number.isFinite(cue.time_end) || !cue.text) throw new Error('MiniMax 字幕结构不符合预期');
    subtitles.push({ at: segment.at + cue.time_begin / 1000 / tempo, until: segment.at + cue.time_end / 1000 / tempo, text: cue.text });
  }
  records.push({ ...segment, ...result, request, sourceDuration: duration, tempo, speechUntil: segment.at + duration / tempo, sourceSha256: hash(await readFile(raw)) });
  console.log(`第 ${index + 1} 段完成：原始 ${duration.toFixed(2)}s，节奏 ×${tempo.toFixed(3)}，${cues.length} 句字幕`);
}
const combined = path.join(output, 'tour-zh.mp3');
const inputs = files.flatMap((file) => ['-i', file]);
run('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', `${files.map((_, i) => `[${i}:a]`).join('')}concat=n=${files.length}:v=0:a=1,alimiter=limit=0.89:level=false[a]`, '-map', '[a]', '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '32000', '-ac', '1', combined]);
await writeFile(path.join(output, 'subtitles.json'), JSON.stringify(subtitles, null, 2) + '\n');
const finalBytes = await readFile(combined);
await writeFile(path.join(root, '../notes/tour-voice-generation.json'), JSON.stringify({
  provider: 'MiniMax', endpoint, model: spec.model, voiceId: spec.voiceId, voiceName: spec.voiceName,
  duration: spec.duration, encodedDuration: probe(combined), sampleRate: 32000, channels: 1,
  finalSha256: hash(finalBytes), finalBytes: finalBytes.length,
  process: 'Six original narration segments; tempo fitting without pitch change, silence padding, concatenate, peak limit, MP3 encode. Sentence subtitles use MiniMax timestamps transformed by the identical tempo and segment offsets.',
  segments: records,
}, null, 2) + '\n');
console.log(`完成：${combined}，${probe(combined).toFixed(3)}s，${finalBytes.length} bytes`);
