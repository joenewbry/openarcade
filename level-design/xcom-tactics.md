# XCOM Tactics

## Game Type
Turn-based tactical strategy (top-down grid combat)

## Core Mechanics
- **Goal**: Eliminate all 4 alien units before they wipe out your 4-soldier squad; score tracks alien kills across missions (score persists between restarts up to a personal best)
- **Movement**: Click-to-move on a 12×12 grid; each soldier can move up to `maxSteps` = 5 tiles per turn (Manhattan distance BFS, blocked by full-cover walls and occupied cells)
- **Key interactions**: Shoot enemies in line of sight (range 10 tiles), throw grenades (range 2–6 tiles, 3 damage at center + 2 splash, destroys cover), set Overwatch (fires automatically when an enemy moves within 8 tiles), hunker down (+20% defense until next turn)

## Controls
- Left click on own soldier: Select soldier (shows move range in blue)
- Left click on highlighted move tile: Move selected soldier
- Left click on highlighted enemy: Shoot selected enemy
- Right click (with soldier selected): Set Overwatch
- G: Enter grenade mode (click target tile to throw)
- H: Hunker down selected soldier
- E: End player turn
- Escape: Cancel grenade mode

## Difficulty Progression

### Structure
There is no level progression — each game is a single mission on a randomly generated 12×12 map with 20–30 cover objects placed randomly. The mission ends when all aliens or all soldiers are dead. Score accumulates across restarts (tracked by `score` and `best`). There is no wave system or difficulty escalation within a mission.

### Key Difficulty Variables
- `hitChance`: base = `95 - (dist - 1) * 7`, minimum 25%; reduced by cover (`COVER_DEF`: half=25, full=50) and hunker (-20); capped at 95%
- Soldier HP: random 3–5 each (`3 + Math.floor(Math.random() * 3)`) for both sides
- Grenade damage: 3 at center, 2 in adjacent tiles; destroys any cover in blast radius
- Overwatch penalty: hit chance reduced by 15 (but floored at 5%)
- Cover placement: `target = 20 + Math.floor(Math.random() * 10)` tiles, 35% chance of full cover, 65% half cover
- AI move scoring: full cover = +30, half cover = +15, no cover = -10; enemies in shoot range add `hitChance * 0.4`; overwatch danger = -35; staying within 2 tiles of enemies = -15 per enemy
- AI shoot threshold: fires if best hit chance >= 25%; uses grenade if `grenadeTarget.value >= 3`
- Player spawn: rows 10–11 (bottom); AI spawn: rows 0–1 (top)

### Difficulty Curve Assessment
The AI is tactically sound from the first turn — it seeks cover, prioritises wounded targets (bonus score for hp <= 1: +40, hp <= 2: +20), and uses grenades intelligently. The player starts at rows 10–11 with the entire map between them and the aliens, giving a meaningful first turn to establish cover positions. However, since HP is randomised 3–5 with no bias, a player could face aliens with 5 HP while their own soldiers have 3, making some games randomly much harder than others.

## Suggested Improvements
- [ ] Guarantee player soldiers always start with HP of at least 4 (`3 + 1 + Math.floor(Math.random() * 2)`) while alien HP stays at 3–5 to reduce random early-game lopsidedness
- [ ] Reduce AI grenade threshold from `value >= 3` to `value >= 4` in the first 3 turns (add a `turnNum <= 3` guard) so the player has time to spread out before being bombed
- [ ] Add a "scout" first turn where the AI units do not move or shoot (only Overwatch) — this gives the player one safe turn to place soldiers behind cover and understand the map before contact
- [ ] Display the hit chance tooltip on hovered enemy cells even before a soldier is selected, so new players understand the cover system passively
- [ ] Add a second mission type with a smaller 8×8 grid and only 2 aliens vs 2 soldiers, serving as a beginner tutorial mission that teaches the core loop before the full 4v4 encounter
