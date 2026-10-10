import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { catalogPath, directoryFor, ensure, loadCatalog, numberFor, readmePath, root, updateReadme, validateCatalog } from './lib.mjs';

try {
  const { values } = parseArgs({
    options: {
      slug: { type: 'string' },
      name: { type: 'string' },
      source: { type: 'string' },
      summary: { type: 'string' },
      tags: { type: 'string', default: '' },
      help: { type: 'boolean', default: false },
    },
  });
  if (values.help) {
    console.log('用法：node scripts/new-project.mjs --slug repo-name --name "项目名称" --source "https://github.com/owner/repo" --summary "研究摘要" [--tags "标签一,标签二"]');
  } else {
    const catalog = loadCatalog();
    const id = catalog.projects.reduce((max, project) => Math.max(max, project.id), 0) + 1;
    const project = {
      id,
      slug: values.slug,
      name: values.name,
      summary: values.summary,
      source: values.source,
      status: 'planned',
      tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      cover: null,
      demo: null,
    };
    const nextCatalog = { ...catalog, projects: [...catalog.projects, project] };
    validateCatalog(nextCatalog, { checkFiles: false });
    const directory = directoryFor(project);
    const destination = path.join(root, 'projects', directory);
    ensure(!existsSync(destination), `目录已存在，拒绝覆盖：projects/${directory}`);
    const readme = readFileSync(readmePath, 'utf8');
    // Validate root markers before creating files.
    updateReadme(readme, catalog);
    const variables = { ...project, number: numberFor(project), directory };
    const files = [];
    const templateRoot = path.join(root, 'templates', 'project');
    function collect(directoryPath) {
      for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
        const file = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) collect(file);
        else files.push(file);
      }
    }
    collect(templateRoot);
    // Prepare every text file before mutating the repository.
    const renderedFiles = files.map((file) => ({
      relative: path.relative(templateRoot, file),
      content: readFileSync(file, 'utf8').replace(/\{\{(\w+)\}\}/g, (_, key) => {
        ensure(Object.hasOwn(variables, key), `未知模板变量：${key}`);
        return String(variables[key]);
      }),
    }));
    cpSync(templateRoot, destination, { recursive: true, errorOnExist: true, force: false });
    for (const file of renderedFiles) writeFileSync(path.join(destination, file.relative), file.content, 'utf8');
    writeFileSync(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`, 'utf8');
    writeFileSync(readmePath, updateReadme(readme, nextCatalog), 'utf8');
    console.log(`已创建 projects/${directory}/，并同步根 README。下一步：补充研究内容，运行 npm run check。`);
  }
} catch (error) {
  console.error(`创建失败：${error.message}`);
  process.exitCode = 1;
}
