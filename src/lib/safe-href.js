// A url from the data as a link target: an absolute http or https url, else null, so the page shows
// the text without a link (prepush m1: the installer refuses other schemes; this is the second wall).
// Plain JavaScript, shared by the consortium tool, /data-sources/ and scripts/check-built-site.mjs.
export function safeHref(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  try { return ['http:', 'https:'].includes(new URL(url).protocol) ? url : null; } catch { return null; }
}
