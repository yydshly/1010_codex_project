import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

for (const font of [process.env.STUDIO_FONT, 'C:/Windows/Fonts/msyh.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'].filter(Boolean)) {
  if (GlobalFonts.registerFromPath(font, 'Studio Sans')) break;
}
export function command(program, args, timeout = 180000) {
  return new Promise((resolve, reject) => {
    const p = spawn(program, args, { windowsHide: true }); let out = '', err = '';
    const timer = setTimeout(() => { p.kill(); reject(new Error(path.basename(program) + ' 超时')); }, timeout);
    p.stdout.on('data', b => { out = (out + b).slice(-20000); });
    p.stderr.on('data', b => { err = (err + b).slice(-6000); });
    p.on('error', () => { clearTimeout(timer); reject(new Error('请安装并配置 ' + path.basename(program))); });
    p.on('close', code => { clearTimeout(timer); code === 0 ? resolve(out) : reject(new Error(path.basename(program) + ' 处理失败：' + err.slice(-900))); });
  });
}
export async function probe(file) {
  const result = JSON.parse(await command(process.env.STUDIO_FFPROBE || 'ffprobe', ['-v','error','-show_format','-show_streams','-of','json',file]));
  const duration = Number(result.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('素材时长无法读取');
  return { duration, bytes: Number(result.format.size), streams: result.streams.map(s => ({ type: s.codec_type, codec: s.codec_name, width: s.width, height: s.height, sampleRate: s.sample_rate })) };
}
export function wrapText(ctx, text, width) {
  const lines = []; let current = '';
  for (const char of text) {
    if (char === '\n') { lines.push(current); current = ''; continue; }
    if (ctx.measureText(current + char).width > width && current) { lines.push(current); current = char; }
    else current += char;
  }
  if (current) lines.push(current); return lines;
}
export async function poster(scene, index, total, imageFile, file) {
  const canvas = createCanvas(1920, 1080), ctx = canvas.getContext('2d');
  const round = (x,y,w,h,r,fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill(); };
  const text = (s,x,y,size,color = '#262333',weight = 'normal') => { ctx.fillStyle = color; ctx.font = `${weight} ${size}px "Studio Sans"`; ctx.fillText(s,x,y); };
  ctx.fillStyle = '#f7f6f2'; ctx.fillRect(0,0,1920,1080);
  round(80,68,52,52,16,'#7060d5'); text('映',91,104,28,'#fff','bold'); text('映序  STUDIO',150,106,28,'#40394e','bold');
  text('把想法，变成一支视频',1430,104,25,'#87838d');
  round(80,204,160,48,24,'#ebe7f9'); text('创作指南',102,237,23,'#7060d5');
  ctx.font = 'bold 82px "Studio Sans"'; ctx.fillStyle = '#252133';
  const titleLines = wrapText(ctx, scene.title, 720);
  titleLines.forEach((line,i) => ctx.fillText(line,80,370+i*111));
  ctx.font = 'normal 33px "Studio Sans"'; ctx.fillStyle = '#706b7b';
  wrapText(ctx,scene.body,705).slice(0,4).forEach((line,i) => ctx.fillText(line,84, titleLines.length > 1 ? 590+i*52 : 500+i*52));
  round(84,720,290,60,30,'#e7f2ec'); text('独立模型  ·  自由创作',104,760,23,'#39715b');
  const img = await loadImage(imageFile), box = { x: 860, y: 190, w: 980, h: 620 };
  ctx.save(); ctx.beginPath(); ctx.roundRect(box.x,box.y,box.w,box.h,32); ctx.clip();
  const scale = Math.max(box.w/img.width, box.h/img.height), w = img.width*scale, h = img.height*scale;
  ctx.drawImage(img,box.x+(box.w-w)/2,box.y+(box.h-h)/2,w,h); ctx.restore();
  round(80,857,1760,132,24,'#ffffff');
  text('旁白',110,895,20,'#9a94a5');
  ctx.font = 'normal 27px "Studio Sans"'; ctx.fillStyle = '#514b60';
  wrapText(ctx,scene.narration,1660).slice(0,2).forEach((line,i) => ctx.fillText(line,110,932+i*37));
  const segment = (1530 - (total-1)*14)/total;
  for (let i=0;i<total;i++) round(82+i*(segment+14),1030,segment,6,3,i<=index?'#8271df':'#dfdbe9');
  text(String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0'),1712,1041,21,'#7d778b');
  await writeFile(file, canvas.toBuffer('image/png'));
}
export async function renderProject(project, directory, progress) {
  const ffmpeg = process.env.STUDIO_FFMPEG || 'ffmpeg', renderDir = path.join(directory, 'render-r' + project.revision);
  await mkdir(renderDir, { recursive: true }); const clips = [];
  for (let i = 0; i < project.scenes.length; i++) {
    const scene = project.scenes[i];
    if (!scene.image || !scene.audio) throw new Error(`场景 ${i+1} 缺少图片或配音`);
    if (scene.voiceEvidence?.text !== scene.narration) throw new Error(`场景 ${i+1} 的口播已修改，请先重新生成配音`);
    progress(`正在渲染场景 ${i+1}/${project.scenes.length}`);
    const frame = path.join(renderDir, `frame-${i+1}.png`), clip = path.join(renderDir, `clip-${i+1}.mp4`);
    await poster(scene,i,project.scenes.length,path.join(directory,scene.image),frame);
    const duration = Math.ceil((scene.audioDuration + 0.55)*30)/30;
    scene.duration = duration; scene.poster = path.relative(directory,frame).replaceAll('\\','/');
    await command(ffmpeg,['-y','-v','error','-loop','1','-framerate','30','-i',frame,'-i',path.join(directory,scene.audio),'-vf',`fade=t=in:st=0:d=0.3,fade=t=out:st=${Math.max(0,duration-0.3).toFixed(3)}:d=0.3`,'-af',`adelay=200:all=1,apad,atrim=duration=${duration},alimiter=limit=0.95`,'-t',String(duration),'-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart',clip]);
    clips.push(`file '${clip.replaceAll('\\','/')}'`);
  }
  const list = path.join(renderDir,'concat.txt'), output = path.join(directory,`export-r${project.revision}.mp4`);
  await writeFile(list, clips.join('\n'));
  progress('正在合并画面与配音，写入 MP4');
  await command(ffmpeg,['-y','-v','error','-f','concat','-safe','0','-i',list,'-c','copy','-movflags','+faststart',output]);
  const metadata = await probe(output);
  if (!metadata.streams.some(s => s.type === 'video' && s.codec === 'h264') || !metadata.streams.some(s => s.type === 'audio')) throw new Error('导出缺少视频或音频轨道');
  return { file: path.basename(output), revision: project.revision, ...metadata, at: new Date().toISOString() };
}
