# Puyo Puyo

## Game Type
Falling-piece puzzle / chain-combo game

## Core Mechanics
- **Goal**: Survive as long as possible by clearing groups of 4+ same-colored connected puyos; build chains for high scores
- **Movement**: Move falling pair left/right; rotate clockwise or counterclockwise; soft-drop or hard-drop
- **Key interactions**: When a group of 4+ same-colored puyos are connected, they pop; remaining puyos fall (gravity), potentially creating chain reactions; game over when a new piece spawns blocked at column 2, row 0

## Controls
- `ArrowLeft` / `ArrowRight` — move pair horizontally
- `ArrowUp` — rotate clockwise
- `Z` / `z` — rotate counterclockwise
- `ArrowDown` — soft drop (40ms interval instead of normal)
- `Space` — hard drop (instantly drop and lock)

## Difficulty Progression

### Structure
Difficulty is purely score-driven (proxy: `pairsDropped`). Every 10 pairs placed, `dropInterval` decreases by 50ms. The game runs continuously until the board fills. There are no levels, waves, or color introductions.

### Key Difficulty Variables
- `dropInterval`: starts at `800` ms, decreases by `50` ms every 10 pairs (`pairsDropped / 10 * 50`), minimum `150` ms
  - Formula: `Math.max(150, 800 - Math.floor(pairsDropped / 10) * 50)`
  - Reaches minimum after `130` pairs dropped: `(800 - 150) / 50 * 10 = 130 pairs`
- `SOFT_DROP_FRAMES`: `Math.max(1, Math.round(40 * 60 / 1000))` ≈ `2–3` frames per row
- `COLS`: `6`, `ROWS`: `12` — board dimensions, constant
- `COLORS`: 4 colors (`'#f44', '#4f4', '#44f', '#ff4'`) — all 4 are available from the very first pair
- Chain scoring multiplier: `chainPower[chain]` array `[0, 0, 8, 16, 32, 64, ...]` — chains of 2+ give exponential score bonus
- Hard drop bonus: `dropped rows * 2` points

### Difficulty Curve Assessment
The game starts at a comfortable `800` ms drop interval but ramps steadily. Because all 4 colors are available from piece 1, the board becomes complex quickly for new players who don't yet understand puyo chaining. The drop speed hits its floor (`150` ms) after only ~130 pieces — roughly 2–3 minutes of play at moderate pace — which is very aggressive. Players who haven't internalized chain setups by that point have little chance of survival.

## Suggested Improvements
- [ ] Start with only 2 colors for the first 20 pairs, then introduce color 3 at pair 20 and color 4 at pair 40 (gate via `Math.min(2 + Math.floor(pairsDropped / 20), COLORS.length)`)
- [ ] Slow the ramp: change the drop interval formula from `800 - floor(pairsDropped/10)*50` to `800 - floor(pairsDropped/20)*30` so the floor of 150ms isn't reached until ~220 pairs
- [ ] Raise the minimum `dropInterval` from `150` to `200` ms — the current floor is punishing even for experienced players
- [ ] Display the current drop speed or a "level" number on screen so players understand the progression
- [ ] Add a brief "READY?" 2-second delay before the first piece spawns, giving players time to see the empty board
