/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Plus, Pencil, Trash2, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAxios } from '@/hooks/useAxios'; // adjust path if needed

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface AppCredential {
  id: string;
  appName: string;
  email: string;
  updatedAt: string;
}

interface FormState {
  appName: string;
  email: string;
  password: string;
}

const EMPTY_FORM: FormState = { appName: '', email: '', password: '' };

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function AppCredentialsManager() {
  const axios = useAxios();

  const [credentials, setCredentials] = useState<AppCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppCredential | null>(null);
  const [editTarget, setEditTarget] = useState<AppCredential | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Load all saved app credentials for the logged-in user
  useEffect(() => {
    fetchCredentials();
  }, []);

  async function fetchCredentials() {
    setLoading(true);
    try {
      const res = await axios.get('/users/app-credentials');
      setCredentials(res.data?.data || []);
    } catch {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }

  // ── Open dialog for add
  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowPassword(false);
    setDialogOpen(true);
  }

  // ── Open dialog for edit
  function openEdit(cred: AppCredential) {
    setEditTarget(cred);
    setForm({ appName: cred.appName, email: cred.email, password: '' });
    setError('');
    setShowPassword(false);
    setDialogOpen(true);
  }

  // ── Save (add or edit)
  async function handleSave() {
    if (!form.appName.trim()) {
      setError('App name is required');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!editTarget && !form.password.trim()) {
      setError('Password is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await axios.post('/users/app-credentials', {
        appName: form.appName.trim().toUpperCase(),
        email: form.email.trim(),
        // only send password if provided (on edit, blank = keep existing)
        ...(form.password.trim() ? { password: form.password } : {}),
      });

      setDialogOpen(false);
      await fetchCredentials();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await axios.delete(`/users/app-credentials/${deleteTarget.appName}`);
      setDeleteTarget(null);
      await fetchCredentials();
    } catch {
      setDeleteTarget(null);
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Connected Apps</h2>
          <p className="text-sm text-muted-foreground">
            Credentials are encrypted and stored securely.
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add App
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : credentials.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
            <ShieldCheck className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No apps connected yet.</p>
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add your first app
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {credentials.map(cred => (
            <Card key={cred.id} className="group">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-mono tracking-wide">
                      {cred.appName}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(cred)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(cred)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <CardDescription className="text-xs">{cred.email}</CardDescription>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Updated{' '}
                  {new Date(cred.updatedAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? `Edit ${editTarget.appName} credentials` : 'Connect an app'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* App name */}
            <div className="space-y-1.5">
              <Label htmlFor="appName">App name</Label>
              <Input
                id="appName"
                placeholder="e.g. NAUKRI, LINKEDIN"
                value={form.appName}
                disabled={!!editTarget}
                onChange={e => setForm(f => ({ ...f, appName: e.target.value }))}
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email / Username</Label>
              <Input
                id="email"
                type="email"
                placeholder="recruiter@company.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password
                {editTarget && (
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    (leave blank to keep existing)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={editTarget ? '••••••••' : 'Enter password'}
                  value={form.password}
                  className="pr-10"
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editTarget ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.appName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the saved credentials for{' '}
              <strong>{deleteTarget?.appName}</strong>. The extension will stop auto-logging into
              this app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
