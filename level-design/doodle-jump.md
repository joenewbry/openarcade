# Doodle Jump

## Game Type
Vertical endless platformer

## Core Mechanics
- **Goal**: Jump as high as possible without falling off the bottom of the screen; score equals total height gained
- **Movement**: Automatic upward bounce off platforms; horizontal movement left/right with screen wrapping
- **Key interactions**: Landing on normal platforms (bounce), landing on breakable platforms (one-time break, no bounce), avoiding falling below the camera

## Controls
- ArrowLeft or A — move left (speed 5 px/frame)
- ArrowRight or D — move right (speed 5 px/frame)
- Space or any arrow — start game / bounce to begin

## Difficulty Progression

### Structure
Continuous height-based scaling with no discrete levels. `difficulty = Math.min(maxHeight / 5000, 1)` — it rises from 0 to 1.0 over the first 5000 height units. Platform type probabilities and maximum gap size both scale with this value. The camera scrolls up continuously as the player rises; falling below the visible screen ends the game.

### Key Difficulty Variables
- `difficulty` (computed): `min(maxHeight / 5000, 1)` — caps at 1.0 after 5000 height units
- **Platform count**: `PLAT_COUNT = 8` platforms always maintained on screen (fixed)
- **Minimum vertical gap between platforms**: `MIN_PLAT_GAP_Y = 40` px (fixed)
- **Maximum vertical gap** (scales with difficulty): `MAX_PLAT_GAP_Y = 80 + difficulty * (130 - 80)` — starts at 80 px, reaches 130 px at max difficulty
- **Moving platform probability**: `0.1 + difficulty * 0.2` — starts at 10%, reaches 30% at max difficulty
- **Breakable platform probability**: `0.15 + difficulty * 0.25 - (moving probability)` — effectively increases alongside moving platforms
- `BOUNCE_VEL`: -11 (fixed jump velocity from all platforms)
- `GRAVITY`: 0.4 per frame (fixed)
- `MOVE_SPEED`: 5 (fixed horizontal speed)
- `PLAT_W`: 70 px (fixed platform width)
- Moving platform speed: `1 + random * 1.5` (random per platform, not scaling)
- `MAX_PLAT_GAP_Y_HARD = 130` px (the cap gap at full difficulty)

### Difficulty Curve Assessment
The early game (first ~1000 height) is very forgiving — 8 mostly normal platforms with gaps of 80 px or less and BOUNCE_VEL of -11 covers large distances. Difficulty ramps smoothly to the 5000-height cap. The main pain point is that breakable platforms can cluster unpredictably at moderate difficulty, creating situations where 2–3 consecutive breakable platforms at maximum gap force the player to fall from height — this can happen as early as height 1000 (difficulty 0.2) when the RNG is unlucky.

## Suggested Improvements
- [ ] Add a minimum-height threshold before breakable platforms appear: don't allow `TYPE_BREAKABLE` until `maxHeight >= 1500` (difficulty >= 0.3), giving new players a longer safe learning phase
- [ ] Guarantee that at least every 3rd generated platform is TYPE_NORMAL by tracking consecutive non-normal platforms, preventing unlucky streaks of breakable platforms
- [ ] Slightly increase initial platform density: start with `PLAT_COUNT = 10` platforms and linearly reduce to 8 as `difficulty` reaches 0.5, making the opening easier
- [ ] Reduce `BOUNCE_VEL` to -10 (from -11) to bring jump height in line with the wider gap sizes at higher difficulty — currently the bounce is generous enough to make the early game feel trivial
- [ ] Scale the maximum gap more gradually: `80 + difficulty * 30` instead of `80 + difficulty * 50`, capping at 110 px instead of 130 to reduce the punishment of unlucky wide gaps at max difficulty
- [ ] Add a "danger" visual indicator (platform color shift to red) when the lowest visible platform is close to the camera bottom, giving players warning before they fall out of frame
