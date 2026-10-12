export interface Material {
  path: string; url: string; name: string; title: string; summary: string;
  type: 'document' | 'image' | 'audio' | 'report'; stage: string; bytes: number;
  sha256: string; date: string | null; passed: boolean | null; checks: number | null;
}
export interface Manifest {
  project: string; source: string; commit: string; license: string;
  counts: Record<Material['type'], number>; scope: string[]; items: Material[];
}
export const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const docLink = (path: string) => './research.html?doc=' + encodeURIComponent(path);
export const reportLink = (path: string) => './evidence.html?file=' + encodeURIComponent(path) + '#reports';
export const asset = (name: string) => './research/assets/' + encodeURIComponent(name);
export async function getManifest(): Promise<Manifest> {
  const res = await fetch('./research/manifest.json');
  if (!res.ok) throw new Error('资料包加载失败，请运行 npm run research:sync 后重新构建。');
  return res.json() as Promise<Manifest>;
}
export function resolveReference(raw: string, from: string, manifest: Manifest, image = false): string | null {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('#')) return raw;
  if (/^[a-z][a-z\d+.-]*:/i.test(raw)) return null;
  const base = new URL(from, 'https://research.local/');
  const resolved = new URL(raw, base);
  if (resolved.origin !== base.origin) return null;
  const relative = decodeURIComponent(resolved.pathname.slice(1));
  const item = manifest.items.find(i => i.path === relative);
  if (item) return image || item.type === 'image' || item.type === 'audio' ? './' + item.url
    : item.type === 'report' ? reportLink(item.path) : docLink(item.path) + resolved.hash;
  // 本地代码未复制到网页，链接回固定研究版本中的上游源码。
  if (relative.startsWith('web/src/') && !relative.includes('/hub/') && !relative.includes('/showcase/') && !relative.includes('/battle/'))
    return manifest.source + '/blob/' + manifest.commit + '/' + relative.slice(4) + resolved.hash;
  return null;
}
/** 只生成转义后的 Markdown 子集；原文另可完整查看/下载，不执行原文 HTML。 */
export function markdown(text: string, from: string, manifest: Manifest): string {
  const headingCounts = new Map<string, number>();
  function inline(value: string): string {
    const tokens: string[] = [];
    const token = (html: string) => { const n = tokens.push(html) - 1; return '\u0000' + n + '\u0000'; };
    value = value.replace(/`([^`]+)`/g, (_, code: string) => token('<code>' + escape(code) + '</code>'));
    value = value.replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (_, alt: string, raw: string) => {
      const url = resolveReference(raw, from, manifest, true);
      return token(url ? '<a href="' + escape(url) + '" target="_blank" rel="noopener"><img loading="lazy" src="' + escape(url) + '" alt="' + escape(alt) + '"></a>' : escape(alt));
    });
    value = value.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label: string, raw: string) => {
      const url = resolveReference(raw, from, manifest);
      return token(url ? '<a href="' + escape(url) + '"' + (/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '') + '>' + escape(label) + '</a>'
        : '<span title="参见下载原文或本地仓库">' + escape(label) + '</span>');
    });
    value = escape(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, '$1<em>$2</em>');
    return value.replace(/\u0000(\d+)\u0000/g, (_, index: string) => tokens[Number(index)] ?? '');
  }
  const lines = text.replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n');
  const out: string[] = []; let list = '', paragraph: string[] = [];
  const flush = () => { if (paragraph.length) { out.push('<p>' + inline(paragraph.join(' ')) + '</p>'); paragraph = []; } };
  const closeList = () => { if (list) { out.push('</' + list + '>'); list = ''; } };
  const cells = (s: string) => s.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(v => inline(v.trim().replace(/\\\|/g, '|')));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      flush(); closeList(); const lang = line.trim().slice(3); const code: string[] = [];
      while (++i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i]);
      out.push('<figure class="code-block"><figcaption>' + escape(lang || '代码') + '</figcaption><pre><code>' + escape(code.join('\n')) + '</code></pre></figure>'); continue;
    }
    if (/^\s*\|/.test(line) && /^\s*\|?[\s:|\-]+\|\s*$/.test(lines[i + 1] ?? '')) {
      flush(); closeList(); const headers = cells(line); const rows: string[][] = []; i++;
      while (/^\s*\|/.test(lines[i + 1] ?? '')) rows.push(cells(lines[++i]));
      out.push('<div class="table-scroll"><table><thead><tr>' + headers.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>'
        + rows.map(row => '<tr>' + row.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>'); continue;
    }
    const h = line.match(/^(#{1,6})\s+(.+)/);
    if (h) {
      flush(); closeList();
      const base = h[2].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s/g, '-');
      const count = headingCounts.get(base) ?? 0; headingCounts.set(base, count + 1);
      const id = base + (count ? '-' + count : '');
      out.push('<h' + h[1].length + ' id="' + escape(id) + '">' + inline(h[2]) + '</h' + h[1].length + '>'); continue;
    }
    const li = line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)/);
    if (li) { flush(); const next = li[1] ? 'ul' : 'ol'; if (next !== list) { closeList(); list = next; out.push('<' + list + '>'); }
      out.push('<li>' + inline(li[2]) + '</li>'); continue; }
    if (/^\s*>/.test(line)) { flush(); closeList(); out.push('<blockquote>' + inline(line.replace(/^\s*>\s?/, '')) + '</blockquote>'); continue; }
    if (/^\s*---+\s*$/.test(line)) { flush(); closeList(); out.push('<hr>'); continue; }
    if (!line.trim()) { flush(); closeList(); continue; }
    closeList(); paragraph.push(line);
  }
  flush(); closeList(); return out.join('\n');
}

