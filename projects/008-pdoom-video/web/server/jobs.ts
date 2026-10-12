import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import type { Browser } from 'puppeteer-core';
import { validateProject, type Project } from '../shared/project';
import { command, probe, ffmpeg, chromePath } from './media';
export type Job={id:string,key:string,status:'queued'|'rendering'|'encoding'|'verifying'|'complete'|'failed'|'cancelled',frames:number,totalFrames:number,createdAt:string,elapsedMs?:number,error?:string,result?:unknown,project:Project};
export type Asset={id:string,name:string,duration:number,sha256:string,file:string};
export async function atomicJson(file:string,value:unknown){const temp=file+`.${randomUUID()}.tmp`;await writeFile(temp,JSON.stringify(value,null,2));await rename(temp,file);}
export class Jobs {
  readonly all=new Map<string,Job>();private controls=new Map<string,AbortController>();private busy=false;private engineHash='';private activeBrowser?:Browser;
  constructor(readonly root:string,readonly assets:Map<string,Asset>,readonly origin:string){}
  dir(id:string){return path.join(this.root,'jobs',id);}
  async init(){
    await mkdir(path.join(this.root,'jobs'),{recursive:true});
    const hash=createHash('sha256');for(const file of ['src/engine.ts','src/RenderPage.tsx','shared/motion.ts','shared/project.ts','server/jobs.ts'])hash.update(await readFile(path.resolve(file)));hash.update(`${process.platform}:Microsoft YaHei:24fps-v1`);
    // 浏览器和字体文件变化也使旧帧缓存失效；缺少依赖仍允许打开编辑器。
    for(const file of [await chromePath().catch(()=>''),process.platform==='win32'?path.join(process.env.WINDIR||'C:/Windows','Fonts/msyh.ttc'):'']){try{const s=await stat(file);hash.update(`${file}:${s.size}:${s.mtimeMs}`);}catch{hash.update(`missing:${file}`);}}
    hash.update(await command(ffmpeg(),['-version']).catch(()=> 'ffmpeg-missing'));this.engineHash=hash.digest('hex');
    for(const id of await readdir(path.join(this.root,'jobs'))){try{const job=JSON.parse(await readFile(path.join(this.dir(id),'job.json'),'utf8')) as Job;validateProject(job.project);if(['queued','rendering','encoding','verifying'].includes(job.status)){job.status='failed';job.error='服务中断，可点击继续导出；已完成帧会在校验后复用';await this.save(job);}this.all.set(id,job);}catch{}}
  }
  async save(j:Job){await atomicJson(path.join(this.dir(j.id),'job.json'),j);}
  summary(j:Job){const {project,...rest}=j;return {...rest,download:j.status==='complete'?`/api/jobs/${j.id}/video`:null};}
  async create(input:unknown){
    const p=validateProject(input),asset=this.assets.get(p.audio.assetId);if(!asset)throw new Error('音乐素材不存在，请重新上传');
    if(p.audio.sourceStartSec+p.durationSec>asset.duration+.025)throw new Error('选段超出真实音乐时长');
    const key=createHash('sha256').update(JSON.stringify(p)).update(asset.sha256).update(this.engineHash).digest('hex');
    const existing=[...this.all.values()].find(j=>j.key===key&&!['failed','cancelled'].includes(j.status));if(existing)return this.summary(existing);
    const job:Job={id:randomUUID(),key,status:'queued',frames:0,totalFrames:p.durationSec*24,createdAt:new Date().toISOString(),project:p};
    await mkdir(path.join(this.dir(job.id),'frames'),{recursive:true});await this.save(job);this.all.set(job.id,job);void this.pump();return this.summary(job);
  }
  async retry(id:string){const j=this.all.get(id);if(!j||!['failed','cancelled'].includes(j.status))throw new Error('只有失败或取消的任务可以继续');if(this.controls.has(id))throw new Error('正在清理任务资源，请稍后继续');
    // 引擎变化后创建新作业，避免旧版帧混入；相同版本沿用原工作目录。
    const asset=this.assets.get(j.project.audio.assetId);if(!asset)throw new Error('原音乐素材不存在');
    const key=createHash('sha256').update(JSON.stringify(j.project)).update(asset.sha256).update(this.engineHash).digest('hex');
    if(key!==j.key)return this.create(j.project);
    j.status='queued';j.error=undefined;await this.save(j);void this.pump();return this.summary(j);
  }
  async cancel(id:string){const j=this.all.get(id);if(!j)throw new Error('任务不存在');if(['complete','failed','cancelled'].includes(j.status))return this.summary(j);j.status='cancelled';this.controls.get(id)?.abort();await this.save(j);return this.summary(j);}
  private async pump(){if(this.busy)return;this.busy=true;try{for(;;){const j=[...this.all.values()].find(j=>j.status==='queued');if(!j)break;await this.run(j);}}finally{this.busy=false;}}
  private async run(j:Job){
    const abort=new AbortController();this.controls.set(j.id,abort);let browser:Browser|undefined;const start=Date.now();
    try{
      const asset=this.assets.get(j.project.audio.assetId);if(!asset)throw new Error('音乐素材不存在');
      j.status='rendering';await this.save(j);
      browser=await puppeteer.launch({executablePath:await chromePath(),headless:true,args:['--disable-gpu','--disable-background-timer-throttling','--disable-renderer-backgrounding']});this.activeBrowser=browser;
      const page=await browser.newPage();await page.goto(`${this.origin}/render.html?job=${j.id}`,{waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForFunction(()=>window.renderReady||window.renderError,{timeout:20000});
      const error=await page.evaluate(()=>window.renderError);if(error)throw new Error(error);
      j.frames=0;
      for(let i=0;i<j.totalFrames;i++){
        abort.signal.throwIfAborted();const file=path.join(this.dir(j.id),'frames',`${String(i).padStart(6,'0')}.jpg`);let valid=false;
        try{const b=await readFile(file);valid=b.length>1000&&b[0]===255&&b[1]===216&&b.at(-2)===255&&b.at(-1)===217;}catch{}
        if(!valid){const data=await page.evaluate(t=>window.renderAt!(t),i/24);const buffer=Buffer.from(data.split(',')[1],'base64');await writeFile(file+'.tmp',buffer);await rename(file+'.tmp',file);}
        j.frames=i+1;if(i%12===0)await this.save(j);
      }
      await browser.close();browser=undefined;this.activeBrowser=undefined;abort.signal.throwIfAborted();
      for(let i=0;i<j.totalFrames;i++){const file=path.join(this.dir(j.id),'frames',`${String(i).padStart(6,'0')}.jpg`);if((await stat(file)).size<1000)throw new Error(`第 ${i} 帧缺失或无效`);}
      j.status='encoding';await this.save(j);const output=path.join(this.dir(j.id),'mv.mp4');
      await command(ffmpeg(),['-hide_banner','-loglevel','error','-y','-framerate','24','-start_number','0','-i',path.join(this.dir(j.id),'frames','%06d.jpg'),'-ss',String(j.project.audio.sourceStartSec),'-i',asset.file,'-map','0:v:0','-map','1:a:0','-t',String(j.project.durationSec),'-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-movflags','+faststart',output],abort.signal,180000);
      j.status='verifying';await this.save(j);const meta=await probe(output);const v=meta.streams.find(s=>s.codec_type==='video'),a=meta.streams.find(s=>s.codec_type==='audio');
      const expectedWidth=j.project.resolution==='1080p'?1920:1280;
      if(!v||!a||v.width!==expectedWidth||v.height!==expectedWidth*9/16||v.r_frame_rate!=='24/1'||Number(v.nb_frames)!==j.totalFrames||[meta.format.duration,v.duration,a.duration].some(d=>!d||Math.abs(Number(d)-j.project.durationSec)>1/24+.001))throw new Error('导出校验失败：音视频流、规格、帧数或时长不符');
      await command(ffmpeg(),['-v','error','-xerror','-i',output,'-f','null','-'],abort.signal,90000);abort.signal.throwIfAborted();
      j.status='complete';j.result=meta;j.elapsedMs=Date.now()-start;await this.save(j);
    }catch(e){j.status=abort.signal.aborted?'cancelled':'failed';j.error=abort.signal.aborted?'任务已取消，可继续相同工程':e instanceof Error?e.message:'渲染失败';j.elapsedMs=Date.now()-start;await this.save(j);console.error(`[MV ${j.id}] ${j.error}`);}
    finally{await browser?.close().catch(()=>{});this.activeBrowser=undefined;this.controls.delete(j.id);}
  }
  async shutdown(){for(const c of this.controls.values())c.abort();await this.activeBrowser?.close().catch(()=>{});}
}
