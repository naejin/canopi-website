/** @jsxImportSource preact */
// A8 Ink-Only A4/Letter Print Field Sheet:
// Hidden on screen (.ns-print-sheet { display: none }), sole printed surface in @media print.
// Includes localized site summary header (place, climate, pH, 1-in-10 freeze & heat),
// scannable pure-TS SVG QR code + fallback URL text, and multi-page-safe plant table with <Glyph> icons.
import type { PaletteReport } from '../../../../lib/palette/index.ts';
import { encodeQrSvg } from '../../../../lib/qr-svg.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { Glyph } from '../kit/Glyph.tsx';
import {
  defaultQtyFor,
  fmtNum,
  freezeText,
  heatText,
  pollinationShortWarn,
  taxCommonName,
  toxBadgeInfo,
  verdictGlyphName,
  verdictStampText,
} from './ns-helpers.ts';
import { nsQtyById } from './ns-state.ts';

export function PrintFieldSheet({ rep }: { rep: PaletteReport }) {
  const eff = rep.eff;
  const qtyMap = nsQtyById.value;
  const siteLabel = store.location.value?.label ?? store.climate.value ?? T('ns.land.title');
  const texture = eff.drainage ?? store.location.value?.lookup?.soil?.texture ?? '';
  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://projectcanopi.com/palette/';
  const qr = encodeQrSvg(shareUrl, 2);

  return (
    <article class="ns-print-sheet" aria-label={T('ns.print.sheetTitle')}>
      <header class="ns-print-head">
        <div class="ns-print-head-main">
          <p class="ns-print-kicker">{T('ns.print.sheetTitle')}</p>
          <h1 class="ns-print-place">{T('ns.print.site')}: {siteLabel}</h1>
          <dl class="ns-print-meta tnum">
            <div>
              <dt>{T('ns.land.climate')}</dt>
              <dd>
                {[
                  eff.koppen || null,
                  eff.usdaZone ? `USDA ${eff.usdaZone}` : null,
                  eff.precipMm != null ? `${Math.round(eff.precipMm)} mm/yr` : null,
                ].filter(Boolean).join(' · ') || T('ns.unknown')}
              </dd>
            </div>
            <div>
              <dt>{T('ns.land.soilPh')}</dt>
              <dd>{eff.soilPh != null ? `${fmtNum(eff.soilPh)}${texture ? ` (${texture})` : ''}` : T('ns.unknown')}</dd>
            </div>
            <div>
              <dt>{T('ns.land.freeze10')}</dt>
              <dd>{freezeText(eff)}</dd>
            </div>
            <div>
              <dt>{T('ns.land.heat10')}</dt>
              <dd>{heatText(eff)}</dd>
            </div>
          </dl>
        </div>

        <div class="ns-print-qr">
          <svg
            width="84"
            height="84"
            viewBox={`0 0 ${qr.viewBoxSize} ${qr.viewBoxSize}`}
            shape-rendering="crispEdges"
            role="img"
            aria-label={T('ns.print.scanQr')}
          >
            <rect width={qr.viewBoxSize} height={qr.viewBoxSize} class="ns-print-qr-bg" />
            <path d={qr.pathD} class="ns-print-qr-fg" />
          </svg>
          <span class="ns-print-qr-cap">{T('ns.print.scanQr')}</span>
          <span class="ns-print-url">{shareUrl}</span>
        </div>
      </header>

      <table class="ns-print-table tnum">
        <thead>
          <tr>
            <th scope="col">{T('ns.print.colSpecies')}</th>
            <th scope="col">{T('ns.print.colStatus')}</th>
            <th scope="col">{T('ns.print.colQty')}</th>
            <th scope="col">{T('ns.print.colSpacing')}</th>
            <th scope="col">{T('ns.print.colNotes')}</th>
          </tr>
        </thead>
        <tbody>
          {rep.taxa.map((p) => {
            const v = rep.verdicts.get(p.id);
            const qty = qtyMap[p.id] ?? defaultQtyFor(p);
            const wMax = p.traits.width_max_m ?? null;
            const tox = toxBadgeInfo(p);
            const pollWarn = pollinationShortWarn(p);
            const onSite = v?.alreadyOnSite ?? false;
            const noteParts: string[] = [];
            if (onSite) noteParts.push(T('ns.alreadyOnSite'));
            if (pollWarn) noteParts.push(pollWarn);
            return (
              <tr key={p.id}>
                <td>
                  <strong>{taxCommonName(p)}</strong>{' '}
                  <span class="ns-print-bot">{p.canonical_name}</span>
                </td>
                <td class="ns-print-status">
                  {v && v.level !== 'unknown' && <Glyph name={verdictGlyphName(v.level)} size={13} />}
                  <span>{v ? verdictStampText(v.level) : T('ns.verdict.unknown')}</span>
                </td>
                <td>×{qty}</td>
                <td>{wMax != null ? `${fmtNum(wMax)} m` : T('ns.unknown')}</td>
                <td>
                  {tox && (
                    <span class="ns-print-tox">
                      <Glyph name="risk" size={13} />{' '}
                      {tox.text.replace(/^⚠\s*/, '')}
                    </span>
                  )}
                  {tox && noteParts.length > 0 ? ' · ' : ''}
                  {noteParts.join(' · ')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}
