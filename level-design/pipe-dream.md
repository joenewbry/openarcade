# Pipe Dream

## Game Type
Real-time puzzle / pipe-laying race against the clock

## Core Mechanics
- **Goal**: Lay pipe segments from the flow source to extend the path as far as possible before the flow reaches an empty cell. The longer the connected path when flow runs out, the higher the score.
- **Movement**: Arrow keys move the cursor around the 7×10 grid. Space (or click) places the pipe tile from the top of the queue into the selected cell.
- **Key interactions**: A countdown of 15 seconds ticks before flow begins. Flow travels through connected pipes at a speed that starts at 1200ms per cell and decreases by 35ms for every pipe it traverses (minimum 350ms). Replacing an already-placed but not-yet-filled pipe costs 2 countdown seconds. A queue of 5 upcoming pipe tiles is visible; tiles are drawn from a weighted random pool.

## Controls
- Arrow Keys: move cursor
- Space: place pipe from queue into cursor cell
- Mouse Click: place pipe from queue into clicked cell

## Difficulty Progression

### Structure
The game runs as a single continuous session on a fixed 7×10 grid. There are no discrete levels or waves. Difficulty emerges naturally from the ever-increasing flow speed — the further along the path the flow travels, the faster it moves, compressing the time available to place the next tile.

### Key Difficulty Variables
- `COLS`: `7`, `ROWS`: `10`, `CELL`: `50` px
- `COUNTDOWN_SEC`: `15` seconds before flow starts
- `SPEED_START`: `1200` ms per pipe (flow speed at the beginning)
- `SPEED_MIN`: `350` ms per pipe (minimum flow speed — hard floor)
- `SPEED_STEP`: `35` ms — flow accelerates by this amount for each pipe the flow traverses
- `QUEUE_LEN`: `5` upcoming tiles visible in the queue
- Pipe weights: straight pipes `[3, 3]`, elbow pipes `[2, 2, 2, 2]`, cross pipe `[1]` — cross pieces are rare
- Replacing an unfilled pipe: costs `2` seconds from the countdown timer

### Difficulty Curve Assessment
The 15-second pre-flow countdown is generous and lets players build a reasonable head start, but the 35ms-per-pipe acceleration means that by the time 20+ pipes have been traversed, each cell only lasts about 500ms — barely enough to select and place a tile. The cross piece weight of 1 (half that of elbows, one-third of straights) makes it rare but powerful. The 2-second replacement penalty is steep early in the countdown when seconds are valuable; later when flow is already running, the penalty is irrelevant and players freely overwrite. The fixed 7×10 grid with a random source position means some starting locations leave very little room to extend in any direction.

## Suggested Improvements
- [ ] Increase `COUNTDOWN_SEC` from `15` to `20` so new players have time to build a meaningful head start before flow begins
- [ ] Reduce `SPEED_STEP` from `35` ms to `25` ms so the flow acceleration is more gradual and the game remains manageable past the 15-pipe mark
- [ ] Place the flow source at least 2 cells from any wall to avoid degenerate starting positions where the path is immediately cornered
- [ ] Reduce the replacement penalty from `2` countdown seconds to `1` second — the current penalty is doubly punishing because it both costs time and wastes the placed tile
- [ ] Increase the cross pipe weight from `1` to `2` (matching elbows) so the high-value cross tile appears more often and rewards players who can route through it
- [ ] Display a distance-to-minimum-speed indicator (e.g. "Flow: 850ms") so players can see how much runway they have before the pace becomes critical
