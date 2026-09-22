"""Static checks on display.js (Player Display)."""
import unittest
from pathlib import Path

DISPLAY = Path(__file__).resolve().parent.parent / 'display.js'
DISPLAY_HTML = Path(__file__).resolve().parent.parent / 'display.html'
STYLE_CSS = DISPLAY_HTML.parent / 'style.css'


def with_css():
    return STYLE_CSS.read_text(encoding='utf-8')


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

    def test_pd_default_is_capped_roles_2_2_4(self):
        """Per-group column CAPS: Players 2 / Bystanders 2 / Villains 4 (dynamic, not fixed)."""
        self.assertIn('const PD_ALLY_CAP = 2;', self.src)
        self.assertIn('const PD_BYSTANDER_CAP = 2;', self.src)
        self.assertIn('const PD_THREAT_CAP = 4;', self.src)
        body = self.src[self.src.index('function pdMvcStageHtml'):self.src.index('function sortNeutralTokens')]
        # Span = min(cap, token count): small rosters get bigger cards, extras wrap
        self.assertIn('g.span = Math.min(g.cap, g.tokens.length);', body)
        self.assertIn('layout-groups', body)

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
        body = scene[scene.index("const row = document.getElementById('locationsRow');"):scene.index('return `<section class="location-block"') + len('return `<section class="location-block"')]
        self.assertIn('let allies = sortAllyTokens(pcsHere);', body)
        self.assertIn('let neutrals = sortNeutralTokens(here.filter(t => !isPcHeroToken(t) && isNonCombatToken(t)));', body)
        self.assertIn('let enemies = sortEnemyTokens(here.filter(t => !isPcHeroToken(t) && !isNonCombatToken(t)));', body)

    def test_pd_fit_to_viewport_never_scrolls(self):
        """View-box foundation: #pdViewBox spans the full viewport edge to edge; the locations row scales to exactly fit."""
        self.assertIn('id="pdViewBox"', self.html)
        self.assertIn('width: 100vw', self.html)
        self.assertIn('height: 100vh', self.html)
        self.assertIn('overflow: hidden', self.html)
        self.assertIn('function fitStageToViewport', self.src)
        fit = self.src[self.src.index('function fitStageToViewport'):]
        fit = fit[:fit.index('\nfunction ', 10)] if '\nfunction ' in fit[10:] else fit
        # Exact-fit scale — a location must never be clipped off-screen
        self.assertIn('const k = avail / content;', fit)
        self.assertIn("row.style.transform = `scale(${k})`", fit)
        self.assertIn("row.style.overflow = 'hidden'", fit)

    def test_pd_font_scales_with_cell_space(self):
        """fitHeroNamePlates grows/shrinks type with the column width (cell-derived ceiling)."""
        fit = self.src[self.src.index('function fitHeroNamePlates'):self.src.index('function scheduleFitHeroNames')]
        self.assertIn("getPropertyValue('--mvc-count')", fit)
        self.assertIn('colWidth * 0.2', fit)
        self.assertIn('Math.max(24', fit)  # 24px baseline floor, grows with cell

    def test_pd_vertical_card_is_shipped_shape(self):
        """Vertical card (portrait top, bar, Name/BHD below) is the only card shape; no toggle."""
        self.assertNotIn('PD_CARD_H', self.src)
        self.assertNotIn("get('cards')", self.src)
        card = self.src[self.src.index('function renderFighterCard'):]
        self.assertIn('mvc-card ${t.kind}', card)
        self.assertIn('mvc-plate', card)
        # The horizontal card markup/CSS is fully removed (reverted to vertical).
        self.assertNotIn('pd-h', self.src)
        self.assertNotIn('pd-h', self.html)
        self.assertNotIn('pd-h', with_css())
        self.assertNotIn('pd-vbar', self.src)
        self.assertNotIn('pd-vbar', self.html)
        self.assertNotIn('pd-vbar', with_css())
        # No on-screen card toggle button
        self.assertNotIn('cardToggle', self.html)
        # Horizontal health bar fill rides on width again (vertical card shape).
        self.assertIn('style="width:${meter.pct}%"', card)

    def test_pd_challenges_in_header_zone(self):
        """Challenges strip lives in the header zone (above locations), out of the floor budget."""
        idx_header = self.html.index('<div id="displayChallenges">')
        idx_tracker = self.html.index('displayTrackerRow')
        idx_locations = self.html.index('<div id="locationsRow"')
        self.assertLess(idx_tracker, idx_header)
        self.assertLess(idx_header, idx_locations)
        self.assertNotIn('id="displayChallenges"', self.html[idx_locations:])
        self.assertIn('#displayChallenges:empty { display: none; }', self.html)

    def test_pd_scene_layout_grid_rendering(self):
        """Per-scene layout: grid placement, clamped boxes, KO row spans full width, legacy stack default."""
        self.assertIn('function sceneLayoutFor', self.src)
        self.assertIn('function clampInt', self.src)
        render = self.src[self.src.index('function renderScene'):self.src.index('function pathDisplayOutcome')]
        self.assertIn("row.classList.toggle('layout-grid'", render)
        self.assertIn('sceneLayoutFor(scene, locs)', render)
        self.assertIn('grid-column:${pl.col} / span ${pl.colSpan}', render)
        self.assertIn('grid-row:${pl.row} / span ${pl.rowSpan}', render)
        self.assertIn("grid-column:1 / -1", render)  # KO row spans all columns in grid mode
        self.assertIn('layout: scene.layout', self.src)  # layout change must re-render
        self.assertIn('.locations-row.layout-grid', self.html)
        # Validation: unknown/duplicate locations ignored, boxes clamped into the grid.
        self.assertIn('ids.has(p.location)', self.src)
        self.assertIn('byLoc[p.location]', self.src)
        self.assertIn('cols - col + 1', self.src)
        # Per-location token-column overrides (Scene Builder): pdMvcStageHtml
        # accepts colsOverride; placement.cols parses to group cols or null.
        self.assertIn('function parseGroupCols', self.src)
        self.assertIn('groupCols: parseGroupCols(p.cols)', self.src)
        stage = self.src[self.src.index('function pdMvcStageHtml'):self.src.index('function sortNeutralTokens')]
        self.assertIn('colsOverride = null', stage)
        self.assertIn('(colsOverride && colsOverride.allies) || PD_ALLY_CAP', stage)
        self.assertIn('(colsOverride && colsOverride.bystanders) || PD_BYSTANDER_CAP', stage)
        self.assertIn('(colsOverride && colsOverride.threats) || PD_THREAT_CAP', stage)
        render = self.src[self.src.index('function renderScene'):self.src.index('function pathDisplayOutcome')]
        self.assertIn('pl ? pl.groupCols : null', render)
        # Width-derived token budget: the location's floor share becomes its
        # token-column budget when no explicit per-group override is set.
        self.assertIn("const budget = (pl && !pl.groupCols)", render)
        self.assertIn('pl.colSpan * 10 / layoutInfo.cols', render)
        self.assertIn('if (budget) pdAllocateSpans(groups, budget)', self.src)

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
