"""
Automated API tests for server.py. Uses Python's stdlib unittest + http.client
against a real ThreadingHTTPServer instance, per CLAUDE.md's stdlib-only
philosophy (no pytest, no new dependencies). Every test runs against a fresh
tempfile.mkdtemp() campaign folder -- never the real campaign/ or Volume1/.

Run with:
    python3 -m unittest discover tests
"""
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
        issue = {'name': 'Test Issue'}
        status, _ = self.request('PUT', '/api/issues/test-issue', body=json.dumps(issue).encode('utf-8'))
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/issues/test-issue')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data), issue)
        status, _ = self.request('DELETE', '/api/issues/test-issue')
        self.assertEqual(status, 200)
        status, _ = self.request('GET', '/api/issues/test-issue')
        self.assertEqual(status, 404)


class TestActiveSceneAndRevealedRoll(ServerTestCase):
    def test_active_scene_round_trip(self):
        status, _ = self.request('PUT', '/api/active-scene', body=b'{"slug": "some-scene"}')
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/active-scene')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)['slug'], 'some-scene')

    def test_revealed_roll_round_trip(self):
        status, _ = self.request('PUT', '/api/revealed-roll', body=b'{"tokenName": "Test", "min": 1}')
        self.assertEqual(status, 200)
        status, data = self.request('GET', '/api/revealed-roll')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)['tokenName'], 'Test')


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


class TestRulesApi(ServerTestCase):
    """Reads the real rules/ folder shipped with the app -- not a scratch copy."""

    def test_lists_all_shipped_rule_files(self):
        status, data = self.request('GET', '/api/rules')
        self.assertEqual(status, 200)
        items = json.loads(data)
        expected_count = len(list(srv.RULES_DIR.glob('*.md')))
        self.assertEqual(len(items), expected_count)
        self.assertGreater(expected_count, 0)

    def test_title_extracted_from_first_heading(self):
        status, data = self.request('GET', '/api/rules')
        items = json.loads(data)
        villain_entry = next(i for i in items if i['slug'] == '05-2-minions-lieutenants-villains')
        self.assertTrue(len(villain_entry['title']) > 0)
        self.assertNotEqual(villain_entry['title'], villain_entry['slug'])


if __name__ == '__main__':
    unittest.main()
