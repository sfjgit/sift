'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import CreateRoleForm from '@/components/roles/CreateRoleForm';
import RolesList from '@/components/roles/RolesList';

export default function Page() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return <CreateRoleForm onCancel={() => setShowForm(false)} />;
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-8 max-w-8xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight">Role Management</h1>
          <p className="text-sm text-muted-foreground">Add, update and delete roles.</p>
        </div>
        <Button onClick={() => setShowForm(true)}>Create Role</Button>
      </div>

      {/* Roles Table */}
      <RolesList />
    </div>
  );
}
