# Canopi Website Context

This context defines product-edition and ecosystem language used by the Canopi marketing website.

## Language

**Canopi Desktop**:
The native Canopi edition distributed as OS-specific installers for Linux, macOS, and Windows. The website treats Desktop as one edition, with platform-specific installer choices secondary.
_Avoid_: Native version, app download

**Canopi Web**:
The browser edition of Canopi opened from the website. It is a separate edition from Desktop and has a smaller plant catalog.
_Avoid_: Web download, embedded app

**Agroecology network**:
Organizations connected to the broader agroecology ecosystem that Canopi serves. The term does not imply a formal partnership, endorsement, or customer relationship.
_Avoid_: Partners, related organizations, organizations using Canopi

**Canvas tools**:
The shared visual design tools available in both Canopi Desktop and Canopi Web for working on the design canvas. The website uses this concise term instead of enumerating the whole toolbar.
_Avoid_: Left toolbar features, all canvas features

## Example Dialogue

Developer: "Should the hero show Linux, macOS, and Windows as three products?"
Domain expert: "No. They are installer choices for Canopi Desktop. Canopi Web is the second edition."

Developer: "Should the organization section say partners?"
Domain expert: "No. Use Agroecology network unless a formal partnership is confirmed."

Developer: "Should the edition cards list every toolbar tool?"
Domain expert: "No. Say Canvas tools under both editions."

## Approved homepage (October 2026)

The home page opens on the Canopi title over a painting in each locale's own tradition (day and night versions), revealed by the cursor, with an OS-aware download and Canopi Web. Below: the design finder, where a map of featured designs (grouped into clusters as they grow) and a list nearest first, sorted by the visitor's location only when they ask, sit beside the selected design drawn as the app draws it; then the agroecology network, and a contact form that keeps the address private. Donations go through HelloAsso in our own dialog. Desktop downloads keep the native dialog with a device recommendation and alternative installers; do not send the primary download flow through GitHub release pages.

Release metadata lives in `src/data/release.ts`, site links in `src/data/site.ts` (including the hidden Docs slot) and device detection in `src/lib/installer.mjs`. All UI copy is localized. Fonts are self-hosted under `public/fonts/` with their licenses.

Cloudflare Workers Builds deploys the `projectcanopi` service automatically from `master`. Canopi Web remains a separate deployment at `web.projectcanopi.com`. The optional legacy `/app/` artifact installer is retained for its documented compatibility contract.
