# Audit: Paperboy

## A) Works?
**PASS**

Correct engine usage: `new Game('game')`, `onInit`, `onUpdate()` (frame-based, no dt), `onDraw(renderer, text)`, `game.start()`. Uses `setState('waiting'|'playing'|'over')`, `showOverlay()`, `setScoreFn()`. Canvas 500x400, DOM refs `score`, `best`, `lives`, `day` all match the HTML.

The v2.html has standard overlay structure with `#overlay`, `#overlayTitle`, `#overlayText`. The overlay text includes newlines with `white-space: pre-line` CSS.

## B) Playable?
**PASS**

Controls: Arrow Up/Down to move between lanes, Arrow Left/Right to control speed, Space to throw papers. Uses `input.isDown()` for movement and `input.wasPressed(' ')` for throwing. The sideways-scrolling view with houses at the top and road lanes works well.

Subscriber houses are visually distinct (lit windows, glowing border). Papers fly upward and forward. Hitting subscriber mailboxes scores points (50 for accuracy, 25 for near-miss), hitting non-subscriber houses deducts 15 points. Missing subscriber houses deducts 10. Day completion gives bonuses.

Obstacles (cars, dogs, skaters, cones, grates) provide road hazards. Dogs move between lanes. Crash gives a 40-frame stun, then deducts a life. 3 lives, progressive difficulty with faster scrolling and more obstacles per day.

## C) Fun?
**PASS**

Good Paperboy adaptation. The throw mechanic requires timing and lane positioning. Multiple obstacle types with different behaviors. Day progression adds challenge. Visual polish includes glow effects, animated dashed lane markings, particle effects on delivery/crash, and distinct house styles for subscribers vs non-subscribers.

## Issues
- Frame-based physics (no dt scaling). Speed is tied to framerate.
- The `hideOverlay()` is not explicitly called when transitioning from 'waiting' to 'playing'. The engine may need to auto-hide.
- Minor: `expandHex` utility is used for alpha-appending particle colors -- works correctly.

## Verdict: PASS
