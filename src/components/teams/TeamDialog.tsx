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
import { Team, useTeamsApi } from '@/lib/teams.api';
import { useAxios } from '@/hooks/useAxios';
import { Label } from '../ui/label';
import { useQuery } from '@tanstack/react-query';
import { BusinessUnit } from '@/lib/business-units.api';

type TeamDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  team?: Team | null;
  refresh: () => void;
};

export default function TeamDialog({ open, setOpen, team, refresh }: TeamDialogProps) {
  const api = useAxios();
  const { create, update } = useTeamsApi();

  // ✅ Form State
  // const [form, setForm] = useState({
  //   name: '',
  //   description: '',
  //   businessUnitId: '',
  //   isActive: true,
  // });

  // ✅ React Query for Business Units
  const { data: businessUnits = [], isLoading } = useQuery<BusinessUnit[]>({
    queryKey: ['business-units'],
    queryFn: async () => {
      const res = await api.get('/business-units');
      return res.data.data;
    },
  });

  // ✅ Populate edit data
  // useEffect(() => {
  //   if (team) {
  //     setForm({
  //       name: team.name || '',
  //       description: team.description || '',
  //       businessUnitId: team.businessUnitId || '',
  //       isActive: team.isActive ?? true,
  //     });
  //   } else {
  //     // reset form when creating new
  //     setForm({
  //       name: '',
  //       description: '',
  //       businessUnitId: '',
  //       isActive: true,
  //     });
  //   }
  // }, [team]);

  const getInitialForm = (team?: Team | null) => ({
    name: team?.name ?? '',
    description: team?.description ?? '',
    businessUnitId: team?.businessUnitId ?? '',
    isActive: team?.isActive ?? true,
  });

  const [form, setForm] = useState(getInitialForm(team));

  // ✅ Submit Handler
  const handleSubmit = async () => {
    try {
      if (team) {
        await update(team.id, form);
      } else {
        await create(form);
      }

      refresh();
      setOpen(false);
    } catch (error) {
      console.error('Error saving team:', error);
    }
  };

  return (
    // <Dialog open={open} onOpenChange={setOpen}>
    <Dialog
      open={open}
      onOpenChange={value => {
        setOpen(value);

        if (value) {
          setForm(getInitialForm(team));
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? 'Edit Team' : 'Create Team'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              placeholder="Enter team name"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              placeholder="Enter description"
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Business Unit */}
          <div className="space-y-1.5">
            <Label>Business Unit</Label>
            <Select
              value={form.businessUnitId}
              onValueChange={value => setForm(prev => ({ ...prev, businessUnitId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? 'Loading...' : 'Select Business Unit'} />
              </SelectTrigger>

              <SelectContent>
                {businessUnits.length > 0 ? (
                  businessUnits.map(bu => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">No business units found</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <Button onClick={handleSubmit}>{team ? 'Update' : 'Create'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
