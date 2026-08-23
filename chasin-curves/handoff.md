# Chasin' Curves — Project Handoff

**Session:** 15
**Date:** 23 August 2026
**Status:** BUILT AND DEPLOYED SAME DAY — GPS Snail Trail capture (phase 2 of the master build plan, opt-in add-on to Session 14's Logbook) coded, validated, and pushed live at Scott's request to support a same-day beta test.

---

## Overview

Second build from the weekend's Murphy Report/Logbook/Snail-Trail planning session (see `chasin-curves/murphy-report-logbook.md`, `chasin-curves/snail-trail-road-extraction.md`, `chasin-curves/chasin-curves-master-build-plan.md`). Follows the master plan's sequencing: GPS trail is built as an opt-in add-on to the Logbook's Use Entry record, not a separate feature or table — exactly step 2 as planned, now that step 1 (Logbook) is confirmed working live with a real logged trip.

**Why this shipped same-day:** Scott flagged a potential beta tester who could generate useful trail data immediately, so this session prioritised getting a working end-to-end path live over any polish. The feature is deliberately minimal: one opt-in checkbox, one polling interval, one settle-up write. Nothing club-event or Road-extraction related is built yet — Murphy Report and Roads GPX extraction are still their own later phase per the plan, sharing this same `trail` data once they're built.

## What Changed This Session

**Worker (v3.2 → v3.3):** no new endpoint — `PUT /logbook/:id/:entryId` (Session 14) extended to also accept an optional `trail` array of `{lat, lng, t}` points, capped at `MAX_TRAIL_POINTS = 1500` (~8+ hours at a 20s poll) with per-point shape validation. `odometerEnd` and `trail` can now each be set independently or together in the same PUT — an entry can get its odometer reading, its trail, both, or neither, but nothing else about a filed entry can change.

**Frontend:**
- **GPS config block** (`GPS_POLL_INTERVAL_MS = 20000`, `ACTIVE_TRIP_KEY`, `getStoredActiveTrip`/`setStoredActiveTrip`, `pollGpsPoint`) — polling, not `watchPosition`, for a controlled cadence; every poll resolves to `null` rather than rejecting, so a denied permission or a timeout skips that tick without killing the trip.
- **`api.saveTrail`** — one PUT with the full points array, sent once when the trip is stopped. Trail is local-first (written to `localStorage` on every poll) and only reaches the server in that single batch write — never streamed point-by-point.
- **`LogTripModal`** — new opt-in "Track GPS trail" checkbox (hidden if `navigator.geolocation` isn't available). Checking it threads a `trackGps` flag through to `onLogEntry`.
- **`TrailViewerModal`** — read-only Mapbox polyline viewer for a saved trail, opened from a "📍 {N} pts" button on any Logbook entry that has one.
- **`ActiveTripBanner`** — persistent banner shown across every screen while a trip is recording (point count, elapsed time, Stop / Discard), so switching from Logbook to Roads or Garage mid-trip doesn't lose the recording. Lives at the `App` level, not inside `LogbookView`, specifically so the polling `setInterval` survives screen changes — a component-local interval would've been torn down the moment `LogbookView` unmounted.
- **App-level GPS lifecycle** (`pollAndAppend`, `beginPolling`, `startTrailRecording`, `handleStopTrip`, `discardTrail`) plus a mount-time `useEffect` that resumes polling if a trip was left running through a page reload. `handleSignOut` now also stops any active interval and clears the stored trip, so a stale poll can't outlive the session or attach itself to whoever logs in next on the same device.

**The one real limitation, said plainly to Scott and in the in-app copy:** this is a browser tab, not an installed native app with "Always" location permission. Tracking only runs while Chasin' Curves is the open, active tab — locking the phone or switching apps will very likely pause polling (especially on iOS Safari), and there's no way for a PWA to promise otherwise. The beta tester needs to keep the tab open and the screen on for the duration of the trip for this to capture reliably. True background tracking would need a native app wrapper, which is out of scope for now.

**Not built this session (by design, per the master plan):** Roads GPX extraction from a saved trail, Murphy Report UI, club-event entries. The `trail` data this session produces is exactly what those future features will consume — no rework anticipated.

## Infrastructure

No infra changes this session. Same Cloudflare Worker / KV / R2 setup as Session 14; `wrangler.toml` untouched. Mapbox GL JS (already loaded globally) reused for `TrailViewerModal` — no new dependency added.

## Open Actions

| # | Task |
|---|------|
| 1 | Watch the beta test run live — first real-world signal on whether foreground-only polling is actually good enough in practice, or whether the 20s interval / accuracy settings need tuning |
| 2 | Set Registration State on Scott's five existing test vehicles (carried over from Session 14) |
| 3 | Confirm whether the rolling-365-day window is the right model vs. an anchored rego-year window (carried over from Session 14) |
| 4 | Direct-read NT and TAS scheme guideline PDFs to close the day-cap gaps (carried over) |
| 5 | Roads GPX extraction from a saved trail (master plan step 3, parallel with Murphy Report) — next build once GPS trail is confirmed working live from the beta test |
| 6 | Murphy Report UI (master plan step 3, parallel with Roads extraction) |
| 7 | Build a shortlist of QLD incorporated clubs for a Murphy Report pilot partnership (carried over) |
| 8 | Extend `addedBy` attribution to road list cards and map pins (carried over from Session 11) |
| 9 | Fix `member.roadsAdded` counter (carried over from Session 11) |
| 10 | Crew — full spec + build (carried over) |
| 11 | Trip co-organiser / deputise (carried over) |
| 12 | Viewport-driven road list, proper Mapbox Studio style, flat-earth Easter egg, shareable garage links (carried over from Session 10) |

## Scott's Fleet (Test Data)

Unchanged — BMW Z4 E85 Imola Red, Jaguar X350 Champagne, Triumph Thunderbird Storm, Toyota LandCruiser 200 Series, 1993 Mustang 3200 Widebody boat.

## TGM Integration

Unchanged this session — see `tgm/handoff.md`.

## Content Brand

- Instagram: @ChasinCurves
- Email: chasincurves@gmail.com
- Tagline: "Roads, rivers & riffs."
- Brand kit: Cormorant Garamond + Josefin Sans, Midnight #0d0d0d, Champagne #C9A84C, Monza Red #C0392B, Ocean Blue #2E6DA4, Bone White #f5f3ee

## Beta Testers

| Tester | Status | Notes |
|--------|--------|-------|
| Shane "Skeeny" | ✅ Active | Emergent trip coordinator — calls the group "the Rat Bags." Real-world test case flagged in the Murphy Report spec for why an unincorporated Crew can't satisfy any state's compliance scheme on its own. |
| (unnamed, new) | 🔜 Pending | The GPS trail beta test case Scott flagged this session — first live trail data expected once this ships. |

## Filing note

Per Scott's standard practice: this supersedes the Session 14 `handoff.md` (24 August 2026). Archive that one to `chasin-curves/archive/` before replacing it with this file. Unlike Session 14, this session's `app.js`/`worker.js` were written directly into both the real `Chasin-Curves` repo and `scvd-context` via the device bridge (no manual paste-replace step) — part of the "eliminate human error" change Scott asked for earlier today. Git state on both repos should be verified against this handoff before assuming it's fully in sync.
