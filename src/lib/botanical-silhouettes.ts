// Shared botanical contour silhouettes, proportional 1.75 m person, canopy-derived
// light bands, and CJK-safe horizontal label wrapping.
// Pure TypeScript (no DOM/Preact imports) so it is reused by A2 Elevation,
// A7 Herbarium Dossier, Wave 4 A8 Plan timeline, and Node unit tests.

export type HabitSilhouetteKind =
  | 'round_tree'
  | 'columnar_tree'
  | 'spreading_tree'
  | 'shrub'
  | 'herb'
  | 'grass'
  | 'vine'
  | 'groundcover';

export const HABIT_SILHOUETTE_KINDS: readonly HabitSilhouetteKind[] = [
  'round_tree',
  'columnar_tree',
  'spreading_tree',
  'shrub',
  'herb',
  'grass',
  'vine',
  'groundcover',
] as const;

interface SilhouetteLeaf {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rot?: number;
}

interface SilhouetteGeometry {
  rootHintD: string | null;
  stemD: string | null;
  stemWidth: number;
  crownD: string | null;
  crownFill: boolean;
  crownStrokeWidth: number;
  leaves?: SilhouetteLeaf[];
  tipDot?: { cx: number; cy: number; r: number };
}

interface PersonGeometry {
  compact: boolean;
  head?: { cx: number; cy: number; r: number };
  torsoD?: string;
  leftLeg?: [number, number, number, number];
  rightLeg?: [number, number, number, number];
  line?: [number, number, number, number];
}

interface ElevationSlotInput {
  kind: HabitSilhouetteKind;
  heightM: number | null;
  cx: number;
  plantW: number;
}

interface CanopyLightBands {
  hasTreeCanopy: boolean;
  canopyBaseM: number;
  shrubTopM: number;
  shadeLeftX: number;
  shadeRightX: number;
}

const CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;

function f(n: number): string {
  return n.toFixed(1);
}

/** Classify a plant's habit and mature aspect ratio into one of the 8 contour forms. */
export function classifyHabitSilhouette(
  habit: string | null | undefined,
  heightM: number | null | undefined,
  widthM: number | null | undefined,
): HabitSilhouetteKind {
  const h = (habit ?? '').toLowerCase();
  if (h.includes('climb') || h.includes('vine') || h.includes('liana')) return 'vine';
  if (h.includes('ground') || h.includes('prostrate') || h.includes('creeping') || h.includes('mat')) return 'groundcover';
  if (h.includes('grass') || h.includes('bamboo') || h.includes('sedge') || h.includes('rush') || h.includes('graminoid')) return 'grass';
  if (h.includes('tree') || h.includes('palm') || h.includes('conifer')) {
    if (h.includes('column') || h.includes('fastigiate') || h.includes('cypress') || h.includes('conifer') || h.includes('palm')) {
      return 'columnar_tree';
    }
    if (h.includes('spread') || h.includes('umbrella') || h.includes('broad') || h.includes('weeping')) {
      return 'spreading_tree';
    }
    if (heightM != null && widthM != null && heightM > 0) {
      const ratio = widthM / heightM;
      if (heightM >= 5 && ratio <= 0.42) return 'columnar_tree';
      if (heightM >= 4 && ratio >= 0.95) return 'spreading_tree';
    }
    return 'round_tree';
  }
  if (h.includes('shrub') || h.includes('bush') || h.includes('subshrub') || h.includes('cane')) return 'shrub';
  return 'herb';
}

/** Build contour crown, stem/trunk, and subtle soil-line root hint SVG geometry. */
export function buildSilhouetteGeometry(
  kind: HabitSilhouetteKind,
  cx: number,
  soilY: number,
  plantH: number,
  plantW: number,
  includeRootHint = true,
): SilhouetteGeometry {
  const rW = Math.max(8, plantW / 2);
  const topY = soilY - plantH;
  const rootHintD = includeRootHint
    ? `M${f(cx)} ${f(soilY)} Q${f(cx - rW * 0.25)} ${f(soilY + 5)} ${f(cx - rW * 0.42)} ${f(soilY + 8)} M${f(cx)} ${f(soilY)} L${f(cx)} ${f(soilY + 9)} M${f(cx)} ${f(soilY)} Q${f(cx + rW * 0.25)} ${f(soilY + 5)} ${f(cx + rW * 0.42)} ${f(soilY + 8)}`
    : null;

  if (kind === 'columnar_tree') {
    const rx = Math.max(6, Math.min(rW, plantH * 0.22));
    const trunkTop = soilY - plantH * 0.28;
    return {
      rootHintD,
      stemD: `M${f(cx)} ${f(soilY)} L${f(cx)} ${f(trunkTop)}`,
      stemWidth: Math.max(1.6, Math.min(2.8, plantH * 0.032)),
      crownD: `M${f(cx - rx * 0.78)} ${f(soilY - plantH * 0.14)} C${f(cx - rx * 1.05)} ${f(soilY - plantH * 0.48)}, ${f(cx - rx * 0.65)} ${f(soilY - plantH * 0.82)}, ${f(cx)} ${f(topY)} C${f(cx + rx * 0.65)} ${f(soilY - plantH * 0.82)}, ${f(cx + rx * 1.05)} ${f(soilY - plantH * 0.48)}, ${f(cx + rx * 0.78)} ${f(soilY - plantH * 0.14)} Q${f(cx)} ${f(soilY - plantH * 0.08)} ${f(cx - rx * 0.78)} ${f(soilY - plantH * 0.14)} Z`,
      crownFill: true,
      crownStrokeWidth: 1.6,
    };
  }

  if (kind === 'spreading_tree') {
    const rx = Math.max(14, rW * 1.08);
    const trunkTop = soilY - plantH * 0.56;
    const baseY = soilY - plantH * 0.42;
    return {
      rootHintD,
      stemD: `M${f(cx)} ${f(soilY)} L${f(cx)} ${f(trunkTop)} M${f(cx)} ${f(soilY - plantH * 0.36)} L${f(cx - rx * 0.48)} ${f(soilY - plantH * 0.56)} M${f(cx)} ${f(soilY - plantH * 0.38)} L${f(cx + rx * 0.48)} ${f(soilY - plantH * 0.56)}`,
      stemWidth: Math.max(1.8, Math.min(3.2, plantH * 0.038)),
      crownD: `M${f(cx - rx)} ${f(baseY)} C${f(cx - rx * 1.05)} ${f(soilY - plantH * 0.84)}, ${f(cx - rx * 0.42)} ${f(topY)}, ${f(cx)} ${f(topY + 2)} C${f(cx + rx * 0.42)} ${f(topY)}, ${f(cx + rx * 1.05)} ${f(soilY - plantH * 0.84)}, ${f(cx + rx)} ${f(baseY)} Q${f(cx)} ${f(baseY + plantH * 0.1)} ${f(cx - rx)} ${f(baseY)} Z`,
      crownFill: true,
      crownStrokeWidth: 1.6,
    };
  }

  if (kind === 'round_tree') {
    const rx = Math.max(10, rW * 0.92);
    const trunkTop = soilY - plantH * 0.54;
    const cy = soilY - plantH * 0.64;
    const ry = Math.max(8, plantH * 0.36);
    return {
      rootHintD,
      stemD: `M${f(cx)} ${f(soilY)} L${f(cx)} ${f(trunkTop)} M${f(cx)} ${f(soilY - plantH * 0.4)} L${f(cx - rx * 0.35)} ${f(soilY - plantH * 0.55)} M${f(cx)} ${f(soilY - plantH * 0.43)} L${f(cx + rx * 0.35)} ${f(soilY - plantH * 0.57)}`,
      stemWidth: Math.max(1.8, Math.min(3.2, plantH * 0.036)),
      crownD: `M${f(cx - rx * 0.86)} ${f(cy + ry * 0.36)} C${f(cx - rx * 1.12)} ${f(cy - ry * 0.28)}, ${f(cx - rx * 0.6)} ${f(cy - ry * 1.04)}, ${f(cx)} ${f(topY)} C${f(cx + rx * 0.6)} ${f(cy - ry * 1.04)}, ${f(cx + rx * 1.12)} ${f(cy - ry * 0.28)}, ${f(cx + rx * 0.86)} ${f(cy + ry * 0.36)} Q${f(cx)} ${f(cy + ry * 0.66)} ${f(cx - rx * 0.86)} ${f(cy + ry * 0.36)} Z`,
      crownFill: true,
      crownStrokeWidth: 1.6,
    };
  }

  if (kind === 'shrub') {
    const rx = Math.max(10, rW * 0.92);
    return {
      rootHintD,
      stemD: `M${f(cx)} ${f(soilY)} L${f(cx - rx * 0.32)} ${f(soilY - plantH * 0.48)} M${f(cx)} ${f(soilY)} L${f(cx)} ${f(soilY - plantH * 0.56)} M${f(cx)} ${f(soilY)} L${f(cx + rx * 0.32)} ${f(soilY - plantH * 0.48)}`,
      stemWidth: 1.5,
      crownD: `M${f(cx - rx * 0.92)} ${f(soilY - plantH * 0.14)} C${f(cx - rx * 1.05)} ${f(soilY - plantH * 0.65)}, ${f(cx - rx * 0.46)} ${f(topY)}, ${f(cx)} ${f(topY + 2)} C${f(cx + rx * 0.46)} ${f(topY)}, ${f(cx + rx * 1.05)} ${f(soilY - plantH * 0.65)}, ${f(cx + rx * 0.92)} ${f(soilY - plantH * 0.14)} Q${f(cx)} ${f(soilY - plantH * 0.04)} ${f(cx - rx * 0.92)} ${f(soilY - plantH * 0.14)} Z`,
      crownFill: true,
      crownStrokeWidth: 1.6,
    };
  }

  if (kind === 'grass') {
    const sp = Math.max(10, Math.min(26, rW * 0.95));
    return {
      rootHintD,
      stemD: null,
      stemWidth: 1.5,
      crownD: `M${f(cx)} ${f(soilY)} Q${f(cx - sp * 0.35)} ${f(soilY - plantH * 0.65)} ${f(cx - sp)} ${f(soilY - plantH * 0.72)} M${f(cx)} ${f(soilY)} Q${f(cx - sp * 0.22)} ${f(soilY - plantH * 0.78)} ${f(cx - sp * 0.55)} ${f(topY + plantH * 0.06)} M${f(cx)} ${f(soilY)} Q${f(cx + sp * 0.04)} ${f(soilY - plantH * 0.6)} ${f(cx)} ${f(topY)} M${f(cx)} ${f(soilY)} Q${f(cx + sp * 0.22)} ${f(soilY - plantH * 0.78)} ${f(cx + sp * 0.55)} ${f(topY + plantH * 0.06)} M${f(cx)} ${f(soilY)} Q${f(cx + sp * 0.35)} ${f(soilY - plantH * 0.65)} ${f(cx + sp)} ${f(soilY - plantH * 0.72)}`,
      crownFill: false,
      crownStrokeWidth: 1.6,
    };
  }

  if (kind === 'vine') {
    const dx = Math.min(10, rW * 0.45);
    const midY = soilY - plantH * 0.5;
    return {
      rootHintD,
      stemD: null,
      stemWidth: 1.8,
      crownD: `M${f(cx)} ${f(soilY)} C${f(cx - dx)} ${f(soilY - plantH * 0.3)}, ${f(cx + dx)} ${f(soilY - plantH * 0.7)}, ${f(cx)} ${f(topY)}`,
      crownFill: false,
      crownStrokeWidth: 1.8,
      leaves: [
        { cx: cx - 6.5, cy: midY + 6, rx: 5.5, ry: 3, rot: -24 },
        { cx: cx + 6.5, cy: midY - 7, rx: 5.5, ry: 3, rot: 24 },
        { cx, cy: topY + 4, rx: 4.5, ry: 2.8 },
      ],
    };
  }

  if (kind === 'groundcover') {
    const gh = Math.max(6, Math.min(14, plantH));
    const rx = Math.max(13, rW * 1.05);
    return {
      rootHintD,
      stemD: null,
      stemWidth: 1.5,
      crownD: `M${f(cx - rx)} ${f(soilY)} Q${f(cx - rx * 0.55)} ${f(soilY - gh * 1.15)} ${f(cx - rx * 0.12)} ${f(soilY - gh * 0.85)} Q${f(cx)} ${f(soilY - gh * 1.2)} ${f(cx + rx * 0.12)} ${f(soilY - gh * 0.85)} Q${f(cx + rx * 0.55)} ${f(soilY - gh * 1.15)} ${f(cx + rx)} ${f(soilY)} Z`,
      crownFill: true,
      crownStrokeWidth: 1.5,
    };
  }

  // Herb clump
  const sp = Math.max(10, Math.min(26, rW * 0.85));
  return {
    rootHintD,
    stemD: null,
    stemWidth: 1.6,
    crownD: `M${f(cx)} ${f(soilY)} Q${f(cx - sp * 0.72)} ${f(soilY - plantH * 0.58)} ${f(cx - sp)} ${f(soilY - plantH * 0.78)} Q${f(cx - sp * 0.22)} ${f(soilY - plantH * 0.36)} ${f(cx)} ${f(soilY)} M${f(cx)} ${f(soilY)} Q${f(cx + sp * 0.72)} ${f(soilY - plantH * 0.58)} ${f(cx + sp)} ${f(soilY - plantH * 0.78)} Q${f(cx + sp * 0.22)} ${f(soilY - plantH * 0.36)} ${f(cx)} ${f(soilY)} M${f(cx)} ${f(soilY)} L${f(cx)} ${f(topY + 2)}`,
    crownFill: true,
    crownStrokeWidth: 1.6,
    tipDot: { cx, cy: topY + 2, r: 2.2 },
  };
}

/** Proportional 1.75 m human silhouette geometry, identical in Light & Dark. */
export function buildPersonGeometry(cx: number, soilY: number, h: number): PersonGeometry {
  if (h < 10) {
    return { compact: true, line: [cx, soilY - h, cx, soilY] };
  }
  const headR = Math.min(3.2, h * 0.1);
  const headY = soilY - h + headR;
  const shY = headY + headR + 1.5;
  const hipY = soilY - h * 0.44;
  const armW = Math.min(4.2, h * 0.14);
  const legW = Math.min(3.2, h * 0.11);
  return {
    compact: false,
    head: { cx, cy: headY, r: headR },
    torsoD: `M${f(cx - armW)} ${f(shY + 1)} Q${f(cx)} ${f(shY - 1.5)} ${f(cx + armW)} ${f(shY + 1)} L${f(cx + armW * 0.7)} ${f(hipY)} L${f(cx - armW * 0.7)} ${f(hipY)} Z`,
    leftLeg: [cx - legW * 0.5, hipY, cx - legW, soilY],
    rightLeg: [cx + legW * 0.5, hipY, cx + legW, soilY],
  };
}

/**
 * Wrap an elevation species label horizontally into at most 2 lines without truncation.
 * Keeps CJK names <= 9 chars and single Latin/Cyrillic words <= 15 chars intact on one line.
 */
export function wrapElevationLabel(name: string, maxChars = 12): string[] {
  const clean = name.trim();
  if (!clean) return [''];
  if (CJK_RE.test(clean)) {
    if (clean.length <= 9) return [clean];
    const mid = Math.ceil(clean.length / 2);
    return [clean.slice(0, mid), clean.slice(mid)];
  }
  if (clean.length <= maxChars || !clean.includes(' ')) {
    return [clean];
  }
  const idx = clean.lastIndexOf(' ', maxChars);
  if (idx > 0 && clean.length - idx - 1 <= maxChars + 4) {
    return [clean.slice(0, idx), clean.slice(idx + 1)];
  }
  const sp = clean.indexOf(' ');
  return [clean.slice(0, sp), clean.slice(sp + 1)];
}

/**
 * Derive honest light bands from the guild's own tree & shrub canopy.
 * Without a tree layer, returns hasTreeCanopy: false (single Full sun band).
 */
export function computeCanopyLightBands(
  slots: readonly ElevationSlotInput[],
  minX: number,
  maxX: number,
): CanopyLightBands {
  const treeSlots = slots.filter(
    (s) =>
      (s.kind === 'round_tree' || s.kind === 'columnar_tree' || s.kind === 'spreading_tree')
      && s.heightM != null
      && s.heightM > 0,
  );
  if (treeSlots.length === 0) {
    return { hasTreeCanopy: false, canopyBaseM: 0, shrubTopM: 0, shadeLeftX: minX, shadeRightX: minX };
  }
  const tallestTreeM = Math.max(...treeSlots.map((s) => s.heightM!));
  const canopyBaseM = tallestTreeM * 0.42;
  const shrubSlots = slots.filter((s) => s.kind === 'shrub' && s.heightM != null && s.heightM > 0);
  const shrubTopM = shrubSlots.length > 0
    ? Math.min(canopyBaseM * 0.85, Math.max(...shrubSlots.map((s) => s.heightM!)))
    : canopyBaseM * 0.48;
  const shadeLeftX = Math.max(minX, Math.min(...treeSlots.map((s) => s.cx - s.plantW * 0.56)));
  const shadeRightX = Math.min(maxX, Math.max(...treeSlots.map((s) => s.cx + s.plantW * 0.56)));
  return {
    hasTreeCanopy: true,
    canopyBaseM,
    shrubTopM,
    shadeLeftX,
    shadeRightX: Math.max(shadeLeftX + 24, shadeRightX),
  };
}
