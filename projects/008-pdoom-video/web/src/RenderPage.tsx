import { useEffect, useRef } from 'react';
import { drawFrame } from './engine';
import type { Project } from '../shared/project';
declare global {interface Window {renderAt?:(t:number)=>string;renderReady?:boolean;renderError?:string;}}
export default function RenderPage(){
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{let disposed=false;const id=new URLSearchParams(location.search).get('job');
    fetch(`/api/jobs/${id}/project`).then(async r=>{if(!r.ok)throw new Error('无法读取渲染工程');return r.json();}).then(async(p:Project)=>{
      await document.fonts.ready;if(disposed)return;const c=canvas.current!;c.width=p.resolution==='1080p'?1920:1280;c.height=p.resolution==='1080p'?1080:720;
      window.renderAt=(t)=>{drawFrame(c,p,t);return c.toDataURL('image/jpeg',.94);};window.renderAt(0);window.renderReady=true;
    }).catch(e=>{window.renderError=e.message;});return()=>{disposed=true;window.renderReady=false;delete window.renderAt;};
  },[]);return <canvas ref={canvas} style={{display:'block'}}/>;
}
