# Smash Arena

## Game Type
Platform fighter / stock-based brawler (Smash Bros-style)

## Core Mechanics
- **Goal**: Be the last fighter standing by depleting all 3 stocks of each of the 3 AI opponents; knock opponents off the stage — the further off-screen they go, the sooner they die
- **Movement**: 2D platformer movement with running, jumping, double-jumping, and fast-falling; gravity pulls fighters down constantly
- **Key interactions**: Attack to deal damage (displayed as a percentage); higher damage = more knockback on the next hit; use shield to block; grab to throw opponents; stage hazards and item spawns add dynamic elements

## Controls
- Arrow Left / Right — run
- Arrow Up — jump (press again in air for double jump)
- Arrow Down — fast-fall (in air) / drop through platform
- Z — attack (ground: jab or smash based on directional input; air: aerial or up-air or d-air)
- X — special move
- C — grab
- S — shield (hold)

## Difficulty Progression

### Structure
Single match: 4 fighters (1 human, 3 AI), each with `stocks = 3`. The match ends when only one fighter has stocks remaining. There are no rounds or level progressions — each new game starts fresh. Item spawns occur every `itemSpawnTimer = 300` frames initially. Stage hazards trigger every `stageHazardTimer = 800 + rand * 300` frames. A `countdownTimer = 180` frames (~3 seconds) counts down before the match starts.

### Key Difficulty Variables
- `GRAVITY`: `0.55` per frame — constant
- `JUMP_FORCE`: `-11` — initial jump velocity
- `DOUBLE_JUMP_FORCE`: `-9.5` — second jump velocity
- `MOVE_SPEED`: `4.5` — horizontal movement speed
- `stocks`: `3` per fighter
- Attack data:
  - Jab: `dmg: 4`, `knockback: 2.5`, `startup: 3`, `active: 3`
  - Smash: `dmg: 14`, `knockback: 8`, `startup: 14`, `active: 4`
  - Aerial: `dmg: 8`, `knockback: 5`
  - Up-Air: `dmg: 9`, `knockback: 6`
  - D-Air: `dmg: 10`, `knockback: 7`
- `itemSpawnTimer`: `300` frames (~5 seconds) between item spawns
- `stageHazardTimer`: `800 + rand * 300` frames (~13–18 seconds) between hazards
- `countdownTimer`: `180` frames pre-match countdown

### Difficulty Curve Assessment
The 3-vs-1 structure is inherently punishing for a new player — all three AI opponents can target the human simultaneously and there is no way to manage that aggro. With `stocks = 3` each (9 total AI stocks vs 3 human stocks), the human must eliminate opponents roughly 3:1 to win, which requires a significant skill advantage from the first moment. The smash attack's 14-frame startup is very slow but one-shots low-damage opponents, so new players who spam smash will find it whiffed constantly.

## Suggested Improvements
- [ ] Reduce AI opponents from 3 to 2 in an introductory difficulty setting, keeping the 3-vs-1 as the "hard" mode — even a single-stock difference in opponents dramatically reduces the gap
- [ ] Lower AI aggression for the first 30 seconds of a match (reduce AI attack frequency by ~40%) to give new players time to find their footing before being swarmed
- [ ] Reduce Smash startup frames from `14` to `10` so the move is punishing but not impossible to land for players still learning spacing — a 14-frame startup means a new player will whiff the move almost every attempt against responsive AI
- [ ] Add a brief visual flash or indicator on the fighter when they are at high damage (e.g. > 100%) to communicate "this fighter will die on the next strong hit" — currently the percentage readout is the only feedback and new players do not watch it closely
- [ ] Reduce `itemSpawnTimer` from 300 to 200 frames so items appear more frequently and give the human player additional resources to compete against the numerical disadvantage of 3 AI opponents
- [ ] Add a 1-vs-1 training mode against a single AI with reduced stocks (1 each) so players can learn the attack frame data and knockback behavior without immediately facing the chaos of a 4-player match
