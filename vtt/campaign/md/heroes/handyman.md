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
Boost yourself using [Signature Weaponry]. Then change modes.

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

### [A] "Book It"
Hinder any number of close targets using [Finesse]. Use your Max die. End your turn elsewhere in the scene.

### [A] "Summoned Allies (SC)"
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
    "Strength",
    "Wall-Crawling"
  ],
  "psPow": {
    "Signature Weaponry": "d10",
    "Strength": "d8",
    "Wall-Crawling": "d6"
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
    "Deduction",
    "Investigation"
  ],
  "arPow": {
    "Deduction": "d8"
  },
  "arQual": {
    "Finesse": "d10",
    "Investigation": "d8"
  },
  "arPrinciple": "principle-of-the-everyman",
  "arAbilities": [
    "modular-switch",
    "modular-quick-switch",
    "modular-emergency-switch",
    "modular-debilitator",
    "modular-stalwart",
    "modular-regeneration",
    "modular-destroyer"
  ],
  "arYellowAbilities": [],
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
  "modPowerless": true,
  "modModes": {
    "modular-debilitator": {
      "powers": {
        "same_0": "Signature Weaponry",
        "down_1": "Wall-Crawling",
        "up_2": "Part Detachment",
        "up_3": "Strength"
      }
    },
    "modular-destroyer": {
      "powers": {
        "up_2": "Signature Weaponry",
        "same_0": "Strength",
        "same_1": "Part Detachment"
      }
    },
    "modular-stalwart": {
      "powers": {
        "same_0": "Signature Weaponry",
        "down_1": "Deduction",
        "down_2": "Part Detachment",
        "up2_3": "Strength"
      }
    },
    "modular-regeneration": {
      "powers": {
        "same_0": "Deduction",
        "up2_1": "Signature Weaponry"
      }
    }
  },
  "modPowerlessPowers": {
    "d6": "Deduction",
    "d10": "Part Detachment"
  },
  "peCustom": "Multiple AI Personalities",
  "peOutBind": "Finesse",
  "peQual": {
    "Multiple AI Personalities": "d8"
  },
  "reds": [
    "r57",
    "r41"
  ],
  "retcon": 2,
  "retconSpec": {},
  "abBinds": {
    "tech-upgrades-organi-hack": "Signature Weaponry",
    "tech-upgrades-recharge": "A",
    "tech-upgrades-energy-burst": "Signature Weaponry",
    "modular-switch": "Signature Weaponry",
    "modular-quick-switch": "A",
    "modular-emergency-switch": "R",
    "modular-debilitator": "Signature Weaponry",
    "modular-regeneration": "Signature Weaponry",
    "modular-stalwart": "Signature Weaponry",
    "red-9": "Part Detachment",
    "red-57": "Finesse",
    "red-41": "Part Detachment"
  },
  "abNames": {
    "tech-upgrades-organi-hack": "Pulse Arm (Single Target)",
    "tech-upgrades-energy-burst": "Pulse Arm (Multi-Target)",
    "modular-debilitator": "Rocket Arm",
    "modular-stalwart": "Riot Shield Arm",
    "modular-regeneration": "Med Bay Arm",
    "modular-destroyer": "Plasma Arm",
    "red-57": "Goose on the Loose",
    "red-41": "Finger Drones"
  },
  "powNames": {
    "Signature Weaponry": "Signature Arms",
    "Strength": "",
    "Wall-Crawling": "",
    "Deduction": "",
    "Part Detachment": ""
  },
  "qualNames": {
    "Close Combat": "",
    "Alertness": "",
    "Finesse": "",
    "Investigation": "",
    "Multiple AI Personalities": ""
  },
  "health": [
    30,
    "30-23",
    "22-12",
    "11-1"
  ],
  "method": "Constructed",
  "freePow": {
    "Deduction": "d8",
    "Wall-Crawling": "d6",
    "Signature Weaponry": "d10",
    "Part Detachment": "d8",
    "Strength": "d8"
  },
  "freeQual": {
    "Close Combat": "d10",
    "Alertness": "d8",
    "Finesse": "d10",
    "Investigation": "d6"
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

## Modes

```json
[
  {
    "slug": "default",
    "name": "Default Mode",
    "zone": "Green",
    "default": true,
    "powers": {
      "Signature Weaponry": "d10",
      "Strength": "d8",
      "Wall-Crawling": "d6",
      "Deduction": "d8",
      "Part Detachment": "d6"
    },
    "lockedActions": [],
    "immobile": false,
    "powerless": false
  },
  {
    "slug": "modular-debilitator",
    "name": "Debilitator Mode",
    "zone": "Green",
    "default": false,
    "powers": {
      "Signature Weaponry": "d10",
      "Wall-Crawling": "d4",
      "Part Detachment": "d8",
      "Strength": "d10"
    },
    "lockedActions": [
      "Boost",
      "Defend",
      "Overcome"
    ],
    "immobile": false,
    "powerless": false
  },
  {
    "slug": "modular-stalwart",
    "name": "Stalwart Mode",
    "zone": "Yellow",
    "default": false,
    "powers": {
      "Signature Weaponry": "d10",
      "Deduction": "d6",
      "Part Detachment": "d4",
      "Strength": "d12"
    },
    "lockedActions": [
      "Hinder",
      "Overcome"
    ],
    "immobile": false,
    "powerless": false
  },
  {
    "slug": "modular-regeneration",
    "name": "Regeneration Mode",
    "zone": "Yellow",
    "default": false,
    "powers": {
      "Deduction": "d8",
      "Signature Weaponry": "d12"
    },
    "lockedActions": [
      "Attack",
      "Hinder"
    ],
    "immobile": false,
    "powerless": false
  },
  {
    "slug": "modular-destroyer",
    "name": "Destroyer Mode",
    "zone": "Red",
    "default": false,
    "powers": {
      "Signature Weaponry": "d12",
      "Strength": "d8",
      "Part Detachment": "d6"
    },
    "lockedActions": [
      "Boost"
    ],
    "immobile": true,
    "powerless": false
  },
  {
    "slug": "powerless",
    "name": "Powerless Mode",
    "zone": "",
    "default": false,
    "powers": {
      "Deduction": "d6",
      "Part Detachment": "d10"
    },
    "lockedActions": [],
    "immobile": false,
    "powerless": true
  }
]
```
