"""GM board + Player Display fix-list contracts."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = (ROOT / 'app.js').read_text(encoding='utf-8')
DISP = (ROOT / 'display.js').read_text(encoding='utf-8')
DHTML = (ROOT / 'display.html').read_text(encoding='utf-8')
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')
CSS = (ROOT / 'style.css').read_text(encoding='utf-8')


class TestBoardDisplayFixes(unittest.TestCase):
    def test_no_die_reminder_labels(self):
        start = APP.index('function renderDieBlock')
        end = APP.index('function renderStatusSlots')
        body = APP[start:end]
        self.assertNotIn('steps down', body.lower())
        self.assertNotIn('defeated outright', body.lower())
        self.assertNotIn('die-row-label', body)

    def test_tokens_place_by_affiliation(self):
        start = APP.index('function renderTokens')
        end = APP.index('function renderToken(')
        body = APP[start:end]
        self.assertIn('tokenAffiliation(t)', body)
        self.assertIn("=== 'Ally'", body)
        self.assertIn("=== 'Neutral'", body)
        self.assertIn("=== 'Enemy'", body)
        self.assertIn('sortAllyTokens', body)

    def test_token_move_to_location_dropdown(self):
        """Every movable token card has a Move-to-location dropdown routing through moveToken()."""
        start = APP.index('function renderToken(')
        end = APP.index('function toggleToken')
        body = APP[start:end]
        self.assertIn('token-move-select', body)
        self.assertIn('tokenMoveOptionsHtml(t)', body)
        # Routes through the single source of truth
        self.assertIn("moveToken('${t.id}', this.value)", body)
        # Header + controls stop propagation so collapse/remove still work
        self.assertIn('onclick="event.stopPropagation()"', body)
        # Immobile heroes get no dropdown
        self.assertIn("immobile ? '' :", body)
        # Options cover scene locations + Unplaced
        opts = APP[APP.index('function tokenMoveOptionsHtml'):APP.index('function moveToken')]
        self.assertIn('state.scene && state.scene.locations', opts)
        self.assertIn('Unplaced</option>', opts)
        # Styled in the shared stylesheet
        self.assertIn('.token-move-select', CSS)

    def test_spawn_location_dropdown(self):
        self.assertIn('id="spawnLocation"', INDEX)
        self.assertIn('+ Add to Location', INDEX)
        self.assertIn('function selectedSpawnLocationId', APP)
        self.assertIn('selectedSpawnLocationId()', APP)
        spawn = APP[APP.index('function spawnToken'):APP.index('function addAllPCsToScene')]
        self.assertIn('selectedSpawnLocationId()', spawn)
        self.assertNotIn('locations[0]', spawn)
        add = APP[APP.index('function addAllPCsToScene'):APP.index('function challengeIsResolved')
                  if 'function challengeIsResolved' in APP else APP.index('/* ---- Challenges panel')]
        self.assertIn('selectedSpawnLocationId()', add)

    def test_roster_selection_preserved(self):
        start = APP.index('function refreshSpawnOptions')
        end = APP.index('function refreshSpawnLocations')
        body = APP[start:end]
        self.assertIn('prevSlug', body)
        self.assertIn('listSel.value = prevSlug', body)

    def test_health_opens_recover_not_defend(self):
        self.assertIn("openBoardAction('${t.id}','Recover',null)", APP)
        self.assertNotIn("openModCreate('${t.id}','defend')", APP)
        self.assertNotIn("openModCreate('${t.id}','recover')", APP)

    def test_challenges_panel_scrolls(self):
        self.assertIn('#challengesPanel', CSS)
        block = CSS[CSS.index('#challengesPanel'):CSS.index('#challengesPanel') + 120]
        self.assertIn('overflow-y: auto', block)

    def test_challenges_collapse_when_resolved(self):
        self.assertIn('function challengeIsResolved', APP)
        self.assertIn('collapsed', APP)
        self.assertIn('toggleChallengeForceOpen', APP)

    def test_heroes_villains_headers_centered(self):
        self.assertIn('.mvc-side.heroes .mvc-side-label { color: #7eb6ff; text-align: center; }', CSS)
        self.assertIn('.mvc-side.villains .mvc-side-label { color: #ff8a7a; text-align: center; }', CSS)

    def test_scene_level_background(self):
        self.assertIn('background: null, // scene-level', APP)
        self.assertIn('function uploadSceneBackground', APP)
        self.assertIn('scene.background', DISP)
        self.assertIn('scene-bg-host', DISP)
        self.assertNotIn('loc.background', DISP)

    def test_pd_dynamic_columns_4_col_grouped(self):
        """Grouped role layout: Players 1 / Bystanders 1 / Threats 2 = 4 columns; hero-sep removed."""
        self.assertIn('function pdMvcStageHtml', DISP)
        # Old hero-sep bank is gone
        self.assertNotIn('useHeroSep', DISP)
        self.assertNotIn('layout-hero-sep', DISP)
        # Old hero-sep bank is gone
        self.assertNotIn('useHeroSep', DISP)
        self.assertNotIn('layout-hero-sep', DISP)
        # Budget is always the 4-column design (redistribution, not 10-col stretch)
        self.assertIn('Math.max(1, Math.round((4 * ratios[i]) / rSum))', DISP)
        self.assertNotIn("pdMvcSideHtml('ALLIES', 'allies', a, scene, 10, 10, hideHealthBars)", DISP)
        # Row capacity capped — never token-count columns
        side = DISP[DISP.index('function pdMvcSideHtml'):DISP.index('function pdAllocateSpans')]
        self.assertIn('Math.min(10', side)
        self.assertIn('count != null ? count : colSpan', side)

    def test_pd_ally_sort_heroes_first(self):
        self.assertIn('function sortAllyTokens', DISP)
        start = DISP.index('function sortAllyTokens')
        end = DISP.index('function pdMvcStageHtml')
        body = DISP[start:end]
        self.assertIn('isPcHeroToken', body)
        self.assertIn('tokenTypeSortRank', body)


if __name__ == '__main__':
    unittest.main()
