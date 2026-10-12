import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { randomUUID,createHash } from 'node:crypto';
import { mkdir,readFile,writeFile,readdir,rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jobs, atomicJson, type Asset } from './jobs';
import { probe, chromePath,command,ffmpeg } from './media';
import { plan,modelConfigured } from './planning';
import { parseLyrics } from '../shared/lyrics';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));process.chdir(root);
const port=Number(process.env.PORT||4318);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT 无效');
const data=path.join(root,'data');await mkdir(path.join(data,'assets'),{recursive:true});
const assets=new Map<string,Asset>();for(const file of await readdir(path.join(data,'assets'))){if(file.endsWith('.json')){try{const a=JSON.parse(await readFile(path.join(data,'assets',file),'utf8')) as Asset;assets.set(a.id,a);}catch{}}}
const jobs=new Jobs(data,assets,`http://127.0.0.1:${port}`);await jobs.init();
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'400kb'}));
app.use((req,res,next)=>{
  if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(req.headers.host||''))return res.status(403).json({error:'仅允许本机访问'});
  if(req.method!=='GET'&&req.method!=='HEAD'&&req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)return res.status(403).json({error:'请求来源不匹配'});next();
});
app.get('/api/health',async(_req,res)=>{const checks=await Promise.allSettled([chromePath(),command(ffmpeg(),['-version']),command(process.env.FFPROBE_PATH||'ffprobe',['-version'])]);res.json({ok:true,modelConfigured:modelConfigured(),model:modelConfigured()?process.env.MV_MODEL:null,tools:{chrome:checks[0].status==='fulfilled',ffmpeg:checks[1].status==='fulfilled',ffprobe:checks[2].status==='fulfilled'}});});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:100*1024*1024,files:1}});
app.post('/api/assets',upload.single('audio'),async(req,res)=>{
  if(!req.file)throw new Error('请选择音乐文件');const ext=path.extname(req.file.originalname).toLowerCase();if(!['.mp3','.wav'].includes(ext))throw new Error('首版支持 MP3 / WAV');
  const id=randomUUID(),file=path.join(data,'assets',id+ext);await writeFile(file,req.file.buffer);
  try{const meta=await probe(file),duration=Number(meta.format.duration);if(!meta.streams.some(s=>s.codec_type==='audio')||!/(mp3|wav)/.test(meta.format.format_name)||!Number.isFinite(duration)||duration<15||duration>7200)throw new Error('请上传 15 秒～2 小时的有效 MP3 / WAV 音乐');
    const asset:Asset={id,name:Buffer.from(req.file.originalname,'latin1').toString('utf8').slice(0,200),file,duration,sha256:createHash('sha256').update(req.file.buffer).digest('hex')};await atomicJson(path.join(data,'assets',id+'.json'),asset);assets.set(id,asset);res.json({id,name:asset.name,duration,url:`/api/assets/${id}/audio`});
  }catch(e){await rm(file,{force:true});throw e;}
});
const getId=(id:unknown)=>z.string().uuid().parse(id);
app.get('/api/assets/:id/audio',(req,res)=>{const a=assets.get(getId(req.params.id));if(!a)return res.status(404).json({error:'素材不存在'});res.sendFile(a.file);});
app.post('/api/lyrics',(req,res)=>{const input=z.object({text:z.string(),format:z.enum(['txt','lrc','srt']),duration:z.number().min(15).max(30),sourceStart:z.number().min(0).default(0)}).parse(req.body);res.json({lyrics:parseLyrics(input.text,input.format,input.duration,input.sourceStart)});});
app.post('/api/storyboards',async(req,res)=>res.json(await plan(req.body)));
app.post('/api/renders',async(req,res)=>res.json(await jobs.create(req.body)));
app.get('/api/jobs',(_req,res)=>res.json([...jobs.all.values()].reverse().slice(0,30).map(j=>jobs.summary(j))));
app.get('/api/jobs/:id',(req,res)=>{const j=jobs.all.get(getId(req.params.id));if(!j)return res.status(404).json({error:'任务不存在'});res.json(jobs.summary(j));});
app.get('/api/jobs/:id/project',(req,res)=>{const j=jobs.all.get(getId(req.params.id));if(!j)return res.status(404).json({error:'工程不存在'});res.json(j.project);});
app.get('/api/jobs/:id/video',(req,res)=>{const j=jobs.all.get(getId(req.params.id));if(j?.status!=='complete')return res.status(404).json({error:'视频尚未完成'});res.download(path.join(jobs.dir(j.id),'mv.mp4'),`mv-${j.project.durationSec}s.mp4`);});
app.post('/api/jobs/:id/cancel',async(req,res)=>res.json(await jobs.cancel(getId(req.params.id))));
app.post('/api/jobs/:id/retry',async(req,res)=>res.json(await jobs.retry(getId(req.params.id))));
app.use('/api',(_req,res)=>res.status(404).json({error:'接口不存在'}));
if(process.argv.includes('--production')){app.use(express.static(path.join(root,'dist')));app.get(/.*/,(_req,res)=>res.sendFile(path.join(root,'dist/index.html')));}
else{const {createServer}=await import('vite');const vite=await createServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
app.use((error:Error,req:express.Request,res:express.Response,_next:express.NextFunction)=>{const msg=error instanceof z.ZodError?error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('；'):error.message;console.error(`[${req.method} ${req.path}] ${msg}`);res.status(400).json({error:msg.slice(0,1600)});});
const server=app.listen(port,'127.0.0.1',()=>console.log(`纸间 MV 本地创作室 http://127.0.0.1:${port}`));
async function shutdown(){await jobs.shutdown();server.close();process.exit(0);}process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
