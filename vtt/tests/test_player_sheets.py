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
        'Power1': 'Strength', 'PowerDie1': 'd8',
        'Quality1': 'Fitness', 'QualityDie1': 'd8',
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

    def test_minion_display_names_numbered_in_payload(self):
        """Minions get per-name numbers in the payload occupants (feeds the
        sheets' target dropdowns); heroes/villains/lieutenants are untouched."""
        tokens = [
            {'id': 'h1', 'kind': 'hero', 'slug': 'test-hero', 'name': 'Test Hero', 'locationId': 'loc1'},
            {'id': 'm1', 'kind': 'minion', 'slug': 'thug', 'name': 'Thug', 'spawnIndex': 1, 'locationId': 'loc1'},
            {'id': 'm2', 'kind': 'minion', 'slug': 'thug', 'name': 'Thug', 'spawnIndex': 2, 'locationId': 'loc1'},
            {'id': 'm3', 'kind': 'minion', 'slug': 'thug', 'name': 'Thug', 'locationId': 'loc1'},
            {'id': 'm2', 'kind': 'minion', 'slug': 'cop', 'name': 'Cop', 'locationId': 'loc1'},
        ]
        self.assertEqual(srv.token_display_name(tokens[1], tokens), 'Thug #1')
        self.assertEqual(srv.token_display_name(tokens[2], tokens), 'Thug #2')
        # legacy unstamped minion falls back to the lowest unused index
        self.assertEqual(srv.token_display_name(tokens[3], tokens), 'Thug #3')
        # TWO unstamped same-name minions must coordinate (not both "#1")
        pair = [
            {'id': 'a', 'kind': 'minion', 'slug': 'x', 'name': 'Bandit'},
            {'id': 'b', 'kind': 'minion', 'slug': 'x', 'name': 'Bandit'},
        ]
        self.assertEqual(srv.token_display_name(pair[0], pair), 'Bandit #1')
        self.assertEqual(srv.token_display_name(pair[1], pair), 'Bandit #2')
        self.assertEqual(srv.token_display_name(tokens[4], tokens), 'Cop #1')
        self.assertEqual(srv.token_display_name(tokens[0], tokens), 'Test Hero')
        # freeing #2 recycles it for the next spawn
        self.assertEqual(srv.token_display_name({'id': 'm3', 'kind': 'minion', 'slug': 'thug', 'name': 'Thug'}, tokens[:2] + tokens[3:]), 'Thug #2')

        seed_hero(self.campaign)
        seed_scene(self.campaign, tokens=tokens)
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        payload = json.loads(data)
        names = {o['id']: o['name'] for o in payload['occupants']}
        self.assertEqual(names['m1'], 'Thug #1')
        self.assertEqual(names['m2'], 'Cop #1')
        self.assertEqual(names['h1'], 'Test Hero')


class TestPlayerActionAuthAndValidation(ServerTestCase):
    def seed_action_scene(self):
        seed_hero(self.campaign)
        seed_scene(self.campaign, tokens=[
            {'id': 't1', 'kind': 'hero', 'slug': 'test-hero', 'name': 'Test Hero',
             'locationId': 'loc1', 'currentHealth': 20, 'maxHealth': 30},
            {'id': 't2', 'kind': 'villain', 'slug': 'bad-guy', 'name': 'Bad Guy',
             'locationId': 'loc1', 'currentHealth': 40, 'maxHealth': 40},
            {'id': 't3', 'kind': 'minion', 'slug': 'grunt', 'name': 'Grunt',
             'locationId': 'loc1', 'currentDie': 6, 'currentHealth': 4, 'maxHealth': 6},
            {'id': 't4', 'kind': 'hero', 'slug': 'other-hero', 'name': 'Other Hero',
             'locationId': 'loc2', 'currentHealth': 20, 'maxHealth': 30},
        ])
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})

    def act(self, body, raw_status=False):
        status, data = self.request('POST', '/api/player-action', json.dumps(body))
        parsed = json.loads(data)
        return (status, parsed) if raw_status else parsed

    def base(self, **kw):
        body = {'hero': 'test-hero', 'key': 'k123'}
        body.update(kw)
        return body

    def test_bad_key_403(self):
        self.seed_action_scene()
        status, _ = self.request('POST', '/api/player-action', json.dumps(
            {'hero': 'test-hero', 'key': 'WRONG', 'actions': []}))
        self.assertEqual(status, 403)

    def test_hero_not_on_board_400(self):
        self.seed_action_scene()
        seed_hero(self.campaign, 'lonely', 'Lonely')
        srv._save_json_file(self.campaign / 'sheet-keys.json',
                            dict(srv._load_json_file(self.campaign / 'sheet-keys.json', {}), lonely='k9'))
        status, _ = self.request('POST', '/api/player-action', json.dumps(
            {'hero': 'lonely', 'key': 'k9', 'actions': [{'type': 'Defend'}]}))
        self.assertEqual(status, 400)

    def test_unknown_type_and_bad_roll(self):
        self.seed_action_scene()
        status, _ = self.request('POST', '/api/player-action', json.dumps(self.base(
            actions=[{'type': 'Dance', 'targetId': 't2'}])))
        self.assertEqual(status, 400)
        status, _ = self.request('POST', '/api/player-action', json.dumps(self.base(
            actions=[{'type': 'Attack', 'targetId': 't2',
                      'roll': {'manual': {'min': 'x', 'mid': 2, 'max': 3, 'effect': 2}}}])))
        self.assertEqual(status, 400)
        status, _ = self.request('POST', '/api/player-action', json.dumps(self.base(
            actions=[{'type': 'Attack', 'targetId': 't2',
                      'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 99}}}])))
        self.assertEqual(status, 400)

    def test_attack_needs_target_in_location(self):
        self.seed_action_scene()
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't4',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertIn('error', parsed)
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 'nope',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertIn('error', parsed)
        # self-attack refused
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't1',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertIn('error', parsed)

    def test_attack_on_villain_applies_and_logs(self):
        self.seed_action_scene()
        parsed = self.act(self.base(abilityName='Haymaker', actions=[
            {'type': 'Attack', 'targetId': 't2',
             'roll': {'manual': {'min': 2, 'mid': 5, 'max': 9, 'effect': 6}}}]))
        self.assertTrue(parsed['ok'])
        self.assertEqual(parsed['outcomes'][0]['dmg'], 6)
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        villain = next(t for t in scene['tokens'] if t['id'] == 't2')
        self.assertEqual(villain['currentHealth'], 34)
        # activity log entry (board's single source) + change feed entry
        self.assertEqual(scene['activityLog'][-1]['action'], 'Attack')
        self.assertEqual(scene['activityLog'][-1]['details']['dmg'], 6)
        feed = srv._load_json_file(self.campaign / 'sheet_activity.json', [])
        self.assertIn('Haymaker', [e['action'] for e in feed])

    def test_defend_consumed_by_attack(self):
        self.seed_action_scene()
        self.act(self.base(actions=[{'type': 'Defend', 'targetId': 't2',
                                     'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 3}}}]))
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        self.assertEqual([m for m in scene['mods'] if m['kind'] == 'defend'][0]['value'], 3)
        h_before = next(t for t in scene['tokens'] if t['id'] == 't2')['currentHealth']
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't2',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 5}}}]))
        # 5 effect - 3 defend = 2 damage, defend consumed
        self.assertEqual(parsed['outcomes'][0]['dmg'], 2)
        self.assertEqual(parsed['outcomes'][0]['defended'], 3)
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        villain = next(t for t in scene['tokens'] if t['id'] == 't2')
        self.assertEqual(villain['currentHealth'], h_before - 2)
        self.assertTrue(all(m.get('consumed') for m in scene['mods'] if m['kind'] == 'defend'))

    def test_minion_house_rules(self):
        self.seed_action_scene()
        # dmg 1 never defeats (save roll >= 1)
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't3',
                                              'roll': {'manual': {'min': 1, 'mid': 1, 'max': 1, 'effect': 1}}}]))
        self.assertIn('held', parsed['outcomes'][0]['result'])
        # dmg 7 vs d6 always defeats outright (house rule: no step-down)
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't3',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 7}}}]))
        self.assertIn('defeated', parsed['outcomes'][0]['result'])
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        self.assertTrue(next(t for t in scene['tokens'] if t['id'] == 't3')['ko'])

    def test_lieutenant_rules(self):
        self.seed_action_scene()
        lt = {'id': 't5', 'kind': 'lieutenant', 'slug': 'lt', 'name': 'Lt',
              'locationId': 'loc1', 'currentDie': 8, 'currentHealth': 10, 'maxHealth': 10}
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['tokens'].append(lt)
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        # 16 >= 2*d8 → instant KO
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't5',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 16}}}]))
        self.assertIn('instant KO', parsed['outcomes'][0]['result'])
        # fresh lieutenant, dmg 9 vs d8: always fails save (roll <= 8 < 9) → step down to d6
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['tokens'].append({'id': 't6', 'kind': 'lieutenant', 'slug': 'lt2', 'name': 'Lt2',
                                'locationId': 'loc1', 'currentDie': 8, 'currentHealth': 10, 'maxHealth': 10})
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't6',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 9}}}]))
        self.assertIn('now d6', parsed['outcomes'][0]['result'])

    def test_boost_hinder_table_and_targeting(self):
        self.seed_action_scene()
        for effect, want in ((0, 0), (2, 1), (5, 2), (9, 3), (13, 4)):
            scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
            scene['mods'] = []
            (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
            parsed = self.act(self.base(actions=[
                {'type': 'Boost', 'targetId': 't1',
                 'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': effect}}}]))
            got = parsed['outcomes'][0]['value']
            self.assertEqual(got, want, 'effect %s' % effect)
        # cross-location boost refused
        parsed = self.act(self.base(actions=[
            {'type': 'Boost', 'targetId': 't4',
             'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 5}}}]))
        self.assertIn('error', parsed)

    def test_boost_minor_twist_grants_second_use(self):
        self.seed_action_scene()
        parsed = self.act(self.base(actions=[
            {'type': 'Boost', 'targetId': 't1', 'boostTwist': {'principle': 1},
             'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 5}}}]))
        self.assertEqual(parsed['outcomes'][0]['uses'], 2)
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        mod = scene['mods'][0]
        self.assertEqual(mod['uses'], 2)
        self.assertEqual(mod['twist'], 'minor text')
        # first spend survives, second consumes
        scene['mods'][0]['targetId'] = 't1'
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't2',
                                              'spendMods': [mod['id']],
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertEqual(parsed['outcomes'][0]['dmg'], 6)  # 4 effect + 2 boost (use 1 of 2)
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't2',
                                              'spendMods': [mod['id']],
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertEqual(parsed['outcomes'][0]['dmg'], 6)  # second use also +2
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't2',
                                              'spendMods': [mod['id']],
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertIn('error', parsed)  # both uses gone

    def test_overcome_bands(self):
        self.seed_action_scene()
        cases = ((0, 'Spectacular failure'), (2, 'Major Twist'), (5, 'Minor Twist'),
                 (9, 'Complete success'), (13, 'beyond expectations'))
        for effect, want in cases:
            parsed = self.act(self.base(actions=[
                {'type': 'Overcome', 'targetLabel': 'Vault door',
                 'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': effect}}}]))
            self.assertIn(want, parsed['outcomes'][0]['outcome'], 'effect %s' % effect)
            self.assertEqual(parsed['outcomes'][0]['targetLabel'], 'Vault door')

    def test_recover_gating(self):
        self.seed_action_scene()
        # no Recover ability → refused
        parsed = self.act(self.base(actions=[{'type': 'Recover',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 5}}}]))
        self.assertIn('error', parsed)
        # grant a Recover ability
        rows = [{h: '' for h in srv.ABILITIES_HEADERS} | {
            'Slug': 'test-hero', 'Name': 'Second Wind', 'Zone': 'Green', 'Type': 'A',
            'GameText': 'Heal.', 'RollType': 'Attack, Recover'}]
        srv._write_csv(self.campaign / 'abilities.csv', srv.ABILITIES_HEADERS, rows)
        parsed = self.act(self.base(actions=[{'type': 'Recover',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 5}}}]))
        self.assertTrue(parsed['ok'])
        self.assertEqual(parsed['outcomes'][0]['health'], 25)  # 20 + 5, max 30
        # montage scene allows Recover with no ability
        rows = [r for r in srv._csv_rows(self.campaign / 'abilities.csv', srv.ABILITIES_HEADERS)
                if r.get('Slug') != 'test-hero']
        srv._write_csv(self.campaign / 'abilities.csv', srv.ABILITIES_HEADERS, rows)
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['tokens'][0]['currentHealth'] = 10
        scene['sceneType'] = 'Montage'
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        parsed = self.act(self.base(actions=[{'type': 'Recover',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertTrue(parsed['ok'])
        self.assertEqual(parsed['outcomes'][0]['health'], 14)
        # recover clamps at max health (effect die caps at 20)
        parsed = self.act(self.base(actions=[{'type': 'Recover',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 20}}}]))
        self.assertEqual(parsed['outcomes'][0]['health'], 30)

    def test_bhd_reflects_player_defend_mod(self):
        # Defensive Strike self-defend of 5: the sheet header's BHD boxes must
        # show the mod-based Defend (same math as the board and PD), not just
        # the token's manual bhdDelta.
        self.seed_action_scene()
        parsed = self.act(self.base(actions=[{'type': 'Defend', 'targetId': 't1',
                                              'roll': {'manual': {'min': 2, 'mid': 5, 'max': 9}}}]))
        self.assertTrue(parsed['ok'])
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        p = json.loads(data)
        self.assertEqual(p['myToken']['bhd']['defend'], 5)
        self.assertEqual(p['myToken']['bhd']['boost'], 0)
        # consumed mods stop counting
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        for m in scene['mods']:
            m['consumed'] = True
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        self.assertEqual(json.loads(data)['myToken']['bhd']['defend'], 0)

    def test_recover_allowed_flag_in_payload(self):
        self.seed_action_scene()
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        p = json.loads(data)
        self.assertFalse(p['recoverAllowed'])
        self.assertEqual(p['pendingMods'], [])

    def test_mode_locks(self):
        self.seed_action_scene()
        (self.campaign / 'md' / 'heroes' / 'test-hero.md').write_text(
            '# T\n\n## Modes\n\n```json\n' + json.dumps([
                {'slug': 'modular-debilitator', 'name': 'Debilitator', 'powerless': False,
                 'powers': {'Strength': 'd8'},
                 'lockedActions': ['Boost', 'Defend', 'Overcome']},
            ]) + '\n```\n', encoding='utf-8')
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})
        self.request('POST', '/api/player-mode',
                     json.dumps({'hero': 'test-hero', 'key': 'k123', 'mode': 'modular-debilitator'}))
        parsed = self.act(self.base(actions=[
            {'type': 'Boost', 'targetId': 't1',
             'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 5}}}]))
        self.assertIn('locked', parsed['error'])
        # Recover is NEVER locked, even if a mode lists it
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        (self.campaign / 'md' / 'heroes' / 'test-hero.md').write_text(
            '# T\n\n## Modes\n\n```json\n' + json.dumps([
                {'slug': 'weird', 'name': 'Weird', 'powerless': False, 'powers': {},
                 'lockedActions': ['Recover', 'Attack']},
            ]) + '\n```\n', encoding='utf-8')
        self.request('POST', '/api/player-mode',
                     json.dumps({'hero': 'test-hero', 'key': 'k123', 'mode': 'weird'}))
        rows = [{h: '' for h in srv.ABILITIES_HEADERS} | {
            'Slug': 'test-hero', 'Name': 'Heal', 'RollType': 'Recover'}]
        srv._write_csv(self.campaign / 'abilities.csv', srv.ABILITIES_HEADERS, rows)
        parsed = self.act(self.base(actions=[{'type': 'Recover',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 2}}}]))
        self.assertTrue(parsed['ok'], parsed)
        # locked Attack still refused
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't2',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertIn('locked', parsed['error'])

    def rindex(self, lst, item):
        return len(lst) - 1 - lst[::-1].index(item)

    def test_switch_post_and_quick_switch_pre(self):
        self.seed_action_scene()
        (self.campaign / 'md' / 'heroes' / 'test-hero.md').write_text(
            '# T\n\n## Modes\n\n```json\n' + json.dumps([
                {'slug': 'default', 'name': 'Default', 'powerless': False, 'powers': {}},
                {'slug': 'modular-stalwart', 'name': 'Stalwart', 'powerless': False,
                 'powers': {}, 'lockedActions': ['Hinder', 'Overcome']},
            ]) + '\n```\n', encoding='utf-8')
        # post: attack lands in the OLD mode, then mode flips
        parsed = self.act(self.base(abilityName='Switch', modeChange={'position': 'post', 'mode': 'modular-stalwart'},
                                    actions=[{'type': 'Attack', 'targetId': 't2',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertTrue(parsed['ok'])
        self.assertEqual(parsed['currentMode'], 'modular-stalwart')
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        acts = [e['action'] for e in scene['activityLog']]
        self.assertLess(acts.index('Attack'), acts.index('Mode Change'))
        # pre (Quick Switch): destroy one boost → change mode → action in new mode
        scene['mods'] = [{'id': 'm1', 'kind': 'boost', 'value': 2, 'creatorId': 't1',
                          'targetId': 't1', 'uses': 1}]
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        self.request('POST', '/api/player-mode',
                     json.dumps({'hero': 'test-hero', 'key': 'k123', 'mode': 'default'}))
        parsed = self.act(self.base(abilityName='Quick Switch',
                                    modeChange={'position': 'pre', 'mode': 'modular-stalwart'},
                                    actions=[{'type': 'Defend', 'targetId': 't1',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 3}}}]))
        self.assertTrue(parsed['ok'])
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        self.assertEqual([m for m in scene['mods'] if m.get('id') == 'm1'], [])  # bonus destroyed
        self.assertEqual(scene['tokens'][0]['currentMode'], 'modular-stalwart')
        acts = [e['action'] for e in scene['activityLog']]
        # first occurrences AFTER the earlier post-Switch leg — use last indexes
        self.assertLess(self.rindex(acts, 'Quick Switch'), self.rindex(acts, 'Mode Change'))
        self.assertLess(self.rindex(acts, 'Mode Change'), self.rindex(acts, 'Defend'))
        # in the new mode the destroyed-bonus + mode flip happened before the action
        self.assertNotIn('boost', [m['kind'] for m in scene['mods']])

    def test_emergency_switch(self):
        self.seed_action_scene()
        (self.campaign / 'md' / 'heroes' / 'test-hero.md').write_text(
            '# T\n\n## Modes\n\n```json\n' + json.dumps([
                {'slug': 'modular-destroyer', 'name': 'Destroyer', 'powerless': False, 'powers': {}},
            ]) + '\n```\n', encoding='utf-8')
        parsed = self.act(self.base(kind='emergency-switch', mode='modular-destroyer',
                                    cost='damage', damage=6))
        self.assertTrue(parsed['ok'])
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        tok = scene['tokens'][0]
        self.assertEqual(tok['currentHealth'], 14)
        self.assertEqual(tok['currentMode'], 'modular-destroyer')
        self.assertIn('Emergency Switch', [e['action'] for e in scene['activityLog']])
        # twist cost
        parsed = self.act(self.base(kind='emergency-switch', mode='default', cost='twist'))
        self.assertTrue(parsed['ok'])
        self.assertEqual(parsed['outcomes'][0]['result'], 'took a minor twist')
        # unknown mode refused
        parsed = self.act(self.base(kind='emergency-switch', mode='nope', cost='twist'))
        self.assertEqual(parsed.get('error'), 'unknown mode')

    def test_spend_mods_validation(self):
        self.seed_action_scene()
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['mods'] = [
            {'id': 'mb', 'kind': 'boost', 'value': 2, 'creatorId': 't1', 'targetId': 't1', 'uses': 1},
            {'id': 'mo', 'kind': 'boost', 'value': 2, 'creatorId': 't1', 'targetId': 'other', 'uses': 1},
        ]
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't2', 'spendMods': ['mo'],
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertIn('error', parsed)  # mod not on this hero
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't2', 'spendMods': ['ghost'],
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertIn('error', parsed)
        # hinder subtracts
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['mods'].append({'id': 'mh', 'kind': 'hinder', 'value': 1, 'creatorId': 'x',
                              'targetId': 't1', 'uses': 1})
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't2',
                                              'spendMods': ['mb', 'mh'],
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 4}}}]))
        self.assertEqual(parsed['outcomes'][0]['dmg'], 5)  # 4 + 2 - 1

    def test_pending_mods_in_payload(self):
        self.seed_action_scene()
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['mods'] = [{'id': 'm1', 'kind': 'boost', 'value': 3, 'creatorId': 't2',
                          'targetId': 't1', 'uses': 2, 'twist': 'why now?'},
                         {'id': 'm2', 'kind': 'boost', 'value': 1, 'creatorId': 't1',
                          'targetId': 't2', 'uses': 1}]
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        mods = json.loads(data)['pendingMods']
        self.assertEqual(len(mods), 1)
        self.assertEqual(mods[0]['creator'], 'Bad Guy')
        self.assertEqual(mods[0]['uses'], 2)
        self.assertEqual(mods[0]['twist'], 'why now?')

    def test_turn_counting_round_advance(self):
        self.seed_action_scene()
        # two living combatants; hero acts twice → second action is after the
        # round advanced (villain needs a turn too — act for it via direct log)
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't2',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 1}}}]))
        self.assertTrue(parsed['ok'])
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        hero_tok = next(t for t in scene['tokens'] if t['id'] == 't1')
        self.assertEqual(hero_tok['turnNumber'], 1)
        # villain "acts" (turnNumber assigned directly), then the hero's next
        # action ends the round — every living combatant needs a mark first
        for t in scene['tokens']:
            if t['id'] != 't1' and not t.get('ko'):
                t['turnNumber'] = 2
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        parsed = self.act(self.base(actions=[{'type': 'Attack', 'targetId': 't2',
                                              'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 1}}}]))
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        self.assertEqual(scene['round'], 2)
        self.assertNotIn('turnNumber', next(t for t in scene['tokens'] if t['id'] == 't1'))

    def test_digital_roll(self):
        self.seed_action_scene()
        parsed = self.act(self.base(actions=[
            {'type': 'Attack', 'targetId': 't2', 'roll': {'power': 'Strength', 'quality': 'Fitness'}}]))
        self.assertTrue(parsed['ok'], parsed)
        roll = parsed['outcomes'][0]['roll']
        self.assertIn('powerDie', roll)
        self.assertGreaterEqual(roll['effect'], 1)
        # unknown power refused
        parsed = self.act(self.base(actions=[
            {'type': 'Attack', 'targetId': 't2', 'roll': {'power': 'Nope', 'quality': 'Fitness'}}]))
        self.assertIn('error', parsed)

    def test_effect_die_from_game_text(self):
        self.seed_action_scene()
        # Unerring-Strike-style: "Use your Max+Min dice" → effect = max+min,
        # computed server-side; a client-supplied effect is ignored.
        rows = [{h: '' for h in srv.ABILITIES_HEADERS} | {
            'Slug': 'test-hero', 'Name': 'Unerring Strike', 'Type': 'A',
            'GameText': 'Attack using [Awareness]. Use your Max+Min dice. Ignore all penalties on this attack, ignore any Defend actions, and it cannot be affected by Reactions.',
            'RollType': 'Attack, Defend'}]
        srv._write_csv(self.campaign / 'abilities.csv', srv.ABILITIES_HEADERS, rows)
        parsed = self.act(self.base(abilityName='Unerring Strike', actions=[
            {'type': 'Attack', 'targetId': 't2',
             'roll': {'manual': {'min': 2, 'mid': 5, 'max': 9, 'effect': 999}}}]))
        self.assertTrue(parsed['ok'], parsed)
        self.assertEqual(parsed['outcomes'][0]['effect'], 11)  # 9 + 2
        self.assertEqual(parsed['outcomes'][0]['roll']['effectMode'], 'max+min')
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        self.assertEqual(next(t for t in scene['tokens'] if t['id'] == 't2')['currentHealth'], 29)

    def test_ignore_penalties_flags(self):
        self.seed_action_scene()
        rows = [{h: '' for h in srv.ABILITIES_HEADERS} | {
            'Slug': 'test-hero', 'Name': 'Unerring Strike', 'Type': 'A',
            'GameText': 'Attack using [Awareness]. Use your Max+Min dice. Ignore all penalties on this attack, ignore any Defend actions, and it cannot be affected by Reactions.',
            'RollType': 'Attack'}]
        srv._write_csv(self.campaign / 'abilities.csv', srv.ABILITIES_HEADERS, rows)
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['mods'] = [
            {'id': 'md', 'kind': 'defend', 'value': 4, 'creatorId': 't1', 'targetId': 't2', 'uses': 1},
            {'id': 'mh', 'kind': 'hinder', 'value': 2, 'creatorId': 't2', 'targetId': 't1', 'uses': 1},
        ]
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        # a Defend mod on the target is ignored, NOT consumed
        parsed = self.act(self.base(abilityName='Unerring Strike', actions=[
            {'type': 'Attack', 'targetId': 't2',
             'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3}}}]))
        self.assertTrue(parsed['ok'])
        self.assertEqual(parsed['outcomes'][0]['dmg'], 4)  # max+min = 4, defend NOT subtracted
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        self.assertFalse(next(m for m in scene['mods'] if m['id'] == 'md').get('consumed'))
        # spending the hero's own Hinder is refused — penalties cannot apply
        parsed = self.act(self.base(abilityName='Unerring Strike', actions=[
            {'type': 'Attack', 'targetId': 't2', 'spendMods': ['mh'],
             'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3}}}]))
        self.assertIn('error', parsed)
        self.assertIn('ignores', parsed['error'])

    def test_forced_die_digital_roll(self):
        self.seed_action_scene()
        # [Awareness] is a QUALITY on the seeded hero — digital roll must use it
        rows = [{h: '' for h in srv.ABILITIES_HEADERS} | {
            'Slug': 'test-hero', 'Name': 'Sense Attack', 'Type': 'R',
            'GameText': 'Defend using [Fitness].', 'RollType': 'Defend'}]
        srv._write_csv(self.campaign / 'abilities.csv', srv.ABILITIES_HEADERS, rows)
        parsed = self.act(self.base(abilityName='Sense Attack', actions=[
            {'type': 'Defend', 'targetId': 't1', 'roll': {'power': 'Strength', 'quality': 'Fitness'}}]))
        self.assertTrue(parsed['ok'])
        self.assertEqual(parsed['outcomes'][0]['roll']['qualityDie'], 'd8')
        self.assertEqual(parsed['outcomes'][0]['roll']['powerDie'], 'd8')  # forced Power=Strength? No: only quality forced
        # the server used the client-chosen power since the bracket only names Fitness

    def test_reminders_endpoint(self):
        self.seed_action_scene()
        status, data = self.request('GET', '/api/reminders')
        self.assertEqual(status, 200)
        j = json.loads(data)
        self.assertIn('powers', j)
        self.assertIn('qualities', j)
        self.assertIsInstance(j['powers'], dict)

    def test_defensive_strike_per_action_effects(self):
        self.seed_action_scene()
        # "Defend using [Close Combat]. Attack using your Min die." — the
        # Attack's effect is the Min die; the Defend's value is Mid (default).
        rows = [{h: '' for h in srv.ABILITIES_HEADERS} | {
            'Slug': 'test-hero', 'Name': 'Defensive Strike', 'Type': 'A',
            'GameText': 'Defend using [Close Combat]. Attack using your Min die.',
            'RollType': 'Attack, Defend'}]
        srv._write_csv(self.campaign / 'abilities.csv', srv.ABILITIES_HEADERS, rows)
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['tokens'][0]['locationId'] = 'loc1'
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        parsed = self.act(self.base(abilityName='Defensive Strike', actions=[
            {'type': 'Attack', 'targetId': 't2', 'roll': {'manual': {'min': 2, 'mid': 5, 'max': 9}}},
            {'type': 'Defend', 'targetId': 't1', 'roll': {'manual': {'min': 2, 'mid': 5, 'max': 9}}},
        ]))
        self.assertTrue(parsed['ok'], parsed)
        # attack effect = Min (2); defend value = Mid (5)
        self.assertEqual(parsed['outcomes'][0]['effect'], 2)
        self.assertEqual(parsed['outcomes'][0]['dmg'], 2)
        self.assertEqual(parsed['outcomes'][1]['value'], 5)
        self.assertEqual(parsed['outcomes'][1]['type'], 'Defend')

    def test_flexible_stance_action_choice(self):
        self.seed_action_scene()
        rows = [{h: '' for h in srv.ABILITIES_HEADERS} | {
            'Slug': 'test-hero', 'Name': 'Flexible Stance', 'Type': 'A',
            'GameText': 'Take any two basic actions using [Close Combat], each using your Min die.',
            'RollType': ''}]
        srv._write_csv(self.campaign / 'abilities.csv', srv.ABILITIES_HEADERS, rows)
        # two actions, same action twice (Attack + Attack), both use the Min die
        parsed = self.act(self.base(abilityName='Flexible Stance', actions=[
            {'type': 'Attack', 'targetId': 't2', 'roll': {'manual': {'min': 3, 'mid': 7, 'max': 11}}},
            {'type': 'Boost', 'targetId': 't1', 'roll': {'manual': {'min': 3, 'mid': 7, 'max': 11}}},
        ]))
        self.assertTrue(parsed['ok'], parsed)
        self.assertEqual(parsed['outcomes'][0]['effect'], 3)   # 'each using your Min die'
        self.assertEqual(parsed['outcomes'][0]['dmg'], 3)
        self.assertEqual(parsed['outcomes'][1]['effect'], 3)   # Boost band from Min too
        self.assertEqual(parsed['outcomes'][1]['value'], 1)    # 3 → +1
        # choosing Recover is allowed even though the RollType column is blank
        parsed = self.act(self.base(abilityName='Flexible Stance', actions=[
            {'type': 'Recover', 'targetId': 't1', 'roll': {'manual': {'min': 3, 'mid': 7, 'max': 11}}},
            {'type': 'Defend', 'targetId': 't1', 'roll': {'manual': {'min': 3, 'mid': 7, 'max': 11}}},
        ]))
        self.assertTrue(parsed['ok'], parsed)


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


class TestStagedLocationMoves(ServerTestCase):
    """Phase 3: player-sheet location moves stage for GM approval (reveal
    gating). ALL cross-location moves stage; same-location is refused; the
    scene JSON is only mutated on approval."""

    def seed_move_scene(self):
        seed_hero(self.campaign)
        seed_scene(self.campaign, tokens=[
            {'id': 't1', 'kind': 'hero', 'slug': 'test-hero', 'name': 'Test Hero',
             'locationId': 'loc1', 'currentHealth': 20, 'maxHealth': 30},
        ])
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})

    def move(self, body, raw_status=False):
        status, data = self.request('POST', '/api/player-move', json.dumps(body))
        parsed = json.loads(data)
        return (status, parsed) if raw_status else parsed

    def test_bad_key_403(self):
        self.seed_move_scene()
        status, _ = self.request('POST', '/api/player-move',
                                 json.dumps({'hero': 'test-hero', 'key': 'WRONG', 'toLocationId': 'loc2'}))
        self.assertEqual(status, 403)

    def test_same_location_and_unknown_location_refused(self):
        self.seed_move_scene()
        parsed = self.move({'hero': 'test-hero', 'key': 'k123', 'toLocationId': 'loc1'})
        self.assertIn('already in that location', parsed['error'])
        parsed = self.move({'hero': 'test-hero', 'key': 'k123', 'toLocationId': 'nope'})
        self.assertIn('unknown location', parsed['error'])

    def test_ko_hero_cannot_request(self):
        self.seed_move_scene()
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['tokens'][0]['ko'] = True
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        parsed = self.move({'hero': 'test-hero', 'key': 'k123', 'toLocationId': 'loc2'})
        self.assertIn('out', parsed['error'])

    def test_request_stages_without_touching_scene(self):
        self.seed_move_scene()
        before = (self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8')
        status, parsed = self.move({'hero': 'test-hero', 'key': 'k123', 'toLocationId': 'loc2'}, raw_status=True)
        self.assertEqual(status, 200)
        self.assertEqual(parsed['pending']['to']['name'], 'The Vault')
        self.assertEqual(parsed['pending']['from']['name'], 'Bank Lobby')
        self.assertEqual(before, (self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        store = srv.pending_moves_store(self.campaign)
        self.assertEqual(len(store), 1)
        self.assertEqual(store[0]['hero'], 'test-hero')
        self.assertEqual(store[0]['sceneSlug'], 'sc-1')
        feed = srv._load_json_file(self.campaign / 'sheet_activity.json', [])
        self.assertIn('Location move requested', [e['action'] for e in feed])
        # sheet payload shows the pending state + the location name list
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        p = json.loads(data)
        self.assertEqual(p['pendingMove']['to'], 'The Vault')
        self.assertEqual(p['pendingMove']['toId'], 'loc2')
        self.assertEqual(p['location']['name'], 'Bank Lobby')  # not moved yet
        self.assertEqual([l['name'] for l in p['sceneLocations']], ['Bank Lobby', 'The Vault'])
        # names only — no occupants of other locations leak
        self.assertTrue(all(set(l.keys()) == {'id', 'name'} for l in p['sceneLocations']))

    def test_duplicate_request_replaces(self):
        self.seed_move_scene()
        self.move({'hero': 'test-hero', 'key': 'k123', 'toLocationId': 'loc2'})
        status, parsed = self.move({'hero': 'test-hero', 'key': 'k123',
                                    'toLocationId': 'loc1'}, raw_status=True)
        # already in loc1 → the replace attempt first hits same-location refusal
        self.assertEqual(status, 400)
        self.assertIn('already in that location', parsed['error'])
        store = srv.pending_moves_store(self.campaign)
        self.assertEqual(len(store), 1)  # original request still pending
        self.assertEqual(store[0]['to']['id'], 'loc2')

    def test_approve_moves_token_and_logs(self):
        self.seed_move_scene()
        parsed = self.move({'hero': 'test-hero', 'key': 'k123', 'toLocationId': 'loc2'})
        mid = parsed['pending']['id']
        version_before = srv.state_version()
        status, resp = self.request('POST', '/api/pending-moves',
                                    json.dumps({'op': 'approve', 'id': mid}))
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(resp)['decision'], 'approve')
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        tok = next(t for t in scene['tokens'] if t['slug'] == 'test-hero')
        self.assertEqual(tok['locationId'], 'loc2')
        # Activity Log entry in the board moveToken shape, no turn consumed
        move_entries = [e for e in scene['activityLog'] if e['action'] == 'Move']
        self.assertEqual(len(move_entries), 1)
        self.assertEqual(move_entries[0]['details']['from'], 'Bank Lobby')
        self.assertEqual(move_entries[0]['details']['to'], 'The Vault')
        self.assertEqual(move_entries[0]['details']['approvedFromSheet'], True)
        self.assertFalse(move_entries[0]['details']['countsAsTurn'])
        self.assertNotIn('turnNumber', tok)
        # queue drained + change feed has BOTH request and approval
        self.assertEqual(srv.pending_moves_store(self.campaign), [])
        feed = srv._load_json_file(self.campaign / 'sheet_activity.json', [])
        actions = [e['action'] for e in feed]
        self.assertIn('Location move requested', actions)
        self.assertIn('Location move approved', actions)
        self.assertLess(actions.index('Location move requested'),
                        actions.index('Location move approved'))
        # the atomic scene write bumps the SSE version
        self.assertGreater(srv.state_version(), version_before)
        # sheet payload: reveal + pending state cleared
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        p = json.loads(data)
        self.assertEqual(p['location']['name'], 'The Vault')
        self.assertIsNone(p['pendingMove'])

    def test_deny_leaves_token_alone(self):
        self.seed_move_scene()
        parsed = self.move({'hero': 'test-hero', 'key': 'k123', 'toLocationId': 'loc2'})
        mid = parsed['pending']['id']
        status, _ = self.request('POST', '/api/pending-moves', json.dumps({'op': 'deny', 'id': mid}))
        self.assertEqual(status, 200)
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        tok = next(t for t in scene['tokens'] if t['slug'] == 'test-hero')
        self.assertEqual(tok['locationId'], 'loc1')
        self.assertEqual(srv.pending_moves_store(self.campaign), [])
        feed = srv._load_json_file(self.campaign / 'sheet_activity.json', [])
        self.assertIn('Location move denied', [e['action'] for e in feed])
        self.assertNotIn('Move', [e['action'] for e in
                                  json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8')).get('activityLog') or []])

    def test_stale_scene_and_unknown_id(self):
        self.seed_move_scene()
        parsed = self.move({'hero': 'test-hero', 'key': 'k123', 'toLocationId': 'loc2'})
        mid = parsed['pending']['id']
        status, _ = self.request('POST', '/api/pending-moves', json.dumps({'op': 'approve', 'id': 'ghost'}))
        self.assertEqual(status, 400)
        # scene changed under the request → refused, entry kept for manual deny
        (self.campaign / 'active_scene.json').write_text(json.dumps({'slug': 'sc-2'}), encoding='utf-8')
        status, data = self.request('POST', '/api/pending-moves', json.dumps({'op': 'approve', 'id': mid}))
        self.assertEqual(status, 409)
        self.assertIn('stale', json.loads(data)['error'])
        self.assertEqual(len(srv.pending_moves_store(self.campaign)), 1)
        status, _ = self.request('POST', '/api/pending-moves', json.dumps({'op': 'deny', 'id': mid}))
        self.assertEqual(status, 200)
        self.assertEqual(srv.pending_moves_store(self.campaign), [])

    def test_no_such_op(self):
        status, _ = self.request('POST', '/api/pending-moves', json.dumps({'op': 'nonsense', 'id': 'x'}))
        self.assertEqual(status, 400)


class TestAttackTargetingPolish(ServerTestCase):
    """Phase 3 item 2: bystanders are non-targets; villain remaining health is
    never in the player-visible outcome text."""

    def seed_polish_scene(self):
        seed_hero(self.campaign)
        seed_scene(self.campaign, tokens=[
            {'id': 't1', 'kind': 'hero', 'slug': 'test-hero', 'name': 'Test Hero',
             'locationId': 'loc1', 'currentHealth': 20, 'maxHealth': 30},
            {'id': 't2', 'kind': 'villain', 'slug': 'bad-guy', 'name': 'Bad Guy',
             'locationId': 'loc1', 'currentHealth': 40, 'maxHealth': 40},
            {'id': 't3', 'kind': 'npc', 'slug': 'clerk', 'name': 'Clerk',
             'locationId': 'loc1'},
        ])
        npc_rows = [{h: '' for h in srv.NPCS_HEADERS} | {'Slug': 'clerk', 'Name': 'Clerk', 'Type': 'Bystander'}]
        srv._write_csv(self.campaign / 'npcs.csv', srv.NPCS_HEADERS, npc_rows)
        srv._save_json_file(self.campaign / 'sheet-keys.json', {'test-hero': 'k123'})

    def act(self, body):
        status, data = self.request('POST', '/api/player-action', json.dumps(body))
        return status, json.loads(data)

    def base(self, **kw):
        body = {'hero': 'test-hero', 'key': 'k123'}
        body.update(kw)
        return body

    def test_bystanders_cannot_be_targeted(self):
        self.seed_polish_scene()
        for atype in ('Attack', 'Defend', 'Boost', 'Hinder'):
            _, parsed = self.act(self.base(actions=[
                {'type': atype, 'targetId': 't3',
                 'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 5}}}]))
            self.assertIn('bystanders cannot be targeted', parsed['error'], atype)
        # the sheet payload marks the bystander so the client can filter too
        _, data = self.request('GET', '/api/player-sheet?hero=test-hero&key=k123')
        p = json.loads(data)
        occ = {o['slug']: o for o in p['occupants']}
        self.assertEqual(occ['clerk']['npcType'], 'Bystander')
        # villain still targetable
        status, parsed = self.act(self.base(actions=[
            {'type': 'Attack', 'targetId': 't2',
             'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 5}}}]))
        self.assertEqual(status, 200)

    def test_villain_health_never_in_player_outcome(self):
        self.seed_polish_scene()
        status, parsed = self.act(self.base(abilityName='Haymaker', actions=[
            {'type': 'Attack', 'targetId': 't2',
             'roll': {'manual': {'min': 2, 'mid': 5, 'max': 9, 'effect': 6}}}]))
        self.assertEqual(status, 200)
        result = parsed['outcomes'][0]['result']
        self.assertIn('6 damage to Bad Guy', result)  # damage dealt IS shown
        self.assertNotIn('Health', result)            # remaining health is NOT
        self.assertNotIn('34', result)
        # the GM-facing scene Activity Log keeps the full string
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        self.assertIn('(Health 34)', scene['activityLog'][-1]['result'])

    def test_digital_roll_with_spent_mods(self):
        self.seed_polish_scene()
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['mods'] = [{'id': 'mb', 'kind': 'boost', 'value': 2,
                          'creatorId': 't1', 'targetId': 't1', 'uses': 1}]
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        status, parsed = self.act(self.base(actions=[
            {'type': 'Attack', 'targetId': 't2', 'spendMods': ['mb'],
             'roll': {'power': 'Strength', 'quality': 'Fitness'}}]))
        self.assertEqual(status, 200, parsed)
        roll = parsed['outcomes'][0]['roll']
        self.assertGreaterEqual(roll['effect'], 1)
        self.assertEqual(parsed['outcomes'][0]['dmg'], roll['effect'] + 2)
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        self.assertTrue(next(m for m in scene['mods'] if m['id'] == 'mb')['consumed'])

    def test_ko_target_refused(self):
        self.seed_polish_scene()
        scene = json.loads((self.campaign / 'scenes' / 'sc-1.json').read_text(encoding='utf-8'))
        scene['tokens'][1]['ko'] = True
        (self.campaign / 'scenes' / 'sc-1.json').write_text(json.dumps(scene), encoding='utf-8')
        _, parsed = self.act(self.base(actions=[
            {'type': 'Attack', 'targetId': 't2',
             'roll': {'manual': {'min': 1, 'mid': 2, 'max': 3, 'effect': 5}}}]))
        self.assertIn('target is out', parsed['error'])


if __name__ == '__main__':
    unittest.main()
