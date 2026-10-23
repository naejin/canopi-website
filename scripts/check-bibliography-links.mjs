// Visits every edition link in src/data/bibliography.md and lists the ones that no longer lead to their book.
// Run it by hand (npm run check:bibliography) before adding books and now and then: it needs the network,
// and publishers' sites come and go, so it is not part of npm test.
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/data/bibliography.md', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const editions = [...source.matchAll(/^- ([a-z]{2,3}): \[(.+?)\]\((https?:\/\/[^)\s]+)\)/gm)].map(([, lang, title, url]) => ({ lang, title, url }));
// Some publishers turn away anything that does not look like a browser.
const headers = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  'accept-language': 'en,fr;q=0.8',
};

// Whether a page title holds the first words of the book's title, ignoring case, accents and punctuation.
const words = (text) => text.replace(/&#0?39;|&apos;/g, "'").normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
const namesBook = (pageTitle, title) => words(pageTitle).join(' ').includes(words(title.split(/:|：/)[0]).slice(0, 3).join(' '));

async function check({ lang, title, url }) {
  try {
    const response = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(20000) });
    // Some pages are not UTF-8 (Tsukiji Shokan is Shift_JIS): read them in the charset they declare.
    const bytes = Buffer.from(await response.arrayBuffer());
    const charset = (response.headers.get('content-type') ?? '').match(/charset=([\w-]+)/i)?.[1]
      ?? bytes.toString('latin1').match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ?? 'utf-8';
    let html;
    try { html = new TextDecoder(charset).decode(bytes); } catch { html = bytes.toString('utf8'); }
    const pageTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1].replace(/\s+/g, ' ').trim() ?? '';
    // 401, 403 and 429 are bot walls, not missing pages: those links are for a person to open.
    if ([401, 403, 429].includes(response.status)) return { lang, title, url, problem: '', pageTitle: '', walled: `HTTP ${response.status}, refuses robots: open it in a browser` };
    // Google Books answers an ISBN it does not hold with some other book, so its page must name ours.
    const problem = !response.ok ? `HTTP ${response.status}`
      : url.includes('books.google.') && !namesBook(pageTitle, title) ? `Google Books shows another book: ${pageTitle}`
      : '';
    return { lang, title, url, problem, pageTitle };
  } catch (error) {
    return { lang, title, url, problem: error.name === 'TimeoutError' ? 'no answer in 20 s' : error.message, pageTitle: '' };
  }
}

const results = [];
// A few at a time, so no site sees a burst.
for (let i = 0; i < editions.length; i += 4) results.push(...await Promise.all(editions.slice(i, i + 4).map(check)));

for (const { lang, title, url, problem, pageTitle, walled } of results) {
  console.log(`${problem ? '✗' : walled ? '?' : '✓'} ${lang} ${title.split(':')[0]}\n    ${url}\n    ${problem || walled || pageTitle}`);
}
const broken = results.filter((result) => result.problem);
const walled = results.filter((result) => result.walled);
console.log(`\n${results.length - broken.length - walled.length} of ${results.length} links answer; check that each page title above names its book.`);
if (walled.length) console.log(`${walled.length} (marked ?) turn robots away; open them in a browser.`);
if (broken.length) console.log(`${broken.length} (marked ✗) are broken.`);
if (broken.length) process.exitCode = 1;
