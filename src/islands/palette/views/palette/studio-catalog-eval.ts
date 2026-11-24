import type { Taxon } from '../../../../lib/palette/index.ts';
import * as store from '../../store.ts';
import { evaluateStudioCatalog, type StudioCatalogEvaluation } from '../../rules/studio-fit.ts';
import { climateStress, designEnvelope, microclimate, plantingConfig, wateringMode } from '../../state/studio.ts';

/** Evaluate a catalog against all 8 live studio/site signal inputs. */
export function evaluateLiveStudioCatalog(catalog: readonly Taxon[]): StudioCatalogEvaluation {
  return evaluateStudioCatalog(catalog, {
    loc: store.location.value,
    climate: store.climate.value,
    period: store.period.value,
    envelope: designEnvelope.value,
    stress: climateStress.value,
    microclimate: microclimate.value,
    siteEdits: store.siteEdits.value,
    wateringMode: wateringMode.value,
    room: store.room.value,
    plotAreaM2: plantingConfig.value.plotAreaM2,
    baseVerdicts: store.allVerdicts.value ?? store.poolVerdicts.value,
  });
}
