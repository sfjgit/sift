// components/clients/detail/NotesTab.tsx
'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useAxios } from '@/hooks/useAxios';
import { addNoteSchema, type AddNoteValues } from './schemas';

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; firstName: string; lastName: string };
}

interface Props {
  clientId: string;
  notes: Note[];
  currentUserId?: string;
  isSuperAdmin?: boolean;
  onMutated: () => void;
}

export function NotesTab({ clientId, notes, currentUserId, isSuperAdmin, onMutated }: Props) {
  const axios = useAxios();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddNoteValues>({
    resolver: zodResolver(addNoteSchema),
    defaultValues: { content: '' },
  });

  const addMutation = useMutation({
    mutationFn: async (data: AddNoteValues) =>
      (await axios.post(`/clients/${clientId}/notes`, data)).data,
    onSuccess: () => {
      toast.success('Note added');
      reset();
      onMutated();
    },
    onError: () => toast.error('Failed to add note'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (noteId: string) =>
      (await axios.delete(`/clients/${clientId}/notes/${noteId}`)).data,
    onSuccess: () => {
      toast.success('Note deleted');
      setDeleteId(null);
      onMutated();
    },
    onError: () => toast.error('Failed to delete note'),
  });

  return (
    <>
      <div className="flex flex-col gap-4 pb-4">
        <form onSubmit={handleSubmit(d => addMutation.mutate(d))} className="flex flex-col gap-2">
          <Textarea
            placeholder="Write a note…"
            className="resize-none"
            rows={3}
            {...register('content')}
          />
          {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding…' : 'Add note'}
            </Button>
          </div>
        </form>

        <Separator />

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No notes yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map(note => (
              <div key={note.id} className="group rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {note.author.firstName} {note.author.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {(currentUserId === note.author.id || isSuperAdmin) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(note.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
