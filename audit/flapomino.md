# Flapomino -- Audit

## Files
- `/Users/joe/dev/openarcade/flapomino/game.js` (274 lines)
- `/Users/joe/dev/openarcade/flapomino/v2.html` (81 lines)

## A) Works?

**PASS**

Engine integration:
- `new Game('game')` with `onInit`, `onUpdate`, `onDraw`
- States: `'waiting'` -> `'playing'` -> `'over'`
- `showOverlay` used correctly
- `setScoreFn` registered
- `game.start()` called

DOM structure:
- `canvas#game` 320x480
- Standard overlay elements
- `#score`, `#stackHeight` present

Note: The overlay in v2.html is missing the `background` style that other games have. Line 53: `.overlay` has no `background: rgba(...)`. This means the overlay text may render directly on top of the game with no backdrop, making it harder to read.

Simple and clean codebase at 274 lines. The hybrid Flappy Bird + Tetris concept is creative.

## B) Playable?

**PASS**

Controls:
- **Space** or **ArrowUp**: Flap (both in waiting-to-start and during play)
- Space also restarts from game over

Game mechanics:
- Bird flies right-to-left through Tetromino-shaped obstacles
- Obstacles are 3 columns wide with varied top/bottom wall heights
- When obstacles scroll off the left edge, they "land" into a stack at the bottom
- Full rows in the stack are cleared (Tetris-style) for 50 points each
- Bird dies if it hits obstacles, the growing stack, or the screen bottom
- Obstacle speed increases every 10 obstacles

The `landObstacle` function converts obstacle top/bottom blocks into stack cells. The `clearRows` logic correctly removes full rows and shifts the stack down.

One concern: the bird has no click/touch control -- only keyboard. For a Flappy Bird variant, mouse/touch click to flap is expected but missing. The game only responds to Space/ArrowUp.

## C) Fun?

**NEEDS_FIX**

Creative concept but the execution has issues:

1. **No mouse/click-to-flap**: Flappy Bird is iconic as a one-button game. Most players expect to click/tap. This game only supports keyboard, which is a significant accessibility gap.
2. **Stack mechanic is confusing**: Players won't immediately understand that obstacles become stack blocks. There's no visual transition -- obstacles just disappear off-screen and the stack grows.
3. **Overlay has no background**: The `.overlay` CSS is missing `background: rgba(...)`, so the "FLAPOMINO" title and instructions render with no backdrop, potentially unreadable against the game.
4. **Stack height display is passive**: The "Stack: 0" counter updates but there's no visual urgency as the stack approaches the bird's altitude.
5. **Row clearing is invisible**: When a full row clears in the stack, there's no visual or score feedback beyond the 50-point increment. No flash, no particles.

The core idea of "Flappy Bird where obstacles become Tetris blocks that you need to manage" is genuinely novel, but the lack of visual feedback on the stack mechanics makes it feel disconnected.

## Verdict: NEEDS_FIX → FIXED

The game runs and is technically playable, but two issues warranted attention:
1. **Missing overlay background** in v2.html CSS — **FIXED**: added `background: rgba(0, 0, 0, 0.7)` to `.overlay`
2. **No click-to-flap support** — **FIXED**: added canvas click listener as flap input
