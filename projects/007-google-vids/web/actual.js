const chapters=[
  {time:0,label:'开场',title:'Google Vids 入门指南',note:'AI 从提示词生成开场标题、英文旁白与素材建议。我保留这一段，作为介绍入口。',script:"Welcome to this beginner's guide to Google Vids. Today, we'll explore how this browser-based app helps you transform ideas into professional video content."},
  {time:9.96,label:'产品定位',title:'从想法到可编辑初稿',note:'把“从想法到成品”改成“从想法到可编辑初稿”，使画面更准确地表达 AI 的作用。配音沿用初稿。',script:'Google Vids is a specialized browser-based application designed for structured video creation and editing, streamlining your workflow directly in the cloud.'},
  {time:18.24,label:'明确目标',title:'明确受众、用途与材料',note:'AI 原标题是“先明确目标”。我补全三个具体维度；目标与材料仍需要使用者提供。',script:"Before you start, define your project. Clarify your target audience, the video's core purpose, and gather all your essential source materials."},
  {time:27.08,label:'AI 起草',title:'AI 先出初稿',note:'大纲、场景布局、素材建议和英文配音由 AI 生成。画面里的片段由 Vids 从素材库推荐，并非本次新生成的 AI 视频。',script:'Use AI as your co-pilot. It helps generate a structured storyboard, organizes your scenes, and suggests appropriate stock media to build your initial draft.'},
  {time:37.12,label:'人工编辑',title:'你来核对与编辑',note:'把“你来完成最终编辑”改得更明确。本次还删掉重复场景、保留统一模板，并手动清理六段残留配音。',script:'Now, take the reins. Human-led editing is crucial. Review the draft to ensure factual accuracy, perfect the narrative flow, and align the video with your brand style.'},
  {time:47.89,label:'配音与导出',title:'英文 AI 配音与导出',note:'Nyla 英文旁白是 Vids 实际生成的 AI 语音。这里没有真人录音或 AI 人物；本片已预览并导出 MP4。',script:'Finally, add and review the English AI voiceover for natural pacing. Once satisfied, preview your project, collaborate with your team, and export your final MP4 video.'},
  {time:58.97,label:'结尾',title:'AI 起草，你来把关',note:'原结尾“你的创作，由你掌控”改成更直接的分工总结。保留原有 AI 英文结尾旁白，删除其后的空白场景。',script:'AI handles the drafting heavy-lifting, but you maintain full creative control. Collaborate, preview, and export your professional video whenever you are ready.'}
];
const finalVideo=document.querySelector('#final-video'),videos=[...document.querySelectorAll('video')],status=document.querySelector('#play-status');
const stamp=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;
function selectChapter(index){
  const chapter=chapters[index];
  document.querySelectorAll('.chapter-button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  document.querySelector('#chapter-time').textContent=`${stamp(chapter.time)} / ${chapter.label}`;
  document.querySelector('#chapter-title').textContent=chapter.title;
  document.querySelector('#chapter-note').textContent=chapter.note;
  document.querySelector('#chapter-script').textContent=chapter.script;
}
async function play(video){
  videos.filter(item=>item!==video).forEach(item=>item.pause());
  try{await video.play();status.textContent=video===finalVideo?'正在播放人工修改后的成品。':'正在播放保留的 AI 原始初稿。';}
  catch{status.textContent='播放未开始，请点击播放器原生播放键；也可以下载 MP4。';}
}
for(const [index,chapter] of chapters.entries()){
  const button=document.createElement('button');button.className='chapter-button';button.type='button';button.setAttribute('aria-pressed',String(index===0));
  const time=document.createElement('time');time.textContent=stamp(chapter.time);const label=document.createElement('strong');label.textContent=chapter.label;button.append(time,label);
  button.addEventListener('click',()=>{selectChapter(index);finalVideo.currentTime=chapter.time;play(finalVideo);});document.querySelector('#chapters').append(button);
}
document.querySelectorAll('.video-play').forEach(button=>button.addEventListener('click',()=>play(document.getElementById(button.dataset.video))));
videos.forEach(video=>{video.addEventListener('play',()=>videos.filter(item=>item!==video).forEach(item=>item.pause()));video.addEventListener('error',()=>{status.textContent='视频加载失败，请检查本机服务是否运行或使用项目中的 MP4 文件。';});});
finalVideo.addEventListener('timeupdate',()=>{let index=0;chapters.forEach((chapter,i)=>{if(finalVideo.currentTime>=chapter.time)index=i;});selectChapter(index);});
