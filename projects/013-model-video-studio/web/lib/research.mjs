import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,stat} from 'node:fs/promises';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const entry=(title,file,type)=>({title,file,type});
// Exact allowlist: the research viewer cannot browse arbitrary workspace files.
export const resources=Object.freeze({
  'research-poster':entry('Google Vids 与映序研究全景图','assets/research/research-overview.png','image'),
  'research-poster-source':entry('研究全景图的来源与核验记录','assets/research/overview-provenance.json','json'),
  'studio-draft':entry('映序 AI 初稿','assets/demo/ai-draft.mp4','video'),
  'studio-final':entry('映序人工编辑版','assets/demo/final.mp4','video'),
  'studio-editor':entry('画布与时间轴编辑版（无背景音乐）','assets/control-plane/final.mp4','video'),
  'studio-music':entry('中文口播与音乐混音成片','assets/music/final.mp4','video'),
  'studio-poster':entry('映序成片画面','assets/music/frames/scene-1.png','image'),
  'studio-screen':entry('当前控制面实拍','assets/music/editor.jpg','image'),
  'original-music':entry('原创程序合成配乐，未使用 AI 音乐模型','assets/music/soft-studio-original.wav','audio'),
  'google-draft':entry('Google Vids 实际 AI 初稿','../007-google-vids/assets/actual-production/ai-draft.mp4','video'),
  'google-final':entry('Google Vids 实际人工编辑版','../007-google-vids/assets/actual-production/edited-final.mp4','video'),
  'google-screen':entry('Google Vids 实际编辑器','../007-google-vids/assets/actual-production/04-edited-video.jpg','image'),
  'google-sheet':entry('Google Vids 成品画面概览','../007-google-vids/assets/actual-production/edited-contact-sheet.jpg','image'),
  'studio-readme':entry('映序完整研究说明','README.md','document'),
  'studio-architecture':entry('初版模型调用与架构记录','notes/README.md','document'),
  'studio-control':entry('控制面实现与验证','notes/control-plane.md','document'),
  'studio-adapters':entry('视频与口型适配器协议','notes/generation-adapters.md','document'),
  'studio-mixing':entry('统一创作与音乐混音协议','notes/music-and-creation.md','document'),
  'studio-runtime':entry('运行与模型配置说明','web/README.md','document'),
  'studio-verification':entry('初版真实模型调用与导出记录','assets/demo/verification.json','json'),
  'editor-verification':entry('控制面操作验证记录','assets/control-plane/verification.json','json'),
  'production-verification':entry('剧情与生成任务验证记录','assets/production/verification.json','json'),
  'music-verification':entry('混音成片与校验记录','assets/music/verification.json','json'),
  'studio-project':entry('混音示例完整项目 JSON','assets/music/project.json','json'),
  'studio-outline':entry('Codex 实际生成的初稿 JSON','assets/demo/ai-draft.json','json'),
  'image-provenance':entry('六张插画的来源与提示词','assets/demo/image-provenance.json','json'),
  'music-request':entry('音乐生成请求示例（未提交模型）','assets/music/music-request.json','json'),
  'lipsync-request':entry('口型生成请求示例（未提交模型）','assets/production/lipsync-request.json','json'),
  'preserved-original':entry('初版源码与成片快照校验清单','preserved/v1-2026-10-11/manifest.json','json'),
  'preserved-music':entry('混音升级前源码与作品校验清单','preserved/before-music-2026-10-11/manifest.json','json'),
  'google-readme':entry('Google Vids 研究摘要','../007-google-vids/README.md','document'),
  'google-process':entry('Google Vids 实际制作过程','../007-google-vids/notes/actual-production.md','document'),
  'google-metadata':entry('Google Vids 导出元数据与哈希','../007-google-vids/notes/export-metadata.json','json'),
  'google-license':entry('Google Vids 素材来源与许可','../007-google-vids/THIRD_PARTY.md','document'),
});
export function researchFile(id){if(!Object.hasOwn(resources,id))return null;return path.resolve(projectRoot,resources[id].file);}
export async function researchCatalog(){
  const assets={};await Promise.all(Object.entries(resources).map(async([id,item])=>{try{const info=await stat(researchFile(id));assets[id]={title:item.title,type:item.type,url:'/research-media/'+id,available:info.isFile(),bytes:info.size};}catch{assets[id]={title:item.title,type:item.type,available:false};}}));
  const examples={};
  for(const name of ['demo','control-plane','production','music']){
    try{const p=JSON.parse(await readFile(path.join(projectRoot,'assets',name,'project.json'),'utf8'));let start=0;examples[name]={projectId:p.id,title:p.title,chapters:p.scenes.map(s=>{const chapter={id:s.id,title:s.title,start,duration:s.timing?.duration||s.duration,narration:s.narration};start+=chapter.duration;return chapter;})};
      if(name==='music'){
        const s=p.scenes[3];if(s?.audio){const id='chinese-voice';const file=path.join(projectRoot,'assets/music',s.audio);if(path.basename(s.audio)===s.audio){const info=await stat(file);assets[id]={title:'MiniMax 实际中文口播 · 场景4',type:'audio',url:'/research-media/'+id,available:true,bytes:info.size};}}
      }
    }catch{/* Optional historical projects may not be bundled. */}
  }
  return {researchDate:'2026-10-11',assets,examples};
}
export async function resolveResearchFile(id){
  if(id!=='chinese-voice')return researchFile(id);
  const p=JSON.parse(await readFile(path.join(projectRoot,'assets/music/project.json'),'utf8')),name=p.scenes[3]?.audio;
  return typeof name==='string'&&path.basename(name)===name?path.join(projectRoot,'assets/music',name):null;
}
