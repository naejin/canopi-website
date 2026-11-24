/** @jsxImportSource preact */
// Step 1 Site & Climate Postcard (Stage 3 — 1:1 port of approved v0.7.0 Stage 1 Mockup):
// - Real v0.7.0 1-in-10 freeze/heat (drops "(est.)" when measured), last & 1-in-10 late frost dates,
//   frost-free days, false-spring %, >=35C days, CDD, VPD, ERA5-Land warming trend whisper
// - Engine 1: Visual Root-Zone Water Tank bar (.tank-box)
// - Engine 2: Topsoil vs Subsoil Trap callout (.callout.is-warn)
// - Engine 3: Terrain & Drainage row + Cold-Air Frost Pocket callout (.callout.is-winter)
// - Sources footer with canopi-climate v0.7.0 + canopi-data Schema 4.10
import { siteClimate as climateOf } from '../../../../lib/palette/index.ts';
import { location as siteLocation, climate, country, siteEdits } from '../../store.ts';
import { T } from '../../strings.ts';
import { countryName, zoneName } from '../kit/names.ts';
import { microclimate } from '../../state/studio.ts';
import { wasmMicro } from '../../state/climate-v07.ts';
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
  const profile = siteClimateProfile(loc, z, mc, edits, wasmMicro.value);
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

  const estTag = ` (${T('studio.postcard.est')})`;
  const frostNote = profile.hasLive
    ? profile.frostFreeDays != null
      ? `${T('studio.postcard.frostFreeDays', { days: profile.frostFreeDays })}${profile.falseSpringPct != null && profile.falseSpringPct >= 15 ? ` · ${T('studio.postcard.falseSpring', { pct: profile.falseSpringPct })}` : ''}`
      : profile.winterClass
    : null;

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

  // Engine 1: Water Tank bar geometry
  const hasTank = profile.hasLive && profile.dryDaysReserve != null && profile.dryStreakDays != null;
  const reserveDays = profile.dryDaysReserve ?? 0;
  const cddDays = profile.dryStreakDays ?? 0;
  const gapDays = profile.droughtGapDays ?? 0;
  const fillPct = hasTank ? Math.min(100, Math.round((reserveDays / Math.max(1, reserveDays, cddDays)) * 100)) : 0;
  const gapWidth = Math.max(0, 100 - fillPct);

  return (
    <section class="postcard" data-site-postcard aria-label={T('studio.postcard.aria')}>
      <div style="display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
        <strong class="ct-postcard-title" style="font-family:var(--font-display); font-size:18px;">{heading}</strong>
        <span style="font-size:12.5px; color:var(--ink-muted);">{T('studio.postcard.sourceMeta', { invasive: cLabel })}</span>
      </div>
      <p style="margin:0; font-size:14.5px; color:var(--ink-soft);">{summary}</p>

      <div class="ob-forces-list">
        {/* Row 1: Winter & Frost */}
        <div class="ob-force-row">
          <span class="ob-fk">{T('studio.postcard.rowWinter')}</span>
          <span class="ob-fv">
            <div class="sc-inline">
              <span>{winterLine}</span>
              {profile.hasLive && !profile.coldFreezeIsEst && (
                <span class="pill is-winter">{T('studio.v07.measured')}</span>
              )}
              {profile.hasLive && profile.falseSpringPct != null && profile.falseSpringPct >= 15 && (
                <span class={`pill${profile.falseSpringPct >= 25 ? ' is-warn' : ''}`}>
                  {T('studio.postcard.falseSpring', { pct: profile.falseSpringPct })}
                </span>
              )}
            </div>
            {profile.hasLive && (profile.lastSpringFrostLabel || profile.lateFrostP90Label) && (
              <div class="sc-inline" style="color:var(--ink-soft); font-size:13px; margin-top:4px;">
                {profile.lastSpringFrostLabel && (
                  <span>{T('studio.v07.lastSpringFrost')} <strong>{profile.lastSpringFrostLabel}</strong></span>
                )}
                {profile.lateFrostP90Label && (
                  <>
                    <span>·</span>
                    <span>{T('studio.v07.lateFrostP90')} <strong>{profile.lateFrostP90Label}</strong></span>
                  </>
                )}
                {profile.frostFreeDays != null && (
                  <>
                    <span>·</span>
                    <span>{T('studio.postcard.frostFreeDays', { days: profile.frostFreeDays })}</span>
                  </>
                )}
              </div>
            )}
          </span>
        </div>

        {/* Row 2: Summer & Rain */}
        <div class="ob-force-row">
          <span class="ob-fk">{T('studio.postcard.rowSummer')}</span>
          <span class="ob-fv">
            <div>{summerLine}</div>
            {profile.hasLive && (profile.heatDays35 != null || profile.vpdSummerKpa != null) && (
              <div class="sc-inline" style="color:var(--ink-soft); font-size:13px; margin-top:4px;">
                {profile.heatDays35 != null && (
                  <span>{T('studio.v07.heatDays35', { n: profile.heatDays35.toFixed(1) })}</span>
                )}
                {profile.heatDays35 != null && profile.vpdSummerKpa != null && <span>·</span>}
                {profile.vpdSummerKpa != null && (
                  <span>
                    {T('studio.v07.vpdSummer', {
                      kpa: profile.vpdSummerKpa.toFixed(2),
                      note: profile.vpdSummerKpa >= 1.6 ? T('studio.v07.vpdDry') : T('studio.v07.vpdMod'),
                    })}
                  </span>
                )}
              </div>
            )}
            {profile.hasLive && profile.recentTrendC != null && profile.recentTrendC > 0 && (
              <div class="whisper" style="margin-top:3px;">
                {T('studio.v07.trendWhisper', { delta: `+${profile.recentTrendC.toFixed(1)} °C` })}
              </div>
            )}
          </span>
        </div>

        {/* Row 3: Soil & Subsoil + Engine 1 Water Tank + Engine 2 Subsoil Trap */}
        <div class="ob-force-row">
          <span class="ob-fk">{T('studio.postcard.rowSoil')}</span>
          <span class="ob-fv">
            <div class="sc-inline">
              <span>
                {profile.ph != null
                  ? `${T('studio.postcard.topsoilPh', { ph: profile.ph.toFixed(1), reaction: profile.phReaction ?? '' })}${profile.soilTexture ? ` · ${profile.soilTexture}` : ''}${profile.omPct != null ? ` · ${profile.omPct.toFixed(1)}% OM` : ''}${profile.cfvoTopPct != null ? ` · ${T('studio.v07.stonesPct', { pct: profile.cfvoTopPct })}` : ''}`
                  : T('studio.postcard.soilBaseline')}
              </span>
            </div>

            {hasTank && (
              <div class="tank-box" data-water-tank>
                <div class="tank-head">
                  <strong>{T('studio.v07.waterTankTitle')}</strong>
                  <span class={`pill ${gapDays > 0 ? 'is-warn' : 'is-green'}`}>
                    {gapDays > 0 ? T('studio.v07.tankGapBadge', { days: gapDays }) : T('studio.v07.tankBufferedBadge')}
                  </span>
                </div>
                <div class="tank-track" aria-hidden="true">
                  <div class="tank-fill" style={{ width: `${fillPct}%` }} />
                  {gapDays > 0 && <div class="tank-gap" style={{ left: `${fillPct}%`, width: `${gapWidth}%` }} />}
                </div>
                <div class="tank-caption">
                  {gapDays > 0
                    ? T('studio.v07.tankGapCaption', { reserve: reserveDays, cdd: cddDays, gap: gapDays })
                    : T('studio.v07.tankBufCaption', { reserve: reserveDays, cdd: cddDays, buf: reserveDays - cddDays })}
                </div>
              </div>
            )}

            {profile.subsoilTrap && profile.ph != null && profile.subsoilPh != null ? (
              <div class="callout is-warn" data-subsoil-trap>
                <strong>⚠ {T('studio.v07.subsoilTrapHead')}</strong>{' '}
                {T('studio.v07.subsoilTrapBody', {
                  top: profile.ph.toFixed(1),
                  sub: profile.subsoilPh.toFixed(1),
                  diff: Math.abs(profile.subsoilPh - profile.ph).toFixed(1),
                })}
              </div>
            ) : profile.subsoilPh != null ? (
              <div class="whisper" style="margin-top:4px;">
                {T('studio.v07.subsoilClean', {
                  sub: profile.subsoilPh.toFixed(1),
                  stones: profile.cfvoSubPct ?? 0,
                })}
              </div>
            ) : null}
          </span>
        </div>

        {/* Row 4: Engine 3 Terrain & Drainage (shown when v0.7.0 terrain is loaded) */}
        {profile.hasLive && profile.elevTotalM != null && (
          <div class="ob-force-row" data-terrain-row>
            <span class="ob-fk">{T('studio.v07.rowTerrain')}</span>
            <span class="ob-fv">
              <div class="sc-inline">
                <span>{T('studio.v07.elevLabel', { m: `${profile.elevTotalM} m` })}</span>
                {profile.slopeDeg != null && (
                  <>
                    <span>·</span>
                    <span>{T('studio.v07.slopeLabel', { deg: profile.slopeDeg.toFixed(1), aspect: T(`studio.tuner.aspect.${mc.aspect}`) })}</span>
                  </>
                )}
                {profile.handM != null && (
                  <>
                    <span>·</span>
                    <span>
                      {T('studio.v07.handLabel', {
                        m: `${profile.handM.toFixed(1)} m`,
                        note: profile.handM <= 5 ? T('studio.v07.handValley') : T('studio.v07.handDrained'),
                      })}
                    </span>
                  </>
                )}
              </div>
              {profile.frostPocket ? (
                <div class="callout is-winter" data-frost-pocket-alert>
                  <strong>❄ {T('studio.v07.frostPocketHead')}</strong>{' '}
                  {T('studio.v07.frostPocketBody', {
                    hand: profile.handM != null ? `${profile.handM.toFixed(1)} m` : '—',
                    relief: `${profile.reliefM ?? 0} m`,
                  })}
                </div>
              ) : (
                <div class="whisper" style="margin-top:3px;">
                  {T('studio.v07.noFrostPocket', {
                    hand: profile.handM != null ? `${profile.handM.toFixed(1)} m` : '—',
                    relief: `${profile.reliefM ?? 0} m`,
                  })}
                </div>
              )}
            </span>
          </div>
        )}
      </div>

      {winterBadge && (
        <div class="ob-mild-line" data-mild-winter-note>
          <strong>{winterBadge.head}</strong> {winterBadge.body}
        </div>
      )}

      <SiteTuner />

      <div class="attr-footer">
        {T('studio.postcard.attrClimate')} <strong>canopi-climate v0.7.0</strong> (ERA5-Land · NEX-GDDP-CMIP6 · TerraClimate · SoilGrids 2.0 · COPERNICUS DEM GLO-30 · MERIT-Hydro ODbL 1.0) · {T('studio.postcard.attrData')} <strong>canopi-data Schema 4.10</strong>
      </div>
    </section>
  );
}
