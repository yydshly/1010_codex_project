const $ = id => document.getElementById(id);
let state, project, selected = 0, dirty = false, mode = 'scene', activeJob, shownJobState, playingExport, renderKey;
const htmlCache = new WeakMap();
function syncHTML(element, html) { if (htmlCache.get(element) !== html) { element.innerHTML = html; htmlCache.set(element,html); } }
const labels = { text:'文案模型', image:'图片模型', voice:'配音模型' }, icons = { text:'✧',image:'▧',voice:'♫' };
const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const media = (file,download=false) => '/media/'+project.id+'/'+file+(download?'?download=1':'');
const duration = seconds => { const n = Math.round(seconds || 0); return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; };
function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').hidden=true,5000); }
async function api(url,options={}) {
  const res = await fetch(url,{ ...options,headers:{ ...(options.body && !(options.body instanceof File) ? {'Content-Type':'application/json'} : {}),...options.headers } });
  const data = await res.json(); if (!res.ok) throw new Error(data.error || '操作失败'); return data;
}
function handle(action) { return async event => { try { await action(event); } catch(e) { toast(e.message); } }; }
async function refresh(initial=false) {
  state = await api('/api/state');
  syncHTML($('projectSelect'), state.projects.length ? state.projects.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('') : '<option value="">我的视频</option>');
  if (!dirty) project = state.projects.find(p=>p.id===project?.id) || state.projects[0];
  if (project) $('projectSelect').value = project.id;
  syncHTML($('modelCards'),Object.keys(labels).map(role => {
    const c = state.config[role], ready = c.provider==='codex' ? state.runtime.codex.ready : c.provider==='import' ? false : c.keyConfigured || c.baseUrl?.includes('localhost') || c.baseUrl?.includes('127.0.0.1');
    return `<div class="model-card"><div class="model-card-top"><span class="model-icon">${icons[role]}</span><strong>${labels[role]}</strong><i class="status-dot ${ready?'':'waiting'}"></i></div><div class="model-name">${esc(c.model || c.provider)}${c.provider==='import'?' · 生成后导入':''}</div></div>`;
  }).join(''));
  const job = activeJob ? state.jobs.find(j => j.id===activeJob) : state.jobs.findLast(j => j.projectId===project?.id && j.state==='running');
  $('jobPanel').hidden = !job || job.state==='completed';
  $('jobPanel').classList.toggle('failed',job?.state==='failed');
  if (job) {
    $('jobMessage').textContent = job.message;
    $('jobDetails').textContent = job.state==='failed' ? '素材与已完成步骤已保留，可修正配置后重试。' : (job.events?.length || 0)+' 个步骤已记录 · 完成后自动更新预览';
    if (job.state!=='running' && shownJobState!==job.id+job.state) { toast(job.state==='completed'?'生成已完成':job.message); shownJobState=job.id+job.state; }
  }
  const nextKey = JSON.stringify(project);
  if (initial || (!dirty && nextKey !== renderKey)) { renderKey = nextKey; render(); } else setBusy();
}
function setBusy() {
  const busy = !!project?.busy, scene = project?.scenes[selected];
  for (const id of ['exportBtn','generateAll','saveScene','imageFile','regenerateImage','regenerateVoice','moveLeft','moveRight','deleteScene']) $(id).disabled = busy || !scene;
  $('moveLeft').disabled ||= selected===0; $('moveRight').disabled ||= selected===(project?.scenes.length||0)-1;
  $('deleteScene').disabled ||= project?.scenes.length===1;
  $('listenBtn').disabled = !scene?.audio;
  $('regenerateImage').disabled ||= state?.config.image.provider==='import';
  $('exportBtn').disabled ||= !project?.scenes.every(s=>s.image&&s.audio&&s.voiceEvidence?.text===s.narration);
  for (const id of ['sceneTitle','sceneBody','narration','imagePrompt']) $(id).disabled=busy||!scene;
}
function render() {
  selected = Math.max(0,Math.min(selected,(project?.scenes.length||1)-1));
  const scenes = project?.scenes || [], scene = scenes[selected];
  $('projectTitle').textContent = project?.title || '把想法，变成一支视频';
  $('projectSummary').textContent = scenes.length ? `中文画面＋中文配音 · ${scenes.length} 个场景 · ${project.textEvidence?.provider==='codex'?'Codex 初稿':'AI 初稿'}${project.editedAt?' · 已人工编辑':''}` : '连接你的模型，生成分镜、图片和配音，然后编辑与导出。';
  $('saveState').textContent = dirty ? '有未保存修改' : '✓ 已保存在本机';
  $('sceneCount').textContent = scenes.length; $('timelineCount').textContent = scenes.length+' 个场景';
  $('totalDuration').textContent = scenes.some(s=>s.audio) ? '总时长 '+duration(scenes.reduce((n,s)=>n+s.duration,0)) : '时长待配音生成';
  $('previewMeta').textContent = scene ? `场景 ${String(selected+1).padStart(2,'0')} / ${String(scenes.length).padStart(2,'0')}` : '等待分镜';
  $('timeline').innerHTML = scenes.map((s,i)=>`<button class="scene-card ${i===selected?'selected':''}" data-scene="${i}" aria-label="选择场景${i+1} ${esc(s.title)}"><div class="scene-thumbnail">${s.image?`<img src="${media(s.image)}" alt="${esc(s.title)}插画">`:'✧'}<span>${String(i+1).padStart(2,'0')}</span></div><strong>${esc(s.title)}</strong><small>${s.audio?duration(s.duration):'等待配音'}</small></button>`).join('');
  $('audioTrack').innerHTML = scenes.map(s=>`<i class="${s.audio?'':'waiting'}" style="flex:${s.duration||12}" title="${esc(s.title)}"></i>`).join('');
  $('inspectorIndex').textContent = scene ? String(selected+1).padStart(2,'0')+' / '+String(scenes.length).padStart(2,'0') : '—';
  for (const [id,key] of [['sceneTitle','title'],['sceneBody','body'],['narration','narration'],['imagePrompt','imagePrompt']]) $(id).value=scene?.[key] || '';
  $('assetState').textContent = scene ? `${scene.image?'✓ 图片就绪':'○ 等待图片'} · ${scene.audio?(scene.voiceEvidence?.text===scene.narration?'✓ 配音就绪':'○ 口播已改，需重新配音'):'○ 等待配音'}` : '选择场景后编辑内容';
  const exports = project?.exports || [];
  $('exports').innerHTML = exports.length ? exports.toReversed().map((e,i)=>`<div class="export-row"><span class="export-icon">▻</span><div class="export-info"><strong>${esc(e.label || (!project.editedAt || e.at<project.editedAt?'AI 初稿':'修改后的成片'))} · 版本 ${e.revision}</strong><small>1920×1080 · H.264 / AAC · ${duration(e.duration)} · ${(e.bytes/1048576).toFixed(1)} MB</small></div><span class="export-badge">${i===0?'最新导出':'历史版本'}</span><button class="button light" data-play="${esc(e.file)}">▷ 播放</button><a class="button light" href="${media(e.file,true)}">↓ MP4</a></div>`).join('') : '<div class="empty-export">完成素材生成后，这里会出现可播放、可下载的 MP4。</div>';
  $('draftLink').hidden = !project?.textEvidence;
  if(project) { $('draftLink').href=media('ai-draft.json'); $('draftLink').target='_blank'; }
  drawPreview(); setBusy();
}
function drawPreview(force=false) {
  $('sceneView').classList.toggle('selected',mode==='scene'); $('movieView').classList.toggle('selected',mode==='movie');
  const scene = project?.scenes[selected]; if (!scene) return;
  if (mode==='movie') {
    const latest = project.exports.at(-1), file = playingExport || latest?.file;
    if (!file) { mode='scene'; toast('还没有成片，请先生成配音与导出'); return drawPreview(); }
    const current = $('preview').querySelector('video');
    if (!force && current?.dataset.file===file) return;
    $('preview').innerHTML=`<video controls playsinline preload="metadata" src="${media(file)}" data-file="${esc(file)}" poster="${scene.poster?media(scene.poster):media(scene.image)}" aria-label="完整介绍视频"></video>`;
    $('previewStatus').textContent='实际导出的 MP4 · 完整成片'; return;
  }
  $('previewStatus').textContent = scene.image ? '素材就绪 · 可编辑场景' : 'AI 分镜就绪 · 等待导入图片';
  if (scene.poster && !dirty && project.exports.at(-1)?.revision===project.revision) {
    $('preview').innerHTML=`<img class="poster-image" src="${media(scene.poster)}" alt="${esc(scene.title)}实际导出画面">`; return;
  }
  $('preview').innerHTML=`<div class="scene-frame"><div class="frame-top"><div class="frame-logo"><span>映</span> 映序 STUDIO</div><span>把想法，变成一支视频</span></div><div class="frame-content"><div class="frame-copy"><span class="frame-tag">创作指南</span><h2>${esc(scene.title)}</h2><p>${esc(scene.body)}</p><small>独立模型 · 自由创作</small></div>${scene.image?`<img class="frame-art" src="${media(scene.image)}" alt="${esc(scene.title)}">`:'<div class="frame-art waiting">＋ 为场景导入图片</div>'}</div><div class="frame-caption">${esc(scene.narration)}</div><div class="frame-foot"><div class="frame-progress">${project.scenes.map((_,i)=>`<i class="${i<=selected?'done':''}"></i>`).join('')}</div><span>${String(selected+1).padStart(2,'0')} / ${String(project.scenes.length).padStart(2,'0')}</span></div></div>`;
}
function readFields() {
  if(!project?.scenes[selected]) return;
  Object.assign(project.scenes[selected],{title:$('sceneTitle').value,body:$('sceneBody').value,narration:$('narration').value,imagePrompt:$('imagePrompt').value});
}
async function save() {
  if(!project) return;
  readFields();
  const result=await api('/api/projects/'+project.id,{method:'PUT',body:JSON.stringify({title:project.title,revision:project.revision,scenes:project.scenes})});
  dirty=false;project=result;render();
}
async function start(kind,sceneId,assetKind) {
  if(dirty) await save();
  const result=await api('/api/projects/'+project.id+'/'+kind,{method:'POST',body:JSON.stringify({sceneId,kind:assetKind})});
  activeJob=result.jobId;shownJobState='';project.busy=true;await refresh();
}
function openConfig() {
  const options={text:[['codex','本机 Codex'],['openai','OpenAI 兼容 Chat']],image:[['import','Codex 生成后导入'],['openai','OpenAI 兼容 Images'],['minimax','MiniMax 图片 API']],voice:[['minimax','MiniMax 配音 API'],['openai','OpenAI 兼容 Speech']]};
  $('configFields').innerHTML=Object.keys(labels).map(role=>{const c=state.config[role];return `<div class="config-role" data-role="${role}"><h3>${icons[role]} ${labels[role]}</h3><label>接入协议<select name="provider">${options[role].map(([value,label])=>`<option value="${value}" ${c.provider===value?'selected':''}>${label}</option>`).join('')}</select></label><label>接口地址<input name="baseUrl" value="${esc(c.baseUrl||'')}" placeholder="https://your-service/v1"></label><label>模型名称<input name="model" value="${esc(c.model||'')}" placeholder="你的模型名" ${role==='text'?'list="codexModels"':''}></label><label>API 密钥<input name="apiKey" type="password" autocomplete="off" placeholder="${c.keyConfigured?'已配置，留空保留':'本机 Codex／导入无需密钥'}"></label>${role==='voice'?`<label>音色 ID<input name="voice" value="${esc(c.voice||'')}" placeholder="你的音色 ID"></label>`:''}<p>${role==='text'?'Codex 复用官方 CLI 登录，可从模型目录选择。':role==='image'?'聊天图片工具生成后导入；使用图片 API 可在网页中自动生成。':'按当前场景口播生成；每个场景可独立重新配音。'}</p></div>`}).join('')+`<datalist id="codexModels">${(state.runtime.codex.models||[]).map(m=>`<option value="${esc(m)}">`).join('')}</datalist>`;
  $('configDialog').showModal();
}
for(const id of ['newProject','emptyCreate']) $(id)?.addEventListener('click',()=>$('newDialog').showModal());
$('newForm').addEventListener('submit',handle(async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;try{const result=await api('/api/projects',{method:'POST',body:JSON.stringify({brief:$('brief').value,full:true})});dirty=false;project={id:result.projectId,scenes:[]};selected=0;mode='scene';activeJob=result.jobId;$('newDialog').close();await refresh();}finally{button.disabled=false;}}));
for(const button of document.querySelectorAll('[data-close]')) button.addEventListener('click',()=>$(button.dataset.close).close());
for(const id of ['configureBtn','modelNav','quickConfig']) $(id).addEventListener('click',openConfig);
$('configForm').addEventListener('submit',handle(async e=>{e.preventDefault();const values={};for(const el of document.querySelectorAll('.config-role')){const role=el.dataset.role;values[role]={};for(const input of el.querySelectorAll('input,select')) values[role][input.name]=input.value;}await api('/api/config',{method:'PUT',body:JSON.stringify(values)});$('configDialog').close();toast('模型连接已更新');await refresh();}));
$('sceneForm').addEventListener('submit',handle(async e=>{e.preventDefault();await save();toast('场景修改已保存');}));
for(const id of ['sceneTitle','sceneBody','narration','imagePrompt']) $(id).addEventListener('input',()=>{readFields();dirty=true;$('saveState').textContent='有未保存修改';mode='scene';drawPreview();setBusy();});
$('timeline').addEventListener('click',handle(async e=>{const btn=e.target.closest('[data-scene]');if(!btn)return;if(dirty)await save();selected=Number(btn.dataset.scene);mode='scene';$('sceneAudio').pause();render();}));
$('sceneView').addEventListener('click',()=>{mode='scene';$('sceneAudio').pause();drawPreview(true);});
$('movieView').addEventListener('click',()=>{mode='movie';playingExport=null;$('sceneAudio').pause();drawPreview(true);});
$('exports').addEventListener('click',e=>{const btn=e.target.closest('[data-play]');if(btn){playingExport=btn.dataset.play;mode='movie';$('sceneAudio').pause();drawPreview(true);$('preview').scrollIntoView({behavior:'smooth',block:'center'});$('preview').querySelector('video')?.play().catch(()=>{});}});
$('listenBtn').addEventListener('click',handle(async()=>{const s=project?.scenes[selected];if(!s?.audio)return;const a=$('sceneAudio');if(!a.paused){a.pause();$('listenBtn').textContent='▷ 试听场景配音';return;}a.src=media(s.audio);await a.play();$('listenBtn').textContent='Ⅱ 暂停试听';}));
$('sceneAudio').addEventListener('ended',()=>$('listenBtn').textContent='▷ 试听场景配音');
$('imageFile').addEventListener('change',handle(async e=>{const file=e.target.files[0];if(!file)return;if(dirty)await save();await api('/api/projects/'+project.id+'/image?scene='+project.scenes[selected].id,{method:'POST',body:file,headers:{'Content-Type':file.type}});e.target.value='';await refresh();toast('图片已导入');}));
$('regenerateVoice').addEventListener('click',handle(()=>start('generate',project.scenes[selected].id,'voice')));
$('regenerateImage').addEventListener('click',handle(()=>start('generate',project.scenes[selected].id,'image')));
$('generateAll').addEventListener('click',handle(()=>start('generate')));
$('exportBtn').addEventListener('click',handle(async()=>{mode='movie';playingExport=null;await start('export');}));
async function move(delta){readFields();const next=selected+delta;if(next<0||next>=project.scenes.length)return;[project.scenes[selected],project.scenes[next]]=[project.scenes[next],project.scenes[selected]];selected=next;dirty=true;render();await save();toast('场景顺序已更新');}
$('moveLeft').addEventListener('click',handle(()=>move(-1)));$('moveRight').addEventListener('click',handle(()=>move(1)));
$('deleteScene').addEventListener('click',handle(async()=>{project.scenes.splice(selected,1);selected=Math.min(selected,project.scenes.length-1);dirty=true;render();await save();toast('场景已删除，历史导出仍可回看');}));
$('projectSelect').addEventListener('change',handle(async e=>{if(dirty)await save();project=state.projects.find(p=>p.id===e.target.value);selected=0;mode='scene';activeJob=null;playingExport=null;render();}));
$('resultNav').addEventListener('click',()=>$('exportsPanel').scrollIntoView({behavior:'smooth'}));$('editorNav').addEventListener('click',()=>$('top').scrollIntoView({behavior:'smooth'}));
await refresh(true);setInterval(()=>refresh().catch(()=>{}),1800);
