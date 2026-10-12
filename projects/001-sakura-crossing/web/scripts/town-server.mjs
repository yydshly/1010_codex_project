import { createDirector } from './town-director.mjs';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { CodexBridge, loadMiniMax, miniMaxDecision } from './town-providers.mjs';
import { createGame, tick, log, movePlayer, interact, ward, publicState, rulesPlan, applyPlan } from '../src/game/engine.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.TOWN_PORT || 5197), games=new Map(), controllers=new Map();
const bridge=new CodexBridge(path.join(root,'.cache','town-model'));
let codex={available:false,model:null,error:'正在连接本机 Codex'}, miniConfig, minimax={available:false,model:null,error:'未配置'};
bridge.start().then(s=>{codex=s; console.log(`OpenAI ready: ${s.model}`);}).catch(()=>{codex={available:false,model:null,error:'本机 Codex 未就绪，请检查 CLI 登录'};});
loadMiniMax(process.env.TOWN_MINIMAX_ENV || 'F:/codex_project/.env.minimax').then(c=>{miniConfig=c;minimax={available:true,model:c.model};}).catch(()=>{});
const json=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req) {
  let bytes=0, raw=''; for await(const chunk of req) {bytes+=chunk.length;if(bytes>6000)throw new Error('请求过长');raw+=chunk;} return raw ? JSON.parse(raw) : {};
}
const plan=createDirector({availability:mode=>mode==='codex'?codex:minimax,controllers,decide:(mode,system,prompt,signal,schema)=>mode==='codex'?bridge.decide(system,prompt,signal,schema):miniMaxDecision(miniConfig,system+'\nJSON schema: '+JSON.stringify(schema),prompt,signal)});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,`http://127.0.0.1:${port}`);
    if(req.headers.host!==`127.0.0.1:${port}` && req.headers.host!==`localhost:${port}`)return json(res,{error:'仅允许本机访问'},403);
    if(req.method==='POST' && req.headers.origin && ![`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(req.headers.origin))return json(res,{error:'来源不匹配'},403);
    if(url.pathname==='/api/town/status')return json(res,{codex,minimax,limit:10,interval:45,port});
    if(url.pathname==='/api/town/games' && req.method==='POST') {
      const data=await body(req);const mode=['rules','codex','minimax'].includes(data.mode)?data.mode:'rules';
      if(data.previous){controllers.get(data.previous)?.abort();games.delete(data.previous);}
      if(games.size>=20)return json(res,{error:'请先关闭旧局'},429);
      const g=createGame(randomUUID(),mode);games.set(g.id,g);if(mode==='rules')applyPlan(g,rulesPlan(g));
      else plan(g).catch(error=>{g.error=error.message;});return json(res,publicState(g));
    }
    const match=url.pathname.match(/^\/api\/town\/games\/([a-f0-9-]+)(?:\/(\w+))?$/);
    if(match) {
      const g=games.get(match[1]);if(!g)return json(res,{error:'这局已结束，请新建游戏'},404);
      const action=match[2]||'state';g.seenAt=Date.now();
      if(req.method==='GET')return json(res,publicState(g));
      const data=await body(req);
      if(action==='start' && g.phase==='ready' && !g.pending) {if(g.mode!=='rules' && !g.decisions.some(d=>d.status==='applied'))return json(res,{error:'尚未取得模型策略，请重试或选规则模式'},409);g.phase='playing';g.paused=false;g.nextPlan=45;log(g,'你','进入樱街，开始守灯');}
      else if(action==='pause')g.paused=Boolean(data.paused);
      else if(action==='move')movePlayer(g,Number(data.x),Number(data.z));
      else if(action==='interact')interact(g,String(data.target));
      else if(action==='ward')ward(g);
      else if(action==='plan') {
        if(!['ready','playing'].includes(g.phase))return json(res,{error:'本局已经结束'},409);
        const request=String(data.request||'').slice(0,240);if(!request.trim())return json(res,{error:'请写一句分工或角色对话'},400);
        if(g.pending)return json(res,{error:'模型正在处理上一轮'},409);
        if(g.calls>=10)return json(res,{error:'本局10轮已用完，现有策略继续执行'},429);
        if(g.lastRequestAt && Date.now()-g.lastRequestAt<10000)return json(res,{error:'两轮命令间隔至少10秒'},429);
        plan(g,request).catch(error=>{g.error=error.message;});
      } else if(action==='cancel'){controllers.get(g.id)?.abort();}
      return json(res,publicState(g));
    }
    if(req.method!=='GET' && req.method!=='HEAD')return json(res,{error:'不支持的请求'},405);
    const relative=decodeURIComponent(url.pathname==='/'?'/game.html':url.pathname);
    const file=path.resolve(root,'dist','.'+relative), dist=path.join(root,'dist');
    if(!file.startsWith(dist+path.sep))return json(res,{error:'路径不合法'},403);
    const info=await stat(file);if(!info.isFile())return json(res,{error:'文件不存在'},404);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch(error){json(res,{error:error.code==='ENOENT'?'页面尚未构建，请先运行 npm run build':'请求处理失败'},error.code==='ENOENT'?404:400);}
});
setInterval(()=>{
  const now=Date.now();for(const [id,g]of games){
    const elapsed=(now-g.lastTickAt)/1000;g.lastTickAt=now;
    if(g.seenAt && now-g.seenAt>6000)g.paused=true;
    tick(g,elapsed);
    if(g.mode!=='rules' && g.phase==='playing' && !g.paused && !g.pending && g.calls<10 && g.time>=g.nextPlan)plan(g).catch(()=>{g.nextPlan=g.time+45;});
    if(now-(g.seenAt||Date.parse(g.startedAt))>1800000){controllers.get(id)?.abort();games.delete(id);}
  }
},100).unref();
server.listen(port,'127.0.0.1',()=>console.log(`樱街守灯夜 http://127.0.0.1:${port}/game.html`));
function shutdown(){for(const c of controllers.values())c.abort();bridge.close();server.close();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
