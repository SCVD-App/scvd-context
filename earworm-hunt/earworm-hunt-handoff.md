# Earworm Hunt — Session Handoff (Aug 2026)

## Status: Concept locked, mechanic fully pivoted, no build started on the new direction

---

## Where this started

Session opened as "musical crossword" — Scott's original pitch was a crossword grid where
entries are short melodies instead of words, intersecting on a shared note, with a
key-shaded note palette so no music theory is required to play. A working prototype was
built (single HTML file, Web Audio synth, theme-select → clue-list → board-screen flow,
per-entry key + instrument, intersection logic) to prove the mechanics. **The mechanics
worked** — grid, key-shading, per-entry instrument switching, and intersection matching
all functioned correctly once a CSS stacking bug (see below) was fixed.

## Why it pivoted

Two things converged:

1. **Naming collision.** A competitive name scan turned up **crosstune.io** — a live,
   active daily music crossword game (audio clues, fill in song titles/artists via
   crossword grid) syndicated on a puzzle hub called Playlin. "Crosstunes" (our
   leading name candidate) is one letter from their name and same category — real risk
   of confusion, not just adjacent branding. Good call to check before building further —
   this is a near-facsimile of an existing product in both name and surface concept, even
   though our actual answer mechanic (melodies, not letters) is different.
2. **Scott's own dissatisfaction with note-count/rhythm accuracy** in the crossword
   prototype (Law & Order's "dun dun" needing a rhythm/rest property, not just note count;
   Smoke on the Water being a 3-4-3-2 riff, not 4 flat notes) surfaced during testing —
   pointed at a deeper question of whether the crossword *format itself* was the right
   fit, separate from the naming problem.

Scott's response: reframe as **"find a melody"** — closer to Wordle/Mastermind than to a
crossword. Chased and confirmed clean:

- **"Earworm Hunt"** — no existing product uses this exact name. "Earworm" alone is
  heavily used elsewhere (a physical party game, an App Store mentalism tool, a Steam
  horror game, generic vocabulary) but the full phrase is clear.
- The **"find a melody"** space is dominated by "guess the song from an audio clip"
  trivia apps (Bandle, SongSnap, SongIQ, Guess The Song) — none of which do closed-palette,
  position-based deduction. That specific mechanic (below) appears to be open ground.

## Locked name: **Earworm Hunt**

No domain needed — distributed from `scvd.app` per standing SCVD download model, same as
the rest of the portfolio.

## The new mechanic (Mastermind rules, Wordle presentation, zero music theory)

- **No crossword grid.** One melody per puzzle. No intersections, no across/down.
- Answer = a sequence of coloured tone-slots, shown empty upfront (length varies per
  melody, same idea as Wordle's boxes but not fixed at 5).
- **Tone wheel replaces the key/note-name system entirely.** No note letters, no
  sharps/flats, no key labels anywhere in the UI — pure colour. This directly solves
  Scott's original "no music theory required" goal, more completely than the crossword's
  key-shading approach did.
- **Wheel is derived per theme board, not per-entry.** Back-calculate from the *hardest*
  melody in that board (the one using the most distinct tones) — every other melody in
  the set is guaranteed to be a subset of that wheel. "Key of G major" as a separate
  concept is retired; the wheel *is* the key now.
- Player builds a guess by tapping colours into the empty slots, then submits.
- **Unlimited guesses** — no fail state. Score/result is "solved in N guesses," a relaxed
  puzzle feel rather than a timed/lives-based challenge.
- Each submitted tile also plays its instrument tone on submit — audible feedback
  alongside visual, consistent with the original per-category-instrument idea (Van Halen
  = overdriven guitar, Fur Elise = piano, etc. — this carries over unchanged).

### Feedback system — the key design decision this session

Single visual channel (luminosity/saturation on the tone's own fixed colour) carries all
feedback, avoiding any clash between "what colour is this tone" and "was this guess
right":

| State | Treatment |
|---|---|
| **Correct tone, correct position** | Full brightness + glowing halo — unmistakably right |
| **Correct tone, wrong position** | Tone's plain resting colour, no effect — sits quietly |
| **Not in the melody at all** | Desaturated to gray — unmistakably wrong |

No legend needed. Reads instantly with zero prior knowledge of Wordle, Mastermind, or
music theory — which was the actual brief from message one tonight.

### What carries over unchanged from the crossword prototype

- Theme boards (TV & Movies, Golden Oldies, 70s/80s/90s/Today) with original CSS-only
  backdrop art (no licensed images — disco-glow, synthwave-not-Cafe-80's-specifically,
  grunge dots, etc.)
- Theme select → clue/puzzle list → board transition flow, selected item pinned at
  bottom of the board screen
- Per-category instrument via Web Audio synthesis (guitar/piano/stab/pluck patches
  already built and working)
- Short-riff copyright approach (3-8 note motifs, synthesized fresh, title references
  fine, no audio reproduction of recordings)

### What's retired

- The crossword grid, entries, across/down, intersections, per-entry key concept
- Note-name palette (C/C#/D…) — colour only from here on
- "Crosstunes" / "Crosstones" naming — dead, replaced by Earworm Hunt

## Bug fixed this session (for the record)

Crossword prototype had a CSS stacking bug: `.screen.hidden` only disabled pointer
events, never actually hid screens visually (no opacity/visibility change). Since all
three screens were `position:absolute`, the last one in DOM order (board screen) sat
permanently on top from page load, covering the other two — this is why Scott couldn't
see or interact with anything on first test. Fixed by giving `.hidden` real
`opacity:0; visibility:hidden; pointer-events:none`. Confirmed via DOM simulation
(jsdom) post-fix; no live device retest happened before the mechanic pivot made the fix
moot.

## Open items for next session

1. **No code exists yet for the new mechanic** — the crossword prototype's screen-flow,
   theme-board CSS art, and audio-instrument engine are all reusable; the grid-rendering
   and key-shading logic is not and should be scrapped rather than adapted.
2. Need to actually pick tone-wheel colours (accessible/colour-blind-safe palette,
   important since correctness now leans entirely on colour + luminosity — worth
   double-checking contrast works for colour-blind players specifically, since two of
   the three feedback states are colour-based).
3. Need real melody data per theme board once mechanic is built (placeholder riffs used
   in the crossword prototype were rough stand-ins, not accurate note counts/rhythms).
4. Decide whether note *duration/rhythm* becomes a property of each tone-slot (flagged
   as a gap during crossword testing — e.g. Law & Order's "dun dun" needs a rest/timing
   cue, not just two identical pitches) — likely still relevant in the new mechanic.
5. Folders `jumpin-pin/` and `hnefatafl/` still need creating in `scvd-context` — unrelated
   housekeeping carried over from before this session, not yet done.

## Files from this session

- `melodycross-prototype.html` — crossword-mechanic prototype (now superseded by the
  pivot above; kept for reference / potential reuse of screen-flow and audio engine
  code, not the grid logic)
