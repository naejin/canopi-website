// A name as search compares it, the same for names and the query (one owner, E6 design check A9; its
// callers: Add and Paste through data/search.ts, then Start's crop search and the plant list's filter
// in stream K1): lower case; ß, œ and æ written out (Weißdorn = weissdorn, cœur = coeur); combining
// marks removed only after a Latin, Greek or Cyrillic letter (é = e, ё = е, ά = α), then composed
// again (NFC), so a mark that makes another letter stays: Korean syllables are not split into jamo
// (배 is no prefix of 백합) and kana keep their voicing (ばら is not はら). A leaf: it imports nothing.
const MARKED = /([\p{Script=Latin}\p{Script=Greek}\p{Script=Cyrillic}])\p{M}+/gu;
const WRITTEN_OUT: Record<string, string> = { ß: 'ss', œ: 'oe', æ: 'ae' };
export const fold = (text: string): string =>
  text.toLowerCase().replace(/[ßœæ]/g, (c) => WRITTEN_OUT[c]).normalize('NFD').replace(MARKED, '$1').normalize('NFC');
