# Gradius

## Game Type
Horizontal scrolling shooter with power-up progression system

## Core Mechanics
- **Goal**: Survive as long as possible, killing enemies and collecting power-up capsules to accumulate score
- **Movement**: Free 2D movement within the screen area; terrain at top and bottom constrains vertical space
- **Key interactions**: Shooting enemies to kill them, collecting capsules dropped by red enemies, pressing Shift to activate queued power-ups, avoiding terrain and enemy bullets

## Controls
- **Arrow keys**: Move the ship (4 directions)
- **Space** (hold): Auto-fire weapons
- **Shift**: Activate current power-up from the power bar (advances index then applies it)

## Difficulty Progression

### Structure
The game uses a wave timer: every `600 ticks` (~10 seconds at 60fps), `waveNum` increments. Every 5th wave (`waveNum % 5 === 0`) triggers a boss. Enemy spawning and boss HP both scale with `waveNum` (capped at 20). There is no level select or restart checkpoint — death loses one of 3 lives and resets all power-ups.

### Key Difficulty Variables
- `waveNum`: starts at `0`, increments every `600 ticks`; caps scaling at `20`
- `enemySpawnTimer` formation interval: `Math.max(60 - waveNum * 2, 20)` — starts at 60 ticks, compresses to 20 ticks by wave 20
- Solo enemy spawn interval: `Math.max(40 - waveNum, 15)` — starts at 40 ticks, compresses to 15 ticks
- Boss HP: `20 + waveNum * 5` — starts at 20, reaches 120 at wave 20
- Boss shoot timer: fires every `30` ticks at all waves, with a 5-bullet spread (`a` from -2 to 2, offset `0.2 rad`)
- Heavy enemy unlock: `waveNum >= 8`; fast enemy unlock: `waveNum >= 5`; turret unlock: `waveNum >= 3`
- `scrollX` speed: fixed at `+1.5` per tick (does not scale with wave)
- `fireInterval`: starts at `8` ticks; becomes `10` if laser is equipped
- `speedLevel`: each Speed power-up adds `0.8` to base speed `2`; max 5 stacks (`MAX_SPEED = 5`)

### Difficulty Curve Assessment
The game starts too hard for players who don't understand the power-up bar system — enemies appear immediately with no grace period, and dying resets all upgrades, creating a brutal death spiral. The boss at wave 5 (only 50 seconds in) fires 5 simultaneous aimed bullets every 30 ticks, which is overwhelming without at least a Speed and Double upgrade.

## Suggested Improvements
- [ ] Add a ~180 tick (~3 second) spawn-free grace period at the start of each life to let players orient themselves
- [ ] Increase the initial `waveNum` threshold for first boss from wave 5 to wave 7, giving players more time to accumulate power-ups before the first boss encounter
- [ ] Reduce boss shoot interval from `30` to `45` ticks on the first boss encounter (when `waveNum` is 5–9) — 5 simultaneous bullets every 0.5 seconds with no shield is extremely punishing
- [ ] Show a brief on-screen tooltip ("Collect capsules, press Shift to power up!") the first time a capsule drops, since the power-up bar system is non-obvious
- [ ] Retain at least one power-up level (e.g. keep speed level 1) on death instead of resetting everything to zero — `resetPowerups()` currently wipes the player completely
- [ ] Slow the initial formation spawn interval to `90` ticks for the first wave (currently jumps straight to 60), giving new players room to breathe before the first formation
