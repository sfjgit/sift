'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUsersApi, UpdateUserPayload } from '@/lib/users.api';

type EditUserDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  refresh: () => void;
};

export default function EditUserDialog({ open, setOpen, user, refresh }: EditUserDialogProps) {
  const { update } = useUsersApi();

  const getInitialForm = () => ({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    workingLocation: user?.workingLocation ?? '',
    timezone: user?.timezone ?? '',
  });

  const [form, setForm] = useState<UpdateUserPayload>(getInitialForm());

  const handleSubmit = async () => {
    try {
      await update(user.id, form);
      refresh();
      setOpen(false);
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const fields: { key: keyof UpdateUserPayload; label: string; placeholder: string }[] = [
    { key: 'firstName', label: 'First Name', placeholder: 'Enter first name' },
    { key: 'lastName', label: 'Last Name', placeholder: 'Enter last name' },
    { key: 'phone', label: 'Phone', placeholder: 'Enter phone number' },
    { key: 'workingLocation', label: 'Working Location', placeholder: 'e.g. Bengaluru' },
    { key: 'timezone', label: 'Timezone', placeholder: 'e.g. Asia/Kolkata' },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={val => {
        setOpen(val);
        if (val) setForm(getInitialForm());
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Edit User</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label className="text-sm font-medium">{label}</Label>
              <Input
                placeholder={placeholder}
                value={(form[key] as string) ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
              />
            </div>
          ))}

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
