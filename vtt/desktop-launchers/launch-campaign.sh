#!/bin/bash
# Launches the SCRPG VTT server for the "campaign" folder and opens a browser to it.
# Self-locating: works regardless of where this repo is cloned, no path editing needed.
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR" || exit 1
python3 server.py --campaign campaign --port 8421 &
sleep 1
xdg-open http://localhost:8421
wait
