'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useRolesApi } from '@/lib/roles.api';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
export type CreateRoleFormProps = {
  onCancel?: () => void;
};

// ── Schema ────────────────────────────────────────────────────────────────────
const createRoleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  description: z.string().min(2, 'Description must be at least 2 characters.'),
  isSystem: z.boolean().default(false),
});

type FormState = z.infer<typeof createRoleSchema>;
type FieldErrors = Partial<Record<keyof FormState, string>>;

// ── Component ─────────────────────────────────────────────────────────────────
export default function CreateRoleForm({ onCancel }: CreateRoleFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    isSystem: false,
  });
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users', { params: { limit: 100 } });
      return res.data.data ?? [];
    },
  });

  const validate = (): boolean => {
    const result = createRoleSchema.safeParse(form);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: FieldErrors = {};
    result.error.issues.forEach(e => {
      const field = e.path[0] as keyof FormState;
      fieldErrors[field] = e.message;
    });
    setErrors(fieldErrors);
    return false;
  };

  const rolesApi = useRolesApi();

  const handleSubmit = async () => {
    setServerError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await rolesApi.create({
        name: form.name,
        description: form.description,
      });
      router.push('/dashboard/roles');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong. Please try again.';
      setServerError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Create Role</h1>
        <p className="text-sm text-muted-foreground">
          Define a new role. Configure permissions after creation.
        </p>
      </div>

      {/* Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Role Details</CardTitle>
          <CardDescription className="text-xs">
            Fields marked <span className="text-destructive">*</span> are required.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Role Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Recruitment Manager"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              className={errors.name ? 'border-destructive focus-visible:ring-destructive/30' : ''}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Assign User */}
          <div className="space-y-1.5">
            <Label>Assign User</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={usersLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={usersLoading ? 'Loading users…' : 'Select a user (optional)'}
                />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="What does this role do?"
              rows={3}
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              className={
                errors.description ? 'border-destructive focus-visible:ring-destructive/30' : ''
              }
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          {/* System Role */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium cursor-pointer" htmlFor="isSystem">
                System Role
              </Label>
              <p className="text-xs text-muted-foreground">
                System roles are managed by the platform and cannot be deleted.
              </p>
            </div>
            <Switch
              id="isSystem"
              checked={form.isSystem}
              onCheckedChange={val => handleChange('isSystem', val)}
            />
          </div>

          {/* Server Error */}
          {serverError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {serverError}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitting ? 'Creating…' : 'Create Role'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
