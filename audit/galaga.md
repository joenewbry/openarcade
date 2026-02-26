# Galaga - Audit

## Files
- `galaga/game.js` (~735 lines)
- `galaga/v2.html` (83 lines)

## Overview
Classic Galaga-style space shooter. 480x600 canvas. Player ship at bottom, enemy formations at top with bezier-curve dive paths. Includes tractor beam mechanic where boss enemies can capture your ship, and you can rescue it for a dual-fighter powerup.

## Engine API Usage
- **Game instantiation**: `new Game('game')` -- correct
- **Lifecycle**: `onInit`, `onUpdate(dt)`, `onDraw(renderer, text, alpha)` -- correct
- **State management**: `setState('waiting'|'playing'|'over')`, `showOverlay`/`hideOverlay` -- correct
- **Input**: `game.input.wasPressed('Space')`, `game.input.isDown('ArrowLeft')` etc. -- correct
- **Score**: `setScoreFn()` -- correct
- **DOM refs**: `score`, `best`, `lives` -- all present in v2.html

## v2.html Structure
- Standard layout: header with back link, score bar (score/lives/best), canvas in relative container with overlay
- Overlay has `h2#overlayTitle` and `p#overlayText` -- correct pattern
- `pointer-events: none` on overlay -- standard
- Module script imports `createGame` from `./game.js` -- correct

## A) Works?
**PASS** - Proper engine lifecycle, no missing DOM refs, no obvious runtime errors. Enemy formation spawning, dive paths, bullet collision, tractor beam logic all self-consistent. Uses frame-based timing throughout (no raw setTimeout for game logic).

## B) Playable?
**PASS** - Arrow keys to move, Space to shoot. Clear start flow (Space key from waiting state). Lives system with game over. Wave progression provides escalating difficulty. Dual-fighter rescue mechanic adds depth.

## C) Fun?
**PASS** - Faithful Galaga recreation with formation patterns, dive bombing, tractor beam capture/rescue, and score multipliers. Good enemy variety (bee, butterfly, boss). Progressive difficulty across waves.

## Verdict: PASS
