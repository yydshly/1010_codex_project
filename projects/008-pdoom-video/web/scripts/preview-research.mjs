import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist-public/',import.meta.url));
const port=Number(process.env.RESEARCH_PORT||5198),base='/1010_codex_project/008-pdoom-video/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.ts':'text/plain; charset=utf-8','.lrc':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4'};
const server=http.createServer(async(req,res)=>{
 try{
  let rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(rel.startsWith(base))rel=rel.slice(base.length);else rel=rel.replace(/^\/+/,'');
  if(!rel||rel==='research')rel='research.html';
  const f=path.resolve(root,rel);if(!f.startsWith(root)||rel.split('/').includes('..')){res.writeHead(403).end();return}
  const bytes=await fs.readFile(f);const headers={'Content-Type':types[path.extname(f)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
  const range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;if(start> end){res.writeHead(416,{'Content-Range':'bytes */'+bytes.length}).end();return}res.writeHead(206,{...headers,'Content-Range':'bytes '+start+'-'+end+'/'+bytes.length,'Content-Length':end-start+1});if(req.method==='HEAD')res.end();else res.end(bytes.subarray(start,end+1));}
  else{res.writeHead(200,{...headers,'Content-Length':bytes.length});if(req.method==='HEAD')res.end();else res.end(bytes);}
 }catch{res.writeHead(404).end('Not found')}
});
server.listen(port,'127.0.0.1',()=>console.log('008 研究预览 http://127.0.0.1:'+port+base+'research.html'));
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
