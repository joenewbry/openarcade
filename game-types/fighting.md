# Genre: Fighting

**Status**: stub
**Last Updated**: 2026-02-20
**Complexity**: high
**Reference Image**: images/fighting-reference.png

## Identity
Fighting games pit players against each other in close combat with deep mechanical skill expression. The core fantasy is martial mastery — reading opponents, executing precise combos, and outplaying in real-time. Sub-genres include traditional 2D fighters (Street Fighter), platform fighters (Smash Bros), 3D fighters (Tekken), and arena brawlers.

## Core Mechanics
- Character states: idle, walk, jump, crouch, attack, block, hitstun, knockdown
- Input system: motion inputs (quarter-circle, dragon punch), button combos, buffering
- Frame data: startup, active, recovery frames per move
- Hit/hurt boxes, collision detection per frame
- Combo system: links, cancels, juggles, combo scaling
- Blocking: high/low/grab mixups, chip damage, guard break

## Tech Stack
<!-- TECH: {"id": "howler", "role": "audio", "recommended": true} -->
Canvas 2D with sprite sheets. Frame-precise game loop (60fps locked). Rollback netcode for multiplayer.

## Generation Checklist
### Blocking
- Fighter count and differentiation
- Input complexity (simple vs traditional)
- View (side-view 2D, platform, top-down arena)
- Match structure (rounds, stocks, time)
### Defaultable
- Round time, health amount, combo limit, character speed

## From Design to Code
*To be expanded when this genre file is completed.*
