# Audit: Phoenix

## A) Works?
**PASS**

Correct engine usage: `new Game('game')`, `onInit`, `onUpdate()` (frame-based, tick-counted), `onDraw(renderer, text)`, `game.start()`. Uses `setState('waiting'|'playing'|'over'|'waveIntro')`, `showOverlay()`, `hideOverlay()`, `setScoreFn()`. Canvas 480x600, DOM refs `score`, `lives`, `shields`, `wave` all match HTML. Additional `overlayWave` element in HTML for wave intro descriptions.

The game uses a custom 'waveIntro' state (not one of the standard engine states). This could be problematic if the engine enforces only 'waiting'/'playing'/'over', but if `setState` is a simple property setter, it works fine. The code explicitly calls `hideOverlay()` when transitioning from 'waiting' and 'waveIntro' to 'playing'.

5-wave cycle structure: Bird Scouts, Flock Attacks, Phoenix Rising, Firestorm, Mothership Boss. Each cycle increases HP multiplier. Well-designed enemy variety with regeneration mechanics for phoenix birds.

## B) Playable?
**PASS**

Controls: Arrow Left/Right (or A/D) to move, Space to fire (hold for rapid fire), Shift to activate shield. Uses `input.isDown()` for movement/shooting and `input.wasPressed()` for shield activation. MAX_BULLETS limit of 3 on screen prevents spam.

Enemy behaviors include formation sway, swooping attacks, shooting, and regeneration for phoenix/large birds. Boss has a rotating shield that must be destroyed segment by segment. Shield mechanic (3 uses) provides invulnerability.

## C) Fun?
**PASS**

Excellent vertical shooter with progressive wave structure. Each wave type introduces new enemy mechanics (basic birds -> swooping flocks -> regenerating phoenixes -> fast-regen greater phoenixes -> rotating-shield boss). The boss fight is particularly well-designed with the shield segment destruction mechanic. Star field with twinkling adds atmosphere. Particle effects for explosions and sparks provide satisfying feedback. The shield mechanic adds tactical decision-making. Cycle system provides infinite replayability with scaling difficulty.

## Issues
- The `bestEl` is never updated in the DOM (no `bestEl.textContent = best` call). The `best` variable is tracked but never displayed. Minor issue since the HTML doesn't have a "best" display element anyway.
- Frame-based physics, speed tied to framerate.
- Custom 'waveIntro' state outside the standard engine states -- works but unconventional.

## Verdict: PASS
