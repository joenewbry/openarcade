# Plants vs Zombies

## Game Type
Lane-based tower defense (place plants to stop waves of zombies)

## Core Mechanics
- **Goal**: Prevent zombies from reaching the left edge of the 5×9 grid by placing plants that shoot, block, or slow them. Survive all waves.
- **Movement**: Mouse-driven. Click a plant card to select it (if enough sun), then click a grid cell to place it.
- **Key interactions**: The sun resource regenerates passively (one sun drop every 360 frames from the sky) and from Sunflowers (every 300 frames). Zombies walk left at a fixed speed, slowed by Snow Peas and blocked by Wall-nuts. Peashooters fire a pea every 60 frames at the first zombie in their row. Waves of zombies spawn from the right with increasing count and HP.

## Controls
- Mouse Click: select plant card, place plant in cell, collect fallen sun

## Difficulty Progression

### Structure
Waves progress indefinitely. Wave number directly drives zombie count, spawn rate, and HP multiplier. There is no explicit level cap — the game runs until a zombie crosses the left boundary.

### Key Difficulty Variables
- Grid: `5` rows × `9` columns, `CELL_W = 60` px, `CELL_H = 90` px
- Starting sun: `150`
- Sky sun interval: every `360` frames (~6 seconds at 60fps)
- Plant costs and stats:
  - Peashooter: `100` sun, `20` dmg per shot, fires every `60` frames
  - Sunflower: `50` sun, generates sun every `300` frames
  - Wall-nut: `50` sun, `400` HP, no attack
  - Snow Pea: `175` sun, `18` dmg per shot every `60` frames + slows zombies
- Zombie types and base HP: basic `100`, cone `200`, bucket `400`, flag `120`
- HP multiplier per wave: `1 + (wave - 1) * 0.1` (wave 1 = 1.0×, wave 5 = 1.4×, wave 10 = 1.9×)
- Zombies per wave:
  - Waves 1–2: `3 + wave * 2` (wave 1 = 5, wave 2 = 7)
  - Waves 3–5: `5 + wave * 2` (wave 3 = 11, wave 5 = 15)
  - Waves 6–10: `8 + wave * 2` (wave 6 = 20, wave 10 = 28)
  - Wave 11+: `10 + wave * 3`
- Spawn interval: `Math.max(40, 120 - wave * 5)` frames (wave 1 = 115 frames, wave 5 = 95, wave 16+ = 40 frames minimum)

### Difficulty Curve Assessment
Wave 1 is appropriately gentle (5 basic zombies, 115-frame spawn interval) and gives the player time to build a basic economy. The HP multiplier of 0.1× per wave is modest but compounds quickly — by wave 10 zombies have nearly double HP, and the 28-zombie wave count means the field is constantly saturated. The most critical early decision is Sunflower placement: without enough sun income, the player cannot afford Snow Peas or Wall-nuts when higher HP zombies arrive. Starting with only 150 sun is not enough to place both a Peashooter (100) and a Sunflower (50) with anything left over, forcing a choice between offense and economy from turn 1. The 360-frame sky sun interval is also slow for the opening minutes.

## Suggested Improvements
- [ ] Increase starting sun from `150` to `200` so players can place a Sunflower and a Peashooter simultaneously at game start without being immediately starved
- [ ] Reduce the sky sun interval from `360` frames to `270` frames (~4.5 seconds) to improve early-game sun flow before Sunflowers are established
- [ ] Reduce zombie HP multiplier from `0.1 * (wave - 1)` to `0.07 * (wave - 1)` so the compounding HP growth is less severe in mid-game waves 6-10
- [ ] Reduce wave 1–2 zombie count formula from `3 + wave * 2` to `2 + wave * 1` (wave 1 = 3, wave 2 = 4) to give new players more time to establish a first row before being overwhelmed
- [ ] Reduce Wall-nut cost from `50` sun to `25` sun — at 50 sun it competes directly with a Sunflower, meaning players routinely skip defensive options in the early game
- [ ] Add a brief 5-second grace period at the start of each wave where no new zombies spawn, so the player can place plants between waves without being immediately interrupted
