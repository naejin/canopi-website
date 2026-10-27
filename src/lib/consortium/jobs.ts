// The six plain jobs of a consortium and the three phase bands of the "Over time" view. A job comes
// from the taxon's role (a crop feeds you) or from its accepted functions; functions: null (not
// curated yet) gives no function jobs.
import type { FunctionId, Phase, Taxon } from './types.ts';
import { phases } from './types.ts';

export const jobs = ['feeds_you', 'feeds_soil', 'mulch', 'ground', 'helpers', 'shelter'] as const;
export type JobId = (typeof jobs)[number];

export const jobOfFunction: Record<FunctionId, JobId> = {
  nitrogen_fixer: 'feeds_soil',
  mulch: 'mulch',
  dynamic_accumulator: 'mulch',
  ground_cover: 'ground',
  insectary: 'helpers',
  pollinator_forage: 'helpers',
  windbreak: 'shelter',
  pest_repellent: 'shelter',
  trap_crop: 'shelter',
  wildlife_habitat: 'shelter',
};

// A taxon's jobs, each once, in the order of `jobs`.
export function jobsOf(taxon: Taxon): JobId[] {
  const own = new Set<JobId>();
  if (taxon.role === 'crop') own.add('feeds_you');
  for (const f of taxon.functions ?? []) if (jobOfFunction[f.function]) own.add(jobOfFunction[f.function]);
  return jobs.filter((j) => own.has(j));
}

// Early is the placenta phases, middle secondary I–II, mature secondary III and climax.
export const phaseBands = ['early', 'middle', 'mature'] as const;
export type PhaseBand = (typeof phaseBands)[number];

export function bandOf(phase: Phase): PhaseBand {
  if (phase.startsWith('placenta_')) return 'early';
  return phase === 'secondary_i' || phase === 'secondary_ii' ? 'middle' : 'mature';
}

// The bands a taxon's phase range touches, in order; [] when its phases are not known yet.
export function bandsOf(taxon: Taxon): PhaseBand[] {
  if (!taxon.phases) return [];
  const from = phases.indexOf(taxon.phases.start), to = phases.indexOf(taxon.phases.end);
  if (from < 0 || to < from) return [];
  const touched = new Set(phases.slice(from, to + 1).map(bandOf));
  return phaseBands.filter((b) => touched.has(b));
}
