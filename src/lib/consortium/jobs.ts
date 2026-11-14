// The six plain jobs of a consortium (ported from v1; design check §2: the phase bands are dropped)
// (the stages where nobody does a job moved to holes.ts jobGapsByPhase, PP-B). A job comes
// from the plant's role in the climate (a crop feeds you) or from its accepted functions; functions
// null (not curated yet) gives no function jobs.
import type { FunctionId, JobId, PhaseOrd, Taxon } from './types.ts';
import { jobIds, phases } from './types.ts';

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

// A plant's jobs, each once, in the order of jobIds.
export function jobsOf(taxon: Taxon): JobId[] {
  const own = new Set<JobId>();
  if (taxon.role === 'crop') own.add('feeds_you');
  for (const f of taxon.functions ?? []) if (jobOfFunction[f.function]) own.add(jobOfFunction[f.function]);
  return jobIds.filter((j) => own.has(j));
}

// The phases (0–6) a plant's placement spans, in order; [] when it has none yet.
export function phaseSpan(taxon: Taxon): PhaseOrd[] {
  if (!taxon.phases) return [];
  const from = phases.indexOf(taxon.phases.start), to = phases.indexOf(taxon.phases.end);
  if (from < 0 || to < from) return [];
  const out: PhaseOrd[] = [];
  for (let p = from; p <= to; p++) out.push(p as PhaseOrd);
  return out;
}
