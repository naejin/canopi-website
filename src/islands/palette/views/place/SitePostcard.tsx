/** @jsxImportSource preact */
// Step 1 Site & Climate Postcard (Stage 1 — 1:1 port of v14 mockup-01-onboard):
// - Thick ink left-bordered .ct-postcard with place header + compact country/climate tag
// - 3 hairline editorial rows: WINTER & FROST, SUMMER & RAIN, SOIL & SUBSOIL
// - Mild-winter advantage line when applicable
// - Collapsible "Tune canopi-climate readings & microclimate (live updates)" hosting sliders + PlaceFigures
// - ODbL 1.0 + canopi-data Schema 4.9 attribution footer
import { siteClimate as climateOf } from '../../../../lib/palette/index.ts';
import { location as siteLocation, climate, country, siteEdits } from '../../store.ts';
import { T } from '../../strings.ts';
import { countryName, zoneName } from '../kit/names.ts';
import { microclimate } from '../../state/studio.ts';
import {
  formatFreezeTag,
  formatHeatPeakTag,
  signedTemp1,
  siteClimateProfile,
} from '../../rules/climate-words.ts';
import { SiteTuner } from './SiteTuner.tsx';

export function SitePostcard() {
  const loc = siteLocation.value;
  const z = climate.value;
  const mc = microclimate.value;
  const edits = siteEdits.value;
  const sc = loc?.lookup ? climateOf(loc.lookup) : null;
  const profile = siteClimateProfile(loc, z, mc, edits);
  const cCode = country.value.code;
  const cLabel = cCode ? T('studio.postcard.invasiveActive', { country: countryName(cCode) }) : T('studio.postcard.invasiveNone');

  const heading = loc?.label || (z ? T('studio.postcard.zoneHeading', { zone: zoneName(z) }) : T('studio.postcard.selectPrompt'));
  const activeZone = sc?.zone ?? sc?.suggested ?? z;
  const phPart = profile.ph != null ? T('studio.postcard.soilPhParen', { ph: profile.ph.toFixed(1), reaction: profile.phReaction ?? '' }) : '';
  const summary = profile.hasLive && sc
    ? T('studio.postcard.summaryLive', { zone: activeZone ? zoneName(activeZone) : T('studio.postcard.localZone'), koppen: sc.koppen, soilPh: phPart })
    : z
      ? T('studio.postcard.summaryZone', { zone: zoneName(z) })
      : T('studio.postcard.summaryEmpty');

  const frostNote = profile.hasLive
    ? profile.frostFreeDays != null
      ? `${T('studio.postcard.frostFreeDays', { days: profile.frostFreeDays })}${profile.falseSpringPct != null && profile.falseSpringPct >= 15 ? ` · ${T('studio.postcard.falseSpring', { pct: profile.falseSpringPct })}` : ''}`
      : profile.winterClass
    : null;

  const estTag = ` (${T('studio.postcard.est')})`;
  const winterLine = profile.hasLive && profile.coldFreeze10yrC != null && profile.typicalColdNightC != null
    ? T('studio.postcard.winterLine', {
        freeze: `${formatFreezeTag(profile.coldFreeze10yrC, profile.coldFreezeIsEst)}${profile.coldFreezeIsEst ? estTag : ''}`,
        month: profile.coldMonth,
        night: signedTemp1(profile.typicalColdNightC),
        frost: frostNote ?? '',
      })
    : z
      ? T('studio.postcard.zoneBaseline', { zone: zoneName(z), winter: profile.winterClass })
      : T('studio.postcard.awaitingLoc');

  const summerLine = profile.hasLive && profile.heatPeak10yrC != null && profile.typicalWarmHighC != null
    ? `${T('studio.postcard.summerLine', {
        peak: `${formatHeatPeakTag(profile.heatPeak10yrC, profile.heatPeakIsEst)}${profile.heatPeakIsEst ? estTag : ''}`,
        month: profile.warmMonth,
        high: `${profile.typicalWarmHighC.toFixed(1)} °C`,
      })}${profile.moistureRegime ? ` · ${profile.moistureRegime}` : ''}${profile.dryStreakDays != null ? ` · ${T('studio.postcard.drySpellDays', { days: profile.dryStreakDays })}` : ''}`
    : T('studio.postcard.autoTiles');

  const winterBadge = profile.hasLive && profile.typicalColdNightC != null && profile.coldFreeze10yrC != null
    ? profile.winterTier === 'mild'
      ? {
          head: T('studio.winter.mildHead'),
          body: T('studio.winter.mildBody', { season: profile.winterSeason, month: profile.coldMonth, night: signedTemp1(profile.typicalColdNightC) }),
        }
      : profile.winterTier === 'cool'
        ? {
            head: T('studio.winter.coolHead'),
            body: T('studio.winter.coolBody', { freeze: formatFreezeTag(profile.coldFreeze10yrC, profile.coldFreezeIsEst) }),
          }
        : {
            head: T('studio.winter.dormantHead'),
            body: T('studio.winter.dormantBody', { month: profile.coldMonth, night: signedTemp1(profile.typicalColdNightC) }),
          }
    : z === 'Subtropical' || z === 'Tropical'
      ? { head: T('studio.winter.mildHead'), body: T('studio.winter.mildShort') }
      : z === 'Mediterranean'
        ? { head: T('studio.winter.coolHead'), body: T('studio.winter.coolShort') }
        : null;

  return (
    <section class="postcard" data-site-postcard aria-label={T('studio.postcard.aria')}>
      <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
        <strong class="ct-postcard-title" style="font-family:var(--font-display); font-size:18px;">{heading}</strong>
        <span style="font-size:12.5px; color:var(--ink-muted);">{T('studio.postcard.sourceMeta', { invasive: cLabel })}</span>
      </div>
      <p style="margin:0; font-size:14.5px; color:var(--ink-soft);">{summary}</p>

      <div class="ob-forces-list">
        <div class="ob-force-row">
          <span class="ob-fk">{T('studio.postcard.rowWinter')}</span>
          <span class="ob-fv">{winterLine}</span>
        </div>
        <div class="ob-force-row">
          <span class="ob-fk">{T('studio.postcard.rowSummer')}</span>
          <span class="ob-fv">{summerLine}</span>
        </div>
        <div class="ob-force-row">
          <span class="ob-fk">{T('studio.postcard.rowSoil')}</span>
          <span class="ob-fv">
            {profile.ph != null
              ? `${T('studio.postcard.topsoilPh', { ph: profile.ph.toFixed(1), reaction: profile.phReaction ?? '' })}${profile.soilTexture ? ` · ${profile.soilTexture}` : ''}`
              : T('studio.postcard.soilBaseline')}
          </span>
        </div>
      </div>

      {winterBadge && (
        <div class="ob-mild-line" data-mild-winter-note>
          <strong>{winterBadge.head}</strong> {winterBadge.body}
        </div>
      )}

      <SiteTuner />

      <div class="attr-footer">
        {T('studio.postcard.attrClimate')} <strong>canopi-climate v0.7.0</strong> (COPERNICUS/DEM/GLO30 &amp; MERIT/Hydro, ODbL 1.0) · {T('studio.postcard.attrData')} <strong>canopi-data Schema 4.9</strong>
      </div>
    </section>
  );
}
