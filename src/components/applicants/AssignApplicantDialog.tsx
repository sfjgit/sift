// File: AssignApplicantDialog.tsx
// Path: src/components/applicants/AssignApplicantDialog.tsx

'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAssignableRecruiters, useAssignApplicants } from '@/hooks/useApplicants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotIds: string[];
  label: string; // "John Doe" or "5 applicants"
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
  const [recruiterId, setRecruiterId] = useState<string>('');
  const [pickerOpen, setPickerOpen] = useState(false);

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
            const reasons = skipped
              .map(s => (s.status === 'skipped' ? s.reason : ''))
              .filter(Boolean);
            const summary = Object.entries(
              reasons.reduce<Record<string, number>>((acc, r) => {
                acc[r] = (acc[r] ?? 0) + 1;
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to recruiter</DialogTitle>
          <DialogDescription>
            {label} will move to the Sourced stage under the selected recruiter.
          </DialogDescription>
        </DialogHeader>

        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={pickerOpen}
              className="w-full justify-between font-normal"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading recruiters…
                </span>
              ) : selected ? (
                `${selected.firstName} ${selected.lastName}`
              ) : (
                <span className="text-muted-foreground">Select recruiter</span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search by name or email…" />
              <CommandList>
                <CommandEmpty>No recruiters found.</CommandEmpty>
                <CommandGroup>
                  {recruiters.map(r => (
                    <CommandItem
                      key={r.id}
                      value={`${r.firstName} ${r.lastName} ${r.email} ${r.employeeId ?? ''}`}
                      onSelect={() => {
                        setRecruiterId(r.id);
                        setPickerOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          recruiterId === r.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">
                          {r.firstName} {r.lastName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{r.email}</span>
                      </div>
                      {r.role?.name && (
                        <Badge variant="secondary" className="ml-2 shrink-0">
                          {r.role.name}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!recruiterId || assign.isPending}>
            {assign.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
