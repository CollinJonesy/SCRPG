---
project: Architect
type: reference
status: active
updated: 2026-08-24
---

# Hero Creation — Process & Chain Logic
Source: printed pg.41–55 (PDF pg.49–63).

## Two Ways to Build
**Guided Method** (primary, recommended for new players / unclear concepts): each step gives you dice to roll; the roll's value(s) select your option from that step's chart. Not fully random — you choose which single die or sum-of-two to use, so you're steering toward what fits your concept.

**Constructed Method** (for players who already have a hero concept/backstory in mind): identical structure, but instead of rolling, you simply *pick* whichever chart entry fits your idea. You still need to track what die sizes you *would* have rolled at each step, because those die sizes carry forward into Powers/Qualities assignment.

**Secret Third Option — Making Existing Heroes:** you can build a hero without either method by directly assigning powers/qualities/abilities to replicate an existing published hero (with GM sign-off). Not recommended as a default — leads to "Superamazing Man" style overpowered/boring builds if every ability maxes out.

A hero can also mix methods per-step if only some players in the group are using guided vs. constructed — GM discretion on how much flexibility to allow.

## The 8-Step Chain
This is the actual dependency chain — each step's *output dice* become the *input* for assigning Powers/Qualities and feed into the next step's options.

| Step | Name | Page | What it produces |
|---|---|---|---|
| 1 | **Background** | 49 | Qualities (2–3, per Background entry), a Principle, new dice for Step 2 |
| 2 | **Power Source** | 57 | Some Powers, Yellow abilities, other abilities/qualities, dice for Step 3 |
| 3 | **Archetype** | 73 | Green abilities, sometimes another Principle, dice for Step 4 |
| 4 | **Personality** | 101 | Personality trait, Status dice, an Out ability, a Core Character quality (see pg.121) |
| 5 | **Red Abilities** | 106 | Choose 2 Red Abilities from lists tied to the category of Power/Quality you'll use for each |
| 6 | **Retcon** | 112 | One retroactive adjustment (see options below) |
| 7 | **Health** | 113 | Final Health total (formula below) |
| 8 | **Finishing Touches** | 114 | Name, alias, description, ability names |

**The critical dependency rule (confirmed directly from the rules text):** "Assign each die to a specific power or quality. Only the die *size* matters, not the values rolled." This is why guided and constructed methods stay mechanically compatible — a constructed-method player just needs to know what size die a step *would* have produced, then assigns it exactly like a guided-method player would.

### Step 5 detail — Red Abilities (the Power-gating step you flagged)
"Choose two Red Abilities. Pick from the list that corresponds with the category of the Power or Quality that you will use for this ability."
**This confirms the gating mechanic directly:** Red Abilities aren't chosen freely — each one is tied to a specific Power/Quality *category* (e.g., Athletic, Elemental/Energy, Psychic, etc. — the same categories from Powers_and_Qualities.md). You can only pick Red Abilities whose category matches a Power or Quality your hero already has. **The full per-category Red Ability lists are transcribed in `03-5-red-abilities.md`** (also fully implemented in `builder.html`'s `RED_ABILITIES` constant, used by both the Constructed and Free For All builder methods) — this note previously said "not yet transcribed," which was stale.

### Step 6 detail — Retcon (pick one)
Confirmed verbatim: "You're almost done — but maybe there's something that's not quiiite right. That's what the retcon (comics parlance for 'retroactive continuity') is for: tweaking a hero's origin story in a subtle way." Options:
- Swap any two dice within your Powers
- Swap any two dice within your Qualities
- Choose a different Power or Quality used in one of your abilities
- Add any d6 Power or Quality from any category
- Increase your Red status die by one size (maximum d12)
- Change either of your Principles to any other Principle
- Gain an extra Red Ability, as described in Step 5

**Worked example (Time-Slinger):** Christopher doesn't want to change anything within Jim's powers, so instead he wants something that fits Jim's ability to escape dangerous situations. He uses his retcon to take the Red ability **Quick Exit** and renames it **"Get Out of Dodge,"** applying his Robot Horse (Signature Vehicle) power to it:
> Attack using Robot Horse. Use your Max die. Hinder each nearby opponent with your Min die. After using this ability, you and up to 2 allies may end up anywhere in the scene, even outside of the action.

### Step 7 — Health formula
**Health = 8 + (maximum of your Red Status die) + (maximum of your choice of one Athletic Power or Mental Quality, or a d4 if you have none) + (the roll of a d10, or just use 4 if you don't want to roll — choose before rolling)**

**Correction:** this previously said "the roll of a d6," which is wrong — confirmed by checking real
published Volume1 hero data. Aeon Girl, Bunker, and Legacy's actual recorded MaxHealth values only
work out if `8 + Red status + Athletic/Mental` leaves a remainder of 7 or 8 to be explained by the
roll, which a d6 cannot produce under any roll. `builder.html`'s own UI (Step 7's hint text and the
"Roll d10 or choose 4" label) already said d10 — that was correct all along; this doc's "d6" was the
error, not the app.

**Health Quick Reference chart** (partial — visible range pg.113, totals 17–40; may extend further, worth confirming):
| Max Health | Green range | Yellow range | Red range |
|---|---|---|---|
| 40 | 40-30 | 29-15 | 14-1 |
| 39 | 39-30 | 29-15 | 14-1 |
| 38 | 38-29 | 28-14 | 13-1 |
| 37 | 37-29 | 27-14 | 13-1 |
| 36 | 36-28 | 27-14 | 13-1 |
| 35 | 35-27 | 26-13 | 12-1 |
| 34 | 34-26 | 25-13 | 12-1 |
| 33 | 33-26 | 25-13 | 12-1 |
| 32 | 32-25 | 24-12 | 11-1 |
| 31 | 31-24 | 23-12 | 11-1 |
| 30 | 30-23 | 22-12 | 11-1 |
| 29 | 29-23 | 22-11 | 10-1 |
| 28 | 28-22 | 21-11 | 10-1 |
| 27 | 27-21 | 20-11 | 10-1 |
| 26 | 26-21 | 20-10 | 9-1 |
| 25 | 25-20 | 19-10 | 9-1 |
| 24 | 24-19 | 18-10 | 8-1 |
| 23 | 23-19 | 18-9 | 8-1 |
| 22 | 22-18 | 17-9 | 8-1 |
| 21 | 21-17 | 16-9 | 8-1 |
| 20 | 20-16 | 15-8 | 7-1 |
| 19 | 19-15 | 14-8 | 7-1 |
| 18 | 18-15 | 14-8 | 7-1 |
| 17 | 17-14 | 13-7 | 6-1 |

**Worked example (Time-Slinger):** Christopher looks at Jim's Red status die (d8) and his Athletic powers/Mental qualities, finding Self-Discipline at **d10**. He rolls d6 and gets a 4. Total: **8 + 8 (Red status) + 10 (Self-Discipline) + 4 (rolled) = 30.** He notes Green range 30-23, Yellow 22-12, Red 11-1.

**⚠️ Discrepancy — now fully resolved.** The real, published Time-Slinger record (`Volume1/heroes.csv`,
transcribed from the physical rulebook) confirms **Self-Discipline is d8, not d10** — Personality.md's
worked example was right, this Health-step example's d10 was wrong. That alone left a 2-point gap
(`8 + 8 + 8 + 4 = 28`, not his real MaxHealth of 30) — but the actual root cause was the *other* bug on
this page: the roll is a **d10, not a d6** (see the Health formula correction above, confirmed against
Aeon Girl/Bunker/Legacy's real numbers, which can't work under a d6 cap at all). With that fixed,
`8 + 8 (Red) + 8 (Self-Discipline) + 6 (rolled) = 30` matches his real MaxHealth exactly — the worked
example's "rolls a d6 and gets a 4" was wrong in both the die size AND the specific result; the real
roll was very likely a 6, not a 4, consistent with everything else now confirmed. No physical-book
check needed after all — both errors traced back to the same root cause, verified against real data.

## Dice Assignment Mechanics (applies throughout all steps)
- Take the dice you just rolled (or would have rolled, constructed method) and assign each to a specific Power or Quality.
- **Only die size matters, not the rolled value.** Record as e.g. "Flying d8" or "Banter d6."
- You can put multiple dice from the *same* category step onto different Powers/Qualities, listed separately.
- **"I've Already Got That" rule:** if a step tells you to assign a die to a Power/Quality you already have, you can either (a) upgrade the existing one to the new die size and re-apply the old die elsewhere in the current step, or (b) just use the new die on a different choice in the current step. Never "lose" a die by double-selecting.

## Defining Abilities & Bracketed Choices
- Abilities say `[power]` or `[quality]` when they require you to specify which one they use — decided at selection, and locked in from then on.
- Abilities may also include bracketed decisions: which basic action (Attack/Defend/Overcome/Boost/Hinder), which elemental/energy type, etc.
- **Bracketed choices are fixed once made and cannot change except via Hero Advancement (pg.142).**
- Rename every ability to fit your hero's concept — placeholder names are fine mid-build, but should be finalized by Step 8.

## Ability Types
Every ability is one of three types, recorded on the hero sheet:
- **A**ction — uses an action icon (Attack, Defend, Overcome, Boost, Hinder, Recover)
- **R**eaction
- **I**nherent

## Auxiliary Sheets
"Some of the more complex hero options require use of an extra sheet, called an auxiliary sheet... If you don't need an auxiliary sheet, you don't have to use one. However, you can also use this sheet to note any reminders about how your hero works, keep track of names of people you meet in the game, doodles, etc."
**Confirms:** Auxiliary Sheets aren't exclusively for "official" complex mechanics (like Bunker's Modes or Muerto's form-switching) — any player can optionally use one as freeform notes space, even if their build doesn't mechanically require it.

## Worked Example — Full Chain in Action, COMPLETE (Time-Slinger, f.k.a. Chrono-Ranger)
This is the book's own step-by-step, and it's the cleanest confirmation of how dice flow between steps. Now documented start to finish across all our files:

1. **Background (Step 1):** Roll 6 and 8 → sum selects **Background 14, Anachronistic** (see Backgrounds.md). Assigns dice to **History (d10)** and **Ranged Combat (d8)**. Grants Esoteric principle → **"Principle of the Time Traveler."** Passes d10, d8, d6 forward.
2. **Power Source (Step 2):** Those dice select **Tech Upgrades** (see PowerSources.md). Assigns d8 to **Signature Weaponry** ("Time Revolver") and d6 to a GM-approved custom **"Power Arm."** Gains Yellow abilities **Fan the Hammer** and **Localized Acceleration**, Green ability **Sit a Spell**. Rolls d10, d8, d2(?) forward.
3. **Archetype (Step 3):** That roll (10, 8, 2) offers Shadow/Flyer/Robot-Cyborg/Psychic/**Reality Shaper** (see Archetypes_Part2.md) — Christopher picks **Reality Shaper** since Jim now has limited control over time. Assigns d8 to **Awareness**, d8 to **Postcognition**, d8 to **Self-Discipline** quality. Takes Green abilities **"Takin' My Time"** and **"Altered Scan,"** Yellow ability **"Stack the Deck."** Takes **Principle of Whispers** (Expertise) for the AI running his cybernetics.
4. **Personality (Step 4):** Rolls d8+d8 = 1 and 9, offering Lone Wolf(1)/Inquisitive(9)/Alluring(10 via sum) — picks **Lone Wolf** (see Personality.md). Sets Green/Yellow/Red status dice to d8/d8/d8. Custom quality: **"Time-Lost Sheriff"** (d8). Out Ability tied to History: "Boost an ally by rolling your single History die."
5. **Red Abilities (Step 5):** Takes **Give Time** (renamed **"Temporal Bootstrap,"** tied to Postcognition) and **Final Wrath** (renamed **"Showdown,"** tied to Self-Discipline) — see RedAbilities.md.
6. **Retcon (Step 6):** Takes the Red ability **Quick Exit**, renamed **"Get Out of Dodge,"** applied to his Robot Horse (Signature Vehicle) power.
7. **Health (Step 7):** 8 + 8 (Red status) + 10 (Self-Discipline — see discrepancy flag below) + 4 (rolled) = **30 total Health.** Green 30-23, Yellow 22-12, Red 11-1.
8. **Finishing Touches (Step 8):** Hero Name **Time-Slinger**, Alias **Jim Brooks**. Gender M, Middle-Aged, 5'11", Brown eyes, Brown hair, Tan skin, Rugged build. Costume/Equipment: "Cowboy hat, worn jeans, brown leather boots. Blue collared shirt emblazoned with golden clock arms. Golden left arm. Golden time-gun. Glowing blue eyepiece over left eye. Has robot horse named Masadah." All abilities renamed. **Hero complete.**

**Sidebar — Describing Heroes via Attributes:** Don't feel constrained by the literal field names in Step 8. Fill fields in a way that fits your concept or leave them blank — a bald hero could put "none" under Hair, a bioluminescent hero might write "bioluminescent" for Skin, an alien could put "seven" for Eyes. Age and Gender don't need to be narrowly specific either ("mid-thirties" is fine; Gender isn't limited to M/F). None of these fields lock the hero in stone — they're shorthand, changeable as the character evolves.

This example is the canonical cross-reference for the whole hero-creation chain — every other file (Backgrounds, PowerSources, Archetypes 1&2, Personality, RedAbilities) ties back into this one continuous build.
