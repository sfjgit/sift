'use client';

import { BusinessUnit, useBusinessUnitsApi } from '@/lib/business-units.api';
import { usePermission } from '@/hooks/usePermission';
import useSWR, { mutate } from 'swr';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  bu: BusinessUnit;
}

export function EditBusinessUnitDialog({ bu }: Props) {
  const api = useBusinessUnitsApi();
  const canEdit = usePermission('business_units', 'canEdit');

  const { data } = useSWR('business-units', async () => {
    const res = await api.getAll();
    return res.data?.data;
  });

  const list = data ?? [];

  // ❌ no permission
  if (!canEdit) return null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-gray-500">
          <Edit className="w-4 h-4 text-black" />
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Business Unit</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={async e => {
            e.preventDefault();

            const formData = new FormData(e.currentTarget);

            const name = formData.get('name') as string;
            const isActive = formData.get('isActive') === 'true';
            const parentBUId = formData.get('parentBUId') as string;

            try {
              await api.update(bu.id, {
                name: name || undefined,
                isActive,
                parentBUId: parentBUId || undefined,
              });

              toast.success('Business Unit updated successfully');

              // 🔄 refresh
              mutate(`business-unit:${bu.id}`);
              mutate('business-units');
            } catch (err) {
              console.error(err);
            }
          }}
        >
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input name="name" defaultValue={bu.name} />
          </div>

          {/* Active */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Active</label>

            <Switch
              defaultChecked={bu.isActive}
              onCheckedChange={val => {
                const input = document.getElementById('edit-isActive') as HTMLInputElement;
                if (input) input.value = String(val);
              }}
            />

            <input
              type="hidden"
              id="edit-isActive"
              name="isActive"
              defaultValue={String(bu.isActive)}
            />
          </div>

          {/* Parent BU */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Parent (optional)</label>

            <Select
              defaultValue={bu.parentBUId ?? 'none'}
              onValueChange={val => {
                const input = document.getElementById('edit-parentBU') as HTMLInputElement;
                if (input) input.value = val === 'none' ? '' : val;
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent BU" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="none">None</SelectItem>

                {list.map((item: BusinessUnit) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <input
              type="hidden"
              id="edit-parentBU"
              name="parentBUId"
              defaultValue={bu.parentBUId ?? ''}
            />

            <input
              type="hidden"
              id="edit-parentBU"
              name="parentBUId"
              defaultValue={bu.parentBUId ?? ''}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit">Update</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
