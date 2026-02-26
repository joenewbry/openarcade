# Rally-X Audit

## A) Works? PASS
- Properly imports `Game`, exports `createGame()`, calls `game.start()`.
- DOM refs: `#score`, `#best` present in v2.html.
- Canvas `#game` at 480x480 matches W/H constants.
- Overlay markup correct with all required IDs.
- State machine: waiting -> playing -> over handled correctly.
- `game.setScoreFn()` called.

## B) Playable? PASS
- Arrow keys for steering, Space to drop smoke screen.
- Maze generation with recursive backtracking creates valid mazes.
- Extra passages opened based on level for maze difficulty scaling.
- BFS pathfinding for enemies works with 2000-node search limit.
- Camera follows player with clamping to maze bounds.
- Flag collection with escalating point values.
- Smoke screen mechanic slows enemies on contact.
- Fuel system drains while moving, game over when empty.
- Round-complete bonus with level transition display.

## C) Fun? PASS
- Faithful Rally-X mechanics: maze driving, flag collecting, smoke screens.
- Radar mini-map shows entire maze with flag/enemy/player positions.
- Fuel gauge and smoke counter HUD elements add tension.
- Enemy AI with pathfinding creates genuine chase pressure.
- Smoke screen mechanic provides tactical depth.
- Flag values increase as you collect more in a round.
- Level progression: tighter mazes, more enemies, faster speeds.
- Good visual design: car rotation, flag pennants, exhaust particles.

## Issues
- Minor: Recursive maze generation (`carve`) could cause stack overflow on very large mazes, but at 50x50 this is manageable.
- Minor: `level` variable used in `generateMaze()` but `level` is initialized in `setupLevel()` which is called from `onInit` -- the ordering is correct since `level = 1` is set before `setupLevel()`.

## Verdict: PASS
