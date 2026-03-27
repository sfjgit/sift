'use client';

import { BusinessUnit, useBusinessUnitsApi } from '@/lib/business-units.api';
import { mutate } from 'swr';
import useSWR from 'swr';
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
import { Plus } from 'lucide-react';

export function CreateBusinessUnitDialog() {
  const api = useBusinessUnitsApi();

  // ✅ fetch parent BU list
  const { data } = useSWR('business-units', async () => {
    const res = await api.getAll();
    return res.data?.data;
  });

  const list = data ?? [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4" />
          Create Business Unit
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Business Unit</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={async e => {
            e.preventDefault();

            const formData = new FormData(e.currentTarget);

            const name = formData.get('name') as string;
            const isActive = formData.get('isActive') === 'true';
            const parentBUId = formData.get('parentBUId') as string;

            if (!name?.trim()) return;

            try {
              await api.create({
                name,
                isActive,
                parentBUId: parentBUId || undefined,
              });

              mutate('business-units');
            } catch (err) {
              console.error(err);
            }
          }}
        >
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input name="name" placeholder="Business unit name" required />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Active</label>

            <Switch
              defaultChecked
              onCheckedChange={val => {
                const input = document.getElementById('isActive-input') as HTMLInputElement;
                if (input) input.value = String(val);
              }}
            />

            {/* hidden input */}
            <input type="hidden" name="isActive" id="isActive-input" value="true" />
          </div>

          {/* Parent BU */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Parent (optional)</label>

            <Select
              onValueChange={val => {
                const input = document.getElementById('parentBU-input') as HTMLInputElement;
                if (input) input.value = val;
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parent BU" />
              </SelectTrigger>

              <SelectContent>
                {list.map((bu: BusinessUnit) => (
                  <SelectItem key={bu.id} value={bu.id}>
                    {bu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* hidden input */}
            <input type="hidden" name="parentBUId" id="parentBU-input" />
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <Button type="submit">Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
