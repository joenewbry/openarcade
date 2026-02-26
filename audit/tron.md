# Tron - Audit

## A) Works?
**PASS**

The game initializes correctly using the engine API: `new Game('game')`, `onInit`, `onUpdate()` (note: does not use `dt` parameter, uses frame counting instead), `onDraw(renderer, text)`, `start()`, `setState()`, `showOverlay()`. The v2.html has all required DOM elements (`canvas#game`, `#overlay`, `#overlayTitle`, `#overlayText`). State transitions: `waiting -> playing -> over`.

Canvas is 500x500, which suits the square Tron grid nicely. The grid is 50x50 cells of 10px each.

One concern: `scoreEl` and `bestEl` are accessed without null guards (line 155: `scoreEl.textContent = '0'`). If these elements were missing, this would throw. However, the v2.html defines them, so it works in practice.

## B) Playable?
**PASS**

Arrow key controls for direction. The game uses a tick-based movement system (every 5 frames at 60fps, roughly 80ms per move). Direction input is buffered via `player.nextDir` and applied at the next tick, preventing the common "reverse into yourself" issue. The reverse-direction check (`d.x + player.dir.x !== 0 || d.y + player.dir.y !== 0`) correctly prevents 180-degree turns.

The AI uses a flood-fill based space evaluation (BFS counting open cells up to 80) with an aggressive bonus toward the player. This creates a competent opponent that avoids trapping itself while trying to cut off the player.

Multi-round system: when the AI dies, the game automatically starts a new round after a brief delay. When the player dies, it's game over. Score accumulates across rounds (10 + trail length / 2 per win).

## C) Fun?
**PASS**

Classic Tron gameplay executed well. The AI is challenging but beatable -- it makes smart space decisions and has some aggression. The multi-round system keeps games flowing without interruption. Visual feedback is clean: distinct player/AI colors with glow effects, crash indicators, and a "ROUND WON!" flash. The grid aesthetic fits the Tron theme perfectly.

## Issues Found

1. **`onUpdate` ignores `dt` parameter** (line 163): The update function uses `frameCount` instead of delta time. Movement speed is tied to framerate: at 120fps the game runs at half speed (10 frames between ticks instead of 5), at 30fps it runs at double speed. This is a significant issue for players with non-60fps displays.

2. **`rgba()` color strings** (lines 17-18, 21-22): `PLAYER_TRAIL`, `AI_TRAIL`, and HUD colors use `rgba()` format. Whether the engine's WebGL renderer supports `rgba()` strings depends on the implementation. If the renderer only parses hex colors, trails and HUD text would render incorrectly or not at all. This needs verification against the engine's color parsing.

3. **No `localStorage` for best score** (lines 276-279): The best score is read from and written to the DOM element (`bestEl.textContent`) but never persisted to `localStorage`. When the page is refreshed, the best score resets. Other games in the collection use `localStorage`.

4. **Overlay background missing** (line 53 in v2.html): The `.overlay` CSS does not set a `background` property, unlike other games which use `background: rgba(26, 26, 46, 0.85)`. This means the overlay text appears over the game grid with no backdrop, making it harder to read.

## Verdict: NEEDS_FIX

The game is fun and well-designed, but has two issues worth fixing: (1) the framerate-dependent movement speed (issue #1) and (2) the missing overlay background (issue #4) which affects readability of the start/game-over screens. Issue #2 (rgba color support) needs verification against the engine. Issue #3 (no localStorage) is a minor polish item.
