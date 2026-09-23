# Player Digital Character Sheets — BUILD PLAN (finalized 2026-09-22)

Players open a link on their own device, act on THEIR character, and it affects
the board / Player Display / Activity Log. Players drive their own sheets.
This session (2026-09-22) resolved the open questions and set full scope:
**phases 1+2+3 in one program of work** (read-only sheet first, then actions).

## Decisions made (2026-09-22)

- **Full scope this build**: keys + sheet display + notes + alerts +
  Location Viewer + `/api/player-action` (self-actions AND attacks/targeting).
- **Location Viewer = own location only**, same hiding rules as PD
  (no villain health numbers, no GM notes/twists/challenge solutions).
- **Change feed (GM, Sheets menu): only what the PLAYER themselves did**
  (Collin's pick) — abilities used, BHD changes, HP changes, location moves
  initiated from the sheet.
- **Notes**: GM sees everything — full unadulterated access, same as the player.
- **Alerts**: GM → specific player(s) or all; simple dismiss-on-read banner;
  alert history stays visible on the sheet.
- **Reveal gating**: moving into a new Location from the sheet is
  **staged — GM approves the move, THEN the location reveals** on the
  player's device.
- **Attacks/effects on other characters**: each Action has a **Stage for
  PLAYER approval, not GM approval** — a "Are You Sure?" popup showing the
  full breakdown (action, targets, effect dice), which then offers
  **Manual Roll entry OR digital Roll**; on confirm it applies (auto-apply
  once the player confirms). GM sees it land live via the change feed + board.
- **Hybrid dice**: server computes the outcome from entered
  Min/Mid/Max + Effect Die (entry is NOT display-only).
- **Confirm prompt on every player action** (the plan's original pattern).

## Earlier decisions (2026-09-21, still standing)

- **Tablet/laptop first.** Target 12" screens; larger scales up. Phone later.
- **Auth = per-player secret link**: `player-sheet.html?hero=<slug>&key=<token>`.
  Keys stored in `campaign/sheet-keys.json` (hero slug → key), generated/reset
  from the GM's new **Sheets** menu. Revoking = regenerate the key.
  Viewing the PD stays key-free; only the sheet requires the key.
- **CRITICAL: player actions must be server-side mutations, never scene PUTs.**
  Scenes save as full-replace PUT from the GM's browser; a second writer would
  clobber the GM. Player actions go through dedicated POST endpoints that apply
  the mutation to scene JSON **in Python on disk** and return the result.
  GM console + PD keep polling as today.

## New surfaces & endpoints

- **GM Console**: new top-nav **"Sheets"** (right of Build):
  - Per-hero key generate/reset + copy secret link.
  - Change feed: what each player did (live, filterable by hero).
  - Alert composer (per-player / all-players).
  - Pending-action queue: **location-move approvals** (see reveal gating).
- **Player sheet**: `player-sheet.html?hero=<slug>&key=<key>`, read path
  polls like `display.js`.
  - Powers & die values, Qualities & die values, Status band & die value.
  - Abilities: toggle all / filtered-to-current-Status.
  - Hero Points in THIS Issue (total + RAW usage reminder: earned when any
    hero uses a Principle in an Overcome or in a meaningful social scene,
    max 5/hero/Issue, spent as exclusive bonuses at Issue end) — includes
    the Issue-wide total from `hero_points.json`.
  - Picture, physical attributes, alias, biographical info, principles +
    twist questions (from `players.csv` `Principle1/2{Minor,Major}Twist`).
  - Auxiliary sheet options.
  - Notes section (player-private UI; GM sees contents in the Sheets menu).
  - Alerts banner (dismiss-on-read) + alert history.
  - Location Viewer: their location's tokens under PD hiding rules.
  - Action buttons (abilities + basic actions) behind the Are-You-Sure stage:
    breakdown → Manual Roll (Min/Mid/Max + Effect) or digital roll →
    server computes outcome → applies via player-action endpoint.

## Server endpoints (new, all validated server-side)

- `GET/POST /api/sheet-keys` — generate/reset keys (GM only).
- `GET /api/player-sheet?hero=&key=` — full sheet payload (auth-gated).
- `POST /api/player-notes` — save notes (auth-gated).
- `GET/POST /api/alerts` — compose (GM) / list+dismiss (player).
- `POST /api/player-action` — staged actions (move, ability use, basic
  actions, attacks). Applies to scene JSON in Python; never a scene PUT.
  Movement between locations returns a pending approval for the GM queue;
  everything else applies on player confirmation and appends to the change
  feed (`campaign/sheet_activity.json` or similar).
- Physical-dice entry path: server resolves outcome from Min/Mid/Max +
  Effect Die using the same resolution math as the GM board.

## Hiding rules (inherited from PD)

Player sheet NEVER shows: villain health numbers, GM notes/twist solutions/
challenge solutions, other locations' contents, other players' private notes.

## Build order (within the single program of work)

1. Keys + `/api/player-sheet` read-only payload + sheet UI (display, notes,
   alerts, Location Viewer) + GM Sheets menu (keys, change feed, alerts).
2. `/api/player-action` for self-affecting actions behind the confirm stage.
3. Attacks/targeting + staged location-move approvals + dice-resolution path.

## Later build: Montage scenes in the Scene Builder (needed)

Montage scenes must be buildable as their own scene type in the Scene
Builder, differently from Action or Social scenes.RAW already diverges
mechanically for Montage (recovery happens as part of the scene, NOT as a
taken action — the app now enforces this: the sheet has no basic Recover
button and `heroCanRecover()`/`scene_is_montage()` bypass the
ability-requirement only in a Montage), and the PD hides all health bars in
Montage/Social.So the Scene Builder needs a Montage shape of its own —
turn/tracker structure, challenge vs. freeform round flow, what the panel
shows — before a real Montage is authored.Shipping note: the code paths
already treat `sceneType: 'Montage'` (case-insensitive) as its own mode
wherever it matters; what is missing is the Builder authoring experience.

## Gates

- `tests/test_server.py` round-trips for every new endpoint (auth reject,
  clamp, mutation correctness).
- `tests/test_field_parity.py` stays green; schema guard where headers change.
- Suite green BEFORE commit + sync (jones-mini production, T430s replica).
