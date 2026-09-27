# SCRPG Scene Board

A local VTT for Sentinel Comics RPG: Locations instead of a grid, GYRO-based health bars, a rules-aware Minion/Lieutenant attack resolver, a Scene Tracker, and Challenges (including Timed and Doomsday Devices) — with a GM Console (full info) and a separate Player Display (redacted) for casting to a TV.

## Running it

Storage lives entirely on a small local server (Python 3 stdlib only, nothing to install) — this also means any device on your Wi-Fi, including your phone, can open it in a browser. No APK, no File System Access API (which doesn't exist on mobile browsers anyway).

```bash
cd vtt
python3 server.py
```
It prints:
```
SCRPG Scene Board running.
  Campaign folder: /home/collin/scrpg-vtt/campaign
  GM Console (this machine):  http://localhost:8420
  GM Console (your phone, same Wi-Fi): http://192.168.1.42:8420
  Player Display (cast this tab):      http://localhost:8420/display.html
```

- **GM Console** (`/`) — everything: Library, Scenes editor, Board with full control, Challenge solutions, GM Notes. This is what you run the game from.
- **Player Display** (`/display.html`) — a separate, read-only, auto-refreshing page. **This is the tab you cast to your TV.** It shows Locations with backgrounds, tokens, health, and Challenge progress — but never Challenge solutions (unless you've explicitly marked one "revealed") and never GM Notes. Open it from the "Open Player Display ↗" link in the Console header, or just navigate to it directly.

Use `--campaign` / `--port` same as before.

**openSUSE firewall**, if your phone can't reach the printed IP:
```bash
sudo firewall-cmd --add-port=8420/tcp --permanent && sudo firewall-cmd --reload
```

**Debian firewall** (uses `ufw` instead of `firewall-cmd`):
```bash
sudo ufw allow 8420/tcp
```

## Running fully offline

The app has zero internet dependency — PapaParse and the Bangers/JetBrains Mono/Inter
fonts are vendored locally under `vendor/` (see `server.py`'s `/vendor/` static route),
not loaded from a CDN or Google Fonts. Nothing needs to reach the internet at any point,
before or during a session.

## Desktop launchers (no terminal needed)

`desktop-launchers/` ships a `.sh` launch script and `.desktop` template for
`campaign/`. To install as a clickable app-menu entry (GNOME, KDE, XFCE, etc.):
```bash
bash desktop-launchers/install.sh
```
This fills in the actual repo path automatically (no manual editing) and installs to
`~/.local/share/applications/`. The launcher starts the server on port 8421 and opens
a browser to it.

## Moving this to another machine

This is a git repo, now living inside the larger `SCRPG` repo under `vtt/`. See the
root [README](../README.md) for the repo-wide git workflow. For a fully offline
machine-to-machine transfer (no shared network, e.g. via USB drive), you can still bundle
the whole repo up:
```bash
git bundle create scrpg.bundle --all
```
Copy the resulting `scrpg.bundle` file over, then on the new machine:
```bash
git clone scrpg.bundle "SCRPG"
```
For later updates, repeat the bundle step and run `git pull scrpg-update.bundle main`
on the target machine.

**Security:** no login, no encryption — anyone on your Wi-Fi can read/write while this runs. Fine for home use; don't expose it publicly.

## Scenes

The Board no longer plays one fixed scene — it plays whichever **Scene** you've loaded. Go to the **Scenes** tab:

- **+ New Scene** → opens the Scene Editor.
- Each scene has: name, **Difficulty** (Easy/Moderate/Difficult, with the real page 185-188 reference table shown inline as guidance — Challenges/Minions/Lieutenants/Villains/Environment by tier, not enforced, just there to look at while you build), a **Scene Tracker**, any number of **Locations** (each with an optional background image), any number of **Challenges**, and a GM Notes field.
- **Load to Board** sets that scene as the active one — the Board and Player Display both switch to it immediately.
- You can have as many scenes prepped as you want; only one is "active" (on the Board/Display) at a time.

## Scene Tracker

Built from the printed chart — Standard (2 green / 4 yellow / 2 red), Prolonged (3 green / 5 yellow / 3 red), Epic (1 green / 3 yellow / 4 red). Those three are the only trackers. Click any star to jump the marker there; Advance/Retreat buttons on the Board move it one space at a time. A Doomsday Device's "Advance Device Turn" button also moves it, per its configured speed. New scenes are started in **Build → Scene Builder**.

## Locations

No fixed count anymore — add or remove freely per scene. Each gets a name and an optional background image (upload from the Scene Editor); the Board and Player Display render it as a cover image behind that Location's column.

## Challenges

All six book types are selectable (Simple, Linear, Multiple Solutions, Branching Outcomes, Timed, Doomsday Device). Structurally, every challenge is one or more **paths**, each needing N successes — this matches the pattern already in your own Notion (a Linear challenge's sequential checkboxes, a Multiple Solutions challenge's parallel paths). Timed and Doomsday Device get their book-accurate extra mechanics:

- **Timed**: a timer that's either a turn countdown, or set to trigger when the Scene Tracker reaches Yellow or Red (per the page 191 chart). You track the countdown manually — there's no automated turn order in this app, so you decrement it yourself each round.
- **Doomsday Device**: takes its own "turn" — click **Advance Device Turn** and the Scene Tracker moves by however much you configured (1 space, 2 spaces, to the start of the next zone, or to the end of it), matching the book's "it moves the tracker forward at least twice in the turn" rule. Also has Impact Scale and a Catastrophic Outcome field for your own notes on what happens if it goes off.

Every challenge has a **Solution** field and a **Hidden from Player Display** checkbox (checked by default). Progress (the success counters) always shows on both Console and Display — only the Solution text is withheld until you uncheck the box.

## Hidden information

This only ever applies to two things: a Challenge's **Solution** field, and the scene's **GM Notes** field. Everything else — tokens, health, dice, Location names/backgrounds, Challenge titles and progress — is visible on both the Console and the Player Display by default, since that's the shared "board" your players are looking at. If you find you want more granular hiding (e.g. a Villain's Status Dice being secret), tell me and I'll add a similar per-field toggle.

## Importing from Notion

Unchanged from before — `notion_import.py` still reshapes Notion CSV exports (Hero Roster, Villain Database, Minions & Lieutenants) into the Library.

## Rules encoded so far

- **Hero/Villain Health**: GYRO band coloring, Heroes off the printed 17-40 chart, Villains off per-entry Green/Yellow/Red floors you set.
- **Minions**: roll their own die as a save. Fail → knocked out. Success → degrade one step. A d4 that saves stays (last stand).
- **Lieutenants**: roll their own die as a save. Fail → degrade one step. Succeed → no change. Damage ≥ 2× die size → instant KO, no save.
- **Scene Tracker**: Standard 2 green / 4 yellow / 2 red, Prolonged 3/5/3, Epic 1/3/4. Presets only — no custom stars. Click a star or Advance/Retreat.
- **Scene Difficulty**: real page 185-188 table shown as reference.
- **Challenges**: all 6 types, path/success-counter model, Timed and Doomsday Device mechanics from pages 191 and 197-198.
- **Hidden info**: Challenge solutions + GM Notes withheld from Player Display until revealed.

## Explicitly NOT built yet

- No automated 3-die pool / Min-Mid-Max / Effect Die resolution — still GM-adjudicated.
- No turn-order/initiative tracker — Timed countdowns and Doomsday Device turns are manually triggered by you, in whatever order you're already running the scene.
- No auth on the server — anyone on your Wi-Fi with the link has full read/write.
- No undo history — everything is plain text/JSON on disk, so version control or periodic copies are your safety net if wanted.
- Player Display polls every 2 seconds rather than pushing updates instantly — there's a small lag, not truly live.
- Drag-and-drop is still the only way to move tokens between Locations on the Console; untested on a touchscreen.
