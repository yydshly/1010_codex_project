/**
 * Page skeleton: top bar (name, Country / Faction, view controls), left library column,
 * centre stage (3D canvas + small overlays), right inspector column, bottom overview.
 * Panels are side columns, never overlays across the middle of the scene.
 */
import type { AppContext } from '../context';
import { buildCountryFilter } from './country-filter';
import { h, icon, type IconName } from './dom';

export interface Shell {
  root: HTMLElement;
  library: HTMLElement;
  stage: HTMLElement;
  inspector: HTMLElement;
  overview: HTMLElement;
  toasts: HTMLElement;
  update(): void;
  setPlacementHint(text: { title: string; detail: string } | null): void;
  setLoading(text: string | null): void;
}

function toolButton(label: string, ic: IconName, title: string, onclick: () => void, cls = ''): HTMLButtonElement {
  return h('button', { class: 'btn tool ' + cls, title, onclick }, icon(ic), h('span', { class: 'btn-label' }, label));
}

export function buildShell(mount: HTMLElement, ctx: AppContext): Shell {
  const { store } = ctx;

  // ---- top bar
  // All / Axis / Allies quick filters + a menu with every country (scales with FACTIONS)
  const countries = buildCountryFilter(ctx);
  const undo = h('button', { class: 'btn icon-only', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', onclick: () => store.undo() }, icon('undo'));
  const redo = h('button', { class: 'btn icon-only', title: 'Redo (Ctrl+Shift+Z)', 'aria-label': 'Redo', onclick: () => store.redo() }, icon('redo'));
  const focusBtn = toolButton('Focus Selection', 'focus', 'Frame the selection (F)', () => ctx.focus());
  const resetBtn = toolButton('Reset View', 'home', 'Frame the whole display', () => ctx.resetView());
  const hideBtn = toolButton('Hide UI', 'eyeOff', 'Show only the 3D display (H)', () => ctx.setUIHidden(true));
  const demoBtn = toolButton('Demo Display', 'layout', 'Restore the pre-arranged demo display', () => ctx.requestDemo());
  const clearBtn = toolButton('Clear Ground', 'eraser', 'Remove every model from the display', () => ctx.requestClear());

  const topbar = h(
    'header',
    { class: 'topbar' },
    h('a', { class: 'brand', href: './', title: '返回研究首页', target: window.parent === window ? '_self' : '_top' }, h('span', { class: 'brand-name' }, 'Muster'), h('span', { class: 'brand-sub' }, '研究首页 ↗ / WWII Model Archive')),
    h('div', { class: 'tb-faction' }, countries.el),
    h('div', { class: 'tb-spacer' }),
    h('div', { class: 'tb-tools' }, undo, redo, h('span', { class: 'tb-div' }), focusBtn, resetBtn, hideBtn, h('span', { class: 'tb-div' }), demoBtn, clearBtn),
  );

  // ---- columns
  const library = h('aside', { class: 'panel library', 'aria-label': 'Library' });
  const inspector = h('aside', { class: 'panel inspector', 'aria-label': 'Selection' });
  const overview = h('footer', { class: 'overview', 'aria-label': 'Army Overview' });

  // ---- stage + overlays
  const hintTitle = h('span', { class: 'hint-title' });
  const hintDetail = h('span', { class: 'hint-detail' });
  const hint = h('div', { class: 'stage-hint', hidden: true }, hintTitle, hintDetail, h('button', { class: 'btn sm quiet', onclick: () => ctx.interaction.cancelPlacement() }, 'Cancel'));
  const toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
  const loadingText = h('span', {}, 'Preparing the display...');
  const loading = h('div', { class: 'stage-loading' }, h('span', { class: 'pulse' }), loadingText);
  const empty = h(
    'div',
    { class: 'stage-empty', hidden: true },
    h('div', { class: 'empty-title' }, 'The ground is clear'),
    h('p', {}, 'Choose a model in the library and use Add to Ground, or bring back the demo display.'),
    h('button', { class: 'btn', onclick: () => ctx.requestDemo() }, icon('layout'), 'Demo Display'),
  );
  const libTab = h('button', { class: 'edge-tab left', title: 'Show library', onclick: () => store.setUI({ libraryCollapsed: false }) }, icon('panelL'), 'Library');
  const inspTab = h('button', { class: 'edge-tab right', title: 'Show selection panel', onclick: () => store.setUI({ inspectorCollapsed: false }) }, 'Selection', icon('panelR'));
  const stage = h('main', { class: 'stage' }, hint, empty, loading, toasts, libTab, inspTab);

  const showUI = h('button', { class: 'show-ui', title: 'Show the interface (H)', onclick: () => ctx.setUIHidden(false) }, icon('eye'), 'Show UI');

  const root = h('div', { class: 'app' }, topbar, library, stage, inspector, overview, showUI);
  mount.appendChild(root);

  let loadingOn = true;
  const update = () => {
    root.classList.toggle('ui-hidden', store.ui.hidden);
    root.classList.toggle('lib-collapsed', store.ui.libraryCollapsed);
    root.classList.toggle('insp-collapsed', store.ui.inspectorCollapsed);
    countries.update();
    undo.disabled = !store.canUndo;
    redo.disabled = !store.canRedo;
    undo.title = store.undoLabel ? `Undo ${store.undoLabel} (Ctrl+Z)` : 'Undo (Ctrl+Z)';
    redo.title = store.redoLabel ? `Redo ${store.redoLabel} (Ctrl+Shift+Z)` : 'Redo (Ctrl+Shift+Z)';
    const hasGroups = store.groups.length > 0;
    clearBtn.disabled = !hasGroups;
    focusBtn.disabled = !hasGroups;
    empty.hidden = hasGroups || loadingOn || !!ctx.interaction.placement;
  };

  return {
    root,
    library,
    stage,
    inspector,
    overview,
    toasts,
    update,
    setPlacementHint(t) {
      hint.hidden = !t;
      if (t) {
        hintTitle.textContent = t.title;
        hintDetail.textContent = t.detail;
      }
      update();
    },
    setLoading(text) {
      loadingOn = !!text;
      loading.hidden = !text;
      if (text) loadingText.textContent = text;
      update();
    },
  };
}
