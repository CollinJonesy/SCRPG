#!/bin/bash
# Run this once after cloning the repo (on the Debian laptop, or anywhere else) to
# install both desktop launchers -- fills in the actual repo path automatically,
# no manual editing needed. Installs to the standard per-user location, so it
# works under GNOME, KDE, XFCE, etc. without root.
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_DIR="$HOME/.local/share/applications"
mkdir -p "$DEST_DIR"

chmod +x "$REPO_DIR/desktop-launchers/launch-volume1.sh" "$REPO_DIR/desktop-launchers/launch-campaign.sh"

for name in scrpg-vtt-volume1 scrpg-vtt-campaign; do
  sed "s|__REPO_DIR__|$REPO_DIR|g" "$REPO_DIR/desktop-launchers/$name.desktop.template" > "$DEST_DIR/$name.desktop"
  chmod +x "$DEST_DIR/$name.desktop"
  echo "Installed $DEST_DIR/$name.desktop"
done

update-desktop-database "$DEST_DIR" 2>/dev/null || true

echo "Done. Look for \"SCRPG Scene Board — Volume1\" and \"SCRPG Scene Board — campaign\" in your application launcher."
