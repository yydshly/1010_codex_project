import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir, stat, cp } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { loadImage } from '@napi-rs/canvas';
import { CodexBridge } from './lib/codex.mjs';
import { minimaxEnv, validateConfig, publicConfig, generateText, generateImage, generateVoice, hash } from './lib/providers.mjs';
import { probe, renderProject, command } from './lib/render.mjs';

const root = path.dirname(fileURLToPath(import.meta.url)), store = path.join(root,'.local/projects');
await mkdir(store, { recursive: true });
const env = await minimaxEnv(process.env.STUDIO_MINIMAX_ENV || 'F:/codex_project/.env.minimax');
let config = { text: { provider: 'codex', model: '', apiKey: '' }, image: { provider: 'import', model: 'Codex 图片工具', apiKey: '' }, voice: { provider: 'minimax', model: 'speech-2.8-hd', voice: 'Chinese (Mandarin)_Warm_Girl', ...env } };
const codex = new CodexBridge(path.join(root,'.local/codex')), runtime = { codex: { ready: false }, ffmpeg: false };
codex.start().then(result => { runtime.codex = result; config.text.model ||= result.model; }).catch(e => { runtime.codex = { ready: false, error: e.message }; });
command(process.env.STUDIO_FFMPEG || 'ffmpeg',['-version']).then(() => { runtime.ffmpeg = true; }).catch(() => {});
const projects = new Map(), jobs = new Map();
for (const id of await readdir(store)) {
  try { const p = JSON.parse(await readFile(path.join(store,id,'project.json'),'utf8')); p.busy = false; projects.set(id,p); } catch { /* Incomplete folders are not projects. */ }
}
if (!projects.size) {
  try {
    const sample = path.join(root,'../assets/demo'), p = JSON.parse(await readFile(path.join(sample,'project.json'),'utf8'));
    await cp(sample,path.join(store,p.id),{ recursive: true }); projects.set(p.id,p);
  } catch { /* Demo becomes available after the first actual run. */ }
}
const directory = p => path.join(store,p.id);
async function save(p) { p.updatedAt = new Date().toISOString(); await writeFile(path.join(directory(p),'project.json'),JSON.stringify(p,null,2)); }
function getProject(id) { if (!/^[a-zA-Z0-9-]{1,80}$/.test(id) || !projects.has(id)) throw new Error('项目不存在'); return projects.get(id); }
function editable(p) { if (p.busy) throw new Error('项目正在生成，请等待当前任务完成'); }
function begin(p, operation) {
  editable(p); p.busy = true;
  const job = { id: randomUUID(), projectId: p.id, state: 'running', message: '任务已开始', startedAt: new Date().toISOString(), events: [] }; jobs.set(job.id,job);
  const snapshot = structuredClone(config);
  const progress = message => { job.message = message; job.events.push({ message, at: new Date().toISOString() }); };
  Promise.resolve().then(() => operation(snapshot,progress)).then(() => { job.state = 'completed'; job.message = '已完成'; }).catch(e => { job.state = 'failed'; job.message = e.message; }).finally(async () => { p.busy = false; job.finishedAt = new Date().toISOString(); await save(p); });
  return job;
}
async function assets(p,c,progress,onlyScene,kind = 'all') {
  const selected = onlyScene ? p.scenes.filter(s => s.id === onlyScene) : p.scenes;
  if (!selected.length) throw new Error('没有可生成的场景');
  for (const s of selected) {
    if (kind !== 'voice' && (!s.image || kind === 'image')) {
      progress(`正在生成图片：${s.title}`);
      const file = `${s.id}-image-${Date.now()}.png`;
      const evidence = await generateImage(c.image,s.imagePrompt,path.join(directory(p),file));
      await loadImage(path.join(directory(p),file)); s.image = file; s.imageEvidence = evidence;
    }
    if (kind !== 'image' && (!s.audio || kind === 'voice' || s.voiceEvidence?.text !== s.narration)) {
      progress(`正在生成中文配音：${s.title}`);
      const file = `${s.id}-voice-${Date.now()}.mp3`;
      const evidence = await generateVoice(c.voice,s.narration,path.join(directory(p),file));
      const metadata = await probe(path.join(directory(p),file));
      s.audio = file; s.audioDuration = metadata.duration; s.duration = metadata.duration + .55; s.voiceEvidence = evidence;
    }
    await save(p);
  }
}
function json(res,code,value) { res.writeHead(code,{ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
async function body(req,limit = 1000000) { let size = 0; const parts = []; for await (const b of req) { size += b.length; if (size > limit) throw new Error('请求数据过大'); parts.push(b); } return Buffer.concat(parts); }
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.mp3':'audio/mpeg','.json':'application/json; charset=utf-8' };
async function stream(req,res,file,download = false) {
  const info = await stat(file), headers = { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges':'bytes', 'X-Content-Type-Options':'nosniff', ...(download ? { 'Content-Disposition': `attachment; filename="${path.basename(file)}"` } : {}) };
  let start = 0, end = info.size-1, status = 200;
  if (req.headers.range) {
    const m = req.headers.range.match(/^bytes=(\d*)-(\d*)$/);
    if (!m || (!m[1]&&!m[2])) { res.writeHead(416,{ 'Content-Range':`bytes */${info.size}` }); res.end(); return; }
    if (m[1]) { start = Number(m[1]); if (m[2]) end = Math.min(end,Number(m[2])); }
    else start = Math.max(0,info.size-Number(m[2]));
    if (start > end || start >= info.size) { res.writeHead(416,{ 'Content-Range':`bytes */${info.size}` }); res.end(); return; }
    status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
  }
  headers['Content-Length'] = end-start+1; res.writeHead(status,headers);
  if (req.method === 'HEAD') res.end(); else createReadStream(file,{start,end}).pipe(res);
}
const server = http.createServer(async (req,res) => {
  try {
    const host = req.headers.host;
    if (!['127.0.0.1:'+port,'localhost:'+port].includes(host)) return json(res,403,{ error:'只允许本机访问' });
    if (req.headers.origin && !['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin)) return json(res,403,{ error:'不允许跨站请求' });
    const url = new URL(req.url,'http://'+host), parts = url.pathname.split('/').filter(Boolean);
    if (url.pathname === '/api/state' && req.method === 'GET') return json(res,200,{ config:publicConfig(config), runtime, projects:[...projects.values()].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)), jobs:[...jobs.values()] });
    if (url.pathname === '/api/config' && req.method === 'PUT') {
      const values = JSON.parse(await body(req)), next = structuredClone(config);
      for (const role of ['text','image','voice']) {
        if (values[role]) next[role] = validateConfig({ ...config[role], ...values[role], apiKey: values[role].clearKey ? '' : values[role].apiKey || (values[role].baseUrl && values[role].baseUrl !== config[role].baseUrl ? '' : config[role].apiKey) },role);
      }
      config = next; return json(res,200,publicConfig(config));
    }
    if (url.pathname === '/api/projects' && req.method === 'POST') {
      const input = JSON.parse(await body(req)); if (!String(input.brief||'').trim() || String(input.brief).length > 3000) throw new Error('请输入3000字以内的创作说明');
      const p = { id:randomUUID(),title:'新的视频',brief:input.brief,revision:1,scenes:[],exports:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString() };
      await mkdir(directory(p),{ recursive:true }); projects.set(p.id,p); await save(p);
      const job = begin(p,async (c,progress) => {
        progress('Codex 正在编写中文分镜与口播');
        const { draft,evidence } = await generateText(c.text,codex,p.brief);
        p.title = draft.title; p.scenes = draft.scenes.map((s,i) => ({ ...s,id:'scene-'+(i+1),duration:12 })); p.textEvidence = evidence;
        await writeFile(path.join(directory(p),'ai-draft.json'),JSON.stringify({ ...draft,evidence },null,2)); await save(p);
        if (input.full && c.image.provider !== 'import') {
          await assets(p,c,progress); p.exports.push(await renderProject(p,directory(p),progress));
        } else progress('分镜已生成，请导入图片后生成配音与导出');
      }); return json(res,202,{ projectId:p.id,jobId:job.id });
    }
    if (parts[0] === 'api' && parts[1] === 'projects' && parts[2]) {
      const p = getProject(parts[2]);
      if (parts.length === 3 && req.method === 'PUT') {
        editable(p); const input = JSON.parse(await body(req));
        if (input.revision !== p.revision) return json(res,409,{ error:'项目版本已变化，请刷新后保存' });
        if (!Array.isArray(input.scenes) || input.scenes.length < 1 || input.scenes.length > 12) throw new Error('场景数量应为1至12');
        const existing = new Map(p.scenes.map(s => [s.id,s]));
        if (new Set(input.scenes.map(s => s.id)).size !== input.scenes.length) throw new Error('场景编号重复');
        const next = input.scenes.map(s => {
          if (!existing.has(s.id)) throw new Error('不能创建未知场景');
          for (const key of ['title','body','narration','imagePrompt']) if (typeof s[key] !== 'string' || !s[key].trim() || s[key].length > (key==='title'?30:1500)) throw new Error('场景字段不正确：'+key);
          return { ...existing.get(s.id), ...Object.fromEntries(['title','body','narration','imagePrompt'].map(k => [k,s[k]])) };
        });
        if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 100) throw new Error('视频名称应为1至100字');
        p.title = input.title; p.scenes = next; p.revision++; p.editedAt = new Date().toISOString(); await save(p); return json(res,200,p);
      }
      if (parts[3] === 'image' && req.method === 'POST') {
        editable(p); const s = p.scenes.find(s => s.id === url.searchParams.get('scene')); if (!s) throw new Error('场景不存在');
        const bytes = await body(req,20000000); await loadImage(bytes);
        const file = `${s.id}-import-${Date.now()}.png`; await writeFile(path.join(directory(p),file),bytes);
        s.image = file; s.imageEvidence = { provider:'import',model:'用户导入',sha256:hash(bytes),at:new Date().toISOString() }; p.revision++; await save(p); return json(res,200,p);
      }
      if (['generate','export'].includes(parts[3]) && req.method === 'POST') {
        const input = JSON.parse((await body(req)).toString() || '{}');
        if (input.kind && !['all','voice','image'].includes(input.kind)) throw new Error('素材类型不正确');
        const job = begin(p,async (c,progress) => {
          p.revision++;
          if (parts[3] === 'generate') await assets(p,c,progress,input.sceneId,input.kind || 'all');
          if (!input.sceneId) p.exports.push(await renderProject(p,directory(p),progress));
        }); return json(res,202,{ projectId:p.id,jobId:job.id });
      }
    }
    if (parts[0] === 'media' && parts[1]) {
      if (!['GET','HEAD'].includes(req.method)) return json(res,405,{ error:'不支持的方法' });
      const p = getProject(parts[1]), relative = decodeURIComponent(parts.slice(2).join('/'));
      if (!/^[a-zA-Z0-9/_\-.]+$/.test(relative) || relative.split('/').some(s => s==='..' || s.startsWith('.'))) throw new Error('素材路径不正确');
      const file = path.resolve(directory(p),relative);
      if (!file.startsWith(directory(p)+path.sep)) throw new Error('素材路径不正确');
      return await stream(req,res,file,url.searchParams.has('download'));
    }
    if (!['GET','HEAD'].includes(req.method)) return json(res,405,{ error:'不支持的方法' });
    const file = { '/':'index.html','/app.js':'app.js','/style.css':'style.css' }[url.pathname];
    if (!file) return json(res,404,{ error:'页面不存在' });
    await stream(req,res,path.join(root,'public',file));
  } catch (e) { if (!res.headersSent) json(res,e.code==='ENOENT'?404:400,{ error:e.message }); else res.end(); }
});
const port = Number(process.env.STUDIO_PORT || 4323);
server.listen(port,'127.0.0.1',() => console.log(`映序 Studio http://127.0.0.1:${port}`));
process.on('SIGINT',() => { codex.close(); server.close(); process.exit(); });
process.on('SIGTERM',() => { codex.close(); server.close(); process.exit(); });
