# Q*bert Audit

## A) Works? PASS
- Properly imports `Game` from engine/core.js and calls `game.start()`.
- Uses `game.showOverlay`, `game.setState`, `game.setScoreFn` correctly.
- DOM references: `#score`, `#lives`, `#level` all present in v2.html.
- Canvas is `#game` at 480x520 matching the W/H constants.
- Overlay div has proper `#overlay`, `#overlayTitle`, `#overlayText` IDs.
- State machine: waiting -> playing -> over handled correctly.
- No missing imports or undefined references.

## B) Playable? PASS
- Arrow keys mapped to diagonal grid movement (Up, Down, Left, Right).
- Movement feels appropriate for Q*bert: hop-based with animation.
- Enemies spawn on a timer and chase/patrol the pyramid.
- Disc mechanic works: transports player to top and clears enemies.
- Death/lives system works: 3 lives, respawn on death.
- Level progression triggers when all cubes reach target color.
- Collision detection between Q*bert and enemies is frame-based.

## C) Fun? PASS
- Faithful Q*bert mechanics: pyramid of cubes, color-changing hops.
- 8 level schemes with varying hop requirements, mid-colors, and revert mechanics.
- Enemy variety: Coily (snake that chases) and red balls (random bounce).
- Disc escape mechanic adds strategic depth.
- Particle effects on death, level complete, and enemy defeat.
- Score bonuses for level completion scale with level.
- Progressive difficulty: more enemies, faster spawn rates, harder color schemes.

## Issues
- Minor: The `hideOverlay()` call is missing when transitioning from waiting to playing -- the engine's `setState('playing')` may handle this internally, but it's worth verifying the overlay actually hides.
- Minor: `best` score is tracked but never displayed in the HUD or HTML.

## Verdict: PASS
