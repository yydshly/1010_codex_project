import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const asset = name => new URL(`../../assets/${name}`, import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const input = await readFile(asset('research-overview.png'));
if (process.argv.includes('--check')) {
  const record = JSON.parse(await readFile(asset('research-guide-export.json'), 'utf8'));
  const output = await readFile(asset('research-guide.webp'));
  if (record.sourceSha256 !== hash(input) || record.sha256 !== hash(output)) throw new Error('网页引导图已过期，请重新优化。');
  console.log(`网页引导图检查通过：${record.width} × ${record.height}，${output.length} 字节。`);
} else {
  const index = process.argv.indexOf('--sharp-module');
  const modulePath = index >= 0 ? process.argv[index + 1] : 'sharp';
  const sharp = createRequire(import.meta.url)(index >= 0 ? resolve(modulePath) : modulePath);
  const { data, info } = await sharp(input).resize({width:1280}).webp({quality:88}).toBuffer({resolveWithObject:true});
  await writeFile(asset('research-guide.webp'), data);
  await writeFile(asset('research-guide-export.json'), JSON.stringify({
    source:'research-overview.png', sourceSha256:hash(input), width:info.width, height:info.height,
    bytes:data.length, sha256:hash(data), operation:'仅缩放与压缩；完整原图、SVG 和提示词保留',
  },null,2)+'\n');
  console.log(`网页引导图已优化：${info.width} × ${info.height}，${data.length} 字节。`);
}
