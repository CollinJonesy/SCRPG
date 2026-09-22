# Nightwalker

## Overview

- **Alias:** Unknown
- **Approach:** Ninja
- **Archetype:** Guerrilla
- **Health:** 85

## Physical Attributes

- **Gender:** Male
- **Age:** Unknown
- **Height:** 5 ft 6 in
- **Eyes:** Pale
- **Hair:** None
- **Skin:** None?
- **Build:** Mist?
- **Costume/Equipment:** Technologically Powered Cloak, camouflaging their face in complete shadow.

## Look

_No look notes._

## References

_None yet._

## Biography

_None yet._

## Capabilities and Motivations

_None yet._

## Upgrade Summary

_None yet._

## Abilities

### [A] [Attack] "Deadly Blink"
Attack multiple nearby targets using [Stealth]. Then, end up wherever you want in the scene.

### [R] [Defend, Boost] "Defensive Dash"
When Attacked, Defend yourself by rolling for your single [Alertness] die. Boost yourself with the amount of damage reduced.

### [R] [Attack, Defend] "Malicious Deflection"
Defend against an Attack by rolling your single status die. Deal that much damage to a different nearby target.

### [A] [Attack, Defend] "Human Shield"
Attack one target using [Alertness] and use your Max+Min dice. Defend against all Attacks made by targets other than that target with your Mid die until the start of your next turn. All Defended damage is dealt to the target of your Attack.

## Upgrades

### [I] [None] "Power Upgrade"
Increase all power dice by one size. If any power would increase above d12, instead add another ability from the villain's archetype.

## Mastery

### [I] [Overcome] "Master Behind the Curtain"
As long as you are not directly involved in the fray and are using your influence indirectly, automatically succeed at an Overcome to manipulate a situation.

## Builder

```json
{
  "ap": "ninja",
  "ar": "guerrilla",
  "pickedAp": [
    "ninja-deadly-blink",
    "ninja-defensive-dash"
  ],
  "pickedAr": [
    "guerrilla-malicious-deflection",
    "guerrilla-human-shield"
  ],
  "binds": {
    "ninja-deadly-blink": "Stealth",
    "ninja-defensive-dash": "Alertness",
    "guerrilla-human-shield": "Alertness"
  },
  "displayNames": {},
  "up": "power-upgrade",
  "ma": "master-behind-the-curtain",
  "heroCount": 5,
  "origin": "custom",
  "issues": [
    "session-1",
    "session-2",
    "session-3",
    "session-4",
    "session-5"
  ]
}
```
