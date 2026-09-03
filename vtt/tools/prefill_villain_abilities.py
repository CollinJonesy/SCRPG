#!/usr/bin/env python3
"""
One-off script: pre-fill villain ability MD stubs from the paraphrased
rules/05-3-villain-archetypes-upgrades-health.md summary.

IMPORTANT -- honesty limitation (see CLAUDE.md / docs/ASKS.md):
rules/ only lists ability NAMES per Archetype ("choose N: NameA, NameB, ...").
It does NOT contain full GameText, Action/Reaction/Inherent type, or Icon
classification for any of them. This script therefore writes STUB headings
only -- [?] [?] "Name" with a placeholder body -- never fabricated Type,
Icon, or Description text. A GM must fill in the real rules text by hand
later (open Notes / edit the MD file directly).

Archetypes with no "Abilities (...)" line in the paraphrased summary (Loner,
Overlord, Predator, Squad, Titan) get no stub at all -- there is nothing
archetype-specific to prefill, so their MD ships empty, same as Minions and
Lieutenants (see docs/ASKS.md section 4).

Usage:
    python3 tools/prefill_villain_abilities.py --campaign /path/to/campaign [--dry-run]

Never overwrites an existing non-empty MD file (preserves any ability text
the GM has already written by hand).
"""
import argparse
import csv
import re
import sys
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
RULES_FILE = APP_DIR / 'rules' / '05-3-villain-archetypes-upgrades-health.md'

PLACEHOLDER_BODY = '*(GameText not available in the paraphrased rules summary -- fill in from the physical rulebook.)*'


def parse_archetype_abilities(rules_text):
    """Returns {archetype_name: [ability_name, ...]}."""
    result = {}
    blocks = re.split(r'^##\s+(.+?)\s+Archetype\s*$', rules_text, flags=re.MULTILINE)
    for i in range(1, len(blocks), 2):
        name = blocks[i].strip()
        body = blocks[i + 1]
        m = re.search(r'\*\*Abilities[^:]*:\*\*\s*(.+)', body)
        if not m:
            continue
        names = []
        header_paren = re.search(r'\*\*Abilities\s*\(([^)]*)\)', body)
        if header_paren and 'mandatory' in header_paren.group(1).lower():
            mand = re.search(r'mandatory\s+([A-Z][A-Za-z &]+)', header_paren.group(1))
            if mand:
                names.append(mand.group(1).strip())
        for part in m.group(1).split(','):
            part = part.strip().rstrip('.')
            if not part:
                continue
            part = re.sub(r'\s*\([^)]*\)\s*$', '', part).strip()
            if part:
                names.append(part)
        if names:
            result[name] = names
    return result


def make_stub_md(character_name, ability_names):
    lines = [f'# {character_name}', '', '## Abilities', '']
    for name in ability_names:
        lines.append(f'### [?] [?] "{name}"')
        lines.append(PLACEHOLDER_BODY)
        lines.append('')
    return '\n'.join(lines).rstrip() + '\n'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--campaign', required=True, help='Path to a campaign folder')
    ap.add_argument('--dry-run', action='store_true', help="Don't write files, just report what would happen")
    args = ap.parse_args()

    campaign = Path(args.campaign)
    villains_csv = campaign / 'villains.csv'
    md_dir = campaign / 'md' / 'villains'

    if not villains_csv.exists():
        print(f'ERROR: {villains_csv} not found', file=sys.stderr)
        sys.exit(1)

    rules_text = RULES_FILE.read_text(encoding='utf-8')
    archetype_abilities = parse_archetype_abilities(rules_text)

    md_dir.mkdir(parents=True, exist_ok=True)

    with open(villains_csv, encoding='utf-8') as f:
        rows = list(csv.DictReader(f))

    written, skipped_existing, skipped_no_data = 0, 0, 0
    for row in rows:
        slug = row.get('Slug', '').strip()
        archetype = row.get('Archetype', '').strip()
        name = row.get('Name', slug)
        if not slug:
            continue
        abilities = archetype_abilities.get(archetype)
        if not abilities:
            skipped_no_data += 1
            print(f'  skip (no archetype ability data): {name} ({archetype})')
            continue
        md_path = md_dir / f'{slug}.md'
        if md_path.exists() and md_path.read_text(encoding='utf-8').strip():
            skipped_existing += 1
            print(f'  skip (MD already has content): {name}')
            continue
        content = make_stub_md(name, abilities)
        print(f'  {"[dry-run] would write" if args.dry_run else "write"}: {md_path} ({len(abilities)} ability stub(s))')
        if not args.dry_run:
            md_path.write_text(content, encoding='utf-8')
        written += 1

    print(f'\nDone. Written: {written}, skipped (existing content): {skipped_existing}, skipped (no archetype data): {skipped_no_data}')


if __name__ == '__main__':
    main()
