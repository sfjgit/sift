// File: AddCandidateModal.tsx
// Path: src/components/requirements/AddCandidateModal.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  UserPlus,
  Pencil,
  FileText,
  Database,
  Globe,
  ExternalLink,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useAxios } from '@/hooks/useAxios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReqRef {
  id: string;
  reqCode: string;
  slug?: string | null;
  title: string;
}

interface AppCredential {
  id: string;
  appName: string;
  email: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  req: ReqRef;
  /**
   * Called when user picks "Enter Details Manually"
   * Parent should navigate to /requirements/:idOrSlug/candidates/new
   */
  onManual?: () => void;
  /**
   * Called when user picks "Upload Resume"
   * Parent can open a file-upload dialog
   */
  onUpload?: () => void;
  /**
   * Called when user picks "Database"
   * Parent can open a candidate-search drawer
   */
  onDatabase?: () => void;
}

// ─── App meta ─────────────────────────────────────────────────────────────────

const APP_META: Record<string, { bg: string; short: string; color: string }> = {
  NAUKRI: { bg: 'bg-orange-50', short: 'N', color: 'text-orange-600' },
  LINKEDIN: { bg: 'bg-blue-50', short: 'in', color: 'text-blue-700' },
  FOUNDIT: { bg: 'bg-purple-50', short: 'F', color: 'text-purple-600' },
  SHINE: { bg: 'bg-sky-50', short: 'S', color: 'text-sky-600' },
  INDEED: { bg: 'bg-blue-50', short: 'I', color: 'text-blue-700' },
  GITHUB: { bg: 'bg-slate-100', short: 'G', color: 'text-slate-700' },
};

// ─── Extension bridge ─────────────────────────────────────────────────────────

function triggerExtension(req: ReqRef, appName: string) {
  window.postMessage(
    {
      type: 'TALENTOX_SOURCE_NAUKRI',
      requirementId: req.id,
      requirementCode: req.reqCode,
      requirementTitle: req.title,
      appName,
    },
    window.location.origin
  );
}

// ─── Modal Row ────────────────────────────────────────────────────────────────

function ModalRow({
  iconBg,
  icon,
  title,
  desc,
  onClick,
  disabled,
}: {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors text-left group disabled:opacity-50"
    >
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <ChevronDown className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors -rotate-90 shrink-0" />
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddCandidateModal({ open, onClose, req, onManual, onUpload, onDatabase }: Props) {
  const axios = useAxios();
  const [portalExpanded, setPortalExpanded] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);

  const { data: credsData, isLoading: credsLoading } = useQuery<{
    success: boolean;
    data: AppCredential[];
  }>({
    queryKey: ['user-app-credentials'],
    queryFn: async () => (await axios.get('/users/app-credentials')).data,
    enabled: open && portalExpanded,
  });

  const credentials = credsData?.data ?? [];

  function handleLaunch(cred: AppCredential) {
    setLaunching(cred.appName);
    triggerExtension(req, cred.appName);
    setTimeout(() => {
      setLaunching(null);
      onClose();
    }, 800);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[420px] rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Add Candidate</h2>
              <p className="text-[11px] text-slate-400 truncate max-w-[260px]">
                {req.title} · {req.reqCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-3 py-3 space-y-0.5">
          <ModalRow
            iconBg="bg-rose-50"
            icon={<Pencil className="w-4 h-4 text-rose-500" />}
            title="Enter Details Manually"
            desc="Create a candidate profile based on information you already know"
            onClick={() => {
              onClose();
              onManual?.();
            }}
          />

          <ModalRow
            iconBg="bg-green-50"
            icon={<FileText className="w-4 h-4 text-green-600" />}
            title="Upload Resume"
            desc="Upload a resume PDF/DOCX directly — AI will parse and pre-fill the profile"
            onClick={() => {
              onClose();
              onUpload?.();
            }}
          />

          <ModalRow
            iconBg="bg-blue-50"
            icon={<Database className="w-4 h-4 text-blue-500" />}
            title="Search Database"
            desc="Find and push an existing candidate from your talent pool"
            onClick={() => {
              onClose();
              onDatabase?.();
            }}
          />

          {/* Portal Recruit — expandable */}
          <div>
            <button
              onClick={() => setPortalExpanded(v => !v)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-slate-800">Portal Recruit</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Source resumes from job boards via Chrome extension
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all text-[11px] font-bold leading-none ${
                  portalExpanded
                    ? 'border-primary bg-primary text-white'
                    : 'border-slate-300 text-slate-500 group-hover:border-slate-400'
                }`}
              >
                {portalExpanded ? '−' : '+'}
              </div>
            </button>

            {portalExpanded && (
              <div className="ml-12 pl-4 border-l-2 border-slate-100 py-1 space-y-0.5">
                {credsLoading ? (
                  <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading connected apps…
                  </div>
                ) : credentials.length === 0 ? (
                  <p className="py-3 text-xs text-slate-400 leading-relaxed">
                    No job boards connected yet.{' '}
                    <a
                      href="/settings/connected-apps"
                      className="text-primary font-medium hover:underline"
                    >
                      Settings → Connected Apps
                    </a>
                  </p>
                ) : (
                  credentials.map(cred => {
                    const meta = APP_META[cred.appName] ?? {
                      bg: 'bg-slate-100',
                      short: cred.appName[0],
                      color: 'text-slate-700',
                    };
                    const isLaunching = launching === cred.appName;
                    const displayName =
                      cred.appName.charAt(0) + cred.appName.slice(1).toLowerCase();

                    return (
                      <button
                        key={cred.id}
                        onClick={() => handleLaunch(cred)}
                        disabled={!!launching}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group disabled:opacity-60"
                      >
                        <div
                          className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}
                        >
                          <span className={`text-xs font-bold ${meta.color}`}>{meta.short}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{displayName}</p>
                          <p className="text-[11px] text-slate-400 truncate">{cred.email}</p>
                        </div>
                        {isLaunching ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5 text-slate-200 group-hover:text-slate-500 shrink-0 transition-colors" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="px-5 pb-4 pt-1">
          <p className="text-[10px] text-slate-300 text-center">
            Portal Recruit requires the TalentOS Chrome Extension to be installed
          </p>
        </div>
      </div>
    </div>
  );
}
