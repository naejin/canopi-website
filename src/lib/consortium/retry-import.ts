// A chunk's import() that a failed fetch does not poison (L4, review; one owner since the 2026-11-14
// simplify pass, for the views' parts (views/lazy.tsx lazyPart, views/later-chunk.ts) and the core's
// rule loaders: verdict, range, mark providers, suggest). Chromium keeps a failed import() or
// modulepreload of a URL failed for the page's life (its module map), so importing it again never
// fetches, and one dropped request on a flaky connection would keep the part closed until Reload.
// After a failure, the next call imports the same hashed file under a fresh URL (?retry=n), named in
// the error of the failed import (Chromium and Firefox name the URL; where the error names none, or a file
// outside the site's /_astro/ chunks, the next call imports it plainly and fails again: the page then
// says so, with Reload). This mends the chunk itself only: its static imports keep their plain URLs (a
// sheet chunk imports nothing but first-run modules: E6-5d; the future and pool parts and the verdict
// chunk statically import the range rule's chunk (the verdict chunk the shared future chunk too), so
// were that one to fail every retry fails, Reload the fix: store.ts verdictNeedsReload (set when a
// retry fails yet the verdict file itself answers) then offers Reload in place of the verdict's Try
// again and skips its online retry; were an error to
// name such a dependency, the retry imports that file, which lacks the part: lazyPart counts the
// missing part as a failure, and Download says it, Actions.tsx).
// One attempt at a time, shared by every caller (several parts share one loader: views/later-chunk.ts),
// and the picked value kept once it came, so every call gets the same one and no later call imports a
// second copy under ?retry=n+1. pick: what the caller wants of the module (destructured where only some
// exports are wanted, so Rollup keeps only those of the chunk's facade).
// The site chunk a failed import() names (its plain URL, without ?retry=n), else null.
export const failedChunk = (err: unknown): string | null => {
  const url = /https?:\/\/[^\s'"]+?\.js\b/.exec(String((err as Error)?.message ?? err))?.[0] ?? null;
  return url && /\/_astro\/[\w.-]+\.js$/.test(url) ? url : null;
};
export function retryableImport<M, C>(load: () => Promise<M>, pick: (m: M) => C): () => Promise<C> {
  let url: string | null = null, n = 0, attempt: Promise<C> | null = null;
  return () => (attempt ??= (url === null ? load() : (import(/* @vite-ignore */ `${url}?retry=${++n}`) as Promise<M>))
    .then(pick)
    .catch((err: unknown) => { attempt = null; url ??= failedChunk(err); throw err; }));
}
