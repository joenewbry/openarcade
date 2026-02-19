# Kaboom

## Game Type
Wave-based bomb-catching arcade game

## Core Mechanics
- **Goal**: Catch all falling bombs with buckets before they hit the ground; survive as many waves as possible
- **Movement**: Move buckets left and right to catch falling bombs
- **Key interactions**: Tracking multiple simultaneously falling bombs, catching all bombs each wave to preserve buckets, earning wave completion bonuses

## Controls
- **Mouse move** (or touch drag): Move the bucket stack horizontally
- Buckets are stacked vertically; all three move together as a unit

## Difficulty Progression

### Structure
Difficulty scales by `wave`, which increments when all bombs in a wave are caught. Each wave spawns `count = 10 + wave * 5` bombs. The game ends when all buckets are lost (one bucket lost per missed bomb). Completing a wave restores buckets to a maximum of 3. There is no cap on `wave` — it increases indefinitely.

### Key Difficulty Variables
- Bomb horizontal spawn: random x position each bomb
- Bomb fall speed: `2 + wave * 0.3` px/frame — wave 1 = `2.3`, wave 5 = `3.5`, wave 10 = `5.0`, wave 20 = `8.0` (effectively capped by canvas height crossing time)
- Bomb spawn interval: `Math.max(60 - wave * 5, 12)` frames between bombs — wave 1 = `55` frames (≈0.9 sec), wave 5 = `35` frames, wave 10 = `10` frames... wait: `60 - 10*5 = 10` but min is `12`, so reached at wave ~9.6; effectively minimum of `12` frames (0.2 sec) from wave 10 onward
- Bombs per wave: `count = 10 + wave * 5` — wave 1 = `15` bombs, wave 5 = `35` bombs, wave 10 = `60` bombs
- Wave completion bonus: `wave * 100` pts
- Score per catch: `wave * 10` pts
- Starting buckets: `3`; max buckets: `3`; buckets restored to max on wave completion
- Miss penalty: lose 1 bucket per missed bomb; losing all 3 = game over

### Difficulty Curve Assessment
The wave 10 threshold is brutally hard: 60 bombs per wave, spawning every 12 frames (0.2 seconds) at 5.0 px/frame fall speed. At 60fps, a bomb crosses a 400px canvas height in only 80 frames — giving players just over 1 second of reaction time per bomb while new bombs spawn every 12 frames. At this rate, multiple bombs are always in flight simultaneously and one moment of cursor misalignment causes a cascade miss. The early waves (1–3) are fine for casual players, but the curve steepens sharply between waves 5 and 10 without any intermediate difficulty signal. Bucket restoration on wave completion means players who survive waves are reset to full, which removes the survival tension that bucket count would otherwise provide.

## Suggested Improvements
- [ ] Reduce the per-wave bomb count growth from `wave * 5` to `wave * 3`: new formula `10 + wave * 3` — this keeps wave 10 at 40 bombs instead of 60, giving the middle-game waves a more breathable pace
- [ ] Change the spawn interval minimum from `12` frames to `18` frames: `Math.max(60 - wave * 4, 18)` — this shifts minimum spawn rate to wave ~10.5 and keeps per-bomb reaction time above 0.3 seconds
- [ ] Reduce fall speed scaling from `wave * 0.3` to `wave * 0.22`: new formula `2 + wave * 0.22` — wave 10 fall speed becomes `4.2` instead of `5.0`, keeping bombs on screen ~20% longer
- [ ] Show a wave countdown (e.g., "Wave 3: 20 bombs remaining") in the HUD so players know how many bombs are left to survive in the current wave — currently there is no indication of wave progress
- [ ] Add a brief 1.5-second pause between waves before the next wave starts spawning — currently bombs can begin spawning almost immediately after the wave-complete banner appears, leaving no recovery moment
- [ ] Consider not fully restoring all 3 buckets on wave completion — instead restore only 1 bucket (up to max 3), so skilled players who cleared the wave cleanly gain a small buffer while players who barely survived with 1 bucket still have some tension. This would make bucket management meaningful across waves.
