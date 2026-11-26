/* @ts-self-types="./canopi_climate.d.ts" */

/**
 * Adjust a 0.1-degree site climate (`SiteClimate`) to local topography
 * (`MicroclimateInput`: `site_elev_m`, `slope_deg`, `aspect_deg`, `topo_position`).
 * Returns [`crate::microclimate::MicroclimateAdjustment`] as a plain object.
 *
 * # Errors
 * Throws on deserialization failure or invalid non-finite topography inputs.
 * @param {any} site
 * @param {any} input
 * @returns {any}
 */
export function adjustMicroclimate(site, input) {
    const ret = wasm.adjustMicroclimate(site, input);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Evaluate a species' multi-decade ecological trajectory (`TrajectorySiteInput`,
 * `SpeciesEnvelope`). Returns [`crate::trajectory::TrajectoryResult`] as a plain
 * object (`periods`, `trajectory_class`, `establishment_vs_maturity_gap`, `has_gap`).
 *
 * # Errors
 * Throws on deserialization or serialization failure.
 * @param {any} site
 * @param {any} envelope
 * @returns {any}
 */
export function evaluateTrajectory(site, envelope) {
    const ret = wasm.evaluateTrajectory(site, envelope);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Search an `analogues.bin` binary index for the closest historical
 * (1991–2020) climate twins matching `query` (`AnalogueQuery`) with optional
 * `options` (`SearchOptions`). Returns an [`crate::analogues::AnalogueResult`]
 * plain object (`novel_climate`, `best_sigma`, `matches[]`).
 *
 * # Errors
 * Throws when `indexBytes` is not a valid `analogues.bin` buffer or when
 * `query`/`options` cannot be deserialized.
 * @param {Uint8Array | number[]} index_bytes
 * @param {any} query
 * @param {any} options
 * @returns {any}
 */
export function findAnalogues(index_bytes, query, options) {
    const ptr0 = passArray8ToWasm0(index_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.findAnalogues(ptr0, len0, query, options);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode a tile and look a point up (nearest complete cell within 2
 * cells). Returns the [`crate::lookup::Lookup`] as a plain object, or `null`
 * when no land cell with data is near.
 *
 * # Errors
 * Throws when the bytes are not a grid tile, the coordinate is invalid or
 * the point lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} lat
 * @param {number} lon
 * @returns {any}
 */
export function lookup(tile_bytes, lat, lon) {
    const val2 = +lat;
    const val3 = +lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookup(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode an extremes tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::extremes::ExtremesLookup`] as a plain object (`periods[]` with
 * `tmin_extreme_c`, `tmax_extreme_c`, `usda_zone`), or `null` when that
 * cell has no extremes.
 *
 * # Errors
 * Throws when the bytes are not an extremes tile, the coordinate is
 * invalid or the cell lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} cell_lat
 * @param {number} cell_lon
 * @returns {any}
 */
export function lookupExtremes(tile_bytes, cell_lat, cell_lon) {
    const val2 = +cell_lat;
    const val3 = +cell_lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupExtremes(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode an `extremes_tail` tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::extremes_tail::ExtremesTailLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not an extremes_tail tile, the coordinate is
 * invalid or the cell lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} cell_lat
 * @param {number} cell_lon
 * @returns {any}
 */
export function lookupExtremesTail(tile_bytes, cell_lat, cell_lon) {
    const val2 = +cell_lat;
    const val3 = +cell_lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupExtremesTail(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode a `frost_calendar` tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::frost_calendar::FrostCalendarLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not a frost_calendar tile, the coordinate is
 * invalid or the cell lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} cell_lat
 * @param {number} cell_lon
 * @returns {any}
 */
export function lookupFrostCalendar(tile_bytes, cell_lat, cell_lon) {
    const val2 = +cell_lat;
    const val3 = +cell_lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupFrostCalendar(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode a `monthly` tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::monthly::MonthlyLookup`] as a plain object (`periods[]` with
 * `tmean_c`, `tmin_c`, `dry_mask`, `dry_months`, `gdd_base_10`,
 * `chill_months`), or `null` when that cell has no data.
 *
 * # Errors
 * Throws when the bytes are not a monthly tile, the coordinate is invalid
 * or the cell lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} cell_lat
 * @param {number} cell_lon
 * @returns {any}
 */
export function lookupMonthly(tile_bytes, cell_lat, cell_lon) {
    const val2 = +cell_lat;
    const val3 = +cell_lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupMonthly(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode a `monthly_precip` tile (0.25-degree grid) and look a point up
 * (own cell, else nearest valid cell within radius 1 for coastal fallback).
 * Returns the [`crate::monthly_precip::MonthlyPrecipLookup`] as a plain
 * object (`periods[]` with `precip_mm`), or `null`.
 *
 * # Errors
 * Throws when the bytes are not a monthly_precip tile, the coordinate is
 * invalid or the point lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} lat
 * @param {number} lon
 * @returns {any}
 */
export function lookupMonthlyPrecip(tile_bytes, lat, lon) {
    const val2 = +lat;
    const val3 = +lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupMonthlyPrecip(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode a `phenology` tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::phenology::PhenologyLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not a phenology tile, the coordinate is invalid
 * or the cell lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} cell_lat
 * @param {number} cell_lon
 * @returns {any}
 */
export function lookupPhenology(tile_bytes, cell_lat, cell_lon) {
    const val2 = +cell_lat;
    const val3 = +cell_lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupPhenology(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode a regions tile and look a point up. Returns the
 * [`crate::regions::RegionsLookup`] as a plain object: `wgsrpd_l3` (e.g.
 * `"FRA"`) and `iso_a2` (e.g. `"FR"`), each `null` when no area is within
 * 2 cells.
 *
 * # Errors
 * Throws when the bytes are not a regions tile, the coordinate is invalid
 * or the point lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} lat
 * @param {number} lon
 * @returns {any}
 */
export function lookupRegions(tile_bytes, lat, lon) {
    const val2 = +lat;
    const val3 = +lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupRegions(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode a soil tile and look a point up (its cell, else the nearest cell
 * with soil values within 2 cells). Returns the
 * [`crate::soil::SoilLookup`] as a plain object (`ph_h2o`, `sand_pct`,
 * `clay_pct`, `silt_pct`, `texture`, `filled`, ...), or `null`.
 *
 * # Errors
 * Throws when the bytes are not a soil tile, the coordinate is invalid or
 * the point lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} lat
 * @param {number} lon
 * @returns {any}
 */
export function lookupSoil(tile_bytes, lat, lon) {
    const val2 = +lat;
    const val3 = +lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupSoil(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode a `soil_plus` tile (0.05-degree, 6 bands) and look a point up.
 * Returns [`crate::soil_plus::SoilPlusLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not a `soil_plus` tile, the coordinate is invalid,
 * or the point lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} lat
 * @param {number} lon
 * @returns {any}
 */
export function lookupSoilPlus(tile_bytes, lat, lon) {
    const val2 = +lat;
    const val3 = +lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupSoilPlus(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode a `terrain` tile (0.1-degree, 4 bands) and read the cell holding
 * (`cellLat`, `cellLon`): pass the climate lookup's `cell_lat` and `cell_lon`.
 * Returns [`crate::terrain::TerrainLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not a `terrain` tile, the coordinate is invalid,
 * or the cell lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} cell_lat
 * @param {number} cell_lon
 * @returns {any}
 */
export function lookupTerrain(tile_bytes, cell_lat, cell_lon) {
    const val2 = +cell_lat;
    const val3 = +cell_lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupTerrain(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Decode a `water_balance` tile and read the cell holding (`cellLat`, `cellLon`):
 * pass the climate lookup's `cell_lat` and `cell_lon`. Returns the
 * [`crate::water_balance::WaterBalanceLookup`] as a plain object, or `null`.
 *
 * # Errors
 * Throws when the bytes are not a water_balance tile, the coordinate is invalid
 * or the cell lies in another tile.
 * @param {Uint8Array | number[]} tile_bytes
 * @param {number} cell_lat
 * @param {number} cell_lon
 * @returns {any}
 */
export function lookupWaterBalance(tile_bytes, cell_lat, cell_lon) {
    const val2 = +cell_lat;
    const val3 = +cell_lon;
    const ptr0 = passArray8ToWasm0(tile_bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.lookupWaterBalance(ptr0, len0, val2, val3);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Compute annual FAO-56 geometric photoperiod summary for `lat` (`-90..=90`),
 * returning `{ min_hours, max_hours, amplitude_hours, monthly_hours,
 * polar_night_days, midnight_sun_days }` or `null` if invalid.
 *
 * # Errors
 * Throws only on serialization failure.
 * @param {number} lat
 * @returns {any}
 */
export function photoperiod(lat) {
    const ret = wasm.photoperiod(lat);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Compute Saxton & Rawls (2006) soil Available Water Capacity from fine-earth
 * texture (`sandPct`, `clayPct`, optional `omPct` defaulting to `2.5%`),
 * returning `{ field_capacity, wilting_point, awc_mm_per_m, awc_30cm_mm,
 * awc_100cm_mm }` or `null` if out of domain.
 *
 * # Errors
 * Throws only on serialization failure.
 * @param {number} sand_pct
 * @param {number} clay_pct
 * @param {number | null} [om_pct]
 * @returns {any}
 */
export function soilAwc(sand_pct, clay_pct, om_pct) {
    const ret = wasm.soilAwc(sand_pct, clay_pct, !isLikeNone(om_pct), isLikeNone(om_pct) ? 0 : om_pct);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Compute Saxton & Rawls (2006) soil Available Water Capacity discounted for
 * coarse fragments (`cfvo_0_30_pct` for 0–30 cm topsoil and `cfvo_30_100_pct`
 * for 30–100 cm subsoil, in vol %), or `null` if out of domain.
 *
 * # Errors
 * Throws only on serialization failure.
 * @param {number} sand_pct
 * @param {number} clay_pct
 * @param {number | null} [om_pct]
 * @param {number | null} [cfvo_0_30_pct]
 * @param {number | null} [cfvo_30_100_pct]
 * @returns {any}
 */
export function soilAwcWithRock(sand_pct, clay_pct, om_pct, cfvo_0_30_pct, cfvo_30_100_pct) {
    const ret = wasm.soilAwcWithRock(sand_pct, clay_pct, !isLikeNone(om_pct), isLikeNone(om_pct) ? 0 : om_pct, !isLikeNone(cfvo_0_30_pct), isLikeNone(cfvo_0_30_pct) ? 0 : cfvo_0_30_pct, !isLikeNone(cfvo_30_100_pct), isLikeNone(cfvo_30_100_pct) ? 0 : cfvo_30_100_pct);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * USDA texture class id (e.g. `"silt_loam"`) of sand and clay
 * percentages; `undefined` for impossible fractions.
 * @param {number} sand_pct
 * @param {number} clay_pct
 * @returns {string | undefined}
 */
export function textureClass(sand_pct, clay_pct) {
    const ret = wasm.textureClass(sand_pct, clay_pct);
    let v1;
    if (ret[0] !== 0) {
        v1 = getStringFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
}

/**
 * File name of the tile holding a point (e.g. `n50e000.tif`); `undefined`
 * for an invalid coordinate.
 * @param {number} lat
 * @param {number} lon
 * @returns {string | undefined}
 */
export function tileName(lat, lon) {
    const ret = wasm.tileName(lat, lon);
    let v1;
    if (ret[0] !== 0) {
        v1 = getStringFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
}

/**
 * USDA hardiness zone (`1a` ... `13b`) of a coldest night in °C, or
 * `undefined` for non-finite input.
 * @param {number} tmin_extreme_c
 * @returns {string | undefined}
 */
export function usdaZone(tmin_extreme_c) {
    const ret = wasm.usdaZone(tmin_extreme_c);
    let v1;
    if (ret[0] !== 0) {
        v1 = getStringFromWasm0(ret[0], ret[1]);
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    }
    return v1;
}

/**
 * Crate version, for logs and cache keys.
 * @returns {string}
 */
export function version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_208446807d0d1e30: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_Number_ff192a72a0dcdf6d: function(arg0) {
            const ret = Number(arg0);
            return ret;
        },
        __wbg_String_8564e559799eccda: function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_bigint_get_as_i64_11da4b52cd0aedef: function(arg0, arg1) {
            const v = arg1;
            const ret = typeof(v) === 'bigint' ? v : undefined;
            getDataViewMemory0().setBigInt64((arg0 >>> 0) + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_boolean_get_4f1baf9a00be3c74: function(arg0) {
            const v = arg0;
            const ret = typeof(v) === 'boolean' ? v : undefined;
            return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
        },
        __wbg___wbindgen_debug_string_f249a2a76caa9a55: function(arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_in_3f58a9d3b3a7eed2: function(arg0, arg1) {
            const ret = arg0 in arg1;
            return ret;
        },
        __wbg___wbindgen_is_bigint_5fa10641e039d3ef: function(arg0) {
            const ret = typeof(arg0) === 'bigint';
            return ret;
        },
        __wbg___wbindgen_is_function_741ff2bb612836f5: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_c22311b1cc228e3a: function(arg0) {
            const ret = arg0 === null;
            return ret;
        },
        __wbg___wbindgen_is_object_8b968c3ab8e96595: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_fc456fee5d3317de: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_be5b34249ff1fc15: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_jsval_eq_38d7bfbe4cc84039: function(arg0, arg1) {
            const ret = arg0 === arg1;
            return ret;
        },
        __wbg___wbindgen_jsval_loose_eq_b2f214e2e4b30e36: function(arg0, arg1) {
            const ret = arg0 == arg1;
            return ret;
        },
        __wbg___wbindgen_number_get_934b640d0889af78: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64((arg0 >>> 0) + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_string_get_7ce8eee7fd327545: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 1, len1, true);
            getDataViewMemory0().setInt32((arg0 >>> 0) + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_4c88d8bf264fd984: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_call_40b008ba32f73991: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_done_57e08d0be6e30c02: function(arg0) {
            const ret = arg0.done;
            return ret;
        },
        __wbg_entries_7bb1459bd9b5c2b9: function(arg0) {
            const ret = Object.entries(arg0);
            return ret;
        },
        __wbg_get_635eea311fa1a291: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_get_d7176cfb76d71114: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_unchecked_e6325ad374eff861: function(arg0, arg1) {
            const ret = arg0[arg1 >>> 0];
            return ret;
        },
        __wbg_get_with_ref_key_fc601247060b7204: function(arg0, arg1) {
            const ret = arg0[arg1];
            return ret;
        },
        __wbg_instanceof_ArrayBuffer_12cdaa4161423e6b: function(arg0) {
            let result;
            try {
                result = arg0 instanceof ArrayBuffer;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Uint8Array_d7aeb0dcb3108fea: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Uint8Array;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_isArray_bcf1376d0d732d08: function(arg0) {
            const ret = Array.isArray(arg0);
            return ret;
        },
        __wbg_isSafeInteger_1a35ba4d31e71d38: function(arg0) {
            const ret = Number.isSafeInteger(arg0);
            return ret;
        },
        __wbg_iterator_e4c5e8f68ada7b58: function() {
            const ret = Symbol.iterator;
            return ret;
        },
        __wbg_length_186163212ffe79c3: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_length_b03a0fabb109b1e9: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_new_13de428334042d26: function(arg0) {
            const ret = new Uint8Array(arg0);
            return ret;
        },
        __wbg_new_37eb45aaf5eeb820: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_cd4348290afae586: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_next_178c1651c11432b3: function(arg0) {
            const ret = arg0.next;
            return ret;
        },
        __wbg_next_af5ac6a08bb0a717: function() { return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments); },
        __wbg_prototypesetcall_13162965d1fe7aa3: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_set_d2d33b52458e984a: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_e4b9a833d288759a: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbg_value_e0f328965e184931: function(arg0) {
            const ret = arg0.value;
            return ret;
        },
        __wbindgen_generic_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000003: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            table.set(0, undefined);
            table.set(1024, undefined);
            table.set(1025, null);
            table.set(1026, true);
            table.set(1027, false);
        },
    };
    return {
        __proto__: null,
        "./canopi_climate_bg.js": import0,
    };
}

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function debugString(val) {
    switch (typeof val) {
        // primitive types
        case 'number':
        case 'boolean':
        case 'undefined':
        return `${val}`;
        case 'string':
        return JSON.stringify(val);
        case 'bigint':
        return `${val}n`;
        case 'symbol':
        return val.description !== undefined
            ? `Symbol(${val.description})`
            : 'Symbol';
        case 'function':
        return typeof val.name === 'string' && val.name !== ''
            ? `Function(${val.name})`
            : 'Function';
        case 'object': {
            if (val === null) {
                return 'null';
            }
            // objects
            if (Array.isArray(val)) {
                return '[' + Array.from(val, debugString).join(', ') + ']';
            }
            // errors
            if (val instanceof Error) {
                return `${val.name}: ${val.message}\n${val.stack}`;
            }

            const toStringOutput = toString.call(val);
            // Test for built-in
            const className = /\[object ([^\]]+)\]/.exec(toStringOutput)?.[1];

            // Failed to match the standard '[object ClassName]'
            if (className === undefined) {
                return toStringOutput;
            }
            if (className === 'Object') {
                // we're a user defined class or Object
                // JSON.stringify avoids problems with cycles, and is generally much
                // easier than looping through ownProperties of `val`.
                try {
                    return 'Object(' + JSON.stringify(val) + ')';
                } catch (_) {
                    return 'Object';
                }
            }
            // TODO we could test for more things here, like `Set`s and `Map`s.
            return className;
        }
        // Per MDN: 'This list of values is exhaustive.'
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof#description
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(bytes) {
    numBytesDecoded += bytes.length;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true });
        cachedTextDecoder.decode();
        numBytesDecoded = bytes.length;
    }
    return cachedTextDecoder.decode(bytes);
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

let __wbg_init_promise;
async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (__wbg_init_promise === undefined) {
        __wbg_init_promise = __wbg_init_once(module_or_path);
        __wbg_init_promise.catch(() => { __wbg_init_promise = undefined; });
    }
    return __wbg_init_promise;
}

async function __wbg_init_once(module_or_path) {

    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('canopi_climate_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
