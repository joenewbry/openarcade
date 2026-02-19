# Joust

## Game Type
Wave-based arena brawler (single-player vs enemy knights)

## Core Mechanics
- **Goal**: Survive all waves by jousting enemy knights — land on top of enemies to defeat them, collect eggs before they hatch
- **Movement**: Flap to gain altitude against gravity; horizontal momentum carries and decays with friction; wrap around screen edges
- **Key interactions**: Out-elevating enemies to land the killing blow, collecting eggs quickly before they hatch into stronger enemies, managing multiple simultaneous threats

## Controls
- **Space** or **Arrow Up**: Flap (apply upward impulse)
- **Arrow Left**: Move left (apply leftward acceleration)
- **Arrow Right**: Move right (apply rightward acceleration)

## Difficulty Progression

### Structure
Difficulty scales by `wave`, which increments when all enemies in a wave are defeated. Enemy count increases each wave up to a cap of 8 simultaneous enemies. Enemy types unlock progressively: type 0 appears from wave 1, type 1 from wave 3, type 2 from wave 5. Unhatched eggs hatch after `EGG_HATCH_TIME = 300` frames — uncollected eggs respawn as enemies. The player has 3 lives.

### Key Difficulty Variables
- `GRAVITY`: `0.28` px/frame² — constant
- `FLAP_POWER`: `-4.8` px/frame (upward velocity per flap) — constant
- `MAX_FALL`: `5` px/frame — terminal falling velocity cap
- `MOVE_ACCEL`: `0.4` px/frame² — horizontal acceleration per frame while holding direction
- `MAX_SPEED_X`: `3.5` px/frame — horizontal speed cap
- `FRICTION`: `0.92` — velocity multiplier per frame (horizontal deceleration)
- Enemy count per wave: `Math.min(2 + wave, 8)` — wave 1 = 3 enemies, wave 6+ = 8 enemies
- **Type 0** (Buzzard Rider): speed `1.5`, flapInterval `50` frames — slowest, least aggressive
- **Type 1** (Knight) unlocks at wave 3: speed `2.2`, flapInterval `35` frames
- **Type 2** (Shadow Lord) unlocks at wave 5: speed `3.0`, flapInterval `25` frames
- `EGG_HATCH_TIME`: `300` frames (5 seconds at 60fps) — time before uncollected egg hatches back to enemy
- Kill scoring: `100` pts per type 0, `200` per type 1, `300` per type 2; egg collection adds `50` pts

### Difficulty Curve Assessment
The jump from wave 2 to wave 3 is the hardest single step in the game: enemy count goes from 4 to 5 and type 1 Knights appear for the first time with a 47% higher speed than type 0. Players who have managed by flying above and dive-bombing slower enemies suddenly face enemies that can match their horizontal pace. Wave 5 adds type 2 Shadow Lords with twice the flap frequency of type 0s, making them extremely hard to out-elevate. With max enemies (8) reached at wave 6, the arena becomes crowded quickly and the 300-frame hatch window provides little margin for error when fighting multiple enemies simultaneously. The egg-or-respawn mechanic is also non-obvious to new players.

## Suggested Improvements
- [ ] Start with `Math.min(1 + wave, 8)` enemies instead of `Math.min(2 + wave, 8)` — this gives wave 1 only 2 enemies (down from 3), providing a gentler introduction to the joust mechanic before the arena fills up
- [ ] Delay type 1 Knight unlock from wave 3 to wave 4 and type 2 Shadow Lord unlock from wave 5 to wave 7 — each type introduces a qualitatively different threat, and the current pacing stacks two new enemy types within 4 waves of each other
- [ ] Extend `EGG_HATCH_TIME` from `300` to `450` frames on waves 1–3 so new players have 7.5 seconds to collect eggs before they respawn as enemies — the 5-second window is tight when also fighting remaining enemies
- [ ] Reduce enemy type 0 flapInterval from `50` to `65` frames on wave 1 only, making the first wave noticeably slower and giving players time to observe the elevation-based hit detection mechanic
- [ ] Add a one-line on-screen hint ("Fly higher than enemies to defeat them!") visible during wave 1 — the joust mechanic is non-obvious and many new players try to ram enemies horizontally and get killed
- [ ] Award a bonus life every 5 waves (capped at 5 lives total) to offset the escalating difficulty of higher waves — currently 3 lives is the fixed pool with no replenishment, which makes later waves punishing with no safety net
