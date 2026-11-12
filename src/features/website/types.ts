// File: types.ts
// Path: src/features/website/types.ts

export interface WebsiteCandidate {
  url: string;
  opened: string | null;
  title: string | null;
  how: string | null;
  evidence: string[];
  confidence: number;
}

export interface WebsiteSuggestion {
  runId: string;
  finishedAt: string | null;
  client: { id: string; name: string };
  oldUrl: string | null;
  tried: { url?: string; why?: string; status?: number | null }[];
  candidates: WebsiteCandidate[];
  triggerStep: string | null;
}

export interface WebsiteHistoryRow {
  id: string;
  at: string;
  by: { id: string; firstName: string; lastName: string } | null;
  old: string | null;
  new: string | null;
  via: 'website_check' | 'edit' | 'suggestion_manual';
  runId: string | null;
}

/** one website check, opened from a run (GET /website-suggestions/:id) */
export interface WebsiteCheck {
  runId: string;
  status: string;
  finishedAt: string | null;
  client: {
    id: string;
    name: string;
    website: string | null;
    cin: string | null;
    industry: string | null;
  };
  requestedBy: { id: string; firstName: string; lastName: string } | null;
  request: {
    status: 'OPEN' | 'DONE';
    byName: string;
    at: string;
    doneBy?: string;
    doneAt?: string;
    url?: string;
  } | null;
  oldUrl: string | null;
  dead: boolean | null;
  opensAt: string | null;
  tried: { url?: string; why?: string; status?: number | null }[];
  candidates: WebsiteCandidate[];
  triggerStep: string | null;
  decision: { action: 'replaced' | 'dismissed'; byName: string; at: string; url?: string } | null;
}

/** the finder's check of a typed website (POST /clients/:id/website/check) */
export interface TypedCheck {
  url: string;
  opens: boolean;
  why: string;
  belongs: 'CIN' | 'NAME' | 'OTHER_CIN' | 'UNKNOWN' | 'NO';
  evidence: string[];
  title: string | null;
}
