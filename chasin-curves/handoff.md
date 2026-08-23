# Chasin' Curves — Project Handoff

**Session:** 14
**Date:** 24 August 2026
**Status:** BUILT, NOT YET DEPLOYED — Logbook (phase 1 of Murphy Report & Logbook compliance feature) coded against the live app.js/worker.js, needs Scott to paste-replace and push from his machine, then a Wrangler deploy.

---

## Overview

First code from the weekend's Murphy Report/Logbook planning session (see `chasin-curves/murphy-report-logbook.md`, `chasin-curves/snail-trail-road-extraction.md`, `chasin-curves/chasin-curves-master-build-plan.md`). Built strictly to the master build plan's recommended sequencing: **Logbook first** — zero external dependencies, useful in every state, validates the KV data shape before GPS trail capture or Murphy Report get built on top of it. No GPS trail, no club-event branch, no Murphy Report UI this session — those are explicitly phase 2/3 in the plan.

**Why this session's code isn't already pushed:** this Claude session doesn't have write access to the `scvd-context` repo (or the actual `Chasin-Curves` app repo) — only read access via the public clone URL. `app.js` and `worker.js` below are ready to paste-replace into the live files; `scvd-context` itself should get the same two files plus this handoff so context stays in sync with what's actually deployed.

## What Changed This Session

**Worker (v3.1 → v3.2):** three new endpoints, same session-owner-isolation pattern as `/garage`:
- `GET /logbook/:id` — returns the member's Use Entry array (empty array if none yet)
- `POST /logbook/:id` — creates a Use Entry. `entryType` is hardcoded to `general_use` server-side (club events arrive with Murphy Report). **`timestamp` is always `Date.now()` on the server — a client-supplied timestamp is never read.** This is what makes VIC Regulation 157(6)'s forward-dating ban (and backdating generally) structurally impossible rather than a UI convention that relies on nobody working around it.
- `PUT /logbook/:id/:entryId` — the one mutation a filed entry ever gets: attaching a return odometer reading after the trip. Rejects a value lower than the entry's `odometerStart`. Nothing else about a logged entry can be changed once it exists.

Stored as `logbook:{email}` — one array blob per member, same KV pattern as `garage:{email}`.

**Frontend:**
- New **Logbook** tab in the bottom nav (between Garage and Profile).
- **`LogTripModal`** — "Log a Trip": vehicle dropdown → odometer smart-defaulted to that vehicle's last logged reading (editable) → one tap logs it. No date/time field at all, matching the spec's core compliance advantage over a paper logbook. Confirms before saving if the entered odometer is lower than the vehicle's last reading (typo catch, not a hard block — a genuinely replaced odometer is rare but real).
- **`VehicleDayCapCard`** — per-vehicle rolling day-count bar against that vehicle's state cap (NSW/ACT 60, SA 90, VIC 45 or 90 per the vehicle's chosen scheme). QLD/WA show "event-based, no day cap" instead of a bar. TAS/NT show "cap not confirmed yet" rather than guessing a number, since the spec explicitly flagged both as unresolved research gaps.
- **`RegoStateField`** — new Registration State field (+ VIC's 45/90 day-cap picker), added to the Add Vehicle form and as an editable block in `VehicleDetail`, so Scott's five existing test vehicles can be brought up to date without re-adding them.
- `POINT_ACTIONS.log_trip` — 5 points per trip logged (kept low relative to `add_vehicle`/`add_road` since this is meant to be a frequent, low-friction action, not a milestone).

**Deliberate engineering call, flagged for Scott to sign off on:** the day-count uses a rolling 365-day trailing window, not a window anchored to each vehicle's actual rego renewal date. This avoids needing a new `regoRenewalDate` field this session and is very likely fine — but if any state's fine print turns out to require counting against a fixed rego-anniversary year rather than a rolling window, this needs revisiting before being relied on at a roadside stop. Said explicitly in the UI ("Rolling 365-day count, not a fixed calendar year — cross-check against your actual rego period") so nobody mistakes it for the confirmed-correct answer to how these caps actually get audited.

**Not built this session (by design, per the master plan):** GPS trail capture, club-event entries, Murphy Report UI, `partner_club_id`. All wait for their turn in the sequence.

## New fact surfaced this session, not previously documented anywhere

Confirmed via TfNSW's own log book fact sheet: **mechanic/repair trips count toward the 60-day general-use cap in NSW** — "maintenance and personal use" are grouped as one allowance, not separate. Not confirmed either way for VIC or SA yet. Worth folding into `murphy-report-logbook.md`'s NSW row next time that doc gets touched.

## Infrastructure

No infra changes this session — still Wrangler CLI on Scott's Windows machine, deploy-by-`wrangler.toml`-name (Session 11 fix holds). Mapbox confirmed live (Session 13 correction, already reflected in `scvd-infrastructure.md`).

## Open Actions

| # | Task |
|---|------|
| 1 | Paste-replace `app.js` and `worker.js` into the live repo and Wrangler-deploy — this session's code is unverified against the real Cloudflare Worker/KV until that happens |
| 2 | Set Registration State on Scott's five existing test vehicles (BMW Z4, Jaguar X350, Triumph Thunderbird, LandCruiser, Mustang boat) — day-cap tracking shows nothing until this is done |
| 3 | Confirm whether the rolling-365-day window is the right model vs. an anchored rego-year window (see engineering call above) |
| 4 | Direct-read NT and TAS scheme guideline PDFs to close the day-cap gaps (carried over from `murphy-report-logbook.md`) |
| 5 | GPS trail capture as opt-in add-on to Logbook (master plan step 2) — next build once step 1 is confirmed working live |
| 6 | Build a shortlist of QLD incorporated clubs for a Murphy Report pilot partnership (carried over) |
| 7 | Extend `addedBy` attribution to road list cards and map pins (carried over from Session 11) |
| 8 | Fix `member.roadsAdded` counter (carried over from Session 11) |
| 9 | Crew — full spec + build (carried over) |
| 10 | Trip co-organiser / deputise (carried over) |
| 11 | Viewport-driven road list, proper Mapbox Studio style, flat-earth Easter egg, shareable garage links (all carried over from Session 10) |

## Scott's Fleet (Test Data)

Unchanged — BMW Z4 E85 Imola Red, Jaguar X350 Champagne, Triumph Thunderbird Storm, Toyota LandCruiser 200 Series, 1993 Mustang 3200 Widebody boat. None have a Registration State set yet (see Open Action #2).

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
| Shane "Skeeny" | ✅ Active | Emergent trip coordinator — calls the group "the Rat Bags." Also the real-world test case flagged in the Murphy Report spec for why an unincorporated Crew can't satisfy any state's compliance scheme on its own. |

## Filing note

Per Scott's standard practice: this supersedes the Session 11 `handoff.md` (30 July). Archive that one to `chasin-curves/archive/` before replacing it with this file. This session's `app.js`/`worker.js` were built read-only against a clone of `scvd-context` — Scott needs to paste-replace both into the actual `Chasin-Curves` repo (`C:\Users\User\GitHub\Chasin-Curves`) and into `scvd-context` itself, confirm the right repo tab/remote before pushing either.
