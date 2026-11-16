// File: threadArea.ts
// Path: src/features/ai/threadArea.ts
//
// Tiny helpers the AI dock needs on every page. They live apart from
// CanvasWorkspace so the canvas (charts, org chart) loads only when opened.

/** the thread you are in survives page changes and reloads, until you start a new one */
const ACTIVE_KEY = 'crm:ai-thread';
/** one conversation per area of the CRM: /clients and /clients/<id> share one, /spocs has its own */
export const areaOf = (path: string) => `/${path.split('/')[1] ?? ''}`;
export const readActive = (area: string) => {
  try {
    return localStorage.getItem(`${ACTIVE_KEY}:${area}`);
  } catch {
    return null;
  }
};
export const writeActive = (area: string, id: string | null) => {
  try {
    if (id) localStorage.setItem(`${ACTIVE_KEY}:${area}`, id);
    else localStorage.removeItem(`${ACTIVE_KEY}:${area}`);
  } catch {
    /* not remembered */
  }
};

/** a prompt handed to the workspace from outside (voice); `n` makes repeats distinct */
export interface Incoming {
  prompt: string;
  n: number;
}
