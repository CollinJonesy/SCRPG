"""Static checks on app.js that unittest can run without a browser."""
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

    def test_scene_notes_panel_is_left_sidebar(self):
        """Scene Notes is a left column matching Challenges/Activity Log width."""
        html = (Path(__file__).resolve().parent.parent / 'index.html').read_text(encoding='utf-8')
        grid = html[html.index('board-main-grid'):html.index('id="rulesView"')]
        self.assertLess(grid.index('sceneNotesSidebar'), grid.index('locationsRow'))
        self.assertLess(grid.index('locationsRow'), grid.index('board-sidebar-stack'))
        self.assertNotIn('sceneNotesSidebar', grid[grid.index('board-sidebar-stack'):])
        self.assertIn('id="sceneNotesPanel"', grid)
        css = (Path(__file__).resolve().parent.parent / 'style.css').read_text(encoding='utf-8')
        main = css[css.index('.board-main-grid {'):css.index('.board-sidebar-stack')]
        self.assertIn('280px 1fr 280px', main)
        self.assertIn('function renderSceneNotesPanel', self.src)

    def test_scene_notes_fetches_only_current_scene(self):
        """Panel fetches /api/scene-notes/<slug> for the active scene, not all notes."""
        start = self.src.index('async function renderSceneNotesPanel')
        end = self.src.index('function toggleCollapsible')
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
