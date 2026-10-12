/** Quiet toasts, the in-app confirm dialog and the placement hint. */
import { h } from './dom';

export class Toasts {
  constructor(private el: HTMLElement) {}

  show(msg: string, ms = 3200) {
    // collapse repeats of the same message
    for (const c of Array.from(this.el.children)) if (c.textContent === msg) c.remove();
    const t = h('div', { class: 'toast', role: 'status' }, msg);
    this.el.appendChild(t);
    while (this.el.children.length > 3) this.el.firstElementChild?.remove();
    requestAnimationFrame(() => t.classList.add('in'));
    window.setTimeout(() => {
      t.classList.remove('in');
      window.setTimeout(() => t.remove(), 260);
    }, ms);
  }
}

export interface ConfirmOptions {
  title: string;
  body: string;
  confirm: string;
  cancel?: string;
  danger?: boolean;
}

let openDialog: HTMLElement | null = null;

export function isDialogOpen(): boolean {
  return !!openDialog;
}

export function confirmDialog(o: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    openDialog?.remove();
    const finish = (v: boolean) => {
      back.remove();
      openDialog = null;
      window.removeEventListener('keydown', onKey, true);
      resolve(v);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        finish(true);
      }
    };
    const ok = h('button', { class: 'btn ' + (o.danger ? 'danger' : 'primary'), onclick: () => finish(true) }, o.confirm);
    const dialog = h(
      'div',
      { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': o.title },
      h('h3', { class: 'modal-title' }, o.title),
      h('p', { class: 'modal-body' }, o.body),
      h('div', { class: 'modal-actions' }, h('button', { class: 'btn', onclick: () => finish(false) }, o.cancel ?? 'Cancel'), ok),
    );
    const back = h('div', { class: 'modal-back', onpointerdown: (e: Event) => e.target === back && finish(false) }, dialog);
    document.body.appendChild(back);
    openDialog = back;
    window.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => {
      back.classList.add('in');
      ok.focus();
    });
  });
}
