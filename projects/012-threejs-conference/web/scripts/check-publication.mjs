import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const web=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(web,'dist'),project=path.dirname(web),sources=new URL('../../../001-sakura-crossing/assets/scene-map-export.json',import.meta.url);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const page of ['research.html','index.html','minimal.html','verification.html'])if(!fs.existsSync(path.join(dist,page)))throw Error('发布缺少页面 '+page);
const files=[];
function visit(directory){for(const item of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,item.name),relative=path.relative(dist,file).split(path.sep).join('/');if(item.isDirectory())visit(file);else{if(/(^|\/)(vendor|node_modules|\.env|\.cache|\.kit-smoke)(\/|$)/.test(relative)||/\.(?:glb|gltf|hdr|mp3|mp4)$/i.test(relative))throw Error('意外发布上游素材/本机文件 '+relative);const bytes=fs.readFileSync(file);files.push({path:relative,bytes:bytes.length,sha256:hash(bytes)});}}}
visit(dist);
files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
const packageBytes=fs.readFileSync(path.join(dist,'downloads/research-rain-kit-0.1.0.tgz'));
if(hash(packageBytes)!=='e72613d271757f8b17c641fd61cdec3f8085bd9a79304ba8990d88a489008643')throw Error('模块安装包发生变化');
const guide=fs.readFileSync(path.join(project,'assets/scene-map-guide.webp'));
const map=JSON.parse(fs.readFileSync(sources,'utf8'));
if(hash(guide)!==map.previewSha256)throw Error('未使用既有联合全图预览');
if(!files.some(item=>item.path.endsWith('.webp')&&item.sha256===map.previewSha256))throw Error('引导图未进入发布产物');
const manifest={version:1,project:'012-threejs-conference',scope:'中文研究、原始资料、原创雨夜/最小接入/GPU现场；原库城市与模型后端不公开',guideSha256:map.previewSha256,packageSha256:hash(packageBytes),files};
fs.writeFileSync(path.join(dist,'publication-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`发布白名单通过：${files.length} 项静态文件，既有全图预览与固定 tgz 一致，无原城市素材。`);
