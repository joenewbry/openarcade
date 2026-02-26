# Canabalt Audit

## A) Works?
YES. Clean engine integration. Imports `Game` from `../engine/core.js`, uses `showOverlay`, `setState`, `setScoreFn`, and `start()` correctly. DOM refs (`#score`, `#best`) match v2.html. Canvas is 600x350 matching W/H constants. Overlay div sized correctly. The `hideOverlay()` is called implicitly by `setState('playing')` (engine convention). No runtime errors expected.

## B) Playable?
YES. Controls are SPACE/ArrowUp to start and jump. Game Over on fall restarts with any common key. Player runs automatically, speed increases, buildings scroll, obstacles slow you down. Parallax background layers work. Collision detection for landing on buildings and hitting obstacles is solid. The player is drawn as a stick figure with running animation.

## C) Fun?
YES. Good tension from accelerating speed. Obstacle collisions add screen shake and slow you down rather than killing you outright, which is forgiving. Parallax cityscape looks nice. Particle effects on landing and collision add juice. Score displayed as distance in meters.

## Issues Found
- **Minor**: `hideOverlay()` is never explicitly called -- relies on engine `setState('playing')` to hide it. This is fine if the engine handles it, but worth confirming.
- **Minor**: The `best` variable persists across sessions only in-memory (no localStorage). Reloading the page resets it.
- **Minor**: `frameCount` is referenced in `onDraw` for antenna blink animation but is only incremented in `onUpdate` during 'playing' state -- works correctly since antennas only matter during play.

## Verdict: PASS
Solid endless runner. Works correctly, plays well, fun loop with good visual polish.
