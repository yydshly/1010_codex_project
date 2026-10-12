import { move } from '../shared/motion';
import type { Character, Project, Shot } from '../shared/project';
type Ctx=CanvasRenderingContext2D;
const W=1280,H=720,TAU=Math.PI*2;
const textures=new Map<string,HTMLCanvasElement>();
function random(seed:number){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function paper(style:string,seed:number){
  const key=`${style}:${seed}`;if(textures.has(key))return textures.get(key)!;
  if(textures.size>12)textures.clear();
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d')!;
  x.fillStyle=style==='flat_cartoon'?'#FAF4E8':'#F5F0E5';x.fillRect(0,0,W,H);const rnd=random(seed);
  if(style!=='flat_cartoon')for(let i=0;i<10000;i++){x.fillStyle=`rgba(105,84,58,${rnd()*.07})`;x.fillRect(rnd()*W,rnd()*H,1+rnd()*2,1+rnd());}
  textures.set(key,c);return c;
}
function pathRect(x:number,y:number,w:number,h:number,r=18){const p=new Path2D();p.roundRect(x,y,w,h,r);return p;}
function ellipse(x:number,y:number,rx:number,ry=rx){const p=new Path2D();p.ellipse(x,y,rx,ry,0,0,TAU);return p;}
function poly(points:number[][]){const p=new Path2D();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();return p;}
function star(x:number,y:number,r:number){return poly(Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,s=i%2?r*.45:r;return [x+Math.cos(a)*s,y+Math.sin(a)*s];}));}
function painter(ctx:Ctx,style:string,rnd:()=>number){
  return (path:Path2D,color:string,ink=true)=>{
    ctx.save();ctx.lineWidth=style==='flat_cartoon'?3:2.2;ctx.strokeStyle=style==='flat_cartoon'?'#353F38':'#62584E';
    if(style==='ink_sketch'){
      ctx.fillStyle='#F9F6EC';ctx.fill(path);ctx.save();ctx.clip(path);ctx.strokeStyle='#8D8578';ctx.lineWidth=.7;
      for(let x=-600;x<1900;x+=13){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-360,720);ctx.stroke();}ctx.restore();
    }else{
      ctx.fillStyle=color;ctx.globalAlpha=style==='watercolor_storybook'?.78:1;ctx.fill(path);ctx.globalAlpha=1;
      if(style==='watercolor_storybook'){
        ctx.save();ctx.clip(path);ctx.globalAlpha=.13;ctx.fillStyle='#FFFFFF';
        for(let i=0;i<22;i++){ctx.beginPath();ctx.ellipse(rnd()*1280,rnd()*720,20+rnd()*100,10+rnd()*40,rnd(),0,TAU);ctx.fill();}ctx.restore();
      }
    }
    if(ink){ctx.stroke(path);if(style==='ink_sketch'){ctx.globalAlpha=.25;ctx.translate(1.3,-1);ctx.stroke(path);}}
    ctx.restore();
  };
}
function line(ctx:Ctx,points:number[][],width=3,color='#514D42'){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
}
function character(ctx:Ctx,c:Character,s:Shot,t:number,p:Project,paint:ReturnType<typeof painter>){
  const m=move(s.action,t,p.audio.bpm,p.audio.beatOffsetSec),walk=s.action==='walk',phase=walk?Math.sin(m.walk*TAU):0;
  const progress=(t-s.start)/(s.end-s.start);const x=640+m.dx*9+(walk?(progress-.5)*380:0),y=477+m.dy*9;
  ctx.save();ctx.translate(x,y);ctx.rotate(m.rot);ctx.scale(1+m.sq,1-m.sq);
  ctx.fillStyle='#514D4218';ctx.beginPath();ctx.ellipse(0,41,106,18,0,0,TAU);ctx.fill();
  const bw=154*c.bodyRatio,bh=146;
  // 身体、手臂、腿均为可重绘部件；脸部与装饰共享统一参数。
  for(const side of [-1,1]){
    const arm=side<0?m.aL:m.aR;
    line(ctx,[[side*bw*.43,-72],[side*(bw*.53+25),-63-arm*27],[side*(bw*.63+34),-51-arm*51]],10,c.bodyColor);
    paint(ellipse(side*(bw*.63+34),-51-arm*51,11),c.accentColor);
    line(ctx,[[side*37,-5],[side*40+phase*side*18,27],[side*56+phase*side*19,29]],13,c.bodyColor);
  }
  paint(pathRect(-bw/2,-bh,bw,bh,34),c.bodyColor);
  paint(ellipse(-bw*.26,-37,13,7),'#E57474',false);paint(ellipse(bw*.26,-37,13,7),'#E57474',false);
  const es=c.eyeSize,blink=Math.sin(t*1.8+.3)> .995,ey=-77;
  if(s.emotion==='happy'||s.emotion==='excited'){
    for(const side of [-1,1]){ctx.beginPath();ctx.strokeStyle='#423E37';ctx.lineWidth=5*es;ctx.arc(side*31,ey+5,10*es,Math.PI,TAU);ctx.stroke();}
  }else if(blink){line(ctx,[[-42,ey],[-23,ey]],4);line(ctx,[[23,ey],[42,ey]],4);}
  else{for(const side of [-1,1]){ctx.fillStyle='#423E37';ctx.beginPath();ctx.ellipse(side*31,ey,6*es,(s.emotion==='curious'?13:10)*es,0,0,TAU);ctx.fill();}}
  ctx.beginPath();ctx.strokeStyle='#423E37';ctx.lineWidth=3.5;
  if(s.emotion==='sad')ctx.arc(0,-30,13,Math.PI,TAU);else if(s.emotion==='curious')ctx.ellipse(0,-43,6,8,0,0,TAU);else ctx.arc(0,-52,16,0,Math.PI);ctx.stroke();
  if(c.hat==='star')paint(star(0,-bh-19,26),c.accentColor);
  else if(c.hat==='beanie'){paint(pathRect(-bw/2-5,-bh-15,bw+10,34,20),c.accentColor);paint(ellipse(0,-bh-28,13),c.accentColor);}
  paint(star(0,-18,11),c.accentColor,false);
  if(s.templateId==='prop_interaction'){ctx.save();ctx.translate(120,-130);ctx.rotate(t*.25);paint(star(0,0,36+Math.sin(t*3)*3),c.accentColor);ctx.restore();}
  ctx.restore();
}
function background(ctx:Ctx,s:Shot,t:number,p:Project,paint:ReturnType<typeof painter>){
  const calm=s.templateId==='emotion_reaction';
  if(s.templateId==='garden_walk'||s.templateId==='prop_interaction'||calm){
    paint(ellipse(980,152,66),calm?'#BCCCD5':'#F3CD70',false);
    for(let i=0;i<3;i++)paint(ellipse(260+i*285,150+i%2*42,95,24),'#FDFBF7',false);
    paint(poly([[0,430],[0,360],[190,225],[440,422],[720,286],[1000,408],[1280,300],[1280,600],[0,600]]),calm?'#B7C6CC':'#D1D9B1',false);
    paint(ellipse(540,750,1100,316),calm?'#BDC9C7':'#C3D3A2',false);
    paint(ellipse(1160,752,820,267),calm?'#CFD9D0':'#DEE0BC',false);
    for(let i=0;i<12;i++){
      const x=65+i*109,y=507+(i%3)*29;line(ctx,[[x,y+21],[x+Math.sin(t*.8+i)*4,y-6]],2,'#72866D');
      paint(ellipse(x+Math.sin(t*.8+i)*4,y-9,9,12),i%2?'#DBA493':'#EED699',false);
    }
    if(calm)for(let i=0;i<30;i++){const x=(i*93+t*20)%1280,y=(i*71+t*110)%480;line(ctx,[[x,y],[x-4,y+14]],1,'#718B9B70');}
  }else{
    const night=s.templateId==='curtain_call';
    paint(pathRect(120,122,1040,395,160),night?'#667685':'#E4CFAD',false);
    for(let i=0;i<22;i++){const x=190+(i*191)%900,y=152+(i*83)%230;ctx.save();ctx.globalAlpha=.35+.3*Math.sin(t*1.2+i);paint(star(x,y,4+i%3*2),night?'#FFEFBE':'#A18664',false);ctx.restore();}
    ctx.save();ctx.globalAlpha=.15;paint(poly([[300,139],[163,489],[692,489]]),'#FFFFFF',false);paint(poly([[990,139],[600,489],[1130,489]]),'#FFFFFF',false);ctx.restore();
    paint(pathRect(153,482,974,35,18),'#B5B795');paint(pathRect(120,510,1040,37,18),'#D1C9AC');
    for(const side of [0,1]){const x=side?1080:90;paint(pathRect(x,114,111,409,40),'#C99B85');for(let i=0;i<4;i++)line(ctx,[[x+18+i*22,130],[x+20+i*22,498]],1.2,'#795B452F');}
  }
  for(let i=0;i<10;i++){const x=100+(i*133)%1150,y=280+Math.sin(t*.5+i)*80;ctx.save();ctx.globalAlpha=.2;paint(ellipse(x,y,2.5),'#937F55',false);ctx.restore();}
}
function wrapped(ctx:Ctx,text:string,max:number){let row='',lines:string[]=[];for(const ch of text){if(ctx.measureText(row+ch).width>max){lines.push(row);row=ch;}else row+=ch;}if(row)lines.push(row);return lines;}
export function drawFrame(canvas:HTMLCanvasElement,p:Project,t:number){
  const ctx=canvas.getContext('2d')!;t=Math.max(0,Math.min(p.durationSec-.0001,t));
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.clearRect(0,0,W,H);ctx.drawImage(paper(p.styleId,p.seed),0,0);
  const s=p.shots.find(s=>t>=s.start&&t<s.end)??p.shots[0],progress=(t-s.start)/(s.end-s.start);
  const rnd=random(p.seed+Math.floor(t*12));const paint=painter(ctx,p.styleId,rnd);
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,580);ctx.clip();
  if(s.camera==='push_in'){const zoom=1+progress*.08;ctx.translate(W/2,360);ctx.scale(zoom,zoom);ctx.translate(-W/2,-360);}else if(s.camera==='pan_right')ctx.translate((.5-progress)*45,0);
  background(ctx,s,t,p,paint);character(ctx,p.character,s,t,p,paint);ctx.restore();
  ctx.fillStyle='#706452';ctx.font='18px "Microsoft YaHei", sans-serif';ctx.textAlign='left';ctx.fillText(p.title,64,59);
  ctx.textAlign='right';ctx.fillStyle='#817967';ctx.fillText(`${p.character.name}的音乐短片`,1216,59);
  const lyric=p.lyrics.find(l=>t>=l.start&&t<l.end);
  if(lyric){let size=32,lines:string[]=[];do{ctx.font=`500 ${size}px "Microsoft YaHei", sans-serif`;lines=wrapped(ctx,lyric.text,1080);if(lines.length<=3)break;size-=2;}while(size>=10);
    const rowH=size*1.35,boxH=lines.length*rowH+26,top=689-boxH;
    ctx.fillStyle=p.styleId==='ink_sketch'?'#FDFBF3EE':'#FFFCF2DD';ctx.beginPath();ctx.roundRect(68,top,1144,boxH,18);ctx.fill();
    ctx.fillStyle='#383E34';ctx.textAlign='center';lines.forEach((line,i)=>ctx.fillText(line,640,top+19+size+i*rowH));
    ctx.fillStyle=p.character.accentColor;ctx.fillRect(95,top+boxH-7,1090*Math.min(1,(t-lyric.start)/(lyric.end-lyric.start)),3);
  }
  if(s.transition==='fade'&&s.end-t<.25&&s.end<p.durationSec){ctx.fillStyle=`rgba(245,240,229,${(1-(s.end-t)/.25)*.85})`;ctx.fillRect(0,0,W,H);}
}
