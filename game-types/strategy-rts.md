# Genre: Strategy / RTS

**Status**: stub
**Last Updated**: 2026-02-20
**Complexity**: high
**Reference Image**: images/strategy-rts-reference.png

## Identity
Real-time strategy games challenge players to manage resources, build bases, and command armies simultaneously. The core fantasy is being a general or commander — making high-level decisions under time pressure while opponents do the same. Sub-genres include classic RTS (StarCraft, Age of Empires), 4X (Civilization), auto-battler, and real-time tactics.

## Core Mechanics
- Resource gathering and management
- Base building and tech trees
- Unit production, control, and formations
- Fog of war and scouting
- Micro (unit control) vs macro (economy/production) balance

## Tech Stack
<!-- TECH: {"id": "matter", "role": "physics", "optional": true} -->
Canvas 2D for top-down. Pathfinding (A*) essential. Spatial hashing for unit queries.

## Generation Checklist
### Blocking
- Scale (micro-tactics vs full base-building)
- Resource types and gathering method
- Unit control (individual, group select, auto)
- Win condition (destroy base, capture points, survive)
### Defaultable
- Map size, starting resources, unit cap

## From Design to Code
*To be expanded when this genre file is completed.*
