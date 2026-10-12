/**
 * Army Overview (bottom bar): Personnel / Vehicles / Artillery / Aircraft / Loose Equipment,
 * counted from the models actually present in the scene (weapons carried by soldiers are part
 * of the soldier and never counted). Hover a count for the per-country split.
 */
import { FACTIONS } from '../../core/types';
import type { SceneCounts } from '../scene';
import { COUNT_KINDS, DISPLAY_LIMIT, emptyCounts } from '../types';
import { DOT, clear, h } from './dom';

export class OverviewBar {
  private vals = new Map<string, { v: HTMLElement; pop: HTMLElement; item: HTMLElement }>();
  private meta: HTMLElement;

  constructor(el: HTMLElement) {
    el.appendChild(h('span', { class: 'ov-title' }, 'Army Overview'));
    for (const k of COUNT_KINDS) {
      const v = h('span', { class: 'v' }, '0');
      const pop = h('div', { class: 'ov-pop', role: 'tooltip' });
      const item = h('div', { class: 'ov-item', tabindex: '0' }, h('span', { class: 'k' }, k.label), v, pop);
      this.vals.set(k.id, { v, pop, item });
      el.appendChild(item);
    }
    this.meta = h('span', { class: 'ov-meta' });
    el.appendChild(this.meta);
  }

  update(c: SceneCounts, preparing: number) {
    for (const k of COUNT_KINDS) {
      const r = this.vals.get(k.id)!;
      const n = c.total[k.id];
      r.v.textContent = String(n);
      r.item.classList.toggle('zero', n === 0);
      clear(r.pop);
      // only the countries present on the display (the list grows with FACTIONS)
      const rows = FACTIONS.map((f) => ({ name: f.name, n: (c.byFaction[f.id] ?? emptyCounts())[k.id] ?? 0 })).filter((x) => x.n > 0);
      r.pop.append(
        h('div', { class: 'pop-title' }, k.label),
        ...(rows.length
          ? rows.map((x) => h('div', { class: 'pop-row' }, h('span', {}, x.name), h('span', { class: 'n' }, String(x.n))))
          : [h('div', { class: 'pop-row none' }, 'None on the display')]),
      );
    }
    const parts = [`${c.models} ${c.models === 1 ? 'model' : 'models'} in ${c.groups} ${c.groups === 1 ? 'group' : 'groups'}`];
    if (preparing) parts.push(`preparing ${preparing}`);
    parts.push(`limit ${DISPLAY_LIMIT} per display`);
    this.meta.textContent = parts.join(` ${DOT} `);
    this.meta.title = `Performance guard: at most ${DISPLAY_LIMIT} models are shown at once, and each entry has its own per-group maximum. Every counted model is rendered.`;
  }
}
