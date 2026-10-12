/** Tiny DOM helpers and the icon set (1.4 px stroke, 16 px grid). */

export type Child = Node | string | number | null | undefined | false | Child[];

export function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/**
 * h('button', { class: 'btn', onclick: fn, disabled: true }, 'Label')
 * Keys starting with "on" + a function become listeners; booleans/numbers set properties;
 * strings become attributes; null/undefined/false are skipped.
 */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, unknown> | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') el.style.cssText = String(v);
      else if (k === 'dataset') Object.assign(el.dataset, v as Record<string, string>);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (typeof v === 'boolean' || typeof v === 'number') (el as unknown as Record<string, unknown>)[k] = v;
      else el.setAttribute(k, String(v));
    }
  }
  append(el, children);
  return el;
}

export function clear(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

const ICONS = {
  undo: '<path d="M5.5 3.8 2.8 6.5l2.7 2.7"/><path d="M2.8 6.5h6.6a3.6 3.6 0 0 1 0 7.2H7"/>',
  redo: '<path d="m10.5 3.8 2.7 2.7-2.7 2.7"/><path d="M13.2 6.5H6.6a3.6 3.6 0 0 0 0 7.2H9"/>',
  focus: '<path d="M2.5 5.5v-3h3M10.5 2.5h3v3M13.5 10.5v3h-3M5.5 13.5h-3v-3"/><circle cx="8" cy="8" r="1.9"/>',
  home: '<path d="M2.8 8.2A5.3 5.3 0 1 0 4.4 4.4"/><path d="M2.6 2.4v3.1h3.1"/>',
  eyeOff: '<path d="M2 8s2.2-4.3 6-4.3S14 8 14 8s-2.2 4.3-6 4.3S2 8 2 8Z"/><circle cx="8" cy="8" r="1.8"/><path d="m3 13 10-10"/>',
  eye: '<path d="M2 8s2.2-4.3 6-4.3S14 8 14 8s-2.2 4.3-6 4.3S2 8 2 8Z"/><circle cx="8" cy="8" r="1.8"/>',
  layout: '<rect x="2.5" y="2.5" width="4.4" height="4.4" rx=".8"/><rect x="9.1" y="2.5" width="4.4" height="4.4" rx=".8"/><rect x="2.5" y="9.1" width="4.4" height="4.4" rx=".8"/><rect x="9.1" y="9.1" width="4.4" height="4.4" rx=".8"/>',
  trash: '<path d="M2.8 4.4h10.4M6.4 4.4V2.8h3.2v1.6M4.3 4.4l.6 8.8h6.2l.6-8.8"/>',
  eraser: '<path d="M3 13.2h10"/><path d="m3.7 9.8 5.9-6.3 3.1 2.9-5.2 5.6H5.2z"/>',
  search: '<circle cx="7" cy="7" r="4.3"/><path d="m10.3 10.3 3.2 3.2"/>',
  plus: '<path d="M8 3.3v9.4M3.3 8h9.4"/>',
  minus: '<path d="M3.3 8h9.4"/>',
  chevDown: '<path d="m4 6 4 4 4-4"/>',
  check: '<path d="m3.6 8.3 2.9 2.9 5.9-6.2"/>',
  chevLeft: '<path d="M10 3.5 5.5 8l4.5 4.5"/>',
  chevRight: '<path d="M6 3.5 10.5 8 6 12.5"/>',
  copy: '<rect x="5.5" y="5.5" width="7.7" height="7.7" rx="1.2"/><path d="M3 10.5V3.8C3 3.3 3.3 3 3.8 3h6.7"/>',
  rotL: '<path d="M3.6 8.2a4.6 4.6 0 1 0 1.4-3.4"/><path d="M3.4 2.9v2.9h2.9"/>',
  rotR: '<path d="M12.4 8.2A4.6 4.6 0 1 1 11 4.8"/><path d="M12.6 2.9v2.9H9.7"/>',
  reset: '<path d="M3 8a5 5 0 1 0 5-5"/><path d="M3 3v3h3"/><circle cx="8" cy="8" r="1.2"/>',
  close: '<path d="m4.2 4.2 7.6 7.6M11.8 4.2l-7.6 7.6"/>',
  panelL: '<rect x="2.3" y="3" width="11.4" height="10" rx="1.4"/><path d="M6.2 3v10"/>',
  panelR: '<rect x="2.3" y="3" width="11.4" height="10" rx="1.4"/><path d="M9.8 3v10"/>',
  group: '<circle cx="5" cy="6" r="1.7"/><circle cx="11" cy="6" r="1.7"/><path d="M2.3 12.5c.4-1.9 1.4-2.9 2.7-2.9s2.3 1 2.7 2.9M8.3 12.5c.4-1.9 1.4-2.9 2.7-2.9s2.3 1 2.7 2.9"/>',
  info: '<circle cx="8" cy="8" r="5.6"/><path d="M8 7.2v3.6M8 5.1v.1"/>',
} as const;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, cls = ''): HTMLElement {
  const s = document.createElement('span');
  s.className = 'ic' + (cls ? ' ' + cls : '');
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return s;
}

/** Middle dot and degree sign, built from char codes so the source stays ASCII. */
export const DOT = String.fromCharCode(0xb7);
export const DEG = String.fromCharCode(0xb0);
