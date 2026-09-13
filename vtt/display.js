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

let libHeroes = [], libVillains = [], libEnvironments = [];

function escHtml(v) { return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

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
  const n = bhdTotals(scene, t);
  // Hero Health numbers show on Player Display; Villain Health numbers stay hidden
  // (bar only, via renderFighterCard's meter) — asymmetric on purpose, see CLAUDE.md.
  const healthCell = t.kind === 'hero'
    ? `<div class="bhd-stat health"><span>HEALTH</span><b>${Number(t.currentHealth) || 0}</b></div>`
    : '';
  return `<div class="bhd-row">
    <div class="bhd-stat boost"><span>BOOST</span><b>${n.boost}</b></div>
    <div class="bhd-stat hinder"><span>HINDER</span><b>${n.hinder}</b></div>
    <div class="bhd-stat defend"><span>DEFEND</span><b>${n.defend}</b></div>
    ${healthCell}
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
    const [h, v, e] = await Promise.all([
      fetch('/api/csv/heroes').then(r => r.text()),
      fetch('/api/csv/villains').then(r => r.text()),
      fetch('/api/csv/environments').then(r => r.text()),
    ]);
    libHeroes = h.trim() ? Papa.parse(h.trim(), { header: true, skipEmptyLines: true }).data : [];
    libVillains = v.trim() ? Papa.parse(v.trim(), { header: true, skipEmptyLines: true }).data : [];
    libEnvironments = e.trim() ? Papa.parse(e.trim(), { header: true, skipEmptyLines: true }).data : [];
  } catch (e) { /* keep last known library on transient errors */ }
}

function trackerStarsHtml(tracker) {
  return '<div class="tracker-stars">' + tracker.stars.map((color, i) =>
    `<div class="tracker-star ${color} ${i === tracker.position ? 'tracker-marker' : ''}">★</div>`).join('') + '</div>';
}

function sceneVisualSig(scene) {
  if (!scene) return 'null';
  return JSON.stringify({
    name: scene.name, difficulty: scene.difficulty, tracker: scene.tracker,
    locations: scene.locations, tokens: scene.tokens, mods: scene.mods,
    environment: scene.environment, challenges: scene.challenges
  });
}

function fitNameSize(el, ctx, hi) {
  const text = (el.textContent || '').trim();
  if (!text) return hi;
  const cs = getComputedStyle(el);
  const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const maxW = el.clientWidth - pad;
  if (maxW <= 1) return hi;
  const family = cs.fontFamily;
  const weight = cs.fontWeight;
  let lo = 10, best = 10, top = hi;
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
    let shared = 26;
    plates.forEach(el => { shared = Math.min(shared, fitNameSize(el, ctx, 26)); });
    plates.forEach(el => {
      el.style.fontSize = shared + 'px';
      el.style.textOverflow = 'clip';
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

  const row = document.getElementById('locationsRow');
  const locs = scene.locations || [];
  const ko = scene.tokens.filter(t => t.ko);
  const at = (locId) => scene.tokens.filter(t => !t.ko && (t.locationId || '') === (locId || ''));
  const side = (label, cls, tokens) => `
    <div class="mvc-side ${cls}">
      <div class="mvc-side-label">${label}</div>
      <div class="mvc-row">${tokens.map(t => renderFighterCard(t, scene)).join('') || '<div class="mvc-empty">—</div>'}</div>
    </div>`;
  row.innerHTML = locs.map(loc => {
    const here = at(loc.id);
    const heroes = here.filter(t => t.kind === 'hero');
    const enemies = sortEnemyTokens(here.filter(t => t.kind === 'villain' || t.kind === 'lieutenant' || t.kind === 'minion'));
    return `<section class="location-block">
      <div class="location-header"><span class="location-name-display">${escHtml(loc.name)}</span></div>
      <div class="mvc-stage">
        ${side('HEROES', 'heroes', heroes)}
        ${side('VILLAINS', 'villains', enemies)}
      </div>
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
  const villains = tokens.filter(t => t.kind === 'villain')
    .sort((a, b) => villainMaxHealth(b) - villainMaxHealth(a) || byName(a, b));
  const lieutenants = tokens.filter(t => t.kind === 'lieutenant')
    .sort((a, b) => dieSize(b) - dieSize(a) || byName(a, b));
  const minions = tokens.filter(t => t.kind === 'minion')
    .sort((a, b) => dieSize(b) - dieSize(a) || byName(a, b));
  return villains.concat(lieutenants, minions);
}

function backgroundUrl(key) {
  return `/api/backgrounds/${encodeURIComponent(key)}`;
}
function portraitKey(kind, slug) {
  const pk = kind === 'hero' ? 'hero' : kind === 'villain' ? 'villain' : 'minion';
  return `portrait-${pk}-${slug}`;
}

function renderFighterCard(t, scene) {
  let meter = '';
  if (t.kind === 'hero') {
    const row = libHeroes.find(h => h.Slug === t.slug) || {};
    const maxHealth = Number(row.MaxHealth) || t.maxHealth || 20;
    const bandInfo = computeHeroStatus(maxHealth, t.currentHealth, scene);
    const pct = Math.max(0, Math.min(100, (t.currentHealth / maxHealth) * 100));
    meter = `<div class="health-bar-track"><div class="health-bar-fill ${bandInfo.band}" style="width:${pct}%"></div></div>`;
  } else if (t.kind === 'villain') {
    const row = libVillains.find(v => v.Slug === t.slug) || {};
    const maxHealth = Number(row.MaxHealth) || t.maxHealth || 20;
    const band = villainBand(row, t.currentHealth);
    const pct = Math.max(0, Math.min(100, (t.currentHealth / maxHealth) * 100));
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
