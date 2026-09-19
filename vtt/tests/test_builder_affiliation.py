"""Builders must expose Affiliation, not only Library."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class TestBuilderAffiliation(unittest.TestCase):
    def _read(self, name):
        return (ROOT / name).read_text(encoding='utf-8')

    def test_hero_builder_has_affiliation_select_and_payload(self):
        src = self._read('builder.html')
        self.assertIn('id="heroAffiliation"', src)
        self.assertIn("affiliation: (document.getElementById('heroAffiliation')||{}).value || 'Ally'", src)

    def test_villain_builder_has_affiliation_select_and_payload(self):
        src = self._read('villain-builder.html')
        self.assertIn('id="villainAffiliation"', src)
        self.assertIn("affiliation: (document.getElementById('villainAffiliation')||{}).value || 'Enemy'", src)

    def test_minion_and_npc_builder_has_affiliation_select_and_payload(self):
        src = self._read('minion-builder.html')
        self.assertIn('id="rowAffiliation"', src)
        self.assertIn("affiliation:(document.getElementById('rowAffiliation')||{}).value", src)
        self.assertIn("aff.value=NPC_MODE?'Neutral':'Enemy'", src)
