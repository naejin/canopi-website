# Canopi Website Context

This context defines product-edition, ecosystem and consortium-data language used by the Canopi marketing website.

## Language

**Canopi Desktop**:
The native Canopi edition distributed as OS-specific installers for Linux, macOS, and Windows. The website treats Desktop as one edition, with platform-specific installer choices secondary.
_Avoid_: Native version, app download

**Canopi Web**:
The browser edition of Canopi opened from the website. It is a separate edition from Desktop, with shorter plant details and fewer filters.
_Avoid_: Web download, embedded app

**Agroecology network**:
Organizations connected to the broader agroecology ecosystem that Canopi serves. The term does not imply a formal partnership, endorsement, or customer relationship.
_Avoid_: Partners, related organizations, organizations using Canopi

**Canvas tools**:
The shared visual design tools available in both Canopi Desktop and Canopi Web for working on the design canvas. The website uses this concise term instead of enumerating the whole toolbar.
_Avoid_: Left toolbar features, all canvas features

**Owner correction**:
A plant value the project owner changed in canopi-data's `corrections.tsv`; it wins over every source and can be reverted. In the consortium tool a corrected toxicity warning names "Canopi correction" among its sources; other corrected values carry no mark of their own, since traits and names cite no source per value. A reader's "Suggest a correction" report is not one: it is a suggestion the owner reviews, and only the owner turns it into a correction.
_Avoid_: User correction, fix, edit (for a reader's report: say suggestion)

**Estimate**:
A value no dataset records: worked out from observations (such as months from dated photos), read from a text by a rule, or answered by a language model, which is published as the owner's estimate. In a plant's details it carries the inline word "estimate" and one legend line; a recorded value carries no marker.
_Avoid_: Guess, approximation, AI value, prediction

**Yield-gain pairing**:
Two plants of the same climate list grown together with a yield gain in field trials (median land equivalent ratio above 1). A plant's details list it as a positive check ("Grown with … with a yield gain"); it is never a conflict and never changes a suggestion.
_Avoid_: Companion plant, good neighbour, guild partner

## Example Dialogue

Developer: "Should the hero show Linux, macOS, and Windows as three products?"
Domain expert: "No. They are installer choices for Canopi Desktop. Canopi Web is the second edition."

Developer: "Should the organization section say partners?"
Domain expert: "No. Use Agroecology network unless a formal partnership is confirmed."

Developer: "Should the edition cards list every toolbar tool?"
Domain expert: "No. Say Canvas tools under both editions."

Developer: "A reader sent a correction for a plant's height. Is it an Owner correction now?"
Domain expert: "No. It is a suggestion until the owner promotes it in canopi-data."

Developer: "Should bloom months from dated photos look like recorded ones?"
Domain expert: "No. Mark them with the word estimate and keep the legend line."

## Approved homepage (October 2026)

The home page opens on the Canopi title over a painting in each locale's own tradition (day and night versions), revealed by the cursor, with a one-line proof (free, open source, non-profit, 11 languages), an OS-aware download and Canopi Web. Below, in order: what the app does, with captures of Canopi Web in the page's language and theme (a fictional example design, labelled as such); a real featured design drawn as the app draws it, with a plain list of the others (the map of designs was removed in November 2026); the two ways in that need no install, the consortium tool and the field guides; who makes Canopi; the bibliography; the agroecology network, folded; and a contact form that keeps the address private. Donations go through HelloAsso in our own dialog. Desktop downloads keep the native dialog with a device recommendation and alternative installers; do not send the primary download flow through GitHub release pages.

Release metadata lives in `src/data/release.ts`, site links in `src/data/site.ts` (including the hidden Docs slot) and device detection in `src/lib/installer.mjs`. All UI copy is localized. Fonts are self-hosted under `public/fonts/` with their licenses.

Cloudflare Workers Builds deploys the `projectcanopi` service automatically from `master`. Canopi Web remains a separate deployment at `web.projectcanopi.com`. The optional legacy `/app/` artifact installer is retained for its documented compatibility contract.
