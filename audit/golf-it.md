# Golf It - Audit

## Files
- `golf-it/game.js` (~1223 lines)
- `golf-it/v2.html` (83 lines)

## Overview
Mini golf game with CPU opponent. 500x500 canvas. 9 holes with varied hazards: water, windmills, bumpers, ramps, island greens. Mouse drag to aim and set power. AI opponent uses pathfinding for shot selection. Scorecard system with golf terminology (birdie, par, bogey, etc.).

## Engine API Usage
- **Game instantiation**: `new Game('game')` -- correct
- **Lifecycle**: `onInit`, `onUpdate(dt)`, `onDraw(renderer, text, alpha)` -- correct
- **State management**: `setState('waiting'|'playing'|'over')`, `showOverlay`/`hideOverlay` -- correct
- **Input**: Mouse-based via canvas event listeners (`mousedown`, `mousemove`, `mouseup`). Custom handling for drag-to-aim mechanic. Does not use `game.input` for mouse.
- **Score**: `setScoreFn()` -- correct
- **DOM refs**: `score`, `best` -- present in v2.html

## v2.html Structure
- Standard layout: header, score bar showing "Hole: X/9" and "Best: --"
- 500x500 canvas with `cursor: crosshair`
- Overlay with h2/p -- correct pattern
- Module script imports `createGame` -- correct

## Notable Patterns
1. **Overlay pointer-events**: Game sets `overlay.style.pointerEvents = 'auto'` (~line 1203) to make overlay clickable for starting. This is a deliberate modification from the default `pointer-events: none` in CSS. Works correctly.
2. **Mouse drag aiming**: Custom mousedown/mousemove/mouseup on canvas for drag-to-aim with power indicator. Necessary for the golf mechanic -- engine input doesn't support this.
3. **setTimeout for scorecard** (~line 1155): Brief delay before showing scorecard after hole completion. Cosmetic timing, not gameplay-critical.
4. **localStorage**: Stores best total score. Uses `setScoreFn()` for engine integration.
5. **AI opponent**: CPU uses pathfinding logic to select shot angle and power. Adds competitive element.

## A) Works?
**PASS** - All 9 holes generate correctly with their specific hazards. Ball physics (rolling, bouncing, water reset) work properly. AI opponent takes reasonable shots. Scorecard tallying is correct. Overlay toggle between pointer-events auto/none works.

## B) Playable?
**PASS** - Click and drag to aim, release to shoot. Power scales with drag distance. Visual aiming line shows trajectory. Hole-by-hole progression with scorecard. CPU opponent adds stakes. Cursor crosshair aids precision.

## C) Fun?
**PASS** - Good variety across 9 holes with windmills, water, bumpers. Mouse drag aiming feels intuitive. CPU opponent creates friendly competition. Scorecard with golf terminology (eagle, birdie, par, bogey) adds polish. Progressive difficulty across holes.

## Notes
- Largest game.js in this batch at ~1223 lines, but well-structured.
- The overlay pointer-events toggle is a minor deviation from the standard pattern but works correctly.

## Verdict: PASS
