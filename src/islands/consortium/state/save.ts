// The device save's own state (fix round 3, save-model design check 2026-11-15): a leaf both
// store.ts (Undo) and persist.ts (the save's writes) import, so neither imports the other for it.
//
// One flag, `held`: this page's palette is not the save. Every page starts held; a restore of the save,
// or a plant change that can be undone (store.ts Add, Remove, Swap, a suggestion placed), lets it go;
// Start over holds it again. Not held, persist.ts writes the current palette; held, the save is left
// as it is (a link's or a guide's page, Place's answers, "Use it", "Show my palette": owner
// 2026-11-15, decision 2). Each undoable action's snapshot records the save as it was then and the
// flag (markSave); its Undo puts both back in one batch, and the save only once it holds again, and
// only while the storage still holds what this page last wrote (another tab's save is never lost).
import { batch, signal } from '@preact/signals';

export const STORE = 'canopi-consortium';

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
        const key = `${STORE}-probe`;
        s.setItem(key, '1');
        const ok = s.getItem(key) === '1';
        s.removeItem(key);
        return ok;
      }) ?? false;
    },
  };
}

export const memory = guarded(() => (typeof localStorage === 'undefined' ? null : localStorage));

// ---- the save's state ----

// This page's palette is not the save.
export const held = signal(true);
// The save as this page last wrote it, or read it when it opened (arrival.ts startMemory).
export const lastSave = signal<string | null>(null);

// The save's last-changed date (pf hand-off; owner answer Q3, board Arrivals "Your palette is back: …,
// last changed …"): the record's `at` (persist.ts saveRecord), an ISO 8601 time written only when the
// palette, its place answers or its country source change (persist.ts writeSave: the time alone never
// rewrites the save; Undo puts the old record back, `at` with it), so it is the date the palette last
// changed. null: no save, or no readable date.
export function changedOf(text: string | null): string | null {
  const at = attempt(() => (text ? (JSON.parse(text) as { at?: unknown } | null)?.at : null));
  return typeof at === 'string' && !Number.isNaN(Date.parse(at)) ? at : null;
}

// What an undoable action saw: the save as stored, and the flag.
export interface SaveMark { text: string | null; held: boolean }
export const markSave = (): SaveMark => ({ text: memory.read(STORE), held: held.peek() });
// The save put back exactly (text) or removed (null), only while the storage still holds what this
// page last wrote or read: another tab's save, written since, is left alone (R2-2, M1-M3).
export function putSave(text: string | null): void {
  const now = memory.read(STORE);
  if (now !== lastSave.peek() || now === text) return;
  if (text === null ? memory.remove(STORE) : memory.write(STORE, text)) lastSave.value = text;
}
// Undo: the flag and the state back in one batch (persist.ts sees both together), then, held again,
// the save as it was.
export function undoSave(m: SaveMark, put: () => void): void {
  batch(() => { held.value = m.held; put(); });
  if (m.held) putSave(m.text);
}

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
