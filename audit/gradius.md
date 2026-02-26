# Gradius - Audit

## Files
- `gradius/game.js` (~942 lines)
- `gradius/v2.html` (83 lines)

## Overview
Side-scrolling shoot-em-up inspired by Gradius. 512x400 canvas. Features the signature power-up bar system: collect capsules to advance a cursor through Speed, Missile, Double, Laser, Option, Shield. Press Shift to activate the highlighted power-up. Terrain generation with cave sections, wave-based enemy spawning, and boss fights.

## Engine API Usage
- **Game instantiation**: `new Game('game')` -- correct
- **Lifecycle**: `onInit`, `onUpdate(dt)`, `onDraw(renderer, text, alpha)` -- correct
- **State management**: `setState('waiting'|'playing'|'over')`, `showOverlay`/`hideOverlay` -- correct
- **Input**: `game.input.isDown('ArrowUp'/'ArrowDown'/'ArrowLeft'/'ArrowRight')`, `game.input.isDown('Space')` for fire (auto-fire while held), `game.input.wasPressed('ShiftLeft')` or similar for power-up activation -- correct engine usage
- **Score**: `setScoreFn()` -- correct
- **DOM refs**: `score`, `best`, `lives` -- present in v2.html

## v2.html Structure
- Standard layout: header, score bar (score/lives/best), 512x400 canvas, overlay
- Overlay with h2/p -- correct pattern
- Module script imports `createGame` -- correct

## Notable Patterns
1. **Power-up bar**: Faithful Gradius mechanic. Collecting capsules advances cursor. Shift activates current selection. Multiple power-ups stack (speed x3, options x2, etc.). Well-implemented core mechanic.
2. **Terrain generation**: Procedural cave walls that scroll left, creating navigational challenge alongside enemy dodging.
3. **Boss system**: End-of-wave bosses with specific attack patterns and health bars.
4. **Auto-fire**: Holding Space continuously fires, with rate limiting. Standard for the genre.
5. **Options (multiples)**: Trailing orbs that mirror player's weapons. Classic Gradius feature implemented correctly.

## A) Works?
**PASS** - Proper engine lifecycle throughout. Power-up system correctly tracks cursor position and activation. Terrain collision works. Enemy spawning and wave progression function correctly. Boss fights trigger at wave completion. No missing DOM refs.

## B) Playable?
**PASS** - Arrow keys for 8-directional movement, Space to fire (auto-fire), Shift to activate power-ups. Controls are responsive. Power-up bar is visible and clear. Lives system with respawn. Terrain navigation adds challenge dimension beyond shooting.

## C) Fun?
**PASS** - The power-up bar system is the star -- it creates meaningful decisions about when to activate Speed vs. saving for Laser or Option. Terrain sections break up pure shooting. Boss fights provide climactic wave endings. Good escalation across waves.

## Verdict: PASS
