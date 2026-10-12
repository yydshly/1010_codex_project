import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const receipt = JSON.parse(readFileSync(resolve(root, 'notes/route-evaluation-results.json'), 'utf8'));
for (const [name, expected] of Object.entries(receipt.source_sha256)) {
  const actual = createHash('sha256').update(readFileSync(resolve(root, 'runtime', name))).digest('hex');
  if (actual !== expected) throw new Error(`评估代码已变化，须重新运行：${name}`);
}
const groups = new Map();
for (const life of receipt.lives) {
  const key = `${life.cue_mode}/${life.reward_mode}/${life.trace_amplitude}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(life);
}
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
const modes = [...groups.values()].map(lives => {
  const first = lives[0];
  return {
    cue_mode: first.cue_mode, reward_mode: first.reward_mode, trace_amplitude: first.trace_amplitude,
    seeds: lives.map(x => x.seed), trips: lives.length * receipt.phase_length * 3,
    controllers: Object.fromEntries(['cadence', 'rule', 'q'].map(key => [key, {
      hit_rate: mean(lives.map(x => x.controllers[key].hits / (receipt.phase_length * 3))),
      average_trip_ms: mean(lives.map(x => x.controllers[key].average_trip_ms)),
      phases: [0, 1, 2].map(i => Object.fromEntries(['hit_rate', 'last40', 'cue0_last20', 'cue1_last20'].map(field => [field, mean(lives.map(x => x.controllers[key].phases[i][field]))]))),
    }])),
  };
});
const result = { schema: 'sakura-route-summary/1', seeds: receipt.seeds,
  phase_length: receipt.phase_length, source_sha256: receipt.source_sha256,
  upstream_commit: receipt.lives[0].provenance.commit, modes };
writeFileSync(resolve(root, 'web/src/route-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`已生成实测摘要：${receipt.lives.length} 次实验，${modes.length} 种条件。`);
