# Rocket League 2D Audit

## A) Works? NEEDS_FIX
- Properly imports `Game`, exports `createGame()`, calls `game.start()`.
- DOM refs: `#score`, `#best`, `#matchInfo` present in v2.html.
- Canvas `#game` at 600x400 matches W/H constants.
- Overlay markup correct with all required IDs.
- `game.setScoreFn()` called.
- **Issue**: The game uses `bestEl` to display the AI score (line 408-409: `bestEl.textContent = aiScore`), repurposing the "Best" display as "CPU" score. The v2.html labels it as "CPU" so this is intentional, but the variable name is misleading.
- **Issue**: The `handleGoal()` function (lines 400-416) calls `game.setState('over')` but this function is dead code -- it's defined but never called. The actual goal handling is inline in `onUpdate` (lines 667-683) which sets `inGoalScored = true` instead. The dead `handleGoal()` would break if called since it bypasses the `inGoalScored` flag.
- **Issue**: After a goal-scored pause, the game transitions back to 'playing' state (line 633), but if the match ends, `game.setState('over')` is called. Then on restart, `resetAll()` is called which sets state to 'waiting'. The state transitions are complex and use a mix of engine state and custom `inGoalScored` flag, creating potential for edge case bugs.

## B) Playable? PASS
- Left/Right arrows (or A/D) for driving, Up arrow (or W) for jump, Space for boost.
- Full car physics: gravity, ground friction, air rotation, wall riding, ceiling driving.
- Double jump and wall jump mechanics.
- Boost system with pickups scattered around arena.
- Ball physics with gravity, bouncing, and car-ball collision using proper impulse resolution.
- Car-car collision with momentum transfer.
- Goal posts with ball reflection physics.
- AI opponent with multi-layered decision making (urgency-based targeting, boost management).
- Kickoff countdown before each possession.
- Match timer (3 minutes) and first-to-5 win condition.

## C) Fun? PASS
- Impressive 2D Rocket League implementation with authentic feel.
- Car physics are surprisingly deep: ground driving, air spinning, wall riding, boost flying.
- Ball-car collision uses proper OBB (oriented bounding box) collision with impulse response.
- AI is competent: adjusts urgency based on ball position, uses boost strategically, jumps for aerial hits.
- Boost pad system with respawn timers adds map control element.
- Ball trail effect and speed-based glow create visual feedback.
- Goal celebrations with particle explosions and score display.
- Detailed car rendering with body shape, cabin, windshield, headlights, taillights, boost flames.
- Center circle, grid lines, and dashed midfield line create proper soccer arena feel.
- Boost meters for both players shown at bottom.

## Issues
- **Dead code**: `handleGoal()` function (lines 399-416) is defined but never called. The actual goal logic is duplicated inline in `onUpdate`. Should remove the dead function or refactor to use it.
- **State management complexity**: Mix of `game.state` and `inGoalScored` flag creates a complex state machine that's hard to reason about. The `game.state === 'over' && !inGoalScored` check (line 610) is particularly confusing.
- Minor: `performance.now()` used in `onDraw` for boost pad rotation (line 755) instead of using the game's tick counter, which could cause inconsistency if the game is paused.
- Minor: The kickoff timer countdown display (lines 812-821) shows numbers that may not map cleanly to seconds since kickoffTimer=60 at 60fps = 1 second, but the display divides by 30 showing "2, 1" then "GO!".

## Verdict: PASS
Despite the dead code and state management complexity, the game functions correctly and delivers an impressive Rocket League experience in 2D.
