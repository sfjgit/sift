'use client';

import { fmtDate, SectionCard } from './ui';
import { useAuth } from '@/context/AuthContext';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useRequirementsApi } from '@/lib/requirements.api';

interface Note {
  id: string;
  content: string;
  createdAt?: string;
}

interface Props {
  notes: Note[];
  requirementId: string;
}

export function RequirementNotes({ notes, requirementId }: Props) {
  const requirementsApi = useRequirementsApi();
  const { user } = useAuth();

  // ✅ Permission check
  const canAddNote = user?.role.permissions.some(p => p.module === 'requirements' && p.canAdd);

  // ✅ Form submit handler (NO useState)
  const handleSubmit = async (formData: FormData) => {
    const notesValue = formData.get('notes') as string;

    if (!notesValue?.trim()) return;

    try {
      await requirementsApi.addNote(requirementId, notesValue);
      toast.success('Note added successfully');

      // 🔄 simplest refresh
      window.location.reload();
    } catch (err) {
      console.error('Failed to add note', err);
    }
  };

  return (
    <SectionCard
      title={
        <div className="flex items-center justify-between w-full">
          <span>Notes ({notes.length})</span>

          {/* ✅ Button on right */}
          {canAddNote && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className=" text-gray-500">
                  <Plus className=" h-4 w-4 text-black" /> Add Note
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Note</DialogTitle>
                </DialogHeader>

                {/* ✅ Native form (no state) */}
                <form
                  onSubmit={async e => {
                    e.preventDefault();

                    const formData = new FormData(e.currentTarget);
                    console.log('FORM DATA:', Object.fromEntries(formData));
                    const notesValue = formData.get('notes') as string;

                    if (!notesValue?.trim()) return;

                    try {
                      await requirementsApi.addNote(requirementId, notesValue);
                      window.location.reload();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  <Textarea
                    name="notes"
                    placeholder="Write your note..."
                    required
                    className="text-sm"
                  />

                  <div className="flex justify-end mt-2">
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      }
    >
      {notes.length === 0 ? (
        <p className="text-[13px] text-muted-foreground/50 py-2">No notes added yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map(note => (
            <div key={note.id} className="rounded-md bg-muted/30 border border-border/40 px-3 py-2">
              <p className="text-[13px] text-foreground/80 leading-relaxed">{note.content}</p>
              {note.createdAt && (
                <p className="text-[11px] text-muted-foreground/40 mt-1">
                  {fmtDate(note.createdAt)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
