# Explorite v2 — "Field Journal"

A travel discovery app that started as a UX research case study and became a working product.

**Live:** https://explorite.vercel.app

## What it is

Explorite is a vetted field journal of local experiences across Florence, Kyoto and Mexico City.
Every listing was "walked, eaten or rowed" before earning a page. The product answers the two
problems the original research surfaced:

1. **Trust** — travelers can't tell a great local pick from a tourist trap.
2. **Coordination** — the user journey map showed only one negative dip: checking friends'
   availability. Discovery was never the hard part. Getting the crew to show up was.

## Real functionality (Supabase)

- **Auth** — email/password accounts; browsing never requires one (research: don't gate the feed)
- **Catalog** — 15 vetted experiences with trust provenance ("vetted by" notes), served from Postgres
- **Reviews** — user-written; the "Verified booking" stamp is computed server-side from real bookings
- **Bookings** — real reservations with ticket codes, cancellation, upcoming/archive views
- **Crew plans** — the signature feature: propose 2-4 time windows, share one link, friends vote
  In / Maybe / Out **without needing an account** (SECURITY DEFINER RPCs behind a share token)
- **Host messaging** — persisted threads with realtime host replies (Postgres trigger + Supabase Realtime)
- **RLS everywhere** — owner-only rows for saves, bookings, plans, threads; public read for the catalog

## Design: v1 → v2

v1 was "Shadowed Gilding": near-black, oxblood and gold, baroque luxury. v2 is a radical
departure — **"Field Journal"**: warm paper, ink hairlines, Fraunces editorial serif,
IBM Plex Mono captions, documentary photography with magazine credit bars, and exactly one
terracotta accent reserved for the reserve CTA. Trust reads as journalism, not marketing.

Patterns borrowed from current industry research (Mobbin/Dribbble/Behance pass, 2026):
front-loaded cancellation + highlights, verified-transaction review badges, pull-quote review
digest, sticky reserve bar that appears only after the inline CTA scrolls away, browse-before-signup.

## Stack

Vanilla HTML/CSS/JS (no framework, no build step) + supabase-js UMD + PWA (service worker,
installable). Deployed on Vercel from this repo.

## Case study

The original research-to-prototype case study lives at
[natetrandesign.com/explorite.html](https://natetrandesign.com/explorite.html).
Personas Mindy Cha and Troy Hopper appear in the seeded reviews. They earned it.
