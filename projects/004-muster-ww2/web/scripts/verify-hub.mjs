/** 网页完整性与真实内嵌体验验收；所有游戏操作通过真实按钮与键盘。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {parseArgs} from 'node:util';
import puppeteer from 'puppeteer-core';
const {values}=parseArgs({options:{prefix:{type:'boolean',default:false},light:{type:'boolean',default:false},online:{type:'boolean',default:false}}});
let server;
const prefix='/1010_codex_project/004-muster-ww2/';
if(values.prefix){
 const dist=path.resolve('dist'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.wav':'audio/wav','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2','.md':'text/plain','.txt':'text/plain'};
 server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
  const file=path.resolve(dist,pathname.slice(prefix.length)||'index.html');if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  const size=fs.statSync(file).size,range=req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);let start=0,end=size-1,status=200;
  if(range){
   start=range[1]?Number(range[1]):Math.max(0,size-Number(range[2]));
   end=range[1]&&range[2]?Math.min(size-1,Number(range[2])):size-1;
   if(!Number.isSafeInteger(start)||start<0||start>=size||end<start){res.writeHead(416,{'Content-Range':'bytes */'+size}).end();return;}
   status=206;
  }
  const headers={'Content-Type':mime[path.extname(file)]??'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes'};
  if(status===206)headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
  res.writeHead(status,headers);if(req.method==='HEAD')res.end();else fs.createReadStream(file,{start,end}).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
}
const base=server?'http://127.0.0.1:'+server.address().port+prefix:(process.env.BASE_URL??'http://127.0.0.1:5198/');
if(values.online)assert.ok(base.startsWith('https://'),'线上验收必须显式配置 HTTPS BASE_URL');
const report={date:new Date().toISOString(),base,scope:values.light?'网页资料、入口、全文与窄屏（不重复3D）':'网页资料、入口、全文、五个真实内嵌体验与窄屏',checks:[],errors:[],failures:[],warnings:[],passed:false};
const executablePath=[process.env.BROWSER_PATH,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean).find(fs.existsSync);
assert.ok(executablePath);
let browser,page;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function check(name,fn){const start=Date.now();const detail=await fn();report.checks.push({name,passed:true,ms:Date.now()-start,detail});console.log('通过：'+name);}
const url=relative=>new URL(relative,base).href;
async function shot(name,fullPage=false){if(values.prefix)return;const output=values.online?name.replace('research-hub-','research-hub-publication-'):name;await page.screenshot({path:path.resolve('../assets/'+output),fullPage});}
async function goto(relative){await page.goto(url(relative),{waitUntil:'load',timeout:120000});await page.bringToFront();}
async function frame(){await page.waitForSelector('#live-frame');return (await page.$('#live-frame')).contentFrame();}
async function live(id,ready){await page.click('[data-live="'+id+'"]');const f=await frame();await f.waitForFunction(ready,{polling:250,timeout:300000});await wait(350);return f;}
try{
 browser=await puppeteer.launch({executablePath,headless:true,defaultViewport:{width:1600,height:1000,deviceScaleFactor:1},protocolTimeout:300000,args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--enable-webgl','--no-first-run','--hide-scrollbars']});
 page=await browser.newPage();
 page.on('pageerror',err=>report.errors.push(err.message));
 page.on('response',res=>{if(res.status()>=400&&res.url().startsWith(base))report.failures.push(res.status()+' '+res.url());});
 page.on('requestfailed',req=>{if(req.url().startsWith(base)&&!req.failure()?.errorText.includes('ERR_ABORTED'))report.failures.push(req.url()+' '+req.failure()?.errorText);});
 page.on('console',msg=>{if(msg.type()==='error')report.errors.push(msg.text());if(msg.type()==='warn'&&!report.warnings.includes(msg.text()))report.warnings.push(msg.text());});
 await check('资料清单覆盖源目录，所有打包文件保持原始 SHA-256',async()=>{
  const manifest=JSON.parse(fs.readFileSync('dist/research/manifest.json','utf8'));
  assert.equal(manifest.items.length,new Set(manifest.items.map(i=>i.path)).size);
  const walk=dir=>fs.readdirSync(path.resolve('..',dir),{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(dir+'/'+x.name):[dir+'/'+x.name]);
  for(const dir of ['notes','assets','web/docs','web/licenses'])for(const file of walk(dir))if(/\.(md|json|png|jpg|jpeg|webp|svg|wav|txt)$/i.test(file))assert.ok(manifest.items.some(i=>i.path===file),file);
  for(const item of manifest.items){const source=fs.readFileSync(path.resolve('..',item.path)),packed=fs.readFileSync('dist/'+item.url);assert.deepEqual(packed,source,item.path);assert.equal(crypto.createHash('sha256').update(packed).digest('hex'),item.sha256);}
  report.materialCounts=manifest.counts;return{files:manifest.items.length,counts:manifest.counts};
 });
 const manifest=JSON.parse(fs.readFileSync('dist/research/manifest.json','utf8'));
 await check('首页引导、六问、五个体验入口与全部资料 HTTP 可达',async()=>{
  await goto('./');await page.waitForFunction(()=>document.querySelectorAll('.material-counts strong').length===4);
  assert.equal(await page.$$eval('iframe',els=>els.length),0,'默认不启动重型模型');
  assert.equal(await page.$$eval('[data-live]',els=>els.length),5);assert.equal(await page.$$eval('.start-path a',els=>els.length),4);assert.equal(await page.$$eval('.question-grid summary',els=>els.length),6);
  assert.equal(await page.$$eval('.summary-grid article',els=>els.length),9);
  await page.waitForFunction(()=>document.querySelector('.hero-guide img')?.complete&&document.querySelector('.hero-guide img').naturalWidth===3840);
  assert.ok((await page.$eval('.hero-guide img',el=>el.src)).endsWith('/research/assets/research-hub-overview.png'));
  const links=await page.$$eval('a[href]',els=>[...new Set(els.map(a=>a.href))]);
  const targets=[...links.filter(l=>l.startsWith(base)),...manifest.items.map(i=>url(i.url)),...['index.html','research.html','evidence.html','camp.html','archive.html','battle.html','airport.html','harness.html'].map(url)];
  const results=await Promise.all(targets.map(async href=>({href,status:(await fetch(href,{method:'HEAD'})).status})));assert.ok(results.every(r=>r.status===200),JSON.stringify(results.filter(r=>r.status!==200)));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),1600);await shot('research-hub-home.png');return{links:links.length,resources:targets.length};
 });
 await check('全部文档在网页全文阅读，中文笔记、规范与完整许可证无截断',async()=>{
  for(const item of manifest.items.filter(i=>i.type==='document')){
   await goto('research.html?doc='+encodeURIComponent(item.path));
   await page.waitForFunction(p=>document.querySelector('.document-meta code')?.textContent===p,{},item.path);
   const text=await page.$eval('.raw-source pre',el=>el.textContent);
   assert.ok(text===fs.readFileSync(path.resolve('..',item.path),'utf8').replace(/\r\n/g,'\n'),'完整原文内容不一致：'+item.path);
  }
  await goto('research.html?doc='+encodeURIComponent('notes/airport-defense.md')+'#reader');
  await page.waitForSelector('.prose table');await page.type('#doc-search','airport');assert.ok(await page.$$eval('[data-doc]',els=>els.length)>=1);await page.$eval('#reader',el=>el.scrollIntoView({block:'start',behavior:'instant'}));await wait(250);await shot('research-hub-reader.png');
  return{documents:manifest.counts.document};
 });
 await check('全部截图、阶段检索与原始报告网页完整呈现',async()=>{
  await goto('evidence.html#gallery');await page.waitForSelector('#image-gallery figure');
  assert.equal(await page.$$eval('#image-gallery figure',els=>els.length),manifest.counts.image);
  await page.select('#image-stage','机场任务');assert.equal(await page.$$eval('#image-gallery figure',els=>els.length),manifest.items.filter(i=>i.type==='image'&&i.stage==='机场任务').length);
  await page.$eval('#gallery',el=>el.scrollIntoView({block:'start',behavior:'instant'}));await wait(250);await shot('research-hub-evidence.png');await page.type('#image-search','victory');assert.equal(await page.$$eval('#image-gallery figure',els=>els.length),1);
  for(const item of manifest.items.filter(i=>i.type==='report')){
   await goto('evidence.html?file='+encodeURIComponent(item.path)+'#reports');
   await page.waitForFunction(p=>document.querySelector('#report-detail h3')?.textContent===p,{},item.name);
   assert.ok((await page.$eval('#report-detail pre',el=>el.textContent))===fs.readFileSync(path.resolve('..',item.path),'utf8').replace(/\r\n/g,'\n'),'报告全文不一致：'+item.path);
  }
  return{images:manifest.counts.image,reports:manifest.counts.report};
 });
 await check('首页实际录音可以解码与播放，非占位音频',async()=>{
  await goto('./');const audio=await page.$eval('audio',async audio=>{audio.load();await new Promise((r,j)=>{audio.addEventListener('loadedmetadata',r,{once:true});audio.addEventListener('error',j,{once:true});});await audio.play();const detail={duration:audio.duration,readyState:audio.readyState,paused:audio.paused};audio.pause();return detail;});
  assert.ok(audio.duration>2.5&&audio.duration<2.8);assert.equal(audio.paused,false);return audio;
 });
 if(!values.light){
 await check('首页内嵌动态营地：真实模型与19个动作，父页面暂停继续及离开体验停声',async()=>{
  await goto('./');const f=await live('camp',()=>window.__campReady);let s=await f.evaluate(()=>window.__camp.getState());assert.equal(s.catalog,74);assert.equal(s.counts.models,26);
  await f.click('#motion-play');await f.waitForFunction(()=>window.__camp.getState().motion.playing&&!window.__camp.getState().motion.preparing,{timeout:120000});
  await page.waitForFunction(()=>!document.querySelector('#live-toggle').disabled);
  await page.click('#live-toggle');await f.waitForFunction(()=>!window.__camp.getState().motion.playing);await wait(150);
  const a=await f.evaluate(()=>window.__camp.getState().motion);await wait(350);const b=await f.evaluate(()=>window.__camp.getState().motion);assert.equal(a.time,b.time);assert.equal(b.audio.gain,0);assert.equal(b.audio.context,'suspended');assert.equal(b.actors.length,19);
  await wait(800);await page.click('#live-toggle');await f.waitForFunction(()=>window.__camp.getState().motion.playing);await wait(500);
  await page.$eval('#experience',el=>el.scrollIntoView());await shot('research-hub-live-camp.png');
  await page.$eval('#materials',el=>el.scrollIntoView());await f.waitForFunction(()=>!window.__camp.getState().motion.playing);await wait(150);assert.equal((await f.evaluate(()=>window.__camp.getState().motion)).audio.gain,0);
  await page.click('#live-close');assert.equal(await page.$$eval('iframe',els=>els.length),0);return{catalog:74,models:26,actors:19,pausedAudio:b.audio};
 });
 await check('首页内嵌机场任务：真实小队下令、切车、暂停继续与声音同步',async()=>{
  const f=await live('airport',()=>window.__battleReady);assert.equal((await f.evaluate(()=>window.__battle.getState())).mode,'airport');
  await f.click('#start');await f.click('[data-post="bravo"]');await f.click('[data-vehicle="0"]');await wait(1000);
  let s=await f.evaluate(()=>window.__battle.getState());assert.equal(s.selectedId,0);assert.equal(s.mission.squads[1].order,'move');
  await page.waitForFunction(()=>!document.querySelector('#live-toggle').disabled);await page.click('#live-toggle');await f.waitForFunction(()=>window.__battle.getState().status==='paused');await wait(150);
  const a=await f.evaluate(()=>window.__battle.getState());await wait(300);const b=await f.evaluate(()=>window.__battle.getState());assert.equal(a.time,b.time);assert.deepEqual(a.mission,b.mission);assert.equal(b.audio.gain,0);assert.equal(b.audio.context,'suspended');
  await wait(800);await page.click('#live-toggle');await f.waitForFunction(()=>window.__battle.getState().status==='running');await page.$eval('#experience',el=>el.scrollIntoView());await shot('research-hub-live-airport.png');
  await page.$eval('#materials',el=>el.scrollIntoView());await f.waitForFunction(()=>window.__battle.getState().status==='paused');
  return{mode:s.mode,squadOrder:s.mission.squads[1].order,selected:s.selectedId,pausedAudio:b.audio};
 });
 await check('首页内嵌协同自由演习：独立入口、三车切换与真实战斗状态',async()=>{
  const f=await live('battle',()=>window.__battleReady);await f.click('#start');await f.click('[data-vehicle="4"]');await wait(500);
  const s=await f.evaluate(()=>window.__battle.getState());assert.equal(s.mode,'skirmish');assert.equal(s.selectedId,4);assert.equal(s.models.length,6);assert.equal(s.soldierModels.length,10);assert.equal(s.aircraftModels.length,2);
  await f.click('#pause');await f.waitForFunction(()=>window.__battle.getState().status==='paused');return{mode:s.mode,models:6,soldiers:10,aircraft:2};
 });
 await check('首页内嵌完整模型目录与展柜，使用独立单模型布局检查真实渲染',async()=>{
  // 仅设置临时浏览器的布局夹具；不会修改日常浏览器。
  await page.evaluate(()=>localStorage.setItem('muster.display.v3-grand-review',JSON.stringify({v:1,groups:[{id:'g1',assetId:'de-panzer-iv-h',config:{schuerzen:'fitted'},quantity:1,formation:'single',spacing:9,columns:'auto',heading:0,anchor:{x:0,z:0},instances:[{slot:0,offset:{dx:0,dz:0},headingOffset:0}]}]})));
  const f=await live('archive',()=>window.__appReady);const s=await f.evaluate(()=>({catalog:window.__app.getLibrary().length,rendered:window.__app.getRenderedInstanceCount(),issues:window.__app.loadIssues()}));
  assert.equal(s.catalog,74);assert.equal(s.rendered,1);assert.deepEqual(s.issues,[]);assert.equal(await f.$eval('.brand',a=>a.target),'_top');return s;
 });
 await check('首页六视图审查与真实侧裙配置，配置后几何统计改变',async()=>{
  let f=await live('harness',()=>window.__ready&&!window.__error);const fitted=await f.evaluate(()=>window.__stats);assert.equal(fitted.config.schuerzen,'fitted');assert.ok(fitted.triangles>1000);
  await page.click('#harness-skirts');await page.click('#harness-apply');f=await frame();await f.waitForFunction(()=>window.__ready&&!window.__error,{timeout:180000});
  const removed=await f.evaluate(()=>window.__stats);assert.equal(removed.config.schuerzen,'removed');assert.notEqual(fitted.triangles,removed.triangles);
  await page.click('#live-close');return{fitted:fitted.triangles,removed:removed.triangles};
 });
 }
 await check('390px首页、研究全文与证据页面无横向溢出，所有体验入口保留',async()=>{
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const widths=[];
  for(const relative of ['./','research.html?doc=notes%2Fairport-defense.md','evidence.html']){
   await goto(relative);await page.waitForFunction(()=>document.querySelectorAll('.material-counts strong').length>=4);await wait(300);
   const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.equal(layout.scrollWidth,390,relative);widths.push({page:relative,...layout});
   if(relative==='./'){assert.equal(await page.$$eval('[data-live]',els=>els.length),5);await shot('research-hub-mobile.png');}
  }
  return widths;
 });
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failures,[]);report.passed=true;
}catch(error){report.failure=String(error.stack??error);console.error(report.failure);process.exitCode=1;if(page&&!values.prefix)await page.screenshot({path:path.resolve('../assets/research-hub-failure.png')}).catch(()=>{});}
finally{
 report.finished=new Date().toISOString();fs.writeFileSync(path.resolve('../notes/'+(values.online?'publication-hub-browser-results.json':values.prefix?'research-hub-subpath-results.json':values.light?'research-hub-content-results.json':'research-hub-browser-results.json')),JSON.stringify(report,null,2));
 await browser?.close();await new Promise(r=>server?server.close(r):r());
}


