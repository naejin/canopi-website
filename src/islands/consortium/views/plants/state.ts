// Your plants' own state at scale (v14 pf-e; boards Many, ManyDesk): the ticks, the search, the sort,
// the grouping and each group's fold, as signals (never saved). Ticks stay when the reader searches,
// sorts or regroups (board Many's foot); a tick on a plant no longer in the palette is dropped (ticked()
// prunes to the members). The ticks belong to the many form, so their life follows the state, never a
// component's mount (a layout crossing 960 px, Find in place, keeps them: round 2 R1): they go when the
// palette has 40 plants or fewer (Start over too) and when a palette is opened (R9). "Tick these" on Warnings
// and fit (Weigh.tsx) ticks a reason's plants here and shows them (tickAndShow). Remove acts on the
// ticked plants at once (store.removeMembers: one Undo).
import { computed, effect, signal } from '@preact/signals';
import type { PlantId } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import type { GroupKey, SortKey } from './model.ts';
import { SIZE_PALETTE } from '../kit/chart.tsx';

const ticks = signal<ReadonlySet<PlantId>>(new Set());
// The ticked plants still in the palette, in the palette's order.
export const ticked = computed<PlantId[]>(() => { const t = ticks.value; return t.size ? store.members.value.filter((id) => t.has(id)) : []; });
export const isTicked = (id: PlantId): boolean => ticks.value.has(id) && store.members.value.includes(id);
export function setTick(id: PlantId, on: boolean): void {
  const next = new Set(ticks.peek());
  if (on) next.add(id); else next.delete(id);
  ticks.value = next;
}
export function tickIds(ids: readonly PlantId[], on = true): void {
  const next = new Set(ticks.peek());
  for (const id of ids) if (on) next.add(id); else next.delete(id);
  ticks.value = next;
}
export const clearTicks = (): void => { if (ticks.peek().size) ticks.value = new Set(); };
// The many form gone (the same count YourPlants switches on), or a palette being opened: no ticks.
effect(() => { if (store.memberTaxa.value.length <= SIZE_PALETTE || store.opening.value) clearTicks(); });
// Plants to show in Your plants: ManyPlants opens the groups that hold them, then (focus) moves the
// focus to the tick bar's Remove, as a mail client's bulk select hands it to the list's toolbar (R2).
export const reveal = signal<{ ids: readonly PlantId[]; focus: boolean } | null>(null);
// "Tick these N" (Weigh.tsx): the plants ticked, their rows shown, the focus on Remove. `pressed` names
// the reason whose button did it, with the ticks it left: its status shows on that reason only, until
// the ticks change (any tick, Remove, Undo; round 2 C3).
export const pressed = signal<{ key: string; at: ReadonlySet<PlantId> } | null>(null);
export function tickAndShow(ids: readonly PlantId[], key = ''): void {
  tickIds(ids);
  pressed.value = { key, at: ticks.peek() };
  reveal.value = { ids, focus: true };
}
export const saidFor = (key: string): boolean => { const p = pressed.value; return !!p && p.key === key && p.at === ticks.value; };
// Remove the ticked plants (one Undo); the ticks go with them.
export function removeTicked(): void {
  const ids = ticked.peek();
  if (!ids.length) return;
  clearTicks();
  store.removeMembers(ids);
}

export const query = signal('');
export const sortKey = signal<SortKey>('fit');
export const groupKey = signal<GroupKey>('light');
// Each group's fold stage (0 closed, 1 its first 10, 2 all), by group key; a new grouping starts closed.
export const stages = signal<ReadonlyMap<string, 0 | 1 | 2>>(new Map());
export function setStage(key: string, stage: 0 | 1 | 2): void { const m = new Map(stages.peek()); m.set(key, stage); stages.value = m; }
export function setGroup(key: GroupKey): void { groupKey.value = key; stages.value = new Map(); }

// Your plants in its many form (ManyPlants mounted, past 40 plants): the place line's "200 plants: Your
// plants" link (head-link.tsx) shows only then, so it follows the list's own form, never a second threshold.
export const manyShown = signal(false);

// 960 px and wider: the table (board ManyDesk); under it, the list (board Many).
const wideQuery = typeof matchMedia === 'function' ? matchMedia('(min-width: 960px)') : null;
export const wide = signal(!!wideQuery?.matches);
wideQuery?.addEventListener('change', (e) => { wide.value = e.matches; });
