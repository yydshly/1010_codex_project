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
import { validateScene, blankScene } from './lib/editor.mjs';
import { validateProduction, prepareTask, blockers, taskIsStale, runAdapter } from './lib/production.mjs';
import { upgradeScene } from './public/composition.js';

const root = path.dirname(fileURLToPath(import.meta.url)), store = path.join(root,'.local/projects');
await mkdir(store, { recursive: true });
const env = await minimaxEnv(process.env.STUDIO_MINIMAX_ENV || 'F:/codex_project/.env.minimax');
let config = { text: { provider: 'codex', model: '', apiKey: '' }, image: { provider: 'import', model: 'Codex 图片工具', apiKey: '' }, voice: { provider: 'minimax', model: 'speech-2.8-hd', voice: 'Chinese (Mandarin)_Warm_Girl', ...env }, video:{provider:'disabled',model:'',apiKey:''}, lipsync:{provider:'disabled',model:'',apiKey:''} };
const codex = new CodexBridge(path.join(root,'.local/codex')), runtime = { codex: { ready: false }, ffmpeg: false };
codex.start().then(result => { runtime.codex = result; config.text.model ||= result.model; }).catch(e => { runtime.codex = { ready: false, error: e.message }; });
command(process.env.STUDIO_FFMPEG || 'ffmpeg',['-version']).then(() => { runtime.ffmpeg = true; }).catch(() => {});
const projects = new Map(), jobs = new Map();
for (const id of await readdir(store)) {
  try { const p = JSON.parse(await readFile(path.join(store,id,'project.json'),'utf8')); p.busy = false; for(const task of p.generationTasks||[])if(['submitting','queued','running'].includes(task.state)){task.state='interrupted';task.error='服务重启，外部任务状态未知。请查看模型服务并导入结果，不自动重复提交。';} projects.set(id,p); } catch { /* Incomplete folders are not projects. */ }
}
if (!projects.size) {
  for(const name of ['demo','control-plane','production']) {
    try {
      const sample = path.join(root,'../assets',name), p = JSON.parse(await readFile(path.join(sample,'project.json'),'utf8'));
      await cp(sample,path.join(store,p.id),{ recursive: true }); projects.set(p.id,p);
    } catch { /* A sample becomes available after its actual run. */ }
  }
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
      if(kind==='image'){delete s.video;delete s.videoDuration;}
    }
    if (kind !== 'image' && (!s.audio || kind === 'voice' || s.voiceEvidence?.text !== s.narration)) {
      progress(`正在生成中文配音：${s.title}`);
      const file = `${s.id}-voice-${Date.now()}.mp3`;
      const character=(p.characters||[]).find(character=>character.id===s.shot?.speakerId);
      const evidence = await generateVoice({...c.voice,...(character?.voice?{voice:character.voice}:{})},s.narration,path.join(directory(p),file));
      const metadata = await probe(path.join(directory(p),file));
      s.audio = file; s.audioDuration = metadata.duration; s.duration = metadata.duration + .55; s.voiceEvidence = evidence; s.silent = false;
      if(s.timing) { s.timing.duration=Math.ceil((metadata.duration+.55)*30)/30; s.timing.audioIn=0; s.timing.delay=.2; }
    }
    await save(p);
  }
}
function json(res,code,value) { res.writeHead(code,{ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
async function body(req,limit = 1000000) { let size = 0; const parts = []; for await (const b of req) { size += b.length; if (size > limit) throw new Error('请求数据过大'); parts.push(b); } return Buffer.concat(parts); }
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav','.webm':'video/webm','.m4a':'audio/mp4','.ttc':'font/collection','.json':'application/json; charset=utf-8' };
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
    if (url.pathname === '/api/state' && req.method === 'GET') return json(res,200,{ config:publicConfig(config), runtime, projects:[...projects.values()].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).map(p=>({...p,generationTasks:(p.generationTasks||[]).map(t=>({...t,stale:['prepared','succeeded','imported'].includes(t.state)&&taskIsStale(t,p),blockers:t.state==='prepared'?blockers(t.request,config[t.kind]):[]}))})), jobs:[...jobs.values()] });
    if (url.pathname === '/api/config' && req.method === 'PUT') {
      const values = JSON.parse(await body(req)), next = structuredClone(config);
      for (const role of ['text','image','voice','video','lipsync']) {
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
      if(parts[3]==='copy'&&req.method==='POST') {
        editable(p);const copy=structuredClone(p);copy.id=randomUUID();copy.title=p.title+' · 编辑副本';copy.exports=[];copy.generationTasks=[];copy.revision=1;copy.createdAt=new Date().toISOString();copy.copiedFrom=p.id;
        await mkdir(directory(copy),{recursive:true});
        for(const item of await readdir(directory(p),{withFileTypes:true}))if(item.isFile()&&!item.name.startsWith('export-')&&item.name!=='project.json')await cp(path.join(directory(p),item.name),path.join(directory(copy),item.name));
        for(const s of copy.scenes)delete s.poster;
        projects.set(copy.id,copy);await save(copy);return json(res,201,copy);
      }
      if (parts.length === 3 && req.method === 'PUT') {
        editable(p); const input = JSON.parse(await body(req));
        if (input.revision !== p.revision) return json(res,409,{ error:'项目版本已变化，请刷新后保存' });
        if (!Array.isArray(input.scenes) || input.scenes.length < 1 || input.scenes.length > 24) throw new Error('场景数量应为1至24');
        const existing = new Map([...(p.archivedScenes||[]),...p.scenes].map(s => [s.id,s]));
        const files=new Map((p.assets||[]).map(a=>[a.file,a]));
        for(const s of p.scenes) {if(s.image)files.set(s.image,{file:s.image,type:'image'});if(s.video)files.set(s.video,{file:s.video,type:'video',duration:s.videoDuration});}
        if (new Set(input.scenes.map(s => s.id)).size !== input.scenes.length) throw new Error('场景编号重复');
        const next = input.scenes.map(s => {
          if(!/^[\w-]{1,80}$/.test(s.id))throw new Error('场景编号不正确');
          const previous=existing.get(s.id)||existing.get(s.sourceId)||blankScene(s.id);
          const result=validateScene(s,previous,files);
          if(result.video&&result.timing&&result.timing.videoIn>=(result.videoDuration||600))throw new Error('视频入点必须早于素材结束');
          return result;
        });
        if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 100) throw new Error('视频名称应为1至100字');
        const production=validateProduction({story:input.story??p.story,characters:input.characters??p.characters},next,files);
        for(const s of next) {
          const previous=existing.get(s.id),oldSpeaker=(p.characters||[]).find(c=>c.id===previous?.shot?.speakerId),newSpeaker=production.characters.find(c=>c.id===s.shot?.speakerId);
          if(s.voiceEvidence&&((previous?.shot?.speakerId||'')!==(s.shot?.speakerId||'')||(oldSpeaker?.voice||'')!==(newSpeaker?.voice||'')))s.voiceEvidence={...s.voiceEvidence,text:''};
        }
        Object.assign(p,production);
        p.archivedScenes=[...existing.values()].filter(s=>!next.some(n=>n.id===s.id)).slice(-60);
        p.title = input.title; p.scenes = next; p.revision++; p.editedAt = new Date().toISOString(); await save(p); return json(res,200,p);
      }
      if(parts[3]==='generation'&&req.method==='POST') {
        editable(p);const input=JSON.parse(await body(req));
        if(input.revision!==p.revision)return json(res,409,{error:'项目版本已变化，请刷新后再操作'});
        if(!parts[4]) {
          if((p.generationTasks||[]).length>=100)throw new Error('本项目已达100条任务，请创建副本继续制作');
          const s=p.scenes.find(s=>s.id===input.sceneId);if(!s)throw new Error('场景不存在');
          const task=prepareTask(p,s,input.kind);(p.generationTasks||=[]).push(task);p.revision++;await save(p);
          return json(res,201,{project:p,task,blockers:blockers(task.request,config[task.kind])});
        }
        const task=(p.generationTasks||[]).find(t=>t.id===parts[4]);if(!task)throw new Error('生成任务不存在');
        if(parts[5]==='submit') {
          if(task.state!=='prepared')throw new Error('本任务已提交过；请检查已有结果，需要重做时准备新任务');
          if(taskIsStale(task,p))throw new Error('镜头或角色已修改，请准备新的生成任务');
          const missing=blockers(task.request,config[task.kind]);if(missing.length)throw new Error(missing.join('；'));
          const job=begin(p,async(c,progress)=>{
            task.state='submitting';task.provider=c[task.kind].provider;task.model=c[task.kind].model;p.revision++;await save(p);
            try {
              const media=[];const request=task.request;
              const refs=new Set([request.referenceImage,request.referenceVideo,...request.characters.map(c=>c.reference)].filter(Boolean));
              const permitted=new Set([...(p.assets||[]).map(a=>a.file),...p.scenes.flatMap(s=>[s.image,s.video,s.audio]).filter(Boolean)]);
              let transferSize=0;
              for(const file of refs) {
                if(!permitted.has(file)||path.basename(file)!==file)throw new Error('参考素材不在项目中');
                const bytes=await readFile(path.join(directory(p),file));transferSize+=bytes.length;if(transferSize>40000000)throw new Error('参考素材总大小超过40MB，请先压缩');
                media.push({id:file,mimeType:mime[path.extname(file)]||'application/octet-stream',dataBase64:bytes.toString('base64')});
              }
              if(request.audio) {
                if(!permitted.has(request.audio)||path.basename(request.audio)!==request.audio)throw new Error('配音不在项目中');
                const file='task-'+task.id+'-aligned.wav',t=request.timing;
                await command(process.env.STUDIO_FFMPEG||'ffmpeg',['-y','-v','error','-ss',String(t.audioIn),'-i',path.join(directory(p),request.audio),'-af',`volume=${t.volume},adelay=${Math.round(t.delay*1000)}:all=1,apad,atrim=duration=${request.duration}`,'-ar','24000','-ac','1',path.join(directory(p),file)]);
                media.push({id:request.audio,mimeType:'audio/wav',timelineAligned:true,dataBase64:(await readFile(path.join(directory(p),file))).toString('base64')});
              }
              const bytes=await runAdapter(c[task.kind],task,media,async message=>{progress(message);await save(p);});
              const file='generated-'+task.id+'.mp4';await writeFile(path.join(directory(p),file),bytes);
              const info=await probe(path.join(directory(p),file));if(!info.streams.some(s=>s.type==='video'))throw new Error('模型返回文件不包含视频轨道');
              if(task.kind==='lipsync'&&info.duration+0.15<request.duration)throw new Error('口型视频短于请求时长，请在适配器检查完整音频对齐');
              const asset={id:randomUUID(),type:'video',file,name:(task.kind==='lipsync'?'口型':'动态镜头')+' · '+p.scenes.find(s=>s.id===task.sceneId).title,duration:info.duration,at:new Date().toISOString(),sha256:hash(bytes),provenance:{provider:task.provider,model:task.model,taskId:task.id}};
              asset.poster='generated-'+task.id+'-poster.png';await command(process.env.STUDIO_FFMPEG||'ffmpeg',['-y','-v','error','-i',path.join(directory(p),file),'-frames:v','1','-vf','scale=480:-2',path.join(directory(p),asset.poster)]);
              (p.assets||=[]).push(asset);task.assetFile=file;task.state='succeeded';task.finishedAt=new Date().toISOString();progress('视频已入库，审核后可应用到镜头');
            } catch(e) {task.state='failed';task.error=e.message;throw e;}
          });return json(res,202,{jobId:job.id,projectId:p.id});
        }
        if(parts[5]==='attach') {
          if(task.state==='applied')throw new Error('任务已应用，请准备新任务');
          const asset=(p.assets||[]).find(a=>a.file===input.assetFile&&a.type==='video');if(!asset)throw new Error('请选择已导入的视频素材');
          task.assetFile=asset.file;task.state='imported';task.source='manual';task.finishedAt=new Date().toISOString();
        } else if(parts[5]==='apply') {
          if(!['succeeded','imported'].includes(task.state))throw new Error('任务尚无可用结果');
          if(taskIsStale(task,p))throw new Error('镜头或角色已变化，请为当前镜头准备新任务并关联结果');
          const s=p.scenes.find(s=>s.id===task.sceneId),asset=(p.assets||[]).find(a=>a.file===task.assetFile&&a.type==='video');if(!s||!asset)throw new Error('镜头或结果素材不存在');
          if(task.kind==='lipsync'&&asset.duration+0.15<task.request.duration)throw new Error('口型结果短于镜头时长，请调整镜头或导入完整结果');
          Object.assign(s,{mainAsset:asset.file,video:asset.file,videoDuration:asset.duration});
          s.timing ||= {duration:s.duration||6,audioIn:0,delay:0,volume:1,transition:'cut'};s.timing.videoIn=0;
          upgradeScene(s);
          if(!s.elements.some(e=>e.type==='image'&&e.source==='scene'))s.elements.unshift({id:'generated-visual',type:'image',source:'scene',x:0,y:0,w:1920,h:1080,opacity:1,radius:0,fit:'cover'});
          for(const e of s.elements.filter(e=>e.type==='image'&&e.source==='scene')){e.hidden=false;e.opacity=1;e.radius=0;e.fit='cover';}
          task.state='applied';task.appliedAt=new Date().toISOString();
        } else throw new Error('不支持的生成操作');
        p.revision++;await save(p);return json(res,200,{project:p,task});
      }
      if(parts[3]==='assets'&&req.method==='POST') {
        editable(p);const type=url.searchParams.get('type');if(!['image','video','audio'].includes(type))throw new Error('不支持的素材类型');
        const bytes=await body(req,type==='image'?20000000:150000000),id=randomUUID();
        const extensions={'video/mp4':'.mp4','video/webm':'.webm','audio/mpeg':'.mp3','audio/wav':'.wav','audio/x-wav':'.wav','audio/mp4':'.m4a'};
        const extension=type==='image'?'.png':extensions[req.headers['content-type']];if(!extension)throw new Error('支持 PNG/JPG/WebP、MP4/WebM、MP3/WAV/M4A');
        const file='asset-'+id+extension,asset={id,file,type,name:(url.searchParams.get('name')||'导入素材').slice(0,100),at:new Date().toISOString(),sha256:hash(bytes)};
        if(type==='image'){const img=await loadImage(bytes);asset.width=img.width;asset.height=img.height;}
        await writeFile(path.join(directory(p),file),bytes);
        if(type!=='image') {
          const info=await probe(path.join(directory(p),file));if(!info.streams.some(s=>s.type===type))throw new Error('素材不包含所选轨道');asset.duration=info.duration;
          if(type==='video'){asset.poster='asset-'+id+'-poster.png';await command(process.env.STUDIO_FFMPEG||'ffmpeg',['-y','-v','error','-i',path.join(directory(p),file),'-frames:v','1','-vf','scale=480:-2',path.join(directory(p),asset.poster)]);}
        }
        (p.assets||=[]).push(asset);p.revision++;await save(p);return json(res,201,{project:p,asset});
      }
      if(parts[3]==='waveform'&&req.method==='GET') {
        const file=url.searchParams.get('file');const permitted=new Set([...p.scenes.map(s=>s.audio),...(p.assets||[]).filter(a=>a.type==='audio').map(a=>a.file)]);
        if(!file||!permitted.has(file))throw new Error('音频不在项目中');
        const cache=path.join(directory(p),file+'.peaks.json');
        try{return json(res,200,JSON.parse(await readFile(cache,'utf8')));}catch{}
        const pcm=path.join(directory(p),file+'.pcm');
        await command(process.env.STUDIO_FFMPEG||'ffmpeg',['-y','-v','error','-i',path.join(directory(p),file),'-t','600','-ac','1','-ar','8000','-f','s16le',pcm]);
        const bytes=await readFile(pcm),bins=240,peaks=[],count=bytes.length/2;
        for(let i=0;i<bins;i++){let peak=0;for(let j=Math.floor(i*count/bins);j<Math.floor((i+1)*count/bins);j++)peak=Math.max(peak,Math.abs(bytes.readInt16LE(j*2))/32768);peaks.push(Math.round(peak*1000)/1000);}
        const result={peaks,duration:count/8000,source:'decoded-pcm'};await writeFile(cache,JSON.stringify(result));return json(res,200,result);
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
    if(url.pathname==='/studio-font')return await stream(req,res,process.env.STUDIO_FONT||'C:/Windows/Fonts/msyh.ttc');
    const file = { '/':'index.html','/app.js':'app.js','/production-ui.js':'production-ui.js','/production.css':'production.css','/style.css':'style.css','/composition.js':'composition.js','/classic':'classic/index.html','/classic/':'classic/index.html','/classic/app.js':'classic/app.js','/classic/style.css':'classic/style.css' }[url.pathname];
    if (!file) return json(res,404,{ error:'页面不存在' });
    await stream(req,res,path.join(root,'public',file));
  } catch (e) { if (!res.headersSent) json(res,e.code==='ENOENT'?404:400,{ error:e.message }); else res.end(); }
});
const port = Number(process.env.STUDIO_PORT || 4323);
server.listen(port,'127.0.0.1',() => console.log(`映序 Studio http://127.0.0.1:${port}`));
process.on('SIGINT',() => { codex.close(); server.close(); process.exit(); });
process.on('SIGTERM',() => { codex.close(); server.close(); process.exit(); });
