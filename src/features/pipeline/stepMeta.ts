// File: stepMeta.ts
// Path: src/features/pipeline/stepMeta.ts
//
// What the run dialog shows per pipeline step: a plain description, the
// options a user may change, and whether new SPOCs need a BU + SL.
// Keys match crm-core-service/src/config/pipeline.ts.

import {
  BadgeCheck,
  FileSearch,
  IndianRupee,
  Linkedin,
  Mail,
  Rocket,
  ScanSearch,
  UserSearch,
  type LucideIcon,
} from 'lucide-react';

export interface StepOption {
  key: string;
  label: string;
  hint?: string;
  default: boolean;
  /** shown with a coin icon — uses paid credits */
  paid?: boolean;
}

export interface StepMeta {
  icon: LucideIcon;
  description: string;
  createsSpocs: boolean;
  needs?: 'reports' | 'spocs' | 'approved';
  options: StepOption[];
  /** dry run = estimate only, nothing paid, nothing written */
  dryRun?: boolean;
}

export const STEP_META: Record<string, StepMeta> = {
  run_all: {
    icon: Rocket,
    description: 'Runs the steps below one after another. Stops before approval — a person decides who gets outreach.',
    createsSpocs: true,
    options: [],
    dryRun: true,
  },
  reports: {
    icon: FileSearch,
    description: 'Finds and downloads the annual report, BRSR and CSR reports from the client’s website.',
    createsSpocs: false,
    options: [],
  },
  report_spocs: {
    icon: ScanSearch,
    description: 'Reads the reports for named CSR people and adds them as SPOCs to review.',
    createsSpocs: true,
    needs: 'reports',
    options: [],
  },
  figures: {
    icon: IndianRupee,
    description: 'Reads CSR obligation, spend and unspent figures plus funded programs from the reports.',
    createsSpocs: false,
    needs: 'reports',
    dryRun: true,
    options: [{ key: 'use_claude', label: 'Read PDFs with Claude', hint: 'Needed when no Programs Excel exists', default: true, paid: true }],
  },
  enrich: {
    icon: Linkedin,
    description: 'Looks up each SPOC’s LinkedIn profile and a work email from public sources. Slow and capped per day.',
    createsSpocs: true,
    needs: 'spocs',
    options: [{ key: 'allow_brightdata', label: 'Use Bright Data when the free search finds nothing', default: false, paid: true }],
  },
  apollo: {
    icon: UserSearch,
    description: 'Gets verified emails and phones from Apollo, and can find new CSR / ESG decision-makers.',
    createsSpocs: true,
    dryRun: true,
    options: [
      { key: 'find_new', label: 'Find new decision-makers instead of enriching current SPOCs', default: false, paid: true },
    ],
  },
  validate: {
    icon: BadgeCheck,
    description: 'Checks each SPOC (name, designation, email, LinkedIn, phone) and gives a 0–100 score with a band.',
    createsSpocs: false,
    needs: 'spocs',
    options: [
      { key: 'use_claude', label: 'Let Claude judge unclear designations', default: true, paid: true },
      { key: 'use_bouncer', label: 'Verify emails with Bouncer', default: true, paid: true },
      { key: 'check_email_domains', label: 'Check email domains (DNS)', default: true },
    ],
  },
  emails: {
    icon: Mail,
    description: 'Writes a first email and five follow-ups per approved SPOC, using only figures the CRM holds.',
    createsSpocs: false,
    needs: 'approved',
    dryRun: true,
    options: [],
  },
};

export const RUN_ALL_STEPS = ['reports', 'report_spocs', 'figures', 'enrich', 'apollo', 'validate'];
