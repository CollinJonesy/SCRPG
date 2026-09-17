# Minions, Lieutenants, and Environments


Source: `Rulebook MD/Ch04_moderating_the_game.md`, lines ~753–835 (minions/
lieutenants) and ~1316–1569 (running minions/lieutenants; environments).


This page covers the two most common disposable/durable opposition types and
how a scene's environment acts on its own turn. For villain mechanics and
the general GM's-turn framework, see [[12_GM_Basics]]. For full scene setup
and play procedure, see [[14_Running_Scenes]].


## Minions


Minions are the nameless, faceless rank-and-file opposition — thugs, robots,
lightly armored vehicles, etc. In an action scene a minion group is
represented by a name, a single **trait die**, and a short description. Any
roll a minion makes for a basic action (Attack, Overcome, etc.) uses that
one trait die.


### Minion Damage Save


When a minion takes damage, it rolls its trait die against the amount of
damage dealt — this is the **damage save**.


- **If the minion rolls LESS than the damage dealt (a failed save): the
  minion is immediately knocked out and removed from play.**
- **If the minion rolls EQUAL TO or GREATER THAN the damage dealt (a
  successful save): the minion is degraded one die size** (e.g. d8 → d6,
  d6 → d4).


This is the opposite of what intuition might suggest — a *successful* save
doesn't mean the minion is unharmed; it means the minion survives but gets
weaker. A *failed* save is what removes the minion outright.


**Last stand at d4:** once a minion's trait die is down to d4, it does not
degrade any further.


- If a d4 minion **succeeds** its save (rolls ≥ the damage dealt), it sticks
  around, surviving the attack, still at d4.
- If the damage dealt **beats** the d4 minion's roll (a failed save), the
  minion is taken out of the scene.


Some minions have special abilities (bonuses under certain conditions) or
restrictions (only certain basic actions available) — these are noted on
their individual stat blocks and affect how dangerous or limited they are.


## Lieutenants


Lieutenants represent tougher, more durable opposition: a villain's main
henchman, the leader of a minion group, an armored robot, a spaceship, etc.


### Lieutenant Damage Save


Mechanically, lieutenants use the same damage-save roll as minions, but with
the success/failure outcomes **swapped**:


- **On a FAILED damage save (lieutenant's roll is less than the damage
  dealt): the lieutenant degrades one die size.**
- **On a SUCCESSFUL damage save (lieutenant's roll matches or exceeds the
  damage dealt): the lieutenant does NOT degrade** — it shrugs off the hit
  and stays at its current die size.


This makes lieutenants much more durable than minions: a single d6
lieutenant can absorb many attacks before being worn down, since only
failed saves cause it to weaken. Multiple lieutenants in one scene represent
a genuinely tough fight.


⚠️ **Needs physical-book confirmation:** the source text describes the
lieutenant "last stand" only by contrast with minions ("do not go down a
die size on a successful save like minions do") and does not explicitly
restate whether a lieutenant already reduced to d4 that then fails another
save is knocked out (mirroring the minion's d4 last-stand-then-out
behavior) or handled some other way. Treat a d4 lieutenant failing a save as
being taken out of the scene, consistent with the minion pattern, until the
physical book confirms this explicitly.


### Massive Damage to Lieutenants


If a lieutenant is dealt damage equal to **at least twice its current die
size's maximum value**, it doesn't even roll a save — it's defeated
immediately. Example: a d6 lieutenant (max value 6) dealt 12 or more damage
in a single attack is incapacitated outright, no save rolled.


## Running Minions and Lieutenants in Play


On a minion's or lieutenant's turn, the GM has it take one of the basic
actions (Attack, Boost, Hinder, Defend, Overcome), subject to any special
restrictions on that character. Unlike heroes and villains, minions and
lieutenants roll only their **single trait die** for any action.


**Running large numbers at once:** when many minions act identically (e.g.
eight minions all Attacking, two per hero), it's fine to roll all their dice
together and assign damage to targets in one pass rather than resolving each
one as an individual turn.


**Overcome restriction:** minions and lieutenants can attempt Overcome
actions to advance their own agenda, but — unlike villains — they can
**never** use Overcome to advance the scene tracker.


**No major twists for minions/lieutenants:** a minion or lieutenant never
takes a major twist to turn a 1–3 result into a success. A roll of 1–3 is
simply a failure.


**Minor twists carry a cost:**


- If a minion succeeds with a minor twist, treat it as a lesser success —
  when running a group, two "success with a minor twist" results in the
  same action can be combined into one full success.
- If a lone minion needs to succeed on its own and does so with a minor
  twist, it succeeds but **knocks itself out** in the process.
- If a lieutenant succeeds with a minor twist, it succeeds but **degrades
  one die size**.


A roll of 8+ is a full success on its own, and rare spectacular successes
can be an opportunity to "graduate" that NPC into a larger story role later.


**Player-controlled exception:** these twist guidelines don't apply to
minions/lieutenants a player is directly controlling — those act as an
extension of that player's hero and can draw on the hero's own principles
for twists.


## Environments


Environments (Magmaria's heat, Megalopolis's bustle, the Wagner Mars Base
construction site, etc.) are dynamic scene elements that do three things:
provide narrative backdrop, generate unplanned threats/challenges, and
supply location-appropriate minor and major twists.


An environment's stat block has **three traits**, each with its own die
rating, powering its actions when it takes its turn.


### The Environment's Turn Sequence


The environment acts on the **scene tracker's turn**. When that turn comes
up, do these three steps in order:


1. **Advance the scene tracker** — mark the next space, moving from Green
   toward Red. Crossing out of Green makes the scene (and thus every hero,
   at minimum) Yellow; crossing out of Yellow makes it Red; marking the
   final Red space means things go seriously wrong and the scene likely
   ends.
2. **Activate all environment threats** — every active threat introduced by
   the environment (usually minions or lieutenants) acts. They're roleplayed
   according to their nature and take one of the basic actions, same as any
   other minion/lieutenant, subject to the environment's own rules.
3. **Introduce a new threat, OR activate an environment twist** — this step
   is an either/or:
   - If there are **no** environment threats currently in play, introduce
     one now (only threats already unlocked by the current scene status).
   - If one or more environment threats are already present, **skip**
     introducing a new one, and instead trigger an **environment twist**
     appropriate to the current scene status. When a twist calls for a
     roll, use the environment's own dice pool. If no listed twist fits,
     roll the environment's dice pool as a basic Attack, Boost, or Hinder
     action instead (environments should not Defend or Overcome). Each
     environment major twist can be triggered **no more than once per
     scene**.


If the scene has no environment, the scene tracker's turn simply ends after
step 1 and the action passes to the next character in initiative.


Environment twists have a second use too: if a hero attempts an Overcome
action and succeeds with a twist, the GM can suggest that a status-
appropriate environment twist activates as a result.


### Locations vs. Environment


**Locations** are a separate concept from the environment: they represent
where each hero physically is within the broader scene (e.g. the Cosmic
Research Bay vs. the Portal Room, both within the same Wagner Mars Base
environment). Locations don't usually carry their own game stats — they're
described simply — though some scenes attach suggested twists to a specific
location (e.g. a jail location whose major twist releases inmates as new
hostile minions).


---
See also: [[12_GM_Basics]] · [[14_Running_Scenes]] · [[16_Building_Villains]]
