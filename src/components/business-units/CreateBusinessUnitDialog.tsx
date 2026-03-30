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

  const { data } = useSWR('business-units', async () => {
    const res = await api.getAll();
    return res.data?.data;
  });

  const list = data ?? [];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-gray-200 hover:bg-gray-300">
          <Plus className="w-4 h-4" />
          New Business Unit
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Create Business Unit</DialogTitle>
        </DialogHeader>

        <form
          className="mt-2 space-y-4"
          onSubmit={async e => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const name = formData.get('name') as string;
            const isActive = formData.get('isActive') === 'true';
            const parentBUId = formData.get('parentBUId') as string;
            if (!name?.trim()) return;
            try {
              await api.create({ name, isActive, parentBUId: parentBUId || undefined });
              mutate('business-units');
            } catch (err) {
              console.error(err);
            }
          }}
        >
          {/* Name */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-foreground">Name</label>
            <Input name="name" placeholder="e.g. TaaS BU" required />
          </div>

          {/* Parent BU */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Parent Business Unit{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
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
            <input type="hidden" name="parentBUId" id="parentBU-input" />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Inactive units won&apos;t appear in selections
              </p>
            </div>
            <Switch
              defaultChecked
              onCheckedChange={val => {
                const input = document.getElementById('isActive-input') as HTMLInputElement;
                if (input) input.value = String(val);
              }}
            />
            <input type="hidden" name="isActive" id="isActive-input" defaultValue="true" />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <DialogTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </DialogTrigger>
            <Button type="submit" size="sm">
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
