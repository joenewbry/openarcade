# Gladiator Pit - Audit

## Files
- `gladiator-pit/game.js` (~894 lines)
- `gladiator-pit/v2.html` (89 lines)

## Overview
Top-down arena combat game. 500x500 canvas. Player gladiator fights waves of AI enemies in an arena. WASD movement, Space to attack, Shift to dodge, E to pick up weapons. Multiple weapon types (sword, spear, axe, mace, flail), AI state machine for enemies.

## Engine API Usage
- **Game instantiation**: `new Game('game')` -- correct
- **Lifecycle**: `onInit`, `onUpdate(dt)`, `onDraw(renderer, text, alpha)` -- correct
- **State management**: `setState('waiting'|'playing'|'over')`, `showOverlay`/`hideOverlay` -- correct
- **Input**: Uses CUSTOM `keys` object with `keydown`/`keyup` listeners alongside engine input -- **dual input system**
- **Score**: `setScoreFn()` -- correct
- **DOM refs**: `score`, `roundNum`, `aliveCount` -- present in v2.html

## v2.html Structure
- Standard-ish layout with header, score bar (round/alive/score), 500x500 canvas, overlay
- Overlay has h2/p -- correct pattern, `pointer-events: none`
- Controls help text below canvas
- Module script imports `createGame` -- correct

## Notable Patterns
1. **Dual input system**: Game registers its own `keydown`/`keyup` event listeners to populate a `keys` object, rather than exclusively using `game.input`. This works but is redundant -- the engine already tracks key state.
2. **setTimeout for round transitions** (~line 550): Uses `setTimeout` to delay next round start after clearing enemies. This could cause issues if the game is reset during the timeout, but in practice the timeout is short and the game state check prevents stale transitions.
3. **Click-to-start**: Overlay has `pointer-events: none`, but the game attaches a click listener to the canvas to handle starting. This works because the canvas is behind the overlay and receives click events.

## A) Works?
**PASS** - Despite the dual input pattern, both systems work. The setTimeout for round transitions is guarded by state checks. Canvas click-to-start works with pointer-events:none overlay. No missing DOM refs.

## B) Playable?
**PASS** - WASD movement is responsive. Space attack with weapon arc visualization. Dodge roll on Shift with i-frames. Weapon pickup on E. Controls are clearly documented in the HTML. Round progression with increasing enemy counts.

## C) Fun?
**PASS** - Satisfying combat loop with weapon variety and dodge mechanics. AI enemies with different behaviors (aggressive, cautious, flanking). Weapon drops add tactical decisions. Round-based progression with scoring.

## Notes
- The dual input system (custom `keys` object + engine `game.input`) is unnecessary but not harmful. Could be simplified to use engine input exclusively.
- setTimeout usage is minor and well-guarded.

## Verdict: PASS
