import { useEffect,useRef } from 'react';
import { drawFrame } from './engine';
import type { Project } from '../shared/project';
export default function Preview({project,time,playing,onTime,onEnd}:{project:Project,time:number,playing:boolean,onTime:(t:number)=>void,onEnd:()=>void}){
  const canvas=useRef<HTMLCanvasElement>(null),audio=useRef<HTMLAudioElement>(null),latest=useRef({onTime,onEnd});latest.current={onTime,onEnd};
  useEffect(()=>{if(canvas.current)drawFrame(canvas.current,project,time);},[project,time]);
  useEffect(()=>{
    const a=audio.current!;a.currentTime=project.audio.sourceStartSec+time;
    if(!playing){a.pause();return;}
    let stopped=false,raf=0;
    a.play().then(()=>{const loop=()=>{if(stopped)return;const t=a.currentTime-project.audio.sourceStartSec;if(t>=project.durationSec||a.ended){latest.current.onEnd();return;}latest.current.onTime(Math.max(0,t));raf=requestAnimationFrame(loop);};raf=requestAnimationFrame(loop);}).catch(()=>latest.current.onEnd());
    return()=>{stopped=true;cancelAnimationFrame(raf);a.pause();};
    // 播放时以音频时钟驱动；手动跳转先暂停，避免每帧重启音频。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,project.audio.assetId,project.audio.sourceStartSec,project.durationSec]);
  return <><canvas ref={canvas} width={1280} height={720} aria-label="MV 动画预览"/><audio ref={audio} src={`/api/assets/${project.audio.assetId}/audio`} preload="metadata"/></>;
}
