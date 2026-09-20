# Hero Creator catalogs (CSV)

Local GM data for a future builder. **Not** `vtt/rules/` (that folder stays paraphrased).
**Not** `campaign/abilities.csv` (that file is *this hero’s* picks).

Join key: `slug`. Wiki tables can show the same slug as plain text. The VTT copies a catalog row into `campaign/abilities.csv` and sets `HeroSlug`.

## Step → file

| Step | File | Rows (now) |
|---|---|---|
| (order) | `steps.csv` | 8 |
| 1 | `backgrounds.csv` | 20 |
| — | `powers.csv` / `qualities.csv` | 54 / 24 |
| 2 | `power_sources.csv` + `power_source_abilities.csv` | 20 + 90 |
| 3 | `archetypes.csv` + `archetype_abilities.csv` | 20 + 99 |
| 4 | `personalities.csv` | 20 |
| 5 | `red_abilities.csv` | 67 (category-gated) |
| 6 | `retcon.csv` | 7 |
| 7 | `health_formula.csv` + `health_chart.csv` | 4 + 24 (max 17–40) |
| (principles, picked at 1–3) | `principles.csv` | 64 |
| 8 | (no catalog) | name / alias / costume |

`Type` is `A` / `R` / `I`. Storage = letter.

## Backgrounds = two die pools (don’t mix them)

`backgrounds.csv` (reload the file if a sheet is already open):

| Columns | What |
|---|---|
| `qualities_offered` | Menu you pick from (Fitness, any Mental, …) |
| `assign_dice_count` | How many Pool A dice (2 or 3) |
| `required_quality` | If set (Medical = `Medicine`), `assign_die_1` is locked to that quality. Remaining dice pick from `qualities_offered`. |
| `assign_die_1` … `_3` | **Pool A** — exact die sizes you put on those qualities. Type `d10` / `d8` / `d6` from the book. |
| `next_die_1` … `_3` | **Pool B** — dice that go to Power Source. Same, from the book. |

Empty die cells are glyphs. Leave unused slots blank (a 2-dice background has blank `assign_die_3`).

**Power sources / archetypes** do **not** store incoming assign dice — those are the previous step’s `next_die_*`. Those files only have `next_die_1`…`_3` (dice this step grants forward), plus `required_power` / `required_quality` and the offered list. Reload those CSVs.

## Empty on purpose

- Die-size columns on backgrounds / `next_step_dice` on power sources and archetypes — **glyphs**. Type from the book.
- `die_source` on ability rows — fill when you know it’s Cold vs `[power]`.
- Some **Green** lists on power sources / archetypes — not recovered from the text layer. Do not invent.

## Instance vs catalog

`campaign/abilities.csv` = `HeroSlug,Zone,Name,Type,GameText,RollType,DieSource,EffectDieHint`

When the builder (or you) picks Area Alteration for Masquerade, copy `power_source_abilities` row `accident-area-alteration` into that file with `HeroSlug=masquerade` and `Zone=Yellow`.

Source: wiki chapter `03 Creating Heroes` (screenshot distills + span tables). Physical book still wins for dice.

## Villain builder catalogs

| File | Rows |
|---|---|
| `villain_approaches.csv` | 18 (health + pairings) |
| `villain_archetypes.csv` | 14 (`status_model` = health / condition / manual; `status_slots` = `label|die;…`) |

Ability game text is **not** in these files yet — type it in the builder. Max 5 abilities, 1 upgrade, 1 mastery. Save hits `POST /api/builder/villain`.
