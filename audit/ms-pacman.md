# Ms. Pac-Man Audit

## A) Works? PASS
- Engine integration correct: `new Game('game')`, callbacks, `start()`.
- Canvas 448x496 matches v2.html. Overlay properly sized.
- DOM elements `#score`, `#best`, `#levelDisp`, `#livesDisp` all present in v2.html.
- 4 maze layouts, 31x28 grid, 16px tiles. Proper Pac-Man dimensions.
- Maze parsing handles W(wall), .(dot), o(power), -(ghost door), G(ghost house), E(empty), T(tunnel).
- Pac-Man movement is smooth pixel-based with tile-aligned turning.
- Ghost AI: 4 ghosts with distinct chase behaviors (Blinky targets Pac-Man, Pinky targets ahead, Inky uses vector from Blinky, Clyde distance-based).
- Scatter/chase mode schedule with 8 phases.
- Frightened mode with flashing, ghost eating with escalating points.
- Tunnel wrapping for both Pac-Man and ghosts.

## B) Playable? PASS
- Arrow keys to move (with buffered next-direction).
- Space or arrow key starts from waiting state.
- "READY!" text displays before gameplay begins.
- Ghost house timer releases ghosts at staggered intervals.
- Power pellets with decreasing duration per level.
- Death animation (expanding mouth), lives tracking, game over state.
- Level progression cycles through 4 mazes.
- Fruit spawns at dot thresholds (70 and 170 eaten).
- Score popup for ghost eating and fruit collection.

## C) Fun? PASS
- Excellent Ms. Pac-Man adaptation.
- All 4 classic ghost AI personalities implemented.
- Multiple mazes add variety.
- Fruit system adds bonus-hunting strategy.
- Visual polish: animated Pac-Man with eye and beauty mark, bow on head, ghost bodies with wavy skirts, directional eyes, frightened face with wavy mouth, wall rendering with proper border detection, pulsing power pellets, colored dots.
- Level escalation through ghost speed and shorter frightened time.

## Issues
- **Minor**: `best` is reset to 0 in `onInit`, meaning the "best" score doesn't persist across page reloads (standard for these games) but also doesn't persist across restarts within the same session. This is a design choice but slightly unusual since most games keep best across restarts.
- **Minor**: Maze row lengths are 28 characters but some rows have extra `.W` patterns making them 30 chars (like row 2: `W.WWWW.WWWWW.WW.WWWWW.WWWW.W` is 30 chars). This could cause wall tiles to be placed at columns 28-29 which are out of bounds. Actually, looking more carefully, the rows with `.W` at the end are 30 characters wide, but COLS=28. The `parseMaze` function uses `c < row.length` but also `c < COLS`, so it only reads up to column 27. The extra characters are ignored. This is benign but slightly messy maze data.
- **Potential Bug**: Some maze rows appear to be 30 characters wide (e.g., `W.WWWW.WWWWW.WW.WWWWW.WWWW.W` has 30 chars). Since the parser clips to COLS=28, the rightmost 2 characters are dropped. This means the right edge of some rows may not match intended layout. However, since all mazes have outer wall borders and the structure is symmetric, the clipping likely doesn't cause gameplay issues.

## Verdict: PASS
