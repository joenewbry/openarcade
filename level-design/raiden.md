# Raiden

## Game Type
Vertical scrolling shoot-em-up (shmup) with weapon upgrade system

## Core Mechanics
- **Goal**: Survive through multiple stages, destroy enemies and bosses, and achieve the highest score
- **Movement**: Move the ship in 8 directions at `PLAYER_SPEED = 4` px/frame; the stage scrolls upward automatically
- **Key interactions**: Shoot with `Space`; collect weapon power-ups (VULCAN, LASER, MISSILE) with 3 upgrade levels each; use bombs (`X`) for screen-clearing explosions; stage ends after `STAGE_DURATION = 3600` frames or when the boss is defeated; boss spawns near the end of each stage

## Controls
- `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` — move ship (8-directional)
- `Space` — fire primary weapon (auto-fire while held)
- `X` — drop bomb (screen-clearing, limited supply)

## Difficulty Progression

### Structure
Stages increment from 0 upward with no fixed upper limit. Each stage lasts `STAGE_DURATION = 3600` frames (~60 s at 60 fps) before the boss spawns. All enemy and boss parameters scale linearly with the `stage` variable. The player starts with `MAX_LIVES = 3` and `MAX_BOMBS = 3`; power-ups and bomb pickups drop randomly from enemies.

### Key Difficulty Variables
- `PLAYER_SPEED`: `4` px/frame — constant
- `STAGE_DURATION`: `3600` frames per stage — constant
- `spawnInterval`: `Math.max(40, 120 - stage * 12)` frames between enemy spawns
  - Stage 0: 120 frames (~2 s), Stage 7: 36 frames (floor ~40), Stage 7+: 40 frames floor
- Basic enemy `vy` (downward speed): `1.5 + stage * 0.2` px/frame
  - Stage 0: 1.5, Stage 5: 2.5, Stage 10: 3.5
- Fast enemy `vy`: `3 + stage * 0.15` px/frame
  - Stage 0: 3.0, Stage 5: 3.75, Stage 10: 4.5
- Boss HP: `50 + stage * 30`
  - Stage 0: 50, Stage 3: 140, Stage 5: 200
- Boss fire rate: `Math.max(15, 40 - stage * 3)` frames between shots
  - Stage 0: 40 frames (~1.5 s/shot), Stage 8: 16 frames (~0.27 s/shot, near floor)
- `MAX_BOMBS`: `3` per life — constant
- `MAX_LIVES`: `3` — constant

### Difficulty Curve Assessment
Stage 0 is manageable with a 2-second spawn interval and slow enemies, but by stage 3 the boss already has 140 HP and fires every 31 frames. By stage 5 the boss has 200 HP and fires every 25 frames, which requires near-perfect movement to survive without bombs. The spawn interval hits its floor by stage 7, but boss HP and fire rate continue scaling indefinitely — making later stages increasingly unbeatable unless the player has accumulated max weapon upgrades. Players who lose lives early lose their weapon upgrades (ship resets on death), creating a death spiral.

## Suggested Improvements
- [ ] Slow the boss HP scaling: change `50 + stage * 30` to `50 + stage * 20` so stage 5 boss has 150 HP instead of 200, giving players more time to learn boss patterns before they become bullet sponges
- [ ] Slow the boss fire rate scaling: change `Math.max(15, 40 - stage * 3)` to `Math.max(20, 40 - stage * 2)` so the floor is `20` frames (not `15`) and is reached at stage 10 instead of stage 8
- [ ] On respawn after death, grant the player a weapon upgrade (e.g., restore to level 1 of whichever weapon they had) to prevent the death-spiral of dying at low fire power in a high-density stage
- [ ] Raise `spawnInterval` floor from `40` to `55` frames — the current floor of 40 frames means enemies spawn roughly every 0.67 seconds, filling the screen faster than the player can clear them without upgraded weapons
- [ ] Add a visible stage number and a brief "STAGE X" banner at the start of each stage so players understand their progression
- [ ] Guarantee a weapon power-up drop from the first enemy killed in each stage, so players always have at least one upgrade opportunity regardless of spawn luck
