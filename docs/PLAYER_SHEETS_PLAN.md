# Player Digital Character Sheets — planning notes (parked 2026-09-21)

Long-term idea: players open a link on their own device, act on THEIR character,
and it affects the board / Player Display / Activity Log — "D&D Beyond" style.
Collin does not hand-enter everything; players drive their own sheets.
This is a PLAN ONLY — nothing built. Not scheduled for Session One prep.

## Decisions made (2026-09-21, pre-bed chat)

- **Tablet/laptop first.** Target 12" screens; larger screens scale up naturally.
  Phone layout is a fallback (laptop dies at the table) — later.
- **Auto-apply with confirmation.** Every player action applies immediately, but
  only after a big, very readable "This is what you're trying to do, right?"
  prompt (plain-language summary of action + target + effect before Apply).
- **Hybrid dice.** Players rolling physically is likely. The confirm prompt must
  support BOTH: tap "roll digital" OR manually enter their own results
  (Min / Mid / Max + Effect Die). Same prompt, either path.

## Architecture notes (from the planning session)

- New surface `player-sheet.html` (same family as builder pages). Read path
  mirrors `display.js` polling; no accounts.
- **Auth = per-player secret link**: `player-sheet.html?hero=<slug>&key=<token>`.
  Key generated per campaign (stored on/near the players.csv row or a
  `sheet-keys.json`). Revoking a link = regenerate the key. Viewing the PD stays
  key-free; only ACTING requires the key.
- **CRITICAL: player actions must be server-side mutations, never scene PUTs.**
  Scenes save as full-replace PUT from the GM's browser copy; a second writer
  would clobber the GM (lost update). Player actions go through a dedicated
  `POST /api/player-action` endpoint that applies the mutation to scene JSON on
  disk in Python and returns the result. GM console + PD keep polling as today.
- **Player CAN:** roll (or enter) their pool and reveal it, use their own
  abilities (abilities.csv layer), Boost/Hinder/Defend as themselves, Recover,
  view their own sheet (portrait, health/status band, mods on them, abilities,
  location + who else is there).
- **Player CANNOT:** see villain health numbers (PD already hides these), GM
  notes / twists / challenge solutions, mark challenge successes, move other
  tokens, edit their build (Hero Builder + GM approval stays).

## Open questions (discuss next session)

1. **Reveal gating.** Collin asked for a concrete example of when a reveal must
   be GM-gated. First case already identified: **a player moving into another
   Location should reveal what's in that location** — decide whether that is
   automatic, or staged as a pending action the GM approves and THEN reveals.
2. **The "one player walks into a room" problem (deferred).** What do the OTHER
   players see/experience when only one PC enters a location with hidden
   threats? PD is a shared single TV — per-player information hiding is a
   genuinely different design (per-device views? GM narrates?). Parked as its
   own discussion.
3. Attacks on other PCs: auto-apply the target's save immediately, or stage
   pending-GM? (Leaning auto-apply for consistency with decision above.)
4. Does physical-dice entry ever feed the digital resolution (server computes
   outcome from entered Min/Mid/Max), or are entered results display-only?

## Phasing (agreed shape)

1. Read-only sheet + secret links (zero risk, immediately useful).
2. `/api/player-action` endpoint + self-affecting actions (Defend, Recover,
   own Boost/Hinder) behind the confirm prompt.
3. Attacks / targeting, with the approval + reveal-gating model from the open
   questions above.
