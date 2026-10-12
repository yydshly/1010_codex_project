import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const bin = process.argv[2];
if (!bin) throw new Error('请传入包含 ffmpeg.exe / ffprobe.exe 的目录');
const results = [];
for (const file of ['image-anchor.jpeg', 'video-range.mp4', 'voice-range.ogg', 'voice-mismatch.ogg']) {
  let metadata = null, probeError = null, decodeError = null;
  const target = path.join(root, 'results', file);
  try { metadata = JSON.parse(execFileSync(path.join(bin, 'ffprobe.exe'), ['-v', 'error', '-show_entries', 'stream=codec_name,width,height:format=duration,size', '-of', 'json', target], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })); }
  catch (error) { probeError = String(error.stderr || error.message).trim(); }
  try { execFileSync(path.join(bin, 'ffmpeg.exe'), ['-v', 'error', '-i', target, '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (error) { decodeError = String(error.stderr || error.message).trim(); }
  results.push({ file, metadata, probeError, decodeError, decodeSucceeded: decodeError === null });
}
await writeFile(path.join(root, 'results', 'media-verification.json'), JSON.stringify({ testedAt: new Date().toISOString(), tool: 'ffmpeg / ffprobe n6.1.3', scope: '受控实验输出文件的元数据及完整解码；非 Telegram 浏览器实测。', results }, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));
if (results.slice(0, 3).some(result => !result.decodeSucceeded)) throw new Error('正常样例解码失败');
