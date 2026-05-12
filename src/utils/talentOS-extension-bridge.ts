// File: talentOS-extension-bridge.ts
// Path: src/utils/talentOS-extension-bridge.ts

// ─── Login sync ───────────────────────────────────────────────────────────────
// Call after login API succeeds OR on session hydration.
// Sends name + email so extension popup shows "Connected · John Doe".
// Token is NOT needed here — extension reads it from the accessToken cookie
// via chrome.cookies.onChanged automatically.

export function notifyExtensionLogin(token: string, name: string, email: string) {
  window.postMessage({ type: 'TALENTOX_LOGGED_IN', token, name, email }, window.location.origin);
}

// ─── Logout sync ──────────────────────────────────────────────────────────────
// Call after logout. Extension clears its session storage.

export function notifyExtensionLogout() {
  window.postMessage({ type: 'TALENTOX_LOGOUT' }, window.location.origin);
}

// ─── Source on portal ─────────────────────────────────────────────────────────
// Call when recruiter clicks a portal button (Naukri, LinkedIn, etc.)
// on a requirement page.
//
// Extension will:
//   1. Store requirementId + code + title
//   2. Open the correct portal URL in a new tab
//   (auto-login is next version — skipped for now)

export function sourceOnPortal(
  requirement: { id: string; reqCode: string; title: string },
  appName: string = 'NAUKRI'
) {
  window.postMessage(
    {
      type: 'TALENTOX_SOURCE_NAUKRI',
      requirementId: requirement.id,
      requirementCode: requirement.reqCode,
      requirementTitle: requirement.title,
      appName: appName.toUpperCase(),
    },
    window.location.origin
  );
}
