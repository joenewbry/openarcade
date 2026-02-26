# Naval Commander Audit

## A) Works? NEEDS_FIX
- Engine integration: `new Game('game')`, `onUpdate`, `onDraw`, `start()` all present.
- Canvas 600x500 matches v2.html.
- DOM elements: `#hud-turn`, `#hud-gold`, `#hud-ports`, `#hud-ships`, `#hud-score`, `#info-selection`, `#info-actions`, `#info-intel`, `#overlay`, `#start-btn` all present in v2.html.
- Map generation creates 11 ports with sea lane connections, ensuring full connectivity.
- Turn-based: player phase -> resolve movement -> AI phase -> resolve AI -> collect income -> check game end.
- Combat system with multi-round battles, ship HP/attack/defense.
- AI builds ships and evaluates targets with scoring heuristic.

**Problem: Overlay/start flow is non-standard.** The game uses a custom `#start-btn` button in the overlay HTML rather than the engine's standard `showOverlay()`/`hideOverlay()` pattern with keyboard input. The `onInit` calls `showOverlay('NAVAL COMMANDER', 'Control the Seas')` but the overlay HTML has its own button. The standard engine overlay shows `#overlayTitle` and `#overlayText` inside the overlay div, but the v2.html overlay has custom children (h1, h2, info div, button) that would be overwritten by `showOverlay()`. This creates a conflict:
- `game.showOverlay()` sets `#overlayTitle` and `#overlayText` content and shows the overlay.
- But the v2.html overlay has different structure (no `#overlayTitle`/`#overlayText` elements -- it uses h1, h2, and a button).

**Actually, looking again**: The overlay div has `id="overlay"` but does NOT have `#overlayTitle` or `#overlayText` children. The `showOverlay()` engine call would try to set `document.getElementById('overlayTitle')` which doesn't exist in this HTML. This would cause a null reference error or silent failure depending on engine implementation.

**Problem: `setTimeout` usage.** The `endPlayerTurn` function uses nested `setTimeout` calls (300ms each) for sequencing AI turn resolution. This is a pattern the engine discourages -- frame-based timing would be more robust and consistent.

**Problem: `game.hideOverlay()` usage.** Called from the start button click handler and game-over restart, but the overlay structure is custom HTML, not the standard engine overlay. `hideOverlay()` likely just hides the `#overlay` div, which should work.

## B) Playable? NEEDS_FIX
- Click "SET SAIL" button to start (non-standard -- most games use keyboard).
- Click ports to select, click fleets to select, click adjacent ports to move fleets.
- Keyboard: Space/Enter ends turn, 1/2/3 builds ships at selected port.
- Build panel appears at bottom when own port is selected.
- Turn limit of 20 with score-based win condition.
- AI takes turns automatically after player ends turn.

**Problem**: No keyboard start. The `onUpdate` for waiting state is empty (no input checks). Only the DOM button starts the game. If the button event handler has issues with the custom overlay, the game cannot start.

**Problem**: Game over uses custom overlay HTML injection (`overlay.innerHTML = ...`) with a restart button. This bypasses the engine's overlay system entirely. While functional, it creates inconsistency.

## C) Fun? PASS
- Strategic depth: build ships, move fleets, capture ports, manage gold.
- AI provides reasonable opposition with scoring-based target selection.
- Multiple ship types with different stats and costs.
- Sea lane network creates interesting geography.
- Income from ports and controlled lanes adds economic strategy.
- 20-turn limit prevents endless games.
- Combat log and info panel provide feedback.

## Issues
- **Critical**: v2.html overlay structure does not have `#overlayTitle` or `#overlayText` elements. The `showOverlay()` engine call will fail silently or throw. This means the initial overlay text set by `game.showOverlay('NAVAL COMMANDER', 'Control the Seas')` may not display correctly. The custom overlay HTML does show the correct content as static h1/h2 elements, so visually it works, but the engine API mismatch is a code smell.
- **Medium**: `setTimeout` for turn sequencing is fragile and could cause issues if the game state changes during the delays.
- **Medium**: Game over overlay injection replaces overlay content with custom HTML including a "PLAY AGAIN" button with a new click handler. This handler calls `initGame()` then `game.setState('playing')` and `game.hideOverlay()`. If the user presses a key before clicking (which won't work since there's no keyboard handler for 'over' state in onUpdate), they're stuck.
- **Minor**: `game.canvas` is accessed directly for click handler. This works if the engine exposes the canvas element.
- **Minor**: `document.addEventListener('keydown')` bypasses the engine's input system. Could cause issues with key repeat or state tracking.

## Verdict: NEEDS_FIX
The game is functional as a custom DOM-driven game but deviates significantly from the engine's standard patterns. The overlay system mismatch is the main concern -- if `showOverlay()` tries to set missing `#overlayTitle`/`#overlayText` elements, it could error. The `setTimeout` usage is also non-standard.
