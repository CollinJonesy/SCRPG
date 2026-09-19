"""Scene editor must expose Challenges and remain scrollable under Collections."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = (ROOT / 'app.js').read_text(encoding='utf-8')
CSS = (ROOT / 'style.css').read_text(encoding='utf-8')
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')


class TestSceneEditorChallenges(unittest.TestCase):
    def test_scene_editor_host_exists(self):
        self.assertIn('id="sceneEditorView"', INDEX)
        self.assertIn('id="challengesPanel"', INDEX)

    def test_add_challenge_wired(self):
        self.assertIn('function addChallenge()', APP)
        self.assertIn('onclick="addChallenge()"', APP)
        self.assertIn('function blankChallenge()', APP)
        self.assertIn('id="challengesEditorList"', APP)

    def test_challenges_section_before_environment(self):
        start = APP.index('function renderSceneEditor')
        end = APP.index('function renderEnvironmentEditorPanel')
        chunk = APP[start:end]
        self.assertLess(chunk.index('Challenges'), chunk.index('Environment'))
        self.assertIn('+ Add Challenge', chunk)

    def test_scene_editor_scrollable_under_collections(self):
        # Parent clips; editors must own overflow-y so Challenges are reachable.
        # Editors live under Library (Issues & Scenes tab) after the nav merge.
        self.assertIn('overflow: hidden', CSS[CSS.index('#libraryView.view'):CSS.index('#libraryView.view') + 200])
        block_start = CSS.index('#sceneEditorView')
        block = CSS[block_start:block_start + 280]
        self.assertIn('overflow-y: auto', block)
        self.assertIn('#issueEditorView', block)
        self.assertIn('#collectionEditorView', block)

    def test_ensure_challenges_array(self):
        self.assertIn('function ensureSceneChallenges', APP)
        self.assertIn('ensureSceneChallenges(await apiGetScene', APP)


if __name__ == '__main__':
    unittest.main()
