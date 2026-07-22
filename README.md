# Explorite

**Travel like you were told a secret.**

A luxury travel-discovery PWA. Explorite helps travelers who land in a new city find local-verified experiences fast, and trust what they find. Core loop: **discover → evaluate → coordinate**.

Built from the original Explorite UX case study (research → personas → journey map → six-screen prototype), re-imagined as a production progressive web app.

## Design system

- **Palette** — Baroque "Shadowed Gilding": near-black `#14100D`, oxblood `#6F1D1B`, burnished gold `#C9A227`, parchment `#ECE1CD`. Chiaroscuro gradients; gold reserved for precious accents.
- **Typography** — Cormorant Garamond (high-contrast display serif) + Manrope (body sans).
- **Motion** — line-mask text reveals, staggered card entrances (IntersectionObserver), parallax detail hero, gold sheen CTAs, wax-seal booking confirmation with falling petals, spring micro-interactions. Honors `prefers-reduced-motion`.
- **Psychology** — Gestalt throughout: proximity (card grouping), similarity (consistent chips/badges), continuity (booking progress line), closure (peeking carousel cards), figure/ground (dimmed booking sheet), common fate (filters animate results together).

## Screens

Splash · Login · Discover · Experience detail · Booking + confirmation · Messages · Chat · Trips · Profile

## PWA

- `manifest.webmanifest` with maskable icons, standalone display
- `sw.js`: app shell cache-first, images/fonts stale-while-revalidate, offline fallback
- Install prompt surfaced in-app

## Stack

Zero-dependency vanilla HTML/CSS/JS. No build step. Deploy anywhere static.

```
index.html  styles.css  app.js  sw.js  manifest.webmanifest  icons
```
