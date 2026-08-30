# Project Handoff — GottaGo (own repo)

**Session:** 2 (of this repo)
**Date:** 29 August 2026
**Status:** LIVE on GitHub Pages at `SCVD-App/Gotta-Go`. Mapbox Directions + Geocoding wired in (real road routing, replacing Session 1's straight-line estimates), plus Long Haul mode now actually does something: nationwide RV dump point data + route-corridor stop planning. No Stripe worker, no backend.

---

## What happened this session, part 6 (Option 1's step-tracking was broken — real drive test)

Scott drove Option 1 for real (trip to his daughter's, plus the return) and reported it clearly: voice guidance ran several kilometres out of sync for the first half of the outbound trip (self-correcting once the route simplified to a straight highway stretch), and on the return leg he was twice told to turn left where no left turn existed — the opposite of both the physical road and what the screen showed. GPS position on the map itself was accurate throughout; only the spoken/banner instruction was wrong.

Root cause: the original logic tracked "current step" by checking whether the user's GPS position had come within ~40m of that step's exact maneuver coordinate, advancing one step at a time only on a direct hit. Real driving through a roundabout or a town intersection (see the screenshot of Landsborough's Gympie St roundabouts Scott sent — genuinely tight, non-trivial geometry) rarely passes within 40m of the single point Mapbox chose for that maneuver. When the hit never lands, the tracked index never advances even though the driver has physically passed several real turns — so the banner reads out a stale instruction for a maneuver already behind them, which is indistinguishable from "wrong direction" once the index is that far off. It self-corrected on the highway stretch specifically because a single straight road is the one case where driving directly over the maneuver point is likely.

Fix: stopped checking "have we hit this exact point" entirely. Every GPS tick now works out how far the user actually is along the whole route line — nearest-point matching against the route geometry, the same map-matching technique already built for the Long Haul dump-point corridor search — and picks whichever step that progress distance falls into. This self-corrects from real position every tick rather than accumulating drift from missed proximity checks, and it doesn't care how wide a roundabout swings. Verified against a standalone simulation of the reported roundabout scenario (a driven path deliberately routed ~90m wide of the exact maneuver coordinate) before shipping — the old logic would have missed it, the new logic picks the correct instruction throughout.

## What happened this session, part 5 (Option 1 — lightweight turn-by-turn)

Scott asked whether GottaGo should get a Google Maps/Waze-style navigation screen. Scoped three tiers before building anything: (1) a lightweight turn-cue banner built entirely from data already being fetched, (2) a dedicated full-screen driving mode on top of that same engine, (3) real turn-by-turn via Mapbox's separate Navigation SDK — which is priced per-MAU + per-trip and would need GottaGo to stop being a pure PWA (reliable background GPS needs a native wrapper). Given Scott's real worry — a free-to-paying ratio that could leave him funding thousands of free users — Option 3 is specifically the one that ties infrastructure cost directly to user count; Options 1 and 2 don't, since they add no new API calls at all. That's the intended shape going forward: keep 1 and 2 free (they cost nothing extra to give away), and if full turn-by-turn ever gets built, that's the natural Premium gate, because it's the only one of the three whose cost scales with usage.

Built Option 1 this pass. `fetchRoute()` already returns Mapbox's `steps` array in the same Directions response used for the route line — it was being discarded; now it's stored on `activeDestination.steps` and `planTurnByTurn()` resets tracking to step 0 every time a fresh route comes in (manual recalc included, restore-from-reload included). `updateTurnBanner()` runs on every GPS tick: works out how far the user is from the next maneuver point, advances to the next step once within ~40m, and updates a banner (icon + instruction + live distance) fixed near the top of the screen. New steps get spoken aloud via the browser's built-in `SpeechSynthesis` — free, no vendor, though it's whatever generic voice the device provides, not an actual avatar accent; that's a real limit of the API, not something worth faking. Screen stays awake during navigation via the Screen Wake Lock API (`navigator.wakeLock`) — same mechanism Mic Drop already uses, re-acquired on `visibilitychange` since the browser drops it whenever the tab is hidden.

Deliberately does NOT detect going off-route or auto-reroute — this was Scott's explicit ask, prompted by how much Waze/Google Maps nagging him back onto a route the second he pulls off for fuel annoys him. The 🔄 button on the banner is a manual, opt-in "recalculate from here" — it just calls the same `refreshDirectRoute()` already built for the route bar. No live rerouting engine, no proactive off-route warnings, by design.

**Next**: Option 2 (dedicated full-screen driving mode — bigger turn arrow, distance countdown, auto-recentering map) sits on top of this same engine; Scott wants Option 1 proven out first before that build.

## What happened this session, part 4 (route cancel button wasn't discoverable)

Scott routed to a real destination (Allstar Batteries, Caboolture) and couldn't find a way to cancel it. The control already existed — `clearDestination()` wired to a "✕ End" pill in the route bar since Session 1 — but it was styled as a barely-there 10px gray-on-gray tag in the corner, easy to miss glancing at a phone. Made it visually load-bearing: bigger, red-tinted, bordered, relabelled "✕ End Route". No behavior change, just made the exit clearly visible.

## What happened this session, part 3 (map tiles were silently broken)

Scott hit a screen full of "401 Error / Invalid Authentication" tiles testing on a real phone for the first time. Root cause: the base map has used Stadia Maps dark tiles since Session 1, and Stadia's free tier requires the site's domain to be registered in their dashboard before it'll serve tiles — that registration never happened, so tiles have 401'd since the very first deploy. It was invisible until now purely because of the other Session 2 bug fix (`onGPS()` not calling `initMap()`) — the real map never rendered on a phone before that fix, so there was nothing to notice was broken.

Fix: switched the tile layer from Stadia to Mapbox's `dark-v11` style, reusing the same domain-restricted token already wired in for Directions/Geocoding — no new account or dashboard setup needed. Mapbox's tile free tier is 750,000 requests/month, well clear of what this app will use for a while. Worth knowing: tiles loaded this way (raster tiles via Leaflet) bill per individual tile request, not bundled as one "map load" the way Mapbox GL JS would — still comfortably inside the free tier, just a different usage shape to watch if traffic ever gets serious.

## What happened this session, part 2 (Long Haul dump points)

Scott asked to locate RV dump points nationwide and add a dump-point routing option. Chose the bigger of two options offered — not just folding dump points into Sonar as another facility type, but actually building out Long Haul mode's route-corridor planner (previously just UI toggles with an honest "not built yet" note).

**Data**: the exact same National Public Toilet Map CSV (data.gov.au, CC-BY 3.0 AU — same license already cited for the toilet data) turns out to carry a `DumpPoint` boolean column, plus `DPWashout`, `DPAfterHours`, and `DrinkingWater` flags. Downloaded the full August 2026 export (25,449 facility rows) via the browser, filtered to `DumpPoint=true`: **1,393 real dump points nationwide** — NSW 347, QLD 324, WA 238, SA 199, VIC 181, TAS 80, NT 23, ACT 1. Built into `dumppoints.json` (~360KB) as its own file, loaded lazily only when Long Haul mode is actually used — Quick Dash users never fetch it.

**Feature**: when a route is planned in Long Haul mode, `planDumpStops()` runs a corridor search (`findDumpPointsAlongRoute()`) against the real Mapbox route geometry — a bounding-box prefilter narrows the 1,393 candidates, then each is checked against a sampled version of the route line (capped ~800 points for performance on long routes), keeping anything within 8km of the corridor. Results sort by distance into the trip, so the list reads top-to-bottom as "stops you'll pass in order." A pill on the route bar ("🛻 N dump points along this route") opens a list (`dump-modal`); tapping one sets it as a real Mapbox waypoint (`activeDestination.viaStop`) and `refreshDirectRoute()` recalculates the whole trip through it — same Directions-API waypoint mechanism already built for the toilet diversion feature, just applied to a planned stop instead of an ephemeral one. The route bar then shows "via <stop name>" with a real revised ETA, and a ✕ clears it. The via-stop persists to localStorage like the destination itself, so it survives a reload.

**Deliberately not built this pass**: gap warnings and vehicle-type filtering (the other Long Haul checkboxes) — still just visual toggles, said plainly in the in-app note, not wired to anything. No on-map markers for the candidate dump points (list-only, same choice made for the toilet diversion feature). Corridor width (8km) and result cap (20) are hardcoded, not user-configurable yet.

---

## What happened this session (Mapbox integration)

Scott confirmed reusing the same Mapbox public token already live in Chasin' Curves (`pk.eyJ1...` — public token, safe client-side, not the Stripe key he almost grabbed by mistake — see note below). Wired into `index.html`:

- **Geocoding**: Route Planner's "To" field now calls Mapbox Geocoding v6 (`/search/geocode/v6/forward`) instead of Nominatim — same vendor as Directions, one token for both.
- **Direct route**: `fetchRoute()` calls Mapbox Directions v5 (`driving-traffic` profile, so it's traffic-aware). `refreshDirectRoute()` fires once per destination set/restore (not on every GPS tick — deliberate, to keep API usage down per the scoping doc) and draws the real routed line + real distance/time in the route bar. Falls back to the haversine estimate (shown with a `~` prefix so it's honest about being an estimate) if the fetch fails.
- **Diversion delta**: `openDetail()` now fires two real Directions calls the moment a facility sheet opens with a destination active — one direct leg, one via the facility as a waypoint — and shows the real delta ("+X km / +Y min, real road routing, live traffic") once they land, replacing the straight-line placeholder shown while loading. Falls back gracefully to the straight-line estimate, clearly labelled, if Mapbox can't be reached.
- **Fixed a bug found during this pass**: `onGPS()` never called `initMap()` — only `startDemo()` did — so a real device (as opposed to demo mode) was rendering no map at all in the live deployment. Fixed: the first real GPS fix now initialises the map.

**Deliberately not changed this session:** Sonar's ranking (nearest-card, results list, facility list) stays on the haversine+estMinutes heuristic — cheap to rank many candidates at once, versus live-routing all of them; the base map tiles stay Leaflet+Stadia, not Mapbox GL JS — only the REST Directions/Geocoding APIs were added; no on-map preview of the diversion route yet (still text-only in the detail sheet) — flagged as a future polish item, not built now.

## What happened Session 1 (relocation)

This repo is GottaGo's first proper home — previously its only assets lived in `scvd-context/gottago/` (the shared context-mirror repo), which was never meant to be the live source, same as every other app in the portfolio. This session:

1. Reviewed both recovered prototypes line by line: `gottago-beta-v2.html` (real GPS, real Leaflet/OSM map, real facility data from the National Public Toilet Map, working Sonar) and `gottago-app-v2.html` (Route Planner UI, Quick Dash/Long Haul modes, avatar picker — but a canvas mockup underneath, no real GPS, hardcoded destination).
2. Consolidated them into **one real app** (`index.html`) — beta-v2's engine is the foundation; app-v2's Route Planner, avatar system, and Nearby-list UI are ported in and wired to real data instead of mocks.
3. Added the PWA basics (`manifest.json`, two icons) matching the pattern already used by Jumpin' Pin / Hnefatafl / Two Ancient Classics.
4. Built the first real version of the destination/waypoint feature Scott asked for (see below) — using straight-line estimates, not real road routing yet.

## Architecture decisions made during consolidation

- **One map, not two.** app-v2 had a separate fake canvas per screen (map screen, route screen). Dropped that entirely — there's one real Leaflet map instance now, and an active route is just a marker + line + a `route-bar` panel layered on top of it, not a separate screen. Simpler, and it's how a real app would do this anyway.
- **One facility detail sheet, not two.** app-v2 had its own separate facility-detail modal, duplicating beta-v2's already-working one. Kept only beta-v2's (`openDetail()`), and every entry point (map pins, Sonar results, the Nearby list) now calls into it — one source of truth for facility info and the "Navigate" handoff.
- **Canonical facility data.** app-v2's fake `FACILITIES` array (hardcoded distances, invented venue types) is gone. Everything reads from the real `GOV_FACILITIES` list beta-v2 already had, with distances always computed live via GPS.
- **House of Lords Rating Scale is now actually implemented** (`lordsLabel()`), mapped off each facility's star rating — this was designed months ago but never wired up in either prototype. Shows on the facility detail sheet.

## The destination / waypoint feature — what's real vs. what's still an estimate

Scott's ask: when a destination is locked in and the user triggers the loo-finder mid-trip, save that destination and treat the facility stop as a waypoint, with a revised ETA. The scoping doc (`gottago-relocation-scope.md`, sent to Scott 28 Aug) worked out that this needs GottaGo to own the destination itself — no phone OS lets a third-party app see or edit another app's live navigation — and confirmed Option A: GottaGo becomes the trip's own navigator, built on Mapbox Directions.

**What's built tonight, ahead of the Mapbox phase:**
- Route Planner's "To" field now geocodes to a real place (Nominatim/OSM, free, no key — swap for Mapbox Geocoding once the Directions API key exists) and stores it as `activeDestination`, **persisted to localStorage** — survives a reload or the tab being backgrounded, not just held in memory.
- The map shows a real destination marker + line once a route is planned, with a live-updating distance/time readout in the `route-bar` panel.
- When Sonar finds a facility while a destination is active, the facility's detail sheet shows exactly how much that stop adds — "adds ~X km / ~Y min" — computed from real GPS coordinates.
- The "Navigate" handoff to Google Maps now carries the **full trip**, not just the toilet stop: `origin` = you, `waypoints` = the facility, `destination` = wherever you were already headed. The destination is never dropped, even in this external-handoff version.

**Session 1 shipped this on straight-line (haversine) estimates.** Session 2 (above) replaced the direct-route and diversion-delta figures with real Mapbox Directions routing. What's still not real: actual turn-by-turn guidance and the Port/Starboard Nav Flash driven off real maneuver data — see "explicitly NOT built" below.

## What's explicitly NOT built (said plainly, not left implicit)

- Long Haul mode's gap-alert analysis and vehicle-type filtering — UI toggles exist, nothing behind them yet.
- Ratings/reviews ("Rate" nav tab) — shows a "not live yet" toast, no submission flow.
- Camps Australia data layer — no partnership integration exists; facility data is 100% the free government dataset.
- Real turn-by-turn navigation, Port/Starboard Nav Flash driven by real route data (currently a standalone toggle, not tied to an actual route's upcoming turns).
- Any backend — no Cloudflare Worker, no Stripe, no subscriptions. This is 100% client-side, matching the no-build-tools house style.

## Files in this repo

- `index.html` — the consolidated app.
- `dumppoints.json` — 1,393 nationwide RV dump points, filtered from the National Public Toilet Map CSV (data.gov.au, CC-BY 3.0 AU). Fetched lazily by Long Haul mode only.
- `manifest.json`, `icon-192.png`, `icon-512.png` — PWA basics. Final logo built 28 Aug 2026 from Scott's own sketch, workshopped through two directions: first a capital G + lowercase g with the tail sweeping into an arrow (to imply direction), then — Scott's call, and the one that shipped — a large G + small G pair (both the same letterform, reads as "GG") framed by four bright-red N/S/E/W ticks that carry the directional/navigation cue instead of the tail. Original open action #6 (commission icon artwork) downgraded to "optional professional polish pass" rather than "not started" — this is a real logo now, not a placeholder.
- `handoff.md` — this file.

## Open actions carried over from the original recovery handoff (`scvd-context/gottago/handoff.md`)

Still open, unrelated to tonight's work: ABN/business name registration, trademark search for "GottaGo," the Camps Australia partnership letter, technical co-founder search, patent conversation re: Port/Starboard Nav Flash, Google Play developer account registration. The business/partnership documents (`GottaGo-Proposal.docx`, revenue model files) stay in `scvd-context/gottago/` — they're not app code and don't need to live in this repo.

## Next session

1. Build the Port/Starboard Nav Flash off real Directions step/maneuver data (`fetchRoute()` already returns `steps`) instead of the standalone manual toggle.
2. Long Haul mode's remaining checkboxes — gap warnings, vehicle-type filtering — are still just visual toggles; wire them up or drop them.
3. Decide (Scott's call, still open): ship this as PWA-only for now, or hold for a Capacitor wrapper before any public release — see the scoping doc for why that matters specifically for this app's "works while driving toward something else" pitch.
4. Optional polish: on-map markers for the candidate dump points (currently list-only, same as the toilet diversion feature), and a tunable corridor width instead of the hardcoded 8km.
5. Keep an eye on Mapbox Directions usage against the 100k free requests/month tier as real users show up (see scoping doc for the pricing tiers above that) — Long Haul's corridor search adds no extra Directions calls itself (it reuses the route already fetched for the route bar), so this doesn't change the usage math.
