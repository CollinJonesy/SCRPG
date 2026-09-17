#!/bin/bash
# Run this once after cloning the repo to install the campaign launcher.
# Fills in the actual repo path automatically. Installs to the per-user
# applications dir (GNOME, KDE, XFCE) without root.
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="$HOME/.local/share/applications"
mkdir -p "$DEST_DIR"

chmod +x "$REPO_DIR/desktop-launchers/launch-campaign.sh"

sed "s|__REPO_DIR__|$REPO_DIR|g" "$REPO_DIR/desktop-launchers/scrpg-vtt-campaign.desktop.template" > "$DEST_DIR/scrpg-vtt-campaign.desktop"
chmod +x "$DEST_DIR/scrpg-vtt-campaign.desktop"
echo "Installed $DEST_DIR/scrpg-vtt-campaign.desktop"

rm -f "$DEST_DIR/scrpg-vtt-volume1.desktop"

update-desktop-database "$DEST_DIR" 2>/dev/null || true

echo "Done. Look for \"SCRPG Scene Board — campaign\" in your application launcher."
