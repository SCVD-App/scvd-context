# Earworm Hunt — Session 2 Handoff (Aug 2026)

## Status: Mechanic rebuilt and validated end-to-end. Real content pass done on one
## demo puzzle. Audio and premium-tier direction defined, not yet built.

Note for context: this session happened opportunistically — Scott had planned to
spend this week on Chasin' Curves, but the Earworm Hunt idea from the prior session
felt strong enough to chase immediately. Chasin' Curves work is deferred, not
dropped; pick up whichever thread makes sense next session.

---

## Where Session 1 left off

Session 1's handoff (`earworm-hunt-handoff.md`) documented the pivot from a
crossword-grid mechanic to a Mastermind/Wordle-style row-guessing mechanic. That
pivot was itself superseded early in this session — see below.

## The mechanic's final shape (this session)

Scott saw an actual Wordle for the first time, didn't like the row-guessing UI at
all, and redirected toward a reference screenshot of **AZBUL** (circular letter
wheel + floating crossword grid). The row-guessing build was scrapped in favour of:

- **A real crossword grid** — across/down entries, genuine intersections, floating
  over the board (not a Wordle-style guess-and-resubmit loop). This is much closer
  to Scott's original message-one pitch than the Wordle detour was.
- **A circular tone wheel**, colour only, no note names or music theory anywhere in
  the UI. Originally built with a key tone isolated in the centre; Scott correctly
  identified that a scale's tonic is both degree 1 *and* degree 8 (octave
  equivalence), so isolating it in the centre was structurally wrong. Fixed: the
  key tone is now folded into the ring itself, positioned at the top (12 o'clock)
  as the lowest pitch in the wheel, with the rest ascending clockwise — the ring's
  own wrap-around stands in for the octave, rather than a separate widget.
- **Ring ordering is by actual pitch**, ascending, not arbitrary data order — this
  was a real usability bug (adjacent wheel positions meant nothing pitch-wise) that
  Scott caught by trying to sound out a real riff and failing.
- **Tap a wheel colour = audition only.** Placing a tone into the grid requires
  tapping a cell first, then a wheel colour — direct-fill, typing-style, not
  drag/swipe (see pull-to-refresh note below).
- **Any filled cell (given or player-placed) is now audible on tap**, and there's a
  "▶ Play this line" button that plays a whole completed entry back in sequence.
  This was a late but important fix — the free difficulty hint was visually
  present but silent, which defeated the point of a game about sound.

### Difficulty tiers (Scott's spec, implemented as designed)

- **Easy** — the entire hub entry (the one with the most intersections) is handed
  over solved. Because it's the hub, this cascades a real starting tone into every
  entry that crosses it.
- **Medium** — just the first intersection's shared tone is given.
- **Hard** — nothing given, though intersection points are still marked
  structurally (a small dot) without revealing their value, so the *shape* of the
  puzzle is visible even when the *answers* aren't.
- Solving any entry automatically protects its cells for every other entry
  crossing through them — this emerged naturally from the single-grid-model data
  structure rather than needing separate logic, and gives real strategic texture
  (solve the easy entry first to seed the harder one next to it).

## Two real construction bugs, and the permanent fix

Scott flagged a genuine crossword-construction rule: entries must never be
edge-adjacent unless they're genuinely intersecting at that exact cell — otherwise
you get an accidental, unclued "leak" between unrelated entries. The existing demo
grid violated this (2 Down was touching both 1 Across and 1 Down without a real
intersection with either).

Fixing it surfaced a second, worse bug: repositioning entries to fix the spacing
broke the intersection *index* math — declared intersections no longer pointed at
the actual shared cell, so the grid's own data silently disagreed with itself. This
is almost certainly why 1 Across felt unsolvable before this was caught.

**Two validators now run automatically on every puzzle load**, surfacing violations
immediately via the on-screen error banner instead of relying on manual eyeballing:

- `validateGridAdjacency` — no two cells from different entries may touch unless
  they share a common entry.
- `validateIntersectionConsistency` — every declared intersection must be the same
  physical cell in both entries, and both entries' answer values at that index must
  agree.

Both were verified by deliberately reintroducing each original bug and confirming
the validator catches it with a precise message. These should make this entire bug
class impossible to ship silently again as more puzzles get built.

Current demo puzzle geometry (4 entries: 1A, 2D [hub], 3A, 4D on a 4×5 grid) passes
both validators cleanly.

## Other bugs fixed this session

- **CSS stacking bug**: `.screen.hidden` only disabled clicks, never actually hid
  screens visually (no opacity/visibility change). Since screens are
  `position:absolute`, the last one in DOM order was always painted on top from
  page load — this is why nothing was visible or interactive in early testing.
  Fixed with proper `opacity:0; visibility:hidden; pointer-events:none`.
- **Pull-to-refresh**: dragging on mobile risked triggering the browser's native
  refresh gesture (a known standing frustration on ECEG too, worth fixing there
  separately). Fixed with `overscroll-behavior: none/contain` across the app and
  scrollable panels, and — more fundamentally — by avoiding drag/swipe gestures
  for tone placement entirely in favour of tap-to-select-then-tap-to-place.
- **Audio not playing on the key tone**: two compounding causes — a CSS bug where
  the key button's `:active` state used `transform`, which stacked on top of its
  base `translate`-based centering instead of replacing it, and a missing
  `AudioContext.resume()` call (mobile browsers often start a fresh context
  suspended even after a user gesture).

## Content and copyright (important, carries forward to all future puzzles)

- **Song titles and artist names are not copyrightable** — safe to reference
  directly in clues. This directly fixes the "amp-shaking riff" vagueness problem:
  name the actual song.
- **Song lyrics are not safe** — even a single line. Lyrics are separately and
  aggressively licensed (Musixmatch, LyricFind, direct publisher deals); this is a
  real commercial risk, not a grey area, and was correctly avoided when Scott asked
  about using a Hotel California lyric as a clue.
- **Melodies stay as short original phrases evoking a song's shape/contour, not
  attempted note-for-note transcriptions.** This is both the safer copyright
  posture and, per the section below, the more achievable accuracy target.
- **AI-generated note transcriptions are not a reliable source.** A Google AI
  Overview list of 30 themes with precise note-by-note transcriptions was reviewed
  this session and flagged as likely partially hallucinated (suspiciously uniform
  "6-7 notes" across 30 unrelated pieces, hedge language on some entries). The
  title/artist half of that list is safe and useful; the transcriptions are not to
  be trusted without independent verification.
- **Recommended verification sources for future puzzle content, in order of
  trust**: Scott's own ear/guitar (best source for the classic rock category
  specifically), licensed transcription books (Hal Leonard etc.), cross-referencing
  multiple independent sources. Crowd-sourced tab sites (Ultimate Guitar etc.) are
  inconsistent and not reliable alone.
- Demo puzzle content was swapped this session from placeholder clues to real
  titles, reusing the existing validated grid geometry (no structural changes,
  content-layer only): **1 Across** = Smoke on the Water (Deep Purple), **2 Down**
  (hub) = Seven Nation Army (The White Stripes), **3 Across** = The X-Files theme,
  **4 Down** = Jaws (John Williams, genuinely a real 2-note motif — clean natural
  fit for the entry length).

## Audio quality — recording pipeline planned, not yet executed

Current synth tones ("plinky") to be replaced with real recordings via Scott's
Scarlett DAW. Decisions made this session:

- **Piano**: lush grand piano, sustain pedal down, single notes.
- **Guitar**: clean and driven/overdriven, straight into the DAW — a good honest
  performance beats chasing a specific tone (SRV-clean was floated as an ideal but
  explicitly not a blocker; "guitar straight in" will sound great and is real,
  which already beats any sample library).
- **Recording spec**: WAV masters, compressed for the app afterward. Notes ring for
  2-3 seconds each — one recording per note serves both long and short in-game
  playback, since Web Audio can gain-ramp a note short whenever needed; no need for
  separate short/long takes. File naming convention: `piano_C3.wav`,
  `guitar_clean_C3.wav`, `guitar_driven_F#4.wav`.
- **Scope**: full plan is piano + clean guitar + driven guitar, each chromatic
  across ~3 octaves (~36 notes × 3 sets ≈ 100+ files). **Recommended to pilot with
  one octave first** (12 piano + 12 clean guitar = 24 files) to validate the whole
  pipeline — recording → compression → accurate pitch-triggering in-app → actually
  sounds good on a phone speaker — before committing the full session. Scott
  expects to be able to do the full suite in a day regardless.
- **Fallback if full chromatic recording is too much later**: record every 2nd or
  3rd semitone and pitch-shift the gaps via playback rate; not needed if Scott's
  happy doing full chromatic runs, just noted as an option.
- Scott flagged his own perfectionism as the main risk to shipping this, not
  technical difficulty.

## Premium chord-mode — new concept this session, design only, not built

Scott offered to also record **major, minor, and 7th chords** for both instrument
tones. Framed correctly as a premium/paywalled tier — fits the existing one-time
USD-per-board model, no subscription, consistent with portfolio-wide philosophy.

- **Coverage**: major/minor/7th of each chord covers most of The Beatles' catalogue
  and most of AC/DC's — genuinely opens up a large, well-known song pool that
  single melodic notes can't reach.
- **Proposed premium board names**: Hard Rocking, Heavy Metal, Rockabilly — genre-
  specific boards, good for App Store search terms and give Chasin' Curves organic
  content angles too.
- **Visual direction for chord mode**: the tone wheel re-skins as a **muscle car
  steering wheel** — leather-wrap texture, stitching detail, brushed-metal spokes —
  to match the genre's attitude. Colour palette shifts from the current
  friendly/bright set to something more sombre, and should **reuse the existing
  Chasin' Curves brand kit** (Midnight #0d0d0d, Champagne Gold #C9A84C, Monza Red
  #C0392B, Ocean Blue #2E6DA4, Bone White #f5f3ee) rather than inventing a new
  palette — keeps the premium tier visually consistent with Scott's existing brand
  language instead of a bolted-on skin.
- **Open design question, deliberately deferred**: a chord-based wheel is a UI
  redesign, not just new audio content. Does a chord get its own wheel colour
  directly, or does chord mode need a second layer/mode toggle over the existing
  single-note wheel? Needs its own design pass next time this is picked up, not
  bolted on casually.

## Open items for next session

1. Pilot recording session (1 octave: 12 piano + 12 clean guitar) — Scott to
   record when desk/monitor access allows during a shift.
2. Once pilot files exist: build the sample-playback engine to replace the current
   Web Audio synth patches, confirm pitch accuracy and mobile speaker quality.
3. Chord-mode wheel UI design pass (see open question above) before any chord
   recording/build work starts.
4. Expand puzzle content using verified sources (Scott's own ear first for rock
   riffs; licensed transcription books for film/TV themes) — do not reuse the
   Google AI Overview note-lists without independent verification.
5. Consider whether the grid needs to support longer entries (e.g. an 8-note slot)
   for songs like Seinfeld's bass line — noted but explicitly not force-fitted
   into the current 4-entry demo this session.
6. Standing housekeeping, still outstanding from Session 1: create `jumpin-pin/`
   and `hnefatafl/` folders in `scvd-context`.

## Files from this session

- `earworm-hunt-prototype.html` — current, fully validated build (grid + circular
  wheel + difficulty tiers + playback + real content). This supersedes
  `melodycross-prototype.html` (the original crossword-with-note-names build from
  Session 1) entirely; the older file can be treated as historical reference only.
