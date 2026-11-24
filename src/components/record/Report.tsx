// File: Report.tsx
// Path: src/components/record/Report.tsx
//
// The view mode of a detail page: a printed-report look on screen — A4-like sheets on a grey desk,
// each a chapter with a running header, numbered footer, headed sections, key/value blocks and
// ruled tables. Edit turns the page back into forms (RecordMode). Prints one sheet per page.
//
//   <ReportDoc>
//     <ReportPage n={1} total={4} kicker="Client report" title="Company profile" running="Acme Ltd">
//       <ReportSection title="Identity"><ReportKV rows={[['CIN', c.cin], …]} /></ReportSection>
//     </ReportPage>
//   </ReportDoc>

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { fmtDate } from '@/lib/format';

const blank = (v: ReactNode) => v === null || v === undefined || v === '' || v === false;

/** the grey desk the sheets lie on */
export function ReportDoc({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'report-doc -mx-3 rounded-xl bg-[color-mix(in_oklch,var(--muted),var(--foreground)_4%)] px-2 py-5 sm:px-6 md:-mx-0 md:py-8 print:m-0 print:bg-transparent print:p-0',
        className
      )}
    >
      <div className="mx-auto flex max-w-[860px] flex-col gap-6 print:max-w-none print:gap-0">
        {children}
      </div>
    </div>
  );
}

/** one sheet: running header, chapter title, content, numbered footer */
export function ReportPage({
  n,
  total,
  kicker,
  title,
  running,
  children,
}: {
  n: number;
  total: number;
  /** "Client report" */
  kicker: string;
  /** the chapter: "CSR & financials" */
  title: string;
  /** the record's name, top right of every sheet */
  running: string;
  children: ReactNode;
}) {
  return (
    <article className="report-page relative flex flex-col bg-white text-[#1f2933] shadow-[0_1px_3px_rgba(15,23,42,.08),0_12px_32px_-12px_rgba(15,23,42,.25)] ring-1 ring-black/5 md:min-h-[1100px] dark:bg-[#fbfbf9] print:min-h-0 print:shadow-none print:ring-0">
      {/* running header */}
      <header className="flex items-center justify-between gap-4 border-b-2 border-[#1e3a8a] px-6 pt-5 pb-2 text-[10.5px] font-semibold tracking-[0.14em] text-[#1e3a8a] uppercase sm:px-12">
        <span>SFJBS · {kicker}</span>
        <span className="truncate text-right text-[#52606d]">{running}</span>
      </header>
      <div className="flex-1 px-6 pt-7 pb-8 sm:px-12">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#2563eb] uppercase">
          Section {n}
        </p>
        <h2 className="mt-1 mb-6 font-serif text-[26px] leading-tight font-semibold text-[#102a43]">
          {title}
        </h2>
        <div className="space-y-7">{children}</div>
      </div>
      <footer className="flex items-center justify-between border-t border-[#d9e2ec] px-6 py-3 text-[10.5px] text-[#829ab1] sm:px-12">
        <span>Generated {fmtDate(new Date())} · SFJBS CRM</span>
        <span className="tabular-nums">
          Page {n} of {total}
        </span>
      </footer>
    </article>
  );
}

/** the big title block on the first sheet */
export function ReportCover({
  title,
  subtitle,
  badges,
  facts,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  /** small "label: value" pairs under the title */
  facts?: [string, ReactNode][];
}) {
  return (
    <div className="-mt-2 border-b border-[#d9e2ec] pb-6">
      <h1 className="font-serif text-[32px] leading-tight font-bold text-[#102a43] sm:text-[36px]">
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-[15px] text-[#52606d]">{subtitle}</p>}
      {badges && <div className="mt-3 flex flex-wrap gap-1.5">{badges}</div>}
      {facts && (
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
          {facts
            .filter(([, v]) => !blank(v))
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10.5px] font-semibold tracking-wider text-[#829ab1] uppercase">
                  {k}
                </dt>
                <dd className="font-medium text-[#243b53]">{v}</dd>
              </div>
            ))}
        </dl>
      )}
    </div>
  );
}

export function ReportBadge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'amber' | 'blue';
}) {
  return (
    <span
      className={cn(
        'rounded-sm border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase',
        tone === 'green' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
        tone === 'amber' && 'border-amber-200 bg-amber-50 text-amber-800',
        tone === 'blue' && 'border-blue-200 bg-blue-50 text-blue-800',
        tone === 'slate' && 'border-slate-200 bg-slate-50 text-slate-700'
      )}
    >
      {children}
    </span>
  );
}

/** headline figures in a row of boxes */
export function ReportFigures({
  items,
}: {
  items: { label: string; value: ReactNode; note?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 border border-[#d9e2ec] sm:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={cn(
            'border-[#d9e2ec] px-4 py-3',
            i % 2 === 1 && 'border-l',
            i >= 2 && 'border-t sm:border-t-0',
            i % 4 !== 0 && 'sm:border-l'
          )}
        >
          <p className="text-[10.5px] font-semibold tracking-wider text-[#829ab1] uppercase">
            {it.label}
          </p>
          <p className="mt-1 text-[18px] font-semibold text-[#102a43] tabular-nums">
            {blank(it.value) ? <span className="text-[#bcccdc]">—</span> : it.value}
          </p>
          {it.note && <p className="text-[11px] text-[#829ab1]">{it.note}</p>}
        </div>
      ))}
    </div>
  );
}

/** a numbered heading with a rule, and its content */
export function ReportSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="break-inside-avoid-page">
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-[#bcccdc] pb-1.5">
        <h3 className="text-[13px] font-bold tracking-[0.08em] text-[#243b53] uppercase">
          {title}
        </h3>
        {note && <span className="text-[11.5px] text-[#829ab1]">{note}</span>}
      </div>
      {children}
    </section>
  );
}

/** label / value pairs in two columns */
export function ReportKV({ rows, cols = 2 }: { rows: [string, ReactNode][]; cols?: 1 | 2 }) {
  return (
    <dl className={cn('grid gap-x-10', cols === 2 && 'sm:grid-cols-2')}>
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="grid grid-cols-[140px_minmax(0,1fr)] gap-3 border-b border-dotted border-[#d9e2ec] py-1.5 text-[13.5px]"
        >
          <dt className="text-[#627d98]">{k}</dt>
          <dd className="min-w-0 font-medium break-words text-[#243b53]">
            {blank(v) ? <span className="font-normal text-[#bcccdc]">—</span> : v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface ReportColumn<T> {
  label: string;
  value: (row: T) => ReactNode;
  align?: 'right';
  /** wider column */
  grow?: boolean;
}

/** a ruled table like a printed report's */
export function ReportTable<T>({
  columns,
  rows,
  empty = 'Nothing recorded.',
  rowKey,
  foot,
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  empty?: string;
  rowKey: (row: T, i: number) => string;
  /** a totals row */
  foot?: ReactNode[];
}) {
  if (!rows.length) return <ReportEmpty>{empty}</ReportEmpty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="border-y-2 border-[#243b53] text-left">
            {columns.map(c => (
              <th
                key={c.label}
                className={cn(
                  'px-2 py-1.5 text-[10.5px] font-bold tracking-wider whitespace-nowrap text-[#243b53] uppercase',
                  c.align === 'right' && 'text-right',
                  c.grow && 'w-[38%]'
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={rowKey(r, i)}
              className="border-b border-[#e4e7eb] even:bg-[#f7f9fb] print:break-inside-avoid"
            >
              {columns.map(c => {
                const v = c.value(r);
                return (
                  <td
                    key={c.label}
                    className={cn(
                      'px-2 py-1.5 align-top text-[#243b53]',
                      c.align === 'right' && 'text-right whitespace-nowrap tabular-nums'
                    )}
                  >
                    {blank(v) ? <span className="text-[#bcccdc]">—</span> : v}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="border-t-2 border-[#243b53] font-semibold">
              {foot.map((f, i) => (
                <td
                  key={i}
                  className={cn(
                    'px-2 py-1.5',
                    columns[i]?.align === 'right' && 'text-right tabular-nums'
                  )}
                >
                  {f}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function ReportEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="border border-dashed border-[#d9e2ec] px-3 py-2.5 text-[12.5px] text-[#829ab1] italic">
      {children}
    </p>
  );
}

/** a short paragraph in report type */
export function ReportText({ children }: { children: ReactNode }) {
  return <p className="text-[13.5px] leading-6 whitespace-pre-line text-[#334e68]">{children}</p>;
}
