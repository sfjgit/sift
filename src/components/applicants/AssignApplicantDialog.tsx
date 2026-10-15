// File: AssignApplicantDialog.tsx
// Path: src/components/applicants/AssignApplicantDialog.tsx

'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { personName } from '@/components/applicants/utils';
import { useAssignableRecruiters, useAssignApplicants } from '@/hooks/useApplicants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotIds: string[];
  label: string; // "John Doe" or "5 applicant(s)"
  onAssigned?: () => void;
}

const getErrorMessage = (err: unknown) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (err as any)?.response?.data?.message ?? 'Failed to assign';

export function AssignApplicantDialog({
  open,
  onOpenChange,
  snapshotIds,
  label,
  onAssigned,
}: Props) {
  const [recruiterId, setRecruiterId] = useState('');

  const { data: recruiters = [], isLoading } = useAssignableRecruiters(open);
  const assign = useAssignApplicants();

  const selected = useMemo(
    () => recruiters.find(r => r.id === recruiterId),
    [recruiters, recruiterId]
  );

  const handleClose = (next: boolean) => {
    if (!next) setRecruiterId('');
    onOpenChange(next);
  };

  const handleSubmit = () => {
    if (!recruiterId) return;
    assign.mutate(
      { snapshotIds, recruiterId },
      {
        onSuccess: res => {
          toast.success(res.message);
          const skipped = res.data?.skipped ?? [];
          if (skipped.length) {
            const summary = Object.entries(
              skipped.reduce<Record<string, number>>((acc, s) => {
                if (s.status === 'skipped') acc[s.reason] = (acc[s.reason] ?? 0) + 1;
                return acc;
              }, {})
            )
              .map(([r, n]) => `${r} (${n})`)
              .join(', ');
            toast.warning(`Skipped: ${summary}`);
          }
          onAssigned?.();
          handleClose(false);
        },
        onError: err => toast.error(getErrorMessage(err)),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="text-base">Assign to recruiter</DialogTitle>
          <DialogDescription className="text-[13px]">
            {label} will move to the Sourced stage under the selected recruiter.
          </DialogDescription>
        </DialogHeader>

        {/* list visible immediately — search on top, scrollable below */}
        <Command className="rounded-none">
          <CommandInput placeholder="Search by name, email or employee ID…" />
          <CommandList className="max-h-80">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading recruiters…
              </div>
            ) : (
              <>
                <CommandEmpty className="py-10 text-center text-[13px] text-muted-foreground">
                  No recruiters found.
                </CommandEmpty>
                <CommandGroup>
                  {recruiters.map(r => {
                    const isSelected = recruiterId === r.id;
                    return (
                      <CommandItem
                        key={r.id}
                        value={`${r.firstName} ${r.lastName} ${r.email} ${r.employeeId ?? ''}`}
                        onSelect={() => setRecruiterId(r.id)}
                        className={cn(
                          'cursor-pointer gap-3 px-3 py-2.5',
                          isSelected && 'bg-accent'
                        )}
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[13px] font-medium">
                            {personName(r)}
                            {r._source === 'self' && (
                              <span className="ml-1 font-normal text-muted-foreground">(You)</span>
                            )}
                          </span>
                          <span className="truncate text-[12px] text-muted-foreground">
                            {r.email}
                            {r.employeeId && ` · ${r.employeeId}`}
                          </span>
                        </div>
                        {r.role?.name && (
                          <Badge variant="secondary" className="shrink-0 font-normal">
                            {r.role.name}
                          </Badge>
                        )}
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0 text-primary',
                            isSelected ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>

        <DialogFooter className="items-center border-t px-5 py-3">
          <span className="mr-auto truncate text-[13px] text-muted-foreground">
            {selected ? (
              <>
                Selected:{' '}
                <span className="font-medium text-foreground">{personName(selected)}</span>
              </>
            ) : (
              `${recruiters.length} recruiter(s)`
            )}
          </span>
          <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!recruiterId || assign.isPending}>
            {assign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
