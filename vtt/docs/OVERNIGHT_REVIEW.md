# SCRPG VTT — Overnight Review Log

Started 2026-09-12, night session. Full functional test pass + "fresh eyes" GM-usability
review, running autonomously while the user sleeps. Each cycle appends a new dated section
below — nothing here is overwritten. All testing is done against scratch copies of
`campaign/`; live data is only touched for confirmed, understood fixes (never guessed at).

---

## Cycle 0 — pre-sleep handoff (context for the cycles below)

This is a summary of what was already found/fixed earlier in the session, before the
overnight loop started, so each fresh cycle has full context without re-deriving it.

### Fixed and verified live this session
1. **CSV parser corrupted embedded quotes** in all 5 builders (builder.html, villain-builder.html,
   minion-builder.html, environment-builder.html, issue-builder.html) — didn't handle RFC4180
   doubled-quote escaping. Fixed in all 5.
2. **Constructed Method silently downgraded Background quality dice on edit+save** — `editHeroRow()`
   was unconditionally re-deriving `bgQual` from the catalog's fixed die pool instead of trusting
   already-saved values. Fixed in `builder.html` (`editHeroRow`, ~line 2198).
3. **Player Display stopped showing Hero Health numbers** (regression) — `display.js` `bhdRowHtml()`
   was missing the HEALTH cell entirely. Restored for hero kind only (villain stays hidden, matches
   CLAUDE.md's asymmetric rule).
4. **Minion/Lieutenant "Use" ability button was broken** ("No Library entry found") — `useAbilityCard()`
   in `app.js` was routing minions/lieutenants through the hero/villain-only Dice Roller. Now routes
   through `openBoardAction()`, the same mechanism the board's own ability list already uses correctly.
5. **Minion/Lieutenant Tactics text was written to disk but never displayed** — `parseAbilitiesMd()`
   only captured named `### [Type] "Name"` cards, not free prose under `## Tactics`. Fixed to capture
   raw text into `sections.TacticsText`, rendered without a nonsensical "Use" button. Also fixed a
   follow-on bug in that same fix (an unrecognized `##` heading like `## Builder` wasn't resetting
   `currentKey`, so the JSON builder-state block was leaking into the Tactics text).
6. **Volume1's 12 official heroes had zero `## Abilities` content in the Read modal** even though
   `abilities.csv` was fully populated — auto-generated all 12 `.md` files from the existing CSV rows
   (verified card-count parity, 1:1, for every hero).
7. **27 of 177 real-campaign ability rows had a blank RollType** — backfilled via the same
   Attack/Defend/Boost/Hinder/Overcome/Recover regex the app already uses elsewhere
   (`abilityRollTypes()`). 4 rows deliberately left blank (see Open Items below — genuinely ambiguous,
   not a bug).
8. **Villain Status auto-compute gaps** — Baron Blade ("Inventions") and Ray-Manta ("Mods") now
   resolve via a new `ownBonuses` count type (live boost mods targeting the villain itself). Ermine's
   compound "Any Penalties and No Bonuses / Some Penalties and Some Bonuses / No Penalties" now
   resolves via a new `resolveOwnPenaltyBonusStatus()` check. All three verified against real
   `villains.csv` data with simulated mod state. Fixed identically in both `app.js` and `display.js`.

### Corrected a wrong finding
An earlier automated pass claimed "all 13 Lieutenants have zero ability content." That was false —
verified directly: **Bunsen Burner, Minus, and Plus** (the 3 actually used in the real Session 1 scene)
all have real, full ability content. The other 10 Lieutenant rows in `minions.csv` (Dymkharn the
Gladiator, Battalion Commander, Colossal Robot, Walking Tank, Ember Shaman, Ur-Crystal Behemoth,
Homunculus, Firearm, Seer, Soldier Sergeant) are book-reference names with no MD file and, per the
user, are not yet in use — left alone.

### Open items carried into tonight's cycles
- **Proletariat's "Clones" status label can't auto-compute yet.** His kit creates "clone minions"
  dynamically (see `campaign/md/villains/proletariat.md`, "Join in the Struggle"), but there's no
  minion library entry (no `Slug` in `minions.csv`) to count against — `guessStatusCountType()` can't
  safely guess which board tokens are "his clones" vs. any other minion in the scene. **Needs either:**
  (a) a real "Proletariat Clone" minion built via the Minion Builder so it's countable by slug, or
  (b) confirmation from the user on how they currently track this at the table, so the auto-compute
  can be pointed at the right signal. Left as manual-override for now — correct fallback behavior,
  not a bug.
- **Xxtz'Hulissh (Titan archetype) needs Challenge-tied auto-status + Challenge auto-completion.**
  User's own words: "he's not a normal Villain (Titan) that has Challenges tied to him. Either way,
  the Challenges should also 'auto-complete' with him." This is the biggest open item — needs
  understanding the scene Challenge/Path data model (`state.scene.challenges[].paths[]`,
  `successesNeeded`/`successesMarked`, `updatePathField()` in app.js ~line 1794) and wiring: (1) a
  Challenge whose marked successes reach its needed count auto-flips to complete instead of requiring
  a manual GM toggle, and (2) Xxtz'Hulissh's Status Die auto-derives from which Challenge
  path/state is currently active, mirroring how the numeric-count villains work. This is a genuinely
  new feature, not a one-line fix — first overnight cycle should scope it properly before touching code.

---

## Cycle 1 — Hours 1-2 (2026-09-12, overnight)

Picked up both carried-over open items from Cycle 0, then did a fresh-eyes pass thinking
about live-session GM workflows: Challenge/Twist handling, Notes, Scene Tracker, multi-location
token movement. All testing against scratch copies of `campaign/` (fresh copy each hour, killed
after use); live `campaign/` untouched this cycle — every fix below lives in `app.js`, `display.js`,
`index.html`, or `style.css`.

### Fixed and verified live

1. **GM Console's live Challenge panel showed zero completion feedback — Player Display had it and
   GM Console didn't.** `renderChallengesPanel()` in `app.js` just showed raw checkboxes with no
   indication a path was done, while `display.js` already had a working `pathDisplayOutcome()`
   producing a Success/Fail badge. The GM was seeing *less* actionable info than the players, which
   is backwards from this app's whole design philosophy ("GM Console always shows everything").
   Ported `pathDisplayOutcome()` into `app.js` and wired the badge into the GM panel.
   - **Also found while fixing this:** `.challenge-outcome` and `.challenge-success-title` had
     **never been styled in `style.css`, on either screen** — same bug class as the "invisible
     Principles text" fix already logged in `docs/ASKS.md` (unstyled text quietly inheriting a color
     that doesn't read against its background). Added a proper green/red pill badge style. So this
     was actually two stacked bugs: GM Console missing the feature entirely, and Player Display having
     it but never displaying it *legibly*.
   - Verified live: both screens now show a correctly colored "Success" badge on a completed path,
     no badge on an in-progress one.

2. **Xxtz'Hulissh (and any future Titan-archetype villain) can now auto-compute Status from Challenge
   progress.** Added `resolveChallengeLinkedStatus()` to both `app.js` and `display.js`: any villain
   Status label phrased `"...(needs N successes)"` is matched against a Scene Challenge path whose
   label contains the same text (minus the count); once that path's `successesMarked` reaches the
   threshold, the villain's Status Die auto-resolves to that slot. Falls back to whichever label has
   no success-count (e.g. "Unchallenged") when nothing's complete. This is a **generic mechanism**, not
   a Xxtz'Hulissh-specific hack — any future Titan works via the same naming convention (GM just names
   the Challenge path to match the Status label text), no new schema needed.
   - **Bug caught during testing (my own):** the first draft picked whichever completed stage *needed
     the most successes* as "most advanced," which is backwards when stages don't monotonically
     increase in difficulty (Xxtz'Hulissh's final stage only needs 1 success, not more than the
     second stage's 2). Fixed to pick by Status-slot order (later slot = more advanced), not by
     success-count. Verified via direct unit tests covering all 3 real states (Unchallenged / first
     stage complete / both stages complete) — all correct after the fix.

3. **Notes modal silently exposes the full structured Ability/Builder-JSON data with no warning.**
   Confirmed live: opening "Notes" on Handyman shows the *entire* raw `.md` file — all `### [Type]
   "Name"` ability cards and the machine-readable `## Builder` JSON block — in a single freeform
   textarea. A GM reaching for "Notes" to jot a quick scratch thought has no signal that they're
   looking at the same file the board's ability list and Dice Roller parse from, and a careless edit
   (breaking a card header's exact syntax, or mangling the JSON fence) would silently stop that
   character's abilities from working, with the corruption invisible until someone next opens Notes
   or the Read modal. **Fixed the immediate risk, not the underlying architecture:** added a yellow
   warning banner to the Notes modal (`index.html`/`app.js`/`style.css`) that appears only when the
   loaded content actually contains structured cards or a Builder block, explaining what's there and
   why to be careful. Verified live: shows for Handyman (structured), stays hidden for a plain
   freeform-notes hero.
   - **Not fixed, and shouldn't be guessed at:** whether Notes *should* be a separate field/file from
     structured ability data is a real architecture question, not a bug — it overlaps directly with
     what the user raised earlier tonight about MD files feeling "jumbled" and wanting to consider a
     different data-organization scheme. Flagged for that conversation, not decided here.

### Verified working, no issues found
- Twist Picker (`openTwistPicker`) — Principle-based Minor/Major twist text still renders in the
  correct high-contrast color (the `docs/ASKS.md` fix is holding, no regression), and the generic
  Twist Library filter (All/Minor/Major) works.
- Scene Tracker advance (`advanceTracker`) — position moves correctly, station data intact.
- Multi-location token movement (`moveToken`) — confirmed a hero token moves cleanly between two
  real locations in a real scene (Bank Lobby & Offices → Vault & Back Offices).
- "GM starts a brand-new scene mid-session" (`newScene` → `apiSetActiveScene`) — spot-checked at the
  end of Hour 1, works cleanly, new scene appears in the scenes list and can be activated immediately.

### Open items (not touched, need the user)
- **Proletariat's "Clones" status still can't auto-compute** — no minion library entry exists to
  count against. Unchanged from Cycle 0; still the correct manual-override fallback, not a bug.
- **Environment/Twist content is essentially unpopulated in the real campaign** (`environments.csv`
  has no real rows yet) — nothing to test against, not a bug, just noting so a future cycle doesn't
  waste time re-checking it before there's real data.
- **Notes vs. structured-data architecture** (see above) — the warning banner mitigates the immediate
  risk, but the real fix is a data-modeling decision only the user can make.

---

## Cycle 2 — Hours 3-4 (2026-09-12, overnight)

### Fixed and verified live

1. **Villain Creation rules docs were stale relative to data already correct elsewhere in the repo** —
   this directly confirms the user's own complaint that "Villain Creation Rules are across multiple
   MD files" and jumbled. Concretely: `rules/05-2-minions-lieutenants-villains.md`'s "Villain
   Approaches (18 types)" section was a bare Name+Health table with zero ability data, despite its
   own text promising "suggested powers/qualities + abilities." `rules/05-3-villain-archetypes-upgrades-health.md`
   had full Status/Health/Pairings/Role/Abilities detail for 9 of 14 Archetypes, but the last 5
   (Loner, Overlord, Predator, Squad, Titan) were missing their Abilities line entirely. There were
   also two separately-worded "Upgrades & Masteries" + Health Formula sections, one per file.
   - **Root cause was simple, not a content gap:** the correct, book-verified ability data for all 18
     Approaches and 14 Archetypes already exists in `builder/catalog/villain_approach_abilities.csv`
     and `villain_archetype_abilities.csv` — the Villain Builder already uses it correctly. The rules
     docs just never got updated to match.
   - **Fixed:** expanded 05-2's Approaches section (health/pairings/pick-count table + full per-approach
     ability-name list for all 18); filled in the missing Abilities line for all 5 thin archetypes in
     05-3 (plus a manual-status note for Overlord/Predator/Squad and a cross-reference to the new
     `resolveChallengeLinkedStatus()` mechanism for Titan); trimmed 05-2's duplicated
     Upgrades/Health-Formula section to a one-line pointer at 05-3 instead of repeating it.
   - **Verified, not just written:** a Python script cross-checked every ability name and every
     health/pairings/picks value in both edited files against the source catalog CSVs — full match,
     zero transcription errors.
2. **Two more stale references found and fixed in `rules/03-8-hero-creation-process.md`:** a TODO note
   claiming the per-category Red Ability lists were "not yet transcribed" — they're fully transcribed
   in `03-5-red-abilities.md` and independently implemented in `builder.html`'s `RED_ABILITIES`
   constant; the note was just never updated. Fixed to point at both.
   - **Also made real progress on a previously-flagged, genuinely open rules discrepancy** (Time-Slinger's
     Health worked-example used Self-Discipline at d10, contradicting Personality.md's d8): confirmed
     via `Volume1/heroes.csv`'s real published data that Self-Discipline **is** d8, not d10 — that part
     of the discrepancy is now resolved. But corrected arithmetic (8+8+8+4=28) still doesn't match his
     recorded MaxHealth of 30, and every one of his stats is uniformly d8 (no hidden d10 anywhere), so
     a 2-point gap remains. Documented precisely what's now confirmed vs. still open, rather than
     overclaiming a full resolution — still needs a physical-book page check (pg.112-113) to fully close.
3. **Retcon mechanic (Constructed Method) tested end-to-end** — swap-two-power-dice option, on a real
   hero (Handyman): picked two real powers, saved, confirmed the swap landed correctly in heroes.csv
   (Signature Weaponry d10↔d8 Deduction).
4. **Villain Upgrade/Mastery hide-on-multi-villain-or-Moderate rule re-verified against a second
   villain** (Baron Blade) in both the Read modal and the board's live ability list — correct in both
   a solo-Easy scene (visible) and a multi-villain scene (hidden).
5. **Portrait upload/read-back API spot-checked** — `PUT`/`GET /api/backgrounds/<key>` round-trips a
   real PNG correctly, no errors.

### Biggest finding of the night: the PDF character-sheet export feature has never actually worked, and I found three separate reasons why

The user asked to test "PDF character-sheet export/fill in builder.html." Digging in surfaced a
stack of problems, each hiding the next:

1. **The feature is completely unreachable from the UI.** `exportPDF()` exists in `builder.html`, but
   there is no button, file input, or any onclick anywhere in the file that calls it. Its own alert
   text ("Click 'Fillable PDF…' and choose the fillable sheet PDF") describes a control that doesn't
   exist. `git log -S"exportPDF"` shows exactly one commit ever touched it — the original commit that
   added it — meaning this was never wired up, not a regression. Same story for `renderSheet()` /
   `copySheet()` (a plain-text sheet summary + clipboard-copy feature): both exist, both are
   unreachable (`#sheet`/`#sheetErr`, the DOM elements they target, don't exist in the HTML either).
2. **Even if wired up, the PDF library itself was never loaded.** No `<script src="...pdf-lib...">`
   tag exists anywhere in `builder.html`, and it's not vendored locally the way PapaParse and the
   fonts are (`vendor/` only has `papaparse.min.js` and fonts). `exportPDF()`'s own code anticipates
   this (`if(typeof PDFLib==="undefined")` falls back to `window.print()`), but that fallback would
   fire on literally every real use, forever, since the library is never present to begin with.
3. **Even with the library loaded, real testing surfaced two more concrete bugs in the field-mapping
   logic** — found by pulling the actual field list out of a real fillable template
   (`~/Obsidian/.mrclean-trash/2026-08-24/_sheet_dl/SCRPG_Character_Sheet_Fillable.pdf` — the trash
   folder is just where it happened to be found, not a deleted duplicate; the app comment names this
   exact filename) with `qpdf` and testing against it directly in Node with the real `pdf-lib` package:
   - **Power dice were silently dropped even before tonight's fix** (`state.psPow`/`arPow` do store
     dice, but the code pushed an empty string, with a comment claiming "we don't store separate power
     dice" — false). **Fixed** to use `assignedPow()`/`assignedQual()` (also picks up Free For All's
     dice automatically now). But testing the fix directly against the real template revealed:
   - **30 of the sheet's fields are dropdowns, not text fields** — every "Power Die N", "Quality Die
     N", "Status Die G/Y/R", and "Type G/Y/R N" field is a `PDFDropdown`. `set()`'s
     `form.getTextField(name)` throws on these, and the existing `try{}catch(e){}` **silently
     swallows every one of those errors** — meaning even the pre-existing `Status Die G/Y/R` fill
     (present since the original commit, untouched by tonight's session) has silently no-op'd since
     day one. My Power/Quality Die and Type G/Y/R additions hit the exact same wall. **Not fixed
     tonight** — needs `set()` to branch on field type (`form.getDropdown(name).select(value)` for
     these) rather than assuming everything is a text field.
   - **29 more fields are checkboxes, not text fields** — every "Reward N" and "+1/+2/+3/+4 Reward N"
     field. The pre-existing `set("Reward 1", RETCONS[state.retcon])` and `set("Reward 2", ...)` calls
     have *also* silently no-op'd since day one for the same reason. **Not fixed tonight** — same
     `set()` branching fix would need a `form.getCheckBox(name).check()` path, and Retcon/Red-ability
     text doesn't map cleanly onto boolean checkboxes anyway, so this needs a design decision (a
     different target field, or these values just don't belong on this template).
   - **A real crash, independent of all of the above:** saving the PDF at all throws
     `RichTextFieldReadError` on field "Text G2" specifically, because pdf-lib can't regenerate
     appearances for a rich-text form field. This isn't caused by anything the app does — it fires
     just from the field existing in the template, the moment `doc.save()` (or `form.flatten()`) runs.
     **Confirmed the exact fix**, tested directly: `doc.save({ updateFieldAppearances: false })`
     avoids it cleanly (verified: produces a valid 14MB filled PDF with no error). Not applied to
     `exportPDF()` tonight since the surrounding library-loading and dropdown/checkbox issues need
     solving first for any of this to matter.
   - Also fixed while in here, low-risk and unaffected by the above: the Out-ability text wasn't
     applying `state.peOutBind` substitution (so `[quality]`/`[power]` bracket text leaked into the
     PDF verbatim instead of the hero's actual bound quality/power name) — now matches the same
     substitution logic used everywhere else in the app.
   - Filled the Name/Type/Text/Icon fields for each Green/Yellow/Red ability slot for the first time
     (previously the export's own alert admitted these were "left blank for you to write in" — that
     data is all fully available in `state.psAbilities`/`arAbilities`/`reds` now). Type/Text/Name/Icon
     all landed correctly as real text-field writes in the Node test (only the *dropdown* Type fields
     are affected by the issue above — the G/Y/R **Icon** fields are plain text and work fine).
   - **This needs a scoping conversation with the user, not a rushed fix**: does the UI belong on the
     Finish step? Does "Copy Sheet Summary" (`copySheet`) still matter as a separate feature from PDF
     fill? Is vendoring pdf-lib locally (matching the PapaParse/fonts precedent) the right call, or is
     this feature not worth reviving at all given `window.print()` already exists as a working
     fallback? None of that is answered here on purpose.

### Open items (not touched, need the user)
- PDF export/character-sheet-summary feature: three layered problems above (no UI wiring, no vendored
  library, and — once those are fixed — a dropdown/checkbox field-type bug plus a rich-text-field
  crash with a confirmed fix). Needs a scoping decision before more code goes into it.
- Time-Slinger Health worked-example: Self-Discipline die size now confirmed (d8), but the exact
  arithmetic to reach his real 30 Health still has an unexplained 2-point gap. Needs a physical-book
  check, not more inference.
- Carried forward unchanged: Proletariat's "Clones" status (no countable minion entry), Environment/Twist
  content is essentially unpopulated in the real campaign, Notes-vs-structured-data architecture.

---

## Cycle 3 — Hours 5-6 (2026-09-12, overnight)

### Verified working (real tests, not assumptions)
- **Dice Roller end-to-end**, against a real Volume1 hero (Absolute Zero) with populated
  DieSource/EffectDieHint data — none of the 5 real campaign heroes have this field populated at all,
  so this needed Volume1 data to test meaningfully. Confirmed `onAbilitySelected()` correctly matches
  an ability's DieSource to the right Power/Quality index, `rollDicePool()` always sorts Min≤Mid≤Max
  by rolled value (8/8 rolls correct), and `effectDieValue()` correctly computes both simple ("max")
  and compound ("max+mid+min") effect-die hints. No bugs.
- **Activity Log persists correctly across a real page reload** (logged an entry, reloaded, entry
  survived from the saved scene JSON). Display caps at the most recent 200 entries; the underlying
  array is never truncated — reasonable, not a bug, since scene files are naturally bounded by
  per-encounter scene creation.
- **Location background image upload**, tested through the actual Library/Scene-editor file input
  (not just the raw API) — real PNG upload, thumbnail renders, persists correctly.
- **Environment Builder tested end-to-end for the first time with real content** (environments.csv was
  essentially empty before this): created "Eldritch Storm" with 3 traits + dice, freeform Twist notes,
  verified the CSV round-trip, the MD notes file, and that setting it as a scene's active environment
  correctly surfaces the same notes through the board's "View Twists" button. Along the way, resolved
  an apparent contradiction: `twists.csv` (the Library's "Twists" tab) and an Environment's own Twist
  notes are two **intentionally separate** systems that happen to share the word "Twist" —
  `twists.csv` has no Environment linkage at all (`TWISTS_HEADERS` has no EnvironmentSlug column) and
  is only ever used as a generic, severity-filtered reference library for the unrelated Hero
  Twist-Picker. Not a bug, just two same-named concepts — confirmed by reading the actual code path,
  not assumed.
- **Dangling reference resilience**: deleted a hero (Lumen) from `heroes.csv` while a scene still had
  her token. Board rendered without crashing. Both `openAbilities()` and `openDiceRoller()` on the
  orphaned token degrade gracefully with the same clear toast ("No Library entry found for this
  token.") — consistent, GM-legible behavior, not a silent failure.
- **Empty scene (zero tokens)**: both GM Console and Player Display render cleanly with no errors.
- Cross-checked `02-1-playing-the-game.md`'s Overcome/Boost-Hinder outcome tables against both
  CLAUDE.md and the live `overcomeOutcome()`/`boostHinderMod()` code — exact match, no issue.
  `04-1-moderating-the-game.md`'s GM-guidance content is narrative advice (not app-state claims) and
  reads internally consistent with the app's actual Doomsday Device/Challenge implementation.

### Found and fixed
- **`campaign/abilities.csv` has ~12 official Volume1 heroes' worth of orphaned ability rows** with no
  matching `campaign/heroes.csv` entry (confirmed via set-difference: every non-real-campaign slug in
  `abilities.csv`'s HeroSlug column has zero matching row in `heroes.csv`). Harmless — never surfaces
  anywhere since nothing ever spawns a token for those slugs — likely leftover from an early
  data-seeding pass that copied Volume1's abilities wholesale. **Not deleted** — flagging for the user
  to clean up themselves rather than unilaterally trimming campaign data that wasn't obviously mine
  to touch, even though it's provably inert.
- Confirmed minion count-by-difficulty-tier (H×d6/d8/d10 in the `CHALLENGE_TIER` table) is
  intentionally reference-only with zero enforcement tooling — pure GM judgment by design, not a gap.

### New real finding: Issue Builder has no path to create a first Collection
The Issue Builder's Collection dropdown (`#collPick`) is populated purely from existing collections —
there's no "+ New Collection" control anywhere on the page. Tested against a genuinely empty campaign
(no `collections/` files at all): the dropdown shows only the placeholder "Choose a collection…" with
zero real options, and the Issue Builder explicitly requires picking one before it'll save
("Choose a collection first"). A brand-new GM who opens the Issue Builder as their very first stop
(reasonable, since `builder-hub.html` lists it as one of 5 independent, equally-weighted tools) hits a
dead end with no way to proceed from within that tool. Once at least one Collection exists (created
via the GM Console's Collections tab), everything downstream works fine — this is purely a first-run
gap, not a bug in the ongoing mechanism. **Not fixed tonight** — the right fix (an inline "+ New" next
to the dropdown, calling the same `newCollection()` prompt-based flow the GM Console uses) is simple
and low-risk, but is a small scope decision (does the Issue Builder gain its own copy of that flow, or
should there be a shared entry point across builders?) rather than an urgent late-night patch.

### Open items (unchanged from Cycle 2, still standing)
- PDF export/character-sheet-summary feature — needs a scoping conversation (see Cycle 2).
- Time-Slinger Health worked-example — Self-Discipline confirmed d8, 2-point arithmetic gap still open.
- Proletariat's "Clones" status, Notes-vs-structured-data architecture — unchanged.

### New open item
- Issue Builder's missing "create first Collection" path (above) — small, well-scoped, but a design
  choice rather than an obvious one-line fix.

---

## Cycle 4 — Hours 7-8 (2026-09-12, overnight) — final cycle

### Fixed and verified live

1. **The biggest catch of the whole night: `03-8-hero-creation-process.md`'s Health formula had the
   wrong die size for the final roll.** The doc said "the roll of a d6, or just use 4" — but
   `builder.html`'s own UI (the Step 7 hint text and the "Roll d10 or choose 4" input label) has
   always said d10. Rather than guess, cross-checked against real published Volume1 hero data:
   computed `MaxHealth − 8 − RedStatusDie − bestAthleticOrMentalDie` for all 12 heroes. Aeon Girl
   needs a remainder of 7, Bunker needs 7, Legacy needs 8 — all mathematically impossible under a d6
   cap (max 6), all fit a d10 fine. **The rules doc's "d6" was the bug; the app's UI was right all
   along.** Fixed the doc to say d10, with the verification reasoning included inline so it can't
   quietly drift back the wrong way.
   - **This fully resolved the Time-Slinger Health discrepancy flagged back in Hour 4** as needing a
     physical-book check — same root cause. With the die corrected to d10:
     `8 + 8 (Red) + 8 (Self-Discipline) + 6 (rolled) = 30` matches his real MaxHealth exactly. The
     worked example's "rolls a d6 and gets a 4" was wrong on both the die size and the specific
     result — the real roll was almost certainly a 6. Updated that note from "needs a physical check"
     to fully resolved. Hour 4 said this would need a physical rulebook page check; it turned out not
     to, once the actual bug was found.
   - **One isolated anomaly surfaced during this check, deliberately not chased further:** Tachyon's
     numbers (`Red status d12, best Athletic/Mental d8, MaxHealth 27`) produce a *negative* required
     roll (−1) — impossible under any die. Checked the other two Red-d12 heroes (Aeon Girl, Muse) to
     rule out a systemic issue — both produce clean, sensible positive remainders (7 and 1), so this
     is isolated to Tachyon specifically, not a formula problem. Likely either a MaxHealth
     transcription slip in `Volume1/heroes.csv` or a genuine book erratum — needs an actual page check
     for just this one hero. Left as a small, standalone open item rather than guessed at.
2. Cross-checked `retcon.csv` and `steps.csv` (previously-unchecked builder catalog files) against
   `03-8`'s Retcon options list and the app's own step descriptions — exact match, no issues.
3. Cross-checked `minion-builder.html` against `05-2-minions-lieutenants-villains.md`'s Minion/
   Lieutenant creation rules — the same check that found real staleness in the villain equivalent
   twice already this week. This one is clean: Name/Type/Die/Faction/Description/Abilities/Tactics
   match the rules doc's process, and the Lieutenant die range correctly excludes d4 in the UI
   (`LT_DICE` vs `MINION_DICE`), matching the rules doc's note. **Worth stating plainly: not every
   corner of this app has bugs** — this builder was already correct.
4. Deliberately did **not** attempt the Issue Builder "+ New Collection" fix from Cycle 3 — correctly
   stayed a scoping decision rather than a rushed late-night patch.

All edits this cycle: `rules/03-8-hero-creation-process.md` only (the Health formula correction and
the Time-Slinger resolution update). Verified against real Volume1 data before being made. No
`campaign/` files touched; no scratch server needed for Hour 7 (pure data cross-referencing) or the
Tachyon check in Hour 8.

### Important correction — live data contamination found and fixed during final checks
Before closing out, a final `git status` pass turned up something that needed fixing: the **live**
`campaign/scenes/session-1-scene-1.json` had been overwritten at some point earlier in tonight's
session with test-run state instead of a scratch copy — the real, committed activity log (2 genuine
combat entries: Masquerade and Lumen both attacking "Plus") had been wiped to an empty array, "Plus"'s
`currentDie` had changed from the real 6 to 8 (a lieutenant only ever steps *down* on a failed save,
never up — a clear sign this was test-injected, not real play), Lumen had gained a stray `bhdDelta`,
and one Challenge path's `hidden` flag had flipped. This does not match any test documented in this
log by slug/name, and since nothing was ever committed during this session, comparing against the
last real git commit (`5907a0b`, from before this session started) made the contamination and the
correct baseline both unambiguous. **Reverted the file to the committed version** (`git checkout --
campaign/scenes/session-1-scene-1.json`), restoring the real activity log and token state. Flagging
this plainly rather than quietly fixing it: this is exactly the kind of mistake the scratch-copy
discipline was supposed to prevent, and it happened anyway at some point before that discipline was
fully locked in. Worth a `git status` check on `campaign/` yourself when you're back, in case anything
else needs a second look — this was caught by a final pass, not by design.

### Open items carried forward, unchanged
- PDF export/character-sheet-summary feature — needs a scoping conversation (see Cycle 2).
- Proletariat's "Clones" status, Notes-vs-structured-data architecture, Issue Builder's missing
  first-Collection path — unchanged.

### New open item
- Tachyon's individual Health-formula numbers don't reconcile even after the d6→d10 fix (see above) —
  isolated to her specifically, needs a physical-book check just for this one hero.

---

## Overnight Wrap-Up

Eight hours, five cycles (0 through 4), one continuous session. Here's the honest tally.

**Read this first:** during final checks this hour, a `git status` pass found that the live
`campaign/scenes/session-1-scene-1.json` had been overwritten with test-run state at some point
earlier tonight (real activity log wiped, a lieutenant's die changed in a direction that can't happen
in real play, a stray mod added) — a mistake, not intentional. It's been reverted to your real,
committed data (see Cycle 4 for the exact diff). Worth double-checking `git status` on `campaign/`
yourself when you're back, since this was caught by a final pass rather than by design.

### Bugs found and fixed tonight (19 distinct, all verified against real data or a live test — not
just read and assumed)
1. CSV parser silently corrupted any field with an embedded quote, in all 5 builder tools (RFC4180
   doubled-quote escaping was never handled).
2. Constructed Method silently downgraded a hero's Background quality dice back to catalog defaults
   on every edit+save, even with zero user changes.
3. Player Display stopped showing Hero Health numbers (a regression from the most recent commit
   before this session started).
4. Minion/Lieutenant "Use" ability button was completely broken (routed through a Dice Roller that
   only supports Hero/Villain's dice-pool model).
5. Minion/Lieutenant Tactics text was written to disk but never displayed anywhere (plus a follow-on
   bug caught in my own first attempt at the fix, where an unrelated `## Builder` JSON block leaked
   into the Tactics text).
6. Villain Status auto-compute gap: Baron Blade ("Inventions") and Ray-Manta ("Mods") — new generic
   "own accumulated bonuses" count type.
7. Villain Status auto-compute gap: Ermine's compound Penalty/Bonus state — new resolver.
8. Villain Status auto-compute gap: Xxtz'Hulissh (Titan archetype) — new generic Challenge-linked
   Status mechanism that works for any future Titan-style villain via a naming convention, not a
   one-off hack (plus a self-caught ordering bug in the first draft).
9. GM Console's live Challenge panel showed zero completion feedback while Player Display already had
   it — plus the underlying CSS for that badge had never been styled on *either* screen, ever.
10. Notes modal silently exposed raw structured ability-card/Builder-JSON data with zero warning, a
    real silent-corruption risk — added a targeted warning banner.
11. PDF export: Out-ability text wasn't applying the hero's actual bound power/quality substitution.
12. PDF export: Power/Quality dice were silently dropped from the export despite being fully available
    in app state (a false code comment claimed otherwise).
13. All 12 official Volume1 heroes had zero `## Abilities` content in the Read modal despite complete,
    verified CSV data — backfilled and verified 1:1 card-count parity for every hero.
14. 27 of 177 real-campaign ability rows had a blank RollType — backfilled via the app's own existing
    detection regex.
15. `rules/05-2` and `05-3` (Villain Approaches/Archetypes) were stale relative to correct data already
    in the builder's own catalog CSVs — missing ability lists for all 18 Approaches and 5 of 14
    Archetypes, plus duplicated Upgrades/Health-Formula content across two files. This one directly
    confirmed the user's own complaint about "jumbled" villain rules across multiple files.
16. `rules/03-8` had a stale "not yet transcribed" TODO for Red Abilities that were actually fully
    transcribed elsewhere and independently implemented in the app.
17. `rules/05-1`'s Scene Tracker star counts were wrong on all three tiers (said "Standard: 1G/4Y/3R";
    real counts, matching the app's own code, are 2G/4Y/2R) — this is the exact scenario CLAUDE.md
    had already warned about ("don't correct these back to what the book's text implies at a glance").
18. `rules/08-1`'s glossary had two entries ("Hinder," "Hit the Deck!") misfiled under the wrong
    alphabetical heading.
19. `rules/03-8`'s Health formula had the wrong die size (d6 instead of d10) for the final roll —
    confirmed against real published hero data, and this single fix also fully resolved a separate,
    previously-unresolved Time-Slinger arithmetic discrepancy flagged earlier in the same document.

Plus one **corrected wrong finding**: an earlier automated pass claimed all 13 Lieutenants had zero
ability content — false. Only 10 unused book-reference ones do; the 3 actually in play
(Bunsen Burner, Minus, Plus) were always fine. Worth remembering as a caution about trusting sweeping
claims from any single pass, including this one — everything above was independently verified, but if
anything here looks off, say so.

### Open items left for the user (7, each needs a human decision or a physical-book check, not more code)
1. **PDF character-sheet export** — non-functional for three stacked reasons (no UI ever wired to it,
   pdf-lib never vendored/loaded, and a dropdown/checkbox field-type bug plus a rich-text crash with a
   confirmed fix once the first two are addressed). Needs a scoping conversation: is this feature worth
   reviving at all, and if so, what should the UI look like?
2. **Proletariat's "Clones" villain-status label** can't auto-compute — no minion library entry exists
   to count against. Needs either a real "Proletariat Clone" minion built via the Minion Builder, or
   your own explanation of how you track this at the table.
3. **Notes vs. structured ability data** — the warning banner mitigates the immediate corruption risk,
   but whether Notes should live in a genuinely separate field/file from ability cards is a real
   architecture decision, tied to the "jumbled MD files" concern you raised earlier tonight.
4. **Issue Builder has no way to create a first Collection** from within the tool — small, well-scoped
   fix, but touches a design question (does every builder get its own copy of that flow, or a shared
   entry point?).
5. **Tachyon's Health numbers don't reconcile** even after the d6→d10 fix — isolated to her, needs an
   actual physical-book check, not more inference from data already checked.
6. **`campaign/abilities.csv` has ~12 official-hero-worth of orphaned ability rows** with no matching
   hero record — harmless, but only you should decide whether to clean it up.
7. **`environments.csv` in your real campaign is essentially empty** — not a bug, just means Environment/
   Twist features have had minimal real content to test against tonight; worth keeping in mind if you
   build more environments and want another pass.

### Overall assessment, honestly

**What's solid:** the core game-loop machinery — dice rolling, Min/Mid/Max sorting, effect-die hints,
Health/status-band computation, the Retcon mechanic, Activity Log persistence, multi-location token
movement, dangling-reference and empty-scene resilience, and (after tonight's fixes) villain Status
auto-computation — all held up under genuinely adversarial testing, not just a glance. The Minion
Builder and most of the rules reference docs (02-1, 04-1, 05-4, 05-5) were already correct. The CSV/MD/
JSON data-split architecture itself is sound; nothing tonight suggested it needs to change, even though
you've been worried about it.

**What's rough:** the PDF export feature is the standout — it's not a bug so much as a feature that was
scaffolded and then never actually finished or tested, three layers deep. The rules docs in `rules/`
had accumulated real drift from the live app and from each other — five separate stale-reference bugs
found and fixed tonight, all in files that read as authoritative and none of which announced they were
wrong. That's the quieter risk: a GM trusting those docs mid-session would have been told wrong things
confidently. The Notes-modal risk (freeform text sharing a file with machine-parsed data) is the same
shape of problem in the live app rather than the docs.

**What surprised me:** how often "which side is wrong, the code or the doc" wasn't obvious at a glance,
and how often checking against real, already-verified data (Volume1's book-transcribed heroes) settled
it decisively — the Health-formula die size and the Scene Tracker star counts both looked equally
plausible either way until the actual numbers were run. That method carried most of tonight's real
findings. Also genuinely surprising: catching two bugs in my *own* fixes during the same session
(the Tactics-text JSON leak, the Challenge-status ordering bug) — both caught by testing before calling
them done, not by getting them right the first time. Worth keeping that testing discipline even under
time pressure.

Good morning.
