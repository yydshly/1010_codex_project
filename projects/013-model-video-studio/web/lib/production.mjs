import { randomUUID } from 'node:crypto';
import { hash } from './providers.mjs';

const idOK = value => typeof value === 'string' && /^[\w-]{1,80}$/.test(value);
function text(value, max, label) {
  if (value === undefined) return '';
  if (typeof value !== 'string' || value.length > max) throw new Error(label + '格式或长度不正确');
  return value.trim();
}
export function validateProduction(input, scenes, files) {
  const story = input.story || {}, characters = input.characters || [];
  if (!Array.isArray(characters) || characters.length > 12) throw new Error('最多保存12位角色');
  const ids = new Set();
  const cast = characters.map(c => {
    if (!idOK(c.id) || ids.has(c.id)) throw new Error('角色编号不正确或重复');
    ids.add(c.id);
    const result = { id:c.id, name:text(c.name,40,'角色名'), description:text(c.description,1200,'角色设定'), voice:text(c.voice,120,'音色'), reference:text(c.reference,160,'参考图片') };
    if (!result.name) throw new Error('请填写角色名');
    if (result.reference && files.get(result.reference)?.type !== 'image') throw new Error('角色参考图必须来自项目图片素材');
    return result;
  });
  for (const s of scenes) {
    const shot = s.shot || {};
    if (shot.mode && !['illustration','video','lipsync'].includes(shot.mode)) throw new Error('镜头类型不正确');
    if (!Array.isArray(shot.characterIds || []) || (shot.characterIds || []).some(id => !ids.has(id))) throw new Error('镜头引用了不存在的角色');
    if (shot.speakerId && (!ids.has(shot.speakerId) || !(shot.characterIds || []).includes(shot.speakerId))) throw new Error('配音角色必须在本镜头出场');
    s.shot = { mode:shot.mode || 'illustration', characterIds:[...new Set(shot.characterIds || [])], speakerId:shot.speakerId || '' };
    for (const key of ['goal','location','action','camera','mood','prompt','negativePrompt']) s.shot[key] = text(shot[key],key==='prompt'?2000:1000,'镜头'+key);
  }
  return { story:{ logline:text(story.logline,1500,'故事梗概'), style:text(story.style,1000,'视觉风格'), notes:text(story.notes,1500,'连续性备注') }, characters:cast };
}
export function makeRequest(project, scene, kind) {
  if(kind==='music')return {protocol:'studio-generation/v1',kind,prompt:project.musicBrief||'',duration:project.scenes.reduce((n,s)=>n+(s.timing?.duration||s.duration||6),0),characters:[],outputFormat:'mp3',instrumental:true};
  if (!['video','lipsync'].includes(kind)) throw new Error('请选择视频、口型或音乐模型');
  const shot = scene.shot || {}, cast = (project.characters || []).filter(c => (shot.characterIds || []).includes(c.id));
  const speaker = cast.find(c => c.id === shot.speakerId);
  return structuredClone({
    protocol:'studio-generation/v1', kind, sceneId:scene.id,
    story:project.story || {}, shot:{...shot}, characters:cast,
    prompt:shot.prompt || [shot.goal,shot.location,shot.action,shot.camera,shot.mood,scene.imagePrompt].filter(Boolean).join('\n'),
    negativePrompt:shot.negativePrompt || '',
    duration:scene.timing?.duration || scene.duration || 6, aspectRatio:'16:9',
    referenceImage:kind==='lipsync' ? (speaker?.reference || scene.image || null) : (scene.image || null),
    referenceVideo:kind==='lipsync' && !speaker?.reference ? (scene.video || null) : null,
    audio:kind==='lipsync' ? (scene.audio || null) : null,
    narration:scene.narration, audioText:scene.voiceEvidence?.text || '', silent:!!scene.silent,
    timing:{audioIn:scene.timing?.audioIn || 0,delay:scene.timing?.delay || 0,volume:scene.timing?.volume ?? 1,videoIn:scene.timing?.videoIn || 0},
    mediaTransfer:'references are project-local names; submission embeds base64 media. Never fetch these names as URLs.'
  });
}
export function requestFingerprint(request) { return hash(JSON.stringify(request)); }
export function blockers(request, config) {
  const errors = [];
  if (!config || config.provider === 'disabled') errors.push('模型待配置');
  if (!request.prompt.trim()) errors.push('请填写镜头提示词或动作描述');
  if (request.kind === 'lipsync') {
    if (!request.referenceImage && !request.referenceVideo) errors.push('请指定人物参考图或导入人物视频');
    if (!request.audio || request.silent || request.timing.volume===0) errors.push('请先为当前镜头准备可播放的配音');
    if (request.audioText !== request.narration) errors.push('台词已改变，请重新配音');
  }
  return errors;
}
export function prepareTask(project, scene, kind) {
  const request = makeRequest(project,scene,kind);
  return { id:randomUUID(), sceneId:scene.id, kind, state:'prepared', createdAt:new Date().toISOString(), request, fingerprint:requestFingerprint(request) };
}
export function taskIsStale(task, project) {
  const scene = task.kind==='music'?project.scenes[0]:project.scenes.find(s => s.id===task.sceneId);
  return !scene || task.fingerprint !== requestFingerprint(makeRequest(project,scene,task.kind));
}

// This is our adapter contract, not a claim of compatibility with a vendor API.
async function adapterRequest(config, route, payload, kind='video') {
  const url = config.baseUrl.replace(/\/$/,'') + '/tasks' + route;
  let res;
  try {
    res = await fetch(url,{method:payload?'POST':'GET',headers:{...(payload?{'Content-Type':'application/json'}:{}),...(config.apiKey?{Authorization:'Bearer '+config.apiKey}:{})},...(payload?{body:JSON.stringify(payload)}:{}),redirect:'error',signal:AbortSignal.timeout(90000)});
  } catch { throw new Error('生成适配器连接失败或超时；请检查服务端任务，避免重复提交'); }
  if (!res.ok) throw new Error('生成适配器 HTTP '+res.status);
  const chunks=[];let size=0;
  for await (const b of res.body) {size+=b.length;if(size>70000000)throw new Error('生成结果超过70MB响应限制');chunks.push(b);}
  let data;try{data=JSON.parse(Buffer.concat(chunks));}catch{throw new Error('生成适配器没有返回有效JSON');}
  if (!['queued','running','succeeded','failed'].includes(data.status)) throw new Error('生成适配器状态不符合 studio-generation/v1');
  if (data.status==='failed') throw new Error('模型任务失败，请查看适配器服务日志');
  if (['queued','running'].includes(data.status) && !idOK(data.id)) throw new Error('生成适配器缺少有效任务ID');
  const output=data.output?.[kind==='music'?'audio_base64':'video_base64'];
  if (data.status==='succeeded' && (typeof output!=='string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(output))) throw new Error('生成适配器缺少有效媒体 base64 结果');
  return data;
}
export async function runAdapter(config, task, media, progress, {pollMs=2000,maxPolls=300}={}) {
  if (config.provider !== 'studio') throw new Error('模型待配置');
  let result = await adapterRequest(config,'',{...task.request,requestId:task.id,model:config.model,media},task.kind);
  for (let i=0; result.status!=='succeeded'; i++) {
    task.remoteId=result.id;task.state=result.status;await progress(result.status==='queued'?'模型排队中':'模型生成中');
    if (i>=maxPolls) throw new Error('等待模型超过轮询上限；外部任务可能仍在运行，请核对后手动导入结果');
    await new Promise(resolve=>setTimeout(resolve,pollMs));
    result=await adapterRequest(config,'/'+encodeURIComponent(result.id),undefined,task.kind);
  }
  const bytes=Buffer.from(result.output[task.kind==='music'?'audio_base64':'video_base64'],'base64');
  if(bytes.length<512||bytes.length>50000000)throw new Error('生成媒体应为512字节至50MB');
  return bytes;
}
