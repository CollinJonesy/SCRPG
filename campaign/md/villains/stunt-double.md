# Stunt Double

## Overview

- **Alias:** Colt Masters
- **Approach:** Skilled
- **Archetype:** Loner
- **Health:** 70

## Physical Attributes

- **Gender:** Male
- **Age:** Mid-30s
- **Height:** 6 ft 2 in
- **Eyes:** Brown
- **Hair:** Brown
- **Skin:** White
- **Build:** Muscular
- **Costume/Equipment:** Solid Black Tee Shirt, Dark Wash Denim Jeans, and a bad "Wolverine-esque" facial hair setup.

## Look

Looks like an uglier version of Lucas Lee from SP v the World.

## References

_None yet._

## Biography

_None yet._

## Capabilities and Motivations

_None yet._

## Upgrade Summary

_None yet._

## Abilities

### [A] [Boost, Hinder] "Best in the Biz"
Hinder using [Deduction]. Use your Min die. Boost yourself using your Max die.

### [R] [Defend] "Bullet Time"
When Attacked, Defend yourself by rolling your single [Close Combat] die. Deal that much damage to another target.

### [A] [Hinder, Recover] "I Can Do This All Day"
Hinder multiple targets using [Awareness]. Recover Health equal to the number of targets Hindered this way.

### [I] [None] "The Single Double"
As long as you have no nearby allies in the scene, increase all damage you deal by 1 and reduce all damage you take by 1.

## Upgrades

### [I] [None] "Power Upgrade"
Increase all power dice by one size. If any power would increase above d12, instead add another ability from the villain's archetype.

## Mastery

### [I] [Overcome] "Master of Superiority"
As long as you are manifesting effects related to a power you have at d12, automatically succeed at an Overcome involving usage of those powers.

## Builder

```json
{
  "ap": "skilled",
  "ar": "loner",
  "pickedAp": [
    "skilled-best-in-the-biz",
    "skilled-dodge-and-weave"
  ],
  "pickedAr": [
    "loner-antisocial-behavior",
    "loner-singular-strength"
  ],
  "binds": {
    "skilled-best-in-the-biz": "Deduction",
    "skilled-dodge-and-weave": "Close Combat",
    "loner-antisocial-behavior": "Awareness"
  },
  "displayNames": {
    "skilled-dodge-and-weave": "Bullet Time",
    "loner-antisocial-behavior": "I Can Do This All Day",
    "loner-singular-strength": "The Single Double"
  },
  "up": "power-upgrade",
  "ma": "master-of-superiority",
  "heroCount": 5,
  "origin": "custom",
  "issues": [
    "session-1"
  ]
}
```
