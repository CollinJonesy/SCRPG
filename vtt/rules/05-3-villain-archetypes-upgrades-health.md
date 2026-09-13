---
project: Architect
type: reference
status: active
updated: 2026-08-24
---

# The Bullpen: Villain Archetypes Detailed & Health (SCRPG Core Rulebook, Ch. 5)
**Source pages:** 220–239

## Bruiser Archetype
**Status:** Green d4 → Yellow d8 → Red d12 | **Health:** +20
**Suggested pairings:** Bully, Disruptive, Generalist, Prideful
**Role:** Frontline; more damage taken = scarier.
**Abilities (choose 2):** Bring It On! (boost on damage), Feel No Pain (reduce damage by 1/2/3 by zone), Grin and Bear It, Lash Out, Living Wall (interpose for allies), Toss Hero.

## Domain Archetype
**Status:** 3+ environment threats = d10; 1–2 = d8; 0 = d6 | **Health:** +30
**Suggested pairings:** Dampening, Overpowered
**Role:** In touch with surroundings; warp environment to advantage.
**Abilities (choose 3):** Ascend From My Realm (ignore env damage), Earth Trembles (roll env minion dice for AoE attack), Power Heeds My Call (convert env bonuses to attacks), This Place is Mine (activate env twist), To Me My Minions (recover health), World Moves to Defend (redirect attack to env minion).

## Formidable Archetype
**Status:** All weakness penalties & no bonuses = weak icon; some penalties + some bonuses = d8; no weakness penalties = d12 | **Health:** +25
**Suggested pairings:** Ancient, Disruptive, Overpowered
**Role:** Incredible powers with critical weakness; exploit Achilles Heel.
**Abilities (choose 2):** Channel Greatness, Cleansing Elevation, Expended Negation, Share Your Glory, Unrivalled Paragon, Untempered Grit.

## Fragile Archetype
**Status:** Green d8 → Yellow d6 → Red d4 | **Health:** −5
**Suggested pairings:** Focused, Underpowered
**Role:** Pack a punch; once damage taken, become less effective.
**Abilities (choose 2):** Careless Smash, Cheese It! (escape if defense negates), Dismantling Jab, Escape Plan, Shrouded Attack, Versatile Strike.

## Guerrilla Archetype
**Status:** 4+ opponents = d10; 2–3 = d8; 0–1 = d6 | **Health:** +20
**Suggested pairings:** Ninja, Prideful
**Role:** Effective vs groups; disrupt team cohesion.
**Abilities (choose 2):** Close Quarters Combat, Even Odds, Fighting Rhythm, Human Shield, Malicious Deflection, Tangled Fray.

## Indomitable Archetype
**Status:** Always d8 | **Health:** +20
**Suggested pairings:** Generalist, Relentless
**Role:** Solid, dependable; function same until job done.
**Abilities (choose 2):** Absorb Energy, Grab and Drag, Heavy Duty, Prepare for Worst, Suppressive Fire, Unflagging.

## Inhibitor Archetype
**Status:** 3+ heroes w/ penalties = d10; 1–2 = d8; 0 = d6 | **Health:** +10
**Suggested pairings:** Dampening, Focused
**Role:** Exploit hero weaknesses; create where none exist.
**Abilities (choose 2):** Area Suppression, Overwhelming Syphon, Targeted Drain, Tethered Life, Twisted Fate, Upper Handed Strike.

## Inventor Archetype
**Status:** 4+ inventions = d12; 2–3 = d8; 1 = d6; 0 = d4 | **Health:** +10
**Suggested pairings:** Mastermind, Underpowered
**Role:** Dependent on prep & custom inventions.
**Abilities (choose 2):** Capable Creator, Cut Both Ways, Empowered Destruction, Leverage Advantage, To Serve Their Maker, Variable Creating.

## Legion Archetype
**Status:** 9+ minions = weak; 5–8 = d6; 3–4 = d8; 1–2 = d10; 0 = d12 | **Health:** −5
**Suggested pairings:** Adaptive, Creator, Tactician
**Role:** Unruly mob; numbers advantage = individual weakness.
**Abilities (gain 2 + mandatory Uncoordinated Actions):** Divide & Conquer, Instability of Form, Parts of the Whole, Returned Vitality, Split Up, Combine.

## Loner Archetype
**Status:** 0 other villains = d10; 1–2 = d8; 3+ = d6 | **Health:** +10
**Suggested pairings:** Leech, Relentless, Skilled
**Role:** Works w/ others but best alone.
**Abilities (choose 2):** Antisocial Behavior, Best on my Own, Better Them than Me, Singular Strength, Thin the Herd, Worst Case Response.

## Overlord Archetype
**Status:** More minions = stronger | **Health:** +15
**Role:** Mob villain; minions improve position. Status is manual — fill Status slots directly rather than an auto-counted condition.
**Abilities (choose 2):** By My Command, Give Me Your Strength, Rapid Deployment, Form Up.

## Predator Archetype
**Status:** Fewer opponents = better | **Health:** +15
**Role:** Most effective 1-on-1. Status is manual — fill Status slots directly rather than an auto-counted condition.
**Abilities (choose 2):** Surprise Trap, Hazardous Terrain, Hidden Hunter, Hunt the Weak, Stealth Approach, Track my Prey.

## Squad Archetype
**Status:** Based on # allies | **Health:** +5
**Role:** Stronger in groups. Status is manual — fill Status slots directly rather than an auto-counted condition.
**Abilities (choose 2):** On My Mark, My Allies are my Strength, Press the Advantage, Protect My Allies, Take Point.

## Titan Archetype
**Status:** Built-in challenge to reduce status | **Health:** +30
**Role:** Massive villains; designed for scale. Status ties to a Scene Challenge instead of a board-state
count — see the VTT's `resolveChallengeLinkedStatus()` (name a Challenge path to match the villain's
Status label text, e.g. "Expose a vulnerability (needs 2 successes)", and it auto-resolves once the
party marks enough successes on that path).
**Abilities (choose 2):** Crush All Underfoot, Down the Hatch, Foolish Insect, You Are But Gnats to Me, So Easily, The Land Quakes Underfoot.

---

## Villain Health Calculation
**Formula:** (Ⓗ × 5) + Approach base health + Archetype health bonus + Upgrade bonuses

**Example:** 5-hero game, Generalist approach (+25 base), Bruiser archetype (+20) = (5×5) + 25 + 20 = 70 base health (before upgrades).

---

## Upgrades & Masteries
- **Upgrades:** Increase effectiveness; each = +1 moderate scene element
- **Masteries:** Unique passive abilities; one per villain maximum

See specific villain entries in Archives for upgrade examples.
