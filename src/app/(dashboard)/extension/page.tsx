// File: page.tsx
// Path: src/app/(dashboard)/extension/page.tsx

'use client';

import Link from 'next/link';
import { Puzzle, Chrome, FileText, Bot, CopyCheck, Link2, ShieldCheck, Lock } from 'lucide-react';

const EXTENSION_URL =
  'https://chromewebstore.google.com/detail/dlfooldlaidjhcnhnlhhmblambjedgif?utm_source=item-share-cb';

const STEPS = [
  {
    n: 1,
    title: 'Install the extension',
    desc: 'Click "Add to Chrome" and confirm the install prompt in your browser.',
  },
  {
    n: 2,
    title: 'Log in once',
    desc: 'Open the extension popup and sign in with your TalentOS credentials.',
  },
  {
    n: 3,
    title: 'Browse Naukri',
    desc: 'Navigate to any candidate profile on Naukri.com as you normally would.',
  },
  {
    n: 4,
    title: 'Ingest with one click',
    desc: 'Hit "Parse Resume" in the popup — the candidate lands in TalentOS instantly.',
  },
];

const FEATURES = [
  {
    icon: FileText,
    title: 'Auto resume extraction',
    desc: 'Pulls structured data from Naukri profiles — name, contact, skills, experience.',
  },
  {
    icon: Bot,
    title: 'AI-powered parsing',
    desc: 'GPT normalises raw resume text into clean candidate records automatically.',
  },
  {
    icon: CopyCheck,
    title: 'Duplicate detection',
    desc: 'File and text checksums prevent the same candidate from being ingested twice.',
  },
  {
    icon: Link2,
    title: 'Assignment linking',
    desc: 'Optionally attach the candidate directly to an open requirement assignment.',
  },
];

const COMPAT = [
  { icon: Chrome, label: 'Chrome 110+' },
  { icon: ShieldCheck, label: 'Manifest V3' },
  { icon: Lock, label: 'JWT auth · secure' },
];

export default function ExtensionPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
          <Puzzle className="h-3.5 w-3.5" />
          Chrome Extension · v1.0
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">TalentOS Resume Parser</h1>
        <p className="text-muted-foreground text-[15px] max-w-md mx-auto leading-relaxed">
          Capture candidate profiles from Naukri directly into TalentOS with one click. No
          copy-paste, no manual entry.
        </p>
        <Link
          href={EXTENSION_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-[#0d1b4b] hover:bg-[#0d1b4b]/90 text-white text-sm font-medium rounded-lg px-5 py-3 transition-colors"
        >
          <Chrome className="h-4 w-4" />
          Add to Chrome — it&apos;s free
        </Link>
      </div>

      {/* Steps */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 font-medium">
          How to get started
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STEPS.map(s => (
            <div key={s.n} className="border border-border rounded-xl p-4 bg-background space-y-2">
              <div className="h-7 w-7 rounded-full bg-[#0d1b4b] text-white flex items-center justify-center text-xs font-medium">
                {s.n}
              </div>
              <p className="text-sm font-medium">{s.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 font-medium">
          What it does
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="flex items-start gap-3 border border-border rounded-xl p-4 bg-muted/30"
            >
              <f.icon className="h-5 w-5 text-[#4f7cff] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compat */}
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 font-medium">
          Compatibility
        </p>
        <div className="flex flex-wrap gap-2">
          {COMPAT.map(c => (
            <div
              key={c.label}
              className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 text-sm text-muted-foreground bg-muted/30"
            >
              <c.icon className="h-4 w-4" />
              {c.label}
            </div>
          ))}
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5 text-sm text-muted-foreground bg-muted/30">
            🌐 Naukri.com
          </div>
        </div>
      </div>
    </div>
  );
}
