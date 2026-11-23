/** @jsxImportSource preact */
// 1-Click Plant Field Dossier Slide-Over Drawer (Slice 3.3, v14/v15):
// - <- Prev / Next -> navigation + Escape / backdrop click to close
// - Visual Soil pH & Cold/Heat tolerance tracks with user's current site marker overlaid
// - 2-Column Hairline Field Spec Ledger (6 rows with .field-tip explanations)
// - Signal-first Breaking Points, 60-year 6-stage succession lifeline,
//   12-month calendar with "Site-adjusted · photoperiod" badge, and Companion Synergy links.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { SUCCESSION_STAGES_6, type Details, type Locale } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { pageLang, T } from '../../strings.ts';
import { closeFieldDossier, dossierId, dossierList, openFieldDossier, stepFieldDossier } from '../../state/studio.ts';
import { nameOf } from '../kit/names.ts';
import { FieldTip } from '../kit/field-tip.tsx';
import {
  activityMonthsOf,
  buildDossierSpec,
  MONTH_INITIALS,
  sunTierLabel,
} from '../../rules/studio-filters.ts';

export function FieldDossier() {
  const id = dossierId.value;
  const list = dossierList.value;
  const [details, setDetails] = useState<Details | null>(null);

  useEffect(() => {
    if (!id) { setDetails(null); return; }
    let gone = false;
    setDetails(null);
    const src = store.source.peek();
    const z = store.climate.peek();
    if (src && z) {
      void src.details(id, z, pageLang() as Locale).then((d) => { if (!gone) setDetails(d); }).catch(() => {});
    }
    return () => { gone = true; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeFieldDossier(); return; }
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (e.key === 'ArrowLeft') stepFieldDossier(-1);
      else if (e.key === 'ArrowRight') stepFieldDossier(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [id]);

  const taxon = id ? store.taxonOf(id) : null;
  const loc = store.location.value;
  const spec = useMemo(
    () => (taxon ? buildDossierSpec(taxon, details, loc) : null),
    [taxon, details, loc],
  );
  const spark = useMemo(
    () => (taxon ? activityMonthsOf(taxon, details) : []),
    [taxon, details],
  );

  if (!id || !taxon || !spec) return null;

  const inPalette = store.members.value.includes(taxon.id);
  const peers = store.memberTaxa.value.filter((m) => m.id !== taxon.id).slice(0, 5);
  const canStep = list.length > 1;

  return (
    <div
      class="ct-dossier-backdrop"
      data-field-dossier
      onClick={(e) => { if (e.target === e.currentTarget) closeFieldDossier(); }}
    >
      <div class="ct-dossier" role="dialog" aria-modal="true" aria-labelledby="ct-dossier-title">
        <div class="ct-dossier-head">
          <div>
            <h2 id="ct-dossier-title">{nameOf(taxon)}</h2>
            <p class="ct-muted ct-small-text">
              <span class="ct-sci">{taxon.canonical_name}</span> · {sunTierLabel(taxon)} · {spec.lifeline.label}
            </p>
          </div>
          <div class="ct-dossier-nav">
            {canStep && (
              <>
                <button type="button" class="ct-dossier-btn" onClick={() => stepFieldDossier(-1)}>{T('studio.prev')}</button>
                <button type="button" class="ct-dossier-btn" onClick={() => stepFieldDossier(1)}>{T('studio.next')}</button>
              </>
            )}
            <button
              type="button"
              class="ct-dossier-btn"
              onClick={() => (inPalette ? store.removeMember(taxon.id) : store.addMembers([taxon.id]))}
            >
              {inPalette ? T('studio.remove') : T('studio.add')}
            </button>
            <button type="button" class="ct-dossier-btn" aria-label={T('studio.close')} onClick={closeFieldDossier}>
              {T('studio.close')}
            </button>
          </div>
        </div>

        {/* Signal-first Breaking Points */}
        {spec.breakingPoints.length > 0 && (
          <div class="ct-dossier-tracks" data-dossier-breaking-points>
            {spec.breakingPoints.map((bp, idx) => (
              <div key={idx} class={`ct-break${bp.severity === 'danger' ? ' is-danger' : ''}`}>
                <strong>{bp.title}</strong>
                <span>{bp.detail}</span>
              </div>
            ))}
          </div>
        )}

        {/* Visual Soil pH & Cold/Heat Tolerance Tracks */}
        <div class="ct-dossier-tracks">
          <div class="ct-track">
            <div class="ct-track-head">
              <span>Soil pH tolerance ({spec.phTrack.min.toFixed(1)}–{spec.phTrack.max.toFixed(1)})</span>
              <span>{spec.phTrack.sitePh != null ? `Your site: pH ${spec.phTrack.sitePh.toFixed(1)}` : 'Site pH not set'}</span>
            </div>
            <div class="ct-track-rail">
              <div class="ct-track-bar" style={{ left: `${spec.phTrack.barLeft}%`, width: `${spec.phTrack.barWidth}%` }} />
              {spec.phTrack.sitePct != null && (
                <div class="ct-track-pin" style={{ left: `${spec.phTrack.sitePct}%` }} />
              )}
            </div>
          </div>

          <div class="ct-track">
            <div class="ct-track-head">
              <span>Cold &amp; heat envelope ({spec.tempTrack.minC}°C to {spec.tempTrack.maxC}°C)</span>
              <span>
                {spec.tempTrack.siteColdC != null && spec.tempTrack.siteHotC != null
                  ? `Site: ${spec.tempTrack.siteColdC.toFixed(0)}°C / ${spec.tempTrack.siteHotC.toFixed(0)}°C`
                  : 'Set location to compare'}
              </span>
            </div>
            <div class="ct-track-rail">
              <div class="ct-track-bar" style={{ left: `${spec.tempTrack.barLeft}%`, width: `${spec.tempTrack.barWidth}%` }} />
              {spec.tempTrack.coldPin != null && <div class="ct-track-pin" style={{ left: `${spec.tempTrack.coldPin}%` }} />}
              {spec.tempTrack.hotPin != null && <div class="ct-track-pin" style={{ left: `${spec.tempTrack.hotPin}%` }} />}
            </div>
          </div>
        </div>

        {/* 2-Column Hairline Field Spec Ledger */}
        <ul class="ct-ledger">
          {spec.ledger.map((row) => (
            <li key={row.label} class="ct-ledger-row">
              <span class="ct-ledger-label">
                {row.label}
                <FieldTip label={`Explain ${row.label}`} text={row.tip} />
              </span>
              <span class="ct-ledger-val">{row.value}</span>
            </li>
          ))}
        </ul>

        {/* 60-Year 6-Stage Succession Lifeline */}
        <div class="ct-track">
          <div class="ct-track-head">
            <span>60-year succession lifeline</span>
            <span>{spec.lifeline.label}</span>
          </div>
          <div class="ct-lifeline">
            {SUCCESSION_STAGES_6.map((s, idx) => (
              <div
                key={s.id}
                class={`ct-lifeline-cell${idx >= spec.lifeline.start && idx <= spec.lifeline.end ? ' is-on' : ''}`}
              >
                <div>{s.name}</div>
                <div>{s.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 12-Month Calendar with Site-adjusted photoperiod badge */}
        <div class="ct-track">
          <div class="ct-cal12-head">
            <span class="ct-small-text"><strong>12-month seasonal activity</strong></span>
            {spec.photoperiodInfo && (
              <span class="ct-cal12-badge" data-photoperiod-badge>
                Site-adjusted · photoperiod ({spec.photoperiodInfo.winterH.toFixed(1)}–{spec.photoperiodInfo.summerH.toFixed(1)} h)
              </span>
            )}
          </div>
          <span class="ct-spark" aria-label="12-month calendar">
            {MONTH_INITIALS.map((m, i) => (
              <span key={i} class="ct-spark-cell" data-lvl={spark[i]}>{m}</span>
            ))}
          </span>
        </div>

        {/* Companion Synergy Links */}
        {peers.length > 0 && (
          <div class="ct-track">
            <span class="ct-small-text"><strong>Companion synergy in your palette</strong></span>
            <div class="ct-synergy">
              {peers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  class="ct-card-act"
                  onClick={() => openFieldDossier(p.id, store.members.peek())}
                >
                  {nameOf(p)} →
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
