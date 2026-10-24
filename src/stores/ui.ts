// File: ui.ts
// Path: src/stores/ui.ts
//
// App-wide UI toggles that several unrelated components open:
// command palette, quick-create dialogs, shortcuts sheet.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SpocDraft {
  clientId?: string;
  clientName?: string;
}

interface UiState {
  commandOpen: boolean;
  shortcutsOpen: boolean;
  clientDialog: boolean;
  spocDialog: SpocDraft | null;
  sidebarCollapsed: boolean;
  setCommandOpen: (v: boolean) => void;
  setShortcutsOpen: (v: boolean) => void;
  openClientDialog: (v?: boolean) => void;
  openSpocDialog: (draft?: SpocDraft | null) => void;
  toggleSidebar: () => void;
}

export const useUi = create<UiState>()(
  persist(
    set => ({
      commandOpen: false,
      shortcutsOpen: false,
      clientDialog: false,
      spocDialog: null,
      sidebarCollapsed: false,
      setCommandOpen: commandOpen => set({ commandOpen }),
      setShortcutsOpen: shortcutsOpen => set({ shortcutsOpen }),
      openClientDialog: (v = true) => set({ clientDialog: v }),
      openSpocDialog: (draft = {}) => set({ spocDialog: draft }),
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'crm-ui', partialize: s => ({ sidebarCollapsed: s.sidebarCollapsed }) }
  )
);
