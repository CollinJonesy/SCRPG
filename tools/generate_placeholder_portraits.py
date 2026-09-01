#!/usr/bin/env python3
"""
One-off script: generate simple placeholder portraits (colored circle + initials)
for every Hero/Villain/Minion in a campaign's Library, and upload them via the
existing /api/backgrounds/<key> endpoint against a running server -- the same
code path a real GM upload from the Library table would use. Not part of
server.py (keeps the server itself stdlib-only per CLAUDE.md's constraint;
this script uses Pillow, which is only needed to run this one-off tool).

These are meant to be swapped out for real art later -- upload a real image
through the Library table's "Portrait" file input at any time to replace one.

Usage:
    python3 tools/generate_placeholder_portraits.py --campaign /path/to/campaign --server http://localhost:8420
"""
import argparse
import csv
import hashlib
import io
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SIZE = 200


def color_for(slug):
    h = hashlib.md5(slug.encode('utf-8')).hexdigest()
    r = int(h[0:2], 16) // 2 + 60
    g = int(h[2:4], 16) // 2 + 60
    b = int(h[4:6], 16) // 2 + 60
    return (r, g, b)


def initials_for(name):
    parts = [p for p in name.replace('-', ' ').split() if p]
    if not parts:
        return '?'
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def make_portrait_png(name):
    img = Image.new('RGB', (SIZE, SIZE), color_for(name))
    draw = ImageDraw.Draw(img)
    text = initials_for(name)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 72)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((SIZE - tw) / 2 - bbox[0], (SIZE - th) / 2 - bbox[1]), text, fill=(245, 242, 232), font=font)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def upload(server, key, png_bytes):
    req = urllib.request.Request(
        f'{server}/api/backgrounds/{key}',
        data=png_bytes,
        method='PUT',
        headers={'Content-Type': 'image/png'},
    )
    urllib.request.urlopen(req).read()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--campaign', required=True, help='Path to a campaign folder (used to read the Library CSVs)')
    ap.add_argument('--server', required=True, help='Base URL of a running server for this campaign, e.g. http://localhost:8420')
    args = ap.parse_args()

    campaign = Path(args.campaign)
    jobs = []  # (portrait_kind, slug, name)
    for csv_name, portrait_kind in [('heroes.csv', 'hero'), ('villains.csv', 'villain'), ('minions.csv', 'minion')]:
        p = campaign / csv_name
        if not p.exists():
            continue
        with open(p, encoding='utf-8') as f:
            for row in csv.DictReader(f):
                slug = row.get('Slug', '').strip()
                name = row.get('Name', slug).strip()
                if slug:
                    jobs.append((portrait_kind, slug, name))

    if not jobs:
        print('No Library entries found.', file=sys.stderr)
        sys.exit(1)

    for portrait_kind, slug, name in jobs:
        key = f'portrait-{portrait_kind}-{slug}'
        png_bytes = make_portrait_png(name)
        upload(args.server, key, png_bytes)
        print(f'  uploaded {key} ({name})')

    print(f'\nDone. {len(jobs)} placeholder portraits uploaded to {args.server}.')


if __name__ == '__main__':
    main()
