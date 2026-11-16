// File: tones.ts
// Path: src/features/support/tones.ts

import type { Tone } from '@/components/common/badges';
import type { Severity } from '@/types/support';

export const STATUS_TONE: Record<string, Tone> = {
  NEW: 'info',
  NEEDS_REPRO: 'warning',
  INVESTIGATING: 'primary',
  FIXED: 'success',
  CLOSED: 'neutral',
  WONT_FIX: 'neutral',
  UNDER_REVIEW: 'info',
  PLANNED: 'violet',
  IN_PROGRESS: 'primary',
  SHIPPED: 'success',
  DECLINED: 'neutral',
};

export const SEVERITY_TONE: Record<Severity, Tone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  BLOCKER: 'danger',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  LOW: 'Minor',
  MEDIUM: 'Annoying',
  HIGH: 'Blocks work',
  BLOCKER: 'Can’t work',
};
