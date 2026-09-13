---
project: Architect
type: reference
status: active
updated: 2026-08-24
---

# The Bullpen: Minions, Lieutenants & Villain Creation (SCRPG Core Rulebook, Ch. 5)
**Source pages:** 203–219

## Minions
Direct, low-powered threats that chip away at hero health. Mechanically simple but flexible.

### Creating Minions (5 steps)
1. Name & concept
2. Assign die (d4–d12)
3. Short description (who/what/capabilities)
4. Optional: special abilities (0–2)
5. Optional: tactics section

### Die Size Guidelines
- **d4:** Damaged bots, panicked mob, untrained
- **d6:** Armed thugs, security, street fighters
- **d8:** Cyborg guards, ninjas, soldiers
- **d10:** Elite assassins, elite cyborgs
- **d12:** Armored carriers, gunships, megafauna

### Minion Abilities
Most minions have 0–2 abilities. Common effects: situational bonuses, bonus to Boost/Hinder/Defend, bonus damage, bonus to save, extra attack target, movement without action, sacrifice effects.

Bonus/penalty values: use **2** most common; range 1–3.

## Lieutenants
More complex; harder to knock out; more/better abilities than minions. Can represent superpowered underlings, monsters, engines of war.

### Creating Lieutenants
Same as minions but:
- **Die range:** d6–d12 (d6 rare but possible)
- **Multiple abilities:** Should have one or more
- Can Defend/Boost multiple allies
- Can Attack & Boost/Hinder w/ same die
- Special actions: create minions, recover villain health, environmental effects, move heroes
- Sacrifice effects: villain escape, extra action, scene tracker advance

### Colossal Foes
Represent as environment + challenges + threats rather than single lieutenant.

## Villains
Between heroes & minions in complexity. Base stats + optional upgrades.

### Villain Creation (11 steps)
1. Concept (who/what/goal)
2. Choose **Approach** (how they accomplish goals)
3. Assign powers
4. Assign qualities
5. Assign approach abilities
6. Choose **Archetype** (how they operate/what drives them)
7. Gain status dice from archetype
8. Assign archetype abilities
9. Add upgrades (optional)
10. Add mastery (optional)
11. Calculate health: **(Ⓗ × 5) + approach bonus + archetype bonus + upgrades**

### Villain Approaches (18 types)
Each has base health, suggested archetype pairings, and a set of abilities to pick from
(picks column below). Full ability data lives in `builder/catalog/villain_approach_abilities.csv`
(what the Villain Builder actually uses) — names only here, open the builder for full game text.

| # | Name | Base Health | Suggested Pairings | Picks |
|---|---|---|---|---|
| 1 | Adaptive | 15 | Legion, Tactician | 3 |
| 2 | Ancient | 30 | Formidable, Overpowered | 2 |
| 3 | Bully | 25 | Bruiser, Prideful | 2 |
| 4 | Creator | 15 | Legion | 2 |
| 5 | Dampening | 25 | Domain, Inhibitor | 2 |
| 6 | Disruptive | 20 | Bruiser, Formidable | 2 |
| 7 | Focused | 15 | Fragile, Inhibitor | 2 |
| 8 | Generalist | 25 | Bruiser, Indomitable | 2 |
| 9 | Leech | 15 | Loner | 2 |
| 10 | Mastermind | 20 | Inventor | 2 |
| 11 | Ninja | 20 | Guerrilla | 2 |
| 12 | Overpowered | 35 | Domain, Formidable | 2 |
| 13 | Prideful | 25 | Bruiser, Guerrilla | 2 |
| 14 | Relentless | 20 | Indomitable, Loner | 2 |
| 15 | Skilled | 15 | — | 2 |
| 16 | Specialized | 20 | — | 3 (two same quality, one different) |
| 17 | Tactician | 20 | Legion | 2 |
| 18 | Underpowered | 10 | Fragile, Inventor | 2 |

**Approach abilities (names — see the builder catalog for full text):**
- **Adaptive** (choose 3): Adapt and Thrive, Diversity through Adversity, Efficient Reconfiguration, Initiate Upgrade Procedure, Powerful Imitation, The Pain of Perfection
- **Ancient** (choose 2): Behold My Immortal Glory, From Before Space and Time, Immortal Vitality, Ideal Action, Out of Time, Unknowable Pain
- **Bully** (choose 2): Bust Their Heads, Cruel and Unusual, Crush the Small, Injured Tantrum, Punish Weakness, Thick
- **Creator** (choose 2): Harvest their Power, Retributive Lash, Powerful Ally, Shared Power, Summon Mob, Swarm Attack
- **Dampening** (choose 2): Capitalize on their Failure, Curse of Weakness, Field of Woe, Nullifying Backlash, Scrambling Strike, Terror of Inadequacy
- **Disruptive** (choose 2): Beneficial Chaos, Covering Fire, Enraging Touch, Heedless Explosion, Painful Disruption, Taste the Madness
- **Focused** (choose 2): Elemental Absorption, Defensive Charging, Perfect Alignment, Pour it On, Sympathetic Shield, Vicious Entanglement
- **Generalist** (choose 2): Bodyguard, Dependable, Heavy Hitter, Stalwart Combatant, Tough Customer, Wracking Aura
- **Leech** (choose 2): Hypnotic Gaze, Life Drain, Power Consumption, Siphoning Wither, Unnerving Whispers, Violent Vitality
- **Mastermind** (choose 2): Exploit Weakness, Reversal of Fortune, Prepared for Anything, Villainous Monologue
- **Ninja** (choose 2): Deadly Blink, Defensive Dash, Fade From Sight, Sever the Tendons
- **Overpowered** (choose 2): Do Not Dare to Touch Me, Face My Full Might, Fear My Overwhelming Power, Raw Power, My Power
- **Prideful** (choose 2): Later, Be Denied, Sustained Mockery, Unquestionable Might, You Cannot Survive
- **Relentless** (choose 2): Dogged Pursuit, Prey on the Weak, Repeated Punishment, Too Close for Comfort, Twist the Knife, Up in Your Face
- **Skilled** (choose 2): Best in the Biz, Dodge and Weave, Consistently Capable, Flexible Expertise, Incomparable Inequity, Misdirection
- **Specialized** (choose 3): Active Cover, Cleaving Slash, Focused Attack, Known Target, Neutralizing Strike, Tangled Torment
- **Tactician** (choose 2): Group Up, Joint Action, Organized March, Try Again, Working Together
- **Underpowered** (choose 2): Avoid the Inevitable, Do Not Underestimate Me, Last Ditch Effort, Still a Threat

### Villain Archetypes (14 types)
Choose how villain reacts & what they care about:

| # | Name | Status Based On | Health |
|---|---|---|---|
| 1 | Bruiser | Health zones (like heroes) | +20 |
| 2 | Domain | Environment minions/lieutenants/challenges | +30 |
| 3 | Formidable | Weakness-related penalties | +25 |
| 4 | Fragile | Health zones (inverse: d8→d6→d4) | −5 |
| 5 | Guerrilla | # opponents engaged | +20 |
| 6 | Indomitable | Constant (always d8) | +20 |
| 7 | Inhibitor | # heroes with penalties | +10 |
| 8 | Inventor | # inventions/bonuses deployed | +10 |
| 9 | Legion | # minions allied w/ villain | −5 |
| 10 | Loner | # other villains in scene | +10 |
| 11 | Overlord | # minions (more=better) | +15 |
| 12 | Predator | Fewer opponents = better | +15 |
| 13 | Squad | # allies present | +5 |
| 14 | Titan | Built-in challenge to reduce status | +30 |

**Minor villains:** Base stats only (minor appearance, team play, not prolonged combat).

**Full villains:** Base + upgrades.

## Villain Upgrades & Masteries
Upgrades increase effectiveness; each counts as extra moderate scene element. Masteries are unique
passive abilities (one per villain maximum). Full Health Formula, a worked example, and per-archetype
detail live in `05-3-villain-archetypes-upgrades-health.md` — not repeated here to avoid the two files
drifting out of sync.

---

**Notes:**
- Approaches & archetypes are guidelines, not restrictions
- Recurring villains can change approach/archetype between appearances
- Each villain gets a roleplaying quality like heroes
- Borrow & reskin from existing villains in archives
