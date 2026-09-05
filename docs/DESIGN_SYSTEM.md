# The Ring After Dark

Contemporary Mongolian Circus × European editorial culture × digital stage. Premium, cinematic, dark, editorial, physical, cultural, modern. Not SaaS, not a template, not a carnival.

## Research (principles only — 5 September 2026)

Cirque d'Hiver Bouglione (show-first hierarchy, immediate booking), Cirque Phénix (venue identity, visitor pathways), Cirque Le Roux (identity per production, calendar next to discovery), CNAC (institutional seriousness, archive as substance). No layouts, assets, copy or components are reused.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| Stage black | `#070707` | page ground |
| Warm black | `#0D0C0B` | panels, footer, alternate sections |
| Ivory | `#F2ECE2` | type |
| Muted ivory | `#B9B2A8` | secondary type |
| Brass | `#C9A35C` | stage light: rules, focus, active, ring geometry |
| Burnished gold | `#98733B` | rare emphasis |
| Performance red | `#D92E2E` | action (tickets), cancelled, live markers |
| Deep velvet | `#23090D` | floor glow |
| Rules | `rgba(242,236,226,.14 / .32)` | hairlines |

Gold behaves like light, never like luxury decoration. No purple, no electric blue, no rainbow gradients, no blur blobs, no glass cards.

## Typography

Noto Serif Display (variable, self-hosted) for display; Noto Sans (variable, self-hosted) for UI. Both carry full Mongolian Cyrillic (Ө ө Ү ү) and Turkish coverage and are loaded via `@fontsource-variable`.

Hero `clamp(130px, 19vw, 290px)` · page titles `clamp(3rem, 8vw, 8.5rem)` · section titles `clamp(2.2rem, 5vw, 4.6rem)` · event titles `clamp(3rem, 9vw, 9.5rem)` · body 16–19px · metadata 10–13px uppercase tracked. Dates are oversized and set in the display face.

## Layout

Editorial grid: max 1440px (`.wrap`) and 1568px (`.wrap-wide`), full-bleed hero/artwork, gutters `clamp(20px, 4.5vw, 72px)`. Asymmetry is deliberate (7/5 stories split, 1.3/1 feature rows, 4/8 programme rhythm). Square corners, hairline rules, generous negative space. Minimum interactive target 44px.

## Motion

Ambient motion is very slow (orbit 0.026 rad/s). UI transitions 200 ms, reveals 650 ms, one easing curve. No scroll hijacking. `prefers-reduced-motion` disables continuous motion, the WebGL scene and reveals. Every animation communicates hierarchy, focus, momentum or spatial relation — nothing decorative.

## The hero (signature)

`PerformanceOrbitHero` + `PerformanceOrbitScene`: a digital circus ring. 8–16 poster planes stand on an invisible elliptical ring and drift around it; brass floor rings, a soft spotlight disc and a single `THREE.Points` dust field (custom shader, gold with rare red) suggest the stage. Posters dim when they pass behind the title so the type always reads. Interaction: slow automatic orbit, subtle pointer parallax, horizontal drag with inertia, hover lifts a poster and reveals its title and date, click opens the production. No free camera, no zoom, vertical scrolling untouched (`touch-action: pan-y`). Quality tiers: high (12 posters, 900 dust, DPR ≤ 1.75), medium (10, 380, DPR ≤ 1.25), low (8, none), mobile / reduced motion / no WebGL / software renderer → the composed 2D poster field with a CSS ring. HTML title and CTAs render before any WebGL loads; the canvas pauses when scrolled out of view. Leaving the hero, the title compresses, the poster field expands, and a brass rule is drawn in to become the timeline of *Next on stage*.

## Homepage sections

Floating navigation · hero · Next on stage (date-led rows, distinct productions) · Featured performances (3D perspective coverflow: drag, touch, inertia, keys, focus, click; catalogue, not a music app) · What's On (filters + date rail, URL-synchronised) · Performance film (poster first, player on demand) · The circus in motion (filmstrip + viewer) · Stories (one lead + supporting) · About feature (large image, oversized year, short text) · Plan your visit · institutional footer.

## Artwork

Original SVG stage studies (`scripts/create-artwork.mjs`): rings, rope tension, motion paths, spotlights, archive fragments; 3:4 posters and 16:9 stage images with grain and typographic markers. No stock photography, no generated performers. Higgsfield: checked, no credits available, not used.

## Backstage (admin)

"Control room": 236px rail with grouped navigation, sticky top bar, serif page titles, 1px panels, hairline tables, underline inputs, brass for primary actions, red for danger. The overview alone carries a signature — a 2D-canvas ring with upcoming sessions as nodes. Editors are fast and focused: locale tabs with missing-title markers, session repeaters, media picker, focal-point picker, sortable curation lists, unsaved-change guard.
