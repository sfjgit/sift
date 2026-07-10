/* eslint-disable react/no-unescaped-entities */
// File: RequirementOverviewTab.tsx
// Path: src/components/requirements/RequirementOverviewTab.tsx
'use client';

import { format } from 'date-fns';
import { daysRemaining } from './types';
import type { RequirementDetail } from './types';

interface Props {
  requirement: RequirementDetail;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKDOWN → HTML  (description field comes in as raw markdown from DB)
// ─────────────────────────────────────────────────────────────────────────────

function parseMd(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList = false;

  for (const line of lines) {
    const t = line.trim();

    if (!t) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      continue;
    }

    if (t.startsWith('### ')) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(`<h3>${t.slice(4)}</h3>`);
    } else if (t.startsWith('## ')) {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      // skip the redundant "## Job Title: ..." — already shown in the page header
      if (!t.toLowerCase().includes('job title')) {
        out.push(`<h2>${t.slice(3)}</h2>`);
      }
    } else if (t.startsWith('- ')) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${t.slice(2)}</li>`);
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(`<p>${t}</p>`);
    }
  }

  if (inList) out.push('</ul>');
  return out.join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/** Sidebar section wrapper */
function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{title}</p>
      {children}
    </div>
  );
}

/** Single key / value row inside a SideCard */
function DR({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-400 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-slate-800 text-right max-w-[170px]">{value}</span>
    </div>
  );
}

/** Skill / tag pill */
function Pill({
  text,
  variant = 'default',
}: {
  text: string;
  variant?: 'primary' | 'key' | 'teal' | 'red' | 'default';
}) {
  const cls = {
    primary: 'bg-rose-50 text-rose-700 border-rose-200',
    key: 'bg-blue-50 text-blue-700 border-blue-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    default: 'bg-slate-100 text-slate-600 border-slate-200',
  }[variant];
  return (
    <span
      className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border m-0.5 ${cls}`}
    >
      {text}
    </span>
  );
}

/** Deadline row with overdue badge — keeps the existing DateRow logic */
function DeadlineRow({
  label,
  date,
  breached,
}: {
  label: string;
  date: string | null;
  breached?: boolean;
}) {
  if (!date) return null;
  const days = daysRemaining(date);
  const past = days !== null && days < 0;
  return (
    <div className="flex items-baseline justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-400 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-800">
          {format(new Date(date), 'dd MMM yyyy')}
        </span>
        {days !== null && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              breached || past
                ? 'bg-red-100 text-red-700'
                : days <= 3
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {past ? `${Math.abs(days)}d overdue` : `${days}d left`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function RequirementOverviewTab({ requirement: req }: Props) {
  const salaryDisplay =
    req.salaryMin != null && req.salaryMax != null
      ? `${req.salaryCurrency ?? 'INR'} ${(req.salaryMin / 100000).toFixed(1)}L – ${(req.salaryMax / 100000).toFixed(1)}L`
      : req.salaryMin != null
        ? `From ${req.salaryCurrency ?? 'INR'} ${(req.salaryMin / 100000).toFixed(1)}L`
        : null;

  const location = [req.city, req.state, req.country].filter(Boolean).join(', ') || null;

  return (
    <>
      {/* ── scoped prose styles ─────────────────────────────────────────── */}
      <style>{`
        .jd-prose h2 {
          font-size: 13px; font-weight: 600; color: #1e293b;
          margin: 1rem 0 .375rem; padding-bottom: .25rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .jd-prose h3 {
          font-size: 13px; font-weight: 600; color: #1e293b;
          margin: .875rem 0 .35rem; padding-bottom: .2rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .jd-prose h2:first-child,
        .jd-prose h3:first-child { margin-top: 0; }
        .jd-prose ul {
          padding-left: 1.125rem; margin-bottom: .5rem;
          list-style-type: disc;
        }
        .jd-prose li {
          margin-bottom: .15rem; font-size: 13px;
          line-height: 1.75; color: #475569;
        }
        .jd-prose p {
          margin-bottom: .6rem; font-size: 13px;
          line-height: 1.75; color: #475569;
        }
      `}</style>

      {/* ── two-column shell — parent TabsContent must be overflow-hidden ── */}
      <div className="grid h-full" style={{ gridTemplateColumns: '1fr 288px' }}>
        {/* ════════════════════════════════════════════════════════════════
            LEFT — job header card + description prose
        ════════════════════════════════════════════════════════════════ */}
        <div className="overflow-y-auto p-5 space-y-4 border-r border-slate-200">
          {/* ── header card ─────────────────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* badge row */}
                <div className="flex items-center gap-2 flex-wrap mb-2.5">
                  <span className="text-[10px] font-mono font-semibold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                    {req.reqCode}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      req.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : req.status === 'CLOSED' || req.status === 'CANCELLED'
                          ? 'bg-slate-100 text-slate-500 border-slate-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {req.status.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      req.priority === 'HIGH'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : req.priority === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {req.priority}
                  </span>
                  {req.client?.name && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {req.client.name}
                    </span>
                  )}
                </div>

                {/* title */}
                <h1 className="text-[17px] font-bold text-slate-900 leading-snug mb-2.5">
                  {req.title}
                </h1>

                {/* meta pills */}
                <div className="flex flex-wrap gap-1.5">
                  {req.remoteType && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      {req.remoteType}
                    </span>
                  )}
                  {req.jobType && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {req.jobType.replace(/_/g, ' ')}
                    </span>
                  )}
                  {req.experienceMin != null && req.experienceMax != null && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {req.experienceMin}–{req.experienceMax} yrs
                    </span>
                  )}
                  {req.totalOpenings > 0 && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {req.totalOpenings} opening{req.totalOpenings !== 1 ? 's' : ''}
                    </span>
                  )}
                  {location && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {location}
                    </span>
                  )}
                  {req.businessUnit?.name && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {req.businessUnit.name}
                      {req.serviceLine?.name ? ` · ${req.serviceLine.name}` : ''}
                    </span>
                  )}
                  {req.jobOpenFor && (
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                      Open for: {req.jobOpenFor}
                    </span>
                  )}
                </div>
              </div>

              {/* salary — top right */}
              {salaryDisplay && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                    Salary range
                  </p>
                  <p className="text-base font-bold text-emerald-700">{salaryDisplay}</p>
                  {req.salaryType && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{req.salaryType}</p>
                  )}
                  {req.bonusAmount ? (
                    <p className="text-[10px] text-violet-600 font-semibold mt-1">
                      + {req.salaryCurrency ?? 'INR'} {req.bonusAmount} bonus
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* ── description prose ───────────────────────────────────────── */}
          {req.description && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                Job Description
              </p>
              <div
                className="jd-prose"
                dangerouslySetInnerHTML={{ __html: parseMd(req.description) }}
              />
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            RIGHT SIDEBAR — all metadata cards stacked vertically
        ════════════════════════════════════════════════════════════════ */}
        <div className="overflow-y-auto p-4 space-y-3 bg-slate-50/40">
          {/* Skills */}
          {((req.primarySkills?.length ?? 0) > 0 || (req.keySkills?.length ?? 0) > 0) && (
            <SideCard title="Skills">
              {(req.primarySkills?.length ?? 0) > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Must-have
                  </p>
                  <div className="-m-0.5">
                    {req.primarySkills.map(s => (
                      <Pill key={s} text={s} variant="primary" />
                    ))}
                  </div>
                </div>
              )}
              {(req.keySkills?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Key skills
                  </p>
                  <div className="-m-0.5">
                    {req.keySkills.map(s => (
                      <Pill key={s} text={s} variant="key" />
                    ))}
                  </div>
                </div>
              )}
            </SideCard>
          )}

          {/* Job details */}
          <SideCard title="Job Details">
            <DR label="Job type" value={req.jobType?.replace(/_/g, ' ')} />
            <DR label="Remote" value={req.remoteType} />
            <DR label="Open for" value={req.jobOpenFor} />
            <DR label="Openings" value={req.totalOpenings} />
            <DR
              label="Experience"
              value={
                req.experienceMin != null || req.experienceMax != null
                  ? `${req.experienceMin ?? 0} – ${req.experienceMax ?? '?'} yrs`
                  : null
              }
            />
            <DR label="Education" value={req.education} />
            <DR label="Location" value={location} />
            <DR label="Shift" value={req.shift} />
            <DR label="Functional area" value={req.functionalArea} />
          </SideCard>

          {/* Compensation */}
          {(salaryDisplay || req.bonusAmount) && (
            <SideCard title="Compensation">
              <DR label="Salary range" value={salaryDisplay} />
              <DR label="Type" value={req.salaryType} />
              <DR label="Currency" value={req.salaryCurrency} />
              {req.bonusAmount && (
                <DR label="Bonus" value={`${req.salaryCurrency ?? 'INR'} ${req.bonusAmount}`} />
              )}
              <DR
                label="Visibility"
                value={
                  req.hideSalaryFromCandidate ? 'Hidden from candidate' : 'Visible to candidate'
                }
              />
            </SideCard>
          )}

          {/* Client & SPOC */}
          {(req.client || req.businessUnit || req.serviceLine || req.clientSpoc) && (
            <SideCard title="Client & SPOC">
              <DR label="Client" value={req.client?.name} />
              <DR label="Industry" value={req.client?.industry} />
              <DR label="Business unit" value={req.businessUnit?.name} />
              <DR label="Service line" value={req.serviceLine?.name} />
              <DR
                label="SPOC"
                value={
                  req.clientSpoc
                    ? `${req.clientSpoc.firstName} ${req.clientSpoc.lastName}${req.clientSpoc.designation ? ` · ${req.clientSpoc.designation}` : ''}`
                    : null
                }
              />
              <DR label="SPOC email" value={req.clientSpoc?.email} />
              <DR label="SPOC phone" value={req.clientSpoc?.phone} />
              <DR
                label="Handler"
                value={
                  req.clientSpoc?.handler
                    ? `${req.clientSpoc.handler.firstName} ${req.clientSpoc.handler.lastName}`
                    : null
                }
              />
            </SideCard>
          )}

          {/* Dates & deadlines */}
          {(req.respondBy || req.targetDate || req.startDate || req.turnaroundDays) && (
            <SideCard title="Dates & Deadlines">
              <DeadlineRow
                label="Respond by"
                date={req.respondBy ?? null}
                breached={req.isRespondByBreached}
              />
              <DeadlineRow
                label="Target date"
                date={req.targetDate ?? null}
                breached={req.isTurnaroundBreached}
              />
              <DeadlineRow label="Start date" date={req.startDate ?? null} />
              {req.turnaroundDays && <DR label="Turnaround" value={`${req.turnaroundDays} days`} />}
            </SideCard>
          )}

          {/* Sourcing strategy */}
          {((req.targetCompanies?.length ?? 0) > 0 || (req.noPoachCompanies?.length ?? 0) > 0) && (
            <SideCard title="Sourcing Strategy">
              {(req.targetCompanies?.length ?? 0) > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Target companies
                  </p>
                  <div className="-m-0.5">
                    {req.targetCompanies.map(c => (
                      <Pill key={c} text={c} variant="teal" />
                    ))}
                  </div>
                </div>
              )}
              {(req.noPoachCompanies?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    No-poach
                  </p>
                  <div className="-m-0.5">
                    {req.noPoachCompanies.map(c => (
                      <Pill key={c} text={c} variant="red" />
                    ))}
                  </div>
                </div>
              )}
            </SideCard>
          )}

          {/* Audit */}
          <SideCard title="Audit">
            <DR label="Created by" value={`${req.createdBy.firstName} ${req.createdBy.lastName}`} />
            <DR label="Created on" value={format(new Date(req.createdAt), 'dd MMM yyyy')} />
            {req.approvedBy && (
              <DR
                label="Approved by"
                value={`${req.approvedBy.firstName} ${req.approvedBy.lastName}`}
              />
            )}
            {req.approvedAt && (
              <DR label="Approved on" value={format(new Date(req.approvedAt), 'dd MMM yyyy')} />
            )}
            {req.closedBy && (
              <DR label="Closed by" value={`${req.closedBy.firstName} ${req.closedBy.lastName}`} />
            )}
            {req.closureReason && (
              <DR label="Closure reason" value={req.closureReason.replace(/_/g, ' ')} />
            )}
          </SideCard>
        </div>
      </div>
    </>
  );
}
