// File: page.tsx
// Path: src/app/(dashboard)/dashboard/page.tsx

import Link from 'next/link';
import { ArrowRight, BarChart2 } from 'lucide-react';
import ScrollingGreetingBar from '@/components/layout/ScrollingGreetingBar';

// Stage rail — the product's own vocabulary as the visual device.
// One stage lit, the rest waiting. That is what "in progress" means here.
const STAGES = [
  { label: 'Scoped', done: true },
  { label: 'Building', done: false, active: true },
  { label: 'Review', done: false },
  { label: 'Live', done: false },
];

export default function DashboardPage() {
  return (
    <>
      <ScrollingGreetingBar />
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-slate-50 px-6 py-16">
        <div className="w-full max-w-xl">
          {/* Eyebrow */}
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-indigo-600">
            Dashboard
          </p>

          {/* Headline */}
          <h1 className="text-[34px] font-black leading-[1.15] tracking-tight text-slate-900">
            Still in the pipeline.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
            The dashboard is being built. Everything it will summarise already lives in Reports —
            recruiter activity, requirement analytics, sales, and the full candidate pipeline.
          </p>

          {/* Stage rail */}
          <div className="mt-10 flex items-stretch gap-1.5">
            {STAGES.map(s => (
              <div key={s.label} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    s.done ? 'bg-indigo-600' : s.active ? 'bg-indigo-300' : 'bg-slate-200'
                  }`}
                />
                <p
                  className={`mt-2 text-[11px] font-bold ${
                    s.done ? 'text-indigo-700' : s.active ? 'text-indigo-500' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Action */}
          <Link
            href="/reports"
            className="group mt-10 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
                <BarChart2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[15px] font-black text-slate-900">Open Reports</p>
                <p className="text-[12px] font-medium text-slate-500">
                  Overview · Recruiters · Requirements · Candidates · Sales
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-indigo-600" />
          </Link>
        </div>
      </div>
    </>
  );
}
