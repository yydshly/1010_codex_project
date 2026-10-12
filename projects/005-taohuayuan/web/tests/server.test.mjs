import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createDemoServer } from '../scripts/server.mjs';

test('静态演示支持音频分段、HEAD、目录边界与缺失文件', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'taohuayuan-http-'));
  const shell = path.join(dir, 'shell'), experience = path.join(dir, 'experience');
  await Promise.all([mkdir(shell), mkdir(experience)]);
  await writeFile(path.join(shell, 'index.html'), '<h1>桃源</h1>');
  await writeFile(path.join(experience, 'voice.m4a'), Buffer.from('0123456789'));
  const server = createDemoServer({ shellRoot: shell, experienceRoot: experience });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); await rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(`${base}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /桃源/);
  const partial = await fetch(`${base}/experience/voice.m4a`, { headers: { Range: 'bytes=2-5' } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-range'), 'bytes 2-5/10');
  assert.equal(partial.headers.get('content-type'), 'audio/mp4');
  assert.equal(await partial.text(), '2345');
  const suffix = await fetch(`${base}/experience/voice.m4a`, { headers: { Range: 'bytes=-3' } });
  assert.equal(await suffix.text(), '789');
  const head = await fetch(`${base}/experience/voice.m4a`, { method: 'HEAD', headers: { Range: 'bytes=0-1' } });
  assert.equal(head.status, 206);
  assert.equal(head.headers.get('content-length'), '2');
  assert.equal(await head.text(), '');
  for (const range of ['bytes=50-60', 'bytes=-0', 'bytes=3-1', 'bytes=0-1,3-4']) {
    assert.equal((await fetch(`${base}/experience/voice.m4a`, { headers: { Range: range } })).status, 416);
  }
  assert.equal((await fetch(`${base}/experience/..%2f..%2foutside`)).status, 403);
  assert.equal((await fetch(`${base}/absent.js`)).status, 404);
  assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
});
