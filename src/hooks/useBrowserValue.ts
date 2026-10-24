// File: useBrowserValue.ts
// Path: src/hooks/useBrowserValue.ts

'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/**
 * Reads a browser-only value (cookie, query string, localStorage) without a
 * hydration mismatch: the server render uses `serverValue`, the client the real one.
 */
export function useBrowserValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, read, () => serverValue);
}
