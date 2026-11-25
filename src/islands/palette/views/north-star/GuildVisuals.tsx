/** @jsxImportSource preact */
// Verbatim 1:1 port of mockup-v73.html SVG visuals:
// - renderBotanicalSilhouette (L2804)
// - renderGuildProfile (L2848)
// - renderWalterLieth (L3476)
// - Dossier Mature Scale & Root SVG (L4056-4098)
// Zero raw hex colours (100% design tokens). Axe-clean accessible SVG controls.
import type { EffectiveSiteClimate, PaletteReport, PlantId, Taxon } from '../../../../lib/palette/index.ts';
import { months as MONTHS } from '../../../../lib/palette/index.ts';
import { T } from '../../strings.ts';
import {
  fmtNum,
  lightSpanLabel,
  photoUrlOf,
  scenarioShort,
  taxCommonName,
  verdictSymbolLabel,
} from './ns-helpers.ts';
import { nsActivePairKey, nsDrawer, nsScenario } from './ns-state.ts';

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
  const init = (taxCommonName(taxon)[0] ?? taxon.canonical_name[0] ?? '?').toUpperCase();
  return (
    <span
      class="plant-thumb plant-thumb-fb"
      aria-hidden="true"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      {init}
    </span>
  );
}

/** Verbatim port of mockup-v73.html renderBotanicalSilhouette (L2804). Strictly habit-derived. */
function BotanicalSilhouette({
  taxon,
  cx,
  soilY,
  plantH,
  plantW,
  strokeCol,
  fillCol,
  dashed,
}: {
  taxon: Taxon;
  cx: number;
  soilY: number;
  plantH: number;
  plantW: number;
  strokeCol: string;
  fillCol: string;
  dashed: boolean;
}) {
  const hab = (taxon.traits.habit ?? '').toLowerCase();
  const dash = dashed ? '4 3' : undefined;
  const op = dashed ? '0.12' : '0.24';
  const rW = Math.max(8, plantW / 2);
  const topY = soilY - plantH;

  if (hab.includes('climber') || hab.includes('vine')) {
    const x1 = cx - Math.min(12, rW * 0.4);
    const x2 = cx + Math.min(12, rW * 0.4);
    const midY = soilY - plantH * 0.5;
    return (
      <>
        <path d={`M${cx} ${soilY} C${x1} ${soilY - plantH * 0.3}, ${x2} ${soilY - plantH * 0.7}, ${cx} ${topY.toFixed(1)}`} fill="none" stroke={strokeCol} stroke-width="2" stroke-dasharray={dash} stroke-linecap="round" />
        <ellipse cx={(cx - 7).toFixed(1)} cy={(midY + 6).toFixed(1)} rx="6" ry="3.5" transform={`rotate(-25 ${(cx - 7).toFixed(1)} ${(midY + 6).toFixed(1)})`} fill={fillCol} fill-opacity={op} stroke={strokeCol} stroke-width="1.3" />
        <ellipse cx={(cx + 7).toFixed(1)} cy={(midY - 8).toFixed(1)} rx="6" ry="3.5" transform={`rotate(25 ${(cx + 7).toFixed(1)} ${(midY - 8).toFixed(1)})`} fill={fillCol} fill-opacity={op} stroke={strokeCol} stroke-width="1.3" />
        <ellipse cx={cx} cy={(topY + 4).toFixed(1)} rx="5" ry="3" fill={fillCol} fill-opacity={op} stroke={strokeCol} stroke-width="1.3" />
      </>
    );
  }
  if (hab.includes('ground')) {
    const gh = Math.max(5, Math.min(16, plantH));
    return (
      <path
        d={`M${(cx - rW).toFixed(1)} ${soilY} Q${(cx - rW * 0.5).toFixed(1)} ${(soilY - gh * 1.15).toFixed(1)} ${cx} ${(soilY - gh).toFixed(1)} Q${(cx + rW * 0.5).toFixed(1)} ${(soilY - gh * 1.15).toFixed(1)} ${(cx + rW).toFixed(1)} ${soilY} Z`}
        fill={fillCol}
        fill-opacity={op}
        stroke={strokeCol}
        stroke-width="1.6"
        stroke-dasharray={dash}
      />
    );
  }
  if (hab.includes('tree') || hab.includes('palm')) {
    const trunkTop = soilY - plantH * 0.58;
    const cy = soilY - plantH * 0.64;
    const ry = Math.max(8, plantH * 0.36);
    const rx = Math.max(10, rW);
    return (
      <>
        <path
          d={`M${cx} ${soilY} L${cx} ${trunkTop.toFixed(1)} M${cx} ${(soilY - plantH * 0.42).toFixed(1)} L${(cx - rx * 0.38).toFixed(1)} ${(soilY - plantH * 0.56).toFixed(1)} M${cx} ${(soilY - plantH * 0.46).toFixed(1)} L${(cx + rx * 0.35).toFixed(1)} ${(soilY - plantH * 0.59).toFixed(1)}`}
          stroke="var(--soil-2)"
          stroke-width={Math.max(1.8, Math.min(3.5, plantH * 0.045)).toFixed(1)}
          stroke-linecap="round"
        />
        <path
          d={`M${(cx - rx * 0.85).toFixed(1)} ${(cy + ry * 0.35).toFixed(1)} C${(cx - rx * 1.12).toFixed(1)} ${(cy - ry * 0.25).toFixed(1)}, ${(cx - rx * 0.62).toFixed(1)} ${(cy - ry * 1.05).toFixed(1)}, ${cx} ${topY.toFixed(1)} C${(cx + rx * 0.62).toFixed(1)} ${(cy - ry * 1.05).toFixed(1)}, ${(cx + rx * 1.12).toFixed(1)} ${(cy - ry * 0.25).toFixed(1)}, ${(cx + rx * 0.85).toFixed(1)} ${(cy + ry * 0.35).toFixed(1)} Q${cx} ${(cy + ry * 0.68).toFixed(1)} ${(cx - rx * 0.85).toFixed(1)} ${(cy + ry * 0.35).toFixed(1)} Z`}
          fill={fillCol}
          fill-opacity={op}
          stroke={strokeCol}
          stroke-width="1.7"
          stroke-dasharray={dash}
        />
      </>
    );
  }
  if (hab.includes('shrub') || hab.includes('bush')) {
    const cy = soilY - plantH * 0.52;
    const ry = Math.max(7, plantH * 0.46);
    const rx = Math.max(9, rW);
    return (
      <>
        <path
          d={`M${cx} ${soilY} L${(cx - rx * 0.3).toFixed(1)} ${(soilY - plantH * 0.45).toFixed(1)} M${cx} ${soilY} L${(cx + rx * 0.3).toFixed(1)} ${(soilY - plantH * 0.45).toFixed(1)} M${cx} ${soilY} L${cx} ${(soilY - plantH * 0.55).toFixed(1)}`}
          stroke="var(--soil-2)"
          stroke-width="1.6"
          stroke-linecap="round"
        />
        <path
          d={`M${(cx - rx * 0.9).toFixed(1)} ${(soilY - plantH * 0.14).toFixed(1)} C${(cx - rx * 1.05).toFixed(1)} ${(cy - ry * 0.5).toFixed(1)}, ${(cx - rx * 0.45).toFixed(1)} ${topY.toFixed(1)}, ${cx} ${(topY + 2).toFixed(1)} C${(cx + rx * 0.45).toFixed(1)} ${topY.toFixed(1)}, ${(cx + rx * 1.05).toFixed(1)} ${(cy - ry * 0.5).toFixed(1)}, ${(cx + rx * 0.9).toFixed(1)} ${(soilY - plantH * 0.14).toFixed(1)} Q${cx} ${(soilY - plantH * 0.04).toFixed(1)} ${(cx - rx * 0.9).toFixed(1)} ${(soilY - plantH * 0.14).toFixed(1)} Z`}
          fill={fillCol}
          fill-opacity={op}
          stroke={strokeCol}
          stroke-width="1.6"
          stroke-dasharray={dash}
        />
      </>
    );
  }
  // Herbaceous perennial / annual tuft
  const spread = Math.max(8, Math.min(26, rW * 0.85));
  return (
    <>
      <path
        d={`M${cx} ${soilY} Q${(cx - spread * 0.7).toFixed(1)} ${(soilY - plantH * 0.6).toFixed(1)} ${(cx - spread).toFixed(1)} ${(soilY - plantH * 0.82).toFixed(1)} Q${(cx - spread * 0.2).toFixed(1)} ${(soilY - plantH * 0.4).toFixed(1)} ${cx} ${soilY} M${cx} ${soilY} Q${(cx + spread * 0.7).toFixed(1)} ${(soilY - plantH * 0.6).toFixed(1)} ${(cx + spread).toFixed(1)} ${(soilY - plantH * 0.82).toFixed(1)} Q${(cx + spread * 0.2).toFixed(1)} ${(soilY - plantH * 0.4).toFixed(1)} ${cx} ${soilY} M${cx} ${soilY} L${cx} ${topY.toFixed(1)}`}
        fill={fillCol}
        fill-opacity={op}
        stroke={strokeCol}
        stroke-width="1.6"
        stroke-dasharray={dash}
        stroke-linecap="round"
      />
      <circle cx={cx} cy={topY.toFixed(1)} r="2.2" fill={strokeCol} />
    </>
  );
}

/** Verbatim port of mockup-v73.html renderGuildProfile (L2848). */
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
  const W = 720, H = 148, soilY = 112, aboveH = 84, leftPad = 68, rightPad = 24;
  const pxPerM = aboveH / scaleTopM;
  const humanH = Math.min(54, 1.75 * pxPerM);
  const roomLineY = maxRoomM != null && maxRoomM <= scaleTopM ? (soilY - maxRoomM * pxPerM) : null;
  const slotW = (W - leftPad - rightPad) / Math.max(1, shown.length);

  const pairKey = nsActivePairKey.value;
  const activePair = pairKey ? rep.interactions.find((it) => `${it.a}|${it.b}` === pairKey) ?? null : null;
  const posById = new Map<PlantId, { cx: number; topY: number }>();

  let stressedCount = 0;
  const items = shown.map((p, idx) => {
    const v = rep.verdicts.get(p.id);
    const stressed = v != null && v.level !== 'fits';
    if (stressed) stressedCount++;
    const isPartner = activePair != null && (activePair.a === p.id || activePair.b === p.id);
    const col = v?.level === 'fits' ? 'var(--pal-ok)' : v?.level === 'check' ? 'var(--accent)' : 'var(--pal-bad)';
    const cx = leftPad + (idx + 0.5) * slotW;
    const hVal = p.traits.height_m?.max ?? null;
    const wVal = p.traits.width_max_m ?? null;
    const pH = hVal != null ? Math.max(8, Math.min(aboveH - 4, hVal * pxPerM)) : 28;
    const pW = wVal != null ? Math.max(14, Math.min(slotW * 0.9, wVal * pxPerM)) : Math.max(16, Math.min(slotW * 0.72, pH * 0.65));
    posById.set(p.id, { cx, topY: soilY - pH });
    const fullName = taxCommonName(p);
    const shortNm = fullName.length > 11 ? `${fullName.slice(0, 10)}…` : fullName;
    const hTag = hVal != null ? `${fmtNum(hVal)}m` : '?';
    const open = () => { nsDrawer.value = { kind: 'dossier', id: p.id }; };
    return (
      <g key={p.id}>
        <g
          class="guild-sil-btn"
          role="button"
          tabIndex={0}
          aria-label={`${fullName} (${hTag} · ${lightSpanLabel(p)} · ${v ? verdictSymbolLabel(v.level) : ''})`}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              open();
            }
          }}
        >
          <title>{`${fullName} (${p.traits.habit ?? 'habit unrecorded'} · ${hTag} · ${lightSpanLabel(p)})`}</title>
          {isPartner && (
            <circle cx={cx.toFixed(1)} cy={(soilY - pH * 0.5).toFixed(1)} r={Math.max(14, pW * 0.6).toFixed(1)} fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="3 2" />
          )}
          <BotanicalSilhouette taxon={p} cx={cx} soilY={soilY} plantH={pH} plantW={pW} strokeCol={col} fillCol={col} dashed={hVal == null || wVal == null} />
        </g>
        {stressed && v && (
          <g aria-hidden="true">
            <rect x={(cx - 26).toFixed(1)} y={Math.max(4, soilY - pH - 18).toFixed(1)} width="52" height="14" rx="7" fill="var(--surface)" stroke={col} stroke-width="1.2" />
            <text x={cx.toFixed(1)} y={Math.max(14, soilY - pH - 8).toFixed(1)} text-anchor="middle" font-size="9" font-weight="600" fill={v.level === 'check' ? 'var(--pal-warn)' : 'var(--pal-bad)'}>
              {v.level === 'check' ? '▲ Check' : '✕ Risk'}
            </text>
          </g>
        )}
        <text aria-hidden="true" x={cx.toFixed(1)} y={soilY + 14} text-anchor="middle" font-size="10" font-weight="600" fill={isPartner ? 'var(--accent-ink)' : 'var(--text-secondary)'}>
          {shortNm}
        </text>
        <text aria-hidden="true" x={cx.toFixed(1)} y={soilY + 26} text-anchor="middle" font-size="9" fill="var(--text-muted)">
          {hTag}
        </text>
      </g>
    );
  });

  const pA = activePair ? posById.get(activePair.a) : undefined;
  const pB = activePair ? posById.get(activePair.b) : undefined;
  const midX = pA && pB ? (pA.cx + pB.cx) / 2 : 0;
  const arcY = pA && pB ? Math.max(12, Math.min(pA.topY, pB.topY) - 22) : 0;
  const pairLbl = activePair?.positive ? '↔ Yield-gain pairing' : '↔ Shared pest';

  return (
    <div class="guild-profile-plate">
      <div class="guild-profile-head">
        <span>
          <strong>{T('ns.elev.aria')} ({activeScenShort})</strong> · {T('ns.elev.caption')}
          {ordered.length > shown.length ? ` (10 / ${ordered.length})` : ''}
        </span>
        <span>{T('ns.dossier.scaleAria')}</span>
      </div>
      <svg
        class="guild-profile-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${T('ns.elev.aria')} (${activeScenShort}): ${shown.length - stressedCount} ${T('ns.verdict.fits')}, ${stressedCount} ${T('ns.verdict.check')}`}
      >
        <rect x="0" y={soilY} width={W} height={H - soilY} fill="var(--surface-alt)" rx="4" />
        <line x1="10" y1={soilY} x2={W - 10} y2={soilY} stroke="var(--soil-2)" stroke-width="1.4" />
        <text x="12" y={soilY - aboveH + 8} font-size="9" fill="var(--text-muted)">{fmtNum(scaleTopM, 0)} m</text>
        <line x1="10" y1={soilY - aboveH} x2={W - 10} y2={soilY - aboveH} stroke="var(--border)" stroke-dasharray="2 4" stroke-width="1" />
        {roomLineY != null && maxRoomM != null && (
          <>
            <line x1="10" y1={roomLineY.toFixed(1)} x2={W - 12} y2={roomLineY.toFixed(1)} stroke="var(--accent)" stroke-dasharray="4 3" stroke-width="1.1" />
            <rect x="10" y={Math.max(2, roomLineY - 13).toFixed(1)} width="88" height="12" rx="3" fill="var(--surface)" opacity="0.92" />
            <text x="14" y={Math.max(11, roomLineY - 4).toFixed(1)} text-anchor="start" font-size="9" font-weight="600" fill="var(--accent-ink)">
              {T('ns.elev.yourRoom', { m: `${fmtNum(maxRoomM, 0)} m` })}
            </text>
          </>
        )}
        {humanH >= 10 ? (
          <g aria-hidden="true">
            <circle cx="34" cy={(soilY - humanH + 2.5).toFixed(1)} r={Math.min(3, humanH * 0.14).toFixed(1)} fill="var(--text-muted)" />
            <line x1="34" y1={(soilY - humanH + 5).toFixed(1)} x2="34" y2={(soilY - humanH * 0.35).toFixed(1)} stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" />
            <line x1="34" y1={(soilY - humanH * 0.35).toFixed(1)} x2="30.5" y2={soilY} stroke="var(--text-muted)" stroke-width="1.6" stroke-linecap="round" />
            <line x1="34" y1={(soilY - humanH * 0.35).toFixed(1)} x2="37.5" y2={soilY} stroke="var(--text-muted)" stroke-width="1.6" stroke-linecap="round" />
          </g>
        ) : (
          <line aria-hidden="true" x1="34" y1={(soilY - humanH).toFixed(1)} x2="34" y2={soilY} stroke="var(--text-muted)" stroke-width="2.2" stroke-linecap="round" />
        )}
        <text aria-hidden="true" x="34" y={soilY + 14} text-anchor="middle" font-size="9" fill="var(--text-muted)">1.75 m</text>
        {items}
        {pA && pB && (
          <g aria-hidden="true">
            <path d={`M${pA.cx.toFixed(1)} ${(pA.topY - 2).toFixed(1)} Q${midX.toFixed(1)} ${arcY.toFixed(1)} ${pB.cx.toFixed(1)} ${(pB.topY - 2).toFixed(1)}`} fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3" />
            <rect x={(midX - 58).toFixed(1)} y={Math.max(2, arcY - 8).toFixed(1)} width="116" height="16" rx="8" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.2" />
            <text x={midX.toFixed(1)} y={Math.max(13, arcY + 3).toFixed(1)} text-anchor="middle" font-size="9.5" font-weight="600" fill="var(--accent-ink)">{pairLbl}</text>
          </g>
        )}
      </svg>
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

/** Verbatim port of mockup-v73.html Dossier Mature Scale & Root Diagram (L4056-4098). */
export function ScaleRootSvg({ taxon, roomLimitM }: { taxon: Taxon; roomLimitM: number | null }) {
  const hVal = taxon.traits.height_m?.max ?? null;
  const wVal = taxon.traits.width_max_m ?? null;
  const scaleTopM = Math.max(3, hVal ?? 3, roomLimitM != null && hVal != null && hVal <= roomLimitM * 1.5 ? roomLimitM + 1 : 0);
  const soilY = 122, aboveH = 104, cx = 250;
  const pxPerM = aboveH / scaleTopM;
  const humanH = Math.min(72, 1.75 * pxPerM);
  const plantH = hVal != null ? Math.max(6, Math.min(aboveH - 4, hVal * pxPerM)) : 44;
  const plantW = wVal != null ? Math.max(12, Math.min(180, wVal * pxPerM)) : Math.max(24, Math.min(90, plantH * 0.65));
  const rootCm = taxon.traits.root_depth_min_cm ?? null;
  const taproot = taxon.traits.taproot_persistent === true;
  const hasRootDepth = rootCm != null;
  const rootDepthPx = hasRootDepth ? Math.max(12, Math.min(40, (rootCm / 150) * 40)) : (taproot ? 26 : 0);
  const roomLineY = roomLimitM != null && roomLimitM <= scaleTopM ? (soilY - roomLimitM * pxPerM) : null;

  return (
    <svg class="wl-svg" viewBox="0 0 460 176" role="img" aria-label={T('ns.dossier.scaleAria')}>
      <rect x="0" y={soilY} width="460" height={176 - soilY} fill="var(--surface-alt)" />
      <line x1="12" y1={soilY} x2="448" y2={soilY} stroke="var(--soil-2)" stroke-width="1.5" />
      <text x="16" y={soilY + 14} font-size="10" fill="var(--text-muted)">{T('ns.elev.soilLine')}</text>
      {roomLineY != null && roomLimitM != null && (
        <>
          <line x1="90" y1={roomLineY.toFixed(1)} x2="444" y2={roomLineY.toFixed(1)} stroke="var(--accent)" stroke-dasharray="4 3" stroke-width="1.2" />
          <text x="444" y={(roomLineY - 4).toFixed(1)} text-anchor="end" font-size="10" font-weight="600" fill="var(--accent-ink)">
            {T('ns.elev.yourRoom', { m: `${fmtNum(roomLimitM, 0)} m` })}
          </text>
        </>
      )}
      {humanH >= 12 ? (
        <g aria-hidden="true">
          <circle cx="64" cy={(soilY - humanH + 3).toFixed(1)} r={Math.min(3.5, humanH * 0.14).toFixed(1)} fill="var(--text-muted)" />
          <line x1="64" y1={(soilY - humanH + 6).toFixed(1)} x2="64" y2={(soilY - humanH * 0.35).toFixed(1)} stroke="var(--text-muted)" stroke-width="2.2" stroke-linecap="round" />
          <line x1="64" y1={(soilY - humanH * 0.35).toFixed(1)} x2="60" y2={soilY} stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" />
          <line x1="64" y1={(soilY - humanH * 0.35).toFixed(1)} x2="68" y2={soilY} stroke="var(--text-muted)" stroke-width="1.8" stroke-linecap="round" />
        </g>
      ) : (
        <g aria-hidden="true">
          <line x1="64" y1={(soilY - humanH).toFixed(1)} x2="64" y2={soilY} stroke="var(--text-muted)" stroke-width="2.5" stroke-linecap="round" />
          <circle cx="64" cy={(soilY - humanH - 1.5).toFixed(1)} r="1.5" fill="var(--text-muted)" />
        </g>
      )}
      <text x="64" y={soilY + 28} text-anchor="middle" font-size="10" fill="var(--text-muted)">{T('ns.elev.person')}</text>
      <BotanicalSilhouette taxon={taxon} cx={cx} soilY={soilY} plantH={plantH} plantW={plantW} strokeCol="var(--pal-ok)" fillCol="var(--pal-ok)" dashed={hVal == null} />
      <text x={cx} y={Math.max(14, soilY - plantH - 4).toFixed(1)} text-anchor="middle" font-size="11" font-weight="600" fill="var(--text)">
        {hVal != null ? `${fmtNum(hVal)} m tall` : 'Height unrecorded'}{wVal != null ? ` · ${fmtNum(wVal)} m wide` : ' · crown unrecorded'}
      </text>
      {rootDepthPx > 0 ? (
        <>
          <path
            d={`M${cx} ${soilY} L${cx} ${(soilY + rootDepthPx).toFixed(1)} M${cx} ${soilY + 6} Q${cx - 18} ${soilY + rootDepthPx * 0.6} ${cx - 28} ${(soilY + rootDepthPx * 0.85).toFixed(1)} M${cx} ${soilY + 6} Q${cx + 18} ${soilY + rootDepthPx * 0.6} ${cx + 28} ${(soilY + rootDepthPx * 0.85).toFixed(1)}`}
            fill="none"
            stroke="var(--soil-1)"
            stroke-width={taproot ? '2.2' : '1.6'}
            stroke-dasharray={!hasRootDepth ? '3 3' : undefined}
            stroke-linecap="round"
          />
          <text x={cx + 34} y={(soilY + 18).toFixed(1)} font-size="10" font-weight="600" fill="var(--text-secondary)">
            {hasRootDepth ? `Roots ≥ ${rootCm} cm` : 'Taproot · depth unrecorded'}{taxon.traits.root_system_type ? ` (${taxon.traits.root_system_type})` : ''}
          </text>
          <text x={cx + 34} y={(soilY + 32).toFixed(1)} font-size="10" fill="var(--text-muted)">{T('ns.elev.rootsNotScale')}</text>
        </>
      ) : (
        <text x={cx} y={soilY + 26} text-anchor="middle" font-size="10" fill="var(--text-muted)">Root depth unrecorded</text>
      )}
    </svg>
  );
}
