# SCRPG

Home for everything related to my Sentinel Comics RPG campaign(s): the custom VTT, campaign lore/notes, and shared assets.

## Structure

```
SCRPG/
├── vtt/                    Custom VTT project (code)
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

## Adding the VTT project

The VTT code currently lives locally and isn't in a repo yet. To bring it in:

```bash
cd /path/to/your/local/vtt-project
git init                                  # if it isn't already a git repo
git remote add origin https://github.com/CollinJonesy/SCRPG.git
git fetch origin
git checkout -b vtt-import
# copy/move your project files into a vtt/ subfolder if they aren't already
git add .
git commit -m "Import existing VTT project"
git push -u origin vtt-import
```

Then open a pull request into `main` (or ask Claude Code to do it) so the code lands under `vtt/` in this repo. If you'd rather just drag-and-drop, you can also upload the files directly on github.com (Add file → Upload files) into the `vtt/` folder — fine for small batches, but the command line is better once there's more than a few files.

## Adding campaign notes/assets

Same idea — drop files into the matching folder (`campaign/occidia/lore/`, `assets/images/`, etc.), then:

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
- **`.gitignore`** = tells git which files to never track (build output, secrets, OS junk files). Already set up in this repo — extend it if your VTT stack needs more entries (e.g. `node_modules/`, `venv/`).

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
