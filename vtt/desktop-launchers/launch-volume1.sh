#!/bin/bash
# Launches the SCRPG VTT server for the Volume1 campaign and opens a browser to it.
# Self-locating: works regardless of where this repo is cloned, no path editing needed.
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR" || exit 1
python3 server.py --campaign Volume1 --port 8420 &
sleep 1
xdg-open http://localhost:8420
wait
