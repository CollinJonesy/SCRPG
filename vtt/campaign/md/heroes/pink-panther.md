# Pink Panther

Player: Brittany

## Out

Boost an ally by rolling your single Close Combat die.

## Abilities

### [R] "Danger Sense"
When damaged by an environment target or a surprise Attack, Defend by rolling your single [Awareness] die.

### [A] "Adaptive"
Boost yourself using [Agility], then either remove a penalty on yourself or Recover using your Min die.

### [A] "Growth"
Boost yourself using [Nine Lives]. That bonus is persistent and exclusive.

### [A] "Defensive Strike"
Defend using [Close Combat]. Attack using your Min die.

### [A] "Precise Strike"
Attack using [Agility]. Ignore all penalties on this Attack, ignore any Defend actions, and it cannot be affected by Reactions.

### [A] "Offensive Strike"
Attack using [Signature Weaponry]. Use your Max die.

### [A] "Flexible Stance"
Take any two basic actions using [Close Combat], each using your Min die.

### [A] "Major Regeneration"
Hinder yourself using Vitality. Use your Min die. Recover Health equal to your Max+Mid dice.

### [A] "Unerring Strike"
Attack using [Awareness]. Use your Max+Min dice. Ignore all penalties on this attack, ignore any Defend actions, and it cannot be affected by Reactions.

### [I] "Out"
Boost an ally by rolling your single Close Combat die.

## Builder

```json
{
  "origin": "custom",
  "bgSlug": "tragic",
  "psSlug": "genetic",
  "arSlug": "close-quarters-combatant",
  "peSlug": "lone-wolf",
  "background": "Tragic",
  "powerSource": "Genetic",
  "archetype": "Close Quarters Combatant",
  "personality": "Lone Wolf",
  "bgSlots": [
    "Close Combat",
    "Alertness",
    "Acrobatics"
  ],
  "bgQual": {
    "Close Combat": "d10",
    "Alertness": "d8"
  },
  "bgPrinciple": "principle-of-the-defender",
  "reqDie": "",
  "psSlots": [
    "Signature Weaponry",
    "Awareness",
    "Vitality"
  ],
  "psPow": {
    "Signature Weaponry": "d10",
    "Awareness": "d10",
    "Vitality": "d6"
  },
  "psAbilities": [
    "genetic-danger-sense",
    "genetic-adaptive",
    "genetic-growth"
  ],
  "psReq": {
    "mode": "",
    "die": "",
    "name": ""
  },
  "arSlots": [
    "Agility",
    "Persuasion",
    "Finesse"
  ],
  "arPow": {
    "Agility": "d10"
  },
  "arQual": {
    "Persuasion": "d8",
    "Finesse": "d8"
  },
  "arPrinciple": "principle-of-the-underworld",
  "arAbilities": [
    "close-quarters-combatant-defensive-strike",
    "close-quarters-combatant-precise-strike",
    "close-quarters-combatant-offensive-strike",
    "close-quarters-combatant-flexible-stance"
  ],
  "arReq": {
    "mode": "skip",
    "die": "",
    "name": "Close Combat",
    "priorDie": "d10",
    "priorFrom": "qual"
  },
  "modPairSlug": "",
  "modD6": [],
  "modGreen": "",
  "modYellow": [],
  "modRed": "",
  "modPowerless": false,
  "peCustom": "Nine Lives",
  "peOutBind": "Close Combat",
  "peQual": {
    "Nine Lives": "d8"
  },
  "reds": [
    "r0",
    "r16"
  ],
  "retcon": null,
  "retconSpec": {},
  "abBinds": {
    "genetic-danger-sense": "Awareness",
    "genetic-adaptive": "Agility",
    "genetic-growth": "Nine Lives",
    "close-quarters-combatant-defensive-strike": "Close Combat",
    "close-quarters-combatant-offensive-strike": "Signature Weaponry",
    "close-quarters-combatant-precise-strike": "Agility",
    "red-16": "Awareness",
    "close-quarters-combatant-flexible-stance": "Close Combat"
  },
  "abNames": {},
  "powNames": {
    "Signature Weaponry": "Kitty Claws",
    "Awareness": "Whisker Sense",
    "Vitality": "Cat Nap",
    "Agility": "Kat Like Reflexes"
  },
  "qualNames": {
    "Close Combat": "Cat Fight",
    "Alertness": "Purrception",
    "Persuasion": "Purrsuasion",
    "Finesse": "Making Biscuits",
    "Nine Lives": ""
  },
  "health": [
    30,
    "30-23",
    "22-12",
    "11-1"
  ],
  "method": "Free",
  "freePow": {
    "Signature Weaponry": "d10",
    "Agility": "d10",
    "Awareness": "d10",
    "Vitality": "d6"
  },
  "freeQual": {
    "Alertness": "d8",
    "Persuasion": "d8",
    "Close Combat": "d10",
    "Finesse": "d8"
  },
  "guidedRolls": {
    "bg": null,
    "ps": null,
    "ar": null,
    "pe": null
  },
  "f": {
    "name": "Pink Panther",
    "alias": "Katrina \"Kat\" Black",
    "player": "Brittany",
    "gender": "Female",
    "age": "28",
    "height": "5 ft 4 in",
    "eyes": "Green",
    "hair": "Cotton Candy Pink",
    "skin": "White",
    "build": "Slim & Fit",
    "costume": "",
    "notes": ""
  }
}
```
