# Tower Defense

## Game Type
Wave-based tower defense

## Core Mechanics
- **Goal**: Survive as many enemy waves as possible without losing all 20 lives; enemies follow a fixed path and each one that reaches the exit costs a life
- **Movement**: No player movement; player places and upgrades towers by clicking on the map grid adjacent to the enemy path
- **Key interactions**: Click an empty tile to build a tower; click a tower to upgrade or sell it; enemies spawn automatically each wave along a fixed winding path

## Controls
- Left-click on empty tile: build selected tower type
- Left-click on tower: open upgrade/sell menu
- Number keys 1–4: select tower type (blaster, cannon, frost, sniper)
- Space / Next Wave button: start the next wave

## Difficulty Progression

### Structure
Waves are numbered starting at 1 and increase indefinitely. Each wave spawns a fixed set of enemies with HP scaled by the wave number. Between waves the player receives a gold bonus and can build or upgrade towers. The `wave` counter drives all difficulty parameters — spawn interval, enemy count, and enemy HP all scale with `wave`. There are no explicit level breaks or checkpoints.

### Key Difficulty Variables
- Starting gold: 200; starting lives: 20
- Tower costs: blaster $50, cannon $100, frost $75, sniper $150
- Tower stats:
  - Blaster: 8 damage, rate 8 frames, range 80px
  - Cannon: 40 damage, rate 30 frames, range 90px, splash radius 1.2
  - Frost: 5 damage, rate 12 frames, range 70px, slows to 0.5× speed
  - Sniper: 60 damage, rate 50 frames, range 200px
- Enemy HP multiplier per wave: `1 + (wave - 1) * 0.12` (12% more HP each wave)
- Spawn interval: `Math.max(15, 40 - wave)` frames (reaches floor of 15 at wave 25)
- Wave completion gold bonus: `20 + wave * 5`
- Enemy types: basic (40 HP, speed 1.0, $10 kill), fast (25 HP, speed 2.0, $15), tank (150 HP, speed 0.6, $25), boss (500 HP, speed 0.4, $100)

### Difficulty Curve Assessment
The 12% HP increase per wave is aggressive — by wave 10 enemies have 2.08× their base HP, and by wave 20 it is 3.28×. The $200 starting budget covers at most 4 blasters or 2 cannons, which is barely enough coverage before wave 1 spawns. Fast enemies at speed 2.0 can outrun blaster fire in early waves when tower placement is sparse, and there is no indication of which enemy type appears in which wave, making wave 1 feel arbitrary.

## Suggested Improvements
- [ ] Increase starting gold from `200` to `300` so players can place 3–4 towers with meaningful coverage before wave 1, rather than scrambling to cover the path with 2 blasters and hoping for the best
- [ ] Reduce the HP multiplier per wave from `0.12` to `0.08` for the first 10 waves (add `const scale = wave <= 10 ? 0.08 : 0.12`) to slow the early scaling — by wave 10 enemies would be 1.72× base HP instead of 2.08×, which is significantly more forgiving for players still learning tower placement
- [ ] Show a pre-wave preview panel listing which enemy types will spawn in the next wave (e.g. "Wave 3: 8 Basic, 4 Fast") so players can make informed build decisions; currently all waves feel identical until the enemies appear
- [ ] Add a single free blaster tower placement at the start of the game (placed automatically on a strong chokepoint) so new players immediately see a tower in action and understand the placement mechanic before spending their gold
- [ ] Reduce fast enemy base speed from `2.0` to `1.6` — at 2.0 speed with a spawn interval that can drop to 15 frames, fast enemies can chain-overwhelm a sparse early setup before the player's towers can track and fire
- [ ] Add a tower range preview circle when hovering over a build tile so players can visualize coverage before committing gold — without this, new players tend to cluster towers instead of staggering them for path coverage
