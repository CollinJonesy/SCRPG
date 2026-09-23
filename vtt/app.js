/* ============================================================
   SCRPG Scene Board — app.js (GM Console)
   ============================================================ */

/* ---------------- Constants: rules data ---------------- */

const DICE_LADDER = [4, 6, 8, 10, 12];

// Hero GYRO chart — Max Health 17-40, from the printed book chart. Heroes ONLY.
const HERO_GYRO_CHART = {
  40:{green:[30,40],yellow:[15,29],red:[1,14]}, 39:{green:[30,39],yellow:[15,29],red:[1,14]},
  38:{green:[29,38],yellow:[14,28],red:[1,13]}, 37:{green:[29,37],yellow:[14,28],red:[1,13]},
  36:{green:[28,36],yellow:[14,27],red:[1,13]}, 35:{green:[27,35],yellow:[13,26],red:[1,12]},
  34:{green:[26,34],yellow:[13,25],red:[1,12]}, 33:{green:[26,33],yellow:[13,25],red:[1,12]},
  32:{green:[25,32],yellow:[12,24],red:[1,11]}, 31:{green:[24,31],yellow:[12,23],red:[1,11]},
  30:{green:[23,30],yellow:[12,22],red:[1,11]}, 29:{green:[23,29],yellow:[11,22],red:[1,10]},
  28:{green:[22,28],yellow:[11,21],red:[1,10]}, 27:{green:[21,27],yellow:[11,20],red:[1,10]},
  26:{green:[21,26],yellow:[10,20],red:[1,9]},  25:{green:[20,25],yellow:[10,19],red:[1,9]},
  24:{green:[19,24],yellow:[10,18],red:[1,9]},  23:{green:[19,23],yellow:[9,18],red:[1,8]},
  22:{green:[18,22],yellow:[9,17],red:[1,8]},   21:{green:[17,21],yellow:[9,16],red:[1,8]},
  20:{green:[16,20],yellow:[8,15],red:[1,7]},   19:{green:[15,19],yellow:[8,14],red:[1,7]},
  18:{green:[15,18],yellow:[8,14],red:[1,7]},   17:{green:[14,17],yellow:[7,13],red:[1,6]},
};

// Scene Tracker presets — star counts confirmed directly from the book page image.
// Scene Tracker presets — confirmed values per Collin, 2026-08-24 (supersedes
// both the original book-image star count and Bullpen_SceneBuilding.md's numbers).
const TRACKER_PRESETS = {
  standard:  { label: 'Standard',  stars: ['green','green','yellow','yellow','yellow','yellow','red','red'] },
  prolonged: { label: 'Prolonged', stars: ['green','green','green','yellow','yellow','yellow','yellow','yellow','red','red','red'] },
  epic:      { label: 'Epic',      stars: ['green','yellow','yellow','yellow','red','red','red','red'] },
};

// Scene Difficulty reference table (pages 185-188) — shown as guidance, not enforced.
const DIFFICULTY_TABLE = [
  { tier: 'Easy',      challenges: '1-2 Successes (or 1 + Advanced)',   minions: 'H×d6',  lieutenants: '½H×d8',  villains: 'None',          environment: 'None' },
  { tier: 'Moderate',  challenges: '3-4 Successes (or 1-2 + Advanced)', minions: 'H×d8',  lieutenants: '½H×d10', villains: 'Minor villain', environment: 'Standard' },
  { tier: 'Difficult', challenges: '5+ Successes (or 3-4 + Advanced)',  minions: 'H×d10', lieutenants: '½H×d12', villains: 'Major villain', environment: 'Hostile' },
];

const CHALLENGE_TYPES = ['Simple', 'Linear', 'Multiple Solutions', 'Branching Outcomes', 'Timed', 'Doomsday Device'];
const DOOMSDAY_SPEEDS = [
  { value: '1', label: 'Advance 1 space' },
  { value: '2', label: 'Advance 2 spaces' },
  { value: 'zone-start', label: 'Advance to start of next zone' },
  { value: 'zone-end', label: 'Advance to end of next zone' },
];

// Villain Approaches (18) and Archetypes (14) — pages 208-239. Base Health
// values and Archetype bonuses feed the Health formula: (H×5) + approach + archetype + upgrades.
const VILLAIN_APPROACHES = [
  { name: 'Adaptive', health: 15 }, { name: 'Ancient', health: 30 }, { name: 'Bully', health: 25 },
  { name: 'Creator', health: 15 }, { name: 'Dampening', health: 25 }, { name: 'Disruptive', health: 20 },
  { name: 'Focused', health: 15 }, { name: 'Generalist', health: 25 }, { name: 'Leech', health: 15 },
  { name: 'Mastermind', health: 20 }, { name: 'Ninja', health: 20 }, { name: 'Overpowered', health: 35 },
  { name: 'Prideful', health: 25 }, { name: 'Relentless', health: 20 }, { name: 'Skilled', health: 15 },
  { name: 'Specialized', health: 20 }, { name: 'Tactician', health: 20 }, { name: 'Underpowered', health: 10 },
];
const VILLAIN_ARCHETYPES = [
  { name: 'Bruiser', health: 20, status: 'Health zones (like heroes): Green d4 → Yellow d8 → Red d12' },
  { name: 'Domain', health: 30, status: '3+ environment threats = d10; 1-2 = d8; 0 = d6' },
  { name: 'Formidable', health: 25, status: 'All weakness penalties, no bonuses = weak; mixed = d8; no weakness penalties = d12' },
  { name: 'Fragile', health: -5, status: 'Health zones (inverse): Green d8 → Yellow d6 → Red d4' },
  { name: 'Guerrilla', health: 20, status: '4+ opponents = d10; 2-3 = d8; 0-1 = d6' },
  { name: 'Indomitable', health: 20, status: 'Always d8' },
  { name: 'Inhibitor', health: 10, status: '3+ heroes w/ penalties = d10; 1-2 = d8; 0 = d6' },
  { name: 'Inventor', health: 10, status: '4+ inventions = d12; 2-3 = d8; 1 = d6; 0 = d4' },
  { name: 'Legion', health: -5, status: '9+ minions = weak; 5-8 = d6; 3-4 = d8; 1-2 = d10; 0 = d12' },
  { name: 'Loner', health: 10, status: '0 other villains = d10; 1-2 = d8; 3+ = d6' },
  { name: 'Overlord', health: 15, status: 'More minions = stronger' },
  { name: 'Predator', health: 15, status: 'Fewer opponents = better' },
  { name: 'Squad', health: 5, status: 'Based on # allies present' },
  { name: 'Titan', health: 30, status: 'Built-in challenge to reduce status' },
];
function findApproach(name) { return VILLAIN_APPROACHES.find(a => a.name.toLowerCase() === (name || '').trim().toLowerCase()); }
function findArchetype(name) { return VILLAIN_ARCHETYPES.find(a => a.name.toLowerCase() === (name || '').trim().toLowerCase()); }

const HEROES_HEADERS = ['Slug','Name','Alias','Player',
  'Power1','PowerDie1','Power1DisplayName','Power2','PowerDie2','Power2DisplayName','Power3','PowerDie3','Power3DisplayName','Power4','PowerDie4','Power4DisplayName','Power5','PowerDie5','Power5DisplayName','Power6','PowerDie6','Power6DisplayName',
  'Quality1','QualityDie1','Quality1DisplayName','Quality2','QualityDie2','Quality2DisplayName','Quality3','QualityDie3','Quality3DisplayName','Quality4','QualityDie4','Quality4DisplayName','Quality5','QualityDie5','Quality5DisplayName','Quality6','QualityDie6','Quality6DisplayName',
  'MaxHealth','GreenStatusDie','YellowStatusDie','RedStatusDie','Active','Origin','Affiliation',
  'Principle1Name','Principle1Roleplay','Principle1MinorTwist','Principle1MajorTwist',
  'Principle2Name','Principle2Roleplay','Principle2MinorTwist','Principle2MajorTwist'];
const VILLAINS_HEADERS = ['Slug','Name','Approach','Archetype',
  'Power1','PowerDie1','Power2','PowerDie2','Power3','PowerDie3','Power4','PowerDie4','Power5','PowerDie5',
  'Quality1','QualityDie1','Quality2','QualityDie2','Quality3','QualityDie3','Quality4','QualityDie4','Quality5','QualityDie5','Quality6','QualityDie6',
  'MaxHealth','GreenFloor','YellowFloor','RedFloor','GreenStatusDie','YellowStatusDie','RedStatusDie',
  'Status1Label','Status1Die','Status2Label','Status2Die','Status3Label','Status3Die','Status4Label','Status4Die','Status5Label','Status5Die','Active','Origin','Affiliation'];
const MINIONS_HEADERS = ['Slug','Name','Type','Die','Faction','PerHero','Active','Origin','Affiliation'];
const NPCS_HEADERS = ['Slug','Name','Type','Die','Faction','PerHero','Active','Origin','Affiliation'];
const ENVIRONMENTS_HEADERS = [
  'Slug','Name',
  'Trait1','TraitDie1','Trait2','TraitDie2','Trait3','TraitDie3',
  'Active','Origin',
  'GreenMinorTwist1','GreenMinorTwist1Description',
  'GreenMinorTwist2','GreenMinorTwist2Description',
  'GreenMajorTwist','GreenMajorTwistDescription',
  'YellowMinorTwist1','YellowMinorTwist1Description',
  'YellowMinorTwist2','YellowMinorTwist2Description',
  'YellowMajorTwist','YellowMajorTwistDescription',
  'RedMinorTwist1','RedMinorTwist1Description',
  'RedMinorTwist2','RedMinorTwist2Description',
  'RedMajorTwist','RedMajorTwistDescription',
  'MinionSlugs','LieutenantSlugs',
];
const LOCATIONS_HEADERS = ['Slug','Name','EnvironmentSlug','Active'];
const TWISTS_HEADERS = ['Slug','Name','EffectType','Severity','Formula','Description'];
const ABILITIES_HEADERS = ['Slug','Zone','Name','DisplayName','Type','GameText','RollType','DieSource','EffectDieHint','Mode'];
const TWIST_EFFECT_TYPES = [
  'Story Consequence', 'Story Complication (Later)', 'Hinder', 'Boost (Enemies)',
  'Damage (Allies)', 'Defend (Enemies)', 'Add Threats', 'Create Challenge',
  'Advance Scene Tracker', 'Combination',
];

const LIB_HEADERS = { heroes: HEROES_HEADERS, villains: VILLAINS_HEADERS, minions: MINIONS_HEADERS, npcs: NPCS_HEADERS, environments: ENVIRONMENTS_HEADERS, locations: LOCATIONS_HEADERS, twists: TWISTS_HEADERS, abilities: ABILITIES_HEADERS };
function libHeaders(kind) { return LIB_HEADERS[kind]; }

function naturalNameSort(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
}
/** Split semicolon/comma slug lists from environment CSV cells. */
function splitEnvSlugs(val) {
  if (Array.isArray(val)) return val.map(s => String(s || '').trim()).filter(Boolean);
  return String(val || '').split(/[;\n,]+/).map(s => s.trim()).filter(Boolean);
}
function envSlugNameList(slugCell, rows) {
  const slugs = splitEnvSlugs(slugCell);
  if (!slugs.length) return '<span class="empty-hint">—</span>';
  const names = slugs.map(s => {
    const hit = (rows || []).find(r => r.Slug === s);
    const die = hit && hit.Die ? ` (${hit.Die})` : '';
    return (hit ? hit.Name : s) + die;
  }).sort(naturalNameSort);
  return `<div class="name-list">${names.map(n => `<span>${escHtml(n)}</span>`).join('')}</div>`;
}
function envLocationNames(envSlug) {
  const locs = (state.locations || []).filter(l => (l.EnvironmentSlug || '') === envSlug);
  if (!locs.length) return '<span class="empty-hint">—</span>';
  const names = locs.map(l => l.Name || l.Slug).sort(naturalNameSort);
  return `<div class="name-list">${names.map(n => `<span>${escHtml(n)}</span>`).join('')}</div>`;
}
function envTwistSummary(row) {
  if (!row) return '<span class="empty-hint">—</span>';
  const zones = [
    ['G', 'Green'],
    ['Y', 'Yellow'],
    ['R', 'Red'],
  ];
  const parts = [];
  zones.forEach(([short, Z]) => {
    const names = [];
    ['MinorTwist1', 'MinorTwist2', 'MajorTwist'].forEach(slot => {
      const n = (row[Z + slot] || '').trim();
      if (n) names.push(n);
    });
    if (names.length) parts.push(`<span><b>${short}</b> ${escHtml(names.join(' · '))}</span>`);
  });
  if (!parts.length) return '<span class="empty-hint">—</span>';
  return `<div class="name-list">${parts.join('')}</div>`;
}
function openEnvironmentBuilder(slug) {
  const q = slug ? ('?edit=' + encodeURIComponent(slug)) : '';
  window.open('/environment-builder.html' + q, '_blank');
}
function libMinion(slug) {
  return (state.minions || []).find(m => m.Slug === slug)
    || (state.npcs || []).find(m => m.Slug === slug) || null;
}
function isNpcToken(t) {
  if (!t) return false;
  if (t.npc) return true;
  return !!(state.npcs || []).find(m => m.Slug === t.slug);
}
function npcTypeOf(t) {
  if (!t) return '';
  const row = libMinion(t.slug) || {};
  const ty = String(row.Type || '').trim();
  if (ty) return ty;
  if (t.kind === 'lieutenant') return 'Lieutenant';
  if (t.kind === 'hero') return 'Hero';
  return 'Minion';
}
function isNonCombatNpc(t) {
  if (!t) return false;
  if (t.nonCombat) return true;
  return isNpcToken(t) && /^bystander$/i.test(npcTypeOf(t));
}
function libRowForToken(t) {
  if (!t) return null;
  if (t.kind === 'hero') return (state.heroes || []).find(h => h.Slug === t.slug) || null;
  if (t.kind === 'villain') return (state.villains || []).find(v => v.Slug === t.slug) || null;
  return libMinion(t.slug);
}
function tokenAffiliation(t) {
  if (!t) return 'Neutral';
  if (t.affiliation && ['Ally', 'Enemy', 'Neutral'].includes(t.affiliation)) return t.affiliation;
  const row = libRowForToken(t) || {};
  const a = String(row.Affiliation || '').trim();
  if (['Ally', 'Enemy', 'Neutral'].includes(a)) return a;
  if (t.kind === 'hero') return 'Ally';
  if (t.kind === 'villain' || t.kind === 'minion' || t.kind === 'lieutenant') return 'Enemy';
  return 'Neutral';
}
function isPcHeroTokenGm(t) {
  if (!t || t.kind !== 'hero' || t.npc) return false;
  if (!t.slug) return false;
  if (!(state.heroes || []).length) return true;
  return !!(state.heroes || []).find(h => h.Slug === t.slug);
}
function tokenTypeSortRank(t) {
  // Hero, Villain, Lieutenant, Minion, Bystander
  if (isNonCombatNpc(t)) return 4;
  if (t.kind === 'hero' || npcTypeOf(t) === 'Hero') return 0;
  if (t.kind === 'villain') return 1;
  if (t.kind === 'lieutenant' || npcTypeOf(t) === 'Lieutenant') return 2;
  if (t.kind === 'minion') return 3;
  return 5;
}
function sortAllyTokens(tokens) {
  const list = (tokens || []).slice();
  const pcs = list.filter(isPcHeroTokenGm).sort(byTokenName);
  const rest = list.filter(t => !isPcHeroTokenGm(t))
    .sort((a, b) => tokenTypeSortRank(a) - tokenTypeSortRank(b) || byTokenName(a, b));
  return pcs.concat(rest);
}
function sortNeutralTokens(tokens) {
  return (tokens || []).slice()
    .sort((a, b) => tokenTypeSortRank(a) - tokenTypeSortRank(b) || byTokenName(a, b));
}
function tokenShowsBhd(t) {
  // NPCs never get Boost/Hinder/Defend boxes; Bystander has no combat chrome at all.
  if (isNpcToken(t) || isNonCombatNpc(t)) return false;
  return true;
}
function tokenKindFromMinionRow(row) {
  const ty = String((row && row.Type) || '').trim();
  if (ty === 'Lieutenant') return 'lieutenant';
  // Hero / Bystander / Minion (and unknown) use the minion token shell on the board.
  return 'minion';
}
function isActiveFlag(v) {
  if (v === '' || v == null) return true;
  const s = String(v).toLowerCase();
  return s !== 'false' && s !== '0' && s !== 'no';
}
function byTokenName(a, b) {
  return naturalNameSort(a.name, b.name);
}
function dieSizeOf(t) { return Number(t.currentDie) || 0; }
function villainMaxHealthOf(t) {
  const row = (state.villains || []).find(v => v.Slug === t.slug) || {};
  return Number(row.MaxHealth) || Number(t.maxHealth) || 0;
}
function sortEnemyTokens(tokens) {
  // Bystander always last. Others by Type rank then name (Affiliation already filtered).
  const combat = (tokens || []).filter(t => !isNonCombatNpc(t));
  const nonCombat = (tokens || []).filter(t => isNonCombatNpc(t)).sort(byTokenName);
  const heroes = combat.filter(t => t.kind === 'hero' || npcTypeOf(t) === 'Hero')
    .sort(byTokenName);
  const villains = combat.filter(t => t.kind === 'villain' && npcTypeOf(t) !== 'Hero')
    .sort((a, b) => villainMaxHealthOf(b) - villainMaxHealthOf(a) || byTokenName(a, b));
  const lieutenants = combat.filter(t => t.kind === 'lieutenant' || npcTypeOf(t) === 'Lieutenant')
    .filter(t => t.kind !== 'villain' && t.kind !== 'hero')
    .sort((a, b) => dieSizeOf(b) - dieSizeOf(a) || byTokenName(a, b));
  const minions = combat.filter(t => !heroes.includes(t) && !villains.includes(t) && !lieutenants.includes(t))
    .sort((a, b) => dieSizeOf(b) - dieSizeOf(a) || byTokenName(a, b));
  return heroes.concat(villains, lieutenants, minions, nonCombat);
}
function inferRollTypesFromText(text) {
  const t = String(text || '');
  return ['Attack', 'Defend', 'Boost', 'Hinder', 'Overcome', 'Recover'].filter(a =>
    new RegExp('\\b' + a + '\\b', 'i').test(t)
  );
}
/** Owner slug on an abilities.csv row (Slug; legacy HeroSlug still accepted). */
function abilityOwnerSlug(a) {
  return String((a && (a.Slug || a.HeroSlug)) || '').trim();
}

/* ---------------- Server API ---------------- */

async function apiReadCsv(kind) {
  const res = await fetch('/api/csv/' + kind);
  const text = await res.text();
  if (!text.trim()) return [];
  return Papa.parse(text.trim(), { header: true, skipEmptyLines: true }).data;
}
async function apiWriteCsv(kind, headers, rows) {
  const csv = Papa.unparse({ fields: headers, data: rows.map(r => headers.map(h => r[h] ?? '')) });
  await fetch('/api/csv/' + kind, { method: 'PUT', body: csv });
}
async function apiReadMd(kind, slug) {
  const res = await fetch(`/api/md/${kind}/${encodeURIComponent(slug)}`);
  return res.ok ? await res.text() : '';
}
async function apiWriteMd(kind, slug, text) {
  await fetch(`/api/md/${kind}/${encodeURIComponent(slug)}`, { method: 'PUT', body: text });
}
async function apiCampaignName() {
  const res = await fetch('/api/campaign-name');
  return res.ok ? await res.text() : 'campaign';
}
async function apiListScenes() {
  const res = await fetch('/api/scenes');
  return res.ok ? await res.json() : [];
}
async function apiGetScene(slug) {
  const res = await fetch(`/api/scenes/${encodeURIComponent(slug)}`);
  return res.ok ? await res.json() : null;
}
async function apiSaveScene(slug, scene) {
  const payload = JSON.parse(JSON.stringify(scene));
  (payload.tokens || []).forEach(t => { delete t.turnNumber; });
  await fetch(`/api/scenes/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(payload, null, 2) });
}
async function apiDeleteScene(slug) {
  await fetch(`/api/scenes/${encodeURIComponent(slug)}`, { method: 'DELETE' });
}
async function apiGetActiveScene() {
  const res = await fetch('/api/active-scene');
  return res.ok ? await res.json() : { slug: null };
}
async function apiSetActiveScene(slug) {
  await fetch('/api/active-scene', { method: 'PUT', body: JSON.stringify({ slug }) });
}
async function apiPutRevealedRoll(rollData) {
  await fetch('/api/revealed-roll', { method: 'PUT', body: JSON.stringify(rollData) });
}
async function apiClearRevealedRoll() {
  await fetch('/api/revealed-roll', { method: 'PUT', body: 'null' });
}
async function apiUploadBackground(key, file) {
  await fetch(`/api/backgrounds/${encodeURIComponent(key)}`, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
}
async function apiDeleteBackground(key) {
  await fetch(`/api/backgrounds/${encodeURIComponent(key)}`, { method: 'DELETE' });
}
function backgroundUrl(key) {
  return `/api/backgrounds/${encodeURIComponent(key)}`;
}
function portraitKey(kind, slug) {
  const pk = kind === 'hero' ? 'hero' : kind === 'villain' ? 'villain' : 'minion';
  return `portrait-${pk}-${slug}`;
}
async function uploadPortraitFile(kind, slug, file) {
  if (!file || !slug) return;
  await apiUploadBackground(portraitKey(kind, slug), file);
  portraitBust[portraitKey(kind, slug)] = Date.now();
  toast('Portrait uploaded.');
  renderLibraryTable(kind === 'minion' ? 'minions' : kind === 'hero' ? 'heroes' : kind === 'villain' ? 'villains' : currentLibTab);
}
let portraitBust = {};
function portraitSrc(kind, slug) {
  const key = portraitKey(kind, slug);
  const b = portraitBust[key];
  return backgroundUrl(key) + (b ? ('?t=' + b) : '');
}
function portraitCellHtml(kind, slug) {
  if (!slug) return '<td class="portrait-cell"><span class="empty-hint">Name first</span></td>';
  const pk = kind === 'heroes' ? 'hero' : kind === 'villains' ? 'villain' : 'minion';
  return `<td class="portrait-cell">
    <img class="lib-portrait-thumb" src="${portraitSrc(pk, slug)}" alt="" onerror="this.style.visibility='hidden'">
    <label class="lib-portrait-btn">Upload<input type="file" accept="image/*" onchange="uploadPortraitFile('${pk}','${escAttr(slug)}',this.files[0])"></label>
  </td>`;
}

/* ---------------- App state ---------------- */

const state = {
  heroes: [], villains: [], minions: [], npcs: [], environments: [], locations: [], twists: [], abilities: [],
  scenesList: [],       // [{slug, name}]
  issuesList: [],
  collectionsList: [],
  activeSlug: null,     // slug of scene currently loaded on the Board
  scene: null,          // the loaded scene object (definition + live state combined)
  heroPoints: {},       // {issueSlug: {heroSlug: count}} — issue-scoped, max 5 per hero (SCRPG p.31)
  editingSlug: null,    // slug currently open in the Scene Editor (may differ from activeSlug)
  turnMarks: {},        // tokenId -> round order; memory only, not saved
};

let currentLibTab = 'heroes';
let currentNotesTarget = null;

/* ---------------- Utilities ---------------- */

function slugify(name) {
  return (name || 'entry').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || ('entry-' + Date.now());
}
function uid(prefix) { return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 10); }

function ensureMods(scene) {
  if (!scene) return [];
  if (!Array.isArray(scene.mods)) scene.mods = [];
  return scene.mods;
}
function liveMods(scene) { return ensureMods(scene).filter(m => !m.consumed); }
function modsCreatedBy(scene, tokenId, kind) {
  return liveMods(scene).filter(m => m.creatorId === tokenId && (!kind || m.kind === kind));
}
function modsOnTarget(scene, tokenId, kind) {
  return liveMods(scene).filter(m => m.targetId === tokenId && (!kind || m.kind === kind));
}
function bhdTotals(scene, token) {
  const boost = modsCreatedBy(scene, token.id, 'boost').reduce((s, m) => s + (Number(m.value) || 0), 0);
  const hinder = modsCreatedBy(scene, token.id, 'hinder').reduce((s, m) => s + (Number(m.value) || 0), 0);
  const defend = modsOnTarget(scene, token.id, 'defend').reduce((s, m) => s + (Number(m.value) || 0), 0);
  return { boost, hinder, defend };
}
function creatorHasExclusivePersistent(scene, creatorId) {
  return liveMods(scene).some(m => m.creatorId === creatorId && m.exclusivePersistent);
}
function locName(scene, locId) {
  const loc = (scene.locations || []).find(l => l.id === locId);
  return loc ? loc.name : '';
}
function bhdDisplay(scene, token) {
  const auto = bhdTotals(scene, token);
  const d = token.bhdDelta || {};
  return {
    boost: Math.max(0, auto.boost + (Number(d.boost) || 0)),
    hinder: Math.max(0, auto.hinder + (Number(d.hinder) || 0)),
    defend: Math.max(0, auto.defend + (Number(d.defend) || 0)),
  };
}
function setBhdDelta(tokenId, kind, typed) {
  const t = findTok(tokenId);
  if (!t) return;
  const auto = bhdTotals(state.scene, t)[kind] || 0;
  const want = Math.max(0, Number(typed) || 0);
  t.bhdDelta = t.bhdDelta || {};
  t.bhdDelta[kind] = want - auto;
  saveSceneDebounced();
  renderTokens();
}
function bhdRowHtml(t, scene, interactive) {
  const n = bhdDisplay(scene, t);
  // Modular hero modes can lock Boost/Hinder/Defend out (Recover never is).
  const locked = (t.kind === 'hero' && interactive) ? modeLockedActions(t) : new Set();
  const cell = (kind, label, val) => {
    if (interactive && locked.has(kind)) {
      return `<div class="bhd-stat ${kind} board-act-locked"><span onclick="event.stopPropagation();toast('${label} is locked in this mode')" title="Locked while this mode is active">${label} 🔒</span><input type="number" min="0" value="${val}" disabled></div>`;
    }
    return interactive
      ? `<div class="bhd-stat ${kind}"><span onclick="openModCreate('${t.id}','${kind}')">${label}</span><input type="number" min="0" value="${val}" onclick="event.stopPropagation()" onchange="setBhdDelta('${t.id}','${kind}',this.value)"></div>`
      : `<div class="bhd-stat ${kind}"><span>${label}</span><b>${val}</b></div>`;
  };
  const hasHealth = t.kind === 'hero' || t.kind === 'villain';
  let html = `${cell('boost','BOOST', n.boost)}${cell('hinder','HINDER', n.hinder)}${cell('defend','DEFEND', n.defend)}`;
  if (hasHealth) {
    const hp = Number(t.currentHealth) || 0;
    html += interactive
      ? `<div class="bhd-stat health"><span onclick="event.stopPropagation();heroRecoverOrExplain('${t.id}')" title="Recover">HEALTH</span><input type="number" min="0" value="${hp}" onclick="event.stopPropagation()" onchange="setHealth('${t.id}',this.value)"></div>`
      : `<div class="bhd-stat health"><span>HEALTH</span><b>${hp}</b></div>`;
  }
  return `<div class="bhd-row${hasHealth ? ' bhd-row-4' : ''}${t.kind !== 'hero' ? ' bhd-row-lg' : ''}">${html}</div>`;
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2200);
}
function rollDie(size) { return Math.floor(Math.random() * size) + 1; }
function degradeDie(size) {
  const i = DICE_LADDER.indexOf(size);
  return i <= 0 ? null : DICE_LADDER[i - 1];
}
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
function escAttr(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
function escHtml(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

/* ---------------- GYRO band logic (per-character health) ---------------- */

function heroBand(maxHealth, current) {
  let chart = HERO_GYRO_CHART[maxHealth];
  let approx = false;
  if (!chart) { approx = true; chart = HERO_GYRO_CHART[Math.max(17, Math.min(40, maxHealth || 20))]; }
  let band = 'out';
  if (current >= chart.green[0]) band = 'green';
  else if (current >= chart.yellow[0]) band = 'yellow';
  else if (current >= chart.red[0]) band = 'red';
  return { band, approx };
}
function villainBand(v, current) {
  const g = v.GreenFloor === '' || v.GreenFloor == null ? NaN : Number(v.GreenFloor);
  const y = v.YellowFloor === '' || v.YellowFloor == null ? NaN : Number(v.YellowFloor);
  const r = v.RedFloor === '' || v.RedFloor == null ? NaN : Number(v.RedFloor);
  if (!isNaN(g) && current >= g) return 'green';
  if (!isNaN(y) && current >= y) return 'yellow';
  if (!isNaN(r) && current >= r) return 'red';
  return 'out';
}

// Hero status is whichever is WORSE (closer to Out) between personal Health
// band and the Scene Tracker's current color -- per the actual rule.
const GYRO_RANK = { green: 3, yellow: 2, red: 1, out: 0 };
function computeHeroStatus(maxHealth, currentHealth, scene) {
  const personal = heroBand(maxHealth, currentHealth);
  let sceneBand = 'green';
  if (scene && scene.tracker && scene.tracker.stars && scene.tracker.stars.length) {
    sceneBand = scene.tracker.stars[scene.tracker.position] || 'green';
  }
  const worse = GYRO_RANK[personal.band] <= GYRO_RANK[sceneBand] ? personal.band : sceneBand;
  return { band: worse, approx: personal.approx, personalBand: personal.band, sceneBand };
}

// Hero Status Die: the die tied to whichever band computeHeroStatus() lands on
// (personal Health band or Scene Tracker, whichever is worse). 'out' band has
// no die -- ability-only, per the confirmed GYRO rule.
function computeHeroStatusDie(heroRow, t) {
  if (!heroRow) return { die: '', source: 'no Library data' };
  const bandInfo = computeHeroStatus(Number(heroRow.MaxHealth) || t.maxHealth || 20, t.currentHealth, state.scene);
  if (bandInfo.band === 'out') return { die: '', source: 'OUT — Out ability only' };
  const key = bandInfo.band.charAt(0).toUpperCase() + bandInfo.band.slice(1) + 'StatusDie';
  return { die: heroRow[key] || '', source: bandInfo.band.toUpperCase() + ' Status' };
}

// Villain Status Die: for health-zone villains (Bruiser/Fragile-style), derived
// straight from their current Health band. For condition-tracked villains
// (Legion/Guerrilla/Loner/Inhibitor-style), parsed from the GM's own Status
// slot labels ("9+ minions", "0 Other Villains", etc.) and matched against an
// actual count of board state. Falls back to a manual per-token override when
// the condition genuinely isn't countable (Titan's Challenge, vague archetypes).
function parseStatusRange(label) {
  if (!label) return null;
  let m = label.match(/(\d+)\s*[-\u2013]\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2])];
  m = label.match(/(\d+)\s*\+/);
  if (m) return [Number(m[1]), Infinity];
  m = label.match(/(\d+)/);
  if (m) return [Number(m[1]), Number(m[1])];
  return null;
}
function guessStatusCountType(label) {
  const l = (label || '').toLowerCase();
  if (l.includes('minion')) return 'minions';
  if (l.includes('villain')) return 'villains';
  if (l.includes('opponent') || l.includes('engaged')) return 'opponents';
  if (l.includes('heroes') && l.includes('penalt')) return 'heroPenalties';
  if (l.includes('always') || l.includes('constant')) return 'always';
  // Villains like Baron Blade ("Inventions") and Ray-Manta ("Mods") track their
  // OWN accumulated bonuses — count live boost mods targeting the villain itself.
  if (l.includes('invention') || /\bmods?\b/.test(l)) return 'ownBonuses';
  return null;
}
function countBoardStateFor(type, token, scene) {
  if (!scene) return null;
  if (type === 'minions') return scene.tokens.filter(t => (t.kind === 'minion' || t.kind === 'lieutenant') && !t.ko).length;
  if (type === 'villains') return scene.tokens.filter(t => t.kind === 'villain' && t.id !== token.id).length;
  if (type === 'opponents') return scene.tokens.filter(t => t.kind === 'hero' && t.locationId === token.locationId).length;
  if (type === 'heroPenalties') {
    const hit = new Set(liveMods(scene).filter(m => m.kind === 'hinder').map(m => m.targetId));
    return scene.tokens.filter(t => t.kind === 'hero' && hit.has(t.id)).length;
  }
  if (type === 'ownBonuses') return liveMods(scene).filter(m => m.kind === 'boost' && m.targetId === token.id).length;
  return null;
}
// Villains like Ermine track a compound Penalty/Bonus state (not a simple count) --
// e.g. "Any Penalties and No Bonuses" / "Some Penalties and Some Bonuses" / "No
// Penalties". Detected generically: any villain whose Status labels mention both
// "penalty" and "bonus" uses this resolution instead of the numeric-range one below.
function resolveOwnPenaltyBonusStatus(villainRow, token, scene) {
  const labels = [1, 2, 3, 4, 5].map(i => villainRow['Status' + i + 'Label'] || '');
  const hasPattern = labels.some(l => /penalt/i.test(l)) && labels.some(l => /bonus/i.test(l));
  if (!hasPattern) return null;
  const mods = liveMods(scene);
  const hasPenalty = mods.some(m => m.kind === 'hinder' && m.targetId === token.id);
  const hasBonus = mods.some(m => m.kind === 'boost' && m.targetId === token.id);
  let idx = -1;
  if (!hasPenalty) idx = labels.findIndex(l => /no penalt/i.test(l));
  else if (!hasBonus) idx = labels.findIndex(l => /penalt/i.test(l) && /no bonus/i.test(l));
  else idx = labels.findIndex(l => /penalt/i.test(l) && /bonus/i.test(l) && !/no bonus/i.test(l));
  if (idx < 0) return null;
  const n = idx + 1;
  return { die: villainRow['Status' + n + 'Die'], source: labels[idx] + ' (auto)' };
}
// Titan-archetype villains (Xxtz'Hulissh-style) tie their Status to Scene Challenge
// progress instead of board-state counts -- Status labels read like "Expose a
// vulnerability (needs 2 successes)". Detected generically by the "needs N success(es)"
// phrasing; matched against a Challenge path in the current scene whose label contains
// the same phrase (minus the count), so any future Titan works via the same convention
// without new schema -- the GM just names the Challenge path to match the Status label.
function resolveChallengeLinkedStatus(villainRow, token, scene) {
  if (!scene || !scene.challenges) return null;
  const labels = [1, 2, 3, 4, 5].map(i => villainRow['Status' + i + 'Label'] || '');
  const stages = labels.map((l, i) => {
    const m = l.match(/needs?\s+(\d+)\s+success/i);
    return m ? { idx: i, needed: Number(m[1]), text: l.replace(/\(.*?\)/g, '').trim() } : null;
  }).filter(Boolean);
  if (!stages.length) return null;
  const allPaths = scene.challenges.flatMap(c => c.paths || []);
  let best = null;
  for (const st of stages) {
    const path = allPaths.find(p => p.label && st.text && p.label.toLowerCase().includes(st.text.toLowerCase()));
    if (path && (Number(path.successesMarked) || 0) >= st.needed) {
      if (!best || st.idx > best.idx) best = st; // later stage (by Status slot order) wins, not whichever needs more successes
    }
  }
  if (best) return { die: villainRow['Status' + (best.idx + 1) + 'Die'], source: labels[best.idx] + ' (auto — Challenge complete)' };
  const baselineIdx = labels.findIndex((l, i) => l && !stages.some(st => st.idx === i));
  if (baselineIdx >= 0) return { die: villainRow['Status' + (baselineIdx + 1) + 'Die'], source: labels[baselineIdx] + ' (auto)' };
  return null;
}
function computeVillainStatus(villainRow, token) {
  if (!villainRow) return { die: '', source: 'no Library data' };
  if (villainRow.GreenStatusDie) {
    const band = villainBand(villainRow, token.currentHealth);
    const die = { green: villainRow.GreenStatusDie, yellow: villainRow.YellowStatusDie, red: villainRow.RedStatusDie, out: villainRow.RedStatusDie }[band];
    return { die, source: band.toUpperCase() + ' zone (auto)' };
  }
  const pb = resolveOwnPenaltyBonusStatus(villainRow, token, state.scene);
  if (pb) return pb;
  const cl = resolveChallengeLinkedStatus(villainRow, token, state.scene);
  if (cl) return cl;
  for (let i = 1; i <= 5; i++) {
    const label = villainRow['Status' + i + 'Label'], die = villainRow['Status' + i + 'Die'];
    if (!label || !die) continue;
    const type = guessStatusCountType(label);
    if (type === 'always') return { die, source: label + ' (auto)' };
    if (!type) continue;
    const range = parseStatusRange(label);
    if (!range) continue;
    const count = countBoardStateFor(type, token, state.scene);
    if (count === null) continue;
    if (count >= range[0] && count <= range[1]) return { die, source: label + ' (auto — ' + count + ')' };
  }
  if (token.statusOverride) return { die: token.statusOverride, source: 'manually set' };
  return { die: villainRow.Status1Die || '', source: 'not auto-detectable — click to set' };
}
function setVillainStatusOverride(tokenId) {
  const villainRow = state.villains.find(v => v.Slug === findTok(tokenId).slug) || {};
  const options = [1, 2, 3, 4, 5].map(n => villainRow['Status' + n + 'Label'] ? `${villainRow['Status' + n + 'Label']} = ${villainRow['Status' + n + 'Die']}` : null).filter(Boolean);
  const pick = prompt('Which condition currently applies?\n' + options.join('\n') + '\n\nType the exact die (e.g. d8):');
  if (!pick) return;
  const t = findTok(tokenId);
  t.statusOverride = pick.trim();
  saveSceneDebounced();
  renderTokens();
}

/* ============================================================
   Library (Heroes / Villains / Minions) — unchanged from v1
   ============================================================ */

async function loadLibrary() {
  const kinds = ['heroes','villains','minions','npcs','environments','locations','twists','abilities'];
  for (const k of kinds) {
    try { state[k] = await apiReadCsv(k); }
    catch (e) { if (!Array.isArray(state[k])) state[k] = []; }
  }
}

const saveLibraryDebounced = debounce(async (kind) => {
  const el = document.getElementById('saveStatus');
  if (el) el.textContent = 'Saving…';
  await apiWriteCsv(kind, libHeaders(kind), state[kind]);
  if (el) el.textContent = 'Saved to ' + kind + '.csv ✓';
  refreshSpawnOptions();
}, 500);

function dieOptions(selected) {
  return DICE_LADDER.map(d => `<option value="d${d}" ${selected === 'd' + d ? 'selected' : ''}>d${d}</option>`).join('');
}

function issueFieldFor(kind) {
  return { heroes: 'heroSlugs', villains: 'villainSlugs', minions: 'minionSlugs', npcs: 'minionSlugs', environments: 'environmentSlugs', locations: 'locationSlugs', twists: 'twistSlugs' }[kind] || '';
}
function rowIssueCell(dataKind, slug) {
  const field = issueFieldFor(dataKind);
  if (!field) return '<td></td>';
  const boxes = (state.issuesList || []).map(iss => {
    const on = (iss[field] || []).includes(slug);
    return `<label style="display:block;font-weight:400"><input type="checkbox" ${on?'checked':''} onchange="toggleEntityIssue('${iss.slug}','${field}','${slug}',this.checked)"> ${escHtml(iss.name)}</label>`;
  }).join('');
  return `<td>${boxes || '—'}</td>`;
}
async function toggleEntityIssue(issueSlug, field, entitySlug, on) {
  const iss = await apiGetIssue(issueSlug);
  if (!iss) return;
  const set = new Set(iss[field] || []);
  if (on) set.add(entitySlug); else set.delete(entitySlug);
  iss[field] = [...set];
  await apiSaveIssue(issueSlug, iss);
  await refreshIssuesList();
  fillLibCollectionFilter();
  fillLibIssueFilter();
  renderLibraryTable(currentLibTab);
}
function fillLibCollectionFilter() {
  const el = document.getElementById('libCollectionFilter');
  if (!el) return;
  const cur = el.value || 'all';
  const colls = (state.collectionsList || []).slice().sort((a, b) => naturalNameSort(a.name, b.name));
  el.innerHTML = '<option value="all">All collections</option>' +
    colls.map(c => `<option value="${escAttr(c.slug)}">${escHtml(c.name)}</option>`).join('');
  el.value = [...el.options].some(o => o.value === cur) ? cur : 'all';
}
function fillLibIssueFilter() {
  const el = document.getElementById('libIssueFilter');
  if (!el) return;
  const cur = el.value || 'all';
  // Cascade Collection → Issue only on the Issues & Scenes tab; other tabs need the full issue list.
  const collF = currentLibTab === 'issues-scenes'
    ? ((document.getElementById('libCollectionFilter') || {}).value || 'all')
    : 'all';
  let issues = (state.issuesList || []).slice();
  if (collF !== 'all') {
    const coll = (state.collectionsList || []).find(c => c.slug === collF);
    const allowed = new Set((coll && coll.issueSlugs) || []);
    issues = issues.filter(i => allowed.has(i.slug));
  }
  issues.sort((a, b) => naturalNameSort(a.name, b.name));
  el.innerHTML = '<option value="all">All issues</option>' +
    issues.map(i => `<option value="${escAttr(i.slug)}">${escHtml(i.name)}</option>`).join('');
  el.value = [...el.options].some(o => o.value === cur) ? cur : 'all';
}
function renderLibraryTable(kind) {
  const dataKind = kind;
  const panel = document.getElementById(kind + 'Panel');
  if (!panel) return;
  if (!Array.isArray(state[dataKind])) state[dataKind] = [];
  const allRows = state[dataKind];
  if (dataKind === 'issues-scenes') { renderIssuesScenesTable(); return; }
  const filt = (document.getElementById('libIssueFilter') || {}).value || 'all';
  const iss = filt === 'all' ? null : (state.issuesList || []).find(i => i.slug === filt);
  function rowVisible(row) {
    if (dataKind === 'twists') {
      const sev = (document.getElementById('twistSeverityFilter') || {}).value || 'all';
      const eff = (document.getElementById('twistEffectFilter') || {}).value || 'all';
      if (sev !== 'all' && row.Severity !== sev) return false;
      if (eff !== 'all' && row.EffectType !== eff) return false;
    } else {
      const activeFilt = (document.getElementById('libActiveFilter') || {}).value || 'active';
      if (activeFilt === 'active') {
        if (dataKind === 'abilities') {
          const owner = abilityOwnerSlug(row);
          const hero = (state.heroes || []).find(h => h.Slug === owner);
          const villain = (state.villains || []).find(v => v.Slug === owner);
          const actor = hero || villain;
          if (!actor || !isActiveFlag(actor.Active)) return false;
        } else if (['heroes', 'villains', 'minions', 'npcs', 'environments', 'locations'].includes(dataKind) && !isActiveFlag(row.Active)) {
          return false;
        }
      }
      if (filt !== 'all') {
        if (dataKind === 'abilities') {
          const owner = abilityOwnerSlug(row);
          const heroes = (iss && iss.heroSlugs) || [];
          const villains = (iss && iss.villainSlugs) || [];
          return heroes.includes(owner) || villains.includes(owner);
        }
        const field = issueFieldFor(dataKind);
        if (!field) return true;
        return ((iss && iss[field]) || []).includes(row.Slug);
      }
    }
    return true;
  }
  let theadCols;
  if (dataKind === 'heroes') {
    theadCols = ['Name','Active','Affiliation','P1','Die','P2','Die','P3','Die','P4','Die','P5','Die','P6','Die','Q1','Die','Q2','Die','Q3','Die','Q4','Die','Q5','Die','Q6','Die','MaxHP','GreenDie','YellowDie','RedDie','Principles','Notes','Portrait','Issues',''];
  } else if (dataKind === 'villains') {
    theadCols = ['Name','Active','Affiliation','Approach','Archetype','P1','Die','P2','Die','P3','Die','P4','Die','P5','Die',
      'Q1','Die','Q2','Die','Q3','Die','Q4','Die','Q5','Die','Q6','Die','MaxHP','Calc','GreenFloor','YellowFloor','RedFloor',
      'GreenDie','YellowDie','RedDie',
      'Status 1','Status 1 Die','Status 2','Status 2 Die','Status 3','Status 3 Die','Status 4','Status 4 Die','Status 5','Status 5 Die','Notes','Portrait','Issues',''];
  } else if (dataKind === 'minions' || dataKind === 'npcs') {
    theadCols = ['Name','Active','Affiliation','Type','Die','Faction','Notes','Portrait','Issues',''];
  } else if (dataKind === 'environments') {
    theadCols = ['Name','Active','Trait1','Die','Trait2','Die','Trait3','Die','Twists','Minions','Lieutenants','Locations','Issues',''];
  } else if (dataKind === 'twists') {
    theadCols = ['Name','Effect Type','Severity','Formula','Description',''];
  } else if (dataKind === 'locations') {
    theadCols = ['Name','Slug','Environment','Active','Issues',''];
  } else {
    theadCols = ['Slug','Zone','Name','Display Name','Type','Game Text','Roll Type','Die Source','Effect Die Hint',''];
    const dl = document.getElementById('heroSlugsList');
    if (dl) {
      const opts = []
        .concat((state.heroes || []).map(h => h.Slug))
        .concat((state.villains || []).map(v => v.Slug))
        .filter(Boolean);
      dl.innerHTML = opts.map(s => `<option value="${escAttr(s)}">`).join('');
    }
  }
  let html = '<table class="lib-table"><thead><tr>' + theadCols.map(c => {
    const wrap = (c === 'Game Text' || c === 'Description') ? ' class="wrap-col"' : '';
    return `<th${wrap}>${c}</th>`;
  }).join('') + (kind === 'twists' || kind === 'abilities' ? '' : '<th class="table-fill"></th>') + '</tr></thead><tbody>';
  allRows.forEach((row, idx) => {
    if (!rowVisible(row)) return;
    html += '<tr>';
    if (dataKind === 'heroes') {
      html += tdText(dataKind, idx, 'Name', row.Name, 'name-field');
      html += tdCheckbox(dataKind, idx, 'Active', row.Active === '' || row.Active == null ? 'true' : row.Active);
      html += tdAffiliation(dataKind, idx, row.Affiliation);
      for (let i = 1; i <= 6; i++) { html += tdText(dataKind, idx, 'Power' + i, row['Power' + i]); html += tdDie(dataKind, idx, 'PowerDie' + i, row['PowerDie' + i]); }
      for (let i = 1; i <= 6; i++) { html += tdText(dataKind, idx, 'Quality' + i, row['Quality' + i]); html += tdDie(dataKind, idx, 'QualityDie' + i, row['QualityDie' + i]); }
      html += tdText(dataKind, idx, 'MaxHealth', row.MaxHealth);
      html += tdDie(dataKind, idx, 'GreenStatusDie', row.GreenStatusDie);
      html += tdDie(dataKind, idx, 'YellowStatusDie', row.YellowStatusDie);
      html += tdDie(dataKind, idx, 'RedStatusDie', row.RedStatusDie);
      html += `<td><button class="btn btn-small btn-ghost" onclick="openPrinciplesEditor(${idx})">Principles</button></td>`;
      html += `<td><button class="btn btn-small btn-ghost" onclick="openNotes('heroes','${row.Slug}','${escAttr(row.Name)}')">Notes</button></td>`;
      html += portraitCellHtml('heroes', row.Slug);
    } else if (dataKind === 'villains') {
      html += tdText(dataKind, idx, 'Name', row.Name, 'name-field');
      html += tdCheckbox(dataKind, idx, 'Active', row.Active === '' || row.Active == null ? 'true' : row.Active);
      html += tdAffiliation(dataKind, idx, row.Affiliation);
      html += tdFitInput(dataKind, idx, 'Approach', row.Approach, 'list="approachesList"');
      html += tdFitInput(dataKind, idx, 'Archetype', row.Archetype, 'list="archetypesList"');
      for (let i = 1; i <= 5; i++) { html += tdText(dataKind, idx, 'Power' + i, row['Power' + i]); html += tdDie(dataKind, idx, 'PowerDie' + i, row['PowerDie' + i]); }
      for (let i = 1; i <= 6; i++) { html += tdText(dataKind, idx, 'Quality' + i, row['Quality' + i]); html += tdDie(dataKind, idx, 'QualityDie' + i, row['QualityDie' + i]); }
      html += tdText(dataKind, idx, 'MaxHealth', row.MaxHealth);
      html += `<td><button class="btn btn-small btn-ghost" onclick="openHealthCalc(${idx})">Calc</button></td>`;
      html += tdText(dataKind, idx, 'GreenFloor', row.GreenFloor);
      html += tdText(dataKind, idx, 'YellowFloor', row.YellowFloor);
      html += tdText(dataKind, idx, 'RedFloor', row.RedFloor);
      html += tdDie(dataKind, idx, 'GreenStatusDie', row.GreenStatusDie);
      html += tdDie(dataKind, idx, 'YellowStatusDie', row.YellowStatusDie);
      html += tdDie(dataKind, idx, 'RedStatusDie', row.RedStatusDie);
      for (let i = 1; i <= 5; i++) { html += tdText(dataKind, idx, 'Status' + i + 'Label', row['Status' + i + 'Label']); html += tdDie(dataKind, idx, 'Status' + i + 'Die', row['Status' + i + 'Die']); }
      html += `<td><button class="btn btn-small btn-ghost" onclick="openNotes('villains','${row.Slug}','${escAttr(row.Name)}')">Notes</button></td>`;
      html += portraitCellHtml('villains', row.Slug);
    } else if (dataKind === 'minions' || dataKind === 'npcs') {
      html += tdText(dataKind, idx, 'Name', row.Name, 'name-field');
      html += tdCheckbox(dataKind, idx, 'Active', row.Active === '' || row.Active == null ? 'true' : row.Active);
      html += tdAffiliation(dataKind, idx, row.Affiliation);
      if (dataKind === 'npcs') {
        const ty = row.Type || 'Bystander';
        html += `<td><select onchange="onCellChange('${dataKind}',${idx},'Type',this.value)">
          <option value="Hero" ${ty === 'Hero' ? 'selected' : ''}>Hero</option>
          <option value="Bystander" ${ty === 'Bystander' ? 'selected' : ''}>Bystander</option>
          <option value="Minion" ${ty === 'Minion' ? 'selected' : ''}>Minion</option>
          <option value="Lieutenant" ${ty === 'Lieutenant' ? 'selected' : ''}>Lieutenant</option>
        </select></td>`;
      } else {
        html += `<td><select onchange="onCellChange('${dataKind}',${idx},'Type',this.value)">
          <option value="Minion" ${row.Type === 'Minion' ? 'selected' : ''}>Minion</option>
          <option value="Lieutenant" ${row.Type === 'Lieutenant' ? 'selected' : ''}>Lieutenant</option>
        </select></td>`;
      }
      html += tdDie(dataKind, idx, 'Die', row.Die);
      html += tdText(dataKind, idx, 'Faction', row.Faction);
      html += `<td><button class="btn btn-small btn-ghost" onclick="openNotes('minions','${row.Slug}','${escAttr(row.Name)}')">Notes</button></td>`;
      html += portraitCellHtml('minions', row.Slug);
    } else if (dataKind === 'environments') {
      html = html.slice(0, -4); // remove opening <tr> — rebuild as clickable
      html += `<tr class="lib-row-clickable" onclick="openEnvironmentBuilder('${escAttr(row.Slug)}')">`;
      html += `<td class="name-field">${escHtml(row.Name || row.Slug)}</td>`;
      html += `<td>${isActiveFlag(row.Active) ? 'Yes' : 'No'}</td>`;
      for (let i = 1; i <= 3; i++) {
        html += `<td>${escHtml(row['Trait' + i] || '')}</td>`;
        html += `<td>${escHtml(row['TraitDie' + i] || '')}</td>`;
      }
      html += `<td class="assign-cell wrap-col">${envTwistSummary(row)}</td>`;
      html += `<td class="assign-cell wrap-col">${envSlugNameList(row.MinionSlugs, state.minions)}</td>`;
      html += `<td class="assign-cell wrap-col">${envSlugNameList(row.LieutenantSlugs, state.minions)}</td>`;
      html += `<td class="assign-cell wrap-col">${envLocationNames(row.Slug)}</td>`;
    } else if (dataKind === 'locations') {
      html += tdText(dataKind, idx, 'Name', row.Name, 'name-field');
      html += tdText(dataKind, idx, 'Slug', row.Slug);
      html += `<td><select onchange="onCellChange('${dataKind}',${idx},'EnvironmentSlug',this.value)">
        <option value="">— none —</option>
        ${(state.environments || []).map(e => `<option value="${escAttr(e.Slug)}" ${row.EnvironmentSlug === e.Slug ? 'selected' : ''}>${escHtml(e.Name)}</option>`).join('')}
      </select></td>`;
      html += tdCheckbox(dataKind, idx, 'Active', row.Active === '' || row.Active == null ? 'true' : row.Active);
    } else if (dataKind === 'twists') {
      html += tdText(dataKind, idx, 'Name', row.Name, 'name-field');
      html += `<td><select onchange="onCellChange('${dataKind}',${idx},'EffectType',this.value)">
        ${TWIST_EFFECT_TYPES.map(t => `<option value="${t}" ${row.EffectType === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select></td>`;
      html += `<td><select onchange="onCellChange('${dataKind}',${idx},'Severity',this.value)">
        <option value="Minor" ${row.Severity === 'Minor' ? 'selected' : ''}>Minor</option>
        <option value="Major" ${row.Severity === 'Major' ? 'selected' : ''}>Major</option>
        <option value="Any" ${row.Severity === 'Any' ? 'selected' : ''}>Any</option>
      </select></td>`;
      html += tdText(dataKind, idx, 'Formula', row.Formula);
      html += `<td class="wrap-cell"><textarea title="${escAttr(row.Description || '')}" onchange="onCellChange('${dataKind}',${idx},'Description',this.value)">${escHtml(row.Description || '')}</textarea></td>`;
    } else {
      html += tdFitInput(dataKind, idx, 'Slug', row.Slug || row.HeroSlug || '', 'list="heroSlugsList"');
      html += `<td><select onchange="onCellChange('${dataKind}',${idx},'Zone',this.value)">
        ${['','Green','Yellow','Red','Out','Upgrade','Mastery'].map(z => `<option value="${z}" ${(row.Zone || '') === z ? 'selected' : ''}>${z || '—'}</option>`).join('')}
      </select></td>`;
      html += tdText(dataKind, idx, 'Name', row.Name, 'name-field');
      html += tdText(dataKind, idx, 'DisplayName', row.DisplayName);
      html += `<td><select onchange="onCellChange('${dataKind}',${idx},'Type',this.value)">
        <option value="">-</option>
        <option value="A" ${row.Type === 'A' ? 'selected' : ''}>Action</option>
        <option value="R" ${row.Type === 'R' ? 'selected' : ''}>Reaction</option>
        <option value="I" ${row.Type === 'I' ? 'selected' : ''}>Inherent</option>
      </select></td>`;
      html += `<td class="game-text-cell"><textarea title="${escAttr(row.GameText || '')}" onchange="onCellChange('${dataKind}',${idx},'GameText',this.value)">${escHtml(row.GameText || '')}</textarea></td>`;
      const selectedTypes = parseRollTypes(row.RollType);
      html += `<td class="roll-type-cell">${ABILITY_ICON_ROWS.map(group =>
        `<div class="roll-type-row">${group.map(t =>
          `<label><input type="checkbox" ${selectedTypes.includes(t)?'checked':''} onchange="toggleAbilityRollType(${idx},'${t}',this.checked)"> ${t}</label>`
        ).join('')}</div>`
      ).join('')}</td>`;
      html += tdText(dataKind, idx, 'DieSource', row.DieSource);
      html += `<td><select onchange="onCellChange('${kind}',${idx},'EffectDieHint',this.value)">
        <option value="">-</option>
        ${EFFECT_DIE_OPTIONS.map(o => `<option value="${o.key}" ${row.EffectDieHint === o.key ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select></td>`;
    }
    if (dataKind !== 'abilities' && dataKind !== 'twists') html += rowIssueCell(dataKind, row.Slug);
    if (dataKind === 'environments') {
      html += `<td class="no-row-nav" onclick="event.stopPropagation()"><button class="btn btn-small btn-danger" onclick="event.stopPropagation();deleteRow('${dataKind}',${idx})">Delete</button></td>`;
    } else {
      html += `<td><button class="btn btn-small btn-danger" onclick="deleteRow('${dataKind}',${idx})">Delete</button></td>`;
    }
    if (dataKind !== 'twists' && dataKind !== 'abilities') html += '<td class="table-fill"></td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  const visible = allRows.filter(rowVisible);
  if (visible.length === 0) html = '<p class="empty-hint" style="padding:14px;">No entries yet. Click "+ Add Row" to create one.</p>';
  panel.innerHTML = html;
}

function fitInputSize(value, min) {
  return Math.max(min || 2, Math.min(48, String(value ?? '').length + 1));
}
function tdText(kind, idx, field, value, extraClass) {
  const min = extraClass === 'name-field' ? 6 : 2;
  const size = fitInputSize(value, min);
  return `<td><input class="${extraClass || ''}" type="text" size="${size}" value="${escAttr(value)}" oninput="this.size=Math.max(${min},this.value.length+1)" onchange="onCellChange('${kind}',${idx},'${field}',this.value)"></td>`;
}
function tdFitInput(kind, idx, field, value, extraAttrs) {
  const size = fitInputSize(value, 4);
  return `<td><input type="text" size="${size}" value="${escAttr(value)}" ${extraAttrs || ''} oninput="this.size=Math.max(4,this.value.length+1)" onchange="onCellChange('${kind}',${idx},'${field}',this.value)"></td>`;
}
function tdCheckbox(kind, idx, field, value) {
  return `<td><input type="checkbox" ${String(value).toLowerCase() === 'true' ? 'checked' : ''} onchange="onCellChange('${kind}',${idx},'${field}',String(this.checked))"></td>`;
}
function tdDie(kind, idx, field, value) {
  return `<td><select onchange="onCellChange('${kind}',${idx},'${field}',this.value)"><option value="">-</option>${dieOptions(value)}</select></td>`;
}
const AFFILIATIONS = ['Ally', 'Enemy', 'Neutral'];
function defaultAffiliation(kind) {
  if (kind === 'heroes') return 'Ally';
  if (kind === 'npcs') return 'Neutral';
  if (kind === 'villains' || kind === 'minions') return 'Enemy';
  return 'Neutral';
}
function tdAffiliation(kind, idx, value) {
  const cur = AFFILIATIONS.includes(value) ? value : defaultAffiliation(kind);
  return `<td><select onchange="onCellChange('${kind}',${idx},'Affiliation',this.value)">${AFFILIATIONS.map(a => `<option value="${a}" ${a === cur ? 'selected' : ''}>${a}</option>`).join('')}</select></td>`;
}
function onCellChange(kind, idx, field, value) {
  const row = state[kind][idx];
  row[field] = value;
  if (field === 'Name') row.Slug = uniqueLibSlug(kind, slugify(value), row.Slug);
  if (kind === 'abilities' && field === 'GameText') {
    // Roll Type is derived only from the 6 basic-action keywords in Game Text; blank if none.
    row.RollType = inferRollTypesFromText(value).join(', ');
  }
  saveLibraryDebounced(kind);
  if (field === 'Active') renderLibraryTable(currentLibTab);
}
function uniqueLibSlug(kind, base, currentSlug) {
  if (!Array.isArray(state[kind])) state[kind] = [];
  let candidate = base, n = 1;
  const taken = new Set(state[kind].map(r => r.Slug).filter(s => s !== currentSlug));
  while (taken.has(candidate)) candidate = base + '-' + (++n);
  return candidate;
}
function addRow(kind) {
  const dataKind = kind;
  if (dataKind === 'issues-scenes') return issuesScenesAddRow();
  if (dataKind === 'environments') {
    window.open('/environment-builder.html', '_blank');
    return;
  }
  if (!Array.isArray(state[dataKind])) state[dataKind] = [];
  ['libIssueFilter','libCollectionFilter','twistSeverityFilter','twistEffectFilter'].forEach(id => {
    const filt = document.getElementById(id);
    if (filt) filt.value = 'all';
  });
  const headers = libHeaders(dataKind);
  if (!headers) { toast('Unknown library table.'); return; }
  const row = {}; headers.forEach(h => row[h] = '');
  row.Name = 'New Entry';
  row.Slug = uniqueLibSlug(dataKind, 'new-entry', null);
  if (dataKind === 'heroes' || dataKind === 'villains' || dataKind === 'minions' || dataKind === 'npcs' || dataKind === 'environments' || dataKind === 'locations') row.Active = 'true';
  if (dataKind === 'minions') row.Type = 'Minion';
  if (dataKind === 'npcs') row.Type = 'Bystander';
  row.Origin = 'custom';
  if (dataKind === 'heroes' || dataKind === 'villains' || dataKind === 'minions' || dataKind === 'npcs') {
    row.Affiliation = defaultAffiliation(dataKind);
  }
  if (dataKind === 'twists') { row.EffectType = 'Hinder'; row.Severity = 'Minor'; }
  state[dataKind].push(row);
  renderLibraryTable(kind);
  saveLibraryDebounced(dataKind);
}
function deleteRow(kind, idx) {
  if (!confirm('Delete this entry from the Library? This cannot be undone.')) return;
  const dataKind = kind;
  state[dataKind].splice(idx, 1);
  renderLibraryTable(kind);
  saveLibraryDebounced(dataKind);
}
async function openNotes(kind, slug, name) {
  if (!slug) { toast('Name this entry first, then add notes.'); return; }
  currentNotesTarget = { kind, slug };
  document.getElementById('notesModalTitle').textContent = 'Notes — ' + name;
  const md = await apiReadMd(kind, slug);
  document.getElementById('notesModalText').value = md;
  const hasStructured = /^###\s*\[|^##\s+Builder\s*$/im.test(md || '');
  document.getElementById('notesModalWarning').classList.toggle('hidden', !hasStructured);
  document.getElementById('notesModal').classList.remove('hidden');
}
function closeNotes() { document.getElementById('notesModal').classList.add('hidden'); }
async function saveNotes() {
  if (!currentNotesTarget) return;
  await apiWriteMd(currentNotesTarget.kind, currentNotesTarget.slug, document.getElementById('notesModalText').value);
  toast('Notes saved.');
  closeNotes();
}

/* ---- Abilities Read modal (Villain/Minion/Lieutenant/Hero) ---- */

const ABILITY_ICON_TYPES = ['Attack', 'Defend', 'Boost', 'Hinder', 'Overcome', 'Recover'];
const ABILITY_ICON_ROWS = [
  ['Attack', 'Defend', 'Boost'],
  ['Hinder', 'Overcome', 'Recover'],
];
function parseRollTypes(val) {
  return (val || '').split(/[,|;/]+/).map(s => s.trim()).filter(s => ABILITY_ICON_TYPES.includes(s));
}
function toggleAbilityRollType(idx, type, on) {
  const row = state.abilities[idx];
  if (!row) return;
  const set = new Set(parseRollTypes(row.RollType));
  if (on) set.add(type); else set.delete(type);
  row.RollType = ABILITY_ICON_TYPES.filter(t => set.has(t)).join(', ');
  saveLibraryDebounced('abilities');
}

function parseAbilitiesMd(md) {
  const sections = { Abilities: [], Upgrades: [], Mastery: [], Tactics: [] };
  let tacticsText = [];
  if (!md) { sections.TacticsText = ''; return sections; }
  const lines = md.split('\n');
  let currentKey = null;
  let currentCard = null;
  const flush = () => {
    if (currentCard) {
      currentCard.body = currentCard.body.join('\n').trim();
      if (currentKey) sections[currentKey].push(currentCard);
    }
    currentCard = null;
  };
  for (const line of lines) {
    const h2 = line.match(/^##\s+(Abilities|Upgrades|Mastery|Tactics)\s*$/i);
    if (h2) {
      flush();
      currentKey = Object.keys(sections).find(k => k.toLowerCase() === h2[1].toLowerCase());
      continue;
    }
    // Any other H2 (e.g. "## Builder") ends whichever section we were in, so its
    // content (like the raw builder-state JSON block) never leaks into Tactics text.
    if (/^##\s+/.test(line)) { flush(); currentKey = null; continue; }
    const h3 = line.match(/^###\s*\[([ARI?])\]\s*\[([^\]]+)\]\s*"([^"]+)"/)
      || line.match(/^###\s*\[([ARI?])\]\s*"([^"]+)"/);
    if (h3) {
      flush();
      currentCard = h3[3] != null
        ? { type: h3[1], icon: h3[2], name: h3[3], body: [] }
        : { type: h3[1], icon: '', name: h3[2], body: [] };
      continue;
    }
    if (currentCard) currentCard.body.push(line);
    // Tactics is often free prose with no "### [Type] Name" card wrapper (see
    // save_built_minion in server.py) — capture that raw text separately so it
    // isn't silently dropped just because it's not a discrete ability card.
    else if (currentKey === 'Tactics') tacticsText.push(line);
  }
  flush();
  sections.TacticsText = tacticsText.join('\n').trim();
  if (sections.TacticsText === '_None yet._') sections.TacticsText = '';
  return sections;
}

let currentAbilitiesTarget = null;

async function openAbilities(tokenId) {
  const t = findTok(tokenId);
  let row, mdKind;
  if (t.kind === 'hero') { row = state.heroes.find(h => h.Slug === t.slug); mdKind = 'heroes'; }
  else if (t.kind === 'villain') { row = state.villains.find(v => v.Slug === t.slug); mdKind = 'villains'; }
  else { row = libMinion(t.slug); mdKind = 'minions'; }
  if (!row) { toast('No Library entry found for this token.'); return; }
  currentAbilitiesTarget = { kind: mdKind, slug: t.slug, name: row.Name };
  document.getElementById('abilitiesModalTitle').textContent = 'Abilities — ' + row.Name;
  const md = await apiReadMd(mdKind, t.slug);
  const sections = parseAbilitiesMd(md);
  const hasAny = sections.Abilities.length || sections.Upgrades.length || sections.Mastery.length || sections.Tactics.length || sections.TacticsText;
  const el = document.getElementById('abilitiesModalBody');

  if (!hasAny) {
    if (t.kind === 'hero') {
      let html = '';
      [1, 2].forEach(n => {
        const name = row['Principle' + n + 'Name'];
        if (!name) return;
        html += `<div class="ability-card">
          <div class="ability-card-name">${escHtml(name)}</div>
          <p class="ability-card-body">${escHtml(row['Principle' + n + 'Roleplay'] || '')}</p>
        </div>`;
      });
      el.innerHTML = html || `<p class="empty-hint">No abilities recorded — open Notes to add them.</p>
        <button class="btn btn-small btn-ghost" onclick="closeAbilities();openNotes('heroes','${t.slug}','${escAttr(row.Name)}')">Open Notes</button>`;
    } else {
      el.innerHTML = `<p class="empty-hint">No abilities recorded — open Notes to add them.</p>
        <button class="btn btn-small btn-ghost" onclick="closeAbilities();openNotes('${mdKind}','${t.slug}','${escAttr(row.Name)}')">Open Notes</button>`;
    }
    document.getElementById('abilitiesModal').classList.remove('hidden');
    return;
  }

  abilityUseCards = [];
  const multiVillain = state.scene.tokens.filter(tk => tk.kind === 'villain').length > 1;
  const hideExtras = t.kind === 'villain' && (multiVillain || (state.scene.difficulty || '') === 'Moderate');
  const renderSection = (label, cards) => {
    if (!cards.length) return '';
    let h = `<label class="field-label" style="margin-top:12px;">${label}</label>`;
    cards.forEach(c => {
      const i = abilityUseCards.push(c) - 1;
      h += `<div class="ability-card ability-card-use" onclick="useAbilityCard('${t.id}',${i})">
        <div class="ability-card-name">[${escHtml(c.type)}]${c.icon ? ` [${escHtml(c.icon)}]` : ''} "${escHtml(c.name)}"</div>
        <p class="ability-card-body">${escHtml(c.body)}</p>
        <button type="button" class="btn btn-small btn-accent">Use</button>
      </div>`;
    });
    return h;
  };
  let html = renderSection('Abilities', sections.Abilities);
  if (t.kind === 'villain' && !hideExtras) {
    html += renderSection('Upgrades', sections.Upgrades);
    html += renderSection('Mastery', sections.Mastery);
  }
  html += renderSection('Tactics', sections.Tactics);
  if (sections.TacticsText) {
    html += `<label class="field-label" style="margin-top:12px;">Tactics</label>
      <p class="ability-card-body">${escHtml(sections.TacticsText)}</p>`;
  }
  el.innerHTML = html || '<p class="empty-hint">No abilities recorded.</p>';
  document.getElementById('abilitiesModal').classList.remove('hidden');
}
function gyroAbilityZones(band) {
  if (band === 'out') return ['Out'];
  if (band === 'red') return ['Green', 'Yellow', 'Red'];
  if (band === 'yellow') return ['Green', 'Yellow'];
  return ['Green'];
}
const GYRO_ZONE_ORDER = { Green: 0, Yellow: 1, Red: 2, Out: 3 };

/* ---- Modular hero modes ---- */
// Modes are authored in Hero Builder and stored as a `## Modes` JSON section in
// the hero's markdown (see save_built_hero). Each mode: { slug, name, zone,
// powers: {Name: die}, lockedActions: [..], immobile, powerless, default }.
// Ability rows in abilities.csv carry a `Mode` column equal to the mode slug for
// mode-granted abilities; blank Mode = always available (Switch family, etc.).
// Confirmed reading (Collin): a non-default mode consists ONLY of its picked
// powers — unpicked powers are unavailable while that mode is active. Powerless
// mode allows no abilities other than principle abilities.
const ALWAYS_AVAILABLE_ABILITY_NAMES = ['Switch', 'Quick Switch', 'Emergency Switch'];
let heroModesCache = {}; // slug -> modes array | null (null = fetched, none found)
function parseModesMd(md) {
  if (!md) return null;
  const m = String(md).match(/##\s*Modes\s*\n+```json\n([\s\S]*?)```/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[1]);
    return Array.isArray(arr) && arr.length ? arr : null;
  } catch (e) { return null; }
}
function loadHeroModes(t) {
  const slug = (t.slug || '').trim();
  if (!slug || heroModesCache[slug] !== undefined) return;
  heroModesCache[slug] = null; // sentinel while fetching
  apiReadMd('heroes', slug).then(text => {
    heroModesCache[slug] = parseModesMd(text);
    renderTokens();
  });
}
function heroModesForToken(t) {
  const slug = (t.slug || '').trim();
  if (heroModesCache[slug] === undefined) loadHeroModes(t);
  return heroModesCache[slug] || null;
}
function heroCurrentMode(t) {
  const modes = heroModesForToken(t);
  if (!modes) return null;
  const cur = t.currentMode || 'default';
  return modes.find(m => (m.slug || '') === cur) || modes.find(m => m.default) || modes[0] || null;
}
// Basic actions the CURRENT mode forbids: {attack, hinder, boost, defend, overcome}
// (Recover is never locked by a mode in the book.)
function modeLockedActions(t) {
  const mode = heroCurrentMode(t);
  const locked = new Set();
  if (!mode) return locked;
  (mode.lockedActions || []).forEach(a => locked.add(String(a).toLowerCase()));
  locked.delete('recover'); // Recover is NEVER mode-locked (locked decision)
  return locked;
}
// Recover exists ONLY when an ability grants it, or as part of a Montage scene
// (where recovery happens as part of the scene, not as a taken action).
function heroCanRecover(t) {
  const st = String((state.scene || {}).sceneType || '').toLowerCase();
  if (st === 'montage') return true;
  return heroAbilitiesForToken(t).some(a =>
    String(a.RollType || '').toLowerCase().includes('recover'));
}
function heroModePowerMap(t) {
  const mode = heroCurrentMode(t);
  return (mode && mode.powers) || null;
}
function heroAbilityShownName(a) {
  const d = String((a && a.DisplayName) || '').trim();
  return d || String((a && a.Name) || '');
}
function sortHeroAbilitiesGyroAlpha(list) {
  return (list || []).slice().sort((a, b) => {
    const za = GYRO_ZONE_ORDER[a.Zone] ?? 9;
    const zb = GYRO_ZONE_ORDER[b.Zone] ?? 9;
    if (za !== zb) return za - zb;
    return String(heroAbilityShownName(a)).localeCompare(String(heroAbilityShownName(b)), undefined, { sensitivity: 'base' });
  });
}
function heroAbilitiesForToken(t) {
  const row = state.heroes.find(h => h.Slug === t.slug) || {};
  const band = computeHeroStatus(Number(row.MaxHealth) || t.maxHealth || 20, t.currentHealth, state.scene).band;
  const zones = gyroAbilityZones(band);
  // Normalize legacy "Green/Yellow" zone values to Green (they are Green-by-default
  // abilities whose book shorthand said "can be chosen Green or Yellow"; the zone field
  // must be a real gyro zone for filtering + CSS to work).
  // Slug guard: only abilities actually chosen for this hero during Hero Builder.
  // Modular mode gate: abilities with a `Mode` value are only usable while that
  // mode is active on the token. Powerless mode: no abilities at all (principle
  // abilities ARE in the abilities.csv layer as Green rows). Blank Mode = always available.
  const mode = heroCurrentMode(t);
  const curMode = mode ? (mode.slug || '') : '';
  const powerless = !!(mode && mode.powerless);
  return sortHeroAbilitiesGyroAlpha((state.abilities || []).filter(a => {
    if (abilityOwnerSlug(a) !== (t.slug || '').trim()) return false;
    if (powerless) return false;
    let z = (a.Zone || '').trim();
    if (z === 'Green/Yellow') { z = 'Green'; a.Zone = 'Green'; }
    if (z === 'Upgrade' || z === 'Mastery') return false;
    const abMode = String(a.Mode || '').trim();
    if (abMode) return abMode === curMode; // mode-granted: gated by active mode, not health band
    return zones.includes(z);
  }));
}
function csvAbilityToCard(a) {
  return {
    type: a.Type || '',
    icon: a.RollType || '',
    name: heroAbilityShownName(a) || a.Name || '',
    body: a.GameText || '',
    GameText: a.GameText || '',
    RollType: a.RollType || '',
    EffectDieHint: a.EffectDieHint || '',
    Zone: a.Zone || '',
    Name: a.Name || '',
    DisplayName: a.DisplayName || '',
  };
}
function villainAbilitiesForToken(t) {
  const owner = (t.slug || '').trim();
  const multi = state.scene.tokens.filter(tk => tk.kind === 'villain').length > 1;
  const hideExtras = multi || (state.scene.difficulty || '') === 'Moderate';
  const csvRows = (state.abilities || []).filter(a => abilityOwnerSlug(a) === owner);
  if (csvRows.length) {
    let cards = csvRows
      .filter(a => {
        const z = (a.Zone || '').trim();
        return z !== 'Upgrade' && z !== 'Mastery';
      })
      .map(csvAbilityToCard);
    if (t.kind === 'villain' && !hideExtras) {
      cards = cards.concat(
        csvRows.filter(a => (a.Zone || '').trim() === 'Upgrade').map(csvAbilityToCard),
        csvRows.filter(a => (a.Zone || '').trim() === 'Mastery').map(csvAbilityToCard),
      );
    }
    return cards;
  }
  // Fallback: MD notes when abilities.csv has no rows for this slug yet.
  const key = (t.kind || '') + ':' + owner;
  const cache = (state._mdCache = state._mdCache || {});
  const md = cache[key];
  if (typeof md !== 'string') {
    const kind = t.kind === 'villain' ? 'villains' : (t.kind === 'hero' ? 'heroes' : 'minions');
    apiReadMd(kind, t.slug).then(text => { cache[key] = text || ''; renderTokens(); });
    return [];
  }
  const sections = parseAbilitiesMd(md);
  let cards = sections.Abilities.slice();
  if (t.kind === 'villain') {
    if (!hideExtras) cards = cards.concat(sections.Upgrades, sections.Mastery);
  }
  return cards;
}
function abilityRollTypes(a) {
  if (!a) return [];
  const fromField = parseRollTypes(a.RollType || a.icon || '');
  if (fromField.length) return fromField;
  const blob = (a.GameText || a.body || '');
  return ABILITY_ICON_TYPES.filter(k => new RegExp('\\b' + k + '\\b', 'i').test(blob));
}
function abilityTypeLetter(a) {
  const raw = String((a && (a.type || a.Type)) || '').trim().toUpperCase();
  if (!raw) return '';
  if (raw === 'A' || raw.startsWith('ACTION')) return 'A';
  if (raw === 'I' || raw.startsWith('INHERENT') || raw.startsWith('INNATE')) return 'I';
  if (raw === 'R' || raw.startsWith('REACTION')) return 'R';
  return '';
}
function abilityRollLetters(a) {
  const map = { Attack: 'A', Defend: 'D', Boost: 'B', Hinder: 'H', Recover: 'R', Overcome: 'O' };
  return abilityRollTypes(a).map(t => map[t]).filter(Boolean).join(' / ');
}
function boardAbilityListHtml(t) {
  if (t.kind === 'hero') {
    const abs = heroAbilitiesForToken(t);
    if (!abs.length) return '<div class="board-ability-list"><div class="mvc-empty" style="padding:8px;">No abilities in this zone.</div></div>';
    return '<div class="board-ability-list">' + abs.map((a, i) => {
      const z = (a.Zone || '').toLowerCase();
      return `<div class="board-ability" onclick="openHeroAbility('${t.id}',${i})"><span class="board-ability-zone ${escAttr(z)}">${escHtml(a.Zone || 'Green')}</span><span class="board-ability-name">${escHtml(heroAbilityShownName(a))}</span></div>`;
    }).join('') + '</div>';
  }
  if (t.kind === 'minion' || t.kind === 'lieutenant') {
    const abs = villainAbilitiesForToken(t);
    if (!abs.length) return '';
    return '<div class="board-ability-list">' + abs.map((a, i) =>
      `<div class="board-ability minion-ab" onclick="openVillainAbility('${t.id}',${i})"><b>${escHtml(a.name)}:</b> ${escHtml(a.body || '')}</div>`
    ).join('') + '</div>';
  }
  if (t.kind === 'villain') {
    const abs = villainAbilitiesForToken(t);
    if (!abs.length) return '';
    return '<div class="board-ability-list">' + abs.map((a, i) => {
      const typeLetter = abilityTypeLetter(a);
      const rollStr = abilityRollLetters(a);
      const name = a.name || a.Name || '';
      return `<div class="board-ability villain-ab" onclick="openVillainAbility('${t.id}',${i})"><span class="board-ability-type">${escHtml(typeLetter)}</span><span class="board-ability-name">${escHtml(name)}</span>${rollStr ? `<span class="board-ability-rolls">${escHtml(rollStr)}</span>` : ''}</div>`;
    }).join('') + '</div>';
  }
  return '';
}
function tokenShowsTwists(t) {
  return t.kind === 'hero' || t.kind === 'villain';
}
function boardActionBtn(t, a) {
  return `<button type="button" class="btn btn-small btn-ghost" onclick="openBoardAction('${t.id}','${a}',null)">${a}</button>`;
}
function boardTwistsBtn(t) {
  return `<button type="button" class="btn btn-small btn-ghost" onclick="openTwistPicker('${t.id}')">Twists</button>`;
}
function boardBasicActionsHtml(t) {
  // Bystander NPCs: no Attack / Overcome / BHD chrome.
  if (isNonCombatNpc(t)) return '';
  // Modular hero modes can lock basic actions out (e.g. "You cannot Boost,
  // Defend, or Overcome in this mode"). Locked buttons render disabled.
  const locked = t.kind === 'hero' ? modeLockedActions(t) : new Set();
  const lockBtn = (a) => locked.has(a.toLowerCase())
    ? `<button type="button" class="btn btn-small btn-ghost board-act-locked" title="Locked while this mode is active" onclick="event.stopPropagation();toast('${a} is locked in this mode')">${a} 🔒</button>`
    : boardActionBtn(t, a);
  // Other NPCs: Hero type gets full basic hero actions; minion/lt-shaped NPCs Attack only.
  if (isNpcToken(t)) {
    if (npcTypeOf(t) === 'Hero') {
      return `<div class="board-actions"><div class="board-actions-row">${lockBtn('Attack')}${lockBtn('Overcome')}${boardTwistsBtn(t)}</div></div>`;
    }
    return `<div class="board-actions"><div class="board-actions-row">${lockBtn('Attack')}</div></div>`;
  }
  if (t.kind === 'villain') {
    return `<div class="board-actions"><div class="board-actions-row">${boardActionBtn(t,'Attack')}${boardActionBtn(t,'Overcome')}${boardTwistsBtn(t)}</div></div>`;
  }
  if (t.kind === 'minion' || t.kind === 'lieutenant') {
    return `<div class="board-actions"><div class="board-actions-row board-actions-row-2">${boardActionBtn(t,'Attack')}${boardActionBtn(t,'Overcome')}</div></div>`;
  }
  // Hero (non-NPC): Attack, Overcome, Twists (tickers handle Boost/Hinder/Defend/Recover)
  return `<div class="board-actions"><div class="board-actions-row">${lockBtn('Attack')}${lockBtn('Overcome')}${boardTwistsBtn(t)}</div></div>`;
}

/* ---- Modular hero mode UI on the hero token ---- */
function renderHeroModeHtml(t) {
  const modes = heroModesForToken(t);
  if (!modes || modes.length < 2) return '';
  const cur = heroCurrentMode(t);
  const curSlug = (cur && cur.slug) || 'default';
  const opts = modes.map(m => {
    const slug = m.slug || 'default';
    const label = (m.default ? 'Default — ' : '') + (m.name || slug) + (m.immobile ? ' (immobile)' : '');
    return `<option value="${escAttr(slug)}" ${slug === curSlug ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
  // Mode powers: in non-default modes ONLY the picked powers exist; default shows
  // the full library loadout, so only render the powers row for non-default modes.
  const powerMap = heroModePowerMap(t);
  let powersHtml = '';
  if (powerMap && !cur.default) {
    const chips = Object.entries(powerMap).map(([name, die]) =>
      `<span class="mode-power-chip">${escHtml(name)} <b>${escHtml(die)}</b></span>`).join('');
    powersHtml = `<div class="mode-powers">${chips || '<span class="mvc-empty">No powers in this mode.</span>'}</div>`;
  }
  const flags = [];
  if (cur && cur.immobile) flags.push('Immobile');
  if (cur && cur.powerless) flags.push('No abilities');
  return `<div class="hero-mode-row">
    <select class="hero-mode-select" title="Change mode" onchange="setHeroMode('${t.id}', this.value)">
      ${opts}
    </select>
    ${flags.length ? `<span class="mode-flags">${flags.map(escHtml).join(' · ')}</span>` : ''}
    ${powersHtml}
  </div>`;
}
function setHeroMode(id, slug) {
  const t = findTok(id);
  if (!t) return;
  const modes = heroModesForToken(t) || [];
  const m = modes.find(x => (x.slug || '') === slug);
  t.currentMode = slug || 'default';
  saveSceneDebounced();
  renderTokens();
  toast(`${t.name}: mode → ${(m && m.name) || t.currentMode}${m && m.immobile ? ' (immobile)' : ''}`);
}
function abilityPopupText(ability) {
  if (!ability) return '';
  return ability.text || ability.GameText || ability.body || ability.Description || '';
}
function abilityPopupDescHtml(ability) {
  const text = abilityPopupText(ability);
  return `<div class="ability-popup-desc"><div class="ability-popup-desc-label">Game Text</div><p>${text ? escHtml(text) : '<span class="empty-hint">No game text on file.</span>'}</p></div>`;
}
const VILLAIN_TWIST_HELP = `<div class="gm-help">
  <h3>Villains and Minor Twists</h3>
  <p>Villains can succeed with minor twists, but these are different than the twists heroes take. Useful minor twists for villains:</p>
  <ul>
    <li>Villain takes damage equal to their Max die. Victory comes at a price.</li>
    <li>Villain eliminates one of their own minions or lowers the die size of one of their lieutenants. If someone else can pay the price of victory, so much the better.</li>
    <li>Villain takes a penalty (as from a Hinder action) or grants a hero in the same location a bonus (as from a Boost action) equal to their Max die. The best laid plans often go awry.</li>
    <li>Villain inflicts a penalty (as from a Hinder action based on their Mid die) to all their minions and lieutenants or grants a bonus (as from a Boost action based on their Mid die) to the heroes. If one lets their anger get the best of them, it can be their undoing.</li>
    <li>Villain skips their next action to deal with a consequence (unintended or otherwise) of their action. If you want something done right, you have to do it yourself!</li>
  </ul>
  <h3>Major Twists for Villains</h3>
  <p>Villains should not take major twists. If a villain is offered the choice of either success with a major twist or failure, the villain will fail. Major twists follow a hero for the full issue; a villain is often only in one or two scenes. Exception:</p>
  <h3>Use Major Twists to End the Scene</h3>
  <p>If the scene is running long, or it would be fun narratively, a villain’s major twist can end the scene immediately. The villain could barely or partially succeed but wind up captured, or their scheme fails completely but they escape.</p>
</div>`;
const VILLAIN_OVERCOME_HELP = `<div class="gm-help">
  <h3>Overcome</h3>
  <p>Villains Overcome obstacles similarly to heroes. Major villains often have masteries that auto-succeed at Overcome actions in their expertise. There are no opposed rolls — Overcome cannot nullify a hero’s action. Use Hinder or a special ability for that.</p>
  <h3>Overcome to Make the Scene More Dangerous</h3>
  <p>On a success, the scene tracker advances one space (mayhem, monologue, chaos). <b>At most once per scene.</b> Do not use this to end a scene by surprise; telegraph desperation so players can plan.</p>
</div>`;
const MINION_OVERCOME_HELP = `<div class="gm-help">
  <h3>Overcome</h3>
  <p>Minions and lieutenants may Overcome obstacles that advance their agenda. They cannot advance the scene tracker — only villains can.</p>
  <ul>
    <li>They never take a major twist on a 1–3. They just fail.</li>
    <li>As a group, two “success with a minor twist” results in the same action count as one full success.</li>
    <li>A minion who succeeds with a minor twist on their own knocks themselves out. A lieutenant who does degrades one die size.</li>
    <li>An 8+ is a full success; a spectacular success can be a later “graduation” if it would be fun.</li>
    <li>Player-controlled minions/lieutenants use that hero’s principles for twists.</li>
  </ul>
</div>`;
function actionHelpHtml(t, action) {
  if (action !== 'Overcome') return '';
  if (t.kind === 'villain') return VILLAIN_OVERCOME_HELP;
  if (t.kind === 'minion' || t.kind === 'lieutenant') return MINION_OVERCOME_HELP;
  return '';
}

let boardActionState = null;
// Abilities whose text/icon never resolve to one of the 6 board actions (Attack/
// Defend/Boost/Hinder/Overcome/Recover) are passives, Upgrades, or other
// non-targeted effects — e.g. a flat damage-reduction trait or a "increase all
// power dice one size" Upgrade. There's nothing to target or roll, so show the
// text and stop rather than forcing the Attack-style target/effect-die flow.
function showAbilityReadOnly(t, name, body) {
  boardActionState = null;
  document.getElementById('abilitiesModalTitle').textContent = name + ' — ' + t.name;
  document.getElementById('abilitiesModalBody').innerHTML = `
    ${abilityPopupDescHtml({ name, text: body })}
    <p class="empty-hint">Passive / no target — nothing to apply here.</p>`;
  document.getElementById('abilitiesModal').classList.remove('hidden');
}
function openHeroAbility(tokenId, idx) {
  const t = findTok(tokenId);
  const a = heroAbilitiesForToken(t)[idx];
  if (!a) return;
  const name = heroAbilityShownName(a) || a.Name || '';
  // Modular mode-change abilities get dedicated flows (mode picker inside the
  // popup, mode change applied at the book's point in the resolution order).
  if (/^quick switch$/i.test(name)) { openQuickSwitch(tokenId, a); return; }
  if (/^emergency switch$/i.test(name)) { openEmergencySwitch(tokenId, a); return; }
  const types = abilityRollTypes(a);
  const shown = { name, text: a.GameText || a.body || '', rollTypes: types, effectHint: a.EffectDieHint || '' };
  if (!types.length) { showAbilityReadOnly(t, shown.name, shown.text); return; }
  if (/^switch$/i.test(name) || /^skirmish$/i.test(name)) {
    shown.modeChange = { position: 'post', label: /^skirmish$/i.test(name) ? 'Change mode at end of turn' : 'Change mode (after the action resolves)' };
  }
  openBoardAction(tokenId, types[0], shown);
}
function heroModeOptions(t, selected) {
  const modes = heroModesForToken(t) || [];
  const cur = t.currentMode || 'default';
  return modes.map(m => {
    const slug = m.slug || 'default';
    const label = (m.default ? 'Default — ' : '') + (m.name || slug) + (slug === cur ? ' (current)' : '') + (m.immobile ? ' (immobile)' : '');
    return `<option value="${escAttr(slug)}" ${slug === (selected || cur) ? 'selected' : ''}>${escHtml(label)}</option>`;
  }).join('');
}
function openQuickSwitch(tokenId, ability) {
  const t = findTok(tokenId);
  if (!t) return;
  boardActionState = { tokenId, action: null, ability: Object.assign({}, ability, { modeChange: { position: 'pre' } }), types: [] };
  document.getElementById('abilitiesModalTitle').textContent = 'Quick Switch — ' + t.name;
  document.getElementById('abilitiesModalBody').innerHTML = `
    ${abilityPopupDescHtml(ability)}
    <div class="board-act-block">
      <div class="board-act-type-header field-label">1 · Destroy one bonus on you (resolve first)</div>
      <p class="empty-hint">Destroy / remove one bonus on this hero as a normal board action after continuing.</p>
      <div class="board-act-type-header field-label" style="margin-top:8px;">2 · Change modes (before the action)</div>
      <label class="board-act-target">New mode <select id="modeChangeSel">${heroModeOptions(t)}</select></label>
      <div class="board-act-type-header field-label" style="margin-top:8px;">3 · Take an action in the new mode</div>
      <label class="board-act-target">Action <select id="quickSwitchAction">
        ${['Attack','Defend','Boost','Hinder','Overcome','Recover'].map(x => `<option>${x}</option>`).join('')}
      </select></label>
    </div>
    <div class="board-act-apply-gap"></div>
    <button type="button" class="btn btn-accent" onclick="continueQuickSwitch()">Continue</button>`;
  document.getElementById('abilitiesModal').classList.remove('hidden');
}
function continueQuickSwitch() {
  const st = boardActionState;
  if (!st) return;
  const actor = findTok(st.tokenId);
  const mode = (document.getElementById('modeChangeSel') || {}).value || 'default';
  const action = (document.getElementById('quickSwitchAction') || {}).value || 'Attack';
  // Step 1 of Quick Switch: destroy one bonus on this hero.
  if (actor) {
    const mods = ensureMods(state.scene);
    const idx = mods.findIndex(m => m.kind === 'boost' && m.targetId === actor.id);
    if (idx >= 0) {
      mods.splice(idx, 1);
      logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, 'Quick Switch',
        { name: actor.name }, `${actor.name}: destroyed one bonus on themselves (Quick Switch)`, {});
    }
  }
  st.ability.modeChange.mode = mode;
  openBoardAction(st.tokenId, action, st.ability);
}
function openEmergencySwitch(tokenId, ability) {
  const t = findTok(tokenId);
  if (!t) return;
  boardActionState = { tokenId, action: null, ability, types: [], emergencySwitch: true };
  document.getElementById('abilitiesModalTitle').textContent = 'Emergency Switch — ' + t.name;
  document.getElementById('abilitiesModalBody').innerHTML = `
    ${abilityPopupDescHtml(ability)}
    <div class="board-act-block">
      <div class="board-act-type-header field-label">Reaction — change to any mode when hit by an Attack</div>
      <label class="board-act-target">New mode <select id="modeChangeSel">${heroModeOptions(t)}</select></label>
      <div class="board-act-type-header field-label" style="margin-top:8px;">Cost (choose one)</div>
      <label style="display:block;"><input type="radio" name="emergencyCost" value="damage" checked> Take extra damage equal to the Min die: <input type="number" id="emergencyDamage" min="0" value="0" style="width:64px;"></label>
      <label style="display:block;"><input type="radio" name="emergencyCost" value="twist"> Take a minor twist</label>
    </div>
    <div class="board-act-apply-gap"></div>
    <button type="button" class="btn btn-accent" onclick="commitEmergencySwitch()">Apply</button>`;
  document.getElementById('abilitiesModal').classList.remove('hidden');
}
function commitEmergencySwitch() {
  const st = boardActionState;
  if (!st) return;
  const t = findTok(st.tokenId);
  if (!t) return;
  const modes = heroModesForToken(t) || [];
  const mode = (document.getElementById('modeChangeSel') || {}).value || 'default';
  const m = modes.find(x => (x.slug || '') === mode);
  t.currentMode = mode;
  const costRadio = document.querySelector('input[name="emergencyCost"]:checked');
  let costTxt = '';
  if (costRadio && costRadio.value === 'damage') {
    const dmg = Math.max(0, Number((document.getElementById('emergencyDamage') || {}).value) || 0);
    if (dmg > 0) t.currentHealth = Math.max(0, (Number(t.currentHealth) || 0) - dmg);
    costTxt = `took ${dmg} extra damage`;
  } else {
    costTxt = 'took a minor twist';
  }
  logActivity({ id: t.id, name: t.name, kind: t.kind }, 'Emergency Switch',
    { name: (m && m.name) || mode }, `${t.name}: Emergency Switch → ${(m && m.name) || mode}; ${costTxt}`, { mode, countsAsTurn: false });
  saveSceneDebounced();
  closeAbilities();
  renderTokens();
  toast(`${t.name}: Emergency Switch → ${(m && m.name) || mode} (${costTxt})`);
}
function openVillainAbility(tokenId, idx) {
  const t = findTok(tokenId);
  const a = villainAbilitiesForToken(t)[idx];
  if (!a) return;
  const types = abilityRollTypes(a);
  const shown = { name: a.name || a.Name, text: a.body || a.GameText || a.text || '', rollTypes: types, effectHint: a.EffectDieHint || '' };
  if (!types.length) { showAbilityReadOnly(t, shown.name, shown.text); return; }
  openBoardAction(tokenId, types[0], shown);
}
function healthOrDieTargets() {
  return (state.scene.tokens || []).filter(x => !x.ko && !isNonCombatNpc(x) && (x.kind === 'hero' || x.kind === 'villain' || x.kind === 'minion' || x.kind === 'lieutenant'));
}
function openBoardAction(tokenId, action, ability) {
  const t = findTok(tokenId);
  if (!t) return;
  const types = (ability && ability.rollTypes && ability.rollTypes.length) ? ability.rollTypes.slice() : [action];
  boardActionState = { tokenId, action: action || types[0], ability, types };
  const title = (ability ? ability.name : 'Basic ' + action) + ' — ' + t.name;
  document.getElementById('abilitiesModalTitle').textContent = title;
  const combat = healthOrDieTargets();
  const combatOpts = combat.map(x =>
    `<option value="${x.id}" ${x.id === t.id ? 'selected' : ''}>${escHtml(x.name)} (${x.kind})</option>`
  ).join('');
  const blocks = types.map((k, i) => {
    const typeName = String(k || action || '').trim() || 'Action';
    const targetInner = typeName === 'Overcome'
      ? `<label class="board-act-target">Target <input type="text" id="boardActTarget_${i}" data-rtype="${escAttr(typeName)}" placeholder="Door, alarm, scene object…"></label>`
      : `<label class="board-act-target">Target <select id="boardActTarget_${i}" data-rtype="${escAttr(typeName)}">${combatOpts}</select></label>`;
    // Boost/Hinder creation: optional minor twist for a SECOND use of the mod.
    const twistInner = (typeName === 'Boost' || typeName === 'Hinder')
      ? boardActTwistHtml(t, i) : '';
    // Attack rows: the actor decides which mods sitting on them to spend.
    const modsInner = typeName === 'Attack' ? actorModsPickerHtml(t, i) : '';
    return `<div class="board-act-block">
      <div class="board-act-type-header field-label" style="margin-top:8px;">${escHtml(typeName)}</div>
      <div class="board-act-effect-row">
        <label class="board-act-effect">Effect Die <input type="number" id="boardActEffect_${i}" data-rtype="${escAttr(typeName)}" min="0" value="0"></label>
        ${targetInner}
      </div>
      ${modsInner}${twistInner}
    </div>`;
  }).join('');
  const helpBits = types.map(k => actionHelpHtml(t, k)).filter(Boolean).join('');
  // Mode-change abilities (Switch / Skirmish / Quick Switch): the popup offers the
  // target mode; commitBoardAction applies it at the book's point in the order.
  const modeChangeHtml = (ability && ability.modeChange)
    ? `<div class="board-act-block"><div class="board-act-type-header field-label" style="margin-top:8px;">${escHtml(ability.modeChange.label || 'Change mode')}</div>
       <label class="board-act-target">New mode <select id="modeChangeSel">${heroModeOptions(t, ability.modeChange.mode)}</select></label></div>`
    : '';
  const el = document.getElementById('abilitiesModalBody');
  el.innerHTML = `
    ${ability ? abilityPopupDescHtml(ability) : ''}
    ${ability && ability.effectHint ? `<p class="empty-hint">Effect die hint: ${escHtml(ability.effectHint)}</p>` : ''}
    <div id="boardActHelp">${helpBits}</div>
    ${blocks}
    ${modeChangeHtml}
    <div class="board-act-apply-gap"></div>
    <button type="button" class="btn btn-accent" onclick="commitBoardAction()">Apply</button>`;
  document.getElementById('abilitiesModal').classList.remove('hidden');
}
function commitBoardAction() {
  const st = boardActionState;
  if (!st) return;
  const actor = findTok(st.tokenId);
  if (!actor) return;
  const types = (st.types && st.types.length) ? st.types : [st.action];
  const abilityName = (st.ability && st.ability.name) || ('Basic ' + (types[0] || st.action));
  // Mode change ordering: 'pre' resolves before the action rows (Quick Switch —
  // the follow-up action uses the NEW mode), 'post' after them (Switch / Skirmish —
  // bonuses created by the action belong to the OLD mode).
  const applyModeChange = () => {
    const mc = st.ability && st.ability.modeChange;
    if (!mc) return;
    const sel = document.getElementById('modeChangeSel');
    const mode = (mc.mode || (sel && sel.value) || '').trim();
    if (!mode) return;
    const modes = heroModesForToken(actor) || [];
    const m = modes.find(x => (x.slug || '') === mode);
    actor.currentMode = mode;
    logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, 'Mode Change',
      { name: (m && m.name) || mode }, `${actor.name}: mode → ${(m && m.name) || mode} (${abilityName})`, { mode, ability: abilityName, countsAsTurn: false });
    toast(`${actor.name}: mode → ${(m && m.name) || mode}`);
  };
  const modeFirst = st.ability && st.ability.modeChange && st.ability.modeChange.position === 'pre';
  if (modeFirst) applyModeChange();
  let applied = 0;
  types.forEach((action, i) => {
    const effectEl = document.getElementById('boardActEffect_' + i);
    const effect = Math.max(0, Number(effectEl && effectEl.value) || 0);
    if (action === 'Overcome') {
      const objEl = document.getElementById('boardActTarget_' + i);
      const obj = (objEl && objEl.value) || 'scene object';
      logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, action,
        { name: obj }, `${abilityName}: Overcome ${effect} vs ${obj} — ${overcomeResult(effect)}`, { effect, ability: abilityName });
      applied++;
      return;
    }
    const targetEl = document.getElementById('boardActTarget_' + i);
    const targetId = targetEl && targetEl.value;
    const target = findTok(targetId);
    if (!target) return;
    const spendDelta = spendRowMods(i);
    const twistUsed = !!(document.getElementById('rowTwist_' + i) && document.getElementById('rowTwist_' + i).checked);
    const twistPrinciple = twistUsed
      ? (document.getElementById('rowTwistPrinciple_' + i) || {}).value : null;
    if (action === 'Attack') applyBoardAttack(actor, target, effect + spendDelta, abilityName);
    else if (action === 'Defend') applyBoardMod(actor, target, 'defend', Math.max(0, effect + spendDelta), abilityName, false);
    else if (action === 'Boost' || action === 'Hinder') {
      const value = bhModValue(effect + spendDelta);
      const twistText = twistPrinciple
        ? (((state.heroes.find(h => h.Slug === (actor.slug || '')) || {})['Principle' + twistPrinciple + 'MinorTwist']) || '')
        : '';
      applyBoardMod(actor, target, action.toLowerCase(), value, abilityName, true,
        { uses: twistText ? 2 : 1, twistText });
    }
    else if (action === 'Recover') applyBoardRecover(actor, target, effect, abilityName);
    else return;
    applied++;
  });
  if (!applied) { toast('Pick a target with Health or a Minion die.'); return; }
  if (types.includes('Overcome') && applied) toast(`${abilityName}: applied`);
  if (!modeFirst) applyModeChange();
  saveSceneDebounced();
  closeAbilities();
  renderTokens();
}
function applyBoardMod(actor, target, kind, value, abilityName, creatorShows, opts) {
  if (value <= 0) { toast('No mod created.'); return; }
  const o = opts || {};
  const creatorId = actor.id;
  const targetId = kind === 'defend' ? target.id : (creatorShows && kind === 'boost' ? actor.id : target.id);
  if (kind === 'boost') {
    ensureMods(state.scene).push({ id: uid('mod'), kind, value, creatorId: actor.id, targetId: target.id, exclusivePersistent: false, uses: o.uses || 1, twist: o.twistText || '' });
  } else if (kind === 'hinder') {
    ensureMods(state.scene).push({ id: uid('mod'), kind, value, creatorId: actor.id, targetId: target.id, exclusivePersistent: false, uses: o.uses || 1, twist: o.twistText || '' });
  } else {
    ensureMods(state.scene).push({ id: uid('mod'), kind, value, creatorId: actor.id, targetId: target.id, exclusivePersistent: false });
  }
  saveSceneDebounced();
  logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, actionTitle(kind),
    { id: target.id, name: target.name, kind: target.kind },
    `${abilityName}: ${kind} ${value} → ${target.name}${o.uses > 1 ? ' (2 uses — minor twist taken)' : ''}`, { value, ability: abilityName, uses: o.uses || 1, twist: o.twistText || '' });
  toast(`${abilityName}: ${kind} ${value} on ${kind === 'boost' ? actor.name + ' (creator)' : target.name}`);
}
function actionTitle(kind) { return kind.charAt(0).toUpperCase() + kind.slice(1); }

// GM hero Recover: gated like the player sheet — an ability must grant it,
// except in a Montage scene. The GM can still type a Health number directly.
function heroRecoverOrExplain(tokenId) {
  const t = findTok(tokenId);
  if (!t) return;
  if (t.kind === 'hero' && !heroCanRecover(t)) {
    toast('Recover needs an ability that grants it (outside a Montage scene)');
    return;
  }
  openBoardAction(tokenId, 'Recover', null);
}

// Mods sitting ON the actor — the affected party decides when they happen.
function actorModsPickerHtml(actor, rowIdx) {
  const spend = liveMods(state.scene).filter(m =>
    (m.kind === 'boost' || m.kind === 'hinder') && m.targetId === actor.id);
  if (!spend.length) return '';
  const rows = spend.map(m => {
    const cr = findTok(m.creatorId);
    const tag = m.exclusivePersistent ? 'Exclusive & Persistent'
      : (Number(m.uses) > 1 ? `one-off, ${m.uses} uses (minor twist taken)` : 'one-off');
    return `<label><input type="checkbox" class="row-mod" data-row="${rowIdx}" data-id="${m.id}">
      ${m.kind === 'boost' ? '+' : '−'}${m.value} ${m.kind} from ${escHtml(cr ? cr.name : '?')} (${tag})</label>`;
  }).join('');
  return `<div class="mod-list"><b>Mods on ${escHtml(actor.name)} (spend on this roll)</b>${rows}</div>`;
}
function selectedRowMods(rowIdx) {
  return [...document.querySelectorAll(`.row-mod[data-row="${rowIdx}"]:checked`)].map(el =>
    liveMods(state.scene).find(m => m.id === el.dataset.id)
  ).filter(Boolean);
}
function spendRowMods(rowIdx) {
  let delta = 0;
  selectedRowMods(rowIdx).forEach(m => {
    delta += m.kind === 'boost' ? (Number(m.value) || 0) : -(Number(m.value) || 0);
    consumeOneUse(m, false);
  });
  return delta;
}
// Creation-time minor twist: the mod lasts for two uses (RAW: take a minor
// twist related to the situation when you create it).
function boardActTwistHtml(t, rowIdx) {
  const row = state.heroes.find(h => h.Slug === (t.slug || '')) || {};
  const opts = [];
  for (const n of [1, 2]) {
    const q = row['Principle' + n + 'MinorTwist'];
    if (q) opts.push(`<option value="${n}">${escHtml(row['Principle' + n + 'Name'] || ('Principle ' + n))}: ${escHtml(q)}</option>`);
  }
  if (!opts.length) return '';
  return `<div class="mod-list"><label><input type="checkbox" id="rowTwist_${rowIdx}">
    Take a Minor Twist: this mod lasts for TWO uses</label>
    <select id="rowTwistPrinciple_${rowIdx}" style="max-width:100%;">${opts.join('')}</select></div>`;
}
function applyBoardRecover(actor, target, effect, abilityName) {
  if (target.kind === 'hero' || target.kind === 'villain') {
    const max = Number(target.maxHealth) || target.currentHealth || 0;
    target.currentHealth = Math.min(max, (Number(target.currentHealth) || 0) + effect);
  }
  saveSceneDebounced();
  logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, 'Recover',
    { id: target.id, name: target.name, kind: target.kind },
    `${abilityName}: Recover ${effect} → ${target.name} (Health ${target.currentHealth})`, { effect, ability: abilityName });
  toast(`${abilityName}: Recover ${effect} on ${target.name}`);
}
function applyBoardAttack(actor, target, effect, abilityName) {
  const stacked = applyStackedAttack(target, effect);
  const dmg = stacked.dmg;
  if (target.kind === 'hero' || target.kind === 'villain') {
    target.currentHealth = Math.max(0, (Number(target.currentHealth) || 0) - dmg);
    saveSceneDebounced();
    logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, 'Attack',
      { id: target.id, name: target.name, kind: target.kind },
      `${abilityName}: ${dmg} damage to ${target.name} (Health ${target.currentHealth})`, { effect, dmg, ability: abilityName });
    toast(`${abilityName}: ${dmg} to ${target.name}`);
    return;
  }
  if (target.kind === 'minion') {
    const roll = rollDie(target.currentDie);
    const failed = roll < dmg;
    if (failed) target.ko = true;
    saveSceneDebounced();
    logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, 'Attack',
      { id: target.id, name: target.name, kind: target.kind },
      `${abilityName}: ${dmg} vs minion save ${roll} — ${failed ? 'defeated' : 'held'}`, { effect, dmg, roll, ability: abilityName });
    toast(`${abilityName}: minion rolled ${roll} vs ${dmg} — ${failed ? 'defeated' : 'held'}`);
    return;
  }
  if (target.kind === 'lieutenant') {
    if (dmg >= target.currentDie * 2) {
      target.ko = true;
      saveSceneDebounced();
      logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, 'Attack',
        { id: target.id, name: target.name, kind: target.kind },
        `${abilityName}: ${dmg} ≥ double d${target.currentDie} — instant KO`, { effect, dmg, ability: abilityName });
      toast(`${abilityName}: lieutenant instant KO`);
      return;
    }
    const roll = rollDie(target.currentDie);
    if (roll < dmg) {
      const next = degradeDie(target.currentDie);
      if (next == null) target.ko = true;
      else target.currentDie = next;
      saveSceneDebounced();
      logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, 'Attack',
        { id: target.id, name: target.name, kind: target.kind },
        `${abilityName}: save ${roll} vs ${dmg} — ${target.ko ? 'defeated' : 'd' + target.currentDie}`, { effect, dmg, roll, ability: abilityName });
      toast(`${abilityName}: lieutenant ${target.ko ? 'defeated' : 'now d' + target.currentDie}`);
    } else {
      saveSceneDebounced();
      logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, 'Attack',
        { id: target.id, name: target.name, kind: target.kind },
        `${abilityName}: save ${roll} vs ${dmg} — held`, { effect, dmg, roll, ability: abilityName });
      toast(`${abilityName}: lieutenant held`);
    }
  }
}
function closeAbilities() {
  const el = document.getElementById('abilitiesModal');
  if (el) el.classList.add('hidden');
  boardActionState = null;
}
let abilityUseCards = [];
function effectKeyFromText(text) {
  const t = (text || '').toLowerCase();
  if (/max\s*\+\s*mid\s*\+\s*min/.test(t)) return 'max+mid+min';
  if (/max\s*\+\s*mid/.test(t)) return 'max+mid';
  if (/max\s*\+\s*min/.test(t)) return 'max+min';
  if (/mid\s*\+\s*min/.test(t)) return 'mid+min';
  if (/\bmax die\b|\byour max\b|use your max/.test(t)) return 'max';
  if (/\bmin die\b|\byour min\b|use your min/.test(t)) return 'min';
  return 'mid';
}
function useAbilityCard(tokenId, idx) {
  const card = abilityUseCards[idx];
  if (!card) return;
  closeAbilities();
  const t = findTok(tokenId);
  if (t && (t.kind === 'minion' || t.kind === 'lieutenant')) {
    // Minions/Lieutenants have no Powers/Qualities dice pool — resolve via the same
    // effect-die/target flow the board's own ability list already uses for them.
    const types = abilityRollTypes(card);
    if (!types.length) { showAbilityReadOnly(t, card.name, card.body || ''); return; }
    openBoardAction(tokenId, types[0], {
      name: card.name, text: card.body || '', rollTypes: types, effectHint: ''
    });
    return;
  }
  openDiceRoller(tokenId);
  const rs = rollerState;
  if (!rs) return;
  const body = card.body || '';
  const names = [...body.matchAll(/\[([^\]]+)\]/g)].map(m => m[1]).filter(n => !/^(power|quality|element|energy|physical|A|I|R)$/i.test(n));
  for (const n of names) {
    const pi = rs.powers.findIndex(p => p.name.toLowerCase() === n.toLowerCase());
    if (pi >= 0) rs.pIdx = pi;
    const qi = rs.qualities.findIndex(q => q.name.toLowerCase() === n.toLowerCase());
    if (qi >= 0) rs.qIdx = qi;
  }
  rs.pendingEffectKey = effectKeyFromText(body);
  rs.abilityCard = card;
  renderDiceRollerBody();
  if (rs.powers.length && rs.qualities.length) {
    rollDicePool();
    completeAbilityAction(tokenId, card);
  }
}
function bhModValue(v) {
  const s = boostHinderMod(v);
  const m = String(s).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}
function completeAbilityAction(tokenId, card) {
  const rs = rollerState;
  if (!rs || !rs.lastRoll) return;
  const t = findTok(tokenId);
  const { min, mid, max } = rs.lastRoll;
  const eff = effectDieValue(min, mid, max, rs.lastRoll.effectKey);
  const icon = (card.icon || '').toLowerCase();
  const text = (card.body || '').toLowerCase();
  logActivity({ id: t.id, name: t.name, kind: t.kind }, card.name, null,
    `${card.name}: Min ${min.value} / Mid ${mid.value} / Max ${max.value} → effect ${eff}`,
    { min: min.value, mid: mid.value, max: max.value, effect: eff, ability: card.name });
  if (icon.includes('boost') || /\bboost\b/.test(text)) {
    const val = bhModValue(eff);
    if (val > 0) {
      ensureMods(state.scene).push({ id: uid('mod'), kind: 'boost', value: val, creatorId: t.id, targetId: t.id, exclusivePersistent: false });
      saveSceneDebounced(); renderTokens();
      toast(`${card.name}: Boost ${val} on ${t.name}`);
    }
  } else if (icon.includes('hinder') || icon.includes('defend') || icon.includes('attack')) {
    toast(`${card.name}: effect ${eff}. Pick a target if needed.`);
  } else {
    toast(`${card.name}: Min ${min.value} Mid ${mid.value} Max ${max.value}`);
  }
}

async function loadSceneRoster() {
  const empty = { hero: new Set(), villain: new Set(), minion: new Set() };
  const slug = state.activeSlug;
  if (!slug) { state.sceneRoster = empty; state.sceneHasIssue = false; return; }
  const list = await apiListIssues();
  const roster = { hero: new Set(), villain: new Set(), minion: new Set() };
  let hit = false;
  for (const i of list) {
    const f = await apiGetIssue(i.slug);
    if (!f || !(f.sceneSlugs || []).includes(slug)) continue;
    hit = true;
    (f.heroSlugs || []).forEach(s => roster.hero.add(s));
    (f.villainSlugs || []).forEach(s => roster.villain.add(s));
    (f.minionSlugs || []).forEach(s => roster.minion.add(s));
  }
  state.sceneRoster = roster;
  state.sceneHasIssue = hit;
}

function refreshSpawnOptions() {
  const typeEl = document.getElementById('spawnType');
  const listSel = document.getElementById('spawnSelect');
  const hint = document.getElementById('spawnHint');
  if (!typeEl || !listSel) return;
  const type = typeEl.value;
  const prevSlug = listSel.value;
  const list = type === 'hero' ? state.heroes : type === 'villain' ? state.villains : type === 'npc' ? state.npcs : state.minions;
  const field = type === 'hero' ? 'hero' : type === 'villain' ? 'villain' : 'minion';
  const allowed = (state.sceneRoster && state.sceneRoster[field]) || new Set();
  let filtered = (list || []).filter(r => r.Name && allowed.has(r.Slug));
  if (type === 'villain' && state.scene && (state.scene.difficulty || '') === 'Easy') filtered = [];
  listSel.innerHTML = '<option value="">Select from Issue roster…</option>' +
    filtered.map(r => `<option value="${r.Slug}">${escHtml(r.Name)}${r.Type ? ' (' + r.Type + ')' : ''}</option>`).join('');
  if (prevSlug && [...listSel.options].some(o => o.value === prevSlug)) listSel.value = prevSlug;
  if (hint) {
    if (!state.scene) hint.textContent = '';
    else if (!state.sceneHasIssue) hint.textContent = 'This scene is not on an Issue — assign it in Issue Builder.';
    else if (type === 'villain' && state.scene && (state.scene.difficulty || '') === 'Easy') hint.textContent = 'Easy scenes have no villains.';
    else if (!filtered.length) hint.textContent = 'No ' + type + 's assigned to this Issue.';
    else hint.textContent = '';
  }
  refreshSpawnLocations();
}
function refreshSpawnLocations() {
  const sel = document.getElementById('spawnLocation');
  if (!sel) return;
  const prev = sel.value;
  const locs = (state.scene && state.scene.locations) || [];
  sel.innerHTML = locs.map(l => `<option value="${escAttr(l.id)}">${escHtml(l.name)}</option>`).join('')
    + '<option value="">Unplaced</option>';
  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  else if (locs[0]) sel.value = locs[0].id;
  else sel.value = '';
}
function selectedSpawnLocationId() {
  const sel = document.getElementById('spawnLocation');
  if (!sel) return (state.scene && state.scene.locations[0] && state.scene.locations[0].id) || null;
  const v = sel.value;
  return v ? v : null;
}

/* ============================================================
   Scenes: list / create / delete / editor
   ============================================================ */

function blankScene(name) {
  return {
    name: name || 'New Scene',
    difficulty: 'Moderate',
    sceneType: 'Action',
    tracker: { stars: [...TRACKER_PRESETS.standard.stars], position: 0 },
    locations: [
      { id: uid('loc'), name: 'Main Location' },
    ],
    background: null, // scene-level art for Player Display (not per-location)
    environment: null, // slug of an entry in the Environments library, or null
    challenges: [],
    tokens: [],
    mods: [],
    gmNotes: '',
    activityLog: [],
    round: 1,
  };
}

async function refreshScenesList() {
  state.scenesList = await apiListScenes();
}

function parentCollectionForIssue(issueSlug) {
  return (state.collectionsList || []).find(c => (c.issueSlugs || []).includes(issueSlug)) || null;
}
function parentIssueForScene(sceneSlug) {
  return (state.issuesList || []).find(i => (i.sceneSlugs || []).includes(sceneSlug)) || null;
}
function buildIssuesScenesRows() {
  const rows = [];
  const seenIssues = new Set();
  const seenScenes = new Set();
  const colls = (state.collectionsList || []).slice().sort((a, b) => naturalNameSort(a.name, b.name));
  colls.forEach(coll => {
    const issueSlugs = coll.issueSlugs || [];
    if (!issueSlugs.length) {
      rows.push({
        kind: 'collection',
        collectionSlug: coll.slug,
        collectionName: coll.name || coll.slug,
        issueSlug: '', issueName: '',
        sceneSlug: '', sceneName: '', sceneType: '', difficulty: '', environment: '',
      });
      return;
    }
    issueSlugs.forEach(is => {
      const iss = (state.issuesList || []).find(i => i.slug === is);
      if (!iss) return;
      seenIssues.add(iss.slug);
      const sceneSlugs = iss.sceneSlugs || [];
      if (!sceneSlugs.length) {
        rows.push({
          kind: 'issue',
          collectionSlug: coll.slug,
          collectionName: coll.name || coll.slug,
          issueSlug: iss.slug,
          issueName: iss.name || iss.slug,
          sceneSlug: '', sceneName: '', sceneType: '', difficulty: '', environment: '',
        });
        return;
      }
      sceneSlugs.forEach(ss => {
        const sc = (state.scenesList || []).find(s => s.slug === ss);
        if (!sc) return;
        seenScenes.add(sc.slug);
        rows.push({
          kind: 'scene',
          collectionSlug: coll.slug,
          collectionName: coll.name || coll.slug,
          issueSlug: iss.slug,
          issueName: iss.name || iss.slug,
          sceneSlug: sc.slug,
          sceneName: sc.name || sc.slug,
          sceneType: sc.sceneType || '',
          difficulty: sc.difficulty || '',
          environment: sc.environment || '',
        });
      });
    });
  });
  (state.issuesList || []).slice().sort((a, b) => naturalNameSort(a.name, b.name)).forEach(iss => {
    if (seenIssues.has(iss.slug)) return;
    const sceneSlugs = iss.sceneSlugs || [];
    if (!sceneSlugs.length) {
      rows.push({
        kind: 'issue',
        collectionSlug: '', collectionName: '',
        issueSlug: iss.slug, issueName: iss.name || iss.slug,
        sceneSlug: '', sceneName: '', sceneType: '', difficulty: '', environment: '',
      });
      return;
    }
    sceneSlugs.forEach(ss => {
      const sc = (state.scenesList || []).find(s => s.slug === ss);
      if (!sc) return;
      seenScenes.add(sc.slug);
      rows.push({
        kind: 'scene',
        collectionSlug: '', collectionName: '',
        issueSlug: iss.slug, issueName: iss.name || iss.slug,
        sceneSlug: sc.slug, sceneName: sc.name || sc.slug,
        sceneType: sc.sceneType || '', difficulty: sc.difficulty || '',
        environment: sc.environment || '',
      });
    });
  });
  (state.scenesList || []).slice().sort((a, b) => naturalNameSort(a.name, b.name)).forEach(sc => {
    if (seenScenes.has(sc.slug)) return;
    rows.push({
      kind: 'scene',
      collectionSlug: '', collectionName: '',
      issueSlug: '', issueName: '',
      sceneSlug: sc.slug, sceneName: sc.name || sc.slug,
      sceneType: sc.sceneType || '', difficulty: sc.difficulty || '',
      environment: sc.environment || '',
    });
  });
  return rows;
}
function renderIssuesScenesTable() {
  const el = document.getElementById('issues-scenesPanel');
  if (!el) return;
  const collF = (document.getElementById('libCollectionFilter') || {}).value || 'all';
  const issF = (document.getElementById('libIssueFilter') || {}).value || 'all';
  const activeFilt = (document.getElementById('libActiveFilter') || {}).value || 'active';
  let rows = buildIssuesScenesRows();
  if (collF !== 'all') rows = rows.filter(r => r.collectionSlug === collF);
  if (issF !== 'all') rows = rows.filter(r => r.issueSlug === issF);
  if (activeFilt === 'active') {
    rows = rows.filter(r => {
      if (r.kind !== 'scene' || !r.environment) return true;
      const env = (state.environments || []).find(e => e.Slug === r.environment);
      if (!env) return true;
      return isActiveFlag(env.Active);
    });
  }
  const envOpts = (state.environments || []).slice().sort((a, b) => naturalNameSort(a.Name, b.Name));
  let html = `<table class="lib-table"><thead><tr>
    <th>Load to Board</th><th>Collection Name</th><th>Issue Name</th><th>Scene Name</th>
    <th>Scene Type</th><th>Scene Difficulty</th><th>Environment</th>
  </tr></thead><tbody>`;
  rows.forEach((r, i) => {
    const nav = r.kind === 'scene' ? `editScene('${escAttr(r.sceneSlug)}')`
      : r.kind === 'issue' ? `editIssue('${escAttr(r.issueSlug)}')`
      : `editCollection('${escAttr(r.collectionSlug)}')`;
    const envCell = r.kind === 'scene'
      ? `<td class="no-row-nav" onclick="event.stopPropagation()"><select onchange="onIssuesScenesEnvChange('${escAttr(r.sceneSlug)}', this.value)">
          <option value="">— none —</option>
          ${envOpts.map(e => `<option value="${escAttr(e.Slug)}" ${r.environment === e.Slug ? 'selected' : ''}>${escHtml(e.Name || e.Slug)}</option>`).join('')}
        </select></td>`
      : '<td></td>';
    const loadCell = r.kind === 'scene'
      ? `<td class="no-row-nav" onclick="event.stopPropagation()"><button type="button" class="btn btn-accent btn-sm" title="Load this scene onto the board" onclick="loadSceneToBoard('${escAttr(r.sceneSlug)}')">Load to Board</button></td>`
      : '<td></td>';
    html += `<tr class="lib-row-clickable" onclick="${nav}">
      ${loadCell}
      <td class="name-field">${escHtml(r.collectionName || (r.kind === 'collection' ? '—' : ''))}</td>
      <td class="name-field">${escHtml(r.issueName || '')}</td>
      <td class="name-field">${escHtml(r.sceneName || '')}</td>
      <td>${escHtml(r.sceneType || '')}</td>
      <td>${escHtml(r.difficulty || '')}</td>
      ${envCell}
    </tr>`;
  });
  if (!rows.length) html += '<tr><td colspan="7" class="empty-hint">No collections, issues, or scenes yet. Click "+ Add Row".</td></tr>';
  html += '</tbody></table>';
  el.innerHTML = html;
}
async function onIssuesScenesEnvChange(sceneSlug, envSlug) {
  const sc = await apiGetScene(sceneSlug);
  if (!sc) return;
  sc.environment = envSlug || null;
  await apiSaveScene(sceneSlug, sc);
  const meta = (state.scenesList || []).find(s => s.slug === sceneSlug);
  if (meta) meta.environment = envSlug || '';
  const st = document.getElementById('saveStatus');
  if (st) st.textContent = 'Saved environment ✓';
  if (state.scene && state.scene.__slug === sceneSlug) {
    state.scene.environment = envSlug || null;
  }
}
async function issuesScenesAddRow() {
  const collF = (document.getElementById('libCollectionFilter') || {}).value || 'all';
  const issF = (document.getElementById('libIssueFilter') || {}).value || 'all';
  if (issF !== 'all') return newScene(issF, true);
  if (collF !== 'all') {
    const name = prompt('Issue name:');
    if (!name) return;
    const slug = uniqueIssueSlug(slugify(name));
    await apiSaveIssue(slug, blankIssue(name));
    const coll = await apiGetCollection(collF);
    if (coll) {
      coll.issueSlugs = coll.issueSlugs || [];
      if (!coll.issueSlugs.includes(slug)) coll.issueSlugs.push(slug);
      await apiSaveCollection(collF, coll);
    }
    await refreshIssuesList();
    await refreshCollectionsList();
    fillLibCollectionFilter();
    fillLibIssueFilter();
    editIssue(slug);
    return;
  }
  return newCollection();
}
function renderCollectionsList() { if (currentLibTab === 'issues-scenes') renderIssuesScenesTable(); }
function renderScenesList() { if (currentLibTab === 'issues-scenes') renderIssuesScenesTable(); }
function renderIssuesList() { if (currentLibTab === 'issues-scenes') renderIssuesScenesTable(); }

async function showCollectionsList() {
  const list = document.getElementById('libraryListView');
  const collEd = document.getElementById('collectionEditorView');
  const iss = document.getElementById('issueEditorView');
  const sc = document.getElementById('sceneEditorView');
  if (list) list.classList.remove('hidden');
  if (collEd) collEd.classList.add('hidden');
  if (iss) iss.classList.add('hidden');
  if (sc) sc.classList.add('hidden');
  state.editingCollectionSlug = null;
  state.editingIssueSlug = null;
  state.editingSlug = null;
  await Promise.all([refreshCollectionsList(), refreshIssuesList(), refreshScenesList()]);
  fillLibCollectionFilter();
  fillLibIssueFilter();
  if (currentLibTab === 'issues-scenes') renderIssuesScenesTable();
}

async function newScene(issueSlug, openEditor) {
  const name = prompt('Scene name:');
  if (!name) return;
  const slug = uniqueSceneSlug(slugify(name));
  await apiSaveScene(slug, blankScene(name));
  if (issueSlug && typeof issueSlug === 'string') {
    const iss = await apiGetIssue(issueSlug);
    if (iss) {
      iss.sceneSlugs = iss.sceneSlugs || [];
      iss.sceneSlugs.push(slug);
      await apiSaveIssue(issueSlug, iss);
    }
  }
  await refreshScenesList();
  await refreshIssuesList();
  if (openEditor === false) {
    if (currentLibTab === 'issues-scenes') renderIssuesScenesTable();
  } else editScene(slug);
}

function uniqueSceneSlug(base) {
  let candidate = base, n = 1;
  const taken = new Set(state.scenesList.map(s => s.slug));
  while (taken.has(candidate)) candidate = base + '-' + (++n);
  return candidate;
}

async function deleteScene(slug) {
  if (!confirm('Delete this scene? This cannot be undone.')) return;
  await apiDeleteScene(slug);
  await refreshScenesList();
  if (state.editingSlug === slug) showCollectionsList();
  else renderScenesList();
}
async function deleteSceneFromEditor() {
  const slug = state.editingSlug || (state.scene && state.scene.__slug);
  if (!slug) return;
  await deleteScene(slug);
}
async function deleteCollectionFromEditor() {
  const slug = state.editingCollectionSlug;
  if (!slug) return;
  await deleteCollection(slug);
  showCollectionsList();
}
async function deleteIssueFromEditor() {
  const slug = state.editingIssueSlug;
  if (!slug) return;
  await deleteIssue(slug);
  showCollectionsList();
}

function ensureSceneChallenges(scene) {
  if (!scene) return scene;
  if (!Array.isArray(scene.challenges)) scene.challenges = [];
  scene.challenges.forEach(c => {
    if (!c || typeof c !== 'object') return;
    if (!Array.isArray(c.paths)) c.paths = [];
  });
  // Migrate legacy per-location backgrounds up to the scene once.
  if (!scene.background) {
    const locBg = (scene.locations || []).map(l => l && l.background).find(Boolean);
    if (locBg) scene.background = locBg;
  }
  (scene.locations || []).forEach(l => { if (l && 'background' in l) delete l.background; });
  return scene;
}

async function editScene(slug) {
  state.editingSlug = slug;
  state.scene = ensureSceneChallenges(await apiGetScene(slug));
  if (state.scene) state.scene.__slug = slug;
  document.getElementById('libraryListView').classList.add('hidden');
  document.getElementById('collectionEditorView').classList.add('hidden');
  document.getElementById('issueEditorView').classList.add('hidden');
  document.getElementById('sceneEditorView').classList.remove('hidden');
  renderSceneEditor();
}

function backToScenesList() {
  showCollectionsList();
  state.editingSlug = null;
}

async function loadSceneToBoard(slug) {
  await apiSetActiveScene(slug);
  state.activeSlug = slug;
  state.turnMarks = {};
  state.scene = ensureSceneChallenges(await apiGetScene(slug));
  if (state.scene) {
    state.scene.__slug = slug;
    (state.scene.tokens || []).forEach(t => { delete t.turnNumber; });
  }
  toast('Loaded "' + state.scene.name + '" to Board.');
  switchView('board');
  renderBoard();
}

/** Find Issue sceneSlugs order containing slug; return next slug or null. */
async function findNextSceneSlugInIssue(slug) {
  if (!slug) return null;
  const list = await apiListIssues();
  for (const i of list) {
    const f = await apiGetIssue(i.slug);
    const scenes = (f && f.sceneSlugs) || [];
    const idx = scenes.indexOf(slug);
    if (idx < 0) continue;
    if (idx >= scenes.length - 1) return null; // last in this issue
    return scenes[idx + 1] || null;
  }
  return null;
}

async function nextSceneInIssue() {
  const slug = state.activeSlug || (state.scene && state.scene.__slug);
  if (!slug) {
    toast('No scene loaded.');
    return;
  }
  // Flush live board state before switching so tracker/tokens aren't lost.
  if (state.scene && state.scene.__slug) {
    try { await apiSaveScene(state.scene.__slug, state.scene); } catch (err) { /* still try next */ }
  }
  const next = await findNextSceneSlugInIssue(slug);
  if (!next) {
    const list = await apiListIssues();
    let onIssue = false;
    for (const i of list) {
      const f = await apiGetIssue(i.slug);
      if (f && (f.sceneSlugs || []).includes(slug)) { onIssue = true; break; }
    }
    toast(onIssue
      ? 'Already the last scene in this Issue.'
      : 'This scene is not on an Issue — assign it in Issue Builder.');
    updateNextSceneBtn();
    return;
  }
  await loadSceneToBoard(next);
}

async function updateNextSceneBtn() {
  const btn = document.getElementById('nextSceneBtn');
  if (!btn) return;
  const slug = state.activeSlug || (state.scene && state.scene.__slug);
  if (!slug || !state.scene) {
    btn.disabled = true;
    btn.title = 'No scene loaded';
    return;
  }
  if (!(state.scenesList || []).length) {
    try { state.scenesList = await apiListScenes(); } catch (e) { /* ignore */ }
  }
  const next = await findNextSceneSlugInIssue(slug);
  btn.disabled = !next;
  if (next) {
    const meta = (state.scenesList || []).find(s => s.slug === next);
    const name = (meta && meta.name) || next;
    btn.title = 'Load next scene in Issue order: ' + name;
  } else {
    btn.title = 'No next scene in Issue order';
  }
}

// Saves whichever scene is CURRENTLY loaded into state.scene, to its own slug --
// works correctly whether that scene got there via "Load to Board" or the Scene
// Editor, since both paths tag it with __slug when they load it.
const saveSceneDebounced = debounce(async () => {
  const slug = state.scene && state.scene.__slug;
  if (!slug) return;
  await apiSaveScene(slug, state.scene);
  if (slug === state.activeSlug) renderBoard();
  const status = document.getElementById('sceneSaveStatus');
  if (status) status.textContent = 'Saved ✓';
}, 500);

/* ---- Display Layout recalibrate: re-fit the PD location boxes to current
   occupancy (explicit GM click only — never automatic). Writes scene.layout as
   one proportional row; display.js clamps/validates. ---- */
function occupancyLayoutPlacements(scene, cols) {
  const locs = (scene && scene.locations) || [];
  if (!locs.length) return null;
  const n = locs.length;
  const total = Math.max(10, n);
  const counts = locs.map(l => (scene.tokens || []).filter(t => !t.ko && (t.locationId || '') === l.id).length);
  const weights = counts.map(c => Math.max(1, c));
  const wsum = weights.reduce((a, b) => a + b, 0);
  let spans = weights.map(w => Math.max(1, Math.floor(total * w / wsum)));
  let used = spans.reduce((a, b) => a + b, 0);
  while (used > total) {
    const mi = spans.indexOf(Math.max(...spans));
    if (spans[mi] <= 1) break;
    spans[mi] -= 1; used -= 1;
  }
  while (used < total) { spans[spans.indexOf(Math.min(...spans))] += 1; used += 1; }
  let col = 1;
  const placements = locs.map((l, i) => {
    const p = { location: l.id, col, row: 1, colSpan: spans[i], rowSpan: 1 };
    col += spans[i];
    return p;
  });
  return { cols: total, rows: 1, placements };
}
function recalibrateSceneLayout() {
  const s = state.scene;
  if (!s || !(s.locations || []).length) { toast('No scene locations to recalibrate.'); return; }
  const layout = occupancyLayoutPlacements(s, 10);
  if (!layout) return;
  s.layout = layout;
  saveSceneDebounced();
  renderBoard();
  toast('Player Display layout recalibrated to token occupancy.');
}

/* ---------------- Activity Log ---------------- */

const SKIP_TURN_ACTIONS = new Set([
  'End of Round', 'Tracker Advanced', 'Challenge Progress',
  'Damage', 'Save', 'Defeated', 'Degraded', 'Roll',
]);

function ensureRoundState() {
  if (!state.scene) return;
  if (!state.scene.round || state.scene.round < 1) state.scene.round = 1;
}
function livingCombatants() {
  return (state.scene.tokens || []).filter(t =>
    !t.ko && (t.kind === 'hero' || t.kind === 'villain' || t.kind === 'minion' || t.kind === 'lieutenant'));
}
function assignTurnNumber(actor) {
  if (!state.scene || !actor || actor.ko) return null;
  if (!(actor.kind === 'hero' || actor.kind === 'villain' || actor.kind === 'minion' || actor.kind === 'lieutenant')) return null;
  ensureRoundState();
  if (!state.turnMarks) state.turnMarks = {};
  if (state.turnMarks[actor.id]) return state.turnMarks[actor.id];
  const taken = Object.values(state.turnMarks).map(Number);
  const next = (taken.length ? Math.max(0, ...taken) : 0) + 1;
  state.turnMarks[actor.id] = next;
  return next;
}
function maybeEndRound() {
  const need = livingCombatants();
  const marks = state.turnMarks || {};
  if (!need.length || !need.every(t => marks[t.id])) return;
  const n = state.scene.round || 1;
  state.turnMarks = {};
  (state.scene.tokens || []).forEach(t => { delete t.turnNumber; });
  state.scene.round = n + 1;
  logActivity(null, 'End of Round', null, `Round ${n} ended`, { roundEnded: n, countsAsTurn: false });
}

function logActivity(actor, action, target, result, details) {
  if (!state.scene) return;
  if (!state.scene.activityLog) state.scene.activityLog = [];
  ensureRoundState();
  const det = details || {};
  const countTurn = det.countsAsTurn !== false
    && actor
    && !SKIP_TURN_ACTIONS.has(action || '');
  state.scene.activityLog.push({
    id: uid('log'),
    timestamp: Date.now() / 1000,
    round: state.scene.round || 1,
    actor: actor || null,
    action: action || '',
    target: target || null,
    result: result || '',
    details: det,
  });
  if (countTurn) {
    const tok = findTok(actor.id) || actor;
    det.turnNumber = assignTurnNumber(tok);
    maybeEndRound();
  }
  saveSceneDebounced();
  renderActivityLog();
  if (countTurn) renderTokens();
}

function renderActivityLog() {
  const el = document.getElementById('activityLogPanel');
  if (!el) return;
  const log = (state.scene && state.scene.activityLog) || [];
  const rnd = state.scene && state.scene.round ? state.scene.round : 1;
  if (!log.length) { el.innerHTML = `<h3 class="sidebar-heading">Activity Log</h3><button type="button" class="btn btn-small btn-ghost" onclick="clearActivityLog()">Clear Activity Log</button><p class="empty-hint">Round ${rnd}. Nothing has happened yet.</p>`; return; }
  const recent = log.slice(-200).slice().reverse();
  let html = `<h3 class="sidebar-heading">Activity Log</h3><button type="button" class="btn btn-small btn-ghost" onclick="clearActivityLog()">Clear Activity Log</button><p class="empty-hint">Round ${rnd}</p><div class="activity-log-list">`;
  recent.forEach((e, i) => {
    const who = e.actor ? escHtml(e.actor.name) : '';
    const whom = e.target ? ' → ' + escHtml(e.target.name) : '';
    let diceStr = '';
    if (e.details && (e.details.min != null || e.details.mid != null || e.details.max != null)) {
      diceStr = ` <span class="activity-log-dice">(min ${e.details.min}, mid ${e.details.mid}, max ${e.details.max})</span>`;
    }
    const eid = e.id != null ? String(e.id) : String(i);
    const roundCls = e.action === 'End of Round' ? ' activity-log-round' : (e.action === 'Move' ? ' activity-log-move' : '');
    const turn = e.details && e.details.turnNumber ? ` <span class="activity-log-dice">#${e.details.turnNumber}</span>` : '';
    html += `<div class="activity-log-entry${roundCls}"><span class="activity-log-action">${escHtml(e.action)}</span>: ${who}${whom}${turn} — ${escHtml(e.result)}${diceStr}
      <button type="button" class="btn btn-small btn-ghost" title="Delete" onclick="deleteActivityLog('${escAttr(eid)}')">✕</button></div>`;
  });
  html += '</div>';
  el.innerHTML = html;
}
function deleteActivityLog(id) {
  if (!state.scene || !state.scene.activityLog) return;
  if (!confirm('Delete this activity log entry? This cannot be undone.')) return;
  const want = String(id);
  state.scene.activityLog = state.scene.activityLog.filter((e, i) => String(e.id != null ? e.id : i) !== want);
  saveSceneDebounced();
  renderActivityLog();
}
function clearActivityLog() {
  if (!state.scene) return;
  if (!confirm('Clear the entire Activity Log and all turn marker numbers? This cannot be undone.')) return;
  state.scene.activityLog = [];
  state.turnMarks = {};
  saveSceneDebounced();
  renderActivityLog();
  renderTokens();
}

/* ---------------- Scene Editor rendering ---------------- */

function renderSceneEditor() {
  const s = state.scene;
  const el = document.getElementById('sceneEditorView');
  el.innerHTML = `
    <div class="scene-editor-header">
      <button class="btn btn-ghost" onclick="backToScenesList()">&larr; Back to Issues &amp; Scenes</button>
      <span id="sceneSaveStatus" class="save-status"></span>
    </div>

    <label class="field-label">Scene Name</label>
    <input type="text" class="scene-name-input" value="${escAttr(s.name)}" onchange="updateSceneField('name', this.value)">

    <label class="field-label">Scene Type</label>
    <select class="scene-difficulty-select" onchange="updateSceneField('sceneType', this.value)">
      ${['Action','Social','Montage'].map(d => `<option value="${d}" ${(s.sceneType||'Action') === d ? 'selected' : ''}>${d}</option>`).join('')}
    </select>
    <p class="empty-hint">Action is the default fight. Social / Montage can be switched mid-scene from the Board if a fight breaks out.</p>

    <label class="field-label">Difficulty</label>
    <select class="scene-difficulty-select" onchange="updateSceneField('difficulty', this.value)">
      ${['Easy','Moderate','Difficult'].map(d => `<option value="${d}" ${s.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}
    </select>
    <table class="difficulty-ref-table">
      <thead><tr><th>Tier</th><th>Challenges</th><th>Minions</th><th>Lieutenants</th><th>Villains</th><th>Environment</th></tr></thead>
      <tbody>${DIFFICULTY_TABLE.map(r => `<tr class="${r.tier.toLowerCase() === s.difficulty.toLowerCase() ? 'diff-row-active' : ''}">
        <td>${r.tier}</td><td>${r.challenges}</td><td>${r.minions}</td><td>${r.lieutenants}</td><td>${r.villains}</td><td>${r.environment}</td>
      </tr>`).join('')}</tbody>
    </table>

    <label class="field-label">Scene Tracker</label>
    <div class="tracker-preset-row">
      ${Object.entries(TRACKER_PRESETS).map(([key, p]) => `<button class="btn btn-small btn-ghost" onclick="applyTrackerPreset('${key}')">${p.label} (${p.stars.length})</button>`).join('')}
    </div>
    <div id="trackerEditorRow" class="tracker-row"></div>

    <label class="field-label">Scene Background <span class="gm-only-badge" style="background:var(--accent);">Player Display full backdrop</span></label>
    <div class="location-edit-row">
      <input type="file" accept="image/*" onchange="uploadSceneBackground(this.files[0])">
      ${s.background ? `<img class="bg-thumb" src="${backgroundUrl(s.background)}">
        <button class="btn btn-small btn-ghost" type="button" onclick="removeSceneBackground()">Remove BG</button>` : '<span class="bg-thumb-empty">No scene background</span>'}
    </div>

    <label class="field-label">Locations</label>
    <div id="locationsEditorList"></div>
    <button class="btn btn-small btn-accent" onclick="addLocation()">+ Add Location</button>
    <div style="margin-top:8px;">
      <a class="btn btn-small btn-ghost" href="/scene-layout-builder.html?scene=${escAttr(state.editingSlug || s.__slug || '')}" target="_blank">Edit Display Layout ↗</a>
      <button type="button" class="btn btn-small btn-ghost" onclick="recalibrateSceneLayout()" title="Re-fit the Player Display location boxes to current token occupancy">Recalibrate Layout</button>
      <p class="empty-hint">Display Layout arranges the locations on the Player Display TV. No layout = default stacked view.</p>
    </div>

    <label class="field-label">Challenges</label>
    <p class="empty-hint">Scene-only. Add here, then Load to Board to mark successes live.</p>
    <div id="challengesEditorList"></div>
    <button type="button" class="btn btn-small btn-accent" onclick="addChallenge()">+ Add Challenge</button>

    <label class="field-label">Environment <span class="gm-only-badge" style="background:var(--accent);">One per Scene — its Twists move the Scene Tracker</span></label>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
    <select class="scene-difficulty-select" onchange="updateSceneEnvironment(this.value)">
      <option value="">None</option>
      ${state.environments.map(e => `<option value="${e.Slug}" ${s.environment === e.Slug ? 'selected' : ''}>${escHtml(e.Name)}</option>`).join('')}
    </select>
    <a class="btn btn-small btn-ghost" href="/environment-builder.html" target="_blank">Environment Builder ↗</a>
    </div>
    <div id="environmentEditorPanel"></div>

    <label class="field-label">GM Notes <span class="gm-only-badge">GM ONLY — never shown on Player Display</span></label>
    <textarea class="gm-notes-textarea" onchange="updateSceneField('gmNotes', this.value)">${escHtml(s.gmNotes)}</textarea>

    <div class="editor-footer-actions">
      <button type="button" class="btn btn-accent" onclick="loadSceneToBoard('${escAttr(state.editingSlug || s.__slug || '')}')">Load to Board</button>
      <button type="button" class="btn btn-danger" onclick="deleteSceneFromEditor()">Delete Scene</button>
    </div>
  `;
  renderTrackerEditor();
  renderLocationsEditor();
  renderEnvironmentEditorPanel();
  renderChallengesEditor();
}

function renderEnvironmentEditorPanel() {
  const el = document.getElementById('environmentEditorPanel');
  const slug = state.scene.environment;
  if (!slug) { el.innerHTML = ''; return; }
  const env = state.environments.find(e => e.Slug === slug);
  if (!env) { el.innerHTML = '<p class="empty-hint">Selected environment not found in Library.</p>'; return; }
  el.innerHTML = `
    <div class="environment-panel">
      <div class="die-row">
        ${[1,2,3].filter(i => env['Trait' + i]).map(i => `
          <span class="env-trait">${escHtml(env['Trait' + i])}
            ${env['TraitDie' + i] ? `<button class="die-badge ${env['TraitDie' + i]}" onclick="rollLabeledDie('${env['TraitDie' + i]}','${escAttr(env['Trait' + i])}')">${env['TraitDie' + i]}</button>` : ''}
          </span>`).join('')}
      </div>
      <button class="btn btn-small btn-ghost" onclick="openNotes('environments','${env.Slug}','${escAttr(env.Name)}')">View / Edit Twists</button>
      ${(() => {
        const locs = (state.locations || []).filter(l => l.EnvironmentSlug === env.Slug);
        return locs.length
          ? `<div class="empty-hint" style="margin-top:8px;">Locations for this environment: ${locs.map(l => escHtml(l.Name)).join(', ')}</div>`
          : '<div class="empty-hint" style="margin-top:8px;">No Locations linked to this environment yet — set Environment on a Location in the Library.</div>';
      })()}
    </div>`;
}

async function updateSceneEnvironment(slug) {
  state.scene.environment = slug || null;
  saveSceneDebounced();
  renderEnvironmentEditorPanel();
}

function updateSceneField(field, value) {
  state.scene[field] = value;
  saveSceneDebounced();
  if (field === 'difficulty') { renderSceneEditor(); if (document.getElementById('boardContent') && !document.getElementById('boardContent').classList.contains('hidden')) refreshSpawnOptions(); }
  if (field === 'sceneType' && document.getElementById('boardSceneType')) document.getElementById('boardSceneType').value = value;
}

/* ---- Scene Tracker editor (also reused, read-only, on Board/Display) ---- */

function renderTrackerEditor() {
  const t = state.scene.tracker;
  document.getElementById('trackerEditorRow').innerHTML = trackerStarsHtml(t, true);
}
function trackerStarsHtml(tracker, editable) {
  let html = '<div class="tracker-stars">';
  tracker.stars.forEach((color, i) => {
    const isMarker = i === tracker.position;
    const clickAttr = editable ? ` onclick="setTrackerPosition(${i})"` : '';
    html += `<div class="tracker-star ${color} ${isMarker ? 'tracker-marker' : ''}"${clickAttr} title="Space ${i + 1}: ${color}">★</div>`;
  });
  return html + '</div>';
}
function applyTrackerPreset(key) {
  state.scene.tracker = { stars: [...TRACKER_PRESETS[key].stars], position: 0 };
  saveSceneDebounced();
  renderTrackerEditor();
}
function addTrackerStar(color) {
  state.scene.tracker.stars.push(color);
  saveSceneDebounced();
  renderTrackerEditor();
}
function removeLastTrackerStar() {
  if (state.scene.tracker.stars.length <= 1) return;
  state.scene.tracker.stars.pop();
  state.scene.tracker.position = Math.min(state.scene.tracker.position, state.scene.tracker.stars.length - 1);
  saveSceneDebounced();
  renderTrackerEditor();
}
function setTrackerPosition(i) {
  state.scene.tracker.position = i;
  saveSceneDebounced();
  renderTrackerEditor();
  if (document.getElementById('boardTrackerRow')) renderBoardTracker();
}
function advanceTracker(delta) {
  const t = state.scene.tracker;
  t.position = Math.max(0, Math.min(t.stars.length - 1, t.position + delta));
  saveSceneDebounced();
  renderBoardTracker();
  logActivity(null, 'Tracker Advanced', null, `Scene Tracker moved to space ${t.position + 1} (${t.stars[t.position]})`, { position: t.position, delta });
}
function advanceTrackerToZone(zoneStart) {
  const t = state.scene.tracker;
  const curColor = t.stars[t.position];
  let i = t.position;
  while (i < t.stars.length && t.stars[i] === curColor) i++;
  if (i >= t.stars.length) { t.position = t.stars.length - 1; saveSceneDebounced(); renderBoardTracker(); return; }
  const nextColor = t.stars[i];
  if (zoneStart) {
    t.position = i;
  } else {
    let j = i;
    while (j < t.stars.length && t.stars[j] === nextColor) j++;
    t.position = j - 1;
  }
  saveSceneDebounced();
  renderBoardTracker();
}

/* ---- Locations editor ---- */

function renderLocationsEditor() {
  const el = document.getElementById('locationsEditorList');
  const used = new Set((state.scene.locations || []).map(l => l.locationSlug).filter(Boolean));
  const catalog = (state.locations || []).filter(l => l.Name && !used.has(l.Slug));
  const envSlug = state.scene.environment || '';
  el.innerHTML = `
    <div class="location-edit-row">
      <select id="locCatalogPick">
        <option value="">Add from Location list…</option>
        ${catalog.map(l => `<option value="${escAttr(l.Slug)}">${escHtml(l.Name)}${l.EnvironmentSlug ? ' (' + escHtml((state.environments.find(e=>e.Slug===l.EnvironmentSlug)||{}).Name || l.EnvironmentSlug) + ')' : ''}</option>`).join('')}
      </select>
      <button class="btn btn-small btn-accent" type="button" onclick="addLocationFromCatalog()">Add</button>
    </div>` + state.scene.locations.map((loc, idx) => `
    <div class="location-edit-row">
      <input type="text" value="${escAttr(loc.name)}" onchange="updateLocationField(${idx}, 'name', this.value)">
      <select onchange="updateLocationField(${idx}, 'locationSlug', this.value)">
        <option value="">custom</option>
        ${(state.locations||[]).map(l => `<option value="${escAttr(l.Slug)}" ${loc.locationSlug===l.Slug?'selected':''}>${escHtml(l.Name)}</option>`).join('')}
      </select>
      <button class="btn btn-small btn-ghost" type="button" onclick="saveLocationToLibrary(${idx})" title="Save this location to the Location Library (locations.csv) so it can be reused on Environments and other scenes">Save to Library</button>
      <button class="btn btn-small btn-danger" onclick="removeLocation(${idx})">Delete</button>
    </div>`).join('');
}
function addLocationFromCatalog() {
  const sel = document.getElementById('locCatalogPick');
  const slug = sel && sel.value;
  const row = (state.locations || []).find(l => l.Slug === slug);
  if (!row) return;
  state.scene.locations.push({ id: uid('loc'), name: row.Name, locationSlug: row.Slug });
  saveSceneDebounced();
  renderLocationsEditor();
}
/* Save a scene's location into the Location Library (locations.csv) so custom
   locations persist beyond this scene and can be linked to Environments,
   reused on other scenes, and picked in the Environment Builder. */
function saveLocationToLibrary(idx) {
  const loc = (state.scene.locations || [])[idx];
  if (!loc || !(loc.name || '').trim()) { toast('Name the location first, then save it.'); return; }
  const slug = loc.locationSlug || uniqueLibSlug('locations', slugify(loc.name), null);
  const existing = (state.locations || []).find(l => l.Slug === slug);
  if (existing) {
    existing.Name = loc.name;
  } else {
    // Default the library row's Environment to the scene's environment — the
    // Environment Builder links locations via EnvironmentSlug.
    state.locations.push({ Slug: slug, Name: loc.name, EnvironmentSlug: state.scene.environment || '', Active: 'true' });
  }
  loc.locationSlug = slug;
  saveLibraryDebounced('locations');
  saveSceneDebounced();
  renderLocationsEditor();
  toast('Saved "' + loc.name + '" to the Location Library.');
}
function updateLocationField(idx, field, value) {
  state.scene.locations[idx][field] = value;
  if (field === 'locationSlug') {
    const row = (state.locations || []).find(l => l.Slug === value);
    if (row && row.Name) state.scene.locations[idx].name = row.Name;
  }
  saveSceneDebounced();
  if (field === 'locationSlug') renderLocationsEditor();
}
function addLocation() {
  state.scene.locations.push({ id: uid('loc'), name: 'New Location', locationSlug: '' });
  saveSceneDebounced();
  renderLocationsEditor();
}
function removeLocation(idx) {
  if (!confirm('Delete this Location? Any tokens placed there will need to be reassigned.')) return;
  const loc = state.scene.locations[idx];
  state.scene.tokens.forEach(t => { if (t.locationId === loc.id) t.locationId = null; });
  state.scene.locations.splice(idx, 1);
  saveSceneDebounced();
  renderLocationsEditor();
}
async function uploadSceneBackground(file) {
  if (!file || !state.scene) return;
  const key = (state.editingSlug || state.activeSlug || 'scene') + '-bg';
  await apiUploadBackground(key, file);
  state.scene.background = key;
  saveSceneDebounced();
  renderSceneEditor();
}
async function removeSceneBackground() {
  if (!state.scene) return;
  if (state.scene.background) await apiDeleteBackground(state.scene.background);
  state.scene.background = null;
  saveSceneDebounced();
  renderSceneEditor();
}

/* ---- Challenges editor ---- */

function blankChallenge() {
  return {
    id: uid('chal'), title: 'New Challenge', type: 'Simple',
    paths: [{ label: 'Path 1', successesNeeded: 3, successesMarked: 0, hidden: false, failed: false }],
    timerMode: 'turns', timerTurnsRemaining: 2, timerTriggerZone: 'red', consequence: '',
    doomsdaySpeed: '1', outcome: '', impactScale: '',
    solution: '', hidden: true,
  };
}

function renderChallengesEditor() {
  const el = document.getElementById('challengesEditorList');
  if (!el || !state.scene) return;
  ensureSceneChallenges(state.scene);
  el.innerHTML = state.scene.challenges.map((c, idx) => renderChallengeEditRow(c, idx)).join('') || '<p class="empty-hint">No challenges yet.</p>';
}

function renderChallengeEditRow(c, idx) {
  let extra = '';
  if (c.type === 'Timed') {
    extra = `
      <div class="challenge-extra">
        <label>Timer type
          <select onchange="updateChallengeField(${idx},'timerMode',this.value)">
            <option value="turns" ${c.timerMode==='turns'?'selected':''}>Turn count</option>
            <option value="zone" ${c.timerMode==='zone'?'selected':''}>Triggers when tracker reaches a zone</option>
            <option value="doomsday" ${c.timerMode==='doomsday'?'selected':''}>Catastrophic — see Doomsday Device</option>
          </select>
        </label>
        ${c.timerMode === 'turns' ? `<label>Turns remaining
          <span class="counter-row">
            <button class="btn btn-small btn-ghost" onclick="bumpChallengeField(${idx},'timerTurnsRemaining',-1)">-1</button>
            <span class="counter-value">${c.timerTurnsRemaining}</span>
            <button class="btn btn-small btn-ghost" onclick="bumpChallengeField(${idx},'timerTurnsRemaining',1)">+1</button>
          </span></label>` : ''}
        ${c.timerMode === 'zone' ? `<label>Triggers at zone
          <select onchange="updateChallengeField(${idx},'timerTriggerZone',this.value)">
            <option value="yellow" ${c.timerTriggerZone==='yellow'?'selected':''}>Yellow</option>
            <option value="red" ${c.timerTriggerZone==='red'?'selected':''}>Red</option>
          </select></label>` : ''}
        <label>Consequence if timer expires
          <input type="text" value="${escAttr(c.consequence)}" onchange="updateChallengeField(${idx},'consequence',this.value)">
        </label>
      </div>`;
  } else if (c.type === 'Doomsday Device') {
    extra = `
      <div class="challenge-extra">
        <label>Speed per device turn
          <select onchange="updateChallengeField(${idx},'doomsdaySpeed',this.value)">
            ${DOOMSDAY_SPEEDS.map(o => `<option value="${o.value}" ${c.doomsdaySpeed===o.value?'selected':''}>${o.label}</option>`).join('')}
          </select>
        </label>
        <label>Impact scale <input type="text" placeholder="e.g. citywide, stellar" value="${escAttr(c.impactScale)}" onchange="updateChallengeField(${idx},'impactScale',this.value)"></label>
        <label>Catastrophic outcome if triggered <textarea onchange="updateChallengeField(${idx},'outcome',this.value)">${escHtml(c.outcome)}</textarea></label>
        <button class="btn btn-small btn-danger" onclick="advanceDoomsdayTurn(${idx})">Advance Device Turn (moves Scene Tracker)</button>
      </div>`;
  }

  return `
    <div class="challenge-edit-card">
      <div class="challenge-edit-top">
        <input type="text" class="challenge-title-input" value="${escAttr(c.title)}" onchange="updateChallengeField(${idx},'title',this.value)">
        <select onchange="updateChallengeField(${idx},'type',this.value)">
          ${CHALLENGE_TYPES.map(t => `<option value="${t}" ${c.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <button class="btn btn-small btn-danger" onclick="removeChallenge(${idx})">Delete</button>
      </div>
      <div class="challenge-paths">
        ${c.paths.map((p, pi) => `
          <div class="challenge-path-row">
            <input type="text" value="${escAttr(p.label)}" onchange="updatePathField(${idx},${pi},'label',this.value)">
            <label class="empty-hint" style="display:flex;align-items:center;gap:6px;white-space:nowrap;">Boxes
              <input type="number" min="1" max="5" step="1" class="needed-input" value="${Math.min(5, Math.max(1, Number(p.successesNeeded)||1))}" onchange="updatePathField(${idx},${pi},'successesNeeded',Math.min(5, Math.max(1, parseInt(this.value,10)||1)))">
            </label>
            <label class="hidden-toggle" style="margin:0;white-space:nowrap;"><input type="checkbox" ${p.hidden ? 'checked' : ''} onchange="updatePathField(${idx},${pi},'hidden',this.checked)"> Hide from Player Display</label>
            <button class="btn btn-small btn-ghost" onclick="removePath(${idx},${pi})">✕</button>
          </div>`).join('')}
        <button class="btn btn-small btn-ghost" onclick="addPath(${idx})">+ Path</button>
      </div>
      ${extra}
      <label class="field-label">Solution <span class="gm-only-badge">${c.hidden ? 'HIDDEN from Player Display' : 'REVEALED to players'}</span></label>
      <textarea onchange="updateChallengeField(${idx},'solution',this.value)">${escHtml(c.solution)}</textarea>
      <label class="hidden-toggle"><input type="checkbox" ${c.hidden ? 'checked' : ''} onchange="updateChallengeField(${idx},'hidden',this.checked)"> Hide solution from Player Display</label>
    </div>`;
}

function updateChallengeField(idx, field, value) {
  state.scene.challenges[idx][field] = value;
  saveSceneDebounced();
  renderChallengesEditor();
}
function bumpChallengeField(idx, field, delta) {
  state.scene.challenges[idx][field] = Math.max(0, (Number(state.scene.challenges[idx][field]) || 0) + delta);
  saveSceneDebounced();
  renderChallengesEditor();
}
function updatePathField(idx, pi, field, value) {
  state.scene.challenges[idx].paths[pi][field] = value;
  saveSceneDebounced();
  renderChallengesEditor();
}
function bumpPathField(idx, pi, field, delta) {
  const p = state.scene.challenges[idx].paths[pi];
  p[field] = Math.max(0, (Number(p[field]) || 0) + delta);
  saveSceneDebounced();
  renderChallengesEditor();
}
function addPath(idx) {
  state.scene.challenges[idx].paths.push({ label: 'New Path', successesNeeded: 3, successesMarked: 0, hidden: false, failed: false });
  saveSceneDebounced();
  renderChallengesEditor();
}
function removePath(idx, pi) {
  state.scene.challenges[idx].paths.splice(pi, 1);
  saveSceneDebounced();
  renderChallengesEditor();
}
function addChallenge() {
  if (!state.scene) { toast('Open a scene in Library → Issues & Scenes first.'); return; }
  ensureSceneChallenges(state.scene);
  state.scene.challenges.push(blankChallenge());
  saveSceneDebounced();
  renderChallengesEditor();
  const list = document.getElementById('challengesEditorList');
  if (list) list.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function removeChallenge(idx) {
  if (!confirm('Delete this challenge?')) return;
  state.scene.challenges.splice(idx, 1);
  saveSceneDebounced();
  renderChallengesEditor();
}
function advanceDoomsdayTurn(idx) {
  const c = state.scene.challenges[idx];
  const speed = c.doomsdaySpeed;
  if (speed === '1') advanceTracker(1);
  else if (speed === '2') advanceTracker(2);
  else if (speed === 'zone-start') advanceTrackerToZone(true);
  else if (speed === 'zone-end') advanceTrackerToZone(false);
  toast(`${c.title}: device turn advanced the Scene Tracker.`);
  logActivity(null, 'Tracker Advanced', null, `${c.title}: Doomsday device turn advanced the Scene Tracker`, { challenge: c.title, speed });
}

/* ============================================================
   Board: Locations, tokens, live tracker + challenges panel
   ============================================================ */

async function renderBoard() {
  const boardEmpty = document.getElementById('boardEmptyState');
  const boardContent = document.getElementById('boardContent');
  if (!state.scene) {
    boardEmpty.classList.remove('hidden');
    boardContent.classList.add('hidden');
    await renderEmptyBoardWithIssues();
    return;
  }
  boardEmpty.classList.add('hidden');
  boardContent.classList.remove('hidden');
  document.getElementById('boardSceneName').textContent = state.scene.name;
  document.getElementById('boardSceneDifficulty').textContent = state.scene.difficulty;
  const typeEl = document.getElementById('boardSceneType');
  if (typeEl) typeEl.value = state.scene.sceneType || 'Action';
  updateNextSceneBtn();
  renderBoardTracker();
  renderBoardEnvironment();
  renderLocationsBoard();
  renderChallengesPanel();
  renderActivityLog();
  renderTwistMatrixPanel();
  fetchHeroPoints().then(renderTokens);
  renderSceneNotesPanel();
  loadSceneRoster().then(() => refreshSpawnOptions());
}

/* ---------------- Twist Decision Matrix (sidebar quick reference) ---------------- */

function renderTwistMatrixPanel() {
  const panel = document.getElementById('twistMatrixPanel');
  if (!panel) return;
  panel.innerHTML = `
    <table class="twist-matrix">
      <thead><tr><th>Overcome roll</th><th>GM picks</th><th>Ask</th></tr></thead>
      <tbody>
        <tr><td><b>1–3</b></td><td>Player chooses: <b>fail</b> <i>or</i> <b>succeed with a Major Twist</b></td><td>Hero's Principle <b>Major</b> question</td></tr>
        <tr><td><b>4–7</b></td><td><b>Succeed with a Minor Twist</b></td><td>Hero's Principle <b>Minor</b> question</td></tr>
        <tr><td><b>8–11</b></td><td>Success — no twist</td><td>—</td></tr>
        <tr><td><b>12+</b></td><td><b>Succeeds beyond expectations</b> — bonus side effect; may remove a prior minor twist, or ≈ +2 bonus / heal Min die. No twist.</td><td>—</td></tr>
      </tbody>
    </table>
    <div class="twist-matrix-notes">
      <p><b>Twist source, in order:</b> ① acting hero's own Principle question (see ▸ on their token) · ② this scene Environment's twist for the current tracker color · ③ generic Twist Library.</p>
      <p><b>Hero Points:</b> whenever ANY hero uses a Principle in an Overcome — success or not — <b>every hero earns 1 HP</b> (max 5/Issue). Meaningful social scene: all heroes +1 HP, once per scene. Convert to exclusive bonuses at Issue end.</p>
      <p><b>Villains/minions:</b> villains never take Major Twists (they fail instead); a minion succeeding with a minor twist knocks itself out; a Lieutenant steps down (house rule: minion save = outright defeat).</p>
      <p><b>Twist effects, by severity</b> (Bullpen "Creating Twists" — pick the dice from the hero's own roll): Hinder one hero — Minor: Max die (or persistent-exclusive Min die) · Major: persistent-exclusive Max+Min, or Max die on all heroes in the hero's location. Damage — Minor: Mid die one hero (or Min die all heroes same location) · Major: Max+Min one hero, Mid die all heroes in location, or Mid die everyone in the scene. Boost enemies — Minor: Max die (or persistent-exclusive Min) · Major: persistent-exclusive Max+Min, or Max to all villains/minions. Defend enemies — Minor: Max die one nearby enemy · Major: Mid+Max one, or Max all nearby. Add threats: about Min die worth of minions (Minor), Mid die worth (Major). May also: create a challenge, advance the scene tracker, or drop a story complication / "Meanwhile…" for later — twists never undo the success itself.</p>
    </div>`;
}

async function renderSceneNotesPanel() {
  const panel = document.getElementById('sceneNotesPanel');
  if (!panel) return;
  panel.innerHTML = '<p class="empty-hint">Loading scene notes...</p>';

  const slug = state.activeSlug || (state.scene && state.scene.__slug);
  if (!slug) {
    panel.innerHTML = '<p class="empty-hint">Load a scene to see its notes.</p>';
    return;
  }

  try {
    // Server resolves the scene's notes folder from the slug — the folder is
    // named after the scene's display name (campaign/scenes/<Name>/*.md).
    const res = await fetch('/api/scene-notes/' + encodeURIComponent(slug));
    if (!res.ok) {
      panel.innerHTML = '<p class="empty-hint">No notes found for this scene.</p>';
      return;
    }
    const data = await res.json();
    const entries = Object.entries(data.notes || {});
    if (!entries.length) {
      panel.innerHTML = `<p class="empty-hint">No notes yet for ${escHtml(data.name || 'this scene')}.</p>`;
      return;
    }
    let html = '';
    for (const [filename, content] of entries) {
      const title = filename === 'notes.md' ? 'Notes' : filename.replace(/\.md$/, '');
      html += `<details style="margin-bottom:16px;" open>
        <summary style="font-family:var(--font-display);font-size:17px;cursor:pointer;padding:4px 0;color:var(--accent);">${escHtml(title)}</summary>
        <div style="padding:8px 12px;background:var(--ink);border:1px solid #333;border-radius:4px;margin-top:6px;">${renderMarkdownLite(content || '')}</div>
      </details>`;
    }
    panel.innerHTML = html;
  } catch (e) {
    panel.innerHTML = '<p class="empty-hint">Error loading notes (server may need the /api/scene-notes endpoint).</p>';
    console.error(e);
  }
}

function toggleCollapsible(el) {
  const parent = el.closest('.challenges-sidebar');
  if (!parent) return;
  // With multiple collapsible panels in one sidebar, toggle the content
  // immediately after THIS heading — not the first panel in the container.
  const content = el.nextElementSibling && el.nextElementSibling.classList.contains('collapsible-content')
    ? el.nextElementSibling
    : parent.querySelector('#challengesPanel, #activityLogContent, #sceneNotesPanel, .collapsible-content');
  if (!content) return;
  const isHidden = content.style.display === 'none';
  content.style.display = isHidden ? 'block' : 'none';
  const indicator = el.querySelector('span, button');
  if (indicator) indicator.textContent = isHidden ? '−' : '+';
}

async function renderEmptyBoardWithIssues() {
  const msg = document.getElementById('emptyBoardMessage');
  const listContainer = document.getElementById('activeIssuesList');
  const content = document.getElementById('issuesListContent');

  try {
    const issues = await apiListIssues();
    const active = issues.filter(i => i.active !== false);

    if (active.length === 0) {
      msg.textContent = 'No scene loaded. Go to Library → Issues & Scenes, open a scene, and click "Load to Board".';
      listContainer.classList.add('hidden');
      return;
    }

    msg.textContent = 'No scene loaded. Click a scene below to load it:';
    listContainer.classList.remove('hidden');
    let html = '';

    for (const issue of active) {
      const fullIssue = await apiGetIssue(issue.slug);
      const scenes = fullIssue && fullIssue.sceneSlugs ? fullIssue.sceneSlugs : [];
      html += `<div style="margin-bottom:18px;border-bottom:1px solid #333;padding-bottom:12px;">`;
      html += `<div style="font-family:var(--font-display);font-size:18px;color:var(--accent);margin-bottom:6px;">${escHtml(issue.name || issue.slug)}</div>`;

      if (scenes.length === 0) {
        html += `<div class="empty-hint" style="font-size:13px;">No scenes yet.</div>`;
      } else {
        for (const scSlug of scenes) {
          const sceneName = scSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          html += `<div onclick="loadSceneBySlug('${escAttr(scSlug)}');" style="cursor:pointer;padding:6px 10px;background:var(--ink-2);margin:4px 0;border-radius:4px;font-size:14px;">${escHtml(sceneName)}</div>`;
        }
      }
      html += `</div>`;
    }
    content.innerHTML = html;
  } catch (e) {
    console.error(e);
    listContainer.classList.add('hidden');
    msg.textContent = 'No scene loaded. Go to Library → Issues & Scenes.';
  }
}

window.loadSceneBySlug = async function(slug) {
  try {
    const sceneData = await apiGetScene(slug);
    if (sceneData) {
      await apiSetActiveScene(slug);
      state.scene = sceneData;
      renderBoard();
      toast(`Loaded scene: ${sceneData.name}`);
    }
  } catch (e) {
    toast('Could not load scene.');
  }
};

function renderBoardEnvironment() {
  const el = document.getElementById('boardEnvironment');
  if (!el) return;
  const slug = state.scene.environment;
  if (!slug) { el.innerHTML = ''; return; }
  const env = state.environments.find(e => e.Slug === slug);
  if (!env) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <span class="env-name">${escHtml(env.Name)}</span>
    ${[1,2,3].filter(i => env['Trait' + i]).map(i => `
      <span class="env-trait">${escHtml(env['Trait' + i])}
        ${env['TraitDie' + i] ? `<button class="die-badge ${env['TraitDie' + i]}" onclick="rollLabeledDie('${env['TraitDie' + i]}','${escAttr(env['Trait' + i])}')">${env['TraitDie' + i]}</button>` : ''}
      </span>`).join('')}
    <button class="btn btn-small btn-ghost" onclick="openNotes('environments','${env.Slug}','${escAttr(env.Name)}')">View Twists</button>`;
}

function renderBoardTracker() {
  const row = document.getElementById('boardTrackerRow');
  if (!row || !state.scene) return;
  row.innerHTML = trackerStarsHtml(state.scene.tracker, true);
}

function locKey(id){ return id || 'none'; }
function bindLocationDrops(root) {
  root.querySelectorAll('.location-drop').forEach(el => {
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const locId = el.dataset.loc || null;
      moveToken(e.dataTransfer.getData('text/plain'), locId);
    });
  });
}
function renderLocationsBoard() {
  const row = document.getElementById('locationsRow');
  const locs = state.scene.locations || [];
  const blocks = locs.map(loc => `
    <section class="location-block">
      <div class="location-drop location-header" data-loc="${loc.id}">
        <input type="text" class="location-name-input" value="${escAttr(loc.name)}" onchange="renameLocationOnBoard('${loc.id}', this.value)">
        <span class="location-drop-hint">Drop tokens here</span>
      </div>
      <div class="mvc-stage mvc-stage-3">
        <div class="mvc-side heroes">
          <div class="mvc-side-label">HEROES</div>
          <div class="mvc-row" id="mvcHeroes-${locKey(loc.id)}"></div>
        </div>
        <div class="mvc-side neutral">
          <div class="mvc-side-label">NEUTRAL</div>
          <div class="mvc-row" id="mvcNeutral-${locKey(loc.id)}"></div>
        </div>
        <div class="mvc-side villains">
          <div class="mvc-side-label">VILLAINS</div>
          <div class="mvc-row" id="mvcVillains-${locKey(loc.id)}"></div>
          <div class="mvc-row mvc-row-small" id="mvcExtras-${locKey(loc.id)}"></div>
        </div>
      </div>
    </section>`).join('');
  row.innerHTML = blocks + `
    <section class="location-block">
      <div class="location-drop location-header" data-loc="">
        <span class="location-name-display">Unplaced</span>
        <span class="location-drop-hint">Drop here to clear location</span>
      </div>
      <div class="mvc-stage mvc-stage-3">
        <div class="mvc-side heroes"><div class="mvc-row" id="mvcHeroes-none"></div></div>
        <div class="mvc-side neutral"><div class="mvc-row" id="mvcNeutral-none"></div></div>
        <div class="mvc-side villains">
          <div class="mvc-row" id="mvcVillains-none"></div>
          <div class="mvc-row mvc-row-small" id="mvcExtras-none"></div>
        </div>
      </div>
    </section>
    <div class="mvc-ko" id="mvcKo"></div>`;
  bindLocationDrops(row);
  refreshSpawnLocations();
  renderTokens();
}

function renameLocationOnBoard(locId, name) {
  const loc = state.scene.locations.find(l => l.id === locId);
  if (!loc) return;
  loc.name = name;
  saveSceneDebounced();
}

function locationNameById(locId) {
  if (!locId) return 'unplaced';
  const loc = (state.scene.locations || []).find(l => l.id === locId);
  return (loc && loc.name) ? loc.name : 'unknown';
}

function tokenMoveOptionsHtml(t) {
  const locs = (state.scene && state.scene.locations) || [];
  const current = t.locationId || '';
  return locs.map(l => `<option value="${escAttr(l.id)}" ${current === l.id ? 'selected' : ''}>${escHtml(l.name)}</option>`).join('')
    + `<option value="" ${current === '' ? 'selected' : ''}>Unplaced</option>`;
}

function moveToken(tokenId, locId) {
  const tok = state.scene.tokens.find(t => t.id === tokenId);
  if (!tok) return;
  const fromId = tok.locationId || '';
  const toId = locId || '';
  if (fromId === toId) return;
  const fromName = locationNameById(fromId);
  const toName = locationNameById(toId);
  tok.locationId = locId || null;
  logActivity(
    { id: tok.id, name: tok.name, kind: tok.kind },
    'Move',
    { name: toName },
    `${tok.name} moved from ${fromName} to ${toName}`,
    { from: fromName, to: toName, fromId, toId }
  );
  saveSceneDebounced();
  renderLocationsBoard();
}

// Touch/pen drag-and-drop, parallel to the native HTML5 drag API above.
// Skips pointerType 'mouse' entirely -- the native API already handles mice,
// and this path exists only because HTML5 drag-and-drop never fires on touch.
// Both paths converge on the same moveToken() call, so there's one source of truth.
function attachTouchDrag(card, tokenId) {
  let shadow = null;
  card.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const tok = findTok(tokenId);
    if (tok && tok.kind === 'hero' && heroCurrentMode(tok)?.immobile) { toast('Immobile in this mode'); return; }
    e.preventDefault();
    shadow = card.cloneNode(true);
    shadow.classList.add('token-drag-shadow');
    shadow.style.position = 'fixed';
    shadow.style.pointerEvents = 'none';
    shadow.style.zIndex = '1000';
    shadow.style.width = card.offsetWidth + 'px';
    shadow.style.left = (e.clientX - card.offsetWidth / 2) + 'px';
    shadow.style.top = (e.clientY - 20) + 'px';
    document.body.appendChild(shadow);
    card.classList.add('dragging');

    const onMove = (ev) => {
      if (!shadow) return;
      shadow.style.left = (ev.clientX - card.offsetWidth / 2) + 'px';
      shadow.style.top = (ev.clientY - 20) + 'px';
    };
    const onUp = (ev) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (shadow) { shadow.remove(); shadow = null; }
      card.classList.remove('dragging');
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      const locDrop = target && target.closest('.location-drop');
      if (locDrop) moveToken(tokenId, locDrop.dataset.loc);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  });
}

function renderTokens() {
  if (!state.scene) return;
  const locs = (state.scene.locations || []).map(l => l.id).concat(['']);
  locs.forEach(id => {
    const k = locKey(id);
    const heroes = document.getElementById('mvcHeroes-' + k);
    const neutrals = document.getElementById('mvcNeutral-' + k);
    const villains = document.getElementById('mvcVillains-' + k);
    const extras = document.getElementById('mvcExtras-' + k);
    if (!heroes) return;
    heroes.innerHTML = '';
    if (neutrals) neutrals.innerHTML = '';
    if (villains) villains.innerHTML = '';
    if (extras) extras.innerHTML = '';
    const here = state.scene.tokens.filter(t => !t.ko && (t.locationId || '') === (id || ''));
    // Side axis = Affiliation (Ally / Neutral / Enemy), not sheet kind.
    const allies = sortAllyTokens(here.filter(t => tokenAffiliation(t) === 'Ally'));
    const neutList = sortNeutralTokens(here.filter(t => tokenAffiliation(t) === 'Neutral'));
    const enemies = sortEnemyTokens(here.filter(t => tokenAffiliation(t) === 'Enemy'));
    allies.forEach(t => {
      const small = t.kind === 'minion' || t.kind === 'lieutenant';
      heroes.appendChild(renderToken(t, small));
    });
    neutList.forEach(t => {
      const small = t.kind === 'minion' || t.kind === 'lieutenant';
      if (neutrals) neutrals.appendChild(renderToken(t, small));
    });
    enemies.forEach(t => {
      const small = t.kind === 'minion' || t.kind === 'lieutenant';
      if (small) extras && extras.appendChild(renderToken(t, true));
      else villains && villains.appendChild(renderToken(t));
    });
  });
  const koEl = document.getElementById('mvcKo');
  const ko = state.scene.tokens.filter(t => t.ko);
  if (koEl) koEl.textContent = ko.length ? ('Out: ' + ko.map(t => t.name).join(', ')) : '';
}

/* ---------------- Hero Points (issue-scoped, earn-only, max 5 — SCRPG p.31) ---------------- */

function hpIssueSlug() {
  const sceneSlug = (state.scene && (state.scene.__slug || state.scene.slug)) || state.activeSlug;
  if (!sceneSlug) return null;
  const issue = parentIssueForScene(sceneSlug);
  return issue ? issue.slug : null;
}

function hpFor(heroSlug) {
  const issue = hpIssueSlug();
  if (!issue) return 0;
  return Number((state.heroPoints[issue] || {})[heroSlug]) || 0;
}

async function fetchHeroPoints() {
  try {
    const res = await fetch('/api/hero-points');
    if (res.ok) state.heroPoints = await res.json() || {};
  } catch (e) { console.error('hero points fetch failed', e); }
}

function renderHeroPointsHtml(t) {
  const count = hpFor(t.slug);
  const capped = count >= 5;
  const dots = [1, 2, 3, 4, 5].map(i =>
    `<span class="hp-dot${i <= count ? ' filled' : ''}${capped ? ' capped' : ''}" title="${i <= count ? 'Earned' : 'Empty'}">●</span>`).join('');
  return `<div class="hp-row" onclick="event.stopPropagation()" title="Hero Points — earned by using a Principle in an Overcome action or a meaningful social scene; max 5 per Issue (RAW p.31)">
      <span class="hp-label">HP</span>${dots}
      <button class="hp-btn" title="+1 Hero Point (whole team earns whenever any hero uses a Principle in an Overcome)" onclick="event.stopPropagation();adjustHeroPoint('${t.slug}',1)">+</button>
      <button class="hp-btn" title="Remove a wrongly-marked Hero Point" onclick="event.stopPropagation();adjustHeroPoint('${t.slug}',-1)">−</button>
    </div>`;
}

async function adjustHeroPoint(heroSlug, delta) {
  const issue = hpIssueSlug();
  if (!issue) { toast('Load a scene that belongs to an Issue first — Hero Points are tracked per Issue.'); return; }
  try {
    const res = await fetch('/api/hero-points', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue, hero: heroSlug, delta })
    });
    if (!res.ok) { toast('Hero Point update failed.'); return; }
    state.heroPoints = await res.json() || {};
    renderTokens();
  } catch (e) { toast('Hero Point update failed.'); console.error(e); }
}

async function awardHeroPointAll(delta, reason) {
  const issue = hpIssueSlug();
  if (!issue) { toast('Load a scene that belongs to an Issue first — Hero Points are tracked per Issue.'); return; }
  // RAW p.31: whenever ANY hero uses a Principle in an Overcome (success or
  // not), EACH hero on the team earns one hero point. Social scenes: 1 each.
  const heroes = state.heroes.filter(h => String(h.Active ?? '').toLowerCase() !== 'false');
  if (!heroes.length) { toast('No heroes in the Library.'); return; }
  try {
    for (const h of heroes) {
      const res = await fetch('/api/hero-points', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue, hero: h.Slug, delta })
      });
      if (res.ok) state.heroPoints = await res.json() || {};
    }
    renderTokens();
    toast(reason ? `${reason} — all heroes +1 HP` : 'All heroes +1 HP');
  } catch (e) { toast('Hero Point update failed.'); console.error(e); }
}

async function resetHeroPointsForIssue() {
  const issue = hpIssueSlug();
  if (!issue) { toast('Load a scene that belongs to an Issue first.'); return; }
  if (!confirm(`Clear all Hero Point counters for this Issue?\n(At Issue end, trade them for Hero Point bonuses first — RAW p.31.)`)) return;
  try {
    const res = await fetch('/api/hero-points', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue, reset: true })
    });
    if (!res.ok) { toast('Hero Point reset failed.'); return; }
    state.heroPoints = await res.json() || {};
    renderTokens();
    toast('Hero Points cleared for this Issue.');
  } catch (e) { toast('Hero Point reset failed.'); console.error(e); }
}

function renderToken(t, small) {
  const card = document.createElement('div');
  card.className = `token mvc-card ${t.kind}${small ? ' small' : ''}${t.npc ? ' npc' : ''}`;
  card.draggable = true;
  card.addEventListener('dragstart', e => {
    if (e.target.closest('button, input, select, textarea, label, .board-ability')) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', t.id); card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));
  attachTouchDrag(card, t.id);

  const heroRow = t.kind === 'hero' ? (state.heroes.find(h => h.Slug === t.slug) || {}) : null;
  if ((t.kind === 'minion' || t.kind === 'lieutenant') && !t.npc) {
    t.npc = isNpcToken(t);
  }
  // Immobile mode (e.g. Destroyer Mode): the token cannot be moved.
  const immobile = t.kind === 'hero' && !!heroCurrentMode(t)?.immobile;
  card.draggable = !immobile;
  const moveCtl = immobile ? '' : `<select class="token-move-select" title="Move to another location" onchange="event.stopPropagation();moveToken('${t.id}', this.value)">
      ${tokenMoveOptionsHtml(t)}
    </select>`;
  let body = `${state.turnMarks && state.turnMarks[t.id] ? `<div class="turn-badge">${state.turnMarks[t.id]}</div>` : ''}
    <div class="mvc-plate token-header" onclick="toggleToken(this)" style="cursor:pointer;"><span>${escHtml(t.name)}</span>
      <div class="token-controls" onclick="event.stopPropagation()">
        ${moveCtl}
        <button type="button" title="Remove from scene" onclick="event.stopImmediatePropagation();removeToken('${t.id}')">✕</button>
      </div>
    </div>`;
  const content = document.createElement('div');
  content.className = 'token-content';
  content.style.display = 'block'; // default expanded
  if (t.kind === 'hero' || t.kind === 'villain') content.innerHTML += renderHealthBlock(t, heroRow);
  if (t.kind === 'hero') content.innerHTML += renderHeroPointsHtml(t);
  if ((t.kind === 'minion' || t.kind === 'lieutenant') && !isNonCombatNpc(t)) content.innerHTML += renderDieBlock(t);
  if (tokenShowsBhd(t)) content.innerHTML += bhdRowHtml(t, state.scene, true);
  if (t.kind === 'hero') {
    const modeHtml = renderHeroModeHtml(t);
    if (modeHtml) content.innerHTML += modeHtml;
  }
  content.innerHTML += boardAbilityListHtml(t);
  if (t.kind === 'hero') content.innerHTML += renderHeroPrinciplesHtml(t);
  content.innerHTML += boardBasicActionsHtml(t);

  card.innerHTML = body;
  card.appendChild(content);
  return card;
}

function toggleToken(header) {
  const card = header.parentElement;
  const content = card.querySelector('.token-content');
  if (!content) return;
  const hidden = content.style.display === 'none';
  content.style.display = hidden ? 'block' : 'none';
  header.style.opacity = hidden ? '1' : '0.6';
}

function renderHealthBlock(t, heroRow) {
  let bandInfo, maxHealth, villainRow = null;
  if (t.kind === 'hero') {
    const row = heroRow || state.heroes.find(h => h.Slug === t.slug) || {};
    maxHealth = Number(row.MaxHealth) || t.maxHealth || 20;
    bandInfo = computeHeroStatus(maxHealth, t.currentHealth, state.scene);
  } else {
    villainRow = state.villains.find(v => v.Slug === t.slug) || {};
    maxHealth = Number(villainRow.MaxHealth) || t.maxHealth || 20;
    bandInfo = { band: villainBand(villainRow, t.currentHealth), approx: false };
  }
  const pct = Math.max(0, Math.min(100, (t.currentHealth / maxHealth) * 100));

  return `<div class="health-wrap">
      <div class="health-bar-track"><div class="health-bar-fill ${bandInfo.band}" style="width:${pct}%"></div></div>
    </div>`;
}
function renderDieBlock(t) {
  if (t.ko) return `<div class="die-row"><span class="die-badge ko">KO</span></div>`;
  const badge = `<button class="die-badge d${t.currentDie}" title="Roll d${t.currentDie}" onclick="rollTokenDie('${t.id}')">d${t.currentDie}</button>`;
  return `<div class="die-row">${badge}</div>`;
}
function renderStatusSlots(t) {
  const row = state.villains.find(v => v.Slug === t.slug) || {};
  let html = '<div class="status-slots">';
  for (let i = 1; i <= 5; i++) {
    const label = row['Status' + i + 'Label'], die = row['Status' + i + 'Die'];
    if (!label && !die) continue;
    html += `<div class="status-slot"><span class="status-label">${escHtml(label || 'Slot ' + i)}</span>
      ${die ? `<button class="die-badge ${die}" onclick="rollLabeledDie('${die}','${escAttr(label)}')">${die}</button>` : ''}</div>`;
  }
  return html + '</div>';
}

function adjustHealth(id, delta) { const t = findTok(id); t.currentHealth = Math.max(0, (Number(t.currentHealth) || 0) + delta); saveSceneDebounced(); renderTokens(); }
function setHealth(id, val) { const t = findTok(id); t.currentHealth = Math.max(0, Number(val) || 0); saveSceneDebounced(); renderTokens(); }
function removeToken(id) { state.scene.tokens = state.scene.tokens.filter(t => t.id !== id); saveSceneDebounced(); renderTokens(); }
function rollTokenDie(id) { const t = findTok(id); toast(`${t.name}: rolled d${t.currentDie} → ${rollDie(t.currentDie)}`); }
function rollLabeledDie(dieStr, label) { toast(`${label || 'Status die'}: rolled ${dieStr} → ${rollDie(Number(dieStr.replace('d','')))}`); }
function findTok(id) { return state.scene.tokens.find(t => t.id === id); }

function spawnToken() {
  const type = document.getElementById('spawnType').value;
  const slug = document.getElementById('spawnSelect').value;
  if (!slug) { toast('Pick a Library entry first.'); return; }
  if (!state.scene) { toast('Load a scene onto the Board first.'); return; }
  const locId = selectedSpawnLocationId();
  let tok;
  if (type === 'hero') {
    const row = state.heroes.find(r => r.Slug === slug);
    tok = {
      id: uid('tok'), kind: 'hero', slug, name: row.Name, locationId: locId,
      currentHealth: Number(row.MaxHealth) || 20, maxHealth: Number(row.MaxHealth) || 20,
      affiliation: String(row.Affiliation || 'Ally'),
    };
  } else if (type === 'villain') {
    const row = state.villains.find(r => r.Slug === slug);
    tok = {
      id: uid('tok'), kind: 'villain', slug, name: row.Name, locationId: locId,
      currentHealth: Number(row.MaxHealth) || 20, maxHealth: Number(row.MaxHealth) || 20,
      affiliation: String(row.Affiliation || 'Enemy'),
    };
  } else {
    const row = libMinion(slug);
    if (!row) { toast('No Library entry found for this token.'); return; }
    const fromNpcLib = type === 'npc' || !!(state.npcs || []).find(m => m.Slug === slug);
    const kind = tokenKindFromMinionRow(row);
    tok = {
      id: uid('tok'), kind, slug, name: row.Name, locationId: locId,
      ...(fromNpcLib && /^bystander$/i.test(String(row.Type || '')) ? {} : {
        currentDie: Number((row.Die || 'd6').replace('d','')) || 6,
      }),
      ko: false,
      npc: fromNpcLib,
      nonCombat: fromNpcLib && /^non[-\s]?combat$/i.test(String(row.Type || '')),
      affiliation: String(row.Affiliation || (fromNpcLib ? 'Neutral' : 'Enemy')),
    };
  }
  state.scene.tokens.push(tok);
  saveSceneDebounced();
  renderTokens();
  // Keep Issue roster selection (do not reset spawnSelect).
}

function addAllPCsToScene() {
  if (!state.scene) {
    toast('Load a scene onto the Board first.');
    return;
  }
  if (!state.heroes || state.heroes.length === 0) {
    toast('No heroes found in library.');
    return;
  }

  const locId = selectedSpawnLocationId();
  let added = 0;

  state.heroes.forEach(row => {
    if (!row.Slug || !row.Name || !isActiveFlag(row.Active)) return;
    // Avoid duplicates
    if (state.scene.tokens.some(t => t.kind === 'hero' && t.slug === row.Slug)) return;

    const tok = {
      id: uid('tok'),
      kind: 'hero',
      slug: row.Slug,
      name: row.Name,
      locationId: locId,
      currentHealth: Number(row.MaxHealth) || 20,
      maxHealth: Number(row.MaxHealth) || 20,
      affiliation: String(row.Affiliation || 'Ally'),
    };
    state.scene.tokens.push(tok);
    added++;
  });

  if (added > 0) {
    saveSceneDebounced();
    renderTokens();
    toast(`Added ${added} PC${added === 1 ? '' : 's'} to the location.`);
  } else {
    toast('All active PCs are already on the scene (or none active).');
  }
}

/* ---- Challenges panel (live, on the Board) ---- */
// Same completion check Player Display already uses (pathDisplayOutcome in display.js) --
// the GM should never see LESS completion info than the players do.
function pathDisplayOutcome(p) {
  if (p && p.failed) return 'fail';
  const need = Math.max(1, Number(p && p.successesNeeded) || 1);
  const marked = Number(p && p.successesMarked) || 0;
  return marked >= need ? 'success' : '';
}

function challengeIsResolved(c) {
  const paths = (c && c.paths) || [];
  if (!paths.length) return false;
  return paths.every(p => !!pathDisplayOutcome(p));
}
function renderChallengesPanel() {
  const el = document.getElementById('challengesPanel');
  if (!el || !state.scene) return;
  ensureSceneChallenges(state.scene);
  if (!state.scene.challenges.length) {
    el.innerHTML = '<p class="empty-hint">No challenges in this scene. Add them under Library → Issues & Scenes → Edit (not here on the Board).</p>';
    return;
  }
  el.innerHTML = state.scene.challenges.map((c, idx) => {
    const resolved = challengeIsResolved(c);
    const forceOpen = !!c._forceOpen;
    const collapsed = resolved && !forceOpen;
    const resolvedPaths = (c.paths || []).filter(p => pathDisplayOutcome(p));
    const collapsedSummary = resolvedPaths.map(p => {
      const outcome = pathDisplayOutcome(p);
      const badge = outcome === 'fail'
        ? '<span class="challenge-outcome fail">Fail</span>'
        : '<span class="challenge-outcome success">Success</span>';
      return `<span class="challenge-collapsed-summary">${escHtml(p.label || 'Path')} ${badge}</span>`;
    }).join('');
    const fullBody = `
      ${(c.paths || []).map((p, pi) => {
          const outcome = pathDisplayOutcome(p);
          const badge = outcome === 'fail' ? '<span class="challenge-outcome fail">Fail</span>'
            : outcome === 'success' ? '<span class="challenge-outcome success">Success</span>' : '';
          return `
        <div class="challenge-path-row">
          <label class="challenge-fail-toggle"><input type="checkbox" ${p.failed ? 'checked' : ''} onchange="togglePathFailedLive(${idx},${pi}, this.checked)"> Fail</label>
          <span class="challenge-path-label${outcome === 'success' ? ' challenge-success-title' : ''}">${escHtml(p.label)}</span>
          ${badge}
          <label class="hidden-toggle" style="margin:0;"><input type="checkbox" ${p.hidden ? 'checked' : ''} onchange="togglePathHiddenLive(${idx},${pi}, this.checked)"> Hide</label>
          <span class="challenge-checks">${Array.from({length: Math.max(1, Number(p.successesNeeded)||1)}, (_, n) =>
            `<input type="checkbox" ${n < (Number(p.successesMarked)||0) ? 'checked' : ''} onchange="setPathChecksLive(${idx},${pi}, ${n}, this.checked)">`
          ).join('')}</span>
        </div>`;
        }).join('')}
      ${c.type === 'Timed' && c.timerMode === 'turns' ? `
        <div class="challenge-path-row"><span>Turns remaining</span>
          <span class="counter-row">
            <button class="btn btn-small btn-ghost" onclick="bumpChallengeFieldLive(${idx},'timerTurnsRemaining',-1)">-1</button>
            <span class="counter-value">${c.timerTurnsRemaining}</span>
          </span></div>` : ''}
      ${c.type === 'Doomsday Device' ? `<button class="btn btn-small btn-danger" onclick="advanceDoomsdayTurnLive(${idx})">Advance Device Turn</button>` : ''}
      <label class="hidden-toggle"><input type="checkbox" ${c.hidden ? 'checked' : ''} onchange="toggleChallengeHiddenLive(${idx}, this.checked)"> Hidden from Player Display</label>`;
    return `
    <div class="challenge-board-card${collapsed ? ' collapsed' : ''}">
      <div class="challenge-board-top">
        <span class="challenge-board-title">${escHtml(c.title)}</span>
        <span class="token-type-chip challenge-type-chip">${c.type}</span>
        ${resolved ? `<button type="button" class="btn btn-small btn-ghost" onclick="toggleChallengeForceOpen(${idx})">${forceOpen ? 'Collapse' : 'Expand'}</button>` : ''}
      </div>
      <div class="challenge-collapsed-body">${collapsedSummary || '<span class="empty-hint">Resolved</span>'}</div>
      <div class="challenge-full-body">${fullBody}</div>
    </div>`;
  }).join('');
}
function toggleChallengeForceOpen(idx) {
  const c = state.scene.challenges[idx];
  if (!c) return;
  c._forceOpen = !c._forceOpen;
  renderChallengesPanel();
}
function bumpPathFieldLive(idx, pi, delta) {
  const c = state.scene.challenges[idx];
  const p = c.paths[pi];
  p.successesMarked = Math.max(0, (Number(p.successesMarked) || 0) + delta);
  saveSceneDebounced(); renderChallengesPanel();
  logActivity(null, 'Challenge Progress', null, `${c.title} — ${p.label || 'path'}: ${p.successesMarked}`, { challenge: c.title, path: p.label, successesMarked: p.successesMarked, delta });
}
function setPathChecksLive(idx, pi, n, checked) {
  const c = state.scene.challenges[idx];
  const p = c.paths[pi];
  const need = Math.max(1, Number(p.successesNeeded) || 1);
  let marked = Number(p.successesMarked) || 0;
  if (checked) marked = Math.max(marked, n + 1);
  else marked = Math.min(marked, n);
  p.successesMarked = Math.max(0, Math.min(need, marked));
  saveSceneDebounced(); renderChallengesPanel();
  logActivity(null, 'Challenge Progress', null, `${c.title} — ${p.label || 'path'}: ${p.successesMarked}/${need}`, { challenge: c.title, path: p.label, successesMarked: p.successesMarked });
}
function bumpChallengeFieldLive(idx, field, delta) {
  state.scene.challenges[idx][field] = Math.max(0, (Number(state.scene.challenges[idx][field]) || 0) + delta);
  saveSceneDebounced(); renderChallengesPanel();
}
function toggleChallengeHiddenLive(idx, val) {
  state.scene.challenges[idx].hidden = val;
  saveSceneDebounced(); renderChallengesPanel();
}
function togglePathFailedLive(idx, pi, val) {
  state.scene.challenges[idx].paths[pi].failed = !!val;
  saveSceneDebounced(); renderChallengesPanel();
}
function togglePathHiddenLive(idx, pi, val) {
  state.scene.challenges[idx].paths[pi].hidden = !!val;
  saveSceneDebounced(); renderChallengesPanel();
}
function advanceDoomsdayTurnLive(idx) {
  advanceDoomsdayTurn(idx);
  renderChallengesPanel();
}

/* ============================================================
   Attack resolution (unchanged rules; now saves via Scenes API)
   ============================================================ */

function openAttack(tokenId) {
  const t = findTok(tokenId);
  if (t.kind === 'villain') tokenHasEngine(t, 'Singular Strength');
  document.getElementById('attackModalTitle').textContent = 'Resolve Attack — ' + t.name;
  const body = document.getElementById('attackModalBody');
  if (t.kind === 'hero' || t.kind === 'villain') {
    body.innerHTML = `<label>Damage (effect die result)<input type="number" id="atkDamage" min="0" value="0"></label>
      ${attackModPickerHtml(t)}
      <button class="btn btn-accent" onclick="applyDamageToHealth('${t.id}')">Apply Damage</button><div class="attack-result" id="atkResult"></div>`;
  } else if (t.kind === 'minion') {
    body.innerHTML = `<label>Damage dealt to this minion group<input type="number" id="atkDamage" min="0" value="0"></label>
      ${attackModPickerHtml(t)}
      <p style="color:#555;">House rule: Minions are defeated outright on a failed save (no step-down).</p>
      <button class="btn btn-accent" onclick="resolveMinionSave('${t.id}')">Roll Save &amp; Resolve</button><div class="attack-result" id="atkResult"></div>`;
  } else if (t.kind === 'lieutenant') {
    body.innerHTML = `<label>Damage dealt to this lieutenant<input type="number" id="atkDamage" min="0" value="0"></label>
      ${attackModPickerHtml(t)}
      <p style="color:#555;">Fail = degrade one step. Damage ≥ 2× die size = instant KO, no save.</p>
      <button class="btn btn-accent" onclick="resolveLieutenantSave('${t.id}')">Roll Save &amp; Resolve</button><div class="attack-result" id="atkResult"></div>`;
  }
  document.getElementById('attackModal').classList.remove('hidden');
}
function closeAttack() { document.getElementById('attackModal').classList.add('hidden'); }

function openModCreate(tokenId, kind) {
  const t = findTok(tokenId);
  if (!t || !state.scene) return;
  if (t.kind === 'hero' && modeLockedActions(t).has(kind)) { toast(kind + ' is locked in this mode'); return; }
  const title = kind === 'boost' ? 'Boost' : kind === 'hinder' ? 'Hinder' : 'Defend';
  document.getElementById('modModalTitle').textContent = title + ' — ' + t.name;
  const sameLoc = state.scene.tokens.filter(x => !x.ko && x.locationId === t.locationId);
  const allTok = state.scene.tokens.filter(x => !x.ko);
  const targetPool = kind === 'defend' ? sameLoc : allTok;
  if (kind === 'defend' && sameLoc.length === 0) {
    toast('Defend needs someone in the same location');
    return;
  }
  const targetOpts = targetPool.map(x =>
    `<option value="${x.id}" ${x.id === t.id ? 'selected' : ''}>${escHtml(x.name)}${x.id === t.id ? ' (self)' : ''}</option>`
  ).join('');
  const existing = kind === 'defend' ? modsOnTarget(state.scene, t.id, 'defend') : modsCreatedBy(state.scene, t.id, kind);
  const heroRow = state.heroes.find(h => h.Slug === (t.slug || '')) || {};
  const twistOpts = [];
  for (const n of [1, 2]) {
    if (heroRow['Principle' + n + 'MinorTwist']) {
      twistOpts.push(`<option value="${n}">${escHtml(heroRow['Principle' + n + 'Name'] || ('Principle ' + n))}: ${escHtml(heroRow['Principle' + n + 'MinorTwist'])}</option>`);
    }
  }
  const twistHtml = (kind !== 'defend' && twistOpts.length)
    ? `<label class="hidden-toggle"><input type="checkbox" id="modTwist2Uses"> Take a Minor Twist: mod lasts for TWO uses</label>
       <select id="modTwistPrinciple">${twistOpts.join('')}</select>` : '';
  const existingHtml = existing.length
    ? `<div class="mod-list">${existing.map(m => {
        const who = findTok(m.targetId);
        const tag = m.exclusivePersistent ? 'Exclusive & Persistent' : 'one-off';
        return `<div>${m.kind} ${m.value} → ${escHtml(who ? who.name : '?')} <small>(${tag})</small>
          <button class="btn btn-small btn-ghost" type="button" onclick="consumeMod('${m.id}')">Clear</button></div>`;
      }).join('')}</div>`
    : '<p class="empty-hint">None yet.</p>';
  const targetLabel = kind === 'defend'
    ? 'Protect (same location)'
    : (kind === 'hinder' ? 'Penalty sits on' : 'Optional attach (creator still spends)');
  document.getElementById('modModalBody').innerHTML = `
    ${existingHtml}
    <label>Value <input type="number" id="modValue" min="0" value="2"></label>
    <label>${targetLabel}<select id="modTarget">${targetOpts}</select></label>
    <label class="hidden-toggle"><input type="checkbox" id="modPersistent"> Exclusive &amp; Persistent (one per creator)</label>
    ${twistHtml}
    <p style="color:var(--text-lo);font-size:12px;">Default is one-off. Spend a Minor Twist later to reuse a one-off. Persistent stays until cleared. Defend subtracts from Attacks on the target.</p>
    <button class="btn btn-accent" type="button" onclick="commitMod('${t.id}','${kind}')">Add ${title}</button>`;
  document.getElementById('modModal').classList.remove('hidden');
}
function closeModCreate() { document.getElementById('modModal').classList.add('hidden'); }
function commitMod(creatorId, kind) {
  const creator = findTok(creatorId);
  const value = Number(document.getElementById('modValue').value) || 0;
  const targetId = document.getElementById('modTarget').value;
  const exclusivePersistent = document.getElementById('modPersistent').checked;
  const twistUsed = !!(document.getElementById('modTwist2Uses') && document.getElementById('modTwist2Uses').checked);
  const twistPrinciple = twistUsed ? (document.getElementById('modTwistPrinciple') || {}).value : null;
  const twistText = twistPrinciple
    ? (((state.heroes.find(h => h.Slug === (creator.slug || '')) || {})['Principle' + twistPrinciple + 'MinorTwist']) || '')
    : '';
  const uses = twistText ? 2 : 1;
  if (value <= 0) { toast('Value must be &gt; 0'); return; }
  if (kind === 'defend') {
    const target = findTok(targetId);
    if (!target || target.locationId !== creator.locationId) {
      toast('Defend target must share this location');
      return;
    }
  }
  if (exclusivePersistent && creatorHasExclusivePersistent(state.scene, creatorId)) {
    toast('This creator already has an Exclusive & Persistent mod');
    return;
  }
  ensureMods(state.scene).push({
    id: uid('mod'), kind, creatorId, targetId, value, exclusivePersistent, consumed: false,
    uses, twist: twistText
  });
  const cName = creator.name;
  const tName = (findTok(targetId) || {}).name || '?';
  logActivity({ id: creator.id, name: cName, kind: creator.kind }, kind[0].toUpperCase() + kind.slice(1),
    { id: targetId, name: tName },
    `${kind} ${value}${exclusivePersistent ? ' (Exclusive & Persistent)' : uses > 1 ? ' (2 uses — minor twist taken)' : ''}`,
    { value, kind, uses, twist: twistText });
  saveSceneDebounced(); renderTokens(); closeModCreate();
}
function consumeMod(modId) {
  const m = ensureMods(state.scene).find(x => x.id === modId);
  if (m) m.consumed = true;
  saveSceneDebounced(); renderTokens(); closeModCreate();
}

function attackModPickerHtml(target) {
  // Only mods sitting ON the affected token — the affected character (or the
  // GM on their behalf) decides when a Boost/Hinder happens (creator chose the
  // target at creation; the traceable path is creator → target on every row).
  const spend = liveMods(state.scene).filter(m =>
    (m.kind === 'boost' || m.kind === 'hinder') && m.targetId === target.id);
  const defend = bhdTotals(state.scene, target).defend;
  const rows = spend.length
    ? spend.map(m => {
        const cr = findTok(m.creatorId);
        const tag = m.exclusivePersistent ? 'Exclusive & Persistent'
          : (Number(m.uses) > 1 ? `one-off, ${m.uses} uses (minor twist taken)` : 'one-off');
        return `<label><input type="checkbox" class="atk-mod" data-id="${m.id}">
          ${m.kind === 'boost' ? '+' : '−'}${m.value} ${m.kind} from ${escHtml(cr ? cr.name : '?')} (${tag})</label>`;
      }).join('')
    : '<p class="empty-hint">No Boost/Hinder to stack.</p>';
  return `<div class="mod-list"><b>Stack mods (creator spends)</b>${rows}
    <label><input type="checkbox" id="atkTwistReuse"> Minor Twist: reuse selected one-offs instead of consuming</label>
    <div style="color:var(--text-lo);font-size:12px;">Defend on ${escHtml(target.name)}: ${defend} (subtracted automatically)</div></div>`;
}

function selectedAttackMods() {
  return [...document.querySelectorAll('.atk-mod:checked')].map(el =>
    liveMods(state.scene).find(m => m.id === el.dataset.id)
  ).filter(Boolean);
}

function applyStackedAttack(target, raw) {
  const notes = [];
  let dmg = raw;
  const twist = !!(document.getElementById('atkTwistReuse') && document.getElementById('atkTwistReuse').checked);
  selectedAttackMods().forEach(m => {
    if (m.kind === 'boost') { dmg += Number(m.value) || 0; notes.push(`+${m.value} Boost`); }
    if (m.kind === 'hinder') { dmg -= Number(m.value) || 0; notes.push(`−${m.value} Hinder`); }
    consumeOneUse(m, twist);
  });
  const defend = bhdTotals(state.scene, target).defend;
  if (defend) {
    dmg = Math.max(0, dmg - defend);
    notes.push(`Defend −${defend}`);
    modsOnTarget(state.scene, target.id, 'defend').forEach(m => {
      if (!m.exclusivePersistent && !twist) m.consumed = true;
    });
  }
  return { dmg: Math.max(0, dmg), notes };
}
// A two-use mod (created by taking a minor twist) survives the first spend.
function consumeOneUse(m, keepPersistent) {
  if (m.exclusivePersistent && keepPersistent) return;
  const uses = Number(m.uses) || 1;
  if (!m.exclusivePersistent && uses > 1) { m.uses = uses - 1; return; }
  if (!m.exclusivePersistent || keepPersistent) m.consumed = true;
}

function applyDamageToHealth(id) {
  const raw = Number(document.getElementById('atkDamage').value) || 0;
  const t = findTok(id);
  const stacked = applyStackedAttack(t, raw);
  let dmg = stacked.dmg;
  const notes = stacked.notes.slice();
  if (t.kind === 'villain' && tokenHasEngine(t, 'Singular Strength') && !nearbyAllies(t).length) {
    dmg = Math.max(0, dmg - 1);
    notes.push('Singular Strength −1 incoming (no nearby allies)');
  }
  t.currentHealth = Math.max(0, t.currentHealth - dmg);
  saveSceneDebounced(); renderTokens();
  document.getElementById('atkResult').textContent =
    `Applied ${dmg} damage` + (dmg !== raw ? ` (typed ${raw})` : '') +
    `. New Health: ${t.currentHealth}.` + (notes.length ? ' ' + notes.join('; ') : '');
  logActivity({ id: t.id, name: t.name, kind: t.kind }, 'Damage', null,
    `Took ${dmg} damage (Health: ${t.currentHealth})`, { damage: dmg, typed: raw, notes });
}
function nearbyAllies(t) {
  if (!state.scene || !state.scene.tokens) return [];
  return state.scene.tokens.filter(x =>
    x.id !== t.id && !x.ko && x.locationId === t.locationId &&
    (x.kind === 'villain' || x.kind === 'minion' || x.kind === 'lieutenant'));
}
function tokenHasEngine(t, abilityName) {
  const cache = (state._mdCache = state._mdCache || {});
  const key = (t.kind || '') + ':' + (t.slug || '');
  const md = cache[key];
  if (typeof md === 'string') return md.toLowerCase().includes(abilityName.toLowerCase());
  apiReadMd(t.kind === 'villain' ? 'villains' : t.kind + 's', t.slug).then(text => {
    cache[key] = text || '';
  });
  return false;
}
function resolveMinionSave(id) {
  const raw = Number(document.getElementById('atkDamage').value) || 0;
  const t = findTok(id);
  const dmg = applyStackedAttack(t, raw).dmg;
  const roll = rollDie(t.currentDie);
  const resultEl = document.getElementById('atkResult');
  if (roll < dmg) {
    resultEl.innerHTML = `<div class="attack-roll-display">🎲 ${roll}</div>Save FAILED vs ${dmg}. Minion group is <b>defeated</b>.
      <br><button class="btn btn-danger btn-small" onclick="confirmMinionKo('${t.id}')">Confirm Defeated</button>`;
  } else {
    resultEl.innerHTML = `<div class="attack-roll-display">🎲 ${roll}</div>Save SUCCEEDED vs ${dmg}. No change.`;
  }
  logActivity({ id: t.id, name: t.name, kind: t.kind }, 'Save', null, `Rolled ${roll} vs ${dmg} — ${roll < dmg ? 'failed' : 'succeeded'}`, { roll, dmg });
}
function confirmMinionKo(id) {
  const t = findTok(id);
  t.ko = true; saveSceneDebounced(); renderTokens(); closeAttack();
  logActivity({ id: t.id, name: t.name, kind: t.kind }, 'Defeated', null, `${t.name} defeated`, {});
}
function resolveLieutenantSave(id) {
  const raw = Number(document.getElementById('atkDamage').value) || 0;
  const t = findTok(id);
  const dmg = applyStackedAttack(t, raw).dmg;
  const resultEl = document.getElementById('atkResult');
  if (dmg >= t.currentDie * 2) {
    resultEl.innerHTML = `Damage (${dmg}) ≥ double d${t.currentDie}. <b>Instant KO — no save.</b>
      <br><button class="btn btn-danger btn-small" onclick="confirmLieutenantKo('${t.id}')">Confirm Defeated</button>`;
    logActivity({ id: t.id, name: t.name, kind: t.kind }, 'Save', null, `Damage ${dmg} ≥ double d${t.currentDie} — instant KO, no save`, { dmg });
    return;
  }
  const roll = rollDie(t.currentDie);
  if (roll < dmg) {
    const next = degradeDie(t.currentDie);
    if (next === null) {
      resultEl.innerHTML = `<div class="attack-roll-display">🎲 ${roll}</div>Save FAILED at d4. <b>Defeated.</b>
        <br><button class="btn btn-danger btn-small" onclick="confirmLieutenantKo('${t.id}')">Confirm Defeated</button>`;
    } else {
      resultEl.innerHTML = `<div class="attack-roll-display">🎲 ${roll}</div>Save FAILED vs ${dmg}. Degrades to d${next}.
        <br><button class="btn btn-accent btn-small" onclick="confirmLieutenantDegrade('${t.id}', ${next})">Confirm Degrade to d${next}</button>`;
    }
  } else {
    resultEl.innerHTML = `<div class="attack-roll-display">🎲 ${roll}</div>Save SUCCEEDED vs ${dmg}. No change.`;
  }
  logActivity({ id: t.id, name: t.name, kind: t.kind }, 'Save', null, `Rolled ${roll} vs ${dmg} — ${roll < dmg ? 'failed' : 'succeeded'}`, { roll, dmg });
}
function confirmLieutenantDegrade(id, next) {
  const t = findTok(id);
  t.currentDie = next; saveSceneDebounced(); renderTokens(); closeAttack();
  logActivity({ id: t.id, name: t.name, kind: t.kind }, 'Degraded', null, `Degraded to d${next}`, { next });
}
function confirmLieutenantKo(id) {
  const t = findTok(id);
  t.ko = true; saveSceneDebounced(); renderTokens(); closeAttack();
  logActivity({ id: t.id, name: t.name, kind: t.kind }, 'Defeated', null, `${t.name} defeated`, {});
}
function resetLieutenantDice() {
  if (!state.scene) { toast('Load a scene onto the Board first.'); return; }
  const lts = (state.scene.tokens || []).filter(t => t.kind === 'lieutenant');
  if (!lts.length) { toast('No lieutenants on the board.'); return; }
  lts.forEach(t => {
    const row = libMinion(t.slug) || {};
    t.currentDie = Number((row.Die || 'd8').replace('d', '')) || 8;
    t.ko = false;
    logActivity({ id: t.id, name: t.name, kind: t.kind }, 'Reset', null, `${t.name} die reset to d${t.currentDie}`, {});
  });
  saveSceneDebounced(); renderTokens();
  toast(`Reset ${lts.length} lieutenant die${lts.length === 1 ? '' : 's'}.`);
}

/* ============================================================
   Wiring
   ============================================================ */

function switchView(view) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('boardView').classList.toggle('hidden', view !== 'board');
  document.getElementById('libraryView').classList.toggle('hidden', view !== 'library');
  document.getElementById('rulesView').classList.toggle('hidden', view !== 'rules');
  document.getElementById('builderView').classList.toggle('hidden', view !== 'builder');
  document.getElementById('sheetsView').classList.toggle('hidden', view !== 'sheets');
  if (view === 'board') refreshBoardFromServer();
  if (view === 'sheets') renderSheetsView();
  if (view === 'library') {
    // Return to list if an editor was left open from a prior visit
    const list = document.getElementById('libraryListView');
    if (list && list.classList.contains('hidden')) showCollectionsList();
    else if (currentLibTab === 'issues-scenes') showCollectionsList();
  }
  if (view === 'rules' && state.rulesList.length === 0) initRules();
}

// Re-fetches the true active scene from the server whenever the Board tab is
// opened, so it can never show stale/wrong data left over from the Scene Editor
// having loaded a different scene into state.scene in the meantime.
async function refreshBoardFromServer() {
  if (state.activeSlug) {
    const fresh = await apiGetScene(state.activeSlug);
    if (fresh) {
      fresh.__slug = state.activeSlug;
      (fresh.tokens || []).forEach(t => { delete t.turnNumber; });
      state.scene = fresh;
    }
  }
  renderBoard();
}

/* ============================================================
   Rules Browser — read-only, ships with the app (not per-campaign)
   ============================================================ */

state.rulesList = [];       // [{slug, title, chars}]
state.rulesContent = {};    // slug -> full markdown text, fetched once and cached
let rulesActiveSlug = null;

async function initRules() {
  const res = await fetch('/api/rules');
  state.rulesList = res.ok ? await res.json() : [];
  // Prefetch all content up front — corpus is small (~150KB), makes search instant.
  await Promise.all(state.rulesList.map(async r => {
    const rr = await fetch(`/api/rules/${encodeURIComponent(r.slug)}`);
    state.rulesContent[r.slug] = rr.ok ? await rr.text() : '';
  }));
  renderRulesList('');
}

const RULES_CHAPTERS = [];
let rulesOpenChapter = null;

function isIndexGlossaryRule(r) {
  const blob = `${r.chapter || ''} ${r.slug || ''} ${r.title || ''}`;
  return /index\s*[&/]\s*glossary/i.test(blob) || /^Ch\s*8\b/i.test(r.chapter || '') || /^Ch\s*8\b/i.test(r.slug || '');
}
function rulesChapterGroups() {
  const order = [];
  const map = new Map();
  (state.rulesList || []).forEach(r => {
    if (isIndexGlossaryRule(r)) return; // handled as a one-click doc, not a chapter folder
    const raw = r.chapter || r.slug.split('--')[0] || 'Other';
    if (/^Ch\s*[167]\b/i.test(raw)) return;
    if (!map.has(raw)) { map.set(raw, []); order.push(raw); }
    map.get(raw).push(r);
  });
  return order.map(title => ({ title, files: map.get(title) }));
}

function renderRulesList(filter) {
  const el = document.getElementById('rulesList');
  const q = (filter || '').trim().toLowerCase();
  if (q) {
    const hits = [];
    state.rulesList.forEach(r => {
      const text = state.rulesContent[r.slug] || '';
      const idx = text.toLowerCase().indexOf(q);
      if (r.title.toLowerCase().includes(q) || idx !== -1) {
        let snippet = '';
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          snippet = (start > 0 ? '…' : '') + text.slice(start, idx + q.length + 60).replace(/\s+/g, ' ') + '…';
        }
        hits.push({ slug: r.slug, title: r.title, snippet });
      }
    });
    el.innerHTML = hits.length
      ? hits.map(h => `
      <button class="rules-list-item" onclick="openRuleDoc('${escAttr(h.slug)}')">
        <div class="rules-hit-title">${escHtml(h.title)}</div>
        ${h.snippet ? `<div class="rules-hit-snippet">${escHtml(h.snippet)}</div>` : ''}
      </button>`).join('')
      : '<p class="empty-hint" style="padding:10px;">No matches.</p>';
    return;
  }
  const indexDocs = (state.rulesList || []).filter(isIndexGlossaryRule);
  // One click opens the doc — no chapter expand, no nested file row.
  const indexHtml = indexDocs.map(r =>
    `<button class="rules-list-item rules-chapter" onclick="openRuleDoc('${escAttr(r.slug)}')">Index &amp; Glossary</button>`
  ).join('');
  const chapters = rulesChapterGroups();
  const chapterHtml = chapters.map((ch, i) => {
    const open = rulesOpenChapter === i;
    const body = open
      ? (ch.files.length
          ? ch.files.map(r => `<button class="rules-list-item" onclick="openRuleDoc('${escAttr(r.slug)}')">${escHtml(r.title)}</button>`).join('')
          : '<p class="empty-hint" style="padding:8px;">No source file ingested for this chapter yet.</p>')
      : '';
    return `<button class="rules-list-item rules-chapter" onclick="toggleRulesChapter(${i})">${escHtml(ch.title)}</button>${body}`;
  }).join('');
  el.innerHTML = chapterHtml + indexHtml;
}
function toggleRulesChapter(i) {
  rulesOpenChapter = rulesOpenChapter === i ? null : i;
  renderRulesList(document.getElementById('rulesSearchInput').value);
}

function openRuleDoc(slug) {
  rulesActiveSlug = slug;
  const text = state.rulesContent[slug] || '';
  document.getElementById('rulesReader').innerHTML = renderMarkdownLite(text);
}

// Minimal, safe markdown-ish renderer: headers, bold, bullet lists, tables, paragraphs.
// Escapes HTML first so nothing in the source content can inject markup.
function renderMarkdownLite(md) {
  const lines = escHtml(md).split('\n');
  let html = '';
  let inList = false, inTable = false;
  const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };
  const closeTable = () => { if (inTable) { html += '</table>'; inTable = false; } };
  for (let raw of lines) {
    const line = raw;
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      closeList(); closeTable();
      const level = Math.min(4, (trimmed.match(/^#+/) || ['#'])[0].length);
      html += `<h${level + 1}>${inlineMd(trimmed.replace(/^#+\s*/, ''))}</h${level + 1}>`;
    } else if (/^[-*]\s+/.test(trimmed)) {
      closeTable();
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inlineMd(trimmed.replace(/^[-*]\s+/, ''))}</li>`;
    } else if (trimmed.startsWith('|')) {
      closeList();
      const cells = trimmed.split('|').map(c => c.trim()).filter((c, i, a) => !(i === 0 && c === '') && !(i === a.length - 1 && c === ''));
      if (cells.every(c => /^-+$/.test(c))) continue; // separator row
      if (!inTable) { html += '<table class="rules-table">'; inTable = true; }
      html += '<tr>' + cells.map(c => `<td>${inlineMd(c)}</td>`).join('') + '</tr>';
    } else if (trimmed === '') {
      closeList(); closeTable();
    } else if (trimmed === '---') {
      closeList(); closeTable();
      html += '<hr>';
    } else {
      closeList(); closeTable();
      html += `<p>${inlineMd(trimmed)}</p>`;
    }
  }
  closeList(); closeTable();
  return html;
}
function inlineMd(s) {
  return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
}

function switchLibTab(kind) {
  currentLibTab = kind;
  document.querySelectorAll('.lib-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.lib === kind));
  ['heroes','villains','minions','npcs','environments','locations','issues-scenes','twists','abilities'].forEach(k => {
    const panel = document.getElementById(k + 'Panel');
    if (panel) panel.classList.toggle('hidden', k !== kind);
  });
  const vr = document.getElementById('villainRefBtn');
  if (vr) vr.classList.add('hidden');
  const isIS = kind === 'issues-scenes';
  const collFilt = document.getElementById('libCollectionFilter');
  if (collFilt) collFilt.classList.toggle('hidden', !isIS);
  const issueFilt = document.getElementById('libIssueFilter');
  if (issueFilt) {
    // Issue filter: entity-issue assign tabs + Issues & Scenes hierarchy filter
    const hideIssue = kind === 'twists';
    issueFilt.classList.toggle('hidden', hideIssue);
  }
  const activeFilt = document.getElementById('libActiveFilter');
  if (activeFilt) activeFilt.classList.toggle('hidden', kind === 'twists' || kind === 'abilities');
  const sevFilt = document.getElementById('twistSeverityFilter');
  const effFilt = document.getElementById('twistEffectFilter');
  if (sevFilt) sevFilt.classList.toggle('hidden', kind !== 'twists');
  if (effFilt) effFilt.classList.toggle('hidden', kind !== 'twists');
  if (isIS) {
    fillLibCollectionFilter();
    fillLibIssueFilter();
  }
  renderLibraryTable(kind);
}

/* ---------------- Villain Approach/Archetype reference + Health Calculator ---------------- */

function populateApproachArchetypeDatalists() {
  document.getElementById('approachesList').innerHTML = VILLAIN_APPROACHES.map(a => `<option value="${escAttr(a.name)}">`).join('');
  document.getElementById('archetypesList').innerHTML = VILLAIN_ARCHETYPES.map(a => `<option value="${escAttr(a.name)}">`).join('');
}

function openReferenceModal() {
  const body = document.getElementById('referenceModalBody');
  const slugs = ['05-2-minions-lieutenants-villains', '05-3-villain-archetypes-upgrades-health'];
  const md = slugs.map(s => state.rulesContent[s]).filter(Boolean).join('\n\n');
  if (md) {
    body.innerHTML = renderMarkdownLite(md);
  } else {
    body.innerHTML = `
    <h4 style="font-family:var(--font-display);color:var(--text-ink);margin:0 0 6px;">Approaches (base Health)</h4>
    <table class="difficulty-ref-table" style="margin-bottom:16px;">
      <tbody>${VILLAIN_APPROACHES.map(a => `<tr><td>${escHtml(a.name)}</td><td>${a.health}</td></tr>`).join('')}</tbody>
    </table>
    <h4 style="font-family:var(--font-display);color:var(--text-ink);margin:0 0 6px;">Archetypes (Health bonus, Status basis)</h4>
    <table class="difficulty-ref-table">
      <tbody>${VILLAIN_ARCHETYPES.map(a => `<tr><td>${escHtml(a.name)}</td><td>${a.health >= 0 ? '+' : ''}${a.health}</td><td>${escHtml(a.status)}</td></tr>`).join('')}</tbody>
    </table>
    <p class="empty-hint">Open the Rules tab (Chapter 5) for the full Approach / Archetype text.</p>`;
  }
  document.getElementById('referenceModal').classList.remove('hidden');
  if (!md) initRules().then(() => { if (document.getElementById('referenceModal') && !document.getElementById('referenceModal').classList.contains('hidden')) openReferenceModal(); });
}
function closeReferenceModal() { document.getElementById('referenceModal').classList.add('hidden'); }

function openHealthCalc(idx) {
  const row = state.villains[idx];
  const approach = findApproach(row.Approach);
  const archetype = findArchetype(row.Archetype);
  const defaultH = (state.scene && state.scene.tokens.filter(t => t.kind === 'hero').length) || 4;
  document.getElementById('healthCalcTitle').textContent = 'Health Calculator — ' + (row.Name || 'Villain');
  document.getElementById('healthCalcBody').innerHTML = `
    <p style="font-family:var(--font-data);font-size:12px;">
      Approach: <b>${escHtml(row.Approach) || '(none)'}</b> ${approach ? `(base ${approach.health})` : '<span style="color:var(--red);">not matched in reference — enter manually below</span>'}<br>
      Archetype: <b>${escHtml(row.Archetype) || '(none)'}</b> ${archetype ? `(${archetype.health >= 0 ? '+' : ''}${archetype.health})` : '<span style="color:var(--red);">not matched in reference — enter manually below</span>'}
    </p>
    <label style="display:block;font-family:var(--font-data);font-size:11px;margin-top:8px;">Approach base
      <input type="number" id="calcApproach" value="${approach ? approach.health : 0}"></label>
    <label style="display:block;font-family:var(--font-data);font-size:11px;margin-top:8px;">Archetype bonus
      <input type="number" id="calcArchetype" value="${archetype ? archetype.health : 0}"></label>
    <label style="display:block;font-family:var(--font-data);font-size:11px;margin-top:8px;">Number of Heroes (H)
      <input type="number" id="calcHeroes" value="${defaultH}"></label>
    <label style="display:block;font-family:var(--font-data);font-size:11px;margin-top:8px;">Upgrade bonuses (sum from whichever upgrades you've applied)
      <input type="number" id="calcUpgrades" value="0"></label>
    <div class="attack-result" style="margin-top:12px;">Total: <span id="calcTotal" style="font-family:var(--font-display);font-size:20px;"></span></div>
    <button class="btn btn-accent" style="margin-top:10px;" onclick="applyHealthCalc(${idx})">Apply to Max Health</button>`;
  ['calcApproach','calcArchetype','calcHeroes','calcUpgrades'].forEach(id =>
    document.getElementById(id).addEventListener('input', updateHealthCalcTotal));
  updateHealthCalcTotal();
  document.getElementById('healthCalcModal').classList.remove('hidden');
}
function updateHealthCalcTotal() {
  const a = Number(document.getElementById('calcApproach').value) || 0;
  const ar = Number(document.getElementById('calcArchetype').value) || 0;
  const h = Number(document.getElementById('calcHeroes').value) || 0;
  const u = Number(document.getElementById('calcUpgrades').value) || 0;
  document.getElementById('calcTotal').textContent = (h * 5) + a + ar + u;
}
function applyHealthCalc(idx) {
  state.villains[idx].MaxHealth = document.getElementById('calcTotal').textContent;
  renderLibraryTable('villains');
  saveLibraryDebounced('villains');
  closeHealthCalc();
}
function closeHealthCalc() { document.getElementById('healthCalcModal').classList.add('hidden'); }

/* ---------------- Hero Principles editor (Library) ---------------- */

function openPrinciplesEditor(idx) {
  const row = state.heroes[idx];
  document.getElementById('healthCalcTitle').textContent = 'Principles — ' + (row.Name || 'Hero');
  document.getElementById('healthCalcBody').innerHTML = [1, 2].map(n => `
    <div style="margin-bottom:14px;padding-bottom:10px;border-bottom:1px dashed #999;">
      <label style="display:block;font-family:var(--font-data);font-size:11px;">Principle ${n} Name
        <input type="text" value="${escAttr(row['Principle' + n + 'Name'])}" onchange="updatePrincipleField(${idx},${n},'Name',this.value)" style="width:100%;margin-top:3px;padding:5px;"></label>
      <label style="display:block;font-family:var(--font-data);font-size:11px;margin-top:6px;">During Roleplaying
        <textarea onchange="updatePrincipleField(${idx},${n},'Roleplay',this.value)" style="width:100%;margin-top:3px;padding:5px;min-height:40px;">${escHtml(row['Principle' + n + 'Roleplay'])}</textarea></label>
      <label style="display:block;font-family:var(--font-data);font-size:11px;margin-top:6px;">Minor Twist
        <textarea onchange="updatePrincipleField(${idx},${n},'MinorTwist',this.value)" style="width:100%;margin-top:3px;padding:5px;min-height:32px;">${escHtml(row['Principle' + n + 'MinorTwist'])}</textarea></label>
      <label style="display:block;font-family:var(--font-data);font-size:11px;margin-top:6px;">Major Twist
        <textarea onchange="updatePrincipleField(${idx},${n},'MajorTwist',this.value)" style="width:100%;margin-top:3px;padding:5px;min-height:32px;">${escHtml(row['Principle' + n + 'MajorTwist'])}</textarea></label>
    </div>`).join('');
  document.getElementById('healthCalcModal').classList.remove('hidden');
}
function updatePrincipleField(idx, n, field, value) {
  state.heroes[idx]['Principle' + n + field] = value;
  saveLibraryDebounced('heroes');
}

/* ---------------- Board: Twist Picker (hero's Principles first, generic library as fallback) ---------------- */

let twistFilterSeverity = 'All';

/* ---------------- Principles on hero tokens ---------------- */

// Expanded principle-detail state persists across re-renders (keyed token:n).
const expandedPrincipleTokens = new Set();

function toggleTokenPrinciple(tokenId, n) {
  const key = tokenId + ':' + n;
  if (expandedPrincipleTokens.has(key)) expandedPrincipleTokens.delete(key);
  else expandedPrincipleTokens.add(key);
  renderTokens();
}

function renderHeroPrinciplesHtml(t) {
  const hero = state.heroes.find(h => h.Slug === t.slug);
  if (!hero) return '';
  const rows = [1, 2].map(n => {
    const name = hero['Principle' + n + 'Name'];
    if (!name) return '';
    const key = t.id + ':' + n;
    const open = expandedPrincipleTokens.has(key);
    let inner = '';
    if (open) {
      const minor = hero['Principle' + n + 'MinorTwist'];
      const major = hero['Principle' + n + 'MajorTwist'];
      const miss = '<span style="color:var(--red);">not on file — check the physical sheet</span>';
      inner = `<div class="token-principle-detail">
          <div><b>Minor Twist:</b> ${minor ? escHtml(minor) : miss}</div>
          <div><b>Major Twist:</b> ${major ? escHtml(major) : miss}</div>
          <div style="margin-top:4px;color:#999;font-size:10px;">Minor band = ask the Minor question · 1–3 band = ask the Major question (or fail)</div>
        </div>`;
    }
    return `<div class="token-principle">
        <span class="token-principle-name" onclick="event.stopPropagation();toggleTokenPrinciple('${t.id}',${n})" title="Principle ${n} — click to ${open ? 'hide' : 'show'} twist questions">${open ? '▾' : '▸'} ${escHtml(name)}</span>
        ${inner}
      </div>`;
  }).filter(Boolean).join('');
  if (!rows) return '';
  return `<div class="token-principles" onclick="event.stopPropagation()"><div class="token-principles-label">Principles</div>${rows}</div>`;
}

function openTwistPicker(tokenId) {
  const t = findTok(tokenId);
  if (!t) return;
  if (t.kind === 'villain') {
    document.getElementById('twistPickerTitle').textContent = 'Villain Twists — ' + t.name;
    document.getElementById('twistPickerBody').innerHTML = VILLAIN_TWIST_HELP;
    document.getElementById('twistPickerModal').classList.remove('hidden');
    return;
  }
  const hero = state.heroes.find(h => h.Slug === t.slug);
  document.getElementById('twistPickerTitle').textContent = 'Twists — ' + t.name;
  twistFilterSeverity = 'All';
  renderTwistPickerBody(hero);
  document.getElementById('twistPickerModal').classList.remove('hidden');
}
function closeTwistPicker() { document.getElementById('twistPickerModal').classList.add('hidden'); }

function renderTwistPickerBody(hero) {
  const el = document.getElementById('twistPickerBody');
  let html = '';

  html += `<p style="font-family:var(--font-data);font-size:10px;color:#555;margin:0 0 8px;">Per the GM guidance: check this hero's own Principle prompts first, fall back to the generic library only if nothing fits.</p>`;

  if (hero) {
    [1, 2].forEach(n => {
      const name = hero['Principle' + n + 'Name'];
      if (!name) return;
      const minor = hero['Principle' + n + 'MinorTwist'];
      const major = hero['Principle' + n + 'MajorTwist'];
      html += `<div class="challenge-edit-card">
        <div style="font-family:var(--font-display);font-size:16px;color:var(--text-hi);">${escHtml(name)}</div>
        <p style="font-family:var(--font-body);font-size:12px;margin:4px 0;color:var(--text-hi);">${escHtml(hero['Principle' + n + 'Roleplay'])}</p>
        <div class="challenge-path-row" style="color:var(--text-hi);"><span><b>Minor:</b> ${minor ? escHtml(minor) : '<span style="color:var(--red);">not on file — check the physical sheet</span>'}</span></div>
        <div class="challenge-path-row" style="color:var(--text-hi);"><span><b>Major:</b> ${major ? escHtml(major) : '<span style="color:var(--red);">not on file — check the physical sheet</span>'}</span></div>
      </div>`;
    });
  } else {
    html += '<p class="empty-hint">No matching Hero found in the Library for this token.</p>';
  }

  html += `<label class="field-label" style="margin-top:16px;">Generic Twist Library</label>
    <div class="tracker-preset-row">
      ${['All', 'Minor', 'Major'].map(s => `<button class="btn btn-small ${twistFilterSeverity === s ? 'btn-accent' : 'btn-ghost'}" onclick="setTwistFilter('${s}')">${s}</button>`).join('')}
    </div>
    <div id="twistLibraryList"></div>`;

  el.innerHTML = html;
  renderTwistLibraryList();
}
function setTwistFilter(sev) {
  twistFilterSeverity = sev;
  const el = document.getElementById('twistPickerBody');
  el.querySelectorAll('.tracker-preset-row .btn').forEach(b => b.classList.remove('btn-accent'));
  renderTwistLibraryList();
  // re-highlight the active filter button
  el.querySelectorAll('.tracker-preset-row .btn').forEach(b => {
    if (b.textContent.trim() === sev) { b.classList.add('btn-accent'); b.classList.remove('btn-ghost'); }
    else { b.classList.remove('btn-accent'); b.classList.add('btn-ghost'); }
  });
}
function renderTwistLibraryList() {
  const el = document.getElementById('twistLibraryList');
  if (!el) return;
  const list = state.twists.filter(tw => twistFilterSeverity === 'All' || tw.Severity === twistFilterSeverity || tw.Severity === 'Any');
  el.innerHTML = list.length ? list.map(tw => `
    <div class="challenge-path-row" style="align-items:flex-start;">
      <span><b>${escHtml(tw.Name)}</b> <span class="token-type-chip challenge-type-chip" style="font-size:8px;">${escHtml(tw.EffectType)}</span>
        <br><span style="font-family:var(--font-data);font-size:10px;">${tw.Formula ? escHtml(tw.Formula) + ' — ' : ''}${escHtml(tw.Description)}</span></span>
    </div>`).join('') : '<p class="empty-hint">No twists match this filter.</p>';
}

/* ============================================================
   Dice Pool Roller — GM Console only, per-roll "Reveal to Players"
   Pool = 1 Power die + 1 Quality die + 1 Status die, sorted into
   Min/Mid/Max by rolled VALUE. Effect Die defaults to Mid.
   ============================================================ */

const EFFECT_DIE_OPTIONS = [
  { key: 'mid', label: 'Mid (default)' },
  { key: 'max', label: 'Max' },
  { key: 'min', label: 'Min' },
  { key: 'max+min', label: 'Max + Min' },
  { key: 'max+mid', label: 'Max + Mid' },
  { key: 'mid+min', label: 'Mid + Min' },
  { key: 'max+mid+min', label: 'Max + Mid + Min' },
];

let rollerState = null; // { tokenId, kind, powers:[{name,die}], qualities:[{name,die}], pIdx, qIdx, statusDie, statusLabel, lastRoll }

function openDiceRoller(tokenId) {
  const t = findTok(tokenId);
  const libRow = t.kind === 'hero' ? state.heroes.find(h => h.Slug === t.slug) : state.villains.find(v => v.Slug === t.slug);
  if (!libRow) { toast('No Library entry found for this token.'); return; }

  const powers = [];
  const qCount = 6;
  const pCount = t.kind === 'hero' ? 6 : 5;
  for (let i = 1; i <= pCount; i++) if (libRow['Power' + i] && libRow['PowerDie' + i]) {
    const dn = String(libRow['Power' + i + 'DisplayName'] || '').trim();
    powers.push({ name: libRow['Power' + i], die: libRow['PowerDie' + i], displayName: dn });
  }
  const qualities = [];
  for (let i = 1; i <= qCount; i++) if (libRow['Quality' + i] && libRow['QualityDie' + i]) {
    const dn = String(libRow['Quality' + i + 'DisplayName'] || '').trim();
    qualities.push({ name: libRow['Quality' + i], die: libRow['QualityDie' + i], displayName: dn });
  }

  let statusDie = '', statusLabel = '';
  if (t.kind === 'hero') {
    const band = computeHeroStatus(Number(libRow.MaxHealth) || t.maxHealth || 20, t.currentHealth, state.scene);
    statusDie = { green: libRow.GreenStatusDie, yellow: libRow.YellowStatusDie, red: libRow.RedStatusDie, out: libRow.RedStatusDie }[band.band] || '';
    statusLabel = band.band.toUpperCase() + (band.band !== band.personalBand ? ' (Scene Tracker)' : ' zone') + ' (auto)';
  } else {
    const status = computeVillainStatus(libRow, t);
    statusDie = status.die;
    statusLabel = status.source;
  }

  const abilities = t.kind === 'hero'
    ? sortHeroAbilitiesGyroAlpha(state.abilities.filter(a => abilityOwnerSlug(a) === t.slug))
    : (t.kind === 'villain'
      ? (state.abilities || []).filter(a => abilityOwnerSlug(a) === t.slug && !['Upgrade','Mastery'].includes((a.Zone||'').trim()))
      : []);
  rollerState = { tokenId, kind: t.kind, libRow, powers, qualities, pIdx: 0, qIdx: 0, statusDie, statusLabel, lastRoll: null, abilities, abilityIdx: '', pendingEffectKey: 'mid' };
  document.getElementById('diceRollerTitle').textContent = 'Dice Pool — ' + t.name;
  renderDiceRollerBody();
  document.getElementById('diceRollerModal').classList.remove('hidden');
}
function closeDiceRoller() { document.getElementById('diceRollerModal').classList.add('hidden'); }

function renderDiceRollerBody() {
  const rs = rollerState;
  const el = document.getElementById('diceRollerBody');
  if (rs.powers.length === 0 || rs.qualities.length === 0) {
    el.innerHTML = '<p class="empty-hint">This token\'s Library entry has no Powers/Qualities on file yet — add them in the Library first.</p>';
    return;
  }
  let html = '';
  if ((rs.kind === 'hero' || rs.kind === 'villain') && rs.abilities.length) {
    const selected = rs.abilityIdx === '' ? null : rs.abilities[Number(rs.abilityIdx)];
    html += `
    <label class="field-label" style="margin-top:0;">Ability (optional — fully resolves the ability)</label>
    <select id="rollerAbilitySelect" onchange="onAbilitySelected(this.value)">
      <option value="">— none, roll freeform —</option>
      ${rs.abilities.map((a, i) => `<option value="${i}" ${String(i) === String(rs.abilityIdx) ? 'selected' : ''}>${escHtml(a.Zone || '')} — ${escHtml(heroAbilityShownName(a))}</option>`).join('')}
    </select>`;
    if (selected) {
      html += `<div class="ability-card" style="margin:8px 0;"><div class="ability-card-name">[${escHtml(selected.Type)}] "${escHtml(heroAbilityShownName(selected))}"</div><p class="ability-card-body">${escHtml(selected.GameText)}</p></div>`;
    }
  }
  html += `
    <label class="field-label" style="margin-top:0;">Power</label>
    <select id="rollerPowerSelect" onchange="rollerState.pIdx=Number(this.value)">
      ${rs.powers.map((p, i) => `<option value="${i}" ${i === rs.pIdx ? 'selected' : ''}>${escHtml(p.displayName || p.name)} (${p.die})</option>`).join('')}
    </select>
    <label class="field-label">Quality</label>
    <select id="rollerQualitySelect" onchange="rollerState.qIdx=Number(this.value)">
      ${rs.qualities.map((q, i) => `<option value="${i}" ${i === rs.qIdx ? 'selected' : ''}>${escHtml(q.displayName || q.name)} (${q.die})</option>`).join('')}
    </select>
    <label class="field-label">Status Die</label>`;
  if (rs.kind === 'villain') {
    const slots = [1, 2, 3, 4, 5].map(n => ({ label: rs.libRow['Status' + n + 'Label'], die: rs.libRow['Status' + n + 'Die'] })).filter(s => s.label || s.die);
    html += `<select id="rollerStatusSelect" onchange="const s=this.value.split('|'); rollerState.statusLabel=s[0]; rollerState.statusDie=s[1];">
      ${slots.map(s => `<option value="${escAttr(s.label)}|${s.die}" ${s.die === rs.statusDie ? 'selected' : ''}>${escHtml(s.label || '(unlabeled)')} — ${s.die || '?'}</option>`).join('')}
    </select>`;
  } else {
    html += `<div class="die-row"><span class="die-badge ${rs.statusDie || 'd8'}">${rs.statusDie || '?'}</span><span class="die-row-label">${escHtml(rs.statusLabel)}</span></div>`;
  }
  html += `<button class="btn btn-accent" style="margin-top:14px;" onclick="rollDicePool()">Roll the Pool</button>
    <div id="rollerResult"></div>`;
  el.innerHTML = html;
}

function onAbilitySelected(value) {
  const rs = rollerState;
  rs.abilityIdx = value;
  if (value === '') { renderDiceRollerBody(); return; }
  const ability = rs.abilities[Number(value)];
  const dieSourceName = (ability.DieSource || '').trim().toLowerCase();
  const pMatch = rs.powers.findIndex(p => p.name.toLowerCase() === dieSourceName);
  if (pMatch >= 0) rs.pIdx = pMatch;
  const qMatch = rs.qualities.findIndex(q => q.name.toLowerCase() === dieSourceName);
  if (qMatch >= 0) rs.qIdx = qMatch;
  rs.pendingEffectKey = ability.EffectDieHint || 'mid';
  renderDiceRollerBody();
}

function rollDicePool() {
  const rs = rollerState;
  const power = rs.powers[rs.pIdx], quality = rs.qualities[rs.qIdx];
  const pSize = Number((power.die || 'd6').replace('d', ''));
  const qSize = Number((quality.die || 'd6').replace('d', ''));
  const sSize = Number((rs.statusDie || 'd8').replace('d', ''));
  if (!rs.statusDie) { toast('No Status die set for this token -- fill it in on the Library first.'); return; }

  const dice = [
    { source: 'Power (' + power.name + ')', size: pSize, value: rollDie(pSize) },
    { source: 'Quality (' + quality.name + ')', size: qSize, value: rollDie(qSize) },
    { source: 'Status', size: sSize, value: rollDie(sSize) },
  ];
  const sorted = [...dice].sort((a, b) => a.value - b.value); // ties keep original (Power,Quality,Status) order
  const [min, mid, max] = sorted;
  rs.lastRoll = { power, quality, statusDie: rs.statusDie, min, mid, max, effectKey: rs.pendingEffectKey || 'mid' };
  renderRollerResult();
  const t = findTok(rs.tokenId);
  if (t) {
    logActivity({ id: t.id, name: t.name, kind: t.kind }, 'Roll', null,
      `Rolled ${power.name}/${quality.name}/Status`,
      { power: power.name, quality: quality.name, statusDie: rs.statusDie, min: min.value, mid: mid.value, max: max.value });
  }
}

function effectDieValue(min, mid, max, key) {
  const parts = key.split('+');
  const vals = { min: min.value, mid: mid.value, max: max.value };
  return parts.reduce((sum, p) => sum + vals[p], 0);
}
function overcomeOutcome(v) {
  if (v <= 0) return 'Utter, spectacular failure';
  if (v <= 3) return 'Fail, or succeed with a MAJOR twist';
  if (v <= 7) return 'Succeed with a MINOR twist';
  if (v <= 11) return 'Complete success';
  return 'Success beyond expectations';
}
function boostHinderMod(v) {
  if (v <= 0) return 'No mod created';
  if (v <= 3) return '±1';
  if (v <= 7) return '±2';
  if (v <= 11) return '±3';
  return '±4';
}

function renderRollerResult() {
  const rs = rollerState;
  const { min, mid, max } = rs.lastRoll;
  const effVal = effectDieValue(min, mid, max, rs.lastRoll.effectKey);
  document.getElementById('rollerResult').innerHTML = `
    <div class="attack-result">
      <div class="die-row">
        <span class="die-badge d${min.size}" title="${escAttr(min.source)}">${min.value}</span>
        <span class="die-row-label">Min (${escHtml(min.source)})</span>
      </div>
      <div class="die-row">
        <span class="die-badge d${mid.size}" title="${escAttr(mid.source)}">${mid.value}</span>
        <span class="die-row-label">Mid (${escHtml(mid.source)})</span>
      </div>
      <div class="die-row">
        <span class="die-badge d${max.size}" title="${escAttr(max.source)}">${max.value}</span>
        <span class="die-row-label">Max (${escHtml(max.source)})</span>
      </div>
      <label class="field-label">Effect Die</label>
      <select id="rollerEffectSelect" onchange="rollerState.lastRoll.effectKey=this.value; renderRollerResult();">
        ${EFFECT_DIE_OPTIONS.map(o => `<option value="${o.key}" ${o.key === rs.lastRoll.effectKey ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select>
      <div class="attack-roll-display" style="margin-top:8px;">Effect Die = ${effVal}</div>
      <div style="font-family:var(--font-data);font-size:11px;margin-top:6px;line-height:1.6;">
        <b>Attack damage:</b> ${effVal}<br>
        <b>Overcome:</b> ${overcomeOutcome(effVal)}<br>
        <b>Boost/Hinder:</b> ${boostHinderMod(effVal)}
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;">
        <button class="btn btn-small btn-accent" onclick="revealCurrentRoll()">Reveal to Players</button>
        <button class="btn btn-small btn-ghost" onclick="clearRevealedRollUI()">Hide from Players</button>
      </div>
    </div>`;
}

async function revealCurrentRoll() {
  const t = findTok(rollerState.tokenId);
  const rs = rollerState;
  const { min, mid, max } = rs.lastRoll;
  const effVal = effectDieValue(min, mid, max, rs.lastRoll.effectKey);
  await apiPutRevealedRoll({
    tokenName: t.name,
    min: min.value, mid: mid.value, max: max.value,
    minSize: min.size, midSize: mid.size, maxSize: max.size,
    effectLabel: EFFECT_DIE_OPTIONS.find(o => o.key === rs.lastRoll.effectKey).label,
    effectValue: effVal,
    timestamp: Date.now(),
  });
  toast('Revealed to Player Display.');
}
async function clearRevealedRollUI() {
  await apiClearRevealedRoll();
  toast('Cleared from Player Display.');
}

/* ============================================================
   Issues: a session = an ordered set of Scenes + connecting notes
   ============================================================ */

state.issuesList = [];
state.issue = null;
state.editingIssueSlug = null;

async function apiListIssues() { const r = await fetch('/api/issues'); return r.ok ? await r.json() : []; }
async function apiGetIssue(slug) { const r = await fetch(`/api/issues/${encodeURIComponent(slug)}`); return r.ok ? await r.json() : null; }
async function apiSaveIssue(slug, issue) { await fetch(`/api/issues/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(issue, null, 2) }); }
async function apiDeleteIssue(slug) { await fetch(`/api/issues/${encodeURIComponent(slug)}`, { method: 'DELETE' }); }
async function apiListCollections() { const r = await fetch('/api/collections'); return r.ok ? await r.json() : []; }
async function apiGetCollection(slug) { const r = await fetch(`/api/collections/${encodeURIComponent(slug)}`); return r.ok ? await r.json() : null; }
async function apiSaveCollection(slug, coll) { await fetch(`/api/collections/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(coll, null, 2) }); }
async function apiDeleteCollection(slug) { await fetch(`/api/collections/${encodeURIComponent(slug)}`, { method: 'DELETE' }); }

function blankIssue(name) { return { name: name || 'New Issue', sceneSlugs: [], villainSlugs: [], heroSlugs: [], minionSlugs: [], notes: '', active: true }; }

async function refreshIssuesList() { state.issuesList = await apiListIssues(); }
async function refreshCollectionsList() { state.collectionsList = await apiListCollections(); }

function uniqueCollectionSlug(base) {
  let candidate = base, n = 1;
  const taken = new Set((state.collectionsList || []).map(c => c.slug));
  while (taken.has(candidate)) candidate = base + '-' + (++n);
  return candidate;
}
function blankCollection(name) { return { name: name || 'New Collection', issueSlugs: [] }; }
async function newCollection() {
  const name = prompt('Collection name:');
  if (!name) return;
  const slug = uniqueCollectionSlug(slugify(name));
  await apiSaveCollection(slug, blankCollection(name));
  await refreshCollectionsList();
  editCollection(slug);
}
async function deleteCollection(slug) {
  if (!confirm('Delete this collection? Issues inside it are not deleted.')) return;
  await apiDeleteCollection(slug);
  await refreshCollectionsList();
  fillLibCollectionFilter();
  if (currentLibTab === 'issues-scenes') renderIssuesScenesTable();
}
async function renameCollection(slug, name) {
  const coll = (state.collectionsList || []).find(c => c.slug === slug);
  if (!coll) return;
  coll.name = name;
  await apiSaveCollection(slug, coll);
}
async function editCollection(slug) {
  state.editingCollectionSlug = slug;
  state.collection = await apiGetCollection(slug);
  if (!state.collection) state.collection = blankCollection(slug);
  const nameOf = (s) => (state.issuesList.find(x => x.slug === s) || {}).name || s;
  state.collection.issueSlugs = (state.collection.issueSlugs || []).slice().sort((a, b) => naturalNameSort(nameOf(a), nameOf(b)));
  document.getElementById('libraryListView').classList.add('hidden');
  document.getElementById('issueEditorView').classList.add('hidden');
  document.getElementById('sceneEditorView').classList.add('hidden');
  document.getElementById('collectionEditorView').classList.remove('hidden');
  renderCollectionEditor();
}
function backToCollectionsList() {
  showCollectionsList();
}
const saveCollectionDebounced = debounce(async () => {
  if (!state.editingCollectionSlug) return;
  await apiSaveCollection(state.editingCollectionSlug, state.collection);
  const status = document.getElementById('collectionSaveStatus');
  if (status) status.textContent = 'Saved ✓';
}, 500);
function renderCollectionEditor() {
  const coll = state.collection;
  const el = document.getElementById('collectionEditorView');
  const nameOf = (s) => (state.issuesList.find(x => x.slug === s) || {}).name || s;
  const attachedNames = (coll.issueSlugs || []).map(nameOf);
  const taken = new Set((state.collectionsList || []).flatMap(c => c.issueSlugs || []));
  const addable = state.issuesList.filter(i => !taken.has(i.slug)).sort((a, b) => naturalNameSort(a.name, b.name));
  el.innerHTML = `
    <div class="scene-editor-header">
      <button class="btn btn-ghost" onclick="backToCollectionsList()">&larr; Back to Issues &amp; Scenes</button>
      <span id="collectionSaveStatus" class="save-status"></span>
    </div>
    <label class="field-label">Collection Name</label>
    <input type="text" class="scene-name-input" value="${escAttr(coll.name)}" onchange="updateCollectionField('name', this.value)">

    <label class="field-label">Issues (in order)</label>
    <div>
      ${(coll.issueSlugs || []).map((s, i) => `
        <div class="location-edit-row">
          <span style="flex:1;">${i + 1}. ${escHtml(attachedNames[i])}</span>
          <button class="btn btn-small btn-ghost" onclick="moveCollectionIssue(${i},-1)">&uarr;</button>
          <button class="btn btn-small btn-ghost" onclick="moveCollectionIssue(${i},1)">&darr;</button>
          <button class="btn btn-small btn-danger" onclick="removeCollectionIssue(${i})">Remove</button>
        </div>`).join('') || '<p class="empty-hint">No issues attached yet.</p>'}
    </div>
    <select id="collectionIssueAdd">
      <option value="">Add an Issue…</option>
      ${addable.map(i => `<option value="${i.slug}">${escHtml(i.name)}</option>`).join('')}
    </select>
    <button class="btn btn-small btn-accent" onclick="addCollectionIssue()">Add</button>

    <div class="editor-footer-actions">
      <button type="button" class="btn btn-danger" onclick="deleteCollectionFromEditor()">Delete Collection</button>
    </div>
  `;
}
function updateCollectionField(field, value) { state.collection[field] = value; saveCollectionDebounced(); }
function addCollectionIssue() {
  const sel = document.getElementById('collectionIssueAdd');
  if (!sel.value) return;
  state.collection.issueSlugs = state.collection.issueSlugs || [];
  state.collection.issueSlugs.push(sel.value);
  const nameOf = (s) => (state.issuesList.find(x => x.slug === s) || {}).name || s;
  state.collection.issueSlugs.sort((a, b) => naturalNameSort(nameOf(a), nameOf(b)));
  saveCollectionDebounced(); renderCollectionEditor();
}
function removeCollectionIssue(i) {
  state.collection.issueSlugs.splice(i, 1);
  saveCollectionDebounced(); renderCollectionEditor();
}
function moveCollectionIssue(i, delta) {
  const arr = state.collection.issueSlugs;
  const j = i + delta;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  saveCollectionDebounced(); renderCollectionEditor();
}
async function renameIssue(slug, name) {
  const iss = (state.issuesList || []).find(i => i.slug === slug);
  if (!iss) return;
  iss.name = name;
  await apiSaveIssue(slug, iss);
  fillLibIssueFilter();
}
async function toggleIssueScene(issueSlug, sceneSlug, on) {
  const iss = await apiGetIssue(issueSlug);
  if (!iss) return;
  const set = new Set(iss.sceneSlugs || []);
  if (on) set.add(sceneSlug); else set.delete(sceneSlug);
  iss.sceneSlugs = [...set];
  await apiSaveIssue(issueSlug, iss);
  await refreshIssuesList();
  if (currentLibTab === 'issues-scenes') renderIssuesScenesTable();
}
async function renameScene(slug, name) {
  const sc = await apiGetScene(slug);
  if (!sc) return;
  sc.name = name;
  await apiSaveScene(slug, sc);
  await refreshScenesList();
  if (currentLibTab === 'issues-scenes') renderIssuesScenesTable();
}

async function newIssue(openEditor) {
  const name = prompt('Issue name (e.g. "Issue #4: The Tarama Lab Breach"):');
  if (!name) return;
  const slug = uniqueIssueSlug(slugify(name));
  await apiSaveIssue(slug, blankIssue(name));
  await refreshIssuesList();
  fillLibIssueFilter();
  if (openEditor === false) {
    if (currentLibTab === 'issues-scenes') renderIssuesScenesTable();
  } else editIssue(slug);
}
function uniqueIssueSlug(base) {
  let candidate = base, n = 1;
  const taken = new Set(state.issuesList.map(i => i.slug));
  while (taken.has(candidate)) candidate = base + '-' + (++n);
  return candidate;
}
async function deleteIssue(slug) {
  if (!confirm('Delete this issue? This cannot be undone.')) return;
  await apiDeleteIssue(slug);
  await refreshIssuesList();
  fillLibIssueFilter();
  renderIssuesList();
}
async function editIssue(slug) {
  state.editingIssueSlug = slug;
  state.issue = await apiGetIssue(slug);
  document.getElementById('libraryListView').classList.add('hidden');
  document.getElementById('collectionEditorView').classList.add('hidden');
  document.getElementById('sceneEditorView').classList.add('hidden');
  document.getElementById('issueEditorView').classList.remove('hidden');
  renderIssueEditor();
}
function backToIssuesList() {
  showCollectionsList();
  state.editingIssueSlug = null;
}
const saveIssueDebounced = debounce(async () => {
  if (!state.editingIssueSlug) return;
  await apiSaveIssue(state.editingIssueSlug, state.issue);
  const status = document.getElementById('issueSaveStatus');
  if (status) status.textContent = 'Saved ✓';
}, 500);

function renderIssueEditor() {
  const iss = state.issue;
  const el = document.getElementById('issueEditorView');
  const attachedNames = iss.sceneSlugs.map(s => (state.scenesList.find(x => x.slug === s) || {}).name || s);
  el.innerHTML = `
    <div class="scene-editor-header">
      <button class="btn btn-ghost" onclick="backToIssuesList()">&larr; Back to Issues &amp; Scenes</button>
      <span id="issueSaveStatus" class="save-status"></span>
    </div>
    <label class="field-label">Issue Name</label>
    <input type="text" class="scene-name-input" value="${escAttr(iss.name)}" onchange="updateIssueField('name', this.value)">

    <label class="field-label">Scenes (in order)</label>
    <div id="issueScenesList">
      ${iss.sceneSlugs.map((s, i) => `
        <div class="location-edit-row">
          <span style="flex:1;">${i + 1}. ${escHtml(attachedNames[i])}</span>
          <button class="btn btn-small btn-ghost" onclick="moveIssueScene(${i},-1)">&uarr;</button>
          <button class="btn btn-small btn-ghost" onclick="moveIssueScene(${i},1)">&darr;</button>
          <button class="btn btn-small btn-danger" onclick="removeIssueScene(${i})">Remove</button>
        </div>`).join('') || '<p class="empty-hint">No scenes attached yet.</p>'}
    </div>
    <select id="issueSceneAdd">
      <option value="">Add a Scene…</option>
      ${state.scenesList.filter(s => !iss.sceneSlugs.includes(s.slug)).map(s => `<option value="${s.slug}">${escHtml(s.name)}</option>`).join('')}
    </select>
    <button class="btn btn-small btn-accent" onclick="addIssueScene()">Add</button>

    <label class="field-label">Notes <span class="gm-only-badge" style="background:var(--accent);">Social/Montage beats, prep notes, connecting narration</span></label>
    <textarea class="gm-notes-textarea" onchange="updateIssueField('notes', this.value)">${escHtml(iss.notes)}</textarea>

    <div class="editor-footer-actions">
      <button type="button" class="btn btn-danger" onclick="deleteIssueFromEditor()">Delete Issue</button>
    </div>
  `;
}
function updateIssueField(field, value) { state.issue[field] = value; saveIssueDebounced(); }
function addIssueScene() {
  const sel = document.getElementById('issueSceneAdd');
  if (!sel.value) return;
  state.issue.sceneSlugs.push(sel.value);
  saveIssueDebounced(); renderIssueEditor();
}
function removeIssueScene(i) { state.issue.sceneSlugs.splice(i, 1); saveIssueDebounced(); renderIssueEditor(); }
function moveIssueScene(i, delta) {
  const arr = state.issue.sceneSlugs;
  const j = i + delta;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  saveIssueDebounced(); renderIssueEditor();
}

async function init() {
  document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
  document.querySelectorAll('.lib-tab-btn').forEach(b => b.addEventListener('click', () => switchLibTab(b.dataset.lib)));
  document.getElementById('addRowBtn').addEventListener('click', () => addRow(currentLibTab));
  const libFilt = document.getElementById('libIssueFilter');
  if (libFilt) libFilt.addEventListener('change', () => renderLibraryTable(currentLibTab));
  const libCollFilt = document.getElementById('libCollectionFilter');
  if (libCollFilt) libCollFilt.addEventListener('change', () => {
    fillLibIssueFilter();
    renderLibraryTable(currentLibTab);
  });
  const libActive = document.getElementById('libActiveFilter');
  if (libActive) libActive.addEventListener('change', () => renderLibraryTable(currentLibTab));
  const twistSev = document.getElementById('twistSeverityFilter');
  const twistEff = document.getElementById('twistEffectFilter');
  if (twistEff) {
    twistEff.innerHTML = '<option value="all">All effect types</option>' +
      TWIST_EFFECT_TYPES.map(t => `<option value="${escAttr(t)}">${escHtml(t)}</option>`).join('');
  }
  if (twistSev) twistSev.addEventListener('change', () => renderLibraryTable('twists'));
  if (twistEff) twistEff.addEventListener('change', () => renderLibraryTable('twists'));
  document.getElementById('spawnType').addEventListener('change', refreshSpawnOptions);
  document.getElementById('spawnBtn').addEventListener('click', spawnToken);
  const addAllBtn = document.getElementById('addAllPCsBtn');
  if (addAllBtn) addAllBtn.addEventListener('click', addAllPCsToScene);
  document.getElementById('clearSceneBtn').addEventListener('click', () => {
    if (!state.scene || !confirm('Clear all tokens from the current scene?')) return;
    state.scene.tokens = [];
    saveSceneDebounced(); renderTokens();
  });
  document.getElementById('resetLtDiceBtn').addEventListener('click', resetLieutenantDice);
  document.getElementById('trackerAdvanceBtn').addEventListener('click', () => advanceTracker(1));
  document.getElementById('trackerRetreatBtn').addEventListener('click', () => advanceTracker(-1));
  document.getElementById('rulesSearchInput').addEventListener('input', (e) => renderRulesList(e.target.value));
  document.getElementById('notesModalClose').addEventListener('click', closeNotes);
  document.getElementById('notesModalSave').addEventListener('click', saveNotes);
  document.getElementById('attackModalClose').addEventListener('click', closeAttack);
  document.getElementById('modModalClose').addEventListener('click', closeModCreate);
  const vrBtn = document.getElementById('villainRefBtn');
  if (vrBtn) vrBtn.addEventListener('click', openReferenceModal);
  document.getElementById('referenceModalClose').addEventListener('click', closeReferenceModal);
  document.getElementById('healthCalcClose').addEventListener('click', closeHealthCalc);
  document.getElementById('twistPickerClose').addEventListener('click', closeTwistPicker);
  document.getElementById('diceRollerClose').addEventListener('click', closeDiceRoller);
  document.getElementById('abilitiesModalClose').addEventListener('click', closeAbilities);
  populateApproachArchetypeDatalists();

  const nameEl = document.getElementById('folderLabel');
  try { nameEl.textContent = await apiCampaignName(); } catch (e) { nameEl.textContent = 'Not connected to server'; }

  await loadLibrary();
  await refreshScenesList();
  await refreshIssuesList();
  await refreshCollectionsList();
  fillLibCollectionFilter();
  fillLibIssueFilter();
  renderLibraryTable(currentLibTab);
  refreshSpawnOptions();

  const active = await apiGetActiveScene();
  if (active.slug) {
    state.activeSlug = active.slug;
    state.turnMarks = {};
    state.scene = await apiGetScene(active.slug);
    if (state.scene) {
      state.scene.__slug = active.slug;
      (state.scene.tokens || []).forEach(t => { delete t.turnNumber; });
    }
  }
  renderBoard();

  // TV Mode toggle (defaults ON, updates the Player Display link)
  const tvToggle = document.getElementById('tvModeToggle');
  if (tvToggle) {
    tvToggle.checked = true;
    updatePlayerDisplayLink();
    tvToggle.addEventListener('change', updatePlayerDisplayLink);
  }
}

function updatePlayerDisplayLink() {
  const link = document.getElementById('playerDisplayLink');
  const toggle = document.getElementById('tvModeToggle');
  if (!link || !toggle) return;
  const on = toggle.checked;
  link.href = `/display.html?tv=${on ? '1' : '0'}`;
}

document.addEventListener('DOMContentLoaded', init);

// ---------------- Sheets menu (player digital character sheets, Phase 1) ----------------

async function renderSheetsView() {
  const [heroesCsv, keys, activity, alerts] = await Promise.all([
    fetch('/api/csv/heroes').then(r => r.text()),
    fetch('/api/sheet-keys').then(r => r.json()),
    fetch('/api/sheet-activity').then(r => r.json()),
    fetch('/api/alerts').then(r => r.json()),
  ]);
  const heroes = (Papa.parse(heroesCsv, { header: true, skipEmptyLines: true }).data || [])
    .filter(h => (h.Slug || '').trim() && String(h.Active || '').trim().toLowerCase() !== 'no');
  window.__sheetsHeroes = heroes;

  // Keys & Links table
  const keysPanel = document.getElementById('sheetKeysPanel');
  const rows = heroes.map(h => {
    const slug = h.Slug.trim();
    const key = keys[slug] || '';
    const link = key ? `${location.origin}/player-sheet.html?hero=${encodeURIComponent(slug)}&key=${encodeURIComponent(key)}` : '';
    return `<tr>
      <td>${escAttr(h.Name || slug)}</td>
      <td>${escAttr(h.Player || '')}</td>
      <td>${key ? '<span style="color:var(--accent);">Linked</span>' : '<span class="empty-hint">No key</span>'}</td>
      <td class="no-row-nav">
        <button class="btn btn-small btn-accent" onclick="generateSheetKey('${escAttr(slug)}')">${key ? 'Reset Key' : 'Generate Key'}</button>
        ${key ? `<button class="btn btn-small btn-ghost" onclick="copySheetLink('${escAttr(slug)}')">Copy Link</button>` : ''}
        <button class="btn btn-small btn-ghost" onclick="viewSheetNotes('${escAttr(slug)}', this)">Notes</button>
      </td>
    </tr>`;
  }).join('');
  keysPanel.innerHTML = `<table class="lib-table"><thead><tr>
      <th>Hero</th><th>Player</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="empty-hint">No active heroes.</td></tr>'}</tbody></table>`;

  // Alert composer target dropdown
  const targetSel = document.getElementById('alertTarget');
  const prev = targetSel.value;
  targetSel.innerHTML = '<option value="all">All players</option>' +
    heroes.map(h => `<option value="${escAttr(h.Slug.trim())}">${escAttr(h.Name || h.Slug)} (${escAttr(h.Player || '')})</option>`).join('');
  if ([...targetSel.options].some(o => o.value === prev)) targetSel.value = prev;

  // Sent alerts
  const listPanel = document.getElementById('alertListPanel');
  const items = (alerts || []).slice().reverse().map(a => `
    <div class="alert-hist" style="border-left-color:var(--gold);">
      ${escAttr(a.text)} <span class="empty-hint">→ ${a.targets === 'all' ? 'All players' : escAttr((a.targets || []).join(', '))}</span>
      <div class="empty-hint" style="font-size:11px;">${escAttr(a.ts || '')} · dismissed by ${((a.dismissed || []).length)} · <a href="#" onclick="deleteAlert('${escAttr(a.id)}');return false;" style="color:var(--text-lo);">delete</a></div>
    </div>`).join('');
  listPanel.innerHTML = items || '<span class="empty-hint">No alerts sent yet.</span>';

  // Change feed (player-initiated only, newest first)
  const actPanel = document.getElementById('sheetActivityPanel');
  const heroName = slug => { const h = heroes.find(x => (x.Slug || '').trim() === slug); return h ? (h.Name || slug) : slug; };
  const acts = (activity || []);
  actPanel.innerHTML = acts.map((e, i) => `
    <div class="alert-hist"><b>${escAttr(heroName(e.hero || ''))}</b> — ${escAttr(e.action || '')}${e.detail ? ' <span class="empty-hint">(' + escAttr(e.detail) + ')</span>' : ''}
      <span class="empty-hint" style="float:right;font-size:11px;">${escAttr(e.ts || '')}</span>
      <a href="#" onclick="deleteSheetActivity(${acts.length - 1 - i});return false;" style="color:#8a2b2b;font-size:11px;margin-left:8px;">Delete</a></div>`).join('')
    || '<span class="empty-hint">Nothing yet. Player actions on their sheets will appear here.</span>';
}

async function generateSheetKey(slug) {
  const r = await fetch('/api/sheet-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hero: slug, op: 'generate' }) });
  if (!r.ok) { toast('Key generation failed.'); return; }
  const { key } = await r.json();
  toast('Key generated. Use "Copy Link" to send it.');
  renderSheetsView();
  window.__lastSheetKey = { slug, key };
}

async function copySheetLink(slug) {
  const keys = await fetch('/api/sheet-keys').then(r => r.json());
  const key = keys[slug] || '';
  if (!key) { toast('No key yet — generate one first.'); return; }
  const link = `${location.origin}/player-sheet.html?hero=${encodeURIComponent(slug)}&key=${encodeURIComponent(key)}`;
  try {
    await navigator.clipboard.writeText(link);
    toast('Secret link copied to clipboard.');
  } catch (e) {
    // clipboard can be blocked on non-secure origins — show it instead
    promptCopyText(link);
  }
}

function promptCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:8px;top:8px;width:70%;height:90px;z-index:9999;';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('Link selected/copied.'); } catch (e) { toast('Copy the selected text.'); }
  setTimeout(() => ta.remove(), 4000);
}

async function sendAlert() {
  const text = document.getElementById('alertText').value.trim();
  const target = document.getElementById('alertTarget').value;
  if (!text) { toast('Write a message first.'); return; }
  const body = { op: 'compose', text, targets: target === 'all' ? 'all' : [target] };
  const r = await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { toast('Alert failed.'); return; }
  document.getElementById('alertText').value = '';
  toast('Alert sent.');
  renderSheetsView();
}

async function deleteAlert(id) {
  await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ op: 'delete', id }) });
  renderSheetsView();
}

// Testing helper — removes one change-feed entry (server: DELETE /api/sheet-activity?index=N)
async function deleteSheetActivity(index) {
  await fetch('/api/sheet-activity?index=' + index, { method: 'DELETE' });
  renderSheetsView();
}

async function viewSheetNotes(slug) {
  const text = await fetch('/api/sheet-notes/' + encodeURIComponent(slug)).then(r => r.text());
  document.getElementById('referenceModalBody').innerHTML =
    `<h3 style="font-family:var(--font-display);font-size:22px;">${escAttr(heroNameFromSlug(slug))} — Sheet Notes</h3>` +
    `<pre style="white-space:pre-wrap;font-family:var(--font-body);font-size:14px;">${escAttr(text || '(No notes yet.)')}</pre>`;
  document.getElementById('referenceModal').classList.remove('hidden');
}

function heroNameFromSlug(slug) {
  const h = (window.__sheetsHeroes || []).find(x => (x.Slug || '').trim() === slug);
  return h ? h.Name : slug;
}
