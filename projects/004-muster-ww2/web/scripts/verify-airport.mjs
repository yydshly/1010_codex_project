/** 真实键鼠完成机场任务；只读验收接口，不改血量、坐标、阶段或时间。 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { battleModule, airportModule } from './battle-module.mjs';
const { angleDelta, dist, COVERS, segmentBox } = battleModule, { AIRPORT, VISION } = airportModule;
const base=process.env.BASE_URL??'http://127.0.0.1:5198/';
const mobileOnly=process.argv.includes('--mobile-only');
const report={date:new Date().toISOString(),base,checks:[],errors:[],warnings:[],failures:[],screenshots:[],passed:false};
const browser=await puppeteer.launch({executablePath:process.env.BROWSER_PATH??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,defaultViewport:{width:1600,height:1000,deviceScaleFactor:1},protocolTimeout:300000,args:['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--enable-webgl','--no-first-run','--hide-scrollbars']});
const page=await browser.newPage();report.browser=await browser.version();
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{const list=m.type()==='error'?report.errors:m.type()==='warn'?report.warnings:null;if(list&&!list.includes(m.text()))list.push(m.text());});page.on('requestfailed',r=>report.failures.push(r.url()+' '+r.failure()?.errorText));page.on('response',r=>{if(r.status()>=400)report.failures.push(r.status()+' '+r.url());});
const wait=ms=>new Promise(r=>setTimeout(r,ms)), state=()=>page.evaluate(()=>window.__battle.getState());
const held=new Set();async function key(k,on){if(on&&!held.has(k)){await page.keyboard.down(k);held.add(k);}if(!on&&held.has(k)){await page.keyboard.up(k);held.delete(k);}}
async function release(){for(const k of [...held])await key(k,false);}
async function simWait(seconds){const s=await state();await page.waitForFunction(({time,seconds})=>{const s=window.__battle.getState();return s.status!=='running'||s.time>=time+seconds;},{polling:100,timeout:Math.max(15000,seconds*6000)},{time:s.time,seconds});}
async function shot(name){fs.writeFileSync(path.resolve('../assets/'+name),await page.screenshot());report.screenshots.push(name);}
async function check(name,fn){if(mobileOnly&&!name.includes('本地生产入口')&&!name.includes('390px'))return;console.log('检查：'+name);const detail=await fn();assert.deepEqual(report.errors,[]);assert.deepEqual(report.failures,[]);report.checks.push({name,passed:true,detail});console.log('通过：'+name);}
async function clickGround(point,button='left'){const p=await page.evaluate(p=>window.__battle.project(p.x,p.z),point);assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,p),'battle-canvas',JSON.stringify(p));await page.mouse.click(p.x,p.y,{button});}
async function drive(point,radius=2.8){
  const start=Date.now();await release();
  while(Date.now()-start<90000){const s=await state();assert.equal(s.status,'running',JSON.stringify(s.mission));const u=s.units.find(u=>u.id===s.selectedId),d=dist(u,point),error=angleDelta(Math.atan2(point.x-u.x,point.z-u.z),u.heading);
    if(d<radius&&Math.abs(u.speed)<1.4){await release();console.log('到达：'+JSON.stringify(point)+' 实际 '+JSON.stringify({x:u.x,z:u.z,time:s.time}));return u;}
    const stopping=u.speed*u.speed/18;await key('w',d>Math.max(radius*.75,stopping+radius*.5)&&Math.abs(error)<.45);await key('a',error>.07);await key('d',error<-.07);await wait(90);
  }await release();throw Error('驾驶未到达 '+JSON.stringify(point)+' '+JSON.stringify((await state()).units));
}
const visible=(s,p)=>[...s.units,...s.infantry].some(u=>u.team==='blue'&&u.hp>0&&dist(u,p)<=('kind'in u?u.kind==='jeep'?VISION.jeep:VISION.armor:VISION.infantry)&&!COVERS.some(c=>segmentBox(u,p,c)!==null));
try{
 await check('本地生产入口、四阶段简报、真实模型与独立任务初始状态',async()=>{
  await page.goto(new URL('airport.html',base).href,{waitUntil:'load',timeout:120000});await page.bringToFront();await page.waitForFunction(()=>window.__battleReady&&window.__battle.getState().render.triangles>100000,{polling:200,timeout:240000});const s=await state();assert.equal(s.mode,'airport');assert.equal(s.status,'ready');assert.equal(s.selectedId,5);assert.equal(s.mission.phase,0);assert.equal(s.mission.squads.length,2);await shot('airport-briefing.png');await page.click('#start');await page.keyboard.press('c');return{render:s.render,mission:s.mission};
 });
 await check('真实按钮与右键命令，步兵移动、驻守、跟随；暂停同时冻结任务和声音',async()=>{
  await page.click('[data-order="move"]');await clickGround({x:0,z:11});await simWait(1.2);let s=await state();assert.equal(s.mission.squads[0].order,'move');assert.ok(s.infantry[0].distance>.4);assert.ok(s.soldierModels[0].phase>0);await page.keyboard.press('h');assert.equal((await state()).mission.squads[0].order,'hold');await page.keyboard.press('5');await page.keyboard.press('j');assert.equal((await state()).mission.squads[1].order,'follow');await clickGround({x:0,z:8},'right');assert.equal((await state()).mission.squads[1].order,'move');await shot('airport-squad-orders.png');await page.keyboard.press('p');await wait(200);const a=await state();await wait(500);const b=await state();for(const k of ['time','mission','units','infantry','soldierModels'])assert.deepEqual(b[k],a[k],k);assert.equal(b.audio.gain,0);assert.equal(b.audio.context,'suspended');await shot('airport-paused.png');await page.click('#start');return{orders:s.mission.squads,pausedAudio:b.audio};
 });
 await check('真实驾驶吉普到D装货、两通道停车侦察，阶段切到部署',async()=>{
  await drive({x:-20,z:11},2.7);await page.keyboard.press('e');assert.equal((await state()).mission.cargo,2);await shot('airport-supply-loaded.png');
  await drive({x:-17,z:5},2);await drive({x:3,z:5},2);await drive(AIRPORT.recon[0],3);await simWait(2.2);assert.equal((await state()).mission.recon[0].done,true);await shot('airport-recon-north.png');
  await drive({x:3,z:5},2);await drive(AIRPORT.recon[1],3);await simWait(2.2);const s=await state();assert.equal(s.mission.phase,1);assert.ok(s.mission.recon.every(p=>p.done));assert.ok(s.units[5].distance>55);assert.equal(s.mission.charges,0);assert.equal(await page.$eval('#airstrike',e=>e.disabled),true);await shot('airport-recon-complete.png');return{recon:s.mission.recon,jeep:s.units[5]};
 });
 await check('分别部署两个小队；吉普实际送达HQ，补给落地后第一波进攻开始',async()=>{
  await page.click('[data-post="alpha"]');await page.click('[data-post="bravo"]');await drive({x:0,z:5},2);await drive(AIRPORT.headquarters,3);await page.keyboard.press('e');await page.waitForFunction(()=>window.__battle.getState().mission.phase===2,{polling:100,timeout:90000});const s=await state();assert.equal(s.mission.headquartersDeliveries,1);assert.equal(s.mission.cargo,1);assert.equal(s.mission.wave,1);assert.equal(s.mission.charges,2);assert.ok(s.history.some(e=>e.kind==='supply'&&e.text.includes('收到补给')));assert.ok(s.infantry.filter(u=>u.team==='blue').every(u=>u.distance>4));await shot('airport-deployed.png');return{phase:s.mission,people:s.infantry};
 });
 await check('接管谢尔曼主动交火、步兵守阵地、有限空袭，实际击退两波进攻',async()=>{
  await release();await page.keyboard.press('1');await drive({x:-5,z:8},2);await drive({x:7,z:8},2.5);
  const begin=Date.now();let wave1=false,wave2=false,flight=false;
  while(Date.now()-begin<240000){const s=await state();if(s.status!=='running'||s.mission.phase===3)break;const p=s.units.find(u=>u.id===s.selectedId);
   const spotted=[...s.infantry,...s.units].filter(u=>u.team==='red'&&u.hp>0&&visible(s,u));
   const candidates=spotted.filter(u=>!COVERS.some(c=>segmentBox(p,u,c)!==null)).sort((a,b)=>Number('kind'in a)-Number('kind'in b)||dist(a,p)-dist(b,p));const target=candidates[0];
   await key('Space',!!target&&p.ammo>0);
   const airTarget=spotted.filter(u=>COVERS.some(c=>segmentBox(p,u,c)!==null)).sort((a,b)=>Number('kind'in b)-Number('kind'in a))[0]??target;
   if(airTarget&&s.airCooldown<=0&&s.mission.charges>0){const at=await page.evaluate(p=>window.__battle.project(p.x,p.z),airTarget);await page.mouse.move(at.x,at.y);await page.keyboard.press('f');}
   if(target){const flightTime=dist(p,target)/65;const aim={x:target.x+Math.sin(target.heading)*target.speed*flightTime,z:target.z+Math.cos(target.heading)*target.speed*flightTime};const at=await page.evaluate(p=>window.__battle.project(p.x,p.z),aim);await page.mouse.move(at.x,at.y);}
   if(!target&&spotted.length&&s.airCooldown>3){await release();await drive({x:3,z:7},2);await drive({x:3,z:-8},2.5);}
   if(!wave1&&s.kills>0){await shot('airport-wave-one.png');wave1=true;}
   if(!wave2&&s.mission.wave===2){await shot('airport-wave-two.png');wave2=true;}
   if(!flight&&s.airstrikes.some(r=>r.team==='blue'&&r.age>3.8&&r.age<5)){await shot('airport-air-support.png');flight=true;}
   await wait(100);
  }await release();const s=await state();assert.equal(s.status,'running',JSON.stringify(s.mission));assert.equal(s.mission.phase,3,JSON.stringify(s));assert.equal(s.mission.wave,2);assert.ok(s.kills>=5&&s.infantryKills>=10);assert.ok(s.history.some(e=>e.kind==='hit'&&e.unit===0));assert.ok(s.history.some(e=>e.kind==='rifle'&&[100,101,102,103].includes(e.unit)));assert.ok(s.mission.charges<2);await shot('airport-counterattack-complete.png');return{time:s.time,mission:s.mission,kills:s.kills,infantryKills:s.infantryKills,units:s.units,infantry:s.infantry};
 });
 await check('第二箱补给送到HQ、小队真实警戒8秒，完整机场任务胜利与重开',async()=>{
  await page.keyboard.press('3');await page.keyboard.press('e');let s=await state();assert.equal(s.mission.headquartersDeliveries,2);assert.equal(s.mission.cargo,0);const alive=s.mission.squads.find(q=>s.infantry.some(u=>q.members.includes(u.id)&&u.hp>0));assert.ok(alive);await page.click(`[data-squad="${alive.id}"]`);await page.click('#guard-hq');await page.waitForFunction(()=>window.__battle.getState().status!=='running',{polling:100,timeout:100000});s=await state();assert.equal(s.status,'won',JSON.stringify(s.mission));assert.equal(s.mission.secure,8);assert.equal(await page.$eval('#dialog-title',e=>e.textContent),'机场保卫成功');await shot('airport-victory.png');const final={time:s.time,mission:s.mission,audio:s.audio};await page.click('#dialog-restart');const reset=await state();assert.equal(reset.status,'ready');assert.equal(reset.mission.phase,0);assert.equal(reset.mission.cargo,0);assert.equal(reset.mission.wave,0);return final;
 });
 await check('390px本地触控界面、下令/驾驶/补给按钮、切车与自动暂停',async()=>{
  await page.click('#restart');await page.setViewport({width:390,height:844,deviceScaleFactor:1});await wait(300);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);await shot('airport-mobile-briefing.png');await page.click('#start');await page.click('[data-post="bravo"]');assert.equal((await state()).mission.squads[1].order,'move');await page.click('#interact');await page.click('[data-vehicle="0"]');assert.equal((await state()).selectedId,0);const layout=await page.evaluate(()=>{const panel=document.querySelector('.airport-panel').getBoundingClientRect(),pad=document.querySelector('.touch-pad').getBoundingClientRect(),footer=document.querySelector('.bottom').getBoundingClientRect();return{panelBottom:panel.bottom,padTop:pad.top,padBottom:pad.bottom,footerTop:footer.top};});assert.ok(layout.padTop>=layout.panelBottom&&layout.padBottom<=layout.footerTop,JSON.stringify(layout));const b=await page.$eval('[data-key="KeyW"]',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});const before=await state();await page.mouse.move(b.x,b.y);await page.mouse.down();await simWait(.8);await page.mouse.up();assert.ok((await state()).units[0].distance>before.units[0].distance+.5);await shot('airport-mobile-playing.png');const other=await browser.newPage();await other.bringToFront();await wait(200);assert.equal((await state()).status,'paused');assert.equal((await state()).audio.gain,0);await other.close();return{size:[390,844],layout};
 });report.passed=true;
}catch(e){await release().catch(()=>{});report.failedState=await state().catch(()=>null);report.failure=String(e.stack??e);console.error(report.failure);fs.writeFileSync(path.resolve('../assets/airport-verification-failure.png'),await page.screenshot());process.exitCode=1;}
finally{report.finished=new Date().toISOString();report.scope=mobileOnly?'入口与窄屏复验':'完整机场任务';fs.writeFileSync(path.resolve(mobileOnly?'../notes/airport-mobile-results.json':'../notes/airport-browser-results.json'),JSON.stringify(report,null,2));await browser.close();}
