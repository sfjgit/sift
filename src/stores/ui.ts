// File: ui.ts
// Path: src/stores/ui.ts
//
// App-wide UI toggles that several unrelated components open:
// command palette, AI command bar, quick-create dialogs, shortcuts sheet.

import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

// localStorage can be missing or throw (private mode, blocked site data, quota):
// never let a UI preference break the app.
const safeStorage: StateStorage = {
  getItem: name => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: name => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

interface SpocDraft {
  clientId?: string;
  clientName?: string;
}

interface UiState {
  commandOpen: boolean;
  /** text the ⌘K palette starts with the next time it opens (AI "search" results) */
  commandSeed: string;
  /** the AI command bar (Ctrl/⌘+J) */
  aiOpen: boolean;
  shortcutsOpen: boolean;
  clientDialog: boolean;
  spocDialog: SpocDraft | null;
  sidebarCollapsed: boolean;
  /** desktop: keep the sidebar / top bar on screen instead of auto-hiding them */
  sidebarPinned: boolean;
  topbarPinned: boolean;
  /** the website-check run whose fix dialog is open */
  websiteFix: string | null;
  openWebsiteFix: (runId: string | null) => void;
  setCommandOpen: (v: boolean) => void;
  setCommandSeed: (q: string) => void;
  setAiOpen: (v: boolean) => void;
  setShortcutsOpen: (v: boolean) => void;
  openClientDialog: (v?: boolean) => void;
  openSpocDialog: (draft?: SpocDraft | null) => void;
  toggleSidebar: () => void;
  toggleSidebarPin: () => void;
  toggleTopbarPin: () => void;
}

export const useUi = create<UiState>()(
  persist(
    set => ({
      commandOpen: false,
      commandSeed: '',
      aiOpen: false,
      shortcutsOpen: false,
      clientDialog: false,
      spocDialog: null,
      sidebarCollapsed: false,
      sidebarPinned: false,
      topbarPinned: false,
      websiteFix: null,
      openWebsiteFix: websiteFix => set({ websiteFix }),
      setCommandOpen: commandOpen => set({ commandOpen }),
      setCommandSeed: commandSeed => set({ commandSeed }),
      setAiOpen: aiOpen => set({ aiOpen }),
      setShortcutsOpen: shortcutsOpen => set({ shortcutsOpen }),
      openClientDialog: (v = true) => set({ clientDialog: v }),
      openSpocDialog: (draft = {}) => set({ spocDialog: draft }),
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleSidebarPin: () => set(s => ({ sidebarPinned: !s.sidebarPinned })),
      toggleTopbarPin: () => set(s => ({ topbarPinned: !s.topbarPinned })),
    }),
    {
      name: 'crm-ui',
      storage: createJSONStorage(() => safeStorage),
      partialize: s => ({
        sidebarCollapsed: s.sidebarCollapsed,
        sidebarPinned: s.sidebarPinned,
        topbarPinned: s.topbarPinned,
      }),
    }
  )
);
