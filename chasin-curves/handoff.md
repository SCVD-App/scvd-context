# Chasin' Curves — Project Handoff

**Session:** 15 (+ same-day follow-ups 15b/c/d) + Session 16 (24 Aug 2026) + Session 16c + Session 16d + Session 16e + Session 16f (25 Aug 2026)
**Date:** 23–24 August 2026
**Status:** BUILT AND DEPLOYED SAME DAY — GPS Snail Trail capture (phase 2 of the master build plan, opt-in add-on to Session 14's Logbook) coded, validated, and pushed live at Scott's request to support a real beta test that left the same day: Scott's aunty Sandy and her husband Dave, starting a 5-week, ~7,000km caravanning trip through Victoria and South Australia.

## Session 16 — Compliance day-cap counters: NT and TAS confirmed, dual counting model built

The Session 14/15 day-cap tracker (`FIXED_DAY_CAPS`, `rollingDayCount`) always assumed one counting model — a rolling 365-day trailing window — for every state, with NT and TAS left out entirely because their exact day caps hadn't been confirmed. Scott's own instinct (24 Aug) was that a rolling window would be too ambiguous for a roadside check, and that at least some states probably hard-reset the count on the vehicle's registration renewal date instead. A web research pass against each state's own official guidelines confirmed he was right, at least for NT:

- **NT** — Motor Vehicle Enthusiast Club Registration Scheme Guidelines, Section 7 / Condition 10: 90 days total (60 club events + 30 maintenance/test-driving/personal use), explicitly "in the 12 month period **from commencement date of the current registration period**" — a hard-anchored count, not rolling. Only the 30-day personal-use half is this app's day-cap side (club events aren't tracked yet).
- **TAS** — the whole Special Interest Vehicle scheme was rewritten effective 1 Dec 2025 (replacing the old separate historic/vintage/street rod categories). New unified cap: 104 days, all classes, no separate uncapped club-event carve-out — genuinely pure day-cap, same shape as VIC/SA. But the official guidelines document never states whether the 12-month period is rolling or anchored — checked the scheme page, the guidelines/application PDF, and the FAQ, all silent on it. Left as an open question (see Open Actions) rather than guessed at.

Built both counting models as permanent, independent functions rather than replacing one with the other — `rollingDayCount` (unchanged) and a new `anchoredDayCount`, dispatched by a single `dayCountFor(vehicle, entries)` function keyed off `ANCHORED_WINDOW_STATES` (currently just `["NT"]`). The vehicle's own `regoState` is the only thing that selects which counter runs — there's no separate manual toggle to fall out of sync with it, and reclassifying a state (as TAS's window type gets confirmed, for instance) is a one-line addition to that list, not a rewrite. Anchored states need a per-vehicle `regoAnniversary` date (new Garage field, shown only for anchored states) to know where the current period starts; with none set, the UI asks for it rather than silently guessing a rolling fallback for a state now known not to be one. All logic covered by a standalone Node test (8 assertions) including a case proving the two counters can disagree on the same entry set — confirming they run independently, not as one function with a flag.

## Session 16b — first live beta bug: Sandy's "trip disappeared" report

Sandy's exact report, mid-trip: "The trip was recording the whole way but it disappeared when I stopped it. I just noticed that I hadn't finished setting up my profile so maybe that's why." Traced the full stop-and-save path (`handleStopTrip` → `api.saveTrail` → the worker's `PUT /logbook/:id/:entryId`) end to end before touching anything, since a live tester's report deserves a real diagnosis, not a guess dressed up as a fix.

**Her own theory doesn't hold up.** `currentUser.id` is set to the account email at signup regardless of whether optional profile fields (bio, avatar, location) are filled in, and nothing on the trail-save path reads profile completeness. Incomplete profile setup isn't the cause.

**What almost certainly happened instead: a real bug, but not data loss.** `postLogEntry` (which creates the Logbook entry itself, with the start odometer) has to succeed before GPS trail recording even begins — so if the trail was genuinely recording, as she describes, that entry already existed in her Logbook the whole time, trail or no trail. But `handleStopTrip` had no success confirmation at all: on a successful save it just cleared `activeTrip` to `null`, so the `ActiveTripBanner` — her only signal that anything was happening — silently vanished with zero acknowledgment either way. Someone watching that banner as their sole indicator would read its disappearance as "gone," exactly as she described, whether or not the save actually worked. Ruled out an actual data-loss bug in the save path itself (worker-side validation, auth-token lifetime — 30 days, nowhere near expiring on day one — and the entry-creation flow all check out).

**Two fixes shipped, both defensive rather than a single unverified guess at root cause:**
- **`TripSavedNotice`** — new banner shown for 8s (dismissable) right after a successful stop-and-save: "Trip saved to your Logbook" plus the actual point count, or, honestly, "No GPS points recorded this trip — just the odometer reading was saved" if the trail came back empty. That second message matters — if her trail genuinely had zero points (e.g. location permission never actually granted despite the checkbox being ticked), the app was previously saving an empty trail silently with no signal either way; now it says so plainly instead of pretending nothing happened.
- **Failed "Log Trip Now" no longer closes the modal.** Separate latent bug found while tracing this: `handleLogTrip` swallowed its own errors (alert + return) without telling the modal, and `LogTripModal` closed itself unconditionally after calling it — so a failed trip-log attempt (network hiccup, auth hiccup) closed the form with only an easily-missed browser `alert()` as the only trace, identical shape to what Sandy described. `handleLogTrip` now returns a real success/failure boolean, threaded through `LogbookView.handleSubmit` and `LogTripModal.handleSubmit`, so the modal only closes — and points only get awarded — on confirmed success.

**Still worth asking Sandy directly, since this was traced from the code, not from her actual device logs:** does the trip now show up in her Logbook (even without a "📍 pts" button, which only appears when a trail has one or more points)? If yes with no trail button, the entry saved but the trail came back empty — worth asking whether location permission was actually granted on her device. If the entry itself isn't there at all, that's a different and more serious bug than anything found here, and would need her actual browser/device details to chase further.

## Session 16c — real evidence: Sandy was inside Facebook's in-app browser, not Safari

Scott pulled the actual Cloudflare Worker log for one of Sandy's requests (a `PUT /garage/sandyjoh1@yahoo.com.au`, status 200) and its `user-agent` header settled what 16b could only infer from code: `...Mobile/23G71 [FBAN/FBIOS;FBAV/575.0.0.28.104;...]`. `FBAN/FBIOS` is Facebook's own in-app-browser signature — Sandy opened the app link from inside Facebook (or Messenger) and never left its embedded WKWebView for real Safari.

That matters because Facebook's in-app browser on iOS is a well-documented bad environment for exactly what a trip recording needs: it evicts `localStorage` aggressively once the host app backgrounds (which is what `activeTrip`'s resume-on-reload relies on), doesn't reliably hold a geolocation permission grant for the page's whole life, and doesn't implement the Screen Wake Lock API at all — so 15b's wake-lock fix, which normally keeps a dedicated recording device's screen on, silently does nothing there. Any one of those three would produce "recorded fine, then gone," matching her report considerably better than 16b's no-confirmation-banner theory alone. That fix stays — it's a real, separate defensive improvement — but this is the stronger root-cause candidate.

**Caveat, stated plainly:** this one log entry is a `/garage` PUT, not the `/logbook` calls from her actual trip — it proves she was in the FB browser for at least that action in the same session, not that every request that day came from it. Worth asking Scott to pull `/logbook` entries around the same timestamp if it's ever worth nailing down further, though for a fix, it doesn't need to be: the same environment served both requests, and the fix below is worth shipping regardless of which specific call it affected.

**Fix shipped:** `detectInAppBrowser()` — a UA sniff for Facebook/Messenger, Instagram, Line, and WeChat's known in-app-browser markers (tested against Sandy's actual captured UA string, plus real Safari and Chrome UAs as negative controls, all correct). When one's detected, a dismissible `InAppBrowserWarning` banner shows both pre-login (top of `LoginScreen`) and post-login (top of the app shell, above the Pit Pass banner) — plain language ("You're in Facebook's built-in browser"), explains what it risks, and offers a "Copy link to open elsewhere" button since there's no reliable way to force an escape to Safari from JavaScript on iOS. Dismissing it is per-session only (a plain `useState`, resets on reload) since the risk is present for as long as the tab stays open inside the host app, not just at first sight of the banner.

**Refinement, same session:** Scott then sent a screenshot of Sandy's actual home screen — a correctly-installed `ChasinCurves` icon with the real branded artwork, sitting in a "Navigation" folder next to Maps and Google Maps. That's not a contradiction of the Facebook finding, it explains the exact shape of the bug: getting that custom icon (rather than a generic screenshot thumbnail) only happens via Safari's own "Add to Home Screen," so she clearly set the app up correctly at some point. But a home-screen web app on iOS is just a bookmark to a URL — it isn't recognised as "the same app" when a link to that URL is tapped from somewhere else, like a Messenger chat or a Facebook post. So the likely sequence: she installed it properly once, then on the day in question opened Chasin' Curves via a link tapped from inside Facebook rather than her home screen icon, landing back in the in-app browser regardless of having the real app already sitting on her phone. Tightened the warning banner's copy to say so directly — "If you've already added Chasin' Curves to your Home Screen, tap that icon instead — it skips this problem entirely" — since that's the one piece of advice that actually matches how she got here.

## Note — don't trust Cloudflare's `cf` geo fields as a user's real location (Starlink)

Separate from the app itself, worth recording since it'll bite whoever next debugs from a Cloudflare Worker log: while chasing the postcard mockup idea for Sandy's trip, a `cf.latitude`/`cf.longitude` pulled from a live log entry showed her in central Sydney. Scott spoke with her that evening — she and Dave were actually about 300km inland in Millmerran, QLD, nowhere near Sydney.

The likely explanation, and Scott's own read on it: Starlink. Satellite internet backhauls a subscriber's traffic to a fixed ground station/PoP rather than routing it from wherever the dish physically is, so IP-based geolocation (which is all Cloudflare's `cf` object gives you) reflects where the connection surfaces on the terrestrial internet — in this case apparently Sydney — not the subscriber's actual position. This is a known, common gotcha for Starlink users specifically, and exactly the demographic most likely to hit it: caravanners and grey nomads touring rural/remote Australia, which is a real slice of Chasin' Curves' own user base.

Two things this doesn't affect: the Session 16c Facebook-in-app-browser diagnosis used the `user-agent` header, not `cf` geo data, so that finding stands untouched. And the actual shipped GPS Trail feature (Session 15/16) was never at risk either — it captures position from the phone's own `navigator.geolocation`, never from Cloudflare's request-level geo data. This was purely a case of over-trusting a Cloudflare log field for something it was never meant to answer, in an ad-hoc diagnostic/mockup exercise outside the app, not a bug in anything live.

Takeaway for next time: `cf.latitude`/`cf.longitude`/`cf.region` are fine for rough server-side routing/analytics context, but never treat them as a user's ground-truth location — especially not for anyone touring rural or remote areas.

**Also worth keeping in mind for future map/card design:** Scott's own estimate is that most Chasin' Curves users would cap a single day's driving around 300km — a weekend enthusiast chasing a nice stretch of road tops out around 2–300km — with real outliers only for something like an interstate car show or club meet. Useful baseline for sizing map zoom/framing defaults later; distinct from the compliance day-cap work, which counts days used per year, not km per day.

## Session 16d — Trip Postcard v2: vehicle photo hero + faded map + aligned route

A different chat session (Scott, working blind to this one) independently designed a visual upgrade to the Daily Trip Share Card: the vehicle's own hero photo as the card's background (sepia-toned) instead of a full-bleed map, with the map faded in behind it toward the centre and the actual GPS route drawn on top in bold gold — the wordmark and stats sit directly on the photo. That session wrote a patch against a version of `app.js` it had fetched mid-conversation and handed it here for review before anything touched the live file, since it hadn't been tested anywhere.

Review turned up one real bug worth catching before it shipped: the patch shared one explicit map bbox between the Mapbox request and the hand-drawn route's projection math, on the assumption that guarantees alignment. It doesn't — Mapbox can't stretch a map's x and y independently without visibly distorting the roads, so when a bbox's aspect ratio doesn't match the card's 1080×1350, Mapbox silently shows more area on one axis to compensate, and a route projected against the *un-adjusted* bbox drifts from the real roads underneath it. Checked this against the exact Deception Bay → "Sydney" coordinates from earlier in the day (before the Starlink mixup was caught) as a concrete test case: that bbox's real-world aspect ratio was 0.23 against a target of 0.8 — over 3x off, nowhere near a rounding error, and this happens on any route with meaningful skew in one direction, which describes most real highway legs. The second (unrelated) finding was that vehicle photos are served straight from R2's public `pub-*.r2.dev` bucket, not proxied through the worker, so the worker's own CORS headers don't cover them — if that bucket doesn't have its own CORS policy, the photo layer would silently never load, with nothing to say why.

**Fix, built and shipped this session:**
- `correctBBoxAspect(bbox, targetAspect)` — new helper that grows (never shrinks) whichever axis of the padded trail bbox is short, in Web Mercator units, so it already matches the card's aspect ratio before it's sent to Mapbox or used for projection. Once the bbox we send already has the right aspect, there's nothing left for Mapbox to silently adjust, so the map it renders back matches the bbox exactly and the hand-drawn route lines up with it. Validated with a standalone Node test: the exact tall/narrow bug case now corrects to the target aspect precisely, a mirror-image wide/short case does too, a real short loop (like this morning's LandCruiser trip) checks out, and a degenerate near-identical-points trail doesn't produce NaN/Infinity.
- `computeBBox` / `mercatorY` / `mercatorYInverse` / `projectPoint` / `buildBaseMapUrl` — same roles as proposed in review, `buildBaseMapUrl` now always called with the aspect-corrected bbox.
- `loadImageEl` replaces the old `loadMapImage` (which, along with the old baked-in-overlay `buildStaticMapUrl`, is now dead code and has been deleted rather than left behind) — same defensive resolve-null-on-error behaviour, plus a `console.warn` naming which layer failed and why (almost always a CORS issue on the image host) when a load fails, so a missing photo or map layer during testing shows up in devtools instead of just silently not being there.
- `drawTripCard` gained a `heroUrl` param and the new layer order (photo → scrim → faded map → bold route → text, unchanged). Every new layer degrades gracefully on its own — no heroUrl, no trail, or a failed image load each just skip that layer, same defensive pattern the function already had.
- `ShareDayModal.handleShare` resolves the hero photo for single-vehicle days (same `photos[heroPhoto] → photos[0] → avatar` lookup as `GarageView.getVehicleHeroUrl`, deliberately kept duplicated rather than reaching into that component for one call site) and passes it through. Multi-vehicle days keep the map-only treatment, same as before.

Not yet done: this hasn't been run against a real browser in this session either (no live Mapbox/canvas access here) — the fix is grounded in Mercator projection math and validated with a pure-logic test, not a rendered screenshot. **Scott's plan:** take the Z4 out for a test run once this is live, and see what the new card actually looks like against a real trail.

## Same-day follow-ups (15b, 15c, 15d)

Three smaller builds landed after the initial GPS trail push, all same day, all in direct response to the live beta test:

- **15b — Screen Wake Lock.** Sandy & Dave need Waze for navigation on unfamiliar roads, which pauses GPS polling the moment the tab backgrounds (a hard browser/OS restriction, not tunable). Recommended workaround: a second dedicated device running Chasin' Curves for trail-only recording while Waze runs on the main phone. Added the Wake Lock API (`navigator.wakeLock`) so that dedicated device's screen won't auto-lock mid-trip — requested on trip start and on tab re-visibility, released on stop/discard/sign-out. Degrades silently if unsupported; the existing resume-on-reload logic already covers the single-phone case with gaps.
- **15c — "Invite a Mate."** A Profile-screen button using the Web Share API (clipboard-copy fallback) to send a link carrying the inviter's display name as a client-side query param, shown as a personalized "🏁 invited by" banner on the login screen. No backend change — signup was already open to anyone with an email, this is onboarding polish only.
- **15d — Daily Trip Share Card.** The "nice touch" Scott wanted for the family group chat following Sandy & Dave's trip: a "📤 Share a Day" button on the Logbook screen that rolls a calendar day's completed (odometer-closed) trips into one branded PNG — big distance figure, date, vehicle, and (when GPS trail data exists) a Mapbox Static Images route overview plus reverse-geocoded start/end place names (e.g. "Robe, SA → Naracoorte, SA"). Shared via the Web Share API's file-sharing (`navigator.canShare({ files })`) so it drops straight into a chat app as an image; falls back to an in-modal preview + manual download if the browser can't share files. Distance is always summed from Logbook odometer readings (accurate even with GPS gaps from Waze use), never from the trail itself — the map/place-name layer is cosmetic and fails gracefully (day still gets a branded card with no map). New pure helpers (`encodePolyline`, `downsampleForMap`, `groupEntriesByDay`) covered by a standalone Node logic test, including the canonical Google/Mapbox polyline test vector.

None of the three needed a worker.js change — all client-side, reusing the existing public Mapbox token for both the Static Images and Geocoding APIs. Session 16's day-cap work also needed no worker.js change — the Garage endpoint already stores the vehicle array opaquely, so the new `regoAnniversary` field just rides along in the existing PUT.

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
| 1 | Ask Sandy to open Chasin' Curves in Safari directly (not via the Facebook/Messenger link) for her next attempt, and whether the earlier trip now shows up in her Logbook (with or without a "📍 pts" trail button) — confirms whether 16b/16c's diagnosis was right, or whether there's a deeper bug still to chase |
| 2 | Set Registration State (and, for NT vehicles, the new registration renewal date) on Scott's five existing test vehicles (carried over from Session 14) |
| 3 | Confirm whether TAS's 12-month period is rolling or anchored to rego renewal — its guidelines are silent on this; NT is now confirmed anchored (Session 16) and TAS's day cap (104) is confirmed, only the window type remains open. Ring Transport Tasmania directly if it's needed before relying on this for a real roadside stop: (03) 6166 3262 / vehicle.registration@transport.tas.gov.au |
| 4 | Same open question for NSW/ACT/SA/VIC — their day caps are set but the rolling-vs-anchored model was never individually confirmed either; currently defaulted to rolling (the conservative assumption) same as TAS |
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

## Session 16e — Logbook now captures start/finish GPS coords, so odometer-only trips get a reproducible Trip Postcard

Session 16d's photo-hero + faded-map postcard needs a `trail` array to draw anything (map or route) — `hasTrail = trail && trail.length >= 2` gates both layers. Real GPS Trail recordings (`trackGps`, opt-in, continuous, needs the screen on for the whole drive) always produce one. But today's actual test trip — the LandCruiser's 35km run used to sanity-check the 16d fix — was logged as a plain odometer entry, with no trail at all, which is exactly why that share came back with no map and no route even once the R2 CORS fix landed: nothing was broken, there was just no geometry to plot. Scott asked for a way to make these reproducible without requiring the full continuous trail every time.

Fix: two lightweight, one-off GPS fixes, not a second trail-recording feature.

- **`handleLogTrip`** (app.js) now calls the existing `pollGpsPoint()` helper (already used by the GPS Trail poller) once, right when "Log Trip Now" is tapped, and sends it as `startCoord` in the same `POST /logbook/:id` call that creates the entry. A denied/unavailable/slow fix resolves to `null` and never blocks logging the trip — same "graceful, never a thrown error" pattern as the rest of the postcard work.
- **`LogbookView.handleReturnOdo`** does the same at hand-back time, sending `endCoord` alongside the return odometer reading via the existing `PUT /logbook/:id/:entryId` endpoint (the one that already handles `odometerEnd` and `trail`).
- **`worker.js`** validates both (`isValidCoord`, shared by both routes) and stores them as `entry.startCoord` / `entry.endCoord` in the KV-persisted entry — no new endpoints, reusing the existing two.
- **`groupEntriesByDay`** now falls back to synthesizing a straight two-point `[{startCoord,...},{endCoord,...}]` trail for any leg that has both coords but no recorded trail; a real recorded trail still always wins if one exists. This is the one piece that makes the postcard code itself need zero changes — `drawTripCard`'s `hasTrail`/bbox/route logic already handles a 2-point trail correctly (it's literally what the original Deception Bay → Sydney bug case in the bbox fix validation was).
- Logbook entry rows now show a small "📍 Start pin captured" / "Start + finish pins captured" note when there's no full trail, so this is visible without opening DevTools.

Validated: `node --check` on both files after a Babel transform of `app.js`; a standalone Node test (`/tmp/trail_synthesis.js`, 11 assertions) covering: coords-only synthesizes a 2-point trail with correct lat/lng/t; a real recorded trail always wins over coords on the same entry; neither trail nor coords produces an empty trail with no crash; a lone `startCoord` with no `endCoord` does *not* synthesize a trail (a route needs both ends); a multi-leg day correctly concatenates a synthesized leg and a fully-recorded leg in timestamp order, and `distanceKm` is unaffected. Written to both repos via the device bridge, verified byte-identical (LF `scvd-context` copy and CRLF `Chasin-Curves` copy for both `app.js` and `worker.js`).

**Not yet tested against a real browser or a real GPS fix in this session** — same caveat as 16d. Once deployed, the real test is: log a fresh trip (or add a return odo to an existing open one) and check that (a) the "📍 pin captured" note appears in the Logbook, and (b) sharing that day now produces a postcard with a map and route, without needing the full "Track GPS trail" checkbox turned on.

## Session 16f — Share a Trip is now per log entry, not per calendar day (fixes a real blob-shaped route)

Session 16e's fix worked — a real card came back today with an actual gold route line and a "Mount Mellum, QLD → Landsborough, QLD" caption, proof the start/finish coords and the bbox math are all correctly wired end to end. But the route itself was a nonsense blocky shape, not a road, and the caption read "Multiple vehicles · 2 legs" for 62km. Root cause: Scott logged the LandCruiser trip this morning, then took the Z4 out this afternoon per the 16d plan — two completely unrelated trips that both landed on 25 August. The old `groupEntriesByDay` rollup (from Session 15/16d, comment: "a family updating a group chat shares by day... a day may have several legs... that should roll into one distance and route") concatenated both vehicles' trails into one `flatMap`, which draws a straight connecting line from the end of one car's route to the start of the other's — that's the blob. The "Multiple vehicles" fallback label was the same underlying assumption showing through in text.

Scott's fix, exactly as he described it: make the postcard selectable by log entry instead of by day. Calendar-day rollup is gone entirely.

- **`groupEntriesByDay` removed.** Nothing else in the codebase used it (checked — only `ShareDayModal` did; the day-cap compliance counters use their own `dayCountFor`/`rollingDayCount`/`anchoredDayCount` path, untouched). Replaced with `resolveEntryTrail(entry)`, the same recorded-trail-else-synthesized-pins logic from 16e but scoped to one entry instead of flatMapped across a day.
- **`ShareDayModal` now lists one row per completed (odometer-closed) log entry**, most recent first — not one row per day. Each row shows its own vehicle, date, distance, and trail note (`N GPS pts` for a real recorded trail, `start + finish pins` for the 16e fallback, nothing if neither). A multi-leg or multi-vehicle day now just means multiple rows, each shareable independently — no forced merging, and nothing stops sharing more than one card for the same day if that's what someone wants.
- `handleShare` now builds the card from a single entry's own `odometerEnd - odometerStart`, its own vehicle's hero photo (always resolvable now — there's never an ambiguous "which car" case since it's always exactly one), and `resolveEntryTrail(entry)`. `legCount` is always 1.
- UI text: "📤 Share a Day" → "📤 Share a Trip", modal title/subtitle updated to match ("Turns one logged trip into a shareable card"). Internal state var renamed `sharingDay` → `sharingTrip` for the same reason.

Validated: Babel transform + `node --check` on the full file; a new standalone Node test (`/tmp/resolve_entry_trail.js`, 10 assertions) that reproduces the actual bug scenario — a LandCruiser leg and a same-day Z4 leg with real-shaped coordinates — and confirms they resolve to two independent shareable rows with zero cross-contamination between their trails (this is the literal regression test for today's blob route). Written to both repos via the device bridge (LF `scvd-context`, CRLF `Chasin-Curves`), verified byte-identical.

**Still not tested against a real browser in this session.** Once deployed: open Share a Trip, confirm it now lists individual trips (not days), and confirm sharing the Mount Mellum → Landsborough LandCruiser leg on its own produces a real, sensible-looking route instead of the blob. Worth noting for later, not now: if Scott ever wants a genuine multi-leg-same-vehicle trip (fuel stop, lunch stop) rolled into one card again, that's a small, separate follow-up (e.g. multi-select in this same modal) — deliberately not rebuilt speculatively here since he asked for per-entry, not for a smarter same-vehicle grouping heuristic.

## Content Brand

- Instagram: @ChasinCurves
- Email: chasincurves@gmail.com
- Tagline: "Roads, rivers & riffs."
- Brand kit: Cormorant Garamond + Josefin Sans, Midnight #0d0d0d, Champagne #C9A84C, Monza Red #C0392B, Ocean Blue #2E6DA4, Bone White #f5f3ee

## Beta Testers

| Tester | Status | Notes |
|--------|--------|-------|
| Shane "Skeeny" | ✅ Active | Emergent trip coordinator — calls the group "the Rat Bags." Real-world test case flagged in the Murphy Report spec for why an unincorporated Crew can't satisfy any state's compliance scheme on its own. |
| Sandy & Dave | ✅ Active | Scott's aunty + husband, 5-week/~7,000km VIC/SA caravanning trip. First live trail test (Session 16b): reported a trip "disappearing" after stopping it — traced to a missing success confirmation (fixed) and, per real Cloudflare log evidence (Session 16c), to using the app via Facebook's in-app browser rather than Safari (warning banner shipped). Retrying with the fix in place. |

## Filing note

Per Scott's standard practice: this supersedes the Session 14 `handoff.md` (24 August 2026). Archive that one to `chasin-curves/archive/` before replacing it with this file. Unlike Session 14, this session's `app.js`/`worker.js` were written directly into both the real `Chasin-Curves` repo and `scvd-context` via the device bridge (no manual paste-replace step) — part of the "eliminate human error" change Scott asked for earlier today. Git state on both repos should be verified against this handoff before assuming it's fully in sync.
