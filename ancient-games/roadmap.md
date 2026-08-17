# Ancient Games — Next Titles Handoff

**Status:** Planning only — nothing built yet. This document exists to lock in the research and the numbering decision before any code gets written, same as the original Hnefatafl handoff locked in the 01–04 numbering before Ur/Nine Men's Morris/Jumpin' Pin got their own treatment.

**Context:** the existing four (Jumpin' Pin · 01, Royal Game of Ur · 02, Nine Men's Morris · 03, Hnefatafl · 04) skew Northern European / Mesopotamian / Roman. Prompted by a direct question — "do all ancient games lead to Rome?" — a proper survey was done of Indian, Chinese, and Mesoamerican traditions to find candidates that hold up to the same bar: real archaeological/textual evidence, genuinely reconstructable rules, not folklore dressed up as history.

---

## Numbering — locked in

- **Pachisi = Ancient Games 05**
- **Patolli = Ancient Games 06**
- **Go (Weiqi) = Ancient Games 07** — deliberately NOT bundled with 05/06. See "Why Go stays separate" below.

Pachisi + Patolli are proposed as the next bundle (same "two games, one Pro unlock" shape as Two Ancient Classics), on the strength of a real structural link: both are cross-shaped-board race games driven by chance (cowrie shells / beans standing in for dice), same family as Ur. Worth deciding whether that shared lineage becomes part of the marketing angle (a genuine, sourced connection, not a stretch) or just an internal note.

---

## 05 · Pachisi (India)

**The pitch:** cross-shaped board, four pieces per player, race home — structurally Ur's closest living cousin in this series, dice replaced by cast cowrie shells. Best single hook: Emperor Akbar built a literal human-sized Pachisi court at Fatehpur Sikri in the 1560s and played it with his own courtesans standing in as the moving pieces, directed from a raised platform at the board's centre.

**Sourcing check already done:**
- Cross-and-circle board form appears in archaeological contexts predating the earliest written descriptions — real antiquity, though the exact age of *codified rules* (vs. the board shape) is genuinely fuzzy, same honest caveat pattern already used for Ur's Finkel reconstruction.
- Akbar's court version is documented by his own biographer, Abu'l Fazl — solid primary-source footing, not folklore.
- Directly ancestral to Ludo and Parcheesi, so there's an unbroken living thread to something players already recognise, unlike Liubo or Maya patolli where the line was severed.

**Deliberately not Chaturanga instead:** chess's own ancestor was considered and set aside. Its *exact* ruleset is genuinely disputed among historians (earliest solid literary reference is 7th-century CE, centuries after its probable origin), and "we made chess, but older and slightly wrong" is a weak pitch next to something with its own clean identity. Worth revisiting only if a specific, well-sourced ruleset surfaces later.

**Build shape:** should get the full established treatment — real AI, hotseat Play, at least one genuine rule-variant fork if research turns one up (regional Chaupar variants are worth a proper look before assuming there's nothing there), shared Pro tones, intro crawl with the Akbar hook as the closing beat.

---

## 06 · Patolli (Mesoamerica)

**The pitch:** the freshest pick of the three — genuinely underrepresented in Western "ancient games" awareness generally, which is itself worth something. Cross-shaped board again (52 spaces, echoing the Mesoamerican 260-day calendar), beans instead of dice, heavy gambling culture attached — Aztec nobles reportedly wagered their own freedom on it.

**Sourcing check already done:**
- Real depth: archaeological evidence from Teotihuacan back to roughly the 4th century CE, spreading through Toltec, Zapotec, Mixtec, Maya, and finally Aztec culture over the following thousand years.
- Documented in real detail by Spanish colonial-era observers describing Aztec court play specifically.

**One real caveat, must stay in the copy, not smoothed over:** the *Maya* version of this game is archaeologically well attested (boards etched into palace floors at 25+ known sites) but its actual play rules were never recorded anywhere — only the Aztec ruleset survives in enough detail to reconstruct and build. This needs to be built and framed explicitly as **the Aztec game**, not a generic pan-Mesoamerican claim, or it repeats exactly the kind of overclaim this whole project has been careful to avoid so far.

**Build shape:** same full treatment as the rest of the series. The bean-toss mechanic is close enough to Ur's dice that a fair amount of the *pattern* (not the code — different game, different board) carries over directly: a chance-driven decision AI is the right tool again, not a pure-strategy search.

---

## 07 · Go / Weiqi (China) — held back on its own

**The pitch:** the most historically bulletproof pick of all seven titles by a wide margin. At least 2,500 years old with rock-solid documentation — referenced as a live political metaphor in a text from 547 BC — and unlike every other game in this series, its rules were never lost, reconstructed, or disputed. Unbroken tradition, played identically today. Pure strategy, same family as Nine Men's Morris.

**Why it stays separate rather than joining a bundle:** not a historical concern, a build-difficulty one. Go is notoriously the hardest classical board game to build a genuinely good AI for — the search space is so large it was the last major board game to fall to computers at all, and only did in 2016 via deep learning (AlphaGo), not the kind of depth-limited minimax that worked fine for Nine Men's Morris. A full 19×19 board with a real opponent is a different order of engineering problem than anything built so far in this series.

**Realistic path in:** a 9×9 board (a genuine, commonly-played smaller variant, not an invented simplification) makes a competent AI achievable without lying about what the game actually is. Worth treating as its own standalone research spike before committing to a build session, rather than assuming the existing minimax pattern just scales up.

**Considered and set aside:** Liubo — genuinely older than Go (Shang dynasty tomb evidence, so plausibly 3,000+ years) and has almost the exact "lost and rediscovered" story that made Ur's crawl land so well. The real blocker: nobody's done the Finkel-style reconstruction work yet. The rules are still only partially recoverable from archaeology, not confidently playable. Worth watching rather than building — if a solid scholarly reconstruction ever surfaces, revisit.

---

## Open decisions before 05/06 build starts

- Does the Pachisi + Patolli bundle get its own new name (matching how "Two Ancient Classics" replaced "Ancient Games Bundle"), or ride under a numbered-only banner?
- Same $2-for-both pricing model as the first bundle, or does four-piece-race-game content justify different positioning? No strong reason found yet to deviate — flagging only so it's a deliberate choice, not a default.
- Chaupar (the more complex historical form of Pachisi, closer to what Akbar actually played) vs. the simpler modern Pachisi ruleset most people would recognise — worth a dedicated research pass before locking which one ships as "Classic."
