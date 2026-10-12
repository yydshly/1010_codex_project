// 从既有总览图及实拍截图制作网页缩略图；CI 使用提交的缩略图，不重新生成。
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const at = process.argv.indexOf('--sharp-module');
if (at < 0 || !process.argv[at + 1]) throw new Error('请传入 --sharp-module <sharp 包绝对路径>');
const sharp = createRequire(import.meta.url)(resolve(process.argv[at + 1]));
const assets = new URL('../../assets/', import.meta.url);
const content = JSON.parse(await readFile(new URL('../../notes/overview-content.json', import.meta.url), 'utf8'));
await sharp(fileURLToPath(new URL('research-overview.png',assets))).resize({width:960}).webp({quality:85}).toFile(fileURLToPath(new URL('research-guide.webp',assets)));
for (const [i,item] of [...content.original.shots,content.original.before,content.extension.proof].entries()) {
  const [left,top,width,height] = item.crop;
  const name = i < 3 ? 'effect-'+i : i === 3 ? 'effect-before' : 'extension-complete';
  await sharp(fileURLToPath(new URL(item.file,assets))).extract({left,top,width,height}).webp({quality:88}).toFile(fileURLToPath(new URL(name+'.webp',assets)));
}
console.log('已生成既有引导图缩略预览与 5 张真实截图裁切，原始文件保持不变。');
