// File: RunStepLauncher.tsx
// Path: src/features/pipeline/RunStepLauncher.tsx
//
// Run a step from anywhere (the clients list): loads the client's step
// overview, opens the same run dialog as the Pipeline tab, then the run sheet.

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RunSheet } from '@/app/(app)/pipeline-runs/_components/RunSheet';
import { clientHooks } from '@/hooks/queries';
import { pipelineApi } from '@/lib/api/endpoints';
import { RunStepDialog } from './RunStepDialog';

export interface RunTarget {
  clientId: string;
  clientName: string;
  stepKey: string;
}

export function RunStepLauncher({
  target,
  onClose,
}: {
  target: RunTarget | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [openRun, setOpenRun] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['step-runs', 'overview', target?.clientId ?? ''],
    queryFn: () => pipelineApi.overview(target!.clientId),
    enabled: !!target,
  });
  const step = target ? (q.data?.steps.find(s => s.key === target.stepKey) ?? null) : null;

  return (
    <>
      {target && (
        <RunStepDialog
          key={`${target.clientId}:${step?.id ?? 'loading'}`}
          clientId={target.clientId}
          clientName={target.clientName}
          step={step}
          steps={q.data?.steps ?? []}
          counts={q.data?.counts}
          canRerun={q.data?.canRerun}
          open={!!step}
          onOpenChange={o => !o && onClose()}
          onStarted={r => {
            onClose();
            void qc.invalidateQueries({ queryKey: clientHooks.keys.all });
            setOpenRun(r.id);
          }}
        />
      )}
      <RunSheet runId={openRun} onOpenChange={o => !o && setOpenRun(null)} onOpenRun={setOpenRun} />
    </>
  );
}
