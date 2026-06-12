// File: useRequirementDraftStore.ts
// Path: src/stores/useRequirementDraftStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementDraft {
  // step tracker
  currentStep: number;
  completedSteps: number[];

  // JD meta
  parsedJDId: string | null;
  parsedTitle: string | null;
  jdDisplayName: string | null;
  jdParsedAt: string | null;
  jdParseStatus: 'PARSED' | 'FAILED' | 'MANUALLY_OVERRIDDEN' | null;
  jdParsedFields: string[];
  jdFileKey: string | null;
  jdFileName: string | null;
  jdFileType: string | null;

  // step 1 — job info
  title: string;
  description: string;
  jobType: string;
  remoteType: string;
  priority: string;
  jobOpenFor: string;
  totalOpenings: number;
  city: string;
  state: string;
  country: string;
  functionalArea: string;
  shift: string;
  education: string;

  // step 2 — skills
  primarySkills: string[];
  keySkills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  targetCompanies: string[];
  noPoachCompanies: string[];

  // step 3 — compensation
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string;
  salaryCurrency: string;
  bonusAmount: number | null;
  hideSalaryFromCandidate: boolean;
  showMedianSalary: boolean;

  // step 4 — client & spoc
  selectedClientId: string;
  clientSpocId: string;

  // step 5 — timeline
  startDate: string;
  targetDate: string;
  respondBy: string;
  turnaroundDays: number | null;

  // meta
  lastSavedAt: string | null;
}

interface RequirementDraftStore {
  draft: RequirementDraft;
  setDraft: (patch: Partial<RequirementDraft>) => void;
  setStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  clearDraft: () => void;
  hasDraft: () => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_DRAFT: RequirementDraft = {
  currentStep: 1,
  completedSteps: [],

  parsedJDId: null,
  parsedTitle: null,
  jdDisplayName: null,
  jdParsedAt: null,
  jdParseStatus: null,
  jdParsedFields: [],
  jdFileKey: null,
  jdFileName: null,
  jdFileType: null,

  title: '',
  description: '',
  jobType: '',
  remoteType: '',
  priority: 'MEDIUM',
  jobOpenFor: 'EXTERNAL',
  totalOpenings: 1,
  city: '',
  state: '',
  country: '',
  functionalArea: '',
  shift: '',
  education: '',

  primarySkills: [],
  keySkills: [],
  experienceMin: null,
  experienceMax: null,
  targetCompanies: [],
  noPoachCompanies: [],

  salaryMin: null,
  salaryMax: null,
  salaryType: '',
  salaryCurrency: 'INR',
  bonusAmount: null,
  hideSalaryFromCandidate: false,
  showMedianSalary: false,

  selectedClientId: '',
  clientSpocId: '',

  startDate: '',
  targetDate: '',
  respondBy: '',
  turnaroundDays: null,

  lastSavedAt: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────────────────

export const useRequirementDraftStore = create<RequirementDraftStore>()(
  persist(
    (set, get) => ({
      draft: DEFAULT_DRAFT,

      setDraft: patch =>
        set(state => ({
          draft: {
            ...state.draft,
            ...patch,
            lastSavedAt: new Date().toISOString(),
          },
        })),

      setStep: step =>
        set(state => ({
          draft: { ...state.draft, currentStep: step, lastSavedAt: new Date().toISOString() },
        })),

      markStepComplete: step =>
        set(state => ({
          draft: {
            ...state.draft,
            completedSteps: Array.from(new Set([...state.draft.completedSteps, step])),
            lastSavedAt: new Date().toISOString(),
          },
        })),

      clearDraft: () => set({ draft: DEFAULT_DRAFT }),

      // returns true if user has typed anything meaningful
      hasDraft: () => {
        const d = get().draft;
        return !!(
          d.title ||
          d.description ||
          d.jobType ||
          d.primarySkills.length ||
          d.keySkills.length ||
          d.clientSpocId ||
          d.parsedJDId
        );
      },
    }),
    {
      name: 'talentos-requirement-draft', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
);
