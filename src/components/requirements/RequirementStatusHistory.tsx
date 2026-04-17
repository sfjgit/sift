'use client';

import { Badge, fmtDate, SectionCard } from './ui';

import { useAuth } from '@/context/AuthContext';
import { useRequirementsApi } from '@/lib/requirements.api';
import { mutate } from 'swr';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Edit } from 'lucide-react';

interface HistoryItem {
  id: string;
  fromStatus: string;
  toStatus: string;
  reason?: string;
  changedAt: string;
}

interface Props {
  history: HistoryItem[];
  requirementId: string;
}

export function RequirementStatusHistory({ history, requirementId }: Props) {
  const { user } = useAuth();
  const api = useRequirementsApi();

  // ✅ Permission check
  const canChangeStatus = user?.role.permissions.some(
    p => p.module === 'requirements' && p.canEdit
  );

  return (
    <SectionCard
      title={
        <div className="flex items-center justify-between w-full">
          <span>Status History</span>

          {/* ✅ Change Status Button */}
          {canChangeStatus && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-gray-500">
                  <Edit className="w-4 h-4 text-black" /> Change Status
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Requirement Status</DialogTitle>
                </DialogHeader>

                {/* ✅ Form (no useState) */}
                <form
                  onSubmit={async e => {
                    e.preventDefault();

                    const formData = new FormData(e.currentTarget);

                    const status = formData.get('status') as string;
                    const reason = formData.get('reason') as string;

                    if (!status) return;

                    try {
                      await api.changeStatus(requirementId, {
                        status,
                        reason,
                      });
                      toast.success('Status changed successfully');
                      // ✅ Refresh SWR instead of reload
                      mutate(`requirement:${requirementId}`);
                    } catch (err) {
                      console.error('Failed to change status', err);
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  {/* Status Select */}
                  <Select name="status" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="PENDING_APPROVAL">PENDING_APPROVAL</SelectItem>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="ON_HOLD">ON_HOLD</SelectItem>
                      <SelectItem value="CLOSED">CLOSED</SelectItem>
                      <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                    </SelectContent>
                    {/* <SelectContent>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                      <SelectItem value="ON_HOLD">ON_HOLD</SelectItem>
                      <SelectItem value="CLOSED">CLOSED</SelectItem>
                    </SelectContent> */}
                  </Select>

                  {/* Reason */}
                  <Textarea name="reason" placeholder="Reason (optional)" />

                  <div className="flex justify-end">
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      }
    >
      {!history?.length ? (
        <p className="text-[13px] text-muted-foreground/50 py-2">No history available.</p>
      ) : (
        <div className="flex flex-col gap-0 relative">
          {/* Vertical line */}
          <div className="absolute left-1.75 top-3 bottom-3 w-px bg-border/50" />

          {history.map(event => (
            <div key={event.id} className="flex items-start gap-3 py-2.5">
              {/* Dot */}
              <div className="size-3.5 rounded-full border-2 border-primary bg-background shrink-0 mt-0.5 z-10" />

              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge value={event.fromStatus} />
                  <span className="text-muted-foreground/40 text-xs">→</span>
                  <Badge value={event.toStatus} />
                </div>

                {event.reason && (
                  <p className="text-[12px] text-muted-foreground/70 italic">{event.reason}</p>
                )}

                <p className="text-[11px] text-muted-foreground/40">{fmtDate(event.changedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
