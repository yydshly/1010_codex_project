/**
 * Inspector column: the selected group (or one model of it). Equipment options come from
 * def.options with def.constrain() deciding what is compatible (disabled items say why).
 * The panel is rebuilt only when its structure changes; values are patched in place so
 * sliders and inputs keep working while the scene updates live.
 */
import { configKey, type AssetDef, type ConfigConstraints, type SelectOption, type ToggleOption } from '../../core/types';
import { factionName, safeConstrain } from '../catalog';
import type { AppContext } from '../context';
import { layoutCtx, overflows, rankCapacity, columnsFor } from '../layout';
import { DISPLAY_LIMIT, type Formation, type Group } from '../types';
import { DEG, DOT, clear, h, icon, type IconName } from './dom';

interface Refs {
  groupId: string;
  slot: number | null;
  qty: HTMLInputElement;
  qtyHint: HTMLElement;
  qMinus: HTMLButtonElement;
  qPlus: HTMLButtonElement;
  prep: HTMLElement;
  spacing: HTMLInputElement | null;
  spacingVal: HTMLElement | null;
  pitchHint: HTMLElement | null;
  heading: HTMLInputElement;
  headingVal: HTMLElement;
  cols: HTMLElement | null;
  colsMinus: HTMLButtonElement | null;
  colsPlus: HTMLButtonElement | null;
  overflow: HTMLElement;
  instTitle: HTMLElement | null;
  instHeading: HTMLInputElement | null;
  instHeadingVal: HTMLElement | null;
}

const fmtDeg = (d: number) => `${Math.round(d) % 360}${DEG}`;

function section(label: string, ...children: (HTMLElement | null)[]): HTMLElement {
  return h('section', { class: 'section' }, h('div', { class: 'section-label' }, label), ...children);
}

function actionBtn(label: string, ic: IconName, onclick: () => void, cls = '', title = ''): HTMLButtonElement {
  return h('button', { class: 'btn ' + cls, onclick, title: title || label }, icon(ic), label);
}

export class InspectorPanel {
  private body: HTMLElement;
  private key = '';
  private refs: Refs | null = null;

  constructor(el: HTMLElement, private ctx: AppContext) {
    const collapse = h('button', { class: 'btn icon-only quiet', title: 'Collapse panel', 'aria-label': 'Collapse panel', onclick: () => ctx.store.setUI({ inspectorCollapsed: true }) }, icon('chevRight'));
    this.body = h('div', { class: 'insp-body' });
    el.append(h('div', { class: 'panel-head' }, h('div', { class: 'panel-title' }, 'Selection'), h('span', { class: 'grow' }), collapse), this.body);
  }

  update() {
    const { store, catalog } = this.ctx;
    const sel = store.selection;
    const g = sel ? store.group(sel.groupId) : undefined;
    const def = g ? catalog.get(g.assetId) : undefined;
    if (!sel || !g || !def) {
      if (this.key !== 'empty') {
        this.key = 'empty';
        this.refs = null;
        this.renderEmpty();
      }
      return;
    }
    const cons = safeConstrain(def, g.config).constraints;
    const key = [g.id, sel.slot ?? '-', configKey(def, g.config), g.formation, g.columns === 'auto' ? 'a' : 'n', JSON.stringify(cons ?? {}), g.instances.length > 1 ? 'm' : 's'].join('|');
    if (key !== this.key) {
      this.key = key;
      this.render(g, def, sel.slot, cons);
    }
    this.patch(g, def);
  }

  // ------------------------------------------------------------------ empty

  private renderEmpty() {
    clear(this.body);
    const keys: [string, string][] = [
      ['Click', 'Select a group'],
      ['Click again', 'Select one model'],
      ['Drag', 'Move the selection'],
      ['Q / E', `Rotate 15${DEG}`],
      ['Ctrl+D', 'Duplicate'],
      ['Delete', 'Remove'],
      ['F', 'Focus Selection'],
      ['H', 'Hide UI'],
      ['Ctrl+Z', 'Undo'],
    ];
    this.body.append(
      h(
        'div',
        { class: 'insp-empty' },
        h('div', { class: 'empty-title' }, 'Nothing selected'),
        h('p', {}, 'Select a model on the ground to set its quantity, equipment, formation and rotation.'),
        h('p', {}, 'To add models, pick an entry in the library and use Add to Ground.'),
        h('dl', { class: 'keys' }, keys.map(([k, v]) => [h('dt', {}, h('kbd', {}, k)), h('dd', {}, v)])),
      ),
    );
  }

  // ------------------------------------------------------------------ build

  private render(g: Group, def: AssetDef, slot: number | null, cons?: ConfigConstraints) {
    const { actions } = this.ctx;
    clear(this.body);
    const id = g.id;
    const multi = g.instances.length > 1;

    const prep = h('div', { class: 'prep', hidden: true }, h('span', { class: 'pulse' }), 'Preparing model...');
    const head = h(
      'div',
      { class: 'insp-head' },
      h('div', { class: 'insp-meta' }, `${factionName(def.faction)} ${DOT} ${def.category}`),
      h('h2', { class: 'insp-title' }, def.name),
      def.subtitle ? h('div', { class: 'insp-sub' }, def.subtitle) : null,
      prep,
    );
    this.body.appendChild(head);

    // --- single model of a group
    let instTitle: HTMLElement | null = null, instHeading: HTMLInputElement | null = null, instHeadingVal: HTMLElement | null = null;
    if (slot !== null && multi) {
      instTitle = h('div', { class: 'inst-title' });
      instHeadingVal = h('span', { class: 'val' });
      instHeading = this.slider(0, 359, 1, (v, live) => actions.setInstanceHeading(id, slot, v, live));
      this.body.appendChild(
        h(
          'section',
          { class: 'section inst' },
          h('div', { class: 'inst-row' }, instTitle, h('button', { class: 'btn sm quiet', onclick: () => actions.select(id, null) }, 'Select Group')),
          h('div', { class: 'row-label' }, h('span', {}, 'Rotate Model'), instHeadingVal),
          h(
            'div',
            { class: 'rotate' },
            h('button', { class: 'btn step-txt', title: `Rotate clockwise 15${DEG}`, onclick: () => actions.rotateBy(id, slot, -15) }, `-15${DEG}`),
            instHeading,
            h('button', { class: 'btn step-txt', title: `Rotate counter-clockwise 15${DEG}`, onclick: () => actions.rotateBy(id, slot, 15) }, `+15${DEG}`),
          ),
          h(
            'div',
            { class: 'btn-grid' },
            actionBtn('Reset Model', 'reset', () => actions.resetLayout(id, slot), '', 'Clear this model\'s own position and rotation adjustments'),
            actionBtn('Remove Model', 'trash', () => actions.removeInstance(id, slot), 'danger-quiet'),
          ),
        ),
      );
    }

    // --- equipment
    const opts = def.options ?? [];
    if (opts.length) {
      this.body.appendChild(section('Equipment', ...opts.map((o) => (o.kind === 'select' ? this.selectOption(g, o, cons) : this.toggleOption(g, o, cons)))));
    }

    // --- quantity
    const qty = h('input', {
      class: 'num',
      type: 'text',
      inputmode: 'numeric',
      'aria-label': 'Quantity',
      onchange: () => actions.setQuantity(id, parseInt(qty.value, 10) || 1),
      onkeydown: (e: KeyboardEvent) => {
        const cur = this.ctx.store.group(id)?.instances.length ?? 1;
        if (e.key === 'Enter') qty.blur();
        else if (e.key === 'ArrowUp') {
          e.preventDefault();
          actions.setQuantity(id, cur + 1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          actions.setQuantity(id, cur - 1);
        }
      },
      onfocus: () => qty.select(),
    });
    const step = (d: number) => () => actions.setQuantity(id, (this.ctx.store.group(id)?.instances.length ?? 1) + d);
    const qMinus = h('button', { class: 'step', title: 'Fewer', 'aria-label': 'Decrease quantity', onclick: step(-1) }, icon('minus'));
    const qPlus = h('button', { class: 'step', title: 'More', 'aria-label': 'Increase quantity', onclick: step(1) }, icon('plus'));
    const qtyHint = h('div', { class: 'hint' });
    this.body.appendChild(section('Quantity', h('div', { class: 'qty-row' }, h('div', { class: 'stepper' }, qMinus, qty, qPlus), qtyHint)));

    // --- formation
    const seg = h('div', { class: 'seg wide', role: 'radiogroup', 'aria-label': 'Formation' });
    for (const f of ['single', 'line', 'grid'] as Formation[]) {
      const on = g.formation === f;
      seg.appendChild(h('button', { class: on ? 'on' : '', role: 'radio', 'aria-checked': String(on), onclick: () => actions.setFormation(id, f) }, f[0].toUpperCase() + f.slice(1)));
    }
    let cols: HTMLElement | null = null, colsMinus: HTMLButtonElement | null = null, colsPlus: HTMLButtonElement | null = null;
    let colsRow: HTMLElement | null = null;
    if (g.formation === 'grid') {
      const auto = g.columns === 'auto';
      cols = h('span', { class: 'num-static' });
      const setCols = (d: number) => () => {
        const gg = this.ctx.store.group(id);
        const dd = gg && this.ctx.catalog.get(gg.assetId);
        if (gg && dd) actions.setColumns(id, columnsFor(gg, dd) + d);
      };
      colsMinus = h('button', { class: 'step', 'aria-label': 'Fewer columns', onclick: setCols(-1) }, icon('minus'));
      colsPlus = h('button', { class: 'step', 'aria-label': 'More columns', onclick: setCols(1) }, icon('plus'));
      colsRow = h(
        'div',
        { class: 'cols-row' },
        h('span', { class: 'row-label-inline' }, 'Columns'),
        h('button', { class: 'chip sm' + (auto ? ' on' : ''), title: 'Automatic: about as many columns as rows', onclick: () => actions.setColumns(id, auto ? columnsFor(g, def) : 'auto') }, 'Auto'),
        h('div', { class: 'stepper sm' }, colsMinus, cols, colsPlus),
      );
    }
    const overflow = h('div', { class: 'hint warn', hidden: true }, 'The formation is larger than the display; outer models are held at the edge.');
    this.body.appendChild(section('Formation', seg, colsRow, overflow));

    // --- spacing
    let spacing: HTMLInputElement | null = null, spacingVal: HTMLElement | null = null, pitchHint: HTMLElement | null = null;
    if (multi) {
      spacingVal = h('span', { class: 'val' });
      spacing = this.slider(def.spacing.min, def.spacing.max, 0.05, (v, live) => actions.setSpacing(id, v, live));
      pitchHint = h('div', { class: 'hint pitch-hint', hidden: true });
      this.body.appendChild(
        h(
          'section',
          { class: 'section' },
          h('div', { class: 'section-label' }, h('span', {}, 'Spacing'), spacingVal),
          spacing,
          h('div', { class: 'range-ends' }, h('span', {}, `${def.spacing.min} m`), h('span', {}, `${def.spacing.max} m`)),
          pitchHint,
        ),
      );
    }

    // --- rotate (group)
    const headingVal = h('span', { class: 'val' });
    const heading = this.slider(0, 359, 1, (v, live) => actions.setHeading(id, v, live));
    this.body.appendChild(
      h(
        'section',
        { class: 'section' },
        h('div', { class: 'section-label' }, h('span', {}, multi ? 'Rotate Group' : 'Rotate'), headingVal),
        h(
          'div',
          { class: 'rotate' },
          h('button', { class: 'btn step-txt', title: `Rotate clockwise 15${DEG} (E)`, onclick: () => actions.rotateBy(id, null, -15) }, `-15${DEG}`),
          heading,
          h('button', { class: 'btn step-txt', title: `Rotate counter-clockwise 15${DEG} (Q)`, onclick: () => actions.rotateBy(id, null, 15) }, `+15${DEG}`),
        ),
      ),
    );

    // --- actions
    this.body.appendChild(
      h(
        'section',
        { class: 'section actions' },
        h(
          'div',
          { class: 'btn-grid' },
          actionBtn('Focus Selection', 'focus', () => this.ctx.focus(id, slot), '', 'Frame the selection (F)'),
          actionBtn('Duplicate', 'copy', () => actions.duplicate(id), '', 'Duplicate the group beside it (Ctrl+D)'),
          actionBtn('Reset Layout', 'reset', () => actions.resetLayout(id), '', 'Clear manual adjustments of every model in the group'),
          actionBtn('Remove', 'trash', () => actions.removeGroup(id), 'danger-quiet', 'Remove the group (Delete)'),
        ),
      ),
    );

    this.refs = { groupId: id, slot, qty, qtyHint, qMinus, qPlus, prep, spacing, spacingVal, pitchHint, heading, headingVal, cols, colsMinus, colsPlus, overflow, instTitle, instHeading, instHeadingVal };
  }

  private slider(min: number, max: number, stepV: number, set: (v: number, live: boolean) => void): HTMLInputElement {
    const s = h('input', { type: 'range', class: 'range', min: String(min), max: String(max), step: String(stepV) });
    s.addEventListener('input', () => set(parseFloat(s.value), true));
    s.addEventListener('change', () => this.ctx.actions.endLive());
    return s;
  }

  private selectOption(g: Group, o: SelectOption, cons?: ConfigConstraints): HTMLElement {
    const reason = cons?.disabled?.[o.id];
    const bad = new Set(cons?.disallowedChoices?.[o.id] ?? []);
    const cur = String(g.config[o.id]);
    const set = (v: string) => this.ctx.actions.setConfig(g.id, { [o.id]: v });
    const choices = (Array.isArray(o.choices) ? o.choices : []).filter((c) => c && typeof c.id === 'string');
    let control: HTMLElement;
    if (choices.length > 7) {
      const sel = h('select', { class: 'select', disabled: !!reason, onchange: () => set(sel.value) });
      for (const c of choices) {
        const opt = h('option', { value: c.id }, c.label + (bad.has(c.id) ? ' (not compatible)' : ''));
        opt.disabled = bad.has(c.id);
        opt.selected = c.id === cur;
        sel.appendChild(opt);
      }
      control = sel;
    } else {
      control = h(
        'div',
        { class: 'choices', role: 'radiogroup', 'aria-label': o.label },
        choices.map((c) => {
          const on = c.id === cur;
          const blocked = bad.has(c.id);
          return h(
            'button',
            {
              class: 'choice' + (on ? ' on' : ''),
              role: 'radio',
              'aria-checked': String(on),
              disabled: !!reason || blocked,
              title: blocked ? 'Not compatible with the current equipment' : c.note ?? c.label,
              onclick: () => set(c.id),
            },
            h('span', { class: 'radio' }),
            h('span', { class: 'choice-text' }, h('span', { class: 'choice-label' }, c.label), c.note ? h('span', { class: 'choice-note' }, c.note) : null, blocked ? h('span', { class: 'choice-note' }, 'Not compatible with the current equipment') : null),
          );
        }),
      );
    }
    return h('div', { class: 'opt' + (reason ? ' locked' : '') }, h('div', { class: 'opt-label' }, o.label), reason ? h('div', { class: 'opt-reason' }, reason) : null, control);
  }

  private toggleOption(g: Group, o: ToggleOption, cons?: ConfigConstraints): HTMLElement {
    const reason = cons?.disabled?.[o.id];
    const on = !!g.config[o.id];
    return h(
      'button',
      { class: 'toggle' + (on ? ' on' : '') + (reason ? ' locked' : ''), role: 'switch', 'aria-checked': String(on), disabled: !!reason, onclick: () => this.ctx.actions.setConfig(g.id, { [o.id]: !on }) },
      h('span', { class: 'toggle-text' }, h('span', { class: 'opt-label' }, o.label), reason ? h('span', { class: 'opt-reason' }, reason) : o.note ? h('span', { class: 'choice-note' }, o.note) : null),
      h('span', { class: 'switch' }, h('span', { class: 'knob' })),
    );
  }

  // ------------------------------------------------------------------ patch

  private patch(g: Group, def: AssetDef) {
    const r = this.refs;
    if (!r || r.groupId !== g.id) return;
    const { actions, scene } = this.ctx;
    const n = g.instances.length;
    const { cap, by } = actions.capFor(g);
    if (document.activeElement !== r.qty) r.qty.value = String(n);
    r.qMinus.disabled = n <= 1;
    r.qPlus.disabled = n >= cap;
    r.qtyHint.textContent = n >= cap ? (by === 'group' ? `Limit reached: ${def.maxQuantity} per group` : `Display limit reached (${DISPLAY_LIMIT} models)`) : `Up to ${def.maxQuantity} per group`;
    r.qtyHint.classList.toggle('warn', n >= cap);
    r.prep.hidden = !scene.isPreparing(g.id);
    if (r.spacing && r.spacingVal) {
      if (document.activeElement !== r.spacing) r.spacing.value = String(g.spacing);
      r.spacingVal.textContent = `${g.spacing.toFixed(g.spacing < 10 ? 2 : 1)} m`;
    }
    if (r.pitchHint) {
      const lc = layoutCtx(g, def);
      const show = lc.rows > 1 && lc.pitch > g.spacing + 0.005;
      r.pitchHint.hidden = !show;
      if (show) r.pitchHint.textContent = `Rows stand ${lc.pitch.toFixed(2)} m apart so the models never overlap front to back.`;
    }
    if (document.activeElement !== r.heading) r.heading.value = String(Math.round(g.heading) % 360);
    r.headingVal.textContent = fmtDeg(g.heading);
    if (r.cols && r.colsMinus && r.colsPlus) {
      const c = columnsFor(g, def), capC = Math.min(rankCapacity(def, g.spacing), Math.max(1, layoutCtx(g, def).count));
      r.cols.textContent = String(c);
      r.colsMinus.disabled = c <= 1;
      r.colsPlus.disabled = c >= capC;
    }
    r.overflow.hidden = !overflows(g, def);
    if (r.slot !== null && r.instTitle && r.instHeading && r.instHeadingVal) {
      const sorted = [...g.instances].sort((a, b) => a.slot - b.slot);
      const idx = sorted.findIndex((i) => i.slot === r.slot);
      r.instTitle.textContent = `Model ${idx + 1} of ${n}`;
      const pose = actions.instanceWorld(g.id, r.slot);
      if (pose) {
        if (document.activeElement !== r.instHeading) r.instHeading.value = String(Math.round(pose.heading) % 360);
        r.instHeadingVal.textContent = fmtDeg(pose.heading);
      }
    }
  }
}
