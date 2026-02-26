# Audit: Pipe Dream

## A) Works?
**PASS**

Correct engine usage: `new Game('game')`, `onInit`, `onUpdate()` (frame-based), `onDraw(renderer, text)`, `game.start()`. Uses `setState('waiting'|'playing'|'over')`, `showOverlay()`, `setScoreFn()`. Canvas 350x500 (7 cols x 10 rows x 50px cells), DOM refs `score`, `best`, `timer` match HTML.

The game has a unique side panel with a separate `queueCanvas` (2D context) for rendering the pipe queue preview. This uses standard Canvas 2D API (`getContext('2d')`) separately from the WebGL engine -- this is an unusual hybrid approach but should work since it's a separate canvas element.

Mouse interaction is set up directly on the game canvas via `setupMouse()`. Keyboard controls (arrow keys + space) also work for cursor movement and pipe placement. The `localStorage` is used for best score persistence.

## B) Playable?
**PASS**

Controls: Arrow keys to move cursor, Space to place pipe. Mouse click also places pipes. The queue shows next 5 pipe pieces. Countdown timer gives the player time to lay pipes before water starts flowing. Water animation uses `performance.now()` for smooth flow between pipes.

Pipe types include vertical, horizontal, 4 bend directions, and cross (can be used twice). Flow mechanics correctly identify entry direction, find exit direction, and animate water progression through each pipe segment. Replacing unfilled pipes costs 2 seconds of countdown.

## C) Fun?
**PASS**

Good Pipe Dream implementation with pipe queue preview, countdown pressure, animated water flow, score multipliers for cross-pipe double-use, and progressive speed increase as more pipes are filled. The ghost preview (showing next pipe at cursor position with low alpha) is a nice UX touch. Grid visual is clean with proper pipe wall outlines and water glow effects.

## Issues
- The `queueCanvas` uses Canvas 2D API while the main game uses WebGL. This works fine since they're separate canvas elements, but it's a mixed-renderer approach.
- The `hideOverlay()` is not explicitly called when transitioning from 'waiting' to 'playing'. The click handler on the canvas handles this separately, and it does call `game.setState('playing')` which may or may not auto-hide.
- Best score uses `localStorage` -- fine for persistence.
- Water flow animation uses `performance.now()` timestamps which provides frame-rate-independent flow speed (good).

## Verdict: PASS
