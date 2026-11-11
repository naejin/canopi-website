// The six plain jobs of a consortium (ported from v1; design check §2: the phase bands are dropped)
// and, new in v2, the stages where nobody does a job (the Jobs table names them, BT-4). A job comes
// from the plant's role in the climate (a crop feeds you) or from its accepted functions; functions
// null (not curated yet) gives no function jobs.
import type { FunctionId, JobGap, JobId, PhaseOrd, PlantId, Taxon } from './types.ts';
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

const ALL_PHASES: readonly PhaseOrd[] = [0, 1, 2, 3, 4, 5, 6];

// For each job, in order: the members that do it and the phases where none of them grows. A member
// with no placement yet does its job in no phase.
export function jobGapsByPhase(members: Taxon[]): JobGap[] {
  const doers = new Map<JobId, PlantId[]>(jobIds.map((j) => [j, []]));
  const covered = new Map<JobId, Set<PhaseOrd>>(jobIds.map((j) => [j, new Set()]));
  for (const t of members) {
    const span = phaseSpan(t);
    for (const j of jobsOf(t)) {
      doers.get(j)!.push(t.id);
      for (const p of span) covered.get(j)!.add(p);
    }
  }
  return jobIds.map((job) => ({ job, members: doers.get(job)!, missing: ALL_PHASES.filter((p) => !covered.get(job)!.has(p)) }));
}
