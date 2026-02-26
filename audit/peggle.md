# Audit: Peggle

## A) Works?
**PASS**

Correct engine usage: `new Game('game')`, `onInit`, `onUpdate()` (frame-based, no dt), `onDraw(renderer, text)`, `game.start()`. Uses `setState('waiting'|'playing'|'over')`, `showOverlay()`, `setScoreFn()`. Canvas 480x640, DOM refs `score` and `best` match HTML. The `_game` variable is used for the `finishShot()` function to access the game reference outside `createGame()` scope -- a bit unusual but functional.

Level generation produces 4+ distinct layouts (diamond, grid with gaps, circular rings, V-shape, then procedural random for level 5+). Peg types are properly assigned (orange, green, blue) with appropriate scoring.

## B) Playable?
**PASS**

Controls: Arrow Left/Right to aim launcher, Space to shoot. Uses `input.isDown()` for aiming and `input.wasPressed(' ')` for shooting. The ball physics use substeps (3 per frame) for reliable collision detection against pegs. Bounce damping and wall reflections work correctly.

The bucket moves back and forth at the bottom, catching the ball for a free ball bonus. Green pegs award extra balls. Orange pegs are the targets to clear. The "EXTREME FEVER" celebration on level completion is a nice touch.

The overlay is not explicitly hidden when transitioning from 'waiting' to 'playing' -- same pattern as other games, depends on engine behavior.

## C) Fun?
**PASS**

Faithful Peggle recreation with satisfying ball physics, peg hit scoring with multipliers (2x at 4 hits, 3x at 7, 5x at 10), moving bucket for free balls, level progression with distinct layouts, and the classic "EXTREME FEVER" celebration with confetti particles. Multiple peg types (orange targets, blue fillers, green bonus) add strategic depth. Ball trail and glow effects look good.

## Issues
- `withAlpha()` helper correctly handles both `#rgb` and `#rrggbb` format hex colors.
- Frame-based physics (no dt scaling) -- speed tied to framerate.
- Overlay hide not explicit on state transition.

## Verdict: PASS
