import { upgradeScene } from '../public/composition.js';
const color = value => typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const finite = (value,min,max) => typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
export function validateScene(input,previous,files) {
  const s = structuredClone(previous);
  s.id=input.id;
  if (input.shot !== undefined) s.shot=structuredClone(input.shot);
  for(const key of ['title','body','narration','imagePrompt']) {
    if(typeof input[key]!=='string'||input[key].length>(key==='title'?100:1500))throw new Error('场景字段不正确：'+key);
    s[key]=input[key];
  }
  if(!s.title.trim())throw new Error('请输入场景标题');
  if(!input.elements)return s; // Original editor and old projects remain supported.
  if(!color(input.background))throw new Error('背景颜色不正确');
  if(!Array.isArray(input.elements)||input.elements.length>60)throw new Error('每个场景最多60个对象');
  const ids=new Set();
  s.elements=input.elements.map(el=>{
    if(!/^[\w-]{1,80}$/.test(el.id)||ids.has(el.id))throw new Error('对象编号不正确');ids.add(el.id);
    if(!['text','shape','image'].includes(el.type))throw new Error('不支持的对象');
    if(!finite(el.x,0,1919)||!finite(el.y,0,1079)||!finite(el.w,10,1920)||!finite(el.h,10,1080)||el.x+el.w>1920.1||el.y+el.h>1080.1)throw new Error('对象必须位于画布范围内');
    const result={id:el.id,type:el.type,x:el.x,y:el.y,w:el.w,h:el.h,opacity:finite(el.opacity,0,1)?el.opacity:1,hidden:!!el.hidden,locked:!!el.locked};
    if(el.type==='text') {
      if(!color(el.color)||!finite(el.size,10,200)||!['left','center','right'].includes(el.align))throw new Error('文字样式不正确');
      if(el.bind&&!['title','body','narration'].includes(el.bind))throw new Error('文字绑定不正确');
      if(!el.bind&&(typeof el.text!=='string'||el.text.length>1500))throw new Error('文字内容不正确');
      Object.assign(result,{color:el.color,size:el.size,align:el.align,weight:el.weight===700?700:400,bind:el.bind||'',text:el.text||''});
    } else {
      result.radius=finite(el.radius,0,500)?el.radius:0;
      if(el.type==='shape'){if(!color(el.color))throw new Error('形状颜色不正确');result.color=el.color;}
      else {if(el.source!=='scene'&&!files.has(el.source))throw new Error('图片不在项目素材库');result.source=el.source;result.fit=el.fit==='contain'?'contain':'cover';}
    }
    return result;
  });
  const t=input.timing;
  if(!t||!finite(t.duration,1,120)||!finite(t.audioIn,0,600)||!finite(t.videoIn,0,600)||!finite(t.delay,0,120)||!finite(t.volume,0,1)||!['fade','cut'].includes(t.transition))throw new Error('时间轴参数不正确');
  s.timing={duration:Math.round(t.duration*30)/30,audioIn:t.audioIn,videoIn:t.videoIn,delay:t.delay,volume:t.volume,transition:t.transition};s.duration=s.timing.duration;s.background=input.background;
  if(input.mainAsset) {
    const asset=files.get(input.mainAsset);if(!asset||!['image','video'].includes(asset.type))throw new Error('画面素材不可用');
    if(asset.type==='video'){s.video=asset.file;s.videoDuration=asset.duration;}else{s.image=asset.file;delete s.video;delete s.videoDuration;}
  }
  if(input.voiceAsset){const asset=files.get(input.voiceAsset);if(!asset||asset.type!=='audio')throw new Error('音频素材不可用');s.audio=asset.file;s.audioDuration=asset.duration;s.voiceEvidence={provider:'import',text:s.narration,at:asset.at};}
  if(input.silent!==undefined)s.silent=!!input.silent;
  if(s.video) {
    const videos=s.elements.filter(el=>el.type==='image'&&el.source==='scene');
    if(videos.length>1)throw new Error('每个场景只支持一个视频对象');
    for(const el of videos){el.radius=0;el.fit='cover';}
  }
  return s;
}
export function blankScene(id) { return upgradeScene({id,title:'新场景',body:'在画布上编辑这段内容',narration:'',imagePrompt:'',duration:6,silent:true}); }
