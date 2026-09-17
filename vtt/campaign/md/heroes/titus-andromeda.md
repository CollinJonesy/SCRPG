# Titus Andromeda

Player: David

## Out

Defend an ally by rolling your single Vitality die.

## Abilities

### [A] "Alien Boost"
Boost all nearby allies using [Strength]. Use your Max+Mid dice. Hinder yourself with your Min die.

### [A] "Empower and Repair"
Boost, Hinder, Defend, or Attack using [Vitality]. You and all nearby heroes in the Yellow or Red zone Recover Health equal to your Min die.

### [I] "Damage Resistant"
Reduce any physical or energy damage you take by 1 while you are in the Green zone, 2 while in the Yellow zone, and 3 while in the Red zone.

### [A] "Galvanize"
Boost using [Fitness]. Apply that bonus to all hero Attack and Overcome actions until the start of your next turn.

### [A] "Frontline Fighting"
Attack using [Strength]. The target of that Attack must take an Attack action against you as its next turn, if possible.

### [R] "Reactive Defense"
When an opponent Attacks, you may become the target of that Attack and Defend by rolling your single [Fitness] die.

### [A] "Paragon Feat"
Overcome using [Strength] in a situation that requires you to be more than humanly capable, like an extreme feat of strength or speed. Use your Max+Min dice. Boost all nearby allies with your Mid die.

### [I] "Out"
Defend an ally by rolling your single Vitality die.

## Builder

```json
{
  "origin": "custom",
  "bgSlug": "interstellar",
  "psSlug": "alien",
  "arSlug": "physical-powerhouse",
  "peSlug": "stalwart",
  "background": "Interstellar",
  "powerSource": "Alien",
  "archetype": "Physical Powerhouse",
  "personality": "Stalwart",
  "bgSlots": [
    "Deep Space Knowledge",
    "Conviction"
  ],
  "bgQual": {
    "Deep Space Knowledge": "d12",
    "Conviction": "d6"
  },
  "bgPrinciple": "principle-of-honor",
  "reqDie": "",
  "psSlots": [
    "Vitality",
    "Flight",
    "Speed"
  ],
  "psPow": {
    "Vitality": "d10",
    "Flight": "d8",
    "Speed": "d6"
  },
  "psAbilities": [
    "alien-alien-boost",
    "alien-empower-and-repair"
  ],
  "psReq": {
    "mode": "",
    "die": "",
    "name": ""
  },
  "arSlots": [
    "Density Control",
    "Fitness"
  ],
  "arPow": {
    "Density Control": "d8",
    "Strength": "d8"
  },
  "arQual": {
    "Fitness": "d8"
  },
  "arPrinciple": "principle-of-strength",
  "arAbilities": [
    "physical-powerhouse-damage-resistant",
    "physical-powerhouse-galvanize",
    "physical-powerhouse-frontline-fighting"
  ],
  "arReq": {
    "mode": "",
    "die": "d8",
    "name": "Strength"
  },
  "modPairSlug": "",
  "modD6": [],
  "modGreen": "",
  "modYellow": [],
  "modRed": "",
  "modPowerless": false,
  "peCustom": "2000's TV Enthusiast",
  "peOutBind": "Vitality",
  "peQual": {
    "2000's TV Enthusiast": "d8"
  },
  "reds": [
    "r60",
    "r1"
  ],
  "retcon": null,
  "retconSpec": {},
  "abBinds": {
    "red-60": "Fitness",
    "red-1": "Strength",
    "alien-alien-boost": "Strength",
    "alien-empower-and-repair": "Vitality",
    "physical-powerhouse-galvanize": "Fitness",
    "physical-powerhouse-frontline-fighting": "Strength"
  },
  "abNames": {
    "alien-alien-boost": "The Andromeda Salute",
    "alien-empower-and-repair": "Stand, Friend",
    "red-1": "Loyal Heart"
  },
  "powNames": {
    "Vitality": "",
    "Flight": "",
    "Speed": "",
    "Density Control": "",
    "Strength": ""
  },
  "qualNames": {
    "Deep Space Knowledge": "",
    "Conviction": "",
    "Fitness": "",
    "2000's TV Enthusiast": ""
  },
  "health": [
    30,
    "30-23",
    "22-12",
    "11-1"
  ],
  "method": "Free",
  "freePow": {
    "Vitality": "d10",
    "Flight": "d8",
    "Speed": "d8",
    "Strength": "d8",
    "Density Control": "d8"
  },
  "freeQual": {
    "Conviction": "d8",
    "Fitness": "d10",
    "Deep Space Knowledge": "d12"
  },
  "guidedRolls": {
    "bg": null,
    "ps": null,
    "ar": null,
    "pe": null
  },
  "f": {
    "name": "Titus Andromeda",
    "alias": "Luke Daynes",
    "player": "David",
    "gender": "Male",
    "age": "142",
    "height": "7 ft 3 in",
    "eyes": "Blue",
    "hair": "Blonde",
    "skin": "Bronzed",
    "build": "Massive, Athletic, Muscular",
    "costume": "Ceremonial plate of his ancestral house - burnished bronze and deep blue, high collar, half-cape bearing the Andromeda crest. Ornamental, but functional. Every scuff is a debt of honor recorded.",
    "notes": ""
  }
}
```
