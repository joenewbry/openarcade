# Audit: Pirate Conquest

## A) Works?
**NEEDS_FIX**

Engine usage: `new Game('game')`, `onInit`, `onUpdate(dt)`, `onDraw(renderer, text)`, `game.start()`. Uses `setState('waiting'|'playing'|'over')`, `showOverlay()`, `setScoreFn()`. Canvas 600x500, extensive DOM refs (`score`, `turnIndicator`, `fleetInfo`, `fleetDetails`, `cargoDetails`, `actionDetails`, `tooltip`).

The HTML overlay has `pointer-events: none` but the "SET SAIL" button has `pointer-events: auto` -- this is correct, allowing the button to be clickable while the overlay passes through events elsewhere.

**Critical issue**: The AI turn uses `setTimeout()` at lines 213 and 428. This is problematic because:
1. `setTimeout` runs outside the game loop and can fire during any state
2. If the game is paused or the tab is backgrounded, timeouts queue up
3. The AI calls `endPlayerTurn()` which chains into `startPlayerTurn()` which calls `setTimeout()` again for the next AI player, creating a chain of timeouts

This works in practice for normal gameplay but is fragile. Also, `setTimeout` is used inside the game update loop context, which means state mutations happen asynchronously outside the engine's frame cycle.

## B) Playable?
**PASS** (with caveats)

This is a turn-based strategy game with mouse-driven interaction. Click ships to select, click water to move, click ports to trade/capture, click enemy ships to attack. The trade panel is fully functional with buy/sell tabs, per-good quantity buttons (+1, +5, All), ship purchase options at owned ports, and port capture.

AI opponents have reasonable behavior: they engage weak enemies, trade goods for profit, seek out profitable trade routes, and capture neutral/weak ports. The 4-player game with 30 turns creates a complete strategic experience.

The tooltip system provides hover information on ports showing market prices and stock levels. The info panel below the canvas shows fleet details, cargo, and available actions.

## C) Fun?
**PASS**

Deep turn-based strategy with trading, combat, port capture, and fleet management. The Caribbean setting with 12 named ports, 4 goods (rum, sugar, spices, gold), 3 ship types (sloop, brigantine, galleon), and 4 competing pirates creates genuine strategic decisions. Market prices fluctuate, AI opponents are competitive, and the 30-turn limit creates urgency. Visual polish includes animated ocean waves, irregular island shapes, ship rotation, cannon fire effects, floating damage numbers, compass rose, combat log, and scoreboard.

## Issues
1. **setTimeout for AI turns**: Async AI execution outside the game loop is fragile. If game state changes during the timeout, it could cause bugs.
2. **innerHTML usage**: `updateUI()` sets `innerHTML` on multiple elements for fleet/cargo/action details. This works but bypasses the engine's rendering.
3. **Overlay structure non-standard**: Uses `<button class="start-btn" id="startBtn">` with `pointer-events: auto` override. The overlay has standard `#overlayTitle` and `#overlayText` elements though, so `showOverlay()` should work for game-over.
4. **`showOverlay()` arguments**: At line 245, the game-over overlay passes a very long multi-line string as the text argument. This should work if the overlay handles `white-space: pre-line`.

## Verdict: NEEDS_FIX
The setTimeout-based AI turns are the primary concern. While the game is functionally complete and quite impressive in scope, the async AI execution pattern could cause issues with state consistency.
