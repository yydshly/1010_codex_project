/** 在 Node 中加载纯规则 TS（不引入 Three.js），供规则和浏览器验收共用。 */
import fs from 'node:fs';
import ts from 'typescript';
const compile = file => ts.transpileModule(fs.readFileSync(new URL('../src/battle/' + file, import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText + `\n//# sourceURL=${file}.js`;
const url = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const airport = url(compile('airport.ts'));
export const battleModule = await import(url(compile('game.ts').replace("from './airport'", `from '${airport}'`)));
export const airportModule = await import(airport);
