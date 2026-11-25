---
type: Module
title: Plant Palette North Star UI
description: Clean-sheet North Star Plant Palette Builder UI (Arrival, Design Board, Plan Surface, Picker/Atlas/Dossier drawers) wired to computeReport() and Schema 4.11 across 11 locales.
generated: { by: antigravity/gemini-4-neon, at: 2026-11-25T02:05:20Z }
sources:
  - id: report-ts
    resource: ../../src/lib/palette/report.ts
    title: src/lib/palette/report.ts
    digest: sha256:8c9ddcda736b847c
    last_modified: 2026-11-25T01:56:08Z
  - id: northstararrival-tsx
    resource: ../../src/islands/palette/views/north-star/NorthStarArrival.tsx
    title: src/islands/palette/views/north-star/NorthStarArrival.tsx
    digest: sha256:23cb997c456501e0
    last_modified: 2026-11-25T01:14:47Z
  - id: northstarstudio-tsx
    resource: ../../src/islands/palette/views/north-star/NorthStarStudio.tsx
    title: src/islands/palette/views/north-star/NorthStarStudio.tsx
    digest: sha256:0d773130ff6b610f
    last_modified: 2026-11-25T01:14:47Z
  - id: designboard-tsx
    resource: ../../src/islands/palette/views/north-star/DesignBoard.tsx
    title: src/islands/palette/views/north-star/DesignBoard.tsx
    digest: sha256:23218546809a81fe
    last_modified: 2026-11-25T01:14:47Z
  - id: plansurface-tsx
    resource: ../../src/islands/palette/views/north-star/PlanSurface.tsx
    title: src/islands/palette/views/north-star/PlanSurface.tsx
    digest: sha256:de3c951fd5c5cd29
    last_modified: 2026-11-25T01:14:47Z
  - id: drawers-tsx
    resource: ../../src/islands/palette/views/north-star/Drawers.tsx
    title: src/islands/palette/views/north-star/Drawers.tsx
    digest: sha256:0a69b91f96d1d943
    last_modified: 2026-11-25T01:46:53Z
  - id: north-star-css
    resource: ../../src/styles/palette/north-star.css
    title: src/styles/palette/north-star.css
    digest: sha256:278f66c44b0e1075
    last_modified: 2026-11-25T01:46:54Z
---

## Overview
The Plant Palette Builder (`/palette/` and 10 localized routes) runs on the clean-sheet North Star architecture (`src/islands/palette/views/north-star/`) styled by `src/styles/palette/north-star.css` (1,117 lines, within the 1,159-line visual-parity budget).

## Core Surfaces
- **Arrival (`NorthStarArrival.tsx`)**: Nominatim place search, browser GPS, 6 global presets, Room pills, 3-signal Land Brief, 2050s SSP2-4.5 Shift Line, and photo-rich starter preview anchored by a woody tree/shrub on garden/field plots.
- **Design (`DesignBoard.tsx` + `LandPanel.tsx`)**: Sticky studio bar, collapsible `Your land` + `Tune site`, Guild Pulse + live-reactive Elevation Profile SVG, 6-cell Job Coverage Strip, `By job` / 7-phase `Sun × Succession` / `Photo grid` views, Kids/Pets toxicity lens, `Already on site` star, and site-scoped Bloom & Fruit calendar.
- **Plan (`PlanSurface.tsx`)**: Crown-area budget with plot-area input, 3 planting waves, and interactive Nursery Checklist.
- **Drawers (`Drawers.tsx`)**: Botanical Picker (761 species / 27,196 names), Climate & Guild Atlas (`Why?`, Walter-Lieth SVG, Water Tank, 10-scenario matrix, Like-for-like Swaps), and Visual Botanical Field Dossier (zero PFAF, localized frost/provenance labels).

## Single Source of Truth & Quality Guarantees
- All verdicts, job stats, robustness pillars, water tank metrics, and starter palettes flow through `computeReport()` in `src/lib/palette/report.ts`.
- Zero mentions of `PFAF` or `Plants For A Future` enforced by `scripts/zero-pfaf.test.mjs` and `scripts/check-built-site.mjs`.
- Stage 2C retired the 22 legacy palette view files and `figures`/`studio` chunk roles, reducing the `palette` chunk from 53.6 KB to 10.6 KB gzip.
