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

### [R] "Heroic Sacrifice"
When an opponent Attacks, you may become the target of that Attack and Defend by rolling your single Red zone die.

### [I] "Inspiring Totem"
When you use an ability action, you may also perform any one basic action using your Mid die on the same roll.

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
    "r61",
    "r62"
  ],
  "retcon": 5,
  "retconSpec": {
    "prFrom": "principle-of-the-loner",
    "prTo": "principle-of-the-everyman"
  },
  "abBinds": {
    "supernatural-mass-modification": "Telekinesis",
    "supernatural-personal-upgrade": "Flight",
    "transporter-displacement-assault": "Telekinesis",
    "transporter-hit-run": "Flight"
  },
  "health": [
    32,
    "32-25",
    "24-12",
    "11-1"
  ],
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
