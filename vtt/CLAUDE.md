# SCRPG Scene Board — Project Briefing for Claude Code

This is a local VTT (virtual tabletop) for Sentinel Comics RPG, built for my own home
game. Read this whole file before touching anything — it captures months of
back-and-forth with another Claude instance, including confirmed rules mechanics,
deliberate house rules, known data gaps, and one specific unfinished edit. Don't
re-derive or "improve" any of the confirmed mechanics below without asking me first —
they were checked against the physical rulebook, not guessed.

## What this is

Two screens, one server:
- **GM Console** (`index.html` / `app.js` / `style.css`) — my private screen, full information.
- **Player Display** (`display.html` / `display.js`) — cast to a TV for my players, deliberately
  shows less than the GM Console (see "Hidden info" below).
- **`server.py`** — Python stdlib only, no dependencies. Serves both screens plus a REST-ish
  API. LAN-accessible (my phone can hit the GM Console too).

Run it with `python3 server.py --campaign /path/to/campaign`. The campaign folder holds
all my actual game data; the app code itself (this repo) is separate and reusable across
campaigns.

## Data model — don't violate this split

- **CSV** = structured mechanical facts (Powers, Qualities, dice sizes, Health, Status Dice).
  One file per Library "kind": `heroes.csv`, `villains.csv`, `minions.csv`,
  `environments.csv`, `twists.csv`, `abilities.csv` (Dice Roller ability layer, keyed by
  `HeroSlug`, not a per-character Slug of its own). Each has a `HEADERS` constant duplicated
  in **both** `server.py` and `app.js` — if you add a column, update both and re-migrate
  existing CSVs, or the app will silently drop data on save.
- **MD** = long-form narrative (bios, full ability tables, tactics notes). Lives in
  `campaign/md/<kind>/<slug>.md`.
- **JSON** = live/mutable state: `scenes/<slug>.json`, `issues/<slug>.json`,
  `active_scene.json`, `revealed_roll.json`.
- **`rules/` folder** ships with the *app*, not the campaign. Nested chapter markdown
  copied from the Occidia vault `SCRPG Rulebook/`. Don't paste verbatim commercial
  rulebook text here; keep it in sync with that MD tree.

## Confirmed game mechanics (verified against the physical book — treat as ground truth)

- **Dice pool**: always exactly 3 dice — 1 Power + 1 Quality + 1 Status. Sort into
  Min/Mid/Max by *rolled value*, not die size. Effect Die defaults to Mid, overridable
  (abilities can specify Max, Max+Min, etc.).
- **Overcome table**: 0-=spectacular fail, 1-3=fail or major twist, 4-7=minor twist
  success, 8-11=complete success, 12+=success beyond expectations.
- **Boost/Hinder table**: 0-=no mod, 1-3=±1, 4-7=±2, 8-11=±3, 12+=±4.
- **Minion save** (my house rule, deliberate deviation from RAW): fail = defeated outright,
  no step-down.
- **Lieutenant save**: fail = step down one die size (d12→d10→d8→d6→d4→KO). Instant KO if
  damage ≥ 2× current die size.
- **Scene Tracker** confirmed star counts: Standard 2G/4Y/2R, Prolonged 3G/5Y/3R, Epic
  1G/3Y/4R. (Not what the book's own text implies at a glance — these are the *actual*
  confirmed counts, don't "correct" them back.)
- **Hero Status** = whichever is *worse* (closer to Out) between their personal Health band
  and the Scene Tracker's current color. Function: `computeHeroStatus()` in both app.js and
  display.js.
- **Villain Status is a DIE, not a GYRO word.** Most villains (condition-tracked archetypes
  — Legion, Guerrilla, Loner, Inhibitor, etc.) have their Status Die auto-computed by
  parsing their own Status slot labels ("9+ minions", "0 Other Villains") and matching
  against an actual count of board state (minions in scene, other villains in scene, heroes
  in the same Location, etc. — see `computeVillainStatus()`). A handful of health-zone
  villains (Bruiser/Fragile archetypes) use real Health floors instead. Where a condition
  genuinely isn't auto-countable (Titan's Challenge, vague archetypes), it falls back to a
  manual per-token override — that's intentional, not a gap to "finish."
- **`Number('') === 0` in JS, not NaN.** Any blank CSV numeric field will silently parse as
  0 unless you explicitly guard for empty string first. This bit us once already
  (`villainBand()`) — check for it any time you're deriving a number from CSV data.

## Hidden info: GM Console vs. Player Display

GM Console always shows everything. Player Display deliberately hides:
- Challenge **Solution** text (progress counters still show).
- Scene **GM Notes**.
- Environment **Twists** (Environment *name* still shows).
- Exact Health **numbers** for Villains specifically — bar shows, number doesn't. Hero
  numbers **do** show (asymmetric on purpose).
- Dice rolls, unless the GM explicitly clicks "Reveal to Players" (pushes to
  `/api/revealed-roll`, which Player Display polls). GM clears it with "Hide from Players."

Conversely, Player Display **does** show the Villain's Status Die (not hidden) — deliberate
choice, gives players a tactical read on what makes a villain stronger/weaker without
revealing exact Health.

If you're ever unsure whether something new should be visible to players, ask — don't
assume "more info shown = better."

## Testing discipline — don't skip this

Every change gets verified against a real running server before I'm told it's done:
```bash
node --check app.js && node --check display.js
python3 -m py_compile server.py
python3 server.py --campaign /tmp/some_test_dir &
# curl the actual endpoints, confirm real round-trip behavior, not just "should work"
```
`app.js` and `display.js` duplicate several functions on purpose (`villainBand`,
`heroBand`, `computeVillainStatus`, `computeHeroStatus`, etc.) — there's no shared module,
it's copy-pasted for simplicity. If you fix a bug in one, **check whether the other has the
same bug** — it usually does.

## Known data gaps — don't silently fill these in

- ~~**Wraith and Time-Slinger**: Principle Minor/Major Twist text was never in the source
  material I had~~ — **fixed 2026-08-29.** The user supplied the actual SCRPG rulebook PDF
  (`~/Downloads/SCRPG_compressed.pdf`, also pre-split into `~/Downloads/SCRPG_compressed-pages/`),
  which has both heroes' full Principle text (Chapter 7: The Archives). Both are now filled
  in for real in `Volume1/heroes.csv`. If a similar gap turns up elsewhere, that PDF is the
  first place to check before asking the user to re-supply anything — see the note below on
  how to navigate it.
- **Alternate Rewards' "Contact Die Pool" table** (`rules/05-5-alternate-rewards-collections.md`):
  2 of 5 rows were read from a page image and flagged lower-confidence. Worth a physical-page
  check before treating as gospel.
- Some villain archetypes (Overlord, Predator, Squad, Titan's Challenge, Formidable) don't
  have a cleanly auto-countable condition — manual override is the correct behavior, not a
  bug.

## ✅ "Endgame" roadmap (2026-08-29) — done

Everything below was finished and verified live against both `campaign/` and `Volume1/` in
one long session on 2026-08-29. Full details, decisions, and the source-of-truth PDF path
are in `docs/ASKS.md`'s "Endgame Roadmap" note — read that before touching any of this again.

- `display.js`'s `poll()` no longer gates Library refresh on scene-slug change — it refetches
  every ~2s tick. (A second bug was found in the same area: `display.html` had no PapaParse
  `<script>` tag at all, so Library lookups on Player Display had silently failed since day
  one — fixed too.)
- Hero Status Die + a `GMControlled` CSV column/Library checkbox (gates the Roll button on
  hero tokens, same as villains always have).
- The Villain/Minion/Lieutenant/Hero "Read" abilities modal, **populated with real book data**
  for all 24 villains (Name/Type/GameText for every Ability, Upgrade, Mastery) — transcribed
  directly from `~/Downloads/SCRPG_compressed.pdf` / `SCRPG_compressed-pages/`, not invented.
- `abilities.csv` (the Dice Roller's ability layer) — schema, server.py/app.js wiring, a 6th
  Library tab, Roller UI pre-fill — **also populated with real GameText** for all 12 heroes
  from the same PDF, including Zone/Type/DieSource/EffectDieHint.
- The Activity Log (full feed on Player Display, dice rolls included, persisted in scene JSON).
- Placeholder portraits (`tools/generate_placeholder_portraits.py`) for every Hero/Villain/
  Minion, swappable for real art later via a Library-table upload button.
- Touch/pointer drag-and-drop for tokens, parallel to the existing mouse-only HTML5 drag path.
- `tests/test_server.py` — a real `unittest` suite (23 tests) against `server.py`'s API.

If a similar rules-content gap turns up later (missing ability text, a Principle, an
archetype detail), check `~/Downloads/SCRPG_compressed.pdf` (or the pre-split
`SCRPG_compressed-pages/` folder, much faster to read via the `pages` parameter — see
`docs/ASKS.md` for the book-page → file-page offset math worked out for that split) before
asking the user to re-supply anything or guessing.

## Not started

- Audio stingers (local GM-laptop playback only, no cross-device sync needed — still need
  royalty-free clip sources). Deliberately deferred, not part of the Endgame pass above.

## How I like to work

- If something's ambiguous or you're not sure a die size / rule / mechanic is right, **say
  so and ask** rather than guess — several real bugs in this project came from silent
  guesses (e.g. treating a blank CSV cell as a real value).
- When you fix a bug, actually reproduce the original symptom against a live server first,
  then confirm the fix resolves it — don't just reason about the code and declare victory.
- I care about this being genuinely reliable, not just working once — it runs at an actual
  table with friends. Favor correctness and clear failure over cleverness.
- Tell me plainly when I'm wrong about something (I have been, a few times, on rules
  interpretations) — don't just go along with an incorrect premise.
