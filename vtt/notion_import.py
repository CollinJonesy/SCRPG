#!/usr/bin/env python3
"""
notion_import.py — reshape Notion database CSV exports into the SCRPG Scene
Board's library format (players.csv / villains.csv / minions.csv + md/ files).

No dependencies beyond the Python 3 standard library.

USAGE
  python3 notion_import.py --campaign /path/to/your-campaign \
      --heroes "The Hero Roster.csv" \
      --villains "Villain Database.csv" \
      --minions "Minions & Lieutenants.csv"

  Any of --heroes / --villains / --minions can be omitted if you're only
  importing one or two databases at a time.

WHERE TO GET THE EXPORT FILES
  In Notion, open the database as a full-page table (not a linked view),
  click the "..." menu in the top right → Export → CSV. Notion writes one
  CSV per database, named after the database (e.g. "The Hero Roster.csv").
  Sub-items / nested databases: leave "Include subpages" OFF, we don't need it.

BEHAVIOR
  - Upserts by Slug: if a row's slugified Name already exists in the
    destination CSV, that row is replaced. New names are appended.
    Rows you've added by hand in the app that don't match a Notion row
    are left alone.
  - Mechanical fields (Powers, Qualities, dice, Health) go to the CSV.
  - Flavor/bio fields (Biography, Costume, Tactics, Ability text, etc.)
    are written to a per-entry markdown file under md/<kind>/<slug>.md,
    OVERWRITING any existing file of that name. If you've hand-edited notes
    in the app, export them or copy them aside before re-running.
  - This never touches scene.json.
"""

import argparse
import csv
import re
import sys
from pathlib import Path

DICE_LADDER = [4, 6, 8, 10, 12]

HEROES_HEADERS = ['Slug', 'Name',
    'Power1', 'PowerDie1', 'Power2', 'PowerDie2', 'Power3', 'PowerDie3',
    'Power4', 'PowerDie4', 'Power5', 'PowerDie5', 'Power6', 'PowerDie6',
    'Quality1', 'QualityDie1', 'Quality2', 'QualityDie2', 'Quality3', 'QualityDie3',
    'Quality4', 'QualityDie4', 'Quality5', 'QualityDie5', 'Quality6', 'QualityDie6',
    'MaxHealth']

VILLAINS_HEADERS = ['Slug', 'Name', 'Approach', 'Archetype',
    'Power1', 'PowerDie1', 'Power2', 'PowerDie2', 'Power3', 'PowerDie3',
    'Power4', 'PowerDie4', 'Power5', 'PowerDie5',
    'Quality1', 'QualityDie1', 'Quality2', 'QualityDie2', 'Quality3', 'QualityDie3',
    'Quality4', 'QualityDie4', 'Quality5', 'QualityDie5', 'Quality6', 'QualityDie6',
    'MaxHealth', 'GreenFloor', 'YellowFloor', 'RedFloor',
    'Status1Label', 'Status1Die', 'Status2Label', 'Status2Die', 'Status3Label', 'Status3Die',
    'Status4Label', 'Status4Die', 'Status5Label', 'Status5Die']

MINIONS_HEADERS = ['Slug', 'Name', 'Type', 'Die', 'Faction']


def slugify(name):
    s = re.sub(r'[^a-z0-9]+', '-', (name or 'entry').lower()).strip('-')
    return s or 'entry'


def unique_slug(base, taken):
    candidate, n = base, 1
    while candidate in taken:
        n += 1
        candidate = f'{base}-{n}'
    return candidate


def norm_die(value):
    """Coerce a Notion die value ('d8', 'D8', '8') to our 'd8' format. Empty stays empty."""
    if not value:
        return ''
    v = str(value).strip().lower()
    m = re.search(r'(\d+)', v)
    if not m:
        return ''
    n = int(m.group(1))
    return f'd{n}' if n in DICE_LADDER else ''


def parse_floor(value):
    """Notion's Green/Yellow/Red Status formula fields may export as a single
    number or a 'high-low' range like '40-30'. We want the floor (lower bound)."""
    if value is None:
        return ''
    v = str(value).strip()
    if not v:
        return ''
    if '-' in v:
        parts = [p.strip() for p in v.split('-') if p.strip()]
        nums = [int(p) for p in parts if p.lstrip('-').isdigit()]
        if nums:
            return str(min(nums))
    if v.lstrip('-').isdigit():
        return v
    return ''  # unrecognized format — leave blank rather than guess


def read_notion_csv(path):
    with open(path, newline='', encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))


def write_csv(path, headers, rows):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=headers)
        w.writeheader()
        for r in rows:
            w.writerow({h: r.get(h, '') for h in headers})


def load_existing(path, headers):
    if not path.exists():
        return []
    with open(path, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def upsert(existing_rows, new_rows):
    by_slug = {r['Slug']: r for r in existing_rows}
    for r in new_rows:
        by_slug[r['Slug']] = r
    return list(by_slug.values())


def write_md(md_dir, slug, sections):
    """sections: list of (heading, text) pairs. Skips empty text."""
    md_dir.mkdir(parents=True, exist_ok=True)
    lines = []
    for heading, text in sections:
        if text:
            lines.append(f'## {heading}\n\n{text}\n')
    if lines:
        (md_dir / f'{slug}.md').write_text('\n'.join(lines), encoding='utf-8')


def import_heroes(src_path, campaign):
    src = read_notion_csv(src_path)
    existing = load_existing(campaign / 'players.csv', HEROES_HEADERS)
    taken = {r['Slug'] for r in existing}
    new_rows = []
    for row in src:
        name = row.get('Name', '').strip()
        if not name:
            continue
        slug = unique_slug(slugify(name), taken)
        taken.add(slug)
        out = {'Slug': slug, 'Name': name}
        for i in range(1, 7):
            out[f'Power{i}'] = row.get(f'Power ({i})', '')
            out[f'PowerDie{i}'] = norm_die(row.get(f'Power ({i}) Die', ''))
        for i in range(1, 7):
            out[f'Quality{i}'] = row.get(f'Quality ({i})', '')
            out[f'QualityDie{i}'] = norm_die(row.get(f'Quality ({i}) Die', ''))
        out['MaxHealth'] = row.get('Max Health', '').strip()
        new_rows.append(out)

        write_md(campaign / 'md' / 'heroes', slug, [
            ('Alias', row.get('Alias', '')),
            ('Archetype / Power Source', f"{row.get('Archetype','')} / {row.get('Power Source','')}"),
            ('Background', row.get('Background', '')),
            ('Personality', row.get('Personality', '')),
            ('Principles', f"{row.get('Principle (1)','')}, {row.get('Principle (2)','')}"),
            ('Appearance', ', '.join(filter(None, [
                row.get('Age',''), row.get('Gender',''), row.get('Height',''),
                row.get('Build',''), row.get('Hair',''), row.get('Eyes',''), row.get('Skin','')]))),
            ('Costume / Equipment', row.get('Costume/Equipment', '')),
        ])

    merged = upsert(existing, new_rows)
    write_csv(campaign / 'players.csv', HEROES_HEADERS, merged)
    print(f'Heroes: {len(new_rows)} imported/updated, {len(merged)} total in players.csv')


def import_villains(src_path, campaign):
    src = read_notion_csv(src_path)
    existing = load_existing(campaign / 'villains.csv', VILLAINS_HEADERS)
    taken = {r['Slug'] for r in existing}
    new_rows = []
    for row in src:
        name = row.get('Name', '').strip()
        if not name:
            continue
        slug = unique_slug(slugify(name), taken)
        taken.add(slug)
        out = {'Slug': slug, 'Name': name,
               'Approach': row.get('Approach', ''), 'Archetype': row.get('Archetype', '')}
        for i in range(1, 6):
            out[f'Power{i}'] = row.get(f'Power ({i})', '')
            out[f'PowerDie{i}'] = norm_die(row.get(f'Power Die ({i})', ''))
        for i in range(1, 7):
            out[f'Quality{i}'] = row.get(f'Quality ({i})', '')
            out[f'QualityDie{i}'] = norm_die(row.get(f'Quality Die ({i})', ''))
        out['MaxHealth'] = row.get('Max Health', '').strip()
        out['GreenFloor'] = parse_floor(row.get('Green Status', ''))
        out['YellowFloor'] = parse_floor(row.get('Yellow Status', ''))
        out['RedFloor'] = parse_floor(row.get('Red Status', ''))
        for i in range(1, 6):
            out[f'Status{i}Label'] = row.get(f'Status ({i})', '')
            out[f'Status{i}Die'] = norm_die(row.get(f'Status Die ({i})', ''))
        new_rows.append(out)

        write_md(campaign / 'md' / 'villains', slug, [
            ('Alias', row.get('Alias', '')),
            ('Faction', row.get('Faction', '')),
            ('Biography', row.get('Biography', '')),
            ('Capabilities and Motivations', row.get('Capabilities and Motivations', '')),
            ('Costume / Equipment', row.get('Costume/Equipment', '')),
            ('Upgrades', f"{row.get('Upgrades','')} — {row.get('Upgrade Description','')}"),
            ('Appearance', ', '.join(filter(None, [
                row.get('Age',''), row.get('Gender',''), row.get('Height',''),
                row.get('Build',''), row.get('Hair',''), row.get('Eyes',''), row.get('Skin','')]))),
        ])

    merged = upsert(existing, new_rows)
    write_csv(campaign / 'villains.csv', VILLAINS_HEADERS, merged)
    print(f'Villains: {len(new_rows)} imported/updated, {len(merged)} total in villains.csv')
    unresolved = [r['Name'] for r in new_rows if not (r['GreenFloor'] and r['YellowFloor'] and r['RedFloor'])]
    if unresolved:
        print('  NOTE: could not parse Green/Yellow/Red floors for: ' + ', '.join(unresolved)
              + ' — check these manually in the Library tab, health bar will show as "Out" until fixed.')


def import_minions(src_path, campaign):
    src = read_notion_csv(src_path)
    existing = load_existing(campaign / 'minions.csv', MINIONS_HEADERS)
    taken = {r['Slug'] for r in existing}
    new_rows = []
    for row in src:
        name = row.get('Name', '').strip()
        if not name:
            continue
        slug = unique_slug(slugify(name), taken)
        taken.add(slug)
        out = {
            'Slug': slug, 'Name': name,
            'Type': row.get('Type', '').strip() or 'Minion',
            'Die': norm_die(row.get('Die', '')),
            'Faction': row.get('Faction', ''),
        }
        new_rows.append(out)

        write_md(campaign / 'md' / 'minions', slug, [
            ('Description', row.get('Description', '')),
            ('Ability', row.get('Ability', '')),
            ('Tactics', row.get('Tactics', '')),
        ])

    merged = upsert(existing, new_rows)
    write_csv(campaign / 'minions.csv', MINIONS_HEADERS, merged)
    print(f'Minions & Lieutenants: {len(new_rows)} imported/updated, {len(merged)} total in minions.csv')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--campaign', required=True, help='Path to your campaign folder (contains players.csv etc.)')
    ap.add_argument('--heroes', help='Path to Notion "The Hero Roster" CSV export')
    ap.add_argument('--villains', help='Path to Notion "Villain Database" CSV export')
    ap.add_argument('--minions', help='Path to Notion "Minions & Lieutenants" CSV export')
    args = ap.parse_args()

    campaign = Path(args.campaign).expanduser().resolve()
    if not campaign.exists():
        print(f'Campaign folder does not exist: {campaign}', file=sys.stderr)
        sys.exit(1)
    if not any([args.heroes, args.villains, args.minions]):
        print('Nothing to import — pass at least one of --heroes / --villains / --minions', file=sys.stderr)
        sys.exit(1)

    if args.heroes:
        import_heroes(Path(args.heroes).expanduser().resolve(), campaign)
    if args.villains:
        import_villains(Path(args.villains).expanduser().resolve(), campaign)
    if args.minions:
        import_minions(Path(args.minions).expanduser().resolve(), campaign)

    print('\nDone. Reload the app (or reopen the campaign folder) to see the imported entries.')


if __name__ == '__main__':
    main()
