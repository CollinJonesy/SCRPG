# SCRPG

Home for everything related to my Sentinel Comics RPG campaign(s): the custom VTT, campaign lore/notes, and shared assets.

## Structure

```
SCRPG/
├── vtt/                    Custom VTT project (code) — see vtt/README.md for how to run it
├── campaign/
│   └── occidia/             Current campaign: Occidia
│       ├── lore/            World/setting notes, factions, timeline
│       ├── npcs/             NPC write-ups and stat blocks
│       ├── player-characters/ PC sheets and backstories
│       ├── sessions/         Session recaps/logs, one file per session
│       ├── handouts/         Player-facing documents (letters, clues, etc.)
│       └── maps/             Battle maps, world maps
├── assets/                 Shared media not tied to one campaign
│   ├── images/               Art, tokens source images, reference art
│   ├── audio/                Music, ambience, SFX
│   └── tokens/                VTT-ready token images
└── docs/                   House rules, SCRPG rules reference, misc guides
```

When a second campaign starts, add a sibling folder under `campaign/` (e.g. `campaign/<new-name>/`) rather than restructuring this one.

Note: the VTT app also keeps its own mechanical campaign data (`vtt/campaign/`, `vtt/Volume1/` — CSV/JSON heroes, villains, scenes) separate from the narrative notes under `campaign/occidia/` here. The app data is what `server.py` reads to run a live session; `campaign/occidia/` is where the story/world content lives (authored in Obsidian). See `vtt/README.md` and `vtt/CLAUDE.md` for that split in detail.

## Adding campaign notes/assets

Drop files into the matching folder (`campaign/occidia/lore/`, `assets/images/`, etc.), then:

```bash
git add .
git commit -m "Add <what you added>"
git push
```

## Git/GitHub basics (since this is your first repo)

- **Repo** = the project folder, tracked by git, mirrored on GitHub.
- **Commit** = a saved snapshot with a message describing what changed. Commit often, in small logical chunks ("Add Occidia session 3 recap" beats "updates").
- **Branch** = a parallel line of work. `main` is the default/stable branch. Create a new branch for anything you don't want to touch `main` directly with (e.g. `git checkout -b add-session-4`), then merge it back via a pull request.
- **Pull request (PR)** = a request to merge one branch into another, with a diff you (or reviewers) can look over before it lands. Good habit even solo — gives you a review step and a changelog.
- **Push/pull** = upload/download commits to/from GitHub. `git push` sends your local commits up; `git pull` brings down anything new.
- **`.gitignore`** = tells git which files to never track (build output, secrets, OS junk files). Already set up in this repo — extend it if you need more entries.

### Recommended workflow

1. Make changes locally (edit notes, add files, code on the VTT).
2. `git status` to see what changed.
3. `git add <files>` (or `git add .` for everything) to stage them.
4. `git commit -m "clear description of what changed"`.
5. `git push` to sync to GitHub.
6. For bigger VTT features, branch first (`git checkout -b feature-name`), then PR into `main` when done — keeps `main` always in a working state.

### Tips for staying organized

- **One file per session** in `campaign/occidia/sessions/`, named `YYYY-MM-DD-session-N.md` — sortable by date, easy to scan.
- **Keep large binary assets (maps, audio) reasonably sized** — GitHub isn't great for huge files. If maps/audio get large (100MB+), ask about Git LFS before it becomes a problem.
- **Link, don't duplicate**: if an NPC appears in a session recap, link to their file in `npcs/` instead of re-writing their stats.
- **Commit messages as a changelog**: six months from now, `git log --oneline` in a folder tells you the history of a campaign thread — write messages with that future read in mind.
- **Use a `.md` file per NPC/PC/location** rather than one giant doc — much easier to find, edit, and link between in GitHub's markdown rendering.

## This repo doubles as an Obsidian vault

This repo is the git backing for the "Occidia" Obsidian vault — the vault root is this
folder. `campaign/occidia/*` is written and edited directly in Obsidian (Templater
templates for consistent NPC/PC/session structure); the Obsidian Git plugin handles
commit/push for you here. Player-facing lore gets published separately via the Digital
Garden plugin (tag a note `dg-publish: true`) — that never touches this private repo, so
GM-only content (this repo's `vtt/campaign/`, `vtt/Volume1/`, and anything under
`campaign/occidia/` you haven't tagged) never leaks to players by accident.
