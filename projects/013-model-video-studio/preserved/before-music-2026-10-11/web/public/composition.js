// Shared by the interactive canvas and the MP4 renderer; coordinates are 1920 × 1080.
export const WIDTH = 1920, HEIGHT = 1080;
const text = (id, bind, x, y, w, h, size, color, weight = 400) => ({ id, type:'text', bind, x, y, w, h, size, color, weight, align:'left', opacity:1 });
const shape = (id,x,y,w,h,color,radius=0) => ({ id,type:'shape',x,y,w,h,color,radius,opacity:1 });
export function defaultElements(scene) {
  return [
    shape('logo-bg',80,68,52,52,'#7060d5',16),
    { ...text('logo','',91,73,40,46,28,'#ffffff',700),text:'映' },
    { ...text('brand','',150,77,600,44,28,'#40394e',700),text:'映序  STUDIO' },
    { ...text('slogan','',1430,78,410,44,25,'#87838d'),text:'把想法，变成一支视频' },
    shape('tag-bg',80,204,160,48,'#ebe7f9',24),
    { ...text('tag','',102,211,140,40,23,'#7060d5'),text:'创作指南' },
    { id:'visual',type:'image',source:'scene',x:860,y:190,w:980,h:620,radius:32,fit:'cover',opacity:1 },
    text('title','title',80,285,720,222,82,'#252133',700),
    text('body','body',84,scene.title?.length>8?550:461,705,210,33,'#706b7b'),
    shape('chip-bg',84,720,350,60,'#e7f2ec',30),
    { ...text('chip','',104,732,320,45,23,'#39715b'),text:'独立模型  ·  自由创作' },
    shape('caption-bg',80,857,1760,132,'#ffffff',24),
    { ...text('caption-label','',110,870,180,35,20,'#9a94a5'),text:'旁白' },
    text('caption','narration',110,903,1660,78,27,'#514b60'),
  ];
}
export function upgradeScene(scene) {
  scene.background ||= '#f7f6f2';
  scene.elements ||= defaultElements(scene);
  scene.timing ||= { duration:Math.round((scene.duration || scene.audioDuration + .55 || 12)*30)/30, audioIn:0, delay:.2, volume:1, videoIn:0, transition:'fade' };
  return scene;
}
export function sceneDuration(scene) { return scene.timing?.duration || scene.duration || 12; }
export function locateTime(scenes,time) {
  let start = 0;
  for (let i=0;i<scenes.length;i++) { const end=start+sceneDuration(scenes[i]); if(time<end || i===scenes.length-1)return { index:i,start,local:Math.max(0,time-start) }; start=end; }
  return { index:0,start:0,local:0 };
}
export function wrap(ctx,text,width) {
  const lines=[]; let current='';
  for(const char of String(text||'')) { if(char==='\n'){lines.push(current);current='';continue;} if(current&&ctx.measureText(current+char).width>width){lines.push(current);current=char;}else current+=char; }
  if(current)lines.push(current); return lines;
}
export function drawElement(ctx,el,scene,images) {
  if(el.hidden)return;
  ctx.save(); ctx.globalAlpha=el.opacity??1;
  ctx.beginPath(); ctx.roundRect(el.x,el.y,el.w,el.h,Math.min(el.radius||0,el.w/2,el.h/2)); ctx.clip();
  if(el.type==='shape') { ctx.fillStyle=el.color; ctx.fillRect(el.x,el.y,el.w,el.h); }
  if(el.type==='image') {
    const image=images.get(el.source==='scene'?(scene.video||scene.image):el.source);
    if(image){const iw=image.videoWidth||image.width,ih=image.videoHeight||image.height;const scale=(el.fit==='contain'?Math.min:Math.max)(el.w/iw,el.h/ih);ctx.drawImage(image,el.x+(el.w-iw*scale)/2,el.y+(el.h-ih*scale)/2,iw*scale,ih*scale);}
    else {ctx.fillStyle='#e8e5f0';ctx.fillRect(el.x,el.y,el.w,el.h);ctx.fillStyle='#858095';ctx.font='30px "Studio Sans", "Microsoft YaHei", sans-serif';ctx.fillText('导入图片或视频',el.x+35,el.y+el.h/2);}
  }
  if(el.type==='text') {
    ctx.fillStyle=el.color;ctx.font=`${el.weight||400} ${el.size}px "Studio Sans", "Microsoft YaHei", sans-serif`;ctx.textBaseline='top';ctx.textAlign=el.align||'left';
    const x=el.align==='center'?el.x+el.w/2:el.align==='right'?el.x+el.w:el.x;
    wrap(ctx,el.bind?scene[el.bind]:el.text,el.w).forEach((line,i)=>ctx.fillText(line,x,el.y+i*el.size*1.35));
  }
  ctx.restore();
}
export function drawScene(ctx,scene,images,{transparent=false,elements=scene.elements}={}) {
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  if(!transparent){ctx.fillStyle=scene.background||'#f7f6f2';ctx.fillRect(0,0,WIDTH,HEIGHT);}
  for(const el of elements||defaultElements(scene))drawElement(ctx,el,scene,images);
}
