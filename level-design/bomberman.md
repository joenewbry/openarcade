# Bomberman

## Game Type
Arcade maze / action puzzle

## Core Mechanics
- **Goal**: Clear all enemies on each level by placing bombs, then advance to the next level; avoid being caught in explosions or touched by enemies
- **Movement**: 4-directional grid-aligned movement with pixel-level snap; movement speed is continuous
- **Key interactions**: Placing bombs (Space) which explode after 120 frames with blast range up to `bombRange` tiles in 4 directions; collecting power-ups (bomb count, range, speed); surviving enemy contact

## Controls
- ArrowLeft / ArrowRight / ArrowUp / ArrowDown: move
- Space: place bomb / start game / restart

## Difficulty Progression

### Structure
Levels advance when all enemies are cleared. Each new level calls `setupLevel()` which rebuilds the grid, increases enemy count, and restores the player's position to (1,1). There is no level cap — levels continue indefinitely. Lives start at 3; losing all lives triggers game over.

### Key Difficulty Variables
- `level`: starts at 1, increments on each level clear
- `enemyCount`: `Math.min(3 + level, 8)` — level 1: 4 enemies, level 5: 8 enemies (cap)
- **Enemy base speed**: `0.8 + Math.random() * 0.4 + level * 0.1`, capped at 2.5 — at level 1 enemies move 0.8–1.2 px/frame; at level 5 they move 1.2–1.7 px/frame
- **Enemy type**: enemies at indices 0–1 become `'fast'` type (red color) when `level >= 3`
- **Soft block density**: `0.4 + level * 0.02` — level 1: 40% of empty cells are soft blocks; level 5: 48%
- `player.speed`: starts at `2.0 + (level > 3 ? 0.3 : 0)` — jumps to 2.3 at level 4 (a small one-time bump)
- `player.maxBombs`: starts at 1
- `player.bombRange`: starts at 2 tiles
- **Bomb timer**: 120 frames — fixed, never changes
- **Invincibility after hit**: 120 frames
- **Enemy min distance from player spawn**: 5 Manhattan tiles

### Difficulty Curve Assessment
Level 1 starts immediately challenging: 4 enemies spawn at least 5 tiles away, but with only 1 bomb and range 2, clearing a path is slow and the player starts boxed in at (1,1) with a 40% soft-block density. New players will repeatedly die before understanding bomb timing. The jump to 8 enemies at level 5 is steep but the soft-block density increase is modest.

## Suggested Improvements
- [ ] Reduce the level 1 soft-block density from 0.4 to 0.25 so the player has more open space to maneuver before collecting speed power-ups
- [ ] Start `player.bombRange` at 3 (not 2) on level 1 — range 2 barely clears one tile past a soft block, making it hard to hit the initially-distant enemies
- [ ] Increase the minimum enemy spawn distance from 5 to 8 Manhattan tiles on levels 1–2, giving the player more reaction time
- [ ] Reduce the level 1 enemy count from `3 + level = 4` to `1 + level = 2` by changing the formula to `Math.min(1 + level, 8)` — 4 enemies is too many for a new player with 1 bomb
- [ ] Increase bomb timer from 120 frames to 150 frames on levels 1–2, giving beginners more time to escape their own blasts
- [ ] Add a per-level score bonus display (e.g. "Level 2 cleared! +200 pts") to communicate progression clearly
