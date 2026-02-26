# Duck Hunt -- Audit

## Files
- `/Users/joe/dev/openarcade/duck-hunt/game.js` (649 lines)
- `/Users/joe/dev/openarcade/duck-hunt/v2.html` (82 lines)

## A) Works?

**PASS**

The game initializes correctly using `new Game('game')` and follows the engine API properly:
- `onInit` sets state to `'waiting'` and calls `showOverlay`
- `onUpdate` handles `'waiting'`, `'playing'`, and `'over'` states
- `onDraw` uses renderer and text APIs correctly (fillRect, fillCircle, drawLine, fillPoly, strokePoly, setGlow)
- `setScoreFn` is registered
- `game.start()` is called at end of `createGame()`

DOM structure in v2.html matches engine expectations:
- `canvas#game` with 500x500 dimensions
- `#overlay`, `#overlayTitle`, `#overlayText` all present
- Score/best DOM elements referenced by JS exist in HTML

Mouse events are properly attached via canvas listeners. Click queues shots into `pendingShots` array processed in `onUpdate`, which is the correct pattern for the engine (no game logic in event handlers).

One minor concern: DOM refs `scoreEl` and `bestEl` are grabbed at module scope (line 28-29), before `createGame()` runs. This works because the `<script type="module">` is at the bottom of the body, so the DOM is already built.

## B) Playable?

**PASS**

Controls work:
- **Mouse**: Click to shoot, crosshair tracks mousemove. Click starts game from waiting, restarts from over.
- **Keyboard**: Space/ArrowUp start the game and restart. Space restarts from game over.

Game flow is solid:
- Rounds spawn 1-3 ducks with increasing speed/count
- 3 shots per duck per round
- Ducks have 4 movement patterns (diagonal, wavy, swoop, zigzag)
- Miss 3 escaped ducks = game over
- Combo system with score multiplier
- Round transitions with timer

Hit detection uses Euclidean distance with `HIT_RADIUS` (30px) which feels generous enough for a mouse shooter.

Duck size scales inversely with round number (starts at 28, shrinks by 0.8/round with a min of 16), providing good progression.

## C) Fun?

**PASS**

Strong implementation of Duck Hunt:
- Rich duck rendering with wings, rotation on death, X-eyes
- Night sky theme with stars, gradient sky, layered grass/bushes
- "BANG!" text for misses, "+points" for hits with floating animation
- Combo system (2x, 3x multipliers) adds score depth
- Crosshair with glow effect feels satisfying
- Escalating difficulty (more ducks, faster, smaller) keeps tension

The mouse-based shooting is natural. The cursor hides during play and shows a custom crosshair drawn on canvas. Multiple duck movement patterns keep it unpredictable.

## Verdict: PASS

Clean, well-implemented Duck Hunt clone. Mouse and keyboard controls both work. The crosshair, combo system, and escalating rounds make it fun. No bugs or API misuse found.
