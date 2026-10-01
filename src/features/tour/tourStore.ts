// File: tourStore.ts
// Path: src/features/tour/tourStore.ts

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { TOUR_CONFIG } from './tour.constants';

interface TourState {
  activeTourId: string | null;
  /** True once persisted "seen" state has loaded from storage. */
  hydrated: boolean;
  /** `${userKey}:${tourId}` → last completed/skipped version. */
  seen: Record<string, number>;

  /** Starts a tour. Ignored (returns false) if another tour is running. */
  start: (tourId: string) => boolean;
  stop: () => void;
  markSeen: (userKey: string, tourId: string, version: number) => void;
  /** Reset one tour, or every tour for this user when tourId is omitted. */
  resetSeen: (userKey: string, tourId?: string) => void;
  setHydrated: (value: boolean) => void;
}

export const seenKey = (userKey: string, tourId: string) => `${userKey}:${tourId}`;

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      activeTourId: null,
      hydrated: false,
      seen: {},

      start: tourId => {
        if (get().activeTourId) return false;
        set({ activeTourId: tourId });
        return true;
      },

      stop: () => set({ activeTourId: null }),

      markSeen: (userKey, tourId, version) =>
        set(s => ({ seen: { ...s.seen, [seenKey(userKey, tourId)]: version } })),

      resetSeen: (userKey, tourId) =>
        set(s => {
          const next = { ...s.seen };
          for (const key of Object.keys(next)) {
            const match = tourId ? key === seenKey(userKey, tourId) : key.startsWith(`${userKey}:`);
            if (match) delete next[key];
          }
          return { seen: next };
        }),

      setHydrated: value => set({ hydrated: value }),
    }),
    {
      name: TOUR_CONFIG.storageKey,
      version: TOUR_CONFIG.storageVersion,
      storage: createJSONStorage(() => localStorage),
      partialize: s => ({ seen: s.seen }),
      // Rehydrated manually in TourEngine to avoid SSR hydration mismatches.
      skipHydration: true,
    }
  )
);
