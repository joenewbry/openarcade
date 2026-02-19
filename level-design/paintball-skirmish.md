# Paintball Skirmish

## Game Type
Top-down team shooter (1 player vs 2 AI teammates vs 3 AI enemies, best-of-5 rounds)

## Core Mechanics
- **Goal**: Eliminate the enemy red team. Win 3 rounds to win the match.
- **Movement**: WASD or Arrow Keys for 8-directional movement; Shift near cover to crouch and gain a 70% bullet block chance.
- **Key interactions**: Mouse aim, click to shoot, R to reload. Players use cover strategically. Ammo pickups respawn on the field. Score = number of eliminations the player personally lands.

## Controls
- WASD / Arrow Keys: move
- Mouse: aim
- Left Click: shoot
- R: reload
- Shift (near cover): crouch

## Difficulty Progression

### Structure
The game runs fixed rounds with no escalation between them. All rounds use the same map, the same AI parameters, and the same weapon stats. There is no difficulty increase across rounds or matches. The match ends when one team reaches 3 round wins.

### Key Difficulty Variables
- `MOVE_SPEED`: player = `2.2` px/frame, AI = `2.2` (same)
- `SHOOT_COOLDOWN`: player = `8` frames. AI = `AI_SHOOT_COOLDOWN = 15` frames (AI fires slower)
- `BULLET_SPEED`: `8` px/frame — same for both teams
- `MAX_AMMO`: `50` bullets per reload for all players
- `RELOAD_TIME`: `60` frames (~1 second)
- AI accuracy spread: `0.1 * (1 - p.aiAccuracy)` where `aiAccuracy` is `0.5 + random * 0.25` for red team. Minimum spread ~0.075 rad vs player's fixed `0.04` rad spread.
- AI `aiBravery`: `0.3 + random * 0.5` — controls aggression vs cover-seeking; pure random, never changes between rounds.
- No round-to-round scaling of any parameter.

### Difficulty Curve Assessment
The game starts at a reasonable difficulty because the player has a faster fire rate (8 frames vs 15 for AI) and tighter accuracy, and has 2 AI allies helping. However the game is completely flat — there is zero difficulty progression. Later rounds feel identical to round 1, which can make winning feel arbitrary rather than earned.

## Suggested Improvements
- [ ] Add per-round AI difficulty scaling: increase `aiAccuracy` by `0.04` and reduce `AI_SHOOT_COOLDOWN` by 1 frame (floor 10) per round won by the player, capping at round 5
- [ ] Reduce player ammo capacity from `MAX_AMMO = 50` to `30` to make resource management more meaningful from the start
- [ ] Introduce a round-start delay (2-second countdown) so the player has time to orient before AI begins advancing; currently AI starts moving immediately
- [ ] Make AI `aiBravery` start lower (e.g. `0.2 + random * 0.2`) in round 1 and ramp to `0.4 + random * 0.4` by round 5 to give the feel of enemies adapting
- [ ] Add a 5-second respawn / spectate window explanation on first death so new players understand the "watch teammates" mechanic
