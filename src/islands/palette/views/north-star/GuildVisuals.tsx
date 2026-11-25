/** @jsxImportSource preact */
// Pure SVG visualizations for North Star Palette Builder (Stage 2B):
// 1. Live-Reactive Guild Elevation Profile SVG (with paired interaction arcs)
// 2. Dual-Horizon Walter-Lieth Climate Diagram SVG (Today vs active scenario)
// 3. Habit-Only Scale & Root SVG (Botanical Field Dossier)
// Zero raw hex colours: uses CSS var(--...) design tokens exclusively.
import type {
  EffectiveSiteClimate,
  PaletteReport,
  Taxon,
} from '../../../../lib/palette/index.ts';
import { sizeClassOf } from '../../../../lib/palette/index.ts';
import { T } from '../../strings.ts';
import { fmtNum, photoUrlOf, taxCommonName } from './ns-helpers.ts';
import { nsDrawer, nsHoveredPlant } from './ns-state.ts';

export function PlantThumb({ taxon }: { taxon: Taxon }) {
  const img = photoUrlOf(taxon);
  if (img) return <img src={img} alt="" class="plant-thumb" loading="lazy" width="40" height="40" />;
  return <span class="plant-thumb plant-thumb-ph" aria-hidden="true">{taxon.canonical_name.slice(0, 2)}</span>;
}

function botanicalSilhouette(
  t: Taxon,
  cx: number,
  soilY: number,
  hPx: number,
  wPx: number,
  stroke: string,
  fill: string,
  dashed: boolean,
) {
  const cls = sizeClassOf(t);
  const dash = dashed ? '3 2' : undefined;
  const topY = soilY - hPx;
  if (cls === 'tree') {
    const trunkH = Math.max(8, hPx * 0.36);
    const rx = Math.max(10, wPx * 0.45);
    const ry = Math.max(10, (hPx - trunkH) * 0.56);
    const cy = topY + ry;
    return (
      <g>
        <line x1={cx} y1={soilY} x2={cx} y2={cy + ry * 0.6} stroke={stroke} stroke-width="2.2" stroke-dasharray={dash} />
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} fill-opacity="0.22" stroke={stroke} stroke-width="1.5" stroke-dasharray={dash} />
      </g>
    );
  }
  if (cls === 'shrub') {
    const rx = Math.max(10, wPx * 0.48);
    const ry = Math.max(8, hPx * 0.52);
    return (
      <g>
        <line x1={cx - 2} y1={soilY} x2={cx - 4} y2={soilY - ry * 0.7} stroke={stroke} stroke-width="1.5" />
        <line x1={cx + 2} y1={soilY} x2={cx + 4} y2={soilY - ry * 0.7} stroke={stroke} stroke-width="1.5" />
        <ellipse cx={cx} cy={soilY - ry} rx={rx} ry={ry} fill={fill} fill-opacity="0.24" stroke={stroke} stroke-width="1.5" stroke-dasharray={dash} />
      </g>
    );
  }
  if (cls === 'climber') {
    const midY = soilY - hPx * 0.5;
    return (
      <path
        d={`M ${cx} ${soilY} Q ${cx - 8} ${soilY - hPx * 0.25} ${cx} ${midY} T ${cx} ${topY}`}
        fill="none"
        stroke={stroke}
        stroke-width="2"
        stroke-dasharray={dash}
      />
    );
  }
  if (cls === 'groundcover') {
    const rx = Math.max(14, wPx * 0.55);
    return (
      <path
        d={`M ${cx - rx} ${soilY} Q ${cx} ${soilY - Math.max(8, hPx)} ${cx + rx} ${soilY} Z`}
        fill={fill}
        fill-opacity="0.24"
        stroke={stroke}
        stroke-width="1.5"
        stroke-dasharray={dash}
      />
    );
  }
  // herb
  const r = Math.max(7, Math.min(16, hPx * 0.4));
  return (
    <g>
      <line x1={cx} y1={soilY} x2={cx} y2={topY + r * 0.5} stroke={stroke} stroke-width="1.6" />
      <circle cx={cx} cy={topY + r} r={r} fill={fill} fill-opacity="0.22" stroke={stroke} stroke-width="1.5" stroke-dasharray={dash} />
    </g>
  );
}

export function GuildElevationSvg({ rep }: { rep: PaletteReport }) {
  const taxa = rep.taxa;
  if (!taxa.length) return null;

  const W = 680;
  const H = 168;
  const soilY = 132;
  const maxPlotH = 104;
  const maxHeightM = Math.max(4, ...taxa.map((t) => t.traits.height_m?.max ?? 1.5));
  const sorted = [...taxa].sort((a, b) => (b.traits.height_m?.max ?? 0.8) - (a.traits.height_m?.max ?? 0.8));
  const shown = sorted.slice(0, 14);
  const padX = 44;
  const stepX = shown.length > 1 ? (W - padX * 2) / (shown.length - 1) : 0;

  const hovered = nsHoveredPlant.value;
  const posById = new Map<string, { cx: number; topY: number }>();
  shown.forEach((t, i) => {
    const cx = shown.length === 1 ? W / 2 : padX + i * stepX;
    const hM = Math.max(0.25, t.traits.height_m?.max ?? 1);
    const hPx = Math.max(12, Math.min(maxPlotH, (Math.sqrt(hM) / Math.sqrt(maxHeightM)) * maxPlotH));
    posById.set(t.id, { cx, topY: soilY - hPx });
  });

  const activePairs = hovered
    ? rep.interactions.filter((x) => x.a === hovered || x.b === hovered)
    : [];
  const partnerIds = new Set(activePairs.flatMap((x) => [x.a, x.b]));

  return (
    <div class="elev-box" aria-label={T('ns.elev.aria')}>
      <svg viewBox={`0 0 ${W} ${H}`} class="wl-svg" role="img" aria-label={T('ns.elev.aria')}>
        {/* Soil horizon */}
        <line x1="12" y1={soilY} x2={W - 12} y2={soilY} stroke="var(--border-strong)" stroke-width="1.5" />
        <text x="14" y={soilY - maxPlotH + 4} fill="var(--text-muted)" font-size="10">{fmtNum(maxHeightM, 0)} m</text>
        <text x="14" y={soilY - 4} fill="var(--text-muted)" font-size="10">0 m</text>

        {/* Paired interaction arcs when hovering/focusing a plant */}
        {activePairs.map((pair, idx) => {
          const pA = posById.get(pair.a);
          const pB = posById.get(pair.b);
          if (!pA || !pB) return null;
          const midX = (pA.cx + pB.cx) / 2;
          const arcY = Math.max(12, Math.min(pA.topY, pB.topY) - 18);
          const col = pair.positive ? 'var(--accent)' : 'var(--danger)';
          return (
            <path
              key={idx}
              d={`M ${pA.cx} ${pA.topY} Q ${midX} ${arcY} ${pB.cx} ${pB.topY}`}
              fill="none"
              stroke={col}
              stroke-width="2"
              stroke-dasharray={pair.positive ? undefined : '4 3'}
            />
          );
        })}

        {/* Plant silhouettes */}
        {shown.map((t, i) => {
          const cx = shown.length === 1 ? W / 2 : padX + i * stepX;
          const hM = Math.max(0.25, t.traits.height_m?.max ?? 1);
          const hPx = Math.max(12, Math.min(maxPlotH, (Math.sqrt(hM) / Math.sqrt(maxHeightM)) * maxPlotH));
          const wPx = Math.max(16, Math.min(54, hPx * 0.72));
          const v = rep.verdicts.get(t.id);
          const stroke = v?.level === 'at_risk' ? 'var(--danger)' : v?.level === 'check' ? 'var(--warning)' : 'var(--accent-ink)';
          const isDim = hovered !== null && hovered !== t.id && !partnerIds.has(t.id);
          return (
            <g
              key={t.id}
              opacity={isDim ? 0.35 : 1}
              style={{ cursor: 'pointer' }}
              tabIndex={0}
              role="button"
              aria-label={`${taxCommonName(t)} (${fmtNum(hM, 1)} m)`}
              onMouseEnter={() => { nsHoveredPlant.value = t.id; }}
              onMouseLeave={() => { if (nsHoveredPlant.value === t.id) nsHoveredPlant.value = null; }}
              onFocus={() => { nsHoveredPlant.value = t.id; }}
              onBlur={() => { if (nsHoveredPlant.value === t.id) nsHoveredPlant.value = null; }}
              onClick={() => { nsDrawer.value = { kind: 'dossier', id: t.id }; }}
            >
              {botanicalSilhouette(t, cx, soilY, hPx, wPx, stroke, stroke, v?.level === 'at_risk')}
              <text x={cx} y={soilY + 14} text-anchor="middle" fill="var(--text-secondary)" font-size="9.5">
                {taxCommonName(t).slice(0, 11)}
              </text>
              <text x={cx} y={soilY + 25} text-anchor="middle" fill="var(--text-muted)" font-size="8.5">
                {t.traits.height_m?.max != null ? `${fmtNum(t.traits.height_m.max, 1)}m` : '?'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export function WalterLiethSvg({ eff, effToday }: { eff: EffectiveSiteClimate; effToday: EffectiveSiteClimate }) {
  const mT = eff.monthlyT;
  const mP = eff.monthlyP;
  if (!mT || !mP || mT.length !== 12 || mP.length !== 12) {
    return <p class="ns-muted">{T('ns.atlas.noMonthly')}</p>;
  }

  const W = 420;
  const H = 180;
  const padL = 34;
  const padR = 34;
  const padT = 16;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const t0 = effToday.monthlyT;
  const maxVal = Math.max(40, ...mT, ...(t0 ?? []), ...mP.map((p) => p / 2));
  const minVal = Math.min(0, ...mT, ...(t0 ?? []));
  const span = Math.max(10, maxVal - minVal);
  const yOf = (val: number) => padT + innerH - ((val - minVal) / span) * innerH;
  const xOf = (i: number) => padL + (i / 11) * innerW;

  const tempPath = mT.map((t, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(t).toFixed(1)}`).join(' ');
  const todayPath = eff.horizon !== 'today' && t0?.length === 12
    ? t0.map((t, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(t).toFixed(1)}`).join(' ')
    : null;
  const zeroY = yOf(0);
  const barW = innerW / 14;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} class="wl-svg" role="img" aria-label={T('ns.atlas.wlAria')}>
      {/* Zero line */}
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="var(--border-strong)" stroke-dasharray="3 3" />
      <text x={padL - 5} y={zeroY + 3} text-anchor="end" font-size="9" fill="var(--text-muted)">0°</text>
      <text x={padL - 5} y={padT + 6} text-anchor="end" font-size="9" fill="var(--text-muted)">{Math.round(maxVal)}°</text>
      <text x={W - padR + 5} y={padT + 6} text-anchor="start" font-size="9" fill="var(--focus)">{Math.round(maxVal * 2)}mm</text>

      {/* Monthly precipitation bars (scaled 2mm = 1°C Walter-Lieth standard) */}
      {mP.map((p, i) => {
        const x = xOf(i) - barW / 2;
        const y = yOf(p / 2);
        const h = Math.max(1, yOf(0) - y);
        const isDry = mT[i] > 0 && p < mT[i] * 2;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={h}
            rx="1.5"
            fill={isDry ? 'var(--warning)' : 'var(--focus)'}
            fill-opacity={isDry ? '0.32' : '0.28'}
          />
        );
      })}

      {/* Today reference curve when viewing a future scenario */}
      {todayPath && (
        <path d={todayPath} fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-dasharray="4 3" />
      )}
      {/* Active horizon mean temperature curve */}
      <path d={tempPath} fill="none" stroke="var(--accent)" stroke-width="2.2" />

      {/* Month labels */}
      {MONTH_LETTERS.map((lbl, i) => (
        <text key={i} x={xOf(i)} y={H - 8} text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">
          {lbl}
        </text>
      ))}
    </svg>
  );
}

export function ScaleRootSvg({ taxon }: { taxon: Taxon }) {
  const hM = taxon.traits.height_m?.max ?? null;
  const wM = taxon.traits.width_max_m ?? null;
  const W = 260;
  const H = 128;
  const soilY = 96;
  const maxRef = Math.max(2.5, hM ?? 2.5);
  const scale = 76 / maxRef;
  const humanH = Math.max(10, Math.min(72, 1.7 * scale));
  const plantH = hM !== null ? Math.max(10, Math.min(78, hM * scale)) : 32;
  const plantW = wM !== null ? Math.max(16, Math.min(90, wM * scale)) : 36;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} class="wl-svg" role="img" aria-label={T('ns.dossier.scaleAria')}>
      <line x1="12" y1={soilY} x2={W - 12} y2={soilY} stroke="var(--border-strong)" stroke-width="1.5" />
      {/* Human 1.7m reference silhouette */}
      <g>
        <circle cx="54" cy={soilY - humanH + 4} r={Math.max(2.5, humanH * 0.1)} fill="var(--text-muted)" />
        <line x1="54" y1={soilY - humanH + 7} x2="54" y2={soilY} stroke="var(--text-muted)" stroke-width="2.2" />
        <text x="54" y={soilY + 14} text-anchor="middle" font-size="9" fill="var(--text-muted)">1.7 m</text>
      </g>
      {/* Plant silhouette */}
      {botanicalSilhouette(taxon, 162, soilY, plantH, plantW, 'var(--accent-ink)', 'var(--accent)', false)}
      {/* Root depth hint */}
      {taxon.traits.taproot_persistent === true && (
        <path d={`M 162 ${soilY} L 162 ${soilY + 24} M 162 ${soilY + 8} L 152 ${soilY + 16} M 162 ${soilY + 12} L 172 ${soilY + 20}`} stroke="var(--soil-1)" stroke-width="1.6" fill="none" />
      )}
      <text x="162" y={soilY + 14} text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">
        {hM !== null ? `${fmtNum(hM, 1)} m` : T('ns.unknown')}
        {wM !== null ? ` × ${fmtNum(wM, 1)} m` : ''}
      </text>
    </svg>
  );
}
