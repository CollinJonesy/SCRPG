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
  'Power1','PowerDie1','Power2','PowerDie2','Power3','PowerDie3','Power4','PowerDie4','Power5','PowerDie5','Power6','PowerDie6',
  'Quality1','QualityDie1','Quality2','QualityDie2','Quality3','QualityDie3','Quality4','QualityDie4','Quality5','QualityDie5','Quality6','QualityDie6',
  'MaxHealth','GreenStatusDie','YellowStatusDie','RedStatusDie','GMControlled',
  'Principle1Name','Principle1Roleplay','Principle1MinorTwist','Principle1MajorTwist',
  'Principle2Name','Principle2Roleplay','Principle2MinorTwist','Principle2MajorTwist'];
const VILLAINS_HEADERS = ['Slug','Name','Approach','Archetype',
  'Power1','PowerDie1','Power2','PowerDie2','Power3','PowerDie3','Power4','PowerDie4','Power5','PowerDie5',
  'Quality1','QualityDie1','Quality2','QualityDie2','Quality3','QualityDie3','Quality4','QualityDie4','Quality5','QualityDie5','Quality6','QualityDie6',
  'MaxHealth','GreenFloor','YellowFloor','RedFloor','GreenStatusDie','YellowStatusDie','RedStatusDie',
  'Status1Label','Status1Die','Status2Label','Status2Die','Status3Label','Status3Die','Status4Label','Status4Die','Status5Label','Status5Die'];
const MINIONS_HEADERS = ['Slug','Name','Type','Die','Faction','PerHero'];
const ENVIRONMENTS_HEADERS = ['Slug','Name','Trait1','TraitDie1','Trait2','TraitDie2','Trait3','TraitDie3'];
const LOCATIONS_HEADERS = ['Slug','Name','EnvironmentSlug'];
const TWISTS_HEADERS = ['Slug','Name','EffectType','Severity','Formula','Description'];
const ABILITIES_HEADERS = ['HeroSlug','Zone','Name','Type','GameText','RollType','DieSource','EffectDieHint'];
const TWIST_EFFECT_TYPES = [
  'Story Consequence', 'Story Complication (Later)', 'Hinder', 'Boost (Enemies)',
  'Damage (Allies)', 'Defend (Enemies)', 'Add Threats', 'Create Challenge',
  'Advance Scene Tracker', 'Combination',
];

const LIB_HEADERS = { heroes: HEROES_HEADERS, villains: VILLAINS_HEADERS, minions: MINIONS_HEADERS, environments: ENVIRONMENTS_HEADERS, locations: LOCATIONS_HEADERS, twists: TWISTS_HEADERS, abilities: ABILITIES_HEADERS };
function libHeaders(kind) { return LIB_HEADERS[kind]; }

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
  heroes: [], villains: [], minions: [], environments: [], locations: [], twists: [], abilities: [],
  scenesList: [],       // [{slug, name}]
  issuesList: [],
  collectionsList: [],
  activeSlug: null,     // slug of scene currently loaded on the Board
  scene: null,          // the loaded scene object (definition + live state combined)
  editingSlug: null,    // slug currently open in the Scene Editor (may differ from activeSlug)
  turnMarks: {},        // tokenId -> round order; memory only, not saved
};

let currentLibTab = 'heroes';
let currentCollTab = 'collections';
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
  const cell = (kind, label, val) => interactive
    ? `<div class="bhd-stat ${kind}"><span onclick="openModCreate('${t.id}','${kind}')">${label}</span><input type="number" min="0" value="${val}" onclick="event.stopPropagation()" onchange="setBhdDelta('${t.id}','${kind}',this.value)"></div>`
    : `<div class="bhd-stat ${kind}"><span>${label}</span><b>${val}</b></div>`;
  const hasHealth = t.kind === 'hero' || t.kind === 'villain';
  let html = `${cell('boost','BOOST', n.boost)}${cell('hinder','HINDER', n.hinder)}${cell('defend','DEFEND', n.defend)}`;
  if (hasHealth) {
    const hp = Number(t.currentHealth) || 0;
    html += interactive
      ? `<div class="bhd-stat health"><span>HEALTH</span><input type="number" min="0" value="${hp}" onclick="event.stopPropagation()" onchange="setHealth('${t.id}',this.value)"></div>`
      : `<div class="bhd-stat health"><span>HEALTH</span><b>${hp}</b></div>`;
  }
  return `<div class="bhd-row${hasHealth ? ' bhd-row-4' : ''}">${html}</div>`;
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
function escAttr(v) { return String(v ?? '').replace(/"/g, '&quot;'); }
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
  const kinds = ['heroes','villains','minions','environments','locations','twists','abilities'];
  for (const k of kinds) {
    try { state[k] = await apiReadCsv(k); }
    catch (e) { if (!Array.isArray(state[k])) state[k] = []; }
  }
}

const saveLibraryDebounced = debounce(async (kind) => {
  ['saveStatus','collSaveStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = 'Saving…';
  });
  await apiWriteCsv(kind, libHeaders(kind), state[kind]);
  const statusMsg = 'Saved to ' + kind + '.csv ✓';
  ['saveStatus','collSaveStatus'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = statusMsg;
  });
  refreshSpawnOptions();
}, 500);

function dieOptions(selected) {
  return DICE_LADDER.map(d => `<option value="d${d}" ${selected === 'd' + d ? 'selected' : ''}>d${d}</option>`).join('');
}

function issueFieldFor(kind) {
  return { heroes: 'heroSlugs', villains: 'villainSlugs', minions: 'minionSlugs', environments: 'environmentSlugs', locations: 'locationSlugs', twists: 'twistSlugs' }[kind] || '';
}
function rowIssueCell(kind, slug) {
  const field = issueFieldFor(kind);
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
  fillLibIssueFilter();
  if (currentCollTab === 'locations') renderLibraryTable('locations');
  else renderLibraryTable(currentLibTab);
}
function fillLibIssueFilter() {
  ['libIssueFilter','collIssueFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const cur = el.value || 'all';
    el.innerHTML = '<option value="all">All issues</option>' +
      (state.issuesList || []).map(i => `<option value="${i.slug}">${escHtml(i.name)}</option>`).join('');
    el.value = [...el.options].some(o => o.value === cur) ? cur : 'all';
  });
}
function renderLibraryTable(kind) {
  const panel = document.getElementById(kind + 'Panel');
  if (!panel) return;
  if (!Array.isArray(state[kind])) state[kind] = [];
  const allRows = state[kind];
  const filterId = kind === 'locations' ? 'collIssueFilter' : 'libIssueFilter';
  const filt = (document.getElementById(filterId) || {}).value || 'all';
  const iss = filt === 'all' ? null : (state.issuesList || []).find(i => i.slug === filt);
  function rowVisible(row) {
    if (kind === 'twists') {
      const sev = (document.getElementById('twistSeverityFilter') || {}).value || 'all';
      const eff = (document.getElementById('twistEffectFilter') || {}).value || 'all';
      if (sev !== 'all' && row.Severity !== sev) return false;
      if (eff !== 'all' && row.EffectType !== eff) return false;
      return true;
    }
    if (filt === 'all') return true;
    if (kind === 'abilities') return ((iss && iss.heroSlugs) || []).includes(row.HeroSlug);
    const field = issueFieldFor(kind);
    if (!field) return true;
    return ((iss && iss[field]) || []).includes(row.Slug);
  }
  let theadCols;
  if (kind === 'heroes') {
    theadCols = ['Name','P1','Die','P2','Die','P3','Die','P4','Die','P5','Die','P6','Die','Q1','Die','Q2','Die','Q3','Die','Q4','Die','Q5','Die','Q6','Die','MaxHP','GreenDie','YellowDie','RedDie','GM Roll','Principles','Notes','Portrait','Issues',''];
  } else if (kind === 'villains') {
    theadCols = ['Name','Approach','Archetype','P1','Die','P2','Die','P3','Die','P4','Die','P5','Die',
      'Q1','Die','Q2','Die','Q3','Die','Q4','Die','Q5','Die','Q6','Die','MaxHP','Calc','GreenFloor','YellowFloor','RedFloor',
      'GreenDie','YellowDie','RedDie',
      'Status 1','Status 1 Die','Status 2','Status 2 Die','Status 3','Status 3 Die','Status 4','Status 4 Die','Status 5','Status 5 Die','Notes','Portrait','Issues',''];
  } else if (kind === 'minions') {
    theadCols = ['Name','Type','Die','Faction','Notes','Portrait','Issues',''];
  } else if (kind === 'environments') {
    theadCols = ['Name','Trait1','Die','Trait2','Die','Trait3','Die','Notes','Issues',''];
  } else if (kind === 'locations') {
    theadCols = ['Name','Environment','Issues',''];
  } else if (kind === 'twists') {
    theadCols = ['Name','Effect Type','Severity','Formula','Description',''];
  } else {
    theadCols = ['Hero Slug','Zone','Name','Type','Game Text','Roll Type','Die Source','Effect Die Hint',''];
    const dl = document.getElementById('heroSlugsList');
    if (dl) dl.innerHTML = state.heroes.map(h => `<option value="${escAttr(h.Slug)}">`).join('');
  }
  let html = '<table class="lib-table"><thead><tr>' + theadCols.map(c => {
    const wrap = (c === 'Game Text' || c === 'Description') ? ' class="wrap-col"' : '';
    return `<th${wrap}>${c}</th>`;
  }).join('') + (kind === 'twists' || kind === 'abilities' ? '' : '<th class="table-fill"></th>') + '</tr></thead><tbody>';
  allRows.forEach((row, idx) => {
    if (!rowVisible(row)) return;
    html += '<tr>';
    if (kind === 'heroes') {
      html += tdText(kind, idx, 'Name', row.Name, 'name-field');
      for (let i = 1; i <= 6; i++) { html += tdText(kind, idx, 'Power' + i, row['Power' + i]); html += tdDie(kind, idx, 'PowerDie' + i, row['PowerDie' + i]); }
      for (let i = 1; i <= 6; i++) { html += tdText(kind, idx, 'Quality' + i, row['Quality' + i]); html += tdDie(kind, idx, 'QualityDie' + i, row['QualityDie' + i]); }
      html += tdText(kind, idx, 'MaxHealth', row.MaxHealth);
      html += tdDie(kind, idx, 'GreenStatusDie', row.GreenStatusDie);
      html += tdDie(kind, idx, 'YellowStatusDie', row.YellowStatusDie);
      html += tdDie(kind, idx, 'RedStatusDie', row.RedStatusDie);
      html += tdCheckbox(kind, idx, 'GMControlled', row.GMControlled);
      html += `<td><button class="btn btn-small btn-ghost" onclick="openPrinciplesEditor(${idx})">Principles</button></td>`;
      html += `<td><button class="btn btn-small btn-ghost" onclick="openNotes('heroes','${row.Slug}','${escAttr(row.Name)}')">Notes</button></td>`;
      html += portraitCellHtml('heroes', row.Slug);
    } else if (kind === 'villains') {
      html += tdText(kind, idx, 'Name', row.Name, 'name-field');
      html += tdFitInput(kind, idx, 'Approach', row.Approach, 'list="approachesList"');
      html += tdFitInput(kind, idx, 'Archetype', row.Archetype, 'list="archetypesList"');
      for (let i = 1; i <= 5; i++) { html += tdText(kind, idx, 'Power' + i, row['Power' + i]); html += tdDie(kind, idx, 'PowerDie' + i, row['PowerDie' + i]); }
      for (let i = 1; i <= 6; i++) { html += tdText(kind, idx, 'Quality' + i, row['Quality' + i]); html += tdDie(kind, idx, 'QualityDie' + i, row['QualityDie' + i]); }
      html += tdText(kind, idx, 'MaxHealth', row.MaxHealth);
      html += `<td><button class="btn btn-small btn-ghost" onclick="openHealthCalc(${idx})">Calc</button></td>`;
      html += tdText(kind, idx, 'GreenFloor', row.GreenFloor);
      html += tdText(kind, idx, 'YellowFloor', row.YellowFloor);
      html += tdText(kind, idx, 'RedFloor', row.RedFloor);
      html += tdDie(kind, idx, 'GreenStatusDie', row.GreenStatusDie);
      html += tdDie(kind, idx, 'YellowStatusDie', row.YellowStatusDie);
      html += tdDie(kind, idx, 'RedStatusDie', row.RedStatusDie);
      for (let i = 1; i <= 5; i++) { html += tdText(kind, idx, 'Status' + i + 'Label', row['Status' + i + 'Label']); html += tdDie(kind, idx, 'Status' + i + 'Die', row['Status' + i + 'Die']); }
      html += `<td><button class="btn btn-small btn-ghost" onclick="openNotes('villains','${row.Slug}','${escAttr(row.Name)}')">Notes</button></td>`;
      html += portraitCellHtml('villains', row.Slug);
    } else if (kind === 'minions') {
      html += tdText(kind, idx, 'Name', row.Name, 'name-field');
      html += `<td><select onchange="onCellChange('${kind}',${idx},'Type',this.value)">
        <option value="Minion" ${row.Type === 'Minion' ? 'selected' : ''}>Minion</option>
        <option value="Lieutenant" ${row.Type === 'Lieutenant' ? 'selected' : ''}>Lieutenant</option>
      </select></td>`;
      html += tdDie(kind, idx, 'Die', row.Die);
      html += tdText(kind, idx, 'Faction', row.Faction);
      html += `<td><button class="btn btn-small btn-ghost" onclick="openNotes('minions','${row.Slug}','${escAttr(row.Name)}')">Notes</button></td>`;
      html += portraitCellHtml('minions', row.Slug);
    } else if (kind === 'environments') {
      html += tdText(kind, idx, 'Name', row.Name, 'name-field');
      for (let i = 1; i <= 3; i++) { html += tdText(kind, idx, 'Trait' + i, row['Trait' + i]); html += tdDie(kind, idx, 'TraitDie' + i, row['TraitDie' + i]); }
      html += `<td><button class="btn btn-small btn-ghost" onclick="openNotes('environments','${row.Slug}','${escAttr(row.Name)}')">Notes (Twists)</button></td>`;
    } else if (kind === 'locations') {
      html += tdText(kind, idx, 'Name', row.Name, 'name-field');
      html += `<td><select onchange="onCellChange('${kind}',${idx},'EnvironmentSlug',this.value)">
        <option value="">— none —</option>
        ${ (state.environments || []).map(e => `<option value="${escAttr(e.Slug)}" ${row.EnvironmentSlug===e.Slug?'selected':''}>${escHtml(e.Name)}</option>`).join('') }
      </select></td>`;
    } else if (kind === 'twists') {
      html += tdText(kind, idx, 'Name', row.Name, 'name-field');
      html += `<td><select onchange="onCellChange('${kind}',${idx},'EffectType',this.value)">
        ${TWIST_EFFECT_TYPES.map(t => `<option value="${t}" ${row.EffectType === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select></td>`;
      html += `<td><select onchange="onCellChange('${kind}',${idx},'Severity',this.value)">
        <option value="Minor" ${row.Severity === 'Minor' ? 'selected' : ''}>Minor</option>
        <option value="Major" ${row.Severity === 'Major' ? 'selected' : ''}>Major</option>
        <option value="Any" ${row.Severity === 'Any' ? 'selected' : ''}>Any</option>
      </select></td>`;
      html += tdText(kind, idx, 'Formula', row.Formula);
      html += `<td class="wrap-cell"><textarea onchange="onCellChange('${kind}',${idx},'Description',this.value)">${escHtml(row.Description || '')}</textarea></td>`;
    } else {
      html += tdFitInput(kind, idx, 'HeroSlug', row.HeroSlug, 'list="heroSlugsList"');
      html += `<td><select onchange="onCellChange('${kind}',${idx},'Zone',this.value)">
        ${['Green','Yellow','Red','Out'].map(z => `<option value="${z}" ${row.Zone === z ? 'selected' : ''}>${z}</option>`).join('')}
      </select></td>`;
      html += tdText(kind, idx, 'Name', row.Name, 'name-field');
      html += `<td><select onchange="onCellChange('${kind}',${idx},'Type',this.value)">
        <option value="">-</option>
        <option value="A" ${row.Type === 'A' ? 'selected' : ''}>Action</option>
        <option value="R" ${row.Type === 'R' ? 'selected' : ''}>Reaction</option>
        <option value="I" ${row.Type === 'I' ? 'selected' : ''}>Inherent</option>
      </select></td>`;
      html += `<td class="game-text-cell"><textarea onchange="onCellChange('${kind}',${idx},'GameText',this.value)">${escHtml(row.GameText || '')}</textarea></td>`;
      const selectedTypes = parseRollTypes(row.RollType);
      html += `<td class="roll-type-cell">${ABILITY_ICON_ROWS.map(group =>
        `<div class="roll-type-row">${group.map(t =>
          `<label><input type="checkbox" ${selectedTypes.includes(t)?'checked':''} onchange="toggleAbilityRollType(${idx},'${t}',this.checked)"> ${t}</label>`
        ).join('')}</div>`
      ).join('')}</td>`;
      html += tdText(kind, idx, 'DieSource', row.DieSource);
      html += `<td><select onchange="onCellChange('${kind}',${idx},'EffectDieHint',this.value)">
        <option value="">-</option>
        ${EFFECT_DIE_OPTIONS.map(o => `<option value="${o.key}" ${row.EffectDieHint === o.key ? 'selected' : ''}>${o.label}</option>`).join('')}
      </select></td>`;
    }
    if (kind !== 'abilities' && kind !== 'twists') html += rowIssueCell(kind, row.Slug);
    html += `<td><button class="btn btn-small btn-danger" onclick="deleteRow('${kind}',${idx})">Delete</button></td>`;
    if (kind !== 'twists' && kind !== 'abilities') html += '<td class="table-fill"></td>';
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
function onCellChange(kind, idx, field, value) {
  const row = state[kind][idx];
  row[field] = value;
  if (field === 'Name') row.Slug = uniqueLibSlug(kind, slugify(value), row.Slug);
  saveLibraryDebounced(kind);
}
function uniqueLibSlug(kind, base, currentSlug) {
  if (!Array.isArray(state[kind])) state[kind] = [];
  let candidate = base, n = 1;
  const taken = new Set(state[kind].map(r => r.Slug).filter(s => s !== currentSlug));
  while (taken.has(candidate)) candidate = base + '-' + (++n);
  return candidate;
}
function addRow(kind) {
  if (!Array.isArray(state[kind])) state[kind] = [];
  ['libIssueFilter','collIssueFilter','twistSeverityFilter','twistEffectFilter'].forEach(id => {
    const filt = document.getElementById(id);
    if (filt) filt.value = 'all';
  });
  const headers = libHeaders(kind);
  if (!headers) { toast('Unknown library table.'); return; }
  const row = {}; headers.forEach(h => row[h] = '');
  row.Name = 'New Entry';
  row.Slug = uniqueLibSlug(kind, 'new-entry', null);
  if (kind === 'minions') row.Type = 'Minion';
  if (kind === 'twists') { row.EffectType = 'Hinder'; row.Severity = 'Minor'; }
  state[kind].push(row);
  renderLibraryTable(kind);
  saveLibraryDebounced(kind);
}
function deleteRow(kind, idx) {
  if (!confirm('Delete this entry from the Library? This cannot be undone.')) return;
  state[kind].splice(idx, 1);
  renderLibraryTable(kind);
  saveLibraryDebounced(kind);
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
  else { row = state.minions.find(m => m.Slug === t.slug); mdKind = 'minions'; }
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
function heroAbilitiesForToken(t) {
  const row = state.heroes.find(h => h.Slug === t.slug) || {};
  const band = computeHeroStatus(Number(row.MaxHealth) || t.maxHealth || 20, t.currentHealth, state.scene).band;
  const zones = gyroAbilityZones(band);
  return (state.abilities || []).filter(a => a.HeroSlug === t.slug && zones.includes(a.Zone));
}
function villainAbilitiesForToken(t) {
  const key = (t.kind || '') + ':' + (t.slug || '');
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
    const multi = state.scene.tokens.filter(tk => tk.kind === 'villain').length > 1;
    const hideExtras = multi || (state.scene.difficulty || '') === 'Moderate';
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
function boardAbilityListHtml(t) {
  if (t.kind === 'hero') {
    const abs = heroAbilitiesForToken(t);
    if (!abs.length) return '<div class="board-ability-list"><div class="mvc-empty" style="padding:8px;">No abilities in this zone.</div></div>';
    return '<div class="board-ability-list">' + abs.map((a, i) => {
      const z = (a.Zone || '').toLowerCase();
      return `<div class="board-ability" onclick="openHeroAbility('${t.id}',${i})"><span class="board-ability-zone ${escAttr(z)}">${escHtml(a.Zone || '')}</span><span class="board-ability-name">${escHtml(a.Name)}</span></div>`;
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
    return '<div class="board-ability-list">' + abs.map((a, i) =>
      `<div class="board-ability" onclick="openVillainAbility('${t.id}',${i})"><span class="board-ability-zone">${escHtml(a.icon || a.type || '')}</span><span class="board-ability-name">${escHtml(a.name)}</span></div>`
    ).join('') + '</div>';
  }
  return '';
}
function tokenShowsTwists(t) {
  if (t.kind !== 'hero') return false;
  const row = state.heroes.find(h => h.Slug === t.slug) || {};
  const g = row.GMControlled;
  return !(g === true || g === 1 || String(g).toLowerCase() === 'true' || g === '1');
}
function boardBasicActionsHtml(t) {
  const row1 = ['Attack', 'Recover', 'Defend'];
  const row2 = ['Boost', 'Hinder'];
  const btn = (a) => `<button type="button" class="btn btn-small btn-ghost" onclick="openBoardAction('${t.id}','${a}',null)">${a}</button>`;
  const twists = tokenShowsTwists(t)
    ? `<button type="button" class="btn btn-small btn-ghost" onclick="openTwistPicker('${t.id}')">Twists</button>`
    : '<span></span>';
  return `<div class="board-actions">
    <div class="board-actions-row">${row1.map(btn).join('')}</div>
    <div class="board-actions-row">${row2.map(btn).join('')}${twists}</div>
  </div>`;
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
    <p class="ability-card-body">${escHtml(body || '')}</p>
    <p class="empty-hint">Passive / no target — nothing to apply here.</p>`;
  document.getElementById('abilitiesModal').classList.remove('hidden');
}
function openHeroAbility(tokenId, idx) {
  const t = findTok(tokenId);
  const a = heroAbilitiesForToken(t)[idx];
  if (!a) return;
  const types = abilityRollTypes(a);
  if (!types.length) { showAbilityReadOnly(t, a.Name, a.GameText || ''); return; }
  openBoardAction(tokenId, types[0], {
    name: a.Name, text: a.GameText || '', rollTypes: types, effectHint: a.EffectDieHint || ''
  });
}
function openVillainAbility(tokenId, idx) {
  const t = findTok(tokenId);
  const a = villainAbilitiesForToken(t)[idx];
  if (!a) return;
  const types = abilityRollTypes(a);
  if (!types.length) { showAbilityReadOnly(t, a.name, a.body || ''); return; }
  openBoardAction(tokenId, types[0], {
    name: a.name, text: a.body || '', rollTypes: types, effectHint: ''
  });
}
function healthOrDieTargets() {
  return (state.scene.tokens || []).filter(x => !x.ko && (x.kind === 'hero' || x.kind === 'villain' || x.kind === 'minion' || x.kind === 'lieutenant'));
}
function openBoardAction(tokenId, action, ability) {
  const t = findTok(tokenId);
  if (!t) return;
  const types = (ability && ability.rollTypes && ability.rollTypes.length) ? ability.rollTypes : [action];
  boardActionState = { tokenId, action: action || types[0], ability };
  const title = (ability ? ability.name : 'Basic ' + action) + ' — ' + t.name;
  document.getElementById('abilitiesModalTitle').textContent = title;
  const combat = healthOrDieTargets();
  const combatOpts = combat.map(x =>
    `<option value="${x.id}" ${x.id === t.id ? 'selected' : ''}>${escHtml(x.name)} (${x.kind})</option>`
  ).join('');
  const typeSel = types.length > 1
    ? `<label>Action <select id="boardActType">${types.map(k => `<option value="${k}" ${k === boardActionState.action ? 'selected' : ''}>${k}</option>`).join('')}</select></label>`
    : `<input type="hidden" id="boardActType" value="${escAttr(boardActionState.action)}">`;
  const el = document.getElementById('abilitiesModalBody');
  el.innerHTML = `
    ${ability && ability.text ? `<p class="ability-card-body">${escHtml(ability.text)}</p>` : '<p class="empty-hint">Basic action (no ability text).</p>'}
    ${ability && ability.effectHint ? `<p class="empty-hint">Effect die hint: ${escHtml(ability.effectHint)}</p>` : ''}
    ${typeSel}
    <label>Effect Die <input type="number" id="boardActEffect" min="0" value="0"></label>
    <div id="boardActTargetWrap"></div>
    <button type="button" class="btn btn-accent" onclick="commitBoardAction()">Apply</button>`;
  const typeEl = document.getElementById('boardActType');
  const paintTargets = () => {
    const act = typeEl.tagName === 'SELECT' ? typeEl.value : typeEl.value;
    boardActionState.action = act;
    const wrap = document.getElementById('boardActTargetWrap');
    if (act === 'Overcome') {
      wrap.innerHTML = `<label>Target (no Health / no Minion die)<input type="text" id="boardActTargetText" placeholder="Door, alarm, scene object…"></label>`;
    } else {
      wrap.innerHTML = `<label>Target<select id="boardActTarget">${combatOpts}</select></label>`;
    }
  };
  if (typeEl.tagName === 'SELECT') typeEl.addEventListener('change', paintTargets);
  paintTargets();
  document.getElementById('abilitiesModal').classList.remove('hidden');
}
function commitBoardAction() {
  const st = boardActionState;
  if (!st) return;
  const actor = findTok(st.tokenId);
  if (!actor) return;
  const typeEl = document.getElementById('boardActType');
  const action = (typeEl && typeEl.value) || st.action;
  const effect = Math.max(0, Number(document.getElementById('boardActEffect').value) || 0);
  const abilityName = (st.ability && st.ability.name) || ('Basic ' + action);
  if (action === 'Overcome') {
    const obj = (document.getElementById('boardActTargetText') || {}).value || 'scene object';
    logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, action,
      { name: obj }, `${abilityName}: Overcome ${effect} vs ${obj} — ${overcomeResult(effect)}`, { effect, ability: abilityName });
    toast(`${abilityName}: Overcome ${effect} vs ${obj}`);
    closeAbilities();
    return;
  }
  const targetId = (document.getElementById('boardActTarget') || {}).value;
  const target = findTok(targetId);
  if (!target) { toast('Pick a target with Health or a Minion die.'); return; }
  if (action === 'Attack') applyBoardAttack(actor, target, effect, abilityName);
  else if (action === 'Defend') applyBoardMod(actor, target, 'defend', effect, abilityName, false);
  else if (action === 'Boost') applyBoardMod(actor, target, 'boost', bhModValue(effect), abilityName, true);
  else if (action === 'Hinder') applyBoardMod(actor, target, 'hinder', bhModValue(effect), abilityName, true);
  else if (action === 'Recover') applyBoardRecover(actor, target, effect, abilityName);
  closeAbilities();
  renderTokens();
}
function applyBoardMod(actor, target, kind, value, abilityName, creatorShows) {
  if (value <= 0) { toast('No mod created.'); return; }
  const creatorId = actor.id;
  const targetId = kind === 'defend' ? target.id : (creatorShows && kind === 'boost' ? actor.id : target.id);
  if (kind === 'boost') {
    ensureMods(state.scene).push({ id: uid('mod'), kind, value, creatorId: actor.id, targetId: target.id, exclusivePersistent: false });
  } else if (kind === 'hinder') {
    ensureMods(state.scene).push({ id: uid('mod'), kind, value, creatorId: actor.id, targetId: target.id, exclusivePersistent: false });
  } else {
    ensureMods(state.scene).push({ id: uid('mod'), kind, value, creatorId: actor.id, targetId: target.id, exclusivePersistent: false });
  }
  saveSceneDebounced();
  logActivity({ id: actor.id, name: actor.name, kind: actor.kind }, actionTitle(kind),
    { id: target.id, name: target.name, kind: target.kind },
    `${abilityName}: ${kind} ${value} → ${target.name}`, { value, ability: abilityName });
  toast(`${abilityName}: ${kind} ${value} on ${kind === 'boost' ? actor.name + ' (creator)' : target.name}`);
}
function actionTitle(kind) { return kind.charAt(0).toUpperCase() + kind.slice(1); }
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
  const type = document.getElementById('spawnType').value;
  const listSel = document.getElementById('spawnSelect');
  const hint = document.getElementById('spawnHint');
  const list = type === 'hero' ? state.heroes : type === 'villain' ? state.villains : state.minions;
  const field = type === 'hero' ? 'hero' : type === 'villain' ? 'villain' : 'minion';
  const allowed = (state.sceneRoster && state.sceneRoster[field]) || new Set();
  let filtered = list.filter(r => r.Name && allowed.has(r.Slug));
  if (type === 'villain' && state.scene && (state.scene.difficulty || '') === 'Easy') filtered = [];
  listSel.innerHTML = '<option value="">Select from Issue roster…</option>' +
    filtered.map(r => `<option value="${r.Slug}">${escHtml(r.Name)}${r.Type ? ' (' + r.Type + ')' : ''}</option>`).join('');
  if (hint) {
    if (!state.scene) hint.textContent = '';
    else if (!state.sceneHasIssue) hint.textContent = 'This scene is not on an Issue — assign it in Issue Builder.';
    else if (type === 'villain' && state.scene && (state.scene.difficulty || '') === 'Easy') hint.textContent = 'Easy scenes have no villains.';
    else if (!filtered.length) hint.textContent = 'No ' + type + 's assigned to this Issue.';
    else hint.textContent = '';
  }
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
      { id: uid('loc'), name: 'Location 1', background: null },
      { id: uid('loc'), name: 'Location 2', background: null },
    ],
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

function switchCollTab(tab) {
  currentCollTab = tab;
  document.querySelectorAll('.coll-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.coll === tab));
  const filt = document.getElementById('collIssueFilter');
  if (filt) filt.classList.toggle('hidden', tab !== 'locations' && tab !== 'scenes');
  document.getElementById('collCollectionsPanel').classList.toggle('hidden', tab !== 'collections');
  document.getElementById('collIssuesPanel').classList.toggle('hidden', tab !== 'issues');
  document.getElementById('collScenesPanel').classList.toggle('hidden', tab !== 'scenes');
  document.getElementById('locationsPanel').classList.toggle('hidden', tab !== 'locations');
  renderCurrentCollPanel();
}
function renderCurrentCollPanel() {
  if (currentCollTab === 'collections') renderCollectionsTable();
  else if (currentCollTab === 'issues') renderIssuesTable();
  else if (currentCollTab === 'scenes') renderScenesTable();
  else if (currentCollTab === 'locations') renderLibraryTable('locations');
}
function renderCollectionsList() { renderCurrentCollPanel(); }
function renderScenesList() { renderCurrentCollPanel(); }
function renderIssuesList() { renderCurrentCollPanel(); }

function slugNames(slugs, list) {
  const names = (slugs || []).map(slug => {
    const hit = (list || []).find(x => x.slug === slug);
    return hit ? hit.name : slug;
  }).filter(Boolean);
  if (!names.length) return '<span class="empty-hint">—</span>';
  return `<div class="name-list">${names.map(n => `<span>${escHtml(n)}</span>`).join('')}</div>`;
}

function renderCollectionsTable() {
  const el = document.getElementById('collCollectionsPanel');
  if (!el) return;
  const rows = state.collectionsList || [];
  let html = '<table class="lib-table"><thead><tr><th>Name</th><th class="wrap-col">Issues</th><th></th></tr></thead><tbody>';
  rows.forEach(coll => {
    html += `<tr>
      <td><input class="name-field" type="text" value="${escAttr(coll.name)}" onchange="renameCollection('${coll.slug}', this.value)"></td>
      <td class="assign-cell wrap-col">${slugNames(coll.issueSlugs, state.issuesList)}</td>
      <td class="row-actions">
        <button class="btn btn-small btn-primary" onclick="editCollection('${coll.slug}')">Edit</button>
        <button class="btn btn-small btn-danger" onclick="deleteCollection('${coll.slug}')">Delete</button>
      </td>
    </tr>`;
  });
  if (!rows.length) html += '<tr><td colspan="3" class="empty-hint">No collections yet. Click "+ Add Row".</td></tr>';
  html += '</tbody></table>';
  el.innerHTML = html;
}
function renderIssuesTable() {
  const el = document.getElementById('collIssuesPanel');
  if (!el) return;
  const rows = state.issuesList || [];
  let html = '<table class="lib-table"><thead><tr><th>Name</th><th class="wrap-col">Scenes</th><th></th></tr></thead><tbody>';
  rows.forEach(iss => {
    html += `<tr>
      <td><input class="name-field" type="text" value="${escAttr(iss.name)}" onchange="renameIssue('${iss.slug}', this.value)"></td>
      <td class="assign-cell wrap-col">${slugNames(iss.sceneSlugs, state.scenesList)}</td>
      <td class="row-actions">
        <button class="btn btn-small btn-primary" onclick="editIssue('${iss.slug}')">Edit</button>
        <button class="btn btn-small btn-danger" onclick="deleteIssue('${iss.slug}')">Delete</button>
      </td>
    </tr>`;
  });
  if (!rows.length) html += '<tr><td colspan="3" class="empty-hint">No issues yet. Click "+ Add Row".</td></tr>';
  html += '</tbody></table>';
  el.innerHTML = html;
}
function renderScenesTable() {
  const el = document.getElementById('collScenesPanel');
  if (!el) return;
  const filt = (document.getElementById('collIssueFilter') || {}).value || 'all';
  const iss = filt === 'all' ? null : (state.issuesList || []).find(i => i.slug === filt);
  const rows = (state.scenesList || []).filter(s => {
    if (filt === 'all') return true;
    return ((iss && iss.sceneSlugs) || []).includes(s.slug);
  });
  let html = '<table class="lib-table"><thead><tr><th>Name</th><th>Type</th><th>Difficulty</th><th></th><th class="table-fill"></th></tr></thead><tbody>';
  rows.forEach(s => {
    html += `<tr>
      <td><input class="name-field" type="text" value="${escAttr(s.name)}" onchange="renameScene('${s.slug}', this.value)"></td>
      <td>${escHtml(s.sceneType || '')}</td>
      <td>${escHtml(s.difficulty || '')}</td>
      <td class="row-actions">
        <button class="btn btn-small btn-primary" onclick="editScene('${s.slug}')">Edit</button>
        <button class="btn btn-small btn-accent" onclick="loadSceneToBoard('${s.slug}')">Load to Board</button>
        <button class="btn btn-small btn-danger" onclick="deleteScene('${s.slug}')">Delete</button>
      </td>
      <td class="table-fill"></td>
    </tr>`;
  });
  if (!rows.length) html += '<tr><td colspan="5" class="empty-hint">No scenes yet. Click "+ Add Row".</td></tr>';
  html += '</tbody></table>';
  el.innerHTML = html;
}

async function showCollectionsList() {
  const list = document.getElementById('collectionsListView');
  const collEd = document.getElementById('collectionEditorView');
  const iss = document.getElementById('issueEditorView');
  const sc = document.getElementById('sceneEditorView');
  if (list) list.classList.remove('hidden');
  if (collEd) collEd.classList.add('hidden');
  if (iss) iss.classList.add('hidden');
  if (sc) sc.classList.add('hidden');
  state.editingCollectionSlug = null;
  await Promise.all([refreshCollectionsList(), refreshIssuesList(), refreshScenesList()]);
  switchCollTab(currentCollTab);
}

async function collAddRow() {
  if (currentCollTab === 'collections') return newCollection();
  if (currentCollTab === 'issues') return newIssue(false);
  if (currentCollTab === 'scenes') {
    const filt = document.getElementById('collIssueFilter');
    const issueSlug = filt && filt.value && filt.value !== 'all' ? filt.value : null;
    return newScene(issueSlug, false);
  }
  if (currentCollTab === 'locations') return addRow('locations');
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
  if (openEditor === false) renderCurrentCollPanel();
  else editScene(slug);
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
  renderScenesList();
}

async function editScene(slug) {
  state.editingSlug = slug;
  state.scene = await apiGetScene(slug);
  if (state.scene) state.scene.__slug = slug;
  document.getElementById('collectionsListView').classList.add('hidden');
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
  state.scene = await apiGetScene(slug);
  if (state.scene) {
    state.scene.__slug = slug;
    (state.scene.tokens || []).forEach(t => { delete t.turnNumber; });
  }
  toast('Loaded "' + state.scene.name + '" to Board.');
  switchView('board');
  renderBoard();
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
  if (!log.length) { el.innerHTML = `<h3 class="sidebar-heading">Activity Log</h3><p class="empty-hint">Round ${rnd}. Nothing has happened yet.</p>`; return; }
  const recent = log.slice(-200).slice().reverse();
  let html = `<h3 class="sidebar-heading">Activity Log</h3><p class="empty-hint">Round ${rnd}</p><div class="activity-log-list">`;
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

/* ---------------- Scene Editor rendering ---------------- */

function renderSceneEditor() {
  const s = state.scene;
  const el = document.getElementById('sceneEditorView');
  el.innerHTML = `
    <div class="scene-editor-header">
      <button class="btn btn-ghost" onclick="backToScenesList()">&larr; Back to Collections</button>
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

    <label class="field-label">Locations</label>
    <div id="locationsEditorList"></div>
    <button class="btn btn-small btn-accent" onclick="addLocation()">+ Add Location</button>

    <label class="field-label">Environment <span class="gm-only-badge" style="background:var(--accent);">One per Scene — its Twists move the Scene Tracker</span></label>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
    <select class="scene-difficulty-select" onchange="updateSceneEnvironment(this.value)">
      <option value="">None</option>
      ${state.environments.map(e => `<option value="${e.Slug}" ${s.environment === e.Slug ? 'selected' : ''}>${escHtml(e.Name)}</option>`).join('')}
    </select>
    <a class="btn btn-small btn-ghost" href="/environment-builder.html" target="_blank">Environment Builder ↗</a>
    </div>
    <div id="environmentEditorPanel"></div>

    <label class="field-label">Challenges</label>
    <div id="challengesEditorList"></div>
    <button class="btn btn-small btn-accent" onclick="addChallenge()">+ Add Challenge</button>

    <label class="field-label">GM Notes <span class="gm-only-badge">GM ONLY — never shown on Player Display</span></label>
    <textarea class="gm-notes-textarea" onchange="updateSceneField('gmNotes', this.value)">${escHtml(s.gmNotes)}</textarea>
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
      <input type="file" accept="image/*" onchange="uploadLocationBackground(${idx}, this.files[0])">
      ${loc.background ? `<img class="bg-thumb" src="${backgroundUrl(loc.background)}">
        <button class="btn btn-small btn-ghost" onclick="removeLocationBackground(${idx})">Remove BG</button>` : '<span class="bg-thumb-empty">No image</span>'}
      <button class="btn btn-small btn-danger" onclick="removeLocation(${idx})">Delete</button>
    </div>`).join('');
}
function addLocationFromCatalog() {
  const sel = document.getElementById('locCatalogPick');
  const slug = sel && sel.value;
  const row = (state.locations || []).find(l => l.Slug === slug);
  if (!row) return;
  state.scene.locations.push({ id: uid('loc'), name: row.Name, locationSlug: row.Slug, background: null });
  saveSceneDebounced();
  renderLocationsEditor();
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
  state.scene.locations.push({ id: uid('loc'), name: 'New Location', locationSlug: '', background: null });
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
async function uploadLocationBackground(idx, file) {
  if (!file) return;
  const loc = state.scene.locations[idx];
  const key = state.editingSlug + '-' + loc.id;
  await apiUploadBackground(key, file);
  loc.background = key;
  saveSceneDebounced();
  renderLocationsEditor();
}
async function removeLocationBackground(idx) {
  const loc = state.scene.locations[idx];
  if (loc.background) await apiDeleteBackground(loc.background);
  loc.background = null;
  saveSceneDebounced();
  renderLocationsEditor();
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
              <input type="number" min="1" step="1" class="needed-input" value="${Number(p.successesNeeded)||1}" onchange="updatePathField(${idx},${pi},'successesNeeded',Math.max(1, parseInt(this.value,10)||1))">
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
  state.scene.challenges.push(blankChallenge());
  saveSceneDebounced();
  renderChallengesEditor();
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

function renderBoard() {
  const boardEmpty = document.getElementById('boardEmptyState');
  const boardContent = document.getElementById('boardContent');
  if (!state.scene) {
    boardEmpty.classList.remove('hidden');
    boardContent.classList.add('hidden');
    return;
  }
  boardEmpty.classList.add('hidden');
  boardContent.classList.remove('hidden');
  document.getElementById('boardSceneName').textContent = state.scene.name;
  document.getElementById('boardSceneDifficulty').textContent = state.scene.difficulty;
  const typeEl = document.getElementById('boardSceneType');
  if (typeEl) typeEl.value = state.scene.sceneType || 'Action';
  renderBoardTracker();
  renderBoardEnvironment();
  renderLocationsBoard();
  renderChallengesPanel();
  renderActivityLog();
  loadSceneRoster().then(() => refreshSpawnOptions());
}

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
      <div class="mvc-stage">
        <div class="mvc-side heroes">
          <div class="mvc-side-label">HEROES</div>
          <div class="mvc-row" id="mvcHeroes-${locKey(loc.id)}"></div>
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
      <div class="mvc-stage">
        <div class="mvc-side heroes"><div class="mvc-row" id="mvcHeroes-none"></div></div>
        <div class="mvc-side villains">
          <div class="mvc-row" id="mvcVillains-none"></div>
          <div class="mvc-row mvc-row-small" id="mvcExtras-none"></div>
        </div>
      </div>
    </section>
    <div class="mvc-ko" id="mvcKo"></div>`;
  bindLocationDrops(row);
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
    const villains = document.getElementById('mvcVillains-' + k);
    const extras = document.getElementById('mvcExtras-' + k);
    if (!heroes) return;
    heroes.innerHTML = '';
    if (villains) villains.innerHTML = '';
    if (extras) extras.innerHTML = '';
    const here = state.scene.tokens.filter(t => !t.ko && (t.locationId || '') === (id || ''));
    here.filter(t => t.kind === 'hero').forEach(t => heroes.appendChild(renderToken(t)));
    here.filter(t => t.kind === 'villain').forEach(t => villains && villains.appendChild(renderToken(t)));
    here.filter(t => t.kind === 'minion' || t.kind === 'lieutenant').forEach(t => extras && extras.appendChild(renderToken(t, true)));
    if (!heroes.children.length) heroes.innerHTML = '<div class="mvc-empty">—</div>';
    if (villains && !villains.children.length) villains.innerHTML = '<div class="mvc-empty">—</div>';
  });
  const koEl = document.getElementById('mvcKo');
  const ko = state.scene.tokens.filter(t => t.ko);
  if (koEl) koEl.textContent = ko.length ? ('Out: ' + ko.map(t => t.name).join(', ')) : '';
}

function renderToken(t, small) {
  const card = document.createElement('div');
  card.className = `token mvc-card ${t.kind}${small ? ' small' : ''}`;
  card.draggable = true;
  card.addEventListener('dragstart', e => {
    if (e.target.closest('button, input, select, textarea, label, .board-ability')) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', t.id); card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));
  attachTouchDrag(card, t.id);

  const heroRow = t.kind === 'hero' ? (state.heroes.find(h => h.Slug === t.slug) || {}) : null;
  let body = `${state.turnMarks && state.turnMarks[t.id] ? `<div class="turn-badge">${state.turnMarks[t.id]}</div>` : ''}
    <div class="mvc-plate"><span>${escHtml(t.name)}</span>
      <div class="token-controls"><button type="button" title="Remove from scene" onclick="removeToken('${t.id}')">✕</button></div>
    </div>`;
  if (t.kind === 'hero' || t.kind === 'villain') body += renderHealthBlock(t, heroRow);
  if (t.kind === 'minion' || t.kind === 'lieutenant') body += renderDieBlock(t);
  body += bhdRowHtml(t, state.scene, true);
  body += boardAbilityListHtml(t);
  body += boardBasicActionsHtml(t);
  card.innerHTML = body;
  return card;
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
  if (t.ko) return `<div class="die-row"><span class="die-badge ko">KO</span><span class="die-row-label">Defeated</span></div>`;
  const badge = `<button class="die-badge d${t.currentDie}" title="Roll" onclick="rollTokenDie('${t.id}')">d${t.currentDie}</button>`;
  let label = t.kind === 'lieutenant' ? 'Lieutenant die (steps down)' : 'Minion die (defeated outright)';
  if (t.kind === 'minion') {
    const row = state.minions.find(m => m.Slug === t.slug) || {};
    const ph = String(row.PerHero || '');
    const shown = ph === '0.5' ? '½ Ⓗ' : ph === '2' ? '2 Ⓗ' : ph === '1' ? '1 Ⓗ' : '';
    if (shown) label += ' · ' + shown;
  }
  return `<div class="die-row">${badge}<span class="die-row-label">${label}</span></div>`;
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
  const firstLoc = state.scene.locations[0]?.id || null;
  let tok;
  if (type === 'hero') {
    const row = state.heroes.find(r => r.Slug === slug);
    tok = { id: uid('tok'), kind: 'hero', slug, name: row.Name, locationId: firstLoc, currentHealth: Number(row.MaxHealth) || 20, maxHealth: Number(row.MaxHealth) || 20 };
  } else if (type === 'villain') {
    const row = state.villains.find(r => r.Slug === slug);
    tok = { id: uid('tok'), kind: 'villain', slug, name: row.Name, locationId: firstLoc, currentHealth: Number(row.MaxHealth) || 20, maxHealth: Number(row.MaxHealth) || 20 };
  } else {
    const row = state.minions.find(r => r.Slug === slug);
    const kind = row.Type === 'Lieutenant' ? 'lieutenant' : 'minion';
    tok = { id: uid('tok'), kind, slug, name: row.Name, locationId: firstLoc, currentDie: Number((row.Die || 'd6').replace('d','')) || 6, ko: false };
  }
  state.scene.tokens.push(tok);
  saveSceneDebounced();
  renderTokens();
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

function renderChallengesPanel() {
  const el = document.getElementById('challengesPanel');
  if (!el) return;
  if (!state.scene.challenges.length) { el.innerHTML = '<p class="empty-hint">No challenges in this scene.</p>'; return; }
  el.innerHTML = state.scene.challenges.map((c, idx) => `
    <div class="challenge-board-card">
      <div class="challenge-board-top">
        <span class="challenge-board-title">${escHtml(c.title)}</span>
        <span class="token-type-chip challenge-type-chip">${c.type}</span>
      </div>
      ${c.paths.map((p, pi) => {
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
      <label class="hidden-toggle"><input type="checkbox" ${c.hidden ? 'checked' : ''} onchange="toggleChallengeHiddenLive(${idx}, this.checked)"> Hidden from Player Display</label>
    </div>`).join('');
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
    id: uid('mod'), kind, creatorId, targetId, value, exclusivePersistent, consumed: false
  });
  const cName = creator.name;
  const tName = (findTok(targetId) || {}).name || '?';
  logActivity({ id: creator.id, name: cName, kind: creator.kind }, kind[0].toUpperCase() + kind.slice(1),
    { id: targetId, name: tName }, `${kind} ${value}${exclusivePersistent ? ' (Exclusive & Persistent)' : ''}`, { value, kind });
  saveSceneDebounced(); renderTokens(); closeModCreate();
}
function consumeMod(modId) {
  const m = ensureMods(state.scene).find(x => x.id === modId);
  if (m) m.consumed = true;
  saveSceneDebounced(); renderTokens(); closeModCreate();
}

function attackModPickerHtml(target) {
  const spend = liveMods(state.scene).filter(m => m.kind === 'boost' || m.kind === 'hinder');
  const defend = bhdTotals(state.scene, target).defend;
  const rows = spend.length
    ? spend.map(m => {
        const cr = findTok(m.creatorId);
        const tag = m.exclusivePersistent ? 'Exclusive & Persistent' : 'one-off';
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
    if (!m.exclusivePersistent && !twist) m.consumed = true;
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
    const row = state.minions.find(m => m.Slug === t.slug) || {};
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
  document.getElementById('collectionsView').classList.toggle('hidden', view !== 'collections');
  document.getElementById('rulesView').classList.toggle('hidden', view !== 'rules');
  document.getElementById('builderView').classList.toggle('hidden', view !== 'builder');
  if (view === 'board') refreshBoardFromServer();
  if (view === 'collections') { showCollectionsList(); }
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

const RULES_CHAPTERS = [
  { title: 'Chapter 1: Introduction', slugs: [] },
  { title: 'Chapter 2: Playing the Game', slugs: ['02-1-playing-the-game'] },
  { title: 'Chapter 3: Creating Heroes', slugs: [
    '03-1-backgrounds','03-2-power-sources','03-3-archetypes','03-4-personality',
    '03-5-red-abilities','03-6-principles','03-7-powers-and-qualities',
    '03-8-hero-creation-process','03-9-hero-advancement'] },
  { title: 'Chapter 4: Moderating the Game', slugs: ['04-1-moderating-the-game'] },
  { title: 'Chapter 5: The Bullpen', slugs: [
    '05-1-scene-building','05-2-minions-lieutenants-villains',
    '05-3-villain-archetypes-upgrades-health','05-4-environments-issue-structure',
    '05-5-alternate-rewards-collections'] },
  { title: 'Chapter 8: Appendices', slugs: ['08-1-index-and-glossary'] },
];
let rulesOpenChapter = null;

function renderRulesList(filter) {
  const el = document.getElementById('rulesList');
  const q = (filter || '').trim().toLowerCase();
  const bySlug = Object.fromEntries((state.rulesList || []).map(r => [r.slug, r]));
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
      <button class="rules-list-item" onclick="openRuleDoc('${h.slug}')">
        <div class="rules-hit-title">${escHtml(h.title)}</div>
        ${h.snippet ? `<div class="rules-hit-snippet">${escHtml(h.snippet)}</div>` : ''}
      </button>`).join('')
      : '<p class="empty-hint" style="padding:10px;">No matches.</p>';
    return;
  }
  el.innerHTML = RULES_CHAPTERS.map((ch, i) => {
    const open = rulesOpenChapter === i;
    const files = ch.slugs.map(slug => bySlug[slug]).filter(Boolean);
    const body = open
      ? (files.length
          ? files.map(r => `<button class="rules-list-item" onclick="openRuleDoc('${r.slug}')">${escHtml(r.title)}</button>`).join('')
          : '<p class="empty-hint" style="padding:8px;">No source file ingested for this chapter yet.</p>')
      : '';
    return `<button class="rules-list-item rules-chapter" onclick="toggleRulesChapter(${i})">${escHtml(ch.title)}</button>${body}`;
  }).join('');
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
  ['heroes','villains','minions','environments','twists','abilities'].forEach(k => {
    const panel = document.getElementById(k + 'Panel');
    if (panel) panel.classList.toggle('hidden', k !== kind);
  });
  document.getElementById('villainRefBtn').classList.toggle('hidden', kind !== 'villains');
  const issueFilt = document.getElementById('libIssueFilter');
  if (issueFilt) issueFilt.classList.toggle('hidden', kind === 'twists');
  const sevFilt = document.getElementById('twistSeverityFilter');
  const effFilt = document.getElementById('twistEffectFilter');
  if (sevFilt) sevFilt.classList.toggle('hidden', kind !== 'twists');
  if (effFilt) effFilt.classList.toggle('hidden', kind !== 'twists');
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

function openTwistPicker(tokenId) {
  const t = findTok(tokenId);
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
  for (let i = 1; i <= pCount; i++) if (libRow['Power' + i] && libRow['PowerDie' + i]) powers.push({ name: libRow['Power' + i], die: libRow['PowerDie' + i] });
  const qualities = [];
  for (let i = 1; i <= qCount; i++) if (libRow['Quality' + i] && libRow['QualityDie' + i]) qualities.push({ name: libRow['Quality' + i], die: libRow['QualityDie' + i] });

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

  const abilities = t.kind === 'hero' ? state.abilities.filter(a => a.HeroSlug === t.slug) : [];
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
  if (rs.kind === 'hero' && rs.abilities.length) {
    const selected = rs.abilityIdx === '' ? null : rs.abilities[Number(rs.abilityIdx)];
    html += `
    <label class="field-label" style="margin-top:0;">Ability (optional — fully resolves the ability)</label>
    <select id="rollerAbilitySelect" onchange="onAbilitySelected(this.value)">
      <option value="">— none, roll freeform —</option>
      ${rs.abilities.map((a, i) => `<option value="${i}" ${String(i) === String(rs.abilityIdx) ? 'selected' : ''}>${escHtml(a.Zone || '')} — ${escHtml(a.Name)}</option>`).join('')}
    </select>`;
    if (selected) {
      html += `<div class="ability-card" style="margin:8px 0;"><div class="ability-card-name">[${escHtml(selected.Type)}] "${escHtml(selected.Name)}"</div><p class="ability-card-body">${escHtml(selected.GameText)}</p></div>`;
    }
  }
  html += `
    <label class="field-label" style="margin-top:0;">Power</label>
    <select id="rollerPowerSelect" onchange="rollerState.pIdx=Number(this.value)">
      ${rs.powers.map((p, i) => `<option value="${i}" ${i === rs.pIdx ? 'selected' : ''}>${escHtml(p.name)} (${p.die})</option>`).join('')}
    </select>
    <label class="field-label">Quality</label>
    <select id="rollerQualitySelect" onchange="rollerState.qIdx=Number(this.value)">
      ${rs.qualities.map((q, i) => `<option value="${i}" ${i === rs.qIdx ? 'selected' : ''}>${escHtml(q.name)} (${q.die})</option>`).join('')}
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

function blankIssue(name) { return { name: name || 'New Issue', sceneSlugs: [], villainSlugs: [], heroSlugs: [], minionSlugs: [], notes: '' }; }

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
  renderCurrentCollPanel();
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
  state.collection.issueSlugs = state.collection.issueSlugs || [];
  document.getElementById('collectionsListView').classList.add('hidden');
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
  const attachedNames = (coll.issueSlugs || []).map(s => (state.issuesList.find(x => x.slug === s) || {}).name || s);
  el.innerHTML = `
    <div class="scene-editor-header">
      <button class="btn btn-ghost" onclick="backToCollectionsList()">&larr; Back to Collections</button>
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
      ${state.issuesList.filter(i => !(coll.issueSlugs || []).includes(i.slug)).map(i => `<option value="${i.slug}">${escHtml(i.name)}</option>`).join('')}
    </select>
    <button class="btn btn-small btn-accent" onclick="addCollectionIssue()">Add</button>
  `;
}
function updateCollectionField(field, value) { state.collection[field] = value; saveCollectionDebounced(); }
function addCollectionIssue() {
  const sel = document.getElementById('collectionIssueAdd');
  if (!sel.value) return;
  state.collection.issueSlugs = state.collection.issueSlugs || [];
  state.collection.issueSlugs.push(sel.value);
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
  renderCurrentCollPanel();
}
async function renameScene(slug, name) {
  const sc = await apiGetScene(slug);
  if (!sc) return;
  sc.name = name;
  await apiSaveScene(slug, sc);
  await refreshScenesList();
  renderCurrentCollPanel();
}

async function newIssue(openEditor) {
  const name = prompt('Issue name (e.g. "Issue #4: The Tarama Lab Breach"):');
  if (!name) return;
  const slug = uniqueIssueSlug(slugify(name));
  await apiSaveIssue(slug, blankIssue(name));
  await refreshIssuesList();
  fillLibIssueFilter();
  if (openEditor === false) renderCurrentCollPanel();
  else editIssue(slug);
}
function uniqueIssueSlug(base) {
  let candidate = base, n = 1;
  const taken = new Set(state.issuesList.map(i => i.slug));
  while (taken.has(candidate)) candidate = base + '-' + (++n);
  return candidate;
}
async function deleteIssue(slug) {
  if (!confirm('Delete this issue? This cannot be undone.')) return;
  await apiDeleteIssue(slug); await refreshIssuesList(); renderIssuesList();
}
async function editIssue(slug) {
  state.editingIssueSlug = slug;
  state.issue = await apiGetIssue(slug);
  document.getElementById('collectionsListView').classList.add('hidden');
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
      <button class="btn btn-ghost" onclick="backToIssuesList()">&larr; Back to Collections</button>
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
  document.querySelectorAll('.coll-tab-btn').forEach(b => b.addEventListener('click', () => switchCollTab(b.dataset.coll)));
  document.getElementById('addRowBtn').addEventListener('click', () => addRow(currentLibTab));
  document.getElementById('collAddRowBtn').addEventListener('click', collAddRow);
  const libFilt = document.getElementById('libIssueFilter');
  if (libFilt) libFilt.addEventListener('change', () => renderLibraryTable(currentLibTab));
  const twistSev = document.getElementById('twistSeverityFilter');
  const twistEff = document.getElementById('twistEffectFilter');
  if (twistEff) {
    twistEff.innerHTML = '<option value="all">All effect types</option>' +
      TWIST_EFFECT_TYPES.map(t => `<option value="${escAttr(t)}">${escHtml(t)}</option>`).join('');
  }
  if (twistSev) twistSev.addEventListener('change', () => renderLibraryTable('twists'));
  if (twistEff) twistEff.addEventListener('change', () => renderLibraryTable('twists'));
  const collFilt = document.getElementById('collIssueFilter');
  if (collFilt) collFilt.addEventListener('change', () => {
    if (currentCollTab === 'locations') renderLibraryTable('locations');
    else if (currentCollTab === 'scenes') renderScenesTable();
  });
  document.getElementById('spawnType').addEventListener('change', refreshSpawnOptions);
  document.getElementById('spawnBtn').addEventListener('click', spawnToken);
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
  document.getElementById('villainRefBtn').addEventListener('click', openReferenceModal);
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
  fillLibIssueFilter();
  renderCurrentCollPanel();
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
}

document.addEventListener('DOMContentLoaded', init);
