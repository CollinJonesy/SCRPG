"""Static checks on display.js (Player Display)."""
import unittest
from pathlib import Path

DISPLAY = Path(__file__).resolve().parent.parent / 'display.js'
DISPLAY_HTML = Path(__file__).resolve().parent.parent / 'display.html'


class TestDisplayJsContracts(unittest.TestCase):
    def setUp(self):
        self.src = DISPLAY.read_text(encoding='utf-8')
        self.html = DISPLAY_HTML.read_text(encoding='utf-8')

    def test_pd_hides_non_pc_tokens_until_pc_hero_present(self):
        start = self.src.index('function renderScene')
        end = self.src.index('function pathDisplayOutcome')
        body = self.src[start:end]
        self.assertIn('isPcHeroToken', body)
        self.assertIn('if (!pcsHere.length)', body)
        self.assertIn('function isPcHeroToken', self.src)
        helper = self.src[self.src.index('function isPcHeroToken'):self.src.index('function isNonCombatToken')]
        self.assertIn("t.kind !== 'hero'", helper)
        self.assertIn('t.npc', helper)
        self.assertIn('libHeroes', helper)

    def test_pd_sorts_non_combat_tokens_last(self):
        start = self.src.index('function sortEnemyTokens')
        end = self.src.index('function backgroundUrl')
        body = self.src[start:end]
        self.assertIn('isNonCombatToken', body)
        self.assertIn('nonCombat', body)
        self.assertIn('tokenTypeSortRank', body)
        self.assertIn('function isNonCombatToken', self.src)
        self.assertIn("/api/csv/npcs", self.src)

    def test_pd_default_is_4_col_roles_1_1_2(self):
        """Grouped role layout: Players 1 / Bystanders 1 / Threats 2 — 4 total columns."""
        body = self.src[self.src.index('function pdMvcStageHtml'):self.src.index('function sortNeutralTokens')]
        # Tunable constants exist and default to the closed design
        self.assertIn('const PD_ALLY_COLS = 1;', self.src)
        self.assertIn('const PD_BYSTANDER_COLS = 1;', self.src)
        self.assertIn('const PD_THREAT_COLS = 2;', self.src)
        # Grouped layout spans come from the constants
        self.assertIn("pdMvcSideHtml('ALLIES', 'allies', a, scene, PD_ALLY_COLS, PD_ALLY_COLS, hideHealthBars)", body)
        self.assertIn("pdMvcSideHtml('NEUTRAL', 'neutral', n, scene, PD_BYSTANDER_COLS, PD_BYSTANDER_COLS, hideHealthBars)", body)
        self.assertIn("pdMvcSideHtml('ENEMIES', 'enemies', e, scene, PD_THREAT_COLS, PD_THREAT_COLS, hideHealthBars)", body)
        # All-three-present stage grid shrinks to the design sum (1+1+2)
        self.assertIn('cols = PD_ALLY_COLS + PD_BYSTANDER_COLS + PD_THREAT_COLS;', body)
        self.assertIn('grid-template-columns:repeat(${cols}, minmax(0,1fr))', body)

    def test_pd_hides_affiliation_side_headers(self):
        """Player Display locations omit Allies / Neutral / Enemies labels."""
        side = self.src[self.src.index('function pdMvcSideHtml'):self.src.index('function pdAllocateSpans')]
        self.assertNotIn('mvc-side-label', side)

    def test_pd_never_more_than_10_token_columns_per_row(self):
        """Row capacity is side span (≤10), never token count — extras wrap."""
        side = self.src[self.src.index('function pdMvcSideHtml'):self.src.index('function pdAllocateSpans')]
        self.assertIn('Math.min(10', side)
        # colCount comes from span/count, not tokens.length as the grid size
        self.assertIn('count != null ? count : colSpan', side)
        self.assertNotIn('count != null ? count : Math.max(n, 1)', side)

    def test_pd_no_hero_sep_bank(self):
        """The 4-column design removed the old 5-PC-bank hero-sep layout entirely."""
        self.assertNotIn('useHeroSep', self.src)
        self.assertNotIn('layout-hero-sep', self.src)
        self.assertNotIn('pcsFront', self.src)

    def test_pd_groups_by_role_not_affiliation(self):
        """renderScene groups: PCs→Allies, Bystander NPCs→Bystanders, everything else→Threats."""
        scene = self.src[self.src.index('function renderScene(scene)'):]
        body = scene[scene.index("const row = document.getElementById('locationsRow');"):scene.index('return `<section class="location-block">')]
        self.assertIn('let allies = sortAllyTokens(pcsHere);', body)
        self.assertIn('let neutrals = sortNeutralTokens(here.filter(t => !isPcHeroToken(t) && isNonCombatToken(t)));', body)
        self.assertIn('let enemies = sortEnemyTokens(here.filter(t => !isPcHeroToken(t) && !isNonCombatToken(t)));', body)

    def test_pd_fit_to_viewport_never_scrolls(self):
        """A fit-to-viewport pass scales the locations row (floor 0.6) and runs after every render + resize."""
        self.assertIn('function fitStageToViewport', self.src)
        fit = self.src[self.src.index('function fitStageToViewport'):]
        fit = fit[:fit.index('\nfunction ', 10)] if '\nfunction ' in fit[10:] else fit
        self.assertIn('Math.max(0.6, avail / content)', fit)
        self.assertIn("row.style.transform = `scale(${k})`", fit)
        # Wired into the post-render hook alongside name fitting
        sched = self.src[self.src.index('function scheduleFitHeroNames'):self.src.index('function fitStageToViewport')]
        self.assertIn('fitHeroNamePlates();', sched)
        self.assertIn('fitStageToViewport();', sched)

    def test_pd_horizontal_card_is_shipped_shape(self):
        """Horizontal card (portrait left, vertical bar, Name/BHD right) is the only card shape; no toggle."""
        self.assertNotIn('PD_CARD_H', self.src)
        self.assertNotIn("get('cards')", self.src)
        card = self.src[self.src.index('function renderFighterCard'):]
        self.assertIn('pd-h', card)
        self.assertIn('pd-vbar', card)
        self.assertIn('pd-card-body', card)
        # The old vertical card markup (plate as direct child of mvc-card) is gone
        self.assertNotIn('mvc-card ${t.kind}">', card)
        self.assertIn('.pd-h.mvc-card', self.html)
        self.assertIn('.pd-h .pd-vbar', self.html)
        # No on-screen card toggle button
        self.assertNotIn('cardToggle', self.html)
        with_css = DISPLAY.parent.joinpath('style.css').read_text(encoding='utf-8')
        self.assertIn('.pd-h.mvc-card', with_css)
        self.assertIn('.pd-h .pd-vbar', with_css)

    def test_pd_portrait_art_is_square(self):
        self.assertIn('aspect-ratio: 1 / 1', self.html)
        art_block = self.html[self.html.index('.mvc-art {'):self.html.index('.mvc-art img')]
        self.assertIn('aspect-ratio: 1 / 1', art_block)
        self.assertNotIn('height: 16vh', art_block)

    def test_pd_bhd_number_matches_token_name_size(self):
        """BHD numbers = token name; labels ≤ name−2 and fit cell width (no clip)."""
        self.assertIn('function fitHeroNamePlates', self.src)
        body = self.src[self.src.index('function fitHeroNamePlates'):self.src.index('function scheduleFitHeroNames')]
        self.assertIn('shared - 2', body)
        self.assertIn('labelCap', body)
        self.assertIn('.bhd-stat b', body)
        self.assertIn('.bhd-stat span', body)
        self.assertIn("b.style.fontSize = shared + 'px'", body)
        self.assertIn('fitNameSize(s, ctx, labelCap', body)
        self.assertIn('clamp(13px, 2.1vh, 24px)', self.html)
        plate = self.html[self.html.index('.mvc-plate {'):self.html.index('.mvc-card .health-bar-track')]
        self.assertIn('clamp(13px, 2.1vh, 24px)', plate)

    def test_pd_health_bar_fill_colors_in_html_and_css(self):
        for blob in (self.html, (DISPLAY.parent / 'style.css').read_text(encoding='utf-8')):
            self.assertIn('.health-bar-fill.green', blob)
            self.assertIn('.health-bar-fill.yellow', blob)
            self.assertIn('.health-bar-fill.red', blob)
            self.assertIn('.health-bar-fill.out', blob)

    def test_pd_villain_health_bar_uses_percent_bands(self):
        """PD villains: 100–51 green, 50–11 yellow, 10–1 red, 0 gray — not GYRO floors."""
        self.assertIn('function villainHealthBar', self.src)
        fn = self.src[self.src.index('function villainHealthBar'):self.src.index('function lieutenantHealthBar')]
        self.assertIn('pct >= 51', fn)
        self.assertIn('pct >= 11', fn)
        self.assertIn("'out'", fn)
        self.assertNotIn('GreenFloor', fn)
        card = self.src[self.src.index('function renderFighterCard'):self.src.index('async function poll')]
        self.assertIn('villainHealthBar(', card)
        self.assertNotIn('villainBand(row, currentHealth)', card)

    def test_pd_lieutenant_health_bar_uses_library_starting_die(self):
        """Minus/Plus Die is 'd8'; parseInt('d8') is NaN — must strip the d."""
        self.assertIn('function parseDieSize', self.src)
        parse = self.src[self.src.index('function parseDieSize'):self.src.index('function villainHealthBar')]
        self.assertIn('match(', parse)
        self.assertNotIn("parseInt(row.Die || '12'", self.src)
        self.assertIn('function lieutenantHealthBar', self.src)
        fn = self.src[self.src.index('function lieutenantHealthBar'):self.src.index('function renderFighterCard')]
        self.assertIn('parseDieSize', fn)
        self.assertIn('80', fn)
        self.assertIn('66', fn)
        self.assertIn('33', fn)
        card = self.src[self.src.index('function renderFighterCard'):self.src.index('async function poll')]
        self.assertIn("t.kind === 'lieutenant'", card)
        self.assertIn('libRowForToken', card)
        self.assertIn('row.Die', card)
        self.assertIn('lieutenantHealthBar(', card)


if __name__ == '__main__':
    unittest.main()
