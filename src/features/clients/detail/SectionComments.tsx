// File: SectionComments.tsx
// Path: src/features/clients/detail/SectionComments.tsx
//
// "Comments / observations" at the foot of a client-page section (CASPA tab
// comments). They are ordinary client notes tagged with the section, so they
// also show in Activity & tasks ("on Branch offices").

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/features/auth/usePermissions';
import { useAction } from '@/hooks/useResource';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtRelative, fullName } from '@/lib/format';
import type { ClientDetail, NoteSection } from '@/types/crm';

export const SECTION_LABEL: Record<NoteSection, string> = {
  info: 'Client information',
  branches: 'Branch offices',
  skilling: 'CSR skilling programmes',
  sales_assets: 'Sales assets',
  marketing_assets: 'Marketing assets',
  csr: 'CSR figures & programmes',
  reports: 'Reports & attachments',
  spocs: 'SPOC details',
  technology: 'Technographics',
  outreach: 'Outreach',
  meetings: 'Meetings',
};

const SHOWN = 3;

export function SectionComments({
  client,
  section,
}: {
  client: ClientDetail;
  section: NoteSection;
}) {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [all, setAll] = useState(false);
  const notes = client.notes.filter(n => n.section === section);
  const shown = all ? notes : notes.slice(0, SHOWN);

  const add = useAction(() => clientsApi.addNote(client.id, text.trim(), null, section), {
    success: 'Comment added',
    onSuccess: () => {
      setText('');
      void qc.invalidateQueries({ queryKey: clientHooks.keys.detail(client.id) });
    },
  });
  const canAdd = can('client_notes.create');
  if (!canAdd && notes.length === 0) return null;

  return (
    <div className="mt-5 border-t pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
        <MessageSquareText className="size-3.5" /> Comments / observations
        {notes.length > 0 && <span className="tabular">· {notes.length}</span>}
      </p>
      {shown.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {shown.map(n => (
            <li key={n.id} className="text-[13.5px]">
              <span className="whitespace-pre-wrap">{n.content}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {fullName(n.author)} · {fmtRelative(n.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {notes.length > SHOWN && (
        <button
          type="button"
          onClick={() => setAll(v => !v)}
          className="mb-2 text-xs font-medium text-primary hover:underline"
        >
          {all ? 'Show fewer' : `Show all ${notes.length}`}
        </button>
      )}
      {canAdd && (
        <form
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            if (text.trim()) add.mutate(undefined);
          }}
        >
          <Input
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={1000}
            placeholder={`Add a comment or observation — ${SECTION_LABEL[section]}…`}
            className="h-8"
          />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!text.trim() || add.isPending}
          >
            <Plus /> Add
          </Button>
        </form>
      )}
    </div>
  );
}
