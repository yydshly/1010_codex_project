import type { Lyric } from './project';
// 带时间歌词以原音频为坐标；导入时转换成片段相对时间。TXT 只估计时间。
export function parseLyrics(text:string,format:string,duration:number,sourceStart=0):Lyric[] {
  if(text.length>50000)throw new Error('歌词过长，最多 50,000 字符');
  const clean=text.replace(/^\uFEFF/,'').trim(); if(!clean)return [];
  let rows:{start:number,end?:number,text:string}[]=[];
  let timingSource:Lyric['timingSource']='estimated';
  if(format==='srt'||clean.includes('-->')){
    timingSource='srt';
    for(const block of clean.split(/\r?\n\s*\r?\n/)){
      const lines=block.split(/\r?\n/);const i=lines.findIndex(l=>l.includes('-->'));if(i<0)continue;
      const stamp=(s:string)=>{const m=s.trim().match(/^(\d+):(\d{2}):(\d{2})[,.](\d{3})/);if(!m)throw new Error('SRT 时间格式无效');return +m[1]*3600+ +m[2]*60+ +m[3]+ +m[4]/1000;};
      const [a,b]=lines[i].split('-->');const words=lines.slice(i+1).join(' ').replace(/<[^>]*>/g,'').trim();
      if(words)rows.push({start:stamp(a),end:stamp(b),text:words});
    }
    if(!rows.length)throw new Error('未找到有效 SRT 字幕');
  }else if(format==='lrc'||/\[\d+:\d+/.test(clean)){
    timingSource='lrc';const offset=Number(clean.match(/\[offset:([+-]?\d+)\]/i)?.[1]??0)/1000;
    for(const line of clean.split(/\r?\n/)){
      const matches=[...line.matchAll(/\[(\d+):(\d{2})(?:[.:](\d{1,3}))?\]/g)];
      const words=line.replace(/\[[^\]]*\]/g,'').trim();if(!words)continue;
      for(const m of matches)rows.push({start:+m[1]*60+ +m[2]+Number(`0.${m[3]??0}`)+offset,text:words});
    }
    rows.sort((a,b)=>a.start-b.start);
    if(!rows.length)throw new Error('未找到有效 LRC 歌词时间');
    rows=rows.map((r,i)=>({...r,end:rows[i+1]?.start??sourceStart+duration}));
  }else{
    const lines=clean.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const total=lines.reduce((sum,l)=>sum+Math.max(4,l.length),0);let t=0;
    rows=lines.map(l=>{const start=t;t+=duration*Math.max(4,l.length)/total;return {start,end:t,text:l};});
  }
  const base=timingSource==='estimated'?0:sourceStart;
  const result=rows.map(r=>({...r,start:Math.max(0,r.start-base),end:Math.min(duration,(r.end??duration+base)-base)})).filter(r=>r.end>r.start).map((r,i)=>({id:`line-${i+1}`,start:+r.start.toFixed(3),end:+r.end.toFixed(3),text:r.text,timingSource}));
  if(!result.length)throw new Error('所选片段没有歌词，请检查时间戳或选段');
  for(let i=0;i<result.length;i++){if(result[i].text.length>300)throw new Error('单句歌词最多 300 字');if(i&&result[i].start<result[i-1].end)throw new Error('歌词时间重叠，请先修正原文件');}
  if(result.length>100)throw new Error('片段歌词最多 100 句');
  return result;
}
