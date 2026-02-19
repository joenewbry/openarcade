# Tetris

## Game Type
Classic falling-block puzzle (Tetris)

## Core Mechanics
- **Goal**: Clear as many lines as possible by filling complete horizontal rows; game ends when blocks stack to the top of the board
- **Movement**: Pieces fall automatically; player rotates and slides pieces into place before they lock
- **Key interactions**: Rotate pieces, move left/right, soft drop to accelerate fall, hard drop to instantly place, hold a piece for later use

## Controls
- ArrowLeft / ArrowRight: move piece left or right
- ArrowUp / Z: rotate piece clockwise
- ArrowDown: soft drop (accelerate fall, +1 point per row)
- Space: hard drop (instant placement, +2 points per row fallen)
- C: hold current piece (swap with held piece)

## Difficulty Progression

### Structure
The game uses a standard level system based on lines cleared. `level = Math.floor(lines / 10) + 1` — every 10 lines cleared advances the level by 1. The drop interval decreases linearly: `dropInterval = Math.max(100, 800 - (level - 1) * 70)` ms. At level 1 pieces fall every 800ms; at level 11 they fall every 100ms (the minimum). There is no cap on level number but speed cannot go below 100ms. The 7-bag randomizer is used for piece ordering.

### Key Difficulty Variables
- `COLS`: 10; `ROWS`: 20; `CELL`: 30 pixels
- `dropInterval` at level 1: 800ms; decreases by 70ms per level; floor: 100ms (reached at level 11)
- `level = Math.floor(lines / 10) + 1`
- Score per line clear: `[0, 100, 300, 500, 800][linesCleared] * level`
- Soft drop: +1 point per row; hard drop: +2 points per row
- Ghost piece: shown (displays where piece will land)
- Hold piece: available (C key)
- Piece randomizer: 7-bag (each piece appears exactly once per 7 pieces)

### Difficulty Curve Assessment
The difficulty curve is well-tuned for experienced Tetris players — 800ms at level 1 is comfortable and 70ms per level is a reasonable ramp. For new players who don't know the controls, the lack of any in-game control reference or tutorial means the hold mechanic and hard drop go undiscovered, and the ghost piece (while present) is easy to miss. The speed floor at 100ms (level 11) is effectively unplayable for casual players, but there is no score or line cap that provides a natural stopping point before that.

## Suggested Improvements
- [ ] Add a brief control reference overlay visible on the start screen or as a persistent HUD element — new players routinely miss that `C` holds a piece and `Space` hard drops, which are essential for surviving level 5+
- [ ] Show a "LEVEL UP!" text flash with the current drop interval when the level increases, so players understand why pieces are suddenly falling faster rather than attributing it to random bad luck
- [ ] Slightly reduce the per-level speed step from `70ms` to `55ms` for the first 5 levels (add `const step = level <= 5 ? 55 : 70`) to create a gentler on-ramp; level 5 would then be 525ms instead of 520ms — near identical for veterans but the opening levels feel more playable for beginners
- [ ] Display the "next piece" queue showing 2–3 upcoming pieces (currently only 1 is shown); this is a standard modern Tetris feature that significantly reduces felt randomness
- [ ] Add a running stats display (lines per level, current level, longest combo) so players have intermediate feedback and a goal to beat on subsequent runs
