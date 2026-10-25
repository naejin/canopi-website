// How a crop row reads in a guide's language: the shared wording of CropCard, CropTable and the explorer.
import type { Crop } from '../../data/crops';
import { gt, type GuideLang } from '../../i18n/guides';

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function cropText(crop: Crop, lang: GuideLang) {
  // Pollination is shown by PollinationBadge, from crop.pollination.
  return {
    name: crop.name[lang],
    examples: crop.examples?.[lang],
    crossing: crop.crossing ? cap(crop.crossing.text[lang]) : null,
    life: crop.life ? [gt(`life.${crop.life.cycle}`, lang), crop.life.note?.[lang]].filter(Boolean).join(', ') : null,
    seed: crop.seed ? gt(`seed.${crop.seed}`, lang) : null,
    ease: crop.ease ? [gt(`ease.${crop.ease}`, lang), crop.easeNote?.[lang]].filter(Boolean).join(', ') : null,
    hybrids: crop.cms ? [gt(`crop.cms.${crop.cms}`, lang), crop.cmsNote?.[lang]].filter(Boolean).join(' ') : null,
    flagged: crop.cms === 'high' || crop.cms === 'flagged',
    note: crop.note?.[lang],
    tip: crop.tip?.[lang],
  };
}
