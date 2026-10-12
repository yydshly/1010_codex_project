import http from 'node:http';
import {stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const webRoot=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2), built=args.includes('--dist');
const portIndex=args.indexOf('--port'), port=portIndex<0?4317:Number(args[portIndex+1]);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('无效端口');
const root=path.resolve(built?path.join(webRoot,'dist'):webRoot);
const assetRoot=built?path.join(root,'assets'):path.resolve(webRoot,'../assets');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4','.vtt':'text/vtt; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const asset=pathname.startsWith('/assets/'), base=asset?assetRoot:root;
    const relative=asset?pathname.slice(8):pathname==='/'?'index.html':pathname.slice(1);
    const target=path.resolve(base,relative);
    if(target!==base&&!target.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
    const info=await stat(target);
    if(!info.isFile()){res.writeHead(404);res.end();return;}
    const headers={'Content-Type':types[path.extname(target).toLowerCase()]??'application/octet-stream','Cache-Control':'no-store','Accept-Ranges':'bytes'};
    let start=0,end=info.size-1,status=200;
    if(req.headers.range&&req.method==='GET'){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(match&&(match[1]||match[2])){
        if(!match[1])start=Math.max(0,info.size-Number(match[2]));
        else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
      }
      if(!match||(!match[1]&&!match[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=info.size){
        res.writeHead(416,{...headers,'Content-Range':`bytes */${info.size}`});res.end();return;
      }
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=info.size===0?0:end-start+1;
    res.writeHead(status,headers);
    if(req.method==='HEAD'||info.size===0){res.end();return;}
    const stream=createReadStream(target,{start,end});
    stream.on('error',()=>res.destroy());
    res.on('close',()=>stream.destroy());
    stream.pipe(res);
  }catch{res.writeHead(404);res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>console.log('本机预览：http://127.0.0.1:'+port+(built?' / 构建产物':'')));
