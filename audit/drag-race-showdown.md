# Drag Race Showdown - Audit

## A) Works?
**NEEDS_FIX** - Uses engine API: `new Game('game')`, `onInit`, `onUpdate`, `onDraw(renderer, text)`, `start()`, `showOverlay()`, `hideOverlay()`, `setState()`, `setScoreFn`. DOM elements present. Canvas is 600x400. However, there are issues with the overlay/state management:
1. The `endRace()` function on line 386-393 directly manipulates overlay DOM elements with `setTimeout` and `innerHTML` instead of using `game.showOverlay()`. This bypasses the engine's overlay system.
2. The `overlayText` div uses `innerHTML` with `<p>` tags, but the standard overlay expects plain text in a `<p>` element. The v2.html `#overlayText` is a `<div>` with inner `<p>` tags, so the innerHTML write will work, but it is inconsistent with the engine pattern.
3. The `overlay` element has `pointer-events: none` in CSS, but a click listener is attached to it (line 823-825). This click listener will never fire because pointer events are disabled.

## B) Playable?
**PASS** - Click to start countdown. Space to launch at green light. ArrowUp to shift gears. N for nitro boost. Traffic light countdown creates tension. RPM/gear management with optimal shift points creates skill expression. AI opponent with scaling difficulty per round. False start detection. Proper quarter-mile physics with gear ratios, RPM curves, and drag coefficient.

## C) Fun?
**PASS** - Unique racing concept for the arcade. The traffic light timing, gear shifting at optimal RPM, and nitro management create genuine skill depth. AI gets progressively faster (better reaction time and shift accuracy per round). Visual polish includes city skyline silhouette, animated exhaust particles, nitro flame effects, tire smoke on launch, headlight beams, detailed tachometer HUD with optimal/redline zones, progress bar comparison, and screen shake on nitro activation.

## Issues
- **BUG**: `endRace()` uses `setTimeout` (line 372) and directly manipulates overlay DOM (`innerHTML`), bypassing the engine's overlay system. This creates a timing dependency and mixed overlay management. The overlay's `pointer-events: none` CSS means the overlay click listener on line 823-825 will never fire, but the canvas click listener on line 819-821 will handle it anyway.
- **BUG**: The `onUpdate` receives `dt` in milliseconds from the engine, and the `update()` function converts it to seconds with `dtS = dt / 1000`. But `updateTrafficLight(dt)` is called with raw `dt` (ms) and then does `trafficTimer += dt / 1000` internally (line 118). This is correct but inconsistent -- some functions receive ms, some convert internally.
- **Minor**: `score` is set to the finish time (`score = t` on line 367), which is a time value rather than a point score. `setScoreFn` returns this time value, which works but is semantically odd.
- **Minor**: The `pendingClick` flag for starting/restarting works around the engine's normal state handling, creating a parallel input system.
- **Minor**: No `game.setState('over')` is called when a race ends -- the internal `gameState` variable tracks 'results' but the engine state remains 'playing'. This means the engine's overlay show/hide may not align with the internal state.

## Verdict: NEEDS_FIX
The overlay management bypasses the engine system, and `game.setState('over')` is never called when a race ends, leaving the engine in 'playing' state during results. The game is functionally playable but the state management is fragile and the overlay click listener is dead code due to `pointer-events: none`.
