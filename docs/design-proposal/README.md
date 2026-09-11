# Canopi homepage design proposal

Review concept prepared September 11, 2026. This folder is outside Astro's production routes. It does not replace the current homepage.

Open `http://localhost:4322/docs/design-proposal/` while serving the repository root with `python3 -m http.server 4322`. The relative assets also support opening `index.html` directly. Fonts are self-hosted here with their licenses; app imagery and global styles reuse repository assets.

## Critique

The [live homepage](https://projectcanopi.com/) has a coherent identity worth keeping: parchment surfaces, ochre accents, the recognizable logo, and Lora/Inter typography. The restrained navigation and accessible native download disclosure are also strengths. This proposal is an evolution of that identity.

The main weakness is the allocation of attention. At a 1440 × 900 viewport, the product video begins around y=670. Much of the first screen goes to whitespace, a second logo, the headline, and download controls. On a 390 × 844 phone viewport, the video begins around y=637. A visitor must commit attention before seeing much of the software.

The headline communicates purpose but does not explain the tool. A short sentence about plant information and the design canvas would make the offer concrete. The current page asks visitors to choose Desktop or Web without explaining the catalog difference documented in CONTEXT.md.

The autoplay demo can initially show an almost empty canvas. The supplied screenshot, showing a detailed syntropic orchard plan and an apple tree profile, offers more immediate evidence. It also connects the warm visual identity to an actual plant rather than adding unrelated decorative imagery.

At desktop size the network section occupies approximately 2,163px of the page, compared with approximately 1,331px for the entire hero and demo. That makes an ecosystem directory the dominant reading experience. These are relevant organizations, but they should not carry the burden of explaining or validating the product. They are not presented as customers or partners.

These are design judgments based on browser inspection, not measured conversion findings. No analytics or user testing was available.

## Proposed direction

Keep the existing brand and make the product the focal point. Use a two-line headline, a concrete explanation, and the supplied app screenshot alongside each other. The screenshot begins at y=160 on desktop and links to the full-resolution source. At 1280 × 800, both hero actions remain visible.

Follow with two short, observable capabilities: exploring plant information and arranging a planting plan. Keep the real demonstration as a user-controlled video further down. Explain the editions before sending visitors to the browser or installer releases. Retain all 17 organizations in seven native expandable country/region groups.

Design settings: variance 5, motion 2, density 3. Native HTML/CSS uses the established Canopi palette, Lora display and Inter body at weights 400/600. Motion only provides button feedback. Existing global grain is reused. The primary light-theme button uses the existing darker ochre hover shade to improve text contrast.

## Preview scope and validation

This is an English review prototype. Production localization, platform-detected direct downloads, and the existing language menu remain in the live components. The prototype links to GitHub releases for installer selection and the current site for language selection. The light app screenshot intentionally remains an authentic screenshot when the surrounding page switches to dark mode.

Desktop, laptop and mobile screenshots accompany the prototype. Browser checks cover image/font loading, horizontal overflow, the theme toggle, expandable directory, video controls and real link destinations. The page has keyboard focus styling and a skip link. No new dependencies or production translation keys are introduced.

The proposal uses the user-supplied orchard screenshot unchanged in the hero and as the video poster. The demo recording itself is unchanged. No invented interface or fabricated product outcome is used here.
