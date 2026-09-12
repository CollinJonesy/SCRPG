# Masquerade

Player: Sean

## Out

Hinder an opponent by rolling your single Persuasion die.

## Abilities

### [A] "Mass Effect"
Boost or Hinder using [A] and apply that mod to multiple close targets.

### [A] "Encourage"
Attack using [power]. Boost all nearby heroes taking Attack or Overcome actions using your Min die until your next turn.

### [A] "Change Forms"
Take a basic action using [Shapeshifting], then switch to any available form.

### [A] "Form Recovery"
Attack using [Shapeshifting] and Recover Health equal to your Min die. Return to your base form.

### [R] "Emergency Change"
When hit with an Attack, change to any form before resolving the Attack. Take a minor twist.

### [A] "Powerful Strike (SC)"
Attack using [Signature Weaponry]. Use your Max+Mid dice.

### [I] "Out"
Hinder an opponent by rolling your single Persuasion die.

## Builder

```json
{
  "origin": "custom",
  "bgSlug": "performer",
  "psSlug": "cosmos",
  "arSlug": "form-changer",
  "peSlug": "sarcastic",
  "background": "Performer",
  "powerSource": "Cosmos",
  "archetype": "Form-Changer",
  "personality": "Sarcastic",
  "bgSlots": [
    "Persuasion",
    "Creativity"
  ],
  "bgQual": {
    "Persuasion": "d10",
    "Creativity": "d8"
  },
  "bgPrinciple": "principle-of-the-mask",
  "reqDie": "",
  "psSlots": [
    "Signature Weaponry",
    "Size-Changing",
    "Suggestion"
  ],
  "psPow": {
    "Signature Weaponry": "d10",
    "Size-Changing": "d8",
    "Suggestion": "d6"
  },
  "psAbilities": [
    "cosmos-mass-effect",
    "cosmos-encourage"
  ],
  "psReq": {
    "mode": "",
    "die": "",
    "name": ""
  },
  "arSlots": [
    "Shapeshifting",
    "Swimming",
    "Ranged Combat"
  ],
  "arPow": {
    "Shapeshifting": "d10",
    "Swimming": "d8"
  },
  "arQual": {
    "Ranged Combat": "d8"
  },
  "arPrinciple": "principle-of-destiny",
  "arAbilities": [
    "form-changer-change-forms",
    "form-changer-form-recovery",
    "form-changer-emergency-change"
  ],
  "arReq": {
    "mode": "",
    "die": "",
    "name": ""
  },
  "modPairSlug": "",
  "modD6": [],
  "modGreen": "",
  "modYellow": [],
  "modRed": "",
  "modPowerless": false,
  "peCustom": "",
  "peOutBind": "Persuasion",
  "peQual": {},
  "reds": [
    "r39"
  ],
  "retcon": 5,
  "retconSpec": {
    "prFrom": "principle-of-destiny",
    "prTo": "principle-of-self-preservation"
  },
  "abBinds": {
    "cosmos-mass-effect": "A",
    "form-changer-change-forms": "Shapeshifting",
    "form-changer-form-recovery": "Shapeshifting",
    "red-39": "Signature Weaponry"
  },
  "health": null,
  "f": {
    "name": "Masquerade",
    "alias": "Chris Westwood",
    "player": "Sean",
    "gender": "Male",
    "age": "30",
    "height": "6 ft 2 in",
    "eyes": "Any",
    "hair": "Any",
    "skin": "Any",
    "build": "Athletic",
    "costume": "Gold Mask with a White Suit",
    "notes": ""
  }
}
```
