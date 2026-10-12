import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { prepare, webRoot, upstreamDist } from './prepare.mjs';

try {
  await prepare();
  const dist = path.join(webRoot, 'dist');
  await mkdir(dist, { recursive: true });
  await cp(path.join(webRoot, 'public'), dist, { recursive: true });
  await cp(upstreamDist, path.join(dist, 'experience'), { recursive: true });
  await cp(path.join(webRoot, '..', 'notes'), path.join(dist, 'notes'), { recursive: true });
  console.log('已生成 web/dist：中文研究台、固定上游场景及中文笔记，仅供本地学习。');
} catch (error) { console.error(`构建失败：${error.message}`); process.exitCode = 1; }
