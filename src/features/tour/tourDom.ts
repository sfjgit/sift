// File: tourDom.ts
// Path: src/features/tour/tourDom.ts

const isVisible = (el: Element) => el.getClientRects().length > 0;

/** Resolves with the first visible match, or null after `timeoutMs`. */
export function waitForElement(selector: string, timeoutMs: number): Promise<Element | null> {
  return new Promise(resolve => {
    const find = () => {
      const el = document.querySelector(selector);
      return el && isVisible(el) ? el : null;
    };

    const immediate = find();
    if (immediate) {
      resolve(immediate);
      return;
    }

    let settled = false;
    const done = (el: Element | null) => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      resolve(el);
    };

    const observer = new MutationObserver(() => {
      const el = find();
      if (el) done(el);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const timer = setTimeout(() => done(find()), timeoutMs);
  });
}

/** Wait one paint so React commits state changes from requirement handlers. */
export const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => r()));

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** driver.js renders title/description as HTML — escape so tour data can come from DB safely. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
