# SCRPG VTT — Open Asks & Spec

This document captures every open ask for the VTT, scoped enough to implement from. The goal: each section is self-contained and you (or any future me) can pick it up and build it without re-deriving the design.

Each ask has:
- **What** — the user-visible behavior
- **Where** — files / functions touched
- **Data** — what schema/state changes are needed
- **Defaults chosen** — assumptions made to keep this spec actionable
- **Open decisions** — things only you can answer (marked `[YOU]`)

---

## 1. Remove "+Status" button (and the freeform tag system)

**What:** Tokens no longer show a `+Status` button or any freeform text tags. The boost/hinder button (which currently writes entries to `t.tags`) also goes away for now, since its output lived in the same `tags` field.

**Where:**
- `app.js` `renderToken()` (line ~1016): remove `body += renderTagsRow(t);`
- `app.js`: delete `renderTagsRow()`, `addTag()`, `removeTag()`, `addBoostHinder()` (all four push to `t.tags`)
- `display.js` `renderTokenReadOnly()` (line ~212): remove the `(t.tags || []).length` block
- `style.css`: keep `.tags-row` and `.status-tag` rules for now (harmless; removed in cleanup pass)

**Data:** No schema change. Tokens that already have `tags` in their JSON will simply stop rendering them. They can be cleaned up later by hand or with a one-shot script.

**Defaults chosen:**
- Boost/Hinder tracking is **fully removed** for now. The mechanical Boost/Hinder action is real SCRPG, but the implementation here was a freeform text tag, which doesn't match the rules. Re-adding it correctly is a separate ask (see §6, future work).
- No deprecation warning. This is a local single-player tool; the data loss is cosmetic.

**Open decisions:** None. This is a pure removal.

---

## 2. Fix invisible Principles text (Twist Picker)

**What:** The principle name, roleplay prompt, and minor/major twist text are all invisible on the dark theme because the inline styles only set `font-family` and `font-size` — they inherit `--text-ink` (dark navy) on a dark background. Fix by setting an explicit readable color.

**Where:**
- `app.js` `renderTwistPickerBody()` (lines ~1447-1452): add `color:var(--text-hi)` to the principle name `<div>`, the roleplay `<p>`, and the Minor/Major `challenge-path-row` divs
- This is the only place this rendering happens — no duplicate code to fix

**Data:** None.

**Defaults chosen:**
- Use `var(--text-hi)` (the existing high-contrast text color from the theme) — consistent with the rest of the modal

**Open decisions:** None.

---

## 3. Hero Status Die on token

**What:** Hero tokens show their current Status Die, derived from the GYRO band they're currently in. Out band = "Out ability only" label, no die. GM Console and Player Display both get it.

**Where:**
- `app.js`: new function `computeHeroStatusDie(heroRow, t)` that returns `{die, source}` (mirrors `computeVillainStatus()`):
  - band = `computeHeroStatus(maxHealth, currentHealth, scene).band`
  - die = `heroRow.GreenStatusDie/YellowStatusDie/RedStatusDie` for those bands
  - For `out` band: `{die: '', source: 'OUT — Out ability only'}`
- `app.js` `renderHealthBlock()`: add a `die-row` below the health readout for hero tokens (matches the villain's existing pattern at lines 1052-1064)
- `display.js` `renderTokenReadOnly()`: add the same `die-row` for heroes (read-only, no click-to-roll)
- Roll button: gate on `GMControlled` (see data below)

**Data:**
- New column `GMControlled` in `players.csv` (default `false` for player characters)
- The CSV reader loop in `app.js` (`HEROES_HEADERS`, line ~78-83) needs `GMControlled` added
- The roll button already lives in `renderToken()` line 1018; change the condition to:
  ```
  (t.kind === 'hero' || t.kind === 'villain') && (t.kind === 'villain' || heroRow.GMControlled)
  ```
  i.e. Villains always have Roll; Heroes only if their library row has `GMControlled === 'true'`
- Add `GMControlled` to the Library table column list (around line 350)

**Defaults chosen:**
- `GMControlled` is a **CSV column**, not a per-spawn token override. It's a property of the hero entry, not the session.
- Library cells render as a checkbox toggle (consistent with the rest of the editable library).
- Player Display shows the same die as GM Console (consistent with the villain pattern — players can see villain status die on the TV).

**Open decisions:**
- `[YOU]` For Library table display: show `GMControlled` as a column, or as a per-row toggle button (like the existing "Principles" / "Notes" buttons)? Column is more scannable; button saves horizontal space.

---

## 4. Villain / Minion / Lieutenant Abilities display (GM Console)

**What:** When the GM clicks a Villain, Minion, or Lieutenant token on the Board, a "Read" button on the token card opens a modal showing all of that character's abilities. Modals follow the existing `openNotes()` pattern.

**Where:**
- `app.js` `renderToken()`: add a "Read" button to the token footer (for all four token kinds; Heroes reuse it for the Principles/Twists modal that already exists)
- `app.js`: new function `openAbilities(tokenId)` that:
  - Looks up the token's library row (heroes/villains/minions by slug)
  - Pulls the character's `.md` notes file (same as `openNotes()`) — but in this case the MD content is treated as **structured** ability data, not freeform notes
  - Renders a card per ability: Name, Type (Action/Reaction/Inherent), Icon (Attack/Defend/Boost/Hinder/Overcome/Recover/any custom), Description
  - For Villains: handles the multi-villain rule — Upgrade and Mastery are hidden if `scene.tokens.filter(t => t.kind === 'villain').length > 1`
- New modal `#abilitiesModal` in `index.html` (clone `notesModal` structure)
- CSS: a `.ability-card` style that matches `.challenge-edit-card`

**Data — Abilities MD format (structured):**

```markdown
# (character name)

## Abilities

### [A] [Attack] "Adaptive Mercurium Limb"
Description of the ability. Freeform text.

### [R] [Boost] "Feel No Pain"
Reduces damage by 1/2/3 based on zone.

## Upgrades
### [A] [Attack] "Reinforced Plating"
+5 Health, +1 damage.

## Mastery
### [A] [Defend] "Living Wall"
Interpose for allies.
```

Where:
- `[A]` / `[R]` / `[I]` = Action / Reaction / Inherent
- `[Attack]` / `[Defend]` / `[Boost]` / etc. = the Icon enum
- `###` headers under `## Abilities` / `## Upgrades` / `## Mastery` = individual ability cards

**Why MD, not CSV:** A new column per ability (5+1+1 = 7 abilities × 4 fields = 28 new columns for villains) is unwieldy. MD lets the GM write long descriptions naturally and keeps the data inspectable. Minions/Lieutenants get the same format with `## Abilities` and `## Tactics`.

**Where:**
- Hero MD: same pattern, used for hero abilities and principles. The existing principles data is already in the CSV columns (`Principle1Name/Roleplay/MinorTwist/MajorTwist`) — when a hero token has a notes file, it can use the MD format for richer abilities; otherwise it falls back to the CSV columns.
- Minion MD: `## Abilities` and `## Tactics` sections.
- Villain MD: `## Abilities`, `## Upgrades`, `## Mastery` sections.

**Defaults chosen:**
- Modal is **GM-only** (Player Display never sees the abilities modal)
- Multi-villain rule is auto-detected from scene state, not a manual flag
- If the MD file doesn't exist, the modal shows a friendly "No abilities recorded — open Notes to add them" message with a button that opens `openNotes()`

**Open decisions:**
- `[YOU]` If no MD file exists, should the modal auto-open the Notes editor, or just show the message and let the GM click a button? Auto-open is more helpful but more aggressive.
- `[YOU]` For Villains, the existing 24 in `Volume1/villains.csv` don't have ability data in the CSV. Do you want me to (a) populate the MD files from the rulebook data during this build, (b) populate them from your Notion data if you have it accessible, or (c) leave them empty and let you fill them in? (c) is the safe default.
- `[YOU]` For Villain abilities, the rulebook specifies the abilities per Archetype (Bruiser has 6 to choose from, you pick 2). Do you want the modal to show "all archetype abilities" with checkboxes for "active/included," or just "the abilities you've defined"?

---

## 5. Activity Log

**What:** A scene-scoped log that records every action taken in a Scene: who attacked whom, what the result was, what dice were rolled, what challenges were progressed, etc. Visible on the GM Console (and optionally on the Player Display as a tasteful "what just happened" feed).

**Where:**
- New field on scene state: `scene.activityLog` (array of `{ timestamp, actor, action, target, result, details }` entries)
- `app.js`: new `logActivity(actor, action, target, result, details)` function that pushes to the current scene's log
- Every existing event site calls `logActivity`:
  - `applyDamageToHealth()` → "Damage" with damage amount
  - `resolveMinionSave()`, `resolveLieutenantSave()` → "Save" with roll result
  - `confirmMinionKo()`, `confirmLieutenantKo()`, `confirmLieutenantDegrade()` → "Defeated" / "Degraded"
  - `rollDicePool()` → "Roll" with min/mid/max
  - `advanceDoomsdayTurn()` → "Tracker Advanced"
  - `bumpPathFieldLive()` → "Challenge Progress"
- New `renderActivityLog()` function that shows the log in a panel
- New `<div id="activityLogPanel">` in `index.html`, positioned on the Board (probably bottom-right or a slide-out)

**Data — Activity log entry shape:**
```js
{
  timestamp: 1787976284.791,  // Unix seconds
  round: 3,                  // current round (from Action Tracker, see future)
  actor: { id, name, kind }, // who did it
  action: 'Attack',          // what type
  target: { id, name, kind },// optional
  result: 'Hit for 8 damage',// human-readable result
  details: { /* structured */ damage: 8, dieRoll: 4 }
}
```

**Defaults chosen:**
- Log is **scene-scoped** — resets when a new scene is loaded
- Log is **append-only** — no editing, no deletion (clean audit trail)
- Log is **GM-only by default**; Player Display gets a redacted version showing only actor names + result text (no target metadata)
- Log is **persisted to scene JSON** so it survives a page refresh
- Log is **scrolling, not paginated** — newest at top, max 200 entries shown in UI (full log stays in JSON)

**Open decisions:**
- `[YOU]` Player Display visibility: full feed (actors + targets + results), redacted (actors + results only), or hidden entirely? My recommendation: actors + results only, with a 5-second "what just happened" toast that fades.
- `[YOU]` Should the Activity Log include the dice rolls (min/mid/max values), or just the final result? Showing rolls is great for transparency; hiding them keeps the TV clean.
- `[YOU]` Log retention in JSON: all entries forever, or roll off after N entries (e.g. last 1000)? My recommendation: keep all, JSON is small.

---

## 6. Future / out-of-scope for this round

Captured here so they don't get lost. **Not implementing in this build.**

### 6a. Action Tracker
The rule says actions pass between all 4 token types in a round. Implementation sketch:
- New field on scene: `scene.actionTracker = { round: 1, order: [tokenId, ...], acted: { tokenId: bool } }`
- Board panel showing round counter + token list with "Acted" toggles
- "Start New Round" button advances round, clears all acted flags
- New scene = new tracker (resets on `blankScene()`)
- `logActivity()` calls will reference `scene.actionTracker.round` so the log has round context

### 6b. Boost / Hinder tracking (replacement)
The old Boost/Hinder button wrote freeform text tags. A proper implementation would be a `scene.mods` array of structured entries: `{actor, target, type: 'boost'|'hinder', size, source, consumed: bool}` with auto-consumption on the next relevant action. Defer to its own ask.

### 6c. Library data backfill from Notion
The `notion_import.py` script imports from Notion CSVs. With new structured-ability storage, we'd want to:
- Detect existing per-character MD notes files
- Or import ability data from a Notion database with new columns
Defer until the modal exists and we know the format.

### 6d. Touchscreen drag-and-drop
The README calls this out as untested. Not a code change; needs hardware testing.

### 6e. Server-side validation of malicious input
The README calls out "no auth, anyone on Wi-Fi can read/write." Out of scope for this build but worth a separate ask.

---

## Open decisions summary (all `[YOU]`) — RESOLVED, see the Endgame Roadmap

All six were answered during the "Endgame" roadmap planning pass (2026-08-29) and are being implemented in that order (§1 → §2 → §3 → §4 → §5, plus items from CLAUDE.md's own roadmap):

1. **§3 Library display of `GMControlled`:** own column (done).
2. **§4 Abilities modal when no MD exists:** "No abilities recorded" message + button opening Notes (not auto-open) (done).
3. **§4 Villain ability source data:** upgraded mid-build — instead of generic archetype-menu stubs, the user provided the actual SCRPG rulebook PDF (`~/Downloads/SCRPG_compressed.pdf` / the split `SCRPG_compressed-pages/` folder). Every one of the 24 villains' real Abilities/Upgrades/Mastery (Name, Action/Reaction/Inherent type, exact GameText) was transcribed directly from the book's Archives section and written to `md/villains/*.md` in both `campaign/` and `Volume1/` (done — see the "Endgame Roadmap" completion note below).
4. **§4 Villain abilities scope:** show only what's actually defined in the MD (done).
5. **§5 Player Display feed:** full (not redacted) — actor + target + result + dice values (done).
6. **§5 Log includes dice rolls:** yes (done).

Confirmed again on 2026-08-29: the Villain-abilities format stays **Markdown, not CSV** (up to 5 Abilities + 1 Upgrade + 1 Mastery per villain, hidden when another Villain token is present) — already built as the "Read" modal + MD parser in `app.js`. Do not revisit this into CSV columns without asking first; it was reconsidered and confirmed as MD again after being fully built.

**Endgame Roadmap (2026-08-29) — fully complete.** All 10 steps landed and were verified live against both `campaign/` and `Volume1/`: the missing token-interaction functions (Step 0), the `poll()`/PapaParse fixes, Hero Status Die + `GMControlled`, this Abilities modal with real book data, the Dice Roller's `abilities.csv` layer (also populated with real per-hero GameText from the same rulebook PDF — see `tools/prefill_villain_abilities.py` is superseded/unused; the real data lives directly in the MD files and `abilities.csv`), the Activity Log, placeholder portraits (`tools/generate_placeholder_portraits.py`), touch drag-and-drop, and a `tests/` unittest suite (23 tests, all passing). See CLAUDE.md's "Known data gaps" section — the Wraith/Time-Slinger Principle Minor/Major Twist gap is also now fixed with real book text.

---

## 7. Backlog — user-flagged items (2026-08-29), not yet scheduled

Captured verbatim from a conversation with the user; **not implemented yet**, just tracked here so they don't get lost. Pick these up as a future ask.

### 7a. Rules — merge the two Hero Archetype files ✅ done (2026-08-30)
`rules/03-3-archetypes-part1.md` and `-part2.md` merged into a single `rules/03-3-archetypes.md` covering all 20 entries. Verified live via `/api/rules`.

### 7b. Rules — better topic separation
General note that the `rules/` folder's organization could be clearer (e.g. keep "Hero Creation" distinct from "Power Sources," "Archetypes," etc.). No specific file list given yet — needs scoping with the user before implementing.

### 7c. Rules search doesn't highlight/find the searched term
In the GM Console's Rules tab, typing a search term doesn't visibly highlight or jump to the matching text within a rule's rendered content. Needs investigation into `renderRulesList()`/whatever handles `rulesSearchInput` in `app.js` to see whether it's currently only filtering the section list (not searching within a section's body) or something else entirely.

### 7d. Villain Library — rename "Loc1"/"Loc2" columns to "Status N"/"Status N Die" ✅ done (2026-08-30)
Header strings in `app.js` `renderLibraryTable()`'s `theadCols` relabeled to "Status 1"/"Status 1 Die" through "Status 5"/"Status 5 Die". No CSV/schema change (the underlying fields were already correctly named `Status1Label`/`Status1Die` etc.). Verified live in the Library table.

### 7e. What happens when a Villain hits 0 HP?
A genuine rules-mechanics gap: CLAUDE.md documents confirmed mechanics for Minion saves (defeated outright) and Lieutenant saves (step down/KO), but nothing for what happens when a Villain's Health reaches 0. Needs a rules-mechanics answer from the user (checked against the physical book, per CLAUDE.md's "don't guess mechanics" rule) before any code is written — is there a Villain-equivalent "save," or does 0 HP just end the fight outright?

### 7f. Cross-campaign Library sync + a defined "new campaign" process
Heroes/Villains/Minions/Lieutenants/Environments/etc. currently have to be manually duplicated between `campaign/` and `Volume1/` (and any future campaign folder) with no built-in sync mechanism. Needs a real design pass: what should be shared vs. per-campaign, whether it's a one-time export/import tool or an ongoing sync, and what a "create a new campaign" workflow should actually do (copy a template Library? start blank? clone from an existing campaign?). Bigger scope, needs its own planning session.
