# Galaxian

## Game Type
Fixed-screen vertical shooter

## Core Mechanics
- **Goal**: Destroy all aliens in each wave to advance; survive 3 lives; earn double points by shooting aliens during their dive attack
- **Movement**: Move player ship left/right at bottom; fire single shots upward
- **Key interactions**: Alien formation swings side-to-side; "flagship" aliens lead escort dives; formation aliens periodically shoot straight down; player has only one bullet on screen at a time

## Controls
- `ArrowLeft`: Move left (`PLAYER_SPEED = 4`)
- `ArrowRight`: Move right
- `Space`: Fire (one bullet at a time; `BULLET_SPEED = 8`)

## Difficulty Progression

### Structure
Waves increment when all aliens are destroyed. Formation speed, dive frequency, and bullet speed all increase with each wave. There is no cap.

### Key Difficulty Variables
- `wave`: starts at 1, increments in `nextWave()` on full formation clear
- `formSpeed`: `0.4 + wave * 0.08` — starts at 0.48 pixels/frame (wave 1), reaches 1.2 at wave 10
- `diveInterval`: `Math.max(40, 120 - wave * 8)` frames between dives — starts at 112 frames (~1.87s), hits floor of 40 frames (~0.67s) at wave 10
- Alien formation bullet speed: `3 + wave * 0.2` pixels/frame — starts at 3.2 (wave 1)
- Formation shoots every `50` ticks (fixed; ~0.83s per shot opportunity)
- Dive speed: `2.5 + wave * 0.15` — starts at 2.65 pixels/frame (wave 1)
- Dive shot chance per frame: `0.015` (fixed, not scaled)
- One player bullet on screen at a time (strict limit)

### Difficulty Curve Assessment
Wave 1 is fairly accessible — 52 total aliens (4 flagships + 8 commanders + 20 escorts + 20 drones), reasonable formation speed, and predictable dive timing. However, one-bullet-at-a-time makes it very difficult to clear the last few hard-to-hit aliens when they're moving fast. By wave 5–6, the dive interval drops to 72 frames (~1.2 seconds) and formation speed hits 0.8, making the game noticeably more chaotic. The flagship dive mechanic (bringing escorts) is interesting but can feel unfair when two or three escorts fire simultaneously during the swoop.

## Suggested Improvements
- [ ] Increase starting `formSpeed` from `0.4 + wave * 0.08` to... no, the base value is fine. Instead, reduce the per-wave increment from `0.08` to `0.05` so wave 10 reaches `0.9` instead of `1.2` — the current rate makes the formation feel chaotic by wave 8
- [ ] Allow 2 bullets on screen at once instead of the strict 1-bullet limit (`bullet = null` after each shot); the single-bullet constraint makes clearing the last stragglers very tedious
- [ ] Reduce the dive interval decay from `wave * 8` to `wave * 5` so the floor (40 frames) isn't reached until wave 16 instead of wave 10 — wave 10 with dives every 40 frames (0.67s) is extremely frantic
- [ ] Add a 1-second "safe start" delay at the beginning of each wave where aliens enter formation but do not dive or shoot, letting the player orient before combat begins
- [ ] Scale formation bullet speed more gently: change from `3 + wave * 0.2` to `3 + wave * 0.1` — by wave 10 the bullets are moving at 5px/frame which is hard to dodge given the player's 4px/frame speed
- [ ] Consider giving the player a brief shield pickup every 5 waves to reward survival milestones and give a moment of relief in long runs
