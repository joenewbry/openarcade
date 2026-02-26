# Audit: Paintball Skirmish

## A) Works?
**NEEDS_FIX**

Engine usage: `new Game('game')`, `onInit`, `onUpdate()` (no dt parameter used), `onDraw(renderer, text)`, `game.start()`. Uses `setState('waiting'|'playing'|'over')`, `showOverlay()`, `setScoreFn()`.

The HTML overlay structure is non-standard. It uses `<h1>`, `<h2 id="overlayTitle">`, and `<button id="startBtn">` instead of the standard `<h2 id="overlayTitle">` and `<p id="overlayText">` pattern. The game wires up a start button via `document.getElementById('startBtn').onclick`. The overlay div has `id="overlay"` but no `#overlayText` paragraph. The `showOverlay()` call in `endMatch()` will try to set `overlayTitle` and `overlayText` content, but `overlayText` doesn't exist in the HTML -- the overlay paragraph is missing.

The game also uses direct canvas mouse listeners and document keydown/keyup for Shift, bypassing the engine input system for mouse. This works but is unconventional.

## B) Playable?
**PASS** (with caveats)

Controls: WASD/Arrows for movement, mouse aim, click to shoot, R to reload, Shift to crouch. The human player is on the blue team. AI teammates and enemies have sophisticated behavior (advance, cover, flank, retreat, aggressive states). Bullet physics, line-of-sight, cover system all work.

The start mechanism requires clicking the "START MATCH" button in the overlay. The standard overlay has `pointer-events: none`, but this overlay doesn't set that CSS -- it uses the `.hidden` class with opacity transition instead. Looking at the CSS, the overlay doesn't have `pointer-events: none` by default, so the button should be clickable. The overlay gets `.hidden` class added when the game starts (presumably by the engine or game code). Actually, looking more carefully, the game calls `game.setState('playing')` in `startMatch()` but doesn't explicitly hide the overlay. The engine may or may not handle this.

## C) Fun?
**PASS**

Engaging 3v3 team-based tactical shooter. AI has genuine tactical behaviors -- they seek cover, flank, retreat when low on ammo, and vary in accuracy/bravery. Paint splat effects on the ground persist. Ammo pickups, reload mechanic, crouch-behind-cover system add tactical depth. Best-of-5 round structure with score tracking.

## Issues
1. **Missing `#overlayText` element**: The `showOverlay()` call in `endMatch()` will fail to set text since there's no `#overlayText` paragraph in the HTML.
2. **Overlay hide mechanism unclear**: No explicit `hideOverlay()` call when starting match. Depends on engine behavior with `setState('playing')`.
3. **No restart from game-over**: The `endMatch()` sets state to 'over', but there's no handler in `onUpdate` for 'over' state to restart. The game would need to be refreshed.
4. Frame-count-based physics (no dt scaling) -- speed tied to framerate.

## Verdict: NEEDS_FIX
Missing overlay text element and no restart-from-gameover handler are functional issues.
