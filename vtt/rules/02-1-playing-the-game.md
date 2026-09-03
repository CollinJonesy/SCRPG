---
project: Architect
type: reference
status: active
updated: 2026-08-27
---

# Playing the Game (Ch. 2) — Reference
Source: printed pg.7–37. Paraphrased and reorganized from the full chapter — not the book's original text.

## Vocabulary

- **Issue** — one play session (2–4 hours), resolving one scenario. Recorded under Back Issues on the hero sheet once finished.
- **Collection** — six Back Issues bundled together and named, then cleared from Back Issues. Can be invoked once per session for a mechanical bonus (see Collections below).
- **Scene** — the unit inside an issue. Three types: **Action** (brawls, chases, rescues — broken into turns), **Social** (dramatic character interaction, no turn order needed), **Montage** (recovery/travel/training, glue between scenes).
- **NPC** — everyone who isn't a player's hero: bystanders, minions, lieutenants, villains, plot characters, threats.

## The Hero Sheet (what's on it)

**Page one:** portrait, player name, hero name/alias, physical attributes, the four Characteristics (Background/Power Source/Archetype/Personality), two Principles (with roleplay guidance + minor/major twist prompts + a related ability each), Hero Points This Issue track (max 5/session), Hero Point Rewards, Back Issues, Collections.

**Page two:** Powers and Qualities with their dice, Status Dice (Green/Yellow/Red), Health Range per zone, Current Health, and Abilities (each tagged **A**ction, **R**eaction, or **I**nherent).

**Auxiliary Sheet:** used for heroes with unusually complex mechanics — multiple forms, mode-switching, etc. (Muerto and Bunker are the two Archive examples.)

## The GYRO System

Health measures physical/mental state. As it drops, status moves **G**reen → **Y**ellow → **R**ed → **O**ut. Each zone grants a status die (used in the dice pool) and unlocks that zone's abilities — Green status means Green abilities only; Yellow means Green+Yellow; Red means all three; Out means only your single Out ability.

**Out ≠ dead.** It just means the character can't meaningfully act in the scene anymore — unconscious, restrained, teleported away, whatever fits. Whether a hero actually dies is entirely the player's call, never imposed.

**Scene GYRO vs. personal GYRO:** action scenes usually have their own scene tracker with its own GYRO status. When a character's personal status and the scene's status differ, **use whichever is closer to Out.** A healthy (Green) hero in a Yellow-status scene is treated as Yellow for ability access and status die.

## Locations & Opposition

- **Locations** — some scenes have thematically distinct sub-areas (e.g., Megalopolis as the environment, but City Hall vs. the Monorail vs. Legacy Park as locations within it). Moving between locations generally costs your turn; once there, you're usually limited to Boost/Hinder/Defend unless you can justify faster movement narratively (super speed, teleportation, etc.).
- **Villains** — full stat blocks, similar complexity to heroes.
- **Lieutenants** — a single die. Attacked → they roll a save with that die; save ≥ damage, die stays; save < damage, die degrades one step (d12→d10→d8→d6→d4); degrading past d4 knocks them out.
- **Minions** — same save mechanic as Lieutenants at the mechanical core, but per the book's design they're meant to be more fragile — see the Bullpen files for the exact minion save table your table uses (note: this campaign runs Minions as **defeated outright on a failed save**, a deliberate house rule — see the app's own notes).

## The 7 Steps of Taking an Action (in an Action Scene)

0. **Give a heads-up to who's next** — let the next player know they're up soon.
1. **Describe what you want to do** — narrate it like a comic panel; state your intended outcome (what's the *goal*, not just the flavor).
2. **Decide what action to take** — pick an **ability** (must be unlocked by your current zone, must fit your description, must match the action type) or fall back to a **basic action** (Attack/Overcome/Boost/Hinder/Defend with no ability attached).
   - **Risky Action**: you can voluntarily stack an extra effect onto a *basic* action (extra target, upgrade to Max die, bonus Min-die effect, etc.) by accepting a minor twist. Not available if you're using an ability instead of a basic action.
3. **Choose an ability or basic action** (formalizes step 2's pick).
4. **Assemble your dice pool** — one Power die + one Quality die + one Status die, always exactly three dice. Use whichever power/quality the ability specifies, or your best narrative fit for a basic action. No applicable power/quality → default to a flat d4 with GM sign-off.
5. **Roll the dice, apply the results** — sort the three results into **Min / Mid / Max** (by rolled value, not die size — a d12 that rolls low can still be your Min die). The **Effect Die** is the Mid die by default; abilities can override this (e.g. "use your Max die," "use Max+Min dice").
   - **Altering the results**: abilities apply first (before any mod), then mods (Boost/Hinder bonuses/penalties) apply to the effect die's result. Mods must be declared before rolling. Exclusive mods cap at one bonus + one penalty per roll. A mod only touches one effect die even if the ability produces several.
6. **Hand off the action** — you choose who goes next among anyone (hero, villain, environment) who hasn't acted this round. Can't pick yourself. When everyone's acted, the round ends and a new one begins; whoever went last picks who opens the next round (anyone but themselves).

**Reactions**: interrupt-the-moment abilities, limited to **one reaction per round** (resets at your next turn), almost always rolling a single die instead of a full pool. **Hit the Deck** is the universal example: once per round, out of turn, take a minor twist to make a basic Defend reaction on yourself only.

## The Six Basic Actions

| Action | What it does |
|---|---|
| **Attack** | Deals damage equal to the effect die to a target with Health or a minion die. Every Attack "hits" — there's no separate to-hit roll; a low effect die against a defended/armored target just means little or no damage got through. |
| **Overcome** | Resolves an obstacle with real stakes. Outcome read off the effect die (table below). |
| **Boost** | Creates a bonus (positive mod) for yourself or an ally, sized off the effect die (table below). |
| **Hinder** | Creates a penalty (negative mod) for an opponent, same sizing table as Boost. |
| **Defend** | Only worth using when you want guaranteed protection: note the effect die, subtract it from the next Attack damage you (or someone you're protecting) take before your next turn. Wasted if no Attack lands first. Multiple simultaneous Defends don't stack — pick one. |
| **Recover** | Regain Health mid-scene. Only usable via an ability that explicitly grants it; otherwise Health comes back in Montage scenes. |

### Overcome outcome table

| Effect Die | Outcome |
|---|---|
| 0 or less | Utter, spectacular failure |
| 1–3 | Choose: fail outright, or succeed with a **major** twist |
| 4–7 | Succeed with a **minor** twist |
| 8–11 | Complete success |
| 12+ | Success beyond expectations (can also strip a minor twist from an earlier action, or act as a +2/Min-die-Health-recovery if nothing else fits) |

### Boost/Hinder mod-size table

| Effect Die | Mod size |
|---|---|
| 0 or less | No mod created |
| 1–3 | ±1 |
| 4–7 | ±2 |
| 8–11 | ±3 |
| 12+ | ±4 |

**Mods**: named on creation (flavor + value, e.g. "Pocket Analyzer +2"). Usually single-use; a minor twist at creation can extend duration. **Persistent** mods last until removed/no-longer-relevant/scene end. **Exclusive** mods cap at one bonus + one penalty per roll. Two ways to remove a mod: an Overcome action against it (GM may require multiple successes for scene/environment-sourced penalties), or an opposing Boost/Hinder that meets or exceeds it (excess is lost, no "change" given back).

## Twists

Triggered three ways: (1) player's choice on an Overcome result of 1–7 (1–3 = pick major-twist-success or fail; 4–7 = automatic minor twist on success), (2) player's choice when taking a Risky Action or Hit the Deck (always minor), (3) GM's choice via the environment's turn.

**A twist can never undo the success that earned it** — it adds a cost, it doesn't cancel the win.

**Minor** — small hindrance, some Health loss, a contained story complication. Mechanical effects clear at the next Montage scene (or scene end for most).
**Major** — serious Health loss, a severe hindrance, or a complication that can span the whole issue. Mechanical effects clear at issue end; story consequences are up to the table.

Each hero's Principles supply ready-made twist prompts (minor + major, per Principle). GM can also pull from the scene/environment, or invent one — always negotiated with the affected player, who can decline by simply failing/not taking the risky action instead (except for GM-sourced environment twists, which aren't optional).

## Hero Points & Collections

- Earn 1 Hero Point (max 5/issue) whenever any hero uses a Principle-linked ability in an Overcome (success or not), and whenever the table has a sufficiently meaningful Social scene (see below) — awarded to *every* hero, not just the one who triggered it.
- At issue end, **convert all Hero Points to bonuses** (1 point = 1 point of bonus, split however you like — e.g. 5 points → +3 and +2, or five +1s). Unconverted points and unused bonuses don't carry over. These bonuses are exclusive (max one per roll).
- **Collections** (6 Back Issues bundled) can be invoked once per session each, for one of: reroll/reassign a single die's result before Min/Mid/Max sorting, establish a minor fact about the scene rooted in a past issue, or substitute for taking a minor twist. Always needs a narrative justification tying it back to the referenced issue. GMs running published issues for mixed-experience groups may cap total Collection uses per hero, topping up newer heroes to match.

## Montage Scenes

Used for recovery, travel, repair, training, investigation — anything that moves the story forward without needing the action order. At the start of one: all minor twists resolve, all Boost/Hinder mods clear (even persistent ones), temporary effects end. Each player then narrates one of:
- **Recover Health** → reset to the top of the *next* zone up (e.g. Red → top of Yellow). Taking a minor twist pushes it an extra zone; if you were fully Out, a major twist can bring you all the way back to full.
- **Aid another hero** → they recover an extra zone.
- **Prepare for the next scene** → make a Boost that carries into the next scene (single-use, not persistent).

## Social Scenes

No turn order, no scene tracker by default (though the GM can layer the action order on top if pacing or dominant players are an issue — see "Initiative Anywhere" in Ch.4). Usually pure roleplay, no rolls — though the GM can call for an Overcome, especially where a Principle is in play. If a social scene is genuinely meaningful (a hero exposes vulnerability, compromises to resolve conflict, voices an uncomfortable truth that moves things forward, or lets a Principle force a hard choice), the GM can award every hero a Hero Point.
