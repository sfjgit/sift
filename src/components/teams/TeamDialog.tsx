'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Team, useTeamsApi, AddMembersPayload } from '@/lib/teams.api';
import { useAxios } from '@/hooks/useAxios';
import { useUsersApi } from '@/lib/users.api';
import { Label } from '../ui/label';
import { useQuery } from '@tanstack/react-query';
import { BusinessUnit } from '@/lib/business-units.api';

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
};

type TeamDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  team?: Team | null;
  refresh: () => void;
};

export default function TeamDialog({ open, setOpen, team, refresh }: TeamDialogProps) {
  const api = useAxios();
  const { create, update, addMembers } = useTeamsApi();
  const usersApi = useUsersApi();

  const getInitialForm = (team?: Team | null) => ({
    name: team?.name ?? '',
    description: team?.description ?? '',
    businessUnitId: team?.businessUnitId ?? '',
    isActive: team?.isActive ?? true,
    teamLeadId: '',
  });

  const [form, setForm] = useState(getInitialForm(team));
  const [errors, setErrors] = useState<{ businessUnitId?: string; teamLeadId?: string }>({});

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: businessUnits = [], isLoading: loadingBU } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await api.get('/business-units');
      return res.data.data;
    },
  });

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<Person[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await usersApi.getAll();
      return res.data.data;
    },
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = () => {
    const errs: typeof errors = {};
    if (!form.businessUnitId) errs.businessUnitId = 'Business unit is required';
    if (!form.teamLeadId) errs.teamLeadId = 'Team lead is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (team) {
        await update(team.id, {
          name: form.name,
          description: form.description,
          isActive: form.isActive,
        });
      } else {
        const created = await create({
          name: form.name,
          description: form.description,
          businessUnitId: form.businessUnitId,
        });
        // Assign team lead immediately after creation
        const members: AddMembersPayload['members'] = [
          { userId: form.teamLeadId, teamRole: 'LEAD' },
        ];
        await addMembers(created.data.data.id, { members });
      }

      refresh();
      setOpen(false);
    } catch (error) {
      console.error('Error saving team:', error);
    }
  };

  // ── Reset on open ──────────────────────────────────────────────────────────

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (value) {
      setForm(getInitialForm(team));
      setErrors({});
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {team ? 'Edit Team' : 'Create Team'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Business Unit — Required */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Business Unit <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.businessUnitId}
              onValueChange={value => {
                setForm(prev => ({ ...prev, businessUnitId: value }));
                setErrors(prev => ({ ...prev, businessUnitId: undefined }));
              }}
            >
              <SelectTrigger className={errors.businessUnitId ? 'border-destructive' : ''}>
                <SelectValue placeholder={loadingBU ? 'Loading...' : 'Select business unit'} />
              </SelectTrigger>
              <SelectContent>
                {businessUnits.length > 0 ? (
                  businessUnits.map(bu => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No business units found
                  </div>
                )}
              </SelectContent>
            </Select>
            {errors.businessUnitId && (
              <p className="text-xs text-destructive">{errors.businessUnitId}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Name</Label>
            <Input
              placeholder="Enter team name"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Description</Label>
            <Input
              placeholder="Enter description"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Team Lead — Required */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Team Lead <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.teamLeadId}
              onValueChange={value => {
                setForm(prev => ({ ...prev, teamLeadId: value }));
                setErrors(prev => ({ ...prev, teamLeadId: undefined }));
              }}
            >
              <SelectTrigger className={errors.teamLeadId ? 'border-destructive' : ''}>
                <SelectValue placeholder={loadingUsers ? 'Loading...' : 'Select team lead'} />
              </SelectTrigger>
              <SelectContent>
                {allUsers.length > 0 ? (
                  allUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No users found</div>
                )}
              </SelectContent>
            </Select>
            {errors.teamLeadId && <p className="text-xs text-destructive">{errors.teamLeadId}</p>}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              {team ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 'use client';

// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';

// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';

// import { useState } from 'react';
// import { Team, useTeamsApi } from '@/lib/teams.api';
// import { useAxios } from '@/hooks/useAxios';
// import { Label } from '../ui/label';
// import { useQuery } from '@tanstack/react-query';
// import { BusinessUnit } from '@/lib/business-units.api';

// type TeamDialogProps = {
//   open: boolean;
//   setOpen: (open: boolean) => void;
//   team?: Team | null;
//   refresh: () => void;
// };

// export default function TeamDialog({ open, setOpen, team, refresh }: TeamDialogProps) {
//   const api = useAxios();
//   const { create, update } = useTeamsApi();

//   // ✅ React Query for Business Units
//   const { data: businessUnits = [], isLoading } = useQuery<BusinessUnit[]>({
//     queryKey: ['business-units'],
//     queryFn: async () => {
//       const res = await api.get('/business-units');
//       return res.data.data;
//     },
//   });

//   const getInitialForm = (team?: Team | null) => ({
//     name: team?.name ?? '',
//     description: team?.description ?? '',
//     businessUnitId: team?.businessUnitId ?? '',
//     isActive: team?.isActive ?? true,
//   });

//   const [form, setForm] = useState(getInitialForm(team));

//   // ✅ Submit Handler
//   const handleSubmit = async () => {
//     try {
//       if (team) {
//         await update(team.id, form);
//       } else {
//         await create(form);
//       }
//       refresh();
//       setOpen(false);
//     } catch (error) {
//       console.error('Error saving team:', error);
//     }
//   };

//   return (
//     <Dialog
//       open={open}
//       onOpenChange={value => {
//         setOpen(value);
//         if (value) {
//           setForm(getInitialForm(team));
//         }
//       }}
//     >
//       <DialogContent className="sm:max-w-md">
//         <DialogHeader>
//           <DialogTitle className="text-base font-semibold">
//             {team ? 'Edit Team' : 'Create Team'}
//           </DialogTitle>
//         </DialogHeader>

//         <div className="mt-2 space-y-4">
//           {/* Name */}
//           <div className="space-y-1.5">
//             <Label className="text-sm font-medium">Name</Label>
//             <Input
//               placeholder="Enter team name"
//               value={form.name}
//               onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
//             />
//           </div>

//           {/* Description */}
//           <div className="space-y-1.5">
//             <Label className="text-sm font-medium">Description</Label>
//             <Input
//               placeholder="Enter description"
//               value={form.description}
//               onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
//             />
//           </div>

//           {/* Business Unit */}
//           <div className="space-y-1.5">
//             <Label className="text-sm font-medium">Business Unit</Label>
//             <Select
//               value={form.businessUnitId}
//               onValueChange={value => setForm(prev => ({ ...prev, businessUnitId: value }))}
//             >
//               <SelectTrigger>
//                 <SelectValue placeholder={isLoading ? 'Loading...' : 'Select business unit'} />
//               </SelectTrigger>
//               <SelectContent>
//                 {businessUnits.length > 0 ? (
//                   businessUnits.map(bu => (
//                     <SelectItem key={bu.id} value={bu.id}>
//                       {bu.name}
//                     </SelectItem>
//                   ))
//                 ) : (
//                   <div className="px-3 py-2 text-sm text-muted-foreground">
//                     No business units found
//                   </div>
//                 )}
//               </SelectContent>
//             </Select>
//           </div>

//           {/* Footer */}
//           <div className="flex justify-end gap-2 pt-2 border-t border-border">
//             <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
//               Cancel
//             </Button>
//             <Button size="sm" onClick={handleSubmit}>
//               {team ? 'Update' : 'Create'}
//             </Button>
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// }
