/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Paperclip,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useAxios } from '@/hooks/useAxios';
import { ActivityItem, DocumentItem, fullName, NoteItem } from './types';
// import { fullName } from './types';
// import type { NoteItem, DocumentItem, ActivityItem } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// NOTES TAB
// ─────────────────────────────────────────────────────────────────────────────

interface NoteTabProps {
  requirementId: string;
  initialNotes: NoteItem[];
  canEdit: boolean;
  currentUserId: string;
}

export function RequirementNotesTab({
  requirementId,
  initialNotes,
  canEdit,
  currentUserId,
}: NoteTabProps) {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const notesQuery = useQuery<{ success: boolean; data: NoteItem[] }>({
    queryKey: ['requirement-notes', requirementId],
    queryFn: async () => (await axios.get(`/requirements/${requirementId}/notes`)).data,
    initialData: { success: true, data: initialNotes },
  });

  const addMutation = useMutation({
    mutationFn: async () =>
      (await axios.post(`/requirements/${requirementId}/notes`, { content })).data,
    onSuccess: () => {
      toast.success('Note added');
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['requirement-notes', requirementId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to add note'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) =>
      (await axios.delete(`/requirements/${requirementId}/notes/${noteId}`)).data,
    onSuccess: () => {
      toast.success('Note deleted');
      queryClient.invalidateQueries({ queryKey: ['requirement-notes', requirementId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to delete note'),
  });

  const notes = notesQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="space-y-2">
          <Textarea
            placeholder="Write a note…"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!content.trim() || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              <Send className="mr-2 h-3.5 w-3.5" />
              {addMutation.isPending ? 'Adding…' : 'Add Note'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {notes.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
        )}
        {notes.map(note => (
          <Card key={note.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm leading-relaxed flex-1">{note.content}</p>
                {canEdit && note.author.id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(note.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {fullName(note.author)} ·{' '}
                {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────

interface DocsTabProps {
  requirementId: string;
  canEdit: boolean;
}

export function RequirementDocumentsTab({ requirementId, canEdit }: DocsTabProps) {
  const axios = useAxios();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const docsQuery = useQuery<{ success: boolean; data: DocumentItem[] }>({
    queryKey: ['requirement-documents', requirementId],
    queryFn: async () => (await axios.get(`/requirements/${requirementId}/documents`)).data,
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await axios.post(`/requirements/${requirementId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded');
      queryClient.invalidateQueries({ queryKey: ['requirement-documents', requirementId] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const resolveMutation = useMutation({
    mutationFn: async (docId: string) =>
      (await axios.patch(`/requirements/${requirementId}/documents/${docId}/resolve`)).data,
    onSuccess: () => {
      toast.success('Issue resolved');
      queryClient.invalidateQueries({ queryKey: ['requirement-documents', requirementId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to resolve'),
  });

  const docs = docsQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 h-3.5 w-3.5" />
            {uploading ? 'Uploading…' : 'Upload Document'}
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {docs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No documents yet</p>
        )}
        {docs.map(doc => (
          <div
            key={doc.id}
            className={`rounded-lg border p-4 ${
              doc.isIssue && !doc.issueResolved
                ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {doc.isIssue ? (
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 ${doc.issueResolved ? 'text-muted-foreground' : 'text-amber-500'}`}
                  />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{doc.fileName ?? 'Untitled'}</p>
                  {doc.content && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {doc.content}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc.isIssue && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${doc.issueResolved ? 'border-emerald-300 text-emerald-600' : 'border-amber-300 text-amber-700'}`}
                  >
                    {doc.issueResolved ? 'Resolved' : 'Issue'}
                  </Badge>
                )}
                {canEdit && doc.isIssue && !doc.issueResolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => resolveMutation.mutate(doc.id)}
                    disabled={resolveMutation.isPending}
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {fullName(doc.raisedBy)} · {format(new Date(doc.createdAt), 'dd MMM yyyy')}
              {doc.issueResolved && doc.resolvedBy && (
                <> · Resolved by {fullName(doc.resolvedBy)}</>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY TAB
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityTabProps {
  requirementId: string;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  REQUIREMENT_CREATED: <span className="text-emerald-500">✦</span>,
  REQUIREMENT_APPROVED: <span className="text-blue-500">✔</span>,
  REQUIREMENT_CLOSED: <span className="text-zinc-400">■</span>,
  STATUS_CHANGED: <span className="text-amber-500">⟳</span>,
  RECRUITER_ASSIGNED: <span className="text-violet-500">→</span>,
  ASSIGNMENT_REMOVED: <span className="text-red-400">✕</span>,
  NOTE_ADDED: <span className="text-sky-500">✎</span>,
  DOCUMENT_UPLOADED: <span className="text-indigo-500">⬆</span>,
  ISSUE_RAISED: <span className="text-orange-500">!</span>,
  ISSUE_RESOLVED: <span className="text-teal-500">✔</span>,
};

export function RequirementActivityTab({ requirementId }: ActivityTabProps) {
  const axios = useAxios();

  const activitiesQuery = useQuery<{ success: boolean; data: ActivityItem[] }>({
    queryKey: ['requirement-activities', requirementId],
    queryFn: async () => (await axios.get(`/requirements/${requirementId}/activities`)).data,
  });

  const activities = activitiesQuery.data?.data ?? [];

  return (
    <div className="space-y-1">
      {activitiesQuery.isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 rounded bg-muted animate-pulse" />
          ))}
        </div>
      )}
      {activities.length === 0 && !activitiesQuery.isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
      )}
      {activities.map((a, i) => (
        <div key={a.id} className="flex items-start gap-3 py-2.5">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-sm shrink-0">
              {ACTIVITY_ICONS[a.type] ?? <span className="text-muted-foreground text-xs">·</span>}
            </div>
            {i < activities.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1 min-h-[16px]" />
            )}
          </div>
          <div className="pb-2 min-w-0">
            <p className="text-sm">{a.summary}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {fullName(a.actor)} ·{' '}
              {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
