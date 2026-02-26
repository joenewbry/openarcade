# Galaxian - Audit

## Files
- `galaxian/game.js` (~615 lines)
- `galaxian/v2.html` (83 lines)

## Overview
Classic Galaxian-style space shooter. 480x600 canvas. Simpler than Galaga -- single bullet at a time, formation aliens with dive bombing, wave-based progression. Faithful to the original arcade feel.

## Engine API Usage
- **Game instantiation**: `new Game('game')` -- correct
- **Lifecycle**: `onInit`, `onUpdate(dt)`, `onDraw(renderer, text, alpha)` -- correct
- **State management**: `setState('waiting'|'playing'|'over')`, `showOverlay`/`hideOverlay` -- correct
- **Input**: `game.input.wasPressed('Space')`, `game.input.isDown('ArrowLeft'/'ArrowRight')` -- correct
- **Score**: `setScoreFn()` -- correct
- **DOM refs**: `score`, `best`, `lives` -- all present in v2.html

## v2.html Structure
- Standard layout matching other shooters (galaga pattern)
- 480x600 canvas, score/lives/best bar, overlay with h2/p
- Module script imports `createGame` -- correct

## A) Works?
**PASS** - Clean engine usage. Uses `diveQueue` with frame-based delays instead of setTimeout -- good practice. Single-bullet constraint implemented correctly. Formation movement and dive patterns are self-consistent. No missing DOM refs.

## B) Playable?
**PASS** - Arrow keys to move, Space to shoot. One bullet at a time forces tactical play. Wave system with increasing difficulty. Lives system with game over. Clear start/restart flow.

## C) Fun?
**PASS** - Faithful Galaxian recreation. The single-bullet constraint creates tension. Dive bombing aliens with point values encourage risk/reward. Simpler than Galaga but that's genre-accurate. Wave progression keeps it engaging.

## Verdict: PASS
