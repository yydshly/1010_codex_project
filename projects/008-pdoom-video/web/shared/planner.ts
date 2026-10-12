import { scenes, type Project, type Shot } from './project';
export function ruleShots(p:Pick<Project,'durationSec'|'audio'|'lyrics'|'character'>):Shot[]{
  const n=Math.min(6,Math.max(4,Math.round(p.durationSec/4)));
  const beat=60/p.audio.bpm; const points=[0];
  for(let i=1;i<n;i++){const target=p.durationSec*i/n;const aligned=Math.round((target-p.audio.beatOffsetSec)/beat)*beat+p.audio.beatOffsetSec;points.push(+Math.max(points.at(-1)!+.6,Math.min(p.durationSec-(n-i)*.6,aligned)).toFixed(3));} points.push(p.durationSec);
  return Array.from({length:n},(_,i)=>{
    const start=points[i],end=points[i+1],ls=p.lyrics.filter(l=>l.start<end&&l.end>start),text=ls.map(l=>l.text).join(' ');
    let templateId:Shot['templateId']=scenes[(i%4)+1],action:Shot['action']='bounce',emotion:Shot['emotion']=p.character.expression;
    if(/雨|泪|孤独|难过|再见|夜/.test(text)){templateId='emotion_reaction';emotion='sad';action='sway';}
    else if(/走|路|风|花|远|山|出发/.test(text)){templateId='garden_walk';action='walk';emotion='curious';}
    else if(/星|光|梦|心|希望/.test(text)){templateId='prop_interaction';action='wave';emotion='happy';}
    else if(/跳|舞|唱|快乐|一起/.test(text)){templateId='stage_dance';action='hop';emotion='excited';}
    if(i===0){templateId='stage_intro';action='wave';}if(i===n-1){templateId='curtain_call';action='sway';}
    return {id:`shot-${i+1}`,start,end,purpose:i===0?`${p.character.name}登场，建立音乐的情绪`:i===n-1?'以星光和谢幕收束短片':`回应歌词：${text.slice(0,80)||'让动作落在节拍上'}`,templateId,action,emotion,camera:i%3===0?'push_in':i%3===1?'pan_right':'static',transition:i===n-1?'cut':'fade',lyricIds:ls.map(l=>l.id)};
  });
}
