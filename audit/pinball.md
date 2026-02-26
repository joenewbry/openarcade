# Audit: Pinball

## A) Works?
**PASS**

Correct engine usage: `new Game('game')`, `onInit`, `onUpdate()` (frame-based), `onDraw(renderer, text)`, `game.start()`. Uses `setState('waiting'|'playing'|'over')`, `showOverlay()`, `setScoreFn()`. Canvas 350x600, DOM refs `score`, `best`, `balls` all match HTML. The `gameRef` variable stores the game reference for `loseBall()` function.

Comprehensive pinball table with bumpers, drop targets, rollover lanes, spinner, slingshots, flippers, launcher, and multiball. Frame-based timer system (`scheduleTimer`) replaces setTimeout for deterministic behavior.

## B) Playable?
**PASS**

Controls: Arrow Left/Right for flippers, Space (hold) to charge launcher then release to launch, Arrow Up for nudge. Uses `input.isDown()` for flippers and launcher hold, `input.wasReleased(' ')` for launch, `input.wasPressed('ArrowUp')` for nudge.

Physics are thorough: ball-circle collisions with bumpers, ball-segment collisions for slingshots and slanted walls, flipper collision with angular velocity boost calculation, wall bouncing, and gravity. The tilt mechanic (nudge too many times) is a nice authentic touch.

Launch power builds while holding Space, creating a satisfying charge-and-release mechanic. Flippers respond quickly with proper angle animation.

## C) Fun?
**PASS**

Full-featured pinball with all classic elements: 5 bumpers with distinct colors, 2 sets of drop targets (completing a set increases multiplier up to 5x), 3 rollover lanes (completing all triggers multiball), a spinner, 2 slingshots, launcher with power meter, and tilt/nudge system. The scoring system rewards skill with multipliers and bonus text. Multiball adds excitement. Visual polish includes glow effects on bumpers, animated spinner, and floating score text.

## Issues
- Flipper collision is called twice per frame for the main ball (once in `updateBallPhysics` with same angle, once after with proper prev angle). The first call uses `leftFlipperAngle` for both current and previous angle, meaning it won't add angular velocity boost. The second call is the real one. This means the ball gets two collision checks which could cause double-bouncing in edge cases. Minor.
- Frame-based physics, speed tied to framerate.
- `scheduleTimer` uses frame counts, so timers are framerate-dependent.

## Verdict: PASS
