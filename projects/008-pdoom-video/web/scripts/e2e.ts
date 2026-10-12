import assert from 'node:assert/strict';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import puppeteer from 'puppeteer-core';
import { chromePath,probe,command,ffmpeg } from '../server/media';
import type { Project } from '../shared/project';
const origin=process.env.MV_TEST_ORIGIN||'http://127.0.0.1:4318',assets=path.resolve('../assets');await mkdir(assets,{recursive:true});
const health=await fetch(`${origin}/api/health`).then(r=>r.json());assert.ok(Object.values(health.tools).every(Boolean),'本机工具检查');
const browser=await puppeteer.launch({executablePath:await chromePath(),headless:true,args:['--disable-gpu']});const page=await browser.newPage();await page.setViewport({width:1440,height:1100});
const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForSelector('.tabs');console.log('界面已就绪');await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.tabs');
  await page.locator('.tabs button:nth-child(2)').click();const audio=await page.$('input[aria-label="上传音乐"]');await audio!.uploadFile(path.resolve('public/demo.wav'));await page.waitForFunction(()=>document.querySelector('.upload-zone strong')?.textContent?.includes('demo.wav'));
  const lyrics=await page.$('input[aria-label="上传歌词"]');await lyrics!.uploadFile(path.resolve('tests/demo.lrc'));await page.waitForFunction(()=>document.querySelector<HTMLTextAreaElement>('#lyrics')?.value.includes('[00:03.75]'));
  await page.locator('#generate').click();await page.waitForFunction(()=>document.querySelectorAll('.shot-card').length===4);
  await page.locator('.tabs button:nth-child(1)').click();
  const name=await page.$('.tab-panel>label input');await name!.focus();await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await name!.press('Backspace');await name!.type('小桃');
  await page.select('.tab-panel .two-fields select','beanie');await page.waitForFunction(()=>document.querySelector('input')!==null);
  // 改变镜头，确认实际可编辑；再恢复第一次叙事动作。
  await page.select('.shot-editor .editor-fields label:nth-child(2) select','hop');
  await page.locator('button[aria-label="播放预览"]').click();await page.waitForFunction(()=>Number(document.querySelector('.time-code')?.textContent?.split('/')[0])>.4);await page.locator('button[aria-label="暂停预览"]').click();
  await page.screenshot({path:path.join(assets,'mv-studio-desktop.png'),fullPage:true});
  await page.locator('#export').click();console.log('真实 UI 已上传音乐/歌词、定制角色、修改镜头并提交导出');
  await page.waitForSelector('#download-video',{timeout:240000});
  const href=await page.$eval('#download-video',el=>el.getAttribute('href')!);const jobId=href.split('/')[3];
  const job=await fetch(`${origin}/api/jobs/${jobId}`).then(r=>r.json());const p=await fetch(`${origin}/api/jobs/${jobId}/project`).then(r=>r.json()) as Project;
  assert.equal(p.character.name,'小桃');assert.equal(p.character.hat,'beanie');assert.equal(p.shots[0].action,'hop');assert.equal(p.durationSec,15);assert.equal(job.frames,360);assert.equal(job.status,'complete');
  const output=path.resolve('../out/local-demo-15s.mp4');await mkdir(path.dirname(output),{recursive:true});const video=await fetch(origin+href).then(r=>r.arrayBuffer());await writeFile(output,Buffer.from(video));
  const meta=await probe(output);assert.equal(meta.streams.find(s=>s.codec_type==='video')!.nb_frames,'360');assert.equal(Number(meta.format.duration),15);await command(ffmpeg(),['-v','error','-xerror','-i',output,'-f','null','-']);
  // 本机草稿在刷新后保留；切换三种画风后取实际画面哈希，检查时间可复现。
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.shot-card');await page.locator('.tabs button:nth-child(3)').click();
  const styleHashes:Record<string,string>={};for(const style of ['watercolor_storybook','ink_sketch','flat_cartoon']){
    const index=['watercolor_storybook','ink_sketch','flat_cartoon'].indexOf(style)+1;await page.locator(`.style-option:nth-child(${index})`).click();await page.waitForFunction((s:string)=>document.querySelector('.preview-label span:last-child')?.textContent===s,{},['水彩绘本','墨线素描','平涂卡通'][index-1]);
    const pixels=await page.$eval('.canvas-wrap canvas',c=>(c as HTMLCanvasElement).toDataURL());styleHashes[style]=createHash('sha256').update(pixels).digest('hex');
    if(style==='ink_sketch')await (await page.$('.canvas-wrap'))!.screenshot({path:path.join(assets,'mv-style-ink.png')});
    if(style==='flat_cartoon')await (await page.$('.canvas-wrap'))!.screenshot({path:path.join(assets,'mv-style-flat.png')});
  }assert.equal(new Set(Object.values(styleHashes)).size,3);
  await page.locator('.style-option:nth-child(1)').click();
  await page.setViewport({width:390,height:844});await page.screenshot({path:path.join(assets,'mv-studio-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'移动端无横向溢出');
  await page.setViewport({width:1440,height:1100});await page.screenshot({path:path.join(assets,'mv-studio-complete.png'),fullPage:true});await page.screenshot({path:path.join(assets,'mv-studio-cover.png'),fullPage:false});
  const render=await browser.newPage();await render.goto(`${origin}/render.html?job=${jobId}`,{waitUntil:'domcontentloaded'});await render.waitForFunction(()=>window.renderReady);const hashes=await render.evaluate(()=>[window.renderAt!(4.2),window.renderAt!(1.0),window.renderAt!(4.2)]);assert.equal(hashes[0],hashes[2]);await render.close();
  const dedup=await fetch(`${origin}/api/renders`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}).then(r=>r.json());assert.equal(dedup.id,jobId,'相同快照命中缓存');
  assert.deepEqual(errors,[],'浏览器无运行错误');
  const report={date:new Date().toISOString(),story:'浏览器定制角色 → 上传 WAV 与 LRC → 本地自动分镜 → 编辑与音乐同步预览 → 15 秒 MP4 导出 → 下载与解码',jobId,planner:p.planner,realModelTested:false,output:'out/local-demo-15s.mp4',elapsedMs:job.elapsedMs,bytes:video.byteLength,sha256:createHash('sha256').update(await readFile(output)).digest('hex'),media:meta,styleHashes,deterministicFrame:true,cacheHit:true,mobileOverflow:false,browserErrors:errors};
  await writeFile(path.resolve('../notes/local-tool-verification.json'),JSON.stringify(report,null,2));await writeFile(path.resolve('../examples/local-demo-project.json'),JSON.stringify(p,null,2));console.log(JSON.stringify({jobId,elapsedMs:job.elapsedMs,duration:meta.format.duration,frames:job.frames,bytes:video.byteLength,browserErrors:errors}));
}catch(e){await page.screenshot({path:path.resolve('../out/e2e-failure.png'),fullPage:true}).catch(()=>{});console.error('浏览器错误',errors);throw e;}finally{await browser.close();}
