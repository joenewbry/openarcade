# Spy Hunter — Level Design Notes

## Game Type
Vertical-scrolling vehicular shooter (arcade, single-player).

## Core Mechanics
- **Goal**: Survive as long as possible, accumulate points by destroying enemy vehicles without hitting civilians.
- **Movement**: Player car scrolls up a road that narrows at bridges, passing on/off ramps.
- **Combat**: Fire forward bullets to destroy enemies. Enemy types have varying HP, speed, and behaviors.
- **Powerups**: Spawn every 400 frames — weapons truck delivers upgrades (oil slick, smoke, missiles).
- **Key interactions**: Avoid enemy ramming, dodge enemy bullets, don't shoot civilian cars (−200 points each).

## Controls
- **Arrow Up / W**: Accelerate (increase `scrollSpeed`)
- **Arrow Down / S**: Brake
- **Arrow Left / A**: Steer left
- **Arrow Right / D**: Steer right
- **Space**: Fire bullets
- **Q**: Drop oil slick (if equipped)
- **E**: Deploy smoke screen (if equipped)

## Difficulty Progression

### Structure
Continuous single-session survival run. Difficulty ramps linearly from frame 0 to frame 7200 (2 minutes at 60fps), then holds at maximum. No discrete levels or checkpoints.

### Key Difficulty Variables
| Variable | Value | Effect |
|---|---|---|
| `baseScrollSpeed` | 3 | Starting road scroll speed |
| Max `scrollSpeed` | 6 | Scroll speed ceiling (reached at frame 7200) |
| `difficulty` formula | `Math.min(frameCount / 7200, 1)` | 0→1 linear ramp over 2 minutes |
| `spawnRate` | `Math.max(40, 100 - difficulty * 60)` | Enemy spawn interval: 100→40 frames |
| roadLord HP/speed | 2 / 0.6 | Tanky, slow enemy; 100 pts |
| switchblade HP/speed | 1 / 0.8 | Fast fragile enemy; 150 pts |
| enforcer HP/speed | 1 / 0.7 | Shoots bullets every 80 frames; 200 pts |
| Enforcer unlock threshold | `difficulty >= 0.3` | Enforcers appear after ~21 seconds |
| `powerupTimer` spawn | every 400 frames | ~6.7 seconds between weapons trucks |
| Civilian penalty | −200 points | Per civilian vehicle hit |

### Difficulty Curve Assessment
- **Ramp-up is reasonable but abrupt at the end**: The linear `frameCount / 7200` ramp is smooth, but at frame 7200 (~2 minutes) the game locks at max difficulty indefinitely with no further challenge variation — it plateaus rather than escalating.
- **Spawn rate halves too fast**: `spawnRate` drops from 100 to 40 frames over 2 minutes, meaning the road fills with enemies 2.5× faster. At max difficulty, the player faces a new enemy every ~0.67 seconds on top of each other.
- **Enforcer unlock at difficulty 0.3 (~21s) is very early**: A bullet-shooting enemy appearing at 21 seconds is punishing for new players who are still learning to steer.
- **No lives or respawn buffer**: Death ends the session immediately with no checkpoint — losing early to an enforcer bullet at 25 seconds is particularly frustrating.
- **Powerup rate is fixed regardless of difficulty**: The 400-frame powerup spawn doesn't scale with difficulty, so at max difficulty the player needs powerups more but receives them at the same rate.

## Suggested Improvements

1. **Delay enforcer unlock** — Change the enforcer threshold from `difficulty >= 0.3` to `difficulty >= 0.5` (approximately 60 seconds into a run). This gives players a full minute to learn movement and shooting before hitscan enemies appear. Also increase enforcer fire interval from 80 to 120 frames initially.

2. **Extend the ramp window** — Change `frameCount / 7200` to `frameCount / 14400` (4 minutes). This stretches the learning curve so the road doesn't feel overwhelming within the first 90 seconds. Keep max `scrollSpeed = 6` and min `spawnRate = 40` as the ceiling.

3. **Add a buffer spawn rate floor early** — For the first 1800 frames (30 seconds), clamp `spawnRate` to a minimum of 80 regardless of the difficulty formula. This gives a clear "beginner window" at the start of every run.

4. **Add lives (1 starting life + 1 extra at 5000 points)** — Introduce `lives = 1` with an extra life awarded at score threshold 5000. A single continue prevents the brutal one-shot session-end for new players without undermining challenge for veterans.

5. **Scale powerup spawn with difficulty** — Change `powerupTimer` spawn interval from fixed 400 to `Math.max(200, 400 - difficulty * 200)`. At max difficulty, powerups arrive every ~3.3 seconds (200 frames) instead of 6.7 seconds, making high-difficulty play feel rewarding rather than just punishing.

6. **Add a score multiplier for civilian avoidance** — Instead of only a −200 penalty, add a combo multiplier (`civilianSafeStreak`) that increases points by 10% for every 10 seconds without hitting a civilian. This rewards skilled play and makes the civilian mechanic feel like an opportunity rather than just a trap.
