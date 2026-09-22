"""
Player digital character sheets (Phase 1): key auth, sheet payload, notes,
alerts, activity feed. Mirrors test_server.py's harness — real server, scratch
campaign. Run: python3 -m unittest tests.test_player_sheets
"""
import http.client
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server as srv
from test_server import ServerTestCase


def seed_hero(campaign, slug='test-hero', name='Test Hero'):
    rows = srv._csv_rows(campaign / 'players.csv', srv.HEROES_HEADERS)
    rows.append({h: '' for h in srv.HEROES_HEADERS} | {
        'Slug': slug, 'Name': name, 'Alias': 'Alias ' + name,
        'Player': 'Tester', 'MaxHealth': '30', 'GreenStatusDie': 'd12',
        'YellowStatusDie': 'd8', 'RedStatusDie': 'd4', 'Active': 'yes',
        'Principle1Name': 'Principle of Testing',
        'Principle1MinorTwist': 'minor text', 'Principle1MajorTwist': 'major text',
    })
    srv._write_csv(campaign / 'players.csv', srv.HEROES_HEADERS, rows)


def seed_scene(campaign, slug='sc-1', locations=None, tokens=None):
    scene = srv.default_scene('Scene One')
    scene['locations'] = locations or [{'id': 'loc1', 'name': 'Bank Lobby', 'background': None},
                                       {'id': 'loc2', 'name': 'The Vault', 'background': None}]
    scene['tokens'] = tokens or []
    (campaign / 'scenes' / (slug + '.json')).write_text(json.dumps(scene), encoding='utf-8')
    (campaign / 'active_scene.json').write_text(json.dumps({'slug': slug}), encoding='utf-8')


class TestSheetKeys(ServerTestCase):
    def test_generate_and_clear(self):
        seed_hero(self.campaign)
        status, data = self.request('POST', '/api/sheet-keys', json.dumps({'hero': 'test-hero', 'op': 'generate'}))
        self.assertEqual(status, 200)
        key = json.loads(data)['key']
        self.assertTrue(key)
        # reset replaces the key
        status, data = self.request('POST', '/api/sheet-keys', json.dumps({'hero': 'test-hero', 'op': 'generate'}))
        key2 = json.loads(data)['key']
        self.assertNotEqual(key, key2)
        status, data = self.request('POST', '/api/sheet-keys', json.dumps({'hero': 'test-hero', 'op': 'clear'}))
        self.assertEqual(status, 200)
        self.assertEqual(srv.sheet_key_for(self.campaign, 'test-hero'), '')

    def test_key_required_for_hero(self):
        status, _ = self.request('POST', '/api/sheet-keys', json.dumps({'hero': '', 'op': 'generate'}))
        self.assertEqual(status, 400)


class TestPlayerSheetAuth(ServerTestCase):
    def test_invalid_key_403(self):
        seed_hero(self.campaign)
        status, _ = self.request('GET', '/api/player-sheet?hero=test-hero&key=WRONG')
        self.assertEqual(status, 403)

    def test_unknown_hero_403(self):
        status, _ = self.request('GET', '/api/player-sheet?hero=ghost&key=whatever')
        self.assertEqual(status, 403)

    def test_valid_key_returns_payload(self):
        seed_hero(self.campaign)
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})
        status, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        self.assertEqual(status, 200)
        payload = json.loads(data)
        self.assertEqual(payload['row']['Name'], 'Test Hero')
        self.assertEqual(payload['row']['Principle1MinorTwist'], 'minor text')
        self.assertIn('heroPoints', payload)

    def test_payload_excludes_villain_health_numbers(self):
        seed_hero(self.campaign)
        seed_scene(self.campaign, tokens=[
            {'id': 't1', 'kind': 'hero', 'slug': 'test-hero', 'name': 'Test Hero',
             'locationId': 'loc1', 'currentHealth': 20, 'maxHealth': 30},
            {'id': 't2', 'kind': 'villain', 'slug': 'bad-guy', 'name': 'Bad Guy',
             'locationId': 'loc1', 'currentHealth': 7, 'maxHealth': 40},
            {'id': 't3', 'kind': 'minion', 'slug': 'grunt', 'name': 'Grunt',
             'locationId': 'loc2', 'currentHealth': 4, 'maxHealth': 6},
        ])
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        payload = json.loads(data)
        self.assertEqual(payload['location']['name'], 'Bank Lobby')
        occ = {o['slug']: o for o in payload['occupants']}
        self.assertNotIn('t3', occ)  # other location hidden
        self.assertEqual(occ['bad-guy'].get('currentHealth'), None)  # villain numbers hidden
        self.assertEqual(occ['test-hero']['currentHealth'], 20)
        self.assertEqual(occ['bad-guy']['currentDie'], '')


class TestSheetNotes(ServerTestCase):
    def test_save_requires_key_and_round_trips(self):
        seed_hero(self.campaign)
        body = json.dumps({'hero': 'test-hero', 'key': 'bad', 'text': 'hello'})
        status, _ = self.request('POST', '/api/player-notes', body)
        self.assertEqual(status, 403)
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})
        status, _ = self.request('POST', '/api/player-notes',
                                 json.dumps({'hero': 'test-hero', 'key': 'k123', 'text': 'hello gm'}))
        self.assertEqual(status, 200)
        np = srv.sheet_notes_path(self.campaign, 'test-hero')
        assert np is not None
        self.assertEqual(np.read_text(encoding='utf-8'), 'hello gm')
        # GM read endpoint
        status, data = self.request('GET', '/api/sheet-notes/test-hero')
        self.assertEqual(status, 200)
        self.assertEqual(data.decode('utf-8'), 'hello gm')

    def test_notes_save_records_activity(self):
        seed_hero(self.campaign)
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})
        self.request('POST', '/api/player-notes',
                     json.dumps({'hero': 'test-hero', 'key': 'k123', 'text': 'x'}))
        status, data = self.request('GET', '/api/sheet-activity')
        entries = json.loads(data)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]['hero'], 'test-hero')
        self.assertEqual(entries[0]['action'], 'Notes updated')


class TestAlerts(ServerTestCase):
    def test_compose_dismiss_delete(self):
        seed_hero(self.campaign)
        status, data = self.request('POST', '/api/alerts',
                                    json.dumps({'op': 'compose', 'targets': 'all', 'text': 'Break in ten'}))
        self.assertEqual(status, 200)
        alerts = json.loads(data)
        self.assertEqual(len(alerts), 1)
        aid = alerts[0]['id']

        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})
        status, _ = self.request('POST', '/api/alerts',
                                 json.dumps({'op': 'dismiss', 'hero': 'test-hero', 'key': 'bad', 'id': aid}))
        self.assertEqual(status, 403)
        status, _ = self.request('POST', '/api/alerts',
                                 json.dumps({'op': 'dismiss', 'hero': 'test-hero', 'key': 'k123', 'id': aid}))
        self.assertEqual(status, 200)
        alerts = json.loads(json.dumps(srv._load_json_file(self.campaign / 'alerts.json', [])))
        self.assertIn('test-hero', alerts[0]['dismissed'])

        status, _ = self.request('POST', '/api/alerts', json.dumps({'op': 'delete', 'id': aid}))
        self.assertEqual(status, 200)
        self.assertEqual(srv._load_json_file(self.campaign / 'alerts.json', []), [])

    def test_targeted_alert_excludes_other_heroes(self):
        seed_hero(self.campaign, 'a', 'Hero A')
        seed_hero(self.campaign, 'b', 'Hero B')
        self.request('POST', '/api/alerts', json.dumps({'op': 'compose', 'targets': ['a'], 'text': 'only a'}))
        for slug in ('a', 'b'):
            srv._save_json_file(self.campaign / 'sheet-keys.json',
                                dict(srv._load_json_file(self.campaign / 'sheet-keys.json', {}), **{slug: 'k-' + slug}))
        _, data = self.request('GET', '/api/player-sheet?hero=a&key=k-a')
        alerts_a = json.loads(data)['alerts']
        _, data = self.request('GET', '/api/player-sheet?hero=b&key=k-b')
        alerts_b = json.loads(data)['alerts']
        self.assertEqual(len(alerts_a), 1)
        self.assertEqual(alerts_b, [])


class TestHeroPointsScope(ServerTestCase):
    def test_current_issue_resolves_from_active_scene(self):
        seed_hero(self.campaign)
        seed_scene(self.campaign, 's-in-issue')
        issue = {'name': 'Issue One', 'sceneSlugs': ['s-in-issue']}
        (self.campaign / 'issues' / 'i1.json').write_text(json.dumps(issue), encoding='utf-8')
        srv._save_json_file(self.campaign / 'hero_points.json', {'i1': {'test-hero': 3, 'other': 2}})
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        hp = json.loads(data)['heroPoints']
        self.assertEqual(hp['issue'], 'i1')
        self.assertEqual(hp['mine'], 3)
        self.assertEqual(hp['issueTotal'], 5)

    def test_activity_capped(self):
        for i in range(600):
            srv.record_sheet_activity(self.campaign, 'h', 'act', 'd')
        data = srv._load_json_file(self.campaign / 'sheet_activity.json', [])
        self.assertEqual(len(data), srv.SHEET_ACTIVITY_MAX)
        self.assertEqual(data[-1]['action'], 'act')


class TestSheetPayloadSceneData(ServerTestCase):
    def test_tracker_and_npc_types_in_payload(self):
        seed_hero(self.campaign)
        # NPC bystander + villain in the hero's location
        seed_scene(self.campaign, tokens=[
            {'id': 't1', 'kind': 'hero', 'slug': 'test-hero', 'name': 'Test Hero',
             'locationId': 'loc1', 'currentHealth': 20, 'maxHealth': 30},
            {'id': 't2', 'kind': 'villain', 'slug': 'bad-guy', 'name': 'Bad Guy',
             'locationId': 'loc1', 'currentHealth': 7, 'maxHealth': 40},
            {'id': 't3', 'kind': 'npc', 'slug': 'clerk', 'name': 'Clerk',
             'locationId': 'loc1', 'currentDie': ''},
        ])
        npc_rows = [{h: '' for h in srv.NPCS_HEADERS} | {'Slug': 'clerk', 'Name': 'Clerk', 'Type': 'Bystander'}]
        srv._write_csv(self.campaign / 'npcs.csv', srv.NPCS_HEADERS, npc_rows)
        scene = srv.default_scene('Scene One')
        scene['tracker'] = {'stars': ['green'] * 2 + ['yellow'] * 4 + ['red'] * 2, 'position': 3}
        scene['locations'] = [{'id': 'loc1', 'name': 'Bank Lobby', 'background': None}]
        scene['tokens'] = [
            {'id': 't1', 'kind': 'hero', 'slug': 'test-hero', 'name': 'Test Hero',
             'locationId': 'loc1', 'currentHealth': 20, 'maxHealth': 30},
            {'id': 't2', 'kind': 'villain', 'slug': 'bad-guy', 'name': 'Bad Guy',
             'locationId': 'loc1', 'currentHealth': 7, 'maxHealth': 40},
            {'id': 't3', 'kind': 'npc', 'slug': 'clerk', 'name': 'Clerk', 'locationId': 'loc1'},
        ]
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        payload = json.loads(data)
        self.assertEqual(payload['tracker']['position'], 3)
        occ = {o['slug']: o for o in payload['occupants']}
        self.assertEqual(occ['clerk']['npcType'], 'Bystander')
        self.assertNotIn('currentHealth', occ['clerk'])  # bystanders have no health block
        self.assertEqual(occ['clerk']['currentHealth'] if 'currentHealth' in occ['clerk'] else None, None)

    def test_npc_type_lookup(self):
        self.assertEqual(srv.npc_type_for(self.campaign, 'nobody'), '')


class TestPlayerMode(ServerTestCase):
    def seed_modular(self):
        seed_hero(self.campaign)
        (self.campaign / 'md' / 'heroes' / 'test-hero.md').write_text(
            '# Test Hero\n\n## Modes\n\n```json\n'
            + json.dumps([
                {'slug': 'default', 'name': 'Default Mode', 'default': True, 'powerless': False,
                 'powers': {'Strength': 'd8'}},
                {'slug': 'modular-debilitator', 'name': 'Debilitator Mode', 'default': False,
                 'powerless': False, 'powers': {'Strength': 'd10'}},
                {'slug': 'powerless-mode', 'name': 'Powerless Mode', 'default': False,
                 'powerless': True, 'powers': {}},
            ]) + '\n```\n', encoding='utf-8')
        seed_scene(self.campaign, tokens=[
            {'id': 't1', 'kind': 'hero', 'slug': 'test-hero', 'name': 'Test Hero',
             'locationId': 'loc1', 'currentHealth': 20, 'maxHealth': 30}])
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})

    def test_mode_endpoint_round_trip(self):
        self.seed_modular()
        body = json.dumps({'hero': 'test-hero', 'key': 'k123', 'mode': 'modular-debilitator'})
        status, data = self.request('POST', '/api/player-mode', body)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)['currentMode'], 'modular-debilitator')
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        tok = next(t for t in scene['tokens'] if t['slug'] == 'test-hero')
        self.assertEqual(tok['currentMode'], 'modular-debilitator')
        # back to default
        status, _ = self.request('POST', '/api/player-mode',
                                 json.dumps({'hero': 'test-hero', 'key': 'k123', 'mode': 'default'}))
        self.assertEqual(status, 200)
        # payload reflects it
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        p = json.loads(data)
        self.assertEqual(p['currentMode'], 'default')
        self.assertEqual(len(p['modes']), 3)

    def test_mode_endpoint_rejects(self):
        self.seed_modular()
        status, _ = self.request('POST', '/api/player-mode',
                                 json.dumps({'hero': 'test-hero', 'key': 'bad', 'mode': 'default'}))
        self.assertEqual(status, 403)
        status, _ = self.request('POST', '/api/player-mode',
                                 json.dumps({'hero': 'test-hero', 'key': 'k123', 'mode': 'nope'}))
        self.assertEqual(status, 400)


if __name__ == '__main__':
    unittest.main()
