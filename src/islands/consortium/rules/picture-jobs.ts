// The jobs' membership (v14 boards MainMore, PaletteMore, Many, ManyDesk; review c2 R1): per job, the
// members doing it that count toward its holes and thin spots, and those doing it outside their climate
// range, apart. One rule for the row's head, its names and its strip: `counts` is the holes' rule (a
// member counts when it is not outside its climate range, holes.ts laneCounts), so "Feeds you 1 plant"
// stands beside the thin strip of that one plant, never "3 plants" beside "Thin: 1 plant only…". The
// view reads these rows and never filters the members again. Pure; palette order.
import type { JobId, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { jobIds, jobsOf } from '../../../lib/consortium/index.ts';

export interface JobMembers { job: JobId; counted: PlantId[]; outside: PlantId[] }

export function jobMembers(members: readonly Taxon[], counts: (t: Taxon) => boolean = () => true): JobMembers[] {
  const rows = new Map<JobId, JobMembers>(jobIds.map((job) => [job, { job, counted: [], outside: [] }]));
  for (const t of members) {
    const ok = counts(t);
    for (const j of jobsOf(t)) (ok ? rows.get(j)!.counted : rows.get(j)!.outside).push(t.id);
  }
  return [...rows.values()];
}
