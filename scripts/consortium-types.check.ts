// Compile-time checks of the consortium data types, run by `npm run check` (astro check), never imported.
import type { AgentNames, Interaction } from '../src/lib/consortium/types.ts';

// agent_names (format 3, 2026-10-28): optional or null, names keyed by the 11 site locales only.
export const named: AgentNames = { names: { en: 'agent one', fr: 'agent un', nl: 'agent een' }, sources: ['eppo', 'wikipedia-en'] };
export const without: Pick<Interaction, 'agent_names'>[] = [{}, { agent_names: null }, { agent_names: named }];
// @ts-expect-error a locale outside the 11 is refused
export const outside: AgentNames = { names: { la: 'Erwinia' }, sources: [] };
// @ts-expect-error a name is a string
export const notText: AgentNames = { names: { en: 1 }, sources: [] };
