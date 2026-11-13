// What the consortium tool keeps and restores, and how it opens: split by E6 S2 into
// state/persist.ts (storage, the save record, the address bar, the store watcher, the restore in
// flight), state/restore.ts (a link, the save, a guide preset, the site location a page brings),
// state/arrival.ts (what the page opens with; startMemory), state/draft.ts (Start's draft and the
// reader's moves around it; the crop examples), state/suggest-wait.ts (the waiting Suggest) and
// state/lookups.ts (the location lookups in flight). The location step's own state is
// state/location.ts.
//
// Re-exports only: the 16 names the views R2 owns import, and shareState, restore, watchStore and
// waited for scripts/consortium-p5-seams-s5b.test.mjs; chunk 5 points them at state/ and deletes this
// file. (settleLocation, restore.ts, holds one location lookup through the chunk load and the settle
// with lookingThrough(…), lookups.ts.)
export { zoneOf } from '../../lib/consortium/index.ts';
export { pendingClimate, restoring, shareState, watchStore } from './state/persist.ts';
export { notices, restore } from './state/restore.ts';
export { startMemory } from './state/arrival.ts';
export { backToConsortium, canGoBack, changeSite, chooseClimate, chooseCountry, cropExamples, pickingCountry, startEmpty, startOver } from './state/draft.ts';
export { pendingSuggest, requestSuggest, waited } from './state/suggest-wait.ts';
