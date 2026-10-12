import { writeFile, mkdir } from 'node:fs/promises';
import { upgradeScene } from '../public/composition.js';
const base='http://127.0.0.1:4323';
async function api(route,data){const res=await fetch(base+route,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{});const value=await res.json();if(!res.ok)throw new Error(value.error);return value;}
const state=await api('/api/state');
if(state.projects.some(p=>p.title==='映序 · 剧情与模型接入示例'))throw new Error('示例已存在，避免重复创建');
const source=state.projects.find(p=>p.id==='9e5697fa-f9ed-4406-8023-918a0166bf25')||state.projects.find(p=>p.assets?.some(a=>a.type==='video'));
const project=await api('/api/projects/'+source.id+'/copy',{});
project.title='映序 · 剧情与模型接入示例';
project.story={logline:'从一个想法出发，依次完成分镜、素材、中文配音、画布编辑，最后交付完整视频。',style:'延续已有奶油纸色、柔和紫色和青绿色插画；人物镜头接入前保留当前图文成片。',notes:'沿用现有成片与真实配音。人物设定与动态镜头是待制作计划，不代表已经生成新的视频。'};
project.characters=[{id:'presenter',name:'工作台讲解员',description:'面向初学者的中文讲解员，浅色上衣、自然自信的表情。人物参考图待上传，生成时保持外观与服装一致。',voice:'',reference:''}];
const goals=['用成品引出创作目标','介绍文案与分镜','说明素材来源与画面风格','说明中文配音与未来人物口型','展示人工编辑的可控性','交付成片并回顾整个流程'];
for(const [i,s] of project.scenes.entries()){
  upgradeScene(s);
  s.shot={mode:i===3?'lipsync':i===5?'video':'illustration',goal:goals[i],location:'映序视频工作台的产品介绍场景',action:i===3?'讲解员面对镜头自然讲述，嘴部动作随中文配音同步。':i===5?'镜头缓慢靠近完成的视频作品，停留在交付画面。':'沿用已完成的插画与文字排版',camera:i===3?'正面中景，固定镜头':'平稳构图，缓慢推进',mood:'自然、清晰、友好',characterIds:i===3?['presenter']:[],speakerId:'',prompt:i===3?'待人物参考图准备后，让中文讲解员用当前镜头配音介绍配音功能，保持自然表情与口型同步。':i===5?'柔和紫色与青绿色纸艺插画，镜头缓慢推进，呈现视频制作完成与交付的感觉；画面不生成文字。':'',negativePrompt:'避免额外文字、闪烁和风格突变'};
}
let res=await fetch(base+'/api/projects/'+project.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(project)});let saved=await res.json();if(!res.ok)throw new Error(saved.error);
const prepared=await api('/api/projects/'+saved.id+'/generation',{revision:saved.revision,sceneId:saved.scenes[5].id,kind:'video'});saved=prepared.project;
const rejected=await fetch(base+'/api/projects/'+saved.id+'/generation/'+prepared.task.id+'/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:saved.revision})});
const error=await rejected.json();if(rejected.ok||!error.error.includes('待配置'))throw new Error('未配置模型的提交应被拒绝');
await mkdir('../assets/production',{recursive:true});
await writeFile('../assets/production/verification.json',JSON.stringify({at:new Date().toISOString(),projectId:saved.id,sourceId:source.id,taskId:prepared.task.id,offlineGuard:{status:rejected.status,error:error.error},modelGeneration:'not-run; video and lipsync providers disabled',originalNarrationRetained:saved.scenes.every(s=>s.voiceEvidence?.text===s.narration)},null,2));
console.log(JSON.stringify({projectId:saved.id,revision:saved.revision,taskId:prepared.task.id,offlineGuard:error.error}));
