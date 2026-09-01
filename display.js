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

function renderScene(scene) {
  document.getElementById('displayEmpty').classList.toggle('hidden', !!scene);
  document.getElementById('locationsRow').classList.toggle('hidden', !scene);
  if (!scene) {
    document.getElementById('displaySceneName').textContent = 'No active scene';
    document.getElementById('displayDifficulty').textContent = '';
    document.getElementById('displayTrackerRow').innerHTML = '';
    document.getElementById('displayChallenges').innerHTML = '';
    const logEl = document.getElementById('displayActivityLog');
    if (logEl) logEl.innerHTML = '';
    const envEl = document.getElementById('displayEnvironment');
    if (envEl) envEl.innerHTML = '';
    return;
  }
  document.getElementById('displaySceneName').textContent = scene.name;
  document.getElementById('displayDifficulty').textContent = scene.difficulty;
  document.getElementById('displayTrackerRow').innerHTML = trackerStarsHtml(scene.tracker);

  const envEl = document.getElementById('displayEnvironment');
  if (envEl) {
    // Name and Traits are setting/flavor — shown to players. Twists are GM-only
    // (never fetched here at all — this page has no code path that reads them).
    const env = scene.environment ? libEnvironments.find(x => x.Slug === scene.environment) : null;
    envEl.innerHTML = env ? `<span class="env-name">${escHtml(env.Name)}</span>` : '';
  }

  const row = document.getElementById('locationsRow');
  row.innerHTML = '';
  scene.locations.forEach(loc => {
    const col = document.createElement('div');
    col.className = 'location-col';
    if (loc.background) {
      col.style.backgroundImage = `linear-gradient(rgba(11,13,18,0.55),rgba(11,13,18,0.75)), url('/api/backgrounds/${encodeURIComponent(loc.background)}')`;
      col.style.backgroundSize = 'cover';
      col.style.backgroundPosition = 'center';
    }
    const tokensHtml = scene.tokens.filter(t => t.locationId === loc.id).map(t => renderTokenReadOnly(t, scene)).join('')
      || '<div class="location-empty-hint">&nbsp;</div>';
    col.innerHTML = `<div class="location-header"><span class="location-name-display">${escHtml(loc.name)}</span></div>
      <div class="location-body">${tokensHtml}</div>`;
    row.appendChild(col);
  });

  const chalEl = document.getElementById('displayChallenges');
  const visible = scene.challenges || [];
  chalEl.innerHTML = visible.length === 0 ? '' : visible.map(c => `
    <div class="challenge-board-card">
      <div class="challenge-board-top">
        <span class="challenge-board-title">${escHtml(c.title)}</span>
        <span class="token-type-chip challenge-type-chip">${c.type}</span>
      </div>
      ${c.paths.map(p => `<div class="challenge-path-row"><span>${escHtml(p.label)}</span><span class="counter-value">${p.successesMarked} / ${p.successesNeeded}</span></div>`).join('')}
      ${c.type === 'Timed' && c.timerMode === 'turns' ? `<div class="challenge-path-row"><span>Turns remaining</span><span class="counter-value">${c.timerTurnsRemaining}</span></div>` : ''}
      ${!c.hidden && c.solution ? `<div class="challenge-path-row"><em>${escHtml(c.solution)}</em></div>` : ''}
    </div>`).join('');

  renderActivityLog(scene);
}

// Player Display gets the FULL feed (actor + target + result + dice values) --
// not redacted -- matching the GM Console's own renderActivityLog(), duplicated
// here per this project's established app.js/display.js duplication pattern.
function renderActivityLog(scene) {
  const el = document.getElementById('displayActivityLog');
  if (!el) return;
  const log = (scene && scene.activityLog) || [];
  if (!log.length) { el.innerHTML = '<h3 class="sidebar-heading">Activity Log</h3><p class="empty-hint">Nothing has happened yet.</p>'; return; }
  const recent = log.slice(-200).slice().reverse();
  let html = '<h3 class="sidebar-heading">Activity Log</h3><div class="activity-log-list">';
  recent.forEach(e => {
    const who = e.actor ? escHtml(e.actor.name) : '';
    const whom = e.target ? ' → ' + escHtml(e.target.name) : '';
    let diceStr = '';
    if (e.details && (e.details.min != null || e.details.mid != null || e.details.max != null)) {
      diceStr = ` <span class="activity-log-dice">(min ${e.details.min}, mid ${e.details.mid}, max ${e.details.max})</span>`;
    }
    html += `<div class="activity-log-entry"><span class="activity-log-action">${escHtml(e.action)}</span>: ${who}${whom} — ${escHtml(e.result)}${diceStr}</div>`;
  });
  html += '</div>';
  el.innerHTML = html;
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
  return null;
}
function countBoardStateFor(type, token, scene) {
  if (!scene) return null;
  if (type === 'minions') return scene.tokens.filter(t => (t.kind === 'minion' || t.kind === 'lieutenant') && !t.ko).length;
  if (type === 'villains') return scene.tokens.filter(t => t.kind === 'villain' && t.id !== token.id).length;
  if (type === 'opponents') return scene.tokens.filter(t => t.kind === 'hero' && t.locationId === token.locationId).length;
  if (type === 'heroPenalties') return scene.tokens.filter(t => t.kind === 'hero' && (t.tags || []).length > 0).length;
  return null;
}
function computeVillainStatus(villainRow, token, scene) {
  if (!villainRow) return { die: '', source: '' };
  if (villainRow.GreenStatusDie) {
    const band = villainBand(villainRow, token.currentHealth);
    const die = { green: villainRow.GreenStatusDie, yellow: villainRow.YellowStatusDie, red: villainRow.RedStatusDie, out: villainRow.RedStatusDie }[band];
    return { die, source: band.toUpperCase() + ' zone' };
  }
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

function backgroundUrl(key) {
  return `/api/backgrounds/${encodeURIComponent(key)}?t=${Date.now()}`;
}
function portraitKey(kind, slug) {
  const pk = kind === 'hero' ? 'hero' : kind === 'villain' ? 'villain' : 'minion';
  return `portrait-${pk}-${slug}`;
}

function renderTokenReadOnly(t, scene) {
  let body = `<div class="token-top">
      <div class="token-top-left">
        <img class="token-portrait" src="${backgroundUrl(portraitKey(t.kind, t.slug))}" onerror="this.style.display='none'">
        <div class="token-name">${escHtml(t.name)}</div>
      </div>
      <span class="token-type-chip ${t.kind}">${t.kind === 'hero' ? 'Hero' : t.kind === 'villain' ? 'Villain' : t.kind}</span></div>`;

  if (t.kind === 'hero') {
    const row = libHeroes.find(h => h.Slug === t.slug) || {};
    const maxHealth = Number(row.MaxHealth) || t.maxHealth || 20;
    const bandInfo = computeHeroStatus(maxHealth, t.currentHealth, scene);
    const pct = Math.max(0, Math.min(100, (t.currentHealth / maxHealth) * 100));
    const bandKey = bandInfo.band === 'out' ? null : (bandInfo.band.charAt(0).toUpperCase() + bandInfo.band.slice(1));
    const statusDie = bandKey ? (row[bandKey + 'StatusDie'] || '') : '';
    const statusBlock = bandInfo.band === 'out'
      ? `<div class="die-row"><span class="die-row-label">OUT — Out ability only</span></div>`
      : (statusDie
          ? `<div class="die-row"><span class="die-badge ${statusDie}">${statusDie}</span><span class="die-row-label">${bandInfo.band.toUpperCase()} Status</span></div>`
          : '');
    body += `<div class="health-wrap"><div class="health-bar-track"><div class="health-bar-fill ${bandInfo.band}" style="width:${pct}%"></div></div>
      <div class="health-readout"><span>${bandInfo.band.toUpperCase()}</span></div>${statusBlock}</div>`;
  } else if (t.kind === 'villain') {
    const row = libVillains.find(v => v.Slug === t.slug) || {};
    const maxHealth = Number(row.MaxHealth) || t.maxHealth || 20;
    const band = villainBand(row, t.currentHealth);
    const pct = Math.max(0, Math.min(100, (t.currentHealth / maxHealth) * 100));
    const status = computeVillainStatus(row, t, scene);
    body += `<div class="health-wrap"><div class="health-bar-track"><div class="health-bar-fill ${band}" style="width:${pct}%"></div></div></div>
      <div class="die-row"><span class="die-badge ${status.die || 'd8'}">${status.die || '?'}</span>${status.source ? `<span class="die-row-label">${escHtml(status.source)}</span>` : ''}</div>`;
  }
  if (t.kind === 'minion' || t.kind === 'lieutenant') {
    body += t.ko
      ? `<div class="die-row"><span class="die-badge ko">KO</span><span class="die-row-label">Defeated</span></div>`
      : `<div class="die-row"><span class="die-badge d${t.currentDie}">d${t.currentDie}</span></div>`;
  }
  return `<div class="token">${body}</div>`;
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
