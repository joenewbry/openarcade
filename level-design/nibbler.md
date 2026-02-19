# Nibbler

## Game Type
Arcade snake / maze

## Core Mechanics
- **Goal**: Navigate the snake through a maze, eating all food pellets before time runs out. Clearing all food in a level advances to the next level. Running out of time or hitting a wall/self costs a life.
- **Movement**: Grid-based snake movement; direction input is queued and applies on the next move tick. The snake grows by one cell each time it eats food.
- **Key interactions**: Eat all food to complete the level; avoid walls (including maze interior walls) and the snake's own body; survive the countdown timer.

## Controls
- **Arrow Keys**: Set snake direction (queued input)
- **Arrow Keys / Space**: Start game or restart after game over

## Difficulty Progression

### Structure
8 pre-designed maze patterns that cycle (`level % 8`). Each level has a time limit and a move speed. Lives carry over (start with 3). Clearing all food completes the level and awards a time bonus; dying resets the snake at the center of the current maze with lives decremented.

### Key Difficulty Variables
- `level`: starts at 1, increments with each level clear
- **Move speed** (`getSpeed(level)`): `max(80, 160 - (level-1) * 10)` ms per move
  - Level 1: 150ms; Level 5: 120ms; Level 9: 80ms (minimum — 9+ all identical speed)
  - Converts to frames: `msToFrames(speed)` = roughly `round(speed * 60 / 1000)`
  - Level 1: ~9 frames/move; Level 9+: ~5 frames/move
- **Time limit** (`getTimeForLevel(level)`): `max(30, 60 - (level-1) * 4)` seconds
  - Level 1: 60s; Level 4: 48s; Level 9: 28s; Level 8+: 30s (minimum)
- **Food count** (`getFoodCount(level)`): `8 + min(level*2, 16)` pellets
  - Level 1: 10 pellets; Level 5: 18 pellets; Level 9+: 24 pellets (cap)
- **Time bonus on completion**: `timeLeft * level * 2` points
- **Points per food**: `10 * level` — level 1: 10pts, level 9: 90pts
- **Maze complexity**: 8 patterns from simple cross corridors (L1) to tight winding maze (L8); repeats after L8

### Difficulty Curve Assessment
The difficulty jumps sharply between levels 1 and 9, especially in the maze complexity axis (the spiral at level 4 and dense maze at level 5 are dramatically harder than the simple cross at level 1). The time limit shrinks while food count grows, meaning you must eat more pellets faster in a more complex maze — a triple threat. Level 1 starts reasonably (10 pellets, 60 seconds, 150ms speed), but by level 4 the spiral maze requires very precise navigation with a ticking clock and a faster snake. The tight winding maze (level 8) with 24 pellets and 30 seconds is extremely punishing.

## Suggested Improvements
- [ ] Slow down level 1 move speed from 150ms to 180ms (change `160` to `180` in `getSpeed`) to give new players more reaction time
- [ ] Increase the base time from `60` to `75` seconds at level 1 in `getTimeForLevel` so players have more breathing room to learn the first maze
- [ ] Reduce food count growth from `level * 2` to `level * 1.5` so level 5 has 15 pellets instead of 18 — slightly reducing the sprint pressure in mid-game
- [ ] Insert an intermediate maze difficulty between levels 2 and 4: the jump from "simple rooms with doorways" (L2) to "zigzag corridors" (L3) to "spiral" (L4) is too steep; consider reordering so the spiral is level 5 or 6
- [ ] Give the player an additional life every 3 levels cleared (e.g., at level 3, 6, 9) as a catch-up mechanic for difficult maze transitions
- [ ] Add a 3-second "READY" countdown before each level starts (already shown as `game.showOverlay` but the game immediately begins on overlay dismiss); the snake should not move until the player presses a key
