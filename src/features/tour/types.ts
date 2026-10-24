// File: types.ts
// Path: src/features/tour/types.ts

export type TourPlacement = 'top' | 'right' | 'bottom' | 'left';
export type TourAlign = 'start' | 'center' | 'end';

/** Serializable values only — tours must stay plain data (DB/config friendly). */
export type TourRequirementValue = string | number | boolean | null;

export interface TourStep<R extends string = string> {
  /** Unique within the tour. */
  id: string;
  /** `data-tour` key of the element to highlight. Omit for a centered popover. */
  target?: string;
  title: string;
  /** Plain text. Escaped before render. */
  body: string;
  placement?: TourPlacement;
  align?: TourAlign;
  /** Page state this step needs. Each key must have a handler registered via useTour. */
  requires?: Partial<Record<R, TourRequirementValue>>;
  /** If the target never shows up, skip this step instead of showing it centered. */
  optional?: boolean;
}

export interface TourDefinition<R extends string = string> {
  id: string;
  /** Shown in the help center */
  title: string;
  description: string;
  /** Path prefix the tour belongs to — the topbar offers it on matching pages */
  route: string;
  /** Bump when steps change meaningfully — users who saw an older version see it again. */
  version: number;
  steps: TourStep<R>[];
}

export type TourHandler = (value: TourRequirementValue) => void | Promise<void>;
export type TourHandlers<R extends string = string> = Record<R, TourHandler>;

export type TourEndReason = 'completed' | 'skipped' | 'interrupted';
