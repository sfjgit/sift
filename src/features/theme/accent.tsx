// File: accent.tsx
// Path: src/features/theme/accent.tsx
//
// Colour themes. Light / dark stays with next-themes; the accent colour
// (buttons, links, selected rows, the sidebar highlight) is picked here and
// remembered on this device. Applied as CSS variables on <html>, so every
// component that uses the theme tokens follows it.

'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';

type Vars = Record<string, string>;
export interface Accent {
  id: string;
  label: string;
  /** swatch colour */
  swatch: string;
  light: Vars;
  dark: Vars;
}

const set = (
  primary: string,
  primaryFg: string,
  accent: string,
  accentFg: string,
  ring: string
): Vars => ({
  '--primary': primary,
  '--primary-foreground': primaryFg,
  '--ring': ring,
  '--accent': accent,
  '--accent-foreground': accentFg,
  '--sidebar-primary': primary,
  '--sidebar-primary-foreground': primaryFg,
  '--sidebar-accent': accent,
  '--sidebar-accent-foreground': accentFg,
  '--sidebar-ring': ring,
});

export const ACCENTS: Accent[] = [
  { id: 'blue', label: 'Blue', swatch: '#2563eb', light: {}, dark: {} },
  {
    id: 'indigo',
    label: 'Indigo',
    swatch: '#4f46e5',
    light: set('#4f46e5', '#ffffff', '#eef2ff', '#4338ca', '#6366f1'),
    dark: set('#6366f1', '#ffffff', '#1e1b4b', '#c7d2fe', '#818cf8'),
  },
  {
    id: 'violet',
    label: 'Violet',
    swatch: '#7c3aed',
    light: set('#7c3aed', '#ffffff', '#f5f3ff', '#6d28d9', '#8b5cf6'),
    dark: set('#8b5cf6', '#ffffff', '#2e1065', '#ddd6fe', '#a78bfa'),
  },
  {
    id: 'teal',
    label: 'Teal',
    swatch: '#0d9488',
    light: set('#0d9488', '#ffffff', '#f0fdfa', '#0f766e', '#14b8a6'),
    dark: set('#14b8a6', '#042f2e', '#042f2e', '#99f6e4', '#2dd4bf'),
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: '#e11d48',
    light: set('#e11d48', '#ffffff', '#fff1f2', '#be123c', '#f43f5e'),
    dark: set('#f43f5e', '#ffffff', '#4c0519', '#fecdd3', '#fb7185'),
  },
  {
    id: 'orange',
    label: 'Orange',
    swatch: '#ea580c',
    light: set('#ea580c', '#ffffff', '#fff7ed', '#c2410c', '#f97316'),
    dark: set('#f97316', '#1c0a02', '#431407', '#fed7aa', '#fb923c'),
  },
  {
    id: 'graphite',
    label: 'Graphite',
    swatch: '#27272a',
    light: set('#18181b', '#ffffff', '#f4f4f5', '#18181b', '#71717a'),
    dark: set('#fafafa', '#18181b', '#27272a', '#fafafa', '#a1a1aa'),
  },
];

const KEY = 'crm:accent';
/** what everyone gets until they pick a colour (16 Nov: Graphite, to try) */
export const DEFAULT_ACCENT = 'graphite';
const listeners = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
};
export function setAccent(id: string) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* this visit only */
  }
  listeners.forEach(l => l());
}
export function useAccent() {
  return useSyncExternalStore(
    cb => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => DEFAULT_ACCENT
  );
}

/** applies the chosen accent for the current light / dark mode */
export function AccentApplier() {
  const id = useAccent();
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const root = document.documentElement.style;
    const all = new Set(ACCENTS.flatMap(a => [...Object.keys(a.light), ...Object.keys(a.dark)]));
    all.forEach(k => root.removeProperty(k));
    const a = ACCENTS.find(x => x.id === id);
    const vars = a ? (resolvedTheme === 'dark' ? a.dark : a.light) : {};
    for (const [k, v] of Object.entries(vars)) root.setProperty(k, v);
  }, [id, resolvedTheme]);
  return null;
}

/** a row of colour dots — used in the account menu and Preferences */
export function AccentDots({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const current = useAccent();
  const dot = size === 'sm' ? 'size-5' : 'size-7';
  return (
    <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-1.5">
      {ACCENTS.map(a => (
        <button
          key={a.id}
          type="button"
          role="radio"
          aria-checked={current === a.id}
          title={a.label}
          onClick={e => {
            e.preventDefault();
            setAccent(a.id);
          }}
          className={`${dot} grid place-items-center rounded-full ring-offset-2 ring-offset-background transition-transform outline-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring ${current === a.id ? 'ring-2 ring-foreground/70' : ''}`}
          style={{ background: a.swatch }}
        >
          <span className="sr-only">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
