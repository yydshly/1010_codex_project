/**
 * Keyboard shortcuts: Delete remove, Ctrl+D duplicate, F focus, H hide UI, Q/E rotate 15 deg
 * (R rotates the placement preview 90 deg), Esc cancel / step back, Ctrl+Z / Ctrl+Shift+Z
 * (or Ctrl+Y) undo / redo. Ignored while typing in a field.
 */
import type { AppContext } from './context';
import { isDialogOpen } from './ui/feedback';

function typing(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['range', 'checkbox', 'radio', 'button'].includes(type);
  }
  return false;
}

export function installKeyboard(ctx: AppContext) {
  const { store, actions, interaction } = ctx;
  window.addEventListener('keydown', (e) => {
    if (isDialogOpen()) return;
    const k = e.key.toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const inField = typing(e.target);
    if (mod && (k === 'z' || k === 'y')) {
      if (inField) return; // native text undo
      e.preventDefault();
      if (k === 'y' || e.shiftKey) store.redo();
      else store.undo();
      return;
    }
    if (inField) {
      if (k === 'escape') (e.target as HTMLElement).blur();
      return;
    }
    const sel = store.selection;
    if (mod && k === 'd') {
      e.preventDefault();
      if (sel) actions.duplicate(sel.groupId);
      return;
    }
    if (mod || e.altKey) return;
    switch (k) {
      case 'delete':
      case 'backspace':
        if (sel) {
          e.preventDefault();
          actions.removeSelection();
        }
        break;
      case 'f':
        ctx.focus();
        break;
      case 'h':
        ctx.setUIHidden(!store.ui.hidden);
        break;
      case 'q':
      case 'e': {
        const d = k === 'q' ? 15 : -15;
        if (interaction.placement) interaction.rotatePlacement(d);
        else if (sel) actions.rotateBy(sel.groupId, sel.slot, d);
        break;
      }
      case 'r':
        if (interaction.placement) interaction.rotatePlacement(90);
        break;
      case 'escape':
        if (interaction.placement) interaction.cancelPlacement();
        else if (sel && sel.slot !== null) actions.select(sel.groupId, null);
        else if (sel) actions.select(null);
        else if (store.ui.hidden) ctx.setUIHidden(false);
        break;
    }
  });
}
