import {researchUI} from './research-ui.js';
import {panelTopics} from './research-data.js';
import {creatorUI} from './creator-ui.js';
import {MusicPlayer,mixOf,trackSpan,trackPosition} from './audio-mix.js';
const musicPlayer=new MusicPlayer();
let musicImport=false;
import { productionUI } from './production-ui.js';
import { drawScene, upgradeScene, sceneDuration, locateTime } from './composition.js';
const $=id=>document.getElementById(id), ctx=$('canvas').getContext('2d');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=value=>structuredClone(value), clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const uid=()=>crypto.randomUUID(), clock=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${(n%60).toFixed(1).padStart(4,'0')}`;
let state,project,selected=0,selectedId='title',panel='scenes',propertyTab='object',dirty=false,playing=false,time=0,lastTick=0,px=14,dragging=false,activeJob,seenJob,refreshing=false;
let undoStack=[],redoStack=[];const images=new Map(),loading=new Map(),waves=new Map(),thumbs=new Map();
const media=(file,id=project.id)=>'/media/'+id+'/'+file, scene=()=>project?.scenes[selected], element=()=>scene()?.elements.find(e=>e.id===selectedId), total=()=>project?.scenes.reduce((n,s)=>n+sceneDuration(s),0)||0;
const startOf=i=>project.scenes.slice(0,i).reduce((n,s)=>n+sceneDuration(s),0);
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,4200);}
async function api(url,options={}){const res=await fetch(url,{...options,headers:{...(options.body&&!(options.body instanceof File)?{'Content-Type':'application/json'}:{}),...options.headers}});const data=await res.json();if(!res.ok)throw new Error(data.error||'操作失败');return data;}
function safe(fn){return async e=>{try{await fn(e);}catch(error){toast(error.message);}};}
function on(id,event,fn){$(id).addEventListener(event,safe(fn));}
function adopt(p){project=clone(p);project.audioMix=mixOf(project);project.scenes.forEach(upgradeScene);selected=clamp(selected,0,Math.max(0,project.scenes.length-1));time=clamp(time,0,total());}
function checkpoint(){if(!project||project.busy) return false;undoStack.push({scenes:clone(project.scenes),title:project.title,story:clone(project.story||{}),characters:clone(project.characters||[]),audioMix:clone(mixOf(project)),musicBrief:project.musicBrief||'',selected,selectedId,time});if(undoStack.length>60)undoStack.shift();redoStack=[];return true;}
function changed(render=true){dirty=true;$('saveState').textContent='● 有未保存修改';if(render)renderAll();else{paint();drawHandles();setButtons();}}
function mutate(fn){if(!checkpoint())return;stop();fn();changed();}
function history(from,to){if(!from.length||project?.busy)return;stop();to.push({scenes:clone(project.scenes),title:project.title,story:clone(project.story||{}),characters:clone(project.characters||[]),audioMix:clone(mixOf(project)),musicBrief:project.musicBrief||'',selected,selectedId,time});const past=from.pop();Object.assign(project,{scenes:past.scenes,title:past.title,story:past.story,characters:past.characters,audioMix:past.audioMix,musicBrief:past.musicBrief});selected=past.selected;selectedId=past.selectedId;time=clamp(past.time??time,0,total());changed();}
async function save(force=false){if(!project||(!dirty&&!force))return;const result=await api('/api/projects/'+project.id,{method:'PUT',body:JSON.stringify({title:project.title,revision:project.revision,scenes:project.scenes,story:project.story,characters:project.characters,audioMix:project.audioMix,musicBrief:project.musicBrief})});adopt(result);dirty=false;renderAll();}
async function refresh(){
  if(refreshing)return;refreshing=true;
  try {
    state=await api('/api/state');
    const options=state.projects.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('');if($('projectSelect').innerHTML!==options)$('projectSelect').innerHTML=options;
    const next=state.projects.find(p=>p.id===project?.id)||state.projects[0];
    if(next&&!dirty&&!dragging&&(next.id!==project?.id||next.revision!==project?.revision||next.busy!==project?.busy||JSON.stringify(next.exports)!==JSON.stringify(project?.exports)||JSON.stringify(next.generationTasks)!==JSON.stringify(project?.generationTasks))){adopt(next);renderAll();}
    if(project)$('projectSelect').value=project.id;
    const job=state.jobs.find(j=>j.id===activeJob)||state.jobs.findLast(j=>j.projectId===project?.id&&j.state==='running');
    $('jobPanel').hidden=!job||job.state==='completed';$('jobPanel').textContent=job?(job.state==='running'?'◌ ':'')+job.message:'';$('jobPanel').classList.toggle('failed',job?.state==='failed');
    if(job&&job.state!=='running'&&seenJob!==job.id+job.state){seenJob=job.id+job.state;toast(job.state==='completed'?'已完成，最新版本已保存':job.message);if(job.state==='completed'&&job.events.some(e=>e.message.includes('合并'))){renderExports();if(!document.querySelector('dialog[open]'))$('exportsDialog').showModal();}}
    setButtons();production.refresh();research.refresh();
  }finally{refreshing=false;}
}
function setButtons(){const disabled=!scene()||project?.busy;for(const id of ['save','exportBtn','copyProject','addScene','duplicateScene','splitScene','moveLeft','moveRight','removeScene','insertText','insertShape','uploadTop','productionBtn'])$(id).disabled=disabled;
  $('undo').disabled=disabled||!undoStack.length;$('redo').disabled=disabled||!redoStack.length;$('moveLeft').disabled=disabled||selected===0;$('moveRight').disabled=disabled||selected===project?.scenes.length-1;$('removeScene').disabled=disabled||project?.scenes.length<2;document.querySelectorAll('#properties input,#properties textarea,#properties select,#properties button,[data-action=generate],[data-action=voice],[data-action=image],#libraryContent input,#libraryContent textarea,#libraryContent select,#libraryContent [data-create-action]').forEach(el=>el.disabled=disabled);const imageAction=document.querySelector('[data-action="image"]');if(imageAction&&state?.config.image.provider==='import'){imageAction.disabled=true;imageAction.title='Codex图片请在对话中生成后导入';}$('saveState').textContent=project?.busy?'◌ 正在处理':dirty?'● 有未保存修改':'✓ 已保存到本机';
}
async function preload(){
  if(!scene())return;const p=project.id,s=scene();
  const sources=s.elements.filter(e=>e.type==='image').map(e=>e.source==='scene'?(s.video||s.image):e.source).filter(Boolean);
  for(const file of sources){const key=p+'/'+file;if(images.has(key)||loading.has(key))continue;
    const task=new Promise(resolve=>{let asset;if(file===s.video){asset=document.createElement('video');asset.muted=true;asset.playsInline=true;asset.preload='auto';asset.onloadeddata=()=>resolve(asset);}else{asset=new Image();asset.onload=()=>resolve(asset);}asset.onerror=()=>resolve(null);asset.src=media(file,p);});
    loading.set(key,task);task.then(asset=>{loading.delete(key);if(asset){images.set(key,asset);if(asset instanceof HTMLVideoElement){asset.onseeked=paint;syncMedia();}paint();}});
  }
  if(s.audio&&!waves.has(p+'/'+s.audio)){waves.set(p+'/'+s.audio,null);api('/api/projects/'+p+'/waveform?file='+encodeURIComponent(s.audio)).then(data=>{waves.set(p+'/'+s.audio,data);if(project.id===p)drawTimeline();}).catch(()=>{waves.set(p+'/'+s.audio,{error:true});});}
}
function sceneImages(){const map=new Map();for(const [key,img]of images)if(key.startsWith(project.id+'/'))map.set(key.slice(project.id.length+1),img);return map;}
function thumbnail(s){
  if(s.poster&&!dirty&&project.exports?.at(-1)?.revision===project.revision)return media(s.poster);
  const key=project.id+'/'+JSON.stringify([s.id,s.title,s.body,s.narration,s.background,s.elements,s.image,s.video]);
  if(thumbs.has(key))return thumbs.get(key);
  const needed=s.elements.filter(e=>e.type==='image'&&!e.hidden).map(e=>e.source==='scene'?(s.video||s.image):e.source).filter(Boolean);
  if(needed.every(file=>images.has(project.id+'/'+file))){const c=document.createElement('canvas');c.width=320;c.height=180;const g=c.getContext('2d');g.scale(1/6,1/6);drawScene(g,s,sceneImages());const url=c.toDataURL('image/jpeg',.7);if(thumbs.size>100)thumbs.clear();thumbs.set(key,url);return url;}
  for(const file of needed){const cacheKey=project.id+'/'+file;if(file===s.video||images.has(cacheKey)||loading.has(cacheKey))continue;const img=new Image();loading.set(cacheKey,true);img.onload=()=>{images.set(cacheKey,img);loading.delete(cacheKey);paint();renderLibrary();drawTimeline();};img.onerror=()=>loading.delete(cacheKey);img.src=media(file);}
  return s.poster?media(s.poster):s.image?media(s.image):'';
}
function paint(){if(!scene())return;drawScene(ctx,scene(),sceneImages());if(playing&&scene().timing.transition==='fade'){const local=locateTime(project.scenes,time).local,d=sceneDuration(scene()),alpha=1-Math.min(1,local/.3,(d-local)/.3);if(alpha>0){ctx.fillStyle=`rgba(0,0,0,${alpha})`;ctx.fillRect(0,0,1920,1080);}}}
function objectName(el){return el.type==='image'?'画面素材':el.type==='shape'?'形状':el.bind==='title'?'标题':el.bind==='body'?'要点':el.bind==='narration'?'字幕':(el.text||'文字').slice(0,12);}
function drawHandles(){
  $('objects').hidden=playing;$('objects').innerHTML=scene()?.elements.filter(e=>!e.hidden).map(e=>`<button class="object-hit ${e.id===selectedId?'active':''} ${e.locked?'locked':''}" data-object="${e.id}" aria-label="画布对象：${esc(objectName(e))}" style="left:${e.x/19.2}%;top:${e.y/10.8}%;width:${e.w/19.2}%;height:${e.h/10.8}%">${e.id===selectedId&&!e.locked?'<i class="resize" data-resize="true"></i>':''}</button>`).join('')||'';
  $('selectedLabel').textContent=element()?objectName(element())+(element().locked?' · 已锁定':' · 方向键微调'):'画布';
}
function fitCanvas(){const box=document.querySelector('.stage-space'),width=Math.min(box.clientWidth-40,(box.clientHeight-35)*16/9);$('stage').style.width=Math.max(180,width)+'px';$('fitScale').textContent=Math.round(Math.max(180,width)/1920*100)+'%';}
new ResizeObserver(fitCanvas).observe(document.querySelector('.stage-space'));
function renderAll(){
  $('empty').hidden=!!scene();$('sceneLabel').textContent=scene()?`场景 ${String(selected+1).padStart(2,'0')} / ${project.scenes.length}`:'开始创作';
  renderLibrary();renderProperties();drawTimeline();drawHandles();setButtons();preload();paint();renderExports();
}
function allAssets(){const assets=[...(project?.assets||[])];for(const s of project?.scenes||[])if(s.image&&!assets.some(a=>a.file===s.image))assets.push({file:s.image,type:'image',name:s.title});return assets;}
function renderLibrary(force=false){
  if(!force&&$('libraryContent').contains(document.activeElement)&&document.activeElement.matches('input,textarea,select'))return;
  const titles={scenes:'视频场景',assets:'我的素材',text:'文字与形状',layers:'当前场景图层',voice:'中文配音',ai:'AI 创作',story:'故事与分镜',characters:'角色',music:'音乐与混音',motion:'视频与口型'};$('libraryTitle').textContent=titles[panel];
  document.querySelectorAll('[data-panel]').forEach(b=>b.classList.toggle('active',b.dataset.panel===panel));
  if(!project){$('libraryContent').innerHTML='<p class="empty-panel">新建视频，开始创作。</p>';return;}
  const topic=panelTopics[panel]||'timeline',guide=`<div class="context-guide"><button data-research-topic="${topic}">了解这个工具 · 看效果与使用方法 ↗</button></div>`;
  const creation=creator.render(panel);if(creation!==null){$('libraryContent').innerHTML=guide+creation;return;}
  if(panel==='scenes')$('libraryContent').innerHTML=project.scenes.map((s,i)=>`<button class="scene-thumb ${i===selected?'selected':''}" data-select-scene="${i}" draggable="true" data-drag-scene="${i}"><span class="thumb">${thumbnail(s)?`<img src="${thumbnail(s)}" alt="">`:''}</span><span class="thumb-number">${String(i+1).padStart(2,'0')}</span><strong>${esc(s.title)}</strong><small>${sceneDuration(s).toFixed(1)}s</small></button>`).join('')+'<button class="panel-button" data-action="add-scene">＋ 添加空白场景</button><button class="panel-button" data-action="copy-project">创建项目副本</button>';
  if(panel==='assets')$('libraryContent').innerHTML='<button class="panel-button" data-action="upload">＋ 导入素材</button><p class="muted">图片 · MP4 / WebM · MP3 / WAV<br>点击图片加入画布，视频替换场景画面，音频替换旁白。视频原声静音。</p><div class="asset-grid">'+allAssets().map(a=>`<button class="asset-card" data-asset="${esc(a.file)}" title="${esc(a.name)}">${a.type==='image'||a.poster?`<img src="${media(a.poster||a.file)}" alt="">`:`<span class="asset-placeholder">${a.type==='audio'?'♫':'▶'}</span>`}<small>${esc(a.name)}</small></button>`).join('')+'</div>';
  if(panel==='text')$('libraryContent').innerHTML='<button class="panel-button" data-action="text" style="font-size:22px;font-weight:700;padding:25px 0">添加标题</button><button class="panel-button" data-action="body-text">添加正文文字</button><button class="panel-button" data-action="shape">▢ 添加色块</button><p class="muted">在画布中移动、缩放。右侧调整字体、颜色与对齐方式。</p>';
  if(panel==='layers')$('libraryContent').innerHTML=(scene()?.elements||[]).toReversed().map(e=>`<div class="layer ${e.id===selectedId?'active':''}"><button data-layer="${e.id}">${e.type==='text'?'T':e.type==='image'?'▧':'▢'} ${esc(objectName(e))}</button><button data-hide="${e.id}" aria-label="${e.hidden?'显示':'隐藏'}${esc(objectName(e))}">${e.hidden?'○':'●'}</button><button data-lock="${e.id}" aria-label="${e.locked?'解锁':'锁定'}${esc(objectName(e))}">${e.locked?'▣':'▢'}</button></div>`).join('')+'<p class="muted">从上到下对应画面前景到背景。选中对象后可在右侧调整层级。</p>';
  if(panel==='voice')$('libraryContent').innerHTML=`<div class="model-summary"><strong>♫ ${esc(state?.config.voice.model)}</strong><p>${esc(state?.config.voice.voice)}</p></div><p class="muted">修改当前场景口播，再生成配音。音频入点、延迟、音量在右侧场景属性中调整。</p><button class="panel-button" data-action="voice">重新生成当前配音</button><button class="panel-button" data-action="scene-properties">编辑口播与时长</button>`;
  if(panel==='story')$('libraryContent').innerHTML='<div class="model-summary"><strong>故事 → 分镜 → 生成</strong><p>设定角色，安排每个镜头的动作、情绪与台词。</p></div><button class="panel-button" data-action="production">打开剧情工作区</button><p class="muted">视频与口型模型可独立接入。暂未配置时，可以保存分镜、准备任务并导入外部结果。</p>';
  if(panel==='ai')$('libraryContent').innerHTML=['text','image','voice','music','video','lipsync'].map((r,i)=>`<div class="model-summary"><strong>${['✧ 文案','▧ 图片','♫ 配音','♬ 音乐','▷ 视频','♙ 口型'][i]}</strong><p>${esc(state?.config[r]?.model||(state?.config[r]?.provider==='disabled'?'待配置':state?.config[r]?.provider))}</p><small>${r==='image'&&state?.config.image.provider==='import'?'Codex 图片生成后导入':'独立模型连接'}</small></div>`).join('')+'<button class="panel-button" data-action="generate">生成缺失素材与成片</button><button class="panel-button" data-action="image">重新生成当前图片</button><button class="panel-button" data-action="config">设置模型连接</button><p class="muted">使用你配置的服务真实调用。导出、画布修改与时间轴编辑无需调用模型。</p>';
  $('libraryContent').insertAdjacentHTML('afterbegin',guide);
}
const field=(label,key,value,type='number',attrs='')=>`<label>${label}<input data-prop="${key}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
function renderProperties(){
  $('objectTab').classList.toggle('active',propertyTab==='object');$('sceneTab').classList.toggle('active',propertyTab==='scene');const s=scene(),el=element();
  if(!s){$('properties').innerHTML='<p class="muted">选择场景后开始编辑。</p>';return;}
  if(propertyTab==='scene'){
    const t=s.timing,cut=!s.silent&&s.audio&&t.duration<t.delay+s.audioDuration-t.audioIn;
    $('properties').innerHTML=`<div class="property-title"><b>场景 ${String(selected+1).padStart(2,'0')}</b><small>${s.video?'视频画面':'图文画面'}</small></div>${field('场景名称','scene.title',s.title,'text','maxlength="100"')}<div class="property-grid">${field('时长（秒）','timing.duration',t.duration.toFixed(2),'number','min="1" max="120" step="0.1"')}${field('背景色','scene.background',s.background,'color')}</div><label>转场<select data-prop="timing.transition"><option value="fade" ${t.transition==='fade'?'selected':''}>淡入淡出</option><option value="cut" ${t.transition==='cut'?'selected':''}>直接切换</option></select></label>${s.video?field('视频入点（秒）','timing.videoIn',t.videoIn,'number',`min="0" max="${(s.videoDuration-.1).toFixed(1)}" step="0.1"`):''}<div class="property-section"><h3>旁白与字幕</h3><label>中文口播<textarea data-prop="scene.narration" rows="5" maxlength="1500">${esc(s.narration)}</textarea></label><label class="check-label"><input data-prop="scene.silent" type="checkbox" ${s.silent?'checked':''}>静音场景</label><div class="property-grid">${field('音频入点（秒）','timing.audioIn',t.audioIn,'number','min="0" step="0.1"')}${field('延迟（秒）','timing.delay',t.delay,'number','min="0" max="120" step="0.1"')}${field('音量（0–100%）','volume',Math.round(t.volume*100),'number','min="0" max="100"')}</div><p class="muted">${s.silent?'此场景导出为静音。':s.audio?(s.voiceEvidence?.text===s.narration?'✓ 旁白已就绪':'口播已改变，请重新配音。'):'尚未生成旁白。'}${cut?'<br>当前时长会截断旁白；可延长场景或调整入点。':''}</p><button class="panel-button" data-action="voice">♫ 重新生成配音</button><button class="panel-button" data-action="fit-audio">按旁白长度设置时长</button></div><details class="property-section"><summary>图片提示词</summary><textarea data-prop="scene.imagePrompt" rows="4">${esc(s.imagePrompt)}</textarea></details>`;return;
  }
  if(!el){$('properties').innerHTML='<div class="empty-panel">点击画布中的文字或图片<br>编辑位置、大小与样式</div><button class="panel-button" data-action="scene-properties">编辑场景与口播</button>';return;}
  $('properties').innerHTML=`<div class="property-title"><b>${esc(objectName(el))}</b><small>${el.locked?'已锁定':'可直接拖动'}</small></div>${el.type==='text'?`<label>文字内容<textarea data-prop="text" rows="3" maxlength="1500">${esc(el.bind?s[el.bind]:el.text)}</textarea></label>`:''}<div class="property-grid">${field('X 位置','x',Math.round(el.x),'number','min="0" max="1910"')}${field('Y 位置','y',Math.round(el.y),'number','min="0" max="1070"')}${field('宽度','w',Math.round(el.w),'number','min="10" max="1920"')}${field('高度','h',Math.round(el.h),'number','min="10" max="1080"')}</div>${el.type==='text'?`<div class="property-section"><div class="property-grid">${field('字号','size',el.size,'number','min="10" max="200"')}${field('文字颜色','color',el.color,'color')}</div><div class="property-grid"><label>字重<select data-prop="weight"><option value="400" ${el.weight!==700?'selected':''}>常规</option><option value="700" ${el.weight===700?'selected':''}>加粗</option></select></label><label>对齐<select data-prop="align"><option value="left" ${el.align==='left'?'selected':''}>左对齐</option><option value="center" ${el.align==='center'?'selected':''}>居中</option><option value="right" ${el.align==='right'?'selected':''}>右对齐</option></select></label></div></div>`:el.type==='shape'?field('填充颜色','color',el.color,'color'):''}${el.type!=='text'&&!(s.video&&el.type==='image'&&el.source==='scene')?field('圆角','radius',el.radius||0,'number','min="0" max="500"'):''}${field('不透明度（0–100%）','opacity',Math.round((el.opacity??1)*100),'number','min="0" max="100"')}<div class="property-section"><div class="tiny-actions"><button data-action="forward">上移一层</button><button data-action="backward">下移一层</button></div><div class="tiny-actions" style="margin-top:8px"><button data-action="duplicate-object">复制对象</button><button data-action="delete-object">删除对象</button></div></div><p class="muted">拖动右下角调整大小。方向键移动，Shift + 方向键每次移动 10 像素。</p>`;
}
function drawTimeline(){
  if(!project)return;const length=total();$('trackContent').style.width=Math.max(0,length*px)+'px';$('seek').max=length;
  const ticks=[];for(let n=0;n<=length;n+=5)ticks.push(`<button data-seek="${n}" style="left:${n*px}px" aria-label="跳到${n}秒">${clock(n).slice(0,-2)}</button>`);$('ruler').innerHTML=ticks.join('');
  $('clips').innerHTML=project.scenes.map((s,i)=>`<button class="timeline-clip ${i===selected?'selected':''}" data-select-scene="${i}" data-drag-scene="${i}" draggable="true" style="width:${sceneDuration(s)*px}px" aria-label="时间轴场景${i+1} ${esc(s.title)}">${thumbnail(s)?`<img src="${thumbnail(s)}" alt="">`:''}<span>${String(i+1).padStart(2,'0')} ${esc(s.title)}</span><small>${sceneDuration(s).toFixed(1)}s</small><i class="clip-edge" data-trim="${i}" title="拖动调整时长"></i></button>`).join('');
  $('audioClips').innerHTML=project.scenes.map((s,i)=>{const wave=waves.get(project.id+'/'+s.audio),t=s.timing,w=sceneDuration(s)*px;let svg='';
    if(wave?.peaks&&!s.silent){const bars=Array.from({length:Math.max(1,Math.floor(w/3))},(_,j)=>{const local=j*3/px,at=local-t.delay+t.audioIn,n=Math.floor(at/wave.duration*wave.peaks.length),h=at>=t.audioIn&&local>=t.delay&&n<wave.peaks.length?(wave.peaks[n]||0)*26*t.volume:0;return `<path d="M${j*3+1} ${15-h/2}v${h.toFixed(2)}"/>`;}).join('');svg=`<svg viewBox="0 0 ${w} 30" preserveAspectRatio="none" aria-label="真实音频波形"><g stroke="#85b69c" stroke-width="1.3">${bars}</g></svg>`;}
    else svg=`<span>${s.silent?'静音':s.audio?(wave?.error?'波形不可用':'读取音频波形…'):'等待配音'}</span>`;
    return `<button data-select-scene="${i}" class="audio-clip ${s.silent?'muted':''} ${s.audio&&s.voiceEvidence?.text!==s.narration?'stale':''}" style="width:${w}px" aria-label="旁白场景${i+1}">${svg}</button>`;
  }).join('');$('timelineSummary').textContent=`${project.scenes.length} 个场景 · ${length.toFixed(1)} 秒`;updatePlayhead();drawMusicTimeline();
  for(const s of project.scenes){const key=project.id+'/'+s.audio;if(s.audio&&!waves.has(key)){waves.set(key,null);api('/api/projects/'+project.id+'/waveform?file='+encodeURIComponent(s.audio)).then(w=>{waves.set(key,w);if(project.id===key.split('/')[0])drawTimeline();}).catch(()=>waves.set(key,{error:true}));}}
}
function drawMusicTimeline(){
  const tracks=mixOf(project).tracks;
  $('musicHeadings').innerHTML=(tracks.length?tracks:[null]).map((t,i)=>`<div class="music-heading">♬ 音乐${i+1}</div>`).join('');
  $('musicClips').innerHTML=tracks.length?tracks.map((t,i)=>{const span=trackSpan(project,t),w=span.duration*px,key=project.id+'/'+t.asset,wave=waves.get(key);
    if(!waves.has(key)){waves.set(key,null);api('/api/projects/'+project.id+'/waveform?file='+encodeURIComponent(t.asset)).then(data=>{waves.set(key,data);if(project.id===key.split('/')[0])drawMusicTimeline();}).catch(()=>waves.set(key,{error:true}));}
    const bars=wave?.peaks?Array.from({length:Math.ceil(w/4)},(_,j)=>{const position=trackPosition(project,t,t.start+j*4/px),peak=position===null?0:wave.peaks[Math.floor(position/wave.duration*wave.peaks.length)]||0;return `<path d="M${j*4} ${11-peak*9}v${peak*18}"/>`;}).join(''):'';
    return `<div class="music-lane"><button class="music-clip ${t.muted?'muted':''}" data-panel="music" style="left:${t.start*px}px;width:${Math.max(0,w)}px" aria-label="编辑音乐${i+1}"><svg><g stroke="#9164b2" stroke-width="2">${bars}</g></svg><span>${t.muted?'静音 · ':''}${esc(span.asset?.name||'音乐')} ${t.loop?'↻':''}</span></button></div>`;
  }).join(''):'<div class="music-empty">从侧栏「音乐」添加背景音乐</div>';
}
function updatePlayhead(){$('playhead').style.left=time*px+'px';$('seek').value=time;$('timecode').textContent=clock(time)+' / '+clock(total());}
function chooseScene(index){stop();selected=index;selectedId='title';time=startOf(index);renderAll();document.querySelector('.workspace').classList.remove('library-open');}
function seek(value){time=clamp(value,0,total());const at=locateTime(project.scenes,Math.max(0,time-.00001));if(selected!==at.index){selected=at.index;renderAll();}syncMedia();paint();updatePlayhead();}
function syncMedia(){
  const s=scene();if(!s)return;const local=locateTime(project.scenes,time).local,t=s.timing,a=$('narrator'),audible=!s.silent&&s.audio&&local>=t.delay&&local-t.delay+t.audioIn<(s.audioDuration||0);
  if(audible){const source=media(s.audio);if(a.dataset.file!==source){a.src=source;a.dataset.file=source;}const desired=local-t.delay+t.audioIn;if(Number.isFinite(a.duration)&&Math.abs(a.currentTime-desired)>.2)a.currentTime=desired;a.volume=t.volume*mixOf(project).master*mixOf(project).narration;if(playing&&a.paused)a.play().catch(()=>{});if(!playing)a.pause();}else a.pause();
  musicPlayer.sync(project,time,playing);
  for(const [key,img]of images)if(img instanceof HTMLVideoElement){if(s.video&&key===project.id+'/'+s.video){const desired=Math.min(t.videoIn+local,Math.max(0,(img.duration||s.videoDuration)-.04));if(Math.abs(img.currentTime-desired)>.15)img.currentTime=desired;if(playing&&desired<img.duration-.05)img.play().catch(()=>{});else img.pause();}else img.pause();}
}
function stop(){const wasPlaying=playing;playing=false;musicPlayer.pause();$('narrator').pause();for(const img of images.values())if(img instanceof HTMLVideoElement)img.pause();$('play').textContent='▶';$('play').setAttribute('aria-label','播放时间轴');if(wasPlaying)drawHandles();}
function togglePlay(){if(!scene())return;if(playing){stop();paint();return;}if(time>=total()-.05)time=0;playing=true;lastTick=performance.now();$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','暂停时间轴');drawHandles();syncMedia();requestAnimationFrame(tick);}
function tick(now){if(!playing)return;const target=time+(now-lastTick)/1000;lastTick=now;if(target>=total()){seek(total());stop();paint();return;}seek(target);requestAnimationFrame(tick);}
function renderExports(){if(!project)return;$('exports').innerHTML=project.exports?.length?project.exports.toReversed().map(e=>`<div class="export-row"><div><strong>${esc(e.label||'导出版本 '+e.revision)}</strong><small>${clock(e.duration)} · 1080p · ${(e.bytes/1048576).toFixed(1)} MB</small></div><button data-play-export="${esc(e.file)}">▶ 播放</button><a href="${media(e.file)}?download=1">下载 MP4</a></div>`).join(''):'<div class="empty-panel">还没有导出版本。完成编辑后，点击右上角“导出 MP4”。</div>';}
async function generate(kind,assetKind){await save(true);stop();const result=await api('/api/projects/'+project.id+'/'+kind,{method:'POST',body:JSON.stringify(assetKind?{sceneId:scene().id,kind:assetKind}:{})});activeJob=result.jobId;project.busy=true;setButtons();await refresh();}
function addObject(type,size=70){mutate(()=>{const e={id:uid(),type,x:180,y:300,w:600,h:type==='text'?160:260,opacity:1};if(type==='text')Object.assign(e,{text:size>40?'在这里写下标题':'添加一段正文',size,color:'#504069',weight:size>40?700:400,align:'left',bind:''});else Object.assign(e,{color:'#e1d7f5',radius:20});scene().elements.push(e);selectedId=e.id;propertyTab='object';});}
function addScene(){mutate(()=>{const s=upgradeScene({id:uid(),title:'新场景',body:'在画布中写下你的内容',narration:'',imagePrompt:'',duration:6,silent:true});s.elements=s.elements.filter(e=>!['visual','caption','caption-bg','caption-label'].includes(e.id));project.scenes.splice(selected+1,0,s);selected++;selectedId='title';time=startOf(selected);});}
function duplicateScene(split=false){mutate(()=>{const s=scene(),copy=clone(s);copy.id=uid();copy.sourceId=s.sourceId||s.id;delete copy.poster;
  if(split){const at=time-startOf(selected);if(at<1||at>sceneDuration(s)-1)throw new Error('请将播放头放在场景内部，前后各保留至少1秒');copy.timing.duration=sceneDuration(s)-at;s.timing.duration=at;copy.timing.audioIn+=Math.max(0,at-copy.timing.delay);copy.timing.delay=Math.max(0,copy.timing.delay-at);copy.timing.videoIn+=at;}
  project.scenes.splice(selected+1,0,copy);selected++;time=startOf(selected);});}
function moveScene(delta){if(selected+delta<0||selected+delta>=project.scenes.length)return;mutate(()=>{const target=selected+delta;[project.scenes[selected],project.scenes[target]]=[project.scenes[target],project.scenes[selected]];selected=target;time=startOf(selected);});}
async function copyProject(){await save();stop();adopt(await api('/api/projects/'+project.id+'/copy',{method:'POST',body:'{}'}));undoStack=[];redoStack=[];dirty=false;selected=0;time=0;await refresh();renderAll();toast('已创建独立副本，原项目保留');}
function useAsset(file){const a=allAssets().find(a=>a.file===file);if(!a)return;mutate(()=>{const s=scene();
  if(a.type==='audio'){s.voiceAsset=a.file;s.audio=a.file;s.audioDuration=a.duration;s.voiceEvidence={provider:'import',text:s.narration};s.silent=false;s.timing.audioIn=0;s.timing.delay=0;s.timing.duration=Math.min(120,a.duration);propertyTab='scene';}
  else if(a.type==='video'){s.mainAsset=a.file;s.video=a.file;s.videoDuration=a.duration;s.timing.videoIn=0;if(!s.elements.some(e=>e.id==='visual'))s.elements.unshift({id:'visual',type:'image',source:'scene',x:0,y:0,w:1920,h:1080,opacity:1,radius:0});const visual=s.elements.find(e=>e.id==='visual');visual.radius=0;visual.opacity=1;selectedId=visual.id;propertyTab='scene';}
  else if(element()?.type==='image'&&element().source==='scene'){s.mainAsset=a.file;s.image=a.file;delete s.video;delete s.videoDuration;}
  else{const e={id:uid(),type:'image',source:a.file,x:800,y:200,w:900,h:540,radius:20,opacity:1,fit:'cover'};s.elements.push(e);selectedId=e.id;propertyTab='object';}
  });document.querySelector('.workspace').classList.remove('library-open');}
const actions={
  'production':()=>production.open(selected),
  'add-scene':addScene,'copy-project':copyProject,'text':()=>addObject('text'),'body-text':()=>addObject('text',34),'shape':()=>addObject('shape'),
  'upload':()=>{if(project&&!project.busy){musicImport=false;$('fileInput').accept='image/png,image/jpeg,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/mp4';$('fileInput').click();}},'voice':()=>generate('generate','voice'),'image':()=>generate('generate','image'),'generate':()=>generate('generate'),'config':()=>openConfig(),
  'scene-properties':()=>{propertyTab='scene';renderProperties();document.querySelector('.workspace').classList.add('inspector-open');},
  'fit-audio':()=>mutate(()=>{const t=scene().timing;t.duration=clamp(Math.ceil(((scene().audioDuration||0)-t.audioIn+t.delay+.35)*30)/30,1,120);}),
  'forward':()=>mutate(()=>{const e=element(),items=scene().elements,i=items.indexOf(e);if(i<items.length-1)[items[i],items[i+1]]=[items[i+1],items[i]];}),
  'backward':()=>mutate(()=>{const e=element(),items=scene().elements,i=items.indexOf(e);if(i>0)[items[i],items[i-1]]=[items[i-1],items[i]];}),
  'delete-object':()=>mutate(()=>{scene().elements=scene().elements.filter(e=>e.id!==selectedId);selectedId=null;}),
  'duplicate-object':()=>{if(scene().video&&element()?.type==='image'&&element().source==='scene'){toast('每个场景支持一个视频对象；可复制整个场景');return;}mutate(()=>{const e=clone(element());e.id=uid();e.x=Math.min(1920-e.w,e.x+30);e.y=Math.min(1080-e.h,e.y+30);if(e.bind){e.text=scene()[e.bind];e.bind='';}scene().elements.push(e);selectedId=e.id;});},
};
document.addEventListener('click',safe(async e=>{
  const help=e.target.closest('[data-research-topic]');if(help){await research.open(help.dataset.researchTopic==='models'?'models':'capabilities/'+help.dataset.researchTopic);return;}
  const action=e.target.closest('[data-action]');if(action){await actions[action.dataset.action]?.();return;}
  const p=e.target.closest('[data-panel]');if(p){if(panel!==p.dataset.panel){document.querySelector('.library').scrollTop=0;$('libraryContent').scrollTop=0;}panel=p.dataset.panel;document.querySelector('.workspace').classList.add('library-open');renderLibrary();setButtons();return;}
  const s=e.target.closest('[data-select-scene]');if(s){chooseScene(Number(s.dataset.selectScene));return;}
  const a=e.target.closest('[data-asset]');if(a){useAsset(a.dataset.asset);return;}
  const layer=e.target.closest('[data-layer]');if(layer){selectedId=layer.dataset.layer;propertyTab='object';renderAll();return;}
  const hide=e.target.closest('[data-hide]');if(hide){mutate(()=>{const el=scene().elements.find(el=>el.id===hide.dataset.hide);el.hidden=!el.hidden;});return;}
  const lock=e.target.closest('[data-lock]');if(lock){mutate(()=>{const el=scene().elements.find(el=>el.id===lock.dataset.lock);el.locked=!el.locked;});return;}
  const tick=e.target.closest('[data-seek]');if(tick){seek(Number(tick.dataset.seek));return;}
  const exp=e.target.closest('[data-play-export]');if(exp){stop();const v=$('exportPlayer');v.hidden=false;v.src=media(exp.dataset.playExport);await v.play();return;}
  const close=e.target.closest('[data-close]');if(close)$(close.dataset.close).close();
}));
const updateProperty=safe(e=>{
  const key=e.target.dataset.prop;if(!key||project.busy)return;const input=e.target;
  const signature=String(input.type==='checkbox'?input.checked:input.value);if(input.dataset.lastValue===signature)return;input.dataset.lastValue=signature;
  if(!input.dataset.started){if(!checkpoint())return;input.dataset.started='true';}stop();let value=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value;const s=scene(),el=element();
  if(input.type==='number'&&!Number.isFinite(value))return;
  if(key.startsWith('scene.'))s[key.slice(6)]=value;
  else if(key.startsWith('timing.')){const k=key.slice(7);if(k==='duration')value=clamp(value,1,120);if(['delay','audioIn','videoIn'].includes(k))value=Math.max(0,value);s.timing[k]=value;}
  else if(key==='volume')s.timing.volume=clamp(value/100,0,1);
  else if(el){if(key==='text'){if(el.bind)s[el.bind]=value;else el.text=value;}else if(key==='opacity')el.opacity=clamp(value/100,0,1);else el[key]=key==='weight'?Number(value):value;
    el.x=clamp(el.x,0,1910);el.y=clamp(el.y,0,1070);el.w=clamp(el.w,10,1920-el.x);el.h=clamp(el.h,10,1080-el.y);if(el.size)el.size=clamp(el.size,10,200);
  }changed(false);drawTimeline();renderLibrary();
});
$('properties').addEventListener('input',updateProperty);
$('properties').addEventListener('change',updateProperty);
$('properties').addEventListener('focusout',e=>{if(e.target.dataset.prop)delete e.target.dataset.started;});
$('objects').addEventListener('pointerdown',e=>{
  const hit=e.target.closest('[data-object]');if(!hit||project.busy)return;stop();selectedId=hit.dataset.object;propertyTab='object';const el=element();renderProperties();renderLibrary();
  if(el.locked){drawHandles();return;}checkpoint();const original={x:el.x,y:el.y,w:el.w,h:el.h},x=e.clientX,y=e.clientY,scale=$('stage').clientWidth/1920,resizing=!!e.target.dataset.resize;let moved=false;
  hit.setPointerCapture(e.pointerId);dragging=true;
  const move=ev=>{const dx=(ev.clientX-x)/scale,dy=(ev.clientY-y)/scale;if(Math.abs(dx)+Math.abs(dy)<1)return;moved=true;
    if(resizing){el.w=clamp(original.w+dx,10,1920-el.x);el.h=clamp(original.h+dy,10,1080-el.y);}else{el.x=clamp(original.x+dx,0,1920-el.w);el.y=clamp(original.y+dy,0,1080-el.h);}
    hit.style.left=el.x/19.2+'%';hit.style.top=el.y/10.8+'%';hit.style.width=el.w/19.2+'%';hit.style.height=el.h/10.8+'%';paint();};
  const end=()=>{hit.removeEventListener('pointermove',move);dragging=false;if(moved)changed();else{undoStack.pop();drawHandles();setButtons();}renderProperties();};
  hit.addEventListener('pointermove',move);hit.addEventListener('pointerup',end,{once:true});hit.addEventListener('pointercancel',end,{once:true});
});
$('objects').addEventListener('dblclick',e=>{if(e.target.closest('[data-object]')&&element()?.type==='text'){document.querySelector('.workspace').classList.add('inspector-open');document.querySelector('[data-prop="text"]')?.focus();}});
document.addEventListener('dragstart',e=>{const c=e.target.closest('[data-drag-scene]');if(c&&!project.busy)e.dataTransfer.setData('text/plain',c.dataset.dragScene);});
document.addEventListener('dragover',e=>{if(e.target.closest('[data-drag-scene]'))e.preventDefault();});
document.addEventListener('drop',e=>{const c=e.target.closest('[data-drag-scene]');if(!c)return;e.preventDefault();const source=Number(e.dataTransfer.getData('text/plain')),dest=Number(c.dataset.dragScene);if(!Number.isInteger(source)||source<0||source>=project.scenes.length||source===dest)return;mutate(()=>{const [s]=project.scenes.splice(source,1);project.scenes.splice(dest,0,s);selected=dest;time=startOf(dest);});});
$('clips').addEventListener('pointerdown',e=>{const handle=e.target.closest('[data-trim]');if(!handle||project.busy)return;e.preventDefault();e.stopPropagation();checkpoint();stop();const i=Number(handle.dataset.trim),s=project.scenes[i],x=e.clientX,original=sceneDuration(s);dragging=true;handle.setPointerCapture(e.pointerId);const move=ev=>{s.timing.duration=Math.round(clamp(original+(ev.clientX-x)/px,1,120)*30)/30;handle.parentElement.style.width=s.timing.duration*px+'px';};const end=()=>{handle.removeEventListener('pointermove',move);dragging=false;selected=i;changed();};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end,{once:true});handle.addEventListener('pointercancel',end,{once:true});});
on('undo','click',()=>history(undoStack,redoStack));on('redo','click',()=>history(redoStack,undoStack));on('save','click',async()=>{await save();toast('编辑已保存');});
on('copyProject','click',copyProject);on('insertText','click',()=>addObject('text'));on('insertShape','click',()=>addObject('shape'));on('uploadTop','click',actions.upload);
on('addScene','click',addScene);on('duplicateScene','click',()=>duplicateScene());on('splitScene','click',()=>duplicateScene(true));on('moveLeft','click',()=>moveScene(-1));on('moveRight','click',()=>moveScene(1));
on('removeScene','click',()=>mutate(()=>{project.scenes.splice(selected,1);selected=Math.min(selected,project.scenes.length-1);time=startOf(selected);}));
on('sceneTab','click',()=>{propertyTab='scene';renderProperties();setButtons();});on('objectTab','click',()=>{propertyTab='object';renderProperties();setButtons();});
on('closeLibrary','click',()=>document.querySelector('.workspace').classList.remove('library-open'));on('toggleInspector','click',()=>document.querySelector('.workspace').classList.toggle('inspector-open'));
on('timelineZoom','input',e=>{px=Number(e.target.value);drawTimeline();});on('seek','input',e=>seek(Number(e.target.value)));on('play','click',togglePlay);on('backStart','click',()=>{stop();seek(0);});
on('fileInput','change',async e=>{const file=e.target.files[0];if(!file)return;await save();const type=file.type.split('/')[0];toast('正在导入素材…');const result=await api('/api/projects/'+project.id+'/assets?type='+type+'&name='+encodeURIComponent(file.name),{method:'POST',body:file,headers:{'Content-Type':file.type}});adopt(result.project);panel=musicImport?'music':'assets';if(musicImport&&type==='audio')creator.addMusic(result.asset);renderAll();document.querySelector('.workspace').classList.add('library-open');e.target.value='';toast(musicImport?'音乐已加入时间轴，保存或播放试听':'素材已入库，点击即可加入场景');musicImport=false;});
on('projectSelect','change',async e=>{const id=e.target.value;await save();stop();adopt(state.projects.find(p=>p.id===id));selected=0;time=0;dirty=false;undoStack=[];redoStack=[];activeJob=null;renderAll();});
on('exportBtn','click',()=>generate('export'));on('exportsBtn','click',()=>{stop();renderExports();$('exportsDialog').showModal();});$('exportsDialog').addEventListener('close',()=>$('exportPlayer').pause());
for(const id of ['newProject','emptyCreate'])on(id,'click',()=>$('newDialog').showModal());
on('newForm','submit',async e=>{e.preventDefault();await save();e.submitter.disabled=true;try{const result=await api('/api/projects',{method:'POST',body:JSON.stringify({brief:$('brief').value,full:true})});stop();project={id:result.projectId,scenes:[],exports:[]};dirty=false;selected=0;time=0;undoStack=[];redoStack=[];activeJob=result.jobId;$('newDialog').close();await refresh();}finally{e.submitter.disabled=false;}});
function openConfig(){const labels={text:'文案模型',image:'图片模型',voice:'配音模型',video:'视频生成模型',lipsync:'口型模型',music:'音乐模型'},options={text:[['codex','本机 Codex'],['openai','OpenAI 兼容 Chat']],image:[['import','Codex 生成后导入'],['openai','OpenAI 兼容 Images'],['minimax','MiniMax 图片']],voice:[['minimax','MiniMax 配音'],['openai','OpenAI 兼容 Speech']],video:[['disabled','待配置（暂不调用）'],['studio','Studio 异步适配器 v1']],lipsync:[['disabled','待配置（暂不调用）'],['studio','Studio 异步适配器 v1']],music:[['disabled','待配置（暂不调用）'],['studio','Studio 异步适配器 v1']]};
  $('configFields').innerHTML=Object.keys(labels).map(role=>{const c=state.config[role]||{provider:'disabled'},extension=['video','lipsync','music'].includes(role);return `<div class="config-role ${extension?'extension':''}" data-role="${role}"><h3>${labels[role]}${extension?'<small>独立接入 · 实际模型待配置验证</small>':''}</h3>${extension?'<p>服务须实现 Studio 任务协议；原厂接口需增加适配器。支持本机 HTTP 或远程 HTTPS。</p>':''}<label>接入协议<select name="provider">${options[role].map(([v,l])=>`<option value="${v}" ${c.provider===v?'selected':''}>${l}</option>`).join('')}</select></label><label>接口地址<input name="baseUrl" value="${esc(c.baseUrl||'')}" placeholder="${extension?'https://your-adapter/studio/v1':'https://your-service/v1'}"></label><label>模型名称<input name="model" value="${esc(c.model||'')}"></label><label>API 密钥<input name="apiKey" type="password" autocomplete="off" placeholder="${c.keyConfigured?'已配置，留空保留':'本机 Codex／导入无需密钥'}"></label>${role==='voice'?`<label>音色 ID<input name="voice" value="${esc(c.voice||'')}"></label>`:''}</div>`;}).join('');$('configDialog').showModal();}
on('configBtn','click',openConfig);on('configForm','submit',async e=>{e.preventDefault();const values={};for(const el of document.querySelectorAll('.config-role')){values[el.dataset.role]={};for(const input of el.querySelectorAll('input,select'))values[el.dataset.role][input.name]=input.value;}await api('/api/config',{method:'PUT',body:JSON.stringify(values)});$('configDialog').close();await refresh();renderLibrary();toast('模型连接已保存');});
document.addEventListener('keydown',safe(async e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();await save();return;}
  if(e.target.matches('input,textarea,select')||document.querySelector('dialog[open]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey?redoStack:undoStack,e.shiftKey?undoStack:redoStack);return;}
  if(e.code==='Space'){e.preventDefault();togglePlay();return;}
  if(element()&&!element().locked&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();mutate(()=>{const el=element(),n=e.shiftKey?10:2;el.x=clamp(el.x+(e.key==='ArrowLeft'?-n:e.key==='ArrowRight'?n:0),0,1920-el.w);el.y=clamp(el.y+(e.key==='ArrowUp'?-n:e.key==='ArrowDown'?n:0),0,1080-el.h);});}
  if(element()&&!element().locked&&(e.key==='Delete'||e.key==='Backspace')){e.preventDefault();actions['delete-object']();}
}));
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
const creator=creatorUI({project:()=>project,scene,index:()=>selected,config:()=>state.config,assets:allAssets,safe,api,toast,stop,mutate,checkpoint,changed,timeline:drawTimeline,render:()=>renderLibrary(true),save,refresh,adopt:p=>{adopt(p);renderAll();},tasks:()=>production.open(selected,'tasks'),action:async action=>{
  if(action==='tasks')return production.open(selected,'tasks');if(action==='overview')return production.open(selected,'shots');
  if(action==='music'){panel='music';return renderLibrary();}
  if(action==='import-music'){musicImport=true;$('fileInput').accept='audio/mpeg,audio/wav,audio/x-wav,audio/mp4';return $('fileInput').click();}
  return actions[action]?.();
}});
const production=productionUI({project:()=>project,config:()=>state.config,api,safe,toast,stop,mutate,save,refresh,adopt:p=>{adopt(p);renderAll();},track:id=>{activeJob=id;project.busy=true;setButtons();},openConfig});
on('productionBtn','click',()=>production.open(selected));
const research=researchUI({api,safe,toast,stop,state:()=>state,jump:async(action,catalog,close)=>{
  const [kind,value]=action.split(':');
  if(kind==='example'||kind==='copy'){
    await save();await refresh();const id=catalog.examples[value]?.projectId,next=state.projects.find(p=>p.id===id);if(!next)throw new Error('此示例项目未载入当前工作台；可先在资料中查看或下载项目文件');
    const target=kind==='copy'?await api('/api/projects/'+id+'/copy',{method:'POST',body:'{}'}):next;
    stop();adopt(target);selected=0;selectedId='title';time=0;dirty=false;undoStack=[];redoStack=[];activeJob=null;panel=value==='music'?'music':'scenes';close();await refresh();renderAll();document.querySelector('.workspace').classList.add('library-open');toast(kind==='copy'?'已创建可编辑副本，原示例保留':'已打开实际示例，可从创建副本开始修改');return;
  }
  if(kind==='panel'){if(!project)throw new Error('请先打开或创建一个视频项目');close();panel=value;renderLibrary(true);setButtons();document.querySelector('.workspace').classList.add('library-open');return;}
  close();if(kind==='config'){openConfig();const el=document.querySelector('.config-role[data-role="'+value+'"]');el?.scrollIntoView({block:'center'});el?.querySelector('select')?.focus();}
  else if(kind==='tasks')production.open(selected,'tasks');else if(kind==='versions'){renderExports();$('exportsDialog').showModal();}else if(kind==='new')$('newDialog').showModal();
}});
on('researchBtn','click',()=>research.open('overview'));on('panelHelp','click',()=>research.open(panelTopics[panel]==='models'?'models':'capabilities/'+(panelTopics[panel]||'timeline')));
document.fonts.ready.then(paint);await refresh();renderAll();await research.syncHash();setInterval(()=>refresh().catch(()=>{}),2200);
