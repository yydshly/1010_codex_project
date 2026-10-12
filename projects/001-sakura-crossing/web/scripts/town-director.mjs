import { log, observation, publicState, rulesPlan, applyPlan, validatePlan, SYSTEM, townSchema } from '../src/game/engine.mjs';

export function createDirector({availability,decide,controllers=new Map(),minimumInterval=10000}) {
return async function plan(g,request='',isCorrection=false) {
  if(g.mode==='rules') {applyPlan(g,rulesPlan(g)); if(request)log(g,'规则调度','规则模式无法理解自然语言，继续执行固定分工','dialogue'); return;}
  if(g.pending)throw new Error('上一轮模型仍在思考');
  if(g.calls>=10)throw new Error('本局已用完10轮模型决策；现有角色策略继续执行');
  if(g.lastRequestAt && Date.now()-g.lastRequestAt<minimumInterval)throw new Error('请等10秒再提交下一次命令');
  const provider=availability(g.mode);if(!provider.available)throw new Error(provider.error||'模型不可用');
  g.pending=true;g.error='';g.calls++;g.lastRequestAt=Date.now();g.nextPlan=g.time+45;
  const input=observation(g,request), controller=new AbortController();controllers.set(g.id,controller);
  const timeout=setTimeout(()=>controller.abort(),50000);const record={number:g.calls,source:g.mode,input,requestedAt:new Date().toISOString(),status:'thinking'};
  g.decisions.push(record);log(g,'AI 导演',request?`收到命令：${request}`:'观察小镇，调整下一阶段分工','request');
  let received=false,correction='';
  try {
    const prompt=JSON.stringify(input);
    const output=await decide(g.mode,SYSTEM,prompt,controller.signal,townSchema);
    if(controller.signal.aborted)throw new Error('模型请求已取消');
    received=true;Object.assign(record,{raw:output.text,model:output.model,ms:output.ms,usage:output.usage});
    const raw=output.text.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');
    const parsed=validatePlan(JSON.parse(raw));Object.assign(record,{raw:output.text,plan:parsed,model:output.model,ms:output.ms,usage:output.usage});
    if(g.phase!=='ready' && g.phase!=='playing') {record.status='discarded';record.note='本局已结束';return;}
    if(g.time-input.time>35) {record.status='discarded';record.note='观察已超过35秒，弃用过时决策';log(g,'AI 导演',record.note);return;}
    record.application=applyPlan(g,parsed,output.model);record.status='applied';
    log(g,'模型',`${output.model} · ${(output.ms/1000).toFixed(1)}秒 · 第${g.calls}/10轮`,'model');
  } catch(error) {record.status='failed';record.error=error.name==='AbortError'?'模型等待超时或已取消':error.message;g.error=record.error;log(g,'模型',record.error,'error');
    if(received&&!isCorrection&&!controller.signal.aborted&&['ready','playing'].includes(g.phase)&&g.calls<10&&Date.now()-g.lastRequestAt>=minimumInterval){
      correction=`上一轮输出被执行器拒绝：${record.error}。请根据当前状态纠正。fetch 只可配 shop，follow 只可配 player，repair/guard 只可配 west/plaza/east。原命令：${request||'根据小镇状态调整分工'}。`;
      record.correctionScheduled=true;
    }
  }
  finally {clearTimeout(timeout);controllers.delete(g.id);g.pending=false;}
  if(correction)await plan(g,correction,true);
};
}
