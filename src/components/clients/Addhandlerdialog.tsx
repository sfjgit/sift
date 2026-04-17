'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { useUsersApi } from '@/lib/users.api';
import { useClients } from '@/lib/clients.api';

// ── Schema ────────────────────────────────────────────────────────────────────
const assignHandlerSchema = z.object({
  userId: z.string().min(1, 'Please select a user'),
});

type TAssignHandlerForm = z.infer<typeof assignHandlerSchema>;

// ── Types ─────────────────────────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AddHandlerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  contactId: string;
  assignedUserIds?: string[];
}

// ── Avatar helper ─────────────────────────────────────────────────────────────
function getInitials(name?: string) {
  if (!name) return 'NA'; // or '?'

  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function UserAvatar({ user }: { user: User }) {
  if (user.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatar}
        alt={user.name}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-[#0066CC]">
      {getInitials(user.name)}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AddHandlerDialog({
  open,
  onOpenChange,
  clientId,
  contactId,
  assignedUserIds = [],
}: AddHandlerDialogProps) {
  const queryClient = useQueryClient();
  const usersApi = useUsersApi();
  const contactHandlersApi = useClients();

  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TAssignHandlerForm>({
    resolver: zodResolver(assignHandlerSchema),
    defaultValues: { userId: '' },
  });

  // Derive selected user from form watch — no useState
  const selectedUserId = watch('userId');

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users-slim'],
    queryFn: async () => {
      const res = await usersApi.getAll({ limit: 100 });
      return res.data.data;
    },
    staleTime: 60_000,
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: (values: TAssignHandlerForm) =>
      contactHandlersApi.assignContactHandler(clientId, contactId, {
        userId: values.userId,
        role: 'PRIMARY',
      }),
    onSuccess: () => {
      toast.success('Handler assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['client', clientId] });
      reset();
      onOpenChange(false);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error?.response?.data?.message ?? 'Failed to assign handler.');
    },
  });

  const onSubmit = handleSubmit(values => assignMutation.mutate(values));
  const isPending = assignMutation.isPending;
  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!isPending) {
          reset();
          onOpenChange(next);
        }
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-105">
        {/* Header */}
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle className="text-sm font-semibold text-slate-800">Assign Handler</DialogTitle>
          <p className="mt-0.5 text-xs text-slate-400">
            Search and select a user to handle this contact.
          </p>
        </DialogHeader>

        {/* Body */}
        <form onSubmit={onSubmit}>
          <div className="px-5 py-4">
            {/* Field label */}
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Select User <span className="text-red-400">*</span>
            </label>

            {/* Inline command list */}
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <Command className="rounded-none border-none shadow-none">
                <CommandInput
                  placeholder="Search by name or email…"
                  className="h-9 border-none text-sm focus:ring-0"
                />
                <CommandList className="max-h-[200px] overflow-y-auto">
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0066CC] border-t-transparent" />
                    </div>
                  ) : (
                    <>
                      <CommandEmpty className="py-6 text-center text-xs text-slate-400">
                        No users found.
                      </CommandEmpty>
                      <CommandGroup>
                        {users.map(user => {
                          const isSelected = selectedUserId === user.id;
                          const isAlreadyAssigned = assignedUserIds.includes(user.id);

                          return (
                            <CommandItem
                              key={user.id}
                              value={`${user.name} ${user.email}`}
                              disabled={isAlreadyAssigned}
                              onSelect={() => {
                                if (!isAlreadyAssigned) {
                                  setValue('userId', isSelected ? '' : user.id, {
                                    shouldValidate: true,
                                  });
                                }
                              }}
                              className="cursor-pointer rounded-md px-3 py-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
                            >
                              <div className="flex w-full items-center gap-3">
                                <UserAvatar user={user} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-800">
                                    {user.name}
                                  </p>
                                  <p className="truncate text-xs text-slate-400">{user.email}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  {isAlreadyAssigned && (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                      Added
                                    </span>
                                  )}
                                  {isSelected && !isAlreadyAssigned && (
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="#0066CC"
                                      strokeWidth="2.5"
                                    >
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </div>

            {/* Inline validation error */}
            {errors.userId && (
              <p className="mt-1.5 text-xs text-red-400">{errors.userId.message}</p>
            )}

            {/* Selected user preview */}
            {selectedUser && (
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
                <UserAvatar user={selectedUser} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {selectedUser.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{selectedUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('userId', '', { shouldValidate: true })}
                  className="ml-auto shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
                  aria-label="Clear selection"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="border-t border-slate-100 px-5 py-8">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                className="h-8 rounded-lg border-slate-200 text-xs font-medium text-slate-600"
                onClick={() => reset()}
              >
                Cancel
              </Button>
            </DialogClose>

            <button
              type="submit"
              disabled={isPending || !selectedUserId}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-[#0066CC] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#0052A3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {isPending ? 'Assigning…' : 'Assign Handler'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
