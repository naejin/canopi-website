// The jobs picture (plant-palette-architecture 3.4; board MainMore "Jobs"): what the plants do for the
// plot and for how long, one row per job, the seven time steps as columns. An empty judged cell is
// an open job hole. A plant doing several jobs stands in each of their rows; plants with no job
// recorded are a row of their own, counted, never dropped. Pure; words are Lines.
import type { Line } from '../../../lib/consortium/index.ts';
import { jobIds, jobsOf, PHASE_YEARS, spans, yearsLine, yearsOf } from '../../../lib/consortium/index.ts';
import { holeAt, judgedColumn, lane, type Picture } from './picture.ts';
import type { PictureInput } from './picture-years.ts';

export function jobsPicture({ members, holes, nameOf, first }: PictureInput): Picture {
  const columns = PHASE_YEARS.map(([from, to]) => yearsLine(from, to));
  const common = { nameOf, first, at: spans, judged: judgedColumn, years: yearsOf };
  const rows = jobIds.map((j) => lane(j, { key: `consortium.job.${j}`, vars: {} }, members.filter((t) => jobsOf(t).includes(j)), columns.length, {
    ...common, holeAt: (c: number) => holeAt(holes, (h) => h.kind === 'job' && h.job === j, c),
  }));
  const none = members.filter((t) => !jobsOf(t).length);
  const head = (key: string, count?: number): Line => ({ key: `consortium.palette.${key}`, vars: {}, ...(count === undefined ? {} : { count }) });
  if (none.length) rows.push(lane('none', head('jobs.none'), none, columns.length, { ...common, holeAt: () => null, state: 'not-recorded' }));
  const open = holes.filter((h) => h.kind === 'job' && h.state === 'open').length;
  return {
    title: 'consortium.palette.jobs.title', columns, rows,
    summary: [head('jobs.summary', members.length), head('jobs.holes', open)],
    names: Object.fromEntries(members.map((t) => [t.id, nameOf(t)])),
  };
}
