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
import json
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote

APP_DIR = Path(__file__).parent
RULES_DIR = APP_DIR / 'rules'

HEROES_HEADERS = ['Slug', 'Name',
    'Power1', 'PowerDie1', 'Power2', 'PowerDie2', 'Power3', 'PowerDie3',
    'Power4', 'PowerDie4', 'Power5', 'PowerDie5', 'Power6', 'PowerDie6',
    'Quality1', 'QualityDie1', 'Quality2', 'QualityDie2', 'Quality3', 'QualityDie3',
    'Quality4', 'QualityDie4', 'Quality5', 'QualityDie5', 'Quality6', 'QualityDie6',
    'MaxHealth', 'GreenStatusDie', 'YellowStatusDie', 'RedStatusDie', 'GMControlled',
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
    'Status4Label', 'Status4Die', 'Status5Label', 'Status5Die']

MINIONS_HEADERS = ['Slug', 'Name', 'Type', 'Die', 'Faction']

ENVIRONMENTS_HEADERS = ['Slug', 'Name',
    'Trait1', 'TraitDie1', 'Trait2', 'TraitDie2', 'Trait3', 'TraitDie3']

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

ABILITIES_HEADERS = ['HeroSlug', 'Zone', 'Name', 'Type', 'GameText', 'RollType', 'DieSource', 'EffectDieHint']

CSV_FILES = {'heroes': ('heroes.csv', HEROES_HEADERS),
             'villains': ('villains.csv', VILLAINS_HEADERS),
             'minions': ('minions.csv', MINIONS_HEADERS),
             'environments': ('environments.csv', ENVIRONMENTS_HEADERS),
             'twists': ('twists.csv', TWISTS_HEADERS),
             'abilities': ('abilities.csv', ABILITIES_HEADERS)}

STATIC_FILES = {
    '/': ('index.html', 'text/html; charset=utf-8'),
    '/index.html': ('index.html', 'text/html; charset=utf-8'),
    '/display.html': ('display.html', 'text/html; charset=utf-8'),
    '/style.css': ('style.css', 'text/css; charset=utf-8'),
    '/app.js': ('app.js', 'application/javascript; charset=utf-8'),
    '/display.js': ('display.js', 'application/javascript; charset=utf-8'),
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
            {"id": "loc1", "name": "Location 1", "background": None},
            {"id": "loc2", "name": "Location 2", "background": None},
        ],
        "environment": None,
        "challenges": [],
        "tokens": [],
        "gmNotes": "",
        "activityLog": [],
    }


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
    (campaign / 'backgrounds').mkdir(parents=True, exist_ok=True)
    meta = campaign / 'backgrounds' / '_meta.json'
    if not meta.exists():
        meta.write_text('{}', encoding='utf-8')
    active = campaign / 'active_scene.json'
    if not active.exists():
        active.write_text(json.dumps({"slug": None}), encoding='utf-8')
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


def make_handler(campaign: Path):
    scenes_dir = campaign / 'scenes'
    issues_dir = campaign / 'issues'
    backgrounds_dir = campaign / 'backgrounds'
    meta_path = backgrounds_dir / '_meta.json'

    def load_meta():
        try:
            return json.loads(meta_path.read_text(encoding='utf-8'))
        except Exception:
            return {}

    def save_meta(m):
        meta_path.write_text(json.dumps(m), encoding='utf-8')

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

            if path == '/api/campaign-name':
                return self._send_text(campaign.name)

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
                p = campaign / 'md' / kind / (slug + '.md')
                text = p.read_text(encoding='utf-8') if p.exists() else ''
                return self._send_text(text, 200, 'text/markdown; charset=utf-8')

            if path == '/api/scenes':
                items = []
                for f in sorted(scenes_dir.glob('*.json')):
                    try:
                        data = json.loads(f.read_text(encoding='utf-8'))
                        items.append({'slug': f.stem, 'name': data.get('name', f.stem)})
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
                        items.append({'slug': f.stem, 'name': data.get('name', f.stem)})
                    except Exception:
                        continue
                return self._send_text(json.dumps(items), 200, 'application/json')

            if path.startswith('/api/issues/'):
                slug = path.rsplit('/', 1)[-1]
                p = issues_dir / (slug + '.json')
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

            if path == '/api/rules':
                items = []
                for f in sorted(RULES_DIR.glob('*.md')):
                    try:
                        text = f.read_text(encoding='utf-8')
                        first_line = next((l.strip('# ').strip() for l in text.splitlines() if l.strip().startswith('#')), f.stem)
                        items.append({'slug': f.stem, 'title': first_line, 'chars': len(text)})
                    except Exception:
                        continue
                return self._send_text(json.dumps(items), 200, 'application/json')

            if path.startswith('/api/rules/'):
                slug = path.rsplit('/', 1)[-1]
                p = RULES_DIR / (slug + '.md')
                if not p.exists():
                    return self._send_text('not found', 404)
                return self._send_text(p.read_text(encoding='utf-8'), 200, 'text/markdown; charset=utf-8')

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

        # ---------------- PUT ----------------

        def do_PUT(self):
            path = unquote(urlparse(self.path).path)

            if path.startswith('/api/csv/'):
                kind = path.rsplit('/', 1)[-1]
                if kind not in CSV_FILES:
                    return self._send_text('unknown kind', 404)
                fname, _ = CSV_FILES[kind]
                (campaign / fname).write_text(self._read_body_text(), encoding='utf-8')
                return self._send_text('ok')

            if path.startswith('/api/md/'):
                parts = path.split('/')
                if len(parts) < 5:
                    return self._send_text('bad path', 400)
                kind, slug = parts[3], parts[4]
                d = campaign / 'md' / kind
                d.mkdir(parents=True, exist_ok=True)
                (d / (slug + '.md')).write_text(self._read_body_text(), encoding='utf-8')
                return self._send_text('ok')

            if path.startswith('/api/scenes/'):
                slug = path.rsplit('/', 1)[-1]
                scenes_dir.mkdir(parents=True, exist_ok=True)
                (scenes_dir / (slug + '.json')).write_text(self._read_body_text(), encoding='utf-8')
                return self._send_text('ok')

            if path.startswith('/api/issues/'):
                slug = path.rsplit('/', 1)[-1]
                issues_dir.mkdir(parents=True, exist_ok=True)
                (issues_dir / (slug + '.json')).write_text(self._read_body_text(), encoding='utf-8')
                return self._send_text('ok')

            if path == '/api/active-scene':
                (campaign / 'active_scene.json').write_text(self._read_body_text(), encoding='utf-8')
                return self._send_text('ok')

            if path == '/api/revealed-roll':
                (campaign / 'revealed_roll.json').write_text(self._read_body_text(), encoding='utf-8')
                return self._send_text('ok')

            if path.startswith('/api/backgrounds/'):
                key = path.rsplit('/', 1)[-1]
                ctype = self.headers.get('Content-Type', 'application/octet-stream').split(';')[0].strip()
                ext = IMAGE_EXT_BY_CONTENT_TYPE.get(ctype)
                if not ext:
                    return self._send_text('unsupported image type: ' + ctype, 400)
                backgrounds_dir.mkdir(parents=True, exist_ok=True)
                data = self._read_body_bytes()
                (backgrounds_dir / f'{key}.{ext}').write_bytes(data)
                m = load_meta()
                m[key] = ctype
                save_meta(m)
                return self._send_text('ok')

            self._send_text('not found', 404)

        # ---------------- DELETE ----------------

        def do_DELETE(self):
            path = unquote(urlparse(self.path).path)

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
    ap.add_argument('--campaign', default='campaign', help='Path to campaign folder (default: ./campaign)')
    ap.add_argument('--port', type=int, default=8420)
    args = ap.parse_args()

    campaign = Path(args.campaign).expanduser().resolve()
    ensure_campaign(campaign)

    server = ThreadingHTTPServer(('0.0.0.0', args.port), make_handler(campaign))
    ip = local_ip()
    print('SCRPG Scene Board running.')
    print(f'  Campaign folder: {campaign}')
    print(f'  GM Console (this machine):  http://localhost:{args.port}')
    print(f'  GM Console (your phone, same Wi-Fi): http://{ip}:{args.port}')
    print(f'  Player Display (cast this tab):      http://localhost:{args.port}/display.html')
    print('  Ctrl+C to stop.')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')


if __name__ == '__main__':
    main()
