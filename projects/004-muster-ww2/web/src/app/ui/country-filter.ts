/**
 * Country / Faction selector of the top bar. One segmented control: the quick filters
 * All / Axis / Allies, then a compact menu with every country (from FACTIONS, grouped by
 * alignment, with the number of library entries). Scales to any number of countries.
 *
 * Keyboard: on the menu button Enter / Space / Down opens (Up opens at the end); inside the
 * menu Up / Down / Home / End or a first letter move, Enter / Space choose, Esc closes and
 * returns to the button, Tab closes. A click outside or leaving the window closes it too.
 */
import { QUICK_FILTERS, factionInfo, factionsByAlignment } from '../catalog';
import type { AppContext } from '../context';
import type { FactionFilter } from '../types';
import { clear, h, icon } from './dom';

export interface CountryFilter {
  el: HTMLElement;
  /** Reflect the current filter (and refresh an open menu). */
  update(): void;
  close(): void;
}

interface MenuItem {
  id: FactionFilter;
  label: string;
  el: HTMLButtonElement;
  n: HTMLElement;
}

const PLACEHOLDER = 'Country / Faction';
let seq = 0;

export function buildCountryFilter(ctx: AppContext): CountryFilter {
  const { store, catalog } = ctx;
  const menuId = `country-menu-${++seq}`;

  // ---- quick filters
  const quick = new Map<FactionFilter, HTMLButtonElement>();
  const radios = h('div', { class: 'cf-quick', role: 'radiogroup', 'aria-label': 'Alignment' });
  for (const f of QUICK_FILTERS) {
    const b = h(
      'button',
      {
        class: 'cf-opt',
        type: 'button',
        role: 'radio',
        'aria-checked': 'false',
        onclick: () => {
          close(false);
          store.setFilter({ faction: f.id });
        },
      },
      f.label,
    );
    quick.set(f.id, b);
    radios.appendChild(b);
  }

  // ---- country menu
  const value = h('span', { class: 'dd-value' }, PLACEHOLDER);
  const trigger = h(
    'button',
    {
      class: 'dd-trigger',
      type: 'button',
      title: PLACEHOLDER,
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-controls': menuId,
    },
    value,
    icon('chevDown', 'dd-chev'),
  );
  const menu = h('div', { class: 'dd-menu', id: menuId, role: 'menu', 'aria-label': PLACEHOLDER, hidden: true });
  const dd = h('div', { class: 'dd' }, trigger, menu);
  const el = h('div', { class: 'cf', role: 'group', 'aria-label': PLACEHOLDER }, radios, h('span', { class: 'cf-div', 'aria-hidden': 'true' }), dd);

  let items: MenuItem[] = [];
  let isOpen = false;
  let typed = '';
  let typedAt = 0;

  const render = () => {
    clear(menu);
    items = [];
    for (const g of factionsByAlignment()) {
      const headId = `${menuId}-${g.alignment.toLowerCase()}`;
      const group = h('div', { class: 'dd-group', role: 'group', 'aria-labelledby': headId }, h('div', { class: 'dd-head', id: headId }, g.alignment));
      for (const f of g.factions) {
        const n = h('span', { class: 'dd-n' });
        const item = h(
          'button',
          {
            class: 'dd-item',
            type: 'button',
            role: 'menuitemradio',
            tabindex: '-1',
            'aria-checked': 'false',
            dataset: { id: f.id },
            onclick: () => choose(f.id),
            onpointermove: () => {
              if (document.activeElement !== item) item.focus({ preventScroll: true });
            },
          },
          icon('check', 'dd-check'),
          h('span', { class: 'dd-name' }, f.name),
          n,
        );
        items.push({ id: f.id, label: f.name, el: item, n });
        group.appendChild(item);
      }
      menu.appendChild(group);
    }
    refresh();
  };

  /** Checked state and entry counts of the open menu. */
  const refresh = () => {
    const counts = catalog.factionCounts();
    const cur = store.filter.faction;
    for (const it of items) {
      const on = it.id === cur;
      const n = counts[it.id] ?? 0;
      it.el.setAttribute('aria-checked', String(on));
      it.el.classList.toggle('empty', n === 0);
      it.n.textContent = String(n);
      it.el.title = n === 0 ? `No ${it.label} entries yet` : `${n} ${n === 1 ? 'entry' : 'entries'}`;
    }
  };

  const onOutside = (e: Event) => {
    if (!dd.contains(e.target as Node)) close(false);
  };
  const onBlur = () => close(false);

  function open(at: 'current' | 'first' | 'last') {
    if (!isOpen) {
      isOpen = true;
      typed = '';
      render();
      menu.hidden = false;
      dd.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('pointerdown', onOutside, true);
      window.addEventListener('blur', onBlur);
    }
    const target = at === 'first' ? items[0] : at === 'last' ? items[items.length - 1] : (items.find((i) => i.id === store.filter.faction) ?? items[0]);
    target?.el.focus({ preventScroll: true });
  }

  function close(returnFocus: boolean) {
    if (!isOpen) return;
    isOpen = false;
    menu.hidden = true;
    dd.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onOutside, true);
    window.removeEventListener('blur', onBlur);
    if (returnFocus) trigger.focus({ preventScroll: true });
  }

  function choose(id: FactionFilter) {
    close(true);
    store.setFilter({ faction: id });
  }

  const focusIndex = (i: number) => {
    if (!items.length) return;
    items[(i + items.length) % items.length].el.focus({ preventScroll: true });
  };

  /** First-letter navigation (letters typed quickly in a row extend the prefix). */
  const typeAhead = (ch: string) => {
    const now = performance.now();
    typed = now - typedAt < 700 ? typed + ch : ch;
    typedAt = now;
    const cur = items.findIndex((i) => i.el === document.activeElement);
    // a repeated single letter cycles through the countries starting with it
    const repeat = typed.length > 1 && typed.split('').every((c) => c === typed[0]);
    const find = (prefix: string, start: number) => {
      for (let k = 0; k < items.length; k++) {
        const it = items[(start + k) % items.length];
        if (it.label.toLowerCase().startsWith(prefix)) return it;
      }
      return undefined;
    };
    let hit = repeat || typed.length === 1 ? find(typed[0], cur + 1) : find(typed, Math.max(cur, 0));
    if (!hit && typed.length > 1) {
      // no country starts with the whole prefix: start again from this letter
      typed = ch;
      hit = find(ch, cur + 1);
    }
    hit?.el.focus({ preventScroll: true });
  };

  trigger.addEventListener('click', () => (isOpen ? close(true) : open('current')));
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      open(e.key === 'ArrowUp' ? 'last' : 'current');
    } else if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    }
  });

  menu.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const cur = items.findIndex((i) => i.el === document.activeElement);
    let handled = true;
    switch (e.key) {
      case 'ArrowDown':
        focusIndex(cur + 1);
        break;
      case 'ArrowUp':
        focusIndex(cur < 0 ? -1 : cur - 1);
        break;
      case 'Home':
      case 'PageUp':
        focusIndex(0);
        break;
      case 'End':
      case 'PageDown':
        focusIndex(-1);
        break;
      case 'Escape':
        close(true);
        break;
      case 'Tab':
        close(false);
        handled = false;
        break;
      case 'Enter':
      case ' ':
        // the focused item's native click chooses it; keep the key from the app shortcuts
        e.stopPropagation();
        return;
      default:
        if (e.key.length === 1) typeAhead(e.key.toLowerCase());
        else handled = false;
    }
    if (handled) {
      e.preventDefault();
      // menu keys never reach the app shortcuts (Esc would clear the selection, F would focus)
      e.stopPropagation();
    }
  });

  // focus moving elsewhere (Tab, a click on another control) closes the menu
  dd.addEventListener('focusout', (e) => {
    const to = e.relatedTarget as Node | null;
    if (isOpen && to && !dd.contains(to)) close(false);
  });

  let shown: FactionFilter | null = null;
  const update = () => {
    const f = store.filter.faction;
    // the shell updates often (scene activity); touch the DOM only when the filter changed
    if (f !== shown) {
      shown = f;
      for (const [id, b] of quick) {
        const on = f === id;
        b.classList.toggle('on', on);
        b.setAttribute('aria-checked', String(on));
      }
      const info = factionInfo(f);
      value.textContent = info ? info.name : PLACEHOLDER;
      trigger.classList.toggle('on', !!info);
      trigger.setAttribute('aria-label', info ? `${PLACEHOLDER}: ${info.name}` : PLACEHOLDER);
      if (isOpen) refresh();
    }
    if (store.ui.hidden) close(false);
  };

  update();
  return { el, update, close: () => close(false) };
}
