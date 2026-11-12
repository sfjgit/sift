// File: useEdgeReveal.ts
// Path: src/components/shell/useEdgeReveal.ts
//
// "Full screen by default" for the desktop shell: an unpinned bar stays off
// screen until the mouse rests on its window edge (or keyboard focus lands in
// it), then hides again once the mouse has left it for a moment. It never
// hides while something opened from it (menu, popover, dialog) is still open,
// or while it holds keyboard focus.

'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** px from the window edge that count as "asking for the bar" */
export const EDGE_ZONE = 6;
const SHOW_DELAY = 130; // hover intent: a quick pass along the edge does nothing
const HIDE_DELAY = 600; // forgiving: a small overshoot doesn't snap the bar away
const NEAR = 8; // px of slack around the bar before the pointer counts as gone

// anything open that the user may still be working in
const OPEN_OVERLAY =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"][data-state="open"]';

const DESKTOP_QUERY = '(min-width: 1024px) and (pointer: fine)';

function subscribeDesktop(cb: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** lg+ with a mouse/trackpad: the only place the auto-hiding shell applies */
export function useAutoHideDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false
  );
}

/** let fitted tables / charts re-measure once a layout change has settled */
export function announceLayoutChange() {
  if (typeof window === 'undefined') return;
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  // again after the 200ms width/slide transitions finish
  window.setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
}

// last known pointer position + which input was used last, shared by every bar
const pointer = { x: -1, y: -1 };
const input = { keyboard: false };

export function useEdgeReveal<T extends HTMLElement>(edge: 'left' | 'top', enabled: boolean) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  const shownRef = useRef(false);

  const set = useCallback((v: boolean) => {
    shownRef.current = v;
    setShown(v);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let showTimer: number | undefined;
    let hideTimer: number | undefined;

    const clearShow = () => {
      window.clearTimeout(showTimer);
      showTimer = undefined;
    };
    const clearHide = () => {
      window.clearTimeout(hideTimer);
      hideTimer = undefined;
    };

    const inZone = (x: number, y: number) => {
      const el = ref.current;
      if (!el || x < 0) return false;
      const r = el.getBoundingClientRect();
      // the zone only spans the bar's own extent (e.g. not above a pinned sidebar)
      return edge === 'left'
        ? x <= EDGE_ZONE && y >= r.top && y <= r.bottom
        : y <= EDGE_ZONE && x >= r.left && x <= r.right;
    };

    const near = (x: number, y: number) => {
      const el = ref.current;
      if (!el || x < 0) return false;
      if (inZone(x, y)) return true;
      const r = el.getBoundingClientRect();
      return x >= r.left - NEAR && x <= r.right + NEAR && y >= r.top - NEAR && y <= r.bottom + NEAR;
    };

    const held = () => {
      const el = ref.current;
      if (!el) return false;
      return (
        // a menu/popover trigger in the bar is open
        !!el.querySelector('[aria-expanded="true"]') ||
        // keyboard focus is inside while the user is still on the keyboard
        // (mouse clicks don't match :focus-visible; moving the mouse away after
        // e.g. Esc-closing a menu hands control back to the mouse)
        (input.keyboard && !!el.querySelector(':focus-visible')) ||
        // a dialog (command palette, shortcuts, quick-create…) or menu is open
        !!document.querySelector(OPEN_OVERLAY)
      );
    };

    const tryHide = () => {
      hideTimer = undefined;
      if (!shownRef.current) return;
      if (near(pointer.x, pointer.y)) return;
      if (held()) {
        hideTimer = window.setTimeout(tryHide, HIDE_DELAY);
        return;
      }
      hide();
    };

    const hide = () => {
      const el = ref.current;
      // don't leave focus parked on an off-screen control
      if (el && el.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
      set(false);
    };

    const scheduleHide = () => {
      if (hideTimer === undefined) hideTimer = window.setTimeout(tryHide, HIDE_DELAY);
    };

    const evaluate = () => {
      const { x, y } = pointer;
      if (!shownRef.current) {
        if (inZone(x, y)) {
          if (showTimer === undefined)
            showTimer = window.setTimeout(() => {
              showTimer = undefined;
              if (inZone(pointer.x, pointer.y)) {
                clearHide();
                set(true);
              }
            }, SHOW_DELAY);
        } else clearShow();
        return;
      }
      if (near(x, y)) clearHide();
      else scheduleHide();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (e.clientX !== pointer.x || e.clientY !== pointer.y) input.keyboard = false;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      evaluate();
    };

    // the mouse flew out of the window past an edge: treat as resting on it
    const onOut = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      pointer.x = Math.max(0, e.clientX);
      pointer.y = Math.max(0, e.clientY);
      evaluate();
    };

    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as Element | null;
      if (!t || !ref.current?.contains(t)) return;
      let keyboard = false;
      try {
        keyboard = t.matches(':focus-visible');
      } catch {
        keyboard = false;
      }
      if (keyboard) {
        clearHide();
        set(true);
      }
    };

    const onFocusOut = () => {
      if (shownRef.current) scheduleHide();
    };

    const onKey = (e: KeyboardEvent) => {
      input.keyboard = true;
      // Esc from inside a revealed bar (no menu open) puts it away
      if (e.key !== 'Escape' || !shownRef.current) return;
      const el = ref.current;
      if (!el || !el.contains(document.activeElement)) return;
      if (el.querySelector('[aria-expanded="true"]') || document.querySelector(OPEN_OVERLAY)) return;
      clearHide();
      hide();
    };

    window.addEventListener('pointermove', onMove, { capture: true, passive: true });
    document.addEventListener('mouseout', onOut);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKey);
    // a bar that was just unpinned under the mouse stays until the mouse leaves
    if (shownRef.current) evaluate();
    return () => {
      clearShow();
      clearHide();
      window.removeEventListener('pointermove', onMove, { capture: true });
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('keydown', onKey);
    };
  }, [edge, enabled, set]);

  return { ref, shown: enabled && shown, setShown: set };
}
