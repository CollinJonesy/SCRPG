"""Static checks on app.js that unittest can run without a browser."""
import re
import unittest
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / 'app.js'


class TestAppJsContracts(unittest.TestCase):
    def setUp(self):
        self.src = APP.read_text(encoding='utf-8')

    def test_row_issue_cell_uses_its_parameter(self):
        start = self.src.index('function rowIssueCell')
        end = self.src.index('async function toggleEntityIssue')
        body = self.src[start:end]
        self.assertIn('issueFieldFor(dataKind)', body)
        self.assertNotIn('issueFieldFor(kind)', body)

    def test_hero_points_issue_lookup_uses_real_function(self):
        """Regression: hpIssueSlug must call parentIssueForScene — a phantom
        name here throws inside renderToken and blanks the whole board."""
        start = self.src.index('function hpIssueSlug')
        end = self.src.index('function hpFor')
        body = self.src[start:end]
        self.assertIn('parentIssueForScene(', body)
        self.assertNotIn('findIssueForScene(', body)

    def test_add_row_listener_is_wired(self):
        self.assertIn("getElementById('addRowBtn').addEventListener('click'", self.src)
        self.assertIn('function addRow(kind)', self.src)
        self.assertIn('function issuesScenesAddRow', self.src)

    def test_abilities_active_filter_requires_hero_in_library(self):
        self.assertIn('if (!actor || !isActiveFlag(actor.Active)) return false', self.src)
        self.assertIn("if (field === 'Active') renderLibraryTable(currentLibTab)", self.src)
        self.assertIn('abilityOwnerSlug', self.src)

    def test_ability_popup_puts_game_text_first(self):
        self.assertIn('function abilityPopupDescHtml', self.src)
        start = self.src.index('function openBoardAction')
        end = self.src.index('function commitBoardAction')
        body = self.src[start:end]
        self.assertIn('abilityPopupDescHtml(ability)', body)
        html_start = body.index('el.innerHTML')
        self.assertLess(body.index('abilityPopupDescHtml(ability)'), html_start + 400)

    def test_ability_popup_one_row_per_roll_type(self):
        """Each Roll Type gets its own header + Effect Die/Target row (no Action dropdown)."""
        start = self.src.index('function openBoardAction')
        end = self.src.index('function commitBoardAction')
        body = self.src[start:end]
        self.assertIn('board-act-type-header', body)
        self.assertIn('board-act-effect-row', body)
        self.assertIn('boardActEffect_', body)
        self.assertIn('boardActTarget_', body)
        self.assertNotIn('boardActType', body)
        self.assertNotIn('Action <select', body)
        self.assertIn('board-act-apply-gap', body)

    def test_villain_ability_row_is_type_name_roll_letters(self):
        """GM villain chips: A/I/R, name, then A/D/B/H/R/O joined with ' / '."""
        self.assertIn('function abilityTypeLetter', self.src)
        self.assertIn('function abilityRollLetters', self.src)
        letters = self.src[self.src.index('function abilityRollLetters'):self.src.index('function boardAbilityListHtml')]
        self.assertIn("' / '", letters)
        start = self.src.index('function boardAbilityListHtml')
        end = self.src.index('function tokenShowsTwists')
        body = self.src[start:end]
        self.assertIn('abilityTypeLetter', body)
        self.assertIn('abilityRollLetters', body)
        self.assertNotIn('z.length <= 12', body)
        villain = body.split("t.kind === 'villain'")[1]
        self.assertIn('board-ability-type', villain)
        self.assertIn('board-ability-name', villain)
        self.assertIn('board-ability-rolls', villain)
        self.assertIn('villain-ab', villain)
        css = (Path(__file__).resolve().parent.parent / 'style.css').read_text(encoding='utf-8')
        self.assertIn('.board-ability.villain-ab', css)
        villain_css = css[css.index('.board-ability.villain-ab'):css.index('.board-ability-type')]
        self.assertIn('flex-direction: row', villain_css)
        self.assertNotIn('flex-direction: column', villain_css)

    def test_board_right_panel_is_four_tab_surface(self):
        """Left sidebar is gone; the right panel hosts Challenges, Scene Notes,
        Activity Log and Twist Matrix behind 4 tab buttons above one pane."""
        html = (Path(__file__).resolve().parent.parent / 'index.html').read_text(encoding='utf-8')
        grid = html[html.index('board-main-grid'):html.index('id="rulesView"')]
        self.assertNotIn('sceneNotesSidebar', grid)
        self.assertLess(grid.index('locationsRow'), grid.index('board-sidebar-stack'))
        box = grid[grid.index('id="rightPanelBox"'):]
        box = box[:box.index('</aside>')]
        for pane in ('id="challengesPanel"', 'id="sceneNotesPanel"',
                     'id="activityLogPanel"', 'id="twistMatrixPanel"'):
            self.assertIn(pane, box)
        for tab in ("switchRightPanel('challenges')", "switchRightPanel('notes')",
                    "switchRightPanel('log')", "switchRightPanel('matrix')"):
            self.assertIn(tab, box)
        css = (Path(__file__).resolve().parent.parent / 'style.css').read_text(encoding='utf-8')
        main = css[css.index('.board-main-grid {'):css.index('.board-sidebar-stack')]
        self.assertIn('1fr 410px', main)
        self.assertIn('function renderSceneNotesPanel', self.src)
        self.assertIn('function switchRightPanel', self.src)
        self.assertIn('function collapseAllTokens', self.src)
        self.assertIn("track: 'rdTrackPanel'", self.src)

    def test_collapse_all_tokens_button_sits_left_of_reset_lieutenant_dice(self):
        html = (Path(__file__).resolve().parent.parent / 'index.html').read_text(encoding='utf-8')
        self.assertLess(html.index('collapseAllTokensBtn'), html.index('resetLtDiceBtn'))

    def test_minions_are_numbered_on_board(self):
        """spawnToken stamps spawnIndex on minion tokens; names render as
        'Name #n' on the GM plate and in board target dropdowns."""
        self.assertIn('function tokenDisplayName', self.src)
        self.assertIn('function minionSpawnIndex', self.src)
        spawn = self.src[self.src.index('function spawnToken'):
                         self.src.index('function addAllPCsToScene')]
        self.assertIn('minionSpawnIndex', spawn)
        plate = self.src[self.src.index('function renderToken'):self.src.index('function toggleToken')]
        self.assertIn('tokenDisplayName(t)', plate)
        self.assertIn("escHtml(tokenDisplayName(x))", self.src)  # board target dropdowns

    def test_round_track_persists_turn_marks(self):
        """Turn marks ride on the token (turnNumber) instead of memory-only:
        saves keep them, loads rebuild memory marks, and the Rd Track tab
        renders a drag/drop Round Tracker."""
        self.assertIn('function renderRdTrackPanel', self.src)
        self.assertIn('function markTokenGone', self.src)
        self.assertIn('function resetRoundTrack', self.src)
        save = self.src[self.src.index('async function apiSaveScene'):
                        self.src.index('async function apiDeleteScene')]
        self.assertNotIn('delete t.turnNumber', save)
        html = (Path(__file__).resolve().parent.parent / 'index.html').read_text(encoding='utf-8')
        self.assertIn("switchRightPanel('track')", html)
        self.assertIn('id="rdTrackPanel"', html)

    def test_external_token_changes_merge_into_gm_board(self):
        """Sheet-initiated edits (hero location move) merge into the GM's live
        board on SSE instead of only banner-ing — otherwise the GM's next
        Rd Track save writes the stale scene and un-moves the hero."""
        self.assertIn('function mergeExternalTokenState', self.src)
        stale = self.src[self.src.index('async function checkStaleBoardScene'):
                         self.src.index('function reloadBoardFromWarn')]
        self.assertIn('mergeExternalTokenState(fresh)', stale)
        self.assertIn("['locationId', 'ko', 'currentHealth'", stale)

    def test_scene_notes_fetches_only_current_scene(self):
        """Panel fetches /api/scene-notes/<slug> for the active scene, not all notes."""
        start = self.src.index('async function renderSceneNotesPanel')
        end = self.src.index('function switchRightPanel')
        body = self.src[start:end]
        self.assertIn('/api/scene-notes/', body)
        self.assertIn('encodeURIComponent', body)
        self.assertIn('state.activeSlug', body)
        # The old dump-everything call is gone
        self.assertNotIn("fetch('/api/scene-notes')", body)

    def test_villain_token_actions_are_attack_overcome_twists(self):
        start = self.src.index('function boardBasicActionsHtml')
        end = self.src.index('function abilityPopupText')
        body = self.src[start:end]
        self.assertIn("t.kind === 'villain'", body)
        self.assertIn("'Overcome'", body)
        self.assertIn('boardTwistsBtn(t)', body)
        villain_block = body.split("t.kind === 'villain'")[1].split("t.kind === 'minion'")[0]
        self.assertNotIn("'Recover'", villain_block)
        self.assertNotIn("'Hinder'", villain_block)
        self.assertNotIn("'Boost'", villain_block)
        self.assertNotIn("'Defend'", villain_block)

    def test_minion_token_has_overcome_not_twists(self):
        start = self.src.index('function boardBasicActionsHtml')
        end = self.src.index('function abilityPopupText')
        body = self.src[start:end]
        minion_block = body.split("t.kind === 'minion'")[1].split('// Hero (non-NPC)')[0]
        self.assertIn("'Overcome'", minion_block)
        self.assertNotIn('boardTwistsBtn', minion_block)
        self.assertNotIn("'Recover'", minion_block)

    def test_non_combat_npc_has_no_combat_chrome(self):
        start = self.src.index('function boardBasicActionsHtml')
        end = self.src.index('function abilityPopupText')
        body = self.src[start:end]
        self.assertIn('isNonCombatNpc(t)', body)
        self.assertIn("if (isNonCombatNpc(t)) return '';", body)
        self.assertIn('function tokenShowsBhd', self.src)
        self.assertIn('if (tokenShowsBhd(t)) content.innerHTML += bhdRowHtml', self.src)
        # NPC Type options include Bystander in Library; Heroes use Hero Builder.
        self.assertIn("value=\"Bystander\"", self.src)
        mb = (Path(__file__).resolve().parent.parent / 'minion-builder.html').read_text(encoding='utf-8')
        self.assertNotIn('<option>Hero</option>', mb)
        self.assertIn('Bystander</option>', mb)
        self.assertIn("NPC_MODE?'Bystander':'Minion'", mb)
        self.assertIn('!isNonCombatNpc(x)', self.src)

    def test_sort_enemy_puts_non_combat_last(self):
        start = self.src.index('function sortEnemyTokens')
        end = self.src.index('function inferRollTypesFromText')
        body = self.src[start:end]
        self.assertIn('isNonCombatNpc', body)
        self.assertIn('nonCombat', body)
        self.assertIn('isNonCombatNpc', body)

    def test_villain_twists_do_not_use_hero_principles(self):
        start = self.src.index('function openTwistPicker')
        end = self.src.index('function closeTwistPicker')
        body = self.src[start:end]
        self.assertIn("t.kind === 'villain'", body)
        self.assertIn('VILLAIN_TWIST_HELP', body)
        self.assertIn('return;', body)

    def test_recalibrate_layout_occupancy_proportional(self):
        """Recalibrate Layout: occupancy-proportional placements, explicit click only, persists via scene save."""
        self.assertIn('function recalibrateSceneLayout', self.src)
        self.assertIn('function occupancyLayoutPlacements', self.src)
        body = self.src[self.src.index('function recalibrateSceneLayout'):self.src.index('function recalibrateSceneLayout') + 900]
        self.assertIn('s.layout = layout', body)
        self.assertIn('saveSceneDebounced()', body)
        self.assertIn('id="recalibrateLayoutBtn"', Path(APP.parent / 'index.html').read_text(encoding='utf-8'))
        occ = self.src[self.src.index('function occupancyLayoutPlacements'):self.src.index('function recalibrateSceneLayout')]
        self.assertIn('const counts = locs.map(l => (scene.tokens || [])', occ)
        self.assertIn('Math.max(1, c)', occ)
        self.assertIn('const total = Math.max(10, n);', occ)

    def test_scene_editor_links_display_layout_builder(self):
        """Scene Editor exposes the visual Display Layout builder + recalibrate; hint explains no-layout default."""
        self.assertIn('Edit Display Layout', self.src)
        self.assertIn('/scene-layout-builder.html?scene=', self.src)
        idx = self.src.index('Edit Display Layout')
        self.assertIn('recalibrateSceneLayout()', self.src[idx:idx + 400])
        self.assertIn('No layout = default stacked view', self.src)

    def test_next_scene_in_issue_order(self):
        """GM Board Next Scene loads the following sceneSlugs entry and sits by Difficulty."""
        self.assertIn('function findNextSceneSlugInIssue', self.src)
        self.assertIn('function nextSceneInIssue', self.src)
        self.assertIn('function updateNextSceneBtn', self.src)
        body = self.src[self.src.index('function findNextSceneSlugInIssue'):self.src.index('async function nextSceneInIssue')]
        self.assertIn('f.sceneSlugs', body)
        self.assertIn('scenes.indexOf(slug)', body)
        self.assertIn('scenes[idx + 1]', body)
        next_body = self.src[self.src.index('async function nextSceneInIssue'):self.src.index('async function updateNextSceneBtn')]
        self.assertIn('apiSaveScene', next_body)
        self.assertIn('loadSceneToBoard(next)', next_body)
        self.assertIn('updateNextSceneBtn()', self.src)
        html = (Path(__file__).resolve().parent.parent / 'index.html').read_text(encoding='utf-8')
        self.assertIn('id="nextSceneBtn"', html)
        self.assertIn('nextSceneInIssue()', html)
        # Right of difficulty in the same meta row
        meta = html[html.index('board-scene-meta'):html.index('tracker-controls')]
        self.assertLess(meta.index('boardSceneDifficulty'), meta.index('nextSceneBtn'))


    def test_issues_scenes_in_library(self):
        self.assertIn("data-lib=\"issues-scenes\"", (Path(__file__).resolve().parent.parent / 'index.html').read_text(encoding='utf-8'))
        self.assertIn('function renderIssuesScenesTable', self.src)
        self.assertIn('Collection Name', self.src)
        self.assertIn('libCollectionFilter', self.src)
        idx = (Path(__file__).resolve().parent.parent / 'index.html').read_text(encoding='utf-8')
        self.assertNotIn('data-view="collections"', idx)

    def test_issues_scenes_row_load_to_board_first_column(self):
        """Scene rows carry a Load to Board button in the FIRST column, not the editor footer only."""
        start = self.src.index('function renderIssuesScenesTable')
        end = self.src.index('async function onIssuesScenesEnvChange')
        body = self.src[start:end]
        # Header leads with the Load to Board column
        self.assertLess(body.index('<th>Load to Board</th>'), body.index('<th>Collection Name</th>'))
        # Button cell precedes the collection name cell in every row
        self.assertLess(body.index('${loadCell}'), body.index('<td class="name-field">${escHtml(r.collectionName'))
        # Button stops row navigation and reuses the existing loader
        self.assertIn('no-row-nav', body)
        self.assertIn('event.stopPropagation()', body)
        self.assertIn("loadSceneToBoard('${escAttr(r.sceneSlug)}')", body)
        # Empty-row colspan accounts for the new column
        self.assertIn('colspan="7"', body)

    def test_rules_index_glossary_is_one_click(self):
        """Index & Glossary opens content on one click — not a collapsible folder."""
        self.assertIn('function isIndexGlossaryRule', self.src)
        start = self.src.index('function renderRulesList')
        end = self.src.index('function toggleRulesChapter')
        body = self.src[start:end]
        self.assertIn('indexDocs', body)
        self.assertIn('Index &amp; Glossary', body)
        # Index entry calls openRuleDoc, not toggleRulesChapter
        idx_line = [ln for ln in body.splitlines() if 'Index &amp; Glossary' in ln][0]
        self.assertIn('openRuleDoc', idx_line)
        self.assertNotIn('toggleRulesChapter', idx_line)

if __name__ == '__main__':
    unittest.main()


class TestPhase3MoveQueueContracts(unittest.TestCase):
    """Static wiring checks for the staged location-move queue (Phase 3)."""

    def setUp(self):
        self.src = APP.read_text(encoding='utf-8')

    def test_sheets_view_fetches_and_renders_the_move_queue(self):
        self.assertIn("fetch('/api/pending-moves')", self.src)
        start = self.src.index('async function renderSheetsView')
        end = self.src.index('async function generateSheetKey')
        body = self.src[start:end]
        self.assertIn("getElementById('sheetMovesPanel')", body)
        self.assertIn('moveQueueRowHtml(', body)

    def test_move_decision_posts_to_pending_moves(self):
        start = self.src.index('async function sheetMoveDecision')
        end = self.src.index('let __boardMovesSig')
        body = self.src[start:end]
        self.assertIn("'/api/pending-moves'", body)
        self.assertIn("op, id", body)

    def test_board_prompt_panel_is_wired(self):
        self.assertIn("getElementById('boardMovesPanel')", self.src)
        self.assertIn("getElementById('boardMovesContent')", self.src)
        self.assertIn('function renderBoardMoves(moves)', self.src)
        self.assertIn('maybeRenderBoardMoves();', self.src)

    def test_sse_hook_never_auto_reloads_the_board(self):
        """The standing caveat: an SSE event must never reload over the GM's
        session. Only the user-clicked banner button may refresh the board."""
        start = self.src.index('function onGmDataChanged')
        end = self.src.index('let __gmSceneSig')
        body = self.src[start:end]
        self.assertIn('connectGmEvents', self.src)
        self.assertNotIn('refreshBoardFromServer', body)
        self.assertNotIn('location.reload', body)
        self.assertIn('checkStaleBoardScene', body)

    def test_stale_warning_uses_own_save_baseline(self):
        # every GM scene write/fetch updates the fingerprint baseline, so the
        # banner only fires for EXTERNAL changes
        self.assertIn('gmSceneBaseline(payload);', self.src)  # apiSaveScene
        self.assertIn('gmSceneBaseline(fresh);', self.src)    # refreshBoardFromServer
        self.assertIn('gmSceneBaseline(state.scene);', self.src)  # init + loaders
        start = self.src.index('function gmSceneBaseline')
        end = self.src.index('async function checkStaleBoardScene')
        body = self.src[start:end]
        self.assertIn("warn.style.display = 'none'", body)


class TestPhase3PlayerSheetMoveContracts(unittest.TestCase):
    """Static wiring checks on the player sheet's inline JS (Phase 3)."""

    def setUp(self):
        html = (Path(__file__).resolve().parent.parent / 'player-sheet.html').read_text(encoding='utf-8')
        blocks = re.findall(r'<script>([\s\S]*?)</script>', html)
        self.src = '\n'.join(blocks)

    def test_move_ui_and_pending_banner_render_in_the_location_card(self):
        self.assertIn('function movePendingHtml(p)', self.src)
        self.assertIn('function moveUiHtml(p)', self.src)
        self.assertIn('${movePendingHtml(p)}', self.src)
        self.assertIn('${occupantsHtml(p)}${moveUiHtml(p)}', self.src)

    def test_move_request_is_staged_and_key_gated(self):
        self.assertIn('function openMoveStaged()', self.src)
        self.assertIn("aysState = { moveRequest: true", self.src)
        self.assertIn("fetch('/api/player-move'", self.src)
        start = self.src.index('async function confirmMoveRequest')
        end = self.src.index('function openEmergencySwitchStaged')
        body = self.src[start:end]
        self.assertIn('toLocationId', body)
        self.assertIn("hero: HERO, key: KEY", body)

    def test_poll_pauses_while_the_move_select_has_focus(self):
        start = self.src.index('async function tick()')
        end = self.src.index('// --- Live updates')
        body = self.src[start:end]
        self.assertIn("getElementById('moveSel')", body)
        self.assertIn('document.activeElement === moveSel', body)

    def test_target_options_filter_bystanders_ko_and_self_attack(self):
        start = self.src.index('function targetOptionsFor')
        end = self.src.index('function modSpendHtml')
        body = self.src[start:end]
        self.assertIn("t.npcType === 'Bystander'", body)
        self.assertIn('!t.ko', body)
        self.assertIn("type === 'Attack'", body)


class TestModularHeroModes(unittest.TestCase):
    """Modular archetype: mode data, token gating, and ability-popup mode changes."""
    def setUp(self):
        self.src = APP.read_text(encoding='utf-8')

    def test_modes_md_parser_and_cache_exist(self):
        self.assertIn('function parseModesMd', self.src)
        self.assertIn('##\\s*Modes', self.src)
        self.assertIn('function heroModesForToken', self.src)
        self.assertIn('function heroCurrentMode', self.src)

    def test_ability_filter_gates_by_active_mode(self):
        self.assertIn('const abMode = String(a.Mode || \'\').trim();', self.src)
        self.assertIn('return abMode === curMode;', self.src)
        self.assertIn('if (powerless) return false;', self.src)

    def test_token_renders_mode_ui_and_locked_actions(self):
        self.assertIn('function renderHeroModeHtml', self.src)
        self.assertIn('function setHeroMode', self.src)
        self.assertIn('hero-mode-select', self.src)
        self.assertIn('board-act-locked', self.src)
        self.assertIn('function modeLockedActions', self.src)
        # Immobile blocks both mouse and touch drag paths.
        self.assertIn("card.draggable = !immobile;", self.src)
        self.assertIn("heroCurrentMode(tok)?.immobile", self.src)

    def test_popup_mode_change_ordering(self):
        self.assertIn("openQuickSwitch(tokenId, a)", self.src)
        self.assertIn("openEmergencySwitch(tokenId, a)", self.src)
        self.assertIn("position: 'post'", self.src)
        self.assertIn("position: 'pre'", self.src)
        self.assertIn("if (modeFirst) applyModeChange();", self.src)
        self.assertIn("if (!modeFirst) applyModeChange();", self.src)
        self.assertIn('continueQuickSwitch', self.src)
        self.assertIn('commitEmergencySwitch', self.src)
