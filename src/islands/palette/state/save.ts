// Storage guards, legacy localStorage cleanup list, per-tab forget counter, and language-switch
// leave-warning suppression. Browser localStorage never auto-saves palettes (Wave 7.1).
export const LEGACY_PALETTE_KEYS = [
  'canopi-consortium',
  'canopi-place',
  'canopi-ns-existing',
  'canopi-ns-checked',
] as const;

// ---- storage, guarded ----

export interface StorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export const attempt = <T>(f: () => T): T | null => { try { return f(); } catch { return null; } };

// A storage whose every call is caught. get() may itself throw (a blocked localStorage getter).
export function guarded(get: () => StorageLike | null | undefined) {
  return {
    read: (k: string): string | null => attempt(() => get()?.getItem(k) ?? null),
    write: (k: string, v: string): boolean => attempt(() => { const s = get(); if (!s) return false; s.setItem(k, v); return true; }) ?? false,
    remove: (k: string): boolean => attempt(() => { const s = get(); if (!s) return false; s.removeItem(k); return true; }) ?? false,
    // Whether this browser keeps anything: a probe key written, read back and removed.
    works(): boolean {
      return attempt(() => {
        const s = get();
        if (!s) return false;
        const key = 'canopi-storage-probe';
        s.setItem(key, '1');
        const ok = s.getItem(key) === '1';
        s.removeItem(key);
        return ok;
      }) ?? false;
    },
  };
}

export const memory = guarded(() => (typeof localStorage === 'undefined' ? null : localStorage));

// "Forget this location" in this tab, counted (sessionStorage, so it outlasts a reload, as the tab's
// history entries do; a module count when the browser keeps none). Each address entry records the
// count it was written under (persist.ts writeAddress `fg`); an entry written before the last Forget
// brings back no spot or soil answers (arrival.ts ownOf; second-round review 2).
const tab = guarded(() => (typeof sessionStorage === 'undefined' ? null : sessionStorage));
const FORGET_KEY = 'canopi-forget';
let forgetsHere = 0;
export const forgets = (): number => Math.max(forgetsHere, Number(tab.read(FORGET_KEY)) || 0);
export function noteForget(): void {
  forgetsHere = forgets() + 1;
  tab.write(FORGET_KEY, String(forgetsHere));
}

// ---- leave-warning suppression for same-page language switches (Wave 7) ----
// Cleared automatically on pagehide, pageshow, and a 2 s safety timer if navigation cancels.
let leaveSuppressed = false;
let leaveSuppressTimer: ReturnType<typeof setTimeout> | null = null;
let leaveClearBound = false;

function clearLeaveSuppression(): void {
  leaveSuppressed = false;
  if (leaveSuppressTimer !== null) {
    clearTimeout(leaveSuppressTimer);
    leaveSuppressTimer = null;
  }
}

export function suppressLeaveWarning(): void {
  leaveSuppressed = true;
  if (leaveSuppressTimer !== null) clearTimeout(leaveSuppressTimer);
  leaveSuppressTimer = setTimeout(clearLeaveSuppression, 2000);
  if (!leaveClearBound && typeof window !== 'undefined') {
    leaveClearBound = true;
    window.addEventListener('pagehide', clearLeaveSuppression);
    window.addEventListener('pageshow', clearLeaveSuppression);
  }
}

export function isLeaveWarningSuppressed(): boolean {
  return leaveSuppressed;
}
