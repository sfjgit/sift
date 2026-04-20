// 'use client';

// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { useMutation } from '@tanstack/react-query';
// import { useClients } from '@/lib/clients.api';

// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from '@/components/ui/dialog';

// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Button } from '@/components/ui/button';

// interface Props {
//   clientId: string;
//   trigger?: React.ReactNode;
//   onSuccess?: () => void;
// }

// type FormValues = {
//   firstName: string;
//   lastName?: string;
//   designation?: string;
//   email: string;
//   phone?: string;
//   linkedinUrl?: string;
//   isPrimary: boolean;
// };

// export default function AddContactDialog({ clientId, trigger, onSuccess }: Props) {
//   const clientsApi = useClients();

//   // Only for dialog open/close (allowed)
//   const [open, setOpen] = useState(false);

//   const { register, handleSubmit, reset } = useForm<FormValues>({
//     defaultValues: {
//       firstName: '',
//       lastName: '',
//       designation: '',
//       email: '',
//       phone: '',
//       linkedinUrl: '',
//       isPrimary: false,
//     },
//   });

//   // ── Mutation ─────────────────────────────────────────
//   const mutation = useMutation({
//     mutationFn: (data: FormValues) =>
//       clientsApi.addContact(clientId, {
//         firstName: data.firstName,
//         lastName: data.lastName || undefined,
//         designation: data.designation || undefined,
//         email: data.email,
//         phone: data.phone || undefined,
//         linkedinUrl: data.linkedinUrl || undefined,
//         isPrimary: data.isPrimary,
//       }),

//     onSuccess: () => {
//       reset();
//       setOpen(false);
//       onSuccess?.();
//     },
//   });

//   const onSubmit = (data: FormValues) => {
//     mutation.mutate(data);
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       {/* Trigger */}
//       <DialogTrigger asChild>
//         {trigger || (
//           <Button size="sm" className="bg-[#0066CC] hover:bg-[#0052A3]">
//             + Add Contact
//           </Button>
//         )}
//       </DialogTrigger>

//       {/* Dialog */}
//       <DialogContent className="sm:max-w-125">
//         <DialogHeader>
//           <DialogTitle>Add Contact</DialogTitle>
//         </DialogHeader>

//         <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-2">
//           <div>
//             <Label>First Name *</Label>
//             <Input {...register('firstName', { required: true })} />
//           </div>

//           <div>
//             <Label>Last Name</Label>
//             <Input {...register('lastName')} />
//           </div>

//           <div>
//             <Label>Email *</Label>
//             <Input type="email" {...register('email', { required: true })} />
//           </div>

//           <div>
//             <Label>Phone</Label>
//             <Input {...register('phone')} />
//           </div>

//           <div>
//             <Label>Designation</Label>
//             <Input {...register('designation')} />
//           </div>

//           <div>
//             <Label>LinkedIn URL</Label>
//             <Input {...register('linkedinUrl')} />
//           </div>

//           <div className="flex items-center gap-2">
//             <input type="checkbox" {...register('isPrimary')} />
//             <Label>Primary Contact</Label>
//           </div>

//           {/* Actions */}
//           <div className="flex justify-end gap-2 pt-2">
//             <Button type="button" variant="outline" onClick={() => setOpen(false)}>
//               Cancel
//             </Button>

//             <Button type="submit" disabled={mutation.isPending}>
//               {mutation.isPending ? 'Saving...' : 'Save'}
//             </Button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useClients } from '@/lib/clients.api';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

type FormValues = {
  firstName: string;
  lastName?: string;
  designation?: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  isPrimary: boolean;
};

export default function AddContactDialog({ clientId, trigger, onSuccess }: Props) {
  const clientsApi = useClients();
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      designation: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      isPrimary: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      clientsApi.addContact(clientId, {
        firstName: data.firstName,
        lastName: data.lastName || undefined,
        designation: data.designation || undefined,
        email: data.email,
        phone: data.phone || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        isPrimary: data.isPrimary,
      }),

    onSuccess: () => {
      toast.success('Contact added successfully');
      reset();
      setOpen(false);
      onSuccess?.();
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-[#0066CC] hover:bg-[#0052A3] text-sm px-4 py-2">
            + Add Contact
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-xl">
        {/* Header */}
        <div className="border-b px-6 py-4 bg-gray-50">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Add New Contact
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Enter contact details for this client.</p>
          </DialogHeader>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-gray-600">First Name *</Label>
              <Input {...register('firstName', { required: true })} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600">Last Name</Label>
              <Input {...register('lastName')} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600">Email *</Label>
              <Input type="email" {...register('email', { required: true })} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600">Phone</Label>
              <Input {...register('phone')} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600">Designation</Label>
              <Input {...register('designation')} className="mt-1" />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600">LinkedIn URL</Label>
              <Input {...register('linkedinUrl')} className="mt-1" />
            </div>
          </div>

          {/* Checkbox */}
          <div className="flex items-center justify-between border rounded-lg px-4 py-3 bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-700">Primary Contact</p>
              <p className="text-xs text-gray-500">
                Mark this contact as the main point of communication
              </p>
            </div>

            <input type="checkbox" {...register('isPrimary')} className="h-4 w-4" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="px-4">
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-[#0066CC] hover:bg-[#0052A3] px-5"
            >
              {mutation.isPending ? 'Saving...' : 'Save Contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
