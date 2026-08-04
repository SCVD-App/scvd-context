# Cult Connections — Project Handoff

**Session:** 4 (post-launch bug fixes, engine upgrade, major content expansion)
**Date:** 4 August 2026
**Status:** ✅ LIVE, monetization proven working end-to-end, content bank nearly doubled
**Version:** v11 — `app.js` grew from 970 → 1000+ lines across this session's edits

---

## Headline: two real production bugs found and fixed, plus a genuine engine upgrade

This session started as a "how do I add categories" conversation and turned into finding and fixing two more real live bugs (on top of Session 3's shuffle-collision fix), then a solid run of verified content building. Full breakdown below.

---

## What happened this session, in order

### 1. Bug fix: shuffle-bag didn't reshuffle when the bank GREW, only when it shrank
**Symptom:** Scott played 7 Solo-mode rounds after content had just been added and saw only old, repeating puzzles — no sign of the new content.

**Root cause:** `getShuffleBag`'s validity check (`Math.max(...bag) < bankLength`) only catches a bank getting *smaller* — old indices are still "in range" for a *bigger* bank, so a stale bag from before new content was added just kept cycling until it happened to exhaust naturally. This is the exact scenario Session 2's handoff flagged as unverified ("worth confirming reshuffle triggers correctly when new content is added mid-flight") — now confirmed broken, and fixed.

**Fix:** the stored bag now carries the exact `bankLength` it was built for. Any mismatch at all — grow or shrink — forces an immediate fresh reshuffle. Verified via simulation reproducing Scott's exact real-world scenario (old-format leftover bag): new puzzles now surface in the very first two rounds instead of being hidden behind stale rotation state. Also gracefully self-migrates old-format bags with no manual clearing needed.

### 2. Bug fix: purchase-flow toast messages were invisible outside the game screen
**Symptom:** the retry-logic fix from Session 3 was demonstrably working (confirmed by a 5–8 second delay matching the retry window), but Scott never saw the "Confirming your payment…" message — it looked stuck even though it wasn't, and needed two manual refreshes to show as unlocked.

**Root cause:** `showMsg()` writes into `#msgArea`, an element that only exists inside `#gameScreen` — hidden via CSS the rest of the time. Every purchase-flow message (confirming, unlock success, even the original "unlock failed" from the Session 3 bug) was firing into an invisible element whenever the redirect landed on the home/purchase screen rather than mid-puzzle.

**Fix:** switched all purchase-flow messaging to `showGruberToast()`, which appends directly to `document.body` and is visible regardless of active screen. Also changed it to re-display on every retry attempt (not just the first) so it stays visible continuously through the confirmation window instead of disappearing after 1.5 seconds.

### 3. Engine upgrade: randomized category pools
New capability added to the puzzle engine: a category can now define a `pool` of more than 4 items instead of a fixed `items` array of exactly 4. At launch time, `resolvePuzzleCategories()` randomly selects 4 from the pool — meaning the same puzzle can show a genuinely different combination of answers each time it's played, without touching the shuffle-bag rotation logic at all (that still only ever sees one puzzle per themeLabel; the randomization happens *after* selection).

Verified via repeated simulation: puzzles with pools reliably vary their shown items across runs; puzzles using fixed `items` (e.g. The Big Four tennis players, Grand Slam Tournaments — anything where the full set IS exactly 4) correctly stay constant every time, as intended.

### 4. Major content expansion — 6 new puzzles added, `scott` bank grew from 8 → 15
All content fact-checked against real sources before shipping (Wikipedia, official franchise wikis, multiple corroborating sources for anything non-obvious) — same discipline as Session 2's Newman/Crossroads corrections, several genuine errors caught and avoided before they shipped this time round.

| Puzzle | Categories |
|---|---|
| **ICONIC WHEELS** | Movie & TV Cars · F1 Team Names · Motorcycle Brands · Bond Cars |
| **GLOBAL CHAMPIONS** | The Big Four (tennis) · Tennis Legends · Golf Legends · Grand Slam Tournaments |
| **MACHINES OF THE FUTURE** | Robots & Droids · Famous Cyborgs · Fictional AI Systems · Iconic Spaceships |
| **PULP ADVENTURE** | Indiana Jones Artifacts · Pulp Adventure Heroes · Treasure Hunt Franchises · Iconic Pulp Villains |
| **SCI-FI ARSENAL & ARCHIVES** | Sci-Fi Villains · Famous Time Machines · Alien Species · Sci-Fi Weapons & Gadgets |
| **FABLED GODS** | Greek Gods · Norse Gods · Egyptian Gods · Legendary Demigods & Heroes |

Notable corrections made *during* verification, before anything shipped:
- F1 category uses **Audi**, not Sauber — Sauber's operation has actually transitioned to a full Audi works team for the 2026 season; Sauber only still appears on official entry lists for legal-paperwork reasons
- Colonel Steve Austin used in full (not just "Steve Austin") to avoid colliding with Stone Cold Steve Austin in players' heads
- Data's real Star Trek rank is technically Lieutenant Commander, not Commander — kept "Commander Data" anyway since that's how virtually everyone refers to him, but worth knowing
- Confirmed Colonial Vipers (Battlestar Galactica) fire **Kinetic Energy Weapons** (autocannons), not plasma cannons — a wrong guess was floated and correctly checked before use
- "Mandy Patinkin" as a Kath & Kim neighbour nickname — no independent source found online, accepted on Scott's direct show knowledge (same precedent as Session 2's Jack Butler/Slash corrections)
- DeLorean is correctly Car + Time Machine only, NOT also a spaceship (never leaves Earth's atmosphere on screen) — corrected after Scott caught the error
- Genre discipline maintained: Indiana Jones content kept OUT of the sci-fi puzzles and given its own "Pulp Adventure" puzzle instead, since it's adventure/supernatural rather than sci-fi (same logic as keeping Disney separate from Pixar)
- Jesus deliberately excluded from the Fabled Gods puzzle despite being floated (as a joke) — Zeus/Thor/Odin are normalized pop-culture mythology, but mixing in a currently-practiced living faith risked landing as flippant for a chunk of the player base with little comedic upside; Scott agreed once flagged

### Duplicate-content hygiene
Ran a full duplicate check across all banks before and after every addition this session (script-based, not eyeballed) — zero unintentional duplicates introduced. Two legitimate dual-fact overlaps exist by design and were flagged transparently rather than "fixed": TARDIS (Spaceship *and* Time Machine, both true in-universe), and the pre-existing "Aston Martin" (F1 team name) potentially co-appearing with "Aston Martin DB5/DBS" (Bond cars) in the same puzzle — not a bug, just a fun coincidence risk given how the random pools work.

---

## Content backlog — updated

**Still banked, needs completing:**
- **Superweapons & Doomsday Devices** — pool ready (Death Star, Infinity Gauntlet, Ultimate Nullifier, Starkiller Base, Genesis Device, The Crucible, The Galaxy from Men in Black) but needs 3 more categories to become a full puzzle
- **Second Kath & Kim puzzle** — Cujo and Epponee-Rae confirmed as legitimate content (both are in the show's actual title sequence from Series 3), needs 2 more items + 3 more categories
- Carried over, unbuilt: Viral Challenges & Crazes, Famous Internet Catchphrases, Viral Animal Stars, Disney (classic only), Pixar, Action Movie Stars, Disney Princesses, US Presidents (historical only), Men Who Walked on the Moon, Movies by decade

**New idea surfaced, not yet started:** SCVD Apps social media presence — decided to launch with one master `SCVD Apps` account (not per-app accounts) on TikTok first, given limited weekly time budget. Profile picture concept designed and generated (navy background, amber "SCVD." wordmark, underline under the V for "Value," period signifying no ongoing charges/opt-in-only — matches scvd.app's existing voice and palette). Bio drafts written in the site's established tone. Not yet posted or set up.

---

## 🧹 Known content issue (carried forward from Session 3, not yet actioned)

The "ROBERT JOHNSON SONGS" category still exists as an exact duplicate across two puzzles ("BLUES, FILM & STRINGS" and "GUITAR HEROES & THE BLUES"). Not urgent, still on the list for a future cleanup pass.

---

## 🏗️ Infrastructure state

| Item | Status |
|---|---|
| Local dev clone | `C:\Dev\Cult-Connections` — confirmed working, all files synced |
| `scvd-context` local clone | ⚠️ Still under `Documents\GitHub\` (OneDrive-synced) — still not moved, same risk flagged last session |
| Cloudflare Worker | Live, stable, no changes this session |
| Stripe | Live mode, working — no changes this session |
| Puzzle rotation | Fixed properly this time — reshuffles correctly on any bank size change |
| Purchase → unlock flow | Fixed properly this time — visible feedback on every screen, not just mid-game |

---

## Known Limitations (carried forward + new)

| Issue | Notes |
|-------|-------|
| Robert Johnson Songs category duplicated | Still pending cleanup — see above |
| `scvd-context` still under OneDrive-synced path | Same corruption risk flagged last session, still not actioned |
| Superweapons puzzle incomplete | Pool ready, needs 3 more categories |
| Second Kath & Kim puzzle incomplete | Needs 2 more items + 3 more categories |
| SCVD Apps social presence | Branding designed, not yet live anywhere |

---

## Open Actions (priority order for next session)

| # | Task |
|---|------|
| 1 | Move `scvd-context` local clone to `C:\Dev\scvd-context` — flagged two sessions running now |
| 2 | Complete the Superweapons puzzle (3 more categories needed) |
| 3 | Complete the second Kath & Kim puzzle (2 more items + 3 more categories needed) |
| 4 | Deduplicate the Robert Johnson Songs category |
| 5 | Set up the SCVD Apps TikTok account using the designed branding, post first batch of clips |
| 6 | Continue converting original backlog content — Moonwalkers still the most ready |
| 7 | Get Steve (Ireland) testing for UK/Ireland cultural fit |

---

## 🏗️ Infrastructure note (carried forward, still true)

The original `Cult-Connections` GitHub repo was deleted and rebuilt from scratch during Session 1. `scvd-context/cult-connections/` remains the durable source of truth for all files — this handoff should be pushed there to close out the session.
