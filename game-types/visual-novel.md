# Genre: Visual Novel

**Status**: stub
**Last Updated**: 2026-02-20
**Complexity**: low-medium
**Reference Image**: images/visual-novel-reference.png

## Identity
Visual novels are narrative-driven games where player choices shape the story. The core fantasy is living inside a story — making meaningful decisions, forming relationships, and discovering branching outcomes. Sub-genres include pure VN (Doki Doki Literature Club), dating sim, mystery/detective (Ace Attorney), horror VN, and interactive fiction.

## Core Mechanics
- Dialog system: character name, text box, typewriter effect, click-to-advance
- Choice branching: binary choices, multi-option, timed choices
- Scene management: backgrounds, character sprites, transitions
- Variable tracking: affinity scores, flags, inventory
- Save/load system with multiple slots
- Branching narrative graph (DAG structure)
- Character expressions and pose changes

## Tech Stack
<!-- TECH: {"id": "howler", "role": "audio", "optional": true} -->
DOM-based with CSS transitions, or Canvas 2D. Howler.js for music/voice. No physics needed.

## Generation Checklist
### Blocking
- Story genre (romance, mystery, horror, comedy, drama)
- Choice impact model (branching paths, point accumulation, both)
- Character count and relationships
- Ending count and conditions
### Defaultable
- Text speed, scene count, choice frequency, music style

## From Design to Code
*To be expanded when this genre file is completed.*
