"""
Automated API tests for server.py. Uses Python's stdlib unittest + http.client
against a real ThreadingHTTPServer instance, per CLAUDE.md's stdlib-only
philosophy (no pytest, no new dependencies). Every test runs against a fresh
tempfile.mkdtemp() campaign folder -- never the live campaign/.

Run with:
    python3 -m unittest discover tests
"""
import csv
import http.client
import json
import shutil
import sys
import tempfile
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server as srv


class ServerTestCase(unittest.TestCase):
    """Spins up a real server against a scratch campaign folder for each test."""

    def setUp(self):
        self.tmpdir = tempfile.mkdtemp(prefix='scrpg-test-')
        self.campaign = Path(self.tmpdir) / 'campaign'
        srv.ensure_campaign(self.campaign)
        self.httpd = srv.ThreadingHTTPServer(('127.0.0.1', 0), srv.make_handler(self.campaign))
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=5)
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def request(self, method, path, body=None, headers=None):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=5)
        try:
            conn.request(method, path, body=body, headers=headers or {})
            resp = conn.getresponse()
            data = resp.read()
            return resp.status, data
        finally:
            conn.close()


class TestEnsureCampaign(ServerTestCase):
    def test_all_csv_files_created_with_correct_headers(self):
        for kind, (fname, headers) in srv.CSV_FILES.items():
            p = self.campaign / fname
            self.assertTrue(p.exists(), f'{fname} was not created')
            first_line = p.read_text(encoding='utf-8').splitlines()[0]
            self.assertEqual(first_line, ','.join(headers), f'{fname} header mismatch')

    def test_md_subfolders_created(self):
        for kind in ('heroes', 'villains', 'minions', 'environments'):
            self.assertTrue((self.campaign / 'md' / kind).is_dir())

    def test_scenes_issues_backgrounds_dirs_created(self):
        self.assertTrue((self.campaign / 'scenes').is_dir())
        self.assertTrue((self.campaign / 'issues').is_dir())
        self.assertTrue((self.campaign / 'collections').is_dir())
        self.assertTrue((self.campaign / 'backgrounds').is_dir())
        self.assertTrue((self.campaign / 'backgrounds' / '_meta.json').exists())

    def test_active_scene_defaults_to_null_slug(self):
        data = json.loads((self.campaign / 'active_scene.json').read_text(encoding='utf-8'))
        self.assertIsNone(data['slug'])

    def test_default_twists_seeded(self):
        text = (self.campaign / 'twists.csv').read_text(encoding='utf-8')
        rows = text.strip().splitlines()
        self.assertEqual(len(rows) - 1, len(srv.DEFAULT_TWISTS))
        self.assertIn('hinder-max-penalty', text)

    def test_legacy_scene_json_migrated(self):
        tmpdir = tempfile.mkdtemp(prefix='scrpg-test-legacy-')
        try:
            campaign = Path(tmpdir) / 'campaign'
            campaign.mkdir(parents=True)
            legacy_scene = {
                'name': 'Old Scene',
                'locations': [{'id': 'loc1', 'name': 'Alley'}],
                'tokens': [{'id': 'tok1', 'kind': 'hero'}],
            }
            (campaign / 'scene.json').write_text(json.dumps(legacy_scene), encoding='utf-8')
            srv.ensure_campaign(campaign)
            migrated_path = campaign / 'scenes' / 'migrated-scene.json'
            self.assertTrue(migrated_path.exists())
            migrated = json.loads(migrated_path.read_text(encoding='utf-8'))
            self.assertEqual(migrated['name'], 'Migrated Scene')
            self.assertEqual(migrated['tokens'], legacy_scene['tokens'])
            active = json.loads((campaign / 'active_scene.json').read_text(encoding='utf-8'))
            self.assertEqual(active['slug'], 'migrated-scene')
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)


class TestCsvApi(ServerTestCase):
    def test_get_known_kind_returns_header(self):
        status, data = self.request('GET', '/api/csv/heroes')
        self.assertEqual(status, 200)
        self.assertEqual(data.decode('utf-8').splitlines()[0], ','.join(srv.HEROES_HEADERS))

    def test_get_unknown_kind_returns_404(self):
        status, _ = self.request('GET', '/api/csv/not-a-real-kind')
        self.assertEqual(status, 404)

    def test_put_then_get_round_trips(self):
        content = ','.join(srv.HEROES_HEADERS) + '\r\ntest-slug,Test Hero,' + ',' * (len(srv.HEROES_HEADERS) - 3) + '\r\n'
        status, _ = self.request('PUT', '/api/csv/heroes', body=content.encode('utf-8'))
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/csv/heroes')
        self.assertEqual(status, 200)
        # server.py reads the file back via Path.read_text(), which performs
        # universal-newline translation (CRLF -> LF) -- normalize both sides
        # before comparing, since that's real behavior, not data loss.
        self.assertEqual(data.decode('utf-8'), content.replace('\r\n', '\n'))

    def test_abilities_csv_present_and_empty(self):
        status, data = self.request('GET', '/api/csv/abilities')
        self.assertEqual(status, 200)
        lines = data.decode('utf-8').strip().splitlines()
        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0], ','.join(srv.ABILITIES_HEADERS))


class TestMdApi(ServerTestCase):
    def test_get_missing_slug_returns_empty_string_not_404(self):
        status, data = self.request('GET', '/api/md/villains/nonexistent-slug')
        self.assertEqual(status, 200)
        self.assertEqual(data, b'')

    def test_put_then_get_round_trips(self):
        status, _ = self.request('PUT', '/api/md/villains/test-villain', body=b'# Test Villain\n\nSome notes.')
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/md/villains/test-villain')
        self.assertEqual(status, 200)
        self.assertEqual(data, b'# Test Villain\n\nSome notes.')


class TestScenesApi(ServerTestCase):
    def test_full_crud(self):
        scene = {'name': 'Test Scene', 'tokens': []}
        status, _ = self.request('PUT', '/api/scenes/test-scene', body=json.dumps(scene).encode('utf-8'))
        self.assertEqual(status, 200)

        status, data = self.request('GET', '/api/scenes/test-scene')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data), scene)

        status, data = self.request('GET', '/api/scenes')
        self.assertEqual(status, 200)
        listing = json.loads(data)
        self.assertEqual(len(listing), 1)
        self.assertEqual(listing[0]['slug'], 'test-scene')

        status, _ = self.request('DELETE', '/api/scenes/test-scene')
        self.assertEqual(status, 200)
        status, _ = self.request('GET', '/api/scenes/test-scene')
        self.assertEqual(status, 404)

    def test_listing_skips_malformed_json_without_500(self):
        (self.campaign / 'scenes' / 'broken.json').write_text('{not valid json', encoding='utf-8')
        status, data = self.request('GET', '/api/scenes')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data), [])


class TestIssuesApi(ServerTestCase):
    def test_full_crud(self):
        issue = {'name': 'Test Issue', 'heroSlugs': ['lumen'], 'minionSlugs': ['thug']}
        status, _ = self.request('PUT', '/api/issues/test-issue', body=json.dumps(issue).encode('utf-8'))
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/issues/test-issue')
        self.assertEqual(status, 200)
        saved = json.loads(data)
        self.assertEqual(saved['heroSlugs'], ['lumen'])
        self.assertEqual(saved['minionSlugs'], ['thug'])
        status, _ = self.request('DELETE', '/api/issues/test-issue')
        self.assertEqual(status, 200)
        status, _ = self.request('GET', '/api/issues/test-issue')
        self.assertEqual(status, 404)


class TestCollectionsApi(ServerTestCase):
    def test_full_crud(self):
        coll = {'name': 'Occidia', 'issueSlugs': ['session-1']}
        status, _ = self.request('PUT', '/api/collections/occidia', body=json.dumps(coll).encode('utf-8'))
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/collections/occidia')
        self.assertEqual(status, 200)
        saved = json.loads(data)
        self.assertEqual(saved['name'], 'Occidia')
        self.assertEqual(saved['issueSlugs'], ['session-1'])
        status, listing = self.request('GET', '/api/collections')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(listing)[0]['slug'], 'occidia')
        status, _ = self.request('DELETE', '/api/collections/occidia')
        self.assertEqual(status, 200)
        status, _ = self.request('GET', '/api/collections/occidia')
        self.assertEqual(status, 404)


class TestActiveSceneAndRevealedRoll(ServerTestCase):
    def test_active_scene_round_trip(self):
        status, _ = self.request('PUT', '/api/active-scene', body=b'{"slug": "some-scene"}')
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/active-scene')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)['slug'], 'some-scene')

    def test_scene_layout_round_trip(self):
        """Per-scene location layout survives a PUT → GET cycle untouched."""
        layout = {
            'cols': 6, 'rows': 4,
            'placements': [
                {'location': 'loc-lobby', 'col': 1, 'row': 1, 'colSpan': 4, 'rowSpan': 4},
                {'location': 'loc-vault', 'col': 5, 'row': 1, 'colSpan': 2, 'rowSpan': 2},
            ],
        }
        body = json.dumps({'name': 'Bank Job', 'layout': layout}).encode('utf-8')
        status, _ = self.request('PUT', '/api/scenes/bank-job', body=body)
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/scenes/bank-job')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data).get('layout'), layout)

    def test_scene_layout_absent_stays_absent(self):
        body = json.dumps({'name': 'No Layout'}).encode('utf-8')
        status, _ = self.request('PUT', '/api/scenes/plain', body=body)
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/scenes/plain')
        self.assertEqual(status, 200)
        self.assertNotIn('layout', json.loads(data))

    def test_scene_layout_builder_page_served(self):
        status, data = self.request('GET', '/scene-layout-builder.html')
        self.assertEqual(status, 200)
        self.assertIn(b'Scene Display Layout Builder', data)

    def test_revealed_roll_round_trip(self):
        status, _ = self.request('PUT', '/api/revealed-roll', body=b'{"tokenName": "Test", "min": 1}')
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/revealed-roll')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)['tokenName'], 'Test')


class TestHeroPointsApi(ServerTestCase):
    def test_hero_points_round_trip_and_cap(self):
        status, _ = self.request('POST', '/api/hero-points', body=json.dumps({'issue': 'iss-1', 'hero': 'lumen', 'delta': 1}).encode('utf-8'))
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/hero-points')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data), {'iss-1': {'lumen': 1}})

        # Earn past the RAW cap of 5 — server clamps.
        for _ in range(6):
            self.request('POST', '/api/hero-points', body=json.dumps({'issue': 'iss-1', 'hero': 'lumen', 'delta': 1}).encode('utf-8'))
        _, data = self.request('GET', '/api/hero-points')
        self.assertEqual(json.loads(data)['iss-1']['lumen'], 5)

        # Counter can go back down, and an issue reset clears everything.
        self.request('POST', '/api/hero-points', body=json.dumps({'issue': 'iss-1', 'hero': 'lumen', 'delta': -2}).encode('utf-8'))
        _, data = self.request('GET', '/api/hero-points')
        self.assertEqual(json.loads(data)['iss-1']['lumen'], 3)
        status, _ = self.request('POST', '/api/hero-points', body=json.dumps({'issue': 'iss-1', 'reset': True}).encode('utf-8'))
        self.assertEqual(status, 200)
        _, data = self.request('GET', '/api/hero-points')
        self.assertEqual(json.loads(data), {})

    def test_hero_points_scoped_per_issue(self):
        for iss in ('iss-1', 'iss-2'):
            self.request('POST', '/api/hero-points', body=json.dumps({'issue': iss, 'hero': 'lumen', 'delta': 1}).encode('utf-8'))
        _, data = self.request('GET', '/api/hero-points')
        parsed = json.loads(data)
        self.assertEqual(parsed['iss-1']['lumen'], 1)
        self.assertEqual(parsed['iss-2']['lumen'], 1)

    def test_hero_points_missing_issue_rejected(self):
        status, _ = self.request('POST', '/api/hero-points', body=json.dumps({'hero': 'lumen', 'delta': 1}).encode('utf-8'))
        self.assertEqual(status, 400)

    def test_social_hero_point_once_per_scene_and_hero_set(self):
        body = {
            'issue': 'iss-1', 'awardTeam': True, 'reason': 'social',
            'scene': 'talk', 'sceneType': 'Social',
            'drivers': ['muse', 'legacy'], 'heroes': ['muse', 'legacy'],
        }
        status, data = self.request('POST', '/api/hero-points', body=json.dumps(body).encode('utf-8'))
        self.assertEqual(status, 200)
        parsed = json.loads(data)
        self.assertEqual(parsed['iss-1']['muse'], 1)
        self.assertEqual(parsed['iss-1']['legacy'], 1)
        status, data = self.request('POST', '/api/hero-points', body=json.dumps(body).encode('utf-8'))
        self.assertEqual(status, 409)
        self.assertIn('already awarded', json.loads(data)['error'])
        other = dict(body, scene='talk-2')
        status, data = self.request('POST', '/api/hero-points', body=json.dumps(other).encode('utf-8'))
        self.assertEqual(status, 409)
        self.assertIn('combination', json.loads(data)['error'])
        mixed = dict(body, scene='talk-3', drivers=['muse', 'tachyon'])
        status, data = self.request('POST', '/api/hero-points', body=json.dumps(mixed).encode('utf-8'))
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)['iss-1']['muse'], 2)

    def test_scene_rejects_two_environments(self):
        body = json.dumps({'name': 'Dock', 'environments': ['a', 'b']}).encode('utf-8')
        status, data = self.request('PUT', '/api/scenes/dock', body=body)
        self.assertEqual(status, 400)
        self.assertIn('one environment', json.loads(data)['error'])
        ok = json.dumps({'name': 'Dock', 'environment': 'dockside'}).encode('utf-8')
        status, _ = self.request('PUT', '/api/scenes/dock', body=ok)
        self.assertEqual(status, 200)


class TestSceneNotesApi(ServerTestCase):
    def _make_scene(self, slug, name):
        scenes = self.campaign / 'scenes'
        scenes.mkdir(exist_ok=True)
        (scenes / (slug + '.json')).write_text(json.dumps({'name': name}), encoding='utf-8')

    def test_returns_notes_from_scene_named_folder_only(self):
        self._make_scene('montage-1', 'Montage #1')
        self._make_scene('the-cozy-thimble', 'The Cozy Thimble')
        scenes = self.campaign / 'scenes'
        (scenes / 'Montage #1').mkdir()
        (scenes / 'Montage #1' / 'notes.md').write_text('# Montage\nContent', encoding='utf-8')
        (scenes / 'The Cozy Thimble').mkdir()
        (scenes / 'The Cozy Thimble' / 'notes.md').write_text('Other scene', encoding='utf-8')
        (scenes / 'stray.md').write_text('flat file should be ignored', encoding='utf-8')
        status, data = self.request('GET', '/api/scene-notes/montage-1')
        self.assertEqual(status, 200)
        payload = json.loads(data)
        self.assertEqual(payload['name'], 'Montage #1')
        self.assertEqual(payload['notes'], {'notes.md': '# Montage\nContent'})

    def test_case_insensitive_folder_match(self):
        self._make_scene('hub-police-arrive', 'Hub Police Arrive')
        scenes = self.campaign / 'scenes'
        (scenes / 'hub police arrive').mkdir()
        (scenes / 'hub police arrive' / 'notes.md').write_text('Wrong-case folder', encoding='utf-8')
        status, data = self.request('GET', '/api/scene-notes/hub-police-arrive')
        self.assertEqual(status, 200)
        payload = json.loads(data)
        self.assertEqual(payload['notes'], {'notes.md': 'Wrong-case folder'})

    def test_scene_without_notes_folder_returns_empty_notes(self):
        self._make_scene('the-cozy-thimble', 'The Cozy Thimble')
        status, data = self.request('GET', '/api/scene-notes/the-cozy-thimble')
        self.assertEqual(status, 200)
        payload = json.loads(data)
        self.assertEqual(payload['name'], 'The Cozy Thimble')
        self.assertEqual(payload['notes'], {})

    def test_unknown_scene_returns_404(self):
        status, _ = self.request('GET', '/api/scene-notes/does-not-exist')
        self.assertEqual(status, 404)


class TestBackgroundsApi(ServerTestCase):
    def test_unsupported_content_type_rejected(self):
        status, data = self.request('PUT', '/api/backgrounds/test-key', body=b'not an image',
                                     headers={'Content-Type': 'text/plain'})
        self.assertEqual(status, 400)

    def test_png_round_trips_and_meta_updates(self):
        png_bytes = b'\x89PNG\r\n\x1a\nfake-but-good-enough-for-this-test'
        status, _ = self.request('PUT', '/api/backgrounds/test-key', body=png_bytes,
                                  headers={'Content-Type': 'image/png'})
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/backgrounds/test-key')
        self.assertEqual(status, 200)
        self.assertEqual(data, png_bytes)
        meta = json.loads((self.campaign / 'backgrounds' / '_meta.json').read_text(encoding='utf-8'))
        self.assertEqual(meta.get('test-key'), 'image/png')

    def test_delete_missing_key_does_not_error(self):
        status, _ = self.request('DELETE', '/api/backgrounds/never-existed')
        self.assertEqual(status, 200)

    def test_get_missing_key_returns_404(self):
        status, _ = self.request('GET', '/api/backgrounds/never-existed')
        self.assertEqual(status, 404)

    def test_list_background_keys(self):
        status, data = self.request('GET', '/api/backgrounds')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data), [])
        png_bytes = b'\x89PNG\r\n\x1a\nfake'
        self.request('PUT', '/api/backgrounds/portrait-villain-demo', body=png_bytes,
                     headers={'Content-Type': 'image/png'})
        status, data = self.request('GET', '/api/backgrounds')
        self.assertEqual(status, 200)
        self.assertIn('portrait-villain-demo', json.loads(data))


class TestRulesApi(ServerTestCase):
    """Reads the real rules/ folder shipped with the app -- not a scratch copy."""

    def test_lists_all_shipped_rule_files(self):
        status, data = self.request('GET', '/api/rules')
        self.assertEqual(status, 200)
        items = json.loads(data)
        expected_count = len(list(srv.iter_rule_files()))
        self.assertEqual(len(items), expected_count)
        self.assertGreater(expected_count, 0)

    def test_numbered_rule_files_are_naturally_sorted(self):
        status, data = self.request('GET', '/api/rules')
        self.assertEqual(status, 200)
        hero_chapter = [item['slug'] for item in json.loads(data)
                        if item['slug'].startswith('Ch 3 - Creating Heroes--')]
        numbers = [int(slug.split('--', 1)[1].split('.', 1)[0])
                   for slug in hero_chapter]
        self.assertEqual(numbers, sorted(numbers))

    def test_title_extracted_from_first_heading(self):
        status, data = self.request('GET', '/api/rules')
        items = json.loads(data)
        self.assertTrue(items)
        first = items[0]
        self.assertTrue(len(first['title']) > 0)
        from urllib.parse import quote
        body_status, body = self.request('GET', '/api/rules/' + quote(first['slug'], safe=''))
        self.assertEqual(body_status, 200)
        self.assertTrue(len(body) > 0)


class TestHeroBuilder(ServerTestCase):
    def test_builder_html_served(self):
        status, data = self.request('GET', '/builder.html')
        self.assertEqual(status, 200)
        self.assertIn(b'Save to VTT + Occidia', data)
        self.assertIn(b'/builder-hub.html', data)

    def test_save_hero_upserts_csv_md_and_obsidian(self):
        vault = Path(self.tmpdir) / 'pcs'
        self.httpd.shutdown()
        self.httpd.server_close()
        self.thread.join(timeout=5)
        self.httpd = srv.ThreadingHTTPServer(
            ('127.0.0.1', 0), srv.make_handler(self.campaign, vault))
        self.port = self.httpd.server_address[1]
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

        payload = json.dumps({
            'name': 'Lumen',
            'player': 'Cherise',
            'alias': 'Test',
            'personality': 'Sarcastic',
            'greenStatusDie': 'd8',
            'yellowStatusDie': 'd8',
            'redStatusDie': 'd8',
            'maxHealth': 28,
            'out': 'Out: Hinder an opponent by rolling your single [quality] die.',
            'powers': [{'name': 'Radiant', 'die': 'd10', 'displayName': 'Starburst'}],
            'qualities': [{'name': 'Creativity', 'die': 'd8', 'displayName': 'Vision'}],
            'abilities': [{'zone': 'Red', 'name': 'Powerful Strike', 'type': 'A',
                           'text': 'Attack using [power]. Use your Max+Mid dice.'}],
        })
        status, data = self.request(
            'POST', '/api/builder/hero', body=payload,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        result = json.loads(data)
        self.assertEqual(result['slug'], 'lumen')
        csv_text = (self.campaign / 'players.csv').read_text(encoding='utf-8')
        self.assertIn('Lumen', csv_text)
        self.assertIn('Radiant', csv_text)
        self.assertIn('Starburst', csv_text)
        self.assertIn('Vision', csv_text)
        md = (self.campaign / 'md' / 'heroes' / 'lumen.md').read_text(encoding='utf-8')
        self.assertIn('Powerful Strike', md)
        self.assertIn('Sarcastic', md)
        self.assertIn('## Builder', md)
        note = vault / 'Lumen.md'
        self.assertTrue(note.exists())
        self.assertIn('player: Cherise', note.read_text(encoding='utf-8'))

    def test_save_hero_keeps_discrete_yellow_zone(self):
        payload = json.dumps({
            'name': 'Mover',
            'powers': [{'name': 'Speed', 'die': 'd10'}],
            'qualities': [{'name': 'Fitness', 'die': 'd8'}],
            'abilities': [
                {'zone': 'Green', 'name': 'Hit & Run', 'type': 'A', 'text': 'Attack using Speed.'},
                {'zone': 'Yellow', 'name': 'Run Down', 'type': 'A', 'text': 'Attack multiple targets using Speed.'},
                {'zone': 'Green/Yellow', 'name': 'Legacy Shorthand', 'type': 'A', 'text': 'Attack using Speed.'},
            ],
        })
        status, data = self.request(
            'POST', '/api/builder/hero', body=payload,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        with (self.campaign / 'abilities.csv').open(encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        zones = {r['Name']: r['Zone'] for r in rows if r.get('Slug') == 'mover' or r.get('HeroSlug') == 'mover'}
        self.assertEqual(zones['Hit & Run'], 'Green')
        self.assertEqual(zones['Run Down'], 'Yellow')
        self.assertEqual(zones['Legacy Shorthand'], 'Green')

    def test_save_hero_writes_modular_modes_and_ability_mode_link(self):
        payload = json.dumps({
            'name': 'Gearshift',
            'archetype': 'Modular',
            'powers': [
                {'name': 'Energy Blast', 'die': 'd10'},
                {'name': 'Flight', 'die': 'd8'},
                {'name': 'Force Field', 'die': 'd8'},
                {'name': 'Density Control', 'die': 'd6'},
            ],
            'abilities': [
                {'zone': 'Green', 'name': 'Switch', 'type': 'A',
                 'text': 'Boost yourself using [power/quality]. Then change modes.'},
                {'zone': 'Yellow', 'name': 'Bombardment', 'type': 'A', 'mode': 'modular-bombardment',
                 'text': 'Defend yourself using [power]. You may Attack one target with your Max die.'},
            ],
            'modes': [
                {'slug': 'default', 'name': 'Default Mode', 'zone': 'Green', 'default': True,
                 'powers': {'Energy Blast': 'd10', 'Flight': 'd8', 'Force Field': 'd8', 'Density Control': 'd6'},
                 'lockedActions': [], 'immobile': False, 'powerless': False},
                {'slug': 'modular-bombardment', 'name': 'Bombardment Mode', 'zone': 'Yellow', 'default': False,
                 'powers': {'Energy Blast': 'd12', 'Flight': 'd6', 'Force Field': 'd6'},
                 'lockedActions': ['Boost', 'Hinder', 'Overcome'], 'immobile': False, 'powerless': False},
                {'slug': 'powerless', 'name': 'Powerless Mode', 'zone': '', 'default': False,
                 'powers': {'Flight': 'd6', 'Force Field': 'd10'},
                 'lockedActions': [], 'immobile': False, 'powerless': True},
            ],
        })
        status, data = self.request(
            'POST', '/api/builder/hero', body=payload,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        md = (self.campaign / 'md' / 'heroes' / 'gearshift.md').read_text(encoding='utf-8')
        self.assertIn('## Modes', md)
        self.assertIn('modular-bombardment', md)
        self.assertIn('Powerless Mode', md)
        with (self.campaign / 'abilities.csv').open(encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        modes = {r['Name']: r.get('Mode', '') for r in rows if (r.get('Slug') or '') == 'gearshift'}
        self.assertEqual(modes['Switch'], '')
        self.assertEqual(modes['Bombardment'], 'modular-bombardment')

    def test_save_hero_requires_name(self):
        status, data = self.request(
            'POST', '/api/builder/hero', body='{}',
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 400)


class TestVillainBuilder(ServerTestCase):
    def test_builder_hub_served(self):
        status, data = self.request('GET', '/builder-hub.html')
        self.assertEqual(status, 200)
        self.assertIn(b'Hero Builder', data)
        self.assertIn(b'Villain Builder', data)
        self.assertIn(b'Issue Builder', data)
        self.assertIn(b'/issue-builder.html', data)
        self.assertIn(b'/builder.html', data)
        self.assertIn(b'/villain-builder.html', data)
        self.assertIn(b'/minion-builder.html', data)
        self.assertIn(b'/environment-builder.html', data)

    def test_villain_builder_html_served(self):
        status, data = self.request('GET', '/villain-builder.html')
        self.assertEqual(status, 200)
        self.assertIn(b'Save to Library', data)
        self.assertIn(b'/builder-hub.html', data)
        self.assertIn(b'Finishing Touches', data)
        self.assertIn(b'Look &amp; references', data)
        self.assertIn(b'Collapse all', data)


    def test_save_villain_writes_abilities_csv(self):
        import csv
        payload = json.dumps({
            'name': 'Test Blade',
            'slug': 'test-blade',
            'approach': 'Mastermind',
            'archetype': 'Inventor',
            'maxHealth': 40,
            'abilities': [
                {'name': 'Clever Strike', 'type': 'A', 'text': 'Attack using [quality]. Defend using your Min die.', 'icons': 'Attack, Defend'},
                {'name': 'Passive Trait', 'type': 'I', 'text': 'Increase all bonuses you create by 1.'},
            ],
            'upgrades': [{'name': 'Quality Upgrade', 'type': 'I', 'text': 'Increase all quality dice by one size.'}],
            'masteries': [{'name': 'Master of Stuff', 'type': 'I', 'text': 'Automatically succeed at an Overcome involving gadgets.'}],
        })
        status, data = self.request(
            'POST', '/api/builder/villain', body=payload,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        with (self.campaign / 'abilities.csv').open(encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        own = [r for r in rows if r.get('Slug') == 'test-blade']
        by_name = {r['Name']: r for r in own}
        self.assertIn('Clever Strike', by_name)
        self.assertEqual(by_name['Clever Strike']['RollType'], 'Attack, Defend')
        self.assertEqual(by_name['Passive Trait']['RollType'], '')
        self.assertEqual(by_name['Quality Upgrade']['Zone'], 'Upgrade')
        self.assertEqual(by_name['Master of Stuff']['Zone'], 'Mastery')
        self.assertIn('Overcome', by_name['Master of Stuff']['RollType'])


    def test_issue_builder_html_served(self):
        status, data = self.request('GET', '/issue-builder.html')
        self.assertEqual(status, 200)
        self.assertIn(b'Issue Builder', data)

    def test_minion_builder_html_served(self):
        status, data = self.request('GET', '/minion-builder.html')
        self.assertEqual(status, 200)
        self.assertIn(b'Minion / Lieutenant Builder', data)
        self.assertIn(b'Save to Library', data)

    def test_environment_builder_html_served(self):
        status, data = self.request('GET', '/environment-builder.html')
        self.assertEqual(status, 200)
        self.assertIn(b'Environment Builder', data)

    def test_save_minion_upserts_csv_and_md(self):
        payload = json.dumps({'name': 'Street Thug', 'type': 'Minion', 'die': 'd6', 'faction': 'Citizens'})
        status, data = self.request(
            'POST', '/api/builder/minion', body=payload,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        self.assertEqual(json.loads(data)['slug'], 'street-thug')
        csv_text = (self.campaign / 'minions.csv').read_text(encoding='utf-8')
        self.assertIn('Street Thug', csv_text)
        md = (self.campaign / 'md' / 'minions' / 'street-thug.md').read_text(encoding='utf-8')
        self.assertIn('## Builder', md)

    def test_save_environment_requires_name(self):
        status, data = self.request(
            'POST', '/api/builder/environment', body='{}',
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 400)

    def test_md_rejects_unsafe_slug(self):
        from urllib.parse import quote
        bad = quote('A few screaming citizens are hanging on for dear life', safe='')
        status, data = self.request('PUT', f'/api/md/environments/{bad}', body=b'x')
        self.assertEqual(status, 400)
        status, data = self.request('GET', f'/api/md/environments/{bad}')
        self.assertEqual(status, 400)
        status, _ = self.request('PUT', '/api/md/environments/ok-env-slug', body=b'# ok\n')
        self.assertEqual(status, 200)

    def test_save_environment_twists_minions_locations(self):
        import csv
        # seed a location + minion
        loc_path = self.campaign / 'locations.csv'
        loc_path.write_text('Slug,Name,EnvironmentSlug\nlab-floor,Lab Floor,\n', encoding='utf-8')
        min_path = self.campaign / 'minions.csv'
        min_path.write_text(
            'Slug,Name,Type,Die,Faction,PerHero,Active,Origin,Affiliation\n'
            'imp,Imp,Minion,d6,,,true,custom,Enemy\n'
            'boss-imp,Boss Imp,Lieutenant,d10,,,true,custom,Enemy\n',
            encoding='utf-8')
        payload = json.dumps({
            'name': 'Haunted Lab',
            'slug': 'haunted-lab',
            'active': True,
            'origin': 'custom',
            'traits': [
                {'name': 'TOXIC FUMES', 'die': 'd8'},
                {'name': 'UNSTABLE GEAR', 'die': 'd8'},
                {'name': 'GHOST CURRENTS', 'die': 'd10'},
            ],
            'twists': {
                'green': {
                    'minor1': {'name': 'Leak', 'description': 'Hinder with Min'},
                    'minor2': {'name': '', 'description': ''},
                    'major': {'name': 'Sirens', 'description': 'Advance tracker'},
                },
                'yellow': {
                    'minor1': {'name': 'Spark', 'description': 'Damage Mid'},
                    'minor2': {'name': '', 'description': ''},
                    'major': {'name': '', 'description': ''},
                },
                'red': {
                    'minor1': {'name': '', 'description': ''},
                    'minor2': {'name': '', 'description': ''},
                    'major': {'name': 'Collapse', 'description': 'Scene-wide damage'},
                },
            },
            'minionSlugs': ['imp'],
            'lieutenantSlugs': ['boss-imp'],
            'locationSlugs': ['lab-floor'],
            'notes': 'Lab notes',
        })
        status, data = self.request(
            'POST', '/api/builder/environment', body=payload,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        self.assertEqual(json.loads(data)['slug'], 'haunted-lab')
        with (self.campaign / 'environments.csv').open(encoding='utf-8') as fh:
            row = next(r for r in csv.DictReader(fh) if r['Slug'] == 'haunted-lab')
        self.assertEqual(row.get('Trait1'), 'TOXIC FUMES')
        self.assertEqual(row.get('GreenMinorTwist1'), 'Leak')
        self.assertEqual(row.get('GreenMinorTwist1Description'), 'Hinder with Min')
        self.assertEqual(row.get('GreenMajorTwist'), 'Sirens')
        self.assertEqual(row.get('YellowMinorTwist1'), 'Spark')
        self.assertEqual(row.get('RedMajorTwist'), 'Collapse')
        self.assertEqual(row.get('MinionSlugs'), 'imp')
        self.assertEqual(row.get('LieutenantSlugs'), 'boss-imp')
        with loc_path.open(encoding='utf-8') as fh:
            loc = next(r for r in csv.DictReader(fh) if r['Slug'] == 'lab-floor')
        self.assertEqual(loc.get('EnvironmentSlug'), 'haunted-lab')
        md = (self.campaign / 'md' / 'environments' / 'haunted-lab.md').read_text(encoding='utf-8')
        self.assertIn('Lab notes', md)
        # unlinking locations on next save
        payload2 = json.dumps({
            'name': 'Haunted Lab', 'slug': 'haunted-lab',
            'traits': [{'name': 'TOXIC FUMES', 'die': 'd8'}, {'name': 'x', 'die': 'd8'}, {'name': 'y', 'die': 'd8'}],
            'twists': {}, 'minionSlugs': [], 'lieutenantSlugs': [], 'locationSlugs': [],
        })
        status, _ = self.request(
            'POST', '/api/builder/environment', body=payload2,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200)
        with loc_path.open(encoding='utf-8') as fh:
            loc = next(r for r in csv.DictReader(fh) if r['Slug'] == 'lab-floor')
        self.assertEqual(loc.get('EnvironmentSlug') or '', '')

    def test_catalog_csv_served(self):
        status, data = self.request('GET', '/builder/catalog/villain_approaches.csv')
        self.assertEqual(status, 200)
        self.assertIn(b'generalist', data)
        status, data = self.request('GET', '/builder/catalog/villain_approach_abilities.csv')
        self.assertEqual(status, 200)
        self.assertIn(b'Best in the Biz', data)
        status, data = self.request('GET', '/builder/catalog/villain_archetypes.csv')
        self.assertIn(b'd10', data)
        status, data = self.request('GET', '/builder/catalog/villain_masteries.csv')
        self.assertEqual(status, 200)
        self.assertIn(b'Master of Superiority', data)

    def test_save_villain_requires_name(self):
        status, data = self.request(
            'POST', '/api/builder/villain', body='{}',
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 400)

    def test_save_villain_rejects_sixth_ability(self):
        payload = json.dumps({
            'name': 'Too Many',
            'abilities': [{'name': f'A{i}', 'type': 'A', 'icon': 'Attack', 'text': 'x'}
                          for i in range(6)],
        })
        status, data = self.request(
            'POST', '/api/builder/villain', body=payload,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 400)
        self.assertIn(b'max 5', data)

    def test_save_villain_upserts_csv_and_md(self):
        payload = json.dumps({
            'name': 'Firearm',
            'concept': 'Shockers lieutenant in a lab coat. Name TBD.',
            'approach': 'Focused',
            'archetype': 'Fragile',
            'maxHealth': 30,
            'greenFloor': 23,
            'yellowFloor': 12,
            'redFloor': 1,
            'greenStatusDie': 'd8',
            'yellowStatusDie': 'd6',
            'redStatusDie': 'd4',
            'powers': [{'name': 'Fire', 'die': 'd10'}],
            'qualities': [{'name': 'Science', 'die': 'd8'}],
            'abilities': [
                {'name': 'Unstable Ignition', 'type': 'A', 'icon': 'Attack',
                 'text': 'Attack using Fire. Use your Max die.'},
            ],
            'upgrade': {'name': 'Firewall', 'type': 'I', 'icon': 'Defend',
                        'text': '+10 Health. Defend nearby allies using Fire.',
                        'health': 10},
            'mastery': {'name': 'Master of Combustion', 'type': 'I', 'icon': 'Overcome',
                        'text': 'Automatically succeed Overcomes involving fire or chemistry.'},
            'builderState': {'ap': 'focused', 'ar': 'fragile', 'pickedAp': [], 'pickedAr': [],
                             'binds': {}, 'displayNames': {}, 'up': None, 'ma': None, 'heroCount': 5},
        })
        status, data = self.request(
            'POST', '/api/builder/villain', body=payload,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        result = json.loads(data)
        self.assertEqual(result['slug'], 'firearm')
        csv_text = (self.campaign / 'villains.csv').read_text(encoding='utf-8')
        self.assertIn('Firearm', csv_text)
        self.assertIn('Focused', csv_text)
        md = (self.campaign / 'md' / 'villains' / 'firearm.md').read_text(encoding='utf-8')
        self.assertIn('### [A] [Attack] "Unstable Ignition"', md)
        self.assertIn('## Upgrades', md)
        self.assertIn('## Mastery', md)
        self.assertIn('## Biography', md)
        self.assertIn('## Capabilities and Motivations', md)
        self.assertIn('## Physical Attributes', md)
        self.assertIn('## Upgrade Summary', md)
        self.assertIn('## References', md)
        self.assertIn('## Builder', md)


class TestActiveFlagAndMinionNotes(ServerTestCase):
    def test_csv_headers_include_active(self):
        for headers in (srv.HEROES_HEADERS, srv.VILLAINS_HEADERS, srv.MINIONS_HEADERS, srv.ENVIRONMENTS_HEADERS):
            self.assertIn('Active', headers)

    def test_minion_description_stays_separate_from_abilities(self):
        payload = json.dumps({
            'name': 'Hostage',
            'type': 'Minion',
            'die': 'd8',
            'description': 'A civilian tied to a chair.',
            'tactics': 'Does not fight.',
            'abilities': [{'name': 'Pile On', 'text': 'Attack using the minion die.'}],
            'active': True,
        })
        status, data = self.request(
            'POST', '/api/builder/minion', body=payload,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        md = (self.campaign / 'md' / 'minions' / 'hostage.md').read_text(encoding='utf-8')
        desc = md.split('## Description', 1)[1].split('## Abilities', 1)[0]
        self.assertIn('civilian tied to a chair', desc)
        self.assertNotIn('Pile On', desc)
        self.assertIn('### [A] [None] "Pile On"', md)
        csv_text = (self.campaign / 'minions.csv').read_text(encoding='utf-8')
        self.assertIn('Active', csv_text.splitlines()[0])
        self.assertIn('true', csv_text.lower())

    def test_inactive_villain_writes_false(self):
        payload = json.dumps({
            'name': 'Retired Threat',
            'approach': 'Focused',
            'archetype': 'Fragile',
            'active': False,
        })
        status, data = self.request(
            'POST', '/api/builder/villain', body=payload,
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        rows = list(csv.DictReader((self.campaign / 'villains.csv').open(encoding='utf-8')))
        hit = next(r for r in rows if r['Slug'] == 'retired-threat')
        self.assertEqual(hit.get('Active'), 'false')

    def test_active_save_does_not_overwrite_origin(self):
        first = json.dumps({'name': 'Book Brute', 'approach': 'Focused', 'active': True, 'origin': 'premade'})
        status, data = self.request('POST', '/api/builder/villain', body=first,
                                   headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        second = json.dumps({'name': 'Book Brute', 'approach': 'Focused', 'active': False, 'origin': 'premade'})
        status, data = self.request('POST', '/api/builder/villain', body=second,
                                   headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        with (self.campaign / 'villains.csv').open(encoding='utf-8') as fh:
            hit = next(r for r in csv.DictReader(fh) if r['Slug'] == 'book-brute')
        self.assertEqual(hit.get('Active'), 'false')
        self.assertEqual(hit.get('Origin'), 'premade')

    def test_minion_abilities_extracted_from_description(self):
        payload = json.dumps({
            'name': 'Thug',
            'type': 'Minion',
            'die': 'd8',
            'description': 'A hired goon.\n\n### [A] [None] "Pile On"\nAttack using the minion die.',
            'tactics': 'Rush.',
            'abilities': [],
            'npc': True,
        })
        status, data = self.request('POST', '/api/builder/minion', body=payload,
                                   headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200, data)
        md = (self.campaign / 'md' / 'minions' / 'thug.md').read_text(encoding='utf-8')
        desc = md.split('## Description', 1)[1].split('## Abilities', 1)[0]
        self.assertIn('hired goon', desc)
        self.assertNotIn('Pile On', desc)
        self.assertIn('### [A] [None] "Pile On"', md)
        with (self.campaign / 'npcs.csv').open(encoding='utf-8') as fh:
            hit = next(r for r in csv.DictReader(fh) if r['Slug'] == 'thug')
        self.assertEqual(hit.get('Name'), 'Thug')
        with (self.campaign / 'minions.csv').open(encoding='utf-8') as fh:
            slugs = [r['Slug'] for r in csv.DictReader(fh)]
        self.assertNotIn('thug', slugs)

    def test_minion_save_does_not_wipe_npcs(self):
        npc = json.dumps({'name': 'Hostage', 'type': 'Minion', 'die': 'd8', 'npc': True, 'active': True})
        minion = json.dumps({'name': 'Street Thug', 'type': 'Minion', 'die': 'd6', 'npc': False, 'active': True})
        self.assertEqual(self.request('POST', '/api/builder/minion', body=npc,
                                     headers={'Content-Type': 'application/json'})[0], 200)
        self.assertEqual(self.request('POST', '/api/builder/minion', body=minion,
                                     headers={'Content-Type': 'application/json'})[0], 200)
        with (self.campaign / 'npcs.csv').open(encoding='utf-8') as fh:
            npc_slugs = [r['Slug'] for r in csv.DictReader(fh)]
        with (self.campaign / 'minions.csv').open(encoding='utf-8') as fh:
            min_slugs = [r['Slug'] for r in csv.DictReader(fh)]
        self.assertIn('hostage', npc_slugs)
        self.assertNotIn('hostage', min_slugs)
        self.assertIn('street-thug', min_slugs)
        self.assertNotIn('street-thug', npc_slugs)

    def test_headers_include_origin_and_npcs_file(self):
        self.assertIn('Origin', srv.HEROES_HEADERS)
        self.assertIn('Origin', srv.VILLAINS_HEADERS)
        self.assertNotIn('NPC', srv.MINIONS_HEADERS)
        self.assertIn('npcs', srv.CSV_FILES)

    def test_npc_non_combat_and_hero_types_save(self):
        non = json.dumps({
            'name': 'Shopkeep', 'type': 'Bystander', 'die': 'd8',
            'npc': True, 'active': True, 'affiliation': 'Neutral',
        })
        hero = json.dumps({
            'name': 'Ally Cape', 'type': 'Hero', 'die': 'd10',
            'npc': True, 'active': True, 'affiliation': 'Ally',
        })
        self.assertEqual(self.request('POST', '/api/builder/minion', body=non,
                                     headers={'Content-Type': 'application/json'})[0], 200)
        self.assertEqual(self.request('POST', '/api/builder/minion', body=hero,
                                     headers={'Content-Type': 'application/json'})[0], 200)
        with (self.campaign / 'npcs.csv').open(encoding='utf-8') as fh:
            rows = {r['Slug']: r for r in csv.DictReader(fh)}
        self.assertEqual(rows['shopkeep']['Type'], 'Bystander')
        self.assertEqual(rows['shopkeep'].get('Die') or '', '')
        self.assertEqual(rows['ally-cape']['Type'], 'Hero')
        self.assertEqual(rows['ally-cape']['Die'], 'd10')
        self.assertEqual(rows['ally-cape'].get('PerHero') or '', '')
        with (self.campaign / 'minions.csv').open(encoding='utf-8') as fh:
            min_slugs = [r['Slug'] for r in csv.DictReader(fh)]
        self.assertNotIn('shopkeep', min_slugs)
        self.assertNotIn('ally-cape', min_slugs)


class TestConcurrencyAndEvents(ServerTestCase):
    """STATE_LOCK + atomic writes: concurrent writers must never lose updates
    or leave partial files behind, and /api/events must push version bumps."""

    def _tmp_names(self, d):
        return [p.name for p in d.iterdir()
                if p.name.endswith('.tmp') or p.name.startswith('.')]

    def test_concurrent_merge_puts_no_lost_updates(self):
        # /api/issues/<slug> is a server-side read-merge-write: every key any
        # client PUTs must survive every other client's PUT.
        n_threads, n_ops = 12, 10
        errors = []
        barrier = threading.Barrier(n_threads)

        def worker(t):
            barrier.wait()
            for i in range(n_ops):
                status, _ = self.request(
                    'PUT', '/api/issues/stress',
                    body=json.dumps({f'k{t}_{i}': i}),
                    headers={'Content-Type': 'application/json'})
                if status != 200:
                    errors.append((t, i, status))

        threads = [threading.Thread(target=worker, args=(t,)) for t in range(n_threads)]
        for th in threads:
            th.start()
        for th in threads:
            th.join(timeout=30)
        self.assertEqual(errors, [])
        doc = json.loads((self.campaign / 'issues' / 'stress.json').read_text(encoding='utf-8'))
        expected = {f'k{t}_{i}': i for t in range(n_threads) for i in range(n_ops)}
        self.assertEqual(doc, expected)
        self.assertEqual(self._tmp_names(self.campaign / 'issues'), [])

    def test_concurrent_scene_puts_never_partial(self):
        # Full-replace scene PUTs from many threads while a reader hammers the
        # file: atomic replace means every read parses and the final file is
        # exactly one complete payload — never a torn/truncated write.
        n_threads, n_ops = 8, 15
        errors = []
        read_errors = []
        stop = threading.Event()
        scene_path = self.campaign / 'scenes' / 'torn.json'

        def reader():
            while not stop.is_set():
                try:
                    json.loads(scene_path.read_text(encoding='utf-8'))
                except FileNotFoundError:
                    pass
                except Exception as e:  # a torn write would land here
                    read_errors.append(repr(e))

        def writer(t):
            for i in range(n_ops):
                body = json.dumps({'name': f'scene-{t}', 'round': i,
                                   'tokens': [{'id': f'{t}-{i}'}]})
                status, _ = self.request(
                    'PUT', '/api/scenes/torn', body=body,
                    headers={'Content-Type': 'application/json'})
                if status != 200:
                    errors.append((t, i, status))

        rt = threading.Thread(target=reader, daemon=True)
        rt.start()
        threads = [threading.Thread(target=writer, args=(t,)) for t in range(n_threads)]
        for th in threads:
            th.start()
        for th in threads:
            th.join(timeout=30)
        stop.set()
        rt.join(timeout=5)
        self.assertEqual(errors, [])
        self.assertEqual(read_errors, [])
        doc = json.loads(scene_path.read_text(encoding='utf-8'))
        self.assertIn(doc['round'], range(n_ops))
        self.assertEqual(self._tmp_names(self.campaign / 'scenes'), [])

    def test_concurrent_sheet_key_generation_no_lost_updates(self):
        # sheet-keys.json is a server-side read-modify-write over one shared
        # store: 12 concurrent generates for 12 distinct heroes must all land.
        n_threads = 12
        errors = []
        barrier = threading.Barrier(n_threads)

        def worker(t):
            barrier.wait()
            status, _ = self.request(
                'POST', '/api/sheet-keys',
                body=json.dumps({'hero': f'hero-{t}'}),
                headers={'Content-Type': 'application/json'})
            if status != 200:
                errors.append((t, status))

        threads = [threading.Thread(target=worker, args=(t,)) for t in range(n_threads)]
        for th in threads:
            th.start()
        for th in threads:
            th.join(timeout=30)
        self.assertEqual(errors, [])
        keys = json.loads((self.campaign / 'sheet-keys.json').read_text(encoding='utf-8'))
        self.assertEqual(sorted(keys.keys()), sorted(f'hero-{t}' for t in range(n_threads)))
        self.assertTrue(all(keys.values()))
        self.assertEqual(self._tmp_names(self.campaign), [])

    def test_events_stream_pushes_version_on_write(self):
        conn = http.client.HTTPConnection('127.0.0.1', self.port, timeout=10)
        self.addCleanup(conn.close)
        conn.request('GET', '/api/events')
        resp = conn.getresponse()
        self.assertEqual(resp.status, 200)
        self.assertIn('text/event-stream', resp.getheader('Content-Type') or '')

        def read_event():
            buf = b''
            while b'data:' not in buf:
                chunk = resp.read1(512)
                if not chunk:
                    break
                buf += chunk
            return int(buf.split(b'data:', 1)[1].split(b'\n', 1)[0].strip())

        first = read_event()  # bootstrap event: current version
        self.assertGreaterEqual(first, 0)
        status, _ = self.request(
            'POST', '/api/hero-points',
            body=json.dumps({'issue': 'sse', 'reset': True}),
            headers={'Content-Type': 'application/json'})
        self.assertEqual(status, 200)
        second = read_event()  # pushed the moment the write lands
        self.assertGreater(second, first)


if __name__ == '__main__':
    unittest.main()
