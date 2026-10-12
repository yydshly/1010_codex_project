// Shared timeline semantics used by browser preview and the export mixer.
export const durationOf = p => p.scenes.reduce((n,s)=>n+(s.timing?.duration||s.duration||6),0);
export const mixOf = p => ({master:1,narration:1,music:1,ducking:.3,tracks:[],...p.audioMix});
export function newMusicTrack(asset,duration,id) {
  return {id,asset:asset.file,start:0,duration,sourceIn:0,volume:.22,loop:true,fadeIn:1.2,fadeOut:2,muted:false};
}
export function narrationWindows(p) {
  if(mixOf(p).narration===0)return [];
  let offset=0;const windows=[];
  for(const s of p.scenes){const t=s.timing||{},d=t.duration||s.duration||6,start=offset+(t.delay||0),end=Math.min(offset+d,start+Math.max(0,(s.audioDuration||0)-(t.audioIn||0)));
    if(!s.silent&&s.audio&&(t.volume??1)>0&&end>start)windows.push([start,end]);offset+=d;
  }return windows;
}
export function trackSpan(p,track) {
  const asset=p.assets?.find(a=>a.type==='audio'&&a.file===track.asset),available=Math.max(0,(asset?.duration||0)-track.sourceIn);
  return {asset,available,duration:Math.max(0,Math.min(track.duration,durationOf(p)-track.start,track.loop?Infinity:available))};
}
export function trackPosition(p,track,time) {
  const {available,duration}=trackSpan(p,track),local=time-track.start;
  return available>0&&local>=0&&local<duration ? track.sourceIn+(track.loop?local%available:local) : null;
}
export function musicGainAt(p,track,time,windows=narrationWindows(p)) {
  const mix=mixOf(p),{duration}=trackSpan(p,track),local=time-track.start;
  if(track.muted||local<0||local>=duration)return 0;
  let envelope=1;
  for(const [a,b]of windows)envelope=Math.min(envelope,Math.max(0,Math.min(1,Math.max((a-time)/.2,(time-b)/.4))));
  const fade=Math.min(1,track.fadeIn?local/track.fadeIn:1,track.fadeOut?(duration-local)/track.fadeOut:1);
  return Math.max(0,mix.master*mix.music*track.volume*fade*(mix.ducking+(1-mix.ducking)*envelope));
}
export class MusicPlayer {
  constructor(){this.players=new Map();this.signature='';this.windows=[];}
  pause(){for(const a of this.players.values())a.pause();}
  sync(p,time,playing){
    const signature=JSON.stringify([p.id,p.scenes.map(s=>[s.audio,s.audioDuration,s.silent,s.timing]),mixOf(p).narration]);
    if(signature!==this.signature){this.signature=signature;this.windows=narrationWindows(p);}
    const active=new Set();
    for(const track of mixOf(p).tracks){const key=p.id+'/'+track.id;active.add(key);let a=this.players.get(key);
      if(!a){a=new Audio();a.preload='auto';a.hidden=true;a.dataset.musicTrack=track.id;document.body.append(a);this.players.set(key,a);}
      const src='/media/'+p.id+'/'+track.asset;if(a.dataset.file!==src){a.src=src;a.dataset.file=src;}
      const position=trackPosition(p,track,time);a.volume=Math.min(1,musicGainAt(p,track,time,this.windows));
      if(position!==null&&Number.isFinite(a.duration)&&Math.abs(a.currentTime-position)>.15)a.currentTime=position;
      if(playing&&position!==null&&!track.muted){if(a.paused)a.play().catch(()=>{});}else a.pause();
    }
    for(const [key,a]of this.players)if(!active.has(key)){a.pause();a.removeAttribute('src');a.load();a.remove();this.players.delete(key);}
  }
}
