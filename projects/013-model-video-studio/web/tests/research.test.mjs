import test from 'node:test';
import assert from 'node:assert/strict';
import {resources,researchCatalog,researchFile,resolveResearchFile} from '../lib/research.mjs';
import {capabilities,works,sources,searchResearch,panelTopics} from '../public/research-data.js';

test('研究入口和证据关联完整，明确区分真实成片与预留模型',async()=>{
 const catalog=await researchCatalog(),ids=new Set(capabilities.map(c=>c.id));assert.equal(ids.size,capabilities.length);
 for(const c of capabilities){assert.ok(catalog.assets[c.evidence],c.id+' 证据不存在');for(const id of c.related)assert.ok(ids.has(id),'悬空关联 '+id);if(c.audio)assert.equal(catalog.assets[c.audio]?.available,true);}
 for(const w of works){assert.equal(catalog.assets[w.asset]?.available,true,w.title+' 缺少实际视频');if(w.example)assert.ok(catalog.examples[w.example]?.projectId);}
 for(const group of sources)for(const id of group.ids)assert.ok(Object.hasOwn(resources,id),'资料标识错误 '+id);
 for(const topic of Object.values(panelTopics))assert.ok(topic==='models'||ids.has(topic));
 for(const id of ['music-model','video','lipsync'])assert.equal(capabilities.find(c=>c.id===id).status,'adapter');
 assert.ok(searchResearch('口型').some(r=>r.route==='capabilities/lipsync'));assert.ok(searchResearch('混音').some(r=>r.route==='capabilities/music'));assert.deepEqual(searchResearch('无此内容z9q9'),[]);
});
test('研究只读资源使用精确白名单，不能解析任意路径或原型属性',async()=>{
 for(const id of ['../server.mjs','../../.env','constructor','toString','__proto__','studio-music/../project.json'])assert.equal(researchFile(id),null);
 assert.ok((await resolveResearchFile('chinese-voice')).endsWith('.mp3'));assert.equal(await resolveResearchFile('unknown'),null);
 const catalog=await researchCatalog();assert.ok(!JSON.stringify(catalog).includes('apiKey'));assert.ok(!JSON.stringify(catalog).includes('F:/'));
});
