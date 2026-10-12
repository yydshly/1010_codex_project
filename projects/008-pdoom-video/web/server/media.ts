import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
export const ffmpeg=()=>process.env.FFMPEG_PATH||'ffmpeg';
export async function command(exe:string,args:string[],signal?:AbortSignal,timeout=120000){
  return new Promise<string>((resolve,reject)=>{
    const child=spawn(exe,args,{windowsHide:true,signal});let output='';
    const append=(b:Buffer)=>{output=(output+b.toString()).slice(-16000);};child.stdout.on('data',append);child.stderr.on('data',append);
    const timer=setTimeout(()=>{child.kill();reject(new Error(`${path.basename(exe)} 执行超时`));},timeout);
    child.once('error',e=>{clearTimeout(timer);reject(new Error(signal?.aborted?'任务已取消':`无法执行 ${path.basename(exe)}：${e.message}`));});
    child.once('exit',code=>{clearTimeout(timer);code===0?resolve(output):reject(new Error(signal?.aborted?'任务已取消':`${path.basename(exe)} 退出码 ${code}：${output.slice(-1800)}`));});
  });
}
export async function probe(file:string){
  const result=JSON.parse(await command(process.env.FFPROBE_PATH||'ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));
  return result as {streams:Array<{codec_type:string,codec_name:string,width?:number,height?:number,nb_frames?:string,duration?:string,r_frame_rate?:string}>,format:{duration:string,format_name:string,size:string}};
}
export async function chromePath(){
  const candidates=[process.env.CHROME_PATH,process.env.PROGRAMFILES&&path.join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)']!,'Microsoft/Edge/Application/msedge.exe'),process.env.LOCALAPPDATA&&path.join(process.env.LOCALAPPDATA,'Google/Chrome/Application/chrome.exe'),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean) as string[];
  for(const candidate of candidates){try{await access(candidate);return candidate;}catch{}}
  throw new Error('未找到 Chrome / Edge，请在 .env 中设置 CHROME_PATH');
}
