---
version: "superdesign-alpha"
name: "Halftone Circuit"
description: "Dark-mode-default engineering portfolio system built on a dot-matrix halftone texture, oversized condensed display type, and a single rationed cyan accent that carries all emphasis and glow."
colors:
  background: "#000000"
  surface: "#09090B"
  surface-glass: "rgba(0, 0, 0, 0.8)"
  text-primary: "#FFFFFF"
  text-secondary: "#A1A1AA"
  accent: "#00D9FF"
  accent-hover: "#00B8D9"
typography:
  display-lg:
    fontFamily: "Space Grotesk"
    fontSize: "144px"
    fontWeight: 900
    lineHeight: "0.9"
    letterSpacing: "-7.2px"
  headline-md:
    fontFamily: "Space Grotesk"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: "1"
  body-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "24px"
    fontWeight: 300
    lineHeight: "1.33"
  label-md:
    fontFamily: "Space Grotesk"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: "1.2"
  body-base:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.5"
  label-mono:
    fontFamily: "ui-sans-serif"
    fontSize: "13px"
    fontWeight: 700
    style: "uppercase, wide tracking, eyebrow/index labels"
spacing:
  base: "8px"
  gap: "24px"
  gap-lg: "48px"
  gap-xl: "80px"
  section-padding: "160px"
rounded:
  control: "16px"
  card: "24px"
  card-lg: "40px"
  pill: "9999px"
components:
  button-primary-hero:
    background: "#FFFFFF (observed near-white solid)"
    text-color: "#000000"
    radius: "9999px (observed, full pill)"
    height: "~48px (observed)"
    padding: "12px 24px (observed)"
  button-secondary-hero:
    background: "rgba(0,0,0,0.4) glass, translucent outline (observed)"
    text-color: "#FFFFFF"
    radius: "9999px (observed)"
    height: "~48px (observed)"
  button-nav-utility:
    background: "#FFFFFF"
    text-color: "#000000"
    radius: "9999px"
    height: "44px"
    padding: "12px 24px"
  button-cta-final:
    background: "#00D9FF"
    text-color: "#000000"
    radius: "16px"
    height: "76px"
    padding: "24px 0px"
    shadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 217, 255, 0.15) 0px 0px 20px 0px"
    hover-background: "#00B8D9"
    hover-shadow: "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 217, 255, 0.3) 0px 0px 40px 0px"
  card-media-panel:
    background: "transparent"
    radius: "0px"
    padding: "160px 24px"
  card-identity-glass:
    background: "transparent, backdrop-filter blur(12px)"
    radius: "24px"
    padding: "32px"
  card-capability-chip:
    background: "transparent, backdrop-filter blur(12px)"
    radius: "16px"
    padding: "16px"
  navbar:
    background: "rgba(0, 0, 0, 0.8)"
    backdrop-filter: "blur(12px)"
    radius: "0px 0px 0px 0px"
    height: "81px"
    width: "100vw edge-to-edge, 0px inset"
---
# Halftone Circuit
Source: https://p.superdesign.dev/draft/9a469e44-56c5-412a-b2e0-d46a82070f50

## Overview
This is a dark-mode-default technical portfolio system pairing a screen-printed halftone dot texture with a brutalist-adjacent, condensed grotesque display type. The aesthetic reads as engineering-editorial: raw black surfaces, a single wired cyan accent (`#00D9FF`), and huge uppercase Space Grotesk stacks that behave like a spec sheet blown up to poster scale. Glassmorphic cards (blur(12px), transparent fills) float over the black field mid-page, giving the otherwise flat composition a thin layer of depth without ever lightening the base palette.

## Composition
The first screen is dominated by a three-line display stack — two lines in white, the third weighted entirely in accent cyan — sitting center-stage over a full-bleed halftone dot field, with a glowing fingerprint/circuit motif bleeding off the top-left corner. Below the stack: a short two-line body sentence, then a three-button row anchored center. Scrolling down, rhythm alternates between numbered content bands (an eyebrow index like "01 / …" over a headline) and asymmetric two-up image/detail grids — first a large media-left, image-right layout, then a swapped photo-left, code-screenshot-right pairing. A glass identity card with a portrait breaks the rhythm mid-page, followed by a uniform 4-up capability grid, then a two-column contact split closing the page. The deliberate choice is a texture-first, near-monochrome hero with color rationed to text and a corner glow, rejecting a full-frame saturated gradient hero — the density stays low throughout (generous 160px section padding), so despite the loud display type the page never feels cluttered.

## Colors
Background is `#000000`, confirmed dominant at ~70-80% of rendered pixels; the halftone texture reads as dark teal-black dot clusters (`#183030`, `#304848` at ~9-13% combined) laid directly over it, never a separate colored panel. `#09090B` (~8.3%) serves as a near-black card/surface tone marginally lifted from pure black. White (`#FFFFFF`, ~9.9%) carries primary text and the hero's solid button fill. The sole saturated hue is accent cyan `#00D9FF`, rationed to under 1% of pixel area — used only for: the third headline line, small eyebrow labels, link/icon accents, one CTA button fill, and a corner-glow motif. Secondary text sits in muted `#A1A1AA`. No other hue appears; grays and cyan alone carry all hierarchy.

## Typography
Space Grotesk is the display/label voice: a 144px/900, lh 0.9, ls -7.2px display size for hero stacks, dropping to 48px/700 headline for section titles and 30px/700 for standalone label emphasis. Plus Jakarta Sans is the body/reading voice: 24px/300 for hero subtext, settling to 16px/400 body copy at #FFFFFF with #A1A1AA for secondary/meta lines. A small uppercase mono-styled label face (ui-sans-serif, wide-tracked, cyan-colored) marks every eyebrow ("01 / …" style index tags) — this is the system's accent-label signature, distinct from both display and body families.

## Layout
Content max-width sits at 1280px with 160px vertical section padding, giving very generous breathing room between bands. The capability section is a uniform 4-up card grid (equal-width, single row) — a true card-grid pattern, not bento. The identity/expertise pairing and the media-pair sections are 2-column asymmetric grids (measured at 46-48%/46-48% splits with 48-80px gaps), alternating which side carries media versus text row to row. A glass capability chip cluster below the identity card runs 2×2 (48/48 rows). The contact band closes as a 2-column split (form right, contact details left). Spacing scale runs 8/12/16/24/32/48px for internal rhythm; radii scale from 16px (controls) to 24px (glass cards) up to 40px and full 9999px pills for chips/buttons.

## Components
- **Navbar**: edge-to-edge full-viewport bar (100vw, 0px inset either side), 81px tall, square corners on all four sides (0px), fixed/sticky, fill `rgba(0, 0, 0, 0.8)` with `blur(12px)` backdrop-filter; holds 6 items (logo/name at left, nav links center, a small CTA/utility control at far right).
- **Hero primary button**: an observed near-white solid pill sitting first in the hero's three-button row, ~48px height, full 9999px radius, black text — the single highest-contrast, most-emphasized control on the first screen.
- **Hero secondary button**: an observed translucent/outline pill beside it, same radius family, lower contrast, white text on dark glass.
- **Nav/utility button** (measured): `#FFFFFF` fill, `#000000` text, 9999px radius, 44px height, 12px 24px padding — used for compact in-flow controls, not the hero.
- **Final CTA button**: `#00D9FF` fill, `#000000` text, 16px radius (rounded, not pill), 76px tall, 24px 0px padding, resting glow `rgba(0,217,255,0.15) 0 0 20px`, hover darkens fill to `#00B8D9` and doubles glow to `rgba(0,217,255,0.3) 0 0 40px` — this appears once, at the page's closing contact band.
- **Full-width media panel** (×4 in a stacked column, rows [100|100|100|100]): transparent fill, 0px radius, 160px/24px padding; each carries a full-bleed image/screenshot top, a heading, and short body text beneath — used for the featured-work section's alternating large media blocks.
- **Glass identity card**: transparent + `blur(12px)`, 24px radius, 32px padding; contains an eyebrow label, a multi-line headline, two paragraphs of body copy, and a portrait photo inset with rounded corners occupying roughly the right half.
- **Capability chip** (×4 in a 2×2 grid, rows [48/48|48/48]): transparent + `blur(12px)`, 16px radius, 16px padding; each holds a small cyan line-icon plus a short label line — used beneath the identity card as skill tags.
- **Core-capability card** (×4 in a single row): dark surface panel, icon badge (cyan glyph in a rounded square) at top, bold heading, then 2-3 lines of muted body copy — a uniform card-grid, not bento.
- **Contact form module**: transparent glass container holding stacked label+input pairs (uppercase tracked labels, dark bordered inputs with muted placeholder text) and a textarea, capped by the final cyan CTA button.
- **Footer**: transparent background, no visible link list — just a small copyright line left and a tracked tagline right, both in muted gray text.

## Graphics & Effects
A halftone dot-matrix texture in teal-black tones covers the entire hero and likely repeats site-wide as the base surface texture — this is the signature textile layer, not a gradient. A glowing fingerprint/radial-circuit graphic in cyan sits bled off the top-left corner of the hero, covering roughly the upper-left 10% of the frame, the only concentrated color mass on the first screen. A scrim `linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))` sits over the top of image media (covering roughly the top third of each photo/screenshot card) for caption legibility. A small accent gradient `linear-gradient(to right, rgb(0,217,255), rgb(0,143,179))` fills a minor decorative element (icon badge or divider), not a section background. Code-editor and canvas-driven visuals appear as static screenshot stand-ins within media cards. Glass panels use `blur(12px)` consistently across identity, capability-chip, and form containers. Shadow use is otherwise restrained, reserved for the cyan CTA's glow treatment only.

## Motion
State transitions run fast and uniform: `color, background-color, border-color, ... 0.15s cubic-bezier(0.4, 0, 0.2, 1)` for hover/focus micro-interactions on buttons and links. Larger transform/reveal moves use `all 0.7s cubic-bezier(0.4, 0, 0.2, 1)` and `transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)` — a slower, deliberate ease-out for scroll-triggered section entrances. Section content likely fades/slides in via `fade-in`/`fade-out` keyframes as bands enter the viewport, keeping the reveal understated against the busy background texture.

## Guardrails
- Never fill the hero background with a solid saturated cyan gradient — color stays rationed to text, one corner motif, and single CTAs against a black, dot-textured field.
- Do not round the final contact CTA into a full pill; it is a 16px-radius rounded rectangle at 76px height, distinct from the pill-shaped nav/hero buttons.
- Keep the navbar perfectly square-cornered and edge-to-edge; do not inset it or round its corners.
- Preserve the 4-up uniform capability grid as equal-width cards in one row — do not convert it into a bento/mixed-span layout.
- Do not tint body or secondary text with cyan; the accent is reserved for headline emphasis, labels, icons, and CTA fills only.
- Retain the halftone dot texture as the base surface everywhere it appears — substitute a static grain/dot pattern image, never a smooth flat black.