# Tron

## Game Type
Competitive light-cycle arena — avoid walls and trails

## Core Mechanics
- **Goal**: Outlast the AI by forcing it to crash into a trail or wall while keeping your own cycle alive. Win enough rounds to maximize your score.
- **Movement**: Cycles advance one grid cell every `TICK_INTERVAL = 5` frames (~83 ms at 60 fps). Each cell trails a wall behind it. Direction changes are queued and applied each tick.
- **Key interactions**: Steer to cut off the AI, claim territory, and survive longer.

## Controls
- Arrow keys: change direction (Up / Down / Left / Right)
- Cannot reverse directly (opposite direction is blocked)
- Any arrow key starts the game from the waiting state
- Space or any arrow key restarts after Game Over

## Difficulty Progression

### Structure
The game is round-based. Each time the player wins a round (AI crashes), `roundDelay = 15` ticks pass, the grid resets, and a new round begins. The game ends permanently only when the player crashes. There is no win screen — the player accumulates score indefinitely.

Score per won round: `10 + Math.floor(player.trail.length / 2)` — longer survival yields more points.

### Key Difficulty Variables
- `TICK_INTERVAL`: `5` frames (constant — speed never changes)
- `CELL`: `10` pixels (grid resolution, constant)
- Grid size: `50 x 50` cells (500x500 canvas)
- AI open-space search depth: `countOpen(nx, ny, maxCount = 80)` — BFS up to 80 cells
- AI aggressive bonus toward player: `+3` score added when moving toward player
- AI initial position: `(37, 25)` facing LEFT; Player: `(12, 25)` facing RIGHT — they start heading directly at each other

### Difficulty Curve Assessment
The AI is competent from frame 1 — it uses space-flood BFS plus an aggressive pursuit bonus and starts directly opposing the player. Because `TICK_INTERVAL` never decreases and the grid never shrinks, the only increasing difficulty comes from the progressively filled grid as rounds go on (shorter survival windows). However, round resets clear the grid entirely, so there is no long-term escalation. The game feels the same on round 1 and round 20, with difficulty entirely flat after the initial learning phase.

## Suggested Improvements
- [ ] Reduce `TICK_INTERVAL` from `5` frames to `4` frames after 3 wins, then to `3` frames after 7 wins, making speed feel like a real escalating threat.
- [ ] Remove the aggressive pursuit bonus (`dot > 0 ? 3 : 0`) for the first 2 rounds so the AI plays defensively early, giving new players time to learn trail-avoidance before being hunted.
- [ ] Add a brief (90-frame) "ready" countdown at the start of each round rather than spawning immediately facing each other, reducing cheap early crashes.
- [ ] Give the player a slight starting advantage on round 1 by offsetting starting positions so the player is at `(10, 25)` and the AI at `(40, 25)`, creating more initial room to maneuver before trails cross.
- [ ] Show the round number and win streak prominently on screen so players have a visible goal to pursue rather than just watching the score increment.
