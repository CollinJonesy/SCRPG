"""Library and Builder must share actor identity/status fields.

A CSV/Library column on heroes/villains/minions/npcs is unfinished until the
matching Builder has: a control id, a save payload key, and a load assignment.
unittest discover is the gate — do not treat this as a later audit.
"""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / 'app.js'

# Identity/status fields. Sheet construction (PowerN, GYRO, principles) is
# wizard-built and listed in Library as columns; those have their own save tests.
PARITY = {
    'heroes': {
        'builder': 'builder.html',
        'header_const': 'HEROES_HEADERS',
        'fields': [
            {'header': 'Name', 'id': 'heroName', 'payload': 'name:', 'load_id': 'heroName'},
            {'header': 'Alias', 'id': 'alias', 'payload': 'alias:', 'load_id': 'alias'},
            {'header': 'Player', 'id': 'player', 'payload': 'player:', 'load_id': 'player'},
            {'header': 'Active', 'id': 'heroActive', 'payload': 'active:', 'load_id': 'heroActive'},
            {'header': 'Affiliation', 'id': 'heroAffiliation', 'payload': 'affiliation:', 'load_id': 'heroAffiliation'},
        ],
    },
    'villains': {
        'builder': 'villain-builder.html',
        'header_const': 'VILLAINS_HEADERS',
        'fields': [
            {'header': 'Name', 'id': 'name', 'payload': 'name:', 'load_id': 'name'},
            {'header': 'Active', 'id': 'villainActive', 'payload': 'active:', 'load_id': 'villainActive'},
            {'header': 'Affiliation', 'id': 'villainAffiliation', 'payload': 'affiliation:', 'load_id': 'villainAffiliation'},
        ],
    },
    'minions': {
        'builder': 'minion-builder.html',
        'header_const': 'MINIONS_HEADERS',
        'fields': [
            {'header': 'Name', 'id': 'name', 'payload': 'name', 'load_id': 'name'},
            {'header': 'Type', 'id': 'type', 'payload': 'type', 'load_id': 'type'},
            {'header': 'Die', 'id': 'die', 'payload': 'die', 'load_id': 'die'},
            {'header': 'Faction', 'id': 'faction', 'payload': 'faction', 'load_id': 'faction'},
            {'header': 'Active', 'id': 'rowActive', 'payload': 'active:', 'load_id': 'rowActive'},
            {'header': 'Affiliation', 'id': 'rowAffiliation', 'payload': 'affiliation:', 'load_id': 'rowAffiliation'},
        ],
    },
    'npcs': {
        'builder': 'minion-builder.html',
        'header_const': 'NPCS_HEADERS',
        'fields': [
            {'header': 'Name', 'id': 'name', 'payload': 'name', 'load_id': 'name'},
            {'header': 'Type', 'id': 'type', 'payload': 'type', 'load_id': 'type'},
            {'header': 'Die', 'id': 'die', 'payload': 'die', 'load_id': 'die'},
            {'header': 'Faction', 'id': 'faction', 'payload': 'faction', 'load_id': 'faction'},
            {'header': 'Active', 'id': 'rowActive', 'payload': 'active:', 'load_id': 'rowActive'},
            {'header': 'Affiliation', 'id': 'rowAffiliation', 'payload': 'affiliation:', 'load_id': 'rowAffiliation'},
        ],
    },
}


def _js_headers(src, const_name):
    m = re.search(r'const ' + re.escape(const_name) + r' = \[', src)
    if not m:
        raise AssertionError(const_name + ' missing from app.js')
    i = src.index('[', m.start())
    depth = 0
    for j, ch in enumerate(src[i:], i):
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                inner = src[i + 1:j]
                return re.findall(r"'([^']+)'", inner)
    raise AssertionError(const_name + ' unclosed')


class TestLibraryBuilderFieldParity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = APP_JS.read_text(encoding='utf-8')
        cls.builders = {}
        for spec in PARITY.values():
            name = spec['builder']
            if name not in cls.builders:
                cls.builders[name] = (ROOT / name).read_text(encoding='utf-8')

    def test_every_parity_field_is_on_library_and_builder(self):
        missing = []
        for kind, spec in PARITY.items():
            headers = _js_headers(self.app, spec['header_const'])
            html = self.builders[spec['builder']]
            for field in spec['fields']:
                loc = f'{kind}.{field["header"]}'
                if field['header'] not in headers:
                    missing.append(f'{loc}: not in {spec["header_const"]}')
                if f'id="{field["id"]}"' not in html:
                    missing.append(f'{loc}: builder missing id="{field["id"]}"')
                if field['payload'] not in html:
                    missing.append(f'{loc}: builder save missing {field["payload"]!r}')
                if field['load_id'] not in html:
                    missing.append(f'{loc}: builder load missing {field["load_id"]}')
        self.assertFalse(missing, 'Library↔Builder gaps:\n  ' + '\n  '.join(missing))

    def test_affiliation_is_not_library_only(self):
        """Regression: Affiliation shipped in Library HEADERS before any builder."""
        self.assertIn("'Affiliation'", self.app)
        for name in ('builder.html', 'villain-builder.html', 'minion-builder.html'):
            src = self.builders[name]
            self.assertIn('Affiliation', src, name)
            self.assertIn('affiliation', src, name)

    def test_hero_builder_can_mark_non_player_heroes(self):
        html = self.builders['builder.html']
        self.assertIn('id="playerControlled"', html)
        self.assertIn("player: document.getElementById('playerControlled')", html)


if __name__ == '__main__':
    unittest.main()
