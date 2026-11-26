/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html SVG visuals:
// - renderBotanicalSilhouette (L2804)
// - renderGuildProfile (L2848)
// - renderWalterLieth (L3476)
// - Dossier Mature Scale & Root SVG (L4056-4098)
// Zero raw hex colours (100% design tokens). Axe-clean accessible SVG controls.
import {
  buildPersonGeometry,
  buildSilhouetteGeometry,
  classifyHabitSilhouette,
  computeCanopyLightBands,
  wrapElevationLabel,
  type HabitSilhouetteKind,
} from '../../../../lib/botanical-silhouettes.ts';
import type { EffectiveSiteClimate, PaletteReport, PlantId, Taxon } from '../../../../lib/palette/index.ts';
import { isStructuralVine, months as MONTHS, vineSupportTree } from '../../../../lib/palette/index.ts';
import { T } from '../../strings.ts';
import { Glyph } from '../kit/Glyph.tsx';
import {
  fmtNum,
  lightSpanLabel,
  pairInteractionLabel,
  photoUrlOf,
  scenarioShort,
  taxCommonName,
  verdictSymbolLabel,
} from './ns-helpers.ts';
import { nsActivePairKey, nsDrawer, nsScenario } from './ns-state.ts';

function habitGlyphFor(taxon: Taxon): 'phase-canopy' | 'phase-shrub' | 'phase-seedling' {
  const h = (taxon.traits.habit ?? '').toLowerCase();
  if (h.includes('tree')) return 'phase-canopy';
  if (h.includes('shrub') || h.includes('bush')) return 'phase-shrub';
  return 'phase-seedling';
}

export function PlantThumb({ taxon, size = 44 }: { taxon: Taxon; size?: number }) {
  const url = photoUrlOf(taxon);
  if (url) {
    return (
      <img
        class="plant-thumb"
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        style={{ width: `${size}px`, height: `${size}px` }}
      />
    );
  }
  const gSize = Math.max(16, Math.round(size * 0.54));
  return (
    <span
      class="plant-thumb plant-thumb-fb"
      aria-hidden="true"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Glyph name={habitGlyphFor(taxon)} size={gSize} />
    </span>
  );
}

/** Shared botanical contour silhouette renderer powered by src/lib/botanical-silhouettes.ts. */
function BotanicalSilhouette({
  kind,
  cx,
  soilY,
  plantH,
  plantW,
  strokeCol,
  fillCol,
  dashed,
  includeRootHint = true,
}: {
  kind: HabitSilhouetteKind;
  cx: number;
  soilY: number;
  plantH: number;
  plantW: number;
  strokeCol: string;
  fillCol: string;
  dashed: boolean;
  includeRootHint?: boolean;
}) {
  const geom = buildSilhouetteGeometry(kind, cx, soilY, plantH, plantW, includeRootHint);
  const dash = dashed ? '4 3' : undefined;
  const op = dashed ? '0.09' : '0.18';

  return (
    <>
      {geom.rootHintD && (
        <path
          d={geom.rootHintD}
          fill="none"
          stroke="var(--soil-2)"
          stroke-width="1.1"
          stroke-linecap="round"
          stroke-dasharray={dash}
          opacity="0.65"
        />
      )}
      {geom.stemD && (
        <path
          d={geom.stemD}
          fill="none"
          stroke="var(--soil-2)"
          stroke-width={geom.stemWidth.toFixed(1)}
          stroke-linecap="round"
          stroke-dasharray={dash}
        />
      )}
      {geom.crownD && (
        <path
          d={geom.crownD}
          fill={geom.crownFill ? fillCol : 'none'}
          fill-opacity={geom.crownFill ? op : undefined}
          stroke={strokeCol}
          stroke-width={geom.crownStrokeWidth.toFixed(1)}
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-dasharray={dash}
        />
      )}
      {geom.leaves?.map((lf, idx) => (
        <ellipse
          key={idx}
          cx={lf.cx.toFixed(1)}
          cy={lf.cy.toFixed(1)}
          rx={lf.rx.toFixed(1)}
          ry={lf.ry.toFixed(1)}
          transform={lf.rot ? `rotate(${lf.rot} ${lf.cx.toFixed(1)} ${lf.cy.toFixed(1)})` : undefined}
          fill={fillCol}
          fill-opacity={op}
          stroke={strokeCol}
          stroke-width="1.3"
          stroke-dasharray={dash}
        />
      ))}
      {geom.tipDot && (
        <circle cx={geom.tipDot.cx.toFixed(1)} cy={geom.tipDot.cy.toFixed(1)} r={geom.tipDot.r.toFixed(1)} fill={strokeCol} />
      )}
    </>
  );
}

/** Shared proportional 1.75 m human silhouette, identical in Light & Dark. */
function PersonSilhouette({ cx, soilY, h }: { cx: number; soilY: number; h: number }) {
  const g = buildPersonGeometry(cx, soilY, h);
  if (g.compact && g.line) {
    return (
      <line
        aria-hidden="true"
        x1={g.line[0].toFixed(1)}
        y1={g.line[1].toFixed(1)}
        x2={g.line[2].toFixed(1)}
        y2={g.line[3].toFixed(1)}
        stroke="var(--text-secondary)"
        stroke-width="2.2"
        stroke-linecap="round"
      />
    );
  }
  return (
    <g aria-hidden="true" fill="var(--text-secondary)" stroke="var(--text-secondary)" stroke-linecap="round" stroke-linejoin="round">
      {g.head && <circle cx={g.head.cx.toFixed(1)} cy={g.head.cy.toFixed(1)} r={g.head.r.toFixed(1)} stroke="none" />}
      {g.torsoD && <path d={g.torsoD} stroke="none" />}
      {g.leftLeg && <line x1={g.leftLeg[0].toFixed(1)} y1={g.leftLeg[1].toFixed(1)} x2={g.leftLeg[2].toFixed(1)} y2={g.leftLeg[3].toFixed(1)} stroke-width="1.9" />}
      {g.rightLeg && <line x1={g.rightLeg[0].toFixed(1)} y1={g.rightLeg[1].toFixed(1)} x2={g.rightLeg[2].toFixed(1)} y2={g.rightLeg[3].toFixed(1)} stroke-width="1.9" />}
    </g>
  );
}

/** Rough rendered SVG text width in px for clamping horizontal labels strictly inside the SVG viewport. */
function estimateTextWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    w += /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(ch) ? fontSize * 1.08 : fontSize * 0.66;
  }
  return w;
}

/** A2 Guild Elevation Profile: botanical contour silhouettes, canopy-derived light bands, horizontal wrapped labels. */
export function GuildProfileSvg({ rep }: { rep: PaletteReport }) {
  if (!rep.taxa.length) return null;
  const activeScenShort = scenarioShort(nsScenario.value);
  const ordered = [...rep.taxa].sort(
    (a, b) => (a.traits.height_m?.max ?? 1) - (b.traits.height_m?.max ?? 1) || taxCommonName(a).localeCompare(taxCommonName(b)),
  );
  const shown = ordered.length <= 10 ? ordered : ordered.filter((_, i) => i % Math.ceil(ordered.length / 10) === 0).slice(0, 10);
  const maxH = Math.max(3, ...shown.map((p) => p.traits.height_m?.max ?? 0));
  const maxRoomM = rep.eff.roomLimitM;
  const scaleTopM = Math.max(maxH, maxRoomM != null && maxH <= maxRoomM * 1.4 ? maxRoomM + 1 : 0);
  const hasAnyTree = shown.some((p) => {
    const k = classifyHabitSilhouette(p.traits.habit, p.traits.height_m?.max ?? null, p.traits.width_max_m ?? null);
    return k === 'round_tree' || k === 'columnar_tree' || k === 'spreading_tree';
  });
  const anyTallerThanRoom = maxRoomM != null && shown.some((p) => {
    const h = isStructuralVine(p) ? (vineSupportTree(p, rep.taxa)?.traits.height_m?.max ?? null) : (p.traits.height_m?.max ?? null);
    return h != null && h > maxRoomM;
  });
  const W = 780, soilY = 148, aboveH = 114, leftPad = 136, rightPad = hasAnyTree ? 106 : 22;
  const plotLeft = 78;
  const topY = soilY - aboveH;
  const pxPerM = aboveH / scaleTopM;
  const humanH = Math.min(58, Math.max(12, 1.75 * pxPerM));
  const roomLineY = maxRoomM != null && maxRoomM <= scaleTopM ? (soilY - maxRoomM * pxPerM) : null;
  const slotW = (W - leftPad - rightPad) / Math.max(1, shown.length);
  const staggerRows = shown.length >= 7 ? 3 : shown.length > 4 ? 2 : 1;
  const tierStep = anyTallerThanRoom ? 58 : 48;
  const H = soilY + 22 + (staggerRows - 1) * tierStep + 56 + (anyTallerThanRoom ? 16 : 0);

  const pairKey = nsActivePairKey.value;
  const activePair = pairKey ? rep.interactions.find((it) => `${it.a}|${it.b}` === pairKey) ?? null : null;
  const posById = new Map<PlantId, { cx: number; topY: number }>();

  const placed = shown.map((p, idx) => {
    const cx = leftPad + (idx + 0.5) * slotW;
    const hVal = p.traits.height_m?.max ?? null;
    const wVal = p.traits.width_max_m ?? null;
    const kind = classifyHabitSilhouette(p.traits.habit, hVal, wVal);
    const pH = hVal != null ? Math.max(10, Math.min(aboveH - 4, hVal * pxPerM)) : 38;
    const pW = wVal != null ? Math.max(16, Math.min(slotW * 0.9, wVal * pxPerM)) : Math.max(18, Math.min(slotW * 0.72, pH * 0.65));
    posById.set(p.id, { cx, topY: soilY - pH });
    return { p, idx, cx, hVal, wVal, kind, pH, pW };
  });

  const bands = computeCanopyLightBands(
    placed.map((x) => ({ kind: x.kind, heightM: x.hVal, cx: x.cx, plantW: x.pW })),
    plotLeft,
    W - 10,
  );
  const yCanopyBase = soilY - bands.canopyBaseM * pxPerM;
  const yShrubTop = soilY - bands.shrubTopM * pxPerM;
  const shadeW = Math.max(24, bands.shadeRightX - bands.shadeLeftX);

  let stressedCount = 0;
  const items = placed.map(({ p, idx, cx, hVal, wVal, kind, pH, pW }) => {
    const v = rep.verdicts.get(p.id);
    const stressed = v != null && v.level !== 'fits';
    if (stressed) stressedCount++;
    const isPartner = activePair != null && (activePair.a === p.id || activePair.b === p.id);
    const col = v?.level === 'fits' ? 'var(--plant-green)' : v?.level === 'check' ? 'var(--accent)' : 'var(--pal-bad)';
    const fullName = taxCommonName(p);
    const lines = wrapElevationLabel(fullName, 12);
    const hTag = hVal != null ? `${fmtNum(hVal)} m` : T('ns.elev.heightUnknown');
    const lightNeed = lightSpanLabel(p);
    const metaText = `${hTag} · ${lightNeed}`;
    const metaLines = wrapElevationLabel(metaText, 22);
    const isVine = isStructuralVine(p);
    const vineSup = isVine ? vineSupportTree(p, rep.taxa) : null;
    const effHForRoom = isVine ? (vineSup ? (vineSup.traits.height_m?.max ?? null) : null) : hVal;
    const tallerNote = maxRoomM != null && effHForRoom != null && effHForRoom > maxRoomM ? T('ns.elev.tallerThanRoom') : null;
    const maxLabelW = Math.max(
      ...lines.map((ln) => estimateTextWidth(ln, 11.5)),
      ...metaLines.map((ml) => estimateTextWidth(ml, 11)),
      tallerNote ? estimateTextWidth(tallerNote, 11) : 0,
    );
    const halfW = maxLabelW / 2;
    const labelX = Math.max(plotLeft + 6 + halfW, Math.min(W - 14 - halfW, cx));
    const tier = staggerRows === 3 ? (idx % 3) : staggerRows === 2 ? (idx % 2) : 0;
    const rowShift = tier * tierStep;
    const baseY = soilY + 22 + rowShift;
    const afterNameY = baseY + (lines.length === 2 ? 25 : 13);
    const open = () => { nsDrawer.value = { kind: 'dossier', id: p.id }; };
    return (
      <g key={p.id}>
        <g
          class="guild-sil-btn"
          role="button"
          tabIndex={0}
          aria-label={`${fullName} (${hTag} · ${lightNeed} · ${v ? verdictSymbolLabel(v.level) : ''})`}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              open();
            }
          }}
        >
          <title>{`${fullName} (${p.traits.habit ?? T('ns.unknown')} · ${hTag} · ${lightNeed})`}</title>
          {isPartner && (
            <circle cx={cx.toFixed(1)} cy={(soilY - pH * 0.5).toFixed(1)} r={Math.max(14, pW * 0.6).toFixed(1)} fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="3 2" />
          )}
          <BotanicalSilhouette
            kind={kind}
            cx={cx}
            soilY={soilY}
            plantH={pH}
            plantW={pW}
            strokeCol={col}
            fillCol={col}
            dashed={hVal == null || wVal == null}
            includeRootHint
          />
        </g>
        {stressed && v && (
          <g aria-hidden="true">
            <rect x={(cx - 32).toFixed(1)} y={Math.max(4, soilY - pH - 19).toFixed(1)} width="64" height="15" rx="7" fill="var(--surface)" stroke={col} stroke-width="1.2" />
            <text x={cx.toFixed(1)} y={Math.max(15, soilY - pH - 8).toFixed(1)} text-anchor="middle" font-size="11" font-weight="600" fill={v.level === 'check' ? 'var(--pal-warn)' : 'var(--pal-bad)'}>
              {verdictSymbolLabel(v.level)}
            </text>
          </g>
        )}
        {rowShift > 0 && (
          <line aria-hidden="true" x1={cx.toFixed(1)} y1={soilY + 9} x2={labelX.toFixed(1)} y2={baseY - 12} stroke="var(--border-strong)" stroke-width="0.9" stroke-dasharray="2 2" />
        )}
        <text aria-hidden="true" x={labelX.toFixed(1)} y={baseY} text-anchor="middle" font-size="11.5" font-weight="600" fill={isPartner ? 'var(--accent-ink)' : 'var(--text)'}>
          {lines.map((ln, li) => (
            <tspan key={li} x={labelX.toFixed(1)} dy={li === 0 ? 0 : 13}>{ln}</tspan>
          ))}
        </text>
        <text aria-hidden="true" x={labelX.toFixed(1)} y={afterNameY} text-anchor="middle" font-size="11" fill="var(--text-muted)" class="elev-h">
          {metaLines.map((ml, mi) => (
            <tspan key={mi} x={labelX.toFixed(1)} dy={mi === 0 ? 0 : 12}>{ml}</tspan>
          ))}
        </text>
        {tallerNote && (
          <text aria-hidden="true" x={labelX.toFixed(1)} y={afterNameY + metaLines.length * 12 + 1} text-anchor="middle" font-size="11" font-weight="600" fill="var(--accent-ink)">
            {tallerNote}
          </text>
        )}
      </g>
    );
  });

  const pA = activePair ? posById.get(activePair.a) : undefined;
  const pB = activePair ? posById.get(activePair.b) : undefined;
  const midX = pA && pB ? (pA.cx + pB.cx) / 2 : 0;
  const arcY = pA && pB ? Math.max(12, Math.min(pA.topY, pB.topY) - 22) : 0;
  const pairLbl = activePair ? `↔ ${pairInteractionLabel(activePair.positive)}` : '';
  const shadeRightEdge = bands.shadeLeftX + shadeW;
  const partMidY = (yCanopyBase + yShrubTop) / 2;
  const shadeMidY = Math.max(yShrubTop + 1, Math.min(soilY - 2, (yShrubTop + soilY) / 2));
  const shadeTextY = soilY - 4;
  const partTextY = Math.min(partMidY + 4, shadeTextY - 17);
  const shadeCalloutX = shadeRightEdge + 11;

  return (
    <div class="guild-profile-plate">
      <div class="guild-profile-head">
        <span>
          <strong>{T('ns.elev.aria')} ({activeScenShort})</strong> · {T('ns.elev.caption')}
          {ordered.length > shown.length ? ` (10 / ${ordered.length})` : ''}
        </span>
        <span>{T('ns.elev.canopyCaption')}</span>
      </div>
      <div class="guild-profile-scroll" tabIndex={0} role="region" aria-label={T('ns.elev.aria')}>
        <svg
          class="guild-profile-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${T('ns.elev.aria')} (${activeScenShort}): ${shown.length - stressedCount} ${T('ns.verdict.fits')}, ${stressedCount} ${T('ns.verdict.check')}`}
        >
          {/* Canopy-derived light bands: Full sun across open sky; Part shade & Shade strictly under tree crowns */}
          <rect x={plotLeft} y={topY} width={W - plotLeft - 10} height={aboveH} fill="var(--sun-full-bg)" />
          <text x="10" y={(bands.hasTreeCanopy ? (topY + yCanopyBase) / 2 + 4 : topY + aboveH * 0.52).toFixed(1)} font-size="11.5" font-weight="600" fill="var(--sun-full-ink)">
            {T('ns.elev.lightFull')}
          </text>
          {bands.hasTreeCanopy && (
            <>
              <rect x={bands.shadeLeftX.toFixed(1)} y={yCanopyBase.toFixed(1)} width={shadeW.toFixed(1)} height={Math.max(4, yShrubTop - yCanopyBase).toFixed(1)} fill="var(--sun-part-bg)" />
              <rect x={bands.shadeLeftX.toFixed(1)} y={yShrubTop.toFixed(1)} width={shadeW.toFixed(1)} height={Math.max(4, soilY - yShrubTop).toFixed(1)} fill="var(--sun-shade-bg)" />
              <line x1={bands.shadeLeftX.toFixed(1)} y1={yCanopyBase.toFixed(1)} x2={shadeRightEdge.toFixed(1)} y2={yCanopyBase.toFixed(1)} stroke="var(--sun-part)" stroke-width="0.8" stroke-dasharray="2 3" opacity="0.55" />
              <line x1={bands.shadeLeftX.toFixed(1)} y1={yShrubTop.toFixed(1)} x2={shadeRightEdge.toFixed(1)} y2={yShrubTop.toFixed(1)} stroke="var(--sun-shade)" stroke-width="0.8" stroke-dasharray="2 3" opacity="0.55" />
              {/* Callouts sit cleanly beside the shaded patch with short leaders — never across the trunk or on the soil line */}
              <line x1={shadeRightEdge.toFixed(1)} y1={partMidY.toFixed(1)} x2={(shadeRightEdge + 8).toFixed(1)} y2={(partTextY - 3).toFixed(1)} stroke="var(--sun-part-ink)" stroke-width="0.9" opacity="0.7" />
              <text x={shadeCalloutX.toFixed(1)} y={partTextY.toFixed(1)} text-anchor="start" font-size="11" font-weight="600" fill="var(--sun-part-ink)">
                {T('ns.elev.lightPart')}
              </text>
              <line x1={shadeRightEdge.toFixed(1)} y1={shadeMidY.toFixed(1)} x2={(shadeRightEdge + 8).toFixed(1)} y2={(shadeTextY - 3).toFixed(1)} stroke="var(--sun-shade-ink)" stroke-width="0.9" opacity="0.7" />
              <text x={shadeCalloutX.toFixed(1)} y={shadeTextY.toFixed(1)} text-anchor="start" font-size="11" font-weight="600" fill="var(--sun-shade-ink)">
                {T('ns.elev.lightShade')}
              </text>
            </>
          )}

          {/* Soil base */}
          <rect x="0" y={soilY} width={W} height={H - soilY} fill="var(--surface-alt)" rx="4" />
          <line x1="10" y1={soilY} x2={W - 10} y2={soilY} stroke="var(--soil-2)" stroke-width="1.4" />
          <text x="10" y={topY + 12} font-size="11" fill="var(--text-muted)" class="elev-h">{fmtNum(scaleTopM, 0)} m</text>
          <line x1={plotLeft} y1={topY} x2={W - 10} y2={topY} stroke="var(--border)" stroke-dasharray="2 4" stroke-width="1" />
          {roomLineY != null && maxRoomM != null && (
            <>
              <line x1={plotLeft} y1={roomLineY.toFixed(1)} x2={W - 12} y2={roomLineY.toFixed(1)} stroke="var(--accent)" stroke-dasharray="4 3" stroke-width="1.1" />
              <rect x={plotLeft + 4} y={Math.max(2, roomLineY - 15).toFixed(1)} width="112" height="14" rx="3" fill="var(--bg)" opacity="0.92" />
              <text x={plotLeft + 8} y={Math.max(13, roomLineY - 4).toFixed(1)} text-anchor="start" font-size="11" font-weight="600" fill="var(--accent-ink)">
                {T('ns.elev.yourRoom', { m: `${fmtNum(maxRoomM, 0)} m` })}
              </text>
            </>
          )}
          <PersonSilhouette cx={94} soilY={soilY} h={humanH} />
          <text aria-hidden="true" x="94" y={soilY + 20} text-anchor="middle" font-size="11" fill="var(--text-muted)" class="elev-h">1.75 m</text>
          {items}
          {pA && pB && (
            <g aria-hidden="true">
              <path d={`M${pA.cx.toFixed(1)} ${(pA.topY - 2).toFixed(1)} Q${midX.toFixed(1)} ${arcY.toFixed(1)} ${pB.cx.toFixed(1)} ${(pB.topY - 2).toFixed(1)}`} fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3" />
              <rect x={(midX - 58).toFixed(1)} y={Math.max(2, arcY - 8).toFixed(1)} width="116" height="16" rx="8" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.2" />
              <text x={midX.toFixed(1)} y={Math.max(13, arcY + 3).toFixed(1)} text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--accent-ink)">{pairLbl}</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

/** Verbatim port of mockup-v73.html renderWalterLieth (L3476). */
export function WalterLiethSvg({ eff, rep }: { eff: EffectiveSiteClimate; rep: PaletteReport }) {
  const mT = eff.monthlyT;
  const mP = eff.monthlyP;
  if (!mT || !mP || mT.length < 12 || mP.length < 12) {
    return <p class="small muted">{T('ns.atlas.noMonthly')}</p>;
  }
  const W = 520, H = 214, padL = 38, padR = 42, padT = 28, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xOf = (i: number) => padL + (i + 0.5) * (plotW / 12);
  // Standard Walter-Lieth scale: 2:1 (1°C = 2 mm) up to 100 mm (50°C), then true 1:10 compression above 100 mm (1°C = 20 mm).
  // Size the vertical degree span from the site's actual peak rainfall/temp (+2° headroom) so no rain bar ever clamps flat at padT.
  const maxP = Math.max(0, ...mP);
  const maxT = Math.max(40, ...mT);
  const hasOver100 = maxP > 100;
  const precipTopDeg = hasOver100 ? 50 + Math.ceil((maxP - 100) / 100) * 5 + 2 : 50;
  const topDeg = Math.max(50, maxT, precipTopDeg);
  const degSpan = topDeg + 10; // -10°C bottom to topDeg top
  const yOfDeg = (deg: number) => Math.max(padT + 1, Math.min(padT + plotH, padT + plotH - ((deg + 10) / degSpan) * plotH));
  const yTemp = (t: number) => yOfDeg(t);
  const yPrecip = (p: number) => {
    const safeP = Math.max(0, p);
    const deg = safeP <= 100 ? safeP / 2 : 50 + (safeP - 100) / 20;
    return yOfDeg(deg);
  };
  const y100 = yOfDeg(50);
  const yZero = yTemp(0);
  const over100Ticks: number[] = [];
  if (hasOver100) {
    const maxTick = Math.ceil(maxP / 100) * 100;
    let prevY = y100;
    for (let mm = 200; mm <= maxTick; mm += 100) {
      const y = yPrecip(mm);
      if (prevY - y >= 11 || mm === maxTick) {
        if (over100Ticks.length && yPrecip(over100Ticks[over100Ticks.length - 1]) - y < 11) {
          over100Ticks[over100Ticks.length - 1] = mm;
        } else {
          over100Ticks.push(mm);
        }
        prevY = y;
      }
    }
  }

  const activeLabel = scenarioShort(eff.horizon) + (eff.monthlyEst ? ` (${T('ns.est')})` : '');
  const cmpEff = eff.horizon === 'today' ? rep.eff2050 : rep.effToday;
  const cmpLabel = eff.horizon === 'today' ? scenarioShort('y2050') : scenarioShort('today');
  const tPts = mT.map((t, i) => `${xOf(i).toFixed(1)},${yTemp(t).toFixed(1)}`).join(' ');
  const cmpPts = cmpEff.monthlyT && cmpEff.monthlyT.length === 12
    ? cmpEff.monthlyT.map((t, i) => `${xOf(i).toFixed(1)},${yTemp(t).toFixed(1)}`).join(' ')
    : '';

  let maxIdx = 0, minIdx = 0;
  mT.forEach((t, i) => {
    if (t > mT[maxIdx]) maxIdx = i;
    if (t < mT[minIdx]) minIdx = i;
  });

  const winSet = new Set(eff.hemisphere === 'S' ? [5, 6, 7, 8] : [11, 12, 1, 2]);
  const hasDryMonths = mP.some((p, i) => mT[i] > 0 && p < mT[i] * 2);

  return (
    <svg class="wl-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={T('ns.atlas.wlAria')}>
      <line x1={padL} y1={yZero.toFixed(1)} x2={W - padR} y2={yZero.toFixed(1)} stroke="var(--border-strong)" stroke-dasharray="3 3" stroke-width="1" />
      <text x={padL - 5} y={(yZero + 3).toFixed(1)} text-anchor="end" font-size="9" fill="var(--text-muted)">0°</text>
      <text x={padL - 5} y={(yTemp(20) + 3).toFixed(1)} text-anchor="end" font-size="9" fill="var(--text-muted)">20°</text>
      <text x={padL - 5} y={(yTemp(40) + 3).toFixed(1)} text-anchor="end" font-size="9" fill="var(--text-muted)">40°</text>
      <text x={W - padR + 5} y={(yPrecip(40) + 3).toFixed(1)} font-size="9" fill="var(--climate-rain)">40</text>
      <text x={W - padR + 5} y={(yPrecip(80) + 3).toFixed(1)} font-size="9" fill="var(--climate-rain)">80</text>
      <text x={W - padR + 5} y={(y100 + 3).toFixed(1)} font-size="9" fill="var(--climate-rain)">100</text>
      {hasOver100 && (
        <>
          <line x1={padL} y1={y100.toFixed(1)} x2={W - padR} y2={y100.toFixed(1)} stroke="var(--climate-rain)" stroke-dasharray="2 3" stroke-width="0.9" opacity="0.55" />
          {over100Ticks.map((mm) => (
            <text key={mm} x={W - padR + 5} y={(yPrecip(mm) + 3).toFixed(1)} font-size="9" fill="var(--climate-rain)">{mm}</text>
          ))}
        </>
      )}
      <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="var(--border-strong)" />
      {mP.map((p, i) => {
        const x = padL + i * (plotW / 12) + 4;
        const w = plotW / 12 - 8;
        const yP = yPrecip(p);
        const yT = yTemp(mT[i]);
        const yBaseTop = Math.max(y100, yP);
        const hBase = Math.max(2, padT + plotH - yBaseTop);
        const isDry = mT[i] > 0 && p < mT[i] * 2;
        const isOver100 = p > 100 && yP < y100;
        return (
          <g key={i}>
            {isDry && <rect x={x.toFixed(1)} y={yT.toFixed(1)} width={w.toFixed(1)} height={Math.max(2, yP - yT).toFixed(1)} rx="2" fill="var(--accent)" opacity="0.22" />}
            <rect x={x.toFixed(1)} y={yBaseTop.toFixed(1)} width={w.toFixed(1)} height={hBase.toFixed(1)} rx={isOver100 ? '0' : '2'} fill="var(--climate-rain)" fill-opacity="0.38" stroke="var(--climate-rain)" stroke-width="1" />
            {isOver100 && <rect x={x.toFixed(1)} y={yP.toFixed(1)} width={w.toFixed(1)} height={Math.max(2, y100 - yP).toFixed(1)} rx="2" fill="var(--climate-rain)" fill-opacity="0.92" stroke="var(--climate-rain)" stroke-width="1" />}
          </g>
        );
      })}
      {cmpPts && <polyline points={cmpPts} fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-dasharray="4 3" />}
      <polyline points={tPts} fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linejoin="round" />
      <circle cx={xOf(maxIdx).toFixed(1)} cy={yTemp(mT[maxIdx]).toFixed(1)} r="3.5" fill="var(--accent)" />
      <text x={xOf(maxIdx).toFixed(1)} y={Math.max(18, yTemp(mT[maxIdx]) - 7).toFixed(1)} text-anchor="middle" font-size="10" font-weight="600" fill="var(--accent-ink)">{fmtNum(mT[maxIdx], 1)}°</text>
      <circle cx={xOf(minIdx).toFixed(1)} cy={yTemp(mT[minIdx]).toFixed(1)} r="3.5" fill="var(--accent)" />
      <text x={xOf(minIdx).toFixed(1)} y={Math.min(padT + plotH - 4, yTemp(mT[minIdx]) + 13).toFixed(1)} text-anchor="middle" font-size="10" font-weight="600" fill="var(--accent-ink)">{fmtNum(mT[minIdx], 1)}°</text>
      {MONTHS.map((m, i) => {
        const mNum = i + 1;
        const sym = mT[i] < 2 ? '❄' : (eff.isMildWinter && winSet.has(mNum) ? '●' : '');
        return (
          <g key={m}>
            <text x={xOf(i).toFixed(1)} y={H - 17} text-anchor="middle" font-size="10" font-weight="600" fill="var(--text-secondary)">{m[0]}</text>
            {sym && <text x={xOf(i).toFixed(1)} y={H - 5} text-anchor="middle" font-size="9" fill="var(--text-muted)">{sym}</text>}
          </g>
        );
      })}
      <text x={padL} y="13" font-size="10" font-weight="600" fill="var(--accent-ink)">
        — {activeLabel} (°C){cmpPts ? ` · - - ${cmpLabel}` : ''}
      </text>
      <text x={W - padR} y="13" text-anchor="end" font-size="10" font-weight="600" fill="var(--climate-rain)">
        ▮ Rain (mm, 2:1{hasOver100 ? ', 1:10 >100' : ''}){hasDryMonths ? ' · ░ Dry deficit (2T > P)' : ''}
      </text>
    </svg>
  );
}

/** A7 Herbarium Dossier Mature Scale & Root Diagram: shared silhouette + dashed unknown root fan + HTML labels (>=12px at all widths). */
export function ScaleRootSvg({ taxon, roomLimitM }: { taxon: Taxon; roomLimitM: number | null }) {
  const hVal = taxon.traits.height_m?.max ?? null;
  const wVal = taxon.traits.width_max_m ?? null;
  const kind = classifyHabitSilhouette(taxon.traits.habit, hVal, wVal);
  const scaleTopM = Math.max(3, hVal ?? 3, roomLimitM != null && hVal != null && hVal <= roomLimitM * 1.5 ? roomLimitM + 1 : 0);
  const soilY = 110, aboveH = 96, cx = 216;
  const pxPerM = aboveH / scaleTopM;
  const humanH = Math.min(68, Math.max(12, 1.75 * pxPerM));
  const plantH = hVal != null ? Math.max(8, Math.min(aboveH - 4, hVal * pxPerM)) : 48;
  const plantW = wVal != null ? Math.max(16, Math.min(150, wVal * pxPerM)) : Math.max(24, Math.min(82, plantH * 0.65));
  const rootCm = taxon.traits.root_depth_min_cm ?? null;
  const taproot = taxon.traits.taproot_persistent === true;
  const hasRootDepth = rootCm != null;
  const rootDepthPx = hasRootDepth ? Math.max(14, Math.min(40, (rootCm / 150) * 40)) : 36;
  const roomLineY = roomLimitM != null && roomLimitM <= scaleTopM ? (soilY - roomLimitM * pxPerM) : null;

  const heightLabel = hVal != null ? T('ns.elev.heightVal', { m: `${fmtNum(hVal)} m` }) : T('ns.elev.heightUnknown');
  const crownLabel = wVal != null ? T('ns.elev.crownVal', { m: `${fmtNum(wVal)} m` }) : T('ns.elev.crownUnknown');
  const rootLabel = hasRootDepth
    ? `${T('ns.elev.rootsMin', { depth: `${fmtNum(rootCm, 0)} cm` })}${taxon.traits.root_system_type ? ` (${taxon.traits.root_system_type})` : ''}`
    : T('ns.elev.rootUnknown');

  return (
    <div class="scale-plate-wrap">
      <div class="scale-meta">
        <strong>{heightLabel} · {crownLabel}</strong>
        <span class="muted">{T('ns.elev.person')}</span>
      </div>
      <svg class="scale-plate-svg" viewBox="0 0 340 162" role="img" aria-label={`${T('ns.dossier.scaleAria')}: ${heightLabel}, ${crownLabel}, ${rootLabel}`}>
        <rect x="0" y={soilY} width="340" height={162 - soilY} fill="var(--surface-alt)" />
        <line x1="10" y1={soilY} x2="330" y2={soilY} stroke="var(--soil-2)" stroke-width="1.5" />
        {roomLineY != null && roomLimitM != null && (
          <line x1="10" y1={roomLineY.toFixed(1)} x2="330" y2={roomLineY.toFixed(1)} stroke="var(--accent)" stroke-dasharray="4 3" stroke-width="1.2" />
        )}
        <PersonSilhouette cx={62} soilY={soilY} h={humanH} />
        <BotanicalSilhouette
          kind={kind}
          cx={cx}
          soilY={soilY}
          plantH={plantH}
          plantW={plantW}
          strokeCol="var(--plant-green)"
          fillCol="var(--plant-green)"
          dashed={hVal == null || wVal == null}
          includeRootHint={false}
        />
        {/* Recorded root depth = solid root fan; unknown root depth = dashed root fan */}
        <path
          d={`M${cx} ${soilY} L${cx} ${(soilY + rootDepthPx).toFixed(1)} M${cx} ${soilY + 6} Q${cx - 20} ${(soilY + rootDepthPx * 0.56).toFixed(1)} ${cx - 32} ${(soilY + rootDepthPx * 0.84).toFixed(1)} M${cx} ${soilY + 6} Q${cx + 20} ${(soilY + rootDepthPx * 0.56).toFixed(1)} ${cx + 32} ${(soilY + rootDepthPx * 0.84).toFixed(1)} M${cx} ${soilY + 11} Q${cx - 12} ${(soilY + rootDepthPx * 0.72).toFixed(1)} ${cx - 18} ${(soilY + rootDepthPx * 0.96).toFixed(1)} M${cx} ${soilY + 11} Q${cx + 12} ${(soilY + rootDepthPx * 0.72).toFixed(1)} ${cx + 18} ${(soilY + rootDepthPx * 0.96).toFixed(1)}`}
          fill="none"
          stroke="var(--soil-1)"
          stroke-width={taproot && hasRootDepth ? '2.1' : '1.6'}
          stroke-dasharray={!hasRootDepth ? '4 3' : undefined}
          stroke-linecap="round"
        />
      </svg>
      <div class="scale-meta">
        <span><strong>{rootLabel}</strong></span>
        <span class="muted">{T('ns.elev.soilLine')} · {T('ns.elev.rootsNotScale')}</span>
      </div>
    </div>
  );
}
