# Cult Connections — Project Handoff

**Session:** 2 (content expansion, tier naming, live bug hunt)
**Date:** 4 July 2026 (late session)
**Status:** ✅ LIVE, playable, monetization tiers named — but see 🚨 CRITICAL BUG below, found in this session's final minutes, NOT YET FIXED
**Version:** v9 (app.js has had several small live pushes since — see Session 1 handoff for full v9 build history)

---

## 🚨 CRITICAL — Puzzle repetition bug confirmed live, fix identified but not yet shipped

**Symptom (confirmed via 20 screenshots from a single ~9-minute, 32-puzzle play session):** puzzles from the `mixed` bank repeat in a perfectly deterministic, identical 5-cycle — `EVERYONE SUFFERS EQUALLY → CROSS-GENERATIONAL → FAMILY CHALLENGE → POP CULTURE MASHUP → KATH & KIM MEETS THE WORLD → repeat`, exact same order, every single lap, 4 times in a row observed. This means the shuffle-bag rotation fix built earlier in Session 1 is **not actually preventing repetition in practice**, whatever the underlying cause turns out to be.

**Confirmed code defect (verified by direct simulation, not just review):** `app.js` contains **two separate `function shuffle(arr){...}` declarations** — the new one written for the rotation fix (returns a shuffled copy), and an older pre-existing one used by the in-game "shuffle tiles" button (mutates in place, **no return statement**). In JavaScript, when a function name is declared twice in the same scope, the **later declaration in the file wins for every call in the entire script**, regardless of where each declaration or call site sits. I verified this both by extracting the exact live code and running it in Node with a mocked `localStorage`, and by an isolated test of the hoisting behavior itself. Result: every call to the new rotation logic silently invokes the *old* shuffle instead, which returns `undefined`, which causes `getFallback()` to throw immediately.

**The contradiction worth understanding before "fixing" this:** a throw inside `getFallback()` should make the game get stuck on the loading screen, not cycle cleanly through 5 puzzles the way the screenshots show. Two possible explanations, not mutually exclusive:

1. **Most likely: browser/CDN caching.** We spent a large chunk of Session 1 fighting exactly this class of problem (GitHub Pages serving a stale file despite a successful-looking deploy). It's very plausible the phone was still running an **older cached `app.js`** — specifically the version *before* the shuffle-bag fix, which still has the original bug (an in-memory counter that never resets mid-session, producing exactly this kind of clean deterministic repeat). This fits the observed symptom perfectly and doesn't require anything to have silently swallowed a crash.
2. **Less likely but not ruled out:** something in the live browser environment (not reproduced in this Node simulation) is catching the throw and falling back to a sequential order without surfacing an error. Worth checking Chrome's DevTools console on-device for actual thrown errors before assuming #1 is the full story.

**The fix is unambiguous either way** — rename the new function (e.g. `shuffle` → `shuffleArray`) so it can never collide with the older tile-shuffle function again. This should be done regardless of which explanation above turns out to be correct.

**Recommended steps for next session, in order:**
1. Rename the rotation-logic `shuffle` function to `shuffleArray` (and update its two call sites inside `getShuffleBag` and `getFallback`) to eliminate the naming collision permanently
2. Before considering this closed, **actually test live in a real browser** — open Chrome DevTools on the phone or desktop, hard-refresh to guarantee the latest `app.js`, and play through more than one full bag-cycle (6+ puzzles) watching the console for errors, not just eyeballing whether puzzles repeat
3. Confirm `localStorage` under key `cc_bag_mixed` (and the other player pools) actually contains a sensible array of remaining indices between puzzles, using DevTools' Application/Storage tab
4. Once confirmed fixed, this is a good moment to also verify the `scott` bank rotation is behaving correctly given it's now grown from 7 to 8 puzzles this session — worth confirming the "bag becomes invalid if bank size changed, reshuffle fresh" logic in `getShuffleBag` actually triggers correctly when new content is added mid-flight

---

## What else happened this session

### Content bug fixes (verified via web search before shipping, learning from an earlier mistake this same evening where an unverified "fix" introduced two new factual errors)
- **Crossroads Film Characters**: swapped "Lightning Boy" (Eugene's own alias, not a real fourth character) for **Jack Butler** (the actual antagonist), per Scott's direct knowledge of the film
- **Newman's Seinfeld category** — a second-pass correction was needed after an earlier fix (in Session 1) turned out to itself contain two factual errors (Bosco belongs to George, not Newman; "Race Walking Cheat" doesn't exist — that episode is about Jerry, not Newman, and it's a sprint not race-walking). Replaced with four properly source-verified items: Hoards Mail In Storage, Bottle Return Scheme, Flea Infestation, Reads Elaine's Mail
- **Les Paul Legendary Players**: swapped Joe Perry for **Slash**, per Scott's correction (Slash is well-documented, including by Gibson itself, as reviving Les Paul's popularity in the late 80s via Guns N' Roses) — worth noting Slash now appears in three different puzzles across the bank (not a bug, just a recurrence pattern worth having in mind for future content)

### New content shipped
- **"Guitar Heroes & The Blues"** — new fully-verified puzzle added to the `scott` bank (now 8 puzzles, up from 7): Famous Electric Guitar Models (Gibson SG, Ibanez JEM 777, Fender Starcaster, Fender Jaguar), Gibson Les Paul Legendary Players (Jimmy Page, Duane Allman, Peter Green, Slash), Robert Johnson Songs (Cross Road Blues, Sweet Home Chicago, Love in Vain, Hellhound on My Trail — the exact four credited by the Rock and Roll Hall of Fame), Classic Film One-Word Titles (Jaws, Rocky, Alien, Grease)
- Confirmed via editing mistake (caught immediately, corrected): while inserting the above, two existing categories (Led Zeppelin Albums, George's Fake Jobs) were briefly accidentally deleted from the Crossroads puzzle. Restored and verified before shipping — a good reminder to re-verify puzzle category counts (must be exactly 4 per puzzle) after any edit near an existing puzzle block

### Content backlog — ideas only, NOT yet built as real puzzles
Carried over from Session 1, now added to:
1. Viral Challenges & Crazes (Ice Bucket Challenge, Mannequin Challenge, Harlem Shake, Gangnam Style — sourced)
2. Famous Internet Catchphrases (All Your Base Are Belong To Us, Damn Daniel, Sure Jan, Oh Hi Mark — sourced)
3. Viral Animal Stars (Grumpy Cat, Doge, Nyan Cat confirmed; a 4th — likely Harambe — needs fresh verification before use)
4. Disney (classic animation studio era only — keep strictly separate from Pixar, since Disney distributes Pixar and mixing them risks real ambiguity about which studio a puzzle means)
5. Pixar (standalone productions only)
6. Action Movie Stars (Scott's own wheelhouse — Stallone/Schwarzenegger/Willis/Statham-type territory)
7. Disney Princesses (`kids` pool)
8. US Presidents — **historical facts only** (non-consecutive terms, assassinations, Mount Rushmore, related presidents). Deliberately avoid anything from roughly the last 2-3 administrations to sidestep contemporary political sensitivity across the AU/UK/Ireland audience
9. **Men Who Walked on the Moon** — fully sourced via NASA/Wikipedia, exactly 12 people ever, divides perfectly into 3 non-overlapping sets of 4 with zero repeats:
   - Armstrong, Aldrin, Shepard, Cernan
   - Conrad, Bean, Scott, Young
   - Irwin, Duke, Mitchell, Schmitt
10. Movies by decade (kindling, from Session 1) — 80s and 90s lists strong and ready; 2000s needs a genre outlier added (too much Ferrell/McKay-lane currently); 2010s should stay deliberately thin rather than padded; 2020s: Everything Everywhere All at Once confirmed good, avoid "anything Marvel" as too vague — franchise-specific mining (in-universe objects, actor crossovers, structural features like MCU Phase 1 vs Phase 3) is the better strategy than flat franchise trivia

### Monetization — names finalized
Tier structure confirmed with Scott, mirrors ECEG's one-time-purchase pattern:

| Tier | Duration | Price |
|---|---|---|
| Square Eyes | 1 month | $1.50 USD |
| Couch Potato | 6 months | $7.50 USD |
| Pop Culture Vulture | 12 months | $10.00 USD |

No forever tier — deliberately parked pending a possible future cross-app bundle (see Session 1 handoff). Cloudflare Worker and Stripe Price IDs for these three tiers are still the primary outstanding infrastructure task, unchanged from Session 1.

### Portfolio-wide context gathered this session (worth knowing even though it's not Cult Connections-specific)
- Full review conducted of Mic Drop, Easy Come Easy Go, and Chasin' Curves handoffs/code via the `scvd-context` repo
- **Chasin' Curves gap found and fixed**: `app.js` was missing entirely from the `chasin-curves` folder in `scvd-context` (only `index.html`, `worker.js`, `handoff.md` were present) — Scott pushed the missing file, verified byte-for-byte match with what was uploaded
- Mic Drop: live, real payments, chasing 3 P1 audio bugs (iOS mimeType, PWA home-screen silence, mic-loss distortion)
- ECEG: Stripe sandbox confirmed end-to-end, a real token-collision security bug was fixed this cycle (every buyer of a tier previously got an identical, shareable token), two items marked urgent — delete the stray `eceg` worker, get `worker.js` out of a personal Downloads folder (nearly lost twice now)

---

## 🏗️ Infrastructure note (carried forward, still true)

The original `Cult-Connections` GitHub repo was deleted and rebuilt from scratch during Session 1 due to an unrecoverable stuck GitHub Pages deployment lock (see Session 1 handoff for full details). The current repo has clean history starting from that rebuild. `scvd-context/cult-connections/` remains the durable source of truth for all files.

**GitHub Mobile app** was successfully trialled this session for the first time — multiple small `app.js` pushes went cleanly with no repeat of Session 1's deployment drama. Good tool for quick fixes when away from a laptop.

---

## Known Limitations (carried forward + new)

| Issue | Notes |
|-------|-------|
| **Puzzle rotation may still be broken in practice** | See critical bug section above — top priority for next session |
| Trial clock is client-side only | Resettable by clearing site data/reinstalling — acceptable at current stage |
| No backend yet at all | Purchase flow is UI-only until the Worker is built |
| Sport/Fashion/movie/viral/Disney/Pixar/Presidents/Moonwalkers content | All still backlog ideas, not built as playable puzzles |
| `scott` bank content is Slash-heavy | Now appears in 3 separate puzzles — not a bug, but worth diversifying next content pass |

---

## Open Actions (priority order for next session)

| # | Task |
|---|------|
| 1 | **Fix the shuffle function naming collision** (rename to `shuffleArray`), then verify live in an actual browser with DevTools open — don't just assume it's fixed from code review alone |
| 2 | Build the Cloudflare Worker + Stripe Price IDs for the three named tiers |
| 3 | Start converting backlog content (Moonwalkers is the most ready — fully sourced, perfectly bounded at 12 people / 3 puzzle variations) into real hand-authored puzzles |
| 4 | Get Steve (Ireland) testing for UK/Ireland cultural fit now that the app is stable and installable |
