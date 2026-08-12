# Explorite v3 — "Field Journal / The Planner"

A travel discovery app that started as a UX research case study, became a working product,
and now plans the whole trip — one trip, one document.

**Live:** https://explorite.vercel.app

## What it is

Explorite is a vetted field journal of local experiences across Florence, Kyoto and Mexico City.
Every listing was "walked, eaten or rowed" before earning a page. The product answers the two
problems the original research surfaced:

1. **Trust** — travelers can't tell a great local pick from a tourist trap.
2. **Coordination** — the user journey map showed only one negative dip: checking friends'
   availability. Discovery was never the hard part. Getting the crew to show up was.

## v3: the trip planner (Wanderlog-informed UX)

A competitive teardown of Wanderlog surfaced seven UX principles worth stealing, and v3
translates each into the Field Journal language:

1. **One trip, one document** — a trip is a single scrolling page: shortlist, day blocks, ledger, kit list.
2. **The map is a mirror** — every stop with coordinates appears instantly on "the spread" (Leaflet/OSM), numbered pins inked per day, dashed route lines.
3. **The day is the unit of thought** — per-day blocks with an editable intent line, per-day subtotals.
4. **Ideas before commitments** — "the shortlist" holds unscheduled finds until they earn a day.
5. **The plan does arithmetic** — walking time between stops (haversine), day subtotals, one-tap nearest-neighbor "Optimize order".
6. **Collaboration is one link** — a share token renders a read-only "press copy" with map, no account needed (same pattern as crew-plan voting).
7. **Money and logistics live inside the plan** — "the ledger" (budget bar, expenses, per-person split, bookings auto-counted) and a packing "kit list". Confirmed bookings auto-file into their day as fixed points.

Stops come from three sources: vetted journal pages, your own stops (geocoded via Nominatim),
or plain notes. Booked reservations are facts; planned stops are drafts.

## Real functionality (Supabase)

- **Auth** — email/password accounts; browsing never requires one (research: don't gate the feed)
- **Catalog** — 15 vetted experiences with trust provenance ("vetted by" notes), served from Postgres
- **Reviews** — user-written; the "Verified booking" stamp is computed server-side from real bookings
- **Bookings** — real reservations with ticket codes, cancellation, upcoming/archive views
- **Crew plans** — the signature feature: propose 2-4 time windows, share one link, friends vote
  In / Maybe / Out **without needing an account** (SECURITY DEFINER RPCs behind a share token)
- **Host messaging** — persisted threads with realtime host replies (Postgres trigger + Supabase Realtime)
- **RLS everywhere** — owner-only rows for saves, bookings, plans, threads, trips; public read for the catalog
- **Trips** — trips, day items, expenses and checklists in four owner-only tables; the share view goes through one SECURITY DEFINER RPC gated by a share token

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
