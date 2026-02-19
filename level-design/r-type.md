# R-Type

## Game Type
Horizontal scrolling shoot-em-up (shmup) with a charge-shot mechanic

## Core Mechanics
- **Goal**: Survive all 8 waves of enemies, defeat the boss at the end of each wave, and loop back to wave 1 for a higher-score run
- **Movement**: Move the ship in 8 directions (cardinal + diagonal) at `PLAYER_SPEED = 3.5` px/frame; the stage scrolls automatically at `SCROLL_SPEED = 1` px/frame
- **Key interactions**: Tap `Space` to fire a normal shot; hold `Space` to charge for up to `CHARGE_MAX = 90` frames, then release for a powerful charged shot; collect power-up pods dropped by enemies to upgrade weapons (speed, double-shot, laser); defeat the boss to clear a wave

## Controls
- `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` — move ship (8-directional)
- `Space` (tap) — fire normal shot
- `Space` (hold then release) — fire charged shot (charges over `CHARGE_MAX = 90` frames)

## Difficulty Progression

### Structure
The game has 8 fixed, hand-authored waves. Each wave has a defined enemy composition and ends with a boss. After wave 8 the game loops back to wave 1 with the same enemy layouts but the player retains no power-ups (ship resets). There is no dynamic scaling within a wave — enemy count, health, and fire patterns are fixed per wave definition.

### Key Difficulty Variables
- `PLAYER_SPEED`: `3.5` px/frame — constant
- `SCROLL_SPEED`: `1` px/frame — constant across all 8 waves
- `CHARGE_MAX`: `90` frames (1.5 s at 60 fps) to reach full charge — constant
- Enemy HP by type: scout = `1`, drifter = `2`, charger = `1`, turret = `4`
- Boss HP: Boss 1 (`dobkeratops`) = `60`, Boss 2 (`gomander`) = `90`; other wave bosses fall between these values
- Power-up drop: enemies drop pods randomly; no guaranteed drops in any wave
- Lives: player has a fixed number of lives; no information on respawn invincibility duration from the fixed wave structure
- Wave structure: waves 1–4 introduce one enemy type at a time; waves 5–8 mix all types including turrets and chargers simultaneously

### Difficulty Curve Assessment
The early waves (1–3) are approachable because scout-class enemies have 1 HP and appear in manageable numbers. The difficulty spike comes at wave 5, which mixes chargers (fast kamikaze units) with stationary turrets (4 HP) requiring charged shots. Players who have not learned to hold `Space` and build charged shots will waste time on turrets. Because power-up drops are random, a player who dies in wave 3 and loses their double-shot pod may find wave 4 significantly harder than expected.

## Suggested Improvements
- [ ] Guarantee at least one speed power-up pod in wave 1 by placing it on a specific enemy kill, so all players experience the upgraded movement before wave 2
- [ ] Add a short scroll-pause (30–60 frames) at the start of each wave showing the wave number, giving players time to reorient after a boss kill
- [ ] Reduce Boss 1 (`dobkeratops`) HP from `60` to `45` for first-time loops; only restore it to `60` on loop 2+ to ease new players into the boss format
- [ ] Extend `CHARGE_MAX` from `90` to `120` frames (2 s) — the 1.5-second window is short enough that players under pressure fire uncharged shots at turrets ineffectively; a longer window makes the mechanic more forgiving to learn
- [ ] Add a visual charge-progress indicator on the ship (a glow or bar) so players know when the shot is ready; currently there is no feedback during the charge phase
- [ ] On death/respawn, grant 90 frames of invincibility and display a brief flash so players can reposition without immediately dying again
