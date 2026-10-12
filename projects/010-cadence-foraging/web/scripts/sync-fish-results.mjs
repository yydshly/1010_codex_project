import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../../', import.meta.url);
const receipt = JSON.parse(await readFile(new URL('notes/fish-evaluation-results.json', root), 'utf8'));
for (const [name, hash] of Object.entries(receipt.source_sha256)) {
  const actual = createHash('sha256').update(await readFile(new URL(`runtime/${name}`, root))).digest('hex');
  if (actual !== hash) throw new Error(`捕鱼结果已过期：${name}，请重新运行 evaluate_fish.py`);
}
await writeFile(new URL('web/src/fish-results.json', root), JSON.stringify({
  date: receipt.date, seeds: receipt.seeds, scope: receipt.scope, source_sha256: receipt.source_sha256,
  aggregate: receipt.aggregate,
  runs: receipt.runs.map(r => ({mode: r.mode, seed: r.seed, updates: r.trained.updates, metrics: r.trained.metrics})),
}, null, 2) + '\n');
console.log('捕鱼四种子结果已核对来源并同步。');
