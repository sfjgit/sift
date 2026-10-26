// File: NotesPanel.tsx
// Path: src/features/clients/detail/NotesPanel.tsx
//
// Composer + list. ⌘/Ctrl+Enter posts. You can delete your own notes.

'use client';

import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Panel } from '@/components/common/Panel';
import { UserAvatar } from '@/components/common/UserAvatar';
import { EmptyState, Spinner } from '@/components/common/states';
import { useConfirm } from '@/components/common/ConfirmProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePermissions } from '@/features/auth/usePermissions';
import { tourTarget } from '@/features/tour/tour.constants';
import { useAction } from '@/hooks/useResource';
import { clientHooks } from '@/hooks/queries';
import { clientsApi } from '@/lib/api/endpoints';
import { fmtDateTime, fmtRelative, fullName } from '@/lib/format';
import type { ClientNote } from '@/types/crm';

export function NotesPanel({ clientId, notes }: { clientId: string; notes: ClientNote[] }) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canAdd = can('client_notes.create');
  const canDeleteAny = can('client_notes.delete_any');
  const confirm = useConfirm();
  const [text, setText] = useState('');
  const [showAll, setShowAll] = useState(false);

  const add = useAction((content: string) => clientsApi.addNote(clientId, content), {
    success: 'Note added — handlers notified',
    invalidate: [clientHooks.keys.detail(clientId), ['client-activity', clientId]],
    onSuccess: () => setText(''),
  });
  const remove = useAction((noteId: string) => clientsApi.deleteNote(clientId, noteId), {
    success: 'Note deleted',
    invalidate: [clientHooks.keys.detail(clientId)],
  });

  const submit = () => text.trim() && add.mutate(text.trim());
  const shown = showAll ? notes : notes.slice(0, 4);

  return (
    <Panel
      title="Notes"
      description="Visible to everyone who can see this client"
      {...tourTarget('client-note')}
    >
      <div className="space-y-3">
        {canAdd && (
          <div className="rounded-lg border bg-surface focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
              }}
              maxLength={5000}
              rows={3}
              placeholder="Write a note… (⌘/Ctrl + Enter to post)"
              className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            <div className="flex items-center justify-between px-2.5 pb-2">
              <span className="text-[11px] text-muted-foreground">
                Active SPOC handlers get notified
              </span>
              <Button size="xs" onClick={submit} disabled={!text.trim() || add.isPending}>
                {add.isPending ? <Spinner className="size-3 text-current" /> : <Send />} Post
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <EmptyState
            compact
            title="No notes yet"
            description="Capture context from calls and meetings here."
          />
        ) : (
          <ul className="space-y-3">
            {shown.map(n => (
              <li key={n.id} className="group flex gap-2.5">
                <UserAvatar person={n.author} size="sm" className="mt-0.5" />
                <div className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium">{fullName(n.author)}</span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <time title={fmtDateTime(n.createdAt)}>{fmtRelative(n.createdAt)}</time>
                      {(n.author.id === user?.id || canDeleteAny) && (
                        <button
                          type="button"
                          aria-label="Delete note"
                          className="rounded p-0.5 opacity-0 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
                          onClick={async () => {
                            if (
                              await confirm({
                                title: 'Delete this note?',
                                destructive: true,
                                confirmLabel: 'Delete',
                              })
                            )
                              remove.mutate(n.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] whitespace-pre-line">{n.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {notes.length > 4 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(s => !s)}>
            {showAll ? 'Show fewer' : `Show all ${notes.length} notes`}
          </Button>
        )}
      </div>
    </Panel>
  );
}
