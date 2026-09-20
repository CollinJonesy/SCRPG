// Shared "Appears in Collections" / "Collection" dropdown, used by all four
// builders (builder.html, villain-builder.html, minion-builder.html,
// issue-builder.html). Handles populating a <select> from /api/collections
// and the "+ New Collection…" inline quick-create.
//
// Each builder keeps its own local `collections` array and its own
// "collection changed" handler (they show different things below the
// dropdown — an Issue checklist for Hero/Villain/Minion, a Hero/Villain/
// Minion checklist for Issue) — this file only dedupes the identical dropdown
// bookkeeping that used to be copy-pasted three times (plus never added to
// Issue Builder at all, which is why it had no way to create a first
// Collection).
const CP_NEW_VALUE = '__new__';

function cpEsc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function cpSlugify(n) { return (n || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'collection'; }
function cpUniqueSlug(base, existing) {
  let candidate = base, n = 1;
  const taken = new Set((existing || []).map(c => c.slug));
  while (taken.has(candidate)) candidate = base + '-' + (++n);
  return candidate;
}

async function fetchCollections() {
  return await fetch('/api/collections').then(r => r.json()).catch(() => []) || [];
}

async function createCollection(existing) {
  const name = prompt('Collection name:');
  if (!name) return null;
  const slug = cpUniqueSlug(cpSlugify(name), existing);
  const coll = { name, issueSlugs: [] };
  await fetch('/api/collections/' + encodeURIComponent(slug), { method: 'PUT', body: JSON.stringify(coll, null, 2) });
  return { slug, ...coll };
}

// Fills a <select> with `collections` plus a trailing "+ New Collection…"
// option, preserving the current selection if it's still valid.
function fillCollectionSelect(selectEl, collections, placeholder) {
  const keep = selectEl.value;
  selectEl.innerHTML = '<option value="">' + cpEsc(placeholder || 'Choose a collection…') + '</option>'
    + collections.map(c => '<option value="' + cpEsc(c.slug) + '">' + cpEsc(c.name || c.slug) + '</option>').join('')
    + '<option value="' + CP_NEW_VALUE + '">+ New Collection…</option>';
  if (keep && collections.some(c => c.slug === keep)) selectEl.value = keep;
}

// Call at the top of a <select>'s onchange handler, before reading
// selectEl.value for anything else. If the user picked "+ New Collection…",
// prompts for a name, creates it, pushes it into `collections`, re-fills the
// select with the new collection selected, and returns its slug. Returns ''
// (and resets the select) if the prompt was cancelled. Otherwise returns
// selectEl.value unchanged, so callers can treat this as a transparent
// pre-step and keep using selectEl.value/the returned slug as before.
async function resolveCollectionPick(selectEl, collections, placeholder) {
  if (selectEl.value !== CP_NEW_VALUE) return selectEl.value;
  const created = await createCollection(collections);
  if (!created) { selectEl.value = ''; return ''; }
  collections.push(created);
  fillCollectionSelect(selectEl, collections, placeholder);
  selectEl.value = created.slug;
  return created.slug;
}
