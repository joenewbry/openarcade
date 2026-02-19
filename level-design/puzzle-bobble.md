# Puzzle Bobble

## Game Type
Bubble-shooting puzzle / aim-and-match arcade game

## Core Mechanics
- **Goal**: Clear all bubbles from the board before they push down past the danger line; advance through levels
- **Movement**: Rotate the shooter left or right to aim; fire upward at the bubble cluster
- **Key interactions**: Fired bubble travels in a straight line, bouncing off side walls; when 3+ same-colored bubbles connect, they pop and any bubbles hanging below them also drop; a row of bubbles is pushed down on a timer; game over if any bubble crosses the danger line

## Controls
- `ArrowLeft` — rotate aim left
- `ArrowRight` — rotate aim right
- `Space` — fire bubble

## Difficulty Progression

### Structure
The game advances through numbered levels (1, 2, 3, …). Each new level generates a fresh bubble grid. The number of starting rows and available colors both increase with level, and the push timer (automatic downward row advance) becomes shorter each level. There are no waves within a level — clearing the board immediately starts the next level.

### Key Difficulty Variables
- `BUBBLE_R`: `15` px — bubble radius; constant
- `COLS`: `12` — columns of bubbles; constant
- `SHOOT_SPEED`: `11` px/frame — projectile speed; constant
- `AIM_SPEED`: `0.028` rad/frame — rotation speed for aiming; constant
- `numRows`: `3 + Math.min(level, 5)` — starting rows; grows from 4 (level 1) to 8 (level 5+), then stays at 8
- `numColors`: `Math.min(2 + level, COLORS.length)` — distinct colors on the board; 3 at level 1, rising to the total palette size over subsequent levels
- `pushFrames` (push timer): `Math.max(PUSH_FRAMES_MIN, PUSH_FRAMES_START - (level - 1) * 80)`
  - `PUSH_FRAMES_START`: `1100` frames (~18 s at 60 fps)
  - `PUSH_FRAMES_MIN`: `400` frames (~6.7 s at 60 fps)
  - Reduces by `80` frames per level; hits the floor after level `(1100 - 400) / 80 + 1 = ~10`

### Difficulty Curve Assessment
Level 1 introduces 3 colors across 4 rows and an 18-second push timer, which is a manageable entry point. However, by level 4 the color count is already at its upper range and the push timer has fallen to ~900 frames (~15 s), forcing quick decisions. Players who have not learned to chain-pop hanging clusters find the board filling rapidly. Once `pushFrames` hits its floor at level 10, the only remaining challenge is the increasing starting row count, which is already maxed at 8 by level 5 — meaning difficulty effectively plateaus even though the game continues.

## Suggested Improvements
- [ ] Slow the color introduction: change `numColors = Math.min(2 + level, COLORS.length)` to `Math.min(2 + Math.floor(level / 2), COLORS.length)` so a new color appears every 2 levels instead of every level
- [ ] Widen the push-timer range: raise `PUSH_FRAMES_START` from `1100` to `1400` and reduce the per-level decrement from `80` to `50`, so the floor is reached around level 21 instead of level 10
- [ ] Raise `PUSH_FRAMES_MIN` from `400` to `600` frames (~10 s) — the current 6.7-second floor is punishing for a bubble-aiming game that requires deliberate planning
- [ ] Cap `numRows` growth more gradually: `3 + Math.min(Math.floor(level / 2), 5)` so the board fills in over 10 levels rather than 5
- [ ] Add a "next bubble" preview indicator so players can plan two shots ahead; this significantly reduces frustration from surprise color mismatches
- [ ] Display the current push countdown visually (e.g., a shrinking bar) so players know when the next row advance is coming
