/** @jsxImportSource preact */
// The jobs picture (board MainMore "Jobs"): what the plants do for the plot, and for how long, one row
// per job over the seven time steps; an empty judged place is a hole button opening its fillers.
import { useMemo } from 'preact/hooks';
import { jobsPicture } from '../../rules/picture-jobs.ts';
import { nameOf, T } from '../../strings.ts';
import { Chart } from '../kit/chart.tsx';
import type { PictureProps } from './Years.tsx';

export function JobsPicture({ members, holes, holeWords, onHole, onPlant, verdictOf }: PictureProps) {
  const picture = useMemo(() => jobsPicture({ members, holes, nameOf }), [members, holes]);
  return <Chart picture={picture} intro={T('palette.jobsIntro')} holeWords={holeWords} onHole={onHole} onPlant={onPlant} verdictOf={verdictOf} />;
}
