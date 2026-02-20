# Genre: Card / Board Game

**Status**: stub
**Last Updated**: 2026-02-20
**Complexity**: medium
**Reference Image**: images/card-board-reference.png

## Identity
Digital card and board games translate tabletop experiences to screen. The core fantasy is strategic decision-making with limited information — reading opponents, managing hands, and planning ahead. Sub-genres include collectible card games (Hearthstone, Slay the Spire), traditional card games (Solitaire, Poker), board game adaptations, and deck-builders.

## Core Mechanics
- Card systems: draw, hand management, play, discard, deck cycling
- Turn structure: phases (draw, main, combat, end), priority/response windows
- Board state: zones (hand, field, deck, graveyard), spatial placement
- Resource/mana systems: per-turn income, spending, cost curves
- Shuffling algorithms (Fisher-Yates), fair randomness
- Drag-and-drop card interactions, card fan layouts

## Tech Stack
<!-- TECH: {"id": "howler", "role": "audio", "optional": true} -->
DOM-based or Canvas 2D. CSS transitions for card animations. No physics needed.

## Generation Checklist
### Blocking
- Game type (CCG, traditional, board, deck-builder)
- Turn structure (alternating, simultaneous, real-time)
- Card/piece interaction model
- Win condition
### Defaultable
- Hand size, deck size, starting resources, board dimensions

## From Design to Code
*To be expanded when this genre file is completed.*
