// What the consortium tool keeps and restores, and how it opens: split by E6 S2 into
// state/persist.ts (storage, the save record, the address bar, the store watcher, the restore in
// flight), state/restore.ts (a link, the save, a guide preset, the site location a page brings),
// state/arrival.ts (what the page opens with; startMemory), state/draft.ts (Start's draft and the
// reader's moves around it; the crop examples) and state/suggest-wait.ts (the waiting Suggest and the
// location lookups it waits for). The location step's own state is state/location.ts.
//
// Re-exports only, for the files other streams own and the tests that still import this path; chunk
// 5 points them at state/ and deletes this file. (settleLocation, restore.ts, holds one location
// lookup through the chunk load and the settle with lookingThrough(…), suggest-wait.ts.)
export { zoneOf } from '../../lib/consortium/index.ts';
export { COUNTRY_STORE, SITE_CLIMATE, STORE, currentFragment, guarded, oldRecord, pendingClimate, readRecord, restoring, saveRecord, shareState, shareUrl, shownFragment, watchStore } from './state/persist.ts';
export { applyPreset, notices, restore } from './state/restore.ts';
export { arrival, countryAtStart, guessCountry, hashAction, startMemory } from './state/arrival.ts';
export { backToConsortium, canGoBack, changeSite, chooseClimate, chooseCountry, cropExamples, pickingCountry, plantName, startEmpty, startOver } from './state/draft.ts';
export { pendingSuggest, requestSuggest, waited } from './state/suggest-wait.ts';
