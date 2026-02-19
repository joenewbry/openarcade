# Phoenix

## Game Type
Vertical scrolling shooter (Galaga-style with regenerating enemies)

## Core Mechanics
- **Goal**: Shoot down waves of birds and bosses. Survive 5-wave cycles that repeat with increasing difficulty.
- **Movement**: Left/Right (or A/D) moves the ship horizontally at the bottom.
- **Key interactions**: Space fires bullets (max 3 on screen, cooldown 8 frames). Shift activates a shield (3 uses, 90-frame duration). Enemies swoop and shoot at the player. Large birds and Phoenix birds regenerate HP over time.

## Controls
- Arrow Left / Right or A / D: move ship
- Space (hold): fire
- Shift: activate shield

## Difficulty Progression

### Structure
Waves cycle through 5 types (small birds, swoop birds, phoenix wave, greater phoenix, boss) and repeat. `cycle = Math.floor((wave - 1) / 5)` tracks how many full cycles have been completed. Enemy HP and aggression scale with `cycle`.

### Key Difficulty Variables
- `hpMult`: `1 + cycle * 0.5`. Cycle 0 (waves 1-5) = 1.0x HP; cycle 1 (waves 6-10) = 1.5x; cycle 2 = 2.0x.
- Enemy bullet speed: `3 + cycle * 0.5` — wave 1 = 3 px/frame, cycle 1 = 3.5, cycle 2 = 4.0.
- Enemy shoot chance (formation): `0.003 + cycle * 0.001` per frame per enemy — roughly 0.3% per frame at cycle 0, 0.4% at cycle 1.
- Swoop bullet interval: every 30 frames with 50% chance — fixed, does not scale.
- Phoenix bird shoot chance multiplier: `shootChance *= 1.5` — always applied.
- `PLAYER_SPEED`: fixed at `5` px/frame.
- `SHIELD_DURATION`: fixed at `90` frames — doesn't scale.
- Boss shield rotation: `0.02 + cycle * 0.005` rad/frame; cycle 0 = 0.02, cycle 1 = 0.025.
- Boss shoot interval: `Math.max(30, 60 - cycle * 10)` frames — cycle 0 = 60 frames, cycle 2 = 40 frames (capping at 30).
- Lives: 3, no earned lives mechanic.

### Difficulty Curve Assessment
Wave 1 is appropriately easy: 24 slow-moving small birds that barely shoot. The jump to wave 3 (phoenix birds with regeneration and 5 HP at cycle 0) is a significant spike for new players because there is no warning about the regeneration mechanic. The boss at wave 5 with a rotating shield is genuinely hard with only 3 shields available and 3 lives. Starting at wave 1 of cycle 1, the 1.5x HP multiplier on top of the wave 3-4 difficulty is brutal.

## Suggested Improvements
- [ ] Reduce large bird HP from `3` to `2` for waves in cycle 0 only, by applying `hpMult` starting at `0.8` for cycle 0 instead of `1.0`
- [ ] Increase starting lives from `3` to `5`, or add a mechanic to earn a life every 2 waves cleared
- [ ] Reduce enemy formation shoot chance from `0.003` to `0.001` in waves 1-2 (cycle 0) to give players room to learn movement before the fire rate becomes threatening
- [ ] Add a "regeneration warning" visual cue earlier — the existing regen ring only shows after `regenDelay` frames; display a dimmer ring as soon as HP drops below max to telegraph the mechanic
- [ ] Slow the boss shield rotation from `0.02 + cycle * 0.005` to `0.015 + cycle * 0.004` at cycle 0 to make the wave 5 boss more approachable for first-time players
