# Canabalt

## Game Type
Infinite auto-runner / precision platformer

## Core Mechanics
- **Goal**: Run as far as possible without falling into a gap or getting stopped cold by an obstacle
- **Movement**: Runner moves automatically at `speed` px/frame; player only controls jumping
- **Key interactions**: Jump to cross gaps between buildings; hitting obstacles reduces speed; obstacles can be ignored (runner phases through the slowdown hit) if timed right to clear them

## Controls
- Space or Arrow Up: Jump (only while on ground — single jump only)

## Difficulty Progression

### Structure
Difficulty is purely time-based through speed accumulation. There are no discrete levels or waves. The game accelerates continuously until `MAX_SPEED` is reached. Gap sizes are also scaled with speed. Obstacles spawn probabilistically on buildings (40% chance per building).

### Key Difficulty Variables
- `speed`: starts at `INITIAL_SPEED = 4` px/frame, increases by `ACCELERATION = 0.003` per frame, capped at `MAX_SPEED = 12` px/frame
- Time to reach max speed: `(12 - 4) / 0.003 = 2667 frames ≈ 44 seconds` at 60fps
- `MIN_GAP`: 40 px; `MAX_GAP`: 120 px
- Gap scaling with speed: `gap = MIN_GAP + gapScale * (MAX_GAP - MIN_GAP) * 0.6 + Math.random() * (MAX_GAP - MIN_GAP) * 0.4` where `gapScale = Math.min(1, (speed - 4) / 8)`
- At max speed, expected gap is ~100 px wide with a 120 px max possible
- Obstacle hit penalty: `speed = Math.max(INITIAL_SPEED, speed * 0.6)` — resets to at least 4
- `JUMP_FORCE = -11` px/frame upward, `GRAVITY = 0.6` px/frame² — jump arc is fixed
- Building height variation: `± 60 px` per building transition (can create very tall drops)

### Difficulty Curve Assessment
The 44-second ramp to max speed is reasonable in theory, but the building height variation of ±60 px per segment combined with max-speed gaps makes the game nearly unforgiving past ~30 seconds. The obstacle penalty that resets speed to `speed * 0.6` can feel jarring since it happens instantly without a grace window, and players often run into an obstacle at full speed immediately after a jump.

## Suggested Improvements
- [ ] Reduce `ACCELERATION` from `0.003` to `0.002` to extend the ramp to ~67 seconds, giving players more time to acclimate
- [ ] Clamp building height variation at max speed from ±60 px to ±40 px (the `heightVariation = 60` constant in the building generation code) to reduce surprise drops
- [ ] Allow one mid-air jump (double jump) after hitting an obstacle: set `player.onGround = true` for 8 frames following an obstacle collision so the player can recover
- [ ] Reduce obstacle spawn chance from `Math.random() > 0.4` (60% chance) to `Math.random() > 0.6` (40% chance) at low speed, scaling up to 60% at max speed
- [ ] Add a brief 0.5-second invincibility window after hitting an obstacle to prevent back-to-back hits that kill all momentum instantly
