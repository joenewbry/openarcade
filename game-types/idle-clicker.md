# Genre: Idle / Clicker

**Status**: stub
**Last Updated**: 2026-02-20
**Complexity**: low
**Reference Image**: images/idle-clicker-reference.png

## Identity
Idle and clicker games reward patience and optimization with exponential growth. The core fantasy is accumulation and progress — watching numbers grow, unlocking upgrades, and optimizing resource generation. Sub-genres include pure clicker (Cookie Clicker), idle manager (Adventure Capitalist), incremental RPG, and merge games.

## Core Mechanics
- Click/tap for primary resource generation
- Automatic generators: buildings, workers, multipliers
- Upgrade trees: linear, branching, prestige layers
- Prestige/rebirth: reset for permanent multiplier
- Big number handling (scientific notation, custom formatters)
- Offline progress calculation
- Save/load (localStorage with JSON serialization)

## Tech Stack
DOM-based UI is often sufficient. Canvas 2D for visual flair. No physics needed.

## Generation Checklist
### Blocking
- Primary resource and theme
- Automation model (generators, workers, passive)
- Prestige system (yes/no, layers)
- Visual style (minimal UI, themed world, character-based)
### Defaultable
- Starting click value, generator costs, cost scaling formula (typically 1.15x)

## From Design to Code
*To be expanded when this genre file is completed.*
