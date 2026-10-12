import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dist,project,documents,assets} from './build-research.mjs';
const ensure=(v,m)=>{if(!v)throw Error(m)};
const manifest=JSON.parse(await fs.readFile(path.join(dist,'publication-manifest.json'),'utf8'));
for(const f of manifest.files){
 ensure(!/(^|\/)(data|node_modules|vendor|\.env|\.git)(\/|$)/.test(f.path),'发现本机运行或认证资料');
 const b=await fs.readFile(path.join(dist,f.path));
 ensure(b.length===f.bytes&&createHash('sha256').update(b).digest('hex')===f.sha256,'文件哈希不匹配：'+f.path);
}
const expected=new Set(['research.html','index.html','research.css','research.js','research-data.json','favicon.svg',...documents.map(x=>x[1]),...assets]);
ensure(expected.size===manifest.files.length,'发布白名单数量不匹配');
for(const f of manifest.files)ensure(expected.has(f.path),'白名单外文件：'+f.path);
const html=await fs.readFile(path.join(dist,'research.html'),'utf8');
const data=JSON.parse(await fs.readFile(path.join(project,'notes/research-summary.json'),'utf8'));
ensure(data.sections.length===9&&data.modules.length===9,'研究主题或模块缺失');
for(const s of data.sections){ensure(html.includes(s.title),'摘要主题未发布：'+s.title);for(const p of s.body)ensure(html.includes(p.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;")),'摘要正文缺失');}
for(const match of html.matchAll(/(?:href|src|data-doc)="\.\/([^"#?]+)"/g))ensure(expected.has(match[1]),'静态引用缺失：'+match[1]);
ensure(html.includes('手动 BPM')&&html.includes('尚未配置与实测')&&html.includes('静态站点不执行音乐上传'),'能力与部署边界缺失');
for(const f of assets){const source=await fs.readFile(path.join(project,f)),out=await fs.readFile(path.join(dist,f));ensure(source.equals(out),'原图或影片被改变：'+f);}
const media=[];
for(const [file,duration,width,height,frames] of [['local-demo-15s.mp4',15,1280,720,360],['local-demo-30s-ink.mp4',30,1920,1080,720]]){
 const target=path.join(dist,'assets',file);
 const p=JSON.parse(execFileSync(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_streams','-show_format','-of','json',target],{encoding:'utf8'}));
 const video=p.streams.find(s=>s.codec_type==='video'),audio=p.streams.find(s=>s.codec_type==='audio');
 ensure(video&&audio&&video.codec_name==='h264'&&audio.codec_name==='aac','编码或音轨不匹配');
 ensure(video.width===width&&video.height===height&&video.avg_frame_rate==='24/1'&&Number(video.nb_frames)===frames,'媒体规格不匹配');
 ensure(Math.abs(Number(video.duration)-duration)<1/24&&Math.abs(Number(audio.duration)-duration)<1/24,'音视频长度不匹配');
 execFileSync(process.env.FFMPEG_PATH||'ffmpeg',['-v','error','-i',target,'-f','null','-'],{stdio:['ignore','pipe','pipe']});
 media.push({file,duration,width,height,frames,fps:24,video:'h264',audio:'aac',fullDecode:true});
}
console.log(JSON.stringify({passed:true,files:manifest.files.length,documents:documents.length,topics:data.sections.length,paragraphs:data.sections.reduce((n,s)=>n+s.body.length,0),modules:data.modules.length,originalAssetBytesPreserved:true,media},null,2));
