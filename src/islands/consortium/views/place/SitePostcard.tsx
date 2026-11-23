/** @jsxImportSource preact */
// Step 1 Site & Climate Postcard (Stage 1 — 1:1 port of v14 mockup-01-onboard):
// - Thick ink left-bordered .ct-postcard with place header + compact country/climate tag
// - 3 hairline editorial rows: WINTER & FROST, SUMMER & RAIN, SOIL & SUBSOIL
// - Mild-winter advantage line when applicable
// - Collapsible "Tune canopi-climate readings & microclimate (live updates)" hosting sliders + PlaceFigures
// - ODbL 1.0 + canopi-data Schema 4.9 attribution footer
import { siteClimate as climateOf } from '../../../../lib/consortium/index.ts';
import { location as siteLocation, climate, country, siteEdits } from '../../store.ts';
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
  const cLabel = cCode ? `${countryName(cCode)} invasive list active` : 'No invasive list active';

  const heading = loc?.label || (z ? `${zoneName(z)} climate` : 'Select a town or sample plot');
  const activeZone = sc?.zone ?? sc?.suggested ?? z;
  const summary = profile.hasLive && sc
    ? `${activeZone ? zoneName(activeZone) : 'Local'} climate (Köppen ${sc.koppen}) read on-device from your 11 km climate & soil grid${profile.ph != null ? ` (soil pH ${profile.ph.toFixed(1)}, ${profile.phReaction})` : ''}.`
    : z
      ? `Using the ${zoneName(z)} regional climate baseline. Search a town or click a sample plot above for local soil pH and 2050s warming.`
      : 'Pick a sample plot above or enter your town/coordinates to read local 1-in-10-yr freezes, summer heat peaks, and soil pH from on-device tiles.';

  const frostNote = profile.hasLive
    ? profile.frostFreeDays != null
      ? `${profile.frostFreeDays} frost-free days${profile.falseSpringPct != null && profile.falseSpringPct >= 15 ? ` · ${profile.falseSpringPct}% false spring` : ''}`
      : profile.winterClass
    : null;

  const winterLine = profile.hasLive && profile.coldFreeze10yrC != null && profile.typicalColdNightC != null
    ? `1-in-10-yr freeze ${formatFreezeTag(profile.coldFreeze10yrC, profile.coldFreezeIsEst)}${profile.coldFreezeIsEst ? ' (est.)' : ''} · Typical ${profile.coldMonth} night ${signedTemp1(profile.typicalColdNightC)} · ${frostNote}`
    : z
      ? `${zoneName(z)} baseline · ${profile.winterClass}`
      : 'Awaiting location — pick a sample plot or search';

  const summerLine = profile.hasLive && profile.heatPeak10yrC != null && profile.typicalWarmHighC != null
    ? `1-in-10-yr heat peak ${formatHeatPeakTag(profile.heatPeak10yrC, profile.heatPeakIsEst)}${profile.heatPeakIsEst ? ' (est.)' : ''} · Typical ${profile.warmMonth} afternoon ${profile.typicalWarmHighC.toFixed(1)} °C${profile.moistureRegime ? ` · ${profile.moistureRegime}` : ''}${profile.dryStreakDays != null ? ` · ~${profile.dryStreakDays}d dry spell` : ''}`
    : 'Read automatically from local climate tiles';

  const winterBadge = profile.hasLive && profile.typicalColdNightC != null && profile.coldFreeze10yrC != null
    ? profile.winterTier === 'mild'
      ? {
          head: '❄ Mild-winter advantage:',
          body: `${profile.winterSeason} stays frost-rare (typical ${profile.coldMonth} night ${signedTemp1(profile.typicalColdNightC)}) — sow cool-season species in autumn to build deep roots on winter rain.`,
        }
      : profile.winterTier === 'cool'
        ? {
            head: '❄ Cool-season window:',
            body: `mild daytime winters let hardy greens & cover crops establish on winter rain, though occasional overnight freezes still occur (1-in-10-yr freeze ${formatFreezeTag(profile.coldFreeze10yrC, profile.coldFreezeIsEst)}).`,
          }
        : {
            head: '❄ Dormant-winter advantage:',
            body: `reliable winter cold meets chill needs for temperate fruit & nut trees (typical ${profile.coldMonth} night ${signedTemp1(profile.typicalColdNightC)}) — plant hardy bare-root stock in late autumn or early spring on thawed soil.`,
          }
    : z === 'Subtropical' || z === 'Tropical'
      ? {
          head: '❄ Mild-winter advantage:',
          body: 'winter stays frost-rare — sow cool-season species in autumn to build deep roots on winter rain.',
        }
      : z === 'Mediterranean'
        ? {
            head: '❄ Cool-season window:',
            body: 'mild daytime winters let hardy greens & cover crops establish on winter rain, though occasional overnight freezes still occur.',
          }
        : null;

  return (
    <section class="postcard" data-site-postcard aria-label="Site climate summary">
      <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
        <strong class="ct-postcard-title" style="font-family:var(--font-display); font-size:18px;">{heading}</strong>
        <span style="font-size:12.5px; color:var(--ink-muted);">From canopi-climate v0.7.0 · {cLabel}</span>
      </div>
      <p style="margin:0; font-size:14.5px; color:var(--ink-soft);">{summary}</p>

      <div class="ob-forces-list">
        <div class="ob-force-row">
          <span class="ob-fk">WINTER &amp; FROST</span>
          <span class="ob-fv">{winterLine}</span>
        </div>
        <div class="ob-force-row">
          <span class="ob-fk">SUMMER &amp; RAIN</span>
          <span class="ob-fv">{summerLine}</span>
        </div>
        <div class="ob-force-row">
          <span class="ob-fk">SOIL &amp; SUBSOIL</span>
          <span class="ob-fv">
            {profile.ph != null
              ? `Topsoil pH ${profile.ph.toFixed(1)} (${profile.phReaction})${profile.soilTexture ? ` · ${profile.soilTexture}` : ''}`
              : 'Baseline soil grid · editable below'}
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
        Climate &amp; terrain: <strong>canopi-climate v0.7.0</strong> (COPERNICUS/DEM/GLO30 &amp; MERIT/Hydro, ODbL 1.0) · Plant data: <strong>canopi-data Schema 4.9</strong>
      </div>
    </section>
  );
}
