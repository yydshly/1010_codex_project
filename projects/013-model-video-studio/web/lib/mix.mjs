import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import {mixOf,durationOf,narrationWindows,trackSpan} from '../public/audio-mix.js';

export function validateMix(input,assets) {
  const source=input||{},mix=mixOf({audioMix:source});
  const num=(v,min,max,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new Error(label+'超出有效范围');return v;};
  for(const key of ['master','narration','music','ducking'])mix[key]=num(mix[key],0,1,'混音音量');
  if(!Array.isArray(mix.tracks)||mix.tracks.length>8)throw new Error('最多添加8条音乐');
  const ids=new Set();mix.tracks=mix.tracks.map(t=>{
    if(typeof t.id!=='string'||!/^[-\w]{1,80}$/.test(t.id)||ids.has(t.id))throw new Error('音乐轨道编号不正确');ids.add(t.id);
    const asset=assets.find(a=>a.file===t.asset&&a.type==='audio');if(!asset)throw new Error('音乐必须来自项目音频素材');
    const result={id:t.id,asset:t.asset,loop:!!t.loop,muted:!!t.muted};
    for(const key of ['start','duration','sourceIn','volume','fadeIn','fadeOut'])result[key]=num(t[key],key==='duration'?.05:0,key==='volume'?1:2880,'音乐'+key);
    if(result.sourceIn>=asset.duration)throw new Error('音乐入点必须早于音频结束');return result;
  });
  return {master:mix.master,narration:mix.narration,music:mix.music,ducking:mix.ducking,tracks:mix.tracks};
}
export function requiresMix(p){const m=mixOf(p);return m.tracks.length>0||m.master!==1||m.narration!==1;}
export async function mixProjectAudio(p,directory,renderDir,input,output,command,progress=()=>{}) {
  const ffmpeg=process.env.STUDIO_FFMPEG||'ffmpeg',mix=validateMix(p.audioMix,p.assets||[]),duration=durationOf(p),windows=narrationWindows(p);
  const args=['-y','-v','error','-i',input],filters=[`[0:a]volume=${mix.narration*mix.master},apad,atrim=duration=${duration}[voice]`],names=['[voice]'];
  for(const track of mix.tracks){const {duration:span,available}=trackSpan(p,track);if(track.muted||span<=0||available<=0||track.volume===0||mix.music===0)continue;
    progress('正在混音：准备背景音乐与口播避让');
    // Trim BEFORE looping so every repetition starts at the chosen source in-point.
    const prepared=path.join(renderDir,'music-'+track.id+'.wav');
    await command(ffmpeg,['-y','-v','error','-ss',String(track.sourceIn),'-i',path.join(directory,track.asset),'-t',String(Math.min(available,span)),'-vn','-ar','48000','-ac','2','-c:a','pcm_s16le',prepared]);
    if(track.loop)args.push('-stream_loop','-1');args.push('-i',prepared);const index=names.length;
    const absolute=`(t+${track.start})`;
    let envelope='1';for(const [a,b]of windows)envelope=`min(${envelope},max(0,min(1,max((${a}-${absolute})/0.2,(${absolute}-${b})/0.4))))`;
    const duck=`(${mix.ducking}+(1-${mix.ducking})*${envelope})`,gain=track.volume*mix.music*mix.master;
    const fade=`min(1,min(${track.fadeIn?`t/${track.fadeIn}`:'1'},${track.fadeOut?`(${span}-t)/${track.fadeOut}`:'1'}))`;
    filters.push(`[${index}:a]atrim=duration=${span},asetpts=PTS-STARTPTS,volume='${gain}*${duck}*max(0,${fade})':eval=frame,adelay=${Math.round(track.start*1000)}:all=1,apad,atrim=duration=${duration}[m${index}]`);names.push(`[m${index}]`);
  }
  filters.push(`${names.join('')}amix=inputs=${names.length}:normalize=0:duration=longest,alimiter=limit=0.95:level=false:latency=1,atrim=duration=${duration}[mixed]`);
  const script=path.join(renderDir,'mix.ffscript');await writeFile(script,filters.join(';\n'));
  args.push('-filter_complex_script',script,'-map','0:v:0','-map','[mixed]','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',String(duration),'-movflags','+faststart',output);
  await command(ffmpeg,args,300000);
}
