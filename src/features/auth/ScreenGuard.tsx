// File: ScreenGuard.tsx
// Path: src/features/auth/ScreenGuard.tsx
//
// Screenshots can't be blocked from a web page, so for everyone but the super
// admin we make them traceable and harder to take:
//   1. a faint watermark across every page — name, email, date and time — so
//      any screenshot or phone photo shows who took it
//   2. printing / "Save as PDF" prints a blank page
//   3. the page blurs while the window isn't in focus (snipping tools, other
//      apps), and clears when you click back in

'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from './AuthProvider';

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

/** one tile of the repeated watermark, as an SVG data URL */
function tile(line1: string, line2: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="220">
<g transform="rotate(-24 180 110)" font-family="system-ui, sans-serif" fill="rgb(100,116,139)" fill-opacity="0.16" text-anchor="middle">
<text x="180" y="104" font-size="15" font-weight="600">${esc(line1)}</text>
<text x="180" y="126" font-size="12">${esc(line2)}</text>
</g></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}

const PRINT_CSS = `@media print {
  body > * { display: none !important; }
  body::before { content: "Printing is turned off to protect client data."; display: block; padding: 48px; font: 16px system-ui, sans-serif; }
}`;

export function ScreenGuard() {
  const { user } = useAuth();
  const on = !!user && !user.isSuperAdmin;

  // the time on the watermark moves with the clock (every minute)
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!on) return;
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, [on]);

  const background = useMemo(() => {
    if (!user) return '';
    const name = user.displayName || `${user.firstName} ${user.lastName}`.trim();
    return tile(
      `${name}${user.employeeId ? ` · ${user.employeeId}` : ''}`,
      `${user.email} · ${format(now, 'dd MMM yyyy, HH:mm')}`
    );
  }, [user, now]);

  // 2. no printing
  useEffect(() => {
    if (!on) return;
    const style = document.createElement('style');
    style.dataset.screenGuard = 'print';
    style.textContent = PRINT_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, [on]);

  // 3. blur while the window is not in focus
  useEffect(() => {
    if (!on) return;
    const body = document.body;
    const hide = () => {
      // focus moving into a frame on our own page (e.g. a screen replay) is not leaving
      if (document.activeElement?.tagName === 'IFRAME') return;
      body.style.filter = 'blur(14px)';
    };
    const show = () => {
      body.style.filter = '';
    };
    const onVisibility = () => (document.hidden ? hide() : show());
    window.addEventListener('blur', hide);
    window.addEventListener('focus', show);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', hide);
      window.removeEventListener('focus', show);
      document.removeEventListener('visibilitychange', onVisibility);
      show();
    };
  }, [on]);

  if (!on) return null;
  // 1. the watermark — above everything, never in the way of clicks
  return (
    <div
      aria-hidden
      data-screen-guard="watermark"
      className="pointer-events-none fixed inset-0 z-[2147483000] select-none"
      style={{ backgroundImage: background, backgroundRepeat: 'repeat' }}
    />
  );
}
