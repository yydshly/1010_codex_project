import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const catalogPath = path.join(root, 'projects.json');
export const readmePath = path.join(root, 'README.md');
export const startMarker = '<!-- PROJECTS:START -->';
export const endMarker = '<!-- PROJECTS:END -->';
export const statuses = {
  planned: '待研究',
  researching: '研究中',
  'demo-ready': '演示可用',
  archived: '已归档',
};

export function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

export function numberFor(project) {
  return String(project.id).padStart(3, '0');
}

export function directoryFor(project) {
  return `${numberFor(project)}-${project.slug}`;
}

function textField(value, label) {
  ensure(typeof value === 'string' && value.trim().length > 0, `${label} 必须是非空文本`);
  ensure(!/[\r\n]/.test(value), `${label} 必须写在一行内`);
}

function validateUrl(value, label, upstream = false) {
  textField(value, label);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} 必须是有效 URL`);
  }
  ensure(url.protocol === 'https:' && !url.username && !url.password && !url.port,
    `${label} 必须使用 HTTPS，且不包含账号密码或自定义端口`);
  if (upstream) {
    ensure(url.hostname === 'github.com' && /^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)
      && !url.search && !url.hash, `${label} 必须指向 GitHub 仓库，如 https://github.com/owner/repo`);
  }
}

export function validateCatalog(catalog, { checkFiles = true } = {}) {
  ensure(catalog && catalog.version === 1 && Array.isArray(catalog.projects),
    'projects.json 必须包含 version: 1 和 projects 数组');
  const ids = new Set();
  const slugs = new Set();
  for (const project of catalog.projects) {
    ensure(project && typeof project === 'object', '项目条目必须是对象');
    ensure(Number.isSafeInteger(project.id) && project.id > 0, '项目 id 必须是正整数');
    ensure(!ids.has(project.id), `重复项目编号：${project.id}`);
    ensure(typeof project.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug),
      `项目 ${project.id} 的 slug 必须是小写英文、数字和单连字符`);
    ensure(!slugs.has(project.slug), `重复项目短名：${project.slug}`);
    ids.add(project.id);
    slugs.add(project.slug);
    const label = directoryFor(project);
    textField(project.name, `${label}.name`);
    textField(project.summary, `${label}.summary`);
    if (project.summarySections !== undefined) {
      ensure(Array.isArray(project.summarySections) && project.summarySections.length > 0,
        `${label}.summarySections 必须是非空分区数组`);
      for (const section of project.summarySections) {
        textField(section.title, `${label}.summarySections.title`);
        ensure(Array.isArray(section.body) && section.body.length > 0,
          `${label}.summarySections.body 必须是非空段落数组`);
        section.body.forEach(text => textField(text, `${label}.summarySections.body`));
        if (section.labels !== undefined) {
          ensure(Array.isArray(section.labels) && section.labels.length === section.body.length, `${label}.summarySections.labels 必须与段落数量一致`);
          section.labels.forEach(text => textField(text, `${label}.summarySections.labels`));
        }
      }
    }
    ensure(project.sourceKind === undefined || ['upstream', 'inspiration', 'product'].includes(project.sourceKind),
      `${label}.sourceKind 只能是 upstream、inspiration 或 product`);
    validateUrl(project.source, `${label}.source`, project.sourceKind !== 'product');
    ensure(Object.hasOwn(statuses, project.status), `${label}.status 不在支持的状态列表内`);
    ensure(Array.isArray(project.tags), `${label}.tags 必须是数组`);
    project.tags.forEach((tag) => textField(tag, `${label}.tags`));
    ensure(new Set(project.tags).size === project.tags.length, `${label}.tags 含重复标签`);
    ensure(project.demo === null || typeof project.demo === 'string', `${label}.demo 必须是 URL 或 null`);
    if (project.demo !== null) validateUrl(project.demo, `${label}.demo`);
    ensure(project.status !== 'demo-ready' || project.demo !== null, `${label} 标记演示可用时必须填写 demo`);
    ensure(project.cover === null || (project.cover && typeof project.cover === 'object'),
      `${label}.cover 必须是图片对象或 null`);
    if (project.cover !== null) {
      const { path: coverPath, alt } = project.cover;
      textField(alt, `${label}.cover.alt`);
      ensure(typeof coverPath === 'string' && coverPath.startsWith(`projects/${label}/assets/`)
        && /^[a-zA-Z0-9._/-]+$/.test(coverPath)
        && !coverPath.split('/').some((part) => !part || part === '.' || part === '..')
        && /\.(png|jpe?g|webp|gif|svg)$/i.test(coverPath),
      `${label}.cover.path 必须是本项目 assets 下的图片路径（使用 /，不含空格）`);
      if (checkFiles) {
        const imagePath = path.join(root, coverPath);
        ensure(existsSync(imagePath) && statSync(imagePath).isFile(), `图片不存在：${coverPath}`);
      }
    }
    if (checkFiles) {
      const projectReadme = path.join(root, 'projects', label, 'README.md');
      ensure(existsSync(projectReadme) && statSync(projectReadme).isFile(), `子项目 README 不存在：projects/${label}/README.md`);
    }
  }
  return [...catalog.projects].sort((a, b) => a.id - b.id);
}

export function loadCatalog() {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  validateCatalog(catalog);
  return catalog;
}

function markdown(value) {
  return value.replace(/[\\`*_[\]<>|]/g, '\\$&');
}

function html(value) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function linkUrl(value) {
  return new URL(value).href.replace(/\(/g, '%28').replace(/\)/g, '%29');
}

export function renderIndex(catalog) {
  const projects = validateCatalog(catalog);
  const lines = [startMarker, '## 项目索引', '', `已收录 **${projects.length}** 个项目，按固定编号升序展示。`, ''];
  if (projects.length === 0) {
    lines.push('暂无研究条目。第一个项目将分配编号 `001`。');
  } else {
    lines.push('| 序号 | 项目 | 研究摘要 | 状态 | 演示 |', '| --- | --- | --- | --- | --- |');
    for (const project of projects) {
      const directory = directoryFor(project);
      const demo = project.demo ? `[访问演示](${linkUrl(project.demo)})` : '—';
      const sourceLabel = project.sourceKind === 'product' ? '官方产品' : project.sourceKind === 'inspiration' ? '灵感参考' : '上游';
      lines.push(`| ${numberFor(project)} | [${markdown(project.name)}](projects/${directory}/README.md) · [${sourceLabel}](${linkUrl(project.source)}) | ${markdown(project.summary)} | ${statuses[project.status]} | ${demo} |`);
    }
    lines.push('', '### 项目预览', '');
    for (const project of projects) {
      lines.push(`#### ${numberFor(project)} · ${markdown(project.name)}`, '', markdown(project.summary), '');
      for (const section of project.summarySections || []) {
        const paragraphs = section.labels
          ? section.body.flatMap((text, i) => [`- **${markdown(section.labels[i])}：** ${markdown(text)}`, ''])
          : section.body.map(text => `- ${markdown(text)}`);
        lines.push(`##### ${markdown(section.title)}`, '', ...paragraphs, '');
      }
      if (project.tags.length) lines.push(`标签：${project.tags.map(markdown).join(' · ')}`, '');
      if (project.cover) {
        lines.push(`<img src="${project.cover.path}" alt="${html(project.cover.alt)}" width="640" />`, '', markdown(project.cover.alt), '');
      } else {
        lines.push('截图待补充。', '');
      }
      const sourceLabel = project.sourceKind === 'product' ? '官方产品' : project.sourceKind === 'inspiration' ? '灵感参考' : '上游仓库';
      lines.push(`[研究说明](projects/${directoryFor(project)}/README.md) · [${sourceLabel}](${linkUrl(project.source)})${project.demo ? ` · [在线演示](${linkUrl(project.demo)})` : ''}`, '');
    }
  }
  lines.push('', endMarker);
  return lines.join('\n');
}

export function updateReadme(readme, catalog) {
  const start = readme.indexOf(startMarker);
  const end = readme.indexOf(endMarker);
  ensure(start >= 0 && end > start
    && readme.indexOf(startMarker, start + 1) === -1
    && readme.indexOf(endMarker, end + 1) === -1, '根 README 必须包含且只包含一组 PROJECTS 标记');
  return readme.slice(0, start) + renderIndex(catalog) + readme.slice(end + endMarker.length);
}
