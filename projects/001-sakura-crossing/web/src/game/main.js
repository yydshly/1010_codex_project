import './style.css';
import { createWorld } from './world.js';
import { PLACES, walkable } from './engine.mjs';

const $=id=>document.getElementById(id), escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const taskNames={fetch:'领灯油',repair:'点灯 / 补油',guard:'守灯驱灵',follow:'跟随你',wait:'等候'};
const weatherNames={calm:'☀ 平静微风',gust:'彡 一阵晚风 · 步伐变慢',mist:'☁ 薄雾来访 · 能见度降低',fireflies:'✧ 萤火入街'};
const requestedMode=new URLSearchParams(location.search).get('mode');
let game,mode=['rules','codex','minimax'].includes(requestedMode)?requestedMode:'codex',selected='west',busy=false,polling=false,requestSeq=0,lastJournal='',lastDecisions='',localError='',visiblePaused=false;
const world=createWorld($('world'),$('world-labels'),pick=>{
  if(!game)return;
  if(pick.entity){if(PLACES[pick.entity])go(pick.entity);else if(pick.entity!=='player'){const recipient={companion:'阿澄',shopkeeper:'柚子',guard:'晴'}[pick.entity];if(recipient){$('recipient').value=recipient;$('command').focus();}}return;}
  if(pick.place){go(pick.place);return;}
  if(game.phase==='playing' && walkable(pick.x,pick.z))action('move',{x:pick.x,z:pick.z});
});
async function api(url,options={}){const res=await fetch(url,{...options,headers:{'Content-Type':'application/json'},cache:'no-store'});const data=await res.json();if(!res.ok)throw new Error(data.error||'请求失败');return data;}
async function action(name,data={}){if(!game)return;try{const id=game.id,s=await api(`/api/town/games/${id}/${name}`,{method:'POST',body:JSON.stringify(data)});if(game?.id===id){game=s;localError='';render();}}catch(error){localError=error.message;render();}}
async function newGame(){const seq=++requestSeq;busy=true;$('intro').hidden=false;$('start').disabled=true;$('ready-status').textContent='正在准备小镇与导演…';lastJournal='';lastDecisions='';
  try{const data=await api('/api/town/games',{method:'POST',body:JSON.stringify({mode,previous:game?.id})});if(seq!==requestSeq)return;game=data;localError='';render();}catch(error){localError=error.message;$('ready-status').textContent=localError;}
  finally{if(seq===requestSeq)busy=false;}}
function go(id){if(id==='player')return;selected=id;const p=PLACES[id];if(p)action('move',{x:p.x,z:p.z+1.1});}
function nearest(){if(!game)return selected;const a=game.actors.player;return Object.entries(PLACES).filter(([id])=>id!=='player').sort(([,a1],[,b1])=>Math.hypot(a.x-a1.x,a.z-a1.z)-Math.hypot(a.x-b1.x,a.z-b1.z))[0][0];}
function render(){
  if(!game)return;world.update(game);
  $('scene-caption').classList.toggle('win',game.phase==='won');$('pause').disabled=game.phase!=='playing';
  const lit=game.lanterns.filter(l=>l.charge>0).length,left=Math.max(0,240-game.time);$('clock').textContent=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(Math.floor(left%60)).padStart(2,'0')}`;
  $('light-count').textContent=`${lit} / 3 盏灯`;$('oil-count').textContent=`灯油 ${game.actors.player.oil}`;$('decision-count').textContent=game.calls;$('pause').textContent=game.paused?'继续':'暂停';
  $('weather').textContent=weatherNames[game.weather.kind];$('weather').title=game.weather.announcement;
  const phaseNames={ready:'尚未入街',playing:game.paused?'已暂停':'守灯中',won:'花灯节开幕',lost:'今晚延期'};$('phase').textContent=phaseNames[game.phase];
  $('lantern-list').innerHTML=game.lanterns.map(l=>`<div class="lamp-row"><span class="lamp-icon ${l.charge>0?'lit':''}">灯</span><span>${escape(l.name)}</span><small>${l.progress>0?'点灯中…':l.charge>0?`亮着 · ${l.charge.toFixed(1)} 油`:'等待点亮'}</small></div>`).join('');
  $('hold-bar').style.width=`${Math.min(100,game.stable/20*100)}%`;$('hold-text').textContent=lit===3?`继续守住 ${Math.max(0,20-game.stable).toFixed(0)} 秒`:'三灯齐亮后，守住 20 秒';
  $('coach-advice').textContent=game.coach.advice;$('coach-source').textContent=mode==='rules'?'固定规则':game.decisions.filter(d=>d.status==='applied').at(-1)?.model||'待决策';
  $('actor-list').innerHTML=['companion','shopkeeper','guard'].map(id=>{const a=game.actors[id];return `<div class="actor-card"><div class="avatar ${id}">${{companion:'澄',shopkeeper:'柚',guard:'晴'}[id]}</div><div class="actor-info"><strong>${a.name}</strong><small>灯油 ${a.oil} · 完成 ${a.actions} 次</small><p>${escape(a.say||'等着与你碰面。')}</p><div class="actor-task">${a.job?'正在点灯':a.path.length?'正在走向':'驻留'} ${escape(PLACES[a.goal]?.name||'你身边')} · ${taskNames[a.task]}</div></div></div>`;}).join('');
  $('rival-plan').textContent=`${{steal:'偷油',distract:'盘旋干扰',retreat:'退回街口'}[game.rivals.tactic]} → ${PLACES[game.rivals.goal].name}。${game.rivals.say}`;
  const journal=game.journal.filter(e=>e.type!=='move').slice(-8),jkey=JSON.stringify(journal);if(lastJournal!==jkey){lastJournal=jkey;$('journal').innerHTML=journal.slice().reverse().map(e=>`<div class="event"><time>${e.time.toFixed(0)}s</time><strong>${escape(e.who)}</strong> ${escape(e.text)}</div>`).join('');}
  const dkey=JSON.stringify(game.decisions);if(dkey!==lastDecisions){lastDecisions=dkey;$('decision-list').innerHTML=game.decisions.slice().reverse().map(d=>`<article class="decision"><div class="meta">第 ${d.number} 轮 · ${escape(d.model||mode)} · ${{thinking:'思考中',applied:'已应用',failed:'未应用',discarded:'已弃用'}[d.status]} ${d.ms?`· ${(d.ms/1000).toFixed(1)}s`:''}</div><h4>${escape(d.plan?.title||'观察与分工')}</h4><p>${escape(d.plan?.why||d.error||d.note||'模型正在读取走位、物资和最近行动。')}</p>${d.plan?`<div class="instructions">阿澄：${taskNames[d.plan.companion.task]} → ${escape(PLACES[d.plan.companion.goal].name)}<br>柚子：${taskNames[d.plan.shopkeeper.task]} → ${escape(PLACES[d.plan.shopkeeper.goal].name)}<br>晴：${taskNames[d.plan.guard.task]} → ${escape(PLACES[d.plan.guard.goal].name)}<br>纸灵：${escape(d.plan.rivals.tactic)} → ${escape(PLACES[d.plan.rivals.goal].name)}<br>场景：${escape(weatherNames[d.plan.director.weather])}</div>`:''}<div class="meta">观察 ${d.input.time}s${d.application?` → 应用 ${d.application.appliedAt}s`:''}</div><details><summary>查看输入观察与模型原始输出</summary><pre>${escape(JSON.stringify({input:d.input,raw:d.raw,application:d.application,usage:d.usage},null,2))}</pre></details></article>`).join('')||'<p class="decision-explainer">普通电脑只执行固定规则；切换到模型导演可看到真实决策记录。</p>';}
  $('model-status').textContent=mode==='rules'?'固定规则':game.pending?'导演思考中…':`${game.calls}/10 轮 · 可对话`;$('send').disabled=game.pending||!['ready','playing'].includes(game.phase);
  $('chat-error').textContent=localError||game.error;
  if(game.phase==='ready'){
    const decision=game.decisions.filter(d=>d.status==='applied').at(-1),ready=mode==='rules'||!!decision;
    $('start').disabled=game.pending||!ready;$('start').textContent=game.pending?'导演正在安排角色…':ready?'进入小镇，开始守灯 ↗':'准备失败，点重新开局重试';
    $('ready-status').textContent=game.pending?'真实模型正在观察：你的起点、三盏花灯、居民和物资。':ready?(decision?`${decision.model} · ${(decision.ms/1000).toFixed(1)}秒完成分工。角色将在你入街后行动。`:'普通规则已准备好。居民执行固定职责，不理解自然语言。'):game.error||'等待模型连接';
  }
  if(game.phase==='won'||game.phase==='lost'){$('scene-caption').textContent=game.phase==='won'?'✧ 守灯成功！花灯节开幕。点击「重新开局」体验另一种分工。':'今晚延期了。点击「重新开局」再试一次。';$('scene-caption').classList.toggle('win',game.phase==='won');}
  else $('scene-caption').textContent=game.paused?'已暂停 · 点击「继续」接着守灯':game.actors.player.job?'正在点灯… 请等 2.2 秒':'点击街道 / WASD 移动 · E 点灯 / 领油 · Q 摇铃驱灵';
  const applied=game.decisions.filter(d=>d.status==='applied'),last=applied.at(-1);$('footer-model').textContent=mode==='rules'?'固定规则 · 无模型调用':last?`${last.model} · 已应用 ${applied.length} 轮${game.pending?' · 下一轮思考中':''}`:'等待真实模型';
}
async function poll(){if(polling||!game)return;polling=true;const id=game.id;try{const data=await api(`/api/town/games/${id}`);if(game?.id===id){game=data;render();}}catch(error){localError=error.message;}finally{polling=false;}}
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{if(busy)return;mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b===button));newGame();}));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
$('start').addEventListener('click',async()=>{await action('start');if(game?.phase==='playing')$('intro').hidden=true;});
$('new-game').addEventListener('click',newGame);$('pause').addEventListener('click',()=>action('pause',{paused:!game.paused}));
$('interact').addEventListener('click',()=>action('interact',{target:nearest()}));$('ward').addEventListener('click',()=>action('ward'));$('coach-go').addEventListener('click',()=>go(game.coach.goal));
$('chat-form').addEventListener('submit',async e=>{e.preventDefault();const request=$('command').value.trim();if(!request){localError='写一句分工或角色对话再发送。';render();return;}await action('plan',{request:`对${$('recipient').value}说：${request}`});if(!localError)$('command').value='';});
$('suggestion').addEventListener('click',()=>{$('recipient').value='阿澄';$('command').value='先别点灯，跟着我走；我自己去修西街。晴去西街守灯，柚子帮忙点广场。';$('command').focus();});
$('town-tab').addEventListener('click',()=>{ $('town-panel').hidden=false;$('decisions-panel').hidden=true;$('town-tab').classList.add('active');$('decisions-tab').classList.remove('active');});
$('decisions-tab').addEventListener('click',()=>{ $('town-panel').hidden=true;$('decisions-panel').hidden=false;$('town-tab').classList.remove('active');$('decisions-tab').classList.add('active');});
$('help-toggle').addEventListener('click',()=>$('help').hidden=!$('help').hidden);$('help-close').addEventListener('click',()=>$('help').hidden=true);
$('export').addEventListener('click',()=>{if(!game)return;const blob=new Blob([JSON.stringify(game,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`sakura-town-${game.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const keys=new Set();let lastKeyboard=0;
window.addEventListener('keydown',e=>{if(e.target.matches('textarea,input,select')||!$('intro').hidden||game?.phase!=='playing')return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){keys.add(k);e.preventDefault();}if(!e.repeat&&k==='e')action('interact',{target:nearest()});if(!e.repeat&&k==='q')action('ward');});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
setInterval(()=>{if(!game||game.phase!=='playing'||game.paused||document.hidden||!keys.size||performance.now()-lastKeyboard<180)return;lastKeyboard=performance.now();const dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);if(dx||dz){const a=game.actors.player,step=.75/Math.hypot(dx,dz),x=a.x+dx*step,z=a.z+dz*step;if(walkable(x,z))action('move',{x,z});}},100);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game?.phase==='playing'&&!game.paused){visiblePaused=true;action('pause',{paused:true});}else if(!document.hidden&&visiblePaused){visiblePaused=false;action('pause',{paused:false});}});
setInterval(poll,350);
async function boot(){try{const status=await api('/api/town/status');$('connection').textContent=status.codex.available?`OpenAI · ${status.codex.model}`:status.codex.error;document.querySelector('[data-mode="minimax"]').disabled=!status.minimax.available;if(mode==='codex'&&!status.codex.available)mode='rules';document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===mode));await newGame();}catch(error){$('connection').textContent='本机游戏服务未连接';$('ready-status').textContent='请先运行 npm run build 和 npm run game，再打开本机 5197 端口。';localError=error.message;}}
if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) boot();
else {
  $('connection').textContent = '本机服务体验 · 静态页面仅展示';
  $('ready-status').textContent = 'AI 守灯游戏需要本机服务。下载仓库后在本项目 web/ 运行 npm run build 和 npm run game，再打开 http://127.0.0.1:5197/game.html。完整说明与模型实测记录在研究手册中。';
  for (const button of document.querySelectorAll('[data-mode], #start, #new-game, #send')) button.disabled = true;
  $('start').textContent = '需要本机游戏服务';
}
