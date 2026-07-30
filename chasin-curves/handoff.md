# Chasin' Curves — Project Handoff

**Session:** 11
**Date:** 30 July 2026
**Status:** BETA — public member profiles + follows shipped, Wrangler deploy pipeline set up

---

## Overview

Community roads feature: road attribution is now clickable, opening a public member profile with a one-way Follow. Grew out of a conversation about how road communities actually organise in practice — a small number of "leader" members end up coordinating runs (Skeeny/"the Rat Bags" being the live example), and Follow is designed to surface that organically via follower count rather than needing a manual "leader" flag. Also: Wrangler CLI set up properly on Scott's machine, closing off the "wrong dashboard tab" deploy risk flagged in Session 10.

## What Changed This Session

**Worker (v3.0 → v3.1):**
- `GET /members/:id/public` — new endpoint, any authenticated member can call it for any other member's id. Deliberately minimal: returns only `{id, displayName, avatar, location, joinDate, points, tripsPlanned}` — never email, bio, or garage. This is the first time any member's data has been exposed to anyone other than themselves; existing `/member/:id` stays locked to session-owner-only exactly as the Session 10 auth rebuild left it.
- `GET /follows?of=:id`, `POST /follows`, `DELETE /follows` — one-way follow relationship, stored as a single array blob (`{followerId, followedId, createdAt}`), same KV pattern as roads/trips. GET returns follower/following counts plus whether the current viewer is already following, so the UI button state is a single call.

**Frontend:**
- `AddedByLink` — clickable "Added by ___" component, added to `RoadDetail` under the region line. Resolves the adder's real display name via the new public endpoint before rendering anything; never shows the raw id (which is an email address post-Session-10-auth-rebuild). Falls back to "a member" while loading or if the lookup fails — covers the old seed-data roads still tagged `addedBy: "scott_cc"`, which has no matching real member record.
- `MemberProfile` — modal reached via `AddedByLink`. Shows avatar, location, points/tier, follower/following counts, Follow/Unfollow button (hidden when viewing your own profile), and roads added.
- Sign-out button label changed from "Out" to "Exit" (was truncated/unclear on mobile).

**Naming note, not changed:** roads use `addedBy`, trips use `createdBy` — different field names for the same concept across the two entity types. Left as-is; renaming `addedBy` would touch the worker/KV schema for no real gain. Worth knowing so future sessions don't assume `createdBy` exists on a road object.

**Known bug, not fixed this session:** `member.roadsAdded` is initialised to `[]` on account creation and never incremented anywhere — `earnPoints()` only updates `points`. A member's own profile screen and the new public profile both display road counts, but the public profile works around this by deriving the count live from the roads already loaded client-side (filtering by `addedBy === memberId`) rather than trusting the stored counter. The stored counter itself is still wrong and would show 0 for everyone if read directly — flagging so it doesn't surprise anyone later.

## Infrastructure

**Wrangler CLI set up on Scott's Windows machine**, scoped per-project via each repo's own `wrangler.toml`. Fixes the root cause of the Session-9-era mistake where a Chasin' Curves worker got overwritten with Mic Drop code — deploys now target by the `name` field in the project folder's config, not by whichever Cloudflare dashboard tab happens to be open. Setup chain (Node → npm → Git → Wrangler → Cloudflare login) hit some friction — nvm-windows failed silently (needed admin rights, ended up going the plain nodejs.org installer route instead), PowerShell's default execution policy blocked npm's `.ps1` shim (`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` fixed it) — but is now fully working and proven via a live deploy.

Same setup process (now a known-good recipe, not exploratory) is available for Mic Drop and ECEG whenever Scott gets to them — currently only Chasin' Curves has been done.

Repo location on Scott's machine: `C:\Users\User\GitHub\Chasin-Curves` (already cloned before today's session, not under the `Documents` path originally suggested).

## Crew (concept only — not built this session)

Trip-planning group concept, deliberately named "Crew" rather than "club," "gang," or "team" — those carry baggage (hierarchy/dues, negative connotation, competition) that cuts against the actual audience. Target user: middle-aged enthusiasts who've spent years raising families and are only now getting time back for people with shared interests — Crew is meant to support a low-commitment monthly cadence (a cruise, a stop for food, a chat), not a high-engagement social feature. Explicitly flagged as its own build — touches trip planning, membership, and probably its own profile surface — not a tomorrow-morning add-on to Follow.

**Also raised, not scoped:** trip co-organiser / "deputise" — Skeeny (the live example of an emergent run coordinator) occasionally hands off coordination for a specific run while he's away. This is trip-level, not profile-level — likely a `coOrganisers: []` array on the trip object, giving delegated edit rights on that one trip. Separate from Crew and from Follow; not designed yet.

## Open Actions

| # | Task |
|---|------|
| 1 | Extend `addedBy` attribution to road list cards and map pins, not just `RoadDetail` — deliberately scoped out this session to keep the build tight |
| 2 | Fix `member.roadsAdded` — either increment it properly on road add, or formally decide the derived-live-from-roads approach is the permanent pattern and remove the stored field |
| 3 | Crew — full spec + build (see above) |
| 4 | Trip co-organiser / deputise — spec + build (see above) |
| 5 | Set up Wrangler for Mic Drop and ECEG (recipe now proven, just needs repeating) |
| 6 | Viewport-driven road list — map pan/zoom replaces state-filter buttons (carried over from Session 10) |
| 7 | Proper Mapbox Studio custom style (carried over from Session 10) |
| 8 | Flat earth map Easter egg (carried over from Session 10) |
| 9 | Shareable garage links via query param (carried over from Session 10) |
| 10 | Mobile/PWA touch testing for Mapbox pan/zoom — Scott has since tested this live on his phone, minor lag on tagged-location redraw during pan, otherwise confirmed fine. Can likely be closed out / downgraded from the Session 10 risk flag. |

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
| Shane "Skeeny" | ✅ Active | Emergent trip coordinator — calls the group "the Rat Bags." Live test case for Follow once he follows Scott's account. |

## Filing note

Per Scott's standard practice: this supersedes the Session 10 `handoff.md`. Archive the current live one to `chasin-curves/archive/` before replacing it with this file — filename pending confirmation of Session 10's actual end time (date only was recorded: 27 July 2026). Paste-replace whole file, confirm the right repo tab is open before pushing.
