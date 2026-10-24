// File: MarkdownLite.tsx
// Path: src/components/common/MarkdownLite.tsx
//
// Tiny, safe markdown subset for FAQ answers and notes: paragraphs, "- "
// bullets, **bold**, `code` and bare URLs → links. Builds React nodes only —
// never dangerouslySetInnerHTML — so admin-entered text can't inject markup.

import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

// order matters: code first so ** inside backticks stays literal
const TOKEN = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyPrefix}-${i++}`;
    const [whole, code, bold, url] = m;
    if (code) out.push(<code key={key}>{code.slice(1, -1)}</code>);
    else if (bold) out.push(<strong key={key}>{bold.slice(2, -2)}</strong>);
    else if (url)
      out.push(
        <a key={key} href={url} target="_blank" rel="noreferrer noopener" className="text-primary underline-offset-2 hover:underline">
          {url}
        </a>
      );
    last = start + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block = { kind: 'p'; lines: string[] } | { kind: 'ul'; items: string[] };

function blocks(text: string): Block[] {
  const out: Block[] = [];
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const prev = out[out.length - 1];
    if (!line.trim()) {
      out.push({ kind: 'p', lines: [] }); // paragraph break marker
    } else if (bullet) {
      if (prev?.kind === 'ul') prev.items.push(bullet[1]);
      else out.push({ kind: 'ul', items: [bullet[1]] });
    } else if (prev?.kind === 'p' && prev.lines.length) {
      prev.lines.push(line);
    } else {
      out.push({ kind: 'p', lines: [line] });
    }
  }
  return out.filter(b => (b.kind === 'p' ? b.lines.length > 0 : b.items.length > 0));
}

export function MarkdownLite({ text, className }: { text?: string | null; className?: string }) {
  if (!text?.trim()) return null;
  return (
    <div className={cn('prose-lite', className)}>
      {blocks(text).map((b, bi) =>
        b.kind === 'ul' ? (
          <ul key={bi}>
            {b.items.map((item, ii) => (
              <li key={ii}>{inline(item, `${bi}-${ii}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={bi}>
            {b.lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        )
      )}
    </div>
  );
}
