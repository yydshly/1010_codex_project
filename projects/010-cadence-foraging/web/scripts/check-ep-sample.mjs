import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const project = new URL('../../', import.meta.url);
const receipt = JSON.parse(await readFile(new URL('notes/fish-ep-sample.json', project), 'utf8'));
if (receipt.schema !== 'cadence-fish-ep-sample/1' || !receipt.update.updated || receipt.config.batch !== 1 || receipt.parameter_probe?.trials?.length !== 4) {
  throw new Error('EP 单样本记录无效，请运行 runtime/record_fish_ep.py。');
}
for (const [file, hash] of Object.entries(receipt.source_sha256)) {
  const actual = createHash('sha256').update(await readFile(new URL('runtime/' + file, project))).digest('hex');
  if (hash !== actual) throw new Error('EP 单样本记录已过期：' + file + '，请重新运行 record_fish_ep.py。');
}
console.log('EP 单样本：真实自由／正负扰动态及 288 个参数更新，来源哈希一致。');

