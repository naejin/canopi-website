// F1a seam (commit 0; A24): the Start screen's timing mark. Start.tsx (stream 1's file) calls markStart()
// on every render of the Start form (a plain call, so the build drops it while it is empty); stream 5
// (perf1, chunk 1) implements it: performance.mark('ct:start') once per page, after the form is painted
// and ready for a first visit (perf1 picks the moment and the timing script
// reads it beside ct:first-view, which stays in stream 1's kit first-view module). Today's behaviour
// until then: nothing is marked.
export function markStart(): void {}
