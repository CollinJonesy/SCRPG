/* ============================================================
   SCRPG Scene Board — display.js (Player Display, read-only)
   Polls the server; never shows Challenge solutions or GM notes.
   ============================================================ */

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

let libHeroes = [], libVillains = [], libEnvironments = [], libNpcs = [], libMinions = [];

function escHtml(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function isPcHeroToken(t) {
  // Only players.csv PCs unlock a location on Player Display — not NPC Type=Hero.
  if (!t || t.kind !== 'hero' || t.npc) return false;
  if (!t.slug) return false;
  if (!(libHeroes || []).length) return true; // library not loaded yet — treat kind=hero as PC
  return !!(libHeroes || []).find(h => h.Slug === t.slug);
}
function isNonCombatToken(t) {
  if (!t) return false;
  if (t.nonCombat) return true;
  const row = (libNpcs || []).find(m => m.Slug === t.slug);
  return !!row && /^bystander$/i.test(String(row.Type || ''));
}

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
  const d = token.bhdDelta || {};
  return {
    boost: Math.max(0, boost + (Number(d.boost) || 0)),
    hinder: Math.max(0, hinder + (Number(d.hinder) || 0)),
    defend: Math.max(0, defend + (Number(d.defend) || 0)),
  };
}
function locName(scene, locId) {
  const loc = (scene.locations || []).find(l => l.id === locId);
  return loc ? loc.name : '';
}
function bhdRowHtml(t, scene) {
  // Match GM board: NPCs (especially Bystander) have no Boost/Hinder/Defend boxes.
  if (t && t.npc) return '';
  const n = bhdTotals(scene, t);
  return `<div class="bhd-row">
    <div class="bhd-stat boost"><span>BOOST</span><b>${n.boost}</b></div>
    <div class="bhd-stat hinder"><span>HINDER</span><b>${n.hinder}</b></div>
    <div class="bhd-stat defend"><span>DEFEND</span><b>${n.defend}</b></div>
  </div>`;
}

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

async function fetchLibrary() {
  try {
    const [h, v, e, n, m] = await Promise.all([
      fetch('/api/csv/heroes').then(r => r.text()),
      fetch('/api/csv/villains').then(r => r.text()),
      fetch('/api/csv/environments').then(r => r.text()),
      fetch('/api/csv/npcs').then(r => r.text()),
      fetch('/api/csv/minions').then(r => r.text()),
    ]);
    libHeroes = h.trim() ? Papa.parse(h.trim(), { header: true, skipEmptyLines: true }).data : [];
    libVillains = v.trim() ? Papa.parse(v.trim(), { header: true, skipEmptyLines: true }).data : [];
    libEnvironments = e.trim() ? Papa.parse(e.trim(), { header: true, skipEmptyLines: true }).data : [];
    libNpcs = n.trim() ? Papa.parse(n.trim(), { header: true, skipEmptyLines: true }).data : [];
    libMinions = m.trim() ? Papa.parse(m.trim(), { header: true, skipEmptyLines: true }).data : [];
  } catch (e) { /* keep last known library on transient errors */ }
}
function libRowForToken(t) {
  if (!t) return null;
  if (t.kind === 'hero') return (libHeroes || []).find(h => h.Slug === t.slug) || null;
  if (t.kind === 'villain') return (libVillains || []).find(v => v.Slug === t.slug) || null;
  return (libNpcs || []).find(m => m.Slug === t.slug)
    || (libMinions || []).find(m => m.Slug === t.slug) || null;
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
function npcTypeOfPd(t) {
  const row = libRowForToken(t) || {};
  const ty = String(row.Type || '').trim();
  if (ty) return ty;
  if (t.kind === 'lieutenant') return 'Lieutenant';
  if (t.kind === 'hero') return 'Hero';
  if (t.kind === 'villain') return 'Villain';
  return 'Minion';
}
function tokenTypeSortRank(t) {
  if (isNonCombatToken(t)) return 4;
  if (t.kind === 'hero' || npcTypeOfPd(t) === 'Hero') return 0;
  if (t.kind === 'villain' || npcTypeOfPd(t) === 'Villain') return 1;
  if (t.kind === 'lieutenant' || npcTypeOfPd(t) === 'Lieutenant') return 2;
  if (t.kind === 'minion') return 3;
  return 5;
}
function sortAllyTokens(tokens) {
  const list = (tokens || []).slice();
  const pcs = list.filter(isPcHeroToken).sort(byName);
  const rest = list.filter(t => !isPcHeroToken(t))
    .sort((a, b) => tokenTypeSortRank(a) - tokenTypeSortRank(b) || byName(a, b));
  return pcs.concat(rest);
}
/**
 * Build the PD mvc-stage for one location.
 *
 * HARD RULE: never more than 10 token columns in any row (stage is max 10 cols;
 * each side's mvc-row uses the side's span as column count so extras WRAP).
 *
 * Default: classic 10-col Ally 3 / Neutral 2 / Enemy 5 (empty sides expand
 * 5/5 or full-width). Tokens wrap inside their side at that side's width.
 *
 * Special (total tokens < 10 AND ≥1 PC hero AND ≥1 other token):
 *   5-slot PC hero bank | blank at column 6 | remaining width (4 cols) for others.
 * Still exactly 10 stage columns — never expands past 10.
 */
function pdMvcSideHtml(label, cls, tokens, scene, span, count) {
  const n = tokens.length;
  // Side width on the 10-col stage (capped).
  const colSpan = Math.max(1, Math.min(10, span != null ? span : Math.min(Math.max(n, 1), 10)));
  // Row capacity = side width, NOT token count — extras wrap to the next row.
  const colCount = Math.max(1, Math.min(10, count != null ? count : colSpan));
  // Player Display: no Allies / Neutral / Enemies section headers on locations.
  return `
    <div class="mvc-side ${cls}" style="--mvc-count:${colCount};grid-column:span ${colSpan}">
      <div class="mvc-row">${tokens.map(t => renderFighterCard(t, scene)).join('')}</div>
    </div>`;
}
/** Split a column budget across present groups (proportional, each ≥1). */
function pdAllocateSpans(groups, budget) {
  const present = groups.filter(g => g.tokens && g.tokens.length);
  if (!present.length) return [];
  const b = Math.max(1, Math.min(10, budget));
  if (present.length === 1) {
    present[0].span = b;
    return present;
  }
  const total = present.reduce((s, g) => s + g.tokens.length, 0);
  let used = 0;
  present.forEach((g, i) => {
    if (i === present.length - 1) {
      g.span = Math.max(1, b - used);
    } else {
      g.span = Math.max(1, Math.round((b * g.tokens.length) / total));
      used += g.span;
    }
  });
  // If rounding overflowed, shrink from the largest until sum === b
  let sum = present.reduce((s, g) => s + g.span, 0);
  while (sum > b) {
    const biggest = present.slice().sort((x, y) => y.span - x.span)[0];
    if (biggest.span <= 1) break;
    biggest.span -= 1;
    sum -= 1;
  }
  while (sum < b) {
    const biggest = present.slice().sort((x, y) => y.tokens.length - x.tokens.length)[0];
    biggest.span += 1;
    sum += 1;
  }
  return present;
}
function pdMvcStageHtml(allies, neutrals, enemies, scene) {
  const a = allies || [];
  const n = neutrals || [];
  const e = enemies || [];
  const all = a.concat(n, e);
  if (!all.length) return '<div class="mvc-stage" style="--mvc-cols:10"></div>';

  const pcs = all.filter(isPcHeroToken);
  const others = all.filter(t => !isPcHeroToken(t));
  const totalTokens = all.length;
  const useHeroSep = totalTokens < 10 && pcs.length > 0 && others.length > 0;

  if (useHeroSep) {
    // Always 10 cols: [PC bank ×5][blank ×1][others ×4]
    const pcsFront = pcs.slice(0, 5);
    const pcsOverflow = pcs.slice(5);
    const rightTokens = pcsOverflow.concat(others);
    const rightGroups = pdAllocateSpans([
      { label: 'ALLIES', cls: 'allies', tokens: rightTokens.filter(t => tokenAffiliation(t) === 'Ally') },
      { label: 'NEUTRAL', cls: 'neutral', tokens: rightTokens.filter(t => tokenAffiliation(t) === 'Neutral') },
      { label: 'ENEMIES', cls: 'enemies', tokens: rightTokens.filter(t => tokenAffiliation(t) === 'Enemy') },
    ], 4);
    const parts = [
      pdMvcSideHtml('ALLIES', 'allies', pcsFront, scene, 5, 5),
      '<div class="mvc-blank" aria-hidden="true"></div>',
    ];
    rightGroups.forEach(g => {
      parts.push(pdMvcSideHtml(g.label, g.cls, g.tokens, scene, g.span, g.span));
    });
    return `<div class="mvc-stage layout-hero-sep" style="--mvc-cols:10">${parts.join('')}</div>`;
  }

  // Default assortment: always 10-col Ally3 / Neutral2 / Enemy5
  const hasA = a.length > 0, hasN = n.length > 0, hasE = e.length > 0;
  let layoutClass = 'layout-ane';
  const parts = [];
  if (hasA && hasN && hasE) {
    layoutClass = 'layout-ane';
    parts.push(pdMvcSideHtml('ALLIES', 'allies', a, scene, 3, 3));
    parts.push(pdMvcSideHtml('NEUTRAL', 'neutral', n, scene, 2, 2));
    parts.push(pdMvcSideHtml('ENEMIES', 'enemies', e, scene, 5, 5));
  } else if (hasA && hasN && !hasE) {
    layoutClass = 'layout-an';
    parts.push(pdMvcSideHtml('ALLIES', 'allies', a, scene, 5, 5));
    parts.push(pdMvcSideHtml('NEUTRAL', 'neutral', n, scene, 5, 5));
  } else if (hasA && !hasN && hasE) {
    layoutClass = 'layout-ae';
    parts.push(pdMvcSideHtml('ALLIES', 'allies', a, scene, 5, 5));
    parts.push(pdMvcSideHtml('ENEMIES', 'enemies', e, scene, 5, 5));
  } else if (!hasA && hasN && hasE) {
    layoutClass = 'layout-ne';
    parts.push(pdMvcSideHtml('NEUTRAL', 'neutral', n, scene, 5, 5));
    parts.push(pdMvcSideHtml('ENEMIES', 'enemies', e, scene, 5, 5));
  } else if (hasA) {
    layoutClass = 'layout-a';
    parts.push(pdMvcSideHtml('ALLIES', 'allies', a, scene, 10, 10));
  } else if (hasN) {
    layoutClass = 'layout-n';
    parts.push(pdMvcSideHtml('NEUTRAL', 'neutral', n, scene, 10, 10));
  } else {
    layoutClass = 'layout-e';
    parts.push(pdMvcSideHtml('ENEMIES', 'enemies', e, scene, 10, 10));
  }
  return `<div class="mvc-stage ${layoutClass}" style="--mvc-cols:10">${parts.join('')}</div>`;
}
function sortNeutralTokens(tokens) {
  return (tokens || []).slice()
    .sort((a, b) => tokenTypeSortRank(a) - tokenTypeSortRank(b) || byName(a, b));
}

function trackerStarsHtml(tracker) {
  return '<div class="tracker-stars">' + tracker.stars.map((color, i) =>
    `<div class="tracker-star ${color} ${i === tracker.position ? 'tracker-marker' : ''}">★</div>`).join('') + '</div>';
}

function sceneVisualSig(scene) {
  if (!scene) return 'null';
  return JSON.stringify({
    name: scene.name, difficulty: scene.difficulty, sceneType: scene.sceneType, tracker: scene.tracker,
    locations: scene.locations, tokens: scene.tokens, mods: scene.mods,
    environment: scene.environment, challenges: scene.challenges, background: scene.background
  });
}

function fitNameSize(el, ctx, hi, loMin) {
  const text = (el.textContent || '').trim();
  if (!text) return hi;
  const cs = getComputedStyle(el);
  const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const maxW = el.clientWidth - pad;
  if (maxW <= 1) return hi;
  const family = cs.fontFamily;
  const weight = cs.fontWeight;
  const floor = loMin != null ? loMin : 10;
  let lo = floor, best = floor, top = hi;
  while (top - lo > 0.2) {
    const mid = (lo + top) / 2;
    ctx.font = weight + ' ' + mid + 'px ' + family;
    if (ctx.measureText(text).width <= maxW) { best = mid; lo = mid; }
    else top = mid;
  }
  return best;
}
function fitHeroNamePlates() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  document.querySelectorAll('.mvc-row').forEach(row => {
    const plates = [...row.querySelectorAll('.mvc-card .mvc-plate')];
    if (!plates.length) return;
    let shared = 24;
    plates.forEach(el => { shared = Math.min(shared, fitNameSize(el, ctx, 24)); });
    // Numbers match token name. Labels: at most name−2, and shrink further to fit cell width (no clip).
    const labelCap = Math.max(7, shared - 2);
    plates.forEach(el => {
      el.style.fontSize = shared + 'px';
      el.style.textOverflow = 'clip';
      const card = el.closest('.mvc-card');
      if (!card) return;
      card.querySelectorAll('.bhd-stat b').forEach(b => { b.style.fontSize = shared + 'px'; });
      card.querySelectorAll('.bhd-stat span').forEach(s => {
        s.style.fontSize = labelCap + 'px'; // start at cap so measure uses right box
        const fitted = fitNameSize(s, ctx, labelCap, 6);
        s.style.fontSize = fitted + 'px';
        s.style.textOverflow = 'clip';
      });
    });
  });
}
function scheduleFitHeroNames() {
  requestAnimationFrame(() => requestAnimationFrame(fitHeroNamePlates));
}
window.addEventListener('resize', scheduleFitHeroNames);

let lastVisualSig = '';
function renderScene(scene) {
  const sig = sceneVisualSig(scene);
  if (sig === lastVisualSig) return;
  lastVisualSig = sig;
  document.getElementById('displayEmpty').classList.toggle('hidden', !!scene);
  document.getElementById('locationsRow').classList.toggle('hidden', !scene);
  if (!scene) {
    document.getElementById('displaySceneName').textContent = 'No active scene';
    document.getElementById('displayTrackerRow').innerHTML = '';
    document.getElementById('displayChallenges').innerHTML = '';
    const envEl = document.getElementById('displayEnvironment');
    if (envEl) envEl.innerHTML = '';
    const stage = document.getElementById('displayStage');
    if (stage) { stage.classList.remove('scene-bg-host'); stage.style.backgroundImage = ''; }
    return;
  }
  document.getElementById('displaySceneName').textContent = scene.name;
  document.getElementById('displayTrackerRow').innerHTML = trackerStarsHtml(scene.tracker);

  const envEl = document.getElementById('displayEnvironment');
  if (envEl) {
    // Name and Traits are setting/flavor — shown to players. Twists are GM-only
    // (never fetched here at all — this page has no code path that reads them).
    const env = scene.environment ? libEnvironments.find(x => x.Slug === scene.environment) : null;
    envEl.innerHTML = env ? `<span class="env-name">${escHtml(env.Name)}</span>` : '';
  }

  // Scene-level background covers the whole Player Display (not per-location).
  const stage = document.getElementById('displayStage');
  if (stage) {
    const sceneBg = scene.background || ((scene.locations || []).map(l => l && l.background).find(Boolean) || '');
    if (sceneBg) {
      stage.classList.add('scene-bg-host');
      stage.style.backgroundImage = `url('${backgroundUrl(sceneBg)}')`;
    } else {
      stage.classList.remove('scene-bg-host');
      stage.style.backgroundImage = '';
    }
  }

  const row = document.getElementById('locationsRow');
  const locs = scene.locations || [];
  const ko = scene.tokens.filter(t => t.ko);
  const at = (locId) => scene.tokens.filter(t => !t.ko && (t.locationId || '') === (locId || ''));
  row.innerHTML = locs.map(loc => {
    const here = at(loc.id);
    // PC heroes only (players.csv) unlock a location — NPC Type=Hero does not.
    const pcsHere = here.filter(t => isPcHeroToken(t));
    let allies = sortAllyTokens(here.filter(t => tokenAffiliation(t) === 'Ally'));
    let neutrals = sortNeutralTokens(here.filter(t => tokenAffiliation(t) === 'Neutral'));
    let enemies = sortEnemyTokens(here.filter(t => tokenAffiliation(t) === 'Enemy'));
    // Hide all non-PC tokens until a players.csv PC is present.
    if (!pcsHere.length) {
      allies = allies.filter(isPcHeroToken); // empty
      neutrals = [];
      enemies = [];
    }

    return `<section class="location-block">
      <div class="location-header"><span class="location-name-display">${escHtml(loc.name)}</span></div>
      ${pdMvcStageHtml(allies, neutrals, enemies, scene)}
    </section>`;
  }).join('') + (ko.length ? `<div class="mvc-ko">Out: ${ko.map(t => escHtml(t.name)).join(', ')}</div>` : '');
  scheduleFitHeroNames();

  const chalEl = document.getElementById('displayChallenges');
  const visible = scene.challenges || [];
  if (!visible.length) { chalEl.innerHTML = ''; }
  else {
    const pathRows = visible.flatMap(c => (c.paths || []).filter(p => !p.hidden)).map(p => {
      const outcome = pathDisplayOutcome(p);
      const titleCls = outcome === 'success' ? ' challenge-success-title' : '';
      const badge = outcome === 'fail'
        ? '<span class="challenge-outcome fail">Fail</span>'
        : outcome === 'success'
          ? '<span class="challenge-outcome success">Success</span>'
          : '';
      return `<div class="challenge-path-row">
        <span class="challenge-path-label${titleCls}">${escHtml(p.label)}</span>
        ${badge}
      </div>`;
    }).join('');
    const solutions = visible.filter(c => !c.hidden && c.solution)
      .map(c => `<div class="challenge-path-row"><em>${escHtml(c.solution)}</em></div>`).join('');
    chalEl.innerHTML = `
    <div class="challenge-board-card">
      <div class="challenge-board-top">
        <span class="challenge-board-title">Challenge(s)</span>
      </div>
      ${pathRows}${solutions}
    </div>`;
  }
}

function pathDisplayOutcome(p) {
  if (p && p.failed) return 'fail';
  const need = Math.max(1, Number(p && p.successesNeeded) || 1);
  const marked = Number(p && p.successesMarked) || 0;
  return marked >= need ? 'success' : '';
}

const GYRO_RANK = { green: 3, yellow: 2, red: 1, out: 0 };
function computeHeroStatus(maxHealth, currentHealth, scene) {
  const personal = heroBand(maxHealth, currentHealth);
  let sceneBand = 'green';
  if (scene && scene.tracker && scene.tracker.stars && scene.tracker.stars.length) {
    sceneBand = scene.tracker.stars[scene.tracker.position] || 'green';
  }
  const worse = GYRO_RANK[personal.band] <= GYRO_RANK[sceneBand] ? personal.band : sceneBand;
  return { band: worse, approx: personal.approx };
}

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
  // OWN accumulated bonuses -- count live boost mods targeting the villain itself.
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
// detected generically: any villain whose Status labels mention both "penalty" and
// "bonus" uses this resolution instead of the numeric-range one below.
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
  return { die: villainRow['Status' + n + 'Die'], source: labels[idx] };
}
// Titan-archetype villains (Xxtz'Hulissh-style) tie their Status to Scene Challenge
// progress -- see the app.js twin of this function for the full rationale.
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
  if (best) return { die: villainRow['Status' + (best.idx + 1) + 'Die'], source: labels[best.idx] };
  const baselineIdx = labels.findIndex((l, i) => l && !stages.some(st => st.idx === i));
  if (baselineIdx >= 0) return { die: villainRow['Status' + (baselineIdx + 1) + 'Die'], source: labels[baselineIdx] };
  return null;
}
function computeVillainStatus(villainRow, token, scene) {
  if (!villainRow) return { die: '', source: '' };
  if (villainRow.GreenStatusDie) {
    const band = villainBand(villainRow, token.currentHealth);
    const die = { green: villainRow.GreenStatusDie, yellow: villainRow.YellowStatusDie, red: villainRow.RedStatusDie, out: villainRow.RedStatusDie }[band];
    return { die, source: band.toUpperCase() + ' zone' };
  }
  const pb = resolveOwnPenaltyBonusStatus(villainRow, token, scene);
  if (pb) return pb;
  const cl = resolveChallengeLinkedStatus(villainRow, token, scene);
  if (cl) return cl;
  for (let i = 1; i <= 5; i++) {
    const label = villainRow['Status' + i + 'Label'], die = villainRow['Status' + i + 'Die'];
    if (!label || !die) continue;
    const type = guessStatusCountType(label);
    if (type === 'always') return { die, source: label };
    if (!type) continue;
    const range = parseStatusRange(label);
    if (!range) continue;
    const count = countBoardStateFor(type, token, scene);
    if (count === null) continue;
    if (count >= range[0] && count <= range[1]) return { die, source: label };
  }
  if (token.statusOverride) return { die: token.statusOverride, source: '' };
  return { die: villainRow.Status1Die || '', source: '' };
}

function byName(a, b) {
  return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
}
function dieSize(t) {
  return Number(t.currentDie) || 0;
}
function villainMaxHealth(t) {
  const row = libVillains.find(v => v.Slug === t.slug) || {};
  return Number(row.MaxHealth) || Number(t.maxHealth) || 0;
}
function sortEnemyTokens(tokens) {
  // Bystander last. Others by Type then name (list already affiliation-filtered).
  const combat = (tokens || []).filter(t => !isNonCombatToken(t));
  const nonCombat = (tokens || []).filter(t => isNonCombatToken(t)).sort(byName);
  const ranked = combat.slice().sort((a, b) => tokenTypeSortRank(a) - tokenTypeSortRank(b) || byName(a, b));
  return ranked.concat(nonCombat);
}

function backgroundUrl(key) {
  return `/api/backgrounds/${encodeURIComponent(key)}`;
}
function portraitKey(kind, slug) {
  const pk = kind === 'hero' ? 'hero' : kind === 'villain' ? 'villain' : 'minion';
  return `portrait-${pk}-${slug}`;
}

function parseDieSize(val) {
  const m = String(val == null ? '' : val).match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}
function villainHealthBar(current, max) {
  const maxH = Number(max) || 0;
  const cur = Number(current);
  const health = (current === '' || current == null || isNaN(cur)) ? maxH : Math.max(0, cur);
  if (!maxH || health <= 0) return { pct: 0, band: 'out' };
  const pct = Math.max(0, Math.min(100, (health / maxH) * 100));
  let band = 'red';
  if (pct >= 51) band = 'green';
  else if (pct >= 11) band = 'yellow';
  return { pct, band };
}
function lieutenantHealthBar(startingDie, currentDie) {
  const start = parseDieSize(startingDie);
  const missing = currentDie == null || currentDie === '';
  const cur = missing ? start : parseDieSize(currentDie);
  const ladders = {
    12: { 12: [100, 'green'], 10: [80, 'green'], 8: [60, 'green'], 6: [40, 'yellow'], 4: [20, 'red'] },
    10: { 10: [100, 'green'], 8: [75, 'green'], 6: [50, 'yellow'], 4: [25, 'red'] },
    8: { 8: [100, 'green'], 6: [66, 'yellow'], 4: [33, 'red'] },
    6: { 6: [66, 'yellow'], 4: [33, 'red'] },
  };
  const ladder = ladders[start];
  if (!ladder || cur < 4) return { pct: 0, band: 'out' };
  const key = cur >= start ? start : cur;
  const hit = ladder[key];
  if (!hit) return { pct: 0, band: 'out' };
  return { pct: hit[0], band: hit[1] };
}
function renderFighterCard(t, scene) {
  let meter = '';
  if (t.kind === 'villain') {
    const row = libVillains.find(v => v.Slug === t.slug) || {};
    const maxHealth = Number(row.MaxHealth) || Number(t.maxHealth) || 20;
    const currentHealth = Number(t.currentHealth) || maxHealth;
    const { pct, band } = villainHealthBar(currentHealth, maxHealth);
    meter = `<div class="health-bar-track"><div class="health-bar-fill ${band}" style="width:${pct}%"></div></div>`;
  } else if (t.kind === 'lieutenant') {
    const row = libRowForToken(t) || {};
    const { pct, band } = lieutenantHealthBar(row.Die, t.currentDie);
    meter = `<div class="health-bar-track"><div class="health-bar-fill ${band}" style="width:${pct}%"></div></div>`;
  }
  return `<div class="mvc-card ${t.kind}">
    <div class="mvc-art"><img src="${backgroundUrl(portraitKey(t.kind, t.slug))}" alt="" onerror="this.style.opacity='0.15'"></div>
    <div class="mvc-plate">${escHtml(t.name)}</div>
    ${meter}
    ${bhdRowHtml(t, scene)}
  </div>`;
}

async function poll() {
  try {
    const activeRes = await fetch('/api/active-scene');
    const active = await activeRes.json();
    if (!active.slug) { renderScene(null); }
    else {
      await fetchLibrary();
      const sceneRes = await fetch(`/api/scenes/${encodeURIComponent(active.slug)}`);
      if (!sceneRes.ok) renderScene(null);
      else renderScene(await sceneRes.json());
    }
  } catch (e) {
    // transient network hiccup — keep last rendered state, try again next tick
  }
  try {
    const rollRes = await fetch('/api/revealed-roll');
    const roll = await rollRes.json();
    renderRollOverlay(roll);
  } catch (e) {
    // transient network hiccup — leave overlay as-is
  }
}

function renderRollOverlay(roll) {
  const el = document.getElementById('rollOverlay');
  if (!roll) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="roll-who">${escHtml(roll.tokenName)} rolled…</div>
    <div class="roll-dice-row">
      <div class="roll-die-block"><span class="roll-die-label">Min</span><span class="roll-die-value">${roll.min}</span></div>
      <div class="roll-die-block"><span class="roll-die-label">Mid</span><span class="roll-die-value">${roll.mid}</span></div>
      <div class="roll-die-block"><span class="roll-die-label">Max</span><span class="roll-die-value">${roll.max}</span></div>
    </div>
    <div class="roll-effect">Effect Die (${escHtml(roll.effectLabel)}): ${roll.effectValue}</div>`;
}

fetchLibrary();
poll();
setInterval(poll, 2000);
