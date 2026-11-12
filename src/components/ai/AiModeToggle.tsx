// File: AiModeToggle.tsx
// Path: src/components/ai/AiModeToggle.tsx
//
// Off / Command / Canvas switch for the AI assistant (the user's own choice,
// within what the org + their role allow) and the top bar's "Ask AI" control.
// Hidden entirely when AI is off for the org, killed, or not on the user's role.

'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, LayoutDashboard, Power, Sparkles, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Segmented, type SegmentedOption } from '@/components/ui/segmented';
import { aiApi } from '@/lib/api/endpoints';
import type { ApiError } from '@/lib/api/client';
import { useUi } from '@/stores/ui';
import { AI_ME_KEY, invalidateAiMe, quotaLabel, READ_ONLY_NOTE, useAiMe } from '@/features/ai/useAi';
import type { AiMe, AiMode } from '@/types/ai';

/** the user may see / change their mode (org on + role allows), even when they switched it off */
export const canToggleAi = (me?: AiMe) => !!me && (me.enabled || me.reason === 'user_off');

export function AiModeToggle({ me }: { me: AiMe }) {
  const qc = useQueryClient();
  const set = useMutation({
    mutationFn: (mode: AiMode) => aiApi.setPreference(mode),
    onSuccess: next => {
      // the server answers with the access part only — merge, never replace (quota, can… stay)
      qc.setQueryData<AiMe>(AI_ME_KEY, prev => (prev ? { ...prev, ...next } : prev));
      void invalidateAiMe(qc);
    },
    onError: (e: ApiError) => toast.error(e.message),
  });

  const options: SegmentedOption<AiMode>[] = [
    { value: 'OFF', label: 'Off', icon: Power, title: 'Hide the assistant' },
    ...(me.allowed.command
      ? [
          {
            value: 'COMMAND' as const,
            label: 'Command',
            icon: Terminal,
            title: 'Command bar (Ctrl/⌘+J)',
          },
        ]
      : []),
    ...(me.allowed.canvas
      ? [
          {
            value: 'CANVAS' as const,
            label: 'Canvas',
            icon: LayoutDashboard,
            title: 'Command bar + AI Canvas (beta)',
          },
        ]
      : []),
  ];

  return (
    <Segmented
      value={set.isPending && set.variables ? set.variables : me.preference}
      onChange={mode => mode !== me.preference && set.mutate(mode)}
      options={options}
    />
  );
}

/** top bar: "Ask AI" (when Command mode is on) + a dropdown with the mode switch */
export function AiTopbarControl() {
  const { data: me } = useAiMe();
  const setAiOpen = useUi(s => s.setAiOpen);
  if (!canToggleAi(me) || !me) return null;
  const on = me.active.command;

  return (
    <div className="flex items-center">
      {on && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-r-none"
          onClick={() => setAiOpen(true)}
          title="Ask AI (Ctrl/⌘+J)"
        >
          <Sparkles className="text-primary" />
          <span className="hidden sm:inline">Ask AI</span>
        </Button>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size={on ? 'icon-sm' : 'sm'}
            className={on ? 'rounded-l-none' : undefined}
            aria-label="AI assistant mode"
            title="AI assistant mode"
          >
            {!on && (
              <>
                <Sparkles className="text-muted-foreground" />
                <span className="hidden sm:inline">AI off</span>
              </>
            )}
            <ChevronDown className="size-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold">AI assistant</p>
            <p className="text-xs text-muted-foreground">{READ_ONLY_NOTE}</p>
          </div>
          <AiModeToggle me={me} />
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Command</span> — say what you want to
              see; open with <Kbd>Ctrl</Kbd>
              <Kbd>J</Kbd>.
            </li>
            {me.allowed.canvas && (
              <li>
                <span className="font-medium text-foreground">Canvas</span> — also build read-only
                reports in{' '}
                {me.active.canvas ? (
                  <Link href="/ai-canvas" className="text-primary hover:underline">
                    AI Canvas
                  </Link>
                ) : (
                  'AI Canvas'
                )}{' '}
                (beta).
              </li>
            )}
          </ul>
          {on && (
            <p className="border-t pt-2 text-xs text-muted-foreground">
              Commands: <span className="text-foreground">{quotaLabel(me.quota.command)}</span>
            </p>
          )}
          {me.basicMode && <p className="text-xs text-warning">{me.basicMode}</p>}
        </PopoverContent>
      </Popover>
    </div>
  );
}
