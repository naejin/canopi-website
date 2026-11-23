// What changed between two states of a picture, in words (plant-palette-architecture 3.4): the year
// stepper (one time step to the next) and the period switch announce it through the polite status
// region (F1a-A2; marker P8). Pure. Empty when nothing a grower reads changed.
//
// - Another time step: its years, then how many plants stand there and how many places are empty.
// - The same steps: the plants and the empty places, each only when its count changed.
import type { Line } from '../../../lib/palette/index.ts';
import { holesIn, plantsIn, type Picture } from './picture.ts';

const L = (key: string, count: number): Line => ({ key: `consortium.palette.change_${key}`, vars: {}, count });

export function changeSummary(before: Picture, after: Picture): Line[] {
  const moved = JSON.stringify(before.columns) !== JSON.stringify(after.columns);
  const plants = [plantsIn(before).size, plantsIn(after).size], holes = [holesIn(before).length, holesIn(after).length];
  const out: Line[] = moved ? [...after.columns] : [];
  if (moved || plants[0] !== plants[1]) out.push(L('plants', plants[1]));
  if (moved || holes[0] !== holes[1]) out.push(L('holes', holes[1]));
  return out;
}
