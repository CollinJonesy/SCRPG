# Handyman

Player: Jake

## Out

Hinder an opponent by rolling your single Finesse die.

## Abilities

### [A] "Organi-Hack"
Attack a target using [Signature Weaponry]. Hinder that target with your Min die.

### [A] "Energy Burst"
Attack multiple targets using [Signature Weaponry], using your Min die against each.

### [I] "Techno-Absorb"
When you would take damage from [element/energy], you may Recover that amount of Health instead.

### [A] "Switch"
Boost yourself using [Part Detachment]. Then change modes.

### [A] "Quick Switch"
Destroy one bonus on you. Change modes, then take an action in the new mode.

### [R] "Emergency Switch"
When you are hit with an Attack, you may change to any mode. If you do, take extra damage equal to the Min die or take a minor twist.

### [A] "Debilitator"
Hinder all nearby opponents using [Signature Weaponry]. If you roll doubles, take damage equal to your Max die, and then you may also Attack all nearby opponents with your Min die.

### [A] "Stalwart"
Defend yourself and all nearby allies using [Signature Weaponry] against each Attack until the beginning of your next turn.

### [A] "Regeneration"
Defend using [Signature Weaponry]. Use your Max die. Recover Health equal to your Min die.

### [I] "Destroyer"
Whenever you take a basic Attack action, either use your Max+Min dice to Attack one target, or Attack two different targets, one using your Max die and one using your Mid die.

### [A] "Summoned Allies"
Use [Part Detachment] to create a number of minions equal to your Mid die. Choose the one same basic action that they each perform. They all act at the start of your turn.

### [I] "Out"
Hinder an opponent by rolling your single Finesse die.

## Builder

```json
{
  "origin": "custom",
  "bgSlug": "unremarkable",
  "psSlug": "tech-upgrades",
  "arSlug": "modular",
  "peSlug": "sarcastic",
  "background": "Unremarkable",
  "powerSource": "Tech Upgrades",
  "archetype": "Modular",
  "personality": "Sarcastic",
  "bgSlots": [
    "Close Combat",
    "Alertness"
  ],
  "bgQual": {
    "Close Combat": "d10",
    "Alertness": "d8"
  },
  "bgPrinciple": "principle-of-the-split",
  "reqDie": "",
  "psSlots": [
    "Signature Weaponry",
    "Deduction",
    "Nuclear"
  ],
  "psPow": {
    "Signature Weaponry": "d10",
    "Deduction": "d8",
    "Nuclear": "d6"
  },
  "psAbilities": [
    "tech-upgrades-organi-hack",
    "tech-upgrades-energy-burst",
    "tech-upgrades-techno-absorb"
  ],
  "psReq": {
    "mode": "",
    "die": "",
    "name": ""
  },
  "arSlots": [
    "Finesse",
    "Investigation",
    "Technology"
  ],
  "arPow": {},
  "arQual": {
    "Finesse": "d10",
    "Investigation": "d8",
    "Technology": "d8"
  },
  "arPrinciple": "principle-of-the-mask",
  "arAbilities": [
    "modular-switch",
    "modular-quick-switch",
    "modular-emergency-switch",
    "modular-debilitator",
    "modular-stalwart",
    "modular-regeneration",
    "modular-destroyer"
  ],
  "arReq": {
    "mode": "skip",
    "die": "",
    "name": "Signature Weaponry",
    "priorDie": "d10",
    "priorFrom": "pow"
  },
  "modPairSlug": "marksman",
  "modD6": [
    "Part Detachment"
  ],
  "modGreen": "modular-debilitator",
  "modYellow": [
    "modular-stalwart",
    "modular-regeneration"
  ],
  "modRed": "modular-destroyer",
  "modPowerless": false,
  "peCustom": "Multiple AI Personalities",
  "peOutBind": "Finesse",
  "peQual": {
    "Multiple AI Personalities": "d8"
  },
  "reds": [
    "r9"
  ],
  "retcon": null,
  "retconSpec": {},
  "abBinds": {
    "tech-upgrades-organi-hack": "Signature Weaponry",
    "tech-upgrades-recharge": "A",
    "tech-upgrades-energy-burst": "Signature Weaponry",
    "modular-switch": "Part Detachment",
    "modular-quick-switch": "A",
    "modular-emergency-switch": "R",
    "modular-debilitator": "Signature Weaponry",
    "modular-regeneration": "Signature Weaponry",
    "modular-stalwart": "Signature Weaponry",
    "red-9": "Part Detachment"
  },
  "abNames": {},
  "powNames": {
    "Signature Weaponry": "",
    "Deduction": "",
    "Nuclear": "",
    "Strength": "",
    "Wall-Crawling": "",
    "Part Detachment": ""
  },
  "qualNames": {
    "Close Combat": "",
    "Alertness": "",
    "Finesse": "",
    "Investigation": "",
    "Technology": "",
    "Multiple AI Personalities": ""
  },
  "health": [
    30,
    "30-23",
    "22-12",
    "11-1"
  ],
  "method": "Free",
  "freePow": {
    "Strength": "d8",
    "Nuclear": "d6",
    "Deduction": "d8",
    "Wall-Crawling": "d6",
    "Signature Weaponry": "d10",
    "Part Detachment": "d6"
  },
  "freeQual": {
    "Close Combat": "d10",
    "Alertness": "d8",
    "Finesse": "d10",
    "Investigation": "d6",
    "Technology": "d6"
  },
  "guidedRolls": {
    "bg": null,
    "ps": null,
    "ar": null,
    "pe": null
  },
  "f": {
    "name": "Handyman",
    "alias": "Derek Stevens",
    "player": "Jake",
    "gender": "Male",
    "age": "31",
    "height": "5 ft 11 in",
    "eyes": "Brown",
    "hair": "Brown",
    "skin": "White",
    "build": "Muscular",
    "costume": "",
    "notes": ""
  }
}
```
