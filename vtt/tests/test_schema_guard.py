"""Schema guards: PUT must not drop columns/keys; JS headers must match Python."""
import ast
import csv
import io
import json
import re
import unittest
from pathlib import Path

import test_server as ts
import server as srv

APP_JS = Path(__file__).resolve().parent.parent / 'app.js'


def _js_string_array(src, const_name):
    m = re.search(r'const ' + re.escape(const_name) + r' = \[', src)
    if not m:
        raise AssertionError(const_name + ' not found in app.js')
    i = src.index('[', m.start())
    depth = 0
    for j, ch in enumerate(src[i:], i):
        if ch == '[':
            depth += 1
        elif ch == ']':
            depth -= 1
            if depth == 0:
                return ast.literal_eval(src[i:j + 1])
    raise AssertionError(const_name + ' array unclosed')


class TestPutDoesNotDropColumns(ts.ServerTestCase):
    def test_csv_put_without_origin_keeps_origin(self):
        full = ','.join(srv.VILLAINS_HEADERS) + '\n'
        full += 'book-brute,Book Brute,' + ',' * (len(srv.VILLAINS_HEADERS) - 3) + '\n'
        # seed via builder so Origin is set
        payload = json.dumps({'name': 'Book Brute', 'approach': 'Focused', 'origin': 'premade', 'active': True})
        self.assertEqual(self.request('POST', '/api/builder/villain', body=payload,
                                     headers={'Content-Type': 'application/json'})[0], 200)
        short = 'Slug,Name,Approach\nbook-brute,Book Brute,Focused\n'
        status, _ = self.request('PUT', '/api/csv/villains', body=short.encode('utf-8'))
        self.assertEqual(status, 200)
        with (self.campaign / 'villains.csv').open(encoding='utf-8') as fh:
            row = next(r for r in csv.DictReader(fh) if r['Slug'] == 'book-brute')
        self.assertEqual(row.get('Origin'), 'premade')
        self.assertEqual(row.get('Name'), 'Book Brute')

    def test_issue_put_without_notes_keeps_notes(self):
        dest = self.campaign / 'issues' / 'keep-me.json'
        dest.write_text(json.dumps({'name': 'Keep Me', 'notes': 'secret prep', 'sceneSlugs': []}), encoding='utf-8')
        status, _ = self.request('PUT', '/api/issues/keep-me',
                                 body=json.dumps({'name': 'Keep Me', 'sceneSlugs': ['a']}).encode('utf-8'))
        self.assertEqual(status, 200)
        data = json.loads(dest.read_text(encoding='utf-8'))
        self.assertEqual(data['notes'], 'secret prep')
        self.assertEqual(data['sceneSlugs'], ['a'])


class TestHeaderParity(unittest.TestCase):
    def test_app_js_headers_match_server(self):
        src = APP_JS.read_text(encoding='utf-8')
        pairs = [
            ('HEROES_HEADERS', srv.HEROES_HEADERS),
            ('VILLAINS_HEADERS', srv.VILLAINS_HEADERS),
            ('MINIONS_HEADERS', srv.MINIONS_HEADERS),
            ('NPCS_HEADERS', srv.NPCS_HEADERS),
            ('ENVIRONMENTS_HEADERS', srv.ENVIRONMENTS_HEADERS),
            ('LOCATIONS_HEADERS', srv.LOCATIONS_HEADERS),
            ('TWISTS_HEADERS', srv.TWISTS_HEADERS),
            ('ABILITIES_HEADERS', srv.ABILITIES_HEADERS),
        ]
        for name, py in pairs:
            js = _js_string_array(src, name)
            self.assertEqual(js, py, name)


if __name__ == '__main__':
    unittest.main()
