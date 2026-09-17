# Lumen

Player: Cherise

## Out

Boost an ally by rolling your single Creativity die.

## Abilities

### [A] "Mass Modification"
Boost or Hinder using [Telekinesis], and apply that mod to multiple close targets.

### [A] "Personal Upgrade"
Boost yourself using [Flight]. Use your Max die. That bonus is persistent and exclusive.

### [A] "Displacement Assault"
Attack using [Telekinesis]. Either Hinder your target with your Min die or move them somewhere else in the scene.

### [A] "Hit & Run"
Attack using [Flight]. Defend against all Attacks against you using your Min die until your next turn.

### [R] "Mobile Dodge"
When you are hit with an Attack, you may take 1 irreducible damage to have the attacker reroll their dice pool.

### [I] "Inspiring Totem"
When you use an ability action, you may also perform any one basic action using your Mid die on the same roll.

### [R] "Heroic Sacrifice"
When an opponent Attacks, you may become the target of that Attack and Defend by rolling your single Red zone die.

### [I] "Out"
Boost an ally by rolling your single Creativity die.

## Builder

```json
{
  "origin": "custom",
  "bgSlug": "unremarkable",
  "psSlug": "supernatural",
  "arSlug": "transporter",
  "peSlug": "natural-leader",
  "background": "Unremarkable",
  "powerSource": "Supernatural",
  "archetype": "Transporter",
  "personality": "Natural Leader",
  "bgSlots": [
    "Creativity",
    "Insight"
  ],
  "bgQual": {
    "Creativity": "d10",
    "Insight": "d8"
  },
  "bgPrinciple": "principle-of-the-loner",
  "reqDie": "",
  "psSlots": [
    "Telekinesis",
    "Flight",
    "Density Control"
  ],
  "psPow": {
    "Telekinesis": "d10",
    "Flight": "d8",
    "Density Control": "d6"
  },
  "psAbilities": [
    "supernatural-mass-modification",
    "supernatural-personal-upgrade"
  ],
  "psReq": {
    "mode": "",
    "die": "",
    "name": ""
  },
  "arSlots": [
    "Agility",
    "Acrobatics",
    "Strength"
  ],
  "arPow": {
    "Agility": "d10",
    "Strength": "d6"
  },
  "arQual": {
    "Acrobatics": "d10"
  },
  "arPrinciple": "principle-of-mastery",
  "arAbilities": [
    "transporter-displacement-assault",
    "transporter-hit-run",
    "transporter-mobile-dodge"
  ],
  "arReq": {
    "mode": "skip",
    "die": "",
    "name": "Flight",
    "priorDie": "d8",
    "priorFrom": "pow"
  },
  "modPairSlug": "",
  "modD6": [],
  "modGreen": "",
  "modYellow": [],
  "modRed": "",
  "modPowerless": false,
  "peCustom": "I've Got You",
  "peOutBind": "Creativity",
  "peQual": {
    "I've Got You": "d6"
  },
  "reds": [
    "r62",
    "r61"
  ],
  "retcon": null,
  "retconSpec": {},
  "abBinds": {
    "supernatural-mass-modification": "Telekinesis",
    "supernatural-personal-upgrade": "Flight",
    "transporter-displacement-assault": "Telekinesis",
    "transporter-hit-run": "Flight"
  },
  "abNames": {
    "supernatural-mass-modification": "Gravity Well",
    "transporter-displacement-assault": "Redirect Gravity",
    "transporter-hit-run": "Fly By",
    "supernatural-personal-upgrade": "Full Lashing"
  },
  "powNames": {
    "Telekinesis": "",
    "Flight": "",
    "Density Control": "",
    "Agility": "",
    "Strength": ""
  },
  "qualNames": {
    "Creativity": "",
    "Insight": "",
    "Acrobatics": "",
    "I've Got You": "",
    "Fitness": "",
    "Persuasion": ""
  },
  "health": [
    32,
    "32-25",
    "24-12",
    "11-1"
  ],
  "method": "Free",
  "freePow": {
    "Telekinesis": "d10",
    "Flight": "d8",
    "Density Control": "d6",
    "Agility": "d10",
    "Strength": "d6"
  },
  "freeQual": {
    "Creativity": "d10",
    "Insight": "d8",
    "Fitness": "d10",
    "Persuasion": "d10"
  },
  "guidedRolls": {
    "bg": null,
    "ps": null,
    "ar": null,
    "pe": null
  },
  "f": {
    "name": "Lumen",
    "alias": "Nora Quinn (Quinn)",
    "player": "Cherise",
    "gender": "Female",
    "age": "",
    "height": "5 ft 4 in",
    "eyes": "Light Bright Blue",
    "hair": "Bob",
    "skin": "Pale",
    "build": "Petite",
    "costume": "",
    "notes": ""
  }
}
```
