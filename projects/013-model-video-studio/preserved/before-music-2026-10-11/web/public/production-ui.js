const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states={prepared:'已准备',submitting:'提交中',queued:'排队中',running:'生成中',succeeded:'待审核',imported:'手工导入',applied:'已应用',failed:'失败',interrupted:'已中断'};
const modes={illustration:'图文镜头',video:'动态视频',lipsync:'人物口型'};
const emptyShot=()=>({mode:'illustration',goal:'',location:'',action:'',camera:'',mood:'',prompt:'',negativePrompt:'',characterIds:[],speakerId:''});
export function productionUI(hooks) {
  const dialog=document.getElementById('productionDialog');let tab='shots',index=0,signature='';
  const current=()=>hooks.project(),scene=()=>current().scenes[index];
  const assets=()=>{const all=[...(current().assets||[])];for(const s of current().scenes)if(s.image&&!all.some(a=>a.file===s.image))all.push({file:s.image,name:s.title,type:'image'});return all;};
  const options=(items,value,empty='请选择')=>`<option value="">${empty}</option>`+items.map(([id,name])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(name)}</option>`).join('');
  const input=(label,path,value,rows=0,placeholder='')=>`<label>${label}${rows?`<textarea data-production-field="${path}" rows="${rows}" placeholder="${placeholder}">${esc(value)}</textarea>`:`<input data-production-field="${path}" value="${esc(value)}" placeholder="${placeholder}">`}</label>`;
  function render() {
    if(!dialog.open)return;const p=current();if(!p?.scenes.length)return;
    signature=JSON.stringify([p.id,p.busy,p.generationTasks]);
    index=Math.min(index,p.scenes.length-1);const s=scene(),shot={...emptyShot(),...s.shot},cfg=hooks.config();
    dialog.innerHTML=`<div class="production-header"><div><small>STORY → SHOTS → VIDEO</small><h2>剧情与镜头</h2><p>先安排故事与角色，再逐镜头生成、审核和剪辑。</p></div><button data-production-action="close" aria-label="关闭剧情工作区">×</button></div><div class="production-tabs">${[['shots','分镜规划'],['characters','角色设定'],['tasks','生成任务']].map(([id,name])=>`<button data-production-tab="${id}" class="${tab===id?'active':''}">${name}${id==='tasks'?` <small>${(p.generationTasks||[]).length}</small>`:''}</button>`).join('')}<span class="model-status">视频 ${cfg.video?.provider==='studio'?'已配置':'待配置'} · 口型 ${cfg.lipsync?.provider==='studio'?'已配置':'待配置'}</span></div><div id="productionBody"></div><div class="production-footer"><span id="productionSaveState">修改后点击保存，角色与分镜随项目保存。</span><button data-production-action="save" class="primary">保存剧情与分镜</button></div>`;
    const body=dialog.querySelector('#productionBody');
    if(tab==='shots')body.innerHTML=`<div class="production-layout"><aside class="shot-list"><div class="shot-list-heading">${p.scenes.length} 个镜头 <span>${p.scenes.reduce((n,s)=>n+(s.timing?.duration||s.duration),0).toFixed(1)}s</span></div>${p.scenes.map((s,i)=>`<button data-production-scene="${i}" class="${i===index?'active':''}"><span class="shot-index">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(s.title)}</strong><small>${modes[s.shot?.mode||'illustration']} · ${(s.timing?.duration||s.duration).toFixed(1)}s</small></div></button>`).join('')}<p>镜头顺序与主时间轴一致。可回编辑器添加、复制和调整时长。</p></aside><section class="shot-editor"><details class="story-summary"><summary>故事与风格 <small>${esc(p.story?.logline?.slice(0,38)||'为所有镜头建立共同方向')}</small></summary>${input('故事梗概','story.logline',p.story?.logline,3,'这支视频讲什么，如何开始与结束？')}${input('视觉风格','story.style',p.story?.style,2,'统一画风、光线与色调')}${input('连续性备注','story.notes',p.story?.notes,2,'服装、道具和场景需要保持什么？')}</details><div class="shot-title"><div><small>SHOT ${String(index+1).padStart(2,'0')}</small><h3>${esc(s.title)}</h3></div><label>制作方式<select data-production-field="shot.mode">${Object.entries(modes).map(([id,name])=>`<option value="${id}" ${shot.mode===id?'selected':''}>${name}</option>`).join('')}</select></label></div><div class="production-grid">${input('叙事目的','shot.goal',shot.goal,2,'这个镜头推动哪一步？')}${input('地点与环境','shot.location',shot.location,2,'镜头发生在哪里？')}${input('人物动作','shot.action',shot.action,2,'谁在做什么？')}${input('景别与运镜','shot.camera',shot.camera,2,'例如：中景，缓慢推进')}${input('情绪与表情','shot.mood',shot.mood,2,'例如：自然、自信，结尾微笑')}<div><label>出场角色</label><div class="cast-pills">${(p.characters||[]).map(c=>`<label><input type="checkbox" data-production-cast="${c.id}" ${shot.characterIds.includes(c.id)?'checked':''}>${esc(c.name)}</label>`).join('')||'<p class="muted">先在「角色设定」中添加人物。</p>'}</div><label>配音角色<select data-production-field="shot.speakerId">${options((p.characters||[]).filter(c=>shot.characterIds.includes(c.id)).map(c=>[c.id,c.name]),shot.speakerId,'旁白／默认音色')}</select></label></div></div>${input('本镜头台词／旁白','narration',s.narration,3)}<p class="muted">每镜头使用一条配音。修改台词或切换角色音色后，回到「配音」重新生成。多人对话请拆成多个镜头。</p>${input('生成提示词','shot.prompt',shot.prompt,3,'可填写完整描述；留空时合并上方设定与原配图提示词。')}${input('避免出现的内容','shot.negativePrompt',shot.negativePrompt,2,'例如：画面文字、角色服装变化')}<div class="generation-callout"><div><strong>${shot.mode==='illustration'?'图文流程可继续使用':modes[shot.mode]+' · '+(cfg[shot.mode]?.provider==='studio'?'适配器已配置，实际效果待验证':'等待模型接入')}</strong><p>${shot.mode==='illustration'?'现有图片、配音、画布编辑和导出照常可用。':'可以先准备任务与参考素材，之后提交模型或手工导入结果。'}</p></div><button class="primary" data-production-action="prepare" ${shot.mode==='illustration'?'disabled':''}>准备生成任务</button></div></section></div>`;
    if(tab==='characters')body.innerHTML=`<div class="characters-page"><div class="production-intro"><div><h3>给每个角色一份固定设定</h3><p>参考图、外观和音色随分镜一起传给适配器。跨镜头一致性仍取决于接入模型。</p></div><button class="primary" data-production-action="add-character">＋ 添加角色</button></div><div class="character-grid">${(p.characters||[]).map((c,i)=>`<article class="character-card"><div class="character-heading"><span>${c.reference?`<img src="/media/${p.id}/${esc(c.reference)}" alt="${esc(c.name)}参考图">`:esc(c.name.slice(0,1))}</span><b>角色 ${String(i+1).padStart(2,'0')}</b><button data-production-delete="${c.id}">删除</button></div>${input('角色名','characters.'+i+'.name',c.name)}${input('外观、服装与性格','characters.'+i+'.description',c.description,4,'描述需要在不同镜头中保持的特征')}<label>人物参考图<select data-production-field="characters.${i}.reference">${options(assets().filter(a=>a.type==='image').map(a=>[a.file,a.name]),c.reference,'暂不指定')}</select></label>${input('角色音色 ID（可选）','characters.'+i+'.voice',c.voice,0,'留空使用默认配音音色')}<small>图片先在编辑器「素材」中导入。这里的设定尚未生成人物视频。</small></article>`).join('')||'<div class="production-empty"><span>♙</span><h3>还没有角色</h3><p>添加人物设定，再在分镜中选择出场角色。</p></div>'}</div></div>`;
    if(tab==='tasks')body.innerHTML=`<div class="tasks-page"><div class="production-intro"><div><h3>从请求到成片，保留每次结果</h3><p>准备任务不会调用模型。先审核视频，再应用到镜头；原素材仍然保留。</p></div><button data-production-action="config">配置生成模型 ↗</button></div>${(p.generationTasks||[]).toReversed().map(t=>{const s=p.scenes.find(s=>s.id===t.sceneId),videos=assets().filter(a=>a.type==='video');return `<article class="task-card"><div class="task-heading"><div><small>${t.kind==='video'?'动态视频':'人物口型'} · ${new Date(t.createdAt).toLocaleString('zh-CN')}</small><h3>${esc(s?.title||'已删除镜头')}</h3></div><span class="task-state ${t.state}">${states[t.state]||t.state}</span></div><p>${esc(t.request.prompt.slice(0,200))}</p><div class="task-meta">${t.request.duration.toFixed(1)}s · ${esc(t.model||'尚未提交模型')} · ${t.source==='manual'?'来源：手工导入':'独立模型任务'}</div>${t.stale?'<p class="task-error">镜头或角色已修改，请重新准备任务。原请求保留供核对。</p>':''}${t.blockers?.length?`<p class="muted">${esc(t.blockers.join('；'))}</p>`:''}${t.error?`<p class="task-error">${esc(t.error)}</p>`:''}${t.assetFile?`<video controls preload="metadata" src="/media/${p.id}/${esc(t.assetFile)}"></video>`:''}<div class="task-actions"><button data-production-download="${t.id}">下载请求 JSON</button>${t.state==='prepared'?`<button data-production-submit="${t.id}" ${cfg[t.kind]?.provider!=='studio'||t.stale||t.blockers?.length?'disabled':''}>${cfg[t.kind]?.provider==='studio'?'提交模型生成':'模型待配置'}</button>`:''}${['succeeded','imported'].includes(t.state)?`<button class="primary" data-production-apply="${t.id}" ${t.stale?'disabled':''}>应用到镜头</button>`:''}${!['applied','submitting','running','queued'].includes(t.state)?`<div class="attach-result"><select aria-label="为任务选择已导入视频" data-production-result="${t.id}">${options(videos.map(a=>[a.file,a.name]),'','选择已导入的视频')}</select><button data-production-attach="${t.id}" ${videos.length?'':'disabled'}>关联外部结果</button></div>`:''}</div></article>`;}).join('')||'<div class="production-empty"><span>▷</span><h3>镜头准备好后，创建第一个任务</h3><p>在分镜里选择「动态视频」或「人物口型」，填写描述后准备任务。</p></div>'}</div>`;
    if(p.busy)dialog.querySelectorAll('input,textarea,select,button:not([data-production-tab]):not([data-production-action="close"])').forEach(el=>el.disabled=true);
    const list=dialog.querySelector('.shot-list'),active=list?.querySelector('button.active');
    if(list&&active&&list.scrollWidth>list.clientWidth)list.scrollLeft=active.offsetLeft-list.offsetLeft;
  }
  function modify(fn) {hooks.mutate(fn);const el=dialog.querySelector('#productionSaveState');if(el)el.textContent='● 剧情与分镜有未保存修改';}
  async function save(){await hooks.save();render();}
  async function request(taskId,action,extra={}) {
    await hooks.save();const p=current();const result=await hooks.api('/api/projects/'+p.id+'/generation'+(taskId?'/'+taskId+'/'+action:''),{method:'POST',body:JSON.stringify({revision:p.revision,...extra})});
    if(result.project)hooks.adopt(result.project);if(result.jobId)hooks.track(result.jobId);await hooks.refresh();render();return result;
  }
  const updateField=hooks.safe(async e=>{
    const path=e.target.dataset.productionField,castId=e.target.dataset.productionCast;
    if(!path&&!castId)return;
    const signature=String(e.target.type==='checkbox'?e.target.checked:e.target.value);
    if(e.target.dataset.lastValue===signature)return;e.target.dataset.lastValue=signature;
    if(path)modify(()=>{
      const p=current(),s=scene();s.shot||=emptyShot();p.story||={};p.characters||=[];
      const parts=path.split('.'),root=parts[0]==='shot'?s:parts[0]==='narration'?s:p;let target=root;
      for(const part of parts.slice(0,-1))target=target[part];target[parts.at(-1)]=e.target.value;
      // Voice/text mismatches must be regenerated, even if only the speaker changed.
      if(path==='shot.speakerId'||/^characters\.\d+\.voice$/.test(path)){
        const affected=path==='shot.speakerId'?[s]:p.scenes.filter(s=>s.shot?.speakerId===p.characters[Number(parts[1])].id);
        for(const s of affected)if(s.voiceEvidence)s.voiceEvidence.text='';
      }
    });
    if(castId)modify(()=>{const s=scene();s.shot||=emptyShot();const ids=new Set(s.shot.characterIds);if(e.target.checked)ids.add(castId);else ids.delete(castId);s.shot.characterIds=[...ids];if(!ids.has(s.shot.speakerId))s.shot.speakerId='';});
    if(castId||path==='shot.mode'||path?.endsWith('.reference'))render();
  });
  dialog.addEventListener('input',updateField);dialog.addEventListener('change',updateField);
  dialog.addEventListener('click',hooks.safe(async e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;
    if(d.productionTab){tab=d.productionTab;render();dialog.scrollTop=0;return;}
    if(d.productionScene!==undefined){index=Number(d.productionScene);render();dialog.scrollTop=0;return;}
    if(d.productionDelete){modify(()=>{const p=current();p.characters=p.characters.filter(c=>c.id!==d.productionDelete);for(const s of p.scenes)if(s.shot){s.shot.characterIds=s.shot.characterIds.filter(id=>id!==d.productionDelete);if(s.shot.speakerId===d.productionDelete)s.shot.speakerId='';}});render();return;}
    if(d.productionDownload){const t=current().generationTasks.find(t=>t.id===d.productionDownload);const blob=new Blob([JSON.stringify({requestId:t.id,...t.request},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='generation-'+t.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
    if(d.productionSubmit){await request(d.productionSubmit,'submit');hooks.toast('已提交模型，任务完成后审核结果');return;}
    if(d.productionAttach){const value=dialog.querySelector(`[data-production-result="${d.productionAttach}"]`).value;if(!value)throw new Error('先在素材库导入视频，再选择对应结果');await request(d.productionAttach,'attach',{assetFile:value});hooks.toast('已关联外部结果，来源标为手工导入');return;}
    if(d.productionApply){await request(d.productionApply,'apply');hooks.toast('结果已应用到镜头，可回编辑器预览与导出');return;}
    switch(d.productionAction){
      case 'close':dialog.close();break;
      case 'save':await save();hooks.toast('剧情与分镜已保存');break;
      case 'config':dialog.close();hooks.openConfig();break;
      case 'add-character':if((current().characters||[]).length>=12)throw new Error('最多12位角色');modify(()=>{(current().characters||=[]).push({id:crypto.randomUUID(),name:'新角色',description:'',voice:'',reference:''});});render();break;
      case 'prepare':{const s=scene();await request(null,null,{sceneId:s.id,kind:s.shot.mode});tab='tasks';render();dialog.scrollTop=0;hooks.toast('任务已准备；尚未调用视频或口型模型');break;}
    }
  }));
  dialog.addEventListener('close',()=>dialog.querySelectorAll('video').forEach(v=>v.pause()));
  return {open(selected=0){index=selected;hooks.stop();dialog.showModal();render();dialog.scrollTop=0;},refresh(){const p=current();if(dialog.open&&signature!==JSON.stringify([p?.id,p?.busy,p?.generationTasks])&&!dialog.querySelector('input:focus,textarea:focus,select:focus'))render();}};
}
