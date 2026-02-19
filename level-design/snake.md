# Snake

## Game Type
Arcade — single-player grid-based snake

## Core Mechanics
- **Goal**: Eat food to grow the snake as long as possible without dying
- **Movement**: Snake moves continuously in a grid direction; player changes direction with arrow keys
- **Key interactions**: Eating food increases score and length; hitting a wall or self causes game over

## Controls
- `ArrowUp` — move up
- `ArrowDown` — move down
- `ArrowLeft` — move left
- `ArrowRight` — move right
- Any arrow key on game-over screen — restart

## Difficulty Progression

### Structure
The game has no discrete levels. Difficulty increases continuously as the player's score rises. Each food eaten raises the score by 1 and reduces the movement interval, making the snake move faster. The game starts in a waiting state and begins on the first arrow keypress.

### Key Difficulty Variables
- `BASE_INTERVAL`: starts at `100` ms (converted to ~6 frames at 60fps)
- `MIN_INTERVAL`: floor of `60` ms (~4 frames), which the speed can never drop below
- `interval`: recomputed each time food is eaten as `Math.max(MIN_INTERVAL, BASE_INTERVAL - score * 3)`
  - At score 0: interval = 100 ms
  - At score 5: interval = 85 ms
  - At score 10: interval = 70 ms
  - At score 13+: interval hits floor at 60 ms and stays there
- Grid is 20x20 cells on a 400x400 canvas (`CELL = 20`, `COLS = ROWS = 20`)
- Snake starts at length 1 in the center, moving right

### Difficulty Curve Assessment
The snake reaches maximum speed (60 ms interval) after only 13 food items, which on a 20x20 grid is still a relatively short snake — meaning the game hits its speed ceiling very quickly and then stays there for the rest of the run. The opening speed of 100 ms is reasonable but the ramp of 3 ms per food is steep.

## Suggested Improvements
- [ ] Reduce the speed increment from `score * 3` to `score * 1.5` so the speed ceiling is reached around score 25–27 instead of score 13, giving players more time to build skill
- [ ] Raise `MIN_INTERVAL` from `60` to `75` ms — the current max speed is extremely fast and causes unavoidable deaths in tight corridors
- [ ] Add a brief grace period of ~2 seconds at the start before the snake begins moving, so players can orient themselves before the game activates
- [ ] Consider starting `BASE_INTERVAL` at `120` ms to give absolute beginners a more forgiving opening pace
- [ ] Add a visual speed indicator (e.g., color shift on the snake or border) so players can sense how fast they are getting before they are overwhelmed
