#!/usr/bin/env python3
"""
server.py — local server for the SCRPG Scene Board.

Serves the app (GM Console + Player Display) and a read/write API over your
campaign folder: Library CSV/MD, Scenes (setup + live state combined), an
active-scene pointer, and background images. Stdlib only, nothing to install.

USAGE
  python3 server.py                          # campaign folder = ./campaign, port 8420
  python3 server.py --campaign ~/scrpg/main-campaign --port 8420

GM Console (full control):      http://localhost:8420  (or your phone's LAN address)
Player Display (cast this tab): http://localhost:8420/display.html

SECURITY NOTE
  No login, no encryption. Anyone on your Wi-Fi can read/write your campaign
  files while this runs. Fine for home use — don't expose it publicly.
"""

import argparse
import csv
import io
import json
import os
import random
import re
import socket
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime
import secrets
import time
from pathlib import Path
from urllib.parse import urlparse, unquote

APP_DIR = Path(__file__).parent
RULES_DIR = APP_DIR / 'rules'

# ---------------- Concurrency: one lock + atomic file writes ----------------
#
# ThreadingHTTPServer serves each request on its own thread. Nearly every
# mutating route is a read-modify-write over a campaign file (scene JSON,
# CSV extras-merge, hero points, sheet keys, activity feed, alerts). Without
# a lock, two overlapping writers read the same baseline and one update is
# silently lost; a crash mid-write can also truncate a file. Rules for ALL
# state IO in this module:
#   1. Every write goes through _atomic_write_text/_atomic_write_bytes —
#      temp file in the target directory, fsync, then os.replace, so a
#      reader only ever sees the complete old file or the complete new one.
#   2. Every read-modify-write cycle holds STATE_LOCK from its first read
#      through its final write. Atomicity alone does NOT stop lost updates.
#   3. Plain reads need no lock (atomic replace guarantees whole files).
#      Never hold STATE_LOCK while talking to the HTTP client.
# STATE_LOCK is an RLock because save paths nest (e.g. record_sheet_activity
# runs inside the /api/sheet-keys critical section).

STATE_LOCK = threading.RLock()

# Monotonic campaign-data version for /api/events (Server-Sent Events).
# Bumped by every successful atomic write; display.js / player-sheet.html
# re-fetch only when this moves instead of blind-polling.
STATE_VERSION = [0]


def state_version() -> int:
    with STATE_LOCK:
        return STATE_VERSION[0]


def _atomic_write_bytes(path: Path, data: bytes):
    """Replace `path` atomically: temp file in the same directory, fsync,
    os.replace. Bumps STATE_VERSION so SSE clients see the change."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=str(path.parent),
                                    prefix='.' + path.name + '.', suffix='.tmp')
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_name, path)
    except BaseException:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise
    with STATE_LOCK:
        STATE_VERSION[0] += 1


def _atomic_write_text(path: Path, text: str):
    _atomic_write_bytes(path, text.encode('utf-8'))


def rule_sort_key(path: Path):
    """Sort rule paths naturally, so numbered chapters read 0, 1, 2 … 10."""
    return [int(part) if part.isdigit() else part.casefold()
            for part in re.split(r'(\d+)', path.as_posix())]


def iter_rule_files():
    """Nested markdown under rules/. Slug is relative path with / → --."""
    if not RULES_DIR.exists():
        return
    for f in sorted(RULES_DIR.rglob('*.md'), key=lambda p: rule_sort_key(p.relative_to(RULES_DIR))):
        if not f.is_file():
            continue
        if f.name.lower() == 'readme.md':
            continue
        rel = f.relative_to(RULES_DIR).as_posix()
        if not rel.endswith('.md'):
            continue
        yield f, rel[:-3].replace('/', '--')


def rule_file_for_slug(slug: str):
    rel = slug.replace('--', '/') + '.md'
    p = (RULES_DIR / rel).resolve()
    try:
        p.relative_to(RULES_DIR.resolve())
    except ValueError:
        return None
    return p if p.is_file() else None

HEROES_HEADERS = ['Slug', 'Name', 'Alias', 'Player',
    'Power1', 'PowerDie1', 'Power1DisplayName', 'Power2', 'PowerDie2', 'Power2DisplayName', 'Power3', 'PowerDie3', 'Power3DisplayName', 'Power4', 'PowerDie4', 'Power4DisplayName', 'Power5', 'PowerDie5', 'Power5DisplayName', 'Power6', 'PowerDie6', 'Power6DisplayName',
    'Quality1', 'QualityDie1', 'Quality1DisplayName', 'Quality2', 'QualityDie2', 'Quality2DisplayName', 'Quality3', 'QualityDie3', 'Quality3DisplayName', 'Quality4', 'QualityDie4', 'Quality4DisplayName', 'Quality5', 'QualityDie5', 'Quality5DisplayName', 'Quality6', 'QualityDie6', 'Quality6DisplayName',
    'MaxHealth', 'GreenStatusDie', 'YellowStatusDie', 'RedStatusDie', 'Active', 'Origin', 'Affiliation',
    'Principle1Name', 'Principle1Roleplay', 'Principle1MinorTwist', 'Principle1MajorTwist',
    'Principle2Name', 'Principle2Roleplay', 'Principle2MinorTwist', 'Principle2MajorTwist']

VILLAINS_HEADERS = ['Slug', 'Name', 'Approach', 'Archetype',
    'Power1', 'PowerDie1', 'Power2', 'PowerDie2', 'Power3', 'PowerDie3',
    'Power4', 'PowerDie4', 'Power5', 'PowerDie5',
    'Quality1', 'QualityDie1', 'Quality2', 'QualityDie2', 'Quality3', 'QualityDie3',
    'Quality4', 'QualityDie4', 'Quality5', 'QualityDie5', 'Quality6', 'QualityDie6',
    'MaxHealth', 'GreenFloor', 'YellowFloor', 'RedFloor',
    'GreenStatusDie', 'YellowStatusDie', 'RedStatusDie',
    'Status1Label', 'Status1Die', 'Status2Label', 'Status2Die', 'Status3Label', 'Status3Die',
    'Status4Label', 'Status4Die', 'Status5Label', 'Status5Die', 'Active', 'Origin', 'Affiliation']

MINIONS_HEADERS = ['Slug', 'Name', 'Type', 'Die', 'Faction', 'PerHero', 'Active', 'Origin', 'Affiliation']
NPCS_HEADERS = ['Slug', 'Name', 'Type', 'Die', 'Faction', 'PerHero', 'Active', 'Origin', 'Affiliation']

ENVIRONMENTS_HEADERS = [
    'Slug', 'Name',
    'Trait1', 'TraitDie1', 'Trait2', 'TraitDie2', 'Trait3', 'TraitDie3',
    'Active', 'Origin',
    'GreenMinorTwist1', 'GreenMinorTwist1Description',
    'GreenMinorTwist2', 'GreenMinorTwist2Description',
    'GreenMajorTwist', 'GreenMajorTwistDescription',
    'YellowMinorTwist1', 'YellowMinorTwist1Description',
    'YellowMinorTwist2', 'YellowMinorTwist2Description',
    'YellowMajorTwist', 'YellowMajorTwistDescription',
    'RedMinorTwist1', 'RedMinorTwist1Description',
    'RedMinorTwist2', 'RedMinorTwist2Description',
    'RedMajorTwist', 'RedMajorTwistDescription',
    'MinionSlugs', 'LieutenantSlugs',
]

LOCATIONS_HEADERS = ['Slug', 'Name', 'EnvironmentSlug', 'Active']
TWISTS_HEADERS = ['Slug', 'Name', 'EffectType', 'Severity', 'Formula', 'Description']

# Generic Twist Library seed data — Creating Twists, pages 200-203. Written into
# a fresh campaign's twists.csv automatically so every campaign starts with these.
DEFAULT_TWISTS = [
    ('hinder-max-penalty', 'Penalty (Max die)', 'Hinder', 'Minor', 'Max die', 'Inflict a penalty on a hero based on the Max die.'),
    ('hinder-min-persistent', 'Persistent Penalty (Min die)', 'Hinder', 'Minor', 'Min die, persistent & exclusive', 'Inflict a persistent and exclusive penalty on a hero based on the Min die.'),
    ('hinder-lose-green', 'Lose a Green Ability', 'Hinder', 'Minor', '', 'A hero temporarily loses access to one of their Green abilities.'),
    ('hinder-reduce-die', 'Power/Quality Reduced', 'Hinder', 'Minor', '', "One of the hero's powers or qualities is temporarily reduced in die size."),
    ('hinder-maxmin-persistent', 'Persistent Penalty (Max+Min)', 'Hinder', 'Major', 'Max+Min dice, persistent & exclusive', 'Inflict a penalty on a hero based on the Max+Min dice, persistent and exclusive.'),
    ('hinder-location-wide', 'Location-Wide Penalty', 'Hinder', 'Major', 'Max die', "Inflict a penalty on all heroes in the same location based on the hero's Max die."),
    ('hinder-lose-multiple', 'Lose Multiple Abilities', 'Hinder', 'Major', '', 'A hero temporarily loses access to a number of their abilities.'),
    ('hinder-lose-power', 'Lose a Power/Quality', 'Hinder', 'Major', '', 'The hero temporarily loses access to one or more of their powers or qualities.'),
    ('boost-enemy-max', 'Enemy Bonus (Max die)', 'Boost (Enemies)', 'Minor', 'Max die', 'Grant a bonus to a villain or group of minions/lieutenants based on the Max die.'),
    ('boost-enemy-min-persistent', 'Persistent Enemy Bonus (Min die)', 'Boost (Enemies)', 'Minor', 'Min die, persistent & exclusive', 'Grant a persistent and exclusive bonus to a villain or group of minions/lieutenants based on the Min die.'),
    ('boost-upgrade-villain-die', 'Upgrade Villain Die', 'Boost (Enemies)', 'Minor', '', "Upgrade a villain's power or quality die temporarily."),
    ('boost-enemy-maxmin-persistent', 'Persistent Enemy Bonus (Max+Min)', 'Boost (Enemies)', 'Major', 'Max+Min dice, persistent & exclusive', 'Grant a bonus to a villain or group of minions/lieutenants based on the Max+Min dice, persistent and exclusive.'),
    ('boost-all-enemies', 'All Enemies Bonus', 'Boost (Enemies)', 'Major', 'Max die', "Grant a bonus to all villains/minions/lieutenants based on the hero's Max die."),
    ('boost-upgrade-all-villain-dice', 'Upgrade All Villain Dice', 'Boost (Enemies)', 'Major', '', "Upgrade all of a villain's power or quality dice temporarily."),
    ('damage-hero-mid', 'Damage to Hero (Mid die)', 'Damage (Allies)', 'Minor', 'Mid die', 'Deal damage to a hero based on the Mid die.'),
    ('damage-location-min', 'Location-Wide Damage (Min die)', 'Damage (Allies)', 'Minor', 'Min die', 'Deal damage to all heroes in the same location based on the Min die.'),
    ('damage-hero-maxmin', 'Damage to Hero (Max+Min)', 'Damage (Allies)', 'Major', 'Max+Min dice', 'Deal damage to a hero based on the Max+Min dice.'),
    ('damage-location-mid', 'Location-Wide Damage (Mid die)', 'Damage (Allies)', 'Major', 'Mid die', 'Deal damage to all heroes in the same location based on the Mid die.'),
    ('damage-scene-wide', 'Scene-Wide Damage', 'Damage (Allies)', 'Major', 'Mid die', 'Deal damage to all characters (heroes, minions, bystanders, etc.) in the scene based on the Mid die.'),
    ('defend-enemy-max', 'Defend an Enemy (Max die)', 'Defend (Enemies)', 'Minor', 'Max die', 'Defend a nearby villain or single minion/lieutenant with the Max die.'),
    ('defend-enemy-midmax', 'Defend an Enemy (Mid+Max)', 'Defend (Enemies)', 'Major', 'Mid+Max dice', 'Defend a nearby villain or single minion/lieutenant with the Mid+Max dice.'),
    ('defend-all-enemies', 'Defend All Enemies', 'Defend (Enemies)', 'Major', 'Max die', 'Defend all nearby enemies with the Max die.'),
    ('threats-minor', 'Add Threats (Minor)', 'Add Threats', 'Minor', 'Quantity = Min die', 'Add a quantity of hostile or neutral threats equal to the Min die of the roll that caused the twist.'),
    ('threats-major', 'Add Threats (Major)', 'Add Threats', 'Major', 'Quantity = Mid die', 'Add a quantity of hostile or neutral threats equal to the Mid die of the roll that caused the twist.'),
    ('create-challenge', 'Piggyback a New Challenge', 'Create Challenge', 'Any', '', "Introduce a new challenge building on what the hero just accomplished. Never invalidates the original success -- twists add cost, they don't remove wins."),
    ('advance-tracker', 'Advance the Scene Tracker', 'Advance Scene Tracker', 'Any', '', 'Move the Scene Tracker forward as an effect of the twist.'),
    ('combination', 'Combine Twist Types', 'Combination', 'Any', '', 'Mix two or more twist types for a bigger moment, e.g. Hinder with the Max die while also adding minions equal to the Min die. Especially good for mixing story twists with mechanical ones.'),
    ('story-difficult-choice', 'Difficult Choice', 'Story Consequence', 'Any', '', 'The heroes must make a difficult choice.'),
    ('story-bargain', 'Bargain Something Away', 'Story Consequence', 'Any', '', 'The heroes must bargain something away.'),
    ('story-trap', 'Fall Into a Trap', 'Story Consequence', 'Any', '', 'The heroes fall into a trap.'),
    ('story-separated', 'Separated', 'Story Consequence', 'Any', '', 'The heroes are separated from each other.'),
    ('story-sacrifice', 'Sacrifice Something Important', 'Story Consequence', 'Any', '', 'The heroes must sacrifice something important.'),
    ('story-identity-risk', 'Identity at Risk', 'Story Consequence', 'Any', '', 'The heroes are in danger of revealing their identity.'),
    ('story-wrong-about-ally', 'Wrong About an Ally', 'Story Consequence', 'Any', '', 'The heroes discover they were wrong about an ally.'),
    ('meanwhile-secret', 'Villain Discovers a Secret', 'Story Complication (Later)', 'Any', '', 'Meanwhile: a villain discovers your treasured secret.'),
    ('meanwhile-resource', 'Resource in Danger', 'Story Complication (Later)', 'Any', '', 'Meanwhile: one of your resources is in danger.'),
    ('meanwhile-betrayal', 'Ally Contemplates Betrayal', 'Story Complication (Later)', 'Any', '', 'Meanwhile: a trusted ally contemplates betrayal.'),
    ('meanwhile-base-found', 'Kid Finds Your Base', 'Story Complication (Later)', 'Any', '', 'Meanwhile: a kid stumbles across the entrance to your base.'),
    ('meanwhile-life-event', 'Missed Life Event', 'Story Complication (Later)', 'Any', '', 'Meanwhile: you miss an important life event.'),
    ('meanwhile-weakness-exposed', 'Reporter Learns a Weakness', 'Story Complication (Later)', 'Any', '', 'Meanwhile: a reporter learns your embarrassing weakness.'),
    ('meanwhile-watched', 'Watched from Unseen Cameras', 'Story Complication (Later)', 'Any', '', 'Meanwhile: someone watches from unseen cameras.'),
    ('meanwhile-foes-ally', 'Old Foes Ally', 'Story Complication (Later)', 'Any', '', 'Meanwhile: old foes of yours make an alliance.'),
    ('meanwhile-plot-progresses', 'Enemy Plot Progresses', 'Story Complication (Later)', 'Any', '', "Meanwhile: an enemy progresses their plot."),
    ('meanwhile-vehicle-sabotaged', 'Vehicle Sabotaged', 'Story Complication (Later)', 'Any', '', 'Meanwhile: someone sabotages your vehicle.'),
]

ABILITIES_HEADERS = ['Slug', 'Zone', 'Name', 'DisplayName', 'Type', 'GameText', 'RollType', 'DieSource', 'EffectDieHint', 'Mode']

CSV_FILES = {'heroes': ('players.csv', HEROES_HEADERS),
             'villains': ('villains.csv', VILLAINS_HEADERS),
             'minions': ('minions.csv', MINIONS_HEADERS),
             'npcs': ('npcs.csv', NPCS_HEADERS),
             'environments': ('environments.csv', ENVIRONMENTS_HEADERS),
             'locations': ('locations.csv', LOCATIONS_HEADERS),
             'twists': ('twists.csv', TWISTS_HEADERS),
             'abilities': ('abilities.csv', ABILITIES_HEADERS)}

STATIC_FILES = {
    '/': ('index.html', 'text/html; charset=utf-8'),
    '/index.html': ('index.html', 'text/html; charset=utf-8'),
    '/display.html': ('display.html', 'text/html; charset=utf-8'),
    '/style.css': ('style.css', 'text/css; charset=utf-8'),
    '/app.js': ('app.js', 'application/javascript; charset=utf-8'),
    '/display.js': ('display.js', 'application/javascript; charset=utf-8'),
    '/collection-picker.js': ('collection-picker.js', 'application/javascript; charset=utf-8'),
    '/builder.html': ('builder.html', 'text/html; charset=utf-8'),
    '/villain-builder.html': ('villain-builder.html', 'text/html; charset=utf-8'),
    '/builder-hub.html': ('builder-hub.html', 'text/html; charset=utf-8'),
    '/issue-builder.html': ('issue-builder.html', 'text/html; charset=utf-8'),
    '/minion-builder.html': ('minion-builder.html', 'text/html; charset=utf-8'),
    '/environment-builder.html': ('environment-builder.html', 'text/html; charset=utf-8'),
    '/scene-layout-builder.html': ('scene-layout-builder.html', 'text/html; charset=utf-8'),
    '/player-sheet.html': ('player-sheet.html', 'text/html; charset=utf-8'),
}

IMAGE_EXT_BY_CONTENT_TYPE = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/gif': 'gif',
}
CONTENT_TYPE_BY_EXT = {v: k for k, v in IMAGE_EXT_BY_CONTENT_TYPE.items()}

# Vendored offline assets (local PapaParse, local Google Fonts) -- served generically
# by extension so adding another vendored file never needs another server.py edit.
VENDOR_DIR = APP_DIR / 'vendor'
VENDOR_CONTENT_TYPE_BY_EXT = {
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
}


def default_scene(name='New Scene'):
    return {
        "name": name,
        "difficulty": "Moderate",
        "tracker": {"stars": (["green"] * 2 + ["yellow"] * 4 + ["red"] * 2), "position": 0},
        "locations": [
            {"id": "loc1", "name": "Main Location", "background": None},
        ],
        "environment": None,
        "challenges": [],
        "tokens": [],
        "gmNotes": "",
        "activityLog": [],
        "round": 1,
    }


def campaign_display_name(campaign: Path) -> str:
    """Label from campaign/campaign.json — not the folder basename."""
    meta = campaign / 'campaign.json'
    system, setting = 'SCRPG', campaign.name
    if meta.exists():
        try:
            data = json.loads(meta.read_text(encoding='utf-8'))
            system = (data.get('system') or data.get('game') or system).strip() or system
            setting = (data.get('setting') or data.get('name') or setting).strip() or setting
        except Exception:
            pass
    return f'{system}: {setting}'


def ensure_campaign(campaign: Path):
    campaign.mkdir(parents=True, exist_ok=True)
    for kind in ('heroes', 'villains', 'minions', 'environments'):
        (campaign / 'md' / kind).mkdir(parents=True, exist_ok=True)
    for kind, (fname, headers) in CSV_FILES.items():
        p = campaign / fname
        if not p.exists():
            if kind == 'twists':
                import csv as _csv
                with open(p, 'w', newline='', encoding='utf-8') as f:
                    w = _csv.writer(f)
                    w.writerow(TWISTS_HEADERS)
                    for slug, name, effect, sev, formula, desc in DEFAULT_TWISTS:
                        w.writerow([slug, name, effect, sev, formula, desc])
            else:
                p.write_text(','.join(headers) + '\r\n', encoding='utf-8')
    (campaign / 'scenes').mkdir(parents=True, exist_ok=True)
    (campaign / 'issues').mkdir(parents=True, exist_ok=True)
    (campaign / 'collections').mkdir(parents=True, exist_ok=True)
    (campaign / 'backgrounds').mkdir(parents=True, exist_ok=True)
    meta = campaign / 'backgrounds' / '_meta.json'
    if not meta.exists():
        meta.write_text('{}', encoding='utf-8')
    active = campaign / 'active_scene.json'
    if not active.exists():
        active.write_text(json.dumps({"slug": None}), encoding='utf-8')
    ident = campaign / 'campaign.json'
    if not ident.exists():
        ident.write_text(json.dumps({'system': 'SCRPG', 'setting': campaign.name}, indent=2) + '\n', encoding='utf-8')
    # migrate a pre-Scenes v1 scene.json into the new Scenes system, if present
    legacy = campaign / 'scene.json'
    if legacy.exists() and not any((campaign / 'scenes').glob('*.json')):
        try:
            old = json.loads(legacy.read_text(encoding='utf-8'))
            migrated = default_scene('Migrated Scene')
            migrated['locations'] = [{"id": l["id"], "name": l["name"], "background": None} for l in old.get('locations', [])] or migrated['locations']
            migrated['tokens'] = old.get('tokens', [])
            (campaign / 'scenes' / 'migrated-scene.json').write_text(json.dumps(migrated, indent=2), encoding='utf-8')
            active.write_text(json.dumps({"slug": "migrated-scene"}), encoding='utf-8')
        except Exception:
            pass


def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except Exception:
        return '127.0.0.1'
    finally:
        s.close()


_SLUG_RE = re.compile(r'[^a-z0-9]+')
_SAFE_SLUG_RE = re.compile(r'^[a-z0-9][a-z0-9-]{0,120}$')


def slugify(name: str) -> str:
    s = _SLUG_RE.sub('-', (name or '').strip().lower()).strip('-')
    s = s or 'unnamed'
    return s[:120]


def is_safe_slug(slug: str) -> bool:
    """Reject path-injection and multi-line CSV debris used as filenames."""
    return bool(slug) and bool(_SAFE_SLUG_RE.match(slug))


def _csv_fieldnames(path: Path):
    if not path.exists() or not path.read_text(encoding='utf-8').strip():
        return []
    with path.open(newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f).fieldnames or [])


def _csv_rows(path: Path, headers):
    if not path.exists() or not path.read_text(encoding='utf-8').strip():
        return []
    with path.open(newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    # Clean up legacy "Green/Yellow" zone values in abilities (book shorthand for
    # "this ability's zone is chosen between Green and Yellow at build time" — the
    # actual zone is Green; the app's gyro filter + CSS can only handle real zones).
    # Also migrate legacy HeroSlug → Slug on abilities.csv.
    if path.name == 'abilities.csv':
        for r in rows:
            if 'Zone' in (headers or []) and (r.get('Zone') or '') == 'Green/Yellow':
                r['Zone'] = 'Green'
            if not (r.get('Slug') or '').strip() and (r.get('HeroSlug') or '').strip():
                r['Slug'] = r.get('HeroSlug') or ''
            if 'HeroSlug' in r and 'Slug' in (headers or []):
                r.pop('HeroSlug', None)
    return rows


def _union_headers(*groups):
    out = []
    for group in groups:
        for h in group or []:
            if h and h not in out:
                out.append(h)
    return out


def _write_csv_raw(path: Path, headers, rows):
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=headers, extrasaction='ignore', lineterminator='\n')
    w.writeheader()
    for row in rows:
        w.writerow({h: '' if row.get(h) is None else str(row.get(h, '')) for h in headers})
    _atomic_write_text(path, buf.getvalue())


def _write_csv(path: Path, headers, rows):
    """Write canonical headers plus any extra columns already on disk, by Slug."""
    with STATE_LOCK:  # read-extras → merge → write is one critical section
        extras = _csv_fieldnames(path)
        old = {r.get('Slug'): r for r in _csv_rows(path, None)}
        fieldnames = _union_headers(headers, extras)
        merged = []
        for row in rows:
            prev = old.get(row.get('Slug')) or {}
            out = {}
            for h in fieldnames:
                if h in headers:
                    val = row.get(h, '')
                    out[h] = '' if val is None else str(val)
                else:
                    out[h] = prev.get(h, '') or ''
            merged.append(out)
        _write_csv_raw(path, fieldnames, merged)


def merge_json_put(path: Path, body: str) -> str:
    """Keep keys the client omitted so a partial PUT cannot strip fields.
    Read-merge runs under STATE_LOCK; callers write the returned text with
    _atomic_write_text while still inside the same lock (RLock, re-entrant) —
    see merged_json_put_write() which does both as one transaction."""
    incoming = json.loads(body or '{}')
    if not isinstance(incoming, dict):
        return body
    with STATE_LOCK:
        if path.exists():
            try:
                existing = json.loads(path.read_text(encoding='utf-8'))
            except Exception:
                existing = None
            if isinstance(existing, dict):
                for k, v in existing.items():
                    if k not in incoming:
                        incoming[k] = v
        return json.dumps(incoming, indent=2)


def merged_json_put_write(path: Path, body: str) -> str:
    """merge_json_put + atomic write as ONE critical section — this is the
    form every route must use; a merge and its write must never be split
    across two lock acquisitions or a concurrent PUT can be lost."""
    with STATE_LOCK:
        merged = merge_json_put(path, body)
        _atomic_write_text(path, merged)
        return merged


def put_csv(path: Path, canonical_headers, body: str):
    """Library PUT: keep columns the client omitted, matched by Slug."""
    with STATE_LOCK:  # read-old → merge → write is one critical section
        reader = csv.DictReader(io.StringIO(body or ''))
        incoming_fields = list(reader.fieldnames or [])
        incoming = list(reader)
        old = {r.get('Slug'): r for r in _csv_rows(path, None)}
        fieldnames = _union_headers(canonical_headers, _csv_fieldnames(path), incoming_fields)
        incoming_set = set(incoming_fields)
        merged = []
        for row in incoming:
            prev = old.get(row.get('Slug')) or {}
            out = {}
            for h in fieldnames:
                if h in incoming_set:
                    val = row.get(h, '')
                    out[h] = '' if val is None else str(val)
                else:
                    out[h] = prev.get(h, '') or ''
            merged.append(out)
        _write_csv_raw(path, fieldnames, merged)


# ---------------- Player Sheets (keys / notes / alerts / activity) ----------------
#
# Player digital character sheets live on a separate surface (player-sheet.html)
# authenticated by a per-hero secret key. Player actions NEVER go through scene
# PUTs (a second writer would clobber the GM console's full-replace saves) —
# they go through dedicated endpoints here. See docs/PLAYER_SHEETS_PLAN.md.

SHEET_ACTIVITY_MAX = 500


def _load_json_file(path: Path, default):
    if not path.exists():
        return default
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        return data
    except Exception:
        return default


def _save_json_file(path: Path, data):
    with STATE_LOCK:
        _atomic_write_text(path, json.dumps(data, indent=2))


def generate_sheet_key() -> str:
    return secrets.token_urlsafe(24)


def sheet_key_for(campaign: Path, hero: str) -> str:
    keys = _load_json_file(campaign / 'sheet-keys.json', {})
    return str(keys.get(hero) or '') if isinstance(keys, dict) else ''


def sheet_key_valid(campaign: Path, hero: str, key: str) -> bool:
    """Constant-shape check: a missing hero yields an empty stored key, so an
    attacker-presented key can never match it; empty supplied keys fail too."""
    if not hero or not key:
        return False
    return secrets.compare_digest(sheet_key_for(campaign, hero), str(key))


def record_sheet_activity(campaign: Path, hero: str, action: str, detail: str = ''):
    """Append a player-initiated action to the GM's Sheets change feed."""
    path = campaign / 'sheet_activity.json'
    with STATE_LOCK:  # read → append → cap → write is one critical section
        data = _load_json_file(path, [])
        if not isinstance(data, list):
            data = []
        data.append({
            'ts': datetime.now().isoformat(timespec='seconds'),
            'hero': hero,
            'action': str(action or ''),
            'detail': str(detail or ''),
        })
        if len(data) > SHEET_ACTIVITY_MAX:
            data = data[-SHEET_ACTIVITY_MAX:]
        _save_json_file(path, data)


# ---- Pending location moves (Phase 3): staged for GM approval ----
#
# Player-sheet "Request Move" creates an entry here; the GM approves or denies
# it from the Sheets menu (or the Board sidebar prompt) and ONLY the approval
# mutates the scene JSON — the reveal-gating decision in
# docs/PLAYER_SHEETS_PLAN.md. Stored as a campaign JSON file, NOT inside the
# scene: the GM Console's full-replace scene saves come from browser memory
# (the known GM-poll caveat) and would silently wipe a queue entry stored in
# the scene. Same dedicated-file pattern as hero_points.json / sheet-keys.json.
PENDING_MOVES_MAX = 100


def pending_moves_store(campaign: Path) -> list:
    data = _load_json_file(campaign / 'pending_moves.json', [])
    if not isinstance(data, list):
        return []
    return [m for m in data if isinstance(m, dict)]


def save_pending_moves(campaign: Path, moves: list):
    if len(moves) > PENDING_MOVES_MAX:
        moves = moves[-PENDING_MOVES_MAX:]
    _save_json_file(campaign / 'pending_moves.json', moves)


def apply_player_move_request(campaign: Path, hero: str, payload: dict) -> tuple:
    """Stage a location move for GM approval (key already checked by the route).
    EVERY sheet-initiated move to a different location stages — the plan's
    reveal gating has no empty/unowned exception; same-location and unknown
    destinations are refused. Scene JSON is NOT touched here. A new request
    replaces the hero's existing pending one (newest intent wins)."""
    with STATE_LOCK:
        row = hero_csv_row(campaign, hero)
        if row is None:
            return 404, {'error': 'hero not found'}
        scene, _spath = load_active_scene(campaign)
        if scene is None:
            return 400, {'error': 'no active scene'}
        active = _load_json_file(campaign / 'active_scene.json', {})
        scene_slug = str(active.get('slug') or '') if isinstance(active, dict) else ''
        tok = next((t for t in scene.get('tokens') or []
                    if t.get('kind') == 'hero' and (t.get('slug') or '').strip() == hero), None)
        if tok is None:
            return 400, {'error': 'hero not on board'}
        if tok.get('ko'):
            return 400, {'error': 'hero is out'}
        if hero_mode_for(campaign, hero, tok).get('immobile'):
            return 400, {'error': 'your current mode prevents movement'}
        to_id = str(payload.get('toLocationId') or '').strip()
        to_loc = next((l for l in scene.get('locations') or [] if l.get('id') == to_id), None)
        if to_loc is None:
            return 400, {'error': 'unknown location'}
        cur_id = tok.get('locationId')
        if cur_id == to_id:
            return 400, {'error': 'you are already in that location'}
        cur_loc = next((l for l in scene.get('locations') or [] if l.get('id') == cur_id), None)
        entry = {
            'id': 'pmove-' + secrets.token_hex(4),
            'ts': datetime.now().isoformat(timespec='seconds'),
            'hero': hero,
            'sceneSlug': scene_slug,
            'from': {'id': cur_id, 'name': (cur_loc or {}).get('name') or ''},
            'to': {'id': to_id, 'name': (to_loc or {}).get('name') or ''},
        }
        moves = [m for m in pending_moves_store(campaign) if m.get('hero') != hero]
        moves.append(entry)
        save_pending_moves(campaign, moves)
        record_sheet_activity(campaign, hero, 'Location move requested',
                              (entry['from']['name'] or 'Unplaced') + ' → ' + entry['to']['name']
                              + ' (awaiting GM approval)')
        return 200, {'ok': True, 'pending': entry}


def resolve_pending_move(campaign: Path, move_id: str, decision: str) -> tuple:
    """GM approve/deny of a staged location move. Approval mutates the token's
    locationId in the ACTIVE scene and logs the board Activity Log 'Move' entry
    (same shape as the GM board's moveToken) inside the same critical section
    that removes the queue entry. A stale request (its scene no longer active)
    is refused and kept for manual denial; a dead token or destination is
    dropped from the queue automatically. Denial never touches scene JSON."""
    if decision not in ('approve', 'deny'):
        return 400, {'error': 'op must be approve or deny'}
    with STATE_LOCK:
        moves = pending_moves_store(campaign)
        entry = next((m for m in moves if m.get('id') == move_id), None)
        if entry is None:
            return 400, {'error': 'no such pending move'}
        hero = str(entry.get('hero') or '')
        feed_from = (entry.get('from') or {}).get('name') or 'Unplaced'
        feed_to = (entry.get('to') or {}).get('name') or '?'
        feed_pair = feed_from + ' → ' + feed_to

        def drop_entry():
            save_pending_moves(campaign, [m for m in moves if m.get('id') != move_id])

        # Deny always resolves — it never touches scene JSON, so staleness does
        # not matter (an approve after a scene change is what needs refusal).
        if decision == 'deny':
            drop_entry()
            record_sheet_activity(campaign, hero, 'Location move denied', feed_pair)
            return 200, {'ok': True, 'decision': 'deny'}
        active = _load_json_file(campaign / 'active_scene.json', {})
        scene_slug = str(active.get('slug') or '') if isinstance(active, dict) else ''
        if scene_slug != entry.get('sceneSlug'):
            return 409, {'error': 'move request is stale — its scene is no longer active; deny it manually'}
        scene, spath = load_active_scene(campaign)
        if scene is None:
            return 400, {'error': 'no active scene'}
        tok = next((t for t in scene.get('tokens') or []
                    if t.get('kind') == 'hero' and (t.get('slug') or '').strip() == hero), None)
        if tok is None:
            drop_entry()
            return 400, {'error': 'hero token no longer on the board — request dropped'}
        to_loc = next((l for l in scene.get('locations') or []
                       if l.get('id') == (entry.get('to') or {}).get('id')), None)
        if to_loc is None:
            drop_entry()
            return 400, {'error': 'destination no longer exists — request dropped'}
        if decision == 'approve':
            tok['locationId'] = entry['to']['id']
            log_scene_activity(scene, actor_ref(tok), 'Move', {'name': feed_to},
                               str(tok.get('name')) + ' moved from ' + feed_from + ' to ' + feed_to
                               + ' (approved from their sheet)',
                               {'from': feed_from, 'to': feed_to,
                                'fromId': (entry.get('from') or {}).get('id'),
                                'toId': entry['to']['id'],
                                'approvedFromSheet': True},
                               counts_as_turn=False)
            _atomic_write_text(spath, json.dumps(scene, indent=2))
            feed_action = 'Location move approved'
        else:
            feed_action = 'Location move denied'
        drop_entry()
        record_sheet_activity(campaign, hero, feed_action, feed_pair)
        return 200, {'ok': True, 'decision': decision}


def sheet_notes_path(campaign: Path, hero: str) -> Path | None:
    if not is_safe_slug(hero):
        return None
    return campaign / 'sheet_notes' / (hero + '.md')


def current_issue_slug(campaign: Path) -> str:
    """Issue that owns the active scene (sceneSlugs membership), else ''."""
    active = _load_json_file(campaign / 'active_scene.json', {})
    scene = str(active.get('slug') or '') if isinstance(active, dict) else ''
    if not scene:
        return ''
    for f in sorted((campaign / 'issues').glob('*.json')):
        try:
            data = json.loads(f.read_text(encoding='utf-8'))
        except Exception:
            continue
        if scene in (data.get('sceneSlugs') or []):
            return f.stem
    return ''


def hero_point_store(campaign: Path) -> dict:
    data = _load_json_file(campaign / 'hero_points.json', {})
    return data if isinstance(data, dict) else {}


def npc_type_for(campaign: Path, slug: str) -> str:
    """NPC sheet Type (Bystander/Minion/Lieutenant/Hero) from npcs.csv."""
    if not slug:
        return ''
    for r in _csv_rows(campaign / 'npcs.csv', NPCS_HEADERS):
        if (r.get('Slug') or '').strip() == slug:
            return (r.get('Type') or '').strip()
    return ''


def hero_modes_md(campaign: Path, hero: str) -> list:
    """Structured ## Modes JSON from the hero's markdown (empty list if none)."""
    if not is_safe_slug(hero):
        return []
    p = campaign / 'md' / 'heroes' / (hero + '.md')
    if not p.exists():
        return []
    m = re.search(r'##\s*Modes\s*\n+```json\n([\s\S]*?)```', p.read_text(encoding='utf-8'))
    if not m:
        return []
    try:
        arr = json.loads(m.group(1))
        return arr if isinstance(arr, list) else []
    except Exception:
        return []


def die_label(value) -> str:
    """Normalize a stored die to 'dN' — tokens store plain numbers (6, not d6)."""
    s = str(value or '').strip()
    if not s:
        return ''
    if s[0] in 'dD':
        return 'd' + s[1:]
    if s.isdigit():
        return 'd' + s
    return s


def pending_mods_payload(scene, hero: str) -> list:
    """Boost/Hinder mods waiting on this hero's decision, with the creator's
    name resolved so the sheet can show the full creator → affected path."""
    if not scene:
        return []
    my = next((t for t in scene.get('tokens') or []
               if t.get('kind') == 'hero' and (t.get('slug') or '').strip() == hero), None)
    if my is None:
        return []
    out = []
    for m in pending_mods_for(scene, my.get('id')):
        creator = next((t for t in scene.get('tokens') or []
                        if t.get('id') == m.get('creatorId')), None)
        out.append({
            'id': m.get('id'),
            'kind': m.get('kind'),
            'value': m.get('value'),
            'uses': int(m.get('uses') or 1),
            'twist': m.get('twist') or '',
            'creator': (creator or {}).get('name') or 'Unknown',
        })
    return out


def bhd_display_totals(scene, token) -> dict:
    """Mirror of the board's bhdTotals/bhdDisplay (app.js + display.js): mods
    the token CREATED count toward its Boost/Hinder boxes, Defend mods sitting
    ON the token count toward Defend, then the token's manual bhdDelta on top.
    The sheet header must show the same numbers the board and PD show."""
    mods = ensure_scene_mods(scene)
    tid = token.get('id')
    boost = sum(int(m.get('value') or 0) for m in mods
                if not m.get('consumed') and m.get('kind') == 'boost'
                and m.get('creatorId') == tid)
    hinder = sum(int(m.get('value') or 0) for m in mods
                 if not m.get('consumed') and m.get('kind') == 'hinder'
                 and m.get('creatorId') == tid)
    defend = sum(int(m.get('value') or 0) for m in mods
                 if not m.get('consumed') and m.get('kind') == 'defend'
                 and m.get('targetId') == tid)
    d = token.get('bhdDelta') or {}
    return {
        'boost': max(0, boost + (int(d.get('boost') or 0))),
        'hinder': max(0, hinder + (int(d.get('hinder') or 0))),
        'defend': max(0, defend + (int(d.get('defend') or 0))),
    }


def token_display_name(t: dict, tokens: list) -> str:
    """Minions are numbered per name ("Thug #2") so players can target the
    right one from their sheets. Mirrors tokenDisplayName() in app.js/display.js:
    spawnIndex is stamped at spawn time; legacy tokens fall back to the lowest
    index not already used by a stamped peer."""
    name = str(t.get('name') or '')
    if t.get('kind') != 'minion':
        return name
    peers = [x for x in tokens
             if x.get('kind') == 'minion' and str(x.get('name') or '') == name]
    # Walk peers in board order; each takes the lowest index not already used
    # by a stamped peer OR an earlier fallback assignment. This is what keeps
    # two unstamped same-name minions from both claiming "#1".
    used = set()
    assigned = {}
    for x in peers:
        try:
            n = int(x.get('spawnIndex'))
        except (TypeError, ValueError):
            n = 0
        if n <= 0 or n in used:
            n = 1
            while n in used:
                n += 1
        used.add(n)
        assigned[str(x.get('id') or '')] = n
    return f"{name} #{assigned.get(str(t.get('id') or ''), 0) or (min(set(range(1, len(peers) + 2)) - used, default=1))}"


def visible_combatants(campaign: Path, scene: dict) -> list:
    """Round-track scope (mirrors livingCombatants() in app.js): living
    combatants that are not Bystander NPCs and are IN VIEW — in a location
    occupied by at least one PC hero. Tokens alone in another location are
    off-screen and don't gate the round."""
    tokens = scene.get('tokens') or []
    pc_slugs = {(r.get('Slug') or '').strip()
                for r in _csv_rows(campaign / 'players.csv', HEROES_HEADERS)}
    hero_locs = {t.get('locationId') or '' for t in tokens
                 if t.get('kind') == 'hero' and not t.get('ko')
                 and (t.get('slug') or '').strip() in pc_slugs}
    return [t for t in tokens
            if not t.get('ko')
            and t.get('kind') in ('hero', 'villain', 'minion', 'lieutenant')
            and npc_type_for(campaign, str(t.get('slug') or '')) != 'Bystander'
            and (t.get('locationId') or '') in hero_locs]


def player_sheet_payload(campaign: Path, hero: str) -> dict | None:
    """Full read-only sheet payload for one hero — everything the player device
    may see. Hiding rules mirror the Player Display: no villain health numbers,
    no GM notes / twist text / challenge solutions."""
    hero_path = campaign / 'players.csv'
    row = next((r for r in _csv_rows(hero_path, HEROES_HEADERS)
                if (r.get('Slug') or '').strip() == hero), None)
    if row is None:
        return None

    # Abilities from the CSV ability layer (same source as the GM board).
    abilities = [r for r in _csv_rows(campaign / 'abilities.csv', ABILITIES_HEADERS)
                 if (r.get('Slug') or '').strip() == hero]

    # Active scene + the hero's token → their location and its occupants.
    scene = None
    active = _load_json_file(campaign / 'active_scene.json', {})
    scene_slug = str(active.get('slug') or '') if isinstance(active, dict) else ''
    if scene_slug and is_safe_slug(scene_slug):
        p = campaign / 'scenes' / (scene_slug + '.json')
        if p.exists():
            try:
                scene = json.loads(p.read_text(encoding='utf-8'))
            except Exception:
                scene = None

    my_token = None
    location = None
    occupants = []
    if scene:
        for t in scene.get('tokens') or []:
            if t.get('slug') == hero or (t.get('kind') == 'hero' and (t.get('name') or '') == (row.get('Name') or '')):
                my_token = t
                break
        if my_token:
            loc_id = my_token.get('locationId')
            location = next((l for l in scene.get('locations') or [] if l.get('id') == loc_id), None)
            for t in scene.get('tokens') or []:
                if t.get('locationId') != loc_id or t.get('ko'):
                    # KO'd tokens are off the board — the Location card must
                    # not show a Bystander that isn't there anymore.
                    continue
                occ = {
                    'id': t.get('id') or '',
                    'kind': t.get('kind') or '',
                    'slug': t.get('slug') or '',
                    'name': token_display_name(t, scene.get('tokens') or []),
                    'currentDie': die_label(t.get('currentDie')),
                    'ko': bool(t.get('ko')),
                    # NPC type (Bystander/Minion/Lieutenant/Hero) — looked up for
                    # ANY token whose slug is in npcs.csv, because bystander NPC
                    # tokens carry kind 'minion' on the board. Drives the sheet's
                    # occupant sorting and target filtering.
                    'npcType': npc_type_for(campaign, str(t.get('slug') or '')),
                }
                if t.get('kind') == 'hero':
                    occ['currentHealth'] = t.get('currentHealth')
                    occ['maxHealth'] = t.get('maxHealth')
                elif (t.get('kind') or '') in ('minion', 'lieutenant'):
                    # Minion/Lt health shows on the PD; villain numbers never do.
                    occ['currentHealth'] = t.get('currentHealth')
                    occ['maxHealth'] = t.get('maxHealth')
                elif (t.get('kind') or '') == 'npc':
                    if occ['npcType'] in ('Minion', 'Lieutenant'):
                        occ['currentHealth'] = t.get('currentHealth')
                        occ['maxHealth'] = t.get('maxHealth')
                occupants.append(occ)

    issue = current_issue_slug(campaign)
    hp_store = hero_point_store(campaign)
    issue_hp = hp_store.get(issue, {}) if isinstance(hp_store.get(issue, {}), dict) else {}
    my_hp = int(issue_hp.get(hero) or 0)
    issue_total = sum(int(v) or 0 for v in issue_hp.values())

    np = sheet_notes_path(campaign, hero)
    notes = np.read_text(encoding='utf-8') if np and np.exists() else ''

    # Alerts targeting this hero (or broadcast), newest last; the player client
    # decides banner vs history from dismissed.
    alerts = []
    for a in _load_json_file(campaign / 'alerts.json', []) or []:
        if not isinstance(a, dict):
            continue
        targets = a.get('targets') or 'all'
        if targets != 'all' and hero not in targets:
            continue
        dismissed = a.get('dismissed') or []
        alerts.append({
            'id': a.get('id'),
            'ts': a.get('ts'),
            'text': a.get('text') or '',
            'dismissed': hero in dismissed if isinstance(dismissed, list) else bool(dismissed),
        })

    return {
        'hero': hero,
        'row': row,
        'abilities': abilities,
        'scene': {
            'slug': scene_slug,
            'name': (scene or {}).get('name') or '',
            'round': (scene or {}).get('round') or 1,
        },
        'tracker': (scene or {}).get('tracker') or None,
        'modes': hero_modes_md(campaign, hero),
        'currentMode': str((my_token or {}).get('currentMode') or 'default'),
        'location': {'id': (location or {}).get('id'), 'name': (location or {}).get('name')},
        # Location names are already public (the PD shows the floor); occupants
        # of OTHER locations are never sent. Feeds the sheet's move-request UI.
        'sceneLocations': [{'id': l.get('id'), 'name': l.get('name')}
                           for l in (scene or {}).get('locations') or []],
        'pendingMove': next(({'id': m.get('id'), 'ts': m.get('ts'),
                              'to': (m.get('to') or {}).get('name') or '',
                              'toId': (m.get('to') or {}).get('id') or ''}
                             for m in pending_moves_store(campaign)
                             if m.get('hero') == hero and m.get('sceneSlug') == scene_slug),
                            None),
        'occupants': occupants,
        'myToken': {
            'id': (my_token or {}).get('id') or '',
            'locationId': (my_token or {}).get('locationId') or '',
            'currentHealth': (my_token or {}).get('currentHealth'),
            'maxHealth': (my_token or {}).get('maxHealth'),
            'currentDie': (my_token or {}).get('currentDie'),
            'turnNumber': (my_token or {}).get('turnNumber'),
            'bhd': bhd_display_totals(scene, my_token) if my_token else (my_token or {}).get('bhdDelta') or {},
        },
        # Round Track: which combatants have gone this round (order #) — same
        # visibility rules as the GM board's Rd Track: no Bystander NPCs, and
        # only tokens in a PC-occupied location. Names are public (the PD
        # shows them); used for the sheet's "you have/haven't gone" indicator.
        'roundTurns': [{'id': t.get('id') or '',
                        'name': token_display_name(t, scene.get('tokens') or []),
                        'turnNumber': t.get('turnNumber')}
                       for t in visible_combatants(campaign, scene or {})],
        'sceneType': str((scene or {}).get('sceneType') or ''),
        'recoverAllowed': bool(hero_has_recover_ability(abilities) or scene_is_montage(scene)),
        # Pending Boost/Hinder mods the affected hero decides when to spend
        # (creator chose this hero as the beneficiary). Creator name resolved
        # for the traceable creator → affected path on the sheet.
        'pendingMods': pending_mods_payload(scene, hero),
        'heroPoints': {
            'issue': issue,
            'mine': my_hp,
            'issueTotal': issue_total,
        },
        'notes': notes,
        'alerts': alerts,
    }


# ---------------- Player actions (Phase 2): rules math ----------------
#
# Port of the GM board's resolution math (app.js applyBoardAttack /
# applyBoardMod / applyBoardRecover / bhModValue / overcomeResult /
# assignTurnNumber / maybeEndRound) so a player action resolved here is
# identical to the same action taken on the GM board. Player actions mutate
# scene JSON in Python — NEVER a scene PUT.

DIE_LADDER = [4, 6, 8, 10, 12]

PLAYER_ACTIONS = ('Attack', 'Defend', 'Boost', 'Hinder', 'Recover', 'Overcome')


def die_size_of(value) -> int:
    s = str(value or '').strip().lower()
    if s.startswith('d'):
        s = s[1:]
    try:
        n = int(s)
    except ValueError:
        return 0
    return n if n in DIE_LADDER else 0


def degrade_die_size(size: int):
    if size not in DIE_LADDER:
        return None
    i = DIE_LADDER.index(size)
    return DIE_LADDER[i - 1] if i > 0 else None


def bh_mod_value(total: int) -> int:
    """Boost/Hinder table: 0− / 1–3 / 4–7 / 8–11 / 12+ → ±0/1/2/3/4."""
    if total <= 0:
        return 0
    if total <= 3:
        return 1
    if total <= 7:
        return 2
    if total <= 11:
        return 3
    return 4


def overcome_result_text(total: int) -> str:
    """RAW Overcome table (verified against the rulebook PDF; 12+ = no twist)."""
    if total <= 0:
        return 'Spectacular failure (0−)'
    if total <= 3:
        return 'Failure, or success with a Major Twist (1–3)'
    if total <= 7:
        return 'Success with a Minor Twist (4–7)'
    if total <= 11:
        return 'Complete success (8–11)'
    return 'Success beyond expectations (12+)'


def load_active_scene(campaign: Path):
    """(scene dict, scene path) for the active scene, or (None, None)."""
    active = _load_json_file(campaign / 'active_scene.json', {})
    slug = str(active.get('slug') or '') if isinstance(active, dict) else ''
    if not slug or not is_safe_slug(slug):
        return None, None
    p = campaign / 'scenes' / (slug + '.json')
    if not p.exists():
        return None, None
    try:
        return json.loads(p.read_text(encoding='utf-8')), p
    except Exception:
        return None, None


def hero_csv_row(campaign: Path, hero: str):
    for r in _csv_rows(campaign / 'players.csv', HEROES_HEADERS):
        if (r.get('Slug') or '').strip() == hero:
            return r
    return None


def hero_ability_rows(campaign: Path, hero: str):
    return [r for r in _csv_rows(campaign / 'abilities.csv', ABILITIES_HEADERS)
            if (r.get('Slug') or '').strip() == hero]


def scene_is_montage(scene) -> bool:
    return 'montage' in str((scene or {}).get('sceneType') or '').lower()


def hero_has_recover_ability(abilities) -> bool:
    """Recover action exists ONLY when an ability explicitly grants it."""
    return any('recover' in str(r.get('RollType') or '').lower() for r in abilities)


def hero_mode_for(campaign: Path, hero: str, token) -> dict:
    """The token's current mode info from the hero's ## Modes JSON. Default
    mode (or an unknown slug) falls back to an unlocked, non-powerless shape."""
    slug = str((token or {}).get('currentMode') or 'default')
    info = next((m for m in hero_modes_md(campaign, hero)
                 if str(m.get('slug') or '') == slug), None)
    if info is None:
        info = {'slug': slug, 'name': 'Default Mode' if slug == 'default' else slug,
                'powers': {}, 'lockedActions': [], 'powerless': False, 'immobile': False}
    return info


def mode_locked_actions(mode_info) -> set:
    """Lowercased locked basic actions for the current mode. Recover is NEVER
    mode-locked (locked decision)."""
    locked = {str(a).strip().lower() for a in (mode_info.get('lockedActions') or [])}
    locked.discard('recover')
    return locked


def power_quality_die(row, prefix: str, name: str) -> str:
    name = str(name or '').strip().lower()
    for i in range(1, 7):
        if str(row.get(prefix + str(i)) or '').strip().lower() == name:
            return row.get(prefix + 'Die' + str(i)) or ''
    return ''


def parse_die_source(text) -> str:
    """Effect-die mode from an ability's DieSource column and/or GameText:
    'max+min' | 'max' | 'min' | '' (Mid default). E.g. Unerring Strike's
    'Use your Max+Min dice' lives in GameText, not the DieSource column."""
    t = str(text or '').lower()
    if 'max' in t and 'min' in t:
        return 'max+min'
    if 'max' in t:
        return 'max'
    if 'min' in t:
        return 'min'
    return ''


def ability_bracket_dice(game_text) -> list:
    """Dice the ability text forces, e.g. 'Attack using [Awareness].'."""
    return re.findall(r'\[([^\]]+)\]', str(game_text or ''))


def ability_flags(game_text) -> dict:
    t = str(game_text or '').lower()
    return {
        'ignorePenalties': bool(re.search(r'ignore.{0,30}penalt', t)
                                or re.search(r'ignore.{0,30}defend', t)),
        'noReactions': 'cannot be affected by reactions' in t,
    }


def forced_dice_for(row, mode_info, game_text):
    """Match [Bracket] names in the ability text against the hero's real
    power/quality names. Returns (powerName|'', qualityName|'')."""
    out = ['', '']
    for name in ability_bracket_dice(game_text):
        n = name.strip().lower()
        if not out[0] and (name in (mode_info.get('powers') or {})
                           or power_quality_die(row, 'Power', n)):
            out[0] = name
        elif not out[1] and (name in (mode_info.get('powers') or {})
                             or power_quality_die(row, 'Quality', n)):
            out[1] = name
    return out[0], out[1]


def action_effect_mode(atype: str, die_source: str, game_text: str) -> str:
    """Per-action effect die mode. Priority: '<Action> using your X die'
    (Defensive Strike: Attack uses Min) → 'each using your X die' (Flexible
    Stance: both chosen actions use Min) → DieSource column → 'Use your X
    dice' in GameText (Unerring Strike) → '' (Mid)."""
    t = str(game_text or '').lower()
    m = re.search(re.escape(str(atype or '').lower()) + r'[^.]{0,40}?using your (max\+min|max|min) die', t)
    if m:
        return m.group(1)
    m = re.search(r'each using your (max\+min|max|min) die', t)
    if m:
        return m.group(1)
    ds = parse_die_source(str(die_source or ''))
    if ds:
        return ds
    m = re.search(r'use your (max\+min|max|min) dice', t)
    if m:
        return m.group(1)
    return ''


def action_choice_ability(game_text) -> bool:
    """'Take any two basic actions…' — the chosen actions are allowed even
    when the ability's RollType column is blank (e.g. choosing Recover)."""
    return bool(re.search(r'take (any|one|two)[^.]{0,30}basic action', str(game_text or '').lower()))


def effect_from_values(vals, mode: str) -> int:
    if mode == 'max+min':
        return int(vals['max']) + int(vals['min'])
    if mode == 'max':
        return int(vals['max'])
    if mode == 'min':
        return int(vals['min'])
    return int(vals['mid'])


def resolve_pool(row, token, mode_info, pool):
    """Dice-pool resolution. Returns ({min, mid, max, effect, ...}, err).
    pool['manual'] = player-entered Min/Mid/Max + Effect Die (server clamps and
    computes the outcome — entry is NOT display-only); otherwise a digital roll:
    the server rolls the hero's chosen power + quality + current status die."""
    manual = pool.get('manual') if isinstance(pool, dict) else None
    if isinstance(manual, dict):
        try:
            vals = sorted(int(manual.get(k) or 0) for k in ('min', 'mid', 'max'))
        except (TypeError, ValueError):
            return None, 'manual roll needs numeric min/mid/max'
        eff = None
        if manual.get('effect') not in (None, ''):
            try:
                eff = int(manual.get('effect'))
            except (TypeError, ValueError):
                return None, 'effect die must be a number'
        return {'min': vals[0], 'mid': vals[1], 'max': vals[2], 'effect': eff}, None
    # Digital roll — the server rolls; the client only picks WHICH dice
    # (a bracketed ability like [Awareness] forces the die server-side).
    powers = mode_info.get('powers') or {}
    pname = str((pool or {}).get('forcedPower') or (pool or {}).get('power') or '')
    qname = str((pool or {}).get('forcedQuality') or (pool or {}).get('quality') or '')
    pdie = die_size_of(powers.get(pname) or power_quality_die(row, 'Power', pname))
    qdie = die_size_of(powers.get(qname) or power_quality_die(row, 'Quality', qname))
    sdie = (die_size_of((token or {}).get('currentDie'))
            or die_size_of(row.get('GreenStatusDie')))
    if not pdie or not qdie or not sdie:
        return None, 'digital roll needs a known power and quality'
    rolls = sorted(random.randint(1, d) for d in (pdie, qdie, sdie))
    # Effect die defaults to Mid; an ability DieSource of Max/Min overrides.
    src = str((pool or {}).get('effectDie') or '').strip().lower()
    eff = rolls[2] if src == 'max' else rolls[0] if src == 'min' else rolls[1]
    return {'min': rolls[0], 'mid': rolls[1], 'max': rolls[2], 'effect': eff,
            'powerDie': 'd' + str(pdie), 'qualityDie': 'd' + str(qdie),
            'statusDie': 'd' + str(sdie)}, None


def log_scene_activity(scene, actor, action: str, target, result: str, details=None,
                       counts_as_turn: bool = True):
    """Append to the scene's activity log in the exact shape app.js
    logActivity() writes, so the board's Activity Log stays the single source."""
    if not isinstance(scene.get('activityLog'), list):
        scene['activityLog'] = []
    det = dict(details or {})
    det['countsAsTurn'] = bool(counts_as_turn)
    scene['activityLog'].append({
        'id': 'log-' + secrets.token_hex(4),
        'timestamp': time.time(),
        'round': scene.get('round') or 1,
        'actor': actor,
        'action': action,
        'target': target,
        'result': result,
        'details': det,
    })


def assign_player_turn(campaign, scene, token):
    """Port of app.js assignTurnNumber for player-initiated actions: the token
    gets the next turn number; when every living combatant has acted the round
    advances (maybeEndRound). Uses token.turnNumber as the persistent marks."""
    if not token or token.get('ko'):
        return None
    if token.get('kind') not in ('hero', 'villain', 'minion', 'lieutenant'):
        return None
    if scene.get('round') is None or (scene.get('round') or 0) < 1:
        scene['round'] = 1
    cur = token.get('turnNumber')
    if not cur:
        taken = [t.get('turnNumber') for t in scene.get('tokens') or [] if t.get('turnNumber')]
        nxt = (max([n for n in taken if isinstance(n, int)] or [0])) + 1
        token['turnNumber'] = nxt
    # maybeEndRound runs on every turn-counting action, even a repeat actor's
    # (same visibility rules as the Rd Track — no bystanders, in-view only)
    living = visible_combatants(campaign, scene)
    if living and all(t.get('turnNumber') for t in living):
        n = scene.get('round') or 1
        for t in scene.get('tokens') or []:
            t.pop('turnNumber', None)
        scene['round'] = n + 1
        log_scene_activity(scene, None, 'End of Round', None,
                           'Round ' + str(n) + ' ended', {'roundEnded': n},
                           counts_as_turn=False)
    return token.get('turnNumber')


def actor_ref(token):
    if not token:
        return None
    return {'id': token.get('id'), 'name': token.get('name'), 'kind': token.get('kind')}


def target_ref(token):
    return actor_ref(token)


def ensure_scene_mods(scene) -> list:
    if not isinstance(scene.get('mods'), list):
        scene['mods'] = []
    return scene['mods']


def pending_mods_for(scene, token_id) -> list:
    """Boost/Hinder mods the token is the beneficiary of (creator chose them as
    the affected party) that are not yet consumed — the affected character (or
    the GM for villains/minions/lieutenants) decides when each use happens."""
    return [m for m in ensure_scene_mods(scene)
            if not m.get('consumed') and m.get('targetId') == token_id
            and m.get('kind') in ('boost', 'hinder')]


def spend_player_mods(scene, token, mod_ids, kind_wanted):
    """Validate + sum mods the actor spends on one roll. Boost adds, Hinder
    subtracts. Each spend consumes one use (a two-use mod from a minor twist
    survives the first spend). Returns (delta, err)."""
    delta = 0
    ids = [str(i) for i in (mod_ids or [])]
    if len(ids) > 6:
        return 0, 'too many mods in one roll'
    mods = ensure_scene_mods(scene)
    for mid in ids:
        m = next((x for x in mods if str(x.get('id') or '') == mid), None)
        if m is None:
            return 0, 'unknown mod: ' + mid
        if m.get('targetId') != token.get('id'):
            return 0, 'mod not on this hero: ' + mid
        if m.get('consumed'):
            return 0, 'mod already used: ' + mid
        if m.get('kind') not in ('boost', 'hinder'):
            return 0, 'only Boost/Hinder mods can be spent'
        val = int(m.get('value') or 0)
        delta += val if m.get('kind') == 'boost' else -val
        if m.get('kind') == kind_wanted or kind_wanted is None:
            pass
        uses = int(m.get('uses') or 1)
        if uses > 1:
            m['uses'] = uses - 1
        else:
            m['consumed'] = True
    return delta, None


def defend_total_on(scene, token) -> int:
    """Defend mods auto-apply to incoming damage (and are consumed by it)."""
    return sum(int(m.get('value') or 0) for m in ensure_scene_mods(scene)
               if not m.get('consumed') and m.get('kind') == 'defend'
               and m.get('targetId') == token.get('id'))


def consume_defend_mods(scene, token):
    for m in ensure_scene_mods(scene):
        if (not m.get('consumed') and m.get('kind') == 'defend'
                and m.get('targetId') == token.get('id')):
            m['consumed'] = True


def apply_player_attack(scene, actor, target, dmg: int, ability_name: str, effect: int,
                        target_name=None):
    """Port of applyBoardAttack: heroes/villains lose Health; minions fail =
    defeated outright (house rule); lieutenants instant-KO at >= 2x current die,
    else step down one size. target_name = numbered display name for the result."""
    tname = str(target_name if target_name is not None else (target.get('name') if target else ''))
    result = ''
    if dmg <= 0:
        result = ability_name + ': 0 damage to ' + tname + ' (blocked)'
    elif target.get('kind') in ('hero', 'villain'):
        max_h = int(target.get('maxHealth') or 0) or int(target.get('currentHealth') or 0)
        target['currentHealth'] = max(0, (int(target.get('currentHealth') or 0)) - dmg)
        result = (ability_name + ': ' + str(dmg) + ' damage to ' + tname
                  + ' (Health ' + str(target.get('currentHealth')) + ')')
    elif target.get('kind') == 'minion':
        die = int(target.get('currentDie') or 4)
        roll = random.randint(1, max(1, die))
        failed = roll < dmg
        if failed:
            target['ko'] = True
        result = (ability_name + ': ' + str(dmg) + ' vs minion save ' + str(roll)
                  + ' — ' + ('defeated' if failed else 'held'))
    elif target.get('kind') == 'lieutenant':
        die = int(target.get('currentDie') or 4)
        if dmg >= die * 2:
            target['ko'] = True
            result = (ability_name + ': ' + str(dmg) + ' ≥ double d' + str(die)
                      + ' — instant KO')
        else:
            roll = random.randint(1, max(1, die))
            if roll < dmg:
                nxt = degrade_die_size(die)
                if nxt is None:
                    target['ko'] = True
                    result = (ability_name + ': save ' + str(roll) + ' vs ' + str(dmg)
                              + ' — defeated')
                else:
                    target['currentDie'] = nxt
                    result = (ability_name + ': save ' + str(roll) + ' vs ' + str(dmg)
                              + ' — now d' + str(nxt))
            else:
                result = (ability_name + ': save ' + str(roll) + ' vs ' + str(dmg)
                          + ' — held')
    return result


def apply_player_action(campaign: Path, hero: str, payload: dict):
    """Validate + apply one player action. Returns (http_status, response dict).
    All clamping/validation happens here; the client is never trusted.
    The entire read-mutate-write cycle runs under STATE_LOCK so a player
    action can never interleave with a GM scene save or another player's
    action (load_active_scene → mutate → spath write is one transaction)."""
    with STATE_LOCK:
        return _apply_player_action_body(campaign, hero, payload)


def _apply_player_action_body(campaign: Path, hero: str, payload: dict):
    """Worker for apply_player_action — caller must hold STATE_LOCK."""
    row = hero_csv_row(campaign, hero)
    if row is None:
        return 404, {'error': 'hero not found'}
    scene, spath = load_active_scene(campaign)
    if scene is None:
        return 400, {'error': 'no active scene'}
    tok = next((t for t in scene.get('tokens') or []
                if t.get('kind') == 'hero' and (t.get('slug') or '').strip() == hero), None)
    if tok is None:
        return 400, {'error': 'hero not on board'}

    mode_info = hero_mode_for(campaign, hero, tok)
    locked = mode_locked_actions(mode_info)
    abilities = hero_ability_rows(campaign, hero)
    mode_change = payload.get('modeChange') or {}
    mode_change_pos = str(mode_change.get('position') or '')
    if payload.get('kind') == 'emergency-switch':
        return _apply_emergency_switch(campaign, scene, spath, tok, mode_info,
                                       payload, row)
    if mode_change and mode_change_pos not in ('pre', 'post'):
        return 400, {'error': 'modeChange.position must be pre or post'}
    if mode_change:
        mc_mode = str(mode_change.get('mode') or '')
        known = {str(m.get('slug') or '').strip() for m in hero_modes_md(campaign, hero)}
        known.add('default')
        if mc_mode not in known:
            return 400, {'error': 'unknown mode'}
    actions = payload.get('actions')
    if not isinstance(actions, list) or not (1 <= len(actions) <= 3):
        return 400, {'error': 'actions must be a list of 1-3 actions'}

    def set_mode():
        tok['currentMode'] = str(mode_change.get('mode') or 'default')
        mname = next((str(m.get('name') or m.get('slug')) for m in hero_modes_md(campaign, hero)
                      if str(m.get('slug') or '') == str(mode_change.get('mode'))),
                     str(mode_change.get('mode')))
        log_scene_activity(scene, actor_ref(tok), 'Mode Change',
                           {'name': mname},
                           str(tok.get('name')) + ': mode → ' + mname
                           + ' (' + str(payload.get('abilityName') or 'Switch') + ')',
                           {'mode': str(mode_change.get('mode')),
                            'ability': payload.get('abilityName') or ''},
                           counts_as_turn=False)

    # Quick Switch 'pre': destroy one bonus on this hero, change mode, THEN act
    # in the new mode (locked ordering from commitBoardAction).
    if mode_change and mode_change_pos == 'pre':
        mods = ensure_scene_mods(scene)
        idx = next((i for i, m in enumerate(mods)
                    if m.get('kind') == 'boost' and m.get('targetId') == tok.get('id')
                    and not m.get('consumed')), None)
        if idx is not None:
            mods.pop(idx)
            log_scene_activity(scene, actor_ref(tok), 'Quick Switch',
                               {'name': tok.get('name')},
                               str(tok.get('name')) + ': destroyed one bonus on themselves (Quick Switch)',
                               {}, counts_as_turn=False)
        set_mode()

    outcomes = []
    for a in actions:
        status, resp = _apply_one_player_action(campaign, scene, tok, row, mode_info,
                                                locked, abilities, a,
                                                str(payload.get('abilityName') or ''))
        if status != 200:
            return status, resp
        outcomes.append(resp)
    if mode_change and mode_change_pos == 'post':
        set_mode()
    _atomic_write_text(spath, json.dumps(scene, indent=2))
    return 200, {'ok': True, 'outcomes': outcomes, 'round': scene.get('round') or 1,
                 'currentMode': tok.get('currentMode') or 'default'}


def _apply_emergency_switch(campaign, scene, spath, tok, mode_info, payload, row):
    """Reaction: change to any mode + take Min-die damage (entered or rolled
    from the Min die) or a minor twist."""
    modes = hero_modes_md(campaign, hero := str(tok.get('slug') or ''))
    mode = str(payload.get('mode') or '')
    known = {str(m.get('slug') or '').strip() for m in modes}
    known.add('default')
    if mode not in known:
        return 400, {'error': 'unknown mode'}
    cost = str(payload.get('cost') or 'damage')
    mname = next((str(m.get('name') or m.get('slug')) for m in modes
                  if str(m.get('slug') or '') == mode), mode)
    tok['currentMode'] = mode
    if cost == 'twist':
        cost_txt = 'took a minor twist'
    else:
        try:
            dmg = int(payload.get('damage') or 0)
        except (TypeError, ValueError):
            dmg = 0
        dmg = max(0, min(50, dmg))
        if dmg > 0:
            tok['currentHealth'] = max(0, (int(tok.get('currentHealth') or 0)) - dmg)
        cost_txt = 'took ' + str(dmg) + ' extra damage'
    log_scene_activity(scene, actor_ref(tok), 'Emergency Switch', {'name': mname},
                       str(tok.get('name')) + ': Emergency Switch → ' + mname
                       + '; ' + cost_txt, {'mode': mode}, counts_as_turn=False)
    record_sheet_activity(campaign, str(tok.get('slug') or ''), 'Emergency Switch',
                          '→ ' + mname + '; ' + cost_txt)
    _atomic_write_text(spath, json.dumps(scene, indent=2))
    return 200, {'ok': True, 'outcomes': [{'type': 'Emergency Switch', 'result': cost_txt}],
                 'currentMode': mode}


def _apply_one_player_action(campaign, scene, tok, row, mode_info, locked, abilities,
                             a, ability_name):
    atype = str((a or {}).get('type') or '').strip()
    if atype not in PLAYER_ACTIONS:
        return 400, {'error': 'unknown action type: ' + atype}

    # ---- ability row: GameText drives the effect die, forced dice, flags ----
    ability_row = None
    if ability_name:
        an = ability_name.strip().lower()
        ability_row = next((r for r in abilities
                            if (r.get('Name') or '').strip().lower() == an
                            or (r.get('DisplayName') or '').strip().lower() == an), None)
    game_text = str((ability_row or {}).get('GameText') or '')
    flags = ability_flags(game_text)

    if atype.lower() in locked:
        return 400, {'error': atype + ' is locked in this mode'}
    if atype == 'Recover' and not (hero_has_recover_ability(abilities)
                                   or scene_is_montage(scene)
                                   or action_choice_ability(game_text)):
        return 400, {'error': 'Recover needs an ability that grants it'
                              + ('' if not scene_is_montage(scene) else '')}

    # ---- target ----
    target = None
    target_label = ''
    if atype == 'Overcome':
        target_label = str(a.get('targetLabel') or '').strip() or 'scene object'
    elif atype == 'Recover':
        tid = str(a.get('targetId') or tok.get('id') or '')
        target = next((t for t in scene.get('tokens') or [] if t.get('id') == tid), tok)
        if target is None:
            return 400, {'error': 'recover target not found'}
        if target.get('kind') not in ('hero', 'villain'):
            return 400, {'error': 'Recover only works on heroes and villains'}
    else:
        tid = str(a.get('targetId') or '')
        target = next((t for t in scene.get('tokens') or [] if t.get('id') == tid), None)
        if target is None:
            return 400, {'error': atype + ' needs a valid target'}
        if target.get('id') == tok.get('id') and atype == 'Attack':
            return 400, {'error': 'you cannot attack yourself'}
        if (target.get('kind') == 'npc'
                and npc_type_for(campaign, str(target.get('slug') or '')) == 'Bystander'):
            # Bystanders cannot make or receive targeted Actions (the GM board's
            # target dropdowns exclude them the same way). Overcome "saves" a
            # bystander off the board via its free-text target instead. This
            # split may be restructured later as non-hero/villain token roles
            # are clarified.
            return 400, {'error': 'bystanders cannot be targeted by ' + atype}
        if (target.get('locationId') or '') != (tok.get('locationId') or ''):
            return 400, {'error': 'target must be in your location'}
        if target.get('ko'):
            return 400, {'error': 'target is out'}

    # Player-facing display name (numbered minions, same as GM board/PD)
    tname = token_display_name(target or tok, scene.get('tokens') or [])

    # ---- dice pool ----
    pool = dict(a.get('roll') or {})
    fp, fq = forced_dice_for(row, mode_info, game_text)
    if fp:
        pool['forcedPower'] = fp
    if fq:
        pool['forcedQuality'] = fq
    vals, err = resolve_pool(row, tok, mode_info, pool)
    if err:
        return 400, {'error': err}
    ds = action_effect_mode(atype, (ability_row or {}).get('DieSource') or '', game_text)
    if ds:
        # The ability's effect die is an internal calculation (e.g. Max+Min) —
        # the client never supplies it.
        effect = effect_from_values(vals, ds)
        vals['effectMode'] = ds
    elif vals['effect'] is None:
        effect = int(vals['mid'])
        vals['effect'] = effect
    else:
        effect = int(vals['effect'])
        if effect < 0 or effect > 20:
            return 400, {'error': 'effect die out of range'}

    # ---- mod spends (the affected decides when a Boost/Hinder happens) ----
    if flags['ignorePenalties']:
        spent = [str(i) for i in (a.get('spendMods') or [])]
        mods = ensure_scene_mods(scene)
        for mid in spent:
            m = next((x for x in mods if str(x.get('id') or '') == mid), None)
            if m is not None and m.get('kind') == 'hinder' and m.get('targetId') == tok.get('id'):
                return 400, {'error': 'this attack ignores all penalties — Hinders cannot apply'}
    spend_delta, err = spend_player_mods(scene, tok, a.get('spendMods'), None)
    if err:
        return 400, {'error': err}

    # ---- Boost/Hinder: optional minor twist for a second use ----
    uses = 1
    twist_txt = ''
    if atype in ('Boost', 'Hinder'):
        bt = a.get('boostTwist') or {}
        if bt:
            try:
                pi = int(bt.get('principle') or 0)
            except (TypeError, ValueError):
                pi = 0
            if pi not in (1, 2):
                return 400, {'error': 'boostTwist.principle must be 1 or 2'}
            twist_txt = str(row.get('Principle' + str(pi) + 'MinorTwist') or '')
            if not twist_txt:
                return 400, {'error': 'that principle has no Minor Twist question'}
            uses = 2

    details = {'effect': effect, 'ability': ability_name}
    if 'powerDie' in vals:
        details['roll'] = vals

    result = ''
    outcome = {'type': atype, 'effect': effect, 'roll': vals}
    if atype == 'Attack':
        defend = 0 if flags['ignorePenalties'] else defend_total_on(scene, target)
        dmg = max(0, effect + spend_delta - defend)
        if defend:
            consume_defend_mods(scene, target)
            details['defend'] = defend
        if flags['ignorePenalties']:
            details['ignorePenalties'] = True
        if flags['noReactions']:
            details['noReactions'] = True
        details['dmg'] = dmg
        result = apply_player_attack(scene, tok, target, dmg, ability_name or 'Attack', effect, tname)
        outcome['target'] = {'id': target.get('id'), 'name': tname,
                             'kind': target.get('kind')}
        outcome['dmg'] = dmg
        if defend:
            outcome['defended'] = defend
    elif atype in ('Boost', 'Hinder'):
        value = bh_mod_value(effect + spend_delta)
        if value <= 0:
            result = (ability_name or atype) + ': no mod created'
            outcome['value'] = 0
        else:
            mod = {'id': 'mod-' + secrets.token_hex(4), 'kind': atype.lower(),
                   'value': value, 'creatorId': tok.get('id'), 'targetId': target.get('id'),
                   'exclusivePersistent': False, 'uses': uses}
            if twist_txt:
                mod['twist'] = twist_txt
            ensure_scene_mods(scene).append(mod)
            details['value'] = value
            result = ((ability_name or atype) + ': ' + atype.lower() + ' ' + str(value)
                      + ' → ' + tname
                      + (' (2 uses — minor twist taken)' if uses == 2 else ''))
            outcome.update({'value': value, 'uses': uses,
                            'target': {'id': target.get('id'), 'name': tname,
                                       'kind': target.get('kind')}})
    elif atype == 'Defend':
        value = max(0, effect + spend_delta)
        ensure_scene_mods(scene).append({'id': 'mod-' + secrets.token_hex(4),
                                         'kind': 'defend', 'value': value,
                                         'creatorId': tok.get('id'),
                                         'targetId': target.get('id'),
                                         'exclusivePersistent': False, 'uses': 1})
        details['value'] = value
        result = ((ability_name or 'Defend') + ': defend ' + str(value) + ' → ' + tname)
        outcome.update({'value': value,
                        'target': {'id': target.get('id'), 'name': tname,
                                   'kind': target.get('kind')}})
    elif atype == 'Recover':
        heal = max(0, effect + spend_delta)
        if target.get('kind') in ('hero', 'villain'):
            max_h = int(target.get('maxHealth') or 0) or int(target.get('currentHealth') or 0)
            target['currentHealth'] = min(max_h, (int(target.get('currentHealth') or 0)) + heal)
        details['heal'] = heal
        result = ((ability_name or 'Recover') + ': Recover ' + str(heal) + ' → '
                  + tname + ' (Health ' + str(target.get('currentHealth')) + ')')
        outcome.update({'heal': heal, 'health': target.get('currentHealth')})
    elif atype == 'Overcome':
        total = effect + spend_delta
        details['total'] = total
        result = ((ability_name or 'Overcome') + ': Overcome ' + str(total) + ' vs '
                  + target_label + ' — ' + overcome_result_text(total))
        outcome.update({'total': total, 'targetLabel': target_label,
                        'outcome': overcome_result_text(total)})

    if twist_txt:
        details['minorTwist'] = twist_txt

    counts = atype in ('Attack', 'Defend', 'Boost', 'Hinder', 'Recover', 'Overcome')
    log_scene_activity(scene, actor_ref(tok), atype, outcome.get('target')
                       or ({'name': target_label} if target_label else None),
                       result, details, counts_as_turn=counts)
    if counts:
        assign_player_turn(campaign, scene, tok)
    record_sheet_activity(campaign, str(tok.get('slug') or ''),
                          ability_name if ability_name else atype, result)
    outcome['result'] = result
    # Hiding rule: the player device sees what the action DID (damage dealt) but
    # never a villain's remaining health number — the "(Health N)" tail of the
    # GM-facing result string stays in the scene Activity Log / change feed only.
    if outcome.get('target', {}).get('kind') == 'villain':
        outcome['result'] = re.sub(r'\s*\(Health \d+\)\s*$', '', outcome['result'])
    return 200, outcome


def save_built_hero(campaign: Path, payload: dict, obsidian_heroes: Path | None = None) -> dict:
    """Upsert a constructed hero into VTT CSVs + MD, and optionally an Occidia note."""
    name = (payload.get('name') or '').strip()
    if not name:
        raise ValueError('name is required')
    slug = slugify(payload.get('slug') or name)

    powers = list(payload.get('powers') or [])[:6]
    qualities = list(payload.get('qualities') or [])[:6]
    heroes_path = campaign / 'players.csv'
    rows = _csv_rows(heroes_path, HEROES_HEADERS)
    existing = next((r for r in rows if (r.get('Slug') or '') == slug), None) or {}
    row = {h: existing.get(h, '') or '' for h in HEROES_HEADERS}
    row['Slug'] = slug
    row['Name'] = name
    if 'alias' in payload:
        row['Alias'] = (payload.get('alias') or '').strip()
    if 'player' in payload:
        row['Player'] = (payload.get('player') or '').strip()
    if payload.get('maxHealth') not in (None, ''):
        row['MaxHealth'] = str(payload.get('maxHealth'))
    if payload.get('greenStatusDie'):
        row['GreenStatusDie'] = payload.get('greenStatusDie') or ''
    if payload.get('yellowStatusDie'):
        row['YellowStatusDie'] = payload.get('yellowStatusDie') or ''
    if payload.get('redStatusDie'):
        row['RedStatusDie'] = payload.get('redStatusDie') or ''
    if 'active' in payload or 'Active' in payload:
        val = payload.get('active', payload.get('Active'))
        row['Active'] = 'true' if str(val).lower() not in ('false', '0', 'no', '') else 'false'
    orig = payload.get('origin', payload.get('Origin'))
    if orig in ('premade', 'custom'):
        row['Origin'] = orig
    elif not row.get('Origin'):
        row['Origin'] = 'custom'
    aff = payload.get('affiliation') or payload.get('Affiliation') or row.get('Affiliation') or 'Ally'
    row['Affiliation'] = aff if aff in ('Ally', 'Enemy', 'Neutral') else 'Ally'
    if powers:
        for i in range(1, 7):
            row[f'Power{i}'] = ''
            row[f'PowerDie{i}'] = ''
            row[f'Power{i}DisplayName'] = ''
        for i, p in enumerate(powers, 1):
            row[f'Power{i}'] = p.get('name') or ''
            row[f'PowerDie{i}'] = p.get('die') or ''
            row[f'Power{i}DisplayName'] = p.get('displayName') or ''
    if qualities:
        for i in range(1, 7):
            row[f'Quality{i}'] = ''
            row[f'QualityDie{i}'] = ''
            row[f'Quality{i}DisplayName'] = ''
        for i, q in enumerate(qualities, 1):
            row[f'Quality{i}'] = q.get('name') or ''
            row[f'QualityDie{i}'] = q.get('die') or ''
            row[f'Quality{i}DisplayName'] = q.get('displayName') or ''
    princ = list(payload.get('principles') or [])
    if princ:
        for i, pr in enumerate(princ[:2], 1):
            row[f'Principle{i}Name'] = pr.get('name') or ''
            row[f'Principle{i}Roleplay'] = pr.get('roleplay') or ''
            row[f'Principle{i}MinorTwist'] = pr.get('minorTwist') or ''
            row[f'Principle{i}MajorTwist'] = pr.get('majorTwist') or ''

    rows = [r for r in rows if (r.get('Slug') or '') != slug]
    rows.append(row)
    _write_csv(heroes_path, HEROES_HEADERS, rows)

    abilities = list(payload.get('abilities') or [])
    ab_path = campaign / 'abilities.csv'
    if abilities:
        ab_entries = []
        for a in abilities:
            game = a.get('text') or a.get('gameText') or ''
            roll = a.get('rollType') or ''
            if not roll:
                roll = _infer_roll_types(game)
            ab_entries.append({
                'Slug': slug,
                'Zone': (a.get('zone') or '').replace('Green/Yellow', 'Green'),
                'Name': a.get('name') or '',
                'DisplayName': a.get('displayName') or a.get('DisplayName') or '',
                'Type': a.get('type') or '',
                'GameText': game,
                'RollType': roll,
                'DieSource': a.get('dieSource') or '',
                'EffectDieHint': a.get('effectDieHint') or '',
                'Mode': a.get('mode') or '',
            })
        ab_path = _upsert_actor_abilities(campaign, slug, ab_entries)

    md_dir = campaign / 'md' / 'heroes'
    md_dir.mkdir(parents=True, exist_ok=True)
    md_path = md_dir / f'{slug}.md'
    constructed = bool(abilities or powers or qualities or payload.get('maxHealth') or payload.get('out') or payload.get('personality'))
    if constructed or not md_path.exists():
        md_lines = [f'# {name}', '']
        if payload.get('player'):
            md_lines += [f'Player: {payload["player"]}', '']
        if payload.get('out'):
            md_lines += ['## Out', '', payload['out'], '']
        md_lines.append('## Abilities')
        md_lines.append('')
        for a in abilities:
            typ = (a.get('type') or 'A')[0]
            md_lines.append(f'### [{typ}] "{a.get("name") or "Ability"}"')
            md_lines.append(a.get('text') or a.get('gameText') or '')
            md_lines.append('')
        state = payload.get('builderState')
        if not isinstance(state, dict):
            state = {}
        else:
            state = dict(state)
        state['origin'] = 'custom'
        for k in ('background', 'powerSource', 'archetype', 'personality'):
            if payload.get(k) and not state.get(k):
                state[k] = payload[k]
        md_lines += ['## Builder', '', '```json', json.dumps(state, indent=2), '```', '']
        # Modular hero modes: structured JSON section the board reads to enforce
        # per-mode power sets, basic-action lockouts, immobile and powerless rules.
        modes = payload.get('modes')
        if isinstance(modes, list) and modes:
            md_lines += ['## Modes', '', '```json', json.dumps(modes, indent=2), '```', '']
        _atomic_write_text(md_path, '\n'.join(md_lines))

    obsidian_path = None
    if obsidian_heroes and constructed:
        obsidian_heroes.mkdir(parents=True, exist_ok=True)
        fm = [
            '---',
            'kind: hero',
            f'slug: {slug}',
            f'name: {name}',
            f'player: {payload.get("player") or ""}',
            'dg-publish: false',
            f'background: {payload.get("background") or ""}',
            f'powerSource: {payload.get("powerSource") or ""}',
            f'archetype: {payload.get("archetype") or ""}',
            f'personality: {payload.get("personality") or ""}',
            f'maxHealth: {payload.get("maxHealth") or ""}',
            '---',
            '',
            f'# {name}',
            '',
            f'Alias: {payload.get("alias") or ""}',
            '',
            '[[Rulebook]]',
            '',
        ]
        note = obsidian_heroes / f'{name}.md'
        _atomic_write_text(note, '\n'.join(fm) + md_path.read_text(encoding='utf-8'))
        obsidian_path = str(note)

    return {
        'slug': slug,
        'heroesCsv': str(heroes_path),
        'abilitiesCsv': str(ab_path),
        'md': str(md_path),
        'obsidian': obsidian_path,
    }


def _gyro_floors(max_health: int) -> tuple[str, str, str]:
    """Hero GYRO chart (17–40). Above 40, scale the 40-row. Below 17, scale the 17-row."""
    chart = {
        40: (30, 15, 1), 39: (30, 15, 1), 38: (29, 14, 1), 37: (29, 14, 1),
        36: (28, 14, 1), 35: (27, 13, 1), 34: (26, 13, 1), 33: (26, 13, 1),
        32: (25, 12, 1), 31: (24, 12, 1), 30: (23, 12, 1), 29: (23, 11, 1),
        28: (22, 11, 1), 27: (21, 11, 1), 26: (21, 10, 1), 25: (20, 10, 1),
        24: (19, 10, 1), 23: (19, 9, 1), 22: (18, 9, 1), 21: (17, 9, 1),
        20: (16, 8, 1), 19: (15, 8, 1), 18: (15, 8, 1), 17: (14, 7, 1),
    }
    if max_health in chart:
        g, y, r = chart[max_health]
    elif max_health > 40:
        g, y, r = round(max_health * 30 / 40), round(max_health * 15 / 40), 1
    elif max_health > 0:
        g, y, r = max(1, round(max_health * 14 / 17)), max(1, round(max_health * 7 / 17)), 1
    else:
        return '', '', ''
    return str(g), str(y), str(r)


def _infer_roll_types(text: str) -> str:
    """RollType from Game Text: the 6 basic actions present as whole words; else blank."""
    t = text or ''
    found = [k for k in ('Attack', 'Defend', 'Boost', 'Hinder', 'Recover', 'Overcome')
             if re.search(r'\b' + k + r'\b', t, flags=re.I)]
    return ', '.join(found)


def _ability_card_md(card: dict) -> list[str]:
    typ = (card.get('type') or 'A')[0].upper()
    if typ not in 'ARI':
        typ = 'A'
    icon = card.get('icons') or card.get('icon') or 'None'
    if isinstance(icon, list):
        icon = ', '.join(icon) if icon else 'None'
    icon = icon or 'None'
    name = card.get('name') or 'Ability'
    text = card.get('text') or card.get('gameText') or ''
    return [f'### [{typ}] [{icon}] "{name}"', text, '']


def _upsert_actor_abilities(campaign: Path, slug: str, ability_rows: list) -> Path:
    """Replace all abilities.csv rows for slug with ability_rows (dicts with CSV keys)."""
    with STATE_LOCK:  # read-keep → append → write is one critical section
        ab_path = campaign / 'abilities.csv'
        keep = [r for r in _csv_rows(ab_path, ABILITIES_HEADERS)
                if (r.get('Slug') or r.get('HeroSlug') or '') != slug]
        for a in ability_rows:
            row = {h: '' for h in ABILITIES_HEADERS}
            row.update({k: (a.get(k) or '') for k in ABILITIES_HEADERS})
            row['Slug'] = slug
            if not row.get('RollType'):
                row['RollType'] = _infer_roll_types(row.get('GameText') or '')
            keep.append(row)
        _write_csv(ab_path, ABILITIES_HEADERS, keep)
        return ab_path


def save_built_villain(campaign: Path, payload: dict) -> dict:
    """Upsert a constructed villain into villains.csv + md/villains/<slug>.md."""
    name = (payload.get('name') or '').strip()
    if not name:
        raise ValueError('name is required')
    abilities = list(payload.get('abilities') or [])
    if len(abilities) > 5:
        raise ValueError('max 5 abilities')
    upgrades = payload.get('upgrades')
    if upgrades is None and payload.get('upgrade'):
        upgrades = [payload['upgrade']]
    upgrades = [u for u in (upgrades or []) if u and (u.get('name') or '').strip()]
    if len(upgrades) > 1:
        raise ValueError('max 1 upgrade')
    masteries = payload.get('masteries')
    if masteries is None and payload.get('mastery'):
        masteries = [payload['mastery']]
    masteries = [m for m in (masteries or []) if m and (m.get('name') or '').strip()]
    if len(masteries) > 1:
        raise ValueError('max 1 mastery')

    slug = slugify(payload.get('slug') or name)
    powers = list(payload.get('powers') or [])[:5]
    qualities = list(payload.get('qualities') or [])[:6]
    row = {h: '' for h in VILLAINS_HEADERS}
    row['Slug'] = slug
    row['Name'] = name
    row['Approach'] = payload.get('approach') or ''
    row['Archetype'] = payload.get('archetype') or ''
    row['MaxHealth'] = str(payload.get('maxHealth') or '')
    row['GreenFloor'] = str(payload.get('greenFloor') or '')
    row['YellowFloor'] = str(payload.get('yellowFloor') or '')
    row['RedFloor'] = str(payload.get('redFloor') or '')
    row['GreenStatusDie'] = payload.get('greenStatusDie') or ''
    row['YellowStatusDie'] = payload.get('yellowStatusDie') or ''
    row['RedStatusDie'] = payload.get('redStatusDie') or ''
    if 'active' in payload or 'Active' in payload:
        val = payload.get('active', payload.get('Active'))
        row['Active'] = 'false' if str(val).lower() in ('false', '0', 'no') else 'true'
    orig = payload.get('origin', payload.get('Origin'))
    if orig in ('premade', 'custom'):
        row['Origin'] = orig
    elif not row.get('Origin'):
        row['Origin'] = 'custom'
    aff = payload.get('affiliation') or payload.get('Affiliation') or row.get('Affiliation') or 'Enemy'
    row['Affiliation'] = aff if aff in ('Ally', 'Enemy', 'Neutral') else 'Enemy'
    if row['GreenStatusDie'] and not row['GreenFloor'] and row['MaxHealth']:
        try:
            g, y, r = _gyro_floors(int(row['MaxHealth']))
            row['GreenFloor'], row['YellowFloor'], row['RedFloor'] = g, y, r
        except ValueError:
            pass
    for i, p in enumerate(powers, 1):
        row[f'Power{i}'] = p.get('name') or ''
        row[f'PowerDie{i}'] = p.get('die') or ''
    for i, q in enumerate(qualities, 1):
        row[f'Quality{i}'] = q.get('name') or ''
        row[f'QualityDie{i}'] = q.get('die') or ''
    slots = list(payload.get('statusSlots') or [])[:5]
    for i, s in enumerate(slots, 1):
        row[f'Status{i}Label'] = s.get('label') or ''
        row[f'Status{i}Die'] = s.get('die') or ''

    path = campaign / 'villains.csv'
    rows = [r for r in _csv_rows(path, VILLAINS_HEADERS) if (r.get('Slug') or '') != slug]
    rows.append(row)
    _write_csv(path, VILLAINS_HEADERS, rows)

    md_lines = [f'# {name}', '']
    md_lines += ['## Overview', '']
    md_lines += [f'- **Alias:** {payload.get("alias") or "—"}']
    md_lines += [f'- **Approach:** {row["Approach"] or "—"}']
    md_lines += [f'- **Archetype:** {row["Archetype"] or "—"}']
    md_lines += [f'- **Health:** {row["MaxHealth"] or "—"}', '']
    md_lines += ['## Physical Attributes', '']
    for label, key in (
        ('Gender', 'gender'), ('Age', 'age'), ('Height', 'height'),
        ('Eyes', 'eyes'), ('Hair', 'hair'), ('Skin', 'skin'),
        ('Build', 'build'), ('Costume/Equipment', 'costume'),
    ):
        md_lines.append(f'- **{label}:** {payload.get(key) or "—"}')
    md_lines.append('')
    md_lines += ['## Look', '', (payload.get('lookNotes') or '').strip() or '_No look notes._', '']
    md_lines += ['## References', '', (payload.get('references') or '').strip() or '_None yet._', '']
    md_lines += ['## Biography', '', (payload.get('biography') or '').strip() or '_None yet._', '']
    md_lines += ['## Capabilities and Motivations', '', (payload.get('capabilities') or '').strip() or '_None yet._', '']
    md_lines += ['## Upgrade Summary', '', (payload.get('upgradeNotes') or '').strip() or '_None yet._', '']
    md_lines += ['## Abilities', '']
    if abilities:
        for a in abilities:
            md_lines += _ability_card_md(a)
    else:
        md_lines.append('_None yet._')
        md_lines.append('')
    if upgrades:
        md_lines += ['## Upgrades', '']
        for u in upgrades:
            md_lines += _ability_card_md(u)
    if masteries:
        md_lines += ['## Mastery', '']
        for m in masteries:
            md_lines += _ability_card_md(m)
    state = payload.get('builderState')
    if isinstance(state, dict):
        md_lines += ['## Builder', '', '```json', json.dumps(state, indent=2), '```', '']
    md_dir = campaign / 'md' / 'villains'
    md_dir.mkdir(parents=True, exist_ok=True)
    md_path = md_dir / f'{slug}.md'
    _atomic_write_text(md_path, '\n'.join(md_lines))

    # Dice-roller / board layer: selected abilities + upgrade + mastery → abilities.csv
    ab_entries = []
    for a in abilities:
        game = a.get('text') or a.get('gameText') or ''
        icons = a.get('icons') or a.get('icon') or a.get('rollType') or ''
        if isinstance(icons, list):
            icons = ', '.join(icons)
        roll = a.get('rollType') or _infer_roll_types(game)
        if not roll and icons:
            parts = [p.strip() for p in re.split(r'[,/]', str(icons)) if p.strip()]
            roll = ', '.join(p for p in parts if p in (
                'Attack', 'Defend', 'Boost', 'Hinder', 'Recover', 'Overcome'))
        ab_entries.append({
            'Slug': slug, 'Zone': '', 'Name': a.get('name') or '',
            'DisplayName': a.get('displayName') or '', 'Type': (a.get('type') or 'A')[0],
            'GameText': game, 'RollType': roll, 'DieSource': a.get('dieSource') or '',
            'EffectDieHint': a.get('effectDieHint') or '',
        })
    for u in upgrades:
        game = u.get('text') or u.get('gameText') or ''
        ab_entries.append({
            'Slug': slug, 'Zone': 'Upgrade', 'Name': u.get('name') or '',
            'DisplayName': '', 'Type': (u.get('type') or 'I')[0],
            'GameText': game, 'RollType': _infer_roll_types(game),
            'DieSource': '', 'EffectDieHint': '',
        })
    for m in masteries:
        game = m.get('text') or m.get('gameText') or ''
        ab_entries.append({
            'Slug': slug, 'Zone': 'Mastery', 'Name': m.get('name') or '',
            'DisplayName': '', 'Type': (m.get('type') or 'I')[0],
            'GameText': game, 'RollType': _infer_roll_types(game),
            'DieSource': '', 'EffectDieHint': '',
        })
    # Always rewrite this slug's ability rows (clears stale picks when builder empties them)
    ab_path = _upsert_actor_abilities(campaign, slug, ab_entries)

    return {'slug': slug, 'villainsCsv': str(path), 'md': str(md_path), 'abilitiesCsv': str(ab_path)}


def save_built_minion(campaign: Path, payload: dict) -> dict:
    name = (payload.get('name') or '').strip()
    if not name:
        raise ValueError('name is required')
    slug = slugify(payload.get('slug') or name)
    npc_val = payload.get('npc', payload.get('NPC'))
    is_npc = str(npc_val).lower() not in ('false', '0', 'no', '', 'None') if npc_val is not None else False
    if npc_val is None:
        is_npc = False
    dest_headers = NPCS_HEADERS if is_npc else MINIONS_HEADERS
    dest = campaign / ('npcs.csv' if is_npc else 'minions.csv')
    other = campaign / ('minions.csv' if is_npc else 'npcs.csv')
    other_headers = MINIONS_HEADERS if is_npc else NPCS_HEADERS
    dest_existing = next((r for r in _csv_rows(dest, dest_headers) if (r.get('Slug') or '') == slug), None)
    if not dest_existing:
        dest_existing = next((r for r in _csv_rows(other, other_headers) if (r.get('Slug') or '') == slug), None)
    row = {h: (dest_existing or {}).get(h, '') for h in dest_headers}
    row['Slug'] = slug
    row['Name'] = name
    kind = payload.get('type') or row.get('Type') or 'Minion'
    row['Type'] = kind
    if kind == 'Bystander':
        row['Die'] = ''
        row['PerHero'] = ''
    else:
        if 'die' in payload:
            row['Die'] = payload.get('die') or ''
        elif not row.get('Die'):
            row['Die'] = 'd8'
        if kind in ('Lieutenant', 'Hero'):
            row['PerHero'] = ''
        elif 'perHero' in payload:
            row['PerHero'] = str(payload.get('perHero') or '')
    if 'faction' in payload:
        row['Faction'] = payload.get('faction') or ''
    if 'active' in payload or 'Active' in payload:
        val = payload.get('active', payload.get('Active'))
        row['Active'] = 'false' if str(val).lower() in ('false', '0', 'no') else 'true'
    orig = payload.get('origin', payload.get('Origin'))
    if orig in ('premade', 'custom'):
        row['Origin'] = orig
    elif not row.get('Origin'):
        row['Origin'] = 'custom'
    default_aff = 'Neutral' if is_npc else 'Enemy'
    aff = payload.get('affiliation') or payload.get('Affiliation') or row.get('Affiliation') or default_aff
    row['Affiliation'] = aff if aff in ('Ally', 'Enemy', 'Neutral') else default_aff
    dest_rows = [r for r in _csv_rows(dest, dest_headers) if (r.get('Slug') or '') != slug]
    dest_rows.append(row)
    _write_csv(dest, dest_headers, dest_rows)
    other_rows = [r for r in _csv_rows(other, other_headers) if (r.get('Slug') or '') != slug]
    _write_csv(other, other_headers, other_rows)
    path = dest
    abilities = payload.get('abilities') or []
    if not isinstance(abilities, list):
        abilities = []
    description = (payload.get('description') or payload.get('notes') or '').strip()
    tactics = (payload.get('tactics') or '').strip()
    card_re = re.compile(
        r'###\s*\[([ARI?])\]\s*(?:\[[^\]]*\]\s*)?"([^"]+)"\s*\n(.*?)(?=\n###|\n##\s+|$)',
        re.S)
    if not abilities:
        for m in card_re.finditer(description):
            abilities.append({'name': m.group(2).strip(), 'text': m.group(3).strip(), 'type': m.group(1)})
    description = card_re.sub('', description).strip()
    description = re.sub(r'\n{3,}', '\n\n', description).strip()
    md_lines = [f'# {name}', '']
    md_lines += ['## Description', '', description or '_None yet._', '']
    md_lines += ['## Abilities', '']
    for ab in abilities:
        if not isinstance(ab, dict):
            continue
        aname = (ab.get('name') or '').strip()
        body = (ab.get('text') or ab.get('description') or '').strip()
        if not aname:
            continue
        md_lines += [f'### [A] [None] "{aname}"', body, '']
    md_lines += ['## Tactics', '', tactics or '_None yet._', '']
    state = {
        'origin': row.get('Origin') or payload.get('origin') or 'custom',
        'perHero': row.get('PerHero') or '',
        'abilities': [{'name': (a.get('name') or ''), 'text': (a.get('text') or a.get('description') or '')} for a in abilities if isinstance(a, dict)],
    }
    md_lines += ['## Builder', '', '```json', json.dumps(state, indent=2), '```', '']
    md_dir = campaign / 'md' / 'minions'
    md_dir.mkdir(parents=True, exist_ok=True)
    md_path = md_dir / f'{slug}.md'
    _atomic_write_text(md_path, '\n'.join(md_lines))
    return {'slug': slug, 'minionsCsv': str(path), 'md': str(md_path)}


def _slug_list_field(val) -> str:
    """Normalize list/string of slugs to semicolon-separated CSV cell."""
    if val is None:
        return ''
    if isinstance(val, list):
        parts = [str(x).strip() for x in val if str(x).strip()]
    else:
        parts = [p.strip() for p in re.split(r'[;\n,]+', str(val)) if p.strip()]
    # preserve order, drop dups
    seen, out = set(), []
    for p in parts:
        if p not in seen:
            seen.add(p)
            out.append(p)
    return ';'.join(out)


def save_built_environment(campaign: Path, payload: dict) -> dict:
    name = (payload.get('name') or '').strip()
    if not name:
        raise ValueError('name is required')
    slug = slugify(payload.get('slug') or name)
    path = campaign / 'environments.csv'
    existing = next((r for r in _csv_rows(path, ENVIRONMENTS_HEADERS) if (r.get('Slug') or '') == slug), None)
    row = {h: (existing or {}).get(h, '') for h in ENVIRONMENTS_HEADERS}
    row['Slug'] = slug
    row['Name'] = name
    if 'active' in payload or 'Active' in payload:
        val = payload.get('active', payload.get('Active'))
        row['Active'] = 'false' if str(val).lower() in ('false', '0', 'no') else 'true'
    orig = payload.get('origin', payload.get('Origin'))
    if orig in ('premade', 'custom'):
        row['Origin'] = orig
    elif not row.get('Origin'):
        row['Origin'] = 'custom'
    traits = list(payload.get('traits') or [])
    for i, t in enumerate(traits[:3], 1):
        row[f'Trait{i}'] = (t.get('name') or '') if isinstance(t, dict) else ''
        row[f'TraitDie{i}'] = (t.get('die') or '') if isinstance(t, dict) else ''
    # GYRO twists: payload.twists.{green|yellow|red}.{minor1|minor2|major}.{name|description}
    # or flat CSV-style keys GreenMinorTwist1 / GreenMinorTwist1Description / ...
    raw_twists = payload.get('twists')
    twists: dict = raw_twists if isinstance(raw_twists, dict) else {}
    zone_map = (
        ('Green', 'green'),
        ('Yellow', 'yellow'),
        ('Red', 'red'),
    )
    twist_slots = (
        ('MinorTwist1', 'minor1'),
        ('MinorTwist2', 'minor2'),
        ('MajorTwist', 'major'),
    )
    for zone_csv, zone_key in zone_map:
        raw_z = twists.get(zone_key)
        z: dict = raw_z if isinstance(raw_z, dict) else {}
        for slot_csv, slot_key in twist_slots:
            raw_s = z.get(slot_key)
            s: dict = raw_s if isinstance(raw_s, dict) else {}
            name_key = f'{zone_csv}{slot_csv}'
            desc_key = f'{zone_csv}{slot_csv}Description'
            if name_key in payload:
                row[name_key] = str(payload.get(name_key) or '')
            elif s:
                row[name_key] = str(s.get('name') or '')
            if desc_key in payload:
                row[desc_key] = str(payload.get(desc_key) or '')
            elif s:
                row[desc_key] = str(s.get('description') or s.get('desc') or '')
    if 'minionSlugs' in payload or 'MinionSlugs' in payload:
        row['MinionSlugs'] = _slug_list_field(payload.get('minionSlugs', payload.get('MinionSlugs')))
    if 'lieutenantSlugs' in payload or 'LieutenantSlugs' in payload:
        row['LieutenantSlugs'] = _slug_list_field(payload.get('lieutenantSlugs', payload.get('LieutenantSlugs')))
    rows = [r for r in _csv_rows(path, ENVIRONMENTS_HEADERS) if (r.get('Slug') or '') != slug]
    rows.append(row)
    _write_csv(path, ENVIRONMENTS_HEADERS, rows)

    # Location membership: locations.csv EnvironmentSlug points at this environment
    if 'locationSlugs' in payload or 'LocationSlugs' in payload:
        want = set()
        raw = payload.get('locationSlugs', payload.get('LocationSlugs'))
        if isinstance(raw, list):
            want = {str(x).strip() for x in raw if str(x).strip()}
        else:
            want = {p for p in re.split(r'[;\n,]+', str(raw or '')) if p.strip()}
        loc_path = campaign / 'locations.csv'
        loc_rows = _csv_rows(loc_path, LOCATIONS_HEADERS)
        changed = False
        for lr in loc_rows:
            lslug = (lr.get('Slug') or '').strip()
            if not lslug:
                continue
            cur = (lr.get('EnvironmentSlug') or '').strip()
            if lslug in want:
                if cur != slug:
                    lr['EnvironmentSlug'] = slug
                    changed = True
            elif cur == slug:
                lr['EnvironmentSlug'] = ''
                changed = True
        if changed or loc_rows:
            _write_csv(loc_path, LOCATIONS_HEADERS, loc_rows)

    notes = (payload.get('notes') or '').strip()
    md_dir = campaign / 'md' / 'environments'
    md_dir.mkdir(parents=True, exist_ok=True)
    md_path = md_dir / f'{slug}.md'
    origin = row.get('Origin') or 'custom'
    md = [
        f'# {name}', '', notes or '_None yet._', '',
        '## Builder', '', '```json',
        json.dumps({'origin': origin}, indent=2),
        '```', '',
    ]
    _atomic_write_text(md_path, '\n'.join(md))
    return {'slug': slug, 'environmentsCsv': str(path), 'md': str(md_path)}


def make_handler(campaign: Path, obsidian_heroes: Path | None = None):
    scenes_dir = campaign / 'scenes'
    issues_dir = campaign / 'issues'
    collections_dir = campaign / 'collections'
    backgrounds_dir = campaign / 'backgrounds'
    meta_path = backgrounds_dir / '_meta.json'

    def load_meta():
        try:
            return json.loads(meta_path.read_text(encoding='utf-8'))
        except Exception:
            return {}

    def save_meta(m):
        with STATE_LOCK:
            _atomic_write_text(meta_path, json.dumps(m))

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):
            pass  # quiet console; comment out to debug

        def _send_text(self, text, code=200, ctype='text/plain; charset=utf-8'):
            data = text.encode('utf-8')
            self._send_bytes(data, code, ctype)

        def _send_bytes(self, data, code=200, ctype='application/octet-stream'):
            self.send_response(code)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)

        def _read_body_bytes(self):
            length = int(self.headers.get('Content-Length', 0))
            return self.rfile.read(length) if length else b''

        def _serve_events(self):
            """Server-Sent Events stream of the campaign state version.

            Every state write bumps STATE_VERSION; this stream sends
            `data: <version>` the moment it moves plus a `: ping` comment
            every 15s so idle connections stay healthy. Clients (display.js,
            player-sheet.html) refetch their normal GET endpoints when the
            version changes; their polling intervals remain only as a
            fallback for a dropped stream. One thread per connected client —
            a handful of displays at the table is well within budget."""
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            try:
                last = -1
                last_ping = time.time()
                while True:
                    cur = state_version()
                    if cur != last:
                        last = cur
                        self.wfile.write(('data: %d\n\n' % cur).encode('utf-8'))
                        self.wfile.flush()
                        last_ping = time.time()
                    elif time.time() - last_ping >= 15.0:
                        self.wfile.write(b': ping\n\n')
                        self.wfile.flush()
                        last_ping = time.time()
                    else:
                        time.sleep(0.25)
            except (BrokenPipeError, ConnectionResetError, OSError, ValueError):
                return  # client hung up or socket closed — end this stream
            finally:
                self.close_connection = True

        def _read_body_text(self):
            return self._read_body_bytes().decode('utf-8')

        def _serve_static(self, filename, ctype):
            p = APP_DIR / filename
            if not p.exists():
                return self._send_text('missing app file: ' + filename, 500)
            self._send_text(p.read_text(encoding='utf-8'), 200, ctype)

        # ---------------- GET ----------------

        def do_GET(self):
            path = unquote(urlparse(self.path).path)

            if path == '/api/events':
                return self._serve_events()

            if path in STATIC_FILES:
                fname, ctype = STATIC_FILES[path]
                return self._serve_static(fname, ctype)

            if path.startswith('/vendor/'):
                rel = path[len('/vendor/'):]
                p = (VENDOR_DIR / rel).resolve()
                if VENDOR_DIR.resolve() not in p.parents or not p.exists():
                    return self._send_text('not found', 404)
                ctype = VENDOR_CONTENT_TYPE_BY_EXT.get(p.suffix, 'application/octet-stream')
                return self._send_bytes(p.read_bytes(), 200, ctype)

            if path.startswith('/builder/catalog/'):
                name = path.rsplit('/', 1)[-1]
                if not re.fullmatch(r'[a-z0-9_]+\.csv', name):
                    return self._send_text('not found', 404)
                p = (APP_DIR / 'builder' / 'catalog' / name).resolve()
                cat = (APP_DIR / 'builder' / 'catalog').resolve()
                if cat not in p.parents or not p.exists():
                    return self._send_text('not found', 404)
                return self._send_text(p.read_text(encoding='utf-8'), 200, 'text/csv; charset=utf-8')

            if path == '/api/campaign-name':
                return self._send_text(campaign_display_name(campaign))

            if path.startswith('/api/csv/'):
                kind = path.rsplit('/', 1)[-1]
                if kind not in CSV_FILES:
                    return self._send_text('unknown kind', 404)
                fname, _ = CSV_FILES[kind]
                p = campaign / fname
                text = p.read_text(encoding='utf-8') if p.exists() else ''
                return self._send_text(text, 200, 'text/csv; charset=utf-8')

            if path.startswith('/api/md/'):
                parts = path.split('/')
                if len(parts) < 5:
                    return self._send_text('bad path', 400)
                kind, slug = parts[3], parts[4]
                if kind not in ('heroes', 'villains', 'minions', 'environments', 'npcs'):
                    return self._send_text('unknown kind', 404)
                if not is_safe_slug(slug):
                    return self._send_text('invalid slug', 400)
                p = campaign / 'md' / kind / (slug + '.md')
                text = p.read_text(encoding='utf-8') if p.exists() else ''
                return self._send_text(text, 200, 'text/markdown; charset=utf-8')

            if path == '/api/scenes':
                items = []
                for f in sorted(scenes_dir.glob('*.json')):
                    try:
                        data = json.loads(f.read_text(encoding='utf-8'))
                        items.append({
                            'slug': f.stem,
                            'name': data.get('name', f.stem),
                            'sceneType': data.get('sceneType', ''),
                            'difficulty': data.get('difficulty', ''),
                            'environment': data.get('environment') or '',
                        })
                    except Exception:
                        continue
                return self._send_text(json.dumps(items), 200, 'application/json')

            if path.startswith('/api/scenes/'):
                slug = path.rsplit('/', 1)[-1]
                p = scenes_dir / (slug + '.json')
                if not p.exists():
                    return self._send_text('not found', 404)
                return self._send_text(p.read_text(encoding='utf-8'), 200, 'application/json')

            if path == '/api/issues':
                items = []
                for f in sorted(issues_dir.glob('*.json')):
                    try:
                        data = json.loads(f.read_text(encoding='utf-8'))
                        item = dict(data)
                        item['slug'] = f.stem
                        if not item.get('name'):
                            item['name'] = f.stem
                        items.append(item)
                    except Exception:
                        continue
                return self._send_text(json.dumps(items), 200, 'application/json')

            if path.startswith('/api/issues/'):
                slug = path.rsplit('/', 1)[-1]
                p = issues_dir / (slug + '.json')
                if not p.exists():
                    return self._send_text('not found', 404)
                return self._send_text(p.read_text(encoding='utf-8'), 200, 'application/json')

            if path == '/api/collections':
                items = []
                for f in sorted(collections_dir.glob('*.json')):
                    try:
                        data = json.loads(f.read_text(encoding='utf-8'))
                        item = dict(data)
                        item['slug'] = f.stem
                        if not item.get('name'):
                            item['name'] = f.stem
                        items.append(item)
                    except Exception:
                        continue
                return self._send_text(json.dumps(items), 200, 'application/json')

            if path.startswith('/api/collections/'):
                slug = path.rsplit('/', 1)[-1]
                p = collections_dir / (slug + '.json')
                if not p.exists():
                    return self._send_text('not found', 404)
                return self._send_text(p.read_text(encoding='utf-8'), 200, 'application/json')

            if path == '/api/active-scene':
                p = campaign / 'active_scene.json'
                text = p.read_text(encoding='utf-8') if p.exists() else '{"slug": null}'
                return self._send_text(text, 200, 'application/json')

            if path == '/api/revealed-roll':
                p = campaign / 'revealed_roll.json'
                text = p.read_text(encoding='utf-8') if p.exists() else 'null'
                return self._send_text(text, 200, 'application/json')

            if path.startswith('/api/scene-notes/'):
                # Scene Notes live in a folder named after the scene's display
                # name (e.g. campaign/scenes/"Montage #1"/notes.md). The name is
                # resolved from the scene's own JSON so no client-supplied string
                # is ever used to build a filesystem path.
                slug = path.rsplit('/', 1)[-1]
                p = scenes_dir / (slug + '.json')
                if not p.exists():
                    return self._send_text('not found', 404)
                try:
                    name = str(json.loads(p.read_text(encoding='utf-8')).get('name') or '').strip()
                except Exception:
                    name = ''
                notes = {}
                folder = None
                if name and name not in ('.', '..') and '/' not in name and '\0' not in name:
                    candidate = scenes_dir / name
                    if candidate.is_dir():
                        folder = candidate
                    else:
                        # Case-insensitive fallback in case the folder's casing differs.
                        folder = next((d for d in sorted(scenes_dir.iterdir())
                                       if d.is_dir() and d.name.lower() == name.lower()), None)
                if folder:
                    for md in sorted(folder.glob('*.md')):
                        try:
                            notes[md.name] = md.read_text(encoding='utf-8')
                        except Exception:
                            notes[md.name] = ''
                return self._send_text(json.dumps({'name': name, 'notes': notes}), 200, 'application/json')

            if path == '/api/hero-points':
                # Hero Points: issue-scoped earn-only counters, max 5 per hero
                # per issue (SCRPG p.31). Stored in campaign/hero_points.json as
                # {issueSlug: {heroSlug: count}}.
                p = campaign / 'hero_points.json'
                data = {}
                if p.exists():
                    try:
                        data = json.loads(p.read_text(encoding='utf-8'))
                    except Exception:
                        data = {}
                return self._send_text(json.dumps(data), 200, 'application/json')

            if path == '/api/sheet-keys':
                # GM only (LAN console): the whole {heroSlug: key} map.
                return self._send_text(json.dumps(_load_json_file(campaign / 'sheet-keys.json', {})),
                                       200, 'application/json')

            if path == '/api/reminders':
                # Power/Quality reminder data for hover boxes: the real name +
                # the catalog description, from the Hero Builder catalogs.
                def _cat(name):
                    rows = _csv_rows(APP_DIR / 'builder' / 'catalog' / (name + '.csv'),
                                     ['slug', 'category', 'name', 'description'])
                    return {(r.get('name') or '').strip(): (r.get('description') or '').strip()
                            for r in rows if r.get('name')}
                return self._send_text(json.dumps({
                    'powers': _cat('powers'), 'qualities': _cat('qualities'),
                }), 200, 'application/json')

            if path == '/api/player-sheet':
                # Player-device read path, key-gated. ?hero=<slug>&key=<token>
                q = urlparse(self.path).query
                params = dict(p.split('=', 1) for p in q.split('&') if '=' in p)
                hero = unquote(params.get('hero', ''))
                key = unquote(params.get('key', ''))
                if not sheet_key_valid(campaign, hero, key):
                    return self._send_text(json.dumps({'error': 'invalid key'}), 403, 'application/json')
                payload = player_sheet_payload(campaign, hero)
                if payload is None:
                    return self._send_text(json.dumps({'error': 'hero not found'}), 404, 'application/json')
                return self._send_text(json.dumps(payload), 200, 'application/json')

            if path == '/api/sheet-activity':
                data = _load_json_file(campaign / 'sheet_activity.json', [])
                return self._send_text(json.dumps(data if isinstance(data, list) else []),
                                       200, 'application/json')

            if path == '/api/pending-moves':
                # GM queue of staged location moves (Sheets menu + Board prompt).
                return self._send_text(json.dumps(pending_moves_store(campaign)),
                                       200, 'application/json')

            if path == '/api/alerts':
                return self._send_text(json.dumps(_load_json_file(campaign / 'alerts.json', [])),
                                       200, 'application/json')

            if path.startswith('/api/sheet-notes/'):
                # GM read of a player's notes (player saves go through POST
                # /api/player-notes, which validates the hero's key).
                slug = path.rsplit('/', 1)[-1]
                np = sheet_notes_path(campaign, slug)
                if not np:
                    return self._send_text('invalid slug', 400)
                return self._send_text(np.read_text(encoding='utf-8') if np.exists() else '')

            if path == '/api/rules':
                items = []
                for f, slug in iter_rule_files():
                    try:
                        text = f.read_text(encoding='utf-8')
                        first_line = next((l.strip('# ').strip() for l in text.splitlines() if l.strip().startswith('#')), f.stem)
                        chapter = slug.split('--', 1)[0] if '--' in slug else ''
                        items.append({'slug': slug, 'title': first_line, 'chapter': chapter, 'chars': len(text)})
                    except Exception:
                        continue
                return self._send_text(json.dumps(items), 200, 'application/json')

            if path.startswith('/api/rules/'):
                slug = unquote(path[len('/api/rules/'):])
                p = rule_file_for_slug(slug)
                if not p:
                    return self._send_text('not found', 404)
                return self._send_text(p.read_text(encoding='utf-8'), 200, 'text/markdown; charset=utf-8')

            if path == '/api/backgrounds':
                return self._send_text(json.dumps(sorted(load_meta().keys())), 200, 'application/json')

            if path.startswith('/api/backgrounds/'):
                key = path.rsplit('/', 1)[-1]
                m = load_meta()
                ctype = m.get(key)
                if not ctype:
                    return self._send_text('not found', 404)
                ext = IMAGE_EXT_BY_CONTENT_TYPE.get(ctype, 'bin')
                p = backgrounds_dir / f'{key}.{ext}'
                if not p.exists():
                    return self._send_text('not found', 404)
                return self._send_bytes(p.read_bytes(), 200, ctype)

            self._send_text('not found', 404)

        def do_POST(self):
            path = unquote(urlparse(self.path).path)
            if path == '/api/hero-points':
                # Body: {issue, hero, delta} -> clamp 0..5 and save; or
                # {issue, reset: true} -> clear that issue's counters.
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                except Exception:
                    return self._send_text(json.dumps({'error': 'bad json'}), 400, 'application/json')
                issue = str(payload.get('issue') or '').strip()
                if not issue or '/' in issue or '\\' in issue:
                    return self._send_text(json.dumps({'error': 'issue required'}), 400, 'application/json')
                p = campaign / 'hero_points.json'
                with STATE_LOCK:  # read → mutate → clamp → write is one critical section
                    data = {}
                    if p.exists():
                        try:
                            data = json.loads(p.read_text(encoding='utf-8'))
                        except Exception:
                            data = {}
                    if not isinstance(data, dict):
                        data = {}
                    if payload.get('reset'):
                        data.pop(issue, None)
                    else:
                        hero = str(payload.get('hero') or '').strip()
                        if not hero:
                            return self._send_text(json.dumps({'error': 'hero required'}), 400, 'application/json')
                        issue_data = data.setdefault(issue, {})
                        cur = int(issue_data.get(hero) or 0)
                        try:
                            delta = int(payload.get('delta') or 0)
                        except Exception:
                            delta = 0
                        # RAW: each hero may gain a maximum of 5 hero points per issue.
                        new = max(0, min(5, cur + delta))
                        if new == 0:
                            issue_data.pop(hero, None)
                        else:
                            issue_data[hero] = new
                        if not issue_data:
                            data.pop(issue, None)
                    _atomic_write_text(p, json.dumps(data, indent=2))
                return self._send_text(json.dumps(data), 200, 'application/json')
            if path == '/api/sheet-keys':
                # GM only: {hero, op: 'generate'|'clear'} — generate also acts
                # as reset (regenerating revokes the old link).
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                except Exception:
                    return self._send_text(json.dumps({'error': 'bad json'}), 400, 'application/json')
                hero = str(payload.get('hero') or '').strip()
                if not is_safe_slug(hero):
                    return self._send_text(json.dumps({'error': 'hero required'}), 400, 'application/json')
                p = campaign / 'sheet-keys.json'
                with STATE_LOCK:  # read → op → write is one critical section
                    keys = _load_json_file(p, {})
                    if not isinstance(keys, dict):
                        keys = {}
                    op = payload.get('op') or 'generate'
                    if op == 'clear':
                        keys.pop(hero, None)
                    else:
                        was_reset = hero in keys
                        keys[hero] = generate_sheet_key()
                        record_sheet_activity(campaign, hero,
                                              'Sheet key ' + ('reset' if was_reset else 'issued'),
                                              'via GM Sheets menu')
                    _save_json_file(p, keys)
                return self._send_text(json.dumps({'hero': hero, 'key': keys.get(hero) or ''}),
                                       200, 'application/json')
            if path == '/api/player-notes':
                # Player-device save; key-gated. Body: {hero, key, text}
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                except Exception:
                    return self._send_text(json.dumps({'error': 'bad json'}), 400, 'application/json')
                hero = str(payload.get('hero') or '').strip()
                key = str(payload.get('key') or '')
                if not sheet_key_valid(campaign, hero, key):
                    return self._send_text(json.dumps({'error': 'invalid key'}), 403, 'application/json')
                np = sheet_notes_path(campaign, hero)
                if not np:
                    return self._send_text(json.dumps({'error': 'invalid slug'}), 400, 'application/json')
                text = str(payload.get('text') or '')
                existed = np.exists()
                _atomic_write_text(np, text)
                record_sheet_activity(campaign, hero, 'Notes updated',
                                      'edited' if existed else 'created')
                return self._send_text(json.dumps({'ok': True}), 200, 'application/json')
            if path == '/api/player-mode':
                # Foundation for player-driven Mode switching (Phase 2 will build
                # the full Switch-ability flow on top of this). Server-side scene
                # mutation — never a client scene PUT.
                # Body: {hero, key, mode}
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                except Exception:
                    return self._send_text(json.dumps({'error': 'bad json'}), 400, 'application/json')
                hero = str(payload.get('hero') or '').strip()
                mode = str(payload.get('mode') or '').strip()
                if not sheet_key_valid(campaign, hero, str(payload.get('key') or '')):
                    return self._send_text(json.dumps({'error': 'invalid key'}), 403, 'application/json')
                known = {str(m.get('slug') or '').strip() for m in hero_modes_md(campaign, hero)}
                known.add('default')
                if mode not in known:
                    return self._send_text(json.dumps({'error': 'unknown mode'}), 400, 'application/json')
                active = _load_json_file(campaign / 'active_scene.json', {})
                scene_slug = str(active.get('slug') or '') if isinstance(active, dict) else ''
                if not scene_slug or not is_safe_slug(scene_slug):
                    return self._send_text(json.dumps({'error': 'no active scene'}), 400, 'application/json')
                sp = campaign / 'scenes' / (scene_slug + '.json')
                if not sp.exists():
                    return self._send_text(json.dumps({'error': 'no active scene'}), 400, 'application/json')
                with STATE_LOCK:  # read scene → set mode → write is one critical section
                    try:
                        scene = json.loads(sp.read_text(encoding='utf-8'))
                    except Exception:
                        return self._send_text(json.dumps({'error': 'bad scene'}), 500, 'application/json')
                    tok = next((t for t in scene.get('tokens') or []
                                if t.get('kind') == 'hero' and (t.get('slug') or '').strip() == hero), None)
                    if tok is None:
                        return self._send_text(json.dumps({'error': 'hero not on board'}), 400, 'application/json')
                    tok['currentMode'] = mode
                    _atomic_write_text(sp, json.dumps(scene, indent=2))
                mode_name = next((str(m.get('name') or m.get('slug')) for m in hero_modes_md(campaign, hero)
                                  if str(m.get('slug') or '').strip() == mode), mode)
                record_sheet_activity(campaign, hero, 'Mode changed', '→ ' + mode_name)
                return self._send_text(json.dumps({'ok': True, 'currentMode': mode}), 200, 'application/json')
            if path == '/api/player-move':
                # Phase 3: player requests a location move; STAGED for GM
                # approval — nothing moves until the GM approves. Key-gated;
                # the scene JSON is never touched by this endpoint.
                # Body: {hero, key, toLocationId}
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                except Exception:
                    return self._send_text(json.dumps({'error': 'bad json'}), 400, 'application/json')
                hero = str(payload.get('hero') or '').strip()
                if not is_safe_slug(hero):
                    return self._send_text(json.dumps({'error': 'hero required'}), 400, 'application/json')
                if not sheet_key_valid(campaign, hero, str(payload.get('key') or '')):
                    return self._send_text(json.dumps({'error': 'invalid key'}), 403, 'application/json')
                status, resp = apply_player_move_request(campaign, hero, payload)
                return self._send_text(json.dumps(resp), status, 'application/json')
            if path == '/api/pending-moves':
                # GM approve/deny of a staged location move.
                # Body: {op: 'approve'|'deny', id}
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                except Exception:
                    return self._send_text(json.dumps({'error': 'bad json'}), 400, 'application/json')
                status, resp = resolve_pending_move(campaign, str(payload.get('id') or ''),
                                                    str(payload.get('op') or ''))
                return self._send_text(json.dumps(resp), status, 'application/json')
            if path == '/api/player-action':
                # Player-driven actions (Phase 2): Defend / Recover / Boost /
                # Hinder / Attack / Overcome / ability use with self or targeted
                # effects, plus the Switch family. Key-gated; the scene JSON is
                # mutated here in Python — NEVER a scene PUT. Every action was
                # staged through the sheet's "Are You Sure?" popup first; this
                # endpoint is the confirm side and applies server-side.
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                except Exception:
                    return self._send_text(json.dumps({'error': 'bad json'}), 400, 'application/json')
                hero = str(payload.get('hero') or '').strip()
                if not is_safe_slug(hero):
                    return self._send_text(json.dumps({'error': 'hero required'}), 400, 'application/json')
                if not sheet_key_valid(campaign, hero, str(payload.get('key') or '')):
                    return self._send_text(json.dumps({'error': 'invalid key'}), 403, 'application/json')
                status, resp = apply_player_action(campaign, hero, payload)
                return self._send_text(json.dumps(resp), status, 'application/json')
            if path == '/api/alerts':
                # GM compose/delete; player dismiss (key-gated).
                # {op:'compose', targets:'all'|[slugs], text} |
                # {op:'dismiss', hero, key, id} | {op:'delete', id}
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                except Exception:
                    return self._send_text(json.dumps({'error': 'bad json'}), 400, 'application/json')
                p = campaign / 'alerts.json'
                with STATE_LOCK:  # read → op → write is one critical section
                    alerts = _load_json_file(p, [])
                    if not isinstance(alerts, list):
                        alerts = []
                    op = payload.get('op') or 'compose'
                    if op == 'compose':
                        text = str(payload.get('text') or '').strip()
                        if not text:
                            return self._send_text(json.dumps({'error': 'text required'}), 400, 'application/json')
                        targets = payload.get('targets') or 'all'
                        if targets != 'all':
                            if not isinstance(targets, list) or not targets:
                                return self._send_text(json.dumps({'error': 'bad targets'}), 400, 'application/json')
                            targets = [str(t) for t in targets]
                        alerts.append({
                            'id': secrets.token_hex(8),
                            'ts': datetime.now().isoformat(timespec='seconds'),
                            'targets': targets,
                            'text': text,
                            'dismissed': [],
                        })
                    elif op == 'dismiss':
                        hero = str(payload.get('hero') or '').strip()
                        if not sheet_key_valid(campaign, hero, str(payload.get('key') or '')):
                            return self._send_text(json.dumps({'error': 'invalid key'}), 403, 'application/json')
                        aid = str(payload.get('id') or '')
                        for a in alerts:
                            if isinstance(a, dict) and str(a.get('id') or '') == aid:
                                dis = a.setdefault('dismissed', [])
                                if isinstance(dis, list) and hero not in dis:
                                    dis.append(hero)
                    elif op == 'delete':
                        aid = str(payload.get('id') or '')
                        alerts = [a for a in alerts if not (isinstance(a, dict) and str(a.get('id') or '') == aid)]
                    else:
                        return self._send_text(json.dumps({'error': 'bad op'}), 400, 'application/json')
                    _save_json_file(p, alerts)
                return self._send_text(json.dumps(alerts), 200, 'application/json')
            if path == '/api/builder/hero':
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                    result = save_built_hero(campaign, payload, obsidian_heroes)
                except ValueError as e:
                    return self._send_text(json.dumps({'error': str(e)}), 400, 'application/json')
                except Exception as e:
                    return self._send_text(json.dumps({'error': str(e)}), 500, 'application/json')
                return self._send_text(json.dumps(result), 200, 'application/json')
            if path == '/api/builder/villain':
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                    result = save_built_villain(campaign, payload)
                except ValueError as e:
                    return self._send_text(json.dumps({'error': str(e)}), 400, 'application/json')
                except Exception as e:
                    return self._send_text(json.dumps({'error': str(e)}), 500, 'application/json')
                return self._send_text(json.dumps(result), 200, 'application/json')
            if path == '/api/builder/minion':
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                    result = save_built_minion(campaign, payload)
                except ValueError as e:
                    return self._send_text(json.dumps({'error': str(e)}), 400, 'application/json')
                except Exception as e:
                    return self._send_text(json.dumps({'error': str(e)}), 500, 'application/json')
                return self._send_text(json.dumps(result), 200, 'application/json')
            if path == '/api/builder/environment':
                try:
                    payload = json.loads(self._read_body_text() or '{}')
                    result = save_built_environment(campaign, payload)
                except ValueError as e:
                    return self._send_text(json.dumps({'error': str(e)}), 400, 'application/json')
                except Exception as e:
                    return self._send_text(json.dumps({'error': str(e)}), 500, 'application/json')
                return self._send_text(json.dumps(result), 200, 'application/json')
            self._send_text('not found', 404)

        # ---------------- PUT ----------------

        def do_PUT(self):
            path = unquote(urlparse(self.path).path)

            if path.startswith('/api/csv/'):
                kind = path.rsplit('/', 1)[-1]
                if kind not in CSV_FILES:
                    return self._send_text('unknown kind', 404)
                fname, headers = CSV_FILES[kind]
                put_csv(campaign / fname, headers, self._read_body_text())
                return self._send_text('ok')

            if path.startswith('/api/md/'):
                parts = path.split('/')
                if len(parts) < 5:
                    return self._send_text('bad path', 400)
                kind, slug = parts[3], parts[4]
                if kind not in ('heroes', 'villains', 'minions', 'environments', 'npcs'):
                    return self._send_text('unknown kind', 404)
                if not is_safe_slug(slug):
                    return self._send_text('invalid slug', 400)
                body = self._read_body_text()
                d = campaign / 'md' / kind
                d.mkdir(parents=True, exist_ok=True)
                _atomic_write_text(d / (slug + '.md'), body)
                return self._send_text('ok')

            if path.startswith('/api/scenes/'):
                slug = path.rsplit('/', 1)[-1]
                body = self._read_body_text()
                scenes_dir.mkdir(parents=True, exist_ok=True)
                _atomic_write_text(scenes_dir / (slug + '.json'), body)
                return self._send_text('ok')

            if path.startswith('/api/issues/'):
                slug = path.rsplit('/', 1)[-1]
                body = self._read_body_text()
                issues_dir.mkdir(parents=True, exist_ok=True)
                merged_json_put_write(issues_dir / (slug + '.json'), body)
                return self._send_text('ok')

            if path.startswith('/api/collections/'):
                slug = path.rsplit('/', 1)[-1]
                body = self._read_body_text()
                collections_dir.mkdir(parents=True, exist_ok=True)
                merged_json_put_write(collections_dir / (slug + '.json'), body)
                return self._send_text('ok')

            if path == '/api/active-scene':
                body = self._read_body_text()
                _atomic_write_text(campaign / 'active_scene.json', body)
                return self._send_text('ok')

            if path == '/api/revealed-roll':
                body = self._read_body_text()
                _atomic_write_text(campaign / 'revealed_roll.json', body)
                return self._send_text('ok')

            if path.startswith('/api/backgrounds/'):
                key = path.rsplit('/', 1)[-1]
                ctype = self.headers.get('Content-Type', 'application/octet-stream').split(';')[0].strip()
                ext = IMAGE_EXT_BY_CONTENT_TYPE.get(ctype)
                if not ext:
                    return self._send_text('unsupported image type: ' + ctype, 400)
                backgrounds_dir.mkdir(parents=True, exist_ok=True)
                data = self._read_body_bytes()
                with STATE_LOCK:  # image + meta index must land together
                    _atomic_write_bytes(backgrounds_dir / f'{key}.{ext}', data)
                    m = load_meta()
                    m[key] = ctype
                    save_meta(m)
                return self._send_text('ok')

            self._send_text('not found', 404)

        # ---------------- DELETE ----------------

        def do_DELETE(self):
            path = unquote(urlparse(self.path).path)

            if path == '/api/sheet-activity':
                # Testing helper: remove one change-feed entry by index.
                q = urlparse(self.path).query
                params = dict(p.split('=', 1) for p in q.split('&') if '=' in p)
                try:
                    idx = int(params.get('index', '-1'))
                except ValueError:
                    idx = -1
                p = campaign / 'sheet_activity.json'
                with STATE_LOCK:  # read → pop → write is one critical section
                    data = _load_json_file(p, [])
                    if isinstance(data, list) and 0 <= idx < len(data):
                        data.pop(idx)
                        _save_json_file(p, data)
                return self._send_text('ok')

            if path.startswith('/api/scenes/'):
                slug = path.rsplit('/', 1)[-1]
                p = scenes_dir / (slug + '.json')
                if p.exists():
                    p.unlink()
                return self._send_text('ok')

            if path.startswith('/api/issues/'):
                slug = path.rsplit('/', 1)[-1]
                p = issues_dir / (slug + '.json')
                if p.exists():
                    p.unlink()
                return self._send_text('ok')

            if path.startswith('/api/collections/'):
                slug = path.rsplit('/', 1)[-1]
                p = collections_dir / (slug + '.json')
                if p.exists():
                    p.unlink()
                return self._send_text('ok')

            if path.startswith('/api/backgrounds/'):
                key = path.rsplit('/', 1)[-1]
                m = load_meta()
                ctype = m.pop(key, None)
                if ctype:
                    ext = IMAGE_EXT_BY_CONTENT_TYPE.get(ctype, 'bin')
                    p = backgrounds_dir / f'{key}.{ext}'
                    if p.exists():
                        p.unlink()
                    save_meta(m)
                return self._send_text('ok')

            self._send_text('not found', 404)

    return Handler


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--campaign', default=str(APP_DIR / 'campaign'),
                    help='Path to campaign folder (default: the campaign/ next to server.py)')
    ap.add_argument('--port', type=int, default=8420)
    ap.add_argument('--obsidian', default='',
                    help='Occidia PC notes folder. Empty = ~/Obsidian/Occidia/Occidia/1. Player Characters if it exists.')
    args = ap.parse_args()

    campaign = Path(args.campaign).expanduser().resolve()
    ensure_campaign(campaign)
    if args.obsidian:
        obsidian_heroes = Path(args.obsidian).expanduser().resolve()
    elif campaign == (APP_DIR / 'campaign').resolve():
        # Only auto-guess the Obsidian vault for the real Occidia campaign folder —
        # otherwise a test/scratch --campaign run would silently write real hero
        # notes into the live vault (see docs/OVERNIGHT_REVIEW.md Cycle 5).
        guessed = Path.home() / 'Obsidian' / 'Occidia' / 'Occidia' / '1. Player Characters'
        obsidian_heroes = guessed if guessed.is_dir() else None
    else:
        obsidian_heroes = None

    server = ThreadingHTTPServer(('0.0.0.0', args.port), make_handler(campaign, obsidian_heroes))
    ip = local_ip()
    print('SCRPG Scene Board running.')
    print(f'  Campaign folder: {campaign}')
    print(f'  Occidia heroes:  {obsidian_heroes or "(none — VTT only)"}')
    print(f'  GM Console (this machine):  http://localhost:{args.port}')
    print(f'  GM Console (your phone, same Wi-Fi): http://{ip}:{args.port}')
    print(f'  Player Display (cast this tab):      http://localhost:{args.port}/display.html')
    print(f'  Builders hub:                        http://localhost:{args.port}/builder-hub.html')
    print(f'  Hero Builder:                        http://localhost:{args.port}/builder.html')
    print(f'  Villain Builder:                     http://localhost:{args.port}/villain-builder.html')
    print('  Ctrl+C to stop.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')


if __name__ == '__main__':
    main()
