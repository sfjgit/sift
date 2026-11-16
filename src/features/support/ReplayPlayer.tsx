// File: ReplayPlayer.tsx
// Path: src/features/support/ReplayPlayer.tsx
//
// Plays a recorded screen (rrweb) — the exact page the reporter saw, with
// their mouse, clicks and scrolling. Loaded only on a ticket page.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import 'rrweb-player/dist/style.css';
import { supportApi } from '@/lib/api/endpoints';
import { toApiError } from '@/lib/api/client';
import { unpackEvents } from './recorder';

export function ReplayPlayer({
  ticketId,
  attachmentId,
}: {
  ticketId: string;
  attachmentId: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | string>('loading');

  useEffect(() => {
    // the player is a compiled Svelte component; $destroy exists at runtime
    let player: { $destroy?: () => void; getReplayer?: () => { pause: () => void } } | null = null;
    let gone = false;
    (async () => {
      try {
        const [gz, { default: Player }] = await Promise.all([
          supportApi.attachment(ticketId, attachmentId),
          import('rrweb-player'),
        ]);
        const events = await unpackEvents(gz);
        if (gone || !box.current) return;
        if (events.length < 2) return setState('This recording is empty.');
        box.current.innerHTML = '';
        const width = box.current.clientWidth;
        player = new Player({
          target: box.current,
          props: {
            events: events as never,
            width,
            height: Math.round(width * 0.56),
            autoPlay: false,
            skipInactive: true,
            showController: true,
            speedOption: [1, 2, 4, 8],
            mouseTail: { strokeStyle: 'rgba(37,99,235,.6)', lineWidth: 2, duration: 600 },
          },
        }) as unknown as typeof player;
        setState('ready');
      } catch (e) {
        if (!gone) setState(toApiError(e).message);
      }
    })();
    return () => {
      gone = true;
      player?.getReplayer?.().pause();
      player?.$destroy?.();
    };
  }, [ticketId, attachmentId]);

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/30">
      {state !== 'ready' && (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          {state === 'loading' ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading the replay…
            </>
          ) : (
            state
          )}
        </div>
      )}
      <div ref={box} className="[&_.rr-player]:!w-full [&_.rr-player]:!shadow-none" />
    </div>
  );
}
