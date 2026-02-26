# Geometry Dash - Audit

## Files
- `geometry-dash/game.js` (~825 lines)
- `geometry-dash/v2.html` (82 lines)

## Overview
Auto-runner platformer inspired by Geometry Dash. 600x400 canvas. Player cube auto-scrolls right, must jump/fly to avoid obstacles. Features gravity flip portals, seeded random level generation, and percentage-based scoring. Death animation with screen shake.

## Engine API Usage
- **Game instantiation**: `new Game('game')` -- correct
- **Lifecycle**: `onInit`, `onUpdate(dt)`, `onDraw(renderer, text, alpha)` -- correct
- **State management**: `setState('waiting'|'playing'|'over')`, `showOverlay`/`hideOverlay` -- correct
- **Input**: `game.input.isDown('Space')` / `isDown('ArrowUp')` / `isDown('KeyW')` -- uses held-key for jump (correct for this genre)
- **Score**: `setScoreFn()` -- correct
- **DOM refs**: `score`, `best` -- present in v2.html

## v2.html Structure
- Standard layout: header, score bar (score/best), 600x400 canvas, overlay
- Overlay with h2/p -- correct pattern
- Module script imports `createGame` -- correct

## A) Works?
**PASS** - Proper engine lifecycle. Seeded random level generation ensures reproducible levels. Collision detection covers spikes, platforms, and gravity portals. Death animation uses frame counter (not setTimeout). Percentage completion scoring works correctly.

## B) Playable?
**PASS** - Space/Up/W to jump (held-key for sustained jumps). Auto-scrolling eliminates need for movement controls. Gravity flip portals add variety. Death is instant and restart is quick. Level progression provides escalating challenge.

## C) Fun?
**PASS** - Captures the Geometry Dash formula well: rhythmic jumping, obstacle memorization, percentage progress. Gravity flip portals add variety. Death animation with screen shake gives good feedback. Multiple levels with increasing difficulty maintain engagement.

## Verdict: PASS
