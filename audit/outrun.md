# Audit: OutRun

## A) Works?
**PASS**

Proper engine usage: `new Game('game')`, `onInit`, `onUpdate` (no dt parameter used -- uses fixed DT = 1/60), `onDraw(renderer, text)`, `game.start()`. Uses `setState('waiting'|'playing'|'over')`, `showOverlay()`. DOM refs `score` and `best` are accessed and match the HTML. Canvas is 500x400.

The game builds a 6000-segment pseudo-3D road with curves, hills, scenery, and traffic at init time. Checkpoint system adds time. The `onUpdate` runs at a fixed timestep (DT = 1/60) regardless of the engine's dt -- this means game speed may vary slightly but should be acceptable since the engine likely calls onUpdate per frame at ~60fps.

The `hideOverlay()` is never explicitly called -- the overlay disappears when `setState('playing')` is called because the engine's state change mechanism handles overlay visibility. Wait -- actually looking at the code, when in 'waiting' state and space is pressed, it only calls `setState('playing')` without `hideOverlay()`. This depends on engine behavior. If the engine auto-hides overlay on setState('playing'), this is fine. If not, the overlay would remain visible during gameplay. This is a potential issue.

## B) Playable?
**NEEDS_FIX** (minor)

Controls work: ArrowUp/w for gas, ArrowDown/s for brake, ArrowLeft/a and ArrowRight/d for steering. Input uses `game.input.isDown()` and `wasPressed()` correctly. The pseudo-3D rendering with perspective projection, road segments, traffic, and scenery all look correct.

The overlay not being explicitly hidden when transitioning from 'waiting' to 'playing' state could leave the overlay visible. The game-over restart calls `game.onInit()` which re-shows the overlay and sets state to 'waiting' again -- that's fine for restart.

## C) Fun?
**PASS**

Excellent OutRun-style pseudo-3D racing with curving roads, hills, traffic, checkpoints, scenery (palms, bushes, signs, rocks), and a synthwave-style sun. The HUD shows speed gauge, timer, checkpoint distance. Traffic provides challenge. Good visual polish with glow effects and a sunset color palette.

## Issues
1. **Overlay not hidden on start**: `setState('playing')` is called without `hideOverlay()`. If the engine doesn't auto-hide on state change, the overlay will block the view during gameplay.
2. Fixed DT ignoring actual frame delta -- minor, game speed tied to framerate.

## Verdict: NEEDS_FIX
The overlay-hide issue could prevent gameplay from being visible. Add `game.hideOverlay()` after `setState('playing')`.
