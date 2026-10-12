/**
 * Library column: Search Models, categories with counts, and model cards. Card previews are
 * rendered from the real placeable model; unavailable entries say so plainly and cannot be
 * added. Filtering only changes this list - never the arranged display.
 */
import { CATEGORIES, type AssetDef } from '../../core/types';
import { factionInfo, factionName } from '../catalog';
import type { AppContext } from '../context';
import type { CategoryFilter } from '../types';
import { DOT, clear, h, icon } from './dom';

interface Card {
  el: HTMLElement;
  thumb: HTMLElement;
  img: HTMLImageElement;
  add: HTMLButtonElement;
  status: HTMLElement;
  more: HTMLButtonElement;
  details: HTMLElement | null;
  placeable: boolean | null;
}

function isUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

export class LibraryPanel {
  private cards = new Map<string, Card>();
  private expanded: string | null = null;
  private list: HTMLElement;
  private chips = new Map<CategoryFilter, { el: HTMLButtonElement; n: HTMLElement }>();
  private count: HTMLElement;
  private emptyEl: HTMLElement;
  private issuesEl: HTMLElement;
  private search: HTMLInputElement;

  constructor(private el: HTMLElement, private ctx: AppContext) {
    const { store } = ctx;
    this.count = h('span', { class: 'panel-count' });
    const collapse = h('button', { class: 'btn icon-only quiet', title: 'Collapse library', 'aria-label': 'Collapse library', onclick: () => store.setUI({ libraryCollapsed: true }) }, icon('chevLeft'));
    let t = 0;
    this.search = h('input', {
      type: 'search',
      placeholder: 'Search Models',
      'aria-label': 'Search Models',
      spellcheck: 'false',
      autocomplete: 'off',
      oninput: () => {
        clearTimeout(t);
        t = window.setTimeout(() => store.setFilter({ search: this.search.value }), 90);
      },
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.search.value = '';
          store.setFilter({ search: '' });
          this.search.blur();
        }
      },
    });
    const chipRow = h('div', { class: 'chips', role: 'tablist', 'aria-label': 'Categories' });
    for (const c of ['All', ...CATEGORIES] as CategoryFilter[]) {
      const n = h('span', { class: 'n' });
      const b = h('button', { class: 'chip', role: 'tab', onclick: () => store.setFilter({ category: c }) }, c === 'All' ? 'All' : c, n);
      this.chips.set(c, { el: b, n });
      chipRow.appendChild(b);
    }
    this.list = h('div', { class: 'cards' });
    this.emptyEl = h('div', { class: 'lib-empty', hidden: true });
    this.issuesEl = h('div', { class: 'lib-issues', hidden: true });
    el.append(
      h('div', { class: 'panel-head' }, h('div', { class: 'panel-title' }, 'Library'), this.count, h('span', { class: 'grow' }), collapse),
      h('label', { class: 'search' }, icon('search'), this.search),
      chipRow,
      h('p', { class: 'lib-note' }, 'Filters change this list only - the display stays as you arranged it.'),
      h('div', { class: 'cards-scroll' }, this.list, this.emptyEl, this.issuesEl),
    );
    ctx.thumbs.onReady((id, url) => this.setThumb(id, url));
  }

  render() {
    const { store, catalog } = this.ctx;
    const f = store.filter;
    const counts = catalog.counts(f);
    for (const [c, chip] of this.chips) {
      chip.n.textContent = String(counts[c] ?? 0);
      chip.el.classList.toggle('on', f.category === c);
      chip.el.classList.toggle('empty', !counts[c]);
      chip.el.setAttribute('aria-selected', String(f.category === c));
    }
    if (this.search.value !== f.search && document.activeElement !== this.search) this.search.value = f.search;
    const defs = catalog.filtered(f);
    this.count.textContent = `${defs.length} ${defs.length === 1 ? 'entry' : 'entries'}`;
    const keep = new Set<string>();
    let prev: Element | null = null;
    for (const d of defs) {
      keep.add(d.id);
      const card = this.cards.get(d.id) ?? this.createCard(d);
      this.refreshCard(d, card);
      const next: Element | null = prev ? prev.nextElementSibling : this.list.firstElementChild;
      if (next !== card.el) this.list.insertBefore(card.el, next);
      prev = card.el;
    }
    for (const [id, c] of this.cards) if (!keep.has(id) && c.el.parentElement) c.el.remove();
    this.renderEmpty(defs.length);
    this.renderIssues();
    // visible entries get their previews first
    this.ctx.thumbs.request(defs.filter((d) => catalog.placeable(d.id)).map((d) => d.id), true);
  }

  private renderEmpty(n: number) {
    const f = this.ctx.store.filter;
    this.emptyEl.hidden = n > 0;
    if (n > 0) return;
    clear(this.emptyEl);
    const what = f.category === 'All' ? 'models' : f.category.toLowerCase();
    const country = factionInfo(f.faction);
    let title: string;
    let body: string;
    if (f.search) {
      title = 'No matching models';
      body = 'Try a different search, category or country.';
    } else if (country) {
      // a country without entries in this category (or at all) yet
      title = f.category === 'All' ? 'No models for this country yet' : `No ${what} for this country yet`;
      body = `${country.name} entries appear here as soon as their models reach display quality.`;
    } else {
      title = `No ${what} yet`;
      body = 'Entries appear here as soon as their models reach display quality.';
    }
    this.emptyEl.append(h('div', { class: 'empty-title' }, title), h('p', {}, body));
  }

  private renderIssues() {
    const { catalog } = this.ctx;
    // internal test modules (src/assets/_test) only matter with ?showHidden=1
    const issues = catalog.issues.filter((i) => catalog.showHidden || !i.path.startsWith('_'));
    this.issuesEl.hidden = !issues.length;
    if (!issues.length) return;
    clear(this.issuesEl);
    this.issuesEl.append(
      h('div', {}, icon('info'), `${issues.length} catalog ${issues.length === 1 ? 'entry' : 'entries'} could not be loaded and ${issues.length === 1 ? 'is' : 'are'} not shown.`),
      h('div', { class: 'issue-list' }, issues.map((i) => h('span', { title: i.message }, i.path))),
    );
  }

  private createCard(def: AssetDef): Card {
    const img = h('img', { alt: `${def.name} preview`, draggable: 'false', decoding: 'async' });
    img.addEventListener('load', () => img.classList.add('ready'));
    const thumb = h('div', { class: 'thumb' }, img);
    const status = h('div', { class: 'card-status' });
    const add = h(
      'button',
      {
        class: 'btn primary sm',
        onclick: (e: Event) => {
          e.stopPropagation();
          this.ctx.startPlacement(def.id);
        },
      },
      icon('plus'),
      'Add to Ground',
    );
    const more = h(
      'button',
      {
        class: 'btn quiet sm more',
        'aria-expanded': 'false',
        onclick: (e: Event) => {
          e.stopPropagation();
          this.toggle(def.id);
        },
      },
      'Details',
      icon('chevDown'),
    );
    const body = h(
      'div',
      { class: 'card-body' },
      h('div', { class: 'card-meta' }, `${factionName(def.faction)} ${DOT} ${def.category}`),
      h('div', { class: 'card-title' }, def.name),
      def.subtitle ? h('div', { class: 'card-sub' }, def.subtitle) : null,
      h('p', { class: 'card-summary' }, def.summary),
      status,
      h('div', { class: 'card-actions' }, add, h('span', { class: 'grow' }), more),
    );
    const el = h('article', { class: 'card', dataset: { id: def.id }, onclick: () => this.toggle(def.id) }, thumb, body);
    const card: Card = { el, thumb, img, add, status, more, details: null, placeable: null };
    this.cards.set(def.id, card);
    const url = this.ctx.thumbs.url(def.id);
    if (url) img.src = url;
    return card;
  }

  private refreshCard(def: AssetDef, card: Card) {
    const ok = this.ctx.catalog.placeable(def.id);
    if (card.placeable === ok) return;
    card.placeable = ok;
    card.el.classList.toggle('unavailable', !ok);
    card.add.disabled = !ok;
    card.add.title = ok ? `Place ${def.name} on the ground` : 'Not available';
    clear(card.status);
    card.thumb.querySelector('.na')?.remove();
    if (!ok) {
      const reason = this.ctx.catalog.unavailableReason(def.id) ?? 'Not available.';
      card.status.append(h('span', { class: 'na-label' }, 'Not available'), h('span', { class: 'na-reason' }, reason));
      card.img.removeAttribute('src');
      card.img.classList.remove('ready');
      card.thumb.appendChild(h('div', { class: 'na' }, h('span', {}, 'No preview')));
    }
    if (card.details) {
      card.details.remove();
      card.details = null;
      if (this.expanded === def.id) this.openDetails(def, card);
    }
  }

  private setThumb(id: string, url: string) {
    const c = this.cards.get(id);
    if (c && this.ctx.catalog.placeable(id)) c.img.src = url;
  }

  private toggle(id: string) {
    const def = this.ctx.catalog.get(id);
    if (!def) return;
    if (this.expanded && this.expanded !== id) {
      const other = this.cards.get(this.expanded);
      if (other?.details) {
        other.details.remove();
        other.details = null;
        other.el.classList.remove('expanded');
        other.more.setAttribute('aria-expanded', 'false');
      }
    }
    const card = this.cards.get(id)!;
    if (card.details) {
      card.details.remove();
      card.details = null;
      card.el.classList.remove('expanded');
      card.more.setAttribute('aria-expanded', 'false');
      this.expanded = null;
    } else {
      this.openDetails(def, card);
      this.expanded = id;
    }
  }

  private openDetails(def: AssetDef, card: Card) {
    const p = def.provenance && typeof def.provenance === 'object' ? def.provenance : null;
    const facts = (Array.isArray(def.facts) ? def.facts : []).filter((f) => f && f.label && f.value);
    const refs = (Array.isArray(p?.references) ? p!.references : []).filter((r) => typeof r === 'string' && r);
    const d = h(
      'div',
      { class: 'card-details', onclick: (e: Event) => e.stopPropagation() },
      h('p', { class: 'full-summary' }, def.summary),
      facts.length ? h('dl', { class: 'facts' }, facts.map((f) => [h('dt', {}, f.label), h('dd', {}, f.value)])) : null,
      p
        ? h(
            'div',
            { class: 'prov' },
            h('div', { class: 'label' }, 'Provenance'),
            h('dl', { class: 'facts' }, [
              [h('dt', {}, 'Method'), h('dd', {}, p.method)],
              [h('dt', {}, 'Author'), h('dd', {}, p.author)],
              [h('dt', {}, 'License'), h('dd', {}, p.license)],
              [h('dt', {}, 'Textures'), h('dd', {}, p.textures)],
            ]),
            p.notes ? h('p', { class: 'prov-notes' }, p.notes) : null,
            refs.length
              ? h(
                  'div',
                  { class: 'refs' },
                  h('div', { class: 'label' }, 'References'),
                  h('ul', {}, refs.map((r) => h('li', {}, isUrl(r) ? h('a', { href: r, target: '_blank', rel: 'noopener noreferrer' }, r.replace(/^https?:\/\/(www\.)?/, '')) : r))),
                )
              : null,
          )
        : null,
    );
    card.details = d;
    card.el.appendChild(d);
    card.el.classList.add('expanded');
    card.more.setAttribute('aria-expanded', 'true');
  }
}
