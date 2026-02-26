# Rampart Audit

## A) Works? PASS
- Properly imports `Game`, exports `createGame()`, calls `game.start()`.
- DOM refs: `#score`, `#best` present in v2.html.
- Canvas `#game` at 500x500 matches W/H constants.
- Overlay markup correct with all required IDs.
- State machine: waiting -> playing -> over handled correctly.
- `game.setScoreFn()` called.

## B) Playable? PASS
- Three-phase gameplay: Build -> Battle -> Repair, each timed.
- Build/Repair: Arrow keys move piece, Z rotates, Space places tetromino-like wall pieces.
- Battle: Arrow keys move crosshair, Space fires cannon at targeted location.
- 10 different wall piece shapes (tetromino-style).
- Cannon placement is automatic: assigned to enclosed castles.
- Enclosure detection via flood fill from edges -- correct algorithm.
- Ships approach from water side, fire projectiles that destroy walls.
- Ship HP increases with wave number.
- Game over when no castles are enclosed after repair phase.
- Hold-to-repeat movement implemented for both build and battle phases.

## C) Fun? PASS
- Faithful Rampart mechanics: build walls, defend castles, repair damage.
- Three distinct phase gameplay creates satisfying loop.
- Tetromino-style wall pieces add puzzle element to building.
- Next piece preview shown during build/repair.
- Crosshair targeting with cannon cooldown during battle.
- Enemy ships with bobbing animation and aimed projectiles.
- Visual explosion effects with color-coded damage.
- Phase timer with flashing warning creates urgency.
- Controls hints at bottom of screen aid discoverability.
- Wave progression increases ship count and fire rate.

## Issues
- Minor: The `bestEl` reference is used for storing best score, but `bestEl.textContent` is updated without checking if `bestEl` exists first (though it's defined in the HTML so this should be fine).
- Minor: Piece 7 in WALL_PIECES has a duplicate `[1,0]` entry that gets replaced on line 36 -- works but is messy code.

## Verdict: PASS
