// The components every guide's MDX can use without importing them (the guide layout passes this map
// to <Content components>). The contract for writers: knowledge/references/field-guide-components.md.
// Guide-specific diagrams in diagrams/<slug>/<Name>.astro join the map under their file name.
import QuickAnswer from './QuickAnswer.astro';
import Term from './Term.astro';
import TermNote from './TermNote.astro';
import Note from './Note.astro';
import Safety from './Safety.astro';
import FoodCaution from './FoodCaution.astro';
import HisGarden from './HisGarden.astro';
import ForClimate from './ForClimate.astro';
import Invasive from './Invasive.astro';
import Steps from './Steps.astro';
import Step from './Step.astro';
import CropCard from './CropCard.astro';
import CropCards from './CropCards.astro';
import CropTable from './CropTable.astro';
import CropExplorer from './CropExplorer.astro';
import PollinationBadge from './PollinationBadge.astro';
import PlantingMixBar from './PlantingMixBar.astro';
import Checklist from './Checklist.astro';
import Item from './Item.astro';
import Figure from './Figure.astro';
import Columns from './Columns.astro';
import Card from './Card.astro';
import Points from './Points.astro';
import NextGuides from './NextGuides.astro';
import TryConsortium from './TryConsortium.astro';
import SeasonTimeline from './diagrams/SeasonTimeline.astro';
import YearsTimeline from './diagrams/YearsTimeline.astro';
import PlotDiagram from './diagrams/PlotDiagram.astro';
import FlowerDiagram from './diagrams/FlowerDiagram.astro';

const shared = {
  QuickAnswer,
  Term,
  TermNote,
  Note,
  Safety,
  FoodCaution,
  HisGarden,
  ForClimate,
  Invasive,
  Steps,
  Step,
  CropCard,
  CropCards,
  CropTable,
  CropExplorer,
  PollinationBadge,
  PlantingMixBar,
  Checklist,
  Item,
  Figure,
  Columns,
  Card,
  Points,
  NextGuides,
  TryConsortium,
  SeasonTimeline,
  YearsTimeline,
  PlotDiagram,
  FlowerDiagram,
};

const own = Object.entries(import.meta.glob<{ default: unknown }>('./diagrams/*/*.astro', { eager: true })).map(([path, mod]) => {
  const name = path.match(/\/([A-Z]\w*)\.astro$/)?.[1];
  if (!name) throw new Error(`${path}: a guide diagram's file name is its component name, in PascalCase`);
  if (name in shared) throw new Error(`${path}: "${name}" is already a shared guide component`);
  return [name, mod.default] as const;
});
const names = own.map(([name]) => name);
const twice = names.find((name, i) => names.indexOf(name) !== i);
if (twice) throw new Error(`src/components/guides/diagrams: two guides define <${twice}>; prefix one with its guide`);

export const guideComponents: Record<string, unknown> = { ...shared, ...Object.fromEntries(own) };
