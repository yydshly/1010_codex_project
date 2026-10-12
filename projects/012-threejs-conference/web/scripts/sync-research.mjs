import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),data=JSON.parse(fs.readFileSync(path.join(root,'notes/research-summary.json'),'utf8'));
if(data.version!==1||data.sections.length!==9||data.modules.length!==4||new Set(data.sections.map(item=>item.id)).size!==9||!/^[a-f0-9]{40}$/.test(data.source.commit))throw Error('完整研究内容结构错误');
if(data.sections.some(item=>item.paragraphs.length<4))throw Error('每项摘要需保留完整正文');
const body=[`# ${data.title}`,'',`更新：${data.updatedAt}。${data.summary}`,'',...data.sections.flatMap(item=>[`## ${item.title}`,'',...item.paragraphs.flatMap(text=>[text,''])]),'## 四模块实际接口','',...data.modules.flatMap(item=>[`### ${item.name} · ${item.api}`,'',`宿主输入：${item.input}。`,'',`输出与更新：${item.output}。`,'',`实际状态：${item.state}。`,'']),`固定来源：[研究 commit](${data.source.url}/tree/${data.source.commit})。${data.source.license}`,''].join('\n');
const block=['<!-- RESEARCH:START -->','## 完整中文摘要（2026-10-12）','',...data.sections.flatMap(item=>[`### ${item.title}`,'',...item.paragraphs.flatMap(text=>[text,''])]),'<!-- RESEARCH:END -->'].join('\n');
const readmePath=path.join(root,'README.md');let readme=fs.readFileSync(readmePath,'utf8').replace(/\r\n/g,'\n');
const pattern=/<!-- RESEARCH:START -->[\s\S]*?<!-- RESEARCH:END -->/;
const updated=pattern.test(readme)?readme.replace(pattern,block):readme.replace(/^(# .+\n)/,`$1\n${block}\n`);
const outputPath=path.join(root,'notes/research-summary.md');
if(process.argv.includes('--check')){if(!fs.existsSync(outputPath)||fs.readFileSync(outputPath,'utf8')!==body||readme!==updated)throw Error('完整研究摘要未同步，请运行 research:sync');console.log('研究摘要一致：9 主题、36 段、4 模块与 README。');}
else{fs.writeFileSync(outputPath,body);fs.writeFileSync(readmePath,updated);console.log('已同步完整摘要与项目 README。');}
