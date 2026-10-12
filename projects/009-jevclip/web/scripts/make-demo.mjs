import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sampleCues, sampleTitle } from '../src/sample.mjs';

const helper = fileURLToPath(new URL('./make_demo.py', import.meta.url));
const result = spawnSync('python', [helper], { input: JSON.stringify({ title: sampleTitle, cues: sampleCues }), encoding: 'utf8' });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exitCode = result.status || (result.error ? 1 : 0);
