# Jetpack Joyride

## Game Type
Endless side-scrolling runner with jetpack flight

## Core Mechanics
- **Goal**: Travel as far as possible while collecting coins and avoiding obstacles
- **Movement**: Hold to fire jetpack and rise; release to fall under gravity; momentum carries between inputs
- **Key interactions**: Threading gaps between obstacles (Zappers, Missiles, Lasers), collecting coins, surviving as long as possible

## Controls
- **Space** (hold) or **Mouse click** (hold): Fire jetpack upward
- Release to fall under gravity

## Difficulty Progression

### Structure
Difficulty scales continuously with `frameCount` (frames elapsed since run start). There are no discrete levels or waves. Scroll speed increases from `3` to a maximum of `6` px/frame, and obstacle spawn intervals decrease from `150` to a minimum of `60` frames. Obstacles spawn from a pool of 3 types (Zapper, Missile, Laser) with no type weighting change over time.

### Key Difficulty Variables
- `GRAVITY`: `0.4` px/frame² — constant
- `THRUST`: `-0.65` px/frame² (upward acceleration while holding) — constant
- `MAX_VY`: `7` px/frame — terminal velocity cap (both up and down)
- `scrollSpeed`: starts at `3`, scales to max `6`: formula `3 + Math.min(frameCount / 3000, 3)` — reaches max at `frameCount = 9000` (≈150 seconds at 60fps)
- Obstacle spawn cooldown: `Math.max(60, 150 - frameCount / 30)` — starts at `150` frames (2.5 sec), reaches minimum `60` frames (1.0 sec) at `frameCount = 2700` (≈45 seconds)
- **Zapper**: Rotating electric bar — hitbox is its length; no warning
- **Missile**: Warned by on-screen "!" marker before launch; travels horizontally at fixed speed
- **Laser**: Full screen-height beam; warned by "charging" animation before firing
- Score: `1` pt per `50` distance units traveled + `5` pts per coin collected

### Difficulty Curve Assessment
The obstacle cooldown reaches its minimum in just 45 seconds of play, meaning the game is already at maximum spawn density less than a minute in. Combined with scroll speed still increasing toward its max at 150 seconds, the first minute features rapidly compressing difficulty that most new players cannot survive. Zappers have no warning — they simply appear at the right edge — making first encounters feel cheap. The 3-type obstacle pool introduces Lasers (the hardest obstacle type) immediately from the start rather than after a warm-up period. Coins also offer negligible score contribution (`5` pts each) relative to distance (`1` pt per 50 units), so the upgrade/scoring loop has little impact on gameplay.

## Suggested Improvements
- [ ] Add a 5-second obstacle-free startup period (`frameCount < 300`) before the first obstacle can spawn — currently an obstacle can appear in the first 2.5 seconds, before a new player has had a chance to feel the jetpack controls
- [ ] Restrict obstacle types for the first 30 seconds: only spawn Zappers (`frameCount < 1800`), then add Missiles (`frameCount < 3600`), then introduce Lasers — this gives players time to learn each hazard type before the next is introduced
- [ ] Slow the obstacle cooldown reduction rate so minimum density is reached at `frameCount = 5400` (90 seconds) instead of 2700: change formula to `Math.max(60, 150 - frameCount / 60)` — this gives players a more gradual ramp
- [ ] Reduce `GRAVITY` from `0.4` to `0.34` and `THRUST` from `-0.65` to `-0.58` to slow the vertical response slightly and give players more reaction time to navigate gaps; the current response is snappy but punishing in tight corridor gaps
- [ ] Add a brief Zapper approach warning (e.g., a flashing glow visible 0.5 seconds before the Zapper enters the screen) to match the warning system used by Missiles and Lasers — Zappers are the only unwarned obstacle type
- [ ] Make coins worth `15` pts each (up from `5`) so collecting them meaningfully contributes to score and gives players a secondary engagement loop beyond pure survival
