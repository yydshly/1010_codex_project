import { mkdir,writeFile } from 'node:fs/promises';
// 原创合成伴奏：30 秒，120 BPM，单声道 PCM；不包含人声或外部素材。
const rate=44100,duration=30,n=rate*duration,pcm=Buffer.alloc(n*2),notes=[261.63,329.63,392,523.25,440,392,329.63,293.66];
for(let i=0;i<n;i++){
  const t=i/rate,beat=t*2,phase=beat%1,idx=Math.floor(beat)%notes.length,f=notes[idx],env=Math.exp(-phase*7),fade=Math.min(1,t/1.2,(duration-t)/1.5);
  const melody=(Math.sin(2*Math.PI*f*t)+.23*Math.sin(4*Math.PI*f*t))*.21*env;
  const bass=Math.sin(2*Math.PI*(idx<4?130.815:110)*t)*.10*Math.exp(-phase*4);
  const kick=Math.sin(2*Math.PI*(52*t+6*(1-Math.exp(-phase*10))))*.17*Math.exp(-phase*17);
  pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,(melody+bass+kick)*fade))*32767),i*2);
}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(pcm.length+36,4);header.write('WAVE',8);header.write('fmt ',12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
await mkdir('public',{recursive:true});await writeFile('public/demo.wav',Buffer.concat([header,pcm]));
console.log('原创示例伴奏 public/demo.wav：30 秒 / 120 BPM / 无人声');
